import hashlib
from scripts.fetch_news import parse_rss_entry, make_news_id, merge_news, load_news, save_news, is_mystery_related

SAMPLE_ENTRY = {
    "title": "2026년 3월 미스터리 신간 안내",
    "summary": "이번 달 출간 예정인 미스터리 소설을 소개합니다. 히가시노 게이고의 신작부터...",
    "link": "https://blog.naver.com/elixirbooks/123456",
    "published_parsed": (2026, 3, 15, 0, 0, 0, 0, 0, 0),
}


def test_parse_rss_entry():
    result = parse_rss_entry(SAMPLE_ENTRY, "엘릭시르")
    assert result["publisher"] == "엘릭시르"
    assert result["title"] == "2026년 3월 미스터리 신간 안내"
    assert len(result["summary"]) <= 200
    assert result["link"].startswith("https://")
    assert result["pub_date"] == "2026-03-15"
    assert "id" in result
    assert "fetched_at" in result


def test_parse_rss_entry_truncates_long_summary():
    entry = {**SAMPLE_ENTRY, "summary": "가" * 500}
    result = parse_rss_entry(entry, "테스트")
    assert len(result["summary"]) == 200


def test_parse_rss_entry_missing_date():
    entry = {**SAMPLE_ENTRY}
    del entry["published_parsed"]
    result = parse_rss_entry(entry, "테스트")
    assert len(result["pub_date"]) == 10


def test_make_news_id_is_deterministic():
    id1 = make_news_id("pub", "https://example.com/1")
    id2 = make_news_id("pub", "https://example.com/1")
    assert id1 == id2


def test_make_news_id_differs_for_different_inputs():
    id1 = make_news_id("pub", "https://example.com/1")
    id2 = make_news_id("pub", "https://example.com/2")
    assert id1 != id2


def test_merge_news_deduplicates():
    a = [{"id": "x", "title": "Old"}]
    b = [{"id": "x", "title": "New"}, {"id": "y", "title": "Y"}]
    merged = merge_news(a, b)
    assert len(merged) == 2
    match = [n for n in merged if n["id"] == "x"][0]
    assert match["title"] == "New"


def test_load_news_returns_empty_for_missing(tmp_path):
    assert load_news(tmp_path / "nope.json") == []


def test_save_and_load_news(tmp_path):
    news = [{"id": "a", "title": "Test"}]
    path = tmp_path / "news.json"
    save_news(news, path)
    assert load_news(path) == news


def test_is_mystery_related_matches_keyword():
    assert is_mystery_related("미스터리 신간 안내", "") is True
    assert is_mystery_related("추리소설 추천", "") is True
    assert is_mystery_related("", "히가시노 게이고 신작") is True


def test_is_mystery_related_matches_expanded_keywords():
    assert is_mystery_related("하드보일드 소설의 영광", "") is True
    assert is_mystery_related("", "밀실 트릭의 대가") is True
    assert is_mystery_related("시체가 발견된 후", "") is True
    assert is_mystery_related("", "납치된 소녀의 행방") is True
    assert is_mystery_related("", "마쓰모토 세이초 걸작선") is True


def test_is_mystery_related_matches_book_title_with_context():
    assert is_mystery_related("『살인자의 기억법』 출간", "") is True
    assert is_mystery_related("《명탐정의 창자》 신간 소개", "") is True
    assert is_mystery_related("", "신작 소설 「어둠의 끝」 리뷰") is True


def test_is_mystery_related_rejects_unrelated():
    assert is_mystery_related("에세이 추천", "좋은 책입니다") is False
    assert is_mystery_related("강연 안내", "작가와의 만남") is False
