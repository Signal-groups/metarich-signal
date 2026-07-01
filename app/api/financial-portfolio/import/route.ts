import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// ── 타입 (financial-portfolio/page.tsx와 동일) ────────────────────────────
type Entry = {
  id: string
  category: string
  consumptionType?: '소비지출' | '비소비지출'
  name: string
  institution?: string
  amount: number
  payment?: number
  rate?: number
  memo?: string
}

type ParsedPortfolio = {
  customerName: string
  age?: number
  gender?: string
  job?: string
  creditGrade?: number
  memo?: string
  assets: Entry[]
  liabilities: Entry[]
  incomes: Entry[]
  expenses: Entry[]
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

// 시트 데이터를 2D 배열로 변환 (헤더 포함)
function sheetToRows(sheet: XLSX.WorkSheet): string[][] {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const rows: string[][] = []
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = []
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })]
      row.push(cell ? toStr(cell.v) : '')
    }
    rows.push(row)
  }
  return rows
}

// 섹션 헤더 행 찾기
function findSection(rows: string[][], keyword: string): number {
  return rows.findIndex(row => row.some(cell => cell.includes(keyword)))
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer' })

    const result: ParsedPortfolio = {
      customerName: '',
      assets: [],
      liabilities: [],
      incomes: [],
      expenses: [],
    }

    // ── ①고객기본정보 ─────────────────────────────────────────────────────
    const infoSheet = wb.Sheets['①고객기본정보']
    if (infoSheet) {
      const rows = sheetToRows(infoSheet)
      const fieldMap: Record<string, (v: string) => void> = {
        '고객명': v => { result.customerName = v },
        '생년월일': v => {
          // 나이 계산
          const y = parseInt(v.slice(0, 4))
          if (!isNaN(y)) result.age = new Date().getFullYear() - y
        },
        '성별': v => { result.gender = v },
        '직업': v => { result.job = v },
        '신용등급': v => { result.creditGrade = toNum(v) || undefined },
        '메모': v => { result.memo = v },
      }
      for (const row of rows) {
        for (const [key, setter] of Object.entries(fieldMap)) {
          const labelCell = row.find(c => c.includes(key))
          if (labelCell) {
            // 값은 labelCell 다음 열
            const idx = row.indexOf(labelCell)
            const val = row[idx + 1]
            if (val && !val.startsWith('예)')) setter(val)
          }
        }
      }
    }

    // ── ②자산현황 ─────────────────────────────────────────────────────────
    const assetSheet = wb.Sheets['②자산현황']
    if (assetSheet) {
      const rows = sheetToRows(assetSheet)
      const sections = ['금융자산', '부동산', '기타자산']
      const catMap: Record<string, string> = {
        '금융자산': '금융자산', '부동산': '부동산', '기타자산': '기타자산',
      }
      let currentCat = ''
      // 헤더 행 감지 (구분 | 상품명 | 금융기관 | 금액...)
      let isDataZone = false
      for (const row of rows) {
        const first = row[1] || row[0] || ''
        // 섹션 헤더 감지
        const secHit = sections.find(s => first.includes(s))
        if (secHit) { currentCat = catMap[secHit]; isDataZone = false; continue }
        // 표 헤더 감지 (구분, 상품명 등)
        if (first.includes('구분') && row.some(c => c.includes('금액') || c.includes('가치'))) {
          isDataZone = true; continue
        }
        if (!isDataZone || !currentCat) continue
        // 데이터 행: 구분(col1), 명칭(col2), 기관(col3), 금액(col4)
        const cat = first
        const name = row[2] || ''
        const institution = row[3] || ''
        const amount = toNum(row[4])
        const rate = toNum(row[5])
        const memo = row[6] || ''
        if (!name || name.startsWith('예)')) continue
        result.assets.push({
          id: uid(), category: currentCat + (cat ? ` — ${cat}` : ''),
          name, institution, amount: amount * 10000, rate: rate || undefined, memo: memo || undefined,
        })
      }
    }

    // ── ③부채현황 ─────────────────────────────────────────────────────────
    const debtSheet = wb.Sheets['③부채현황']
    if (debtSheet) {
      const rows = sheetToRows(debtSheet)
      let isDataZone = false
      for (const row of rows) {
        const first = row[1] || ''
        if (first.includes('구분') && row.some(c => c.includes('잔액'))) { isDataZone = true; continue }
        if (!isDataZone) continue
        const cat = first
        const name = row[2] || ''
        const institution = row[3] || ''
        const amount = toNum(row[4])
        const rate = toNum(row[5])
        const payment = toNum(row[6])
        const memo = row[7] || ''
        if (!name || name.startsWith('예)')) continue
        result.liabilities.push({
          id: uid(), category: cat || '대출',
          name, institution, amount: amount * 10000,
          rate: rate || undefined, payment: payment * 10000 || undefined, memo: memo || undefined,
        })
      }
    }

    // ── ④월수입 ────────────────────────────────────────────────────────────
    const incSheet = wb.Sheets['④월수입']
    if (incSheet) {
      const rows = sheetToRows(incSheet)
      let isDataZone = false
      for (const row of rows) {
        const first = row[1] || ''
        if (first.includes('구분') && row.some(c => c.includes('수입') || c.includes('소득'))) {
          isDataZone = true; continue
        }
        if (first.includes('금융') || first.includes('임대') || first.includes('기타소득')) {
          // 새 섹션 헤더 — 계속 파싱
          isDataZone = false; continue
        }
        if (!isDataZone) continue
        const cat = first
        const name = row[2] || ''
        // 세후 월수입 우선, 없으면 세전
        const amtAfter = toNum(row[4])
        const amtBefore = toNum(row[3])
        const amount = amtAfter || amtBefore
        const memo = row[5] || ''
        if (!name || name.startsWith('예)') || !amount) continue
        result.incomes.push({
          id: uid(), category: cat || '근로소득',
          name, amount: amount * 10000, memo: memo || undefined,
        })
      }
    }

    // ── ⑤월지출 ────────────────────────────────────────────────────────────
    const expSheet = wb.Sheets['⑤월지출']
    if (expSheet) {
      const rows = sheetToRows(expSheet)
      let isDataZone = false
      let currentType: '소비지출' | '비소비지출' = '소비지출'
      for (const row of rows) {
        const first = row[1] || ''
        if (first.includes('소비지출') && !first.includes('비소비')) {
          currentType = '소비지출'; isDataZone = false; continue
        }
        if (first.includes('비소비지출')) {
          currentType = '비소비지출'; isDataZone = false; continue
        }
        if (first.includes('분류') && row.some(c => c.includes('금액'))) {
          isDataZone = true; continue
        }
        if (!isDataZone) continue
        const cat = first  // 분류(=소비지출/비소비지출)
        const name = row[2] || ''
        const amount = toNum(row[3])
        const memo = row[5] || ''
        if (!name || name.startsWith('예)') || !amount) continue
        result.expenses.push({
          id: uid(),
          category: name,
          consumptionType: currentType,
          name,
          amount: amount * 10000,
          memo: memo || undefined,
        })
      }
    }

    if (!result.customerName) {
      return NextResponse.json({ error: '고객명을 찾을 수 없습니다. ①고객기본정보 시트를 확인해주세요.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, data: result })
  } catch (e) {
    console.error('[financial-portfolio/import]', e)
    return NextResponse.json({ error: '파일 파싱 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
