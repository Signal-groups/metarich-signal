import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const INITIAL_PASSWORD = "123456"
// lib/roles.ts의 MASTER_EMAIL과 동일하게 유지
const MASTER_EMAIL = "qodbtjq@naver.com"

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return null

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function isMasterRequester(user: { rank?: string | null; role?: string | null; role_level?: string | null; email?: string | null } | null): boolean {
  if (!user) return false
  const fields = [user.rank, user.role, user.role_level]
    .map((v) => String(v || "").toLowerCase().trim())
  if (fields.includes("master")) return true
  // 이메일 기반 마스터 확인 (normalizeRole과 동일 로직)
  const identifier = String(user.email || "").toLowerCase().trim()
  return identifier.includes(MASTER_EMAIL)
}

export async function POST(req: NextRequest) {
  const serviceSupabase = createServiceClient()
  if (!serviceSupabase) {
    return NextResponse.json({ error: "서버 전용 Supabase 설정이 필요합니다." }, { status: 500 })
  }

  const { targetUserId, requesterId } = await req.json().catch(() => ({}))
  if (!targetUserId || !requesterId) {
    return NextResponse.json({ error: "초기화 대상과 요청자 정보가 필요합니다." }, { status: 400 })
  }

  // email 컬럼도 함께 조회해 이메일 기반 마스터 확인 지원
  const { data: requester, error: requesterError } = await serviceSupabase
    .from("users")
    .select("rank, role, role_level, email")
    .eq("id", requesterId)
    .maybeSingle()

  if (requesterError) {
    return NextResponse.json({ error: requesterError.message }, { status: 500 })
  }

  // users 테이블에 email이 없을 경우 auth.admin으로 보완
  let requesterEmail = requester?.email as string | null
  if (!requesterEmail) {
    const { data: authUser } = await serviceSupabase.auth.admin.getUserById(requesterId)
    requesterEmail = authUser?.user?.email ?? null
  }

  if (!isMasterRequester({ ...requester, email: requesterEmail })) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const { error: authError } = await serviceSupabase.auth.admin.updateUserById(targetUserId, {
    password: INITIAL_PASSWORD,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const { error: updateError } = await serviceSupabase
    .from("users")
    .update({ must_change_password: true })
    .eq("id", targetUserId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
