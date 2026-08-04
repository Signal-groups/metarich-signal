# 설계사 브랜딩 빌더 — 공식 스펙 문서

> **⚠ 2026-08-04 저장소 분리 안내**
> 브랜딩 빌더 코드는 `branding-studio/` 별도 프로젝트(향후 별도 저장소)로 이전됐다.
> 이 메인 저장소의 `app/branding-builder`는 리다이렉트 전용이며 더 이상 편집하지 않는다.
> 이 스펙 문서(제품 방향·기준·규칙)는 계속 유효하며 branding-studio 작업 시에도 참고한다.

> **이 문서가 유일한 진실 소스(Single Source of Truth)입니다.**
> Claude, Codex 모두 이 문서를 먼저 읽고 작업해야 합니다.
> 의문이 있으면 이 문서를 수정한 후 작업하세요.

---

## 0. 제품 방향 (Product Direction)

### 목표
> 보험 설계사가 **모바일 명함 → 개인 브랜딩 페이지**까지
> 디자인 지식 없이 스스로 만들 수 있는 **유료화 가능한 전문가 도구**

### 유료화 성립 조건 (품질 기준)
```
① 사진 1장 + 이름 + 전화번호만 입력해도 → 전문 디자이너 결과물처럼 나와야 함
② 첫 화면 열었을 때 5초 안에 "어떻게 쓰는지" 이해돼야 함
③ 완성된 명함/페이지를 카카오톡으로 보냈을 때 상대방이 "어디서 만들었어요?" 물어야 함
④ 설계사가 결과물을 본인 스스로 고칠 수 있어야 함 (전문가에게 의뢰 불필요)
```

### daperm 대비 포지셔닝
| | daperm | 우리 빌더 |
|--|--------|---------|
| 대상 | 모든 업종 (블로거, 자영업자) | **보험 설계사 전용** |
| 구조 | 업종 선택 → AI 작성 | **템플릿 × 컨셉** 2단계 → 보험 맥락 자동 생성 |
| 출력 | 랜딩페이지 | **모바일 명함 + 랜딩페이지** |
| 폰트/스타일 | 범용 (67종) | **보험/금융 검증된 6종만** |
| 수익 | 유료 | 유료 (메타리치 시그널그룹 내부 도구 or 외부 판매) |

---

---

## 0-B. 폰트 시스템 (Font System)

> daperm 67종 중 보험/금융 맥락에 검증된 6종만 채택.
> 설계사가 폰트를 고르면 제목/본문/숫자에 자동으로 최적 페어링 적용.

### 채택 폰트 6종과 페어링 규칙

```
┌─────────────────────────────────────────────────────────┐
│ 1. Pretendard (기본 · 전 템플릿 본문)                    │
│    → 한글 가독성 1위. IT/금융 표준. 기본값.              │
│    CDN: jsdelivr.net/gh/orioncactus/pretendard           │
│    페어링: 제목 900, 소제목 700, 본문 400                │
├─────────────────────────────────────────────────────────┤
│ 2. Noto Serif KR (신뢰/권위 · 연금·노후 템플릿)          │
│    → 명조체 → 전통·품격·무게감. 고액 자산가 타겟.        │
│    페어링: 제목만 Noto Serif, 본문은 Pretendard           │
├─────────────────────────────────────────────────────────┤
│ 3. IBM Plex Sans KR (데이터 · 보장분석 결과 페이지)       │
│    → 숫자 가독성 최고. 기업 보고서 느낌.                 │
│    페어링: 제목+본문 모두. 수치 강조에 700 weight.        │
├─────────────────────────────────────────────────────────┤
│ 4. Noto Sans KR (범용 · 친근한 상담/보험청구 템플릿)      │
│    → 구글 폰트. 가장 안전하고 읽기 편함.                 │
│    페어링: 전체 통일, 이모지 아이콘과 조합.               │
├─────────────────────────────────────────────────────────┤
│ 5. Playfair Display (영문 제목 · 럭셔리 다크 템플릿)      │
│    → 다크+골드 조합에만 사용. 영문 헤드라인 전용.         │
│    페어링: 영문 제목 Playfair + 한글 본문 Pretendard       │
├─────────────────────────────────────────────────────────┤
│ 6. Cormorant Garamond (초고급 · 연금 프리미엄 변형)       │
│    → Luxury Style 극단적 고급버전. 선택적 적용.           │
│    페어링: 영문 헤드라인만. 본문은 절대 사용 금지.         │
└─────────────────────────────────────────────────────────┘
```

