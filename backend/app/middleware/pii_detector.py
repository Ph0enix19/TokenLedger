"""
PII and secret detection middleware.
Six patterns targeting the most common enterprise data leakage risks.
Design choice: precision over recall — we prefer false negatives to false positives
in a dev gateway. Production would use Microsoft Presidio.
"""
import re
from dataclasses import dataclass


@dataclass
class PIIMatch:
    pattern_name: str
    redacted_value: str  # e.g. "[EMAIL]"


# Each tuple: (name, compiled_regex, replacement_token)
_PATTERNS: list[tuple[str, re.Pattern, str]] = [
    (
        "EMAIL",
        re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", re.IGNORECASE),
        "[EMAIL]",
    ),
    (
        "MY_PHONE",
        re.compile(r"(\+?60|0)1[0-9][\-\s]?\d{7,8}"),
        "[MY_PHONE]",
    ),
    (
        "CREDIT_CARD",
        re.compile(r"\b(?:\d[ \-]?){13,16}\b"),
        "[CREDIT_CARD]",
    ),
    (
        "MY_IC",
        re.compile(r"\b\d{6}[\-\s]\d{2}[\-\s]\d{4}\b"),
        "[MY_IC]",
    ),
    (
        "AWS_KEY",
        re.compile(r"AKIA[0-9A-Z]{16}"),
        "[AWS_KEY]",
    ),
    (
        "API_KEY",
        re.compile(r"sk-[A-Za-z0-9]{20,}"),
        "[API_KEY]",
    ),
]


def detect_and_redact(prompt: str) -> tuple[str, list[PIIMatch]]:
    """
    Scans the prompt for PII and secrets.
    Returns (redacted_prompt, list_of_matches).
    If list_of_matches is non-empty, the gateway should block the request.
    """
    redacted = prompt
    matches: list[PIIMatch] = []

    for name, pattern, token in _PATTERNS:
        found = pattern.findall(redacted)
        if found:
            matches.append(PIIMatch(pattern_name=name, redacted_value=token))
            redacted = pattern.sub(token, redacted)

    return redacted, matches


def has_pii(prompt: str) -> bool:
    _, matches = detect_and_redact(prompt)
    return len(matches) > 0