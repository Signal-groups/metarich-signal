"use client"

import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { Eye, ImageIcon, X } from "lucide-react"

type CareGrade = "1" | "2" | "3" | "4" | "5" | "cognitive"
type CareService = "daycare" | "visitCare" | "bathCar" | "bathHome" | "bathNoCar" | "nursingHome" | "groupHome"
type CareBurden = "general" | "reduce40" | "reduce60" | "exempt"
type DaycareTime = "3to6" | "6to8" | "8to10" | "10to12" | "12plus"
type VisitCareTime = "30" | "60" | "90" | "120" | "150" | "180" | "210" | "240"

type Option<T extends string> = {
  id: T
  label: string
}

type ResourceLink = {
  title: string
  image: string
}

const RESOURCE_LINKS: ResourceLink[] = [
  { title: "장기요양 등급과 본인부담", image: "/coverage-stats/longterm-care-grade-cost-2605.png" },
  { title: "치매 전단계", image: "/coverage-stats/dementia-prestage-guide.png" },
  { title: "요양병원 요양원 차이", image: "/coverage-stats/nursing-hospital-vs-nursing-home.png" },
]

const CARE_LIMITS: Record<CareGrade, number> = {
  "1": 2512900,
  "2": 2331200,
  "3": 1528200,
  "4": 1409700,
  "5": 1208900,
  cognitive: 676320,
}

const DAYCARE_RATES: Record<DaycareTime, Record<CareGrade, number>> = {
  "3to6": { "1": 41820, "2": 38720, "3": 35740, "4": 34120, "5": 32490, cognitive: 32490 },
  "6to8": { "1": 55950, "2": 51800, "3": 47820, "4": 46280, "5": 44750, cognitive: 44750 },
  "8to10": { "1": 69760, "2": 64570, "3": 59610, "4": 58070, "5": 56530, cognitive: 56530 },
  "10to12": { "1": 76710, "2": 71010, "3": 65540, "4": 64000, "5": 62460, cognitive: 62460 },
  "12plus": { "1": 82570, "2": 76440, "3": 70560, "4": 69020, "5": 67480, cognitive: 67480 },
}

const VISIT_CARE_RATES: Record<VisitCareTime, number> = {
  "30": 17450,
  "60": 25320,
  "90": 34120,
  "120": 43430,
  "150": 50640,
  "180": 57020,
  "210": 63530,
  "240": 70080,
}

const BATH_RATES = {
  bathCar: 88990,
  bathHome: 80230,
  bathNoCar: 50100,
} satisfies Partial<Record<CareService, number>>

const FACILITY_RATES: Record<"nursingHome" | "groupHome", Record<"1" | "2" | "3", number>> = {
  nursingHome: { "1": 93070, "2": 86340, "3": 81540 },
  groupHome: { "1": 74590, "2": 69210, "3": 63800 },
}

const SERVICE_OPTIONS: Option<CareService>[] = [
  { id: "daycare", label: "주야간보호센터" },
  { id: "visitCare", label: "방문요양" },
  { id: "bathCar", label: "방문목욕(차량 내)" },
  { id: "bathHome", label: "방문목욕(가정 내)" },
  { id: "bathNoCar", label: "방문목욕(차량 미이용)" },
  { id: "nursingHome", label: "요양원" },
  { id: "groupHome", label: "공동생활가정" },
]

const GRADE_OPTIONS: Option<CareGrade>[] = [
  { id: "1", label: "1등급" },
  { id: "2", label: "2등급" },
  { id: "3", label: "3등급" },
  { id: "4", label: "4등급" },
  { id: "5", label: "5등급" },
  { id: "cognitive", label: "인지지원등급" },
]

const DAYCARE_TIME_OPTIONS: Option<DaycareTime>[] = [
  { id: "3to6", label: "3시간 이상 ~ 6시간 미만" },
  { id: "6to8", label: "6시간 이상 ~ 8시간 미만" },
  { id: "8to10", label: "8시간 이상 ~ 10시간 미만" },
  { id: "10to12", label: "10시간 이상 ~ 12시간 미만" },
  { id: "12plus", label: "12시간 이상" },
]

const VISIT_TIME_OPTIONS: Option<VisitCareTime>[] = [
  { id: "30", label: "30분 이상" },
  { id: "60", label: "60분 이상" },
  { id: "90", label: "90분 이상" },
  { id: "120", label: "120분 이상" },
  { id: "150", label: "150분 이상" },
  { id: "180", label: "180분 이상" },
  { id: "210", label: "210분 이상" },
  { id: "240", label: "240분 이상" },
]

