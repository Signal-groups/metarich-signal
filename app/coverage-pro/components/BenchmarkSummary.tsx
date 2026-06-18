'use client'

import { useEffect, useState } from 'react'
import {
  loadBenchmark,
  BENCHMARK_ITEMS,
  BENCHMARK_PRESETS,
  ROW_KEY_TO_BENCHMARK,
  type BenchmarkAmounts,
  type BenchmarkKey,
} from './BenchmarkSettings'
import type { ProContract } from '../../../lib/coverageAnalysis/types'

// ── 40대 기준 참고 보험료율 (원/월 per 만원 담보금액) ─────────────────────
const PREMIUM_RATE: Partial<Record<BenchmarkKey, number>> = {
  death:                  0.80,  // 사망 1000만원당 ~800원/월 (정기)
  cancer:                 7.40,  // 암진단비 1000만원당 ~7,400원/월
  cancer_similar:         2.00,  // 유사암
  brain:                  5.00,  // 뇌혈관
  brain_stroke:           4.50,
  brain_hemorrhage:       5.00,
  heart:                  6.00,  // 심장질환
  heart_ischemic:         5.50,
  heart_mi:               6.00,
  surgery:                0.80,  // 수술비
  nursing:              250.00,  // 간병 1만원/일당 ~250원/월
  driver:                 0.50,  // 운전자
  fire:                   0.30,
  cancer_major_benefit:   3.00,
  cancer_major_nonbenefit: 3.50,
  vascular_major:         2.50,
}
// 실손은 티어별 정액으로 처리
const SILSON_FLAT = { min: 25_000, standard: 35_000, comfort: 50_000 }

/** 프리셋별 예상 총 월보험료 계산 (원 단위) */
function calcTierPremium(preset: 'min' | 'standard' | 'comfort'): number {
  const amounts = BENCHMARK_PRESETS[preset]
  let total = 0
  for (const item of BENCHMARK_ITEMS) {
    if (item.key === 'silson') {
      if (amounts.silson) total += SILSON_FLAT[preset]
      continue
    }
    const rate = PREMIUM_RATE[item.key as BenchmarkKey]
    if (!rate) continue
    total += amounts[item.key as BenchmarkKey] * rate
  }
  return Math.round(total)
}

function fmtWon(won: number) {
  if (won >= 10_000) return `${Math.round(won / 10_000).toLocaleString()}만원`
  return `${won.toLocaleString()}원`
}

// ── 반원 게이지 SVG ───────────────────────────────────────────────────────
function GaugeSVG({ pct }: { pct: number }) {
  const W = 240, H = 130
  const cx = W / 2, cy = H - 12
  const Ro = 98, Ri = 60

  // f=0 → 왼쪽(최소), f=1 → 오른쪽(여유)
  function pt(f: number, r: number) {
    const a = Math.PI * (1 - f)
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
  }

  function arc(f1: number, f2: number, fill: string) {
    const o1 = pt(f1, Ro), o2 = pt(f2, Ro)
    const i1 = pt(f1, Ri), i2 = pt(f2, Ri)
    const lg = f2 - f1 > 0.5 ? 1 : 0
    const d = `M${o1.x.toFixed(1)} ${o1.y.toFixed(1)} A${Ro} ${Ro} 0 ${lg} 0 ${o2.x.toFixed(1)} ${o2.y.toFixed(1)} L${i2.x.toFixed(1)} ${i2.y.toFixed(1)} A${Ri} ${Ri} 0 ${lg} 1 ${i1.x.toFixed(1)} ${i1.y.toFixed(1)}Z`
    return <path key={fill} d={d} fill={fill} />
  }

  const c = Math.max(0.03, Math.min(0.97, pct))
  const tip = pt(c, Ro - 10)
  const mid = pt(c, Ri + 6)

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* 3존 */}
      {arc(0,    0.34, '#3b82f6')}
      {arc(0.34, 0.66, '#10b981')}
      {arc(0.66, 1,    '#c9a96e')}
      {/* 구분선 */}
      {[0, 0.34, 0.66, 1].map(f => {
        const a = pt(f, Ro + 5), b = pt(f, Ri - 4)
        return <line key={f} x1={a.x.toFixed(1)} y1={a.y.toFixed(1)} x2={b.x.toFixed(1)} y2={b.y.toFixed(1)} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
      })}
      {/* 존 라벨 */}
      {([[ 0.17,'최소',10], [0.5,'표준',10], [0.83,'여유',10]] as [number,string,number][]).map(([f,label,fs]) => {
        const p = pt(f, (Ro+Ri)/2)
        return <text key={label} x={p.x.toFixed(1)} y={(p.y+3).toFixed(1)} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize={fs} fontWeight="700">{label}</text>
      })}
      {/* 바늘 */}
      <line x1={cx} y1={cy} x2={tip.x.toFixed(1)} y2={tip.y.toFixed(1)} stroke="white" strokeWidth={3} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={mid.x.toFixed(1)} y2={mid.y.toFixed(1)} stroke="rgba(255,255,255,0.3)" strokeWidth={6} strokeLinecap="round" />
      {/* 중심 */}
      <circle cx={cx} cy={cy} r={9} fill="white" />
      <circle cx={cx} cy={cy} r={5} fill="#1a2744" />
    </svg>
  )
}

