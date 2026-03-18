# 평적 매대 랜딩 페이지 디자인

## 개요

index.html 메인 페이지의 부채꼴 캐러셀을 서점 평적(平積) 매대 스타일로 교체한다. 책 표지가 위를 향하게 테이블 위에 자연스럽게 흩어놓은 느낌으로, 최신 신간 10권을 실제 판형 비율로 보여준다.

## 변경 범위

- **index.html만 수정** — 캐러셀 → 평적 매대
- **books.html 변경 없음** — 책등 뷰 + JP/KR 필터 그대로 유지

## 레이아웃

### 배치 규칙

| 항목 | 값 |
|------|---|
| 표시 권수 | 최신 10권 (pub_date 기준, 부족 시 있는 만큼 표시) |
| 책 크기 | 실제 판형 비율 반영. 스케일: `height_px = size_height * 0.75`, `width_px = size_width * 0.75`. 예: 128×188mm → 96×141px |
| 이미지 | 알라딘 cover_url (표지 이미지) |
| 회전 범위 | 크기 5~12°, 부호 랜덤 (0~4° 범위는 사용하지 않음) |
| 겹침 | 가장자리 20~40% 포개짐 — 표지 대부분은 보이게 |
| 배치 형태 | 중앙에 모여서 2줄로 자연스럽게 분포 |
| z-index | 책별로 1~10 랜덤 배정. 호버 시 50으로 변경 |
| 그림자 | `0 4px 12px rgba(0,0,0,0.35)` — 호버 시 `0 8px 24px rgba(0,0,0,0.5)` |
| 배경 | 기존 다크 테마 유지 |
| 필터 | 없음 |
| 하단 링크 | "전체 신간 보기 →" → books.html |

### 컨테이너

- 너비: `max-width: 980px` (기존 bookshelf와 동일), 좌우 `margin: 0 auto`
- 높이: `min-height: calc(100vh - 53px)` — 뷰포트 채움
- 책 배치 영역: 컨테이너 내부에 `position: relative`인 래퍼, 높이는 2줄분 (약 400px)

### 배치 알고리즘

build_site.py에서 seed 고정 랜덤으로 각 책의 배치 데이터를 생성한다. **좌표는 %로 생성**하여 컨테이너 크기에 반응하도록 한다:

```
books_per_row = 5
for i, book in enumerate(recent_books):
    row = i // books_per_row          # 0 또는 1
    col = i % books_per_row           # 0~4

    # 기본 그리드 위치 (%)
    base_x = col * 18 + 5             # 5%, 23%, 41%, 59%, 77%
    base_y = row * 45 + 5             # 5%, 50%

    # 랜덤 오프셋 (%) — 겹침 유도
    x = base_x + random.uniform(-3, 3)
    y = base_y + random.uniform(-3, 3)

    # 회전: 크기 5~12°, 부호 랜덤
    mag = random.uniform(5, 12)
    rotation = mag * random.choice([-1, 1])

    # z-index: 랜덤
    z_index = random.randint(1, 10)
```

각 열의 간격(18%)이 책 너비(약 10~12%)보다 좁아 가장자리가 자연스럽게 겹친다.

## 인터랙션

### 호버

- `scale(1.05)` + 그림자 강화 (`0 8px 24px rgba(0,0,0,0.5)`)
- `z-index: 50`으로 변경 (헤더 z-index: 100 아래)
- `transition: transform 0.3s ease, box-shadow 0.3s ease, z-index 0s`

### 클릭 → 확대 오버레이

- 클릭 시 반투명 배경 오버레이 (`rgba(0,0,0,0.8)`, `z-index: 200`) 표시
- 표지 이미지 크게 확대 + 상세 정보:
  - 제목
  - 저자
  - 출판사 · 출간일
  - 가격
  - 알라딘 링크 (외부 링크)
- 닫기: 오버레이 바깥 클릭, 닫기 버튼, ESC 키

### 모바일 (≤768px)

- 배치 영역 가로 스크롤 (`overflow-x: auto`) 또는 1줄 배치로 변경
- 호버 효과 없음 (터치 디바이스) — 바로 탭하면 오버레이 열기
- 책 크기 스케일 0.6배로 축소

## 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `templates/index.html` | 캐러셀 마크업/스크립트 → 평적 매대 마크업 + 오버레이 + 인터랙션 스크립트 |
| `static/style.css` | `.landing-*`, `.fan-*`, `.carousel-*` 스타일 → `.display-*` 매대 스타일 |
| `scripts/build_site.py` | `recent_books` 10권, 각 책에 배치 데이터(x%, y%, rotation, z_index) 생성 |
| `docs/` | 빌드 결과물 반영 |

## 레퍼런스

브레인스토밍 시 공유된 이미지: 카드/전단지가 테이블 위에 자연스럽게 포개져 놓인 형태. 회전은 중간 정도(±5~12°), 가장자리 겹침, 유기적이되 정돈된 느낌.
