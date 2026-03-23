# books.html Stripe Press 스타일 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** books.html을 Stripe Press 스타일 책등 그리드 + 3D 회전 인라인 상세로 리디자인

**Architecture:** 기존 spine 그리드 레이아웃을 유지하면서, 클릭 시 JS로 6면체 3D 책을 생성하고 CSS 트랜지션으로 표지 면을 노출한 뒤 인라인 상세 정보를 표시. 필터는 좌하단 플로팅 glass pill. books.html 전용 JS를 `books.js`로 분리하고 news.html 필터 로직은 `filter.js`에 유지.

**Tech Stack:** Jinja2, vanilla JS, CSS 3D transforms, GitHub Pages (static)

**Spec:** `docs/superpowers/specs/2026-03-24-books-redesign-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Rewrite | `templates/books.html` | 책등 그리드 + BOOKS JS 배열 주입 + books.js 로드 |
| Create | `static/books.js` | 3D 전환, 인라인 상세, 플로팅 필터, 드래그 회전 |
| Modify | `static/style.css` | cover-reveal 제거, books hero 제거, 3D 전환 CSS 추가, hero-label-kr 추가, 플로팅 필터 CSS |
| Modify | `static/filter.js` | spine 클릭 팝업 로직 제거 (news 필터만 남김) |
| Modify | `scripts/build_site.py` | books 템플릿에 추가 필드 전달 (keywords, publisher_desc, back_cover_url 등) |
| Create | `tests/test_books_template.py` | books.html 빌드 출력 검증 |

---

### Task 1: filter.js에서 news 전용 로직만 남기기

**Files:**
- Modify: `static/filter.js` — spine 클릭 팝업 로직 제거, news 필터만 유지

- [ ] **Step 1: filter.js 현재 구조 확인**

`static/filter.js`는 두 부분으로 나뉨:
1. IIFE: spine 클릭 → cover-reveal 팝업 (lines 1-84)
2. DOMContentLoaded: `.filter-btn` 클릭 필터링 (lines 86-122) — `#book-grid` spine + `#news-list` 모두 처리

- [ ] **Step 2: spine 팝업 IIFE 제거, 필터 로직 유지**

`static/filter.js`를 다음으로 교체:

```javascript
document.addEventListener("DOMContentLoaded", function () {
    var buttons = document.querySelectorAll(".filter-btn");
    var newsList = document.getElementById("news-list");

    buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            buttons.forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");

            var filter = btn.getAttribute("data-filter");

            if (newsList) {
                var items = newsList.querySelectorAll(".news-card");
                items.forEach(function (item) {
                    if (filter === "all" || item.getAttribute("data-publisher") === filter) {
                        item.style.display = "";
                    } else {
                        item.style.display = "none";
                    }
                });
            }
        });
    });
});
```

- [ ] **Step 3: 빌드 후 news.html 필터 동작 확인**

```bash
cd ~/Projects/closed-circle && python scripts/build_site.py
```

브라우저에서 `docs/news.html`을 열어 필터 버튼(전체/출판사)이 정상 동작하는지 확인.

- [ ] **Step 4: Commit**

```bash
git add static/filter.js
git commit -m "refactor: remove spine popup from filter.js, keep news filter only"
```

---

### Task 2: style.css 정리 및 추가

**Files:**
- Modify: `static/style.css` — cover-reveal 제거, hero-label-kr 추가, 플로팅 필터 CSS, 3D 전환 CSS

- [ ] **Step 1: cover-reveal 관련 CSS 제거**

`static/style.css`에서 다음 블록 제거:
- `/* ─── Cover Info Popup ─── */` 섹션 전체 (`.cover-reveal`, `.cover-reveal.visible`, `.spine-wrapper.active`, `.cover-reveal img`, `.cover-title`, `.cover-title a`, `.cover-title a:hover`, `.cover-author`, `.cover-meta`, `.cover-price`)

**주의:** `.hero`, `.filters`, `.filter-btn` CSS는 `news.html`에서 여전히 사용하므로 절대 제거하지 않음.

- [ ] **Step 2: hero-label-kr CSS 추가**

기존 `.hero-label` 아래에 추가:

