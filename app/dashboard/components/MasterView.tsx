"use client"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AdminView.tsx (Updated: 조직 관리 & 고객관리 연결)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import FinancialCalc from "./FinancialCalc"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import AgentView from "./AgentView"
import { exportExcel } from "./exportExcel"
import { canSeeUser, getBranch, getDepartment, getHeadquarter, normalizeRole, roleLabel } from "../../../lib/roles"

export default function AdminView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false);
  const [teamMeta, setTeamMeta] = useState({ targetAmt: 3000, targetCnt: 100, targetIntro: 10, actualIntro: 0 });
  const [showExportOpt, setShowExportOpt] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");

  // 활동 관리 탭용 전체 합산 데이터
  const [totalActivity, setTotalActivity] = useState({ call: 0, meet: 0, pt: 0, intro: 0 });

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;
  const currentRole = normalizeRole(user);
  const isMaster = currentRole === "master";
  const canUseSystemSettings = isMaster;

  useEffect(() => { fetchTeamData(); }, [monthKey, user]);

  async function fetchTeamData() {
    // 1. 공지사항 및 팀 설정 로드
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    setTeamMeta({
      targetAmt:   Number(settings?.find(s => s.key === 'target_amt')?.value)         || 3000,
      targetCnt:   Number(settings?.find(s => s.key === 'target_cnt')?.value)         || 100,
      targetIntro: Number(settings?.find(s => s.key === 'team_target_intro')?.value) || 10,
      actualIntro: Number(settings?.find(s => s.key === 'actual_intro_cnt')?.value)  || 0,
    });

    const { data: users } = await supabase.from("users").select("*");
    const { data: allPerfs } = await supabase.from("daily_perf").select("*");

    if (users) {
      const visibleUsers = users.filter((u) => canSeeUser(user, u));
      const mappedAgents = visibleUsers.map(u => {
        const userHistory = allPerfs?.filter(p => p.user_id === u.id) || [];
        const currentPerf = userHistory.find(p => p.date === monthKey) || {
          call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
          contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10,
          edu_status: '미참여', is_approved: u.is_approved || false,
        };

        const validHistory = userHistory.filter(h => Number(h.contract_amt) > 0);
        const sorted = [...validHistory].sort((a, b) => Number(b.contract_amt) - Number(a.contract_amt));
        
        return {
          ...u,
          performance: currentPerf,
          best: sorted[0] || null,
          worst: sorted[sorted.length - 1] || null
        };
      });
      setAgents(mappedAgents);

      const totals = mappedAgents.filter(a => a.is_approved).reduce((acc, curr) => ({
        call:  acc.call  + Number(curr.performance.call  || 0),
        meet:  acc.meet  + Number(curr.performance.meet  || 0),
        pt:    acc.pt    + Number(curr.performance.pt    || 0),
        intro: acc.intro + Number(curr.performance.intro || 0),
      }), { call: 0, meet: 0, pt: 0, intro: 0 });
      setTotalActivity(totals);
    }
  }

  const handleExport = (type: 'excel' | 'pdf') => {
    if (type === 'excel') {
      exportExcel({ agents, teamMeta, monthKey })
    } else {
      const doc = new jsPDF();
      (doc as any).autoTable({
        head: [['성명', '소속', '직책', '실적(만)', '건수', '전화', '만남', '제안']],
        body: agents.map(a => [
          a.name,
          `${a.department || ''} ${a.team || ''}`,
          a.role_level || a.role || '설계사',
          Number(a.performance.contract_amt || 0),
          Number(a.performance.contract_cnt || 0),
          Number(a.performance.call || 0),
          Number(a.performance.meet || 0),
          Number(a.performance.pt || 0),
        ]),
      });
      doc.save(`Team_Report_${monthKey}.pdf`);
    }
    setShowExportOpt(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${String(d.getFullYear()).slice(-2)}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const departments = Array.from(new Set(agents.map(getDepartment).filter(Boolean))).sort();
  const teams = Array.from(new Set(
    agents
      .filter((agent) => !selectedDept || getDepartment(agent) === selectedDept)
      .map(getBranch)
      .filter(Boolean)
  )).sort();
  const visibleAgents = agents.filter((agent) => {
    const haystack = `${agent.name || ""} ${agent.email || ""} ${getDepartment(agent)} ${getBranch(agent)}`.toLowerCase();
    return (!searchText || haystack.includes(searchText.toLowerCase()))
      && (!selectedDept || getDepartment(agent) === selectedDept)
      && (!selectedTeam || getBranch(agent) === selectedTeam);
  });
  const scopeLabel = isMaster ? "전체 조직" : `${getHeadquarter(user)} 본부`;
  const tabs = [
    { id: 'perf', label: '실적 관리' },
    { id: 'act', label: '활동 및 분석' },
    { id: 'edu', label: '교육 관리' },
    ...(canUseSystemSettings ? [{ id: 'sys', label: '시스템 설정' }] : []),
    { id: 'users', label: '조직 관리' },
  ];

  // 금융계산기 활성화 시 화면 전환
  if (activeTab === 'finance') {
    return (
      <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 font-black">
        <div className="flex justify-between items-center rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#1a3a6e]">금융계산기</h2>
          <button onClick={() => setActiveTab(null)} className="rounded-xl bg-[#1a3a6e] px-5 py-2 text-[13px] font-black text-white hover:bg-[#2563eb] transition-all">
            닫기
          </button>
        </div>
        <FinancialCalc />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 font-black p-4 md:p-6 text-black pb-20">
      {/* 🔴 상단 공지사항 */}
      <div onClick={() => setIsNoticeExpanded(!isNoticeExpanded)} className={`bg-white p-4 rounded-2xl border-l-[6px] border-[#2563eb] flex items-center shadow-sm cursor-pointer transition-all duration-300 ${isNoticeExpanded ? 'min-h-[3.5rem] h-auto' : 'h-14 overflow-hidden'}`}>
        <div className={`font-black text-[#1a3a6e] w-full text-sm md:text-base ${isNoticeExpanded ? 'whitespace-normal leading-relaxed' : 'whitespace-nowrap animate-marquee'}`}>
          {globalNotice}
        </div>
      </div>

      {/* 🟡 퀵링크 섹션 (직원과 동일하게 5개 구성 유지) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <QuickLink href="https://meta-on.kr/#/login" label="메타온" />
        <QuickLink href="https://xn--on3bi2e18htop.com/" label="보험사" />
        <QuickLink href="https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm" label="자료실" />
        <QuickLink href="/sales-master" label="세일즈 마스터" />
        <QuickLink href="/sales-book" label="세일즈 북" />
        <QuickLink href="/product-all" label="상품의 모든것" />
        <QuickLink href="/crm" label="고객관리" />
        <div className="relative">
          <button onClick={() => setShowExportOpt(!showExportOpt)} className="w-full h-full bg-emerald-600 text-white p-4 rounded-2xl text-[13px] shadow-lg font-black border border-emerald-700">
            리포트 출력
          </button>
          {showExportOpt && (
            <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 w-48 overflow-hidden">
              <button onClick={() => handleExport('excel')} className="w-full p-4 hover:bg-slate-50 border-b text-left text-[13px] font-black">엑셀 출력</button>
              <button onClick={() => handleExport('pdf')} className="w-full p-4 hover:bg-slate-50 text-left text-[13px] font-black">PDF 출력</button>
            </div>
          )}
        </div>
      </div>

      {/* 🟢 활동 데이터 합산 (활동 관리 탭 클릭 시 상단 노출) */}
      {activeTab === 'act' && !selectedAgent && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <TotalBox label="전체 전화" val={totalActivity.call} />
          <TotalBox label="전체 만남" val={totalActivity.meet} sub={`전환율 ${totalActivity.call > 0 ? ((totalActivity.meet/totalActivity.call)*100).toFixed(1) : 0}%`} />
          <TotalBox label="전체 제안" val={totalActivity.pt} sub={`전환율 ${totalActivity.meet > 0 ? ((totalActivity.pt/totalActivity.meet)*100).toFixed(1) : 0}%`} />
          <TotalBox label="전체 소개" val={totalActivity.intro} />
        </div>
      )}

      {/* 🔵 메인 탭 메뉴 */}
      <div className={`grid gap-2 font-black ${tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`${activeTab === t.id ? 'bg-[#1a3a6e] text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'} border border-slate-200 py-4 px-1 rounded-2xl text-[13px] md:text-sm font-black text-center transition-all`}>
            {t.label}
          </button>
        ))}
      </div>

      <section className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[13px] font-black text-[#2563eb]">{roleLabel(user)} 관리 범위</p>
            <h2 className="text-2xl font-black text-[#1a3a6e]">{scopeLabel}</h2>
          </div>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="이름, 사업부, 지점 검색"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#2563eb] md:max-w-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterButton label="전체 사업부" active={!selectedDept} onClick={() => { setSelectedDept(""); setSelectedTeam(""); }} />
          {departments.map((dept) => (
            <FilterButton key={dept} label={dept} active={selectedDept === dept} onClick={() => { setSelectedDept(dept); setSelectedTeam(""); }} />
          ))}
        </div>
        {selectedDept && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <FilterButton label="전체 지점" active={!selectedTeam} onClick={() => setSelectedTeam("")} />
            {teams.map((team) => (
              <FilterButton key={team} label={team} active={selectedTeam === team} onClick={() => setSelectedTeam(team)} />
            ))}
          </div>
        )}
      </section>

      {/* 🟣 에이전트 모니터링 리스트 */}
      <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm font-black">
        <h2 className="text-lg md:text-xl mb-6 border-l-[6px] border-[#2563eb] pl-4 font-black text-[#1a3a6e]">
          {isMaster ? '전체 조직 모니터링' : `${scopeLabel} 모니터링`}
        </h2>
        <div className="space-y-4 md:space-y-6">
          {visibleAgents.filter(a => a.is_approved).map(a => {
            const amtRate = Math.round(((Number(a.performance.contract_amt) || 0) / (Number(a.performance.target_amt) || 1)) * 100);
            const cntRate = Math.round(((Number(a.performance.contract_cnt) || 0) / (Number(a.performance.target_cnt) || 1)) * 100);

            return (
              <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('act'); }}
                className="p-5 md:p-8 bg-slate-50 rounded-2xl border border-transparent hover:border-[#2563eb] hover:bg-white cursor-pointer transition-all font-black shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] bg-black text-white px-2 py-0.5 rounded-md font-black">{roleLabel(a)}</span>
                      <p className="text-xl font-black">{a.name} <span className="text-sm text-slate-400 font-normal">({getDepartment(a)} / {getBranch(a) || '미소속'})</span></p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <RecordBadge type="BEST" amt={a.best?.contract_amt} date={a.best ? formatDate(a.best.date) : ""} />
                      <RecordBadge type="LOW" amt={a.worst?.contract_amt} date={a.worst ? formatDate(a.worst.date) : ""} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <MonitorBar label="매출 달성률" rate={amtRate} current={a.performance.contract_amt} target={a.performance.target_amt} unit="만" />
                  <MonitorBar label="건수 달성률" rate={cntRate} current={a.performance.contract_cnt} target={a.performance.target_cnt} unit="건" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ⚪ 팝업 모듈 (AdminPopups.tsx 사용) */}
      {currentRole !== "master" && (
        <section className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg mb-6 border-l-[6px] border-[#2563eb] pl-4 font-black text-[#1a3a6e]">내 실적 입력</h2>
          <AgentView user={user} selectedDate={selectedDate} />
        </section>
      )}

      {activeTab && !['finance'].includes(activeTab) && (
        <AdminPopups
          type={activeTab}
          agents={agents}
          selectedAgent={selectedAgent}
          teamMeta={teamMeta}
          viewer={user}
          canEditSystem={canUseSystemSettings}
          onClose={() => { setActiveTab(null); setSelectedAgent(null); fetchTeamData(); }}
        />
      )}
    </div>
  )
}

/** 헬퍼 컴포넌트 **/
function MonitorBar({ label, rate, current, target, unit }: any) {
  const styles = rate >= 80 ? { bar: "bg-blue-500", text: "text-blue-600" } : rate >= 65 ? { bar: "bg-orange-500", text: "text-orange-600" } : rate >= 30 ? { bar: "bg-yellow-400", text: "text-yellow-500" } : { bar: "bg-red-500", text: "text-red-600" };
  return (
    <div className="space-y-3 font-black">
      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 uppercase font-black">{label}</span>
          <span className="text-[12px] font-black">{Number(current||0).toLocaleString()} / {Number(target||0).toLocaleString()} {unit}</span>
        </div>
        <span className={`text-3xl italic font-black ${styles.text}`}>{rate}%</span>
      </div>
      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden border border-black/5">
        <div className={`${styles.bar} h-full transition-all duration-1000 ease-out`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
    </div>
  );
}

function RecordBadge({ type, amt, date }: any) {
  const isBest = type === "BEST";
  if (!amt) return null;
  return (
    <div className={`text-[9px] md:text-[10px] px-3 py-1 rounded-full font-black border shadow-sm ${isBest ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
      {isBest ? '🏆' : '📉'} {type}: {Number(amt).toLocaleString()}만 ({date})
    </div>
  );
}

function QuickLink({ href, label }: any) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="bg-white border border-slate-200 p-4 rounded-2xl text-[13px] text-center hover:border-[#2563eb] hover:text-[#1a3a6e] transition-all shadow-sm font-black flex items-center justify-center">
      {label}
    </a>
  );
}

function TotalBox({ label, val, sub }: any) {
  return (
    <div className="bg-[#1a3a6e] p-4 md:p-5 rounded-2xl text-center font-black border border-[#2563eb] shadow-xl">
      <p className="text-sky-200 text-[13px] mb-1">{label}</p>
      <p className="text-white text-lg md:text-xl font-black">{val}건</p>
      {sub && <p className="text-sky-200 text-[13px] mt-1 opacity-80">{sub}</p>}
    </div>
  )
}

function FilterButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-full px-4 py-2 text-[13px] font-black transition ${active ? "bg-[#1a3a6e] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
      {label}
    </button>
  );
}
