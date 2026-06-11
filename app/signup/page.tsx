"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { HEADQUARTER_OPTIONS } from "@/lib/roles"
import { ensureUserProfile } from "@/lib/userProfile"

type SignupAccountType = "signal" | "external"

type OrgRow = {
  id?: string | number
  name: string
  headquarter?: string
  headquarter_name?: string
  hq?: string
  hq_name?: string
  dept_name?: string
  department?: string
  department_id?: string | number
  dept_id?: string | number
}

function getOrgHeadquarter(row: OrgRow) {
  return row.headquarter || row.headquarter_name || row.hq || row.hq_name || ""
}

function getBranchDepartment(row: OrgRow) {
  return row.department || row.dept_name || ""
}

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [depts, setDepts] = useState<OrgRow[]>([])
  const [branches, setBranches] = useState<OrgRow[]>([])

  const [formData, setFormData] = useState({
    accountType: "signal" as SignupAccountType,
    email: "",
    password: "",
    name: "",
    phone: "",
    headquarter: "",
    department: "",
    branch: "",
    companyName: "",
    position: "",
  })

  useEffect(() => {
    async function fetchOptions() {
      const { data: dData } = await supabase.from("departments").select("*").order("name")
      const { data: bData } = await supabase.from("branches").select("*").order("name")
      if (dData) setDepts(dData)
      if (bData) setBranches(bData)
    }
    fetchOptions()
  }, [])

  const filteredDepts = useMemo(() => {
    if (!formData.headquarter) return []

    const fromDepartments = depts
      .filter((dept) => getOrgHeadquarter(dept) === formData.headquarter)
      .map((dept) => ({ id: dept.id, name: dept.name }))

    const fromBranches = branches
      .filter((branch) => getOrgHeadquarter(branch) === formData.headquarter)
      .map((branch) => ({ id: getBranchDepartment(branch), name: getBranchDepartment(branch) }))
      .filter((dept) => Boolean(dept.name))

    const byName = new Map<string, { id?: string | number; name: string }>()
    ;[...fromDepartments, ...fromBranches].forEach((dept) => byName.set(dept.name, dept))
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"))
  }, [branches, depts, formData.headquarter])

  const filteredBranches = useMemo(() => {
    if (!formData.headquarter || !formData.department) return []
    return branches
      .filter((branch) => getOrgHeadquarter(branch) === formData.headquarter)
      .filter((branch) => getBranchDepartment(branch) === formData.department)
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
  }, [branches, formData.department, formData.headquarter])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone.trim(),
            accountType: formData.accountType,
            headquarter: formData.headquarter,
            department: formData.department,
            branch: formData.branch,
            companyName: formData.companyName.trim(),
            position: formData.position.trim(),
          },
        },
      })

      if (authError) throw authError

      if (authData.user) {
        await ensureUserProfile(supabase, authData.user, formData)
        fetch("/api/notify-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "web",
            email: formData.email.trim(),
            name: formData.name,
            phone: formData.phone.trim(),
            accountType: formData.accountType,
            headquarter: formData.headquarter,
            department: formData.department,
            branch: formData.branch,
            companyName: formData.companyName,
            position: formData.position,
          }),
        }).catch(() => {})
        alert("가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.")
        router.push("/login")
      }
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message || "")
          : ""
      if (message.toLowerCase().includes("already registered")) {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        })

        if (loginError || !loginData.user) {
          alert("이미 인증 계정이 있는 이메일입니다. 기존 비밀번호로 로그인하거나 비밀번호 재설정을 진행해주세요.")
          return
        }

        await ensureUserProfile(supabase, loginData.user, formData)
        await supabase.auth.signOut()
        alert("기존 인증 계정과 직원정보를 다시 연결했습니다. 관리자 승인 후 로그인해주세요.")
        router.push("/login")
      } else {
        alert(message || "가입 신청 중 오류가 발생했습니다.")
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-900 outline-none transition focus:border-[#2563eb] focus:bg-white"
  const selectClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-900 outline-none transition focus:border-[#2563eb] focus:bg-white disabled:cursor-not-allowed disabled:opacity-45"
  const accountTypeClass = (type: SignupAccountType) =>
    `flex min-h-[58px] items-center gap-3 rounded-2xl border p-4 text-left transition ${formData.accountType === type ? "border-[#1a3a6e] bg-[#eef3fb] text-[#1a3a6e]" : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"}`
  const setAccountType = (accountType: SignupAccountType) => {
    setFormData((prev) => ({
      ...prev,
      accountType,
      headquarter: accountType === "external" ? "" : prev.headquarter,
      department: accountType === "external" ? "" : prev.department,
      branch: accountType === "external" ? "" : prev.branch,
      companyName: accountType === "signal" ? "" : prev.companyName,
      position: accountType === "signal" ? "" : prev.position,
    }))
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a1628", padding: "32px 20px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* 브랜드 헤더 */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#378add" }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.6)", letterSpacing: "0.04em" }}>Insu-Work Center</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "white", margin: 0 }}>회원가입 신청</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>승인 후 시그널 워크센터를 이용할 수 있습니다.</p>
        </div>

      <div style={{ background: "white", borderRadius: 16, padding: "28px 24px" }}>
        <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "0.5px solid #e4edf5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#1a2d42" }}>계정 정보 입력</p>
          <button onClick={() => router.push("/login")} style={{ fontSize: 12, color: "#7a9ab2", background: "none", border: "0.5px solid #d4e0eb", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}>
            로그인으로 돌아가기
          </button>
        </div>

        <form onSubmit={handleSignup} className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs font-bold text-slate-500">이메일</span>
              <input
                type="email"
                placeholder="example@email.com"
                required
                className={inputClass}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-bold text-slate-500">이름</span>
              <input
                type="text"
                placeholder="실명을 입력하세요"
                required
                className={inputClass}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-bold text-slate-500">휴대폰 번호</span>
              <input
                type="tel"
                placeholder="010-0000-0000"
                required
                className={inputClass}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </label>

            <div>
              <span className="mb-2 block text-xs font-bold text-slate-500">소속 구분</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className={accountTypeClass("signal")}>
                  <input
                    type="checkbox"
                    checked={formData.accountType === "signal"}
                    onChange={() => setAccountType("signal")}
                    className="h-4 w-4 accent-[#1a3a6e]"
                  />
                  <span className="text-sm font-black">시그널그룹 임직원</span>
                </label>
                <label className={accountTypeClass("external")}>
                  <input
                    type="checkbox"
                    checked={formData.accountType === "external"}
                    onChange={() => setAccountType("external")}
                    className="h-4 w-4 accent-[#1a3a6e]"
                  />
                  <span className="text-sm font-black">타사</span>
                </label>
              </div>
            </div>
          </div>

          {formData.accountType === "signal" ? (
            <div className="grid gap-5 md:grid-cols-3">
              <label>
                <span className="mb-2 block text-xs font-bold text-slate-500">본부</span>
                <select
                  required
                  className={selectClass}
                  value={formData.headquarter}
                  onChange={(e) => setFormData({ ...formData, headquarter: e.target.value, department: "", branch: "" })}
                >
                  <option value="">본부 선택</option>
                  {HEADQUARTER_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold text-slate-500">사업부 <span className="font-medium text-slate-400">(선택)</span></span>
                <select
                  disabled={!formData.headquarter}
                  className={selectClass}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value, branch: "" })}
                >
                  <option value="">나중에 배정</option>
                  {filteredDepts.map((dept) => <option key={dept.id || dept.name} value={dept.name}>{dept.name}</option>)}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold text-slate-500">지점 <span className="font-medium text-slate-400">(선택)</span></span>
                <select
                  disabled={!formData.department}
                  className={selectClass}
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                >
                  <option value="">나중에 배정</option>
                  {filteredBranches.map((branch) => <option key={branch.id || branch.name} value={branch.name}>{branch.name}</option>)}
                </select>
              </label>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-bold text-slate-500">회사명</span>
                <input
                  type="text"
                  placeholder="소속 회사를 입력하세요"
                  required
                  className={inputClass}
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold text-slate-500">직급</span>
                <input
                  type="text"
                  placeholder="직급을 입력하세요"
                  required
                  className={inputClass}
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                />
              </label>
            </div>
          )}

          <label>
            <span className="mb-2 block text-xs font-bold text-slate-500">비밀번호</span>
            <input
              type="password"
              placeholder="6자 이상 입력"
              required
              minLength={6}
              className={inputClass}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </label>

          <button type="submit" disabled={loading} style={{ width: "100%", marginTop: 8, borderRadius: 8, background: "#1a2540", color: "#e8f1f8", border: "none", padding: "14px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1 }}>
            {loading ? "가입 신청 중..." : "가입 신청하기"}
          </button>
        </form>
      </div>
      </div>
    </div>
  )
}
