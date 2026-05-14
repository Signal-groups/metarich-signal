"use client"

import { useMemo, useState } from "react"

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

type TabId = "retirement" | "compare" | "inflation" | "compound" | "variable"
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
  { id: "compare", label: "보험 vs 은행 저축", desc: "동일 납입 조건 수령액 비교" },
  { id: "inflation", label: "화폐가치 하락", desc: "물가 상승에 따른 구매력 변화" },
  { id: "compound", label: "복리 계산", desc: "일시납·월적립식과 거치기간" },
  { id: "variable", label: "코스트 애버리지", desc: "일시납과 월적립식 투자 비교" },
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
      {hint && <span style={{ color: C.blue, fontSize: 11, fontWeight: 700 }}>{hint}</span>}
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
    <div style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", background: "#EEF3F8", minHeight: "100vh", padding: "24px 18px 40px" }}>
      <div style={{ maxWidth: 1220, margin: "0 auto", display: "grid", gridTemplateColumns: "250px minmax(0,1fr)", gap: 18, alignItems: "start" }}>
        <aside style={{ position: "sticky", top: 76, background: C.navy, borderRadius: 22, padding: 16, color: "#fff", boxShadow: "0 16px 28px rgba(15,30,53,0.18)" }}>
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

        <main style={{ minWidth: 0, maxWidth: "100%", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 22, padding: 24, boxShadow: "0 12px 30px rgba(15,30,53,0.06)", overflow: "hidden" }}>
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
          {tab === "compare" && <CompareCalc />}
          {tab === "inflation" && <InflationCalc />}
          {tab === "compound" && <CompoundCalc age={state.age} />}
          {tab === "variable" && <VariableCalc />}
        </main>
      </div>
    </div>
  )
}

