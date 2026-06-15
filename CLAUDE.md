# insurance-manager — 전역 Claude 지침
# 최종 업데이트: 2026-06-15 | 모든 작업에 자동 적용

---

## 0. 이 파일 사용법
- **모든 작업 시작 전 반드시 읽을 것.** 구현 전 아래 "현황 목록"을 먼저 확인해 중복 구현 방지.
- 하위 폴더에 별도 CLAUDE.md가 있으면 추가로 읽는다.
- 모르는 것은 기존 파일을 먼저 Read한 뒤 판단한다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 서비스명 | 메타리치 시그널 — 보험설계사 CRM |
| 프레임워크 | **Next.js 16 (App Router)** + TypeScript |
| CSS | Tailwind CSS (유틸리티 클래스만) + 커스텀 CSS는 `coverage-pro.css` 등 별도 파일 |
| DB | **Supabase** PostgreSQL (`lib/supabase.ts` 싱글턴) |
| 인증 | Supabase Auth — `localStorage` 기반 (`browserAuthStorage`) |
| 배포 | **Vercel** (main 브랜치 push → 자동 배포) |
| 빌드 검증 | `npx tsc --noEmit` → 0 오류 후 push |

---

## 2. 외부 서비스 연결 현황 (모두 완료, 재설정 불필요)

### Supabase
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`.env.local` + Vercel에 설정 완료)
- 클라이언트: `import { supabase } from '@/lib/supabase'` — 단 하나만 사용
- **`sessionStorage` 절대 금지** — 새 창 열면 로그아웃 버그 발생. `localStorage` 고정.

### Vercel
- main 브랜치 push → 자동 프리뷰/프로덕션 배포
- 환경변수 Vercel 대시보드에 설정 완료
- Windows 환경 `npm run build` 시 `spawn EPERM` → 무시 (Vercel에서 정상 빌드)
- **push 전 필수**: `npx tsc --noEmit` 통과

### ChatGPT GPTs (보장분석 AI)
- URL: `https://chatgpt.com/g/g-6a0c10ad0478819192a11b8ffc28c760-boheomyi-gijun-bojangbunseog-ai`
- 출력 포맷: **v5** `{ version: "insurance_analysis_v5", policies: [...] }`
- `amount`: **만원** 단위 / `monthly_premium`: **만원** 단위 (저장 시 ×10000)

---

## 3. Supabase 테이블

| 테이블 | 용도 | 주요 컬럼 |
|---|---|---|
| `customers` | 고객 기본정보 | id, name, phone, birth_date, gender, advisor_id |
| `policies` | 보험계약 | id, customer_id, company, product_name, monthly_premium(원), source_type |
| `coverages` | 담보 상세 | id, policy_id, name, amount(원), row_key |
| `families` | 가족 구성원 | id, customer_id, name, relation, birth_date |
| `upload_analyses` | GPT 분석 결과 | id, customer_id, analysis_json, source_type('gpts') — 단건 upsert |
| `dm_templates` / `dm_logs` | DM 발송 | |
| `notifications` | 알림 | id, advisor_id, type, message, read |
| `users` | 설계사 계정 | id, email, name, role, crm_access |
| **`coverage_pro_sessions`** | 보장분석 PRO 세션 | id, advisor_id, customer_id, session_data(jsonb), status, version |

### 금액 단위 규칙
| 위치 | 단위 |
|---|---|
| Supabase DB (`amount`, `monthly_premium`) | **원(₩)** |
| 화면 표시 / 엑셀 | **만원** |
| `ProCoverage.amount` | **만원** |
| GPTs v5 `amount`, `monthly_premium` | **만원** |
| 변환: DB→화면 | `원 ÷ 10000` |

---

## 4. 앱 라우트 구조

```
app/
├── login / signup / reset-password    — 인증
├── dashboard/                          — 메인 대시보드
├── crm/                                — CRM (새 창)
│   ├── customers/[id]/                 — 고객 상세 (PRO 열기 버튼 포함)
│   ├── upload/                         — AI 업로드 분석
│   ├── analysis/                       — 보장분석 (구버전)
│   ├── dm/ / alerts/ / reports/        — DM · 알림 · 리포트
│   └── settings/
├── coverage-pro/            ★ 보장분석 PRO (주 개발 대상)
│   ├── page.tsx              — 진입점
│   ├── layout.tsx
│   ├── [sessionId]/          — 세션별 URL
│   └── components/           — 전용 컴포넌트 14개 (아래 5-1 참조)
├── insurance-tools/premium-compare/    — 보험료 비교 시뮬레이터
├── financial-portfolio/                — 재무설계 포트폴리오
├── branding-builder/                   — 브랜딩 빌더
└── api/
    ├── coverage-pro/excel-export/      — 엑셀 다운로드 API (서버)
    ├── admin/ / ai-coach/ / notify-signup/ / crm-upload-analyze/
```

---

## 5. 보장분석 PRO ★★★

### 5-1. 컴포넌트 (`app/coverage-pro/components/`)