```css
.hero-label-kr {
    color: var(--badge-kr);
    border-color: var(--badge-kr);
}
```

- [ ] **Step 3: 플로팅 필터 CSS 추가**

`/* ─── Filters ─── */` 섹션 뒤에 추가:

```css
/* ─── Floating Filter (books) ─── */
.floating-filter {
    position: fixed;
    bottom: 24px;
    left: 24px;
    display: flex;
    gap: 3px;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: saturate(180%) blur(12px);
    -webkit-backdrop-filter: saturate(180%) blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 3px;
    z-index: 50;
    transition: opacity 0.3s ease;
}

.floating-filter.hidden {
    opacity: 0;
    pointer-events: none;
}

.floating-filter-btn {
    background: none;
    border: none;
    padding: 5px 12px;
    border-radius: 16px;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-tertiary);
    cursor: pointer;
    font-family: inherit;
    transition: all var(--transition);
}

.floating-filter-btn:hover {
    color: var(--text-secondary);
}

.floating-filter-btn.active {
    background: rgba(255, 255, 255, 0.15);
    color: var(--text-primary);
}
```

- [ ] **Step 4: 3D 전환 + 인라인 상세 CSS 추가**

style.css 끝부분 (반응형 섹션 앞)에 추가:

```css
/* ─── Books 3D Transition ─── */
.bookshelf.detail-open .spine-wrapper:not(.active-spine) {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s ease 0.1s;
}

.bookshelf.detail-open .spine-wrapper.active-spine {
    position: absolute;
    z-index: 60;
}

/* Inline Detail View */
.book-detail-inline {
    display: flex;
    align-items: center;
    gap: 3.5rem;
    max-width: 880px;
    width: 100%;
    margin: 0 auto;
    min-height: calc(100vh - 53px);
    padding: 3rem 2rem;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.book-detail-inline.visible {
    opacity: 1;
}

.book-detail-inline .hero-info {
    flex: 1;
}

.book-detail-inline .hero-cover {
    flex-shrink: 0;
}

/* Spine stagger fade */
.spine-wrapper.stagger-in {
    animation: staggerFadeIn 0.3s ease forwards;
}

@keyframes staggerFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 5: 반응형 CSS에 인라인 상세 모바일 추가**

`@media (max-width: 768px)` 블록 안에 추가:

```css
    .book-detail-inline {
        flex-direction: column-reverse;
        gap: 2rem;
        text-align: center;
        padding: 2rem 1rem;
    }

    .book-detail-inline .book3d-scene {
        transform: scale(0.75);
    }

    .book-detail-inline .hero-tags {
        justify-content: center;
    }

    .book-detail-inline .hero-meta {
        justify-content: center;
    }
```

- [ ] **Step 6: Commit**

```bash
git add static/style.css
git commit -m "style: add 3D transition, floating filter, inline detail CSS for books redesign"
```

---

### Task 3: templates/books.html 재작성

**Files:**
- Rewrite: `templates/books.html` — hero 제거, spine 그리드 + BOOKS JS 배열 + books.js 로드

- [ ] **Step 1: books.html 재작성**

```html
{% extends "base.html" %}
{% block title %}신간 - Closed Circle{% endblock %}

{% block content %}
<div class="bookshelf" id="book-grid">
    {% for book in books %}
    {% set h = book.size_height if book.size_height else 188 %}
    {% set d = book.size_depth if book.size_depth else 15 %}
    {% set spine_h = (h * 3.0)|int %}
    {% set spine_w = (d * 1.6)|int %}
    {% set spine_w = [spine_w, 20]|max %}
    <div class="spine-wrapper"
         data-nationality="{{ book.nationality }}"
         data-idx="{{ loop.index0 }}"
         style="height:{{ spine_h }}px;margin-right:{{ book.gap }}px">
        <div class="spine-book" style="height:100%">
            <div class="spine-face">
                <img class="spine-img" src="{{ book.spine_url }}" alt="{{ book.title }}" loading="lazy">
                {% if book.nationality == 'JP' %}
                <span class="spine-badge badge-jp"></span>
                {% elif book.nationality == 'KR' %}
                <span class="spine-badge badge-kr"></span>
                {% endif %}
            </div>
        </div>
    </div>
    {% endfor %}
