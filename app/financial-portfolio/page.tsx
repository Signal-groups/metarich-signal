"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import {
  Bar, BarChart, Cell, Pie, PieChart, RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import {
  BarChart3, Download, FileText, Lock, PieChart as PieChartIcon,
  Plus, Printer, Save, Trash2, UserRound,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { isApprovedUser, normalizeRole } from "../../lib/roles"

// ── 타입 ────────────────────────────────────────────────────────────────────
type SectionKey = "assets" | "liabilities" | "incomes" | "expenses"

type Entry = {
  id: string
  category: string
  consumptionType?: "소비지출" | "비소비지출" // expenses 전용
  name: string
  institution?: string
  amount: number    // 원 단위
  payment?: number
  rate?: number
  memo?: string
}

type GoalItem = {
  id: string
  horizon: '단기' | '중기' | '장기'   // 단기 1-3년 / 중기 3-7년 / 장기 7년+
  purpose: string                      // 목적 (예: 비상자금, 자녀교육, 노후준비)
  targetAmount: number                 // 목표금액 (원)
  periodYears: number                  // 기간 (년)
  memo?: string
}

type Proposal = {
  monthlyIncome: number
  totalExpense: number
  savingsIncrease: number
  insuranceOptimize: number
  debtReduction: number
  investmentAdd: number
  memo: string
  goals?: GoalItem[]                   // 목적자금 목표 목록
}

type InputMode = "simple" | "detail"

type SimpleDebtItem = {
  id: string
  name: string
  balance: number
  monthlyPayment: number
  remainingYears: number
  memo?: string
}

type SimpleDraft = {
  goals: GoalItem[]
  debts: SimpleDebtItem[]
  incomeSalary: number
  incomeBusiness: number
  incomeInterest: number
  incomeDividend: number
  incomePension: number
  incomeOther: number
  expenseLiving: number
  expenseUtilities: number
  expenseInsurance: number
  savingBank: number
  savingSecurities: number
  savingInsurance: number
  emergencyCurrent: number
  emergencyTarget: number
  proposalLiving: number
  proposalUtilities: number
  proposalInsurance: number
  proposalBank: number
  proposalSecurities: number
  proposalInsuranceSaving: number
  totalIncome: number
  totalExpense: number
  advisorOpinion: string
  financeMemo: string
  taxMemo: string
  coverageMemo: string
}

type ClientPortfolio = {
  id: string
  name: string
  age: number
  gender: string
  job: string
  creditGrade: number
  foodExpense: number
  memo: string
  advisorName: string
  assets: Entry[]
  liabilities: Entry[]
  incomes: Entry[]
  expenses: Entry[]
  proposal: Proposal
  updatedAt: string
}

type IndexItem = {
  key: string; label: string; value: number; unit: string
  score: number; status: string; tone: string; desc: string
}

// ── 상수 ────────────────────────────────────────────────────────────────────
const COLORS = ["#1E5FA8","#0E7E6B","#C9A84C","#C0392B","#7C3AED","#0EA5E9","#64748B","#F59E0B"]
const STORAGE_KEY = "mr-financial-portfolios"
const MAX_CLIENTS = 10

const EXPENSE_CATEGORIES: Record<"소비지출"|"비소비지출", string[]> = {
  소비지출: ["식비","생활비","교통/주유비","통신비","교육비","의료비","여가/문화","의류/쇼핑","기타 소비"],
  비소비지출: ["세금/4대보험","대출원리금","보장성보험","실손보험","종신보험","저축/투자","연금","기부","기타 비소비"],
}

const CREDIT_RATE_TABLE = [
  { grade:"1등급", creditLoan:"4.2~5.4%", mortgage:"3.6~4.5%", policyLoan:"약관 기준", note:"최우량, 한도·금리 협상력 높음" },
  { grade:"2등급", creditLoan:"4.8~6.0%", mortgage:"3.8~4.8%", policyLoan:"약관 기준", note:"우량, 주거래·소득증빙 유리" },
  { grade:"3등급", creditLoan:"5.5~7.0%", mortgage:"4.1~5.2%", policyLoan:"약관 기준", note:"양호, DSR·재직 안정성 중요" },
  { grade:"4등급", creditLoan:"6.5~8.5%", mortgage:"4.6~5.8%", policyLoan:"약관 기준", note:"보통, 기존 부채 정리가 금리에 영향" },
  { grade:"5등급", creditLoan:"8.0~11.0%", mortgage:"5.2~6.6%", policyLoan:"약관 기준", note:"주의, 단기부채·카드잔액 관리 필요" },
  { grade:"6등급", creditLoan:"10.5~14.5%", mortgage:"6.0~7.8%", policyLoan:"약관 기준", note:"고금리 가능성, 담보·보증 조건 확인" },
  { grade:"7등급 이하", creditLoan:"14.0% 이상", mortgage:"심사 제한", policyLoan:"개별 확인", note:"대환·연체관리·현금흐름 개선 우선" },
]

function row(id:string, category:string, name:string, institution:string, amount:number, payment=0, rate=0, consumptionType?: "소비지출"|"비소비지출"): Entry {
  return { id, category, consumptionType, name, institution, amount, payment, rate, memo:"" }
}

function createSimpleDraft(client: ClientPortfolio): SimpleDraft {
  const incomeBy = (keywords: string[]) => client.incomes
    .filter(i => keywords.some(k => i.category.includes(k) || i.name.includes(k)))
    .reduce((a,i)=>a+Number(i.amount||0),0)
  const expenseBy = (keywords: string[]) => client.expenses
    .filter(i => keywords.some(k => i.category.includes(k) || i.name.includes(k)))
    .reduce((a,i)=>a+Number(i.amount||0),0)
  const totalIncome = sum(client.incomes)
  const incomeSalary = incomeBy(["근로", "급여"])
  const incomeBusiness = incomeBy(["사업", "부업"])
  const incomeInterest = incomeBy(["이자", "금융"])
  const incomeDividend = incomeBy(["배당"])
  const incomePension = incomeBy(["연금"])
  const incomeOther = Math.max(totalIncome - incomeSalary - incomeBusiness - incomeInterest - incomeDividend - incomePension, 0)
  const expenseInsurance = client.expenses
    .filter(i => i.consumptionType === "비소비지출" && (i.category.includes("보험") || i.category.includes("보장") || i.category.includes("실손") || i.category.includes("종신") || i.name.includes("보험")))
    .reduce((a,i)=>a+Number(i.amount||0),0)
  const savingBank = expenseBy(["은행", "적금", "예금", "청약"])
  const savingSecurities = expenseBy(["증권", "ETF", "펀드", "주식"])
  const savingInsurance = client.expenses
    .filter(i => i.consumptionType === "비소비지출" && (i.category.includes("저축") || i.category.includes("투자") || i.category.includes("연금")) && (i.category.includes("보험") || i.name.includes("보험")))
    .reduce((a,i)=>a+Number(i.amount||0),0)
  const currentSavingTotal = savingBank + savingSecurities + savingInsurance
  const expenseUtilities = expenseBy(["공과금", "통신", "구독", "렌탈"])
  const expenseLiving = client.expenses
    .filter(i => i.consumptionType !== "비소비지출")
    .reduce((a,i)=>a+Number(i.amount||0),0) - expenseUtilities
  const totalExpense = Math.max(expenseLiving, 0) + expenseUtilities + expenseInsurance + currentSavingTotal
  const goals = ensureSimpleGoals(client.proposal.goals)
  const debts = ensureSimpleDebts(client.liabilities.map((item, index) => ({
    id: item.id || `simple-debt-${index}`,
    name: item.name || item.category || "대출",
    balance: Number(item.amount || 0),
    monthlyPayment: Number(item.payment || 0),
    remainingYears: Number(item.memo?.match(/(\d+)년/)?.[1] || 0),
    memo: item.memo || "",
  })))

  return {
    goals,
    debts,
    incomeSalary,
    incomeBusiness,
    incomeInterest,
    incomeDividend,
    incomePension,
    incomeOther,
    expenseLiving: Math.max(expenseLiving, 0),
    expenseUtilities,
    expenseInsurance,
    savingBank,
    savingSecurities,
    savingInsurance,
    emergencyCurrent: client.assets.find(i => i.category.includes("현금") || i.name.includes("비상") || i.name.includes("예비"))?.amount || 0,
    emergencyTarget: Math.max(totalIncome * 6, 0),
    proposalLiving: Math.max(expenseLiving, 0),
    proposalUtilities: expenseUtilities,
    proposalInsurance: expenseInsurance,
    proposalBank: savingBank,
    proposalSecurities: savingSecurities,
    proposalInsuranceSaving: savingInsurance,
    totalIncome,
    totalExpense,
    advisorOpinion: client.proposal.memo || "",
    financeMemo: "",
    taxMemo: "연금저축·IRP·ISA 등은 세액공제와 과세 방식이 달라 목적기간에 맞춰 선택합니다.",
    coverageMemo: "보장성 보험료는 유지 가능한 수준에서 중복 담보를 줄이고 핵심 보장을 우선합니다.",
  }
}

function goalHorizon(years: number): GoalItem["horizon"] {
  if (years <= 3) return "단기"
  if (years <= 7) return "중기"
  return "장기"
}

function blankGoal(index: number): GoalItem {
  return {
    id: `simple-goal-${index}`,
    horizon: index === 0 ? "단기" : index === 1 ? "중기" : "장기",
    purpose: "",
    targetAmount: 0,
    periodYears: index === 0 ? 2 : index === 1 ? 5 : 10,
    memo: "",
  }
}

function ensureSimpleGoals(goals?: GoalItem[]) {
  const normalized = [...(goals || [])]
  while (normalized.length < 3) normalized.push(blankGoal(normalized.length))
  return normalized
}

function blankDebt(index: number): SimpleDebtItem {
  const names = ["주택담보대출", "신용대출", "학자금대출"]
  return {
    id: `simple-debt-${index}`,
    name: names[index] || "기타 대출",
    balance: 0,
    monthlyPayment: 0,
    remainingYears: 0,
    memo: "",
  }
}

function ensureSimpleDebts(debts?: SimpleDebtItem[]) {
  const normalized = [...(debts || [])]
  if (normalized.length === 0) normalized.push(blankDebt(0))
  return normalized
}

function simpleTotals(draft: SimpleDraft) {
  const incomeTotal = draft.incomeSalary + draft.incomeBusiness + draft.incomeInterest + draft.incomeDividend + draft.incomePension + draft.incomeOther
  const debtPaymentTotal = ensureSimpleDebts(draft.debts).reduce((sumValue, debt) => sumValue + Number(debt.monthlyPayment || 0), 0)
  const debtBalanceTotal = ensureSimpleDebts(draft.debts).reduce((sumValue, debt) => sumValue + Number(debt.balance || 0), 0)
  const spendingTotal = draft.expenseLiving + draft.expenseUtilities + draft.expenseInsurance + debtPaymentTotal
  const savingTotal = draft.savingBank + draft.savingSecurities + draft.savingInsurance
  const expenseTotal = spendingTotal
  const outflowTotal = spendingTotal + savingTotal
  const savingCapacity = Math.max(incomeTotal - spendingTotal - savingTotal, 0)
  const proposedSpending = draft.proposalLiving + draft.proposalUtilities + draft.proposalInsurance
  const proposedSaving = draft.proposalBank + draft.proposalSecurities + draft.proposalInsuranceSaving
  const proposedExpense = proposedSpending + proposedSaving
  const proposedSavingCapacity = Math.max(incomeTotal - proposedSpending - proposedSaving, 0)
  const available = savingTotal + savingCapacity
  const proposedAvailable = proposedSaving + proposedSavingCapacity
  return {
    incomeTotal,
    spendingTotal,
    expenseTotal,
    outflowTotal,
    savingTotal,
    debtPaymentTotal,
    debtBalanceTotal,
    savingCapacity,
    proposedSpending,
    proposedExpense,
    proposedSaving,
    proposedSavingCapacity,
    available,
    proposedAvailable,
  }
}

const defaultProposal: Proposal = {
  monthlyIncome:0, totalExpense:0, savingsIncrease:0,
  insuranceOptimize:0, debtReduction:0, investmentAdd:0, memo:"", goals:[]
}

const starter: ClientPortfolio = {
  id:"sample", name:"샘플 고객", age:33, gender:"남", job:"직장인",
  creditGrade:3, foodExpense:650000, advisorName:"",
  memo:"재무정보와 현금흐름을 입력하고 진단지표와 제안서를 출력합니다.",
  updatedAt: new Date().toISOString(),
  proposal: defaultProposal,
  assets: [
    row("cash","현금","신한은행 예치금","신한은행",11000000),
    row("safe1","저축보험","저축보험","",17800000,200000,0),
    row("fund","펀드","미래에셋 펀드","미래에셋",32524545),
    row("estate1","부동산","주거용 부동산(남양주)","",550000000),
  ],
  liabilities: [
    row("loan1","단기부채","마이너스통장","",559079,0,3.85),
    row("loan3","장기부채","주택담보대출","",243203177,850000,2.16),
  ],
  incomes: [
    row("inc1","근로소득","급여","",3500000),
    row("inc2","사업소득","부업 수입","",500000),
    row("inc4","금융소득","임대소득","",950000),
  ],
  expenses: [
    row("exp1","식비","식비","",400000,0,0,"소비지출"),
    row("exp2","생활비","생활비/교통","",300000,0,0,"소비지출"),
    row("exp3","통신비","인터넷·휴대폰","",60000,0,0,"소비지출"),
    row("exp4","보장성보험","자녀보험","",63116,0,0,"비소비지출"),
    row("exp5","실손보험","실손보험","",30346,0,0,"비소비지출"),
    row("exp6","종신보험","종신보험","",83100,0,0,"비소비지출"),
    row("exp7","대출원리금","주택담보대출","",850000,0,0,"비소비지출"),
    row("exp8","저축/투자","저축보험","",200000,0,0,"비소비지출"),
    row("exp9","저축/투자","저축보험","",125000,0,0,"비소비지출"),
  ],
}

// ── 유틸 ────────────────────────────────────────────────────────────────────
const money = (v:number) => Math.round(Number(v)||0).toLocaleString("ko-KR")
const krw = (v:number) => `${money(v)}원`
const manwon = (v:number) => `${Math.round((Number(v)||0)/10000).toLocaleString("ko-KR")}만원`
const moneyWithUnit = (v:number) => `${krw(v)} (${manwon(v)})`
const percentValue = (v:number) => `${Number(v||0).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`
const pct = (v:number, t:number) => t>0 ? Math.round((v/t)*1000)/10 : 0
const sum = (items:Entry[]) => items.reduce((a,i)=>a+Number(i.amount||0),0)
const bounded = (v:number) => Math.max(0,Math.min(100,Math.round(v)))

function groupByCategory(items:Entry[]) {
  const grouped = new Map<string,number>()
  items.forEach(i=>grouped.set(i.category,(grouped.get(i.category)||0)+Number(i.amount||0)))
  return Array.from(grouped,([name,value])=>({name,value})).filter(i=>i.value>0).sort((a,b)=>b.value-a.value)
}

function loadClients(): ClientPortfolio[] {
  if (typeof window==="undefined") return [starter]
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return [starter]
    const parsed = JSON.parse(saved) as Partial<ClientPortfolio>[]
    if (!Array.isArray(parsed)||parsed.length===0) return [starter]
    return parsed.slice(0, MAX_CLIENTS).map(item=>({
      ...starter, ...item,
      creditGrade: Number(item.creditGrade||3),
      foodExpense: Number(item.foodExpense||0),
      assets: item.assets||[],
      liabilities: item.liabilities||[],
      incomes: item.incomes||[],
      expenses: item.expenses||[],
      proposal: { ...defaultProposal, ...(item.proposal||{}) },
    }))
  } catch { return [starter] }
}

