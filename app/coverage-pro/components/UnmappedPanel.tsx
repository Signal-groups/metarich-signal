'use client'

import { useState } from 'react'
import { ROW_KEY_LABEL } from '../../../lib/coverageAnalysis/clientMapping'
import type { ProContract } from '../../../lib/coverageAnalysis/types'

// rowKey 선택지 — 자주 쓰이는 것 + 전체 목록 접근
const QUICK_OPTIONS: Array<{ label: string; rowKey: string }> = [
  { label: '암진단', rowKey: 'cancer_general' },
  { label: '유사암진단', rowKey: 'cancer_similar' },
  { label: '항암치료', rowKey: 'cancer_chemo' },
  { label: '뇌혈관진단', rowKey: 'brain_vascular' },
  { label: '뇌졸중', rowKey: 'brain_stroke' },
  { label: '뇌출혈', rowKey: 'brain_hemorrhage' },
  { label: '허혈성심장', rowKey: 'heart_ischemic' },
  { label: '급성심근경색', rowKey: 'heart_acute_mi' },
  { label: '중대질병(CI)', rowKey: 'ci_diagnosis' },
  { label: '치매진단', rowKey: 'dementia_diagnosis' },
  { label: '장기요양', rowKey: 'ltc_grade' },
  { label: '질병 일반수술', rowKey: 'surgery_disease' },
  { label: '질병 상급수술', rowKey: 'surgery_disease_advanced' },
  { label: '질병 종합수술', rowKey: 'surgery_disease_comprehensive' },
  { label: '질병 종수술', rowKey: 'surgery_disease_type' },
  { label: '질병 N대수술', rowKey: 'surgery_n_major' },
  { label: '상해 일반수술', rowKey: 'surgery_injury' },
  { label: '상해 상급수술', rowKey: 'surgery_injury_advanced' },
  { label: '상해 종합수술', rowKey: 'surgery_injury_comprehensive' },
  { label: '상해 종수술', rowKey: 'surgery_injury_type' },
  { label: '실비(상해통원)', rowKey: 'silson_injury_outpatient' },
  { label: '실비(질병통원)', rowKey: 'silson_disease_outpatient' },
  { label: '3대비급여', rowKey: 'silson_3major' },
  { label: '질병입원일당', rowKey: 'hospital_disease_daily' },
  { label: '질병 1인실입원', rowKey: 'hospital_disease_single_room' },
  { label: '상해입원일당', rowKey: 'hospital_injury_daily' },
  { label: '상해 1인실입원', rowKey: 'hospital_injury_single_room' },
  { label: '간병인(병원)', rowKey: 'nursing_hospital' },
  { label: '요양병원', rowKey: 'nursing_care_hospital' },
  { label: '상해후유장해', rowKey: 'disability_injury' },
  { label: '상해후유80%+', rowKey: 'disability_injury_80' },
  { label: '질병후유장해', rowKey: 'disability_disease' },
  { label: '고도장해/영구', rowKey: 'disability_injury_80' },
  { label: '일반사망', rowKey: 'death_general' },
  { label: '질병사망', rowKey: 'death_disease' },
  { label: '상해/재해사망', rowKey: 'death_injury' },
  { label: '교통사고처리', rowKey: 'driver_accident' },
  { label: '벌금', rowKey: 'driver_fine' },
  { label: '변호사선임', rowKey: 'driver_lawyer' },
  { label: '골절진단', rowKey: 'fracture_diagnosis' },
  { label: '화상진단', rowKey: 'burn_diagnosis' },
  { label: '암주요치료비', rowKey: 'cancer_major_benefit' },
  { label: '뇌심주요치료비', rowKey: 'vascular_major' },
  { label: '배상책임', rowKey: 'other_liability' },
]

interface UnmappedItem {
  contractId: string
  contractName: string
  coverageId: string
  coverageName: string
  amount: number
}

function collectUnmapped(contracts: ProContract[]): UnmappedItem[] {
  const items: UnmappedItem[] = []
  for (const c of contracts) {
    for (const cov of c.coverages) {
      if (!cov.rowKey || cov.rowKey === 'unknown') {
        items.push({
          contractId: c.id,
          contractName: `${c.company} ${c.productName}`,
          coverageId: cov.id,
          coverageName: cov.name,
          amount: cov.amount,
        })
      }
    }
  }
  return items
}

