# 평적 매대 랜딩 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** index.html의 부채꼴 캐러셀을 서점 평적 매대 스타일로 교체한다.

**Architecture:** build_site.py에서 최신 10권에 배치 데이터(x%, y%, rotation, z_index)를 생성하고, templates/index.html이 이를 인라인 스타일로 렌더링한다. CSS는 기존 `.landing-*`/`.fan-*`/`.carousel-*` 를 제거하고 `.display-*` 스타일로 교체한다. 클릭 오버레이와 호버 효과는 인라인 JS로 처리한다.

**Tech Stack:** Python (Jinja2), vanilla CSS/JS, 정적 사이트

**Spec:** `docs/superpowers/specs/2026-03-18-flat-display-landing-design.md`

---

### Task 1: build_site.py — 배치 데이터 생성 로직 추가

**Files:**
- Modify: `scripts/build_site.py:79-90`

- [ ] **Step 1: recent_books 슬라이스를 10권으로 변경하고 배치 데이터 생성 함수 추가**

`build_site.py`의 `build()` 함수에서 기존 코드:

```python
recent_books = sorted(books, key=lambda b: b.get("pub_date", ""), reverse=True)[:5]
```

를 아래로 교체:

```python
recent_books = sorted(books, key=lambda b: b.get("pub_date", ""), reverse=True)[:10]

# 평적 매대 배치 데이터 생성
books_per_row = 5
for i, rb in enumerate(recent_books):
    row = i // books_per_row
    col = i % books_per_row
    base_x = col * 18 + 5
    base_y = row * 45 + 5
    rb["display_x"] = round(base_x + random.uniform(-3, 3), 1)
    rb["display_y"] = round(base_y + random.uniform(-3, 3), 1)
    mag = random.uniform(5, 12)
    rb["display_rotation"] = round(mag * random.choice([-1, 1]), 1)
    rb["display_z"] = random.randint(1, 10)
    rb["display_w"] = round((rb.get("size_width") or 128) * 0.75)
    rb["display_h"] = round((rb.get("size_height") or 188) * 0.75)
```

이 코드는 기존 `random.seed(42)` 이후에 실행되므로 `for b in books: b["gap"] = ...` 루프 **뒤**에 배치한다. `recent_books` 정렬/슬라이스도 기존 위치(라인 90)에서 그대로 교체한다.

- [ ] **Step 2: 빌드 테스트**

Run: `cd /Users/miles/Projects/closed-circle && python scripts/build_site.py`
Expected: 정상 빌드, "Built index.html" 출력

- [ ] **Step 3: 커밋**

```bash
git add scripts/build_site.py
git commit -m "feat: generate flat-display placement data for recent books"
```

---

### Task 2: templates/index.html — 매대 마크업으로 교체

**Files:**
- Modify: `templates/index.html` (전체 교체)

- [ ] **Step 1: 템플릿 전체를 평적 매대 마크업으로 교체**

`templates/index.html` 전체 내용을 아래로 교체:

```html
{% extends "base.html" %}
{% block title %}Closed Circle — 미스터리 신간 알리미{% endblock %}

{% block content %}
<section class="display-table">
    <div class="display-area">
        {% for book in recent_books %}
        <div class="display-book"
             style="left:{{ book.display_x }}%;top:{{ book.display_y }}%;width:{{ book.display_w }}px;height:{{ book.display_h }}px;transform:rotate({{ book.display_rotation }}deg);z-index:{{ book.display_z }}"
             data-title="{{ book.title }}"
             data-author="{{ book.author }}"
             data-publisher="{{ book.publisher }}"
             data-date="{{ book.pub_date }}"
             data-price="{{ '{:,}'.format(book.price) }}"
             data-link="{{ book.link }}"
             data-cover="{{ book.cover_url }}">
            <img src="{{ book.cover_url }}" alt="{{ book.title }}" loading="lazy">
        </div>
        {% endfor %}
    </div>
    <a href="books.html" class="landing-more">전체 신간 보기 &rarr;</a>
</section>

<!-- 오버레이 -->
<div class="display-overlay" id="display-overlay">
    <div class="display-overlay-content">
        <button class="display-overlay-close" id="overlay-close" aria-label="닫기">&times;</button>
        <img class="display-overlay-cover" id="overlay-cover" src="" alt="">
        <h3 class="display-overlay-title" id="overlay-title"></h3>
        <p class="display-overlay-author" id="overlay-author"></p>
        <p class="display-overlay-meta" id="overlay-meta"></p>
        <p class="display-overlay-price" id="overlay-price"></p>
        <a class="display-overlay-link" id="overlay-link" href="" target="_blank" rel="noopener">알라딘에서 보기 &rarr;</a>
    </div>
</div>
{% endblock %}

{% block scripts %}
<script>
(function () {
    var books = document.querySelectorAll(".display-book");
    var overlay = document.getElementById("display-overlay");
    var closeBtn = document.getElementById("overlay-close");

    books.forEach(function (book) {
        book.addEventListener("click", function () {
            document.getElementById("overlay-cover").src = book.dataset.cover;
            document.getElementById("overlay-cover").alt = book.dataset.title;
            document.getElementById("overlay-title").textContent = book.dataset.title;
            document.getElementById("overlay-author").textContent = book.dataset.author;
            document.getElementById("overlay-meta").textContent = book.dataset.publisher + " · " + book.dataset.date;
            document.getElementById("overlay-price").textContent = book.dataset.price + "원";
            var link = document.getElementById("overlay-link");
            link.href = book.dataset.link;
            overlay.classList.add("visible");
        });
    });

    function closeOverlay() {
        overlay.classList.remove("visible");
    }

    closeBtn.addEventListener("click", closeOverlay);
    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeOverlay();
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeOverlay();
    });
})();
</script>
{% endblock %}
```