| 파일 | 역할 |
|---|---|
| `CoverageProWorkspace.tsx` | 메인 오케스트레이터, 모든 state 중앙 관리 |
| `ProSidebar.tsx` | 7단계 사이드바 + 하단 `onSettingsClick` 버튼 |
| `BenchmarkSettings.tsx` | 기준금액 설정 모달 (localStorage `coverage_pro_benchmark`) |
| `BenchmarkSummary.tsx` | Step 7: 기준금액 vs 실제 달성 현황 |
| `CustomerSelector.tsx` | CRM 고객 불러오기 |
| `ContractList.tsx` / `CoverageGrid.tsx` | 계약·담보 표시 |
| `AnalysisChart.tsx` | 보장 현황 차트 |
| `RemodelComparison.tsx` | 리모델링 제안 (9종 탭) |
| `ExcelDownloadBtn.tsx` | `/api/coverage-pro/excel-export` 호출 |
| `PdfExportBtn.tsx` | 인쇄용 새 창 |
| `SessionList.tsx` / `StepIndicator.tsx` | 세션 목록 · 단계 표시 |

### 5-2. 라이브러리 (`lib/coverageAnalysis/`)

| 파일 | 핵심 내용 | 주의 |
|---|---|---|
| `types.ts` | ProContract, ProCoverage, ProSession 등 공통 타입 | |
| `clientMapping.ts` | `inferClientRowKey()`, `proContractsToExcelInputClient()` | **클라이언트 전용** |
| `excelTemplate.ts` | `fillCoverageTemplate()`, `COVERAGE_ROW_MAP` | **서버 전용** (fs/path 사용) — 클라이언트 import 금지 |
| `session.ts` | `createProSession()`, `saveProSession()`, `listProSessions()` | |
| `crmBridge.ts` | CRM ↔ PRO 데이터 변환 | |

### 5-3. 엑셀 템플릿 (`public/templates/coverage/보장분석시트.xlsx`)

```
시트명: 빈양식
행  1~11 : 헤더 (일부 셀 병합)
행 12~59 : 담보 금액 (개별 셀, 병합 없음) — 데이터 기입 영역
행 60    : 구분선
행 61    : 암주요치료비(급여)     → cancer_major_benefit
행 62    : 암주요치료비(비급여)   → cancer_major_nonbenefit
행 63    : 뇌심(순환계)주요치료비 → vascular_major

열 배치:
  C(slot0) E(slot1) G(2) I(3) K(4) M(5) O(6) — 보험사별 금액
  T열(20): 합산 수식 ← 절대 수정 금지!
슬롯→열: N × 2 + 3
```

### 5-4. COVERAGE_ROW_MAP 행 번호

```
12~16  실비 (질병입원/통원, 상해입원/통원, 3대비급여)
17~28  암 (암진단, 유사암, 전이암, 암수술, 다빈치, 방사선류, 항암류)
29~37  2대질병 (뇌혈관/뇌졸중/뇌출혈, 심장류, 수술시술비, 혈전용해, 중환자실)
38~41  후유장해 (질병80%↑, 질병3~80%, 상해80%↑, 상해3~80%)
42~44  사망 (일반/질병/상해)
45~48  수술비 (질병/상해/1-5종/111대)
49~50  상해진단 (골절/화상)
51~52  입원일당 (질병/상해)
53~55  간병인 (병원사용/요양병원/간호간병통합)
56~58  운전자 (벌금/변호사선임/교통사고처리)
59     기타 (일상생활배상책임)
61~63  주요치료비 (암급여/암비급여/뇌심순환계)
```

---

## 6. inferClientRowKey 패턴 매칭 규칙 ★

`lib/coverageAnalysis/clientMapping.ts` — GPTs coverage_name → rowKey 변환

### 핵심: 구체적인 패턴이 반드시 먼저

| 순서 예시 | |
|---|---|
| 요양병원입원 → `nursing_care_hospital` | 먼저 |
| 입원일당 → `hospital_injury_daily` | 나중 |
| 허혈성심장 → `heart_ischemic` | 먼저 |
| 심장질환 → `heart_vascular` | 나중 |
| 1-5종수술 → `surgery_1_5` | 먼저 |
| 질병수술비 → `surgery_disease` | 나중 |
| 암주요치료비비급여 → `cancer_major_nonbenefit` | 먼저 |
| 암주요치료비 → `cancer_major_benefit` | 나중 |

### 후유장해 80% → 함수 내 선행 판별 (NAME_TO_ROW_KEY에 `(80%이상)` 패턴 금지)
```typescript
// inferClientRowKey() 함수 내부 로직
if (normalized.includes('후유장해') || normalized.includes('후유')) {
  const is80 = normalized.includes('80%') || normalized.includes('(80')
  const isInjury = normalized.includes('상해') || normalized.includes('재해')
  if (is80) return isInjury ? 'disability_injury_80' : 'disability_disease_80'
  return isInjury ? 'disability_injury' : 'disability_disease'
}
```

---

## 7. 데이터 흐름 요약

