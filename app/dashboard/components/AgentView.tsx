"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState, useMemo } from "react"
import { supabase } from "../../../lib/supabase"
import { canAccessCrm } from "../../../lib/roles"
import CustomerManagerModal from "./CustomerManagerModal"
import ProductStrategyPage from "./ProductStrategyPage"

export default function AgentView({ user, selectedDate }: { user: any, selectedDate: Date }) {
  const [mainTab, setMainTab] = useState<'input' | 'edu' | 'strategy'>('input');

  const [perfInput, setPerfInput] = useState({
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
    contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300,
    life_amt: 0, life_cnt: 0, nonlife_amt: 0, nonlife_cnt: 0,
    target_life_amt: 150, target_life_cnt: 5, target_nonlife_amt: 150, target_nonlife_cnt: 5,
    target_call: 100, target_meet: 30, target_pt: 15, target_intro: 10, target_db_assigned: 50, target_db_returned: 0,
    edu_status: "미참여", is_approved: false,
    edu_1: false, edu_2: false, edu_3: false, edu_4: false, edu_5: false
  });
  const [addInput, setAddInput] = useState({
    life_amt: 0, life_cnt: 0, nonlife_amt: 0, nonlife_cnt: 0,
    call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
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
  const extKey = `daily_perf_ext:${user.id}:${monthKey}`;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, user.id]);

  async function fetchData() {
    const { data: settings } = await supabase.from("team_settings").select("*");
    setGlobalNotice(settings?.find(s => s.key === 'global_notice')?.value || "공지사항이 없습니다.");
    const savedEdu = settings?.find(s => s.key === 'edu_content')?.value;
    if (savedEdu) {
      try { setEduWeeks(JSON.parse(savedEdu)); } catch { setEduWeeks({ 1: savedEdu, 2: "", 3: "", 4: "", 5: "" }); }
    }
    const { data: perf } = await supabase.from("daily_perf").select("*").eq("user_id", user.id).eq("date", monthKey).maybeSingle();
    const { data: extSetting } = await supabase.from("team_settings").select("value").eq("key", extKey).maybeSingle();
    let ext = {};
    if (extSetting?.value) {
      try { ext = typeof extSetting.value === "string" ? JSON.parse(extSetting.value) : extSetting.value; } catch { ext = {}; }
    }
    if (perf) setPerfInput(prev => ({ ...prev, ...perf, ...ext }));
    else setPerfInput({
      call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
      contract_cnt: 0, contract_amt: 0, target_cnt: 10, target_amt: 300,
      life_amt: 0, life_cnt: 0, nonlife_amt: 0, nonlife_cnt: 0,
      target_life_amt: 150, target_life_cnt: 5, target_nonlife_amt: 150, target_nonlife_cnt: 5,
      target_call: 100, target_meet: 30, target_pt: 15, target_intro: 10, target_db_assigned: 50, target_db_returned: 0,
      edu_status: "미참여", is_approved: false,
      edu_1: false, edu_2: false, edu_3: false, edu_4: false, edu_5: false
    });
    setAddInput({
      life_amt: 0, life_cnt: 0, nonlife_amt: 0, nonlife_cnt: 0,
      call: 0, meet: 0, pt: 0, intro: 0, db_assigned: 0, db_returned: 0,
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
      const hasActivity = (Number(item.call) || 0) > 0 || (Number(item.meet) || 0) > 0;
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
    const added = customField ? {} as any : addInput;
    const rawPayload = customField ? { ...perfInput, ...customField } : {
      ...perfInput,
      life_amt: Number(perfInput.life_amt || 0) + Number(added.life_amt || 0),
      life_cnt: Number(perfInput.life_cnt || 0) + Number(added.life_cnt || 0),
      nonlife_amt: Number(perfInput.nonlife_amt || 0) + Number(added.nonlife_amt || 0),
      nonlife_cnt: Number(perfInput.nonlife_cnt || 0) + Number(added.nonlife_cnt || 0),
      call: Number(perfInput.call || 0) + Number(added.call || 0),
      meet: Number(perfInput.meet || 0) + Number(added.meet || 0),
      pt: Number(perfInput.pt || 0) + Number(added.pt || 0),
      intro: Number(perfInput.intro || 0) + Number(added.intro || 0),
      db_assigned: Number(perfInput.db_assigned || 0) + Number(added.db_assigned || 0),
      db_returned: Number(perfInput.db_returned || 0) + Number(added.db_returned || 0),
    };
    rawPayload.contract_amt = Number(rawPayload.life_amt || 0) + Number(rawPayload.nonlife_amt || 0);
    rawPayload.contract_cnt = Number(rawPayload.life_cnt || 0) + Number(rawPayload.nonlife_cnt || 0);
    rawPayload.target_amt = Number(rawPayload.target_life_amt || 0) + Number(rawPayload.target_nonlife_amt || 0);
    rawPayload.target_cnt = Number(rawPayload.target_life_cnt || 0) + Number(rawPayload.target_nonlife_cnt || 0);
    const lockedTargetPayload = perfInput.is_approved
      ? { target_cnt: perfInput.target_cnt, target_amt: perfInput.target_amt }
      : {};
    const payload = {
      call: Number(rawPayload.call || 0), meet: Number(rawPayload.meet || 0),
      pt: Number(rawPayload.pt || 0), intro: Number(rawPayload.intro || 0),
      db_assigned: Number(rawPayload.db_assigned || 0), db_returned: Number(rawPayload.db_returned || 0),
      contract_cnt: Number(rawPayload.contract_cnt || 0), contract_amt: Number(rawPayload.contract_amt || 0),
      target_cnt: Number((perfInput.is_approved ? perfInput.target_cnt : rawPayload.target_cnt) || 0),
      target_amt: Number((perfInput.is_approved ? perfInput.target_amt : rawPayload.target_amt) || 0),
      edu_status: rawPayload.edu_status,
      is_approved: rawPayload.is_approved,
      edu_1: rawPayload.edu_1,
      edu_2: rawPayload.edu_2,
      edu_3: rawPayload.edu_3,
      edu_4: rawPayload.edu_4,
      edu_5: rawPayload.edu_5,
      ...lockedTargetPayload,
    };
    const { error } = await supabase.from("daily_perf").upsert({ ...payload, user_id: user.id, date: monthKey }, { onConflict: 'user_id, date' });
    if (error) alert("저장 실패: " + error.message);
    else {
      if (!customField) {
        await supabase.from("team_settings").upsert({
          key: extKey,
          value: JSON.stringify({
            life_amt: Number(rawPayload.life_amt || 0),
            life_cnt: Number(rawPayload.life_cnt || 0),
            nonlife_amt: Number(rawPayload.nonlife_amt || 0),
            nonlife_cnt: Number(rawPayload.nonlife_cnt || 0),
            target_life_amt: Number(rawPayload.target_life_amt || 0),
            target_life_cnt: Number(rawPayload.target_life_cnt || 0),
            target_nonlife_amt: Number(rawPayload.target_nonlife_amt || 0),
            target_nonlife_cnt: Number(rawPayload.target_nonlife_cnt || 0),
            target_call: Number(rawPayload.target_call || 0),
            target_meet: Number(rawPayload.target_meet || 0),
            target_pt: Number(rawPayload.target_pt || 0),
            target_intro: Number(rawPayload.target_intro || 0),
            target_db_assigned: Number(rawPayload.target_db_assigned || 0),
            target_db_returned: Number(rawPayload.target_db_returned || 0),
            logs: [
              ...(((perfInput as any).logs || []) as any[]).slice(-60),
              { date: new Date().toISOString(), ...addInput },
            ],
          }),
        }, { onConflict: "key" });
      }
      if(!customField) alert(`${month}월 실적이 업데이트되었습니다.`);
      await fetchData(); await fetchAllHistory();
    }
  };

  const amtRate = calculateRate(perfInput.contract_amt, perfInput.target_amt);
  const cntRate = calculateRate(perfInput.contract_cnt, perfInput.target_cnt);
  const lifeAmtRate = calculateRate(perfInput.life_amt, perfInput.target_life_amt);
  const lifeCntRate = calculateRate(perfInput.life_cnt, perfInput.target_life_cnt);
  const nonlifeAmtRate = calculateRate(perfInput.nonlife_amt, perfInput.target_nonlife_amt);
  const nonlifeCntRate = calculateRate(perfInput.nonlife_cnt, perfInput.target_nonlife_cnt);

  return (
    <div className="agent-work-view min-w-0 space-y-4 pb-20 [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">

      {/* 공지 배너 */}
      <div style={{ background: "#1a2540", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderRadius: 10 }}>
        <span style={{ background: "#378add", color: "white", fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 4, flexShrink: 0 }}>NOTICE</span>
        <div style={{ overflow: "hidden", flex: 1, height: 18 }}>
          <div className="animate-marquee" style={{ whiteSpace: "nowrap", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{globalNotice}</div>
        </div>
      </div>

      {/* 사용자 카드 + 퀵링크 */}
      <div style={{ background: "white", borderRadius: 12, border: "0.5px solid #e4edf5", padding: "13px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#eef4fb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500, color: "#185fa5", flexShrink: 0 }}>
          {user?.name?.[0] || "U"}
        </div>
        <div style={{ flex: 1, minWidth: 80 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#1a2d42" }}>{user?.name}</p>
          <p style={{ fontSize: 11, color: "#7a9ab2", letterSpacing: "0.04em", marginTop: 1 }}>INSURANCE AGENT</p>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[
            { label: "메타온", url: LINKS.metaon, style: {} },
            { label: "보험사", url: LINKS.insu, style: {} },
            { label: "자료실", url: LINKS.archive, style: {} },
            { label: "세일즈 마스터", url: LINKS.salesMaster, style: { background: "#1a2540", color: "#e8f1f8", borderColor: "#1a2540" } },
            { label: "세일즈 북", url: LINKS.salesBook, style: { background: "#eef4fb", color: "#185fa5", borderColor: "#b5d4f4" } },
            { label: "상품의 모든것", url: LINKS.productAll, style: { background: "#fff7e6", color: "#854f0b", borderColor: "#fcd588" } },
            ...(canUseCrm ? [{ label: "고객관리", url: LINKS.customerCrm, style: { background: "#e1f5ee", color: "#0f6e56", borderColor: "#9fe1cb" } }] : []),
          ].map(btn => (
            <button
              key={btn.label}
              onClick={() => btn.url && window.open(btn.url, "_blank")}
              style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "0.5px solid #d4e0eb", color: "#4a6275", background: "white", whiteSpace: "nowrap", fontFamily: "inherit", ...btn.style }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 2, background: "#eef2f7", borderRadius: 10, padding: 3, flexWrap: "wrap" }}>
        {[
          { id: "input", label: "PERFORMANCE" },
          { id: "edu", label: "EDUCATION" },
          { id: "strategy", label: "📦 이달의 상품전략" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setMainTab(t.id as any)}
            style={{
              padding: "6px 20px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: mainTab === t.id ? "0.5px solid #d4e0eb" : "none",
              background: mainTab === t.id ? "white" : "transparent",
              color: mainTab === t.id ? "#1a2d42" : "#7a9ab2",
              fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 이달의 상품전략 */}
      {mainTab === 'strategy' && (
        <ProductStrategyPage
          user={user}
          isEditor={false}
          monthKey={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-01`}
          onClose={() => setMainTab('input')}
        />
      )}

      {mainTab === 'input' && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* 실적 목표/누적 입력 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <InsurancePerfCard
              title="생명보험"
              tone="#2563eb"
              amountRate={lifeAmtRate}
              countRate={lifeCntRate}
              targetAmount={perfInput.target_life_amt}
              currentAmount={perfInput.life_amt}
              addAmount={addInput.life_amt}
              targetCount={perfInput.target_life_cnt}
              currentCount={perfInput.life_cnt}
              addCount={addInput.life_cnt}
              disabled={perfInput.is_approved}
              onTargetAmount={(value: number) => setPerfInput({ ...perfInput, target_life_amt: value })}
              onAddAmount={(value: number) => setAddInput({ ...addInput, life_amt: value })}
              onTargetCount={(value: number) => setPerfInput({ ...perfInput, target_life_cnt: value })}
              onAddCount={(value: number) => setAddInput({ ...addInput, life_cnt: value })}
            />
            <InsurancePerfCard
              title="손해보험"
              tone="#0f6e56"
              amountRate={nonlifeAmtRate}
              countRate={nonlifeCntRate}
              targetAmount={perfInput.target_nonlife_amt}
              currentAmount={perfInput.nonlife_amt}
              addAmount={addInput.nonlife_amt}
              targetCount={perfInput.target_nonlife_cnt}
              currentCount={perfInput.nonlife_cnt}
              addCount={addInput.nonlife_cnt}
              disabled={perfInput.is_approved}
              onTargetAmount={(value: number) => setPerfInput({ ...perfInput, target_nonlife_amt: value })}
              onAddAmount={(value: number) => setAddInput({ ...addInput, nonlife_amt: value })}
              onTargetCount={(value: number) => setPerfInput({ ...perfInput, target_nonlife_cnt: value })}
              onAddCount={(value: number) => setAddInput({ ...addInput, nonlife_cnt: value })}
            />
            <div style={{ background: "white", border: "0.5px solid #e4edf5", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontSize: 12, color: "#7a9ab2", marginBottom: 4 }}>{month}월 전체 누적</p>
                  <p style={{ fontSize: 22, fontWeight: 600, color: "#1a2d42" }}>{Number(perfInput.contract_amt || 0).toLocaleString()}만 / {perfInput.contract_cnt}건</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <CircleRate label="금액" rate={amtRate} size={86} />
                  <CircleRate label="건수" rate={cntRate} size={86} />
                </div>
              </div>
            </div>
          </div>

          {/* 활동 지표 */}
          <div style={{ background: "white", border: "0.5px solid #e4edf5", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 12, color: "#7a9ab2", marginBottom: 12, letterSpacing: "0.04em" }}>활동 지표 · 목표 대비 누적</p>
            <div className="agent-activity-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { label: "전화", key: "call", targetKey: "target_call" },
                { label: "만남", key: "meet", targetKey: "target_meet" },
                { label: "제안", key: "pt", targetKey: "target_pt" },
                { label: "소개", key: "intro", targetKey: "target_intro" },
                { label: "신청", key: "db_assigned", targetKey: "target_db_assigned" },
                { label: "반품", key: "db_returned", targetKey: "target_db_returned", noTarget: true },
              ].map(({ label, key, targetKey, noTarget }) => {
                const current = Number((perfInput as any)[key] || 0);
                const target = Number((perfInput as any)[targetKey] || 0);
                const rate = noTarget
                  ? calculateRate(Number(perfInput.db_returned || 0), Number(perfInput.db_assigned || 0))
                  : calculateRate(current, target);
                return (
                  <ActivityProgressCard
                    key={key}
                    label={label}
                    current={current}
                    target={target}
                    add={Number((addInput as any)[key] || 0)}
                    rate={rate}
                    noTarget={noTarget}
                    rateLabel={noTarget ? "반품률" : label}
                    disabled={perfInput.is_approved}
                    onTarget={(value: number) => setPerfInput({ ...perfInput, [targetKey]: value })}
                    onAdd={(value: number) => setAddInput({ ...addInput, [key]: value })}
                  />
                );
              })}
            </div>
          </div>

          {/* 3개월 추이 + HOF */}
          <div className="agent-history-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div style={{ background: "white", border: "0.5px solid #e4edf5", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: "#1a2d42" }}>3개월 추이</p>
                <div style={{ display: "flex", gap: 2, background: "#f7fafc", borderRadius: 6, padding: 2 }}>
                  {[{ id: "perf", label: "실적" }, { id: "act", label: "활동" }].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setAvgTab(t.id as any)}
                      style={{ padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 500, cursor: "pointer", border: "none", background: avgTab === t.id ? "white" : "transparent", color: avgTab === t.id ? "#1a2d42" : "#9ab4c8", fontFamily: "inherit" }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {avgTab === 'perf' ? (
                <div className="agent-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
                  {[{ label: "평균 매출", val: `${avgData.amt.toLocaleString()}만` }, { label: "평균 건수", val: `${avgData.cnt}건` }, { label: "건당 매출", val: `${avgData.perAmt.toLocaleString()}만` }].map(item => (
                    <div key={item.label} style={{ background: "#f7fafc", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                      <p style={{ fontSize: 10, color: "#9ab4c8", marginBottom: 4 }}>{item.label}</p>
                      <p style={{ fontSize: 15, fontWeight: 500, color: "#378add" }}>{item.val}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="agent-summary-grid-four" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
                  {[{ label: "전화", val: `${avgData.call}회` }, { label: "만남", val: `${avgData.meet}회` }, { label: "제안", val: `${avgData.pt}회` }, { label: "소개", val: `${avgData.intro}회` }].map(item => (
                    <div key={item.label} style={{ background: "#f7fafc", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                      <p style={{ fontSize: 10, color: "#9ab4c8", marginBottom: 4 }}>{item.label}</p>
                      <p style={{ fontSize: 15, fontWeight: 500, color: "#378add" }}>{item.val}</p>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 10, color: "#9ab4c8", marginBottom: 7, letterSpacing: "0.04em" }}>PERSONAL HALL OF FAME</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div
                  onClick={() => setViewDetail(records.best)}
                  style={{ borderRadius: 8, padding: "11px 13px", background: "#eef4fb", border: "0.5px solid #b5d4f4", cursor: "pointer" }}
                >
                  <p style={{ fontSize: 10, fontWeight: 500, color: "#185fa5", marginBottom: 4, letterSpacing: "0.04em" }}>🏆 GUINNESS</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#1a2d42" }}>
                    {records.best ? `${new Date(records.best.date).getFullYear()}.${String(new Date(records.best.date).getMonth() + 1).padStart(2, '0')}` : '-'}
                  </p>
                  <p style={{ fontSize: 12, color: "#378add", marginTop: 2 }}>{records.best ? `${records.best.contract_amt.toLocaleString()}만` : 'No Data'}</p>
                </div>
                <div
                  onClick={() => setViewDetail(records.worst)}
                  style={{ borderRadius: 8, padding: "11px 13px", background: "#fcebeb", border: "0.5px solid #f7c1c1", cursor: "pointer" }}
                >
                  <p style={{ fontSize: 10, fontWeight: 500, color: "#a32d2d", marginBottom: 4, letterSpacing: "0.04em" }}>📉 LOWEST</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#1a2d42" }}>
                    {records.worst ? `${new Date(records.worst.date).getFullYear()}.${String(new Date(records.worst.date).getMonth() + 1).padStart(2, '0')}` : '-'}
                  </p>
                  <p style={{ fontSize: 12, color: "#e24b4a", marginTop: 2 }}>{records.worst ? `${records.worst.contract_amt.toLocaleString()}만` : 'No Data'}</p>
                </div>
              </div>
              {viewDetail && (
                <div style={{ marginTop: 10, background: "#f7fafc", borderRadius: 8, padding: "12px 14px", border: "0.5px solid #e4edf5" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "#1a2d42" }}>
                      {new Date(viewDetail.date).getFullYear()}년 {new Date(viewDetail.date).getMonth() + 1}월 상세
                    </p>
                    <button onClick={() => setViewDetail(null)} style={{ fontSize: 10, color: "#9ab4c8", background: "none", border: "0.5px solid #d4e0eb", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit" }}>닫기</button>
                  </div>
                  <div className="agent-detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                    {[
                      { label: "매출액", val: `${viewDetail.contract_amt.toLocaleString()}만`, highlight: true },
                      { label: "계약건", val: `${viewDetail.contract_cnt}건`, highlight: true },
                      { label: "전화", val: `${viewDetail.call}회` },
                      { label: "만남", val: `${viewDetail.meet}회` },
                      { label: "제안", val: `${viewDetail.pt}회` },
                      { label: "소개", val: `${viewDetail.intro}회` },
                      { label: "신청", val: `${viewDetail.db_assigned}개` },
                      { label: "반품", val: `${viewDetail.db_returned}개` },
                    ].map(item => (
                      <div key={item.label} style={{ background: "white", borderRadius: 6, padding: "8px 10px", textAlign: "center", border: "0.5px solid #e4edf5" }}>
                        <p style={{ fontSize: 9, color: "#9ab4c8", marginBottom: 3 }}>{item.label}</p>
                        <p style={{ fontSize: 13, fontWeight: 500, color: item.highlight ? "#378add" : "#1a2d42" }}>{item.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 저장 버튼 */}
            <div>
              <button
                onClick={() => handleSave()}
                style={{ width: "100%", background: "#1a2540", color: "#e8f1f8", border: "none", borderRadius: 10, padding: 14, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
              >
                💾 SAVE & UPDATE RECORD
              </button>
            </div>
          </div>
        </div>
      )}

      {mainTab === 'edu' && (
        <div style={{ background: "white", borderRadius: 12, border: "0.5px solid #e4edf5", padding: "20px 20px" }}>
          <div style={{ borderBottom: "0.5px solid #e4edf5", paddingBottom: 16, marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1a2d42" }}>Weekly Training</h2>
            <p style={{ fontSize: 11, color: "#9ab4c8", marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>Professional Skill Enhancement</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((w) => {
              const fieldName = `edu_${w}` as keyof typeof perfInput;
              const isChecked = perfInput[fieldName];
              return (
                <div
                  key={w}
                  onClick={() => handleSave({ [fieldName]: !isChecked })}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                    borderRadius: 10, border: isChecked ? "0.5px solid #9fe1cb" : "0.5px solid #e4edf5",
                    background: isChecked ? "#f0fdf8" : "#f7fafc", cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 13,
                    background: isChecked ? "#10b981" : "#e2e8f0",
                    color: isChecked ? "white" : "#64748b",
                    flexShrink: 0,
                  }}>
                    {w === 5 ? "+" : `${w}W`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: isChecked ? "#064e3b" : "#1a2d42" }}>
                      {eduWeeks[w as keyof typeof eduWeeks] || "등록된 교육 내용이 없습니다."}
                    </p>
                    {isChecked && <p style={{ fontSize: 10, color: "#10b981", marginTop: 2, letterSpacing: "0.06em" }}>COMPLETED ✓</p>}
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", border: isChecked ? "none" : "1.5px solid #d4e0eb",
                    background: isChecked ? "#10b981" : "white", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: 12, flexShrink: 0,
                  }}>
                    {isChecked ? "✓" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCustOpen && (
        <CustomerManagerModal onClose={() => setIsCustOpen(false)} onSaveToGoogle={handleGoogleSync} />
      )}
    </div>
  )
}

function InsurancePerfCard({
  title,
  tone,
  amountRate,
  countRate,
  targetAmount,
  currentAmount,
  addAmount,
  targetCount,
  currentCount,
  addCount,
  disabled,
  onTargetAmount,
  onAddAmount,
  onTargetCount,
  onAddCount,
}: any) {
  return (
    <div style={{ background: "white", border: "0.5px solid #e4edf5", borderRadius: 12, padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 190px", gap: 16, alignItems: "center" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1a2d42" }}>{title}</p>
          <p style={{ fontSize: 11, fontWeight: 700, color: tone }}>오늘 추가 입력 → 저장 시 누적</p>
        </div>
        <div className="agent-insurance-input-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
          <MetricInput label="목표 금액" value={targetAmount} disabled={disabled} onChange={onTargetAmount} suffix="만" />
          <ReadMetric label="현재 누적" value={`${Number(currentAmount || 0).toLocaleString()}만`} />
          <MetricInput label="오늘 추가" value={addAmount} onChange={onAddAmount} suffix="만" accent={tone} />
        </div>
        <div className="agent-insurance-input-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <MetricInput label="목표 건수" value={targetCount} disabled={disabled} onChange={onTargetCount} suffix="건" />
          <ReadMetric label="현재 누적" value={`${Number(currentCount || 0).toLocaleString()}건`} />
          <MetricInput label="오늘 추가" value={addCount} onChange={onAddCount} suffix="건" accent={tone} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        <CircleRate label="금액" rate={amountRate} tone={tone} />
        <CircleRate label="건수" rate={countRate} tone={tone} />
      </div>
    </div>
  )
}

function ActivityProgressCard({ label, current, target, add, rate, disabled, onTarget, onAdd, noTarget = false, rateLabel }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "82px 1fr", gap: 10, alignItems: "center", borderRadius: 10, background: "#f7fafc", border: "0.5px solid #e4edf5", padding: 10 }}>
      <CircleRate label={rateLabel || label} rate={rate} size={76} />
      <div style={{ display: "grid", gridTemplateColumns: noTarget ? "1fr" : "1fr 1fr", gap: 7 }}>
        {!noTarget && <MetricInput label="목표" value={target} disabled={disabled} onChange={onTarget} suffix="건" compact />}
        <ReadMetric label="누적" value={`${Number(current || 0).toLocaleString()}건`} compact />
        <MetricInput label="오늘 추가" value={add} onChange={onAdd} suffix="건" accent="#2563eb" compact />
        <ReadMetric label="저장 후" value={`${Number(current || 0) + Number(add || 0)}건`} compact />
      </div>
    </div>
  )
}

function MetricInput({ label, value, onChange, disabled = false, suffix, accent = "#1a2d42", compact = false }: any) {
  return (
    <label style={{ display: "block", background: "white", borderRadius: 8, border: "0.5px solid #e4edf5", padding: compact ? "7px 8px" : "9px 10px" }}>
      <span style={{ display: "block", fontSize: 9, color: "#9ab4c8", marginBottom: 3, letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <input
          type="number"
          disabled={disabled}
          value={Number(value || 0) === 0 ? "" : Number(value || 0)}
          placeholder="0"
          onChange={(event) => onChange(Number(event.target.value || 0))}
          style={{ width: "100%", minWidth: 0, background: "none", border: "none", outline: "none", fontSize: compact ? 15 : 19, fontWeight: 700, color: disabled ? "#94a3b8" : accent, fontFamily: "inherit" }}
        />
        <span style={{ fontSize: 10, color: "#9ab4c8", flexShrink: 0 }}>{suffix}</span>
      </span>
    </label>
  )
}

function ReadMetric({ label, value, compact = false }: any) {
  return (
    <div style={{ background: "#eef4fb", borderRadius: 8, border: "0.5px solid #d4e0eb", padding: compact ? "7px 8px" : "9px 10px" }}>
      <p style={{ fontSize: 9, color: "#7a9ab2", marginBottom: 3, letterSpacing: "0.04em" }}>{label}</p>
      <p style={{ fontSize: compact ? 15 : 19, fontWeight: 700, color: "#378add" }}>{value}</p>
    </div>
  )
}

function CircleRate({ label, rate, tone, size = 94 }: { label: string; rate: number; tone?: string; size?: number }) {
  const color = tone || getBarColor(rate);
  const background = `conic-gradient(${color} 0 ${Math.min(rate, 100)}%, #e8eef5 ${Math.min(rate, 100)}% 100%)`;
  return (
    <div style={{ width: size, textAlign: "center" }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background, padding: 8 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: size < 82 ? 17 : 21, fontWeight: 800, color: getRateColor(rate), lineHeight: 1 }}>{rate}%</span>
          <span style={{ marginTop: 3, fontSize: 9, fontWeight: 700, color: "#9ab4c8" }}>{label}</span>
        </div>
      </div>
    </div>
  )
}

function getRateColor(rate: number) {
  if (rate >= 80) return "#0f6e56";
  if (rate >= 65) return "#ba7517";
  if (rate >= 30) return "#ba7517";
  return "#e24b4a";
}

function getBarColor(rate: number) {
  if (rate >= 80) return "#1d9e75";
  if (rate >= 65) return "#f0a500";
  if (rate >= 30) return "#f0a500";
  return "#e24b4a";
}