function RetirementCalc({ state, patch }: { state: typeof DEFAULT_STATE; patch: (next: Partial<typeof DEFAULT_STATE>) => void }) {
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

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section>
        <SectionTitle title="노후 생활 수준 미리보기" desc="고객이 필요한 월 생활비를 모를 때 4단계 예시로 먼저 감을 잡습니다." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
          {RETIREMENT_LEVELS.map((item) => (
            <button key={item.id} onClick={() => applyLevel(item.id)} style={{ border: `2px solid ${levelId === item.id ? C.blue : C.border}`, borderRadius: 14, background: levelId === item.id ? C.blueLight : "#fff", padding: 14, textAlign: "left", cursor: "pointer", minHeight: 118 }}>
              <strong style={{ display: "block", color: C.navy, fontSize: 14 }}>{item.title}</strong>
              <span style={{ display: "block", marginTop: 5, color: C.muted, fontSize: 11, fontWeight: 700, lineHeight: 1.45 }}>{item.subtitle}</span>
              <span style={{ display: "block", marginTop: 8, color: item.expense > item.income ? C.rose : C.teal, fontSize: 12, fontWeight: 900 }}>월 {fmt(item.expense)}원 기준</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
          <Metric label="선택 수준" value={level.title} tone={C.blue} sub={level.subtitle} />
          <Metric label="기준 월 생활비" value={`${fmt(level.expense)}원`} tone={level.expense > level.income ? C.rose : C.teal} />
          <Metric label="예시 월 수입" value={`${fmt(level.income)}원`} tone={C.gold} />
        </div>
        <button onClick={() => setImageLevelId(level.id)} style={{ marginTop: 12, width: "100%", border: `1px solid ${C.blue}33`, background: C.blueLight, color: C.blue, borderRadius: 14, padding: "13px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer" }}>
          선택한 노후 생활 예시 이미지 보기
        </button>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }}>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, background: "#fff" }}>
          <SectionTitle title="은퇴 목표 설정" desc="먼저 언제 은퇴하고 월 얼마가 필요한지 정합니다." />
          <div style={{ display: "grid", gridTemplateColumns: inputGrid(2), gap: 12, marginBottom: 12 }}>
            <InputRow label="현재 나이" value={state.age} onChange={(v) => patch({ age: v })} unit="세" />
            <InputRow label="은퇴 나이" value={state.retireAge} onChange={(v) => patch({ retireAge: v })} unit="세" />
            <InputRow label="기대 수명" value={state.lifeAge} onChange={(v) => patch({ lifeAge: v })} unit="세" />
            <MoneyInputRow label="희망 월 생활비" value={state.monthlyExpense} onChange={(v) => patch({ monthlyExpense: v })} />
          </div>
          <div style={{ background: C.goldLight, border: `1px solid ${C.gold}55`, borderRadius: 14, padding: 16, color: C.navy, fontSize: 13, fontWeight: 800, lineHeight: 1.7 }}>
            {level.quote}<br />
            <span style={{ color: C.slate, fontWeight: 700 }}>{level.point}</span>
          </div>
        </div>

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, background: "#fff" }}>
          <SectionTitle title="국민연금 계산기" desc="정확 조회가 아닌 상담용 간편 예상입니다." />
          <div style={{ display: "grid", gridTemplateColumns: inputGrid(2), gap: 12, marginBottom: 14 }}>
            <InputRow label="예상 가입기간" value={state.nationalJoinYears} onChange={(v) => patch({ nationalJoinYears: v })} unit="년" />
            <MoneyInputRow label="평균 월소득" value={state.nationalAvgIncome} onChange={(v) => patch({ nationalAvgIncome: v })} />
          </div>
          <Metric label="예상 국민연금 월 수령액" value={`${fmt(nationalPension)}원`} tone={C.teal} sub="국민연금공단 예상연금 조회와 차이가 있을 수 있습니다." />
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
            <Metric label="퇴직연금 월 환산액" value={`${fmt(selectedRetirementMonthly)}원`} tone={C.blue} sub={`${state.lifeAge - state.retireAge}년 동안 나눠 받는 기준`} />
            <Metric label="DC/IRP 예상 적립금" value={`${fmt(state.pensionType === "dc" ? dcLump : state.pensionType === "irp" ? irpLump : state.salary * state.workYears)}원`} tone={C.gold} />
          </div>
        </div>
      </section>

      <section style={{ border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <SectionTitle title="최종 노후자금 계산" desc="연금과 자산소득을 합산해 매월 부족한 금액과 지금부터 준비할 금액을 보여줍니다." />
          <button onClick={copySummary} style={{ border: "none", background: C.navy, color: C.gold, borderRadius: 12, padding: "12px 16px", fontSize: 12, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>
            {copied ? "복사 완료" : "상담자료 복사"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 14 }}>
          <Metric label="국민연금 반영액" value={`${fmt(nationalPension)}원`} tone={C.blue} sub="위 국민연금 계산기 결과" />
          <Metric label="퇴직연금 반영액" value={`${fmt(selectedRetirementMonthly)}원`} tone={C.gold} sub={`${state.pensionType.toUpperCase()} 계산 결과`} />
          <MoneyInputRow label="개인연금 월 수령" value={state.monthlyPrivatePension} onChange={(v) => patch({ monthlyPrivatePension: v })} />
          <MoneyInputRow label="자산소득 월 수입" value={state.monthlyAssetIncome} onChange={(v) => patch({ monthlyAssetIncome: v })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: inputGrid(2), gap: 12, marginBottom: 14 }}>
          <Metric label="월 예상 수입" value={`${fmt(totalIncome)}원`} tone={C.teal} />
          <Metric label="월 부족·여유" value={`${monthlyGap > 0 ? "-" : "+"}${fmt(Math.abs(monthlyGap))}원`} tone={monthlyGap > 0 ? C.rose : C.teal} />
        </div>
        <div style={{ background: monthlyGap > 0 ? C.roseLight : C.tealLight, border: `1px solid ${monthlyGap > 0 ? C.rose : C.teal}33`, borderRadius: 16, padding: 20 }}>
          <p style={{ margin: "0 0 8px", color: monthlyGap > 0 ? C.rose : C.teal, fontSize: 12, fontWeight: 900 }}>상담 요약</p>
          <p style={{ margin: 0, color: C.text, fontSize: 17, fontWeight: 900, lineHeight: 1.6 }}>
            {monthlyGap > 0
              ? `은퇴 후 ${state.lifeAge - state.retireAge}년 기준 총 ${fmtM(totalGap)}원이 부족합니다. 지금부터 매월 약 ${fmt(monthlySavingNeeded)}원씩 추가 준비가 필요합니다.`
              : `현재 입력 기준으로 월 ${fmt(Math.abs(monthlyGap))}원 정도 여유가 있습니다. 의료비와 간병비 장기화 변수만 별도로 점검하면 좋습니다.`}
          </p>
          <p style={{ margin: "12px 0 0", color: C.muted, fontSize: 12, fontWeight: 700, lineHeight: 1.6 }}>
            상담자료 복사는 현재 선택한 노후 생활 예시 이미지와 위 요약 문구를 함께 복사합니다. 일부 환경에서는 문구만 복사될 수 있습니다.
          </p>
        </div>
      </section>

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
  const [inp, setInp] = useState({ principal: 50000000, monthly: 500000, saveYears: 10, holdUntilAge: 65, rate: 5 })
  const [confirmed, setConfirmed] = useState(false)
  const saveMonths = inp.saveYears * 12
  const holdYears = Math.max(inp.holdUntilAge - age - inp.saveYears, 0)
  const rule72 = inp.rate > 0 ? Math.round((72 / inp.rate) * 10) / 10 : 0
  const saved = mode === "single"
    ? inp.principal * Math.pow(1 + inp.rate / 100, inp.saveYears)
    : futureValueMonthly(inp.monthly, inp.rate, saveMonths)
  const final = Math.round(saved * Math.pow(1 + inp.rate / 100, holdYears))
  const chartYears = Array.from({ length: Math.min(Math.max(inp.saveYears + holdYears, 1), 20) + 1 }, (_, index) => index)
  const chartValues = chartYears.map((year) => {
    if (mode === "single") return inp.principal * Math.pow(1 + inp.rate / 100, year)
    const savingYear = Math.min(year, inp.saveYears)
    const savingValue = futureValueMonthly(inp.monthly, inp.rate, savingYear * 12)
    return savingValue * Math.pow(1 + inp.rate / 100, Math.max(year - inp.saveYears, 0))
  })
  const chartMax = Math.max(...chartValues, 1)
  return (
    <div>
      <SectionTitle title="복리 계산" desc="일시납과 월적립식 중 선택하고, 저축기간 이후 거치기간까지 함께 계산합니다." />
      <MiniTabs value={mode} onChange={setMode} options={[{ id: "single", label: "일시납" }, { id: "monthly", label: "월적립식" }]} />
      <div style={{ display: "grid", gridTemplateColumns: inputGrid(4), gap: 12, background: C.slateLight, borderRadius: 16, padding: 18, margin: "16px 0", overflow: "hidden" }}>
        {mode === "single"
          ? <MoneyInputRow label="일시납 원금" value={inp.principal} onChange={(v) => setInp({ ...inp, principal: v })} />
          : <MoneyInputRow label="월 적립액" value={inp.monthly} onChange={(v) => setInp({ ...inp, monthly: v })} />}
        <InputRow label="저축기간" value={inp.saveYears} onChange={(v) => setInp({ ...inp, saveYears: v })} unit="년" />
        <InputRow label="거치 종료 나이" value={inp.holdUntilAge} onChange={(v) => setInp({ ...inp, holdUntilAge: v })} unit="세" hint={`현재 나이 ${age}세 기준`} />
        <InputRow label="연 수익률" value={inp.rate} onChange={(v) => setInp({ ...inp, rate: v })} unit="%" step={0.1} />
      </div>
      <button onClick={() => setConfirmed(true)} style={{ width: "100%", border: "none", background: C.navy, color: C.gold, borderRadius: 14, padding: "13px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer", marginBottom: 14 }}>
        계산 확인
      </button>
      <div style={{ display: "grid", gridTemplateColumns: inputGrid(3), gap: 12 }}>
        <Metric label="저축 종료 시점 금액" value={`${fmt(saved)}원`} tone={C.blue} />
        <Metric label="이후 거치기간" value={`${fmt(holdYears)}년`} tone={C.gold} />
        <Metric label="최종 예상 금액" value={`${fmt(final)}원`} tone={C.teal} />
      </div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "260px minmax(0,1fr)", gap: 14, alignItems: "stretch" }}>
        <div style={{ borderRadius: 16, background: C.goldLight, border: `1px solid ${C.gold}66`, padding: 18 }}>
          <p style={{ margin: 0, color: C.navy, fontSize: 13, fontWeight: 950 }}>72의 법칙</p>
          <p style={{ margin: "8px 0 0", color: C.text, fontSize: 26, fontWeight: 950 }}>{rule72 ? `약 ${rule72}년` : "-"}</p>
          <p style={{ margin: "6px 0 0", color: C.slate, fontSize: 12, fontWeight: 800, lineHeight: 1.5 }}>연 {inp.rate}% 수익률이면 원금이 2배가 되는 대략적인 시간입니다.</p>
        </div>
        <div style={{ borderRadius: 16, background: C.slateLight, padding: 18, minWidth: 0 }}>
          <p style={{ margin: "0 0 12px", color: C.slate, fontSize: 12, fontWeight: 950 }}>복리 성장 그래프</p>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${chartValues.length}, minmax(6px,1fr))`, gap: 5, alignItems: "end", height: 150 }}>
            {chartValues.map((value, index) => (
              <div key={index} title={`${index}년 ${fmt(value)}원`} style={{ height: Math.max(8, (value / chartMax) * 140), borderRadius: "8px 8px 3px 3px", background: index <= inp.saveYears ? C.blue : C.teal }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: C.muted, fontSize: 11, fontWeight: 800 }}>
            <span>시작</span><span>{chartYears[chartYears.length - 1]}년 후</span>
          </div>
        </div>
      </div>
      {confirmed && <ResultHero title="상담 포인트" tone={C.teal} body={`${mode === "single" ? "일시납" : "월적립식"} 기준으로 저축 후 ${holdYears}년 거치하면 최종 예상 금액은 약 ${fmt(final)}원입니다.`} />}
    </div>
  )
}

function VariableCalc() {
  const [inp, setInp] = useState({ lump: 6000000, monthly: 1000000, months: 6 })
  const [confirmed, setConfirmed] = useState(false)
  const [showVisual, setShowVisual] = useState(false)
  const months = Math.max(1, Math.min(Math.round(inp.months), 36))
  const prices = Array.from({ length: months }, (_, index) => dcaPriceAt(index))
  const endPrice = prices[prices.length - 1]
  const lumpQty = inp.lump / prices[0]
  const lumpValue = Math.round(lumpQty * endPrice)
  const monthlyQty = prices.reduce((sum, price) => sum + inp.monthly / price, 0)
  const monthlyPrincipal = inp.monthly * prices.length
  const monthlyValue = Math.round(monthlyQty * endPrice)
  return (
    <div>
      <SectionTitle title="코스트 애버리지 비교" desc="주가 상승·하락 상황에서 일시납과 월적립식 투자를 비교합니다." />
      <div style={{ display: "grid", gridTemplateColumns: inputGrid(3), gap: 12, background: C.slateLight, borderRadius: 16, padding: 18, marginBottom: 16, overflow: "hidden" }}>
        <MoneyInputRow label="일시납 투자금" value={inp.lump} onChange={(v) => setInp({ ...inp, lump: v })} />
        <MoneyInputRow label="월적립 투자금" value={inp.monthly} onChange={(v) => setInp({ ...inp, monthly: v })} />
        <InputRow label="비교 기간" value={inp.months} onChange={(v) => setInp({ ...inp, months: v })} unit="개월" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: inputGrid(2), gap: 10, marginBottom: 14 }}>
        <button onClick={() => setConfirmed(true)} style={{ border: "none", background: C.navy, color: C.gold, borderRadius: 14, padding: "13px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer" }}>
          계산 확인
        </button>
        <button onClick={() => setShowVisual(true)} style={{ border: `1px solid ${C.blue}33`, background: C.blueLight, color: C.blue, borderRadius: 14, padding: "13px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer" }}>
          비교 이미지 보기
        </button>
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
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.navy, color: C.gold }}>
              {["월", "주가", "월적립 매입수량", "누적수량"].map((head) => <th key={head} style={{ padding: 11, textAlign: "right" }}>{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {prices.map((price, index) => {
              const qty = inp.monthly / price
              const cum = prices.slice(0, index + 1).reduce((sum, p) => sum + inp.monthly / p, 0)
              return (
                <tr key={index} style={{ background: index % 2 ? C.slateLight : "#fff" }}>
                  <td style={{ padding: 10, textAlign: "right", fontWeight: 800 }}>{index + 1}월</td>
                  <td style={{ padding: 10, textAlign: "right" }}>{fmt(price)}원</td>
                  <td style={{ padding: 10, textAlign: "right" }}>{qty.toFixed(2)}좌</td>
                  <td style={{ padding: 10, textAlign: "right" }}>{cum.toFixed(2)}좌</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {showVisual && (
        <div onClick={() => setShowVisual(false)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,30,53,0.68)", padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(860px, 96vw)", background: "#fff", borderRadius: 22, overflow: "hidden", boxShadow: "0 28px 80px rgba(0,0,0,0.35)" }}>
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <p style={{ margin: 0, color: C.blue, fontSize: 11, fontWeight: 950, letterSpacing: "0.8px" }}>코스트 애버리지 이미지</p>
                <h3 style={{ margin: "4px 0 0", color: C.navy, fontSize: 20, fontWeight: 950 }}>일시납 vs 월적립식 비교</h3>
              </div>
              <button onClick={() => setShowVisual(false)} style={{ border: `1px solid ${C.border}`, background: "#fff", color: C.slate, width: 38, height: 38, borderRadius: 12, cursor: "pointer", fontSize: 20, fontWeight: 900 }}>×</button>
            </div>
            <div style={{ padding: 22, background: C.slateLight }}>
              <div style={{ display: "grid", gridTemplateColumns: inputGrid(2), gap: 14, marginBottom: 16 }}>
                <Metric label="일시납 평가" value={`${fmt(lumpValue)}원`} tone={C.blue} sub={`첫 달 ${fmt(prices[0])}원에 한 번 매수`} />
                <Metric label="월적립식 평가" value={`${fmt(monthlyValue)}원`} tone={C.teal} sub={`가격 변동마다 나눠 매수`} />
              </div>
              <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 18, padding: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${prices.length}, minmax(18px,1fr))`, gap: 7, alignItems: "end", height: 220, overflowX: "auto" }}>
                  {prices.map((price, index) => {
                    const h = Math.max(28, (price / Math.max(...prices)) * 180)
                    return (
                      <div key={index} style={{ display: "grid", gap: 8, alignItems: "end", textAlign: "center" }}>
                        <div style={{ height: h, borderRadius: "12px 12px 4px 4px", background: price <= prices[0] ? C.teal : C.blue, opacity: 0.9 }} />
                        <div>
                          <p style={{ margin: 0, color: C.text, fontSize: 12, fontWeight: 900 }}>{index + 1}월</p>
                          <p style={{ margin: "2px 0 0", color: C.muted, fontSize: 11, fontWeight: 700 }}>{fmt(price)}원</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <p style={{ margin: "14px 0 0", color: C.slate, fontSize: 13, fontWeight: 800, lineHeight: 1.6 }}>
                가격이 내려가는 구간에서는 월적립식이 더 많은 수량을 모을 수 있어 평균 매입 단가를 낮추는 상담 자료로 활용할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
