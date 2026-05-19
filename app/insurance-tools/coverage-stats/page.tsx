"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ClipboardList,
  Eye,
  HeartPulse,
  ImageIcon,
  ReceiptText,
  Search,
  ShieldCheck,
  Stethoscope,
  X,
} from "lucide-react"
import { COVERAGE_STATS, CoverageStatItem } from "../../../lib/insurance/coverage-stats"

type GuideTabId = "cancer" | "cardio" | "dementia" | "death" | "retirement" | "receipt"
type Tone = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate"

type GuideStep = {
  id: string
  title: string
  subtitle: string
  trigger: string
  needs: string[]
  detailTitle: string
  detail: string[]
  treatments?: { label: string; body: string }[]
  coverages: { label: string; body: string }[]
  costMemo: string
  documents: string[]
  tone: Tone
}

type GuideTab = {
  id: GuideTabId
  title: string
  label: string
  icon: string
  lead: string
  message: string
  special: string
  specialRows?: { disease: string; burden: string; period: string; highlight?: boolean }[]
  steps: GuideStep[]
  images: { title: string; image: string }[]
  costTabs?: TreatmentCostTab[]
}

type TreatmentCostTab = {
  id: string
  title: string
  subtitle: string
  cost: string
  body: string
  coverage: string
  image?: string
  images?: { title: string; image: string }[]
  items: { label: string; value: string; note?: string }[]
}

type SearchItem = {
  id: string
  type: "roadmap" | "cost" | "receipt" | "image" | "stat" | "material"
  title: string
  subtitle: string
  keywords: string
  action: () => void
}

