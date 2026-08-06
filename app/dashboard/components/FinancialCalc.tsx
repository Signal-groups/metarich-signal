"use client"

import { useMemo, useState } from "react"
import LongTermCareCalc from "./LongTermCareCalc"

const C = {
  gold: "#C9A84C",
  goldLight: "#FDF5E0",
  navy: "#0F1E35",
  navyMid: "#1A3052",
  blue: "#1E5FA8",
  blueLight: "#EBF3FB",
  teal: "#0E7E6B",
  tealLight: "#E3F5F1",
  rose: "#C0392B",
  roseLight: "#FDEDED",
  slate: "#4A5568",
  slateLight: "#F7F8FA",
  border: "#E2E8F0",
  text: "#1A202C",
  muted: "#718096",
}

type TabId = "retirement" | "care" | "compare" | "inflation" | "compound" | "variable" | "noranwoo" | "pension"
type RetirementLevelId = "unprepared" | "minimum" | "standard" | "comfort"
type PensionType = "db" | "dc" | "irp"
type CompoundMode = "single" | "monthly"

const inputGrid = (count: number) => `repeat(${count}, minmax(0,1fr))`

const fmt = (n: number) => Math.round(Number.isFinite(n) ? n : 0).toLocaleString("ko-KR")
const fmtM = (n: number) => {
  const v = Math.round(Number.isFinite(n) ? n : 0)
  if (Math.abs(v) >= 100000000) return `${fmt(v / 100000000)}억`
  if (Math.abs(v) >= 10000) return `${fmt(v / 10000)}만`
  return fmt(v)
}
const monthlyRate = (annualRate: number) => annualRate / 100 / 12
const futureValueMonthly = (monthly: number, annualRate: number, months: number) => {
  const r = monthlyRate(annualRate)
  if (months <= 0) return 0
  if (r === 0) return monthly * months
  return monthly * ((Math.pow(1 + r, months) - 1) / r)
}
const toManwon = (won: number) => Math.round((Number.isFinite(won) ? won : 0) / 10000)
const fromManwon = (manwon: number) => Math.round((Number.isFinite(manwon) ? manwon : 0) * 10000)
const dcaPriceAt = (index: number) => {
  const pattern = [1000, 1200, 800, 600, 900, 1100, 950, 720, 860, 1040, 1180, 980]
  if (index < pattern.length) return pattern[index]
  const prev = pattern[index % pattern.length]
  const cycle = Math.floor(index / pattern.length)
  return Math.max(420, Math.round(prev * (1 + cycle * 0.045)))
}

const MENU: { id: TabId; label: string; desc: string }[] = [
  { id: "retirement", label: "노후 자금 계산", desc: "국민연금·퇴직연금·필요 생활비" },
  { id: "care", label: "재가/장기요양 계산", desc: "등급·횟수·본인부담·설계 보장 적용" },
  { id: "compare", label: "보험 vs 은행 저축", desc: "동일 납입 조건 수령액 비교" },
  { id: "inflation", label: "화폐가치 하락", desc: "물가 상승에 따른 구매력 변화" },
  { id: "compound", label: "복리 계산", desc: "일시납·월적립식과 거치기간" },
  { id: "variable", label: "코스트 애버리지", desc: "일시납과 월적립식 투자 비교" },
  { id: "noranwoo", label: "노란우산공제 절세", desc: "사업자 공제한도·최대혜택·과납 진단" },
  { id: "pension", label: "연금 시뮬레이터", desc: "변액·공시이율 연금 수령액 인포그래픽" },
]

const RETIREMENT_LEVELS: {
  id: RetirementLevelId
  title: string
  subtitle: string
  image: string
  income: number
  expense: number
  quote: string
  point: string
}[] = [
  {
    id: "unprepared",
    title: "1단계 미준비",
    subtitle: "국가 지원만으로는 부족한 노후",
    image: "/retirement-unprepared.png",
    income: 350000,
    expense: 800000,
    quote: "노후 준비를 미루면 은퇴 자체가 사라질 수 있습니다.",
    point: "기초연금만으로는 식비와 주거비도 빠듯해 은퇴 후 소득활동 가능성을 함께 상담해야 합니다.",
  },
  {
    id: "minimum",
    title: "2단계 최소 준비",
    subtitle: "연금은 있지만 여전히 부족한 노후",
    image: "/retirement-minimum.png",
    income: 1050000,
    expense: 1150000,
    quote: "연금만으로는 생활은 가능해도 안정은 부족할 수 있습니다.",
    point: "의료비와 간병비가 생기면 바로 적자로 전환될 수 있어 개인연금과 건강 대비가 필요합니다.",
  },
  {
    id: "standard",
    title: "3단계 표준 준비",
    subtitle: "기본 생활은 가능하지만 여유가 부족한 노후",
    image: "/retirement-standard.png",
    income: 2300000,
    expense: 2000000,
    quote: "은퇴 준비는 단순한 돈이 아니라 삶의 선택권입니다.",
    point: "생활비는 가능하지만 장기 간병, 의료비, 물가상승을 따로 점검해야 안정적인 노후가 됩니다.",
  },
  {
    id: "comfort",
    title: "4단계 여유 준비",
    subtitle: "삶의 질을 유지하는 노후",
    image: "/retirement-comfort.png",
    income: 4000000,
    expense: 3500000,
    quote: "노후 준비의 차이는 결국 삶의 자유를 결정합니다.",
    point: "연금, 자산소득, 건강 대비가 함께 준비되어 자녀 의존도를 낮추고 선택권을 확보할 수 있습니다.",
  },
]

const DEFAULT_STATE = {
  age: 40,
  retireAge: 65,
  lifeAge: 90,
  monthlyExpense: 2000000,
  monthlyPension: 1200000,
  monthlyPrivatePension: 500000,
  monthlyAssetIncome: 300000,
  salary: 4000000,
  workYears: 20,
  nationalJoinYears: 20,
  nationalAvgIncome: 3500000,
  pensionType: "db" as PensionType,
  dcAnnualSalary: 48000000,
  dcYears: 20,
  dcRate: 4,
  irpMonthly: 300000,
  irpYears: 20,
  irpRate: 4,
}

function InputRow({
  label,
  value,
  onChange,
  unit,
  step = 1,
  hint,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  unit?: string
  step?: number
  hint?: string
}) {
  return (
    <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: C.slate }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", boxSizing: "border-box", height: 46, padding: "0 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: "#fff", overflow: "hidden" }}>
        <input
          type="number"
          value={value}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ minWidth: 0, width: "100%", flex: 1, border: "none", outline: "none", background: "transparent", color: C.text, fontSize: 16, fontWeight: 800 }}
        />
        {unit && <span style={{ color: C.muted, fontSize: 12, fontWeight: 700 }}>{unit}</span>}
      </span>
      <span style={{ color: C.blue, fontSize: 11, fontWeight: 700, minHeight: 14, visibility: hint ? "visible" : "hidden" }}>{hint || "0"}</span>
    </label>
  )
}

function MoneyInputRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  hint?: string
}) {
  return (
    <InputRow
      label={label}
      value={toManwon(value)}
      onChange={(v) => onChange(fromManwon(v))}
      unit="만원"
      hint={hint || `${fmt(value)}원`}
    />
  )
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

function MiniTabs<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (id: T) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          style={{
            border: `1px solid ${value === option.id ? C.navy : C.border}`,
            background: value === option.id ? C.navy : "#fff",
            color: value === option.id ? C.gold : C.slate,
            borderRadius: 999,
            padding: "9px 14px",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default function FinancialCalc() {
  const [tab, setTab] = useState<TabId>("retirement")
  const [state, setState] = useState(DEFAULT_STATE)

  const patch = (next: Partial<typeof DEFAULT_STATE>) => setState((prev) => ({ ...prev, ...next }))
  const reset = () => setState(DEFAULT_STATE)

  return (
    <div className="financial-calc-tool" style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", background: "#EEF3F8", minHeight: "100vh", padding: "24px 18px 40px", overflowX: "hidden" }}>
      <div className="financial-calc-layout" style={{ maxWidth: 1220, margin: "0 auto", display: "grid", gridTemplateColumns: "250px minmax(0,1fr)", gap: 18, alignItems: "start" }}>
        <aside className="financial-calc-side" style={{ position: "sticky", top: 76, background: C.navy, borderRadius: 22, padding: 16, color: "#fff", boxShadow: "0 16px 28px rgba(15,30,53,0.18)" }}>
          <div style={{ padding: "8px 8px 14px", borderBottom: "1px solid rgba(255,255,255,0.09)", marginBottom: 12 }}>
            <p style={{ margin: 0, color: C.gold, fontSize: 12, fontWeight: 950, letterSpacing: "0.4px" }}>계산 메뉴</p>
            <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700, lineHeight: 1.45 }}>상담 목적에 맞춰 계산기를 선택하세요.</p>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {MENU.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                style={{
                  width: "100%",
                  minHeight: 72,
                  border: `1px solid ${tab === item.id ? C.gold : "rgba(255,255,255,0.08)"}`,
                  background: tab === item.id ? "rgba(201,168,76,0.16)" : "rgba(255,255,255,0.055)",
                  color: "#fff",
                  borderRadius: 16,
                  padding: "13px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.16s ease",
                }}
              >
                <strong style={{ display: "block", color: tab === item.id ? C.gold : "#fff", fontSize: 13, fontWeight: 950 }}>{item.label}</strong>
                <span style={{ display: "block", marginTop: 5, color: "rgba(255,255,255,0.58)", fontSize: 11, fontWeight: 700, lineHeight: 1.45 }}>{item.desc}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="financial-calc-main" style={{ minWidth: 0, maxWidth: "100%", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 22, padding: 24, boxShadow: "0 12px 30px rgba(15,30,53,0.06)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
            <div>
              <p style={{ margin: "0 0 7px", color: C.blue, fontSize: 11, fontWeight: 900, letterSpacing: "1px" }}>FINANCIAL CALCULATOR</p>
              <h1 style={{ margin: 0, color: C.navy, fontSize: 28, fontWeight: 950, letterSpacing: "-0.8px" }}>금융계산기</h1>
              <p style={{ margin: "8px 0 0", color: C.muted, fontSize: 13, fontWeight: 700 }}>고객 상황을 입력하면 노후 준비와 저축·투자 비교를 상담용 숫자로 보여줍니다.</p>
            </div>
            <button onClick={reset} style={{ border: `1px solid ${C.border}`, background: "#fff", borderRadius: 12, padding: "11px 16px", color: C.slate, fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
              초기화
            </button>
          </div>

          {tab === "retirement" && <RetirementCalc state={state} patch={patch} />}
          {tab === "care" && <LongTermCareCalc />}
          {tab === "compare" && <CompareCalc />}
          {tab === "inflation" && <InflationCalc />}
          {tab === "compound" && <CompoundCalc age={state.age} />}
          {tab === "variable" && <VariableCalc />}
          {tab === "noranwoo" && <NoranwooCalc />}
          {tab === "pension" && <PensionCalc />}
        </main>
      </div>
    </div>
  )
}

function RetirementCalc({ state, patch }: { state: typeof DEFAULT_STATE; patch: (next: Partial<typeof DEFAULT_STATE>) => void }) {
  const [step, setStep] = useState(1)
  const [levelId, setLevelId] = useState<RetirementLevelId>("standard")
  const [imageLevelId, setImageLevelId] = useState<RetirementLevelId | null>(null)
  const [copied, setCopied] = useState(false)
  const level = RETIREMENT_LEVELS.find((item) => item.id === levelId) || RETIREMENT_LEVELS[2]
  const imageLevel = RETIREMENT_LEVELS.find((item) => item.id === imageLevelId) || null

  const nationalPension = useMemo(() => {
    const yearsFactor = Math.min(Math.max(state.nationalJoinYears, 0), 40) / 20
    const incomeFactor = Math.min(Math.max(state.nationalAvgIncome / 3500000, 0.45), 1.45)
    return Math.round(690000 * yearsFactor * incomeFactor)
  }, [state.nationalAvgIncome, state.nationalJoinYears])

  const dbPension = useMemo(() => {
    const lump = state.salary * state.workYears
    const months = Math.max((state.lifeAge - state.retireAge) * 12, 1)
    return Math.round(lump / months)
  }, [state.lifeAge, state.retireAge, state.salary, state.workYears])

  const dcLump = useMemo(() => {
    const annualContribution = state.dcAnnualSalary / 12
    return Math.round(futureValueMonthly(annualContribution / 12, state.dcRate, state.dcYears * 12))
  }, [state.dcAnnualSalary, state.dcRate, state.dcYears])

  const irpLump = useMemo(() => Math.round(futureValueMonthly(state.irpMonthly, state.irpRate, state.irpYears * 12)), [state.irpMonthly, state.irpRate, state.irpYears])
  const retirementMonths = Math.max((state.lifeAge - state.retireAge) * 12, 1)
  const selectedRetirementMonthly = state.pensionType === "db" ? dbPension : state.pensionType === "dc" ? Math.round(dcLump / retirementMonths) : Math.round(irpLump / retirementMonths)
  const totalIncome = nationalPension + selectedRetirementMonthly + state.monthlyPrivatePension + state.monthlyAssetIncome
  const totalNeeded = state.monthlyExpense * retirementMonths
  const publicAndRetirementMonthly = nationalPension + selectedRetirementMonthly
  const pensionCoveredTotal = publicAndRetirementMonthly * retirementMonths
  const privateAssetNeededMonthly = Math.max(state.monthlyExpense - publicAndRetirementMonthly, 0)
  const privateAssetNeededTotal = privateAssetNeededMonthly * retirementMonths
  const privateAssetMonthly = state.monthlyPrivatePension + state.monthlyAssetIncome
  const privateAssetGapMonthly = privateAssetNeededMonthly - privateAssetMonthly
  const privateAssetGapTotal = privateAssetGapMonthly * retirementMonths
  const monthlyGap = state.monthlyExpense - totalIncome
  const totalGap = Math.max(monthlyGap * retirementMonths, 0)
  const yearsToRetire = Math.max(state.retireAge - state.age, 1)
  const monthlySavingNeeded = totalGap > 0 ? Math.round(totalGap / (yearsToRetire * 12)) : 0

  const summaryText = [
    `[노후 생활 예시] ${level.title}`,
    level.subtitle,
    "",
    `[은퇴 목표] 현재 ${state.age}세 / ${state.retireAge}세 은퇴 / ${state.lifeAge}세 기준`,
    `[희망 월 생활비] ${fmt(state.monthlyExpense)}원`,
    `[예상 월 수입] ${fmt(totalIncome)}원`,
    `[월 부족·여유] ${monthlyGap > 0 ? "-" : "+"}${fmt(Math.abs(monthlyGap))}원`,
    totalGap > 0
      ? `[총 부족 자금] 약 ${fmtM(totalGap)}원 / 지금부터 월 ${fmt(monthlySavingNeeded)}원 추가 준비 필요`
      : `[예상 결과] 월 ${fmt(Math.abs(monthlyGap))}원 정도 여유`,
    "",
    level.quote,
    level.point,
  ].join("\n")

  const applyLevel = (id: RetirementLevelId) => {
    const next = RETIREMENT_LEVELS.find((item) => item.id === id)
    if (!next) return
    setLevelId(id)
    patch({ monthlyExpense: next.expense })
  }

  const copySummary = async () => {
    try {
      if ("ClipboardItem" in window && navigator.clipboard.write) {
        const image = await fetch(level.image)
        const imageBlob = await image.blob()
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([summaryText], { type: "text/plain" }),
            [imageBlob.type || "image/png"]: imageBlob,
          }),
        ])
      } else {
        await navigator.clipboard.writeText(summaryText)
      }
    } catch {
      await navigator.clipboard.writeText(summaryText)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const inflationLoss = Math.round((1 - 1 / Math.pow(1.03, state.lifeAge - state.retireAge)) * 100)

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Step nav */}
      <div style={{ display: "flex", gap: 4, background: "#F1F5FA", borderRadius: 16, padding: 4 }}>
        {(["노후 비전", "연금 계산", "준비 방향"] as const).map((label, idx) => {
          const n = idx + 1
          return (
            <button key={n} onClick={() => setStep(n)} style={{
              flex: 1, border: "none", borderRadius: 13, padding: "11px 0",
              background: step === n ? C.navy : "transparent",
              color: step === n ? C.gold : C.slate,
              fontSize: 13, fontWeight: 950, cursor: "pointer", transition: "all 0.15s",
            }}>
              {n}. {label}
            </button>
          )
        })}
      </div>

      {/* Step 1: 노후 비전 */}
      {step === 1 && (
        <div style={{ display: "grid", gap: 18 }}>
          <SectionTitle title="어떤 노후를 원하시나요?" desc="4가지 노후 생활 수준 중 고객의 목표에 가장 가까운 것을 선택하세요." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
            {RETIREMENT_LEVELS.map((item) => (
              <button key={item.id} onClick={() => applyLevel(item.id)} style={{
                border: `2px solid ${levelId === item.id ? C.blue : C.border}`,
                borderRadius: 14, background: levelId === item.id ? C.blueLight : "#fff",
                padding: 14, textAlign: "left", cursor: "pointer", minHeight: 118,
              }}>
                <strong style={{ display: "block", color: C.navy, fontSize: 14 }}>{item.title}</strong>
                <span style={{ display: "block", marginTop: 5, color: C.muted, fontSize: 11, fontWeight: 700, lineHeight: 1.45 }}>{item.subtitle}</span>
                <span style={{ display: "block", marginTop: 8, color: item.expense > item.income ? C.rose : C.teal, fontSize: 12, fontWeight: 900 }}>월 {fmt(item.expense)}원 기준</span>
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, background: "#fff" }}>
              <SectionTitle title="기본 정보" desc="은퇴 목표를 설정하세요." />
              <div style={{ display: "grid", gridTemplateColumns: inputGrid(2), gap: 12 }}>
                <InputRow label="현재 나이" value={state.age} onChange={(v) => patch({ age: v })} unit="세" />
                <InputRow label="은퇴 나이" value={state.retireAge} onChange={(v) => patch({ retireAge: v })} unit="세" />
                <InputRow label="기대 수명" value={state.lifeAge} onChange={(v) => patch({ lifeAge: v })} unit="세" />
                <MoneyInputRow label="희망 월 생활비" value={state.monthlyExpense} onChange={(v) => patch({ monthlyExpense: v })} />
              </div>
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, background: "#fff" }}>
              <div style={{ background: C.goldLight, border: `1px solid ${C.gold}55`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <p style={{ margin: "0 0 6px", color: C.navy, fontSize: 13, fontWeight: 950 }}>{level.title} · {level.subtitle}</p>
                <p style={{ margin: 0, color: C.text, fontSize: 13, fontWeight: 800, lineHeight: 1.6 }}>{level.quote}</p>
                <p style={{ margin: "8px 0 0", color: C.slate, fontSize: 12, fontWeight: 700 }}>{level.point}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Metric label="기준 월 생활비" value={`${fmt(level.expense)}원`} tone={level.expense > level.income ? C.rose : C.teal} />
                <Metric label="예시 월 수입" value={`${fmt(level.income)}원`} tone={C.gold} />
              </div>
              <button onClick={() => setImageLevelId(level.id)} style={{ marginTop: 10, width: "100%", border: `1px solid ${C.blue}33`, background: C.blueLight, color: C.blue, borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 950, cursor: "pointer" }}>
                노후 생활 예시 이미지 보기
              </button>
            </div>
          </div>

          <button onClick={() => setStep(2)} style={{ border: "none", background: C.navy, color: C.gold, borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 950, cursor: "pointer" }}>
            다음 단계 → 연금 계산하기
          </button>
        </div>
      )}

      {/* Step 2: 연금 계산 */}
      {step === 2 && (
        <div style={{ display: "grid", gap: 18 }}>
          <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, background: "#fff" }}>
              <SectionTitle title="국민연금 계산기" desc="정확 조회가 아닌 상담용 간편 예상입니다." />
              <div style={{ display: "grid", gridTemplateColumns: inputGrid(2), gap: 12, marginBottom: 14 }}>
                <InputRow label="예상 가입기간" value={state.nationalJoinYears} onChange={(v) => patch({ nationalJoinYears: v })} unit="년" />
                <MoneyInputRow label="평균 월소득" value={state.nationalAvgIncome} onChange={(v) => patch({ nationalAvgIncome: v })} />
              </div>
              <Metric label="예상 국민연금 월 수령액" value={`${fmt(nationalPension)}원`} tone={C.teal} sub="국민연금공단 조회와 차이가 있을 수 있습니다." />
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, background: "#fff" }}>
              <SectionTitle title="개인연금·자산소득" desc="은퇴 후 추가 수입원을 입력합니다." />
              <div style={{ display: "grid", gridTemplateColumns: inputGrid(2), gap: 12 }}>
                <MoneyInputRow label="개인연금 월 수령" value={state.monthlyPrivatePension} onChange={(v) => patch({ monthlyPrivatePension: v })} />
                <MoneyInputRow label="자산소득 월 수입" value={state.monthlyAssetIncome} onChange={(v) => patch({ monthlyAssetIncome: v })} />
              </div>
            </div>
          </section>

          <section style={{ border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, background: "#fff" }}>
            <SectionTitle title="퇴직연금 계산기" desc="DB, DC, IRP 방식별로 고객 상황에 맞게 대략적인 월 환산액을 확인합니다." />
            <MiniTabs value={state.pensionType} onChange={(id) => patch({ pensionType: id })} options={[{ id: "db", label: "DB형" }, { id: "dc", label: "DC형" }, { id: "irp", label: "IRP" }]} />
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(260px,0.65fr)", gap: 18, alignItems: "stretch" }}>
              <div style={{ background: C.slateLight, borderRadius: 16, padding: 18, minHeight: 156 }}>
                {state.pensionType === "db" && (
                  <div style={{ display: "grid", gridTemplateColumns: inputGrid(2), gap: 12 }}>
                    <MoneyInputRow label="평균 월급여" value={state.salary} onChange={(v) => patch({ salary: v })} />
                    <InputRow label="총 근속 예상" value={state.workYears} onChange={(v) => patch({ workYears: v })} unit="년" />
                  </div>
                )}
                {state.pensionType === "dc" && (
                  <div style={{ display: "grid", gridTemplateColumns: inputGrid(3), gap: 12 }}>
                    <MoneyInputRow label="연봉" value={state.dcAnnualSalary} onChange={(v) => patch({ dcAnnualSalary: v })} />
                    <InputRow label="운용 기간" value={state.dcYears} onChange={(v) => patch({ dcYears: v })} unit="년" />
                    <InputRow label="예상 수익률" value={state.dcRate} onChange={(v) => patch({ dcRate: v })} unit="%" step={0.1} />
                  </div>
                )}
                {state.pensionType === "irp" && (
                  <div style={{ display: "grid", gridTemplateColumns: inputGrid(3), gap: 12 }}>
                    <MoneyInputRow label="월 납입액" value={state.irpMonthly} onChange={(v) => patch({ irpMonthly: v })} />
                    <InputRow label="납입 기간" value={state.irpYears} onChange={(v) => patch({ irpYears: v })} unit="년" />
                    <InputRow label="예상 수익률" value={state.irpRate} onChange={(v) => patch({ irpRate: v })} unit="%" step={0.1} />
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 10, minWidth: 0 }}>
                <Metric label="퇴직연금 월 환산액" value={`${fmt(selectedRetirementMonthly)}원`} tone={C.blue} sub={`${state.lifeAge - state.retireAge}년 나눠 받는 기준`} />
                <Metric label="DC/IRP 예상 적립금" value={`${fmt(state.pensionType === "dc" ? dcLump : state.pensionType === "irp" ? irpLump : state.salary * state.workYears)}원`} tone={C.gold} />
              </div>
            </div>
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ border: `1px solid ${C.border}`, background: "#fff", color: C.slate, borderRadius: 14, padding: "13px 0", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
              ← 이전
            </button>
            <button onClick={() => setStep(3)} style={{ border: "none", background: C.navy, color: C.gold, borderRadius: 14, padding: "13px 0", fontSize: 13, fontWeight: 950, cursor: "pointer" }}>
              다음 → 준비 방향 확인
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 준비 방향 */}
      {step === 3 && (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ borderRadius: 20, background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`, color: "#fff", padding: 28, overflow: "hidden" }}>
            <p style={{ margin: 0, color: C.gold, fontSize: 12, fontWeight: 950 }}>{state.retireAge}세 은퇴부터 {state.lifeAge}세까지 총 필요 노후자금</p>
            <p style={{ margin: "8px 0 0", fontSize: 38, lineHeight: 1.15, fontWeight: 950, letterSpacing: "-1px" }}>{fmt(totalNeeded)}원</p>
            <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: 800 }}>월 {fmt(state.monthlyExpense)}원 × {state.lifeAge - state.retireAge}년 기준</p>
            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 800 }}>국민연금 + 퇴직연금</p>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 950 }}>월 {fmt(publicAndRetirementMonthly)}원</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 800 }}>개인연금 + 자산소득</p>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 950 }}>월 {fmt(privateAssetMonthly)}원</p>
              </div>
              <div style={{ background: monthlyGap > 0 ? "rgba(192,57,43,0.32)" : "rgba(14,126,107,0.32)", borderRadius: 14, padding: "12px 14px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 800 }}>월 {monthlyGap > 0 ? "부족" : "여유"}</p>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 950, color: monthlyGap > 0 ? "#FF8A80" : "#80CBC4" }}>{monthlyGap > 0 ? "-" : "+"}{fmt(Math.abs(monthlyGap))}원</p>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: inputGrid(3), gap: 12 }}>
            <Metric label="공적연금 차감 후 잔여" value={`${fmt(privateAssetNeededTotal)}원`} tone={C.gold} sub={`월 ${fmt(privateAssetNeededMonthly)}원 필요`} />
            <Metric label="현재 준비 부족액" value={`${privateAssetGapMonthly > 0 ? "-" : "+"}${fmt(Math.abs(privateAssetGapTotal))}원`} tone={privateAssetGapMonthly > 0 ? C.rose : C.teal} sub={`월 ${privateAssetGapMonthly > 0 ? "-" : "+"}${fmt(Math.abs(privateAssetGapMonthly))}원`} />
            <Metric label="지금부터 필요 월 저축" value={monthlySavingNeeded > 0 ? `${fmt(monthlySavingNeeded)}원` : "여유 있음"} tone={monthlySavingNeeded > 0 ? C.rose : C.teal} sub={`은퇴까지 ${yearsToRetire}년 기준`} />
          </div>

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, padding: 20, background: "#fff" }}>
            <p style={{ margin: "0 0 14px", color: C.navy, fontSize: 16, fontWeight: 950 }}>준비해야 할 방향</p>
            <div style={{ display: "grid", gap: 10 }}>
              {([
                {
                  n: "1",
                  title: "국민연금 수령액 정확히 파악",
                  body: `예상 월 ${fmt(nationalPension)}원 — 국민연금공단 앱(내 곁에 국민연금)으로 실제 예상액 조회 권장`,
                  color: C.blue,
                },
                {
                  n: "2",
                  title: "퇴직연금 관리 전략 확인",
                  body: `DB형은 근속 유지, DC형·IRP는 수익률 관리가 핵심. 현재 ${state.pensionType.toUpperCase()} 기준 월 ${fmt(selectedRetirementMonthly)}원 예상`,
                  color: C.teal,
                },
                {
                  n: "3",
                  title: `개인연금 월 ${fmt(Math.max(privateAssetGapMonthly, 0))}원 추가 준비`,
                  body: monthlySavingNeeded > 0
                    ? `은퇴(${state.retireAge}세)까지 ${yearsToRetire}년 동안 월 ${fmt(monthlySavingNeeded)}원씩 개인연금·저축으로 준비하면 부족분을 채울 수 있습니다.`
                    : `현재 준비 기준으로 월 ${fmt(Math.abs(monthlyGap))}원 여유. 의료비·간병비 변수만 추가로 점검하세요.`,
                  color: monthlySavingNeeded > 0 ? C.rose : C.teal,
                },
                {
                  n: "4",
                  title: "물가상승·의료비 별도 대비",
                  body: `화폐가치 하락(연 3% 기준 ${state.lifeAge - state.retireAge}년 후 구매력 약 ${inflationLoss}% 감소)과 장기요양 비용을 별도 보험으로 준비 필요`,
                  color: C.gold,
                },
              ] as const).map((item) => (
                <div key={item.n} style={{ display: "flex", gap: 14, padding: "14px 16px", background: C.slateLight, borderRadius: 14, borderLeft: `4px solid ${item.color}` }}>
                  <span style={{ minWidth: 28, height: 28, borderRadius: "50%", background: item.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 950, flexShrink: 0 }}>{item.n}</span>
                  <div>
                    <p style={{ margin: "0 0 4px", color: C.navy, fontSize: 14, fontWeight: 950 }}>{item.title}</p>
                    <p style={{ margin: 0, color: C.slate, fontSize: 12, fontWeight: 700, lineHeight: 1.6 }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(2)} style={{ flex: 1, border: `1px solid ${C.border}`, background: "#fff", color: C.slate, borderRadius: 14, padding: "13px 0", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
              ← 이전
            </button>
            <button onClick={copySummary} style={{ flex: 2, border: "none", background: C.navy, color: C.gold, borderRadius: 14, padding: "13px 0", fontSize: 13, fontWeight: 950, cursor: "pointer" }}>
              {copied ? "복사 완료 ✓" : "상담자료 복사"}
            </button>
          </div>
        </div>
      )}

      {imageLevel && (
        <div
          onClick={() => setImageLevelId(null)}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,30,53,0.68)", padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(1120px, 96vw)", maxHeight: "92vh", background: "#fff", borderRadius: 22, overflow: "hidden", boxShadow: "0 28px 80px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <p style={{ margin: 0, color: C.blue, fontSize: 11, fontWeight: 950, letterSpacing: "0.8px" }}>노후 생활 예시</p>
                <h3 style={{ margin: "4px 0 0", color: C.navy, fontSize: 20, fontWeight: 950 }}>{imageLevel.title}</h3>
              </div>
              <button onClick={() => setImageLevelId(null)} style={{ border: `1px solid ${C.border}`, background: "#fff", color: C.slate, width: 38, height: 38, borderRadius: 12, cursor: "pointer", fontSize: 20, fontWeight: 900 }}>×</button>
            </div>
            <div style={{ overflow: "auto", background: C.slateLight, padding: 16, minHeight: 420 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageLevel.image} alt={imageLevel.title} style={{ display: "block", width: "100%", maxHeight: "calc(92vh - 112px)", height: "auto", objectFit: "contain", borderRadius: 14 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function CompareCalc() {
  const [inp, setInp] = useState({ monthly: 500000, years: 5, bankRate: 3.5, insuranceReturn: 124 })
  const [confirmed, setConfirmed] = useState(false)
  const months = inp.years * 12
  const principal = inp.monthly * months
  const r = monthlyRate(inp.bankRate)
  const bankGross = r === 0 ? principal : inp.monthly * ((Math.pow(1 + r, months) - 1) / r)
  const bank = Math.round(principal + (bankGross - principal) * (1 - 0.154))
  const insurance = Math.round(principal * (inp.insuranceReturn / 100))
  return (
    <div>
      <SectionTitle title="보험 vs 은행 저축 비교" desc="보험과 은행은 적금이 아닌 저축이라는 표현으로 안내합니다." />
      <div style={{ display: "grid", gridTemplateColumns: inputGrid(4), gap: 12, background: C.slateLight, borderRadius: 16, padding: 18, marginBottom: 16, overflow: "hidden" }}>
        <MoneyInputRow label="월 납입액" value={inp.monthly} onChange={(v) => setInp({ ...inp, monthly: v })} />
        <InputRow label="저축 기간" value={inp.years} onChange={(v) => setInp({ ...inp, years: v })} unit="년" />
        <InputRow label="은행 저축 이율" value={inp.bankRate} onChange={(v) => setInp({ ...inp, bankRate: v })} unit="%" step={0.1} />
        <InputRow label="보험 환급률" value={inp.insuranceReturn} onChange={(v) => setInp({ ...inp, insuranceReturn: v })} unit="%" />
      </div>
      <button onClick={() => setConfirmed(true)} style={{ width: "100%", border: "none", background: C.navy, color: C.gold, borderRadius: 14, padding: "13px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer", marginBottom: 14 }}>
        계산 확인
      </button>
      <div style={{ display: "grid", gridTemplateColumns: inputGrid(3), gap: 12 }}>
        <Metric label="총 납입원금" value={`${fmt(principal)}원`} tone={C.slate} />
        <Metric label="은행 저축 세후" value={`${fmt(bank)}원`} tone={C.blue} />
        <Metric label="보험 예상 환급" value={`${fmt(insurance)}원`} tone={insurance >= bank ? C.teal : C.rose} sub={`차이 ${insurance >= bank ? "+" : "-"}${fmt(Math.abs(insurance - bank))}원`} />
      </div>
      {confirmed && (
        <ResultHero
          title="상담 포인트"
          tone={insurance >= bank ? C.teal : C.rose}
          body={insurance >= bank ? `현재 조건에서는 보험 저축 예상 환급이 은행 저축보다 ${fmt(insurance - bank)}원 높게 보입니다.` : `현재 조건에서는 은행 저축 세후 금액이 보험 예상 환급보다 ${fmt(bank - insurance)}원 높게 보입니다.`}
        />
      )}

      {/* 인포그래픽: 연도별 누적 비교 */}
      <div style={{ marginTop: 20, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20, background: "#fff" }}>
        <p style={{ margin: "0 0 4px", color: C.navy, fontSize: 15, fontWeight: 950 }}>연도별 누적 비교</p>
        <p style={{ margin: "0 0 16px", color: C.muted, fontSize: 12, fontWeight: 700 }}>동일 납입 조건에서 은행(세후)과 보험 환급 예상액의 연도별 차이</p>
        {Array.from({ length: Math.min(inp.years, 10) }, (_, i) => {
          const yr = i + 1
          const m = yr * 12
          const rr = monthlyRate(inp.bankRate)
          const bGross = rr === 0 ? inp.monthly * m : inp.monthly * ((Math.pow(1 + rr, m) - 1) / rr)
          const bVal = Math.round(inp.monthly * m + (bGross - inp.monthly * m) * (1 - 0.154))
          const insVal = Math.round(inp.monthly * m * (inp.insuranceReturn / 100))
          const maxVal = Math.max(bVal, insVal, 1)
          const isBetter = insVal >= bVal
          return (
            <div key={yr} style={{ display: "grid", gridTemplateColumns: "36px minmax(0,1fr) minmax(0,1fr)", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: C.slate, fontSize: 11, fontWeight: 950, textAlign: "right" }}>{yr}년</span>
              <div>
                <div style={{ height: 10, borderRadius: 999, background: "#E8EDF4", overflow: "hidden", marginBottom: 2 }}>
                  <div style={{ width: `${(bVal / maxVal) * 100}%`, height: "100%", background: C.blue, borderRadius: 999 }} />
                </div>
                <span style={{ color: C.blue, fontSize: 10, fontWeight: 800 }}>은행 {fmtM(bVal)}원</span>
              </div>
              <div>
                <div style={{ height: 10, borderRadius: 999, background: "#E8EDF4", overflow: "hidden", marginBottom: 2 }}>
                  <div style={{ width: `${(insVal / maxVal) * 100}%`, height: "100%", background: isBetter ? C.teal : C.rose, borderRadius: 999 }} />
                </div>
                <span style={{ color: isBetter ? C.teal : C.rose, fontSize: 10, fontWeight: 800 }}>보험 {fmtM(insVal)}원</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 인포그래픽: 은행 금리의 함정 */}
      <div style={{ marginTop: 14, background: C.goldLight, border: `1px solid ${C.gold}55`, borderRadius: 18, padding: 20 }}>
        <p style={{ margin: "0 0 14px", color: C.navy, fontSize: 15, fontWeight: 950 }}>은행 금리의 함정</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 14 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", color: C.muted, fontSize: 11, fontWeight: 800 }}>명목 금리</p>
            <p style={{ margin: 0, color: C.navy, fontSize: 20, fontWeight: 950 }}>{inp.bankRate}%</p>
          </div>
          <span style={{ color: C.rose, fontSize: 18, fontWeight: 950 }}>−</span>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", color: C.muted, fontSize: 11, fontWeight: 800 }}>이자소득세 15.4%</p>
            <p style={{ margin: 0, color: C.rose, fontSize: 20, fontWeight: 950 }}>{(inp.bankRate * 0.154).toFixed(2)}%</p>
          </div>
          <span style={{ color: C.teal, fontSize: 18, fontWeight: 950 }}>=</span>
          <div style={{ background: C.navy, borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 800 }}>실제 수익률</p>
            <p style={{ margin: 0, color: C.gold, fontSize: 20, fontWeight: 950 }}>{(inp.bankRate * (1 - 0.154)).toFixed(2)}%</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ margin: "0 0 4px", color: C.muted, fontSize: 11, fontWeight: 800 }}>물가상승률(연 3%) 반영 시 실질 수익률</p>
            <p style={{ margin: 0, color: (inp.bankRate * (1 - 0.154) - 3) >= 0 ? C.teal : C.rose, fontSize: 17, fontWeight: 950 }}>
              {(inp.bankRate * (1 - 0.154) - 3).toFixed(2)}%
            </p>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ margin: "0 0 4px", color: C.muted, fontSize: 11, fontWeight: 800 }}>보험 납입원금 대비 환급률</p>
            <p style={{ margin: 0, color: C.navy, fontSize: 17, fontWeight: 950 }}>{inp.insuranceReturn}%</p>
          </div>
        </div>
        <p style={{ margin: "12px 0 0", color: C.slate, fontSize: 12, fontWeight: 700, lineHeight: 1.65 }}>
          은행 이자에는 이자소득세 15.4%가 공제되며, 물가상승률(연 3%)을 적용하면 실질 수익률은 <strong>{(inp.bankRate * (1 - 0.154) - 3).toFixed(2)}%</strong>에 불과합니다. 비과세·분리과세 혜택이 있는 보험 저축과 비교할 때 이 세금 차이를 반드시 안내하세요.
        </p>
      </div>
    </div>
  )
}

function InflationCalc() {
  const [inp, setInp] = useState({ amount: 100000000, years: 20, inflation: 3 })
  const [confirmed, setConfirmed] = useState(false)
  const futurePower = Math.round(inp.amount / Math.pow(1 + inp.inflation / 100, inp.years))
  const need = Math.round(inp.amount * Math.pow(1 + inp.inflation / 100, inp.years))
  const lossRate = Math.max(0, Math.min(100, Math.round((1 - futurePower / Math.max(inp.amount, 1)) * 100)))
  return (
    <div>
      <SectionTitle title="화폐가치 하락" desc="물가상승률에 따라 현재 돈의 구매력이 어떻게 바뀌는지 보여줍니다." />
      <div style={{ marginBottom: 16, borderRadius: 18, background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`, color: "#fff", padding: 22, overflow: "hidden" }}>
        <p style={{ margin: 0, color: C.gold, fontSize: 12, fontWeight: 950 }}>현재 돈의 체감 가치</p>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", alignItems: "center", gap: 16, marginTop: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 800 }}>오늘의 {fmt(inp.amount)}원</p>
            <p style={{ margin: "5px 0 0", fontSize: 26, fontWeight: 950 }}>{fmt(inp.amount)}원</p>
          </div>
          <span style={{ color: C.gold, fontSize: 24, fontWeight: 950 }}>→</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 800 }}>{inp.years}년 후 체감 가치</p>
            <p style={{ margin: "5px 0 0", fontSize: 26, fontWeight: 950, color: C.gold }}>{fmt(futurePower)}원</p>
          </div>
        </div>
        <div style={{ marginTop: 16, height: 12, borderRadius: 999, background: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
          <div style={{ width: `${100 - lossRate}%`, height: "100%", borderRadius: 999, background: C.gold }} />
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 800 }}>구매력 약 {lossRate}% 감소 예상</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: inputGrid(3), gap: 12, background: C.slateLight, borderRadius: 16, padding: 18, marginBottom: 16, overflow: "hidden" }}>
        <MoneyInputRow label="현재 금액" value={inp.amount} onChange={(v) => setInp({ ...inp, amount: v })} />
        <InputRow label="기간" value={inp.years} onChange={(v) => setInp({ ...inp, years: v })} unit="년" />
        <InputRow label="물가상승률" value={inp.inflation} onChange={(v) => setInp({ ...inp, inflation: v })} unit="%" step={0.1} />
      </div>
      <button onClick={() => setConfirmed(true)} style={{ width: "100%", border: "none", background: C.navy, color: C.gold, borderRadius: 14, padding: "13px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer", marginBottom: 14 }}>
        계산 확인
      </button>
      <div style={{ display: "grid", gridTemplateColumns: inputGrid(2), gap: 12 }}>
        <Metric label={`${inp.years}년 후 현재 돈의 구매력`} value={`${fmt(futurePower)}원`} tone={C.rose} />
        <Metric label="같은 구매력에 필요한 미래 금액" value={`${fmt(need)}원`} tone={C.blue} />
      </div>
      {confirmed && <ResultHero title="상담 포인트" tone={C.rose} body={`현재 ${fmt(inp.amount)}원의 구매력을 유지하려면 ${inp.years}년 후 약 ${fmt(need)}원이 필요합니다.`} />}
    </div>
  )
}

