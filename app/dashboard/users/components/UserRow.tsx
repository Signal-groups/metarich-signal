"use client"

import { useEffect, useState } from "react"

export type CompanyType = "metarich" | "external"
export type AppRank = "guest" | "agent" | "manager" | "leader" | "headquarters" | "master"
export type ServiceLevel = "guest" | "general" | "pro" | "premium" | "event"

export type StaffUser = {
  id: string
  email?: string | null
  name?: string | null
  phone?: string | null
  rank?: string | null
  role?: string | null
  role_level?: string | null
  is_approved?: boolean | string | number | null
  created_at?: string | null
  company_type?: CompanyType | string | null
  company_name?: string | null
  headquarter?: string | null
  headquarter_name?: string | null
  department?: string | null
  department_name?: string | null
  team?: string | null
  branch?: string | null
  branch_name?: string | null
  crm_access?: boolean | string | number | null
  office_access?: boolean | string | number | null
  claim_access?: boolean | string | number | null
  branding_access?: boolean | string | number | null
  service_level?: ServiceLevel | string | null
  premium_expires_at?: string | null
  pre_event_level?: string | null
  must_change_password?: boolean | string | number | null
}

type EditableStaffUser = StaffUser & {
  rank: AppRank
  is_approved: boolean
  company_type: CompanyType
  company_name: string
  crm_access: boolean
  office_access: boolean
  claim_access: boolean
  branding_access: boolean
  service_level: ServiceLevel
  premium_expires_at: string | null
  pre_event_level: string | null
}

interface UserRowProps {
  user: StaffUser
  selected: boolean
  onSelectChange: (id: string, checked: boolean) => void
  onDraftChange: (user: StaffUser) => void
  onSave: (user: StaffUser) => Promise<boolean>
  onResetPassword: (user: StaffUser) => void
  onDelete: (user: StaffUser) => void
  onEventRegister?: (user: StaffUser, preLevel: ServiceLevel) => Promise<void>
  viewerId: string
  isDuplicate?: boolean
  compact?: boolean
}

const rankOptions: Array<{ value: AppRank; label: string }> = [
  { value: "guest", label: "게스트 (타사/미승인)" },
  { value: "agent", label: "설계사" },
  { value: "manager", label: "지점장" },
  { value: "leader", label: "사업부장" },
  { value: "headquarters", label: "본부장" },
  { value: "master", label: "마스터" },
]

const serviceLevels: Array<{ id: ServiceLevel; label: string; desc: string; tone: string }> = [
  { id: "guest", label: "게스트", desc: "가입 신청 후 미승인", tone: "bg-slate-100 text-slate-600" },
  { id: "general", label: "일반", desc: "승인 + 메인/상담도구", tone: "bg-sky-100 text-sky-700" },
  { id: "pro", label: "프로", desc: "일반 + 사무실 업무", tone: "bg-indigo-100 text-indigo-700" },
  { id: "premium", label: "프리미엄", desc: "CRM 고객관리 포함", tone: "bg-emerald-100 text-emerald-700" },
]

const permissionColumns: Array<{ key: keyof EditableStaffUser; label: string }> = [
  { key: "crm_access", label: "CRM" },
  { key: "office_access", label: "사무실" },
  { key: "claim_access", label: "청구" },
  { key: "branding_access", label: "브랜딩" },
]

export function enabled(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1"
}

function isFutureDate(value?: string | null) {
  if (!value) return false
  const time = new Date(value).getTime()
  return Number.isFinite(time) && time > Date.now()
}

export function getServiceLevel(user: StaffUser): ServiceLevel {
  if (!enabled(user.is_approved)) return "guest"
  if (String(user.service_level || "") === "event") {
    if (isFutureDate(user.premium_expires_at)) return "event"
    const prev = user.pre_event_level as ServiceLevel
    if (prev && ["general","pro","premium"].includes(prev)) return prev
  }
  if (enabled(user.crm_access)) return "premium"
  if (enabled(user.office_access)) return "pro"
  return "general"
}

function eventExpiryDate(days = 15) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

export function eventRegisterPatch(preLevel: ServiceLevel): Partial<EditableStaffUser> {
  return {
    service_level: "event",
    pre_event_level: preLevel,
    premium_expires_at: eventExpiryDate(15),
    is_approved: true,
  }
}

