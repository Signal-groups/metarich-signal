/**
 * 보장분석표 Excel 공유 유틸리티
 * - COVERAGE_STRUCTURE: 행 템플릿
 * - findCoverageRowIndex: 담보명 → 행 인덱스 매핑
 * - buildStyledSheet: xlsx-js-style 시트 생성
 * - parseBojangtableSheet: 보장분석표 Excel 파싱 → structuredAnalysis 포맷
 */

export const COVERAGE_STRUCTURE = [
  { b: '가족보장자산', c: '사망', d: '일반' },
  { b: null, c: null, d: '질병' },
  { b: null, c: null, d: '재해(상해)' },
  { b: '생활보장자산', c: '암치료비', d: '일반암' },
  { b: null, c: null, d: '유사암/소액암' },
  { b: null, c: null, d: '암수술비' },
  { b: null, c: null, d: '항암 (방사선/약물)' },
  { b: null, c: null, d: '표적항암치료' },
  { b: null, c: null, d: '중입자치료' },
  { b: null, c: null, d: '암주요치료비' },
  { b: null, c: '2대질병치료비', d: '뇌혈관질환' },
  { b: null, c: null, d: '뇌졸중' },
  { b: null, c: null, d: '뇌출혈' },
  { b: null, c: null, d: '급성심근경색' },
  { b: null, c: null, d: '허혈성심장질환' },
  { b: null, c: null, d: '심혈관질환' },
  { b: null, c: null, d: '뇌혈관수술비' },
  { b: null, c: null, d: '심혈관수술비' },
  { b: null, c: null, d: '2대주요치료비' },
  { b: null, c: '후유장해', d: '질병 후유장해(3%~)' },
  { b: null, c: null, d: '상해 후유장해(3%~)' },
  { b: null, c: '골절', d: '골절 진단비' },
  { b: null, c: null, d: '골절 수술비' },
  { b: null, c: null, d: '5대골절 진단비' },
  { b: null, c: null, d: '5대골절 수술비' },
  { b: null, c: null, d: '깁스 치료비' },
  { b: null, c: '화상', d: '화상 진단비' },
  { b: null, c: null, d: '화상 수술비' },
  { b: '의료보장자산', c: '실손의료비', d: '상해입원의료비' },
  { b: null, c: null, d: '상해통원의료비' },
  { b: null, c: null, d: '질병입원의료비' },
  { b: null, c: null, d: '질병통원의료비' },
  { b: null, c: '수술비', d: '질병 수술비' },
  { b: null, c: null, d: '질병 1~5종수술비' },
  { b: null, c: null, d: '상해 수술비' },
  { b: null, c: null, d: '상해 1~5종수술비' },
  { b: null, c: null, d: 'N대 수술비' },
  { b: null, c: null, d: '창상봉합술' },
  { b: null, c: '입원', d: '질병 입원일당' },
  { b: null, c: null, d: '상해 입원일당' },
  { b: null, c: null, d: '교통상해입원일당' },
  { b: null, c: null, d: '상해간병지원금' },
  { b: null, c: null, d: '질병간병지원금' },
  { b: '운전자', c: null, d: '교통사고처리지원금' },
  { b: null, c: null, d: '교통사고벌금' },
  { b: null, c: null, d: '변호사선임비용' },
  { b: null, c: null, d: '자동차부상치료비' },
  { b: '치아', c: null, d: '임플란트' },
  { b: null, c: null, d: '크라운' },
  { b: '기타', c: null, d: '가족일상배상책임' },
  { b: null, c: null, d: '화재벌금' },
]

