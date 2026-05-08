"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import AdminPopups from "./AdminPopups"
import FinancialCalc from "./FinancialCalc"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { exportExcel } from "./exportExcel"
import AgentView from "./AgentView"
import { canSeeUser, getBranch } from "../../../lib/roles"

export default function ManagerView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [globalNotice, setGlobalNotice] = useState("");
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false);
  const [showExportOpt, setShowExportOpt] = useState(false);

  const [branchTotal, setBranchTotal] = useState({ 
    amt: 0, cnt: 0, call: 0, meet: 0, pt: 0, targetAmt: 2000 
  });

  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`;

  useEffect(() => { fetchBranchData(); }, [monthKey, user]);

  async function fetchBranchData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    
    const branchName = getBranch(user);
    const branchKey = `target_amt_${branchName}`;
    const branchTarget = Number(settings?.find(s => s.key === branchKey)?.value) || 2000;

    const { data: allUsers } = await supabase.from("users").select("*");
    const users = allUsers?.filter((u) => getBranch(u) === branchName && canSeeUser(user, u)) || [];
    const { data: allPerfs } = await supabase.from("daily_perf").select("*");

    if (users) {
      const mappedAgents = users.map(u => {
        const userHistory = allPerfs?.filter(p => p.user_id === u.id) || [];
        const currentPerf = userHistory.find(p => p.date === monthKey) || {
          call: 0, meet: 0, pt: 0, intro: 0, 
          contract_amt: 0, contract_cnt: 0, target_amt: 300, target_cnt: 10
        };
        return { ...u, performance: currentPerf };
      });
      setAgents(mappedAgents);

      const totals = mappedAgents.reduce((acc, curr) => ({
        amt: acc.amt + Number(curr.performance.contract_amt || 0),
        cnt: acc.cnt + Number(curr.performance.contract_cnt || 0),
        call: acc.call + Number(curr.performance.call || 0),
        meet: acc.meet + Number(curr.performance.meet || 0),
        pt: acc.pt + Number(curr.performance.pt || 0),
      }), { amt: 0, cnt: 0, call: 0, meet: 0, pt: 0 });

      setBranchTotal({ ...totals, targetAmt: branchTarget });
    }
  }

  const handleExport = (type: 'excel' | 'pdf') => {
    if (type === 'excel') {
      // ✅ 타입 에러 해결: 허용된 프로퍼티(targetAmt, targetCnt)만 전달
      exportExcel({ 
        agents, 
        monthKey, 
        teamMeta: { 
          targetAmt: branchTotal.targetAmt, 
          targetCnt: 50 
        } 
      });
    } else {
      const doc = new jsPDF();
      (doc as any).autoTable({
        head: [['성명', '실적(만)', '건수', '전화', '만남']],
        body: agents.map(a => [a.name, a.performance.contract_amt, a.performance.contract_cnt, a.performance.call, a.performance.meet]),
      });
      doc.save(`${getBranch(user)}_Report_${monthKey}.pdf`);
    }
    setShowExportOpt(false);
  };

  if (activeTab === 'finance') {
    return (
      <div className="flex-1 animate-in fade-in duration-500">
        <div className="flex justify-end p-4">
          <button onClick={() => setActiveTab(null)} className="rounded-xl bg-[#1a3a6e] px-5 py-2 text-[13px] font-black text-white hover:bg-[#2563eb] transition-all">닫기</button>
        </div>
        <FinancialCalc />
      </div>
    );
  }

  const branchRate = Math.round((branchTotal.amt / branchTotal.targetAmt) * 100);

  return (
    <div className="flex-1 space-y-6 font-black p-4 md:p-6 text-black">
      <section className="bg-[#1a3a6e] p-8 rounded-2xl text-white border border-[#1a3a6e] shadow-xl">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-sky-200 text-[13px] mb-1">{getBranch(user)} 지점 목표</p>
            <h2 className="text-3xl font-black">{branchTotal.amt.toLocaleString()} / {branchTotal.targetAmt.toLocaleString()} 만</h2>
          </div>
          <span className="text-5xl font-black text-white">{branchRate}%</span>
        </div>
        <div className="w-full h-4 bg-white/10 rounded-full border border-white/20 overflow-hidden">
          <div className="bg-[#0ea5e9] h-full transition-all duration-1000" style={{ width: `${Math.min(branchRate, 100)}%` }} />
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <ActivityCard label="전화 합계" val={branchTotal.call} color="bg-blue-50 text-blue-600" />
        <ActivityCard label="만남 합계" val={branchTotal.meet} color="bg-orange-50 text-orange-600" />
        <ActivityCard label="제안 합계" val={branchTotal.pt} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        <button onClick={() => window.open('/sales-master', '_blank', 'noopener,noreferrer')} className="whitespace-nowrap bg-white border border-slate-200 px-6 py-4 rounded-2xl text-[13px] font-black hover:bg-[#1a3a6e] hover:text-white transition-all">세일즈 마스터</button>
        <button onClick={() => window.open('/sales-book', '_blank', 'noopener,noreferrer')} className="whitespace-nowrap bg-white border border-slate-200 px-6 py-4 rounded-2xl text-[13px] font-black hover:bg-[#2563eb] hover:text-white transition-all">세일즈 북</button>
        <button onClick={() => setShowExportOpt(!showExportOpt)} className="whitespace-nowrap bg-white border border-slate-200 px-6 py-4 rounded-2xl text-[13px] font-black relative">
          리포트 출력
          {showExportOpt && (
            <div className="absolute top-full left-0 mt-2 bg-white border-2 border-black rounded-xl shadow-2xl z-50 min-w-[140px] text-black overflow-hidden">
              <button onClick={() => handleExport('excel')} className="w-full p-4 border-b hover:bg-slate-100 text-[13px]">엑셀 출력</button>
              <button onClick={() => handleExport('pdf')} className="w-full p-4 hover:bg-slate-100 text-[13px]">PDF 출력</button>
            </div>
          )}
        </button>
      </div>

      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg mb-6 border-l-[6px] border-[#2563eb] pl-4 font-black text-[#1a3a6e]">지점 직원 활동</h2>
        <div className="space-y-4">
          {agents.map(a => (
            <div key={a.id} onClick={() => { setSelectedAgent(a); setActiveTab('act'); }} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-[#2563eb] hover:bg-white transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xl font-black">{a.name}</p>
                <p className="text-sm font-black text-blue-600">{Number(a.performance.contract_amt).toLocaleString()}만</p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dashed">
                <MiniStat label="CALL" val={a.performance.call} />
                <MiniStat label="MEET" val={a.performance.meet} />
                <MiniStat label="PT" val={a.performance.pt} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg mb-6 border-l-[6px] border-[#2563eb] pl-4 font-black text-[#1a3a6e]">내 실적 입력</h2>
        <AgentView user={user} selectedDate={selectedDate} />
      </section>

      {activeTab && !['finance'].includes(activeTab) && (
        <AdminPopups type={activeTab} agents={agents} selectedAgent={selectedAgent} viewer={user} onClose={() => { setActiveTab(null); setSelectedAgent(null); fetchBranchData(); }} />
      )}
    </div>
  )
}

function ActivityCard({ label, val, color }: any) {
  return (
    <div className={`${color} p-4 rounded-2xl border border-black/5 text-center`}>
      <p className="text-[13px] font-black opacity-60 mb-1">{label}</p>
      <p className="text-lg font-black">{val}건</p>
    </div>
  )
}

function MiniStat({ label, val }: any) {
  return (
    <div className="text-center">
      <span className="text-[13px] text-slate-400 block">{label}</span>
      <span className="text-[13px] font-black">{val}</span>
    </div>
  )
}
