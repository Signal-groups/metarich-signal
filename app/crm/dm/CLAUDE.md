# app/crm/dm/ - DM 발송 관리

## 파일 구조
- `page.tsx` - DM 발송 목록·이력
- `message/page.tsx` - 메시지 작성·발송
- `dm-cards/page.tsx` - DM 카드뉴스 관리 (app/crm/dm-cards/)

## 관련 테이블
| 테이블 | 설명 |
|---|---|
| `dm_templates` | 저장된 DM 템플릿 (제목·내용·카테고리) |
| `dm_logs` | 발송 이력 (customer_id, sent_at, template_id) |
| `dm_content_usage_logs` | 콘텐츠 사용 기록 |

## lib/dmCardContent.ts
DM 카드뉴스 콘텐츠 상수 및 카테고리 정의.

## 발송 흐름
```
템플릿 선택 → 고객 선택 → 메시지 미리보기 → 발송 → dm_logs 기록
```

## 자동 변수
템플릿 내 `{name}`, `{advisor}`, `{phone}` 등 치환 지원.
