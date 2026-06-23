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
            <div className="mt-4 flex gap-2">
              <button onClick={() => setActiveTab("users")} className={"rounded-xl px-4 py-2 text-[13px] font-black transition " + (activeTab === "users" ? "bg-[#1a3a6e] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                직원 목록
              </button>
              <button onClick={() => setActiveTab("roles")} className={"rounded-xl px-4 py-2 text-[13px] font-black transition " + (activeTab === "roles" ? "bg-[#1a3a6e] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                등급별 권한
              </button>
              <button onClick={() => setActiveTab("analytics")} className={"rounded-xl px-4 py-2 text-[13px] font-black transition " + (activeTab === "analytics" ? "bg-[#1a3a6e] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                사용 분석
              </button>
            </div>
          </div>
          <div className="rounded-2xl bg-[#1a3a6e] px-5 py-3 text-sm font-black text-white">
            총 직원 {users.length.toLocaleString()}명
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-4 px-4 py-6">
        {activeTab === "analytics" ? (
          <UsageAnalytics />
        ) : activeTab === "roles" ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1a3a6e]">Role Preset</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">등급별 권한 설정</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                메뉴를 하나씩 켜고 끄는 방식이 아니라, 직원 등급과 승인 상태를 기준으로 접근 권한이 자동 적용됩니다.
                게스트 승인과 설계사 승인의 차이는 여기에서 직원 단위로 정리해 주세요.
              </p>
            </div>

            <UserFilters
              search={search} onSearchChange={setSearch}
              companyType={companyType} onCompanyTypeChange={(v) => { setCompanyType(v); if (v === "external") setHeadquarter("") }}
              headquarter={headquarter} onHeadquarterChange={setHeadquarter}
              rank={rank} onRankChange={setRank}
              approved={approved} onApprovedChange={setApproved}
              sortBy={sortBy} onSortByChange={setSortBy}
              totalCount={users.length} filteredCount={filteredUsers.length}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              {rolePresets.map((preset) => (
                <article key={preset.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-950">{preset.title}</h3>
                      <p className="mt-1 text-sm font-bold leading-6 text-slate-500">{preset.desc}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => applyRolePreset(preset.id, "selected")}
                        disabled={selectedIds.size === 0}
                        className="rounded-xl border border-[#1a3a6e] bg-white px-4 py-2 text-xs font-black text-[#1a3a6e] transition hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        선택 직원 적용
                      </button>
                      <button
                        type="button"
                        onClick={() => applyRolePreset(preset.id, "filtered")}
                        disabled={filteredUsers.length === 0}
                        className="rounded-xl bg-[#1a3a6e] px-4 py-2 text-xs font-black text-white transition hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        현재 목록 적용
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <p className="text-xs font-black text-emerald-700">열리는 메뉴</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {preset.enabledMenus.map((menu) => (
                          <span key={menu} className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 shadow-sm">{menu}</span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-black text-slate-500">닫히는 메뉴</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(preset.blockedMenus.length > 0 ? preset.blockedMenus : ["별도 제한 없음"]).map((menu) => (
                          <span key={menu} className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">{menu}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <BulkActions selectedIds={selectedIds} onBulkApprove={bulkApprove} onBulkRankChange={bulkRankChange} />
            <UserTable
              users={filteredUsers} selectedIds={selectedIds}
              onSelectChange={onSelectChange} onSelectAll={onSelectAll}
              onDraftChange={(u) => setUsers((prev) => prev.map((item) => item.id === u.id ? { ...item, ...u } : item))}
              onSave={saveUser} onResetPassword={setResetUser}
              onDelete={deleteUser}
              duplicateIds={duplicateIds}
              viewerId={viewer?.id ?? ""}
            />
            {resetUser && (
              <ResetPasswordModal
                user={resetUser} requesterId={viewer?.id ?? ""}
                onSuccess={() => setResetUser(null)} onClose={() => setResetUser(null)}
              />
            )}
          </section>
        ) : (
          <>
            <UserFilters
              search={search} onSearchChange={setSearch}
              companyType={companyType} onCompanyTypeChange={(v) => { setCompanyType(v); if (v === "external") setHeadquarter("") }}
              headquarter={headquarter} onHeadquarterChange={setHeadquarter}
              rank={rank} onRankChange={setRank}
              approved={approved} onApprovedChange={setApproved}
              sortBy={sortBy} onSortByChange={setSortBy}
              totalCount={users.length} filteredCount={filteredUsers.length}
            />
            <BulkActions selectedIds={selectedIds} onBulkApprove={bulkApprove} onBulkRankChange={bulkRankChange} />
            <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-bold text-slate-500">대외 인원은 타사로 표시되며, 회사명 기준으로 저장됩니다.</p>
              <button
                type="button" onClick={saveAllVisibleUsers}
                disabled={savingAll || filteredUsers.length === 0}
                className="rounded-xl bg-[#1a3a6e] px-5 py-3 text-sm font-black text-white transition hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAll ? "일괄 저장 중..." : "현재 목록 일괄 저장 (" + filteredUsers.length.toLocaleString() + "명)"}
              </button>
            </section>
            {duplicateIds.size > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-sm font-black text-orange-700">중복 의심 계정 {duplicateIds.size}건 감지됨</p>
                  <p className="text-xs font-bold text-orange-500">같은 이름+전화번호로 여러 계정이 가입된 경우입니다. 주황색으로 표시된 계정을 확인 후 불필요한 계정을 삭제해주세요.</p>
                </div>
              </div>
            )}
            <UserTable
              users={filteredUsers} selectedIds={selectedIds}
              onSelectChange={onSelectChange} onSelectAll={onSelectAll}
              onDraftChange={(u) => setUsers((prev) => prev.map((item) => item.id === u.id ? { ...item, ...u } : item))}
              onSave={saveUser} onResetPassword={setResetUser}
              onDelete={deleteUser}
              duplicateIds={duplicateIds}
              viewerId={viewer?.id ?? ""}
            />
            {resetUser && (
              <ResetPasswordModal
                user={resetUser} requesterId={viewer?.id ?? ""}
                onSuccess={() => setResetUser(null)} onClose={() => setResetUser(null)}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
