"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Calculator, Plus, RotateCcw, ShieldCheck } from "lucide-react"

type TabId = "health" | "death" | "saving"
type CompanyType = "생명" | "손해"
type PlanId = "min" | "standard" | "max"

type Company = {
  id: string
  name: string
  type: CompanyType
}

type Coverage = {
  id: string
  title: string
  guide: string
  plans: Record<PlanId, string>
  scope: string[]
}

const tabs: { id: TabId; label: string; desc: string }[] = [
  { id: "health", label: "건강보험 비교", desc: "암, 뇌·심장, 수술비 등 담보별 최저 보험료와 교차설계를 비교합니다." },
  { id: "death", label: "종신/사망 비교", desc: "종신보험과 정기특약·정기보험의 보험료 차이를 비교합니다." },
  { id: "saving", label: "저축성 비교", desc: "금리, 이자, 환급률 차이에 따른 예상 적립액과 연금수령액을 비교합니다." },
]

const defaultCompanies: Company[] = [
  { id: "sl", name: "삼성생명", type: "생명" },
  { id: "hl", name: "한화생명", type: "생명" },
  { id: "kl", name: "교보생명", type: "생명" },
  { id: "shinhan", name: "신한라이프", type: "생명" },
  { id: "mirae", name: "미래에셋생명", type: "생명" },
  { id: "dongyang", name: "동양생명", type: "생명" },
  { id: "heungkukLife", name: "흥국생명", type: "생명" },
  { id: "kbLife", name: "KB라이프", type: "생명" },
  { id: "abl", name: "ABL생명", type: "생명" },
  { id: "dbLife", name: "DB생명", type: "생명" },
  { id: "sf", name: "삼성화재", type: "손해" },
  { id: "hyundai", name: "현대해상", type: "손해" },
  { id: "db", name: "DB손보", type: "손해" },
  { id: "kb", name: "KB손보", type: "손해" },
  { id: "meritz", name: "메리츠화재", type: "손해" },
  { id: "hanwhaFire", name: "한화손보", type: "손해" },
  { id: "lotte", name: "롯데손보", type: "손해" },
  { id: "heungkukFire", name: "흥국화재", type: "손해" },
  { id: "nh", name: "농협손보", type: "손해" },
  { id: "hana", name: "하나손보", type: "손해" },
]

const healthCoverages: Coverage[] = [
  { id: "cancer", title: "암진단비", guide: "일반암 범위, 유사암 금액, 소액암 분류, 면책·감액기간을 함께 봅니다.", plans: { min: "2,000만원", standard: "3,000만원", max: "5,000만원" }, scope: ["일반암 범위", "유사암", "소액암", "고액암", "면책/감액"] },
  { id: "similarCancer", title: "유사암진단비", guide: "갑상선암, 기타피부암, 제자리암, 경계성종양의 지급 비율을 확인합니다.", plans: { min: "300만원", standard: "500만원", max: "1,000만원" }, scope: ["갑상선암", "제자리암", "경계성", "기타피부암"] },
  { id: "brain", title: "뇌혈관진단비", guide: "뇌출혈보다 뇌졸중, 뇌졸중보다 뇌혈관질환이 범위가 넓습니다.", plans: { min: "500만원", standard: "1,000만원", max: "2,000만원" }, scope: ["뇌출혈", "뇌졸중", "뇌혈관질환"] },
  { id: "heart", title: "허혈성심장질환", guide: "급성심근경색보다 허혈성심장질환이 넓은 범위입니다.", plans: { min: "500만원", standard: "1,000만원", max: "2,000만원" }, scope: ["급성심근경색", "협심증", "허혈성심장질환"] },
  { id: "surgery", title: "질병수술비", guide: "넓게 반복 지급되는지, 같은 질병 반복 제한이 있는지 확인합니다.", plans: { min: "10만원", standard: "30만원", max: "50만원" }, scope: ["일반수술", "반복지급", "동일질병 제한"] },
  { id: "nSurgery", title: "N대수술비", guide: "목록형 담보라 포함 수술과 제외 수술을 반드시 확인합니다.", plans: { min: "500만원", standard: "1,000만원", max: "2,000만원" }, scope: ["암수술", "뇌수술", "심장수술", "목록 제한"] },
  { id: "cancerTreatment", title: "암주요치료비", guide: "진단비는 생활비, 주요치료비는 실제 치료 선택지로 분리합니다.", plans: { min: "1,000만원", standard: "2,000만원", max: "3,000만원" }, scope: ["수술", "항암", "방사선", "표적/면역"] },
  { id: "circulatoryTreatment", title: "순환계주요치료비", guide: "진단 후 시술, 재활, 중환자실, 간병 비용까지 봅니다.", plans: { min: "500만원", standard: "1,000만원", max: "2,000만원" }, scope: ["스텐트", "수술", "중환자실", "재활"] },
  { id: "care", title: "간병", guide: "시설 간병, 간병인 사용, 가족 소득공백을 보완합니다.", plans: { min: "월 50만원", standard: "월 100만원", max: "월 150만원" }, scope: ["장기요양", "간병인", "시설", "갱신"] },
  { id: "homeCare", title: "재가", guide: "집에서 방문요양, 주야간보호, 복지용구를 이용할 때 필요한 비용입니다.", plans: { min: "월 30만원", standard: "월 70만원", max: "월 100만원" }, scope: ["방문요양", "주야간보호", "복지용구", "본인부담"] },
]

