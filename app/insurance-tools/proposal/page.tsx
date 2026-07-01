"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bone,
  Car,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  HeartPulse,
  Home,
  Loader2,
  PawPrint,
  Plus,
  Save,
  ShieldCheck,
  Stethoscope,
  Upload,
  X,
} from "lucide-react"
import { supabase } from "../../../lib/supabase"
import { ensureUserProfile } from "../../../lib/userProfile"
import { canAccessProposalGenerator, isApprovedUser, normalizeRole, ROLE_PRIORITY } from "../../../lib/roles"
import LoadingScreen from "../../components/LoadingScreen"
import { CATEGORY_SCENARIOS } from "./scenarioData"

type ProposalMode = "single" | "compare" | "cross" | "bundle"
type CategoryId = "driver" | "health" | "care" | "homecare" | "pet" | "shortlife" | "annuity" | "dental"
type CompareFocus = "balance" | "premium" | "coverage" | "scope" | "refund"
type MetricKind = "money" | "text" | "percent"

type MetricDef = {
  key: string
  label: string
  shortLabel?: string
  unit?: string
  kind?: MetricKind
  guide: string
  hint?: string
  group?: string
}

type CustomCoverage = {
  id: string
  name: string
  amount: string
  note: string
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
  isDollar?: boolean
  exchangeRate?: string
  additionalCoverage?: string
  customCoverages?: CustomCoverage[]
}

type ConsultantInfo = {
  name: string
  phone: string
}

// 번들 모드: 카테고리별 플랜 묶음 (여러 제안서 가능)
type CategorySection = {
  templateId: CategoryId
  plans: PlanData[]
}

type ProposalDraft = {
  savedAt: string
  mode: ProposalMode
  templateId: CategoryId
  plans: PlanData[]
  focus: CompareFocus[]
  customerName: string
  consultant: ConsultantInfo
  bundleIds: CategoryId[]
  bundlePlans: Record<CategoryId, PlanData[]>
}

type StoredProposalDraft = ProposalDraft & {
  id: string
  title: string
  userId: string
}

type GptsPlanPayload = {
  company?: unknown
  insurer?: unknown
  productName?: unknown
  product_name?: unknown
  monthlyPremium?: unknown
  premium?: unknown
  paymentYears?: unknown
  payment_years?: unknown
  paymentPeriod?: unknown
  coverageYears?: unknown
  coverage_years?: unknown
  coveragePeriod?: unknown
  fileName?: unknown
  file_name?: unknown
  memo?: unknown
  strengths?: unknown
  cautions?: unknown
  metrics?: Record<string, unknown>
  customCoverages?: Array<Record<string, unknown>>
  custom_coverages?: Array<Record<string, unknown>>
}

type GptsProposalPayload = {
  version?: unknown
  mode?: unknown
  categoryId?: unknown
  category_id?: unknown
  customerName?: unknown
  customer_name?: unknown
  focus?: unknown
  plans?: GptsPlanPayload[]
  summary?: {
    headline?: unknown
    mainMessage?: unknown
    recommendation?: unknown
    cautions?: unknown
  }
}

const PROPOSAL_DRAFT_KEY = "metarich_proposal_latest"
const PROPOSAL_DRAFTS_KEY_PREFIX = "metarich_proposal_drafts"
const MAX_PROPOSAL_DRAFTS = 10
const PROPOSAL_GPTS_URL = "https://chatgpt.com/g/g-6a3daa9ebb188191b79a2bb10f5a326f-jeanseo"
const PROPOSAL_IMPORT_KEY = "metarich_proposal_import_payload"

