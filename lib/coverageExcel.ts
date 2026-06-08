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
  { b: '치매', c: null, d: '중증치매 진단비' },
  { b: null, c: null, d: '경증치매 진단비' },
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
    { idx: 43, keywords: ['중증치매', '치매진단', '치매'] },
    { idx: 44, keywords: ['경증치매', '초기치매'] },
    { idx: 45, keywords: ['교통사고처리지원금', '교통사고처리', '대인배상'] },
    { idx: 46, keywords: ['교통사고벌금', '벌금'] },
    { idx: 47, keywords: ['변호사선임', '법률비용'] },
    { idx: 48, keywords: ['자동차부상', '부상치료비', '비탑승'] },
    { idx: 49, keywords: ['임플란트'] },
    { idx: 50, keywords: ['크라운', '보철'] },
    { idx: 51, keywords: ['가족일상배상', '일상배상', '일상생활배상'] },
    { idx: 52, keywords: ['화재벌금', '화재'] },
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

  const amountGrid: number[][] = Array.from({ length: 53 }, () => Array(11).fill(0))
  policies.slice(0, 11).forEach((pol: any, pi: number) => {
    const coverages: any[] = Array.isArray(pol.coverages) ? pol.coverages : []
    coverages.forEach((cov: any) => {
      const name = String(cov.coverage_name || cov.name || '').toLowerCase().replace(/[\s\-_·\(\)\/]/g, '')
      const amount = toManwon(Number(cov.amount || cov.coverage_amount || 0))
      if (!amount) return
      const ri = findCoverageRowIndex(name)
      if (ri >= 0 && ri < 53) amountGrid[ri][pi] += amount
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

  // ─── 오른쪽 요약 섹션 ──────────────────────────────────────────────────────
  // Col 16(Q): 자동 간격, Col 17(R): 항목, Col 18(S): 금액, Col 19(T): 비고
  const SC = 17 // 시작 열 인덱스
  const colLabel = SC
  const colAmt   = SC + 1
  const colNote  = SC + 2

  // 집계값 (만원 단위)
  const sumRow = (ri: number) => amountGrid[ri].reduce((s, v) => s + v, 0)

  const cancerDiag    = sumRow(3)   // 일반암 진단비
  const similarCancer = sumRow(4)   // 유사암/소액암
  const chemo         = sumRow(6)   // 항암(방사선/약물) - 각 해당 금액
  const targeted      = sumRow(7)   // 표적항암치료
  const majorCancer   = sumRow(9)   // 암주요치료비

  // 뇌혈관 개별 (색상 구분)
  const brainVascular = sumRow(10)  // 뇌혈관질환 (일반)
  const brainStroke   = sumRow(11)  // 뇌졸중 → 노란색
  const brainBleed    = sumRow(12)  // 뇌출혈 → 빨간색
  const brainDiag     = Math.max(brainVascular, brainStroke, brainBleed)

  // 심혈관 개별 (색상 구분)
  const heartMI       = sumRow(13)  // 급성심근경색 → 빨간색
  const heartIschemic = sumRow(14)  // 허혈성심장질환 → 기본
  const heartVascular = sumRow(15)  // 심혈관질환(부정맥 등) → 파란색
  const heartDiag     = Math.max(heartMI, heartIschemic, heartVascular)

  const brainSurgery  = sumRow(16)  // 뇌혈관수술비
  const heartSurgery  = sumRow(17)  // 심혈관수술비
  const major2        = sumRow(18)  // 2대주요치료비

  const diseaseSurgery = sumRow(32) // 질병수술비
  const diseaseHospD   = sumRow(38) // 질병 입원일당
  const injuryHospD    = sumRow(39) // 상해 입원일당
  const nursingD       = sumRow(42) // 질병간병지원금
  const nursingI       = sumRow(41) // 상해간병지원금

  // 오른쪽 전용 스타일
  const R_RED   = 'C0392B'
  const R_GOLD  = 'B45309'
  const R_BLUE  = '1A5276'
  const R_GREEN = '1E6B3C'
  const R_YTOT  = 'FFF9C4' // 합계 배경
  const R_YTRAT = 'FFF3E0' // 치료비 배경
  const R_YGRN  = 'E8F5E9' // 의료 배경

  const rHdr = (bg: string): CellStyle => ({
    font: { bold: true, sz: 9, color: { rgb: TEXT_W } },
    fill: { fgColor: { rgb: bg } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: allMed,
  })
  const rSub = (bg: string): CellStyle => ({
    font: { bold: true, sz: 8, color: { rgb: NAVY } },
    fill: { fgColor: { rgb: bg } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: allThin,
  })
  const rLbl = (bg = WHITE): CellStyle => ({
    font: { sz: 8, color: { rgb: TEXT_D } },
    fill: { fgColor: { rgb: bg } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: allThin,
  })
  const rAmt = (bg = WHITE): CellStyle => ({
    font: { sz: 8, color: { rgb: NAVY } },
    fill: { fgColor: { rgb: bg } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: allThin,
  })
  const rNote = (bg = WHITE): CellStyle => ({
    font: { sz: 7, color: { rgb: '666666' } },
    fill: { fgColor: { rgb: bg } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: allThin,
  })
  const rTotal = (): CellStyle => ({
    font: { bold: true, sz: 9, color: { rgb: R_RED } },
    fill: { fgColor: { rgb: R_YTOT } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: allMed,
  })
  const rTotalLbl = (): CellStyle => ({
    font: { bold: true, sz: 8, color: { rgb: R_RED } },
    fill: { fgColor: { rgb: R_YTOT } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: allMed,
  })


  const setR = (row: number, lval: any, lStyle: CellStyle, aVal: number | null, aStyle: CellStyle, noteVal: string, nStyle: CellStyle) => {
    setCell(row, colLabel, lval, lStyle)
    setCell(row, colAmt, aVal, aStyle)
    setCell(row, colNote, noteVal, nStyle)
  }
  const mergeR = (row: number) => merge(row, colLabel, row, colNote)

  const rAmtColor = (fontColor: string, bg = WHITE): CellStyle => ({
    font: { bold: true, sz: 8, color: { rgb: fontColor } },
    fill: { fgColor: { rgb: bg } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: allThin,
  })

  let rr = 3

  // 메인 헤더
  setCell(rr, colLabel, '보장금액 요약', rHdr(TEAL))
  setCell(rr, colAmt,   '금액(만원)',    rHdr(TEAL))
  setCell(rr, colNote,  '비고',          rHdr(TEAL))
  rr++

  // 섹션 1: 진단비
  setCell(rr, colLabel, '■ 진단비 (1회성 지급)', rSub(BG_HEADER)); mergeR(rr); rr++
  setR(rr, '암 진단비 (일반암)',      rLbl(), cancerDiag    || null, rAmt(), cancerDiag    > 0 ? '진단 시 1회' : '', rNote()); rr++
  setR(rr, '암 진단비 (소액/유사암)', rLbl(), similarCancer || null, rAmt(), similarCancer > 0 ? '진단 시 1회' : '', rNote()); rr++
  setR(rr, '뇌혈관질환 진단비',       rLbl(),         brainVascular || null, rAmt(),                         brainVascular > 0 ? '진단 시 1회'   : '', rNote()); rr++
  setR(rr, '뇌졸중 진단비 [노란]',    rLbl('FFFDE7'), brainStroke   || null, rAmtColor('B8860B', 'FFFDE7'), brainStroke   > 0 ? '진단 1회 노란' : '', rNote('FFFDE7')); rr++
  setR(rr, '뇌출혈 진단비 [빨간]',    rLbl('FDECEA'), brainBleed    || null, rAmtColor(R_RED,    'FDECEA'), brainBleed    > 0 ? '진단 1회 빨간' : '', rNote('FDECEA')); rr++
  setR(rr, '급성심근경색 [빨간]',     rLbl('FDECEA'), heartMI       || null, rAmtColor(R_RED,    'FDECEA'), heartMI       > 0 ? '진단 1회 빨간' : '', rNote('FDECEA')); rr++
  setR(rr, '허혈성심장질환 진단비',   rLbl(),         heartIschemic || null, rAmt(),                        heartIschemic > 0 ? '진단 시 1회'   : '', rNote()); rr++
  setR(rr, '심혈관질환 [파란]',       rLbl('EBF4FE'), heartVascular || null, rAmtColor(R_BLUE,  'EBF4FE'), heartVascular > 0 ? '진단 1회 파란' : '', rNote('EBF4FE')); rr++

  // 섹션 2: 치료·수술비
  setCell(rr, colLabel, '■ 치료·수술비 (매년 지급)', rSub(R_YTRAT)); mergeR(rr); rr++
  setR(rr, '항암 약물치료비',             rLbl('FFFDE7'), chemo       || null, rAmt('FFFDE7'),              chemo       > 0 ? '매년 1회'   : '', rNote('FFFDE7')); rr++
  setR(rr, '항암 방사선치료비',           rLbl('FFFDE7'), chemo       || null, rAmt('FFFDE7'),              chemo       > 0 ? '매년 1회'   : '', rNote('FFFDE7')); rr++
  setR(rr, '표적/면역 항암치료 [별도]',  rLbl('FFF3E0'), targeted    || null, rAmtColor(R_GOLD, 'FFF3E0'), targeted    > 0 ? '비급여·매년' : '', rNote('FFF3E0')); rr++
  setR(rr, '암 주요치료비 [별도]',        rLbl('FFF3E0'), majorCancer || null, rAmtColor(R_GOLD, 'FFF3E0'), majorCancer > 0 ? '비급여·매년' : '', rNote('FFF3E0')); rr++
  setR(rr, '뇌혈관 수술비',  rLbl('FFFDE7'), brainSurgery   || null, rAmt('FFFDE7'), brainSurgery   > 0 ? '매년' : '', rNote('FFFDE7')); rr++
  setR(rr, '심혈관 수술비',  rLbl('FFFDE7'), heartSurgery   || null, rAmt('FFFDE7'), heartSurgery   > 0 ? '매년' : '', rNote('FFFDE7')); rr++
  setR(rr, '2대 주요치료비', rLbl('FFFDE7'), major2         || null, rAmt('FFFDE7'), major2         > 0 ? '매년' : '', rNote('FFFDE7')); rr++
  setR(rr, '질병 수술비',    rLbl('FFFDE7'), diseaseSurgery || null, rAmt('FFFDE7'), diseaseSurgery > 0 ? '매년' : '', rNote('FFFDE7')); rr++

  // 섹션 3: 일당·간병
  setCell(rr, colLabel, '■ 입원일당·간병 (1일 단위)', rSub(R_YGRN)); mergeR(rr); rr++
  setR(rr, '질병 입원일당',   rLbl('F1F8F2'), diseaseHospD || null, rAmt('F1F8F2'), diseaseHospD > 0 ? '만원/일' : '', rNote('F1F8F2')); rr++
  setR(rr, '상해 입원일당',   rLbl('F1F8F2'), injuryHospD  || null, rAmt('F1F8F2'), injuryHospD  > 0 ? '만원/일' : '', rNote('F1F8F2')); rr++
  setR(rr, '질병 간병지원금', rLbl('F1F8F2'), nursingD     || null, rAmt('F1F8F2'), nursingD     > 0 ? '만원/일' : '', rNote('F1F8F2')); rr++
  setR(rr, '상해 간병지원금', rLbl('F1F8F2'), nursingI     || null, rAmt('F1F8F2'), nursingI     > 0 ? '만원/일' : '', rNote('F1F8F2')); rr++

  rr++ // 빈 행

  // 섹션 4: 암 치료 예시
  setCell(rr, colLabel, '★ 암 치료시 예상 수령액', rHdr(R_GOLD)); mergeR(rr); rr++
  setCell(rr, colLabel, '[일반암] 항암+표적치료 시나리오', rSub(BG_HEADER)); mergeR(rr); rr++
  setR(rr, '① 암 진단비',            rLbl(), cancerDiag              || null, rAmt(), cancerDiag              > 0 ? '1회성'    : '', rNote()); rr++
  setR(rr, '② 항암 약물치료',        rLbl(), chemo                   || null, rAmt(), chemo                   > 0 ? '매년 1회' : '', rNote()); rr++
  setR(rr, '③ 항암 방사선치료',      rLbl(), chemo                   || null, rAmt(), chemo                   > 0 ? '매년 1회' : '', rNote()); rr++
  setR(rr, '④ 표적/면역/로봇 치료', rLbl(), (targeted + majorCancer) || null, rAmt(), (targeted + majorCancer) > 0 ? '매년 1회' : '', rNote()); rr++
  if (diseaseHospD > 0) { setR(rr, '⑤ 입원일당 30일', rLbl(), diseaseHospD * 30, rAmt(), diseaseHospD + '만원 x 30일', rNote()); rr++ }
  const c1total = cancerDiag + chemo * 2 + targeted + majorCancer + diseaseHospD * 30
  setCell(rr, colLabel, '★ 일반암 최종 합계', rTotalLbl()); setCell(rr, colAmt, c1total || null, rTotal()); setCell(rr, colNote, '초년도 기준', rNote(R_YTOT)); rr++; rr++

  setCell(rr, colLabel, '[소액암] 항암치료 시나리오', rSub(BG_HEADER)); mergeR(rr); rr++
  setR(rr, '① 소액암 진단비',   rLbl(), similarCancer || null, rAmt(), similarCancer > 0 ? '1회성'    : '', rNote()); rr++
  setR(rr, '② 항암 약물치료',   rLbl(), chemo         || null, rAmt(), chemo         > 0 ? '매년 1회' : '', rNote()); rr++
  setR(rr, '③ 항암 방사선치료', rLbl(), chemo         || null, rAmt(), chemo         > 0 ? '매년 1회' : '', rNote()); rr++
  const c2total = similarCancer + chemo * 2
  setCell(rr, colLabel, '★ 소액암 최종 합계', rTotalLbl()); setCell(rr, colAmt, c2total || null, rTotal()); setCell(rr, colNote, '초년도 기준', rNote(R_YTOT)); rr++; rr++

  // 섹션 5: 뇌·심장 예시
  setCell(rr, colLabel, '★ 뇌·심장 치료시 예상 수령액', rHdr(R_BLUE)); mergeR(rr); rr++
  setCell(rr, colLabel, '[뇌혈관] 수술+중환자실 시나리오', rSub(BG_HEADER)); mergeR(rr); rr++
  setR(rr, '① 뇌혈관 진단비',  rLbl(), brainDiag    || null, rAmt(), brainDiag    > 0 ? '1회성' : '', rNote()); rr++
  setR(rr, '② 뇌혈관 수술비',  rLbl(), brainSurgery || null, rAmt(), brainSurgery > 0 ? '매년'  : '', rNote()); rr++
  setR(rr, '③ 2대 주요치료비', rLbl(), major2       || null, rAmt(), major2       > 0 ? '매년'  : '', rNote()); rr++
  if (diseaseHospD > 0) { setR(rr, '④ 입원일당 30일', rLbl(), diseaseHospD * 30, rAmt(), diseaseHospD + '만원 x 30일', rNote()); rr++ }
  const b1total = brainDiag + brainSurgery + major2 + diseaseHospD * 30
  setCell(rr, colLabel, '★ 뇌혈관 최종 합계', rTotalLbl()); setCell(rr, colAmt, b1total || null, rTotal()); setCell(rr, colNote, '수술 1회 기준', rNote(R_YTOT)); rr++; rr++

  setCell(rr, colLabel, '[심혈관] 수술+중환자실 시나리오', rSub(BG_HEADER)); mergeR(rr); rr++
  setR(rr, '① 심혈관 진단비',  rLbl(), heartDiag    || null, rAmt(), heartDiag    > 0 ? '1회성' : '', rNote()); rr++
  setR(rr, '② 심혈관 수술비',  rLbl(), heartSurgery || null, rAmt(), heartSurgery > 0 ? '매년'  : '', rNote()); rr++
  setR(rr, '③ 2대 주요치료비', rLbl(), major2       || null, rAmt(), major2       > 0 ? '매년'  : '', rNote()); rr++
  if (diseaseHospD > 0) { setR(rr, '④ 입원일당 30일', rLbl(), diseaseHospD * 30, rAmt(), diseaseHospD + '만원 x 30일', rNote()); rr++ }
  const h1total = heartDiag + heartSurgery + major2 + diseaseHospD * 30
  setCell(rr, colLabel, '★ 심혈관 최종 합계', rTotalLbl()); setCell(rr, colAmt, h1total || null, rTotal()); setCell(rr, colNote, '수술 1회 기준', rNote(R_YTOT)); rr++; rr++

  // 섹션 6: 입원·간병 추가
  if (diseaseHospD > 0 || nursingD > 0 || diseaseSurgery > 0) {
    setCell(rr, colLabel, '★ 입원·수술·간병 추가 수령', rHdr(R_GREEN)); mergeR(rr); rr++
    if (diseaseSurgery > 0) { setR(rr, '질병수술비 (1회)', rLbl(R_YGRN), diseaseSurgery, rAmt(R_YGRN), '매년', rNote(R_YGRN)); rr++ }
    if (diseaseHospD > 0)   { setR(rr, '입원일당 30일',   rLbl(R_YGRN), diseaseHospD * 30, rAmt(R_YGRN), diseaseHospD + '만원/일 x 30', rNote(R_YGRN)); rr++ }
    if (nursingD > 0)        { setR(rr, '간병지원금 10일', rLbl(R_YGRN), nursingD * 10,    rAmt(R_YGRN), nursingD + '만원/일 x 10',    rNote(R_YGRN)); rr++ }
    if (nursingI > 0)        { setR(rr, '상해간병 10일',   rLbl(R_YGRN), nursingI * 10,    rAmt(R_YGRN), nursingI + '만원/일 x 10',    rNote(R_YGRN)); rr++ }
    const addTotal = diseaseSurgery + diseaseHospD * 30 + nursingD * 10 + nursingI * 10
    setCell(rr, colLabel, '★ 추가 합계 (30일 입원 기준)', rTotalLbl()); setCell(rr, colAmt, addTotal || null, rTotal()); setCell(rr, colNote, '30일 입원+간병 10일', rNote(R_YTOT)); rr++
  }

  // 열 너비 / 행 높이 / 영역 / 가로 출력
  ws['!cols'] = [
    { wch: 2 }, { wch: 10 }, { wch: 9 }, { wch: 14 }, { wch: 8 },
    ...Array(11).fill({ wch: 9 }),
    { wch: 2 },  // Q 간격
    { wch: 18 }, // R 항목
    { wch: 9 },  // S 금액
    { wch: 14 }, // T 비고
  ]
  ws['!rows'] = [
    { hpt: 8 }, { hpt: 22 }, { hpt: 8 }, { hpt: 18 }, { hpt: 16 },
    { hpt: 16 }, { hpt: 14 }, { hpt: 20 }, { hpt: 16 }, ...Array(51).fill({ hpt: 14 }),
  ]
  ws['!ref'] = 'A1:' + colLetter(colNote) + Math.max(lastRow + 2, rr + 1)
  ws['!merges'] = merges
  ws['!pageSetup'] = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  return ws
}

// ── 보장분석표 Excel → structuredAnalysis 포맷 파서 ────────────────────────
/**
 * XLSX 라이브러리로 읽은 workbook 시트를 structuredAnalysis 포맷으로 변환
 * @param sheet XLSX.WorkSheet
 * @returns { customerName, structuredAnalysis }
 */
export function parseBojangtableSheet(sheet: any): { customerName: string; structuredAnalysis: any } | null {
  function cellVal(col: number, row: number): any {
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

  const titleCell = cellStr(5, 1)
  if (!titleCell.includes('보장분석표')) return null

  const customerName = cellStr(1, 1).trim() || '고객'

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

    const coverages: any[] = []
    for (let ri = 0; ri < COVERAGE_STRUCTURE.length; ri++) {
      const rowDef = COVERAGE_STRUCTURE[ri]
      const amount = cellNum(col, 9 + ri)
      if (!amount) continue
      const coverageName = cellStr(3, 9 + ri) || rowDef.d
      const amountWon = amount < 100000 ? amount * 10000 : amount
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
    version: 'bojangtable_v1',
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
 */
function normalizeExcelDate(str: string): string {
  if (!str) return ''
  if (/^\d{2}\.\d{2}\.\d{2}$/.test(str)) {
    const [yy, mm, dd] = str.split('.')
    const year = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`
    return `${year}-${mm}-${dd}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  return str
}