// ── 보험료 비교 게이지 카드 ────────────────────────────────────────────────
function PremiumTierCard({ contracts }: { contracts: ProContract[] }) {
  const minP = calcTierPremium('min')
  const stdP = calcTierPremium('standard')
  const comP = calcTierPremium('comfort')

  // 실제 현재 납입 보험료 (원 단위)
  const actualMonthly = contracts.reduce((s, c) => s + (c.monthlyPremium || 0), 0)
  const hasActual = actualMonthly > 10_000  // 최소 1만원 이상이면 실제값 사용

  // 게이지 바늘: 실제 납입액 위치 (없으면 표준 위치)
  const rawPct = hasActual
    ? (actualMonthly - minP) / (comP - minP)
    : (stdP - minP) / (comP - minP)
  const gaugePct = Math.max(0.03, Math.min(0.97, rawPct))

  const diff    = comP - minP
  const diffPct = Math.round((comP / minP - 1) * 100)

  // 주요 담보 비교 항목
  const compareItems = [
    { label: '암진단비',  minV: BENCHMARK_PRESETS.min.cancer,   comV: BENCHMARK_PRESETS.comfort.cancer,   rate: PREMIUM_RATE.cancer ?? 0 },
    { label: '뇌혈관',    minV: BENCHMARK_PRESETS.min.brain,    comV: BENCHMARK_PRESETS.comfort.brain,    rate: PREMIUM_RATE.brain ?? 0 },
    { label: '심장질환',  minV: BENCHMARK_PRESETS.min.heart,    comV: BENCHMARK_PRESETS.comfort.heart,    rate: PREMIUM_RATE.heart ?? 0 },
    { label: '수술비',    minV: BENCHMARK_PRESETS.min.surgery,  comV: BENCHMARK_PRESETS.comfort.surgery,  rate: PREMIUM_RATE.surgery ?? 0 },
  ]

  const total20min = minP * 12 * 20
  const total20com = comP * 12 * 20

  const R = (n: number) => Math.round(n / 10_000) * 10_000

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.13)' }}>

      {/* ① 게이지 패널 (다크 네이비) */}
      <div style={{ background: 'linear-gradient(160deg, #0f1e3d 0%, #1a2744 60%, #1e3a6e 100%)', padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>

          {/* 게이지 SVG */}
          <div style={{ flex: '0 0 auto' }}>
            <GaugeSVG pct={gaugePct} />
            {/* min / max 라벨 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingLeft: 4, paddingRight: 4 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#93c5fd', fontWeight: 700 }}>최소 기준</div>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 900 }}>{fmtWon(R(minP))}/월</div>
                <div style={{ fontSize: 10, color: '#60a5fa' }}>minimum</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#fcd34d', fontWeight: 700 }}>여유 기준</div>
                <div style={{ fontSize: 13, color: '#fcd34d', fontWeight: 900 }}>{fmtWon(R(comP))}/월</div>
                <div style={{ fontSize: 10, color: '#fbbf24' }}>maximum</div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 차이 수치 */}
          <div style={{ flex: 1, paddingTop: 8 }}>
            {/* 월 보험료 차이 */}
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.04em', marginBottom: 2 }}>월 보험료 차이</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {fmtWon(Math.round(diff / 1_000) * 1_000)}
            </div>
            <div style={{ fontSize: 13, color: '#c9a96e', fontWeight: 700, marginBottom: 14 }}>
              ▲ {diffPct}% 차이
            </div>

            {/* 현재 납입액 (실제 데이터 있을 때) */}
            {hasActual && (
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '8px 12px', marginBottom: 10,
              }}>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>현재 납입 중 (실제)</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>
                  {fmtWon(Math.round(actualMonthly / 1_000) * 1_000)}/월
                </div>
                <div style={{ fontSize: 10, color: '#93c5fd', marginTop: 2 }}>
                  최소 대비 +{fmtWon(Math.round((actualMonthly - minP) / 1_000) * 1_000)} · 여유까지 -{fmtWon(Math.round((comP - actualMonthly) / 1_000) * 1_000)}
                </div>
              </div>
            )}

            <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.5 }}>
              40대 기준 · 사무직 · 20년납 예시<br/>
              <span style={{ color: '#64748b' }}>실제 보험료는 성별·나이·건강상태에 따라 다름</span>
            </div>
          </div>
        </div>
      </div>

      {/* ② 담보 비교 패널 (딥 블루) */}
      <div style={{ background: 'linear-gradient(160deg, #1e3a5f 0%, #1e4d8c 100%)', padding: '16px 20px' }}>

        {/* 담보별 최소↔여유 바 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
          {compareItems.map(({ label, minV, comV, rate }) => {
            const minPrem = Math.round(minV * rate)
            const comPrem = Math.round(comV * rate)
            const minW = Math.round((minV / comV) * 100)
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: '#bfdbfe', minWidth: 56, fontWeight: 600 }}>{label}</span>
                {/* 스택 바 */}
                <div style={{ flex: 1, height: 10, borderRadius: 5, overflow: 'hidden', background: '#c9a96e' }}>
                  <div style={{ height: '100%', width: `${minW}%`, background: '#3b82f6' }} />
                </div>
                {/* 금액 표시 */}
                <div style={{ fontSize: 10, color: '#93c5fd', textAlign: 'right', minWidth: 130 }}>
                  <span style={{ color: '#93c5fd' }}>{minV.toLocaleString()}만</span>
                  <span style={{ color: '#64748b', margin: '0 3px' }}>→</span>
                  <span style={{ color: '#fcd34d', fontWeight: 700 }}>{comV.toLocaleString()}만</span>
                  <span style={{ color: '#64748b', marginLeft: 4 }}>
                    (+{fmtWon(Math.round((comPrem - minPrem)/1000)*1000)}/월)
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 20년 총납 비교 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginBottom: 10,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#93c5fd', marginBottom: 2 }}>최소 기준 20년 총납</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{fmtWon(R(total20min))}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 18, color: '#c9a96e', lineHeight: 1 }}>↔</div>
            <div style={{ fontSize: 10, color: '#c9a96e', fontWeight: 700, marginTop: 2 }}>
              차이 {fmtWon(R(total20com - total20min))}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#fcd34d', marginBottom: 2 }}>여유 기준 20년 총납</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fcd34d' }}>{fmtWon(R(total20com))}</div>
          </div>
        </div>

        <div style={{ fontSize: 10, color: '#475569', textAlign: 'center' }}>
          사무직 기준 / 100세 만기 / 20년납
        </div>
      </div>
    </div>
  )
}

