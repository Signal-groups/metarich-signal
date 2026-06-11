/**
 * POST /api/coverage-pro/excel-export
 * 2026 보장분석표 엑셀 다운로드
 *
 * Body: ExcelExportInput
 * Response: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 */

import { NextRequest, NextResponse } from 'next/server'
import { fillCoverageTemplate, templateExists } from '../../../../lib/coverageAnalysis/excelTemplate'
import type { ExcelExportInput } from '../../../../lib/coverageAnalysis/types'

export async function POST(req: NextRequest) {
  if (!templateExists()) {
    return NextResponse.json(
      { error: '엑셀 템플릿 파일을 찾을 수 없습니다.' },
      { status: 500 }
    )
  }

  let input: ExcelExportInput
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: '요청 데이터를 읽지 못했습니다.' }, { status: 400 })
  }

  if (!input.customerName) {
    return NextResponse.json({ error: 'customerName은 필수입니다.' }, { status: 400 })
  }

  if (!Array.isArray(input.contracts) || input.contracts.length === 0) {
    return NextResponse.json({ error: '계약 데이터가 없습니다.' }, { status: 400 })
  }

  try {
    const buffer = await fillCoverageTemplate(input)
    const safeName = encodeURIComponent(`${input.customerName}_보장분석표_2026`)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${safeName}.xlsx`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    console.error('[excel-export] error:', err)
    return NextResponse.json(
      { error: '엑셀 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
