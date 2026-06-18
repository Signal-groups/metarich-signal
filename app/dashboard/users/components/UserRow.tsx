"use client"

import { useEffect, useState } from "react"

export type CompanyType = "metarich" | "external"
export type AppRank = "guest" | "agent" | "manager" | "leader" | "headquarters" | "master"

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
}

interface UserRowProps {
  user: StaffUser
  selected: boolean
  onSelectChange: (id: string, checked: boolean) => void
  onDraftChange: (user: StaffUser) => void
  onSave: (user: StaffUser) => Promise<boolean>
  onResetPassword: (user: StaffUser) => void
  onDelete: (user: StaffUser) => void
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

const permissionColumns = [
  { key: "crm_access", label: "CRM" },
  { key: "office_access", label: "사무실" },
  { key: "claim_access", label: "청구" },
  { key: "branding_access", label: "브랜딩" },
] as const

export function enabled(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1"
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

export default function UserRow({ user, selected, onSelectChange, onDraftChange, onSave, onResetPassword, onDelete, viewerId, isDuplicate = false, compact = false }: UserRowProps) {
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

  const permissionButtons = (
    <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4">
      {permissionColumns.map((permission) => {
        const active = draft[permission.key]
        const isGuestRank = draft.rank === "guest"
  const disabled = !draft.is_approved || isGuestRank
        return (
          <button
            key={permission.key}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && patchDraft({ [permission.key]: !active } as Partial<EditableStaffUser>)}
            title={disabled ? (isGuestRank ? "게스트(타사)는 권한을 부여할 수 없습니다." : "승인 후 설정할 수 있습니다.") : permission.label}
            className={`rounded-lg px-2 py-2 text-[12px] font-black transition ${
              disabled
                ? "cursor-not-allowed bg-slate-100 text-slate-400 opacity-40"
                : active
                  ? "bg-[#1a3a6e] text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {permission.label}
          </button>
        )
      })}
    </div>
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
            className="rounded-xl border border-slate-200 bg-white p-2 text-[13px] font-black text-slate-900 outline-none read-only:bg-slate-100 read-only:text-slate-500"
          />
        </div>
      </td>
      <td className="max-w-[260px] p-4 text-sm font-bold text-slate-600">{getAffiliation(draft)}</td>
      <td className="p-4">
        <select value={draft.rank} onChange={(event) => patchDraft({ rank: event.target.value as AppRank })} className="rounded-xl border border-slate-200 bg-white p-2 text-[13px] font-black text-slate-900">
          {rankOptions.map((rank) => <option key={rank.value} value={rank.value}>{rank.label}</option>)}
        </select>
      </td>
      <td className="p-4">{permissionButtons}</td>
      <td className="p-4">
        <button type="button" onClick={() => patchDraft({ is_approved: !draft.is_approved })} className={`rounded-xl px-3 py-2 text-[12px] font-black ${draft.is_approved ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
          {draft.is_approved ? "승인" : "미승인"}
        </button>
      </td>
      <td className="p-4 text-sm font-bold text-slate-500">{formatDate(user.created_at)}</td>
      <td className="p-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-[#1a3a6e] px-4 py-2 text-[12px] font-black text-white disabled:opacity-50">{saving ? "저장 중" : "저장"}</button>
          <button type="button" onClick={() => onResetPassword(user)} disabled={user.id === viewerId} className="rounded-xl bg-rose-500 px-4 py-2 text-[12px] font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40">초기화</button>
          <button
            type="button"
            onClick={() => onDelete(user)}
            disabled={user.id === viewerId}
            title={isDuplicate ? "중복 계정 — 삭제 권장" : "계정 삭제"}
            className={`rounded-xl px-4 py-2 text-[12px] font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${isDuplicate ? "animate-pulse bg-orange-500 hover:bg-orange-600" : "bg-slate-400 hover:bg-red-600"}`}
          >
            {isDuplicate ? "⚠️ 삭제" : "삭제"}
          </button>
        </div>
      </td>
    </tr>
  )
}
