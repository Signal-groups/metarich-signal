"use client"

import { useMemo, useState } from "react"
import { RotateCcw, TrendingDown, Info, Zap } from "lucide-react"

// ─── 타입 정의 ─────────────────────────────────────────────
type MainTab = "health" | "death" | "saving"
type ViewTab = "company" | "coverage"
type CompanyType = "생명" | "손해"
type CompanyFilter = "전체" | CompanyType
type PlanId = "min" | "standard" | "max"
type Disclosure = "325" | "335" | "355" | "standard"
type AgeBand = "30s" | "40s" | "50s" | "60s"
type SensitivityTag = "나이" | "성별" | "유병력"

function getAgeBand(age: number): AgeBand {
  if (age < 40) return "30s"
  if (age < 50) return "40s"
  if (age < 60) return "50s"
  return "60s"
}

type Company = {
  id: string
  name: string
  type: CompanyType
  savingRate: number
  refund5: number
  refund7: number
  refund10: number
  uwNote: string
  uwStrength: string[]
}

type SavingResult = {
  company: Company
  futureValue: number
  pension: number
}

type Coverage = {
  id: string
  title: string
  category: "암" | "뇌심장" | "수술" | "간병" | "사망" | "저축"
  amount: Record<PlanId, number>
  unit: string
  baseRate: number
  benefit: string
  strength: string
  checkPoint: string
  sensitivityTags: SensitivityTag[]
  rankNote: string
}

// ─── 담보 × 회사 경쟁력 계수 (1.0 = 시장평균, 0.87 = 13% 저렴) ───
const coverageCompanyFactors: Record<string, Record<string, number>> = {
  cancer:          { sl: 1.08, hl: 1.04, kyobo: 1.12, shinhan: 1.06, kbLife: 1.10, sf: 0.98, hyundai: 0.90, db: 0.92, kb: 0.94, meritz: 0.87, hanwhaFire: 1.02, heungkukFire: 1.05 },
  similar:         { sl: 1.07, hl: 1.05, kyobo: 1.11, shinhan: 1.04, kbLife: 1.09, sf: 0.96, hyundai: 0.91, db: 0.89, kb: 0.93, meritz: 0.86, hanwhaFire: 1.01, heungkukFire: 1.00 },
  brain:           { sl: 1.07, hl: 1.05, kyobo: 1.12, shinhan: 1.08, kbLife: 1.10, sf: 0.96, hyundai: 0.91, db: 0.88, kb: 0.93, meritz: 0.90, hanwhaFire: 1.00, heungkukFire: 1.03 },
  heart:           { sl: 1.06, hl: 1.07, kyobo: 1.13, shinhan: 1.09, kbLife: 1.11, sf: 0.97, hyundai: 0.92, db: 0.86, kb: 0.94, meritz: 0.89, hanwhaFire: 1.03, heungkukFire: 1.01 },
  surgery:         { sl: 1.05, hl: 1.06, kyobo: 1.09, shinhan: 1.07, kbLife: 1.08, sf: 0.93, hyundai: 0.89, db: 0.95, kb: 0.91, meritz: 0.97, hanwhaFire: 0.99, heungkukFire: 1.02 },
  nSurgery:        { sl: 1.04, hl: 1.05, kyobo: 1.08, shinhan: 1.06, kbLife: 1.07, sf: 0.88, hyundai: 0.90, db: 0.94, kb: 0.92, meritz: 0.96, hanwhaFire: 1.01, heungkukFire: 0.99 },
  cancerTreatment: { sl: 1.05, hl: 1.06, kyobo: 1.10, shinhan: 1.07, kbLife: 1.08, sf: 0.96, hyundai: 0.90, db: 0.91, kb: 0.93, meritz: 0.88, hanwhaFire: 1.02, heungkukFire: 1.00 },
  circulatory:     { sl: 1.05, hl: 1.07, kyobo: 1.10, shinhan: 1.06, kbLife: 1.08, sf: 0.95, hyundai: 0.91, db: 0.87, kb: 0.93, meritz: 0.89, hanwhaFire: 1.01, heungkukFire: 0.99 },
  care:            { sl: 0.92, hl: 0.94, kyobo: 0.96, shinhan: 0.88, kbLife: 0.90, sf: 1.03, hyundai: 1.05, db: 1.07, kb: 1.02, meritz: 1.08, hanwhaFire: 1.09, heungkukFire: 1.11 },
  whole:           { sl: 0.88, hl: 0.92, kyobo: 0.90, shinhan: 0.94, kbLife: 0.95, sf: 1.10, hyundai: 1.12, db: 1.14, kb: 1.11, meritz: 1.15, hanwhaFire: 1.13, heungkukFire: 1.09 },
  term:            { sl: 0.91, hl: 0.92, kyobo: 0.93, shinhan: 0.88, kbLife: 0.90, sf: 1.08, hyundai: 1.10, db: 1.13, kb: 1.11, meritz: 1.14, hanwhaFire: 1.12, heungkukFire: 1.09 },
  diseaseDeath:    { sl: 0.89, hl: 0.91, kyobo: 0.92, shinhan: 0.93, kbLife: 0.94, sf: 1.07, hyundai: 1.09, db: 1.12, kb: 1.10, meritz: 1.13, hanwhaFire: 1.11, heungkukFire: 1.08 },
}

// ─── 담보별 나이대 민감도 (40대 기준 = 1.00) ───────────────
const coverageAgeBandFactors: Record<string, Record<AgeBand, number>> = {
  cancer:          { "30s": 0.80, "40s": 1.00, "50s": 1.48, "60s": 2.30 },
  similar:         { "30s": 0.85, "40s": 1.00, "50s": 1.30, "60s": 1.78 },
  brain:           { "30s": 0.68, "40s": 1.00, "50s": 1.68, "60s": 2.92 },
  heart:           { "30s": 0.65, "40s": 1.00, "50s": 1.76, "60s": 3.18 },
  surgery:         { "30s": 0.88, "40s": 1.00, "50s": 1.24, "60s": 1.58 },
  nSurgery:        { "30s": 0.77, "40s": 1.00, "50s": 1.43, "60s": 2.12 },
  cancerTreatment: { "30s": 0.80, "40s": 1.00, "50s": 1.48, "60s": 2.24 },
  circulatory:     { "30s": 0.70, "40s": 1.00, "50s": 1.62, "60s": 2.78 },
  care:            { "30s": 0.55, "40s": 1.00, "50s": 1.90, "60s": 3.85 },
  whole:           { "30s": 0.72, "40s": 1.00, "50s": 1.54, "60s": 2.62 },
  term:            { "30s": 0.65, "40s": 1.00, "50s": 1.50, "60s": 2.45 },
  diseaseDeath:    { "30s": 0.68, "40s": 1.00, "50s": 1.58, "60s": 2.58 },
}

