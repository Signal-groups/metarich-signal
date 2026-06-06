"use client"

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import AgentView from "./AgentView"
import { exportExcel } from "./exportExcel"
import {
  canEditDepartmentSettings,
  canEditMainNotice,
  canAccessCrm,
  canSeeUser,
  getBranch,
  getDepartment,
  getHeadquarter,
  normalizeRole,
  roleLabel,
} from "../../../lib/roles"

type ManagementViewProps = {
  user: any
  selectedDate: Date
}

const QUICK_LINKS = [
  { href: "https://meta-on.kr/#/login", label: "메타온" },
  { href: "https://xn--on3bi2e18htop.com/", label: "보험ON" },
  { href: "https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm", label: "교육자료" },
  { href: "/sales-master", label: "세일즈 마스터" },
  { href: "/sales-book", label: "세일즈 북" },
  { href: "/product-all", label: "상품 모아보기" },
]

const defaultDeptMeta = { targetAmt: 3000, targetCnt: 100, targetIntro: 10, actualIntro: 0 }

export default function ManagementView({ user, selectedDate }: ManagementViewProps) {
  const [agents, setAgents] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null)
  const [globalNotice, setGlobalNotice] = useState("")
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false)
  const [deptMeta, setDeptMeta] = useState(defaultDeptMeta)
  const [showExportOpt, setShowExportOpt] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [selectedHeadquarter, setSelectedHeadquarter] = useState("")
  const [selectedDept, setSelectedDept] = useState("")
  const [selectedTeam, setSelectedTeam] = useState("")

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-01`
  const currentRole = normalizeRole(user)
  const isMaster = currentRole === "master"
  const canOpenSettings = currentRole === "leader" || currentRole === "headquarters" || currentRole === "master"
  const canEditSelectedDept = canEditDepartmentSettings(user, selectedHeadquarter, selectedDept)
  const canApproveSelectedDept = currentRole === "leader" || currentRole === "headquarters" || currentRole === "master"
  const canEditNotice = canEditMainNotice(user)
  const canUseCrm = canAccessCrm(user)

  const fetchTeamData = useCallback(async () => {
    const { data: settings } = await supabase.from("team_settings").select("*")
    setGlobalNotice(settings?.find((s) => s.key === "global_notice")?.value || "등록된 공지사항이 없습니다.")

    const { data: users } = await supabase.from("users").select("*")
    const { data: allPerfs } = await supabase.from("daily_perf").select("*")
    const visibleUsers = users?.filter((target) => canSeeUser(user, target)) || []

    setAgents(visibleUsers.map((target) => {
      const userHistory = allPerfs?.filter((perf) => perf.user_id === target.id) || []
      const currentPerf = userHistory.find((perf) => perf.date === monthKey) || {
        call: 0,
        meet: 0,
        pt: 0,
        intro: 0,
        db_assigned: 0,
        db_returned: 0,
        contract_amt: 0,
        contract_cnt: 0,
        target_amt: 300,
        target_cnt: 10,
        is_approved: target.is_approved || false,
      }

      return {
        ...target,
        performance: currentPerf,
      }
    }))
  }, [monthKey, user])

  useEffect(() => {
    fetchTeamData()
  }, [fetchTeamData])

  const headquarters = useMemo(() => Array.from(new Set(agents.map(getHeadquarter).filter(Boolean))).sort(), [agents])
  const departments = useMemo(() => Array.from(new Set(
    agents
      .filter((agent) => !selectedHeadquarter || getHeadquarter(agent) === selectedHeadquarter)
      .map(getDepartment)
      .filter(Boolean)
  )).sort(), [agents, selectedHeadquarter])
  const teams = useMemo(() => Array.from(new Set(
    agents
      .filter((agent) => (!selectedHeadquarter || getHeadquarter(agent) === selectedHeadquarter) && (!selectedDept || getDepartment(agent) === selectedDept))
      .map(getBranch)
      .filter(Boolean)
  )).sort(), [agents, selectedHeadquarter, selectedDept])

  useEffect(() => {
    if (currentRole === "headquarters") setSelectedHeadquarter(getHeadquarter(user))
    if (currentRole === "leader") {
      setSelectedHeadquarter(getHeadquarter(user))
      setSelectedDept(getDepartment(user))
      setSelectedTeam("")
    }
    if (currentRole === "manager") {
      setSelectedHeadquarter(getHeadquarter(user))
      setSelectedDept(getDepartment(user))
      setSelectedTeam(getBranch(user))
    }
  }, [currentRole, user])

  useEffect(() => {
    if (!selectedHeadquarter && headquarters.length === 1) setSelectedHeadquarter(headquarters[0])
  }, [headquarters, selectedHeadquarter])

  const loadDepartmentMeta = useCallback(async () => {
    if (!selectedDept) {
      setDeptMeta(defaultDeptMeta)
      return
    }

    const { data } = await supabase
      .from("team_settings")
      .select("value")
      .eq("key", departmentSettingsKey(selectedHeadquarter || "미지정본부", selectedDept))
      .maybeSingle()

    if (!data?.value) {
      setDeptMeta(defaultDeptMeta)
      return
    }

    try {
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value
      setDeptMeta({
        targetAmt: Number(parsed.targetAmt) || defaultDeptMeta.targetAmt,
        targetCnt: Number(parsed.targetCnt) || defaultDeptMeta.targetCnt,
        targetIntro: Number(parsed.targetIntro) || defaultDeptMeta.targetIntro,
        actualIntro: Number(parsed.actualIntro) || 0,
      })
    } catch {
      setDeptMeta(defaultDeptMeta)
    }
  }, [selectedHeadquarter, selectedDept])

  useEffect(() => {
    loadDepartmentMeta()
  }, [loadDepartmentMeta])

  const scopedAgents = agents.filter((agent) => {
    const haystack = `${agent.name || ""} ${agent.email || ""} ${getHeadquarter(agent)} ${getDepartment(agent)} ${getBranch(agent)}`.toLowerCase()
    return (!searchText || haystack.includes(searchText.toLowerCase()))
      && (!selectedHeadquarter || getHeadquarter(agent) === selectedHeadquarter)
      && (!selectedDept || getDepartment(agent) === selectedDept)
      && (!selectedTeam || getBranch(agent) === selectedTeam)
  })

  const totals = useMemo(() => scopedAgents.reduce((acc, agent) => ({
    amt: acc.amt + Number(agent.performance?.contract_amt || 0),
    cnt: acc.cnt + Number(agent.performance?.contract_cnt || 0),
    call: acc.call + Number(agent.performance?.call || 0),
    meet: acc.meet + Number(agent.performance?.meet || 0),
    pt: acc.pt + Number(agent.performance?.pt || 0),
    intro: acc.intro + Number(agent.performance?.intro || 0),
  }), { amt: 0, cnt: 0, call: 0, meet: 0, pt: 0, intro: 0 }), [scopedAgents])

  const scopeLabel = [
    selectedHeadquarter || (isMaster ? "전체 본부" : getHeadquarter(user)),
    selectedDept || (currentRole === "headquarters" || isMaster ? "전체 사업부" : getDepartment(user)),
    selectedTeam || (currentRole === "manager" ? getBranch(user) : ""),
  ].filter(Boolean).join(" / ")

  const tabs = [
    { id: "perf", label: "실적 관리" },
    { id: "act", label: "활동 및 분석" },
    { id: "edu", label: "교육 관리" },
    ...(canOpenSettings ? [{ id: "sys", label: "설정 관리" }] : []),
  ]

  const handleExport = (type: "excel" | "pdf") => {
    if (type === "excel") {
      exportExcel({ agents: scopedAgents, teamMeta: deptMeta, monthKey })
    } else {
      const doc = new jsPDF()
      ;(doc as any).autoTable({
        head: [["이름", "소속", "직급", "실적(만원)", "건수", "전화", "만남", "제안"]],
        body: scopedAgents.map((agent) => [
          agent.name,
          `${getHeadquarter(agent)} ${getDepartment(agent)} ${getBranch(agent)}`.trim(),
          roleLabel(agent),
          Number(agent.performance?.contract_amt || 0),
          Number(agent.performance?.contract_cnt || 0),
          Number(agent.performance?.call || 0),
          Number(agent.performance?.meet || 0),
          Number(agent.performance?.pt || 0),
        ]),
      })
      doc.save(`Team_Report_${monthKey}.pdf`)
    }
    setShowExportOpt(false)
  }

  const achievementRate = Math.round((totals.amt / (deptMeta.targetAmt || 1)) * 100)

  return (
    <div className="min-w-0 flex-1 space-y-6 p-4 pb-20 font-black text-[#111827] md:p-6 [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">
      <div onClick={() => setIsNoticeExpanded(!isNoticeExpanded)} className={`flex cursor-pointer items-center rounded-2xl border-l-[6px] border-[#2563eb] bg-white p-4 shadow-sm transition-all ${isNoticeExpanded ? "min-h-[3.5rem] h-auto" : "h-14 overflow-hidden"}`}>
        <div className={`w-full text-sm font-black text-[#1a3a6e] md:text-base ${isNoticeExpanded ? "whitespace-normal leading-relaxed" : "whitespace-nowrap"}`}>
          {globalNotice}
        </div>
      </div>

      <section className="rounded-2xl border border-[#1a3a6e] bg-[#1a3a6e] p-6 text-white shadow-xl md:p-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[13px] text-sky-200">{roleLabel(user)} 관리 범위</p>
            <h2 className="text-2xl font-black md:text-3xl">{scopeLabel || "관리 범위 없음"}</h2>
          </div>
          <span className="text-4xl font-black md:text-5xl">{achievementRate}%</span>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full border border-white/20 bg-white/10">
          <div className="h-full bg-[#0ea5e9] transition-all duration-1000" style={{ width: `${Math.min(achievementRate, 100)}%` }} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="실적" value={`${totals.amt.toLocaleString()}만원`} />
          <Metric label="계약" value={`${totals.cnt.toLocaleString()}건`} />
          <Metric label="전화" value={`${totals.call.toLocaleString()}건`} />
          <Metric label="만남" value={`${totals.meet.toLocaleString()}건`} />
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-6">
        {QUICK_LINKS.map((link) => <QuickLink key={link.label} {...link} />)}
        {canUseCrm && <QuickLink href="/crm" label="고객관리" />}
        <div className="relative col-span-2 md:col-span-1">
          <button onClick={() => setShowExportOpt(!showExportOpt)} className="h-full w-full rounded-2xl border border-emerald-700 bg-emerald-600 p-4 text-center text-[13px] font-black text-white shadow-lg">
            리포트 출력
          </button>
          {showExportOpt && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <button onClick={() => handleExport("excel")} className="w-full border-b p-4 text-left text-[13px] font-black hover:bg-slate-50">엑셀 출력</button>
              <button onClick={() => handleExport("pdf")} className="w-full p-4 text-left text-[13px] font-black hover:bg-slate-50">PDF 출력</button>
            </div>
          )}
        </div>
      </div>

      <div className={`grid gap-2 font-black ${tabs.length >= 5 ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id)
            }}
            className={`${activeTab === tab.id ? "bg-[#1a3a6e] text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-50"} rounded-2xl border border-slate-200 px-1 py-4 text-center text-[13px] font-black transition-all md:text-sm`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[13px] font-black text-[#2563eb]">탑다운 조회</p>
            <h2 className="text-2xl font-black text-[#1a3a6e]">{scopeLabel || "조직 선택"}</h2>
          </div>
          <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="이름, 본부, 사업부, 지점 검색" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#2563eb] md:max-w-sm" />
        </div>

        <div className="flex flex-wrap gap-2">
          {(isMaster || currentRole === "headquarters") && (
            <>
              {isMaster && <FilterButton label="전체 본부" active={!selectedHeadquarter} onClick={() => { setSelectedHeadquarter(""); setSelectedDept(""); setSelectedTeam("") }} />}
              {headquarters.map((hq) => <FilterButton key={hq} label={hq} active={selectedHeadquarter === hq} onClick={() => { setSelectedHeadquarter(hq); setSelectedDept(""); setSelectedTeam("") }} />)}
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {(isMaster || currentRole === "headquarters") && <FilterButton label="전체 사업부" active={!selectedDept} onClick={() => { setSelectedDept(""); setSelectedTeam("") }} />}
          {departments.map((dept) => <FilterButton key={dept} label={dept} active={selectedDept === dept} onClick={() => { setSelectedDept(dept); setSelectedTeam("") }} />)}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {currentRole !== "manager" && <FilterButton label="전체 지점" active={!selectedTeam} onClick={() => setSelectedTeam("")} />}
          {teams.map((team) => <FilterButton key={team} label={team} active={selectedTeam === team} onClick={() => setSelectedTeam(team)} />)}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 font-black shadow-sm md:p-8">
        <h2 className="mb-6 border-l-[6px] border-[#2563eb] pl-4 text-lg font-black text-[#1a3a6e] md:text-xl">{scopeLabel} 모니터링</h2>
        <div className="space-y-4 md:space-y-6">
          {scopedAgents.filter((agent) => agent.is_approved).map((agent) => {
            const amtRate = Math.round(((Number(agent.performance?.contract_amt) || 0) / (Number(agent.performance?.target_amt) || 1)) * 100)
            const cntRate = Math.round(((Number(agent.performance?.contract_cnt) || 0) / (Number(agent.performance?.target_cnt) || 1)) * 100)
            return (
              <div key={agent.id} onClick={() => { setSelectedAgent(agent); setActiveTab("act") }} className="cursor-pointer space-y-6 rounded-2xl border border-transparent bg-slate-50 p-5 shadow-sm transition-all hover:border-[#2563eb] hover:bg-white md:p-8">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-black px-2 py-0.5 text-[13px] font-black text-white">{roleLabel(agent)}</span>
                      <p className="text-xl font-black">{agent.name} <span className="text-sm font-normal text-slate-400">({getDepartment(agent)} / {getBranch(agent) || "미소속"})</span></p>
                    </div>
                    <p className="text-[13px] font-bold text-slate-400">{agent.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <MonitorBar label="매출 달성률" rate={amtRate} current={agent.performance?.contract_amt} target={agent.performance?.target_amt} unit="만원" />
                  <MonitorBar label="건수 달성률" rate={cntRate} current={agent.performance?.contract_cnt} target={agent.performance?.target_cnt} unit="건" />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {!isMaster && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="mb-6 border-l-[6px] border-[#2563eb] pl-4 text-lg font-black text-[#1a3a6e]">내 실적 입력</h2>
          <AgentView user={user} selectedDate={selectedDate} />
        </section>
      )}

      {activeTab && (
        <AdminPopups
          type={activeTab}
          agents={scopedAgents}
          selectedAgent={selectedAgent}
          teamMeta={deptMeta}
          viewer={user}
          monthKey={monthKey}
          selectedScope={{ headquarter: selectedHeadquarter || "미지정본부", department: selectedDept, team: selectedTeam }}
          canEditDepartment={canEditSelectedDept}
          canApprovePerformance={canApproveSelectedDept}
          canEditNotice={canEditNotice}
          onClose={() => {
            setActiveTab(null)
            setSelectedAgent(null)
            fetchTeamData()
            loadDepartmentMeta()
          }}
        />
      )}
    </div>
  )
}

export function departmentSettingsKey(headquarter: string, department: string) {
  return `department_settings:${headquarter}:${department}`
}

function Metric({ label, value }: { label: string, value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 p-4 text-center [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">
      <p className="mb-1 text-[12px] text-sky-200">{label}</p>
      <p className="text-lg font-black text-white">{value}</p>
    </div>
  )
}

function MonitorBar({ label, rate, current, target, unit }: any) {
  const styles = rate >= 80 ? { bar: "bg-blue-500", text: "text-blue-600" } : rate >= 65 ? { bar: "bg-orange-500", text: "text-orange-600" } : rate >= 30 ? { bar: "bg-yellow-400", text: "text-yellow-500" } : { bar: "bg-red-500", text: "text-red-600" }
  return (
    <div className="min-w-0 space-y-3 font-black [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-slate-400">{label}</span>
          <span className="text-[12px] font-black">{Number(current || 0).toLocaleString()} / {Number(target || 0).toLocaleString()} {unit}</span>
        </div>
        <span className={`text-3xl font-black italic ${styles.text}`}>{rate}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full border border-black/5 bg-slate-200">
        <div className={`${styles.bar} h-full transition-all duration-1000 ease-out`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
    </div>
  )
}

function QuickLink({ href, label }: { href: string, label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex min-w-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-center text-[13px] font-black leading-snug shadow-sm transition-all hover:border-[#2563eb] hover:text-[#1a3a6e] [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">
      {label}
    </a>
  )
}

function FilterButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`max-w-full rounded-full px-4 py-2 text-[13px] font-black leading-snug transition [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all] ${active ? "bg-[#1a3a6e] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
      {label}
    </button>
  )
}
