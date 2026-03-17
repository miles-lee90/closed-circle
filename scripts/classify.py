"""Classify author nationality based on name patterns and overrides."""

import json
import re
import sys
from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = PROJECT_ROOT / "config.yaml"
BOOKS_PATH = PROJECT_ROOT / "data" / "books.json"

# Common Japanese surname patterns in Korean transliteration
JP_SURNAME_PATTERNS = [
    r"무라카미", r"하루키", r"가와", r"무라", r"야마", r"다나카",
    r"스즈키", r"사토", r"다카하시", r"와타나베", r"이토",
    r"나카무라", r"고바야시", r"사이토", r"가토", r"요시다",
    r"야마다", r"사사키", r"마츠모토", r"이노우에", r"기무라",
    r"하야시", r"시미즈", r"야마구치", r"아베", r"이케다",
    r"하시모토", r"마루야마", r"이시카와", r"오가와", r"마에다",
    r"후지타", r"오카다", r"고토", r"나가이", r"미야자키",
    r"미야베", r"히가시노", r"요코야마", r"모리미", r"아쿠타가와",
    r"에도가와", r"시마다", r"아야츠지", r"유메노",
    r"오쿠다", r"나쓰메", r"다자이", r"미시마", r"가와바타",
]

KR_NAME_PATTERN = re.compile(r"^[가-힣]{2,4}$")
KR_NAME_SPACED_PATTERN = re.compile(r"^[가-힣]{1,2}\s[가-힣]{1,3}$")


def classify_author(author: str, author_original: str, overrides: dict) -> str:
    if author in overrides:
        return overrides[author]
    if author_original:
        if re.search(r"[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]", author_original):
            return "JP"
    if KR_NAME_PATTERN.match(author) or KR_NAME_SPACED_PATTERN.match(author):
        return "KR"
    for pattern in JP_SURNAME_PATTERNS:
        if re.search(pattern, author):
            return "JP"
    return "OTHER"


def classify_books(books: list[dict], overrides: dict) -> list[dict]:
    for book in books:
        if book.get("nationality") is None:
            book["nationality"] = classify_author(
                book.get("author", ""),
                book.get("author_original", ""),
                overrides,
            )
    return books


def main():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        config = yaml.safe_load(f)
    overrides = config.get("author_overrides", {})
    if not BOOKS_PATH.exists():
        print("No books.json found, skipping classification.")
        return
    with open(BOOKS_PATH, encoding="utf-8") as f:
        books = json.load(f)
    classified = classify_books(books, overrides)
    with open(BOOKS_PATH, "w", encoding="utf-8") as f:
        json.dump(classified, f, ensure_ascii=False, indent=2)
    counts = {"JP": 0, "KR": 0, "OTHER": 0}
    for b in classified:
        nat = b.get("nationality", "OTHER")
        counts[nat] = counts.get(nat, 0) + 1
    print(f"Classification: JP={counts['JP']}, KR={counts['KR']}, OTHER={counts['OTHER']}")


if __name__ == "__main__":
    main()
