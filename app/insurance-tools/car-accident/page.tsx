'use client'

import { useState, useMemo } from 'react'
import { CAR_ACCIDENT_DB, GRADE_SUMMARY } from '../../../lib/insurance/car-accident-db'

// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
const GRADE_COLORS: Record<number, { badge: string; bar: string; text: string }> = {
  1:  { badge: 'bg-red-700 text-white',      bar: 'bg-red-700',    text: 'text-red-700' },
  2:  { badge: 'bg-red-600 text-white',      bar: 'bg-red-600',    text: 'text-red-600' },
  3:  { badge: 'bg-red-500 text-white',      bar: 'bg-red-500',    text: 'text-red-500' },
  4:  { badge: 'bg-orange-600 text-white',   bar: 'bg-orange-600', text: 'text-orange-600' },
  5:  { badge: 'bg-orange-500 text-white',   bar: 'bg-orange-500', text: 'text-orange-500' },
  6:  { badge: 'bg-amber-500 text-white',    bar: 'bg-amber-500',  text: 'text-amber-600' },
  7:  { badge: 'bg-yellow-500 text-slate-800', bar: 'bg-yellow-500', text: 'text-yellow-600' },
  8:  { badge: 'bg-yellow-400 text-slate-800', bar: 'bg-yellow-400', text: 'text-yellow-600' },
  9:  { badge: 'bg-lime-500 text-white',     bar: 'bg-lime-500',   text: 'text-lime-600' },
  10: { badge: 'bg-green-500 text-white',    bar: 'bg-green-500',  text: 'text-green-600' },
  11: { badge: 'bg-teal-500 text-white',     bar: 'bg-teal-500',   text: 'text-teal-600' },
  12: { badge: 'bg-cyan-500 text-white',     bar: 'bg-cyan-500',   text: 'text-cyan-600' },
  13: { badge: 'bg-blue-400 text-white',     bar: 'bg-blue-400',   text: 'text-blue-500' },
  14: { badge: 'bg-slate-400 text-white',    bar: 'bg-slate-400',  text: 'text-slate-500' },
}

type BenefitPlanId = 'flat1to7' | 'a1to3' | 'a4to14' | 'flat1to11'

const BENEFIT_PLANS: {
  id: BenefitPlanId
  label: string
  defaultAmount: number
  summary: string
  note: string
}[] = [
  {
    id: 'flat1to7',
    label: '1~7급 정액형',
    defaultAmount: 100,
    summary: '가입금액 1백만원 기준, 1~7급은 가입금액 지급',
    note: '상해등급 1~7급: 가입금액 지급 / 8~14급: 미지급',
  },
  {
    id: 'a1to3',
    label: 'A형 1~3급',
    defaultAmount: 1500,
    summary: '가입금액 1,500만원 기준, 1급 5,000만원 · 2급 2,500만원 · 3급 1,500만원',
    note: '가입금액 기준 배율 적용: 1급 3.33배 / 2급 1.67배 / 3급 1배',
  },
  {
    id: 'a4to14',
    label: 'A형 4~14급',
    defaultAmount: 900,
    summary: '가입금액 900만원 기준, 4급 900만원 · 5급 450만원 · 6급 240만원 · 7급 120만원',
    note: '8~11급 60만원, 12~14급 30만원 기준으로 비례 계산',
  },
  {
    id: 'flat1to11',
    label: '1~11급 정액형',
    defaultAmount: 5,
    summary: '가입금액 5만원 기준, 1~11급은 가입금액 지급',
    note: '상해등급 1~11급: 가입금액 지급 / 12~14급: 미지급',
  },
]

