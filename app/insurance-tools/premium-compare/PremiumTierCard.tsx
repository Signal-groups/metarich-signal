'use client'

import { useState } from 'react'

// ── 보장금액 기준 (최소 / 표준 / 여유) ──────────────────────────────────────
const PRESETS = {
  min: {
    cancer: 2000, brain: 1000, heart: 1000, surgery: 100,
    nursing: 15, silson: false,
  },
  standard: {
    cancer: 3500, brain: 2500, heart: 2000, surgery: 200,
    nursing: 20, silson: true,
  },
  comfort: {
    cancer: 5000, brain: 3000, heart: 3000, surgery: 500,
    nursing: 30, silson: true,
  },
}

// ── 40대 기준 보험료율 (원/월 per 만원 담보) ────────────────────────────────
const RATE = {
  cancer:  7.40,
  brain:   5.00,
  heart:   6.00,
  surgery: 0.80,
  nursing: 250,
}
const SILSON_FLAT = { min: 0, standard: 15_000, comfort: 25_000 }

// ── 나이대 배수 ──────────────────────────────────────────────────────────────
type AgeGroup = '40대' | '50대' | '60대'
const AGE_MULT: Record<AgeGroup, number> = { '40대': 1.0, '50대': 1.6, '60대': 2.35 }
const COMPANY_GAP: Record<AgeGroup, number> = { '40대': 50_000, '50대': 70_000, '60대': 100_000 }

function calcPremium(tier: 'min' | 'standard' | 'comfort'): number {
  const p = PRESETS[tier]
  return Math.round(
    p.cancer * RATE.cancer +
    p.brain  * RATE.brain  +
    p.heart  * RATE.heart  +
    p.surgery * RATE.surgery +
    p.nursing * RATE.nursing +
    (p.silson ? SILSON_FLAT[tier] : 0)
  )
}

function fmtWon(won: number) {
  if (won >= 10_000) return `${Math.round(won / 10_000).toLocaleString()}만원`
  return `${won.toLocaleString()}원`
}

