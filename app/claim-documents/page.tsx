"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { Check, ClipboardCopy, FileText, HeartPulse, Search, ShieldPlus, Stethoscope } from "lucide-react"
import {
  BASE_DOCUMENTS,
  COVERAGES,
  INSURERS,
  Insurer,
  InsurerType,
  VisitType,
} from "../../lib/claimDocuments"

type GuideMode = "claim" | "notice" | "monitoring"

const GUIDE_MODES: { id: GuideMode; label: string; desc: string }[] = [
  { id: "claim", label: "보험금 청구", desc: "청구 유형과 담보를 선택해 고객 안내 문구를 완성합니다." },
  { id: "notice", label: "기타안내", desc: "보험사 연락처 또는 팩스 요청 안내 문구를 빠르게 만듭니다." },
  { id: "monitoring", label: "모니터링", desc: "보험사별 모니터링 연락처와 가입내용 확인 문구를 만듭니다." },
]

const VISIT_OPTIONS: { id: VisitType; label: string; desc: string }[] = [
  { id: "hospitalization", label: "입원", desc: "입원 치료, 수술, 간병 사용이 포함된 청구" },
  { id: "outpatient", label: "통원", desc: "외래 진료, 당일 시술, 통원 수술 청구" },
]

const INSURER_FILTERS: { id: "all" | InsurerType; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "life", label: "생명보험" },
  { id: "nonlife", label: "손해보험" },
]

const MONITORING_PRODUCT_TYPES = ["보장성", "저축성", "종신·사망", "건강보험·암보험", "운전자·상해"]
const MONITORING_RENEWAL_TYPES = ["갱신", "비갱신", "일부특약갱신"]
const MONITORING_DELIVERY_TYPES = ["서류", "모바일"]