</div>

<div id="book-detail-container"></div>

<div class="floating-filter" id="floating-filter">
    <button class="floating-filter-btn active" data-filter="all">전체</button>
    <button class="floating-filter-btn" data-filter="JP">JP</button>
    <button class="floating-filter-btn" data-filter="KR">KR</button>
</div>

{% if not books %}
<p class="empty">아직 수집된 신간이 없습니다.</p>
{% endif %}
{% endblock %}

{% block scripts %}
<script>
var BOOKS = [
    {% for book in books %}
    {
        isbn: {{ book.isbn13|tojson }},
        title: {{ book.title|tojson }},
        author: {{ book.author|tojson }},
        nationality: {{ book.nationality|tojson }},
        publisher: {{ book.publisher|tojson }},
        pubDate: {{ book.pub_date|tojson }},
        price: {{ book.price }},
        link: {{ book.link|tojson }},
        coverUrl: {{ book.cover_url|tojson }},
        spineUrl: {{ book.spine_url|tojson }},
        backCoverUrl: {{ (book.back_cover_url or '')|tojson }},
        desc: {{ (book.summary or book.publisher_desc or book.description or '')|tojson }},
        keywords: {{ (book.keywords or [])|tojson }},
        sizeW: {{ ((book.size_width or 128) * 2.2)|int }},
        sizeH: {{ ((book.size_height or 188) * 2.2)|int }},
        sizeD: {{ ((book.size_depth or 16) * 2.2)|int }}
    }{{ "," if not loop.last }}
    {% endfor %}
];
</script>
<script src="static/books.js"></script>
{% endblock %}
```

- [ ] **Step 2: Commit**

```bash
git add templates/books.html
git commit -m "feat: rewrite books.html template — spine grid with BOOKS data array"
```

---

### Task 4: books.js — 플로팅 필터 + spine 필터링

**Files:**
- Create: `static/books.js` — 첫 번째 기능: 플로팅 필터

- [ ] **Step 1: books.js 생성 — 필터 기능**

```javascript
(function () {
    "use strict";

    var grid = document.getElementById("book-grid");
    var filterBar = document.getElementById("floating-filter");
    var filterBtns = filterBar.querySelectorAll(".floating-filter-btn");

    // ─── Floating Filter ───
    filterBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            filterBtns.forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");

            var filter = btn.getAttribute("data-filter");
            var spines = grid.querySelectorAll(".spine-wrapper");
            var delay = 0;

            spines.forEach(function (spine) {
                var show = filter === "all" || spine.getAttribute("data-nationality") === filter;
                if (show) {
                    spine.style.display = "";
                    spine.classList.remove("stagger-in");
                    void spine.offsetWidth; // reflow
                    spine.style.animationDelay = delay + "ms";
                    spine.classList.add("stagger-in");
                    delay += 20;
                } else {
                    spine.style.display = "none";
                    spine.classList.remove("stagger-in");
                }
            });
        });
    });

})();
```

- [ ] **Step 2: 빌드 후 필터 동작 확인**

```bash
cd ~/Projects/closed-circle && python scripts/build_site.py
```

브라우저에서 `docs/books.html`을 열어:
- 책등 그리드가 hero 없이 바로 표시되는지
- 좌하단 플로팅 필터가 보이는지
- 전체/JP/KR 필터 전환 시 stagger 애니메이션으로 표시되는지

- [ ] **Step 3: Commit**

```bash
git add static/books.js
git commit -m "feat: add floating filter with stagger animation for books page"
```

---

### Task 5: books.js — 3D 전환 (spine 클릭 → 3D 책 회전)

**Files:**
- Modify: `static/books.js` — 3D 전환 로직 추가

- [ ] **Step 1: 3D 책 생성 + 회전 애니메이션 추가**

`books.js`의 IIFE 안에 추가. Task 4에서 만든 `})();` 닫기를 파일 끝으로 옮기고, 필터 코드와 아래 코드가 모두 하나의 IIFE 안에 있도록 함:

```javascript
    // ─── 3D Transition ───
    var detailContainer = document.getElementById("book-detail-container");
    var activeSpine = null;
    var isDetailOpen = false;

    function createBook3D(book) {
        var w = book.sizeW, h = book.sizeH, d = book.sizeD;
        var scene = document.createElement("div");
        scene.className = "book3d-scene";
        scene.style.width = w + "px";
        scene.style.height = h + "px";

        var bookEl = document.createElement("div");
        bookEl.className = "book3d";
        bookEl.id = "book3d-inline";
        bookEl.style.width = w + "px";
        bookEl.style.height = h + "px";

        // Front
        var front = document.createElement("div");
        front.className = "book3d-face book3d-front";
        front.style.cssText = "width:" + w + "px;height:" + h + "px;transform:translateZ(" + (d / 2) + "px)";
        front.innerHTML = '<img src="' + book.coverUrl + '" alt="' + book.title + '">';

        // Back
        var back = document.createElement("div");
        back.className = "book3d-face book3d-back";
        back.style.cssText = "width:" + w + "px;height:" + h + "px;transform:rotateY(180deg) translateZ(" + (d / 2) + "px)";
        if (book.backCoverUrl) {
            back.innerHTML = '<img src="' + book.backCoverUrl + '" alt="뒷표지">';
        }

        // Spine
        var spineLeft = Math.floor((w - d) / 2);
        var spine = document.createElement("div");
        spine.className = "book3d-face book3d-spine";
        spine.style.cssText = "width:" + d + "px;height:" + h + "px;left:" + spineLeft + "px;transform:rotateY(-90deg) translateZ(" + (w / 2) + "px)";
        spine.innerHTML = '<img src="' + book.spineUrl + '" alt="책등">';

        // Fore edge
        var fore = document.createElement("div");
        fore.className = "book3d-face book3d-fore book3d-paper";
        fore.style.cssText = "width:" + d + "px;height:" + h + "px;left:" + spineLeft + "px;transform:rotateY(90deg) translateZ(" + (w / 2) + "px)";

        // Top
        var topFace = document.createElement("div");
        topFace.className = "book3d-face book3d-top book3d-paper";
        var topY = Math.floor((h - d) / 2);
        topFace.style.cssText = "width:" + w + "px;height:" + d + "px;top:" + topY + "px;transform:rotateX(90deg) translateZ(" + (h / 2) + "px)";

        // Bottom
        var bottomFace = document.createElement("div");
        bottomFace.className = "book3d-face book3d-bottom book3d-paper";
        bottomFace.style.cssText = "width:" + w + "px;height:" + d + "px;top:" + topY + "px;transform:rotateX(-90deg) translateZ(" + (h / 2) + "px)";

        bookEl.appendChild(front);
        bookEl.appendChild(back);
        bookEl.appendChild(spine);
        bookEl.appendChild(fore);
        bookEl.appendChild(topFace);
        bookEl.appendChild(bottomFace);
        scene.appendChild(bookEl);

        return { scene: scene, bookEl: bookEl };
    }

    function openDetail(idx, spineEl) {
        if (isDetailOpen) return;
        isDetailOpen = true;

        var book = BOOKS[idx];
        activeSpine = spineEl;
        spineEl.classList.add("active-spine");
        grid.classList.add("detail-open");
        filterBar.classList.add("hidden");

        // Build inline detail
        var b3d = createBook3D(book);

        var nationalityLabel = book.nationality === "JP"
            ? '<span class="hero-label">일본 미스터리</span>'
            : '<span class="hero-label hero-label-kr">한국 미스터리</span>';

        var keywordsHtml = "";
        if (book.keywords && book.keywords.length) {
            keywordsHtml = '<div class="hero-tags">';
            book.keywords.forEach(function (kw) {
                keywordsHtml += '<span class="hero-tag">' + kw + '</span>';
            });
            keywordsHtml += '</div>';
        }

        var descHtml = book.desc
            ? '<p class="hero-desc">' + book.desc + '</p>'
            : '';

        var priceStr = book.price.toLocaleString() + '원';

        var detail = document.createElement("div");
        detail.className = "book-detail-inline";
        detail.innerHTML =
            '<div class="hero-cover"></div>' +
            '<div class="hero-info">' +
                nationalityLabel +
                '<h1 class="hero-title">' + book.title + '</h1>' +
                '<p class="hero-author">' + book.author + '</p>' +
                descHtml +
                keywordsHtml +
                '<div class="hero-meta">' +
                    '<span class="hero-meta-item">' + book.publisher + '</span>' +
                    '<span class="hero-meta-sep">·</span>' +
                    '<span class="hero-meta-item">' + book.pubDate + '</span>' +
                    '<span class="hero-meta-sep">·</span>' +
                    '<span class="hero-meta-item">' + priceStr + '</span>' +
                    '<span class="hero-meta-sep">·</span>' +
                    '<a href="' + book.link + '" target="_blank" rel="noopener" class="hero-meta-link">알라딘</a>' +
                '</div>' +
            '</div>';

        detail.querySelector(".hero-cover").appendChild(b3d.scene);

        // Start with rotateY(-90deg) = spine face showing
        b3d.bookEl.style.transform = "rotateX(0deg) rotateY(-90deg)";

        detailContainer.innerHTML = "";
        detailContainer.appendChild(detail);

        // Animate: rotate to show cover
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                b3d.bookEl.style.transition = "transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)";
                b3d.bookEl.style.transform = "rotateX(5deg) rotateY(-20deg)";
                detail.classList.add("visible");
            });
        });

        // Setup drag rotation
        setupDrag(b3d.scene, b3d.bookEl, -20, 5);
    }

    function closeDetail() {
        if (!isDetailOpen) return;
        isDetailOpen = false;

        var detail = detailContainer.querySelector(".book-detail-inline");
        var bookEl = document.getElementById("book3d-inline");

        if (detail) {
            detail.classList.remove("visible");
        }

        if (bookEl) {
            bookEl.style.transition = "transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)";
            bookEl.style.transform = "rotateX(0deg) rotateY(-90deg)";
        }

        grid.classList.remove("detail-open");
        filterBar.classList.remove("hidden");

        if (activeSpine) {
            activeSpine.classList.remove("active-spine");
            activeSpine = null;
        }

        // Stagger fade in spines
        var spines = grid.querySelectorAll(".spine-wrapper");
        var delay = 0;
        spines.forEach(function (s) {
            if (s.style.display !== "none") {
                s.classList.remove("stagger-in");
                void s.offsetWidth;
                s.style.animationDelay = delay + "ms";
                s.classList.add("stagger-in");
                delay += 15;
            }
        });

        setTimeout(function () {
            detailContainer.innerHTML = "";
        }, 700);
    }

    // ─── Drag Rotation ───
    function setupDrag(scene, bookEl, initRotY, initRotX) {
        var rotY = initRotY, rotX = initRotX;
        var dragging = false;
        var lastX, lastY;

        scene.addEventListener("mousedown", function (e) {
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            scene.style.cursor = "grabbing";
            bookEl.style.transition = "transform 0.1s ease-out";
            e.preventDefault();
        });

        document.addEventListener("mousemove", function (e) {
            if (!dragging) return;
            rotY += (e.clientX - lastX) * 0.5;
            rotX -= (e.clientY - lastY) * 0.3;
            rotX = Math.max(-40, Math.min(40, rotX));
            lastX = e.clientX;
            lastY = e.clientY;
            bookEl.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";
        });

        document.addEventListener("mouseup", function () {
            if (!dragging) return;
            dragging = false;
            scene.style.cursor = "grab";
        });

        scene.addEventListener("touchstart", function (e) {
            dragging = true;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
            bookEl.style.transition = "transform 0.1s ease-out";
        }, { passive: true });

        document.addEventListener("touchmove", function (e) {
            if (!dragging) return;
            e.preventDefault();
            rotY += (e.touches[0].clientX - lastX) * 0.5;
            rotX -= (e.touches[0].clientY - lastY) * 0.3;
            rotX = Math.max(-40, Math.min(40, rotX));
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
            bookEl.style.transform = "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg)";
        }, { passive: false });

        document.addEventListener("touchend", function () {
            dragging = false;
        });
    }

    // ─── Event Listeners ───
    grid.addEventListener("click", function (e) {
        var spineEl = e.target.closest(".spine-wrapper");
        if (!spineEl || isDetailOpen) return;
        var idx = parseInt(spineEl.getAttribute("data-idx"));
        if (isNaN(idx)) return;
        openDetail(idx, spineEl);
    });

    document.addEventListener("click", function (e) {
        if (!isDetailOpen) return;
        // Close if clicking outside the detail view and the 3D book
        if (!e.target.closest(".book-detail-inline") && !e.target.closest(".spine-wrapper")) {
            closeDetail();
        }
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && isDetailOpen) {
            closeDetail();
        }
    });
