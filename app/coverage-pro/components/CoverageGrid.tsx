'use client'

import { useState } from 'react'
import type { ProContract, ProCoverage } from '../../../lib/coverageAnalysis/types'
import { ROW_KEY_LABEL } from '../../../lib/coverageAnalysis/clientMapping'

// 최대값으로 집계할 rowKey (실손·수술비·간병인 등 지급구조상 최고 한도 표시 항목)
const MAX_ROW_KEYS = new Set([
  'surgery_1_5', 'surgery_n_major', 'surgery_advanced', 'surgery_comprehensive',
  'surgery_disease_advanced', 'surgery_disease_comprehensive', 'surgery_disease_type',
  'surgery_injury_advanced', 'surgery_injury_comprehensive', 'surgery_injury_type',
  'silson_disease_inpatient', 'silson_injury_inpatient',
  'silson_disease_outpatient', 'silson_injury_outpatient',
  'silson_3major',
  'nursing_hospital', // 간병인 질병 — 최고 계약 기준
  'nursing_injury',   // 간병인 상해 — 최고 계약 기준
])

// 개수 집계할 rowKey (전체 합계 + 가입 담보 개수 함께 표시)
const COUNT_ROW_KEYS = new Set(['cancer_general'])

// 주요 보장 항목 — 카테고리별 정의
const CATEGORY_GROUPS = [
  {
    key: 'silson', label: '실손 의료비', color: '#0ea5e9',
    items: [
      { rowKey: 'silson_disease_inpatient',  label: '질병 입원 의료비' },
      { rowKey: 'silson_disease_outpatient', label: '질병 통원 의료비' },
      { rowKey: 'silson_injury_inpatient',   label: '상해 입원 의료비' },
      { rowKey: 'silson_injury_outpatient',  label: '상해 통원 의료비' },
      { rowKey: 'silson_3major',             label: '3대 비급여' },
    ],
  },
  {
    key: 'cancer', label: '암 진단 / 치료', color: '#8b5cf6',
    items: [
      { rowKey: 'cancer_general',          label: '일반암 진단비' },
      { rowKey: 'cancer_high_value',       label: '고액암 진단비' },
      { rowKey: 'cancer_similar',          label: '유사암 진단비' },
      { rowKey: 'benign_brain_tumor',      label: '양성뇌종양 진단비' },
      { rowKey: 'benign_tumor',            label: '양성종양 진단비' },
      { rowKey: 'cancer_special_case',     label: '암 산정특례' },
      { rowKey: 'cancer_chemo',            label: '항암약물 치료비' },
      { rowKey: 'cancer_radiation',        label: '방사선 치료비' },
      { rowKey: 'cancer_targeted',         label: '표적항암 치료비' },
      { rowKey: 'cancer_major_benefit',    label: '암 주요치료비(급여)' },
      { rowKey: 'cancer_major_nonbenefit', label: '암 주요치료비(비급여)' },
      { rowKey: 'cancer_surgery',          label: '암 수술비' },
    ],
  },
  {
    key: 'vascular', label: '뇌 / 심장 (2대질병)', color: '#ef4444',
    items: [
      { rowKey: 'brain_vascular',   label: '뇌혈관 진단비' },
      { rowKey: 'brain_stroke',     label: '뇌졸중 진단비' },
      { rowKey: 'brain_hemorrhage', label: '뇌출혈 진단비' },
      { rowKey: 'heart_ischemic',   label: '허혈성심장 진단비' },
      { rowKey: 'heart_acute_mi',   label: '급성심근경색 진단비' },
      { rowKey: 'heart_vascular',   label: '심장질환(부정맥 등)' },
      { rowKey: 'brain_special_case', label: '뇌혈관 산정특례' },
      { rowKey: 'heart_special_case', label: '심장 산정특례' },
      { rowKey: 'brain_surgery',    label: '뇌 수술비' },
      { rowKey: 'heart_surgery',    label: '심장 수술비' },
      { rowKey: 'vascular_major',   label: '2대 주요치료비' },
    ],
  },
  {
    key: 'disability', label: '후유장해', color: '#1a2744',
    items: [
      { rowKey: 'disability_injury',   label: '상해 후유장해 3~100%' },
      { rowKey: 'disability_disease',  label: '질병 후유장해 3~100%' },
    ],
  },
  {
    key: 'death', label: '사망 보장', color: '#334155',
    items: [
      { rowKey: 'death_general',       label: '일반 사망' },
      { rowKey: 'death_disease',       label: '질병 사망' },
      { rowKey: 'death_injury',        label: '상해(재해) 사망' },
    ],
  },
  {
    key: 'surgery', label: '수술비 / 입원일당', color: '#f59e0b',
    items: [
      { rowKey: 'surgery_disease_advanced',      label: '질병 상급 수술비' },
      { rowKey: 'surgery_disease_comprehensive', label: '질병 종합 수술비' },
      { rowKey: 'surgery_disease',               label: '질병 일반 수술비' },
      { rowKey: 'surgery_disease_type',          label: '질병 종수술비' },
      { rowKey: 'surgery_n_major',               label: '질병 N대 수술비' },
      { rowKey: 'surgery_injury_advanced',       label: '상해 상급 수술비' },
      { rowKey: 'surgery_injury_comprehensive',  label: '상해 종합 수술비' },
      { rowKey: 'surgery_injury',                label: '상해 일반 수술비' },
      { rowKey: 'surgery_injury_type',           label: '상해 종수술비' },
      { rowKey: 'hospital_disease_daily',        label: '질병 입원일당' },
      { rowKey: 'hospital_disease_single_room',  label: '질병 1인실 입원' },
      { rowKey: 'hospital_injury_daily',         label: '상해 입원일당' },
      { rowKey: 'hospital_injury_single_room',   label: '상해 1인실 입원' },
    ],
  },
  {
    key: 'care', label: '간병 / 요양', color: '#14b8a6',
    items: [
      { rowKey: 'nursing_hospital',      label: '간병인 사용 — 질병' },
      { rowKey: 'nursing_injury',        label: '간병인 사용 — 상해' },
      { rowKey: 'nursing_care_hospital', label: '간병인 지원 — 요양병원' },
      { rowKey: 'nursing_integrated',    label: '간병인 지원 — 간호간병통합' },
    ],
  },
  {
    key: 'driver', label: '운전자 특약', color: '#10b981',
    items: [
      { rowKey: 'driver_fine',     label: '교통사고 벌금' },
      { rowKey: 'driver_lawyer',   label: '변호사 선임비용' },
      { rowKey: 'driver_civil_litigation', label: '민사소송 법률비용' },
      { rowKey: 'driver_injury_14', label: '자동차사고부상치료비(14급)' },
      { rowKey: 'driver_accident', label: '교통사고 처리지원금' },
      { rowKey: 'other_liability', label: '일상생활배상책임' },
    ],
  },
  {
    key: 'extra', label: '치매 / CI / 기타', color: '#6366f1',
    items: [
      { rowKey: 'ci_diagnosis',        label: '중대질병(CI) 진단비' },
      { rowKey: 'dementia_diagnosis',  label: '치매 진단비' },
      { rowKey: 'ltc_grade',           label: '장기요양등급' },
      { rowKey: 'fracture_diagnosis',  label: '골절 진단비' },
      { rowKey: 'burn_diagnosis',      label: '화상 진단비' },
    ],
  },
]

