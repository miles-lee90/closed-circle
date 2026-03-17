"""Build static site from collected data using Jinja2 templates."""

import json
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader

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

    save_json(books, DATA_DIR / "books.json")
    save_json(news, DATA_DIR / "publisher_news.json")

    # Only JP and KR, only books with spine images, verify spine exists
    import requests
    books = [b for b in books if b.get("nationality") in ("JP", "KR") and b.get("spine_url")]
    verified = []
    for b in books:
        try:
            r = requests.head(b["spine_url"], timeout=5)
            if r.status_code == 200:
                verified.append(b)
        except Exception:
            pass
    books = verified
    print(f"Verified spine images: {len(books)} books")
    books = sort_books_jp_first(books)
    news = sorted(news, key=lambda n: n.get("pub_date", ""), reverse=True)

    publishers = sorted(set(n.get("publisher", "") for n in news))

    env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)

    site = config.get("site", {})
    context = {
        "site_title": site.get("title", "클로즈드 써클"),
        "site_description": site.get("description", ""),
        "books": books,
        "news": news,
        "publishers": publishers,
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    }

    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    for template_name in ["index.html", "news.html", "about.html"]:
        template = env.get_template(template_name)
        html = template.render(**context)
        (DOCS_DIR / template_name).write_text(html, encoding="utf-8")
        print(f"Built {template_name}")

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
