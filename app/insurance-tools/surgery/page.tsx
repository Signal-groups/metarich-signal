'use client'

import { useState, useMemo, useCallback } from 'react'
import { SURGERY_DB } from '../../../lib/insurance/surgery-db'
import {
  N_SURGERY_BODY_PARTS,
  N_SURGERY_COMPANIES,
  N_SURGERY_COVERAGES,
  findNSurgeryCoverages,
  getCoverageBodyParts,
  getCoverageDisplayAmount,
  matchesNSurgeryText,
} from '../../../lib/insurance/n-surgery-db'
import type { SurgeryItem, SurgeryAmounts } from '../../../lib/insurance/types'
import type { NSurgeryBodyPartKey, NSurgeryCompany } from '../../../lib/insurance/n-surgery-db'

// ─────────────────────────────────────────────────────────
// 상단에 임시로 혹은 누락된 SurgeryItem 인터페이스 정의 (빌드 에러 방지)
// ─────────────────────────────────────────────────────────
/**
 * SurgeryItem 타입에 desc 속성이 있음을 명시합니다.
 */
interface ExtendedSurgeryItem extends SurgeryItem {
  desc?: string;
}

// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
const DEFAULT_AMOUNTS: SurgeryAmounts = {
  type1: 30, type2: 50, type3: 200, type4: 500, type5: 1000, disease: 30,
}

