"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calculator, Plus, RotateCcw, ShieldCheck } from "lucide-react"

type MainTab = "health" | "death" | "saving"
type ViewTab = "company" | "coverage"
type CompanyType = "생명" | "손해"
type CompanyFilter = "전체" | CompanyType
type PlanId = "min" | "standard" | "max"
type Disclosure = "325" | "335" | "355" | "standard"

type Company = {
  id: string
  name: string
  type: CompanyType
  healthFactor: number
  deathFactor: number
  savingRate: number
  refund5: number
  refund7: number
  refund10: number
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
}

const companies: Company[] = [
  { id: "sl", name: "삼성생명", type: "생명", healthFactor: 1.07, deathFactor: 0.96, savingRate: 3.05, refund5: 91, refund7: 97, refund10: 104 },
  { id: "hl", name: "한화생명", type: "생명", healthFactor: 1.02, deathFactor: 0.94, savingRate: 3.15, refund5: 92, refund7: 98, refund10: 105 },
  { id: "kyobo", name: "교보생명", type: "생명", healthFactor: 1.1, deathFactor: 0.92, savingRate: 3.0, refund5: 90, refund7: 97, refund10: 104 },
  { id: "shinhan", name: "신한라이프", type: "생명", healthFactor: 1.04, deathFactor: 0.98, savingRate: 3.18, refund5: 91, refund7: 99, refund10: 106 },
  { id: "kbLife", name: "KB라이프", type: "생명", healthFactor: 1.12, deathFactor: 0.95, savingRate: 3.1, refund5: 90, refund7: 98, refund10: 105 },
  { id: "sf", name: "삼성화재", type: "손해", healthFactor: 1.03, deathFactor: 1.08, savingRate: 2.85, refund5: 88, refund7: 94, refund10: 101 },
  { id: "hyundai", name: "현대해상", type: "손해", healthFactor: 0.98, deathFactor: 1.11, savingRate: 2.9, refund5: 89, refund7: 95, refund10: 102 },
  { id: "db", name: "DB손보", type: "손해", healthFactor: 0.95, deathFactor: 1.13, savingRate: 2.82, refund5: 88, refund7: 94, refund10: 101 },
  { id: "kb", name: "KB손보", type: "손해", healthFactor: 1.0, deathFactor: 1.1, savingRate: 2.88, refund5: 89, refund7: 95, refund10: 102 },
  { id: "meritz", name: "메리츠화재", type: "손해", healthFactor: 0.93, deathFactor: 1.15, savingRate: 2.8, refund5: 88, refund7: 94, refund10: 101 },
  { id: "hanwhaFire", name: "한화손보", type: "손해", healthFactor: 1.01, deathFactor: 1.12, savingRate: 2.86, refund5: 89, refund7: 95, refund10: 102 },
  { id: "heungkukFire", name: "흥국화재", type: "손해", healthFactor: 0.97, deathFactor: 1.09, savingRate: 2.84, refund5: 88, refund7: 95, refund10: 102 },
]