function gradeFromScore(score:number) {
  if (score>=80) return "안정"
  if (score>=60) return "점검"
  return "주의"
}
function scoreFromLowerBetter(v:number,good:number,caution:number) {
  if (v<=good) return 90; if (v>=caution) return 35
  return 90-((v-good)/(caution-good))*55
}
function scoreFromHigherBetter(v:number,caution:number,good:number) {
  if (v>=good) return 90; if (v<=caution) return 35
  return 35+((v-caution)/(good-caution))*55
}
function getInvestorProfile(totals:{debtRatio:number;savingsRate:number;cashFlow:number}, age:number) {
  if (totals.cashFlow<0||totals.debtRatio>=65) return "방어형"
  if (age>=58||totals.savingsRate<10||totals.debtRatio>=45) return "안정형"
  if (age<=45&&totals.savingsRate>=25&&totals.debtRatio<35) return "성장형"
  return "균형형"
}
function getAllocation(profile:string) {
  if (profile==="방어형") return [
    {name:"비상자금/CMA",value:35,fill:"#1E5FA8"},{name:"부채상환",value:30,fill:"#C0392B"},
    {name:"채권/RP",value:25,fill:"#0E7E6B"},{name:"연금/보험",value:10,fill:"#C9A84C"},
  ]
  if (profile==="안정형") return [
    {name:"CMA/RP",value:20,fill:"#1E5FA8"},{name:"국고채/우량채",value:35,fill:"#0E7E6B"},
    {name:"연금/TDF",value:25,fill:"#C9A84C"},{name:"ETF/랩",value:15,fill:"#7C3AED"},{name:"달러자산",value:5,fill:"#0EA5E9"},
  ]
  if (profile==="성장형") return [
    {name:"CMA/RP",value:10,fill:"#1E5FA8"},{name:"채권",value:20,fill:"#0E7E6B"},
    {name:"ETF/랩",value:35,fill:"#7C3AED"},{name:"연금/TDF",value:20,fill:"#C9A84C"},{name:"달러/대체",value:15,fill:"#F59E0B"},
  ]
  return [
    {name:"CMA/RP",value:15,fill:"#1E5FA8"},{name:"채권/RP",value:30,fill:"#0E7E6B"},
    {name:"ETF/랩",value:25,fill:"#7C3AED"},{name:"연금/TDF",value:20,fill:"#C9A84C"},{name:"달러/대체",value:10,fill:"#F59E0B"},
  ]
}

// ── MoneyInput 컴포넌트 ──────────────────────────────────────────────────────
function MoneyInput({ value, onChange, placeholder, unit = "원" }: { value: number; onChange: (n: number) => void; placeholder?: string; unit?: string }) {
  const [raw, setRaw] = useState(value === 0 ? "" : value.toString())

  useEffect(() => {
    setRaw(value === 0 ? "" : value.toString())
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, "")
    setRaw(digits)
    onChange(Number(digits))
  }

  const displayValue = Number(raw || 0) > 0 ? Number(raw).toLocaleString("ko-KR") : ""

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ position: "relative" }}>
        <input
          value={displayValue}
          onChange={handleChange}
          onBlur={() => setRaw(value === 0 ? "" : value.toString())}
          placeholder={placeholder || "0"}
          inputMode="numeric"
          style={{ width: "100%", height: 34, border: 0, background: "#fff7bd", padding: "0 30px 0 8px", fontWeight: 800, outline: 0, color: "#172033", textAlign: "right" }}
        />
        <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 900, color: "#64748b", pointerEvents: "none" }}>
          {unit}
        </span>
      </div>
      {Number(raw || 0) > 0 && (
        <span style={{ fontSize: 10, color: "#64748b", textAlign: "right", fontWeight: 700 }}>
          {moneyWithUnit(Number(raw))}
        </span>
      )}
    </div>
  )
}

function RateInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [raw, setRaw] = useState(value === 0 ? "" : String(value))

  useEffect(() => {
    setRaw(value === 0 ? "" : String(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
    setRaw(next)
    onChange(Number(next || 0))
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        value={raw}
        onChange={handleChange}
        inputMode="decimal"
        placeholder="0"
        style={{ width: "100%", height: 34, border: 0, background: "#fff7bd", padding: "0 24px 0 8px", fontWeight: 800, outline: 0, color: "#172033", textAlign: "right" }}
      />
      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 900, color: "#64748b", pointerEvents: "none" }}>%</span>
    </div>
  )
}

