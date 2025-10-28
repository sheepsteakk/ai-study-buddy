# app/services/feedback.py
from __future__ import annotations

import json, re, time, os
from typing import Dict, List, Optional
import google.generativeai as genai
from ..core.config import settings

# --- Gemini client -----------------------------------------------------------
genai.configure(api_key=settings.GEMINI_API_KEY)
_MODEL = settings.GEMINI_MODEL  # e.g., "models/gemini-2.5-flash"

# JSON-constrained config
_json_cfg = genai.types.GenerationConfig(
    temperature=0.2,
    top_p=0.9,
    max_output_tokens=512,
    response_mime_type="application/json",
)

# Relax safety to avoid benign anatomy content being blocked
try:
    from google.generativeai.types import SafetySetting, HarmCategory, HarmBlockThreshold
    _safety = [
        SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT,          threshold=HarmBlockThreshold.BLOCK_NONE),
        SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH,         threshold=HarmBlockThreshold.BLOCK_NONE),
        SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,   threshold=HarmBlockThreshold.BLOCK_NONE),
        SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,   threshold=HarmBlockThreshold.BLOCK_NONE),
    ]
except Exception:
    _safety = None

# Primary (JSON mode)
_model_json = genai.GenerativeModel(
    model_name=_MODEL,
    generation_config=_json_cfg,
    safety_settings=_safety,
)

# Fallback (plain text mode; no JSON constraint)
_text_cfg = genai.types.GenerationConfig(
    temperature=0.2,
    top_p=0.9,
    max_output_tokens=512,
)
_model_text = genai.GenerativeModel(
    model_name=_MODEL,
    generation_config=_text_cfg,
    safety_settings=_safety,
)

_JSON_SPEC = (
    'Return ONLY valid JSON exactly like: '
    '{"correct": true, "explanation": "…", "guidance": "Tip: …"}. '
    'Do not include extra keys. Do not output placeholders such as "string", "N/A", or empty text.'
)

_DEBUG = os.getenv("DEBUG", "").lower() in {"1", "true", "yes"}

# --- Helpers -----------------------------------------------------------------
def _parse_json_loose(s: str) -> Optional[Dict]:
    s = (s or "").strip()
    if not s:
        return None
    try:
        return json.loads(s)
    except Exception:
        m = re.search(r"\{(?:[^{}]|(?R))*\}", s, flags=re.S)  # recursive-ish obj grab
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

def _letters(n: int) -> List[str]:
    return list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")[: max(0, min(n, 26))]

def _sanitize(parsed: Dict, *, correct: bool) -> Dict:
    exp = (parsed.get("explanation") or "").strip()
    gid = (parsed.get("guidance") or "").strip()
    if exp.lower() in {"string", "n/a", "na"}:
        exp = "Your choice is correct." if correct else "Compare your choice’s definition to the correct one."
    if gid.lower() in {"string", "n/a", "na"}:
        gid = "Tip: Link each plane to its specific direction of division."
    if not exp:
        exp = "Your answer is correct." if correct else "Review the key distinction between the two options."
    if not gid:
        gid = "Tip: Re-read the summary phrase that matches the correct option."
    return {
        "correct": bool(parsed.get("correct", correct)),
        "explanation": exp,
        "guidance": gid,
    }

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
        print(f"[feedback] {tag} raw:\n{raw[:800]}")

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
    Returns dict: { correct: bool, explanation: str, guidance: Optional[str] }.
    Retry strategy:
      1) Friendly JSON prompt (JSON mode)
      2) Stricter JSON prompt (JSON mode)
      3) Plain-text mode, then parse any JSON object in the text
    """
    correct = selected_index == answer_index

    if correct and not explain_if_correct:
        return {
            "correct": True,
            "explanation": "Correct! Nice job identifying the key feature.",
            "guidance": None,
        }

    context = summary or "No extra context."
    letters = _letters(len(choices))
    length_rule = "Keep it to 1–2 sentences." if detail == "short" else "Use 2–4 concise sentences."
    formatted_choices = "\n".join([f"{letters[i]}. {c}" for i, c in enumerate(choices)]) if choices else "No choices provided."

    prompt1 = f"""
You are a concise, friendly tutor.

Context (may help): {context}

Multiple-choice item:
Question: {question}
Choices:
{formatted_choices}
Correct index: {answer_index}
Student selected index: {selected_index}

Write an explanation. If the student is correct, confirm and explain WHY their choice is right.
If the student is wrong, explain the specific misconception and contrast it with the correct choice.
{length_rule}
End with a single study tip starting with "Tip:" on a new sentence.

{_JSON_SPEC}
""".strip()

    prompt2 = (
        "Return ONLY JSON. Keys: correct(boolean), explanation(string), guidance(string).\n"
        f"Q: {question}\nChoices: {choices}\nCorrect index: {answer_index}; Selected index: {selected_index}\n"
        f"Context: {context}\n{_JSON_SPEC}"
    )

    # Attempt 1: JSON mode, friendly prompt (retry up to 2x with micro backoff)
    for i in range(2):
        try:
            resp = _model_json.generate_content(prompt1)
            raw = _extract_text(resp)
            _debug(f"try1.{i+1}", resp, raw)
            parsed = _parse_json_loose(raw)
            if parsed:
                return _sanitize(parsed, correct=correct)
        except Exception:
            pass
        time.sleep(0.35)

    # Attempt 2: JSON mode, strict prompt
    try:
        resp = _model_json.generate_content(prompt2)
        raw = _extract_text(resp)
        _debug("try2", resp, raw)
        parsed = _parse_json_loose(raw)
        if parsed:
            return _sanitize(parsed, correct=correct)
    except Exception:
        pass
    time.sleep(0.35)

    # Attempt 3: plain text mode (no JSON constraint), then parse any JSON object
    try:
        resp = _model_text.generate_content(prompt2)
        raw = _extract_text(resp)
        _debug("try3", resp, raw)
        parsed = _parse_json_loose(raw)
        if parsed:
            return _sanitize(parsed, correct=correct)
    except Exception:
        pass

    # Final fallback
    return {
        "correct": correct,
        "explanation": (
            "We couldn’t parse the tutor reply. "
            + ("Your answer is correct." if correct else "Your selection differs from the correct option.")
            + " Compare the key terms in the correct choice to your selection."
        ),
        "guidance": "Tip: Re-read the summary and underline the phrase that directly supports the correct option.",
    }