// ── 계약 목록에서 BenchmarkKey별 실제 합산 금액 계산 ──────────────────────
function calcActuals(contracts: ProContract[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const contract of contracts) {
    for (const cov of contract.coverages) {
      if (!cov.rowKey || cov.rowKey === 'unknown') continue
      const bk = ROW_KEY_TO_BENCHMARK[cov.rowKey]
      if (!bk) continue
      result[bk] = (result[bk] || 0) + Number(cov.amount || 0)
    }
  }
  return result
}

function fmt(v: number) {
  return v >= 10000
    ? `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억원`
    : `${v.toLocaleString()}만원`
}

// ── 행 컴포넌트 ─────────────────────────────────────────────────────────────
function BRow({
  label, actual, target, status, ratio, isChild,
}: {
  label: string
  actual: number
  target: number
  status: 'ok' | 'warn' | 'miss' | 'skip'
  ratio: number | null
  isChild?: boolean
}) {
  const palette = {
    ok:   { bg: '#f8fafc', border: '#e2e8f0', bar: '#64748b', badge: '#64748b', badgeBg: '#f1f5f9', text: '달성' },
    warn: { bg: '#f8fafc', border: '#e2e8f0', bar: '#94a3b8', badge: '#94a3b8', badgeBg: '#f1f5f9', text: '부족' },
    miss: { bg: '#f8fafc', border: '#e2e8f0', bar: '#cbd5e1', badge: '#cbd5e1', badgeBg: '#f1f5f9', text: '미가입' },
    skip: { bg: '#f8fafc', border: '#e2e8f0', bar: '#e2e8f0', badge: '#e2e8f0', badgeBg: '#f1f5f9', text: '해당없음' },
  }
  const c = palette[status]
  const pct = ratio !== null ? Math.min(100, Math.round(ratio * 100)) : null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: isChild ? '6px 12px 6px 28px' : '8px 12px',
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 8,
    }}>
      {/* 상태 도트 */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: c.bar, flexShrink: 0,
      }} />

      {/* 담보명 */}
      <span style={{
        flex: 1, fontSize: isChild ? 12 : 13,
        color: isChild ? '#475569' : '#1a2744',
        fontWeight: isChild ? 400 : 600,
      }}>
        {label}
      </span>

      {/* 실제 / 기준 */}
      <span style={{ fontSize: 12, color: '#1e293b', minWidth: 72, textAlign: 'right', fontWeight: 600 }}>
        {target === 0 ? '-' : fmt(actual)}
      </span>
      <span style={{ fontSize: 11, color: '#94a3b8' }}>/</span>
      <span style={{ fontSize: 12, color: '#64748b', minWidth: 72 }}>
        {target === 0 ? '-' : `기준 ${fmt(target)}`}
      </span>

      {/* 진행 바 + 배지 */}
      <div style={{ minWidth: 96, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {pct !== null && (
          <>
            <div style={{
              height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: c.bar, borderRadius: 2, transition: 'width 0.4s',
              }} />
            </div>

          </>
        )}

      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ───────────────────────────────────────────────────────────
export default function BenchmarkSummary({ contracts, onOpenSettings }: {
  contracts: ProContract[]
  onOpenSettings?: () => void
}) {
  const [benchmark, setBenchmark] = useState<BenchmarkAmounts | null>(null)

  useEffect(() => {
    setBenchmark(loadBenchmark())
    // 설정 변경 감지 (다른 탭/컴포넌트에서 저장 시)
    const onStorage = () => setBenchmark(loadBenchmark())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (!benchmark) return null

  const actuals = calcActuals(contracts)

  // 그룹별로 렌더
  const groups = ['사망', '암', '2대질병', '주요치료비', '기타']
  const grouped = groups.map((g) => ({
    group: g,
    items: BENCHMARK_ITEMS.filter((i) => i.group === g),
  }))

  // 전체 달성률 계산 (해당없음 제외)
  const scored = BENCHMARK_ITEMS.filter((item) => {
    const target = benchmark[item.key]
    return item.unit !== '여부' && target > 0
  })
  const achievedCount = scored.filter((item) => {
    const actual = actuals[item.key] || 0
    const target = benchmark[item.key] || 0
    return actual >= target
  }).length

  return (
    <div className="coverage-pro-card coverage-pro-card-pad">
      {/* ── 보험료 층위 비교 ── */}
      <PremiumTierCard contracts={contracts} />

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div className="coverage-pro-section-title" style={{ marginBottom: 4 }}>
            기준금액 대비 보장 현황
          </div>
          <div className="coverage-pro-muted">
            설정된 기준금액과 현재 보유 보장을 항목별로 비교합니다.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 달성률 요약 */}
          <div style={{
            padding: '6px 14px',
            background: '#1a2744', borderRadius: 20, color: '#fff', fontSize: 13, fontWeight: 700,
          }}>
            달성 {achievedCount} / {scored.length}
          </div>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 600,
                border: '1px solid #e2e8f0', borderRadius: 8,
                background: '#fff', color: '#64748b', cursor: 'pointer',
              }}
            >
              ⚙ 기준 변경
            </button>
          )}
        </div>
      </div>

      {/* 항목별 행 */}
      <div style={{ display: 'grid', gap: 6 }}>
        {grouped.map(({ group, items }) => {
          if (!items.length) return null
          return (
            <div key={group}>
              {/* 그룹 헤더 */}
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#94a3b8',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                margin: '10px 0 6px', paddingLeft: 4,
              }}>
                {group}
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                {items.map((item) => {
                  const actual = actuals[item.key] || 0
                  const target = benchmark[item.key] || 0
                  const isChild = item.label.startsWith('└')

                  if (item.unit === '여부') {
                    const has = actual > 0
                    const needed = target > 0
                    const status: 'ok' | 'miss' | 'skip' = !needed ? 'skip' : has ? 'ok' : 'miss'
                    return (
                      <BRow
                        key={item.key}
                        label={item.label}
                        actual={has ? 1 : 0}
                        target={needed ? 1 : 0}
                        status={status}
                        ratio={null}
                        isChild={isChild}
                      />
                    )
                  }

                  const ratio = target > 0 ? actual / target : null
                  const status: 'ok' | 'warn' | 'miss' | 'skip' =
                    target === 0 ? 'skip'
                    : ratio === null ? 'skip'
                    : ratio >= 1 ? 'ok'
                    : actual > 0 ? 'warn'
                    : 'miss'

                  return (
                    <BRow
                      key={item.key}
                      label={item.label}
                      actual={actual}
                      target={target}
                      status={status}
                      ratio={ratio}
                      isChild={isChild}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
