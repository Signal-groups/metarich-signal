'use client'

import type { ProContract } from '../../../lib/coverageAnalysis/types'

const RADAR_GROUPS = [
  { key: 'death',    label: '사망',     match: ['death_'],                        recommend: 100_000_000 },
  { key: 'cancer',   label: '암진단',   match: ['cancer_general'],                recommend: 30_000_000 },
  { key: 'brain',    label: '뇌질환',   match: ['brain_stroke', 'brain_vascular', 'vascular_major'], recommend: 20_000_000 },
  { key: 'heart',    label: '심장',     match: ['heart_ischemic', 'heart_acute_mi', 'vascular_major'], recommend: 20_000_000 },
  { key: 'surgery',  label: '수술비',   match: ['surgery_'],                      recommend: 5_000_000 },
  { key: 'hospital', label: '입원/간병', match: ['hospital_disease_daily', 'hospital_injury_daily', 'nursing_hospital'], recommend: 200_000 },
]

const PREMIUM_COLORS = ['#1a2744','#2d4a8a','#c9a96e','#0ea5e9','#10b981','#f59e0b','#8b5cf6']

interface PremiumRow { company: string; monthlyPremium: number }

function getPremiumRows(contracts: ProContract[]): PremiumRow[] {
  const map = new Map<string, number>()
  for (const c of contracts) {
    const key = c.company || '기타'
    map.set(key, (map.get(key) ?? 0) + Number(c.monthlyPremium || 0))
  }
  return Array.from(map.entries())
    .map(([company, monthlyPremium]) => ({ company, monthlyPremium }))
    .sort((a, b) => b.monthlyPremium - a.monthlyPremium)
}

function getRadarData(contracts: ProContract[]) {
  return RADAR_GROUPS.map((group) => {
    const amount = contracts.flatMap((c) => c.coverages)
      .filter((cov) => group.match.some((kw) =>
        kw.endsWith('_') ? cov.rowKey.startsWith(kw) : cov.rowKey === kw
      ))
      .reduce((sum, cov) => sum + Number(cov.amount || 0) * 10_000, 0)
    return { ...group, amount }
  })
}

function fmtAmt(value: number): string {
  if (!value) return '없음'
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(0)}억`
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만`
  return `${value.toLocaleString()}원`
}

function fmtWon(value: number): string {
  if (!value) return '-'
  return `${Math.round(value).toLocaleString()}원`
}

