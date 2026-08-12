import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE

function createServiceClient() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function createUserClient(token: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

function getBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization") || ""
  const [type, token] = header.split(" ")
  if (type?.toLowerCase() !== "bearer" || !token) return null
  return token
}

export async function POST(req: NextRequest) {
  const token = getBearerToken(req)
  if (!token) {
    return NextResponse.json({ error: "마스터 로그인 확인이 필요합니다. 다시 로그인 후 삭제해주세요." }, { status: 401 })
  }

  // JWT 검증: anon 클라이언트 사용
  const userClient = createUserClient(token)
  const { data: { user: authUser }, error: authUserError } = await userClient.auth.getUser()
  if (authUserError || !authUser?.id) {
    return NextResponse.json({ error: "로그인 세션을 확인하지 못했습니다. 다시 로그인 후 삭제해주세요." }, { status: 401 })
  }

  const { targetUserId } = await req.json().catch(() => ({}))
  if (!targetUserId) {
    return NextResponse.json({ error: "삭제할 직원 정보가 필요합니다." }, { status: 400 })
  }

  // 서비스 클라이언트로 admin 작업 수행
  const serviceSupabase = createServiceClient()
  if (!serviceSupabase) {
    return NextResponse.json({
      error: "삭제 실패: Vercel 환경변수에 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
      setupRequired: true,
    }, { status: 500 })
  }

  const requesterId = authUser.id
  const { data: requester, error: requesterError } = await serviceSupabase
    .from("users")
    .select("rank, role, role_level")
    .eq("id", requesterId)
    .maybeSingle()

  if (requesterError) {
    return NextResponse.json({ error: "마스터 권한 확인 실패: " + requesterError.message }, { status: 500 })
  }

  const roles = [requester?.rank, requester?.role, requester?.role_level]
    .map((value) => String(value || "").toLowerCase().trim())

  if (!roles.includes("master")) {
    return NextResponse.json({ error: "마스터만 직원을 삭제할 수 있습니다." }, { status: 403 })
  }

  if (targetUserId === requesterId) {
    return NextResponse.json({ error: "자신의 계정은 삭제할 수 없습니다." }, { status: 400 })
  }

  const { error: authError } = await serviceSupabase.auth.admin.deleteUser(targetUserId)
  const authStatus = (authError as { status?: number } | null)?.status
  const authMissing = authStatus === 404 || String(authError?.message || "").toLowerCase().includes("not found")
  if (authError && !authMissing) {
    return NextResponse.json({ error: "계정 삭제 실패: " + authError.message }, { status: 500 })
  }

  const { error: profileError } = await serviceSupabase
    .from("users")
    .delete()
    .eq("id", targetUserId)

  if (profileError) {
    return NextResponse.json({ error: "프로필 삭제 실패: " + profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
