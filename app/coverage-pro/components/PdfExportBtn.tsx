'use client'

import { useState } from 'react'
import type { OutputConfig, ProContract } from '../../../lib/coverageAnalysis/types'

export default function PdfExportBtn({
  customerName,
  contracts,
  outputType,
  disabled,
}: {
  customerName: string
  contracts: ProContract[]
  outputType: OutputConfig['outputType']
  disabled?: boolean
}) {
  const [loading, setLoading] = useState(false)

  const exportPdfPreview = async () => {
    if (disabled || loading) return
    setLoading(true)
    try {
      const type = outputType === 'key_pdf' ? 'key' : 'full'
      const res = await fetch('/api/coverage-pro/pdf-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, contracts, type }),
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
        alert('팝업이 차단됐습니다. 브라우저에서 팝업을 허용해 주세요.')
      }
    } catch (err) {
      console.error('[PdfExportBtn]', err)
      alert('PDF 미리보기 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 엑셀 출력 모드에서는 PDF 버튼 숨김
  if (outputType === 'excel') return null

  return (
    <button
      type="button"
      className="coverage-pro-btn"
      disabled={disabled || loading}
      onClick={exportPdfPreview}
    >
      {loading ? 'PDF 준비 중...' : outputType === 'key_pdf' ? '주요보장 PDF' : '전체 PDF'}
    </button>
  )
}
