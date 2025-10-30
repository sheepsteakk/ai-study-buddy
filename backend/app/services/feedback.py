# app/services/feedback.py
from __future__ import annotations

import json, re, time, os
from typing import Dict, List, Optional, Tuple, Any
import google.generativeai as genai
from ..core.config import settings

# ---------- Gemini client ----------------------------------------------------
genai.configure(api_key=settings.GEMINI_API_KEY)
_MODEL = settings.GEMINI_MODEL  # e.g., "models/gemini-2.5-flash"

# JSON-constrained config (prefer JSON out of the gate)
_json_cfg = genai.types.GenerationConfig(
    temperature=0.2,
    top_p=0.9,
    max_output_tokens=512,
    response_mime_type="application/json",
)

# Plain-text fallback config
_text_cfg = genai.types.GenerationConfig(
    temperature=0.2,
    top_p=0.9,
    max_output_tokens=512,
)

# Relax safety a bit so benign anatomy / biology doesn’t get blocked
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

# ---------- Constants --------------------------------------------------------
_JSON_SPEC = (
    "Return ONLY JSON with keys exactly: "
    '{"correct": <boolean>, "explanation": <string>, "guidance": <string>}. '
    "No markdown, no code fences, no extra keys, no placeholders."
)

_DEBUG = os.getenv("DEBUG", "").lower() in {"1", "true", "yes"}

# ---------- Helpers ----------------------------------------------------------
def _debug(tag: str, resp, raw: str):
    if not _DEBUG:
        return
    try:
        fins = [getattr(c, "finish_reason", None) for c in (resp.candidates or [])]
        print(f"[feedback] {tag}: finish_reasons={fins}")
        pf = getattr(resp, "prompt_feedback", None)
        if pf:
            print(f"[feedback] {tag}: prompt_feedback={pf}")
    except Exception:
        pass
    if raw:
        print(f"[feedback] {tag} raw:\n{raw[:800]}")

def _extract_text(resp) -> str:
    """
    Robustly extract text from the Gemini response object.
    """
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

_CODE_FENCE_RE = re.compile(r"^```(?:json)?\s*([\s\S]*?)\s*```$", re.I)
_FIRST_JSON_OBJ_RE = re.compile(r"\{(?:[^{}]|(?R))*\}", re.S)

def _strip_code_fences(s: str) -> str:
    m = _CODE_FENCE_RE.match(s.strip())
    return m.group(1) if m else s

def _parse_json_loose(s: str) -> Optional[Dict[str, Any]]:
    """
    Accepts raw model output. Handles:
      - ```json ... ```
      - extra prose around a JSON object
      - minor whitespace / newline issues
    """
    if not s:
        return None
    s = _strip_code_fences(s).strip()
    # Try direct loads first
    try:
        return json.loads(s)
    except Exception:
        pass
    # Try to find first JSON object anywhere in the string
    m = _FIRST_JSON_OBJ_RE.search(s)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None
    return None

def _letters(n: int) -> List[str]:
    return list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")[: max(0, min(n, 26))]

def _coerce_bool(x: Any) -> bool:
    if isinstance(x, bool):
        return x
    if isinstance(x, (int, float)):
        return bool(x)
    if isinstance(x, str):
        v = x.strip().lower()
        if v in {"true", "t", "yes", "y", "1"}:
            return True
        if v in {"false", "f", "no", "n", "0"}:
            return False
    return False

def _validate_and_sanitize(parsed: Dict[str, Any], *, correct: bool) -> Dict[str, Any]:
    """
    Ensure required keys exist with correct types and no empty placeholders.
    """
    out_correct = _coerce_bool(parsed.get("correct", correct))
    exp = str(parsed.get("explanation", "") or "").strip()
    gid = str(parsed.get("guidance", "") or "").strip()

    # Replace junk placeholders
    if exp.lower() in {"string", "n/a", "na", "none"} or not exp:
        exp = "Your answer is correct." if out_correct else "Compare the key terms in the correct choice to your selection."
    if gid.lower() in {"string", "n/a", "na", "none"} or not gid:
        gid = "Tip: Re-read the summary phrase that directly supports the correct option."

    return {"correct": out_correct, "explanation": exp, "guidance": gid}

def _call_model(model, prompt: str, *, tag: str) -> Tuple[Optional[Dict[str, Any]], str]:
    """
    Call Gemini, extract text, try to parse JSON.
    Returns (parsed_dict_or_none, raw_text)
    """
    try:
        resp = model.generate_content(prompt)
        raw = _extract_text(resp)
        _debug(tag, resp, raw)
        parsed = _parse_json_loose(raw)
        return parsed, raw
    except Exception as e:
        if _DEBUG:
            print(f"[feedback] {tag} exception: {e}")
        return None, ""

# ---------- Public API -------------------------------------------------------
def generate_feedback_with_gemini(
    *,
    question: str,
    choices: List[str],
    selected_index: int,
    answer_index: int,
    summary: Optional[str] = None,
    explain_if_correct: bool = False,
    detail: str = "short",
) -> Dict[str, Any]:
    """
    Returns dict: { correct: bool, explanation: str, guidance: Optional[str] }.

    Retry strategy:
      1) JSON mode, friendly prompt (2 tries)
      2) JSON mode, strict minimal format (1 try)
      3) Plain-text mode, strict minimal format (1 try), then parse any JSON
    """
    correct = (selected_index == answer_index)

    # If correct and no explanation requested, return a fast path
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

    prompt_friendly = f"""
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

    prompt_strict = (
        "Return ONLY JSON, no markdown. Keys exactly: "
        'correct (boolean), explanation (string), guidance (string).\n'
        f"Q: {question}\nChoices: {choices}\n"
        f"Correct index: {answer_index}; Selected index: {selected_index}\n"
        f"Context: {context}\n{_JSON_SPEC}"
    )

    # Attempt 1: JSON mode, friendly prompt (2 micro-retries)
    for i in range(2):
        parsed, raw = _call_model(_model_json, prompt_friendly, tag=f"json_friendly.{i+1}")
        if parsed:
            return _validate_and_sanitize(parsed, correct=correct)
        time.sleep(0.35 + i * 0.15)

    # Attempt 2: JSON mode, strict prompt
    parsed, raw = _call_model(_model_json, prompt_strict, tag="json_strict")
    if parsed:
        return _validate_and_sanitize(parsed, correct=correct)
    time.sleep(0.35)

    # Attempt 3: plain text mode, strict prompt (parse any JSON found)
    # Lower temperature for last attempt for extra determinism.
    try:
        # Temporarily lower temperature without mutating shared model
        model_lowtemp = genai.GenerativeModel(
            model_name=_MODEL,
            generation_config=genai.types.GenerationConfig(
                **{**_text_cfg.to_dict(), "temperature": 0.1, "top_p": 0.8}
            ),
            safety_settings=_safety,
        )
    except Exception:
        model_lowtemp = _model_text

    parsed, raw = _call_model(model_lowtemp, prompt_strict, tag="text_strict")
    if parsed:
        return _validate_and_sanitize(parsed, correct=correct)

    # Final fallback — graceful, student-friendly message
    return {
        "correct": correct,
        "explanation": (
            "We couldn’t parse the tutor reply. "
            + ("Your answer is correct." if correct else "Your selection differs from the correct option.")
            + " Compare the key terms in the correct choice to your selection."
        ),
        "guidance": "Tip: Re-read the summary and underline the phrase that directly supports the correct option.",
    }