function CompoundCalc({ age }: { age: number }) {
  const [mode, setMode] = useState<CompoundMode>("single")
  const [inp, setInp] = useState({ currentAge: age, principal: 50000000, monthly: 500000, saveYears: 10, startAge: 65, rate: 5 })
  const [confirmed, setConfirmed] = useState(false)
  const saveMonths = inp.saveYears * 12
  const holdYears = mode === "single" ? Math.max(inp.startAge - inp.currentAge, 0) : Math.max(inp.startAge - inp.currentAge - inp.saveYears, 0)
  const rule72 = inp.rate > 0 ? Math.round((72 / inp.rate) * 10) / 10 : 0
  const saved = mode === "single"
    ? inp.principal
    : futureValueMonthly(inp.monthly, inp.rate, saveMonths)
  const final = Math.round(saved * Math.pow(1 + inp.rate / 100, holdYears))
  const totalYears = mode === "single" ? holdYears : inp.saveYears + holdYears
  const simpleFinal = Math.round(mode === "single"
    ? inp.principal * (1 + (inp.rate / 100) * totalYears)
    : Array.from({ length: saveMonths }).reduce<number>((sum, _, index) => {
      const remainingMonths = Math.max(totalYears * 12 - index, 0)
      return sum + inp.monthly * (1 + (inp.rate / 100) * (remainingMonths / 12))
    }, 0)
  )
  const principalTotal = mode === "single" ? inp.principal : inp.monthly * saveMonths
  const barMax = Math.max(final, simpleFinal, principalTotal, 1)
  return (
    <div>
      <SectionTitle title="복리 계산" desc="현재 나이와 개시시점을 넣으면 일시납은 거치기간만, 월적립식은 저축기간 이후 거치기간까지 계산합니다." />
      <MiniTabs value={mode} onChange={setMode} options={[{ id: "single", label: "일시납" }, { id: "monthly", label: "월적립식" }]} />
      <div style={{ display: "grid", gridTemplateColumns: mode === "single" ? inputGrid(4) : inputGrid(5), gap: 12, background: C.slateLight, borderRadius: 16, padding: 18, margin: "16px 0", overflow: "hidden" }}>
        <InputRow label="현재 나이" value={inp.currentAge} onChange={(v) => setInp({ ...inp, currentAge: v })} unit="세" />
        {mode === "single" ? (
          <MoneyInputRow label="일시납 원금" value={inp.principal} onChange={(v) => setInp({ ...inp, principal: v })} />
        ) : (
          <>
            <MoneyInputRow label="월 적립액" value={inp.monthly} onChange={(v) => setInp({ ...inp, monthly: v })} />
            <InputRow label="저축기간" value={inp.saveYears} onChange={(v) => setInp({ ...inp, saveYears: v })} unit="년" />
          </>
        )}
        <InputRow label="개시시점 나이" value={inp.startAge} onChange={(v) => setInp({ ...inp, startAge: v })} unit="세" hint={mode === "single" ? `거치 ${holdYears}년` : `저축 후 거치 ${holdYears}년`} />
        <InputRow label="연 수익률" value={inp.rate} onChange={(v) => setInp({ ...inp, rate: v })} unit="%" step={0.1} />
      </div>
      <button onClick={() => setConfirmed(true)} style={{ width: "100%", border: "none", background: C.navy, color: C.gold, borderRadius: 14, padding: "13px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer", marginBottom: 14 }}>
        계산 확인
      </button>
      <div style={{ display: "grid", gridTemplateColumns: inputGrid(3), gap: 12 }}>
        <Metric label={mode === "single" ? "일시납 원금" : "저축 종료 시점 금액"} value={`${fmt(saved)}원`} tone={C.blue} />
        <Metric label={mode === "single" ? "거치기간" : "저축 후 거치기간"} value={`${fmt(holdYears)}년`} tone={C.gold} />
        <Metric label="최종 예상 금액" value={`${fmt(final)}원`} tone={C.teal} />
      </div>
      <div style={{ marginTop: 16, borderRadius: 16, background: C.slateLight, padding: 18, minWidth: 0 }}>
        <p style={{ margin: "0 0 12px", color: C.slate, fontSize: 12, fontWeight: 950 }}>단리 vs 복리 가로 비교</p>
        <BarCompare label="원금" value={principalTotal} max={barMax} color={C.slate} />
        <BarCompare label="단리" value={simpleFinal} max={barMax} color={C.blue} />
        <BarCompare label="복리" value={final} max={barMax} color={C.teal} />
        <p style={{ margin: "10px 0 0", color: C.muted, fontSize: 11, fontWeight: 800 }}>차이: 복리가 단리보다 {fmt(Math.max(final - simpleFinal, 0))}원 높게 예상됩니다.</p>
      </div>
      {confirmed && <ResultHero title="상담 포인트" tone={C.teal} body={mode === "single" ? `현재 ${inp.currentAge}세에 일시납 후 ${inp.startAge}세 개시까지 ${holdYears}년 거치하면 최종 예상 금액은 약 ${fmt(final)}원입니다.` : `현재 ${inp.currentAge}세부터 ${inp.saveYears}년 저축하고 ${inp.startAge}세 개시까지 ${holdYears}년 거치하면 최종 예상 금액은 약 ${fmt(final)}원입니다.`} />}

      {/* 72의 법칙 전용 섹션 */}
      <div style={{ marginTop: 20, border: `1px solid ${C.gold}55`, borderRadius: 18, padding: 20, background: C.goldLight }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontSize: 18, fontWeight: 950 }}>72</span>
          </div>
          <div>
            <p style={{ margin: 0, color: C.navy, fontSize: 16, fontWeight: 950 }}>72의 법칙</p>
            <p style={{ margin: "3px 0 0", color: C.slate, fontSize: 12, fontWeight: 700 }}>72 ÷ 연 수익률 = 원금이 2배가 되는 기간 (빠른 암산 도구)</p>
          </div>
          <div style={{ marginLeft: "auto", background: C.navy, borderRadius: 14, padding: "10px 18px", textAlign: "center" }}>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 800 }}>현재 {inp.rate}% 기준</p>
            <p style={{ margin: "3px 0 0", color: C.gold, fontSize: 22, fontWeight: 950 }}>{rule72 ? `약 ${rule72}년` : "-"}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 8, marginBottom: 14 }}>
          {[2, 3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 24].map((rate) => {
            const yrs = Math.round((72 / rate) * 10) / 10
            const isActive = rate === inp.rate
            return (
              <button key={rate} onClick={() => setInp({ ...inp, rate })} style={{
                border: `2px solid ${isActive ? C.navy : C.gold + "44"}`,
                borderRadius: 12, background: isActive ? C.navy : "#fff",
                padding: "10px 6px", cursor: "pointer", textAlign: "center",
              }}>
                <p style={{ margin: 0, color: isActive ? C.gold : C.navy, fontSize: 13, fontWeight: 950 }}>{rate}%</p>
                <p style={{ margin: "4px 0 0", color: isActive ? "rgba(255,255,255,0.8)" : C.slate, fontSize: 11, fontWeight: 800 }}>{yrs}년</p>
              </button>
            )
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ margin: "0 0 4px", color: C.muted, fontSize: 11, fontWeight: 800 }}>은행 예금 3.5% 기준 2배</p>
            <p style={{ margin: 0, color: C.blue, fontSize: 16, fontWeight: 950 }}>약 {Math.round((72 / 3.5) * 10) / 10}년</p>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ margin: "0 0 4px", color: C.muted, fontSize: 11, fontWeight: 800 }}>보험 5% 수익률 기준 2배</p>
            <p style={{ margin: 0, color: C.teal, fontSize: 16, fontWeight: 950 }}>약 {Math.round((72 / 5) * 10) / 10}년</p>
          </div>
        </div>
        <p style={{ margin: "12px 0 0", color: C.slate, fontSize: 12, fontWeight: 700, lineHeight: 1.6 }}>
          위 표에서 금리를 클릭하면 계산기 수익률에 바로 적용됩니다. 고객에게 "지금 은행에 넣으면 2배가 되려면 {Math.round((72 / 3.5) * 10) / 10}년, 보험(5%)은 {Math.round((72 / 5) * 10) / 10}년"이라고 직관적으로 설명하세요.
        </p>
      </div>
    </div>
  )
}

