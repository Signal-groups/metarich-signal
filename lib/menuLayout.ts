import { CONSULTING_TOOLS, type ConsultingTool } from "./consultingTools"

export const MENU_LAYOUT_KEY = "menu_layout_v1"

export type MenuLayoutZone = "desktopHome" | "desktopSidebar" | "mobileQuick" | "mobileMore" | "hidden"

export type MenuLayout = Record<MenuLayoutZone, string[]>

export const MENU_LAYOUT_LABELS: Record<MenuLayoutZone, string> = {
  desktopHome: "PC 메인",
  desktopSidebar: "사이드바",
  mobileQuick: "모바일 빠른실행",
  mobileMore: "모바일 전체메뉴",
  hidden: "숨김",
}

const VALID_TOOL_IDS = new Set(CONSULTING_TOOLS.map((tool) => tool.id))

export function defaultMenuLayout(): MenuLayout {
  return {
    desktopHome: [
      "show_first_coverage_check",
      "show_insu",
      "show_proposal",
      "show_financial_portfolio",
      "show_premium_compare",
      "show_surgery",
      "show_disease",
      "show_cont",
      "show_coverage_stats",
      "show_underwriting",
      "show_calc",
    ],
    desktopSidebar: ["show_exam", "show_dm"],
    mobileQuick: [
      "show_first_coverage_check",
      "show_insu",
      "show_proposal",
      "show_financial_portfolio",
      "show_premium_compare",
      "show_surgery",
    ],
    mobileMore: [
      "show_disease",
      "show_cont",
      "show_dm",
      "show_coverage_stats",
      "show_underwriting",
      "show_calc",
      "show_exam",
      "show_health_kr",
      "show_hira",
      "show_knia",
      "show_car_accident",
      "show_disability",
      "show_finance",
      "show_gongsi",
      "show_card_consult",
      "show_insurance_survey",
    ],
    hidden: [],
  }
}

function cleanIds(value: unknown, used: Set<string>) {
  if (!Array.isArray(value)) return []
  const ids: string[] = []
  value.forEach((id) => {
    if (typeof id !== "string") return
    if (!VALID_TOOL_IDS.has(id) || used.has(id)) return
    used.add(id)
    ids.push(id)
  })
  return ids
}

export function normalizeMenuLayout(input: unknown): MenuLayout {
  const base = defaultMenuLayout()
  const source = input && typeof input === "object" ? (input as Partial<MenuLayout>) : {}
  const hiddenUsed = new Set<string>()
  const hidden = cleanIds(source.hidden ?? base.hidden, hiddenUsed)
  const hiddenSet = new Set(hidden)
  const desktopUsed = new Set<string>(hidden)
  const mobileUsed = new Set<string>(hidden)
  const next: MenuLayout = {
    desktopHome: cleanIds(source.desktopHome ?? base.desktopHome, desktopUsed),
    desktopSidebar: cleanIds(source.desktopSidebar ?? base.desktopSidebar, desktopUsed),
    mobileQuick: cleanIds(source.mobileQuick ?? base.mobileQuick, mobileUsed),
    mobileMore: cleanIds(source.mobileMore ?? base.mobileMore, mobileUsed),
    hidden,
  }

  CONSULTING_TOOLS.forEach((tool) => {
    if (!desktopUsed.has(tool.id) && !hiddenSet.has(tool.id)) next.desktopHome.push(tool.id)
    if (!mobileUsed.has(tool.id) && !hiddenSet.has(tool.id)) next.mobileMore.push(tool.id)
  })

  return next
}

export function parseMenuLayout(value: unknown): MenuLayout {
  if (typeof value === "string") {
    try {
      return normalizeMenuLayout(JSON.parse(value))
    } catch {
      return defaultMenuLayout()
    }
  }
  return normalizeMenuLayout(value)
}

export function isToolHidden(layout: MenuLayout, id: string) {
  return layout.hidden.includes(id)
}

export function orderToolsByLayout<T extends Pick<ConsultingTool, "id">>(tools: T[], order: string[]): T[] {
  return [...tools].sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}