export function eventRevertPatch(preLevel: ServiceLevel): Partial<EditableStaffUser> {
  return { ...servicePatch(preLevel), pre_event_level: null }
}

export function servicePatch(level: ServiceLevel): Partial<EditableStaffUser> {
  if (level === "guest") {
    return { service_level: "guest", premium_expires_at: null, is_approved: false, crm_access: false, office_access: false, claim_access: false, branding_access: false }
  }
  if (level === "general") {
    return { service_level: "general", premium_expires_at: null, is_approved: true, crm_access: false, office_access: false, claim_access: false, branding_access: false }
  }
  if (level === "pro") {
    return { service_level: "pro", premium_expires_at: null, is_approved: true, crm_access: false, office_access: true, claim_access: false, branding_access: false }
  }
  if (level === "event") {
    return { service_level: "event", premium_expires_at: eventExpiryDate(15), is_approved: true, crm_access: true, office_access: true, claim_access: false, branding_access: false }
  }
  return { service_level: "premium", premium_expires_at: null, is_approved: true, crm_access: true, office_access: true, claim_access: false, branding_access: false }
}

function serviceLabel(level: ServiceLevel) {
  return serviceLevels.find((item) => item.id === level)?.label || "일반"
}

function toRank(user: StaffUser): AppRank {
  const value = String(user.rank || user.role || user.role_level || "agent")
  if (["guest", "agent", "manager", "leader", "headquarters", "master"].includes(value)) return value as AppRank
  return "agent"
}

export function getCompanyLabel(user: StaffUser) {
  return getCompanyType(user) === "external" ? "타사" : "메타리치"
}

export function getCompanyType(user: StaffUser): CompanyType {
  if (user.company_type === "external") return "external"
  if (user.company_type === "metarich") return "metarich"
  if ((user.headquarter || user.headquarter_name) === "대외") return "external"
  return "metarich"
}

export function getCompanyName(user: StaffUser) {
  return user.company_name || (getCompanyType(user) === "external" ? user.department || "" : "메타리치 시그널그룹")
}

export function getAffiliation(user: StaffUser) {
  if (getCompanyType(user) === "external") return getCompanyName(user) || "회사 미입력"

  return [
    user.headquarter || user.headquarter_name,
    user.department || user.department_name,
    user.team || user.branch_name || user.branch,
  ].filter(Boolean).join(" / ") || "소속 미입력"
}

export function getHeadquarter(user: StaffUser) {
  return String(user.headquarter || user.headquarter_name || "")
}

export function getRank(user: StaffUser) {
  return toRank(user)
}

export function formatDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\.$/, "")
}

