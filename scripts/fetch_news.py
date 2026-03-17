"""Fetch publisher news from RSS feeds."""

import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import feedparser
import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = PROJECT_ROOT / "config.yaml"
NEWS_PATH = PROJECT_ROOT / "data" / "publisher_news.json"

USER_AGENT = "ClosedCircle/1.0 (Mystery Novel Tracker; GitHub Pages)"
CRAWL_DELAY = 1.5

# 미스터리 관련 키워드 필터 — 제목이나 본문에 하나라도 포함되면 수집
MYSTERY_KEYWORDS = [
    # 장르
    "미스터리", "미스테리", "추리", "스릴러", "누아르", "서스펜스",
    "호러", "공포", "괴담", "하드보일드", "코지", "사회파", "본격",
    "법정", "프로파일링", "연쇄", "탐정물", "수사물", "범죄물",
    # 소재
    "살인", "탐정", "범인", "사건", "수사", "형사", "범죄", "트릭",
    "밀실", "암호", "실종", "용의자", "피해자", "목격", "증거",
    "알리바이", "시체", "독살", "유괴", "납치", "복수", "비밀",
    "진실", "거짓말", "사라진", "죽음", "살해", "흉기", "피의자",
    "공범", "자백", "목격자", "현장", "검시", "부검", "혐의",
    "교살", "익사", "중독", "음모", "배신", "위장", "은폐",
    # 일본 미스터리 작가
    "히가시노", "미야베", "에도가와", "아야츠지", "시마다",
    "요코야마", "아가사", "크리스티", "코난 도일",
    "시라이 도모유키", "와카타케 나나미", "나카야마 시치리",
    "유키 신이치로", "하세가와", "모리미", "오쿠다", "나쓰메",
    "다자이", "미시마", "가와바타", "아쿠타가와", "유메노",
    "마쓰모토 세이초", "모리 히로시", "이사카 고타로",
    "히가시가와 도쿠야", "아비코 다케마루", "아리스가와 아리스",
    "노리즈키 린타로", "쓰지무라 미즈키", "요네자와 호노부",
    "미쓰다 신조", "기리노 나쓰오", "미나토 가나에",
    "구보 미사오", "니이나 사토시", "사쿠라다 도모야",
    # 한국/해외 미스터리 작가
    "김영하", "정유정", "김진명", "전건우", "정해연",
    "데니스 루헤인", "길리안 플린", "타나 프렌치", "스티그 라르손",
    # 미스터리 브랜드/시리즈
    "미스테리아", "클로즈드", "금요 미스터리",
]

# 미스터리 소설 책 제목 패턴 (『제목』, 《제목》, <제목>, "제목" 형태)
BOOK_TITLE_PATTERNS = [
    r"[『《「<\"].*?[』》」>\"]",
]


def is_mystery_related(title: str, summary: str) -> bool:
    """Check if a news entry is related to mystery/thriller genre."""
    text = title + " " + summary
    text_lower = text.lower()

    # 1. 키워드 매칭
    if any(kw in text_lower for kw in MYSTERY_KEYWORDS):
        return True

    # 2. 책 제목이 언급된 경우 — 미스터리 소설 관련 맥락 키워드와 함께
    book_context_keywords = ["출간", "신간", "신작", "번역", "출판", "소설", "읽", "서평", "리뷰", "추천"]
    has_book_title = any(re.search(p, text) for p in BOOK_TITLE_PATTERNS)
    has_context = any(kw in text_lower for kw in book_context_keywords)
    if has_book_title and has_context:
        return True

    return False


def make_news_id(publisher: str, link: str) -> str:
    raw = f"{publisher}_{link}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def parse_rss_entry(entry: dict, publisher: str) -> dict:
    summary_raw = entry.get("summary", "")
    summary_clean = re.sub(r"<[^>]+>", "", summary_raw).strip()
    summary = summary_clean[:200]

    pub_parsed = entry.get("published_parsed")
    if pub_parsed:
        pub_date = f"{pub_parsed[0]:04d}-{pub_parsed[1]:02d}-{pub_parsed[2]:02d}"
    else:
        pub_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    link = entry.get("link", "")

    return {
        "id": make_news_id(publisher, link),
        "publisher": publisher,
        "title": entry.get("title", ""),
        "summary": summary,
        "link": link,
        "pub_date": pub_date,
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def fetch_rss(feed_url: str) -> list[dict]:
    feed = feedparser.parse(feed_url, agent=USER_AGENT)
    return feed.entries


def load_news(path: Path = NEWS_PATH) -> list[dict]:
    if not Path(path).exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_news(news: list[dict], path: Path = NEWS_PATH):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(news, f, ensure_ascii=False, indent=2)


def merge_news(existing: list[dict], new: list[dict]) -> list[dict]:
    by_id = {n["id"]: n for n in existing}
    for n in new:
        by_id[n["id"]] = n
    return list(by_id.values())


def main():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        config = yaml.safe_load(f)
    existing = load_news()
    all_new = []
    for pub in config.get("publishers", []):
        if pub.get("type") == "TBD" or pub.get("feed_url") == "TBD":
            continue
        name = pub["name"]
        feed_url = pub["feed_url"]
        print(f"Fetching {name}...")
        try:
            entries = fetch_rss(feed_url)
            parsed = [parse_rss_entry(e, name) for e in entries]
            filtered = [p for p in parsed if is_mystery_related(p["title"], p["summary"])]
            all_new.extend(filtered)
            print(f"  Found {len(parsed)} entries, {len(filtered)} mystery-related")
        except Exception as e:
            print(f"  ERROR fetching {name}: {e}", file=sys.stderr)
        time.sleep(CRAWL_DELAY)
    merged = merge_news(existing, all_new)
    save_news(merged)
    print(f"Total news items: {len(merged)}")


if __name__ == "__main__":
    main()