// SVG Radar Chart
function RadarChart({ items }: { items: { label: string; amount: number; recommend: number }[] }) {
  const N = items.length
  const size = 260
  const cx = size / 2
  const cy = size / 2
  const r = 88

  function coords(idx: number, ratio: number): [number, number] {
    const angle = (Math.PI * 2 * idx) / N - Math.PI / 2
    const dist = r * Math.min(1, Math.max(0, ratio))
    return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)]
  }

  function toPath(pts: [number, number][]) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + 'Z'
  }

  const outerPts = items.map((_, idx) => coords(idx, 1))
  const actualPts = items.map((item, idx) =>
    coords(idx, item.recommend > 0 ? item.amount / item.recommend : 0)
  )

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: 260 }}>
      {[0.25, 0.5, 0.75, 1].map((level, li) => {
        const pts = items.map((_, idx) => coords(idx, level))
        return <path key={li} d={toPath(pts)} fill="none" stroke="#e2e8f0" strokeWidth={level === 1 ? 1 : 0.5} />
      })}
      {outerPts.map((p, idx) => (
        <line key={idx} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="#e2e8f0" strokeWidth="0.8" />
      ))}
      <path d={toPath(outerPts)} fill="rgba(26,39,68,0.04)" stroke="rgba(26,39,68,0.15)" strokeWidth="1.5" />
      <path d={toPath(actualPts)} fill="rgba(14,165,233,0.18)" stroke="#0ea5e9" strokeWidth="2.5" />
      {actualPts.map((p, idx) => {
        const ratio = items[idx].recommend > 0 ? items[idx].amount / items[idx].recommend : 0
        const color = ratio >= 1 ? '#10b981' : ratio > 0 ? '#f59e0b' : '#94a3b8'
        return <circle key={idx} cx={p[0]} cy={p[1]} r="4" fill={color} stroke="#fff" strokeWidth="1.5" />
      })}
      {items.map((item, idx) => {
        const angle = (Math.PI * 2 * idx) / N - Math.PI / 2
        const labelR = r + 30
        const x = cx + labelR * Math.cos(angle)
        const y = cy + labelR * Math.sin(angle)
        const ratio = item.recommend > 0 ? item.amount / item.recommend : 0
        const pct = Math.min(100, Math.round(ratio * 100))
        const sc = ratio >= 1 ? '#10b981' : ratio > 0 ? '#f59e0b' : '#94a3b8'
        return (
          <g key={item.label}>
            <text x={x} y={y - 8} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill="#1a2744">{item.label}</text>
            <text x={x} y={y + 8} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="600" fill={sc}>
              {item.recommend > 0 ? `${pct}%` : '-'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function AnalysisChart({ contracts }: { contracts: ProContract[] }) {
  const premiumRows = getPremiumRows(contracts)
  const premiumTotal = premiumRows.reduce((sum, r) => sum + r.monthlyPremium, 0)
  const premiumMax = Math.max(...premiumRows.map((r) => r.monthlyPremium), 1)
  const radarData = getRadarData(contracts)
  const okCount = radarData.filter((d) => d.amount >= d.recommend).length
  const warnCount = radarData.filter((d) => d.amount > 0 && d.amount < d.recommend).length
  const missCount = radarData.filter((d) => d.amount === 0).length

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* 보장 현황 요약 배너 */}
      <div style={{
        background: 'linear-gradient(135deg, #1a2744 0%, #2d4a8a 100%)',
        borderRadius: 12, padding: '20px 24px',
        color: '#fff', display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
      }}>
        <SummaryCol label="기준 충족" count={okCount} color="#10b981" />
        <SummaryCol label="보장 부족" count={warnCount} color="#f59e0b" bordered />
        <SummaryCol label="미가입" count={missCount} color="#ef4444" />
      </div>

      {/* 주요 보장 레이더 차트 */}
      <div className="coverage-pro-card coverage-pro-card-pad">
        <div className="coverage-pro-section-title">주요 보장 현황</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RadarChart items={radarData} />
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {radarData.map((item) => {
              const ratio = item.recommend > 0 ? item.amount / item.recommend : 0
              const pct = Math.min(100, Math.round(ratio * 100))
              const status = ratio >= 1 ? 'ok' : ratio > 0 ? 'warn' : 'miss'
              const cfg = status === 'ok'
                ? { bar: '#10b981', text: '충족', bg: '#dcfce7', tc: '#15803d' }
                : status === 'warn'
                ? { bar: '#f59e0b', text: '부족', bg: '#fef3c7', tc: '#b45309' }
                : { bar: '#cbd5e1', text: '미가입', bg: '#f1f5f9', tc: '#64748b' }
              return (
                <div key={item.key}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2744' }}>{item.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {fmtAmt(item.amount)} / {fmtAmt(item.recommend)}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 8px', borderRadius: 9999, background: cfg.bg, color: cfg.tc }}>
                        {cfg.text}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: cfg.bar, borderRadius: 9999 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
          {[
            { color: '#10b981', label: '권장기준 충족 (100%+)' },
            { color: '#f59e0b', label: '보장 부족 (1~99%)' },
            { color: '#94a3b8', label: '미가입 (0%)' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* 보험사별 월보험료 */}
      <div className="coverage-pro-card coverage-pro-card-pad">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="coverage-pro-section-title" style={{ marginBottom: 0 }}>보험사별 월 보험료</div>
          <div style={{
            background: '#1a2744', color: '#fff', borderRadius: 20,
            padding: '5px 14px', fontSize: 13, fontWeight: 900,
          }}>
            합계 {fmtWon(premiumTotal)}
          </div>
        </div>
        {premiumRows.length === 0 ? (
          <div className="coverage-pro-muted">계약 데이터가 없습니다.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {premiumRows.map((item, idx) => {
              const pct = premiumTotal > 0 ? Math.round((item.monthlyPremium / premiumTotal) * 100) : 0
              const barPct = Math.round((item.monthlyPremium / premiumMax) * 100)
              const color = PREMIUM_COLORS[idx % PREMIUM_COLORS.length]
              return (
                <div key={item.company} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 90px 40px', gap: 10, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.company}
                    </span>
                  </div>
                  <div style={{ height: 10, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 9999 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', textAlign: 'right' }}>
                    {fmtWon(item.monthlyPremium)}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCol({ label, count, color, bordered }: { label: string; count: number; color: string; bordered?: boolean }) {
  return (
    <div style={{
      textAlign: 'center',
      borderLeft: bordered ? '1px solid rgba(255,255,255,0.12)' : undefined,
      borderRight: bordered ? '1px solid rgba(255,255,255,0.12)' : undefined,
    }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color }}>{count}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>항목</div>
    <