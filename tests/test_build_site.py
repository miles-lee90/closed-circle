from datetime import datetime, timedelta, timezone
from scripts.build_site import filter_by_retention, sort_books_jp_first

TODAY = datetime.now(timezone.utc)


def test_filter_by_retention_keeps_recent():
    books = [
        {"pub_date": (TODAY - timedelta(days=10)).strftime("%Y-%m-%d")},
        {"pub_date": (TODAY - timedelta(days=100)).strftime("%Y-%m-%d")},
    ]
    result = filter_by_retention(books, retention_days=90)
    assert len(result) == 1


def test_filter_by_retention_handles_empty():
    assert filter_by_retention([], 90) == []


def test_sort_books_jp_first():
    books = [
        {"nationality": "KR", "pub_date": "2026-03-01"},
        {"nationality": "JP", "pub_date": "2026-03-02"},
        {"nationality": "OTHER", "pub_date": "2026-03-03"},
        {"nationality": "JP", "pub_date": "2026-03-01"},
    ]
    result = sort_books_jp_first(books)
    assert result[0]["nationality"] == "JP"
    assert result[1]["nationality"] == "JP"
    assert result[0]["pub_date"] == "2026-03-02"
