"use client"

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, ArrowLeft, Brain, FolderOpen, HeartPulse, Printer, Save, ShieldCheck, Sparkles, Stethoscope, UserRound, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { ensureUserProfile } from "../../lib/userProfile"
import { isApprovedUser, normalizeRole, canAccessFirstCoverageCheck, ROLE_PRIORITY } from "../../lib/roles"

type StepId = "intro" | "customer" | "cancer" | "brain" | "heart" | "surgery" | "care" | "result"

type FormState = {
  customerName: string
  age: number
  gender: "male" | "female"
  monthlyLivingCost: number
  cancerIndirectMonthlyCost: number
  hasActualLoss: boolean
  actualLossCoverageRate: number
  cancerDiagnosis: number
  similarCancer: number
  cancerCaseId: string
  cancerTreatment: number
  targetCancer: number
  radiationCancer: number
  brainScope: "hemorrhage" | "stroke" | "vascular"
  brainDiagnosis: number
  brainSurgery: number
  brainTreatment: number
  heartScope: "ami" | "ischemic" | "cardio"
  heartDiagnosis: number
  heartSurgery: number
  heartTreatment: number
  selectedSurgeryCases: string[]
  diseaseSurgery: number
  majorSurgery: number
  nsurgery: number
  careDailyCost: number
  cancerCareDays: number
  brainCareDays: number
  heartCareDays: number
  careBenefitDaily: number
}

type SavedCase = {
  id: string
  name: string
  savedAt: string
  form: FormState
}

const steps: { id: StepId; label: string; icon: any }[] = [
  { id: "intro", label: "시작", icon: Sparkles },
  { id: "customer", label: "고객 정보", icon: UserRound },
  { id: "cancer", label: "암", icon: ShieldCheck },
  { id: "brain", label: "뇌", icon: Brain },
  { id: "heart", label: "심장", icon: HeartPulse },
  { id: "surgery", label: "수술비", icon: Stethoscope },
  { id: "care", label: "간병비", icon: Activity },
  { id: "result", label: "결과", icon: Sparkles },
]

const initialForm: FormState = {
  customerName: "",
  age: 45,
  gender: "male",
  monthlyLivingCost: 300,
  cancerIndirectMonthlyCost: 50,
  hasActualLoss: true,
  actualLossCoverageRate: 70,
  cancerDiagnosis: 3000,
  similarCancer: 300,
  cancerCaseId: "prostate",
  cancerTreatment: 300,
  targetCancer: 0,
  radiationCancer: 0,
  brainScope: "stroke",
  brainDiagnosis: 1000,
  brainSurgery: 300,
  brainTreatment: 0,
  heartScope: "ischemic",
  heartDiagnosis: 1000,
  heartSurgery: 300,
  heartTreatment: 0,
  selectedSurgeryCases: ["cataract", "spine"],
  diseaseSurgery: 30,
  majorSurgery: 300,
  nsurgery: 0,
  careDailyCost: 15,
  cancerCareDays: 14,
  brainCareDays: 60,
  heartCareDays: 21,
  careBenefitDaily: 0,
}

const clampRate = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
const man = (value: number) => `${Math.max(0, Math.round(value)).toLocaleString("ko-KR")}만원`
const money = (value: number) => `${Math.round(Math.abs(value)).toLocaleString("ko-KR")}만원`
const balanceText = (gap: number) => gap > 0 ? `-${money(gap)}` : `+${money(gap)}`

function status(rate: number) {
  if (rate >= 70) return { label: "안정", color: "#0f8a5f", bg: "#e8f8f1", border: "#83d9b3" }
  if (rate >= 40) return { label: "보완 필요", color: "#b45309", bg: "#fff7e6", border: "#f5c76b" }
  return { label: "우선 점검", color: "#c2413b", bg: "#fff0ef", border: "#f5a8a3" }
}

function scopeScore(scope: FormState["brainScope"] | FormState["heartScope"]) {
  if (scope === "vascular" || scope === "cardio") return 100
  if (scope === "stroke" || scope === "ischemic") return 70
  return 35
}

