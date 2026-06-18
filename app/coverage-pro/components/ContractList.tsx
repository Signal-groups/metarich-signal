'use client'

import { useState } from 'react'
import type { ProContract } from '../../../lib/coverageAnalysis/types'

interface Props {
  contracts: ProContract[]
  onUpdate?: (id: string, patch: Partial<ProContract>) => void
}

export default function ContractList({ contracts, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBuf, setEditBuf] = useState<Partial<ProContract>>({})

  function startEdit(c: ProContract) {
    setEditingId(c.id)
    setEditBuf({
      company: c.company,
      productName: c.productName,
      contractDate: c.contractDate ?? '',
      paymentPeriod: c.paymentPeriod ?? '',
      monthlyPremium: c.monthlyPremium,
      policyType: c.policyType ?? 'protection',
    })
  }

  function saveEdit(id: string) {
    onUpdate?.(id, editBuf)
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditBuf({})
  }

  return (
    <div className="coverage-pro-card coverage-pro-card-pad">
      <div className="coverage-pro-section-title">현재 보험 계약</div>
      <div className="coverage-pro-table-wrap">
        <table className="coverage-pro-table">
          <thead>
            <tr>
              <th>구분</th>
              <th>보험사</th>
              <th>상품명</th>
              <th>계약일</th>
              <th>납입/보장기간</th>
              <th>월 보험료</th>
              <th>담보 수</th>
              <th>수정</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) =>
              editingId === contract.id ? (
                <tr key={contract.id} style={{ background: '#f0fdf4' }}>
                  <td>
                    <select
                      value={editBuf.policyType ?? 'protection'}
                      onChange={(e) => setEditBuf({ ...editBuf, policyType: e.target.value as 'protection' | 'savings' })}
                      style={{ fontSize: 12, padding: '2px 4px', borderRadius: 4, border: '1px solid #d1d5db' }}
                    >
                      <option value="protection">보장성</option>
                      <option value="savings">저축성</option>
                    </select>
                  </td>
                  <td>
                    <input
                      value={editBuf.company ?? ''}
                      onChange={(e) => setEditBuf({ ...editBuf, company: e.target.value })}
                      style={inputStyle}
                      placeholder="보험사명"
                    />
                  </td>
                  <td>
                    <input
                      value={editBuf.productName ?? ''}
                      onChange={(e) => setEditBuf({ ...editBuf, productName: e.target.value })}
                      style={inputStyle}
                      placeholder="상품명"
                    />
                  </td>
                  <td>
                    <input
                      value={editBuf.contractDate ?? ''}
                      onChange={(e) => setEditBuf({ ...editBuf, contractDate: e.target.value })}
                      style={{ ...inputStyle, width: 90 }}
                      placeholder="계약일"
                    />
                  </td>
                  <td>
                    <input
                      value={editBuf.paymentPeriod ?? ''}
                      onChange={(e) => setEditBuf({ ...editBuf, paymentPeriod: e.target.value })}
                      style={{ ...inputStyle, width: 110 }}
                      placeholder="20년납/100세만기"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={editBuf.monthlyPremium ?? 0}
                      onChange={(e) => setEditBuf({ ...editBuf, monthlyPremium: Number(e.target.value) })}
                      style={{ ...inputStyle, width: 80 }}
                      placeholder="원"
                    />
                  </td>
                  <td>{contract.coverages.length}개</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => saveEdit(contract.id)}
                      style={{ ...btnStyle, background: '#0f766e', color: '#fff', marginRight: 4 }}
                    >저장</button>
                    <button type="button" onClick={cancelEdit} style={btnStyle}>취소</button>
                  </td>
                </tr>
              ) : (
                <tr key={contract.id}>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background: contract.policyType === 'savings' ? '#fef9c3' : '#dbeafe',
                      color: contract.policyType === 'savings' ? '#92400e' : '#1e40af',
                    }}>
                      {contract.policyType === 'savings' ? '저축성' : '보장성'}
                    </span>
                  </td>
                  <td><b>{contract.company || '—'}</b></td>
                  <td>{contract.productName || '—'}</td>
                  <td>{contract.contractDate || '-'}</td>
                  <td>{contract.paymentPeriod || '-'}</td>
                  <td>{formatWon(contract.monthlyPremium)}</td>
                  <td>{contract.coverages.length}개</td>
                  <td>
                    {onUpdate && (
                      <button
                        type="button"
                        onClick={() => startEdit(contract)}
                        style={{ ...btnStyle, color: '#0f766e' }}
                      >수정</button>
                    )}
                  </td>
                </tr>
              )
            )}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: 28 }}>
                  불러온 보험계약이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {onUpdate && (
        <p style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
          ✏️ 수정 버튼으로 보험사명·상품명·보장성/저축성 구분을 직접 편집할 수 있습니다.
        </p>
      )}
    </div>
  )
}

function formatWon(value: number) {
  return value ? `${Math.round(value).toLocaleString()}원` : '-'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 80,
  padding: '3px 6px',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  fontSize: 13,
}

const btnStyle: React.CSSProperties = {
  padding: '3px 8px',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  fontSize: 12,
  cursor: 'pointer',
  background: '#f9fafb',
}