```

- [ ] **Step 2: 빌드 후 전체 플로우 테스트**

```bash
cd ~/Projects/closed-circle && python scripts/build_site.py
```

브라우저에서 `docs/books.html`을 열어:
1. 책등 클릭 → 3D 회전으로 표지 노출
2. 인라인 상세 정보 표시 (제목, 저자, 줄거리, 키워드, 메타)
3. 3D 책 드래그 회전
4. ESC 또는 배경 클릭으로 닫기
5. 닫힌 후 stagger fade-in으로 그리드 복귀
6. 상세 뷰 열린 상태에서 플로팅 필터 숨겨지는지

- [ ] **Step 3: Commit**

```bash
git add static/books.js
git commit -m "feat: add 3D spine-to-cover transition and inline detail view"
```

---

### Task 6: build_site.py 수정 — books 데이터에 추가 필드 확인

**Files:**
- Modify: `scripts/build_site.py` (필요시)

- [ ] **Step 1: 현재 데이터 흐름 확인**

`build_site.py`는 이미 `books` 리스트에 `keywords`를 추가하고 (line 146), 전체 book dict를 템플릿에 전달함 (line 162). `publisher_desc`, `description`, `back_cover_url`, `size_width`, `size_height`, `size_depth`는 모두 원본 `books.json`에 포함.

**결론:** `build_site.py` 수정 불필요 — 템플릿에서 이미 모든 필드에 접근 가능.

- [ ] **Step 2: 빌드 검증**

```bash
cd ~/Projects/closed-circle && python scripts/build_site.py
```

`docs/books.html`에서 BOOKS JS 배열에 `desc`, `keywords`, `backCoverUrl` 등이 제대로 들어가 있는지 확인:

```bash
grep -c '"isbn"' docs/books.html
```

Expected: 약 40 (검증된 spine 있는 책 수)

- [ ] **Step 3: Commit (변경 있는 경우만)**

---

### Task 7: 빌드 출력 테스트

**Files:**
- Create: `tests/test_books_template.py`

- [ ] **Step 1: 빌드 출력 검증 테스트 작성**

```python
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
```

- [ ] **Step 2: 빌드 후 테스트 실행**

```bash
cd ~/Projects/closed-circle && python scripts/build_site.py && python -m pytest tests/test_books_template.py -v
```

Expected: 모두 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/test_books_template.py
git commit -m "test: add build output verification for books.html redesign"
```

