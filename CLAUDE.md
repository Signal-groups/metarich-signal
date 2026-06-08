# 보험 설계사 CRM - insurance-manager

## 스택
- Next.js 14 App Router + TypeScript
- Supabase (PostgreSQL) - `lib/supabase.ts`
- Tailwind CSS (유틸리티 클래스만, 커스텀 CSS 최소화)
- xlsx-js-style (엑셀 생성)

## 주요 Supabase 테이블
| 테이블 | 용도 |
|---|---|
| customers | 고객 기본정보 |
| policies | 보험증권 |
| coverages | 담보 상세 |
| families | 가족 구성원 |
| upload_analyses | GPT 분석 결과 JSON |
| dm_templates / dm_logs | DM 발송 |
| notifications | 알림 |
| users | 설계사 계정 |

## 코딩 규칙
- 컴포넌트: 파일 상단 `'use client'` 여부 확인 후 작성
- API Route: `app/api/` 하위, NextRequest/NextResponse 사용
- 금액 단위: DB는 **원(₩)**, 화면/엑셀 표시는 **만원** (`toManwon()` 사용)
- null 처리: optional chaining + nullish coalescing 기본

## 하위 CLAUDE.md 위치
- `lib/` → 공유 유틸리티
- `app/crm/customers/` → 고객 목록·상세·정책 입력
- `app/crm/customers/[id]/report/` → PDF 제안서
- `app/crm/analysis/` → 보장분석 + 엑셀 출력
- `app/crm/upload/` → AI 업로드 분석
- `app/api/` → API 라우트
- `app/insurance-tools/` → 보험 계산 도구