const TYPE_COLORS: Record<number, { bg: string; text: string; border: string; badge: string }> = {
  1: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  2: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  3: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
  4: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  5: { bg: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200', badge: 'bg-pink-100 text-pink-700' },
}
const CANCER_COLOR = { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-700' }

const TYPE_BROWSE = [
  { type: 1, label: '1종', example: '백내장·용종·탈장·편도', mul: 1 },
  { type: 2, label: '2종', example: '망막·골이식·맹장·척추내시경', mul: 2 },
  { type: 3, label: '3종', example: '유방절단·녹내장·담낭·갑상선', mul: 5 },
  { type: 4, label: '4종', example: '위절제·간·신장·대장관혈', mul: 10 },
  { type: 5, label: '5종', example: '심장이식·뇌관혈·관상동맥', mul: 20 },
]

const CATEGORIES = [
  { key: 'all',           label: '전체' },
  { key: 'eye',           label: '👁 눈·안과' },
  { key: 'digestive',     label: '🫁 소화기' },
  { key: 'cardiovascular',label: '❤️ 심장·혈관' },
  { key: 'musculoskeletal',label: '🦴 근골격' },
  { key: 'respiratory',   label: '👂 호흡기·귀코목' },
  { key: 'neurological',  label: '🧠 뇌·신경' },
  { key: 'urogenital',    label: '🫀 비뇨·생식' },
  { key: 'skin_breast',   label: '유방·피부' },
  { key: 'endocrine',     label: '갑상선·내분비' },
  { key: 'ear',           label: '청각기(귀)' },
  { key: 'cancer',        label: '🎗 암 수술' },
]

// ─────────────────────────────────────────────────────────
// 유틸리티 함수
// ─────────────────────────────────────────────────────────
function fmoney(v: number): string {
  if (v === 0) return '미가입'
  if (v >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억원`
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}천만원`
  return `${v.toLocaleString()}만원`
}

function calcPayout(item: SurgeryItem, amounts: SurgeryAmounts) {
  const amtMap: Record<number, number> = {
    1: amounts.type1, 2: amounts.type2, 3: amounts.type3,
    4: amounts.type4, 5: amounts.type5,
  }
  const surgPay = item.is_cancer
  ? (item.type === 5 ? amounts.type5 : amounts.type3)
    : (amtMap[item.type] ?? 0)
  const disPay = amounts.disease
  return { surgPay, disPay, total: surgPay + disPay }
}

function highlight(text: string, q: string): string {
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>')
}

function matchItem(item: SurgeryItem, q: string): boolean {
  const ql = q.toLowerCase()
  return (
    item.name.toLowerCase().includes(ql) ||
    item.kcd_codes.some(k => k.toLowerCase().includes(ql)) ||
    ((item as ExtendedSurgeryItem).desc?.toLowerCase().includes(ql) || false) ||
    item.synonyms.some(s => s.toLowerCase().includes(ql)) ||
    matchesNSurgeryText(item, q)
  )
}

// ─────────────────────────────────────────────────────────
// 치조골 이식 팝업 데이터
// ─────────────────────────────────────────────────────────
const CHIOGOL_DATA = [
  { company: 'ING생명',     until: '~2008년 03월 31일' },
  { company: '한화생명',     until: '~2006년 02월 28일' },
  { company: '교보생명',     until: '~2006년 02월 20일' },
  { company: '삼성생명',     until: '~2005년 03월 31일' },
  { company: '신한라이프',   until: '~2006년 03월 12일' },
  { company: '동부생명',     until: '~2007년 03월 31일' },
  { company: '알리안츠',     until: '~2006년 03월 31일' },
  { company: '메트라이프',   until: '~2008년 03월 31일' },
  { company: '푸르덴셜',     until: '~2008년 03월 31일' },
  { company: '동양생명',     until: '~2006년 03월 31일' },
  { company: '미래에셋',     until: '~2006년 03월 31일' },
  { company: '하나생명',     until: '~2006년 03월 31일' },
]

// ─────────────────────────────────────────────────────────
// 메인 페이지 컴포넌트
// ─────────────────────────────────────────────────────────
export default function SurgeryPage() {
  const [query, setQuery]         = useState('')
  const [category, setCategory]   = useState('all')
  const [typeFilter, setTypeFilter] = useState<number | 'cancer' | null>(null)
  const [amounts, setAmounts]     = useState<SurgeryAmounts>(DEFAULT_AMOUNTS)
  const [showChiogol, setShowChiogol] = useState(false)
  const [acOpen, setAcOpen]       = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<NSurgeryCompany | 'all'>('all')
  const [nSurgeryAmount, setNSurgeryAmount] = useState(100)
  const [selectedBodyPart, setSelectedBodyPart] = useState<NSurgeryBodyPartKey | 'all'>('all')
  const [nSurgeryModalCompany, setNSurgeryModalCompany] = useState<NSurgeryCompany | null>(null)
  const [showCompanyPicker, setShowCompanyPicker] = useState(false)

  // 자동완성 후보
  const acItems = useMemo(() => {
    if (!query || query.length < 1) return []
    return SURGERY_DB.filter(item => matchItem(item, query)).slice(0, 10)
  }, [query])

  // 필터링된 결과
  const filtered = useMemo(() => {
    return SURGERY_DB.filter(item => {
      const catOk = category === 'all' || item.category === category
      const typeOk = typeFilter === null
        ? true
        : typeFilter === 'cancer'
          ? item.is_cancer 
          : item.type === typeFilter && !item.is_cancer 
      const textOk = !query || matchItem(item, query)
      return catOk && typeOk && textOk
    })
  }, [query, category, typeFilter])

  const handleAmountChange = useCallback((key: keyof SurgeryAmounts, val: string) => {
    setAmounts(prev => ({ ...prev, [key]: Number(val) || 0 }))
  }, [])

  const handleTypeClick = useCallback((t: number | 'cancer') => {
    setTypeFilter(prev => prev === t ? null : t)
    setCategory('all')
    setQuery('')
  }, [])

  const handleCategoryClick = useCallback((key: string) => {
    setCategory(key)
    setTypeFilter(null)
  }, [])

  const normalItems = filtered.filter(x => !x.is_cancer)
  const cancerItems = filtered.filter(x => x.is_cancer)
  const selectedCompanyCoverages = useMemo(() => {
    const rows = selectedCompany === 'all'
      ? N_SURGERY_COVERAGES
      : N_SURGERY_COVERAGES.filter(coverage => coverage.company === selectedCompany)
    return rows.filter(coverage =>
      selectedBodyPart === 'all' ? true : getCoverageBodyParts(coverage).includes(selectedBodyPart)
    )
  }, [selectedBodyPart, selectedCompany])
  const companyMatchedItems = useMemo(() => {
    if (!query && selectedBodyPart === 'all') return []

    return SURGERY_DB
      .map(item => {
        const coverages = findNSurgeryCoverages(item, query).filter(coverage => {
          const companyOk = selectedCompany === 'all' ? true : coverage.company === selectedCompany
          const bodyPartOk = selectedBodyPart === 'all' ? true : getCoverageBodyParts(coverage).includes(selectedBodyPart)
          return companyOk && bodyPartOk
        })
        return { item, coverages }
      })
      .filter(row => row.coverages.length > 0 && (!query || matchItem(row.item, query)))
      .slice(0, 12)
  }, [query, selectedBodyPart, selectedCompany])
  const modalCoverages = useMemo(() => {
    if (!nSurgeryModalCompany) return []
    return N_SURGERY_COVERAGES.filter(coverage => coverage.company === nSurgeryModalCompany)
      .filter(coverage => selectedBodyPart === 'all' ? true : getCoverageBodyParts(coverage).includes(selectedBodyPart))
  }, [nSurgeryModalCompany, selectedBodyPart])

  return (
    <div className="min-h-screen bg-[#eef3ff]">
      {/* 헤더 */}
      <div className="px-4 py-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto rounded-3xl bg-white p-6 lg:p-8 shadow-sm border-l-[6px] border-[#2563eb]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-[#1a3a6e] tracking-tight flex items-center gap-3">
                <span className="bg-blue-50 text-blue-600 p-2 rounded-2xl">🏥</span>
                수술비 검색
              </h1>
              <p className="text-sm text-[#94a3b8] font-bold mt-2 tracking-wider">종수술비와 회사별 N대 수술비를 함께 확인합니다</p>
            </div>
            <button
              onClick={() => setShowChiogol(true)}
              className="text-xs font-black bg-slate-100 hover:bg-slate-200 border border-slate-100 text-slate-600 px-4 py-3 rounded-xl transition-all active:scale-95"
            >
              🦷 1~3종 치조골이식 지급시기 확인
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 pb-8 lg:px-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">

        {/* ① 검색 섹션 */}
        <div className="bg-white rounded-3xl shadow-sm p-6 border border-white xl:col-start-1">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">🔍 통합 수술 명칭 검색</p>
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); setAcOpen(true) }}
                  onKeyDown={e => { if (e.key === 'Escape') setAcOpen(false) }}
                  onFocus={() => setAcOpen(true)}
                  placeholder="질병코드(H25), 수술명, 연관어 검색..."
                  className="w-full border-2 border-slate-100 focus:border-blue-500 rounded-2xl px-5 py-4 text-base outline-none bg-slate-50/50 focus:bg-white transition-all shadow-inner"
                />
                {/* 자동완성 목록 */}
                {acOpen && acItems.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-400 rounded-2xl shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2.5 bg-blue-50 text-[10px] font-black text-blue-600 uppercase tracking-wider border-b border-blue-100">
                      실시간 추천 검색 결과
                    </div>
                    {acItems.map(item => {
                      const col = item.is_cancer ? CANCER_COLOR : TYPE_COLORS[item.type]
                      const { total } = calcPayout(item, amounts)
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setQuery(item.name); setAcOpen(false); setTypeFilter(null) }}
                          className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-left transition-colors"
                        >
                          <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black text-sm shrink-0 shadow-sm ${col.badge}`}>
                            <span className="text-base leading-none">{item.is_cancer ? '암' : item.type}</span>
                            <span className="text-[9px] font-bold">종</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="font-bold text-slate-800 text-[15px] truncate"
                              dangerouslySetInnerHTML={{ __html: highlight(item.name, query) }}
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-medium tracking-tighter">
                                {item.kcd_codes[0] || 'N/A'}
                              </span>
                              {total > 0 && (
                                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                  예상 {fmoney(total)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-slate-300 transform group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              {query && (
                <button
                  onClick={() => { setQuery(''); setAcOpen(false) }}
                  className="px-6 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-all active:scale-95"
                >
                  초기화
                </button>
              )}
            </div>

            {/* 부위별 카테고리 탭 */}
            <div className="flex flex-wrap gap-2 mt-5">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => handleCategoryClick(c.key)}
                  className={`px-3.5 py-2 rounded-xl text-[13px] font-bold border-2 transition-all active:scale-95
                    ${category === c.key
                      ? c.key === 'cancer'
                        ? 'bg-red-600 text-white border-red-600 shadow-md'
                        : 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : c.key === 'cancer'
                        ? 'border-red-100 text-red-500 hover:bg-red-50'
                        : 'border-slate-100 text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ② 가입금액 설정 */}
        <div className="bg-white rounded-3xl shadow-sm p-6 border border-white xl:col-start-1">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">💰 나의 가입 특약 설정</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            {([1,2,3,4,5] as const).map(t => {
              const col = TYPE_COLORS[t]
              const key = `type${t}` as keyof SurgeryAmounts
              return (
                <div key={t} className="group">
                  <label className={`block text-[11px] font-black mb-1.5 ml-1 ${col.text}`}>{t}종 수술비</label>
                  <div className={`flex items-center border-2 rounded-2xl overflow-hidden bg-slate-50/50 focus-within:bg-white transition-all group-hover:border-slate-200 focus-within:${col.border}`}>
                    <input
                      type="number"
                      min={0}
                      value={amounts[key]}
                      onChange={e => handleAmountChange(key, e.target.value)}
                      className="flex-1 text-right px-1 py-3 text-sm font-black bg-transparent outline-none min-w-0"
                    />
                    <span className="pr-3 text-[10px] text-slate-400 font-bold shrink-0">만원</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 pt-2 border-t border-slate-50">
            <label className="text-sm font-black text-slate-700 whitespace-nowrap">질병수술비 (기본)</label>
            <div className="flex items-center border-2 border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50 focus-within:bg-white focus-within:border-slate-300 w-full max-w-[200px]">
              <input
                type="number"
                min={0}
                value={amounts.disease}
                onChange={e => handleAmountChange('disease', e.target.value)}
                className="flex-1 text-right px-4 py-3 text-sm font-black bg-transparent outline-none"
              />
              <span className="pr-4 text-[10px] text-slate-400 font-bold">만원</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm p-6 border border-emerald-100 xl:col-start-2 xl:row-start-1 xl:row-span-5 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
          <div className="flex flex-col gap-4 mb-5">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">N대 수술비 회사별 확인</p>
              <h2 className="text-xl font-black text-slate-900">보험회사별 보장 범위와 예상 수령액</h2>
              <p className="text-xs text-slate-500 font-bold mt-1">
                위 검색창에 수술명이나 질병명을 입력하면 선택한 회사의 N대 수술비와 종수술비 예상액을 함께 봅니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-black text-slate-500 whitespace-nowrap">N대 가입금액</label>
              <div className="flex items-center border-2 border-emerald-100 rounded-2xl overflow-hidden bg-emerald-50/40 focus-within:bg-white focus-within:border-emerald-300 w-[150px]">
                <input
                  type="number"
                  min={0}
                  value={nSurgeryAmount}
                  onChange={event => setNSurgeryAmount(Number(event.target.value) || 0)}
                  className="flex-1 text-right px-3 py-3 text-sm font-black bg-transparent outline-none min-w-0"
                />
                <span className="pr-3 text-[10px] text-emerald-600 font-bold">만원</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 mb-4">
            <p className="text-[11px] font-black text-slate-400 mb-2">선택 회사</p>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-black text-slate-900 truncate">
                  {selectedCompany === 'all' ? '전체 회사' : selectedCompany}
                </p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                  {selectedCompanyCoverages.length}개 담보 그룹 표시
                </p>
              </div>
              <button
                onClick={() => setShowCompanyPicker(true)}
                className="shrink-0 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                회사 선택
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => setShowCompanyPicker(true)}
                className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-[11px] font-black text-emerald-700 hover:bg-emerald-50"
              >
                회사별 목록 보기
              </button>
              <button
                onClick={() => {
                  if (selectedCompany !== 'all') {
                    setNSurgeryModalCompany(selectedCompany)
                  } else {
                    setShowCompanyPicker(true)
                  }
                }}
                className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-50"
              >
                상세 팝업
              </button>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-black text-slate-400">신체 부위</p>
              {selectedBodyPart !== 'all' && (
                <button
                  onClick={() => setSelectedBodyPart('all')}
                  className="text-[11px] font-black text-slate-400 hover:text-slate-700"
                >
                  전체로 보기
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedBodyPart('all')}
                className={`px-3 py-2 rounded-xl text-[11px] font-black border transition-all ${
                  selectedBodyPart === 'all'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                }`}
              >
                전체
              </button>
              {N_SURGERY_BODY_PARTS.slice(0, 8).map(part => (
                <button
                  key={part.key}
                  onClick={() => setSelectedBodyPart(part.key)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black border transition-all ${
                    selectedBodyPart === part.key
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                  }`}
                >
                  {part.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-800">검색 수술과 회사별 예상</h3>
                <span className="text-[11px] font-black text-slate-500">
                  {query || selectedBodyPart !== 'all' ? `${companyMatchedItems.length}건 연결` : '검색어 필요'}
                </span>
              </div>
              {!query && selectedBodyPart === 'all' ? (
                <div className="rounded-2xl bg-white/80 border border-emerald-100 p-5 text-sm font-bold text-slate-500 leading-relaxed">
                  예: 대장용종, 복강경 담낭수술, 백내장, 갑상선, 심장, 디스크처럼 입력하면 선택한 회사 기준으로 종수술비와 N대 수술비를 함께 계산합니다.
                </div>
              ) : companyMatchedItems.length === 0 ? (
                <div className="rounded-2xl bg-white/80 border border-emerald-100 p-5 text-sm font-bold text-slate-500 leading-relaxed">
                  {selectedCompany === 'all' ? '등록된 회사별 N대 수술비에서' : `${selectedCompany} 자료에서`} 직접 연결되는 N대 수술비가 없습니다.
                  종수술비 결과는 아래 검색 결과에서 확인하세요.
                </div>
              ) : (
                <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
                  {companyMatchedItems.map(({ item, coverages }) => {
                    const payout = calcPayout(item, amounts)
                    const nExpected = Math.max(...coverages.map(coverage => getCoverageDisplayAmount(coverage, nSurgeryAmount)))
                    const expectedTotal = payout.total + nExpected

                    return (
                      <div key={item.id} className="rounded-2xl bg-white border border-emerald-100 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[13px] font-black text-slate-900 truncate">{item.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                              {item.kcd_codes.slice(0, 3).join(', ') || 'KCD 확인 필요'}
                            </p>
                          </div>
                          <span className={`text-[11px] px-2.5 py-1 rounded-lg font-black ${item.is_cancer ? CANCER_COLOR.badge : TYPE_COLORS[item.type].badge}`}>
                            {item.type}종
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-2">
                            <p className="text-[10px] font-black text-slate-400">종수+질병</p>
                            <p className="text-[13px] font-black text-slate-800">{fmoney(payout.total)}</p>
                          </div>
                          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2">
                            <p className="text-[10px] font-black text-emerald-600">N대 예상</p>
                            <p className="text-[13px] font-black text-emerald-800">{fmoney(nExpected)}</p>
                          </div>
                          <div className="rounded-xl bg-blue-50 border border-blue-100 p-2">
                            <p className="text-[10px] font-black text-blue-600">합계 예상</p>
                            <p className="text-[13px] font-black text-blue-800">{fmoney(expectedTotal)}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {coverages.slice(0, 4).map((coverage, index) => (
                            <span key={`${coverage.company}-${coverage.groupName}-${index}`} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                              {coverage.company} · {coverage.groupName}
                            </span>
                          ))}
                          {coverages.length > 4 && (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                              외 {coverages.length - 4}개
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-bold mt-4 leading-relaxed">
            N대 예상액은 위 입력한 가입금액을 기준으로 단순 합산한 상담용 예시입니다. 실제 지급은 회사별 약관, 가입금액, 면책/감액, 동일질병 반복지급 조건에 따라 달라집니다.
          </p>
        </div>

        {/* ③ 종별 빠른 필터 */}
        <div className="bg-white rounded-3xl shadow-sm p-6 border border-white xl:col-start-1">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">📂 종별 전체 리스트</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {TYPE_BROWSE.map(({ type, example }) => {
              const col = TYPE_COLORS[type]
              const isOn = typeFilter === type
              const amt = amounts[`type${type}` as keyof SurgeryAmounts] as number
              return (
                <button
                  key={type}
                  onClick={() => handleTypeClick(type)}
                  className={`rounded-2xl p-4 text-left border-2 transition-all group hover:-translate-y-1
                    ${isOn ? `${col.bg} ${col.border} shadow-lg ring-2 ring-offset-2 ${col.border.replace('border-', 'ring-')}` : 'bg-slate-50/50 border-slate-50 hover:border-blue-200 hover:bg-white'}`}
                >
                  <div className={`text-3xl font-black leading-none ${isOn ? col.text : 'text-slate-300 group-hover:text-slate-400'}`}>{type}</div>
                  <div className={`text-[11px] font-black mb-2 ${isOn ? col.text : 'text-slate-500'}`}>종 수술</div>
                  <div className="text-[10px] text-slate-400 leading-tight mb-2 h-6 overflow-hidden line-clamp-2">{example}</div>
                  <div className={`text-[11px] font-black pt-2 border-t border-dotted ${isOn ? col.border : 'border-slate-200'} ${isOn ? col.text : 'text-slate-400'}`}>
                    {amt > 0 ? fmoney(amt) : '미가입'}
                  </div>
                </button>
              )
            })}
            {/* 암 버튼 */}
            <button
              onClick={() => handleTypeClick('cancer')}
              className={`rounded-2xl p-4 text-left border-2 transition-all group hover:-translate-y-1
                ${typeFilter === 'cancer' ? 'bg-red-50 border-red-400 shadow-lg ring-2 ring-offset-2 ring-red-200' : 'bg-slate-50/50 border-slate-50 hover:border-red-200 hover:bg-white'}`}
            >
              <div className={`text-3xl font-black leading-none ${typeFilter === 'cancer' ? 'text-red-600' : 'text-slate-300'}`}>암</div>
              <div className={`text-[11px] font-black mb-2 ${typeFilter === 'cancer' ? 'text-red-600' : 'text-slate-500'}`}>집중 수술</div>
              <div className="text-[10px] text-slate-400 leading-tight mb-2 h-6">악성 신생물 기준</div>
              <div className={`text-[11px] font-black pt-2 border-t border-dotted ${typeFilter === 'cancer' ? 'border-red-200 text-red-600' : 'border-slate-200 text-slate-400'}`}>
                3·5종 기준
              </div>
            </button>
          </div>
        </div>

        {/* ④ 검색 및 필터 결과 리스트 */}
        <div className="space-y-4 xl:col-start-1">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-base font-black text-slate-800">
              {typeFilter !== null
                ? <span><span className="text-blue-600">{typeFilter === 'cancer' ? '암수술' : `${typeFilter}종`}</span> 검색 결과</span>
                : query
                  ? <span>&ldquo;<span className="text-blue-600">{query}</span>&rdquo; 관련 수술</span>
                  : '전체 수술 리스트'
              }
              <span className="ml-2 font-medium text-slate-400 text-sm">{filtered.length}건</span>
            </h3>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl py-20 text-center border-2 border-dashed border-slate-200">
              <div className="text-5xl mb-4 opacity-20">🔎</div>
              <p className="text-slate-500 font-bold">검색 결과가 없습니다.</p>
              <p className="text-slate-400 text-xs mt-1">질병명 또는 부위 카테고리를 다시 확인해 보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {/* 일반 수술 항목 */}
              {normalItems.map(item => (
                <SurgeryCard key={item.id} item={item} amounts={amounts} query={query} />
              ))}

              {/* 암 수술 항목이 있을 경우 구분선 표시 */}
              {cancerItems.length > 0 && (
                <div className="relative py-8">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t-2 border-red-100"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-slate-50 text-[11px] font-black text-red-600 flex items-center gap-2 border border-red-200 rounded-full py-1.5 shadow-sm">
                      🎗 암 수술 정보 (암 특약 별도 확인 권장)
                    </span>
                  </div>
                </div>
              )}

              {cancerItems.map(item => (
                <SurgeryCard key={item.id} item={item} amounts={amounts} query={query} />
              ))}
            </div>
          )}

          {/* 면책 안내 고지 */}
          <div className="bg-amber-50/50 border-l-4 border-amber-400 p-5 rounded-r-2xl">
            <div className="flex gap-3">
              <span className="text-amber-500 text-lg">⚠️</span>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                본 정보는 보험 약관의 일반적인 해석을 돕기 위한 참고 자료이며, 보험금 지급 여부는 가입하신 상품의 <strong>증권 및 특별약관</strong>에 따라 결정됩니다. 수술 시기, 보험사별 상이한 기준(1~3종 vs 1~5종)에 따라 차이가 발생할 수 있으니 반드시 담당 설계사나 고객센터를 통해 확정 받으시기 바랍니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 치조골 이식 팝업 레이어 */}
      {showChiogol && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-6 py-6">
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
                      <th className="text-right py-3 px-4 text-slate-500 font-bold">보험시기 (~까지)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CHIOGOL_DATA.map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-black text-slate-700">{row.company}</td>
                        <td className="py-3.5 px-4 text-right text-blue-600 font-mono font-bold">{row.until}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 p-4 bg-slate-50 rounded-2xl">
                <p className="text-[11px] text-slate-500 text-center leading-relaxed font-medium">
                  위 날짜 <strong>이전 가입자</strong>만 수술비(2종 등) 청구가 가능하며,<br />
                  이후 가입자는 질병수술비나 별도 약관 확인이 필요합니다.
                </p>
              </div>
              <button
                onClick={() => setShowChiogol(false)}
                className="w-full mt-4 py-4 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-900 transition-colors shadow-lg active:scale-[0.98]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompanyPicker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[105] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[86vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#1a3a6e] text-white px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">N대 수술비 회사 선택</h2>
                  <p className="text-blue-100 text-xs mt-1 font-bold">
                    회사를 선택하면 오른쪽 패널 기준이 바뀌고, 상세 버튼으로 담보 범위를 확인합니다.
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
                onClick={() => {
                  setSelectedCompany('all')
                  setShowCompanyPicker(false)
                }}
                className={`w-full rounded-2xl border-2 p-4 text-left transition-all mb-3 ${
                  selectedCompany === 'all'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-100 bg-slate-50 hover:border-emerald-200 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-900">전체 회사</p>
                    <p className="text-[11px] font-bold text-slate-500 mt-1">검색 수술이 어느 회사 N대 담보와 연결되는지 전체 비교</p>
                  </div>
                  <span className="text-[11px] font-black text-emerald-700 bg-white border border-emerald-100 px-2.5 py-1 rounded-full">
                    {N_SURGERY_COVERAGES.length}개 그룹
                  </span>
                </div>
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {N_SURGERY_COMPANIES.map(company => {
                  const coverageCount = N_SURGERY_COVERAGES.filter(coverage => coverage.company === company).length
                  return (
                    <div
                      key={company}
                      className={`rounded-2xl border-2 p-4 transition-all ${
                        selectedCompany === company
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-100 bg-white hover:border-emerald-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">{company}</p>
                          <p className="text-[11px] font-bold text-slate-500 mt-1">{coverageCount}개 담보 그룹</p>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                          N대
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          onClick={() => {
                            setSelectedCompany(company)
                            setShowCompanyPicker(false)
                          }}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-black text-white hover:bg-emerald-700"
                        >
                          선택
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCompany(company)
                            setShowCompanyPicker(false)
                            setNSurgeryModalCompany(company)
                          }}
                          className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-[11px] font-black text-slate-600 hover:bg-slate-50"
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

      {nSurgeryModalCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[86vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">{nSurgeryModalCompany} N대 수술비 상세</h2>
                  <p className="text-emerald-100 text-xs mt-1 font-bold">
                    {selectedBodyPart === 'all'
                      ? '전체 신체부위'
                      : N_SURGERY_BODY_PARTS.find(part => part.key === selectedBodyPart)?.label} 기준 담보 그룹, 질병명, 코드, 예상액
                  </p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modalCoverages.map((coverage, index) => {
                  const amount = getCoverageDisplayAmount(coverage, nSurgeryAmount)
                  const bodyLabels = getCoverageBodyParts(coverage)
                    .map(key => N_SURGERY_BODY_PARTS.find(part => part.key === key)?.label)
                    .filter(Boolean)

                  return (
                    <div key={`${coverage.company}-${coverage.productName}-${coverage.groupName}-${index}`} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[12px] font-black text-emerald-800">{coverage.groupName}</p>
                          <p className="text-[13px] font-black text-slate-900 mt-1">{coverage.productName}</p>
                        </div>
                        <span className="text-[12px] font-black text-white bg-emerald-600 px-2.5 py-1 rounded-lg">
                          {fmoney(amount)}
                        </span>
                      </div>
                      <div className="mt-3">
                        <p className="text-[10px] font-black text-slate-400 mb-1">질병명/검색 기준</p>
                        <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                          {coverage.keywords.slice(0, 22).join(', ')}
                        </p>
                      </div>
                      <div className="mt-3">
                        <p className="text-[10px] font-black text-slate-400 mb-1">질병코드 / 신체부위</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(coverage.diseaseCodes ?? []).length > 0 ? (
                            (coverage.diseaseCodes ?? []).map(code => (
                              <span key={code} className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg">
                                {code}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                              질병코드 원문 확인 필요
                            </span>
                          )}
                        {bodyLabels.map(label => (
                          <span key={label} className="text-[10px] font-bold text-slate-500 bg-white border border-slate-100 px-2 py-1 rounded-lg">
                            {label}
                          </span>
                        ))}
                        </div>
                      </div>
                      {coverage.note && (
                        <p className="text-[10px] text-slate-400 font-bold mt-3 leading-relaxed">{coverage.note}</p>
                      )}
                    </div>
                  )
                })}
              </div>
              {modalCoverages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-500">
                  선택한 부위 기준으로 표시할 N대 수술비 항목이 없습니다.
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
// 개별 수술 정보 카드 컴포넌트
// ─────────────────────────────────────────────────────────
function SurgeryCard({ item, amounts, query }: { item: SurgeryItem; amounts: SurgeryAmounts; query: string }) {
  const [open, setOpen] = useState(false)
  const col = item.is_cancer ? CANCER_COLOR : TYPE_COLORS[item.type]
  const { surgPay, disPay, total } = calcPayout(item, amounts)
  const nSurgeryCoverages = useMemo(() => findNSurgeryCoverages(item, query), [item, query])
  const nSurgeryByCompany = useMemo(() => {
    const seen = new Set<string>()
    return nSurgeryCoverages.filter(coverage => {
      const key = `${coverage.company}-${coverage.productName}-${coverage.groupName}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [nSurgeryCoverages])

  const matchedSyns = useMemo(() => {
    if (!query) return []
    const ql = query.toLowerCase()
    return item.synonyms.filter(s =>
      s.toLowerCase().includes(ql) && !item.name.toLowerCase().includes(ql)
    )
  }, [item, query])

  return (
    <div
      onClick={() => setOpen(o => !o)}
      className={`group bg-white rounded-2xl shadow-sm border-2 cursor-pointer transition-all duration-300
        ${open ? `${col.border} shadow-lg ring-1 ${col.border.replace('border-', 'ring-')}` : 'border-slate-50 hover:border-blue-100 hover:shadow-md'}`}
    >
      {/* 카드 상단 영역 */}
      <div className="flex items-start gap-4 p-5">
        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-sm transition-transform duration-300 ${open ? 'scale-110' : 'group-hover:scale-105'} ${col.badge}`}>
          <span className="text-xl leading-none">{item.is_cancer ? '암' : item.type}</span> 
          <span className="text-[10px] font-bold opacity-70">종</span>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div
            className="font-black text-slate-800 text-[17px] leading-tight group-hover:text-blue-700 transition-colors"
            dangerouslySetInnerHTML={{ __html: highlight(item.name, query) }}
          />
          <div className="flex flex-wrap gap-2 mt-2.5">
            {item.kcd_codes.slice(0, 3).map(k => (
              <span key={k} className="text-[11px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-100 font-mono font-bold">{k}</span>
            ))}
            <span className={`text-[11px] px-2.5 py-0.5 rounded-lg font-black shadow-sm ${col.badge}`}>
              {item.is_cancer ? `암수술·${item.type}종` : `${item.type}종 수술`}
            </span>
            {item.is_disputed && (
              <span className="text-[11px] bg-orange-50 text-orange-600 px-2.5 py-0.5 rounded-lg font-black border border-orange-100 animate-pulse">
                ⚠️ 분쟁주의
              </span>
            )}
          </div>
          <div className="mt-2">
            <span className={`text-[11px] px-2.5 py-0.5 rounded-lg font-black border ${
              nSurgeryByCompany.length > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-slate-50 text-slate-400 border-slate-100'
            }`}>
              N대 {nSurgeryByCompany.length > 0 ? `${nSurgeryByCompany.length}개 회사 연결` : '지급회사 없음'}
            </span>
          </div>
          {matchedSyns.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md border border-green-100 flex items-center gap-1">
                <span className="text-xs">🔗</span> 연관: {matchedSyns[0]}
              </span>
            </div>
          )}
        </div>
        <div className={`mt-2 text-slate-300 transition-transform duration-300 ${open ? 'rotate-180 text-blue-500' : ''}`}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
        </div>
      </div>

      {/* 요약 지급액 정보 바 */}
      <div className={`px-5 py-4 transition-all duration-300 ${open ? 'bg-slate-800 text-white' : `${col.bg} border-t border-slate-50`}`}>
        <div className="flex items-end justify-between">
          <div>
            <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${open ? 'text-blue-300' : 'text-slate-400'}`}>
              예상 총 지급 보험금
            </div>
            <div className={`text-3xl font-black tracking-tight ${open ? 'text-yellow-400' : col.text}`}>
              {fmoney(total)}
            </div>
          </div>
          <div className={`text-right text-[11px] font-bold pb-1 ${open ? 'text-slate-400' : 'text-slate-500'}`}>
            {item.type}종 {fmoney(surgPay)}
            {disPay > 0 && <span className={open ? 'text-blue-300' : 'text-blue-600'}> + 질병 {fmoney(disPay)}</span>}
          </div>
        </div>
      </div>

      {/* 확장 상세 정보 패널 */}
      {open && (
        <div className="p-6 bg-white space-y-4 text-[14px] animate-in slide-in-from-top-2 duration-300">
          <div className="flex gap-3">
            <span className="text-xl shrink-0 mt-0.5">📋</span>
            <div className="space-y-1">
              <span className="font-black text-slate-800 block">수술 정의 및 범위</span>
              <p className="text-slate-600 leading-relaxed font-medium">{(item as ExtendedSurgeryItem).desc}</p>
            </div>
          </div>

          {item.notes && (
            <div className="flex gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <span className="text-xl shrink-0">💡</span>
              <div className="space-y-1">
                <span className="font-black text-blue-800 block text-xs">참고 및 안내</span>
                <p className="text-blue-700 text-[13px] leading-relaxed font-medium">{item.notes}</p>
              </div>
            </div>
          )}

          {item.is_cancer && (
            <div className="flex gap-3 bg-red-50/50 p-4 rounded-2xl border border-red-100">
              <span className="text-xl shrink-0">🎗</span>
              <div className="space-y-1 text-red-800 text-[13px] font-bold">
                본 수술은 암 전용 수술비 특약에서 별도로 지급될 수 있습니다.
                <p className="text-[11px] mt-1 font-medium opacity-80">악성 신생물 및 상피내암 분류에 따라 가입금액의 10~100%가 차등 지급됩니다.</p>
              </div>
            </div>
          )}

          <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[1.5rem] p-5 mt-2">
            <div className="text-emerald-800 font-black text-sm mb-3 flex items-center gap-2">
              <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">N</span>
              보험회사별 N대 수술비 연결
            </div>
            {nSurgeryByCompany.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {nSurgeryByCompany.slice(0, 10).map((coverage, i) => (
                  <div key={`${coverage.company}-${coverage.productName}-${coverage.groupName}-${i}`} className="rounded-2xl bg-white/80 border border-emerald-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-black text-emerald-800">{coverage.company}</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{coverage.groupName}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-bold mt-1 leading-relaxed">{coverage.productName}</p>
                    {coverage.diseaseCodes && (
                      <p className="text-[10px] text-slate-400 font-mono mt-1">{coverage.diseaseCodes.join(', ')}</p>
                    )}
                    {coverage.note && (
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{coverage.note}</p>
                    )}
                  </div>
                ))}
                {nSurgeryByCompany.length > 10 && (
                  <div className="rounded-2xl bg-white/70 border border-emerald-100 p-3 text-[11px] font-bold text-emerald-700">
                    외 {nSurgeryByCompany.length - 10}개 연결 항목은 회사별 원자료에서 추가 확인
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-slate-600 font-bold leading-relaxed">
                현재 등록된 회사별 N대 수술비 자료에서는 직접 연결되는 지급회사가 없습니다.
              </p>
            )}
          </div>

          {item.type_by_company && (
            <div className="flex gap-3 pt-2">
              <span className="text-xl shrink-0">🏢</span>
              <div className="space-y-1">
                <span className="font-black text-slate-800 block">보험사별 종 구분</span>
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

          {item.no_pay && item.no_pay.length > 0 && (
            <div className="bg-red-50 border-2 border-red-100 rounded-[1.5rem] p-5 mt-2">
              <div className="text-red-700 font-black text-sm mb-3 flex items-center gap-2">
                <span className="bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">!</span>
                지급 제외 및 부지급 유의사항
              </div>
              <ul className="space-y-2">
                {item.no_pay.map((np, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-red-800 font-bold leading-relaxed">
                    <span className="shrink-0 text-red-400">•</span>
                    <span>{np}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-50">
            {item.sources.map(s => (
              <span key={s} className="text-[10px] bg-slate-50 text-slate-400 px-2 py-1 rounded-md border border-slate-100">데이터 출처: {s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
