# 간편보험 인수기준 비교 시스템

## 파일 구조
```
underwriting/
├── index.html          ← 메인 대시보드 (UI)
├── vercel.json         ← Vercel 배포 설정
├── data/
│   ├── companies.json  ← 보험사 정보 (21개사)
│   ├── diseases.json   ← 전체 질환 목록 (113개)
│   ├── conditions.json ← 회사별 인수조건 ★ 주로 수정
│   └── jobs.json       ← 직업 상해급수 (39개)
└── js/
    └── app.js          ← 앱 로직
```

## 데이터 업데이트 방법

### 새 질환 인수조건 추가 (conditions.json)
```json
"질병코드": {
  "삼성화재":  {"status":"ok",          "note":"즉시인수",   "score":5},
  "DB손보":    {"status":"conditional", "note":"15일이내",   "score":3},
  "KB손해":    {"status":"ng",          "note":"인수불가",   "score":0},
  ...
}
```
- **status**: `ok` / `conditional` / `ng`
- **score**: 0~5 (5=가장 유리)

### 새 질환 추가 (diseases.json)
```json
{
  "code": "N40",
  "name": "전립선비대증",
  "cat": "비뇨생식",
  "body": ["전립선","남성생식기","비뇨기","소변"],
  "aliases": ["전립선비대","BPH"]
}
```

### 새 보험사 추가 (companies.json)
```json
{"id":"새보험사", "name":"새보험사", "type":"손해", "color":"#색상"}
```
→ conditions.json의 각 질병코드에도 해당 회사 항목 추가 필요

## 2026-06 원본자료 점검 메모
- 손보/생보 간편보험 예외질환 리스트 압축자료 기준 비교 대상은 21개사입니다.
- 회사별 조건이 아직 정규화되지 않은 질환은 화면에서 `회사별 원본 확인 필요`로 표시합니다.
- 원본자료가 확인되지 않은 회사는 비교 대상에서 제외했습니다.

## Vercel 배포
1. GitHub 저장소에 이 폴더 업로드
2. Vercel 대시보드 → New Project → GitHub 연동
3. 자동 배포 완료