// ─── 담보별 성별 계수 ─────────────────────────────────────
const coverageGenderFactors: Record<string, Record<string, number>> = {
  cancer:          { "남성": 1.06, "여성": 0.96 },
  similar:         { "남성": 0.80, "여성": 1.28 },
  brain:           { "남성": 1.24, "여성": 0.82 },
  heart:           { "남성": 1.30, "여성": 0.77 },
  surgery:         { "남성": 1.05, "여성": 0.97 },
  nSurgery:        { "남성": 1.09, "여성": 0.93 },
  cancerTreatment: { "남성": 1.06, "여성": 0.96 },
  circulatory:     { "남성": 1.22, "여성": 0.84 },
  care:            { "남성": 0.93, "여성": 1.10 },
  whole:           { "남성": 1.20, "여성": 0.85 },
  term:            { "남성": 1.22, "여성": 0.83 },
  diseaseDeath:    { "남성": 1.18, "여성": 0.87 },
}

// ─── 회사별 간편고지 할증 계수 ────────────────────────────
const companyDisclosureFactors: Record<string, Record<Disclosure, number>> = {
  meritz:       { standard: 1.0, "325": 1.12, "335": 1.20, "355": 1.30 },
  kb:           { standard: 1.0, "325": 1.13, "335": 1.22, "355": 1.32 },
  hyundai:      { standard: 1.0, "325": 1.15, "335": 1.24, "355": 1.34 },
  db:           { standard: 1.0, "325": 1.16, "335": 1.25, "355": 1.35 },
  sf:           { standard: 1.0, "325": 1.18, "335": 1.27, "355": 1.37 },
  hanwhaFire:   { standard: 1.0, "325": 1.17, "335": 1.26, "355": 1.36 },
  heungkukFire: { standard: 1.0, "325": 1.19, "335": 1.28, "355": 1.38 },
  sl:           { standard: 1.0, "325": 1.21, "335": 1.32, "355": 1.44 },
  kyobo:        { standard: 1.0, "325": 1.23, "335": 1.34, "355": 1.46 },
  hl:           { standard: 1.0, "325": 1.20, "335": 1.30, "355": 1.42 },
  shinhan:      { standard: 1.0, "325": 1.16, "335": 1.26, "355": 1.37 },
  kbLife:       { standard: 1.0, "325": 1.17, "335": 1.27, "355": 1.38 },
}

// ─── 회사 데이터 ──────────────────────────────────────────
const companies: Company[] = [
  { id: "sl",           name: "삼성생명",   type: "생명", savingRate: 3.05, refund5: 91, refund7: 97,  refund10: 104, uwNote: "심사 엄격 · 간편고지 할증 높음",          uwStrength: ["종신보험", "정기특약"] },
  { id: "hl",           name: "한화생명",   type: "생명", savingRate: 3.15, refund5: 92, refund7: 98,  refund10: 105, uwNote: "생보 표준 심사 · 간편고지 중간",           uwStrength: ["질병사망", "종신보험"] },
  { id: "kyobo",        name: "교보생명",   type: "생명", savingRate: 3.0,  refund5: 90, refund7: 97,  refund10: 104, uwNote: "심사 엄격 · 간병보험 경쟁력",             uwStrength: ["간병/재가", "종신보험"] },
  { id: "shinhan",      name: "신한라이프", type: "생명", savingRate: 3.18, refund5: 91, refund7: 99,  refund10: 106, uwNote: "간편고지 손보 수준 · 사망보험 경쟁력",     uwStrength: ["간병/재가", "정기특약"] },
  { id: "kbLife",       name: "KB라이프",   type: "생명", savingRate: 3.1,  refund5: 90, refund7: 98,  refund10: 105, uwNote: "간편고지 중간 · 간병 강세",               uwStrength: ["간병/재가", "정기특약"] },
  { id: "sf",           name: "삼성화재",   type: "손해", savingRate: 2.85, refund5: 88, refund7: 94,  refund10: 101, uwNote: "표준 심사 · 수술비 계열 강세",            uwStrength: ["N대수술비", "질병수술비"] },
  { id: "hyundai",      name: "현대해상",   type: "손해", savingRate: 2.9,  refund5: 89, refund7: 95,  refund10: 102, uwNote: "암·뇌혈관 경쟁력 · 간편고지 유리",       uwStrength: ["암진단비", "유사암진단비"] },
  { id: "db",           name: "DB손보",     type: "손해", savingRate: 2.82, refund5: 88, refund7: 94,  refund10: 101, uwNote: "뇌심장 담보 업계 최저 수준",              uwStrength: ["뇌혈관진단비", "허혈성심장질환"] },
  { id: "kb",           name: "KB손보",     type: "손해", savingRate: 2.88, refund5: 89, refund7: 95,  refund10: 102, uwNote: "간편고지 적극 인수 · 전 담보 중하위",    uwStrength: ["암진단비", "유사암진단비"] },
  { id: "meritz",       name: "메리츠화재", type: "손해", savingRate: 2.8,  refund5: 88, refund7: 94,  refund10: 101, uwNote: "간편고지 가장 유연 · 암 담보 최저",       uwStrength: ["암진단비", "암주요치료비"] },
  { id: "hanwhaFire",   name: "한화손보",   type: "손해", savingRate: 2.86, refund5: 89, refund7: 95,  refund10: 102, uwNote: "전 담보 중간 · 간편고지 중간",            uwStrength: ["질병수술비"] },
  { id: "heungkukFire", name: "흥국화재",   type: "손해", savingRate: 2.84, refund5: 88, refund7: 95,  refund10: 102, uwNote: "소규모 손보 · N대수술비 경쟁력",          uwStrength: ["N대수술비"] },
]

