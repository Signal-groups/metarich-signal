# lib/ - 공유 유틸리티

## 핵심 파일

### coverageExcel.ts
엑셀 보장분석표 생성 전담. **수정 시 인덱스 주의.**

- `COVERAGE_STRUCTURE` - 53행 배열 (0~52)
- `amountGrid[53][11]` - [담보행][보험사열] 금액 행렬
- `findCoverageRowIndex(name)` - 담보명 → 행 인덱스 매핑
- `buildStyledSheet(data, customerName)` - 시트 객체 반환
- `parseBojangtableSheet(sheet)` - 엑셀 → structuredAnalysis 역파싱

**COVERAGE_STRUCTURE 인덱스 (자주 참조)**
```
0~2   사망 / 3~9 암 / 10~18 뇌심장
19~27 후유장해·골절·화상 / 28~37 의료(실손·수술)
38~42 입원일당·간병 / 43~44 치매 / 45~52 운전자·치아·기타
```

**오른쪽 요약 섹션**: SC=17(R열)부터 colLabel/colAmt/colNote 3열
**가로 인쇄**: `ws['!pageSetup'] = { orientation: 'landscape' }`

### supabase.ts
싱글턴 Supabase 클라이언트. 모든 DB 접근은 이 파일 import.

### crmAnalysisPersistence.ts
GPT 분석 결과 Supabase 저장/조회. `upload_analyses` 테이블 연동.

### aiCoach.ts / aiCoachClient.ts
AI 코치 프롬프트 빌더 + 클라이언트 호출 래퍼.

### crmLocalFiles.ts
로컬 파일(분석 JSON 등) localStorage 임시 저장/불러오기.

### claimDocuments.ts / consultingTools.ts
보험 청구 서류 안내 / 상담 도구 데이터 상수.
