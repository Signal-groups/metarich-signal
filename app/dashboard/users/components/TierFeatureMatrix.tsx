"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { CONSULTING_TOOLS } from "@/lib/consultingTools"

// ──────────────────────────────────────
// 타입
// ──────────────────────────────────────
export type FeatureTier = "general" | "pro" | "premium" | "hidden"
export type TierConfig = Record<string, FeatureTier>

type FeatureDef = {
  id: string
  label: string
  group: string
  defaultTier: FeatureTier
  system?: boolean
}

// ──────────────────────────────────────
// 시스템 권한 (tool 이외)
// ──────────────────────────────────────
const SYSTEM_FEATURES: FeatureDef[] = [
  { id: "office_access",   label: "사무실 업무",       group: "시스템 권한", defaultTier: "pro",     system: true },
  { id: "crm_access",      label: "CRM 고객관리",      group: "시스템 권한", defaultTier: "premium", system: true },
  { id: "claim_access",    label: "AI 청구 자동화",    group: "시스템 권한", defaultTier: "premium", system: true },
  { id: "branding_access", label: "브랜딩 AI",         group: "시스템 권한", defaultTier: "premium", system: true },
]

// ──────────────────────────────────────
// 카테고리 → 그룹명 매핑
// ──────────────────────────────────────
const CAT_GROUP: Record<string, string> = {
  face:      "고객 상담 도구",
  customer:  "고객 상담 도구",
  coverage:  "보장 분석",
  claims:    "수술 및 장해",
  financial: "재무설계",
  planning:  "조회 도구",
}
const GROUP_ORDER = ["고객 상담 도구", "보장 분석", "수술 및 장해", "재무설계", "조회 도구", "시스템 권한"]

// ──────────────────────────────────────
// 컨설팅 툴에서 editable=true 항목 추출
// ──────────────────────────────────────
function buildFeatures(): FeatureDef[] {
  const toolFeatures: FeatureDef[] = CONSULTING_TOOLS
    .filter((t) => t.editable === true)
    .map((t) => {
      let defaultTier: FeatureTier = "general"
      if (t.access === "approved" || (t.staffOnly && t.premium)) {
        defaultTier = "pro"
      }
      return {
        id: t.id,
        label: t.label,
        group: CAT_GROUP[t.category ?? ""] ?? "조회 도구",
        defaultTier,
      }
    })
  return [...toolFeatures, ...SYSTEM_FEATURES]
}

const ALL_FEATURES = buildFeatures()

function isEnabled(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1"
}

function getDefaultConfig(): TierConfig {
  const cfg: TierConfig = {}
  for (const f of ALL_FEATURES) cfg[f.id] = f.defaultTier
  return cfg
}

// ──────────────────────────────────────
// 등급 계층 순서 (낮은 → 높은)
// ──────────────────────────────────────
const TIER_IDX: Record<FeatureTier, number> = { general: 0, pro: 1, premium: 2, hidden: 99 }

/** userTier가 featureTier 이상이면 true (hidden 제외) */
export function tierCanAccess(featureTier: FeatureTier, userTier: FeatureTier): boolean {
  if (featureTier === "hidden") return false
  return TIER_IDX[userTier] >= TIER_IDX[featureTier]
}

const DB_KEY = "tier_access_config"

// ──────────────────────────────────────
// Props
// ──────────────────────────────────────
interface TierFeatureMatrixProps {
  isMaster: boolean
  users: Array<{
    service_level?: string | null
    is_approved?: boolean | string | number | null
    pre_event_level?: string | null
  }>
  onApplyTier: (tier: "general" | "pro" | "premium", config: TierConfig) => void
  onConfigLoaded?: (config: TierConfig) => void
}

