'use client'

import type { StepNumber, StepStatus } from '../../../lib/coverageAnalysis/types'

export default function StepIndicator({ stepStatus }: { stepStatus: Partial<Record<StepNumber, StepStatus>> }) {
  return (
    <div className="coverage-pro-progress" aria-label="진행 상태">
      {([1, 2, 3, 4, 5, 6, 7, 8] as StepNumber[]).map((step) => (
        <div key={step} className={stepStatus[step] === 'done' ? 'done' : ''} />
      ))}
    </div>
  )
}