function VariableCalc() {
  const [inp, setInp] = useState({ lump: 6000000, monthly: 1000000, months: 6 })
  const [confirmed, setConfirmed] = useState(false)
  const [view, setView] = useState<"table" | "graph">("graph")
  const months = Math.max(1, Math.min(Math.round(inp.months), 36))
  const prices = Array.from({ length: months }, (_, index) => dcaPriceAt(index))
  const endPrice = prices[prices.length - 1]
  const lumpQty = inp.lump / prices[0]
  const lumpValue = Math.round(lumpQty * endPrice)
  const monthlyQty = prices.reduce((sum, price) => sum + inp.monthly / price, 0)
  const monthlyPrincipal = inp.monthly * prices.length
  const monthlyValue = Math.round(monthlyQty * endPrice)
  const maxValue = Math.max(lumpValue, monthlyValue, inp.lump, monthlyPrincipal, 1)
  return (
    <div>
      <SectionTitle title="코스트 애버리지 비교" desc="주가 상승·하락 상황에서 일시납과 월적립식 투자를 비교합니다." />
      <div style={{ display: "grid", gridTemplateColumns: inputGrid(3), gap: 12, background: C.slateLight, borderRadius: 16, padding: 18, marginBottom: 16, overflow: "hidden" }}>
        <MoneyInputRow label="일시납 투자금" value={inp.lump} onChange={(v) => setInp({ ...inp, lump: v })} />
        <MoneyInputRow label="월적립 투자금" value={inp.monthly} onChange={(v) => setInp({ ...inp, monthly: v })} />
        <InputRow label="비교 기간" value={inp.months} onChange={(v) => setInp({ ...inp, months: v })} unit="개월" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,0.8fr) minmax(0,1.2fr)", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <button onClick={() => setConfirmed(true)} style={{ border: "none", background: C.navy, color: C.gold, borderRadius: 14, padding: "13px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer" }}>
          계산 확인
        </button>
        <MiniTabs value={view} onChange={setView} options={[{ id: "graph", label: "비교 그래프 예시" }, { id: "table", label: "상세표" }]} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: inputGrid(2), gap: 12, marginBottom: 16 }}>
        <Metric label="일시납 평가금액" value={`${fmt(lumpValue)}원`} tone={lumpValue >= inp.lump ? C.teal : C.rose} sub={`수익 ${fmt(lumpValue - inp.lump)}원`} />
        <Metric label="월적립식 평가금액" value={`${fmt(monthlyValue)}원`} tone={monthlyValue >= monthlyPrincipal ? C.teal : C.rose} sub={`수익 ${fmt(monthlyValue - monthlyPrincipal)}원`} />
      </div>
      {confirmed && (
        <ResultHero
          title="상담 포인트"
          tone={monthlyValue >= lumpValue ? C.teal : C.blue}
          body={monthlyValue >= lumpValue ? `이 변동 구간에서는 월적립식이 일시납보다 ${fmt(monthlyValue - lumpValue)}원 높게 평가됩니다.` : `이 변동 구간에서는 일시납이 월적립식보다 ${fmt(lumpValue - monthlyValue)}원 높게 평가됩니다.`}
        />
      )}
      {view === "graph" ? (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, background: C.slateLight, padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,0.9fr) minmax(0,1.1fr)", gap: 16, alignItems: "stretch" }}>
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
              <p style={{ margin: "0 0 12px", color: C.slate, fontSize: 12, fontWeight: 950 }}>일시납 vs 월적립식 평가금액</p>
              <BarCompare label="일시납" value={lumpValue} max={maxValue} color={C.blue} />
              <BarCompare label="월적립" value={monthlyValue} max={maxValue} color={C.teal} />
              <BarCompare label="월적립 원금" value={monthlyPrincipal} max={maxValue} color={C.gold} />
              <p style={{ margin: "12px 0 0", color: C.muted, fontSize: 12, fontWeight: 800, lineHeight: 1.55 }}>
                가격이 흔들릴수록 월적립식은 낮은 가격 구간에서 더 많은 수량을 모으는 효과를 보여줍니다.
              </p>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, minWidth: 0 }}>
              <p style={{ margin: "0 0 12px", color: C.slate, fontSize: 12, fontWeight: 950 }}>기간별 가격 흐름 예시</p>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${prices.length}, minmax(26px,1fr))`, gap: 7, alignItems: "end", height: 210, overflowX: "auto" }}>
                {prices.map((price, index) => {
                  const h = Math.max(34, (price / Math.max(...prices)) * 164)
                  const isLow = price < prices[0]
                  return (
                    <div key={index} style={{ display: "grid", gap: 7, alignItems: "end", textAlign: "center", minWidth: 26 }}>
                      <div title={`${index + 1}개월 ${fmt(price)}원`} style={{ height: h, borderRadius: "12px 12px 5px 5px", background: isLow ? C.teal : C.blue, opacity: 0.92, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 7, color: "#fff", fontSize: 10, fontWeight: 950, writingMode: h < 70 ? "vertical-rl" : "horizontal-tb", textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}>
                        {fmt(price)}
                      </div>
                      <span style={{ color: C.text, fontSize: 11, fontWeight: 900 }}>{index + 1}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.navy, color: "#fff" }}>
                <th style={{ padding: "10px 12px", fontWeight: 900, textAlign: "center" }}>월차</th>
                <th style={{ padding: "10px 12px", fontWeight: 900, textAlign: "right" }}>시뮬가격</th>
                <th style={{ padding: "10px 12px", fontWeight: 900, textAlign: "right" }}>일시불 매수량</th>
                <th style={{ padding: "10px 12px", fontWeight: 900, textAlign: "right" }}>적립식 매수량</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((price, index) => (
                <tr key={index} style={{ borderBottom: `1px solid ${C.border}`, background: index % 2 === 0 ? "#fff" : C.slateLight }}>
                  <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 800, color: C.slate }}>{index + 1}월차</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: C.text }}>{fmt(price)}원</td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: C.blue, fontWeight: 700 }}>
                    {(inp.lump / prices[0]).toFixed(4)}주
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right", color: C.teal, fontWeight: 700 }}>
                    {(inp.monthly / price).toFixed(4)}주
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── 노란우산공제 세금 계산 헬퍼 (2025년 기준) ─────────────────────────────
const NOR_TAX_BRACKETS: { limit: number; rate: number; deduction: number }[] = [
  { limit: 14_000_000,     rate: 0.06, deduction: 0 },
  { limit: 50_000_000,     rate: 0.15, deduction: 1_260_000 },
  { limit: 88_000_000,     rate: 0.24, deduction: 5_760_000 },
  { limit: 150_000_000,    rate: 0.35, deduction: 15_440_000 },
  { limit: 300_000_000,    rate: 0.38, deduction: 19_940_000 },
  { limit: 500_000_000,    rate: 0.40, deduction: 25_940_000 },
  { limit: 1_000_000_000,  rate: 0.42, deduction: 35_940_000 },
  { limit: Infinity,       rate: 0.45, deduction: 65_940_000 },
]
function norCalcTax(won: number): number {
  if (won <= 0) return 0
  for (const b of NOR_TAX_BRACKETS) {
    if (won <= b.limit) return Math.max(0, Math.round(won * b.rate - b.deduction))
  }
  return 0
}
function norGetLimit(businessWon: number): number { // 원 반환
  if (businessWon <= 40_000_000)  return 6_000_000
  if (businessWon <= 60_000_000)  return 5_000_000
  if (businessWon <= 100_000_000) return 4_000_000
  return 2_000_000
}
function norRateLabel(won: number): string {
  if (won <= 14_000_000)  return '6%'
  if (won <= 50_000_000)  return '주로 15%'
  if (won <= 88_000_000)  return '24%'
  if (won <= 150_000_000) return '35%'
  if (won <= 300_000_000) return '38%'
  if (won <= 500_000_000) return '40%'
  if (won <= 1_000_000_000) return '42%'
  return '45%'
}
function norTaxSaving(taxableWon: number, deductWon: number): { income: number; local: number; total: number } {
  const before = norCalcTax(taxableWon)
  const after  = norCalcTax(Math.max(0, taxableWon - deductWon))
  const income = Math.max(0, before - after)
  const local  = Math.round(income * 0.1)
  return { income, local, total: income + local }
}
function norFmtMan(won: number): string {
  const man = Math.round(won / 10_000)
  if (man === 0) return '0원'
  if (man >= 10_000) {
    const eok = Math.floor(man / 10_000)
    const rem  = man % 10_000
    return rem === 0 ? `${eok}억원` : `${eok}억 ${rem.toLocaleString()}만원`
  }
  return `${man.toLocaleString()}만원`
}

// ── 노란우산공제 절세 계산기 컴포넌트 ─────────────────────────────────────
function NoranwooCalc() {
  // 상태: 내부적으로 만원 단위 (MoneyInputRow는 원 단위 받음)
  const [revenueMan,  setRevenueMan]  = useState(35000) // 연매출 (만원)
  const [profitRate,  setProfitRate]  = useState(15)    // 순이익률 (%)
  const [incomeMan,   setIncomeMan]   = useState(0)     // 사업소득 직접입력 (0=자동)
  const [taxableMan,  setTaxableMan]  = useState(0)     // 과세표준 (0=시나리오모드)
  const [monthlyMan,  setMonthlyMan]  = useState(0)     // 현재 월납부 (0=미입력)

  const autoIncMan   = Math.round(revenueMan * profitRate / 100)
  const actualIncMan = incomeMan > 0 ? incomeMan : autoIncMan
  const actualIncWon = actualIncMan * 10_000

  const limitWon     = norGetLimit(actualIncWon)
  const limitMan     = Math.round(limitWon / 10_000)
  const optMonthly   = Math.round(limitMan / 12)

  const isExact      = taxableMan > 0
  const taxableWon   = isExact ? taxableMan * 10_000 : actualIncWon
  const maxSaving    = norTaxSaving(taxableWon, limitWon)

  // 현재 납부 분석
  const curYearlyMan = monthlyMan * 12
  const effDeductMan = Math.min(curYearlyMan, limitMan)
  const overPayMan   = Math.max(0, curYearlyMan - limitMan)
  const curSaving    = monthlyMan > 0 ? norTaxSaving(taxableWon, effDeductMan * 10_000) : null

  // 시나리오 (과세표준 미입력 시)
  const PROFIT_RATES = [10, 15, 20, 30]
  const scenarios = PROFIT_RATES.map(rate => {
    const bizMan  = Math.round(revenueMan * rate / 100)
    const bizWon  = bizMan * 10_000
    const limWon  = norGetLimit(bizWon)
    const limMan  = Math.round(limWon / 10_000)
    const optMon  = Math.round(limMan / 12)
    const saving  = norTaxSaving(bizWon, limWon)
    const rateLabel = norRateLabel(bizWon)
    const curSav  = monthlyMan > 0
      ? norTaxSaving(bizWon, Math.min(monthlyMan * 12, limMan) * 10_000)
      : null
    const overpay = monthlyMan > 0 ? Math.max(0, monthlyMan * 12 - limMan) : 0
    return { rate, bizMan, limMan, optMon, saving, rateLabel, curSav, overpay }
  })

  return (
    <div>
      <SectionTitle title="노란우산공제 절세 계산기" desc="2025년 납입분 기준 — 사업소득공제 한도, 최대 절세효과, 과납 여부를 확인합니다." />

      {/* ── 입력 영역 ── */}
      <div style={{ background: C.slateLight, borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <p style={{ margin: '0 0 12px', color: C.slate, fontSize: 12, fontWeight: 900, letterSpacing: '0.3px' }}>기본 정보 입력</p>
        <div style={{ display: 'grid', gridTemplateColumns: inputGrid(3), gap: 12, marginBottom: 12 }}>
          <MoneyInputRow
            label="연 매출액"
            value={revenueMan * 10_000}
            onChange={v => setRevenueMan(Math.max(1, Math.round(v / 10_000)))}
          />
          <InputRow
            label="순이익률 (예상)"
            value={profitRate}
            onChange={setProfitRate}
            unit="%"
            hint={`→ 사업소득 약 ${autoIncMan.toLocaleString()}만원`}
          />
          <MoneyInputRow
            label="사업소득금액 (직접입력 시 우선)"
            value={incomeMan * 10_000}
            onChange={v => setIncomeMan(Math.round(v / 10_000))}
            hint={incomeMan > 0 ? `직접입력: ${incomeMan.toLocaleString()}만원` : '비워두면 순이익률 자동계산'}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: inputGrid(2), gap: 12 }}>
          <div>
            <MoneyInputRow
              label="과세표준 (알면 정확계산, 모르면 비워두기)"
              value={taxableMan * 10_000}
              onChange={v => setTaxableMan(Math.round(v / 10_000))}
              hint={isExact ? `정확계산 모드 (${taxableMan.toLocaleString()}만원)` : '미입력 시 → 순이익률별 시나리오 비교'}
            />
          </div>
          <MoneyInputRow
            label="현재 월 납부액 (과납 진단용)"
            value={monthlyMan * 10_000}
            onChange={v => setMonthlyMan(Math.round(v / 10_000))}
            hint={monthlyMan > 0 ? `연 ${(monthlyMan * 12).toLocaleString()}만원 납부 중` : '비워두면 과납 진단 생략'}
          />
        </div>
      </div>

      {/* ── 핵심 지표 카드 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: inputGrid(isExact ? 4 : 3), gap: 10, marginBottom: 14 }}>
        <Metric
          label="소득공제 한도 (연)"
          value={`${limitMan.toLocaleString()}만원`}
          tone={C.navy}
          sub={`사업소득 ${actualIncMan.toLocaleString()}만원 기준`}
        />
        <Metric
          label="권장 월 납부액"
          value={`월 ${optMonthly.toLocaleString()}만원`}
          tone={C.blue}
          sub={`연 ${limitMan.toLocaleString()}만원 한도 기준`}
        />
        {isExact ? (
          <>
            <Metric
              label="최대 소득세 절감"
              value={norFmtMan(maxSaving.income)}
              tone={C.teal}
              sub={`과세표준 적용세율: ${norRateLabel(taxableWon)}`}
            />
            <Metric
              label="지방소득세 포함 총 절세"
              value={norFmtMan(maxSaving.total)}
              tone={C.gold}
              sub={`소득세 ${norFmtMan(maxSaving.income)} + 지방세 ${norFmtMan(maxSaving.local)}`}
            />
          </>
        ) : (
          <Metric
            label="현재 사업소득 예상세율"
            value={norRateLabel(actualIncWon)}
            tone={C.teal}
            sub={`사업소득 ${actualIncMan.toLocaleString()}만원 기준 (단순추정)`}
          />
        )}
      </div>

      {/* ── 과납 진단 배너 ── */}
      {monthlyMan > 0 && isExact && (
        overPayMan > 0 ? (
          <div style={{ background: '#FFF5F5', border: '1.5px solid #FC8181', borderRadius: 14, padding: '13px 16px', marginBottom: 14 }}>
            <p style={{ margin: '0 0 5px', color: '#C53030', fontSize: 13, fontWeight: 900 }}>
              ⚠️ 월 {Math.round(overPayMan / 12).toLocaleString()}만원 과납 — 연 {overPayMan.toLocaleString()}만원은 소득공제 없이 적립만 됩니다
            </p>
            <p style={{ margin: '0 0 4px', color: '#742A2A', fontSize: 12, fontWeight: 700 }}>
              현재 납부 연 {curYearlyMan.toLocaleString()}만원 중 공제가능 {effDeductMan.toLocaleString()}만원 / 공제불가 {overPayMan.toLocaleString()}만원
            </p>
            <p style={{ margin: 0, color: '#742A2A', fontSize: 11, fontWeight: 700 }}>
              실제 절세효과: {curSaving ? norFmtMan(curSaving.total) : '-'} → 권장납부(월 {optMonthly}만원) 시 동일 절세 {norFmtMan(maxSaving.total)} 달성 가능
            </p>
          </div>
        ) : (
          <div style={{ background: '#F0FFF4', border: '1.5px solid #68D391', borderRadius: 14, padding: '11px 16px', marginBottom: 14 }}>
            <p style={{ margin: 0, color: '#276749', fontSize: 12, fontWeight: 900 }}>
              ✅ 현재 월 {monthlyMan.toLocaleString()}만원은 한도 이내 — 과납 없음.
              {curSaving && ` 실제 절세효과: ${norFmtMan(curSaving.total)} / 한도까지 월 ${Math.max(0, optMonthly - monthlyMan).toLocaleString()}만원 추가 가능`}
            </p>
          </div>
        )
      )}

      {/* ── 정확계산 결과 ── */}
      {isExact && (
        <ResultHero
          title={`과세표준 ${taxableMan.toLocaleString()}만원 기준 — 정확 절세 계산`}
          tone={C.teal}
          body={
            `공제 전 과세표준 ${taxableMan.toLocaleString()}만원 → 공제 후 ${Math.max(0, taxableMan - limitMan).toLocaleString()}만원 ` +
            `| 소득세 절감 ${norFmtMan(maxSaving.income)} + 지방소득세 ${norFmtMan(maxSaving.local)} = 총 절세 ${norFmtMan(maxSaving.total)}`
          }
        />
      )}

      {/* ── 시나리오 비교 테이블 (과세표준 미입력 시) ── */}
      {!isExact && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginTop: 4 }}>
          <div style={{ background: C.navy, padding: '11px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, color: C.gold, fontSize: 12, fontWeight: 900 }}>
              📊 연매출 {revenueMan.toLocaleString()}만원 — 순이익률별 시나리오 비교 (2025년 기준)
            </p>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700 }}>
              과세표준 입력 시 정확한 계산 가능
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F7F8FA', borderBottom: `2px solid ${C.border}` }}>
                  {[
                    { label: '순이익률', align: 'center' },
                    { label: '예상 사업소득', align: 'center' },
                    { label: '공제한도(연)', align: 'center' },
                    { label: '월 적정납부', align: 'center' },
                    { label: '예상세율 구간', align: 'center' },
                    { label: '최대 절세효과', align: 'center' },
                    ...(monthlyMan > 0 ? [{ label: `현재 월${monthlyMan}만원 납부 시`, align: 'center' }] : []),
                  ].map(h => (
                    <th key={h.label} style={{ padding: '10px 14px', fontWeight: 900, color: C.navy, fontSize: 12, textAlign: h.align as 'center', whiteSpace: 'nowrap' }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s, i) => {
                  const isOver = monthlyMan > 0 && s.overpay > 0
                  return (
                    <tr key={s.rate} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : '#F9FAFC' }}>
                      <td style={{ padding: '13px 16px', fontWeight: 900, color: C.blue, textAlign: 'center', fontSize: 16 }}>
                        {s.rate}%
                      </td>
                      <td style={{ padding: '13px 14px', fontWeight: 800, color: C.text, textAlign: 'center' }}>
                        약 {s.bizMan.toLocaleString()}만원
                      </td>
                      <td style={{ padding: '13px 14px', fontWeight: 900, color: C.teal, textAlign: 'center', fontSize: 15 }}>
                        {s.limMan.toLocaleString()}만원
                      </td>
                      <td style={{ padding: '13px 14px', fontWeight: 900, color: C.navy, textAlign: 'center', fontSize: 15 }}>
                        월 {s.optMon.toLocaleString()}만원
                        <span style={{ display: 'block', fontSize: 10, color: C.muted, fontWeight: 700 }}>연 {s.limMan.toLocaleString()}만원</span>
                      </td>
                      <td style={{ padding: '13px 14px', textAlign: 'center' }}>
                        <span style={{ background: C.blueLight, color: C.blue, fontSize: 12, fontWeight: 900, padding: '3px 10px', borderRadius: 99 }}>
                          {s.rateLabel}
                        </span>
                      </td>
                      <td style={{ padding: '13px 14px', textAlign: 'center' }}>
                        <span style={{ color: C.gold, fontWeight: 900, fontSize: 15 }}>
                          약 {Math.round(s.saving.total / 10_000).toLocaleString()}만원
                        </span>
                        <span style={{ display: 'block', fontSize: 10, color: C.muted, fontWeight: 700 }}>
                          소득세 {Math.round(s.saving.income / 10_000).toLocaleString()}만 + 지방세 {Math.round(s.saving.local / 10_000).toLocaleString()}만
                        </span>
                      </td>
                      {monthlyMan > 0 && (
                        <td style={{ padding: '13px 14px', textAlign: 'center' }}>
                          {isOver ? (
                            <div>
                              <span style={{ color: '#E53E3E', fontWeight: 900, fontSize: 12, display: 'block' }}>
                                ⚠️ 연 {s.overpay.toLocaleString()}만원 과납
                              </span>
                              <span style={{ color: '#E53E3E', fontSize: 11, fontWeight: 700 }}>
                                실절세 {s.curSav ? Math.round(s.curSav.total / 10_000).toLocaleString() : '-'}만원
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span style={{ color: '#38A169', fontWeight: 900, fontSize: 12, display: 'block' }}>✅ 한도 이내</span>
                              {s.curSav && (
                                <span style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>
                                  절세 {Math.round(s.curSav.total / 10_000).toLocaleString()}만원
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ background: '#FAFBFC', padding: '10px 18px', borderTop: `1px solid ${C.border}` }}>
            <p style={{ margin: 0, color: C.muted, fontSize: 11, fontWeight: 700, lineHeight: 1.65 }}>
              ※ 절세효과 = 소득세 절감 + 지방소득세(소득세의 10%) 합산 / 사업소득금액 ≈ 과세표준 단순 적용 (기본공제 등 개인 공제 미반영)
              <br />※ 정확한 절세액 확인은 위 「과세표준」란에 종합소득세 신고서상 과세표준을 직접 입력하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// PensionCalc v3 — 실제 상품 기반 종합 연금 시뮬레이터
// KDB 예시 반영: 40세남 10년납71만 → 65세 월100만원 (종신)
// ════════════════════════════════════════════════════════════════════

type PPT = 'variable' | 'declared' | 'dollar'   // 상품유형 (달러연금 추가)
type PGender = 'male' | 'female'
type PMode = 'self' | 'child'
type PPayType = '5y' | '10y' | '15y' | '20y' | 'lifetime' | 'inherit'

// 연금개시나이별 기본지급률 (종신, 남/여) — KDB·IBK 실제 데이터 기반
const BASE_ANNUITY_RATES: Record<number, { male: number; female: number }> = {
  55: { male: 3.6, female: 3.1 },
  60: { male: 4.2, female: 3.8 },
  65: { male: 6.0, female: 5.4 },
  70: { male: 7.8, female: 7.2 },
  75: { male: 10.0, female: 9.3 },
  80: { male: 13.0, female: 12.0 },
}

// 달러연금 MetLife 참고 데이터 (2026.04 기준)
const DOLLAR_RATE_DEFAULT = 4.66    // 현재 달러 공시이율 (%)
const DOLLAR_MIN_RATE = 0.7         // 최저보증이율 (5년 초과)
const DOLLAR_EARLY_MULTIPLIER = 3.0 // 조기집중 증배수

// 달러 포맷: $1,234 / 원화 환산도 병행 표시
function fmtUSD(usd: number): string {
  return '$' + Math.round(usd).toLocaleString()
}

// 변액연금 3시나리오 (IBK 기준)
const VAR3 = [
  { key: 'bear', label: '비관형', invest: -1, pure: -4.96, color: '#C0392B', bg: '#FDEDED', note: '원금 손실 시나리오' },
  { key: 'base', label: '기준형', invest: 2.50, pure: -1.46, color: '#1A3052', bg: '#EBF3FB', note: '업계 평균 수준' },
  { key: 'bull', label: '낙관형', invest: 3.75, pure: -0.21, color: '#0E7E6B', bg: '#E3F5F1', note: '장기 목표 수준' },
]

// 세액공제율 (2025 기준)
function taxCreditRate(annualIncome: number): number {
  return annualIncome <= 55_000_000 ? 0.165 : 0.132
}

// 연금소득세율 (수령나이별)
function pensionTaxRate(age: number): number {
  if (age >= 80) return 0.033
  if (age >= 70) return 0.044
  return 0.055
}

function pFV3(net: number, rate: number, months: number): number {
  const r = rate / 100 / 12
  if (months <= 0) return 0
  if (Math.abs(r) < 0.000001) return net * months
  return net * ((Math.pow(1 + r, months) - 1) / r) * (1 + r)
}

function pMon3(res: number, rate: number, months: number): number {
  const r = rate / 100 / 12
  if (months <= 0 || res <= 0) return 0
  if (Math.abs(r) < 0.000001) return res / months
  return res * r / (1 - Math.pow(1 + r, -months))
}

function fmtW3(won: number): string {
  const v = Math.round(won)
  if (v >= 100_000_000) {
    const uk = Math.floor(v / 100_000_000)
    const man = Math.round((v % 100_000_000) / 10_000)
    return man > 0 ? `${uk.toLocaleString()}억 ${man.toLocaleString()}만원` : `${uk.toLocaleString()}억원`
  }
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만원`
  return `${v.toLocaleString()}원`
}

