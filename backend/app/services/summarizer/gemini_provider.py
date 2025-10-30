# app/services/summarizer/gemini_provider.py
from __future__ import annotations
from typing import List
import asyncio
import google.generativeai as genai
from ...core.config import settings

SYSTEM_SUMMARY_PROMPT = (
    "You are a study assistant. Write the output as GitHub-flavored Markdown.\n"
    "Use `##` for section headings, bullet lists for facts, and **bold** for key terms.\n"
    f"Keep the summary under ~{settings.TARGET_SUMMARY_TOKENS} tokens. "
    "Avoid raw roman numeral outlines; use headings instead."
)

class GeminiSummarizer:
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)

    async def summarize(self, chunks: List[str], target_tokens: int) -> str:
        # Gemini SDK is sync; wrap in a thread to keep FastAPI endpoint async
        text = "\n\n".join(chunks)

        def _call():
            prompt = f"{SYSTEM_SUMMARY_PROMPT}\n\n---\nTEXT:\n{text}"
            resp = self.model.generate_content(prompt)
            return resp.text or ""

        return await asyncio.to_thread(_call)