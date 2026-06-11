'use client'

import { useState } from 'react'
import type { ProContract, ProCoverage, RemodelProposal } from '../../../lib/coverageAnalysis/types'
import { ROW_KEY_LABEL } from '../../../lib/coverageAnalysis/clientMapping'

// ── 담보 선택 목록 (ROW_KEY_LABEL 기반) ─────────────────────────────────
const COVERAGE_OPTIONS = Object.entries(ROW_KEY_LABEL).map(([rowKey, label]) => ({ rowKey, label }))

// ── 신규 상품 추가 폼 초기값 ───────────────────────────────────────────
function emptyAddForm() {
  return {
    company: '',
    productName: '',
    monthlyPremium: '',
    paymentPeriod: '',
    coverageInputs: [] as { rowKey: string; amount: string }[],
  }
}

export default function RemodelComparison({
  contracts,
  proposal,
  onChange,
}: {
  contracts: ProContract[]
  proposal: RemodelProposal
  onChange: (proposal: RemodelProposal) => void
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState(emptyAddForm)
  const [coverageSearch, setCoverageSearch] = useState('')

  const currentPremium = contracts.reduce((sum, c) => sum + Number(c.monthlyPremium || 0), 0)
  const removedPremium = contracts
    .filter((c) => proposal.removeContractIds.includes(c.id))
    .reduce((sum, c) => sum + Number(c.monthlyPremium || 0), 0)
  const addedPremium = proposal.addContracts.reduce((sum, c) => sum + Number(c.monthlyPremium || 0), 0)
  const afterPremium = currentPremium - removedPremium + addedPremium

  const toggleRemove = (id: string) => {
    const exists = proposal.removeContractIds.includes(id)
    onChange({
      ...proposal,
      removeContractIds: exists
        ? proposal.removeContractIds.filter((item) => item !== id)
        : [...proposal.removeContractIds, id],
    })
  }

  const removeAddedContract = (id: string) => {
    onChange({ ...proposal, addContracts: proposal.addContracts.filter((c) => c.id !== id) })
  }

  // ── 담보 추가/제거 ────────────────────────────────────────────────────
  const toggleCoverageInput = (rowKey: string) => {
    const exists = form.coverageInputs.some((ci) => ci.rowKey === rowKey)
    setForm((prev) => ({
      ...prev,
      coverageInputs: exists
        ? prev.coverageInputs.filter((ci) => ci.rowKey !== rowKey)
        : [...prev.coverageInputs, { rowKey, amount: '' }],
    }))
  }

  const updateCoverageAmount = (rowKey: string, amount: string) => {
    setForm((prev) => ({
      ...prev,
      coverageInputs: prev.coverageInputs.map((ci) =>
        ci.rowKey === rowKey ? { ...ci, amount } : ci
      ),
    }))
  }

  // ── 신규 상품 저장 ────────────────────────────────────────────────────
  const saveAddedContract = () => {
    if (!form.company.trim() || !form.productName.trim()) {
      alert('보험사와 상품명을 입력해주세요.')
      return
    }
    const premium = Number(form.monthlyPremium) || 0
    const coverages: ProCoverage[] = form.coverageInputs
      .filter((ci) => ci.amount !== '' && Number(ci.amount) > 0)
      .map((ci) => ({
        id: `new-${Date.now()}-${ci.rowKey}`,
        contractId: '',
        rowKey: ci.rowKey,
        name: ROW_KEY_LABEL[ci.rowKey] ?? ci.rowKey,
        amount: Number(ci.amount),
      }))

    const newContract: ProContract = {
      id: `remodel-${Date.now()}`,
      company: form.company.trim(),
      productName: form.productName.trim(),
      paymentPeriod: form.paymentPeriod.trim() || undefined,
      monthlyPremium: premium,
      coverages,
      status: 'active',
    }

    onChange({ ...proposal, addContracts: [...proposal.addContracts, newContract] })
    setForm(emptyAddForm())
    setCoverageSearch('')
    setShowAddForm(false)
  }

  const filteredCoverages = COVERAGE_OPTIONS.filter(
    ({ label }) => !coverageSearch || label.includes(coverageSearch)
  )

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ── 보험료 요약 ─────────────────────────────────────────────── */}
      <div className="coverage-pro-card coverage-pro-card-pad">
        <div className="coverage-pro-section-title">리모델링 제안</div>
        <div className="coverage-pro-stat-grid">
          <div className="coverage-pro-stat"><span>현재 월 보험료</span><b>{formatWon(currentPremium)}</b></div>
          <div className="coverage-pro-stat"><span>해지 예정</span><b style={{ color: '#ef4444' }}>−{formatWon(removedPremium)}</b></div>
          <div className="coverage-pro-stat"><span>신규 예정</span><b style={{ color: '#10b981' }}>+{formatWon(addedPremium)}</b></div>
          <div className="coverage-pro-stat"><span>제안 후</span><b style={{ color: '#1a2744' }}>{formatWon(afterPremium)}</b></div>
        </div>
      </div>

      {/* ── 현재 계약 유지/해지 ─────────────────────────────────────── */}
      <div className="coverage-pro-card coverage-pro-card-pad">
        <div className="coverage-pro-section-title">현재 계약 — 유지 / 해지</div>
        <div className="coverage-pro-table-wrap">
          <table className="coverage-pro-table">
            <thead>
              <tr><th>유지/해지</th><th>보험사</th><th>상품명</th><th>월 보험료</th></tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const isRemoving = proposal.removeContractIds.includes(contract.id)
                return (
                  <tr key={contract.id} style={{ opacity: isRemoving ? 0.5 : 1 }}>
                    <td>
                      <button
                        type="button"
                        className={`coverage-pro-btn${isRemoving ? '' : ' primary'}`}
                        style={isRemoving ? { background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca' } : {}}
                        onClick={() => toggleRemove(contract.id)}
                      >
                        {isRemoving ? '해지 예정' : '유지'}
                      </button>
                    </td>
                    <td>{contract.company}</td>
                    <td>{contract.productName}</td>
                    <td>{formatWon(contract.monthlyPremium)}</td>
                  </tr>
                )
              })}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: 28 }}>
                    리모델링할 계약이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 신규 추가 상품 목록 ─────────────────────────────────────── */}
      {proposal.addContracts.length > 0 && (
        <div className="coverage-pro-card coverage-pro-card-pad">
          <div className="coverage-pro-section-title">신규 추가 상품</div>
          <div className="coverage-pro-table-wrap">
            <table className="coverage-pro-table">
              <thead>
                <tr><th>보험사</th><th>상품명</th><th>월 보험료</th><th>담보 수</th><th>삭제</th></tr>
              </thead>
              <tbody>
                {proposal.addContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td>{contract.company}</td>
                    <td>{contract.productName}</td>
                    <td style={{ color: '#10b981', fontWeight: 700 }}>{formatWon(contract.monthlyPremium)}</td>
                    <td>{contract.coverages.length}개</td>
                    <td>
                      <button
                        type="button"
                        className="coverage-pro-btn"
                        style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca' }}
                        onClick={() => removeAddedContract(contract.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 상품 추가 버튼 ──────────────────────────────────────────── */}
      {!showAddForm && (
        <button
          type="button"
          className="coverage-pro-btn primary"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setShowAddForm(true)}
        >
          + 신규 상품 추가
        </button>
      )}

      {/* ── 신규 상품 추가 폼 ─────────────────────────────────────── */}
      {showAddForm && (
        <div className="coverage-pro-card coverage-pro-card-pad" style={{ border: '2px solid #c9a96e' }}>
          <div className="coverage-pro-section-title" style={{ color: '#c9a96e' }}>신규 상품 정보 입력</div>

          <div className="coverage-pro-grid-2" style={{ marginBottom: 12 }}>
            <div className="coverage-pro-field">
              <label>보험사 <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                className="coverage-pro-input"
                placeholder="예: 삼성화재"
                value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
              />
            </div>
            <div className="coverage-pro-field">
              <label>상품명 <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                className="coverage-pro-input"
                placeholder="예: 다이렉트 운전자보험"
                value={form.productName}
                onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))}
              />
            </div>
            <div className="coverage-pro-field">
              <label>월 보험료 (원)</label>
              <input
                className="coverage-pro-input"
                type="number"
                placeholder="예: 35000"
                value={form.monthlyPremium}
                onChange={(e) => setForm((p) => ({ ...p, monthlyPremium: e.target.value }))}
              />
            </div>
            <div className="coverage-pro-field">
              <label>납입기간/보장기간</label>
              <input
                className="coverage-pro-input"
                placeholder="예: 20년납/80세만기"
                value={form.paymentPeriod}
                onChange={(e) => setForm((p) => ({ ...p, paymentPeriod: e.target.value }))}
              />
            </div>
          </div>

          {/* 담보 선택 */}
          <div className="coverage-pro-section-title" style={{ fontSize: 13, marginTop: 8 }}>
            담보 선택 ({form.coverageInputs.length}개 선택됨)
          </div>
          <input
            className="coverage-pro-input"
            placeholder="담보명 검색..."
            value={coverageSearch}
            onChange={(e) => setCoverageSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />

          {/* 선택된 담보 — 금액 입력 */}
          {form.coverageInputs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>선택된 담보 금액 입력</div>
              {form.coverageInputs.map((ci) => (
                <div key={ci.rowKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 13, color: '#1a2744' }}>{ROW_KEY_LABEL[ci.rowKey]}</span>
                  <input
                    className="coverage-pro-input"
                    type="number"
                    placeholder="금액(원)"
                    value={ci.amount}
                    onChange={(e) => updateCoverageAmount(ci.rowKey, e.target.value)}
                    style={{ width: 140 }}
                  />
                  <button
                    type="button"
                    className="coverage-pro-btn"
                    style={{ padding: '4px 10px', fontSize: 12, color: '#ef4444' }}
                    onClick={() => toggleCoverageInput(ci.rowKey)}
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {/* 담보 선택 체크리스트 */}
          <div style={{
            maxHeight: 280,
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '6px 0',
            background: '#fafaf8',
          }}>
            {filteredCoverages.map(({ rowKey, label }) => {
              const selected = form.coverageInputs.some((ci) => ci.rowKey === rowKey)
              return (
                <label
                  key={rowKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 14px',
                    cursor: 'pointer',
                    background: selected ? '#eef5ff' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleCoverageInput(rowKey)}
                    style={{ accentColor: '#1a2744' }}
                  />
                  <span style={{ fontSize: 13, color: selected ? '#1a2744' : '#4b5563' }}>{label}</span>
                </label>
              )
            })}
            {filteredCoverages.length === 0 && (
              <div style={{ padding: 14, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                검색 결과가 없습니다.
              </div>
            )}
          </div>

          <div className="coverage-pro-actions" style={{ marginTop: 16, justifyContent: 'flex-start' }}>
            <button type="button" className="coverage-pro-btn primary" onClick={saveAddedContract}>
              상품 추가 저장
            </button>
            <button
              type="button"
              className="coverage-pro-btn"
              onClick={() => { setShowAddForm(false); setForm(emptyAddForm()); setCoverageSearch('') }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 제안 메모 ─────────────────────────────────────────────── */}
      <div className="coverage-pro-card coverage-pro-card-pad">
        <div className="coverage-pro-section-title">제안 메모</div>
        <textarea
          className="coverage-pro-textarea"
          value={proposal.memo}
          onChange={(e) => onChange({ ...proposal, memo: e.target.value })}
          placeholder="해지 이유, 보완 사유, 고객 희망 보험료 등을 정리하세요."
        />
      </div>
    </div>
  )
}

function formatWon(value: number) {
  return value ? `${Math.round(value).toLocaleString()}원` : '-'
}
