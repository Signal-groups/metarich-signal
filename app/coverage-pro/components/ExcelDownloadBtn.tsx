'use client'

import { useState } from 'react'
import { proContractsToExcelInputClient } from '../../../lib/coverageAnalysis/clientMapping'
import type { ProContract } from '../../../lib/coverageAnalysis/types'

export default function ExcelDownloadBtn({
  customerName,
  contracts,
}: {
  customerName: string
  contracts: ProContract[]
}) {
  const [loading, setLoading] = useState(false)

  const download = async () => {
    if (loading) return
    setLoading(true)
    try {
      const input = proContractsToExcelInputClient(customerName || '고객', contracts)
      const response = await fetch('/api/coverage-pro/excel-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        let msg = '엑셀 생성에 실패했습니다.'
        try {
          const body = await response.json()
          if (body?.error) msg += '\n' + body.error
        } catch (_e) { /* ignore */ }
        alert(msg)
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${customerName || '고객'}_보장분석표_2026.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('엑셀 요청 중 오류가 발생했습니다.\n' + String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className="coverage-pro-btn gold"
      disabled={contracts.length === 0 || loading}
      onClick={download}
    >
      {loading ? '⏳ 생성 중...' : '엑셀 1장 다운로드'}
    </button>
  )
}
