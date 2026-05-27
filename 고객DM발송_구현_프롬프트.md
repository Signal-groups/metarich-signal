# 고객 DM 카드 발송 페이지 구현

## 목표
`/app/crm/dm-cards/page.tsx` 신규 페이지를 생성해서 아래 5가지 DM 카드 생성 기능을 구현한다. Canvas API로 PNG 이미지를 생성하고 다운로드할 수 있게 한다.

---

## 프로젝트 현황

**경로**: `C:\Users\hoo\Documents\metarich-signal-projec\insurance-manager`
**프레임워크**: Next.js 15 (App Router) + TypeScript + Tailwind
**Supabase**: `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 존재

**참고할 기존 파일**:
- Canvas 이미지 생성 로직: `/app/crm/content-studio/page.tsx` (765줄) — Canvas 1080px 기준, 폰트/색상/레이아웃 처리 방식 그대로 참고
- 기존 DM 페이지: `/app/crm/dm/page.tsx` (181줄) — Supabase 인증, dm_logs 저장 패턴 참고
- 사이드바 링크: `/app/dashboard/components/Sidebar.tsx` — "고객 DM 발송" 항목이 `/crm/dm`으로 연결됨

**기존 content-studio Canvas 스펙**:
- 캔버스 너비: 1080px
- 모드: instagram(1080×1350), dm(1080×1920)
- 폰트: pretendard, serif, bold, round
- 색상 프리셋 7종: 보라/골드/그린/블루/핑크/화이트/블랙
- 한국어 폰트: `new FontFace()` API로 동적 로드

---

## 구현할 기능 5가지

### 1. 카드뉴스 템플릿 (실시간 뉴스 기반 PNG)

**동작 방식**:
1. 뉴스 카테고리 체크박스 표시 (경제, 보험, 건강, 부동산, 연금)
2. "뉴스 불러오기" 클릭 → 서버 API 라우트를 통해 RSS 피드 파싱
3. Canvas에 뉴스 카드 이미지 렌더링 → PNG 다운로드 + 텍스트 복사

**뉴스 RSS API 라우트 생성** (`/app/api/news-rss/route.ts`):
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || 'economy'
  
  const RSS_MAP: Record<string, string> = {
    economy: 'https://rss.hankyung.com/economy.xml',
    finance: 'https://rss.mt.co.kr/mt_news1.xml',
    health: 'https://rss.chosun.com/site/data/rss/rss.xml',
  }
  
  const url = RSS_MAP[category] || RSS_MAP.economy
  const res = await fetch(url, { next: { revalidate: 3600 } })
  const xml = await res.text()
  
  const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].slice(0, 5).map(m => {
    const title = m[0].match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] 
      || m[0].match(/<title>(.*?)<\/title>/)?.[1] || ''
    const link = m[0].match(/<link>(.*?)<\/link>/)?.[1] || ''
    return { title: title.trim(), link: link.trim() }
  })
  
  return Response.json({ items })
}
```

**Canvas 카드 레이아웃**:
- 상단 헤더: 브랜드명 + 오늘 날짜 (배경색 선택)
- 중앙: 카테고리별 뉴스 목록 (각 뉴스 2줄)
- 하단 푸터: 설계사 이름 + 연락처 워터마크

---

### 2. 오늘의 운세 카드

**동작 방식**:
1. 12간지 선택 버튼 (자/축/인/묘/진/사/오/미/신/유/술/해)
2. 날짜 기반 시드로 운세 텍스트 자동 선택 (API 불필요)
3. Canvas 카드 렌더링 → PNG 다운로드

**운세 텍스트** (하드코딩, 12간지 × 7개씩 = 84개):
```typescript
const FORTUNE_TEXTS: Record<string, string[]> = {
  자: ['오늘은 새로운 시작에 좋은 날입니다. 과감한 결정이 좋은 결과를 가져올 것입니다.', ...],
  축: [...],
  인: [...],
  // ...12간지 전부
}
const todayIndex = new Date().getDate() % 7
const fortune = FORTUNE_TEXTS[selectedZodiac][todayIndex]
```

**카드 디자인**: 배경 그라디언트 + 간지 한자 크게 + 운세 텍스트 + 설계사 브랜드

---

### 3. 기념일/축하 카드 6종

**6가지 타입**: 생일 / 결혼기념일 / 보험 계약기념일 / 명절 / 새해 인사 / 감사 인사

**동작 방식**:
1. 카드 종류 선택 (6개 버튼)
2. 수신자 이름 입력 (선택사항)
3. Canvas 카드 생성 → PNG 다운로드

**텍스트 템플릿**:
```typescript
const CARD_TEMPLATES = {
  birthday: {
    title: '🎂 생일을 진심으로 축하드립니다',
    body: '{{name}}님의 특별한 날을 함께 기뻐합니다.\n늘 건강하고 행복하시길 바랍니다.',
    bgColor: '#db2777',
  },
  anniversary: {
    title: '💍 결혼기념일을 축하드립니다',
    body: '{{name}}님 가정에 늘 사랑이 가득하시길 바랍니다.',
    bgColor: '#7c3aed',
  },
  contract: {
    title: '📋 계약기념일을 축하드립니다',
    body: '{{name}}님과 함께한 소중한 시간에 감사드립니다.\n앞으로도 든든한 파트너가 되겠습니다.',
    bgColor: '#1d4ed8',
  },
  holiday: {
    title: '🎊 명절을 축하드립니다',
    body: '{{name}}님 가정에 건강과 행복이 가득하시길 바랍니다.',
    bgColor: '#b45309',
  },
  newyear: {
    title: '🎆 새해 복 많이 받으세요',
    body: '새해에는 {{name}}님의 모든 소망이 이루어지길 기원합니다.',
    bgColor: '#065f46',
  },
  thanks: {
    title: '🙏 감사합니다',
    body: '{{name}}님의 소중한 신뢰에 항상 감사드립니다.\n언제나 최선을 다하겠습니다.',
    bgColor: '#374151',
  },
}
```

