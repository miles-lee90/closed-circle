# 3D Book Stack UX Improvement Spec

**Date:** 2026-03-28
**Status:** Approved
**Scope:** books.html (index.html) 3D 책 스택 뷰 개선

---

## 1. 스크롤 성능 — 6면 → 3면 축소

### 현재 문제
40권 x 6면 = 240개 3D 요소. 빠른 스크롤 시 이미지 깨짐/끊김 발생.

### 해결
- **스택 뷰에서 3면만 렌더링**: 앞표지(front), 뒷표지(back), 책등(spine)
- top, bottom, fore-edge는 템플릿에서 제거
- **상세 뷰 진입 시 6면 복원**: `openDetail()`에서 나머지 3면(top, bottom, fore-edge)을 동적 생성하여 `book-item`에 추가
- `closeDetail()` 시 동적 생성한 면 제거

### 수정 파일
- `templates/books.html`: top/bottom/fore-edge div 제거
- `static/books.js`: openDetail에서 3면 동적 생성, finishClose에서 제거
- `static/style.css`: 불필요한 face 스타일 정리 (필요시)

---

## 2. Hover 피드백 — 회전 + scale + shadow

### 현재 동작
책등에 마우스 올리면 `translateX(-35px)`로 밀리기만 함.

### 개선
- hover 시 **살짝 회전하여 앞표지 일부 노출** (rotateZ 미세 조정으로 표지 엿보기)
- 동시에 **scale(1.05)** + **box-shadow 강화**
- CSS transition으로 부드럽게 전환 (0.3s ease)
- 기존 `.book-slide.hovered .book-item` transform 교체

### 수정 파일
- `static/style.css`: `.book-slide.hovered .book-item` transform 값 변경, box-shadow 추가

---

## 3. 시각적 깊이감 — 조명 + 그림자

### 현재 상태
플랫한 텍스처, 그림자 없음.

### 개선
- **책등에 상단→하단 조명 그라데이션**: `linear-gradient(to bottom, rgba(255,255,255,0.08), transparent 40%, rgba(0,0,0,0.15))` 오버레이
- 책등 spine face에 `::after` pseudo-element로 적용 (이미지 위에 오버레이)
- **스택 간 그림자**: 각 `.book-item`에 `drop-shadow` 또는 `box-shadow` 추가
- CSS만으로 구현, JS 변경 없음

### 수정 파일
- `static/style.css`: `.book3d-spine::after` 추가, `.book-item` shadow 추가

---

## 4. 진입 애니메이션 — 위→아래 stagger drop

### 현재 동작
페이지 로드 시 모든 책이 동시에 나타남.

### 개선
- 각 `.book-slide`에 초기 상태: `opacity: 0` (transform은 preserve-3d와 충돌하므로 opacity만 사용)
- `@keyframes dropIn` 애니메이션 정의: `from { opacity: 0 }` → `to { opacity: 1 }`
- IntersectionObserver로 뷰포트 진입 시 `.visible` 클래스 추가하여 애니메이션 트리거
- 각 책 간 **stagger delay 80ms** (`animation-delay`로 적용)
- 첫 화면의 책들은 JS에서 순차적으로 delay 부여, 스크롤로 나타나는 책은 IntersectionObserver 트리거

### 수정 파일
- `static/style.css`: `.book-slide` 초기 상태 + `.book-slide.visible` 전환 스타일
- `static/books.js`: IntersectionObserver 설정, 초기 로드 시 stagger delay 로직

---

## 5. 책 간격/겹침 — 동적 계산

### 현재 문제
`margin-top: -270px` 고정. 책 높이(413px~462px)에 따라 가려지는 비율이 달라짐.

### 해결
- 각 책의 렌더링 높이(`bh`)에서 **30%만 노출**되도록 margin-top 계산
- 공식: `margin-top = -(bh * 0.7)` (70% 겹침, 30% 노출)
- **Jinja2 템플릿에서 인라인 스타일로 계산** → JS 불필요
- CSS의 `.book-slide + .book-slide { margin-top: -270px }` 제거

### 수정 파일
- `templates/books.html`: `book-slide`에 `style="margin-top: -{{ (bh * 0.7)|int }}px"` 추가 (첫 번째 제외)
- `static/style.css`: 고정 margin-top 규칙 제거

---

## 6. 원근감/카메라 앵글 — 스크롤 연동 부활

### 배경
이전에 매 스크롤 이벤트마다 perspectiveOrigin을 변경했으나 240개 요소 재계산으로 성능 문제 발생. 6면 → 3면 축소(#1)로 근본 원인 해결.

### 구현
- `updatePerspOrigin()` 함수 복원
- **rAF throttle 적용**: `requestAnimationFrame`으로 프레임당 1회로 제한
- `window.addEventListener("scroll", ..., { passive: true })`
- perspective-origin을 뷰포트 중심 기준으로 계산 (기존 코드 재사용)

### 수정 파일
- `static/books.js`: perspectiveOrigin 스크롤 연동 코드 추가 (rAF throttle)
- `static/style.css`: `.book-persp-wrapper` perspective-origin 초기값 유지

---

## 구현 순서 (의존성 기반)

1. **스크롤 성능 (#1)** — 다른 모든 개선의 기반. 면 수 줄여야 이후 작업이 의미 있음.
2. **원근감 (#6)** — #1 완료 후 바로 테스트 가능
3. **책 간격 (#5)** — 템플릿 변경, 독립적
4. **시각적 깊이감 (#3)** — CSS only, 독립적
5. **Hover 피드백 (#2)** — CSS transform 변경, #3과 함께 시각 테스트
6. **진입 애니메이션 (#4)** — 마지막에 추가 (다른 것들이 안정된 후)

---

## 범위 외 (이번 스펙에서 제외)

- 상세 뷰 디자인 변경
- 검색 UX 변경
- 뉴스 페이지 개선
- 모바일 터치 최적화 (반응형 CSS는 기존 유지)
