"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, X, ExternalLink, ChevronRight, BookOpen, BarChart3, FileText, Shield, Calculator, Stethoscope, Scale, Pill, ClipboardList, Award } from "lucide-react"

type LibraryItem = {
  id: string
  title: string
  desc: string
  category: string
  categoryColor: string
  location: string
  url: string
  external?: boolean
  icon: "chart" | "file" | "shield" | "calc" | "surgery" | "scale" | "pill" | "list" | "award" | "book"
  keywords: string[]
}

const LIBRARY_ITEMS: LibraryItem[] = [
  // 보장별 통계 자료
  {
    id: "coverage_cancer",
    title: "암 통계 자료",
    desc: "암 발생률, 치료비, 생존율 통계 및 상담 로드맵",
    category: "보장 분석",
    categoryColor: "bg-sky-50 text-sky-700 border-sky-200",
    location: "보장 분석 > 보장별 통계 자료 > 암",
    url: "/insurance-tools/coverage-stats",
    icon: "chart",
    keywords: ["암", "일반암", "폐암", "간암", "위암", "대장암", "유방암", "항암", "방사선", "암치료", "생존율", "암발생"],
  },
  {
    id: "coverage_cardio",
    title: "심혈관 통계 자료",
    desc: "심장질환·뇌혈관 통계, 치료비 데이터 및 보장 안내",
    category: "보장 분석",
    categoryColor: "bg-sky-50 text-sky-700 border-sky-200",
    location: "보장 분석 > 보장별 통계 자료 > 심혈관",
    url: "/insurance-tools/coverage-stats",
    icon: "chart",
    keywords: ["심혈관", "심장", "심근경색", "뇌혈관", "뇌졸중", "뇌출혈", "뇌경색", "허혈성", "급성심정지", "심장질환"],
  },
  {
    id: "coverage_dementia",
    title: "치매 통계 자료",
    desc: "치매 유병률, 요양비 통계 및 노후 의료 보장 안내",
    category: "보장 분석",
    categoryColor: "bg-sky-50 text-sky-700 border-sky-200",
    location: "보장 분석 > 보장별 통계 자료 > 치매",
    url: "/insurance-tools/coverage-stats",
    icon: "chart",
    keywords: ["치매", "알츠하이머", "인지", "요양", "노인요양", "장기요양", "실버"],
  },
  {
    id: "coverage_death",
    title: "사망·CI 통계 자료",
    desc: "사망원인 통계, CI(중대질병) 보장 데이터",
    category: "보장 분석",
    categoryColor: "bg-sky-50 text-sky-700 border-sky-200",
    location: "보장 분석 > 보장별 통계 자료 > 사망/CI",
    url: "/insurance-tools/coverage-stats",
    icon: "chart",
    keywords: ["사망", "CI", "중대질병", "종신", "사망보험금", "사인통계"],
  },
  {
    id: "coverage_retirement",
    title: "노후 의료비 통계",
    desc: "연령별 의료비 지출 통계, 노후 보장 필요성 자료",
    category: "보장 분석",
    categoryColor: "bg-sky-50 text-sky-700 border-sky-200",
    location: "보장 분석 > 보장별 통계 자료 > 노후",
    url: "/insurance-tools/coverage-stats",
    icon: "chart",
    keywords: ["노후", "고령", "노인", "의료비", "생활비", "100세", "장수", "은퇴"],
  },
  {
    id: "coverage_receipt",
    title: "의료비 영수증 해석",
    desc: "진료비 영수증 항목 설명 및 보험 청구 연계 안내",
    category: "보장 분석",
    categoryColor: "bg-sky-50 text-sky-700 border-sky-200",
    location: "보장 분석 > 보장별 통계 자료 > 영수증",
    url: "/insurance-tools/coverage-stats",
    icon: "chart",
    keywords: ["영수증", "진료비", "청구서", "의료비", "입원", "외래", "수술비"],
  },

  // 수술 및 후유장해
  {
    id: "surgery_search",
    title: "수술비 검색",
    desc: "종별 수술비와 약관 조회 — 수술 코드별 지급 기준 확인",
    category: "수술·장해",
    categoryColor: "bg-rose-50 text-rose-700 border-rose-200",
    location: "수술 및 후유장해 > 수술비 검색",
    url: "/insurance-tools/surgery",
    icon: "surgery",
    keywords: ["수술", "수술비", "수술코드", "종별수술", "수술급여", "입원수술", "외래수술", "약관"],
  },
  {
    id: "disability_table",
    title: "장해분류표",
    desc: "상해와 질병의 후유장해 분류 기준 및 지급율 안내",
    category: "수술·장해",
    categoryColor: "bg-rose-50 text-rose-700 border-rose-200",
    location: "수술 및 후유장해 > 장해분류표",
    url: "/insurance-tools/disability",
    icon: "list",
    keywords: ["장해", "후유장해", "장해분류", "장해등급", "지급율", "상해장해", "질병장해", "노동능력"],
  },
  {
    id: "car_accident",
    title: "자동차 사고부상등급표",
    desc: "진단·치료에 따른 자동차 사고 부상 등급과 지급 금액 계산",
    category: "수술·장해",
    categoryColor: "bg-rose-50 text-rose-700 border-rose-200",
    location: "조회 및 서류안내 > 자동차 사고부상등급표",
    url: "/insurance-tools/car-accident",
    icon: "calc",
    keywords: ["자동차", "교통사고", "부상등급", "자부상", "사고등급", "차사고", "부상", "배상"],
  },

  // 조회·서류
  {
    id: "claim_docs",
    title: "보험금 청구 서류",
    desc: "보험사별 청구 서류 목록과 담당 연락처 안내",
    category: "조회·서류",
    categoryColor: "bg-teal-50 text-teal-700 border-teal-200",
    location: "조회 및 서류안내 > 서류 안내",
    url: "/claim-documents",
    icon: "file",
    keywords: ["서류", "청구서류", "진단서", "소견서", "입퇴원", "수술확인서", "보험금청구", "청구방법"],
  },
  {
    id: "underwriting",
    title: "회사별 간편 인수 기준",
    desc: "보험사별 인수 기준 참고 자료 — 유병자·간편심사 가입 가능 여부",
    category: "조회·서류",
    categoryColor: "bg-teal-50 text-teal-700 border-teal-200",
    location: "보장 분석 > 회사별 간편 인수 확인",
    url: "/underwriting/index.html",
    icon: "shield",
    keywords: ["인수", "인수기준", "간편심사", "유병자", "가입가능", "회사별", "심사", "고지"],
  },
  {
    id: "gongsi",
    title: "보험상품 공시",
    desc: "각 보험사 상품 약관 공시 자료 조회",
    category: "조회·서류",
    categoryColor: "bg-teal-50 text-teal-700 border-teal-200",
    location: "조회 및 서류안내 > 보험상품 공시",
    url: "/gongsi.html",
    icon: "file",
    keywords: ["공시", "약관", "상품", "보험상품", "공시실", "상품안내", "사업방법서"],
  },

  // 외부 도구
  {
    id: "kcdcode",
    title: "질병코드 조회",
    desc: "KCD 한국표준질병·사인분류 코드 검색",
    category: "외부 도구",
    categoryColor: "bg-slate-100 text-slate-700 border-slate-200",
    location: "외부 사이트 > 질병코드조회원",
    url: "https://kcdcode.kr/browse/main",
    external: true,
    icon: "book",
    keywords: ["질병코드", "KCD", "상병코드", "진단코드", "사인분류", "코드조회"],
  },
  {
    id: "knia_accident",
    title: "교통사고 과실비율",
    desc: "자동차 사고 유형별 과실비율 인정 기준 조회",
    category: "외부 도구",
    categoryColor: "bg-slate-100 text-slate-700 border-slate-200",
    location: "외부 사이트 > 과실비율인정기준",
    url: "https://accident.knia.or.kr",
    external: true,
    icon: "scale",
    keywords: ["과실비율", "교통사고", "자동차사고", "과실", "손해", "배상"],
  },
  {
    id: "pharmacy",
    title: "약학정보원",
    desc: "복용약 성분·효능·부작용 확인 — 항암제 여부 등 조회",
    category: "외부 도구",
    categoryColor: "bg-slate-100 text-slate-700 border-slate-200",
    location: "외부 사이트 > 약학정보원",
    url: "https://health.kr/",
    external: true,
    icon: "pill",
    keywords: ["약", "약품", "약학", "복용약", "항암제", "약성분", "의약품"],
  },
  {
    id: "hira",
    title: "진료기록 확인",
    desc: "건강e음 앱 활용 — 병원 방문·처방 내역 확인 안내",
    category: "외부 도구",
    categoryColor: "bg-slate-100 text-slate-700 border-slate-200",
    location: "외부 사이트 > 건강보험심사평가원",
    url: "https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000",
    external: true,
    icon: "book",
    keywords: ["진료기록", "병원기록", "건강eeum", "건강e음", "HIRA", "진료내역", "처방내역"],
  },
  {
    id: "hidden_insurance",
    title: "숨은보험금 찾기",
    desc: "모든 보험사 미청구 보험금·휴면보험금 통합 조회",
    category: "외부 도구",
    categoryColor: "bg-slate-100 text-slate-700 border-slate-200",
    location: "외부 사이트 > 금융감독원 숨은보험금",
    url: "https://cont.insure.or.kr/cont_web/intro.do",
    external: true,
    icon: "award",
    keywords: ["숨은보험금", "미청구", "휴면보험금", "보험금조회", "숨은금융재산"],
  },
]

