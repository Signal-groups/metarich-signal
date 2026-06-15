'use client'

import type { ProContract } from '../../../lib/coverageAnalysis/types'

const COVERAGE_GROUPS = [
  { key: 'death',    label: '사망',     match: ['death_'],          recommend: 100_000_000 },
  { key: 'cancer',   label: '암(진단)', match: ['cancer_general'],  recommend: 30_000_000 },
  { key: 'brain',    label: '뇌졸중',   match: ['brain_stroke'],    recommend: 20_000_000 },
  { key: 'heart',    label: '심장진단(허혈성 포함)', match: ['heart_infarction', 'heart_ischemic'], recommend: 20_000_000 },
  { key: 'surgery',  label: '수술비',   match: ['surgery_'],        recommend: 3_000_000 },
  { key: 'hospital', label: '입원일당', match: ['hospital_daily'],  recommend: 100_000 },
]

interface PremiumRow { company: string; monthlyPremium: number }

function getPremiumRows(contracts: ProContract[]): PremiumRow[] {
  const map = new Map<string, number>()
  for (const contract of contracts) {
    const key = contract.company || '기타'
    map.set(key, (map.get(key) ?? 0) + Number(contract.monthlyPremium || 0))
  }
  return Array.from(map.entries())
    .map(([company, monthlyPremium]) => ({ company, monthlyPremium }))
    .sort((a, b) => b.monthlyPremium - a.monthlyPremium)
}

function barWidth(value: number, max: number): number {
  return Math.max(2, Math.round((value / max) * 100))
}

function formatPremium(value: number): string {
  if (!value) return '-'
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}만원`
  return `${value.toLocaleString()}원`
}

function formatAmount(value: number): string {
  if (!value) return '-'
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만`
  return `${value.toLocaleString()}원`
}

function coverageStatus(amount: number, recommend: number): string {
  if (!amount) return '없음'
  const ratio = amount / recommend
  if (ratio >= 1.0) return '충족'
  if (ratio >= 0.5) return '부족'
  return '매우부족'
}

function statusColor(status: string): string {
  if (status === '충족') return '#10b981'
  if (status === '부족') return '#f59e0b'
  if (status === '매우부족') return '#ef4444'
  return '#9ca3af'
}

export default function AnalysisChart({ contracts }: { contracts: ProContract[] }) {
  const premiumRows = getPremiumRows(contracts)
  const premiumTotal = premiumRows.reduce((sum, row) => sum + row.monthlyPremium, 0)
  const premiumMax = Math.max(...premiumRows.map((row) => row.monthlyPremium), 1)

  const coverageRows = COVERAGE_GROUPS.map((group) => ({
    ...group,
    amount: contracts.flatMap((contract) => contract.coverages)
      .filter((cov) => group.match.some((kw) => cov.rowKey.includes(kw)))
      .reduce((sum, cov) => sum + Number(cov.amount || 0) * 10000, 0), // cov.amount는 만원 단위 → 원으로 변환
  }))
  const coverageMax = Math.max(...coverageRows.flatMap((row) => [row.amount, row.recommend]), 1)

  return (
    <div style={{ display: 'grid', gap: 14 }}>

      {/* ── 보험사별 월보험료 ──────────────────────────────────── */}
      <div className="coverage-pro-card coverage-pro-card-pad">
        <div className="coverage-pro-section-title">보험사별 월보험료</div>

        {premiumRows.length === 0 ? (
          <div className="coverage-pro-muted">불러온 보험계약이 없습니다.</div>
        ) : (
          <div className="coverage-pro-bars">
            {premiumRows.map((item) => (
              <div className="coverage-pro-bar-row" key={item.company}>
                <span style={{ minWidth: 80 }}>{item.company}</span>
                <div className="coverage-pro-bar-track">
                  <div
                    className="coverage-pro-bar-fill"
                    style={{ width: `${barWidth(item.monthlyPremium, premiumMax)}%` }}
                  />
                </div>
                <span style={{ minWidth: 72, textAlign: 'right' }}>{formatPremium(item.monthlyPremium)}</span>
              </div>
            ))}

            {/* 합계 행 */}
            <div
              className="coverage-pro-bar-row"
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid var(--gray200)',
                fontWeight: 700,
              }}
            >
              <span style={{ minWidth: 80 }}>월 합계</span>
              <div className="coverage-pro-bar-track">
                <div className="coverage-pro-bar-fill" style={{ width: '100%', opacity: 0.35 }} />
              </div>
              <span style={{ minWidth: 72, textAlign: 'right' }}>{formatPremium(premiumTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 담보 카테고리별 현재 vs 권장 비교 ────────────────── */}
      <div className="coverage-pro-card coverage-pro-card-pad">
        <div className="coverage-pro-section-title">보장금액 현황 (현재 vs 권장)</div>

        <div style={{ display: 'grid', gap: 16 }}>
          {coverageRows.map((item) => {
            const status = coverageStatus(item.amount, item.recommend)
            const color = statusColor(status)
            return (
              <div key={item.key}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</span>
                </div>

                {/* 현재 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--gray400)', minWidth: 28 }}>현재</span>
                  <div className="coverage-pro-bar-track" style={{ flex: 1 }}>
                    <div
                      className="coverage-pro-bar-fill"
                      style={{
                        width: `${barWidth(item.amount, coverageMax)}%`,
                        background: color,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, minWidth: 60, textAlign: 'right' }}>{formatAmount(item.amount)}</span>
                </div>

                {/* 권장 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--gray400)', minWidth: 28 }}>권장</span>
                  <div className="coverage-pro-bar-track" style={{ flex: 1 }}>
                    <div
                      className="coverage-pro-bar-fill"
                      style={{
                        width: `${barWidth(item.recommend, coverageMax)}%`,
                        background: 'var(--gray200)',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, minWidth: 60, textAlign: 'right', color: 'var(--gray400)' }}>
                    {formatAmount(item.recommend)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="coverage-pro-muted" style={{ marginTop: 14, fontSize: 12 }}>
          권장 기준은 40대 평균 기준이며, 나이·건강 상태에 따라 조정이 필요합니다.
        </div>
      </div>
    </div>
  )
}