---

### 4. 오늘의 명언 카드

**동작 방식**:
1. 날짜 기반으로 명언 자동 선택 (API 불필요)
2. Canvas 카드 렌더링 → PNG 다운로드

**명언 배열** (하드코딩, 최소 30개):
```typescript
const QUOTES = [
  { text: "성공은 준비와 기회가 만나는 순간이다.", author: "세네카" },
  { text: "오늘 할 수 있는 일을 내일로 미루지 마라.", author: "벤자민 프랭클린" },
  { text: "가장 큰 영광은 한 번도 실패하지 않음이 아니라 실패할 때마다 다시 일어서는 데 있다.", author: "공자" },
  { text: "당신이 할 수 있다고 믿든, 할 수 없다고 믿든 당신이 옳다.", author: "헨리 포드" },
  { text: "시작이 반이다.", author: "아리스토텔레스" },
  // ... 30개 채우기
]
const todayQuote = QUOTES[new Date().getDay() + new Date().getDate() % QUOTES.length]
```

**카드 디자인**: 미니멀 레이아웃, 큰따옴표 그래픽, 명언 텍스트 중앙, 저자명, 하단 설계사 워터마크

---

### 5. 오늘의 건강 뉴스 카드

**동작 방식**:
1. 건강 RSS 피드에서 뉴스 3개 자동 불러오기 (위 뉴스 API 재사용, `?category=health`)
2. 건강 팁 1개 날짜 기반 자동 선택
3. Canvas 카드 생성 → PNG 다운로드

**건강 팁 배열** (하드코딩, 30개):
```typescript
const HEALTH_TIPS = [
  "하루 8잔의 물 마시기로 신진대사를 활성화하세요.",
  "식후 10분 걷기가 혈당 조절에 효과적입니다.",
  "수면 전 스마트폰 사용을 30분 줄이면 수면의 질이 높아집니다.",
  "매일 견과류 한 줌은 심혈관 건강에 도움이 됩니다.",
  // ... 30개
]
```

---

## 페이지 UI 구조

```
/app/crm/dm-cards/page.tsx

고객 DM 카드 메이커
┌──────────────────────────────────────────────┐
│ [카드뉴스] [운세] [기념일] [명언] [건강뉴스]    │  ← 탭 5개
├───────────────────────┬──────────────────────┤
│  설정 패널 (좌측)       │  Canvas 미리보기 (우측) │
│  - 카드 타입별 옵션     │  (1080×1350 scale down) │
│  - 워터마크 텍스트 입력  │                      │
│  - 색상 테마 선택       │                      │
│  - 이름 입력 등         │                      │
├───────────────────────┴──────────────────────┤
│  [PNG 다운로드]  [텍스트 복사]                  │
└──────────────────────────────────────────────┘
```

---

## 사이드바 수정

`/app/dashboard/components/Sidebar.tsx` 에서 기존 "고객 DM 발송" (`/crm/dm`) 아래에 새 항목 추가:
```
icon="🎨"
label="DM 카드 만들기"
href="/crm/dm-cards"
```

---

## 공통 Canvas 유틸 (`/lib/canvasCard.ts` 생성)

기존 `/app/crm/content-studio/page.tsx`의 Canvas 코드에서 공통 함수 추출:
```typescript
export interface CardConfig {
  width: number        // 1080
  height: number       // 1350
  headerBg: string
  footerBg: string
  textColor: string
  accentColor: string
  watermark: string    // 설계사 이름 + 연락처
  font: string
}

export async function loadKoreanFont(): Promise<void>
export function drawRoundedRect(ctx, x, y, w, h, r, color): void
export function drawHeader(ctx, config, title): void
export function drawFooter(ctx, config): void
export function downloadCanvas(canvas, filename): void
```

---

## 구현 순서

1. `/app/api/news-rss/route.ts` 생성 (RSS 파싱)
2. `/lib/canvasCard.ts` 공통 유틸 생성
3. `/app/crm/dm-cards/page.tsx` 메인 페이지 + 탭 골격 생성
4. 탭별 컴포넌트 구현 (카드뉴스 → 운세 → 기념일 → 명언 → 건강)
5. 사이드바에 링크 추가

---

## 주의사항

- OPENAI_API_KEY 없음 → AI 생성 기능 배제, 날짜 기반 순환 콘텐츠 사용
- Canvas 한국어 폰트: `new FontFace()` 동적 로드 (기존 content-studio 방식 동일하게)
- PNG 다운로드: `canvas.toDataURL('image/png')` → `<a download>` 클릭 방식
- 미리보기: Canvas 1080px 고정, CSS `transform: scale()` 로 화면 크기에 맞춤
- 로그인 세션 없으면 `/login` 리다이렉트 (기존 `/crm/dm/page.tsx` 패턴 참고)
- RSS CORS 우회: 반드시 서버 API 라우트(`/api/news-rss`)를 통해 fetch (클라이언트에서 직접 호출 금지)

---

## 완성 기준

- [ ] 5개 탭 모두 Canvas 미리보기 + PNG 다운로드 동작
- [ ] 워터마크(설계사 이름) 입력 → 이미지에 반영
- [ ] 색상 테마 최소 3가지 선택 가능
- [ ] 카드뉴스 탭: 뉴스 불러오기 → 실제 뉴스 제목 표시
- [ ] 사이드바에서 접근 가능
- [ ] 로그인 필수