function ItemIcon({ icon }: { icon: LibraryItem["icon"] }) {
  const cls = "h-4 w-4"
  switch (icon) {
    case "chart": return <BarChart3 className={cls} />
    case "file": return <FileText className={cls} />
    case "shield": return <Shield className={cls} />
    case "calc": return <Calculator className={cls} />
    case "surgery": return <Stethoscope className={cls} />
    case "scale": return <Scale className={cls} />
    case "pill": return <Pill className={cls} />
    case "list": return <ClipboardList className={cls} />
    case "award": return <Award className={cls} />
    case "book": return <BookOpen className={cls} />
    default: return <FileText className={cls} />
  }
}

const ALL_CATEGORIES = [
  { id: "보장 분석", emoji: "📊" },
  { id: "수술·장해", emoji: "🏥" },
  { id: "조회·서류", emoji: "📋" },
  { id: "외부 도구", emoji: "🔗" },
]

function normalize(str: string) {
  return str.toLowerCase().replace(/\s+/g, "")
}

function scoreItem(item: LibraryItem, query: string): number {
  const q = normalize(query)
  if (!q) return 1
  const titleN = normalize(item.title)
  const descN = normalize(item.desc)
  const locN = normalize(item.location)
  const kwN = item.keywords.map(normalize)

  if (titleN.includes(q)) return 100
  if (kwN.some((k) => k === q)) return 90
  if (kwN.some((k) => k.includes(q) || q.includes(k))) return 70
  if (descN.includes(q)) return 50
  if (locN.includes(q)) return 30
  return 0
}