// ── 상속·증여 팝업 ─────────────────────────────────────────────

function InheritanceModal({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 24, maxWidth: 720, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif" }}>
        <div style={{ background: `linear-gradient(135deg, ${C.navy}, #2D4A8A)`, borderRadius: '24px 24px 0 0', padding: '20px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, color: C.gold, fontSize: 11, fontWeight: 900, letterSpacing: '0.8px' }}>연금보험 + 세금 설계</p>
            <p style={{ margin: '3px 0 0', color: '#fff', fontSize: 17, fontWeight: 950 }}>상속세 · 증여세 핵심 가이드</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 20, width: 36, height: 36, cursor: 'pointer', fontWeight: 900 }}>✕</button>
        </div>
        <div style={{ padding: '22px 26px', display: 'grid', gap: 18 }}>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 900, color: C.navy }}>📊 상속세·증여세 세율 (동일 적용)</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: C.navy }}>{['과세표준','세율','누진공제'].map((h,i) => <th key={h} style={{ padding:'9px 14px', color:C.gold, fontWeight:900, textAlign:i===0?'left':'center', fontSize:12, border:'none' }}>{h}</th>)}</tr></thead>
              <tbody>{[['1억원 이하','10%','-'],['5억원 이하','20%','1,000만원'],['10억원 이하','30%','6,000만원'],['30억원 이하','40%','1억 6,000만원'],['30억원 초과','50%','4억 6,000만원']].map((row,i) => (
                <tr key={row[0]} style={{ background: i%2===0?'#fff':'#F7F8FA' }}>
                  <td style={{ padding:'9px 14px', fontWeight:700, color:C.text }}>{row[0]}</td>
                  <td style={{ padding:'9px 14px', textAlign:'center', fontWeight:900, color:['40%','50%'].includes(row[1])?C.rose:C.navy, fontSize:15 }}>{row[1]}</td>
                  <td style={{ padding:'9px 14px', textAlign:'center', fontWeight:700, color:C.muted }}>{row[2]}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ background:'#F0F7FF', borderRadius:14, padding:'14px 16px', border:`1px solid ${C.border}` }}>
              <p style={{ margin:'0 0 10px', fontSize:12, fontWeight:900, color:C.blue }}>🏛️ 상속세 주요 공제</p>
              {[['기초공제','2억원'],['배우자 상속공제','5억~30억원'],['일괄공제','5억원'],['금융재산 공제','순금융재산 20% (최대 2억)'],['동거주택 공제','주택가액 80% (최대 6억)']].map(item => (
                <div key={item[0]} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12 }}>
                  <span style={{ color:C.slate, fontWeight:700 }}>{item[0]}</span>
                  <span style={{ color:C.navy, fontWeight:900 }}>{item[1]}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'#F0FFF4', borderRadius:14, padding:'14px 16px', border:`1px solid ${C.border}` }}>
              <p style={{ margin:'0 0 10px', fontSize:12, fontWeight:900, color:C.teal }}>🎁 증여세 기본공제 (10년 합산)</p>
              {[['배우자','6억원'],['직계존비속 (성인)','5,000만원'],['직계존비속 (미성년)','2,000만원'],['기타 친족','1,000만원']].map(item => (
                <div key={item[0]} style={{ marginBottom:9, fontSize:12 }}>
                  <div style={{ color:C.slate, fontWeight:700, marginBottom:2 }}>{item[0]}</div>
                  <div style={{ color:C.teal, fontWeight:900, fontSize:14 }}>{item[1]}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:C.goldLight, borderRadius:14, padding:'14px 18px', border:`1.5px solid ${C.gold}` }}>
            <p style={{ margin:'0 0 10px', fontSize:13, fontWeight:900, color:'#7B5B00' }}>💡 연금보험과 상속·증여 핵심 포인트</p>
            {['연금보험 사망보험금은 수익자 지정 시 상속재산 제외 → 빠른 수령 가능 (단, 상속세 과세대상 될 수 있음)','자녀를 수익자로 지정 시 10년 단위 증여세 공제 활용 가능 (성인자녀 5,000만원 이내)','계약자=부모·피보험자=자녀·수익자=자녀 구조: 연금 수령 시점에 증여 이슈 가능 → 세무사 상담 권장','종신보험+연금전환 구조: 사망 시 유족 생계 보장, 생존 시 연금 전환으로 상속·노후 동시 설계','상속세 신고기한: 사망일이 속하는 달의 말일부터 6개월 이내'].map((txt, i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom: i<4?8:0 }}>
                <span style={{ fontSize:14, flexShrink:0 }}>{'✅💰📋🏢⚖️'.split('').filter((_,j)=>j%2===0)[i]}</span>
                <span style={{ fontSize:12, fontWeight:700, color:'#5A3F00', lineHeight:1.6 }}>{txt}</span>
              </div>
            ))}
          </div>
          <p style={{ margin:0, fontSize:11, color:C.muted, fontWeight:700, lineHeight:1.7 }}>
            ※ 2025~2026년 기준 / 개인별 상황에 따라 달라질 수 있으므로 공인세무사 상담을 통해 확인하세요.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── 납입→수령 인포그래픽 차트 ─────────────────────────────────────

interface PensionChartProps {
  subjectAge: number; payYears: number; pensionStart: number; lifeExpect: number
  monthly: number; netMonthly: number; selMonthly: number
  effectiveReserve: number; totalPaid: number; selTotal: number
  deferYears: number; growthRate: number; annuityPayRate: number
  payType: PPayType; isDollar: boolean; exchangeRate: number
  dollarTotalPaid: number
}

