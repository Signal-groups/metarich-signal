# coverage-pro — 보장분석 PRO 전용 지침
# 루트 CLAUDE.md를 먼저 읽을 것

---

## 폴더 구조

```
coverage-pro/
├── page.tsx            — 진입점 (로그인 확인 → CoverageProWorkspace 렌더)
├── layout.tsx          — 레이아웃 (coverage-pro.css 로드)
├── coverage-pro.css    — 전용 CSS (coverage-pro-sidebar, coverage-pro-card 등)
├── [sessionId]/        — 세션별 URL 라우팅
└── components/
    ├── CoverageProWorkspace.tsx  ← 모든 state · step 관리 (수정 시 전체 흐름 파악 필수)
    ├── ProSidebar.tsx            ← onSettingsClick prop 필수
    ├── BenchmarkSettings.tsx     ← localStorage 'coverage_pro_benchmark'
    ├── BenchmarkSummary.tsx      ← Step 7에 삽입, onOpenSettings prop
    ├── CustomerSelector.tsx
    ├── ContractList.tsx
    ├── CoverageGrid.tsx
    ├── AnalysisChart.tsx
    ├── RemodelComparison.tsx     ← 9종 탭: 진단/수술/입원/간병/재가/기타/운전자/실손/주요치료비
    ├── ExcelDownloadBtn.tsx      ← proContractsToExcelInputClient() 사용
    ├── PdfExportBtn.tsx
    ├── SessionList.tsx
    └── StepIndicator.tsx
```

---

## Step 구조 (CoverageProWorkspace)

| Step | 컴포넌트 | 주요 기능 |
|---|---|---|
| 1 | CustomerSelector + JSON 붙여넣기 | 고객 선택, GPTs JSON 입력, 세션 불러오기 |
| 2 | 기본정보 카드 | 고객 정보 확인 |
| 3 | ContractList + JSON 재입력 | 계약 목록 확인 |
| 4 | CoverageGrid | 담보 카테고리별 표시 |
| 5 | AnalysisChart | 보장 현황 차트 |
| 6 | RemodelComparison | 리모델링 제안 |
| 7 | BenchmarkSummary + 출력형식 + 다운로드 | 기준금액 비교 · 엑셀/PDF 출력 |

---

## State 관리 (CoverageProWorkspace)

```typescript
const [currentStep, setCurrentStep]   // 현재 단계
const [customer, setCustomer]          // ProCustomer
const [contracts, setContracts]        // ProContract[]  ← 핵심 데이터
const [stepStatus, setStepStatus]      // 각 단계 완료 상태
const [proposal, setProposal]          // RemodelProposal (리모델링)
const [outputConfig, setOutputConfig]  // 출력 설정
const [showBenchmark, setShowBenchmark] // 기준금액 모달 open/close
```

State 변경 시 자동으로 localStorage + Supabase 저장 (`persistState()`)

---

## 새 기능 추가 체크리스트

새 컴포넌트/기능 추가 시:
1. `CoverageProWorkspace.tsx`에 state 또는 handler 추가
2. 필요 시 `ProSidebar.tsx`에 prop 추가
3. Step 번호에 맞는 위치에 렌더링
4. `lib/coverageAnalysis/types.ts` 타입 변경 시 전파 범위 확인
5. `npx tsc --noEmit` 통과 확인

---

## CSS 클래스 (coverage-pro.css)

```css
.coverage-pro-layout          /* 사이드바 + 메인 grid */
.coverage-pro-sidebar         /* 왼쪽 사이드바 (flex-direction: column) */
.coverage-pro-main            /* 오른쪽 메인 영역 */
.coverage-pro-card            /* 카드 컨테이너 */
.coverage-pro-card-pad        /* 카드 + 패딩 */
.coverage-pro-section-title   /* 섹션 제목 */
.coverage-pro-btn             /* 기본 버튼 */
.coverage-pro-btn.primary     /* 주요 버튼 (네이비) */
.coverage-pro-btn.gold        /* 골드 버튼 (엑셀 다운로드) */
.coverage-pro-input           /* 인풋 필드 */
.coverage-pro-textarea        /* 텍스트에어리어 */
.coverage-pro-muted           /* 회색 보조 텍스트 */
.coverage-pro-step            /* 사이드바 단계 버튼 */
.coverage-pro-step.active     /* 현재 단계 */
.coverage-pro-stat-grid       /* 상단 요약 스탯 그리드 */
.coverage-pro-grid-2          /* 2열 그리드 */
.coverage-pro-grid-3          /* 3열 그리드 */
.coverage-pro-actions         /* 버튼 액션 그룹 */
```

---

## 엑셀 다운로드 흐름

```
ExcelDownloadBtn 클릭
  → proContractsToExcelInputClient(customerName, contracts)
    → 각 contract.coverages에서 rowKey !== 'unknown' 필터링
    → slot 0~6으로 보험사 배치
  → POST /api/coverage-pro/excel-export
    → fillCoverageTemplate(input) [서버]
      → 보장분석시트.xlsx 템플릿 로드
      → COVERAGE_ROW_MAP으로 행 찾기
      → SLOT_TO_COL로 열 찾기 (col = slot×2+3)
      → 셀에 값 기입
    → Buffer → 파일 다운로드
```

---

## 기준금액 설정 흐름

```
ProSidebar 하단 "기준금액 설정" 버튼
  → CoverageProWorkspace: setShowBenchmark(true)
  → BenchmarkSettings 모달 렌더
    → 프리셋(최소/표준/여유) 또는 직접 입력
    → 저장 → localStorage 'coverage_pro_benchmark' 에 JSON 저장

Step 7 렌더 시
  → BenchmarkSummary 컴포넌트
    → loadBenchmark() → localStorage 읽기
    → contracts에서 실제 합산 계산 (ROW_KEY_TO_BENCHMARK 매핑)
    → 항목별 달성/부족/미가입 표시
```
