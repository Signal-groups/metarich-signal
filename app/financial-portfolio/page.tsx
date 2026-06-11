"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  BarChart3,
  Download,
  FileText,
  Lock,
  PieChart as PieChartIcon,
  Plus,
  Printer,
  Save,
  Trash2,
  UserRound,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import { isApprovedUser, normalizeRole } from "../../lib/roles"

type SectionKey = "assets" | "liabilities" | "incomes" | "expenses"

type Entry = {
  id: string
  category: string
  name: string
  institution?: string
  amount: number
  payment?: number
  rate?: number
  memo?: string
}

type ClientPortfolio = {
  id: string
  name: string
  age: number
  gender: string
  creditGrade: number
  foodExpense: number
  memo: string
  assets: Entry[]
  liabilities: Entry[]
  incomes: Entry[]
  expenses: Entry[]
  updatedAt: string
}

type IndexItem = {
  key: string
  label: string
  value: number
  unit: string
  score: number
  status: string
  tone: string
  desc: string
}

type ProductIdea = {
  category: string
  product: string
  risk: string
  target: string
  example: string
  point: string
  caution: string
  priority: number
}

const COLORS = ["#1E5FA8", "#0E7E6B", "#C9A84C", "#C0392B", "#7C3AED", "#0EA5E9", "#64748B", "#F59E0B"]
const STORAGE_KEY = "mr-financial-portfolios" // 오프라인 fallback용

const CREDIT_RATE_TABLE = [
  { grade: "1등급", creditLoan: "4.2~5.4%", mortgage: "3.6~4.5%", policyLoan: "해당 상품 약관 기준", note: "최우량, 한도와 금리 협상력 높음" },
  { grade: "2등급", creditLoan: "4.8~6.0%", mortgage: "3.8~4.8%", policyLoan: "해당 상품 약관 기준", note: "우량, 주거래·소득증빙 유리" },
  { grade: "3등급", creditLoan: "5.5~7.0%", mortgage: "4.1~5.2%", policyLoan: "해당 상품 약관 기준", note: "양호, DSR과 재직 안정성 중요" },
  { grade: "4등급", creditLoan: "6.5~8.5%", mortgage: "4.6~5.8%", policyLoan: "해당 상품 약관 기준", note: "보통, 기존 부채 정리가 금리에 영향" },
  { grade: "5등급", creditLoan: "8.0~11.0%", mortgage: "5.2~6.6%", policyLoan: "해당 상품 약관 기준", note: "주의, 단기부채·카드잔액 관리 필요" },
  { grade: "6등급", creditLoan: "10.5~14.5%", mortgage: "6.0~7.8%", policyLoan: "해당 상품 약관 기준", note: "고금리 가능성, 담보·보증 조건 확인" },
  { grade: "7등급 이하", creditLoan: "14.0% 이상", mortgage: "심사 제한 가능", policyLoan: "가능 여부 개별 확인", note: "대환·연체관리·현금흐름 개선 우선" },
]

