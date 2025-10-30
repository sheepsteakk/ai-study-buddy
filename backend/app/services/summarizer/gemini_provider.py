# app/services/summarizer/gemini_provider.py
from __future__ import annotations

import asyncio
import re
from typing import List

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


def _post_clean(md: str) -> str:
    """Remove any noisy footers / fences and compress whitespace."""
    if not md:
        return ""
    # Kill fences if the model ever returns them
    md = re.sub(r"^```(?:markdown)?\s*|\s*```$", "", md, flags=re.MULTILINE)
    # Remove any accidental 'Total tokens: ...' lines
    md = re.sub(r"^\s*Total tokens:.*?$", "", md, flags=re.MULTILINE)
    # Trim extra blank lines (max 2 in a row)
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    return md


class GeminiSummarizer:
    """Summarize a list of text chunks concurrently and merge the result."""

    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        genai.configure(api_key=api_key)
        # NB: google-generativeai expects 'model_name='
        self._model = genai.GenerativeModel(model_name=model)

    async def _gen_async(self, prompt: str):
        """Run the sync SDK in a worker thread so our FastAPI route can stay async."""
        def _call():
            return self._model.generate_content(prompt)
        return await asyncio.to_thread(_call)

    async def summarize(self, chunks: List[str], target_tokens: int) -> str:
        """
        Summarize many chunks:
          1) fan-out: summarize each chunk concurrently,
          2) merge: single pass to deduplicate and stay within token budget.
        """
        text_chunks = [c for c in (chunks or []) if c and c.strip()]
        if not text_chunks:
            return ""

        # 1) per-chunk summaries in parallel
        per_chunk_prompts = []
        n = len(text_chunks)
        for i, chunk in enumerate(text_chunks, start=1):
            per_chunk_prompts.append(
                f"{SYSTEM_SUMMARY_PROMPT}\n\n---\n"
                f"CHUNK {i}/{n}:\n{chunk}"
            )

        tasks = [self._gen_async(p) for p in per_chunk_prompts]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        partials: List[str] = []
        for r in results:
            if isinstance(r, Exception):
                continue
            partials.append(_post_clean(getattr(r, "text", "") or ""))

        # Fallback if every chunk failed
        if not partials:
            return ""

        # 2) merge pass — keep sections consistent, drop duplicates, obey budget
        merge_prompt = (
            f"{SYSTEM_SUMMARY_PROMPT}\n\n"
            f"Task: Merge the following {len(partials)} partial summaries into ONE clean, "
            f"deduplicated Markdown output under ~{target_tokens} tokens. "
            "Keep headings consistent, do not invent new sections, and keep lines short.\n\n"
            "=== PARTIAL SUMMARIES BEGIN ===\n"
            + "\n\n---\n\n".join(partials)
            + "\n=== PARTIAL SUMMARIES END ==="
        )
        merged = await self._gen_async(merge_prompt)
        return _post_clean(getattr(merged, "text", "") or "")