// 최대값/합산 집계
// 수동 계약(MANUAL_CONTRACT_ID)에 값이 있는 rowKey는 수동 값으로 override (합산 아님)
function aggregateByRowKey(contracts: ProContract[]): Record<string, number> {
  const manualOverrides = new Set<string>()
  for (const c of contracts) {
    if (c.id !== MANUAL_CONTRACT_ID) continue
    for (const cov of c.coverages) {
      if (cov.rowKey && cov.rowKey !== 'unknown') manualOverrides.add(cov.rowKey)
    }
  }

  const sum: Record<string, number> = {}
  const max: Record<string, number> = {}
  for (const c of contracts) {
    for (const cov of c.coverages) {
      if (!cov.rowKey || cov.rowKey === 'unknown') continue
      if (manualOverrides.has(cov.rowKey) && c.id !== MANUAL_CONTRACT_ID) continue
      const v = Number(cov.amount || 0)
      if (MAX_ROW_KEYS.has(cov.rowKey)) {
        max[cov.rowKey] = Math.max(max[cov.rowKey] || 0, v)
      } else {
        sum[cov.rowKey] = (sum[cov.rowKey] || 0) + v
      }
    }
  }
  return { ...sum, ...max }
}

// COUNT_ROW_KEYS 담보 개수 집계 (계약 개수 아닌 coverage 항목 개수)
function countByRowKey(contracts: ProContract[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const c of contracts) {
    for (const cov of c.coverages) {
      if (!cov.rowKey || !COUNT_ROW_KEYS.has(cov.rowKey)) continue
      if (Number(cov.amount || 0) <= 0) continue
      counts[cov.rowKey] = (counts[cov.rowKey] || 0) + 1
    }
  }
  return counts
}

