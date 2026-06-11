# 🏗️ 리빌드 계획서 — 고객 CRM × 보장분석 PRO 통합
> 최종 확정: 2026-06-09  
> **핵심 원칙: 기존 코드 변경 없음 / 신규 모듈만 추가 / CRM 재사용**

---

## 📁 전체 폴더 트리

```
insurance-manager/
├── app/
│   ├── dashboard/              ✅ 기존 유지 (손대지 않음)
│   ├── crm/                    ✅ 기존 유지 + 연결 버튼만 추가
│   │   ├── customers/[id]      ← "보장분석 PRO로 열기" 버튼 1개 추가
│   │   ├── layout.tsx          ← 사이드바에 PRO 링크 1개 추가
│   │   └── (나머지 전체)       ← 손대지 않음
│   ├── coverage-pro/           🆕 보장분석 PRO (완전 신규)
│   │   ├── layout.tsx          ← PRO 전용 레이아웃 + 단계형 사이드바
│   │   ├── page.tsx            ← 시작 화면 (고객 선택 or 새 분석)
│   │   ├── [sessionId]/        ← 분석 세션
│   │   │   ├── step-1/page.tsx ← 고객 선택
│   │   │   ├── step-2/page.tsx ← 기본 정보
│   │   │   ├── step-3/page.tsx ← 현재 보험 계약
│   │   │   ├── step-4/page.tsx ← 담보 확인
│   │   │   ├── step-5/page.tsx ← 분석 결과
│   │   │   ├── step-6/page.tsx ← 리모델링 제안
│   │   │   ├── step-7/page.tsx ← 출력 설정
│   │   │   └── step-8/page.tsx ← 최종 확인 + 다운로드
│   │   └── components/
│   │       ├── ProSidebar.tsx         ← 단계형 사이드바
│   │       ├── StepIndicator.tsx      ← 진행 상태
│   │       ├── CustomerSelector.tsx   ← CRM 고객 불러오기
│   │       ├── ContractList.tsx       ← 계약 편집
│   │       ├── CoverageGrid.tsx       ← 담보 그리드
│   │       ├── AnalysisChart.tsx      ← 분석 시각화
│   │       ├── RemodelComparison.tsx  ← 리모델링 전/후
│   │       ├── ExcelDownloadBtn.tsx   ← 엑셀 다운로드
│   │       └── PdfExportBtn.tsx       ← PDF 출력
│   ├── api/
│   │   ├── admin/              ✅ 기존 유지
│   │   ├── coverage-pro/       🆕 PRO 전용 API
│   │   │   ├── session/route.ts       ← 세션 생성/저장/조회
│   │   │   ├── load-customer/route.ts ← CRM 고객 데이터 로드
│   │   │   └── excel-export/route.ts  ← 엑셀 생성 다운로드
│   │   └── (기존 api 전체)     ✅ 유지
│   └── (기타 모든 페이지)      ✅ 유지
│
├── lib/
│   ├── supabase.ts             ✅ 유지
│   ├── roles.ts                ✅ 유지
│   ├── coverageExcel.ts        ✅ 유지 (PRO에서 재사용)
│   ├── crmAnalysisPersistence.ts ✅ 유지
│   ├── coverageAnalysis/       🆕 공통 데이터 구조 (PRO 핵심)
│   │   ├── types.ts            ← Customer, Contract, Coverage, Session 타입
│   │   ├── crmBridge.ts        ← CRM 데이터 → PRO 포맷 변환
│   │   ├── session.ts          ← 분석 세션 CRUD
│   │   ├── excelTemplate.ts    ← 엑셀 템플릿 셀 매핑 + 생성
│   │   └── pdfExport.ts        ← PDF 출력 유틸
│   └── (기타 lib 전체)         ✅ 유지
│
└── public/
    ├── bohum-logo.jpg          ✅ 기존
    ├── coverage-stats/         ✅ 기존
    └── templates/
        └── coverage/
            └── 2026.xlsx       🆕 엑셀 출력 템플릿 파일
```

---