const healthCoverages: Coverage[] = [
  { id: "cancer", title: "암진단비", category: "암", amount: { min: 2000, standard: 3000, max: 5000 }, unit: "만원", baseRate: 4.9, benefit: "일반암 진단 시 생활비와 치료 선택자금 확보", strength: "일반암 범위, 유사암 지급비율, 소액암 분류가 중요", checkPoint: "면책 90일, 감액기간, 유사암 한도 확인" },
  { id: "similar", title: "유사암진단비", category: "암", amount: { min: 300, standard: 500, max: 1000 }, unit: "만원", baseRate: 2.2, benefit: "갑상선암, 기타피부암, 제자리암, 경계성종양 보완", strength: "소액 보장이지만 실제 청구 빈도가 높은 편", checkPoint: "일반암과 지급금액 차이 확인" },
  { id: "brain", title: "뇌혈관진단비", category: "뇌심장", amount: { min: 500, standard: 1000, max: 2000 }, unit: "만원", baseRate: 6.1, benefit: "뇌출혈보다 넓은 뇌혈관질환 범위 보완", strength: "보장범위가 넓을수록 실제 청구 가능성이 커짐", checkPoint: "뇌출혈/뇌졸중/뇌혈관질환 구분" },
  { id: "heart", title: "허혈성심장질환", category: "뇌심장", amount: { min: 500, standard: 1000, max: 2000 }, unit: "만원", baseRate: 5.4, benefit: "급성심근경색보다 넓은 심장질환 범위 보완", strength: "협심증까지 보는지 확인하면 비교가 쉬움", checkPoint: "급성심근경색/허혈성심장질환 구분" },
  { id: "surgery", title: "질병수술비", category: "수술", amount: { min: 10, standard: 30, max: 50 }, unit: "만원", baseRate: 92, benefit: "진단비 외 실제 수술 발생 시 반복 보완", strength: "넓게 반복 지급되는 구조가 실무적으로 유리", checkPoint: "동일질병 반복 지급, 약관상 수술 정의 확인" },
  { id: "nSurgery", title: "N대수술비", category: "수술", amount: { min: 500, standard: 1000, max: 2000 }, unit: "만원", baseRate: 2.8, benefit: "암, 뇌, 심장 등 고액 수술 집중 보완", strength: "특정 수술 목록이 넓고 명확한 회사가 유리", checkPoint: "목록형 담보라 포함/제외 수술 확인" },
  { id: "cancerTreatment", title: "암주요치료비", category: "암", amount: { min: 1000, standard: 2000, max: 3000 }, unit: "만원", baseRate: 3.7, benefit: "항암, 방사선, 표적·면역 치료 선택지 보완", strength: "진단비는 생활비, 주요치료비는 치료비로 분리", checkPoint: "치료 인정 범위, 연간 한도, 지급 횟수 확인" },
  { id: "circulatory", title: "순환계주요치료비", category: "뇌심장", amount: { min: 500, standard: 1000, max: 2000 }, unit: "만원", baseRate: 3.2, benefit: "시술, 수술, 중환자실, 재활 비용 보완", strength: "진단 후 치료 과정까지 설명하기 좋음", checkPoint: "보장 질병명과 치료 항목 확인" },
  { id: "care", title: "간병/재가", category: "간병", amount: { min: 50, standard: 100, max: 150 }, unit: "만원", baseRate: 38, benefit: "장기요양, 가족 소득공백, 돌봄 비용 보완", strength: "간병보험과 재가보험 사용 장소를 구분", checkPoint: "장기요양 등급, 갱신, 지급기간 확인" },
]

const deathCoverages: Coverage[] = [
  { id: "whole", title: "종신보험", category: "사망", amount: { min: 5000, standard: 10000, max: 20000 }, unit: "만원", baseRate: 1.65, benefit: "평생 사망보장과 상속·유족 생활비 재원", strength: "장기 유지와 자산 이전 목적에 적합", checkPoint: "해약환급금, 저해약 구조, 수익자 확인" },
  { id: "term", title: "정기특약/정기보험", category: "사망", amount: { min: 5000, standard: 10000, max: 20000 }, unit: "만원", baseRate: 0.42, benefit: "자녀 독립 전까지 큰 사망보장을 저렴하게 준비", strength: "같은 사망보험금 기준 보험료 효율이 높음", checkPoint: "만기 이후 보장 종료, 갱신 여부 확인" },
  { id: "diseaseDeath", title: "질병사망", category: "사망", amount: { min: 3000, standard: 5000, max: 10000 }, unit: "만원", baseRate: 0.72, benefit: "질병으로 인한 사망보장 별도 보완", strength: "종신보다 기간형 보완으로 쓰기 좋음", checkPoint: "재해사망 제외 여부와 보험기간 확인" },
]

const planLabels: Record<PlanId, string> = { min: "1안 최소", standard: "2안 표준", max: "3안 최대" }
const disclosureLabels: Record<Disclosure, string> = { standard: "일반고지", "325": "간편 3·2·5", "335": "간편 3·3·5", "355": "간편 3·5·5" }
const refundYears = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 40]