function coverageFlagsByRowKey(contracts: ProContract[]): Record<string, { renewal: boolean; ci: boolean }> {
  const flags: Record<string, { renewal: boolean; ci: boolean }> = {}
  for (const contract of contracts) {
    for (const cov of contract.coverages) {
      if (!cov.rowKey || cov.rowKey === 'unknown') continue
      const current = flags[cov.rowKey] ?? { renewal: false, ci: false }
      const text = `${contract.productName || ''} ${cov.name || ''}`.toLowerCase()
      current.renewal = current.renewal || Boolean(cov.isRenewal || contract.isRenewal)
      current.ci = current.ci || Boolean(cov.rowKey === 'ci_diagnosis' || text.includes('ci') || text.includes('중대질병') || text.includes('중대한'))
      flags[cov.rowKey] = current
    }
  }
  return flags
}

// rowKey === 'unknown'인 담보를 계약별로 그룹핑
function unknownCoveragesByContract(contracts: ProContract[]): Array<{
  contractId: string
  company: string
  productName: string
  coverages: Array<{ id: string; name: string; amount: number }>
}> {
  return contracts
    .filter((c) => c.id !== MANUAL_CONTRACT_ID)
    .map((c) => ({
      contractId: c.id,
      company: c.company || '보험사 미입력',
      productName: c.productName || '상품명 미입력',
      coverages: c.coverages
        .filter((cov) => !cov.rowKey || cov.rowKey === 'unknown')
        .map((cov) => ({ id: cov.id, name: cov.name || '담보명 없음', amount: Number(cov.amount || 0) })),
    }))
    .filter((g) => g.coverages.length > 0)
}