// ─ 비용 단위: 만원 / 건강보험 본인부담 기준 (실손 보완 전)
// ─ 출처: HIRA 비급여 진료비 정보, 국민건강보험공단 2023 주요수술통계, 금감원 보험통계
// ─ actualLossFactor: 실손보험이 보완할 수 있는 비율 (0~1)
const SURGERY_CASES = [
  // ─── 근골격계 ───────────────────────────────────────────
  {
    id: "knee",
    name: "무릎 인공관절",
    costMin: 200, costMax: 350,
    coverageType: "급여 중심",
    actualLossFactor: 0.85,
    note: "슬관절 치환술 급여 본인부담 기준. 양측 동시 수술·상급병실·간병비는 별도.",
  },
  {
    id: "hip",
    name: "고관절 치환술",
    costMin: 250, costMax: 450,
    coverageType: "급여 중심",
    actualLossFactor: 0.82,
    note: "고관절 전치환술 급여 기준. 인공관절 재료 선택에 따라 비급여 추가 가능.",
  },
  {
    id: "knee-arthroscopy",
    name: "무릎 관절경/연골수술",
    costMin: 100, costMax: 300,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.70,
    note: "반월상연골·관절경 급여 기준. 치료재료·병원별 비급여 추가 확인 필요.",
  },
  {
    id: "knee-regeneration",
    name: "무릎 연골재생 (카티스템)",
    costMin: 700, costMax: 1200,
    coverageType: "비급여 중심",
    actualLossFactor: 0.25,
    note: "카티스템 등 연골재생 재료비 전액 비급여. 실손 약관과 가입 시기에 따라 보완 범위 크게 상이.",
  },
  {
    id: "shoulder",
    name: "어깨 회전근개",
    costMin: 54, costMax: 130,
    coverageType: "급여 중심",
    actualLossFactor: 0.88,
    note: "건강보험 수가 적용 대표 수술. 봉합 범위와 재료대에 따라 비급여 소액 추가 가능.",
  },
  {
    id: "spine",
    name: "허리 디스크/척추수술",
    costMin: 200, costMax: 600,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.55,
    note: "미세현미경·내시경은 급여. 레이저·고주파·내시경 비급여 방식 선택 시 비용 크게 증가.",
  },
  // ─── 눈 ────────────────────────────────────────────────
  {
    id: "cataract",
    name: "백내장 (단초점렌즈)",
    costMin: 60, costMax: 200,
    coverageType: "급여 중심",
    actualLossFactor: 0.80,
    note: "양안 기준. 단초점 렌즈는 건강보험 급여 적용. 병원에 따라 비용 차이 발생.",
  },
  {
    id: "cataract-multi",
    name: "백내장 (다초점렌즈)",
    costMin: 400, costMax: 1200,
    coverageType: "비급여 중심",
    actualLossFactor: 0.35,
    note: "양안 기준. 다초점·초점가변 렌즈는 전액 비급여. 4세대 이후 실손 보완 한도 급감.",
  },
  // ─── 소화기 ────────────────────────────────────────────
  {
    id: "appendix",
    name: "맹장 (충수절제술)",
    costMin: 30, costMax: 150,
    coverageType: "급여 중심",
    actualLossFactor: 0.90,
    note: "복강경 기준 급여 수술. 합병증·입원 연장·상급병실 시 추가 부담 발생.",
  },
  {
    id: "gallbladder",
    name: "담낭절제술 (담석증)",
    costMin: 150, costMax: 350,
    coverageType: "급여 중심",
    actualLossFactor: 0.85,
    note: "복강경 담낭절제 건강보험 급여 기준. 마취과·상급병실 비급여 추가 확인.",
  },
  {
    id: "hernia",
    name: "탈장 수술",
    costMin: 100, costMax: 300,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.68,
    note: "급여 기준 수술. 메시(mesh) 재료 선택·복강경 방식에 따라 비급여 추가 가능.",
  },
  // ─── 여성 ────────────────────────────────────────────
  {
    id: "uterine-myoma",
    name: "자궁근종 절제술",
    costMin: 200, costMax: 550,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.65,
    note: "복강경·자궁경 방식 급여. 로봇수술 선택 시 비급여 전환. 재발·재수술 가능성 확인.",
  },
  // ─── 갑상선/항문 ──────────────────────────────────────
  {
    id: "thyroid-surgery",
    name: "갑상선 절제술",
    costMin: 150, costMax: 450,
    coverageType: "급여 중심",
    actualLossFactor: 0.78,
    note: "개방·내시경 수술 급여 기준. 로봇수술 선택 시 아래 '로봇수술' 항목으로 별도 체크 필요. 악성 시 산정특례 적용 가능.",
  },
  {
    id: "hemorrhoid",
    name: "치질 수술",
    costMin: 50, costMax: 200,
    coverageType: "급여 중심",
    actualLossFactor: 0.75,
    note: "급여 기준 수술. 레이저·고주파 등 비급여 방식 선택 시 본인부담 증가.",
  },
  // ─── 심장혈관 ────────────────────────────────────────
  {
    id: "heart-stent",
    name: "심장 스텐트 시술",
    costMin: 50, costMax: 200,
    coverageType: "급여 중심",
    actualLossFactor: 0.90,
    note: "산정특례 5% 적용으로 본인부담 낮음. 총 진료비 1,400~5,000만원 규모. 스텐트 재료 선택 시 일부 비급여 추가.",
  },
  // ─── 로봇수술 ────────────────────────────────────────
  {
    id: "robot-surgery",
    name: "로봇수술 (다빈치)",
    costMin: 1000, costMax: 2500,
    coverageType: "비급여 중심",
    actualLossFactor: 0.20,
    note: "전립선·갑상선·자궁·대장·위 등 다빈치 로봇수술 기준. 수술비 전액 비급여로 기본 1,000만원~. 4세대 이후 실손 보완 한도 급감.",
  },
]

const CANCER_CASES = [
  {
    id: "prostate",
    group: "male",
    name: "전립선암",
    category: "general",
    treatment: 3200,
    outpatientSelfPay: 700,
    nonCovered: 900,
    note: "남성 대표암 기준입니다. 방사선, 호르몬치료, 로봇수술 여부에 따라 비급여와 장기 통원 부담이 달라질 수 있습니다.",
  },
  {
    id: "breast",
    group: "female",
    name: "유방암",
    category: "general",
    treatment: 3900,
    outpatientSelfPay: 900,
    nonCovered: 1200,
    note: "여성 대표암 기준입니다. 수술, 방사선, 항호르몬·표적치료, 재건·검사 관련 비급여 가능성을 확인합니다.",
  },
  {
    id: "thyroid",
    group: "female",
    name: "갑상선암",
    category: "similar",
    treatment: 1300,
    outpatientSelfPay: 300,
    nonCovered: 500,
    note: "유사·소액암으로 분류되는 경우가 많아 진단비가 작게 준비되어 있을 수 있습니다. 치료비는 낮아도 추적검사와 약 복용이 길어질 수 있습니다.",
  },
  {
    id: "stomach",
    group: "common",
    name: "위암",
    category: "general",
    treatment: 3600,
    outpatientSelfPay: 700,
    nonCovered: 900,
    note: "공통 주요암 기준입니다. 수술, 항암, 추적검사와 회복 기간 식사·영양 관리 비용을 함께 봅니다.",
  },
  {
    id: "liver",
    group: "common",
    name: "간암",
    category: "general",
    treatment: 4800,
    outpatientSelfPay: 900,
    nonCovered: 1200,
    note: "공통 주요암 기준입니다. 고주파·색전술·항암, 재발 관리와 장기 추적 비용을 확인합니다.",
  },
  {
    id: "lung",
    group: "common",
    name: "폐암",
    category: "general",
    treatment: 4600,
    outpatientSelfPay: 1000,
    nonCovered: 1600,
    note: "공통 주요암 기준입니다. 표적항암·면역항암, 유전자검사, 통원 항암치료 공백을 함께 확인합니다.",
  },
  {
    id: "pancreas",
    group: "common",
    name: "췌장암",
    category: "general",
    treatment: 5000,
    outpatientSelfPay: 1100,
    nonCovered: 1700,
    note: "공통 주요암 기준입니다. 치료 기간과 항암 부담이 커질 수 있어 진단비와 치료비 공백을 강하게 확인합니다.",
  },
  {
    id: "colon",
    group: "common",
    name: "대장암",
    category: "general",
    treatment: 3800,
    outpatientSelfPay: 800,
    nonCovered: 1100,
    note: "공통 주요암 기준입니다. 수술, 항암, 장루·영양 관리, 통원 치료 부담을 함께 확인합니다.",
  },
]

