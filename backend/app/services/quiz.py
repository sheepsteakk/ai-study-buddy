from __future__ import annotations
from typing import List, Dict, Any
import os, json, re, asyncio

import google.generativeai as genai

from ..core.config import settings  # for GEMINI_API_KEY / GEMINI_MODEL


# Configure Gemini once
_genai_configured = False
_model = None

def _model_lazy():
    global _genai_configured, _model
    if not _genai_configured:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _genai_configured = True
    if _model is None:
        _model = genai.GenerativeModel(settings.GEMINI_MODEL or "gemini-1.5-flash")
    return _model


# What we expect back
_PROMPT_JSON_SPEC = (
    "Return ONLY valid JSON (no code fences, no prose), exactly like:\n"
    "[\n"
    '  {"question":"...","choices":["A","B","C","D"],"answer_index":0},\n'
    '  {"question":"...","choices":["A","B","C","D"],"answer_index":2}\n'
    "]\n"
    "Ensure: 4 choices per question; answer_index is 0..3.\n"
    "Do not prefix choices with letters or numbers. No 'A)'/'(B)'/'C.' etc."
)

_QUIZ_INSTRUCTIONS = (
    "You are a helpful tutor. Create clear, self-contained multiple-choice questions (MCQs) "
    "based on the summary. Avoid trick questions or ambiguity. Cover different key ideas. "
    "Keep questions short and focused. Exactly 4 choices per question, only one correct. "
    "Choices must be plain text without leading labels like A) or 1)."
)


def _clean_json_text(text: str) -> str:
    """Strip code fences / stray text and try to isolate a JSON array."""
    t = (text or "").strip()
    # remove common ```json ... ``` wrappers
    t = t.strip("`").strip()
    # if it's already a JSON array, return
    if t.startswith("[") and t.endswith("]"):
        return t
    # try to find the first [...] block
    m = re.search(r"\[\s*{.*}\s*]\s*$", t, flags=re.S)
    return m.group(0) if m else t


# --- NEW: choice label stripper ---------------------------------------------
_LABEL_RE = re.compile(
    r'^\s*(?:'              # leading space
    r'\(?[A-Da-d]\)?'       # A or (A)
    r'[\.\):\-]?'           # optional ., ), :, -
    r'|\d+'                 # or a number
    r'[\.\):\-]'            # followed by punctuation
    r')\s+'                 # trailing space
)

def _strip_choice_label(s: str) -> str:
    return _LABEL_RE.sub('', s or '').strip()
# -----------------------------------------------------------------------------


def _validate_items(items: List[Dict[str, Any]], num_q: int) -> List[Dict[str, Any]]:
    """Ensure each item has the right schema; trim/pad to num_q."""
    valid: List[Dict[str, Any]] = []
    for it in items:
        q = str(it.get("question", "")).strip()
        choices = it.get("choices", [])
        ai = it.get("answer_index", 0)
        if not q:
            continue
        if not isinstance(choices, list) or len(choices) != 4:
            continue
        # coerce to strings and strip any leading labels like A), (B), 1., etc.
        choices = [_strip_choice_label(str(c)) for c in choices]
        # answer_index sanity
        try:
            ai = int(ai)
        except Exception:
            ai = 0
        if ai < 0 or ai > 3:
            ai = 0
        valid.append({"question": q, "choices": choices, "answer_index": ai})
        if len(valid) >= num_q:
            break

    # fallback if model returned nothing usable
    if not valid:
        valid = [{
            "question": "Placeholder: quiz generator returned no valid questions.",
            "choices": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "answer_index": 0
        }]

    # trim to num_q
    return valid[:num_q]


async def generate_quiz_with_gemini(summary: str, num_q: int = 5, style: str = "mcq") -> List[Dict]:
    """
    Generate MCQs with Gemini. Always returns:
      [{"question": str, "choices": [str,str,str,str], "answer_index": int}, ...]
    """
    model = _model_lazy()

    prompt = (
        f"{_QUIZ_INSTRUCTIONS}\n\n"
        f"Create {num_q} MCQs based on this summary:\n"
        f"---\n{summary}\n---\n\n"
        f"{_PROMPT_JSON_SPEC}"
    )

    def _call():
        resp = model.generate_content(prompt)
        raw = resp.text or ""
        raw = _clean_json_text(raw)
        try:
            data = json.loads(raw)
        except Exception:
            # last-ditch: try to find JSON array inside
            m = re.search(r"\[\s*{.*}\s*]\s*$", raw, flags=re.S)
            if not m:
                return []
            try:
                data = json.loads(m.group(0))
            except Exception:
                return []
        if isinstance(data, dict) and "items" in data:
            data = data["items"]
        if not isinstance(data, list):
            return []
        return data

    items = await asyncio.to_thread(_call)
    return _validate_items(items, num_q)