export function findCoverageRowIndex(normalizedName: string): number {
  const map: { keywords: string[]; idx: number }[] = [
    { idx: 0, keywords: ['일반사망', '사망보험금'] },
    { idx: 1, keywords: ['질병사망'] },
    { idx: 2, keywords: ['재해사망', '상해사망', '재해사고사망'] },
    { idx: 4, keywords: ['유사암', '소액암', '경계성암', '갑상선암', '피부암'] },
    { idx: 5, keywords: ['암수술비', '암수술'] },
    { idx: 6, keywords: ['항암방사선', '방사선치료', '약물항암', '항암약물', '항암치료비', '항암(방사선', '항암(약물'] },
    { idx: 7, keywords: ['표적항암', '표적치료', '면역항암'] },
    { idx: 8, keywords: ['중입자', '양성자'] },
    { idx: 9, keywords: ['암주요치료', '암집중치료', '암치료비집중'] },
    { idx: 3, keywords: ['일반암', '암진단비', '암진단', '통합암'] },
    { idx: 11, keywords: ['뇌졸중'] },
    { idx: 12, keywords: ['뇌출혈'] },
    { idx: 10, keywords: ['뇌혈관질환', '뇌혈관진단'] },
    { idx: 13, keywords: ['급성심근경색', '심근경색'] },
    { idx: 14, keywords: ['허혈성심장', '허혈성'] },
    { idx: 15, keywords: ['심혈관질환', '심장질환진단'] },
    { idx: 16, keywords: ['뇌혈관수술비', '뇌수술비'] },
    { idx: 17, keywords: ['심혈관수술비', '심장수술비'] },
    { idx: 18, keywords: ['2대주요치료', '주요치료비', '뇌심장집중', '3대집중치료', '2대집중치료'] },
    { idx: 19, keywords: ['질병후유장해', '질병후유'] },
    { idx: 20, keywords: ['상해후유장해', '상해후유', '재해후유'] },
    { idx: 23, keywords: ['5대골절진단', '5대골절'] },
    { idx: 24, keywords: ['5대골절수술'] },
    { idx: 21, keywords: ['골절진단비', '골절진단'] },
    { idx: 22, keywords: ['골절수술비', '골절수술'] },
    { idx: 25, keywords: ['깁스', '부목'] },
    { idx: 26, keywords: ['화상진단비', '화상진단'] },
    { idx: 27, keywords: ['화상수술비', '화상수술'] },
    { idx: 28, keywords: ['상해입원의료비', '상해입원실비'] },
    { idx: 29, keywords: ['상해통원의료비', '상해통원실비', '상해외래'] },
    { idx: 30, keywords: ['질병입원의료비', '질병입원실비'] },
    { idx: 31, keywords: ['질병통원의료비', '질병통원실비', '질병외래', '실손의료비', '실손'] },
    { idx: 33, keywords: ['질병1~5종', '질병종수술', '질병5종수술', '질병3종수술', '질병1종수술', '1~5종수술'] },
    { idx: 32, keywords: ['질병수술비'] },
    { idx: 35, keywords: ['상해1~5종', '상해종수술', '상해5종수술', '상해3종수술', '상해1종수술'] },
    { idx: 34, keywords: ['상해수술비'] },
    { idx: 36, keywords: ['n대수술', '64대수술', '7대수술', '32대수술', '100대수술'] },
    { idx: 37, keywords: ['창상봉합', '봉합술'] },
    { idx: 38, keywords: ['질병입원일당', '질병입원비'] },
    { idx: 39, keywords: ['상해입원일당', '상해입원비'] },
    { idx: 40, keywords: ['교통상해입원', '교통입원'] },
    { idx: 41, keywords: ['상해간병', '재해간병'] },
    { idx: 42, keywords: ['질병간병'] },
    { idx: 43, keywords: ['교통사고처리지원금', '교통사고처리', '대인배상'] },
    { idx: 44, keywords: ['교통사고벌금', '벌금'] },
    { idx: 45, keywords: ['변호사선임', '법률비용'] },
    { idx: 46, keywords: ['자동차부상', '부상치료비', '비탑승'] },
    { idx: 47, keywords: ['임플란트'] },
    { idx: 48, keywords: ['크라운', '보철'] },
    { idx: 49, keywords: ['가족일상배상', '일상배상', '일상생활배상'] },
    { idx: 50, keywords: ['화재벌금', '화재'] },
  ]
  for (const entry of map) {
    if (entry.keywords.some((kw) => normalizedName.includes(kw))) return entry.idx
  }
  return -1
}

