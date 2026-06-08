# app/crm/analysis/ - 보장분석 + 엑셀 출력

## 역할
GPT 분석 결과를 화면에 표시하고 엑셀/PDF로 출력하는 메인 분석 페이지.

## 핵심 흐름
```
selectedCustomer 선택
→ reportGroups (PolicyGroup[]) 구성
→ 화면 표시 (보장분석표 HTML)
→ downloadExcelReport() → buildStyledSheet(data) → xlsx 저장
→ downloadLandscapeReport() → html2canvas → jsPDF → PDF 저장
```

## downloadExcelReport() 데이터 형태
```typescript
{
  customer: { name: string },
  policies: [{
    company, product_name, start_date, payment_period,
    monthly_premium,  // 원 단위
    coverages: [{ coverage_name, amount }]  // amount: 원 단위
  }]
}
```
→ `buildStyledSheet(data, customerName)` 호출 (lib/coverageExcel.ts)

## 엑셀 출력 결과 구조
- 왼쪽: 53행 × 최대 11개 보험사 보장분석표
- 오른쪽 (R~T열): 보장금액 요약 + 암/뇌심장 치료 시나리오
- 가로 인쇄 설정 포함

## reportGroups 타입 (PolicyGroup)
```typescript
{
  company: string
  product_name: string
  premium: number       // 원 단위
  payment_period: string
  start_date: string
  coverages: { coverage_name, amount }[]
}
```

## 주의
- 엑셀 금액: `toManwon()` 거쳐 만원 표시
- 보험사 최대 11개 (amountGrid 11열)
