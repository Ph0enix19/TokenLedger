r"""
One-shot script: reads corpus/*.md, chunks by ## headers,
embeds each chunk with Ollama, stores in documents table.
Run once. Re-run if corpus files change.

Usage:
  cd "C:\Programming\github repos\AI Project\TokenLedger"
  backend\.venv\Scripts\python.exe scripts\index_corpus.py
"""
import os
import sys
import asyncio
import json

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import psycopg
from psycopg.rows import dict_row
import ollama

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://tokenledger:tokenledger@localhost:5433/tokenledger"
)
CORPUS_DIR = os.path.join(os.path.dirname(__file__), "..", "corpus")


def chunk_markdown(text: str, source: str) -> list[dict]:
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


def embed_text(text: str) -> list[float]:
    response = ollama.embeddings(model="nomic-embed-text", prompt=text.lower().strip())
    return response["embedding"]


async def index_corpus():
    conn = await psycopg.AsyncConnection.connect(DATABASE_URL, row_factory=dict_row)

    await conn.execute("DELETE FROM documents", ())
    await conn.commit()
    print("Cleared existing documents.")

    files = [f for f in os.listdir(CORPUS_DIR) if f.endswith(".md")]
    total = 0

    for filename in sorted(files):
        path = os.path.join(CORPUS_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()

        chunks = chunk_markdown(text, source=filename)
        print(f"  {filename}: {len(chunks)} chunks", end="", flush=True)

        for chunk in chunks:
            embedding = embed_text(chunk["chunk"])
            await conn.execute(
                "INSERT INTO documents (source, chunk, embedding) VALUES (%s, %s, %s::vector)",
                (chunk["source"], chunk["chunk"], json.dumps(embedding)),
            )
            total += 1
            print(".", end="", flush=True)

        await conn.commit()
        print()

    await conn.close()
    print(f"\nDone. Indexed {total} chunks from {len(files)} files.")


if __name__ == "__main__":
    asyncio.run(index_corpus())
