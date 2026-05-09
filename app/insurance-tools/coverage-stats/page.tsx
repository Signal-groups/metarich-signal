"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, BarChart3, ClipboardList, Eye, FileText, HeartPulse, ImageIcon, Search, ShieldCheck, Stethoscope, X } from "lucide-react"
import { COVERAGE_STAT_CATEGORIES, COVERAGE_STATS, CoverageStatItem } from "../../../lib/insurance/coverage-stats"

type TreatmentTopic = {
  id: string
  title: string
  short: string
  cost: string
  reason: string
  coverages: string[]
  documents: string[]
  note: string
  tone: "blue" | "emerald" | "amber" | "rose"
}

const toneClass = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
}

const treatmentSteps = [
  { title: "병원 방문", body: "증상 확인, 진료 의뢰, 과거 병력과 복용약 확인" },
  { title: "검사·진단", body: "혈액검사, 조직검사, CT/MRI/PET, 종양표지자 검사" },
  { title: "치료계획", body: "수술, 항암약물, 방사선, 표적·면역치료 여부 결정" },
  { title: "실제 치료", body: "입원 또는 통원으로 반복 치료, 부작용 관리, 추적검사" },
  { title: "관리·청구", body: "산정특례 등록, 진료비 서류 발급, 보험금 청구" },
]

const treatmentTopics: TreatmentTopic[] = [
  {
    id: "diagnosis",
    title: "검사·진단",
    short: "진단부터 비용이 시작됩니다.",
    cost: "MRI, CT, PET, 조직검사, 종양표지자 검사 등은 검사 종류와 병원에 따라 비용 차이가 큽니다.",
    reason: "정확한 병기 확인과 치료 방향 결정에 필요하며, 일부 고가 검사는 비급여 또는 선별급여로 본인부담이 커질 수 있습니다.",
    coverages: ["암진단비", "검사비", "통원치료비", "실손의료비"],
    documents: ["진단서", "검사결과지", "진료비 영수증", "진료비 세부내역서"],
    note: "진단 확정 전 검사비도 반복될 수 있어 진단비와 별도로 검사·통원 비용을 같이 설명하면 좋습니다.",
    tone: "blue",
  },
  {
    id: "surgery",
    title: "수술치료",
    short: "수술은 방식에 따라 비용 차이가 큽니다.",
    cost: "일반 수술, 내시경 수술, 로봇수술에 따라 수백만 원에서 수천만 원까지 차이가 날 수 있습니다.",
    reason: "로봇수술, 일부 고난도 수술, 신의료기술은 비급여가 섞일 수 있어 산정특례가 되어도 전액 보장되지 않을 수 있습니다.",
    coverages: ["암수술비", "질병수술비", "N대수술비", "입원일당", "실손의료비"],
    documents: ["수술확인서", "입퇴원확인서", "진료비 영수증", "진료비 세부내역서"],
    note: "수술비는 1회성으로 끝나지 않고 재수술, 합병증, 회복 입원으로 이어질 수 있습니다.",
    tone: "rose",
  },
  {
    id: "radiation",
    title: "방사선치료",
    short: "통원 반복 치료가 많습니다.",
    cost: "정위적 방사선, 세기조절 방사선, 양성자·중입자 치료 등 치료 방식에 따라 비용 차이가 큽니다.",
    reason: "최신 방사선치료는 장비와 기술 비용이 높고, 일부는 비급여 또는 제한 급여라 본인부담이 커질 수 있습니다.",
    coverages: ["방사선치료비", "항암방사선약물치료비", "통원치료비", "실손의료비"],
    documents: ["치료확인서", "진료비 영수증", "진료비 세부내역서", "통원확인서"],
    note: "방사선치료는 입원보다 통원 반복이 많아 통원 중심 보장의 필요성을 설명하기 좋습니다.",
    tone: "amber",
  },
  {
    id: "chemo",
    title: "항암약물치료",
    short: "치료비에서 가장 큰 비중을 차지할 수 있습니다.",
    cost: "일부 표적항암제와 면역항암제는 1회 투약 수십만 원에서 수백만 원, 장기 치료 시 수천만 원까지 커질 수 있습니다.",
    reason: "신약, 표적·면역항암제, 유전자 검사 기반 치료는 약가가 높고 급여 기준이 제한적이라 비급여 부담이 커질 수 있습니다.",
    coverages: ["항암약물치료비", "표적항암치료비", "면역항암치료비", "암진단비"],
    documents: ["항암치료확인서", "처방전", "약제비 영수증", "진료비 세부내역서"],
    note: "암 치료 비중 예시는 수술 6%, 방사선 34%, 항암약물 60%로 설명하면 약물치료 보장의 필요성이 잘 전달됩니다.",
    tone: "emerald",
  },
  {
    id: "special",
    title: "산정특례",
    short: "등록되면 본인부담이 줄어듭니다.",
    cost: "암 산정특례는 보통 등록일 기준 5년 동안 적용되며, 급여 항목 본인부담률이 크게 낮아집니다.",
    reason: "단, 비급여, 선별급여, 일부 신의료기술, 병실 차액, 선택진료 성격의 비용은 산정특례만으로 전부 해결되지 않습니다.",
    coverages: ["암진단비", "항암치료비", "수술비", "실손의료비", "비급여 대비 자금"],
    documents: ["산정특례 등록 신청서", "진단서", "검사결과지", "진료비 세부내역서"],
    note: "상담에서는 '산정특례가 있어도 비급여와 생활비는 남는다'는 구조로 설명하면 이해가 빠릅니다.",
    tone: "blue",
  },
  {
    id: "outpatient",
    title: "입원에서 통원으로",
    short: "치료 패러다임이 바뀌었습니다.",
    cost: "입원 기간은 줄고 통원 반복 치료, 약물치료, 검사 추적 비용이 늘어나는 흐름입니다.",
    reason: "의료기술 발전으로 입원 없이 치료하는 경우가 늘면서 과거 입원일당 중심 보장만으로는 공백이 생길 수 있습니다.",
    coverages: ["통원치료비", "항암치료비", "검사비", "입원일당", "간병비"],
    documents: ["통원확인서", "진료비 영수증", "진료비 세부내역서", "약제비 영수증"],
    note: "입원 보장과 통원 보장을 함께 보여주면 고객이 현재 치료 환경을 훨씬 쉽게 이해합니다.",
    tone: "emerald",
  },
]