const BURDEN_OPTIONS: Option<CareBurden>[] = [
  { id: "general", label: "일반 대상자" },
  { id: "reduce40", label: "40% 감경 대상자" },
  { id: "reduce60", label: "60% 감경 대상자" },
  { id: "exempt", label: "기초생활/의료급여 수급자" },
]

const BURDEN_RATES: Record<CareBurden, { home: number; facility: number; label: string }> = {
  general: { home: 0.15, facility: 0.2, label: "재가 15% / 시설 20%" },
  reduce40: { home: 0.09, facility: 0.12, label: "재가 9% / 시설 12%" },
  reduce60: { home: 0.06, facility: 0.08, label: "재가 6% / 시설 8%" },
  exempt: { home: 0, facility: 0, label: "본인부담 면제" },
}

function formatWon(value: number) {
  return Math.round(value).toLocaleString("ko-KR")
}

function parseNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "")
  return digits ? Number(digits) : 0
}

function isFacilityService(service: CareService): service is "nursingHome" | "groupHome" {
  return service === "nursingHome" || service === "groupHome"
}

function getFacilityGrade(grade: CareGrade): "1" | "2" | "3" {
  if (grade === "1" || grade === "2") return grade
  return "3"
}

function getServiceLabel(service: CareService) {
  return SERVICE_OPTIONS.find((option) => option.id === service)?.label ?? ""
}

function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
  helper,
}: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  helper?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#1A2744] focus:ring-4 focus:ring-[#1A2744]/10"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {helper && <span className="mt-2 block text-xs leading-5 text-slate-500">{helper}</span>}
    </label>
  )
}

function NumberRow({
  label,
  value,
  onChange,
  suffix,
  helper,
  min = 0,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
  helper?: string
  min?: number
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white transition focus-within:border-[#1A2744] focus-within:ring-4 focus-within:ring-[#1A2744]/10">
        <input
          value={formatWon(value)}
          onChange={(event) => onChange(Math.max(min, parseNumber(event.target.value)))}
          inputMode="numeric"
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-right text-sm font-bold text-slate-900 outline-none"
        />
        {suffix && (
          <span className="flex items-center border-l border-slate-100 bg-slate-50 px-3 text-xs font-semibold text-slate-500">
            {suffix}
          </span>
        )}
      </div>
      {helper && <span className="mt-2 block text-xs leading-5 text-slate-500">{helper}</span>}
    </label>
  )
}

function ResultCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "navy" | "gold" }) {
  const toneClass =
    tone === "navy"
      ? "border-[#1A2744] bg-[#1A2744] text-white"
      : tone === "gold"
        ? "border-[#C9A96E]/40 bg-[#FFF8EA] text-[#6B4E16]"
        : "border-slate-200 bg-white text-slate-900"

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className={`text-xs font-semibold ${tone === "default" ? "text-slate-500" : "opacity-80"}`}>{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
    </div>
  )
}

function ResourceQuickLinks({
  items,
  onSelect,
}: {
  items: ResourceLink[]
  onSelect: (item: ResourceLink) => void
}) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-[#1A2744]" />
        <p className="text-sm font-black text-slate-900">상담 자료 퀵링크</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.image}
            type="button"
            onClick={() => onSelect(item)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-[#1A2744] hover:ring-blue-200"
          >
            <Eye className="h-3.5 w-3.5" />
            {item.title}
          </button>
        ))}
      </div>
    </div>
  )
}

function ResourceImageModal({ item, onClose }: { item: ResourceLink; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-3xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-900">{item.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-auto rounded-2xl bg-slate-100 p-2">
          <Image
            src={item.image}
            alt={item.title}
            width={1600}
            height={1000}
            className="mx-auto h-auto max-h-none w-auto max-w-full rounded-xl bg-white object-contain shadow-sm"
          />
        </div>
      </div>
    </div>
  )
}

