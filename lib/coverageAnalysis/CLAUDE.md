# lib/coverageAnalysis — 보장분석 핵심 라이브러리 지침

---

## 파일별 역할 및 제약

### types.ts — 공통 타입 정의
변경 시 모든 컴포넌트에 영향. 신중하게 수정.
- `ProCoverage.amount`: **만원 단위** (DB와 다름)
- `ProContract.monthlyPremium`: **원 단위** (화면 표시 시 ÷10000)

### clientMapping.ts — 클라이언트 전용 ★
**서버 전용 import (fs, path) 없음 — 'use client' 컴포넌트에서 안전하게 import 가능**

핵심 함수:
- `inferClientRowKey(name)` → rowKey 반환
- `proContractsToExcelInputClient(customerName, contracts)` → ExcelExportInput
- `loadBenchmark()` (BenchmarkSettings에서 re-export됨)

패턴 배열 `NAME_TO_ROW_KEY` 수정 시:
1. **구체적인 패턴이 반드시 앞에 위치해야 함** (예: 요양병원 > 입원일당)
2. 후유장해 80%는 배열에 `(80%이상)` 넣지 말 것 → 함수 선행 판별 사용
3. 수정 후 반드시 node 테스트 실행:
   ```bash
   node -e "/* 패턴 테스트 코드 */"
   ```

현재 테스트 통과: **34/34** (후유장해 80% 포함)

### excelTemplate.ts — 서버 전용 ★★
**`import fs from 'fs'` 포함 → 클라이언트 컴포넌트에서 절대 import 금지**
→ `/app/api/coverage-pro/excel-export/route.ts` 에서만 사용

핵심:
- `COVERAGE_ROW_MAP`: rowKey → 엑셀 행 번호 (12~63)
- `fillCoverageTemplate(input)`: 보장분석시트.xlsx에 데이터 주입 후 Buffer 반환
- T열(col 20) 수식 셀: 절대 수정 금지

서버사이드에도 `NAME_TO_ROW_KEY` 배열 있음 → clientMapping.ts와 동기화 필요.
새 패턴 추가 시 **두 파일 모두** 업데이트.

### session.ts — Supabase CRUD
테이블: `coverage_pro_sessions`
```sql
columns: id(uuid), advisor_id, customer_id, session_data(jsonb), status, version
```
- `createProSession()`: 새 세션 생성 + DB insert
- `saveProSession()`: 기존 세션 update (debounce 1500ms 적용됨)
- `listProSessions()`: 내 세션 목록 조회

---

## 주요치료비 rowKey 매핑

| rowKey | 엑셀 행 | 패턴 예시 |
|---|---|---|
| `cancer_major_benefit` | 61 | 암주요치료비(급여), 암주요치료비급여, 암주요치료비 |
| `cancer_major_nonbenefit` | 62 | 암주요치료비(비급여), 암주요치료비비급여 |
| `vascular_major` | 63 | 뇌심주요치료비, 순환계주요치료비, 뇌혈관주요치료비 |

비급여 패턴을 급여보다 반드시 먼저 체크 (급여 패턴이 비급여까지 매핑하는 오류 방지)

---

## 동기화 체크리스트 (두 파일 모두 수정해야 할 때)

새 rowKey 추가 시:
- [ ] `types.ts` — 필요 시 타입 확장
- [ ] `clientMapping.ts` — `NAME_TO_ROW_KEY` 패턴 추가 + `ROW_KEY_LABEL` 추가
- [ ] `excelTemplate.ts` — `COVERAGE_ROW_MAP` 행 번호 추가 + `NAME_TO_ROW_KEY` 동기화 + `ROW_KEY_LABEL` 추가
- [ ] `BenchmarkSettings.tsx` — `ROW_KEY_TO_BENCHMARK` 매핑 추가 (필요 시)
- [ ] `보장분석시트.xlsx` — 새 행 추가 (Excel 직접 편집)