// ─── 담보 데이터 ─────────────────────────────────────────
const healthCoverages: Coverage[] = [
  {
    id: "cancer", title: "암진단비", category: "암",
    amount: { min: 2000, standard: 3000, max: 5000 }, unit: "만원", baseRate: 4.9,
    benefit: "일반암 진단 시 생활비와 치료 선택자금 확보",
    strength: "일반암 범위, 유사암 지급비율, 소액암 분류가 중요",
    checkPoint: "면책 90일, 감액기간, 유사암 한도 확인",
    sensitivityTags: ["나이", "유병력"],
    rankNote: "50대 이상 보험료 급증 · 손보사가 평균 15% 저렴하나 유병력 고지 시 회사별 격차 더 커짐",
  },
  {
    id: "similar", title: "유사암진단비", category: "암",
    amount: { min: 300, standard: 500, max: 1000 }, unit: "만원", baseRate: 2.2,
    benefit: "갑상선암, 기타피부암, 제자리암, 경계성종양 보완",
    strength: "소액 보장이지만 실제 청구 빈도가 높은 편",
    checkPoint: "일반암과 지급금액 차이 확인",
    sensitivityTags: ["성별"],
    rankNote: "여성이 남성 대비 약 60% 더 비쌈(갑상선암 빈도 차이) · 성별에 따라 회사 순위 완전히 달라짐",
  },
  {
    id: "brain", title: "뇌혈관진단비", category: "뇌심장",
    amount: { min: 500, standard: 1000, max: 2000 }, unit: "만원", baseRate: 6.1,
    benefit: "뇌출혈보다 넓은 뇌혈관질환 범위 보완",
    strength: "보장범위가 넓을수록 실제 청구 가능성이 커짐",
    checkPoint: "뇌출혈/뇌졸중/뇌혈관질환 구분",
    sensitivityTags: ["나이", "성별"],
    rankNote: "남성이 여성 대비 51% 더 비쌈 · 60대는 40대 대비 3배 가까이 상승 · DB손보 업계 최저 수준",
  },
  {
    id: "heart", title: "허혈성심장질환", category: "뇌심장",
    amount: { min: 500, standard: 1000, max: 2000 }, unit: "만원", baseRate: 5.4,
    benefit: "급성심근경색보다 넓은 심장질환 범위 보완",
    strength: "협심증까지 보는지 확인하면 비교가 쉬움",
    checkPoint: "급성심근경색/허혈성심장질환 구분",
    sensitivityTags: ["나이", "성별"],
    rankNote: "성별 차이가 가장 큰 담보 · 남성 30% 이상 비쌈 · 60대 남성은 40대 남성 대비 3.5배 이상",
  },
  {
    id: "surgery", title: "질병수술비", category: "수술",
    amount: { min: 10, standard: 30, max: 50 }, unit: "만원", baseRate: 92,
    benefit: "진단비 외 실제 수술 발생 시 반복 보완",
    strength: "넓게 반복 지급되는 구조가 실무적으로 유리",
    checkPoint: "동일질병 반복 지급, 약관상 수술 정의 확인",
    sensitivityTags: ["나이"],
    rankNote: "나이 민감도가 상대적으로 낮은 담보 · 현대해상·KB손보가 경쟁력 높음",
  },
  {
    id: "nSurgery", title: "N대수술비", category: "수술",
    amount: { min: 500, standard: 1000, max: 2000 }, unit: "만원", baseRate: 2.8,
    benefit: "암, 뇌, 심장 등 고액 수술 집중 보완",
    strength: "특정 수술 목록이 넓고 명확한 회사가 유리",
    checkPoint: "목록형 담보라 포함/제외 수술 확인",
    sensitivityTags: ["나이", "성별"],
    rankNote: "삼성화재가 손보 중 최저 수준 · 나이 오를수록 생보·손보 간 격차 더 커짐",
  },
  {
    id: "cancerTreatment", title: "암주요치료비", category: "암",
    amount: { min: 1000, standard: 2000, max: 3000 }, unit: "만원", baseRate: 3.7,
    benefit: "항암, 방사선, 표적·면역 치료 선택지 보완",
    strength: "진단비는 생활비, 주요치료비는 치료비로 분리",
    checkPoint: "치료 인정 범위, 연간 한도, 지급 횟수 확인",
    sensitivityTags: ["나이", "유병력"],
    rankNote: "메리츠화재가 암 관련 담보 전반 강세 · 유병력 고지 시 손보·생보 가격차 확대",
  },
  {
    id: "circulatory", title: "순환계주요치료비", category: "뇌심장",
    amount: { min: 500, standard: 1000, max: 2000 }, unit: "만원", baseRate: 3.2,
    benefit: "시술, 수술, 중환자실, 재활 비용 보완",
    strength: "진단 후 치료 과정까지 설명하기 좋음",
    checkPoint: "보장 질병명과 치료 항목 확인",
    sensitivityTags: ["나이", "성별"],
    rankNote: "DB손보·메리츠 강세 · 남성 60대는 여성 40대 대비 보험료 4배 이상 차이 가능",
  },
  {
    id: "care", title: "간병/재가", category: "간병",
    amount: { min: 50, standard: 100, max: 150 }, unit: "만원", baseRate: 38,
    benefit: "장기요양, 가족 소득공백, 돌봄 비용 보완",
    strength: "간병보험과 재가보험 사용 장소를 구분",
    checkPoint: "장기요양 등급, 갱신, 지급기간 확인",
    sensitivityTags: ["나이", "성별"],
    rankNote: "나이 민감도 최고 담보 · 60대 가입은 40대 대비 약 4배 · 생보(신한·KB라이프) 강세",
  },
]

const deathCoverages: Coverage[] = [
  {
    id: "whole", title: "종신보험", category: "사망",
    amount: { min: 5000, standard: 10000, max: 20000 }, unit: "만원", baseRate: 1.65,
    benefit: "평생 사망보장과 상속·유족 생활비 재원",
    strength: "장기 유지와 자산 이전 목적에 적합",
    checkPoint: "해약환급금, 저해약 구조, 수익자 확인",
    sensitivityTags: ["나이", "성별"],
    rankNote: "대형 생보사(삼성·교보·한화)가 압도적 유리 · 손보 가입 시 20% 이상 비쌀 수 있음",
  },
  {
    id: "term", title: "정기특약/정기보험", category: "사망",
    amount: { min: 5000, standard: 10000, max: 20000 }, unit: "만원", baseRate: 0.42,
    benefit: "자녀 독립 전까지 큰 사망보장을 저렴하게 준비",
    strength: "같은 사망보험금 기준 보험료 효율이 높음",
    checkPoint: "만기 이후 보장 종료, 갱신 여부 확인",
    sensitivityTags: ["나이", "성별"],
    rankNote: "신한라이프·KB라이프 정기 담보 강세 · 유병력 시 생보 가입 자체가 제한될 수 있음",
  },
  {
    id: "diseaseDeath", title: "질병사망", category: "사망",
    amount: { min: 3000, standard: 5000, max: 10000 }, unit: "만원", baseRate: 0.72,
    benefit: "질병으로 인한 사망보장 별도 보완",
    strength: "종신보다 기간형 보완으로 쓰기 좋음",
    checkPoint: "재해사망 제외 여부와 보험기간 확인",
    sensitivityTags: ["나이", "성별", "유병력"],
    rankNote: "생보 강세이지만 유병력 시 손보가 오히려 유리해지는 역전 현상 발생",
  },
]