export default function LongTermCareCalc() {
  const [selectedResource, setSelectedResource] = useState<ResourceLink | null>(null)
  const [grade, setGrade] = useState<CareGrade>("3")
  const [service, setService] = useState<CareService>("daycare")
  const [daycareTime, setDaycareTime] = useState<DaycareTime>("3to6")
  const [visitTime, setVisitTime] = useState<VisitCareTime>("240")
  const [burden, setBurden] = useState<CareBurden>("general")
  const [weeklyCount, setWeeklyCount] = useState(3)
  const [weeks, setWeeks] = useState(4)
  const [facilityDays, setFacilityDays] = useState(30)
  const [nonCoveredPerDay, setNonCoveredPerDay] = useState(0)
  const [welfareToolMonthly, setWelfareToolMonthly] = useState(0)
  const [miscMonthly, setMiscMonthly] = useState(0)
  const [monthlyBenefit, setMonthlyBenefit] = useState(0)

  const result = useMemo(() => {
    const facility = isFacilityService(service)
    const useDays = facility ? facilityDays : weeklyCount * weeks
    const burdenRate = facility ? BURDEN_RATES[burden].facility : BURDEN_RATES[burden].home
    const monthlyLimit = CARE_LIMITS[grade]

    let unitCost = 0
    if (service === "daycare") unitCost = DAYCARE_RATES[daycareTime][grade]
    if (service === "visitCare") unitCost = VISIT_CARE_RATES[visitTime]
    if (service in BATH_RATES) unitCost = BATH_RATES[service as keyof typeof BATH_RATES] ?? 0
    if (facility) unitCost = FACILITY_RATES[service][getFacilityGrade(grade)]

    const totalCareCost = unitCost * useDays
    const coveredCost = facility ? totalCareCost : Math.min(totalCareCost, monthlyLimit)
    const overLimitCost = facility ? 0 : Math.max(totalCareCost - monthlyLimit, 0)
    const selfPay = Math.round(coveredCost * burdenRate)
    const publicPay = Math.max(coveredCost - selfPay, 0)
    const nonCoveredTotal = nonCoveredPerDay * useDays
    const unexpectedCost = welfareToolMonthly + miscMonthly
    const customerBeforeBenefit = selfPay + overLimitCost + nonCoveredTotal + unexpectedCost
    const appliedBenefit = Math.min(monthlyBenefit, customerBeforeBenefit)
    const remainingNeed = Math.max(customerBeforeBenefit - appliedBenefit, 0)
    const publicRatio = totalCareCost > 0 ? Math.min(publicPay / Math.max(totalCareCost, 1), 1) * 100 : 0
    const customerRatio = totalCareCost > 0 ? Math.min((selfPay + overLimitCost) / Math.max(totalCareCost, 1), 1) * 100 : 0

    return {
      facility,
      useDays,
      burdenRate,
      monthlyLimit,
      unitCost,
      totalCareCost,
      coveredCost,
      overLimitCost,
      selfPay,
      publicPay,
      nonCoveredTotal,
      unexpectedCost,
      customerBeforeBenefit,
      appliedBenefit,
      remainingNeed,
      publicRatio,
      customerRatio,
      facilityGrade: getFacilityGrade(grade),
    }
  }, [burden, daycareTime, facilityDays, grade, miscMonthly, monthlyBenefit, nonCoveredPerDay, service, visitTime, weeklyCount, welfareToolMonthly, weeks])

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold text-[#C9A96E]">Long-Term Care Calculator</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1A2744] md:text-3xl">
              재가/장기요양 이용 비용 계산
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              등급, 이용 형태, 본인부담 구분, 비급여 비용, 월 보장금액을 넣으면 공단 지원과 실제 준비해야 할 금액을 한 번에 확인합니다.
            </p>
          </div>
          <div className="rounded-2xl bg-[#1A2744]/5 px-4 py-3 text-sm font-bold text-[#1A2744]">
            {result.facility ? "시설급여 기준" : `월 한도 ${formatWon(result.monthlyLimit)}원`}
          </div>
        </div>

        <ResourceQuickLinks items={RESOURCE_LINKS} onSelect={setSelectedResource} />

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <SelectRow label="장기요양 등급" value={grade} options={GRADE_OPTIONS} onChange={setGrade} />
          <SelectRow label="이용 서비스" value={service} options={SERVICE_OPTIONS} onChange={setService} />
          <SelectRow
            label="본인부담 구분"
            value={burden}
            options={BURDEN_OPTIONS}
            onChange={setBurden}
            helper={BURDEN_RATES[burden].label}
          />

          {service === "daycare" && (
            <SelectRow label="주야간보호 이용 시간" value={daycareTime} options={DAYCARE_TIME_OPTIONS} onChange={setDaycareTime} />
          )}
          {service === "visitCare" && (
            <SelectRow label="방문요양 이용 시간" value={visitTime} options={VISIT_TIME_OPTIONS} onChange={setVisitTime} />
          )}

          {!result.facility ? (
            <>
              <NumberRow label="1주 이용 횟수" value={weeklyCount} onChange={setWeeklyCount} suffix="회" />
              <NumberRow label="이용 기간" value={weeks} onChange={setWeeks} suffix="주" helper={`월 이용 횟수 ${formatWon(result.useDays)}회`} />
            </>
          ) : (
            <NumberRow
              label="월 입소 일수"
              value={facilityDays}
              onChange={setFacilityDays}
              suffix="일"
              helper={`${grade === "1" || grade === "2" ? `${grade}등급` : "3~5등급"} 시설 수가 적용`}
            />
          )}

          <NumberRow
            label="비급여/식비 1일당"
            value={nonCoveredPerDay}
            onChange={setNonCoveredPerDay}
            suffix="원/일"
            helper={`${formatWon(nonCoveredPerDay)}원 x ${formatWon(result.useDays)}일 = ${formatWon(result.nonCoveredTotal)}원`}
          />
          <NumberRow
            label="복지용구 월 비용"
            value={welfareToolMonthly}
            onChange={setWelfareToolMonthly}
            suffix="원"
            helper="침대, 휠체어, 욕창예방용품 등 대여·구입 부담액"
          />
          <NumberRow
            label="기타 월 비용"
            value={miscMonthly}
            onChange={setMiscMonthly}
            suffix="원"
            helper="상급침실료, 간식비, 이미용, 진료·약제비, 소모품 등"
          />
          <NumberRow
            label="월 보장금액"
            value={monthlyBenefit}
            onChange={setMonthlyBenefit}
            suffix="원"
            helper="보험에서 준비한 월 기준 보장금액을 입력합니다."
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <ResultCard label="1일/1회 급여비용" value={`${formatWon(result.unitCost)}원`} />
        <ResultCard label="월 총 급여비용" value={`${formatWon(result.totalCareCost)}원`} />
        <ResultCard label="본인부담금" value={`${formatWon(result.customerBeforeBenefit)}원`} tone="gold" />
        <ResultCard label="월 보장 적용 후" value={`${formatWon(result.remainingNeed)}원`} tone="navy" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-[#1A2744]">계산 적용 구조</h3>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
            <div className="rounded-2xl bg-slate-50 p-4">
              <b className="text-slate-950">1. 이용량</b>
              <p>{result.facility ? `월 ${formatWon(result.useDays)}일 입소 기준입니다.` : `1주 ${formatWon(weeklyCount)}회 x ${formatWon(weeks)}주 = 월 ${formatWon(result.useDays)}회 기준입니다.`}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <b className="text-slate-950">2. 급여비용</b>
              <p>
                {getServiceLabel(service)} {formatWon(result.unitCost)}원 x {formatWon(result.useDays)}
                {result.facility ? "일" : "회"} = {formatWon(result.totalCareCost)}원
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <b className="text-slate-950">3. 본인부담 적용</b>
              <p>
                {result.facility
                  ? `시설급여는 월 한도 대신 등급별 1일 수가에 본인부담률 ${Math.round(result.burdenRate * 100)}%를 적용합니다.`
                  : `재가급여는 월 한도 ${formatWon(result.monthlyLimit)}원 안에서 본인부담률 ${Math.round(result.burdenRate * 100)}%를 적용하고, 초과분은 본인 부담으로 계산합니다.`}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <b className="text-slate-950">4. 비급여/식비</b>
              <p>비급여/식비 1일당 {formatWon(nonCoveredPerDay)}원을 더해 월 {formatWon(result.nonCoveredTotal)}원으로 반영합니다.</p>
                       </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-[#1A2744]">월별 비용 요약</h3>
          <div className="mt-4 space-y-3 text-sm">
            <ResultCard label="월 장기요양 총비용" value={`${formatWon(result.totalCareCost)}원`} />
            <ResultCard label="본인부담금 합계" value={`${formatWon(result.customerBeforeBenefit)}원`} tone="gold" />
            <ResultCard label="비급여·식비" value={`${formatWon(result.nonCoveredTotal)}원`} />
          </div>
        </div>
      </div>
      {selectedResource &&
        createPortal(
          <ResourceImageModal item={selectedResource} onClose={() => setSelectedResource(null)} />,
          document.body,
        )}
    </div>
  )
}
