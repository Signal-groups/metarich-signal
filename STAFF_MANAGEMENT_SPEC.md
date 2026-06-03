# 직원 관리 전용 페이지 — Codex 구현 지침

> **이 문서가 유일한 진실 소스(Single Source of Truth)입니다.**
> 작업 전 반드시 이 문서를 끝까지 읽고 시작하세요.
> 의문이 있으면 구현하지 말고 이 문서를 먼저 수정하세요.

---

## 0. 핵심 원칙

```
① 기존 파일 수정 금지 목록을 반드시 지킨다 (섹션 9 참조)
② Supabase users 테이블 스키마는 건드리지 않는다 (SQL은 별도 적용 완료 가정)
③ 기존 인증/로그인 로직(supabase auth)은 수정 금지
④ lib/roles.ts의 함수(normalizeRole, canManageRole 등)를 그대로 활용
⑤ 스타일은 기존 대시보드와 동일한 Tailwind 클래스 톤 유지
⑥ 모든 파일 작성 후 tail -5 && wc -l 확인
⑦ npx tsc --noEmit 통과 필수
```

---

## 1. 전체 구조

### 신규 생성 파일 목록

```
app/
  dashboard/
    users/
      page.tsx                    ← 직원 관리 메인 페이지 (마스터 전용)
      components/
        UserTable.tsx             ← 직원 목록 테이블
        UserFilters.tsx           ← 검색 + 필터 바
        UserRow.tsx               ← 테이블 행 (개별 직원)
        BulkActions.tsx           ← 일괄처리 버튼 모음
        ResetPasswordModal.tsx    ← 비밀번호 초기화 확인 모달
  api/
    admin/
      reset-password/
        route.ts                  ← 비밀번호 123456 초기화 API
```

### 수정 파일 목록 (최소한으로)

```
app/dashboard/components/Sidebar.tsx   ← 직원 관리 NavItem 1개 추가만
```

---

## 2. Supabase SQL (이미 적용 완료 가정)

아래 컬럼이 `users` 테이블에 추가된 것으로 가정하고 코딩한다.
없으면 optional chaining(`?.`)으로 안전하게 처리.

```sql
-- 이미 적용됨. 참고용.
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT 'metarich';
-- 값: 'metarich' | 'external'
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
```

---

## 3. API 라우트: /api/admin/reset-password/route.ts

### 요구사항

- Method: POST
- 요청자가 `master` 등급인지 서버에서 검증
- `SUPABASE_SERVICE_ROLE_KEY` 환경변수 사용 (클라이언트에 절대 노출 금지)
- `auth.admin.updateUserById()`로 비밀번호 123456 초기화
- 초기화 성공 시 `users` 테이블의 `must_change_password = true` 업데이트

### 구현 패턴 (기존 crm-upload-analyze/route.ts 참고)

```typescript
// app/api/admin/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { targetUserId, requesterId } = await req.json()

  // 1. 요청자 검증: users 테이블에서 rank 확인
  const { data: requester } = await serviceSupabase
    .from("users")
    .select("rank, role, role_level")
    .eq("id", requesterId)
    .single()

  const role = requester?.rank || requester?.role || requester?.role_level || ""
  if (role !== "master") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  // 2. 비밀번호 초기화
  const { error: authError } = await serviceSupabase.auth.admin.updateUserById(
    targetUserId,
    { password: "123456" }
  )
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // 3. must_change_password = true 설정
  await serviceSupabase
    .from("users")
    .update({ must_change_password: true })
    .eq("id", targetUserId)

  return NextResponse.json({ success: true })
}
```

---

## 4. 메인 페이지: app/dashboard/users/page.tsx

### 접근 제어

- `supabase.auth.getUser()`로 현재 사용자 확인
- `users` 테이블에서 해당 유저 정보 조회
- `normalizeRole(user) !== "master"` 이면 `/dashboard`로 redirect
- 로딩 중에는 스피너 표시

### 레이아웃 구조

