'use client'

import type { ProContract } from '../../../lib/coverageAnalysis/types'

// 주요 보장 항목 — 카테고리별 정의
const CATEGORY_GROUPS = [
  {
    key: 'silson', label: '실손 의료비', color: '#0ea5e9',
    items: [
      { rowKey: 'silson_disease_inpatient',  label: '질병 입원 의료비' },
      { rowKey: 'silson_disease_outpatient', label: '질병 통원 의료비' },
      { rowKey: 'silson_injury_inpatient',   label: '상해 입원 의료비' },
      { rowKey: 'silson_injury_outpatient',  label: '상해 통원 의료비' },
    ],
  },
  {
    key: 'cancer', label: '암 진단 / 치료', color: '#8b5cf6',
    items: [
      { rowKey: 'cancer_general',   label: '일반암 진단비' },
      { rowKey: 'cancer_similar',   label: '유사암 진단비' },
      { rowKey: 'cancer_chemo',     label: '항암 치료비' },
      { rowKey: 'cancer_targeted',  label: '표적항암 치료비' },
      { rowKey: 'cancer_surgery',   label: '암 수술비' },
    ],
  },
  {
    key: 'vascular', label: '뇌 / 심장 (2대질병)', color: '#ef4444',
    items: [
      { rowKey: 'brain_vascular',    label: '뇌혈관 진단비' },
      { rowKey: 'brain_stroke',      label: '뇌졸중 진단비' },
      { rowKey: 'brain_hemorrhage',  label: '뇌출혈 진단비' },
      { rowKey: 'heart_ischemic',    label: '허혈성심장 진단비' },
      { rowKey: 'heart_acute_mi',    label: '급성심근경색 진단비' },
    ],
  },
  {
    key: 'disability', label: '후유장해 / 사망', color: '#1a2744',
    items: [
      { rowKey: 'disability_injury',    label: '상해 후유장해 3~100%' },
      { rowKey: 'disability_disease',   label: '질병 후유장해 3~100%' },
      { rowKey: 'death_general',        label: '일반 사망' },
      { rowKey: 'death_disease',        label: '질병 사망' },
    ],
  },
  {
    key: 'surgery', label: '수술비 / 입원일당', color: '#f59e0b',
    items: [
      { rowKey: 'surgery_disease',        label: '질병 수술비' },
      { rowKey: 'surgery_injury',         label: '상해 수술비' },
      { rowKey: 'hospital_disease_daily', label: '질병 입원일당' },
      { rowKey: 'hospital_injury_daily',  label: '상해 입원일당' },
    ],
  },
  {
    key: 'driver', label: '운전자 특약', color: '#10b981',
    items: [
      { rowKey: 'driver_fine',     label: '교통사고 벌금' },
      { rowKey: 'driver_lawyer',   label: '변호사 선임비용' },
      { rowKey: 'driver_accident', label: '교통사고 처리지원금' },
    ],
  },
]

function aggregateByRowKey(contracts: ProContract[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const c of contracts) {
    for (const cov of c.coverages) {
      if (!cov.rowKey || cov.rowKey === 'unknown') continue
      result[cov.rowKey] = (result[cov.rowKey] || 0) + Number(cov.amount || 0)
    }
  }
  return result
}

