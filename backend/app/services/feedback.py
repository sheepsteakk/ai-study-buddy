# app/services/feedback.py
from __future__ import annotations

import json, os, re, time
from typing import Dict, List, Optional

import google.generativeai as genai
from ..core.config import settings

# --- Gemini client -----------------------------------------------------------
genai.configure(api_key=settings.GEMINI_API_KEY)
_MODEL = settings.GEMINI_MODEL  # e.g. "models/gemini-1.5-flash"

# Safety: allow benign study content
try:
    from google.generativeai.types import SafetySetting, HarmCategory, HarmBlockThreshold
    _safety = [
        SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold=HarmBlockThreshold.BLOCK_NONE),
        SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold=HarmBlockThreshold.BLOCK_NONE),
        SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=HarmBlockThreshold.BLOCK_NONE),
        SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=HarmBlockThreshold.BLOCK_NONE),
    ]
except Exception:
    _safety = None

# Base configs
_json_cfg = genai.types.GenerationConfig(
    temperature=0.2, top_p=0.9, max_output_tokens=512, response_mime_type="application/json"
)
_text_cfg = genai.types.GenerationConfig(
    temperature=0.2, top_p=0.9, max_output_tokens=512
)

# Optional response schema (SDKs >= 0.7 support this). If unsupported, we’ll ignore.
_RESPONSE_SCHEMA = None
try:
    _RESPONSE_SCHEMA = genai.types.Schema(
        type=genai.types.Type.OBJECT,
        properties={
            "correct":     genai.types.Schema(type=genai.types.Type.BOOLEAN),
            "explanation": genai.types.Schema(type=genai.types.Type.STRING),
            "guidance":    genai.types.Schema(type=genai.types.Type.STRING),
        },
        required=["correct","explanation","guidance"],
    )
except Exception:
    _RESPONSE_SCHEMA = None

_model_json = genai.GenerativeModel(
    model_name=_MODEL,
    generation_config=_json_cfg,
    safety_settings=_safety,
)

_model_text = genai.GenerativeModel(
    model_name=_MODEL,
    generation_config=_text_cfg,
    safety_settings=_safety,
)

_JSON_SPEC = (
    'Return ONLY valid JSON with keys exactly: '
    '{"correct": <boolean>, "explanation": "<string>", "guidance": "Tip: <string>"} '
    'No markdown, no extra keys, no placeholders like "string" or "N/A".'
)

_DEBUG = os.getenv("DEBUG", "").lower() in {"1", "true", "yes"}

# --- Helpers -----------------------------------------------------------------
def _loose_json(s: str) -> Optional[Dict]:
    s = (s or "").strip()
    if not s:
        return None
    try:
        return json.loads(s)
    except Exception:
        m = re.search(r"\{(?:[^{}]|(?R))*\}", s, flags=re.S)  # grab first JSON object
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                return None
        return None

def _extract_text(resp) -> str:
    if not resp:
        return ""
    t = getattr(resp, "text", None)
    if isinstance(t, str) and t.strip():
        return t
    out: List[str] = []
    for cand in getattr(resp, "candidates", []) or []:
        parts = getattr(getattr(cand, "content", None), "parts", []) or []
        for p in parts:
            txt = getattr(p, "text", None)
            if isinstance(txt, str) and txt.strip():
                out.append(txt)
    return "\n".join(out).strip()

def _sanitize(parsed: Dict, *, correct: bool) -> Dict:
    # Coerce “true”/“false” strings, ensure text not empty or placeholdery
    cv = parsed.get("correct", correct)
    if isinstance(cv, str):
        cv = cv.strip().lower() in {"true","1","yes"}
    exp = (parsed.get("explanation") or "").strip()
    gid = (parsed.get("guidance") or "").strip()
    if exp.lower() in {"string","n/a","na",""}:
        exp = "Nice — that’s correct." if cv else "Compare your choice’s definition to the correct one."
    if gid.lower() in {"string","n/a","na",""}:
        gid = "Tip: Re-read the summary line that matches the correct option."
    return {"correct": bool(cv), "explanation": exp, "guidance": gid}

