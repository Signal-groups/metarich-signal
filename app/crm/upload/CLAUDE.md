# app/crm/upload/ - AI 업로드 분석

## 역할
GPT 분석 JSON 붙여넣기 → 파싱 → Supabase 저장 → 엑셀 다운로드

## 핵심 흐름
```
파일 업로드 (PDF/이미지) or GPT 코드 붙여넣기(gptsCode)
→ applyGptsCode() → JSON 파싱 → UploadItem.structuredAnalysis 저장
→ downloadAnalysisExcel(item) → buildStyledSheet(structuredAnalysis)
→ saveGptsAnalysisToSupabase() → upload_analyses 테이블 저장
```

## GPT 출력 JSON 형식 (v5 기준)
```json
{
  "version": "insurance_analysis_v5",
  "customer": { "name": "...", "age": 45, "gender": "M" },
  "policies": [{
    "company": "삼성생명",
    "product_name": "...",
    "start_date": "2020-03-01",
    "payment_period": "20년납",
    "end_age": "종신",
    "monthly_premium": 150000,
    "policy_status": "active",
    "coverages": [{ "coverage_name": "일반암진단비", "amount": 30000000 }]
  }],
  "coverage_summary": { "cancer_general": 3000, ... }
}
```

## upload_analyses 테이블
`id, customer_id, customer_name, structured_json, created_at`

## UploadItem 로컬 상태 (localStorage 기반)
```typescript
{
  id, name, structuredAnalysis,
  customerName, customerId,
  analysisStatus: 'pending' | 'analyzing' | 'done'
}
```

## 엑셀 파일 파싱 (기존 보장분석표 역파싱)
`parseBojangtableSheet(sheet)` → structuredAnalysis 복원 (lib/coverageExcel.ts)

## GPT 참조 파일
`gpts-instructions-v5.md` (프로젝트 루트) - GPT 시스템 프롬프트
