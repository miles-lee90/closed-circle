"""Build static site from collected data using Jinja2 templates."""

import json
import random
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
import yaml
from jinja2 import Environment, FileSystemLoader
from kiwipiepy import Kiwi

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
TEMPLATES_DIR = PROJECT_ROOT / "templates"
STATIC_DIR = PROJECT_ROOT / "static"
DOCS_DIR = PROJECT_ROOT / "docs"
CONFIG_PATH = PROJECT_ROOT / "config.yaml"

RETENTION_DAYS = 365


def filter_by_retention(items: list[dict], retention_days: int = RETENTION_DAYS) -> list[dict]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=retention_days)).strftime("%Y-%m-%d")
    return [item for item in items if item.get("pub_date", "9999-99-99") >= cutoff]


def sort_books_jp_first(books: list[dict]) -> list[dict]:
    priority = {"JP": 0, "KR": 1, "OTHER": 2}

    def sort_key(b):
        nat = b.get("nationality", "OTHER")
        p = priority.get(nat, 2)
        pub_date = b.get("pub_date", "0000-00-00")
        return (p, [-ord(c) for c in pub_date])

    return sorted(books, key=sort_key)


_kiwi = Kiwi()

KEYWORD_STOPWORDS = {
    "소설", "작가", "작품", "이야기", "시리즈", "독자", "세계", "사람",
    "일본", "한국", "미스터리", "추리", "문학", "출판", "번역", "수상",
    "올해", "이번", "국내", "최초", "자신", "우리", "모든", "하나",
    "어떤", "때문", "결국", "가장", "바로", "지금", "것", "수", "등",
    "안", "중", "속", "위", "곳", "때", "말", "더", "또", "그", "이",
    "년", "월", "권", "편", "명", "개", "번", "원", "쪽", "사건",
    "정통", "전통", "독특", "주목", "최근", "활동", "활약", "인간",
    "진정", "분명", "현실", "정도", "느낌", "관심", "의미", "부분",
    "시작", "마지막", "이후", "과거", "현재", "시절", "당시",
}


def extract_keywords(book: dict, max_count: int = 3) -> list[str]:
    """kiwipiepy로 설명/줄거리에서 핵심 명사 키워드를 추출한다."""
    text = (book.get("publisher_desc") or "") + " " + (book.get("story") or "") + " " + (book.get("description") or "")
    if not text.strip():
        return []

    author = book.get("author", "")
    title = book.get("title", "")
    exclude = {author, title}
    # 저자명 부분 매칭도 제외 (예: "사쿠라다 도모야" → "사쿠라다", "도모야")
    exclude.update(author.split())

    tokens = _kiwi.tokenize(text)
    nouns = [
        t.form for t in tokens
        if t.tag in ("NNG", "NNP")
        and len(t.form) >= 2
        and t.form not in KEYWORD_STOPWORDS
        and t.form not in exclude
    ]

    freq = {}
    for n in nouns:
        freq[n] = freq.get(n, 0) + 1

    top = sorted(freq.items(), key=lambda x: (-x[1], -len(x[0])))
    return [w for w, _ in top[:max_count]]


def load_json(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(data: list[dict], path: Path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def build():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        config = yaml.safe_load(f)

    books = load_json(DATA_DIR / "books.json")
    news = load_json(DATA_DIR / "publisher_news.json")

    books = filter_by_retention(books)
    news = filter_by_retention(news)

    # Only JP and KR, only books with spine images, verify spine exists
    import sys
    from concurrent.futures import ThreadPoolExecutor
    books = [b for b in books if b.get("nationality") in ("JP", "KR") and b.get("spine_url")]

    def check_spine(b):
        try:
            r = requests.head(b["spine_url"], timeout=2)
            return r.status_code == 200
        except Exception as e:
            print(f"  WARNING: Spine check failed for {b.get('title', '?')}: {e}", file=sys.stderr)
            return False

    def check_back_cover(b):
        url = b.get("back_cover_url")
        if not url:
            return
        try:
            r = requests.head(url, timeout=2)
            if r.status_code != 200:
                b["back_cover_url"] = ""
        except Exception as e:
            print(f"  WARNING: Back cover check failed for {b.get('title', '?')}: {e}", file=sys.stderr)
            b["back_cover_url"] = ""

    with ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(check_spine, books))
        list(pool.map(check_back_cover, books))
    books = [b for b, ok in zip(books, results) if ok]
    print(f"Verified spine images: {len(books)} books")
    books = sort_books_jp_first(books)

    # Randomly assign tilt + gap variation
    random.seed(42)
    for b in books:
        b["gap"] = random.randint(5, 12)
    news = sorted(news, key=lambda n: n.get("pub_date", ""), reverse=True)

    publishers = sorted(set(n.get("publisher", "") for n in news))

    env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)

    site = config.get("site", {})
    jp_books = sorted(
        [b for b in books if b.get("nationality") == "JP"],
        key=lambda b: b.get("pub_date", ""), reverse=True,
    )
    featured_book = jp_books[0] if jp_books else None

    # 모든 책에 키워드 추출 + NEW 배지
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    for b in books:
        b["keywords"] = extract_keywords(b)
        b["is_new"] = b.get("pub_date", "") >= cutoff

    if featured_book:
        featured_book = jp_books[0]

    recent_books = sorted(books, key=lambda b: b.get("pub_date", ""), reverse=True)[:10]

    base_context = {
        "site_title": site.get("title", "클로즈드 써클"),
        "site_description": site.get("description", ""),
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "base_path": "",
    }

    context = {
        **base_context,
        "books": books,
        "featured_book": featured_book,
        "recent_books": recent_books,
        "recent_news": news[:3],
        "news": news,
        "publishers": publishers,
    }

    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    for template_name, output_name in [("books.html", "index.html"), ("news.html", "news.html"), ("about.html", "about.html")]:
        template = env.get_template(template_name)
        html = template.render(**context)
        (DOCS_DIR / output_name).write_text(html, encoding="utf-8")
        print(f"Built {output_name}")

    # 각 책 상세 페이지 생성
    book_dir = DOCS_DIR / "book"
    book_dir.mkdir(parents=True, exist_ok=True)
    detail_template = env.get_template("book_detail.html")
    for b in books:
        book_context = {**base_context, "base_path": "../", "book": b}
        html = detail_template.render(**book_context)
        (book_dir / f"{b['isbn13']}.html").write_text(html, encoding="utf-8")
    print(f"Built {len(books)} book detail pages")

    static_dest = DOCS_DIR / "static"
    if STATIC_DIR.exists():
        if static_dest.exists():
            shutil.rmtree(static_dest)
        shutil.copytree(STATIC_DIR, static_dest)
        print("Copied static assets")

    print(f"Site built: {len(books)} books, {len(news)} news items")


def main():
    build()


if __name__ == "__main__":
    main()