const keywordAliases: Record<string, string[]> = {
  암: ["암", "일반암", "폐암", "간암", "위암", "대장암", "유방암", "항암", "항암제", "방사선"],
  위: ["위", "위암", "위염", "위축성위염", "위장", "gastric"],
  간: ["간", "간암", "간염", "B형간염", "간질환", "liver"],
  폐: ["폐", "폐암", "폐렴", "호흡곤란", "pneumonia", "lung"],
  뇌: ["뇌", "뇌혈관", "뇌졸중", "뇌출혈", "뇌경색", "후유장해", "stroke"],
  심장: ["심장", "심장질환", "심근경색", "허혈성", "급성심정지", "cardio", "heart"],
  치아: ["치아", "치과", "잇몸", "치주", "임플란트", "충치"],
  면책: ["면책", "감액", "보장개시일", "보장시작", "치아보험"],
  노후: ["노후", "장수", "고령", "노인", "100세", "의료비", "생활비"],
  치매: ["치매", "간병", "장기요양", "인지", "CDR"],
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[\s,./·ㆍ|()[\]{}:;'"!?_-]/g, "")
}

function expandSearchText(value: string) {
  const base = value.trim().toLowerCase()
  const aliases = keywordAliases[base] || []
  return [base, ...aliases.map((alias) => alias.toLowerCase())]
}

const toneClass: Record<Tone, string> = {
  blue: "border-blue-100 bg-blue-50 text-blue-800",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
  amber: "border-amber-100 bg-amber-50 text-amber-800",
  rose: "border-rose-100 bg-rose-50 text-rose-800",
  violet: "border-violet-100 bg-violet-50 text-violet-800",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
}

const supplementalMaterials = [
  { title: "자동차보험 vs 운전자보험 비교표", image: "/coverage-stats/driver-vs-auto-insurance.png", tags: ["운전자", "자동차", "책임", "벌금", "교통사고"] },
  { title: "아파트 화재보험 vs 일반 화재보험", image: "/coverage-stats/group-personal-fire-insurance-2605.png", tags: ["화재", "아파트", "단체", "개인", "배상"] },
  { title: "운전자보험 변천사와 현재 기준", image: "/coverage-stats/driver-insurance-history-2605.png", tags: ["운전자", "변천사", "형사", "행정", "교통사고"] },
  { title: "배상책임 완벽 가이드", image: "/coverage-stats/liability-guide-2605.png", tags: ["배상책임", "일상생활", "시설", "영업", "전문인"] },
  { title: "펫보험 완벽 가이드", image: "/coverage-stats/pet-insurance-guide-2605.png", tags: ["펫보험", "반려동물", "강아지", "고양이", "동물병원"] },
]

const tabs: GuideTab[] = [
  {
    id: "cancer",
    title: "암",
    label: "암 치료",
    icon: "🎗️",
    lead: "검사와 진단 이후 수술, 방사선, 항암약물, 표적·면역치료가 이어질 수 있습니다.",
    message: "암은 한 번 진단받고 끝나는 사건이 아니라, 치료 선택권과 반복 통원 비용을 준비해야 하는 과정입니다.",
    special: "산정특례: 암은 건강보험 급여 본인부담 5%, 적용기간 5년. 비급여, 선별급여, 상급병실, 일부 신의료기술 비용은 별도로 남을 수 있습니다.",
    specialRows: [
      { disease: "암", burden: "5%", period: "5년", highlight: true },
      { disease: "뇌혈관질환", burden: "5%", period: "최대 30일(입원)", highlight: true },
      { disease: "심장질환", burden: "5%", period: "최대 30일", highlight: true },
      { disease: "희귀질환", burden: "10%", period: "5년" },
      { disease: "중증난치질환", burden: "10%", period: "5년" },
      { disease: "중증치매", burden: "10%", period: "5년 또는 연간 60일" },
    ],
    images: [
      { title: "암 치료의 전 과정", image: "/coverage-stats/cancer-treatment-roadmap-2605.png" },
      { title: "산정특례 가능 질환과 적용기간", image: "/coverage-stats/special-case-2605.png" },
      { title: "표적항암과 NGS 유전자검사", image: "/coverage-stats/target-ngs-2605.png" },
      { title: "암종별 표적치료와 비용", image: "/coverage-stats/cancer-target-cost-2605.png" },
      { title: "가방항암 통원치료", image: "/coverage-stats/portable-chemo-2605.png" },
      { title: "종수술비의 종류와 보장 내용", image: "/coverage-stats/surgery-type-compare-2605.png" },
      { title: "종수술비 VS N대 수술비", image: "/coverage-stats/surgery-type-vs-n-surgery-2605.png" },
    ],
    costTabs: [
      {
        id: "radiation",
        title: "방사선",
        subtitle: "치료 방식에 따라 1천만 원대에서 수천만 원까지 차이가 납니다.",
        cost: "약 1,000만~6,000만 원",
        body: "정위적 방사선, 세기조절 방사선, 양성자, 중입자 치료로 갈수록 본인부담 가능성이 커집니다.",
        coverage: "항암방사선약물치료비, 암주요치료비, 통원치료비 범위를 확인해야 합니다.",
        images: [
          { title: "중입자 치료 vs 양성자 치료", image: "/coverage-stats/carbon-proton-compare-2605.png" },
          { title: "암 치료의 전 과정", image: "/coverage-stats/cancer-treatment-roadmap-2605.png" },
        ],
        items: [
          { label: "정위적 방사선", value: "약 1,000만 원", note: "진행 5~10회" },
          { label: "세기조절 방사선", value: "약 1,800만 원", note: "진행 37~40회" },
          { label: "양성자 방사선", value: "약 2,500만 원", note: "산정특례 시 본인부담 감소 가능" },
          { label: "중입자 방사선", value: "약 6,000만 원", note: "100% 비급여 가능성" },
        ],
      },
      {
        id: "drug",
        title: "항암약물",
        subtitle: "대표 약제에 따라 1년 치료비가 수천만 원에서 1억 원 이상까지 커질 수 있습니다.",
        cost: "연 약 2,800만~1억 6,800만 원",
        body: "세포독성항암제, 표적항암제, 면역항암제, 대사항암제 중 어떤 약제가 필요한지에 따라 비용이 달라집니다.",
        coverage: "항암약물치료비, 표적항암치료비, 면역항암치료비, 암주요치료비가 함께 필요합니다.",
        image: "/coverage-stats/cancer-target-cost-2605.png",
        items: [
          { label: "키트루다", value: "연 약 1억 6,800만 원", note: "비소세포폐암, 대장암 등" },
          { label: "옵디보", value: "연 약 1억 6,800만 원", note: "비소세포폐암, 간암 등" },
          { label: "여보이", value: "연 약 1억 2,000만 원", note: "흑색종, 신세포암 등" },
          { label: "사이람자", value: "연 약 2,800만 원", note: "위암 예시" },
        ],
      },
      {
        id: "target",
        title: "표적·면역",
        subtitle: "NGS·조직검사 결과에서 표적이 확인되어야 선택할 수 있습니다.",
        cost: "검사·약제·투약주기별 상이",
        body: "표적항암과 면역항암은 모두에게 적용되는 치료가 아닙니다. 유전자 변이, 수용체, PD-L1 등 검사 결과가 치료 선택을 결정합니다.",
        coverage: "표적항암치료비, 면역항암치료비는 약관상 인정 범위와 최초 1회·매회 지급 여부가 중요합니다.",
        images: [
          { title: "표적항암과 NGS 유전자검사", image: "/coverage-stats/target-ngs-2605.png" },
          { title: "암종별 표적항암제 종류 및 가격", image: "/coverage-stats/cancer-target-cost-detail-2605.png" },
        ],
        items: [
          { label: "NGS 검사", value: "치료 표적 확인", note: "EGFR, ALK, HER2, BRCA, KRAS 등" },
          { label: "조직검사", value: "암종·병기 확인", note: "생검 또는 수술 조직" },
          { label: "면역항암", value: "PD-L1 등 확인", note: "면역관문억제제 사용 판단" },
          { label: "표적항암", value: "변이별 약제 선택", note: "검사 결과에 따라 약제가 달라짐" },
        ],
      },
      {
        id: "surgery",
        title: "수술",
        subtitle: "관혈·내시경·로봇수술에 따라 비용과 보장 적용이 달라집니다.",
        cost: "약 200만~3,000만 원 이상",
        body: "로봇수술은 다빈치 등 장비 사용으로 전액 비급여가 될 수 있습니다.",
        coverage: "암수술비, 질병수술비, N대수술비, 종수술비 지급 기준을 확인해야 합니다.",
        items: [
          { label: "관혈 수술", value: "약 200만~300만 원", note: "회복 기간 길 수 있음" },
          { label: "내시경 수술", value: "수술별 상이", note: "최소침습, 회복 빠름" },
          { label: "로봇 수술", value: "수백만~수천만 원", note: "비급여 가능성 높음" },
        ],
      },
      {
        id: "portable",
        title: "가방항암",
        subtitle: "입원 중심 항암에서 통원 항암으로 바뀌는 흐름입니다.",
        cost: "교통·식대·숙박 등 병원 밖 비용 발생",
        body: "지방에서 서울로 통원 치료를 받으면 교통비, 식대, 숙박비, 보호자 동행 비용이 추가됩니다.",
        coverage: "통원치료비, 암주요치료비, 항암약물치료비, 생활비성 진단비가 필요합니다.",
        image: "/coverage-stats/portable-chemo-2605.png",
        items: [
          { label: "당일 통원", value: "약 6.5만~10.5만 원", note: "왕복 교통·식대 등" },
          { label: "1박 2일", value: "약 19만~32만 원", note: "교통·식대·숙박 포함" },
          { label: "반복 통원", value: "누적 부담 증가", note: "회차가 많을수록 생활비 영향" },
        ],
      },
    ],
    steps: [
      {
        id: "cancer-diagnosis",
        title: "검사·진단",
        subtitle: "진단 확정 전부터 비용이 시작됩니다.",
        trigger: "조직검사, CT/MRI/PET, 종양표지자, 유전자 검사",
        needs: ["암진단비", "검사비", "통원치료비", "실손의료비"],
        detailTitle: "진단이 확정되면 바로 쓸 돈이 필요합니다.",
        detail: [
          "암진단비는 치료를 시작할 때 생활비와 선택 치료비를 만드는 기본 자금입니다.",
          "치료 전 병기 확인과 유전자 검사가 반복될 수 있고, 일부 검사는 급여 기준 밖이면 본인부담이 커질 수 있습니다.",
          "진단 전 검사비, 진단 후 추적검사비, 반복 통원비가 따로 생깁니다. 진단비와 검사·통원 보장이 함께 필요합니다.",
        ],
        coverages: [
          { label: "암진단비", body: "확정 진단 후 치료 방향을 선택할 수 있는 초기 자금" },
          { label: "검사·통원", body: "PET, MRI, 유전자 검사, 추적검사와 반복 내원 보완" },
          { label: "실손", body: "급여·비급여 실제 병원비 보전의 기본, 자기부담과 한도 확인 필요" },
        ],
        costMemo: "PET/MRI/유전자 검사는 병원과 급여 기준에 따라 차이가 큽니다. 영수증과 세부내역서를 보면 급여, 비급여, 전액본인부담이 나뉘어 확인됩니다.",
        documents: ["진단서", "조직검사 결과지", "영상검사 결과지", "진료비 영수증", "진료비 세부내역서"],
        tone: "blue",
      },
      {
        id: "cancer-plan",
        title: "치료계획",
        subtitle: "어떤 치료를 쓰느냐가 비용을 바꿉니다.",
        trigger: "수술 가능 여부, 병기, 유전자 변이, 전이 여부, 전신상태",
        needs: ["암주요치료비", "항암약물치료비", "표적항암치료비", "면역항암치료비", "항암방사선약물치료비"],
        detailTitle: "범위를 넓게 준비하는 것이 첫 번째입니다.",
        detail: [
          "암 진단을 받았다고 모두가 표적항암제나 면역항암제를 바로 쓰는 것은 아닙니다. NGS 유전자 패널검사, 조직검사, 수용체 검사 결과에서 치료 표적이 확인되어야 합니다.",
          "치료 표적이 확인되면 표적항암제, 면역항암제, 항암방사선, 양성자·중입자 치료까지 치료 선택지가 넓어집니다.",
          "그래서 첫 번째는 특정 치료 하나만 준비하는 것이 아니라 일반 항암약물·방사선부터 표적·면역·입자치료까지 범위가 넓게 준비되어 있어야 합니다.",
        ],
        treatments: [
          { label: "1. NGS·조직검사", body: "EGFR, ALK, HER2, BRCA, RAS, MSI, PD-L1 등 치료 표적이 있는지 확인합니다." },
          { label: "2. 치료제 선택", body: "검사 결과에 따라 표적항암제, 면역항암제, 기존 항암약물, 방사선 치료가 결정됩니다." },
          { label: "3. 보장 범위", body: "검사 결과와 치료 방식이 달라져도 받을 수 있도록 보장 범위가 넓어야 합니다." },
        ],
        coverages: [
          { label: "암주요치료비", body: "수술 이후 반복되는 항암·방사선·통원 치료비를 준비하는 담보" },
          { label: "표적·면역항암", body: "NGS·조직검사 결과에 따라 필요한 고가 약물 치료 대비" },
          { label: "항암방사선약물", body: "약물과 방사선이 병행되거나 치료 방식이 바뀌는 상황 대비" },
        ],
        costMemo: "비급여 또는 급여 기준 외 사용 시 표적·면역항암제는 월 수백만 원 이상, 1년 치료 사이클은 수천만 원 단위가 될 수 있습니다. 약제명, 급여 여부, 투약 주기를 병원 견적으로 확인해야 합니다.",
        documents: ["치료계획서", "항암치료확인서", "처방전", "약제비 영수증", "유전자검사 결과지"],
        tone: "emerald",
      },
      {
        id: "cancer-treatment",
        title: "실제 치료단계",
        subtitle: "수술·방사선·약물이 반복될 수 있습니다.",
        trigger: "수술, 항암, 방사선, 입원·통원, 부작용 관리",
        needs: ["암수술비", "질병수술비", "N대수술비", "방사선치료비", "통원치료비"],
        detailTitle: "실제 치료에서는 보장 범위가 넓어야 합니다.",
        detail: [
          "방사선은 항암방사선약물치료비에서 일반 방사선뿐 아니라 양성자·중입자 등 고가 치료가 보장 범위에 들어가는지 확인해야 합니다.",
          "종수술비는 연간 사용액 기준이 아니라 약관상 수술명과 종 분류 기준으로 지급됩니다. 암 수술이 몇 종에 해당하는지, 반복 수술 지급 제한이 있는지 봐야 합니다.",
          "치료가 통원 중심으로 바뀌면 입원일당만으로는 부족합니다. 통원치료비, 항암치료비, 검사비까지 함께 필요합니다.",
        ],
        treatments: [
          { label: "방사선 확장", body: "일반 방사선보다 IMRT·정위방사선·양성자·중입자 치료에서 비용 부담이 커질 수 있습니다." },
          { label: "수술비 분류", body: "질병수술비, 암수술비, N대수술비, 종수술비가 중복·반복 지급되는지 약관별로 확인합니다." },
          { label: "통원 반복", body: "약물 투약, 방사선 회차, 추적검사, 부작용 관리는 통원비와 소득공백으로 이어집니다." },
        ],
        coverages: [
          { label: "넓은 수술비", body: "암수술만이 아니라 질병수술, N대수술, 종수술의 지급 조건 비교" },
          { label: "방사선치료비", body: "치료 방식별 인정 범위, 횟수 제한, 최초 1회·매회 지급 여부가 중요합니다." },
          { label: "통원·입원", body: "입원 중심 보장에서 통원 반복 보장으로 보완" },
        ],
        costMemo: "양성자·중입자 등 입자치료는 급여 여부와 암종에 따라 본인부담 차이가 매우 큽니다. 비급여 선택 시 수천만 원 단위 견적이 나올 수 있어 치료비 담보와 진단비를 분리해서 준비해야 합니다.",
        documents: ["수술확인서", "치료확인서", "입퇴원확인서", "통원확인서", "진료비 세부내역서"],
        tone: "amber",
      },
    ],
  },
  {
    id: "cardio",
    title: "뇌/심장",
    label: "뇌·심장 치료",
    icon: "🫀",
    lead: "응급 진단 이후 시술·수술, 중환자실, 재활, 장기간 간병으로 이어질 수 있습니다.",
    message: "뇌와 심장은 산정특례 기간이 짧고 후유장해·재활 비용이 남기 쉽습니다. 진단비보다 치료 이후 비용까지 준비해야 합니다.",
    special: "산정특례: 뇌혈관질환은 급여 본인부담 5%, 최대 30일(입원). 심장질환은 5%, 최대 30일이며 일부 복잡 선천성 심기형·심장이식은 최대 60일 기준이 있습니다.",
    specialRows: [
      { disease: "암", burden: "5%", period: "5년", highlight: true },
      { disease: "뇌혈관질환", burden: "5%", period: "최대 30일(입원)", highlight: true },
      { disease: "심장질환", burden: "5%", period: "최대 30일", highlight: true },
      { disease: "중증외상", burden: "5%", period: "최대 30일(입원)" },
      { disease: "희귀질환", burden: "10%", period: "5년" },
      { disease: "중증치매", burden: "10%", period: "5년 또는 연간 60일" },
    ],
    images: [
      { title: "뇌·심장 치료 과정", image: "/coverage-stats/brain-heart-treatment-roadmap-2605.png" },
      { title: "뇌·심장 주요 시술/수술 종류와 비용", image: "/coverage-stats/brain-heart-surgery-cost-2605.png" },
      { title: "중환자실과 간병 비용", image: "/coverage-stats/icu-care-cost-2605.png" },
      { title: "산정특례 가능 질환과 적용기간", image: "/coverage-stats/special-case-2605.png" },
      { title: "뇌·심장 보장 범위", image: "/coverage-stats/brain-heart-scope-2605.png" },
      { title: "종수술비의 종류와 보장 내용", image: "/coverage-stats/surgery-type-compare-2605.png" },
      { title: "종수술비 VS N대 수술비", image: "/coverage-stats/surgery-type-vs-n-surgery-2605.png" },
    ],
    costTabs: [
      {
        id: "emergency",
        title: "응급검사",
        subtitle: "골든타임 안에 CT/MRI, 심전도, 혈액검사가 빠르게 진행됩니다.",
        cost: "검사·응급실 비용 발생",
        body: "뇌졸중과 심근경색은 시간이 예후를 결정합니다. 초기 검사와 이송 비용이 먼저 발생합니다.",
        coverage: "응급실, 검사비, 뇌혈관·허혈성심장질환 진단비를 확인해야 합니다.",
        image: "/coverage-stats/brain-heart-treatment-roadmap-2605.png",
        items: [
          { label: "CT/MRI", value: "급여·비급여 확인", note: "응급 평가" },
          { label: "심전도·혈액검사", value: "초기 판단", note: "심근효소 등" },
          { label: "119·전원", value: "이송 비용", note: "병원 이동" },
        ],
      },
      {
        id: "procedure",
        title: "시술·수술",
        subtitle: "혈전제거, 스텐트, 관상동맥중재술, 우회술 등이 필요할 수 있습니다.",
        cost: "치료 방식별 상이",
        body: "급성기 치료 후에도 추가 시술, 재협착, 합병증 입원 가능성이 남습니다.",
        coverage: "순환계주요치료비, 질병수술비, N대수술비, 중환자실 보장을 확인해야 합니다.",
        image: "/coverage-stats/brain-heart-surgery-cost-2605.png",
        items: [
          { label: "뇌경색", value: "혈전용해·혈전제거", note: "골든타임 중요" },
          { label: "뇌출혈", value: "출혈 조절·수술", note: "집중치료 가능" },
          { label: "심근경색", value: "스텐트·약물", note: "막힌 혈관 재개통" },
          { label: "협심증", value: "약물·시술", note: "재발 관리" },
        ],
      },
      {
        id: "admission",
        title: "입원관리",
        subtitle: "중환자실, 신경학적 상태 모니터링, 약물치료가 이어집니다.",
        cost: "입원·중환자실·상급병실 비용",
        body: "산정특례가 적용돼도 기간 제한이 있고 비급여·간병·상급병실 비용은 남을 수 있습니다.",
        coverage: "입원일당, 중환자실, 간병인, 순환계주요치료비가 필요합니다.",
        image: "/coverage-stats/icu-care-cost-2605.png",
        items: [
          { label: "중환자실", value: "집중 모니터링", note: "급성기 관리" },
          { label: "입원치료", value: "약물·경과 관찰", note: "재발 방지" },
          { label: "간병", value: "가족부담 증가", note: "마비·인지저하 시" },
        ],
      },
      {
        id: "rehab",
        title: "재활",
        subtitle: "퇴원 후 물리치료, 작업치료, 언어치료가 길어질 수 있습니다.",
        cost: "월 부담 장기화 가능",
        body: "뇌졸중 후 편마비, 언어장애, 삼킴장애가 남으면 재활과 간병이 장기간 필요합니다.",
        coverage: "후유장해, 재활치료비, 간병·재가 보장을 확인해야 합니다.",
        items: [
          { label: "물리치료", value: "반복 통원", note: "보행·근력 회복" },
          { label: "작업치료", value: "일상 복귀", note: "손 기능·생활동작" },
          { label: "언어치료", value: "의사소통", note: "실어증·삼킴장애" },
          { label: "장기관리", value: "재발 예방", note: "약물·검사 지속" },
        ],
      },
    ],
    steps: [
      {
        id: "cardio-diagnosis",
        title: "응급 검사·진단",
        subtitle: "골든타임 안에 검사와 처치가 몰립니다.",
        trigger: "응급실, CT/MRI, 혈관조영, 심전도, 심장효소검사",
        needs: ["뇌혈관진단비", "허혈성심장질환진단비", "응급실", "검사비"],
        detailTitle: "진단명 범위가 넓어야 받을 가능성이 커집니다.",
        detail: [
          "뇌는 뇌출혈만 볼지, 뇌졸중과 뇌혈관질환까지 볼지에 따라 실제 지급 가능성이 달라집니다.",
          "심장은 급성심근경색만 볼지, 협심증을 포함한 허혈성심장질환까지 볼지 확인해야 합니다.",
          "응급 검사와 초기 처치는 빠르게 발생합니다. 진단비와 검사·응급실 보장이 함께 필요합니다.",
        ],
        coverages: [
          { label: "뇌혈관진단비", body: "뇌출혈보다 넓은 뇌혈관질환 범위 확인" },
          { label: "허혈성심장질환", body: "급성심근경색보다 협심증 포함 여부 확인" },
          { label: "응급·검사", body: "응급실, 영상검사, 혈관검사 비용 보완" },
        ],
        costMemo: "초기 급여 부담은 산정특례로 줄 수 있지만, 특례 기간이 짧아 이후 재활·간병·추적검사 비용을 따로 봐야 합니다.",
        documents: ["진단서", "응급실 기록", "영상검사 결과지", "시술기록지", "진료비 세부내역서"],
        tone: "blue",
      },
      {
        id: "cardio-plan",
        title: "치료계획",
        subtitle: "시술·수술과 재활 계획이 동시에 잡힙니다.",
        trigger: "혈전용해, 스텐트, 혈관중재술, 개두술, 관상동맥우회술",
        needs: ["순환계주요치료비", "질병수술비", "N대수술비", "중환자실", "입원일당"],
        detailTitle: "진단 후에는 실제 치료비가 이어집니다.",
        detail: [
          "뇌·심장 치료는 진단 후 바로 시술이나 수술로 이어지는 경우가 많습니다.",
          "스텐트, 혈관중재술, 우회술, 뇌혈관 수술 등은 진단비 외 실제 치료비 담보가 필요합니다.",
          "중환자실과 입원 기간이 짧아도 이후 재활과 재입원이 반복될 수 있습니다.",
        ],
        treatments: [
          { label: "뇌혈관", body: "혈전용해술, 혈전제거술, 코일색전술, 스텐트, 개두술 등" },
          { label: "심장", body: "관상동맥 스텐트, 관상동맥우회술, 판막수술, 심장재활 등" },
          { label: "반복 수술", body: "재협착, 추가 시술, 합병증 입원 가능성까지 보장 범위에 들어가는지 확인합니다." },
        ],
        coverages: [
          { label: "순환계주요치료비", body: "진단 이후 실제 치료 행위 중심으로 보완" },
          { label: "수술비", body: "혈관중재술과 수술 분류, 반복 지급 제한 확인" },
          { label: "중환자실·입원", body: "급성기 집중치료와 회복 입원 대비" },
        ],
        costMemo: "치료비는 급여 적용이 많아도 재활, 간병, 상급병실, 보호자 소득공백은 별도 부담으로 남습니다.",
        documents: ["시술확인서", "수술확인서", "입퇴원확인서", "중환자실 확인서", "재활치료 기록"],
        tone: "emerald",
      },
      {
        id: "cardio-rehab",
        title: "재활·간병",
        subtitle: "생존 이후의 비용이 길어질 수 있습니다.",
        trigger: "편마비, 언어장애, 삼킴장애, 심장재활, 장기요양",
        needs: ["후유장해", "간병인", "재가·시설급여 보완", "재활치료비"],
        detailTitle: "산정특례 30일 이후 비용도 준비해야 합니다.",
        detail: [
          "뇌졸중은 후유장해와 가족 간병 부담이 커질 수 있습니다. 회복 기간 비용까지 준비해야 합니다.",
          "심장질환도 재활, 약물관리, 재입원 가능성이 있어 통원과 반복 검사 비용이 발생합니다.",
          "장기요양 등급을 받더라도 본인부담금과 비급여가 남습니다. 재활비와 간병비 보완이 필요합니다.",
        ],
        coverages: [
          { label: "후유장해", body: "마비, 언어장애, 일상생활 제한 등 장기 손실 대비" },
          { label: "간병·재가", body: "가족 돌봄 공백과 전문 간병 비용 보완" },
          { label: "재활치료비", body: "회복기 반복 통원과 소득공백 대비" },
        ],
        costMemo: "뇌·심장은 급성기 병원비보다 퇴원 후 재활·간병·일상 복귀 비용이 오래 남습니다. 이 비용까지 준비되어야 합니다.",
        documents: ["후유장해진단서", "재활치료 확인서", "장기요양 인정서", "간병비 영수증", "진료비 세부내역서"],
        tone: "rose",
      },
    ],
  },
  {
    id: "dementia",
    title: "치매",
    label: "치매·장기요양",
    icon: "🧠",
    lead: "진단, 장기요양 등급, 재가·시설 이용, 비급여 돌봄비까지 장기간 이어집니다.",
    message: "치매는 치료비보다 돌봄 기간과 가족 부담이 커지는 질환입니다. 국가 지원 이후 남는 비용까지 준비해야 합니다.",
    special: "장기요양은 등급별 급여를 지원하지만 본인부담이 남습니다. 일반 기준으로 재가급여 본인부담 15%, 시설급여 20%이며 식재료비·상급침실료·이미용비 등 비급여는 별도입니다.",
    images: [
      { title: "장기요양 등급과 본인부담", image: "/coverage-stats/longterm-care-grade-cost-2605.png" },
      { title: "레켐비 뉴스 요약", image: "/coverage-stats/leqembi-news-2605.png" },
      { title: "치매 전단계", image: "/coverage-stats/dementia-prestage-guide.png" },
      { title: "2024 대한민국 치매 현황", image: "/coverage-stats/dementia-status-2024.png" },
    ],
    steps: [
      {
        id: "dementia-diagnosis",
        title: "진단·인지검사",
        subtitle: "경도인지장애부터 관리가 시작됩니다.",
        trigger: "인지선별검사, 신경심리검사, MRI/PET, 전문의 진단",
        needs: ["치매진단비", "경도인지장애 보장", "검사비", "간병 준비금"],
        detailTitle: "진단 기준과 장기요양 등급이 다릅니다.",
        detail: [
          "보험의 치매진단 기준은 CDR, 임상치매평가, 전문의 진단 등 약관별 기준을 확인해야 합니다.",
          "장기요양 등급은 1~5등급과 인지지원등급으로 나뉘며, 5등급과 인지지원등급은 치매 진단과 인지 기능 저하가 핵심입니다.",
          "초기에는 병원비보다 검사, 보호자 시간, 돌봄 체계 준비가 먼저 발생합니다.",
        ],
        coverages: [
          { label: "치매진단비", body: "경도·중등도·중증 지급 기준과 CDR 조건 확인" },
          { label: "검사비", body: "MRI/PET, 신경심리검사 등 초기 진단 비용 보완" },
          { label: "간병 준비금", body: "진단 직후 가족 돌봄 체계와 생활비 보완" },
        ],
        costMemo: "치매는 진단 직후 큰 수술비보다 장기 돌봄 비용이 누적됩니다. 초기 단계부터 월 부담 구조를 보여주는 것이 중요합니다.",
        documents: ["진단서", "CDR 평가자료", "신경심리검사 결과", "영상검사 결과", "진료비 세부내역서"],
        tone: "violet",
      },
      {
        id: "dementia-care",
        title: "장기요양 심사",
        subtitle: "등급에 따라 이용 가능한 서비스가 달라집니다.",
        trigger: "공단 신청, 방문조사, 의사소견서, 등급판정위원회",
        needs: ["장기요양진단비", "재가급여", "시설급여", "주야간보호센터 비용"],
        detailTitle: "1등급부터 인지지원등급까지 이용 범위가 달라집니다.",
        detail: [
          "1등급은 일상생활 전반에 전적으로 도움이 필요한 상태, 2~4등급은 도움 정도에 따라 나뉩니다.",
          "5등급은 치매 환자로 장기요양인정 점수 45점 이상 51점 미만, 인지지원등급은 치매 환자로 45점 미만인 경우가 핵심 구조입니다.",
          "심사 절차는 신청, 방문조사, 의사소견서 제출, 등급판정, 이용계획서 작성 순서로 진행됩니다.",
        ],
        treatments: [
          { label: "재가", body: "방문요양, 방문목욕, 방문간호, 주야간보호, 단기보호 등" },
          { label: "시설", body: "노인요양시설, 공동생활가정 등. 등급과 상태에 따라 이용 가능 여부가 달라집니다." },
          { label: "비급여", body: "식재료비, 간식비, 상급침실료, 이미용비, 개인 물품비는 별도 부담입니다." },
        ],
        coverages: [
          { label: "재가·시설 보장", body: "집에서 돌볼 때와 시설 입소 시 필요한 현금 흐름 보완" },
          { label: "주야간보호", body: "보호자 근무시간 공백을 줄이는 데 활용" },
          { label: "간병인", body: "공적 급여 밖 돌봄 공백과 야간·추가 돌봄 대비" },
        ],
        costMemo: "월 부담은 재가 이용 시 본인부담 15%와 비급여, 시설 이용 시 20%와 식비·간식비·상급침실료 등을 더해 확인합니다. 기관별 실제 견적은 월 수십만 원에서 100만 원 이상까지 차이가 날 수 있습니다.",
        documents: ["장기요양인정서", "표준장기요양이용계획서", "의사소견서", "급여계약서", "기관 이용료 명세서"],
        tone: "blue",
      },
      {
        id: "dementia-leqembi",
        title: "표적약물·비급여",
        subtitle: "신약은 치료 기회와 비용을 함께 봐야 합니다.",
        trigger: "초기 알츠하이머, 아밀로이드 검사, 정기 MRI 모니터링",
        needs: ["비급여 치료비", "검사비", "간병비", "치매진단비"],
        detailTitle: "표적약물은 치료 기회와 비용을 함께 봐야 합니다.",
        detail: [
          "레켐비(레카네맙)는 초기 알츠하이머병 영역에서 논의되는 항아밀로이드 항체 치료제입니다.",
          "투약 대상 확인을 위한 검사와 투약 중 MRI 모니터링이 필요할 수 있어 약값 외 검사비가 함께 발생합니다.",
          "비급여 상태 또는 급여 기준 밖 사용이면 1년 단위 부담이 커질 수 있습니다. 실손 한계와 별도 준비금이 필요합니다.",
        ],
        coverages: [
          { label: "치매진단비", body: "초기 진단 후 치료 선택권과 가족 생활비 자금" },
          { label: "비급여 치료비", body: "신약·검사·모니터링 비용 공백 보완" },
          { label: "간병·생활비", body: "약물치료와 별개로 돌봄 기간은 계속될 수 있음" },
        ],
        costMemo: "국내 출시 초기 레켐비는 비급여로 알려졌고, 연간 약값만 2천만 원대 전망 보도가 있었습니다. 실제 비용은 병원, 체중, 투약 주기, 검사 계획, 급여 여부에 따라 확인해야 합니다.",
        documents: ["치매 진단서", "아밀로이드 검사 결과", "MRI 결과", "처방전", "약제비 영수증"],
        tone: "emerald",
      },
    ],
  },
  {
    id: "death",
    title: "사망",
    label: "사망보장",
    icon: "🛡️",
    lead: "사망보장은 남겨질 가족의 생활비, 대출상환, 자녀교육비, 장례비를 준비하는 자금입니다.",
    message: "사망 원인에 따라 받을 수 있는 담보가 달라집니다. 일반사망, 질병사망, 재해사망, 상해사망의 범위를 먼저 확인해야 합니다.",
    special: "일반사망은 질병사망과 재해사망을 포함하는 가장 넓은 구조입니다. 재해사망 안에 상해사망이 포함되는 형태로 이해하면 쉽습니다. 단, 실제 지급은 약관의 재해·상해 정의와 면책 사유에 따라 달라집니다.",
    images: [
      { title: "사망 범위와 보장 차이", image: "/coverage-stats/death-scope-2605.png" },
    ],
    steps: [
      {
        id: "death-scope",
        title: "담보 범위",
        subtitle: "원인에 따라 지급 담보가 달라집니다.",
        trigger: "질병 사망, 재해 사망, 상해 사망, 일반 사망",
        needs: ["일반사망", "질병사망", "재해사망", "상해사망"],
        detailTitle: "사망보장은 범위가 넓을수록 공백이 줄어듭니다.",
        detail: [
          "일반사망은 질병으로 사망해도, 재해로 사망해도 지급되는 가장 넓은 사망보장입니다.",
          "질병사망은 암, 뇌혈관질환, 심장질환, 폐렴 등 질병으로 사망할 때 필요한 보장입니다.",
          "재해사망과 상해사망은 갑작스럽고 우연한 외래 사고가 핵심입니다. 사고처럼 보여도 약관상 질병 원인이 크면 지급 판단이 달라질 수 있습니다.",
        ],
        treatments: [
          { label: "일반사망", body: "종신보험이나 정기보험의 기본 구조입니다. 사망 원인을 넓게 봅니다." },
          { label: "질병사망", body: "질병 원인 사망에 집중합니다. 보험기간과 감액·면책 조건을 확인해야 합니다." },
          { label: "재해·상해사망", body: "사고 원인 사망입니다. 재해분류표, 상해의 외래성·우연성·급격성이 중요합니다." },
        ],
        coverages: [
          { label: "종신보험", body: "평생 일반사망을 준비합니다. 상속, 장례비, 배우자 생활비에 쓰입니다." },
          { label: "정기보험", body: "자녀 독립 전, 대출 상환 기간처럼 필요한 기간만 크게 준비합니다." },
          { label: "재해·상해사망", body: "사고 사망을 추가로 크게 보완하지만 질병 사망은 보장하지 않을 수 있습니다." },
        ],
        costMemo: "사망보장은 보험료 비교보다 필요한 금액을 먼저 정해야 합니다. 대출잔액, 자녀교육비, 배우자 생활비, 장례비를 더한 뒤 이미 준비된 자산을 빼면 필요한 사망보험금이 나옵니다.",
        documents: ["사망진단서", "기본증명서", "가족관계증명서", "사고사실확인서", "진료기록"],
        tone: "slate",
      },
      {
        id: "death-dispute-accident",
        title: "분쟁 사례 1",
        subtitle: "상해사망과 재해사망은 같지 않을 수 있습니다.",
        trigger: "교통사고, 추락, 익사, 질식, 사고 후 사망",
        needs: ["상해사망", "재해사망", "일반사망"],
        detailTitle: "사고처럼 보여도 약관 판단이 필요합니다.",
        detail: [
          "상해사망은 급격하고 우연한 외래 사고로 신체에 상해가 생기고, 그 상해가 직접 원인이 되어 사망한 경우가 핵심입니다.",
          "재해사망은 보험사가 정한 재해분류표에 해당해야 합니다. 상해처럼 보여도 재해분류표에서 제외되거나 면책 사유가 있으면 다툼이 생길 수 있습니다.",
          "예를 들어 음주, 고의, 기존 질병 악화, 사고와 사망 사이의 인과관계가 문제되면 재해·상해사망 지급 여부가 달라질 수 있습니다.",
        ],
        coverages: [
          { label: "상해사망", body: "사고의 급격성·우연성·외래성과 직접 인과관계가 중요합니다." },
          { label: "재해사망", body: "재해분류표와 면책 사유가 중요합니다." },
          { label: "일반사망", body: "분쟁 가능성을 줄이는 가장 넓은 기본 사망보장입니다." },
        ],
        costMemo: "사고 사망 보장만 크게 준비하면 질병 사망이나 약관상 사고 인정이 애매한 경우 공백이 생깁니다. 가족 생활비 목적이면 일반사망 보장이 기본이 됩니다.",
        documents: ["사망진단서", "사고확인서", "경찰서류", "응급실 기록", "부검감정서"],
        tone: "amber",
      },
      {
        id: "death-dispute-disease",
        title: "분쟁 사례 2",
        subtitle: "질병사망과 사고사망의 경계가 문제됩니다.",
        trigger: "기저질환이 있는 상태에서 사고 발생 후 사망",
        needs: ["질병사망", "일반사망", "재해·상해사망"],
        detailTitle: "사망 원인이 질병인지 사고인지가 쟁점입니다.",
        detail: [
          "심근경색, 뇌출혈, 뇌경색처럼 몸 안의 질병이 먼저 발생해 넘어지거나 사고가 생긴 경우에는 질병사망으로 판단될 수 있습니다.",
          "반대로 외부 사고가 먼저 발생하고 그 사고로 치료 중 사망했다면 상해·재해사망 검토가 필요합니다.",
          "사망진단서의 직접사인, 중간선행사인, 선행사인과 진료기록이 지급 판단의 핵심 자료가 됩니다.",
        ],
        coverages: [
          { label: "질병사망", body: "암, 뇌, 심장, 폐렴 등 질병으로 인한 사망을 준비합니다." },
          { label: "일반사망", body: "원인 다툼이 있더라도 사망 자체를 넓게 준비합니다." },
          { label: "정기보험", body: "가족 책임 기간 동안 큰 금액을 낮은 보험료로 준비할 수 있습니다." },
        ],
        costMemo: "가족에게 필요한 돈은 사망 원인과 상관없이 발생합니다. 그래서 사망보장은 일반사망 또는 질병사망 중심으로 기본을 만들고, 사고사망은 추가 보완으로 보는 것이 안정적입니다.",
        documents: ["사망진단서", "진료기록", "검사결과지", "입퇴원확인서", "보험금 청구서류"],
        tone: "rose",
      },
    ],
  },
  {
    id: "retirement",
    title: "노후",
    label: "노후 준비",
    icon: "🌿",
    lead: "오래 사는 기간에는 병원비, 간병비, 생활비, 자녀지원, 부모부양이 함께 발생합니다.",
    message: "노후 준비는 연금만의 문제가 아닙니다. 건강수명 이후의 의료비와 간병비까지 현금 흐름으로 준비해야 합니다.",
    special: "국민연금과 퇴직연금은 생활비의 기본이지만, 의료비·간병비·비급여 치료비·가족부양비를 모두 해결하기에는 부족할 수 있습니다.",
    images: [
      { title: "기대여명과 보장기간", image: "/coverage-stats/life-expectancy-aging-index.png" },
      { title: "노후 준비 요약", image: "/coverage-stats/retirement-needs.svg" },
      { title: "65세 이상 의료비", image: "/coverage-stats/senior-medical-cost-complex-disease.png" },
    ],
    steps: [
      {
        id: "retirement-living",
        title: "생활비",
        subtitle: "소득이 줄어도 지출은 계속됩니다.",
        trigger: "은퇴, 국민연금 개시 전 공백, 배우자 생활비, 주거비",
        needs: ["연금", "저축성 자금", "사망보장", "생활비 준비금"],
        detailTitle: "은퇴 후에는 매달 들어오는 돈이 필요합니다.",
        detail: [
          "노후에는 월 생활비가 먼저 필요합니다. 연금 개시 전 공백이 있으면 준비금이 더 필요합니다.",
          "배우자 한 명이 먼저 사망하면 가구 소득이 줄 수 있습니다. 그래서 사망보장과 연금 흐름을 함께 봐야 합니다.",
          "자녀 교육비, 재취업 준비, 부모 병원비가 겹치면 노후자금이 빠르게 줄어들 수 있습니다.",
        ],
        coverages: [
          { label: "연금", body: "매달 들어오는 생활비의 기본입니다." },
          { label: "정기·종신", body: "배우자 생활비와 대출상환 재원을 남깁니다." },
          { label: "비상자금", body: "연금 개시 전 공백과 예상 밖 지출을 막습니다." },
        ],
        costMemo: "노후 준비는 총액보다 월 현금 흐름이 중요합니다. 매월 필요한 생활비에서 확정 연금을 빼면 부족한 월 준비금이 나옵니다.",
        documents: ["국민연금 예상연금액", "퇴직연금 내역", "대출잔액", "월 지출표"],
        tone: "emerald",
      },
      {
        id: "retirement-medical",
        title: "의료비",
        subtitle: "건강수명 이후 의료비가 커집니다.",
        trigger: "만성질환, 복합질환, 입원, 수술, 비급여 치료",
        needs: ["실손", "진단비", "수술비", "간병비", "치매·장기요양"],
        detailTitle: "노후에는 한 가지 질병만 오지 않습니다.",
        detail: [
          "나이가 들수록 고혈압, 당뇨, 심장질환, 뇌혈관질환, 암, 치매가 겹쳐서 발생할 수 있습니다.",
          "실손은 병원비 보전에 도움이 되지만, 자기부담금과 비급여 제한이 있습니다. 생활비와 간병비는 별도 준비가 필요합니다.",
          "보험료가 부담되는 시기에는 모든 담보를 크게 가져가기보다 암, 뇌·심장, 간병, 수술비의 우선순위를 정해야 합니다.",
        ],
        coverages: [
          { label: "실손", body: "병원비 보전의 기본입니다." },
          { label: "3대질병 진단비", body: "치료 중 생활비와 선택 치료비를 만듭니다." },
          { label: "간병·치매", body: "가족 돌봄 부담과 장기 비용을 줄입니다." },
        ],
        costMemo: "공적지원과 실손으로 줄어드는 부분이 있어도 비급여, 간병, 소득공백은 남습니다. 노후 의료비는 병원비와 생활비를 나눠 준비해야 합니다.",
        documents: ["건강검진 결과", "복용약 내역", "보험증권", "진료비 영수증"],
        tone: "blue",
      },
      {
        id: "retirement-family",
        title: "가족부담",
        subtitle: "자녀와 부모 비용이 함께 올 수 있습니다.",
        trigger: "자녀교육비, 자녀결혼자금, 부모간병비, 배우자 생활비",
        needs: ["노후생활비", "간병비", "사망보장", "상속·증여 자금"],
        detailTitle: "노후자금은 가족 비용까지 고려해야 합니다.",
        detail: [
          "자녀 지원과 부모 병원비가 겹치면 본인 노후자금이 줄어듭니다.",
          "배우자에게 남겨야 할 생활비가 있으면 사망보장과 연금 수령 구조가 필요합니다.",
          "상속이나 증여까지 생각한다면 현금흐름, 세금, 사망보험금 수익자까지 함께 확인해야 합니다.",
        ],
        coverages: [
          { label: "사망보장", body: "배우자 생활비와 정리자금을 남깁니다." },
          { label: "간병비", body: "자녀가 직접 돌보지 않아도 되는 비용을 만듭니다." },
          { label: "현금성 자산", body: "예상 밖 가족 비용을 흡수합니다." },
        ],
        costMemo: "노후 준비는 나만의 생활비가 아니라 가족에게 전가될 수 있는 비용까지 막는 구조입니다.",
        documents: ["가족 부양 계획", "자산·부채 현황", "보험 수익자 내역", "월 지출표"],
        tone: "amber",
      },
    ],
  },
  {
    id: "receipt",
    title: "영수증",
    label: "진료비 영수증",
    icon: "🧾",
    lead: "객관 자료는 실제 영수증에서 급여, 비급여, 전액본인부담을 나눠 보여줄 때 가장 설득력이 큽니다.",
    message: "나라 지원과 실손이 있어도 비급여·전액본인부담·생활비는 남을 수 있습니다. 실제 서류에서 그 금액이 확인됩니다.",
    special: "개인정보가 보이는 실제 영수증은 반드시 가려야 합니다. 예시는 금액 구조를 보여주는 용도입니다.",
    images: [
      { title: "병원 영수증 항목별 설명", image: "/coverage-stats/receipt-items-2605.png" },
      { title: "산정특례와 본인부담 영수증", image: "/coverage-stats/receipt-safe-01.png" },
      { title: "뇌·심장 수술비 영수증", image: "/coverage-stats/receipt-safe-02.png" },
      { title: "로봇수술·암 통원 영수증", image: "/coverage-stats/receipt-safe-03.png" },
      { title: "중입자·유방암 검사 영수증", image: "/coverage-stats/receipt-safe-04.png" },
      { title: "디스크 수술 영수증", image: "/coverage-stats/receipt-safe-05.png" },
    ],
    steps: [
      {
        id: "receipt-items",
        title: "영수증 읽기",
        subtitle: "급여와 비급여를 분리합니다.",
        trigger: "본인부담금, 공단부담금, 전액본인부담, 선택진료·상급병실·비급여",
        needs: ["실손의료비", "진단비", "치료비", "간병·생활비"],
        detailTitle: "영수증에서는 남는 부담이 바로 보입니다.",
        detail: [
          "급여 항목은 건강보험과 산정특례로 줄어들 수 있지만, 비급여와 전액본인부담은 별도입니다.",
          "실손은 병원비 보전에 도움이 되지만 자기부담, 한도, 비급여 제한, 통원 한도가 있습니다.",
          "진단비와 주요치료비는 병원비 외 선택 치료, 생활비, 가족 소득공백을 보완하는 자금입니다.",
        ],
        treatments: [
          { label: "급여", body: "건강보험 적용 항목입니다. 산정특례가 적용되면 암·뇌·심장 급여 본인부담이 크게 줄어듭니다." },
          { label: "비급여", body: "도수치료, 비급여 주사·약제, 일부 고가 치료처럼 건강보험이 적용되지 않는 항목입니다." },
          { label: "전액본인부담", body: "법정 급여 기준 밖 사용 등으로 진료비 전액을 환자가 부담하는 항목입니다." },
        ],
        coverages: [
          { label: "실손", body: "영수증 기반 실제 병원비 보전" },
          { label: "진단비", body: "치료 시작 시점의 현금 흐름" },
          { label: "주요치료비", body: "항암·방사선·순환계 치료 등 반복 치료 보완" },
        ],
        costMemo: "이 정도 준비가 있으면 치료 선택권이 생깁니다. 부족하면 비급여, 전액본인부담, 생활비에서 공백이 생깁니다.",
        documents: ["진료비 영수증", "진료비 세부내역서", "처방전", "약제비 영수증", "입퇴원·통원확인서"],
        tone: "slate",
      },
    ],
  },
]

export default function CoverageStatsPage() {
  const [selected, setSelected] = useState<CoverageStatItem | null>(null)
  const [selectedImage, setSelectedImage] = useState<{ title: string; image: string } | null>(null)
  const [activeTab, setActiveTab] = useState<GuideTabId>("cancer")
  const activeGuide = tabs.find((tab) => tab.id === activeTab) || tabs[0]
  const [activeStepId, setActiveStepId] = useState(activeGuide.steps[0].id)
  const [activeCostTabId, setActiveCostTabId] = useState<string | null>(activeGuide.costTabs?.[0]?.id || null)
  const activeStep = activeGuide.steps.find((step) => step.id === activeStepId) || activeGuide.steps[0]

  const searchItems: SearchItem[] = useMemo(() => {
    const guideItems = tabs.flatMap((tab) => [
      ...tab.steps.map((step) => ({
        id: `step-${tab.id}-${step.id}`,
        type: "roadmap" as const,
        title: step.title,
        subtitle: `${tab.title} 치료과정`,
        keywords: `${tab.title} ${tab.label} ${step.title} ${step.subtitle} ${step.trigger} ${step.needs.join(" ")} ${step.detail.join(" ")} ${step.coverages.map((coverage) => `${coverage.label} ${coverage.body}`).join(" ")} ${step.costMemo}`,
        action: () => {
          changeTab(tab.id)
          setActiveStepId(step.id)
        },
      })),
      ...tab.images.map((image) => ({
        id: `image-${tab.id}-${image.image}`,
        type: image.title.includes("영수증") || image.title.includes("곸닔利") ? ("receipt" as const) : ("image" as const),
        title: image.title,
        subtitle: `${tab.title} 자료`,
        keywords: `${tab.title} ${tab.label} ${image.title} 비용 수술 입원 영수증 산정특례`,
        action: () => {
          changeTab(tab.id)
          setSelectedImage(image)
        },
      })),
      ...(tab.costTabs || []).flatMap((costTab) => {
        const tabImagePaths = new Set(tab.images.map((image) => image.image))
        const images = costTab.images || (costTab.image ? [{ title: costTab.title, image: costTab.image }] : [])
        return images
          .filter((image) => !tabImagePaths.has(image.image))
          .map((image) => ({
            id: `cost-image-${tab.id}-${costTab.id}-${image.image}`,
            type: image.title.includes("영수증") || image.title.includes("곸닔利") ? ("receipt" as const) : ("image" as const),
            title: image.title,
            subtitle: `${tab.title} ${costTab.title} 자료`,
            keywords: `${tab.title} ${costTab.title} ${image.title} 비용 수술 입원 영수증 산정특례`,
            action: () => {
              changeTab(tab.id)
              setActiveCostTabId(costTab.id)
              setSelectedImage(image)
            },
          }))
      }),
    ])

    const statItems = COVERAGE_STATS.map((item) => ({
      id: `stat-${item.id}`,
      type: "stat" as const,
      title: item.title,
      subtitle: item.tags.join(" / "),
      keywords: `${item.id} ${item.category} ${item.title} ${item.subtitle} ${item.summary} ${item.talkPoint} ${item.source} ${item.tags.join(" ")}`,
      action: () => setSelected(item),
    }))

    const supplementalItems = supplementalMaterials.map((item) => ({
      id: `supplemental-${item.image}`,
      type: "material" as const,
      title: item.title,
      subtitle: item.tags.join(" / "),
      keywords: `${item.title} ${item.tags.join(" ")}`,
      action: () => setSelectedImage(item),
    }))

    return [...guideItems, ...supplementalItems, ...statItems]
  }, [])

  function changeTab(id: GuideTabId) {
    const next = tabs.find((tab) => tab.id === id)
    if (!next) return
    setActiveTab(id)
    setActiveStepId(next.steps[0].id)
    setActiveCostTabId(next.costTabs?.[0]?.id || null)
  }

  return (
    <main className="min-h-screen bg-[#eef3fb] text-slate-900">
      <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8">
        <header className="mb-5 rounded-2xl bg-[#1f5597] text-white shadow-lg">
          <div className="flex flex-col gap-4 px-6 py-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[12px] font-black tracking-[0.2em] text-blue-100">COVERAGE STATISTICS</p>
              <h1 className="mt-2 text-3xl font-black">보장별 통계 자료</h1>
              <p className="mt-3 max-w-4xl text-[14px] font-bold leading-7 text-white/80">
                치료 순서, 필요한 보장, 공적지원과 실손의 한계, 비급여 준비까지 한 화면에서 확인하는 자료입니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/insurance-tools/premium-compare" className="rounded-xl bg-white px-4 py-3 text-[12px] font-black text-[#1f5597] hover:bg-blue-50">
                보험료 비교
              </Link>
              <button onClick={() => window.close()} className="rounded-xl bg-white/10 px-4 py-3 text-[12px] font-black text-white hover:bg-white/20">
                창 닫기
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <SearchSidebar items={searchItems} />

          <div>
            <ConsultingGuide
              activeGuide={activeGuide}
              activeStep={activeStep}
              onChangeTab={changeTab}
              onSelectStep={setActiveStepId}
              onSelectImage={setSelectedImage}
              activeCostTabId={activeCostTabId}
              onSelectCostTab={setActiveCostTabId}
            />
          </div>
        </div>

      </div>

      {selected && <PreviewModal item={selected} onClose={() => setSelected(null)} />}
      {selectedImage && <ImageModal item={selectedImage} onClose={() => setSelectedImage(null)} />}
    </main>
  )
}

function ConsultingGuide({
  activeGuide,
  activeStep,
  onChangeTab,
  onSelectStep,
  onSelectImage,
  activeCostTabId,
  onSelectCostTab,
}: {
  activeGuide: GuideTab
  activeStep: GuideStep
  onChangeTab: (id: GuideTabId) => void
  onSelectStep: (id: string) => void
  onSelectImage: (item: { title: string; image: string }) => void
  activeCostTabId: string | null
  onSelectCostTab: (id: string) => void
}) {
  return (
    <section className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[12px] font-black tracking-[0.18em] text-[#1f5597]">TREATMENT ROADMAP</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">치료 순서와 필요한 보장</h2>
            <p className="mt-2 max-w-4xl text-[13px] font-bold leading-6 text-slate-500">
              이런 일이 생기면 어떤 치료가 필요하고, 어떤 보장을 준비해야 하는지 바로 확인할 수 있습니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`min-h-12 rounded-xl border px-3 py-3 text-center transition ${activeGuide.id === tab.id ? "border-[#1f5597] bg-[#1f5597] text-white shadow-md" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
              >
                <span className="whitespace-nowrap text-[13px] font-black">{tab.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <MaterialButtonList items={activeGuide.images} onSelectImage={onSelectImage} />

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl">{activeGuide.icon}</div>
            <div>
              <p className="text-[12px] font-black text-blue-500">{activeGuide.label}</p>
              <h3 className="mt-1 text-xl font-black text-slate-900">{activeGuide.message}</h3>
              <p className="mt-2 text-[13px] font-bold leading-6 text-slate-600">{activeGuide.lead}</p>
            </div>
          </div>
        </div>

        {activeGuide.id === "cancer" && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-[12px] font-black text-red-500">1순위</p>
              <p className="mt-1 text-[17px] font-black text-red-800">보장 범위가 넓어야 합니다.</p>
              <p className="mt-2 text-[12px] font-bold leading-5 text-red-700">검사 결과에 따라 치료법이 달라지므로 특정 치료 하나만으로는 부족합니다.</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-[12px] font-black text-emerald-500">검사</p>
              <p className="mt-1 text-[17px] font-black text-emerald-800">NGS·조직검사 결과가 필요합니다.</p>
              <p className="mt-2 text-[12px] font-bold leading-5 text-emerald-700">표적·면역항암은 모두에게 적용되는 치료가 아닙니다.</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-[12px] font-black text-amber-500">준비</p>
              <p className="mt-1 text-[17px] font-black text-amber-800">진단비와 주요치료비가 함께 필요합니다.</p>
              <p className="mt-2 text-[12px] font-bold leading-5 text-amber-700">산정특례와 실손 이후에도 비급여 치료비와 생활비가 남을 수 있습니다.</p>
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          {activeGuide.steps.map((step) => (
            <button
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${activeStep.id === step.id ? toneClass[step.tone] : "border-slate-200 bg-white text-slate-700"}`}
            >
              <p className="text-[15px] font-black">{step.title}</p>
              <p className="mt-2 text-[12px] font-bold leading-5 opacity-80">{step.subtitle}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {step.needs.slice(0, 3).map((need) => (
                  <span key={need} className="rounded-full bg-white/75 px-2 py-1 text-[10px] font-black">
                    {need}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <StepDetail step={activeStep} special={activeGuide.special} />

        {activeGuide.costTabs && (
          <TreatmentCostTabs
            tabs={activeGuide.costTabs}
            activeId={activeCostTabId || activeGuide.costTabs[0].id}
            onSelect={onSelectCostTab}
            onSelectImage={onSelectImage}
          />
        )}

        <SpecialCasePanel guide={activeGuide} />
      </div>
    </section>
  )
}

function MaterialButtonList({
  items,
  onSelectImage,
}: {
  items: { title: string; image: string }[]
  onSelectImage: (item: { title: string; image: string }) => void
}) {
  if (items.length === 0) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-[#1f5597]" />
        <h3 className="text-[15px] font-black text-slate-900">상담 자료</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.image}
            onClick={() => onSelectImage(item)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[12px] font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-[#1f5597] hover:ring-blue-200"
          >
            <Eye className="h-3.5 w-3.5" />
            {item.title}
          </button>
        ))}
      </div>
    </div>
  )
}

function SearchSidebar({ items }: { items: SearchItem[] }) {
  const [keyword, setKeyword] = useState("")
  const [activeFilter, setActiveFilter] = useState<SearchItem["type"] | "all">("all")
  const queryTerms = expandSearchText(keyword)
    .map((term) => normalizeSearchText(term))
    .filter(Boolean)
  const filterOptions: { id: SearchItem["type"] | "all"; label: string; hint: string }[] = [
    { id: "all", label: "전체", hint: "모든 자료" },
    { id: "roadmap", label: "치료과정", hint: "순서·필요보장" },
    { id: "receipt", label: "영수증", hint: "실제 서류" },
    { id: "stat", label: "통계", hint: "기존 자료" },
    { id: "material", label: "추가자료", hint: "운전자·화재 등" },
    { id: "image", label: "이미지", hint: "팝업 자료" },
  ]
  const typeLabel: Record<SearchItem["type"], string> = {
    roadmap: "치료과정",
    cost: "비용",
    receipt: "영수증",
    image: "이미지 자료",
    stat: "통계 자료",
    material: "추가 자료",
  }
  const filtered = items
    .filter((item) => activeFilter === "all" || item.type === activeFilter)
    .filter((item) => {
      if (queryTerms.length === 0) return true
      const haystack = normalizeSearchText(`${item.title} ${item.subtitle} ${item.keywords} ${typeLabel[item.type]}`)
      return queryTerms.some((term) => haystack.includes(term))
    })
    .slice(0, 80)
  const materialCount = items.length

  return (
    <aside className="xl:sticky xl:top-5 xl:self-start">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <p className="text-[12px] font-black tracking-[0.18em] text-[#1f5597]">ALL MATERIALS</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">전체 자료 검색</h2>
          <p className="mt-2 text-[12px] font-bold leading-5 text-slate-500">
            치료과정, 이미지, 영수증, 통계자료, 추가 상담자료까지 이곳에서 한 번에 찾을 수 있습니다.
          </p>
          <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-[12px] font-black text-[#1f5597]">
            전체 자료 모음 {materialCount}개가 사이드바 검색에 포함되어 있습니다.
          </div>
          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4">
            <Search className="h-5 w-5 text-[#1f5597]" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="암, 뇌, 심장, 위, 간, 폐, 수술 검색"
              className="h-12 min-w-0 flex-1 bg-transparent text-[13px] font-bold outline-none"
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setActiveFilter(option.id)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  activeFilter === option.id
                    ? "border-[#1f5597] bg-[#1f5597] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                }`}
              >
                <span className="block text-[12px] font-black">{option.label}</span>
                <span className={`mt-0.5 block text-[10px] font-bold ${activeFilter === option.id ? "text-blue-100" : "text-slate-400"}`}>
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[72vh] space-y-2 overflow-y-auto p-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-[#1f5597] ring-1 ring-blue-100">
                  {typeLabel[item.type]}
                </p>
                <p className="truncate text-[10px] font-black text-slate-400">{item.subtitle}</p>
              </div>
              <p className="mt-1 text-[13px] font-black leading-5 text-slate-900">{item.title}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-2xl bg-slate-50 p-6 text-center text-[12px] font-black text-slate-400">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function StepDetail({ step, special }: { step: GuideStep; special: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-[12px] font-black text-[#1f5597]">확인 항목</p>
          <h3 className="mt-1 text-2xl font-black text-slate-900">{step.detailTitle}</h3>
          <p className="mt-3 rounded-2xl bg-white p-4 text-[13px] font-bold leading-6 text-slate-600">
            <b className="text-slate-900">발생 상황:</b> {step.trigger}
          </p>

          <div className="mt-4 grid gap-3">
            {step.detail.map((text) => (
              <div key={text} className="flex gap-3 rounded-2xl bg-white p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1f5597]" />
                <p className="text-[13px] font-bold leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>

          {step.treatments && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {step.treatments.map((item) => (
                <div key={item.label} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-[13px] font-black text-emerald-800">{item.label}</p>
                  <p className="mt-2 text-[12px] font-bold leading-5 text-emerald-700">{item.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className={`rounded-2xl border p-4 ${toneClass[step.tone]}`}>
            <p className="flex items-center gap-2 text-[14px] font-black">
              <HeartPulse className="h-5 w-5" />
              필요한 보장
            </p>
            <div className="mt-3 space-y-2">
              {step.coverages.map((coverage) => (
                <div key={coverage.label} className="rounded-xl bg-white/80 p-3">
                  <p className="text-[12px] font-black">{coverage.label}</p>
                  <p className="mt-1 text-[11px] font-bold leading-5 opacity-80">{coverage.body}</p>
                </div>
              ))}
            </div>
          </div>

          <InfoMini icon={<ReceiptText className="h-5 w-5" />} title="비용 확인" body={step.costMemo} />
          <InfoMini icon={<ClipboardList className="h-5 w-5" />} title="확인 서류" body={step.documents.join(" · ")} />
          <InfoMini icon={<Stethoscope className="h-5 w-5" />} title="공적지원 한계" body={special} />
        </div>
      </div>
    </div>
  )
}

function TreatmentCostTabs({
  tabs,
  activeId,
  onSelect,
  onSelectImage,
}: {
  tabs: TreatmentCostTab[]
  activeId: string
  onSelect: (id: string) => void
  onSelectImage: (item: { title: string; image: string }) => void
}) {
  const active = tabs.find((tab) => tab.id === activeId) || tabs[0]
  const relatedImages = active.images || (active.image ? [{ title: active.title, image: active.image }] : [])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-5">
        <p className="text-[12px] font-black tracking-[0.18em] text-[#1f5597]">TREATMENT COST</p>
        <h3 className="mt-1 text-xl font-black text-slate-900">치료행위별 비용 확인</h3>
        <p className="mt-2 text-[13px] font-bold leading-6 text-slate-500">
          치료 항목을 누르면 필요한 보장과 예상 비용을 바로 확인할 수 있습니다.
        </p>
      </div>

      <div className="grid gap-2 border-b border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`rounded-xl px-3 py-3 text-left transition ${active.id === tab.id ? "bg-[#1f5597] text-white shadow-sm" : "bg-white text-slate-600 hover:bg-blue-50"}`}
          >
            <p className="text-[13px] font-black">{tab.title}</p>
            <p className="mt-1 line-clamp-2 text-[11px] font-bold opacity-80">{tab.subtitle}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-[12px] font-black text-slate-400">{active.title}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{active.cost}</p>
            <p className="mt-3 text-[13px] font-bold leading-6 text-slate-600">{active.body}</p>
            <p className="mt-3 rounded-xl bg-white p-3 text-[12px] font-black leading-5 text-[#1f5597]">{active.coverage}</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {active.items.map((item) => (
              <div key={`${active.id}-${item.label}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[12px] font-black text-slate-500">{item.label}</p>
                <p className="mt-1 text-[18px] font-black text-slate-900">{item.value}</p>
                {item.note && <p className="mt-2 text-[11px] font-bold leading-5 text-slate-500">{item.note}</p>}
              </div>
            ))}
          </div>
        </div>

        {relatedImages.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-[12px] font-black text-slate-500">관련 자료</p>
            {relatedImages.map((image) => (
              <button
                key={image.image}
                onClick={() => onSelectImage(image)}
                className="mb-2 flex w-full items-center justify-between rounded-xl bg-white px-3 py-3 text-left text-[12px] font-black text-slate-700 transition hover:bg-blue-50 hover:text-[#1f5597]"
              >
                <span>{image.title}</span>
                <Eye className="h-4 w-4 shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-[12px] font-bold leading-6 text-slate-500">
            이 치료는 병원, 수술명, 급여 기준, 약관상 수술 분류에 따라 금액 차이가 큽니다. 영수증과 세부내역서로 실제 비용을 확인해야 합니다.
          </div>
        )}
      </div>
    </div>
  )
}

function SpecialCasePanel({ guide }: { guide: GuideTab }) {
  if (!guide.specialRows) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[12px] font-bold leading-6 text-amber-900">
        {guide.special}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white">
      <div className="bg-amber-50 p-4">
        <p className="text-[13px] font-black text-amber-900">산정특례 핵심 표</p>
        <p className="mt-1 text-[12px] font-bold leading-5 text-amber-800">{guide.special}</p>
      </div>
      <table className="w-full border-t border-amber-100 text-left text-[12px]">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3 font-black">구분</th>
            <th className="px-4 py-3 font-black">본인부담률</th>
            <th className="px-4 py-3 font-black">적용기간</th>
          </tr>
        </thead>
        <tbody>
          {guide.specialRows.map((row) => (
            <tr key={row.disease} className={row.highlight ? "bg-red-50 text-red-800" : "border-t border-slate-100 text-slate-600"}>
              <td className="px-4 py-3 font-black">{row.disease}</td>
              <td className="px-4 py-3 font-black">{row.burden}</td>
              <td className="px-4 py-3 font-bold">{row.period}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-amber-100 bg-amber-50 p-4 text-[11px] font-bold leading-5 text-amber-900">
        산정특례는 급여 본인부담을 낮춰주는 제도입니다. 비급여, 선별급여, 전액본인부담, 간병비, 생활비는 별도로 남을 수 있습니다.
      </div>
    </div>
  )
}

function InfoMini({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="flex items-center gap-2 text-[13px] font-black text-slate-900">
        <span className="text-[#1f5597]">{icon}</span>
        {title}
      </p>
      <p className="mt-2 text-[12px] font-bold leading-6 text-slate-500">{body}</p>
    </div>
  )
}

function ImageModal({ item, onClose }: { item: { title: string; image: string }; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-black tracking-[0.2em] text-[#1f5597]">IMAGE MATERIAL</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{item.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-900 p-3 text-white hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-auto bg-slate-100 p-4">
          <img src={item.image} alt={item.title} className="mx-auto max-h-[78vh] w-auto max-w-full rounded-2xl bg-white object-contain shadow-sm" />
        </div>
      </div>
    </div>
  )
}

function PreviewModal({ item, onClose }: { item: CoverageStatItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-black tracking-[0.2em] text-[#1f5597]">IMAGE MATERIAL</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{item.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-900 p-3 text-white hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-auto bg-slate-100 p-4">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="mx-auto max-h-[78vh] w-auto max-w-full rounded-2xl bg-white object-contain shadow-sm" />
          ) : (
            <div className="grid min-h-[420px] place-items-center rounded-2xl bg-white text-center">
              <div>
                <ImageIcon className="mx-auto h-16 w-16 text-[#1f5597]/30" />
                <p className="mt-4 text-lg font-black text-slate-700">{item.title}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
