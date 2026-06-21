"use client"

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, ArrowLeft, Brain, FolderOpen, HeartPulse, Printer, Save, ShieldCheck, Sparkles, Stethoscope, UserRound, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { ensureUserProfile } from "../../lib/userProfile"
import { isApprovedUser, normalizeRole, canAccessFirstCoverageCheck, ROLE_PRIORITY } from "../../lib/roles"
import LoadingScreen from "../components/LoadingScreen"

type StepId = "intro" | "customer" | "cancer" | "brain" | "heart" | "surgery" | "care" | "treatment" | "result"
type TreatmentCat = "cancer" | "brain" | "heart" | "surgery"

type FormState = {
  customerName: string
  age: number
  gender: "male" | "female"
  monthlyLivingCost: number
  cancerIndirectMonthlyCost: number
  hasActualLoss: boolean
  actualLossCoverageRate: number
  realLossInpatient: number
  realLossOutpatient: number
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
  selectedCareItems: string[]
  selectedTreatmentItems: string[]
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
  { id: "treatment", label: "치료방법", icon: Stethoscope },
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
  realLossInpatient: 5000,
  realLossOutpatient: 25,
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
  selectedSurgeryCases: [],
  diseaseSurgery: 30,
  majorSurgery: 300,
  nsurgery: 0,
  careDailyCost: 15,
  cancerCareDays: 14,
  brainCareDays: 60,
  heartCareDays: 21,
  careBenefitDaily: 0,
  selectedCareItems: [],
  selectedTreatmentItems: [],
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

// ─ 비용 단위: 만원 / 총 예상 환자 지출 기준
// ─ (NHIS 본인부담 + 비급여 재료비 + 상급병실 + 간병비 등 실제 부담 합산)
// ─ 출처: HIRA 비급여 진료비 정보, 국민건강보험공단 2024 주요수술통계, 금감원 보험통계
// ─ actualLossFactor: 총 부담액 중 실손보험이 보완할 수 있는 비율 (0~1)
// surgeryType: "general"=질병수술비만 | "major"=+N대수술비 | "ndae"=+N대수술비+종수술비
const SURGERY_CASES = [
  // ─── 근골격계 ───────────────────────────────────────────
  {
    id: "knee",
    name: "무릎 인공관절",
    costMin: 500, costMax: 1500,
    coverageType: "급여 중심",
    actualLossFactor: 0.40,
    surgeryType: "major" as const,
    surgeryClass: "4종",
    note: "급여 본인부담 300~500만 + 비급여 재료 200~500만 + 상급병실·간병비 200~500만. 실손은 의료비 일부만 보완.",
  },
  {
    id: "hip",
    name: "고관절 치환술",
    costMin: 600, costMax: 1800,
    coverageType: "급여 중심",
    actualLossFactor: 0.38,
    surgeryType: "major" as const,
    surgeryClass: "4종",
    note: "급여 본인부담 + 인공관절 재료비 + 장기 재활비 포함 총 부담. 고령일수록 간병비 증가.",
  },
  {
    id: "knee-arthroscopy",
    name: "무릎 관절경/연골수술",
    costMin: 200, costMax: 600,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.55,
    surgeryType: "general" as const,
    surgeryClass: "3종",
    note: "급여 본인부담 + 비급여 치료재료 + 상급병실. 병원급·방식에 따라 비용 편차 큼.",
  },
  {
    id: "knee-regeneration",
    name: "무릎 연골재생 (카티스템)",
    costMin: 800, costMax: 1500,
    coverageType: "비급여 중심",
    actualLossFactor: 0.20,
    surgeryType: "major" as const,
    surgeryClass: "4종",
    note: "카티스템 재료비 전액 비급여. 4세대 실손부터 보완 한도 크게 축소.",
  },
  {
    id: "shoulder",
    name: "어깨 회전근개",
    costMin: 300, costMax: 800,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.50,
    surgeryType: "general" as const,
    surgeryClass: "3종",
    note: "급여 본인부담 + 비급여 재료 + 상급병실·물리치료. 봉합 범위와 병원에 따라 크게 다름.",
  },
  {
    id: "spine",
    name: "허리 디스크/척추수술",
    costMin: 500, costMax: 1500,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.35,
    surgeryType: "major" as const,
    surgeryClass: "4종",
    note: "미세현미경·내시경 급여분 + 비급여 재료 + 재활치료 포함. 비급여 방식 선택 시 총 부담 급증.",
  },
  // ─── 눈 ────────────────────────────────────────────────
  {
    id: "cataract",
    name: "백내장 (단초점렌즈)",
    costMin: 200, costMax: 500,
    coverageType: "급여 중심",
    actualLossFactor: 0.45,
    surgeryType: "general" as const,
    surgeryClass: "2종",
    note: "양안 기준. 단초점 급여 적용이나 검사비·상급병실·마취비 비급여 추가 발생.",
  },
  {
    id: "cataract-multi",
    name: "백내장 (다초점렌즈)",
    costMin: 600, costMax: 1500,
    coverageType: "비급여 중심",
    actualLossFactor: 0.20,
    surgeryType: "general" as const,
    surgeryClass: "3종",
    note: "양안 기준 전액 비급여. 렌즈 종류·병원에 따라 차이 큼. 4세대 실손 보완 한도 대폭 축소.",
  },
  // ─── 소화기 ────────────────────────────────────────────
  {
    id: "appendix",
    name: "맹장 (충수절제술)",
    costMin: 150, costMax: 500,
    coverageType: "급여 중심",
    actualLossFactor: 0.65,
    surgeryType: "general" as const,
    surgeryClass: "2종",
    note: "복강경 급여 + 입원비·상급병실·검사비 포함. 합병증 시 부담 급증.",
  },
  {
    id: "gallbladder",
    name: "담낭절제술 (담석증)",
    costMin: 250, costMax: 700,
    coverageType: "급여 중심",
    actualLossFactor: 0.60,
    surgeryType: "general" as const,
    surgeryClass: "3종",
    note: "복강경 급여 본인부담 + 상급병실·마취·검사비 포함. 급성 담낭염 동반 시 부담 증가.",
  },
  {
    id: "hernia",
    name: "탈장 수술",
    costMin: 200, costMax: 600,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.50,
    surgeryType: "general" as const,
    surgeryClass: "2종",
    note: "급여 본인부담 + 메시 재료비·마취비 포함. 복강경·양측 수술 시 비용 상승.",
  },
  // ─── 여성 ────────────────────────────────────────────
  {
    id: "uterine-myoma",
    name: "자궁근종 절제술",
    costMin: 400, costMax: 1000,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.45,
    surgeryType: "major" as const,
    surgeryClass: "4종",
    note: "복강경·자궁경 급여분 + 비급여 재료 + 입원비. 로봇수술 선택 시 아래 항목으로 별도 체크.",
  },
  // ─── 갑상선/항문 ──────────────────────────────────────
  {
    id: "thyroid-surgery",
    name: "갑상선 절제술",
    costMin: 400, costMax: 1000,
    coverageType: "급여 중심",
    actualLossFactor: 0.50,
    surgeryType: "general" as const,
    surgeryClass: "3종",
    note: "개방·내시경 급여 본인부담 + 입원·검사비. 로봇수술 선택 시 아래 항목으로 별도 체크.",
  },
  {
    id: "hemorrhoid",
    name: "치질 수술",
    costMin: 150, costMax: 500,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.55,
    surgeryType: "general" as const,
    surgeryClass: "2종",
    note: "급여 기준 + 비급여 방식(레이저·고주파) 선택 시 비용 추가. 1박2일 입원비 포함.",
  },
  // ─── 심장혈관 ────────────────────────────────────────
  {
    id: "heart-stent",
    name: "심장 스텐트 시술",
    costMin: 400, costMax: 1200,
    coverageType: "급여 중심",
    actualLossFactor: 0.60,
    surgeryType: "ndae" as const,
    surgeryClass: "N대",
    note: "산정특례 5% 본인부담 + 비급여 스텐트 재료·검사·중환자실·간병비 합산. 총 진료비 1,400~5,000만원 규모.",
  },
  // ─── 로봇수술 ────────────────────────────────────────
  {
    id: "robot-surgery",
    name: "로봇수술 (다빈치)",
    costMin: 1000, costMax: 2500,
    coverageType: "비급여 중심",
    actualLossFactor: 0.15,
    surgeryType: "ndae" as const,
    surgeryClass: "N대",
    note: "전립선·갑상선·자궁·대장·위 등 다빈치 로봇수술. 수술비 전액 비급여 기본 1,000만원~. 4세대 이후 실손 보완 한도 급감.",
  },
]

// surgeryType별 적용 수술비 계산 헬퍼
function surgeryCovByType(
  form: { diseaseSurgery: number; majorSurgery: number; nsurgery: number },
  surgeryType: "general" | "major" | "ndae"
) {
  if (surgeryType === "ndae") return form.diseaseSurgery + form.majorSurgery + form.nsurgery
  if (surgeryType === "major") return form.diseaseSurgery + form.majorSurgery
  return form.diseaseSurgery
}

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

// ─────────────────────────────────────────────────────────────────
// 간병비 항목 데이터
// ─────────────────────────────────────────────────────────────────
const CARE_ITEMS = [
  // 암 간병
  { id: "care-cancer-inpatient",  category: "cancer" as const, name: "입원 간병", desc: "수술·항암·방사선 입원 기간 간병인 배치", estDays: 8, note: "수술 후 평균 7~10일 입원. 1인실 간병인 기준." },
  { id: "care-cancer-outpatient", category: "cancer" as const, name: "통원 항암 지원", desc: "외래 항암·주사 통원 시 이동·동행 지원", estDays: 60, note: "6~12개월 통원 기간 중 간병 필요 일수 기준." },
  { id: "care-cancer-rehab",      category: "cancer" as const, name: "재활 기간 간병", desc: "치료 후 일상 복귀까지 재활·자택 돌봄", estDays: 60, note: "2~6개월 재활 기간 기준." },
  { id: "care-cancer-hospice",    category: "cancer" as const, name: "호스피스 간병", desc: "말기암 완화케어 기간 24시간 돌봄", estDays: 45, note: "1~3개월 호스피스 입원 기준." },
  // 뇌 간병
  { id: "care-brain-acute",       category: "brain" as const, name: "급성기 입원 간병", desc: "중환자실·일반병실 집중 간병", estDays: 30, note: "뇌졸중·뇌출혈 초기 20~60일." },
  { id: "care-brain-rehab",       category: "brain" as const, name: "재활 입원 간병", desc: "재활전문병원 입원 간병", estDays: 90, note: "2~6개월 재활 입원 기준." },
  { id: "care-brain-home",        category: "brain" as const, name: "재가 요양 간병", desc: "퇴원 후 자택 돌봄·방문 요양", estDays: 180, note: "6~24개월 장기 재가 요양 기준." },
  { id: "care-brain-nursing",     category: "brain" as const, name: "요양병원 간병", desc: "장기 요양 필요 시 요양병원 입원", estDays: 120, note: "4~12개월 요양병원 기준." },
  // 심장 간병
  { id: "care-heart-acute",       category: "heart" as const, name: "급성기 입원 간병", desc: "심장내과·중환자실 초기 돌봄", estDays: 20, note: "스텐트·심근경색 후 10~30일." },
  { id: "care-heart-post",        category: "heart" as const, name: "시술 후 관리 간병", desc: "시술·수술 후 회복기 돌봄", estDays: 30, note: "시술 후 2~8주 기준." },
  { id: "care-heart-rehab",       category: "heart" as const, name: "심장 재활 간병", desc: "심장 재활 프로그램 기간 지원", estDays: 45, note: "1~3개월 재활 기준." },
  // 수술 간병
  { id: "care-surgery-minor",     category: "surgery" as const, name: "1~2종 수술 후 간병", desc: "소수술·외래수술 후 단기 돌봄", estDays: 5, note: "수술 후 3~7일 기준." },
  { id: "care-surgery-mid",       category: "surgery" as const, name: "3종 수술 후 간병", desc: "중간 규모 수술 후 회복기 돌봄", estDays: 14, note: "수술 후 7~21일 기준." },
  { id: "care-surgery-major",     category: "surgery" as const, name: "주요질환 수술 간병", desc: "대수술·복부·정형외과 수술 후 돌봄", estDays: 21, note: "수술 후 14~30일 기준." },
  { id: "care-surgery-inpatient", category: "surgery" as const, name: "입원 중 간병인 배치", desc: "수술 입원 기간 전 기간 간병인", estDays: 20, note: "수술 종류에 따라 10~30일 입원 기준." },
]

// ─────────────────────────────────────────────────────────────────
// 치료방법 항목 데이터 (암/뇌/심장)
// ─────────────────────────────────────────────────────────────────
type TxBenefitKey = "cancerTreatment" | "targetCancer" | "radiationCancer" | "brainTreatment" | "heartTreatment"

const TREATMENT_CASES: {
  id: string
  category: TreatmentCat
  name: string
  costMin: number
  costMax: number
  coverageType: string
  actualLossFactor: number
  /** 이 항목에 직접 대응하는 보험금 입력 키 (null=수술비 탭에서 별도) */
  benefitKey: TxBenefitKey | null
  /** 통원 중심 치료 여부 — true면 실손 통원 한도(회당)×예상횟수로 계산 */
  isOutpatient: boolean
  /** 예상 통원 횟수 (isOutpatient=true 시 사용) */
  outpatientVisits?: number
  /** 비급여 중심으로 실손 혜택 거의 없음 */
  noActualLoss?: boolean
  note: string
}[] = [
  // ─── 암 치료 ──────────────────────────────────────────────────
  {
    id: "tx-cancer-surgery",
    category: "cancer",
    name: "암 절제수술",
    costMin: 500, costMax: 2000,
    coverageType: "급여 중심",
    actualLossFactor: 0.50,
    benefitKey: null, // 수술비 탭에서 별도 산정
    isOutpatient: false,
    note: "위절제·폐절제·유방절제 등 부위별 수술. 급여 본인부담 + 비급여 재료비 + 입원비 합산. 로봇수술 선택 시 비용 급증.",
  },
  {
    id: "tx-cancer-chemo",
    category: "cancer",
    name: "항암화학요법",
    costMin: 800, costMax: 3000,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.40,
    benefitKey: "cancerTreatment",
    isOutpatient: true,
    outpatientVisits: 40, // 약 6~12개월, 주 1회 기준
    note: "6~12개월 주기 항암투여. 급여 약제 외 비급여 표적치료제·지지요법 포함. 통원 횟수 × 회당 비용으로 총 부담 증가.",
  },
  {
    id: "tx-cancer-radiation",
    category: "cancer",
    name: "방사선 치료",
    costMin: 300, costMax: 1200,
    coverageType: "급여 중심",
    actualLossFactor: 0.45,
    benefitKey: "radiationCancer",
    isOutpatient: true,
    outpatientVisits: 25, // 부위당 20~35회
    note: "부위당 20~35회 통원. 급여 본인부담 + 정밀방사선(SBRT·양성자) 비급여 선택 시 추가 발생.",
  },
  {
    id: "tx-cancer-target",
    category: "cancer",
    name: "표적·면역항암 치료",
    costMin: 1000, costMax: 4000,
    coverageType: "비급여 중심",
    actualLossFactor: 0.20,
    benefitKey: "targetCancer",
    isOutpatient: true,
    outpatientVisits: 12, // 월 1회 기준
    noActualLoss: true, // 비급여 중심 — 실손 거의 미적용
    note: "비급여 표적항암제·면역항암제(PD-1/PD-L1). 월 200~500만원 약제비 부담. 급여 전환 전까지 자기부담 큼.",
  },
  {
    id: "tx-cancer-hormone",
    category: "cancer",
    name: "호르몬·유지요법",
    costMin: 100, costMax: 600,
    coverageType: "급여 중심",
    actualLossFactor: 0.60,
    benefitKey: "cancerTreatment", // 항암약물치료비에 포함
    isOutpatient: true,
    outpatientVisits: 60, // 5~10년 장기 복용
    note: "유방암·전립선암 장기 호르몬제. 5~10년 복용 기준 누적 부담. 급여지만 검사비·통원비 추가.",
  },
  // ─── 뇌 치료 ──────────────────────────────────────────────────
  {
    id: "tx-brain-thrombolysis",
    category: "brain",
    name: "혈전용해술 (tPA)",
    costMin: 300, costMax: 800,
    coverageType: "급여 중심",
    actualLossFactor: 0.55,
    benefitKey: "brainTreatment",
    isOutpatient: false,
    note: "뇌졸중 초기 3~4.5시간 내 혈전용해제 투여. 급여 본인부담 + 중환자실·검사비 포함.",
  },
  {
    id: "tx-brain-thrombectomy",
    category: "brain",
    name: "기계적 혈전제거술",
    costMin: 700, costMax: 1800,
    coverageType: "급여 중심",
    actualLossFactor: 0.50,
    benefitKey: "brainTreatment",
    isOutpatient: false,
    note: "스텐트리버·흡입카테터 시술. 급여 산정특례 적용이나 재료비·중환자실 비급여 추가 발생.",
  },
  {
    id: "tx-brain-craniotomy",
    category: "brain",
    name: "개두술 (뇌출혈/종양)",
    costMin: 1000, costMax: 3000,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.40,
    benefitKey: "brainTreatment",
    isOutpatient: false,
    note: "뇌출혈·뇌종양 개두수술. 급여 본인부담 + 특수재료·ICU·간병비 포함 총 부담 큼.",
  },
  {
    id: "tx-brain-stent",
    category: "brain",
    name: "뇌혈관 스텐트 시술",
    costMin: 500, costMax: 1500,
    coverageType: "급여 중심",
    actualLossFactor: 0.55,
    benefitKey: "brainTreatment",
    isOutpatient: false,
    note: "경동맥·뇌동맥 스텐트 삽입. 급여 본인부담 + 비급여 스텐트 재료비 추가.",
  },
  {
    id: "tx-brain-rehab",
    category: "brain",
    name: "뇌 재활치료 (장기)",
    costMin: 400, costMax: 2000,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.45,
    benefitKey: "brainTreatment",
    isOutpatient: false,
    note: "재활전문병원 2~6개월 입원. 급여 재활치료 + 비급여 물리치료·보조기구 포함. 장기화 시 부담 급증.",
  },
  // ─── 심장 치료 ──────────────────────────────────────────────────
  {
    id: "tx-heart-stent",
    category: "heart",
    name: "관상동맥 스텐트 시술",
    costMin: 400, costMax: 1200,
    coverageType: "급여 중심",
    actualLossFactor: 0.60,
    benefitKey: "heartTreatment",
    isOutpatient: false,
    note: "심근경색·협심증 스텐트 삽입. 급여 본인부담 + 비급여 약물스텐트 재료비·ICU 포함.",
  },
  {
    id: "tx-heart-bypass",
    category: "heart",
    name: "관상동맥우회술 (CABG)",
    costMin: 1200, costMax: 3000,
    coverageType: "급여 중심",
    actualLossFactor: 0.45,
    benefitKey: "heartTreatment",
    isOutpatient: false,
    note: "3가지 혈관 우회 기준. 급여 산정특례 + 비급여 재료·ICU·장기 재활 포함. 총 부담 큼.",
  },
  {
    id: "tx-heart-ablation",
    category: "heart",
    name: "부정맥 전극도자절제술",
    costMin: 500, costMax: 1500,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.50,
    benefitKey: "heartTreatment",
    isOutpatient: false,
    note: "심방세동·빈맥 절제술. 급여 본인부담 + 비급여 카테터 재료비 포함.",
  },
  {
    id: "tx-heart-pacemaker",
    category: "heart",
    name: "심박동기·제세동기 삽입",
    costMin: 800, costMax: 2000,
    coverageType: "급여 중심",
    actualLossFactor: 0.40,
    benefitKey: "heartTreatment",
    isOutpatient: false,
    note: "ICD·CRT 기기 포함. 급여 본인부담 + 기기 재료비 일부 비급여. 재수술 가능성 포함.",
  },
  {
    id: "tx-heart-valve",
    category: "heart",
    name: "심장판막 수술·시술",
    costMin: 1000, costMax: 3500,
    coverageType: "급여+비급여 혼합",
    actualLossFactor: 0.42,
    benefitKey: "heartTreatment",
    isOutpatient: false,
    note: "개흉판막치환·TAVI(경피적 대동맥판막) 포함. 급여분 + 비급여 판막 재료비·ICU 합산.",
  },
]

function averageCost(item: typeof SURGERY_CASES[number]) {
  return Math.round((item.costMin + item.costMax) / 2)
}

function surgeryActualLossAmount(form: FormState, item: typeof SURGERY_CASES[number]) {
  if (!form.hasActualLoss) return 0
  return Math.round(averageCost(item) * (form.actualLossCoverageRate / 100) * item.actualLossFactor)
}

/** 치료방법 항목별 보험금 (benefitKey 직접 매핑) */
function getTxItemBenefit(form: FormState, bKey: TxBenefitKey | null): number {
  if (!bKey) return 0
  return (form[bKey] as number) ?? 0
}

/** 치료방법 항목별 실손 예상 (통원/입원 구분 적용) */
function getTxActualLoss(form: FormState, item: typeof TREATMENT_CASES[number], avgC: number): number {
  if (!form.hasActualLoss) return 0
  if (item.noActualLoss) return 0
  const raw = Math.round(avgC * (form.actualLossCoverageRate / 100) * item.actualLossFactor)
  if (item.isOutpatient) {
    // 통원 실손: 회당 한도 × 예상 통원 횟수
    const visits = item.outpatientVisits ?? 20
    return Math.min(raw, form.realLossOutpatient * visits)
  }
  // 입원 실손: 입원 연간 한도 이내
  return Math.min(raw, form.realLossInpatient)
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
  const [activeCareTab, setActiveCareTab] = useState<"cancer" | "brain" | "heart" | "surgery">("cancer")
  const [activeTreatmentTab, setActiveTreatmentTab] = useState<TreatmentCat>("cancer")
  const [form, setForm] = useState<FormState>(initialForm)
  const [savedCases, setSavedCases] = useState<SavedCase[]>([])
  const [showSaved, setShowSaved] = useState(false)
  const [showPremiumGuide, setShowPremiumGuide] = useState(false)
  const [expandedResultKey, setExpandedResultKey] = useState<string | null>(null)

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
      const canUse = canAccessFirstCoverageCheck(profile)

      // 접근 불가 사유 결정
      let reason = "이용 권한이 없습니다."
      if (!approved) {
        reason = "관리자 승인 후 사용할 수 있습니다."
      } else if (!isAgentOrAbove) {
        reason = "설계사 등급 이상만 이용할 수 있습니다."
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

    const checkedSurgeryCases = SURGERY_CASES.filter((item) => form.selectedTreatmentItems.includes(item.id))
    const surgeryCases = checkedSurgeryCases.length ? checkedSurgeryCases : []
    const surgeryNeed = surgeryCases.reduce((sum, item) => sum + averageCost(item), 0)
    // surgeryType별로 실제 받는 수술비 합산 (general=질병수술비만, major=+N대수술비, ndae=전부)
    const surgeryBaseCoverage = surgeryCases.reduce((sum, item) => sum + surgeryCovByType(form, item.surgeryType), 0)
    const surgeryActualLoss = surgeryCases.reduce((sum, item) => sum + surgeryActualLossAmount(form, item), 0)
    const surgeryReady = surgeryBaseCoverage + surgeryActualLoss

    const checkedCareItems = CARE_ITEMS.filter((item) => form.selectedCareItems.includes(item.id))
    const careTotalDays = checkedCareItems.reduce((sum, item) => sum + item.estDays, 0)
    // 체크된 항목이 있으면 합산, 없으면 기존 방식(직접 입력 일수 최대값)으로 폴백
    const careNeed = checkedCareItems.length > 0
      ? checkedCareItems.reduce((sum, item) => sum + item.estDays * form.careDailyCost, 0)
      : form.careDailyCost * Math.max(form.cancerCareDays, form.brainCareDays, form.heartCareDays)
    const careReady = checkedCareItems.length > 0
      ? form.careBenefitDaily * careTotalDays
      : form.careBenefitDaily * Math.max(form.cancerCareDays, form.brainCareDays, form.heartCareDays)

    return {
      cancer: {
        title: "암",
        need: cancerNeed,
        ready: cancerReady,
        rate: clampRate((cancerReady / cancerNeed) * 100),
        gap: cancerNeed - cancerReady,
        note: `${cancerCase.name} 기준입니다. ${cancerCase.category === "similar" ? "유사·소액암 진단비" : "일반암 진단비"}는 먼저 1년 생활비 ${man(livingNeed)}에 배정합니다. 생활비 부족은 ${balanceText(cancerLivingShortage)}이고, 남는 진단비 ${man(cancerDiagnosisAfterLiving)}만 치료비 준비금으로 봅니다.`,
        details: [
          { label: "선택 암 기준", value: cancerCase.name },
          { label: "필요 ① 1년 생활비", value: man(livingNeed) },
          { label: "필요 ② 직접 치료비", value: man(cancerDirectTreatmentNeed) },
          { label: "필요 ③ 통원·본인부담", value: man(cancerOutpatientSelfPayNeed) },
          { label: "필요 ④ 전액본인부담", value: man(cancerNonCoveredNeed) },
          { label: "필요 ⑤ 간접비용(1년)", value: man(cancerIndirectNeed) },
          { label: "준비 ① 진단비(생활비 차감)", value: man(cancerDiagnosisAfterLiving) },
          { label: "준비 ② 치료비 보험금", value: man(cancerTreatmentBenefits) },
          { label: "준비 ③ 실손 예상", value: man(cancerActualLoss) },
          { label: "준비 합계", value: man(cancerReady) },
          { label: "부족 가능", value: balanceText(cancerNeed - cancerReady) },
        ],
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
        details: [
          { label: "보장 범위", value: form.brainScope === "hemorrhage" ? "뇌출혈" : form.brainScope === "stroke" ? "뇌졸중" : "뇌혈관질환" },
          { label: "필요 ① 6개월 생활비", value: man(brainLivingNeed) },
          { label: "필요 ② 치료비 기준", value: man(brainTreatmentNeed) },
          { label: "필요 ③ 간병비 기준", value: man(brainCareNeed) },
          { label: "준비 진단비", value: man(form.brainDiagnosis) },
          { label: "준비 수술비", value: man(form.brainSurgery) },
          { label: "준비 치료비", value: man(form.brainTreatment) },
          { label: "실손 예상", value: form.hasActualLoss ? man(800) : "미가입" },
          { label: "준비 합계", value: man(brainReady) },
          { label: "부족 가능", value: balanceText(brainNeed - brainReady) },
        ],
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
        details: [
          { label: "보장 범위", value: form.heartScope === "ami" ? "급성심근경색" : form.heartScope === "ischemic" ? "허혈성심장질환" : "심혈관질환" },
          { label: "필요 ① 6개월 생활비", value: man(heartLivingNeed) },
          { label: "필요 ② 치료비 기준", value: man(heartTreatmentNeed) },
          { label: "필요 ③ 간병비 기준", value: man(heartCareNeed) },
          { label: "준비 진단비", value: man(form.heartDiagnosis) },
          { label: "준비 수술비", value: man(form.heartSurgery) },
          { label: "준비 치료비", value: man(form.heartTreatment) },
          { label: "실손 예상", value: form.hasActualLoss ? man(700) : "미가입" },
          { label: "준비 합계", value: man(heartReady) },
          { label: "부족 가능", value: balanceText(heartNeed - heartReady) },
        ],
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
        details: surgeryCases.length ? [
          { label: "체크 항목 수", value: `${surgeryCases.length}개` },
          { label: "예상 비용 합산", value: man(surgeryNeed) },
          { label: "정액 보장 합산", value: man(surgeryBaseCoverage) },
          { label: "실손 예상", value: man(surgeryActualLoss) },
          { label: "준비 합계", value: man(surgeryReady) },
          { label: "부족 가능", value: balanceText(surgeryNeed - surgeryReady) },
          ...surgeryCases.map(s => ({
            label: `${s.name} (${s.surgeryClass})`,
            value: balanceText(averageCost(s) - surgeryCovByType(form, s.surgeryType) - surgeryActualLossAmount(form, s)),
          })),
        ] : [{ label: "안내", value: "수술 항목을 체크하면 항목별 부족 금액이 표시됩니다." }],
      },
      care: {
        title: "간병비",
        need: careNeed,
        ready: careReady,
        rate: clampRate((careReady / (careNeed || 1)) * 100),
        gap: careNeed - careReady,
        note: checkedCareItems.length > 0
          ? `체크한 ${checkedCareItems.length}개 간병 항목 합산 (총 ${careTotalDays}일, 일당 ${form.careDailyCost}만원 기준). 일당 보험금 ${form.careBenefitDaily}만원 준비 기준입니다.`
          : "간병 항목을 체크하면 예상 기간과 일당 기준으로 간병비 부족 금액을 계산합니다.",
        details: checkedCareItems.length > 0 ? [
          { label: "체크 항목 수", value: `${checkedCareItems.length}개` },
          { label: "총 예상 기간", value: `${careTotalDays}일` },
          { label: "일당 단가", value: man(form.careDailyCost) },
          { label: "현재 일당 보험금", value: man(form.careBenefitDaily) },
          { label: "필요 합계", value: man(careNeed) },
          { label: "준비 합계", value: man(careReady) },
          { label: "부족 가능", value: balanceText(careNeed - careReady) },
        ] : [{ label: "안내", value: "간병 항목을 체크하면 세부 내역이 표시됩니다." }],
      },
      treatment: (() => {
        const allTreatmentItems = [...TREATMENT_CASES, ...SURGERY_CASES.map((s) => ({ ...s, category: "surgery" as TreatmentCat, benefitKey: null as null, isOutpatient: false, noActualLoss: undefined, outpatientVisits: undefined }))]
        const checkedItems = allTreatmentItems.filter((item) => form.selectedTreatmentItems.includes(item.id))
        if (checkedItems.length === 0) {
          return { title: "치료방법", need: 0, ready: 0, rate: 0, gap: 0, note: "치료 항목을 선택하면 예상 비용과 준비된 보험금을 비교합니다." }
        }
        const txNeed = checkedItems.reduce((sum, item) => sum + Math.round((item.costMin + item.costMax) / 2), 0)
        // ★ Bug1 수정: benefitKey 직접 매핑 + 중복 집계 방지 (같은 키 한 번만 합산)
        const checkedTxItems = checkedItems.filter(i => i.category !== "surgery")
        const usedBenefitKeys = new Set<TxBenefitKey>()
        checkedTxItems.forEach(i => { if (i.benefitKey) usedBenefitKeys.add(i.benefitKey as TxBenefitKey) })
        const txBenefitTotal = Array.from(usedBenefitKeys).reduce((sum, key) => sum + getTxItemBenefit(form, key), 0)
        // 수술 항목: surgeryType별 정액 수술비
        const txSurgeryBenefit = checkedItems
          .filter(i => i.category === "surgery")
          .reduce((sum, item) => {
            const sItem = SURGERY_CASES.find(s => s.id === item.id)
            return sum + surgeryCovByType(form, sItem?.surgeryType ?? "general")
          }, 0)
        // ★ Bug2 수정: 실손 — 통원 항목은 realLossOutpatient×횟수, 입원은 realLossInpatient 한도
        const txActualLoss = checkedItems.reduce((sum, item) => {
          const avgC = Math.round((item.costMin + item.costMax) / 2)
          if (item.category === "surgery") {
            const sItem = SURGERY_CASES.find(s => s.id === item.id)
            return sum + surgeryActualLossAmount(form, sItem ?? (item as unknown as typeof SURGERY_CASES[0]))
          }
          const tc = TREATMENT_CASES.find(t => t.id === item.id)
          if (!tc) return sum
          return sum + getTxActualLoss(form, tc, avgC)
        }, 0)
        const txReady = txBenefitTotal + txSurgeryBenefit + txActualLoss
        const txRate = clampRate((txReady / (txNeed || 1)) * 100)
        return {
          title: "치료방법",
          need: txNeed,
          ready: txReady,
          rate: txRate,
          gap: txNeed - txReady,
          note: txRate < 50
            ? `선택한 ${checkedItems.length}개 치료 항목 기준 준비율 ${txRate}% — 치료 전용 보험금과 실손 예상 보완액을 합산했습니다. 치료비 보장 보완이 필요합니다.`
            : `선택한 ${checkedItems.length}개 치료 항목 기준 준비율 ${txRate}% — 치료 전용 보험금과 실손 예상 보완액 기준입니다.`,
          details: checkedItems.length > 0 ? [
            { label: "체크 항목 수", value: `${checkedItems.length}개` },
            { label: "예상 비용 합산", value: man(txNeed) },
            { label: "치료비 보험금", value: man(txBenefitTotal + txSurgeryBenefit) },
            { label: "실손 예상", value: man(txActualLoss) },
            { label: "준비 합계", value: man(txReady) },
            { label: "부족 가능", value: balanceText(txNeed - txReady) },
          ] : [{ label: "안내", value: "치료 항목을 선택하면 세부 내역이 표시됩니다." }],
        }
      })(),
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
  const selectedSurgeryCases = SURGERY_CASES.filter((item) => form.selectedTreatmentItems.includes(item.id))
  const surgeryFixedCoveragePerCase = form.diseaseSurgery + form.majorSurgery + form.nsurgery
  const surgeryNeedTotal = selectedSurgeryCases.reduce((sum, item) => sum + averageCost(item), 0)
  const surgeryFixedCoverageTotal = surgeryFixedCoveragePerCase * selectedSurgeryCases.length
  const surgeryActualLossTotal = selectedSurgeryCases.reduce((sum, item) => sum + surgeryActualLossAmount(form, item), 0)
  const surgeryReadyTotal = surgeryFixedCoverageTotal + surgeryActualLossTotal
  const surgeryGapTotal = surgeryNeedTotal - surgeryReadyTotal
  const rateItems = resultList.filter(item => item.title !== "치료방법" || form.selectedTreatmentItems.length > 0)
  const averageRate = clampRate(rateItems.reduce((sum, item) => sum + item.rate, 0) / Math.max(1, rateItems.length))
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
        : legacyForm.selectedSurgeryCase ? [legacyForm.selectedSurgeryCase] : [],
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

  if (checking) return <LoadingScreen message="접근 권한을 확인하고 있습니다" />
  if (!allowed) return <CenterMessage title="사용 권한이 없습니다" body={lockedReason} action={() => router.push("/dashboard")} />

  return (
    <main className="min-h-screen bg-[#eef3f8] p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => { if (window.opener) { window.opener.focus(); window.close(); } else { router.push("/dashboard"); } }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
            <ArrowLeft className="h-4 w-4" /> 대시보드
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="new-pulse-badge rounded-full px-3 py-1 text-xs font-black text-white">NEW 첫 상담 보장체크</span>
            <button onClick={saveCase} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a3a6e] px-4 py-2 text-sm font-black text-white shadow-sm">
              <Save className="h-4 w-4" /> 저장
            </button>
            <button onClick={() => setShowPremiumGuide(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-violet-700">
              보험료 구조
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

        {/* 보험료 구조 팝업 모달 */}
        {showPremiumGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5" onClick={() => setShowPremiumGuide(false)}>
            <div className="relative max-h-[86vh] w-[min(94vw,980px)] overflow-hidden rounded-3xl bg-white shadow-2xl sm:w-[min(86vw,980px)] lg:max-h-[70vh] lg:w-[70vw]" onClick={(e) => e.stopPropagation()}>
              {/* 헤더 */}
              <div className="bg-[#1A2744] px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-white/60 uppercase tracking-widest mb-1">Insurance Premium Structure</p>
                  <h2 className="text-xl font-black text-white">보험료 차이 구조 한눈에 보기</h2>
                </div>
                <button onClick={() => setShowPremiumGuide(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 text-lg font-black">✕</button>
              </div>

              <div className="grid max-h-[calc(86vh-76px)] gap-3 overflow-y-auto p-4 lg:max-h-[calc(70vh-76px)] lg:grid-cols-[minmax(0,1fr)_240px]">
                {/* 핵심 강조 배너 */}
                <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 p-3 lg:col-start-2 lg:row-start-1">
                  <p className="text-xs font-black text-rose-600 uppercase tracking-wide mb-1">핵심 포인트</p>
                  <p className="text-base font-black text-rose-800">
                    표준형 ↔ 유병자보험(325) 기준 보험료 차이 <span className="text-rose-600">최대 40~60%</span>
                  </p>
                  <p className="mt-1 text-sm font-bold text-rose-700">각 단계 간 차이는 약 10~15% 수준. 단계가 낮아질수록 비용 부담이 급증합니다.</p>
                </div>

                {/* 테이블 + 화살표 */}
                <div className="flex gap-3 items-stretch lg:col-start-1 lg:row-span-3 lg:row-start-1">
                  {/* 테이블 */}
                  <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#1A2744] text-white">
                          <th className="px-4 py-2 text-left font-black text-xs w-[34%]">유형</th>
                          <th className="px-3 py-2 text-center font-black text-xs w-[16%]">코드</th>
                          <th className="px-4 py-2 text-left font-black text-xs">설명</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 건강고지형 */}
                        <tr className="bg-yellow-50 border-b border-yellow-200">
                          <td className="px-4 py-2 font-black text-yellow-800 text-[13px]" rowSpan={5}>
                            건강고지형<br/><span className="text-xs font-bold text-yellow-600">(할인형)</span>
                          </td>
                          <td className="px-3 py-2 text-center font-black text-[13px] text-[#1A2744] border-b border-yellow-100">3105</td>
                          <td className="px-4 py-2 text-[12px] font-bold text-yellow-800 border-b border-yellow-100">고지에 가입할 수 있는 <span className="font-black">가장 유리한 보험</span></td>
                        </tr>
                        {[["395",""], ["385",""], ["375",""], ["365",""]].map(([code, desc]) => (
                          <tr key={code} className="bg-yellow-50 border-b border-yellow-100">
                            <td className="px-3 py-1.5 text-center text-[12px] font-bold text-yellow-600">{code}</td>
                            <td className="px-4 py-1.5 text-[11px] text-slate-400">{desc}</td>
                          </tr>
                        ))}
                        {/* 표준형 */}
                        <tr className="bg-white border-b-2 border-slate-300">
                          <td className="px-4 py-2.5 font-black text-[13px] text-slate-800 border-r border-slate-200">표준형</td>
                          <td className="px-3 py-2.5 text-center font-black text-[13px] text-[#1A2744]">355</td>
                          <td className="px-4 py-2.5 text-[12px] font-bold text-slate-600">일반적으로 제안받는 표준형</td>
                        </tr>
                        {/* 경증간편형 */}
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td className="px-4 py-2.5 font-black text-[13px] text-slate-700 border-r border-slate-200">경증간편형</td>
                          <td className="px-3 py-2.5 text-center font-black text-[13px] text-amber-700">31010</td>
                          <td className="px-4 py-2.5 text-[12px] font-bold text-slate-600">유병자 보험 중 <span className="font-black">가장 저렴한 옵션</span></td>
                        </tr>
                        {/* 유병자보험 */}
                        <tr className="bg-rose-50/50 border-b border-rose-100">
                          <td className="px-4 py-2 font-black text-[13px] text-rose-800 border-r border-rose-100" rowSpan={3}>유병자보험</td>
                          <td className="px-3 py-2 text-center font-bold text-[12px] text-rose-600 border-b border-rose-100">345</td>
                          <td className="px-4 py-2 text-[11px] text-slate-400 border-b border-rose-100"></td>
                        </tr>
                        <tr className="bg-rose-50/50 border-b border-rose-100">
                          <td className="px-3 py-2 text-center font-bold text-[12px] text-rose-600 border-b border-rose-100">335</td>
                          <td className="px-4 py-2 text-[11px] text-slate-400 border-b border-rose-100"></td>
                        </tr>
                        <tr className="bg-rose-50/50 border-b-2 border-rose-300">
                          <td className="px-3 py-2 text-center font-black text-[13px] text-rose-700">325</td>
                          <td className="px-4 py-2 text-[11px] font-bold text-rose-700">
                            <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">표준 대비 최대 40~60% ↑</span>
                          </td>
                        </tr>
                        {/* 초간편 */}
                        <tr className="bg-slate-100">
                          <td className="px-4 py-2.5 font-black text-[13px] text-slate-600 border-r border-slate-200">초간편</td>
                          <td className="px-3 py-2.5 text-center font-black text-[13px] text-slate-500">-</td>
                          <td className="px-4 py-2.5 text-[12px] font-bold text-slate-500">가장 비싼 보험</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 화살표 + 라벨 */}
                  <div className="relative w-24 shrink-0 self-stretch overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
                    <span className="absolute right-3 top-3 z-10 rounded-xl bg-[#1A2744] px-2.5 py-1.5 text-center text-[10px] font-black leading-tight text-white shadow-sm">보험료<br/>-</span>
                    <span className="absolute bottom-3 right-3 z-10 rounded-xl bg-rose-600 px-2.5 py-1.5 text-center text-[10px] font-black leading-tight text-white shadow-sm">보험료<br/>+</span>
                    <div className="absolute bottom-12 right-8 top-12 w-[2px] rounded-full bg-gradient-to-b from-[#1A2744] via-amber-400 to-rose-600" />
                    <div className="absolute right-8 top-[17%] h-[2px] w-6 rounded-full bg-[#1A2744]/70" />
                    <div className="absolute right-8 top-[32%] h-[2px] w-8 rounded-full bg-amber-400" />
                    <div className="absolute right-8 top-[48%] h-[2px] w-10 rounded-full bg-orange-400" />
                    <div className="absolute right-8 top-[64%] h-[2px] w-14 rounded-full bg-rose-400" />
                    <div className="absolute right-8 top-[80%] h-[2px] w-16 rounded-full bg-rose-500" />
                    <div className="absolute bottom-10 right-8 h-[2px] w-20 rounded-full bg-rose-600" />
                    <p className="absolute bottom-16 left-2 right-2 text-center text-[10px] font-black leading-tight text-rose-700">내려갈수록<br/>부담 증가</p>
                  </div>
                </div>

                {/* 단계별 차이 안내 */}
                <div className="grid grid-cols-2 gap-3 lg:col-start-2 lg:row-start-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-wide mb-1">단계 간 보험료 차이</p>
                    <p className="text-2xl font-black text-blue-800">10~15%</p>
                    <p className="mt-1 text-[11px] font-bold text-blue-700">한 단계 내려갈수록 약 10~15% 추가 부담</p>
                  </div>
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                    <p className="text-[11px] font-black text-rose-600 uppercase tracking-wide mb-1">표준형 vs 325 최대 차이</p>
                    <p className="text-2xl font-black text-rose-700">40~60%</p>
                    <p className="mt-1 text-[11px] font-bold text-rose-700">건강 고지가 핵심. 단계 선택이 보험료를 결정합니다</p>
                  </div>
                </div>

                {/* 핵심 메시지 */}
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 lg:col-start-2 lg:row-start-3">
                  <p className="text-[11px] font-black text-violet-600 uppercase tracking-wide mb-1.5">핵심 메시지</p>
                  <p className="text-sm font-bold leading-7 text-violet-900">
                    상품 수백 개 중 <span className="font-black">단 한 개를 고르는 기준</span>입니다. 저는 단순히 상품만 들이미는 사람이 아닙니다.
                    <span className="font-black"> 정확하게 진단하고, 최적의 설계 및 추천</span>을 해드립니다.
                  </p>
                </div>
              </div>
            </div>
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
                <div className="grid gap-5">
                  {/* 기본 정보 */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <TextInput label="고객명" value={form.customerName} onChange={(v) => update("customerName", v)} />
                    <NumberInput label="나이" value={form.age} onChange={(v) => update("age", v)} suffix="세" />
                    <SelectInput label="성별" value={form.gender} onChange={(v) => update("gender", v as FormState["gender"])} options={[["male", "남성"], ["female", "여성"]]} />
                    <NumberInput label="월 생활비 기준" value={form.monthlyLivingCost} onChange={(v) => update("monthlyLivingCost", v)} suffix="만원" />
                    <NumberInput label="암 치료 중 월 추가 지출" value={form.cancerIndirectMonthlyCost} onChange={(v) => update("cancerIndirectMonthlyCost", v)} suffix="만원" />
                  </div>

                  {/* 실손의료비 보장 */}
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <p className="mb-3 text-xs font-black text-blue-700 uppercase tracking-wide">실손의료비 보장</p>
                    {/* 토글 — 전체 폭 단독 행 */}
                    <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-4 py-3 border border-blue-100">
                      <span className="text-sm font-black text-slate-700">실손 유지 여부</span>
                      <button
                        type="button"
                        onClick={() => update("hasActualLoss", !form.hasActualLoss)}
                        className={`relative h-7 w-13 rounded-full transition-colors focus:outline-none ${form.hasActualLoss ? "bg-blue-600" : "bg-slate-300"}`}
                        style={{ width: 52 }}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${form.hasActualLoss ? "translate-x-7" : "translate-x-1"}`}
                        />
                      </button>
                    </div>
                    {/* 나머지 3개 입력 — 3열 */}
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <NumberInput label="실손 예상 보완율" value={form.actualLossCoverageRate} onChange={(v) => update("actualLossCoverageRate", v)} suffix="%" />
                        <p className="mt-1.5 text-[10px] font-bold text-blue-600">전액본인부담금·선별급여·약관 제외 항목은 별도 부담</p>
                      </div>
                      <div>
                        <NumberInput label="입원 실손 보장 한도" value={form.realLossInpatient} onChange={(v) => update("realLossInpatient", v)} suffix="만원" />
                        <p className="mt-1.5 text-[10px] font-bold text-blue-600">입원 1회 또는 연간 실손 지급 한도 (예: 5,000만원)</p>
                      </div>
                      <div>
                        <NumberInput label="통원 실손 보장 한도" value={form.realLossOutpatient} onChange={(v) => update("realLossOutpatient", v)} suffix="만원/회" />
                        <p className="mt-1.5 text-[10px] font-bold text-blue-600">통원 1회당 실손 지급 한도 (예: 25만원/회)</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl bg-blue-100 px-3 py-2 text-[11px] font-bold text-blue-800 leading-5">
                      입원 실손 한도는 치료방법 탭의 실손 예상 보완액 계산에 반영됩니다. 한도 초과분은 준비금에서 제외합니다.
                    </div>
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
              <Panel title="수술비 입력" desc="현재 보유한 수술비 보장을 입력하세요. 수술 항목 체크는 '치료방법' 탭에서 할 수 있습니다.">
                <div className="grid gap-5">
                  {/* 현재 보장 입력 */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="mb-1 text-xs font-black text-slate-500 uppercase tracking-wide">현재 보유 수술 보장 (수술당 정액)</p>
                    <FieldGrid>
                      <NumberInput label="질병수술비" value={form.diseaseSurgery} onChange={(v) => update("diseaseSurgery", v)} suffix="만원" />
                      <NumberInput label="N대수술비" value={form.majorSurgery} onChange={(v) => update("majorSurgery", v)} suffix="만원" />
                      <NumberInput label="종수술비" value={form.nsurgery} onChange={(v) => update("nsurgery", v)} suffix="만원" />
                    </FieldGrid>
                    <p className="mt-3 text-[10px] font-bold text-slate-400">
                      수술 1건당 받는 정액 수술비 합산 기준입니다. 수술 항목별 예상 비용 비교는 다음 단계인 '치료방법' 탭에서 확인하세요.
                    </p>
                  </div>

                  {/* 수술 종 분류 참고표 */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="mb-3 text-xs font-black text-slate-500 uppercase tracking-wide">수술 종(種) 분류 — 어떤 수술비가 지급되나요?</p>
                    <div className="grid gap-2">
                      {[
                        { label: "질병수술비 (전 수술)", color: "bg-slate-100 text-slate-700", items: "치질, 맹장, 탈장, 백내장(단초점), 관절경, 어깨, 담낭, 갑상선", type: "general" },
                        { label: "질병수술비 + N대수술비", color: "bg-blue-50 text-blue-800", items: "무릎 인공관절, 고관절, 척추, 자궁근종, 연골재생(카티스템), 백내장(다초점)", type: "major" },
                        { label: "질병수술비 + N대수술비 + 종수술비", color: "bg-amber-50 text-amber-800", items: "심장 스텐트, 로봇수술(다빈치)", type: "ndae" },
                      ].map((row) => (
                        <div key={row.type} className={`rounded-xl p-3 ${row.color}`}>
                          <p className="text-[11px] font-black mb-1">{row.label}</p>
                          <p className="text-[10px] font-bold opacity-75">{row.items}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] font-bold text-slate-400">
                      N대수술비: 가장 높은 수술비 기준으로 입력. 종수술비: 심장·로봇 등 고비용 특정 수술에만 추가 지급.
                    </p>
                  </div>

                  {/* 안내 박스 */}
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                    <p className="text-sm font-black text-indigo-800">수술 항목 체크 → 치료방법 탭</p>
                    <p className="mt-2 text-sm font-bold leading-7 text-indigo-700">
                      무릎·척추·백내장·심장 스텐트 등 다빈도 수술 항목별 예상 비용과 현재 준비 금액 비교는
                      <strong className="font-black"> '치료방법' 탭 → 수술</strong>에서 체크할 수 있습니다.
                    </p>
                    <button type="button" onClick={() => setActive("treatment")}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700">
                      치료방법 탭으로 이동 →
                    </button>
                  </div>
                </div>
              </Panel>
            )}
            {active === "care" && (
              <Panel title="간병비 입력" desc="항목을 체크하면 예상 기간과 일당 기준으로 간병비 부족 금액을 바로 확인할 수 있습니다.">
                <div className="grid gap-5">
                  {/* ① 간병 기준 입력 */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-1 text-xs font-black text-slate-500 uppercase tracking-wide">간병 기준 단가 · 현재 보장</p>
                    <FieldGrid>
                      <NumberInput label="간병 1일 단가" value={form.careDailyCost} onChange={(v) => update("careDailyCost", v)} suffix="만원" />
                      <NumberInput label="현재 간병 일당 보험금" value={form.careBenefitDaily} onChange={(v) => update("careBenefitDaily", v)} suffix="만원" />
                    </FieldGrid>
                    <p className="mt-2 text-[10px] font-bold text-slate-400">간병인 1일 평균 단가: 15~20만원 수준. 현재 가입된 간병 일당 금액을 입력하세요.</p>
                  </div>

                  {/* ② 간병 항목 서브탭 */}
                  <div>
                    <div className="flex gap-2 mb-4 border-b border-slate-200 pb-2">
                      {(["cancer","brain","heart","surgery"] as const).map((cat) => {
                        const labels: Record<string, string> = { cancer:"🔴 암", brain:"🟣 뇌", heart:"🟠 심장", surgery:"🟢 수술" }
                        const checkedCount = CARE_ITEMS.filter(i => i.category === cat && form.selectedCareItems.includes(i.id)).length
                        return (
                          <button key={cat} type="button" onClick={() => setActiveCareTab(cat)}
                            className={`flex-1 rounded-xl px-3 py-2 text-[12px] font-black transition-all ${activeCareTab === cat ? "bg-[#1a3a6e] text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                            {labels[cat]}
                            {checkedCount > 0 && <span className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${activeCareTab === cat ? "bg-white/20 text-white" : "bg-[#1a3a6e]/20 text-[#1a3a6e]"}`}>{checkedCount}</span>}
                          </button>
                        )
                      })}
                    </div>

                    {/* 서브탭 설명 */}
                    <p className="mb-3 text-sm font-black text-slate-800">
                      간병 항목 체크
                      <span className="ml-2 text-[11px] font-bold text-slate-400">— 체크하면 예상 일수 · 일당 기준 간병비 부족이 표시됩니다</span>
                    </p>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {CARE_ITEMS.filter(item => item.category === activeCareTab).map((item) => {
                        const checked = form.selectedCareItems.includes(item.id)
                        const itemNeed = item.estDays * form.careDailyCost
                        const itemReady = form.careBenefitDaily * item.estDays
                        const itemGap = itemNeed - itemReady
                        return (
                          <button key={item.id} type="button"
                            onClick={() => update("selectedCareItems", checked ? form.selectedCareItems.filter(id => id !== item.id) : [...form.selectedCareItems, item.id])}
                            className={`rounded-2xl border p-4 text-left transition-all ${checked ? "border-[#1a3a6e] bg-[#eef4fb] shadow-md" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-black text-slate-900 leading-tight">{item.name}</p>
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${checked ? "border-[#1a3a6e] bg-[#1a3a6e] text-white" : "border-slate-300 bg-white text-slate-300"}`}>
                                {checked ? "✓" : ""}
                              </span>
                            </div>
                            <p className="mt-1.5 text-[10px] font-bold text-slate-500 leading-4">{item.desc}</p>
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600">예상 {item.estDays}일</span>
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700">비용 {man(itemNeed)}</span>
                            </div>
                            {checked && (
                              <div className={`mt-2 rounded-xl p-2 ${itemGap > 0 ? "bg-rose-50" : "bg-emerald-50"}`}>
                                <p className={`text-[11px] font-black ${itemGap > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                  {itemGap > 0 ? `부족 ${man(itemGap)}` : `여유 ${man(Math.abs(itemGap))}`}
                                </p>
                                <p className="mt-0.5 text-[9px] text-slate-400">{item.note}</p>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* 체크 없을 때 기존 직접입력 폴백 안내 */}
                    {form.selectedCareItems.length === 0 && (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-black text-slate-500">항목을 체크하지 않으면 아래 직접 입력 일수로 결과를 계산합니다.</p>
                        <FieldGrid className="mt-3">
                          <NumberInput label="암 간병 예상일" value={form.cancerCareDays} onChange={(v) => update("cancerCareDays", v)} suffix="일" />
                          <NumberInput label="뇌 간병 예상일" value={form.brainCareDays} onChange={(v) => update("brainCareDays", v)} suffix="일" />
                          <NumberInput label="심장 간병 예상일" value={form.heartCareDays} onChange={(v) => update("heartCareDays", v)} suffix="일" />
                        </FieldGrid>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            )}
            {active === "treatment" && (
              <Panel title="치료방법 체크" desc="암·뇌·심장·수술 치료 항목을 선택하면 예상 비용과 현재 준비된 보험금을 비교합니다.">
                <div className="grid gap-5">
                  {/* 탭 선택 */}
                  <div className="flex gap-2 border-b border-slate-200 pb-2">
                    {(["cancer","brain","heart","surgery"] as const).map((cat) => {
                      const labels: Record<string, string> = { cancer:"🔴 암", brain:"🟣 뇌", heart:"🟠 심장", surgery:"🟢 수술" }
                      const checkedCount = cat === "surgery"
                        ? SURGERY_CASES.filter(i => form.selectedTreatmentItems.includes(i.id)).length
                        : TREATMENT_CASES.filter(i => i.category === cat && form.selectedTreatmentItems.includes(i.id)).length
                      return (
                        <button key={cat} type="button" onClick={() => setActiveTreatmentTab(cat)}
                          className={`flex-1 rounded-xl px-3 py-2.5 text-[12px] font-black transition-all ${activeTreatmentTab === cat ? "bg-[#1a3a6e] text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                          {labels[cat]}
                          {checkedCount > 0 && (
                            <span className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${activeTreatmentTab === cat ? "bg-white/20 text-white" : "bg-[#1a3a6e]/20 text-[#1a3a6e]"}`}>
                              {checkedCount}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* 카드 목록 */}
                  <div>
                    <p className="mb-3 text-sm font-black text-slate-800">
                      치료 항목 체크
                      <span className="ml-2 text-[11px] font-bold text-slate-400">— 선택하면 예상 비용·준비 보험금·부족 금액이 표시됩니다</span>
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {(activeTreatmentTab === "surgery" ? SURGERY_CASES : TREATMENT_CASES.filter(i => i.category === activeTreatmentTab)).map((item) => {
                        const checked = form.selectedTreatmentItems.includes(item.id)
                        const avgC = Math.round((item.costMin + item.costMax) / 2)
                        const cat = activeTreatmentTab
                        // ★ Bug1 수정: benefitKey 직접 매핑 (카드별 전용 보험금)
                        const sItemCard = SURGERY_CASES.find(s => s.id === item.id)
                        const txCardItem = TREATMENT_CASES.find(t => t.id === item.id)
                        const perItemBase = cat === "surgery"
                          ? surgeryCovByType(form, sItemCard?.surgeryType ?? "general")
                          : getTxItemBenefit(form, txCardItem?.benefitKey ?? null)
                        // ★ Bug2 수정: 통원/입원 실손 구분
                        const actualLoss = txCardItem
                          ? getTxActualLoss(form, txCardItem, avgC)
                          : (form.hasActualLoss ? Math.min(Math.round(avgC * (form.actualLossCoverageRate / 100) * (item.actualLossFactor ?? 0.45)), form.realLossInpatient) : 0)
                        const itemReady = perItemBase + actualLoss
                        const itemGap = avgC - itemReady
                        return (
                          <button key={item.id} type="button"
                            onClick={() => update("selectedTreatmentItems", checked ? form.selectedTreatmentItems.filter(id => id !== item.id) : [...form.selectedTreatmentItems, item.id])}
                            className={`rounded-2xl border p-4 text-left transition-all ${checked ? "border-[#1a3a6e] bg-[#eef4fb] shadow-md" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-black text-slate-900 leading-tight">{item.name}</p>
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${checked ? "border-[#1a3a6e] bg-[#1a3a6e] text-white" : "border-slate-300 bg-white text-slate-300"}`}>
                                {checked ? "✓" : ""}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black
                                ${item.coverageType.includes("비급여 중심") ? "bg-red-100 text-red-700" :
                                  item.coverageType.includes("혼합") ? "bg-amber-100 text-amber-700" :
                                  "bg-emerald-100 text-emerald-700"}`}>
                                {item.coverageType}
                              </span>
                              {sItemCard?.surgeryClass && (
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black
                                  ${sItemCard.surgeryType === "ndae" ? "bg-amber-100 text-amber-800" :
                                    sItemCard.surgeryType === "major" ? "bg-blue-100 text-blue-800" :
                                    "bg-slate-100 text-slate-600"}`}>
                                  {sItemCard.surgeryClass}
                                </span>
                              )}
                              {txCardItem?.noActualLoss && (
                                <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black text-slate-600">
                                  실손 미적용
                                </span>
                              )}
                              {txCardItem?.isOutpatient && !txCardItem?.noActualLoss && (
                                <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-black text-sky-700">
                                  통원 실손
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-[10px] font-bold text-slate-500">
                              예상 비용 <span className="text-slate-700 font-black">{item.costMin.toLocaleString()}~{item.costMax.toLocaleString()}만원</span>
                            </p>
                            {checked && (
                              <div className={`mt-2 rounded-xl p-2.5 ${itemGap > 0 ? "bg-rose-50" : "bg-emerald-50"}`}>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-black">
                                  <span className="text-slate-500">상담 기준</span><span className="text-slate-800">{man(avgC)}</span>
                                  <span className="text-slate-500">보험금 배분</span><span className="text-slate-800">{man(perItemBase)}</span>
                                  <span className="text-slate-500">실손 예상</span><span className="text-slate-800">{man(actualLoss)}</span>
                                  <span className={itemGap > 0 ? "text-rose-700 font-black" : "text-emerald-700 font-black"}>
                                    {itemGap > 0 ? "부족 가능" : "여유 예상"}
                                  </span>
                                  <span className={`font-black ${itemGap > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                    {itemGap > 0 ? `-${man(itemGap)}` : `+${man(Math.abs(itemGap))}`}
                                  </span>
                                </div>
                                <p className="mt-1.5 text-[9px] leading-4 text-slate-500">{item.note}</p>
                              </div>
                            )}
                            {!checked && (
                              <p className="mt-2 text-[9px] leading-4 text-slate-400">{item.note.slice(0, 60)}{item.note.length > 60 ? "…" : ""}</p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 선택 요약 */}
                  {form.selectedTreatmentItems.length > 0 && (
                    <div className="rounded-2xl border border-[#bcd6f0] bg-[#f2f8ff] p-4">
                      <p className="text-sm font-black text-[#1a3a6e]">선택된 치료 항목 요약</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {form.selectedTreatmentItems.map((id) => {
                          const it = [...TREATMENT_CASES, ...SURGERY_CASES.map(s => ({...s, category: "surgery" as TreatmentCat}))].find(i => i.id === id)
                          if (!it) return null
                          return (
                            <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#bcd6f0] px-3 py-1 text-[11px] font-black text-[#1a3a6e]">
                              {it.name}
                              <button type="button" onClick={() => update("selectedTreatmentItems", form.selectedTreatmentItems.filter(i => i !== id))} className="text-slate-400 hover:text-rose-600">✕</button>
                            </span>
                          )
                        })}
                      </div>
                      <p className="mt-3 text-[11px] font-bold text-slate-500">결과 탭에서 항목별 예상 부족 금액을 확인할 수 있습니다.</p>
                    </div>
                  )}
                </div>
              </Panel>
            )}
            {active === "result" && (
              <Panel title="보장 공백 진단 결과" desc="첫 상담에서 오늘 확인된 공백을 설명하고, 상세 보장분석으로 이어가기 위한 화면입니다.">
                <div className="result-summary-box mb-4 rounded-2xl border border-[#bcd6f0] bg-[#f2f8ff] p-5">
                  <p className="text-sm font-black text-[#1a3a6e]">{form.customerName || "고객"}님의 현재 준비율</p>
                  <div className="mt-3 flex flex-wrap items-end gap-4">
                    <p className="result-big-rate text-5xl font-black text-[#1a3a6e]">{averageRate}%</p>
                    <p className="max-w-xl text-sm font-bold leading-7 text-slate-600">모두에게 똑같은 보험이 아니라, 현재 상황에서 암·뇌·심장·수술·간병을 어느 정도 감당할 수 있는지 확인한 결과입니다.</p>
                  </div>
                </div>
                <div className="result-cards-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {resultList.map((item) => (
                    <ResultCard
                      key={item.title}
                      item={item}
                      isExpanded={expandedResultKey === item.title}
                      onToggle={() => setExpandedResultKey(prev => prev === item.title ? null : item.title)}
                    />
                  ))}
                </div>
                {expandedResultKey && (
                  <p className="no-print mt-1 text-center text-[10px] font-bold text-slate-400">카드를 다시 클릭하면 닫힙니다</p>
                )}
                <div className="cancer-cost-grid mt-4 grid gap-3 lg:grid-cols-3">
                  <div className="result-card-block rounded-2xl border border-amber-200 bg-amber-50 p-5 lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-black text-amber-800">암 1년 집중치료 비용 구조</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-800">{currentCancerCase.name} · {cancerBenefitLabel} 기준</span>
                    </div>
                    <div className="cancer-cost-inner mt-4 grid gap-3 md:grid-cols-3">
                      <CostBox label="1년 생활비" value={form.monthlyLivingCost * 12} desc="소득 공백과 가족 생활 유지 비용" />
                      <CostBox label="직접 치료비" value={cancerDirectTreatmentNeed} desc="수술, 항암, 방사선, 검사 등 치료 기준" />
                      <CostBox label="직접치료 외 비용" value={form.cancerIndirectMonthlyCost * 12} desc="교통비, 식사, 영양식, 위생용품 등" />
                    </div>
                    <div className="cancer-cost-inner mt-3 grid gap-3 md:grid-cols-3">
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
                <div className="brain-heart-grid mt-4 grid gap-3 lg:grid-cols-2">
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
                    <div className="surgery-inner-grid mt-4 grid gap-3 lg:grid-cols-2">
                      {selectedSurgeryCases.map((item) => {
                        const itemNeed = averageCost(item)
                        const itemActualLoss = surgeryActualLossAmount(form, item)
                        const itemFixedCov = surgeryCovByType(form, item.surgeryType)
                        const itemReady = itemFixedCov + itemActualLoss
                        const itemGap = itemNeed - itemReady
                        return (
                          <div key={item.id} className="rounded-xl bg-white/80 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-base font-black text-indigo-900">{item.name}</p>
                              <div className="flex gap-1">
                                <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-black text-indigo-700">{item.surgeryClass}</span>
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">{item.coverageType}</span>
                              </div>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs font-black text-indigo-900 sm:grid-cols-2">
                              <p>예상비용 {man(item.costMin)}~{man(item.costMax)}</p>
                              <p>상담 기준 {man(itemNeed)}</p>
                              <p>수술비 보장 {man(itemFixedCov)}</p>
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
                {/* 치료방법 결과 섹션 */}
                {form.selectedTreatmentItems.length > 0 && (() => {
                  const allTx = [...TREATMENT_CASES, ...SURGERY_CASES.map(s => ({...s, category: "surgery" as TreatmentCat}))]
                  const checkedTx = allTx.filter(i => form.selectedTreatmentItems.includes(i.id))
                  const catColors: Record<TreatmentCat, string> = {
                    cancer: "bg-rose-100 text-rose-700",
                    brain: "bg-purple-100 text-purple-700",
                    heart: "bg-orange-100 text-orange-700",
                    surgery: "bg-emerald-100 text-emerald-700",
                  }
                  const catLabel: Record<TreatmentCat, string> = { cancer: "암", brain: "뇌", heart: "심장", surgery: "수술" }
                  return (
                    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-black text-violet-900">선택된 치료방법 항목 ({checkedTx.length}개)</p>
                        <span className={`rounded-full bg-white px-3 py-1 text-xs font-black ${result.treatment.rate < 50 ? "text-rose-700" : result.treatment.rate < 70 ? "text-amber-700" : "text-emerald-700"}`}>
                          전체 {man(result.treatment.need)} 필요 / {man(result.treatment.ready)} 준비 ({result.treatment.rate}%)
                        </span>
                      </div>
                      <div className="treatment-result-grid mt-4 grid gap-3 lg:grid-cols-2">
                        {checkedTx.map((item) => {
                          const cat = item.category as TreatmentCat
                          const avgC = Math.round((item.costMin + item.costMax) / 2)
                          const txSurgeryItem = SURGERY_CASES.find(s => s.id === item.id)
                          const txResultItem = TREATMENT_CASES.find(t => t.id === item.id)
                          // ★ Bug1 수정: benefitKey 직접 매핑
                          const perItemBase = cat === "surgery"
                            ? surgeryCovByType(form, txSurgeryItem?.surgeryType ?? "general")
                            : getTxItemBenefit(form, txResultItem?.benefitKey ?? null)
                          // ★ Bug2 수정: 통원/입원 실손 구분
                          const actualLoss = txResultItem
                            ? getTxActualLoss(form, txResultItem, avgC)
                            : (form.hasActualLoss ? Math.min(Math.round(avgC * (form.actualLossCoverageRate / 100) * (item.actualLossFactor ?? 0.45)), form.realLossInpatient) : 0)
                          const itemReady = perItemBase + actualLoss
                          const itemGap = avgC - itemReady
                          const itemRate = clampRate((itemReady / (avgC || 1)) * 100)
                          return (
                            <div key={item.id} className="rounded-xl bg-white/80 p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${catColors[cat]}`}>{catLabel[cat]}</span>
                                <p className="text-[13px] font-black text-slate-900">{item.name}</p>
                                {txResultItem?.noActualLoss && (
                                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black text-slate-600">실손 미적용</span>
                                )}
                                {txResultItem?.isOutpatient && !txResultItem?.noActualLoss && (
                                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-black text-sky-700">통원 실손</span>
                                )}
                                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black ${itemRate >= 70 ? "bg-emerald-100 text-emerald-700" : itemRate >= 40 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                                  {itemRate}% 준비
                                </span>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-black text-slate-700 sm:grid-cols-4">
                                <div><span className="font-bold text-slate-400 block">예상 비용</span>{man(avgC)}</div>
                                <div><span className="font-bold text-slate-400 block">보험금</span>{man(perItemBase)}</div>
                                <div>
                                  <span className="font-bold text-slate-400 block">
                                    {txResultItem?.noActualLoss ? "실손(미적용)" : txResultItem?.isOutpatient ? `통원실손(${txResultItem.outpatientVisits ?? 20}회)` : "실손 예상"}
                                  </span>
                                  {txResultItem?.noActualLoss ? <span className="text-slate-400">—</span> : man(actualLoss)}
                                </div>
                                <div className={itemGap > 0 ? "text-rose-700" : "text-emerald-700"}>
                                  <span className="font-bold text-slate-400 block">{itemGap > 0 ? "부족 가능" : "여유 예상"}</span>
                                  {itemGap > 0 ? `-${man(itemGap)}` : `+${man(Math.abs(itemGap))}`}
                                </div>
                              </div>
                              <div className={`mt-3 h-1.5 w-full rounded-full bg-slate-100`}>
                                <div className={`h-1.5 rounded-full ${itemRate >= 70 ? "bg-emerald-500" : itemRate >= 40 ? "bg-amber-400" : "bg-rose-400"}`}
                                  style={{ width: `${itemRate}%` }} />
                              </div>
                              <p className="mt-2 text-[10px] leading-5 text-slate-500">{item.note}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
                <div className="resource-gallery-section"><ResourceGallery /></div>
                <div className="consult-point-box mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
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

function FieldGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className ?? ""}`}>{children}</div>
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-black text-slate-500">{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="h-9 rounded-xl border border-slate-200 px-3 text-[13px] font-bold outline-none focus:border-blue-500" />
    </label>
  )
}

function NumberInput({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-black text-slate-500">{label}</span>
      <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-blue-500">
        <input type="number" value={value} onChange={e => onChange(Number(e.target.value) || 0)}
          className="h-9 min-w-0 flex-1 px-3 text-[13px] font-bold outline-none" />
        {suffix && <span className="flex items-center border-l border-slate-200 px-2.5 text-[11px] font-black text-slate-500">{suffix}</span>}
      </div>
    </label>
  )
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-black text-slate-500">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-9 rounded-xl border border-slate-200 px-2 text-[13px] font-bold outline-none focus:border-blue-500">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-[11px] font-black text-slate-500">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  )
}

function ResultCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: { title: string; need: number; ready: number; rate: number; gap: number; note: string; details?: { label: string; value: string }[] }
  isExpanded: boolean
  onToggle: () => void
}) {
  const surplus = item.gap <= 0
  const rateColor = item.rate >= 80 ? "text-emerald-600" : item.rate >= 50 ? "text-amber-600" : "text-red-600"
  const bgColor = item.rate >= 80 ? "border-emerald-200 bg-emerald-50" : item.rate >= 50 ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"
  const expandBg = item.rate >= 80 ? "bg-emerald-100/60" : item.rate >= 50 ? "bg-amber-100/60" : "bg-red-100/60"
  return (
    <div className={`rounded-2xl border transition-all ${bgColor} ${isExpanded ? "xl:col-span-2" : ""}`}>
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-1">
          <p className="text-[11px] font-black text-slate-500">{item.title}</p>
          <span className="text-[9px] font-black text-slate-400">{isExpanded ? "▲" : "▼"}</span>
        </div>
        <p className={`mt-1 text-2xl font-black ${rateColor}`}>{item.rate}%</p>
        <div className="mt-2 h-1.5 rounded-full bg-white/60">
          <div className={`h-full rounded-full ${item.rate >= 80 ? "bg-emerald-500" : item.rate >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(item.rate, 100)}%` }} />
        </div>
        <p className={`mt-2 text-[12px] font-black ${rateColor}`}>{surplus ? `+${man(Math.abs(item.gap))} 여유` : `-${man(Math.abs(item.gap))} 부족`}</p>
        <p className="mt-1.5 text-[10px] font-bold leading-5 text-slate-500 line-clamp-2">{item.note}</p>
      </button>
      {isExpanded && item.details && (
        <div className={`mx-3 mb-3 rounded-xl p-3 ${expandBg}`}>
          <p className="mb-2 text-[9px] font-black uppercase tracking-wide text-slate-400">세부 내역</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {item.details.map((d, i) => (
              <div key={i} className="flex items-baseline justify-between gap-1 border-b border-white/40 pb-0.5">
                <span className="text-[9px] font-bold text-slate-500 shrink-0">{d.label}</span>
                <span className="text-[10px] font-black text-slate-800 text-right">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CostBox({ label, value, desc }: { label: string; value: number; desc: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-[10px] font-black text-slate-500">{label}</p>
      <p className="mt-1 text-[16px] font-black text-slate-900">{man(value)}</p>
      <p className="mt-1 text-[10px] font-bold leading-4 text-slate-400">{desc}</p>
    </div>
  )
}

function SmallTextCost({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-[10px] font-black text-slate-500">{label}</p>
      <p className={`mt-1 text-[14px] font-black ${tone}`}>{value}</p>
    </div>
  )
}

function SmallCost({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-[10px] font-black text-slate-500">{label}</p>
      <p className={`mt-1 text-[16px] font-black ${tone}`}>{man(value)}</p>
    </div>
  )
}

function CostStructure({ title, tone, living, treatment, indirectItems, desc }: {
  title: string; tone: "blue" | "rose"; living: number; treatment: number; indirectItems: string; desc: string
}) {
  const borderColor = tone === "blue" ? "border-blue-200 bg-blue-50" : "border-rose-200 bg-rose-50"
  const headColor = tone === "blue" ? "text-blue-900" : "text-rose-900"
  const bodyColor = tone === "blue" ? "text-blue-800" : "text-rose-800"
  return (
    <div className={`rounded-2xl border p-5 ${borderColor}`}>
      <p className={`text-sm font-black ${headColor}`}>{title}</p>
      <div className="mt-3 grid gap-2">
        <div className="rounded-xl bg-white p-3">
          <p className="text-[10px] font-black text-slate-500">생활비 공백 (6개월)</p>
          <p className={`mt-1 text-[16px] font-black ${headColor}`}>{man(living)}</p>
        </div>
        <div className="rounded-xl bg-white p-3">
          <p className="text-[10px] font-black text-slate-500">직접 치료비 기준</p>
          <p className={`mt-1 text-[16px] font-black ${headColor}`}>{man(treatment)}만원</p>
        </div>
        <div className="rounded-xl bg-white p-3">
          <p className="text-[10px] font-black text-slate-500">직접치료 외 비용</p>
          <p className={`mt-1 text-[11px] font-bold leading-5 ${bodyColor}`}>{indirectItems}</p>
        </div>
      </div>
      <p className={`mt-3 text-[11px] font-bold leading-6 ${bodyColor}`}>{desc}</p>
    </div>
  )
}

function ResourceGallery() {
  const items = [
    { label: "암 통계 자료", desc: "국가암등록 통계 · 연간 발생률 현황", href: "/insurance-tools/coverage-stats" },
    { label: "보장별 통계", desc: "뇌·심장·수술 통계 이미지", href: "/insurance-tools/coverage-stats" },
    { label: "질병코드 조회", desc: "KCD 질병분류 검색", href: "https://kcdcode.kr/browse/main" },
  ]
  const handleOpen = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer")
  }
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-black text-slate-800">상담 참고 자료</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <button key={item.label} type="button" onClick={() => handleOpen(item.href)}
            className="rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50">
            <p className="text-[12px] font-black text-slate-700">{item.label}</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
