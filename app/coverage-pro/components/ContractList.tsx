'use client'

import { useState } from 'react'
import type { ProContract, ProCoverage } from '../../../lib/coverageAnalysis/types'
import { ROW_KEY_LABEL } from '../../../lib/coverageAnalysis/clientMapping'

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

function isRenewalText(...values: Array<string | undefined>): boolean {
  const text = values.join(' ').toLowerCase()
  if (text.includes('비갱신') || text.includes('nonrenewal') || text.includes('non-renewal')) return false
  return text.includes('갱신') || text.includes('renewal')
}

function isRenewalContract(contract: ProContract): boolean {
  return Boolean(contract.isRenewal || isRenewalText(contract.productName, contract.paymentPeriod))
}

function isRenewalCoverage(contract: ProContract, coverage: ProCoverage): boolean {
  return Boolean(
    coverage.isRenewal ||
    contract.isRenewal ||
    isRenewalText(contract.productName, contract.paymentPeriod, coverage.name)
  )
}

function isCiCoverage(contract: ProContract, coverage: ProCoverage): boolean {
  const text = `${contract.productName || ''} ${coverage.name || ''}`.toLowerCase()
  return coverage.rowKey === 'ci_diagnosis' || text.includes('ci') || text.includes('중대질병') || text.includes('중대한')
}

function contractHasCi(contract: ProContract): boolean {
  return contract.coverages.some((coverage) => isCiCoverage(contract, coverage))
}

