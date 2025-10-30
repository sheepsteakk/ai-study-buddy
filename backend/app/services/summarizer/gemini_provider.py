# app/services/summarizer/gemini_provider.py
from __future__ import annotations
from typing import List
import asyncio
import google.generativeai as genai
from ...core.config import settings

SYSTEM_SUMMARY_PROMPT = (
    "You are a study assistant. Produce ONLY GitHub-flavored Markdown.\n"
    "Structure:\n"
    "  • Use exactly these elements: H2 (##), H3 (###), paragraphs, and bullet lists (-).\n"
    "  • No H1 (#). No roman-numeral outlines. No footers like 'Total tokens'.\n"
    "  • Avoid italics entirely. Do not wrap words in *...* or _..._.\n"
    "  • Use **bold** sparingly for short term labels inside a sentence, not for whole lines.\n"
    "  • Never bold a single word like 'individual' or 'facility' unless it’s a term label.\n"
    "Length:\n"
    f"  • Keep under ~{settings.TARGET_SUMMARY_TOKENS} tokens.\n"
    "Content policy:\n"
    "  • Prefer clear headings and compact bullets.\n"
    "  • If the source has tables or outlines, rewrite into bullets with clear labels.\n"
    "  • If a section isn’t present in the source, omit it rather than inventing.\n"
    "Format by example:\n"
    "## Core Concepts\n"
    "- Short lead-in sentence.\n"
    "### Key Distinctions\n"
    "- **Term A:** one-line definition.\n"
    "- **Term B:** one-line definition.\n"
    "### Processes\n"
    "- Step 1 → brief description.\n"
    "- Step 2 → brief description.\n"
    "\n"
    "Return only the Markdown. Do not include code fences or extra commentary."
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
            text = resp.text or ""
            return re.sub(r"Total tokens:.*", "", text)

        return await asyncio.to_thread(_call)