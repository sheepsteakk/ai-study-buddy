from typing import List
import fitz  # PyMuPDF
from . import chunk as chunk_utils
from ..utils.text_clean import clean_text

def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    pieces: List[str] = []
    for page in doc:
        txt = page.get_text("text")
        if txt:
            pieces.append(txt)
    doc.close()
    return clean_text("\n\n".join(pieces))

def split_for_llm(text: str, max_tokens: int = 4000) -> list[str]:
    # safe chunking for long PDFs
    return chunk_utils.chunk_text(text, max_tokens=max_tokens)
