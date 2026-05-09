import pytest
from app.middleware.pii_detector import detect_and_redact, has_pii


def test_detects_email():
    prompt = "Please email me at john.doe@acme.com for the report"
    redacted, matches = detect_and_redact(prompt)
    assert len(matches) == 1
    assert matches[0].pattern_name == "EMAIL"
    assert "[EMAIL]" in redacted
    assert "john.doe@acme.com" not in redacted


def test_detects_malaysian_phone():
    prompt = "Call me on 0123456789 after 6pm"
    _, matches = detect_and_redact(prompt)
    names = [m.pattern_name for m in matches]
    assert "MY_PHONE" in names


def test_detects_aws_key():
    prompt = "My AWS key is AKIAIOSFODNN7EXAMPLE and I need help"
    _, matches = detect_and_redact(prompt)
    names = [m.pattern_name for m in matches]
    assert "AWS_KEY" in names


def test_detects_api_key():
    prompt = "token = sk-abcdefghijklmnopqrstuvwxyz12345"
    _, matches = detect_and_redact(prompt)
    names = [m.pattern_name for m in matches]
    assert "API_KEY" in names


def test_clean_prompt_passes():
    prompt = "Summarize the Q3 OKRs for the engineering team"
    redacted, matches = detect_and_redact(prompt)
    assert len(matches) == 0
    assert redacted == prompt


def test_multiple_pii_types():
    prompt = "My email is x@y.com and my key is sk-aaaabbbbccccddddeeeeffffgggg1234"
    _, matches = detect_and_redact(prompt)
    names = [m.pattern_name for m in matches]
    assert "EMAIL" in names
    assert "API_KEY" in names