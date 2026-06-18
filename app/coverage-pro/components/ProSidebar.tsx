'use client'

import { useState } from 'react'
import type { StepNumber, StepStatus } from '../../../lib/coverageAnalysis/types'

export const PRO_STEPS: Array<{ id: StepNumber; title: string }> = [
  { id: 1, title: '고객 선택' },
  { id: 2, title: '기본 정보' },
  { id: 3, title: '현재 보험' },
  { id: 4, title: '보장 확인' },
  { id: 5, title: '분석 결과' },
  { id: 6, title: '리모델링' },
  { id: 7, title: '출력 · 다운로드' },
]

const TIER_LABELS = [
  { key: 'min',      label: '최소', color: '#3b82f6' },
  { key: 'standard', label: '표준', color: '#10b981' },
  { key: 'comfort',  label: '여유', color: '#c9a96e' },
] as const

const INS_TYPES = [
  { key: 'health',    label: '건강',    icon: '🏥' },
  { key: 'life',      label: '종신사망', icon: '🛡' },
  { key: 'shortpay',  label: '단기납',  icon: '⚡' },
  { key: 'dollar',    label: '달러연금', icon: '💵' },
] as const

export default function ProSidebar({
  currentStep,
  stepStatus,
  onMove,
  onSettingsClick,
}: {
  currentStep: StepNumber
  stepStatus: Partial<Record<StepNumber, StepStatus>>
  onMove: (step: StepNumber) => void
  onSettingsClick?: () => void
}) {
  const [activeTier, setActiveTier] = useState<'min' | 'standard' | 'comfort'>('standard')
  const [activeType, setActiveType] = useState<string>('health')

  const sideLabel: Record<string, string> = {
    min:      '기본 보장만으로 핵심을 지킵니다',
    standard: '가장 많이 선택하는 균형 설계',
    comfort:  '모든 담보를 여유롭게 갖춥니다',
  }

  return (
    <aside className="coverage-pro-sidebar">
      <div className="coverage-pro-brand">
        <strong>보장분석 PRO</strong>
        <span>CRM 데이터 기반 상담 리포트 제작</span>
      </div>

      {/* ─ 비교 기준 티어 ─────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#64748b',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 6, paddingLeft: 2,
        }}>비교 기준</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TIER_LABELS.map(({ key, label, color }) => (
            <button
              key={key} type="button"
              onClick={() => setActiveTier(key)}
              style={{
                flex: 1, padding: '7px 4px',
                borderRadius: 8, border: 'none',
                background: activeTier === key
                  ? color
                  : 'rgba(255,255,255,0.07)',
                color: activeTier === key ? '#fff' : '#94a3b8',
                fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: activeTier === key ? `0 2px 8px ${color}55` : 'none',
              }}
            >{label}</button>
          ))}
        </div>
        <div style={{
          fontSize: 10, color: '#475569', marginTop: 5, paddingLeft: 2, lineHeight: 1.4,
        }}>{sideLabel[activeTier]}</div>
      </div>

      {/* ─ 보험 유형 필터 ─────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#64748b',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 6, paddingLeft: 2,
        }}>보험 유형</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {INS_TYPES.map(({ key, label, icon }) => (
            <button
              key={key} type="button"
              onClick={() => setActiveType(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 8, border: 'none',
                background: activeType === key
                  ? 'rgba(201,169,110,0.18)'
                  : 'rgba(255,255,255,0.04)',
                color: activeType === key ? '#c9a96e' : '#94a3b8',
                fontSize: 12, fontWeight: activeType === key ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                borderLeft: activeType === key ? '2px solid #c9a96e' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 14 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─ 단계 목록 ─────────────────────────────────── */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: '#64748b',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        marginBottom: 6, paddingLeft: 2,
      }}>분석 단계</div>
      <div className="coverage-pro-step-list">
        {PRO_STEPS.map((step) => {
          const status = stepStatus[step.id] || 'pending'
          return (
            <button
              type="button"
              key={step.id}
              className={`coverage-pro-step${currentStep === step.id ? ' active' : ''}`}
              onClick={() => onMove(step.id)}
            >
              <span className="coverage-pro-step-num">{step.id}</span>
              <span className="coverage-pro-step-title">{step.title}</span>
              <span className="coverage-pro-step-state">
                {status === 'done' ? '완료' : status === 'warning' ? '확인' : ''}
              </span>
            </button>
          )
        })}
      </div>
      <div className="coverage-pro-muted">
        각 단계를 누르면 언제든 이전 입력으로 돌아가 수정할 수 있습니다.
      </div>

      {/* ─ 설정 버튼 ─────────────────────────────────── */}
      <button
        type="button"
        onClick={onSettingsClick}
        style={{
          marginTop: 'auto',
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '10px 14px',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, color: '#cbd5e1',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.13)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        담보 기준금액 설정
      </button>
    </aside>
  )
}
