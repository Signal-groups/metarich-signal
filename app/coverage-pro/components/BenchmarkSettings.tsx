'use client'

import { useState, useEffect } from 'react'

// ── 기준금액 항목 정의 ────────────────────────────────────────────────────
export type BenchmarkKey =
  // 사망
  | 'death'
  // 암 진단비
  | 'cancer'           | 'cancer_high'     | 'cancer_similar'
  // 암 치료비
  | 'cancer_chemo'     | 'cancer_radiation' | 'cancer_surgery'
  // 암 주요치료비
  | 'cancer_major_benefit' | 'cancer_major_nonbenefit'
  // 세부치료비 (표적·중입자·양성자·IMRT)
  | 'cancer_targeted'  | 'cancer_hadron'   | 'cancer_proton'   | 'cancer_imrt'
  // 뇌/심장 진단비
  | 'brain'            | 'brain_stroke'    | 'brain_hemorrhage'
  | 'heart'            | 'heart_ischemic'  | 'heart_mi'
  // 뇌/심장 수술·치료
  | 'brain_surgery'    | 'heart_surgery'
  | 'vascular_major_comp' | 'vascular_major_adv'
  // 후유장해 — 상해
  | 'disability_injury_80' | 'disability_injury_50' | 'disability_injury'
  // 후유장해 — 질병
  | 'disability_disease_80' | 'disability_disease_50' | 'disability_disease'
  // 간병
  | 'nursing_disease'       | 'nursing_injury'
  | 'nursing_hospital_care' | 'nursing_integrated'
  // 수술비
  | 'surgery'
  // 실손·운전자
  | 'silson' | 'driver' | 'driver_injury_14'
  // 치매·CI
  | 'ci' | 'dementia'
  // 산정특례
  | 'cancer_special' | 'brain_special' | 'heart_special'
  // 일상보장
  | 'fracture' | 'burn' | 'liability' | 'fire'

export type BenchmarkAmounts = Record<BenchmarkKey, number>

// ── rowKey → BenchmarkKey 매핑 ───────────────────────────────────────────
export const ROW_KEY_TO_BENCHMARK: Record<string, BenchmarkKey> = {
  // 사망
  death_general:              'death',
  death_disease:              'death',
  death_injury:               'death',
  // 암 진단비
  cancer_general:             'cancer',
  cancer_high_value:          'cancer_high',
  cancer_similar:             'cancer_similar',
  cancer_metastasis:          'cancer_similar',  // 전이암 → 유사암 계열
  // 암 치료비
  cancer_chemo:               'cancer_chemo',
  cancer_radiation:           'cancer_radiation',
  cancer_surgery:             'cancer_surgery',
  cancer_davinci:             'cancer_surgery',  // 다빈치 → 암수술
  // 암 주요치료비
  cancer_major_benefit:       'cancer_major_benefit',
  cancer_major_nonbenefit:    'cancer_major_nonbenefit',
  // 세부치료비
  cancer_targeted:            'cancer_targeted',
  cancer_cart:                'cancer_targeted',  // CAR-T → 표적
  cancer_hadron:              'cancer_hadron',
  cancer_proton:              'cancer_proton',
  cancer_imrt:                'cancer_imrt',
  // 뇌/심장 진단비
  brain_vascular:             'brain',
  brain_stroke:               'brain_stroke',
  brain_hemorrhage:           'brain_hemorrhage',
  heart_vascular:             'heart',
  heart_ischemic:             'heart_ischemic',
  heart_acute_mi:             'heart_mi',
  // 뇌/심장 수술·치료
  brain_surgery:              'brain_surgery',
  heart_surgery:              'heart_surgery',
  two_major_surgery:          'brain_surgery',   // 뇌심통합수술 → 뇌수술 키에 합산
  vascular_major:             'vascular_major_comp',
  two_major_icu:              'vascular_major_adv',
  two_major_thrombolysis:     'vascular_major_adv',
  // 후유장해
  disability_injury_80:       'disability_injury_80',
  disability_injury_50:       'disability_injury_50',
  disability_injury:          'disability_injury',
  disability_disease_80:      'disability_disease_80',
  disability_disease_50:      'disability_disease_50',
  disability_disease:         'disability_disease',
  // 간병
  nursing_hospital:           'nursing_disease',
  nursing_injury:             'nursing_injury',
  nursing_care_hospital:      'nursing_hospital_care',
  nursing_integrated:         'nursing_integrated',
  // 수술비
  surgery_disease:            'surgery',
  surgery_injury:             'surgery',
  surgery_1_5:                'surgery',
  surgery_n_major:            'surgery',
  surgery_advanced:           'surgery',
  surgery_comprehensive:      'surgery',
  surgery_disease_advanced:   'surgery',
  surgery_disease_comprehensive: 'surgery',
  surgery_disease_type:       'surgery',
  surgery_injury_advanced:    'surgery',
  surgery_injury_comprehensive: 'surgery',
  surgery_injury_type:        'surgery',
  // 실손
  silson_disease_inpatient:   'silson',
  silson_injury_inpatient:    'silson',
  silson_disease_outpatient:  'silson',
  silson_injury_outpatient:   'silson',
  silson_3major:              'silson',
  // 운전자
  driver_accident:            'driver',
  driver_fine:                'driver',
  driver_lawyer:              'driver',
  driver_civil_litigation:    'driver',
  driver_injury_14:           'driver_injury_14',
  // 치매·CI
  ci_diagnosis:               'ci',
  dementia_diagnosis:         'dementia',
  // 산정특례
  cancer_special_case:        'cancer_special',
  brain_special_case:         'brain_special',
  heart_special_case:         'heart_special',
  // 일상보장
  fracture_diagnosis:         'fracture',
  burn_diagnosis:             'burn',
  other_liability:            'liability',
}

