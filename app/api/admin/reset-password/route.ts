import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const initialPassword = "123456"

function getServiceSupabase() {
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

export async function POST(req: NextRequest) {
  const serviceSupabase = getServiceSupabase()

  if (!serviceSupabase) {
    return NextResponse.json({ error: "서버 전용 서비스 키가 설정되지 않았습니다." }, { status: 500 })
  }

  const { targetUserId, requesterId } = await req.json()

  if (!targetUserId || !requesterId) {
    return NextResponse.json({ error: "초기화 대상과 요청자 정보가 필요합니다." }, { status: 400 })
  }

  const { data: requester, error: requesterError } = await serviceSupabase
    .from("users")
    .select("rank, role, role_level")
    .eq("id", requesterId)
    .maybeSingle()

  if (requesterError) {
    return NextResponse.json({ error: requesterError.message }, { status: 500 })
  }

  const roleValues = [requester?.rank, requester?.role, requester?.role_level]
    .map((value) => String(value || "").toLowerCase())

  if (!roleValues.includes("master")) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 })
  }

  const { error: authError } = await serviceSupabase.auth.admin.updateUserById(targetUserId, {
    password: initialPassword,
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
