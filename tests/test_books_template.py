"""Verify books.html build output has expected structure."""
from pathlib import Path


DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"


def test_books_html_has_no_hero_section():
    html = (DOCS_DIR / "books.html").read_text(encoding="utf-8")
    assert '<section class="hero">' not in html


def test_books_html_has_floating_filter():
    html = (DOCS_DIR / "books.html").read_text(encoding="utf-8")
    assert 'id="floating-filter"' in html
    assert "floating-filter-btn" in html


def test_books_html_has_books_js_array():
    html = (DOCS_DIR / "books.html").read_text(encoding="utf-8")
    assert "var BOOKS = [" in html


def test_books_html_loads_books_js():
    html = (DOCS_DIR / "books.html").read_text(encoding="utf-8")
    assert 'src="static/books.js"' in html


def test_books_html_has_data_idx_on_spines():
    html = (DOCS_DIR / "books.html").read_text(encoding="utf-8")
    assert 'data-idx="0"' in html


def test_books_html_has_detail_container():
    html = (DOCS_DIR / "books.html").read_text(encoding="utf-8")
    assert 'id="book-detail-container"' in html


def test_news_html_still_has_filter_js():
    html = (DOCS_DIR / "news.html").read_text(encoding="utf-8")
    assert 'src="static/filter.js"' in html


def test_news_html_still_has_hero():
    html = (DOCS_DIR / "news.html").read_text(encoding="utf-8")
    assert '<section class="hero">' in html
