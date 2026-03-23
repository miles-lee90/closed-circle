# books.html Stripe Press 스타일 리디자인

## 개요

books.html을 Stripe Press(https://press.stripe.com/) 스타일로 리디자인한다. 기본 뷰는 책등(spine) 그리드를 유지하되, 클릭 시 3D 회전으로 표지를 노출하고 인라인으로 상세 정보를 표시하는 SPA 방식.

## 결정 사항

- **기본 뷰**: 책등 그리드 (hero 섹션 제거, 바로 그리드)
- **클릭 인터랙션**: spine → 3D 책 회전 → 표지 노출 → 인라인 상세 (SPA)
- **필터**: 좌측 하단 플로팅 glass pill (전체/JP/KR)
- **데이터 범위**: spine 이미지 있는 JP/KR 책만 (현행 유지, 약 40권)
- **기존 book/{isbn}.html 상세 페이지**: 유지하되 books.html에서는 사용하지 않음

## 1. 기본 상태: 책등 그리드

### 레이아웃
- `display: flex; flex-wrap: wrap; align-items: flex-end` (하단 정렬)
- 각 spine의 높이/너비는 실제 책 치수(`size_height`, `size_depth`) 기반으로 계산 (현행 로직 유지)
- 간격: spine 간 소량의 gap (현행 `margin-right` 방식 유지)
- hero 섹션 제거 — 페이지 로드 시 바로 책등 그리드 표시
- `max-width: 1280px`, 중앙 정렬

### 호버
- `filter: brightness(0.7)` (현행 유지)
- `cursor: pointer`

### 국적 뱃지
- spine 하단 중앙에 작은 원형 dot (JP: `#ff375f`, KR: `#30d158`) — 현행 유지

## 2. 클릭 트랜지션: 3D 회전

### 단계 (총 약 0.6s)

**Phase 1 — Spine → 3D 책 변환 (즉시)**
- 클릭한 spine의 2D `<img>`를 6면체 3D 책(`book3d`)으로 교체
- 6면체 구성: 표지(front), 뒷표지(back), 책등(spine), 앞면(fore), 위(top), 아래(bottom)
- 초기 상태: rotateY(-90deg) — 책등 면이 보이는 상태 (원래 spine 위치와 동일하게 보임)
- 치수: `size_width * 2.2`, `size_height * 2.2`, `size_depth * 2.2` (book_detail.html과 동일 스케일)

**Phase 2 — 회전 + Fade (0.6s)**
- 3D 책이 rotateY(-90deg → -20deg) 애니메이션 — 표지 면이 약간 비스듬하게 보이는 자연스러운 각도
- 동시에 rotateX(0 → 5deg) — 약간의 수직 틸트
- 동시에 나머지 모든 spine이 opacity → 0으로 fade out
- 3D 책이 화면 중앙-좌측으로 이동 (transform + position 애니메이션)
- `perspective: 1200px` (book_detail.html과 동일)

**Phase 3 — 상세 정보 Fade-in (0.3s, Phase 2 완료 후)**
- 3D 책 우측에 상세 정보가 fade-in

### 역순 (닫기)
- 트리거: 배경 클릭 또는 ESC 키
- Phase 3 역순 → Phase 2 역순 → Phase 1 역순
- 상세 정보 fade-out → 나머지 spine fade-in + 3D 책이 rotateY(-20deg → -90deg) → 3D 책을 원래 spine 이미지로 교체

## 3. 상세 뷰 (인라인)

### 레이아웃
- 가로 배치: 좌측 3D 책 뷰어 + 우측 상세 정보
- book_detail.html의 `hero-feature-inner` 레이아웃 재활용

### 3D 책 뷰어
- book_detail.html의 `book3d-scene` 그대로 인라인에 삽입
- **드래그로 자유 회전 가능** (mousedown/mousemove/mouseup + touch 이벤트)
- 6면체: 표지, 뒷표지, 책등, 앞면(종이 텍스처), 위/아래(종이 텍스처)
- 초기 각도: rotateX(5deg) rotateY(-20deg) — 표지가 비스듬하게 보이는 상태

### 상세 정보 (우측)
- 국적 라벨: "일본 미스터리" / "한국 미스터리" (pill badge)
- 제목 (hero-title 스타일)
- 저자
- 줄거리 (`publisher_desc` 또는 `description` fallback)
- 키워드 태그 (있는 경우)
- 메타: 출판사 · 출간일 · 가격 · 알라딘 링크

### 데이터 전달
- 빌드 시 Jinja로 모든 책 데이터를 JS 배열(`BOOKS`)에 주입
- 각 spine 요소에 `data-idx` 속성으로 배열 인덱스 연결
- 클릭 시 JS에서 해당 데이터를 읽어 상세 뷰 DOM 생성

## 4. 플로팅 필터

### 위치/스타일
- `position: fixed; bottom: 24px; left: 24px`
- Glass morphism: `background: rgba(0,0,0,0.7); backdrop-filter: blur(12px)`
- `border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 3px`
- 3개 pill: 전체 / JP / KR

### 동작
- 활성 pill: `background: rgba(255,255,255,0.15); color: #fff`
- 비활성 pill: `color: #86868b`
- 필터 전환 시 spine들 stagger fade 애니메이션 (순차적으로 나타남)
- **상세 뷰가 열린 상태에서는 필터 숨김** (`opacity: 0; pointer-events: none`)

### z-index
- 필터: `z-index: 50` (header 아래, spine 위)

## 5. 반응형

### 데스크톱 (>768px)
- spine 그리드: flex-wrap, 자연스러운 줄바꿈
- 상세 뷰: 좌(3D 책) + 우(정보) 가로 배치
- 플로팅 필터: 좌하단

### 모바일 (≤768px)
- spine 그리드: gap 축소, 더 빽빽하게
- 상세 뷰: 세로 스택 — 3D 책(위, scale 0.75) + 정보(아래)
- 플로팅 필터: 동일 위치, 크기 유지
- 3D 책 뷰어: touch 이벤트로 드래그 회전 지원

## 6. 파일 변경 범위

### 수정 파일
- `templates/books.html` — 템플릿 전면 재작성
- `static/style.css` — bookshelf/spine/cover-reveal 관련 CSS 교체, 3D 전환 CSS 추가
- `static/filter.js` — 팝업 로직 제거, 3D 전환 + 인라인 상세 + 플로팅 필터 로직으로 교체
- `scripts/build_site.py` — books 데이터를 JS 배열로 주입하도록 수정 (keywords, publisher_desc 등 추가 필드)

### 제거
- `.cover-reveal` 관련 CSS/JS (팝업 방식 제거)
- `.hero` 섹션 (books.html용)
- 기존 `filter.js`의 spine 클릭 팝업 로직

### 유지
- `book/{isbn}.html` 상세 페이지들 (독립적으로 접근 가능)
- `book_detail.html` 템플릿
- 3D 책 CSS (`book3d-*` 클래스들)
- index.html의 shelf viewer (별도 페이지)

### 주의 사항
- `filter.js`는 `news.html`의 `#news-list` 필터도 담당하고 있음. books.html용 JS를 별도 파일로 분리하거나, 공용 필터 로직은 유지해야 함
- `.hero-label-kr` CSS 클래스가 style.css에 정의되어 있지 않음 (기존 버그). 인라인 상세에서 한국 미스터리 라벨을 표시하려면 `--badge-kr` 색상으로 스타일 추가 필요
- 줄거리 fallback 순서: `publisher_desc` → `description` (데이터에 `summary` 필드는 존재하지 않음)

## 7. 기술 참고

### 3D 책 CSS (기존 코드 재활용)
```css
.book3d-scene { perspective: 1200px; cursor: grab; }
.book3d { position: relative; transform-style: preserve-3d; }
.book3d-face { position: absolute; backface-visibility: visible; overflow: hidden; }
.book3d-front { border-radius: 0 3px 3px 0; box-shadow: 2px 0 8px rgba(0,0,0,0.3); }
.book3d-paper { /* 종이 텍스처 */ }
```

### 애니메이션 타이밍
- spine → 3D 변환: 즉시
- 3D 회전: `0.6s cubic-bezier(0.25, 0.1, 0.25, 1)`
- 나머지 fade: `0.4s ease` (0.1s 딜레이)
- 상세 정보 fade-in: `0.3s ease` (Phase 2 완료 후)
- 닫기: 역순, 동일 타이밍
