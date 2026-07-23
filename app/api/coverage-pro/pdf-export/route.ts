// POST /api/coverage-pro/pdf-export
// 보장분석 리포트 HTML 생성 — 인쇄/PDF 프리뷰용

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import type { ProContract } from '../../../../lib/coverageAnalysis/types'

type RemodelProposal = {
  addContracts: ProContract[]
  removeContractIds: string[]
  memo: string
}
type AdvisorInfo = { name: string; phone: string }
type BenchmarkAmounts = Record<string, number>

type PdfExportInput = {
  customerName: string
  customerBirth?: string   // YYYY-MM-DD or similar; 보장기간 타임라인 나이 계산용
  contracts: ProContract[]
  type: 'full' | 'key'
  selectedImages?: string[]
  proposal?: RemodelProposal
  advisorInfo?: AdvisorInfo
  benchmark?: BenchmarkAmounts
}

// ── 보험사 고객센터 (금융감독원 공시 기준) ──────────────────────────────
const INSURER_CONTACTS: Array<{ name: string; phone: string; type: 'life' | 'nonlife'; aliases?: string[] }> = [
  // 생명보험사
  { name: 'ABL생명',      phone: '1588-6500', type: 'life', aliases: ['ABL'] },
  { name: 'AIA생명',      phone: '1588-9898', type: 'life', aliases: ['AIA'] },
  { name: 'KB라이프',     phone: '1588-9922', type: 'life', aliases: ['KB생명', 'KB라이프생명'] },
  { name: 'KDB생명',      phone: '1588-4040', type: 'life', aliases: ['KDB'] },
  { name: 'MetLife생명',  phone: '1588-9600', type: 'life', aliases: ['메트라이프', 'MetLife'] },
  { name: 'NH농협생명',   phone: '1544-4000', type: 'life', aliases: ['농협생명'] },
  { name: '교보생명',     phone: '1588-1001', type: 'life' },
  { name: '동양생명',     phone: '1577-1004', type: 'life' },
  { name: '라이나생명',   phone: '1588-0058', type: 'life', aliases: ['Lina'] },
  { name: '미래에셋생명', phone: '1588-0220', type: 'life' },
  { name: '삼성생명',     phone: '1588-3114', type: 'life' },
  { name: '신한라이프',   phone: '1588-5580', type: 'life', aliases: ['신한생명', '오렌지라이프'] },
  { name: '처브라이프',   phone: '1599-4600', type: 'life', aliases: ['Chubb생명'] },
  { name: '푸본현대생명', phone: '1577-3311', type: 'life', aliases: ['현대라이프', '푸본'] },
  { name: '하나생명',     phone: '1577-1112', type: 'life' },
  { name: '한화생명',     phone: '1588-6363', type: 'life' },
  { name: '흥국생명',     phone: '1588-2288', type: 'life' },
  { name: 'IBK연금보험',  phone: '1577-4117', type: 'life', aliases: ['IBK'] },
  { name: 'DGB생명',      phone: '1588-4770', type: 'life', aliases: ['DGB'] },
  // 손해보험사
  { name: 'DB손해보험',   phone: '1588-0100', type: 'nonlife', aliases: ['DB손보', 'DB화재', '동부화재'] },
  { name: 'KB손해보험',   phone: '1544-0114', type: 'nonlife', aliases: ['KB손보', 'KB화재'] },
  { name: 'MG손해보험',   phone: '1588-5959', type: 'nonlife', aliases: ['MG'] },
  { name: 'NH농협손해보험', phone: '1644-9000', type: 'nonlife', aliases: ['농협손해'] },
  { name: '롯데손해보험', phone: '1588-3344', type: 'nonlife', aliases: ['롯데손보'] },
  { name: '메리츠화재',   phone: '1566-7711', type: 'nonlife', aliases: ['메리츠'] },
  { name: '삼성화재',     phone: '1588-5114', type: 'nonlife' },
  { name: '한화손해보험', phone: '1566-8000', type: 'nonlife', aliases: ['한화손보'] },
  { name: '현대해상',     phone: '1588-5656', type: 'nonlife' },
  { name: '흥국화재',     phone: '1688-1688', type: 'nonlife' },
  { name: '우체국보험',   phone: '1599-0100', type: 'nonlife', aliases: ['우체국'] },
  { name: 'AXA손해보험',  phone: '1566-1566', type: 'nonlife', aliases: ['AXA'] },
  { name: 'AIG손해보험',  phone: '1544-2792', type: 'nonlife', aliases: ['AIG'] },
  { name: '처브손해보험', phone: '1544-0100', type: 'nonlife', aliases: ['Chubb'] },
  { name: '하나손해보험', phone: '1688-1688', type: 'nonlife', aliases: ['하나손보'] },
  { name: '캐롯손해보험', phone: '1566-1566', type: 'nonlife', aliases: ['캐롯'] },
  { name: '카카오손해보험', phone: '1588-8000', type: 'nonlife', aliases: ['카카오'] },
]

