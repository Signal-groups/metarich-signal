"use client"

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability */

import React, { useEffect, useState, useMemo } from "react"
import { supabase } from "../../../lib/supabase"
import { canAccessCrm } from "../../../lib/roles"
import CustomerManagerModal from "./CustomerManagerModal"
// import CalcModal from "./CalcModal" // 파일 존재 여부에 따라 주석 해제 가능

export default function AgentView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [mainTab, setMainTab] = useState<'input' | 'edu'>('input');
  
  const [perfInput, setPerfInput] = useState({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, 
    edu_status: "미참여", is_approved: false,
    edu_1: false, edu_2: false, edu_3: false, edu_4: false, edu_5: false
  });
  const [globalNotice, setGlobalNotice] = useState("");
  const [eduWeeks, setEduWeeks] = useState({ 1: "", 2: "", 3: "", 4: "", 5: "" });
  const [isCustOpen, setIsCustOpen] = useState(false); 
  const [avgTab, setAvgTab] = useState<'perf' | 'act'>('perf'); 
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [viewDetail, setViewDetail] = useState<any>(null);

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}-01`;

  const LINKS = { 
    metaon: "https://meta-on.kr/#/login", 
    insu: "https://xn--on3bi2e18htop.com/", 
    archive: "https://drive.google.com/drive/u/2/folders/1-JlU3eS70VN-Q65QmD0JlqV-8lhx6Nbm",
    customerCrm: "/crm",
    salesMaster: "/sales-master",
    salesBook: "/sales-book",
    productAll: "/product-all",
  };
  const canUseCrm = canAccessCrm(user);

  const handleGoogleSync = async (customers: any[]) => {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbxQVSM9jB0lubHWSEBNUcRT_OFwU4QS9AOjNOzQwPjW9FOif3izSVWxOwuXpUXhGZ0IEQ/exec";
    if (customers.length === 0) return alert("전송할 데이터가 없습니다.");

    const mappedData = customers.map(c => ({
      name: c.name || "", phone: c.phone || "", contract_date: c.contract_date || "",
      payment_day: c.payment_day || "", birth: c.birth || "", family: c.family || "",
      etc1: "", relation: "", status: c.status || "유지", monthly_pay: c.monthly_pay || 0,
      insu_company: c.insu_company || "", gift: c.gift || "", contract_type: c.contract_type || "체결"
    }));

    try {
      await fetch(GAS_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mappedData) });
      alert(`🚀 성공! ${customers.length}명의 고객 데이터를 구글 시트에 기록했습니다.`);
      setIsCustOpen(false);
    } catch (error) {
      console.error("Sync Error:", error);
      alert("전송 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => { 
    fetchData();
    fetchAllHistory();
  }, [monthKey, user.id]);

  async function fetchData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    const savedEdu = settings?.find(s => s.key === 'edu_content')?.value;
    if (savedEdu) {
      try { setEduWeeks(JSON.parse(savedEdu)); } catch (e) { setEduWeeks({ 1: savedEdu, 2: "", 3: "", 4: "", 5: "" }); }
    }
    const { data: perf } = await supabase.from("daily_perf").select("*").eq("user_id", user.id).eq("date", monthKey).maybeSingle();
    if (perf) setPerfInput(prev => ({ ...prev, ...perf }));
    else setPerfInput({ 
      call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0, 
      contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300, 
      edu_status: "미참여", is_approved: false,
      edu_1: false, edu_2: false, edu_3: false, edu_4: false, edu_5: false
    });
  }

  async function fetchAllHistory() {
    const { data } = await supabase.from("daily_perf").select("*").eq("user_id", user.id).order('date', { ascending: false });
    if (data) setHistoryData(data);
  }

  const avgData = useMemo(() => {
    const d = new Date(selectedDate);
    const startRange = new Date(d.getFullYear(), d.getMonth() - 2, 1); 
    const endRange = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const filtered = historyData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startRange && itemDate < endRange;
    });
    if (filtered.length === 0) return { amt: 0, cnt: 0, perAmt: 0, call: 0, meet: 0, pt: 0, intro: 0 };
    const sum = filtered.reduce((acc, curr) => ({
      amt: acc.amt + (Number(curr.contract_amt) || 0),
      cnt: acc.cnt + (Number(curr.contract_cnt) || 0),
      call: acc.call + (Number(curr.call) || 0),
      meet: acc.meet + (Number(curr.meet) || 0),
      pt: acc.pt + (Number(curr.pt) || 0),
      intro: acc.intro + (Number(curr.intro) || 0)
    }), { amt: 0, cnt: 0, call: 0, meet: 0, pt: 0, intro: 0 });
    const divisor = filtered.length;
    return {
      amt: Math.round(sum.amt / divisor),
      cnt: Number((sum.cnt / divisor).toFixed(1)),
      perAmt: sum.cnt > 0 ? Math.round(sum.amt / sum.cnt) : 0,
      call: Math.round(sum.call / divisor),
      meet: Math.round(sum.meet / divisor),
      pt: Math.round(sum.pt / divisor),
      intro: Math.round(sum.intro / divisor)
    };
  }, [historyData, selectedDate]);

  const records = useMemo(() => {
    if (historyData.length === 0) return { best: null, worst: null };
    const activeMonths = historyData.filter(item => {
      const hasPerf = (Number(item.contract_amt) || 0) > 0 || (Number(item.contract_cnt) || 0) > 0;
      const hasActivity = (Number(item.call) || 0) > 0 || (Number(item.meet) || 0) > 0 || (Number(item.pt) || 0) > 0 || (Number(item.intro) || 0) > 0;
      return hasPerf || hasActivity;
    });
    if (activeMonths.length === 0) return { best: null, worst: null };
    const bestSorted = [...activeMonths].sort((a, b) => (Number(b.contract_amt) || 0) - (Number(a.contract_amt) || 0));
    const worstSorted = [...activeMonths].sort((a, b) => (Number(a.contract_amt) || 0) - (Number(b.contract_amt) || 0));
    return { best: bestSorted[0], worst: worstSorted[0] };
  }, [historyData]);

  const calculateRate = (current: number, target: number) => {
    if (!target || target === 0) return 0;
    return Math.round((current / target) * 100);
  };

  const handleSave = async (customField?: object) => {
    const rawPayload = customField ? { ...perfInput, ...customField } : perfInput;
    const lockedTargetPayload = perfInput.is_approved
      ? { target_cnt: perfInput.target_cnt, target_amt: perfInput.target_amt }
      : {};
    const payload = {
      ...rawPayload,
      ...lockedTargetPayload,
      call: Number(rawPayload.call || 0), meet: Number(rawPayload.meet || 0),
      pt: Number(rawPayload.pt || 0), intro: Number(rawPayload.intro || 0),
      db_assigned: Number(rawPayload.db_assigned || 0), db_returned: Number(rawPayload.db_returned || 0),
      contract_cnt: Number(rawPayload.contract_cnt || 0), contract_amt: Number(rawPayload.contract_amt || 0),
      target_cnt: Number((perfInput.is_approved ? perfInput.target_cnt : rawPayload.target_cnt) || 0),
      target_amt: Number((perfInput.is_approved ? perfInput.target_amt : rawPayload.target_amt) || 0)
    };
    const { error } = await supabase.from("daily_perf").upsert({ ...payload, user_id: user.id, date: monthKey }, { onConflict: 'user_id, date' });
    if (error) alert("저장 실패: " + error.message);
    else { 
      if(!customField) alert(`${month}월 실적이 업데이트되었습니다.`); 
      await fetchData(); await fetchAllHistory();
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20">
      {/* Upper Notice Banner */}
      <div className="bg-[#1a3a6e] p-4 rounded-2xl flex items-center gap-4 overflow-hidden shadow-lg border border-white/10">
        <span className="bg-[#0ea5e9] text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-widest shrink-0 uppercase">Notice</span>
        <div className="relative flex-1 overflow-hidden h-5">
          <div className="absolute whitespace-nowrap animate-marquee text-[13px] text-white/90 font-medium">{globalNotice}</div>
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-white flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 rounded-full bg-[#eff6ff] flex items-center justify-center text-[#2563eb] text-xl">👤</div>
          <div>
            <p className="text-xl font-black text-[#1a3a6e] leading-none">{user.name}</p>
            <p className="text-[11px] text-[#94a3b8] font-bold uppercase mt-1 tracking-widest">Insurance Agent</p>
          </div>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto justify-center">
          <QuickBtn label="메타온" url={LINKS.metaon} color="bg-[#f8fafc] text-[#475569]" />
          <QuickBtn label="보험사" url={LINKS.insu} color="bg-[#f8fafc] text-[#475569]" />
          <QuickBtn label="자료실" url={LINKS.archive} color="bg-[#f8fafc] text-[#475569]" />
          <QuickBtn label="세일즈 마스터" url={LINKS.salesMaster} color="bg-[#1a3a6e] text-white" />
          <QuickBtn label="세일즈 북" url={LINKS.salesBook} color="bg-[#2563eb] text-white" />
          <QuickBtn label="상품의 모든것" url={LINKS.productAll} color="bg-[#f59e0b] text-white" />
          {canUseCrm && (
            <QuickBtn
              label="고객관리"
              url={LINKS.customerCrm}
              color="bg-[#10b981] text-white"
            />
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex p-1.5 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20">
        <button 
          onClick={() => setMainTab('input')} 
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${mainTab === 'input' ? 'bg-[#1a3a6e] text-white shadow-md' : 'text-[#64748b] hover:bg-white/50'}`}
        >
          PERFORMANCE
        </button>
        <button 
          onClick={() => setMainTab('edu')} 
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${mainTab === 'edu' ? 'bg-[#1a3a6e] text-white shadow-md' : 'text-[#64748b] hover:bg-white/50'}`}
        >
          EDUCATION
        </button>
      </div>

      {mainTab === 'input' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Performance Input Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-white space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[11px] text-[#94a3b8] uppercase font-bold tracking-widest">{month}월 실적액(만)</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black text-[#1a3a6e]">{perfInput.contract_amt.toLocaleString()}</span>
                    <span className="text-[#94a3b8] text-sm">/ {perfInput.target_amt.toLocaleString()}</span>
                  </div>
                </div>
                <p className={`text-4xl font-montserrat font-black ${getRateStyles(calculateRate(perfInput.contract_amt, perfInput.target_amt)).text}`}>
                  {calculateRate(perfInput.contract_amt, perfInput.target_amt)}%
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-[#94a3b8] font-bold uppercase ml-1">Target</label>
                  <input type="number" disabled={perfInput.is_approved} value={perfInput.target_amt} onChange={(e)=>setPerfInput({...perfInput, target_amt: Number(e.target.value)})} className="w-full p-4 bg-[#f8fafc] rounded-2xl text-center text-lg font-bold outline-none focus:ring-2 ring-[#2563eb]/20" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-[#94a3b8] font-bold uppercase ml-1">Actual</label>
                  <input type="number" value={perfInput.contract_amt} onChange={(e)=>setPerfInput({...perfInput, contract_amt: Number(e.target.value)})} className="w-full p-4 bg-[#eff6ff] text-[#2563eb] rounded-2xl text-center text-lg font-bold border border-[#dbeafe] outline-none focus:ring-2 ring-[#2563eb]/20" />
                </div>
              </div>
              <ProgressBar rate={calculateRate(perfInput.contract_amt, perfInput.target_amt)} />
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-white space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[11px] text-[#94a3b8] uppercase font-bold tracking-widest">{month}월 실적건수</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black text-[#1a3a6e]">{perfInput.contract_cnt.toLocaleString()}</span>
                    <span className="text-[#94a3b8] text-sm">/ {perfInput.target_cnt.toLocaleString()}</span>
                  </div>
                </div>
                <p className={`text-4xl font-montserrat font-black ${getRateStyles(calculateRate(perfInput.contract_cnt, perfInput.target_cnt)).text}`}>
                  {calculateRate(perfInput.contract_cnt, perfInput.target_cnt)}%
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-[#94a3b8] font-bold uppercase ml-1">Target</label>
                  <input type="number" disabled={perfInput.is_approved} value={perfInput.target_cnt} onChange={(e)=>setPerfInput({...perfInput, target_cnt: Number(e.target.value)})} className="w-full p-4 bg-[#f8fafc] rounded-2xl text-center text-lg font-bold outline-none focus:ring-2 ring-[#2563eb]/20" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-[#94a3b8] font-bold uppercase ml-1">Actual</label>
                  <input type="number" value={perfInput.contract_cnt} onChange={(e)=>setPerfInput({...perfInput, contract_cnt: Number(e.target.value)})} className="w-full p-4 bg-[#ecfdf5] text-[#059669] rounded-2xl text-center text-lg font-bold border border-[#d1fae5] outline-none focus:ring-2 ring-[#10b981]/20" />
                </div>
              </div>
              <ProgressBar rate={calculateRate(perfInput.contract_cnt, perfInput.target_cnt)} />
            </div>
          </div>

          {/* Metric Details Grid */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-white grid grid-cols-3 md:grid-cols-6 gap-6">
            <MetricInput label="전화" val={perfInput.call} onChange={(v:any)=>setPerfInput({...perfInput, call:v})} />
            <MetricInput label="만남" val={perfInput.meet} onChange={(v:any)=>setPerfInput({...perfInput, meet:v})} />
            <MetricInput label="제안" val={perfInput.pt} onChange={(v:any)=>setPerfInput({...perfInput, pt:v})} />
            <MetricInput label="소개" val={perfInput.intro} onChange={(v:any)=>setPerfInput({...perfInput, intro:v})} />
            <MetricInput label="배정" val={perfInput.db_assigned} onChange={(v:any)=>setPerfInput({...perfInput, db_assigned:v})} color="text-[#2563eb]" />
            <MetricInput label="반품" val={perfInput.db_returned} onChange={(v:any)=>setPerfInput({...perfInput, db_returned:v})} color="text-[#ef4444]" />
          </div>

          {/* 3-Month Stats & Guinness */}
          <div className="bg-gradient-to-br from-[#1a3a6e] to-[#1e40af] p-8 rounded-[2.5rem] text-white shadow-xl space-y-10">
            <div>
              <div className="flex gap-6 mb-8 border-b border-white/10 pb-4">
                <button onClick={()=>setAvgTab('perf')} className={`text-[13px] font-bold tracking-widest uppercase transition-all ${avgTab==='perf' ? 'text-[#0ea5e9] border-b-2 border-[#0ea5e9]' : 'text-white/40'}`}>3-Month Perf</button>
                <button onClick={()=>setAvgTab('act')} className={`text-[13px] font-bold tracking-widest uppercase transition-all ${avgTab==='act' ? 'text-[#0ea5e9] border-b-2 border-[#0ea5e9]' : 'text-white/40'}`}>3-Month Activity</button>
              </div>
              {avgTab === 'perf' ? (
                <div className="grid grid-cols-3 gap-4">
                  <AvgBox label="평균 매출" val={`${avgData.amt.toLocaleString()}만`} />
                  <AvgBox label="평균 건수" val={`${avgData.cnt}건`} />
                  <AvgBox label="건당 매출" val={`${avgData.perAmt.toLocaleString()}만`} />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <AvgBox label="전화" val={`${avgData.call}회`} />
                  <AvgBox label="만남" val={`${avgData.meet}회`} />
                  <AvgBox label="제안" val={`${avgData.pt}회`} />
                  <AvgBox label="소개" val={`${avgData.intro}회`} />
                </div>
              )}
            </div>

            <div className="space-y-6">
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-[0.2em]">Personal Hall of Fame</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div onClick={() => setViewDetail(records.best)} className={`p-6 rounded-3xl border transition-all cursor-pointer hover:shadow-lg ${viewDetail?.date === records.best?.date ? 'bg-white text-[#1a3a6e] border-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${viewDetail?.date === records.best?.date ? 'text-[#2563eb]' : 'text-[#0ea5e9]'}`}>🏆 Guinness</p>
                  <p className="text-2xl font-black font-montserrat italic">{records.best ? `${new Date(records.best.date).getFullYear()}.${String(new Date(records.best.date).getMonth() + 1).padStart(2,'0')}` : '-'}</p>
                  <p className={`text-sm font-bold opacity-60 ${viewDetail?.date === records.best?.date ? 'text-[#1a3a6e]' : 'text-white'}`}>{records.best ? `${records.best.contract_amt.toLocaleString()}만` : 'No Data'}</p>
                </div>
                <div onClick={() => setViewDetail(records.worst)} className={`p-6 rounded-3xl border transition-all cursor-pointer hover:shadow-lg ${viewDetail?.date === records.worst?.date ? 'bg-[#ef4444] text-white border-[#ef4444]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${viewDetail?.date === records.worst?.date ? 'text-white' : 'text-[#ef4444]'}`}>📉 Lowest</p>
                  <p className="text-2xl font-black font-montserrat italic">{records.worst ? `${new Date(records.worst.date).getFullYear()}.${String(new Date(records.worst.date).getMonth() + 1).padStart(2,'0')}` : '-'}</p>
                  <p className={`text-sm font-bold opacity-60 ${viewDetail?.date === records.worst?.date ? 'text-white' : 'text-white'}`}>{records.worst ? `${records.worst.contract_amt.toLocaleString()}만` : 'No Data'}</p>
                </div>
              </div>

              {viewDetail && (
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between items-center mb-8">
                    <h4 className="text-lg font-black text-[#0ea5e9] tracking-tight">{new Date(viewDetail.date).getFullYear()}년 {new Date(viewDetail.date).getMonth() + 1}월 상세 리포트</h4>
                    <button onClick={() => setViewDetail(null)} className="text-[10px] font-bold uppercase px-3 py-1 bg-white/10 rounded-full hover:bg-white/20 transition-all">Close</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <DetailBox label="매출액" val={`${viewDetail.contract_amt.toLocaleString()}만`} highlight />
                    <DetailBox label="계약건" val={`${viewDetail.contract_cnt}건`} highlight />
                    <DetailBox label="전화" val={`${viewDetail.call}회`} />
                    <DetailBox label="만남" val={`${viewDetail.meet}회`} />
                    <DetailBox label="제안" val={`${viewDetail.pt}회`} />
                    <DetailBox label="소개" val={`${viewDetail.intro}회`} />
                    <DetailBox label="DB배정" val={`${viewDetail.db_assigned}개`} color="text-[#0ea5e9]" />
                    <DetailBox label="DB반품" val={`${viewDetail.db_returned}개`} color="text-[#ef4444]" />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <button onClick={() => handleSave()} className="w-full bg-[#1a3a6e] text-white py-6 rounded-3xl font-black text-xl shadow-lg hover:bg-[#1e40af] hover:-translate-y-1 transition-all uppercase tracking-widest">
            Save & Update Record
          </button>
        </div>
      )}

      {mainTab === 'edu' && (
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-white space-y-8 animate-in slide-in-from-right-4 duration-300">
          <div className="border-b-2 border-[#f1f5f9] pb-6">
            <h2 className="text-3xl font-black text-[#1a3a6e] tracking-tight">Weekly Training</h2>
            <p className="text-sm text-[#94a3b8] font-bold uppercase mt-1 tracking-widest">Professional Skill Enhancement</p>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((w) => {
              const fieldName = `edu_${w}` as keyof typeof perfInput;
              const isChecked = perfInput[fieldName];
              return (
                <div 
                  key={w} 
                  onClick={() => handleSave({ [fieldName]: !isChecked })} 
                  className={`flex items-center gap-6 p-6 rounded-2xl border-2 transition-all cursor-pointer group hover:shadow-md ${isChecked ? 'bg-[#f0fdf4] border-[#10b981]' : 'bg-[#f8fafc] border-transparent hover:border-[#cbd5e1]'}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-montserrat font-black text-lg transition-all ${isChecked ? 'bg-[#10b981] text-white shadow-lg shadow-[#10b981]/20' : 'bg-[#e2e8f0] text-[#64748b] group-hover:bg-[#cbd5e1]'}`}>
                    {w === 5 ? "+" : `${w}W`}
                  </div>
                  <div className="flex-1">
                    <p className={`text-lg font-bold leading-snug break-keep ${isChecked ? 'text-[#064e3b]' : 'text-[#334155]'}`}>
                      {eduWeeks[w as keyof typeof eduWeeks] || "등록된 교육 내용이 없습니다."}
                    </p>
                    {isChecked && <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest">Training Completed</span>}
                  </div>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-[#10b981] border-[#10b981] text-white' : 'bg-white border-[#cbd5e1] text-transparent'}`}>
                    <span className="text-sm">✓</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🟢 모달 영역 */}
      {isCustOpen && (
        <CustomerManagerModal onClose={() => setIsCustOpen(false)} onSaveToGoogle={handleGoogleSync} />
      )}
    </div>
  )
}

/** 하위 컴포넌트 **/
function getRateStyles(rate: number) {
  if (rate >= 80) return { bar: "bg-[#2563eb]", text: "text-[#2563eb]" };
  if (rate >= 65) return { bar: "bg-[#f59e0b]", text: "text-[#f59e0b]" };
  if (rate >= 30) return { bar: "bg-[#fbbf24]", text: "text-[#fbbf24]" };
  return { bar: "bg-[#ef4444]", text: "text-[#ef4444]" };
}

function ProgressBar({ rate }: { rate: number }) {
  const { bar } = getRateStyles(rate);
  return (
    <div className="w-full bg-[#f1f5f9] h-3 rounded-full overflow-hidden">
      <div className={`${bar} h-full transition-all duration-1000 ease-out`} style={{ width: `${Math.min(rate, 100)}%` }} />
    </div>
  );
}

function DetailBox({ label, val, color = "text-white", highlight }: any) {
  return (
    <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
      <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">{label}</p>
      <p className={`text-lg font-black italic ${highlight ? 'text-[#0ea5e9]' : color}`}>{val}</p>
    </div>
  )
}

function AvgBox({ label, val }: any) { 
  return (
    <div className="text-center bg-white/5 p-6 rounded-2xl border border-white/5 flex flex-col justify-center items-center min-h-[90px] transition-all hover:bg-white/10">
      <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2">{label}</p>
      <p className="text-xl text-[#0ea5e9] font-black italic">{val}</p>
    </div>
  ) 
}

function QuickBtn({ label, url, onClick, color, className }: any) { 
  const handleClick = () => { if (onClick) onClick(); else if (url && url !== "#") window.open(url, "_blank"); };
  return (
    <button 
      onClick={handleClick} 
      className={`${color} ${className || ""} px-5 py-3 rounded-xl font-bold text-[12px] shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-md shrink-0`}
    >
      {label}
    </button> 
  )
}

function MetricInput({ label, val, onChange, color }: any) { 
  return (
    <div className="flex flex-col items-center gap-2">
      <label className="text-[11px] text-[#94a3b8] font-bold uppercase tracking-widest">{label}</label>
      <input 
        type="number" 
        inputMode="numeric" 
        value={val === 0 ? '' : val} 
        placeholder="0" 
        onChange={e=>onChange(Number(e.target.value))} 
        className={`w-full p-4 bg-[#f8fafc] border border-transparent focus:border-[#2563eb] focus:bg-white rounded-2xl text-center text-xl font-black outline-none transition-all ${color}`} 
      />
    </div>
  ) 
}
