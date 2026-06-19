import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE
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

  const body = await req.json().catch(() => ({}))
  const id = String(body.id || "").trim()
  const email = String(body.email || "").trim()
  if (!id || !email) return NextResponse.json({ error: "가입자 정보가 부족합니다." }, { status: 400 })

  const isExternal = body.accountType === "external"
  const profile = {
    id,
    email,
    name: String(body.name || email.split("@")[0] || "이름 미입력").trim(),
    phone: String(body.phone || "").trim(),
    role: isExternal ? "guest" : "agent",
    role_level: isExternal ? "guest" : "staff",
    rank: isExternal ? "guest" : "agent",
    headquarter: isExternal ? "대외" : String(body.headquarter || ""),
    headquarter_name: isExternal ? "대외" : String(body.headquarter || ""),
    department: isExternal ? String(body.companyName || "") : String(body.department || ""),
    department_name: isExternal ? String(body.companyName || "") : String(body.department || ""),
    team: isExternal ? String(body.position || "") : String(body.branch || ""),
    branch_name: isExternal ? String(body.position || "") : String(body.branch || ""),
    company_type: isExternal ? "external" : "metarich",
    company_name: isExternal ? String(body.companyName || "") : "메타리치 시그널그룹",
    is_approved: false,
    crm_access: false,
    office_access: !isExternal,
    claim_access: false,
    branding_access: false,
  }

  const { data, error } = await serviceSupabase
    .from("users")
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ user: data })
}
