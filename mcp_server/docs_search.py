import os
import re
from dataclasses import dataclass
from pathlib import Path


STOP_WORDS = {
    "a",
    "an",
    "are",
    "did",
    "docs",
    "for",
    "from",
    "how",
    "is",
    "me",
    "of",
    "the",
    "this",
    "to",
    "we",
    "what",
    "when",
    "where",
    "which",
    "who",
}


@dataclass(frozen=True)
class DocSearchHit:
    source: str
    chunk: str
    score: int


def query_keywords(query: str) -> list[str]:
    return [
        word
        for word in re.findall(r"[a-z0-9]+", query.lower())
        if len(word) > 2 and word not in STOP_WORDS
    ]


def chunk_markdown(text: str, source: str) -> list[dict[str, str]]:
    chunks = []
    current_lines = []

    for line in text.splitlines():
        if line.startswith("## ") and current_lines:
            chunk_text = "\n".join(current_lines).strip()
            if len(chunk_text) > 20:
                chunks.append({"source": source, "chunk": chunk_text})
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        chunk_text = "\n".join(current_lines).strip()
        if len(chunk_text) > 20:
            chunks.append({"source": source, "chunk": chunk_text})

    return chunks


def corpus_dirs() -> list[Path]:
    configured = os.getenv("CORPUS_DIR")
    here = Path(__file__).resolve().parent
    candidates = [
        Path(configured) if configured else None,
        here / "corpus",
        here.parent / "corpus",
    ]
    return [path for path in candidates if path is not None]


def score_chunk(source: str, chunk: str, keywords: list[str]) -> int:
    haystack = f"{source}\n{chunk}".lower()
    source_text = source.lower()
    score = 0
    for keyword in keywords:
        score += haystack.count(keyword)
        if keyword in source_text:
            score += 2
    return score


def search_corpus_files(query: str, k: int = 3, corpus_dir: Path | None = None) -> list[DocSearchHit]:
    keywords = query_keywords(query)
    if not keywords:
        return []

    dirs = [corpus_dir] if corpus_dir else corpus_dirs()
    hits: list[DocSearchHit] = []

    for directory in dirs:
        if not directory or not directory.exists():
            continue

        for path in sorted(directory.glob("*.md")):
            text = path.read_text(encoding="utf-8")
            for chunk in chunk_markdown(text, path.name):
                score = score_chunk(chunk["source"], chunk["chunk"], keywords)
                if score > 0:
                    hits.append(
                        DocSearchHit(
                            source=chunk["source"],
                            chunk=chunk["chunk"],
                            score=score,
                        )
                    )

        if hits:
            break

    return sorted(hits, key=lambda hit: (-hit.score, hit.source, hit.chunk))[:k]