```
<div className="min-h-screen bg-[#eef3fb]">
  {/* 상단 헤더 */}
  <header>
    - 제목: "직원 관리"
    - 서브: "메타리치 시그널그룹 직원 전체 관리"
    - 우측: 현재 총 직원 수 배지
  </header>

  <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
    {/* 검색 + 필터 바 */}
    <UserFilters />

    {/* 일괄 처리 버튼 (체크박스 선택 시에만 표시) */}
    <BulkActions />

    {/* 직원 목록 테이블 */}
    <UserTable />
  </main>
</div>
```

### 스타일 기준

- 배경: `bg-[#eef3fb]` (기존 대시보드와 동일)
- 카드: `bg-white rounded-2xl shadow-sm border border-slate-200`
- 버튼 primary: `bg-[#1a3a6e] text-white rounded-xl`
- 버튼 accent: `bg-[#C9A96E] text-slate-900 rounded-xl`
- 위험(초기화): `bg-rose-500 text-white rounded-xl`
- 폰트: `font-black` (강조), `font-bold` (일반), `font-semibold` (보조)

---

## 5. UserFilters.tsx

### 검색창

```
placeholder="이름, 이메일, 연락처 검색..."
- 입력 시 실시간 필터링 (debounce 300ms)
- 검색 대상: name, email, phone
```

### 필터 드롭다운

```
[전체 | 메타리치 | 타사]   ← company_type 필터
[본부 전체▼]               ← headquarter 필터 (메타리치만 해당)
[등급 전체▼]               ← rank 필터
[승인 전체▼]               ← is_approved 필터
```

### 정렬 버튼

```
[가입일 최신순] [이름순] [본부순]
```

### Props 인터페이스

```typescript
interface UserFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  companyType: "all" | "metarich" | "external"
  onCompanyTypeChange: (v: "all" | "metarich" | "external") => void
  headquarter: string
  onHeadquarterChange: (v: string) => void
  rank: string
  onRankChange: (v: string) => void
  approved: "all" | "true" | "false"
  onApprovedChange: (v: "all" | "true" | "false") => void
  sortBy: "created_at" | "name" | "headquarter"
  onSortByChange: (v: "created_at" | "name" | "headquarter") => void
  totalCount: number
  filteredCount: number
}
```

---

## 6. UserTable.tsx

### 테이블 컬럼 (PC 기준, 모바일은 카드형으로 전환)

| 컬럼 | 내용 |
|------|------|
| ☐ | 체크박스 (일괄처리용) |
| 이름 | name + 미승인 시 "승인대기" 뱃지 |
| 구분 | company_type (메타리치/타사) |
| 소속 | company_name (타사) 또는 headquarter / department / team (메타리치) |
| 직책 | rank (등급 select) |
| 권한 | CRM/청구/브랜딩/사무실 아이콘 토글 4개 |
| 승인 | is_approved 토글 버튼 |
| 가입일 | created_at (YYYY.MM.DD) |
| 액션 | [저장] [초기화] 버튼 |

### 반응형

- PC (`md` 이상): 전체 테이블
- 모바일 (`md` 미만): 카드 레이아웃으로 전환

### Props 인터페이스

```typescript
interface UserTableProps {
  users: UserRow[]
  selectedIds: Set<string>
  onSelectChange: (id: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onSave: (user: UserRow) => Promise<void>
  onResetPassword: (user: UserRow) => void
  viewerId: string
}
```

---

## 7. UserRow.tsx

### 로컬 상태 관리

각 행은 자체 로컬 state로 편집 중 값을 관리한다.
저장 버튼 클릭 시에만 DB에 반영.

### 권한 토글 4개

```typescript
// users 테이블의 컬럼명 확인 후 그대로 사용
// 기존 AdminPopups.tsx에서 사용하는 권한 컬럼명과 동일하게
const PERMISSION_COLUMNS = [
  { key: "can_use_crm",      label: "CRM",   icon: "📊" },
  { key: "can_use_claim",    label: "청구",   icon: "📋" },
  { key: "can_use_branding", label: "브랜딩", icon: "🎨" },
  { key: "can_use_office",   label: "사무실", icon: "🏢" },
]
```

> ⚠️ 실제 컬럼명은 기존 AdminPopups.tsx의 저장 로직에서 확인해서 맞출 것.

### 저장 로직

```typescript
// 기존 AdminPopups.tsx의 handleUserSave 패턴을 그대로 참조
// users 테이블 update + 조직 옵션 sync
```

