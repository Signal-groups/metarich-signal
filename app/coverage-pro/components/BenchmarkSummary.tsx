'use client'

import { useEffect, useState } from 'react'
import {
  loadBenchmark,
  BENCHMARK_UPDATED_EVENT,
  BENCHMARK_ITEMS,
  ROW_KEY_TO_BENCHMARK,
  type BenchmarkAmounts,
  type BenchmarkKey,
} from './BenchmarkSettings'
import type { ProContract } from '../../../lib/coverageAnalysis/types'

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

// 좁은 범위 담보 — 금액이 있어도 "범위 좁음" 경고
const NARROW_KEYS = new Set<BenchmarkKey>(['brain_stroke', 'brain_hemorrhage', 'heart_mi'])

type RowStatus = 'ok' | 'warn' | 'miss' | 'skip' | 'narrow'

function getRowStatus(key: BenchmarkKey, actual: number, target: number): RowStatus {
  if (NARROW_KEYS.has(key)) return actual > 0 ? 'narrow' : 'miss'
  if (target === 0) return 'skip'
  if (actual === 0) return 'miss'
  const ratio = actual / target
  if (ratio >= 1) return 'ok'
  return 'warn'
}

// 달성률 링 차트
function ScoreRing({ achieved, total }: { achieved: number; total: number }) {
  const pct = total > 0 ? Math.round((achieved / total) * 100) : 0
  const r = 44
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      <svg viewBox="0 0 110 110" width="120" height="120">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginTop: 2 }}>{achieved}/{total}</div>
      </div>
    </div>
  )
}

// 항목 행
function ItemRow({ label, actual, target, status, ratio, isChild }: {
  label: string; actual: number; target: number
  status: RowStatus; ratio: number | null; isChild?: boolean
}) {
  const cfgMap: Record<RowStatus, { badgeText: string; badgeBg: string; badgeColor: string; barColor: string }> = {
    ok:     { badgeText: '달성',     badgeBg: '#dcfce7', badgeColor: '#15803d', barColor: '#10b981' },
    warn:   { badgeText: '부족',     badgeBg: '#fef3c7', badgeColor: '#b45309', barColor: '#f59e0b' },
    miss:   { badgeText: '미가입',   badgeBg: '#fee2e2', badgeColor: '#b91c1c', barColor: '#fca5a5' },
    skip:   { badgeText: '해당없음', badgeBg: '#f1f5f9', badgeColor: '#94a3b8', barColor: '#e2e8f0' },
    narrow: { badgeText: '범위 좁음', badgeBg: '#fee2e2', badgeColor: '#b91c1c', barColor: '#ef4444' },
  }
  const cfg = cfgMap[status]
  const pct = ratio !== null ? Math.min(100, Math.round(ratio * 100)) : null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 90px 90px 60px 80px',
      gap: 8, alignItems: 'center',
      padding: isChild ? '7px 12px 7px 28px' : '9px 12px',
      borderBottom: '1px solid #f1f5f9',
    }}>
      <span style={{ fontSize: isChild ? 12 : 13, color: isChild ? '#475569' : '#1a2744', fontWeight: isChild ? 400 : 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', textAlign: 'right' }}>
        {target === 0 ? '-' : fmt(actual)}
      </span>
      <span style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
        {target === 0 ? '-' : fmt(target)}
      </span>
      <div>
        {pct !== null && (
          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: cfg.barColor, borderRadius: 9999 }} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: 9999,
          fontSize: 11, fontWeight: 900, background: cfg.badgeBg, color: cfg.badgeColor, whiteSpace: 'nowrap',
        }}>
          {cfg.badgeText}
        </span>
      </div>
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 900, color }}>{value}개</span>
    </div>
  )
}

