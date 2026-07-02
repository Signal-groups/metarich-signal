'use client'

import { useState, useMemo, useCallback } from 'react'
import { SURGERY_DB } from '../../../lib/insurance/surgery-db'
import {
  N_SURGERY_BODY_PARTS,
  N_SURGERY_COMPANIES,
  N_SURGERY_COVERAGES,
  N_SURGERY_DISEASE_DETAILS,
  findNSurgeryCoverages,
  getCoverageBodyParts,
  getCoverageDisplayAmount,
  getNSurgeryDiseaseDetailsForItem,
  matchesNSurgeryText,
} from '../../../lib/insurance/n-surgery-db'
import {
  SURGERY_FIELD_QUICK_TERMS,
  SURGERY_FIELD_SEARCH_GUIDES,
  expandSurgeryFieldSearchTerms,
  matchesSurgeryFieldGuide,
} from '../../../lib/insurance/surgery-field-search'
import type { SurgeryItem, SurgeryAmounts } from '../../../lib/insurance/types'
import type { NSurgeryBodyPartKey, NSurgeryCompany, NSurgeryCoverage } from '../../../lib/insurance/n-surgery-db'

// ─────────────────────────────────────────────────────────
// 타입 확장 (상급종합병원 질병수술비 추가)
// ─────────────────────────────────────────────────────────
interface ExtendedSurgeryAmounts extends SurgeryAmounts {
  diseaseHospital: number  // 상급종합병원 질병수술비
}

interface ExtendedSurgeryItem extends SurgeryItem {
  desc?: string
}

// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
const DEFAULT_AMOUNTS: ExtendedSurgeryAmounts = {
  type1: 30, type2: 50, type3: 200, type4: 500, type5: 1000,
  disease: 30, diseaseHospital: 50,
}