- [ ] **Step 2: 빌드 후 docs/index.html 확인**

Run: `cd /Users/miles/Projects/closed-circle && python scripts/build_site.py`
Expected: "Built index.html" 출력. `docs/index.html`에 `.display-book` 요소들이 인라인 스타일과 함께 렌더링됨.

- [ ] **Step 3: 커밋**

```bash
git add templates/index.html docs/index.html
git commit -m "feat: replace fan carousel with flat-display template"
```

---

### Task 3: static/style.css — 캐러셀 스타일 제거 + 매대 스타일 추가

**Files:**
- Modify: `static/style.css:117-225` (landing 섹션 교체)

- [ ] **Step 1: 기존 랜딩 관련 CSS 제거**

`static/style.css`에서 아래 블록을 삭제 (라인 117~225):

```css
/* ─── Landing Page ─── */
/* ─── Landing Recent Books ─── */
.landing-recent { ... }
.fan-carousel { ... }
.fan-card { ... }
.fan-card:hover { ... }
.fan-card img { ... }
.fan-card.active img { ... }
.fan-card-info { ... }
.fan-card.active .fan-card-info { ... }
.fan-card-title { ... }
.fan-card-author { ... }
.fan-nav { ... }
.carousel-arrow { ... }
.carousel-arrow:hover { ... }
.landing-more { ... }
.landing-more:hover { ... }
```

- [ ] **Step 2: 매대 스타일 추가**

삭제한 자리에 아래 CSS를 삽입:

```css
/* ─── Flat Display (평적 매대) ─── */
.display-table {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 53px);
    padding: 3rem 2rem;
}

.display-area {
    position: relative;
    width: 100%;
    max-width: 980px;
    height: 400px;
    margin: 0 auto 2rem;
}

.display-book {
    position: absolute;
    border-radius: 3px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

@media (hover: hover) {
    .display-book:hover {
        transform: scale(1.05) rotate(0deg) !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        z-index: 50 !important;
    }
}

.display-book img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 3px;
    display: block;
}

.landing-more {
    display: inline-block;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--accent);
    transition: color var(--transition);
}

.landing-more:hover {
    color: var(--accent-hover);
}

/* ─── Display Overlay ─── */
.display-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
}

.display-overlay.visible {
    opacity: 1;
    pointer-events: auto;
}

.display-overlay-content {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
    max-width: 320px;
    width: 90%;
    position: relative;
    text-align: center;
}

.display-overlay-close {
    position: absolute;
    top: 0.5rem;
    right: 0.75rem;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    line-height: 1;
    transition: color var(--transition);
}

.display-overlay-close:hover {
    color: var(--text-primary);
}

.display-overlay-cover {
    width: 100%;
    border-radius: 8px;
    margin-bottom: 1rem;
}

.display-overlay-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    line-height: 1.4;
}

.display-overlay-author {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
}

.display-overlay-meta {
    font-size: 0.8125rem;
    color: var(--text-tertiary);
    margin-bottom: 0.25rem;
}

.display-overlay-price {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.75rem;
}

.display-overlay-link {
    display: inline-block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--accent);
}

.display-overlay-link:hover {
    color: var(--accent-hover);
}
```

- [ ] **Step 3: 모바일 반응형 추가**

`@media (max-width: 768px)` 블록 안에 추가:

```css
    .display-table {
        overflow-x: auto;
    }

    .display-area {
        height: 300px;
        min-width: 600px;
    }

    .display-book {
        transform: scale(0.6) !important;
    }
```

모바일에서 `.display-table`이 스크롤 컨테이너 역할을 하고, `.display-area`는 `min-width: 600px`로 고정하여 가로 스크롤 가능하게 한다. `height: 300px`로 absolute 자식 포함. 스케일은 스펙 기준 0.6배.

- [ ] **Step 4: 빌드 후 확인**

Run: `cd /Users/miles/Projects/closed-circle && python scripts/build_site.py`
Expected: 정상 빌드. `docs/static/style.css`에 `.display-*` 스타일 포함.

- [ ] **Step 5: 커밋**

```bash
git add static/style.css docs/static/style.css
git commit -m "feat: add flat-display CSS, remove carousel styles"
```

---

### Task 4: 브라우저 확인 + 미세 조정

**Files:**
- Possibly modify: `static/style.css`, `templates/index.html`, `scripts/build_site.py`

- [ ] **Step 1: 로컬에서 브라우저 확인**

Run: `open /Users/miles/Projects/closed-circle/docs/index.html`

확인 사항:
- 책 10권이 2줄로 자연스럽게 포개져 배치되는지
- 각 책의 크기가 실제 판형에 비례하는지
- 호버 시 살짝 떠오르는지 (scale + shadow)
- 클릭 시 오버레이가 표지 + 정보와 함께 뜨는지
- ESC / 바깥 클릭으로 오버레이 닫히는지
- "전체 신간 보기 →" 링크가 books.html로 가는지
- books.html이 기존대로 동작하는지 (책등 + 필터)

- [ ] **Step 2: 필요 시 미세 조정 후 커밋**

```bash
git add -A
git commit -m "fix: fine-tune flat-display layout and styling"
```

---

### Task 5: 최종 빌드 + 커밋

**Files:**
- Modify: `docs/` (빌드 결과물)

- [ ] **Step 1: 최종 빌드**

Run: `cd /Users/miles/Projects/closed-circle && python scripts/build_site.py`

- [ ] **Step 2: docs/ 변경사항 커밋**

```bash
git add docs/
git commit -m "chore: rebuild site with flat-display landing page"
```