const categories: CategoryTemplate[] = [
  {
    id: "driver",
    label: "운전자보험",
    desc: "형사합의금, 변호사비, 벌금, 자부상 중심 비교",
    tone: "from-cyan-500 to-sky-600",
    icon: Car,
    summary: "교통사고 이후 발생할 수 있는 형사합의금, 변호사비, 벌금 부담을 미리 준비합니다.",
    infographic: "cards",
    reportTitle: "운전자 핵심 비용담보 비교",
    metrics: [
      { key: "trafficSupport", label: "교통사고처리지원금", shortLabel: "처리지원금", unit: "만원", kind: "money", guide: "사망·중상해·중대법규 사고 시 형사합의금 성격" },
      { key: "lawyer", label: "변호사선임비용", shortLabel: "변호사비", unit: "만원", kind: "money", guide: "경찰조사·검찰·재판 단계별 지급 조건 확인" },
      { key: "finePerson", label: "벌금 대인", shortLabel: "대인벌금", unit: "만원", kind: "money", guide: "대인 사고 벌금 한도" },
      { key: "fineProperty", label: "벌금 대물", shortLabel: "대물벌금", unit: "만원", kind: "money", guide: "대물 벌금 한도" },
      { key: "injury", label: "자동차사고부상치료비 (14급 기준)", shortLabel: "자부상14급", unit: "만원", kind: "money", guide: "14급 기준 금액 입력 — 급수별 지급금액 비례 차이 확인", hint: "14급 기준 금액" },
      { key: "liability", label: "일상생활배상책임", shortLabel: "일배책", unit: "만원", kind: "money", guide: "가족 일상생활 중 타인 신체·재물 피해 배상책임 한도", hint: "기본 10,000" },
      { key: "renewal", label: "갱신 여부", shortLabel: "갱신", kind: "text", guide: "갱신형은 향후 보험료 변동 가능" },
    ],
  },
  {
    id: "health",
    label: "건강보험",
    desc: "암·뇌·심장·수술·입원·간병 담보와 총보험료 비교",
    tone: "from-rose-500 to-orange-500",
    icon: HeartPulse,
    summary: "암·뇌·심장 질환과 수술·치료 과정에서 필요한 생활비와 치료비 공백을 함께 준비합니다.",
    infographic: "bars",
    reportTitle: "주요 질병·수술 담보 비교",
    metrics: [
      { key: "cancer", label: "일반암 진단비", shortLabel: "일반암", unit: "만원", kind: "money", group: "진단비", guide: "일반암 기준 진단비" },
      { key: "minorCancer", label: "유사암 진단비", shortLabel: "유사암", unit: "만원", kind: "money", group: "진단비", guide: "갑상선암·기타피부암·경계성종양·제자리암 기준" },
      { key: "brain", label: "뇌혈관질환 진단비", shortLabel: "뇌혈관", unit: "만원", kind: "money", group: "진단비", guide: "뇌출혈·뇌졸중·뇌혈관질환 중 보장범위 확인" },
      { key: "heart", label: "허혈성심장질환 진단비", shortLabel: "허혈성", unit: "만원", kind: "money", group: "진단비", guide: "급성심근경색·허혈성심장질환 중 보장범위 확인" },
      { key: "injurySurgery", label: "상해 일반 수술비", shortLabel: "상해 일반", unit: "만원", kind: "money", group: "수술비", guide: "상해 일반 수술비. 상세 지급 내역은 약관참조" },
      { key: "diseaseSurgery", label: "질병 일반 수술비", shortLabel: "질병 일반", unit: "만원", kind: "money", group: "수술비", guide: "질병 일반 수술비. 상세 지급 내역은 약관참조" },
      { key: "injuryComprehensiveSurgery", label: "상해 종합 수술비", shortLabel: "상해 종합", unit: "만원", kind: "money", group: "수술비", guide: "상해 종합 수술비. 상세 지급 내역은 약관참조" },
      { key: "diseaseComprehensiveSurgery", label: "질병 종합 수술비", shortLabel: "질병 종합", unit: "만원", kind: "money", group: "수술비", guide: "질병 종합 수술비. 상세 지급 내역은 약관참조" },
      { key: "injuryAdvancedSurgery", label: "상해 상급 수술비", shortLabel: "상해 상급", unit: "만원", kind: "money", group: "수술비", guide: "상해 상급 수술비. 상세 지급 내역은 약관참조" },
      { key: "diseaseAdvancedSurgery", label: "질병 상급 수술비", shortLabel: "질병 상급", unit: "만원", kind: "money", group: "수술비", guide: "질병 상급 수술비. 상세 지급 내역은 약관참조" },
      { key: "injuryTypeSurgery", label: "상해 종수술비", shortLabel: "상해 종수술", unit: "만원", kind: "money", group: "수술비", guide: "종수술비 기준 금액 입력. 상세 지급 내역은 약관참조", hint: "최대 또는 기준금액" },
      { key: "diseaseTypeSurgery", label: "질병 종수술비", shortLabel: "질병 종수술", unit: "만원", kind: "money", group: "수술비", guide: "종수술비 기준 금액 입력. 상세 지급 내역은 약관참조", hint: "최대 또는 기준금액" },
      { key: "diseaseNSurgery", label: "질병 N대 수술비", shortLabel: "질병 N대", unit: "만원", kind: "money", group: "수술비", guide: "질병 N대 수술비 최대금액 기준. 상세 지급 내역은 약관참조", hint: "최대금액" },
      { key: "chemoDrug", label: "항암 약물치료", shortLabel: "항암약물", unit: "만원", kind: "money", group: "항암치료", guide: "상세 지급 내역은 약관참조" },
      { key: "chemoRadiation", label: "항암 방사선치료", shortLabel: "항암방사선", unit: "만원", kind: "money", group: "항암치료", guide: "상세 지급 내역은 약관참조" },
      { key: "targetDrug", label: "표적항암 약물치료", shortLabel: "표적약물", unit: "만원", kind: "money", group: "항암치료", guide: "상세 지급 내역은 약관참조" },
      { key: "targetRadiation", label: "표적항암 방사선치료", shortLabel: "표적방사선", unit: "만원", kind: "money", group: "항암치료", guide: "상세 지급 내역은 약관참조" },
      { key: "heavyIon", label: "중입자치료", shortLabel: "중입자", unit: "만원", kind: "money", group: "항암치료", guide: "상세 지급 내역은 약관참조" },
      { key: "robotCancerSurgery", label: "로봇 암수술", shortLabel: "로봇암수술", unit: "만원", kind: "money", group: "항암치료", guide: "상세 지급 내역은 약관참조" },
      { key: "cancerMajorTreatmentGeneral", label: "암 주요치료비 (일반)", shortLabel: "암주요 일반", unit: "만원", kind: "money", group: "주요치료비", guide: "암 주요치료비 일반 기준. 상세 지급 내역은 약관참조" },
      { key: "cancerMajorTreatmentNonCovered", label: "암 주요치료비 (비급여)", shortLabel: "암주요 비급여", unit: "만원", kind: "money", group: "주요치료비", guide: "암 주요치료비 비급여 기준. 상세 지급 내역은 약관참조" },
      { key: "twoMajorTreatmentComprehensive", label: "2대 주요치료비 (종합)", shortLabel: "2대종합", unit: "만원", kind: "money", group: "주요치료비", guide: "뇌·심장 주요치료비 종합 기준. 상세 지급 내역은 약관참조" },
      { key: "twoMajorTreatmentAdvanced", label: "2대 주요치료비 (상급)", shortLabel: "2대상급", unit: "만원", kind: "money", group: "주요치료비", guide: "뇌·심장 주요치료비 상급 기준. 상세 지급 내역은 약관참조" },
      { key: "care", label: "간병 보장", shortLabel: "간병", unit: "만원", kind: "money", group: "간병·생활", guide: "간병인사용일당 또는 간호간병통합 보장" },
      { key: "liability", label: "일상생활배상책임", shortLabel: "일배책", unit: "만원", kind: "money", group: "간병·생활", guide: "가족 일상생활 중 타인 신체·재물 피해 배상책임 한도", hint: "기본 10,000" },
    ],
  },
  {
    id: "care",
    label: "간병보험",
    desc: "상해·질병 간병일당, 181일 이상, 요양병원, 간호간병통합서비스 중심",
    tone: "from-emerald-500 to-teal-600",
    icon: Stethoscope,
    summary: "입원과 회복 기간에 발생하는 간병인 비용과 간호간병통합서비스 이용 부담을 준비합니다.",
    infographic: "radar",
    reportTitle: "입원 간병비 보장 구조",
    metrics: [
      { key: "injuryCareDaily", label: "상해 간병일당", shortLabel: "상해간병", unit: "만원", kind: "money", guide: "상해 입원 중 간병인 사용 시 일당" },
      { key: "diseaseCareDaily", label: "질병 간병일당", shortLabel: "질병간병", unit: "만원", kind: "money", guide: "질병 입원 중 간병인 사용 시 일당" },
      { key: "after181Daily", label: "181일 이상 간병담보", shortLabel: "181일+", unit: "만원", kind: "money", guide: "장기 입원 181일 이상 구간 보장 여부와 일당" },
      { key: "nursingHospitalDaily", label: "요양병원 간병일당", shortLabel: "요양병원", unit: "만원", kind: "money", guide: "요양병원 입원 시 간병 관련 일당" },
      { key: "injuryIntegratedDaily", label: "간호간병통합서비스 상해", shortLabel: "통합상해", unit: "만원", kind: "money", guide: "상해로 간호간병통합서비스 병동 입원 시 지급" },
      { key: "diseaseIntegratedDaily", label: "간호간병통합서비스 질병", shortLabel: "통합질병", unit: "만원", kind: "money", guide: "질병으로 간호간병통합서비스 병동 입원 시 지급" },
    ],
  },
  {
    id: "homecare",
    label: "재가보험",
    desc: "방문요양, 주야간보호, 복지용구, 가족돌봄 활용",
    tone: "from-blue-500 to-indigo-600",
    icon: Home,
    summary: "집에서 돌봄을 이어가기 위해 필요한 재가급여 보완금과 가족의 돌봄 부담을 준비합니다.",
    infographic: "timeline",
    reportTitle: "재가 돌봄 활용 비교",
    metrics: [
      { key: "visitCare", label: "방문요양", shortLabel: "방문요양", unit: "만원", kind: "money", guide: "방문요양 이용 시 보완금액" },
      { key: "dayNight", label: "주야간보호", shortLabel: "주야간", unit: "만원", kind: "money", guide: "낮 시간 돌봄센터 이용 부담" },
      { key: "familyCare", label: "가족돌봄 지원", shortLabel: "가족돌봄", unit: "만원", kind: "money", guide: "가족 돌봄 공백 보완" },
      { key: "dementiaDiagnosis", label: "치매 진단비", shortLabel: "치매진단", unit: "만원", kind: "money", guide: "경도·중등도·중증 치매 진단 조건 확인" },
      { key: "dementiaTargetTreatment", label: "치매 표적치료보장", shortLabel: "표적치료", unit: "만원", kind: "money", guide: "치매 관련 특정 치료·검사 지급 조건 확인" },
      { key: "grade", label: "대상 등급", shortLabel: "등급", kind: "text", guide: "장기요양등급 또는 치매 단계별 보장 조건" },
    ],
  },
  {
    id: "pet",
    label: "펫보험",
    desc: "통원, 입원, 수술, 슬개골, 피부질환, 자기부담금 비교",
    tone: "from-amber-400 to-orange-500",
    icon: PawPrint,
    summary: "반려동물에게 자주 발생하는 통원·입원·수술 치료비 부담을 미리 준비합니다.",
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
    summary: "목적자금 마련과 사망보장을 함께 고려해 장기 유지 시 활용 가능한 자금을 확인합니다.",
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
  {
    id: "annuity",
    label: "연금보험",
    desc: "일반연금·변액연금, 납입종료, 연금개시, 환급률과 목적자금 요약",
    tone: "from-emerald-500 to-cyan-600",
    icon: Activity,
    summary: "긴 연금보험 제안서에서 고객이 이해해야 할 납입기간, 연금개시 시점, 환급률, 변액 여부와 유의사항을 상담용으로 요약합니다.",
    infographic: "timeline",
    reportTitle: "연금보험 라이프사이클 요약",
    metrics: [
      { key: "annuityType", label: "연금 유형", shortLabel: "유형", kind: "text", guide: "일반연금 또는 변액연금" },
      { key: "currentAge", label: "현재 나이", shortLabel: "현재", unit: "세", kind: "money", guide: "가입 시점 고객 나이" },
      { key: "annuityStartAge", label: "연금개시 나이", shortLabel: "개시", unit: "세", kind: "money", guide: "연금 수령을 시작하는 나이" },
      { key: "refundRate", label: "환급률", shortLabel: "환급률", unit: "%", kind: "percent", guide: "총납입보험료 대비 환급률" },
      { key: "refundAmount", label: "예상 환급금/연금재원", shortLabel: "재원", unit: "만원", kind: "money", guide: "연금개시 시점 예상 적립금 또는 환급금" },
      { key: "monthlyAnnuity", label: "월 예상 연금", shortLabel: "월연금", unit: "만원", kind: "money", guide: "연금개시 후 월 예상 수령액" },
      { key: "purpose", label: "가입 목적", shortLabel: "목적", kind: "text", guide: "노후 생활비, 은퇴자금, 비상자금 등" },
      { key: "riskNotice", label: "변액/운용 유의사항", shortLabel: "유의", kind: "text", guide: "변액은 운용실적에 따라 원금손실 가능, 일반연금도 중도해지 손실 가능" },
    ],
  },
  {
    id: "dental",
    label: "치아보험",
    desc: "충전·크라운·임플란트·브릿지·틀니·신경치료 담보 비교",
    tone: "from-sky-400 to-cyan-500",
    icon: Bone,
    summary: "충전·크라운·임플란트처럼 반복적으로 발생할 수 있는 치과 치료비 부담을 준비합니다.",
    infographic: "cards",
    reportTitle: "치과 치료비 담보 비교",
    metrics: [
      { key: "filling", label: "충전치료 (금·도재)", shortLabel: "충전", unit: "만원", kind: "money", guide: "치아 1개당 지급금액 (아말감·금·도재 구분)" },
      { key: "crown", label: "크라운 (치관치료)", shortLabel: "크라운", unit: "만원", kind: "money", guide: "치아 1개당 지급금액 — 연간 한도 확인" },
      { key: "implant", label: "임플란트", shortLabel: "임플란트", unit: "만원", kind: "money", guide: "치아 1개당 지급금액 — 연간 3개 한도 등 조건 확인" },
      { key: "bridge", label: "브릿지 (가공치)", shortLabel: "브릿지", unit: "만원", kind: "money", guide: "치아 1개당 지급금액 — 연간 한도 확인" },
      { key: "denture", label: "틀니 (의치)", shortLabel: "틀니", unit: "만원", kind: "money", guide: "보철물당 지급금액 — 연간 1회 한도 등 조건 확인" },
      { key: "rootCanal", label: "신경치료 (치수치료)", shortLabel: "신경치료", unit: "만원", kind: "money", guide: "치아 1개당 지급금액" },
      { key: "scaling", label: "스케일링", shortLabel: "스케일링", unit: "만원", kind: "money", guide: "연 1회 한도 금액" },
      { key: "waiting", label: "면책·감액기간", shortLabel: "면책", kind: "text", guide: "면책 90일, 충전·크라운 1년 감액 등 조건 확인" },
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
const formatKrw = (value: number) => `${won(value)}원`
const formatManApprox = (value: number) => `약 ${won(Math.round(value / 10000))}만원`
const man = (value: number) => `${won(value)}만원`
const formatPremium = (plan: PlanData) => {
  const value = num(plan.monthlyPremium)
  if (!value) return "-"
  return plan.isDollar ? `$${won(value)}` : formatKrw(value)
}
const isShortLifeDollarMetric = (metric: MetricDef) => metric.key === "deathBenefit" || metric.key === "refundAmount"
const metricText = (metric: MetricDef, value: string, plan?: PlanData) => {
  if (!value) {
    if (metric.key === "liquidity") return metric.guide
    return "-"
  }
  if (plan?.isDollar && isShortLifeDollarMetric(metric)) {
    const usd = num(value)
    const krw = usd * (num(plan.exchangeRate ?? "") || 1400)
    return `$${won(usd)} (${formatManApprox(krw)})`
  }
  if (metric.kind === "money") return `${won(num(value))}${metric.unit || "만원"}`
  if (metric.kind === "percent") return `${value}${String(value).includes("%") ? "" : "%"}`
  return value
}
const createId = () => Math.random().toString(36).slice(2, 9)
const shortLifePurposeOptions = ["자녀 학자금", "결혼자금", "노후자금", "의료비통장"]
const shortLifeDefaultCaution = "중도해지시 납입한 보험료보다 적거나 없을 수 있습니다. 이 상품은 사망보장을 목적으로하는 보장성 상품입니다. 해지환급금을 활용한 단기 저축 목적으로 안내드렸습니다."
const annuityPurposeOptions = ["노후 생활비", "은퇴자금", "비상자금", "배우자 생활비", "장기 간병 대비"]
const annuityDefaultCaution = "본 자료는 30여 장 내외의 보험회사 제안서를 상담용으로 요약한 안내 자료입니다. 최종 보험료, 연금액, 환급률, 수수료, 해지환급금, 보증 여부는 실제 상품설명서와 약관을 기준으로 확인해야 합니다. 변액연금은 운용실적에 따라 원금손실이 발생할 수 있습니다."
const chunkMetrics = (metrics: MetricDef[], size: number) => {
  const chunks: MetricDef[][] = []
  for (let i = 0; i < metrics.length; i += size) chunks.push(metrics.slice(i, i + size))
  return chunks.length ? chunks : [[]]
}
const detailGroups = (template: CategoryTemplate) => {
  if (template.id === "health") {
    const find = (keys: string[]) => keys.map((key) => template.metrics.find((metric) => metric.key === key)).filter(Boolean) as MetricDef[]
    return [
      { title: "암·뇌·심장 진단비 구조", metrics: find(["cancer", "minorCancer", "brain", "heart"]) },
      { title: "치료비 보장 구조", metrics: find([
        "chemoDrug", "chemoRadiation", "targetDrug", "targetRadiation", "heavyIon", "robotCancerSurgery",
        "cancerMajorTreatmentGeneral", "cancerMajorTreatmentNonCovered", "twoMajorTreatmentComprehensive", "twoMajorTreatmentAdvanced",
      ]) },
      { title: "수술비 보장 구조", metrics: find([
        "injurySurgery", "diseaseSurgery", "injuryComprehensiveSurgery", "diseaseComprehensiveSurgery",
        "injuryAdvancedSurgery", "diseaseAdvancedSurgery", "injuryTypeSurgery", "diseaseTypeSurgery", "diseaseNSurgery",
      ]) },
      { title: "간병 보장 구조", metrics: find(["care"]) },
      { title: "추가 담보", metrics: [] },
    ]
  }
  return chunkMetrics(template.metrics, 8).map((metrics, index) => ({
    title: index === 0 ? "담보별 상세 비교" : "담보별 상세 비교",
    metrics,
  }))
}

function emptyPlan(template: CategoryTemplate, index = 0): PlanData {
  const metrics = Object.fromEntries(template.metrics.map((metric) => [metric.key, ""]))
  if (template.id === "driver") {
    metrics.trafficSupport = "20000"
    metrics.lawyer = "500"
    metrics.finePerson = "3000"
    metrics.fineProperty = "500"
    metrics.injury = "30"
    metrics.liability = "10000"
  }
  if (template.id === "annuity") {
    metrics.annuityType = "일반연금"
    metrics.currentAge = "40"
    metrics.annuityStartAge = "65"
    metrics.purpose = "노후 생활비"
    metrics.riskNotice = "중도해지 시 납입보험료보다 적을 수 있으며, 변액연금은 운용실적에 따라 원금손실이 발생할 수 있습니다."
  }
  return {
    id: createId(),
    company: "",
    productName: "",
    monthlyPremium: "",
    paymentYears: template.id === "shortlife" ? "5" : template.id === "annuity" ? "10" : "",
    coverageYears: template.id === "shortlife" ? "종신" : template.id === "annuity" ? "65세 연금개시" : "",
    isDollar: false,
    exchangeRate: "",
    fileName: "",
    memo: "",
    strengths: index === 0 ? "핵심 담보 중심으로 구성" : "",
    cautions: "",
    metrics,
    customCoverages: [],
  }
}

function normalizePlans(template: CategoryTemplate, count = 2) {
  return Array.from({ length: count }, (_, index) => emptyPlan(template, index))
}

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(", ")
  return String(value).trim()
}

const normalizeStoredNumber = (value: unknown) => {
  const text = asText(value)
  if (!text) return ""
  const normalized = text.replace(/,/g, "")
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  return match ? match[0] : text
}

const normalizeCategoryId = (value: unknown): CategoryId | null => {
  const id = asText(value)
  return categories.some((category) => category.id === id) ? id as CategoryId : null
}

const normalizeProposalMode = (value: unknown, planCount: number): ProposalMode => {
  const modeText = asText(value)
  if (modeText === "single" || modeText === "compare" || modeText === "cross" || modeText === "bundle") return modeText
  return planCount > 1 ? "compare" : "single"
}

const normalizeFocus = (value: unknown): CompareFocus[] => {
  const raw = Array.isArray(value) ? value : [value]
  const allowed = new Set(focusOptions.map((item) => item.id))
  const next = raw.map((item) => asText(item)).filter((item): item is CompareFocus => allowed.has(item as CompareFocus))
  return next.length ? next : ["balance"]
}

const extractJsonText = (input: string) => {
  const cleaned = input
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim()
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start < 0 || end < start) throw new Error("JSON 중괄호를 찾지 못했습니다.")
  return cleaned.slice(start, end + 1)
}

function parseProposalGptsJson(input: string): GptsProposalPayload {
  const parsed = JSON.parse(extractJsonText(input)) as GptsProposalPayload
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON 객체 형식이 아닙니다.")
  if (!Array.isArray(parsed.plans)) throw new Error("plans 배열이 필요합니다.")
  return parsed
}

// GPTs plan의 metrics 키를 보고 가장 적합한 카테고리 자동 감지
function detectCategoryFromMetrics(metrics: Record<string, string>): CategoryId {
  const filledKeys = new Set(
    Object.entries(metrics)
      .filter(([, v]) => parseFloat(String(v)) > 0 || (v && v !== ""))
      .map(([k]) => k)
  )
  let bestId: CategoryId = "health"
  let bestScore = 0
  for (const cat of categories) {
    const catKeySet = new Set(cat.metrics.map((m) => m.key))
    let score = 0
    for (const k of filledKeys) {
      if (catKeySet.has(k)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestId = cat.id as CategoryId
    }
  }
  return bestId
}

function gptsPlanToPlanData(payload: GptsPlanPayload, template: CategoryTemplate, index: number, summary?: GptsProposalPayload["summary"]): PlanData {
  const base = emptyPlan(template, index)
  const allowedMetricKeys = new Set(template.metrics.map((metric) => metric.key))
  const parsedMetrics = Object.entries(payload.metrics || {}).reduce<Record<string, string>>((acc, [key, value]) => {
    if (allowedMetricKeys.has(key)) acc[key] = normalizeStoredNumber(value)
    return acc
  }, {})
  const customPayload = payload.customCoverages || payload.custom_coverages || []
  const customCoverages = Array.isArray(customPayload)
    ? customPayload
      .map((item) => ({
        id: createId(),
        name: asText(item.name || item.coverageName || item.coverage_name),
        amount: normalizeStoredNumber(item.amount),
        note: asText(item.note || item.description || item.memo),
      }))
      .filter((item) => item.name || item.amount || item.note)
    : []

  const summaryCautions = Array.isArray(summary?.cautions) ? summary.cautions.map(asText).filter(Boolean).join(", ") : asText(summary?.cautions)
  const summaryMemo = [asText(summary?.headline), asText(summary?.mainMessage), asText(summary?.recommendation)].filter(Boolean).join(" ")

  return {
    ...base,
    company: asText(payload.company || payload.insurer),
    productName: asText(payload.productName || payload.product_name),
    monthlyPremium: normalizeStoredNumber(payload.monthlyPremium || payload.premium),
    paymentYears: normalizeStoredNumber(payload.paymentYears || payload.payment_years || payload.paymentPeriod),
    coverageYears: asText(payload.coverageYears || payload.coverage_years || payload.coveragePeriod),
    fileName: asText(payload.fileName || payload.file_name),
    memo: asText(payload.memo) || (index === 0 ? summaryMemo : ""),
    strengths: asText(payload.strengths) || base.strengths,
    cautions: asText(payload.cautions) || (index === 0 ? summaryCautions : ""),
    metrics: { ...base.metrics, ...parsedMetrics },
    customCoverages,
  }
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
  const fx = plan.isDollar ? (num(plan.exchangeRate ?? "") || 1400) : 1
  const monthlyRaw = num(plan.monthlyPremium)
  const monthly = monthlyRaw * fx          // 항상 KRW 기준으로 계산
  const monthlyUsd = plan.isDollar ? monthlyRaw : 0
  const years = num(plan.paymentYears) || 5
  const horizonYears = num(plan.metrics.refundYear) || 10
  const totalPaid = monthly * 12 * years
  const rate = num(plan.metrics.refundRate)
  const explicitRefundRaw = num(plan.metrics.refundAmount)
  // 원화 상품: refundAmount는 만원 단위 → ×10000 하여 원으로 통일
  // 달러 상품: refundAmount는 달러 단위 → ×환율 하여 원으로 통일
  const explicitRefund = plan.isDollar
    ? explicitRefundRaw * fx
    : explicitRefundRaw * 10000
  const refund = rate ? (totalPaid * rate / 100) : explicitRefund
  const monthlyRate = 0.03 / 12
  const payMonths = years * 12
  let savingFuture = 0
  for (let i = 0; i < payMonths; i += 1) {
    savingFuture += monthly * Math.pow(1 + monthlyRate, payMonths - i)
  }
  const savingInterest = Math.max(0, savingFuture - totalPaid)
  const savingTax = savingInterest * 0.154
  const savingFutureAfterTax = savingFuture - savingTax
  const savingInterestAfterTax = savingInterest - savingTax
  const savingEffectiveRate = totalPaid ? (savingInterest / totalPaid) * 100 : 0
  const savingEffectiveAnnualRate = years ? savingEffectiveRate / years : 0
  const savingAfterTaxRate = totalPaid ? (savingInterestAfterTax / totalPaid) * 100 : 0
  const savingAfterTaxAnnualRate = years ? savingAfterTaxRate / years : 0
  return {
    monthly,
    monthlyUsd,
    fx,
    years,
    horizonYears,
    totalPaid,
    refund,
    savingFuture,
    savingFutureAfterTax,
    savingInterest,
    savingTax,
    savingInterestAfterTax,
    savingEffectiveRate,
    savingEffectiveAnnualRate,
    savingAfterTaxRate,
    savingAfterTaxAnnualRate,
    gap: refund - savingFuture,
    refundRate: rate || (totalPaid ? (refund / totalPaid) * 100 : 0),
  }
}

function annuityDerived(plan: PlanData) {
  const monthly = num(plan.monthlyPremium)
  const years = num(plan.paymentYears) || 10
  const currentAge = num(plan.metrics.currentAge) || 40
  const paymentEndAge = currentAge + years
  const annuityStartAge = num(plan.metrics.annuityStartAge) || Math.max(60, paymentEndAge)
  const totalPaid = monthly * 12 * years
  const rate = num(plan.metrics.refundRate)
  const explicitRefund = num(plan.metrics.refundAmount) * 10000
  const refund = rate ? totalPaid * rate / 100 : explicitRefund
  const monthlyAnnuity = num(plan.metrics.monthlyAnnuity) * 10000
  const gapYears = Math.max(0, annuityStartAge - paymentEndAge)
  return {
    monthly,
    years,
    currentAge,
    paymentEndAge,
    annuityStartAge,
    totalPaid,
    rate: rate || (totalPaid ? refund / totalPaid * 100 : 0),
    refund,
    monthlyAnnuity,
    gapYears,
    annuityType: plan.metrics.annuityType || "일반연금",
    purpose: plan.metrics.purpose || "노후 생활비",
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

type ParseStatus = "idle" | "loading" | "done" | "error"

function PdfDropZone({
  plan,
  template,
  onParsed,
  onCustomerName,
}: {
  plan: PlanData
  template: CategoryTemplate
  onParsed: (patch: Partial<PlanData>) => void
  onCustomerName?: (name: string) => void
}) {
  const [status, setStatus] = useState<ParseStatus>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const runParse = async (file: File) => {
    setStatus("loading")
    setErrorMsg("")
    onParsed({ fileName: file.name })

    const fd = new FormData()
    fd.append("file", file)
    fd.append("categoryId", template.id)

    try {
      const res = await fetch("/api/parse-proposal-pdf", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setStatus("error")
        setErrorMsg(json.error || "분석 실패")
        return
      }
      const d = json.data as {
        customerName?: string
        company?: string
        productName?: string
        monthlyPremium?: string
        paymentYears?: string
        coverageYears?: string
        metrics?: Record<string, string>
      }

      if (d.customerName) onCustomerName?.(d.customerName)
      const parsedMetrics = Object.fromEntries(
        Object.entries(d.metrics || {}).filter(([, value]) => String(value || "").trim() !== "")
      )

      onParsed({
        fileName: file.name,
        company: d.company || plan.company,
        productName: d.productName || plan.productName,
        monthlyPremium: d.monthlyPremium || plan.monthlyPremium,
        paymentYears: d.paymentYears || plan.paymentYears,
        coverageYears: d.coverageYears || plan.coverageYears,
        metrics: { ...plan.metrics, ...parsedMetrics },
      })
      setStatus("done")
    } catch {
      setStatus("error")
      setErrorMsg("네트워크 오류. 다시 시도해주세요.")
    }
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus("error"); setErrorMsg("PDF 파일만 가능합니다."); return
    }
    runParse(file)
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div>
      <label
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-black transition
          ${isDragging ? "border-cyan-400 bg-cyan-50" : status === "done" ? "border-emerald-400 bg-emerald-50" : status === "error" ? "border-rose-300 bg-rose-50" : "border-slate-300 bg-slate-50 hover:border-cyan-400 hover:bg-cyan-50"}`}
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
            <span className="text-cyan-600">PDF 분석 중...</span>
          </>
        ) : status === "done" ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="text-emerald-700">{plan.fileName} — 분석 완료</span>
            <span className="text-[11px] font-bold text-emerald-500">클릭하면 다른 파일로 교체</span>
          </>
        ) : status === "error" ? (
          <>
            <AlertCircle className="h-5 w-5 text-rose-500" />
            <span className="text-rose-600">{errorMsg}</span>
            <span className="text-[11px] font-bold text-rose-400">클릭해서 다시 시도</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-slate-400" />
            <span className="text-slate-500">{plan.fileName || "PDF 제안서 드래그 또는 클릭"}</span>
            <span className="text-[11px] font-bold text-slate-400">업로드하면 보험사·상품명·보험료·담보를 자동으로 채웁니다</span>
          </>
        )}
        <input
          type="file"
          accept=".pdf"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
    </div>
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
  onCustomerName,
}: {
  plan: PlanData
  index: number
  template: CategoryTemplate
  mode: ProposalMode
  onChange: (plan: PlanData) => void
  onRemove?: () => void
  canRemove?: boolean
  onCustomerName?: (name: string) => void
}) {
  const set = <K extends keyof PlanData>(key: K, value: PlanData[K]) => onChange({ ...plan, [key]: value })
  const setMetric = (key: string, value: string) => onChange({ ...plan, metrics: { ...plan.metrics, [key]: value } })
  const customCoverages = plan.customCoverages ?? []
  const addCustomCoverage = () => onChange({
    ...plan,
    customCoverages: [...customCoverages, { id: createId(), name: "", amount: "", note: "" }],
  })
  const updateCustomCoverage = (id: string, patch: Partial<CustomCoverage>) => onChange({
    ...plan,
    customCoverages: customCoverages.map((item) => item.id === id ? { ...item, ...patch } : item),
  })
  const removeCustomCoverage = (id: string) => onChange({
    ...plan,
    customCoverages: customCoverages.filter((item) => item.id !== id),
  })
  const visibleMetrics = template.id === "shortlife"
    ? template.metrics.filter((metric) => metric.key !== "purpose")
    : template.id === "annuity"
      ? template.metrics.filter((metric) => metric.key !== "purpose" && metric.key !== "annuityType")
    : template.metrics
  const metricGroups = visibleMetrics.reduce<Array<{ title: string; metrics: MetricDef[] }>>((acc, metric) => {
    const title = metric.group || "기본 담보"
    const found = acc.find((item) => item.title === title)
    if (found) found.metrics.push(metric)
    else acc.push({ title, metrics: [metric] })
    return acc
  }, [])
  const surgeryGroup = metricGroups.find((group) => group.title === "수술비")

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

      <PdfDropZone
        plan={plan}
        template={template}
        onParsed={(patch) => onChange({ ...plan, ...patch })}
        onCustomerName={onCustomerName}
      />

      {template.id === "shortlife" && (
        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-sm font-black text-amber-900">납입 통화</span>
          <div className="flex overflow-hidden rounded-xl border border-amber-300">
            <button
              type="button"
              onClick={() => onChange({ ...plan, isDollar: false, exchangeRate: "" })}
              className={`px-4 py-1.5 text-sm font-black transition-colors ${!plan.isDollar ? "bg-amber-500 text-white" : "bg-white text-amber-700 hover:bg-amber-50"}`}
            >원화 ₩</button>
            <button
              type="button"
              onClick={() => onChange({ ...plan, isDollar: true, exchangeRate: plan.exchangeRate || "1400" })}
              className={`px-4 py-1.5 text-sm font-black transition-colors ${plan.isDollar ? "bg-amber-500 text-white" : "bg-white text-amber-700 hover:bg-amber-50"}`}
            >달러 $</button>
          </div>
          {plan.isDollar && (
            <div className="flex flex-1 items-center gap-2">
              <span className="text-xs font-black text-amber-700 whitespace-nowrap">적용 환율</span>
              <Input label="" value={plan.exchangeRate || ""} onChange={(value) => onChange({ ...plan, exchangeRate: value })} placeholder="예: 1400" suffix="원/$" numeric />
            </div>
          )}
        </div>
      )}

      {template.id === "annuity" && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-black text-emerald-900">연금 유형</span>
            <div className="flex overflow-hidden rounded-xl border border-emerald-300">
              {["일반연금", "변액연금"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMetric("annuityType", type)}
                  className={`px-4 py-1.5 text-sm font-black transition-colors ${(plan.metrics.annuityType || "일반연금") === type ? "bg-emerald-600 text-white" : "bg-white text-emerald-700 hover:bg-emerald-50"}`}
                >
                  {type}
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-emerald-800">
              현재 {num(plan.metrics.currentAge)}세 기준 · 납입종료 {num(plan.metrics.currentAge) + num(plan.paymentYears)}세 · 연금개시 {num(plan.metrics.annuityStartAge)}세
            </span>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Input label="보험사" value={plan.company} onChange={(value) => set("company", value)} placeholder="예: ○○손해보험" />
        <Input label="상품명" value={plan.productName} onChange={(value) => set("productName", value)} placeholder="예: 건강보험 플랜" />
        <Input
          label={plan.isDollar ? "월 보험료 (달러)" : "월 보험료"}
          value={plan.monthlyPremium}
          onChange={(value) => set("monthlyPremium", value)}
          placeholder={plan.isDollar ? "예: 200" : "예: 52,000"}
          suffix={plan.isDollar ? "$" : "원"}
          numeric
        />
        <Input label="납입기간" value={plan.paymentYears} onChange={(value) => set("paymentYears", value)} placeholder="예: 20" suffix="년" />
        {plan.isDollar && plan.monthlyPremium && (plan.exchangeRate || "1400") && (
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
            <div>
              <p className="text-[10px] font-black text-slate-400">원화 환산 (월)</p>
              <p className="mt-0.5 text-base font-black text-slate-800">
                {new Intl.NumberFormat("ko-KR").format(Math.round(Number(plan.monthlyPremium.replace(/,/g,"")) * Number((plan.exchangeRate||"1400").replace(/,/g,""))))}원
              </p>
            </div>
          </div>
        )}
        {template.id !== "shortlife" && (
          <Input label="보장/활용기간" value={plan.coverageYears} onChange={(value) => set("coverageYears", value)} placeholder="예: 100세" />
        )}
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-cyan-600" />
          <p className="text-sm font-black text-slate-900">카테고리별 핵심 항목</p>
        </div>
        <div className="space-y-4">
          {metricGroups.map((group) => (
            <div key={group.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              {metricGroups.length > 1 && (
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-black text-slate-700">{group.title}</p>
                  {template.id === "health" && <span className="text-[10px] font-bold text-slate-400">미선택 담보는 빈칸으로 두세요</span>}
                </div>
              )}
              {template.id === "health" && group.title === "수술비" && surgeryGroup ? (
                <HealthSurgeryInputGrid
                  metrics={surgeryGroup.metrics}
                  values={plan.metrics}
                  onChange={setMetric}
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {group.metrics.map((metric) => (
                    <Input
                      key={metric.key}
                      label={metric.label}
                      value={plan.metrics[metric.key] || ""}
                      onChange={(value) => setMetric(metric.key, value)}
                      placeholder={metric.kind === "text" ? metric.guide : metric.kind === "percent" ? "예: 107.5" : metric.hint || "금액 입력"}
                      suffix={plan.isDollar && isShortLifeDollarMetric(metric) ? "$" : metric.kind === "money" ? metric.unit : metric.kind === "percent" ? "%" : undefined}
                      numeric={metric.kind === "money"}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {template.id === "shortlife" && plan.isDollar && (
          <ShortLifeDollarPreview plan={plan} />
        )}
        {template.id === "shortlife" && (
          <ShortLifePurposeSelector
            value={plan.metrics.purpose || ""}
            onChange={(value) => setMetric("purpose", value)}
          />
        )}
        {template.id === "annuity" && (
          <AnnuityPurposeSelector
            value={plan.metrics.purpose || ""}
            onChange={(value) => setMetric("purpose", value)}
          />
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">추가 보장 담보</p>
            <p className="mt-1 text-[11px] font-bold text-slate-400">기본 항목에 없는 담보를 직접 추가하고, 상담용 설명을 남길 수 있습니다.</p>
          </div>
          <button
            type="button"
            onClick={addCustomCoverage}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#102a4c] px-3 py-2 text-xs font-black text-white hover:bg-[#2D4A8A]"
          >
            <Plus className="h-4 w-4" />
            담보 추가
          </button>
        </div>
        {customCoverages.length === 0 ? (
          <p className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-slate-400">추가할 담보가 있으면 담보 추가를 눌러 입력하세요.</p>
        ) : (
          <div className="space-y-3">
            {customCoverages.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_40px]">
                  <Input label="담보명" value={item.name} onChange={(value) => updateCustomCoverage(item.id, { name: value })} placeholder="예: 특정질병입원일당" />
                  <Input label="보장금액" value={item.amount} onChange={(value) => updateCustomCoverage(item.id, { amount: value })} placeholder="예: 5" suffix="만원" numeric />
                  <button
                    type="button"
                    onClick={() => removeCustomCoverage(item.id)}
                    className="mt-5 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-600"
                    aria-label="추가 담보 삭제"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3">
                  <TextArea label="추가보장 설명" value={item.note} onChange={(value) => updateCustomCoverage(item.id, { note: value })} placeholder="예: 특정 조건 충족 시 지급, 상세 지급 내역은 약관참조" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <TextArea label="장점 메모" value={plan.strengths} onChange={(value) => set("strengths", value)} placeholder="예: 보험료 대비 자부상 보장이 높음" />
        <TextArea label="주의사항 메모" value={plan.cautions} onChange={(value) => set("cautions", value)} placeholder="예: 일부 담보 갱신형 여부 확인 필요" />
      </div>
      {mode === "cross" && (
        <div className="mt-3">
          <TextArea
            label="추가 보장 (교차설계용)"
            value={plan.additionalCoverage || ""}
            onChange={(value) => set("additionalCoverage", value)}
            placeholder="예: 실손의료비 특약 — 본인부담금 80% 보장, 입원 5만원/일"
          />
        </div>
      )}
    </section>
  )
}

function ShortLifeDollarPreview({ plan }: { plan: PlanData }) {
  const fx = num(plan.exchangeRate ?? "") || 1400
  const items = [
    { label: "사망보험금", value: plan.metrics.deathBenefit },
    { label: "해지환급금", value: plan.metrics.refundAmount },
  ].filter((item) => num(item.value || "") > 0)

  if (!items.length) return null

  return (
    <div className="mt-3 grid gap-2 md:grid-cols-2">
      {items.map((item) => {
        const usd = num(item.value || "")
        const krw = usd * fx
        return (
          <div key={item.label} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[10px] font-black text-amber-700">{item.label} 원화 환산</p>
            <p className="mt-1 text-sm font-black text-amber-950">
              ${won(usd)} <span className="text-amber-700">({formatManApprox(krw)})</span>
            </p>
          </div>
        )
      })}
    </div>
  )
}

function ShortLifePurposeSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = value.split(",").map((item) => item.trim()).filter(Boolean)
  const manual = selected.filter((item) => !shortLifePurposeOptions.includes(item)).join(", ")
  const toggle = (option: string) => {
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]
    onChange(next.join(", "))
  }
  const setManual = (manualValue: string) => {
    const fixed = selected.filter((item) => shortLifePurposeOptions.includes(item))
    const custom = manualValue.split(",").map((item) => item.trim()).filter(Boolean)
    onChange([...fixed, ...custom].join(", "))
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-black text-slate-500">활용 목적</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {shortLifePurposeOptions.map((option) => {
          const active = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={`rounded-full border px-3 py-2 text-xs font-black transition ${active ? "border-[#102a4c] bg-[#102a4c] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
            >
              {option}
            </button>
          )
        })}
      </div>
      <Input
        label="수동 입력"
        value={manual}
        onChange={setManual}
        placeholder="예: 비상자금, 상속·증여"
      />
    </div>
  )
}

// 숫자 포맷: 입력값 → 쉼표 구분자 표시
function AnnuityPurposeSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = value.split(",").map((item) => item.trim()).filter(Boolean)
  const manual = selected.filter((item) => !annuityPurposeOptions.includes(item)).join(", ")
  const toggle = (option: string) => {
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]
    onChange(next.join(", "))
  }
  const setManual = (manualValue: string) => {
    const fixed = selected.filter((item) => annuityPurposeOptions.includes(item))
    const custom = manualValue.split(",").map((item) => item.trim()).filter(Boolean)
    onChange([...fixed, ...custom].join(", "))
  }

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-[11px] font-black text-emerald-700">연금 가입 목적</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {annuityPurposeOptions.map((option) => {
          const active = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={`rounded-full border px-3 py-2 text-xs font-black transition ${active ? "border-emerald-700 bg-emerald-700 text-white" : "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300"}`}
            >
              {option}
            </button>
          )
        })}
      </div>
      <Input
        label="수동 입력"
        value={manual}
        onChange={setManual}
        placeholder="예: 개인연금 보완, 퇴직 후 현금흐름 확보"
      />
    </div>
  )
}