---

### Task 8: 최종 통합 테스트 및 정리

**Files:**
- 전체 빌드 + 브라우저 테스트

- [ ] **Step 1: 전체 빌드**

```bash
cd ~/Projects/closed-circle && python scripts/build_site.py
```

- [ ] **Step 2: 전체 테스트 실행**

```bash
cd ~/Projects/closed-circle && python -m pytest tests/ -v
```

Expected: 모든 기존 테스트 + 새 테스트 PASS

- [ ] **Step 3: 브라우저 최종 확인**

`docs/books.html`에서:
1. 페이지 로드 시 hero 없이 바로 책등 그리드
2. 플로팅 필터(전체/JP/KR) 동작 + stagger 애니메이션
3. 책등 클릭 → 3D 회전 → 표지 노출 + 인라인 상세
4. 3D 책 드래그 회전
5. ESC/배경 클릭으로 닫기 → 그리드 복귀
6. 모바일 뷰포트에서 세로 스택 레이아웃

`docs/news.html`에서:
7. 출판사 필터 여전히 정상 동작

`docs/index.html`에서:
8. shelf viewer 변경 없이 정상 동작

- [ ] **Step 4: Commit all built files**

```bash
git add docs/
git commit -m "chore: rebuild site with books.html Stripe Press redesign"
```
