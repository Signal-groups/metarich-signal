"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { normalizeRole } from "@/lib/roles"
import { supabase } from "@/lib/supabase"
import BulkActions from "./components/BulkActions"
import ResetPasswordModal from "./components/ResetPasswordModal"
import UserFilters from "./components/UserFilters"
import UserTable from "./components/UserTable"
import UsageAnalytics from "./components/UsageAnalytics"
import { enabled, getCompanyName, getCompanyType, getHeadquarter, getRank, type StaffUser } from "./components/UserRow"

type CompanyTypeFilter = "all" | "metarich" | "external"
type ApprovedFilter = "all" | "true" | "false"
type SortKey = "created_at" | "name" | "headquarter"
type StaffTab = "users" | "roles" | "analytics"
type RolePresetId = "guest" | "guest_approved" | "agent" | "full"

function roleLevelFor(rank: string) {
  if (rank === "headquarters") return "headquarters"
  if (rank === "leader") return "director"
  return rank
}

const rolePresets: Array<{
  id: RolePresetId
  title: string
  desc: string
  enabledMenus: string[]
  blockedMenus: string[]
}> = [
  {
    id: "guest",
    title: "게스트",
    desc: "승인 전 상태입니다. 기본 공개 도구만 확인할 수 있습니다.",
    enabledMenus: ["기본 공개 메뉴"],
    blockedMenus: ["사무실 업무", "보장분석PRO", "재무설계PRO", "제안서 생성"],
  },
  {
    id: "guest_approved",
    title: "게스트 승인",
    desc: "기본 상담 도구까지 열어주고, 설계사 전용 업무는 막아둡니다.",
    enabledMenus: ["보장별 통계", "보험료 비교", "수술비 검색", "금융계산기", "재무설계 포트폴리오"],
    blockedMenus: ["사무실 업무", "보장분석PRO", "재무설계PRO", "제안서 생성"],
  },
  {
    id: "agent",
    title: "설계사 승인",
    desc: "상담과 제안 업무를 진행하는 기본 설계사 권한입니다.",
    enabledMenus: ["사무실 업무", "보장분석PRO", "재무설계PRO", "첫 상담 보장체크", "제안서 생성"],
    blockedMenus: ["CRM", "청구 자동화", "브랜딩 AI"],
  },
  {
    id: "full",
    title: "전체 권한",
    desc: "관리자가 별도 업무까지 맡기는 직원에게 부여합니다.",
    enabledMenus: ["사무실 업무", "CRM", "청구 자동화", "브랜딩 AI", "전체 상담 도구"],
    blockedMenus: [],
  },
]

function rolePresetPayload(presetId: RolePresetId) {
  if (presetId === "guest") {
    return {
      is_approved: false,
      role: "guest",
      role_level: "guest",
      rank: "guest",
      crm_access: false,
      office_access: false,
      claim_access: false,
      branding_access: false,
    }
  }

  if (presetId === "guest_approved") {
    return {
      is_approved: true,
      role: "guest",
      role_level: "guest",
      rank: "guest",
      crm_access: false,
      office_access: false,
      claim_access: false,
      branding_access: false,
    }
  }

  if (presetId === "agent") {
    return {
      is_approved: true,
      role: "agent",
      role_level: "agent",
      rank: "agent",
      crm_access: false,
      office_access: true,
      claim_access: false,
      branding_access: false,
    }
  }

  return {
    is_approved: true,
    role: "agent",
    role_level: "agent",
    rank: "agent",
    crm_access: true,
    office_access: true,
    claim_access: true,
    branding_access: true,
  }
}

