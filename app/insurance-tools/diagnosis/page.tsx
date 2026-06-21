'use client'

import { useState, useMemo } from 'react'
import {
  DIAGNOSIS_DB, 
  DIAGNOSIS_CATEGORY_LABELS,
  KCD_NAME_MAP, 
  getKcdCategory,
} from '../../../lib/insurance/diagnosis-db'
import type { DiagnosisItem } from '../../../lib/insurance/types'

// ─────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────
interface DiagAmounts {
  cancer: number        // 일반암 진단비
  similar: number       // 유사암 진단비
  brain: number         // 뇌혈관질환 진단비
  heart: number         // 허혈성심장질환 진단비
  brainStroke: number   // 뇌졸중(출혈+경색) 진단비
  mi: number            // 급성심근경색 진단비
}

const DEFAULT_AMOUNTS: DiagAmounts = {
  cancer: 3000,
  similar: 500,
  brain: 1000,
  heart: 1000,
  brainStroke: 2000,
  mi: 2000,
}

const CATEGORY_TABS = [
  { key: 'all',            label: '전체' },
  { key: 'cancer',         label: '🎗 일반암' },
  { key: 'cancer_similar', label: '🔵 유사암' },
  { key: 'cancer_thyroid', label: '갑상선암' },
  { key: 'cancer_skin',    label: '기타피부암' },
  { key: 'brain',          label: '🧠 뇌혈관' },
  { key: 'heart',          label: '❤️ 심장' },
]

