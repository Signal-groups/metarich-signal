import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: NextRequest) {
  const serviceSupabase = createServiceClient()
  if (!serviceSupabase) {
    return NextResponse.json({ error: "서버 전용 Supabase 설정이 필요합니다." }, { status: 500 })
  }

  const { targetUserId, requesterId } = await req.json().catch(() => ({}))
  if (!targetUserId || !requesterId) {
    return NextResponse.json({ error: "대상과 요청자 정보가 필요합니다." }, { status: 400 })
  }

  // 요청자 마스터 확인
  const { data: requester } = await serviceSupabase
    .from("users")
    .select("rank, role, role_level")
    .eq("id", requesterId)
    .maybeSingle()

  const roles = [requester?.rank, requester?.role, requester?.role_level]
    .map((v) => String(v || "").toLowerCase().trim())
  if (!roles.includes("master")) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  // 자기 자신 삭제 방지
  if (targetUserId === requesterId) {
    return NextResponse.json({ error: "자신의 계정은 삭제할 수 없습니다." }, { status: 400 })
  }

  // public.users 먼저 삭제
  const { error: profileError } = await serviceSupabase
    .from("users")
    .delete()
    .eq("id", targetUserId)

  if (profileError) {
    return NextResponse.json({ error: "프로필 삭제 실패: " + profileError.message }, { status: 500 })
  }

  // auth.users 삭제 (service role 필요)
  const { error: authError } = await serviceSupabase.auth.admin.deleteUser(targetUserId)
  if (authError) {
    return NextResponse.json({ error: "계정 삭제 실패: " + authError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