export async function POST(req: NextRequest) {
  let input: PdfExportInput
  try { input = await req.json() }
  catch { return NextResponse.json({ error: '요청 데이터를 읽지 못했습니다.' }, { status: 400 }) }
  if (!input.customerName) return NextResponse.json({ error: 'customerName은 필수입니다.' }, { status: 400 })
  if (!Array.isArray(input.contracts)) return NextResponse.json({ error: 'contracts 배열이 필요합니다.' }, { status: 400 })
  const html = await buildPrintHtml(input)
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

// ── 집계 헬퍼 ──────────────────────────────────────────────────────────────
// surgery_1_5 / surgery_n_major 은 보험사별 최대값 사용 (중복 합산 방지)
// 실손·수술비 특수종목: 중복 합산 금지, 계약 중 최대값 사용
const MAX_ROW_KEYS = new Set([
  'surgery_1_5', 'surgery_n_major',
  'surgery_disease_advanced', 'surgery_disease_comprehensive', 'surgery_disease_type',
  'surgery_injury_advanced', 'surgery_injury_comprehensive', 'surgery_injury_type',
  'silson_disease_inpatient', 'silson_injury_inpatient',
  'silson_disease_outpatient', 'silson_injury_outpatient',
  'silson_3major',
])

function sumAmount(contracts: ProContract[], ...rowKeys: string[]): number {
  let total = 0
  const seenSharedGroups = new Set<string>()
  for (const key of rowKeys) {
    if (MAX_ROW_KEYS.has(key)) {
      let max = 0
      for (const c of contracts)
        for (const cov of c.coverages)
          if (cov.rowKey === key) {
            if (cov.sharedGroup && seenSharedGroups.has(cov.sharedGroup)) continue
            max = Math.max(max, Number(cov.amount || 0) * 10000)
            if (cov.sharedGroup) seenSharedGroups.add(cov.sharedGroup)
          }
      total += max
    } else {
      for (const c of contracts)
        for (const cov of c.coverages)
          if (cov.rowKey === key) {
            if (cov.sharedGroup && seenSharedGroups.has(cov.sharedGroup)) continue
            total += Number(cov.amount || 0) * 10000
            if (cov.sharedGroup) seenSharedGroups.add(cov.sharedGroup)
          }
    }
  }
  return total
}

// vascular_major(2대주요치료비) → 하위 항목 파생
// 가입금액 = 혈전용해+제거치료+수술비, 50% = 중환자실
function deriveVascularMajor(contracts: ProContract[]) {
  const base = sumAmount(contracts, 'vascular_major')
  if (base > 0) {
    return { thrombolysis: base, surgery: base, icu: Math.round(base * 0.5) }
  }
  return {
    thrombolysis: sumAmount(contracts, 'two_major_thrombolysis'),
    surgery:      sumAmount(contracts, 'two_major_surgery'),
    icu:          sumAmount(contracts, 'two_major_icu'),
  }
}

function formatWon(v: number): string {
  if (!v) return '-'
  if (v >= 100_000_000) {
    const eok = v / 100_000_000
    return `${Number.isInteger(eok) ? eok.toFixed(0) : eok.toFixed(1)}억`
  }
  if (v >= 10_000)      return `${Math.round(v / 10_000).toLocaleString()}만원`
  return `${v.toLocaleString()}원`
}
function formatMonthly(v: number): string {
  if (!v) return '-'
  return `${Math.round(v).toLocaleString()}원`
}
function formatPercent(current: number, target: number): string {
  if (!target) return '0%'
  return `${Math.min(999, Math.round(current / target * 100))}%`
}
function benchmarkWon(benchmark: BenchmarkAmounts | undefined, key: string, fallbackWon: number): number {
  const value = Number(benchmark?.[key])
  return value > 0 ? value * 10_000 : fallbackWon
}
function escHtml(s: string | number | undefined): string {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function hasRenewalText(...values: Array<string | undefined>): boolean {
  const text = values.join(' ').toLowerCase()
  if (!text.trim()) return false
  if (text.includes('비갱신') || text.includes('nonrenewal') || text.includes('non-renewal')) return false
  return text.includes('갱신') || text.includes('renewal')
}

function isRenewalContract(contract: ProContract): boolean {
  return Boolean(contract.isRenewal || hasRenewalText(contract.productName, contract.paymentPeriod))
}

function isCiCoverage(contract: ProContract, coverage?: { rowKey?: string; name?: string }): boolean {
  const text = `${contract.productName || ''} ${coverage?.name || ''}`.toLowerCase()
  return Boolean(
    coverage?.rowKey === 'ci_diagnosis' ||
    text.includes('ci') ||
    text.includes('중대질병') ||
    text.includes('중대한')
  )
}

function coverageBadges(contract: ProContract, coverage?: { rowKey?: string; name?: string; isRenewal?: boolean }): string {
  if (!coverage) return ''
  const badges: string[] = []
  if (coverage.isRenewal || isRenewalContract(contract)) badges.push('<span class="cov-badge renewal">갱신</span>')
  if (isCiCoverage(contract, coverage)) badges.push('<span class="cov-badge ci">CI</span>')
  return badges.length ? `<div class="cov-badges">${badges.join('')}</div>` : ''
}

function imageMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'image/png'
}

async function publicImageToDataUrl(src: string): Promise<string | null> {
  if (!src.startsWith('/coverage-stats/')) return null
  const fileName = path.basename(src)
  const filePath = path.join(process.cwd(), 'public', 'coverage-stats', fileName)
  try {
    const buffer = await readFile(filePath)
    return `data:${imageMime(filePath)};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

// ── 보험 유형 분류 ─────────────────────────────────────────────────────────
function classifyType(c: ProContract): '보장성' | '저축성' | '실손' {
  const n = (c.productName + c.company).toLowerCase()
  if (n.includes('실손') || n.includes('실비') || n.includes('의료비보험')) return '실손'
  if (n.includes('저축') || n.includes('연금') || n.includes('적립') || n.includes('변액')) return '저축성'
  return '보장성'
}

function parseContractYearMonth(value?: string): { year: number; month: number; label: string } | null {
  const raw = String(value || '').trim()
  if (!raw) return null
  const nums = raw.match(/\d+/g)
  if (!nums?.length) return null
  let year = Number(nums[0])
  const month = Number(nums[1] || 1)
  if (year < 100) year += year >= 70 ? 1900 : 2000
  if (!year || !month) return null
  return { year, month, label: `${year}.${String(month).padStart(2, '0')}` }
}

function isLifeIns(company: string): boolean {
  const c = (company || '').replace(/\s/g, '')
  // 생명보험사: "생명", "라이프", "Life" 포함 여부로 판단
  return /생명|라이프|life/i.test(c) && !/손해|화재|해상/i.test(c)
}

interface SilsonInfo {
  generation: string       // e.g. '1세대 실손 (표준화 이전·손보)'
  insType: string          // '생보' | '손보' | '-'
  joinedAt: string
  coPayBenefit: string     // 급여 본인부담
  coPayNonBenefit: string  // 비급여 본인부담
  coPayMajor3: string      // 3대비급여 본인부담
  limitNote: string        // 입원 보장한도 등 참고 정보
  renewalRule: string
}

function inferSilsonInfo(contracts: ProContract[]): SilsonInfo {
  const NOTFOUND: SilsonInfo = {
    generation: '미가입 또는 확인 필요',
    insType: '-', joinedAt: '-',
    coPayBenefit: '-', coPayNonBenefit: '-', coPayMajor3: '-',
    limitNote: '-', renewalRule: '실손 담보 확인 필요',
  }

  const silson = contracts.find((contract) =>
    classifyType(contract) === '실손' ||
    contract.coverages.some((coverage) => coverage.rowKey.startsWith('silson_'))
  )
  if (!silson) return NOTFOUND

  const parsed = parseContractYearMonth(silson.contractDate)
  if (!parsed) {
    return { ...NOTFOUND, generation: '확인 필요', joinedAt: silson.contractDate || '-', renewalRule: '계약일 기준 확인' }
  }

  const ym = parsed.year * 100 + parsed.month
  const isLife = isLifeIns(silson.company)
  const insType = isLife ? '생보' : '손보'

  // ── 표준화 이전 손보 (2003.10 ~ 2008.4) ─────────────────────────────
  if (ym < 200805) {
    return {
      generation: '1세대 실손 (표준화 이전)',
      insType: '손보',
      joinedAt: parsed.label,
      coPayBenefit: '0%',
      coPayNonBenefit: '0%',
      coPayMajor3: '-',
      limitNote: '입원 3천~1억 / 통원 10~50만',
      renewalRule: '5년/100세 갱신형',
    }
  }
  // ── 표준화 이전 생보·손보 혼재 (2008.5 ~ 2009.9) ────────────────────
  if (ym < 200910) {
    return {
      generation: '1세대 실손 (표준화 이전)',
      insType,
      joinedAt: parsed.label,
      coPayBenefit: isLife ? '20%' : '0%',
      coPayNonBenefit: isLife ? '20%' : '0%',
      coPayMajor3: '-',
      limitNote: isLife ? '입원 3천만 / 통원 10만' : '입원 3천~1억 / 통원 10~50만',
      renewalRule: isLife ? '3년/100세 갱신형' : '5년/100세 갱신형',
    }
  }
  // ── 표준화 실손 (2009.10 ~ 2013.3) ──────────────────────────────────
  if (ym < 201304) {
    return {
      generation: '2세대 실손 (표준화)',
      insType,
      joinedAt: parsed.label,
      coPayBenefit: '10~20% (선택형)',
      coPayNonBenefit: '10~20% (급여·비급여 미분리)',
      coPayMajor3: '-',
      limitNote: '입원 5천만 / 통원 25만',
      renewalRule: '3년/100세 갱신형 + 15년 재가입',
    }
  }
  // ── 2세대 1~3차개정 (2013.4 ~ 2016.12) ──────────────────────────────
  if (ym < 201701) {
    return {
      generation: '2세대 실손 (2013~2016 개정)',
      insType,
      joinedAt: parsed.label,
      coPayBenefit: '10%',
      coPayNonBenefit: '20%',
      coPayMajor3: '-',
      limitNote: '입원 5천만 / 통원 25만',
      renewalRule: '1년 갱신 / 15년 재가입',
    }
  }
  // ── 3세대 (2017.1 ~ 2021.3) ──────────────────────────────────────────
  if (ym < 202104) {
    return {
      generation: '3세대 실손',
      insType,
      joinedAt: parsed.label,
      coPayBenefit: '10%',
      coPayNonBenefit: '20%',
      coPayMajor3: '70%',
      limitNote: '입원 5천만 / 통원 20만 (3대비급여 별도 특약)',
      renewalRule: '1년 갱신 / 15년 재가입',
    }
  }
  // ── 4세대 (2021.4 ~ 2026.6) ──────────────────────────────────────────
  if (ym < 202607) {
    return {
      generation: '4세대 실손',
      insType,
      joinedAt: parsed.label,
      coPayBenefit: '20%',
      coPayNonBenefit: '20%',
      coPayMajor3: '70%',
      limitNote: '급여 5천만 / 비급여 한도 내 · 이용량 연동 할인·할증',
      renewalRule: '1년 갱신 / 5년 재가입',
    }
  }
  // ── 5세대 (2026.7~) ──────────────────────────────────────────────────
  return {
    generation: '5세대 실손',
    insType,
    joinedAt: parsed.label,
    coPayBenefit: '중증 산정특례대상 별도 급여 (특약1)',
    coPayNonBenefit: '입원 50% / 통원 연간 300만원 한도',
    coPayMajor3: '-',
    limitNote: '급여 연간 1천만 (기본) / 비급여(특약2) 별도',
    renewalRule: '1년 갱신 / 5년 재가입',
  }
}

// ── 게이지 SVG ────────────────────────────────────────────────────────────
function gauge(pct: number, color: string, label: string, value: string): string {
  const r = 36, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ, gap = circ - dash
  const sc = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'
  const sl = pct >= 70 ? '충족' : pct >= 40 ? '보완필요' : '부족'
  return `<div class="gauge-wrap">
    <svg viewBox="0 0 84 84" width="84" height="84">
      <circle cx="42" cy="42" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="8"/>
      <circle cx="42" cy="42" r="${r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${dash.toFixed(1)} ${gap.toFixed(1)}" stroke-linecap="round"
        transform="rotate(-90 42 42)"/>
      <text x="42" y="38" text-anchor="middle" font-size="13" font-weight="900" fill="#1a2744">${Math.round(pct)}%</text>
      <text x="42" y="52" text-anchor="middle" font-size="9" fill="#64748b">${escHtml(label)}</text>
    </svg>
    <div class="gauge-value">${escHtml(value)}</div>
    <div class="gauge-status" style="color:${sc}">${sl}</div>
  </div>`
}

// ── 레이더 차트 SVG ───────────────────────────────────────────────────────
function radarChartSvg(contracts: ProContract[], benchmark?: BenchmarkAmounts): string {
  const AXES = [
    { label: '암진단비',  keys: ['cancer_general'],                                          rec: 50_000_000 },
    { label: '뇌진단비',  keys: ['brain_vascular'],                                          rec: 40_000_000 },
    { label: '심장진단비', keys: ['heart_ischemic'],                                         rec: 40_000_000 },
    { label: '수술비',    keys: ['surgery_disease', 'surgery_disease_advanced', 'surgery_disease_comprehensive', 'surgery_disease_type', 'surgery_injury', 'surgery_injury_advanced', 'surgery_injury_comprehensive', 'surgery_injury_type', 'surgery_1_5'], rec:  5_000_000 },
    { label: '실손',      keys: ['silson_disease_inpatient', 'silson_injury_inpatient'],      rec: 100_000_000 },
    { label: '사망',      keys: ['death_general'],                                            rec: 100_000_000 },
  ]
  const N = AXES.length, cx = 140, cy = 140, R = 100
  const ratios = AXES.map(a => Math.min(1, sumAmount(contracts, ...a.keys) / a.rec))
  const pt = (ratio: number, i: number): [number, number] => {
    const angle = (i * 2 * Math.PI / N) - Math.PI / 2
    return [cx + ratio * R * Math.cos(angle), cy + ratio * R * Math.sin(angle)]
  }
  const gridLines = [0.25, 0.5, 0.75, 1.0].map(r => {
    const pts = Array.from({length: N}, (_, i) => pt(r, i))
    return `<polygon points="${pts.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="none" stroke="#e2e8f0" stroke-width="1"/>`
  }).join('')
  const axisLines = Array.from({length: N}, (_, i) => {
    const [x, y] = pt(1, i)
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/>`
  }).join('')
  const actualPts = Array.from({length: N}, (_, i) => pt(ratios[i], i))
  const polygon = `<polygon points="${actualPts.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="rgba(26,39,68,0.15)" stroke="#1a2744" stroke-width="2"/>`
  const dots = actualPts.map(([x,y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#1a2744"/>`).join('')
  const labels = AXES.map((a, i) => {
    const angle = (i * 2 * Math.PI / N) - Math.PI / 2
    const lr = R + 24, lx = cx + lr * Math.cos(angle), ly = cy + lr * Math.sin(angle)
    const anchor = Math.cos(angle) > 0.15 ? 'start' : Math.cos(angle) < -0.15 ? 'end' : 'middle'
    const pct = Math.round(ratios[i] * 100)
    return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" font-size="10" fill="#1a2744" font-weight="700">${escHtml(a.label)}</text>` +
           `<text x="${lx.toFixed(1)}" y="${(ly+12).toFixed(1)}" text-anchor="${anchor}" font-size="9" fill="#64748b">${pct}%</text>`
  }).join('')
  return `<svg viewBox="0 0 280 280" width="180" height="180">${gridLines}${axisLines}${polygon}${dots}${labels}</svg>`
}

// ── 추천 제안 ─────────────────────────────────────────────────────────────
function buildRecommendations(contracts: ProContract[]) {
  const cancer = sumAmount(contracts, 'cancer_general')
  const brain  = sumAmount(contracts, 'brain_vascular')
  const heart  = sumAmount(contracts, 'heart_ischemic')
  const death  = sumAmount(contracts, 'death_general')
  const recs: Array<{ type: '보장성' | '저축성'; title: string; desc: string; icon: string }> = []
  if (cancer < 30_000_000) recs.push({ type: '보장성', title: '암진단비 보완', desc: `현재 ${formatWon(cancer)}로 3천만원 기준 미달. 진단비 보강 우선 권장.`, icon: '🩺' })
  if (brain < 40_000_000)  recs.push({ type: '보장성', title: '뇌진단비 보완', desc: `뇌혈관진단비 ${formatWon(brain)} — 4천만원 이상 확보 권장.`, icon: '🧠' })
  if (heart < 40_000_000)  recs.push({ type: '보장성', title: '심장진단비 보완', desc: `허혈성심장질환진단비 ${formatWon(heart)} — 4천만원 이상 확보 권장.`, icon: '🫀' })
  if (death < 100_000_000) recs.push({ type: '보장성', title: '사망보장 강화', desc: `사망보험금 ${formatWon(death)} — 가족 생활비 기반 최소 1억 확보 검토.`, icon: '🛡️' })
  recs.push({ type: '저축성', title: '노후연금 설계', desc: '은퇴 후 월 200만원 수령 기준 연금보험 가입 시뮬레이션을 권장합니다.', icon: '💰' })
  recs.push({ type: '저축성', title: '변액유니버셜 활용', desc: '중장기 자산 성장과 보장의 병행이 필요한 경우 변액보험 검토를 추천합니다.', icon: '📈' })
  return [...recs.filter(r => r.type === '보장성').slice(0, 3), ...recs.filter(r => r.type === '저축성').slice(0, 2)]
}


// ── 보험회사별 보장 현황 (상세 출력 전용) ─────────────────────────────────
function buildContractBreakdownPage(contracts: ProContract[]): string {
  if (!contracts.length) return ''

  const fmtWonB = (v: number) => v ? `${v.toLocaleString()}만원` : '-'

  // contractDate 파싱 → Date 객체
  function parseContractDate(d?: string): Date | null {
    if (!d) return null
    // "2020.02.14", "20.02.14", "2020-02-14", "24.03" 등
    const m = d.match(/(\d{2,4})[.\-](\d{1,2})(?:[.\-](\d{1,2}))?/)
    if (!m) return null
    let y = parseInt(m[1])
    if (y < 100) y += 2000
    const mo = parseInt(m[2]) - 1
    const dy = m[3] ? parseInt(m[3]) : 1
    return new Date(y, mo, dy)
  }

  // paymentPeriod에서 납입년수 파싱 ("10년납/80세만기" → 10)
  function parsePaymentYears(p?: string): number | null {
    if (!p) return null
    const m = p.match(/(\d+)년납/)
    return m ? parseInt(m[1]) : null
  }

  // 만기 정보 파싱 ("80세만기" → "80세만기", "100세만기" → "100세만기")
  function parseMaturity(p?: string): string {
    if (!p) return ''
    const m = p.match(/(\d+세만기|종신|전기납)/)
    return m ? m[1] : p
  }

  // 날짜 포맷 YYYY.MM.DD
  function fmtD(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}.${m}.${day}`
  }

  const today = new Date()

  function contractBadges(c: ProContract): string {
    const hasRenewal = isRenewalContract(c)
    const hasCi = c.coverages.some((cv) => isCiCoverage(c, cv))
    const badges: string[] = []
    if (hasRenewal) badges.push('<span style="font-size:9px;padding:1px 6px;border-radius:999px;background:#fed7aa;color:#9a3412;font-weight:900">갱신</span>')
    if (hasCi) badges.push('<span style="font-size:9px;padding:1px 6px;border-radius:999px;background:#ddd6fe;color:#5b21b6;font-weight:900">CI</span>')
    return badges.join('')
  }

  function coverageExpirySummary(c: ProContract): string {
    const expiries = [...new Set(c.coverages.map((cv) => cv.expiryDate).filter(Boolean))]
    if (expiries.length === 0) return ''
    return '담보만기 ' + expiries.slice(0, 2).join(', ') + (expiries.length > 2 ? ' 외 ' + (expiries.length - 2) : '')
  }

  // __manual__ 수동조정 계약은 표시하지 않음 (step-3에서 이미 반영된 값)
  const activeContracts = contracts.filter(c =>
    c.id !== '__manual__' &&
    c.status !== 'lapsed' &&
    c.status !== 'expired'
  )
  const cards = activeContracts.map(c => {
    const premium = Number(c.monthlyPremium || 0)
    const covRows = c.coverages
      .filter(cv => Number(cv.amount) > 0)
      .map(cv =>
        '<div style="display:flex;justify-content:space-between;align-items:center;' +
        'padding:3px 0;border-bottom:1px solid #f1f5f9;font-size:10px">' +
        '<span style="color:#374151;flex:1;padding-right:6px">' + escHtml(cv.name || cv.rowKey) + '</span>' +
        '<span style="color:#1a2744;font-weight:700;white-space:nowrap">' + fmtWonB(Number(cv.amount)) + '</span>' +
        '</div>'
      ).join('')
    const covEmpty = c.coverages.filter(cv => Number(cv.amount) > 0).length === 0
    const typeLabel = c.policyType === 'savings' ? '저축성' : '보장성'

    // 납입기간 계산
    const startDate = parseContractDate(c.contractDate)
    const payYears = parsePaymentYears(c.paymentPeriod)
    const maturity = parseMaturity(c.paymentPeriod)

    let periodLine = ''
    let payCountLine = ''
    if (startDate && payYears) {
      const endDate = new Date(startDate.getFullYear() + payYears, startDate.getMonth(), startDate.getDate() - 1)
      const totalMonths = payYears * 12
      const elapsed = Math.max(0, (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth()))
      const paid = Math.min(elapsed, totalMonths)
      periodLine = fmtD(startDate) + '~' + fmtD(endDate)
      payCountLine = '납입 ' + String(paid).padStart(2, '0') + '/' + totalMonths + '회'
    } else if (startDate && c.contractDate) {
      periodLine = fmtD(startDate)
    }

    return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;' +
      'break-inside:avoid;page-break-inside:avoid;overflow:hidden">' +
      // 헤더
      '<div style="background:#1a2744;padding:10px 12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
          '<div>' +
            '<div style="font-size:12px;font-weight:900;color:#fff">' + escHtml(c.company) + '</div>' +
            '<div style="font-size:10px;color:rgba(255,255,255,0.65);margin-top:2px">' + escHtml(c.productName || '') + '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-size:13px;font-weight:900;color:#c9a96e">' + (premium ? premium.toLocaleString() + '원/월' : '-') + '</div>' +
            '<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.8);font-weight:700">' + typeLabel + '</span>' +
          '</div>' +
        '</div>' +
        // 기간/납입 정보 행
        (periodLine || payCountLine || maturity ? (
          '<div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.12);' +
          'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">' +
            (periodLine ? '<span style="font-size:9px;color:rgba(255,255,255,0.6)">📅 ' + escHtml(periodLine) + '</span>' : '') +
            '<div style="display:flex;gap:8px;margin-left:auto">' +
              (payCountLine ? '<span style="font-size:9px;color:#c9a96e;font-weight:700">' + escHtml(payCountLine) + '</span>' : '') +
              (maturity ? '<span style="font-size:9px;color:rgba(255,255,255,0.5)">' + escHtml(maturity) + '</span>' : '') +
            '</div>' +
          '</div>'
        ) : '') +
      '</div>' +
      // 담보 목록
      '<div style="padding:8px 12px">' +
        (covEmpty
          ? '<div style="font-size:10px;color:#94a3b8;text-align:center;padding:8px">담보 정보 없음</div>'
          : covRows) +
      '</div>' +
    '</div>'
  }).join('')

  // 2열 그리드 — 카드 2개씩 행으로 묶어 페이지 경계에서 카드가 잘리지 않게 처리
  const cardArr = activeContracts.map((c, i) => {
    const premium = Number(c.monthlyPremium || 0)
    // 종수술비: 상해·질병 둘 다 있으면 큰 금액 하나만 "종수술비"로 표시
    const SURG_TYPE_PAIR = ['surgery_injury_type', 'surgery_disease_type']
    const surgTypeCovs = c.coverages.filter(cv => SURG_TYPE_PAIR.includes(cv.rowKey || '') && Number(cv.amount) > 0)
    const surgTypeMerge = surgTypeCovs.length >= 2
    const surgTypeMaxCv = surgTypeMerge
      ? surgTypeCovs.reduce((a, b) => Number(a.amount) >= Number(b.amount) ? a : b)
      : null

    const covRowsInner = c.coverages
      .filter(cv => Number(cv.amount) > 0)
      .reduce<string[]>((acc, cv) => {
        if (SURG_TYPE_PAIR.includes(cv.rowKey || '') && surgTypeMerge) {
          if (cv.rowKey !== surgTypeMaxCv!.rowKey) return acc  // 작은 쪽 건너뜀
          // 큰 쪽: "종수술비" 레이블로 통합 표시
          acc.push(
            '<div style="display:flex;justify-content:space-between;align-items:center;' +
            'padding:3px 4px;border-bottom:1px solid #f1f5f9;font-size:10px;background:transparent">' +
            '<span style="color:#374151;flex:1;padding-right:6px"><span>종수술비</span></span>' +
            '<span style="color:#1a2744;font-weight:700;white-space:nowrap">' + fmtWonB(Number(cv.amount)) + '</span>' +
            '</div>'
          )
          return acc
        }
        const rowBg = isCiCoverage(c, cv) ? '#f5f3ff' : 'transparent'
        const badge = coverageBadges(c, cv)
        acc.push(
          '<div style="display:flex;justify-content:space-between;align-items:center;' +
          'padding:3px 4px;border-bottom:1px solid #f1f5f9;font-size:10px;background:' + rowBg + '">' +
          '<span style="color:#374151;flex:1;padding-right:6px">' +
            '<span>' + escHtml(cv.name || cv.rowKey) + '</span>' +
            (cv.expiryDate ? '<span style="display:block;font-size:8px;color:#94a3b8;margin-top:1px">만기 ' + escHtml(cv.expiryDate) + '</span>' : '') +
            badge +
          '</span>' +
          '<span style="color:#1a2744;font-weight:700;white-space:nowrap">' + fmtWonB(Number(cv.amount)) + '</span>' +
          '</div>'
        )
        return acc
      }, [])
      .join('')
    const covEmptyInner = c.coverages.filter(cv => Number(cv.amount) > 0).length === 0
    const typeLabel = c.policyType === 'savings' ? '저축성' : '보장성'
    const startDate = parseContractDate(c.contractDate)
    const payYears = parsePaymentYears(c.paymentPeriod)
    const maturity = parseMaturity(c.paymentPeriod)
    const expiryLine = coverageExpirySummary(c)
    let periodLine = ''
    let payCountLine = ''
    if (startDate && payYears) {
      const endDate = new Date(startDate.getFullYear() + payYears, startDate.getMonth(), startDate.getDate() - 1)
      const totalMonths = payYears * 12
      const elapsed = Math.max(0, (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth()))
      const paid = Math.min(elapsed, totalMonths)
      periodLine = fmtD(startDate) + '~' + fmtD(endDate)
      payCountLine = '납입 ' + String(paid).padStart(2, '0') + '/' + totalMonths + '회'
    } else if (startDate) {
      periodLine = fmtD(startDate)
    }
    return (
      '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;' +
      'break-inside:avoid;page-break-inside:avoid;overflow:hidden">' +
      '<div style="background:#1a2744;padding:10px 12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
          '<div>' +
            '<div style="font-size:12px;font-weight:900;color:#fff">' + escHtml(c.company) + '</div>' +
            '<div style="font-size:10px;color:rgba(255,255,255,0.65);margin-top:2px">' + escHtml(c.productName || '') + '</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-size:13px;font-weight:900;color:#c9a96e">' + (premium ? premium.toLocaleString() + '원/월' : '-') + '</div>' +
            '<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.8);font-weight:700">' + typeLabel + '</span>' +
            '<div style="display:flex;gap:3px;justify-content:flex-end;margin-top:3px">' + contractBadges(c) + '</div>' +
          '</div>' +
        '</div>' +
        (periodLine || payCountLine || maturity || expiryLine ? (
          '<div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.12);' +
          'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">' +
            (periodLine ? '<span style="font-size:9px;color:rgba(255,255,255,0.6)">📅 ' + escHtml(periodLine) + '</span>' : '') +
            '<div style="display:flex;gap:8px;margin-left:auto">' +
              (payCountLine ? '<span style="font-size:9px;color:#c9a96e;font-weight:700">' + escHtml(payCountLine) + '</span>' : '') +
              (maturity ? '<span style="font-size:9px;color:rgba(255,255,255,0.5)">' + escHtml(maturity) + '</span>' : '') +
              (expiryLine ? '<span style="font-size:9px;color:rgba(255,255,255,0.5)">' + escHtml(expiryLine) + '</span>' : '') +
            '</div>' +
          '</div>'
        ) : '') +
      '</div>' +
      '<div style="padding:8px 12px">' +
        (covEmptyInner
          ? '<div style="font-size:10px;color:#94a3b8;text-align:center;padding:8px">담보 정보 없음</div>'
          : covRowsInner) +
      '</div>' +
    '</div>'
    )
  })

  // CSS column-count 레이아웃 — 순서보다 빈칸 최소화 우선
  // column-count:2 → 카드가 위→아래로 자연스럽게 채워져 공백 최소화
  // 카드 수가 3개 이하면 3열로 더 컴팩트하게
  const colCount = cardArr.length <= 3 ? 3 : 2
  return (
    '<div style="column-count:' + colCount + ';column-gap:10px">' +
    cardArr.map(card =>
      '<div style="break-inside:avoid;page-break-inside:avoid;margin-bottom:10px">' +
      card +
      '</div>'
    ).join('') +
    '</div>'
  )
}

// ── 보장기간 & 갱신 타임라인 인포그래픽 ──────────────────────────────────
function buildTimelineInfographicPage(
  contracts: ProContract[],
  customerBirth?: string,
): string {
  const TODAY_YEAR = new Date().getFullYear()

  // Parse birth year
  let birthYear: number | null = null
  if (customerBirth) {
    const bm = String(customerBirth).match(/(\d{4})/)
    if (bm) birthYear = parseInt(bm[1])
  }
  const useAges = birthYear !== null

  // Active contracts only (exclude manual and lapsed)
  const active = contracts.filter(c =>
    c.id !== '__manual__' && c.status !== 'lapsed' && c.status !== 'expired'
  )
  if (!active.length) return ''

  // ── helpers ──────────────────────────────────────────────────────────────
  function parseMat(p?: string): { matAge: number | null; payYears: number | null; isLifetime: boolean } {
    if (!p) return { matAge: null, payYears: null, isLifetime: false }
    const isLife = /종신/.test(p)
    const am = p.match(/(\d+)세만기/)
    const pm = p.match(/(\d+)년납/)
    const ym = p.match(/(\d+)년만기/)
    return {
      matAge: isLife ? 100 : (am ? parseInt(am[1]) : null),
      payYears: pm ? parseInt(pm[1]) : (ym ? parseInt(ym[1]) : null),
      isLifetime: isLife,
    }
  }

  function parseRenCycle(c: ProContract): number {
    const t = `${c.productName || ''} ${c.paymentPeriod || ''}`.toLowerCase()
    // 자동차보험은 1년 단위 갱신
    if (t.includes('자동차') || t.includes('readycar') || t.includes('다이렉트카')) return 1
    if (t.includes('1년갱신')) return 1
    if (t.includes('3년갱신')) return 3
    if (t.includes('5년갱신')) return 5
    if (t.includes('10년갱신')) return 10
    if (t.includes('15년갱신')) return 15
    if (t.includes('20년갱신')) return 20
    if (isRenewalContract(c)) return 1
    return 0
  }

  const PALETTE = [
    '#1a2744','#2d4a8a','#1e6b50','#7c3aed','#92400e',
    '#1e40af','#9f1239','#065f46','#344689','#0369a1',
    '#6d28d9','#0f766e',
  ]

  // ── Build row data ────────────────────────────────────────────────────────
  type BarRow = {
    label1: string; label2: string
    startVal: number; endVal: number
    payEndVal: number | null
    renCycle: number; isLifetime: boolean
    color: string
  }

  const rows: BarRow[] = active.map((c, i) => {
    const parsed = parseContractYearMonth(c.contractDate)
    const startY = parsed?.year ?? TODAY_YEAR - 3
    const startMo = parsed?.month ?? 1

    const { matAge, payYears, isLifetime } = parseMat(c.paymentPeriod)

    let startVal: number, endVal: number
    let payEndVal: number | null = null

    if (useAges && birthYear) {
      startVal = startY - birthYear + (startMo >= 7 ? 1 : 0)
      if (matAge) {
        endVal = matAge
      } else if (payYears) {
        endVal = startVal + payYears
      } else {
        endVal = startVal + 20
      }
      if (payYears) payEndVal = startVal + payYears
    } else {
      startVal = startY
      if (matAge && birthYear) {
        endVal = birthYear + matAge
      } else if (payYears) {
        endVal = startY + payYears
      } else if (matAge) {
        endVal = startY + Math.max(20, matAge - 30)
      } else {
        endVal = startY + 20
      }
      if (payYears) payEndVal = startY + payYears
    }

    // Clamp
    startVal = Math.max(startVal, useAges ? 10 : 1990)
    endVal   = Math.min(endVal,   useAges ? 110 : TODAY_YEAR + 80)
    if (endVal <= startVal) endVal = startVal + 10

    const comp = c.company.replace(/[\s]*(생명|손해보험|화재보험|보험|화재|라이프그룹|그룹)/g, '').trim()
    const prod = c.productName.length > 14 ? c.productName.slice(0, 13) + '…' : c.productName

    return {
      label1: comp, label2: prod,
      startVal, endVal, payEndVal,
      renCycle: parseRenCycle(c),
      isLifetime,
      color: PALETTE[i % PALETTE.length],
    }
  })

  // ── X axis range ──────────────────────────────────────────────────────────
  const allVals = rows.flatMap(r => [r.startVal, r.endVal])
  let X_MIN: number, X_MAX: number
  if (useAges) {
    X_MIN = Math.max(15, Math.min(20, Math.floor(Math.min(...allVals) / 5) * 5))
    X_MAX = Math.min(110, Math.max(90, Math.ceil(Math.max(...allVals) / 5) * 5))
  } else {
    X_MIN = Math.max(1990, Math.min(TODAY_YEAR - 8, Math.floor(Math.min(...allVals) / 5) * 5))
    X_MAX = Math.min(TODAY_YEAR + 80, Math.max(TODAY_YEAR + 30, Math.ceil(Math.max(...allVals) / 5) * 5))
  }
  const X_RANGE = Math.max(1, X_MAX - X_MIN)

  // ── SVG constants ─────────────────────────────────────────────────────────
  const LABEL_W = 170
  const CHART_W = 760
  const RIGHT_W = 65
  const SVG_W   = LABEL_W + CHART_W + RIGHT_W  // 995
  const HDR_H   = 66   // 타임라인 제목 포함
  const FOOT_H  = 46
  const N       = rows.length
  // 페이지를 꽉 채우도록 행 높이 동적 계산 (A4 landscape 기준)
  const TARGET_SVG_H = Math.floor(SVG_W * 0.76)  // ≈ 756
  const dynROW_H = Math.floor((TARGET_SVG_H - HDR_H - FOOT_H) / Math.max(1, N))
  const ROW_H   = Math.max(32, Math.min(76, dynROW_H))
  const BAR_H   = Math.max(13, Math.floor(ROW_H * 0.46))
  const SVG_H   = Math.max(TARGET_SVG_H, HDR_H + N * ROW_H + FOOT_H)

  const xSvg = (v: number) => LABEL_W + ((v - X_MIN) / X_RANGE) * CHART_W

  // Tick values
  const tickStep = X_RANGE <= 25 ? 2 : X_RANGE <= 55 ? 5 : 10
  const ticks: number[] = []
  for (let v = Math.ceil(X_MIN / tickStep) * tickStep; v <= X_MAX; v += tickStep) ticks.push(v)

  // ── SVG build ─────────────────────────────────────────────────────────────
  let s = ''

  // BG
  s += `<rect width="${SVG_W}" height="${SVG_H}" fill="#fafaf8" rx="10"/>`

  // Title
  s += `<text x="${SVG_W/2}" y="20" text-anchor="middle" font-family="Pretendard Variable,Pretendard,sans-serif" font-size="13" font-weight="900" fill="#1a2744">보험별 보장기간 &amp; 갱신 시점 한눈에 보기</text>`
  s += `<text x="${SVG_W/2}" y="37" text-anchor="middle" font-family="Pretendard Variable,Pretendard,sans-serif" font-size="9" fill="#64748b">각 보험의 보장 시작·만기와 갱신 시점, 납입 완료 시점을 확인하세요</text>`

  // X-axis header separator
  s += `<line x1="${LABEL_W}" y1="${HDR_H - 2}" x2="${LABEL_W + CHART_W}" y2="${HDR_H - 2}" stroke="#e2e8f0" stroke-width="1"/>`
  // Label | Chart separator
  s += `<line x1="${LABEL_W}" y1="${HDR_H - 8}" x2="${LABEL_W}" y2="${HDR_H + N * ROW_H}" stroke="#cbd5e1" stroke-width="1.5"/>`

  // Grid + x-axis labels
  for (const t of ticks) {
    const x = xSvg(t)
    s += `<line x1="${x.toFixed(1)}" y1="${HDR_H - 2}" x2="${x.toFixed(1)}" y2="${HDR_H + N * ROW_H}" stroke="#e2e8f0" stroke-width="1"/>`
    s += `<text x="${x.toFixed(1)}" y="${HDR_H - 5}" text-anchor="middle" font-family="Pretendard Variable,sans-serif" font-size="8" fill="#94a3b8" font-weight="700">${t}${useAges ? '세' : ''}</text>`
  }

  // Current age/year line (red dashed)
  const curVal = (useAges && birthYear) ? (TODAY_YEAR - birthYear) : TODAY_YEAR
  if (curVal >= X_MIN && curVal <= X_MAX) {
    const cx = xSvg(curVal)
    s += `<line x1="${cx.toFixed(1)}" y1="${HDR_H - 8}" x2="${cx.toFixed(1)}" y2="${HDR_H + N * ROW_H + 4}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,3"/>`
    s += `<text x="${cx.toFixed(1)}" y="${HDR_H + N * ROW_H + 14}" text-anchor="middle" font-size="8" fill="#ef4444" font-weight="900">현재</text>`
  }

  // ── Rows ──────────────────────────────────────────────────────────────────
  rows.forEach((row, i) => {
    const ry  = HDR_H + i * ROW_H
    const barY = ry + (ROW_H - BAR_H) / 2

    // Alternating row BG
    if (i % 2 === 0) {
      s += `<rect x="0" y="${ry}" width="${SVG_W}" height="${ROW_H}" fill="rgba(255,255,255,0.55)"/>`
    }

    // Labels (left side)
    s += `<text x="${LABEL_W - 7}" y="${ry + ROW_H/2 - 3}" text-anchor="end" font-family="Pretendard Variable,sans-serif" font-size="9.5" font-weight="800" fill="#1a2744">${escHtml(row.label1)}</text>`
    s += `<text x="${LABEL_W - 7}" y="${ry + ROW_H/2 + 8}" text-anchor="end" font-family="Pretendard Variable,sans-serif" font-size="7.5" fill="#64748b">${escHtml(row.label2)}</text>`

    // Bar coordinates (clamped)
    const bx1 = Math.max(xSvg(row.startVal), LABEL_W)
    const bx2 = Math.min(xSvg(row.endVal), LABEL_W + CHART_W)
    const bw  = Math.max(4, bx2 - bx1)

    if (row.renCycle > 0) {
      // Renewal: light full bar + darker segments
      s += `<rect x="${bx1.toFixed(1)}" y="${barY}" width="${bw.toFixed(1)}" height="${BAR_H}" rx="4" fill="${row.color}" opacity="0.18"/>`
      let seg = row.startVal
      while (seg < row.endVal) {
        const segEnd = Math.min(seg + row.renCycle, row.endVal)
        const sx1 = Math.max(xSvg(seg), LABEL_W)
        const sx2 = Math.min(xSvg(segEnd), LABEL_W + CHART_W)
        const sw  = Math.max(1, sx2 - sx1 - 1.5)
        s += `<rect x="${sx1.toFixed(1)}" y="${(barY + 3).toFixed(1)}" width="${sw.toFixed(1)}" height="${BAR_H - 6}" rx="3" fill="${row.color}" opacity="0.82"/>`
        // Renewal dot (not at segment start of first)
        if (seg > row.startVal) {
          const dx = xSvg(seg)
          if (dx >= LABEL_W && dx <= LABEL_W + CHART_W) {
            s += `<circle cx="${dx.toFixed(1)}" cy="${(barY + BAR_H/2).toFixed(1)}" r="5" fill="#fff" stroke="${row.color}" stroke-width="2"/>`
            s += `<text x="${dx.toFixed(1)}" y="${(barY - 3).toFixed(1)}" text-anchor="middle" font-size="7" fill="#dc2626" font-weight="900">↑</text>`
          }
        }
        seg = segEnd
      }
    } else {
      // Non-renewal: solid bar
      s += `<rect x="${bx1.toFixed(1)}" y="${barY}" width="${bw.toFixed(1)}" height="${BAR_H}" rx="4" fill="${row.color}"/>`
    }

    // Payment end marker (gold vertical line with triangle)
    if (row.payEndVal && row.payEndVal > row.startVal && row.payEndVal < row.endVal) {
      const px = xSvg(row.payEndVal)
      if (px > LABEL_W && px < LABEL_W + CHART_W) {
        s += `<line x1="${px.toFixed(1)}" y1="${(barY - 3).toFixed(1)}" x2="${px.toFixed(1)}" y2="${(barY + BAR_H + 3).toFixed(1)}" stroke="#c9a96e" stroke-width="2"/>`
        s += `<polygon points="${px.toFixed(1)},${(barY - 6).toFixed(1)} ${(px-3).toFixed(1)},${(barY - 1).toFixed(1)} ${(px+3).toFixed(1)},${(barY - 1).toFixed(1)}" fill="#c9a96e"/>`
      }
    }

    // Start/end age text inside bar
    const sLbl = useAges ? `${Math.round(row.startVal)}세` : `${Math.round(row.startVal)}`
    const eLbl = row.isLifetime ? '종신' : (useAges ? `${Math.round(row.endVal)}세` : `${Math.round(row.endVal)}`)
    if (bw > 44) {
      s += `<text x="${(bx1 + 5).toFixed(1)}" y="${(barY + BAR_H/2 + 3.5).toFixed(1)}" font-size="7" fill="rgba(255,255,255,0.95)" font-weight="700" font-family="Pretendard Variable,sans-serif">${sLbl}</text>`
    }
    if (bw > 55) {
      s += `<text x="${(bx2 - 4).toFixed(1)}" y="${(barY + BAR_H/2 + 3.5).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(255,255,255,0.95)" font-weight="700" font-family="Pretendard Variable,sans-serif">${eLbl}</text>`
    }

    // Badge right of bar
    const badgeX = Math.min(bx2 + 3, LABEL_W + CHART_W + 3)
    if (row.renCycle === 0) {
      s += `<rect x="${badgeX.toFixed(1)}" y="${(barY + 2).toFixed(1)}" width="28" height="11" rx="5" fill="#d1fae5"/>`
      s += `<text x="${(badgeX + 14).toFixed(1)}" y="${(barY + 10.5).toFixed(1)}" text-anchor="middle" font-size="6" fill="#065f46" font-weight="900">비갱신</text>`
    } else {
      const rl = row.renCycle === 1 ? '1년갱' : `${row.renCycle}년갱`
      s += `<rect x="${badgeX.toFixed(1)}" y="${(barY + 2).toFixed(1)}" width="26" height="11" rx="5" fill="#fed7aa"/>`
      s += `<text x="${(badgeX + 13).toFixed(1)}" y="${(barY + 10.5).toFixed(1)}" text-anchor="middle" font-size="6" fill="#9a3412" font-weight="900">${rl}</text>`
    }
  })

  // Bottom chart border
  s += `<line x1="${LABEL_W}" y1="${HDR_H + N * ROW_H}" x2="${LABEL_W + CHART_W}" y2="${HDR_H + N * ROW_H}" stroke="#e2e8f0" stroke-width="1"/>`

  // ── Legend ────────────────────────────────────────────────────────────────
  const legY = HDR_H + N * ROW_H + 8
  s += `<rect x="0" y="${legY}" width="${SVG_W}" height="${FOOT_H - 4}" fill="#f1f5f9" rx="0 0 8 8"/>`
  const legItems = [
    { type: 'solid', color: '#1a2744', label: '보장기간 (비갱신)' },
    { type: 'seg',   color: '#1a2744', label: '보장기간 (갱신형)' },
    { type: 'dot',   color: '#1a2744', label: '갱신 시점 / 보험료 인상 예상' },
    { type: 'gold',  color: '#c9a96e', label: '납입 완료 시점' },
    { type: 'dred',  color: '#ef4444', label: '현재 시점' },
  ]
  let lx = LABEL_W + 4
  const ly = legY + 28
  for (const lg of legItems) {
    if (lg.type === 'solid') {
      s += `<rect x="${lx}" y="${ly - 9}" width="18" height="10" rx="3" fill="${lg.color}"/>`
    } else if (lg.type === 'seg') {
      s += `<rect x="${lx}" y="${ly - 9}" width="18" height="10" rx="3" fill="${lg.color}" opacity="0.18"/>`
      s += `<rect x="${lx + 1}" y="${ly - 7}" width="16" height="6" rx="2" fill="${lg.color}" opacity="0.8"/>`
    } else if (lg.type === 'dot') {
      s += `<circle cx="${lx + 9}" cy="${ly - 4}" r="5" fill="#fff" stroke="${lg.color}" stroke-width="2"/>`
      s += `<text x="${lx + 9}" y="${ly - 10}" text-anchor="middle" font-size="7" fill="#dc2626" font-weight="900">↑</text>`
    } else if (lg.type === 'gold') {
      s += `<line x1="${lx + 9}" y1="${ly - 11}" x2="${lx + 9}" y2="${ly + 1}" stroke="${lg.color}" stroke-width="2"/>`
      s += `<polygon points="${lx+9},${ly-13} ${lx+6},${ly-9} ${lx+12},${ly-9}" fill="${lg.color}"/>`
    } else if (lg.type === 'dred') {
      s += `<line x1="${lx}" y1="${ly - 4}" x2="${lx + 18}" y2="${ly - 4}" stroke="${lg.color}" stroke-width="2" stroke-dasharray="4,2"/>`
    }
    s += `<text x="${lx + 23}" y="${ly}" font-size="8.5" fill="#4b5563" font-weight="600" font-family="Pretendard Variable,sans-serif">${escHtml(lg.label)}</text>`
    lx += 23 + lg.label.length * 5 + 16
  }

  const svg = `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" width="100%" style="max-width:${SVG_W}px;display:block" xmlns="http://www.w3.org/2000/svg">${s}</svg>`

  return `
<!-- ════ PAGE TIMELINE: 보장기간 & 갱신 타임라인 ════ -->
<div class="pdf-page">
<div class="page-inner">
  <div class="page-label">보험별 보장기간 &amp; 갱신 시점</div>
  <div style="overflow:hidden;border-radius:10px;border:1px solid #e2e8f0">
    ${svg}
  </div>
  <div style="margin-top:6px;padding:5px 10px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;display:flex;align-items:center;gap:8px">
    <span style="font-size:9px;color:#92400e;font-weight:700;flex-shrink:0">⚠️ 참고</span>
    <span style="font-size:9px;color:#78350f;line-height:1.4">보장기간은 계약일·납입기간 기반 자동 추산입니다. 실제 만기는 증권 확인 필수. 갱신형(●)은 나이·손해율에 따라 보험료 <b>인상</b>됩니다.</span>
  </div>
</div>
</div>
`
}

// ── 담보비교표 (항상 마지막 페이지) ─────────────────────────────────────
function buildContactsPage(contracts: ProContract[], addContracts: ProContract[] = []): string {
  const allCos = [...contracts, ...addContracts].map(c => c.company || '').filter(Boolean)
  const uniqueCos = [...new Set(allCos)]
  const matched = INSURER_CONTACTS.filter(ic => {
    const names = [ic.name, ...(ic.aliases || [])]
    return uniqueCos.some(co => names.some(n => co.includes(n) || n.includes(co)))
  })
  const lifeList = matched.filter(ic => ic.type === 'life')
  const nonlifeList = matched.filter(ic => ic.type === 'nonlife')
  const renderRows = (list: typeof matched) => list.map(ic =>
    '<tr style="border-bottom:1px solid #f1f5f9">' +
    '<td style="padding:9px 12px;font-size:13px;font-weight:700;color:#1a2744">' + escHtml(ic.name) + '</td>' +
    '<td style="padding:9px 12px;font-size:15px;font-weight:900;color:#2d4a8a;letter-spacing:0.05em">' + escHtml(ic.phone) + '</td>' +
    '</tr>'
  ).join('')
  return (
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">' +
    '<div>' +
    '<div style="font-size:11px;font-weight:900;color:#c9a96e;letter-spacing:0.1em;margin-bottom:10px;text-transform:uppercase">생명보험사</div>' +
    (lifeList.length > 0
      ? '<table style="width:100%;border-collapse:collapse"><tbody>' + renderRows(lifeList) + '</tbody></table>'
      : '<p style="color:#94a3b8;font-size:12px">해당 생명보험사 없음</p>') +
    '</div>' +
    '<div>' +
    '<div style="font-size:11px;font-weight:900;color:#c9a96e;letter-spacing:0.1em;margin-bottom:10px;text-transform:uppercase">손해보험사</div>' +
    (nonlifeList.length > 0
      ? '<table style="width:100%;border-collapse:collapse"><tbody>' + renderRows(nonlifeList) + '</tbody></table>'
      : '<p style="color:#94a3b8;font-size:12px">해당 손해보험사 없음</p>') +
    '</div>' +
    '</div>'
  )
}

function buildCompareTable(contracts: ProContract[]): string {
  const ALL_ROWS: Array<{ group: string; label: string; rowKey: string }> = [
    { group: '진단비',    label: '암 진단비',           rowKey: 'cancer_general' },
    { group: '진단비',    label: '고액암 진단비',        rowKey: 'cancer_high_value' },
    { group: '진단비',    label: '유사암 진단비',        rowKey: 'cancer_similar' },
    { group: '진단비',    label: '뇌혈관질환 진단비',   rowKey: 'brain_vascular' },
    { group: '진단비',    label: '뇌졸중 진단비',       rowKey: 'brain_stroke' },
    { group: '진단비',    label: '뇌출혈 진단비',       rowKey: 'brain_hemorrhage' },
    { group: '진단비',    label: '허혈성심장질환 진단비', rowKey: 'heart_ischemic' },
    { group: '진단비',    label: '급성심근경색 진단비',  rowKey: 'heart_acute_mi' },
    { group: '진단비',    label: '심장질환(부정맥 등)',  rowKey: 'heart_vascular' },
    { group: '암치료비',  label: '항암방사선치료비',     rowKey: 'cancer_radiation' },
    { group: '암치료비',  label: '중입자방사선치료비',   rowKey: 'cancer_hadron' },
    { group: '암치료비',  label: '양성자방사선치료비',   rowKey: 'cancer_proton' },
    { group: '암치료비',  label: '항암약물치료비',       rowKey: 'cancer_chemo' },
    { group: '암치료비',  label: '표적항암약물치료비',   rowKey: 'cancer_targeted' },
    { group: '암치료비',  label: '카티항암치료비',       rowKey: 'cancer_cart' },
    { group: '뇌심장치료', label: '혈전용해치료비',          rowKey: 'two_major_thrombolysis' },
    { group: '뇌심장치료', label: '중환자실치료비',          rowKey: 'two_major_icu' },
    { group: '뇌심장치료', label: '뇌심장 수술·시술비',     rowKey: 'two_major_surgery' },
    { group: '뇌심장치료', label: '2대주요치료비(급여)',     rowKey: 'vascular_major_benefit' },
    { group: '뇌심장치료', label: '2대주요치료비(비급여)',   rowKey: 'vascular_major_nonbenefit' },
    { group: '뇌심장치료', label: '2대주요치료비(통합)',     rowKey: 'vascular_major' },
    { group: '수술비',    label: '질병 일반 수술비',     rowKey: 'surgery_disease' },
    { group: '수술비',    label: '질병 상급 수술비',     rowKey: 'surgery_disease_advanced' },
    { group: '수술비',    label: '질병 종합 수술비',     rowKey: 'surgery_disease_comprehensive' },
    { group: '수술비',    label: '질병 종수술비',        rowKey: 'surgery_disease_type' },
    { group: '수술비',    label: '질병 N대 수술비',      rowKey: 'surgery_n_major' },
    { group: '수술비',    label: '상해 일반 수술비',     rowKey: 'surgery_injury' },
    { group: '수술비',    label: '상해 상급 수술비',     rowKey: 'surgery_injury_advanced' },
    { group: '수술비',    label: '상해 종합 수술비',     rowKey: 'surgery_injury_comprehensive' },
    { group: '수술비',    label: '상해 종수술비',        rowKey: 'surgery_injury_type' },
    { group: '간병',      label: '간병인(질병/일반)',    rowKey: 'nursing_hospital' },
    { group: '간병',      label: '간병인(상해)',         rowKey: 'nursing_injury' },
    { group: '간병',      label: '요양병원 간병인',      rowKey: 'nursing_care_hospital' },
    { group: '간병',      label: '간호간병통합',         rowKey: 'nursing_integrated' },
    { group: '입원일당',  label: '질병 입원일당',        rowKey: 'hospital_disease_daily' },
    { group: '입원일당',  label: '질병 1인실 입원',      rowKey: 'hospital_disease_single_room' },
    { group: '입원일당',  label: '상해 입원일당',        rowKey: 'hospital_injury_daily' },
    { group: '입원일당',  label: '상해 1인실 입원',      rowKey: 'hospital_injury_single_room' },
    { group: '실손',      label: '실손입원(질병)',       rowKey: 'silson_disease_inpatient' },
    { group: '실손',      label: '실손입원(상해)',       rowKey: 'silson_injury_inpatient' },
    { group: '실손',      label: '실손통원(질병)',       rowKey: 'silson_disease_outpatient' },
    { group: '실손',      label: '실손통원(상해)',       rowKey: 'silson_injury_outpatient' },
    { group: '실손',      label: '비급여3대(도수/주사/MRI)', rowKey: 'silson_3major' },
    { group: '사망',      label: '일반사망',             rowKey: 'death_general' },
    { group: '사망',      label: '상해(재해)사망',       rowKey: 'death_injury' },
    { group: '사망',      label: '질병사망',             rowKey: 'death_disease' },
    { group: '운전자',    label: '교통사고처리지원금',   rowKey: 'driver_accident' },
    { group: '운전자',    label: '자동차사고 변호사비용', rowKey: 'driver_lawyer' },
    { group: '운전자',    label: '민사소송 법률비용',    rowKey: 'driver_civil_litigation' },
    { group: '운전자',    label: '자동차사고부상치료비(14급)', rowKey: 'driver_injury_14' },
    { group: '운전자',    label: '벌금',                 rowKey: 'driver_fine' },
    { group: '치아',      label: '보철(임플란트·틀니·브리지)', rowKey: 'dental_prosthesis' },
    { group: '치아',      label: '크라운·인레이',         rowKey: 'dental_crown' },
    { group: '치아',      label: '충전치료',              rowKey: 'dental_filling' },
    { group: '치아',      label: '스케일링',              rowKey: 'dental_scaling' },
    { group: '치아',      label: '신경치료(근관)',         rowKey: 'dental_root_canal' },
    { group: '치아',      label: '발치',                 rowKey: 'dental_extraction' },
    { group: '치아',      label: '치아사고(파절·상해)',    rowKey: 'dental_accident' },
    { group: '치아',      label: '치아치료(일반)',         rowKey: 'dental_general' },
    { group: '기타',      label: '일상배상책임',         rowKey: 'other_liability' },
    { group: '기타',      label: '중대질병(CI)',          rowKey: 'ci_diagnosis' },
    // 치매 심각도별
    { group: '치매',      label: '중증치매 진단금',       rowKey: 'dementia_severe' },
    { group: '치매',      label: '중등도치매 진단금',     rowKey: 'dementia_moderate' },
    { group: '치매',      label: '경증치매 진단금',       rowKey: 'dementia_mild' },
    { group: '치매',      label: '치매진단비(일반)',       rowKey: 'dementia_diagnosis' },
    // 재가·시설 급여
    { group: '재가',      label: '복합재가급여',          rowKey: 'homecare_complex' },
    { group: '재가',      label: '복지용구급여',          rowKey: 'homecare_welfare_equipment' },
    { group: '재가',      label: '재가급여(방문요양 등)', rowKey: 'homecare_benefit' },
    { group: '재가',      label: '시설입소급여',          rowKey: 'facility_benefit' },
    { group: '재가',      label: '장기요양등급',          rowKey: 'ltc_grade' },
    { group: '진단비',    label: '양성뇌종양 진단비',    rowKey: 'benign_brain_tumor' },
    { group: '진단비',    label: '양성종양 진단비',      rowKey: 'benign_tumor' },
    { group: '진단비',    label: '암 산정특례',          rowKey: 'cancer_special_case' },
    { group: '2대질병',   label: '뇌혈관 산정특례',      rowKey: 'brain_special_case' },
    { group: '2대질병',   label: '심장 산정특례',        rowKey: 'heart_special_case' },
  ]

  // 데이터 있는 행만
  const activeRows = ALL_ROWS.filter(({ rowKey }) =>
    contracts.some(c => c.coverages.some(cov => cov.rowKey === rowKey && Number(cov.amount) > 0))
  )

  if (!contracts.length) return '<p style="color:#94a3b8;padding:20px;text-align:center">계약 데이터가 없습니다.</p>'

  const colHeaders = contracts.map(c =>
    `<th title="${escHtml(c.productName)}">${escHtml(c.company)}<br/><small>${escHtml(c.productName.slice(0, 9))}${c.productName.length > 9 ? '…' : ''}</small></th>`
  ).join('')

  // 그룹별 rowspan 계산
  const groupCounts: Record<string, number> = {}
  activeRows.forEach(r => { groupCounts[r.group] = (groupCounts[r.group] || 0) + 1 })
  const seenGroups = new Set<string>()

  const dataRows = activeRows.map(({ group, label, rowKey }) => {
    const isFirst = !seenGroups.has(group)
    if (isFirst) seenGroups.add(group)
    const groupCell = isFirst
      ? `<td class="row-group" rowspan="${groupCounts[group]}">${escHtml(group)}</td>`
      : ''
    const cells = contracts.map(c => {
      const cov = c.coverages.find(cv => cv.rowKey === rowKey)
      const amt = cov ? Number(cov.amount) * 10000 : 0
      const classes = [
        '',
        isCiCoverage(c, cov) ? 'ci-cell' : '',
      ].filter(Boolean).join(' ')
      return `<td class="${classes}">${amt ? `<span class="cell-amount">${formatWon(amt)}</span>${coverageBadges(c, cov)}` : '<span class="empty-cell">-</span>'}</td>`
    }).join('')
    const total = contracts.reduce((s, c) => {
      const cov = c.coverages.find(cv => cv.rowKey === rowKey)
      return s + (cov ? Number(cov.amount) * 10000 : 0)
    }, 0)
    return `<tr>${groupCell}<td class="row-label">${escHtml(label)}</td>${cells}<td class="row-total">${total ? formatWon(total) : '-'}</td></tr>`
  }).join('')

  const totalPremium = contracts.reduce((s, c) => s + Number(c.monthlyPremium || 0), 0)
  const premiumRow = `<tr>
    <td class="row-group">보험료</td>
    <td class="row-label">월 보험료</td>
    ${contracts.map(c => `<td style="color:#1a2744;font-weight:700">${formatMonthly(c.monthlyPremium)}</td>`).join('')}
    <td class="row-total">${formatMonthly(totalPremium)}</td>
  </tr>`

  return `<div class="compare-wrap">
    <table class="compare-table">
      <thead>
        <tr>
          <th style="width:55px">구분</th>
          <th style="width:130px">담보명</th>
          ${colHeaders}
          <th style="background:#2d4a8a">합산</th>
        </tr>
      </thead>
      <tbody>${premiumRow}${dataRows}</tbody>
    </table>
  </div>`
}

// ── 메인 HTML ─────────────────────────────────────────────────────────────
async function buildPrintHtml(input: PdfExportInput): Promise<string> {
  const { customerName, customerBirth, contracts, selectedImages = [], proposal, advisorInfo } = input
  const benchmark = input.benchmark
  const hasRemodel = !!proposal && (proposal.addContracts.length > 0 || proposal.removeContractIds.length > 0)
  const beforeContracts = proposal
    ? contracts.filter(c => !proposal.removeContractIds.includes(c.id))
    : contracts
  const afterContracts = proposal
    ? [...beforeContracts, ...proposal.addContracts]
    : contracts
  const isKey = input.type === 'key'
  const selectedImageSources = (await Promise.all(selectedImages.map(async (src) => ({
    original: src,
    dataUrl: await publicImageToDataUrl(src),
  })))).filter((item): item is { original: string; dataUrl: string } => Boolean(item.dataUrl))

  // 보험료 합계
  const totalPremium   = contracts.reduce((s, c) => s + Number(c.monthlyPremium || 0), 0)
  const 보장성Premium  = contracts.filter(c => classifyType(c) === '보장성').reduce((s, c) => s + Number(c.monthlyPremium || 0), 0)
  const 저축성Premium  = contracts.filter(c => classifyType(c) === '저축성').reduce((s, c) => s + Number(c.monthlyPremium || 0), 0)
  const 실손Premium    = contracts.filter(c => classifyType(c) === '실손').reduce((s, c) => s + Number(c.monthlyPremium || 0), 0)

  // 보장성+저축성 기준 비율 (실손 제외)
  const nonSilsonTotal = 보장성Premium + 저축성Premium || 1
  const 보장비율 = Math.round(보장성Premium / nonSilsonTotal * 100)
  const 저축비율 = 100 - 보장비율

  // 게이지
  const RECOMMEND = [
    { keys: ['cancer_general'],                                        rec: 50_000_000, label: '암진단비',   color: '#c9a96e' },
    { keys: ['brain_vascular'],                                        rec: 40_000_000, label: '뇌진단비',   color: '#3b82f6' },
    { keys: ['heart_ischemic'],                                        rec: 40_000_000, label: '심장진단비', color: '#ef4444' },
    { keys: ['surgery_disease', 'surgery_disease_advanced', 'surgery_disease_comprehensive', 'surgery_disease_type', 'surgery_injury', 'surgery_injury_advanced', 'surgery_injury_comprehensive', 'surgery_injury_type', 'surgery_1_5'], rec:  5_000_000, label: '수술비', color: '#8b5cf6' },
    { keys: ['silson_disease_inpatient', 'silson_injury_inpatient'],   rec: 100_000_000, label: '실손의료비', color: '#10b981', value: '가입' },
    { keys: ['death_general'],                                         rec: 100_000_000,label: '사망보장',   color: '#1a2744' },
  ]
  const gaugesHtml = RECOMMEND.map(cfg => {
    const amt = sumAmount(contracts, ...cfg.keys)
    const pct = Math.min(100, Math.round(amt / cfg.rec * 100))
    const displayValue = 'value' in cfg && typeof cfg.value === 'string' ? cfg.value : formatWon(amt)
    return gauge(pct, cfg.color, cfg.label, displayValue)
  }).join('')

  // 2대주요치료비 파생
  const derived = deriveVascularMajor(contracts)
  const diagnosisItems = [
    { label: '암', current: sumAmount(contracts, 'cancer_general'), target: benchmarkWon(benchmark, 'cancer', 50_000_000) },
    { label: '뇌', current: sumAmount(contracts, 'brain_vascular'), target: 40_000_000 },
    { label: '심장', current: sumAmount(contracts, 'heart_ischemic'), target: 40_000_000 },
  ]
  const treatmentAmount =
    sumAmount(contracts, 'cancer_radiation', 'cancer_hadron', 'cancer_proton', 'cancer_chemo', 'cancer_targeted', 'cancer_cart') +
    derived.thrombolysis + derived.icu + derived.surgery
  const shortageItems = [
    { label: '주요 진단비', current: diagnosisItems.reduce((sum, item) => sum + item.current, 0), target: 130_000_000 },
    { label: '수술비', current: sumAmount(contracts, 'surgery_disease', 'surgery_disease_advanced', 'surgery_disease_comprehensive', 'surgery_disease_type', 'surgery_injury', 'surgery_injury_advanced', 'surgery_injury_comprehensive', 'surgery_injury_type', 'surgery_1_5', 'surgery_n_major'), target: 5_000_000 },
    { label: '치료비', current: treatmentAmount, target: 20_000_000 },
    { label: '간병', current: sumAmount(contracts, 'nursing_hospital', 'nursing_injury', 'nursing_care_hospital', 'nursing_integrated'), target: 150_000 },
  ]
  const shortageHtml = `
  <div class="shortage-wrap">
    <div class="mini-title">부족 보장 요약</div>
    <div class="shortage-grid">
      ${shortageItems.map((item) => {
        const pct = item.target > 0 ? item.current / item.target : 0
        const status = pct >= 1 ? '충족' : pct >= 0.7 ? '보완필요' : '부족'
        const cls = pct >= 1 ? 'ok' : pct >= 0.7 ? 'warn' : 'bad'
        return `<div class="shortage-chip ${cls}">
          <span>${escHtml(item.label)}</span>
          <b>${status}</b>
          <small>${formatWon(item.current)} / ${formatPercent(item.current, item.target)}</small>
        </div>`
      }).join('')}
    </div>
  </div>`
  // 실손 정보 (재가입기준 제외, 주요보장 체크 2x2 그리드 4번째 칸)
  const silsonInfo = inferSilsonInfo(contracts)
  const silsonHasInfo = silsonInfo.generation && silsonInfo.generation !== '미가입'
  const silsonColor = silsonHasInfo ? '#10b981' : '#ef4444'
  const silsonLabel = silsonHasInfo ? '가입' : '미가입'
  const silsonMiniCardHtml =
    '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:9px;break-inside:avoid;page-break-inside:avoid">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">' +
    '<span style="font-size:11px;font-weight:900;color:#1a2744">&#128138;&nbsp;실손의료비</span>' +
    '<span style="font-size:10px;font-weight:900;color:' + silsonColor + '">' + silsonLabel + '</span>' +
    '</div>' +
    '<div style="height:6px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin-bottom:6px">' +
    '<div style="height:6px;border-radius:999px;background:' + silsonColor + ';width:' + (silsonHasInfo ? '100' : '4') + '%"></div>' +
    '</div>' +
    '<div style="font-size:9px;color:#64748b;font-weight:700;line-height:1.8">' +
    '세대&nbsp;<b style="color:#1a2744">' + escHtml(silsonInfo.generation || '-') + '</b>' +
    (silsonInfo.insType !== '-' ? '&nbsp;<b style="color:#2d4a8a;background:#dbeafe;border-radius:3px;padding:0 3px;font-size:8px">' + escHtml(silsonInfo.insType) + '</b>' : '') +
    '<br>가입연월&nbsp;<b style="color:#1a2744">' + escHtml(silsonInfo.joinedAt || '-') + '</b>' +
    (silsonHasInfo && silsonInfo.coPayBenefit !== '-'
      ? '<br>급여 본인부담&nbsp;<b style="color:#1a2744">' + escHtml(silsonInfo.coPayBenefit) + '</b>'
      + (silsonInfo.coPayNonBenefit !== '-' ? '&nbsp;&nbsp;비급여&nbsp;<b style="color:#dc2626">' + escHtml(silsonInfo.coPayNonBenefit) + '</b>' : '')
      : '') +
    '</div>' +
    '</div>'

  // 레이더 차트 아래 2열 배치용 진단비 카드 (암/뇌/심장 + 실손)
  const diagnosisAverageHtml = `
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:8px;break-inside:avoid;page-break-inside:avoid">
    ${diagnosisItems.map((item) => {
      const pct = Math.min(100, Math.round(item.current / item.target * 100))
      const sc = pct >= 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
      const sl = pct >= 100 ? '충족' : pct >= 50 ? '보완' : '부족'
      return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:9px;break-inside:avoid;page-break-inside:avoid">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <span style="font-size:11px;font-weight:900;color:#1a2744">${escHtml(item.label)}</span>
          <span style="font-size:10px;font-weight:900;color:${sc}">${sl} ${pct}%</span>
        </div>
        <div style="height:6px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin-bottom:4px">
          <div style="height:6px;border-radius:999px;background:${sc};width:${Math.max(4, pct)}%"></div>
        </div>
        <div style="font-size:9px;color:#64748b;text-align:right;font-weight:700">${formatWon(item.current)} / ${formatWon(item.target)}</div>
      </div>`
    }).join('')}
    ${silsonMiniCardHtml}
  </div>`
  // 뇌/심장 진단비 세부 항목 (색상 구분)
  const brainHeartDetailHtml = (() => {
    const DETAIL = [
      { label: '뇌혈관',        key: 'brain_vascular',   color: '#3b82f6' },
      { label: '뇌졸중',        key: 'brain_stroke',     color: '#f59e0b' },
      { label: '뇌출혈',        key: 'brain_hemorrhage', color: '#ef4444' },
      { label: '허혈성심장',    key: 'heart_ischemic',   color: '#3b82f6' },
      { label: '급성심근경색',  key: 'heart_acute_mi',   color: '#ef4444' },
      { label: '심장질환(부정맥 등)', key: 'heart_vascular', color: '#60a5fa' },
    ]
    const rows = DETAIL.map(d => {
      const amt = sumAmount(contracts, d.key)
      return `<div style="display:flex;align-items:center;gap:5px;padding:3px 0;border-bottom:1px solid #f1f5f9">
        <span style="width:8px;height:8px;border-radius:50%;background:${d.color};flex-shrink:0;display:inline-block"></span>
        <span style="flex:1;font-size:10px;color:#374151;font-weight:600">${escHtml(d.label)}</span>
        <span style="font-size:10px;font-weight:900;color:${amt ? d.color : '#94a3b8'}">${amt ? formatWon(amt) : '-'}</span>
      </div>`
    }).join('')
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:8px;margin-top:6px">
      <div style="font-size:10px;font-weight:900;color:#1a2744;margin-bottom:5px">뇌 · 심장 진단비 세부</div>
      ${rows}
    </div>`
  })()

  // silsonInfo는 위에서 정의됨
  const silsonInfoHtml = '' // 주요보장 체크 그리드에 통합

  // 각 카드 HTML 빌더
  function tcRow(label: string, amt: number) {
    return `<div class="tc-row"><span>${escHtml(label)}</span><span class="tc-val">${amt ? formatWon(amt) : '<span class="tc-empty">-</span>'}</span></div>`
  }
  function tcTextRow(label: string, value: string) {
    return `<div class="tc-row"><span>${escHtml(label)}</span><span class="tc-val">${escHtml(value || '-')}</span></div>`
  }
  function tcCard(icon: string, title: string, rows: string) {
    return `<div class="tc-card"><div class="tc-head">${icon} ${escHtml(title)}</div>${rows}</div>`
  }

  // 암 치료비
  const cancerCard = tcCard('🎗️', '암 치료비', [
    tcRow('항암방사선치료비',   sumAmount(contracts, 'cancer_radiation')),
    tcRow('중입자방사선치료비', sumAmount(contracts, 'cancer_hadron')),
    tcRow('양성자방사선치료비', sumAmount(contracts, 'cancer_proton')),
    tcRow('항암약물치료비',     sumAmount(contracts, 'cancer_chemo')),
    tcRow('표적항암약물치료비', sumAmount(contracts, 'cancer_targeted')),
    tcRow('카티항암치료비',     sumAmount(contracts, 'cancer_cart')),
    tcRow('암주요치료비(급여)', sumAmount(contracts, 'cancer_major_benefit')),
    tcRow('암주요치료비(비급여)', sumAmount(contracts, 'cancer_major_nonbenefit')),
  ].join(''))

  // 뇌심장 치료비 (vascular_major 파생 포함)
  const brainCard = tcCard('🫀', '뇌·심장 치료비', [
    tcRow('혈전용해치료비',     derived.thrombolysis),
    tcRow('중환자실치료비',     derived.icu),
    tcRow('뇌심장 수술·시술비', derived.surgery),
    tcRow('뇌혈관질환 진단비',  sumAmount(contracts, 'brain_vascular')),
    tcRow('허혈성심장질환 진단비', sumAmount(contracts, 'heart_ischemic')),
  ].join(''))

  // 수술비 (구 생명보험: 상해+질병 통합 계약은 surgery_disease 또는 surgery_injury 둘 다 매핑될 수 있음)
  const surgeryDiseaseAmt = sumAmount(contracts, 'surgery_disease')
  const surgeryInjuryAmt  = sumAmount(contracts, 'surgery_injury')
  const surgeryNote = (surgeryDiseaseAmt === 0 && surgeryInjuryAmt > 0)
    ? '<div style="font-size:9px;color:#94a3b8;padding:3px 6px">※ 구 생명보험 통합수술비는 상해 기준 표기</div>'
    : ''
  const surgeryCard = tcCard('🏥', '수술비', [
    tcRow('질병 일반',  surgeryDiseaseAmt),
    tcRow('질병 상급',  sumAmount(contracts, 'surgery_disease_advanced')),
    tcRow('질병 종합',  sumAmount(contracts, 'surgery_disease_comprehensive')),
    tcRow('질병 종수술', sumAmount(contracts, 'surgery_disease_type', 'surgery_1_5')),
    tcRow('질병 N대',   sumAmount(contracts, 'surgery_n_major')),
    tcRow('상해 일반',  surgeryInjuryAmt),
    tcRow('상해 상급',  sumAmount(contracts, 'surgery_injury_advanced')),
    tcRow('상해 종합',  sumAmount(contracts, 'surgery_injury_comprehensive')),
    tcRow('상해 종수술', sumAmount(contracts, 'surgery_injury_type')),
  ].join('') + surgeryNote)

  // 간병 4분류
  const nursingCard = tcCard('🤝', '간병인', [
    tcRow('간병인 사용(질병)',   sumAmount(contracts, 'nursing_hospital')),
    tcRow('간병인 사용(상해)',   sumAmount(contracts, 'nursing_injury')),
    tcRow('간병인 지원(요양병원)', sumAmount(contracts, 'nursing_care_hospital')),
    tcRow('간병인 지원(통합)',   sumAmount(contracts, 'nursing_integrated')),
    tcRow('입원일당(질병)',      sumAmount(contracts, 'hospital_disease_daily')),
    tcRow('1인실 입원(질병)',    sumAmount(contracts, 'hospital_disease_single_room')),
    tcRow('입원일당(상해)',      sumAmount(contracts, 'hospital_injury_daily')),
    tcRow('1인실 입원(상해)',    sumAmount(contracts, 'hospital_injury_single_room')),
  ].join(''))

  // 실손
  const hasSilsonInpatient = sumAmount(contracts, 'silson_disease_inpatient', 'silson_injury_inpatient') > 0
  const hasSilsonOutpatient = sumAmount(contracts, 'silson_disease_outpatient', 'silson_injury_outpatient') > 0
  const hasSilson3Major = sumAmount(contracts, 'silson_3major') > 0

  // 본인부담금 행 (구분선 + 배경색)
  function tcPayRow(label: string, value: string, color = '#f59e0b') {
    return `<div class="tc-row" style="background:#fffbeb">` +
      `<span style="font-size:9px;color:#64748b">${escHtml(label)}</span>` +
      `<span class="tc-val" style="color:${color};font-size:10px;font-weight:900">${escHtml(value)}</span></div>`
  }

  const divider = '<div style="height:1px;background:#f1f5f9;margin:4px 0"></div>'

  const silsonCard = tcCard('💊', '실손의료비', [
    // 가입현황
    tcTextRow('입원 의료비', hasSilsonInpatient ? '가입' : '-'),
    tcTextRow('통원 의료비', hasSilsonOutpatient ? '가입' : '-'),
    tcTextRow('3대비급여 특약', hasSilson3Major ? '가입' : '-'),
    divider,
    // 세대 정보
    tcTextRow('세대 / 종류', (silsonInfo.generation || '-') + (silsonInfo.insType !== '-' ? ' · ' + silsonInfo.insType : '')),
    tcTextRow('가입연월', silsonInfo.joinedAt || '-'),
    divider,
    // 본인부담금
    '<div style="font-size:9px;font-weight:900;color:#b45309;padding:3px 6px 2px;background:#fffbeb">본인부담금</div>',
    tcPayRow('급여 항목', silsonInfo.coPayBenefit || '-', '#1a2744'),
    tcPayRow('비급여 항목', silsonInfo.coPayNonBenefit || '-', '#dc2626'),
    silsonInfo.coPayMajor3 && silsonInfo.coPayMajor3 !== '-'
      ? tcPayRow('3대비급여', silsonInfo.coPayMajor3, '#7c3aed')
      : '',
    divider,
    // 갱신 방식
    tcTextRow('갱신·재가입', silsonInfo.renewalRule || '-'),
    silsonInfo.limitNote && silsonInfo.limitNote !== '-'
      ? `<div style="font-size:8.5px;color:#64748b;padding:2px 6px;line-height:1.4">※ ${escHtml(silsonInfo.limitNote)}</div>`
      : '',
  ].filter(Boolean).join(''))

  // 운전자 (full only)
  const driverCard = tcCard('🚗', '운전자보험', [
    tcRow('교통사고처리지원금',     sumAmount(contracts, 'driver_accident')),
    tcRow('자동차사고 변호사비용',  sumAmount(contracts, 'driver_lawyer')),
    tcRow('민사소송 법률비용',      sumAmount(contracts, 'driver_civil_litigation')),
    tcRow('자동차사고부상치료비(14급)', sumAmount(contracts, 'driver_injury_14')),
    tcRow('벌금',                   sumAmount(contracts, 'driver_fine')),
  ].join(''))

  // 추천 제안 — 3개씩 가로 그리드
  const recsItems = buildRecommendations(contracts)
  const recsHtml = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' +
    recsItems.map(r => `
      <div class="rec-card rec-${r.type === '보장성' ? 'protect' : 'save'}" style="margin:0">
        <div class="rec-icon">${r.icon}</div>
        <div>
          <div class="rec-type">${r.type}</div>
          <div class="rec-title">${escHtml(r.title)}</div>
          <div class="rec-desc">${escHtml(r.desc)}</div>
        </div>
      </div>`).join('') +
    '</div>'

  // 보험료 구성 인포그래픽 (실손 제외, 가로 바)
  const premiumInfoHtml = `
  <div class="ratio-wrap">
    <div class="ratio-header">
      <div class="ratio-title">보험료 구성 비율</div>
      <div class="ratio-sub">보장성 · 저축성 기준 (실손 별도)</div>
    </div>
    <div class="ratio-bar">
      ${보장성Premium > 0 ? `<div style="width:${보장비율}%;background:#1a2744;border-radius:${저축비율===0?'6px':'6px 0 0 6px'}" title="보장성 ${보장비율}%"></div>` : ''}
      ${저축성Premium > 0 ? `<div style="width:${저축비율}%;background:#c9a96e;border-radius:${보장비율===0?'6px':'0 6px 6px 0'}" title="저축성 ${저축비율}%"></div>` : ''}
    </div>
    <div class="ratio-items">
      <div class="ratio-row"><span class="rdot" style="background:#1a2744"></span><span class="rl">보장성</span><span class="rv">${formatMonthly(보장성Premium)}</span><span class="rp">${보장비율}%</span></div>
      <div class="ratio-row"><span class="rdot" style="background:#c9a96e"></span><span class="rl">저축성</span><span class="rv">${formatMonthly(저축성Premium)}</span><span class="rp">${저축비율}%</span></div>
      ${실손Premium > 0 ? `<div class="ratio-row ratio-silson"><span class="rdot" style="background:#10b981"></span><span class="rl">실손의료비</span><span class="rv">${formatMonthly(실손Premium)}</span><span class="rp">별도</span></div>` : ''}
      <div class="ratio-total">월 합계 <b>${formatMonthly(totalPremium)}</b></div>
    </div>
  </div>`

  const compareHtml = buildCompareTable(contracts)
  const timelineHtml = buildTimelineInfographicPage(contracts, customerBirth)

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escHtml(customerName)} 보장분석 리포트</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:"Pretendard Variable","Pretendard",-apple-system,sans-serif;
      color:#111;background:#f5f7fb;word-break:keep-all;font-size:13px}

    .pdf-page{background:#fff;padding:0;break-after:page;page-break-after:always}
    .cover-page{height:210mm;min-height:595px}
    .pdf-page:last-child{break-after:avoid;page-break-after:avoid}
    .page-inner{max-width:1160px;margin:0 auto;padding:16px 20px}

    .print-bar{position:sticky;top:0;display:flex;justify-content:flex-end;
      gap:8px;padding:8px 12px;background:#fff;z-index:10;border-bottom:1px solid #e2e8f0}
    .print-bar button{background:#1a2744;color:#fff;border:none;border-radius:8px;
      padding:9px 16px;font-weight:700;cursor:pointer;font-size:13px}

    .report-header{display:flex;justify-content:space-between;align-items:center;
      margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #1a2744}
    .report-kicker{color:#c9a96e;font-size:11px;font-weight:900;letter-spacing:.08em}
    .report-title{font-size:20px;font-weight:900;color:#1a2744;margin-top:4px}
    .report-meta{text-align:right}
    .report-meta-chips{display:flex;align-items:center;gap:12px;justify-content:flex-end}
    .report-meta-chip{text-align:center}
    .report-meta-chip .chip-label{font-size:9px;color:#94a3b8;font-weight:700;letter-spacing:.06em}
    .report-meta-chip .chip-value{font-size:16px;font-weight:900;color:#1a2744;line-height:1.2;margin-top:1px}
    .report-meta-chip .chip-value.small{font-size:12px;font-weight:600;color:#64748b}
    .report-meta-divider{width:1px;height:32px;background:#e2e8f0;flex-shrink:0}

    .page-label{font-size:12px;font-weight:900;color:#c9a96e;letter-spacing:.08em;
      margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #e2e8f0}
    .section-title{font-size:13px;font-weight:900;color:#1a2744;margin-bottom:8px;display:flex;align-items:center}
    .section-num{display:inline-flex;align-items:center;justify-content:center;
      width:20px;height:20px;border-radius:50%;background:#1a2744;color:#fff;
      font-size:10px;font-weight:900;margin-right:7px;flex-shrink:0}

    /* 게이지 */
    .gauge-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;
      background:#fafaf8;border:1px solid #e2e8f0;border-radius:12px;padding:12px}
    .gauge-wrap{text-align:center}
    .gauge-value{font-size:11px;font-weight:700;color:#1a2744;margin-top:2px}
    .gauge-status{font-size:10px;font-weight:700;margin-top:1px}

    /* 보험료 비율 인포그래픽 */
    .ratio-wrap{background:#fafaf8;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
    .ratio-header{margin-bottom:10px}
    .ratio-title{font-size:13px;font-weight:900;color:#1a2744}
    .ratio-sub{font-size:10px;color:#94a3b8;margin-top:2px}
    .ratio-bar{display:flex;height:18px;border-radius:6px;overflow:hidden;
      background:#e2e8f0;margin-bottom:12px}
    .ratio-items{display:flex;flex-direction:column;gap:7px}
    .ratio-row{display:flex;align-items:center;gap:8px;font-size:12px}
    .ratio-silson{padding-top:7px;margin-top:2px;border-top:1px dashed #e2e8f0}
    .rdot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
    .rl{flex:1;color:#4b5563}
    .rv{font-weight:700;color:#1a2744;min-width:72px;text-align:right}
    .rp{font-size:10px;color:#94a3b8;min-width:32px;text-align:right}
    .ratio-total{margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;
      display:flex;justify-content:flex-end;gap:6px;font-size:12px;color:#64748b}
    .ratio-total b{color:#1a2744;font-size:13px}

    .mini-title{font-size:12px;font-weight:900;color:#1a2744;margin-bottom:7px}
    .shortage-wrap,.silson-info{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin-top:8px}
    .shortage-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
    .shortage-chip{border-radius:9px;padding:7px 8px;background:#f8fafc;border:1px solid #e2e8f0}
    .shortage-chip span{display:block;font-size:10px;font-weight:800;color:#64748b}
    .shortage-chip b{display:block;font-size:12px;font-weight:900;margin-top:2px}
    .shortage-chip small{display:block;font-size:9px;font-weight:700;color:#64748b;margin-top:1px}
    .shortage-chip.ok b{color:#10b981}.shortage-chip.warn b{color:#f59e0b}.shortage-chip.bad b{color:#ef4444}
    .silson-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    .silson-info-grid div{background:#fafaf8;border-radius:8px;padding:7px}
    .silson-info-grid .wide{grid-column:1/-1}
    .silson-info-grid span{display:block;font-size:9px;font-weight:800;color:#94a3b8}
    .silson-info-grid b{display:block;font-size:11px;font-weight:900;color:#1a2744;margin-top:2px}

    /* 치료비 카드 */
    .tc-card{background:#fafaf8;border:1px solid #e2e8f0;border-radius:10px;padding:11px;margin-bottom:8px}
    .tc-head{font-weight:900;color:#1a2744;font-size:13px;margin-bottom:7px;
      border-bottom:1px solid #e2e8f0;padding-bottom:5px}
    .tc-row{display:flex;justify-content:space-between;align-items:center;
      padding:3px 0;font-size:12px;color:#374151}
    .tc-val{font-weight:700;color:#1a2744}
    .tc-empty{color:#94a3b8;font-weight:400}

    /* 추천 */
    .rec-card{display:flex;gap:12px;align-items:flex-start;border-radius:10px;
      padding:12px;border-left:4px solid;margin-bottom:10px}
    .rec-protect{background:#eff6ff;border-color:#1a2744}
    .rec-save{background:#fffbeb;border-color:#c9a96e}
    .rec-icon{font-size:20px;flex-shrink:0;margin-top:2px}
    .rec-type{font-size:10px;font-weight:900;letter-spacing:.06em;color:#64748b;margin-bottom:2px}
    .rec-title{font-size:13px;font-weight:900;color:#1a2744;margin-bottom:3px}
    .rec-desc{font-size:12px;color:#4b5563;line-height:1.5}

    /* 비교표 */
    .compare-wrap{overflow-x:auto}
    .compare-table{width:100%;border-collapse:collapse;font-size:10px;table-layout:auto}
    .compare-table th,.compare-table td{border:1px solid #e2e8f0;padding:4px 5px;vertical-align:middle}
    .compare-table th{background:#1a2744;color:#fff;text-align:center;font-size:9px;font-weight:700}
    .row-group{background:#1a2744;color:#c9a96e;font-weight:900;font-size:9px;
      text-align:center;writing-mode:vertical-lr;white-space:nowrap;padding:5px 3px;width:22px}
    .row-label{background:#fafaf8;font-weight:700;color:#1a2744;white-space:nowrap;width:110px;font-size:9px}
    .row-total{background:#eff6ff;font-weight:700;color:#1a2744;text-align:right;white-space:nowrap}
    .empty-cell{color:#94a3b8}
    .compare-table td{text-align:right;white-space:nowrap}
    .cell-amount{display:block;font-weight:800}
    .renewal-cell{background:#fff7ed!important;color:#9a3412!important}
    .ci-cell{background:#f5f3ff!important;color:#5b21b6!important}
    .renewal-cell.ci-cell{background:linear-gradient(135deg,#fff7ed 0%,#f5f3ff 100%)!important}
    .cov-badges{display:flex;justify-content:flex-end;gap:3px;margin-top:2px}
    .cov-badge{display:inline-flex;align-items:center;border-radius:999px;padding:1px 5px;
      font-size:7px;font-weight:900;line-height:1.2}
    .cov-badge.renewal{background:#fed7aa;color:#9a3412}
    .cov-badge.ci{background:#ddd6fe;color:#5b21b6}

    .img-fullpage{background:#fff;display:flex;align-items:center;justify-content:center;
      min-height:180mm;break-after:page;page-break-after:always}
    .img-fullpage:last-child{break-after:avoid;page-break-after:avoid}
    .img-fullpage img{max-width:100%;max-height:180mm;object-fit:contain;display:block}

    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    @media print{
      body{background:#fff}
      .print-bar{display:none}

      /* ── 핵심 수정: 각 pdf-page 정확히 A4 landscape 1페이지 = 186mm ── */
      .pdf-page{
        background:#fff;
        height:186mm!important;
        overflow:hidden!important;
        break-after:page!important;
        page-break-after:always!important;
      }
      /* 표지: screen 210mm → print 186mm */
      .cover-page{background:transparent!important;height:186mm!important}

      /* 콘텐츠 zoom — 186mm 안에 들어오도록 82%로 축소 */
      .page-inner{padding:8px 14px!important;zoom:0.82!important}

      /* 보험사별 상세·비교표 페이지: 내용이 많으면 자연스럽게 여러 페이지 허용 */
      .pdf-page-auto{height:auto!important;overflow:visible!important}

      /* 이미지 전체 페이지 */
      .img-fullpage{height:186mm!important;min-height:unset!important}

      tr{page-break-inside:avoid}
      .compare-wrap{overflow:visible}
      .compare-table{font-size:8px;width:100%}
      .compare-table th,.compare-table td{padding:2px 3px}
      .row-label{width:90px;font-size:8px}
      .row-group{width:18px;font-size:8px}
      .compare-table th{font-size:8px}
    }
  </style>
</head><body>
<div class="print-bar">
  <button onclick="window.print()">🖨️ 인쇄 / PDF 저장</button>
</div>

${advisorInfo ? `
<!-- ════ COVER PAGE ════ -->
<div class="pdf-page cover-page">
<div style="
  height:100%; display:flex; flex-direction:column;
  position:relative; overflow:hidden; padding:0;
  background:linear-gradient(135deg,#c8dff0 0%,#e4f1fa 45%,#f5fbff 70%,#d8ecf7 100%);
">
  <!-- 배경 실사 이미지 -->
  <div style="
    position:absolute;inset:0;
    background-image:url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1920&q=80');
    background-size:cover;background-position:center;
    opacity:0.18;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  "></div>
  <!-- 밝은 오버레이 -->
  <div style="position:absolute;inset:0;background:linear-gradient(120deg,rgba(180,215,240,0.5) 0%,rgba(220,238,252,0.3) 50%,rgba(255,255,255,0.4) 100%)"></div>
  <!-- 오른쪽 빛 번짐 -->
  <div style="position:absolute;top:-10%;right:-5%;width:55%;height:80%;border-radius:50%;background:radial-gradient(ellipse,rgba(255,255,255,0.65) 0%,transparent 70%)"></div>
  <!-- 상단 딥블루 라인 -->
  <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#1a2744,#2d4a8a,#1a7abf)"></div>
  <!-- 하단 라인 -->
  <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#1a2744,#2d6a9a,transparent)"></div>

  <!-- 콘텐츠 — 상단/중앙/하단 space-between -->
  <div style="position:relative;z-index:2;display:flex;flex-direction:column;justify-content:space-between;height:100%;padding:36px 70px 44px">

    <!-- 상단 브랜드 + 날짜 -->
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:11px;font-weight:900;color:#1a2744;letter-spacing:0.25em;opacity:0.75">
        METARICH SIGNAL GROUP
      </div>
      <div style="font-size:10px;color:#2d4a8a;opacity:0.6">
        ${new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' })} 작성
      </div>
    </div>

    <!-- 중앙 메인 타이틀 -->
    <div style="text-align:center">
      <div style="
        font-size:22px;font-weight:700;
        color:#1a3a6b;font-style:italic;
        letter-spacing:0.05em;margin-bottom:18px;
        text-shadow:0 1px 4px rgba(255,255,255,0.9);
      ">
        ${escHtml(customerName)} 고객님을 위한
      </div>
      <div style="
        font-size:56px;font-weight:900;
        color:#0d1f42;line-height:1.05;
        letter-spacing:-0.02em;
        text-shadow:0 2px 12px rgba(255,255,255,0.95),0 1px 2px rgba(0,0,0,0.06);
        margin-bottom:28px;
      ">
        고객보장분석 리포트
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px">
        <div style="height:1px;width:100px;background:linear-gradient(90deg,transparent,#2d6a9a)"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:#2d6a9a;opacity:0.7"></div>
        <div style="height:1px;width:100px;background:linear-gradient(90deg,#2d6a9a,transparent)"></div>
      </div>
    </div>

    <!-- 하단 설계사 카드 -->
    <div>
      <div style="
        background:rgba(255,255,255,0.62);
        border:1.5px solid rgba(26,39,68,0.18);
        border-left:4px solid #1a2744;
        border-radius:10px;padding:20px 30px;
        display:inline-flex;gap:28px;align-items:center;
      ">
        <div>
          <div style="font-size:9px;font-weight:700;color:#2d4a8a;letter-spacing:0.15em;margin-bottom:6px;opacity:0.8">담 당 설 계 사</div>
          <div style="font-size:20px;font-weight:900;color:#0d1f42;line-height:1.2">
            보험전문가 ${escHtml(advisorInfo.name || '담당 설계사')}
          </div>
          <div style="font-size:11px;color:#2d4a8a;font-weight:600;margin-top:4px;opacity:0.8">메타리치 시그널그룹</div>
        </div>
        <div style="width:1px;height:48px;background:rgba(26,39,68,0.15)"></div>
        <div>
          <div style="font-size:9px;font-weight:700;color:#2d4a8a;letter-spacing:0.1em;margin-bottom:6px;opacity:0.8">상 담 연 락 처</div>
          <div style="font-size:18px;font-weight:700;color:#1a2744;letter-spacing:0.04em">
            &#128222; ${escHtml(advisorInfo.phone || '')}
          </div>
        </div>
      </div>
    </div>

  </div>
</div>
</div>
` : ''}

<!-- ════ PAGE 1: 주요보장현황 + 보험료비율 ════ -->
<div class="pdf-page">
<div class="page-inner">
  <div class="report-header">
    <div>
      <div class="report-kicker">METARICH SIGNAL GROUP · 보장분석 리포트</div>
      <div class="report-title">${escHtml(customerName)} 고객 보장분석 ${isKey ? '(주요보장)' : '(전체)'}</div>
    </div>
    <div class="report-meta">
      <div class="report-meta-chips">
        <div class="report-meta-chip">
          <div class="chip-label">계약 수</div>
          <div class="chip-value">${contracts.length}<span style="font-size:13px;font-weight:700">건</span></div>
        </div>
        <div class="report-meta-divider"></div>
        <div class="report-meta-chip">
          <div class="chip-label">월 보험료</div>
          <div class="chip-value">${formatMonthly(totalPremium)}</div>
        </div>
        <div class="report-meta-divider"></div>
        <div class="report-meta-chip">
          <div class="chip-label">분석일</div>
          <div class="chip-value small">${new Date().toLocaleDateString('ko-KR')}</div>
        </div>
      </div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:60% 40%;gap:16px;align-items:start">
    <div>
      <div class="section-title"><span class="section-num">1</span>주요 보장 현황</div>
      <div style="background:#fafaf8;border:1px solid #e2e8f0;border-radius:12px;padding:12px">
        <div class="gauge-grid">${gaugesHtml}</div>
        <div style="display:flex;justify-content:center;margin-top:8px">${radarChartSvg(contracts, benchmark)}</div>
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0">
          <div style="font-size:11px;font-weight:900;color:#1a2744;margin-bottom:6px">&#10003;&nbsp;주요보장 체크</div>
          ${diagnosisAverageHtml}
        </div>
      </div>
    </div>
    <div>
      <div class="section-title"><span class="section-num">2</span>보험료 구성 비율</div>
      ${premiumInfoHtml}
      ${shortageHtml}
      ${brainHeartDetailHtml}
    </div>
  </div>
</div>
</div>

<!-- ════ PAGE 2: 치료비·수술비·간병·실손 상세 ════ -->
<div class="pdf-page">
<div class="page-inner">
  <div class="page-label">치료비 · 수술비 · 간병 · 실손 상세</div>

  <!-- ① 1행: 암치료비 / 뇌심장치료비 / 수술비 / 실손의료비 -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px">
    <div>
      <div class="section-title" style="font-size:12px"><span class="section-num">3</span>암 치료비</div>
      ${cancerCard}
    </div>
    <div>
      <div class="section-title" style="font-size:12px"><span class="section-num">4</span>뇌·심장 치료비</div>
      ${brainCard}
    </div>
    <div>
      <div class="section-title" style="font-size:12px"><span class="section-num">5</span>수술비</div>
      ${surgeryCard}
    </div>
    <div>
      <div class="section-title" style="font-size:12px"><span class="section-num">7</span>실손의료비</div>
      ${silsonCard}
    </div>
  </div>

  <!-- ② 구분선 -->
  <div style="border-top:1px solid #e2e8f0;margin-bottom:10px"></div>

  <!-- ③ 2행: 간병인+입원일당 / 운전자 / 추천제안 -->
  <div style="display:grid;grid-template-columns:1fr 1fr ${!isKey ? '2fr' : '1fr'};gap:10px;align-items:start">
    <div>
      <div class="section-title" style="font-size:12px"><span class="section-num">6</span>간병인 · 입원일당</div>
      ${nursingCard}
    </div>
    ${!isKey ? `
    <div>
      <div class="section-title" style="font-size:12px"><span class="section-num">8</span>운전자보험</div>
      ${driverCard}
    </div>
    <div>
      <div class="section-title" style="font-size:11px;margin-bottom:6px"><span class="section-num">9</span>추천 제안</div>
      ${recsHtml}
    </div>` : ''}
  </div>
</div>
</div>

${timelineHtml}

${hasRemodel ? `
<!-- ════ PAGE R1: 추가 제안 상품 ════ -->
<div class="pdf-page">
<div class="page-inner">
  <div class="page-label">리모델링 제안 — 추가 상품 안내</div>

  <!-- 보험료 변화 요약 배너 -->
  <div style="
    background:linear-gradient(135deg,#1a2744,#2d4a8a);
    border-radius:12px; padding:16px 20px; margin-bottom:16px;
    display:grid; grid-template-columns:1fr auto 1fr; gap:0; align-items:center;
  ">
    <div style="text-align:center; padding:0 12px; border-right:1px solid rgba(255,255,255,0.1)">
      <div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:700;margin-bottom:4px">기존 월 보험료</div>
      <div style="font-size:22px;font-weight:900;color:#fff">${formatWon(contracts.reduce((s,c)=>s+Number(c.monthlyPremium||0),0))}</div>
    </div>
    <div style="text-align:center; padding:0 20px">
      <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-bottom:4px">리모델링 차액</div>
      <div style="
        background:#c9a96e; color:#1a2744; border-radius:9999px;
        padding:5px 18px; font-size:16px; font-weight:900;
      ">
        ${(()=>{
          const removed = contracts.filter(c=>proposal!.removeContractIds.includes(c.id)).reduce((s,c)=>s+Number(c.monthlyPremium||0),0)
          const added = proposal!.addContracts.reduce((s,c)=>s+Number(c.monthlyPremium||0),0)
          const diff = added - removed
          return diff === 0 ? '변동없음' : (diff < 0 ? '−' : '+') + formatWon(Math.abs(diff))
        })()}
      </div>
    </div>
    <div style="text-align:center; padding:0 12px; border-left:1px solid rgba(255,255,255,0.1)">
      <div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:700;margin-bottom:4px">변경 후 월 보험료</div>
      <div style="font-size:22px;font-weight:900;color:#10b981">${(()=>{
        const cur = contracts.reduce((s,c)=>s+Number(c.monthlyPremium||0),0)
        const removed = contracts.filter(c=>proposal!.removeContractIds.includes(c.id)).reduce((s,c)=>s+Number(c.monthlyPremium||0),0)
        const added = proposal!.addContracts.reduce((s,c)=>s+Number(c.monthlyPremium||0),0)
        return formatWon(cur - removed + added)
      })()}</div>
    </div>
  </div>

  <!-- 해지 예정 계약 -->
  ${proposal!.removeContractIds.length > 0 ? `
  <div style="margin-bottom:14px">
    <div class="section-title" style="font-size:12px;color:#ef4444"><span class="section-num">✕</span>해지 예정 계약</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${contracts.filter(c=>proposal!.removeContractIds.includes(c.id)).map(c=>`
        <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;opacity:0.8">
          <div style="font-size:10px;color:#ef4444;font-weight:700">${escHtml(c.company)}</div>
          <div style="font-size:12px;font-weight:800;color:#1a2744;margin-top:2px">${escHtml(c.productName)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">월 ${formatWon(Number(c.monthlyPremium||0))}</div>
        </div>`).join('')}
    </div>
  </div>` : ''}

  <!-- 신규 추가 상품 -->
  ${proposal!.addContracts.length > 0 ? `
  <div>
    <div class="section-title" style="font-size:12px;color:#10b981"><span class="section-num">+</span>신규 추가 상품</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${proposal!.addContracts.map(c=>`
        <div style="background:#f0fff4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-size:11px;color:#059669;font-weight:700">${escHtml(c.company)}</div>
              <div style="font-size:13px;font-weight:900;color:#1a2744">${escHtml(c.productName)}</div>
              ${c.paymentPeriod ? `<div style="font-size:10px;color:#64748b;margin-top:2px">${escHtml(c.paymentPeriod)}</div>` : ''}
            </div>
            <div style="text-align:right">
              <div style="font-size:10px;color:#64748b">월 보험료</div>
              <div style="font-size:14px;font-weight:900;color:#059669">${formatWon(Number(c.monthlyPremium||0))}</div>
            </div>
          </div>
          ${c.coverages.length > 0 ? `
          <div style="border-top:1px solid #d1fae5;padding-top:7px;display:grid;grid-template-columns:1fr 1fr;gap:3px">
            ${c.coverages.slice(0,8).map(cov=>`
              <div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0">
                <span style="color:#374151">${escHtml(cov.name)}</span>
                <span style="font-weight:700;color:#1a2744">${formatWon(Number(cov.amount||0)*10000)}</span>
              </div>`).join('')}
            ${c.coverages.length > 8 ? `<div style="font-size:10px;color:#94a3b8;grid-column:1/-1">외 ${c.coverages.length-8}개 담보</div>` : ''}
          </div>` : ''}
        </div>`).join('')}
    </div>
  </div>` : ''}

  <!-- 설계사 메모 -->
  ${proposal!.memo ? `
  <div style="margin-top:14px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px">
    <div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:5px">📝 설계사 메모</div>
    <div style="font-size:12px;color:#1c1917;white-space:pre-wrap;line-height:1.7">${escHtml(proposal!.memo)}</div>
  </div>` : ''}
</div>
</div>

<!-- ════ PAGE R2: 보장 전후 비교 ════ -->
<div class="pdf-page">
<div class="page-inner">
  <div class="page-label">보장 전후 비교 — 주요 보장 항목</div>
  <div style="display:grid;grid-template-columns:1fr 60px 1fr;gap:0;align-items:stretch">
    <!-- 기존 보장 -->
    <div style="background:#f8fafc;border-radius:12px 0 0 12px;padding:16px 20px">
      <div style="font-size:11px;font-weight:900;color:#64748b;letter-spacing:0.1em;text-align:center;margin-bottom:14px">기존 보장</div>
      ${[
        { label:'암 진단비',    keys:['cancer_general','cancer_similar'] },
        { label:'뇌 진단비',    keys:['brain_vascular'] },
        { label:'심장 진단비',  keys:['heart_ischemic'] },
        { label:'간병인 지원',  keys:['nursing_hospital','nursing_injury','nursing_care_hospital','nursing_integrated'] },
        { label:'실손의료비',   keys:['silson_disease_inpatient','silson_injury_inpatient','silson_3major'] },
        { label:'운전자보험',   keys:['driver_accident'] },
        { label:'암 치료비합계',keys:['cancer_chemo','cancer_radiation','cancer_targeted','cancer_hadron'] },
        { label:'수술비 합계',  keys:['surgery_disease','surgery_disease_advanced','surgery_disease_comprehensive','surgery_disease_type','surgery_injury','surgery_injury_advanced','surgery_injury_comprehensive','surgery_injury_type','surgery_1_5','surgery_n_major'] },
      ].map(row => {
        const before = sumAmount(beforeContracts, ...row.keys)
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #e2e8f0">
          <span style="font-size:13px;font-weight:700;color:#374151">${escHtml(row.label)}</span>
          <span style="font-size:18px;font-weight:900;color:${before>0?'#1a2744':'#cbd5e1'}">${before>0?formatWon(before):'미보장'}</span>
        </div>`
      }).join('')}
    </div>

    <!-- 화살표 -->
    <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;background:#f1f5f9;gap:28px">
      ${[0,1,2,3,4,5,6,7].map(()=>`<div style="font-size:18px;color:#c9a96e;font-weight:900">→</div>`).join('')}
    </div>

    <!-- 변경 후 보장 -->
    <div style="background:#f0fdf4;border-radius:0 12px 12px 0;padding:16px 20px">
      <div style="font-size:11px;font-weight:900;color:#059669;letter-spacing:0.1em;text-align:center;margin-bottom:14px">변경 후 보장</div>
      ${[
        { label:'암 진단비',    keys:['cancer_general','cancer_similar'] },
        { label:'뇌 진단비',    keys:['brain_vascular'] },
        { label:'심장 진단비',  keys:['heart_ischemic'] },
        { label:'간병인 지원',  keys:['nursing_hospital','nursing_injury','nursing_care_hospital','nursing_integrated'] },
        { label:'실손의료비',   keys:['silson_disease_inpatient','silson_injury_inpatient','silson_3major'] },
        { label:'운전자보험',   keys:['driver_accident'] },
        { label:'암 치료비합계',keys:['cancer_chemo','cancer_radiation','cancer_targeted','cancer_hadron'] },
        { label:'수술비 합계',  keys:['surgery_disease','surgery_disease_advanced','surgery_disease_comprehensive','surgery_disease_type','surgery_injury','surgery_injury_advanced','surgery_injury_comprehensive','surgery_injury_type','surgery_1_5','surgery_n_major'] },
      ].map(row => {
        const before = sumAmount(beforeContracts, ...row.keys)
        const after  = sumAmount(afterContracts,  ...row.keys)
        const diff   = after - before
        const improved = diff > 0
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #d1fae5">
          <span style="font-size:13px;font-weight:700;color:#374151">${escHtml(row.label)}</span>
          <div style="text-align:right">
            <span style="font-size:18px;font-weight:900;color:${after>0?'#059669':'#cbd5e1'}">${after>0?formatWon(after):'미보장'}</span>
            ${improved?`<div style="font-size:10px;color:#10b981;font-weight:700">▲ ${formatWon(diff)} 증가</div>`:''}
          </div>
        </div>`
      }).join('')}
    </div>
  </div>
</div>
</div>

<!-- ════ PAGE R2-PROPOSAL: 제안서 · 서명 ════ -->
<div class="pdf-page">
<div class="page-inner">
  <div class="page-label">리모델링 제안서 — 보장 개선 안내</div>

  <!-- 상단 타이틀 + 날짜 -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div>
      <div style="font-size:18px;font-weight:900;color:#1a2744">${escHtml(customerName)} 고객님 맞춤 보장 제안서</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:3px">담당 설계사: ${escHtml(advisorInfo?.name || '메타리치 시그널그룹')}&nbsp;&nbsp;|&nbsp;&nbsp;작성일: ${new Date().toLocaleDateString('ko-KR')}</div>
    </div>
    <div style="text-align:right;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 18px">
      <div style="font-size:9px;color:#94a3b8;font-weight:700">보험료 변동</div>
      <div style="font-size:22px;font-weight:900;color:${(()=>{const rem=contracts.filter(c=>proposal!.removeContractIds.includes(c.id)).reduce((s,c)=>s+Number(c.monthlyPremium||0),0);const add=proposal!.addContracts.reduce((s,c)=>s+Number(c.monthlyPremium||0),0);return(add-rem)<=0?'#10b981':'#ef4444'})()}">${(()=>{const rem=contracts.filter(c=>proposal!.removeContractIds.includes(c.id)).reduce((s,c)=>s+Number(c.monthlyPremium||0),0);const add=proposal!.addContracts.reduce((s,c)=>s+Number(c.monthlyPremium||0),0);const diff=add-rem;return diff===0?'변동없음':(diff<0?'월 '+formatWon(Math.abs(diff))+' 절감':'월 '+formatWon(diff)+' 증가')})()}</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">${formatMonthly(contracts.reduce((s,c)=>s+Number(c.monthlyPremium||0),0))} → <b style="color:#1a2744">${(()=>{const cur=contracts.reduce((s,c)=>s+Number(c.monthlyPremium||0),0);const rem=contracts.filter(c=>proposal!.removeContractIds.includes(c.id)).reduce((s,c)=>s+Number(c.monthlyPremium||0),0);const add=proposal!.addContracts.reduce((s,c)=>s+Number(c.monthlyPremium||0),0);return formatMonthly(cur-rem+add)})()}</b></div>
    </div>
  </div>

  <!-- 신규 제안 상품 상세표 -->
  ${proposal!.addContracts.length > 0 ? `
  <div style="margin-bottom:14px">
    <div style="font-size:12px;font-weight:900;color:#059669;margin-bottom:8px;display:flex;align-items:center;gap:6px">
      <span style="background:#d1fae5;color:#059669;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:900">+</span>
      신규 추가 상품 및 주요 보장
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:10px">
      <thead>
        <tr style="background:#1a2744;color:#fff">
          <th style="padding:7px 8px;text-align:left;border-radius:6px 0 0 0">보험사</th>
          <th style="padding:7px 8px;text-align:left">상품명</th>
          <th style="padding:7px 8px;text-align:center">납입기간</th>
          <th style="padding:7px 8px;text-align:center">보장기간</th>
          <th style="padding:7px 8px;text-align:right">월 보험료</th>
          <th style="padding:7px 8px;text-align:left;border-radius:0 6px 0 0">주요 보장 (상위 4개)</th>
        </tr>
      </thead>
      <tbody>
        ${proposal!.addContracts.map((c, idx) => {
          const payPeriod = c.paymentPeriod || '-'
          const topCovs = c.coverages.filter(cv=>Number(cv.amount)>0).slice(0,4)
          const bg = idx % 2 === 0 ? '#f8fafc' : '#fff'
          return `<tr style="background:${bg};border-bottom:1px solid #e2e8f0">
            <td style="padding:8px;font-weight:700;color:#059669">${escHtml(c.company)}</td>
            <td style="padding:8px;font-weight:700;color:#1a2744;max-width:180px">${escHtml(c.productName)}</td>
            <td style="padding:8px;text-align:center;color:#374151">${escHtml(payPeriod.match(/(\d+년납)/)?.[1]||payPeriod.match(/전기납/)?.[0]||'-')}</td>
            <td style="padding:8px;text-align:center;color:#374151">${escHtml(payPeriod.match(/(\d+세만기|종신)/)?.[1]||'종신')}</td>
            <td style="padding:8px;text-align:right;font-weight:900;color:#059669">${formatMonthly(Number(c.monthlyPremium||0))}</td>
            <td style="padding:8px">${topCovs.map(cv=>`<span style="display:inline-block;margin:1px 2px;background:#f0fdf4;border:1px solid #d1fae5;border-radius:4px;padding:1px 6px;font-size:9px;color:#065f46">${escHtml(cv.name||'')} <b>${formatWon(Number(cv.amount||0)*10000)}</b></span>`).join('')}</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <!-- 해지 상품 -->
  ${proposal!.removeContractIds.length > 0 ? `
  <div style="margin-bottom:14px">
    <div style="font-size:12px;font-weight:900;color:#ef4444;margin-bottom:8px;display:flex;align-items:center;gap:6px">
      <span style="background:#fee2e2;color:#ef4444;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:900">✕</span>
      해지 예정 상품
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${contracts.filter(c=>proposal!.removeContractIds.includes(c.id)).map(c=>`
      <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:10px">
        <div>
          <div style="font-size:9px;color:#ef4444;font-weight:700">${escHtml(c.company)}</div>
          <div style="font-size:11px;font-weight:800;color:#1a2744">${escHtml(c.productName.length>20?c.productName.slice(0,20)+'…':c.productName)}</div>
        </div>
        <div style="font-size:12px;font-weight:900;color:#dc2626;border-left:1px solid #fecaca;padding-left:10px">월 ${formatMonthly(Number(c.monthlyPremium||0))}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}

  <!-- 개선 포인트 -->
  <div style="margin-bottom:16px;padding:12px 16px;background:linear-gradient(135deg,#eff6ff,#f0fdf4);border-radius:10px;border:1px solid #bfdbfe">
    <div style="font-size:12px;font-weight:900;color:#1a2744;margin-bottom:8px">✅ 이번 제안으로 개선되는 보장</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      ${(()=>{
        const improvements: string[] = []
        const keys = [
          { label:'암 진단비', k:['cancer_general'] },
          { label:'뇌혈관 진단비', k:['brain_vascular'] },
          { label:'허혈성심장 진단비', k:['heart_ischemic'] },
          { label:'항암치료비', k:['cancer_chemo','cancer_radiation','cancer_targeted'] },
          { label:'2대주요치료비', k:['vascular_major','vascular_major_benefit','vascular_major_nonbenefit'] },
          { label:'암주요치료비', k:['cancer_major_benefit','cancer_major_nonbenefit'] },
          { label:'수술비', k:['surgery_disease','surgery_injury','surgery_n_major','surgery_1_5'] },
          { label:'간병인 지원', k:['nursing_hospital','nursing_injury','nursing_integrated'] },
          { label:'후유장해', k:['disability_injury','disability_disease','disability_injury_80','disability_disease_80'] },
          { label:'사망보험금', k:['death_general','death_injury'] },
        ]
        for(const item of keys){
          const before=sumAmount(beforeContracts,...item.k)
          const after=sumAmount(afterContracts,...item.k)
          if(after>before){
            const diff=after-before
            improvements.push(`<div style="font-size:10px;padding:5px 8px;background:rgba(255,255,255,0.7);border-radius:6px;display:flex;justify-content:space-between;gap:8px"><span style="color:#374151;font-weight:700">${escHtml(item.label)}</span><span style="color:#059669;font-weight:900">+${formatWon(diff)}</span></div>`)
          }
        }
        if(improvements.length===0){
          return '<div style="grid-column:1/-1;font-size:10px;color:#94a3b8;text-align:center">비교 데이터 없음</div>'
        }
        return improvements.join('')
      })()}
    </div>
  </div>

  <!-- 메모 -->
  ${proposal!.memo ? `
  <div style="margin-bottom:14px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px">
    <div style="font-size:10px;font-weight:700;color:#92400e;margin-bottom:4px">📝 설계사 메모</div>
    <div style="font-size:11px;color:#1c1917;white-space:pre-wrap;line-height:1.7">${escHtml(proposal!.memo)}</div>
  </div>` : ''}

  <!-- 서명란 -->
  <div style="border-top:2px solid #1a2744;padding-top:14px;margin-top:4px">
    <div style="text-align:center;font-size:11px;color:#374151;margin-bottom:14px;line-height:1.8">
      위 내용에 대해 충분한 설명을 듣고 이해하였으며, 본 제안 내용에 동의합니다.<br/>
      <span style="font-size:9px;color:#94a3b8">※ 본 제안서는 고객 상담용 참고 자료이며, 법적 계약 효력을 대체하지 않습니다.</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px">
        <div style="font-size:10px;font-weight:900;color:#64748b;margin-bottom:16px">고 객 서 명</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div>
            <div style="font-size:11px;color:#374151;margin-bottom:4px">성명: <span style="font-weight:700">${escHtml(customerName)}</span></div>
            <div style="font-size:11px;color:#374151">서명:</div>
          </div>
          <div style="width:140px;border-bottom:1px solid #94a3b8;margin-bottom:2px">&nbsp;</div>
        </div>
        <div style="margin-top:14px;font-size:11px;color:#374151">확인 일자: <span style="font-weight:700">${new Date().toLocaleDateString('ko-KR')}</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px">
        <div style="font-size:10px;font-weight:900;color:#64748b;margin-bottom:16px">설 계 사 서 명</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div>
            <div style="font-size:11px;color:#374151;margin-bottom:4px">성명: <span style="font-weight:700">${escHtml(advisorInfo?.name||'')}</span></div>
            <div style="font-size:11px;color:#374151">서명:</div>
          </div>
          <div style="width:140px;border-bottom:1px solid #94a3b8;margin-bottom:2px">&nbsp;</div>
        </div>
        <div style="margin-top:14px;font-size:11px;color:#374151">작성 일자: <span style="font-weight:700">${new Date().toLocaleDateString('ko-KR')}</span></div>
      </div>
    </div>
  </div>

</div>
</div>

<!-- ════ PAGE R3: 상세 시나리오 ════ -->
<div class="pdf-page">
<div class="page-inner">
  <div class="page-label">보장 시나리오 — 실제 발생 시 보장 흐름</div>

  <!-- 암 시나리오 -->
  <div style="margin-bottom:16px">
    <div class="section-title" style="font-size:13px"><span class="section-num">①</span>암 진단·치료 시나리오</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px">
        <div style="font-size:10px;font-weight:900;color:#991b1b;margin-bottom:8px">기존 보장</div>
        ${[
          { label:'암진단비', keys:['cancer_general'] },
          { label:'유사암진단', keys:['cancer_similar'] },
          { label:'일반항암약물치료비', keys:['cancer_chemo'] },
          { label:'항암방사선치료비', keys:['cancer_radiation'] },
          { label:'표적항암약물치료비', keys:['cancer_targeted'] },
          { label:'암수술비', keys:['cancer_surgery'] },
          { label:'암주요치료비(급여)', keys:['cancer_major_benefit'] },
          { label:'암주요치료비(비급여)', keys:['cancer_major_nonbenefit'] },
        ].map(r => {
          const v = sumAmount(beforeContracts, ...r.keys)
          return v > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #fee2e2">
            <span style="color:#374151">${escHtml(r.label)}</span>
            <span style="font-weight:800;color:#1a2744">${formatWon(v)}</span>
          </div>` : ''
        }).join('')}
        <div style="margin-top:8px;padding-top:6px;border-top:2px solid #fca5a5;display:flex;justify-content:space-between">
          <span style="font-size:12px;font-weight:900;color:#991b1b">합계</span>
          <span style="font-size:14px;font-weight:900;color:#991b1b">${formatWon(sumAmount(beforeContracts,'cancer_general','cancer_similar','cancer_chemo','cancer_targeted','cancer_radiation','cancer_surgery','cancer_major_benefit','cancer_major_nonbenefit'))}</span>
        </div>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px">
        <div style="font-size:10px;font-weight:900;color:#059669;margin-bottom:8px">변경 후 보장</div>
        ${[
          { label:'암진단비', keys:['cancer_general'] },
          { label:'유사암진단', keys:['cancer_similar'] },
          { label:'일반항암약물치료비', keys:['cancer_chemo'] },
          { label:'항암방사선치료비', keys:['cancer_radiation'] },
          { label:'표적항암약물치료비', keys:['cancer_targeted'] },
          { label:'암수술비', keys:['cancer_surgery'] },
          { label:'암주요치료비(급여)', keys:['cancer_major_benefit'] },
          { label:'암주요치료비(비급여)', keys:['cancer_major_nonbenefit'] },
        ].map(r => {
          const v = sumAmount(afterContracts, ...r.keys)
          return v > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #d1fae5">
            <span style="color:#374151">${escHtml(r.label)}</span>
            <span style="font-weight:800;color:#059669">${formatWon(v)}</span>
          </div>` : ''
        }).join('')}
        <div style="margin-top:8px;padding-top:6px;border-top:2px solid #6ee7b7;display:flex;justify-content:space-between">
          <span style="font-size:12px;font-weight:900;color:#059669">합계</span>
          <span style="font-size:14px;font-weight:900;color:#059669">${formatWon(sumAmount(afterContracts,'cancer_general','cancer_similar','cancer_chemo','cancer_targeted','cancer_radiation','cancer_surgery','cancer_major_benefit','cancer_major_nonbenefit'))}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 뇌·심장 시나리오 -->
  <div style="margin-bottom:16px">
    <div class="section-title" style="font-size:13px"><span class="section-num">②</span>뇌·심장 질환 시나리오</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 14px">
        <div style="font-size:10px;font-weight:900;color:#1e40af;margin-bottom:8px">기존 보장</div>
        ${[
          { label:'뇌혈관진단', keys:['brain_vascular'] },
          { label:'허혈성심장진단', keys:['heart_ischemic'] },
          { label:'뇌심장수술', keys:['two_major_surgery'] },
          { label:'중환자실치료', keys:['two_major_icu'] },
          { label:'뇌심주요치료비', keys:['vascular_major','vascular_major_benefit','vascular_major_nonbenefit'] },
        ].map(r => {
          const v = sumAmount(beforeContracts, ...r.keys)
          return v > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #dbeafe">
            <span style="color:#374151">${escHtml(r.label)}</span>
            <span style="font-weight:800;color:#1e3a8a">${formatWon(v)}</span>
          </div>` : ''
        }).join('')}
        <div style="margin-top:8px;padding-top:6px;border-top:2px solid #93c5fd;display:flex;justify-content:space-between">
          <span style="font-size:12px;font-weight:900;color:#1e40af">합계</span>
          <span style="font-size:14px;font-weight:900;color:#1e40af">${formatWon(sumAmount(beforeContracts,'brain_vascular','heart_ischemic','two_major_surgery','two_major_icu','vascular_major','vascular_major_benefit','vascular_major_nonbenefit'))}</span>
        </div>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px">
        <div style="font-size:10px;font-weight:900;color:#059669;margin-bottom:8px">변경 후 보장</div>
        ${[
          { label:'뇌혈관진단', keys:['brain_vascular'] },
          { label:'허혈성심장진단', keys:['heart_ischemic'] },
          { label:'뇌심장수술', keys:['two_major_surgery'] },
          { label:'중환자실치료', keys:['two_major_icu'] },
          { label:'뇌심주요치료비', keys:['vascular_major','vascular_major_benefit','vascular_major_nonbenefit'] },
        ].map(r => {
          const v = sumAmount(afterContracts, ...r.keys)
          return v > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #d1fae5">
            <span style="color:#374151">${escHtml(r.label)}</span>
            <span style="font-weight:800;color:#059669">${formatWon(v)}</span>
          </div>` : ''
        }).join('')}
        <div style="margin-top:8px;padding-top:6px;border-top:2px solid #6ee7b7;display:flex;justify-content:space-between">
          <span style="font-size:12px;font-weight:900;color:#059669">합계</span>
          <span style="font-size:14px;font-weight:900;color:#059669">${formatWon(sumAmount(afterContracts,'brain_vascular','heart_ischemic','two_major_surgery','two_major_icu','vascular_major','vascular_major_benefit','vascular_major_nonbenefit'))}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 간병·실손 시나리오 -->
  <div>
    <div class="section-title" style="font-size:13px"><span class="section-num">③</span>간병·실손 시나리오</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div style="background:#fafaf8;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px">
        <div style="font-size:10px;font-weight:900;color:#475569;margin-bottom:8px">기존 보장</div>
        ${[
          { label:'간병인(질병)', keys:['nursing_hospital'] },
          { label:'간병인(상해)', keys:['nursing_injury'] },
          { label:'요양병원 간병', keys:['nursing_care_hospital'] },
          { label:'간호간병통합', keys:['nursing_integrated'] },
          { label:'질병 입원 실손', keys:['silson_disease_inpatient'] },
          { label:'상해 입원 실손', keys:['silson_injury_inpatient'] },
          { label:'3대비급여', keys:['silson_3major'] },
        ].map(r => {
          const v = sumAmount(beforeContracts, ...r.keys)
          return v > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #f1f5f9">
            <span style="color:#374151">${escHtml(r.label)}</span>
            <span style="font-weight:800;color:#1a2744">${formatWon(v)}</span>
          </div>` : ''
        }).join('')}
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px">
        <div style="font-size:10px;font-weight:900;color:#059669;margin-bottom:8px">변경 후 보장</div>
        ${[
          { label:'간병인(질병)', keys:['nursing_hospital'] },
          { label:'간병인(상해)', keys:['nursing_injury'] },
          { label:'요양병원 간병', keys:['nursing_care_hospital'] },
          { label:'간호간병통합', keys:['nursing_integrated'] },
          { label:'질병 입원 실손', keys:['silson_disease_inpatient'] },
          { label:'상해 입원 실손', keys:['silson_injury_inpatient'] },
          { label:'3대비급여', keys:['silson_3major'] },
        ].map(r => {
          const v = sumAmount(afterContracts, ...r.keys)
          return v > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #d1fae5">
            <span style="color:#374151">${escHtml(r.label)}</span>
            <span style="font-weight:800;color:#059669">${formatWon(v)}</span>
          </div>` : ''
        }).join('')}
      </div>
    </div>
  </div>
</div>
</div>
` : ''}

${!isKey ? `
<!-- ════ PAGE CONTRACTS: 보험회사별 보장 현황 (상세 전용) ════ -->
<div class="pdf-page pdf-page-auto">
<div class="page-inner">
  <div class="page-label">보험회사별 보장 현황 (상세)</div>
  <div class="section-title"><span class="section-num">📋</span>보험회사별 보장 현황</div>
  <div style="font-size:11px;color:#64748b;margin-bottom:14px">
    계약별 보장 담보 목록입니다. 상담 시 어느 보험에 어떤 보장이 준비되어 있는지 확인하세요.
  </div>
  ${buildContractBreakdownPage(contracts)}
</div>
</div>
` : ''}

<!-- ════ PAGE CONTACTS: 보험사별 연락처 ════ -->
<div class="pdf-page">
<div class="page-inner">
  <div class="page-label">보험사별 고객센터 연락처</div>
  <div class="section-title" style="margin-bottom:16px"><span class="section-num">📞</span>보험사 고객센터</div>
  <div style="font-size:11px;color:#64748b;margin-bottom:16px">
    보유 계약 보험사${hasRemodel && proposal!.addContracts.length > 0 ? ' 및 추가 제안 보험사' : ''}의 고객센터 연락처입니다.
  </div>
  ${buildContactsPage(contracts, hasRemodel ? proposal!.addContracts : [])}
  <div style="margin-top:20px;padding:12px 16px;background:#f8fafc;border-radius:8px;font-size:11px;color:#94a3b8;text-align:center">
    위 번호는 보험사 대표 고객센터이며, 실제 상담 시간은 각 보험사 안내를 따릅니다.
  </div>
</div>
</div>

<!-- ════ PAGE LAST: 보험사별 담보 비교표 (주요/전체 공통) ════ -->
<div class="pdf-page pdf-page-auto">
<div class="page-inner">
  <div class="page-label">보험사별 · 담보별 비교표</div>

  <div class="section-title"><span class="section-num">★</span>전체 보험사 담보 비교</div>
  ${compareHtml}
  <div style="margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;
    text-align:center;color:#94a3b8;font-size:10px">
    본 분석 리포트는 고객 상담용 참고 자료이며, 보험 계약의 법적 효력을 대체하지 않습니다.<br/>
    메타리치 시그널그룹 | ${new Date().toLocaleDateString('ko-KR')} 작성
  </div>
</div>
</div>


${selectedImageSources.map((item, idx) => `
<div class="img-fullpage">
  <img src="${escHtml(item.dataUrl)}" alt="ì°¸ê³ ìë£ ${idx + 1}" loading="eager"/>
</div>`).join('')}

<script>
  function waitForImages() {
    var images = Array.prototype.slice.call(document.images || []);
    if (!images.length) return Promise.resolve();
    return Promise.all(images.map(function(img) {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(function(resolve) {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));
  }
  waitForImages().then(function() {
    if (window.opener && window.opener.__pdfReady) window.opener.__pdfReady();
  });
</script>
</body>
</html>
`
}