### 컨셉별 자동 폰트 적용

```typescript
// types.ts에 이미 정의됨 - 컨셉 선택 시 자동 적용
const CONCEPT_FONTS: Record<LandingConcept, string> = {
  consult:    "'Pretendard', -apple-system, sans-serif",
  remodeling: "'Pretendard', -apple-system, sans-serif",
  pension:    "'Noto Serif KR', 'Pretendard', serif",
  product:    "'IBM Plex Sans KR', 'Pretendard', sans-serif",
  claim:      "'Noto Sans KR', sans-serif",
  recruit:    "'Pretendard', -apple-system, sans-serif",
  travel:     "'Noto Sans KR', sans-serif",
  retirement: "'Noto Serif KR', 'Pretendard', serif",
}
```

### 타이포그래피 품질 기준 (daperm 체크리스트 기반)

```css
/* 모든 템플릿에 강제 적용되는 기본값 */
:root {
  --font-size-hero: clamp(28px, 6vw, 48px);  /* 히어로 제목 */
  --font-size-h2: clamp(20px, 4vw, 32px);     /* 섹션 제목 */
  --font-size-h3: 18px;                        /* 카드 제목 */
  --font-size-body: 15px;                      /* 본문 */
  --font-size-small: 13px;                     /* 보조 텍스트 */
  --line-height-body: 1.75;                    /* 본문 줄간격 (daperm 기준 1.6~1.8) */
  --letter-spacing-tight: -0.02em;             /* 제목 자간 */
  --letter-spacing-wide: 0.08em;               /* 영문 태그 자간 */
}
```

---

## 0-C. 디자인 품질 기준 (Design Quality Standard)

### 60-30-10 컬러 법칙 (daperm 기준 채택)

```
배경 60% → 카드/섹션 배경
보조 30% → 헤더, 강조 박스, 카드 배경
포인트 10% → CTA 버튼, 수치 강조, 배지, 좌측 컬러 바
```

### 컨셉별 컬러 팔레트 (확정)

| 컨셉 | 배경(60%) | 보조(30%) | 포인트(10%) | 다크모드 여부 |
|------|---------|---------|-----------|------------|
| 보험상담 | `#ffffff` | `#0A1628` | `#2563eb` | 히어로만 다크 |
| 리모델링 | `#f8fafc` | `#0b1e5f` | `#d4af37` | 히어로만 다크 |
| 연금/노후 | `#0a0f1e` | `#1a2a4a` | `#c8a050` | 전체 다크 |
| 노후/은퇴 | `#0a0f1e` | `#1a2a4a` | `#c8a050` | 전체 다크 |
| 리쿠르팅 | `#0a0a0a` | `#1a1a1a` | `#f7d571` | 전체 다크 |
| 보험청구 | `#fff5f5` | `#ffffff` | `#FF5A5F` | 라이트 |
| 상품안내 | `#f8f9fc` | `#ffffff` | `#5B6EF5` | 라이트 |
| 여행/시책 | `#0f0c29` | `#1a1540` | `#667eea` | 전체 다크 |

### 카드 패턴 적용 기준 (daperm 16종 중 채택 5종)

```
Shadow Card    → 서비스 특징, 강점 소개
Minimal Line   → 보장 항목 나열 (좌측 컬러 바)
Stat Card      → 실적 수치 (상담수, 만족도, 절감액)
Review Card    → 고객 후기
CTA Card       → 상담신청 섹션 배경
```