def _debug(tag: str, resp, raw: str):
    if not _DEBUG:
        return
    try:
        fins = [getattr(c, "finish_reason", None) for c in (resp.candidates or [])]
        print(f"[feedback] {tag} finish_reasons={fins}")
        pf = getattr(resp, "prompt_feedback", None)
        if pf:
            print(f"[feedback] {tag} prompt_feedback={pf}")
    except Exception:
        pass
    if raw:
        print(f"[feedback] {tag} raw[:500]: {raw[:500]}")

def _graceful_fallback(correct: bool) -> Dict:
    return {
        "correct": correct,
        "explanation": ("Correct! Good job identifying the key idea."
                        if correct else
                        "Your selection differs from the correct option. Focus on the key term that makes the correct choice right."),
        "guidance": "Tip: Underline the phrase in the summary that directly supports the correct answer.",
    }

# --- Public API --------------------------------------------------------------
def generate_feedback_with_gemini(
    *,
    question: str,
    choices: List[str],
    selected_index: int,
    answer_index: int,
    summary: Optional[str] = None,
    explain_if_correct: bool = False,
    detail: str = "short",
) -> Dict:
    """
    Returns: { correct: bool, explanation: str, guidance: str }
    Retry plan:
      1) JSON mode with schema (if supported) + friendly prompt (up to 2 tries)
      2) JSON mode strict prompt
      3) Plain text mode + loose JSON parse
      4) Graceful fixed explanation
    """
    # Guard rails
    correct = selected_index == answer_index
    if correct and not explain_if_correct:
        return {"correct": True, "explanation": "Correct! Nice job — that’s the right choice.", "guidance": None}

    context = summary or "No extra context."
    letters = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    label = lambda i: (letters[i] if 0 <= i < len(letters) else f"Option {i+1}")

    formatted_choices = "\n".join([f"{label(i)}: {c}" for i, c in enumerate(choices)]) if choices else "No choices provided."
    length_rule = "Keep it to 1–2 sentences." if detail == "short" else "Use 2–4 concise sentences."

    prompt_friendly = f"""
You are a concise, friendly tutor.

Context (may help):
{context}

Question:
{question}

Choices:
{formatted_choices}

The student selected: index {selected_index}
The correct answer is: index {answer_index}

Write an explanation. If the student is correct, confirm and briefly explain why.
If the student is wrong, contrast their choice with the correct choice and clarify the misconception.
{length_rule}
End with one study tip that begins with "Tip:".

{_JSON_SPEC}
""".strip()

    prompt_strict = (
        "Return ONLY JSON with keys {correct:boolean, explanation:string, guidance:string}. "
        "Do not include markdown or extra keys.\n"
        f"Context: {context}\nQ: {question}\nChoices: {choices}\n"
        f"Selected index: {selected_index}\nCorrect index: {answer_index}\n"
        f"{_JSON_SPEC}"
    )

    # Try 1–2: JSON mode, friendly prompt, optionally enforcing schema at call time
    for i in range(2):
        try:
            if _RESPONSE_SCHEMA is not None:
                resp = _model_json.generate_content(
                    prompt_friendly,
                    generation_config=genai.types.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=_RESPONSE_SCHEMA,
                        temperature=0.2, top_p=0.9, max_output_tokens=512,
                    ),
                )
            else:
                resp = _model_json.generate_content(prompt_friendly)

            raw = _extract_text(resp)
            _debug(f"try1.{i+1}", resp, raw)
            parsed = _loose_json(raw)
            if parsed:
                return _sanitize(parsed, correct=correct)
        except Exception:
            pass
        time.sleep(0.25)

    # Try 3: JSON mode strict prompt
    try:
        resp = _model_json.generate_content(prompt_strict)
        raw = _extract_text(resp)
        _debug("try2.strict", resp, raw)
        parsed = _loose_json(raw)
        if parsed:
            return _sanitize(parsed, correct=correct)
    except Exception:
        pass
    time.sleep(0.25)

    # Try 4: Plain-text mode, then fish out JSON
    try:
        resp = _model_text.generate_content(prompt_strict)
        raw = _extract_text(resp)
        _debug("try3.text", resp, raw)
        parsed = _loose_json(raw)
        if parsed:
            return _sanitize(parsed, correct=correct)
    except Exception:
        pass

    # Final fallback: never send the “couldn’t parse tutor reply” anymore
    return _graceful_fallback(correct)