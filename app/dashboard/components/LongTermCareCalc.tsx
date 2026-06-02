"use client"

import { useState } from "react"

const C = {
  gold: "#C9A84C",
  goldLight: "#FDF5E0",
  navy: "#0F1E35",
  navyMid: "#1A3052",
  blue: "#1E5FA8",
  teal: "#0E7E6B",
  rose: "#C0392B",
  slate: "#4A5568",
  slateLight: "#F7F8FA",
  border: "#E2E8F0",
  text: "#1A202C",
  muted: "#718096",
}

type CareGrade = "1" | "2" | "3" | "4" | "5" | "cognitive"
type CareService = "daycare" | "visitCare" | "bathCar" | "bathHome" | "bathNoCar"
type CareBurden = "general" | "reduce40" | "reduce60" | "exempt"
type DaycareTime = "3to6" | "6to8" | "8to10" | "10to13" | "13plus"
type VisitCareTime = "30" | "60" | "90" | "120" | "150" | "180" | "210" | "240"

const inputGrid = (count: number) => `repeat(${count}, minmax(0,1fr))`
const fmt = (n: number) => Math.round(Number.isFinite(n) ? n : 0).toLocaleString("ko-KR")

const CARE_GRADES: { id: CareGrade; label: string; desc: string }[] = [
  { id: "1", label: "1등급", desc: "95점 이상" },
  { id: "2", label: "2등급", desc: "75점 이상" },
  { id: "3", label: "3등급", desc: "60점 이상" },
  { id: "4", label: "4등급", desc: "51점 이상" },
  { id: "5", label: "5등급", desc: "치매 인정" },
  { id: "cognitive", label: "인지지원", desc: "주야간보호 중심" },
]

const CARE_LIMITS: Record<CareGrade, number> = {
  "1": 2512900,
  "2": 2331200,
  "3": 1528200,
  "4": 1409700,
  "5": 1208900,
  cognitive: 676320,
}

const DAYCARE_RATES: Record<DaycareTime, Record<CareGrade, number>> = {
  "3to6": { "1": 41820, "2": 38720, "3": 35740, "4": 34120, "5": 32490, cognitive: 32490 },
  "6to8": { "1": 56060, "2": 51930, "3": 47940, "4": 46300, "5": 44650, cognitive: 44650 },
  "8to10": { "1": 69730, "2": 64590, "3": 59640, "4": 58010, "5": 56360, cognitive: 56360 },
  "10to13": { "1": 76820, "2": 71160, "3": 65750, "4": 64090, "5": 62460, cognitive: 56360 },
  "13plus": { "1": 82370, "2": 76310, "3": 70500, "4": 68860, "5": 67240, cognitive: 56360 },
}

const VISIT_CARE_RATES: Record<VisitCareTime, number> = {
  "30": 17450,
  "60": 25320,
  "90": 34120,
  "120": 43430,
  "150": 50640,
  "180": 57020,
  "210": 63530,
  "240": 70080,
}

const BATH_RATES: Record<Exclude<CareService, "daycare" | "visitCare">, number> = {
  bathCar: 88990,
  bathHome: 80230,
  bathNoCar: 50100,
}

const CARE_BURDEN_RATES: Record<CareBurden, { label: string; rate: number; desc: string }> = {
  general: { label: "일반 15%", rate: 0.15, desc: "재가급여 기본 본인부담률" },
  reduce40: { label: "40% 감경 9%", rate: 0.09, desc: "본인부담 감경 대상" },
  reduce60: { label: "60% 감경 6%", rate: 0.06, desc: "본인부담 추가 감경 대상" },
  exempt: { label: "기초/의료급여 면제", rate: 0, desc: "급여 본인부담 면제 기준" },
}

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 4, height: 22, background: C.gold, borderRadius: 2 }} />
        <h2 style={{ margin: 0, color: C.navy, fontSize: 19, fontWeight: 900, letterSpacing: "-0.4px" }}>{title}</h2>
      </div>
      {desc && <p style={{ margin: "6px 0 0 14px", color: C.muted, fontSize: 12, fontWeight: 700 }}>{desc}</p>}
    </div>
  )
}