### 여백 시스템 (daperm 기준 채택)

```css
.section { padding: 80px 0; }          /* 섹션 간 (최소 60px) */
.container { padding: 0 24px; max-width: 960px; }
.card { padding: 28px 24px; border-radius: 12px; }
p { line-height: 1.75; }
h2 { margin-bottom: 16px; letter-spacing: -0.02em; }
```

### UX 흐름 — "5초 이해" 원칙

```
1. 파일 열기
   → 즉시: 이름 입력 모달 (1개 필드)
   → 로그인 완료: 샘플 데이터로 채워진 미리보기 바로 보임

2. 좌측 탭
   → 1️⃣ 정보입력: 타이핑하면 우측 실시간 변경
   → 2️⃣ 템플릿: 클릭하면 즉시 적용

3. 편집
   → 우측 미리보기에서 클릭 → 바로 편집 가능
   → 섹션 위 마우스 → 삭제 버튼

4. 완성
   → ⬇ HTML 다운로드 → 카카오톡 공유
```

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| 목적 | 보험 설계사가 자신의 랜딩페이지·디지털 명함을 직접 만들고 공유할 수 있는 WYSIWYG 빌더 |
| 참고 사이트 | [daperm.com/builder-v2](https://daperm.com/builder-v2) — UI/UX 구조 동일하게 채택 |
| 경로 | `/branding-builder` (Next.js App Router) |
| 진입 | 대시보드 사이드바 "설계사 브랜딩 AI" 클릭 → 새 탭에서 열림 |
| 배포 | metarich-signal.vercel.app/branding-builder |

---

## 2. daperm과의 차이점 (보험 특화 항목)

daperm은 **모든 업종**용이고, 우리는 **보험 설계사 전용**이다.

| daperm | 우리 빌더 |
|--------|-----------|
| 회사명, 업종 | 이름, 직함, 소속사, 지점 |
| 일반 연락처 | 전화, 이메일, 팩스, 카카오 오픈채팅 URL, 상담 URL, 리쿠르팅 URL |
| SNS 5개 | 블로그, 인스타, 유튜브, 카페, 오픈채팅 |
| 일반 서비스 섹션 | 자격사항(AFPK·CFP 등), 상담분야 태그, 실적(상담수·만족도) |
| 발급(서브도메인) | HTML 다운로드 (서브도메인 발급은 추후) |
| 34개 일반 템플릿 | 보험 전용 4종 + 외부 템플릿 16종 + 모바일 명함 4종 |

---

## 3. 5단계 사이드바 구조 (daperm 동일)

```
┌─────────────────────────────────────────────┐
│  탭 레일 (왼쪽 아이콘 48px)                 │
│  1️⃣ 정보   2️⃣ 템플릿   3️⃣ 스타일           │
│  4️⃣ 섹션   5️⃣ 팁                          │
└─────────────────────────────────────────────┘
```

### 1단계 — 기본 정보 입력
모든 필드는 `oninput` 마다 미리보기에 즉시 반영된다.

```
[기본 정보]
- 이름 *
- 직함 (예: AFPK 재무설계사)
- 소속 회사 *
- 지점/팀
- 브랜드명 (예: 보험의 기준)

[연락처]
- 전화번호
- 이메일
- 팩스
- 카카오 오픈채팅 URL → 명함 💬 버튼에 연결
- 상담 신청 URL       → CTA 버튼에 연결
- 리쿠르팅 URL        → 리쿠르팅 템플릿 CTA에 연결

[SNS/채널]
- 네이버 블로그
- 인스타그램
- 유튜브
- 카페
+ 추가 버튼 (최대 5개까지)

[자격사항]  ← + 버튼으로 행 추가, × 삭제
- 입력칸 1개 (기본) + + 추가 버튼

[상담 분야]  ← 태그 칩 형태, + 버튼으로 추가
- 기본: 보장분석 / 보험 리모델링 / 실손보험 점검

[소개]
- 한줄 슬로건
- 자기소개 (textarea)

[실적]
- 누적 상담 수
- 고객 만족도
- 평균 절감액
```

### 2단계 — 템플릿 선택

> **핵심 설계 원칙: 템플릿(디자인) × 컨셉(목적) 2단계 선택**
>
> daperm은 업종만 선택한다. 우리는 **① 디자인 스타일** 먼저 선택, **② 컨셉/목적** 선택으로
> 조합이 결정되면 해당 조합에 맞는 콘텐츠를 자동 생성한다.

```
카테고리 탭: [🌐 랜딩페이지] [📱 모바일 명함]
```

---

#### A. 랜딩페이지

**① 템플릿 목록 펼치기 ▼ (daperm 방식 — 기본 접힌 상태)**

```
[보험 전용 4종] ← 직접 코드로 생성 (수정 금지 파일)
  - 다크 네이비 클래식  (ins-navy)
  - 블루 프로페셔널     (ins-blue)
  - 다크 퍼플 프리미엄  (ins-purple)
  - 그린 신뢰형         (ins-green)

[외부 업로드 템플릿 16종] ← public/branding-templates/template-01~16.html (수정 금지)
  각 파일에 editor-inject.js 삽입 → 편집 가능
```

**② 컨셉(목적) 선택** ← 템플릿 선택 후 바로 아래에 표시

```
보험상담      리모델링      연금/노후설계
상품안내      보험청구 도움  리쿠르팅(모집)
여행/시책      노후/은퇴설계
```

**컨셉별 자동 생성 콘텐츠:**

| 컨셉 | 히어로 헤드라인 | 주요 섹션 | CTA 버튼 |
|------|----------------|-----------|---------|
| 보험상담 | "내 보험, 지금 기준으로 다시 점검해보셨나요?" | 상담분야, 설계사 소개, 후기 | 무료 상담 신청 |
| 리모델링 | "보험료는 줄이고 보장은 채웁니다" | 리모델링 대상, 절차, 절감 사례 | 무료 점검 신청 |
| 연금/노후설계 | "은퇴 후 월 ○○만원, 지금 준비하세요" | 연금 종류, 노후 시뮬레이션, 상담 | 연금 상담 신청 |
| 상품안내 | "지금 꼭 알아야 할 보험 정보" | 상품 특징, FAQ, 가입 조건 | 상품 문의 |
| 보험청구 도움 | "청구 절차가 복잡하다면 도와드립니다" | 청구 가능 항목, 절차 안내, 서류 | 청구 도움 신청 |
| 리쿠르팅 | "혼자 영업하지 않는 설계사 조직" | 합류 혜택, 지원 시스템, 입사 후기 | 입사 지원 |
| 여행/시책 | "○○ 여행 시책 안내" | 조건, 목적지, 신청 방법 | 시책 신청 |
| 노후/은퇴설계 | "은퇴 후 삶, 지금부터 설계합니다" | 은퇴 설계 단계, 필요 보장 | 은퇴 설계 상담 |

---

#### B. 모바일 명함 (📱 MOBILE ONLY)

**참고 디자인: SLICE 앱 스타일** (첨부 이미지 참조)

```
명함 구조 (위→아래):
  1. 사진 영역      ← 전체폭 상단 / 원형 / 우측 반 선택
  2. 정보 카드      ← 배경색 + 이름/직함/회사/태그
  3. 연락처 행 목록  ← 휴대전화(📞💬💌) / 유선 / 이메일 / 홈 / 주소
  4. 강점 소개      ← 텍스트 + 4개 특징 그리드
  5. 하단 고정 CTA  ← 전화하기 + 카카오톡 버튼 (선택)
```

**명함 템플릿 6종:**

| ID | 이름 | 배경 | 사진 배치 | 참고 |
|----|------|------|---------|------|
| card-navy | 다크 네이비 전문형 | `linear-gradient(135deg,#0f4c81,#1e88e5)` | 상단 전체 | SLICE 기본 |
| card-green | 다크 그린 신뢰형 | `linear-gradient(160deg,#1a3c2e,#2d6a4f)` | 상단 전체 | HL손해보험 느낌 |
| card-black | 블랙 프리미엄 | `linear-gradient(135deg,#1a1a2e,#16213e)` | 우측 반 | 법률/전문직 느낌 |
| card-blue | 로얄 블루형 | `#2563eb` solid | 원형 중앙 | 은행/PB 느낌 |
| card-white | 화이트 클린형 | `#f8fafc` | 상단 전체 | 미니멀 |
| card-purple | 퍼플 프리미엄 | `linear-gradient(135deg,#4c1d95,#7c3aed)` | 우측 반 | 리쿠르팅 느낌 |

**연락처 행 아이콘 구조 (SLICE 방식):**
```
휴대전화  010-0000-0000     [💬카카오] [💌SMS] [📞전화]
유선전화  02-000-0000       [☎]
이메일    name@co.io        [>]
홈페이지  www.site.co.io    [>]
주소      서울시 강남구...   [📍]
```

**명함 전용 설정 패널 (컨셉 대신 스타일 설정):**
```
- 배경 색상 스와치 8종
- 사진 배치: 상단 전체 / 원형 / 우측 반
- 전문 태그 편집 (클릭 편집 + + 추가)
- 하단 고정 CTA 버튼: 표시/숨김
- 추가 연락처 입력 (카카오URL/SMS/유선/홈페이지/주소)
- 📷 프로필 사진 업로드
```

---

### 2단계 UI 흐름 — 템플릿 선택 상세

```
[랜딩페이지 탭]
│
├─ 📂 템플릿 목록 펼치기 ▼  (daperm과 동일, 기본 접힘)
│   ├─ [보험 전용] 다크 네이비 / 블루 프로페셔널 / 다크 퍼플 / 그린 신뢰형
│   └─ [업로드 템플릿] template-01 ~ 16 썸네일
│
└─ 템플릿 선택 후 → 컨셉 선택 패널 표시
    ┌──────────────────────────────────────┐
    │  🎯 어떤 목적의 페이지인가요?         │
    │  [보험상담] [리모델링] [연금/노후]    │
    │  [상품안내] [보험청구] [리쿠르팅]    │
    │  [여행/시책] [노후/은퇴설계]         │
    └──────────────────────────────────────┘
    컨셉 선택 → 미리보기 콘텐츠 자동 채움
    (1단계에서 입력한 기본 정보를 컨셉에 맞게 배치)

[모바일 명함 탭]
│
├─ 명함 스타일 6종 가로 스크롤 썸네일
│   (SLICE 이미지 참고 — 실제 명함 비율 미니어처)
│
└─ 스타일 선택 후 → 명함 설정 패널 (컨셉 없음, 스타일 직접 설정)
    - 배경색 / 사진배치 / 태그 / 연락처 링크
```

---

### 3단계 — 스타일 조정
```
- 메인 컬러 8종 스와치
- 폰트 선택 (Pretendard/Noto Sans KR/나눔고딕 등)
- 미리보기 폭 (960/1200/720px)
```

### 4단계 — 섹션 관리
```
- 현재 섹션 목록 (삭제 버튼)
- 섹션 추가: FAQ / 후기 / 상담신청폼 / 배너
```

### 5단계 — 미세조정 팁
```
- 텍스트 클릭 편집 안내
- 이미지 교체 안내
- 섹션 삭제 안내
- 모바일 확인 안내
- 저장/불러오기 안내
```

---

## 4. 상단 툴바 (daperm 동일 구조)

```
[로고] [사용자 배지] | [▶ 미리보기] [🖥PC 📱모바일] | [+ 섹션] [💾 저장] [📂 불러오기] | [✏️ 샘플 채우기] [🔄 초기화] [⬇ HTML 다운로드]
```

---

## 5. 미리보기 영역

```
┌──────────────────────────────────────────┐
│  [● ● ●]  🔒 랜딩페이지 미리보기         │
│  텍스트 클릭→편집 | 섹션 hover→삭제       │
├──────────────────────────────────────────┤
│                                          │
│   템플릿 렌더링 (contenteditable)         │
│   max-width: 960px (PC) / 390px (모바일) │
│                                          │
└──────────────────────────────────────────┘
```

---

## 6. 편집 기능 (daperm 미세조정과 동일)

### 6-1. 텍스트 직접 편집
- 모든 텍스트 요소: `contenteditable="true"`
- hover 시: 파란 점선 아웃라인 표시
- focus 시: 파란 실선 아웃라인 표시

### 6-2. 플로팅 툴바
텍스트 드래그 선택 시 상단에 등장:
```
[B] [I] [U] | [크기 select] | [색상 8종] | [✕ 닫기]
```
- ✕ 클릭 → 툴바 숨김
- ESC → 툴바 숨김

### 6-3. 섹션 컨트롤
섹션 hover 시 우측 상단:
```
[✕ 삭제]
```
- 삭제 시 `state.deletedSecs`에 id 기록 → re-render에도 유지

### 6-4. 이미지 교체
- 프로필 아바타 클릭 → 파일 업로드 dialog
- 명함 사진 영역 클릭 → 파일 업로드 dialog

---

## 7. 저장/불러오기 시스템

### 7-1. 로그인 모달
- 파일 열면 이름 입력 모달 표시
- 이름 = 저장 키 (localStorage: `branding3_{이름}_latest`)
- 이전 저장 데이터 감지 시 불러올지 선택

### 7-2. 저장 슬롯
- 사용자별 최대 5개 슬롯
- key: `branding3_{이름}_list`
- 슬롯 팝업: 날짜/이름 표시, 불러오기/삭제 버튼

---

## 8. 다운로드

- 저작권 동의 모달 (체크박스)
- 랜딩페이지: `{이름}_랜딩페이지.html`
- 모바일 명함: `{이름}_디지털명함.html`
- 다운로드 파일에 포함되는 것:
  - 편집 UI 제거 (`.sctrl {display:none}`, `contenteditable` attribute 제거)
  - 모바일 최적화 CSS (`viewport meta`, 반응형 미디어쿼리)
  - 외부 폰트 import (Pretendard CDN)

---

## 9. 파일 구조 (확정)

```
app/branding-builder/
  page.tsx                    ← 진입점 (Codex 담당)
  components/
    BrandingBuilderLayout.tsx  ← 전체 레이아웃 (Codex)
    Toolbar.tsx                ← 상단 툴바 (Codex)
    Sidebar.tsx                ← 사이드바 컨테이너 (Codex)
    TabRail.tsx                ← 좌측 아이콘 탭 (Codex)
    Preview.tsx                ← 미리보기 영역 (Codex)
    FloatingToolbar.tsx        ← 플로팅 툴바 (Codex)
    panels/
      InfoPanel.tsx            ← ⛔ 직접 관리 (필드 목록 확정됨)
      TemplatePanel.tsx        ← ⛔ 직접 관리 (템플릿 목록 확정됨)
      StylePanel.tsx           ← Codex
      SectionPanel.tsx         ← Codex
      TipPanel.tsx             ← Codex
    modals/
      LoginModal.tsx           ← Codex
      SaveSlotsModal.tsx       ← Codex
      DownloadModal.tsx        ← Codex
      AddSectionModal.tsx      ← Codex
  templates/
    types.ts                   ← ⛔ 직접 관리 (타입 정의)
    ins-card.ts                ← ⛔ 직접 관리 (보험 명함형 HTML)
    ins-consult.ts             ← ⛔ 직접 관리 (상담 전환형 HTML)
    ins-remo.ts                ← ⛔ 직접 관리 (리모델링형 HTML)
    ins-recruit.ts             ← ⛔ 직접 관리 (리쿠르팅형 HTML)
    card-builder.ts            ← ⛔ 직접 관리 (모바일 명함 렌더러)
    external-loader.ts         ← Codex (외부 HTML 로딩 + inject)
  hooks/
    useBrandingState.ts        ← Codex (전체 상태 관리)
    useSections.ts             ← Codex (섹션 추가/삭제)
    useSaveLoad.ts             ← Codex (localStorage 저장/불러오기)
    useEditable.ts             ← Codex (contenteditable 이벤트)

public/branding-templates/
  template-01.html ~ 16.html  ← ⛔ 절대 수정 금지
  editor-inject.js            ← ⛔ 절대 수정 금지
  manifest.json               ← 템플릿 메타 목록

lib/
  brandingTypes.ts            ← ⛔ 직접 관리
```

---

## 10. ⛔ Codex 절대 수정 금지 목록

```
public/branding-templates/template-01.html ~ template-16.html
public/branding-templates/editor-inject.js
app/branding-builder/templates/ins-card.ts
app/branding-builder/templates/ins-consult.ts
app/branding-builder/templates/ins-remo.ts
app/branding-builder/templates/ins-recruit.ts
app/branding-builder/templates/card-builder.ts
app/branding-builder/templates/types.ts
app/branding-builder/panels/InfoPanel.tsx
app/branding-builder/panels/TemplatePanel.tsx
app/dashboard/components/BrandingAIPageInner.tsx  ← 현재 작동 중인 파일
```

> **이유**: 보험 설계사 업무 맥락이 필요한 파일들. 코드 구조가 아닌 비즈니스 로직으로 결정되는 내용이므로 AI가 임의로 수정하면 안 됨.

---

---

## 10-B. daperm 디자인 가이드 — 채택 항목 (2026-06-01 분석)

> 출처: daperm.com/디자인 스타일 가이드
> 보험 설계사 맥락에 맞는 것만 선별 적용.

### 채택 — 컨셉별 스타일 매핑

| 컨셉 | 채택 스타일 | 핵심 CSS 포인트 |
|------|-----------|----------------|
| 보험상담 | Style 16 · Corporate | `border-top: 3px solid #0A1628`, 네이비+화이트, IBM Plex Sans |
| 리모델링 | Style 16 · Corporate | 좌측 컬러 바 카드, 데이터 표 구조 |
| 연금/노후 | Style 03 · Luxury | `background: #0a0f1e`, 골드 `#c8a050`, Playfair Display |
| 노후/은퇴 | Style 03 · Luxury | 골드 라인 구분자, 넓은 여백 |
| 리쿠르팅 | Style 09 · Dark Premium | `background: #0a0a0a`, 골드 그라데이션 텍스트 |
| 보험청구 도움 | Style 05 · Warm | `border-radius: 14~20px`, 파스텔, 이모지 아이콘 |
| 상품안내 | Style 04 · Modern SaaS | 메트릭 카드 3열, `#5B6EF5` 포인트 |
| 여행/시책 | Style 11 · Gradient Mesh | 다크배경 + radial-gradient blob |

### 채택 — 60-30-10 컬러 법칙

모든 템플릿의 색상 구조를 이 비율로 설계한다:
```
60% — 배경 (흰색 or 다크 배경)
30% — 보조색 (카드, 헤더 배경)
10% — 포인트 (CTA 버튼, 강조 수치, 배지)
```
→ `StylePanel.tsx`에 60-30-10 미리보기 UI 포함할 것.

### 채택 — 폰트 페어링 (보험 맥락)

| 용도 | 채택 폰트 | 이유 |
|------|---------|------|
| 기본 본문 (전 템플릿) | Pretendard | 한글 가독성 1위, IT/금융 표준 |
| 프리미엄 제목 (연금/럭셔리) | Noto Serif KR | 전통+품격, 명조체 신뢰감 |
| 영문 제목 (리쿠르팅/다크) | Playfair Display | 럭셔리 세리프, 골드와 조합 |
| 데이터/수치 (보장분석) | IBM Plex Sans | 기업 데이터 표준, 숫자 가독성 |

### 채택 — 카드 패턴 (보험 특화)

| 카드 패턴 | 사용처 |
|---------|------|
| Minimal Line (좌측 컬러 바) | 보장 항목 나열, 체크리스트 |
| Stat Card (숫자 강조) | 누적 상담 수, 만족도, 절감액 |
| Review Card | 고객 후기 섹션 |
| Shadow Card | 일반 서비스 카드, 특징 3가지 |
| CTA Card | 상담신청 섹션 배경 |

### 채택 — 체크리스트 (팁 패널에 포함)

5단계 팁 패널에 다음 체크리스트를 추가한다:
```
타이포그래피: 폰트 2-3종 이내 / 본문 줄간격 1.6~1.8
컬러: 메인 3색 이하 / 포인트는 CTA에만
레이아웃: 섹션 여백 60px+ / 카드 내부 24px+
인상: 3초 안에 핵심 메시지 / CTA 눈에 띄게
```

### 버린 스타일 (보험 맥락 부적합)

Brutalist, Cyberpunk/Neon, Retro/Vintage, Scandinavian, Magazine Bento, Neumorphism, Glassmorphism (부차적 효과로만 제한적 사용)

---

## 11. 현재 상태 (2026-06-03 기준, 최종 업데이트)

| 항목 | 상태 |
|------|------|
| `/branding-builder` 라우트 | ✅ 배포됨 · 모듈 구조 완성 |
| `types.ts` 폰트·팔레트 데이터 | ✅ 6종 폰트 + CONCEPT_PALETTES 완성 |
| 전체 모듈 구조 (22개 파일) | ✅ tsc + ESLint 통과 |
| `InfoPanel.tsx` | ✅ 직접 관리 완성 (전 필드) |
| `TemplatePanel.tsx` | ✅ 직접 관리 완성 (2단계 선택) |
| `ins-navy / ins-blue / ins-purple / ins-green` | ✅ 보험 전용 4종 HTML 렌더러 완성 |
| `card-builder.ts` | ✅ SLICE 스타일 명함 HTML 생성기 완성 |
| `Preview.tsx` | ✅ ins-* iframe srcDoc · ext-* iframe src · card iframe 분기 |
| AI 카피 생성 (TipPanel) | ✅ 프롬프트 자동 생성 + 복사 버튼 |
| 저장/슬롯 시스템 | ✅ saveQuick + saveToSlot · localStorage |
| FloatingToolbar | ✅ B/I/U + 크기 + 색상 8종 |
| 모달 4종 | ✅ Login · SaveSlots · AddSection · Download |
| DownloadModal iframe 대응 | 🔲 진행 중 (Codex 작업 중) |
| `FinancialCalc.tsx` truncation | 🔲 진행 중 (Codex 작업 중) |
| Supabase 저장 연동 | 🔲 미착수 (TODO 주석 위치 확보) |
| 서브도메인 발급 | 🔲 미착수 |

---

## 12. Codex에게 작업 요청할 때 템플릿

```
BRANDING_BUILDER_SPEC.md를 읽고 작업해.

금지 파일 목록(섹션 10)은 절대 수정하지 마.

작업 범위: [여기에 구체적인 작업 내용]

예시:
- "useBrandingState.ts 훅을 작성해. 상태 구조는 스펙 3~7단계를 따라."
- "Toolbar.tsx를 스펙 4번 구조대로 만들어."
- "FloatingToolbar.tsx — B/I/U/크기/색상/✕ 버튼 포함."
```
