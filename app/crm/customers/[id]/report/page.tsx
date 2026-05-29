'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabase'

// ─── 담보 → 행 인덱스 매핑 ──────────────────────────────────────────────────
function findRowIdx(name: string): number {
  const n = name.toLowerCase().replace(/[\s\-_·()/]/g, '')
  const map: { keywords: string[]; idx: number }[] = [
    { idx: 0,  keywords: ['일반사망','사망보험금'] },
    { idx: 1,  keywords: ['질병사망'] },
    { idx: 2,  keywords: ['재해사망','상해사망'] },
    { idx: 4,  keywords: ['유사암','소액암','경계성암','갑상선암','피부암'] },
    { idx: 5,  keywords: ['암수술비','암수술'] },
    { idx: 6,  keywords: ['항암방사선','방사선치료','약물항암','항암치료비'] },
    { idx: 7,  keywords: ['표적항암','표적치료','면역항암'] },
    { idx: 8,  keywords: ['중입자','양성자'] },
    { idx: 9,  keywords: ['암주요치료','암집중치료'] },
    { idx: 3,  keywords: ['일반암','암진단비','암진단','통합암'] },
    { idx: 11, keywords: ['뇌졸중'] },
    { idx: 12, keywords: ['뇌출혈'] },
    { idx: 10, keywords: ['뇌혈관질환','뇌혈관진단'] },
    { idx: 13, keywords: ['급성심근경색','심근경색'] },
    { idx: 14, keywords: ['허혈성심장','허혈성'] },
    { idx: 15, keywords: ['심혈관질환','심장질환진단'] },
    { idx: 16, keywords: ['뇌혈관수술비','뇌수술비'] },
    { idx: 17, keywords: ['심혈관수술비','심장수술비'] },
    { idx: 18, keywords: ['2대주요치료','주요치료비'] },
    { idx: 19, keywords: ['질병후유장해','질병후유'] },
    { idx: 20, keywords: ['상해후유장해','상해후유','재해후유'] },
    { idx: 28, keywords: ['상해입원의료비','상해입원실비'] },
    { idx: 29, keywords: ['상해통원의료비','상해외래'] },
    { idx: 30, keywords: ['질병입원의료비','질병입원실비'] },
    { idx: 31, keywords: ['질병통원의료비','실손의료비','실손'] },
    { idx: 33, keywords: ['질병1~5종','질병5종','1~5종수술'] },
    { idx: 32, keywords: ['질병수술비'] },
    { idx: 35, keywords: ['상해1~5종','상해5종'] },
    { idx: 34, keywords: ['상해수술비'] },
    { idx: 36, keywords: ['n대수술','64대수술','7대수술'] },
    { idx: 37, keywords: ['창상봉합','봉합술'] },
    { idx: 38, keywords: ['질병입원일당','질병입원비'] },
    { idx: 39, keywords: ['상해입원일당','상해입원비'] },
    { idx: 40, keywords: ['교통상해입원','교통입원'] },
    { idx: 41, keywords: ['상해간병','재해간병'] },
    { idx: 42, keywords: ['질병간병'] },
    { idx: 43, keywords: ['교통사고처리지원금','교통사고처리'] },
    { idx: 44, keywords: ['교통사고벌금','벌금'] },
    { idx: 45, keywords: ['변호사선임','법률비용'] },
    { idx: 46, keywords: ['자동차부상','부상치료비'] },
    { idx: 47, keywords: ['임플란트'] },
    { idx: 48, keywords: ['크라운','보철'] },
  ]
  for (const e of map) if (e.keywords.some(kw => n.includes(kw))) return e.idx
  return -1
}
function toManwon(v: number) { return v >= 100000 ? Math.round(v / 10000) : v }

// ─── 준비율 게이지 SVG ──────────────────────────────────────────────────────
function GaugeRing({ pct, size = 90, label, sub }: { pct: number; size?: number; label: string; sub?: string }) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * Math.min(pct, 100) / 100
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
        <text x={size/2} y={size/2 + 5} textAnchor="middle" style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}
          fontSize={13} fontWeight={900} fill={color}>{Math.min(pct, 150)}%</text>
      </svg>
      <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', color: '#374151' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>{sub}</div>}
    </div>
  )
}

// ─── 가로 바 비교 ───────────────────────────────────────────────────────────
function CompareBar({ label, have, recommend, unit = '만원' }: { label: string; have: number; recommend: number; unit?: string }) {
  const pct = recommend > 0 ? Math.min((have / recommend) * 100, 100) : 0
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444'
  const status = have === 0 ? '미가입' : pct >= 100 ? '충분' : pct >= 80 ? '양호' : pct >= 50 ? '보통' : '부족'
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: have > 0 ? color : '#9ca3af' }}>
            {have > 0 ? `${have.toLocaleString()}${unit}` : '미가입'}
          </span>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>/ 권장 {recommend.toLocaleString()}{unit}</span>
          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
            background: pct >= 80 ? '#dcfce7' : pct >= 50 ? '#fef3c7' : '#fee2e2',
            color }}>{status}</span>
        </div>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: 99, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: 8, background: color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────