export default function ClaimDocumentsPage() {
  const [guideMode, setGuideMode] = useState<GuideMode>("claim")
  const [visitType, setVisitType] = useState<VisitType>("hospitalization")
  const [selectedCoverageIds, setSelectedCoverageIds] = useState<string[]>([])
  const [selectedInsurerIds, setSelectedInsurerIds] = useState<string[]>([])
  const [insurerFilter, setInsurerFilter] = useState<"all" | InsurerType>("all")
  const [searchText, setSearchText] = useState("")
  const [noticeText, setNoticeText] = useState("")
  const [faxNumber, setFaxNumber] = useState("")
  const [advisorLabel, setAdvisorLabel] = useState("")
  const [advisorPhone, setAdvisorPhone] = useState("")
  const [advisorFaxNumber, setAdvisorFaxNumber] = useState("")
  const [monitoringProductType, setMonitoringProductType] = useState(MONITORING_PRODUCT_TYPES[0])
  const [monitoringProductDetail, setMonitoringProductDetail] = useState("")
  const [monitoringPayPeriod, setMonitoringPayPeriod] = useState("")
  const [monitoringMaturity, setMonitoringMaturity] = useState("")
  const [monitoringRenewalType, setMonitoringRenewalType] = useState(MONITORING_RENEWAL_TYPES[2])
  const [monitoringPremium, setMonitoringPremium] = useState("")
  const [monitoringPayDay, setMonitoringPayDay] = useState("")
  const [monitoringExemptionDays, setMonitoringExemptionDays] = useState("")
  const [monitoringReductionYears, setMonitoringReductionYears] = useState("")
  const [monitoringReductionRate, setMonitoringReductionRate] = useState("")
  const [monitoringDocumentMethod, setMonitoringDocumentMethod] = useState(MONITORING_DELIVERY_TYPES[1])
  const [monitoringSignMethod, setMonitoringSignMethod] = useState(MONITORING_DELIVERY_TYPES[1])
  const [monitoringExtraText, setMonitoringExtraText] = useState("")
  const [copied, setCopied] = useState(false)

  const selectedCoverages = COVERAGES.filter((coverage) => selectedCoverageIds.includes(coverage.id))
  const selectedInsurers = INSURERS.filter((insurer) => selectedInsurerIds.includes(insurer.id))

  const filteredInsurers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    return INSURERS.filter((insurer) => {
      const filterMatched = insurerFilter === "all" || insurer.type === insurerFilter
      const keywordMatched = !keyword || `${insurer.name} ${insurer.phone} ${insurer.monitoringPhone ?? ""}`.toLowerCase().includes(keyword)
      return filterMatched && keywordMatched
    })
  }, [insurerFilter, searchText])

  const extraDocs = Array.from(new Set(selectedCoverages.flatMap((coverage) => coverage.docs)))
  const notes = selectedCoverages.map((coverage) => coverage.note).filter(Boolean) as string[]

  const previewText = useMemo(() => {
    const commonClosing = [
      "",
      "추가적으로 궁금하신 사항은",
      "언제든 연락주시면 최대한 알아보고",
      "도움드리도록 하겠습니다. 감사합니다!",
    ]

    if (guideMode === "notice") {
      const trimmedNotice = noticeText.trim()
      const trimmedFaxNumber = faxNumber.trim()
      const insurerContactLines = selectedInsurers.map((insurer) => `${insurer.name} ${insurer.phone}`)

      if (trimmedNotice) {
        return [
          "안녕하세요 고객님 안내드립니다.",
          `"${trimmedNotice}" 팩스로 요청 한다고`,
          "상담원에게 말씀해주시면 됩니다.",
          trimmedFaxNumber ? `[${trimmedFaxNumber}]` : "[팩스번호]",
          "",
          ...(insurerContactLines.length > 0 ? ["[보험사 연락처]", ...insurerContactLines] : []),
          "확인 후 연락드리겠습니다!",
          ...commonClosing,
        ].join("\n")
      }

      return [
        "안녕하세요 고객님 보험사 연락처 안내드립니다.",
        ...(insurerContactLines.length > 0 ? insurerContactLines : ["선택된 보험사가 없습니다."]),
        "이쪽으로 연락하셔서 확인하시면 됩니다.",
        ...commonClosing,
      ].join("\n")
    }

    if (guideMode === "monitoring") {
      const selectedProduct = monitoringProductDetail.trim() || `${monitoringProductType} 상품`
      const insurerMonitoringLines = selectedInsurers.length > 0
        ? selectedInsurers.flatMap((insurer) => [
          `${insurer.name}`,
          `보험회사 ${insurer.phone}`,
          `모니터링 ${insurer.monitoringPhone || "확인 필요"}`,
        ])
        : ["선택된 보험사가 없습니다."]
      const extraLines = monitoringExtraText.trim()
        ? ["", "[추가 안내]", monitoringExtraText.trim()]
        : []

      return [
        "안녕하세요 고객님 모니터링 연락처 및 가입내용 안내드립니다.",
        "",
        "[보험사 연락처]",
        ...insurerMonitoringLines,
        "",
        "[가입내용 확인]",
        `1. ${monitoringPayPeriod.trim() || "00년납"} ${monitoringMaturity.trim() || "00만기"} (${monitoringRenewalType || "갱신/비갱신/일부특약갱신"})형 ${selectedProduct}입니다.`,
        `2. 월 보험료는 ${monitoringPremium.trim() || "000,000"}원이며 매월 ${monitoringPayDay.trim() || "00"}일에 결제가 됩니다.`,
        `3. ${monitoringExemptionDays.trim() || "00"}일 면책, ${monitoringReductionYears.trim() || "00"}년 감액 기간이 있으며 감액기간의 경우 ${monitoringReductionRate.trim() || "00"}%가 지급됩니다.`,
        `4. 상품설명서 및 주요내용은 ${monitoringDocumentMethod || "서류/모바일"} 전달 해드리며 같이 확인하였습니다.`,
        `5. 서명은 자필서명으로 ${monitoringSignMethod || "서류/모바일"}청약으로 진행했습니다.`,
        "6. 갱신형 특약의 경우 갱신시 보험료가 오를 수 있습니다.",
        "7. 중도 해지시 납입한 보험료보다 적거나 없을 수 있습니다.",
        ...extraLines,
        ...commonClosing,
      ].join("\n")
    }

    const visitLabel = VISIT_OPTIONS.find((option) => option.id === visitType)?.label || "입원"
    const insurerLines = selectedInsurers.length > 0
      ? selectedInsurers.map((insurer) => `- ${insurer.name}: ${insurer.phone}`)
      : ["- 선택된 보험사가 없습니다. 가입 보험사를 확인해주세요."]
    const coverageLabels = selectedCoverages.length > 0
      ? selectedCoverages.map((coverage) => coverage.label).join(", ")
      : "선택된 담보 없음"
    const baseDocs = BASE_DOCUMENTS[visitType].map((doc) => `- ${doc}`)
    const detailDocs = extraDocs.length > 0
      ? extraDocs.map((doc) => `- ${doc}`)
      : ["- 선택한 담보에 따른 추가 서류가 있으면 보험사 안내에 맞춰 준비해주세요."]
    const noteLines = notes.length > 0 ? notes.map((note) => `- ${note}`) : []
    const advisorLines = [
      advisorLabel.trim() || advisorPhone.trim()
        ? `${advisorLabel.trim() || "보험 전문가"}${advisorPhone.trim() ? ` ${advisorPhone.trim()}` : ""}`
        : "",
      advisorFaxNumber.trim() ? `팩스번호 ${advisorFaxNumber.trim()}` : "",
    ].filter(Boolean)

    return [
      "안녕하세요. 보험금 청구에 필요한 서류 안내드립니다.",
      "",
      `[청구 유형] ${visitLabel}`,
      `[확인 담보] ${coverageLabels}`,
      "",
      "[보험사 고객센터]",
      ...insurerLines,
      "",
      "[기본 공통 서류]",
      ...baseDocs,
      "",
      "[담보별 추가 확인 서류]",
      ...detailDocs,
      "",
      "[꼭 확인해주세요]",
      "- 진단서 대신 진료확인서 또는 진단코드가 기재된 서류로 대체 가능한지 보험사에 확인해주세요.",
      "- 진료비 계산서(영수증)와 진료비 세부내역서는 항상 함께 준비해주세요.",
      "- 생명보험은 지급액이 일정 금액 이상이면 등기 제출을 요구할 수 있어 고객센터에 꼭 확인해주세요.",
      "- 여러 보험사에 청구할 경우 서류 원본 요구 여부를 보험사별로 먼저 확인해주세요.",
      ...noteLines,
      "",
      "이번 보상이 잘 처리되도록 최선을 다하겠습니다.",
      ...(advisorLines.length > 0 ? ["", ...advisorLines] : []),
    ].join("\n")
  }, [
    advisorFaxNumber,
    advisorLabel,
    advisorPhone,
    extraDocs,
    faxNumber,
    guideMode,
    monitoringDocumentMethod,
    monitoringExemptionDays,
    monitoringExtraText,
    monitoringMaturity,
    monitoringPayDay,
    monitoringPayPeriod,
    monitoringPremium,
    monitoringProductDetail,
    monitoringProductType,
    monitoringReductionRate,
    monitoringReductionYears,
    monitoringRenewalType,
    monitoringSignMethod,
    notes,
    noticeText,
    selectedCoverages,
    selectedInsurers,
    visitType,
  ])

  const toggleCoverage = (coverageId: string) => {
    setSelectedCoverageIds((prev) => prev.includes(coverageId)
      ? prev.filter((id) => id !== coverageId)
      : [...prev, coverageId])
  }

  const toggleInsurer = (insurerId: string) => {
    setSelectedInsurerIds((prev) => prev.includes(insurerId)
      ? prev.filter((id) => id !== insurerId)
      : [...prev, insurerId])
  }

  const copyMessage = async () => {
    await navigator.clipboard.writeText(previewText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const resetGuide = () => {
    setGuideMode("claim")
    setVisitType("hospitalization")
    setSelectedCoverageIds([])
    setSelectedInsurerIds([])
    setInsurerFilter("all")
    setSearchText("")
    setNoticeText("")
    setFaxNumber("")
    setAdvisorLabel("")
    setAdvisorPhone("")
    setAdvisorFaxNumber("")
    setMonitoringProductType(MONITORING_PRODUCT_TYPES[0])
    setMonitoringProductDetail("")
    setMonitoringPayPeriod("")
    setMonitoringMaturity("")
    setMonitoringRenewalType(MONITORING_RENEWAL_TYPES[2])
    setMonitoringPremium("")
    setMonitoringPayDay("")
    setMonitoringExemptionDays("")
    setMonitoringReductionYears("")
    setMonitoringReductionRate("")
    setMonitoringDocumentMethod(MONITORING_DELIVERY_TYPES[1])
    setMonitoringSignMethod(MONITORING_DELIVERY_TYPES[1])
    setMonitoringExtraText("")
    setCopied(false)
  }

  return (
    <main className="min-h-screen bg-[#f3f6fb] px-4 py-6 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[12px] font-black tracking-widest text-[#2563eb]">CLAIM DOCUMENT GUIDE</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#1a3a6e] md:text-4xl">보험금 청구 서류 안내</h1>
              <p className="mt-2 text-[14px] font-bold text-slate-500">
                설계사가 상황을 체크하고, 고객에게 바로 보낼 문구를 완성하는 업무용 안내 페이지입니다.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => {
                  if (window.opener) {
                    window.close()
                    return
                  }
                  window.history.back()
                }}
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-black text-slate-600 transition hover:bg-slate-50"
              >
                창 닫기
              </button>
              <button
                onClick={copyMessage}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#1a3a6e] px-5 py-3 text-[14px] font-black text-white shadow-lg transition hover:bg-[#214b89]"
              >
                {copied ? <Check className="h-5 w-5" /> : <ClipboardCopy className="h-5 w-5" />}
                {copied ? "복사 완료" : "고객 전송 문구 복사"}
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Panel
              title="1. 안내 종류 선택"
              icon={<HeartPulse className="h-5 w-5" />}
              action={(
                <button
                  onClick={resetGuide}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-black text-slate-600 transition hover:bg-slate-50"
                >
                  초기화
                </button>
              )}
            >
              <div className="grid gap-3 md:grid-cols-3">
                {GUIDE_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setGuideMode(mode.id)}
                    className={`rounded-2xl border-2 p-5 text-left transition ${
                      guideMode === mode.id
                        ? "border-[#2563eb] bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="text-xl font-black text-[#1a3a6e]">{mode.label}</p>
                    <p className="mt-1 text-[13px] font-bold text-slate-500">{mode.desc}</p>
                  </button>
                ))}
              </div>
            </Panel>

            {guideMode === "claim" ? (
              <>
                <Panel title="2. 청구 유형 선택" icon={<HeartPulse className="h-5 w-5" />}>
                  <div className="grid gap-3 md:grid-cols-2">
                    {VISIT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setVisitType(option.id)}
                        className={`rounded-2xl border-2 p-5 text-left transition ${
                          visitType === option.id
                            ? "border-[#2563eb] bg-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="text-xl font-black text-[#1a3a6e]">{option.label}</p>
                        <p className="mt-1 text-[13px] font-bold text-slate-500">{option.desc}</p>
                      </button>
                    ))}
                  </div>
                </Panel>

                <Panel title="3. 담당자 안내 입력" icon={<FileText className="h-5 w-5" />}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-[13px] font-black text-slate-700">담당자 표기</span>
                      <input
                        value={advisorLabel}
                        onChange={(event) => setAdvisorLabel(event.target.value)}
                        placeholder="예: 000 보험 전문가"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#2563eb]"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-[13px] font-black text-slate-700">연락처</span>
                      <input
                        value={advisorPhone}
                        onChange={(event) => setAdvisorPhone(event.target.value)}
                        placeholder="예: 000-0000-0000"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#2563eb]"
                      />
                    </label>
                    <label className="grid gap-2 md:max-w-sm">
                      <span className="text-[13px] font-black text-slate-700">팩스번호</span>
                      <input
                        value={advisorFaxNumber}
                        onChange={(event) => setAdvisorFaxNumber(event.target.value)}
                        placeholder="예: 000-0000-0000"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#2563eb]"
                      />
                    </label>
                  </div>
                </Panel>

                <Panel title="4. 담보 선택" icon={<Stethoscope className="h-5 w-5" />}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {COVERAGES.map((coverage) => {
                      const active = selectedCoverageIds.includes(coverage.id)
                      return (
                        <button
                          key={coverage.id}
                          onClick={() => toggleCoverage(coverage.id)}
                          className={`min-h-[96px] rounded-2xl border-2 p-4 text-left transition ${
                            active
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[15px] font-black text-slate-900">{coverage.label}</p>
                              <p className="mt-1 text-[12px] font-bold text-slate-500">
                                {coverage.group === "care" ? "치료·입원" : coverage.group === "diagnosis" ? "중대질환" : "특수 청구"}
                              </p>
                            </div>
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${active ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent"}`}>
                              <Check className="h-4 w-4" />
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Panel>
              </>
            ) : guideMode === "notice" ? (
              <Panel title="2. 기타안내 내용 입력" icon={<Stethoscope className="h-5 w-5" />}>
                <div className="grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-[13px] font-black text-slate-700">안내할 요청 내용</span>
                    <textarea
                      value={noticeText}
                      onChange={(event) => setNoticeText(event.target.value)}
                      placeholder="예: 보험금 청구서, 지급내역서, 해지환급금 확인서"
                      className="min-h-[132px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[14px] font-bold leading-6 text-slate-800 outline-none focus:border-[#2563eb]"
                    />
                  </label>
                  <label className="grid gap-2 md:max-w-sm">
                    <span className="text-[13px] font-black text-slate-700">팩스번호</span>
                    <input
                      value={faxNumber}
                      onChange={(event) => setFaxNumber(event.target.value)}
                      placeholder="예: 02-0000-0000"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#2563eb]"
                    />
                  </label>
                </div>
              </Panel>
            ) : (
              <Panel title="2. 모니터링 가입내용 입력" icon={<Stethoscope className="h-5 w-5" />}>
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-[13px] font-black text-slate-700">상품 구분</span>
                      <select
                        value={monitoringProductType}
                        onChange={(event) => setMonitoringProductType(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#2563eb]"
                      >
                        {MONITORING_PRODUCT_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-[13px] font-black text-slate-700">상품 내용 직접 입력</span>
                      <input
                        value={monitoringProductDetail}
                        onChange={(event) => setMonitoringProductDetail(event.target.value)}
                        placeholder="예: 종신·사망, 건강보험·암보험, 운전자·상해"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#2563eb]"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <TextInput label="납입기간" value={monitoringPayPeriod} onChange={setMonitoringPayPeriod} placeholder="예: 20년납" />
                    <TextInput label="만기" value={monitoringMaturity} onChange={setMonitoringMaturity} placeholder="예: 90세만기" />
                    <label className="grid gap-2">
                      <span className="text-[13px] font-black text-slate-700">갱신 유형</span>
                      <select
                        value={monitoringRenewalType}
                        onChange={(event) => setMonitoringRenewalType(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#2563eb]"
                      >
                        {MONITORING_RENEWAL_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <TextInput label="월 보험료" value={monitoringPremium} onChange={setMonitoringPremium} placeholder="예: 120,000" />
                    <TextInput label="결제일" value={monitoringPayDay} onChange={setMonitoringPayDay} placeholder="예: 25" />
                    <TextInput label="면책 기간" value={monitoringExemptionDays} onChange={setMonitoringExemptionDays} placeholder="예: 90" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <TextInput label="감액 기간" value={monitoringReductionYears} onChange={setMonitoringReductionYears} placeholder="예: 1" />
                    <TextInput label="감액 지급률" value={monitoringReductionRate} onChange={setMonitoringReductionRate} placeholder="예: 50" />
                    <div className="grid gap-2">
                      <span className="text-[13px] font-black text-slate-700">전달/청약 방식</span>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={monitoringDocumentMethod}
                          onChange={(event) => setMonitoringDocumentMethod(event.target.value)}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[13px] font-bold outline-none focus:border-[#2563eb]"
                        >
                          {MONITORING_DELIVERY_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <select
                          value={monitoringSignMethod}
                          onChange={(event) => setMonitoringSignMethod(event.target.value)}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[13px] font-bold outline-none focus:border-[#2563eb]"
                        >
                          {MONITORING_DELIVERY_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-[13px] font-black text-slate-700">추가 안내 문구</span>
                    <textarea
                      value={monitoringExtraText}
                      onChange={(event) => setMonitoringExtraText(event.target.value)}
                      placeholder="예: 고객님 상황에 맞춰 추가로 안내할 내용을 입력하세요."
                      className="min-h-[104px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[14px] font-bold leading-6 text-slate-800 outline-none focus:border-[#2563eb]"
                    />
                  </label>
                </div>
              </Panel>
            )}

            <Panel title={guideMode === "claim" ? "5. 보험회사 선택" : guideMode === "notice" ? "3. 보험회사 선택" : "3. 모니터링 보험회사 선택"} icon={<ShieldPlus className="h-5 w-5" />}>
              <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {INSURER_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setInsurerFilter(filter.id)}
                        className={`rounded-full px-4 py-2 text-[13px] font-black transition ${
                          insurerFilter === filter.id
                            ? "bg-[#1a3a6e] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <label className="relative block w-full lg:max-w-sm">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="보험회사명 또는 전화번호 검색"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-[14px] font-bold outline-none focus:border-[#2563eb]"
                    />
                  </label>
                </div>

                {selectedInsurers.length > 0 && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="mb-3 text-[13px] font-black text-[#1a3a6e]">선택된 보험사</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedInsurers.map((insurer) => (
                        <button
                          key={insurer.id}
                          onClick={() => toggleInsurer(insurer.id)}
                          className="rounded-full border border-blue-200 bg-white px-3 py-2 text-[12px] font-black text-[#1a3a6e]"
                        >
                          {guideMode === "monitoring"
                            ? `${insurer.name} · 보험회사 ${insurer.phone} · 모니터링 ${insurer.monitoringPhone || "확인 필요"}`
                            : `${insurer.name} · ${insurer.phone}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredInsurers.map((insurer) => (
                    <InsurerButton
                      key={insurer.id}
                      insurer={insurer}
                      selected={selectedInsurerIds.includes(insurer.id)}
                      onToggle={() => toggleInsurer(insurer.id)}
                      showMonitoring={guideMode === "monitoring"}
                    />
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="최종 고객 안내 문구" icon={<FileText className="h-5 w-5" />}>
              <textarea
                readOnly
                value={previewText}
                className="min-h-[720px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-5 text-[14px] font-bold leading-7 text-slate-800 outline-none"
              />
            </Panel>
          </div>
        </section>
      </div>
    </main>
  )
}

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string
  icon: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">{icon}</span>
          <h2 className="text-lg font-black text-[#1a3a6e]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[13px] font-black text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-bold outline-none focus:border-[#2563eb]"
      />
    </label>
  )
}

function InsurerButton({
  insurer,
  selected,
  onToggle,
  showMonitoring,
}: {
  insurer: Insurer
  selected: boolean
  onToggle: () => void
  showMonitoring?: boolean
}) {
  return (
    <button
      onClick={onToggle}
      className={`rounded-2xl border-2 p-4 text-left transition ${
        selected
          ? "border-[#2563eb] bg-blue-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-black text-slate-900">{insurer.name}</p>
          <p className="mt-1 text-[13px] font-bold text-slate-500">{insurer.phone}</p>
          {showMonitoring && (
            <p className="mt-1 text-[12px] font-black text-[#2563eb]">
              모니터링 {insurer.monitoringPhone || "확인 필요"}
            </p>
          )}
        </div>
        <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${selected ? "border-[#2563eb] bg-[#2563eb] text-white" : "border-slate-300 text-transparent"}`}>
          <Check className="h-4 w-4" />
        </span>
      </div>
    </button>
  )
}
