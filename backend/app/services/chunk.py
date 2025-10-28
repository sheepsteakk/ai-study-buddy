from typing import List

# try to count tokens with tiktoken; fall back to words if not available
try:
    import tiktoken
    _enc = tiktoken.get_encoding("cl100k_base")
    def count_tokens(s: str) -> int:
        return len(_enc.encode(s))
except Exception:
    def count_tokens(s: str) -> int:
        return max(1, len(s.split()))

def chunk_text(text: str, max_tokens: int = 4000, overlap_tokens: int = 200) -> List[str]:
    words = text.split()
    chunks: List[str] = []
    cur: list[str] = []
    cur_tokens = 0
    for w in words:
        t = 1  # rough token cost when tiktoken unavailable
        cur.append(w)
        cur_tokens += t
        if cur_tokens >= max_tokens:
            chunks.append(" ".join(cur))
            # overlap
            cur = cur[-overlap_tokens:] if overlap_tokens < len(cur) else cur
            cur_tokens = len(cur)
    if cur:
        chunks.append(" ".join(cur))
    return chunks
