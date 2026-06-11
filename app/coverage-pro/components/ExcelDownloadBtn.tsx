'use client'

import { proContractsToExcelInputClient } from '../../../lib/coverageAnalysis/clientMapping'
import type { ProContract } from '../../../lib/coverageAnalysis/types'

export default function ExcelDownloadBtn({
  customerName,
  contracts,
}: {
  customerName: string
  contracts: ProContract[]
}) {
  const download = async () => {
    const input = proContractsToExcelInputClient(customerName || '고객', contracts)
    const response = await fetch('/api/coverage-pro/excel-export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) {
      alert('엑셀 생성에 실패했습니다.')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${customerName || '고객'}_보장분석표_2026.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button type="button" className="coverage-pro-btn gold" disabled={contracts.length === 0} onClick={download}>
      엑셀 1장 다운로드
    </button>
  )
}
