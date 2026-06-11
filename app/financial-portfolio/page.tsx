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

type Proposal = {
  monthlyIncome: number
  totalExpense: number
  savingsIncrease: number
  insuranceOptimize: number
  debtReduction: number
  investmentAdd: number
  memo: string
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

const defaultProposal: Proposal = {
  monthlyIncome:0, totalExpense:0, savingsIncrease:0,
  insuranceOptimize:0, debtReduction:0, investmentAdd:0, memo:""
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
const money = (v:number) => Math.round(v||0).toLocaleString("ko-KR")
const manwon = (v:number) => `${Math.round((v||0)/10000).toLocaleString("ko-KR")}만원`
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
    return parsed.map(item=>({
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
function MoneyInput({ value, onChange, placeholder }: { value: number; onChange: (n: number) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState(value === 0 ? "" : value.toString())

  useEffect(() => {
    if (!focused) setRaw(value === 0 ? "" : value.toString())
  }, [value, focused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, "")
    setRaw(digits)
    onChange(Number(digits))
  }

  const displayValue = focused ? raw : (Number(raw || 0) > 0 ? Number(raw).toLocaleString("ko-KR") : "")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <input
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); setRaw(value === 0 ? "" : value.toString()) }}
        placeholder={placeholder || "0"}
        style={{ width: "100%", height: 34, border: 0, background: "#fff7bd", padding: "0 8px", fontWeight: 800, outline: 0, color: "#172033", textAlign: "right" }}
      />
      {Number(raw || 0) > 0 && (
        <span style={{ fontSize: 10, color: "#64748b", textAlign: "right", fontWeight: 700 }}>
          {manwon(Number(raw))}
        </span>
      )}
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
                      {r.before === 0 ? "–" : (r.unit === "%" ? `${r.before.toFixed(1)}%` : `${money(r.before)}원`)}
                    </td>
                    <td style={{ border:"1px solid #dce4ef",padding:"8px 12px",fontSize:13,fontWeight:900,textAlign:"right",color:"#1E5FA8" }}>
                      {r.after === 0 ? "–" : (r.unit === "%" ? `${r.after.toFixed(1)}%` : `${money(r.after)}원`)}
                    </td>
                    <td style={{ border:"1px solid #dce4ef",padding:"8px 12px",fontSize:13,fontWeight:900,color: isNeutral?"#64748b":isPositive?"#0E7E6B":"#C0392B" }}>
                      {isNeutral ? "–" : `${diff > 0 ? "▲" : "▼"} ${r.unit === "%" ? Math.abs(diff).toFixed(1)+"%" : money(Math.abs(diff))+"원"}`}
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

// ── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function FinancialPortfolioPage() {
  const router = useRouter()
  const coverRef = useRef<HTMLDivElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [advisorId, setAdvisorId] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientPortfolio[]>(() => loadClients())
  const [selectedId, setSelectedId] = useState(starter.id)
  const [isExporting, setIsExporting] = useState(false)
  const [syncStatus, setSyncStatus] = useState<"idle"|"saving"|"saved"|"error">("idle")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace(`/login?redirectTo=${encodeURIComponent("/financial-portfolio")}`); return }
      const { data: userData } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle()
      const userInfo = userData || session.user
      const role = normalizeRole(userInfo)
      const isPlannerOrAbove = ["agent","manager","leader","headquarters","master"].includes(role)
      if (!(role === "master" || (isPlannerOrAbove && isApprovedUser(userInfo)))) { setAllowed(false); return }
      setAdvisorId(session.user.id)
      const { data: rows, error } = await supabase.from("financial_portfolios").select("id, portfolio").order("updated_at", { ascending: false })
      if (!error && rows && rows.length > 0) {
        const loaded = rows.map(r => ({ ...starter, ...(r.portfolio as Partial<ClientPortfolio>), id: r.id as string }))
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
    return {
      totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities,
      totalIncome, totalExpense, cashFlow: totalIncome - totalExpense,
      loanPayments, savingExpense, protectionExpense, consumptionTotal, nonConsumptionTotal,
      savingsRate: pct(totalIncome - totalExpense, totalIncome),
      debtRatio: pct(totalLiabilities, totalAssets),
      engelIndex: pct(client.foodExpense, totalIncome),
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

  const updateClient = (patch: Partial<ClientPortfolio>) =>
    setClients(prev => prev.map(i => i.id === client.id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i))

  const updateEntry = (section: SectionKey, id: string, patch: Partial<Entry>) =>
    updateClient({ [section]: client[section].map(i => i.id === id ? { ...i, ...patch } : i) } as Partial<ClientPortfolio>)

  const addEntry = (section: SectionKey) =>
    updateClient({ [section]: [...client[section], row(crypto.randomUUID(),"기타","새 항목","",0,0,0, section==="expenses"?"소비지출":undefined)] } as Partial<ClientPortfolio>)

  const removeEntry = (section: SectionKey, id: string) =>
    updateClient({ [section]: client[section].filter(i => i.id !== id) } as Partial<ClientPortfolio>)

  const addClient = () => {
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
    const pdf = new jsPDF("p","mm","a4")
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

        <section className="fp-clientbar">
          <label>
            <UserRound className="h-4 w-4" />
            <select value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
              {clients.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>
          <button onClick={addClient}><Plus className="h-4 w-4" /> 고객 추가</button>
          <button onClick={deleteClient} disabled={clients.length<=1}><Trash2 className="h-4 w-4" /> 삭제</button>
          <button onClick={()=>updateClient({ updatedAt:new Date().toISOString() })}><Save className="h-4 w-4" /> 저장</button>
        </section>

        {/* ── 본문 보고서 ── */}
        <div ref={reportRef} className="fp-report">
          {/* 고객 기본정보 */}
          <section className="fp-profile">
            <Input label="고객명" value={client.name} onChange={v=>updateClient({name:v})} />
            <Input label="나이" value={String(client.age)} type="number" onChange={v=>updateClient({age:Number(v)})} />
            <Input label="성별" value={client.gender} onChange={v=>updateClient({gender:v})} />
            <Input label="직업" value={client.job||""} onChange={v=>updateClient({job:v})} />
            <Input label="신용등급" value={String(client.creditGrade)} type="number" onChange={v=>updateClient({creditGrade:Math.min(7,Math.max(1,Number(v)||1))})} />
            <Input label="담당 설계사" value={client.advisorName||""} onChange={v=>updateClient({advisorName:v})} />
            <Input label="월 식비(원)" value={String(client.foodExpense)} type="number" onChange={v=>updateClient({foodExpense:Number(v)})} />
            <Input label="상담 메모" value={client.memo} onChange={v=>updateClient({memo:v})} wide />
          </section>

          {/* 핵심 지표 */}
          <section className="fp-metrics">
            <Metric label="자산 합계" value={money(totals.totalAssets)} sub={manwon(totals.totalAssets)} tone="#1E5FA8" />
            <Metric label="부채 합계" value={money(totals.totalLiabilities)} sub={`부채비율 ${totals.debtRatio}%`} tone="#C0392B" />
            <Metric label="순자산" value={money(totals.netWorth)} sub={manwon(totals.netWorth)} tone="#0E7E6B" />
            <Metric label="월 현금흐름" value={money(totals.cashFlow)} sub={`저축가능률 ${totals.savingsRate}%`} tone="#C9A84C" />
          </section>

          {/* 수입/지출 요약 */}
          <Panel title="수입 · 지출 현황" icon={<BarChart3 className="h-5 w-5" />}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
              <div>
                <p style={{ fontWeight:900,fontSize:13,color:"#10233e",marginBottom:8 }}>월 소득 합계: {money(totals.totalIncome)}원</p>
                {groupByCategory(client.incomes).map(i=>(
                  <div key={i.name} style={{ display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f1f5f9",fontSize:13,fontWeight:700 }}>
                    <span>{i.name}</span><span>{money(i.value)}원 ({pct(i.value,totals.totalIncome)}%)</span>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontWeight:900,fontSize:13,color:"#10233e",marginBottom:8 }}>월 지출 합계: {money(totals.totalExpense)}원</p>
                <div style={{ display:"flex",justifyContent:"space-between",padding:"4px 0",background:"#fff7ed",borderRadius:6,padding:"6px 10px",marginBottom:6 }}>
                  <span style={{ fontSize:12,fontWeight:800,color:"#b45309" }}>소비지출 소계</span>
                  <span style={{ fontSize:12,fontWeight:900,color:"#b45309" }}>{money(totals.consumptionTotal)}원</span>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",background:"#eff6ff",borderRadius:6,padding:"6px 10px" }}>
                  <span style={{ fontSize:12,fontWeight:800,color:"#1d4ed8" }}>비소비지출 소계</span>
                  <span style={{ fontSize:12,fontWeight:900,color:"#1d4ed8" }}>{money(totals.nonConsumptionTotal)}원</span>
                </div>
              </div>
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

          {/* 제안 입력 패널 */}
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
          </Panel>

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
                  <Tooltip formatter={v=>`${money(Number(v))}원`} />
                  <Bar dataKey="value" radius={[8,8,0,0]}>
                    {COLORS.slice(0,5).map(c=><Cell key={c} fill={c} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        {/* ── 데이터 입력 섹션 ── */}
        <DataSection title="자산 입력" section="assets" total={totals.totalAssets} rows={client.assets} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
        <DataSection title="부채 입력" section="liabilities" total={totals.totalLiabilities} rows={client.liabilities} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
        <DataSection title="수입 입력" section="incomes" total={totals.totalIncome} rows={client.incomes} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
        <DataSection title="지출 입력" section="expenses" total={totals.totalExpense} rows={client.expenses} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry}
          extraHeader={
            <div style={{ display:"flex",gap:12,alignItems:"center" }}>
              <span style={{ fontSize:12,fontWeight:800,color:"#b45309",background:"#fff7ed",padding:"3px 10px",borderRadius:999 }}>소비지출 {money(totals.consumptionTotal)}원</span>
              <span style={{ fontSize:12,fontWeight:800,color:"#1d4ed8",background:"#eff6ff",padding:"3px 10px",borderRadius:999 }}>비소비지출 {money(totals.nonConsumptionTotal)}원</span>
            </div>
          }
        />
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
        .fp-profile{display:grid;grid-template-columns:1fr .45fr .45fr .7fr .7fr .8fr .8fr 2fr;gap:10px;background:#fff;border:1px solid #dce4ef;border-radius:8px;padding:14px}
        .fp-input{display:grid;gap:6px;min-width:0}
        .fp-input label{font-size:12px;font-weight:900;color:#64748b}
        .fp-input input{height:42px;border:1px solid #dce4ef;border-radius:8px;padding:0 11px;font-size:14px;font-weight:800;color:#172033;outline:0}
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
        @keyframes fp-spin{to{transform:rotate(360deg)}}
        @media(max-width:1200px){.fp-index-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.fp-profile{grid-template-columns:repeat(4,1fr)}.fp-profile .wide{grid-column:1/-1}.fp-strategy-grid{grid-template-columns:1fr}}
        @media(max-width:900px){.fp-grid,.fp-chartrow,.fp-metrics{grid-template-columns:1fr 1fr}}
        @media(max-width:720px){.fp-page{padding:14px}.fp-hero{align-items:flex-start;flex-direction:column}.fp-grid,.fp-chartrow,.fp-profile,.fp-metrics,.fp-index-grid{grid-template-columns:1fr}.fp-clientbar label{min-width:100%}}
        @media print{.fp-actions,.fp-clientbar button,.fp-delete{display:none!important}.fp-page{padding:0}.fp-shell,.fp-report{background:white}.fp-panel,.fp-metric,.fp-profile,.fp-clientbar,.fp-hero{break-inside:avoid}}
      `}</style>
    </div>
  )
}

// ── 소형 컴포넌트들 ──────────────────────────────────────────────────────────
function Input({ label, value, onChange, type="text", wide }: { label:string; value:string; onChange:(v:string)=>void; type?:string; wide?:boolean }) {
  return (
    <div className={`fp-input${wide?" wide":""}`}>
      <label>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} />
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
      <p>합계 {money(total)}원 ({manwon(total)})</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={74} paddingAngle={2}>
            {data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v,n)=>[`${money(Number(v))}원 (${pct(Number(v),total)}%)`,n]} />
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
          <strong style={{ fontSize:14 }}>합계 {money(total)}원 <span style={{ fontSize:12,fontWeight:700,color:"#64748b" }}>({manwon(total)})</span></strong>
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
                  <td><input type="number" value={item.rate||0} step={0.01} onChange={e=>onUpdate(section,item.id,{ rate:Number(e.target.value) })} /></td>
                )}
                <td><input value={item.memo||""} onChange={e=>onUpdate(section,item.id,{ memo:e.target.value })} /></td>
                <td><button className="fp-delete" onClick={()=>onRemove(section,item.id)}><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
