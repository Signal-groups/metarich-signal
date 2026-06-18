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
const defaultPerfExt = {
  life_amt: 0, life_cnt: 0, nonlife_amt: 0, nonlife_cnt: 0,
  target_life_amt: 150, target_life_cnt: 5, target_nonlife_amt: 150, target_nonlife_cnt: 5,
  target_call: 100, target_meet: 30, target_pt: 15, target_intro: 10, target_db_assigned: 50, target_db_returned: 0,
}

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
        call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
        contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10,
        is_approved: target.is_approved || false,
      }
      const rawExt = settings?.find((setting) => setting.key === `daily_perf_ext:${target.id}:${monthKey}`)?.value
      let parsedExt = {}
      if (rawExt) {
        try { parsedExt = typeof rawExt === "string" ? JSON.parse(rawExt) : rawExt } catch { parsedExt = {} }
      }
      return { ...target, performance: { ...defaultPerfExt, ...currentPerf, ...parsedExt } }
    }))
  }, [monthKey, user])

  useEffect(() => { fetchTeamData() }, [fetchTeamData])

  const headquarters = useMemo(() => Array.from(new Set(agents.map(getHeadquarter).filter(Boolean))).sort(), [agents])
  const departments = useMemo(() => Array.from(new Set(
    agents.filter((agent) => !selectedHeadquarter || getHeadquarter(agent) === selectedHeadquarter).map(getDepartment).filter(Boolean)
  )).sort(), [agents, selectedHeadquarter])
  const teams = useMemo(() => Array.from(new Set(
    agents.filter((agent) => (!selectedHeadquarter || getHeadquarter(agent) === selectedHeadquarter) && (!selectedDept || getDepartment(agent) === selectedDept)).map(getBranch).filter(Boolean)
  )).sort(), [agents, selectedHeadquarter, selectedDept])

  useEffect(() => {
    if (currentRole === "headquarters") setSelectedHeadquarter(getHeadquarter(user))
    if (currentRole === "leader") { setSelectedHeadquarter(getHeadquarter(user)); setSelectedDept(getDepartment(user)); setSelectedTeam("") }
    if (currentRole === "manager") { setSelectedHeadquarter(getHeadquarter(user)); setSelectedDept(getDepartment(user)); setSelectedTeam(getBranch(user)) }
  }, [currentRole, user])

  useEffect(() => {
    if (!selectedHeadquarter && headquarters.length === 1) setSelectedHeadquarter(headquarters[0])
  }, [headquarters, selectedHeadquarter])

  const loadDepartmentMeta = useCallback(async () => {
    if (!selectedDept) { setDeptMeta(defaultDeptMeta); return }
    const { data } = await supabase.from("team_settings").select("value").eq("key", departmentSettingsKey(selectedHeadquarter || "미지정본부", selectedDept)).maybeSingle()
    if (!data?.value) { setDeptMeta(defaultDeptMeta); return }
    try {
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value
      setDeptMeta({
        targetAmt: Number(parsed.targetAmt) || defaultDeptMeta.targetAmt,
        targetCnt: Number(parsed.targetCnt) || defaultDeptMeta.targetCnt,
        targetIntro: Number(parsed.targetIntro) || defaultDeptMeta.targetIntro,
        actualIntro: Number(parsed.actualIntro) || 0,
      })
    } catch { setDeptMeta(defaultDeptMeta) }
  }, [selectedHeadquarter, selectedDept])

  useEffect(() => { loadDepartmentMeta() }, [loadDepartmentMeta])

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
    targetAmt: acc.targetAmt + Number(agent.performance?.target_amt || 0),
    targetCnt: acc.targetCnt + Number(agent.performance?.target_cnt || 0),
    lifeAmt: acc.lifeAmt + Number(agent.performance?.life_amt || 0),
    lifeCnt: acc.lifeCnt + Number(agent.performance?.life_cnt || 0),
    nonlifeAmt: acc.nonlifeAmt + Number(agent.performance?.nonlife_amt || 0),
    nonlifeCnt: acc.nonlifeCnt + Number(agent.performance?.nonlife_cnt || 0),
    targetLifeAmt: acc.targetLifeAmt + Number(agent.performance?.target_life_amt || 0),
    targetLifeCnt: acc.targetLifeCnt + Number(agent.performance?.target_life_cnt || 0),
    targetNonlifeAmt: acc.targetNonlifeAmt + Number(agent.performance?.target_nonlife_amt || 0),
    targetNonlifeCnt: acc.targetNonlifeCnt + Number(agent.performance?.target_nonlife_cnt || 0),
    call: acc.call + Number(agent.performance?.call || 0),
    meet: acc.meet + Number(agent.performance?.meet || 0),
    pt: acc.pt + Number(agent.performance?.pt || 0),
    intro: acc.intro + Number(agent.performance?.intro || 0),
    dbAssigned: acc.dbAssigned + Number(agent.performance?.db_assigned || 0),
    dbReturned: acc.dbReturned + Number(agent.performance?.db_returned || 0),
    targetCall: acc.targetCall + Number(agent.performance?.target_call || 0),
    targetMeet: acc.targetMeet + Number(agent.performance?.target_meet || 0),
    targetPt: acc.targetPt + Number(agent.performance?.target_pt || 0),
    targetIntro: acc.targetIntro + Number(agent.performance?.target_intro || 0),
    targetDbAssigned: acc.targetDbAssigned + Number(agent.performance?.target_db_assigned || 0),
    targetDbReturned: acc.targetDbReturned + Number(agent.performance?.target_db_returned || 0),
  }), {
    amt: 0, cnt: 0, targetAmt: 0, targetCnt: 0,
    lifeAmt: 0, lifeCnt: 0, nonlifeAmt: 0, nonlifeCnt: 0,
    targetLifeAmt: 0, targetLifeCnt: 0, targetNonlifeAmt: 0, targetNonlifeCnt: 0,
    call: 0, meet: 0, pt: 0, intro: 0, dbAssigned: 0, dbReturned: 0,
    targetCall: 0, targetMeet: 0, targetPt: 0, targetIntro: 0, targetDbAssigned: 0, targetDbReturned: 0,
  }), [scopedAgents])

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
      exportExcel({
        agents: scopedAgents,
        teamMeta: deptMeta,
        monthKey,
      })
    } else {
      const doc = new jsPDF()
      ;(doc as any).autoTable({
        head: [["이름", "소속", "직급", "매출(만)", "건수", "전화", "만남", "제안"]],
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

  const achievementRate = Math.round((totals.amt / (totals.targetAmt || deptMeta.targetAmt || 1)) * 100)
  const countAchievementRate = Math.round((totals.cnt / (totals.targetCnt || deptMeta.targetCnt || 1)) * 100)

  return (
    <div className="management-workspace min-w-0 [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]" style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 80 }}>

      {/* 공지 배너 */}
      <div
        onClick={() => setIsNoticeExpanded(!isNoticeExpanded)}
        style={{ background: "#1a2540", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderRadius: 10, cursor: "pointer" }}
      >
        <span style={{ background: "#378add", color: "white", fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 4, flexShrink: 0 }}>NOTICE</span>
        <div style={{ overflow: "hidden", flex: 1 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", whiteSpace: isNoticeExpanded ? "normal" : "nowrap", overflow: "hidden", textOverflow: isNoticeExpanded ? "unset" : "ellipsis" }}>
            {globalNotice}
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div style={{ background: "white", borderRadius: 12, border: "0.5px solid #e4edf5", padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 11, color: "#7a9ab2", marginBottom: 4, letterSpacing: "0.04em" }}>{roleLabel(user)} 관리 범위</p>
            <p style={{ fontSize: 18, fontWeight: 500, color: "#1a2d42" }}>{scopeLabel || "관리 범위 없음"}</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <CircleRate label="금액" rate={achievementRate} size={90} />
            <CircleRate label="건수" rate={countAchievementRate} size={90} />
          </div>
        </div>
        <div className="management-stat-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 2fr", gap: 10 }}>
          <InsuranceSummaryBox title="생명보험" amount={totals.lifeAmt} count={totals.lifeCnt} targetAmount={totals.targetLifeAmt} targetCount={totals.targetLifeCnt} tone="#2563eb" />
          <InsuranceSummaryBox title="손해보험" amount={totals.nonlifeAmt} count={totals.nonlifeCnt} targetAmount={totals.targetNonlifeAmt} targetCount={totals.targetNonlifeCnt} tone="#0f6e56" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { label: "전화", current: totals.call, target: totals.targetCall },
              { label: "만남", current: totals.meet, target: totals.targetMeet },
              { label: "제안", current: totals.pt, target: totals.targetPt },
              { label: "소개", current: totals.intro, target: totals.targetIntro },
              { label: "신청", current: totals.dbAssigned, target: totals.targetDbAssigned },
              { label: "반품률", current: totals.dbReturned, target: totals.dbAssigned, rateMode: true },
            ].map((item) => (
              <MiniActivityGauge key={item.label} {...item} />
            ))}
          </div>
        </div>
      </div>

      {/* 퀵링크 + 리포트 */}
      <div style={{ background: "white", borderRadius: 12, border: "0.5px solid #e4edf5", padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {QUICK_LINKS.map((link) => (
          <a key={link.label} href={link.href} target="_blank" rel="noreferrer" style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, color: "#4a6275", background: "#f7fafc", border: "0.5px solid #d4e0eb", textDecoration: "none", whiteSpace: "nowrap" }}>
            {link.label}
          </a>
        ))}
        {canUseCrm && (
          <a href="/crm" style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, color: "#0f6e56", background: "#e1f5ee", border: "0.5px solid #9fe1cb", textDecoration: "none", whiteSpace: "nowrap" }}>고객관리</a>
        )}
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <button
            onClick={() => setShowExportOpt(!showExportOpt)}
            style={{ padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 500, color: "white", background: "#1d9e75", border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            리포트 출력
          </button>
          {showExportOpt && (
            <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 50, marginTop: 6, width: 160, background: "white", borderRadius: 10, border: "0.5px solid #e4edf5", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", overflow: "hidden" }}>
              <button onClick={() => handleExport("excel")} style={{ width: "100%", padding: "11px 14px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "#1a2d42", background: "none", border: "none", borderBottom: "0.5px solid #f0f4f8", cursor: "pointer", fontFamily: "inherit" }}>엑셀 출력</button>
              <button onClick={() => handleExport("pdf")} style={{ width: "100%", padding: "11px 14px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "#1a2d42", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>PDF 출력</button>
            </div>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 2, background: "#eef2f7", borderRadius: 10, padding: 3, flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
              border: activeTab === tab.id ? "0.5px solid #d4e0eb" : "none",
              background: activeTab === tab.id ? "white" : "transparent",
              color: activeTab === tab.id ? "#1a2d42" : "#7a9ab2",
              fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탑다운 조회 */}
      <div style={{ background: "white", borderRadius: 12, border: "0.5px solid #e4edf5", padding: "16px 18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 11, color: "#378add", marginBottom: 3, letterSpacing: "0.04em" }}>탑다운 조회</p>
            <p style={{ fontSize: 16, fontWeight: 500, color: "#1a2d42" }}>{scopeLabel || "조직 선택"}</p>
          </div>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="이름, 본부, 사업부, 지점 검색"
            style={{ borderRadius: 8, border: "0.5px solid #d4e0eb", background: "#f7fafc", padding: "8px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", color: "#1a2d42", width: "100%", maxWidth: 260 }}
          />
        </div>

        {(isMaster || currentRole === "headquarters") && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
            {isMaster && <FilterChip label="전체 본부" active={!selectedHeadquarter} onClick={() => { setSelectedHeadquarter(""); setSelectedDept(""); setSelectedTeam("") }} />}
            {headquarters.map((hq) => <FilterChip key={hq} label={hq} active={selectedHeadquarter === hq} onClick={() => { setSelectedHeadquarter(hq); setSelectedDept(""); setSelectedTeam("") }} />)}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingTop: 10, borderTop: "0.5px solid #f0f4f8", marginBottom: 10 }}>
          {(isMaster || currentRole === "headquarters") && <FilterChip label="전체 사업부" active={!selectedDept} onClick={() => { setSelectedDept(""); setSelectedTeam("") }} />}
          {departments.map((dept) => <FilterChip key={dept} label={dept} active={selectedDept === dept} onClick={() => { setSelectedDept(dept); setSelectedTeam("") }} />)}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingTop: 10, borderTop: "0.5px solid #f0f4f8" }}>
          {currentRole !== "manager" && <FilterChip label="전체 지점" active={!selectedTeam} onClick={() => setSelectedTeam("")} />}
          {teams.map((team) => <FilterChip key={team} label={team} active={selectedTeam === team} onClick={() => setSelectedTeam(team)} />)}
        </div>
      </div>

      {/* 모니터링 */}
      <div style={{ background: "white", borderRadius: 12, border: "0.5px solid #e4edf5", padding: "16px 18px" }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: "#1a2d42", marginBottom: 14, paddingLeft: 10, borderLeft: "3px solid #378add" }}>{scopeLabel} 모니터링</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {scopedAgents.filter((agent) => agent.is_approved).map((agent) => {
            const amtRate = Math.round(((Number(agent.performance?.contract_amt) || 0) / (Number(agent.performance?.target_amt) || 1)) * 100)
            const cntRate = Math.round(((Number(agent.performance?.contract_cnt) || 0) / (Number(agent.performance?.target_cnt) || 1)) * 100)
            const activityItems = [
              { label: "전화", current: Number(agent.performance?.call || 0), target: Number(agent.performance?.target_call || 0) },
              { label: "만남", current: Number(agent.performance?.meet || 0), target: Number(agent.performance?.target_meet || 0) },
              { label: "제안", current: Number(agent.performance?.pt || 0), target: Number(agent.performance?.target_pt || 0) },
              { label: "소개", current: Number(agent.performance?.intro || 0), target: Number(agent.performance?.target_intro || 0) },
              { label: "신청", current: Number(agent.performance?.db_assigned || 0), target: Number(agent.performance?.target_db_assigned || 0) },
              { label: "반품률", current: Number(agent.performance?.db_returned || 0), target: Number(agent.performance?.db_assigned || 0), rateMode: true },
            ]
            return (
              <div
                key={agent.id}
                onClick={() => { setSelectedAgent(agent); setActiveTab("act") }}
                style={{ background: "#f8fafc", borderRadius: 10, border: "0.5px solid #e4edf5", padding: "14px 16px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ background: "#1a2540", color: "#e8f1f8", fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 4 }}>{roleLabel(agent)}</span>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#1a2d42" }}>{agent.name}</p>
                  <p style={{ fontSize: 11, color: "#9ab4c8" }}>{getDepartment(agent)} / {getBranch(agent) || "미소속"}</p>
                </div>
                <div className="management-monitor-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <MonitorBar label="매출 달성률" rate={amtRate} current={agent.performance?.contract_amt} target={agent.performance?.target_amt} unit="만원" />
                  <MonitorBar label="건수 달성률" rate={cntRate} current={agent.performance?.contract_cnt} target={agent.performance?.target_cnt} unit="건" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                  <InsuranceMiniLine label="생명보험" amount={agent.performance?.life_amt} count={agent.performance?.life_cnt} tone="#2563eb" />
                  <InsuranceMiniLine label="손해보험" amount={agent.performance?.nonlife_amt} count={agent.performance?.nonlife_cnt} tone="#0f6e56" />
                </div>
                <div className="management-activity-mini-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginTop: 12 }}>
                  {activityItems.map((item) => <MiniActivityGauge key={item.label} {...item} />)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 내 실적 입력 (master 제외) */}
      {!isMaster && (
        <div style={{ background: "white", borderRadius: 12, border: "0.5px solid #e4edf5", padding: "16px 18px" }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: "#1a2d42", marginBottom: 14, paddingLeft: 10, borderLeft: "3px solid #378add" }}>내 실적 입력</p>
          <AgentView user={user} selectedDate={selectedDate} />
        </div>
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
          onClose={() => { setActiveTab(null); setSelectedAgent(null); fetchTeamData(); loadDepartmentMeta() }}
        />
      )}
    </div>
  )
}

export function departmentSettingsKey(headquarter: string, department: string) {
  return `department_settings:${headquarter}:${department}`
}

function CircleRate({ label, rate, size = 88 }: { label: string; rate: number; size?: number }) {
  const color = getBarColor(rate)
  const background = `conic-gradient(${color} 0 ${Math.min(rate, 100)}%, #e8eef5 ${Math.min(rate, 100)}% 100%)`
  return (
    <div style={{ width: size, textAlign: "center" }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background, padding: 8 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: getRateColor(rate), lineHeight: 1 }}>{rate}%</span>
          <span style={{ marginTop: 3, fontSize: 9, fontWeight: 700, color: "#9ab4c8" }}>{label}</span>
        </div>
      </div>
    </div>
  )
}

function InsuranceSummaryBox({ title, amount, count, targetAmount, targetCount, tone }: any) {
  const amountRate = Math.round((Number(amount || 0) / (Number(targetAmount || 0) || 1)) * 100)
  const countRate = Math.round((Number(count || 0) / (Number(targetCount || 0) || 1)) * 100)
  return (
    <div style={{ borderRadius: 10, background: "#f7fafc", border: "0.5px solid #e4edf5", padding: "12px 13px" }}>
      <p style={{ fontSize: 13, fontWeight: 800, color: tone, marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 18, fontWeight: 800, color: "#1a2d42" }}>{Number(amount || 0).toLocaleString()}만</p>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#7a9ab2", marginTop: 2 }}>{Number(count || 0).toLocaleString()}건</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
        <SmallRate label="금액" rate={amountRate} />
        <SmallRate label="건수" rate={countRate} />
      </div>
    </div>
  )
}

function SmallRate({ label, rate }: { label: string; rate: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: "#9ab4c8" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: getRateColor(rate) }}>{rate}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: "#e8eef5", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(rate, 100)}%`, height: "100%", borderRadius: 999, background: getBarColor(rate) }} />
      </div>
    </div>
  )
}

function MiniActivityGauge({ label, current, target, rateMode = false }: any) {
  const rate = Math.round((Number(current || 0) / (Number(target || 0) || 1)) * 100)
  return (
    <div style={{ borderRadius: 9, background: "white", border: "0.5px solid #e4edf5", padding: "8px 9px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#1a2d42" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: getRateColor(rate) }}>{rate}%</span>
      </div>
      <p style={{ fontSize: 10, color: "#7a9ab2", marginBottom: 5 }}>
        {rateMode
          ? `${Number(current || 0).toLocaleString()}건 / 신청 ${Number(target || 0).toLocaleString()}건`
          : `${Number(current || 0).toLocaleString()} / ${Number(target || 0).toLocaleString()}건`}
      </p>
      <div style={{ height: 4, borderRadius: 999, background: "#e8eef5", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(rate, 100)}%`, height: "100%", borderRadius: 999, background: getBarColor(rate) }} />
      </div>
    </div>
  )
}

function InsuranceMiniLine({ label, amount, count, tone }: any) {
  return (
    <div style={{ borderRadius: 9, background: "white", border: "0.5px solid #e4edf5", padding: "8px 10px" }}>
      <p style={{ fontSize: 10, fontWeight: 800, color: tone, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 12, fontWeight: 800, color: "#1a2d42" }}>{Number(amount || 0).toLocaleString()}만 · {Number(count || 0).toLocaleString()}건</p>
    </div>
  )
}

function getRateColor(rate: number) {
  if (rate >= 80) return "#0f6e56"
  if (rate >= 65) return "#ba7517"
  if (rate >= 30) return "#ba7517"
  return "#e24b4a"
}

function getBarColor(rate: number) {
  if (rate >= 80) return "#1d9e75"
  if (rate >= 65) return "#ef9f27"
  if (rate >= 30) return "#ef9f27"
  return "#e24b4a"
}

function MonitorBar({ label, rate, current, target, unit }: any) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <p style={{ fontSize: 10, color: "#9ab4c8", marginBottom: 2, letterSpacing: "0.04em" }}>{label}</p>
          <p style={{ fontSize: 11, fontWeight: 500, color: "#1a2d42" }}>{Number(current || 0).toLocaleString()} / {Number(target || 0).toLocaleString()} {unit}</p>
        </div>
        <p style={{ fontSize: 18, fontWeight: 500, color: getRateColor(rate) }}>{rate}%</p>
      </div>
      <div style={{ height: 5, background: "#eef2f7", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(rate, 100)}%`, background: getBarColor(rate), borderRadius: 3, transition: "width 0.8s ease" }} />
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
        border: active ? "0.5px solid #b5d4f4" : "0.5px solid #d4e0eb",
        background: active ? "#1a2540" : "#f7fafc",
        color: active ? "#e8f1f8" : "#5a7a92",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  )
}