## 🔄 리빌딩 내용

### 변경 없는 것 (FREEZE)
- `app/dashboard/` — 전체 동결
- `app/crm/` — 아래 2가지 최소 추가 외 동결
- `lib/supabase.ts`, `lib/roles.ts`, `lib/coverageExcel.ts` — 동결

### 최소 수정 (기존 파일, 2곳만)

**① `app/crm/layout.tsx`** — 사이드바 NAV 배열에 항목 1개 추가
```typescript
// 기존 NAV 배열 끝에 추가만
{ href: '/coverage-pro', label: '보장분석 PRO', exact: false, icon: <...> }
```

**② `app/crm/customers/[id]/page.tsx`** — 상단 액션 버튼 1개 추가
```typescript
// 기존 버튼들 옆에 추가만
<button onClick={() => window.open(`/coverage-pro?customerId=${id}`)}>
  보장분석 PRO로 열기
</button>
```

### 완전 신규 (ADD ONLY)
- `app/coverage-pro/` — 단계형 PRO 앱 전체
- `lib/coverageAnalysis/` — 공통 데이터 구조
- `app/api/coverage-pro/` — PRO 전용 API

---

## 🗃️ 공통 데이터 스키마 (lib/coverageAnalysis/types.ts)

```typescript
// ── 고객 ──────────────────────────────────────────────────────────
export interface ProCustomer {
  id: string
  name: string
  birth: string          // YYYY-MM-DD
  gender: 'M' | 'F'
  phone: string
  advisorId: string
}

// ── 보험계약 ──────────────────────────────────────────────────────
export interface ProContract {
  id: string
  customerId?: string    // 비연결 분석 시 undefined
  company: string        // 보험사명
  productName: string    // 상품명
  policyHolder: string   // 계약자
  insured: string        // 피보험자
  contractDate: string   // 계약일
  paymentPeriod: string  // 납입기간 (예: "20년납")
  paidPeriod: string     // 기납입기간
  expiryDate: string     // 보장만기일
  monthlyPremium: number // 월 보험료 (원)
  isRenewal: boolean     // 갱신형 여부
  status: 'active' | 'lapsed' | 'expired'
  coverages: ProCoverage[]
}

// ── 담보 ──────────────────────────────────────────────────────────
export interface ProCoverage {
  id: string
  contractId: string
  rowKey: string         // coverageExcel.ts COVERAGE_STRUCTURE 기반
  name: string           // 담보명
  amount: number         // 가입금액 (원)
  expiryDate?: string    // 담보 만기 (계약만기와 다를 수 있음)
  isRenewal?: boolean    // 담보별 갱신
}

// ── 분석 세션 ─────────────────────────────────────────────────────
export interface ProSession {
  id: string
  advisorId: string
  customerId?: string          // null = 고객 미연결 분석
  customerSnapshot?: ProCustomer
  contracts: ProContract[]
  currentStep: StepNumber
  stepStatus: Record<StepNumber, StepStatus>
  remodelProposal?: RemodelProposal
  outputConfig?: OutputConfig
  version: number
  createdAt: string
  updatedAt: string
}

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type StepStatus = 'pending' | 'done' | 'warning'

export interface RemodelProposal {
  addContracts: ProContract[]
  removeContractIds: string[]
  memo: string
}

export interface OutputConfig {
  outputType: 'full_pdf' | 'key_pdf' | 'excel'
  includeRemodel: boolean
  includeGraph: boolean
}
```

---

## 🗄️ Supabase 신규 테이블

```sql
-- coverage_pro_sessions: 분석 세션 저장
CREATE TABLE coverage_pro_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  session_data JSONB NOT NULL,    -- ProSession 전체 JSON
  version     INTEGER DEFAULT 1,
  status      TEXT DEFAULT 'draft' CHECK (status IN ('draft','completed','archived')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE coverage_pro_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advisor_own_sessions" ON coverage_pro_sessions
  USING (advisor_id = auth.uid())
  WITH CHECK (advisor_id = auth.uid());

CREATE INDEX idx_sessions_advisor ON coverage_pro_sessions(advisor_id);
CREATE INDEX idx_sessions_customer ON coverage_pro_sessions(customer_id);
```