const TYPE_COLORS: Record<number, { bg: string; text: string; border: string; badge: string }> = {
  1: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-700' },
  2: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  3: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200',badge: 'bg-yellow-100 text-yellow-700' },
  4: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200',badge: 'bg-orange-100 text-orange-700' },
  5: { bg: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200',  badge: 'bg-pink-100 text-pink-700' },
}
const CANCER_COLOR = { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-700' }

const CATEGORIES = [
  { key: 'all',            label: '전체' },
  { key: 'eye',            label: '👁 눈·안과' },
  { key: 'digestive',      label: '🫁 소화기' },
  { key: 'cardiovascular', label: '❤️ 심장·혈관' },
  { key: 'musculoskeletal',label: '🦴 근골격' },
  { key: 'respiratory',    label: '👂 호흡기·귀코목' },
  { key: 'neurological',   label: '🧠 뇌·신경' },
  { key: 'urogenital',     label: '🫀 비뇨·생식' },
  { key: 'skin_breast',    label: '유방·피부' },
  { key: 'endocrine',      label: '갑상선·내분비' },
  { key: 'ear',            label: '청각기(귀)' },
  { key: 'cancer',         label: '🎗 암 수술' },
]

const CHIOGOL_DATA = [
  { company: 'ING생명',   until: '~2008년 03월 31일' },
  { company: '한화생명',   until: '~2006년 02월 28일' },
  { company: '교보생명',   until: '~2006년 02월 20일' },
  { company: '삼성생명',   until: '~2005년 03월 31일' },
  { company: '신한라이프', until: '~2006년 03월 12일' },
  { company: '동부생명',   until: '~2007년 03월 31일' },
  { company: '알리안츠',   until: '~2006년 03월 31일' },
  { company: '메트라이프', until: '~2008년 03월 31일' },
  { company: '푸르덴셜',   until: '~2008년 03월 31일' },
  { company: '동양생명',   until: '~2006년 03월 31일' },
  { company: '미래에셋',   until: '~2006년 03월 31일' },
  { company: '하나생명',   until: '~2006년 03월 31일' },
]

const SURGERY_REFERENCE_IMAGES = [
  {
    title: '종수술비의 종류와 보장 내용',
    image: '/coverage-stats/surgery-type-compare-2605.png',
    buttonLabel: '종수술비 비교',
  },
  {
    title: '종수술비 VS N대 수술비',
    image: '/coverage-stats/surgery-type-vs-n-surgery-2605.png',
    buttonLabel: '종수술비 · N대 비교',
  },
] as const

const SURGERY_TERM_GLOSSARY = [
  { term: '감압술', desc: '압박된 병변의 압력을 낮추거나 압박 원인을 줄이는 수술입니다.' },
  { term: '거상술', desc: '처지고 늘어진 조직을 끌어 올려 고정하는 수술입니다.' },
  { term: '견인술', desc: '고정 장치 등으로 환부를 견인해 공간을 확보하는 치료입니다. 약관상 수술 해당 여부는 별도 확인이 필요합니다.' },
  { term: '개두술', desc: '두개골을 절개하고 뇌를 노출해 시행하는 수술입니다.' },
  { term: '개복술', desc: '복강 내 장기 수술이나 검사를 위해 배를 절개하는 수술입니다.' },
  { term: '개심술', desc: '흉부를 절개해 심장을 직접 보면서 조작하는 수술입니다.' },
  { term: '개흉술', desc: '폐나 심장 등 흉강 내 장기 치료를 위해 흉벽을 절개하는 수술입니다.' },
  { term: '결찰술', desc: '실이나 끈으로 혈관이나 관을 묶는 수술입니다.' },
  { term: '고정술', desc: '조직이나 뼈 등을 일정 위치에 지지·봉합·고정하는 수술입니다.' },
  { term: '관절경하 수술', desc: '관절경을 관절강 안에 넣어 관찰하면서 시행하는 수술입니다.' },
  { term: '관혈적 수술', desc: '피부나 조직을 절개해 병변을 직접 확인하며 시행하는 수술입니다.' },
  { term: '내시경 수술', desc: '내시경을 이용해 몸 안 병소에 도달해 시행하는 수술입니다.' },
  { term: '냉동술', desc: '액화질소나 이산화탄소 등을 이용해 조직을 얼려 파괴하는 방식입니다.' },
  { term: '단단성형술', desc: '절단 부위 끝을 주변 피부조직 등으로 감싸주는 수술입니다. 약관상 비해당 가능성이 있어 확인이 필요합니다.' },
  { term: '단락술', desc: '뇌척수액 등을 다른 공간으로 배액하도록 우회로를 만드는 수술입니다.' },
  { term: '문합술', desc: '장기와 장기 또는 혈관 등을 서로 접합해 잇는 수술입니다.' },
  { term: '박리술', desc: '피부나 근육, 유착 조직 등을 분리하거나 벗겨내는 수술입니다.' },
  { term: '배농술', desc: '농양 안의 고름을 배출하는 처치입니다. 약관상 수술 비해당 가능성이 있습니다.' },
  { term: '변연절제술', desc: '괴사조직이나 이물질을 제거해 환부를 치료하는 수술입니다.' },
  { term: '복강경수술', desc: '복부에 작은 절개창을 만들고 카메라와 기구를 넣어 시행하는 수술입니다.' },
  { term: '복강경하 수술', desc: '복강경으로 장기를 관찰하면서 일부를 절제하거나 치료하는 수술입니다.' },
  { term: '봉합술', desc: '조직 결손이나 창상면을 꿰매어 치유를 돕는 처치 또는 수술입니다.' },
  { term: '비관혈적 수술', desc: '피부나 근육의 외과적 절개 없이 시행하는 시술입니다. 수술 보장 비해당 가능성이 있습니다.' },
  { term: '삽관술', desc: '인공관을 삽입하는 수술 또는 처치입니다.' },
  { term: '색전술', desc: '혈관을 인위적으로 막아 병변으로 가는 혈류를 차단하는 치료입니다.' },
  { term: '생검술', desc: '조직 일부를 떼어내 검사하는 행위입니다. 검사 목적이면 수술비 비해당 가능성이 있습니다.' },
  { term: '소작술', desc: '열, 전류, 레이저, 냉동, 부식성 물질 등으로 병소를 태우거나 파괴하는 수술입니다.' },
  { term: '소파술', desc: '병소 조직이나 염증 조직을 긁어내는 수술입니다.' },
  { term: '식피술', desc: '떼어낸 피부편을 피부 결손 부위에 이식하는 수술입니다.' },
  { term: '신경 BLOCK', desc: '통증 완화를 위해 약물을 주입해 신경 전달을 차단하는 시술입니다. 신경차단술은 비해당 가능성이 있습니다.' },
  { term: '우회술', desc: '막히거나 병적인 혈관 대신 새로운 통로를 연결하는 수술입니다.' },
  { term: '위루술', desc: '위에 구멍을 내고 관을 연결하는 수술입니다.' },
  { term: '적출술', desc: '장기의 전체나 일부를 떼어내는 수술입니다.' },
  { term: '절개술', desc: '피부, 조직, 기관 등을 째고 시행하는 수술입니다.' },
  { term: '절제술', desc: '병적 상태에 있는 장기나 조직 일부를 잘라 제거하는 수술입니다.' },
  { term: '정복술', desc: '골절되거나 어긋난 뼈를 맞추는 의료 기술입니다.' },
  { term: '제거술', desc: '필요 없거나 병적인 부위를 없애는 수술입니다.' },
  { term: '조루술', desc: '인체 밖으로 배출구를 만들어주는 수술입니다.' },
  { term: '조성술', desc: '인공항문이나 동정맥루처럼 새로운 구조를 만들어주는 수술입니다.' },
  { term: '천공술', desc: '뼈나 조직에 구멍을 내어 내부 조직을 노출하거나 접근하는 수술입니다.' },
  { term: '천자술', desc: '침이나 주사기로 몸 안의 액체를 빼내는 처치입니다. 수술비 비해당 가능성이 있습니다.' },
  { term: '치환술', desc: '병적 이상 부위를 인공물 등으로 교체하는 수술입니다.' },
  { term: '피판술', desc: '피부 결손 부위에 주변 피부와 조직을 끌어 덮어주는 수술입니다.' },
  { term: '흉강경하 수술', desc: '흉부에 내시경을 넣어 폐나 종격을 관찰하며 절제 또는 치료하는 수술입니다.' },
  { term: '흡인술', desc: '병소 부위의 기체나 액체를 빨아들이는 처치입니다. 수술비 비해당 가능성이 있습니다.' },
] as const

// ─────────────────────────────────────────────────────────
// 유틸리티 함수
// ─────────────────────────────────────────────────────────
function fmoney(v: number): string {
  if (v === 0) return '미가입'
  if (v >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억원`
  if (v >= 1000)  return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}천만원`
  return `${v.toLocaleString()}만원`
}

/** productName에서 'N대' 레이블 추출. e.g. '119대 질병수술비' → '119대' */
function getProductNLabel(productName: string): string {
  const match = productName.match(/(\d+)대/)
  return match ? `${match[1]}대` : 'N대'
}

/** groupName에서 짧은 레이블. e.g. '49대질병' → '49대', '5대/22대/62대' → '5대' */
function getGroupShortLabel(groupName: string): string {
  const match = groupName.match(/^(\d+대)/)
  return match ? match[1] : groupName
}

/** 데이터 미등록 회사인지 여부 (note에 '이미지 자료 확인' 포함) */
function isDataMissing(coverages: NSurgeryCoverage[]): boolean {
  return coverages.every(c => c.note?.includes('이미지 자료 확인') || c.note?.includes('원자료 대조'))
}

function calcPayout(item: SurgeryItem, amounts: ExtendedSurgeryAmounts) {
  const amtMap: Record<number, number> = {
    1: amounts.type1, 2: amounts.type2, 3: amounts.type3,
    4: amounts.type4, 5: amounts.type5,
  }
  const surgPay = item.is_cancer
    ? (item.type === 5 ? amounts.type5 : amounts.type3)
    : (amtMap[item.type] ?? 0)
  return {
    surgPay,
    disPay: amounts.disease,
    disHospPay: amounts.diseaseHospital,
    total: surgPay + amounts.disease + amounts.diseaseHospital,
  }
}

function highlight(text: string, q: string): string {
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>')
}

function matchItemByTerm(item: SurgeryItem, term: string): boolean {
  const ql = term.toLowerCase()
  return (
    item.name.toLowerCase().includes(ql) ||
    item.kcd_codes.some(k => k.toLowerCase().includes(ql)) ||
    ((item as ExtendedSurgeryItem).desc?.toLowerCase().includes(ql) || false) ||
    item.synonyms.some(s => s.toLowerCase().includes(ql)) ||
    matchesNSurgeryText(item, term)
  )
}

function matchItem(item: SurgeryItem, q: string): boolean {
  const terms = expandSurgeryFieldSearchTerms(q)
  if (terms.length === 0) return false
  return terms.some(term => matchItemByTerm(item, term))
}

// ─────────────────────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────────────────────
export default function SurgeryPage() {
  const [inputQuery, setInputQuery]   = useState('')   // 입력 중인 검색어
  const [query, setQuery]             = useState('')   // 실제 적용된 검색어 (조회 버튼으로 확정)
  const [category, setCategory]       = useState('all')
  const [typeFilter, setTypeFilter]   = useState<number | 'cancer' | null>(null)
  const [amounts, setAmounts]         = useState<ExtendedSurgeryAmounts>(DEFAULT_AMOUNTS)
  const [showChiogol, setShowChiogol] = useState(false)
  const [showSurgeryTerms, setShowSurgeryTerms] = useState(false)
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<{ title: string; image: string } | null>(null)
  const [acOpen, setAcOpen]           = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<NSurgeryCompany | 'all'>('all')
  // 회사별 그룹별 가입금액 Record<groupName, 만원>
  const [nSurgeryAmountsByGroup, setNSurgeryAmountsByGroup] = useState<Record<string, number>>({})
  const [showCompanyPicker, setShowCompanyPicker] = useState(false)
  const [nSurgeryModalCompany, setNSurgeryModalCompany] = useState<NSurgeryCompany | null>(null)

  // 선택 회사의 그룹 목록
  const selectedCompanyGroups = useMemo(() => {
    if (selectedCompany === 'all') return []
    return N_SURGERY_COVERAGES.filter(c => c.company === selectedCompany)
  }, [selectedCompany])

  // 전체 N대 기본 fallback (그룹 미지정 시)
  const nSurgeryAmount = useMemo(() => {
    const vals = Object.values(nSurgeryAmountsByGroup)
    return vals.length > 0 ? Math.max(...vals) : 100
  }, [nSurgeryAmountsByGroup])

  const handleCompanySelect = useCallback((company: NSurgeryCompany | 'all') => {
    setSelectedCompany(company)
    if (company !== 'all') {
      const groups = N_SURGERY_COVERAGES.filter(c => c.company === company)
      const initial: Record<string, number> = {}
      // baseAmount가 있으면 우선 사용 (DB손해보험 20대=2000만 등 실제 지급 기준)
      // 없으면 이전에 입력한 값 유지, 그것도 없으면 0
      groups.forEach(g => {
        initial[g.groupName] = g.baseAmount ?? nSurgeryAmountsByGroup[g.groupName] ?? 0
      })
      setNSurgeryAmountsByGroup(initial)
    } else {
      setNSurgeryAmountsByGroup({})
    }
  }, [nSurgeryAmountsByGroup])

  // 조회 실행
  const handleSearch = useCallback(() => {
    setQuery(inputQuery)
    setAcOpen(false)
  }, [inputQuery])

  // 자동완성 후보 (inputQuery 기준 — 타이핑 중 실시간)
  const acItems = useMemo(() => {
    if (!inputQuery || inputQuery.length < 1) return []
    return SURGERY_DB.filter(item => matchItem(item, inputQuery)).slice(0, 10)
  }, [inputQuery])

  // 필터링 결과
  const filtered = useMemo(() => {
    return SURGERY_DB.filter(item => {
      const catOk  = category === 'all' || item.category === category
      const typeOk = typeFilter === null
        ? true
        : typeFilter === 'cancer'
          ? item.is_cancer
          : item.type === typeFilter && !item.is_cancer
      const textOk = !query || matchItem(item, query)
      return catOk && typeOk && textOk
    })
  }, [query, category, typeFilter])

  const matchedGuides = useMemo(() => {
    return query ? SURGERY_FIELD_SEARCH_GUIDES.filter(guide => matchesSurgeryFieldGuide(guide, query)) : []
  }, [query])

  const handleAmountChange = useCallback((key: keyof ExtendedSurgeryAmounts, val: string) => {
    setAmounts(prev => ({ ...prev, [key]: Number(val) || 0 }))
  }, [])

  const handleCategoryClick = useCallback((key: string) => {
    setCategory(key)
    setTypeFilter(null)
    setQuery('')
    setInputQuery('')
  }, [])

  const handleTypeClick = useCallback((t: number | 'cancer') => {
    setTypeFilter(prev => prev === t ? null : t)
    setCategory('all')
    setQuery('')
    setInputQuery('')
  }, [])

  const normalItems = filtered.filter(x => !x.is_cancer)
  const cancerItems = filtered.filter(x => x.is_cancer)

  const modalCoverages = useMemo(() => {
    if (!nSurgeryModalCompany) return []
    return N_SURGERY_COVERAGES.filter(c => c.company === nSurgeryModalCompany)
  }, [nSurgeryModalCompany])

  const modalDiseaseDetails = useMemo(() => {
    if (!nSurgeryModalCompany) return []
    return N_SURGERY_DISEASE_DETAILS.filter(d => d.company === nSurgeryModalCompany)
  }, [nSurgeryModalCompany])

  return (
    <div className="surgery-tool-page min-h-screen bg-[#eef3ff]">

      {/* ── 헤더 ── */}
      <div className="px-4 pt-6 pb-4 lg:px-8">
        <div className="max-w-[1500px] mx-auto rounded-3xl bg-white p-5 lg:p-6 shadow-sm border-l-[6px] border-[#2563eb] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#1a3a6e] tracking-tight flex items-center gap-2">
              <span className="bg-blue-50 text-blue-600 p-2 rounded-2xl text-xl">🏥</span>
              수술비 검색
            </h1>
            <p className="text-xs text-[#94a3b8] font-bold mt-1 tracking-wider">
              종수술비 · N대수술비 · 질병수술비를 한 화면에서 확인
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSurgeryTerms(true)}
              className="text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-xl transition-all active:scale-95"
            >
              📖 수술명 용어 정리
            </button>
            {SURGERY_REFERENCE_IMAGES.map((item) => (
              <button
                key={item.image}
                onClick={() => setSelectedReferenceImage(item)}
                className="text-xs font-black bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl transition-all active:scale-95"
              >
                {item.buttonLabel}
              </button>
            ))}
            <button
              onClick={() => setShowChiogol(true)}
              className="text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl transition-all active:scale-95"
            >
              🦷 치조골이식 지급시기
            </button>
            <button
              onClick={() => window.close()}
              className="text-xs font-black bg-[#1a3a6e] hover:bg-[#2563eb] text-white px-4 py-2.5 rounded-xl transition-all active:scale-95"
            >
              창 닫기
            </button>
          </div>
        </div>
      </div>

      {/* ── 메인 2컬럼 ── */}
      <div className="max-w-[1500px] mx-auto px-4 pb-10 lg:px-8 grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-6 items-start">

        {/* ━━━━━━ 왼쪽 사이드바: 설정 ━━━━━━ */}
        <div className="xl:sticky xl:top-6 flex flex-col gap-4">

          {/* 종수술비 설정 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">종수술비 설정</p>
            <div className="space-y-2.5">
              {([1,2,3,4,5] as const).map(t => {
                const col = TYPE_COLORS[t]
                const key = `type${t}` as keyof ExtendedSurgeryAmounts
                return (
                  <div key={t} className="flex items-center gap-2">
                    <label className={`text-[11px] font-black w-10 shrink-0 ${col.text}`}>{t}종</label>
                    <div className={`flex items-center border-2 rounded-xl overflow-hidden flex-1 bg-slate-50/50 focus-within:bg-white focus-within:${col.border} transition-all`}>
                      <input
                        type="number" min={0}
                        value={amounts[key] as number}
                        onChange={e => handleAmountChange(key, e.target.value)}
                        className="flex-1 text-right px-2 py-2 text-sm font-black bg-transparent outline-none min-w-0"
                      />
                      <span className="pr-2.5 text-[10px] text-slate-400 font-bold">만원</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 space-y-2.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">질병수술비</p>
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-black text-slate-500 w-10 shrink-0">일반</label>
                <div className="flex items-center border-2 border-slate-100 rounded-xl overflow-hidden flex-1 bg-slate-50/50 focus-within:bg-white focus-within:border-slate-300 transition-all">
                  <input
                    type="number" min={0}
                    value={amounts.disease}
                    onChange={e => handleAmountChange('disease', e.target.value)}
                    className="flex-1 text-right px-2 py-2 text-sm font-black bg-transparent outline-none min-w-0"
                  />
                  <span className="pr-2.5 text-[10px] text-slate-400 font-bold">만원</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-black text-slate-500 w-10 shrink-0">상급</label>
                <div className="flex items-center border-2 border-slate-100 rounded-xl overflow-hidden flex-1 bg-slate-50/50 focus-within:bg-white focus-within:border-slate-300 transition-all">
                  <input
                    type="number" min={0}
                    value={amounts.diseaseHospital}
                    onChange={e => handleAmountChange('diseaseHospital', e.target.value)}
                    className="flex-1 text-right px-2 py-2 text-sm font-black bg-transparent outline-none min-w-0"
                  />
                  <span className="pr-2.5 text-[10px] text-slate-400 font-bold">만원</span>
                </div>
              </div>
            </div>
          </div>

          {/* N대 수술비 설정 */}
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">N대 수술비 설정</p>

            {/* 보험사 선택 */}
            <div className="mb-3">
              <p className="text-[10px] font-black text-slate-400 mb-1.5">보험사 선택</p>
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedCompany}
                  onChange={e => handleCompanySelect(e.target.value as NSurgeryCompany | 'all')}
                  className="flex-1 border-2 border-slate-100 rounded-xl px-2 py-2 text-[12px] font-black text-slate-700 bg-slate-50 outline-none focus:border-emerald-300 transition-all"
                >
                  <option value="all">전체 회사</option>
                  {N_SURGERY_COMPANIES.map(c => {
                    const cov = N_SURGERY_COVERAGES.filter(x => x.company === c)
                    const nLabel = cov.length > 0 ? getProductNLabel(cov[0].productName) : ''
                    return (
                      <option key={c} value={c}>{c}{nLabel ? ` (${nLabel})` : ''}</option>
                    )
                  })}
                </select>
                {selectedCompany !== 'all' && (
                  <button
                    onClick={() => handleCompanySelect('all')}
                    className="text-[10px] font-black text-slate-400 hover:text-slate-600 px-2 py-2 rounded-lg hover:bg-slate-100 transition-all"
                  >✕</button>
                )}
              </div>
            </div>

            {/* 데이터 미등록 회사 안내 */}
            {selectedCompany !== 'all' && isDataMissing(selectedCompanyGroups) && (
              <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <p className="text-[11px] font-black text-amber-700 mb-1">⚠️ 세부 데이터 미등록</p>
                <p className="text-[10px] text-amber-600 leading-relaxed font-medium">
                  이 회사의 약관 이미지나 PDF를 전달해 주시면 정확한 그룹·코드 데이터를 바로 입력해 드립니다.
                </p>
                <p className="text-[10px] text-amber-500 mt-1.5 font-bold">
                  현재는 키워드 매칭으로만 표시됩니다.
                </p>
              </div>
            )}

            {/* 대수별 가입금액 — 회사 선택 시 그룹별 표시 */}
            {selectedCompany !== 'all' && selectedCompanyGroups.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-black text-slate-400 mb-2">대수별 가입금액</p>
                <div className="space-y-2">
                  {selectedCompanyGroups.map(g => {
                    const shortLabel = getGroupShortLabel(g.groupName)
                    const val = nSurgeryAmountsByGroup[g.groupName] ?? 100
                    return (
                      <div key={g.groupName} className="flex items-center gap-2">
                        <label className="text-[11px] font-black text-emerald-700 shrink-0 w-14 truncate" title={g.groupName}>
                          {shortLabel}
                        </label>
                        <div className="flex items-center border-2 border-emerald-100 rounded-xl overflow-hidden flex-1 bg-emerald-50/40 focus-within:bg-white focus-within:border-emerald-300 transition-all">
                          <input
                            type="number" min={0}
                            value={val}
                            onChange={e => setNSurgeryAmountsByGroup(prev => ({
                              ...prev,
                              [g.groupName]: Number(e.target.value) || 0,
                            }))}
                            className="flex-1 text-right px-2 py-1.5 text-sm font-black bg-transparent outline-none min-w-0"
                          />
                          <span className="pr-2 text-[10px] text-emerald-600 font-bold">만</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 전체 모드: 기본 가입금액 */}
            {selectedCompany === 'all' && (
              <div className="mb-3 flex items-center gap-2">
                <label className="text-[11px] font-black text-slate-500 shrink-0">기본금액</label>
                <div className="flex items-center border-2 border-emerald-100 rounded-xl overflow-hidden flex-1 bg-emerald-50/40 focus-within:bg-white focus-within:border-emerald-300 transition-all">
                  <input
                    type="number" min={0}
                    defaultValue={100}
                    onChange={e => setNSurgeryAmountsByGroup({ __default__: Number(e.target.value) || 0 })}
                    className="flex-1 text-right px-2 py-2 text-sm font-black bg-transparent outline-none min-w-0"
                  />
                  <span className="pr-2.5 text-[10px] text-emerald-600 font-bold">만원</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowCompanyPicker(true)}
              className="w-full text-[11px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-xl py-2.5 transition-all active:scale-[0.98]"
            >
              📋 회사별 N대 목록 보기 →
            </button>
          </div>

          {/* 전체 초기화 */}
          <button
            onClick={() => {
              setAmounts(DEFAULT_AMOUNTS)
              setQuery('')
              setInputQuery('')
              setCategory('all')
              setTypeFilter(null)
              setSelectedCompany('all')
              setNSurgeryAmountsByGroup({})
            }}
            className="text-[11px] font-black text-slate-400 hover:text-slate-700 border border-slate-100 hover:border-slate-300 rounded-xl py-2.5 transition-all"
          >
            전체 초기화
          </button>
        </div>

        {/* ━━━━━━ 오른쪽: 검색 + 필터 + 결과 ━━━━━━ */}
        <div>

          {/* 검색창 */}
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-white mb-3">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[11px] font-black text-slate-400">예:</span>
              {SURGERY_FIELD_QUICK_TERMS.map(hint => (
                <button
                  key={hint}
                  onClick={() => { setInputQuery(hint); setQuery(hint); setAcOpen(true) }}
                  className="text-[11px] font-bold text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2 py-0.5 rounded-lg transition-all"
                >
                  {hint}
                </button>
              ))}
            </div>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <input
                  value={inputQuery}
                  onChange={e => { setInputQuery(e.target.value); setQuery(e.target.value); setAcOpen(true) }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { handleSearch() }
                    if (e.key === 'Escape') setAcOpen(false)
                  }}
                  onFocus={() => setAcOpen(true)}
                  placeholder="수술명 · 신체부위 · 질병코드(KCD) 검색..."
                  className="w-full border-2 border-slate-100 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-[15px] outline-none bg-slate-50/50 focus:bg-white transition-all"
                />
                {/* 자동완성 */}
                {acOpen && acItems.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-400 rounded-2xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                    <div className="px-4 py-2 bg-blue-50 text-[10px] font-black text-blue-600 uppercase tracking-wider border-b border-blue-100">
                      실시간 추천
                    </div>
                    {acItems.map(item => {
                      const col = item.is_cancer ? CANCER_COLOR : TYPE_COLORS[item.type]
                      const { total } = calcPayout(item, amounts)
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setInputQuery(item.name)
                            setQuery(item.name)
                            setAcOpen(false)
                            setTypeFilter(null)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-left transition-colors"
                        >
                          <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-black shrink-0 ${col.badge}`}>
                            <span className="text-sm leading-none">{item.is_cancer ? '암' : item.type}</span>
                            <span className="text-[9px]">종</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="font-bold text-slate-800 text-[14px] truncate"
                              dangerouslySetInnerHTML={{ __html: highlight(item.name, inputQuery) }}
                            />
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                                {item.kcd_codes[0] || 'N/A'}
                              </span>
                              {total > 0 && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                  예상 {fmoney(total)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-slate-300">→</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 조회 버튼 */}
              <button
                onClick={handleSearch}
                className="px-6 py-3.5 rounded-2xl bg-[#1a3a6e] hover:bg-[#2D4A8A] text-white text-sm font-black transition-all active:scale-95 shrink-0 flex items-center gap-1.5"
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                조회
              </button>

              {/* 초기화 */}
              {(query || inputQuery) && (
                <button
                  onClick={() => { setQuery(''); setInputQuery(''); setAcOpen(false) }}
                  className="px-4 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-all active:scale-95 shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {matchedGuides.length > 0 && (
            <div className="mb-4 space-y-3">
              {matchedGuides.map(guide => (
                <div key={guide.title} className="rounded-2xl border-2 border-amber-100 bg-amber-50/70 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[13px] font-black text-amber-800">현장 검색 안내 · {guide.title}</p>
                      <p className="mt-1 text-[12px] font-bold leading-relaxed text-amber-700">{guide.note}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 lg:justify-end">
                      {guide.searchTerms.map(term => (
                        <button
                          key={term}
                          onClick={() => { setInputQuery(term); setQuery(term); setAcOpen(false) }}
                          className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-amber-700 hover:bg-amber-100"
                        >
                          {term} 조회
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {guide.docs.map(doc => (
                      <span key={doc} className="rounded-lg border border-amber-100 bg-white px-2 py-1 text-[10px] font-bold text-amber-700">{doc}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 필터 탭 */}
          <div className="flex flex-col gap-1.5 mb-4 px-1">

            {/* 1줄: 수술 부위 카테고리 */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => handleCategoryClick(c.key)}
                  className={`px-3 py-1.5 rounded-xl text-[12px] font-bold border-2 transition-all active:scale-95
                    ${category === c.key
                      ? c.key === 'cancer'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-blue-600 text-white border-blue-600'
                      : c.key === 'cancer'
                        ? 'border-red-100 text-red-500 hover:bg-red-50'
                        : 'border-slate-100 text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* 2줄: 종 구분 (1종~5종 + 암수술) */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {([1,2,3,4,5] as const).map(t => {
                const col = TYPE_COLORS[t]
                const isOn = typeFilter === t
                return (
                  <button
                    key={t}
                    onClick={() => handleTypeClick(t)}
                    className={`px-3.5 py-1.5 rounded-xl text-[12px] font-black border-2 transition-all active:scale-95
                      ${isOn ? `${col.bg} ${col.border} ${col.text}` : 'border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {t}종
                  </button>
                )
              })}
              <button
                onClick={() => handleTypeClick('cancer')}
                className={`px-3.5 py-1.5 rounded-xl text-[12px] font-black border-2 transition-all active:scale-95
                  ${typeFilter === 'cancer' ? 'bg-red-50 border-red-400 text-red-600' : 'border-slate-100 text-slate-600 hover:bg-red-50 hover:border-red-100 hover:text-red-500'}`}
              >
                🎗 암수술
              </button>
              {typeFilter !== null && (
                <button
                  onClick={() => setTypeFilter(null)}
                  className="text-[10px] font-black text-slate-400 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-all ml-1"
                >✕ 해제</button>
              )}
            </div>
          </div>

          {/* 결과 헤더 */}
          <div className="flex items-center justify-between px-1 mb-3">
            <h3 className="text-sm font-black text-slate-700">
              {typeFilter !== null
                ? <><span className="text-blue-600">{typeFilter === 'cancer' ? '암수술' : `${typeFilter}종`}</span> 검색 결과</>
                : query
                  ? <>&ldquo;<span className="text-blue-600">{query}</span>&rdquo; 관련 수술</>
                  : '전체 수술 리스트'
              }
              <span className="ml-2 font-medium text-slate-400 text-xs">{filtered.length}건</span>
            </h3>
            {selectedCompany !== 'all' && (
              <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                {selectedCompany} 기준
              </span>
            )}
          </div>

          {/* 결과 목록 */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl py-16 text-center border-2 border-dashed border-slate-200">
              <div className="text-4xl mb-3 opacity-20">🔎</div>
              <p className="text-slate-500 font-bold text-sm">검색 결과가 없습니다</p>
              <p className="text-slate-400 text-xs mt-1">질병명 또는 카테고리를 다시 확인해 보세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {normalItems.map(item => (
                <SurgeryCard
                  key={item.id}
                  item={item}
                  amounts={amounts}
                  query={query}
                  selectedCompany={selectedCompany}
                  nSurgeryAmount={nSurgeryAmount}
                  nSurgeryAmountsByGroup={nSurgeryAmountsByGroup}
                />
              ))}

              {cancerItems.length > 0 && normalItems.length > 0 && (
                <div className="relative py-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t-2 border-red-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-[#eef3ff] text-[11px] font-black text-red-600 flex items-center gap-2 border border-red-200 rounded-full py-1.5 shadow-sm">
                      🎗 암 수술 (암 특약 별도 확인 권장)
                    </span>
                  </div>
                </div>
              )}

              {cancerItems.map(item => (
                <SurgeryCard
                  key={item.id}
                  item={item}
                  amounts={amounts}
                  query={query}
                  selectedCompany={selectedCompany}
                  nSurgeryAmount={nSurgeryAmount}
                  nSurgeryAmountsByGroup={nSurgeryAmountsByGroup}
                />
              ))}

              {/* 면책 고지 */}
              <div className="bg-amber-50/50 border-l-4 border-amber-400 p-5 rounded-r-2xl mt-4">
                <div className="flex gap-3">
                  <span className="text-amber-500 text-base">⚠️</span>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    본 정보는 보험 약관의 일반적인 해석을 돕기 위한 참고 자료이며, 보험금 지급 여부는 가입하신 상품의 <strong>증권 및 특별약관</strong>에 따라 결정됩니다. 수술 시기, 보험사별 상이한 기준에 따라 차이가 발생할 수 있으니 반드시 담당 설계사나 고객센터를 통해 확정 받으시기 바랍니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ━━━━━━ 치조골이식 팝업 ━━━━━━ */}
      {showChiogol && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">🦷 치조골이식 보험금</h2>
                  <p className="text-blue-200 text-xs mt-1 font-medium">생명보험 1~3종 수술비 지급 가능 시기</p>
                </div>
                <button onClick={() => setShowChiogol(false)} className="bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors">✕</button>
              </div>
            </div>
            <div className="p-6">
              <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left py-3 px-4 text-slate-500 font-bold">생명보험사</th>
                      <th className="text-right py-3 px-4 text-slate-500 font-bold">보험시기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CHIOGOL_DATA.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-black text-slate-700">{row.company}</td>
                        <td className="py-3 px-4 text-right text-blue-600 font-mono font-bold">{row.until}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl">
                <p className="text-[11px] text-slate-500 text-center leading-relaxed font-medium">
                  위 날짜 <strong>이전 가입자</strong>만 수술비(2종 등) 청구 가능합니다.
                </p>
              </div>
              <button
                onClick={() => setShowChiogol(false)}
                className="w-full mt-4 py-3.5 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-900 transition-colors active:scale-[0.98]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━ 수술비 비교 이미지 팝업 ━━━━━━ */}
      {selectedReferenceImage && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          onClick={() => setSelectedReferenceImage(null)}
        >
          <div
            className="w-full max-w-[1500px] max-h-[92vh] overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 bg-[#1a3a6e] px-5 py-4 text-white">
              <div>
                <p className="text-[11px] font-black tracking-[0.16em] text-blue-100">SURGERY REFERENCE</p>
                <h2 className="mt-1 text-lg font-black">{selectedReferenceImage.title}</h2>
              </div>
              <button
                onClick={() => setSelectedReferenceImage(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-lg font-black transition hover:bg-white/20"
                aria-label="팝업 닫기"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[calc(92vh-76px)] overflow-auto bg-slate-100 p-3 md:p-5">
              <img
                src={selectedReferenceImage.image}
                alt={selectedReferenceImage.title}
                className="mx-auto h-auto w-full rounded-2xl bg-white object-contain shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━ 수술명 용어 정리 팝업 ━━━━━━ */}
      {showSurgeryTerms && (
        <div
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[120] flex items-center justify-center p-4"
          onClick={() => setShowSurgeryTerms(false)}
        >
          <div
            className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-[2rem] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-700 to-teal-800 px-5 py-4 text-white">
              <div>
                <p className="text-[11px] font-black tracking-[0.16em] text-emerald-100">SURGERY TERM GUIDE</p>
                <h2 className="mt-1 text-lg font-black">수술명 용어 정리 ({SURGERY_TERM_GLOSSARY.length}건)</h2>
              </div>
              <button
                onClick={() => setShowSurgeryTerms(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-lg font-black transition hover:bg-white/20"
                aria-label="수술명 용어 정리 닫기"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[calc(88vh-78px)] overflow-auto p-4 md:p-6">
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] font-bold leading-6 text-amber-900">
                아래 용어는 상담자가 수술확인서와 약관을 해석할 때 참고하는 설명입니다. 실제 수술비 지급 여부는 보험사 약관, 수술 목적, 검사/치료 목적, 진료기록에 따라 달라질 수 있습니다.
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="w-[180px] px-4 py-3 font-black">용어</th>
                      <th className="px-4 py-3 font-black">설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SURGERY_TERM_GLOSSARY.map((item) => (
                      <tr key={item.term} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-3 font-black text-[#1a3a6e]">{item.term}</td>
                        <td className="px-4 py-3 font-bold leading-6 text-slate-600">{item.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━ 회사 선택 팝업 ━━━━━━ */}
      {showCompanyPicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[105] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[86vh] overflow-hidden">
            <div className="bg-[#1a3a6e] text-white px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">N대 수술비 회사 선택</h2>
                  <p className="text-blue-100 text-xs mt-1 font-bold">
                    회사를 선택하면 해당 회사 기준 N대 수술비를 결과에 표시합니다
                  </p>
                </div>
                <button
                  onClick={() => setShowCompanyPicker(false)}
                  className="bg-white/10 hover:bg-white/20 rounded-full w-9 h-9 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(86vh-92px)]">
              <button
                onClick={() => { setSelectedCompany('all'); setShowCompanyPicker(false) }}
                className={`w-full rounded-2xl border-2 p-4 text-left transition-all mb-3 ${
                  selectedCompany === 'all'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-100 bg-slate-50 hover:border-emerald-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-900">전체 회사 (모두 보기)</p>
                    <p className="text-[11px] font-bold text-slate-500 mt-1">검색 결과에서 모든 회사의 N대 담보를 비교합니다</p>
                  </div>
                  <span className="text-[11px] font-black text-emerald-700 bg-white border border-emerald-100 px-2.5 py-1 rounded-full">
                    {N_SURGERY_COVERAGES.length}개 그룹
                  </span>
                </div>
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {N_SURGERY_COMPANIES.map(company => {
                  const count = N_SURGERY_COVERAGES.filter(c => c.company === company).length
                  const isSelected = selectedCompany === company
                  return (
                    <div
                      key={company}
                      className={`rounded-2xl border-2 p-4 transition-all ${
                        isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-emerald-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">{company}</p>
                          <p className="text-[11px] font-bold text-slate-500 mt-0.5">{count}개 담보 그룹</p>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full shrink-0">N대</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { setSelectedCompany(company); setShowCompanyPicker(false) }}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-black text-white hover:bg-emerald-700 transition-colors"
                        >
                          선택
                        </button>
                        <button
                          onClick={() => { setSelectedCompany(company); setShowCompanyPicker(false); setNSurgeryModalCompany(company) }}
                          className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          상세보기
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━ 회사별 N대 상세 팝업 ━━━━━━ */}
      {nSurgeryModalCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[86vh] overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">{nSurgeryModalCompany} N대 수술비 상세</h2>
                  <p className="text-emerald-100 text-xs mt-1 font-bold">담보 그룹 · 질병명 · 코드 전체 확인</p>
                </div>
                <button
                  onClick={() => setNSurgeryModalCompany(null)}
                  className="bg-white/10 hover:bg-white/20 rounded-full w-9 h-9 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(86vh-92px)]">
              {/* 질병 코드 상세 (N_SURGERY_DISEASE_DETAILS) */}
              {modalDiseaseDetails.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">질병코드 상세 목록</p>
                  <div className="space-y-2">
                    {Array.from(new Set(modalDiseaseDetails.map(d => d.groupName))).map(groupName => {
                      const groupItems = modalDiseaseDetails.filter(d => d.groupName === groupName)
                      return (
                        <div key={groupName} className="rounded-2xl border border-emerald-100 bg-emerald-50/30 overflow-hidden">
                          <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                            <span className="text-[11px] font-black text-emerald-700">{groupName}</span>
                            <span className="text-[10px] font-bold text-emerald-500 bg-white border border-emerald-100 px-2 py-0.5 rounded-full">{groupItems.length}개 코드</span>
                          </div>
                          <div className="divide-y divide-emerald-50">
                            {groupItems.map((detail, i) => (
                              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                                <span className="font-mono text-[12px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg shrink-0">{detail.code}</span>
                                <span className="text-[12px] font-bold text-slate-700 flex-1">{detail.disease}</span>
                                {detail.aliases && detail.aliases.length > 0 && (
                                  <span className="text-[10px] font-bold text-slate-400">{detail.aliases.slice(0,2).join(', ')}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 담보 그룹 목록 */}
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">담보 그룹 목록</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modalCoverages.map((coverage, index) => {
                  const amount = getCoverageDisplayAmount(coverage, nSurgeryAmount)
                  const bodyLabels = getCoverageBodyParts(coverage)
                    .map(key => N_SURGERY_BODY_PARTS.find(p => p.key === key)?.label)
                    .filter(Boolean)
                  return (
                    <div key={`${coverage.company}-${coverage.groupName}-${index}`} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-[12px] font-black text-emerald-800">{coverage.groupName}</p>
                          <p className="text-[11px] font-bold text-slate-600 mt-0.5">{coverage.productName}</p>
                        </div>
                        <span className="text-[12px] font-black text-white bg-emerald-600 px-2.5 py-1 rounded-lg shrink-0">{fmoney(amount)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(coverage.diseaseCodes ?? []).map(code => (
                          <span key={code} className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">{code}</span>
                        ))}
                        {bodyLabels.map(label => (
                          <span key={label} className="text-[10px] font-bold text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-lg">{label}</span>
                        ))}
                      </div>
                      {coverage.note && (
                        <p className="text-[10px] text-slate-400 font-bold mt-2 leading-relaxed">{coverage.note}</p>
                      )}
                    </div>
                  )
                })}
              </div>
              {modalCoverages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-500">
                  표시할 N대 수술비 항목이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 수술 결과 카드 컴포넌트
// ─────────────────────────────────────────────────────────
function SurgeryCard({
  item, amounts, query, selectedCompany, nSurgeryAmount, nSurgeryAmountsByGroup
}: {
  item: SurgeryItem
  amounts: ExtendedSurgeryAmounts
  query: string
  selectedCompany: NSurgeryCompany | 'all'
  nSurgeryAmount: number
  nSurgeryAmountsByGroup: Record<string, number>
}) {
  const [open, setOpen] = useState(false)
  const [expandedCompany, setExpandedCompany] = useState<NSurgeryCompany | null>(null)

  const col = item.is_cancer ? CANCER_COLOR : TYPE_COLORS[item.type]
  const { surgPay, disPay, disHospPay, total } = calcPayout(item, amounts)

  // 이 수술에 연결된 N대 담보 (전체)
  const nSurgeryCoverages = useMemo(() => findNSurgeryCoverages(item, query), [item, query])

  // 선택 회사 필터
  const filteredCoverages = useMemo(() => {
    if (selectedCompany === 'all') return nSurgeryCoverages
    return nSurgeryCoverages.filter(c => c.company === selectedCompany)
  }, [nSurgeryCoverages, selectedCompany])

  // 회사별 그룹핑 (전체 모드용)
  const byCompany = useMemo(() => {
    const map = new Map<NSurgeryCompany, typeof nSurgeryCoverages>()
    for (const coverage of nSurgeryCoverages) {
      const arr = map.get(coverage.company) ?? []
      arr.push(coverage)
      map.set(coverage.company, arr)
    }
    return Array.from(map.entries())
  }, [nSurgeryCoverages])

  // 그룹별 금액 반환 (입력된 값 → baseAmount → fallback 순)
  const getGroupAmount = useCallback((coverage: NSurgeryCoverage): number => {
    return nSurgeryAmountsByGroup[coverage.groupName]
      ?? coverage.baseAmount
      ?? nSurgeryAmountsByGroup['__default__']
      ?? nSurgeryAmount
  }, [nSurgeryAmountsByGroup, nSurgeryAmount])

  // 선택 회사 N대 예상액
  const nExpected = useMemo(() => {
    if (filteredCoverages.length === 0) return 0
    return Math.max(...filteredCoverages.map(c => getGroupAmount(c)))
  }, [filteredCoverages, getGroupAmount])

  // 이 수술의 질병코드 상세 (N_SURGERY_DISEASE_DETAILS)
  const diseaseDetails = useMemo(() => getNSurgeryDiseaseDetailsForItem(item), [item])
  const filteredDiseaseDetails = useMemo(() => {
    if (selectedCompany === 'all') return diseaseDetails
    return diseaseDetails.filter(d => d.company === selectedCompany)
  }, [diseaseDetails, selectedCompany])

  const matchedSyns = useMemo(() => {
    if (!query) return []
    const ql = query.toLowerCase()
    return item.synonyms.filter(s =>
      s.toLowerCase().includes(ql) && !item.name.toLowerCase().includes(ql)
    )
  }, [item, query])

  const grandTotal = total + (nExpected > 0 ? nExpected : 0)

  return (
    <div
      className={`group bg-white rounded-2xl shadow-sm border-2 cursor-pointer transition-all duration-300
        ${open ? `${col.border} shadow-lg` : 'border-slate-50 hover:border-blue-100 hover:shadow-md'}`}
    >
      {/* 카드 상단 — 클릭으로 토글 */}
      <div onClick={() => setOpen(o => !o)} className="p-5">
        <div className="flex items-center gap-3">
          {/* 종 배지 */}
          <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-sm transition-transform duration-300 ${open ? 'scale-110' : 'group-hover:scale-105'} ${col.badge}`}>
            <span className="text-base leading-none">{item.is_cancer ? '암' : item.type}</span>
            <span className="text-[9px] opacity-70">종</span>
          </div>

          <div className="flex-1 min-w-0">
            {/* 수술명 + 태그 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div
                className="font-black text-slate-800 text-[15px] leading-tight"
                dangerouslySetInnerHTML={{ __html: highlight(item.name, query) }}
              />
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${col.badge}`}>
                {item.is_cancer ? `암·${item.type}종` : `${item.type}종`}
              </span>
              {item.is_disputed && (
                <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md font-black border border-orange-100">⚠️ 분쟁</span>
              )}
            </div>
            {/* KCD + N대 연결 */}
            <div className="flex flex-wrap gap-1 mt-1">
              {item.kcd_codes.slice(0, 3).map(k => (
                <span key={k} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100 font-mono font-bold">{k}</span>
              ))}
              {nSurgeryCoverages.length > 0 ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-black">
                  N대 {byCompany.length}사 연결
                </span>
              ) : (
                <span className="text-[10px] bg-slate-50 text-slate-400 border border-slate-100 px-1.5 py-0.5 rounded font-bold">N대 해당없음</span>
              )}
              {matchedSyns.length > 0 && (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">🔗 {matchedSyns[0]}</span>
              )}
            </div>
          </div>

          {/* 접힌 상태에서 합계 금액 표시 */}
          {!open && (
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-black text-slate-400">예상 합계</p>
              <p className="text-[15px] font-black text-blue-700">{fmoney(grandTotal)}</p>
            </div>
          )}

          <div className={`text-slate-300 transition-transform duration-300 shrink-0 ${open ? 'rotate-180 text-blue-500' : ''}`}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>

        {/* 4칸 수령액 미니 박스 + 합계 바 — 펼쳤을 때만 */}
        {open && (
          <>
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <p className="text-[9px] font-black text-slate-400 mb-1">질병 (일반)</p>
                <p className="text-[13px] font-black text-slate-700">{fmoney(disPay)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                <p className="text-[9px] font-black text-slate-400 mb-1">질병 (상급)</p>
                <p className="text-[13px] font-black text-slate-700">{fmoney(disHospPay)}</p>
              </div>
              <div className={`rounded-xl p-2.5 ${col.bg} border ${col.border}`}>
                <p className={`text-[9px] font-black mb-1 ${col.text}`}>종수술비</p>
                <p className={`text-[13px] font-black ${col.text}`}>{fmoney(surgPay)}</p>
                <p className={`text-[9px] font-bold ${col.text} opacity-70`}>{item.type}종 기준</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
                <p className="text-[9px] font-black text-emerald-600 mb-1">
                  N대{selectedCompany !== 'all' ? '' : ' (연결 시)'}
                </p>
                <p className="text-[13px] font-black text-emerald-800">
                  {nExpected > 0 ? fmoney(nExpected) : '—'}
                </p>
                {filteredCoverages.length > 0 && (
                  <p className="text-[9px] font-bold text-emerald-600 opacity-80">{filteredCoverages[0].groupName}</p>
                )}
              </div>
            </div>

            {/* 합계 바 */}
            <div className="mt-3 flex items-center justify-between bg-slate-800 text-white rounded-xl px-4 py-3">
              <span className="text-[11px] font-black text-slate-300">
                {selectedCompany !== 'all' ? `${selectedCompany} 기준 합계` : '예상 수령 합계'}
              </span>
              <span className="text-xl font-black text-yellow-400">{fmoney(grandTotal)}</span>
            </div>
          </>
        )}</div>

      {/* ── 확장 상세 ── */}
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-50 pt-4">

          {/* 수술 정의 */}
          {(item as ExtendedSurgeryItem).desc && (
            <div className="flex gap-3">
              <span className="text-lg shrink-0">📋</span>
              <div>
                <span className="font-black text-slate-800 block text-sm mb-1">수술 정의 및 범위</span>
                <p className="text-slate-600 text-[13px] leading-relaxed font-medium">
                  {(item as ExtendedSurgeryItem).desc}
                </p>
              </div>
            </div>
          )}

          {/* 참고 안내 */}
          {item.notes && (
            <div className="flex gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <span className="text-lg shrink-0">💡</span>
              <div>
                <span className="font-black text-blue-800 block text-xs mb-1">참고 및 안내</span>
                <p className="text-blue-700 text-[13px] leading-relaxed font-medium">{item.notes}</p>
              </div>
            </div>
          )}

          {/* 암 중복 안내 */}
          {item.is_cancer && (
            <div className="flex gap-3 bg-red-50/50 p-4 rounded-2xl border border-red-100">
              <span className="text-lg shrink-0">🎗</span>
              <div className="text-red-800 text-[13px] font-bold">
                본 수술은 암 전용 수술비 특약에서 별도로 지급될 수 있습니다.
                <p className="text-[11px] mt-1 font-medium opacity-80">악성 신생물 및 상피내암 분류에 따라 가입금액의 10~100%가 차등 지급됩니다.</p>
              </div>
            </div>
          )}

          {/* N대 수술비 — 회사별 */}
          <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">N</span>
              <span className="text-sm font-black text-slate-800">보험회사별 N대 수술비</span>
            </div>

            {selectedCompany !== 'all' ? (
              /* 회사 선택 모드: 해당 회사만 표시 */
              filteredCoverages.length > 0 ? (
                <div className="space-y-2">
                  {filteredCoverages.map((coverage, i) => (
                    <div key={`${coverage.company}-${coverage.groupName}-${i}`} className="bg-white rounded-2xl border border-emerald-100 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[12px] font-black text-emerald-800">{coverage.groupName}</span>
                          <p className="text-[11px] font-bold text-slate-600 mt-0.5">{coverage.productName}</p>
                        </div>
                        <span className="text-[12px] font-black text-white bg-emerald-600 px-2.5 py-1 rounded-lg shrink-0">
                          {fmoney(getGroupAmount(coverage))}
                        </span>
                      </div>
                      {/* KCD 코드 */}
                      {filteredDiseaseDetails.filter(d => d.groupName === coverage.groupName).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {filteredDiseaseDetails
                            .filter(d => d.groupName === coverage.groupName)
                            .map((detail, j) => (
                              <span key={j} className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                                {detail.code} — {detail.disease}
                              </span>
                            ))
                          }
                        </div>
                      )}
                      {coverage.note && (
                        <p className="text-[10px] text-slate-400 font-bold mt-2 leading-relaxed">{coverage.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-slate-500 font-bold">
                  {selectedCompany} 자료에서 직접 연결되는 N대 수술비가 없습니다.
                </p>
              )
            ) : (
              /* 전체 모드: 회사별 아코디언 */
              byCompany.length > 0 ? (
                <div className="space-y-2">
                  {byCompany.map(([company, coverages]) => {
                    const isExpanded = expandedCompany === company
                    const topAmount = Math.max(...coverages.map(c => getGroupAmount(c)))
                    const nLabel = getProductNLabel(coverages[0]?.productName ?? '')
                    const companyDetails = diseaseDetails.filter(d => d.company === company)
                    const hasRealData = !isDataMissing(coverages)
                    return (
                      <div key={company} className="rounded-2xl border border-emerald-100 overflow-hidden">
                        {/* 회사 행 — 클릭으로 아코디언 */}
                        <button
                          onClick={e => { e.stopPropagation(); setExpandedCompany(isExpanded ? null : company) }}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-emerald-50/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[13px] font-black text-slate-800 truncate">{company}</span>
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0">{nLabel}</span>
                            {!hasRealData && (
                              <span className="text-[9px] font-bold text-amber-500 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full shrink-0">약관필요</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[12px] font-black text-emerald-800">{fmoney(topAmount)}</span>
                            <svg
                              width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"
                              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-emerald-600' : 'text-slate-400'}`}
                            >
                              <path d="M19 9l-7 7-7-7"/>
                            </svg>
                          </div>
                        </button>

                        {/* 아코디언 펼침: KCD 코드 상세 */}
                        {isExpanded && (
                          <div className="border-t border-emerald-100 bg-emerald-50/40 px-4 py-3 space-y-2">
                            {!hasRealData && (
                              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                                <span className="text-amber-500 text-sm shrink-0">⚠️</span>
                                <div>
                                  <p className="text-[11px] font-black text-amber-700">세부 코드 데이터 미등록</p>
                                  <p className="text-[10px] text-amber-600 mt-0.5 leading-relaxed">
                                    {company}의 약관 이미지(PDF)를 전달해 주시면 정확한 질병코드·등급 데이터를 입력해 드립니다.
                                  </p>
                                </div>
                              </div>
                            )}
                            {coverages.map((coverage, i) => (
                              <div key={i} className="bg-white rounded-xl border border-emerald-100 p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="text-[11px] font-black text-emerald-800">{coverage.groupName}</p>
                                    <p className="text-[11px] font-bold text-slate-500">{coverage.productName}</p>
                                  </div>
                                  <span className="text-[11px] font-black text-white bg-emerald-600 px-2 py-0.5 rounded-lg shrink-0">
                                    {fmoney(getGroupAmount(coverage))}
                                  </span>
                                </div>

                                {/* 해당 그룹 질병 코드 */}
                                {companyDetails.filter(d => d.groupName === coverage.groupName).length > 0 ? (
                                  <div className="space-y-1">
                                    {companyDetails
                                      .filter(d => d.groupName === coverage.groupName)
                                      .map((detail, j) => (
                                        <div key={j} className="flex items-center gap-2">
                                          <span className="font-mono text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded shrink-0">{detail.code}</span>
                                          <span className="text-[11px] font-bold text-slate-600">{detail.disease}</span>
                                        </div>
                                      ))
                                    }
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {(coverage.diseaseCodes ?? []).map(code => (
                                      <span key={code} className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">{code}</span>
                                    ))}
                                    {coverage.diseaseCodes?.length === 0 && (
                                      <span className="text-[10px] font-bold text-amber-600">약관 원문 확인 필요</span>
                                    )}
                                  </div>
                                )}

                                {coverage.note && (
                                  <p className="text-[10px] text-slate-400 font-bold mt-2 leading-relaxed">{coverage.note}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-slate-500 font-bold">
                  현재 등록된 N대 수술비 자료에서 직접 연결되는 지급회사가 없습니다.
                </p>
              )
            )}
          </div>

          {/* 보험사별 종 구분 */}
          {item.type_by_company && (
            <div className="flex gap-3">
              <span className="text-lg shrink-0">🏢</span>
              <div>
                <span className="font-black text-slate-800 block text-sm mb-1.5">보험사별 종 구분</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(item.type_by_company).map(([co, t]) => (
                    <span key={co} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">
                      {co}: <span className="text-blue-600">{t}종</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 부지급 유의사항 */}
          {item.no_pay && item.no_pay.length > 0 && (
            <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4">
              <div className="text-red-700 font-black text-sm mb-2 flex items-center gap-2">
                <span className="bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">!</span>
                지급 제외 및 부지급 유의사항
              </div>
              <ul className="space-y-1.5">
                {item.no_pay.map((np, i) => (
                  <li key={i} className="flex gap-2 text-xs text-red-800 font-bold leading-relaxed">
                    <span className="shrink-0 text-red-400">•</span>
                    <span>{np}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 출처 */}
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-50">
            {item.sources.map(s => (
              <span key={s} className="text-[10px] bg-slate-50 text-slate-400 px-2 py-1 rounded-md border border-slate-100">출처: {s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