function fmtAmt(v: number): string {
  if (!v) return '-'
  if (v >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억원`
  if (v >= 1) return `${v.toLocaleString()}만원`
  return `${v}원`
}

export default function CoverageGrid({ contracts }: { contracts: ProContract[] }) {
  const amounts = aggregateByRowKey(contracts)

  // 전체 커버리지 통계
  const allItems = CATEGORY_GROUPS.flatMap((g) => g.items)
  const coveredCount = allItems.filter((item) => (amounts[item.rowKey] || 0) > 0).length
  const totalCount = allItems.length

  // 미매핑 담보 (rowKey가 그룹에 없는 것)
  const knownKeys = new Set(allItems.map((i) => i.rowKey))
  const extraRows = Object.entries(amounts)
    .filter(([rk]) => !knownKeys.has(rk) && rk !== 'unknown')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* 커버리지 개요 배너 */}
      <div style={{
        background: 'linear-gradient(135deg, #1a2744 0%, #2d4a8a 100%)',
        borderRadius: 12, padding: '18px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
        color: '#fff',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>
            담보 현황 요약
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            <span style={{ color: '#c9a96e' }}>{coveredCount}</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginLeft: 6 }}>/ {totalCount} 항목 가입</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 700, marginBottom: 2 }}>주요 보장 달성률</div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0}%`,
              background: 'linear-gradient(90deg, #c9a96e, #e8c97a)',
              borderRadius: 9999,
            }} />
          </div>
          <div style={{ fontSize: 12, color: '#c9a96e', fontWeight: 900, textAlign: 'right' }}>
            {totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0}%
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <MiniStat label="계약 수" value={`${contracts.length}건`} />
          <MiniStat label="미가입" value={`${totalCount - coveredCount}개`} valueColor="#ef4444" />
        </div>
      </div>

      {/* 카테고리별 보장 카드 */}
      {CATEGORY_GROUPS.map((group) => {
        const groupItems = group.items.map((item) => ({
          ...item,
          amount: amounts[item.rowKey] || 0,
        }))
        const groupCovered = groupItems.filter((i) => i.amount > 0).length

        return (
          <div key={group.key} className="coverage-pro-card" style={{ overflow: 'hidden' }}>
            {/* 그룹 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid #f1f5f9',
              background: '#fafaf8',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 4, height: 20, borderRadius: 2, background: group.color }} />
                <span style={{ fontSize: 14, fontWeight: 900, color: '#1a2744' }}>{group.label}</span>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 900,
                padding: '3px 10px', borderRadius: 9999,
                background: groupCovered === group.items.length ? '#dcfce7' : groupCovered > 0 ? '#fef3c7' : '#f1f5f9',
                color: groupCovered === group.items.length ? '#15803d' : groupCovered > 0 ? '#b45309' : '#94a3b8',
              }}>
                {groupCovered}/{group.items.length} 가입
              </div>
            </div>

            {/* 담보 항목 그리드 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 0,
            }}>
              {groupItems.map((item, idx) => {
                const hasIt = item.amount > 0
                return (
                  <div key={item.rowKey} style={{
                    padding: '12px 18px',
                    borderRight: (idx + 1) % 2 === 1 ? '1px solid #f1f5f9' : undefined,
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: hasIt ? group.color : '#d1d5db',
                      }} />
                      <span style={{ fontSize: 12, color: hasIt ? '#1a2744' : '#94a3b8', fontWeight: hasIt ? 600 : 400 }}>
                        {item.label}
                      </span>
                    </div>
                    {hasIt ? (
                      <span style={{
                        fontSize: 12, fontWeight: 900, color: group.color,
                        whiteSpace: 'nowrap',
                      }}>
                        {fmtAmt(item.amount)}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 10, fontWeight: 900,
                        padding: '2px 8px', borderRadius: 9999,
                        background: '#f1f5f9', color: '#94a3b8',
                        whiteSpace: 'nowrap',
                      }}>
                        미가입
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* 추가 매핑 담보 (기타) */}
      {extraRows.length > 0 && (
        <div className="coverage-pro-card" style={{ overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 18px', borderBottom: '1px solid #f1f5f9', background: '#fafaf8',
          }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: '#64748b' }} />
            <span style={{ fontSize: 14, fontWeight: 900, color: '#1a2744' }}>기타 보장</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 0 }}>
            {extraRows.map(([rk, amt], idx) => (
              <div key={rk} style={{
                padding: '12px 18px',
                borderRight: (idx + 1) % 2 === 1 ? '1px solid #f1f5f9' : undefined,
                borderBottom: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: '#64748b' }} />
                  <span style={{ fontSize: 12, color: '#1a2744', fontWeight: 600 }}>{rk}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#64748b', whiteSpace: 'nowrap' }}>
                  {fmtAmt(amt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {contracts.length === 0 && (
        <div className="coverage-pro-card coverage-pro-card-pad" style={{ textAlign: 'center', color: '#94a3b8' }}>
          불러온 보험계약이 없습니다.
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: valueColor ?? '#fff' }}>{value}</div>
    </div>
  )
}