export function toManwon(amount: number): number {
  return amount >= 100000 ? Math.round(amount / 10000) : amount
}

// ── 담보명 → category 변환 ─────────────────────────────────────────
export function coverageNameToCategory(name: string): string {
  const n = name.toLowerCase().replace(/[\s\-_·\(\)\/]/g, '')
  if (n.includes('암')) return 'cancer'
  if (n.includes('뇌')) return 'brain'
  if (n.includes('심장') || n.includes('심혈')) return 'heart'
  if (n.includes('수술')) return 'surgery'
  if (n.includes('입원') || n.includes('간병')) return 'hospitalization'
  if (n.includes('사망')) return 'death'
  if (n.includes('후유장해')) return 'disability'
  if (n.includes('운전') || n.includes('교통')) return 'driver'
  if (n.includes('치아') || n.includes('임플') || n.includes('크라운')) return 'dental'
  return 'other'
}

// ── xlsx-js-style 셀 스타일 헬퍼 ───────────────────────────────────
type CellStyle = {
  font?: { bold?: boolean; sz?: number; color?: { rgb: string }; name?: string }
  fill?: { fgColor: { rgb: string } }
  alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean }
  border?: { top?: any; bottom?: any; left?: any; right?: any }
}

const THIN_BORDER = { style: 'thin', color: { rgb: 'CCCCCC' } }
const MED_BORDER  = { style: 'medium', color: { rgb: '888888' } }
const allThin = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER }
const allMed  = { top: MED_BORDER,  bottom: MED_BORDER,  left: MED_BORDER,  right: MED_BORDER }

function sc(value: string | number | null, s: CellStyle): any {
  if (value === null || value === undefined) return { v: '', t: 's', s }
  return { v: value, t: typeof value === 'number' ? 'n' : 's', s }
}

export function colLetter(n: number): string {
  let result = ''
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result
    n = Math.floor(n / 26) - 1
  }
  return result
}

function cellRef(row: number, col: number): string {
  return `${colLetter(col)}${row + 1}`
}

/**
 * structuredAnalysis 포맷 → xlsx-js-style 시트 생성
 * data.policies = [{ company, product_name, start_date, payment_period, monthly_premium, coverages: [{coverage_name, amount}] }]
 */