// ── 항목 메타 ────────────────────────────────────────────────────────────
interface BenchmarkItem {
  key: BenchmarkKey
  label: string
  unit: string   // '만원' | '만원/일' | '여부'
  group: string
}

export const BENCHMARK_ITEMS: BenchmarkItem[] = [
  // ── 사망 ──────────────────────────────────────────────────────────────
  { key: 'death',                   label: '사망보험금',               unit: '만원',    group: '사망' },

  // ── 암 진단비 (생활비 기준) ────────────────────────────────────────────
  { key: 'cancer',                  label: '일반암 진단비',            unit: '만원',    group: '암 진단비' },
  { key: 'cancer_high',             label: '고액암 진단비',            unit: '만원',    group: '암 진단비' },
  { key: 'cancer_similar',          label: '유사암 / 소액암',          unit: '만원',    group: '암 진단비' },

  // ── 암 치료비 ─────────────────────────────────────────────────────────
  { key: 'cancer_chemo',            label: '약물 (항암약물치료비)',     unit: '만원',    group: '암 치료비' },
  { key: 'cancer_radiation',        label: '방사선 치료비',            unit: '만원',    group: '암 치료비' },
  { key: 'cancer_surgery',          label: '수술 (암수술비)',          unit: '만원',    group: '암 치료비' },

  // ── 암 주요치료비 ─────────────────────────────────────────────────────
  { key: 'cancer_major_benefit',    label: '암주요치료비 (급여)',      unit: '만원',    group: '암 주요치료비' },
  { key: 'cancer_major_nonbenefit', label: '암주요치료비 (비급여)',    unit: '만원',    group: '암 주요치료비' },

  // ── 세부치료비 ────────────────────────────────────────────────────────
  { key: 'cancer_targeted',         label: '표적항암약물 치료비',      unit: '만원',    group: '세부치료비' },
  { key: 'cancer_hadron',           label: '중입자 치료비',            unit: '만원',    group: '세부치료비' },
  { key: 'cancer_proton',           label: '양성자 치료비',            unit: '만원',    group: '세부치료비' },
  { key: 'cancer_imrt',             label: '표적항암방사선 (IMRT)',    unit: '만원',    group: '세부치료비' },

  // ── 뇌/심장 진단비 ────────────────────────────────────────────────────
  { key: 'brain',                   label: '뇌혈관 진단비',           unit: '만원',    group: '뇌/심장 진단비' },
  { key: 'brain_stroke',            label: '└ 뇌졸중 진단비',        unit: '만원',    group: '뇌/심장 진단비' },
  { key: 'brain_hemorrhage',        label: '└ 뇌출혈 진단비',        unit: '만원',    group: '뇌/심장 진단비' },
  { key: 'heart',                   label: '심장질환 진단비',         unit: '만원',    group: '뇌/심장 진단비' },
  { key: 'heart_ischemic',          label: '└ 허혈성심장',           unit: '만원',    group: '뇌/심장 진단비' },
  { key: 'heart_mi',                label: '└ 급성심근경색',         unit: '만원',    group: '뇌/심장 진단비' },

  // ── 뇌/심장 수술·치료 ─────────────────────────────────────────────────
  { key: 'brain_surgery',           label: '뇌 수술비',              unit: '만원',    group: '뇌/심장 수술·치료' },
  { key: 'heart_surgery',           label: '심장 수술비',            unit: '만원',    group: '뇌/심장 수술·치료' },
  { key: 'vascular_major_comp',     label: '주요치료비 (종합)',       unit: '만원',    group: '뇌/심장 수술·치료' },
  { key: 'vascular_major_adv',      label: '주요치료비 (상급)',       unit: '만원',    group: '뇌/심장 수술·치료' },

  // ── 후유장해 — 상해 ───────────────────────────────────────────────────
  { key: 'disability_injury_80',    label: '상해후유장해 80%',       unit: '만원',    group: '후유장해' },
  { key: 'disability_injury_50',    label: '상해후유장해 50%',       unit: '만원',    group: '후유장해' },
  { key: 'disability_injury',       label: '상해후유장해 3%~',       unit: '만원',    group: '후유장해' },
  // 후유장해 — 질병
  { key: 'disability_disease_80',   label: '질병후유장해 80%',       unit: '만원',    group: '후유장해' },
  { key: 'disability_disease_50',   label: '질병후유장해 50%',       unit: '만원',    group: '후유장해' },
  { key: 'disability_disease',      label: '질병후유장해 3%~',       unit: '만원',    group: '후유장해' },

  // ── 간병 ──────────────────────────────────────────────────────────────
  { key: 'nursing_disease',         label: '질병 간병인 (일당)',      unit: '만원/일', group: '간병' },
  { key: 'nursing_injury',          label: '상해 간병인 (일당)',      unit: '만원/일', group: '간병' },
  { key: 'nursing_hospital_care',   label: '요양병원 간병',           unit: '만원/일', group: '간병' },
  { key: 'nursing_integrated',      label: '간호간병통합 서비스',     unit: '여부',    group: '간병' },

  // ── 수술비 ────────────────────────────────────────────────────────────
  { key: 'surgery',                 label: '수술비 (종합)',           unit: '만원',    group: '수술비' },

  // ── 실손·운전자 ───────────────────────────────────────────────────────
  { key: 'silson',                  label: '실손보험',               unit: '여부',    group: '실손·운전자' },
  { key: 'driver',                  label: '운전자 (교통사고처리)',   unit: '만원',    group: '실손·운전자' },
  { key: 'driver_injury_14',        label: '자기부상치료비 (14급)',   unit: '만원',    group: '실손·운전자' },

  // ── 치매·CI ───────────────────────────────────────────────────────────
  { key: 'ci',                      label: 'CI보험 주계약',          unit: '만원',    group: '치매·CI' },
  { key: 'dementia',                label: '치매 진단비',            unit: '만원',    group: '치매·CI' },

  // ── 산정특례 ──────────────────────────────────────────────────────────
  { key: 'cancer_special',          label: '암 산정특례 진단비',     unit: '만원',    group: '산정특례' },
  { key: 'brain_special',           label: '뇌 산정특례 진단비',     unit: '만원',    group: '산정특례' },
  { key: 'heart_special',           label: '심장 산정특례 진단비',   unit: '만원',    group: '산정특례' },

  // ── 일상보장 ──────────────────────────────────────────────────────────
  { key: 'fracture',                label: '골절 진단비',            unit: '만원',    group: '일상보장' },
  { key: 'burn',                    label: '화상 진단비',            unit: '만원',    group: '일상보장' },
  { key: 'liability',               label: '일상배상책임',           unit: '만원',    group: '일상보장' },
  { key: 'fire',                    label: '화재 / 벌금',            unit: '여부',    group: '일상보장' },
]