// ── 고지별 보험료 차이 모달 ──────────────────────────────────────────────────
const DISCLOSURE_ROWS = [
  { type: '건강고지형',  sub: '일반플랜',  tag: 'best',     codes: ['A플랜','B플랜','C플랜','D플랜'], desc: '건강 고지 가능자 — 가장 유리한 보험 가입',             step: null,      color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
  { type: '표준형',      sub: '',          tag: 'standard',  codes: ['표준형'],                        desc: '일반적으로 제안받는 표준 플랜',                      step: '+10~15%', color: '#1a2744', bg: '#f0f4ff', border: '#c7d2fe' },
  { type: '경증간편형',  sub: '',          tag: 'light',     codes: ['간편A'],                         desc: '경미한 병력 있는 경우 — 유병자 중 가장 저렴',        step: '+10~15%', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  { type: '유병자보험',  sub: '간편심사',  tag: 'sub',       codes: ['간편B','간편C','간편D'],         desc: '기존 병력·질환 있는 경우',                           step: '+10~15%', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { type: '초간편',      sub: '',          tag: 'worst',     codes: ['초간편'],                        desc: '심각한 병력 또는 다수 질환 — 가장 높은 보험료',      step: '+10~15%', color: '#dc2626', bg: '#fff1f2', border: '#fecdd3' },
]

function DisclosureModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={onClose}>
      <div style={{ background:'#fff',borderRadius:16,width:'100%',maxWidth:680,boxShadow:'0 24px 80px rgba(0,0,0,0.28)',overflow:'hidden',maxHeight:'90vh',display:'flex',flexDirection:'column' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:'linear-gradient(135deg,#1a2744 0%,#2d4a8a 100%)',padding:'20px 24px',display:'flex',alignItems:'flex-start',justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:11,fontWeight:700,color:'#c9a96e',letterSpacing:'0.08em',marginBottom:6 }}>STEP 4 · 문제인식 및 선택기준 제시</div>
            <div style={{ fontSize:20,fontWeight:900,color:'#fff',marginBottom:4 }}>상황별 상품별 보험료 차이</div>
            <div style={{ fontSize:12,color:'#93c5fd' }}>가입한 보험 · 가입할 보험의 기준을 제시합니다</div>
          </div>
          <button type="button" onClick={onClose} style={{ background:'rgba(255,255,255,0.1)',border:'none',borderRadius:8,color:'#94a3b8',fontSize:18,cursor:'pointer',padding:'4px 10px',lineHeight:1 }}>✕</button>
        </div>
        <div style={{ overflowY:'auto',padding:'20px 24px',flex:1 }}>
          <div style={{ display:'flex',gap:16 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'grid',gridTemplateColumns:'120px 1fr',gap:8,marginBottom:8,borderBottom:'2px solid #1a2744',paddingBottom:8 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#1a2744' }}>유형</div>
                <div style={{ fontSize:11,fontWeight:700,color:'#1a2744' }}>설명</div>
              </div>
              {DISCLOSURE_ROWS.map((row,idx) => (
                <div key={row.tag}>
                  {row.step && (
                    <div style={{ display:'flex',alignItems:'center',gap:6,margin:'4px 0' }}>
                      <div style={{ flex:1,height:1,background:'#e2e8f0' }} />
                      <span style={{ fontSize:10,fontWeight:700,color:'#64748b',background:'#f1f5f9',padding:'2px 8px',borderRadius:10 }}>{row.step}</span>
                      <div style={{ flex:1,height:1,background:'#e2e8f0' }} />
                    </div>
                  )}
                  <div style={{ display:'grid',gridTemplateColumns:'120px 1fr',gap:8,padding:'10px 12px',background:row.bg,border:`1px solid ${row.border}`,borderRadius:10,marginBottom:4 }}>
                    <div>
                      <div style={{ fontSize:13,fontWeight:800,color:row.color }}>{row.type}</div>
                      {row.sub && <div style={{ fontSize:10,color:row.color,opacity:0.7,marginTop:2 }}>({row.sub})</div>}
                      <div style={{ display:'flex',flexWrap:'wrap',gap:3,marginTop:5 }}>
                        {row.codes.map(c=>(
                          <span key={c} style={{ fontSize:9,padding:'1px 6px',background:row.color,color:'#fff',borderRadius:4,fontWeight:700,opacity:0.85 }}>{c}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize:12,color:'#334155',lineHeight:1.6,alignSelf:'center' }}>
                      {idx===0 && <span style={{ background:'#1e40af',color:'#fff',fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:4,marginRight:6 }}>최저 보험료</span>}
                      {idx===DISCLOSURE_ROWS.length-1 && <span style={{ background:'#dc2626',color:'#fff',fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:4,marginRight:6 }}>최고 보험료</span>}
                      {row.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ width:80,display:'flex',flexDirection:'column',alignItems:'center',paddingTop:28 }}>
              <div style={{ background:'#1e40af',color:'#fff',borderRadius:10,padding:'8px 10px',fontSize:11,fontWeight:800,textAlign:'center',width:'100%' }}>보험료<br/>－</div>
              <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 0' }}>
                <div style={{ width:3,flex:1,background:'linear-gradient(to bottom,#3b82f6,#dc2626)',borderRadius:2 }} />
                <div style={{ fontSize:9,color:'#64748b',textAlign:'center',margin:'6px 0',lineHeight:1.5 }}>단계별<br/>10~15%<br/>차이</div>
                <div style={{ width:3,flex:1,background:'linear-gradient(to bottom,#3b82f6,#dc2626)',borderRadius:2 }} />
              </div>
              <div style={{ background:'#dc2626',color:'#fff',borderRadius:10,padding:'8px 10px',fontSize:11,fontWeight:800,textAlign:'center',width:'100%' }}>보험료<br/>＋</div>
            </div>
          </div>
        </div>
        <div style={{ borderTop:'1px solid #e2e8f0',padding:'14px 24px',background:'#fafaf8',fontSize:12,color:'#475569',lineHeight:1.6 }}>
          <b style={{ color:'#1a2744' }}>핵심 메시지</b> — 상품 수백 개 중 단 한 개를 고르는 기준입니다. 저는 단순히 상품만 들이미는 사람이 아닙니다.{' '}
          <b style={{ color:'#c9a96e' }}>정확하게 진단하고, 최적의 설계 및 추천</b>을 해드립니다.
        </div>
      </div>
    </div>
  )
}

// ── 개선된 반원 게이지 SVG ────────────────────────────────────────────────────
function GaugeSVG({ pct, minP, stdP, comP, mult }: {
  pct: number
  minP: number
  stdP: number
  comP: number
  mult: number
}) {
  const W = 300, H = 165
  const cx = W / 2, cy = H - 10
  const Ro = 118, Ri = 76     // 두꺼운 링 (42px)
  const R_label = Ro + 20     // 외부 라벨 반경

  function pt(f: number, r: number) {
    const a = Math.PI * (1 - f)
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
  }

  function arc(f1: number, f2: number, fill: string, id: string) {
    const o1 = pt(f1, Ro), o2 = pt(f2, Ro)
    const i1 = pt(f1, Ri), i2 = pt(f2, Ri)
    const lg = f2 - f1 > 0.5 ? 1 : 0
    const d = `M${o1.x.toFixed(1)} ${o1.y.toFixed(1)} A${Ro} ${Ro} 0 ${lg} 0 ${o2.x.toFixed(1)} ${o2.y.toFixed(1)} L${i2.x.toFixed(1)} ${i2.y.toFixed(1)} A${Ri} ${Ri} 0 ${lg} 1 ${i1.x.toFixed(1)} ${i1.y.toFixed(1)}Z`
    return <path key={id} d={d} fill={fill} />
  }

  // 존 경계 (0.34, 0.66)에서 표준 범위 (최소 0.34 ~ 여유 0.66)
  const ZONES = [
    { f1: 0,    f2: 0.34, fill: '#3b82f6', label: '최소', lf: 0.17 },
    { f1: 0.34, f2: 0.66, fill: '#10b981', label: '표준', lf: 0.50 },
    { f1: 0.66, f2: 1.00, fill: '#c9a96e', label: '여유', lf: 0.83 },
  ]

  // 현재 바늘 위치
  const c   = Math.max(0.03, Math.min(0.97, pct))
  const tip = pt(c, Ro - 6)
  const hub = pt(c, Ri + 8)

  // 표준 위치 마커
  const stdF   = (stdP - minP) / (comP - minP)
  const stdPos = pt(Math.max(0.03, Math.min(0.97, stdF)), (Ro + Ri) / 2)

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        {/* 그림자 필터 */}
        <filter id="needleShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* ① 배경 링 (회색) */}
      {arc(0, 1, 'rgba(255,255,255,0.08)', 'bg')}

      {/* ② 컬러 존 */}
      {ZONES.map(z => arc(z.f1, z.f2, z.fill, z.label))}

      {/* ③ 존 경계 틱 마크 */}
      {[0, 0.34, 0.66, 1].map(f => {
        const a = pt(f, Ro + 6)
        const b = pt(f, Ri - 6)
        return <line key={f} x1={a.x.toFixed(1)} y1={a.y.toFixed(1)} x2={b.x.toFixed(1)} y2={b.y.toFixed(1)} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
      })}

      {/* ④ 외부 존 라벨 */}
      {ZONES.map(z => {
        const p = pt(z.lf, R_label)
        return (
          <text key={z.label} x={p.x.toFixed(1)} y={(p.y + 4).toFixed(1)}
            textAnchor="middle" fill="rgba(255,255,255,0.95)"
            fontSize={11} fontWeight="800" fontFamily="sans-serif">
            {z.label}
          </text>
        )
      })}

      {/* ⑤ 표준 위치 점선 마커 */}
      <circle cx={stdPos.x.toFixed(1)} cy={stdPos.y.toFixed(1)} r={5}
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} strokeDasharray="2,2" />

      {/* ⑥ 바늘 */}
      <line
        x1={cx} y1={cy}
        x2={tip.x.toFixed(1)} y2={tip.y.toFixed(1)}
        stroke="white" strokeWidth={3.5} strokeLinecap="round"
        filter="url(#needleShadow)"
      />
      <line
        x1={cx} y1={cy}
        x2={hub.x.toFixed(1)} y2={hub.y.toFixed(1)}
        stroke="rgba(255,255,255,0.2)" strokeWidth={7} strokeLinecap="round"
      />

      {/* ⑦ 바늘 현재값 도트 (호 위) */}
      {(() => {
        const dot = pt(c, (Ro + Ri) / 2)
        return (
          <circle cx={dot.x.toFixed(1)} cy={dot.y.toFixed(1)} r={6}
            fill="white" stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
        )
      })()}

      {/* ⑧ 중심 허브 */}
      <circle cx={cx} cy={cy} r={11} fill="#0f1e3d" stroke="white" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={5}  fill="white" />
    </svg>
  )
}

// ── 주요 담보 비교 ─────────────────────────────────────────────────────────
const COMPARE_ITEMS = [
  { label: '암진단비', minV: PRESETS.min.cancer,   comV: PRESETS.comfort.cancer,   rate: RATE.cancer },
  { label: '뇌혈관',   minV: PRESETS.min.brain,    comV: PRESETS.comfort.brain,    rate: RATE.brain  },
  { label: '심장질환', minV: PRESETS.min.heart,    comV: PRESETS.comfort.heart,    rate: RATE.heart  },
  { label: '수술비',   minV: PRESETS.min.surgery,  comV: PRESETS.comfort.surgery,  rate: RATE.surgery },
]

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────
export default function PremiumTierCard() {
  const [ageGroup,      setAgeGroup]      = useState<AgeGroup>('40대')
  const [showDisclosure, setShowDisclosure] = useState(false)

  const mult = AGE_MULT[ageGroup]
  const gap  = COMPANY_GAP[ageGroup]

  const R = (n: number) => Math.round(n / 10_000) * 10_000

  const baseMin = calcPremium('min')
  const baseStd = calcPremium('standard')
  const baseCom = calcPremium('comfort')
  const minP = Math.round(baseMin * mult)
  const stdP = Math.round(baseStd * mult)
  const comP = Math.round(baseCom * mult)

  const companyLow  = Math.round(stdP - gap / 2)
  const companyHigh = Math.round(stdP + gap / 2)

  const gaugePct = (stdP - minP) / (comP - minP)  // 항상 표준 위치 표시
  const diff     = comP - minP
  const diffPct  = Math.round((comP / minP - 1) * 100)

  const total20min = minP * 12 * 20
  const total20com = comP * 12 * 20

  return (
    <>
      {showDisclosure && <DisclosureModal onClose={() => setShowDisclosure(false)} />}

      <div style={{ borderRadius:16, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.13)', marginBottom:20 }}>

        {/* ① 헤더 + 나이대 탭 */}
        <div style={{ background:'#0f1e3d', padding:'12px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:11, color:'#93c5fd', fontWeight:700, letterSpacing:'0.04em' }}>
            보험료 비교 기준 · 교차설계
          </div>
          <div style={{ display:'flex', gap:2 }}>
            {(['40대','50대','60대'] as AgeGroup[]).map(ag => (
              <button key={ag} type="button" onClick={() => setAgeGroup(ag)} style={{
                padding:'5px 14px', borderRadius:'8px 8px 0 0', border:'none',
                background: ageGroup===ag ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: ageGroup===ag ? '#fff' : '#64748b',
                fontSize:12, fontWeight:700, cursor:'pointer',
                borderBottom: ageGroup===ag ? '2px solid #c9a96e' : '2px solid transparent',
              }}>{ag}</button>
            ))}
          </div>
        </div>

        {/* ② 게이지 패널 */}
        <div style={{ background:'linear-gradient(160deg,#0f1e3d 0%,#1a2744 60%,#1e3a6e 100%)', padding:'16px 20px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>

            {/* 게이지 + 아래 라벨 */}
            <div style={{ flex:'0 0 auto' }}>
              <GaugeSVG pct={gaugePct} minP={minP} stdP={stdP} comP={comP} mult={mult} />
              {/* 게이지 아래 최소/표준/여유 보험료 */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4, marginTop:6, paddingLeft:4, paddingRight:4 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'#60a5fa', fontWeight:700 }}>최소</div>
                  <div style={{ fontSize:13, color:'#93c5fd', fontWeight:900 }}>{fmtWon(R(minP))}</div>
                  <div style={{ fontSize:9, color:'#475569' }}>minimum</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'#6ee7b7', fontWeight:700 }}>표준</div>
                  <div style={{ fontSize:13, color:'#6ee7b7', fontWeight:900 }}>{fmtWon(R(stdP))}</div>
                  <div style={{ fontSize:9, color:'#475569' }}>standard</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'#fcd34d', fontWeight:700 }}>여유</div>
                  <div style={{ fontSize:13, color:'#fcd34d', fontWeight:900 }}>{fmtWon(R(comP))}</div>
                  <div style={{ fontSize:9, color:'#475569' }}>maximum</div>
                </div>
              </div>
            </div>

            {/* 오른쪽 수치 정보 */}
            <div style={{ flex:1, paddingTop:4 }}>
              <div style={{ fontSize:10, color:'#64748b', letterSpacing:'0.04em', marginBottom:2 }}>
                최소 ↔ 여유 월 차이
              </div>
              <div style={{ fontSize:30, fontWeight:900, color:'#fff', letterSpacing:'-0.02em', lineHeight:1.1 }}>
                {fmtWon(Math.round(diff / 1_000) * 1_000)}
              </div>
              <div style={{ fontSize:12, color:'#c9a96e', fontWeight:700, marginBottom:12 }}>
                ▲ {diffPct}% 차이
              </div>

              {/* 회사간 격차 */}
              <div style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(201,169,110,0.35)', borderRadius:10, padding:'9px 12px', marginBottom:10 }}>
                <div style={{ fontSize:10, color:'#c9a96e', fontWeight:700, marginBottom:6 }}>
                  동일 보장 · 회사별 보험료 차이 ({ageGroup})
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'#93c5fd' }}>최저가 회사</div>
                    <div style={{ fontSize:15, fontWeight:900, color:'#93c5fd' }}>{fmtWon(R(companyLow))}</div>
                  </div>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                    <div style={{ fontSize:10, color:'#c9a96e', fontWeight:800 }}>차이 {fmtWon(gap)}</div>
                    <div style={{ width:'100%', height:5, borderRadius:3, background:'linear-gradient(to right,#3b82f6,#dc2626)' }} />
                    <div style={{ fontSize:9, color:'#475569', textAlign:'center' }}>
                      50대 7만원 · 60대 10만원 차이
                    </div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'#fca5a5' }}>최고가 회사</div>
                    <div style={{ fontSize:15, fontWeight:900, color:'#fca5a5' }}>{fmtWon(R(companyHigh))}</div>
                  </div>
                </div>
              </div>

              {/* 고지별 버튼 */}
              <button type="button" onClick={() => setShowDisclosure(true)} style={{
                width:'100%', background:'rgba(201,169,110,0.18)',
                border:'1px solid rgba(201,169,110,0.5)', borderRadius:8, padding:'7px 12px',
                fontSize:11, fontWeight:700, color:'#c9a96e', cursor:'pointer', textAlign:'left',
              }}>
                📋 고지별 보험료 차이 보기
              </button>
            </div>
          </div>

          <div style={{ fontSize:10, color:'#475569', marginTop:8 }}>
            {ageGroup} · 사무직 · 20년납 기준 예시&nbsp;
            <span style={{ color:'#334155' }}>(성별·건강상태에 따라 다름)</span>
          </div>
        </div>

        {/* ③ 담보별 최소↔여유 바 */}
        <div style={{ background:'linear-gradient(160deg,#1e3a5f 0%,#1e4d8c 100%)', padding:'16px 20px' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:14 }}>
            {COMPARE_ITEMS.map(({ label, minV, comV, rate }) => {
              const minPrem = Math.round(minV * rate * mult)
              const comPrem = Math.round(comV * rate * mult)
              const minW    = Math.round((minV / comV) * 100)
              return (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:11, color:'#bfdbfe', minWidth:56, fontWeight:600 }}>{label}</span>
                  <div style={{ flex:1, height:10, borderRadius:5, overflow:'hidden', background:'#c9a96e' }}>
                    <div style={{ height:'100%', width:`${minW}%`, background:'#3b82f6' }} />
                  </div>
                  <div style={{ fontSize:10, color:'#93c5fd', textAlign:'right', minWidth:140 }}>
                    <span style={{ color:'#93c5fd' }}>{minV.toLocaleString()}만</span>
                    <span style={{ color:'#64748b', margin:'0 3px' }}>→</span>
                    <span style={{ color:'#fcd34d', fontWeight:700 }}>{comV.toLocaleString()}만</span>
                    <span style={{ color:'#64748b', marginLeft:4 }}>
                      (+{fmtWon(Math.round((comPrem - minPrem) / 1000) * 1000)}/월)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 20년 총납 비교 */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:12, marginBottom:6 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#93c5fd', marginBottom:2 }}>최소 기준 20년 총납</div>
              <div style={{ fontSize:15, fontWeight:900, color:'#fff' }}>{fmtWon(R(total20min))}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ fontSize:18, color:'#c9a96e', lineHeight:1 }}>↔</div>
              <div style={{ fontSize:10, color:'#c9a96e', fontWeight:700, marginTop:2 }}>차이 {fmtWon(R(total20com - total20min))}</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#fcd34d', marginBottom:2 }}>여유 기준 20년 총납</div>
              <div style={{ fontSize:15, fontWeight:900, color:'#fcd34d' }}>{fmtWon(R(total20com))}</div>
            </div>
          </div>
          <div style={{ fontSize:9, color:'#475569', textAlign:'center' }}>사무직 기준 / 100세 만기 / 20년납</div>
        </div>
      </div>
    </>
  )
}
