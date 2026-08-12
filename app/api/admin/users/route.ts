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

// 사용자 JWT 검증용 anon 클라이언트 (토큰은 getUser(token)에 직접 전달)
function createAnonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function getBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization") || ""
  const [type, token] = header.split(" ")
  if (type?.toLowerCase() !== "bearer" || !token) return null
  return token
}

const MASTER_EMAIL = "qodbtjq@naver.com"

function isMaster(profile: Record<string, unknown> | null) {
  if (!profile) return false
  const fields = [profile.rank, profile.role, profile.role_level]
    .map((value) => String(value || "").toLowerCase().trim())
  if (fields.includes("master")) return true
  // 이메일 기반 마스터 확인 (normalizeRole과 동일 로직)
  const email = String(profile.email || "").toLowerCase().trim()
  return email.includes(MASTER_EMAIL)
}

function profileFromAuthUser(user: any) {
  const metadata = (user.user_metadata || {}) as Record<string, any>
  const email = String(user.email || "").trim()
  const isExternal = metadata.accountType === "external"
  return {
    id: user.id,
    email,
    name: metadata.name || email.split("@")[0] || "이름 미입력",
    phone: String(metadata.phone || "").trim(),
    role: isExternal ? "guest" : "agent",
    role_level: isExternal ? "guest" : "staff",
    rank: isExternal ? "guest" : "agent",
    headquarter: isExternal ? "대외" : metadata.headquarter || "",
    headquarter_name: isExternal ? "대외" : metadata.headquarter || "",
    department: isExternal ? metadata.companyName || "" : metadata.department || "",
    department_name: isExternal ? metadata.companyName || "" : metadata.department || "",
    team: isExternal ? metadata.position || "" : metadata.branch || "",
    branch_name: isExternal ? metadata.position || "" : metadata.branch || "",
    company_type: isExternal ? "external" : "metarich",
    company_name: isExternal ? metadata.companyName || "" : "메타리치 시그널그룹",
    is_approved: false,
    service_level: "guest",
    premium_expires_at: null,
    crm_access: false,
    office_access: false,
    claim_access: false,
    branding_access: false,
  }
}

export async function GET(req: NextRequest) {
  const token = getBearerToken(req)
  if (!token) return NextResponse.json({ error: "마스터 로그인 확인이 필요합니다." }, { status: 401 })

  // admin 작업을 위한 service role 클라이언트
  const serviceSupabase = createServiceClient()
  if (!serviceSupabase) {
    return NextResponse.json({ error: "서버 전용 Supabase 설정이 필요합니다." }, { status: 500 })
  }

  // JWT 검증: anon 클라이언트로 token을 직접 전달
  const anonClient = createAnonClient()
  const { data: { user: authUser }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !authUser?.id) {
    return NextResponse.json({ error: "로그인 세션을 확인하지 못했습니다." }, { status: 401 })
  }

  // 마스터 권한 확인 (service client로 RLS 우회)
  const { data: requester, error: requesterError } = await serviceSupabase
    .from("users")
    .select("rank, role, role_level, email")
    .eq("id", authUser.id)
    .maybeSingle()

  if (requesterError) return NextResponse.json({ error: requesterError.message }, { status: 500 })
  const requesterWithEmail = { ...requester, email: requester?.email || authUser.email }
  if (!isMaster(requesterWithEmail)) return NextResponse.json({ error: "마스터만 직원 목록을 조회할 수 있습니다." }, { status: 403 })

  const { data: existing, error: usersError } = await serviceSupabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })

  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

  const existingIds = new Set((existing || []).map((user: any) => user.id))
  const missingProfiles: any[] = []
  let page = 1
  const perPage = 1000

  while (page < 20) {
    const { data, error } = await serviceSupabase.auth.admin.listUsers({ page, perPage })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const authUsers = data.users || []
    for (const user of authUsers) {
      if (!existingIds.has(user.id) && user.email) missingProfiles.push(profileFromAuthUser(user))
    }
    if (authUsers.length < perPage) break
    page += 1
  }

  if (missingProfiles.length > 0) {
    const { error: insertError } = await serviceSupabase.from("users").upsert(missingProfiles, { onConflict: "id" })
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { data: refreshed, error: refreshedError } = await serviceSupabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })

  if (refreshedError) return NextResponse.json({ error: refreshedError.message }, { status: 500 })
  return NextResponse.json({ users: refreshed || [], recovered: missingProfiles.length })
}
