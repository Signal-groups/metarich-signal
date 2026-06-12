'use client'

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
  return (
    <aside className="coverage-pro-sidebar">
      <div className="coverage-pro-brand">
        <strong>보장분석 PRO</strong>
        <span>CRM 데이터 기반 상담 리포트 제작</span>
      </div>
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
        각 단계를 누르면 언제든 이전 입력으로 돌아가 수정할 수 있습니다. CRM 원본 데이터는 이 화면에서 바로 덮어쓰지 않습니다.
      </div>

      {/* ─ 설정 버튼 ─────────────────────────────────── */}
      <button
        type="button"
        onClick={onSettingsClick}
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          color: '#cbd5e1',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.13)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        기준금액 설정
      </button>
    </aside>
  )
}
