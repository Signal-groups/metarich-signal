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
}: {
  currentStep: StepNumber
  stepStatus: Partial<Record<StepNumber, StepStatus>>
  onMove: (step: StepNumber) => void
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
    </aside>
  )
}