export function buildStyledSheet(data: any, sheetName: string): any {
  const policies: any[] = Array.isArray(data.policies) ? data.policies
    : Array.isArray(data.contracts) ? data.contracts : []

  const NAVY       = '1A2744'
  const TEAL       = '1E6B7C'
  const GOLD       = 'C9A96E'
  const LIGHT_NAVY = '2D4A8A'
  const BG_HEADER  = 'E8F0F8'
  const BG_PREM    = 'FFF8E7'
  const BG_TOTAL   = 'E8F0F8'
  const WHITE      = 'FFFFFF'
  const TEXT_W     = 'FFFFFF'
  const TEXT_D     = '111111'

  const ws: any = {}
  const merges: any[] = []

  function setCell(row: number, col: number, value: any, style: CellStyle) {
    ws[cellRef(row, col)] = sc(value, style)
  }
  function merge(sr: number, sc2: number, er: number, ec: number) {
    merges.push({ s: { r: sr, c: sc2 }, e: { r: er, c: ec } })
  }

  // Row 1 (엑셀 2행): 고객명
  setCell(1, 1, sheetName, { font: { bold: true, sz: 16, color: { rgb: NAVY } }, fill: { fgColor: { rgb: WHITE } }, alignment: { horizontal: 'left', vertical: 'center' } })
  setCell(1, 4, '님', { font: { bold: true, sz: 13, color: { rgb: NAVY } }, alignment: { horizontal: 'left', vertical: 'center' } })
  setCell(1, 5, '내 보험 바로 알기 보장분석표', { font: { bold: true, sz: 14, color: { rgb: TEAL } }, alignment: { horizontal: 'left', vertical: 'center' } })
  merge(1, 5, 1, 15)

  // Row 3 (엑셀 4행): 헤더
  const hdrStyle: CellStyle = { font: { bold: true, sz: 10, color: { rgb: TEXT_W } }, fill: { fgColor: { rgb: NAVY } }, alignment: { horizontal: 'center', vertical: 'center' }, border: allMed }
  setCell(3, 1, 'NO.', hdrStyle)
  merge(3, 1, 3, 3)
  setCell(3, 4, '(단위 : 만원)', { ...hdrStyle, font: { bold: true, sz: 9, color: { rgb: GOLD } } })
  for (let i = 0; i < 11; i++) {
    setCell(3, 5 + i, i + 1, { ...hdrStyle, fill: { fgColor: { rgb: i % 2 === 0 ? NAVY : LIGHT_NAVY } } })
  }

  // Rows 4~8: 보험사 정보
  const INFO_LABELS = ['보  험  회  사', '상   품   명', '계   약   일', '납 입 기 간 & 보 장 기 간', '납 입 보 험 료']
  const labelStyle: CellStyle = { font: { bold: true, sz: 9, color: { rgb: NAVY } }, fill: { fgColor: { rgb: BG_HEADER } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: allThin }
  const dataStyle: CellStyle  = { font: { sz: 9, color: { rgb: TEXT_D } }, fill: { fgColor: { rgb: WHITE } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: allThin }
  const premStyle: CellStyle  = { font: { bold: true, sz: 9, color: { rgb: NAVY } }, fill: { fgColor: { rgb: BG_PREM } }, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin }

  INFO_LABELS.forEach((label, li) => {
    const r = 4 + li
    setCell(r, 1, label, labelStyle)
    merge(r, 1, r, 3)
    setCell(r, 4, li === 4 ? '합계' : null, { ...premStyle, font: { bold: true, sz: 9, color: { rgb: li === 4 ? TEAL : TEXT_D } } })
  })

  let totalPrem = 0
  policies.slice(0, 11).forEach((pol: any, pi: number) => {
    const POLICY_DATA = [
      pol.company || '',
      pol.product_name || pol.product || '',
      pol.start_date || '',
      pol.payment_period || '',
    ]
    POLICY_DATA.forEach((val, li) => setCell(4 + li, 5 + pi, val, dataStyle))
    const prem = toManwon(Number(pol.monthly_premium || pol.premium || 0))
    setCell(8, 5 + pi, prem || null, premStyle)
    totalPrem += prem || 0
  })
  setCell(8, 4, totalPrem || null, { ...premStyle, font: { bold: true, sz: 10, color: { rgb: TEAL } } })

  // 담보 구조
  const CAT_COLORS: Record<string, string> = {
    '가족보장자산': 'EBF4FE', '생활보장자산': 'FEF3EB', '의료보장자산': 'EBFEF3',
    '운전자': 'F8EBFE', '치아': 'FEF8EB', '기타': 'F5F5F5',
  }
  const SUB_COLORS: Record<string, string> = {
    '사망': 'D6EAF8', '암치료비': 'FDEBD0', '2대질병치료비': 'FADBD8',
    '후유장해': 'D5F5E3', '골절': 'D5F5E3', '화상': 'D5F5E3',
    '실손의료비': 'D5F5E3', '수술비': 'D5EAD1', '입원': 'D6EEF8',
  }

  let lastB = ''; let lastC = ''
  let bStartRow = -1; let cStartRow = -1

  const amountGrid: number[][] = Array.from({ length: 51 }, () => Array(11).fill(0))
  policies.slice(0, 11).forEach((pol: any, pi: number) => {
    const coverages: any[] = Array.isArray(pol.coverages) ? pol.coverages : []
    coverages.forEach((cov: any) => {
      const name = String(cov.coverage_name || cov.name || '').toLowerCase().replace(/[\s\-_·\(\)\/]/g, '')
      const amount = toManwon(Number(cov.amount || cov.coverage_amount || 0))
      if (!amount) return
      const ri = findCoverageRowIndex(name)
      if (ri >= 0 && ri < 51) amountGrid[ri][pi] += amount
    })
  })

  // 폴백: coverage_summary
  const hasAny = amountGrid.some(r => r.some(v => v > 0))
  if (!hasAny && data.coverage_summary) {
    const cs = data.coverage_summary
    ;[
      [3, 'cancer'], [4, 'similar_cancer'], [6, 'cancer_chemo'], [10, 'brain_vascular'],
      [11, 'brain_stroke'], [13, 'heart_mi'], [14, 'ischemic_heart'],
      [32, 'disease_surgery'], [34, 'injury_surgery'], [38, 'disease_hosp_daily'],
      [39, 'injury_hosp_daily'], [42, 'nursing_daily'],
    ].forEach(([idx, key]) => {
      const v = Number(cs[key as string]) || 0
      if (v > 0) amountGrid[idx as number][0] = v
    })
  }

  COVERAGE_STRUCTURE.forEach((rowDef, ri) => {
    const excelRow = 9 + ri
    const catB = rowDef.b || lastB
    const catC = rowDef.c || lastC
    const bgB = CAT_COLORS[catB] || 'F5F5F5'
    const bgC = SUB_COLORS[catC] || bgB

    const catStyle: CellStyle  = { font: { bold: true, sz: 8, color: { rgb: NAVY } }, fill: { fgColor: { rgb: bgB } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: allThin }
    const subStyle: CellStyle  = { font: { bold: true, sz: 8, color: { rgb: TEXT_D } }, fill: { fgColor: { rgb: bgC } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: allThin }
    const nameStyle: CellStyle = { font: { sz: 8, color: { rgb: TEXT_D } }, fill: { fgColor: { rgb: WHITE } }, alignment: { horizontal: 'left', vertical: 'center', wrapText: true }, border: allThin }
    const amtStyle: CellStyle  = { font: { sz: 8, color: { rgb: TEXT_D } }, fill: { fgColor: { rgb: WHITE } }, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin }
    const totalStyle: CellStyle = { font: { bold: true, sz: 8, color: { rgb: TEAL } }, fill: { fgColor: { rgb: BG_TOTAL } }, alignment: { horizontal: 'center', vertical: 'center' }, border: allThin }

    if (rowDef.b) {
      if (bStartRow >= 0) merge(bStartRow, 1, excelRow - 1, 1)
      setCell(excelRow, 1, rowDef.b, catStyle)
      bStartRow = excelRow; lastB = rowDef.b
    } else {
      setCell(excelRow, 1, null, catStyle)
    }
    if (rowDef.c) {
      if (cStartRow >= 0) merge(cStartRow, 2, excelRow - 1, 2)
      setCell(excelRow, 2, rowDef.c, subStyle)
      cStartRow = excelRow; lastC = rowDef.c
    } else {
      setCell(excelRow, 2, null, subStyle)
    }

    setCell(excelRow, 3, rowDef.d, nameStyle)
    const total = amountGrid[ri].reduce((s, v) => s + v, 0)
    setCell(excelRow, 4, total || null, totalStyle)
    amountGrid[ri].forEach((v, pi) => setCell(excelRow, 5 + pi, v || null, amtStyle))
  })

  const lastRow = 9 + COVERAGE_STRUCTURE.length - 1
  if (bStartRow >= 0) merge(bStartRow, 1, lastRow, 1)
  if (cStartRow >= 0) merge(cStartRow, 2, lastRow, 2)

  ws['!cols'] = [{ wch: 2 }, { wch: 10 }, { wch: 9 }, { wch: 14 }, { wch: 8 }, ...Array(11).fill({ wch: 9 })]
  ws['!rows'] = [
    { hpt: 8 }, { hpt: 22 }, { hpt: 8 }, { hpt: 18 }, { hpt: 16 },
    { hpt: 16 }, { hpt: 14 }, { hpt: 20 }, { hpt: 16 }, ...Array(51).fill({ hpt: 14 }),
  ]
  ws['!ref'] = `A1:${colLetter(15)}${9 + COVERAGE_STRUCTURE.length + 1}`
  ws['!merges'] = merges
  return ws
}

// ── 보장분석표 Excel → structuredAnalysis 포맷 파서 ────────────────────────
/**
 * XLSX 라이브러리로 읽은 workbook 시트를 structuredAnalysis 포맷으로 변환
 * @param sheet XLSX.WorkSheet
 * @returns { customerName, structuredAnalysis }
 */
export function parseBojangtableSheet(sheet: any): { customerName: string; structuredAnalysis: any } | null {
  // 헬퍼: 셀 값 읽기
  function cellVal(col: number, row: number): any {
    // row, col은 0-based
    const key = `${colLetter(col)}${row + 1}`
    const cell = sheet[key]
    return cell ? cell.v : null
  }
  function cellStr(col: number, row: number): string {
    const v = cellVal(col, row)
    return v !== null && v !== undefined ? String(v).trim() : ''
  }
  function cellNum(col: number, row: number): number {
    const v = cellVal(col, row)
    const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : 0
  }

  // 보장분석표 감지: F2셀(1,5)에 "보장분석표" 포함 여부
  const titleCell = cellStr(5, 1)
  if (!titleCell.includes('보장분석표')) return null

  // 고객명: B2 (row=1, col=1)
  const customerName = cellStr(1, 1).trim() || '고객'

  // 보험사 정보: 열 F(5)부터 P(15), 행 5~9 (0-based: 4~8)
  // row4=보험사, row5=상품명, row6=계약일, row7=납입기간, row8=납입보험료
  const policies: any[] = []
  for (let pi = 0; pi < 11; pi++) {
    const col = 5 + pi
    const company = cellStr(col, 4)
    if (!company) continue
    const product_name = cellStr(col, 5)
    const start_date   = cellStr(col, 6)
    const payment_period = cellStr(col, 7)
    const premRaw = cellNum(col, 8)
    const monthly_premium = premRaw > 0 ? (premRaw < 100000 ? premRaw * 10000 : premRaw) : 0

    // 담보 행: rows 10~60 (0-based: 9~59)
    const coverages: any[] = []
    for (let ri = 0; ri < COVERAGE_STRUCTURE.length; ri++) {
      const rowDef = COVERAGE_STRUCTURE[ri]
      const amount = cellNum(col, 9 + ri)
      if (!amount) continue

      // 담보명: D열(col=3)에서 읽거나 rowDef.d 사용
      const coverageName = cellStr(3, 9 + ri) || rowDef.d
      const amountWon = amount < 100000 ? amount * 10000 : amount // 만원 → 원 변환

      coverages.push({
        coverage_name: coverageName,
        amount: amountWon,
        category: coverageNameToCategory(coverageName),
      })
    }

    policies.push({
      company,
      product_name,
      start_date: normalizeExcelDate(start_date),
      payment_period,
      monthly_premium,
      coverages,
    })
  }

  if (policies.length === 0) return null

  const totalPremium = policies.reduce((s, p) => s + (p.monthly_premium || 0), 0)

  const structuredAnalysis = {
    version: 'bojangtable_v1',   // 원 단위 직접 저장 (만원×10000 변환 없음)
    amount_unit: '원',
    customer: { name: customerName },
    policies,
    monthly_premium: totalPremium,
    contract_count: policies.length,
  }

  return { customerName, structuredAnalysis }
}

/**
 * 엑셀 날짜 문자열 정규화
 * "13.03.26" → "2013-03-26", "2025-10-23" 유지
 */
function normalizeExcelDate(str: string): string {
  if (!str) return ''
  // YY.MM.DD
  if (/^\d{2}\.\d{2}\.\d{2}$/.test(str)) {
    const [yy, mm, dd] = str.split('.')
    const year = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`
    return `${year}-${mm}-${dd}`
  }
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  return str
}
