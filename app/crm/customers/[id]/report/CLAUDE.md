# app/crm/customers/[id]/report/ - PDF 제안서

## 목적
고객용 A4 가로 인쇄 보장분석 제안서. `@media print` CSS로 PDF 저장.

## page.tsx 구조 (788줄)
```
fetchData() → customers + policies + coverages + coverage_recommendations
↓
normalPolicies 필터 (policy_status로 실효/해지 제외)
↓
enrichedCoverages = coverages × COVERAGE_TARGETS 매핑
↓
페이지 렌더: 표지 → 납입현황 → 보장요약 → 담보상세 → 권장비교
```

## 주요 상태값
- `normalPolicies` - 정상 계약만 (실효·해지·취소·만기 제외)
- `enrichedCoverages` - `{ policy, coverage, matchedTarget }` 배열
- `matchedAll` - 동일 target.key 모두 (PolicyMiniList용)

## 새 DB 컬럼 (pdf_report_schema.sql로 추가됨)
| 컬럼 | 설명 |
|---|---|
| policy_status | active/lapsed/cancelled/expired |
| payment_period | "20년납", "전기납" 등 |
| end_age | "종신", "80세" 등 |
| paid_total | 납입완료 총액(원) |
| expected_total | 납입예정 총액(원) |
| payment_count | 총 납입횟수 |
| paid_count | 현재 납입횟수 |

## 뷰
- `policies_with_progress` - calc_paid_count, calc_paid_total, calc_expected_total 자동계산

## 금액 계산 우선순위
```typescript
paid_total > start_date 기준 자동계산
expected_total > payment_count × monthly_premium
```

## 컴포넌트
- `PolicyMiniList` - 담보 카드 내 복수 보험사 표시
- `PolicyMini` - 개별 정책 한 줄 표시
- `coverage_recommendations` 테이블 - 권장금액 비교용
