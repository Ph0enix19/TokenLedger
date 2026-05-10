"""
Semantic cache backed by the cache_entries table in Postgres.

Lookup:
  1. Embed the incoming prompt
  2. Fetch all stored embeddings (SELECT id, embedding, response)
  3. Compute cosine similarity in Python
  4. If best match >= SIMILARITY_THRESHOLD: return cached response + increment hits

Known scaling limit: fetching all embeddings is O(n). This is fine up to
~5,000 entries. Beyond that, use pgvector's <=> operator with an index.
For a demo with <100 entries this is perfectly fine. Document this honestly.

Store:
  After a successful LLM call on a cache miss, INSERT prompt + embedding + response.
"""
import json
from app.db import get_db
from app.services.embeddings import embed, cosine_similarity

SIMILARITY_THRESHOLD = 0.92


async def cache_lookup(prompt: str) -> str | None:
    """
    Returns a cached response if a semantically similar prompt exists.
    Returns None on cache miss or if Ollama is unavailable.
    """
    try:
        prompt_embedding = embed(prompt)
    except RuntimeError:
        # Ollama down → treat as miss, don't crash the gateway
        return None

    async with get_db() as conn:
        cur = await conn.execute(
            "SELECT id, embedding, response FROM cache_entries",
            (),
        )
        rows = await cur.fetchall()

    if not rows:
        return None

    best_score = 0.0
    best_id = None
    best_response = None

    for row in rows:
        stored = row["embedding"]
        # pgvector returns embeddings as a string "[0.1,0.2,...]"
        if isinstance(stored, str):
            stored = json.loads(stored)
        score = cosine_similarity(prompt_embedding, stored)
        if score > best_score:
            best_score = score
            best_id = row["id"]
            best_response = row["response"]

    if best_score >= SIMILARITY_THRESHOLD and best_id is not None:
        async with get_db() as conn:
            await conn.execute(
                "UPDATE cache_entries SET hits = hits + 1 WHERE id = %s",
                (best_id,),
            )
            await conn.commit()
        return best_response

    return None


async def cache_store(prompt: str, response: str) -> None:
    """
    Stores a new entry in the cache after a successful LLM response.
    Silently skips if Ollama is unavailable.
    """
    try:
        prompt_embedding = embed(prompt)
    except RuntimeError:
        return

    async with get_db() as conn:
        await conn.execute(
            """
            INSERT INTO cache_entries (embedding, prompt, response)
            VALUES (%s::vector, %s, %s)
            """,
            (json.dumps(prompt_embedding), prompt, response),
        )
        await conn.commit()