export default function BenchmarkSummary({ contracts, onOpenSettings }: {
  contracts: ProContract[]
  onOpenSettings?: () => void
}) {
  const [benchmark, setBenchmark] = useState<BenchmarkAmounts | null>(null)

  useEffect(() => {
    setBenchmark(loadBenchmark())
    const onStorage = () => setBenchmark(loadBenchmark())
    const onBenchmarkUpdated = () => setBenchmark(loadBenchmark())
    window.addEventListener('storage', onStorage)
    window.addEventListener(BENCHMARK_UPDATED_EVENT, onBenchmarkUpdated)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(BENCHMARK_UPDATED_EVENT, onBenchmarkUpdated)
    }
  }, [])

  if (!benchmark) return null

  const actuals = calcActuals(contracts)
  const groups = ['사망', '암', '2대질병', '주요치료비', '기타']
  const grouped = groups.map((g) => ({ group: g, items: BENCHMARK_ITEMS.filter((i) => i.group === g) }))

  const scored = BENCHMARK_ITEMS.filter((item) => item.unit !== '여부' && benchmark[item.key] > 0)
  let achievedCount = 0, warnCount = 0, missCount = 0, narrowCount = 0
  for (const item of scored) {
    const actual = actuals[item.key] || 0
    const target = benchmark[item.key] || 0
    const st = getRowStatus(item.key, actual, target)
    if (st === 'ok') achievedCount++
    else if (st === 'warn') warnCount++
    else if (st === 'miss') missCount++
    else if (st === 'narrow') narrowCount++
  }

  return (
    <div className="coverage-pro-card" style={{ overflow: 'hidden' }}>

      {/* 헤더 배너 */}
      <div style={{
        background: 'linear-gradient(135deg, #1a2744 0%, #2d4a8a 100%)',
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>
            기준금액 대비 보장 현황
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 10 }}>
            보장 달성 분석 리포트
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <StatPill label="달성" value={achievedCount} color="#10b981" />
            <StatPill label="부족" value={warnCount} color="#f59e0b" />
            <StatPill label="미가입" value={missCount} color="#ef4444" />
            {narrowCount > 0 && <StatPill label="범위좁음" value={narrowCount} color="#b91c1c" />}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ScoreRing achieved={achievedCount} total={scored.length} />
          {onOpenSettings && (
            <button type="button" onClick={onOpenSettings} style={{
              padding: '8px 14px', fontSize: 12, fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8, background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              기준 변경
            </button>
          )}
        </div>
      </div>

      {/* 테이블 헤더 */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 90px 90px 60px 80px',
        gap: 8, padding: '10px 12px',
        background: '#f8fafc', borderBottom: '2px solid #e2e8f0',
      }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.05em' }}>담보 항목</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', textAlign: 'right' }}>현재</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', textAlign: 'right' }}>기준</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8' }}>달성률</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', textAlign: 'right' }}>상태</span>
      </div>

      {/* 항목별 */}
      {grouped.map(({ group, items }) => {
        if (!items.length) return null
        return (
          <div key={group}>
            <div style={{
              padding: '8px 12px 4px', fontSize: 10, fontWeight: 900,
              color: '#c9a96e', letterSpacing: '0.1em', textTransform: 'uppercase',
              background: '#fefef9', borderBottom: '1px solid #f1f5f9',
            }}>
              {group}
            </div>
            {items.map((item) => {
              const actual = actuals[item.key] || 0
              const target = benchmark[item.key] || 0
              const isChild = item.label.startsWith('└')
              if (item.unit === '여부') {
                const has = actual !== 0
                const needed = target !== 0
                const boolStatus: RowStatus = !needed ? 'skip' : has ? 'ok' : 'miss'
                return <ItemRow key={item.key} label={item.label} actual={has ? 1 : 0} target={needed ? 1 : 0} status={boolStatus} ratio={null} isChild={isChild} />
              }
              const ratio = target !== 0 ? actual / target : null
              const rowStatus = getRowStatus(item.key, actual, target)
              return <ItemRow key={item.key} label={item.label} actual={actual} target={target} status={rowStatus} ratio={ratio} isChild={isChild} />
            })}
          </div>
        )
      })}
    </div>
  )
}
