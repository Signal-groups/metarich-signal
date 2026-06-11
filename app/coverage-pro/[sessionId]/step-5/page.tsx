import { Suspense } from 'react'
import CoverageProWorkspace from '../../components/CoverageProWorkspace'
import type { StepNumber } from '../../../../lib/coverageAnalysis/types'

export default function Step5Page() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>로딩 중...</div>}>
      <CoverageProWorkspace initialStep={5 as StepNumber} />
    </Suspense>
  )
}