---

## 🔑 엑셀 템플릿 셀 매핑 (파일 업로드 후 확정)

| 셀 위치 | 데이터 | 비고 |
|---------|--------|------|
| (미정) | customer.name | 고객명 |
| (미정) | contract.company | 보험사 |
| (미정) | contract.productName | 상품명 |
| (미정) | contract.monthlyPremium | 월보험료 |
| (미정) | coverage.amount | 담보 가입금액 |

> ⚠️ **`public/templates/coverage/2026.xlsx` 업로드 후 이 표를 채울 것**

---

## 🤝 코워크 vs Codex 역할 분리

### 코워크 (이 대화)
| 무엇을 | 언제 |
|--------|------|
| REBUILD_PLAN.md 관리 | 지속 |
| lib/coverageAnalysis/types.ts 작성 | Phase 1 |
| Supabase 테이블 생성 (MCP 실행) | Phase 1 |
| 엑셀 셀 매핑 확정 | Phase 1 (파일 업로드 후) |
| crm/layout.tsx 링크 1개 추가 | Phase 1 |
| crm/customers/[id] 버튼 1개 추가 | Phase 1 |
| TypeScript 오류 검수 (tsc) | 각 Phase 완료 후 |
| Codex 작업물 검토 | 지속 |

### Codex (Claude Code CLI)
| 무엇을 | 언제 |
|--------|------|
| lib/coverageAnalysis/crmBridge.ts | Phase 1 |
| lib/coverageAnalysis/excelTemplate.ts | Phase 1 |
| app/api/coverage-pro/excel-export/route.ts | Phase 1 |
| app/coverage-pro/ 전체 UI | Phase 2 |
| app/api/coverage-pro/session/route.ts | Phase 2 |
| lib/coverageAnalysis/pdfExport.ts | Phase 3 |

### ⚠️ 충돌 방지 규칙
1. **Codex는 신규 파일만** — 기존 파일 수정 시 반드시 코워크 확인
2. **기존 CRM 파일 접근 금지** — `app/crm/**` 에 Codex 접근 없음
3. **타입 변경 = 코워크 승인 필요** — `lib/coverageAnalysis/types.ts`는 양측 합의
4. **이 파일 필독** — Codex는 작업 전 REBUILD_PLAN.md를 반드시 읽을 것

---

## 📋 1차 작업 범위 ✅ 완료

- [x] `lib/coverageAnalysis/types.ts` 작성 ← 완료
- [x] `lib/coverageAnalysis/excelTemplate.ts` — 셀 매핑 + 주입 로직 ← 완료
- [x] `lib/coverageAnalysis/crmBridge.ts` — CRM 데이터 변환 ← 완료
- [x] `public/templates/coverage/2026.xlsx` 등록 ← 완료
- [x] `app/api/coverage-pro/excel-export/route.ts` — 다운로드 API ← 완료
- [x] Supabase `coverage_pro_sessions` 테이블 SQL 작성 ← SQL 준비됨

**Codex 규칙 수정 (확정)**
- `app/crm/**` 읽기 허용, 수정은 layout.tsx 1곳 + customers/[id]/page.tsx 1곳만
- `lib/coverageExcel.ts` 기존 유지, PRO는 `lib/coverageAnalysis/excelTemplate.ts` 사용

## 📋 2차 작업 범위

- [ ] `/coverage-pro` 화면 생성 및 단계형 사이드바
- [ ] CRM에서 고객 불러오기
- [ ] 고객 미지정 분석 시작
- [ ] step-1 ~ step-4 UI

## 📋 3차 작업 범위

- [ ] step-5 ~ step-8 (분석/리모델링/출력)
- [ ] PDF 전체/주요보장 출력 분리
- [ ] 분석 스냅샷 저장
- [ ] CRM 상담 이력 연결

---

*관리자: 코워크 | Codex는 읽기만 가능*