// ── 프리셋 정의 ──────────────────────────────────────────────────────────
const DRIVER = 20000  // 교통사고처리지원금 2억 기준

export const BENCHMARK_PRESETS: Record<'min' | 'standard' | 'comfort', BenchmarkAmounts> = {
  min: {
    death: 5000,
    cancer: 2000,          cancer_high: 1500,        cancer_similar: 300,
    cancer_chemo: 200,     cancer_radiation: 200,    cancer_surgery: 300,
    cancer_major_benefit: 300,  cancer_major_nonbenefit: 500,
    cancer_targeted: 1000, cancer_hadron: 1000,      cancer_proton: 1000,  cancer_imrt: 500,
    brain: 1000,           brain_stroke: 500,         brain_hemorrhage: 500,
    heart: 500,            heart_ischemic: 1000,      heart_mi: 500,
    brain_surgery: 500,    heart_surgery: 500,
    vascular_major_comp: 300, vascular_major_adv: 300,
    disability_injury_80: 0, disability_injury_50: 0, disability_injury: 0,
    disability_disease_80: 0, disability_disease_50: 0, disability_disease: 0,
    nursing_disease: 3,    nursing_injury: 3,
    nursing_hospital_care: 3, nursing_integrated: 0,
    surgery: 200,
    silson: 1,             driver: DRIVER,            driver_injury_14: 0,
    ci: 0,                 dementia: 1000,
    cancer_special: 0,     brain_special: 0,          heart_special: 0,
    fracture: 50,          burn: 50,                  liability: 5000,       fire: 0,
  },
  standard: {
    death: 10000,
    cancer: 4000,          cancer_high: 3000,         cancer_similar: 600,
    cancer_chemo: 500,     cancer_radiation: 500,     cancer_surgery: 500,
    cancer_major_benefit: 1000, cancer_major_nonbenefit: 1000,
    cancer_targeted: 3000, cancer_hadron: 3000,       cancer_proton: 2000,  cancer_imrt: 1000,
    brain: 2000,           brain_stroke: 1000,        brain_hemorrhage: 1000,
    heart: 1000,           heart_ischemic: 2000,      heart_mi: 1000,
    brain_surgery: 1000,   heart_surgery: 1000,
    vascular_major_comp: 1000, vascular_major_adv: 500,
    disability_injury_80: 0, disability_injury_50: 0, disability_injury: 0,
    disability_disease_80: 0, disability_disease_50: 0, disability_disease: 0,
    nursing_disease: 5,    nursing_injury: 5,
    nursing_hospital_care: 5, nursing_integrated: 0,
    surgery: 500,
    silson: 1,             driver: DRIVER,            driver_injury_14: 1500,
    ci: 0,                 dementia: 2000,
    cancer_special: 500,   brain_special: 500,        heart_special: 500,
    fracture: 100,         burn: 100,                 liability: 10000,      fire: 0,
  },
  comfort: {
    death: 20000,
    cancer: 8000,          cancer_high: 5000,         cancer_similar: 1000,
    cancer_chemo: 1000,    cancer_radiation: 1000,    cancer_surgery: 1000,
    cancer_major_benefit: 2000, cancer_major_nonbenefit: 2000,
    cancer_targeted: 5000, cancer_hadron: 5000,       cancer_proton: 3000,  cancer_imrt: 2000,
    brain: 4000,           brain_stroke: 2000,        brain_hemorrhage: 2000,
    heart: 2000,           heart_ischemic: 4000,      heart_mi: 2000,
    brain_surgery: 2000,   heart_surgery: 2000,
    vascular_major_comp: 2000, vascular_major_adv: 1000,
    disability_injury_80: 0, disability_injury_50: 0, disability_injury: 0,
    disability_disease_80: 0, disability_disease_50: 0, disability_disease: 0,
    nursing_disease: 10,   nursing_injury: 10,
    nursing_hospital_care: 10, nursing_integrated: 1,
    surgery: 1000,
    silson: 1,             driver: DRIVER,            driver_injury_14: 3000,
    ci: 0,                 dementia: 5000,
    cancer_special: 1000,  brain_special: 1000,       heart_special: 1000,
    fracture: 200,         burn: 200,                 liability: 20000,      fire: 0,
  },
}

