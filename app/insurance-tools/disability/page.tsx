'use client'

import { useState, useMemo } from 'react'
import {
  DISABILITY_DB, BODY_PART_LABELS, DISABILITY_SYNONYMS,
} from '../../../lib/insurance/disability-db'
import type { DisabilityItem, DisabilityBodyPart } from '../../../lib/insurance/types'

// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
const BODY_PARTS: { key: DisabilityBodyPart | 'all'; label: string; icon: string }[] = [
  { key: 'all',        label: '전체',           icon: '🔍' },
  { key: 'eye',        label: '눈',             icon: '👁' },
  { key: 'ear',        label: '귀',             icon: '👂' },
  { key: 'nose',       label: '코',             icon: '👃' },
  { key: 'jaw',        label: '씹기·말하기',    icon: '🦷' },
  { key: 'appearance', label: '외모 추상',       icon: '🪞' },
  { key: 'spine',      label: '척추',           icon: '🦴' },
  { key: 'trunk',      label: '체간골',         icon: '🫁' },
  { key: 'arm',        label: '팔',             icon: '💪' },
  { key: 'leg',        label: '다리',           icon: '🦵' },
  { key: 'finger',     label: '손가락',         icon: '🖐' },
  { key: 'toe',        label: '발가락',         icon: '🦶' },
  { key: 'organ',      label: '흉복부·비뇨생식', icon: '🫀' },
  { key: 'neuro',      label: '신경계·정신',    icon: '🧠' },
]

const RATE_COLORS: (rate: number) => { badge: string; pay: string } = (rate) => {
  if (rate >= 80) return { badge: 'bg-red-100 text-red-700',     pay: 'text-red-600' }
  if (rate >= 50) return { badge: 'bg-orange-100 text-orange-700', pay: 'text-orange-600' }
  if (rate >= 20) return { badge: 'bg-yellow-100 text-yellow-700', pay: 'text-yellow-700' }
  if (rate >= 10) return { badge: 'bg-blue-100 text-blue-700',   pay: 'text-blue-600' }
  return { badge: 'bg-slate-100 text-slate-600', pay: 'text-slate-600' }
}

