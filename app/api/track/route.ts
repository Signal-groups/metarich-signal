import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const PAGE_LABELS: Record<string, string> = {
  "/crm":                          "CRM 홈",
  "/crm/customers":                "고객관리",
  "/crm/customers/new":            "고객 신규등록",
  "/crm/analysis":                 "보장분석",
  "/crm/upload":                   "AI 업로드",
  "/crm/dm":                       "DM 발송",
  "/crm/dm/message":               "DM 메시지",
  "/crm/dm-cards":                 "DM 카드",
  "/crm/family":                   "가족관리",
  "/crm/alerts":                   "알림",
  "/crm/reports":                  "리포트",
  "/crm/content-studio":           "콘텐츠 스튜디오",
  "/crm/card-consult":             "카드상담",
  "/crm/settings":                 "설정",
  "/crm/board":                    "업무보드",
  "/crm/renewals":                 "만기·갱신",
  "/insurance-tools":              "보험도구",
  "/insurance-tools/premium-compare": "보험료비교",
  "/insurance-tools/surgery":      "수술비 계산",
  "/insurance-tools/diagnosis":    "진단비 계산",
  "/insurance-tools/disability":   "장해 계산",
  "/insurance-tools/coverage-stats":"담보 통계",
  "/insurance-tools/car-accident": "교통사고",
  "/financial-calc":               "재무계산기",
  "/sales-book":                   "영업자료",
  "/sales-master":                 "영업마스터",
  "/branding-builder":             "브랜딩빌더",
  "/claim-documents":              "청구서류",
  "/product-all":                  "전체상품",
  "/insurance-survey":             "보험설문",
  "/usage-guide":                  "이용가이드",
  "/dashboard":                    "대시보드",
  "/content-studio":               "콘텐츠 스튜디오(공통)",
  "/coverage-pro":                 "보장분석 PRO",
  "/financial-planner":            "재무설계 PRO",
  "/financial-portfolio":          "재무설계 포트폴리오",
  "/first-coverage-check":         "첫 상담 보장체크",
  "/insurance-tools/proposal":     "제안서 생성",
  "/underwriting":                 "인수 기준 확인",
  "/gongsi":                       "보험상품 공시",
  "/card-consult":                 "카드상담",
  "/dm":                           "DM(공통)",
}

function resolveLabel(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname]
  const sorted = Object.keys(PAGE_LABELS).sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (pathname.startsWith(key + "/") || pathname === key) return PAGE_LABELS[key]
  }
  return pathname
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: NextRequest) {
  const serviceSupabase = createServiceClient()
  if (!serviceSupabase) {
    return NextResponse.json({ error: "server config error" }, { status: 500 })
  }

  // Bearer 토큰으로 사용자 확인
  const token = req.headers.get("authorization")?.split(" ")[1]
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(token)
  if (authError || !user?.id) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 })
  }

  let body: { pathname?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const { pathname } = body
  if (!pathname) return NextResponse.json({ error: "missing pathname" }, { status: 400 })

  // 경로 정규화 (동적 세그먼트 제거)
  const basePath = pathname.replace(/\/[0-9a-f-]{8,}(\/.*)?$/, "")
  const page = basePath || pathname
  const page_label = resolveLabel(page)

  const { error: insertError } = await serviceSupabase
    .from("user_activity_logs")
    .insert({ user_id: user.id, page, page_label, action: "page_view" })

  if (insertError) {
    console.error("[/api/track] insert error:", insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
