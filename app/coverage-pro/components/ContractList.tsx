'use client'

import { useState } from 'react'
import type { ProContract } from '../../../lib/coverageAnalysis/types'

interface Props {
  contracts: ProContract[]
  onUpdate?: (id: string, patch: Partial<ProContract>) => void
}

const COMPANY_COLORS = ['#1a2744','#2d4a8a','#c9a96e','#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899']

function getCompanyColor(company: string, allCompanies: string[]): string {
  const idx = allCompanies.indexOf(company)
  return COMPANY_COLORS[idx % COMPANY_COLORS.length]
}

function formatWon(v: number): string {
  if (!v) return '-'
  return `${Math.round(v).toLocaleString()}원`
}

const inputStyle: React.CSSProperties = {
  fontSize: 12, padding: '4px 8px', borderRadius: 6,
  border: '1px solid #d1d5db', width: '100%',
  fontFamily: 'inherit',
}
const btnStyle: React.CSSProperties = {
  fontSize: 11, padding: '4px 10px', borderRadius: 6,
  border: '1px solid #d1d5db', background: '#fff',
  cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit',
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
  function saveEdit(id: string) { onUpdate?.(id, editBuf); setEditingId(null) }
  function cancelEdit() { setEditingId(null); setEditBuf({}) }

  const totalPremium = contracts.reduce((s, c) => s + Number(c.monthlyPremium || 0), 0)
  const allCompanies = [...new Set(contracts.map((c) => c.company).filter(Boolean))]
  const protectionCount = contracts.filter((c) => c.policyType !== 'savings').length
  const savingsCount = contracts.length - protectionCount

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* 요약 배너 */}
      {contracts.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #1a2744 0%, #2d4a8a 100%)',
          borderRadius: 12, padding: '16px 24px',
          display: 'flex', alignItems: 'center', gap: 32, color: '#fff',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 4 }}>총 월 보험료</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#c9a96e' }}>{formatWon(totalPremium)}</div>
          </div>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.12)' }} />
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 4 }}>계약 수</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{contracts.length}건</div>
          </div>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.12)' }} />
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 4 }}>보장성</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>{protectionCount}건</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 4 }}>저축성</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b' }}>{savingsCount}건</div>
          </div>
          {/* 보험사별 색상 도트 */}
          {allCompanies.length > 0 && (
            <>
              <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {allCompanies.map((company) => {
                  const color = getCompanyColor(company, allCompanies)
                  const premium = contracts.filter((c) => c.company === company).reduce((s, c) => s + Number(c.monthlyPremium || 0), 0)
                  return (
                    <div key={company} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                      <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{company}</div>
                        <div style={{ fontSize: 11, fontWeight: 900, color }}>{formatWon(premium)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* 계약 목록 */}
      <div className="coverage-pro-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', background: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#1a2744' }}>현재 보험 계약</span>
          {contracts.length > 0 && (
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>총 {contracts.length}건</span>
          )}
        </div>

        {contracts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            불러온 보험계약이 없습니다.
          </div>
        ) : (
          <div>
            {/* 테이블 헤더 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr 1fr 100px 130px 110px 60px 60px',
              gap: 8, padding: '8px 18px',
              background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            }}>
              {['', '보험사', '상품명', '구분', '납입/만기', '월보험료', '담보', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.05em' }}>{h}</span>
              ))}
            </div>

            {contracts.map((contract) => {
              const color = getCompanyColor(contract.company, allCompanies)
              const isEditing = editingId === contract.id
              if (isEditing) {
                return (
                  <div key={contract.id} style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', background: '#f0fdf4' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 3 }}>보험사</label>
                        <input value={editBuf.company ?? ''} onChange={(e) => setEditBuf({ ...editBuf, company: e.target.value })} style={inputStyle} placeholder="보험사명" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 3 }}>상품명</label>
                        <input value={editBuf.productName ?? ''} onChange={(e) => setEditBuf({ ...editBuf, productName: e.target.value })} style={inputStyle} placeholder="상품명" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 3 }}>구분</label>
                        <select value={editBuf.policyType ?? 'protection'} onChange={(e) => setEditBuf({ ...editBuf, policyType: e.target.value as 'protection' | 'savings' })} style={inputStyle}>
                          <option value="protection">보장성</option>
                          <option value="savings">저축성</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 3 }}>납입/만기</label>
                        <input value={editBuf.paymentPeriod ?? ''} onChange={(e) => setEditBuf({ ...editBuf, paymentPeriod: e.target.value })} style={inputStyle} placeholder="20년납/100세만기" />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 3 }}>월 보험료 (원)</label>
                        <input type="number" value={editBuf.monthlyPremium ?? 0} onChange={(e) => setEditBuf({ ...editBuf, monthlyPremium: Number(e.target.value) })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 3 }}>계약일</label>
                        <input value={editBuf.contractDate ?? ''} onChange={(e) => setEditBuf({ ...editBuf, contractDate: e.target.value })} style={inputStyle} placeholder="계약일" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => saveEdit(contract.id)} style={{ ...btnStyle, background: '#0f766e', color: '#fff', border: 'none' }}>저장</button>
                      <button type="button" onClick={cancelEdit} style={btnStyle}>취소</button>
                    </div>
                  </div>
                )
              }

              // 보험료 비율 바 (전체 대비)
              const premiumRatio = totalPremium > 0 ? (Number(contract.monthlyPremium || 0) / totalPremium) * 100 : 0
              const isSavings = contract.policyType === 'savings'

              return (
                <div key={contract.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 1fr 100px 130px 110px 60px 60px',
                  gap: 8, padding: '12px 18px',
                  alignItems: 'center',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background 0.15s',
                }}>
                  {/* 회사 색상 dot */}
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />

                  {/* 보험사 */}
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contract.company || '—'}
                  </span>

                  {/* 상품명 */}
                  <span style={{ fontSize: 12, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contract.productName || '—'}
                  </span>

                  {/* 구분 배지 */}
                  <span style={{
                    display: 'inline-block', padding: '3px 8px', borderRadius: 9999,
                    fontSize: 11, fontWeight: 900,
                    background: isSavings ? '#fef3c7' : '#dbeafe',
                    color: isSavings ? '#92400e' : '#1e40af',
                    whiteSpace: 'nowrap',
                  }}>
                    {isSavings ? '저축성' : '보장성'}
                  </span>

                  {/* 납입/만기 */}
                  <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {contract.paymentPeriod || '-'}
                  </span>

                  {/* 월보험료 + 비율바 */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#1a2744', marginBottom: 3 }}>
                      {formatWon(contract.monthlyPremium)}
                    </div>
                    <div style={{ height: 3, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${premiumRatio}%`, background: color, borderRadius: 9999 }} />
                    </div>
                  </div>

                  {/* 담보 수 */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 22, borderRadius: 9999,
                    background: contract.coverages.length > 0 ? '#f0f9ff' : '#f1f5f9',
                    fontSize: 11, fontWeight: 900,
                    color: contract.coverages.length > 0 ? '#0369a1' : '#94a3b8',
                  }}>
                    {contract.coverages.length}개
                  </div>

                  {/* 수정 버튼 */}
                  <div>
                    {onUpdate && (
                      <button type="button" onClick={() => startEdit(contract)} style={{ ...btnStyle, color: '#0f766e', fontSize: 11 }}>
                        수정
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
