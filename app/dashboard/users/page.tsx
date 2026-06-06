"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { normalizeRole } from "@/lib/roles"
import { supabase } from "@/lib/supabase"
import BulkActions from "./components/BulkActions"
import ResetPasswordModal from "./components/ResetPasswordModal"
import UserFilters from "./components/UserFilters"
import UserTable from "./components/UserTable"
import { enabled, getCompanyName, getCompanyType, getHeadquarter, getRank, type StaffUser } from "./components/UserRow"

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
  const [savingAll, setSavingAll] = useState(false)

  const loadUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      alert(`직원 목록을 불러오지 못했습니다: ${error.message}`)
      return
    }

    setUsers(((data || []) as StaffUser[]).map((user) => ({
      ...user,
      company_type: getCompanyType(user),
      company_name: getCompanyName(user),
    })))
  }, [])

  const init = useCallback(async () => {
    try {
      let { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const { data: refreshed } = await supabase.auth.refreshSession()
        session = refreshed.session
      }
      if (!session) return router.replace("/login?redirectTo=/dashboard/users")

      let userId: string | null = null
      const { data: authUser, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser.user) {
        if (session.user?.id) { userId = session.user.id }
        else {
          await supabase.auth.signOut().catch(() => {})
          return router.replace("/login?redirectTo=/dashboard/users")
        }
      } else {
        userId = authUser.user.id
      }

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId!)
        .maybeSingle()

      if (!profile || normalizeRole(profile) !== "master") {
        return router.replace("/dashboard")
      }

      setViewer(profile as StaffUser)
      await loadUsers()
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [loadUsers, router])

  useEffect(() => {
    queueMicrotask(() => { void init() })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") init()
      if (event === "SIGNED_OUT") router.replace("/login?redirectTo=/dashboard/users")
    })
    return () => subscription.unsubscribe()
  }, [init, router])

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return [...users]
      .filter((user) => {
        const userCompanyType = getCompanyType(user)
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

  const saveUser = async (user: StaffUser, silent = false) => {
    const isApproved = enabled(user.is_approved)
    const nextRank = String(user.rank || "agent")
    const company = getCompanyType(user)
    const companyName = getCompanyName(user).trim()

    if (company === "external" && !companyName) {
      alert(`${user.name || user.email || "직원"}의 회사명을 입력해주세요.`)
      return false
    }

    // 게스트(타사) 또는 미승인이면 모든 권한 비활성화
    const isGuest = nextRank === "guest"
    const updatePayload = {
      is_approved: isApproved,
      role: nextRank,
      role_level: roleLevelFor(nextRank),
      rank: nextRank,
      company_type: company,
      company_name: company === "external" ? companyName : "메타리치 시그널그룹",
      headquarter: company === "external" ? "대외" : user.headquarter || "",
      headquarter_name: company === "external" ? "대외" : user.headquarter_name || user.headquarter || "",
      department: company === "external" ? companyName : user.department || "",
      department_name: company === "external" ? companyName : user.department_name || user.department || "",
      team: user.team || "",
      branch_name: user.branch_name || user.team || "",
      // 게스트는 영구 차단, 미승인은 모두 false
      crm_access: (!isApproved || isGuest) ? false : enabled(user.crm_access),
      office_access: (!isApproved || isGuest) ? false : enabled(user.office_access),
      claim_access: (!isApproved || isGuest) ? false : enabled(user.claim_access),
      branding_access: (!isApproved || isGuest) ? false : enabled(user.branding_access),
    }

    const { error } = await supabase.from("users").update(updatePayload).eq("id", user.id)
    if (error) {
      alert(`저장 실패: ${error.message}`)
      return false
    }

    setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, ...updatePayload } : item))
    if (!silent) alert(`${user.name || user.email || "직원"} 정보가 저장되었습니다.`)
    return true
  }

  const saveAllVisibleUsers = async () => {
    if (filteredUsers.length === 0) return
    if (!confirm(`현재 표시된 직원 ${filteredUsers.length.toLocaleString()}명의 승인과 권한 설정을 일괄 저장합니다.`)) return

    setSavingAll(true)
    let saved = 0
    for (const user of filteredUsers) {
      const ok = await saveUser(user, true)
      if (!ok) {
        setSavingAll(false)
        alert(`${saved.toLocaleString()}명 저장 후 중단되었습니다.`)
        return
      }
      saved += 1
    }
    setSavingAll(false)
    alert(`${saved.toLocaleString()}명의 직원 설정이 일괄 저장되었습니다.`)
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
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[#1a3a6e] hover:underline"
            >
              ← 대시보드
            </button>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#1a3a6e]">Metarich Staf