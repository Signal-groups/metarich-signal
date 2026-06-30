'use client'

import { useState } from 'react'
import type { OutputConfig, ProContract, RemodelProposal } from '../../../lib/coverageAnalysis/types'

type ImageItem = { path: string; label: string }
type ImageCategory = { category: string; items: ImageItem[] }

const IMAGE_CATALOG: ImageCategory[] = [
  {
    category: '뇌·심장',
    items: [
      { path: '/coverage-stats/brain-heart-scope-2605.png',             label: '뇌·심장 보장범위' },
      { path: '/coverage-stats/brain-heart-prevalence.png',             label: '뇌·심장 발생현황' },
      { path: '/coverage-stats/brain-heart-surgery-cost-2605.png',      label: '뇌·심장 수술비' },
      { path: '/coverage-stats/brain-heart-treatment-roadmap-2605.png', label: '뇌·심장 치료 로드맵' },
      { path: '/coverage-stats/heart-age-gender-cardiac-arrest.png',    label: '연령·성별 심정지 현황' },
      { path: '/coverage-stats/stroke-age-aftereffect.png',             label: '뇌졸중 후유증·연령' },
      { path: '/coverage-stats/stroke-patient-trend-exposure.png',      label: '뇌족중 환자 추이' },
      { path: '/coverage-stats/icu-care-cost-2605.png',                 label: '중환자실 치료비' },
    ],
  },
  {
    category: '암',
    items: [
      { path: '/coverage-stats/anticancer-scope.png',               label: '항암 보장범위' },
      { path: '/coverage-stats/cancer-treatment-roadmap-2605.png',  label: '암 치료 로드맵' },
      { path: '/coverage-stats/cancer-treatment-process.png',       label: '암 치료 과정' },
      { path: '/coverage-stats/cancer-target-cost-2605.png',        label: '표적항암 비용' },
      { path: '/coverage-stats/cancer-target-cost-detail-2605.png', label: '표적항암 비용 상세' },
      { path: '/coverage-stats/cancer-death-probability.png',       label: '암 사망 확률' },
      { path: '/coverage-stats/cancer-top5-gender.png',             label: '성별 암 TOP5' },
      { path: '/coverage-stats/cancer-treatment-cost-ratio.png',    label: '암 치료비 구성' },
    ],
  },
  {
    category: '수술·치료비',
    items: [
      { path: '/coverage-stats/surgery-type-compare-2605.png',        label: '수술 종류 비교' },
      { path: '/coverage-stats/surgery-type-vs-n-surgery-2605.png',   label: 'N대수술 비교' },
      { path: '/coverage-stats/major-surgery-cost-hospital-days.png', label: '주요 수술비·입원일' },
      { path: '/coverage-stats/special-case-2605.png',                label: '산정특레' },
      { path: '/coverage-stats/nhis-special-case-table.png',          label: '산정특레 표' },
    ],
  },
  {
    category: '사망·보장범위',
    items: [
      { path: '/coverage-stats/death-scope-2605.png',             label: '사망 보장범위' },
      { path: '/coverage-stats/death-status-by-age-gender.png',   label: '연령·성별 사망현황' },
      { path: '/coverage-stats/top-10-death-causes-gender.png',   label: '10대 사망원인' },
      { path: '/coverage-stats/disease-death-share-10year.png',   label: '10년간 사인 비율' },
    ],
  },
  {
    category: '간병·치매',
    items: [
      { path: '/coverage-stats/longterm-care-grade-cost-2605.png', label: '장기요양 등급별 비용' },
      { path: '/coverage-stats/dementia-status-2024.png',          label: '치매 현황 2024' },
      { path: '/coverage-stats/dementia-senior-patient-ratio.png', label: '치매 환자 비율' },
      { path: '/coverage-stats/caregiver-burden-depression.png',   label: '간병 부담·우울' },
    ],
  },
  {
    category: '운전자·기타',
    items: [
      { path: '/coverage-stats/driver-vs-auto-insurance.png',  label: '운전자 vs 자동차보험' },
      { path: '/coverage-stats/auto-vs-driver-coverage.png',   label: '자동차·운전자 비교' },
      { path: '/coverage-stats/liability-guide-2605.png',      label: '배상책임 가이드' },
      { path: '/coverage-stats/lifetime-medical-expense.png',  label: '평생 의료비' },
    ],
  },
]