export default function UserRow({ user, selected, onSelectChange, onDraftChange, onSave, onResetPassword, onDelete, onEventRegister, viewerId, isDuplicate = false, compact = false }: UserRowProps) {
  const [draft, setDraft] = useState<EditableStaffUser>(() => ({
    ...user,
    rank: toRank(user),
    is_approved: enabled(user.is_approved),
    company_type: getCompanyType(user),
    company_name: getCompanyName(user),
    crm_access: enabled(user.crm_access),
    office_access: enabled(user.office_access),
    claim_access: enabled(user.claim_access),
    branding_access: enabled(user.branding_access),
    service_level: getServiceLevel(user),
    premium_expires_at: user.premium_expires_at || "",
    pre_event_level: user.pre_event_level ?? null,
  }))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft({
      ...user,
      rank: toRank(user),
      is_approved: enabled(user.is_approved),
      company_type: getCompanyType(user),
      company_name: getCompanyName(user),
      crm_access: enabled(user.crm_access),
      office_access: enabled(user.office_access),
      claim_access: enabled(user.claim_access),
      branding_access: enabled(user.branding_access),
      service_level: getServiceLevel(user),
      premium_expires_at: user.premium_expires_at || "",
      pre_event_level: user.pre_event_level ?? null,
    })
  }, [user])

  const save = async () => {
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
    }
  }

  const patchDraft = (patch: Partial<EditableStaffUser>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch }
      onDraftChange(next)
      return next
    })
  }

  const currentService = getServiceLevel(draft)
  const isActiveEvent = currentService === "event" && isFutureDate(draft.premium_expires_at)
  const eventDaysLeft = isActiveEvent && draft.premium_expires_at
    ? Math.max(0, Math.ceil((new Date(draft.premium_expires_at).getTime() - Date.now()) / 86400000))
    : 0
  const canRegisterEvent = ["general", "pro"].includes(currentService)
  const canRegisterEventOrActive = canRegisterEvent || isActiveEvent

  const eventSection = onEventRegister && canRegisterEventOrActive ? (
    <div className="mt-2">
      {isActiveEvent ? (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <span className="text-[11px] font-black text-amber-700">🎁 이벤트 진행 중 ({eventDaysLeft}일 남음)</span>
          <span className="text-[10px] font-bold text-amber-500">만료 {formatDate(draft.premium_expires_at)}</span>
          <button
            type="button"
            onClick={async () => {
              const preLevel = (draft.pre_event_level as ServiceLevel) || "general"
              const patch = eventRevertPatch(preLevel)
              patchDraft(patch as Partial<EditableStaffUser>)
              await onEventRegister(draft, preLevel)
            }}
            className="ml-auto rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700 hover:bg-amber-200"
          >
            해제
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={async () => {
            const patch = eventRegisterPatch(currentService)
            patchDraft(patch as Partial<EditableStaffUser>)
            await onEventRegister(draft, currentService)
          }}
          className="w-full rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-[12px] font-black text-amber-700 hover:bg-amber-100"
        >
          🎁 이벤트 15일권 등록 (프리미엄 체험)
        </button>
      )}
    </div>
  ) : null

  const permissionButtons = (
    <>
    <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-5">
      {serviceLevels.map((level) => {
        const active = currentService === level.id
        return (
          <button
            key={level.id}
            type="button"
            onClick={() => patchDraft(servicePatch(level.id))}
            title={level.desc}
            className={`rounded-lg px-2 py-2 text-[12px] font-black transition ${
              active
                ? "bg-[#1a3a6e] text-white shadow-sm"
                : `${level.tone} hover:ring-2 hover:ring-[#1a3a6e]/20`
            }`}
          >
            {level.label}
          </button>
        )
      })}
      {isActiveEvent && (
        <p className="col-span-2 text-[10px] font-black text-amber-700 xl:col-span-5">
          🎁 이벤트 {eventDaysLeft}일 남음 · 만료 {formatDate(draft.premium_expires_at)}
        </p>
      )}
    </div>
    {eventSection}
    </>
  )

  if (compact) {
    return (
      <article className={`rounded-2xl border p-4 shadow-sm ${isDuplicate ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white"}`}>
        <div className="flex items-start justify-between gap-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={selected} onChange={(event) => onSelectChange(user.id, event.target.checked)} className="h-5 w-5 accent-[#1a3a6e]" />
            <span>
              <span className="block text-base font-black text-slate-900">
                {user.name || "이름 없음"}
                {isDuplicate && <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-600">⚠️ 중복의심</span>}
              </span>
              <span className="block text-xs font-bold text-slate-400">{user.email || "-"}</span>
            </span>
          </label>
          {!draft.is_approved && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-700">승인대기</span>}
        </div>

        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">구분</dt><dd className="font-black text-slate-700">{getCompanyLabel(user)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">소속</dt><dd className="text-right font-bold text-slate-700">{getAffiliation(user)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">연락처</dt><dd className="font-bold text-slate-700">{user.phone || "-"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="font-bold text-slate-400">가입일</dt><dd className="font-bold text-slate-700">{formatDate(user.created_at)}</dd></div>
        </dl>

        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={draft.company_type}
              onChange={(event) => {
                const nextType = event.target.value as CompanyType
                patchDraft({
                  company_type: nextType,
                  company_name: nextType === "metarich" ? "메타리치 시그널그룹" : draft.company_name,
                  headquarter: nextType === "external" ? "대외" : "",
                  department: nextType === "external" ? draft.company_name : "",
                })
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-900"
            >
              <option value="metarich">메타리치</option>
              <option value="external">타사</option>
            </select>
            <input
              value={draft.company_name}
              readOnly={draft.company_type === "metarich"}
              onChange={(event) => patchDraft({ company_name: event.target.value, department: event.target.value })}
              placeholder="회사명"
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-900 outline-none read-only:bg-slate-100 read-only:text-slate-500"
            />
          </div>
          <select value={draft.rank} onChange={(event) => patchDraft({ rank: event.target.value as AppRank })} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-900">
            {rankOptions.map((rank) => <option key={rank.value} value={rank.value}>{rank.label}</option>)}
          </select>
          {permissionButtons}
          <button type="button" onClick={() => patchDraft({ is_approved: !draft.is_approved })} className={`rounded-xl px-4 py-3 text-sm font-black ${draft.is_approved ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
            {draft.is_approved ? "승인 완료" : "승인 대기"}
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-[#1a3a6e] px-4 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "저장 중" : "저장"}</button>
            <button type="button" onClick={() => onResetPassword(user)} disabled={user.id === viewerId} className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">초기화</button>
            <button type="button" onClick={() => onDelete(user)} disabled={user.id === viewerId} className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">삭제</button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <tr className={`${isDuplicate ? "bg-orange-50" : draft.is_approved ? "bg-white" : "bg-amber-50"} align-middle transition hover:bg-slate-50`}>
      <td className="p-4"><input type="checkbox" checked={selected} onChange={(event) => onSelectChange(user.id, event.target.checked)} className="h-5 w-5 accent-[#1a3a6e]" /></td>
      <td className="p-4">
        <p className="font-black text-slate-900">
          {user.name || "이름 없음"}
          {!draft.is_approved && <span className="ml-1 text-[12px] text-rose-500">승인대기</span>}
          {isDuplicate && <span className="ml-1.5 inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-black text-orange-600">⚠️ 중복</span>}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-400">{user.email || "-"}</p>
        <p className="mt-1 text-xs font-bold text-slate-400">{user.phone || "-"}</p>
      </td>
      <td className="p-4">
        <div className="grid min-w-[210px] gap-2">
          <select
            value={draft.company_type}
            onChange={(event) => {
              const nextType = event.target.value as CompanyType
              patchDraft({
                company_type: nextType,
                company_name: nextType === "metarich" ? "메타리치 시그널그룹" : draft.company_name,
                headquarter: nextType === "external" ? "대외" : "",
                department: nextType === "external" ? draft.company_name : "",
              })
            }}
            className="rounded-xl border border-slate-200 bg-white p-2 text-[13px] font-black text-slate-900"
          >
            <option value="metarich">메타리치</option>
            <option value="external">타사</option>
          </select>
          <input
            value={draft.company_name}
            readOnly={draft.company_type === "metarich"}
            onChange={(event) => patchDraft({ company_name: event.target.value, department: event.target.value })}
              placeholder="회사명"
              className="rounded-xl border border-slate-200 bg-white p-2 text-[13px] font-black text-slate-900 outline-none read-only:bg-slate-50 read-only:text-slate-400"
            />
        </div>
      </td>
      <td className="p-4">
        <select value={draft.rank} onChange={(event) => patchDraft({ rank: event.target.value as AppRank })} className="w-full rounded-xl border border-slate-200 bg-white p-2 text-[13px] font-black text-slate-900">
          {rankOptions.map((rank) => <option key={rank.value} value={rank.value}>{rank.label}</option>)}
        </select>
      </td>
      <td className="p-4">
        {permissionButtons}
      </td>
      <td className="p-4">
        <button
          type="button"
          onClick={() => patchDraft({ is_approved: !draft.is_approved })}
          className={`w-full rounded-xl px-3 py-2 text-[12px] font-black ${draft.is_approved ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
        >
          {draft.is_approved ? "승인 완료" : "승인 대기"}
        </button>
      </td>
      <td className="whitespace-nowrap p-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-[#1a3a6e] px-3 py-2 text-[12px] font-black text-white disabled:opacity-50">
            {saving ? "저장 중" : "저장"}
          </button>
          <button type="button" onClick={() => onResetPassword(user)} disabled={user.id === viewerId} className="rounded-xl bg-rose-500 px-3 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
            초기화
          </button>
          <button type="button" onClick={() => onDelete(user)} disabled={user.id === viewerId} className="rounded-xl bg-slate-700 px-3 py-2 text-[12px] font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">
            삭제
          </button>
        </div>
      </td>
    </tr>
  )
}