const PRODUCT_IDEAS: ProductIdea[] = [
  {
    category: "유동성",
    product: "W-CMA / CMA-RP / 일반 RP",
    risk: "매우낮음~낮음",
    target: "비상자금, 단기 대기성 자금",
    example: "월 지출 3~6개월분을 CMA-RP 또는 RP로 분리해 수시입출금성과 이자수익을 동시에 확보",
    point: "PDF 기준 CMA는 하루만 맡겨도 수익 제공, RP·채권·펀드 등으로 바로 투자 전환이 가능한 대기자금 계좌로 활용 가능",
    caution: "RP·CMA-RP는 예금자보호 대상이 아니며, RP는 보유채권 한도에 따라 조기 소진 가능",
    priority: 90,
  },
  {
    category: "안정수익",
    product: "국고채 / 국민주택채권 / 우량 회사채",
    risk: "매우낮음~보통",
    target: "원금 변동성을 낮추고 정기 이자 흐름을 원하는 고객",
    example: "중장기 여유자금은 국고채·공사채·AA급 이상 채권으로 만기 분산, 일부는 1~3년 회사채로 수익률 보강",
    point: "PDF에는 국고채, 지역개발채권, 우량 회사채의 투자기간·매수수익률·위험등급 예시가 제시되어 있어 안정형 포트폴리오의 중심축으로 활용 가능",
    caution: "채권은 시장금리 상승 시 평가손실이 생길 수 있고, 중도매도 가격과 유동성은 시점별로 달라짐",
    priority: 80,
  },
  {
    category: "달러자산",
    product: "USD RP / 미국 국채",
    risk: "높음",
    target: "달러 보유 고객, 환율 분산과 외화 현금흐름이 필요한 고객",
    example: "달러 보유분은 USD RP로 단기 운용하고, 2~5년 미국 국채를 일부 편입해 통화 분산 효과 확보",
    point: "PDF에는 USD RP와 미국 국채 매출 예시가 있으며, 달러로 매수·이자지급·상환을 받을 수 있는 구조가 설명됨",
    caution: "환율 변동에 따라 원화 기준 수익률이 크게 달라질 수 있고 해외채권은 매수·매도 가능 시점 제한이 있음",
    priority: 60,
  },
  {
    category: "자산배분",
    product: "글로벌 자산배분 Wrap / ETF Wrap",
    risk: "높음~매우높음",
    target: "개별 상품 선택보다 전문가 운용과 리밸런싱이 필요한 고객",
    example: "투자성향이 수익선호형 이상이면 글로벌 ETF랩 20~30% 편입, 목표전환형은 목표수익 도달 시 유동성 자산으로 전환",
    point: "PDF에는 We Know ETF 목표전환형, 글로벌 자산배분 Wrap 등 ETF와 해외주식 중심 랩 상품 예시가 수록됨",
    caution: "Wrap은 예금자보호 대상이 아니며 운용성과에 따라 원금손실 가능, 수수료 구조 확인 필요",
    priority: 70,
  },
  {
    category: "연금",
    product: "연금저축펀드 / TDF / TIF",
    risk: "보통~높음",
    target: "은퇴 준비, 세액공제, 장기 복리 운용이 필요한 고객",
    example: "연 1,800만원 납입한도 내에서 연금저축펀드와 TDF를 활용, 은퇴시점에 맞춰 주식·채권 비중 자동 조절",
    point: "PDF는 연금저축계좌가 펀드·ETF·리츠를 한 계좌에서 운용할 수 있고 운용수익 과세이연 효과가 있음을 설명",
    caution: "연금외 수령 시 기타소득세 과세 가능, 상품별 원금보장 여부와 위험등급 확인 필요",
    priority: 75,
  },
  {
    category: "비과세/연금보험",
    product: "하이브리드 연금보험 / 방카슈랑스 저축성보험",
    risk: "낮음~보통",
    target: "비과세 요건, 확정금리 구간, 종신연금 기능이 필요한 고객",
    example: "장기 안정자금은 5년 확정금리형 연금보험으로 일부 편입하고, 중도인출·추가납입 가능 여부를 상담",
    point: "PDF에는 한화생명 스마트하이브리드연금보험, 교보하이브리드연금보험 등 5년 확정이율·장기유지보너스·연금전환 예시가 제시됨",
    caution: "사업비와 해지환급률, 비과세 요건, 중도인출 조건을 반드시 확인해야 함",
    priority: 65,
  },
  {
    category: "공격투자",
    product: "국내외 주식형 펀드 / 테마 ETF / EMP",
    risk: "높음~매우높음",
    target: "장기 투자기간과 변동성 감내력이 있는 고객",
    example: "순자산이 충분하고 현금흐름이 안정적이면 성장주·반도체·글로벌퀄리티·EMP를 위성자산으로 10~25% 편입",
    point: "PDF에는 국내 성장주, 반도체, 글로벌 배당·퀄리티, EMP, 리츠 등 다양한 펀드 성과표와 위험등급이 수록됨",
    caution: "과거 수익률은 미래수익을 보장하지 않으며 테마형 상품은 변동성이 크므로 분산 편입이 필요",
    priority: 55,
  },
  {
    category: "구조화상품",
    product: "ELS / DLS",
    risk: "높음~매우높음",
    target: "구조와 손실조건을 이해하고 중위험 쿠폰수익을 원하는 고객",
    example: "여유자금 중 소액만 낙인·만기배리어·기초자산을 확인해 분산 편입 검토",
    point: "PDF는 ELS/DLS 위험등급 분류와 낙인배리어, 기초자산 수, 손실구간 등 위험판단 기준을 설명",
    caution: "원금손실 가능성이 있고 구조가 복잡하므로 고령·안정형 고객에게는 제한적으로 제안",
    priority: 35,
  },
]

function row(id: string, category: string, name: string, institution: string, amount: number, payment = 0, rate = 0): Entry {
  return { id, category, name, institution, amount, payment, rate, memo: "" }
}

const starter: ClientPortfolio = {
  id: "sample",
  name: "샘플 고객",
  age: 33,
  gender: "남",
  creditGrade: 3,
  foodExpense: 650000,
  memo: "재무정보와 현금흐름을 한 화면에서 입력하고 비율을 확인합니다.",
  updatedAt: new Date().toISOString(),
  assets: [
    row("cash", "현금", "신한은행 예치금", "신한은행", 11000000),
    row("safe1", "저축보험", "저축보험", "", 17800000, 200000, 0),
    row("safe2", "저축보험", "저축보험", "", 6036209, 60000, 3.76),
    row("safe3", "저축보험", "저축보험", "", 11720717, 125000, 3.06),
    row("safe4", "저축보험", "저축보험", "", 13567717, 83100, 0),
    row("safe5", "저축보험", "저축보험", "", 14099790, 209430, 2.35),
    row("fund", "펀드", "미래에셋 펀드", "미래에셋", 32524545),
    row("pc", "PC방투자", "PC방 투자", "", 68877000, 1800000),
    row("estate1", "부동산", "주거용 부동산(남양주)", "", 550000000),
    row("estate2", "부동산", "주거용 부동산(원주)", "", 244900000),
  ],
  liabilities: [
    row("loan1", "단기부채", "주택청약대출", "", 6800000, 0, 2.63),
    row("loan2", "단기부채", "마이너스통장", "", 559079, 0, 3.85),
    row("loan3", "장기부채", "주택담보대출", "", 243203177, 850000, 2.16),
    row("loan4", "장기부채", "전세보증금", "", 180000000),
  ],
  incomes: [
    row("inc1", "근로소득", "육아수당", "", 1125000),
    row("inc2", "사업소득", "미래에셋 수당", "", 1000000),
    row("inc3", "사업소득", "PC방", "", 1000000),
    row("inc4", "금융소득", "임대소득", "", 950000),
  ],
  expenses: [
    row("exp1", "소비지출", "생활비", "", 300000),
    row("exp2", "보장성보험", "자녀보험", "", 63116),
    row("exp3", "실손보험", "실손보험", "", 11375),
    row("exp4", "실손보험", "실손보험", "", 18971),
    row("exp5", "보장성보험", "종신보험", "", 83100),
    row("exp6", "대출원리금", "대출원리금", "", 850000),
    row("exp7", "통신", "인터넷", "", 32670),
    row("exp8", "저축/투자", "저축보험", "", 200000),
    row("exp9", "저축/투자", "저축보험", "", 60000),
    row("exp10", "저축/투자", "저축보험", "", 125000),
    row("exp11", "저축/투자", "저축보험", "", 209430),
  ],
}