export default function CoverageStatsPage() {
  const [category, setCategory] = useState<string>("all")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<CoverageStatItem | null>(null)
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentTopic | null>(null)

  const stats = useMemo(() => {
    const q = query.trim().toLowerCase()
    return COVERAGE_STATS.filter((item) => {
      const matchCategory = category === "all" || item.category === category
      const haystack = `${item.title} ${item.subtitle} ${item.summary} ${item.tags.join(" ")}`.toLowerCase()
      return matchCategory && (!q || haystack.includes(q))
    })
  }, [category, query])

  return (
    <main className="min-h-screen bg-[#eef3fb] text-slate-900">
      <div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8">
        <header className="mb-5 rounded-2xl bg-[#1f5597] text-white shadow-lg">
          <div className="flex flex-col gap-4 px-6 py-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[12px] font-black tracking-[0.2em] text-blue-100">COVERAGE STATISTICS</p>
              <h1 className="mt-2 text-3xl font-black">보장별 통계 자료</h1>
              <p className="mt-3 max-w-4xl text-[14px] font-bold leading-7 text-white/80">
                고객 상담 중 니즈를 환기하기 좋은 통계 이미지와 치료 과정 설명 자료입니다. 이미지를 누르면 미리보기와 상담 멘트를 함께 확인할 수 있습니다.
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

        <TreatmentGuide onSelect={setSelectedTreatment} />

        <section className="mb-5 grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-[1fr_360px]">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory("all")}
              className={`rounded-full px-4 py-2 text-[12px] font-black ${category === "all" ? "bg-[#1f5597] text-white" : "bg-slate-100 text-slate-600"}`}
            >
              전체
            </button>
            {COVERAGE_STAT_CATEGORIES.map((item) => (
              <button
                key={item.id}
                onClick={() => setCategory(item.id)}
                className={`rounded-full px-4 py-2 text-[12px] font-black ${category === item.id ? "bg-[#1f5597] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {item.title}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4">
            <Search className="h-5 w-5 text-[#1f5597]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목, 보장, 상담 키워드 검색"
              className="h-12 flex-1 bg-transparent text-[13px] font-bold outline-none"
            />
          </label>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {stats.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="group grid grid-cols-[112px_1fr] gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <StatThumb item={item} />
              <div className="min-w-0">
                <p className="text-[11px] font-black text-[#1f5597]">{item.tags.join(" / ")}</p>
                <h2 className="mt-2 text-[17px] font-black text-slate-900">{item.title}</h2>
                <p className="mt-2 line-clamp-2 text-[12px] font-bold leading-5 text-slate-500">{item.subtitle}</p>
                <div className="mt-4 flex items-center gap-2 text-[11px] font-black text-[#1f5597]">
                  <Eye className="h-4 w-4" />
                  미리보기
                </div>
              </div>
            </button>
          ))}
        </section>

        {stats.length === 0 && (
          <div className="rounded-2xl bg-white py-20 text-center text-sm font-black text-slate-400">
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      {selected && <PreviewModal item={selected} onClose={() => setSelected(null)} />}
      {selectedTreatment && <TreatmentModal item={selectedTreatment} onClose={() => setSelectedTreatment(null)} />}
    </main>
  )
}

function TreatmentGuide({ onSelect }: { onSelect: (topic: TreatmentTopic) => void }) {
  return (
    <section className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[12px] font-black tracking-[0.18em] text-[#1f5597]">TREATMENT ROADMAP</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">치료 순서와 필요한 보장</h2>
            <p className="mt-2 text-[13px] font-bold leading-6 text-slate-500">
              병원 방문부터 검사, 진단, 치료계획, 실제 치료, 산정특례와 서류 청구까지 한 흐름으로 설명할 수 있게 정리했습니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:w-[420px]">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] font-black text-slate-400">암 치료 비중</p>
              <p className="mt-1 text-lg font-black text-slate-900">수술 6%</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] font-black text-slate-400">방사선</p>
              <p className="mt-1 text-lg font-black text-amber-600">34%</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] font-black text-slate-400">항암약물</p>
              <p className="mt-1 text-lg font-black text-emerald-600">60%</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-2 lg:grid-cols-5">
          {treatmentSteps.map((step, index) => (
            <div key={step.title} className="relative rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-[11px] font-black text-[#1f5597]">0{index + 1}</p>
              <h3 className="mt-1 text-[15px] font-black text-slate-900">{step.title}</h3>
              <p className="mt-2 text-[12px] font-bold leading-5 text-slate-500">{step.body}</p>
              {index < treatmentSteps.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-[#1f5597] lg:block" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-[#1f5597]" />
            <h3 className="text-[16px] font-black">치료 항목별 비용·담보 보기</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {treatmentTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => onSelect(topic)}
                className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${toneClass[topic.tone]}`}
              >
                <p className="text-[15px] font-black">{topic.title}</p>
                <p className="mt-2 text-[12px] font-bold leading-5 opacity-80">{topic.short}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {topic.coverages.slice(0, 3).map((coverage) => (
                    <span key={coverage} className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-black">
                      {coverage}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <ImagePreviewCard title="입원 중심에서 통원 중심으로" image="/coverage-stats/treatment-paradigm-shift.png" />
          <ImagePreviewCard title="암 치료는 한 번의 사건이 아니라 과정" image="/coverage-stats/cancer-treatment-process.png" />
        </div>
      </div>
    </section>
  )
}

function ImagePreviewCard({ title, image }: { title: string; image: string }) {
  return (
    <button className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left" onClick={() => window.open(image, "_blank", "noopener,noreferrer")}>
      <div className="h-40 bg-white">
        <img src={image} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="flex items-center justify-between p-4">
        <p className="text-[13px] font-black text-slate-900">{title}</p>
        <Eye className="h-4 w-4 text-[#1f5597]" />
      </div>
    </button>
  )
}

function StatThumb({ item }: { item: CoverageStatItem }) {
  return (
    <div className="relative h-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-amber-50 to-blue-50">
        <BarChart3 className="h-10 w-10 text-[#1f5597]/40" />
      </div>
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className="absolute inset-0 z-10 h-full w-full object-cover opacity-90" onError={(e) => { e.currentTarget.style.display = "none" }} />
      ) : null}
      <div className="absolute left-2 top-2 z-20 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-[#1f5597]">
        통계
      </div>
    </div>
  )
}

function PreviewModal({ item, onClose }: { item: CoverageStatItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-[11px] font-black tracking-[0.2em] text-[#1f5597]">PREVIEW</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{item.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-900 p-3 text-white hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-amber-50 via-white to-blue-50 p-8 text-center">
              <div>
                <ImageIcon className="mx-auto h-16 w-16 text-[#1f5597]/30" />
                <p className="mt-4 text-lg font-black text-slate-700">{item.title}</p>
                <p className="mt-2 text-sm font-bold text-slate-400">이미지를 넣으면 이 영역에 통계 자료가 표시됩니다.</p>
              </div>
            </div>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} className="relative z-10 min-h-[420px] w-full object-contain" onError={(e) => { e.currentTarget.style.display = "none" }} />
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-[12px] font-black text-slate-400">자료 설명</p>
              <p className="mt-2 text-[15px] font-bold leading-7 text-slate-700">{item.summary}</p>
            </div>
            <div className="rounded-2xl bg-[#1f5597] p-5 text-white">
              <p className="text-[12px] font-black text-blue-100">상담 멘트</p>
              <p className="mt-2 text-[15px] font-bold leading-7">{item.talkPoint}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {item.metrics.map((metric) => (
                <div key={metric.label} className={`rounded-2xl border p-4 ${toneClass[metric.tone || "blue"]}`}>
                  <p className="text-[11px] font-black opacity-70">{metric.label}</p>
                  <p className="mt-1 text-lg font-black">{metric.value}</p>
                </div>
              ))}
            </div>
            <p className="rounded-2xl border border-slate-200 p-4 text-[12px] font-bold leading-6 text-slate-500">
              출처: {item.source}<br />
              실제 상담 자료로 사용할 때는 이미지 하단의 출처와 기준 연도를 함께 표시하는 것을 권장합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function TreatmentModal({ item, onClose }: { item: TreatmentTopic; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-[11px] font-black tracking-[0.2em] text-[#1f5597]">TREATMENT DETAIL</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{item.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-900 p-3 text-white hover:bg-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <InfoBlock icon={<Stethoscope className="h-5 w-5" />} title="비용이 발생하는 방식" body={item.cost} />
          <InfoBlock icon={<ShieldCheck className="h-5 w-5" />} title="비급여가 비싼 이유" body={item.reason} />
          <InfoBlock icon={<ClipboardList className="h-5 w-5" />} title="상담 포인트" body={item.note} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <p className="flex items-center gap-2 text-[14px] font-black text-blue-800">
                <HeartPulse className="h-5 w-5" />
                연결되는 보장 담보
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.coverages.map((coverage) => (
                  <span key={coverage} className="rounded-full bg-white px-3 py-2 text-[12px] font-black text-blue-800">
                    {coverage}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="flex items-center gap-2 text-[14px] font-black text-slate-800">
                <FileText className="h-5 w-5" />
                준비하면 좋은 병원 서류
              </p>
              <ul className="mt-4 space-y-2">
                {item.documents.map((document) => (
                  <li key={document} className="text-[13px] font-bold text-slate-600">· {document}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[12px] font-bold leading-6 text-amber-800">
            실제 보장 여부와 본인부담은 진단명, 병원, 치료방법, 약제 급여 기준, 가입한 약관에 따라 달라집니다. 고객 상담에서는 “산정특례로 급여 부담은 줄지만 비급여·생활비·반복 통원비는 남을 수 있다”는 구조로 설명하면 좋습니다.
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="flex items-center gap-2 text-[14px] font-black text-slate-900">
        <span className="text-[#1f5597]">{icon}</span>
        {title}
      </p>
      <p className="mt-3 text-[14px] font-bold leading-7 text-slate-600">{body}</p>
    </div>
  )
}