function InputRow({ label, value, onChange, unit, step = 1, hint }: { label: string; value: number; onChange: (value: number) => void; unit?: string; step?: number; hint?: string }) {
  return (
    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: C.slate }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", boxSizing: "border-box", height: 46, padding: "0 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: "#fff", overflow: "hidden" }}>
        <input type="number" value={value} step={step} onChange={(event) => onChange(Number(event.target.value))} style={{ minWidth: 0, width: "100%", flex: 1, border: "none", outline: "none", background: "transparent", color: C.text, fontSize: 16, fontWeight: 800 }} />
        {unit && <span style={{ color: C.muted, fontSize: 12, fontWeight: 700 }}>{unit}</span>}
      </span>
      <span style={{ color: C.blue, fontSize: 11, fontWeight: 700, minHeight: 14, visibility: hint ? "visible" : "hidden" }}>{hint || "0"}</span>
    </label>
  )
}

function SelectRow<T extends string>({ label, value, onChange, options, hint }: { label: string; value: T; onChange: (value: T) => void; options: { id: T; label: string }[]; hint?: string }) {
  return (
    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: C.slate }}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)} style={{ width: "100%", height: 46, border: `1.5px solid ${C.border}`, borderRadius: 10, background: "#fff", color: C.text, fontSize: 14, fontWeight: 850, padding: "0 12px", outline: "none" }}>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <span style={{ color: C.blue, fontSize: 11, fontWeight: 700, minHeight: 14, visibility: hint ? "visible" : "hidden" }}>{hint || "0"}</span>
    </label>
  )
}

function Metric({ label, value, tone = C.blue, sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div style={{ minWidth: 0, background: "#fff", border: `1px solid ${C.border}`, borderTop: `4px solid ${tone}`, borderRadius: 14, padding: "16px 18px", overflow: "hidden" }}>
      <p style={{ margin: "0 0 7px", color: C.muted, fontSize: 11, fontWeight: 900 }}>{label}</p>
      <p style={{ margin: 0, color: C.text, fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1.18, overflowWrap: "anywhere" }}>{value}</p>
      {sub && <p style={{ margin: "5px 0 0", color: C.muted, fontSize: 11, fontWeight: 700 }}>{sub}</p>}
    </div>
  )
}

function ResultHero({ title, body, tone = C.blue }: { title: string; body: string; tone?: string }) {
  return (
    <div style={{ marginTop: 16, border: `1px solid ${tone}33`, borderLeft: `5px solid ${tone}`, borderRadius: 16, background: "#fff", padding: "16px 18px" }}>
      <p style={{ margin: "0 0 6px", color: tone, fontSize: 12, fontWeight: 950 }}>{title}</p>
      <p style={{ margin: 0, color: C.text, fontSize: 17, fontWeight: 900, lineHeight: 1.55, overflowWrap: "anywhere" }}>{body}</p>
    </div>
  )
}

function BarCompare({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width = Math.max(6, Math.min(100, (value / Math.max(max, 1)) * 100))
  return (
    <div style={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr) 132px", gap: 10, alignItems: "center", marginBottom: 10 }}>
      <span style={{ color: C.slate, fontSize: 12, fontWeight: 950 }}>{label}</span>
      <div style={{ height: 18, borderRadius: 999, background: "#E8EDF4", overflow: "hidden" }}>
        <div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: color }} />
      </div>
      <span style={{ color: C.text, textAlign: "right", fontSize: 13, fontWeight: 950, overflowWrap: "anywhere" }}>{fmt(value)}원</span>
    </div>
  )
}

