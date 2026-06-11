import { Suspense } from 'react'
import CoverageProWorkspace from './components/CoverageProWorkspace'

export default function CoverageProPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>로딩 중...</div>}>
      <CoverageProWorkspace initialStep={1} />
    </Suspense>
  )
}