// 레이더(방사형) 차트 SVG
const RADAR_AXES = [
  { label: '암진단비',  keys: ['cancer_general'],                                               rec: 50_000_000 },
  { label: '뇌진단비',  keys: ['brain_stroke', 'brain_hemorrhage', 'brain_vascular'],          rec: 40_000_000 },
  { label: '심장진단',  keys: ['heart_acute_mi', 'heart_ischemic'],                           rec: 40_000_000 },
  { label: '수술비',        keys: ['surgery_disease', 'surgery_injury', 'surgery_1_5'],            rec:  5_000_000 },
  { label: '실손의료',  keys: ['silson_disease_inpatient', 'silson_injury_inpatient'],        rec: 50_000_000 },
  { label: '사망보장',  keys: ['death_general', 'death_disease', 'death_injury'],             rec: 100_000_000 },
]

function sumAmountClient(contracts: ProContract[], ...keys: string[]): number {
  return contracts
    .flatMap((c) => c.coverages)
    .filter((cov) => keys.includes(cov.rowKey))
    .reduce((sum, cov) => sum + Number(cov.amount || 0) * 10000, 0)
}

function RadarChart({ contracts }: { contracts: ProContract[] }) {
  const N = RADAR_AXES.length
  const cx = 110, cy = 110, R = 80
  const ratios = RADAR_AXES.map((a) => Math.min(1, sumAmountClient(contracts, ...a.keys) / a.rec))

  function ptXY(ratio: number, i: number): [number, number] {
    const angle = (i * 2 * Math.PI / N) - Math.PI / 2
    return [cx + ratio * R * Math.cos(angle), cy + ratio * R * Math.sin(angle)]
  }

  const gridPolys = [0.25, 0.5, 0.75, 1.0].map((r) => {
    const pts = Array.from({ length: N }, (_, i) => ptXY(r, i))
    return (
      <polygon key={r}
        points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
        fill='none' stroke='#e2e8f0' strokeWidth={1}
      />
    )
  })

  const axisLines = Array.from({ length: N }, (_, i) => {
    const [x, y] = ptXY(1, i)
    return <line key={i} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke='#e2e8f0' strokeWidth={1} />
  })

  const actualPts = Array.from({ length: N }, (_, i) => ptXY(ratios[i], i))
  const polyPoints = actualPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  return (
    <svg viewBox='0 0 220 220' width='100%' height='100%'>
      {gridPolys}
      {axisLines}
      <polygon points={polyPoints} fill='rgba(26,39,68,0.15)' stroke='#1a2744' strokeWidth={2} />
      {actualPts.map(([x, y], i) => (
        <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={4} fill='#1a2744' />
      ))}
      {RADAR_AXES.map((a, i) => {
        const angle = (i * 2 * Math.PI / N) - Math.PI / 2
        const lr = R + 22
        const lx = cx + lr * Math.cos(angle)
        const ly = cy + lr * Math.sin(angle)
        const anchor = Math.cos(angle) > 0.15 ? 'start' : Math.cos(angle) < -0.15 ? 'end' : 'middle'
        const pct = Math.round(ratios[i] * 100)
        return (
          <g key={i}>
            <text x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor={anchor} fontSize={9} fill='#1a2744' fontWeight={700}>{a.label}</text>
            <text x={lx.toFixed(1)} y={(ly + 11).toFixed(1)} textAnchor={anchor} fontSize={8} fill='#64748b'>{pct}%</text>
          </g>
        )
      })}
    </svg>
  )
}

