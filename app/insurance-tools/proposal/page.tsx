"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bone,
  Car,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Download,
  FileText,
  HeartPulse,
  Home,
  PawPrint,
  Plus,
  ShieldCheck,
  Stethoscope,
  Upload,
  X,
} from "lucide-react"
import { supabase } from "../../../lib/supabase"
import { ensureUserProfile } from "../../../lib/userProfile"
import { canAccessProposalGenerator, isApprovedUser, normalizeRole, ROLE_PRIORITY } from "../../../lib/roles"
import LoadingScreen from "../../components/LoadingScreen"

type ProposalMode = "single" | "compare"
type CategoryId = "driver" | "health" | "care" | "homecare" | "pet" | "shortlife"
type CompareFocus = "balance" | "premium" | "coverage" | "scope" | "refund"
type MetricKind = "money" | "text" | "percent"

type MetricDef = {
  key: string
  label: string
  shortLabel?: string
  unit?: string
  kind?: MetricKind
  guide: string
}

type CategoryTemplate = {
  id: CategoryId
  label: string
  desc: string
  tone: string
  icon: typeof ShieldCheck
  summary: string
  metrics: MetricDef[]
  infographic: "bars" | "timeline" | "radar" | "cards"
  reportTitle: string
}

type PlanData = {
  id: string
  company: string
  productName: string
  monthlyPremium: string
  paymentYears: string
  coverageYears: string
  fileName: string
  memo: string
  strengths: string
  cautions: string
  metrics: Record<string, string>
}

type ConsultantInfo = {
  name: string
  phone: string
}

