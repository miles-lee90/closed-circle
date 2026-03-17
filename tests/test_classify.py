from scripts.classify import classify_author, classify_books

OVERRIDES = {
    "히가시노 게이고": "JP",
    "미야베 미유키": "JP",
}


def test_classify_override_match():
    assert classify_author("히가시노 게이고", "", OVERRIDES) == "JP"


def test_classify_korean_name():
    assert classify_author("김영하", "", {}) == "KR"


def test_classify_japanese_pattern_gawa():
    assert classify_author("하세가와 유이치", "", {}) == "JP"


def test_classify_japanese_pattern_mura():
    assert classify_author("무라카미 류", "", {}) == "JP"


def test_classify_japanese_by_original_name():
    assert classify_author("알 수 없는 작가", "東野圭吾", {}) == "JP"


def test_classify_unknown_defaults_to_other():
    assert classify_author("John Grisham", "", {}) == "OTHER"


def test_classify_books_updates_only_unclassified():
    books = [
        {"author": "히가시노 게이고", "author_original": "", "nationality": None},
        {"author": "김영하", "author_original": "", "nationality": "KR"},  # already set
    ]
    result = classify_books(books, OVERRIDES)
    assert result[0]["nationality"] == "JP"
    assert result[1]["nationality"] == "KR"  # unchanged
