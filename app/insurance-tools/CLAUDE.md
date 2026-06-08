# app/insurance-tools/ - 보험 계산 도구

## 탭 구성
| 폴더 | 도구 |
|---|---|
| `diagnosis/` | 진단비 계산기 |
| `surgery/` | 수술비 계산기 |
| `disability/` | 후유장해 계산기 |
| `car-accident/` | 자동차사고 처리 지원금 계산 |
| `premium-compare/` | 보험료 비교 |
| `coverage-stats/` | 보장 통계 |

## 공통 특징
- 독립적인 클라이언트 컴포넌트 (`'use client'`)
- Supabase 연동 없이 로컬 계산 위주
- `lib/consultingTools.ts` - 계산 로직 상수/함수

## 추가 도구 패턴
새 도구 추가 시: `app/insurance-tools/[도구명]/page.tsx` 생성
→ 상위 네비게이션에 링크 추가 필요