const categories: CategoryTemplate[] = [
  {
    id: "driver",
    label: "운전자보험",
    desc: "형사합의금, 변호사비, 벌금, 자부상 중심 비교",
    tone: "from-cyan-500 to-sky-600",
    icon: Car,
    summary: "교통사고 처리 과정에서 실제 지출될 수 있는 비용담보를 한 장으로 정리합니다.",
    infographic: "cards",
    reportTitle: "운전자 핵심 비용담보 비교",
    metrics: [
      { key: "trafficSupport", label: "교통사고처리지원금", shortLabel: "처리지원금", unit: "만원", kind: "money", guide: "사망·중상해·중대법규 사고 시 형사합의금 성격" },
      { key: "lawyer", label: "변호사선임비용", shortLabel: "변호사비", unit: "만원", kind: "money", guide: "경찰조사·검찰·재판 단계별 지급 조건 확인" },
      { key: "finePerson", label: "벌금 대인", shortLabel: "대인벌금", unit: "만원", kind: "money", guide: "대인 사고 벌금 한도" },
      { key: "fineProperty", label: "벌금 대물", shortLabel: "대물벌금", unit: "만원", kind: "money", guide: "대물 벌금 한도" },
      { key: "injury", label: "자동차사고부상치료비", shortLabel: "자부상", unit: "만원", kind: "money", guide: "부상 급수별 지급금액 차이 확인" },
      { key: "renewal", label: "갱신 여부", shortLabel: "갱신", kind: "text", guide: "갱신형은 향후 보험료 변동 가능" },
    ],
  },
  {
    id: "health",
    label: "건강보험",
    desc: "암·뇌·심장·수술·입원·간병 담보와 총보험료 비교",
    tone: "from-rose-500 to-orange-500",
    icon: HeartPulse,
    summary: "같은 금액 비교보다 보장범위 차이까지 함께 설명하는 건강보험 비교표를 만듭니다.",
    infographic: "bars",
    reportTitle: "주요 질병·수술 담보 비교",
    metrics: [
      { key: "cancer", label: "일반암 진단비", shortLabel: "일반암", unit: "만원", kind: "money", guide: "일반암 기준 진단비" },
      { key: "minorCancer", label: "유사암 진단비", shortLabel: "유사암", unit: "만원", kind: "money", guide: "갑상선암·기타피부암 등 소액암 기준" },
      { key: "brain", label: "뇌 보장", shortLabel: "뇌", unit: "만원", kind: "money", guide: "뇌출혈·뇌졸중·뇌혈관질환 중 범위 확인" },
      { key: "heart", label: "심장 보장", shortLabel: "심장", unit: "만원", kind: "money", guide: "급성심근경색·허혈성·심혈관질환 중 범위 확인" },
      { key: "surgery", label: "질병수술비", shortLabel: "수술비", unit: "만원", kind: "money", guide: "질병수술비, N대수술비, 종수술비 구조 확인" },
      { key: "care", label: "간병 보장", shortLabel: "간병", unit: "만원", kind: "money", guide: "간병인 사용일당 또는 간호간병통합 보장" },
    ],
  },
  {
    id: "care",
    label: "간병보험",
    desc: "간병인, 간호간병통합, 치매, 장기요양 등급 중심",
    tone: "from-emerald-500 to-teal-600",
    icon: Stethoscope,
    summary: "입원 간병비와 장기요양 리스크를 분리해 가족 부담을 줄이는 방향으로 설명합니다.",
    infographic: "radar",
    reportTitle: "간병 리스크 대비 구조",
    metrics: [
      { key: "caregiverDaily", label: "간병인 사용일당", shortLabel: "간병인", unit: "만원", kind: "money", guide: "간병인 직접 사용 시 지급" },
      { key: "integratedDaily", label: "간호간병통합일당", shortLabel: "통합병동", unit: "만원", kind: "money", guide: "간호간병통합서비스 병동 입원 시 지급" },
      { key: "dementia", label: "치매 진단/간병", shortLabel: "치매", unit: "만원", kind: "money", guide: "CDR 등급·중증도 조건 확인" },
      { key: "ltc1to2", label: "장기요양 1~2등급", shortLabel: "1~2등급", unit: "만원", kind: "money", guide: "중증 장기요양 상태 대비" },
      { key: "ltc3to5", label: "장기요양 3~5등급", shortLabel: "3~5등급", unit: "만원", kind: "money", guide: "상대적으로 발생 가능성이 높은 등급" },
      { key: "premiumType", label: "갱신/비갱신", shortLabel: "구조", kind: "text", guide: "장기 유지 보험료 변동 여부" },
    ],
  },
  {
    id: "homecare",
    label: "재가보험",
    desc: "방문요양, 주야간보호, 복지용구, 가족돌봄 활용",
    tone: "from-blue-500 to-indigo-600",
    icon: Home,
    summary: "시설 입소 전 집에서 돌봄을 유지할 때 필요한 재가급여와 가족 부담을 정리합니다.",
    infographic: "timeline",
    reportTitle: "재가 돌봄 활용 비교",
    metrics: [
      { key: "visitCare", label: "방문요양", shortLabel: "방문요양", unit: "만원", kind: "money", guide: "방문요양 이용 시 보완금액" },
      { key: "dayNight", label: "주야간보호", shortLabel: "주야간", unit: "만원", kind: "money", guide: "낮 시간 돌봄센터 이용 부담" },
      { key: "welfareTool", label: "복지용구", shortLabel: "복지용구", unit: "만원", kind: "money", guide: "침대·휠체어 등 보조기구" },
      { key: "familyCare", label: "가족돌봄 지원", shortLabel: "가족돌봄", unit: "만원", kind: "money", guide: "가족 돌봄 공백 보완" },
      { key: "facility", label: "시설 전환 대비", shortLabel: "시설대비", unit: "만원", kind: "money", guide: "요양원·요양병원 전환 가능성" },
      { key: "grade", label: "대상 등급", shortLabel: "등급", kind: "text", guide: "장기요양등급별 보장 조건" },
    ],
  },
  {
    id: "pet",
    label: "펫보험",
    desc: "통원, 입원, 수술, 슬개골, 피부질환, 자기부담금 비교",
    tone: "from-amber-400 to-orange-500",
    icon: PawPrint,
    summary: "반려동물 치료비에서 자주 발생하는 통원·수술·면책 항목을 보기 쉽게 비교합니다.",
    infographic: "cards",
    reportTitle: "반려동물 치료비 보장 비교",
    metrics: [
      { key: "outpatient", label: "통원 보상한도", shortLabel: "통원", unit: "만원", kind: "money", guide: "일/연간 통원 한도" },
      { key: "inpatient", label: "입원 보상한도", shortLabel: "입원", unit: "만원", kind: "money", guide: "입원 치료 한도" },
      { key: "surgery", label: "수술 보상한도", shortLabel: "수술", unit: "만원", kind: "money", guide: "수술 1회 또는 연간 한도" },
      { key: "patella", label: "슬개골 보장", shortLabel: "슬개골", kind: "text", guide: "소형견 주요 청구 항목" },
      { key: "skin", label: "피부질환", shortLabel: "피부", kind: "text", guide: "피부·알러지 보장 여부" },
      { key: "deductible", label: "자기부담금", shortLabel: "자부담", kind: "text", guide: "정액/정률 자기부담 구조" },
    ],
  },
  {
    id: "shortlife",
    label: "단기납 종신",
    desc: "납입기간, 총납입, 10년 후 환급률, 적금 3% 비교",
    tone: "from-slate-700 to-cyan-600",
    icon: CircleDollarSign,
    summary: "단기납 종신의 환급률을 월 적금 3% 구조와 비교해 활용 전략까지 설명합니다.",
    infographic: "timeline",
    reportTitle: "단기납 종신 환급 활용 전략",
    metrics: [
      { key: "deathBenefit", label: "사망보험금", shortLabel: "사망", unit: "만원", kind: "money", guide: "기본 사망보험금" },
      { key: "refundYear", label: "환급 확인 시점", shortLabel: "시점", kind: "text", guide: "예: 10년 후" },
      { key: "refundRate", label: "해지환급률", shortLabel: "환급률", unit: "%", kind: "percent", guide: "총납입보험료 대비 해지환급금 비율" },
      { key: "refundAmount", label: "해지환급금", shortLabel: "환급금", unit: "만원", kind: "money", guide: "해당 시점 예상 환급금" },
      { key: "purpose", label: "활용 목적", shortLabel: "목적", kind: "text", guide: "목적자금, 비상자금, 상속·증여 등" },
      { key: "liquidity", label: "유동성 주의", shortLabel: "주의", kind: "text", guide: "중도해지 시점별 환급률 확인" },
    ],
  },
]