const money = (value: number) => Math.round(value || 0).toLocaleString("ko-KR")
const manwon = (value: number) => `${money(Math.round((value || 0) / 10000))}만원`
const pct = (value: number, total: number) => total > 0 ? Math.round((value / total) * 1000) / 10 : 0
const sum = (items: Entry[]) => items.reduce((acc, item) => acc + Number(item.amount || 0), 0)
const bounded = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

function groupByCategory(items: Entry[]) {
  const grouped = new Map<string, number>()
  items.forEach((item) => grouped.set(item.category, (grouped.get(item.category) || 0) + Number(item.amount || 0)))
  return Array.from(grouped, ([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
}

function loadClients(): ClientPortfolio[] {
  if (typeof window === "undefined") return [starter]
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return [starter]
    const parsed = JSON.parse(saved) as Partial<ClientPortfolio>[]
    if (!Array.isArray(parsed) || parsed.length === 0) return [starter]
    return parsed.map((item) => ({
      ...starter,
      ...item,
      creditGrade: Number(item.creditGrade || 3),
      foodExpense: Number(item.foodExpense || 0),
      assets: item.assets || [],
      liabilities: item.liabilities || [],
      incomes: item.incomes || [],
      expenses: item.expenses || [],
    }))
  } catch {
    return [starter]
  }
}

function gradeFromScore(score: number) {
  if (score >= 80) return "안정"
  if (score >= 60) return "점검"
  return "주의"
}

function scoreFromLowerBetter(value: number, good: number, caution: number) {
  if (value <= good) return 90
  if (value >= caution) return 35
  return 90 - ((value - good) / (caution - good)) * 55
}

function scoreFromHigherBetter(value: number, caution: number, good: number) {
  if (value >= good) return 90
  if (value <= caution) return 35
  return 35 + ((value - caution) / (good - caution)) * 55
}

function getInvestorProfile(totals: {
  debtRatio: number
  savingsRate: number
  cashFlow: number
  totalIncome: number
}, age: number) {
  if (totals.cashFlow < 0 || totals.debtRatio >= 65) return "방어형"
  if (age >= 58 || totals.savingsRate < 10 || totals.debtRatio >= 45) return "안정형"
  if (age <= 45 && totals.savingsRate >= 25 && totals.debtRatio < 35) return "성장형"
  return "균형형"
}

function getAllocation(profile: string) {
  if (profile === "방어형") {
    return [
      { name: "비상자금/CMA", value: 35, fill: "#1E5FA8" },
      { name: "부채상환", value: 30, fill: "#C0392B" },
      { name: "채권/RP", value: 25, fill: "#0E7E6B" },
      { name: "연금/보험", value: 10, fill: "#C9A84C" },
    ]
  }
  if (profile === "안정형") {
    return [
      { name: "CMA/RP", value: 20, fill: "#1E5FA8" },
      { name: "국고채/우량채", value: 35, fill: "#0E7E6B" },
      { name: "연금/TDF", value: 25, fill: "#C9A84C" },
      { name: "ETF/랩", value: 15, fill: "#7C3AED" },
      { name: "달러자산", value: 5, fill: "#0EA5E9" },
    ]
  }
  if (profile === "성장형") {
    return [
      { name: "CMA/RP", value: 10, fill: "#1E5FA8" },
      { name: "채권", value: 20, fill: "#0E7E6B" },
      { name: "ETF/랩", value: 35, fill: "#7C3AED" },
      { name: "연금/TDF", value: 20, fill: "#C9A84C" },
      { name: "달러/대체", value: 15, fill: "#F59E0B" },
    ]
  }
  return [
    { name: "CMA/RP", value: 15, fill: "#1E5FA8" },
    { name: "채권/RP", value: 30, fill: "#0E7E6B" },
    { name: "ETF/랩", value: 25, fill: "#7C3AED" },
    { name: "연금/TDF", value: 20, fill: "#C9A84C" },
    { name: "달러/대체", value: 10, fill: "#F59E0B" },
  ]
}

function getRecommendedProducts(profile: string, totals: { debtRatio: number; savingsRate: number; cashFlow: number }, age: number) {
  return PRODUCT_IDEAS
    .map((item) => {
      let boost = 0
      if (item.category === "유동성" && (totals.cashFlow < 0 || totals.savingsRate < 10)) boost += 35
      if (item.category === "안정수익" && (profile === "안정형" || profile === "방어형")) boost += 25
      if (item.category === "연금" && age >= 35) boost += 25
      if (item.category === "비과세/연금보험" && (age >= 45 || profile === "안정형")) boost += 20
      if (item.category === "자산배분" && (profile === "균형형" || profile === "성장형")) boost += 28
      if (item.category === "공격투자" && profile === "성장형") boost += 35
      if (item.category === "달러자산" && profile !== "방어형") boost += 12
      if (item.category === "구조화상품" && profile === "방어형") boost -= 25
      if (totals.debtRatio > 55 && ["공격투자", "구조화상품", "달러자산"].includes(item.category)) boost -= 20
      return { ...item, priority: item.priority + boost }
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6)
}

export default function FinancialPortfolioPage() {
  const router = useRouter()
  const reportRef = useRef<HTMLDivElement>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [advisorId, setAdvisorId] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientPortfolio[]>(() => loadClients())
  const [selectedId, setSelectedId] = useState(starter.id)
  const [isExporting, setIsExporting] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 인증 + Supabase 데이터 로드 ─────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace(`/login?redirectTo=${encodeURIComponent('/financial-portfolio')}`)
        return
      }

      const { data: userData } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle()
      const userInfo = userData || session.user
      const role = normalizeRole(userInfo)
      const isMaster = role === "master"
      const isPlannerOrAbove = ["agent", "manager", "leader", "headquarters", "master"].includes(role)
      const isAllowed = isMaster || (isPlannerOrAbove && isApprovedUser(userInfo))

      if (!isAllowed) {
        setAllowed(false)
        return
      }

      setAdvisorId(session.user.id)

      // Supabase에서 해당 설계사 포트폴리오 불러오기
      const { data: rows, error } = await supabase
        .from("financial_portfolios")
        .select("id, portfolio")
        .order("updated_at", { ascending: false })

      if (!error && rows && rows.length > 0) {
        const loaded = rows.map((r) => ({
          ...starter,
          ...(r.portfolio as Partial<ClientPortfolio>),
          id: r.id as string,
        }))
        setClients(loaded)
        setSelectedId(loaded[0].id)
      }
      // rows가 없으면 기존 localStorage 또는 starter 유지

      setAllowed(true)
    }
    init()
  }, [router])

  // ── 변경 시 Supabase 자동 저장 (debounce 2초) ──────────────────────────
  useEffect(() => {
    if (!advisorId || allowed !== true) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSyncStatus('saving')

    saveTimerRef.current = setTimeout(async () => {
      // localStorage fallback 저장
      if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(clients))

      // Supabase upsert (advisor_id 기준 RLS 적용)
      const upserts = clients.map((c) => ({
        id: c.id,
        advisor_id: advisorId,
        name: c.name,
        portfolio: c as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      }))
      const { error } = await supabase
        .from("financial_portfolios")
        .upsert(upserts, { onConflict: "id" })

      setSyncStatus(error ? 'error' : 'saved')
      setTimeout(() => setSyncStatus('idle'), 2500)
    }, 2000)

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [clients, advisorId, allowed])

  const client = clients.find((item) => item.id === selectedId) || clients[0] || starter
  const totals = useMemo(() => {
    const totalAssets = sum(client.assets)
    const totalLiabilities = sum(client.liabilities)
    const totalIncome = sum(client.incomes)
    const totalExpense = sum(client.expenses)
    const loanPayments = client.liabilities.reduce((acc, item) => acc + Number(item.payment || 0), 0)
    const savingExpense = client.expenses
      .filter((item) => item.category.includes("저축") || item.category.includes("투자"))
      .reduce((acc, item) => acc + Number(item.amount || 0), 0)
    const protectionExpense = client.expenses
      .filter((item) => item.category.includes("보험") || item.name.includes("보험"))
      .reduce((acc, item) => acc + Number(item.amount || 0), 0)

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      totalIncome,
      totalExpense,
      cashFlow: totalIncome - totalExpense,
      loanPayments,
      savingExpense,
      protectionExpense,
      savingsRate: pct(totalIncome - totalExpense, totalIncome),
      debtRatio: pct(totalLiabilities, totalAssets),
      engelIndex: pct(client.foodExpense, totalIncome),
      fixedExpenseRatio: pct(loanPayments + protectionExpense, totalIncome),
    }
  }, [client])

  const financialIndexes = useMemo<IndexItem[]>(() => {
    const items = [
      {
        key: "debt",
        label: "부채비율",
        value: totals.debtRatio,
        unit: "%",
        score: scoreFromLowerBetter(totals.debtRatio, 35, 70),
        desc: "총자산 대비 부채 비중입니다. 35% 이하는 안정, 70% 이상은 부채 구조 점검이 필요합니다.",
      },
      {
        key: "cashflow",
        label: "현금흐름지수",
        value: totals.savingsRate,
        unit: "%",
        score: scoreFromHigherBetter(totals.savingsRate, 0, 25),
        desc: "월 소득에서 지출 후 남는 비율입니다. 비상자금과 장기저축 여력을 보는 핵심 지표입니다.",
      },
      {
        key: "engel",
        label: "앵겔지수",
        value: totals.engelIndex,
        unit: "%",
        score: scoreFromLowerBetter(totals.engelIndex, 15, 30),
        desc: "월 소득 중 식비가 차지하는 비중입니다. 식비가 높으면 생활비 구조 개선 여지가 큽니다.",
      },
      {
        key: "fixed",
        label: "고정지출부담률",
        value: totals.fixedExpenseRatio,
        unit: "%",
        score: scoreFromLowerBetter(totals.fixedExpenseRatio, 35, 55),
        desc: "대출상환과 보험료처럼 줄이기 어려운 지출의 소득 대비 비중입니다.",
      },
      {
        key: "credit",
        label: "신용등급지수",
        value: client.creditGrade,
        unit: "등급",
        score: bounded(100 - (client.creditGrade - 1) * 11),
        desc: "상담용 신용등급 입력값입니다. 등급이 낮아질수록 대출 금리와 한도 조건이 불리해질 수 있습니다.",
      },
    ]

    return items.map((item) => ({
      ...item,
      score: bounded(item.score),
      status: gradeFromScore(item.score),
      tone: item.score >= 80 ? "#0E7E6B" : item.score >= 60 ? "#C9A84C" : "#C0392B",
    }))
  }, [client.creditGrade, totals])

  const currentCreditRate = CREDIT_RATE_TABLE[Math.min(Math.max(client.creditGrade, 1), 7) - 1] || CREDIT_RATE_TABLE[6]
  const investorProfile = getInvestorProfile(totals, client.age)
  const allocationData = getAllocation(investorProfile)
  const recommendedProducts = getRecommendedProducts(investorProfile, totals, client.age)

  const updateClient = (patch: Partial<ClientPortfolio>) => {
    setClients((prev) => prev.map((item) => item.id === client.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item))
  }

  const updateEntry = (section: SectionKey, id: string, patch: Partial<Entry>) => {
    updateClient({ [section]: client[section].map((item) => item.id === id ? { ...item, ...patch } : item) } as Partial<ClientPortfolio>)
  }

  const addEntry = (section: SectionKey) => {
    updateClient({ [section]: [...client[section], row(crypto.randomUUID(), "기타", "새 항목", "", 0)] } as Partial<ClientPortfolio>)
  }

  const removeEntry = (section: SectionKey, id: string) => {
    updateClient({ [section]: client[section].filter((item) => item.id !== id) } as Partial<ClientPortfolio>)
  }

  const addClient = () => {
    const id = crypto.randomUUID()
    const next = { ...starter, id, name: "신규 고객", assets: [], liabilities: [], incomes: [], expenses: [], updatedAt: new Date().toISOString() }
    setClients((prev) => [...prev, next])
    setSelectedId(id)
  }

  const deleteClient = async () => {
    if (clients.length <= 1) return
    // Supabase에서도 삭제 (RLS로 본인 데이터만 삭제 가능)
    await supabase.from("financial_portfolios").delete().eq("id", client.id)
    const filtered = clients.filter((item) => item.id !== client.id)
    setClients(filtered)
    setSelectedId(filtered[0].id)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(client, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${client.name || "portfolio"}-financial-portfolio.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = async () => {
    if (!reportRef.current) return
    setIsExporting(true)
    await new Promise((resolve) => setTimeout(resolve, 120))
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: "#f4f7fb",
      useCORS: true,
    })
    const imgData = canvas.toDataURL("image/jpeg", 0.92)
    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgHeight = (canvas.height * pageWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight)
    heightLeft -= pageHeight
    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight)
      heightLeft -= pageHeight
    }
    pdf.save(`${client.name || "고객"}_재무설계_포트폴리오.pdf`)
    setIsExporting(false)
  }

  if (allowed === null) {
    return (
      <Shell>
        <div className="fp-empty">
          <div style={{ width: 40, height: 40, border: '4px solid #dce4ef', borderTop: '4px solid #1E5FA8', borderRadius: '50%', animation: 'fp-spin 0.8s linear infinite' }} />
          <p style={{ color: '#64748b', fontWeight: 800 }}>권한 확인 중...</p>
        </div>
      </Shell>
    )
  }
  if (!allowed) {
    return (
      <Shell>
        <div className="fp-empty">
          <Lock className="h-9 w-9" />
          <h1>설계사 이상 전용 페이지입니다</h1>
          <p>고객 재무자료 보호를 위해 승인된 메타리치 설계사 등급 이상만 이용할 수 있습니다.</p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ marginTop: 12, height: 42, padding: '0 20px', borderRadius: 8, background: '#10233e', color: '#fff', border: 0, fontWeight: 900, cursor: 'pointer' }}
          >
            ← 대시보드로 돌아가기
          </button>
        </div>
      </Shell>
    )
  }

  const assetData = groupByCategory(client.assets)
  const liabilityData = groupByCategory(client.liabilities)
  const incomeData = groupByCategory(client.incomes)
  const expenseData = groupByCategory(client.expenses)

  return (
    <Shell>
      <main className="fp-page">
        <header className="fp-hero">
          <div>
            <p>Financial Portfolio Workspace</p>
            <h1>재무설계 포트폴리오</h1>
            <span>재무정보, 현금흐름, 가계 재무지표, 신용등급별 예상금리를 고객별로 관리합니다.</span>
          </div>
          <div className="fp-actions">
            <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(201,168,76,0.2)', borderColor: 'rgba(201,168,76,0.4)', color: '#c9a84c' }}>← 대시보드</button>
            {syncStatus === 'saving' && <span style={{ fontSize: 12, color: '#9ec5ef', fontWeight: 800 }}>저장 중...</span>}
            {syncStatus === 'saved' && <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 800 }}>✓ 저장됨</span>}
            {syncStatus === 'error' && <span style={{ fontSize: 12, color: '#f87171', fontWeight: 800 }}>⚠ 저장 실패</span>}
            <button onClick={() => window.print()}><Printer className="h-4 w-4" /> 인쇄</button>
            <button onClick={exportPdf} disabled={isExporting}><Download className="h-4 w-4" /> {isExporting ? "PDF 생성중" : "PDF 저장"}</button>
            <button onClick={exportJson}><Download className="h-4 w-4" /> 데이터 내보내기</button>
          </div>
        </header>

        <section className="fp-clientbar">
          <label>
            <UserRound className="h-4 w-4" />
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button onClick={addClient}><Plus className="h-4 w-4" /> 고객 추가</button>
          <button onClick={deleteClient} disabled={clients.length <= 1}><Trash2 className="h-4 w-4" /> 삭제</button>
          <button onClick={() => updateClient({ updatedAt: new Date().toISOString() })}><Save className="h-4 w-4" /> 저장</button>
        </section>

        <div ref={reportRef} className="fp-report">
          <section className="fp-profile">
            <Input label="고객명" value={client.name} onChange={(value) => updateClient({ name: value })} />
            <Input label="나이" value={String(client.age)} type="number" onChange={(value) => updateClient({ age: Number(value) })} />
            <Input label="성별" value={client.gender} onChange={(value) => updateClient({ gender: value })} />
            <Input label="신용등급" value={String(client.creditGrade)} type="number" onChange={(value) => updateClient({ creditGrade: Math.min(7, Math.max(1, Number(value) || 1)) })} />
            <Input label="월 식비" value={String(client.foodExpense)} type="number" onChange={(value) => updateClient({ foodExpense: Number(value) })} />
            <Input label="상담 메모" value={client.memo} onChange={(value) => updateClient({ memo: value })} wide />
          </section>

          <section className="fp-metrics">
            <Metric label="자산 합계" value={money(totals.totalAssets)} sub={manwon(totals.totalAssets)} tone="#1E5FA8" />
            <Metric label="부채 합계" value={money(totals.totalLiabilities)} sub={`부채비율 ${totals.debtRatio}%`} tone="#C0392B" />
            <Metric label="순자산" value={money(totals.netWorth)} sub={manwon(totals.netWorth)} tone="#0E7E6B" />
            <Metric label="월 현금흐름" value={money(totals.cashFlow)} sub={`저축가능률 ${totals.savingsRate}%`} tone="#C9A84C" />
          </section>

          <Panel title="가계 재무지수 진단" icon={<BarChart3 className="h-5 w-5" />}>
            <div className="fp-index-grid">
              {financialIndexes.map((item) => <IndexGauge key={item.key} item={item} />)}
            </div>
          </Panel>

          <Panel title="신용등급별 예상 대출금리" icon={<FileText className="h-5 w-5" />}>
            <div className="fp-credit-summary">
              <strong>현재 입력 등급: {client.creditGrade}등급</strong>
              <span>예상 신용대출 {currentCreditRate.creditLoan} · 주택담보대출 {currentCreditRate.mortgage}</span>
            </div>
            <div className="fp-table-wrap">
              <table className="fp-table fp-rate-table">
                <thead>
                  <tr>
                    <th>신용등급</th>
                    <th>신용대출 예상금리</th>
                    <th>주택담보대출 예상금리</th>
                    <th>보험계약대출</th>
                    <th>상담 포인트</th>
                  </tr>
                </thead>
                <tbody>
                  {CREDIT_RATE_TABLE.map((item, index) => (
                    <tr key={item.grade} className={index + 1 === client.creditGrade ? "active" : ""}>
                      <td>{item.grade}</td>
                      <td>{item.creditLoan}</td>
                      <td>{item.mortgage}</td>
                      <td>{item.policyLoan}</td>
                      <td>{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fp-note">금리는 상담용 예시 범위입니다. 실제 금리는 기준일, 금융기관, DSR, 담보, 직업, 소득증빙, 연체 이력에 따라 달라집니다.</p>
          </Panel>

          <Panel title="자산배분전략 및 상품별 추천 예시" icon={<PieChartIcon className="h-5 w-5" />}>
            <div className="fp-strategy-grid">
              <div className="fp-strategy-card">
                <div className="fp-strategy-title">
                  <span>추천 투자성향</span>
                  <strong>{investorProfile}</strong>
                </div>
                <p>
                  {investorProfile === "방어형"
                    ? "현금흐름과 부채 부담을 먼저 안정시키는 구간입니다. 신규 투자보다 비상자금, 고금리 부채 정리, 단기 확정금리 중심으로 제안합니다."
                    : investorProfile === "안정형"
                      ? "자산 보전과 정기 현금흐름을 우선하면서 연금·채권 중심의 중장기 포트폴리오를 구성합니다."
                      : investorProfile === "성장형"
                        ? "현금흐름 여력이 있어 ETF·랩·연금펀드 등 성장자산 비중을 높일 수 있습니다. 다만 핵심자산과 위성자산을 분리합니다."
                        : "채권·연금·ETF를 균형 있게 배분해 안정성과 성장성을 함께 가져가는 구간입니다."}
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={2}>
                      {allocationData.map((item) => <Cell key={item.name} fill={item.fill} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="fp-allocation-list">
                  {allocationData.map((item) => (
                    <div key={item.name}>
                      <span style={{ background: item.fill }} />
                      <strong>{item.name}</strong>
                      <em>{item.value}%</em>
                    </div>
                  ))}
                </div>
              </div>

              <div className="fp-product-list">
                {recommendedProducts.map((item) => (
                  <article key={`${item.category}-${item.product}`} className="fp-product-card">
                    <div>
                      <span>{item.category}</span>
                      <strong>{item.product}</strong>
                    </div>
                    <dl>
                      <dt>추천대상</dt>
                      <dd>{item.target}</dd>
                      <dt>추천예시</dt>
                      <dd>{item.example}</dd>
                      <dt>자료 포인트</dt>
                      <dd>{item.point}</dd>
                      <dt>주의사항</dt>
                      <dd>{item.caution}</dd>
                    </dl>
                    <p>위험도: {item.risk}</p>
                  </article>
                ))}
              </div>
            </div>
            <p className="fp-note">상품 추천 예시는 업로드된 금융상품 길라잡이 PDF의 상품군과 설명을 상담용으로 재구성한 것입니다. 실제 제안 전 최신 금리, 판매 가능 여부, 투자성향 적합성, 설명의무를 다시 확인해야 합니다.</p>
          </Panel>

          <section className="fp-grid">
            <Panel title="자산 및 부채 비중" icon={<PieChartIcon className="h-5 w-5" />}>
              <div className="fp-chartrow">
                <Donut title="자산 비중" data={assetData} total={totals.totalAssets} />
                <Donut title="부채 비중" data={liabilityData} total={totals.totalLiabilities} />
              </div>
            </Panel>
            <Panel title="수입 및 지출 비중" icon={<BarChart3 className="h-5 w-5" />}>
              <div className="fp-chartrow">
                <Donut title="수입 비중" data={incomeData} total={totals.totalIncome} />
                <Donut title="지출 비중" data={expenseData} total={totals.totalExpense} />
              </div>
            </Panel>
          </section>

          <Panel title="재무상태 요약" icon={<FileText className="h-5 w-5" />}>
            <div className="fp-bars">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  { name: "자산", value: totals.totalAssets },
                  { name: "부채", value: totals.totalLiabilities },
                  { name: "순자산", value: Math.max(totals.netWorth, 0) },
                  { name: "월수입", value: totals.totalIncome },
                  { name: "월지출", value: totals.totalExpense },
                ]}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 800 }} />
                  <YAxis hide />
                  <Tooltip formatter={(value) => `${money(Number(value))}원`} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {COLORS.slice(0, 5).map((color) => <Cell key={color} fill={color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <DataSection title="자산 입력" section="assets" total={totals.totalAssets} rows={client.assets} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
        <DataSection title="부채 입력" section="liabilities" total={totals.totalLiabilities} rows={client.liabilities} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
        <DataSection title="수입 입력" section="incomes" total={totals.totalIncome} rows={client.incomes} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
        <DataSection title="지출 입력" section="expenses" total={totals.totalExpense} rows={client.expenses} onAdd={addEntry} onUpdate={updateEntry} onRemove={removeEntry} />
      </main>
    </Shell>
  )
}

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
        .fp-profile{display:grid;grid-template-columns:1fr .45fr .45fr .55fr .8fr 2fr;gap:10px;background:#fff;border:1px solid #dce4ef;border-radius:8px;padding:14px}
        .fp-input{display:grid;gap:6px;min-width:0}
        .fp-input label{font-size:12px;font-weight:900;color:#64748b}
        .fp-input input{height:42px;border:1px solid #dce4ef;border-radius:8px;padding:0 11px;font-size:14px;font-weight:800;color:#172033;outline:0}
        .fp-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .fp-metric{background:#fff;border:1px solid #dce4ef;border-radius:8px;padding:17px;border-top:4px solid var(--tone)}
        .fp-metric span{display:block;color:#64748b;font-size:12px;font-weight:900}
        .fp-metric strong{display:block;margin-top:6px;font-size:24px;font-weight:950;color:#172033;overflow-wrap:anywhere}
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
        .fp-credit-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #dbeafe;background:#eff6ff;border-radius:8px;padding:12px 14px;margin-bottom:12px;color:#10233e}
        .fp-credit-summary strong{font-size:15px}
        .fp-credit-summary span{font-size:13px;font-weight:900;color:#1E5FA8}
        .fp-note{margin:10px 0 0;color:#64748b;font-size:12px;font-weight:800}
        .fp-strategy-grid{display:grid;grid-template-columns:360px minmax(0,1fr);gap:14px}
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
        .fp-product-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .fp-product-card{border:1px solid #dce4ef;border-left:4px solid #1E5FA8;border-radius:8px;background:#fff;padding:13px;min-width:0}
        .fp-product-card div{display:grid;gap:3px;margin-bottom:9px}
        .fp-product-card div span{font-size:11px;font-weight:950;color:#0E7E6B}
        .fp-product-card div strong{font-size:15px;font-weight:950;color:#10233e}
        .fp-product-card dl{display:grid;grid-template-columns:70px minmax(0,1fr);gap:5px 8px;margin:0}
        .fp-product-card dt{font-size:11px;font-weight:950;color:#64748b}
        .fp-product-card dd{margin:0;font-size:12px;font-weight:800;line-height:1.45;color:#334155}
        .fp-product-card p{margin:10px 0 0;border-top:1px solid #eef2f7;padding-top:8px;font-size:12px;font-weight:950;color:#C0392B}
        .fp-bars{height:280px}
        .fp-table-wrap{overflow-x:auto}
        .fp-table{width:100%;border-collapse:collapse;min-width:920px}
        .fp-table th{background:#eaf2f8;color:#10233e;font-size:12px;font-weight:950;text-align:left;padding:9px;border:1px solid #cbd7e5}
        .fp-table td{border:1px solid #dce4ef;padding:6px;background:#fff;font-size:13px;font-weight:800}
        .fp-table input{width:100%;height:34px;border:0;background:#fff7bd;padding:0 8px;font-weight:800;outline:0;color:#172033}
        .fp-table input[type=number]{text-align:right}
        .fp-rate-table{min-width:860px}
        .fp-rate-table tr.active td{background:#fff7bd}
        .fp-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .fp-section-head button{border:1px solid #10233e;border-radius:8px;background:#10233e;color:#fff;height:34px;padding:0 10px;font-weight:900;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
        .fp-delete{width:34px;height:34px;border:0;border-radius:8px;background:#fee2e2;color:#b91c1c;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
        .fp-empty{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;color:#10233e;font-weight:900}
        .fp-empty h1{margin:0;font-size:26px}
        .fp-empty p{margin:0;color:#64748b}
        @keyframes fp-spin{to{transform:rotate(360deg)}}
        @media(max-width:1200px){.fp-index-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.fp-profile{grid-template-columns:1fr 1fr 1fr}.fp-profile .wide{grid-column:1/-1}.fp-strategy-grid{grid-template-columns:1fr}.fp-product-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:900px){.fp-grid,.fp-chartrow,.fp-metrics{grid-template-columns:1fr 1fr}}
        @media(max-width:720px){.fp-page{padding:14px}.fp-hero{align-items:flex-start;flex-direction:column}.fp-grid,.fp-chartrow,.fp-profile,.fp-metrics,.fp-index-grid,.fp-product-list{grid-template-columns:1fr}.fp-clientbar label{min-width:100%}.fp-credit-summary{align-items:flex-start;flex-direction:column}}
        @media print{.fp-actions,.fp-clientbar button,.fp-delete{display:none!important}.fp-page{padding:0}.fp-shell,.fp-report{background:white}.fp-panel,.fp-metric,.fp-profile,.fp-clientbar,.fp-hero{break-inside:avoid}}
      `}</style>
    </div>
  )
}

function Input({ label, value, onChange, type = "text", wide }: { label: string; value: string; onChange: (value: string) => void; type?: string; wide?: boolean }) {
  return (
    <div className={`fp-input ${wide ? "wide" : ""}`}>
      <label>{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="fp-metric" style={{ "--tone": tone } as React.CSSProperties}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{sub}</em>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
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
      <div className="fp-index-head">
        <h3>{item.label}</h3>
        <span>{item.status}</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ name: item.label, value: item.score, fill: item.tone }]} startAngle={180} endAngle={0}>
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#e5edf7" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="fp-index-value">
        <strong>{item.value}</strong>
        <span>{item.unit}</span>
      </div>
      <p>{item.desc}</p>
    </div>
  )
}

function Donut({ title, data, total }: { title: string; data: { name: string; value: number }[]; total: number }) {
  return (
    <div className="fp-donut">
      <h3>{title}</h3>
      <p>합계 {money(total)}원</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={82} paddingAngle={2}>
            {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(value, name) => [`${money(Number(value))}원 (${pct(Number(value), total)}%)`, name]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

function DataSection({
  title,
  section,
  rows,
  total,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string
  section: SectionKey
  rows: Entry[]
  total: number
  onAdd: (section: SectionKey) => void
  onUpdate: (section: SectionKey, id: string, patch: Partial<Entry>) => void
  onRemove: (section: SectionKey, id: string) => void
}) {
  return (
    <Panel title={title} icon={<FileText className="h-5 w-5" />}>
      <div className="fp-section-head">
        <strong>합계 {money(total)}원</strong>
        <button onClick={() => onAdd(section)}><Plus className="h-4 w-4" /> 항목 추가</button>
      </div>
      <div className="fp-table-wrap" style={{ marginTop: 12 }}>
        <table className="fp-table">
          <thead>
            <tr>
              <th>구분</th>
              <th>항목</th>
              <th>기관/상품명</th>
              <th>금액(원)</th>
              <th>비중(%)</th>
              <th>납입/상환액</th>
              <th>금리/수익률(%)</th>
              <th>메모</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td><input value={item.category} onChange={(event) => onUpdate(section, item.id, { category: event.target.value })} /></td>
                <td><input value={item.name} onChange={(event) => onUpdate(section, item.id, { name: event.target.value })} /></td>
                <td><input value={item.institution || ""} onChange={(event) => onUpdate(section, item.id, { institution: event.target.value })} /></td>
                <td><input type="number" value={item.amount} onChange={(event) => onUpdate(section, item.id, { amount: Number(event.target.value) })} /></td>
                <td style={{ textAlign: "right", fontWeight: 900 }}>{pct(item.amount, total)}%</td>
                <td><input type="number" value={item.payment || 0} onChange={(event) => onUpdate(section, item.id, { payment: Number(event.target.value) })} /></td>
                <td><input type="number" value={item.rate || 0} onChange={(event) => onUpdate(section, item.id, { rate: Number(event.target.value) })} /></td>
                <td><input value={item.memo || ""} onChange={(event) => onUpdate(section, item.id, { memo: event.target.value })} /></td>
                <td><button className="fp-delete" onClick={() => onRemove(section, item.id)}><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}