function PensionChart(p: PensionChartProps) {
  const W = 740, H = 360
  const PAD = { t: 82, r: 24, b: 56, l: 68 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const endAge = Math.max(p.lifeExpect + 4, p.pensionStart + 8, p.subjectAge + 30)
  const ageSpan = endAge - p.subjectAge

  const xA = (age: number) => PAD.l + (age - p.subjectAge) / ageSpan * innerW
  const bw = Math.max(2, innerW / ageSpan * 0.72)

  const annualPaid = p.monthly * 12
  const annualRcvd = p.selMonthly * 12
  const maxAmt = Math.max(annualPaid, annualRcvd) * 1.1 || 1

  // midY: baseline (납입↓ / 수령↑)
  const midY = PAD.t + innerH * 0.54
  const upH = midY - PAD.t        // 수령 공간
  const dnH = PAD.t + innerH - midY  // 납입 공간

  const rcvdBarH = Math.min((annualRcvd / maxAmt) * upH * 0.84, upH - 8)
  const paidBarH = Math.min((annualPaid / maxAmt) * dnH * 0.84, dnH - 8)

  // Reserve curve (normalized to top 40% of chart above midY)
  const curveTop = PAD.t + 22
  const curveBot = midY - 4
  const curveH = curveBot - curveTop
  const normR = (v: number) => {
    const ratio = p.effectiveReserve > 0 ? Math.max(0, Math.min(1, v / p.effectiveReserve)) : 0
    return curveBot - ratio * curveH
  }

  // Build reserve curve points
  const curvePts: string[] = []
  for (let yr = 0; yr <= ageSpan; yr++) {
    const age = p.subjectAge + yr
    let rv = 0
    if (yr <= p.payYears) {
      rv = pFV3(p.netMonthly, p.growthRate, yr * 12)
    } else if (age < p.pensionStart) {
      const base = pFV3(p.netMonthly, p.growthRate, p.payYears * 12)
      const r = Math.max(0, p.growthRate) / 100
      rv = base * Math.pow(1 + r, yr - p.payYears)
    } else {
      const intoRcvd = age - p.pensionStart
      const totalRcvdYrs = Math.max(1, p.lifeExpect - p.pensionStart)
      rv = p.payType === 'inherit'
        ? p.effectiveReserve
        : p.effectiveReserve * Math.max(0, 1 - intoRcvd / totalRcvdYrs * 0.9)
    }
    curvePts.push(`${xA(age).toFixed(1)},${normR(rv).toFixed(1)}`)
  }

  // Fill polygon for reserve area (납입~개시)
  const pensionStartIdx = p.pensionStart - p.subjectAge
  const fillPts = [
    `${xA(p.subjectAge).toFixed(1)},${normR(0).toFixed(1)}`,
    ...curvePts.slice(0, Math.min(pensionStartIdx + 1, curvePts.length)),
    `${xA(Math.min(p.pensionStart, endAge)).toFixed(1)},${normR(0).toFixed(1)}`,
  ]

  // 5-year age labels
  const ageLabels: number[] = []
  for (let a = Math.ceil(p.subjectAge / 5) * 5; a <= endAge; a += 5) ageLabels.push(a)

  // Format helper
  const fmt = (w: number) => p.isDollar ? fmtUSD(Math.round(w / p.exchangeRate)) : fmtW3(w)

  const fmtSmall = (w: number) => {
    if (p.isDollar) return fmtUSD(Math.round(w / p.exchangeRate))
    const v = Math.round(w / 10000)
    return `${v.toLocaleString()}만원`
  }

  return (
    <div style={{ display:'grid', gap:12, gridTemplateColumns:'minmax(0,1fr)', overflow:'hidden' }}>
      {/* 요약 카드 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:8 }}>
        {[
          { icon:'📥', label:'총 납입', val:fmt(p.totalPaid), sub:`월 ${fmtSmall(p.monthly)} × ${p.payYears*12}개월`, color:'#1A2744' },
          { icon:'🏦', label:'연금개시 재원', val:fmt(p.effectiveReserve), sub:`${p.pensionStart}세 시점`, color:'#2D4A8A' },
          { icon:'💰', label:'월 수령액', val:fmt(p.selMonthly), sub:`연 ${fmt(p.selMonthly*12)}`, color:'#9B5B00' },
          { icon:'🎉', label:'총 수령 예상', val:fmt(p.selTotal), sub:`납입 대비 ${p.totalPaid > 0 ? (p.selTotal/p.totalPaid).toFixed(1) : '?'}배`, color:C.teal },
        ].map(c2 => (
          <div key={c2.label} style={{ background:'#fff', borderRadius:14, padding:'13px 14px', border:`1.5px solid ${C.border}`, borderTop:`3px solid ${c2.color}` }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{c2.icon}</div>
            <div style={{ fontSize:10, fontWeight:900, color:C.muted, marginBottom:3, letterSpacing:'0.2px' }}>{c2.label}</div>
            <div style={{ fontSize:14, fontWeight:950, color:c2.color, letterSpacing:'-0.3px' }}>{c2.val}</div>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginTop:3 }}>{c2.sub}</div>
          </div>
        ))}
      </div>

      {/* SVG 인포그래픽 */}
      <div style={{ borderRadius:16, border:`1.5px solid ${C.border}`, background:'#FAFAF8', overflow:'hidden' }}>
        <div style={{ padding:'12px 18px 0', display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:900, color:C.navy }}>📊 납입 → 수령 흐름</span>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[
              { color:'#1A2744', label:'납입액/년' },
              { color:C.gold, label:'수령액/년' },
              { color:C.blue, label:'재원 성장 곡선', dashed:true },
            ].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                {l.dashed
                  ? <svg width={18} height={10}><line x1={0} y1={5} x2={18} y2={5} stroke={l.color} strokeWidth={2} strokeDasharray="4,2"/></svg>
                  : <div style={{ width:14, height:10, background:l.color, borderRadius:2, opacity:0.8 }} />
                }
                <span style={{ fontSize:10, fontWeight:700, color:C.muted }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block' }}>

          {/* 구간 배경 */}
          {/* 납입구간 */}
          <rect x={xA(p.subjectAge)} y={PAD.t} width={Math.max(0, xA(p.subjectAge+p.payYears)-xA(p.subjectAge))} height={innerH} fill="#E8F0FA" />
          {/* 거치구간 */}
          {p.deferYears >= 1 && (
            <rect x={xA(p.subjectAge+p.payYears)} y={PAD.t} width={Math.max(0, xA(p.pensionStart)-xA(p.subjectAge+p.payYears))} height={innerH} fill="#F5F2ED" />
          )}
          {/* 수령구간 */}
          <rect x={xA(p.pensionStart)} y={PAD.t} width={Math.max(0, xA(endAge)-xA(p.pensionStart))} height={innerH} fill="rgba(14,126,107,0.07)" />

          {/* 구간 라벨 */}
          <text x={(xA(p.subjectAge)+xA(p.subjectAge+p.payYears))/2} y={PAD.t+18} textAnchor="middle" fontSize={10} fontWeight="900" fill="#2D4A8A" fontFamily="Pretendard,sans-serif">납입기간</text>
          {p.deferYears >= 1 && (
            <text x={(xA(p.subjectAge+p.payYears)+xA(p.pensionStart))/2} y={PAD.t+18} textAnchor="middle" fontSize={10} fontWeight="900" fill="#8B7355" fontFamily="Pretendard,sans-serif">거치</text>
          )}
          <text x={(xA(p.pensionStart)+xA(endAge))/2} y={PAD.t+18} textAnchor="middle" fontSize={10} fontWeight="900" fill={C.teal} fontFamily="Pretendard,sans-serif">수령기간</text>

          {/* 그리드 */}
          {[0.25, 0.5, 0.75].map(r => (
            <line key={r} x1={PAD.l} y1={PAD.t+innerH*r} x2={W-PAD.r} y2={PAD.t+innerH*r} stroke="#E2E8F0" strokeWidth={0.8} />
          ))}

          {/* 기준선 (0원 라인) */}
          <line x1={PAD.l} y1={midY} x2={W-PAD.r} y2={midY} stroke="#94A3B8" strokeWidth={1.5} />
          <text x={PAD.l-5} y={midY+4} textAnchor="end" fontSize={9} fill={C.muted} fontFamily="Pretendard,sans-serif">0원</text>

          {/* 납입 바 (아래↓) */}
          {Array.from({length:p.payYears},(_,i)=>{
            const age = p.subjectAge + i
            return <rect key={age} x={xA(age+0.12)} y={midY+1} width={bw} height={paidBarH} fill="#1A2744" opacity={0.72} rx={1.5} />
          })}

          {/* 수령 바 (위↑) */}
          {Array.from({length: Math.max(0, Math.min(p.lifeExpect - p.pensionStart + 1, endAge - p.pensionStart))},(_,i)=>{
            const age = p.pensionStart + i
            if (age >= endAge) return null
            return <rect key={age} x={xA(age+0.12)} y={midY-rcvdBarH-1} width={bw} height={rcvdBarH} fill={C.gold} opacity={0.85} rx={1.5} />
          })}

          {/* 재원 곡선 채우기 */}
          <polygon points={fillPts.join(' ')} fill="#2D4A8A" opacity={0.07} />
          {/* 재원 곡선 선 */}
          <polyline points={curvePts.join(' ')} fill="none" stroke="#2D4A8A" strokeWidth={2.2} strokeDasharray="6,3" opacity={0.75} />

          {/* 재원 피크 포인트 */}
          {p.effectiveReserve > 0 && p.pensionStart <= endAge && (
            <>
              <circle cx={xA(p.pensionStart)} cy={normR(p.effectiveReserve)} r={5} fill="#2D4A8A" opacity={0.85} />
              <text x={xA(p.pensionStart)+8} y={normR(p.effectiveReserve)-6} fontSize={10} fill="#2D4A8A" fontWeight="900" fontFamily="Pretendard,sans-serif">{fmt(p.effectiveReserve)}</text>
            </>
          )}

          {/* 세로 구분선들 */}
          {/* 납입완료 */}
          <line x1={xA(p.subjectAge+p.payYears)} y1={PAD.t+22} x2={xA(p.subjectAge+p.payYears)} y2={H-PAD.b} stroke="#3B6CB7" strokeWidth={1.5} strokeDasharray="5,3" />
          {/* 연금개시 */}
          {p.pensionStart !== p.subjectAge+p.payYears && (
            <line x1={xA(p.pensionStart)} y1={PAD.t+22} x2={xA(p.pensionStart)} y2={H-PAD.b} stroke={C.gold} strokeWidth={2} strokeDasharray="5,3" />
          )}
          {/* 기대수명 */}
          <line x1={xA(p.lifeExpect)} y1={PAD.t+22} x2={xA(p.lifeExpect)} y2={H-PAD.b} stroke={C.rose} strokeWidth={1.5} strokeDasharray="5,3" />

          {/* 세로 라벨 */}
          <text x={xA(p.subjectAge+p.payYears)} y={PAD.t+32} textAnchor="middle" fontSize={9} fill="#3B6CB7" fontWeight="700" fontFamily="Pretendard,sans-serif">납입완료</text>
          <text x={xA(p.pensionStart)} y={PAD.t+32} textAnchor="middle" fontSize={9} fill={C.gold} fontWeight="900" fontFamily="Pretendard,sans-serif">연금개시</text>
          <text x={xA(p.lifeExpect)} y={PAD.t+32} textAnchor="middle" fontSize={9} fill={C.rose} fontWeight="700" fontFamily="Pretendard,sans-serif">기대수명</text>

          {/* Y축 라벨 (수령액/납입액 표시) */}
          {annualRcvd > 0 && rcvdBarH > 12 && (
            <text x={PAD.l-6} y={midY-rcvdBarH/2+4} textAnchor="end" fontSize={9.5} fill="#9B5B00" fontWeight="700" fontFamily="Pretendard,sans-serif">{fmtSmall(annualRcvd)}/년</text>
          )}
          {annualPaid > 0 && paidBarH > 12 && (
            <text x={PAD.l-6} y={midY+paidBarH/2+4} textAnchor="end" fontSize={9.5} fill="#1A2744" fontWeight="700" fontFamily="Pretendard,sans-serif">{fmtSmall(annualPaid)}/년</text>
          )}

          {/* X축 나이 라벨 */}
          {ageLabels.map(age => (
            <text key={age} x={xA(age)} y={H-PAD.b+16} textAnchor="middle" fontSize={10} fill={C.muted} fontWeight="700" fontFamily="Pretendard,sans-serif">{age}세</text>
          ))}

          {/* 나이 눈금 */}
          {ageLabels.map(age => (
            <line key={`tick-${age}`} x1={xA(age)} y1={H-PAD.b} x2={xA(age)} y2={H-PAD.b+4} stroke={C.border} strokeWidth={1} />
          ))}

          {/* 총액 화살표 어노테이션 */}
          {p.selMonthly > 0 && xA(p.pensionStart) < W-80 && (
            <>
              <line x1={xA(p.pensionStart)+4} y1={midY-rcvdBarH*0.5} x2={xA(p.pensionStart)+30} y2={midY-rcvdBarH*0.5} stroke={C.gold} strokeWidth={1} markerEnd="url(#arr)" />
              <text x={xA(p.pensionStart)+33} y={midY-rcvdBarH*0.5+4} fontSize={9.5} fill={C.gold} fontWeight="900" fontFamily="Pretendard,sans-serif">월 {fmt(p.selMonthly)}</text>
            </>
          )}

          {/* 납입 화살표 */}
          {p.monthly > 0 && (
            <text x={xA(p.subjectAge+p.payYears/2)} y={midY+paidBarH+14} textAnchor="middle" fontSize={9.5} fill="#2D4A8A" fontWeight="900" fontFamily="Pretendard,sans-serif">월 {fmt(p.monthly)} 납입</text>
          )}

        </svg>
      </div>

      {/* 텍스트 설명 카드 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px,1fr))', gap:8 }}>
        {[
          { color:'#1A2744', bg:'#EBF3FB', title:'📥 납입 기간', lines:[`${p.subjectAge}세 ~ ${p.subjectAge+p.payYears}세 (${p.payYears}년)`,`월 ${fmt(p.monthly)} 납입`,`총 ${fmt(p.totalPaid)} 불입`] },
          ...(p.deferYears >= 1 ? [{ color:'#8B7355', bg:'#F5F2ED', title:'⏳ 거치 기간', lines:[`${p.subjectAge+p.payYears}세 ~ ${p.pensionStart}세 (${p.deferYears}년)`,`복리 성장 지속`,`→ 재원 극대화`] }] : []),
          { color:'#9B5B00', bg:C.goldLight, title:'💰 연금 개시', lines:[`${p.pensionStart}세 수령 시작`,`월 ${fmt(p.selMonthly)}`,`연 ${fmt(p.selMonthly*12)}`] },
          { color:C.teal, bg:'#E3F5F1', title:'🎉 수령 기간', lines:[`${p.pensionStart}세 ~ ${p.lifeExpect}세 (${p.lifeExpect-p.pensionStart}년)`,`총 ${fmt(p.selTotal)} 예상`,`납입 대비 ${p.totalPaid > 0 ? (p.selTotal/p.totalPaid).toFixed(1) : '?'}배`] },
        ].map((c2:any) => (
          <div key={c2.title} style={{ background:c2.bg, borderRadius:12, padding:'12px 14px', borderLeft:`4px solid ${c2.color}` }}>
            <p style={{ margin:'0 0 7px', fontSize:12, fontWeight:900, color:c2.color }}>{c2.title}</p>
            {c2.lines.map((l:string, i:number) => (
              <p key={i} style={{ margin:i<c2.lines.length-1?'0 0 3px':0, fontSize:i===0?12:11, fontWeight:i===0?900:700, color:i===0?C.text:C.muted }}>{l}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 메인 PensionCalc ──────────────────────────────────────────────


function PensionCalc() {
  // ── State ────────────────────────────────────────────────────────
  const [mode, setMode] = useState<PMode>('self')
  const [productType, setProductType] = useState<PPT>('variable')
  const [gender, setGender] = useState<PGender>('male')
  const [currentAge, setCurrentAge] = useState(40)
  const [childAge, setChildAge] = useState(10)
  const [monthlyMan, setMonthlyMan] = useState(50)
  const [payYears, setPayYears] = useState(20)
  const [pensionStartAge, setPensionStartAge] = useState<number>(65)
  const [childPensionAge, setChildPensionAge] = useState<number>(60)
  const [variableRate, setVariableRate] = useState(4.0)
  const [declaredRate, setDeclaredRate] = useState(2.42)
  const [dollarRate, setDollarRate] = useState(DOLLAR_RATE_DEFAULT)
  const [exchangeRate, setExchangeRate] = useState(1380)
  const [dollarMonthly, setDollarMonthly] = useState(310)
  const [earlyMultiplier, setEarlyMultiplier] = useState(DOLLAR_EARLY_MULTIPLIER)
  const [annuityPayRate, setAnnuityPayRate] = useState(2.42)
  const [annuityBaseRate, setAnnuityBaseRate] = useState(6.0)
  const [autoBaseRate, setAutoBaseRate] = useState(true)
  const [guaranteeRatio, setGuaranteeRatio] = useState(210)
  const [payType, setPayType] = useState<PPayType>('lifetime')
  const [showInheritance, setShowInheritance] = useState(false)
  const [annualIncomeMan, setAnnualIncomeMan] = useState(5000)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // ── 파생 계산 ────────────────────────────────────────────────────
  const isDollar = productType === 'dollar'
  const subjectAge = mode === 'child' ? childAge : currentAge
  const subjectPensionAge = mode === 'child' ? childPensionAge : pensionStartAge
  const autoRate = (BASE_ANNUITY_RATES[subjectPensionAge] || BASE_ANNUITY_RATES[65])[gender]
  const effectiveBaseRate = autoBaseRate ? autoRate : annuityBaseRate
  const monthly = isDollar ? dollarMonthly * exchangeRate : monthlyMan * 10_000
  const netMonthly = monthly * 0.92
  const dollarTotalPaid = dollarMonthly * payYears * 12
  const growthRate = productType === 'variable' ? variableRate : isDollar ? dollarRate : declaredRate
  const payMonths = payYears * 12
  const pensionStart = Math.max(subjectAge + payYears, subjectPensionAge)
  const deferYears = Math.max(0, pensionStart - (subjectAge + payYears))
  const totalPaid = monthly * payMonths
  const minGuarantee = totalPaid * (guaranteeRatio / 100)
  const lifeExpect = gender === 'male' ? 85 : 90

  function calcReserveAt(rate: number): number {
    const r0 = pFV3(netMonthly, rate, payMonths)
    return deferYears > 0 ? r0 * Math.pow(1 + Math.max(0, rate) / 100, deferYears) : r0
  }

  const reserveBase = calcReserveAt(growthRate)
  const effectiveReserve = productType === 'variable' ? Math.max(reserveBase, minGuarantee) : reserveBase
  const lifetimeMonths = Math.max(120, (lifeExpect - pensionStart) * 12)

  function getMonthly(pt: PPayType, res?: number): number {
    const r = res ?? effectiveReserve
    switch (pt) {
      case '5y': return pMon3(r, annuityPayRate, 60)
      case '10y': return pMon3(r, annuityPayRate, 120)
      case '15y': return pMon3(r, annuityPayRate, 180)
      case '20y': return pMon3(r, annuityPayRate, 240)
      case 'lifetime': return r * (effectiveBaseRate / 100) / 12
      case 'inherit': return reserveBase * (annuityPayRate / 100) / 12
      default: return 0
    }
  }
  function getMonths(pt: PPayType): number {
    const m: Record<PPayType, number> = { '5y':60,'10y':120,'15y':180,'20y':240,'lifetime':lifetimeMonths,'inherit':lifetimeMonths }
    return m[pt]
  }
  const selMonthly = getMonthly(payType)
  const selTotal = selMonthly * getMonths(payType)
  const annualIncome = annualIncomeMan * 10_000
  const creditRate = taxCreditRate(annualIncome)
  const annualTaxCredit = Math.min(monthly * 12, 6_000_000) * creditRate
  const pensionTaxAmt = selMonthly * 12 * pensionTaxRate(pensionStart)
  const fmt = (w: number) => isDollar ? fmtUSD(Math.round(w / exchangeRate)) : fmtW3(w)

  // ── 베지어 곡선 데이터 (납입~개시) ──────────────────────────────
  const chartW = 560, chartH = 260
  const chartPad = { t:30, r:24, b:44, l:74 }
  const innerW = chartW - chartPad.l - chartPad.r
  const innerH = chartH - chartPad.t - chartPad.b
  const endAge = Math.max(pensionStart + 5, lifeExpect)
  const ageSpan = endAge - subjectAge
  const xA = (age: number) => chartPad.l + (age - subjectAge) / ageSpan * innerW

  // Y축: 재원 규모 기준
  const yMax = effectiveReserve * 1.08 || 100
  const yA = (v: number) => chartPad.t + innerH - (Math.max(0, v) / yMax) * innerH

  // 곡선 포인트 (1년 단위)
  type Pt = [number, number]
  const pts: Pt[] = []
  for (let yr = 0; yr <= ageSpan; yr++) {
    const age = subjectAge + yr
    let rv = 0
    if (yr <= payYears) {
      rv = pFV3(netMonthly, growthRate, yr * 12)
    } else if (age < pensionStart) {
      const base = pFV3(netMonthly, growthRate, payYears * 12)
      rv = base * Math.pow(1 + Math.max(0, growthRate) / 100, yr - payYears)
    } else {
      const into = age - pensionStart
      const totalYrs = Math.max(1, lifeExpect - pensionStart)
      rv = payType === 'inherit'
        ? effectiveReserve
        : effectiveReserve * Math.max(0, 1 - into / totalYrs * 0.92)
    }
    pts.push([xA(age), yA(Math.min(rv, effectiveReserve * 1.05))])
  }

  // Smooth bezier path
  function buildPath(points: Pt[]): string {
    if (points.length < 2) return ''
    let d = `M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i][0] + points[i+1][0]) / 2
      const my = (points[i][1] + points[i+1][1]) / 2
      d += ` Q ${points[i][0].toFixed(1)},${points[i][1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`
    }
    const last = points[points.length - 1]
    d += ` T ${last[0].toFixed(1)},${last[1].toFixed(1)}`
    return d
  }

  const linePath = buildPath(pts)
  const peakPt = pts[Math.min(pensionStart - subjectAge, pts.length - 1)]
  const peakX = peakPt?.[0] ?? xA(pensionStart)
  const peakY = peakPt?.[1] ?? yA(effectiveReserve)
  const baseY = chartPad.t + innerH
  const fillPath = `${linePath.replace('M ', 'M ')} L ${pts[pts.length-1][0].toFixed(1)},${baseY} L ${pts[0][0].toFixed(1)},${baseY} Z`

  // Y축 눈금
  const yTicks: { val: number; y: number; label: string }[] = []
  const tickCount = 4
  for (let i = 0; i <= tickCount; i++) {
    const val = (yMax / tickCount) * i
    yTicks.push({ val, y: yA(val), label: fmtW3(val) })
  }

  // X축 눈금 (5년 간격)
  const xTicks: { age: number; x: number }[] = []
  for (let a = Math.ceil(subjectAge / 5) * 5; a <= endAge; a += 5) {
    xTicks.push({ age: a, x: xA(a) })
  }

  // ── 납입금액별 비교 (안정형/기본형/집중형) ────────────────────
  const presets = [
    { label:'안정형', monthlyManP: Math.max(10, monthlyMan - 20), color:'#374151' },
    { label:'기본형', monthlyManP: monthlyMan, color:C.gold },
    { label:'집중형', monthlyManP: monthlyMan + 20, color:C.teal },
  ]
  const presetData = presets.map(p => {
    const pm = isDollar ? dollarMonthly * exchangeRate : p.monthlyManP * 10_000
    const pn = pm * 0.92
    const r = pFV3(pn, growthRate, payMonths)
    const rDefer = deferYears > 0 ? r * Math.pow(1 + Math.max(0, growthRate)/100, deferYears) : r
    const rEff = productType === 'variable' ? Math.max(rDefer, pm * payMonths * (guaranteeRatio/100)) : rDefer
    const mon = getMonthly(payType, rEff)
    return { ...p, reserve: rEff, monthly: mon }
  })
  const maxPresetMon = Math.max(...presetData.map(d => d.monthly)) || 1

  // ── 슬라이더 스타일 ──────────────────────────────────────────────
  const sliderInputStyle: React.CSSProperties = {
    width: '100%', height: 6, borderRadius: 3, outline: 'none', cursor: 'pointer',
    appearance: 'none', background: `linear-gradient(to right, #2CC9B5 0%, #2CC9B5 50%, #E2E8F0 50%)`,
    border: 'none',
  }
  const btnStyle: React.CSSProperties = {
    width:32, height:32, borderRadius:'50%', border:`2px solid ${C.border}`, background:'#fff',
    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:18, fontWeight:900, color:C.navy, flexShrink:0,
    fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif",
  }
  const iconBg: React.CSSProperties = {
    width:44, height:44, borderRadius:'50%', background:C.navy, display:'flex',
    alignItems:'center', justifyContent:'center', flexShrink:0,
  }

  // ── 렌더 ─────────────────────────────────────────────────────────
  return (
    <div style={{ display:'grid', gap:0, gridTemplateColumns:'minmax(0,1fr)', overflowX:'hidden', fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif" }}>
      {showInheritance && <InheritanceModal onClose={() => setShowInheritance(false)} />}

      {/* ── 헤더 ── */}
      <div style={{ background:`linear-gradient(135deg, ${C.navy} 0%, #0D1B3E 100%)`, borderRadius:'20px 20px 0 0', padding:'28px 32px 24px', position:'relative', overflow:'hidden' }}>
        {/* 골드 장식선 */}
        <div style={{ position:'absolute', top:0, right:0, width:200, height:4, background:`linear-gradient(to left, ${C.gold}, transparent)` }} />
        <div style={{ position:'absolute', bottom:0, left:0, width:160, height:3, background:`linear-gradient(to right, ${C.gold}, transparent)` }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <p style={{ margin:'0 0 4px', color:'rgba(255,255,255,0.55)', fontSize:11, fontWeight:900, letterSpacing:'1.5px' }}>METARICH SIGNAL GROUP</p>
            <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
              <h2 style={{ margin:0, color:'#fff', fontSize:26, fontWeight:950, letterSpacing:'-1px' }}>연금계산</h2>
              <h2 style={{ margin:0, color:C.gold, fontSize:26, fontWeight:950, letterSpacing:'-1px', fontStyle:'italic' }}>시뮬레이션</h2>
            </div>
            <p style={{ margin:'6px 0 0', color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:700 }}>조건을 변경하면 결과가 즉시 반영됩니다</p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {/* 모드 토글 */}
            {(['self','child'] as PMode[]).map((m,i)=>(
              <button key={m} onClick={()=>setMode(m)} style={{ padding:'7px 14px', borderRadius:10, border:`1.5px solid ${mode===m?C.gold:'rgba(255,255,255,0.2)'}`, background:mode===m?'rgba(201,169,78,0.15)':'transparent', color:mode===m?C.gold:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif", transition:'all 0.18s' }}>
                {['👤 본인 연금','👶 자녀 연금'][i]}
              </button>
            ))}
            <button onClick={()=>setShowInheritance(true)} style={{ padding:'7px 14px', borderRadius:10, border:`1.5px solid ${C.gold}`, background:`rgba(201,169,78,0.2)`, color:C.gold, fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif" }}>
              🏛️ 상속·증여
            </button>
          </div>
        </div>
        {/* 상품/성별 선택 */}
        <div style={{ marginTop:16, display:'flex', gap:8, flexWrap:'wrap' }}>
          {(['variable','declared','dollar'] as PPT[]).map((t,i)=>(
            <button key={t} onClick={()=>setProductType(t)} style={{ padding:'6px 14px', borderRadius:8, border:'none', background:productType===t?C.gold:'rgba(255,255,255,0.1)', color:productType===t?C.navy:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:900, cursor:'pointer', fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif", transition:'all 0.18s' }}>
              {['📈 변액연금','🏦 공시이율연금','🇺🇸 달러연금'][i]}
            </button>
          ))}
          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            {(['male','female'] as PGender[]).map((g,i)=>(
              <button key={g} onClick={()=>setGender(g)} style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${gender===g?'#2CC9B5':'rgba(255,255,255,0.15)'}`, background:gender===g?'rgba(44,201,181,0.2)':'transparent', color:gender===g?'#2CC9B5':'rgba(255,255,255,0.5)', fontSize:11, fontWeight:900, cursor:'pointer', fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif" }}>
                {['남성 (기대수명 85세)','여성 (90세)'][i]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 입력 + 차트 ── */}
      <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderTop:'none', display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:0 }}>
        {/* 좌: 슬라이더 입력 */}
        <div style={{ padding:'24px 28px', borderRight:`1px solid ${C.border}` }}>
          {/* 슬라이더 헬퍼 */}
          {[
            {
              icon:'👤', label: mode==='child'?'자녀 현재 나이':'현재 나이',
              value: mode==='child'?childAge:currentAge, min:10, max:70, step:1,
              display: `${mode==='child'?childAge:currentAge}세`,
              onChange: (v:number) => mode==='child'?setChildAge(v):setCurrentAge(v),
            },
            {
              icon:'💰', label:'월 납입액',
              value: monthlyMan, min:10, max:200, step:5,
              display: isDollar?`$${dollarMonthly}`:`${monthlyMan}만원`,
              onChange: (v:number) => setMonthlyMan(v),
            },
            {
              icon:'📅', label:'납입기간',
              value: payYears, min:5, max:30, step:1,
              display: `${payYears}년`,
              onChange: (v:number) => setPayYears(v),
            },
            {
              icon:'⏰', label:'연금개시나이',
              value: mode==='child'?childPensionAge:pensionStartAge, min:55, max:80, step:5,
              display: `${mode==='child'?childPensionAge:pensionStartAge}세`,
              onChange: (v:number) => mode==='child'?setChildPensionAge(v):setPensionStartAge(v),
            },
            {
              icon:'📊', label: productType==='variable'?'예상 투자수익률':productType==='dollar'?'달러 공시이율':'공시이율',
              value: productType==='variable'?variableRate:productType==='dollar'?dollarRate:declaredRate,
              min:0.5, max:productType==='variable'?30:10, step:0.25,
              display: `연 ${(productType==='variable'?variableRate:productType==='dollar'?dollarRate:declaredRate).toFixed(2)}%`,
              onChange: (v:number) => productType==='variable'?setVariableRate(v):productType==='dollar'?setDollarRate(v):setDeclaredRate(v),
            },
          ].map((s) => {
            const pct = Math.max(0,Math.min(100, (s.value - s.min) / (s.max - s.min) * 100))
            return (
              <div key={s.label} style={{ marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                  <div style={iconBg}><span style={{ fontSize:18 }}>{s.icon}</span></div>
                  <span style={{ fontSize:13, fontWeight:900, color:C.navy, flex:1 }}>{s.label}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <button style={btnStyle} onClick={()=>s.onChange(Math.max(s.min, +(s.value-s.step).toFixed(2)))}>−</button>
                    <span style={{ minWidth:80, textAlign:'center', fontSize:14, fontWeight:950, color:C.navy }}>{s.display}</span>
                    <button style={btnStyle} onClick={()=>s.onChange(Math.min(s.max, +(s.value+s.step).toFixed(2)))}>＋</button>
                  </div>
                </div>
                <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                  onChange={e=>s.onChange(+e.target.value)}
                  style={{ ...sliderInputStyle, background:`linear-gradient(to right, #2CC9B5 0%, #2CC9B5 ${pct}%, #E2E8F0 ${pct}%, #E2E8F0 100%)` }} />
              </div>
            )
          })}

          {/* 실시간 계산 표시 */}
          <div style={{ marginTop:8, background:`linear-gradient(135deg, ${C.gold}, #E8A84B)`, borderRadius:14, padding:'14px 20px', display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:22 }}>🧮</span>
            <div>
              <p style={{ margin:0, color:C.navy, fontSize:11, fontWeight:900 }}>실시간 계산 중</p>
              <p style={{ margin:'2px 0 0', color:C.navy, fontSize:14, fontWeight:950 }}>월 {fmt(selMonthly)} 수령 예상</p>
            </div>
          </div>
        </div>

        {/* 우: 적립금 성장 곡선 */}
        <div style={{ padding:'24px 20px' }}>
          <p style={{ margin:'0 0 12px', fontSize:13, fontWeight:900, color:C.navy }}>
            📈 적립금 성장 곡선
            <span style={{ fontSize:11, fontWeight:700, color:C.muted, marginLeft:8 }}>— {productType==='variable'?`수익률 ${variableRate}%`:productType==='dollar'?`달러이율 ${dollarRate}%`:`공시이율 ${declaredRate}%`}</span>
          </p>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width:'100%' }}>
            {/* 배경 구간 */}
            <rect x={xA(subjectAge)} y={chartPad.t} width={Math.max(0,xA(subjectAge+payYears)-xA(subjectAge))} height={innerH} fill="#EBF3FB" rx={4} />
            {deferYears>=1&&<rect x={xA(subjectAge+payYears)} y={chartPad.t} width={Math.max(0,xA(pensionStart)-xA(subjectAge+payYears))} height={innerH} fill="#F5F2ED" />}
            <rect x={xA(pensionStart)} y={chartPad.t} width={Math.max(0,xA(endAge+1)-xA(pensionStart))} height={innerH} fill="rgba(44,201,181,0.06)" />

            {/* Y축 */}
            {yTicks.map(t=>(
              <g key={t.val}>
                <line x1={chartPad.l-4} y1={t.y} x2={chartW-chartPad.r} y2={t.y} stroke="#F0F4F8" strokeWidth={1} />
                <text x={chartPad.l-8} y={t.y+4} textAnchor="end" fontSize={9} fill={C.muted} fontFamily="Pretendard,sans-serif">{fmtW3(t.val)}</text>
              </g>
            ))}

            {/* X축 */}
            <line x1={chartPad.l} y1={chartPad.t+innerH} x2={chartW-chartPad.r} y2={chartPad.t+innerH} stroke="#E2E8F0" strokeWidth={1.5} />
            {xTicks.map(t=>(
              <g key={t.age}>
                <line x1={t.x} y1={chartPad.t+innerH} x2={t.x} y2={chartPad.t+innerH+4} stroke={C.border} strokeWidth={1} />
                <text x={t.x} y={chartPad.t+innerH+16} textAnchor="middle" fontSize={10} fill={C.muted} fontFamily="Pretendard,sans-serif">{t.age}세</text>
              </g>
            ))}

            {/* 면적 채우기 */}
            <path d={fillPath} fill="rgba(44,201,181,0.12)" />
            {/* 곡선 */}
            <path d={linePath} fill="none" stroke="#2CC9B5" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

            {/* 현재 시점 점 */}
            <circle cx={xA(subjectAge)} cy={yA(0)} r={6} fill={C.navy} />
            <text x={xA(subjectAge)+8} y={yA(0)+4} fontSize={10} fill={C.navy} fontWeight="900" fontFamily="Pretendard,sans-serif">{subjectAge}세</text>

            {/* 연금개시 피크 점 */}
            {peakX && peakY && (
              <>
                <circle cx={peakX} cy={peakY} r={8} fill={C.gold} stroke="#fff" strokeWidth={2} />
                <text x={peakX} y={peakY-14} textAnchor="middle" fontSize={10} fill={C.gold} fontWeight="900" fontFamily="Pretendard,sans-serif">{pensionStart}세</text>
                <text x={peakX} y={peakY-26} textAnchor="middle" fontSize={9} fill="#7B5B00" fontWeight="900" fontFamily="Pretendard,sans-serif">{fmt(effectiveReserve)}</text>
                <line x1={peakX} y1={peakY+8} x2={peakX} y2={chartPad.t+innerH} stroke={C.gold} strokeWidth={1.5} strokeDasharray="4,3" />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* ── 예상 결과 3카드 ── */}
      <div style={{ background:'#F7F8FA', border:`1px solid ${C.border}`, borderTop:'none', padding:'24px 28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <div style={{ width:4, height:22, background:C.navy, borderRadius:2 }} />
          <p style={{ margin:0, fontSize:15, fontWeight:950, color:C.navy }}>예상 결과</p>
          <span style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:C.muted }}>⚙️ 조건을 변경하면 결과가 즉시 반영됩니다</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {[
            { icon:'💳', label:'총 납입원금', val:fmt(totalPaid), sub:`월 ${fmt(monthly)} × ${payMonths}개월`, color:C.navy },
            { icon:'📈', label:'연금개시 예상 적립금', val:fmt(effectiveReserve), sub:`${pensionStart}세 시점 기준`, color:C.blue },
            { icon:'💰', label:'예상 월 연금액', val:fmt(selMonthly), sub:`연 ${fmt(selMonthly*12)}`, color:C.gold },
          ].map(c2=>(
            <div key={c2.label} style={{ background:'#fff', borderRadius:18, padding:'22px 22px', border:`1px solid ${C.border}`, textAlign:'center' }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:C.goldLight, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', border:`2px solid ${C.gold}40` }}>
                <span style={{ fontSize:24 }}>{c2.icon}</span>
              </div>
              <p style={{ margin:'0 0 6px', fontSize:12, fontWeight:900, color:C.muted }}>{c2.label}</p>
              <div style={{ width:24, height:2, background:C.gold, margin:'0 auto 8px', borderRadius:1 }} />
              <p style={{ margin:0, fontSize:20, fontWeight:950, color:c2.color, letterSpacing:'-0.5px' }}>{c2.val}</p>
              <p style={{ margin:'5px 0 0', fontSize:11, fontWeight:700, color:C.muted }}>{c2.sub}</p>
            </div>
          ))}
        </div>

        {/* 상세 리스트 */}
        <div style={{ marginTop:16, background:'#fff', borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
          {[
            { icon:'👤', label:`현재 ${subjectAge}세`, val:'0원 (시작)' },
            { icon:'💳', label:'총 납입원금', val:fmt(totalPaid) },
            { icon:'📈', label:'연금개시 예상 적립금', val:fmt(effectiveReserve) },
          ].map((row,i)=>(
            <div key={row.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 20px', borderBottom: i<2?`1px solid ${C.border}`:'none', background:i===2?C.goldLight:'transparent' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:16 }}>{row.icon}</span>
                <span style={{ fontSize:13, fontWeight:i===2?900:700, color:i===2?'#7B5B00':C.text }}>{row.label}</span>
              </div>
              <span style={{ fontSize:14, fontWeight:950, color:i===2?C.gold:C.navy }}>{row.val}</span>
            </div>
          ))}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:C.goldLight, borderTop:`1px solid ${C.gold}40` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:C.gold, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:18 }}>💰</span>
              </div>
              <span style={{ fontSize:14, fontWeight:900, color:'#7B5B00' }}>예상 월 연금액</span>
            </div>
            <span style={{ fontSize:22, fontWeight:950, color:C.gold, letterSpacing:'-0.5px' }}>{fmt(selMonthly)}</span>
          </div>
        </div>
      </div>

      {/* ── 나의 연금 흐름 (타임라인) ── */}
      <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderTop:'none', padding:'24px 28px' }}>
        <p style={{ margin:'0 0 20px', fontSize:15, fontWeight:950, color:C.navy }}>🌊 나의 연금 흐름</p>
        <div style={{ display:'flex', alignItems:'flex-start', gap:0, position:'relative' }}>
          {/* 연결선 */}
          <div style={{ position:'absolute', top:22, left:'12.5%', right:'12.5%', height:3, background:`linear-gradient(to right, ${C.navy}, ${C.gold})`, zIndex:0 }} />
          {[
            { icon:'📅', age:subjectAge, label:'매월 납입', color:C.navy, sub:`월 ${fmt(monthly)}` },
            { icon:'👛', age:subjectAge+payYears, label:'납입 종료', color:'#3B6CB7', sub:`총 ${fmt(totalPaid)}` },
            { icon:'💰', age:pensionStart, label:'연금 개시', color:C.gold, sub:`월 ${fmt(selMonthly)}` },
          ].map((step,i)=>(
            <div key={step.age} style={{ flex:1, textAlign:'center', position:'relative', zIndex:1 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:step.color, border:'3px solid #fff', boxShadow:'0 4px 12px rgba(0,0,0,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                <span style={{ fontSize:20 }}>{step.icon}</span>
              </div>
              <p style={{ margin:'0 0 3px', fontSize:20, fontWeight:950, color:step.color }}>{step.age}세</p>
              <p style={{ margin:'0 0 4px', fontSize:12, fontWeight:900, color:C.text }}>{step.label}</p>
              <p style={{ margin:0, fontSize:11, fontWeight:700, color:C.muted }}>{step.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 납입금액별 비교 ── */}
      <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderTop:'none', padding:'24px 28px' }}>
        <p style={{ margin:'0 0 16px', fontSize:15, fontWeight:950, color:C.navy }}>📊 납입금액별 예상 연금 비교</p>
        {/* 테이블 */}
        <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20, fontSize:13 }}>
          <thead>
            <tr style={{ background:C.navy }}>
              {['구분','월 납입액','납입기간','개시나이','예상 월 연금액'].map(h=>(
                <th key={h} style={{ padding:'12px 16px', color:C.gold, fontWeight:900, textAlign:'center', border:'none', fontSize:12, fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {presetData.map((row,i)=>(
              <tr key={row.label} style={{ background:i===1?C.goldLight:'#fff', borderBottom:`1px solid ${C.border}` }}>
                <td style={{ padding:'13px 16px', textAlign:'center', fontWeight:i===1?950:700, color:i===1?'#7B5B00':C.text, fontSize:i===1?14:13 }}>{row.label}</td>
                <td style={{ padding:'13px 16px', textAlign:'center', fontWeight:700, color:C.text }}>{isDollar?`$${dollarMonthly}`:`${row.monthlyManP}만원`}</td>
                <td style={{ padding:'13px 16px', textAlign:'center', fontWeight:700, color:C.muted }}>{payYears}년</td>
                <td style={{ padding:'13px 16px', textAlign:'center', fontWeight:700, color:C.muted }}>{pensionStart}세</td>
                <td style={{ padding:'13px 16px', textAlign:'center', fontWeight:950, color:i===1?C.gold:C.navy, fontSize:i===1?16:14 }}>{fmt(row.monthly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* 바 차트 비교 */}
        <p style={{ margin:'0 0 10px', fontSize:12, fontWeight:900, color:C.muted, textAlign:'center' }}>월 연금액 비교</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:16, alignItems:'flex-end', height:130, padding:'0 20px' }}>
          {presetData.map((row,i)=>{
            const h = Math.max(20, (row.monthly / maxPresetMon) * 110)
            return (
              <div key={row.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end' }}>
                <span style={{ fontSize:13, fontWeight:950, color:row.color, marginBottom:4 }}>{fmt(row.monthly)}</span>
                <div style={{ width:'100%', height:h, background:i===1?`linear-gradient(180deg, ${C.gold}, #E8A84B)`:row.color, borderRadius:'6px 6px 0 0', opacity:i===1?1:0.75, transition:'height 0.3s' }} />
                <span style={{ fontSize:11, fontWeight:900, color:row.color, marginTop:6 }}>{row.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 수령방식 선택 ── */}
      <div style={{ background:'#F7F8FA', border:`1px solid ${C.border}`, borderTop:'none', padding:'24px 28px' }}>
        <p style={{ margin:'0 0 12px', fontSize:13, fontWeight:900, color:C.navy }}>💳 수령방식 선택 (현재: {({'5y':'5년 확정','10y':'10년 확정','15y':'15년 확정','20y':'20년 확정','lifetime':'종신','inherit':'상속'} as Record<PPayType,string>)[payType]})</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8 }}>
          {([
            {key:'5y',label:'5년 확정',sub:'단기 고수령'},
            {key:'10y',label:'10년 확정',sub:'안정 균형형'},
            {key:'15y',label:'15년 확정',sub:'중기 보장'},
            {key:'20y',label:'20년 확정',sub:'장기 보장'},
            {key:'lifetime',label:`종신 (${lifeExpect}세)`,sub:`기대수명 ${lifeExpect}세`},
            {key:'inherit',label:'상속연금',sub:'원금유지 이자수령'},
          ] as {key:PPayType,label:string,sub:string}[]).map(card=>{
            const m = getMonthly(card.key)
            const sel = payType === card.key
            return (
              <button key={card.key} onClick={()=>setPayType(card.key)} style={{ padding:'12px 10px', borderRadius:12, cursor:'pointer', border:`2px solid ${sel?C.navy:C.border}`, background:sel?C.navy:'#fff', fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif", textAlign:'center', transition:'all 0.18s' }}>
                <div style={{ fontSize:10, fontWeight:900, color:sel?'rgba(255,255,255,0.7)':C.muted, marginBottom:3 }}>{card.label}</div>
                <div style={{ fontSize:16, fontWeight:950, color:sel?C.gold:C.navy }}>{fmt(m)}</div>
                <div style={{ fontSize:9, fontWeight:700, color:sel?'rgba(255,255,255,0.5)':C.muted, marginTop:2 }}>{card.sub}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 고급 설정 토글 ── */}
      <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderTop:'none', borderRadius:'0 0 20px 20px' }}>
        <button onClick={()=>setShowAdvanced(v=>!v)} style={{ width:'100%', padding:'14px 28px', background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif" }}>
          <span style={{ fontSize:13, fontWeight:900, color:C.muted }}>⚙️ 고급 설정 (최저보증·기본지급률·세제혜택·자녀연금 등)</span>
          <span style={{ fontSize:18, color:C.muted, transition:'transform 0.2s', transform:showAdvanced?'rotate(180deg)':'none' }}>▾</span>
        </button>

        {showAdvanced && (
          <div style={{ padding:'0 28px 28px', borderTop:`1px solid ${C.border}`, display:'grid', gap:16 }}>
            {/* 고급 입력 */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:12, paddingTop:16 }}>
              {mode==='child'&&<div><label style={{ fontSize:11,fontWeight:900,color:C.muted,display:'block',marginBottom:5 }}>자녀 현재 나이</label><input type="number" value={childAge} min={0} max={50} onChange={e=>setChildAge(+e.target.value)} style={{ width:'100%',padding:'9px 12px',borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.text,background:'#fff',outline:'none',fontFamily:"'Pretendard',sans-serif",boxSizing:'border-box' as const }} /></div>}
              {productType==='variable'&&<div><label style={{ fontSize:11,fontWeight:900,color:C.muted,display:'block',marginBottom:5 }}>최저연금보증배율 (%)</label><input type="number" value={guaranteeRatio} min={100} max={300} step={10} onChange={e=>setGuaranteeRatio(+e.target.value)} style={{ width:'100%',padding:'9px 12px',borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.text,background:'#fff',outline:'none',fontFamily:"'Pretendard',sans-serif",boxSizing:'border-box' as const }} /></div>}
              {isDollar&&<div><label style={{ fontSize:11,fontWeight:900,color:C.muted,display:'block',marginBottom:5 }}>🇺🇸 달러 월납 ($)</label><input type="number" value={dollarMonthly} min={50} step={10} onChange={e=>setDollarMonthly(+e.target.value)} style={{ width:'100%',padding:'9px 12px',borderRadius:10,border:`1.5px solid #22577A`,fontSize:14,fontWeight:700,color:C.text,background:'#fff',outline:'none',fontFamily:"'Pretendard',sans-serif",boxSizing:'border-box' as const }} /></div>}
              {isDollar&&<div><label style={{ fontSize:11,fontWeight:900,color:C.muted,display:'block',marginBottom:5 }}>환율 (원/달러)</label><input type="number" value={exchangeRate} min={1000} max={2000} step={10} onChange={e=>setExchangeRate(+e.target.value)} style={{ width:'100%',padding:'9px 12px',borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.text,background:'#fff',outline:'none',fontFamily:"'Pretendard',sans-serif",boxSizing:'border-box' as const }} /></div>}
              <div><label style={{ fontSize:11,fontWeight:900,color:C.muted,display:'block',marginBottom:5 }}>확정형 지급이율 (%)</label><input type="number" value={annuityPayRate} min={0.5} max={6} step={0.1} onChange={e=>setAnnuityPayRate(+e.target.value)} style={{ width:'100%',padding:'9px 12px',borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.text,background:'#fff',outline:'none',fontFamily:"'Pretendard',sans-serif",boxSizing:'border-box' as const }} /></div>
              <div><label style={{ fontSize:11,fontWeight:900,color:C.muted,display:'block',marginBottom:5 }}>연 소득 (만원, 세액공제용)</label><input type="number" value={annualIncomeMan} min={1000} step={500} onChange={e=>setAnnualIncomeMan(+e.target.value)} style={{ width:'100%',padding:'9px 12px',borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.text,background:'#fff',outline:'none',fontFamily:"'Pretendard',sans-serif",boxSizing:'border-box' as const }} /></div>
            </div>

            {/* 종신형 기본지급률 */}
            <div style={{ background:'#F7F8FA', borderRadius:14, padding:'14px 16px', border:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:12, fontWeight:900, color:C.navy }}>종신형 기본지급률</span>
                <button onClick={()=>setAutoBaseRate(v=>!v)} style={{ padding:'4px 10px', borderRadius:8, border:`1px solid ${C.border}`, background:autoBaseRate?C.teal:'#fff', color:autoBaseRate?'#fff':C.slate, cursor:'pointer', fontSize:11, fontWeight:900, fontFamily:"'Pretendard',sans-serif" }}>
                  {autoBaseRate?'자동':'수동'}
                </button>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:24, fontWeight:950, color:C.blue }}>{effectiveBaseRate.toFixed(2)}%</span>
                {!autoBaseRate&&<input type="number" value={annuityBaseRate} min={1} max={20} step={0.1} onChange={e=>setAnnuityBaseRate(+e.target.value)} style={{ width:80,padding:'7px 10px',borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.text,background:'#fff',outline:'none',fontFamily:"'Pretendard',sans-serif",boxSizing:'border-box' as const }} />}
                <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>{subjectPensionAge}세 {gender==='male'?'남':'여'} 기준 자동 설정</span>
              </div>
            </div>

            {/* 세제혜택 */}
            <div style={{ background:'#F0F7FF', borderRadius:14, padding:'14px 16px', border:`1px solid ${C.border}` }}>
              <p style={{ margin:'0 0 10px', fontSize:13, fontWeight:900, color:C.navy }}>🧾 세제혜택 (세제적격 연금저축 기준)</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px,1fr))', gap:10 }}>
                {[
                  { label:'세액공제율', val:`${(creditRate*100).toFixed(1)}%`, color:C.blue },
                  { label:'연간 세액공제', val:fmtW3(annualTaxCredit), color:C.teal },
                  { label:`${payYears}년 총 절세`, val:fmtW3(annualTaxCredit*payYears), color:C.teal },
                  { label:'수령 시 연금소득세', val:fmtW3(pensionTaxAmt), color:C.rose },
                ].map(c2=>(
                  <div key={c2.label} style={{ background:'#fff', borderRadius:10, padding:'10px 12px', border:`1px solid ${C.border}` }}>
                    <p style={{ margin:'0 0 3px', fontSize:10, fontWeight:900, color:C.muted }}>{c2.label}</p>
                    <p style={{ margin:0, fontSize:15, fontWeight:950, color:c2.color }}>{c2.val}</p>
                  </div>
                ))}
              </div>
              <p style={{ margin:'10px 0 0', fontSize:11, fontWeight:700, color:C.blue }}>💡 연금소득세: 55~70세 5.5% / 70~80세 4.4% / 80세+ 3.3% (분리과세)</p>
            </div>

            {/* 변액 3시나리오 */}
            {productType==='variable'&&(
              <div style={{ background:'#fff', borderRadius:14, padding:'14px 16px', border:`1px solid ${C.border}` }}>
                <p style={{ margin:'0 0 12px', fontSize:13, fontWeight:900, color:C.navy }}>🔀 변액연금 3가지 시나리오</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {VAR3.map(s=>{
                    const r = pFV3(netMonthly, s.invest, payMonths)
                    const rD = deferYears>0?r*Math.pow(1+Math.max(0,s.invest)/100,deferYears):r
                    const eff = Math.max(rD, minGuarantee)
                    const m = payType==='lifetime'?eff*(effectiveBaseRate/100)/12:payType==='inherit'?rD*(annuityPayRate/100)/12:pMon3(eff,annuityPayRate,getMonths(payType))
                    return (
                      <div key={s.key} style={{ background:s.bg, borderRadius:12, padding:'13px 14px', border:`2px solid ${s.color}25` }}>
                        <p style={{ margin:'0 0 2px', fontSize:11, fontWeight:900, color:s.color }}>{s.label}</p>
                        <p style={{ margin:'0 0 8px', fontSize:10, fontWeight:700, color:C.muted }}>투자수익률 {s.invest}%</p>
                        {rD<minGuarantee&&<div style={{ background:`${s.color}15`, borderRadius:6, padding:'4px 8px', marginBottom:6, fontSize:10, fontWeight:900, color:s.color }}>🛡️ 최저보증 적용</div>}
                        <p style={{ margin:0, fontSize:18, fontWeight:950, color:s.color }}>{fmtW3(m)}<span style={{ fontSize:10 }}>/월</span></p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 달러연금 MetLife 비교 */}
            {isDollar&&(
              <div style={{ background:'rgba(34,87,122,0.06)', borderRadius:14, padding:'14px 16px', border:`2px solid #22577A30` }}>
                <p style={{ margin:'0 0 12px', fontSize:13, fontWeight:900, color:'#22577A' }}>🇺🇸 MetLife 달러연금보험 참고 (5년납 $310/월, 90세개시)</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {[
                    { label:'최저이율 0.7%', res:'$25,294', mon:'$1,084/년', color:'#C0392B' },
                    { label:'평균이율 2.5%', res:'$53,695', mon:'$2,515/년', color:C.blue },
                    { label:'현재이율 4.66%', res:'$177,781', mon:'$9,153/년', color:C.teal },
                  ].map(s=>(
                    <div key={s.label} style={{ background:'#fff', borderRadius:10, padding:'12px 13px', border:`1px solid ${C.border}` }}>
                      <p style={{ margin:'0 0 4px', fontSize:10, fontWeight:900, color:s.color }}>{s.label}</p>
                      <p style={{ margin:'0 0 3px', fontSize:12, fontWeight:700, color:C.muted }}>적립: {s.res}</p>
                      <p style={{ margin:0, fontSize:14, fontWeight:950, color:s.color }}>{s.mon}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 인포그래픽 차트 */}
            <PensionChart
              subjectAge={subjectAge} payYears={payYears} pensionStart={pensionStart} lifeExpect={lifeExpect}
              monthly={monthly} netMonthly={netMonthly} selMonthly={selMonthly}
              effectiveReserve={effectiveReserve} totalPaid={totalPaid} selTotal={selTotal}
              deferYears={deferYears} growthRate={growthRate} annuityPayRate={annuityPayRate}
              payType={payType} isDollar={isDollar} exchangeRate={exchangeRate} dollarTotalPaid={dollarTotalPaid}
            />

            {/* 주석 */}
            <p style={{ margin:0, color:C.muted, fontSize:10, fontWeight:700, lineHeight:1.8 }}>
              ※ 사업비 8% 공제 후 순보험료 기준 계산 / 기본지급률: 연금개시나이·성별 기반 자동 (KDB·IBK 실사례 참고)<br/>
              ※ 공시이율 2026.07 현재 2.42% / 달러연금 MetLife 4.66% / 기초연금 2026년 349,700원/월 (선정기준 소득하위 70%)<br/>
              ※ 세제혜택: 세제적격 연금저축 기준 (연 600만원 한도) / 실제 수령액은 공시이율·수익률 변동에 따라 상이할 수 있음
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