const CAT_COLORS: Record<string, { badge: string; border: string; text: string }> = {
  cancer:         { badge: 'bg-red-100 text-red-700',     border: 'border-red-300',    text: 'text-red-700' },
  cancer_similar: { badge: 'bg-blue-100 text-blue-700',   border: 'border-blue-300',   text: 'text-blue-700' },
  cancer_thyroid: { badge: 'bg-purple-100 text-purple-700', border: 'border-purple-300', text: 'text-purple-700' },
  cancer_skin:    { badge: 'bg-orange-100 text-orange-700', border: 'border-orange-300', text: 'text-orange-700' },
  brain:          { badge: 'bg-indigo-100 text-indigo-700', border: 'border-indigo-300', text: 'text-indigo-700' },
  heart:          { badge: 'bg-pink-100 text-pink-700',    border: 'border-pink-300',   text: 'text-pink-700' },
  other:          { badge: 'bg-slate-100 text-slate-600',  border: 'border-slate-300',  text: 'text-slate-600' },
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

function calcDiagPay(item: DiagnosisItem, amounts: DiagAmounts): { label: string; amount: number }[] {
  const results: { label: string; amount: number }[] = []
  const cat = item.category
  const sub = item.sub_type ?? ''

  if (cat === 'cancer') {
    results.push({ label: '일반암 진단비', amount: amounts.cancer })
  } else if (cat === 'cancer_thyroid') {
    results.push({ label: '갑상선암(유사암) 진단비', amount: Math.round(amounts.cancer * 0.2) })
    results.push({ label: '유사암 진단비', amount: amounts.similar })
  } else if (cat === 'cancer_skin') {
    results.push({ label: '기타피부암(유사암) 진단비', amount: Math.round(amounts.cancer * 0.2) })
    results.push({ label: '유사암 진단비', amount: amounts.similar })
  } else if (cat === 'cancer_similar') {
    results.push({ label: '유사암 진단비', amount: amounts.similar })
    if (sub.includes('DCIS') || item.kcd_code === 'D05') {
      results.push({ label: '유방관상피내암(DCIS) — 별도 확인', amount: 0 })
    }
  } else if (cat === 'brain') {
    results.push({ label: '뇌혈관질환 진단비', amount: amounts.brain })
    const strokeCodes = ['I60','I61','I62','I63','I64','I65','I66']
    if (strokeCodes.some(code => item.kcd_code.startsWith(code))) {
      results.push({ label: '뇌졸중 진단비', amount: amounts.brainStroke })
      if (['I60','I61','I62'].some(code => item.kcd_code.startsWith(code))) {
        results.push({ label: '뇌출혈 진단비', amount: 0 })
      }
    }
  } else if (cat === 'heart') {
    results.push({ label: '허혈성심장질환 진단비', amount: amounts.heart })
    if (['I21','I22','I23'].some(code => item.kcd_code.startsWith(code))) {
      results.push({ label: '급성심근경색 진단비', amount: amounts.mi })
    }
  }

  return results
}

function highlight(text: string, q: string): string {
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>')
}

function matchDiag(item: DiagnosisItem, q: string): boolean {
  const ql = q.toLowerCase()
  return (
    item.kcd_code.toLowerCase().includes(ql) ||
    item.kcd_name.toLowerCase().includes(ql) ||
    (item.sub_type?.toLowerCase().includes(ql) ?? false) ||
    (item.notes?.toLowerCase().includes(ql) ?? false) ||
    (KCD_NAME_MAP[item.kcd_code]?.toLowerCase().includes(ql) ?? false)
  )
}

// ─────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────
export default function DiagnosisPage() {
  const [query, setQuery]   = useState('')
  const [category, setCat]  = useState('all')
  const [amounts, setAmounts] = useState<DiagAmounts>(DEFAULT_AMOUNTS)

  const filtered = useMemo(() => {
    return DIAGNOSIS_DB.filter(item => {
      const catOk = category === 'all' || item.category === category
      const textOk = !query || matchDiag(item, query)
      return catOk && textOk
    })
  }, [query, category])

  const handleQuery = (val: string) => {
    setQuery(val)
    if (val.length >= 2) {
      const detectedCat = getKcdCategory(val.trim())
      if (detectedCat !== 'other') setCat(detectedCat)
    }
    if (!val) setCat('all')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-slate-50 to-pink-50">
      <div className="bg-gradient-to-r from-red-800 to-rose-700 text-white px-6 py-5 shadow-lg">
        <div className="max-w-4xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">🎗 진단비 검색기</h1>
            <p className="text-sm text-red-200 mt-0.5 font-medium">KCD 코드 · 질병명 입력 → 보장 분류 및 예상 진단비 확인</p>
          </div>
          <button onClick={() => window.close()} className="rounded-xl bg-white/10 px-4 py-3 text-[12px] font-black text-white hover:bg-white/20">
            창 닫기
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* ① 검색 섹션 */}
        <div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-100">
          <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <span className="w-1 h-3 bg-red-600 rounded-full"></span>
            SEARCH CONDITION
          </p>
          <input
            value={query}
            onChange={e => handleQuery(e.target.value)}
            placeholder="예) C16 / 위암 / 유방암 / 뇌경색 / I21 / 급성심근경색..."
            className="w-full border-2 border-slate-100 focus:border-red-400 rounded-2xl px-5 py-4 text-base outline-none bg-slate-50 focus:bg-white mb-4 transition-all font-bold placeholder:font-normal"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORY_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setCat(t.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all
                  ${category === t.key
                    ? 'bg-red-600 text-white border-red-600 shadow-md scale-105'
                    : 'border-slate-100 text-slate-500 hover:border-red-200 hover:text-red-600 hover:bg-red-50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ② 가입금액 입력 섹션 */}
        <div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-100">
          <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <span className="w-1 h-3 bg-red-600 rounded-full"></span>
            INSURANCE AMOUNT
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { key: 'cancer',      label: '일반암 진단비',      color: 'text-red-600' },
              { key: 'similar',     label: '유사암 진단비',       color: 'text-blue-600' },
              { key: 'brain',       label: '뇌혈관질환 진단비',   color: 'text-indigo-600' },
              { key: 'heart',       label: '허혈성심장 진단비',   color: 'text-pink-600' },
              { key: 'brainStroke', label: '뇌졸중 진단비',       color: 'text-violet-600' },
              { key: 'mi',          label: '급성심근경색 진단비', color: 'text-rose-600' },
            ].map(({ key, label, color }) => (
              <div key={key} className="space-y-1.5">
                <label className={`block text-[10px] font-black ml-1 ${color}`}>{label}</label>
                <div className="relative flex items-center border-2 border-slate-100 rounded-2xl overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-red-300 transition-all">
                  <input
                    type="number"
                    min={0}
                    value={amounts[key as keyof DiagAmounts]}
                    onChange={e => setAmounts(prev => ({ ...prev, [key]: Number(e.target.value) || 0 }))}
                    className="w-full text-right pr-9 pl-3 py-3 text-sm font-black bg-transparent outline-none"
                  />
                  <span className="absolute right-3 text-[10px] font-bold text-slate-400 pointer-events-none">만</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-medium">
            * 유사암(갑상선·기타피부암)은 통상 일반암 가입금액의 20%로 자동 계산되나, 상품에 따라 다를 수 있습니다.
          </p>
        </div>

        {/* ③ 결과 리스트 섹션 */}
        <div className="space-y-3 pb-10">
          <div className="flex items-center justify-between mb-4 px-2">
            <p className="text-sm font-black text-slate-700">
              {query ? (
                <span><span className="text-red-600">"{query}"</span> 검색 결과</span>
              ) : (
                <span>{DIAGNOSIS_CATEGORY_LABELS[category] ?? '전체'} 목록</span>
              )}
              <span className="ml-2 text-red-500 font-bold">{filtered.length}건</span>
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-3xl py-20 text-center border-2 border-dashed border-slate-200">
              <div className="text-5xl mb-4 opacity-20">🔍</div>
              <p className="text-slate-400 font-bold">검색 결과가 없습니다.<br /><span className="text-xs font-normal">KCD 코드나 질병명을 다시 확인해 보세요.</span></p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map(item => (
                <DiagCard key={item.id} item={item} amounts={amounts} query={query} />
              ))}
            </div>
          )}

          <div className="mt-8 bg-amber-50 border-2 border-amber-100 rounded-2xl p-5 text-xs text-amber-800 leading-relaxed shadow-sm">
            <p className="font-bold mb-1.5 flex items-center gap-1.5">
              <span className="text-base">⚠️</span> 안내사항
            </p>
            본 시뮬레이션 결과는 이해를 돕기 위한 예시이며, 실제 지급 여부와 금액은 가입하신 보험 상품의 <strong>증권과 약관</strong>에 따라 결정됩니다. 반드시 담당 설계사나 보험사를 통해 재확인하시기 바랍니다.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// 진단비 카드 컴포넌트
// ─────────────────────────────────────────────────────────
function DiagCard({ item, amounts, query }: { item: DiagnosisItem; amounts: DiagAmounts; query: string }) {
  const [open, setOpen] = useState(false)
  const col = CAT_COLORS[item.category] ?? CAT_COLORS.other
  const payouts = calcDiagPay(item, amounts)
  const totalPay = payouts.reduce((sum, p) => sum + p.amount, 0)
  const isSimlar = item.category.startsWith('cancer_similar') || item.category === 'cancer_thyroid' || item.category === 'cancer_skin'

  return (
    <div
      onClick={() => setOpen(o => !o)}
      className={`bg-white rounded-2xl shadow-sm border-2 cursor-pointer transition-all duration-300
        ${open ? col.border + ' shadow-md' : 'border-slate-50 hover:border-red-200'}`}
    >
      {/* 카드 상단: 기본 정보 */}
      <div className="flex items-center gap-4 p-5">
        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 text-center shadow-inner ${col.badge}`}>
          <span className="text-[10px] leading-none mb-0.5 opacity-60">KCD</span>
          <span className="text-xs font-mono font-black leading-tight tracking-tighter">{item.kcd_code}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-black text-slate-800 text-base leading-snug truncate"
            dangerouslySetInnerHTML={{ __html: highlight(item.kcd_name, query) }}
          />
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black border ${col.badge} ${col.border}`}>
              {item.sub_type ?? DIAGNOSIS_CATEGORY_LABELS[item.category]}
            </span>
            {isSimlar && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg font-black border border-amber-200">
                ⚠️ 유사암
              </span>
            )}
          </div>
        </div>
        <div className={`text-slate-300 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>

      {/* 지급액 바: 하이라이트 영역 */}
      <div className={`px-5 py-3.5 bg-gradient-to-r transition-all duration-300 ${open ? 'from-slate-800 to-red-900' : 'from-slate-50 to-slate-100'}`}>
        <div className={`text-[10px] font-bold mb-0.5 ${open ? 'text-red-200' : 'text-slate-400'}`}>예상 진단비 합계</div>
        <div className={`text-2xl font-black tracking-tighter ${open ? 'text-yellow-400' : 'text-slate-700'}`}>
          {fmoney(totalPay)}
        </div>
        {open && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 border-t border-white/10 pt-2">
            {payouts.map((p, i) => (
              <span key={i} className="text-[11px] text-red-100 font-medium">
                {p.label}: <strong className="text-white font-black">{fmoney(p.amount)}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 상세 섹션: 펼쳐졌을 때만 표시 */}
      {open && (
        <div className="p-5 space-y-4 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          {item.notes && (
            <div className="bg-slate-50 rounded-xl p-3 flex gap-2.5">
              <span className="shrink-0">💡</span>
              <span className="text-slate-600 text-xs leading-relaxed font-medium">{item.notes}</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-black text-slate-700 text-xs">
                <span className="text-lg">📄</span> 필요 서류
              </div>
              <ul className="space-y-1 ml-6">
                {item.required_docs.map((d, i) => (
                  <li key={i} className="text-slate-500 text-[11px] list-disc leading-snug">{d}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-black text-slate-700 text-xs">
                <span className="text-lg">🔬</span> 필수 검사
              </div>
              <ul className="space-y-1 ml-6">
                {item.required_tests.map((t, i) => (
                  <li key={i} className="text-slate-500 text-[11px] list-disc leading-snug">{t}</li>
                ))}
              </ul>
            </div>
          </div>

          {isSimlar && (
            <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4">
              <p className="text-[11px] font-black text-amber-800 mb-1 flex items-center gap-1">
                📌 유사암 보험금 지급 안내
              </p>
              <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                유사암은 일반암 진단비의 10~20% 수준으로 지급되는 것이 일반적입니다. (갑상선암, 기타피부암, 제자리암, 경계성종양 등) 
                상품에 따라 일반암으로 분류되거나 별도의 복층 보장이 가능할 수 있으니 증권을 확인하세요.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