function formatNumber(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "")
  if (!digits) return ""
  return Number(digits).toLocaleString("ko-KR")
}

// suffix가 있는 금액 필드는 숫자만 받아 쉼표 포맷 표시, 저장은 raw 숫자로
function Input({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  numeric,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  suffix?: string
  numeric?: boolean
}) {
  const displayValue = numeric ? formatNumber(value) : value

  const handleChange = (raw: string) => {
    if (numeric) {
      onChange(raw.replace(/[^0-9]/g, ""))
    } else {
      onChange(raw)
    }
  }

  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black text-slate-500">{label}</span>
      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-cyan-500">
        <input
          value={displayValue}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          inputMode={numeric ? "numeric" : undefined}
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
    <div className="grid grid-cols-3 gap-2">
      {categories.map((template) => {
        const active = selected.id === template.id
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition ${active ? "border-cyan-400 bg-cyan-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${template.tone} text-white`}>
              <CategoryIcon template={template} />
            </div>
            <p className="text-center text-[11px] font-black leading-tight text-slate-900">{template.label}</p>
          </button>
        )
      })}
    </div>
  )
}

function ModeSelector({ mode, onMode }: { mode: ProposalMode; onMode: (mode: ProposalMode) => void }) {
  const items: { id: ProposalMode; label: string; icon: typeof FileText }[] = [
    { id: "single",  label: "단일제안", icon: FileText },
    { id: "compare", label: "비교제안", icon: BarChart3 },
    { id: "cross",   label: "교차설계", icon: Activity },
    { id: "bundle",  label: "통합제안", icon: ShieldCheck },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(({ id, label, icon: Icon }) => {
        const active = mode === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onMode(id)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border py-3 transition ${active ? "border-[#102a4c] bg-[#102a4c] text-white shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-[10px] font-black leading-tight">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

function FocusSelector({ focus, onFocus, disabled }: { focus: CompareFocus[]; onFocus: (focus: CompareFocus[]) => void; disabled?: boolean }) {
  const toggle = (id: CompareFocus) => {
    const next = focus.includes(id)
      ? (focus.filter((f) => f !== id).length ? focus.filter((f) => f !== id) : [id])
      : [...focus, id]
    onFocus(next)
  }
  return (
    <div className="flex flex-wrap gap-2">
      {focusOptions.map((option) => {
        const active = focus.includes(option.id)
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(option.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${active ? "border-[#102a4c] bg-[#102a4c] text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"} ${disabled ? "opacity-40" : ""}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function ReportHeader({ template, customerName, consultant }: { template: CategoryTemplate; customerName: string; consultant: ConsultantInfo }) {
  return (
    <div className={`rounded-t-[28px] bg-gradient-to-r ${template.tone} px-8 py-6 text-white`}>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[11px] font-black tracking-[0.2em] text-white/70">맞춤형 보장 점검 및 제안서</p>
          <h1 className="mt-2 text-[28px] font-black tracking-[-0.01em]">
            {customerName || "고객"}님 {template.label} 보장 제안
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
  pageOffset = 0,
}: {
  template: CategoryTemplate
  mode: ProposalMode
  plans: PlanData[]
  focus: CompareFocus
  customerName: string
  consultant: ConsultantInfo
  pageOffset?: number
}) {
  const visiblePlans = mode === "single" ? plans.slice(0, 1) : plans
  const lowest = bestPremium(visiblePlans)
  const recommendation = buildRecommendation(template, mode, visiblePlans, focus)
  const groups = detailGroups(template)
  const hasCustomCoverage = visiblePlans.some((plan) => (plan.customCoverages ?? []).some((item) =>
    item.name.trim() || item.amount.trim() || item.note.trim()
  ))
  const outputGroups = groups.filter((group) =>
    group.metrics.length > 0 || (template.id === "health" && group.title.includes("추가 담보") && hasCustomCoverage)
  )
  const scenarioPageNum = pageOffset + 3 + outputGroups.length

  return (
    <div className="proposal-print-area">
      <ReportPage>
        <ReportHeader template={template} customerName={customerName} consultant={consultant} />
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
              <SummaryTile label="월 보험료 최저" value={lowest ? `${lowest.company || "입력 상품"} ${formatPremium(lowest)}` : "-"} />
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
              <p className="text-sm font-black text-cyan-900">고객 설명 포인트</p>
              <p className="mt-2 text-xs font-bold leading-6 text-cyan-800">
                보험료만 낮은 안보다 실제 사고·질병 상황에서 지급되는 담보와 보장범위를 함께 비교해야 합니다. 같은 금액이라도 지급 조건이 다르면 상담 해석이 달라집니다.
              </p>
            </div>
            <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-black text-slate-950">각 보험사별 설계 목적</h2>
              <div className={`mt-3 grid gap-3 ${visiblePlans.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
                {visiblePlans.map((plan, index) => (
                  <PlanMemo key={plan.id} plan={plan} index={index} template={template} />
                ))}
              </div>
            </section>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-600" />
              <h2 className="text-xl font-black text-slate-950">{template.reportTitle}</h2>
            </div>
            <PlanSnapshot template={template} plans={visiblePlans} />
          </section>
        </div>
        <PageNum num={pageOffset + 1} />
      </ReportPage>

      <ReportPage>
        <ReportHeader template={template} customerName={customerName} consultant={consultant} />
        <div className="grid flex-1 grid-cols-[0.9fr_1.1fr] gap-5 p-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-black text-slate-950">비용 분석</h2>
            <div className="mt-4 grid gap-3">
              {visiblePlans.map((plan, index) => (
                <PremiumCard key={plan.id} plan={plan} index={index} />
              ))}
            </div>
            {template.id === "shortlife" && visiblePlans[0] && (
              <ShortLifeCostInsights plan={visiblePlans[0]} />
            )}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            {template.id === "shortlife" ? (
              <ShortLifeGraphic plans={visiblePlans} />
            ) : template.id === "annuity" ? (
              <AnnuityGraphic plans={visiblePlans} />
            ) : (
              <CategoryGraphic template={template} plans={visiblePlans} />
            )}
          </section>
        </div>
        <PageNum num={pageOffset + 2} />
      </ReportPage>

      {outputGroups.map((group, chunkIndex) => (
        <ReportPage key={`detail-${chunkIndex}`}>
          <ReportHeader template={template} customerName={customerName} consultant={consultant} />
          <div className="flex flex-1 flex-col p-8">
            <section className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-950">{group.title}</h2>
                {outputGroups.length > 1 && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">
                    {chunkIndex + 1}/{outputGroups.length}
                  </span>
                )}
              </div>
              <ComparisonTable
                template={template}
                plans={visiblePlans}
                showCross={mode === "cross"}
                metrics={group.metrics}
                includeCustomRows={template.id !== "health" || group.title.includes("추가 담보")}
              />
            </section>
          </div>
          <PageNum num={pageOffset + 3 + chunkIndex} />
        </ReportPage>
      ))}

      {/* 4페이지: 교차설계면 합산 커버리지, 아니면 사례 인포그래픽 */}
      {mode === "cross" ? (
        <CrossCoveragePage
          template={template}
          plans={visiblePlans}
          customerName={customerName}
          consultant={consultant}
          pageNum={scenarioPageNum}
          last={template.id !== "health"}
        />
      ) : (
        <ReportPage last={template.id !== "health"}>
          {template.id === "health" ? (
            <HealthReadinessPage plans={visiblePlans} customerName={customerName} consultant={consultant} pageNum={scenarioPageNum} />
          ) : (
            <ScenarioPage4 template={template} customerName={customerName} consultant={consultant} pageNum={scenarioPageNum} />
          )}
        </ReportPage>
      )}

      {/* 교차설계 + 건강보험: 질병별 준비금 페이지 추가 */}
      {template.id === "health" && mode === "cross" && (
        <ReportPage>
          <HealthReadinessPage
            plans={visiblePlans}
            customerName={customerName}
            consultant={consultant}
            pageNum={scenarioPageNum + 1}
          />
        </ReportPage>
      )}

      {/* 건강보험 치료단계 — 모든 모드(단일·비교·교차·통합) 공통 마지막 페이지 */}
      {template.id === "health" && (
        <ReportPage last>
          <HealthTreatmentPage
            customerName={customerName}
            consultant={consultant}
            pageNum={mode === "cross" ? scenarioPageNum + 2 : scenarioPageNum + 1}
          />
        </ReportPage>
      )}
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
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700">{formatPremium(plan)}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {template.metrics.slice(0, 4).map((metric) => (
              <div key={metric.key} className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-black text-slate-400">{metric.shortLabel || metric.label}</p>
                <p className="mt-1 text-sm font-black text-slate-900">{metricText(metric, plan.metrics[metric.key], plan)}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PremiumCard({ plan, index }: { plan: PlanData; index: number }) {
  const monthly = plan.isDollar ? num(plan.monthlyPremium) * (num(plan.exchangeRate ?? "") || 1400) : num(plan.monthlyPremium)
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
          <p className="mt-1 text-lg font-black text-slate-950">{formatPremium(plan)}</p>
        </div>
        <div className="rounded-xl bg-white p-3">
          <p className="text-[10px] font-black text-slate-400">총 납입 예상</p>
          <p className="mt-1 text-lg font-black text-slate-950">{total > 0 ? formatKrw(total) : "-"}</p>
        </div>
      </div>
    </div>
  )
}

function ShortLifeCostInsights({ plan }: { plan: PlanData }) {
  const d = shortLifeDerived(plan)
  const savingMonthWeights = Array.from({ length: 12 }, (_, index) => 12 - index).join(" + ")
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black text-emerald-700">보험으로 가져갈 때</p>
            <p className="mt-1 text-base font-black text-emerald-950">비과세 구조 + 환급률 {d.refundRate.toFixed(1)}%</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
        </div>
        <p className="mt-2 text-[11px] font-bold leading-5 text-emerald-800">
          납입 완료 후 장기 유지 시 환급률이 총납입보험료를 초과하는 구간을 활용합니다. 이자소득세를 떼는 은행상품과 달리 요건 충족 시 보험차익 비과세 설명이 가능합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black text-rose-700">은행 적금으로 가져갈 때</p>
            <p className="mt-1 text-base font-black text-rose-950">연 3%라도 체감 수익은 낮아집니다</p>
          </div>
          <CircleDollarSign className="h-5 w-5 text-rose-500" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white p-3">
            <p className="text-[10px] font-black text-slate-400">세전 체감 수익률</p>
            <p className="mt-1 text-sm font-black text-slate-900">{d.savingEffectiveRate.toFixed(1)}%</p>
            <p className="text-[10px] font-bold text-slate-400">연평균 {d.savingEffectiveAnnualRate.toFixed(2)}%</p>
          </div>
          <div className="rounded-xl bg-white p-3">
            <p className="text-[10px] font-black text-slate-400">이자소득세 15.4%</p>
            <p className="mt-1 text-sm font-black text-rose-700">-{wonMan(d.savingTax)}</p>
            <p className="text-[10px] font-bold text-slate-400">세후 이자 {wonMan(d.savingInterestAfterTax)}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] font-bold leading-5 text-rose-800">
          월적립식은 첫 달 납입분만 12개월 전체 이자가 붙고, 두 번째 달은 11/12, 세 번째 달은 10/12처럼 이자 적용 기간이 줄어듭니다. 1년 기준 계산식은 ({savingMonthWeights}) / 12개월입니다.
        </p>
      </div>
    </div>
  )
}

function CategoryGraphic({ template, plans }: { template: CategoryTemplate; plans: PlanData[] }) {
  if (template.id === "health") return <HealthCoverageOverviewGraphic plans={plans} />

  const visibleMetrics = template.metrics
    .filter((metric) => metric.kind !== "text")
    .filter((metric) => plans.some((plan) => num(plan.metrics[metric.key] || "") > 0))
    .slice(0, 7)
  return (
    <div className="flex h-full flex-col">
      <h2 className="text-lg font-black text-slate-950">보장 인포그래픽</h2>
      <p className="mt-1 text-xs font-bold text-slate-400">핵심 보장금액을 한눈에 확인할 수 있도록 정리했습니다.</p>
      <div className="mt-4 grid flex-1 gap-2">
        {visibleMetrics.length === 0 && (
          <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-400">
            확인 가능한 보장금액이 없습니다.
          </div>
        )}
        {visibleMetrics.map((metric) => {
          const max = metricMax(plans, metric)
          return (
            <div key={metric.key} className="grid grid-cols-[145px_1fr] gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="flex flex-col justify-center">
                <p className="text-sm font-black leading-5 text-slate-900">{metric.label}</p>
                <p className="mt-1 text-[10px] font-bold text-slate-400">{metric.group || "보장금액"}</p>
              </div>
              <div className="grid content-center gap-1.5">
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

// 진단비 카드
const healthDiagnosisCards = [
  { label: "일반암 진단비", keys: ["cancer"], tone: "border-rose-100 bg-rose-50 text-rose-700" },
  { label: "유사암 진단비", keys: ["minorCancer"], tone: "border-pink-100 bg-pink-50 text-pink-700" },
  { label: "뇌혈관 진단비", keys: ["brain"], tone: "border-cyan-100 bg-cyan-50 text-cyan-700" },
  { label: "심장 진단비", keys: ["heart"], tone: "border-orange-100 bg-orange-50 text-orange-700" },
]

// 수술비 카드 (종수술비 상해/질병 분리)
const healthSurgeryCards: { label: string; sub?: string; keys: string[]; tone: string; wide?: boolean }[] = [
  { label: "상해수술", sub: "종합/상급", keys: ["injuryComprehensiveSurgery", "injuryAdvancedSurgery", "injurySurgery"], tone: "border-slate-200 bg-slate-50 text-slate-700" },
  { label: "질병수술", sub: "종합/상급", keys: ["diseaseComprehensiveSurgery", "diseaseAdvancedSurgery", "diseaseSurgery"], tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
  { label: "상해 종수술비", sub: "최대금액", keys: ["injuryTypeSurgery"], tone: "border-blue-100 bg-blue-50 text-blue-700" },
  { label: "질병 종수술비", sub: "최대금액", keys: ["diseaseTypeSurgery"], tone: "border-indigo-100 bg-indigo-50 text-indigo-700" },
  { label: "N대 수술비", keys: ["diseaseNSurgery"], tone: "border-violet-100 bg-violet-50 text-violet-700", wide: true },
]

// 간병 카드 (질병/상해/요양병원 분리, diseaseCareDaily 없으면 care fallback)
const healthCareCards = [
  { label: "질병 간병일당", sub: "일당", primaryKeys: ["diseaseCareDaily"], fallbackKeys: ["care"], tone: "border-teal-100 bg-teal-50 text-teal-700" },
  { label: "상해 간병일당", sub: "일당", primaryKeys: ["injuryCareDaily"], fallbackKeys: [] as string[], tone: "border-green-100 bg-green-50 text-green-700" },
  { label: "요양병원 간병", sub: "일당", primaryKeys: ["nursingHospitalDaily"], fallbackKeys: [] as string[], tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
]

function HealthCoverageOverviewGraphic({ plans }: { plans: PlanData[] }) {
  const sumKeys = (keys: string[]) =>
    Math.max(...plans.map((plan) => keys.reduce((sum, key) => sum + num(plan.metrics[key] || ""), 0)), 0)
  const resolveValue = (primaryKeys: string[], fallbackKeys: string[]) => {
    const v = sumKeys(primaryKeys)
    return v > 0 ? v : sumKeys(fallbackKeys)
  }

  const CardItem = ({ label, sub, value, tone, wide }: { label: string; sub?: string; value: number; tone: string; wide?: boolean }) => (
    <div className={`${wide ? "col-span-2" : ""} rounded-xl border p-2.5 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black leading-5">{label}</p>
          {sub && <p className="text-[9px] font-bold opacity-70">{sub}</p>}
        </div>
        <p className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-xs font-black text-slate-900">
          {value > 0 ? `${won(value)}만원` : "-"}
        </p>
      </div>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      <h2 className="text-base font-black text-slate-950">보장 인포그래픽</h2>
      <p className="mt-0.5 text-[10px] font-bold text-slate-400">회사별 비교는 상세 페이지에서 보고, 여기서는 보장 구조만 압축해서 확인합니다.</p>

      {/* 진단비 */}
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {healthDiagnosisCards.map((c) => (
          <CardItem key={c.label} label={c.label} value={sumKeys(c.keys)} tone={c.tone} />
        ))}
      </div>

      {/* 수술비 */}
      <p className="mt-2.5 text-[9px] font-black tracking-[0.12em] text-slate-400 uppercase">수술비</p>
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        {healthSurgeryCards.map((c) => (
          <CardItem key={c.label} label={c.label} sub={c.sub} value={sumKeys(c.keys)} tone={c.tone} wide={c.wide} />
        ))}
      </div>

      {/* 간병 */}
      <p className="mt-2.5 text-[9px] font-black tracking-[0.12em] text-slate-400 uppercase">간병 보장</p>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        {healthCareCards.map((c) => (
          <CardItem key={c.label} label={c.label} sub={c.sub} value={resolveValue(c.primaryKeys, c.fallbackKeys)} tone={c.tone} />
        ))}
      </div>
    </div>
  )
}

// 만원 단위 포맷 헬퍼
const wonMan = (v: number) => `${new Intl.NumberFormat("ko-KR").format(Math.round(v / 10000))}만원`

function ShortLifeGraphic({ plans }: { plans: PlanData[] }) {
  const first = plans[0]
  const derived = first ? shortLifeDerived(first) : null
  if (!first || !derived) return null
  const { totalPaid, refund, savingFuture, savingFutureAfterTax, refundRate, horizonYears } = derived
  const insuranceGain = refund - totalPaid          // 음수 가능
  const savingGainAfterTax = savingFutureAfterTax - totalPaid
  const maxVal = Math.max(totalPaid, refund, savingFutureAfterTax, 1)
  const refundPct = Math.max(4, (refund / maxVal) * 100)
  const savingPct = Math.max(4, (savingFutureAfterTax / maxVal) * 100)
  const principalPct = Math.max(4, (totalPaid / maxVal) * 100)
  const gap = refund - savingFutureAfterTax
  const gapLabel = gap >= 0 ? "단기납 환급금 우위" : "월 적금 예상액 우위"
  const gapColor = gap >= 0 ? "text-emerald-700" : "text-rose-600"
  const horizonLabel = `${horizonYears}년 후`

  return (
    <div>
      <h2 className="text-lg font-black text-slate-950">단기납 종신 vs 월 적금 3%</h2>
      <p className="mt-1 text-xs font-bold text-slate-400">같은 월 납입금을 보험료와 적금으로 각각 냈을 때의 결과를 비교합니다.</p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-black text-slate-500">총 납입원금</p>
          <p className="mt-1 text-base font-black text-slate-800">{wonMan(totalPaid)}</p>
          <p className="text-[10px] font-black text-slate-400">{derived.years}년납 기준</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[10px] font-black text-emerald-700">입력 환급률</p>
          <p className="mt-1 text-base font-black text-emerald-800">{refundRate.toFixed(1)}%</p>
          <p className="text-[10px] font-black text-emerald-600">총납입 대비</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-black text-slate-500">{horizonLabel} 환급금</p>
          <p className="mt-1 text-base font-black text-slate-900">{wonMan(refund)}</p>
          <p className={`text-[10px] font-black ${insuranceGain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            납입금 대비 {insuranceGain >= 0 ? "+" : "-"}{wonMan(Math.abs(insuranceGain))}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-[10px] font-black text-rose-700">적금 3% 세후 예상</p>
          <p className="mt-1 text-base font-black text-rose-700">{wonMan(savingFutureAfterTax)}</p>
          <p className="text-[10px] font-black text-rose-500">세전 {wonMan(savingFuture)} · 세후이자 +{wonMan(savingGainAfterTax)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black text-slate-500">비교 결론</p>
            <p className={`mt-1 text-xl font-black ${gapColor}`}>{gapLabel}</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-2 text-right">
            <p className="text-[10px] font-black text-slate-400">차이</p>
            <p className={`text-lg font-black ${gapColor}`}>{gap >= 0 ? "+" : "-"}{wonMan(Math.abs(gap))}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-xs font-black text-slate-500">
              <span>납입원금</span>
              <span>{wonMan(totalPaid)}</span>
            </div>
            <div className="h-3 rounded-full bg-white">
              <div className="h-3 rounded-full bg-slate-400" style={{ width: `${principalPct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-[88px_1fr_92px] items-center gap-3">
            <div>
              <p className="text-xs font-black text-emerald-800">단기납 종신</p>
              <p className="text-[10px] font-bold text-slate-400">환급금</p>
            </div>
            <div className="h-10 overflow-hidden rounded-full bg-white">
              <div className="flex h-10 items-center justify-end rounded-full bg-emerald-500 px-3 text-[11px] font-black text-white" style={{ width: `${refundPct}%` }}>
                {wonMan(refund)}
              </div>
            </div>
            <p className="text-right text-xs font-black text-emerald-700">{refundRate.toFixed(1)}%</p>
          </div>

          <div className="grid grid-cols-[88px_1fr_92px] items-center gap-3">
            <div>
              <p className="text-xs font-black text-rose-700">월 적금</p>
              <p className="text-[10px] font-bold text-slate-400">연 3% 세후</p>
            </div>
            <div className="h-10 overflow-hidden rounded-full bg-white">
              <div className="flex h-10 items-center justify-end rounded-full bg-rose-400 px-3 text-[11px] font-black text-white" style={{ width: `${savingPct}%` }}>
                {wonMan(savingFutureAfterTax)}
              </div>
            </div>
            <p className="text-right text-xs font-black text-rose-600">+{wonMan(savingGainAfterTax)}</p>
          </div>
        </div>
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

function AnnuityGraphic({ plans }: { plans: PlanData[] }) {
  const first = plans[0]
  const derived = first ? annuityDerived(first) : null
  if (!first || !derived) return null
  const maxAge = Math.max(derived.annuityStartAge + 5, derived.paymentEndAge + 5, derived.currentAge + 20)
  const span = Math.max(1, maxAge - derived.currentAge)
  const paidEndPct = Math.min(96, Math.max(12, ((derived.paymentEndAge - derived.currentAge) / span) * 100))
  const startPct = Math.min(98, Math.max(paidEndPct + 8, ((derived.annuityStartAge - derived.currentAge) / span) * 100))
  const isVariable = derived.annuityType.includes("변액")
  const gain = derived.refund - derived.totalPaid

  return (
    <div>
      <h2 className="text-lg font-black text-slate-950">연금보험 라이프사이클</h2>
      <p className="mt-1 text-xs font-bold text-slate-400">가입, 납입종료, 연금개시 시점을 한 장으로 설명합니다.</p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-black text-slate-500">연금 유형</p>
          <p className="mt-1 text-base font-black text-slate-900">{derived.annuityType}</p>
          <p className="text-[10px] font-black text-slate-400">{isVariable ? "운용실적 반영" : "공시/확정 구조 확인"}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[10px] font-black text-emerald-700">총 납입예정</p>
          <p className="mt-1 text-base font-black text-emerald-800">{wonMan(derived.totalPaid)}</p>
          <p className="text-[10px] font-black text-emerald-600">{derived.years}년납</p>
        </div>
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
          <p className="text-[10px] font-black text-cyan-700">환급률</p>
          <p className="mt-1 text-base font-black text-cyan-800">{derived.rate.toFixed(1)}%</p>
          <p className="text-[10px] font-black text-cyan-600">{derived.refund ? wonMan(derived.refund) : "금액 입력 필요"}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-[10px] font-black text-amber-700">월 예상 연금</p>
          <p className="mt-1 text-base font-black text-amber-800">{derived.monthlyAnnuity ? wonMan(derived.monthlyAnnuity) : "-"}</p>
          <p className="text-[10px] font-black text-amber-600">연금개시 후</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="relative h-24">
          <div className="absolute left-0 right-0 top-10 h-2 rounded-full bg-slate-200" />
          <div className="absolute left-0 top-10 h-2 rounded-full bg-emerald-500" style={{ width: `${paidEndPct}%` }} />
          <div className="absolute top-7 h-8 w-8 -translate-x-1/2 rounded-full border-4 border-white bg-[#102a4c] shadow" style={{ left: "0%" }} />
          <div className="absolute top-7 h-8 w-8 -translate-x-1/2 rounded-full border-4 border-white bg-emerald-500 shadow" style={{ left: `${paidEndPct}%` }} />
          <div className="absolute top-7 h-8 w-8 -translate-x-1/2 rounded-full border-4 border-white bg-amber-500 shadow" style={{ left: `${startPct}%` }} />

          <div className="absolute top-0 -translate-x-0 text-left" style={{ left: "0%" }}>
            <p className="text-[10px] font-black text-slate-500">가입</p>
            <p className="text-sm font-black text-slate-900">{derived.currentAge}세</p>
          </div>
          <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${paidEndPct}%` }}>
            <p className="text-[10px] font-black text-emerald-700">납입종료</p>
            <p className="text-sm font-black text-emerald-900">{derived.paymentEndAge}세</p>
          </div>
          <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${startPct}%` }}>
            <p className="text-[10px] font-black text-amber-700">연금개시</p>
            <p className="text-sm font-black text-amber-900">{derived.annuityStartAge}세</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-bold">
          <div className="rounded-xl bg-white p-3 text-slate-600">월 납입: {formatPremium(first)}</div>
          <div className="rounded-xl bg-white p-3 text-slate-600">거치기간: {derived.gapYears}년</div>
          <div className={`rounded-xl bg-white p-3 ${gain >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
            납입 대비: {gain >= 0 ? "+" : "-"}{wonMan(Math.abs(gain))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4">
        <p className="text-sm font-black text-rose-900">유의사항</p>
        <p className="mt-2 text-xs font-bold leading-6 text-rose-800">
          {first.metrics.riskNotice || annuityDefaultCaution}
        </p>
      </div>
    </div>
  )
}

function ComparisonTable({
  template,
  plans,
  showCross = false,
  metrics = template.metrics,
  includeCustomRows = true,
}: {
  template: CategoryTemplate
  plans: PlanData[]
  showCross?: boolean
  metrics?: MetricDef[]
  includeCustomRows?: boolean
}) {
  const sumMetric = (metric: MetricDef) => {
    if (metric.kind === "percent") {
      const values = plans.map((plan) => num(plan.metrics[metric.key])).filter((value) => value > 0)
      return values.length ? `${(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)}%` : "-"
    }
    if (metric.kind !== "money") return "-"
    const total = plans.reduce((sum, plan) => sum + num(plan.metrics[metric.key]), 0)
    return total > 0 ? `${won(total)}${metric.unit || "만원"}` : "-"
  }
  const totalPremium = plans.reduce((sum, plan) => {
    const monthly = plan.isDollar ? num(plan.monthlyPremium) * (num(plan.exchangeRate ?? "") || 1400) : num(plan.monthlyPremium)
    return sum + monthly
  }, 0)
  const customRows = includeCustomRows ? Array.from(new Set(
    plans.flatMap((plan) => (plan.customCoverages ?? [])
      .filter((item) => item.name.trim() || item.amount.trim() || item.note.trim())
      .map((item) => item.name.trim() || "추가 담보"))
  )) : []
  const visibleMetrics = metrics

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-slate-50">
            <th className="w-[170px] px-4 py-2.5 text-xs font-black text-slate-500">비교 항목</th>
            {plans.map((plan, index) => (
              <th key={plan.id} className="px-4 py-2.5 text-xs font-black text-slate-700">
                {plan.company || `${String.fromCharCode(65 + index)}안`}
              </th>
            ))}
            {showCross && <th className="px-4 py-2.5 text-xs font-black text-emerald-700">합산 보장</th>}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-slate-100">
            <td className="px-4 py-2.5 text-xs font-black text-slate-500">월 보험료</td>
            {plans.map((plan) => <td key={plan.id} className="px-4 py-2.5 text-xs font-black text-slate-900">{formatPremium(plan)}</td>)}
            {showCross && <td className="px-4 py-2.5 text-xs font-black text-emerald-700">{totalPremium > 0 ? formatKrw(totalPremium) : "-"}</td>}
          </tr>
          {visibleMetrics.map((metric) => (
            <tr key={metric.key} className="border-t border-slate-100">
              <td className="px-4 py-2.5 text-xs font-black text-slate-500">{metric.label}</td>
              {plans.map((plan) => (
                <td key={plan.id} className="px-4 py-2.5 text-xs font-black text-slate-900">{metricText(metric, plan.metrics[metric.key], plan)}</td>
              ))}
              {showCross && <td className="px-4 py-2.5 text-xs font-black text-emerald-700">{sumMetric(metric)}</td>}
            </tr>
          ))}
          {visibleMetrics.length === 0 && customRows.length === 0 && (
            <tr className="border-t border-slate-100">
              <td colSpan={plans.length + (showCross ? 2 : 1)} className="px-4 py-8 text-center text-xs font-bold text-slate-400">
                확인 가능한 담보가 없습니다.
              </td>
            </tr>
          )}
          {customRows.map((name) => (
            <tr key={name} className="border-t border-slate-100 bg-slate-50/60">
              <td className="px-4 py-2.5 text-xs font-black text-slate-500">{name}</td>
              {plans.map((plan) => {
                const item = (plan.customCoverages ?? []).find((coverage) => (coverage.name.trim() || "추가 담보") === name)
                const amount = item?.amount ? `${won(num(item.amount))}만원` : "-"
                return <td key={plan.id} className="px-4 py-2.5 text-xs font-black text-slate-900">{amount}</td>
              })}
              {showCross && <td className="px-4 py-2.5 text-xs font-black text-emerald-700">개별 확인</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 교차설계 전용: 합산 보장 vs 실제 치료비 비교 페이지 ──────────────────────
const TREATMENT_COSTS: Record<string, { label: string; min: number; max: number; unit: string }[]> = {
  health: [
    { label: "암 진단 + 1년 치료비", min: 3000, max: 5000, unit: "만원" },
    { label: "뇌졸중 급성기 치료", min: 1500, max: 3500, unit: "만원" },
    { label: "심근경색 시술·재활", min: 2000, max: 4000, unit: "만원" },
  ],
  care: [
    { label: "연간 간병인 비용", min: 1800, max: 3600, unit: "만원" },
    { label: "요양원 입소 1년", min: 1200, max: 2400, unit: "만원" },
    { label: "치매 진단 초기 치료", min: 800, max: 2000, unit: "만원" },
  ],
  driver: [
    { label: "형사합의금 (중상해)", min: 500, max: 3000, unit: "만원" },
    { label: "대인 벌금", min: 300, max: 2000, unit: "만원" },
    { label: "변호사 선임비", min: 200, max: 500, unit: "만원" },
  ],
  dental: [
    { label: "임플란트 3개", min: 300, max: 450, unit: "만원" },
    { label: "크라운 5개", min: 200, max: 350, unit: "만원" },
    { label: "틀니 1개", min: 100, max: 200, unit: "만원" },
  ],
  pet: [
    { label: "슬개골 수술", min: 80, max: 150, unit: "만원" },
    { label: "입원 5일", min: 30, max: 80, unit: "만원" },
    { label: "피부·알러지 연간", min: 20, max: 60, unit: "만원" },
  ],
}

function CrossCoveragePage({
  template,
  plans,
  customerName,
  consultant,
  pageNum,
  last = true,
}: {
  template: CategoryTemplate
  plans: PlanData[]
  customerName: string
  consultant: ConsultantInfo
  pageNum: number
  last?: boolean
}) {
  const moneyMetrics = template.metrics.filter((m) => m.kind === "money")
  const metricSums = Object.fromEntries(
    moneyMetrics.map((m) => [m.key, plans.reduce((s, p) => s + num(p.metrics[m.key]), 0)])
  )
  const totalMonthly = plans.reduce((s, p) => {
    const exchangeRate = num(p.exchangeRate ?? "") || 1400
    return s + (p.isDollar ? num(p.monthlyPremium) * exchangeRate : num(p.monthlyPremium))
  }, 0)
  const costs = TREATMENT_COSTS[template.id] || []
  const maxCoverage = Math.max(...Object.values(metricSums), 1)

  return (
    <ReportPage last={last}>
      <ReportHeader template={template} customerName={customerName} consultant={consultant} />
      <div className="grid flex-1 grid-cols-[1fr_1fr] gap-5 p-8">
        {/* 좌: 합산 보장 구조 */}
        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">교차설계 합산 보장</p>
            <p className="mt-2 text-[28px] font-black text-emerald-900">{plans.length}개사 분산 설계</p>
            <p className="mt-1 text-sm font-bold text-emerald-700">월 합산 {formatKrw(totalMonthly)} · {plans.map((p) => p.company || "?사").join(" + ")}</p>
            <div className={`mt-4 grid gap-2 ${plans.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
              {plans.map((plan, index) => (
                <div key={plan.id} className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                  <p className="text-[10px] font-black text-slate-400">{plan.company || `${String.fromCharCode(65 + index)}안`}</p>
                  <p className="mt-1 text-sm font-black text-emerald-800">{formatPremium(plan)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-black text-slate-500">담보별 합산 보장금액</p>
            <div className="space-y-3">
              {moneyMetrics.slice(0, 5).map((m) => {
                const sum = metricSums[m.key] || 0
                const pct = maxCoverage > 0 ? Math.max(4, (sum / maxCoverage) * 100) : 4
                const colors = ["bg-cyan-500", "bg-emerald-500", "bg-amber-400", "bg-rose-400", "bg-purple-500"]
                const ci = moneyMetrics.indexOf(m) % colors.length
                return (
                  <div key={m.key}>
                    <div className="mb-1 flex justify-between text-[10px] font-black text-slate-500">
                      <span>{m.shortLabel || m.label}</span>
                      <span className="text-emerald-700">{sum > 0 ? `${won(sum)}만원` : "-"}</span>
                    </div>
                    <div className="h-5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-5 rounded-full ${colors[ci]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* 우: 실제 치료비 대비 */}
        <section className="flex flex-col gap-4">
          <p className="text-lg font-black text-slate-950">합산 보장 vs 실제 치료비</p>
          <p className="text-xs font-bold text-slate-400">치료비 최대 기준 — 실제 비용은 증상·기관에 따라 다를 수 있습니다.</p>

          {costs.length > 0 ? (
            <div className="space-y-4">
              {costs.map((cost, i) => {
                // 가장 관련성 높은 메트릭 합산으로 커버율 계산
                const topMetricSum = Math.max(...Object.values(metricSums).filter((v) => v > 0), 0)
                const coverRatio = Math.min(100, cost.max > 0 ? (topMetricSum / cost.max) * 100 : 0)
                const covered = coverRatio >= 80
                return (
                  <div key={i} className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900">{cost.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${covered ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {covered ? "충분 커버" : "부분 커버"}
                      </span>
                    </div>
                    <p className="mb-2 text-[10px] font-bold text-slate-500">실제 비용: {cost.min}~{cost.max}만원</p>
                    <div className="relative h-6 overflow-hidden rounded-full bg-slate-200">
                      {/* 치료비 기준 바 (회색) */}
                      <div className="absolute inset-0 rounded-full bg-slate-200" />
                      {/* 합산 보장 바 */}
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${covered ? "bg-emerald-500" : "bg-amber-400"} flex items-center justify-end pr-2 text-[9px] font-black text-white`}
                        style={{ width: `${Math.min(100, coverRatio)}%` }}
                      >
                        {coverRatio.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-500">이 카테고리의 치료비 기준 데이터를 준비 중입니다.</p>
            </div>
          )}

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
            <p className="text-xs font-black text-cyan-900">교차설계 전략 포인트</p>
            <p className="mt-1.5 text-[11px] font-bold leading-5 text-cyan-800">
              한 회사의 한도 제한을 여러 회사 분산으로 보완합니다. 합산 보장 총액이 실제 치료비를 충분히 커버하는지 확인 후 비중을 조정하세요.
            </p>
          </div>
        </section>
      </div>
      <PageNum num={pageNum} />
    </ReportPage>
  )
}

function PlanMemo({ plan, index, template }: { plan: PlanData; index: number; template: CategoryTemplate }) {
  const caution = plan.cautions || (template.id === "shortlife" ? shortLifeDefaultCaution : template.id === "annuity" ? annuityDefaultCaution : "갱신 여부, 지급 조건, 보장범위 차이를 확인하세요.")
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-sm font-black text-slate-950">{plan.company || `${String.fromCharCode(65 + index)}안`}</p>
      <p className="mt-2 text-[11px] font-bold leading-5 text-emerald-700">설계 목적: {plan.strengths || "담보 역할과 보험료 기준으로 설계 목적을 입력하세요."}</p>
      <p className="mt-1 text-[11px] font-bold leading-5 text-rose-700">확인: {caution}</p>
    </div>
  )
}

const healthSurgeryRows = [
  { label: "일반", injuryKey: "injurySurgery", diseaseKey: "diseaseSurgery" },
  { label: "종합", injuryKey: "injuryComprehensiveSurgery", diseaseKey: "diseaseComprehensiveSurgery" },
  { label: "상급", injuryKey: "injuryAdvancedSurgery", diseaseKey: "diseaseAdvancedSurgery" },
  { label: "종수술비", injuryKey: "injuryTypeSurgery", diseaseKey: "diseaseTypeSurgery" },
  { label: "N대 수술비", injuryKey: "", diseaseKey: "diseaseNSurgery" },
]

function HealthSurgeryInputGrid({
  metrics,
  values,
  onChange,
}: {
  metrics: MetricDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  const metricByKey = Object.fromEntries(metrics.map((metric) => [metric.key, metric]))

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-[120px_1fr_1fr] bg-slate-100 text-xs font-black text-slate-600">
        <div className="px-3 py-2">구분</div>
        <div className="px-3 py-2 text-center">상해</div>
        <div className="px-3 py-2 text-center">질병</div>
      </div>
      {healthSurgeryRows.map((row) => (
        <div key={row.label} className="grid grid-cols-[120px_1fr_1fr] border-t border-slate-100">
          <div className="flex items-center px-3 py-2 text-xs font-black text-slate-700">{row.label}</div>
          {[row.injuryKey, row.diseaseKey].map((key, index) => {
            const metric = key ? metricByKey[key] : undefined
            if (!metric) {
              return (
                <div key={`${row.label}-${index}`} className="flex items-center justify-center bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-300">
                  해당 없음
                </div>
              )
            }
            return (
              <div key={key} className="px-2 py-2">
                <Input
                  label=""
                  value={values[key] || ""}
                  onChange={(value) => onChange(key, value)}
                  placeholder={metric.hint || "금액 입력"}
                  suffix="만원"
                  numeric
                />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

const healthCaseDefs = [
  {
    icon: "🎗️",
    title: "일반암 진단",
    livingMonths: 12,
    treatmentCost: 2000,
    keys: ["cancer", "chemoDrug", "chemoRadiation", "targetDrug", "targetRadiation", "heavyIon", "robotCancerSurgery", "cancerMajorTreatmentGeneral", "cancerMajorTreatmentNonCovered", "diseaseSurgery", "diseaseComprehensiveSurgery", "diseaseAdvancedSurgery", "diseaseTypeSurgery", "diseaseNSurgery"],
    source: "일반암 진단비 + 항암치료 + 암 주요치료비 + 질병수술비",
    note: "항암·표적·방사선·중입자 등 치료비 담보가 있으면 치료비 공백을 보완합니다.",
  },
  {
    icon: "🌸",
    title: "유방암·유사암 진단",
    livingMonths: 12,
    treatmentCost: 1500,
    keys: ["minorCancer", "chemoDrug", "chemoRadiation", "targetDrug", "targetRadiation", "cancerMajorTreatmentGeneral", "cancerMajorTreatmentNonCovered", "diseaseSurgery", "diseaseComprehensiveSurgery", "diseaseAdvancedSurgery", "diseaseTypeSurgery", "diseaseNSurgery"],
    source: "유사암 진단비 + 항암치료 + 암 주요치료비 + 질병수술비",
    note: "소액암·유사암 분류와 감액 조건이 있어 일반암과 별도로 확인합니다.",
  },
  {
    icon: "🧠",
    title: "뇌혈관 질환",
    livingMonths: 6,
    treatmentCost: 2500,
    keys: ["brain", "twoMajorTreatmentComprehensive", "twoMajorTreatmentAdvanced", "diseaseSurgery", "diseaseComprehensiveSurgery", "diseaseAdvancedSurgery", "diseaseTypeSurgery", "diseaseNSurgery", "care"],
    source: "뇌혈관 진단비 + 2대 주요치료비 + 질병수술비 + 간병",
    note: "뇌출혈·뇌졸중·뇌혈관질환 중 어디까지 보장되는지에 따라 준비금 차이가 큽니다.",
  },
  {
    icon: "❤️",
    title: "심장 질환",
    livingMonths: 3,
    treatmentCost: 1750,
    keys: ["heart", "twoMajorTreatmentComprehensive", "twoMajorTreatmentAdvanced", "diseaseSurgery", "diseaseComprehensiveSurgery", "diseaseAdvancedSurgery", "diseaseTypeSurgery", "diseaseNSurgery"],
    source: "허혈성심장질환 진단비 + 2대 주요치료비 + 질병수술비",
    note: "급성심근경색만인지, 허혈성심장질환까지인지 보장 범위를 함께 봅니다.",
  },
]

const lifestyleCase = {
  icon: "🏥",
  title: "생활질환·수술",
  needed: 800,
  keys: ["diseaseSurgery", "diseaseComprehensiveSurgery", "diseaseAdvancedSurgery", "diseaseTypeSurgery", "diseaseNSurgery", "injurySurgery", "injuryComprehensiveSurgery", "injuryAdvancedSurgery", "injuryTypeSurgery"],
  source: "질병수술비 + 종수술비 + 실손의료비",
}

function healthPreparedForPlan(plan: PlanData, keys: string[]) {
  return keys.reduce((sum, key) => sum + num(plan.metrics[key] || ""), 0)
}

function HealthReadinessPage({
  plans,
  customerName,
  consultant,
  pageNum = 4,
}: {
  plans: PlanData[]
  customerName: string
  consultant: ConsultantInfo
  pageNum?: number
}) {
  const livingCost = 250
  const caseRows = healthCaseDefs.map((item) => {
    const livingNeed = item.livingMonths * livingCost
    const needed = livingNeed + item.treatmentCost
    const preparedByPlan = plans.map((plan, index) => ({
      label: plan.company || `${String.fromCharCode(65 + index)}안`,
      value: healthPreparedForPlan(plan, item.keys),
    }))
    const best = preparedByPlan.reduce((selected, current) => current.value > selected.value ? current : selected, preparedByPlan[0] || { label: "-", value: 0 })
    return { ...item, livingNeed, needed, preparedByPlan, best }
  })
  const lifestylePrepared = plans.map((plan, index) => ({
    label: plan.company || `${String.fromCharCode(65 + index)}안`,
    value: healthPreparedForPlan(plan, lifestyleCase.keys),
  }))
  const lifestyleBest = lifestylePrepared.reduce((selected, current) => current.value > selected.value ? current : selected, lifestylePrepared[0] || { label: "-", value: 0 })

  return (
    <>
      <div className="shrink-0 rounded-t-[28px] bg-gradient-to-r from-rose-500 to-orange-500 px-8 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] text-white/70">질병별 필요자금 대비 준비금</p>
            <h1 className="mt-1 text-[22px] font-black">{customerName || "고객"}님은 얼마까지 준비되어 있나</h1>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-white/70">보험의 기준</p>
            <p className="mt-1 text-base font-black">{consultant.name || "담당 설계사"}</p>
            <p className="text-xs font-bold text-white/70">{consultant.phone}</p>
          </div>
        </div>
        <p className="mt-1 text-[11px] font-bold text-white/80">월 생활비 250만원 기준: 암 1년, 뇌 6개월, 심장 3개월의 소득 공백을 함께 계산합니다.</p>
      </div>

      <div className="flex-1 p-8">
        <div className="grid grid-cols-4 gap-3">
          {caseRows.map((item) => {
            const pct = Math.min(100, item.needed > 0 ? (item.best.value / item.needed) * 100 : 0)
            const gap = item.best.value - item.needed
            return (
              <div key={item.title} className="flex min-h-[290px] flex-col rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-slate-950">{item.icon} {item.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${gap >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {gap >= 0 ? "준비 가능" : "부족"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[9px] font-black text-slate-400">생활비 공백</p>
                    <p className="mt-1 text-xs font-black text-slate-900">{man(item.livingNeed)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[9px] font-black text-slate-400">치료비 기준</p>
                    <p className="mt-1 text-xs font-black text-slate-900">{man(item.treatmentCost)}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-rose-50 p-3">
                  <p className="text-[10px] font-black text-rose-700">필요 평균비용</p>
                  <p className="mt-1 text-xl font-black text-rose-800">{man(item.needed)}</p>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-black text-slate-500">
                    <span>{item.best.label} 준비금</span>
                    <span className="text-cyan-700">{man(item.best.value)}</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-4 rounded-full bg-cyan-500" style={{ width: `${Math.max(5, pct)}%` }} />
                  </div>
                </div>
                <p className="mt-3 text-[10px] font-bold leading-5 text-slate-500">{item.source}</p>
                <p className="mt-auto pt-2 text-[10px] font-bold leading-5 text-slate-400">{item.note}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-4 grid grid-cols-[1fr_1.25fr] gap-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-black text-emerald-900">{lifestyleCase.icon} {lifestyleCase.title}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-black text-slate-400">예상 치료비</p>
                <p className="mt-1 text-base font-black text-slate-950">{man(lifestyleCase.needed)}</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-black text-slate-400">{lifestyleBest.label}</p>
                <p className="mt-1 text-base font-black text-emerald-700">{man(lifestyleBest.value)}</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-black text-slate-400">보완 담보</p>
                <p className="mt-1 text-xs font-black leading-5 text-slate-900">종수술비 + 실손</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-bold leading-5 text-emerald-800">생활질환은 진단비보다 질병수술비, 1~5종 수술비, 실손의료비가 반복 치료비를 줄이는 역할을 합니다.</p>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
            <p className="text-sm font-black text-cyan-900">고객 설명 문장</p>
            <p className="mt-2 text-xs font-bold leading-6 text-cyan-800">
              진단비는 생활비 공백을 메우는 목돈이고, 항암·주요치료비·2대 주요치료비·질병수술비는 실제 치료 과정에서 반복 발생하는 비용을 줄이는 보장입니다.
              실손의료비가 있다면 급여·비급여 치료비 청구와 함께 중복 활용할 수 있어, 진단비만 보는 것보다 실제 회복기간 기준으로 준비 여부를 판단해야 합니다.
            </p>
          </div>
        </div>
      </div>
      <PageNum num={pageNum} />
    </>
  )
}

// ── 4페이지: 사례 인포그래픽 ──────────────────────────────────────────────
function ScenarioPage4({
  template,
  customerName,
  consultant,
  pageNum = 4,
}: {
  template: CategoryTemplate
  customerName: string
  consultant: ConsultantInfo
  pageNum?: number
}) {
  const cfg = CATEGORY_SCENARIOS[template.id]
  if (!cfg) return null
  const { cases } = cfg

  return (
    <>
      {/* 페이지 헤더 */}
      <div className={`shrink-0 rounded-t-[28px] bg-gradient-to-r ${template.tone} px-8 py-4 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] text-white/70">{customerName || "고객"}님 실제 사례로 보는 위험과 보장</p>
            <h1 className="mt-1 text-[22px] font-black">{cfg.page4Title}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-white/70">보험의 기준</p>
            <p className="mt-1 text-base font-black">{consultant.name || "담당 설계사"}</p>
            <p className="text-xs font-bold text-white/70">{consultant.phone}</p>
          </div>
        </div>
        <p className="mt-1 text-[11px] font-bold text-white/80">{cfg.page4Subtitle}</p>
      </div>

      {/* A안: 3개 사례 카드 */}
      <div className="flex flex-1 flex-col justify-between px-8 py-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-[#102a4c] px-3 py-1 text-[11px] font-black text-white">A안 — 실제 비용 사례</span>
          <span className="text-[11px] font-bold text-slate-500">준비하지 않으면 전액 자부담이 발생합니다</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {cases.map((c, idx) => (
            <div key={idx} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{c.icon}</span>
                <div>
                  <p className="text-[12px] font-black text-slate-950">{c.label}</p>
                  <p className="text-[10px] font-bold text-rose-600">{c.totalEstimate}</p>
                </div>
              </div>
              <p className="mt-2 text-[10px] font-bold leading-5 text-slate-500">{c.situation}</p>
              <div className="mt-3 space-y-1.5">
                {c.costItems.map((item, ii) => (
                  <div key={ii} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-1.5">
                    <span className="text-[10px] font-black text-slate-600">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-900">{item.amount}</span>
                      {item.covered && item.coverLabel && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700">{item.coverLabel}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* B안: 타임라인 → 결론 */}
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-cyan-600 px-3 py-1 text-[11px] font-black text-white">B안 — 보험으로 준비하면</span>
            <span className="text-[11px] font-bold text-slate-500">사고·질병 발생 → 청구 → 보장 확인</span>
          </div>
          <div className="flex items-center gap-0">
            {cases.map((c, idx) => (
              <div key={idx} className="flex flex-1 items-center">
                <div className="flex-1 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                  <p className="text-[11px] font-black text-cyan-900">{c.icon} {c.label}</p>
                  <p className="mt-1 text-[10px] font-bold text-cyan-700">{c.conclusion}</p>
                </div>
                {idx < cases.length - 1 && (
                  <ChevronRight className="mx-1 h-5 w-5 shrink-0 text-cyan-400" />
                )}
              </div>
            ))}
            <ChevronRight className="mx-1 h-5 w-5 shrink-0 text-emerald-500" />
            <div className="flex w-36 shrink-0 flex-col items-center justify-center rounded-2xl bg-emerald-600 px-4 py-4 text-center">
              <CheckCircle2 className="mb-1 h-5 w-5 text-white" />
              <p className="text-[12px] font-black text-white">제안서로 준비하면</p>
              <p className="text-[11px] font-black text-emerald-200">보장 가능</p>
            </div>
          </div>
        </div>
      </div>

      <PageNum num={pageNum} />
    </>
  )
}

// ── 5페이지: 건강보험 치료단계 ────────────────────────────────────────────
function HealthTreatmentPage({
  customerName,
  consultant,
  pageNum = 5,
}: {
  customerName: string
  consultant: ConsultantInfo
  pageNum?: number
}) {
  const cfg = CATEGORY_SCENARIOS.health?.page5
  if (!cfg) return null

  return (
    <>
      <div className="shrink-0 rounded-t-[28px] bg-gradient-to-r from-rose-500 to-orange-500 px-8 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] text-white/70">{customerName || "고객"}님 보장 구조 심층 분석</p>
            <h1 className="mt-1 text-[22px] font-black">{cfg.title}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-white/70">보험의 기준</p>
            <p className="mt-1 text-base font-black">{consultant.name || "담당 설계사"}</p>
            <p className="text-xs font-bold text-white/70">{consultant.phone}</p>
          </div>
        </div>
        <p className="mt-1 text-[11px] font-bold text-white/80">{cfg.subtitle}</p>
      </div>

      <div className="flex flex-1 flex-col justify-between px-8 py-5">
        {/* 치료 단계 흐름 */}
        <div className="flex items-stretch gap-2">
          {cfg.steps.map((step, idx) => (
            <div key={idx} className="flex flex-1 items-center">
              <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">{step.icon}</span>
                  <p className="text-[12px] font-black text-slate-950">{step.step}</p>
                </div>
                <div className="mt-2 rounded-xl bg-rose-50 px-3 py-2">
                  <p className="text-[10px] font-black text-rose-700">비용</p>
                  <p className="text-[10px] font-bold leading-5 text-rose-900">{step.cost}</p>
                </div>
                <div className="mt-2 rounded-xl bg-cyan-50 px-3 py-2">
                  <p className="text-[10px] font-black text-cyan-700">담보</p>
                  <p className="text-[10px] font-bold text-cyan-900">{step.coverage}</p>
                </div>
                <p className="mt-2 text-[10px] font-bold leading-5 text-slate-500">{step.note}</p>
              </div>
              {idx < cfg.steps.length - 1 && (
                <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-slate-300" />
              )}
            </div>
          ))}
        </div>

        {/* 급여 vs 비급여 범례 */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">급여 항목 (본인부담 5 ~ 20%)</p>
            <p className="mt-2 text-xs font-bold leading-6 text-slate-600">
              국가에서 보장하는 항목입니다. 실손보험이 본인부담금을 보완합니다. 주로 입원비·수술비·기본 약제비가 해당됩니다.
            </p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
            <p className="text-sm font-black text-rose-900">비급여 항목 (100% 자부담)</p>
            <p className="mt-2 text-xs font-bold leading-6 text-rose-700">
              표적항암제·면역항암제·선택진료비·상급병실료 등입니다. 1회 수백만원이 발생할 수 있으며 실손보험에서 별도 청구합니다.
            </p>
          </div>
        </div>

        {/* 결론 */}
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-black text-emerald-900">이중 보장 구조 완성</p>
          </div>
          <p className="mt-2 text-xs font-bold leading-6 text-emerald-800">{cfg.conclusion}</p>
        </div>
      </div>

      <PageNum num={pageNum} />
    </>
  )
}

// ── 번들 모드: 커버 페이지 ────────────────────────────────────────────────

// ── 번들 모드: 커버 페이지 ────────────────────────────────────────────────
function BundleCoverPage({
  sections,
  customerName,
  consultant,
}: {
  sections: CategorySection[]
  customerName: string
  consultant: ConsultantInfo
}) {
  const totalMonthly = sections.reduce((sum, s) => sum + s.plans.reduce((ps, p) => ps + (p.isDollar ? num(p.monthlyPremium) * (num(p.exchangeRate ?? "") || 1400) : num(p.monthlyPremium)), 0), 0)
  const totalPlans = sections.reduce((sum, s) => sum + s.plans.length, 0)
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })

  return (
    <ReportPage>
      <div className="relative flex h-full flex-col">
        {/* 헤더 */}
        <div className="shrink-0 bg-gradient-to-br from-[#0F172A] via-[#1C2B45] to-[#243B5E] px-10 py-8 text-white">
          <p className="text-[10px] font-black tracking-[0.28em] text-[#C9A96E]/70 uppercase">Metarich Signal Group · 맞춤형 통합 보장 제안서</p>
          <h1 className="mt-3 text-[36px] font-black leading-[1.2]">
            {customerName || "고객"}님을 위한<br />
            <span className="text-[#C9A96E]">통합 보장 플랜</span>
          </h1>
          <p className="mt-3 text-[11px] font-bold text-white/50">{today} · {sections.length}개 보장 영역 · {totalPlans}개 플랜</p>
        </div>

        {/* 보장 영역 목록 */}
        <div className="flex-1 flex flex-col p-8 pb-4 gap-3 overflow-hidden">
          <p className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase">이번 제안에 포함된 보장 영역</p>
          {sections.map((s, idx) => {
            const tpl = categories.find((c) => c.id === s.templateId)
            if (!tpl) return null
            return (
              <div key={idx} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* 카테고리 헤더바 */}
                <div className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${tpl.tone} text-white`}>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                    <CategoryIcon template={tpl} />
                  </div>
                  <p className="text-sm font-black">{tpl.label}</p>
                </div>
                {/* 플랜 행 */}
                {s.plans.map((p, pi) => (
                  <div key={pi} className="grid items-center gap-2 border-t border-slate-100 px-4 py-2.5"
                    style={{ gridTemplateColumns: "1fr auto auto auto" }}>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-black text-slate-800">
                        {p.company || "보험사 미입력"} · {p.productName || "상품명 미입력"}
                      </p>
                    </div>
                    {p.paymentYears ? (
                      <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                        {p.paymentYears}년납
                      </span>
                    ) : <span />}
                    {p.coverageYears ? (
                      <span className="shrink-0 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-600">
                        ~{p.coverageYears}
                      </span>
                    ) : <span />}
                    <span className="shrink-0 text-[11px] font-black text-[#1A2744]">{formatPremium(p)}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* 하단: 합산 + 설계사 */}
        <div className="grid grid-cols-2 gap-4 px-8 pb-7">
          <div className="rounded-2xl bg-[#0F172A] px-6 py-4 text-white">
            <p className="text-[10px] font-black tracking-[0.15em] text-white/40 uppercase">월 합산 보험료</p>
            <p className="mt-1.5 text-[28px] font-black text-[#C9A96E]">
              {totalMonthly > 0 ? formatKrw(totalMonthly) : "미입력"}
            </p>
            <p className="mt-1 text-[10px] font-bold text-white/40">{sections.length}개 보장 영역 합산</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4">
            <p className="text-[10px] font-black tracking-[0.1em] text-slate-400">담당 설계사</p>
            <p className="mt-1.5 text-lg font-black text-slate-950">{consultant.name || "설계사명"}</p>
            <p className="text-sm font-bold text-slate-500">{consultant.phone || "연락처"}</p>
            <p className="mt-2 text-[10px] font-bold leading-[1.6] text-slate-400">
              본 제안서는 상담 자료로 제공되며, 최종 보험료와 보장 내용은 청약 시 약관 기준을 따릅니다.
            </p>
          </div>
        </div>

        <PageNum num={1} />
      </div>
    </ReportPage>
  )
}

// ── 번들 제안서 출력 ──────────────────────────────────────────────────────
function ProposalBundle({
  sections,
  focus,
  customerName,
  consultant,
}: {
  sections: CategorySection[]
  focus: CompareFocus
  customerName: string
  consultant: ConsultantInfo
}) {
  const sectionsWithOffsets = sections.reduce<{
    section: CategorySection
    template: CategoryTemplate
    pageOffset: number
    pageCount: number
  }[]>((acc, section) => {
    const template = categories.find((c) => c.id === section.templateId)
    if (!template) return acc
    const previous = acc.at(-1)
    const pageOffset = previous ? previous.pageOffset + previous.pageCount : 1
    const pageCount = CATEGORY_SCENARIOS[template.id]?.page5 ? 5 : 4
    return [...acc, { section, template, pageOffset, pageCount }]
  }, [])

  return (
    <div className="proposal-print-area">
      <BundleCoverPage sections={sections} customerName={customerName} consultant={consultant} />
      {sectionsWithOffsets.map(({ section, template, pageOffset }) => (
        <ProposalReport
          key={section.templateId}
          template={template}
          mode={section.plans.length > 1 ? "compare" : "single"}
          plans={section.plans}
          focus={focus}
          customerName={customerName}
          consultant={consultant}
          pageOffset={pageOffset}
        />
      ))}
    </div>
  )
}

function buildRecommendation(template: CategoryTemplate, mode: ProposalMode, plans: PlanData[], focus: CompareFocus | CompareFocus[]) {
  if (template.id === "shortlife" && plans[0]) {
    const d = shortLifeDerived(plans[0])
    return {
      title: `총납입 ${wonMan(d.totalPaid)}, 예상 환급률 ${d.refundRate.toFixed(1)}%`,
      body: `월 ${formatKrw(d.monthly)}씩 ${d.years}년 납입하는 구조입니다. ${d.horizonYears}년 후 환급금은 약 ${wonMan(d.refund)}으로 계산되며, 월 적금 3%는 월적립식 체감금리와 이자소득세 15.4%를 반영해 비교합니다.`,
    }
  }
  if (template.id === "annuity" && plans[0]) {
    const d = annuityDerived(plans[0])
    return {
      title: `${d.currentAge}세 가입, ${d.paymentEndAge}세 납입종료, ${d.annuityStartAge}세 연금개시`,
      body: `${d.annuityType} 기준으로 총 납입예정액은 약 ${wonMan(d.totalPaid)}입니다. 입력된 환급률은 ${d.rate.toFixed(1)}%, 연금개시 시점 예상 재원은 약 ${wonMan(d.refund)}이며, 목적은 ${d.purpose}로 요약됩니다. 변액 여부와 중도해지 손실 가능성은 반드시 별도 설명합니다.`,
    }
  }
  if (mode === "single") {
    return {
      title: `${template.label} 핵심 담보를 고객용으로 압축했습니다`,
      body: "긴 PDF 제안서에서 고객이 바로 이해해야 하는 보험료, 핵심 담보, 주의사항을 중심으로 요약합니다. 세부 약관은 실제 상품설명서와 함께 확인합니다.",
    }
  }
  const lowest = bestPremium(plans)
  const primaryFocus = Array.isArray(focus) ? focus[0] : focus
  const focusLabel = focusOptions.find((item) => item.id === primaryFocus)?.label || "균형형"
  return {
    title: `${focusLabel} 기준으로 ${plans.length}개 보험사를 비교합니다`,
    body: lowest
      ? `월 보험료는 ${lowest.company || "일부 제안"}이 가장 낮습니다. 다만 최종 추천은 보험료, 핵심 담보금액, 보장범위, 갱신 여부를 함께 확인한 뒤 결정하는 구조입니다.`
      : "비교할 보험사별 보험료와 핵심 담보를 입력하면 장단점과 추천 방향이 자동 정리됩니다.",
  }
}

function GptsImportPanel({
  onApply,
}: {
  onApply: (payload: GptsProposalPayload) => void
}) {
  const [open, setOpen] = useState(false)
  const [jsonText, setJsonText] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const apply = () => {
    setError("")
    setDone(false)
    try {
      const parsed = parseProposalGptsJson(jsonText)
      onApply(parsed)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON을 읽지 못했습니다.")
    }
  }

  return (
    <section className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-white to-cyan-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">GPTs 제안서 자동 입력</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">PDF 분석 결과를 제안서 입력폼에 바로 반영</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            GPTs에서 PDF를 분석한 뒤 생성된 JSON을 붙여넣으면 상품명, 보험료, 담보금액이 자동으로 채워집니다.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={PROPOSAL_GPTS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#102a4c] px-4 py-2 text-sm font-black text-white hover:bg-[#2D4A8A]"
          >
            <ExternalLink className="h-4 w-4" />
            GPTs 열기
          </a>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-2 text-sm font-black text-cyan-700 hover:border-cyan-400"
          >
            <FileText className="h-4 w-4" />
            JSON 붙여넣기
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <textarea
            value={jsonText}
            onChange={(event) => {
              setJsonText(event.target.value)
              setError("")
              setDone(false)
            }}
            placeholder={'GPTs가 출력한 JSON을 여기에 붙여넣으세요.\n\n{\n  "version": "proposal_gpts_v1",\n  "mode": "compare",\n  "categoryId": "driver",\n  "plans": []\n}'}
            className="min-h-[220px] w-full resize-y rounded-2xl border border-cyan-100 bg-white p-4 font-mono text-xs font-bold text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-400">
              코드블록까지 함께 복사되어도 JSON 부분만 읽습니다. 적용 후 필요한 항목만 화면에서 수정하면 됩니다.
            </p>
            <button
              type="button"
              onClick={apply}
              className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-700"
            >
              JSON 적용
            </button>
          </div>
          {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-600">{error}</div>}
          {done && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">JSON이 입력폼에 반영되었습니다.</div>}
        </div>
      )}
    </section>
  )
}

export default function ProposalPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [lockedReason, setLockedReason] = useState("이용 권한이 없습니다.")
  const [mode, setMode] = useState<ProposalMode>("single")
  const [template, setTemplate] = useState<CategoryTemplate>(categories[1])
  const [plans, setPlans] = useState<PlanData[]>(() => normalizePlans(categories[1], 2))
  const [focus, setFocus] = useState<CompareFocus[]>(["balance"])
  const [customerName, setCustomerName] = useState("")
  const [consultant, setConsultant] = useState<ConsultantInfo>({ name: "", phone: "" })
  const [showPreview, setShowPreview] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "loaded" | "empty">("idle")
  const [currentUserId, setCurrentUserId] = useState("")
  const [savedDrafts, setSavedDrafts] = useState<StoredProposalDraft[]>([])
  const [showDraftMenu, setShowDraftMenu] = useState(false)
  const [bundleIds, setBundleIds] = useState<CategoryId[]>(["health", "driver"])
  const [bundlePlans, setBundlePlans] = useState<Record<CategoryId, PlanData[]>>(() => {
    const init = {} as Record<CategoryId, PlanData[]>
    categories.forEach((c) => { init[c.id] = [emptyPlan(c, 0)] })
    return init
  })

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
      setCurrentUserId(session.user.id)
      setConsultant((prev) => prev.name || prev.phone ? prev : { name: profile?.name || "", phone: profile?.phone || "" })
    }
    checkAccess()
    return () => { alive = false }
  }, [router])

  const visiblePlans = useMemo(() => mode === "single" ? plans.slice(0, 1) : plans, [mode, plans])
  const primaryFocus = focus[0] ?? "balance"
  const draftStorageKey = (userId = currentUserId) => `${PROPOSAL_DRAFTS_KEY_PREFIX}_${userId || "guest"}`

  const readDrafts = (userId = currentUserId): StoredProposalDraft[] => {
    if (typeof window === "undefined") return []
    try {
      const parsed = JSON.parse(window.localStorage.getItem(draftStorageKey(userId)) || "[]")
      return Array.isArray(parsed) ? parsed.slice(0, MAX_PROPOSAL_DRAFTS) : []
    } catch {
      return []
    }
  }

  const writeDrafts = (drafts: StoredProposalDraft[], userId = currentUserId) => {
    if (typeof window === "undefined") return
    const next = drafts.slice(0, MAX_PROPOSAL_DRAFTS)
    window.localStorage.setItem(draftStorageKey(userId), JSON.stringify(next))
    setSavedDrafts(next)
  }

  const draftTitle = (draft: ProposalDraft) => {
    const category = categories.find((item) => item.id === draft.templateId)?.label || "제안서"
    const name = draft.customerName?.trim() || "고객명 없음"
    const date = new Date(draft.savedAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    return `${name} · ${category} · ${date}`
  }

  const buildDraft = (): ProposalDraft => ({
    savedAt: new Date().toISOString(),
    mode,
    templateId: template.id,
    plans,
    focus,
    customerName,
    consultant,
    bundleIds,
    bundlePlans,
  })

  const applyDraft = (draft: ProposalDraft) => {
    const nextTemplate = categories.find((category) => category.id === draft.templateId) || categories[1]
    setMode(draft.mode || "single")
    setTemplate(nextTemplate)
    setPlans(draft.plans?.length ? draft.plans : normalizePlans(nextTemplate, 2))
    setFocus(draft.focus?.length ? draft.focus : ["balance"])
    setCustomerName(draft.customerName || "")
    setConsultant((prev) => ({
      name: draft.consultant?.name || prev.name || "",
      phone: draft.consultant?.phone || prev.phone || "",
    }))
    setBundleIds(draft.bundleIds?.length ? draft.bundleIds : ["health", "driver"])
    setBundlePlans({ ...Object.fromEntries(categories.map((c) => [c.id, [emptyPlan(c, 0)]])), ...(draft.bundlePlans || {}) } as Record<CategoryId, PlanData[]>)
  }

  const saveDraft = () => {
    if (typeof window === "undefined") return
    const draft = buildDraft()
    const stored: StoredProposalDraft = {
      ...draft,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: draftTitle(draft),
      userId: currentUserId || "guest",
    }
    const next = [stored, ...readDrafts().filter((item) => item.id !== stored.id)].slice(0, MAX_PROPOSAL_DRAFTS)
    writeDrafts(next)
    window.localStorage.setItem(PROPOSAL_DRAFT_KEY, JSON.stringify(stored))
    setSaveStatus("saved")
    window.setTimeout(() => setSaveStatus("idle"), 1800)
  }

  const loadDraftItem = (draft: ProposalDraft | null, openPreview = false) => {
    if (!draft) {
      setSaveStatus("empty")
      window.setTimeout(() => setSaveStatus("idle"), 1800)
      return false
    }
    try {
      applyDraft(draft)
      setSaveStatus("loaded")
      setShowDraftMenu(false)
      if (openPreview) setShowPreview(true)
      window.setTimeout(() => setSaveStatus("idle"), 1800)
      return true
    } catch {
      setSaveStatus("empty")
      window.setTimeout(() => setSaveStatus("idle"), 1800)
      return false
    }
  }

  const loadDraft = (openPreview = false) => {
    const latest = readDrafts()[0]
    if (latest) return loadDraftItem(latest, openPreview)
    if (typeof window === "undefined") return loadDraftItem(null, openPreview)
    try {
      const legacy = window.localStorage.getItem(PROPOSAL_DRAFT_KEY)
      return loadDraftItem(legacy ? JSON.parse(legacy) as ProposalDraft : null, openPreview)
    } catch {
      return loadDraftItem(null, openPreview)
    }
  }

  const openPreviewTab = () => {
    saveDraft()
    const url = new URL("/insurance-tools/proposal", window.location.origin)
    url.searchParams.set("preview", "latest")
    const previewWindow = window.open(url.toString(), "_blank")
    if (!previewWindow) setShowPreview(true)
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!currentUserId) return
    setSavedDrafts(readDrafts(currentUserId))
    const params = new URLSearchParams(window.location.search)
    if (params.get("preview") === "latest") loadDraft(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  const selectCategory = (next: CategoryTemplate) => {
    setTemplate(next)
    setPlans(normalizePlans(next, Math.max(2, mode === "single" ? 2 : plans.length)))
    if (next.id === "shortlife") setFocus(["refund"])
  }

  const selectMode = (next: ProposalMode) => {
    setMode(next)
    if ((next === "compare" || next === "cross") && plans.length < 2) {
      setPlans(normalizePlans(template, 2))
    }
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

  const applyGptsPayload = (payload: GptsProposalPayload) => {
    const nextCategoryId = normalizeCategoryId(payload.categoryId || payload.category_id) || template.id
    const nextTemplate = categories.find((category) => category.id === nextCategoryId) || template
    const rawPlans = Array.isArray(payload.plans) ? payload.plans : []
    const nextCustomerName = asText(payload.customerName || payload.customer_name)
    if (nextCustomerName) setCustomerName(nextCustomerName)

    // ── 다중 카테고리 감지: 서로 다른 카테고리면 bundle 자동 분리 ──────────
    if (rawPlans.length > 1) {
      const planMetrics = rawPlans.map((p) =>
        Object.fromEntries(Object.entries(p.metrics || {}).map(([k, v]) => [k, String(v ?? "")]))
      )
      const planCatIds = planMetrics.map(detectCategoryFromMetrics)
      const uniqueCats = [...new Set(planCatIds)]

      if (uniqueCats.length > 1) {
        // 카테고리가 2개 이상 → bundle 모드로 자동 전환, 각 플랜을 해당 카테고리에 배치
        const newBundlePlans: Record<CategoryId, PlanData[]> = { ...Object.fromEntries(
          categories.map((c) => [c.id, [emptyPlan(c, 0)]])
        ) } as Record<CategoryId, PlanData[]>
        const newBundleIds: CategoryId[] = []

        rawPlans.forEach((rawPlan, idx) => {
          const catId = planCatIds[idx]
          const cat = categories.find((c) => c.id === catId) || nextTemplate
          const importedPlan = gptsPlanToPlanData(rawPlan, cat, 0, payload.summary)
          if (!newBundleIds.includes(catId)) {
            newBundleIds.push(catId)
            newBundlePlans[catId] = [importedPlan]
          } else {
            newBundlePlans[catId] = [...newBundlePlans[catId], importedPlan]
          }
        })

        setBundleIds(newBundleIds)
        setBundlePlans(newBundlePlans)
        setMode("bundle")
        setSaveStatus("loaded")
        return
      }
    }

    // ── 단일 카테고리 처리 ────────────────────────────────────────────────
    const nextMode = normalizeProposalMode(payload.mode, rawPlans.length)
    const importedPlans = rawPlans.map((plan, index) => gptsPlanToPlanData(plan, nextTemplate, index, payload.summary))
    const minCount = nextMode === "single" ? 1 : 2
    const nextPlans = importedPlans.length >= minCount
      ? importedPlans
      : [...importedPlans, ...normalizePlans(nextTemplate, minCount - importedPlans.length)]

    // 통합제안(bundle) 모드에서는 해당 카테고리의 bundlePlans만 업데이트, 모드 유지
    if (mode === "bundle") {
      const catId = nextCategoryId as CategoryId
      if (!bundleIds.includes(catId)) {
        setBundleIds((prev) => [...prev, catId])
      }
      setBundlePlans((prev) => ({ ...prev, [catId]: nextPlans }))
      setSaveStatus("loaded")
      return
    }

    setTemplate(nextTemplate)
    setMode(nextMode)
    setFocus(normalizeFocus(payload.focus))
    setPlans(nextPlans)
    setSaveStatus("loaded")
  }

  useEffect(() => {
    if (checking || !allowed || typeof window === "undefined") return
    const raw = window.localStorage.getItem(PROPOSAL_IMPORT_KEY)
    if (!raw) return
    try {
      const payload = JSON.parse(raw) as GptsProposalPayload
      applyGptsPayload(payload)
      window.localStorage.removeItem(PROPOSAL_IMPORT_KEY)
    } catch {
      window.localStorage.removeItem(PROPOSAL_IMPORT_KEY)
    }
  }, [checking, allowed])

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
          html, body { width: 297mm !important; margin: 0 !important; background: white !important; overflow: visible !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          main { display: block !important; background: white !important; padding: 0 !important; min-height: 0 !important; overflow: visible !important; }
          .no-print { display: none !important; }
          /* 미리보기 오버레이 밖 본문(PlanEditor 영역) 숨김 */
          body > *:not(.preview-shell) { visibility: hidden !important; }
          .preview-shell, .preview-shell * { visibility: visible !important; }
          .print-only { display: block !important; }
          .preview-shell { position: static !important; inset: auto !important; display: block !important; width: 297mm !important; overflow: visible !important; background: white !important; padding: 0 !important; }
          .proposal-print-area { display: block !important; width: 297mm !important; background: white !important; }
          .proposal-page { width: 297mm !important; height: 210mm !important; box-shadow: none !important; margin: 0 !important; overflow: hidden !important; break-after: page; page-break-after: always; }
          .proposal-page:last-child { break-after: avoid; page-break-after: avoid; }
        }
        @media screen {
          .proposal-page { position: relative; margin: 0 auto 24px; }
          .print-only { display: none !important; }
        }
      `}</style>

      <main className="min-h-screen bg-[#eef3f8] text-slate-950">
        <div className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-6 py-4 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Proposal Builder</p>
              <h1 className="mt-1 text-2xl font-black text-[#102a4c]">제안서 생성</h1>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus !== "idle" && (
                <span className={`rounded-full px-3 py-1 text-xs font-black ${saveStatus === "saved" ? "bg-emerald-100 text-emerald-700" : saveStatus === "loaded" ? "bg-cyan-100 text-cyan-700" : "bg-amber-100 text-amber-700"}`}>
                  {saveStatus === "saved" ? "저장됨" : saveStatus === "loaded" ? "불러옴" : "저장 없음"}
                </span>
              )}
              <button
                type="button"
                onClick={saveDraft}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-cyan-300 hover:text-cyan-700"
              >
                <Save className="h-4 w-4" />
                저장
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const drafts = readDrafts()
                    setSavedDrafts(drafts)
                    if (drafts.length === 0) loadDraft(false)
                    else setShowDraftMenu((prev) => !prev)
                  }}                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <FolderOpen className="h-4 w-4" />
                  불러오기
                </button>
                {showDraftMenu && savedDrafts.length > 0 && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-2.5">
                      <p className="text-xs font-black text-slate-500">저장된 제안서</p>
                    </div>
                    <ul className="max-h-64 overflow-y-auto">
                      {savedDrafts.map((draft) => (
                        <li key={draft.id}>
                          <button
                            type="button"
                            onClick={() => loadDraftItem(draft)}
                            className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            {draft.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-slate-100 px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setShowDraftMenu(false)}
                        className="text-xs font-black text-slate-400 hover:text-slate-600"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={openPreviewTab}
                className="inline-flex items-center gap-2 rounded-xl bg-[#102a4c] px-4 py-2 text-sm font-black text-white hover:bg-[#1a3a6e]"
              >
                <Download className="h-4 w-4" />
                미리보기 · 출력
              </button>
            </div>
          </div>
        </div>

        {/* ── 메인 콘텐츠 ── */}
        <div className="mx-auto max-w-[1440px] space-y-6 px-6 py-8">

          {/* 고객 · 설계사 정보 */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-black text-slate-950">고객 · 설계사 정보</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Input
                label="고객 이름"
                value={customerName}
                onChange={setCustomerName}
                placeholder="홍길동"
              />
              <Input
                label="설계사 이름"
                value={consultant.name}
                onChange={(value) => setConsultant((prev) => ({ ...prev, name: value }))}
                placeholder="이름"
              />
              <Input
                label="설계사 연락처"
                value={consultant.phone}
                onChange={(value) => setConsultant((prev) => ({ ...prev, phone: value }))}
                placeholder="010-0000-0000"
              />
            </div>
          </section>

          {/* 카테고리 · 모드 · 포커스 */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-black text-slate-950">제안서 설정</h2>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-black text-slate-500">보험 종류</p>
                <CategorySelector selected={template} onSelect={selectCategory} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-black text-slate-500">제안 방식</p>
                  <ModeSelector mode={mode} onMode={selectMode} />
                </div>
                {mode !== "single" && mode !== "bundle" && (
                  <div>
                    <p className="mb-2 text-xs font-black text-slate-500">비교 포커스</p>
                    <FocusSelector focus={focus} onFocus={setFocus} disabled={template.id === "shortlife"} />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 번들 모드: 카테고리별 단일 플랜 */}
          {mode === "bundle" ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setBundleIds((prev) =>
                      prev.includes(cat.id) ? prev.filter((item) => item !== cat.id) : [...prev, cat.id]
                    )}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black transition-colors ${
                      bundleIds.includes(cat.id)
                        ? "border-[#102a4c] bg-[#102a4c] text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <cat.icon className="h-4 w-4" />
                    {cat.label}
                  </button>
                ))}
              </div>
              {bundleIds.map((id) => {
                const cat = categories.find((c) => c.id === id)
                if (!cat) return null
                const catPlans = bundlePlans[id] || [emptyPlan(cat, 0)]
                const catMode = catPlans.length > 1 ? "compare" : "single"
                return (
                  <div key={id} className="space-y-3">
                    {catPlans.map((plan, planIdx) => (
                      <PlanEditor
                        key={plan.id}
                        plan={plan}
                        index={planIdx}
                        template={cat}
                        mode={catMode}
                        onChange={(next) => setBundlePlans((prev) => {
                          const updated = [...(prev[id] || [])]
                          updated[planIdx] = next
                          return { ...prev, [id]: updated }
                        })}
                        onRemove={catPlans.length > 1 ? () => setBundlePlans((prev) => ({
                          ...prev,
                          [id]: prev[id].filter((_, i) => i !== planIdx),
                        })) : undefined}
                        canRemove={catPlans.length > 1}
                        onCustomerName={planIdx === 0 ? setCustomerName : undefined}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setBundlePlans((prev) => ({
                        ...prev,
                        [id]: [...(prev[id] || []), emptyPlan(cat, prev[id]?.length || 1)],
                      }))}
                      className="inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-4 text-sm font-black text-slate-500 hover:border-[#102a4c] hover:text-[#102a4c]"
                    >
                      <Plus className="h-5 w-5" />
                      {cat.label} 제안서 추가
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {visiblePlans.map((plan, index) => (
                <PlanEditor
                  key={plan.id}
                  plan={plan}
                  index={index}
                  template={template}
                  mode={mode}
                  onChange={(next) => updatePlan(plan.id, next)}
                  onRemove={() => removePlan(plan.id)}
                  canRemove={visiblePlans.length > (mode === "single" ? 1 : 2)}
                  onCustomerName={index === 0 ? setCustomerName : undefined}
                />
              ))}
              {(mode === "compare" || mode === "cross") && (
                <button
                  type="button"
                  onClick={addPlan}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-4 text-sm font-black text-slate-500 hover:border-[#102a4c] hover:text-[#102a4c]"
                >
                  <Plus className="h-5 w-5" />
                  플랜 추가
                </button>
              )}
            </div>
          )}

          {/* GPTs 자동 입력 */}
          <GptsImportPanel onApply={applyGptsPayload} />

          {/* 미리보기 오버레이 */}
          {showPreview && (
            <div className="preview-shell fixed inset-0 z-50 overflow-auto bg-white">
              <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
                <p className="text-sm font-black text-slate-700">미리보기</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#102a4c] px-4 py-2 text-sm font-black text-white"
                  >
                    <Download className="h-4 w-4" />
                    인쇄 · PDF 저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {mode === "bundle" ? (
                <ProposalBundle
                  sections={bundleIds
                    .map((id) => ({ templateId: id, plans: bundlePlans[id] || [] }))
                    .filter((s) =>
                      s.plans.length > 0 &&
                      s.plans.some((p) =>
                        p.company || p.productName || p.monthlyPremium ||
                        Object.values(p.metrics).some((v) => v && parseFloat(String(v)) > 0)
                      )
                    )}
                  focus={primaryFocus}
                  customerName={customerName}
                  consultant={consultant}
                />
              ) : (
                <ProposalReport
                  template={template}
                  mode={mode}
                  plans={visiblePlans}
                  focus={primaryFocus}
                  customerName={customerName}
                  consultant={consultant}
                />
              )}
            </div>
          )}

        </div>
      </main>
    </>
  )
}
