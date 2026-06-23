import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type PeriodKey = "7d" | "30d" | "90d"

const PERIOD_DAYS: Record<PeriodKey, number> = { "7d": 7, "30d": 30, "90d": 90 }

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function getBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization") || ""
  const [type, token] = header.split(" ")
  if (type?.toLowerCase() !== "bearer" || !token) return null
  return token
}

function isMaster(profile: Record<string, unknown> | null) {
  return [profile?.rank, profile?.role, profile?.role_level]
    .map((value) => String(value || "").toLowerCase().trim())
    .includes("master")
}

export async function GET(req: NextRequest) {
  const serviceSupabase = createServiceClient()
  if (!serviceSupabase) {
    return NextResponse.json({ error: "서버 전용 Supabase 설정이 필요합니다." }, { status: 500 })
  }

  const token = getBearerToken(req)
  if (!token) return NextResponse.json({ error: "마스터 로그인 확인이 필요합니다." }, { status: 401 })

  const { data: authUser, error: authError } = await serviceSupabase.auth.getUser(token)
  if (authError || !authUser.user?.id) {
    return NextResponse.json({ error: "로그인 세션을 확인하지 못했습니다." }, { status: 401 })
  }

  const { data: requester, error: requesterError } = await serviceSupabase
    .from("users")
    .select("rank, role, role_level")
    .eq("id", authUser.user.id)
    .maybeSingle()

  if (requesterError) return NextResponse.json({ error: requesterError.message }, { status: 500 })
  if (!isMaster(requester)) return NextResponse.json({ error: "마스터만 사용량을 조회할 수 있습니다." }, { status: 403 })

  const period = (req.nextUrl.searchParams.get("period") || "30d") as PeriodKey
  const days = PERIOD_DAYS[period] || PERIOD_DAYS["30d"]
  const since = new Date(Date.now() - days * 86400_000).toISOString()

  const userId = req.nextUrl.searchParams.get("userId")
  let logsQuery = serviceSupabase
    .from("user_activity_logs")
    .select("user_id, page, page_label, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000)
  if (userId) logsQuery = logsQuery.eq("user_id", userId)
  const { data: logs, error: logsError } = await logsQuery

  if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 })

  const uids = [...new Set((logs || []).map((log: any) => log.user_id).filter(Boolean))]
  const { data: users, error: usersError } = uids.length
    ? await serviceSupabase.from("users").select("id, name, email").in("id", uids)
    : { data: [], error: null }

  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

  return NextResponse.json({ logs: logs || [], users: users || [] })
}
