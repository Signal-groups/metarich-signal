import { supabase } from "@/lib/supabase"

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
  "/card-consult":                 "카드상담(공통)",
  "/dm":                           "DM(공통)",
}

function resolveLabel(pathname: string): string {
  // exact match
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname]
  // prefix match (longest first)
  const sorted = Object.keys(PAGE_LABELS).sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (pathname.startsWith(key + "/") || pathname === key) return PAGE_LABELS[key]
  }
  return pathname
}

export async function trackPageView(userId: string, pathname: string) {
  if (!userId || !pathname) return
  // 고객 상세 등 동적 경로는 베이스 경로로 정규화
  const basePath = pathname.replace(/\/[0-9a-f-]{8,}(\/.*)?$/, "")
  const page = basePath || pathname
  const page_label = resolveLabel(page)

  void supabase.from("user_activity_logs").insert({
    user_id: userId,
    page,
    page_label,
    action: "page_view",
  })
}