const focusOptions: { id: CompareFocus; label: string; desc: string }[] = [
  { id: "balance", label: "균형형", desc: "보험료와 보장범위를 함께 봅니다." },
  { id: "premium", label: "보험료 우선", desc: "월 부담을 낮추는 안을 우선합니다." },
  { id: "coverage", label: "보장금액 우선", desc: "담보 금액이 큰 안을 우선합니다." },
  { id: "scope", label: "보장범위 우선", desc: "좁은 고액보다 넓은 범위를 우선합니다." },
  { id: "refund", label: "환급률 우선", desc: "환급 활용성과 장기 유지 전략을 봅니다." },
]

const won = (value: number) => new Intl.NumberFormat("ko-KR").format(Math.round(value))
const num = (value: string) => Number(String(value).replace(/[^0-9.-]/g, "")) || 0
const metricText = (metric: MetricDef, value: string) => {
  if (!value) return "-"
  if (metric.kind === "money") return `${won(num(value))}${metric.unit || "만원"}`
  if (metric.kind === "percent") return `${value}${String(value).includes("%") ? "" : "%"}`
  return value
}
const createId = () => Math.random().toString(36).slice(2, 9)

function emptyPlan(template: CategoryTemplate, index = 0): PlanData {
  const metrics = Object.fromEntries(template.metrics.map((metric) => [metric.key, ""]))
  return {
    id: createId(),
    company: "",
    productName: "",
    monthlyPremium: "",
    paymentYears: template.id === "shortlife" ? "5" : "",
    coverageYears: template.id === "shortlife" ? "종신" : "",
    fileName: "",
    memo: "",
    strengths: index === 0 ? "핵심 담보 중심으로 구성" : "",
    cautions: "",
    metrics,
  }
}

function normalizePlans(template: CategoryTemplate, count = 2) {
  return Array.from({ length: count }, (_, index) => emptyPlan(template, index))
}

function bestPremium(plans: PlanData[]) {
  const available = plans.filter((plan) => num(plan.monthlyPremium) > 0)
  if (!available.length) return null
  return [...available].sort((a, b) => num(a.monthlyPremium) - num(b.monthlyPremium))[0]
}

function metricMax(plans: PlanData[], metric: MetricDef) {
  return Math.max(1, ...plans.map((plan) => metric.kind === "money" || metric.kind === "percent" ? num(plan.metrics[metric.key]) : 0))
}

function shortLifeDerived(plan: PlanData) {
  const monthly = num(plan.monthlyPremium)
  const years = num(plan.paymentYears) || 5
  const totalPaid = monthly * 12 * years
  const rate = num(plan.metrics.refundRate)
  const explicitRefund = num(plan.metrics.refundAmount)
  const refund = explicitRefund || (totalPaid * rate / 100)
  const monthlyRate = 0.03 / 12
  const months = years * 12
  let savingFuture = 0
  for (let i = 0; i < months; i += 1) {
    savingFuture += monthly * Math.pow(1 + monthlyRate, months - i)
  }
  return {
    monthly,
    years,
    totalPaid,
    refund,
    savingFuture,
    gap: refund - savingFuture,
    refundRate: totalPaid ? (refund / totalPaid) * 100 : rate,
  }
}

function CategoryIcon({ template }: { template: CategoryTemplate }) {
  const Icon = template.icon
  return <Icon className="h-5 w-5" />
}

function MiniMetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width = Math.max(4, Math.min(100, (value / max) * 100))
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-black text-slate-500">
        <span>{label}</span>
        <span>{won(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function UploadBox({ plan, onFile }: { plan: PlanData; onFile: (name: string) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-black text-slate-500 transition hover:border-cyan-400 hover:bg-cyan-50">
      <Upload className="h-5 w-5" />
      <span>{plan.fileName || "기존 PDF 제안서 업로드"}</span>
      <input
        type="file"
        accept=".pdf"
        hidden
        onChange={(event) => onFile(event.target.files?.[0]?.name || "")}
      />
    </label>
  )
}

function PlanEditor({
  plan,
  index,
  template,
  mode,
  onChange,
  onRemove,
  canRemove,
}: {
  plan: PlanData
  index: number
  template: CategoryTemplate
  mode: ProposalMode
  onChange: (plan: PlanData) => void
  onRemove?: () => void
  canRemove?: boolean
}) {
  const set = <K extends keyof PlanData>(key: K, value: PlanData[K]) => onChange({ ...plan, [key]: value })
  const setMetric = (key: string, value: string) => onChange({ ...plan, metrics: { ...plan.metrics, [key]: value } })

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#102a4c] text-sm font-black text-white">
            {mode === "compare" ? String.fromCharCode(65 + index) : "1"}
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950">
              {mode === "compare" ? `${String.fromCharCode(65 + index)}안 상품` : "단일 제안 상품"}
            </h3>
            <p className="text-xs font-bold text-slate-400">{template.label} 기준 항목을 입력합니다.</p>
          </div>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:border-rose-200 hover:text-rose-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <UploadBox plan={plan} onFile={(name) => set("fileName", name)} />

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Input label="보험사" value={plan.company} onChange={(value) => set("company", value)} placeholder="예: ○○손해보험" />
        <Input label="상품명" value={plan.productName} onChange={(value) => set("productName", value)} placeholder="예: 건강보험 플랜" />
        <Input label="월 보험료" value={plan.monthlyPremium} onChange={(value) => set("monthlyPremium", value)} placeholder="예: 50,000" suffix="원" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="납입기간" value={plan.paymentYears} onChange={(value) => set("paymentYears", value)} placeholder="예: 20" suffix="년" />
          <Input label="보장/활용기간" value={plan.coverageYears} onChange={(value) => set("coverageYears", value)} placeholder="예: 100세" />
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-cyan-600" />
          <p className="text-sm font-black text-slate-900">카테고리별 핵심 항목</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {template.metrics.map((metric) => (
            <Input
              key={metric.key}
              label={metric.label}
              value={plan.metrics[metric.key] || ""}
              onChange={(value) => setMetric(metric.key, value)}
              placeholder={metric.kind === "text" ? metric.guide : "금액 입력"}
              suffix={metric.kind === "money" ? metric.unit : metric.kind === "percent" ? "%" : undefined}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <TextArea label="장점 메모" value={plan.strengths} onChange={(value) => set("strengths", value)} placeholder="예: 보험료 대비 자부상 보장이 높음" />
        <TextArea label="주의사항 메모" value={plan.cautions} onChange={(value) => set("cautions", value)} placeholder="예: 일부 담보 갱신형 여부 확인 필요" />
      </div>
    </section>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  suffix?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black text-slate-500">{label}</span>
      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-cyan-500">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 min-w-0 flex-1 px-3 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-300"
        />
        {suffix && <span className="flex items-center border-l border-slate-100 px-3 text-[11px] font-black text-slate-400">{suffix}</span>}
      </div>
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black text-slate-500">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[86px] w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold leading-6 text-slate-900 outline-none placeholder:text-slate-300 focus:border-cyan-500"
      />
    </label>
  )
}

function CategorySelector({ selected, onSelect }: { selected: CategoryTemplate; onSelect: (template: CategoryTemplate) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {categories.map((template) => {
        const active = selected.id === template.id
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className={`rounded-2xl border p-4 text-left transition ${active ? "border-cyan-400 bg-cyan-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${template.tone} text-white`}>
                <CategoryIcon template={template} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950">{template.label}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{template.desc}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ModeSelector({ mode, onMode }: { mode: ProposalMode; onMode: (mode: ProposalMode) => void }) {
  const items = [
    { id: "single" as ProposalMode, title: "단일 제안서", desc: "긴 PDF 제안서를 핵심 요약형 상담 자료로 정리" },
    { id: "compare" as ProposalMode, title: "비교 제안서", desc: "동일 상품군을 여러 보험사 기준으로 비교" },
  ]
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => {
        const active = mode === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onMode(item.id)}
            className={`rounded-2xl border p-5 text-left transition ${active ? "border-[#102a4c] bg-[#f2f7fb]" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-black text-slate-950">{item.title}</p>
              {active && <BadgeCheck className="h-5 w-5 text-cyan-600" />}
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{item.desc}</p>
          </button>
        )
      })}
    </div>
  )
}

function FocusSelector({ focus, onFocus, disabled }: { focus: CompareFocus; onFocus: (focus: CompareFocus) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {focusOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={disabled}
          onClick={() => onFocus(option.id)}
          className={`rounded-full border px-3 py-2 text-xs font-black transition ${focus === option.id ? "border-[#102a4c] bg-[#102a4c] text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"} ${disabled ? "opacity-40" : ""}`}
          title={option.desc}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ReportHeader({ template, mode, customerName, consultant }: { template: CategoryTemplate; mode: ProposalMode; customerName: string; consultant: ConsultantInfo }) {
  return (
    <div className={`rounded-t-[28px] bg-gradient-to-r ${template.tone} px-8 py-6 text-white`}>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[11px] font-black tracking-[0.2em] text-white/70">맞춤형 보장 점검 및 제안서</p>
          <h1 className="mt-2 text-[28px] font-black tracking-[-0.01em]">
            {customerName || "고객"}님을 위한 {mode === "single" ? "핵심 요약 플랜" : "맞춤 비교 플랜"}
          </h1>
          <p className="mt-2 text-sm font-bold text-white/80">{template.summary}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-white/70">보험의 기준</p>
          <p className="mt-1 text-lg font-black">{consultant.name || "담당 설계사"}</p>
          <p className="text-xs font-bold text-white/70">{consultant.phone}</p>
        </div>
      </div>
    </div>
  )
}

function ProposalReport({
  template,
  mode,
  plans,
  focus,
  customerName,
  consultant,
}: {
  template: CategoryTemplate
  mode: ProposalMode
  plans: PlanData[]
  focus: CompareFocus
  customerName: string
  consultant: ConsultantInfo
}) {
  const visiblePlans = mode === "single" ? plans.slice(0, 1) : plans
  const lowest = bestPremium(visiblePlans)
  const recommendation = buildRecommendation(template, mode, visiblePlans, focus)

  return (
    <div className="proposal-print-area">
      <ReportPage>
        <ReportHeader template={template} mode={mode} customerName={customerName} consultant={consultant} />
        <div className="grid flex-1 grid-cols-[1.05fr_1fr] gap-5 p-8">
          <section>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
              <h2 className="text-xl font-black text-slate-950">핵심 결론</h2>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-[26px] font-black leading-tight text-[#102a4c]">{recommendation.title}</p>
              <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{recommendation.body}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <SummaryTile label="상품군" value={template.label} />
              <SummaryTile label="비교 기준" value={focusOptions.find((item) => item.id === focus)?.label || "균형형"} />
              <SummaryTile label="월 보험료 최저" value={lowest ? `${lowest.company || "입력 상품"} ${won(num(lowest.monthlyPremium))}원` : "-"} />
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
              <p className="text-sm font-black text-cyan-900">고객 설명 포인트</p>
              <p className="mt-2 text-xs font-bold leading-6 text-cyan-800">
                보험료만 낮은 안보다 실제 사고·질병 상황에서 지급되는 담보와 보장범위를 함께 비교해야 합니다. 같은 금액이라도 지급 조건이 다르면 상담 해석이 달라집니다.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-600" />
              <h2 className="text-xl font-black text-slate-950">{template.reportTitle}</h2>
            </div>
            <PlanSnapshot template={template} plans={visiblePlans} />
          </section>
        </div>
        <PageNum num={1} />
      </ReportPage>

      <ReportPage>
        <ReportHeader template={template} mode={mode} customerName={customerName} consultant={consultant} />
        <div className="grid flex-1 grid-cols-[0.9fr_1.1fr] gap-5 p-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-950">비용 분석</h2>
            <div className="mt-4 grid gap-3">
              {visiblePlans.map((plan, index) => (
                <PremiumCard key={plan.id} plan={plan} index={index} />
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            {template.id === "shortlife" ? (
              <ShortLifeGraphic plans={visiblePlans} />
            ) : (
              <CategoryGraphic template={template} plans={visiblePlans} />
            )}
          </section>
        </div>
        <PageNum num={2} />
      </ReportPage>

      <ReportPage last>
        <ReportHeader template={template} mode={mode} customerName={customerName} consultant={consultant} />
        <div className="grid flex-1 grid-cols-[1.15fr_0.85fr] gap-5 p-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-950">담보별 상세 비교</h2>
            <ComparisonTable template={template} plans={visiblePlans} />
          </section>
          <section className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-black text-slate-950">장단점 요약</h2>
              <div className="mt-4 space-y-3">
                {visiblePlans.map((plan, index) => (
                  <PlanMemo key={plan.id} plan={plan} index={index} />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-black text-amber-900">상담 시 확인할 내용</p>
              <ul className="mt-3 space-y-2 text-xs font-bold leading-6 text-amber-900">
                <li>약관상 지급 조건, 면책·감액기간, 갱신 여부를 최종 확인합니다.</li>
                <li>PDF 자동 추출 전까지는 업로드 파일을 참고하고 핵심 수치는 설계사가 확인 입력합니다.</li>
                <li>고객에게는 보험료, 보장금액, 보장범위를 분리해서 설명합니다.</li>
              </ul>
            </div>
          </section>
        </div>
        <PageNum num={3} />
      </ReportPage>
    </div>
  )
}

function ReportPage({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`proposal-page flex h-[210mm] w-[297mm] flex-col overflow-hidden bg-white shadow-xl ${last ? "" : "break-after-page"}`}>
      {children}
    </div>
  )
}

function PageNum({ num }: { num: number }) {
  return <div className="absolute bottom-4 right-6 text-[10px] font-black text-slate-300">{String(num).padStart(2, "0")}</div>
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black leading-5 text-slate-950">{value}</p>
    </div>
  )
}

function PlanSnapshot({ template, plans }: { template: CategoryTemplate; plans: PlanData[] }) {
  return (
    <div className="space-y-4">
      {plans.map((plan, index) => (
        <div key={plan.id} className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-950">{plan.company || `${String.fromCharCode(65 + index)} 보험사`}</p>
              <p className="text-xs font-bold text-slate-400">{plan.productName || "상품명 미입력"}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700">{won(num(plan.monthlyPremium))}원</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {template.metrics.slice(0, 4).map((metric) => (
              <div key={metric.key} className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-black text-slate-400">{metric.shortLabel || metric.label}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{metricText(metric, plan.metrics[metric.key])}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PremiumCard({ plan, index }: { plan: PlanData; index: number }) {
  const monthly = num(plan.monthlyPremium)
  const years = num(plan.paymentYears) || 20
  const total = monthly * 12 * years
  const color = index % 2 === 0 ? "bg-cyan-500" : "bg-rose-400"
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-slate-950">{plan.company || `${String.fromCharCode(65 + index)}안`}</p>
          <p className="text-xs font-bold text-slate-400">{plan.productName || "상품명 미입력"}</p>
        </div>
        <div className={`h-10 w-10 rounded-full ${color}`} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-3">
          <p className="text-[10px] font-black text-slate-400">월 보험료</p>
          <p className="mt-1 text-lg font-black text-slate-950">{won(monthly)}원</p>
        </div>
        <div className="rounded-xl bg-white p-3">
          <p className="text-[10px] font-black text-slate-400">총 납입 예상</p>
          <p className="mt-1 text-lg font-black text-slate-950">{won(total)}원</p>
        </div>
      </div>
    </div>
  )
}

function CategoryGraphic({ template, plans }: { template: CategoryTemplate; plans: PlanData[] }) {
  return (
    <div>
      <h2 className="text-lg font-black text-slate-950">보장 인포그래픽</h2>
      <p className="mt-1 text-xs font-bold text-slate-400">업로드 참고 이미지처럼 금액 차이를 시각적으로 보여주는 영역입니다.</p>
      <div className="mt-5 grid gap-4">
        {template.metrics.filter((metric) => metric.kind !== "text").slice(0, 5).map((metric) => {
          const max = metricMax(plans, metric)
          return (
            <div key={metric.key} className="rounded-2xl bg-slate-50 p-4">
              <p className="mb-3 text-sm font-black text-slate-900">{metric.label}</p>
              <div className="grid gap-3">
                {plans.map((plan, index) => (
                  <MiniMetricBar
                    key={plan.id}
                    label={plan.company || `${String.fromCharCode(65 + index)}안`}
                    value={num(plan.metrics[metric.key])}
                    max={max}
                    color={index % 2 === 0 ? "bg-cyan-500" : index % 2 === 1 ? "bg-rose-400" : "bg-amber-400"}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ShortLifeGraphic({ plans }: { plans: PlanData[] }) {
  const first = plans[0]
  const derived = first ? shortLifeDerived(first) : null
  if (!first || !derived) return null
  const max = Math.max(1, derived.totalPaid, derived.refund, derived.savingFuture)
  return (
    <div>
      <h2 className="text-lg font-black text-slate-950">단기납 종신 vs 월 적금 3%</h2>
      <p className="mt-1 text-xs font-bold text-slate-400">월 적금은 첫 달 납입금만 12개월 가까이 이자가 붙고, 이후 납입금은 11/12, 10/12처럼 이자 적용 기간이 줄어듭니다.</p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <SummaryTile label="총납입금액" value={`${won(derived.totalPaid)}원`} />
        <SummaryTile label="예상 환급금" value={`${won(derived.refund)}원`} />
        <SummaryTile label="환급률" value={`${derived.refundRate.toFixed(1)}%`} />
      </div>
      <div className="mt-6 rounded-2xl bg-slate-50 p-5">
        {[
          ["총납입", derived.totalPaid, "bg-slate-500"],
          ["10년 후 환급금", derived.refund, "bg-cyan-500"],
          ["월 적금 3% 예상", derived.savingFuture, "bg-rose-400"],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="mb-4 last:mb-0">
            <div className="mb-1 flex items-center justify-between text-xs font-black text-slate-500">
              <span>{String(label)}</span>
              <span>{won(Number(value))}원</span>
            </div>
            <div className="h-7 rounded-full bg-white">
              <div className={`flex h-7 items-center justify-end rounded-full pr-3 text-[10px] font-black text-white ${String(color)}`} style={{ width: `${Math.max(8, Math.min(100, (Number(value) / max) * 100))}%` }}>
                {won(Number(value))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
        <p className="text-sm font-black text-cyan-900">활용 전략</p>
        <p className="mt-2 text-xs font-bold leading-6 text-cyan-800">
          {first.metrics.purpose || "10년 이상 유지 가능한 목적자금이라면 환급률과 사망보장 기능을 함께 설명할 수 있습니다. 단, 단기 해지 시 환급률은 반드시 별도로 확인해야 합니다."}
        </p>
      </div>
    </div>
  )
}

function ComparisonTable({ template, plans }: { template: CategoryTemplate; plans: PlanData[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-50">
            <th className="w-[170px] px-4 py-3 text-xs font-black text-slate-500">비교 항목</th>
            {plans.map((plan, index) => (
              <th key={plan.id} className="px-4 py-3 text-xs font-black text-slate-700">
                {plan.company || `${String.fromCharCode(65 + index)}안`}
              </th>
            ))}
            <th className="px-4 py-3 text-xs font-black text-slate-500">해석</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-slate-100">
            <td className="px-4 py-3 text-xs font-black text-slate-500">월 보험료</td>
            {plans.map((plan) => <td key={plan.id} className="px-4 py-3 text-xs font-black text-slate-900">{won(num(plan.monthlyPremium))}원</td>)}
            <td className="px-4 py-3 text-[11px] font-bold text-slate-500">보험료와 담보 범위를 함께 판단</td>
          </tr>
          {template.metrics.map((metric) => (
            <tr key={metric.key} className="border-t border-slate-100">
              <td className="px-4 py-3 text-xs font-black text-slate-500">{metric.label}</td>
              {plans.map((plan) => (
                <td key={plan.id} className="px-4 py-3 text-xs font-black text-slate-900">{metricText(metric, plan.metrics[metric.key])}</td>
              ))}
              <td className="px-4 py-3 text-[11px] font-bold leading-5 text-slate-500">{metric.guide}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PlanMemo({ plan, index }: { plan: PlanData; index: number }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-sm font-black text-slate-950">{plan.company || `${String.fromCharCode(65 + index)}안`}</p>
      <p className="mt-2 text-xs font-bold leading-6 text-emerald-700">장점: {plan.strengths || "핵심 담보와 보험료를 기준으로 상담 메모를 입력하세요."}</p>
      <p className="mt-1 text-xs font-bold leading-6 text-rose-700">주의: {plan.cautions || "갱신 여부, 지급 조건, 보장범위 차이를 확인하세요."}</p>
    </div>
  )
}

function buildRecommendation(template: CategoryTemplate, mode: ProposalMode, plans: PlanData[], focus: CompareFocus) {
  if (template.id === "shortlife" && plans[0]) {
    const d = shortLifeDerived(plans[0])
    return {
      title: `총납입 ${won(d.totalPaid)}원, 예상 환급률 ${d.refundRate.toFixed(1)}%`,
      body: `월 ${won(d.monthly)}원씩 ${d.years}년 납입하는 구조입니다. 10년 후 환급금은 약 ${won(d.refund)}원으로 계산되며, 월 적금 3%는 매월 납입금의 이자 적용 기간이 달라 단순 3%와 체감 수익이 다릅니다.`,
    }
  }
  if (mode === "single") {
    return {
      title: `${template.label} 핵심 담보를 고객용으로 압축했습니다`,
      body: "긴 PDF 제안서에서 고객이 바로 이해해야 하는 보험료, 핵심 담보, 주의사항을 중심으로 요약합니다. 세부 약관은 실제 상품설명서와 함께 확인합니다.",
    }
  }
  const lowest = bestPremium(plans)
  const focusLabel = focusOptions.find((item) => item.id === focus)?.label || "균형형"
  return {
    title: `${focusLabel} 기준으로 ${plans.length}개 보험사를 비교합니다`,
    body: lowest
      ? `월 보험료는 ${lowest.company || "일부 제안"}이 가장 낮습니다. 다만 최종 추천은 보험료, 핵심 담보금액, 보장범위, 갱신 여부를 함께 확인한 뒤 결정하는 구조입니다.`
      : "비교할 보험사별 보험료와 핵심 담보를 입력하면 장단점과 추천 방향이 자동 정리됩니다.",
  }
}

export default function ProposalPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [lockedReason, setLockedReason] = useState("이용 권한이 없습니다.")
  const [mode, setMode] = useState<ProposalMode>("single")
  const [template, setTemplate] = useState<CategoryTemplate>(categories[1])
  const [plans, setPlans] = useState<PlanData[]>(() => normalizePlans(categories[1], 2))
  const [focus, setFocus] = useState<CompareFocus>("balance")
  const [customerName, setCustomerName] = useState("")
  const [consultant, setConsultant] = useState<ConsultantInfo>({ name: "", phone: "" })
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    let alive = true
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace("/login?redirectTo=/insurance-tools/proposal")
        return
      }

      let { data: profile } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle()
      if (!profile) profile = await ensureUserProfile(supabase, session.user)

      const role = normalizeRole(profile)
      const approved = isApprovedUser(profile)
      const isAgentOrAbove = ROLE_PRIORITY[role] >= ROLE_PRIORITY.agent
      const canUse = canAccessProposalGenerator(profile)

      let reason = "이용 권한이 없습니다."
      if (!approved) reason = "관리자 승인 후 이용할 수 있습니다."
      else if (!isAgentOrAbove) reason = "설계사 등급 이상만 이용할 수 있습니다."

      if (!alive) return
      setAllowed(canUse)
      setLockedReason(reason)
      setChecking(false)
      setConsultant({ name: profile?.name || "", phone: profile?.phone || "" })
    }
    checkAccess()
    return () => { alive = false }
  }, [router])

  const visiblePlans = useMemo(() => mode === "single" ? plans.slice(0, 1) : plans, [mode, plans])

  const selectCategory = (next: CategoryTemplate) => {
    setTemplate(next)
    setPlans(normalizePlans(next, Math.max(2, mode === "single" ? 2 : plans.length)))
    if (next.id === "shortlife") setFocus("refund")
  }

  const updatePlan = (id: string, next: PlanData) => {
    setPlans((prev) => prev.map((plan) => plan.id === id ? next : plan))
  }

  const addPlan = () => {
    setPlans((prev) => [...prev, emptyPlan(template, prev.length)])
  }

  const removePlan = (id: string) => {
    setPlans((prev) => prev.filter((plan) => plan.id !== id))
  }

  if (checking) return <LoadingScreen />

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3fb] p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#1a3a6e]">Proposal Generator</p>
          <h1 className="mt-3 text-2xl font-black text-slate-950">제안서 생성 권한이 필요합니다</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-500">{lockedReason}</p>
          <button
            type="button"
            onClick={() => router.replace("/dashboard")}
            className="mt-6 rounded-2xl bg-[#1a3a6e] px-5 py-3 text-sm font-black text-white transition hover:bg-[#2D4A8A]"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </main>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body * { visibility: hidden !important; }
          .proposal-print-area, .proposal-print-area * { visibility: visible !important; }
          .proposal-print-area { position: fixed; inset: 0; background: white; }
          .print-only { display: block !important; }
          .proposal-page { box-shadow: none !important; page-break-after: always; break-after: page; position: relative; }
          .proposal-page:last-child { page-break-after: avoid; break-after: avoid; }
          .no-print { display: none !important; }
        }
        @media screen {
          .proposal-page { position: relative; margin: 0 auto 24px; }
          .print-only { display: none !important; }
        }
      `}</style>

      <main className="min-h-screen bg-[#eef3f8] text-slate-950">
        <div className="no-print border-b border-slate-200 bg-white px-6 py-4">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Proposal Builder</p>
              <h1 className="mt-1 text-2xl font-black text-[#102a4c]">제안서 생성</h1>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowPreview(false)} className={`rounded-xl px-4 py-2 text-sm font-black ${!showPreview ? "bg-[#102a4c] text-white" : "bg-slate-100 text-slate-500"}`}>
                입력
              </button>
              <button type="button" onClick={() => setShowPreview(true)} className={`rounded-xl px-4 py-2 text-sm font-black ${showPreview ? "bg-[#102a4c] text-white" : "bg-slate-100 text-slate-500"}`}>
                미리보기
              </button>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-white">
                <Download className="h-4 w-4" />
                PDF 저장
              </button>
            </div>
          </div>
        </div>

        {!showPreview ? (
          <div className="no-print mx-auto grid max-w-[1440px] gap-5 px-6 py-6 xl:grid-cols-[360px_1fr]">
            <aside className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-cyan-600" />
                  <h2 className="text-base font-black text-slate-950">생성 방식</h2>
                </div>
                <ModeSelector mode={mode} onMode={(next) => setMode(next)} />
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-600" />
                  <h2 className="text-base font-black text-slate-950">비교 기준</h2>
                </div>
                <FocusSelector focus={focus} onFocus={setFocus} disabled={mode === "single" && template.id !== "shortlife"} />
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Bone className="h-5 w-5 text-cyan-600" />
                  <h2 className="text-base font-black text-slate-950">고객·설계사 정보</h2>
                </div>
                <div className="space-y-3">
                  <Input label="고객명" value={customerName} onChange={setCustomerName} placeholder="예: 배진우" />
                  <Input label="설계사명" value={consultant.name} onChange={(value) => setConsultant((prev) => ({ ...prev, name: value }))} />
                  <Input label="연락처" value={consultant.phone} onChange={(value) => setConsultant((prev) => ({ ...prev, phone: value }))} />
                </div>
              </section>
            </aside>

            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">상품 카테고리</h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">카테고리를 선택하면 입력 항목과 출력 인포그래픽이 자동으로 바뀝니다.</p>
                  </div>
                  <div className={`hidden rounded-2xl bg-gradient-to-br ${template.tone} p-3 text-white md:block`}>
                    <CategoryIcon template={template} />
                  </div>
                </div>
                <CategorySelector selected={template} onSelect={selectCategory} />
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">상품 정보 입력</h2>
                    <p className="text-sm font-bold text-slate-500">
                      PDF는 참고용으로 업로드하고, 핵심 수치는 직접 확인 입력하는 방식입니다.
                    </p>
                  </div>
                  {mode === "compare" && (
                    <button type="button" onClick={addPlan} className="inline-flex items-center gap-2 rounded-xl bg-[#102a4c] px-4 py-3 text-sm font-black text-white">
                      <Plus className="h-4 w-4" />
                      보험사 추가
                    </button>
                  )}
                </div>
                <div className={`grid gap-4 ${mode === "compare" ? "xl:grid-cols-2" : "max-w-3xl"}`}>
                  {visiblePlans.map((plan, index) => (
                    <PlanEditor
                      key={plan.id}
                      plan={plan}
                      index={index}
                      template={template}
                      mode={mode}
                      onChange={(next) => updatePlan(plan.id, next)}
                      onRemove={() => removePlan(plan.id)}
                      canRemove={mode === "compare" && visiblePlans.length > 2}
                    />
                  ))}
                </div>
              </section>

              <div className="flex justify-end">
                <button type="button" onClick={() => setShowPreview(true)} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-4 text-sm font-black text-white shadow-sm">
                  제안서 미리보기
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-print bg-[#1f2937] px-6 py-8">
            <ProposalReport
              template={template}
              mode={mode}
              plans={visiblePlans}
              focus={focus}
              customerName={customerName}
              consultant={consultant}
            />
          </div>
        )}

        <div className="print-only proposal-print-area">
          <ProposalReport
            template={template}
            mode={mode}
            plans={visiblePlans}
            focus={focus}
            customerName={customerName}
            consultant={consultant}
          />
        </div>
      </main>
    </>
  )
}
