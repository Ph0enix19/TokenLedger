"""
Embedding service using Ollama nomic-embed-text (local, free, 768 dims).
Uses sync ollama client — safe to call from async FastAPI for this MVP.
"""
import math
import ollama


def embed(text: str) -> list[float]:
    """
    Embeds text using nomic-embed-text via local Ollama.
    Normalises input: lowercase + strip whitespace before embedding
    so that "What is X?" and "what is x?" produce the same vector.
    Raises RuntimeError if Ollama is not running.
    """
    try:
        response = ollama.embeddings(
            model="nomic-embed-text",
            prompt=text.lower().strip(),
        )
        return response["embedding"]
    except Exception as e:
        raise RuntimeError(
            f"Ollama embedding failed: {e}. "
            "Ensure Ollama is running and nomic-embed-text is pulled."
        )


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """
    Cosine similarity between two equal-length float vectors.
    Returns float in [-1, 1]. Higher = more similar.
    """
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)