'use client'

import { useState, useEffect } from 'react'

// ── 기준금액 항목 정의 ────────────────────────────────────────────────────
export type BenchmarkKey =
  | 'death'                  // 사망
  | 'cancer'                 // 암진단
  | 'cancer_similar'         // 유사암/소액암
  | 'brain'                  // 뇌혈관
  | 'brain_stroke'           // 뇌졸중
  | 'brain_hemorrhage'       // 뇌출혈
  | 'heart'                  // 심장질환
  | 'heart_ischemic'         // 허혈성심장
  | 'heart_mi'               // 급성심근경색
  | 'surgery'                // 수술비
  | 'nursing'                // 간병
  | 'driver'                 // 운전자
  | 'silson'                 // 실손 (0=없음, 1=있음)
  | 'fire'                   // 화재
  | 'cancer_major_benefit'   // 암주요치료비(급여)
  | 'cancer_major_nonbenefit'// 암주요치료비(비급여)
  | 'vascular_major'         // 순환계(뇌심)주요치료비

export type BenchmarkAmounts = Record<BenchmarkKey, number>

// ── rowKey → BenchmarkKey 매핑 ───────────────────────────────────────────
export const ROW_KEY_TO_BENCHMARK: Record<string, BenchmarkKey> = {
  death_general:          'death',
  death_disease:          'death',
  death_injury:           'death',
  cancer_general:         'cancer',
  cancer_similar:         'cancer_similar',
  brain_vascular:         'brain',
  brain_stroke:           'brain_stroke',
  brain_hemorrhage:       'brain_hemorrhage',
  heart_vascular:         'heart',
  heart_ischemic:         'heart_ischemic',
  heart_acute_mi:         'heart_mi',
  surgery_disease:        'surgery',
  surgery_injury:         'surgery',
  surgery_1_5:            'surgery',
  surgery_n_major:        'surgery',
  two_major_surgery:      'surgery',
  nursing_hospital:       'nursing',
  nursing_care_hospital:  'nursing',
  nursing_integrated:     'nursing',
  driver_accident:        'driver',
  driver_fine:            'driver',
  driver_lawyer:          'driver',
  silson_disease_inpatient:  'silson',
  silson_injury_inpatient:   'silson',
  silson_disease_outpatient: 'silson',
  silson_injury_outpatient:  'silson',
  cancer_major_benefit:      'cancer_major_benefit',
  cancer_major_nonbenefit:   'cancer_major_nonbenefit',
  vascular_major:            'vascular_major',
}

// ── 항목 메타 (표시 순서, 라벨, 단위) ───────────────────────────────────
interface BenchmarkItem {
  key: BenchmarkKey
  label: string
  unit: string       // '만원' | '만원/일' | '여부'
  group: string
}

export const BENCHMARK_ITEMS: BenchmarkItem[] = [
  { key: 'death',                  label: '사망',                  unit: '만원',   group: '사망' },
  { key: 'cancer',                 label: '암진단',                unit: '만원',   group: '암' },
  { key: 'cancer_similar',         label: '유사암 / 소액암',        unit: '만원',   group: '암' },
  { key: 'brain',                  label: '뇌혈관',                unit: '만원',   group: '2대질병' },
  { key: 'brain_stroke',           label: '└ 뇌졸중',             unit: '만원',   group: '2대질병' },
  { key: 'brain_hemorrhage',       label: '└ 뇌출혈',             unit: '만원',   group: '2대질병' },
  { key: 'heart',                  label: '심장질환',              unit: '만원',   group: '2대질병' },
  { key: 'heart_ischemic',         label: '└ 허혈성심장',          unit: '만원',   group: '2대질병' },
  { key: 'heart_mi',               label: '└ 급성심근경색',        unit: '만원',   group: '2대질병' },
  { key: 'cancer_major_benefit',   label: '암주요치료비(급여)',     unit: '만원',   group: '주요치료비' },
  { key: 'cancer_major_nonbenefit',label: '암주요치료비(비급여)',   unit: '만원',   group: '주요치료비' },
  { key: 'vascular_major',         label: '순환계주요치료비',       unit: '만원',   group: '주요치료비' },
  { key: 'surgery',                label: '수술비',                unit: '만원',   group: '기타' },
  { key: 'nursing',                label: '간병인 일당',           unit: '만원/일',group: '기타' },
  { key: 'driver',                 label: '운전자 (교통사고처리)',  unit: '만원',   group: '기타' },
  { key: 'silson',                 label: '실손보험',              unit: '여부',   group: '기타' },
  { key: 'fire',                   label: '화재보험',              unit: '만원',   group: '기타' },
]