export default function CustomerReportPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<any>(null)
  const [policies, setPolicies] = useState<any[]>([])
  const [coverages, setCoverages] = useState<any[]>([])
  const [advisorName, setAdvisorName] = useState('')
  const [advisorPhone, setAdvisorPhone] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: ud } = await supabase.from('users').select('name,phone').eq('id', session.user.id).single()
      setAdvisorName(ud?.name || '')
      setAdvisorPhone(ud?.phone || '')
      const [{ data: cust }, { data: pols }, { data: covs }] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.from('policies').select('*').eq('customer_id', id).order('start_date', { ascending: false }),
        supabase.from('coverages').select('*').eq('customer_id', id),
      ])
      setCustomer(cust); setPolicies(pols || []); setCoverages(covs || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'sans-serif' }}>로딩 중...</div>
  if (!customer) return null

  // ── 담보 합계 계산 ──
  const rowTotals: number[] = Array(51).fill(0)
  coverages.forEach((cov: any) => {
    const n = String(cov.name || '').toLowerCase().replace(/[\s\-_·()/]/g, '')
    const ri = findRowIdx(n)
    const amt = toManwon(Number(cov.amount || 0))
    if (ri >= 0 && ri < 51 && amt > 0) rowTotals[ri] += amt
  })

  const today = new Date()
  const todayStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`
  const age = customer.birth_date ? today.getFullYear() - new Date(customer.birth_date).getFullYear() : null
  const totalPremium = policies.reduce((s, p) => s + (Number(p.monthly_premium) || 0), 0)

  // 섹션별 수치
  const cancer   = { general: rowTotals[3], similar: rowTotals[4], surgery: rowTotals[5], chemo: rowTotals[6], targeted: rowTotals[7], key: rowTotals[9] }
  const brain    = { cerebro: rowTotals[10], stroke: rowTotals[11], hemorrhage: rowTotals[12], surgeryB: rowTotals[16], key: rowTotals[18] }
  const heart    = { mi: rowTotals[13], ischemic: rowTotals[14], vascular: rowTotals[15], surgeryH: rowTotals[17] }
  const indemnity= { injuryHosp: rowTotals[28], injuryOut: rowTotals[29], diseaseHosp: rowTotals[30], diseaseOut: rowTotals[31] }
  const surgery  = { disease: rowTotals[32], disease5: rowTotals[33], injury: rowTotals[34], injury5: rowTotals[35], n: rowTotals[36] }
  const hosp     = { disease: rowTotals[38], injury: rowTotals[39] }
  const nursing  = { injuryCare: rowTotals[41], diseaseCare: rowTotals[42] }

  const hasIndemnity = indemnity.injuryHosp > 0 || indemnity.diseaseHosp > 0

  // 보험 만기 타임라인
  const birthYear = customer.birth_date ? new Date(customer.birth_date).getFullYear() : null
  const currentYear = today.getFullYear()

  // 준비율
  const cp = (have: number, std: number) => std > 0 ? Math.round((have / std) * 100) : 0

  return (
    <>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Pretendard Variable', 'Pretendard', sans-serif; background: #f1f5f9; color: #111; }
        .page { width: 297mm; min-height: 210mm; background: #fff; margin: 0 auto 8mm; display: flex; flex-direction: column; position: relative; overflow: hidden; }
        .page-landscape { width: 297mm; min-height: 210mm; }
        @media print {
          body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page { margin: 0; page-break-after: always; box-shadow: none; }
          @page { margin: 0; size: A4 landscape; }
        }
        .print-btn { position: fixed; bottom: 24px; right: 24px; background: #1a2744; color: #fff; border: none;
          border-radius: 14px; padding: 14px 28px; font-size: 14px; font-weight: 800; cursor: pointer;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 999; }
        .cover-left { background: #1e6b7c; width: 45%; min-height: 210mm; padding: 48px 36px; display: flex; flex-direction: column; justify-content: space-between; }
        .cover-right { flex: 1; padding: 48px 40px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .section-badge { display: inline-block; border-radius: 99px; padding: '4px 14px'; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; }
        .cat-page { padding: 28px 36px; flex: 1; }
        .cat-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 14px; border-bottom: 3px solid; }
        .cat-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; }
        .cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex: 1; }
        .info-box { border-radius: 14px; padding: 18px 20px; }
        .coverage-item { display: flex; align-items: center; gap: 8px; padding: '6px 0'; font-size: 12px; }
        .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .tag { display: inline-block; border-radius: 6px; padding: '3px 9px'; font-size: 10px; font-weight: 700; }
        .mini-header { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px; }
        .before-after { display: grid; grid-template-columns: 1fr 36px 1fr; gap: 0; align-items: center; }
        .ba-card { border-radius: 14px; padding: 16px 18px; }
        .ba-item { display: flex; align-items: center; gap: 8px; padding: '5px 0'; font-size: 12px; }
        .arrow-center { font-size: 28px; color: #3b82f6; font-weight: 900; text-align: center; }
      `}</style>

      <button className="no-print print-btn" onClick={() => window.print()}>🖨️ PDF 저장 / 인쇄</button>

      {/* ══ 1. 커버 페이지 ══════════════════════════════════════════════════════ */}
      <div className="page" style={{ flexDirection: 'row' }}>
        <div className="cover-left">
          <div>
            <div style={{ color: '#a8d8df', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>METARICH SIGNAL GROUP</div>
            <div style={{ color: '#fff', fontSize: 36, fontWeight: 900, lineHeight: 1.2, marginBottom: 12 }}>
              보장분석<br />제안서
            </div>
            <div style={{ color: '#a8d8df', fontSize: 14, lineHeight: 1.8, marginTop: 20 }}>
              {customer.name} 고객님의 현재 보장 현황과<br />
              필요 보장을 분석한 맞춤형 제안서입니다.
            </div>
          </div>
          <div>
            <div style={{ color: '#a8d8df', fontSize: 11, marginBottom: 6 }}>작성일 {todayStr}</div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{advisorName} {advisorPhone && `· ${advisorPhone}`}</div>
          </div>
        </div>

        <div className="cover-right">
          {/* MetaRich 로고 텍스트 */}
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#1a2744', letterSpacing: '-0.02em' }}>
              <span style={{ color: '#1e6b7c' }}>Meta</span>Rich
            </div>
            <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.1em', marginTop: 4 }}>SIGNAL GROUP · Choice Architect</div>
          </div>

          {/* 고객 정보 카드 */}
          <div style={{ width: '100%', background: '#f8fafc', borderRadius: 18, padding: '24px 28px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 8 }}>고객 기본 정보</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#1a2744', marginBottom: 16 }}>{customer.name} <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>고객님</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: '나이', value: age ? `${age}세` : '-' },
                { label: '가입 건수', value: `${policies.length}건` },
                { label: '월 납입료', value: totalPremium ? `${Math.round(totalPremium/10000).toLocaleString()}만원` : '-' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#1a2744' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 분석 섹션 안내 */}
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 10 }}>분석 항목</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { icon: '🎗️', label: '암', color: '#fef3c7' },
                { icon: '🧠', label: '뇌·심장', color: '#fee2e2' },
                { icon: '🏥', label: '실손·수술', color: '#dcfce7' },
                { icon: '🛏️', label: '입원·간병', color: '#dbeafe' },
              ].map(s => (
                <div key={s.label} style={{ background: s.color, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20 }}>{s.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 2. 보장 타임라인 페이지 ═════════════════════════════════════════════ */}
      <div className="page" style={{ padding: '32px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, borderBottom: '2px solid #1a2744', paddingBottom: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#1a2744' }}>기간별 보장 현황</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>납입기간 및 만기 타임라인</div>
        </div>

        {/* 타임라인 */}
        {birthYear && policies.length > 0 ? (() => {
          const startYear = currentYear
          const endYear = Math.max(...policies.map(p => p.end_date ? new Date(p.end_date).getFullYear() : birthYear + 100), birthYear + 100)
          const span = endYear - startYear + 2
          const toX = (y: number) => Math.round(((y - startYear) / span) * 100)

          return (
            <div style={{ marginBottom: 28 }}>
              {/* 연도 자 */}
              <div style={{ position: 'relative', height: 30, marginBottom: 8, marginLeft: 120, marginRight: 20 }}>
                {Array.from({ length: Math.floor(span / 5) + 1 }, (_, i) => startYear + i * 5).map(y => (
                  <div key={y} style={{ position: 'absolute', left: `${toX(y)}%`, fontSize: 10, color: '#64748b', transform: 'translateX(-50%)' }}>
                    {y}
                  </div>
                ))}
              </div>

              {/* 정책 막대 */}
              {policies.map((p, i) => {
                const start = p.start_date ? new Date(p.start_date).getFullYear() : currentYear
                const end   = p.end_date   ? new Date(p.end_date).getFullYear()   : birthYear + 100
                const paidEnd = p.payment_period ? (() => {
                  const m = String(p.payment_period).match(/(\d+)년/)
                  return m ? start + parseInt(m[1]) : null
                })() : null
                const colors = ['#1e6b7c','#3b82f6','#16a34a','#d97706','#9333ea','#dc2626','#0891b2','#65a30d']
                const color = colors[i % colors.length]
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 120, fontSize: 11, fontWeight: 600, color: '#374151', textAlign: 'right', flexShrink: 0 }}>
                      {p.company || '보험사'}
                    </div>
                    <div style={{ flex: 1, position: 'relative', height: 20 }}>
                      {/* 보장 바 */}
                      <div style={{
                        position: 'absolute',
                        left: `${toX(Math.max(start, startYear))}%`,
                        width: `${toX(end) - toX(Math.max(start, startYear))}%`,
                        height: 14, top: 3,
                        background: color + '33',
                        border: `2px solid ${color}`,
                        borderRadius: 3,
                      }} />
                      {/* 납입 바 */}
                      {paidEnd && (
                        <div style={{
                          position: 'absolute',
                          left: `${toX(Math.max(start, startYear))}%`,
                          width: `${toX(paidEnd) - toX(Math.max(start, startYear))}%`,
                          height: 14, top: 3,
                          background: color,
                          borderRadius: 3,
                          opacity: 0.7,
                        }} />
                      )}
                      {/* 현재 라인 */}
                      <div style={{ position: 'absolute', left: `${toX(currentYear)}%`, top: 0, width: 2, height: 20, background: '#ef4444', opacity: 0.6 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0, width: 60 }}>
                      ~{p.end_date ? `${new Date(p.end_date).getFullYear()}` : '종신'}
                    </div>
                  </div>
                )
              })}

              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 10, color: '#64748b' }}>
                <span>■ 납입기간 (진한 색)</span>
                <span>□ 보장기간 (연한 색)</span>
                <span style={{ color: '#ef4444' }}>| 현재 ({currentYear}년, {age}세)</span>
              </div>
            </div>
          )
        })() : <div style={{ color: '#94a3b8', fontSize: 13, padding: 20 }}>보험계약 정보가 없습니다.</div>}

        {/* BEFORE / AFTER 요약 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 0, alignItems: 'stretch', marginTop: 12 }}>
          <div style={{ background: '#fef2f2', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#dc2626', marginBottom: 14 }}>BEFORE · 현재 보장 공백</div>
            {[
              { label: '암 진단비', have: cancer.general, std: 3000 },
              { label: '뇌혈관 진단비', have: brain.cerebro || brain.stroke, std: 2000 },
              { label: '심장 진단비', have: heart.mi || heart.ischemic, std: 2000 },
              { label: '질병수술비', have: surgery.disease, std: 500 },
              { label: '질병입원일당', have: hosp.disease, std: 5 },
              { label: '간병지원금', have: nursing.diseaseCare, std: 20 },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.have > 0 ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: 12, flex: 1, color: '#374151' }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: item.have > 0 ? '#16a34a' : '#dc2626' }}>
                  {item.have > 0 ? `${item.have.toLocaleString()}만원` : '없음'}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#3b82f6' }}>
            ≫
          </div>

          <div style={{ background: '#eff6ff', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#1d4ed8', marginBottom: 14 }}>AFTER · 권장 보장 기준</div>
            {[
              { label: '일반암 진단비', std: '3,000만원' },
              { label: '뇌혈관질환 진단비', std: '2,000만원' },
              { label: '심장질환 진단비', std: '2,000만원' },
              { label: '질병수술비', std: '500만원' },
              { label: '질병입원일당', std: '3~5만원/일' },
              { label: '간병지원금', std: '20만원/일' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                <span style={{ fontSize: 12, flex: 1, color: '#374151' }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>{item.std}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ 3. 암 보장 페이지 ═══════════════════════════════════════════════════ */}
      <div className="page" style={{ padding: '28px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, borderBottom: '3px solid #f59e0b', paddingBottom: 12 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🎗️</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#92400e' }}>암 보장 분석</div>
            <div style={{ fontSize: 12, color: '#78350f', marginTop: 2 }}>Cancer Coverage Analysis</div>
          </div>
          <div style={{ marginLeft: 'auto', background: '#fef3c7', borderRadius: 12, padding: '8px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#92400e', fontWeight: 700 }}>암 진단비 준비율</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: cp(cancer.general, 3000) >= 80 ? '#16a34a' : cp(cancer.general, 3000) >= 50 ? '#f59e0b' : '#ef4444' }}>
              {cp(cancer.general, 3000)}%
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* 좌: 지급기준 */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#92400e', letterSpacing: '0.06em', marginBottom: 12 }}>📋 지급기준</div>
            <div style={{ background: '#fffbeb', borderRadius: 14, padding: '16px 18px', marginBottom: 14, fontSize: 12, lineHeight: 1.8, color: '#374151' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>▸ 암 진단비</div>
              조직 검사에서 악성 신생물(암)로 확진 시 1회 지급.<br />
              <span style={{ color: '#92400e', fontWeight: 600 }}>일반암과 유사암(갑상선·피부 등)은 별도 구분.</span>
              <div style={{ fontWeight: 700, marginBottom: 4, marginTop: 10 }}>▸ 항암치료비</div>
              처방받은 항암 치료(방사선·약물) 1회당 지급.<br />
              표적항암은 별도 특약으로 보장.
            </div>

            {/* 암 종류 다이어그램 */}
            <div style={{ background: '#fff7ed', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#92400e', marginBottom: 10 }}>암 진단비 종류</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {/* 큰 원: 일반암 */}
                <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#f59e0b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: '#fff', fontWeight: 800 }}>일반암</div>
                  <div style={{ fontSize: 9, color: '#fef3c7' }}>권장 3,000만원</div>
                </div>
                <div style={{ flex: 1, fontSize: 10, color: '#64748b', padding: '0 10px' }}>
                  일반암 안에<br />유사암 포함<br /><span style={{ color: '#92400e', fontWeight: 600 }}>단, 금액 차이</span>
                </div>
                {/* 중간 원: 유사암 */}
                <div style={{ width: 66, height: 66, borderRadius: '50%', background: '#fcd34d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 9, color: '#92400e', fontWeight: 800 }}>유사암</div>
                  <div style={{ fontSize: 8, color: '#78350f' }}>권장 500만원</div>
                </div>
              </div>
            </div>
          </div>

          {/* 우: 현재 보장 현황 */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#92400e', letterSpacing: '0.06em', marginBottom: 12 }}>📊 현재 보장 현황</div>
            <CompareBar label="일반암 진단비" have={cancer.general} recommend={3000} />
            <CompareBar label="유사암/소액암" have={cancer.similar} recommend={500} />
            <CompareBar label="암수술비" have={cancer.surgery} recommend={300} />
            <CompareBar label="항암치료비 (방사선/약물)" have={cancer.chemo} recommend={300} unit="만원/회" />
            <CompareBar label="표적항암치료비" have={cancer.targeted} recommend={500} />
            <CompareBar label="암주요치료비" have={cancer.key} recommend={1000} />

            {/* 가입 담보 목록 */}
            {coverages.filter(c => {
              const n = (c.name || '').toLowerCase()
              return n.includes('암') || n.includes('항암') || n.includes('표적') || n.includes('중입자')
            }).length > 0 && (
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', marginTop: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>현재 가입 암 관련 담보</div>
                {coverages.filter(c => {
                  const n = (c.name || '').toLowerCase()
                  return n.includes('암') || n.includes('항암') || n.includes('표적') || n.includes('중입자')
                }).slice(0, 5).map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderTop: i > 0 ? '1px solid #f1f5f9' : undefined }}>
                    <span style={{ color: '#374151' }}>{c.name}</span>
                    <span style={{ fontWeight: 700, color: '#92400e' }}>{toManwon(Number(c.amount||0)).toLocaleString()}만원</span>
                  </div>
                ))}
              </div>
            )}

            {/* 추천 */}
            <div style={{ background: '#fef3c7', borderRadius: 12, padding: '12px 14px', marginTop: 12, border: '1px solid #fcd34d' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#92400e', marginBottom: 6 }}>💡 추천 보장</div>
              {cancer.general < 3000 && <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>• 일반암 진단비 {(3000 - cancer.general).toLocaleString()}만원 추가 필요</div>}
              {cancer.chemo === 0 && <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>• 항암치료비 특약 미가입 → 300만원/회 이상 권장</div>}
              {cancer.targeted === 0 && <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>• 표적항암치료 특약 신설 검토 (최신 치료비 급증)</div>}
              {cancer.general >= 3000 && cancer.chemo >= 300 && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✓ 암 보장 양호</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 4. 뇌·심장 보장 페이지 ═════════════════════════════════════════════ */}
      <div className="page" style={{ padding: '28px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, borderBottom: '3px solid #ef4444', paddingBottom: 12 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🧠</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#991b1b' }}>뇌 · 심장 보장 분석</div>
            <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }}>Brain & Heart Coverage Analysis</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            <div style={{ background: '#fee2e2', borderRadius: 12, padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#991b1b', fontWeight: 700 }}>뇌혈관 준비율</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: cp(brain.cerebro||brain.stroke, 2000) >= 80 ? '#16a34a' : '#ef4444' }}>
                {cp(brain.cerebro||brain.stroke, 2000)}%
              </div>
            </div>
            <div style={{ background: '#fce7f3', borderRadius: 12, padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#9d174d', fontWeight: 700 }}>심장 준비율</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: cp(heart.mi||heart.ischemic, 2000) >= 80 ? '#16a34a' : '#ef4444' }}>
                {cp(heart.mi||heart.ischemic, 2000)}%
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* 좌: 지급기준 */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#991b1b', letterSpacing: '0.06em', marginBottom: 12 }}>📋 지급기준</div>
            {/* 뇌 다이어그램 */}
            <div style={{ background: '#fff1f2', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#991b1b', marginBottom: 10 }}>뇌혈관질환 범위</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, background: '#ef4444', borderRadius: 10, padding: '10px 12px', color: '#fff' }}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>뇌혈관질환</div>
                  <div style={{ fontSize: 10, marginTop: 4, opacity: 0.85 }}>뇌졸중·뇌출혈·<br />기타 뇌혈관질환</div>
                </div>
                <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', padding: '0 4px' }}>⊃</div>
                <div style={{ background: '#fca5a5', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7f1d1d' }}>뇌졸중</div>
                  <div style={{ fontSize: 9, color: '#991b1b' }}>허혈성+출혈성</div>
                </div>
                <div style={{ fontSize: 10, color: '#64748b', padding: '0 2px' }}>⊃</div>
                <div style={{ background: '#fecaca', borderRadius: 10, padding: '10px 10px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#7f1d1d' }}>뇌출혈</div>
                </div>
              </div>
            </div>
            <div style={{ background: '#fff1f2', borderRadius: 14, padding: '14px 16px', fontSize: 12, lineHeight: 1.8, color: '#374151' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>▸ 뇌혈관질환 진단비</div>
              MRI·MRA 영상 검사로 뇌혈관 이상 확인 시 지급.<br />
              <span style={{ color: '#991b1b', fontWeight: 600 }}>뇌혈관질환 &gt; 뇌졸중 &gt; 뇌출혈 순으로 범위 좁아짐.</span>
              <div style={{ fontWeight: 700, marginTop: 10, marginBottom: 4 }}>▸ 심장질환 진단비</div>
              심전도·혈액 효소 검사로 급성 심근경색 확진 시 지급.<br />
              허혈성심장질환은 협심증도 포함.
            </div>
          </div>

          {/* 우: 현재 보장 */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#991b1b', letterSpacing: '0.06em', marginBottom: 12 }}>📊 현재 보장 현황</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>뇌혈관 보장</div>
            <CompareBar label="뇌혈관질환 진단비" have={brain.cerebro} recommend={2000} />
            <CompareBar label="뇌졸중 진단비" have={brain.stroke} recommend={2000} />
            <CompareBar label="뇌출혈 진단비" have={brain.hemorrhage} recommend={1000} />
            <CompareBar label="뇌혈관수술비" have={brain.surgeryB} recommend={500} />
            <CompareBar label="2대주요치료비" have={brain.key} recommend={1000} />

            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, marginTop: 14 }}>심장 보장</div>
            <CompareBar label="급성심근경색 진단비" have={heart.mi} recommend={2000} />
            <CompareBar label="허혈성심장질환 진단비" have={heart.ischemic} recommend={2000} />
            <CompareBar label="심혈관수술비" have={heart.surgeryH} recommend={500} />

            {/* 추천 */}
            <div style={{ background: '#fee2e2', borderRadius: 12, padding: '12px 14px', marginTop: 14, border: '1px solid #fca5a5' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#991b1b', marginBottom: 6 }}>💡 추천 보장</div>
              {(brain.cerebro + brain.stroke) < 2000 && <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>• 뇌혈관질환 진단비 2,000만원 이상 확보 권장</div>}
              {(heart.mi + heart.ischemic) < 2000 && <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>• 심장질환 진단비 2,000만원 이상 확보 권장</div>}
              {brain.key < 1000 && <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>• 뇌·심장 집중치료비 특약 신설 검토</div>}
              {(brain.cerebro + brain.stroke) >= 2000 && (heart.mi + heart.ischemic) >= 2000 && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✓ 뇌·심장 보장 양호</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 5. 실손·수술 보장 페이지 ════════════════════════════════════════════ */}
      <div className="page" style={{ padding: '28px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, borderBottom: '3px solid #16a34a', paddingBottom: 12 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🏥</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#14532d' }}>실손의료비 · 수술 보장 분석</div>
            <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>Indemnity & Surgery Coverage Analysis</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* 실손 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#14532d', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              실손의료비
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                background: hasIndemnity ? '#dcfce7' : '#fee2e2',
                color: hasIndemnity ? '#16a34a' : '#dc2626' }}>
                {hasIndemnity ? '가입 ✓' : '미가입 ✗'}
              </span>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '14px 16px', marginBottom: 14, fontSize: 12, lineHeight: 1.8, color: '#374151' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>▸ 지급기준</div>
              병의원 진료 시 본인이 실제로 부담한 의료비를 청구.<br />
              입원·통원·처방 모두 포함.<br />
              <span style={{ color: '#166534', fontWeight: 600 }}>세대가 높을수록 자기부담금↑, 보장범위 좁아짐.</span>
            </div>
            {hasIndemnity ? (
              <div style={{ background: '#dcfce7', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 8 }}>가입 실손 현황</div>
                {coverages.filter(c => (c.name||'').includes('실손') || (c.name||'').includes('의료비')).slice(0,4).map((c,i) => (
                  <div key={i} style={{ fontSize: 11, padding: '3px 0', color: '#374151' }}>• {c.name}</div>
                ))}
              </div>
            ) : (
              <div style={{ background: '#fef2f2', borderRadius: 12, padding: '14px 16px', border: '1px solid #fca5a5' }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#dc2626', marginBottom: 6 }}>⚠️ 실손 미가입</div>
                <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.7 }}>
                  실손의료비는 의료비 전반을 보장하는 기본 보험입니다.<br />
                  <strong>가입 시 의료비 부담을 크게 줄일 수 있습니다.</strong>
                </div>
              </div>
            )}
          </div>

          {/* 수술비 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#14532d', marginBottom: 12 }}>수술비 보장</div>
            <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '14px 16px', marginBottom: 14, fontSize: 12, lineHeight: 1.8, color: '#374151' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>▸ 지급기준</div>
              수술 시행 시 1회당 지급 (종류에 따라 1~5종 분류).<br />
              <span style={{ color: '#166534', fontWeight: 600 }}>실손과 별개로 정액 수령 가능 — 비급여 수술 시 중요.</span>
            </div>
            <CompareBar label="질병수술비" have={surgery.disease} recommend={500} />
            <CompareBar label="질병 1~5종 수술비" have={surgery.disease5} recommend={500} />
            <CompareBar label="상해수술비" have={surgery.injury} recommend={500} />
            <CompareBar label="상해 1~5종 수술비" have={surgery.injury5} recommend={500} />
            <CompareBar label="N대 수술비" have={surgery.n} recommend={500} />

            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '12px 14px', marginTop: 12, border: '1px solid #86efac' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#14532d', marginBottom: 6 }}>💡 추천 보장</div>
              {surgery.disease < 500 && <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>• 질병수술비 500만원 이상 확보 권장</div>}
              {surgery.injury < 500 && <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>• 상해수술비 500만원 이상 확보 권장</div>}
              {!hasIndemnity && <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 3, fontWeight: 700 }}>• 실손의료비 우선 가입 필수</div>}
              {surgery.disease >= 500 && surgery.injury >= 500 && hasIndemnity && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✓ 의료·수술 보장 양호</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 6. 입원·간병 보장 페이지 ════════════════════════════════════════════ */}
      <div className="page" style={{ padding: '28px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, borderBottom: '3px solid #3b82f6', paddingBottom: 12 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🛏️</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#1e3a8a' }}>입원·간병 보장 분석</div>
            <div style={{ fontSize: 12, color: '#1d4ed8', marginTop: 2 }}>Hospitalization & Nursing Coverage Analysis</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* 입원일당 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1e3a8a', marginBottom: 12 }}>입원일당 보장</div>
            <div style={{ background: '#eff6ff', borderRadius: 14, padding: '14px 16px', marginBottom: 14, fontSize: 12, lineHeight: 1.8, color: '#374151' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>▸ 지급기준</div>
              병원 입원 1일당 정액 지급 (입원 1일차부터).<br />
              실손과 별개로 수령 가능.<br />
              <span style={{ color: '#1d4ed8', fontWeight: 600 }}>입원 기간 × 일당 = 총 수령액</span>

              {/* 예시 계산 */}
              <div style={{ background: '#dbeafe', borderRadius: 10, padding: '10px 12px', marginTop: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4, color: '#1e3a8a' }}>📝 예시 (14일 입원 시)</div>
                <div style={{ fontSize: 11 }}>
                  일당 3만원 × 14일 = <strong>42만원</strong><br />
                  일당 5만원 × 14일 = <strong>70만원</strong>
                </div>
              </div>
            </div>
            <CompareBar label="질병 입원일당" have={hosp.disease} recommend={5} unit="만원/일" />
            <CompareBar label="상해 입원일당" have={hosp.injury} recommend={5} unit="만원/일" />
          </div>

          {/* 간병 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#1e3a8a', marginBottom: 12 }}>간병·재가 보장</div>
            <div style={{ background: '#eff6ff', borderRadius: 14, padding: '14px 16px', marginBottom: 14, fontSize: 12, lineHeight: 1.8, color: '#374151' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>▸ 지급기준</div>
              장기요양등급 인정 후 간병 서비스 이용 시 지급.<br />
              요양병원 입원 시에도 별도 지원.<br />
              <span style={{ color: '#1d4ed8', fontWeight: 600 }}>노후 의료비의 핵심 — 준비가 가장 부족한 영역.</span>

              {/* 간병 필요성 */}
              <div style={{ background: '#dbeafe', borderRadius: 10, padding: '10px 12px', marginTop: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4, color: '#1e3a8a' }}>📊 통계</div>
                <div style={{ fontSize: 11 }}>
                  평균 간병 기간: <strong>약 9년</strong><br />
                  요양병원 비용: <strong>월 150~250만원</strong><br />
                  간병인 비용: <strong>1일 10~15만원</strong>
                </div>
              </div>
            </div>
            <CompareBar label="상해간병지원금" have={nursing.injuryCare} recommend={20} unit="만원/일" />
            <CompareBar label="질병간병지원금" have={nursing.diseaseCare} recommend={20} unit="만원/일" />

            <div style={{ background: '#eff6ff', borderRadius: 12, padding: '12px 14px', marginTop: 14, border: '1px solid #93c5fd' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#1e3a8a', marginBottom: 6 }}>💡 추천 보장</div>
              {hosp.disease < 3 && <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>• 질병입원일당 최소 3만원/일 확보 권장</div>}
              {nursing.diseaseCare < 20 && <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>• 간병지원금 20만원/일 이상 준비 권장</div>}
              {nursing.diseaseCare === 0 && <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginBottom: 3 }}>• 간병보험 미가입 — 노후 준비 핵심 항목</div>}
              {hosp.disease >= 3 && nursing.diseaseCare >= 20 && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✓ 입원·간병 보장 양호</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 7. 종합 요약 페이지 ═════════════════════════════════════════════════ */}
      <div className="page" style={{ padding: '28px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, borderBottom: '3px solid #1a2744', paddingBottom: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#1a2744' }}>종합 보장 준비율 요약</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{todayStr} 기준 · {customer.name} 고객</div>
        </div>

        {/* 게이지 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, marginBottom: 24 }}>
          <GaugeRing pct={cp(cancer.general, 3000)} label="암 진단비" sub="권장 3,000만" />
          <GaugeRing pct={cp(brain.cerebro||brain.stroke, 2000)} label="뇌혈관" sub="권장 2,000만" />
          <GaugeRing pct={cp(heart.mi||heart.ischemic, 2000)} label="심장질환" sub="권장 2,000만" />
          <GaugeRing pct={hasIndemnity ? 100 : 0} label="실손의료비" sub="가입여부" />
          <GaugeRing pct={cp(surgery.disease, 500)} label="수술비" sub="권장 500만" />
          <GaugeRing pct={cp(hosp.disease, 5)} label="입원일당" sub="권장 5만/일" />
          <GaugeRing pct={cp(nursing.diseaseCare, 20)} label="간병지원금" sub="권장 20만/일" />
        </div>

        {/* 계약 현황 테이블 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#1a2744', marginBottom: 10 }}>현재 보험계약 현황</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#1a2744', color: '#fff' }}>
                {['보험사', '상품명', '납입기간', '만기', '월 보험료'].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policies.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{p.company}</td>
                  <td style={{ padding: '6px 10px', color: '#475569' }}>{p.product_name}</td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>{p.payment_period || '-'}</td>
                  <td style={{ padding: '6px 10px', color: '#64748b' }}>{p.end_date ? p.end_date.slice(0,7) : '종신'}</td>
                  <td style={{ padding: '6px 10px', fontWeight: 700, color: '#1a2744' }}>{p.monthly_premium ? `${Number(p.monthly_premium).toLocaleString()}원` : '-'}</td>
                </tr>
              ))}
              <tr style={{ background: '#1a2744', color: '#fff' }}>
                <td colSpan={4} style={{ padding: '7px 10px', fontWeight: 700 }}>합계</td>
                <td style={{ padding: '7px 10px', fontWeight: 900, color: '#fbbf24' }}>{totalPremium.toLocaleString()}원</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 담당 설계사 */}
        <div style={{ background: '#1a2744', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#c9a96e', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>METARICH SIGNAL GROUP</div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 900 }}>담당 설계사: {advisorName}</div>
            {advisorPhone && <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{advisorPhone}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.7, maxWidth: 280 }}>
              본 자료는 현재 등록된 보험계약 정보 기반으로 작성되었습니다.<br />
              실제 보험금 지급은 각 보험사 약관에 따라 다를 수 있습니다.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