// ─────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────
function fmoney(v: number): string {
  if (v === 0) return '미가입'
  if (v >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억원`
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}천만원`
  return `${v.toLocaleString()}만원`
}

function calcPay(rate: number, amount100: number): number {
  return Math.round(amount100 * rate / 100)
}

function matchDisability(item: DisabilityItem, q: string): boolean {
  const ql = q.toLowerCase()
  const bodyLabel = BODY_PART_LABELS[item.body_part] ?? ''
  const syns = DISABILITY_SYNONYMS[item.body_part] ?? []
  return (
    item.condition.toLowerCase().includes(ql) ||
    bodyLabel.toLowerCase().includes(ql) ||
    syns.some(s => s.toLowerCase().includes(ql)) ||
    (item.judgment_criteria?.toLowerCase().includes(ql) ?? false)
  )
}

function highlight(text: string, q: string): string {
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>')
}

// ─────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────
export default function DisabilityPage() {
  const [query, setQuery]     = useState('')
  const [bodyPart, setBodyPart] = useState<DisabilityBodyPart | 'all'>('all')
  const [amount100, setAmount100] = useState<number>(5000) // 100% 기준 보험금

  const filtered = useMemo(() => {
    return DISABILITY_DB.filter(item => {
      const partOk = bodyPart === 'all' || item.body_part === bodyPart
      const textOk = !query || matchDisability(item, query)
      return partOk && textOk
    }).sort((a, b) => b.rate - a.rate) // 높은 장해율 우선
  }, [query, bodyPart])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-indigo-800 to-purple-800 text-white px-6 py-5">
        <div className="max-w-4xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">🦴 후유장해율 계산기</h1>
            <p className="text-sm text-indigo-200 mt-0.5">KB 금쪽같은 별표1 · 장해분류표 기준 · 13개 신체부위 전체</p>
          </div>
          <button onClick={() => window.close()} className="rounded-xl bg-white/10 px-4 py-3 text-[12px] font-black text-white hover:bg-white/20">
            창 닫기
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* ① 검색 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">🔍 장해 검색</p>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="예) 한 눈 실명 / 척추 / 팔 절단 / 청력 / 마비..."
            className="w-full border-2 border-slate-200 focus:border-indigo-400 rounded-xl px-4 py-3 text-base outline-none bg-slate-50 focus:bg-white mb-3 transition"
          />
          {/* 신체부위 탭 */}
          <div className="flex flex-wrap gap-1.5">
            {BODY_PARTS.map(p => (
              <button
                key={p.key}
                onClick={() => setBodyPart(p.key as DisabilityBodyPart | 'all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition
                  ${bodyPart === p.key
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ② 보험금 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">💰 후유장해 보험금 입력 (100% 기준)</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center border-2 border-slate-200 focus-within:border-indigo-400 rounded-xl overflow-hidden bg-slate-50 focus-within:bg-white w-48 transition">
              <input
                type="number"
                min={0}
                value={amount100}
                onChange={e => setAmount100(Number(e.target.value) || 0)}
                className="flex-1 text-right px-3 py-3 text-base font-bold bg-transparent outline-none"
              />
              <span className="pr-3 text-sm text-slate-400 font-medium shrink-0">만원</span>
            </div>
            <div className="text-sm text-slate-500">
              장해율에 따라 <strong className="text-indigo-600">비례 지급</strong>
            </div>
          </div>
          {/* 빠른 배율 참고 */}
          <div className="flex flex-wrap gap-2 mt-3">
            {[3, 10, 20, 50, 80, 100].map(rate => (
              <div key={rate} className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="text-slate-500">{rate}%:</span>{' '}
                <strong className="text-indigo-700">{fmoney(calcPay(rate, amount100))}</strong>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">* 일반상해 3~100% / 80% 이상 / 50% 이상 등 가입 특약에 따라 지급 기준이 달라집니다</p>
        </div>

        {/* ③ 결과 */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-sm font-bold text-slate-600">
              {query
                ? `"${query}" 검색 결과`
                : bodyPart !== 'all'
                  ? `${BODY_PART_LABELS[bodyPart]} 장해 목록`
                  : '전체 장해 목록'
              }
              <span className="ml-2 text-indigo-500">{filtered.length}건</span>
            </p>
            <span className="text-xs text-slate-400">장해율 높은 순 정렬</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm">검색 결과가 없습니다.<br />다른 검색어나 신체부위를 선택해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(item => {
                const col = RATE_COLORS(item.rate)
                const pay = calcPay(item.rate, amount100)
                return (
                  <DisabilityCard
                    key={item.id}
                    item={item}
                    pay={pay}
                    col={col}
                    query={query}
                  />
                )
              })}
            </div>
          )}

          {/* 총칙 안내 */}
          <div className="mt-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 text-xs text-indigo-800 space-y-1">
            <p className="font-bold">📌 장해 평가 총칙</p>
            <p>• 하나의 장해가 2개 이상 신체부위에 해당되면 <strong>높은 지급률</strong> 적용</p>
            <p>• 동일 신체부위에 2가지 이상 장해 발생 시 합산하지 않고 <strong>높은 지급률</strong> 적용</p>
            <p>• 한시적 장해(5년 이상)는 해당 장해지급률의 <strong>20%</strong> 적용</p>
            <p>• 영구적 장해: 치유 후 장래 회복 가망이 없는 상태로 의학적으로 인정</p>
          </div>

          <div className="mt-3 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-xs text-amber-800">
            ⚠️ 이 내용은 예시이며 해당 상품의 <strong>증권과 약관을 다시 참조</strong>하시길 바랍니다.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 장해 카드
// ─────────────────────────────────────────────────────────
function DisabilityCard({
  item, pay, col, query
}: {
  item: DisabilityItem
  pay: number
  col: { badge: string; pay: string }
  query: string
}) {
  const [open, setOpen] = useState(false)
  const bodyLabel = BODY_PART_LABELS[item.body_part] ?? ''

  return (
    <div
      onClick={() => setOpen(o => !o)}
      className={`bg-white rounded-xl shadow-sm border-2 cursor-pointer transition hover:shadow-md
        ${open ? 'border-indigo-300' : 'border-slate-100 hover:border-indigo-200'}`}
    >
      <div className="flex items-center gap-3 p-4">
        {/* 장해율 */}
        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-black shrink-0 ${col.badge}`}>
          <span className="text-xl leading-none">{item.rate}</span>
          <span className="text-xs opacity-80">%</span>
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="font-semibold text-slate-800 text-sm leading-snug"
            dangerouslySetInnerHTML={{ __html: highlight(item.condition, query) }}
          />
          <div className="flex gap-1.5 mt-1 flex-wrap">
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{bodyLabel}</span>
            <span className={`text-xs font-bold ${col.pay}`}>
              {pay > 0 ? `예상 ${pay.toLocaleString()}만원` : '보험금 미입력'}
            </span>
          </div>
        </div>

        <div className="text-slate-300 text-sm shrink-0">{open ? '▲' : '▼'}</div>
      </div>

      {open && item.judgment_criteria && (
        <div className="px-4 pb-4 pt-0">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            <p className="text-xs font-bold text-indigo-700 mb-1">📋 판정기준</p>
            <p className="text-xs text-indigo-800 leading-relaxed">{item.judgment_criteria}</p>
          </div>
          {item.notes && (
            <p className="text-xs text-slate-500 mt-2 px-1">💡 {item.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}
