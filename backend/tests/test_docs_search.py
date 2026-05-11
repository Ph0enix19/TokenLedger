from pathlib import Path

from mcp_server.docs_search import query_keywords, search_corpus_files


def test_query_keywords_remove_docs_stop_words():
    assert query_keywords("@docs what is the remote work policy?") == [
        "remote",
        "work",
        "policy",
    ]


def test_search_corpus_files_finds_hr_policy(tmp_path: Path):
    (tmp_path / "hr_policy.md").write_text(
        "# HR Policy\n\n"
        "## Remote Work\n"
        "Employees may work remotely up to 3 days per week.\n",
        encoding="utf-8",
    )

    hits = search_corpus_files("remote work policy", corpus_dir=tmp_path)

    assert hits
    assert hits[0].source == "hr_policy.md"
    assert "3 days per week" in hits[0].chunk
