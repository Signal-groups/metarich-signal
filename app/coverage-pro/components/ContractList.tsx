'use client'

import type { ProContract } from '../../../lib/coverageAnalysis/types'

export default function ContractList({ contracts }: { contracts: ProContract[] }) {
  return (
    <div className="coverage-pro-card coverage-pro-card-pad">
      <div className="coverage-pro-section-title">현재 보험 계약</div>
      <div className="coverage-pro-table-wrap">
        <table className="coverage-pro-table">
          <thead>
            <tr>
              <th>보험사</th>
              <th>상품명</th>
              <th>계약일</th>
              <th>납입/보장기간</th>
              <th>월 보험료</th>
              <th>담보 수</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <td><b>{contract.company}</b></td>
                <td>{contract.productName}</td>
                <td>{contract.contractDate || '-'}</td>
                <td>{contract.paymentPeriod || '-'}</td>
                <td>{formatWon(contract.monthlyPremium)}</td>
                <td>{contract.coverages.length}개</td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: 28 }}>불러온 보험계약이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatWon(value: number) {
  return value ? `${Math.round(value).toLocaleString()}원` : '-'
}
