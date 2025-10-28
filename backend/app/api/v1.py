# app/api/v1.py
import os
import tempfile
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException

from ..core.config import settings
from ..services import pdf as pdfsvc
from ..models.schemas import (
    StudyResponse,
    SummaryResponse,
    FeedbackRequest,
    FeedbackResponse,
)
from ..services.quiz import generate_quiz_with_gemini
from ..services.feedback import generate_feedback_with_gemini

router = APIRouter(prefix="/api/v1")
summarizer = None  # injected by main.py


# ------------------------------ Helpers ---------------------------------------
def _http_map_provider_error(prefix: str, exc: Exception) -> None:
    msg = str(exc)
    low = msg.lower()
    if "quota" in low or "rate" in low:
        raise HTTPException(status_code=429, detail=f"{prefix}: {msg}")
    if "api key" in low or "not set" in low or "unauthorized" in low:
        raise HTTPException(status_code=401, detail=f"{prefix}: {msg}")
    if "not found" in low or "model" in low:
        raise HTTPException(status_code=400, detail=f"{prefix}: {msg}")
    raise HTTPException(status_code=502, detail=f"{prefix}: {msg}")


# ------------------------------ Routes ---------------------------------------
@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/summarize", response_model=SummaryResponse)
async def summarize_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        text = pdfsvc.extract_text_from_pdf(tmp_path)
        if not text:
            raise HTTPException(status_code=400, detail="No text found in PDF")

        chunks = pdfsvc.split_for_llm(
            text, max_tokens=min(4000, settings.MAX_INPUT_TOKENS)
        )

        try:
            # summarizer is injected in main.py
            summary = await router.summarizer.summarize(  # type: ignore[attr-defined]
                chunks, settings.TARGET_SUMMARY_TOKENS
            )
        except Exception as e:
            _http_map_provider_error("Summarizer error", e)

        return {"summary": summary}

    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass


@router.post("/study", response_model=StudyResponse)
async def study_from_pdf(file: UploadFile = File(...)):
    """
    Study mode returns the full summary (to match your UI) + quiz.
    """
    # Reuse summarization flow
    s = await summarize_pdf(file)
    # FastAPI returns a dict for response_model in sub-calls
    summary = s.summary if isinstance(s, SummaryResponse) else s["summary"]

    # Generate quiz
    try:
        raw_items = await generate_quiz_with_gemini(
            summary, settings.QUIZ_NUM_QUESTIONS, settings.QUIZ_STYLE
        )
    except Exception as e:
        _http_map_provider_error("Quiz generation error", e)

    # Normalize quiz items
    quiz: List[dict] = []
    for i, item in enumerate(raw_items, start=1):
        ai = int(item.get("answer_index", 0))
        choices = item.get("choices", []) or []
        ans = choices[ai] if 0 <= ai < len(choices) else None
        quiz.append(
            {
                "id": i,
                "question": item.get("question", ""),
                "type": "mcq",
                "choices": choices,
                "answer_index": ai,
                "answer": ans,
            }
        )

    # Return full summary for Study page; overview removed
    return {"summary": summary, "quiz": quiz}


@router.post("/feedback", response_model=FeedbackResponse)
def feedback(req: FeedbackRequest):
    """
    Explain why the student's answer is correct/incorrect and give a short tip.
    This is stateless: the frontend sends the single item data + optional summary.
    """
    try:
        result = generate_feedback_with_gemini(
            question=req.question,
            choices=req.choices,
            selected_index=req.selected_index,
            answer_index=req.answer_index,
            summary=req.summary,
            explain_if_correct=req.explain_if_correct,
            detail=req.detail,
        )
    except Exception as e:
        _http_map_provider_error("Feedback error", e)

    return {
        "correct": bool(result.get("correct", False)),
        "explanation": str(result.get("explanation", "") or "Explanation unavailable."),
        "guidance": result.get("guidance"),
    }