const formatWon = (value: number) => `${Math.round(value).toLocaleString()}원`
const formatMan = (value: number) => `${value.toLocaleString()}만원`

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

function premiumFor(company: Company, coverage: Coverage, plan: PlanId, age: number, gender: string, disclosure: Disclosure, tab: MainTab, delayYears = 0) {
  const amount = coverage.amount[plan]
  const ageFactor = 1 + Math.max(age + delayYears - 35, 0) * 0.026
  const genderFactor = gender === "남성" ? 1.06 : 0.97
  const disclosureFactor = disclosure === "325" ? 1.18 : disclosure === "335" ? 1.28 : disclosure === "355" ? 1.38 : 1
  const companyFactor = tab === "death" ? company.deathFactor : company.healthFactor
  const typeFactor = tab === "death" && company.type === "생명" ? 0.96 : tab === "health" && company.type === "손해" ? 0.95 : 1.04
  return Math.round(amount * coverage.baseRate * ageFactor * genderFactor * disclosureFactor * companyFactor * typeFactor)
}

export default function PremiumComparePage() {
  const [mainTab, setMainTab] = useState<MainTab>("health")
  const [viewTab, setViewTab] = useState<ViewTab>("company")
  const [plan, setPlan] = useState<PlanId>("standard")
  const [age, setAge] = useState(41)
  const [gender, setGender] = useState("남성")
  const [disclosure, setDisclosure] = useState<Disclosure>("standard")
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>("전체")
  const [payYears, setPayYears] = useState(20)
  const [delayYears, setDelayYears] = useState(1)
  const [monthlySaving, setMonthlySaving] = useState(300000)

  const coverages = mainTab === "death" ? deathCoverages : healthCoverages
  const visibleCompanies = useMemo(() => companies.filter((company) => companyFilter === "전체" || company.type === companyFilter), [companyFilter])

  const rows = useMemo(() => {
    return coverages.map((coverage) => {
      const premiums = visibleCompanies.map((company) => ({
        company,
        premium: premiumFor(company, coverage, plan, age, gender, disclosure, mainTab),
        later: premiumFor(company, coverage, plan, age, gender, disclosure, mainTab, delayYears),
      }))
      const sorted = [...premiums].sort((a, b) => a.premium - b.premium)
      return { coverage, premiums, best: sorted[0], worst: sorted[sorted.length - 1] }
    })
  }, [age, coverages, delayYears, disclosure, gender, mainTab, plan, visibleCompanies])

  const companyResults = useMemo(() => {
    return visibleCompanies.map((company) => {
      const total = coverages.reduce((sum, coverage) => sum + premiumFor(company, coverage, plan, age, gender, disclosure, mainTab), 0)
      const later = coverages.reduce((sum, coverage) => sum + premiumFor(company, coverage, plan, age, gender, disclosure, mainTab, delayYears), 0)
      return { company, total, later }
    }).sort((a, b) => a.total - b.total)
  }, [age, coverages, delayYears, disclosure, gender, mainTab, plan, visibleCompanies])

  const crossTotal = rows.reduce((sum, row) => sum + row.best.premium, 0)
  const crossLater = rows.reduce((sum, row) => sum + row.best.later, 0)
  const bestSingle = companyResults[0]
  const months = payYears * 12
  const ageDisclosureRows = useMemo(() => {
    const ageTargets = [age, age + 5, age + 10].filter((value, index, arr) => value > 0 && arr.indexOf(value) === index)
    return ageTargets.map((targetAge) => {
      const values = (["standard", "325", "335", "355"] as Disclosure[]).map((item) => {
        const best = visibleCompanies.map((company) => ({
          company,
          total: coverages.reduce((sum, coverage) => sum + premiumFor(company, coverage, plan, targetAge, gender, item, mainTab), 0),
        })).sort((a, b) => a.total - b.total)[0]
        return { disclosure: item, best }
      })
      return { age: targetAge, values }
    })
  }, [age, coverages, gender, mainTab, plan, visibleCompanies])

  const savingResults = useMemo(() => {
    return companies.map((company) => {
      const monthlyRate = company.savingRate / 100 / 12
      const futureValue = monthlySaving * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
      const pension = futureValue / 240
      return { company, futureValue, pension }
    }).sort((a, b) => b.futureValue - a.futureValue)
  }, [monthlySaving, months])

  return (
    <main className="min-h-screen bg-[#eef3fb] text-slate-900">
      <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8">
        <header className="mb-5 rounded-2xl bg-[#1f5597] text-white shadow-lg">
          <div className="flex flex-col gap-4 px-6 py-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[12px] font-black tracking-[0.2em] text-blue-100">PREMIUM COMPARISON</p>
              <h1 className="mt-2 text-3xl font-black">회사별/담보별 보험료 비교</h1>
              <p className="mt-3 max-w-4xl text-[14px] font-bold leading-7 text-white/80">
                고객 조건에 따라 매달 보험료와 유리한 회사가 달라질 수 있음을 보여주는 상담용 비교 화면입니다. 실제 보험료 산출 전 방향성을 설명하는 용도입니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/insurance-tools/coverage-stats" className="rounded-xl bg-white px-5 py-3 text-[13px] font-black text-[#1f5597] hover:bg-blue-50">보장별 통계자료</Link>
              <button onClick={() => window.open("/dashboard", "_self")} className="rounded-xl bg-white/10 px-5 py-3 text-[13px] font-black hover:bg-white/20">대시보드</button>
              <button onClick={() => window.close()} className="rounded-xl bg-white px-5 py-3 text-[13px] font-black text-[#1f5597]">창 닫기</button>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-white/15">
            {[
              { id: "health", label: "건강보험" },
              { id: "death", label: "종신/사망" },
              { id: "saving", label: "저축성" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setMainTab(tab.id as MainTab)} className={`py-4 text-[15px] font-black ${mainTab === tab.id ? "bg-white text-[#1f5597]" : "bg-[#1f5597] text-white/75 hover:bg-white/10"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            <Input label="나이" value={age} onChange={(v) => setAge(Number(v) || 0)} />
            <Select label="성별" value={gender} onChange={setGender} options={["남성", "여성"]} />
            <Select label="유병력 고지" value={disclosure} onChange={(v) => setDisclosure(v as Disclosure)} options={["standard", "325", "335", "355"]} labels={disclosureLabels} />
            <Select label="보험사 기준" value={companyFilter} onChange={(v) => setCompanyFilter(v as CompanyFilter)} options={["전체", "생명", "손해"]} />
            <Select label="가입안" value={plan} onChange={(v) => setPlan(v as PlanId)} options={["min", "standard", "max"]} labels={planLabels} />
            <Input label="납입기간" value={payYears} onChange={(v) => setPayYears(Number(v) || 20)} />
            <Input label="몇 년 뒤 가입" value={delayYears} onChange={(v) => setDelayYears(Number(v) || 0)} />
            {mainTab === "saving" && <Input label="월 납입액" value={monthlySaving} onChange={(v) => setMonthlySaving(Number(v) || 0)} />}
            <button onClick={() => { setAge(41); setGender("남성"); setDisclosure("standard"); setPlan("standard"); setDelayYears(1) }} className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 text-[13px] font-black text-slate-600 hover:bg-slate-200">
              <RotateCcw size={16} /> 초기화
            </button>
          </div>
        </section>

        {mainTab !== "saving" && (
          <>
            <section className="mb-5 grid gap-4 md:grid-cols-4">
              <SummaryCard label={`${companyFilter} 기준 단일회사 최저`} value={`${bestSingle.company.name} ${formatWon(bestSingle.total)}`} />
              <SummaryCard label="담보별 교차설계" value={formatWon(crossTotal)} accent />
              <SummaryCard label="월 절감 가능" value={formatWon(Math.max(bestSingle.total - crossTotal, 0))} accent />
              <SummaryCard label={`${delayYears}년 뒤 총 차이`} value={formatWon(Math.max(crossLater - crossTotal, 0) * months)} danger />
            </section>
            <AgeDisclosurePanel rows={ageDisclosureRows} />
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

        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[13px] font-bold leading-6 text-amber-900">
          실제 보험료는 보험사 산출일, 연령, 성별, 직업, 유병력 고지, 약관 개정, 심사 결과에 따라 달라집니다. 이 화면은 “어느 회사가 좋다”가 아니라 “조건에 따라 설계 방향이 달라진다”는 점을 설명하기 위한 상담용 예시입니다.
        </section>
      </div>
    </main>
  )
}

function CompanyView({ results, rows, months, crossTotal }: { results: { company: Company; total: number; later: number }[]; rows: { coverage: Coverage; best: { company: Company; premium: number }; worst: { company: Company; premium: number } }[]; months: number; crossTotal: number }) {
  const lowest = results[0].total
  const highest = results[results.length - 1].total
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#163f76] px-5 py-4 text-white">
        <h2 className="text-lg font-black">회사별 총 보험료 비교</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full border-collapse text-[13px]">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">보험사</th>
              <th className="p-4">구분</th>
              <th className="p-4">월 보험료</th>
              <th className="p-4">총 납입보험료</th>
              <th className="p-4">교차설계 대비</th>
              <th className="p-4">강점 담보</th>
            </tr>
          </thead>
          <tbody>
            {results.map((item) => {
              const strongCoverages = rows.filter((row) => row.best.company.id === item.company.id).map((row) => row.coverage.title)
              const isLow = item.total === lowest
              const isHigh = item.total === highest
              return (
                <tr key={item.company.id} className="border-b border-slate-100">
                  <td className="p-4 font-black">{item.company.name}</td>
                  <td className="p-4 text-center font-bold">{item.company.type}</td>
                  <td className={`p-4 text-center text-lg font-black ${isLow ? "text-blue-600" : isHigh ? "text-red-600" : "text-slate-900"}`}>{formatWon(item.total)}</td>
                  <td className="p-4 text-center font-black">{formatWon(item.total * months)}</td>
                  <td className="p-4 text-center font-black">{formatWon(Math.max(item.total - crossTotal, 0))}</td>
                  <td className="p-4 text-center text-[12px] font-bold text-slate-600">{strongCoverages.length ? strongCoverages.join(" · ") : "-"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AgeDisclosurePanel({ rows }: { rows: { age: number; values: { disclosure: Disclosure; best: { company: Company; total: number } }[] }[] }) {
  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-black text-[#153968]">나이대·고지 기준별 보험료 변동</h2>
        <p className="mt-1 text-[13px] font-bold text-slate-500">
          같은 담보라도 나이와 고지 기준이 바뀌면 최저 회사와 보험료가 달라질 수 있습니다.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[880px] w-full border-collapse text-[13px]">
          <thead className="bg-[#172334] text-white">
            <tr>
              <th className="p-4 text-left">나이</th>
              {(["standard", "325", "335", "355"] as Disclosure[]).map((item) => (
                <th key={item} className="p-4">{disclosureLabels[item]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.age} className="border-b border-slate-100">
                <td className="bg-slate-50 p-4 font-black">{row.age}세</td>
                {row.values.map((value) => (
                  <td key={value.disclosure} className="p-4 text-center">
                    <p className="font-black text-[#2563eb]">{formatWon(value.best.total)}</p>
                    <p className="mt-1 text-[12px] font-bold text-slate-500">{value.best.company.name}</p>
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

function CoverageView({ rows, plan }: { rows: { coverage: Coverage; premiums: { company: Company; premium: number; later: number }[]; best: { company: Company; premium: number }; worst: { company: Company; premium: number } }[]; plan: PlanId }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#163f76] px-5 py-4 text-white">
        <h2 className="text-lg font-black">담보별 최저/최대 및 보장 우수 포인트</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] w-full border-collapse text-[13px]">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left">담보</th>
              <th className="p-4">가입금액</th>
              <th className="p-4">최저 회사</th>
              <th className="p-4">최저 보험료</th>
              <th className="p-4">최대 회사</th>
              <th className="p-4">최대 보험료</th>
              <th className="p-4 text-left">보장 우수 내용</th>
              <th className="p-4 text-left">확인사항</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.coverage.id} className="border-b border-slate-100 align-top">
                <td className="p-4 font-black">{row.coverage.title}</td>
                <td className="p-4 text-center font-black text-[#2563eb]">{formatMan(row.coverage.amount[plan])}</td>
                <td className="p-4 text-center font-bold text-blue-600">{row.best.company.name}</td>
                <td className="p-4 text-center font-black text-blue-600">{formatWon(row.best.premium)}</td>
                <td className="p-4 text-center font-bold text-red-600">{row.worst.company.name}</td>
                <td className="p-4 text-center font-black text-red-600">{formatWon(row.worst.premium)}</td>
                <td className="p-4 leading-6 font-bold text-slate-700">{row.coverage.strength}</td>
                <td className="p-4 leading-6 font-bold text-slate-500">{row.coverage.checkPoint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SavingView({ results, monthlySaving, payYears }: { results: SavingResult[]; monthlySaving: number; payYears: number }) {
  const lifeResults = results.filter((row) => row.company.type === "생명")
  const refundMatrix = refundYears.map((year) => {
    const cells = lifeResults.map((row) => ({
      company: row.company,
      amount: refundAmountFor(row.company, year, monthlySaving, payYears),
      rate: refundRateFor(row.company, year, payYears),
    }))
    const valid = cells.filter((cell) => cell.amount > 0)
    const min = Math.min(...valid.map((cell) => cell.amount))
    const max = Math.max(...valid.map((cell) => cell.amount))
    return { year, cells, min, max }
  })

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#163f76] px-5 py-4 text-white">
          <h2 className="text-lg font-black">저축성 환급률 및 예상 연금 비교</h2>
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
                  <td className="p-4 text-center font-bold">{row.company.type}</td>
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
          <p className="mt-1 text-[12px] font-bold text-blue-100">월 납입액과 납입기간을 기준으로 연차별 예상 환급금과 환급률을 비교합니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="sticky left-0 z-10 bg-slate-100 p-4 text-left">연차</th>
                {lifeResults.map((row) => (
                  <th key={row.company.id} className="min-w-[150px] p-4">
                    <p className="font-black">{row.company.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">기준 {row.company.refund10}%</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="sticky left-0 z-10 bg-white p-4 font-black">월 보험료</td>
                {lifeResults.map((row) => (
                  <td key={row.company.id} className="p-4 text-center font-black">{formatWon(monthlySaving)}</td>
                ))}
              </tr>
              <tr className="border-b-2 border-slate-900">
                <td className="sticky left-0 z-10 bg-white p-4 font-black">총 납입액</td>
                {lifeResults.map((row) => (
                  <td key={row.company.id} className="p-4 text-center font-black">{formatWon(monthlySaving * payYears * 12)}</td>
                ))}
              </tr>
              {refundMatrix.map((row) => (
                <tr key={row.year} className={`border-b border-slate-100 ${row.year === 5 || row.year === 10 || row.year === 20 ? "bg-slate-100" : ""}`}>
                  <td className="sticky left-0 z-10 bg-inherit p-4 font-black">{row.year}년</td>
                  {row.cells.map((cell) => {
                    const isMin = cell.amount === row.min
                    const isMax = cell.amount === row.max
                    return (
                      <td key={cell.company.id} className={`p-4 text-center font-black ${isMin ? "text-blue-600" : isMax ? "text-red-600" : "text-slate-900"}`}>
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

function SummaryCard({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${accent ? "border-blue-200 bg-blue-50" : danger ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      <p className="text-[12px] font-black text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-black ${accent ? "text-blue-600" : danger ? "text-red-600" : "text-slate-900"}`}>{value}</p>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-black text-slate-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[14px] font-bold outline-none focus:border-[#2563eb]" />
    </label>
  )
}

function Select({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-black text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[14px] font-bold outline-none focus:border-[#2563eb]">
        {options.map((option) => <option key={option} value={option}>{labels?.[option] || option}</option>)}
      </select>
    </label>
  )
}
