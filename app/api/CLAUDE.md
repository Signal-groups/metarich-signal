# app/api/ - API 라우트

## 라우트 목록
| 경로 | 역할 |
|---|---|
| `/api/ai-coach` | AI 코치 응답 생성 (lib/aiCoach.ts 사용) |
| `/api/crm-upload-analyze` | GPT 분석 요청 중계 |
| `/api/notify-signup` | 신규 가입 알림 발송 |
| `/api/admin/reset-password` | 관리자 비밀번호 초기화 (초기값: 123456) |

## 공통 패턴
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json()
  // ...
  return NextResponse.json({ ... })
}
```

## 인증
- 관리자 라우트: Supabase 서비스 롤 키 사용 (`createClient(url, SERVICE_KEY)`)
- 일반 라우트: 클라이언트 토큰 헤더 검증

## 에러 응답 형식
```json
{ "error": "메시지" }  // status 400/401/500
```