function ImagePickerModal({
  contracts,
  selected,
  onToggle,
  onConfirm,
  onCancel,
}: {
  contracts: ProContract[]
  selected: Set<string>
  onToggle: (path: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const [activeCategory, setActiveCategory] = useState(IMAGE_CATALOG[0].category)
  const currentItems = IMAGE_CATALOG.find((c) => c.category === activeCategory)?.items ?? []

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, width: 1000, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#1a2744' }}>자료실 이미지 선택</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>선택한 이미지가 PDF 6번 섹션에 추가됩니다 · {selected.size}개 선택됨</div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
        </div>

        {/* 주요 콘텐츠 */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* 왼쪽: 탭 + 이미지 그리드 */}
          <div style={{ flex: '0 0 56%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '10px 14px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              {IMAGE_CATALOG.map((cat) => {
                const selCount = cat.items.filter((i) => selected.has(i.path)).length
                return (
                  <button
                    key={cat.category}
                    onClick={() => setActiveCategory(cat.category)}
                    style={{
                      padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700,
                      background: activeCategory === cat.category ? '#1a2744' : '#e5e7eb',
                      color: activeCategory === cat.category ? '#fff' : '#374151',
                    }}
                  >
                    {cat.category}{selCount > 0 ? ` (${selCount})` : ''}
                  </button>
                )
              })}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {currentItems.map((item) => {
                  const isSelected = selected.has(item.path)
                  return (
                    <div
                      key={item.path}
                      onClick={() => onToggle(item.path)}
                      style={{
                        border: isSelected ? '2px solid #1a2744' : '2px solid #e5e7eb',
                        borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                        background: isSelected ? '#eff6ff' : '#fff',
                        position: 'relative',
                      }}
                    >
                      {isSelected && (
                        <div style={{
                          position: 'absolute', top: 5, right: 5, width: 20, height: 20,
                          background: '#1a2744', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 900,
                        }}>✓</div>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.path} alt={item.label} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                      <div style={{ padding: '5px 6px', fontSize: 10, fontWeight: 700, color: '#1a2744', textAlign: 'center' }}>
                        {item.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 오른쪽: 방사형 차트 */}
          <div style={{ flex: '0 0 44%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 13, color: '#1a2744' }}>보장 달성도</div>
            <div style={{ width: '100%', maxWidth: 240, aspectRatio: '1' }}>
              <RadarChart contracts={contracts} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 20px', width: '100%', maxWidth: 240 }}>
              {RADAR_AXES.map((a) => {
                const pct = Math.min(100, Math.round(sumAmountClient(contracts, ...a.keys) / a.rec * 100))
                const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'
                return (
                  <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#374151' }}>
                    <span>{a.label}</span>
                    <span style={{ fontWeight: 700, color }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 풋터 */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => {
              const allPaths = IMAGE_CATALOG.flatMap((c) => c.items.map((i) => i.path))
              allPaths.forEach((p) => { if (selected.has(p)) onToggle(p) })
            }}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: '#6b7280' }}
          >
            전체 해제
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>취소</button>
            <button
              onClick={onConfirm}
              style={{ background: '#1a2744', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
            >
              PDF 생성 ({selected.size}개 포함)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PdfExportBtn({
  customerName,
  contracts,
  outputType,
  disabled,
  proposal,
  advisorInfo,
}: {
  customerName: string
  contracts: ProContract[]
  outputType: OutputConfig['outputType']
  disabled?: boolean
  proposal?: RemodelProposal
  advisorInfo?: { name: string; phone: string }
}) {
  const [loading, setLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())

  const toggleImage = (path: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const exportPdf = async (images: string[]) => {
    if (disabled || loading) return
    setLoading(true)
    try {
      const type = outputType === 'key_pdf' ? 'key' : 'full'
      const res = await fetch('/api/coverage-pro/pdf-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, contracts, type, selectedImages: images, proposal, advisorInfo }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '알 수 없는 오류' }))
        alert(`PDF 생성 실패: ${String(err.error || '오류')}`)
        return
      }
      const html = await res.text()
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
      } else {
        alert('팝업이 차단됩니다. 브라우저에서 팝업을 허용해 주세요.')
      }
    } catch (err) {
      console.error('[PdfExportBtn]', err)
      alert('PDF 미리보기 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (outputType === 'excel') return null

  return (
    <>
      <button
        type='button'
        className='coverage-pro-btn'
        disabled={disabled || loading}
        onClick={() => { if (!disabled && !loading) setShowPicker(true) }}
      >
        {loading ? 'PDF 준비 중...' : outputType === 'key_pdf' ? '주요보장 PDF' : '전체 PDF'}
      </button>

      {showPicker && (
        <ImagePickerModal
          contracts={contracts}
          selected={selectedImages}
          onToggle={toggleImage}
          onConfirm={() => { setShowPicker(false); exportPdf([...selectedImages]) }}
          onCancel={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