// ──────────────────────────────────────
// 컴포넌트
// ──────────────────────────────────────
export default function TierFeatureMatrix({
  isMaster,
  users,
  onApplyTier,
  onConfigLoaded,
}: TierFeatureMatrixProps) {
  const [config, setConfig]     = useState<TierConfig>(getDefaultConfig())
  const [saved, setSaved]       = useState<TierConfig>(getDefaultConfig())
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const dirty = JSON.stringify(config) !== JSON.stringify(saved)

  // ── 초기 로드 ──
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from("team_settings")
        .select("value")
        .eq("key", DB_KEY)
        .maybeSingle()
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value) as TierConfig
          const merged = { ...getDefaultConfig(), ...parsed }
          setConfig(merged)
          setSaved(merged)
          onConfigLoaded?.(merged)
        } catch {}
      } else {
        onConfigLoaded?.(getDefaultConfig())
      }
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 셀 변경 ──
  function handleChange(featureId: string, tier: FeatureTier) {
    if (!isMaster) return
    setConfig((prev) => ({ ...prev, [featureId]: tier }))
  }

  // ── 저장 ──
  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from("team_settings")
      .upsert({ key: DB_KEY, value: JSON.stringify(config) }, { onConflict: "key" })
    if (error) {
      alert("저장 실패: " + error.message)
    } else {
      const copy = { ...config }
      setSaved(copy)
      onConfigLoaded?.(copy)
      alert("기능별 등급 설정이 저장되었습니다.")
    }
    setSaving(false)
  }

  // ── 등급별 인원 수 ──
  function countLevel(tier: "general" | "pro" | "premium") {
    return users.filter((u) => {
      const sl = String(u.service_level || "")
      if (tier === "general") return sl === "general" && isEnabled(u.is_approved)
      if (tier === "pro")     return sl === "pro"     && isEnabled(u.is_approved)
      if (tier === "premium") return (sl === "premium" || sl === "event") && isEnabled(u.is_approved)
      return false
    }).length
  }

  // ── 그룹별 기능 목록 ──
  const groups = GROUP_ORDER.filter((g) => ALL_FEATURES.some((f) => f.group === g))

  // ── 등급 메타 ──
  const TIER_META = [
    { id: "general"  as FeatureTier, label: "일반",    headerColor: "text-sky-600",     bg: "bg-sky-50",     btn: "bg-sky-600 hover:bg-sky-700",         ring: "bg-sky-500"     },
    { id: "pro"      as FeatureTier, label: "프로",    headerColor: "text-indigo-600",   bg: "bg-indigo-50",  btn: "bg-indigo-600 hover:bg-indigo-700",   ring: "bg-indigo-500"  },
    { id: "premium"  as FeatureTier, label: "프리미엄", headerColor: "text-emerald-600", bg: "bg-emerald-50", btn: "bg-emerald-600 hover:bg-emerald-700", ring: "bg-emerald-500" },
    { id: "hidden"   as FeatureTier, label: "비활성",  headerColor: "text-slate-400",   bg: "bg-slate-50",   btn: "",                                    ring: "bg-slate-400"   },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#1a3a6e]" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── 상단 설명 + 저장 버튼 ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">기능별 접근 등급 설정</h2>
            <p className="mt-1 text-[13px] font-bold text-slate-500">
              각 기능의 최소 접근 등급을 지정합니다. 상위 등급은 하위 등급 기능을 자동 포함합니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-bold text-sky-700">일반 설정 → 프로·프리미엄 자동 포함</span>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-700">프로 설정 → 프리미엄 자동 포함</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">프리미엄 설정 → 프리미엄만 이용</span>
            </div>
          </div>
          {isMaster && (
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`shrink-0 rounded-xl px-5 py-2.5 text-[13px] font-black text-white transition ${
                dirty ? "bg-[#1a2744] hover:bg-[#2d4a8a]" : "cursor-not-allowed bg-slate-300"
              }`}
            >
              {saving ? "저장 중…" : dirty ? "● 변경사항 저장" : "✓ 저장됨"}
            </button>
          )}
        </div>
      </div>

      {/* ── 등급 요약 카드 ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(["general", "pro", "premium"] as const).map((tier) => {
          const meta = TIER_META.find((m) => m.id === tier)!
          const accessible = ALL_FEATURES.filter((f) => tierCanAccess(config[f.id] ?? f.defaultTier, tier)).length
          const exclusive  = ALL_FEATURES.filter((f) => (config[f.id] ?? f.defaultTier) === tier).length
          const count      = countLevel(tier)
          return (
            <div key={tier} className={`rounded-2xl border-2 p-4 ${tier === "general" ? "border-sky-300 bg-sky-50" : tier === "pro" ? "border-indigo-300 bg-indigo-50" : "border-emerald-300 bg-emerald-50"}`}>
              <p className={`text-[11px] font-black uppercase tracking-widest ${meta.headerColor}`}>{meta.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{count}<span className="text-sm font-bold text-slate-500 ml-1">명</span></p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">접근 가능 {accessible}개 기능 <span className="text-slate-400">(전용 {exclusive}개)</span></p>
              {isMaster && (
                <button
                  onClick={() => onApplyTier(tier, config)}
                  className={`mt-3 w-full rounded-xl py-2 text-[11px] font-black text-white transition ${meta.btn}`}
                >
                  전체 적용 ({count}명)
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 매트릭스 테이블 ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50">
                <th className="py-3 pl-5 pr-3 text-left text-[12px] font-black text-slate-600">기능</th>
                {/* 게스트 — 항상 차단 */}
                <th className="w-16 px-2 py-3 text-center">
                  <span className="text-[11px] font-black text-slate-400">게스트</span>
                </th>
                {TIER_META.map((m) => (
                  <th key={m.id} className="w-16 px-2 py-3 text-center">
                    <span className={`text-[11px] font-black ${m.headerColor}`}>{m.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const features = ALL_FEATURES.filter((f) => f.group === group)
                return (
                  <>
                    {/* 그룹 헤더 */}
                    <tr key={`g-${group}`} className="border-y border-slate-100 bg-slate-50/80">
                      <td colSpan={6} className="py-2 pl-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {group}
                      </td>
                    </tr>
                    {features.map((feature, idx) => {
                      const currentTier = config[feature.id] ?? feature.defaultTier
                      return (
                        <tr
                          key={feature.id}
                          className={`border-b border-slate-100 transition-colors ${idx % 2 === 1 ? "bg-slate-50/40" : ""} ${isMaster ? "hover:bg-blue-50/40" : ""}`}
                        >
                          {/* 기능명 */}
                          <td className="py-3 pl-5 pr-3">
                            <span className="text-[13px] font-bold text-slate-800">{feature.label}</span>
                            {feature.system && (
                              <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-400">시스템</span>
                            )}
                          </td>

                          {/* 게스트 — 항상 ✗ */}
                          <td className="px-2 py-3 text-center">
                            <span className="text-[16px] text-slate-300 select-none">✗</span>
                          </td>

                          {/* 등급별 라디오 */}
                          {TIER_META.map((meta) => {
                            const isSelected   = currentTier === meta.id
                            const isInherited  = meta.id !== "hidden" && !isSelected && tierCanAccess(currentTier, meta.id)
                            return (
                              <td key={meta.id} className="px-2 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => isMaster && handleChange(feature.id, meta.id)}
                                  disabled={!isMaster}
                                  title={meta.label}
                                  className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                                    isSelected
                                      ? `${meta.ring} border-transparent`
                                      : isInherited
                                      ? "border-slate-200 bg-white"
                                      : "border-slate-200 bg-white"
                                  } ${isMaster ? "hover:border-slate-400 cursor-pointer" : "cursor-default"}`}
                                >
                                  {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                                  {!isSelected && isInherited && (
                                    <div className={`h-1.5 w-1.5 rounded-full opacity-40 ${meta.ring}`} />
                                  )}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-bold text-slate-500">
          <span className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded-full bg-indigo-500 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-white" />
            </div>
            선택된 최소 등급 (라디오)
          </span>
          <span className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
            </div>
            상속으로 이용 가능
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-300 text-base leading-none">✗</span>
            항상 차단
          </span>
          {isMaster && dirty && (
            <span className="ml-auto text-amber-600">⚠ 저장되지 않은 변경사항 있음</span>
          )}
        </div>
      </div>
    </div>
  )
}
