# app/models/schemas.py
from typing import List, Optional, Literal
from pydantic import BaseModel

# ---- Health ----
class HealthResponse(BaseModel):
    status: str


# ---- Summarization ----
class SummaryResponse(BaseModel):
    summary: str


# ---- Study / Quiz ----
class QuizItem(BaseModel):
    id: int
    question: str
    type: str                    # e.g. "mcq"
    choices: List[str]
    answer_index: int            # 0-based index of the correct choice
    answer: Optional[str] = None # convenience field for UI (resolved correct choice string)


class StudyResponse(BaseModel):
    # Study page returns the full summary and the quiz — no overview.
    summary: str
    quiz: List[QuizItem]


# ---- Feedback (per-question explanations) ----
class FeedbackRequest(BaseModel):
    question: str
    choices: List[str]
    selected_index: int
    answer_index: int
    summary: Optional[str] = None
    explain_if_correct: bool = False
    detail: Literal["short", "full"] = "short"


class FeedbackResponse(BaseModel):
    correct: bool
    explanation: str
    guidance: Optional[str] = None
