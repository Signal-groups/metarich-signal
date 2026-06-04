"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { normalizeRole } from "@/lib/roles"
import { supabase } from "@/lib/supabase"
import BulkActions from "./components/BulkActions"
import ResetPasswordModal from "./components/ResetPasswordModal"
import UserFilters from "./components/UserFilters"
import UserTable from "./components/UserTable"
import { enabled, getHeadquarter, getRank, type StaffUser } from "./components/UserRow"

type CompanyTypeFilter = "all" | "metarich" | "external"
type ApprovedFilter = "all" | "true" | "false"
type SortKey = "created_at" | "name" | "headquarter"

function roleLevelFor(rank: string) {
  if (rank === "headquarters") return "headquarters"
  if (rank === "leader") return "director"
  return rank
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

  const loadUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      alert(`직원 목록을 불러오지 못했습니다: ${error.message}`)
      return
    }

    setUsers((data || []) as StaffUser[])
  }, [])

  useEffect(() => {
    let alive = true

    async function init() {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) {
        router.replace("/login?redirectTo=/dashboard/users")
        return
      }

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle()

      if (!profile || normalizeRole(profile) !== "master") {
        router.replace("/dashboard")
        return
      }

      if (!alive) return
      setViewer(profile as StaffUser)
      await loadUsers()
      if (alive) setLoading(false)
    }

    init().catch(() => router.replace("/dashboard"))

    return () => {
      alive = false
    }
  }, [loadUsers, router])

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return [...users]
      .filter((user) => {
        const userCompanyType = user.company_type === "external" ? "external" : "metarich"
        const matchesCompany = companyType === "all" || userCompanyType === companyType
        const matchesHeadquarter = !headquarter || getHeadquarter(user) === headquarter
        const matchesRank = !rank || getRank(user) === rank
        const matchesApproved = approved === "all" || String(enabled(user.is_approved)) === approved
        const matchesSearch = !keyword || [user.name, user.email, user.phone].some((value) => String(value || "").toLowerCase().includes(keyword))

        return matchesCompany && matchesHeadquarter && matchesRank && matchesApproved && matchesSearch
      })
      .sort((a, b) => {
        if (sortBy === "name") return String(a.name || "").localeCompare(String(b.name || ""), "ko")
        if (sortBy === "headquarter") return getHeadquarter(a).localeCompare(getHeadquarter(b), "ko")
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      })
  }, [approved, companyType, headquarter, rank, search, sortBy, users])

  const onSelectChange = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const onSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      filteredUsers.forEach((user) => {
        if (checked) next.add(user.id)
        else next.delete(user.id)
      })
      return next
    })
  }

  const saveUser = async (user: StaffUser) => {
    const isApproved = enabled(user.is_approved)
    const nextRank = String(user.rank || "agent")
    const updatePayload = {
      is_approved: isApproved,
      role: nextRank,
      role_level: roleLevelFor(nextRank),
      rank: nextRank,
      crm_access: isApproved ? enabled(user.crm_access) : false,
      office_access: isApproved ? enabled(user.office_access) : false,
      claim_access: isApproved ? enabled(user.claim_access) : false,
      branding_access: isApproved ? enabled(user.branding_access) : false,
    }

    const { error } = await supabase.from("users").update(updatePayload).eq("id", user.id)
    if (error) {
      alert(`저장 실패: ${error.message}`)
      return
    }

    setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, ...updatePayload } : item))
    alert(`${user.name || user.email || "직원"} 정보가 저장되었습니다.`)
  }

  const bulkApprove = async (approve: boolean) => {
    const ids = Array.from(selectedIds)
    const payload = approve
      ? { is_approved: true }
      : { is_approved: false, crm_access: false, office_access: false, claim_access: false, branding_access: false }

    const { error } = await supabase.from("users").update(payload).in("id", ids)
    if (error) {
      alert(`일괄 처리 실패: ${error.message}`)
      return
    }

    setUsers((prev) => prev.map((user) => selectedIds.has(user.id) ? { ...user, ...payload } : user))
    setSelectedIds(new Set())
  }

  const bulkRankChange = async (nextRank: string) => {
    const ids = Array.from(selectedIds)
    const payload = { role: nextRank, role_level: roleLevelFor(nextRank), rank: nextRank }
    const { error } = await supabase.from("users").update(payload).in("id", ids)
    if (error) {
      alert(`등급 변경 실패: ${error.message}`)
      return
    }

    setUsers((prev) => prev.map((user) => selectedIds.has(user.id) ? { ...user, ...payload } : user))
    setSelectedIds(new Set())
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef3fb]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1a3a6e]/20 border-t-[#1a3a6e]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#eef3fb] text-slate-900">
      <header className="border-b border-white/80 bg-white/90 px-4 py-5 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#1a3a6e]">Metarich Staff</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">직원 관리</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">메타리치 시그널그룹 직원 전체 관리</p>
          </div>
          <div className="rounded-2xl bg-[#1a3a6e] px-5 py-3 text-sm font-black text-white">
            총 직원 {users.length.toLocaleString()}명
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-4 px-4 py-6">
        <UserFilters
          search={search}
          onSearchChange={setSearch}
          companyType={companyType}
          onCompanyTypeChange={(value) => {
            setCompanyType(value)
            if (value === "external") setHeadquarter("")
          }}
          headquarter={headquarter}
          onHeadquarterChange={setHeadquarter}
          rank={rank}
          onRankChange={setRank}
          approved={approved}
          onApprovedChange={setApproved}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          totalCount={users.length}
          filteredCount={filteredUsers.length}
        />
        <BulkActions selectedIds={selectedIds} onBulkApprove={bulkApprove} onBulkRankChange={bulkRankChange} />
        <UserTable
          users={filteredUsers}
          selectedIds={selectedIds}
          onSelectChange={onSelectChange}
          onSelectAll={onSelectAll}
          onSave={saveUser}
          onResetPassword={setResetUser}
          viewerId={viewer?.id || ""}
        />
      </main>

      <ResetPasswordModal
        user={resetUser}
        requesterId={viewer?.id || ""}
        onClose={() => setResetUser(null)}
        onSuccess={() => {
          setResetUser(null)
          loadUsers()
        }}
      />
    </div>
  )
}