// ─── 레이블/상수 ─────────────────────────────────────────
const planLabels: Record<PlanId, string> = { min: "1안 최소", standard: "2안 표준", max: "3안 최대" }
const disclosureLabels: Record<Disclosure, string> = { standard: "일반고지", "325": "간편 3·2·5", "335": "간편 3·3·5", "355": "간편 3·5·5" }
const refundYears = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 40]

const formatWon = (value: number) => `${Math.round(value).toLocaleString()}원`
const formatMan = (value: number) => `${value.toLocaleString()}만원`

// ─── 보험료 계산 (담보×회사 개별 계수 적용) ─────────────
function premiumFor(company: Company, coverage: Coverage, plan: PlanId, age: number, gender: string, disclosure: Disclosure, delayYears = 0) {
  const amount = coverage.amount[plan]
  const targetAge = age + delayYears

  // 나이대별 계수 + 구간 내 보간
  const bands: AgeBand[] = ["30s", "40s", "50s", "60s"]
  const bandStarts = [25, 35, 45, 55, 70]
  const ageBand = getAgeBand(targetAge)
  const bandIdx = bands.indexOf(ageBand)
  const t = Math.max(0, Math.min(1, (targetAge - bandStarts[bandIdx]) / (bandStarts[bandIdx + 1] - bandStarts[bandIdx])))
  const thisBandFactor = coverageAgeBandFactors[coverage.id]?.[ageBand] ?? 1.0
  const nextBand = bands[Math.min(bandIdx + 1, bands.length - 1)]
  const nextBandFactor = coverageAgeBandFactors[coverage.id]?.[nextBand] ?? thisBandFactor
  const ageFactor = thisBandFactor + (nextBandFactor - thisBandFactor) * t

  const genderFactor = coverageGenderFactors[coverage.id]?.[gender] ?? 1.0
  const disclosureFactor = companyDisclosureFactors[company.id]?.[disclosure] ?? 1.0
  const covCompFactor = coverageCompanyFactors[coverage.id]?.[company.id] ?? 1.0

  return Math.round(amount * coverage.baseRate * ageFactor * genderFactor * disclosureFactor * covCompFactor)
}

function refundRateFor(company: Company, year: number, payYears: number) {
  if (year <= 1) return Math.max(0, 18 + company.refund5 * 0.06)
  if (year <= 5) return Math.max(0, company.refund5 * (year / 5))
  if (year <= 7) return company.refund5 + ((company.refund7 - company.refund5) * (year - 5)) / 2
  if (year <= 10) return company.refund7 + ((company.refund10 - company.refund7) * (year - 7)) / 3
  const longBonus = Math.min(65, (year - 10) * (company.savingRate * 0.72))
  const payBonus = payYears <= 10 ? 8 : payYears <= 20 ? 4 : 2
  return company.refund10 + longBonus + payBonus
}

function refundAmountFor(company: Company, year: number, monthlySaving: number, payYears: number) {
  const paidMonths = Math.min(year, payYears) * 12
  const paid = monthlySaving * paidMonths
  return paid * (refundRateFor(company, year, payYears) / 100)
}

// ─── 메인 컴포넌트 ────────────────────────────────────────
type AppliedConditions = {
  age: number; gender: string; disclosure: Disclosure
  companyFilter: CompanyFilter; plan: PlanId
  payYears: number; delayYears: number; monthlySaving: number
}

const DEFAULT_CONDITIONS: AppliedConditions = {
  age: 41, gender: "남성", disclosure: "standard",
  companyFilter: "전체", plan: "standard",
  payYears: 20, delayYears: 1, monthlySaving: 300000,
}