const LS_KEY = 'coverage_pro_benchmark'
const LS_CUSTOM_KEY = 'coverage_pro_benchmark_custom'
export const BENCHMARK_UPDATED_EVENT = 'coverage-pro-benchmark-updated'

export function loadBenchmark(): BenchmarkAmounts {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { ...BENCHMARK_PRESETS.standard, ...JSON.parse(raw) }
  } catch {}
  return { ...BENCHMARK_PRESETS.standard }
}

function saveBenchmark(amounts: BenchmarkAmounts) {
  localStorage.setItem(LS_KEY, JSON.stringify(amounts))
  window.dispatchEvent(new Event('storage'))
  window.dispatchEvent(new CustomEvent(BENCHMARK_UPDATED_EVENT, { detail: amounts }))
}

function loadCustomBenchmark(): BenchmarkAmounts | null {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_KEY)
    if (raw) return { ...BENCHMARK_PRESETS.standard, ...JSON.parse(raw) }
  } catch {}
  return null
}

function saveCustomBenchmark(amounts: BenchmarkAmounts) {
  localStorage.setItem(LS_CUSTOM_KEY, JSON.stringify(amounts))
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────
export default function BenchmarkSettings({ onClose }: { onClose: () => void }) {
  const [amounts, setAmounts] = useState<BenchmarkAmounts>(() => ({ ...BENCHMARK_PRESETS.standard }))
  const [saved, setSaved] = useState(false)
  const [customSaved, setCustomSaved] = useState(false)
  const [hasCustom, setHasCustom] = useState(false)

  useEffect(() => {
    setAmounts(loadBenchmark())
    setHasCustom(loadCustomBenchmark() !== null)
  }, [])

  const applyPreset = (preset: 'min' | 'standard' | 'comfort') => {
    setAmounts({ ...BENCHMARK_PRESETS[preset] })
    setSaved(false)
  }

  const applyCustom = () => {
    const custom = loadCustomBenchmark()
    if (custom) { setAmounts(custom); setSaved(false) }
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

  const handleSaveCustom = () => {
    saveCustomBenchmark(amounts)
    saveBenchmark(amounts)
    setHasCustom(true)
    setCustomSaved(true)
    setSaved(true)
    setTimeout(() => { setCustomSaved(false); setSaved(false) }, 2000)
  }

  const ALL_GROUPS = [
    '사망', '암 진단비', '암 치료비', '암 주요치료비', '세부치료비',
    '뇌/심장 진단비', '뇌/심장 수술·치료', '후유장해', '간병', '수술비',
    '실손·운전자', '치매·CI', '산정특례', '일상보장',
  ]
  const PRESET_LABELS = { min: '최소', standard: '표준', comfort: '여유' } as const

  // 그룹 색상
  const GROUP_COLORS: Record<string, string> = {
    '사망': '#ef4444',
    '암 진단비': '#8b5cf6',   '암 치료비': '#7c3aed',  '암 주요치료비': '#6d28d9', '세부치료비': '#5b21b6',
    '뇌/심장 진단비': '#1d4ed8', '뇌/심장 수술·치료': '#1e40af',
    '후유장해': '#0369a1',
    '간병': '#0f766e',
    '수술비': '#065f46',
    '실손·운전자': '#92400e',
    '치매·CI': '#b45309',
    '산정특례': '#78716c',
    '일상보장': '#4b5563',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        width: 580, maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#1a2744', color: '#fff', borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>⚙ 기준금액 설정</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              담보별 최소·표준·여유 기준금액을 설정합니다
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {/* 프리셋 버튼 */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b', marginRight: 4 }}>프리셋:</span>
          {(['min', 'standard', 'comfort'] as const).map((preset) => (
            <button key={preset} type="button" onClick={() => applyPreset(preset)} style={{
              padding: '6px 16px', borderRadius: 8,
              border: '1px solid #1a2744',
              background: preset === 'min' ? '#dbeafe' : preset === 'standard' ? '#1a2744' : '#c9a96e',
              color: preset === 'standard' ? '#fff' : '#1a2744',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {PRESET_LABELS[preset]}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {hasCustom && (
            <button type="button" onClick={applyCustom} style={{
              padding: '6px 14px', borderRadius: 8,
              border: '1px solid #7c3aed',
              background: '#ede9fe', color: '#7c3aed',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              ★ 개인설정 불러오기
            </button>
          )}
        </div>

        {/* 항목 리스트 */}
        <div style={{ overflowY: 'auto', padding: '8px 24px 8px', flex: 1 }}>
          {ALL_GROUPS.map((group) => {
            const items = BENCHMARK_ITEMS.filter((i) => i.group === group)
            if (!items.length) return null
            const color = GROUP_COLORS[group] || '#64748b'
            return (
              <div key={group} style={{ marginBottom: 8 }}>
                <div style={{
                  fontSize: 10, fontWeight: 900, color,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  marginBottom: 4, paddingTop: 10,
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 3, height: 12, borderRadius: 9999, background: color, display: 'inline-block' }} />
                  {group}
                </div>
                {items.map((item) => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <span style={{
                      flex: 1, fontSize: 13,
                      color: item.label.startsWith('└') ? '#64748b' : '#1a2744',
                      paddingLeft: item.label.startsWith('└') ? 10 : 0,
                    }}>
                      {item.label}
                    </span>
                    {item.unit === '여부' ? (
                      <select
                        value={amounts[item.key] ? '1' : '0'}
                        onChange={(e) => handleChange(item.key, e.target.value)}
                        style={{ width: 100, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}
                      >
                        <option value="1">가입 필요</option>
                        <option value="0">해당없음</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number" min={0}
                          step={item.unit === '만원/일' ? 1 : 100}
                          value={amounts[item.key]}
                          onChange={(e) => handleChange(item.key, e.target.value)}
                          style={{
                            width: 90, padding: '4px 8px',
                            border: '1px solid #e2e8f0', borderRadius: 6,
                            fontSize: 12, textAlign: 'right',
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
          padding: '14px 24px', borderTop: '1px solid #e2e8f0',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          background: '#fafaf8', borderRadius: '0 0 16px 16px',
        }}>
          <button type="button" onClick={onClose} style={{
            padding: '8px 20px', border: '1px solid #e2e8f0',
            borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#64748b',
          }}>
            닫기
          </button>
          <button type="button" onClick={handleSaveCustom} style={{
            padding: '8px 20px', border: '1px solid #7c3aed',
            borderRadius: 8,
            background: customSaved ? '#7c3aed' : '#ede9fe',
            color: customSaved ? '#fff' : '#7c3aed',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            {customSaved ? '개인설정 저장됨 ✓' : '개인설정 저장'}
          </button>
          <button type="button" onClick={handleSave} style={{
            padding: '8px 20px', border: 'none',
            borderRadius: 8,
            background: saved ? '#10b981' : '#1a2744',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            {saved ? '저장됨 ✓' : '기준 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