function averageCost(item: typeof SURGERY_CASES[number]) {
  return Math.round((item.costMin + item.costMax) / 2)
}

function surgeryActualLossAmount(form: FormState, item: typeof SURGERY_CASES[number]) {
  if (!form.hasActualLoss) return 0
  return Math.round(averageCost(item) * (form.actualLossCoverageRate / 100) * item.actualLossFactor)
}

function genderCancerCases(gender: FormState["gender"]) {
  return CANCER_CASES.filter((item) => item.group === gender || item.group === "common")
}

function selectedCancerCase(form: FormState) {
  const cases = genderCancerCases(form.gender)
  return cases.find((item) => item.id === form.cancerCaseId) || cases[0] || CANCER_CASES[0]
}

function cancerBaseBenefit(form: FormState, cancerCase: typeof CANCER_CASES[number]) {
  return cancerCase.category === "similar" ? form.similarCancer : form.cancerDiagnosis
}

export default function FirstCoverageCheckPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [lockedReason, setLockedReason] = useState("")
  const [profileId, setProfileId] = useState("")
  const [active, setActive] = useState<StepId>("intro")
  const [form, setForm] = useState<FormState>(initialForm)
  const [savedCases, setSavedCases] = useState<SavedCase[]>([])
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    let alive = true
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace("/login?redirectTo=/first-coverage-check")
        return
      }

      let { data: profile } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle()
      if (!profile) profile = await ensureUserProfile(supabase, session.user)

      const role = normalizeRole(profile)
      const approved = isApprovedUser(profile)
      const isAgentOrAbove = ROLE_PRIORITY[role] >= ROLE_PRIORITY["agent"]
      const hasOfficeAccess = approved && profile?.office_access === true || profile?.office_access === 1 || profile?.office_access === "true" || profile?.office_access === "1"
      const canUse = canAccessFirstCoverageCheck(profile)

      // 접근 불가 사유 결정
      let reason = "이용 권한이 없습니다."
      if (!approved) {
        reason = "관리자 승인 후 사용할 수 있습니다."
      } else if (!isAgentOrAbove) {
        reason = "설계사 등급 이상만 이용할 수 있습니다."
      } else if (!hasOfficeAccess) {
        reason = "사무실 업무 권한이 없습니다.\n관리자에게 사무실 업무 권한 부여를 요청해 주세요."
      }

      if (!alive) return
      setProfileId(profile?.id || session.user.id)
      setAllowed(canUse)
      setLockedReason(reason)
      setChecking(false)
    }
    checkAccess()
    return () => { alive = false }
  }, [router])

  const result = useMemo(() => {
    const livingNeed = form.monthlyLivingCost * 12
    const cancerCase = selectedCancerCase(form)
    const cancerDirectTreatmentNeed = cancerCase.treatment
    const cancerOutpatientSelfPayNeed = cancerCase.outpatientSelfPay
    const cancerNonCoveredNeed = cancerCase.nonCovered
    const cancerTreatmentNeed = cancerDirectTreatmentNeed + cancerOutpatientSelfPayNeed + cancerNonCoveredNeed
    const cancerCareNeed = form.careDailyCost * form.cancerCareDays
    const cancerIndirectNeed = form.cancerIndirectMonthlyCost * 12
    const cancerDiagnosisBenefit = cancerBaseBenefit(form, cancerCase)
    const cancerDiagnosisAfterLiving = Math.max(0, cancerDiagnosisBenefit - livingNeed)
    const cancerLivingShortage = Math.max(0, livingNeed - cancerDiagnosisBenefit)
    const cancerTreatmentBenefits = form.cancerTreatment + form.targetCancer + form.radiationCancer
    const cancerActualLoss = form.hasActualLoss ? cancerDirectTreatmentNeed * (form.actualLossCoverageRate / 100) * 0.55 : 0
    const cancerReady = Math.round(cancerDiagnosisAfterLiving + cancerTreatmentBenefits + cancerActualLoss)
    const cancerNeed = livingNeed + cancerTreatmentNeed + cancerCareNeed + cancerIndirectNeed

    const brainLivingNeed = form.monthlyLivingCost * 6
    const brainTreatmentNeed = 4500
    const brainCareNeed = form.careDailyCost * form.brainCareDays
    const brainNeed = brainLivingNeed + brainTreatmentNeed + brainCareNeed
    const brainScope = scopeScore(form.brainScope)
    const brainReady = form.brainDiagnosis + form.brainSurgery + form.brainTreatment + (form.hasActualLoss ? 800 : 0)
    const brainRate = clampRate(((brainReady / brainNeed) * 75) + (brainScope * 0.25))

    const heartLivingNeed = form.monthlyLivingCost * 6
    const heartTreatmentNeed = 3800
    const heartCareNeed = form.careDailyCost * form.heartCareDays
    const heartNeed = heartLivingNeed + heartTreatmentNeed + heartCareNeed
    const heartScope = scopeScore(form.heartScope)
    const heartReady = form.heartDiagnosis + form.heartSurgery + form.heartTreatment + (form.hasActualLoss ? 700 : 0)
    const heartRate = clampRate(((heartReady / heartNeed) * 75) + (heartScope * 0.25))

    const checkedSurgeryCases = SURGERY_CASES.filter((item) => form.selectedSurgeryCases.includes(item.id))
    const surgeryCases = checkedSurgeryCases.length ? checkedSurgeryCases : []
    const surgeryNeed = surgeryCases.reduce((sum, item) => sum + averageCost(item), 0)
    const surgeryFixedCoveragePerCase = form.diseaseSurgery + form.majorSurgery + form.nsurgery
    const surgeryBaseCoverage = surgeryFixedCoveragePerCase * surgeryCases.length
    const surgeryActualLoss = surgeryCases.reduce((sum, item) => sum + surgeryActualLossAmount(form, item), 0)
    const surgeryReady = surgeryBaseCoverage + surgeryActualLoss

    const careNeed = form.careDailyCost * Math.max(form.cancerCareDays, form.brainCareDays, form.heartCareDays)
    const careReady = form.careBenefitDaily * Math.max(form.cancerCareDays, form.brainCareDays, form.heartCareDays)

    return {
      cancer: {
        title: "암",
        need: cancerNeed,
        ready: cancerReady,
        rate: clampRate((cancerReady / cancerNeed) * 100),
        gap: cancerNeed - cancerReady,
        note: `${cancerCase.name} 기준입니다. ${cancerCase.category === "similar" ? "유사·소액암 진단비" : "일반암 진단비"}는 먼저 1년 생활비 ${man(livingNeed)}에 배정합니다. 생활비 부족은 ${balanceText(cancerLivingShortage)}이고, 남는 진단비 ${man(cancerDiagnosisAfterLiving)}만 치료비 준비금으로 봅니다.`,
      },
      brain: {
        title: "뇌",
        need: brainNeed,
        ready: brainReady,
        rate: brainRate,
        gap: brainNeed - brainReady,
        note: form.brainScope === "hemorrhage"
          ? "뇌출혈 중심 보장은 범위가 좁아 뇌졸중·뇌혈관 치료 공백을 확인해야 합니다. 재활, 통원, 교통비, 식대, 의료용품 등 직접치료 외 비용도 함께 봅니다."
          : "스텐트, 혈전용해, 개두술 등 실제 치료와 수술비 지급 범위를 확인합니다. 재활, 통원, 교통비, 식대, 의료용품 등 직접치료 외 비용도 함께 봅니다.",
      },
      heart: {
        title: "심장",
        need: heartNeed,
        ready: heartReady,
        rate: heartRate,
        gap: heartNeed - heartReady,
        note: form.heartScope === "ami"
          ? "급성심근경색 중심 보장은 허혈성·심혈관 시술 공백이 생길 수 있습니다. 통원, 교통비, 식대, 의료용품 등 직접치료 외 비용도 함께 봅니다."
          : "스텐트, 관상동맥우회술, 부정맥 시술에서 지급되는 보장을 확인합니다. 통원, 교통비, 식대, 의료용품 등 직접치료 외 비용도 함께 봅니다.",
      },
      surgery: {
        title: "수술비",
        need: surgeryNeed,
        ready: surgeryReady,
        rate: clampRate((surgeryReady / (surgeryNeed || 1)) * 100),
        gap: surgeryNeed - surgeryReady,
        note: surgeryCases.length
          ? `체크한 ${surgeryCases.length}개 수술 항목 합산 기준입니다. 수술비 정액 보장과 실손 예상 보완액을 더해 부족 가능 금액을 계산합니다.`
          : "확인할 수술 항목을 체크하면 예상 비용과 현재 준비 금액을 합산해 부족 가능 금액을 계산합니다.",
      },
      care: {
        title: "간병비",
        need: careNeed,
        ready: careReady,
        rate: clampRate((careReady / (careNeed || 1)) * 100),
        gap: careNeed - careReady,
        note: "암·뇌·심장 수술 후 회복 기간에는 치료비와 별도로 간병 단가와 기간 부담을 확인해야 합니다.",
      },
    }
  }, [form])

  const resultList = Object.values(result)
  const currentCancerCase = selectedCancerCase(form)
  const currentCancerCases = genderCancerCases(form.gender)
  const cancerLivingNeed = form.monthlyLivingCost * 12
  const cancerDiagnosisBenefit = cancerBaseBenefit(form, currentCancerCase)
  const cancerBenefitLabel = currentCancerCase.category === "similar" ? "유사·소액암 진단비" : "일반암 진단비"
  const cancerDiagnosisAfterLiving = Math.max(0, cancerDiagnosisBenefit - cancerLivingNeed)
  const cancerLivingShortage = Math.max(0, cancerLivingNeed - cancerDiagnosisBenefit)
  const cancerDirectTreatmentNeed = currentCancerCase.treatment
  const cancerOutpatientSelfPayNeed = currentCancerCase.outpatientSelfPay
  const cancerNonCoveredNeed = currentCancerCase.nonCovered
  const cancerTreatmentNeedTotal = cancerDirectTreatmentNeed + cancerOutpatientSelfPayNeed + cancerNonCoveredNeed
  const cancerActualLossExpected = form.hasActualLoss ? Math.round(cancerDirectTreatmentNeed * (form.actualLossCoverageRate / 100) * 0.55) : 0
  const cancerTreatmentReady = cancerDiagnosisAfterLiving + form.cancerTreatment + form.targetCancer + form.radiationCancer + cancerActualLossExpected
  const cancerTreatmentGap = cancerTreatmentNeedTotal - cancerTreatmentReady
  const selectedSurgeryCases = SURGERY_CASES.filter((item) => form.selectedSurgeryCases.includes(item.id))
  const surgeryFixedCoveragePerCase = form.diseaseSurgery + form.majorSurgery + form.nsurgery
  const surgeryNeedTotal = selectedSurgeryCases.reduce((sum, item) => sum + averageCost(item), 0)
  const surgeryFixedCoverageTotal = surgeryFixedCoveragePerCase * selectedSurgeryCases.length
  const surgeryActualLossTotal = selectedSurgeryCases.reduce((sum, item) => sum + surgeryActualLossAmount(form, item), 0)
  const surgeryReadyTotal = surgeryFixedCoverageTotal + surgeryActualLossTotal
  const surgeryGapTotal = surgeryNeedTotal - surgeryReadyTotal
  const averageRate = clampRate(resultList.reduce((sum, item) => sum + item.rate, 0) / resultList.length)
  const currentIndex = steps.findIndex((step) => step.id === active)
  const next = () => setActive(steps[Math.min(currentIndex + 1, steps.length - 1)].id)
  const prev = () => setActive(steps[Math.max(currentIndex - 1, 0)].id)
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))
  const storageKey = `first-coverage-check:${profileId || "local"}`

  useEffect(() => {
    if (!profileId) return
    try {
      const raw = localStorage.getItem(storageKey)
      setSavedCases(raw ? JSON.parse(raw) : [])
    } catch {
      setSavedCases([])
    }
  }, [profileId, storageKey])

  const persistCases = (items: SavedCase[]) => {
    setSavedCases(items)
    localStorage.setItem(storageKey, JSON.stringify(items))
  }

  const saveCase = () => {
    const saved: SavedCase = {
      id: `${Date.now()}`,
      name: form.customerName || "이름 없는 고객",
      savedAt: new Date().toISOString(),
      form,
    }
    persistCases([saved, ...savedCases].slice(0, 30))
    alert("현재 입력 내용과 결과가 저장되었습니다.")
  }

  const loadCase = (item: SavedCase) => {
    const legacyForm = item.form as FormState & { selectedSurgeryCase?: string }
    setForm({
      ...initialForm,
      ...item.form,
      selectedSurgeryCases: legacyForm.selectedSurgeryCases?.length
        ? legacyForm.selectedSurgeryCases
        : legacyForm.selectedSurgeryCase ? [legacyForm.selectedSurgeryCase] : initialForm.selectedSurgeryCases,
    })
    setActive("result")
    setShowSaved(false)
  }

  const printReport = () => {
    setActive("result")
    setTimeout(() => window.print(), 120)
  }

  const closeWindow = () => {
    window.close()
    setTimeout(() => {
      if (!window.closed) router.push("/dashboard")
    }, 150)
  }

  if (checking) return <CenterMessage title="권한 확인 중입니다" body="잠시만 기다려 주세요." />
  if (!allowed) return <CenterMessage title="사용 권한이 없습니다" body={lockedReason} action={() => router.push("/dashboard")} />

  return (
    <main className="min-h-screen bg-[#eef3f8] p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
            <ArrowLeft className="h-4 w-4" /> 대시보드
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="new-pulse-badge rounded-full px-3 py-1 text-xs font-black text-white">NEW 첫 상담 보장체크</span>
            <button onClick={saveCase} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a3a6e] px-4 py-2 text-sm font-black text-white shadow-sm">
              <Save className="h-4 w-4" /> 저장
            </button>
            <button onClick={() => setShowSaved((prev) => !prev)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
              <FolderOpen className="h-4 w-4" /> 불러오기
            </button>
            <button onClick={printReport} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 shadow-sm">
              <Printer className="h-4 w-4" /> 출력
            </button>
            <button onClick={closeWindow} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 shadow-sm">
              <X className="h-4 w-4" /> 창닫기
            </button>
          </div>
        </header>

        {showSaved && (
          <div className="no-print mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-900">저장된 상담 기록</p>
              <button onClick={() => setShowSaved(false)} className="text-xs font-black text-slate-400">닫기</button>
            </div>
            {savedCases.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">저장된 기록이 없습니다.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {savedCases.map((item) => (
                  <button key={item.id} onClick={() => loadCase(item)} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-[#1a3a6e] hover:bg-[#eef4fb]">
                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{new Date(item.savedAt).toLocaleString("ko-KR")}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="no-print rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-6 lg:h-fit">
            <p className="px-2 pb-3 text-xs font-black uppercase tracking-[0.18em] text-[#1a3a6e]">Coverage Check</p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {steps.map((step) => {
                const Icon = step.icon
                const selected = active === step.id
                return (
                  <button key={step.id} onClick={() => setActive(step.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-black transition ${selected ? "border-[#1a3a6e] bg-[#1a3a6e] text-white" : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                    <Icon className="h-4 w-4" />
                    {step.label}
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="print-area rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {active === "intro" && <Intro onStart={() => setActive("customer")} />}
            {active === "customer" && (
              <Panel title="고객 기본 정보" desc="설계사가 고객의 현재 증권과 상담 내용을 보고 직접 입력합니다.">
                <div className="grid gap-3 md:grid-cols-2">
                  <TextInput label="고객명" value={form.customerName} onChange={(v) => update("customerName", v)} />
                  <NumberInput label="나이" value={form.age} onChange={(v) => update("age", v)} suffix="세" />
                  <SelectInput label="성별" value={form.gender} onChange={(v) => update("gender", v as FormState["gender"])} options={[["male", "남성"], ["female", "여성"]]} />
                  <NumberInput label="월 생활비 기준" value={form.monthlyLivingCost} onChange={(v) => update("monthlyLivingCost", v)} suffix="만원" />
                  <NumberInput label="암 치료 중 월 추가 지출" value={form.cancerIndirectMonthlyCost} onChange={(v) => update("cancerIndirectMonthlyCost", v)} suffix="만원" />
                  <Toggle label="실손 유지 여부" checked={form.hasActualLoss} onChange={(v) => update("hasActualLoss", v)} />
                  <div>
                    <NumberInput label="실손 예상 보완율" value={form.actualLossCoverageRate} onChange={(v) => update("actualLossCoverageRate", v)} suffix="%" />
                    <p className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-700">
                      전액본인부담금, 선별급여, 약관상 보상 제외 항목은 실손 예상 보완율에서 제외됩니다.
                    </p>
                  </div>
                </div>
              </Panel>
            )}
            {active === "cancer" && (
              <Panel title="암 보장 입력" desc="진단비는 1년 생활비, 치료비는 산정특례 이후 남을 수 있는 비급여 준비 관점으로 봅니다.">
                <FieldGrid>
                  <NumberInput label="암 진단비" value={form.cancerDiagnosis} onChange={(v) => update("cancerDiagnosis", v)} suffix="만원" />
                  <NumberInput label="유사암/소액암" value={form.similarCancer} onChange={(v) => update("similarCancer", v)} suffix="만원" />
                  <SelectInput label="대표 암 기준" value={currentCancerCase.id} onChange={(v) => update("cancerCaseId", v)} options={currentCancerCases.map((item) => [item.id, item.name])} />
                  <NumberInput label="항암약물 치료비" value={form.cancerTreatment} onChange={(v) => update("cancerTreatment", v)} suffix="만원" />
                  <NumberInput label="표적항암/신약" value={form.targetCancer} onChange={(v) => update("targetCancer", v)} suffix="만원" />
                  <NumberInput label="방사선/양성자/중입자" value={form.radiationCancer} onChange={(v) => update("radiationCancer", v)} suffix="만원" />
                </FieldGrid>
              </Panel>
            )}
            {active === "brain" && (
              <Panel title="뇌 보장 입력" desc="보장 범위가 뇌출혈인지, 뇌졸중인지, 뇌혈관질환까지인지가 핵심입니다.">
                <FieldGrid>
                  <SelectInput label="뇌 보장 범위" value={form.brainScope} onChange={(v) => update("brainScope", v as FormState["brainScope"])} options={[["hemorrhage", "뇌출혈"], ["stroke", "뇌졸중"], ["vascular", "뇌혈관질환"]]} />
                  <NumberInput label="뇌 진단비" value={form.brainDiagnosis} onChange={(v) => update("brainDiagnosis", v)} suffix="만원" />
                  <NumberInput label="뇌 수술비" value={form.brainSurgery} onChange={(v) => update("brainSurgery", v)} suffix="만원" />
                  <NumberInput label="혈전용해/스텐트 등 치료비" value={form.brainTreatment} onChange={(v) => update("brainTreatment", v)} suffix="만원" />
                </FieldGrid>
              </Panel>
            )}
            {active === "heart" && (
              <Panel title="심장 보장 입력" desc="급성심근경색만인지, 허혈성심장질환 또는 심혈관까지 보는지 확인합니다.">
                <FieldGrid>
                  <SelectInput label="심장 보장 범위" value={form.heartScope} onChange={(v) => update("heartScope", v as FormState["heartScope"])} options={[["ami", "급성심근경색"], ["ischemic", "허혈성심장질환"], ["cardio", "심혈관질환"]]} />
                  <NumberInput label="심장 진단비" value={form.heartDiagnosis} onChange={(v) => update("heartDiagnosis", v)} suffix="만원" />
                  <NumberInput label="심장 수술비" value={form.heartSurgery} onChange={(v) => update("heartSurgery", v)} suffix="만원" />
                  <NumberInput label="스텐트/우회술/부정맥 치료비" value={form.heartTreatment} onChange={(v) => update("heartTreatment", v)} suffix="만원" />
                </FieldGrid>
              </Panel>
            )}
            {active === "surgery" && (
              <Panel title="수술비 입력" desc="다빈도 수술을 체크하면 평균 비용과 현재 준비 금액, 부족 예상액이 바로 표시됩니다.">
                <div className="grid gap-5">
                  {/* ① 현재 보장 입력 — 카드 위에 배치해 체크 즉시 반영 */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-1 text-xs font-black text-slate-500 uppercase tracking-wide">현재 보유 수술 보장 (수술당 정액)</p>
                    <FieldGrid>
                      <NumberInput label="질병수술비" value={form.diseaseSurgery} onChange={(v) => update("diseaseSurgery", v)} suffix="만원" />
                      <NumberInput label="주요질환 수술비" value={form.majorSurgery} onChange={(v) => update("majorSurgery", v)} suffix="만원" />
                      <NumberInput label="N대/종수술비" value={form.nsurgery} onChange={(v) => update("nsurgery", v)} suffix="만원" />
                    </FieldGrid>
                    <p className="mt-2 text-[10px] font-bold text-slate-400">
                      수술 1건당 받는 정액 수술비 합산 기준. 실손 보완은 아래 항목별로 자동 반영됩니다.
                    </p>
                  </div>

                  {/* ② 수술 항목 선택 — 체크 시 부족 금액 즉시 표시 */}
                  <div>
                    <p className="mb-3 text-sm font-black text-slate-800">
                      수술 항목 체크
                      <span className="ml-2 text-[11px] font-bold text-slate-400">— 체크하면 평균 비용 · 현재 준비 · 부족 금액이 표시됩니다</span>
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {SURGERY_CASES.map((item) => {
                        const checked = form.selectedSurgeryCases.includes(item.id)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => update("selectedSurgeryCases", checked ? form.selectedSurgeryCases.filter((id) => id !== item.id) : [...form.selectedSurgeryCases, item.id])}
                            className={`rounded-2xl border p-4 text-left transition-all ${checked ? "border-[#1a3a6e] bg-[#eef4fb] shadow-md" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}
                          >
                            {/* 카드 헤더 */}
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-black text-slate-900 leading-tight">{item.name}</p>
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${checked ? "border-[#1a3a6e] bg-[#1a3a6e] text-white" : "border-slate-300 bg-white text-slate-300"}`}>
                                {checked ? "✓" : ""}
                              </span>
                            </div>
                            {/* 비급여 뱃지 */}
                            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black
                              ${item.coverageType.includes("비급여 중심") ? "bg-red-100 text-red-700" :
                                item.coverageType.includes("혼합") ? "bg-amber-100 text-amber-700" :
                                "bg-emerald-100 text-emerald-700"}`}>
                              {item.coverageType}
                            </span>
                            {/* 비용 범위 — 미체크 시도 표시 */}
                            <p className="mt-2 text-[10px] font-bold text-slate-500">
                              평균 비용 <span className="text-slate-700 font-black">{item.costMin.toLocaleString()}~{item.costMax.toLocaleString()}만원</span>
                            </p>
                            {/* 체크 시: 부족 금액 뱃지 */}
                            {checked && (
                              <SurgeryGapBadge
                                item={item}
                                fixedCoverage={surgeryFixedCoveragePerCase}
                                hasActualLoss={form.hasActualLoss}
                                actualLossCoverageRate={form.actualLossCoverageRate}
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* ③ 급여·비급여 안내 */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-black text-slate-900">급여·비급여 체크</p>
                    <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                      급여 중심 수술은 법정 본인부담과 실손 보완 가능성을 함께 보고,
                      급여+비급여 혼합 수술은 비급여 렌즈·내시경·고주파·치료재료 등 실손에서 제한될 수 있는 항목을 별도 확인합니다.
                    </p>
                  </div>
                </div>
              </Panel>
            )}
            {active === "care" && (
              <Panel title="간병비 입력" desc="암·뇌·심장 수술 후 간병 기간과 1일 단가를 기준으로 봅니다.">
                <FieldGrid>
                  <NumberInput label="간병 1일 단가" value={form.careDailyCost} onChange={(v) => update("careDailyCost", v)} suffix="만원" />
                  <NumberInput label="암 간병 예상일" value={form.cancerCareDays} onChange={(v) => update("cancerCareDays", v)} suffix="일" />
                  <NumberInput label="뇌 간병 예상일" value={form.brainCareDays} onChange={(v) => update("brainCareDays", v)} suffix="일" />
                  <NumberInput label="심장 간병 예상일" value={form.heartCareDays} onChange={(v) => update("heartCareDays", v)} suffix="일" />
                  <NumberInput label="현재 간병 일당" value={form.careBenefitDaily} onChange={(v) => update("careBenefitDaily", v)} suffix="만원" />
                </FieldGrid>
              </Panel>
            )}
            {active === "result" && (
              <Panel title="보장 공백 진단 결과" desc="첫 상담에서 오늘 확인된 공백을 설명하고, 상세 보장분석으로 이어가기 위한 화면입니다.">
                <div className="mb-4 rounded-2xl border border-[#bcd6f0] bg-[#f2f8ff] p-5">
                  <p className="text-sm font-black text-[#1a3a6e]">{form.customerName || "고객"}님의 현재 준비율</p>
                  <div className="mt-3 flex flex-wrap items-end gap-4">
                    <p className="text-5xl font-black text-[#1a3a6e]">{averageRate}%</p>
                    <p className="max-w-xl text-sm font-bold leading-7 text-slate-600">모두에게 똑같은 보험이 아니라, 현재 상황에서 암·뇌·심장·수술·간병을 어느 정도 감당할 수 있는지 확인한 결과입니다.</p>
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-5">
                  {resultList.map((item) => <ResultCard key={item.title} item={item} />)}
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-black text-amber-800">암 1년 집중치료 비용 구조</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-800">{currentCancerCase.name} · {cancerBenefitLabel} 기준</span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <CostBox label="1년 생활비" value={form.monthlyLivingCost * 12} desc="소득 공백과 가족 생활 유지 비용" />
                      <CostBox label="직접 치료비" value={cancerDirectTreatmentNeed} desc="수술, 항암, 방사선, 검사 등 치료 기준" />
                      <CostBox label="직접치료 외 비용" value={form.cancerIndirectMonthlyCost * 12} desc="교통비, 식사, 영양식, 위생용품 등" />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <CostBox label="통원항암 본인부담" value={cancerOutpatientSelfPayNeed} desc="반복 통원, 주사·처치, 외래 부담 기준" />
                      <CostBox label="전액본인부담·선별급여" value={cancerNonCoveredNeed} desc="실손 보완율에서 제외될 수 있는 항목" />
                      <SmallTextCost label="치료비 부족 가능" value={balanceText(cancerTreatmentGap)} tone="text-amber-900" />
                    </div>
                    <p className="mt-4 text-sm font-bold leading-7 text-amber-900">
                      암 진단비는 먼저 1년 생활비에 배정합니다. 예를 들어 월 생활비가 300만원이면 1년 기준은 3,600만원이고,
                      현재 {cancerBenefitLabel} {man(cancerDiagnosisBenefit)} 기준으로 생활비에서 이미 {balanceText(cancerLivingShortage)} 부족합니다. 남는 진단비 {man(cancerDiagnosisAfterLiving)}만 치료비 준비금으로 보고,
                      실손은 전액본인부담금·선별급여·약관상 제외 항목을 보완하지 못할 수 있어 별도로 계산합니다.
                      {currentCancerCase.category === "similar" && " 유사·소액암은 치료비 기준이 낮아 보여도 진단비가 작고 추적검사·약 복용이 길어질 수 있어 장기 관리 비용을 따로 봅니다."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-black text-slate-800">암 현재 준비</p>
                    <p className="mt-3 text-3xl font-black text-[#1a3a6e]">{man(result.cancer.ready)}</p>
                    <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
                      생활비 차감 후 남은 진단비, 항암 치료비, 표적항암·방사선 보장, 실손 예상 보완액 {man(cancerActualLossExpected)}을 합산한 상담용 기준입니다.
                    </p>
                    <div className="mt-4 rounded-xl bg-white p-4 text-xs font-black leading-6 text-slate-600">
                      <p>선택 기준: {currentCancerCase.name}</p>
                      <p>{cancerBenefitLabel}: {man(cancerDiagnosisBenefit)}</p>
                      <p>진단비 생활비 차감 후: {man(cancerDiagnosisAfterLiving)}</p>
                      <p>치료비 준비 부족: {balanceText(cancerTreatmentGap)}</p>
                      <p className="mt-2 font-bold">{currentCancerCase.note}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <CostStructure
                    title="뇌 치료·회복 비용 구조"
                    tone="blue"
                    living={form.monthlyLivingCost * 6}
                    treatment={4500}
                    indirectItems="교통비, 식대, 의료용품, 재활·통원 준비물"
                    desc="뇌혈관질환은 급성기 치료 이후 재활·통원·보호자 동행·이동 비용까지 이어질 수 있어 생활비 공백을 함께 봅니다."
                  />
                  <CostStructure
                    title="심장 치료·회복 비용 구조"
                    tone="rose"
                    living={form.monthlyLivingCost * 6}
                    treatment={3800}
                    indirectItems="교통비, 식대, 의료용품, 통원·회복 관리 비용"
                    desc="심장질환은 시술·수술 이후 회복, 식이 관리, 통원, 보호자 동행 비용이 생길 수 있어 직접치료 외 비용을 함께 봅니다."
                  />
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-black text-slate-900">대표 치료·수술 상담 기준</p>
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <SmallTextCost label="암" value="표적항암, 방사선, 양성자·중입자, 비급여 검사와 약제" tone="text-slate-700" />
                    <SmallTextCost label="뇌" value="혈전용해, 스텐트, 개두술, 재활·통원 치료" tone="text-slate-700" />
                    <SmallTextCost label="심장" value="스텐트, 관상동맥우회술, 부정맥 시술, 통원 회복관리" tone="text-slate-700" />
                  </div>
                  <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
                    대표 치료와 비용 기준은 입력 화면에는 노출하지 않고 결과에서만 확인합니다. 산정특례가 적용되어도 비급여, 치료재료, 약관상 제외 항목, 직접치료 외 비용은 별도 부담으로 설명합니다.
                  </p>
                </div>
                <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-indigo-900">수술비 체크 항목 합산</p>
                      <p className="mt-2 text-3xl font-black text-indigo-700">{selectedSurgeryCases.length}개 항목</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">현재 부족 가능 {balanceText(surgeryGapTotal)}</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <SmallCost label="체크 수술 예상비용" value={surgeryNeedTotal} tone="text-indigo-700" />
                    <SmallCost label="수술비 정액 합산" value={surgeryFixedCoverageTotal} tone="text-indigo-700" />
                    <SmallCost label="실손 예상 보완" value={surgeryActualLossTotal} tone="text-indigo-700" />
                    <SmallTextCost label="부족 가능 금액" value={balanceText(surgeryGapTotal)} tone="text-indigo-700" />
                  </div>
                  {selectedSurgeryCases.length === 0 ? (
                    <p className="mt-4 rounded-xl bg-white/80 p-4 text-sm font-bold leading-7 text-indigo-900">수술비 탭에서 확인할 수술 항목을 체크하면 항목별 비용과 보장 예상액이 표시됩니다.</p>
                  ) : (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {selectedSurgeryCases.map((item) => {
                        const itemNeed = averageCost(item)
                        const itemActualLoss = surgeryActualLossAmount(form, item)
                        const itemReady = surgeryFixedCoveragePerCase + itemActualLoss
                        const itemGap = itemNeed - itemReady
                        return (
                          <div key={item.id} className="rounded-xl bg-white/80 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-base font-black text-indigo-900">{item.name}</p>
                              <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-black text-indigo-700">{item.coverageType}</span>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs font-black text-indigo-900 sm:grid-cols-2">
                              <p>예상비용 {man(item.costMin)}~{man(item.costMax)}</p>
                              <p>상담 기준 {man(itemNeed)}</p>
                              <p>수술비 보장 {man(surgeryFixedCoveragePerCase)}</p>
                              <p>실손 예상 {man(itemActualLoss)}</p>
                              <p className="sm:col-span-2">부족 가능 {balanceText(itemGap)}</p>
                            </div>
                            <p className="mt-3 text-xs font-bold leading-5 text-indigo-900">{item.note}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <ResourceGallery />
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-black text-amber-800">오늘 상담 포인트</p>
                  <ul className="mt-3 space-y-2 text-sm font-bold leading-7 text-amber-900">
                    {[...resultList].sort((a, b) => a.rate - b.rate).slice(0, 3).map((item) => (
                      <li key={item.title}>· {item.title}: {item.note}</li>
                    ))}
                  </ul>
                </div>
              </Panel>
            )}

            <div className="no-print mt-6 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
              <button onClick={prev} disabled={active === "intro"} className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-500 disabled:opacity-30">이전</button>
              <div className="flex gap-2">
                {active !== "result" && <button onClick={next} className="rounded-lg bg-[#1a3a6e] px-5 py-3 text-sm font-black text-white">다음</button>}
                {active !== "result" && <button onClick={() => setActive("result")} className="rounded-lg border border-[#1a3a6e] bg-white px-5 py-3 text-sm font-black text-[#1a3a6e]">결과 보기</button>}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

// ── 수술비 카드 내 부족금액 뱃지 ─────────────────────────────────
function SurgeryGapBadge({
  item, fixedCoverage, hasActualLoss, actualLossCoverageRate,
}: {
  item: typeof SURGERY_CASES[number]
  fixedCoverage: number
  hasActualLoss: boolean
  actualLossCoverageRate: number
}) {
  const itemNeed = Math.round((item.costMin + item.costMax) / 2)
  // 정액수술비 기준으로 gap 계산 (실손은 별도 보완 참고용)
  const itemGap = itemNeed - fixedCoverage
  const surplus = itemGap <= 0
  // 실손보완 예상액 (참고용 — gap을 줄여주는 효과)
  const actualLossSupport = hasActualLoss
    ? Math.round(itemNeed * (actualLossCoverageRate / 100) * item.actualLossFactor)
    : 0
  const netGap = itemGap - actualLossSupport
  return (
    <div className="mt-3 border-t border-[#c8dcef] pt-3 space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-500 font-bold">예상 비용</span>
        <span className="text-[10px] font-black text-slate-700">{item.costMin.toLocaleString()}~{item.costMax.toLocaleString()}만원</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-slate-500 font-bold">수술비 정액 준비</span>
        <span className="text-[10px] font-black text-[#1a7a5a]">{fixedCoverage.toLocaleString()}만원</span>
      </div>
      <div className={`flex justify-between items-center rounded-lg px-2 py-1.5 ${surplus ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
        <span className={`text-[10px] font-black ${surplus ? "text-emerald-700" : "text-red-700"}`}>
          {surplus ? "정액 충족" : "정액 부족"}
        </span>
        <span className={`text-[12px] font-black ${surplus ? "text-emerald-600" : "text-red-600"}`}>
          {surplus ? `+${Math.abs(itemGap).toLocaleString()}만원` : `-${itemGap.toLocaleString()}만원`}
        </span>
      </div>
      {!surplus && hasActualLoss && actualLossSupport > 0 && (
        <div className={`flex justify-between items-center rounded-lg px-2 py-1 ${netGap <= 0 ? "bg-sky-50 border border-sky-200" : "bg-orange-50 border border-orange-200"}`}>
          <span className="text-[9px] font-bold text-slate-500">실손 보완 후</span>
          <span className={`text-[11px] font-black ${netGap <= 0 ? "text-sky-600" : "text-orange-600"}`}>
            {netGap <= 0 ? `+${Math.abs(netGap).toLocaleString()}만원` : `-${netGap.toLocaleString()}만원`}
          </span>
        </div>
      )}
    </div>
  )
}

function CenterMessage({ title, body, action }: { title: string; body: string; action?: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef3f8] p-6 text-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xl font-black text-slate-900">{title}</p>
        <p className="mt-3 whitespace-pre-line text-sm font-bold leading-7 text-slate-500">{body}</p>
        {action && <button onClick={action} className="mt-5 rounded-lg bg-[#1a3a6e] px-5 py-3 text-sm font-black text-white">대시보드로 이동</button>}
      </div>
    </div>
  )
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#d7b46a] bg-[#fbf8ef]">
      <div className="p-6 sm:p-10">
        <span className="new-pulse-badge rounded-full px-3 py-1 text-xs font-black text-white">NEW</span>
        <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight text-[#111827] sm:text-5xl">
          모두에게 똑같은 보험이 아니라,<br />나의 상황에 맞는 보장이 준비되어 있는지 체크합니다.
        </h1>
        <p className="mt-5 max-w-2xl text-base font-bold leading-8 text-slate-600">
          현재 보장 내용을 입력하면 암, 뇌, 심장, 수술, 간병 상황에서 준비율과 부족 가능 금액을 상담용으로 바로 확인합니다.
        </p>
        <button onClick={onStart} className="mt-8 rounded-xl bg-[#1a3a6e] px-7 py-4 text-sm font-black text-white shadow-lg">보장 입력 시작</button>
      </div>
    </div>
  )
}

function Panel({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-5">
        <p className="text-2xl font-black text-slate-950">{title}</p>
        <p className="mt-2 text-sm font-bold leading-7 text-slate-500">{desc}</p>
      </div>
      {children}
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}