// ── 프리셋 정의 (단위: 만원) ─────────────────────────────────────────────
// 40대 남성 사무직 기준 추정 월보험료
//   최소 ≈ 44,000원/월 (실손 제외, 핵심 담보만)
//   표준 ≈ 100,000원/월 (실손 포함, 종합 설계)
//   여유 ≈ 150,000원/월 (표준 대비 +50%)
export const BENCHMARK_PRESETS: Record<'min' | 'standard' | 'comfort', BenchmarkAmounts> = {
  min: {
    // 기본 보장만 (실손 제외) — 40대 기준 약 4.4만원/월
    death: 3000, cancer: 2000, cancer_similar: 500,
    brain: 1000, brain_stroke: 500, brain_hemorrhage: 500,
    heart: 1000, heart_ischemic: 500, heart_mi: 500,
    surgery: 100, nursing: 15, driver: 1000,
    silson: 0, fire: 0,
    cancer_major_benefit: 0, cancer_major_nonbenefit: 0, vascular_major: 0,
  },
  standard: {
    // 표준 종합보험 (실손 포함) — 40대 기준 약 10만원/월
    death: 5000, cancer: 3500, cancer_similar: 500,
    brain: 2500, brain_stroke: 1000, brain_hemorrhage: 1000,
    heart: 2000, heart_ischemic: 1000, heart_mi: 1000,
    surgery: 200, nursing: 20, driver: 2000,
    silson: 1, fire: 1000,
    cancer_major_benefit: 300, cancer_major_nonbenefit: 300, vascular_major: 300,
  },
  comfort: {
    // 여유 종합보험 (표준 대비 ~50% 상승) — 40대 기준 약 15만원/월
    death: 10000, cancer: 5000, cancer_similar: 1000,
    brain: 3000, brain_stroke: 1500, brain_hemorrhage: 1500,
    heart: 3000, heart_ischemic: 1500, heart_mi: 1500,
    surgery: 500, nursing: 30, driver: 3000,
    silson: 1, fire: 2000,
    cancer_major_benefit: 500, cancer_major_nonbenefit: 500, vascular_major: 500,
  },
}

const LS_KEY = 'coverage_pro_benchmark'

export function loadBenchmark(): BenchmarkAmounts {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { ...BENCHMARK_PRESETS.standard, ...JSON.parse(raw) }
  } catch {}
  return { ...BENCHMARK_PRESETS.standard }
}

function saveBenchmark(amounts: BenchmarkAmounts) {
  localStorage.setItem(LS_KEY, JSON.stringify(amounts))
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────
export default function BenchmarkSettings({ onClose }: { onClose: () => void }) {
  const [amounts, setAmounts] = useState<BenchmarkAmounts>(() => ({ ...BENCHMARK_PRESETS.standard }))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setAmounts(loadBenchmark())
  }, [])

  const applyPreset = (preset: 'min' | 'standard' | 'comfort') => {
    setAmounts({ ...BENCHMARK_PRESETS[preset] })
    setSaved(false)
  }

  const handleChange = (key: BenchmarkKey, val: string) => {
    const n = parseFloat(val)
    setAmounts((prev) => ({ ...prev, [key]: isNaN(n) ? 0 : n }))
    setSaved(false)
  }

  const handleSave = () => {
    saveBenchmark(amounts)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // 그룹별로 묶기
  const groups = ['사망', '암', '2대질병', '주요치료비', '기타']

  const PRESET_LABELS = { min: '최소', standard: '표준', comfort: '여유' } as const

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        width: 520,
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#1a2744',
          color: '#fff',
          borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>⚙ 기준금액 설정</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              담보별 최소·표준·여유 기준금액을 설정합니다
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}
          >✕</button>
        </div>

        {/* 프리셋 버튼 */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center', marginRight: 8 }}>프리셋 적용:</span>
          {(['min', 'standard', 'comfort'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyPreset(preset)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: '1px solid #1a2744',
                background: preset === 'min' ? '#dbeafe' : preset === 'standard' ? '#1a2744' : '#c9a96e',
                color: preset === 'standard' ? '#fff' : '#1a2744',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
        </div>

        {/* 항목 리스트 */}
        <div style={{ overflowY: 'auto', padding: '8px 24px 8px', flex: 1 }}>
          {groups.map((group) => {
            const items = BENCHMARK_ITEMS.filter((i) => i.group === group)
            if (!items.length) return null
            return (
              <div key={group} style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                  paddingTop: 8,
                  borderTop: '1px solid #f1f5f9',
                }}>
                  {group}
                </div>
                {items.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 0',
                    }}
                  >
                    <span style={{
                      flex: 1,
                      fontSize: 13,
                      color: item.label.startsWith('└') ? '#64748b' : '#1a2744',
                      paddingLeft: item.label.startsWith('└') ? 8 : 0,
                    }}>
                      {item.label}
                    </span>
                    {item.unit === '여부' ? (
                      <select
                        value={amounts[item.key] ? '1' : '0'}
                        onChange={(e) => handleChange(item.key, e.target.value)}
                        style={{
                          width: 100,
                          padding: '4px 8px',
                          border: '1px solid #e2e8f0',
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        <option value="1">가입 필요</option>
                        <option value="0">해당없음</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          min={0}
                          step={item.unit === '만원/일' ? 5 : 100}
                          value={amounts[item.key]}
                          onChange={(e) => handleChange(item.key, e.target.value)}
                          style={{
                            width: 90,
                            padding: '4px 8px',
                            border: '1px solid #e2e8f0',
                            borderRadius: 6,
                            fontSize: 12,
                            textAlign: 'right',
                          }}
                        />
                        <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {item.unit}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* 저장 버튼 */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          background: '#fafaf8',
          borderRadius: '0 0 16px 16px',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              background: '#fff',
              fontSize: 13,
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 24px',
              border: 'none',
              borderRadius: 8,
              background: saved ? '#10b981' : '#1a2744',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {saved ? '✓ 저장됨' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