const deathCoverages: Coverage[] = [
  { id: "whole", title: "종신보험", guide: "평생 사망보장, 상속·유족생활비 재원으로 활용합니다.", plans: { min: "5,000만원", standard: "1억원", max: "2억원" }, scope: ["평생보장", "상속재원", "해약환급금"] },
  { id: "term", title: "정기특약/정기보험", guide: "자녀 독립 전, 대출 상환기처럼 필요한 기간만 크게 준비합니다.", plans: { min: "5,000만원", standard: "1억원", max: "2억원" }, scope: ["기간보장", "저렴한 보험료", "만기 후 종료"] },
  { id: "diseaseDeath", title: "질병사망", guide: "질병으로 인한 사망보장만 별도 비교합니다.", plans: { min: "3,000만원", standard: "5,000만원", max: "1억원" }, scope: ["질병사망", "재해 제외", "보험기간"] },
]

const formatWon = (value: number) => `${Math.round(value).toLocaleString()}원`
const toNumber = (value: string | number | undefined) => Number(String(value || "").replace(/,/g, "")) || 0

export default function PremiumComparePage() {
  const [activeTab, setActiveTab] = useState<TabId>("health")
  const [companies, setCompanies] = useState(defaultCompanies)
  const [newCompany, setNewCompany] = useState("")
  const [newCompanyType, setNewCompanyType] = useState<CompanyType>("손해")
  const [plan, setPlan] = useState<PlanId>("standard")
  const [payYears, setPayYears] = useState(20)
  const [premiums, setPremiums] = useState<Record<string, Record<string, number>>>({})
  const [scopeScores, setScopeScores] = useState<Record<string, Record<string, number>>>({})
  const [monthlySaving, setMonthlySaving] = useState(300000)
  const [annuityYears, setAnnuityYears] = useState(20)
  const [savingRates, setSavingRates] = useState<Record<string, { rate: number; r5: number; r7: number; r10: number }>>({})

  const currentCoverages = activeTab === "death" ? deathCoverages : healthCoverages

  const compare = useMemo(() => {
    const coverageResults = currentCoverages.map((coverage) => {
      const rows = companies
        .map((company) => ({
          company,
          premium: premiums[coverage.id]?.[company.id] || 0,
          scope: scopeScores[coverage.id]?.[company.id] || 3,
        }))
        .filter((row) => row.premium > 0)
      const best = rows.sort((a, b) => a.premium - b.premium)[0]
      const balanced = [...rows].sort((a, b) => b.scope / b.premium - a.scope / a.premium)[0]
      return { coverage, best, balanced }
    })

    const companyTotals = companies.map((company) => ({
      company,
      total: currentCoverages.reduce((sum, coverage) => sum + (premiums[coverage.id]?.[company.id] || 0), 0),
    })).filter((item) => item.total > 0)

    const bestSingle = companyTotals.sort((a, b) => a.total - b.total)[0]
    const crossTotal = coverageResults.reduce((sum, item) => sum + (item.best?.premium || 0), 0)
    const monthlySave = bestSingle ? Math.max(bestSingle.total - crossTotal, 0) : 0
    return { coverageResults, bestSingle, crossTotal, monthlySave }
  }, [companies, currentCoverages, premiums, scopeScores])

  const savingResults = useMemo(() => {
    return companies.map((company) => {
      const input = savingRates[company.id] || { rate: 3, r5: 90, r7: 96, r10: 103 }
      const monthlyRate = input.rate / 100 / 12
      const months = payYears * 12
      const futureValue = monthlyRate > 0
        ? monthlySaving * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
        : monthlySaving * months
      const monthlyPension = futureValue / (annuityYears * 12)
      return { company, ...input, futureValue, monthlyPension }
    }).sort((a, b) => b.futureValue - a.futureValue)
  }, [annuityYears, companies, monthlySaving, payYears, savingRates])

  const addCompany = () => {
    const name = newCompany.trim()
    if (!name) return
    setCompanies((prev) => [...prev, { id: `custom-${Date.now()}`, name, type: newCompanyType }])
    setNewCompany("")
  }

  const updatePremium = (coverageId: string, companyId: string, value: string) => {
    setPremiums((prev) => ({ ...prev, [coverageId]: { ...prev[coverageId], [companyId]: toNumber(value) } }))
  }

  const updateScope = (coverageId: string, companyId: string, value: string) => {
    setScopeScores((prev) => ({ ...prev, [coverageId]: { ...prev[coverageId], [companyId]: toNumber(value) || 3 } }))
  }

  const updateSaving = (companyId: string, key: "rate" | "r5" | "r7" | "r10", value: string) => {
    setSavingRates((prev) => ({
      ...prev,
      [companyId]: { ...{ rate: 3, r5: 90, r7: 96, r10: 103 }, ...prev[companyId], [key]: toNumber(value) },
    }))
  }

  return (
    <main className="min-h-screen bg-[#eef3fb] text-slate-900">
      <div className="mx-auto max-w-[1600px] px-5 py-6 md:px-8">
        <header className="mb-5 rounded-2xl bg-[#153968] px-6 py-6 text-white shadow-lg md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[12px] font-black tracking-[0.22em] text-sky-200">CROSS DESIGN COMPARISON</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">교차설계 보험료 비교</h1>
              <p className="mt-3 max-w-4xl text-[15px] font-bold leading-7 text-white/75">
                담보별 보험료와 보장범위를 입력하면 단일회사 설계와 담보별 최저 교차설계를 비교합니다. 저장 없이 현장 상담용으로만 사용합니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.open("/dashboard", "_self")} className="rounded-xl bg-white/10 px-5 py-3 text-[13px] font-black hover:bg-white/20">대시보드</button>
              <button onClick={() => window.close()} className="rounded-xl bg-white px-5 py-3 text-[13px] font-black text-[#153968]">창 닫기</button>
            </div>
          </div>
        </header>

        <section className="mb-5 grid gap-3 md:grid-cols-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl border p-5 text-left shadow-sm transition ${activeTab === tab.id ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-slate-200 bg-white hover:border-[#2563eb]"}`}
            >
              <p className="text-lg font-black">{tab.label}</p>
              <p className={`mt-2 text-[13px] font-bold leading-6 ${activeTab === tab.id ? "text-blue-50" : "text-slate-500"}`}>{tab.desc}</p>
            </button>
          ))}
        </section>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_160px]">
            <div>
              <p className="mb-2 text-[12px] font-black text-slate-500">보험사 추가</p>
              <div className="flex gap-2">
                <input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="보험사명 입력" className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-[14px] font-bold outline-none focus:border-[#2563eb]" />
                <select value={newCompanyType} onChange={(e) => setNewCompanyType(e.target.value as CompanyType)} className="h-11 rounded-xl border border-slate-200 px-3 text-[13px] font-bold">
                  <option>생명</option>
                  <option>손해</option>
                </select>
                <button onClick={addCompany} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#153968] px-4 text-[13px] font-black text-white"><Plus size={16} />추가</button>
              </div>
            </div>
            <Control label="가입안" value={plan} onChange={(v) => setPlan(v as PlanId)} options={[["min", "1안 최소"], ["standard", "2안 표준"], ["max", "3안 최대"]]} />
            <Control label="납입기간" value={String(payYears)} onChange={(v) => setPayYears(Number(v))} options={[["20", "20년납"], ["30", "30년납"]]} />
            <button onClick={() => { setPremiums({}); setScopeScores({}); setSavingRates({}) }} className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-black text-slate-600 hover:bg-slate-100">
              <RotateCcw size={16} /> 입력 초기화
            </button>
          </div>
        </section>

        {activeTab === "saving" ? (
          <SavingComparison
            companies={companies}
            monthlySaving={monthlySaving}
            setMonthlySaving={setMonthlySaving}
            payYears={payYears}
            annuityYears={annuityYears}
            setAnnuityYears={setAnnuityYears}
            savingResults={savingResults}
            savingRates={savingRates}
            updateSaving={updateSaving}
          />
        ) : (
          <PremiumComparison
            companies={companies}
            coverages={currentCoverages}
            plan={plan}
            payYears={payYears}
            premiums={premiums}
            scopeScores={scopeScores}
            updatePremium={updatePremium}
            updateScope={updateScope}
            compare={compare}
            activeTab={activeTab}
          />
        )}

        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[13px] font-bold leading-6 text-amber-900">
          본 화면은 현장 상담용 예상 비교 도구입니다. 실제 보험료, 가입 가능 여부, 보장범위, 면책·감액기간은 보험사 산출 시스템과 약관, 직업, 건강상태, 심사 결과에 따라 달라질 수 있습니다.
        </section>
      </div>
    </main>
  )
}

function Control({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <label>
      <span className="mb-2 block text-[12px] font-black text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] font-bold outline-none focus:border-[#2563eb]">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}

function PremiumComparison({ companies, coverages, plan, payYears, premiums, scopeScores, updatePremium, updateScope, compare, activeTab }: any) {
  const multiplier = payYears * 12
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-[#153968]">{activeTab === "death" ? "종신/사망 보험료 입력" : "건강보험 담보별 보험료 입력"}</h2>
          <p className="mt-1 text-[13px] font-bold text-slate-500">보험료는 월 보험료 기준으로 입력하세요. 보장범위 점수는 1~5점으로 입력합니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#172334] text-white">
                <th className="sticky left-0 z-10 w-[250px] bg-[#172334] p-3 text-left">담보 / 기준금액</th>
                {companies.map((company: Company) => (
                  <th key={company.id} className="min-w-[150px] p-3">
                    <span className="block font-black">{company.name}</span>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${company.type === "생명" ? "bg-blue-500" : "bg-rose-500"}`}>{company.type}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coverages.map((coverage: Coverage) => (
                <tr key={coverage.id} className="border-b border-slate-100 align-top">
                  <td className="sticky left-0 z-10 bg-slate-50 p-3">
                    <p className="font-black text-slate-900">{coverage.title}</p>
                    <p className="mt-1 font-black text-[#2563eb]">{coverage.plans[plan as PlanId]}</p>
                    <p className="mt-2 text-[12px] leading-5 text-slate-500">{coverage.guide}</p>
                    <p className="mt-2 text-[11px] font-bold text-slate-400">{coverage.scope.join(" · ")}</p>
                  </td>
                  {companies.map((company: Company) => (
                    <td key={company.id} className="p-2">
                      <input
                        value={premiums[coverage.id]?.[company.id] || ""}
                        onChange={(e) => updatePremium(coverage.id, company.id, e.target.value)}
                        placeholder="보험료"
                        className="mb-2 h-9 w-full rounded-lg border border-slate-200 px-2 text-right font-bold outline-none focus:border-[#2563eb]"
                      />
                      <input
                        value={scopeScores[coverage.id]?.[company.id] || ""}
                        onChange={(e) => updateScope(coverage.id, company.id, e.target.value)}
                        placeholder="범위점수"
                        className="h-8 w-full rounded-lg border border-slate-200 px-2 text-right text-[12px] font-bold outline-none focus:border-emerald-500"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="space-y-4">
        <ResultCard title="교차설계 요약">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="단일회사 최저" value={compare.bestSingle ? formatWon(compare.bestSingle.total) : "-"} />
            <Metric label="교차설계" value={compare.crossTotal ? formatWon(compare.crossTotal) : "-"} />
            <Metric label="월 절감액" value={formatWon(compare.monthlySave)} strong />
            <Metric label={`${payYears}년납 총 절감`} value={formatWon(compare.monthlySave * multiplier)} strong />
          </div>
          {compare.bestSingle && (
            <p className="mt-4 rounded-xl bg-blue-50 p-4 text-[13px] font-bold leading-6 text-slate-700">
              {compare.bestSingle.company.name} 단일 설계 대비, 담보별 최저 보험사를 나누면 월 {formatWon(compare.monthlySave)} 정도 절감되는 구조입니다.
            </p>
          )}
        </ResultCard>

        <ResultCard title="담보별 추천 조합">
          <div className="space-y-2">
            {compare.coverageResults.map((item: any) => (
              <div key={item.coverage.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-900">{item.coverage.title}</p>
                  <p className="text-[13px] font-black text-[#2563eb]">{item.best ? item.best.company.name : "-"}</p>
                </div>
                <p className="mt-1 text-[12px] font-bold text-slate-500">
                  최저 {item.best ? formatWon(item.best.premium) : "-"} · 범위점수 {item.best?.scope || "-"}점
                </p>
                {item.balanced && item.balanced.company.id !== item.best?.company.id && (
                  <p className="mt-1 text-[12px] font-bold text-emerald-600">가성비 후보: {item.balanced.company.name}</p>
                )}
              </div>
            ))}
          </div>
        </ResultCard>
      </aside>
    </div>
  )
}

function SavingComparison({ companies, monthlySaving, setMonthlySaving, payYears, annuityYears, setAnnuityYears, savingResults, savingRates, updateSaving }: any) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-[#153968]">저축성 보험 금리·환급률 비교</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label>
              <span className="mb-2 block text-[12px] font-black text-slate-500">월 납입보험료</span>
              <input value={monthlySaving} onChange={(e) => setMonthlySaving(toNumber(e.target.value))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-right font-bold" />
            </label>
            <label>
              <span className="mb-2 block text-[12px] font-black text-slate-500">연금 수령기간</span>
              <select value={annuityYears} onChange={(e) => setAnnuityYears(Number(e.target.value))} className="h-11 w-full rounded-xl border border-slate-200 px-3 font-bold">
                <option value={10}>10년</option>
                <option value={20}>20년</option>
                <option value={30}>30년</option>
              </select>
            </label>
            <div className="rounded-xl bg-blue-50 p-4 text-[13px] font-bold leading-6 text-slate-700">
              납입기간은 상단의 20년납/30년납 선택값을 사용합니다. 5년·7년·10년 환급률은 회사별 직접 입력합니다.
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#172334] text-white">
                <th className="p-3 text-left">보험사</th>
                <th className="p-3">구분</th>
                <th className="p-3">예상 이율</th>
                <th className="p-3">5년 환급률</th>
                <th className="p-3">7년 환급률</th>
                <th className="p-3">10년 환급률</th>
                <th className="p-3">예상 적립액</th>
                <th className="p-3">월 연금 예상</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company: Company) => {
                const input = savingRates[company.id] || { rate: 3, r5: 90, r7: 96, r10: 103 }
                const result = savingResults.find((row: any) => row.company.id === company.id)
                return (
                  <tr key={company.id} className="border-b border-slate-100">
                    <td className="bg-slate-50 p-3 font-black">{company.name}</td>
                    <td className="p-3 text-center font-bold">{company.type}</td>
                    {(["rate", "r5", "r7", "r10"] as const).map((key) => (
                      <td key={key} className="p-2">
                        <input value={input[key]} onChange={(e) => updateSaving(company.id, key, e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 px-2 text-right font-bold" />
                      </td>
                    ))}
                    <td className="p-3 text-right font-black text-[#2563eb]">{formatWon(result?.futureValue || 0)}</td>
                    <td className="p-3 text-right font-black text-emerald-600">{formatWon(result?.monthlyPension || 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="space-y-4">
        <ResultCard title="저축성 비교 요약">
          <div className="space-y-3">
            {savingResults.slice(0, 5).map((row: any, idx: number) => (
              <div key={row.company.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex justify-between">
                  <p className="font-black">{idx + 1}. {row.company.name}</p>
                  <p className="font-black text-[#2563eb]">{row.rate}%</p>
                </div>
                <p className="mt-1 text-[12px] font-bold text-slate-500">예상 적립액 {formatWon(row.futureValue)} · 월 연금 {formatWon(row.monthlyPension)}</p>
                <p className="mt-1 text-[12px] font-bold text-slate-500">환급률 5년 {row.r5}% / 7년 {row.r7}% / 10년 {row.r10}%</p>
              </div>
            ))}
          </div>
        </ResultCard>
        <ResultCard title="상담 포인트">
          <p className="text-[13px] font-bold leading-7 text-slate-700">
            저축성은 단순 금리보다 사업비, 환급률, 연금개시 시점, 중도해지 가능성을 함께 봐야 합니다. 같은 월 납입액이라도 이율과 환급률 차이로 최종 적립액과 월 연금이 달라집니다.
          </p>
        </ResultCard>
      </aside>
    </div>
  )
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-[#153968]">
        <ShieldCheck size={18} />
        <h3 className="font-black">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${strong ? "bg-blue-600 text-white" : "bg-slate-50"}`}>
      <p className={`text-[12px] font-black ${strong ? "text-blue-100" : "text-slate-500"}`}>{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  )
}