function fmtAmt(v: number): string {
  if (!v) return '-'
  if (v >= 10000) return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억원`
  if (v >= 1) return `${v.toLocaleString()}만원`
  return `${v}원`
}

// 수동 추가 계약 ID
const MANUAL_CONTRACT_ID = '__manual__'

function MiniStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: valueColor || '#fff' }}>{value}</div>
    </div>
  )
}

function ensureManualContract(contracts: ProContract[]): ProContract[] {
  if (contracts.find((c) => c.id === MANUAL_CONTRACT_ID)) return contracts
  return [
    ...contracts,
    {
      id: MANUAL_CONTRACT_ID,
      company: '수동 입력',
      productName: '직접 추가 담보',
      monthlyPremium: 0,
      status: 'active' as const,
      policyType: 'protection' as const,
      coverages: [],
    },
  ]
}

// 편집 폼 모달
function EditModal({
  label, currentAmount, onSave, onClose,
}: {
  label: string; currentAmount: number
  onSave: (amount: number) => void; onClose: () => void
}) {
  const [val, setVal] = useState(currentAmount > 0 ? String(currentAmount) : '')
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14,
        padding: '28px 28px 24px',
        minWidth: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 11, color: '#c9a96e', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 6 }}>
          담보 {currentAmount > 0 ? '수정' : '추가'}
        </div>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#1a2744', marginBottom: 20 }}>{label}</div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
          가입금액 (만원)
        </label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="number"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="예: 3000"
            autoFocus
            style={{
              flex: 1, border: '1.5px solid #1a2744', borderRadius: 8,
              padding: '10px 12px', fontSize: 15, fontWeight: 700,
              color: '#1a2744', outline: 'none',
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(Number(val) || 0) }}
          />
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#94a3b8', fontWeight: 700 }}>만원</span>
        </div>
        {/* 빠른 선택 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {[500, 1000, 2000, 3000, 5000, 10000].map((v) => (
            <button
              key={v} type="button"
              onClick={() => setVal(String(v))}
              style={{
                padding: '4px 10px', fontSize: 11, fontWeight: 700,
                border: '1px solid #e2e8f0', borderRadius: 9999,
                background: val === String(v) ? '#1a2744' : '#f8fafc',
                color: val === String(v) ? '#fff' : '#64748b',
                cursor: 'pointer',
              }}
            >
              {fmtAmt(v)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{
            padding: '9px 18px', fontSize: 13, fontWeight: 700,
            border: '1px solid #e2e8f0', borderRadius: 8,
            background: '#fff', color: '#64748b', cursor: 'pointer',
          }}>
            취소
          </button>
          {currentAmount > 0 && (
            <button type="button" onClick={() => onSave(0)} style={{
              padding: '9px 18px', fontSize: 13, fontWeight: 700,
              border: '1px solid #fee2e2', borderRadius: 8,
              background: '#fff', color: '#ef4444', cursor: 'pointer',
            }}>
              삭제
            </button>
          )}
          <button type="button" onClick={() => onSave(Number(val) || 0)} style={{
            padding: '9px 20px', fontSize: 13, fontWeight: 900,
            border: 'none', borderRadius: 8,
            background: '#1a2744', color: '#fff', cursor: 'pointer',
          }}>
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CoverageGrid({
  contracts,
  onUpdate,
}: {
  contracts: ProContract[]
  onUpdate?: (updated: ProContract[]) => void
}) {
  const [editTarget, setEditTarget] = useState<{ rowKey: string; label: string; currentAmount: number } | null>(null)
  const amounts = aggregateByRowKey(contracts)
  const counts = countByRowKey(contracts)
  const rowFlags = coverageFlagsByRowKey(contracts)
  const unknownGroups = unknownCoveragesByContract(contracts)

  const allItems = CATEGORY_GROUPS.flatMap((g) => g.items)
  const coveredCount = allItems.filter((item) => (amounts[item.rowKey] || 0) > 0).length
  const totalCount = allItems.length

  const knownKeys = new Set(allItems.map((i) => i.rowKey))
  const extraRows = Object.entries(amounts)
    .filter(([rk]) => !knownKeys.has(rk) && rk !== 'unknown')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)

  function handleSave(rowKey: string, newAmount: number) {
    if (!onUpdate) return
    let updated = [...contracts]
    updated = ensureManualContract(updated)
    updated = updated.map((c) => {
      if (c.id !== MANUAL_CONTRACT_ID) return c
      const existing = c.coverages.find((cv) => cv.rowKey === rowKey)
      let coverages: ProCoverage[]
      if (existing) {
        if (newAmount === 0) {
          // 0 마커로 유지 — 원본 계약 값이 다시 보이지 않도록 override 유지
          coverages = c.coverages.map((cv) =>
            cv.rowKey === rowKey ? { ...cv, amount: 0 } : cv
          )
        } else {
          coverages = c.coverages.map((cv) =>
            cv.rowKey === rowKey ? { ...cv, amount: newAmount } : cv
          )
        }
      } else {
        // 새 항목 추가 (newAmount === 0이어도 원본 삭제 마커로 추가)
        coverages = [
          ...c.coverages,
          {
            id: `manual-${rowKey}-${Date.now()}`,
            contractId: MANUAL_CONTRACT_ID,
            rowKey,
            name: ROW_KEY_LABEL[rowKey] ?? rowKey,
            amount: newAmount,
          },
        ]
      }
      return { ...c, coverages }
    })
    onUpdate(updated)
  }

  function handleExcludeCoverage(contractId: string, coverageId: string) {
    if (!onUpdate) return
    onUpdate(contracts.map((contract) => {
      if (contract.id !== contractId) return contract
      return {
        ...contract,
        coverages: contract.coverages.filter((coverage) => coverage.id !== coverageId),
      }
    }))
  }

  const canEdit = !!onUpdate

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
          <MiniStat label="계약 수" value={`${contracts.filter(c => c.id !== MANUAL_CONTRACT_ID).length}건`} />
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

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 0,
            }}>
              {groupItems.map((item, idx) => {
                const hasIt = item.amount > 0
                const isMaxKey = MAX_ROW_KEYS.has(item.rowKey)
                const flags = rowFlags[item.rowKey] ?? { renewal: false, ci: false }
                return (
                  <div key={item.rowKey} style={{
                    padding: '10px 16px',
                    borderRight: (idx + 1) % 2 === 1 ? '1px solid #f1f5f9' : undefined,
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    background: flags.renewal && flags.ci ? 'linear-gradient(135deg,#fff7ed 0%,#f5f3ff 100%)' : flags.renewal ? '#fff7ed' : flags.ci ? '#f5f3ff' : undefined,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: hasIt ? group.color : '#d1d5db',
                      }} />
                      <span style={{ fontSize: 12, color: hasIt ? '#1a2744' : '#94a3b8', fontWeight: hasIt ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {hasIt ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 12, fontWeight: 900, color: group.color, whiteSpace: 'nowrap' }}>
                            {fmtAmt(item.amount)}
                            {isMaxKey ? ' (최고)' : ''}
                            {COUNT_ROW_KEYS.has(item.rowKey) && (counts[item.rowKey] ?? 0) > 1
                              ? ` (${counts[item.rowKey]}개)` : ''}
                          </span>
                          {flags.renewal && (
                            <span style={{
                              fontSize: 9, fontWeight: 900, color: '#9a3412',
                              background: '#fed7aa', borderRadius: 9999, padding: '1px 6px',
                            }}>
                              갱신
                            </span>
                          )}
                          {flags.ci && (
                            <span style={{
                              fontSize: 9, fontWeight: 900, color: '#5b21b6',
                              background: '#ddd6fe', borderRadius: 9999, padding: '1px 6px',
                            }}>
                              CI
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          fontSize: 10, fontWeight: 900,
                          padding: '2px 8px', borderRadius: 9999,
                          background: '#f1f5f9', color: '#94a3b8', whiteSpace: 'nowrap',
                        }}>
                          미가입
                        </span>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setEditTarget({ rowKey: item.rowKey, label: item.label, currentAmount: item.amount })}
                          title={hasIt ? '수정' : '추가'}
                          style={{
                            width: 22, height: 22, borderRadius: 6,
                            border: '1px solid ' + (hasIt ? '#e2e8f0' : group.color),
                            background: hasIt ? '#f8fafc' : group.color + '18',
                            color: hasIt ? '#94a3b8' : group.color,
                            cursor: 'pointer', fontSize: 11, fontWeight: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}
                        >
                          {hasIt ? '✎' : '+'}
                        </button>
                      )}
                    </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 0 }}>
            {extraRows.map(([rk, amt], idx) => (
              <div key={rk} style={{
                padding: '10px 16px',
                borderRight: (idx + 1) % 2 === 1 ? '1px solid #f1f5f9' : undefined,
                borderBottom: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: '#64748b' }} />
                  <span style={{ fontSize: 12, color: '#1a2744', fontWeight: 600 }}>{ROW_KEY_LABEL[rk] ?? rk}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#64748b', whiteSpace: 'nowrap' }}>
                  {fmtAmt(amt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 미매핑 기타보장 — 회사/상품별로 담보명 목록 */}
      {unknownGroups.length > 0 && (
        <div className="coverage-pro-card" style={{ overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', borderBottom: '1px solid #f1f5f9', background: '#fafaf8',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 20, borderRadius: 2, background: '#94a3b8' }} />
              <span style={{ fontSize: 14, fontWeight: 900, color: '#1a2744' }}>기타 보장</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>자동 매핑 불가 — 따로 확인 또는 제외</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {unknownGroups.map((group, gi) => (
              <div key={group.contractId} style={{
                padding: '10px 18px',
                borderBottom: gi < unknownGroups.length - 1 ? '1px solid #f1f5f9' : undefined,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 900, color: '#fff',
                    background: '#64748b', borderRadius: 6,
                    padding: '2px 8px', whiteSpace: 'nowrap',
                  }}>
                    {group.company}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                    {group.productName}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.coverages.map((cov, ci) => (
                    <span key={cov.id || ci} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 11, fontWeight: 600,
                      padding: '2px 4px 2px 10px', borderRadius: 9999,
                      border: '1px solid #e2e8f0', background: '#f8fafc',
                      color: '#64748b', whiteSpace: 'nowrap',
                    }}>
                      {cov.name}{cov.amount > 0 ? ` ${fmtAmt(cov.amount)}` : ''}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleExcludeCoverage(group.contractId, cov.id)}
                          title="분석에서 제외"
                          style={{
                            border: '1px solid #fecaca',
                            background: '#fff',
                            color: '#ef4444',
                            borderRadius: 9999,
                            fontSize: 10,
                            fontWeight: 900,
                            padding: '1px 7px',
                            cursor: 'pointer',
                          }}
                        >
                          제외
                        </button>
                      )}
                    </span>
                  ))}
                </div>
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
      {editTarget && (
        <EditModal
          label={editTarget.label}
          currentAmount={editTarget.currentAmount}
          onClose={() => setEditTarget(null)}
          onSave={(amount) => {
            handleSave(editTarget.rowKey, amount)
            setEditTarget(null)
          }}
                />
      )}
    </div>
  )
}
