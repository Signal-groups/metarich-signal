'use client'

import { useEffect, useState } from 'react'
import {
  loadBenchmark,
  BENCHMARK_ITEMS,
  ROW_KEY_TO_BENCHMARK,
  type BenchmarkAmounts,
} from './BenchmarkSettings'
import type { ProContract } from '../../../lib/coverageAnalysis/types'

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
    ok:   { bg: '#f0fdf4', border: '#bbf7d0', bar: '#22c55e', badge: '#16a34a', badgeBg: '#dcfce7', text: '달성' },
    warn: { bg: '#fffbeb', border: '#fde68a', bar: '#f59e0b', badge: '#b45309', badgeBg: '#fef3c7', text: '부족' },
    miss: { bg: '#fef2f2', border: '#fecaca', bar: '#ef4444', badge: '#dc2626', badgeBg: '#fee2e2', text: '미가입' },
    skip: { bg: '#f8fafc', border: '#e2e8f0', bar: '#cbd5e1', badge: '#94a3b8', badgeBg: '#f1f5f9', text: '해당없음' },
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
