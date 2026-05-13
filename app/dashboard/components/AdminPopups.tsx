"use client"

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import {
  HEADQUARTER_OPTIONS,
  canManageRole,
  canSeeUser,
  getBranch,
  getDepartment,
  getHeadquarter,
  isOrganizationAdminAccount,
  normalizeRole,
  roleLabel,
} from "../../../lib/roles"

const ROLE_OPTIONS = [
  { value: "agent", label: "설계사" },
  { value: "manager", label: "지점장" },
  { value: "leader", label: "사업부장" },
  { value: "headquarters", label: "본부장" },
  { value: "master", label: "마스터" },
]

const defaultEduWeeks = { 1: "", 2: "", 3: "", 4: "", 5: "" }

export default function AdminPopups({
  type,
  agents,
  selectedAgent,
  teamMeta,
  onClose,
  viewer,
  monthKey,
  selectedScope,
  canEditDepartment = false,
  canApprovePerformance = false,
  canEditNotice = false,
}: any) {
  const [tarAmt, setTarAmt] = useState(teamMeta?.targetAmt || 0)
  const [tarCnt, setTarCnt] = useState(teamMeta?.targetCnt || 0)
  const [tarIntro, setTarIntro] = useState(teamMeta?.targetIntro || 0)
  const [curIntro, setCurIntro] = useState(teamMeta?.actualIntro || 0)
  const [notice, setNotice] = useState("")
  const [eduWeeks, setEduWeeks] = useState(defaultEduWeeks)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [existingHeadquarters, setExistingHeadquarters] = useState<string[]>(HEADQUARTER_OPTIONS)
  const [existingDepts, setExistingDepts] = useState<string[]>([])
  const [existingTeams, setExistingTeams] = useState<{ dept: string, team: string }[]>([])

  const scopeHeadquarter = selectedScope?.headquarter || ""
  const scopeDepartment = selectedScope?.department || ""
  const scopeLabel = [scopeHeadquarter, scopeDepartment, selectedScope?.team].filter(Boolean).join(" / ")
  const canUseOrgManagement = isOrganizationAdminAccount(viewer)

  const load = useCallback(async () => {
    const { data: settings } = await supabase.from("team_settings").select("*")
    setNotice(settings?.find((setting) => setting.key === "global_notice")?.value || "")

    if (scopeHeadquarter && scopeDepartment) {
      const rawDeptSettings = settings?.find((setting) => setting.key === departmentSettingsKey(scopeHeadquarter, scopeDepartment))?.value
      if (rawDeptSettings) {
        try {
          const parsed = typeof rawDeptSettings === "string" ? JSON.parse(rawDeptSettings) : rawDeptSettings
          setTarAmt(Number(parsed.targetAmt) || teamMeta?.targetAmt || 0)
          setTarCnt(Number(parsed.targetCnt) || teamMeta?.targetCnt || 0)
          setTarIntro(Number(parsed.targetIntro) || teamMeta?.targetIntro || 0)
          setCurIntro(Number(parsed.actualIntro) || teamMeta?.actualIntro || 0)
          setEduWeeks(parsed.eduWeeks || defaultEduWeeks)
        } catch {
          setEduWeeks(defaultEduWeeks)
        }
      } else {
        setTarAmt(teamMeta?.targetAmt || 0)
        setTarCnt(teamMeta?.targetCnt || 0)
        setTarIntro(teamMeta?.targetIntro || 0)
        setCurIntro(teamMeta?.actualIntro || 0)
        setEduWeeks(defaultEduWeeks)
      }
    }

    if (type !== "users" || !canUseOrgManagement) return

    const { data: branchData } = await supabase.from("branches").select("*")
    if (branchData) {
      const hqs = Array.from(new Set([
        ...HEADQUARTER_OPTIONS,
        ...branchData.map((branch) => branch.headquarter || branch.headquarter_name || branch.hq).filter(Boolean),
      ])) as string[]
      const depts = Array.from(new Set(branchData.map((branch) => branch.dept_name || branch.department).filter(Boolean))) as string[]
      const teams = branchData.map((branch) => ({
        dept: branch.dept_name || branch.department,
        team: branch.name || branch.branch_name,
      })).filter((item) => item.dept && item.team)

      setExistingHeadquarters(hqs)
      setExistingDepts(depts.sort())
      setExistingTeams(teams)
    }

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .order("is_approved", { ascending: true })
      .order("name", { ascending: true })

    if (!userData) return

    const filteredUsers = userData.filter((target) => {
      if (normalizeRole(viewer) === "master") return canManageRole(viewer, target)
      return canSeeUser(viewer, target)
    })

    setAllUsers(filteredUsers.map((target) => ({
      ...target,
      rank: normalizeRole(target),
      headquarter: getHeadquarter(target),
      department: getDepartment(target),
      team: getBranch(target),
      isCustomHeadquarter: false,
      isCustomDept: false,
      isCustomTeam: false,
    })))
  }, [canUseOrgManagement, scopeDepartment, scopeHeadquarter, teamMeta, type, viewer])

  useEffect(() => {
    load()
  }, [load])

  const updateUserInfo = (userId: string, field: string, value: string) => {
    setAllUsers((prev) => prev.map((user) => {
      if (user.id !== userId) return user
      if (field === "headquarter" && value === "CUSTOM_INPUT") return { ...user, headquarter: "", isCustomHeadquarter: true }
      if (field === "department" && value === "CUSTOM_INPUT") return { ...user, department: "", team: "", isCustomDept: true }
      if (field === "team" && value === "CUSTOM_INPUT") return { ...user, team: "", isCustomTeam: true }
      if (field === "department") return { ...user, department: value, team: "" }
      return { ...user, [field]: value }
    }))
  }

  const syncOrganizationOptions = async (user: any) => {
    if (!user.department || !user.team) return

    const { error: deptError } = await supabase
      .from("departments")
      .upsert({
        name: user.department,
        hq_name: "메타리치 시그널그룹",
        headquarter: user.headquarter,
      }, { onConflict: "name" })
    if (deptError) throw deptError

    const { error: branchError } = await supabase
      .from("branches")
      .upsert({
        name: user.team,
        dept_name: user.department,
        department: user.department,
        hq_name: "메타리치 시그널그룹",
        headquarter: user.headquarter,
      }, { onConflict: "dept_name,name" })
    if (branchError) throw branchError
  }

  const handleUserSave = async (user: any) => {
    if (!canUseOrgManagement) return

    if (!user.headquarter || !user.department || !user.team) {
      alert("본부, 사업부, 지점을 모두 입력해주세요.")
      return
    }

    const updatePayload: any = {
      is_approved: true,
      role: user.rank,
      role_level: user.rank === "headquarters" ? "headquarters" : user.rank === "leader" ? "director" : user.rank,
      rank: user.rank,
      headquarter: user.headquarter,
      headquarter_name: user.headquarter,
      department: user.department,
      department_name: user.department,
      team: user.team,
      branch_name: user.team,
    }

    if (normalizeRole(viewer) === "master") {
      updatePayload.crm_access = user.crm_access === true || user.crm_access === "true"
    }

    const { error } = await supabase.from("users").update(updatePayload).eq("id", user.id)
    if (error) {
      alert("저장 중 오류가 발생했습니다: " + error.message)
      return
    }

    try {
      await syncOrganizationOptions(user)
      alert(`${user.name}님의 직원 정보가 저장되었습니다.`)
    } catch (orgError: any) {
      alert(`${user.name}님의 정보는 저장됐지만 조직 선택지 동기화 중 오류가 발생했습니다: ${orgError?.message || "조직 테이블을 확인해주세요."}`)
    }

    setAllUsers((prev) => prev.map((target) => target.id === user.id ? { ...target, is_approved: true } : target))
  }

  const handleApprovePerf = async (agentId: string, currentStatus: boolean) => {
    if (!canApprovePerformance) {
      alert("사업부장, 본부장, 마스터만 목표 승인 상태를 변경할 수 있습니다.")
      return
    }

    const { error } = await supabase
      .from("daily_perf")
      .update({ is_approved: !currentStatus })
      .eq("user_id", agentId)
      .eq("date", monthKey)
    if (error) {
      alert("승인 처리 중 오류가 발생했습니다.")
      return
    }
    alert(!currentStatus ? "해당 월 목표를 승인했습니다. 승인 후 직원은 목표를 수정할 수 없습니다." : "해당 월 목표 승인을 해제했습니다.")
    onClose()
  }

  const saveMainNotice = async () => {
    if (!canEditNotice) return
    await supabase.from("team_settings").upsert({ key: "global_notice", value: notice }, { onConflict: "key" })
    alert("메인 공지가 저장되었습니다.")
    onClose()
  }

  const saveDepartmentSettings = async () => {
    if (!canEditDepartment || !scopeHeadquarter || !scopeDepartment) return

    await supabase.from("team_settings").upsert({
      key: departmentSettingsKey(scopeHeadquarter, scopeDepartment),
      value: JSON.stringify({
        targetAmt: tarAmt,
        targetCnt: tarCnt,
        targetIntro: tarIntro,
        actualIntro: curIntro,
        eduWeeks,
      }),
    }, { onConflict: "key" })
    alert(`${scopeHeadquarter} ${scopeDepartment} 설정이 저장되었습니다.`)
    onClose()
  }

  const getRate = (part: number, total: number) => total > 0 ? ((part / total) * 100).toFixed(1) : "0.0"
  const totalAmt = agents?.reduce((sum: number, agent: any) => sum + Number(agent.performance?.contract_amt || 0), 0) || 0
  const totalCnt = agents?.reduce((sum: number, agent: any) => sum + Number(agent.performance?.contract_cnt || 0), 0) || 0
  const totalDB = agents?.reduce((sum: number, agent: any) => sum + Number(agent.performance?.db_assigned || 0), 0) || 0
  const totalReturn = agents?.reduce((sum: number, agent: any) => sum + Number(agent.performance?.db_returned || 0), 0) || 0

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/85 p-4 font-black text-slate-900 backdrop-blur-xl">
      <div className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
        <button onClick={onClose} className="absolute right-5 top-5 z-50 text-2xl font-black text-slate-500 hover:text-black md:right-6 md:top-6">x</button>

        {type === "users" && (
          canUseOrgManagement ? (
            <div className="animate-in fade-in space-y-6 md:space-y-10">
              <h3 className="inline-block border-b-4 border-[#1a3a6e] text-2xl md:text-3xl">직원 관리</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xl">
                <table className="w-full min-w-[980px] text-left font-black">
                  <thead className="bg-[#1a3a6e] text-[13px] text-white">
                    <tr>
                      <th className="p-4 md:p-5">직원 정보</th>
                      <th className="p-4 text-center md:p-5">직급 / 본부 / 사업부 / 지점</th>
                      {normalizeRole(viewer) === "master" && <th className="p-4 text-center md:p-5">CRM</th>}
                      <th className="p-4 text-center md:p-5">처리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allUsers.map((user) => (
                      <tr key={user.id} className={`${user.is_approved ? "bg-white" : "bg-amber-50"} transition-colors hover:bg-slate-50`}>
                        <td className="p-4 md:p-6">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black md:text-xl">{user.name || user.email}</p>
                            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[13px] font-black text-indigo-600">{roleLabel(user)}</span>
                            {!user.is_approved && <span className="ml-1 text-[13px] text-rose-500">승인대기</span>}
                          </div>
                          <p className="mt-1 text-[13px] font-normal text-slate-400">{user.email}</p>
                        </td>
                        <td className="p-4 text-center md:p-6">
                          <div className="grid min-w-[520px] grid-cols-1 gap-2 md:grid-cols-4">
                            <select value={user.rank || "agent"} onChange={(event) => updateUserInfo(user.id, "rank", event.target.value)} className="rounded-xl border border-slate-300 bg-white p-3 text-[14px] font-black text-slate-900">
                              {ROLE_OPTIONS
                                .filter((option) => option.value !== "master" || normalizeRole(viewer) === "master")
                                .map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>

                            {user.isCustomHeadquarter ? (
                              <input autoFocus placeholder="본부 직접 입력" value={user.headquarter || ""} onChange={(event) => updateUserInfo(user.id, "headquarter", event.target.value)} className="rounded-xl border border-indigo-500 bg-white p-3 text-[14px] font-black text-slate-900" />
                            ) : (
                              <select value={user.headquarter || ""} onChange={(event) => updateUserInfo(user.id, "headquarter", event.target.value)} className="rounded-xl border border-slate-300 bg-white p-3 text-[14px] font-black text-slate-900">
                                <option value="">본부 선택</option>
                                {existingHeadquarters.map((hq) => <option key={hq} value={hq}>{hq}</option>)}
                                <option value="CUSTOM_INPUT">+ 직접 입력</option>
                              </select>
                            )}

                            {user.isCustomDept ? (
                              <input autoFocus placeholder="사업부 직접 입력" value={user.department || ""} onChange={(event) => updateUserInfo(user.id, "department", event.target.value)} className="rounded-xl border border-indigo-500 bg-white p-3 text-[14px] font-black text-slate-900" />
                            ) : (
                              <select value={user.department || ""} onChange={(event) => updateUserInfo(user.id, "department", event.target.value)} className="rounded-xl border border-slate-300 bg-white p-3 text-[14px] font-black text-slate-900">
                                <option value="">사업부 선택</option>
                                {existingDepts.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                                <option value="CUSTOM_INPUT">+ 직접 입력</option>
                              </select>
                            )}

                            {user.isCustomTeam ? (
                              <input autoFocus placeholder="지점 직접 입력" value={user.team || ""} onChange={(event) => updateUserInfo(user.id, "team", event.target.value)} className="rounded-xl border border-indigo-500 bg-white p-3 text-[14px] font-black text-slate-900" />
                            ) : (
                              <select value={user.team || ""} onChange={(event) => updateUserInfo(user.id, "team", event.target.value)} disabled={!user.department && !user.isCustomDept} className="rounded-xl border border-slate-300 bg-white p-3 text-[14px] font-black text-slate-900 disabled:opacity-40">
                                <option value="">지점 선택</option>
                                {existingTeams.filter((team) => team.dept === user.department).map((team, idx) => <option key={`${team.team}-${idx}`} value={team.team}>{team.team}</option>)}
                                <option value="CUSTOM_INPUT">+ 직접 입력</option>
                              </select>
                            )}
                          </div>
                        </td>
                        {normalizeRole(viewer) === "master" && (
                          <td className="p-4 text-center md:p-6">
                            <label className="flex cursor-pointer flex-col items-center gap-1.5">
                              <input type="checkbox" checked={user.crm_access === true || user.crm_access === "true"} onChange={() => updateUserInfo(user.id, "crm_access", String(!(user.crm_access === true || user.crm_access === "true")))} className="h-5 w-5 cursor-pointer accent-[#1a3a6e]" />
                              <span className="text-[11px] font-bold text-slate-500">{(user.crm_access === true || user.crm_access === "true") ? "허용" : "비허용"}</span>
                            </label>
                          </td>
                        )}
                        <td className="p-4 text-center md:p-6">
                          <button onClick={() => handleUserSave(user)} className={`rounded-full border border-[#1a3a6e] px-4 py-2 text-[13px] font-black transition-all md:px-6 ${user.is_approved ? "bg-white text-[#1a3a6e]" : "bg-[#1a3a6e] text-white"}`}>
                            {user.is_approved ? "정보 저장" : "승인"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <NoPermission message="직원 관리는 마스터와 지정 본부장 계정만 사용할 수 있습니다." />
          )
        )}

        {type === "perf" && (
          <div className="animate-in fade-in space-y-6 md:space-y-10">
            <h3 className="inline-block border-b-4 border-[#1a3a6e] text-2xl md:text-3xl">실적 관리</h3>
            <p className="text-[13px] font-bold text-slate-500">{scopeLabel || "선택된 범위"} 기준 조회</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              <StatBox label="매출 달성률" cur={totalAmt} tar={tarAmt} unit="만원" color="bg-indigo-600" />
              <StatBox label="건수 달성률" cur={totalCnt} tar={tarCnt} unit="건" color="bg-emerald-500" />
              <StatBox label="도입 인원 목표" cur={curIntro} tar={tarIntro} unit="명" color="bg-amber-500" />
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
              <table className="w-full text-left font-black">
                <thead className="bg-[#1a3a6e] text-[13px] text-white">
                  <tr><th className="p-4 md:p-6">직원</th><th className="p-4 text-center md:p-6">월 실적</th><th className="p-4 text-center md:p-6">승인 상태</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {agents?.map((agent: any) => (
                    <tr key={agent.id} className="transition-colors hover:bg-slate-50">
                      <td className="p-4 text-sm md:p-6 md:text-xl">{agent.name}</td>
                      <td className="p-4 text-center text-lg md:p-6 md:text-2xl">{Number(agent.performance?.contract_amt || 0).toLocaleString()}만원</td>
                      <td className="p-4 text-center md:p-6">
                        <button disabled={!canApprovePerformance} onClick={() => handleApprovePerf(agent.id, agent.performance?.is_approved)} className={`rounded-full border border-[#1a3a6e] px-4 py-2 text-[13px] font-black ${agent.performance?.is_approved ? "bg-[#1a3a6e] text-white" : "bg-white text-[#1a3a6e]"} disabled:cursor-not-allowed disabled:opacity-40`}>
                          {agent.performance?.is_approved ? "승인완료" : "승인"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {type === "act" && (
          <div className="animate-in fade-in space-y-6 font-black md:space-y-8">
            <h3 className="inline-block border-b-4 border-[#1a3a6e] text-2xl md:text-3xl">활동 및 분석</h3>
            {selectedAgent ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-2xl bg-[#1a3a6e] p-6 text-white shadow-2xl">
                  <p className="text-xl font-black md:text-3xl">{selectedAgent.name} 활동 분석</p>
                  <button disabled={!canApprovePerformance} onClick={() => handleApprovePerf(selectedAgent.id, selectedAgent.performance?.is_approved)} className={`rounded-full px-6 py-3 text-[13px] font-black ${selectedAgent.performance?.is_approved ? "bg-rose-600" : "bg-white text-[#1a3a6e]"} disabled:cursor-not-allowed disabled:opacity-40`}>
                    {selectedAgent.performance?.is_approved ? "승인 해제" : "확인 및 승인"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <ActivityCountBox label="배정 DB" val={`${selectedAgent.performance?.db_assigned || 0}건`} />
                  <ActivityCountBox label="반품 DB" val={`${selectedAgent.performance?.db_returned || 0}건`} />
                  <ActivityCountBox label="반품률" val={`${getRate(selectedAgent.performance?.db_returned, selectedAgent.performance?.db_assigned)}%`} />
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <ActivityCountBox label="전화" val={`${selectedAgent.performance?.call || 0}건`} />
                  <ActivityCountBox label="만남" val={`${selectedAgent.performance?.meet || 0}건`} />
                  <ActivityCountBox label="제안" val={`${selectedAgent.performance?.pt || 0}건`} />
                  <ActivityCountBox label="소개" val={`${selectedAgent.performance?.intro || 0}건`} />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center shadow-sm">
                  <ActivityCountBox label="총 배정 DB" val={`${totalDB}건`} />
                  <ActivityCountBox label="총 반품 DB" val={`${totalReturn}건`} />
                  <ActivityCountBox label="전체 반품률" val={`${getRate(totalReturn, totalDB)}%`} />
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <ActivityCountBox label="전화 합계" val={`${agents?.reduce((s: number, a: any) => s + Number(a.performance?.call || 0), 0) || 0}건`} />
                  <ActivityCountBox label="만남 합계" val={`${agents?.reduce((s: number, a: any) => s + Number(a.performance?.meet || 0), 0) || 0}건`} />
                  <ActivityCountBox label="제안 합계" val={`${agents?.reduce((s: number, a: any) => s + Number(a.performance?.pt || 0), 0) || 0}건`} />
                  <ActivityCountBox label="소개 합계" val={`${agents?.reduce((s: number, a: any) => s + Number(a.performance?.intro || 0), 0) || 0}건`} />
                </div>
              </div>
            )}
          </div>
        )}

        {type === "edu" && (
          <div className="animate-in fade-in space-y-6 font-black md:space-y-10">
            <h3 className="inline-block border-b-4 border-[#1a3a6e] text-2xl md:text-3xl">교육 관리</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              {[1, 2, 3, 4, 5].map((week) => (
                <div key={week} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-1 text-[12px] font-black text-[#2563eb]">{week === 5 ? "추가" : `${week}주차`}</p>
                  <p className="text-[13px] font-bold text-slate-600">{eduWeeks[week as keyof typeof eduWeeks] || "등록된 교육 내용이 없습니다."}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xl">
              <table className="w-full min-w-[600px] text-left">
                <thead className="bg-[#1a3a6e] text-[13px] text-white">
                  <tr>
                    <th className="sticky left-0 bg-[#1a3a6e] p-6">이름</th>
                    {[1, 2, 3, 4, 5].map((week) => <th key={week} className="p-6 text-center">{week === 5 ? "추가" : `${week}주차`}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {agents?.map((agent: any) => (
                    <tr key={agent.id} className="hover:bg-slate-50">
                      <td className="sticky left-0 border-r border-slate-100 bg-white p-6 text-lg font-black">{agent.name}</td>
                      {[1, 2, 3, 4, 5].map((week) => (
                        <td key={week} className="p-6 text-center">
                          <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition-all ${agent.performance?.[`edu_${week}`] ? "border-[#1a3a6e] bg-[#1a3a6e] text-white shadow-lg" : "border-slate-200 text-transparent"}`}>
                            ✓
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {type === "sys" && (
          <div className="animate-in fade-in space-y-6 font-black md:space-y-10">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-2xl md:text-3xl">설정 관리</h3>
              <p className="mt-2 text-[13px] font-bold text-slate-500">메인 공지는 마스터와 본부장, 사업부별 목표와 교육 커리큘럼은 해당 사업부장만 수정할 수 있습니다.</p>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-lg font-black text-[#1a3a6e]">메인 공지</h4>
                {canEditNotice && <button onClick={saveMainNotice} className="rounded-full bg-[#1a3a6e] px-5 py-2 text-[13px] font-black text-white">공지 저장</button>}
              </div>
              <input value={notice} onChange={(event) => setNotice(event.target.value)} readOnly={!canEditNotice} className="w-full rounded-2xl border border-slate-300 bg-white p-5 text-lg font-black outline-none read-only:bg-slate-100 read-only:text-slate-500 focus:border-[#2563eb]" placeholder="공지사항 입력" />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="text-lg font-black text-[#1a3a6e]">사업부별 설정</h4>
                  <p className="text-[13px] font-bold text-slate-500">{scopeLabel || "사업부를 선택해주세요."}</p>
                </div>
                {canEditDepartment && <button onClick={saveDepartmentSettings} className="rounded-full bg-[#1a3a6e] px-5 py-2 text-[13px] font-black text-white">사업부 설정 저장</button>}
              </div>
              {!scopeDepartment ? (
                <NoPermission message="사업부별 설정을 보려면 사업부를 먼저 선택해주세요." />
              ) : (
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                  <div className="space-y-4">
                    <InputRow label="사업부 매출 목표 (만원)" val={tarAmt} onChange={setTarAmt} disabled={!canEditDepartment} />
                    <InputRow label="사업부 계약 목표 (건)" val={tarCnt} onChange={setTarCnt} disabled={!canEditDepartment} />
                    <InputRow label="도입 인원 목표 (명)" val={tarIntro} onChange={setTarIntro} disabled={!canEditDepartment} />
                    <InputRow label="현재 도입 인원 (명)" val={curIntro} onChange={setCurIntro} disabled={!canEditDepartment} />
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((week) => (
                      <div key={week} className="flex gap-2">
                        <span className="flex h-12 w-14 items-center justify-center rounded-xl bg-[#1a3a6e] text-[10px] text-white">{week === 5 ? "추가" : `${week}주차`}</span>
                        <input value={eduWeeks[week as keyof typeof eduWeeks] || ""} readOnly={!canEditDepartment} onChange={(event) => setEduWeeks({ ...eduWeeks, [week]: event.target.value })} className="flex-1 rounded-xl border border-slate-300 bg-white p-3 text-sm font-black outline-none read-only:bg-slate-100 read-only:text-slate-500 focus:border-[#2563eb]" placeholder={week === 5 ? "추가 교육 내용" : `${week}주차 교육 커리큘럼`} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function departmentSettingsKey(headquarter: string, department: string) {
  return `department_settings:${headquarter}:${department}`
}

function NoPermission({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <h3 className="text-xl font-black text-[#1a3a6e]">권한 안내</h3>
      <p className="mt-2 text-[14px] font-bold text-slate-500">{message}</p>
    </div>
  )
}

function ActivityCountBox({ label, val }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center font-black shadow-sm transition-transform hover:-translate-y-0.5">
      <p className="mb-2 text-[13px] text-slate-400">{label}</p>
      <p className="text-xl font-black">{val || 0}</p>
    </div>
  )
}

function StatBox({ label, cur, tar, unit, color }: any) {
  const pct = Math.min((cur / (tar || 1)) * 100, 100).toFixed(1)
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center font-black shadow-lg">
      <p className="text-[13px] text-slate-400">{label}</p>
      <p className="text-2xl font-black">{Number(cur).toLocaleString()}{unit} / {Number(tar).toLocaleString()}{unit}</p>
      <div className="relative h-10 w-full overflow-hidden rounded-full border border-slate-200 bg-white">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white mix-blend-difference">{pct}%</span>
      </div>
    </div>
  )
}

function InputRow({ label, val, onChange, disabled }: any) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-md">
      <label className="text-[13px] font-black">{label}</label>
      <input type="number" value={val} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} className="w-28 rounded-xl border border-slate-300 bg-white p-2 text-center text-xl font-black outline-none disabled:bg-slate-100 disabled:text-slate-500 focus:border-[#2563eb]" />
    </div>
  )
}