// ── PDF 표지 컴포넌트 ─────────────────────────────────────────────────────────
function PdfCover({ client, today }: { client: ClientPortfolio; today: string }) {
  return (
    <div style={{
      width: "100%", minHeight: "297mm", background: "#10233e", color: "white",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: "60px 56px", boxSizing: "border-box", fontFamily: "'Noto Sans KR',sans-serif",
      pageBreakAfter: "always",
    }}>
      <div>
        <div style={{ fontSize: 12, letterSpacing: "0.2em", color: "#c9a84c", fontWeight: 900, marginBottom: 40, textTransform: "uppercase" }}>
          MetaRich Signal Group · Financial Planning Report
        </div>
        <div style={{ width: 60, height: 4, background: "#c9a84c", marginBottom: 32 }} />
        <div style={{ fontSize: 48, fontWeight: 950, lineHeight: 1.1, marginBottom: 16 }}>
          재무설계<br />포트폴리오
        </div>
        <div style={{ fontSize: 18, color: "#9ec5ef", fontWeight: 700, marginTop: 12 }}>
          Financial Portfolio Analysis & Proposal
        </div>
      </div>
      <div>
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "28px 32px", marginBottom: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 40px" }}>
            {[
              ["고객명", client.name],
              ["나이/성별", `${client.age}세 / ${client.gender}`],
              ["직업", client.job || "–"],
              ["신용등급", `${client.creditGrade}등급`],
              ["작성일", today],
              ["담당 설계사", client.advisorName || "–"],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: "#9ec5ef", fontWeight: 700, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
          본 보고서는 상담용 재무 분석 자료입니다. 실제 투자·대출 결정 전 전문가와 충분히 상담하시기 바랍니다.
        </div>
      </div>
    </div>
  )
}


// ── 포트폴리오 제안 섹션 (안정/중립/적극) ──────────────────────────────────
const SCENARIOS = [
  {
    type: '안정형' as const,
    color: '#0E7E6B', bg: '#ecfdf5', border: '#6ee7b7',
    rate: 0.035,
    label: '안정형 (Conservative)',
    expenseCutRatio: 0.05,
    products: [
      { from:'단기금융상품(CMA·MMF)', to:'고금리 정기예금·파킹통장', reason:'원금 보전 + 즉시 유동성' },
      { from:'주식형 펀드', to:'채권형 펀드·채권혼합형', reason:'변동성 축소, 안정 수익' },
      { from:'저금리 적금', to:'연 3.5~4.5% 특판 적금·ISA', reason:'세제 혜택 + 확정금리' },
      { from:'만기 임박 보험', to:'보장 리모델링 후 저축성→보장성 전환', reason:'보험료 최적화' },
    ],
    goalRates: { '단기': 0.030, '중기': 0.035, '장기': 0.040 },
    description: '원금 보전이 최우선. 안정적인 확정금리 상품 중심으로 현금흐름을 강화하고 비상자금을 먼저 확보합니다.',
  },
  {
    type: '중립형' as const,
    color: '#1E5FA8', bg: '#eff6ff', border: '#93c5fd',
    rate: 0.055,
    label: '중립형 (Balanced)',
    expenseCutRatio: 0.10,
    products: [
      { from:'단기금융상품(CMA·MMF)', to:'ISA 계좌(채권+ETF 균형)', reason:'세제 혜택 + 중수익' },
      { from:'단순 예금 적립', to:'TDF·연금저축펀드(주식50%+채권50%)', reason:'장기 복리 + 세액공제' },
      { from:'고금리 신용대출', to:'대환대출 → 상환 가속화', reason:'이자 절감 → 투자 재원 확보' },
      { from:'만기 임박 저축보험', to:'해지환급금 → 연금전환 또는 ETF', reason:'수익률 개선' },
    ],
    goalRates: { '단기': 0.035, '중기': 0.055, '장기': 0.065 },
    description: '안정성과 성장성을 균형 있게 배분. 세제 혜택 상품(ISA·연금저축)을 최대 활용하고 단계적 자산 성장을 추구합니다.',
  },
  {
    type: '적극형' as const,
    color: '#C0392B', bg: '#fff7ed', border: '#fca5a5',
    rate: 0.075,
    label: '적극형 (Aggressive)',
    expenseCutRatio: 0.15,
    products: [
      { from:'예금·적금 중심', to:'ETF 적립식 투자(국내+해외 분산)', reason:'장기 고수익 추구' },
      { from:'채권형 펀드', to:'성장주 ETF·테마ETF·리츠', reason:'자산 성장 가속화' },
      { from:'연금저축 보수형', to:'연금저축펀드(주식형 100%)', reason:'장기 수익 극대화 + 세액공제' },
      { from:'유지 중 저축보험', to:'해지 후 ETF 전환 + 보장 분리', reason:'수익률 월등 개선 기대' },
    ],
    goalRates: { '단기': 0.040, '중기': 0.065, '장기': 0.080 },
    description: '장기 자산 성장이 목표. 변동성을 감수하고 ETF·성장주 중심으로 고수익을 추구. 비상자금 확보 후 투자 비중 확대.',
  },
]

// 월 납입액 계산: 복리 가정 PMT = FV * r / ((1+r)^n - 1)
function calcMonthlyPmt(targetAmount: number, periodYears: number, annualRate: number): number {
  if (periodYears <= 0 || targetAmount <= 0) return 0
  const r = annualRate / 12
  const n = periodYears * 12
  if (r === 0) return targetAmount / n
  return Math.round(targetAmount * r / (Math.pow(1 + r, n) - 1))
}

// 현재 지출에서 절감 가능 항목 분석
function analyzeExpenseCuts(expenses: Entry[], cutRatio: number): { name: string; current: number; target: number; saving: number }[] {
  const consumption = expenses.filter(e => e.consumptionType === '소비지출' || !e.consumptionType)
  const cuttable = [
    '여가/문화', '의류/쇼핑', '식비', '교통/주유비', '통신비', '생활비', '기타 소비',
  ]
  return consumption
    .filter(e => cuttable.some(k => e.category.includes(k) || e.name.includes(k)))
    .map(e => ({
      name: e.name || e.category,
      current: e.amount,
      target: Math.round(e.amount * (1 - cutRatio)),
      saving: Math.round(e.amount * cutRatio),
    }))
    .filter(e => e.saving > 0)
    .sort((a, b) => b.saving - a.saving)
    .slice(0, 5)
}

// 기본 목적자금 자동 생성
function autoGoals(client: ClientPortfolio, freeCapacity: number): GoalItem[] {
  const goals: GoalItem[] = []
  const uid = () => Math.random().toString(36).slice(2, 8)
  const totalAssets = client.assets.reduce((s, a) => s + Number(a.amount || 0), 0)
  const totalIncome = client.incomes.reduce((s, i) => s + Number(i.amount || 0), 0)
  const hasEmergency = totalAssets >= totalIncome * 6
  if (!hasEmergency)
    goals.push({ id: uid(), horizon: '단기', purpose: '비상자금 확보', targetAmount: totalIncome * 6, periodYears: 2, memo: '월 소득 6개월치 목표' })

  const hasHome = client.assets.some(a => a.category.includes('부동산') || a.name.includes('아파트') || a.name.includes('주택'))
  if (!hasHome && client.age < 40)
    goals.push({ id: uid(), horizon: '중기', purpose: '주택 마련 자금', targetAmount: 50000000, periodYears: 5, memo: '전세→자가 전환 목표' })

  const hasChild = (client.memo || '').includes('자녀') || client.job.includes('자녀')
  if (client.age < 50)
    goals.push({ id: uid(), horizon: '중기', purpose: '자녀 교육비', targetAmount: 30000000, periodYears: 7, memo: '대학 입학 전까지 준비' })

  const retireAge = 65
  const retireYears = Math.max(retireAge - client.age, 10)
  goals.push({ id: uid(), horizon: '장기', purpose: '노후 준비 자금', targetAmount: totalIncome * 12 * 20, periodYears: retireYears, memo: `${retireAge}세 은퇴 기준, 20년 생활비` })

  goals.push({ id: uid(), horizon: '장기', purpose: '부채 완전 상환', targetAmount: client.liabilities.reduce((s, l) => s + Number(l.amount || 0), 0), periodYears: Math.min(retireYears, 15), memo: '은퇴 전 부채 제로 목표' })

  return (client.proposal.goals && client.proposal.goals.length > 0) ? client.proposal.goals : goals
}

function PortfolioProposalSection({ client, totals }: {
  client: ClientPortfolio
  totals: { totalIncome: number; totalExpense: number; cashFlow: number; savingsRate: number; debtRatio: number }
}) {
  const [activeTab, setActiveTab] = useState<'안정형'|'중립형'|'적극형'>('중립형')
  const sc = SCENARIOS.find(s => s.type === activeTab)!
  const goals = autoGoals(client, totals.cashFlow)

  // 지출 절감 분석
  const cuts = analyzeExpenseCuts(client.expenses, sc.expenseCutRatio)
  const totalCutSaving = cuts.reduce((s, c) => s + c.saving, 0)

  // 현재 보험료 (비소비지출 > 보험 항목)
  const insuranceItems = client.expenses.filter(e =>
    e.consumptionType === '비소비지출' &&
    (e.category.includes('보험') || e.name.includes('보험') || e.name.includes('보장') || e.name.includes('실손') || e.name.includes('종신'))
  )
  const totalInsurance = insuranceItems.reduce((s, e) => s + e.amount, 0)
  const optimizedInsurance = Math.round(totalInsurance * (1 - sc.expenseCutRatio * 0.5))

  const statedSavingCapacity = Number(client.proposal.investmentAdd || client.proposal.savingsIncrease || 0)
  const freeCapacityAfter = Math.max(totals.cashFlow, statedSavingCapacity) + totalCutSaving + (totalInsurance - optimizedInsurance)

  return (
    <section className="fp-panel" style={{ pageBreakBefore: 'always', breakInside: 'avoid' }}>
      <div className="fp-panel-title"><FileText className="h-5 w-5" />포트폴리오 제안 — 안정 · 중립 · 적극형</div>
      <div className="fp-panel-body">

        {/* 탭 (화면) / 전체 출력 (인쇄) */}
        <div className="fp-proposal-tabs" style={{ display:'flex', gap:8, marginBottom:20 }}>
          {SCENARIOS.map(s => (
            <button key={s.type}
              onClick={() => setActiveTab(s.type)}
              style={{
                padding:'8px 20px', borderRadius:8, fontSize:13, fontWeight:900, cursor:'pointer',
                border:`2px solid ${s.border}`,
                background: activeTab === s.type ? s.color : '#fff',
                color: activeTab === s.type ? '#fff' : s.color,
                transition:'all .15s',
              }}
            >{s.label}</button>
          ))}
        </div>

        {/* 화면: 선택된 탭만 / 인쇄: 모두 */}
        {SCENARIOS.map(scenario => (
          <div key={scenario.type}
            className="fp-scenario-block"
            style={{
              display: activeTab === scenario.type ? 'block' : 'none',
              border:`2px solid ${scenario.border}`, borderRadius:12,
              overflow:'hidden', marginBottom:16,
            }}
          >
            {/* 시나리오 헤더 */}
            <div style={{ background: scenario.color, padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:16, fontWeight:900, color:'#fff' }}>{scenario.label}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.8)', marginTop:3 }}>{scenario.description}</div>
              </div>
              <div style={{ textAlign:'right', color:'#fff' }}>
                <div style={{ fontSize:11, opacity:.7 }}>예상 수익률</div>
                <div style={{ fontSize:22, fontWeight:900 }}>{(scenario.rate * 100).toFixed(1)}%/년</div>
              </div>
            </div>

            <div style={{ padding:'16px 20px', background: scenario.bg, display:'grid', gap:20 }}>

              {/* ① 지출 절감 방안 */}
              <div>
                <div style={{ fontSize:13, fontWeight:900, color: scenario.color, marginBottom:10, borderLeft:`3px solid ${scenario.color}`, paddingLeft:10 }}>
                  ① 지출 절감 방안 — 월 {krw(totalCutSaving)} 절감 가능
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background: scenario.color }}>
                      {['지출 항목','현재 지출','절감 목표','절감액/월'].map(h =>
                        <th key={h} style={{ padding:'7px 10px', color:'#fff', fontWeight:900, textAlign:h==='지출 항목'?'left':'right', border:'1px solid rgba(255,255,255,0.2)' }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {cuts.length === 0
                      ? <tr><td colSpan={4} style={{ padding:'12px', textAlign:'center', color:'#64748b' }}>소비지출 항목을 입력하면 절감 분석이 표시됩니다.</td></tr>
                      : cuts.map((c, i) => (
                        <tr key={i} style={{ background: i%2===0 ? '#fff' : scenario.bg }}>
                          <td style={{ padding:'7px 10px', fontWeight:700, border:'1px solid #e2e8f0' }}>{c.name}</td>
                          <td style={{ padding:'7px 10px', textAlign:'right', border:'1px solid #e2e8f0' }}>{krw(c.current)}</td>
                          <td style={{ padding:'7px 10px', textAlign:'right', border:'1px solid #e2e8f0', color: scenario.color, fontWeight:800 }}>{krw(c.target)}</td>
                          <td style={{ padding:'7px 10px', textAlign:'right', border:'1px solid #e2e8f0', fontWeight:900, color:'#0E7E6B' }}>▼ {krw(c.saving)}</td>
                        </tr>
                      ))
                    }
                    {cuts.length > 0 && (
                      <tr style={{ background: scenario.color }}>
                        <td colSpan={3} style={{ padding:'7px 10px', fontWeight:900, color:'#fff', border:'1px solid rgba(255,255,255,0.2)' }}>월 총 절감액</td>
                        <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:900, color:'#fff', border:'1px solid rgba(255,255,255,0.2)' }}>▼ {krw(totalCutSaving)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ② 금융상품 변경 방안 */}
              <div>
                <div style={{ fontSize:13, fontWeight:900, color: scenario.color, marginBottom:10, borderLeft:`3px solid ${scenario.color}`, paddingLeft:10 }}>
                  ② 금융상품 변경 방안
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background: scenario.color }}>
                      {['현재 상품','→ 변경 제안','변경 이유'].map(h =>
                        <th key={h} style={{ padding:'7px 10px', color:'#fff', fontWeight:900, textAlign:'left', border:'1px solid rgba(255,255,255,0.2)' }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {scenario.products.map((p, i) => (
                      <tr key={i} style={{ background: i%2===0 ? '#fff' : scenario.bg }}>
                        <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', color:'#64748b' }}>{p.from}</td>
                        <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', fontWeight:800, color: scenario.color }}>{p.to}</td>
                        <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', fontSize:11, color:'#374151' }}>{p.reason}</td>
                      </tr>
                    ))}
                    {insuranceItems.length > 0 && (
                      <tr style={{ background:'#fef3c7' }}>
                        <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', color:'#64748b' }}>현재 보험료 합계 {krw(totalInsurance)}/월</td>
                        <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', fontWeight:800, color:'#b45309' }}>리모델링 후 목표 {krw(optimizedInsurance)}/월</td>
                        <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', fontSize:11, color:'#374151' }}>중복담보 제거, 불필요 특약 정리로 보험료 절감</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ③ 단기/중기/장기 목적자금 계획 */}
              <div>
                <div style={{ fontSize:13, fontWeight:900, color: scenario.color, marginBottom:10, borderLeft:`3px solid ${scenario.color}`, paddingLeft:10 }}>
                  ③ 목적자금별 저축 계획  (현재 투자가능액 {krw(freeCapacityAfter)}/월 기준)
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background: scenario.color }}>
                      {['구분','목적','목표금액','기간','필요 월적립','대응 방안','우선순위'].map(h =>
                        <th key={h} style={{ padding:'7px 10px', color:'#fff', fontWeight:900, textAlign:h==='목표금액'||h==='필요 월적립'?'right':'left', border:'1px solid rgba(255,255,255,0.2)' }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {goals.length === 0
                      ? <tr><td colSpan={7} style={{ padding:'12px', textAlign:'center', color:'#64748b' }}>목적자금을 입력하면 계획이 표시됩니다.</td></tr>
                      : goals.map((g, i) => {
                          const rate = scenario.goalRates[g.horizon]
                          const pmt = calcMonthlyPmt(g.targetAmount, g.periodYears, rate)
                          const horizonColor = g.horizon==='단기' ? '#0E7E6B' : g.horizon==='중기' ? '#1E5FA8' : '#7C3AED'
                          const actionMap: Record<string, string> = {
                            '비상자금': 'CMA·파킹통장 자동이체',
                            '주택': 'ISA + 청약저축 병행',
                            '교육': '어린이펀드·교육보험',
                            '노후': '연금저축펀드 + IRP 세액공제',
                            '부채': '원금 추가상환 월정기이체',
                          }
                          const action = Object.entries(actionMap).find(([k]) => g.purpose.includes(k))?.[1] || '적립식 투자'
                          return (
                            <tr key={g.id} style={{ background: i%2===0 ? '#fff' : scenario.bg }}>
                              <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', textAlign:'center' }}>
                                <span style={{ background: horizonColor, color:'#fff', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:900 }}>{g.horizon}</span>
                              </td>
                              <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', fontWeight:800 }}>{g.purpose}</td>
                              <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', textAlign:'right', fontWeight:800 }}>{krw(g.targetAmount)}</td>
                              <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', textAlign:'center' }}>{g.periodYears}년</td>
                              <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', textAlign:'right', fontWeight:900, color: scenario.color }}>{krw(pmt)}</td>
                              <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', fontSize:11 }}>{action}</td>
                              <td style={{ padding:'7px 10px', border:'1px solid #e2e8f0', textAlign:'center', fontSize:11, fontWeight:900, color:'#64748b' }}>#{i+1}</td>
                            </tr>
                          )
                        })
                    }
                    {goals.length > 0 && (
                      <tr style={{ background: scenario.color }}>
                        <td colSpan={4} style={{ padding:'7px 10px', color:'#fff', fontWeight:900, border:'1px solid rgba(255,255,255,0.2)' }}>월 총 필요 적립액</td>
                        <td style={{ padding:'7px 10px', textAlign:'right', color:'#fff', fontWeight:900, border:'1px solid rgba(255,255,255,0.2)' }}>
                          {krw(goals.reduce((s, g) => s + calcMonthlyPmt(g.targetAmount, g.periodYears, scenario.goalRates[g.horizon]), 0))}
                        </td>
                        <td colSpan={2} style={{ padding:'7px 10px', color:'rgba(255,255,255,0.8)', fontSize:11, border:'1px solid rgba(255,255,255,0.2)' }}>
                          투자가능액 대비 {krw(freeCapacityAfter - goals.reduce((s, g) => s + calcMonthlyPmt(g.targetAmount, g.periodYears, scenario.goalRates[g.horizon]), 0))} {freeCapacityAfter - goals.reduce((s, g) => s + calcMonthlyPmt(g.targetAmount, g.periodYears, scenario.goalRates[g.horizon]), 0) >= 0 ? '여유' : '부족'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── 제안 전/후 비교 섹션 ─────────────────────────────────────────────────────
function BeforeAfterSection({ client, totals }: {
  client: ClientPortfolio
  totals: { totalIncome: number; totalExpense: number; cashFlow: number; savingsRate: number; debtRatio: number }
}) {
  const p = client.proposal
  const afterIncome = p.monthlyIncome || totals.totalIncome
  const afterExpense = p.totalExpense || (totals.totalExpense - p.insuranceOptimize - p.debtReduction)
  const afterCashFlow = afterIncome - afterExpense
  const afterSavings = totals.totalExpense > 0 ? pct(afterCashFlow + p.savingsIncrease, afterIncome) : 0

  const rows = [
    { label: "월 소득", before: totals.totalIncome, after: afterIncome, unit: "원", higher: true },
    { label: "월 지출", before: totals.totalExpense, after: afterExpense, unit: "원", higher: false },
    { label: "잉여 현금", before: totals.cashFlow, after: afterCashFlow, unit: "원", higher: true },
    { label: "저축가능률", before: totals.savingsRate, after: Math.min(afterSavings + p.savingsIncrease / Math.max(afterIncome, 1) * 100, 80), unit: "%", higher: true },
    { label: "보험료 절감", before: 0, after: p.insuranceOptimize, unit: "원/월", higher: true },
    { label: "추가 투자액", before: 0, after: p.investmentAdd, unit: "원/월", higher: true },
  ]

  return (
    <section className="fp-panel" style={{ pageBreakBefore: "always" }}>
      <div className="fp-panel-title"><FileText className="h-5 w-5" />제안 전/후 비교</div>
      <div className="fp-panel-body">
        <div className="fp-table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["구분","현재(제안 전)","제안 후","변화"].map(h=>(
                  <th key={h} style={{ background:"#eaf2f8",color:"#10233e",fontSize:12,fontWeight:950,padding:"9px 12px",border:"1px solid #cbd7e5",textAlign:h==="현재(제안 전)"||h==="제안 후"?"right":"left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const diff = r.after - r.before
                const isPositive = r.higher ? diff > 0 : diff < 0
                const isNeutral = diff === 0
                return (
                  <tr key={r.label}>
                    <td style={{ border:"1px solid #dce4ef",padding:"8px 12px",fontSize:13,fontWeight:800,background:"#f8fafc" }}>{r.label}</td>
                    <td style={{ border:"1px solid #dce4ef",padding:"8px 12px",fontSize:13,fontWeight:800,textAlign:"right" }}>
                      {r.before === 0 ? "–" : (r.unit === "%" ? percentValue(r.before) : krw(r.before))}
                    </td>
                    <td style={{ border:"1px solid #dce4ef",padding:"8px 12px",fontSize:13,fontWeight:900,textAlign:"right",color:"#1E5FA8" }}>
                      {r.after === 0 ? "–" : (r.unit === "%" ? percentValue(r.after) : krw(r.after))}
                    </td>
                    <td style={{ border:"1px solid #dce4ef",padding:"8px 12px",fontSize:13,fontWeight:900,color: isNeutral?"#64748b":isPositive?"#0E7E6B":"#C0392B" }}>
                      {isNeutral ? "–" : `${diff > 0 ? "▲" : "▼"} ${r.unit === "%" ? percentValue(Math.abs(diff)) : krw(Math.abs(diff))}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {p.memo && (
          <div style={{ marginTop: 14, background: "#f0f7ff", border: "1px solid #dbeafe", borderRadius: 8, padding: "12px 16px" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e40af", whiteSpace: "pre-wrap" }}>{p.memo}</p>
          </div>
        )}
      </div>
    </section>
  )
}

function SimpleLandscapeReport({ client, draft, today }: { client: ClientPortfolio; draft: SimpleDraft; today: string }) {
  const totals = simpleTotals(draft)
  const goals = ensureSimpleGoals(draft.goals).filter(g => g.purpose.trim() || g.targetAmount > 0)
  const monthlyNeed = goals.reduce((sumValue, goal) => sumValue + calcMonthlyPmt(goal.targetAmount, Math.max(goal.periodYears || 1, 1), 0.04), 0)
  const currentRate = pct(totals.available, monthlyNeed)
  const proposedRate = pct(totals.proposedAvailable, monthlyNeed)
  const emergencyRate = pct(draft.emergencyCurrent, draft.emergencyTarget)
  const annualIncome = totals.incomeTotal * 12
  const pensionTaxRate = annualIncome <= 55000000 ? 16.5 : 13.2
  const pensionTaxMax = Math.round(9000000 * (pensionTaxRate / 100))
  const beforeRows = [
    { label: "월 총수입", value: totals.incomeTotal, color: "#1E5FA8" },
    { label: "실제지출", value: totals.expenseTotal, color: "#C0392B" },
    { label: "현재저축", value: totals.savingTotal, color: "#0E7E6B" },
    { label: "남은 저축여력", value: totals.savingCapacity, color: "#C9A84C" },
  ]
  const afterRows = [
    { label: "제안 후 지출", value: totals.proposedSpending, color: "#C0392B" },
    { label: "제안 후 저축", value: totals.proposedSaving, color: "#0E7E6B" },
    { label: "제안 후 여력", value: totals.proposedSavingCapacity, color: "#C9A84C" },
    { label: "제안 후 준비액", value: totals.proposedAvailable, color: "#1E5FA8" },
  ]
  const allocationRows = [
    { label: "은행", current: draft.savingBank, proposed: draft.proposalBank, tip: "비상금·1~3년 단기자금" },
    { label: "증권", current: draft.savingSecurities, proposed: draft.proposalSecurities, tip: "ISA·ETF·중장기 목적자금" },
    { label: "보험", current: draft.savingInsurance, proposed: draft.proposalInsuranceSaving, tip: "연금·보장 목적 장기자금" },
  ]

  return (
    <div className="fp-landscape-report">
      <section className="fp-landscape-page">
        <header className="fp-landscape-head">
          <div>
            <p>FINANCIAL PORTFOLIO</p>
            <h1>{client.name || "고객"}님 목적자금 달성 제안서</h1>
            <span>{today} · {client.advisorName || "담당 설계사"}</span>
          </div>
          <div className="fp-landscape-badge">간단 입력 기준</div>
        </header>

        <div className="fp-landscape-kpis">
          <ReportKpi label="현재 목적자금 달성률" value={`${Math.round(currentRate)}%`} sub={`필요 ${krw(monthlyNeed)}/월`} tone="#C0392B" />
          <ReportKpi label="제안 후 달성률" value={`${Math.round(proposedRate)}%`} sub={`준비 가능 ${krw(totals.proposedAvailable)}/월`} tone="#0E7E6B" />
          <ReportKpi label="비상금 준비율" value={`${Math.round(emergencyRate)}%`} sub={`${manwon(draft.emergencyCurrent)} / ${manwon(draft.emergencyTarget)}`} tone="#1E5FA8" />
          <ReportKpi label="남은 저축여력" value={krw(totals.savingCapacity)} sub="총수입 - 실제지출 - 현재저축" tone="#C9A84C" />
        </div>

        <div className="fp-landscape-grid">
          <div className="fp-report-card span-2">
            <h2>목적자금 달성 현황</h2>
            <div className="fp-goal-report-list">
              {goals.map((goal, index) => {
                const need = calcMonthlyPmt(goal.targetAmount, Math.max(goal.periodYears || 1, 1), 0.04)
                const rate = pct(totals.available, need)
                const proposed = pct(totals.proposedAvailable, need)
                return (
                  <div key={goal.id || index} className="fp-goal-report-row">
                    <div>
                      <strong>{goal.purpose || `목적자금 ${index + 1}`}</strong>
                      <span>{manwon(goal.targetAmount)} · {goal.periodYears}년 준비</span>
                    </div>
                    <div className="fp-goal-bars">
                      <ReportBar label="현재" value={rate} tone="#C0392B" />
                      <ReportBar label="제안" value={proposed} tone="#0E7E6B" />
                    </div>
                    <b>{krw(need)}/월</b>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="fp-report-card">
            <h2>현재 구조</h2>
            {beforeRows.map(rowItem => <ReportMiniBar key={rowItem.label} {...rowItem} max={Math.max(...beforeRows.map(r => r.value), 1)} />)}
          </div>

          <div className="fp-report-card">
            <h2>제안 후 구조</h2>
            {afterRows.map(rowItem => <ReportMiniBar key={rowItem.label} {...rowItem} max={Math.max(...afterRows.map(r => r.value), 1)} />)}
            <div className="fp-report-delta">제안 후 월 준비 가능액 {krw(Math.max(totals.proposedAvailable - totals.available, 0))} 증가</div>
          </div>
        </div>

        <footer className="fp-landscape-opinion">
          <strong>작성자 의견</strong>
          <p>{draft.advisorOpinion || "현재 현금흐름과 저축구조를 목적자금에 맞춰 조정하면 달성 가능성이 높아집니다."}</p>
        </footer>
      </section>

      <section className="fp-landscape-page">
        <header className="fp-landscape-head compact">
          <div>
            <p>PROPOSAL DETAILS</p>
            <h1>제안 전후 변화와 실행 방향</h1>
          </div>
          <div className="fp-landscape-badge">가로 A4 출력</div>
        </header>

        <div className="fp-landscape-grid three-col">
          <div className="fp-report-card"><h2>어떤 금융을 이용할까</h2><p>{draft.financeMemo || "단기자금은 은행성 상품, 중장기 목적자금은 증권·연금 계좌를 함께 활용하는 방식이 적합합니다."}</p></div>
          <div className="fp-report-card"><h2>세금 참고사항</h2><p>{draft.taxMemo}</p></div>
          <div className="fp-report-card"><h2>보장 개선 포인트</h2><p>{draft.coverageMemo}</p></div>
        </div>

        <div className="fp-report-card wide">
          <h2>제안 전후 핵심 비교</h2>
          <div className="fp-before-after-table">
            <div><span>항목</span><span>현재</span><span>제안 후</span><span>변화</span></div>
            <div><b>월 실제지출</b><span>{krw(totals.expenseTotal)}</span><span>{krw(totals.proposedSpending)}</span><em>{krw(totals.expenseTotal - totals.proposedSpending)}</em></div>
            <div><b>월 저축</b><span>{krw(totals.savingTotal)}</span><span>{krw(totals.proposedSaving)}</span><em>{krw(totals.proposedSaving - totals.savingTotal)}</em></div>
            <div><b>남은 저축여력</b><span>{krw(totals.savingCapacity)}</span><span>{krw(totals.proposedSavingCapacity)}</span><em>{krw(totals.proposedSavingCapacity - totals.savingCapacity)}</em></div>
            <div><b>부채 상환</b><span>{krw(totals.debtPaymentTotal)}</span><span>{krw(totals.debtPaymentTotal)}</span><em>대출잔액 {manwon(totals.debtBalanceTotal)}</em></div>
            <div><b>목적자금 달성률</b><span>{Math.round(currentRate)}%</span><span>{Math.round(proposedRate)}%</span><em>{Math.round(proposedRate - currentRate)}%p</em></div>
          </div>
        </div>

        <div className="fp-report-card wide">
          <h2>은행 · 증권 · 보험 배분 제안</h2>
          <div className="fp-allocation-compare">
            {allocationRows.map(rowItem => (
              <div key={rowItem.label}>
                <strong>{rowItem.label}</strong>
                <span>현재 {krw(rowItem.current)} → 제안 {krw(rowItem.proposed)}</span>
                <em>{rowItem.tip}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fp-landscape-page">
        <header className="fp-landscape-head compact">
          <div>
            <p>PORTFOLIO OPTIONS</p>
            <h1>안정 · 중립 · 적극형 예시와 세액공제 팁</h1>
          </div>
          <div className="fp-landscape-badge">상담 설명용</div>
        </header>

        <div className="fp-landscape-grid three-col">
          {SCENARIOS.map(scenario => (
            <div key={scenario.type} className="fp-report-card scenario" style={{ borderTopColor: scenario.color }}>
              <h2>{scenario.label}</h2>
              <p>{scenario.description}</p>
            </div>
          ))}
        </div>

        <div className="fp-report-card wide">
          <h2>연말정산 세액공제 팁</h2>
          <p>연금저축은 연 600만원, 연금저축+IRP 합산은 연 900만원까지 세액공제 한도로 활용할 수 있습니다. 총급여 5,500만원 이하 기준 세액공제율은 16.5%, 초과 구간은 13.2%로 계산하며, 현재 연소득 기준 예상 최대 공제효과는 약 {krw(pensionTaxMax)}입니다. ISA는 중장기 투자 수익의 과세 부담을 낮추는 계좌로 함께 검토하면 좋습니다.</p>
        </div>

        <div className="fp-report-card wide">
          <h2>상담 메시지</h2>
          <p>현재 구조에서는 실제지출과 기존 저축을 제외한 남은 저축여력이 핵심입니다. 제안안은 생활비, 보험료, 대출상환 부담을 점검하고 은행·증권·보험의 역할을 나누어 목적기간에 맞춘 달성률을 높이는 방향입니다.</p>
        </div>
      </section>
    </div>
  )
}

function ReportKpi({ label, value, sub, tone }: { label:string; value:string; sub:string; tone:string }) {
  return <div className="fp-report-kpi" style={{ borderTopColor: tone }}><span>{label}</span><strong style={{ color: tone }}>{value}</strong><em>{sub}</em></div>
}

function ReportBar({ label, value, tone }: { label:string; value:number; tone:string }) {
  return <div className="fp-report-bar"><span>{label}</span><div><i style={{ width: `${Math.min(value, 100)}%`, background: tone }} /></div><b>{Math.round(value)}%</b></div>
}

function ReportMiniBar({ label, value, color, max }: { label:string; value:number; color:string; max:number }) {
  return <div className="fp-mini-bar"><div><span>{label}</span><b>{krw(value)}</b></div><i><em style={{ width: `${Math.max((value / max) * 100, 4)}%`, background: color }} /></i></div>
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function FinancialPortfolioPage() {
  const router = useRouter()
  const coverRef = useRef<HTMLDivElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const simpleReportRef = useRef<HTMLDivElement>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [advisorId, setAdvisorId] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientPortfolio[]>(() => loadClients())
  const [selectedId, setSelectedId] = useState(starter.id)
  const [isExporting, setIsExporting] = useState(false)
  const [syncStatus, setSyncStatus] = useState<"idle"|"saving"|"saved"|"error">("idle")
  const [uploadStatus, setUploadStatus] = useState<"idle"|"loading"|"ok"|"error">("idle")
  const [uploadMsg, setUploadMsg] = useState("")
  const [inputMode, setInputMode] = useState<InputMode>("simple")
  const [simpleDraft, setSimpleDraft] = useState<SimpleDraft>(() => createSimpleDraft(starter))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace(`/login?redirectTo=${encodeURIComponent("/financial-portfolio")}`); return }
      // users + portfolios 병렬 조회
      const [{ data: userData }, { data: rows, error }] = await Promise.all([
        supabase.from("users").select("*").eq("id", session.user.id).maybeSingle(),
        supabase.from("financial_portfolios").select("id, portfolio").order("updated_at", { ascending: false }),
      ])
      const userInfo = userData || session.user
      const role = normalizeRole(userInfo)
      const isPlannerOrAbove = ["agent","manager","leader","headquarters","master"].includes(role)
      if (!(role === "master" || (isPlannerOrAbove && isApprovedUser(userInfo)))) { setAllowed(false); return }
      setAdvisorId(session.user.id)
      if (!error && rows && rows.length > 0) {
        const loaded = rows.slice(0, MAX_CLIENTS).map(r => ({ ...starter, ...(r.portfolio as Partial<ClientPortfolio>), id: r.id as string }))
        setClients(loaded); setSelectedId(loaded[0].id)
      }
      setAllowed(true)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!advisorId || allowed !== true) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSyncStatus("saving")
    saveTimerRef.current = setTimeout(async () => {
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(clients))
      const upserts = clients.map(c => ({ id: c.id, advisor_id: advisorId, name: c.name, portfolio: c as unknown as Record<string,unknown>, updated_at: new Date().toISOString() }))
      const { error } = await supabase.from("financial_portfolios").upsert(upserts, { onConflict: "id" })
      setSyncStatus(error ? "error" : "saved")
      setTimeout(() => setSyncStatus("idle"), 2500)
    }, 2000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [clients, advisorId, allowed])

  const client = clients.find(i => i.id === selectedId) || clients[0] || starter

  useEffect(() => {
    setSimpleDraft(createSimpleDraft(client))
  }, [client.id])

  const totals = useMemo(() => {
    const totalAssets = sum(client.assets)
    const totalLiabilities = sum(client.liabilities)
    const totalIncome = sum(client.incomes)
    const totalExpense = sum(client.expenses)
    const loanPayments = client.liabilities.reduce((a,i)=>a+Number(i.payment||0),0)
    const savingExpense = client.expenses.filter(i=>i.consumptionType==="비소비지출"&&(i.category.includes("저축")||i.category.includes("투자")||i.category.includes("연금"))).reduce((a,i)=>a+Number(i.amount||0),0)
    const protectionExpense = client.expenses.filter(i=>i.consumptionType==="비소비지출"&&(i.category.includes("보험")||i.category.includes("보장")||i.category.includes("실손")||i.category.includes("종신"))).reduce((a,i)=>a+Number(i.amount||0),0)
    const consumptionTotal = client.expenses.filter(i=>i.consumptionType==="소비지출"||!i.consumptionType).reduce((a,i)=>a+Number(i.amount||0),0)
    const nonConsumptionTotal = client.expenses.filter(i=>i.consumptionType==="비소비지출").reduce((a,i)=>a+Number(i.amount||0),0)
    const foodExpense = client.expenses
      .filter(i => i.consumptionType !== "비소비지출" && (i.category.includes("식비") || i.name.includes("식비")))
      .reduce((a,i)=>a+Number(i.amount||0),0)
    return {
      totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities,
      totalIncome, totalExpense, cashFlow: totalIncome - totalExpense,
      loanPayments, savingExpense, protectionExpense, consumptionTotal, nonConsumptionTotal,
      savingsRate: pct(totalIncome - totalExpense, totalIncome),
      debtRatio: pct(totalLiabilities, totalAssets),
      engelIndex: pct(foodExpense, totalIncome),
      fixedExpenseRatio: pct(loanPayments + protectionExpense, totalIncome),
    }
  }, [client])

  const financialIndexes = useMemo<IndexItem[]>(() => {
    const items = [
      { key:"debt", label:"부채비율", value:totals.debtRatio, unit:"%", score:scoreFromLowerBetter(totals.debtRatio,35,70), desc:"총자산 대비 부채 비중. 35% 이하 안정, 70% 이상 구조 점검." },
      { key:"cashflow", label:"현금흐름지수", value:totals.savingsRate, unit:"%", score:scoreFromHigherBetter(totals.savingsRate,0,25), desc:"월 소득에서 지출 후 남는 비율. 비상자금·저축 여력 핵심 지표." },
      { key:"engel", label:"앵겔지수", value:totals.engelIndex, unit:"%", score:scoreFromLowerBetter(totals.engelIndex,15,30), desc:"월 소득 중 식비 비중. 높으면 생활비 구조 개선 여지가 큽니다." },
      { key:"fixed", label:"고정지출부담률", value:totals.fixedExpenseRatio, unit:"%", score:scoreFromLowerBetter(totals.fixedExpenseRatio,35,55), desc:"대출상환+보험료 소득 대비 비중. 줄이기 어려운 지출의 압박도." },
      { key:"credit", label:"신용등급지수", value:client.creditGrade, unit:"등급", score:bounded(100-(client.creditGrade-1)*11), desc:"낮은 등급일수록 대출 금리·한도 조건이 불리해집니다." },
    ]
    return items.map(i => ({ ...i, score:bounded(i.score), status:gradeFromScore(i.score), tone:i.score>=80?"#0E7E6B":i.score>=60?"#C9A84C":"#C0392B" }))
  }, [client.creditGrade, totals])

  const currentCreditRate = CREDIT_RATE_TABLE[Math.min(Math.max(client.creditGrade,1),7)-1] || CREDIT_RATE_TABLE[6]
  const investorProfile = getInvestorProfile(totals, client.age)
  const allocationData = getAllocation(investorProfile)
  const simpleCalc = simpleTotals(simpleDraft)
  const simpleGoals = ensureSimpleGoals(simpleDraft.goals)
  const simpleDebts = ensureSimpleDebts(simpleDraft.debts)

  const updateClient = (patch: Partial<ClientPortfolio>) =>
    setClients(prev => prev.map(i => i.id === client.id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i))

  const updateEntry = (section: SectionKey, id: string, patch: Partial<Entry>) =>
    updateClient({ [section]: client[section].map(i => i.id === id ? { ...i, ...patch } : i) } as Partial<ClientPortfolio>)

  const addEntry = (section: SectionKey) =>
    updateClient({ [section]: [...client[section], row(crypto.randomUUID(),"기타","새 항목","",0,0,0, section==="expenses"?"소비지출":undefined)] } as Partial<ClientPortfolio>)

  const removeEntry = (section: SectionKey, id: string) =>
    updateClient({ [section]: client[section].filter(i => i.id !== id) } as Partial<ClientPortfolio>)

  const updateSimpleDraft = (patch: Partial<SimpleDraft>) =>
    setSimpleDraft(prev => {
      const next = { ...prev, ...patch }
      const totals = simpleTotals(next)
      return { ...next, totalIncome: totals.incomeTotal, totalExpense: totals.expenseTotal }
    })

  const applySimpleInput = () => {
    const totals = simpleTotals(simpleDraft)
    const activeGoals = ensureSimpleGoals(simpleDraft.goals)
      .filter(g => g.purpose.trim() || g.targetAmount > 0)
      .map((g, index) => ({
        ...g,
        id: g.id || `simple-goal-${index}`,
        horizon: goalHorizon(g.periodYears || 1),
        purpose: g.purpose || `목적자금 ${index + 1}`,
        periodYears: Math.max(1, g.periodYears || 1),
        memo: g.memo || "간단 입력으로 설정한 목적자금",
      }))
    const activeDebts = ensureSimpleDebts(simpleDraft.debts)
      .filter(debt => debt.name.trim() || debt.balance > 0 || debt.monthlyPayment > 0)

    updateClient({
      incomes: [
        row("simple-income-salary", "근로소득", "근로", "", simpleDraft.incomeSalary),
        row("simple-income-business", "사업소득", "사업", "", simpleDraft.incomeBusiness),
        row("simple-income-interest", "이자소득", "이자", "", simpleDraft.incomeInterest),
        row("simple-income-dividend", "배당소득", "배당", "", simpleDraft.incomeDividend),
        row("simple-income-pension", "연금소득", "연금", "", simpleDraft.incomePension),
        row("simple-income-other", "기타소득", "기타", "", simpleDraft.incomeOther),
      ],
      assets: [
        ...client.assets.filter(a => a.id !== "simple-emergency"),
        row("simple-emergency", "현금", "비상금(예비비)", "", simpleDraft.emergencyCurrent),
      ],
      liabilities: activeDebts.map((debt, index) =>
        row(
          debt.id || `simple-debt-${index}`,
          debt.name.includes("주택") ? "장기부채" : debt.name.includes("학자금") ? "학자금대출" : "대출",
          debt.name || `대출 ${index + 1}`,
          "",
          debt.balance,
          debt.monthlyPayment,
          0,
        )
      ).map((debtRow, index) => ({
        ...debtRow,
        memo: activeDebts[index]?.remainingYears ? `${activeDebts[index].remainingYears}년 남음` : activeDebts[index]?.memo || "",
      })),
      expenses: [
        row("simple-exp-living", "생활비", "생활비", "", simpleDraft.expenseLiving, 0, 0, "소비지출"),
        row("simple-exp-utilities", "공과금/통신", "공과금·통신·구독·렌탈", "", simpleDraft.expenseUtilities, 0, 0, "소비지출"),
        row("simple-exp-insurance", "보장성보험", "보험료(보장)", "", simpleDraft.expenseInsurance, 0, 0, "비소비지출"),
        ...activeDebts
          .filter(debt => debt.monthlyPayment > 0)
          .map((debt, index) => row(`simple-debt-payment-${index}`, "대출원리금", debt.name || `대출 ${index + 1}`, "", debt.monthlyPayment, 0, 0, "비소비지출")),
        row("simple-save-bank", "저축/투자", "은행 저축", "은행", simpleDraft.savingBank, 0, 0, "비소비지출"),
        row("simple-save-securities", "저축/투자", "증권 저축", "증권", simpleDraft.savingSecurities, 0, 0, "비소비지출"),
        row("simple-save-insurance", "저축/투자", "보험 저축", "보험", simpleDraft.savingInsurance, 0, 0, "비소비지출"),
      ],
      proposal: {
        ...client.proposal,
        monthlyIncome: totals.incomeTotal,
        totalExpense: totals.proposedSpending,
        savingsIncrease: Math.max(totals.proposedAvailable - totals.available, 0),
        insuranceOptimize: Math.max(simpleDraft.expenseInsurance - simpleDraft.proposalInsurance, 0),
        investmentAdd: totals.proposedAvailable,
        memo: simpleDraft.advisorOpinion,
        goals: activeGoals,
      },
    })
  }

  const addClient = () => {
    if (clients.length >= MAX_CLIENTS) {
      alert(`고객은 최대 ${MAX_CLIENTS}명까지 임시 저장할 수 있습니다.`)
      return
    }
    const id = crypto.randomUUID()
    setClients(prev => [...prev, { ...starter, id, name:"신규 고객", assets:[], liabilities:[], incomes:[], expenses:[], proposal:defaultProposal, updatedAt:new Date().toISOString() }])
    setSelectedId(id)
  }

  const deleteClient = async () => {
    if (clients.length <= 1) return
    await supabase.from("financial_portfolios").delete().eq("id", client.id)
    const filtered = clients.filter(i => i.id !== client.id)
    setClients(filtered); setSelectedId(filtered[0].id)
  }

  const exportPdf = async () => {
    setIsExporting(true)
    const today = new Date().toLocaleDateString("ko-KR")
    const isSimple = inputMode === "simple"
    const pdf = new jsPDF("l","mm","a4")
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()

    const renderDiv = async (el: HTMLElement) => {
      const canvas = await html2canvas(el, { scale:2, backgroundColor:"#ffffff", useCORS:true, logging:false })
      return canvas
    }

    const addCanvasToPdf = (canvas: HTMLCanvasElement, isFirst: boolean) => {
      const imgData = canvas.toDataURL("image/jpeg", 0.92)
      const imgH = (canvas.height * pageW) / canvas.width
      let heightLeft = imgH
      let position = 0
      if (!isFirst) pdf.addPage()
      pdf.addImage(imgData,"JPEG",0,position,pageW,imgH)
      heightLeft -= pageH
      while (heightLeft > 0) {
        position = heightLeft - imgH
        pdf.addPage()
        pdf.addImage(imgData,"JPEG",0,position,pageW,imgH)
        heightLeft -= pageH
      }
    }

    if (isSimple && simpleReportRef.current) {
      simpleReportRef.current.style.display = "block"
      await new Promise(r=>setTimeout(r,100))
      const canvas = await renderDiv(simpleReportRef.current)
      simpleReportRef.current.style.display = "none"
      addCanvasToPdf(canvas, true)
      pdf.save(`${client.name || "고객"}_재무설계_간단제안서_${today}.pdf`)
      setIsExporting(false)
      return
    }

    // 표지 렌더링
    if (coverRef.current) {
      coverRef.current.style.display = "block"
      await new Promise(r=>setTimeout(r,100))
      const coverCanvas = await renderDiv(coverRef.current)
      coverRef.current.style.display = "none"
      addCanvasToPdf(coverCanvas, true)
    }

    // 본문 렌더링
    if (reportRef.current) {
      const reportCanvas = await renderDiv(reportRef.current)
      addCanvasToPdf(reportCanvas, false)
    }

    pdf.save(`${client.name || "고객"}_재무설계_포트폴리오_${today}.pdf`)
    setIsExporting(false)
  }

  if (allowed === null) return (
    <Shell><div className="fp-empty">
      <div style={{ width:40,height:40,border:"4px solid #dce4ef",borderTop:"4px solid #1E5FA8",borderRadius:"50%",animation:"fp-spin 0.8s linear infinite" }} />
      <p style={{ color:"#64748b",fontWeight:800 }}>권한 확인 중...</p>
    </div></Shell>
  )
  if (!allowed) return (
    <Shell><div className="fp-empty">
      <Lock className="h-9 w-9" />
      <h1>설계사 이상 전용 페이지입니다</h1>
      <p>승인된 설계사 등급 이상만 이용할 수 있습니다.</p>
      <button onClick={()=>router.push("/dashboard")} style={{ marginTop:12,height:42,padding:"0 20px",borderRadius:8,background:"#10233e",color:"#fff",border:0,fontWeight:900,cursor:"pointer" }}>← 대시보드로 돌아가기</button>
    </div></Shell>
  )

  const today = new Date().toLocaleDateString("ko-KR", { year:"numeric",month:"2-digit",day:"2-digit" })
  const assetData = groupByCategory(client.assets)
  const liabilityData = groupByCategory(client.liabilities)
  const incomeData = groupByCategory(client.incomes)
  const expenseConsumptionData = groupByCategory(client.expenses.filter(e=>e.consumptionType==="소비지출"))
  const expenseNonConsumptionData = groupByCategory(client.expenses.filter(e=>e.consumptionType==="비소비지출"))

  return (
    <Shell>
      {/* PDF 전용 표지 (평소엔 숨김) */}
      <div ref={coverRef} style={{ display:"none", position:"fixed", top:0, left:0, width:"210mm", zIndex:-1 }}>
        <PdfCover client={client} today={today} />
      </div>
      <div ref={simpleReportRef} style={{ display:"none", position:"fixed", top:0, left:0, width:"297mm", zIndex:-1 }}>
        <SimpleLandscapeReport client={client} draft={simpleDraft} today={today} />
      </div>

      <main className="fp-page">
        <header className="fp-hero">
          <div>
            <p>Financial Portfolio Workspace</p>
            <h1>재무설계 포트폴리오</h1>
            <span>재무정보, 현금흐름, 가계 재무지표, 자산배분전략을 PDF로 출력합니다.</span>
          </div>
          <div className="fp-actions">
            <button onClick={()=>router.push("/dashboard")} style={{ background:"rgba(201,168,76,0.2)",borderColor:"rgba(201,168,76,0.4)",color:"#c9a84c" }}>← 대시보드</button>
            {syncStatus==="saving" && <span style={{ fontSize:12,color:"#9ec5ef",fontWeight:800 }}>저장 중...</span>}
            {syncStatus==="saved"  && <span style={{ fontSize:12,color:"#4ade80",fontWeight:800 }}>✓ 저장됨</span>}
            {syncStatus==="error"  && <span style={{ fontSize:12,color:"#f87171",fontWeight:800 }}>⚠ 저장 실패</span>}
            <button onClick={()=>window.print()}><Printer className="h-4 w-4" /> 인쇄</button>
            <button onClick={exportPdf} disabled={isExporting}><Download className="h-4 w-4" /> {isExporting?"PDF 생성중...":"PDF 저장"}</button>
          </div>
        </header>

        <section className="fp-profile fp-profile-top">
          <Input label="고객명" value={client.name} onChange={v=>updateClient({name:v})} span="span-2" />
          <Input label="나이" value={String(client.age)} type="number" onChange={v=>updateClient({age:Number(v)})} span="span-1" />
          <Input label="성별" value={client.gender} onChange={v=>updateClient({gender:v})} />
          <Input label="직업" value={client.job||""} onChange={v=>updateClient({job:v})} span="span-2" />
          <Input label="신용등급" value={String(client.creditGrade)} type="number" onChange={v=>updateClient({creditGrade:Math.min(7,Math.max(1,Number(v)||1))})} />
          <Input label="담당 설계사" value={client.advisorName||""} onChange={v=>updateClient({advisorName:v})} span="span-2" />
          <Input label="상담 메모" value={client.memo} onChange={v=>updateClient({memo:v})} span="span-3" />
        </section>

        <section className="fp-clientbar">
          <label>
            <UserRound className="h-4 w-4" />
            <select value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
              {clients.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>
          <button onClick={addClient} disabled={clients.length>=MAX_CLIENTS}><Plus className="h-4 w-4" /> 고객 추가 ({clients.length}/{MAX_CLIENTS})</button>
          <button onClick={deleteClient} disabled={clients.length<=1}><Trash2 className="h-4 w-4" /> 삭제</button>
          <button onClick={()=>updateClient({ updatedAt:new Date().toISOString() })}><Save className="h-4 w-4" /> 저장</button>

          {/* ── 엑셀 업로드 버튼 ── */}
          <button
            onClick={()=>fileInputRef.current?.click()}
            disabled={uploadStatus==="loading"}
            style={{ background:"#0e7e6b", color:"#fff", border:"none", borderRadius:8,
              padding:"0 14px", height:38, fontWeight:700, fontSize:13, cursor:"pointer",
              display:"flex", alignItems:"center", gap:6, opacity: uploadStatus==="loading" ? 0.6 : 1 }}
          >
            <FileText className="h-4 w-4" />
            {uploadStatus==="loading" ? "업로드 중..." : "엑셀 파일 업로드"}
          </button>
          <a
            href="/재무현황입력양식.xlsx"
            download
            style={{ background:"#1a2744", color:"#c9a96e", border:"1px solid #c9a96e", borderRadius:8,
              padding:"0 14px", height:38, fontWeight:700, fontSize:13, cursor:"pointer",
              display:"flex", alignItems:"center", gap:6, textDecoration:"none" }}
          >
            <Download className="h-4 w-4" /> 양식 다운로드
          </a>
          {uploadMsg && (
            <span style={{ fontSize:12, color: uploadStatus==="ok" ? "#4ade80" : "#f87171", fontWeight:700 }}>
              {uploadMsg}
            </span>
          )}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }}
            onChange={async e => {
              const file = e.target.files?.[0]
              if (!file) return
              setUploadStatus("loading"); setUploadMsg("")
              try {
                const fd = new FormData(); fd.append("file", file)
                const res = await fetch("/api/financial-portfolio/import", { method:"POST", body:fd })
                const json = await res.json()
                if (!res.ok || !json.ok) { setUploadStatus("error"); setUploadMsg(json.error || "파싱 실패"); return }
                const d = json.data
                // 기존 고객명 매칭
                const match = clients.find(c => c.name === d.customerName)
                if (match) {
                  setClients(prev => prev.map(c => c.id === match.id ? {
                    ...c,
                    age: d.age ?? c.age, gender: d.gender ?? c.gender,
                    job: d.job ?? c.job, creditGrade: d.creditGrade ?? c.creditGrade,
                    memo: d.memo ?? c.memo,
                    assets: d.assets, liabilities: d.liabilities,
                    incomes: d.incomes, expenses: d.expenses,
                    updatedAt: new Date().toISOString(),
                  } : c))
                  setSelectedId(match.id)
                  setUploadStatus("ok"); setUploadMsg(`✓ "${d.customerName}" 고객 데이터 업데이트 완료`)
                } else {
                  if (clients.length >= MAX_CLIENTS) {
                    setUploadStatus("error"); setUploadMsg(`고객은 최대 ${MAX_CLIENTS}명까지 임시 저장할 수 있습니다.`); return
                  }
                  // 신규 고객 생성
                  const newId = Math.random().toString(36).slice(2,10)
                  const newClient: ClientPortfolio = {
                    ...starter, id: newId, name: d.customerName,
                    age: d.age ?? 0, gender: d.gender ?? "", job: d.job ?? "",
                    creditGrade: d.creditGrade ?? 5, memo: d.memo ?? "",
                    assets: d.assets, liabilities: d.liabilities,
                    incomes: d.incomes, expenses: d.expenses,
                    updatedAt: new Date().toISOString(),
                  }
                  setClients(prev => [...prev, newClient])
                  setSelectedId(newId)
                  setUploadStatus("ok"); setUploadMsg(`✓ "${d.customerName}" 신규 고객 생성 완료`)
                }
              } catch {
                setUploadStatus("error"); setUploadMsg("업로드 중 오류 발생")
              } finally {
                e.target.value = ""
                setTimeout(()=>{ setUploadStatus("idle"); setUploadMsg("") }, 5000)
              }
            }}
          />
        </section>

        <section className="fp-mode-panel">
          <div className="fp-mode-tabs">
            <button
              type="button"
              onClick={() => setInputMode("simple")}
              className={inputMode === "simple" ? "active" : ""}
            >
              간단 입력
            </button>
            <button
              type="button"
              onClick={() => setInputMode("detail")}
              className={inputMode === "detail" ? "active" : ""}
            >
              상세 입력
            </button>
          </div>

          {inputMode === "simple" && (
            <div className="fp-simple-panel">
              <div className="fp-simple-head">
                <div>
                  <strong>목적자금 중심 간단 입력</strong>
                  <span>상담 초반에는 꼭 필요한 항목만 입력하고, 필요하면 상세 입력에서 세부 항목을 조정하세요.</span>
                </div>
                <button type="button" onClick={applySimpleInput}>간단 입력 적용</button>
              </div>

              <div className="fp-simple-subtitle">
                <strong>목적자금</strong>
                <button
                  type="button"
                  onClick={() => updateSimpleDraft({ goals: [...simpleGoals, blankGoal(simpleGoals.length)] })}
                >
                  + 목적 추가
                </button>
              </div>
              <div className="fp-simple-goals">
                {simpleGoals.map((goal, index) => (
                  <div key={goal.id || index} className="fp-simple-goal-row">
                    <input
                      value={goal.purpose}
                      onChange={e => {
                        const goals = [...simpleGoals]
                        goals[index] = { ...goal, purpose: e.target.value }
                        updateSimpleDraft({ goals })
                      }}
                      placeholder={`목적자금 ${index + 1}`}
                    />
                    <MoneyInput
                      value={goal.targetAmount}
                      onChange={v => {
                        const goals = [...simpleGoals]
                        goals[index] = { ...goal, targetAmount: v }
                        updateSimpleDraft({ goals })
                      }}
                    />
                    <input
                      type="number"
                      min={1}
                      value={goal.periodYears || ""}
                      onChange={e => {
                        const years = Number(e.target.value)
                        const goals = [...simpleGoals]
                        goals[index] = { ...goal, periodYears: years, horizon: goalHorizon(years || 1) }
                        updateSimpleDraft({ goals })
                      }}
                      placeholder="기간(년)"
                    />
                    {simpleGoals.length > 3 && (
                      <button
                        type="button"
                        className="fp-simple-remove"
                        onClick={() => updateSimpleDraft({ goals: simpleGoals.filter((_, i) => i !== index) })}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="fp-simple-subtitle">
                <strong>부채 현황</strong>
                <button
                  type="button"
                  onClick={() => updateSimpleDraft({ debts: [...simpleDebts, blankDebt(simpleDebts.length)] })}
                >
                  + 대출 추가
                </button>
              </div>
              <div className="fp-simple-debts">
                {simpleDebts.map((debt, index) => (
                  <div key={debt.id || index} className="fp-simple-debt-row">
                    <input
                      value={debt.name}
                      onChange={e => {
                        const debts = [...simpleDebts]
                        debts[index] = { ...debt, name: e.target.value }
                        updateSimpleDraft({ debts })
                      }}
                      placeholder="대출명"
                    />
                    <div>
                      <label>현재 대출잔액</label>
                      <MoneyInput
                        value={debt.balance}
                        onChange={value => {
                          const debts = [...simpleDebts]
                          debts[index] = { ...debt, balance: value }
                          updateSimpleDraft({ debts })
                        }}
                      />
                    </div>
                    <div>
                      <label>월 상환액</label>
                      <MoneyInput
                        value={debt.monthlyPayment}
                        onChange={value => {
                          const debts = [...simpleDebts]
                          debts[index] = { ...debt, monthlyPayment: value }
                          updateSimpleDraft({ debts })
                        }}
                      />
                    </div>
                    <div>
                      <label>남은 기간</label>
                      <input
                        type="number"
                        min={0}
                        value={debt.remainingYears || ""}
                        onChange={e => {
                          const debts = [...simpleDebts]
                          debts[index] = { ...debt, remainingYears: Number(e.target.value) }
                          updateSimpleDraft({ debts })
                        }}
                        placeholder="년"
                      />
                    </div>
                    {simpleDebts.length > 1 && (
                      <button
                        type="button"
                        className="fp-simple-remove"
                        onClick={() => updateSimpleDraft({ debts: simpleDebts.filter((_, i) => i !== index) })}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
                <div className="fp-simple-debt-summary">
                  <span>총 대출잔액 {krw(simpleCalc.debtBalanceTotal)}</span>
                  <span>월 상환액 {krw(simpleCalc.debtPaymentTotal)}</span>
                  <span>수입 대비 상환률 {percentValue(pct(simpleCalc.debtPaymentTotal, simpleCalc.incomeTotal))}</span>
                </div>
              </div>

              <div className="fp-simple-block-grid">
                <SimpleMoneyGroup
                  title="월 총수입"
                  total={simpleCalc.incomeTotal}
                  items={[
                    ["근로", "incomeSalary"],
                    ["사업", "incomeBusiness"],
                    ["이자", "incomeInterest"],
                    ["배당", "incomeDividend"],
                    ["연금", "incomePension"],
                    ["기타", "incomeOther"],
                  ]}
                  draft={simpleDraft}
                  onChange={updateSimpleDraft}
                />
                <SimpleMoneyGroup
                  title="월 총지출"
                  total={simpleCalc.expenseTotal}
                  items={[
                    ["생활비", "expenseLiving"],
                    ["공과금·통신·구독·렌탈", "expenseUtilities"],
                    ["보험료(보장)", "expenseInsurance"],
                  ]}
                  draft={simpleDraft}
                  onChange={updateSimpleDraft}
                />
                <SimpleMoneyGroup
                  title="현재 저축"
                  total={simpleCalc.savingTotal}
                  items={[
                    ["은행", "savingBank"],
                    ["증권", "savingSecurities"],
                    ["보험", "savingInsurance"],
                  ]}
                  draft={simpleDraft}
                  onChange={updateSimpleDraft}
                />
                <SimpleMoneyGroup
                  title="제안 후 조정"
                  total={simpleCalc.proposedAvailable}
                  items={[
                    ["생활비 조정", "proposalLiving"],
                    ["공과금 조정", "proposalUtilities"],
                    ["보장보험 조정", "proposalInsurance"],
                    ["은행 저축", "proposalBank"],
                    ["증권 저축", "proposalSecurities"],
                    ["보험 저축", "proposalInsuranceSaving"],
                  ]}
                  draft={simpleDraft}
                  onChange={updateSimpleDraft}
                />
              </div>

              <div className="fp-simple-block-grid two">
                <div className="fp-simple-card">
                  <div className="fp-simple-card-head">
                    <strong>비상금(예비비) 준비율</strong>
                    <span>{percentValue(pct(simpleDraft.emergencyCurrent, simpleDraft.emergencyTarget))}</span>
                  </div>
                  <div className="fp-emergency-row">
                    <div>
                      <label>현재 준비</label>
                      <MoneyInput value={simpleDraft.emergencyCurrent} onChange={v => updateSimpleDraft({ emergencyCurrent: v })} />
                    </div>
                    <div>
                      <label>목표 금액</label>
                      <MoneyInput value={simpleDraft.emergencyTarget} onChange={v => updateSimpleDraft({ emergencyTarget: v })} />
                    </div>
                  </div>
                  <div className="fp-bar-track">
                    <span style={{ width: `${Math.min(pct(simpleDraft.emergencyCurrent, simpleDraft.emergencyTarget), 100)}%` }} />
                  </div>
                  <p>{manwon(simpleDraft.emergencyCurrent)} / {manwon(simpleDraft.emergencyTarget)}</p>
                </div>
                <div className="fp-simple-card">
                  <div className="fp-simple-card-head">
                    <strong>작성자 의견</strong>
                    <span>출력 반영</span>
                  </div>
                  <textarea
                    value={simpleDraft.advisorOpinion}
                    onChange={e => updateSimpleDraft({ advisorOpinion: e.target.value })}
                    rows={5}
                    placeholder="고객에게 설명할 핵심 의견을 입력하세요."
                  />
                </div>
              </div>

              <div className="fp-simple-block-grid three">
                {([
                  ["금융 활용 방향", "financeMemo"],
                  ["세금 참고사항", "taxMemo"],
                  ["보장 개선 포인트", "coverageMemo"],
                ] as [string, keyof SimpleDraft][]).map(([label, key]) => (
                  <div key={key} className="fp-simple-field">
                    <label>{label}</label>
                    <textarea
                      value={String(simpleDraft[key] || "")}
                      onChange={e => updateSimpleDraft({ [key]: e.target.value } as Partial<SimpleDraft>)}
                      rows={3}
                    />
                  </div>
                ))}
              </div>

              <div className="fp-simple-summary four">
                <div>
                  <span>월 총수입</span>
                  <strong>{krw(simpleCalc.incomeTotal)}</strong>
                  <em>기준 100%</em>
                </div>
                <div>
                  <span>월 실제지출</span>
                  <strong>{krw(simpleCalc.expenseTotal)}</strong>
                  <em>{percentValue(pct(simpleCalc.expenseTotal, simpleCalc.incomeTotal))}</em>
                </div>
                <div>
                  <span>현재 저축금액</span>
                  <strong>{krw(simpleCalc.savingTotal)}</strong>
                  <em>{percentValue(pct(simpleCalc.savingTotal, simpleCalc.incomeTotal))}</em>
                </div>
                <div>
                  <span>남은 저축여력</span>
                  <strong>{krw(simpleCalc.savingCapacity)}</strong>
                  <em>{percentValue(pct(simpleCalc.savingCapacity, simpleCalc.incomeTotal))}</em>
                </div>
              </div>
            </div>
          )}

          {inputMode === "detail" && (
            <div className="fp-detail-note">
              상세 입력에서는 자산, 부채, 수입, 지출 항목을 각각 세분화해서 더 정확한 재무지표를 만들 수 있습니다.
            </div>
          )}
        </section>

        {/* ── 본문 보고서 ── */}
        {inputMode === "detail" && (
          <section className="fp-detail-inputs">
            <div className="fp-detail-input-head">
              <div>
                <strong>상세 입력</strong>
                <span>자산, 부채, 수입, 지출을 먼저 조정한 뒤 아래 보고서에서 전후 변화를 확인합니다.</span>
              </div>
            </div>
            <DataSection title="자산 입력" section="assets" total={totals.totalAssets} rows={client.assets} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
            <DataSection title="부채 입력" section="liabilities" total={totals.totalLiabilities} rows={client.liabilities} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
            <DataSection title="수입 입력" section="incomes" total={totals.totalIncome} rows={client.incomes} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
            <DataSection title="지출 입력" section="expenses" total={totals.totalExpense} rows={client.expenses} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry}
              extraHeader={
                <div style={{ display:"flex",gap:12,alignItems:"center" }}>
                  <span style={{ fontSize:12,fontWeight:800,color:"#b45309",background:"#fff7ed",padding:"3px 10px",borderRadius:999 }}>소비지출 {krw(totals.consumptionTotal)}</span>
                  <span style={{ fontSize:12,fontWeight:800,color:"#1d4ed8",background:"#eff6ff",padding:"3px 10px",borderRadius:999 }}>비소비지출 {krw(totals.nonConsumptionTotal)}</span>
                </div>
              }
            />
          </section>
        )}

        <div ref={reportRef} className="fp-report">
          {/* 핵심 지표 */}
          <section className="fp-metrics">
            <Metric label="자산 합계" value={krw(totals.totalAssets)} sub={manwon(totals.totalAssets)} tone="#1E5FA8" />
            <Metric label="부채 합계" value={krw(totals.totalLiabilities)} sub={`부채비율 ${percentValue(totals.debtRatio)}`} tone="#C0392B" />
            <Metric label="순자산" value={krw(totals.netWorth)} sub={manwon(totals.netWorth)} tone="#0E7E6B" />
            <Metric label="월 현금흐름" value={krw(totals.cashFlow)} sub={`저축가능률 ${percentValue(totals.savingsRate)}`} tone="#C9A84C" />
          </section>

          {/* 수입/지출 요약 */}
          <Panel title="수입 · 지출 현황" icon={<BarChart3 className="h-5 w-5" />}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
              <div>
                <p style={{ fontWeight:900,fontSize:13,color:"#10233e",marginBottom:8 }}>월 소득 합계: {krw(totals.totalIncome)}</p>
                {groupByCategory(client.incomes).map(i=>(
                  <div key={i.name} style={{ display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f1f5f9",fontSize:13,fontWeight:700 }}>
                    <span>{i.name}</span><span>{krw(i.value)} ({percentValue(pct(i.value,totals.totalIncome))})</span>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontWeight:900,fontSize:13,color:"#10233e",marginBottom:8 }}>월 지출 합계: {krw(totals.consumptionTotal + totals.protectionExpense + totals.loanPayments)}</p>
                <div style={{ display:"flex",justifyContent:"space-between",background:"#fff7ed",borderRadius:6,padding:"6px 10px",marginBottom:6 }}>
                  <span style={{ fontSize:12,fontWeight:800,color:"#b45309" }}>소비지출 소계</span>
                  <span style={{ fontSize:12,fontWeight:900,color:"#b45309" }}>{krw(totals.consumptionTotal)}</span>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",background:"#eff6ff",borderRadius:6,padding:"6px 10px" }}>
                  <span style={{ fontSize:12,fontWeight:800,color:"#1d4ed8" }}>대출상환 + 보장보험</span>
                  <span style={{ fontSize:12,fontWeight:900,color:"#1d4ed8" }}>{krw(totals.loanPayments + totals.protectionExpense)}</span>
                </div>
              </div>
            </div>
            <div className="fp-flow-formula">
              <div><span>월 총수입</span><strong>{krw(totals.totalIncome)}</strong><em>100%</em></div>
              <div><span>월 실제지출</span><strong>{krw(totals.consumptionTotal + totals.protectionExpense + totals.loanPayments)}</strong><em>{percentValue(pct(totals.consumptionTotal + totals.protectionExpense + totals.loanPayments, totals.totalIncome))}</em></div>
              <div><span>현재 저축</span><strong>{krw(totals.savingExpense)}</strong><em>{percentValue(pct(totals.savingExpense, totals.totalIncome))}</em></div>
              <div><span>남은 저축여력</span><strong>{krw(Math.max(totals.totalIncome - (totals.consumptionTotal + totals.protectionExpense + totals.loanPayments) - totals.savingExpense, 0))}</strong><em>{percentValue(pct(Math.max(totals.totalIncome - (totals.consumptionTotal + totals.protectionExpense + totals.loanPayments) - totals.savingExpense, 0), totals.totalIncome))}</em></div>
            </div>
          </Panel>

          {/* 재무지수 진단 */}
          <Panel title="가계 재무지수 진단" icon={<BarChart3 className="h-5 w-5" />}>
            <div className="fp-index-grid">
              {financialIndexes.map(i=><IndexGauge key={i.key} item={i} />)}
            </div>
          </Panel>

          {/* 제안 전/후 비교 */}
          <BeforeAfterSection client={client} totals={totals} />

          {/* 포트폴리오 제안 — 안정/중립/적극형 */}
          <PortfolioProposalSection client={client} totals={totals} />

          {/* 제안 입력 패널 */}
          {inputMode === "detail" && (
          <Panel title="제안 계획 입력 (설계사 전용)" icon={<FileText className="h-5 w-5" />}>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
              {([
                ["제안 후 월 소득(원)","monthlyIncome"],
                ["제안 후 월 지출(원)","totalExpense"],
                ["저축 증가액(원/월)","savingsIncrease"],
                ["보험료 절감액(원/월)","insuranceOptimize"],
                ["부채 상환 감소액(원/월)","debtReduction"],
                ["추가 투자액(원/월)","investmentAdd"],
              ] as [string, keyof Proposal][]).map(([label, field]) => (
                <div key={field} style={{ display:"grid",gap:5 }}>
                  <label style={{ fontSize:12,fontWeight:900,color:"#64748b" }}>{label}</label>
                  <MoneyInput
                    value={Number(client.proposal[field]||0)}
                    onChange={v=>updateClient({ proposal:{ ...client.proposal, [field]:v } })}
                  />
                </div>
              ))}
              <div style={{ gridColumn:"1/-1",display:"grid",gap:5 }}>
                <label style={{ fontSize:12,fontWeight:900,color:"#64748b" }}>제안 내용 메모</label>
                <textarea
                  value={client.proposal.memo||""}
                  onChange={e=>updateClient({ proposal:{ ...client.proposal, memo:e.target.value } })}
                  rows={3}
                  style={{ border:"1px solid #dce4ef",borderRadius:8,padding:"8px 10px",fontSize:13,fontWeight:700,fontFamily:"inherit",resize:"vertical",color:"#172033" }}
                  placeholder="제안 핵심 내용, 목표 달성 시뮬레이션, 상담 포인트를 입력하세요."
                />
              </div>
            </div>

            {/* 목적자금 목표 편집 */}
            <div style={{ marginTop:16, borderTop:"1px solid #e2e8f0", paddingTop:16 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:13,fontWeight:900,color:"#10203a" }}>목적자금 목표 설정</span>
                <button
                  onClick={() => {
                    const goals = client.proposal.goals || []
                    updateClient({ proposal:{ ...client.proposal, goals:[...goals,{
                      id:Math.random().toString(36).slice(2,8),
                      horizon:'중기' as const, purpose:'', targetAmount:0, periodYears:5
                    }]}})
                  }}
                  style={{ fontSize:12,fontWeight:900,padding:"4px 12px",borderRadius:6,background:"#1a2744",color:"#fff",border:"none",cursor:"pointer" }}
                >+ 목표 추가</button>
              </div>
              {(client.proposal.goals||[]).length === 0 && (
                <p style={{ fontSize:12,color:"#94a3b8",textAlign:"center",padding:"12px 0" }}>
                  목표를 추가하면 3가지 시나리오별 월 적립액이 자동 계산됩니다.
                </p>
              )}
              {(client.proposal.goals||[]).map((g,gi) => (
                <div key={g.id} style={{ display:"grid",gridTemplateColumns:"90px 1fr 120px 80px auto",gap:8,alignItems:"center",marginBottom:8 }}>
                  <select value={g.horizon}
                    onChange={e => {
                      const goals = [...(client.proposal.goals||[])]
                      goals[gi] = {...g, horizon: e.target.value as '단기'|'중기'|'장기'}
                      updateClient({ proposal:{...client.proposal, goals} })
                    }}
                    style={{ border:"1px solid #dce4ef",borderRadius:6,padding:"6px 8px",fontSize:12,fontWeight:800 }}>
                    <option value="단기">단기</option>
                    <option value="중기">중기</option>
                    <option value="장기">장기</option>
                  </select>
                  <input value={g.purpose} placeholder="목적 (예: 노후준비)"
                    onChange={e => {
                      const goals = [...(client.proposal.goals||[])]
                      goals[gi] = {...g, purpose: e.target.value}
                      updateClient({ proposal:{...client.proposal, goals} })
                    }}
                    style={{ border:"1px solid #dce4ef",borderRadius:6,padding:"6px 10px",fontSize:12 }} />
                  <input type="number" value={g.targetAmount/10000||""} placeholder="목표금액(만원)"
                    onChange={e => {
                      const goals = [...(client.proposal.goals||[])]
                      goals[gi] = {...g, targetAmount: Number(e.target.value)*10000}
                      updateClient({ proposal:{...client.proposal, goals} })
                    }}
                    style={{ border:"1px solid #dce4ef",borderRadius:6,padding:"6px 10px",fontSize:12 }} />
                  <input type="number" value={g.periodYears||""} placeholder="기간(년)"
                    onChange={e => {
                      const goals = [...(client.proposal.goals||[])]
                      goals[gi] = {...g, periodYears: Number(e.target.value)}
                      updateClient({ proposal:{...client.proposal, goals} })
                    }}
                    style={{ border:"1px solid #dce4ef",borderRadius:6,padding:"6px 10px",fontSize:12 }} />
                  <button onClick={() => {
                    const goals = (client.proposal.goals||[]).filter((_,i)=>i!==gi)
                    updateClient({ proposal:{...client.proposal, goals} })
                  }} style={{ background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontWeight:900,fontSize:14 }}>✕</button>
                </div>
              ))}
            </div>
          </Panel>
          )}

          {/* 자산배분전략 */}
          <Panel title="자산배분전략 및 투자성향" icon={<PieChartIcon className="h-5 w-5" />}>
            <div className="fp-strategy-grid">
              <div className="fp-strategy-card">
                <div className="fp-strategy-title">
                  <span>추천 투자성향</span><strong>{investorProfile}</strong>
                </div>
                <p>{investorProfile==="방어형"?"현금흐름·부채 안정 우선. 비상자금, 고금리 부채 정리, 단기 확정금리 중심 제안.":investorProfile==="안정형"?"자산 보전·정기 현금흐름 우선. 연금·채권 중심 중장기 포트폴리오 구성.":investorProfile==="성장형"?"ETF·랩·연금펀드 성장자산 비중을 높일 수 있습니다. 핵심자산과 위성자산 분리.":"채권·연금·ETF를 균형 배분해 안정성과 성장성을 함께 가져가는 구간입니다."}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {allocationData.map(i=><Cell key={i.name} fill={i.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v,n)=>[`${v}%`,n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="fp-allocation-list">
                  {allocationData.map(i=>(
                    <div key={i.name}><span style={{ background:i.fill }} /><strong>{i.name}</strong><em>{i.value}%</em></div>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize:12,fontWeight:900,color:"#64748b",marginBottom:12 }}>신용등급 {client.creditGrade}등급 예상 금리</p>
                <div className="fp-credit-summary" style={{ marginBottom:12 }}>
                  <strong>신용대출 {currentCreditRate.creditLoan}</strong>
                  <span>주택담보대출 {currentCreditRate.mortgage}</span>
                </div>
                <p style={{ fontSize:12,fontWeight:800,color:"#475569",lineHeight:1.6 }}>{currentCreditRate.note}</p>
              </div>
            </div>
          </Panel>

          {/* 자산/부채/수입/지출 도넛차트 */}
          <section className="fp-grid">
            <Panel title="자산 · 부채 비중" icon={<PieChartIcon className="h-5 w-5" />}>
              <div className="fp-chartrow">
                <Donut title="자산 비중" data={assetData} total={totals.totalAssets} />
                <Donut title="부채 비중" data={liabilityData} total={totals.totalLiabilities} />
              </div>
            </Panel>
            <Panel title="수입 · 지출 비중" icon={<BarChart3 className="h-5 w-5" />}>
              <div className="fp-chartrow">
                <Donut title="수입 비중" data={incomeData} total={totals.totalIncome} />
                <Donut title="소비지출" data={expenseConsumptionData} total={totals.consumptionTotal} />
              </div>
            </Panel>
          </section>

          <Panel title="재무상태 요약 차트" icon={<BarChart3 className="h-5 w-5" />}>
            <div className="fp-bars">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  {name:"자산",value:totals.totalAssets},{name:"부채",value:totals.totalLiabilities},
                  {name:"순자산",value:Math.max(totals.netWorth,0)},
                  {name:"월수입",value:totals.totalIncome},{name:"월지출",value:totals.totalExpense},
                ]}>
                  <XAxis dataKey="name" tick={{ fontSize:12,fontWeight:800 }} />
                  <YAxis hide />
                  <Tooltip formatter={v=>krw(Number(v))} />
                  <Bar dataKey="value" radius={[8,8,0,0]}>
                    {COLORS.slice(0,5).map(c=><Cell key={c} fill={c} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

      </main>
    </Shell>
  )
}

// ── Shell ────────────────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fp-shell">
      {children}
      <style jsx global>{`
        .fp-shell{min-height:100vh;background:#f4f7fb;color:#172033;font-family:'Noto Sans KR','Apple SD Gothic Neo',sans-serif}
        .fp-page{max-width:1480px;margin:0 auto;padding:28px;display:grid;gap:18px}
        .fp-report{display:grid;gap:18px;background:#f4f7fb}
        .fp-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;background:#10233e;color:white;border-radius:8px;padding:24px 28px;border-top:5px solid #c9a84c}
        .fp-hero p{margin:0 0 6px;color:#9ec5ef;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
        .fp-hero h1{margin:0;font-size:30px;font-weight:950;letter-spacing:0}
        .fp-hero span{display:block;margin-top:8px;color:#dbe7f7;font-size:14px;font-weight:700}
        .fp-actions,.fp-clientbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .fp-actions button,.fp-clientbar button{height:38px;border:1px solid rgba(255,255,255,.2);border-radius:8px;background:rgba(255,255,255,.1);color:inherit;padding:0 12px;font-weight:900;display:inline-flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap}
        .fp-actions button:disabled{opacity:.6;cursor:progress}
        .fp-clientbar{background:#fff;border:1px solid #dce4ef;border-radius:8px;padding:12px;color:#172033}
        .fp-clientbar label{height:40px;min-width:260px;display:flex;align-items:center;gap:8px;border:1px solid #dce4ef;border-radius:8px;padding:0 10px;background:#f8fafc}
        .fp-clientbar select{width:100%;border:0;background:transparent;outline:0;font-weight:900;color:#172033}
        .fp-clientbar button{background:#10233e;color:#fff;border-color:#10233e}
        .fp-clientbar button:disabled{opacity:.35;cursor:not-allowed}
        .fp-mode-panel{background:#fff;border:1px solid #dce4ef;border-radius:8px;padding:14px;display:grid;gap:14px}
        .fp-mode-tabs{display:inline-flex;width:max-content;gap:4px;border:1px solid #dce4ef;border-radius:10px;background:#f8fafc;padding:4px}
        .fp-mode-tabs button{height:36px;border:0;border-radius:8px;background:transparent;color:#64748b;padding:0 18px;font-size:13px;font-weight:950;cursor:pointer}
        .fp-mode-tabs button.active{background:#10233e;color:#fff;box-shadow:0 8px 18px rgba(16,35,62,.16)}
        .fp-simple-panel{display:grid;gap:14px}
        .fp-simple-head{display:flex;align-items:center;justify-content:space-between;gap:14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;padding:14px}
        .fp-simple-head strong{display:block;color:#10233e;font-size:16px;font-weight:950}
        .fp-simple-head span{display:block;margin-top:4px;color:#64748b;font-size:12px;font-weight:800;line-height:1.5}
        .fp-simple-head button{height:40px;border:0;border-radius:10px;background:#0e7e6b;color:#fff;padding:0 16px;font-size:13px;font-weight:950;cursor:pointer;white-space:nowrap}
        .fp-simple-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
        .fp-simple-field{display:grid;gap:6px;min-width:0}
        .fp-simple-field label{font-size:12px;font-weight:950;color:#64748b}
        .fp-simple-field input,.fp-simple-field textarea{width:100%;border:1px solid #dce4ef;border-radius:8px;padding:0 11px;font-size:14px;font-weight:850;color:#172033;outline:0;min-width:0;font-family:inherit}
        .fp-simple-field input{height:42px}
        .fp-simple-field textarea{min-height:78px;padding:10px 11px;resize:vertical}
        .fp-simple-field small{color:#94a3b8;font-size:10px;font-weight:800;line-height:1.35}
        .fp-simple-subtitle{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #e2e8f0;padding-top:14px}
        .fp-simple-subtitle strong{font-size:14px;font-weight:950;color:#10233e}
        .fp-simple-subtitle button,.fp-simple-remove{height:32px;border:1px solid #10233e;border-radius:8px;background:#10233e;color:#fff;padding:0 10px;font-size:12px;font-weight:950;cursor:pointer}
        .fp-simple-remove{border-color:#fecaca;background:#fff1f2;color:#be123c}
        .fp-simple-goals{display:grid;gap:8px}
        .fp-simple-goal-row{display:grid;grid-template-columns:minmax(180px,1fr) 180px 90px auto;gap:8px;align-items:start}
        .fp-simple-goal-row>input{height:42px;border:1px solid #dce4ef;border-radius:8px;padding:0 11px;font-size:14px;font-weight:850;color:#172033;outline:0}
        .fp-simple-debts{display:grid;gap:8px}
        .fp-simple-debt-row{display:grid;grid-template-columns:minmax(170px,1fr) 170px 150px 90px auto;gap:8px;align-items:end}
        .fp-simple-debt-row>input,.fp-simple-debt-row input{height:42px;border:1px solid #dce4ef;border-radius:8px;padding:0 11px;font-size:14px;font-weight:850;color:#172033;outline:0;min-width:0}
        .fp-simple-debt-row label{display:block;margin-bottom:5px;font-size:11px;font-weight:950;color:#64748b}
        .fp-simple-debt-summary{display:flex;gap:8px;flex-wrap:wrap}
        .fp-simple-debt-summary span{border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:950}
        .fp-simple-block-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .fp-simple-block-grid.two{grid-template-columns:1fr 1fr}
        .fp-simple-block-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
        .fp-simple-card{border:1px solid #dce4ef;border-radius:10px;background:#fff;padding:12px;min-width:0}
        .fp-simple-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
        .fp-simple-card-head strong{font-size:13px;font-weight:950;color:#10233e}
        .fp-simple-card-head span{font-size:12px;font-weight:950;color:#1E5FA8}
        .fp-simple-money-list{display:grid;gap:8px}
        .fp-simple-money-list>div,.fp-emergency-row>div{display:grid;gap:5px}
        .fp-simple-money-list label,.fp-emergency-row label{font-size:11px;font-weight:950;color:#64748b}
        .fp-emergency-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .fp-bar-track{height:9px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin-top:10px}
        .fp-bar-track span{display:block;height:100%;border-radius:999px;background:#1E5FA8}
        .fp-simple-card p{margin:8px 0 0;color:#64748b;font-size:12px;font-weight:850}
        .fp-simple-card textarea{width:100%;border:1px solid #dce4ef;border-radius:8px;padding:10px 11px;font-size:13px;font-weight:800;color:#172033;outline:0;font-family:inherit;resize:vertical}
        .fp-simple-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .fp-simple-summary.four{grid-template-columns:repeat(4,minmax(0,1fr))}
        .fp-simple-summary div{border:1px solid #dbeafe;background:#eff6ff;border-radius:10px;padding:12px}
        .fp-simple-summary span{display:block;color:#1d4ed8;font-size:11px;font-weight:950}
        .fp-simple-summary strong{display:block;margin-top:5px;color:#10233e;font-size:18px;font-weight:950}
        .fp-simple-summary em{display:block;margin-top:4px;color:#64748b;font-size:11px;font-weight:900;font-style:normal}
        .fp-flow-formula{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}
        .fp-flow-formula div{border:1px solid #dbeafe;background:#f8fbff;border-radius:10px;padding:11px}
        .fp-flow-formula span{display:block;color:#64748b;font-size:11px;font-weight:950}
        .fp-flow-formula strong{display:block;margin-top:5px;color:#10233e;font-size:17px;font-weight:950}
        .fp-flow-formula em{display:block;margin-top:4px;color:#1E5FA8;font-size:11px;font-weight:950;font-style:normal}
        .fp-detail-note{border:1px dashed #cbd5e1;background:#f8fafc;border-radius:10px;padding:14px;color:#64748b;font-size:13px;font-weight:850}
        .fp-detail-inputs{display:grid;gap:12px;border:1px solid #dce4ef;border-radius:10px;background:#fff;padding:14px}
        .fp-detail-input-head{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e2e8f0;padding-bottom:12px}
        .fp-detail-input-head strong{display:block;color:#10233e;font-size:16px;font-weight:950}
        .fp-detail-input-head span{display:block;margin-top:4px;color:#64748b;font-size:12px;font-weight:800;line-height:1.45}
        .fp-profile{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:10px;background:#fff;border:1px solid #dce4ef;border-radius:8px;padding:14px}
        .fp-profile .span-1{grid-column:span 1}
        .fp-profile .span-2{grid-column:span 2}
        .fp-profile .span-3{grid-column:span 3}
        .fp-input{display:grid;gap:6px;min-width:0}
        .fp-input label{font-size:12px;font-weight:900;color:#64748b}
        .fp-input input{width:100%;height:42px;border:1px solid #dce4ef;border-radius:8px;padding:0 11px;font-size:14px;font-weight:800;color:#172033;outline:0;min-width:0}
        .fp-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .fp-metric{background:#fff;border:1px solid #dce4ef;border-radius:8px;padding:17px;border-top:4px solid var(--tone)}
        .fp-metric span{display:block;color:#64748b;font-size:12px;font-weight:900}
        .fp-metric strong{display:block;margin-top:6px;font-size:22px;font-weight:950;color:#172033;overflow-wrap:anywhere}
        .fp-metric em{display:block;margin-top:5px;color:#64748b;font-size:12px;font-style:normal;font-weight:800}
        .fp-panel{background:#fff;border:1px solid #dce4ef;border-radius:8px;overflow:hidden}
        .fp-panel-title{display:flex;align-items:center;gap:9px;border-bottom:1px solid #dce4ef;background:#f8fafc;padding:14px 16px;font-weight:950;color:#10233e}
        .fp-panel-body{padding:16px}
        .fp-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .fp-chartrow{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .fp-donut,.fp-index-card{min-width:0;border:1px solid #eef2f7;border-radius:8px;padding:12px;background:#fff}
        .fp-donut h3,.fp-index-card h3{margin:0;font-size:15px;font-weight:950;color:#172033}
        .fp-donut p,.fp-index-card p{margin:8px 0 0;color:#64748b;font-size:12px;font-weight:800;line-height:1.45}
        .fp-index-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
        .fp-index-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
        .fp-index-head span{border-radius:999px;background:#f1f5f9;padding:4px 8px;font-size:11px;font-weight:950;color:#172033}
        .fp-index-value{display:flex;align-items:baseline;justify-content:center;gap:4px;margin-top:-8px;font-weight:950;color:#172033}
        .fp-index-value strong{font-size:24px}
        .fp-credit-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #dbeafe;background:#eff6ff;border-radius:8px;padding:12px 14px;color:#10233e}
        .fp-credit-summary strong{font-size:14px;font-weight:900}
        .fp-credit-summary span{font-size:13px;font-weight:900;color:#1E5FA8}
        .fp-note{margin:10px 0 0;color:#64748b;font-size:12px;font-weight:800}
        .fp-strategy-grid{display:grid;grid-template-columns:320px minmax(0,1fr);gap:14px}
        .fp-strategy-card{border:1px solid #dce4ef;border-radius:8px;background:#fff;padding:14px;min-width:0}
        .fp-strategy-title{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #eef2f7;padding-bottom:10px;margin-bottom:10px}
        .fp-strategy-title span{font-size:12px;font-weight:950;color:#64748b}
        .fp-strategy-title strong{border-radius:999px;background:#10233e;color:#fff;padding:6px 12px;font-size:14px}
        .fp-strategy-card p{margin:0;color:#475569;font-size:13px;font-weight:800;line-height:1.55}
        .fp-allocation-list{display:grid;gap:7px;margin-top:4px}
        .fp-allocation-list div{display:grid;grid-template-columns:12px 1fr auto;align-items:center;gap:8px;color:#172033}
        .fp-allocation-list span{width:12px;height:12px;border-radius:3px}
        .fp-allocation-list strong{font-size:13px}
        .fp-allocation-list em{font-style:normal;font-size:13px;font-weight:950}
        .fp-bars{height:280px}
        .fp-table-wrap{overflow-x:auto}
        .fp-table{width:100%;border-collapse:collapse;min-width:860px}
        .fp-table th{background:#eaf2f8;color:#10233e;font-size:12px;font-weight:950;text-align:left;padding:9px;border:1px solid #cbd7e5}
        .fp-table td{border:1px solid #dce4ef;padding:4px 6px;background:#fff;font-size:13px;font-weight:800;vertical-align:top}
        .fp-table input,.fp-table select{width:100%;height:34px;border:0;background:#fff7bd;padding:0 8px;font-weight:800;outline:0;color:#172033;font-family:inherit}
        .fp-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .fp-section-head button{border:1px solid #10233e;border-radius:8px;background:#10233e;color:#fff;height:34px;padding:0 10px;font-weight:900;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
        .fp-delete{width:34px;height:34px;border:0;border-radius:8px;background:#fee2e2;color:#b91c1c;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
        .fp-empty{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;color:#10233e;font-weight:900}
        .fp-empty h1{margin:0;font-size:26px}
        .fp-empty p{margin:0;color:#64748b}
        .fp-consumption-badge-소비지출{background:#fff7ed;color:#b45309;border:1px solid #fed7aa}
        .fp-consumption-badge-비소비지출{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
        .fp-landscape-report{width:297mm;background:#fff;color:#10233e;font-family:'Noto Sans KR','Apple SD Gothic Neo',sans-serif}
        .fp-landscape-page{width:297mm;height:210mm;box-sizing:border-box;padding:12mm;background:#f4f7fb;page-break-after:always;overflow:hidden;display:flex;flex-direction:column;gap:10px}
        .fp-landscape-page:last-child{page-break-after:auto}
        .fp-landscape-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;background:#10233e;color:#fff;border-radius:10px;padding:14px 18px;border-top:5px solid #c9a84c}
        .fp-landscape-head.compact{padding:12px 18px}
        .fp-landscape-head p{margin:0 0 4px;color:#9ec5ef;font-size:10px;font-weight:950;letter-spacing:.16em}
        .fp-landscape-head h1{margin:0;font-size:24px;font-weight:950;letter-spacing:-.3px}
        .fp-landscape-head span{display:block;margin-top:5px;color:#dbe7f7;font-size:12px;font-weight:800}
        .fp-landscape-badge{border:1px solid rgba(201,168,76,.55);border-radius:999px;color:#c9a84c;padding:7px 12px;font-size:12px;font-weight:950;white-space:nowrap}
        .fp-landscape-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
        .fp-report-kpi{border:1px solid #dce4ef;border-top:4px solid #1E5FA8;border-radius:10px;background:#fff;padding:11px}
        .fp-report-kpi span{display:block;color:#64748b;font-size:11px;font-weight:950}
        .fp-report-kpi strong{display:block;margin-top:4px;font-size:26px;font-weight:950}
        .fp-report-kpi em{display:block;margin-top:2px;color:#64748b;font-size:11px;font-style:normal;font-weight:850}
        .fp-landscape-grid{display:grid;grid-template-columns:1.15fr .75fr .75fr;gap:8px;min-height:0}
        .fp-landscape-grid.three-col{grid-template-columns:repeat(3,1fr)}
        .fp-report-card{border:1px solid #dce4ef;border-radius:10px;background:#fff;padding:12px;min-width:0;overflow:hidden}
        .fp-report-card.span-2{grid-column:span 1}
        .fp-report-card.wide{grid-column:1/-1}
        .fp-report-card h2{margin:0 0 9px;color:#10233e;font-size:15px;font-weight:950}
        .fp-report-card p{margin:0;color:#475569;font-size:13px;font-weight:800;line-height:1.65}
        .fp-goal-report-list{display:grid;gap:7px}
        .fp-goal-report-row{display:grid;grid-template-columns:1fr 1.4fr 105px;gap:9px;align-items:center;border:1px solid #eef2f7;border-radius:8px;padding:8px;background:#f8fafc}
        .fp-goal-report-row strong{display:block;font-size:13px;font-weight:950;color:#10233e}
        .fp-goal-report-row span{display:block;margin-top:3px;font-size:11px;font-weight:850;color:#64748b}
        .fp-goal-report-row>b{font-size:12px;font-weight:950;color:#1E5FA8;text-align:right}
        .fp-goal-bars{display:grid;gap:5px}
        .fp-report-bar{display:grid;grid-template-columns:34px 1fr 38px;align-items:center;gap:6px}
        .fp-report-bar span,.fp-report-bar b{font-size:10px;font-weight:950;color:#64748b}
        .fp-report-bar div{height:7px;border-radius:999px;background:#e2e8f0;overflow:hidden}
        .fp-report-bar i{display:block;height:100%;border-radius:999px}
        .fp-mini-bar{display:grid;gap:5px;margin-bottom:8px}
        .fp-mini-bar div{display:flex;justify-content:space-between;gap:8px;font-size:11px;font-weight:950;color:#64748b}
        .fp-mini-bar i{height:10px;border-radius:999px;background:#e2e8f0;overflow:hidden}
        .fp-mini-bar em{display:block;height:100%;border-radius:999px}
        .fp-report-delta{margin-top:8px;border-radius:8px;background:#ecfdf5;color:#047857;padding:9px;font-size:12px;font-weight:950;text-align:center}
        .fp-landscape-opinion{margin-top:auto;border:1px solid #dbeafe;background:#eff6ff;border-radius:10px;padding:12px 14px}
        .fp-landscape-opinion strong{display:block;color:#1E5FA8;font-size:12px;font-weight:950;margin-bottom:5px}
        .fp-landscape-opinion p{margin:0;color:#10233e;font-size:13px;font-weight:850;line-height:1.55}
        .fp-before-after-table{display:grid;border:1px solid #dce4ef;border-radius:9px;overflow:hidden}
        .fp-before-after-table>div{display:grid;grid-template-columns:1fr 1fr 1fr 1fr}
        .fp-before-after-table>div:first-child{background:#10233e;color:#fff}
        .fp-before-after-table span,.fp-before-after-table b,.fp-before-after-table em{padding:9px 11px;border-right:1px solid #dce4ef;border-bottom:1px solid #dce4ef;font-size:12px;font-weight:900;font-style:normal}
        .fp-before-after-table em{color:#0E7E6B}
        .fp-allocation-compare{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .fp-allocation-compare div{border:1px solid #e2e8f0;background:#f8fafc;border-radius:9px;padding:10px}
        .fp-allocation-compare strong{display:block;color:#10233e;font-size:13px;font-weight:950}
        .fp-allocation-compare span{display:block;margin-top:5px;color:#1E5FA8;font-size:12px;font-weight:950}
        .fp-allocation-compare em{display:block;margin-top:5px;color:#64748b;font-size:11px;font-weight:850;font-style:normal}
        .fp-report-card.scenario{border-top:4px solid #1E5FA8}
        @keyframes fp-spin{to{transform:rotate(360deg)}}
        @media(max-width:1200px){.fp-index-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.fp-profile{grid-template-columns:repeat(6,minmax(0,1fr))}.fp-profile .span-3{grid-column:span 6}.fp-strategy-grid{grid-template-columns:1fr}.fp-simple-grid,.fp-simple-block-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
        @media(max-width:900px){.fp-grid,.fp-chartrow,.fp-metrics,.fp-simple-summary,.fp-simple-summary.four,.fp-flow-formula,.fp-simple-block-grid.two,.fp-simple-block-grid.three{grid-template-columns:1fr 1fr}.fp-simple-grid,.fp-simple-block-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.fp-simple-goal-row{grid-template-columns:1fr 160px 80px auto}.fp-simple-debt-row{grid-template-columns:1fr 1fr 1fr}}
        @media(max-width:720px){.fp-page{padding:14px}.fp-hero{align-items:flex-start;flex-direction:column}.fp-grid,.fp-chartrow,.fp-profile,.fp-metrics,.fp-index-grid,.fp-simple-grid,.fp-simple-summary,.fp-simple-summary.four,.fp-flow-formula,.fp-simple-block-grid,.fp-simple-block-grid.two,.fp-simple-block-grid.three,.fp-simple-goal-row,.fp-simple-debt-row,.fp-emergency-row{grid-template-columns:1fr}.fp-profile .span-1,.fp-profile .span-2,.fp-profile .span-3{grid-column:span 1}.fp-clientbar label{min-width:100%}.fp-mode-tabs{width:100%;display:grid;grid-template-columns:1fr 1fr}.fp-simple-head{align-items:stretch;flex-direction:column}.fp-simple-head button{width:100%}}
        @media print{
  @page{size:A4 landscape;margin:7mm}
  .fp-actions,.fp-clientbar button,.fp-delete,.fp-mode-panel{display:none!important}
  .fp-page{padding:0}.fp-shell,.fp-report{background:white}
  .fp-panel,.fp-metric,.fp-profile,.fp-clientbar,.fp-hero{break-inside:avoid}
  .fp-proposal-tabs{display:none!important}
  .fp-scenario-block{display:block!important;margin-bottom:24px;page-break-inside:avoid}
}
      `}</style>
    </div>
  )
}

// ── 소형 컴포넌트들 ──────────────────────────────────────────────────────────
function Input({ label, value, onChange, type="text", span }: { label:string; value:string; onChange:(v:string)=>void; type?:string; span?:string }) {
  return (
    <div className={`fp-input ${span ?? "span-1"}`}>
      <label>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} />
    </div>
  )
}

function SimpleMoneyGroup({
  title,
  total,
  items,
  draft,
  onChange,
}: {
  title: string
  total: number
  items: [string, keyof SimpleDraft][]
  draft: SimpleDraft
  onChange: (patch: Partial<SimpleDraft>) => void
}) {
  return (
    <div className="fp-simple-card">
      <div className="fp-simple-card-head">
        <strong>{title}</strong>
        <span>{krw(total)}</span>
      </div>
      <div className="fp-simple-money-list">
        {items.map(([label, key]) => (
          <div key={String(key)}>
            <label>{label}</label>
            <MoneyInput
              value={Number(draft[key] || 0)}
              onChange={value => onChange({ [key]: value } as Partial<SimpleDraft>)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value, sub, tone }: { label:string; value:string; sub:string; tone:string }) {
  return (
    <div className="fp-metric" style={{ "--tone":tone } as React.CSSProperties}>
      <span>{label}</span><strong>{value}</strong><em>{sub}</em>
    </div>
  )
}

function Panel({ title, icon, children }: { title:string; icon:React.ReactNode; children:React.ReactNode }) {
  return (
    <section className="fp-panel">
      <div className="fp-panel-title">{icon}{title}</div>
      <div className="fp-panel-body">{children}</div>
    </section>
  )
}

function IndexGauge({ item }: { item: IndexItem }) {
  return (
    <div className="fp-index-card">
      <div className="fp-index-head"><h3>{item.label}</h3><span>{item.status}</span></div>
      <ResponsiveContainer width="100%" height={110}>
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{name:item.label,value:item.score,fill:item.tone}]} startAngle={180} endAngle={0}>
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill:"#e5edf7" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="fp-index-value"><strong>{item.value}</strong><span>{item.unit}</span></div>
      <p>{item.desc}</p>
    </div>
  )
}

function Donut({ title, data, total }: { title:string; data:{name:string;value:number}[]; total:number }) {
  return (
    <div className="fp-donut">
      <h3>{title}</h3>
      <p>합계 {krw(total)} ({manwon(total)})</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={74} paddingAngle={2}>
            {data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v,n)=>[`${krw(Number(v))} (${percentValue(pct(Number(v),total))})`,n]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── DataSection ───────────────────────────────────────────────────────────────
function DataSection({
  title, section, rows, total, onAdd, onUpdate, onRemove, extraHeader
}: {
  title: string; section: SectionKey; rows: Entry[]; total: number
  onAdd:(s:SectionKey)=>void; onUpdate:(s:SectionKey,id:string,patch:Partial<Entry>)=>void
  onRemove:(s:SectionKey,id:string)=>void; extraHeader?: React.ReactNode
}) {
  const isExpenses = section === "expenses"

  // expenses: 소비/비소비 구분별 카테고리 옵션
  const getCategoryOptions = (consumptionType?: "소비지출"|"비소비지출") => {
    if (!isExpenses) return []
    if (!consumptionType) return [...EXPENSE_CATEGORIES.소비지출, ...EXPENSE_CATEGORIES.비소비지출]
    return EXPENSE_CATEGORIES[consumptionType] || []
  }

  return (
    <Panel title={title} icon={<FileText className="h-5 w-5" />}>
      <div className="fp-section-head" style={{ marginBottom:12 }}>
        <div style={{ display:"flex",gap:12,alignItems:"center",flexWrap:"wrap" }}>
          <strong style={{ fontSize:14 }}>합계 {krw(total)} <span style={{ fontSize:12,fontWeight:700,color:"#64748b" }}>({manwon(total)})</span></strong>
          {extraHeader}
        </div>
        <button onClick={()=>onAdd(section)}><Plus className="h-4 w-4" /> 항목 추가</button>
      </div>
      <div className="fp-table-wrap">
        <table className="fp-table">
          <thead>
            <tr>
              {isExpenses && <th style={{ minWidth:80 }}>소비구분</th>}
              <th style={{ minWidth:110 }}>카테고리</th>
              <th style={{ minWidth:130 }}>항목명</th>
              <th style={{ minWidth:100 }}>기관/상품명</th>
              <th style={{ minWidth:140 }}>금액(원)</th>
              <th style={{ minWidth:60 }}>비중</th>
              {(section==="assets"||section==="liabilities") && <th style={{ minWidth:120 }}>납입/상환액</th>}
              {(section==="assets"||section==="liabilities") && <th style={{ minWidth:90 }}>금리/수익(%)</th>}
              <th style={{ minWidth:110 }}>메모</th>
              <th style={{ minWidth:40 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(item=>(
              <tr key={item.id}>
                {isExpenses && (
                  <td>
                    <select
                      value={item.consumptionType||"소비지출"}
                      onChange={e=>onUpdate(section,item.id,{ consumptionType:e.target.value as "소비지출"|"비소비지출" })}
                      style={{ background: item.consumptionType==="비소비지출"?"#eff6ff":"#fff7ed", color:item.consumptionType==="비소비지출"?"#1d4ed8":"#b45309" }}
                    >
                      <option value="소비지출">소비지출</option>
                      <option value="비소비지출">비소비지출</option>
                    </select>
                  </td>
                )}
                <td>
                  {isExpenses ? (
                    <select value={item.category} onChange={e=>onUpdate(section,item.id,{ category:e.target.value })}>
                      {getCategoryOptions(item.consumptionType).map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input value={item.category} onChange={e=>onUpdate(section,item.id,{ category:e.target.value })} />
                  )}
                </td>
                <td><input value={item.name} onChange={e=>onUpdate(section,item.id,{ name:e.target.value })} /></td>
                <td><input value={item.institution||""} onChange={e=>onUpdate(section,item.id,{ institution:e.target.value })} /></td>
                <td>
                  <MoneyInput value={item.amount} onChange={v=>onUpdate(section,item.id,{ amount:v })} />
                </td>
                <td style={{ textAlign:"right",fontWeight:900,fontSize:12 }}>{pct(item.amount,total)}%</td>
                {(section==="assets"||section==="liabilities") && (
                  <td><MoneyInput value={item.payment||0} onChange={v=>onUpdate(section,item.id,{ payment:v })} /></td>
                )}
                {(section==="assets"||section==="liabilities") && (
                  <td><RateInput value={item.rate||0} onChange={v=>onUpdate(section,item.id,{ rate:v })} /></td>

                )}
                <td><input value={item.memo||""} onChange={e=>onUpdate(section,item.id,{ memo:e.target.value })} /></td>
                <td style={{ textAlign:"center" }}>
                  <button onClick={()=>onRemove(section,item.id)} style={{ color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:"2px 4px" }}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