export default function PremiumComparePage() {
  const [mainTab, setMainTab] = useState<MainTab>("health")
  const [viewTab, setViewTab] = useState<ViewTab>("company")

  // 입력값 (조회 전 편집용)
  const [age, setAge] = useState(41)
  const [gender, setGender] = useState("남성")
  const [disclosure, setDisclosure] = useState<Disclosure>("standard")
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>("전체")
  const [plan, setPlan] = useState<PlanId>("standard")
  const [payYears, setPayYears] = useState(20)
  const [delayYears, setDelayYears] = useState(1)
  const [monthlySaving, setMonthlySaving] = useState(300000)

  // 조회 버튼 클릭 후 실제 계산에 사용되는 확정 조건
  const [applied, setApplied] = useState<AppliedConditions>(DEFAULT_CONDITIONS)

  const handleSearch = () => {
    setApplied({ age, gender, disclosure, companyFilter, plan, payYears, delayYears, monthlySaving })
  }

  const handleReset = () => {
    setAge(41); setGender("남성"); setDisclosure("standard")
    setPlan("standard"); setDelayYears(1); setPayYears(20)
    setCompanyFilter("전체"); setMonthlySaving(300000)
    setApplied(DEFAULT_CONDITIONS)
  }

  const coverages = mainTab === "death" ? deathCoverages : healthCoverages
  const visibleCompanies = useMemo(
    () => companies.filter((c) => applied.companyFilter === "전체" || c.type === applied.companyFilter),
    [applied]
  )

  const rows = useMemo(() => {
    return coverages.map((coverage) => {
      const premiums = visibleCompanies.map((company) => ({
        company,
        premium: premiumFor(company, coverage, applied.plan, applied.age, applied.gender, applied.disclosure, 0),
        later: premiumFor(company, coverage, applied.plan, applied.age, applied.gender, applied.disclosure, applied.delayYears),
      }))
      const sorted = [...premiums].sort((a, b) => a.premium - b.premium)
      return { coverage, premiums, best: sorted[0], worst: sorted[sorted.length - 1], sorted }
    })
  }, [applied, coverages, mainTab, visibleCompanies])

  const companyResults = useMemo(() => {
    return visibleCompanies.map((company) => {
      const total = coverages.reduce((sum, cov) => sum + premiumFor(company, cov, applied.plan, applied.age, applied.gender, applied.disclosure), 0)
      const later = coverages.reduce((sum, cov) => sum + premiumFor(company, cov, applied.plan, applied.age, applied.gender, applied.disclosure, applied.delayYears), 0)
      return { company, total, later }
    }).sort((a, b) => a.total - b.total)
  }, [applied, coverages, mainTab, visibleCompanies])

  const crossTotal = rows.reduce((sum, row) => sum + row.best.premium, 0)
  const crossLater = rows.reduce((sum, row) => sum + row.best.later, 0)
  const bestSingle = companyResults[0]
  const months = applied.payYears * 12

  const ageDisclosureRows = useMemo(() => {
    const ageTargets = [applied.age, applied.age + 5, applied.age + 10].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
    return ageTargets.map((targetAge) => {
      const values = (["standard", "325", "335", "355"] as Disclosure[]).map((disc) => {
        const best = visibleCompanies.map((company) => ({
          company,
          total: coverages.reduce((sum, cov) => sum + premiumFor(company, cov, applied.plan, targetAge, applied.gender, disc), 0),
        })).sort((a, b) => a.total - b.total)[0]
        return { disclosure: disc, best }
      })
      return { age: targetAge, values }
    })
  }, [applied, coverages, mainTab, visibleCompanies])

  const savingResults = useMemo(() => {
    return companies.map((company) => {
      const monthlyRate = company.savingRate / 100 / 12
      const futureValue = applied.monthlySaving * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
      const pension = futureValue / 240
      return { company, futureValue, pension }
    }).sort((a, b) => b.futureValue - a.futureValue)
  }, [applied, months])

  return (
    <main className="min-h-screen bg-[#eef3fb] text-slate-900">
      <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8">

        {/* 헤더 */}
        <header className="mb-5 rounded-2xl bg-[#1f5597] text-white shadow-lg">
          <div className="flex flex-col gap-4 px-6 py-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[12px] font-black tracking-[0.2em] text-blue-100">PREMIUM COMPARISON</p>
              <h1 className="mt-2 text-3xl font-black">회사별/담보별 보험료 비교</h1>
              <p className="mt-3 max-w-4xl text-[14px] font-bold leading-7 text-white/80">
                나이·성별·유병력에 따라 보험사별 요율과 인수 기준이 달라집니다. 조건을 바꿔가며 최적 설계 방향을 확인하세요.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => window.open("/dashboard", "_self")} className="rounded-xl bg-white/10 px-5 py-3 text-[13px] font-black hover:bg-white/20">대시보드</button>
              <button onClick={() => window.close()} className="rounded-xl bg-white px-5 py-3 text-[13px] font-black text-[#1f5597]">창 닫기</button>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-white/15">
            {[{ id: "health", label: "건강보험" }, { id: "death", label: "종신/사망" }, { id: "saving", label: "저축성" }].map((tab) => (
              <button key={tab.id} onClick={() => setMainTab(tab.id as MainTab)}
                className={`py-4 text-[15px] font-black ${mainTab === tab.id ? "bg-white text-[#1f5597]" : "bg-[#1f5597] text-white/75 hover:bg-white/10"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* 조건 입력 */}
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[12px] font-black text-slate-400 tracking-wider">고객 조건 입력</p>
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            <Input label="나이" value={age} onChange={(v) => setAge(Number(v) || 0)} />
            <Select label="성별" value={gender} onChange={setGender} options={["남성", "여성"]} />
            <Select label="유병력 고지" value={disclosure} onChange={(v) => setDisclosure(v as Disclosure)} options={["standard", "325", "335", "355"]} labels={disclosureLabels} />
            <Select label="보험사 기준" value={companyFilter} onChange={(v) => setCompanyFilter(v as CompanyFilter)} options={["전체", "생명", "손해"]} />
            <Select label="가입안" value={plan} onChange={(v) => setPlan(v as PlanId)} options={["min", "standard", "max"]} labels={planLabels} />
            <Input label="납입기간" value={payYears} onChange={(v) => setPayYears(Number(v) || 20)} />
            <Input label="몇 년 뒤 가입" value={delayYears} onChange={(v) => setDelayYears(Number(v) || 0)} />
            {mainTab === "saving" && <Input label="월 납입액" value={monthlySaving} onChange={(v) => setMonthlySaving(Number(v) || 0)} />}
            <button
              onClick={() => { setAge(41); setGender("남성"); setDisclosure("standard"); setPlan("standard"); setDelayYears(1) }}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-[13px] font-black text-slate-600 hover:bg-slate-200">
              <RotateCcw size={16} /> 초기화
            </button>
          </div>
        </section>

        {mainTab !== "saving" && (
          <>
            {/* 핵심 비교 배너 */}
            <CrossDesignBanner
              bestSingle={bestSingle}
              crossTotal={crossTotal}
              crossLater={crossLater}
              delayYears={delayYears}
              months={months}
              age={age}
              gender={gender}
              disclosure={disclosure}
            />

            {/* 나이·고지 변동 패널 */}
            <AgeDisclosurePanel rows={ageDisclosureRows} />

            {/* 조건 민감도 안내 */}
            <ConditionInsightPanel coverages={coverages} rows={rows} gender={gender} disclosure={disclosure} age={age} />
          </>
        )}

        {mainTab === "saving" ? (
          <SavingView results={savingResults} monthlySaving={monthlySaving} payYears={payYears} />
        ) : (
          <>
            <section className="mb-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button onClick={() => setViewTab("company")} className={`rounded-xl py-3 text-[14px] font-black ${viewTab === "company" ? "bg-[#1f5597] text-white" : "text-slate-500 hover:bg-slate-50"}`}>회사별 비교</button>
              <button onClick={() => setViewTab("coverage")} className={`rounded-xl py-3 text-[14px] font-black ${viewTab === "coverage" ? "bg-[#1f5597] text-white" : "text-slate-500 hover:bg-slate-50"}`}>담보별 비교</button>
            </section>

            {viewTab === "company" ? (
              <CompanyView results={companyResults} rows={rows} months={months} crossTotal={crossTotal} />
            ) : (
              <CoverageView rows={rows} plan={plan} />
            )}
          </>
        )}

        {/* 안내 문구 */}
        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[13px] font-bold leading-6 text-amber-900">
          이 화면의 보험료는 회사별 요율 경향과 실무 경험을 바탕으로 한 <strong>방향성 안내용 예시</strong>입니다. 실제 보험료는 보험사 산출일·직업·심사 결과·약관 개정에 따라 달라집니다. "어느 회사가 무조건 좋다"가 아니라 "조건에 따라 유리한 회사와 설계 방향이 달라진다"는 점을 설명하기 위한 상담 보조 도구입니다.
        </section>
      </div>
    </main>
  )
}

// ─── 교차설계 vs 단일최저 핵심 배너 ──────────────────────
function CrossDesignBanner({
  bestSingle, crossTotal, crossLater, delayYears, months, age, gender, disclosure
}: {
  bestSingle: { company: Company; total: number; later: number }
  crossTotal: number; crossLater: number; delayYears: number; months: number
  age: number; gender: string; disclosure: string
}) {
  const saving = Math.max(bestSingle.total - crossTotal, 0)
  const totalSaving = saving * months
  const laterDiff = Math.max(crossLater - crossTotal, 0) * months
  const disclosureText: Record<string, string> = { standard: "일반고지", "325": "간편 3·2·5", "335": "간편 3·3·5", "355": "간편 3·5·5" }

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-[#1a2f5c] to-[#1f5597] text-white shadow-lg">
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={15} className="text-yellow-300" />
          <p className="text-[12px] font-black tracking-wider text-blue-200">현재 조건 : {age}세 · {gender} · {disclosureText[disclosure]}</p>
        </div>
        <p className="text-lg font-black text-white/90">한 회사 vs 교차설계 — 지금 바로 비교</p>
      </div>
      <div className="grid grid-cols-1 gap-0 md:grid-cols-3 px-4 pb-5 mt-3">
        {/* 단일 최저 */}
        <div className="rounded-2xl bg-white/10 p-5 mx-2 mb-2 md:mb-0">
          <p className="text-[11px] font-black text-blue-200 tracking-wider mb-2">단일회사 최저</p>
          <p className="text-2xl font-black text-white">{formatWon(bestSingle.total)}<span className="text-[13px] text-white/70 ml-1">/월</span></p>
          <p className="mt-1 text-[13px] font-bold text-blue-200">{bestSingle.company.name}</p>
          <p className="mt-2 text-[11px] text-white/60">총 납입 {formatWon(bestSingle.total * months)}</p>
        </div>
        {/* 절감 */}
        <div className="rounded-2xl bg-yellow-400/20 border border-yellow-300/30 p-5 mx-2 mb-2 md:mb-0 flex flex-col justify-center items-center text-center">
          <TrendingDown size={22} className="text-yellow-300 mb-2" />
          <p className="text-[12px] font-black text-yellow-200 mb-1">교차설계 절감</p>
          <p className="text-3xl font-black text-yellow-300">{formatWon(saving)}<span className="text-[14px] text-yellow-200/80 ml-1">/월</span></p>
          <p className="mt-2 text-[12px] font-bold text-yellow-200">{months}개월 총 {formatWon(totalSaving)} 절감</p>
          {laterDiff > 0 && (
            <p className="mt-1 text-[11px] text-yellow-300/80">{delayYears}년 뒤 가입 시 추가 손실 {formatWon(laterDiff)}</p>
          )}
        </div>
        {/* 교차설계 */}
        <div className="rounded-2xl bg-emerald-400/15 border border-emerald-300/30 p-5 mx-2">
          <p className="text-[11px] font-black text-emerald-300 tracking-wider mb-2">담보별 교차설계</p>
          <p className="text-2xl font-black text-white">{formatWon(crossTotal)}<span className="text-[13px] text-white/70 ml-1">/월</span></p>
          <p className="mt-1 text-[13px] font-bold text-emerald-300">담보별 최저 회사 조합</p>
          <p className="mt-2 text-[11px] text-white/60">총 납입 {formatWon(crossTotal * months)}</p>
        </div>
      </div>
    </section>
  )
}

// ─── 조건 민감도 안내 패널 ────────────────────────────────
function ConditionInsightPanel({ coverages, rows, gender, disclosure, age }: {
  coverages: Coverage[]
  rows: { coverage: Coverage; sorted: { company: Company; premium: number }[] }[]
  gender: string; disclosure: string; age: number
}) {
  const ageBand = getAgeBand(age)
  const ageBandLabel: Record<AgeBand, string> = { "30s": "30대", "40s": "40대", "50s": "50대", "60s": "60대" }

  // 성별 민감 담보 추출
  const genderSensitive = coverages.filter((c) => c.sensitivityTags.includes("성별"))
  // 나이 민감 담보 추출
  const ageSensitive = coverages.filter((c) => c.sensitivityTags.includes("나이"))
  // 유병력 민감
  const uwSensitive = coverages.filter((c) => c.sensitivityTags.includes("유병력"))

  const insights: { icon: string; color: string; text: string }[] = []

  if (gender === "남성") {
    insights.push({ icon: "⚡", color: "text-orange-700 bg-orange-50 border-orange-200", text: `남성은 뇌혈관·심장 담보 보험료가 여성 대비 24~30% 높습니다. ${ageBandLabel[ageBand]} 기준 이 담보의 회사 순위가 중요합니다.` })
  } else {
    insights.push({ icon: "📌", color: "text-pink-700 bg-pink-50 border-pink-200", text: "여성은 유사암진단비 보험료가 남성 대비 약 60% 높습니다. 간병 담보는 반대로 여성이 더 비쌉니다." })
  }

  if (ageBand === "50s" || ageBand === "60s") {
    insights.push({ icon: "🕐", color: "text-red-700 bg-red-50 border-red-200", text: `${ageBandLabel[ageBand]} 이상은 뇌혈관·심장·간병 담보 보험료가 40대 대비 1.7~4배 수준입니다. 지금 가입하는 것이 유리합니다.` })
  }

  if (disclosure !== "standard") {
    insights.push({ icon: "🏥", color: "text-purple-700 bg-purple-50 border-purple-200", text: `간편고지 시 회사별 할증률이 다릅니다. 손보사(메리츠·KB손보)가 생보사 대비 15~20%포인트 낮은 할증 적용 경향이 있습니다.` })
  }

  if (rows.length > 0) {
    const topCovRow = rows.reduce((prev, cur) => {
      const prevRange = prev.sorted[prev.sorted.length - 1].premium - prev.sorted[0].premium
      const curRange = cur.sorted[cur.sorted.length - 1].premium - cur.sorted[0].premium
      return curRange > prevRange ? cur : prev
    })
    const range = topCovRow.sorted[topCovRow.sorted.length - 1].premium - topCovRow.sorted[0].premium
    insights.push({ icon: "💡", color: "text-blue-700 bg-blue-50 border-blue-200", text: `현재 조건에서 회사 간 가격 차이가 가장 큰 담보는 [${topCovRow.coverage.title}]입니다. 최저·최고 회사 간 월 ${formatWon(range)} 차이 발생합니다.` })
  }

  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Info size={16} className="text-[#1f5597]" />
        <h2 className="text-[14px] font-black text-[#153968]">이 조건에서 주목할 포인트</h2>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {insights.map((ins, i) => (
          <div key={i} className={`rounded-xl border px-4 py-3 text-[13px] font-bold leading-6 ${ins.color}`}>
            <span className="mr-2">{ins.icon}</span>{ins.text}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── 나이·고지 변동 패널 ──────────────────────────────────
function AgeDisclosurePanel({ rows }: { rows: { age: number; values: { disclosure: Disclosure; best: { company: Company; total: number } }[] }[] }) {
  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-50 px-5 py-4">
        <h2 className="text-[15px] font-black text-[#153968]">나이·고지 기준 변경 시 최저 회사와 보험료</h2>
        <p className="mt-1 text-[13px] font-bold text-slate-500">조건이 바뀌면 가장 유리한 회사가 달라집니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[880px] w-full border-collapse text-[13px]">
          <thead className="bg-[#172334] text-white">
            <tr>
              <th className="p-4 text-left">나이</th>
              {(["standard", "325", "335", "355"] as Disclosure[]).map((d) => (
                <th key={d} className="p-4">{disclosureLabels[d]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.age} className={`border-b border-slate-100 ${ri === 0 ? "bg-blue-50/40" : ""}`}>
                <td className="bg-slate-50 p-4 font-black">{row.age}세 {ri === 0 && <span className="ml-1 text-[11px] text-blue-600 font-bold">현재</span>}</td>
                {row.values.map((val, vi) => (
                  <td key={val.disclosure} className="p-4 text-center">
                    <p className="font-black text-[#2563eb]">{formatWon(val.best.total)}</p>
                    <p className="mt-1 text-[12px] font-bold text-slate-500">{val.best.company.name}</p>
                    {ri === 0 && vi === 0 && <span className="mt-1 block text-[10px] text-emerald-600 font-black">최적조건</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── 회사별 비교 ─────────────────────────────────────────
function CompanyView({ results, rows, months, crossTotal }: {
  results: { company: Company; total: number; later: number }[]
  rows: { coverage: Coverage; best: { company: Company; premium: number }; worst: { company: Company; premium: number } }[]
  months: number; crossTotal: number
}) {
  const lowest = results[0].total
  const highest = results[results.length - 1].total

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#163f76] px-5 py-4 text-white flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">회사별 총 보험료 비교</h2>
          <p className="mt-1 text-[12px] text-blue-200 font-bold">현재 조건 기준 · 담보 전체 합산</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full border-collapse text-[13px]">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left w-8">순위</th>
              <th className="p-4 text-left">보험사</th>
              <th className="p-4">구분</th>
              <th className="p-4">월 보험료</th>
              <th className="p-4">총 납입</th>
              <th className="p-4">교차설계 대비</th>
              <th className="p-4 text-left">강점 담보</th>
              <th className="p-4 text-left">인수 특성</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item, idx) => {
              const strongCoverages = rows.filter((row) => row.best.company.id === item.company.id).map((row) => row.coverage.title)
              const isLow = item.total === lowest
              const isHigh = item.total === highest
              const rankColors = ["text-yellow-600 bg-yellow-50", "text-slate-500 bg-slate-50", "text-amber-600 bg-amber-50"]
              const rankLabel = idx === 0 ? "1위" : idx === 1 ? "2위" : idx === 2 ? "3위" : `${idx + 1}`
              return (
                <tr key={item.company.id} className={`border-b border-slate-100 ${isLow ? "bg-blue-50/30" : ""}`}>
                  <td className="p-4">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-black ${idx < 3 ? rankColors[idx] : "text-slate-400 bg-slate-50"}`}>
                      {rankLabel}
                    </span>
                  </td>
                  <td className="p-4 font-black">{item.company.name}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-black ${item.company.type === "생명" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                      {item.company.type}
                    </span>
                  </td>
                  <td className={`p-4 text-center text-lg font-black ${isLow ? "text-blue-600" : isHigh ? "text-red-500" : "text-slate-900"}`}>
                    {formatWon(item.total)}
                  </td>
                  <td className="p-4 text-center font-black">{formatWon(item.total * months)}</td>
                  <td className="p-4 text-center font-bold text-slate-600">
                    {item.total > crossTotal ? (
                      <span className="text-orange-600">+{formatWon(item.total - crossTotal)}</span>
                    ) : (
                      <span className="text-emerald-600">교차와 동일</span>
                    )}
                  </td>
                  <td className="p-4 text-[12px] font-bold text-blue-700">
                    {strongCoverages.length ? strongCoverages.join(" · ") : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="p-4 text-[12px] font-bold text-slate-500">{item.company.uwNote}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── 담보별 비교 ─────────────────────────────────────────
const tagConfig: Record<SensitivityTag, { label: string; color: string }> = {
  "나이": { label: "나이민감", color: "bg-orange-100 text-orange-700" },
  "성별": { label: "성별민감", color: "bg-pink-100 text-pink-700" },
  "유병력": { label: "유병력민감", color: "bg-purple-100 text-purple-700" },
}

function CoverageView({ rows, plan }: {
  rows: { coverage: Coverage; premiums: { company: Company; premium: number }[]; best: { company: Company; premium: number }; worst: { company: Company; premium: number }; sorted: { company: Company; premium: number }[] }[]
  plan: PlanId
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#163f76] px-5 py-4 text-white">
        <h2 className="text-lg font-black">담보별 회사 순위 비교</h2>
        <p className="mt-1 text-[12px] text-blue-200 font-bold">담보명 클릭 시 전 회사 순위 확인 가능</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1250px] w-full border-collapse text-[13px]">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">담보</th>
              <th className="p-4">가입금액</th>
              <th className="p-4">1위 회사</th>
              <th className="p-4">최저 보험료</th>
              <th className="p-4">최고 회사</th>
              <th className="p-4">최고 보험료</th>
              <th className="p-4 text-left">순위 변동 이유</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <>
                <tr
                  key={row.coverage.id}
                  className="border-b border-slate-100 align-top cursor-pointer hover:bg-slate-50"
                  onClick={() => setExpanded(expanded === row.coverage.id ? null : row.coverage.id)}
                >
                  <td className="p-4">
                    <p className="font-black flex items-center gap-1">
                      {row.coverage.title}
                      <span className="text-slate-300 text-[11px]">{expanded === row.coverage.id ? "▲" : "▼"}</span>
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {row.coverage.sensitivityTags.map((tag) => (
                        <span key={tag} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${tagConfig[tag].color}`}>
                          {tagConfig[tag].label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-center font-black text-[#2563eb]">{formatMan(row.coverage.amount[plan])}</td>
                  <td className="p-4 text-center font-black text-blue-600">{row.best.company.name}</td>
                  <td className="p-4 text-center font-black text-blue-600">{formatWon(row.best.premium)}</td>
                  <td className="p-4 text-center font-bold text-red-500">{row.worst.company.name}</td>
                  <td className="p-4 text-center font-black text-red-500">{formatWon(row.worst.premium)}</td>
                  <td className="p-4 text-[12px] font-bold text-slate-600 max-w-[280px] leading-5">{row.coverage.rankNote}</td>
                </tr>
                {expanded === row.coverage.id && (
                  <tr key={`${row.coverage.id}-expanded`} className="border-b border-slate-200 bg-slate-50">
                    <td colSpan={7} className="px-6 py-4">
                      <p className="text-[12px] font-black text-slate-400 mb-3 tracking-wider">전 회사 순위 (현재 조건 기준)</p>
                      <div className="flex flex-wrap gap-2">
                        {row.sorted.map((item, idx) => (
                          <div key={item.company.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 border text-[12px] font-bold ${idx === 0 ? "bg-blue-50 border-blue-200" : idx === row.sorted.length - 1 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
                            <span className={`font-black text-[11px] ${idx === 0 ? "text-blue-600" : idx === row.sorted.length - 1 ? "text-red-500" : "text-slate-400"}`}>{idx + 1}위</span>
                            <span className="font-black text-slate-700">{item.company.name}</span>
                            <span className={idx === 0 ? "text-blue-600" : idx === row.sorted.length - 1 ? "text-red-500" : "text-slate-600"}>{formatWon(item.premium)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── 저축성 뷰 ───────────────────────────────────────────
function SavingView({ results, monthlySaving, payYears }: { results: SavingResult[]; monthlySaving: number; payYears: number }) {
  const lifeResults = results.filter((r) => r.company.type === "생명")
  const refundMatrix = refundYears.map((year) => {
    const cells = lifeResults.map((r) => ({
      company: r.company,
      amount: refundAmountFor(r.company, year, monthlySaving, payYears),
      rate: refundRateFor(r.company, year, payYears),
    }))
    const valid = cells.filter((c) => c.amount > 0)
    const min = Math.min(...valid.map((c) => c.amount))
    const max = Math.max(...valid.map((c) => c.amount))
    return { year, cells, min, max }
  })

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#163f76] px-5 py-4 text-white">
          <h2 className="text-lg font-black">저축성 환급률 및 예상 연금 비교</h2>
          <p className="mt-1 text-[12px] text-blue-200 font-bold">공시이율은 시장 금리에 따라 변동됩니다. 비교 참고용입니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full border-collapse text-[13px]">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-left">보험사</th>
                <th className="p-4">구분</th>
                <th className="p-4">예시이율</th>
                <th className="p-4">5년 환급률</th>
                <th className="p-4">7년 환급률</th>
                <th className="p-4">10년 환급률</th>
                <th className="p-4">총 납입액</th>
                <th className="p-4">예상 적립액</th>
                <th className="p-4">월 연금 예상</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, index) => (
                <tr key={row.company.id} className="border-b border-slate-100">
                  <td className="p-4 font-black">{row.company.name}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-black ${row.company.type === "생명" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                      {row.company.type}
                    </span>
                  </td>
                  <td className="p-4 text-center font-black text-[#2563eb]">{row.company.savingRate}%</td>
                  <td className="p-4 text-center font-bold">{row.company.refund5}%</td>
                  <td className="p-4 text-center font-bold">{row.company.refund7}%</td>
                  <td className="p-4 text-center font-bold">{row.company.refund10}%</td>
                  <td className="p-4 text-center font-bold">{formatWon(monthlySaving * payYears * 12)}</td>
                  <td className={`p-4 text-center font-black ${index === 0 ? "text-blue-600" : "text-slate-900"}`}>{formatWon(row.futureValue)}</td>
                  <td className="p-4 text-center font-black text-emerald-600">{formatWon(row.pension)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#163f76] px-5 py-4 text-white">
          <h2 className="text-lg font-black">생명보험 연차별 해약환급금 비교</h2>
          <p className="mt-1 text-[12px] font-bold text-blue-100">월 납입액과 납입기간을 기준으로 연차별 예상 환급금을 비교합니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="sticky left-0 z-10 bg-slate-100 p-4 text-left">연차</th>
                {lifeResults.map((r) => (
                  <th key={r.company.id} className="min-w-[150px] p-4">
                    <p className="font-black">{r.company.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">기준 {r.company.refund10}%</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="sticky left-0 z-10 bg-white p-4 font-black">월 보험료</td>
                {lifeResults.map((r) => (
                  <td key={r.company.id} className="p-4 text-center font-black">{formatWon(monthlySaving)}</td>
                ))}
              </tr>
              <tr className="border-b-2 border-slate-900">
                <td className="sticky left-0 z-10 bg-white p-4 font-black">총 납입액</td>
                {lifeResults.map((r) => (
                  <td key={r.company.id} className="p-4 text-center font-black">{formatWon(monthlySaving * payYears * 12)}</td>
                ))}
              </tr>
              {refundMatrix.map((row) => (
                <tr key={row.year} className={`border-b border-slate-100 ${row.year === 5 || row.year === 10 || row.year === 20 ? "bg-slate-100" : ""}`}>
                  <td className="sticky left-0 z-10 bg-inherit p-4 font-black">{row.year}년</td>
                  {row.cells.map((cell) => {
                    const isMin = cell.amount === row.min
                    const isMax = cell.amount === row.max
                    return (
                      <td key={cell.company.id} className={`p-4 text-center font-black ${isMin ? "text-blue-600" : isMax ? "text-red-500" : "text-slate-900"}`}>
                        <p>{formatWon(cell.amount)}</p>
                        <p className="mt-1 text-[12px]">({cell.rate.toFixed(1)}%)</p>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// ─── 공통 소형 컴포넌트 ───────────────────────────────────
function Input({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-black text-slate-500">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[14px] font-bold outline-none focus:border-[#2563eb]" />
    </label>
  )
}

function Select({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-black text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[14px] font-bold outline-none focus:border-[#2563eb]">
        {options.map((opt) => <option key={opt} value={opt}>{labels?.[opt] || opt}</option>)}
      </select>
    </label>
  )
}
