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
    "미스터리", "미스테리", "추리", "스릴러", "살인", "탐정", "범인",
    "사건", "수사", "형사", "범죄", "트릭", "밀실", "암호", "실종",
    "용의자", "피해자", "목격", "증거", "알리바이", "누아르",
    "서스펜스", "호러", "공포", "괴담",
    # 주요 미스터리 작가명
    "히가시노", "미야베", "아가사", "크리스티", "코난 도일",
    "에도가와", "아야츠지", "시마다", "요코야마",
    # 미스터리 출판 브랜드/시리즈
    "엘릭시르", "미스테리아", "클로즈드",
]


def is_mystery_related(title: str, summary: str) -> bool:
    """Check if a news entry is related to mystery/thriller genre."""
    text = (title + " " + summary).lower()
    return any(kw in text for kw in MYSTERY_KEYWORDS)


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