export default function StaffManagementPage() {
  const router = useRouter()
  const [viewer, setViewer] = useState<StaffUser | null>(null)
  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [resetUser, setResetUser] = useState<StaffUser | null>(null)
  const [search, setSearch] = useState("")
  const [companyType, setCompanyType] = useState<CompanyTypeFilter>("all")
  const [headquarter, setHeadquarter] = useState("")
  const [rank, setRank] = useState("")
  const [approved, setApproved] = useState<ApprovedFilter>("all")
  const [sortBy, setSortBy] = useState<SortKey>("created_at")
  const [savingAll, setSavingAll] = useState(false)
  const [activeTab, setActiveTab] = useState<StaffTab>("users")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      alert("로그인 세션을 확인하지 못했습니다. 다시 로그인해주세요.")
      return
    }

    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      alert("직원 목록을 불러오지 못했습니다: " + (json.error || "알 수 없는 오류"))
      return
    }

    const data = json.users || []

    setUsers(((data || []) as StaffUser[]).map((user) => ({
      ...user,
      company_type: getCompanyType(user),
      company_name: getCompanyName(user),
    })))
  }, [])

  const init = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const userId = session.user?.id
      if (!userId) return

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (!profile) return router.replace("/dashboard")

      const merged = { ...profile, email: session.user?.email ?? profile.email }
      if (normalizeRole(merged) !== "master") {
        return router.replace("/dashboard")
      }

      setViewer(merged as StaffUser)
      await loadUsers()
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [loadUsers, router])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        if (!session) { router.replace("/login?redirectTo=/dashboard/users"); return }
        void init()
      }
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") void init()
      if (event === "SIGNED_OUT") {
        setTimeout(async () => {
          const { data: { session: s } } = await supabase.auth.getSession()
          if (!s) router.replace("/login?redirectTo=/dashboard/users")
        }, 800)
      }
    })
    return () => subscription.unsubscribe()
  }, [init, router])

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return [...users]
      .filter((user) => {
        const uct = getCompanyType(user)
        const matchesCompany = companyType === "all" || uct === companyType
        const matchesHQ = !headquarter || getHeadquarter(user) === headquarter
        const matchesRank = !rank || getRank(user) === rank
        const matchesApproved = approved === "all" || String(enabled(user.is_approved)) === approved
        const matchesSearch = !keyword || [user.name, user.email, user.phone].some((v) => String(v || "").toLowerCase().includes(keyword))
        return matchesCompany && matchesHQ && matchesRank && matchesApproved && matchesSearch
      })
      .sort((a, b) => {
        if (sortBy === "name") return String(a.name || "").localeCompare(String(b.name || ""), "ko")
        if (sortBy === "headquarter") return getHeadquarter(a).localeCompare(getHeadquarter(b), "ko")
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      })
  }, [approved, companyType, headquarter, rank, search, sortBy, users])

  // 같은 이름+전화번호 조합인 사용자를 중복으로 감지
  const duplicateIds = useMemo(() => {
    const keyMap = new Map<string, string[]>()
    users.forEach((u) => {
      const name = String(u.name || "").trim()
      const phone = String(u.phone || "").replace(/[^0-9]/g, "")
      if (!name || !phone) return
      const key = `${name}__${phone}`
      const existing = keyMap.get(key) || []
      keyMap.set(key, [...existing, u.id])
    })
    const ids = new Set<string>()
    keyMap.forEach((idList) => { if (idList.length > 1) idList.forEach((id) => ids.add(id)) })
    return ids
  }, [users])

  const deleteUser = async (user: StaffUser) => {
    const label = user.name || user.email || "이 계정"
    const isDup = duplicateIds.has(user.id)
    const msg = isDup
      ? `⚠️ 중복 의심 계정입니다.\n[${label}] (${user.email})\n\n정말 삭제하시겠습니까?\n삭제 후 복구 불가합니다.`
      : `[${label}] (${user.email})\n\n정말 삭제하시겠습니까?\n삭제 후 복구 불가합니다.`
    if (!confirm(msg)) return

    setDeletingId(user.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert("로그인 세션을 확인하지 못했습니다. 다시 로그인 후 삭제해주세요.")
        return
      }

      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ targetUserId: user.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { alert("삭제 실패: " + (json.error || "알 수 없는 오류")); return }
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(user.id); return n })
    } catch {
      alert("삭제 중 오류가 발생했습니다.")
    } finally {
      setDeletingId(null)
    }
  }

  const onSelectChange = (id: string, checked: boolean) => {
    setSelectedIds((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n })
  }

  const onSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      filteredUsers.forEach((u) => { checked ? n.add(u.id) : n.delete(u.id) })
      return n
    })
  }

  const saveUser = async (user: StaffUser, silent = false) => {
    const isApproved = enabled(user.is_approved)
    const nextRank = String(user.rank || "agent")
    const company = getCompanyType(user)
    const companyName = getCompanyName(user).trim()

    if (company === "external" && !companyName) {
      alert((user.name || user.email || "직원") + "의 회사명을 입력해주세요.")
      return false
    }

    const isGuest = nextRank === "guest"
    const payload = {
      is_approved: isApproved, role: nextRank, role_level: roleLevelFor(nextRank), rank: nextRank,
      company_type: company,
      company_name: company === "external" ? companyName : "메타리치 시그널그룹",
      headquarter: company === "external" ? "대외" : user.headquarter || "",
      headquarter_name: company === "external" ? "대외" : user.headquarter_name || user.headquarter || "",
      department: company === "external" ? companyName : user.department || "",
      department_name: company === "external" ? companyName : user.department_name || user.department || "",
      team: user.team || "", branch_name: user.branch_name || user.team || "",
      crm_access: (!isApproved || isGuest) ? false : enabled(user.crm_access),
      office_access: (!isApproved || isGuest) ? false : enabled(user.office_access),
      claim_access: (!isApproved || isGuest) ? false : enabled(user.claim_access),
      branding_access: (!isApproved || isGuest) ? false : enabled(user.branding_access),
    }

    const { error } = await supabase.from("users").update(payload).eq("id", user.id)
    if (error) { alert("저장 실패: " + error.message); return false }
    setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, ...payload } : item))
    if (!silent) alert((user.name || user.email || "직원") + " 정보가 저장되었습니다.")
    return true
  }

  const saveAllVisibleUsers = async () => {
    if (filteredUsers.length === 0) return
    if (!confirm("현재 표시된 직원 " + filteredUsers.length.toLocaleString() + "명의 승인과 권한 설정을 일괄 저장합니다.")) return
    setSavingAll(true)
    let saved = 0
    for (const user of filteredUsers) {
      const ok = await saveUser(user, true)
      if (!ok) { setSavingAll(false); alert(saved.toLocaleString() + "명 저장 후 중단되었습니다."); return }
      saved++
    }
    setSavingAll(false)
    alert(saved.toLocaleString() + "명의 직원 설정이 일괄 저장되었습니다.")
  }

  const bulkApprove = async (approve: boolean) => {
    const ids = Array.from(selectedIds)
    const payload = approve
      ? { is_approved: true }
      : { is_approved: false, crm_access: false, office_access: false, claim_access: false, branding_access: false }
    const { error } = await supabase.from("users").update(payload).in("id", ids)
    if (error) { alert("일괄 처리 실패: " + error.message); return }
    setUsers((prev) => prev.map((u) => selectedIds.has(u.id) ? { ...u, ...payload } : u))
    setSelectedIds(new Set())
  }

  const bulkRankChange = async (nextRank: string) => {
    const ids = Array.from(selectedIds)
    const payload = { role: nextRank, role_level: roleLevelFor(nextRank), rank: nextRank }
    const { error } = await supabase.from("users").update(payload).in("id", ids)
    if (error) { alert("등급 변경 실패: " + error.message); return }
    setUsers((prev) => prev.map((u) => selectedIds.has(u.id) ? { ...u, ...payload } : u))
    setSelectedIds(new Set())
  }

  const applyRolePreset = async (presetId: RolePresetId, target: "selected" | "filtered") => {
    const targetUsers = target === "selected"
      ? users.filter((user) => selectedIds.has(user.id))
      : filteredUsers

    if (targetUsers.length === 0) {
      alert(target === "selected" ? "먼저 직원을 선택해 주세요." : "현재 조건에 해당하는 직원이 없습니다.")
      return
    }

    const preset = rolePresets.find((item) => item.id === presetId)
    if (!preset) return

    const message = target === "selected"
      ? `선택한 직원 ${targetUsers.length.toLocaleString()}명에게 '${preset.title}' 기준을 적용할까요?`
      : `현재 필터에 보이는 직원 ${targetUsers.length.toLocaleString()}명에게 '${preset.title}' 기준을 적용할까요?`
    if (!confirm(message)) return

    const payload = rolePresetPayload(presetId)
    const ids = targetUsers.map((user) => user.id)
    const { error } = await supabase.from("users").update(payload).in("id", ids)
    if (error) {
      alert("등급별 권한 적용 실패: " + error.message)
      return
    }

    const idSet = new Set(ids)
    setUsers((prev) => prev.map((user) => idSet.has(user.id) ? { ...user, ...payload } : user))
    setSelectedIds(new Set())
    alert(`${targetUsers.length.toLocaleString()}명에게 '${preset.title}' 기준을 적용했습니다.`)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef3fb]">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1a3a6e]/20 border-t-[#1a3a6e]" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#eef3fb] text-slate-900">
      <header className="border-b border-white/80 bg-white/90 px-4 py-5 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <button onClick={() => router.push("/dashboard")} className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[#1a3a6e] hover:underline">
              ← 대시보드
            </button>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#1a3a6e]">Metarich Staff</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">직원 관리</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">메타리치 시그널그룹 직원 전체 관리</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="rounded-full bg-[#eef3fb] px-3 py-1 text-[11px] font-black text-[#1a3a6e]">
                전체 {users.length.toLocaleString()}명
              </span>
              <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-black text-amber-700">
                미승인 {users.filter((u) => !enabled(u.is_approved)).length.toLocaleString()}명
              </span>
            </div>
          </div>
          <button
            onClick={saveAllVisibleUsers}
            disabled={savingAll}
            className="hidden md:block rounded-2xl bg-[#1a3a6e] px-6 py-3 text-[13px] font-black text-white shadow-lg hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingAll ? "저장 중..." : `현재 목록 일괄 저장 (${filteredUsers.length.toLocaleString()}명)`}
          </button>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div className="sticky top-0 z-10 border-b border-white/80 bg-white/95 px-4 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto no-scrollbar">
          {([
            { id: "users" as const, label: "직원 목록", icon: "👥" },
            { id: "roles" as const, label: "등급별 메뉴 설정", icon: "🔐" },
            { id: "analytics" as const, label: "사용 현황", icon: "📊" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-5 py-4 text-[13px] font-black transition-colors ${
                activeTab === tab.id
                  ? "border-[#1a3a6e] text-[#1a3a6e]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-6">

        {/* ── 탭 1: 직원 목록 ────────────────────────────────── */}
        {activeTab === "users" && (
          <>
            <UserFilters
              search={search}
              onSearchChange={setSearch}
              companyType={companyType}
              onCompanyTypeChange={setCompanyType}
              headquarter={headquarter}
              onHeadquarterChange={setHeadquarter}
              rank={rank}
              onRankChange={setRank}
              approved={approved}
              onApprovedChange={setApproved}
              sortBy={sortBy}
              onSortByChange={setSortBy}
            />
            <BulkActions
              selectedIds={selectedIds}
              onBulkApprove={bulkApprove}
              onBulkRankChange={bulkRankChange}
            />
            <UserTable
              users={filteredUsers}
              selectedIds={selectedIds}
              onSelectChange={onSelectChange}
              onSelectAll={onSelectAll}
              onDraftChange={(user) => setUsers((prev) => prev.map((u) => u.id === user.id ? user : u))}
              onSave={saveUser}
              onResetPassword={setResetUser}
              onDelete={deleteUser}
              duplicateIds={duplicateIds}
              viewerId={viewer?.id ?? ""}
            />
            <button
              onClick={saveAllVisibleUsers}
              disabled={savingAll}
              className="md:hidden w-full rounded-2xl bg-[#1a3a6e] px-6 py-3 text-[13px] font-black text-white disabled:opacity-50"
            >
              {savingAll ? "저장 중..." : `현재 목록 일괄 저장 (${filteredUsers.length.toLocaleString()}명)`}
            </button>
          </>
        )}

        {/* ── 탭 2: 등급별 메뉴 설정 ────────────────────────── */}
        {activeTab === "roles" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-black text-slate-900">등급별 접근 권한 안내</h2>
              <p className="mb-6 text-[13px] font-bold text-slate-500">각 등급 프리셋의 설명과 접근 가능 메뉴를 확인하고, 선택 직원 또는 전체 필터 직원에게 일괄 적용합니다.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {rolePresets.map((preset) => {
                  const colorMap: Record<string, string> = {
                    guest: "border-slate-300 bg-slate-50",
                    guest_approved: "border-sky-300 bg-sky-50",
                    agent: "border-indigo-300 bg-indigo-50",
                    full: "border-emerald-300 bg-emerald-50",
                  }
                  const btnMap: Record<string, string> = {
                    guest: "bg-slate-700 hover:bg-slate-800",
                    guest_approved: "bg-sky-600 hover:bg-sky-700",
                    agent: "bg-indigo-600 hover:bg-indigo-700",
                    full: "bg-emerald-600 hover:bg-emerald-700",
                  }
                  return (
                    <div key={preset.id} className={`rounded-2xl border-2 p-5 ${colorMap[preset.id]}`}>
                      <h3 className="mb-1 text-[15px] font-black text-slate-900">{preset.title}</h3>
                      <p className="mb-4 text-[11px] font-bold text-slate-500 leading-relaxed">{preset.desc}</p>
                      <div className="mb-4 space-y-1.5">
                        {preset.enabledMenus.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black text-emerald-600 mb-1">✓ 접근 가능</p>
                            {preset.enabledMenus.map((m) => (
                              <p key={m} className="text-[11px] font-bold text-slate-700">• {m}</p>
                            ))}
                          </div>
                        )}
                        {preset.blockedMenus.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] font-black text-rose-500 mb-1">✗ 차단</p>
                            {preset.blockedMenus.map((m) => (
                              <p key={m} className="text-[11px] font-bold text-slate-400">• {m}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => applyRolePreset(preset.id, "selected")}
                          className={`w-full rounded-xl px-4 py-2.5 text-[12px] font-black text-white transition ${btnMap[preset.id]}`}
                        >
                          선택 직원에게 적용
                        </button>
                        <button
                          onClick={() => applyRolePreset(preset.id, "filtered")}
                          className={`w-full rounded-xl border-2 px-4 py-2.5 text-[12px] font-black transition bg-white ${btnMap[preset.id].replace("bg-", "border-").replace("hover:bg-", "hover:border-")} text-slate-700 hover:text-slate-900`}
                        >
                          현재 필터 전체 적용
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 직원 목록 간소화 버전 (roles 탭에서 선택용) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[14px] font-black text-slate-900">직원 선택 ({selectedIds.size > 0 ? `${selectedIds.size}명 선택됨` : "없음"})</h3>
                <button onClick={() => setSelectedIds(new Set())} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">선택 초기화</button>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {users.map((user) => {
                  const checked = selectedIds.has(user.id)
                  const rankLabel: Record<string, string> = { guest: "게스트", agent: "설계사", manager: "지점장", leader: "사업부장", headquarters: "본부장", master: "마스터" }
                  return (
                    <label key={user.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition ${checked ? "border-[#1a3a6e] bg-[#eef3fb]" : "border-slate-100 bg-slate-50 hover:bg-slate-100"}`}>
                      <input type="checkbox" checked={checked} onChange={(e) => onSelectChange(user.id, e.target.checked)} className="h-4 w-4 accent-[#1a3a6e]" />
                      <span className="flex-1 text-[13px] font-black text-slate-800">{user.name || user.email}</span>
                      <span className="text-[11px] font-bold text-slate-400">{rankLabel[String(user.rank || "guest")] || user.rank}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${enabled(user.is_approved) ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
                        {enabled(user.is_approved) ? "승인" : "미승인"}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 탭 3: 사용 현황 ────────────────────────────────── */}
        {activeTab === "analytics" && (
          <UsageAnalytics users={users} />
        )}

      </main>

      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
        />
      )}
    </div>
  )
}
