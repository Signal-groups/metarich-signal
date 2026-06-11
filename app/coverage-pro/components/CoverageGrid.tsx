'use client'

import type { ProContract } from '../../../lib/coverageAnalysis/types'

const keyLabels: Record<string, string> = {
  cancer_general: '일반암 진단비',
  cancer_similar: '유사암 진단비',
  cancer_chemo: '항암 치료비',
  cancer_targeted: '표적항암 치료비',
  brain_vascular: '뇌혈관 진단비',
  heart_ischemic: '허혈성심장 진단비',
  surgery_disease: '질병 수술비',
  surgery_injury: '상해 수술비',
  hospital_disease_nursing: '질병 간병/재가',
  hospital_injury_nursing: '상해 간병',
  silson_disease_inpatient: '실손 입원',
  silson_injury_outpatient: '실손 통원',
  driver_accident: '운전자 교통사고 처리',
  driver_fine: '운전자 벌금',
  driver_lawyer: '변호사 선임',
  other_fire_fine: '화재 관련 보장',
  other_liability: '일상 배상책임',
}

export default function CoverageGrid({ contracts }: { contracts: ProContract[] }) {
  const rows = aggregate(contracts)
  return (
    <div className="coverage-pro-card coverage-pro-card-pad">
      <div className="coverage-pro-section-title">보장 확인</div>
      <div className="coverage-pro-table-wrap">
        <table className="coverage-pro-table">
          <thead>
            <tr>
              <th>주요 분류</th>
              <th>가입 금액</th>
              <th>포함 계약</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowKey}>
                <td><b>{keyLabels[row.rowKey] || row.label}</b></td>
                <td>{formatCoverageAmount(row.amount)}</td>
                <td>{row.companies.join(', ') || '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: 28 }}>매핑된 담보가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function aggregate(contracts: ProContract[]) {
  const map = new Map<string, { rowKey: string; label: string; amount: number; companies: Set<string> }>()
  contracts.forEach((contract) => {
    contract.coverages.forEach((coverage) => {
      if (!coverage.rowKey || coverage.rowKey === 'unknown') return
      const item = map.get(coverage.rowKey) || { rowKey: coverage.rowKey, label: coverage.name, amount: 0, companies: new Set<string>() }
      item.amount += Number(coverage.amount || 0)
      item.companies.add(contract.company)
      map.set(coverage.rowKey, item)
    })
  })
  return Array.from(map.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 40)
    .map((item) => ({ ...item, companies: Array.from(item.companies) }))
}

function formatCoverageAmount(value: number) {
  if (!value) return '-'
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억원`
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만원`
  return `${value.toLocaleString()}만원`
}