export default function UnmappedPanel({
  contracts,
  onUpdate,
}: {
  contracts: ProContract[]
  onUpdate: (updated: ProContract[]) => void
}) {
  const unmapped = collectUnmapped(contracts)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState(false)

  if (unmapped.length === 0) return null

  function handleSelect(covId: string, rowKey: string) {
    setSelections((prev) => ({ ...prev, [covId]: rowKey }))
  }

  function handleApply(item: UnmappedItem) {
    const rowKey = selections[item.coverageId]
    if (!rowKey) return
    const updated = contracts.map((c) => {
      if (c.id !== item.contractId) return c
      return {
        ...c,
        coverages: c.coverages.map((cov) =>
          cov.id === item.coverageId ? { ...cov, rowKey } : cov
        ),
      }
    })
    onUpdate(updated)
    setApplied((prev) => new Set([...prev, item.coverageId]))
  }

  function handleExclude(item: UnmappedItem) {
    const updated = contracts.map((c) => {
      if (c.id !== item.contractId) return c
      return {
        ...c,
        coverages: c.coverages.filter((cov) => cov.id !== item.coverageId),
      }
    })
    onUpdate(updated)
    setApplied((prev) => new Set([...prev, item.coverageId]))
  }

  function handleApplyAll() {
    let updated = [...contracts]
    const newApplied = new Set(applied)
    for (const item of unmapped) {
      const rowKey = selections[item.coverageId]
      if (!rowKey || applied.has(item.coverageId)) continue
      updated = updated.map((c) => {
        if (c.id !== item.contractId) return c
        return {
          ...c,
          coverages: c.coverages.map((cov) =>
            cov.id === item.coverageId ? { ...cov, rowKey } : cov
          ),
        }
      })
      newApplied.add(item.coverageId)
    }
    onUpdate(updated)
    setApplied(newApplied)
  }

  const pending = unmapped.filter((i) => !applied.has(i.coverageId))
  const selectedCount = pending.filter((i) => selections[i.coverageId]).length

  return (
    <div style={{
      border: '2px solid #f59e0b',
      borderRadius: 10,
      background: '#fffbeb',
      overflow: 'hidden',
      marginBottom: 16,
    }}>
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: '100%', border: 'none', cursor: 'pointer',
          background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>
              미매핑 담보 {pending.length}개 — 분석에서 제외됨
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
              담보명을 인식하지 못한 항목입니다. 필요한 담보로 지정하거나 분석에서 제외하세요.
            </div>
          </div>
        </div>
        <span style={{ fontSize: 18, color: '#fff', fontWeight: 900 }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {!collapsed && (
        <div style={{ padding: '0 0 16px' }}>
          {/* 일괄 적용 바 */}
          {selectedCount > 0 && (
            <div style={{
              padding: '10px 18px',
              background: '#fef3c7',
              borderBottom: '1px solid #fde68a',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                {selectedCount}개 선택됨
              </span>
              <button
                type="button"
                onClick={handleApplyAll}
                style={{
                  padding: '6px 16px', fontSize: 12, fontWeight: 900,
                  background: '#d97706', color: '#fff', border: 'none',
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                선택 항목 전체 적용
              </button>
            </div>
          )}

          {/* 항목 목록 */}
          <div>
            {unmapped.map((item) => {
              const isApplied = applied.has(item.coverageId)
              const sel = selections[item.coverageId] || ''
              return (
                <div
                  key={item.coverageId}
                  style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid #fde68a',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 12,
                    alignItems: 'center',
                    opacity: isApplied ? 0.5 : 1,
                    background: isApplied ? '#f0fdf4' : undefined,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 900,
                        padding: '2px 7px', borderRadius: 999,
                        background: '#fde68a', color: '#92400e',
                      }}>
                        {item.contractName}
                      </span>
                      {isApplied && (
                        <span style={{ fontSize: 10, color: '#15803d', fontWeight: 900 }}>✓ 적용됨</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>
                      {item.coverageName}
                    </div>
                    <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>
                      {item.amount.toLocaleString()}만원
                      {sel && !isApplied && (
                        <span style={{ marginLeft: 8, color: '#059669' }}>
                          → {ROW_KEY_LABEL[sel] ?? sel}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isApplied && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        value={sel}
                        onChange={(e) => handleSelect(item.coverageId, e.target.value)}
                        style={{
                          border: '1px solid #fbbf24', borderRadius: 6,
                          padding: '6px 10px', fontSize: 12, fontWeight: 700,
                          background: '#fff', color: '#1a2744',
                          minWidth: 160, cursor: 'pointer',
                        }}
                      >
                        <option value="">-- 담보 선택 --</option>
                        {QUICK_OPTIONS.map((opt) => (
                          <option key={`${opt.rowKey}-${opt.label}`} value={opt.rowKey}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleApply(item)}
                        disabled={!sel}
                        style={{
                          padding: '6px 14px', fontSize: 12, fontWeight: 900,
                          background: sel ? '#1a2744' : '#e2e8f0',
                          color: sel ? '#fff' : '#94a3b8',
                          border: 'none', borderRadius: 6,
                          cursor: sel ? 'pointer' : 'not-allowed',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        적용
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExclude(item)}
                        style={{
                          padding: '6px 12px', fontSize: 12, fontWeight: 900,
                          background: '#fff',
                          color: '#ef4444',
                          border: '1px solid #fecaca',
                          borderRadius: 6,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        제외
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