function fmoney(v: number): string {
  if (v === 0) return '미가입'
  if (v >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억원`
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}천만원`
  return `${v.toLocaleString()}만원`
}

function getBenefitAmount(plan: BenefitPlanId, amount: number, grade: number): number {
  if (amount <= 0) return 0

  switch (plan) {
    case 'flat1to7':
      return grade >= 1 && grade <= 7 ? amount : 0
    case 'a1to3':
      if (grade === 1) return Math.round((amount * 5000) / 1500)
      if (grade === 2) return Math.round((amount * 2500) / 1500)
      if (grade === 3) return amount
      return 0
    case 'a4to14':
      if (grade === 4) return amount
      if (grade === 5) return Math.round((amount * 450) / 900)
      if (grade === 6) return Math.round((amount * 240) / 900)
      if (grade === 7) return Math.round((amount * 120) / 900)
      if (grade >= 8 && grade <= 11) return Math.round((amount * 60) / 900)
      if (grade >= 12 && grade <= 14) return Math.round((amount * 30) / 900)
      return 0
    case 'flat1to11':
      return grade >= 1 && grade <= 11 ? amount : 0
  }
}

function shortMoney(v: number): string {
  if (v === 0) return '-'
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}천`
  return `${v.toLocaleString()}`
}

// ─────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────
export default function CarAccidentPage() {
  const [query, setQuery]       = useState('')
  const [selectedGrade, setGrade] = useState<number | null>(null)
  const [benefitPlan, setBenefitPlan] = useState<BenefitPlanId>('a4to14')
  const [amount, setAmount]     = useState<number>(900) // 자동차부상 보험금 기준금액
  const currentPlan = BENEFIT_PLANS.find(plan => plan.id === benefitPlan) ?? BENEFIT_PLANS[0]

  const filtered = useMemo(() => {
    // 1순위: 특정 급수 선택 시
    if (selectedGrade !== null) {
      return CAR_ACCIDENT_DB.filter(d => d.grade === selectedGrade)
    }
    // 2순위: 검색어 입력 시
    if (query) {
      const ql = query.toLowerCase()
      return CAR_ACCIDENT_DB.filter(d =>
        d.description.toLowerCase().includes(ql) ||
        d.examples.some((e: string) => e.toLowerCase().includes(ql)) ||
        String(d.grade).includes(ql) ||
        (d.notes?.toLowerCase().includes(ql) ?? false)
      )
    }
    // 3순위: 전체 목록
    return CAR_ACCIDENT_DB
  }, [query, selectedGrade])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-slate-50 to-orange-50 pb-20">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-amber-800 to-orange-700 text-white px-6 py-6 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <span>🚗</span> 자동차사고 부상등급 검색기
            </h1>
            <p className="text-xs text-amber-200 mt-1 font-medium">자배법 시행령 기준 · 1~14급 상해내용 및 예상 지급금액 확인</p>
          </div>
          <button onClick={() => window.close()} className="rounded-xl bg-white/10 px-4 py-3 text-[12px] font-black text-white hover:bg-white/20">
            창 닫기
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ① 검색 + 급수 선택 섹션 */}
        <div className="bg-white rounded-3xl shadow-sm p-6 border border-amber-100">
          <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <span className="w-1 h-3 bg-amber-600 rounded-full"></span>
            SEARCH & FILTER
          </p>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setGrade(null) }}
            placeholder="예) 골절 / 뇌손상 / 척추 / 절단 / 인대 파열..."
            className="w-full border-2 border-slate-100 focus:border-amber-400 rounded-2xl px-5 py-4 text-base outline-none bg-slate-50 focus:bg-white mb-4 transition-all font-bold"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setGrade(null); setQuery('') }}
              className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition-all
                ${selectedGrade === null && !query ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'border-slate-100 text-slate-500 hover:border-amber-200'}`}
            >
              전체보기
            </button>
            {Array.from({ length: 14 }, (_, i) => i + 1).map(g => {
              const col = GRADE_COLORS[g]
              return (
                <button
                  key={g}
                  onClick={() => { setGrade(g); setQuery('') }}
                  className={`w-11 h-9 rounded-xl text-xs font-black border-2 transition-all
                    ${selectedGrade === g
                      ? col.badge + ' border-transparent shadow-md scale-110'
                      : 'border-slate-100 text-slate-500 hover:border-amber-200'}`}
                >
                  {g}급
                </button>
              )
            })}
          </div>
        </div>

        {/* ② 보험금 설정 섹션 */}
        <div className="bg-white rounded-3xl shadow-sm p-6 border border-amber-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <p className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1 h-3 bg-amber-600 rounded-full"></span>
              CALCULATE BENEFITS
            </p>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-[11px] font-black text-slate-500">가입금액</span>
              <div className="relative flex items-center border-2 border-slate-100 focus-within:border-amber-400 rounded-2xl overflow-hidden bg-slate-50 focus-within:bg-white w-full sm:w-48 transition-all">
                <input
                  type="number"
                  min={0}
                  step={benefitPlan === 'flat1to11' ? 1 : 100}
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value) || 0)}
                  className="w-full text-right pr-10 pl-4 py-3 text-base font-black bg-transparent outline-none"
                />
                <span className="absolute right-3 text-xs font-bold text-slate-400">만원</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
            {BENEFIT_PLANS.map(plan => (
              <button
                key={plan.id}
                onClick={() => {
                  setBenefitPlan(plan.id)
                  setAmount(plan.defaultAmount)
                }}
                className={`text-left rounded-2xl border-2 p-3 transition-all ${
                  benefitPlan === plan.id
                    ? 'border-amber-500 bg-amber-50 shadow-sm'
                    : 'border-slate-100 bg-slate-50 hover:border-amber-200'
                }`}
              >
                <div className="text-xs font-black text-slate-800">{plan.label}</div>
                <div className="text-[10px] text-slate-500 font-bold mt-1 leading-snug">{plan.summary}</div>
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {Array.from({ length: 14 }, (_, i) => i + 1).map(g => {
              const col = GRADE_COLORS[g]
              const pay = getBenefitAmount(benefitPlan, amount, g)
              return (
                <div
                  key={g}
                  onClick={() => { setGrade(g); setQuery('') }}
                  className={`text-center cursor-pointer rounded-2xl p-2.5 border-2 transition-all group
                    ${selectedGrade === g ? 'bg-amber-50 border-amber-400' : 'bg-slate-50 border-slate-50 hover:border-amber-200'}`}
                >
                  <div className={`text-[10px] font-black mb-0.5 group-hover:scale-110 transition-transform ${col.text}`}>{g}급</div>
                  <div className="text-[11px] text-slate-700 font-black tracking-tighter">
                    {shortMoney(pay)}{pay > 0 ? '만' : ''}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-4 text-center leading-relaxed">
            ※ {currentPlan.label}: {currentPlan.note}
          </p>
        </div>

        {/* ③ 결과 섹션 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <p className="text-sm font-black text-slate-700 flex items-center gap-2">
              {selectedGrade !== null ? (
                <span><span className="text-amber-600">{selectedGrade}급</span> 상세 상해내용</span>
              ) : query ? (
                <span><span className="text-amber-600">"{query}"</span> 검색 결과</span>
              ) : (
                <span>전체 상해 등급 목록</span>
              )}
              <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-lg font-bold">{filtered.length}건</span>
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl py-20 text-center border-2 border-dashed border-slate-200">
              <div className="text-5xl mb-4 opacity-20">🔍</div>
              <p className="text-slate-400 font-bold">매칭되는 상해 내용이 없습니다.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map(item => {
                const col = GRADE_COLORS[item.grade]
                const pay = getBenefitAmount(benefitPlan, amount, item.grade)
                return (
                  <CarGradeCard key={item.grade} item={item} col={col} pay={pay} query={query} amount={amount} />
                )
              })}
            </div>
          )}

          {/* 하단 정보 섹션 */}
          <div className="mt-8 space-y-3">
            <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-5 text-xs text-amber-900 leading-relaxed shadow-sm">
              <p className="font-black mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                <span className="text-base">📌</span> 부상등급 병급 및 적용 규칙
              </p>
              <ul className="space-y-1.5 ml-1">
                <li className="flex gap-2">
                  <span className="shrink-0">•</span>
                  <span><strong>등급 상향(병급):</strong> 2급~11급 중 2가지 이상 중복 시, 가장 높은 등급이 하위 3개 등급 이내 중복이면 1등급 상향.</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0">•</span>
                  <span><strong>골절 규칙:</strong> 개방성 골절(거스틸로 2형 이상)은 1등급 상향, 보존적 치료 시 수술 등급에서 2등급 하향 적용.</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0">•</span>
                  <span><strong>소아 특례:</strong> 만 13세 미만 어린이가 동일 부위 골절 시 1급 하향 적용 (성장판 손상은 예외).</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-100 border-2 border-slate-200 rounded-2xl p-5 text-[10px] text-slate-500 font-medium italic">
              ⚠️ 본 도구는 KB 금쪽같은 별표9 및 자동차손해배상보장법 시행령을 근거로 제작되었습니다. 사고 시 실제 보상 등급은 약관 및 손해사정 결과에 따라 달라질 수 있으므로 반드시 약관을 다시 참조하시기 바랍니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 등급 상세 카드 컴포넌트
// ─────────────────────────────────────────────────────────
function CarGradeCard({
  item, col, pay, query, amount
}: {
  item: typeof CAR_ACCIDENT_DB[0]
  col: { badge: string; bar: string; text: string }
  pay: number
  query: string
  amount: number
}) {
  const [open, setOpen] = useState(false)

  const highlight = (text: string, q: string) => {
    if (!q) return text
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-200 rounded px-0.5 font-bold">$1</mark>')
  }

  const matchedExamples = useMemo(() => {
    if (!query) return item.examples
    const ql = query.toLowerCase()
    return item.examples.filter((e: string) => e.toLowerCase().includes(ql))
  }, [item.examples, query])

  // 검색 시에는 전체 결과를 보여주고, 평소에는 요약/전체 토글
  const displayExamples = query ? matchedExamples : (open ? item.examples : item.examples.slice(0, 3))

  return (
    <div
      onClick={() => setOpen(o => !o)}
      className={`bg-white rounded-3xl shadow-sm border-2 cursor-pointer transition-all duration-300
        ${open ? 'border-amber-400 shadow-md scale-[1.01]' : 'border-slate-50 hover:border-amber-200'}`}
    >
      {/* 카드 상단 헤더 */}
      <div className="flex items-center gap-5 p-5">
        <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-inner ${col.badge}`}>
          <span className="text-3xl leading-none tracking-tighter">{item.grade}</span>
          <span className="text-[10px] opacity-80 mt-0.5">GRADE</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-slate-800 text-base leading-tight mb-1 truncate">
            {item.description}
          </div>
          <div className="text-[11px] text-slate-400 font-bold truncate">
            {GRADE_SUMMARY[item.grade]}
          </div>
          {amount > 0 && (
            <div className={`text-sm font-black mt-1.5 flex items-center gap-1.5 ${col.text}`}>
              <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-current opacity-80 font-bold">지급액</span>
              {fmoney(pay)}
            </div>
          )}
        </div>
        <div className={`text-slate-300 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>

      {/* 상해 내용 리스트 영역 */}
      <div className={`p-5 pt-0 transition-all ${open ? 'opacity-100' : 'opacity-90'}`}>
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-wider flex justify-between items-center">
            <span>Injury Details ({item.examples.length})</span>
            {query && <span className="text-amber-600">Match: {matchedExamples.length}</span>}
          </p>
          <ul className="space-y-2.5">
            {displayExamples.map((ex: string, i: number) => (
              <li key={i} className="flex gap-3 text-xs text-slate-700 leading-snug items-start">
                <span className={`shrink-0 w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-white mt-0.5 shadow-sm ${col.bar}`}>
                  {i + 1}
                </span>
                <span 
                  className="font-medium pt-0.5"
                  dangerouslySetInnerHTML={{ __html: highlight(ex, query) }} 
                />
              </li>
            ))}
          </ul>
          
          {!open && !query && item.examples.length > 3 && (
            <div className="mt-4 pt-3 border-t border-slate-200 text-center">
              <span className="text-[11px] text-amber-600 font-black flex items-center justify-center gap-1">
                + {item.examples.length - 3}개 내용 더 보기 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </span>
            </div>
          )}
        </div>

        {item.notes && open && (
          <div className="mt-4 bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex gap-2">
              <span className="text-base shrink-0">💡</span>
              <p className="text-[11px] text-amber-900 font-bold leading-relaxed">{item.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
