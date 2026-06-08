# app/crm/customers/ - 고객 관리

## 파일 구조
- `page.tsx` - 고객 목록 (검색·필터·페이징)
- `new/page.tsx` - 신규 고객 등록
- `[id]/page.tsx` - 고객 상세 + 정책 입력 + 보장분석표 뷰
- `[id]/report/page.tsx` - PDF 제안서 (별도 CLAUDE.md)

## customers 테이블 주요 컬럼
`id, name, phone, birth_date, gender, advisor_id, memo, created_at`

## policies 테이블 주요 컬럼
```
id, customer_id, company, product_name, start_date
monthly_premium (원), payment_period, end_age
policy_status (active/lapsed/cancelled/expired)
paid_total, expected_total, payment_count, paid_count
```

## coverages 테이블
`id, policy_id, coverage_name, amount (원), category`

## [id]/page.tsx 핵심 섹션
1. **고객 기본정보** - 이름·생년월일·연락처·메모
2. **보험 정책 목록** - policies + coverages join 뷰
3. **보장분석표** - `COVERAGE_STRUCTURE_DISPLAY` 기반 HTML 테이블
   - `buildCoverageDisplayMatrix(policies, coverages)` → amountGrid 계산
4. **보장 그래프** - Chart.js 레이더 차트
5. **보험료 시뮬레이션** - 할증·연령 계산
6. **DM 발송** - dm_logs 기록

## 보장분석표에서 PDF/엑셀 이동
- PDF: `/crm/customers/${id}/report` (새 탭)
- 엑셀: `/crm/analysis?customerId=${id}` 이동 후 다운로드