export default function LongTermCareCalc() {
  const [inp, setInp] = useState({
    grade: "3" as CareGrade,
    service: "daycare" as CareService,
    daycareTime: "3to6" as DaycareTime,
    visitTime: "240" as VisitCareTime,
    weekly: 3,
    weeks: 4,
    nonCovered: 0,
    designedDailyBenefit: 30000,
    designedMonthlyBenefit: 0,
    burden: "general" as CareBurden,
  })
  const [confirmed, setConfirmed] = useState(false)

  const grade = CARE_GRADES.find((item) => item.id === inp.grade) || CARE_GRADES[2]
  const monthlyLimit = CARE_LIMITS[inp.grade]
  const visits = Math.max(0, Math.round(inp.weekly * inp.weeks))
  const serviceLabel: Record<CareService, string> = {
    daycare: "주야간보호센터",
    visitCare: "방문요양",
    bathCar: "방문목욕(차량 내 목욕)",
    bathHome: "방문목욕(가정 내 목욕)",
    bathNoCar: "방문목욕(차량 미이용)",
  }
  const daycareLabels: Record<DaycareTime, string> = {
    "3to6": "3~6시간, 4시간 이용 시 이 구간 적용",
    "6to8": "6~8시간",
    "8to10": "8~10시간",
    "10to13": "10~13시간",
    "13plus": "13시간 초과",
  }
  const visitLabels: Record<VisitCareTime, string> = {
    "30": "30분 이상",
    "60": "60분 이상",
    "90": "90분 이상",
    "120": "120분 이상",
    "150": "150분 이상",
    "180": "180분 이상",
    "210": "210분 이상",
    "240": "240분 이상",
  }
  const perUseCost = inp.service === "daycare" ? DAYCARE_RATES[inp.daycareTime][inp.grade] : inp.service === "visitCare" ? VISIT_CARE_RATES[inp.visitTime] : BATH_RATES[inp.service]
  const totalServiceCost = perUseCost * visits
  const withinLimitCost = Math.min(totalServiceCost, monthlyLimit)
  const overLimitCost = Math.max(totalServiceCost - monthlyLimit, 0)
  const burdenInfo = CARE_BURDEN_RATES[inp.burden]
  const selfPayInLimit = Math.round(withinLimitCost * burdenInfo.rate)
  const publicPay = Math.max(withinLimitCost - selfPayInLimit, 0)
  const selfPayBeforePlan = selfPayInLimit + overLimitCost + inp.nonCovered
  const designedBenefit = Math.max(0, inp.designedDailyBenefit * visits + inp.designedMonthlyBenefit)
  const appliedBenefit = Math.min(designedBenefit, selfPayBeforePlan)
  const remainingNeed = Math.max(selfPayBeforePlan - appliedBenefit, 0)
  const limitUseRate = Math.round((withinLimitCost / Math.max(monthlyLimit, 1)) * 100)
  const maxBar = Math.max(totalServiceCost, monthlyLimit, selfPayBeforePlan, designedBenefit, 1)
  const scenarioLine = `${grade.label} 고객이 ${serviceLabel[inp.service]}를 주 ${inp.weekly}회, ${inp.weeks}주 이용하면 총 ${visits}회입니다.`

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <section style={{ borderRadius: 18, background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`, color: "#fff", padding: 22, overflow: "hidden" }}>
        <p style={{ margin: 0, color: C.gold, fontSize: 12, fontWeight: 950, letterSpacing: "0.4px" }}>LONG-TERM CARE COST</p>
        <h2 style={{ margin: "8px 0 0", fontSize: 26, fontWeight: 950, letterSpacing: "-0.7px" }}>재가/장기요양 이용 비용 계산</h2>
        <p style={{ margin: "8px 0 0", maxWidth: 760, color: "rgba(255,255,255,0.76)", fontSize: 13, fontWeight: 750, lineHeight: 1.65 }}>
          이용계획을 넣으면 급여비용, 월 한도 적용, 본인부담률, 설계한 재가·간병 보장 적용 후 준비해야 할 금액을 나눠 보여줍니다.
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: inputGrid(4), gap: 12, background: C.slateLight, borderRadius: 16, padding: 18, overflow: "hidden" }}>
        <SelectRow label="장기요양 등급" value={inp.grade} onChange={(v) => setInp({ ...inp, grade: v })} options={CARE_GRADES.map((item) => ({ id: item.id, label: `${item.label} · ${item.desc}` }))} hint={`월 한도 ${fmt(monthlyLimit)}원`} />
        <SelectRow label="이용 서비스" value={inp.service} onChange={(v) => setInp({ ...inp, service: v })} options={[{ id: "daycare", label: "주야간보호센터" }, { id: "visitCare", label: "방문요양" }, { id: "bathCar", label: "방문목욕(차량 내)" }, { id: "bathHome", label: "방문목욕(가정 내)" }, { id: "bathNoCar", label: "방문목욕(차량 미이용)" }]} hint={serviceLabel[inp.service]} />
        {inp.service === "daycare" ? (
          <SelectRow label="이용 시간" value={inp.daycareTime} onChange={(v) => setInp({ ...inp, daycareTime: v })} options={[{ id: "3to6", label: "3~6시간" }, { id: "6to8", label: "6~8시간" }, { id: "8to10", label: "8~10시간" }, { id: "10to13", label: "10~13시간" }, { id: "13plus", label: "13시간 초과" }]} hint={daycareLabels[inp.daycareTime]} />
        ) : inp.service === "visitCare" ? (
          <SelectRow label="방문요양 시간" value={inp.visitTime} onChange={(v) => setInp({ ...inp, visitTime: v })} options={[{ id: "30", label: "30분 이상" }, { id: "60", label: "60분 이상" }, { id: "90", label: "90분 이상" }, { id: "120", label: "120분 이상" }, { id: "150", label: "150분 이상" }, { id: "180", label: "180분 이상" }, { id: "210", label: "210분 이상" }, { id: "240", label: "240분 이상" }]} hint={visitLabels[inp.visitTime]} />
        ) : (
          <InputRow label="1회 기준 수가" value={perUseCost} onChange={() => {}} unit="원" hint="방문목욕 고정 수가" />
        )}
        <SelectRow label="본인부담 구분" value={inp.burden} onChange={(v) => setInp({ ...inp, burden: v })} options={[{ id: "general", label: "일반 15%" }, { id: "reduce40", label: "40% 감경 9%" }, { id: "reduce60", label: "60% 감경 6%" }, { id: "exempt", label: "기초/의료급여 면제" }]} hint={burdenInfo.desc} />
        <InputRow label="주 이용 횟수" value={inp.weekly} onChange={(v) => setInp({ ...inp, weekly: v })} unit="회" />
        <InputRow label="이용 기간" value={inp.weeks} onChange={(v) => setInp({ ...inp, weeks: v })} unit="주" hint={`총 ${visits}회`} />
        <InputRow label="비급여/식비 등" value={inp.nonCovered} onChange={(v) => setInp({ ...inp, nonCovered: v })} unit="원" hint="식비·간식비 등 전액 본인부담" step={1000} />
        <InputRow label="가입 보장 일당" value={inp.designedDailyBenefit} onChange={(v) => setInp({ ...inp, designedDailyBenefit: v })} unit="원/회" hint={`총 ${fmt(inp.designedDailyBenefit * visits)}원 반영`} step={1000} />
        <InputRow label="월 정액 보장" value={inp.designedMonthlyBenefit} onChange={(v) => setInp({ ...inp, designedMonthlyBenefit: v })} unit="원" hint="월 지급형 특약이 있을 때 입력" step={1000} />
      </section>

      <button onClick={() => setConfirmed(true)} style={{ width: "100%", border: "none", background: C.navy, color: C.gold, borderRadius: 14, padding: "14px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer" }}>
        계산 결과 확인
      </button>

      <section style={{ display: "grid", gridTemplateColumns: inputGrid(4), gap: 12 }}>
        <Metric label="1회 급여비용" value={`${fmt(perUseCost)}원`} tone={C.blue} sub={inp.service === "daycare" ? daycareLabels[inp.daycareTime] : serviceLabel[inp.service]} />
        <Metric label="월 총 급여비용" value={`${fmt(totalServiceCost)}원`} tone={C.slate} sub={`${visits}회 이용 기준`} />
        <Metric label="본인부담금" value={`${fmt(selfPayInLimit)}원`} tone={C.rose} sub={`${burdenInfo.label}, 한도 내 금액 기준`} />
        <Metric label="설계 보장 적용 후" value={`${fmt(remainingNeed)}원`} tone={remainingNeed > 0 ? C.rose : C.teal} sub={`보험 적용 ${fmt(appliedBenefit)}원`} />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(280px,0.9fr)", gap: 14 }}>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, background: "#fff", padding: 18, minWidth: 0 }}>
          <SectionTitle title="적용 구조" desc="설계사가 고객에게 설명할 때 필요한 계산 흐름입니다." />
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "1. 월 총 급여비용", value: `${fmt(perUseCost)}원 × ${visits}회 = ${fmt(totalServiceCost)}원`, color: C.blue },
              { label: "2. 월 한도 적용", value: `${fmt(monthlyLimit)}원 한도 중 ${fmt(withinLimitCost)}원 사용, 사용률 ${limitUseRate}%`, color: C.gold },
              { label: "3. 한도 초과분", value: overLimitCost > 0 ? `${fmt(overLimitCost)}원은 전액 본인부담` : "한도 초과 없음", color: overLimitCost > 0 ? C.rose : C.teal },
              { label: "4. 본인부담률", value: `${burdenInfo.label} 적용 → ${fmt(selfPayInLimit)}원`, color: C.rose },
              { label: "5. 설계 보장 적용", value: `일당/월정액 합산 ${fmt(designedBenefit)}원 중 ${fmt(appliedBenefit)}원 차감`, color: C.teal },
            ].map((row) => (
              <div key={row.label} style={{ border: `1px solid ${row.color}33`, borderLeft: `5px solid ${row.color}`, borderRadius: 13, padding: "12px 14px", background: `${row.color}0D` }}>
                <p style={{ margin: 0, color: row.color, fontSize: 12, fontWeight: 950 }}>{row.label}</p>
                <p style={{ margin: "5px 0 0", color: C.text, fontSize: 15, fontWeight: 900, lineHeight: 1.45, overflowWrap: "anywhere" }}>{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, background: C.slateLight, padding: 18, minWidth: 0 }}>
          <SectionTitle title="비용 분해" desc="공단 부담, 본인 부담, 보험 적용을 한눈에 봅니다." />
          <BarCompare label="월한도" value={monthlyLimit} max={maxBar} color={C.gold} />
          <BarCompare label="총비용" value={totalServiceCost} max={maxBar} color={C.blue} />
          <BarCompare label="공단" value={publicPay} max={maxBar} color={C.teal} />
          <BarCompare label="본인" value={selfPayBeforePlan} max={maxBar} color={C.rose} />
          <BarCompare label="보장" value={appliedBenefit} max={maxBar} color={C.navyMid} />
          <p style={{ margin: "14px 0 0", color: C.muted, fontSize: 12, fontWeight: 800, lineHeight: 1.65 }}>
            비급여와 월 한도 초과분은 본인부담률 감경과 별개로 고객 부담으로 남을 수 있습니다.
          </p>
        </div>
      </section>

      {confirmed && (
        <ResultHero title="상담 요약" tone={remainingNeed > 0 ? C.rose : C.teal} body={`${scenarioLine} 총 급여비용은 ${fmt(totalServiceCost)}원이고, ${burdenInfo.label} 기준 본인부담과 비급여·초과분 합계는 ${fmt(selfPayBeforePlan)}원입니다. 설계한 보장 ${fmt(appliedBenefit)}원을 적용하면 고객이 추가로 준비해야 할 금액은 ${fmt(remainingNeed)}원입니다.`} />
      )}

      <section style={{ borderRadius: 16, background: C.goldLight, border: `1px solid ${C.gold}66`, padding: 16 }}>
        <p style={{ margin: 0, color: C.navy, fontSize: 13, fontWeight: 950 }}>기준 안내</p>
        <p style={{ margin: "7px 0 0", color: C.slate, fontSize: 12, fontWeight: 800, lineHeight: 1.7 }}>
          2026년 재가급여 월 한도액과 주야간보호·방문요양·방문목욕 수가 기준으로 계산합니다. 실제 청구액은 기관의 비급여, 식비, 송영, 이용일수, 감경 자격, 고시 변경에 따라 달라질 수 있습니다.
        </p>
      </section>
    </div>
  )
}