---

## 8. BulkActions.tsx

### 표시 조건

`selectedIds.size > 0`일 때만 렌더링.

### 버튼 목록

```
[선택 {N}명 승인]        → is_approved = true 일괄 update
[선택 {N}명 승인 취소]   → is_approved = false 일괄 update
[등급 일괄 변경▼]        → select 후 일괄 rank update
```

### Props 인터페이스

```typescript
interface BulkActionsProps {
  selectedIds: Set<string>
  onBulkApprove: (approve: boolean) => Promise<void>
  onBulkRankChange: (rank: string) => Promise<void>
}
```

---

## 9. ResetPasswordModal.tsx

### 내용

```
제목: "비밀번호 초기화"
본문: "{이름}님의 비밀번호를 임시 비밀번호 123456으로 초기화합니다.
      초기화 후 해당 직원에게 로그인 후 비밀번호 변경을 안내해주세요."
버튼: [취소] [초기화]
```

### 동작

```
1. [초기화] 클릭
2. POST /api/admin/reset-password { targetUserId, requesterId }
3. 로딩 스피너 표시
4. 성공 → "초기화 완료" 토스트 메시지
5. 실패 → "초기화 실패: {에러 메시지}" alert
```

---

## 10. Sidebar.tsx 수정 (최소한만)

### 추가할 NavItem 1개

기존 `canManageStaff && <NavItem ... />` 블록 바로 위에 추가:

```tsx
{isMaster && (
  <NavItem
    icon="직원관리"
    label="직원 관리"
    active={false}
    onClick={() => window.open(`${window.location.origin}/dashboard/users`, "_blank", "noopener,noreferrer")}
  />
)}
```

### NavItem icon 처리

`ToolIcon` 함수에 케이스 추가:

```typescript
case "직원관리":
  return <Users className={className} />
// Users는 이미 lucide-react에서 import 됨
```

### 기존 "조직 관리" 인라인 패널

- **건드리지 않는다.** 빠른 승인용으로 그대로 유지.
- 다만 패널 안에 안내 텍스트 한 줄 추가:
  ```
  "상세 관리는 직원 관리 페이지에서 ↗"
  ```
  → 이 텍스트에 `/dashboard/users` 링크 추가 (새 탭)

---

## 11. 데이터 페칭 패턴

```typescript
// page.tsx에서 전체 직원 목록 1회 로드
const { data: users } = await supabase
  .from("users")
  .select("*")
  .order("created_at", { ascending: false })

// 필터/검색/정렬은 클라이언트에서 처리 (재요청 없이)
// 저장/승인/권한 변경만 supabase update 호출
```

---

## 12. 금지 사항 (절대 수정 금지 파일)

```
lib/supabase.ts                          ← 인증 클라이언트
lib/roles.ts                             ← 역할 판별 함수
app/login/page.tsx                       ← 로그인 페이지
app/signup/                              ← 회원가입
app/api/notify-signup/                   ← 가입 알림 API
app/dashboard/components/AdminPopups.tsx ← 기존 팝업 (건드리면 안 됨)
app/dashboard/components/MasterView.tsx  ← 마스터 대시보드
app/dashboard/page.tsx                   ← 대시보드 메인
```

---

## 13. 완료 체크리스트

```
□ app/api/admin/reset-password/route.ts 생성
□ app/dashboard/users/page.tsx 생성 (마스터 권한 체크 포함)
□ app/dashboard/users/components/UserFilters.tsx 생성
□ app/dashboard/users/components/UserTable.tsx 생성
□ app/dashboard/users/components/UserRow.tsx 생성
□ app/dashboard/users/components/BulkActions.tsx 생성
□ app/dashboard/users/components/ResetPasswordModal.tsx 생성
□ app/dashboard/components/Sidebar.tsx — NavItem 1개 + ToolIcon 케이스 추가만
□ npx tsc --noEmit 통과
□ 각 파일 tail -5 && wc -l 확인
```

---

## 14. 환경변수

`.env.local`에 아래 키가 있어야 한다. 없으면 추가 요청:

```
SUPABASE_SERVICE_ROLE_KEY=...   ← reset-password API에서 서버 전용 사용
```

기존 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 그대로.