```
GPTs PDF 분석 → JSON v5 출력 (만원 단위)
    ↓ 붙여넣기 (Step 1) → parseGptsJson()
    ↓ inferClientRowKey() → ProContract[] 생성
    ↓ localStorage + Supabase coverage_pro_sessions 저장
Step 4~6: 표시 · 분석 · 리모델링
Step 7: 출력
    ↓ ExcelDownloadBtn → proContractsToExcelInputClient()
    ↓ POST /api/coverage-pro/excel-export
    ↓ fillCoverageTemplate() → 보장분석시트.xlsx 다운로드
```

---

## 8. 코딩 규칙

- `'use client'` 여부 확인 (Node 전용 import 있으면 서버 컴포넌트만)
- `excelTemplate.ts` → API Route(서버)에서만 import
- `supabase` 클라이언트는 `lib/supabase.ts` 하나만 사용
- null 처리: optional chaining + nullish coalescing
- 폰트: `Pretendard Variable` (`Inter` 금지)

---

## 9. 자주 발생하는 실수 & 해결

| 실수 | 원인 | 해결 |
|---|---|---|
| 엑셀 셀 비어 있음 | 패턴 누락 또는 순서 오류 | 구체적 패턴 먼저, 테스트 스크립트 실행 |
| 후유장해 80% 오매핑 | 배열에 `(80%이상)` 넣음 | 함수 선행 판별 로직 사용 |
| 새 창 로그아웃 | sessionStorage 사용 | `lib/supabase.ts` `browserAuthStorage` 확인 |
| TS 오류: fs not found | excelTemplate.ts 클라이언트 import | 서버(API route)에서만 |
| git commit index.lock | 환경 권한 이슈 | 사용자 Git CMD에서 직접 커밋 |
| build EPERM (Windows) | 환경 이슈 | 무시. Vercel 정상 빌드 |

---

## 10. 구현 완료 목록 (재구현 금지)

### 보장분석 PRO
- [x] 7단계 워크플로우 (Step 1~7)
- [x] Supabase 세션 저장/불러오기 (`coverage_pro_sessions`)
- [x] GPTs JSON v5 파서
- [x] CRM 고객 연동
- [x] 담보 9종 탭 분류 (RemodelComparison)
- [x] 납입기간·만기 숫자 입력
- [x] 엑셀 다운로드 (행 12-63, 주요치료비 61-63 포함)
- [x] PDF 출력 (인쇄용 새 창)
- [x] 기준금액 설정 모달 (최소/표준/여유 프리셋, localStorage 저장)
- [x] Step 7 기준금액 대비 현황 (BenchmarkSummary)
- [x] 사이드바 하단 설정 버튼
- [x] 주요치료비 패턴 매핑 (암급여/비급여/순환계)
- [x] 후유장해 80% 선행 판별 로직
- [x] 34개 패턴 테스트 통과

### CRM
- [x] 고객 목록/상세/등록/담보 관리
- [x] GPT 분석 업로드 → Supabase (단건 upsert)
- [x] DM 발송 / 알림 / PDF 리포트 / 설정
- [x] 고객 상세 페이지 → PRO 열기 버튼

### 기타
- [x] 보험료 비교 시뮬레이터 (`/insurance-tools/premium-compare`)
- [x] 브랜딩 빌더 / 재무설계 포트폴리오

---

## 11. 개발 명령

```bash
# 개발 서버
npm run dev               # 기본 3000포트
npx next dev -p 3002      # 포트 지정

# TS 검사 (push 전 필수)
npx tsc --noEmit

# Vercel 배포 (git push만 하면 자동)
git add [수정파일]
git commit -m "feat: 설명"
git push
```

---

## 12. GPTs v5 JSON 형식 참조

```json
{
  "version": "insurance_analysis_v5",
  "policies": [{
    "company": "삼성화재",
    "product_name": "상품명",
    "policy_status": "active",
    "payment_period": "20년납100세만기",
    "monthly_premium": 3.5,
    "coverages": [{
      "coverage_name": "일반암진단비",
      "amount": 5000,
      "category": "암",
      "coverage_type": "비갱신형"
    }]
  }]
}
```

---

## 13. 기준금액 표준 프리셋 (BenchmarkSettings 참조값)

| 담보 | 최소 | 표준 | 여유 |
|---|---|---|---|
| 사망 | 1억 | 3억 | 5억 |
| 암진단 | 3,000만 | 5,000만 | 1억 |
| 유사암 | 500만 | 1,000만 | 2,000만 |
| 뇌혈관 | 2,000만 | 3,000만 | 5,000만 |
| 심장질환 | 2,000만 | 3,000만 | 5,000만 |
| 암주요치료비(급여/비급여) | 500만 | 1,000만 | 2,000만 |
| 순환계주요치료비 | 500만 | 1,000만 | 2,000만 |
| 수술비 | 200만 | 500만 | 1,000만 |
| 간병(일당) | 30만 | 50만 | 70만 |
| 운전자 | 2,000만 | 3,000만 | 5,000만 |

---

*새 세션 시작 전 항상 이 파일을 확인하세요. 이미 구현된 것을 다시 만들지 마세요.*