function expirySummary(contract: ProContract): string {
  const expiries = [...new Set(contract.coverages.map((coverage) => coverage.expiryDate).filter(Boolean))]
  if (expiries.length === 0) return contract.paymentPeriod || '-'
  const first = expiries.slice(0, 2).join(', ')
  return `${contract.paymentPeriod || '만기'} / 담보만기 ${first}${expiries.length > 2 ? ` 외 ${expiries.length - 2}` : ''}`
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

type EditBuf = {
  company: string
  productName: string
  contractDate: string
  paymentPeriod: string
  monthlyPremium: number
  policyType: 'protection' | 'savings'
  coverages: ProCoverage[]
}

// rowKey optgroup 구조
const COV_OPTIONS: { group: string; entries: [string, string][] }[] = [
  { group: '실비', entries: Object.entries(ROW_KEY_LABEL).filter(([k]) => k.startsWith('silson')) },
  { group: '암 진단/치료', entries: Object.entries(ROW_KEY_LABEL).filter(([k]) => k.startsWith('cancer')) },
  { group: '뇌·심장', entries: Object.entries(ROW_KEY_LABEL).filter(([k]) => k.startsWith('brain') || k.startsWith('heart') || k.startsWith('vascular') || k.startsWith('two_major')) },
  { group: '후유장해', entries: Object.entries(ROW_KEY_LABEL).filter(([k]) => k.startsWith('disability')) },
  { group: '사망 보장', entries: Object.entries(ROW_KEY_LABEL).filter(([k]) => k.startsWith('death')) },
  { group: '수술비', entries: Object.entries(ROW_KEY_LABEL).filter(([k]) => k.startsWith('surgery')) },
  { group: '입원일당', entries: Object.entries(ROW_KEY_LABEL).filter(([k]) => k.startsWith('hospital')) },
  { group: '간병인', entries: Object.entries(ROW_KEY_LABEL).filter(([k]) => k.startsWith('nursing')) },
  { group: '운전자', entries: Object.entries(ROW_KEY_LABEL).filter(([k]) => k.startsWith('driver') || k.startsWith('other')) },
  { group: '상해진단', entries: Object.entries(ROW_KEY_LABEL).filter(([k]) => k.startsWith('fracture') || k.startsWith('burn')) },
  { group: '주요치료비·기타', entries: Object.entries(ROW_KEY_LABEL).filter(([k]) => k.startsWith('cancer_major') || k.startsWith('vascular_major') || k.startsWith('ci') || k.startsWith('dementia') || k.startsWith('ltc') || k.startsWith('benign')) },
]

export default function ContractList({ contracts, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBuf, setEditBuf] = useState<EditBuf | null>(null)
  const [showAllCov, setShowAllCov] = useState(false)
  const [addCov, setAddCov] = useState<{ rowKey: string; amount: string; customName: string }>({
    rowKey: 'cancer_general', amount: '', customName: '',
  })

  function startEdit(c: ProContract) {
    setEditingId(c.id)
    setShowAllCov(false)
    setEditBuf({
      company: c.company,
      productName: c.productName,
      contractDate: c.contractDate ?? '',
      paymentPeriod: c.paymentPeriod ?? '',
      monthlyPremium: c.monthlyPremium,
      policyType: c.policyType ?? 'protection',
      coverages: c.coverages.map((cov) => ({ ...cov })),
    })
  }

  function updateCovAmount(covId: string, newAmount: number) {
    if (!editBuf) return
    setEditBuf({
      ...editBuf,
      coverages: editBuf.coverages.map((cov) =>
        cov.id === covId ? { ...cov, amount: newAmount } : cov
      ),
    })
  }

  function deleteCoverage(covId: string) {
    if (!editBuf) return
    setEditBuf({ ...editBuf, coverages: editBuf.coverages.filter((cov) => cov.id !== covId) })
  }

  function addCoverage() {
    if (!editBuf || !editingId) return
    const label = ROW_KEY_LABEL[addCov.rowKey] ?? addCov.rowKey
    const amt = parseFloat(addCov.amount) || 0
    const newCov: ProCoverage = {
      id: `add-${addCov.rowKey}-${Date.now()}`,
      contractId: editingId,
      rowKey: addCov.rowKey,
      name: addCov.customName.trim() || label,
      amount: amt,
    }
    setEditBuf({ ...editBuf, coverages: [...editBuf.coverages, newCov] })
    setAddCov({ rowKey: addCov.rowKey, amount: '', customName: '' })
  }

  function saveEdit(id: string) {
    if (!editBuf) return
    onUpdate?.(id, {
      company: editBuf.company,
      productName: editBuf.productName,
      contractDate: editBuf.contractDate,
      paymentPeriod: editBuf.paymentPeriod,
      monthlyPremium: editBuf.monthlyPremium,
      policyType: editBuf.policyType,
      coverages: editBuf.coverages,
    })
    setEditingId(null)
    setEditBuf(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditBuf(null)
  }

  const totalPremium = contracts.reduce((s, c) => s + Number(c.monthlyPremium || 0), 0)
  const allCompanies = [...new Set(contracts.map((c) => c.company).filter(Boolean))]
  const protectionCount = contracts.filter((c) => c.policyType !== 'savings').length
  const savingsCount = contracts.length - protectionCount

  return (
    <div style={{ display: 'grid', gap: 16 }}>

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

              if (isEditing && editBuf) {
                const displayCovs = showAllCov ? editBuf.coverages : editBuf.coverages.slice(0, 8)

                return (
                  <div key={contract.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#f0fdf4' }}>
                    <div style={{ padding: '14px 18px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#1a2744' }}>
                          {contract.company} · {contract.productName}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>계약 정보 수정</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 3 }}>보험사</label>
                          <input value={editBuf.company} onChange={(e) => setEditBuf({ ...editBuf, company: e.target.value })} style={inputStyle} placeholder="보험사명" />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 3 }}>상품명</label>
                          <input value={editBuf.productName} onChange={(e) => setEditBuf({ ...editBuf, productName: e.target.value })} style={inputStyle} placeholder="상품명" />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 3 }}>구분</label>
                          <select value={editBuf.policyType} onChange={(e) => setEditBuf({ ...editBuf, policyType: e.target.value as 'protection' | 'savings' })} style={inputStyle}>
                            <option value="protection">보장성</option>
                            <option value="savings">저축성</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 3 }}>납입/만기</label>
                          <input value={editBuf.paymentPeriod} onChange={(e) => setEditBuf({ ...editBuf, paymentPeriod: e.target.value })} style={inputStyle} placeholder="20년납/100세만기" />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 3 }}>월 보험료 (원)</label>
                          <input type="number" value={editBuf.monthlyPremium} onChange={(e) => setEditBuf({ ...editBuf, monthlyPremium: Number(e.target.value) })} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 3 }}>계약일</label>
                          <input value={editBuf.contractDate} onChange={(e) => setEditBuf({ ...editBuf, contractDate: e.target.value })} style={inputStyle} placeholder="계약일" />
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '0 18px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 900, color: '#1a2744' }}>
                          담보 목록 ({editBuf.coverages.length}개)
                        </span>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>금액은 만원 단위</span>
                      </div>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
                        {editBuf.coverages.length > 0 && (
                          <>
                            <div style={{
                              display: 'grid', gridTemplateColumns: '1fr 110px 120px 52px 28px',
                              padding: '6px 12px', background: '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                            }}>
                              <span style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8' }}>담보명</span>
                              <span style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8' }}>가입금액 (만원)</span>
                              <span style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8' }}>만기</span>
                              <span style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8' }}>갱신</span>
                              <span />
                            </div>
                            {displayCovs.map((cov, ci) => (
                              <div key={cov.id} style={{
                                display: 'grid', gridTemplateColumns: '1fr 110px 120px 52px 28px',
                                padding: '6px 12px', alignItems: 'center',
                                borderBottom: ci < displayCovs.length - 1 ? '1px solid #f1f5f9' : undefined,
                                background: isCiCoverage(contract, cov) ? '#f5f3ff' : isRenewalCoverage(contract, cov) ? '#fff7ed' : ci % 2 === 0 ? '#fff' : '#fafaf8',
                              }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {cov.name}
                                  </div>
                                  {cov.rowKey && cov.rowKey !== 'unknown' ? (
                                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginTop: 1 }}>
                                      {ROW_KEY_LABEL[cov.rowKey] ?? cov.rowKey}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginTop: 1 }}>
                                      ⚠ 미매핑
                                    </div>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  value={cov.amount > 0 ? cov.amount : ''}
                                  onChange={(e) => updateCovAmount(cov.id, Number(e.target.value) || 0)}
                                  placeholder="0"
                                  style={{
                                    fontSize: 12, padding: '4px 8px', borderRadius: 6,
                                    border: '1.5px solid #d1d5db', width: '100%',
                                    fontFamily: 'inherit', fontWeight: 700,
                                    color: cov.amount > 0 ? '#1a2744' : '#94a3b8',
                                  }}
                                />
                                <input
                                  value={cov.expiryDate ?? ''}
                                  onChange={(e) => setEditBuf({
                                    ...editBuf,
                                    coverages: editBuf.coverages.map((item) =>
                                      item.id === cov.id ? { ...item, expiryDate: e.target.value } : item
                                    ),
                                  })}
                                  placeholder="예: 100세"
                                  style={{
                                    fontSize: 11, padding: '4px 7px', borderRadius: 6,
                                    border: '1px solid #d1d5db', width: '100%', fontFamily: 'inherit',
                                    color: '#475569',
                                  }}
                                />
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 10, color: '#9a3412', fontWeight: 800 }}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(cov.isRenewal)}
                                    onChange={(e) => setEditBuf({
                                      ...editBuf,
                                      coverages: editBuf.coverages.map((item) =>
                                        item.id === cov.id ? { ...item, isRenewal: e.target.checked } : item
                                      ),
                                    })}
                                  />
                                  갱신
                                </label>
                                <button
                                  type="button"
                                  onClick={() => deleteCoverage(cov.id)}
                                  title="담보 삭제"
                                  style={{
                                    width: 22, height: 22, borderRadius: 6,
                                    border: '1px solid #fca5a5', background: '#fff1f2',
                                    color: '#ef4444', fontSize: 13, lineHeight: 1,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: 'inherit', flexShrink: 0,
                                  }}
                                >×</button>
                              </div>
                            ))}
                            {editBuf.coverages.length > 8 && (
                              <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setShowAllCov(!showAllCov)}
                                  style={{ ...btnStyle, fontSize: 11, color: '#0ea5e9' }}
                                >
                                  {showAllCov ? '접기 ▲' : `나머지 ${editBuf.coverages.length - 8}개 더 보기 ▼`}
                                </button>
                              </div>
                            )}
                          </>
                        )}

                        {/* 담보 추가 폼 */}
                        <div style={{
                          padding: '10px 12px',
                          borderTop: editBuf.coverages.length > 0 ? '2px dashed #c7d2fe' : undefined,
                          background: '#f5f3ff',
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#6d28d9', marginBottom: 8 }}>{'+ 담보 추가'}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 60px', gap: 6, alignItems: 'end' }}>
                            <div>
                              <label style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, display: 'block', marginBottom: 2 }}>담보 종류</label>
                              <select
                                value={addCov.rowKey}
                                onChange={(e) => setAddCov({ ...addCov, rowKey: e.target.value })}
                                style={{ ...inputStyle, fontSize: 11 }}
                              >
                                {COV_OPTIONS.map((group) => group.entries.length === 0 ? null : (
                                  <optgroup key={group.group} label={group.group}>
                                    {group.entries.map(([rk, label]) => (
                                      <option key={rk} value={rk}>{label}</option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, display: 'block', marginBottom: 2 }}>담보명 (선택)</label>
                              <input
                                value={addCov.customName}
                                onChange={(e) => setAddCov({ ...addCov, customName: e.target.value })}
                                placeholder={ROW_KEY_LABEL[addCov.rowKey] ?? addCov.rowKey}
                                style={{ ...inputStyle, fontSize: 11 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, display: 'block', marginBottom: 2 }}>금액 (만원)</label>
                              <input
                                type="number"
                                value={addCov.amount}
                                onChange={(e) => setAddCov({ ...addCov, amount: e.target.value })}
                                placeholder="0"
                                style={{ ...inputStyle, fontSize: 11 }}
                                onKeyDown={(e) => { if (e.key === 'Enter') addCoverage() }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={addCoverage}
                              style={{
                                ...btnStyle, fontSize: 11, background: '#7c3aed',
                                color: '#fff', border: 'none', padding: '5px 10px',
                              }}
                            >추가</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '0 18px 14px', display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => saveEdit(contract.id)} style={{ ...btnStyle, background: '#0f766e', color: '#fff', border: 'none' }}>저장</button>
                      <button type="button" onClick={cancelEdit} style={btnStyle}>취소</button>
                    </div>
                  </div>
                )
              }

              const premiumRatio = totalPremium > 0 ? (Number(contract.monthlyPremium || 0) / totalPremium) * 100 : 0
              const isSavings = contract.policyType === 'savings'
              const hasRenewal = isRenewalContract(contract) || contract.coverages.some((coverage) => isRenewalCoverage(contract, coverage))
              const hasCi = contractHasCi(contract)

              return (
                <div key={contract.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 1fr 100px 130px 110px 60px 60px',
                  gap: 8, padding: '12px 18px',
                  alignItems: 'center',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background 0.15s',
                  background: hasRenewal && hasCi ? 'linear-gradient(135deg,#fff7ed 0%,#f5f3ff 100%)' : hasRenewal ? '#fff7ed' : hasCi ? '#f5f3ff' : undefined,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contract.company || '—'}
                  </span>
                  <span style={{ fontSize: 12, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contract.productName || '—'}
                  </span>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 8px', borderRadius: 9999,
                      fontSize: 11, fontWeight: 900,
                      background: isSavings ? '#fef3c7' : '#dbeafe',
                      color: isSavings ? '#92400e' : '#1e40af',
                      whiteSpace: 'nowrap',
                    }}>
                      {isSavings ? '저축성' : '보장성'}
                    </span>
                    {hasRenewal && <span style={{ fontSize: 10, fontWeight: 900, color: '#9a3412', background: '#fed7aa', borderRadius: 9999, padding: '3px 7px' }}>갱신</span>}
                    {hasCi && <span style={{ fontSize: 10, fontWeight: 900, color: '#5b21b6', background: '#ddd6fe', borderRadius: 9999, padding: '3px 7px' }}>CI</span>}
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {expirySummary(contract)}
                  </span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#1a2744', marginBottom: 3 }}>
                      {formatWon(contract.monthlyPremium)}
                    </div>
                    <div style={{ height: 3, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${premiumRatio}%`, background: color, borderRadius: 9999 }} />
                    </div>
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 22, borderRadius: 9999,
                    background: contract.coverages.length > 0 ? '#f0f9ff' : '#f1f5f9',
                    fontSize: 11, fontWeight: 900,
                    color: contract.coverages.length > 0 ? '#0369a1' : '#94a3b8',
                  }}>
                    {contract.coverages.length}개
                  </div>
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