interface Props {
  onClose: () => void
  isApproved: boolean
}

export default function LibrarySearchPopup({ onClose, isApproved }: Props) {
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("전체")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const navigate = useCallback((item: LibraryItem) => {
    const isChromeRecommended = item.id === "hidden_insurance"
    if (isChromeRecommended) {
      const fullUrl = item.url
      navigator.clipboard?.writeText(fullUrl).catch(() => {})
      alert("숨은 보험금 찾기 링크를 복사했습니다.\n크롬을 열고 주소창에 붙여넣어 접속해주세요.\n\n" + fullUrl)
      onClose()
      return
    }

    if (item.external) {
      window.open(item.url, "_blank", "noopener,noreferrer")
    } else {
      const fullUrl = item.url.startsWith("/")
        ? `${window.location.origin}${item.url}`
        : item.url
      window.open(fullUrl, "_blank", "noopener,noreferrer")
    }
    onClose()
  }, [onClose])

  const filteredItems = LIBRARY_ITEMS.filter((item) => {
    const matchCat = activeCategory === "전체" || item.category === activeCategory
    if (!matchCat) return false
    if (!query.trim()) return true
    return scoreItem(item, query.trim()) > 0
  }).sort((a, b) => {
    if (!query.trim()) return 0
    return scoreItem(b, query.trim()) - scoreItem(a, query.trim())
  })

  const grouped = ALL_CATEGORIES.reduce<Record<string, LibraryItem[]>>((acc, cat) => {
    const items = filteredItems.filter((i) => i.category === cat.id)
    if (items.length > 0) acc[cat.id] = items
    return acc
  }, {})

  const hasResults = filteredItems.length > 0

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(10,15,30,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-xl bg-[#1a3a6e] flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-black text-slate-900">보험자료실 검색</p>
              <p className="text-[10px] text-slate-400 font-medium">통계·서류·도구 전체 검색</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="암, 수술, 서류, 인수기준... 키워드로 검색"
              className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-xl text-[13px] font-medium text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1a3a6e]/20 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {["전체", ...ALL_CATEGORIES.map(c => c.id)].map((cat) => {
              const emoji = ALL_CATEGORIES.find(c => c.id === cat)?.emoji ?? ""
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    activeCategory === cat
                      ? "bg-[#1a3a6e] text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {emoji && <span className="mr-1">{emoji}</span>}
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {!hasResults ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-[13px] font-bold text-slate-500">
                {query ? `"${query}"에 해당하는 자료를 찾지 못했습니다` : "검색어를 입력하세요"}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                암·심혈관·수술·장해·서류·인수기준 등으로 검색해 보세요
              </p>
            </div>
          ) : query ? (
            // Flat list when searching
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 mb-3">
                검색 결과 {filteredItems.length}건
              </p>
              {filteredItems.map((item) => (
                <ResultCard key={item.id} item={item} onNavigate={navigate} />
              ))}
            </div>
          ) : (
            // Grouped by category when browsing
            Object.entries(grouped).map(([catId, items]) => {
              const catMeta = ALL_CATEGORIES.find(c => c.id === catId)
              return (
                <section key={catId}>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    {catMeta?.emoji} {catId}
                  </p>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <ResultCard key={item.id} item={item} onNavigate={navigate} />
                    ))}
                  </div>
                </section>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-medium">
            {filteredItems.length}개 자료 · ESC로 닫기
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            🔗 외부 사이트는 새 창으로 열립니다
          </p>
        </div>
      </div>
    </div>
  )
}

function ResultCard({ item, onNavigate }: { item: LibraryItem; onNavigate: (item: LibraryItem) => void }) {
  return (
    <button
      onClick={() => onNavigate(item)}
      className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl border border-slate-100 bg-white hover:bg-[#1a3a6e] hover:border-[#1a3a6e] group transition-all duration-200 text-left"
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
        <span className="text-slate-500 group-hover:text-white transition-colors">
          <ItemIcon icon={item.icon} />
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-[13px] font-black text-slate-900 group-hover:text-white transition-colors">
            {item.title}
          </span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${item.categoryColor} group-hover:bg-white/20 group-hover:text-white group-hover:border-white/30 transition-colors`}>
            {item.category}
          </span>
          {item.external && (
            <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-white/60 transition-colors" />
          )}
        </div>
        <p className="text-[11px] text-slate-500 group-hover:text-white/70 font-medium leading-relaxed transition-colors line-clamp-1">
          {item.desc}
        </p>
        <p className="text-[10px] text-slate-400 group-hover:text-white/50 font-medium mt-1 transition-colors">
          📍 {item.location}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-white/60 flex-shrink-0 mt-2 transition-colors" />
    </button>
  )
}
