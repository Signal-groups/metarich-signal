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

type PdfExportInput = {
  customerName: string
  contracts: ProContract[]
  type: 'full' | 'key'
  selectedImages?: string[]
  proposal?: RemodelProposal
  advisorInfo?: AdvisorInfo
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
  'silson_disease_inpatient', 'silson_injury_inpatient',
  'silson_disease_outpatient', 'silson_injury_outpatient',
  'silson_3major',
])

function sumAmount(contracts: ProContract[], ...rowKeys: string[]): number {
  let total = 0
  for (const key of rowKeys) {
    if (MAX_ROW_KEYS.has(key)) {
      let max = 0
      for (const c of contracts)
        for (const cov of c.coverages)
          if (cov.rowKey === key) max = Math.max(max, Number(cov.amount || 0) * 10000)
      total += max
    } else {
      for (const c of contracts)
        for (const cov of c.coverages)
          if (cov.rowKey === key) total += Number(cov.amount || 0) * 10000
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
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(0)}억`
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
function escHtml(s: string | number | undefined): string {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function imageMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
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

function inferSilsonInfo(contracts: ProContract[]) {
  const silson = contracts.find((contract) =>
    classifyType(contract) === '실손' ||
    contract.coverages.some((coverage) => coverage.rowKey.startsWith('silson_'))
  )
  if (!silson) {
    return { generation: '미가입 또는 확인 필요', joinedAt: '-', renewalRule: '실손 담보 확인 필요' }
  }
  const parsed = parseContractYearMonth(silson.contractDate)
  if (!parsed) {
    return { generation: '확인 필요', joinedAt: silson.contractDate || '-', renewalRule: silson.isRenewal ? '갱신형' : '계약일 기준 확인' }
  }
  const ym = parsed.year * 100 + parsed.month
  if (ym <= 200909) return { generation: '1세대 실손', joinedAt: parsed.label, renewalRule: '3년 또는 5년 갱신형 중심' }
  if (ym <= 201703) return { generation: '2세대 실손', joinedAt: parsed.label, renewalRule: '대체로 15년 재가입 구조' }
  if (ym <= 202106) return { generation: '3세대 실손', joinedAt: parsed.label, renewalRule: '15년 재가입 · 비급여 특약 분리' }
  return { generation: '4세대 실손', joinedAt: parsed.label, renewalRule: '5년 재가입 · 비급여 차등 구조' }
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
function radarChartSvg(contracts: ProContract[]): string {
  const AXES = [
    { label: '암진단비',  keys: ['cancer_general'],                                          rec: 50_000_000 },
    { label: '뇌진단비',  keys: ['brain_stroke', 'brain_hemorrhage', 'brain_vascular'],      rec: 40_000_000 },
    { label: '심장(허혈성)', keys: ['heart_ischemic', 'heart_vascular'],                    rec: 40_000_000 },
    { label: '수술비',    keys: ['surgery_disease', 'surgery_injury', 'surgery_1_5'],         rec:  5_000_000 },
    { label: '실손',      keys: ['silson_disease_inpatient', 'silson_injury_inpatient'],      rec: 50_000_000 },
    { label: '사망',      keys: ['death_general', 'death_disease', 'death_injury'],           rec: 100_000_000 },
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
  const brain  = sumAmount(contracts, 'brain_stroke', 'brain_hemorrhage', 'brain_vascular')
  const heart  = sumAmount(contracts, 'heart_acute_mi', 'heart_ischemic', 'heart_vascular')
  const death  = sumAmount(contracts, 'death_general', 'death_disease', 'death_injury')
  const recs: Array<{ type: '보장성' | '저축성'; title: string; desc: string; icon: string }> = []
  if (cancer < 30_000_000) recs.push({ type: '보장성', title: '암진단비 보완', desc: `현재 ${formatWon(cancer)}로 3천만원 기준 미달. 진단비 보강 우선 권장.`, icon: '🩺' })
  if (brain < 40_000_000)  recs.push({ type: '보장성', title: '뇌진단비 보완', desc: `뇌혈관 합산 ${formatWon(brain)} — 4천만원 이상 확보 권장.`, icon: '🧠' })
  if (heart < 40_000_000)  recs.push({ type: '보장성', title: '심장진단비 보완', desc: `심장 합산 ${formatWon(heart)} — 4천만원 이상 확보 권장.`, icon: '🫀' })
  if (death < 100_000_000) recs.push({ type: '보장성', title: '사망보장 강화', desc: `사망보험금 ${formatWon(death)} — 가족 생활비 기반 최소 1억 확보 검토.`, icon: '🛡️' })
  recs.push({ type: '저축성', title: '노후연금 설계', desc: '은퇴 후 월 200만원 수령 기준 연금보험 가입 시뮬레이션을 권장합니다.', icon: '💰' })
  recs.push({ type: '저축성', title: '변액유니버셜 활용', desc: '중장기 자산 성장과 보장의 병행이 필요한 경우 변액보험 검토를 추천합니다.', icon: '📈' })
  return [...recs.filter(r => r.type === '보장성').slice(0, 3), ...recs.filter(r => r.type === '저축성').slice(0, 2)]
}


// ── 보험회사별 보장 현황 (상세 출력 전용) ─────────────────────────────────
function buildContractBreakdownPage(contracts: ProContract[]): string {
  if (!contracts.length) return ''

  const fmtWonB = (v: number) => v ? `${v.toLocaleString()}만원` : '-'
  const fmtDate = (d?: string) => d ? d.replace(/^(\d{2,4})[.\-](\d{1,2})[.\-](\d{1,2}).*/, '$1.$2').replace(/^(\d{2})\.(\d{1,2})$/, '20$1.$2') : ''

  const activeContracts = contracts.filter(c => c.status !== 'lapsed' && c.status !== 'expired')
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
    const typeColor = c.policyType === 'savings' ? '#f59e0b' : '#1a2744'
    const dateStr = fmtDate(c.contractDate)
    const periodStr = c.paymentPeriod || ''

    return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;' +
      'break-inside:avoid;page-break-inside:avoid;overflow:hidden">' +
      // 헤더
      '<div style="background:#1a2744;padding:10px 12px;display:flex;justify-content:space-between;align-items:center">' +
        '<div>' +
          '<div style="font-size:12px;font-weight:900;color:#fff">' + escHtml(c.company) + '</div>' +
          '<div style="font-size:10px;color:rgba(255,255,255,0.65);margin-top:2px">' + escHtml(c.productName || '') + '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:13px;font-weight:900;color:#c9a96e">' + (premium ? premium.toLocaleString() + '원/월' : '-') + '</div>' +
          '<div style="display:flex;gap:6px;margin-top:3px;justify-content:flex-end">' +
            '<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.8);font-weight:700">' + typeLabel + '</span>' +
            (dateStr ? '<span style="font-size:9px;color:rgba(255,255,255,0.5)">' + dateStr + '</span>' : '') +
            (periodStr ? '<span style="font-size:9px;color:rgba(255,255,255,0.5)">' + escHtml(periodStr) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      // 담보 목록
      '<div style="padding:8px 12px">' +
        (covEmpty
          ? '<div style="font-size:10px;color:#94a3b8;text-align:center;padding:8px">담보 정보 없음</div>'
          : covRows) +
      '</div>' +
    '</div>'
  }).join('')

  // 2열 그리드 레이아웃
  const totalPremium = activeContracts.reduce((s, c) => s + Number(c.monthlyPremium || 0), 0)
  return (
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start">' +
    cards +
    '</div>' +
    '<div style="margin-top:14px;padding:10px 14px;background:#f8fafc;border-radius:8px;' +
    'display:flex;justify-content:space-between;align-items:center;font-size:11px">' +
      '<span style="color:#64748b">총 ' + activeContracts.length + '건 · ' +
        activeContracts.filter(c => c.policyType !== 'savings').length + '건 보장성 / ' +
        activeContracts.filter(c => c.policyType === 'savings').length + '건 저축성' +
      '</span>' +
      '<span style="font-weight:900;color:#1a2744">월 합계 ' + totalPremium.toLocaleString() + '원</span>' +
    '</div>'
  )
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
    { group: '진단비',    label: '유사암 진단비',        rowKey: 'cancer_similar' },
    { group: '진단비',    label: '뇌혈관질환 진단비',   rowKey: 'brain_vascular' },
    { group: '진단비',    label: '뇌졸중 진단비',       rowKey: 'brain_stroke' },
    { group: '진단비',    label: '뇌출혈 진단비',       rowKey: 'brain_hemorrhage' },
    { group: '진단비',    label: '허혈성심장질환 진단비', rowKey: 'heart_ischemic' },
    { group: '진단비',    label: '급성심근경색 진단비',  rowKey: 'heart_acute_mi' },
    { group: '진단비',    label: '심장질환 진단비',      rowKey: 'heart_vascular' },
    { group: '암치료비',  label: '항암방사선치료비',     rowKey: 'cancer_radiation' },
    { group: '암치료비',  label: '중입자방사선치료비',   rowKey: 'cancer_hadron' },
    { group: '암치료비',  label: '양성자방사선치료비',   rowKey: 'cancer_proton' },
    { group: '암치료비',  label: '항암약물치료비',       rowKey: 'cancer_chemo' },
    { group: '암치료비',  label: '표적항암약물치료비',   rowKey: 'cancer_targeted' },
    { group: '암치료비',  label: '카티항암치료비',       rowKey: 'cancer_cart' },
    { group: '뇌심장치료', label: '혈전용해치료비',     rowKey: 'two_major_thrombolysis' },
    { group: '뇌심장치료', label: '중환자실치료비',     rowKey: 'two_major_icu' },
    { group: '뇌심장치료', label: '뇌심장 수술·시술비', rowKey: 'two_major_surgery' },
    { group: '뇌심장치료', label: '2대주요치료비(통합)', rowKey: 'vascular_major' },
    { group: '수술비',    label: '수술비(질병)',         rowKey: 'surgery_disease' },
    { group: '수술비',    label: '수술비(상해)',         rowKey: 'surgery_injury' },
    { group: '수술비',    label: '1~5종 수술비',        rowKey: 'surgery_1_5' },
    { group: '수술비',    label: 'N대 수술비',          rowKey: 'surgery_n_major' },
    { group: '간병',      label: '간병인(질병/일반)',    rowKey: 'nursing_hospital' },
    { group: '간병',      label: '간병인(상해)',         rowKey: 'nursing_injury' },
    { group: '간병',      label: '요양병원 간병인',      rowKey: 'nursing_care_hospital' },
    { group: '간병',      label: '간호간병통합',         rowKey: 'nursing_integrated' },
    { group: '입원일당',  label: '입원일당(질병)',       rowKey: 'hospital_disease_daily' },
    { group: '입원일당',  label: '입원일당(상해)',       rowKey: 'hospital_injury_daily' },
    { group: '실손',      label: '실손입원(질병)',       rowKey: 'silson_disease_inpatient' },
    { group: '실손',      label: '실손입원(상해)',       rowKey: 'silson_injury_inpatient' },
    { group: '실손',      label: '실손통원(질병)',       rowKey: 'silson_disease_outpatient' },
    { group: '실손',      label: '실손통원(상해)',       rowKey: 'silson_injury_outpatient' },
    { group: '실손',      label: '비급여3대(도수/주사/MRI)', rowKey: 'silson_3major' },
    { group: '사망',      label: '일반사망',             rowKey: 'death_general' },
    { group: '사망',      label: '재해사망',             rowKey: 'death_injury' },
    { group: '사망',      label: '질병사망',             rowKey: 'death_disease' },
    { group: '운전자',    label: '교통사고처리지원금',   rowKey: 'driver_accident' },
    { group: '운전자',    label: '자동차사고 변호사비용', rowKey: 'driver_lawyer' },
    { group: '운전자',    label: '벌금',                 rowKey: 'driver_fine' },
    { group: '기타',      label: '일상배상책임',         rowKey: 'other_liability' },
    { group: '기타',      label: '치매진단비',           rowKey: 'dementia_diagnosis' },
    { group: '기타',      label: '중대질병(CI)',          rowKey: 'ci_diagnosis' },
    { group: '기타',      label: '장기요양등급',         rowKey: 'ltc_grade' },
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
      return `<td>${amt ? formatWon(amt) : '<span class="empty-cell">-</span>'}</td>`
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
  const { customerName, contracts, selectedImages = [], proposal, advisorInfo } = input
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
    { keys: ['brain_stroke', 'brain_hemorrhage', 'brain_vascular'],    rec: 40_000_000, label: '뇌진단비',   color: '#3b82f6' },
    { keys: ['heart_acute_mi', 'heart_ischemic', 'heart_vascular'],   rec: 40_000_000, label: '심장진단비', color: '#ef4444' },
    { keys: ['surgery_disease', 'surgery_injury', 'surgery_1_5'],      rec:  5_000_000, label: '수술비',     color: '#8b5cf6' },
    { keys: ['silson_disease_inpatient', 'silson_injury_inpatient'],   rec: 50_000_000, label: '실손의료비', color: '#10b981' },
    { keys: ['death_general', 'death_disease', 'death_injury'],        rec: 100_000_000,label: '사망보장',   color: '#1a2744' },
  ]
  const gaugesHtml = RECOMMEND.map(cfg => {
    const amt = sumAmount(contracts, ...cfg.keys)
    const pct = Math.min(100, Math.round(amt / cfg.rec * 100))
    return gauge(pct, cfg.color, cfg.label, formatWon(amt))
  }).join('')

  // 2대주요치료비 파생
  const derived = deriveVascularMajor(contracts)
  const diagnosisItems = [
    { label: '암', current: sumAmount(contracts, 'cancer_general'), target: 50_000_000 },
    { label: '뇌', current: sumAmount(contracts, 'brain_stroke', 'brain_hemorrhage', 'brain_vascular'), target: 40_000_000 },
    { label: '심장', current: sumAmount(contracts, 'heart_acute_mi', 'heart_ischemic', 'heart_vascular'), target: 40_000_000 },
  ]
  const treatmentAmount =
    sumAmount(contracts, 'cancer_radiation', 'cancer_hadron', 'cancer_proton', 'cancer_chemo', 'cancer_targeted', 'cancer_cart') +
    derived.thrombolysis + derived.icu + derived.surgery
  const shortageItems = [
    { label: '주요 진단비', current: diagnosisItems.reduce((sum, item) => sum + item.current, 0), target: 130_000_000 },
    { label: '수술비', current: sumAmount(contracts, 'surgery_disease', 'surgery_injury', 'surgery_1_5', 'surgery_n_major'), target: 5_000_000 },
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
    '<div style="height:6px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin-bottom:4px">' +
    '<div style="height:6px;border-radius:999px;background:' + silsonColor + ';width:' + (silsonHasInfo ? '100' : '4') + '%"></div>' +
    '</div>' +
    '<div style="font-size:9px;color:#64748b;font-weight:700">' +
    '세대&nbsp;<b style="color:#1a2744">' + escHtml(silsonInfo.generation || '-') + '</b>' +
    '&nbsp;&nbsp;가입연월&nbsp;<b style="color:#1a2744">' + escHtml(silsonInfo.joinedAt || '-') + '</b>' +
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
      { label: '기타심장',      key: 'heart_vascular',   color: '#60a5fa' },
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
  ].join(''))

  // 뇌심장 치료비 (vascular_major 파생 포함)
  const brainCard = tcCard('🫀', '뇌·심장 치료비', [
    tcRow('혈전용해치료비',     derived.thrombolysis),
    tcRow('중환자실치료비',     derived.icu),
    tcRow('뇌심장 수술·시술비', derived.surgery),
    tcRow('뇌혈관질환 진단비',  sumAmount(contracts, 'brain_vascular')),
    tcRow('심장질환 진단비',    sumAmount(contracts, 'heart_vascular')),
  ].join(''))

  // 수술비 (구 생명보험: 상해+질병 통합 계약은 surgery_disease 또는 surgery_injury 둘 다 매핑될 수 있음)
  const surgeryDiseaseAmt = sumAmount(contracts, 'surgery_disease')
  const surgeryInjuryAmt  = sumAmount(contracts, 'surgery_injury')
  const surgeryNote = (surgeryDiseaseAmt === 0 && surgeryInjuryAmt > 0)
    ? '<div style="font-size:9px;color:#94a3b8;padding:3px 6px">※ 구 생명보험 통합수술비는 상해 기준 표기</div>'
    : ''
  const surgeryCard = tcCard('🏥', '수술비', [
    tcRow('수술비(질병)',  surgeryDiseaseAmt),
    tcRow('수술비(상해)',  surgeryInjuryAmt),
    tcRow('1~5종 수술비', sumAmount(contracts, 'surgery_1_5')),
    tcRow('N대 수술비',   sumAmount(contracts, 'surgery_n_major')),
  ].join('') + surgeryNote)

  // 간병 4분류
  const nursingCard = tcCard('🤝', '간병인', [
    tcRow('간병인 사용(질병)',   sumAmount(contracts, 'nursing_hospital')),
    tcRow('간병인 사용(상해)',   sumAmount(contracts, 'nursing_injury')),
    tcRow('간병인 지원(요양병원)', sumAmount(contracts, 'nursing_care_hospital')),
    tcRow('간병인 지원(통합)',   sumAmount(contracts, 'nursing_integrated')),
    tcRow('입원일당(질병)',      sumAmount(contracts, 'hospital_disease_daily')),
    tcRow('입원일당(상해)',      sumAmount(contracts, 'hospital_injury_daily')),
  ].join(''))

  // 실손
  const silsonCard = tcCard('💊', '실손의료비', [
    tcRow('실손입원(질병)',           sumAmount(contracts, 'silson_disease_inpatient')),
    tcRow('실손입원(상해)',           sumAmount(contracts, 'silson_injury_inpatient')),
    tcRow('실손통원(질병)',           sumAmount(contracts, 'silson_disease_outpatient')),
    tcRow('실손통원(상해)',           sumAmount(contracts, 'silson_injury_outpatient')),
    tcRow('비급여3대(도수/주사/MRI)', sumAmount(contracts, 'silson_3major')),
  ].join(''))

  // 운전자 (full only)
  const driverCard = tcCard('🚗', '운전자보험', [
    tcRow('교통사고처리지원금',     sumAmount(contracts, 'driver_accident')),
    tcRow('자동차사고 변호사비용',  sumAmount(contracts, 'driver_lawyer')),
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
    .pdf-page:last-child{break-after:avoid;page-break-after:avoid}
    .page-inner{max-width:1160px;margin:0 auto;padding:16px 20px}

    .print-bar{position:sticky;top:0;display:flex;justify-content:flex-end;
      gap:8px;padding:8px 12px;background:#fff;z-index:10;border-bottom:1px solid #e2e8f0}
    .print-bar button{background:#1a2744;color:#fff;border:none;border-radius:8px;
      padding:9px 16px;font-weight:700;cursor:pointer;font-size:13px}

    .report-header{display:flex;justify-content:space-between;align-items:flex-end;
      margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #1a2744}
    .report-kicker{color:#c9a96e;font-size:11px;font-weight:900;letter-spacing:.08em}
    .report-title{font-size:20px;font-weight:900;color:#1a2744;margin-top:4px}
    .report-meta{font-size:11px;color:#64748b;text-align:right}

    .page-label{font-size:11px;font-weight:900;color:#c9a96e;letter-spacing:.08em;
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
    .tc-head{font-weight:900;color:#1a2744;font-size:12px;margin-bottom:7px;
      border-bottom:1px solid #e2e8f0;padding-bottom:5px}
    .tc-row{display:flex;justify-content:space-between;align-items:center;
      padding:2px 0;font-size:11px;color:#374151}
    .tc-val{font-weight:700;color:#1a2744}
    .tc-empty{color:#94a3b8;font-weight:400}

    /* 추천 */
    .rec-card{display:flex;gap:12px;align-items:flex-start;border-radius:10px;
      padding:12px;border-left:4px solid;margin-bottom:10px}
    .rec-protect{background:#eff6ff;border-color:#1a2744}
    .rec-save{background:#fffbeb;border-color:#c9a96e}
    .rec-icon{font-size:20px;flex-shrink:0;margin-top:2px}
    .rec-type{font-size:10px;font-weight:900;letter-spacing:.06em;color:#64748b;margin-bottom:2px}
    .rec-title{font-size:12px;font-weight:900;color:#1a2744;margin-bottom:3px}
    .rec-desc{font-size:11px;color:#4b5563;line-height:1.5}

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

    .img-fullpage{background:#fff;display:flex;align-items:center;justify-content:center;
      min-height:180mm;break-after:page;page-break-after:always}
    .img-fullpage img{max-width:100%;max-height:180mm;object-fit:contain}

    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    @media print{
      body{background:#fff}
      .print-bar{display:none}
      .pdf-page{background:#fff}
      .cover-page{background:transparent!important}
      tr{page-break-inside:avoid}
      /* 비교표 인쇄 시 페이지 폭에 맞게 자동 축소 */
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

  <!-- 콘텐츠 -->
  <div style="position:relative;z-index:2;display:flex;flex-direction:column;height:100%;padding:50px 70px">

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
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;text-align:center">
      <div style="
        font-size:22px;font-weight:700;
        color:#1a3a6b;font-style:italic;
        letter-spacing:0.05em;margin-bottom:16px;
        text-shadow:0 1px 4px rgba(255,255,255,0.9);
      ">
        ${escHtml(customerName)} 고객님을 위한
      </div>
      <div style="
        font-size:52px;font-weight:900;
        color:#0d1f42;line-height:1.1;
        letter-spacing:-0.01em;
        text-shadow:0 2px 10px rgba(255,255,255,0.95),0 1px 2px rgba(0,0,0,0.06);
        margin-bottom:24px;
      ">
        고객보장분석 리포트
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px">
        <div style="height:1px;width:80px;background:linear-gradient(90deg,transparent,#2d6a9a)"></div>
        <div style="width:7px;height:7px;border-radius:50%;background:#2d6a9a;opacity:0.7"></div>
        <div style="height:1px;width:80px;background:linear-gradient(90deg,#2d6a9a,transparent)"></div>
      </div>
    </div>

    <!-- 하단 설계사 카드 (왼쪽) -->
    <div style="display:flex;justify-content:flex-start">
      <div style="
        background:rgba(255,255,255,0.6);
        border:1.5px solid rgba(26,39,68,0.18);
        border-left:4px solid #1a2744;
        border-radius:10px;padding:18px 28px;
        min-width:280px;
      ">
        <div style="font-size:10px;font-weight:700;color:#2d4a8a;letter-spacing:0.12em;margin-bottom:8px;opacity:0.8">
          담당 설계사
        </div>
        <div style="font-size:20px;font-weight:900;color:#0d1f42;margin-bottom:5px">
          보험전문가 ${escHtml(advisorInfo.name || '담당 설계사')}
        </div>
        <div style="font-size:12px;color:#2d4a8a;font-weight:600;margin-bottom:5px;opacity:0.8">
          메타리치 시그널그룹
        </div>
        <div style="font-size:14px;color:#1a2744;font-weight:700;letter-spacing:0.04em">
          &#128222; ${escHtml(advisorInfo.phone || '')}
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
      계약 수: ${contracts.length}건 &nbsp;|&nbsp; 월 보험료: ${formatMonthly(totalPremium)} &nbsp;|&nbsp; 분석일: ${new Date().toLocaleDateString('ko-KR')}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:60% 40%;gap:16px;align-items:start">
    <div>
      <div class="section-title"><span class="section-num">1</span>주요 보장 현황</div>
      <div style="background:#fafaf8;border:1px solid #e2e8f0;border-radius:12px;padding:12px">
        <div class="gauge-grid">${gaugesHtml}</div>
        <div style="display:flex;justify-content:center;margin-top:8px">${radarChartSvg(contracts)}</div>
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
      <div class="section-title" style="font-size:11px"><span class="section-num">3</span>암 치료비</div>
      ${cancerCard}
    </div>
    <div>
      <div class="section-title" style="font-size:11px"><span class="section-num">4</span>뇌·심장 치료비</div>
      ${brainCard}
    </div>
    <div>
      <div class="section-title" style="font-size:11px"><span class="section-num">5</span>수술비</div>
      ${surgeryCard}
    </div>
    <div>
      <div class="section-title" style="font-size:11px"><span class="section-num">7</span>실손의료비</div>
      ${silsonCard}
    </div>
  </div>

  <!-- ② 구분선 -->
  <div style="border-top:1px solid #e2e8f0;margin-bottom:10px"></div>

  <!-- ③ 2행: 간병인+입원일당 / 운전자 / 추천제안 -->
  <div style="display:grid;grid-template-columns:1fr 1fr ${!isKey ? '2fr' : '1fr'};gap:10px;align-items:start">
    <div>
      <div class="section-title" style="font-size:11px"><span class="section-num">6</span>간병인 · 입원일당</div>
      ${nursingCard}
    </div>
    ${!isKey ? `
    <div>
      <div class="section-title" style="font-size:11px"><span class="section-num">8</span>운전자보험</div>
      ${driverCard}
    </div>
    <div>
      <div class="section-title" style="font-size:11px;margin-bottom:6px"><span class="section-num">9</span>추천 제안</div>
      ${recsHtml}
    </div>` : ''}
  </div>
</div>
</div>

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
        { label:'뇌 진단비',    keys:['brain_stroke','brain_hemorrhage','brain_vascular'] },
        { label:'심장 진단비',  keys:['heart_acute_mi','heart_ischemic','heart_vascular'] },
        { label:'간병인 지원',  keys:['nursing_hospital','nursing_care_hospital','nursing_integrated'] },
        { label:'실손의료비',   keys:['silson_disease_inpatient','silson_injury_inpatient','silson_3major'] },
        { label:'운전자보험',   keys:['driver_accident'] },
        { label:'암 치료비합계',keys:['cancer_chemo','cancer_radiation','cancer_targeted','cancer_hadron'] },
        { label:'수술비 합계',  keys:['surgery_disease','surgery_injury','surgery_1_5','surgery_n_major'] },
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
        { label:'뇌 진단비',    keys:['brain_stroke','brain_hemorrhage','brain_vascular'] },
        { label:'심장 진단비',  keys:['heart_acute_mi','heart_ischemic','heart_vascular'] },
        { label:'간병인 지원',  keys:['nursing_hospital','nursing_care_hospital','nursing_integrated'] },
        { label:'실손의료비',   keys:['silson_disease_inpatient','silson_injury_inpatient','silson_3major'] },
        { label:'운전자보험',   keys:['driver_accident'] },
        { label:'암 치료비합계',keys:['cancer_chemo','cancer_radiation','cancer_targeted','cancer_hadron'] },
        { label:'수술비 합계',  keys:['surgery_disease','surgery_injury','surgery_1_5','surgery_n_major'] },
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
          { label:'항암약물', keys:['cancer_chemo','cancer_targeted'] },
          { label:'항암방사선', keys:['cancer_radiation'] },
          { label:'암수술비', keys:['cancer_surgery'] },
          { label:'암주요치료비', keys:['cancer_major_benefit','cancer_major_nonbenefit'] },
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
          { label:'항암약물', keys:['cancer_chemo','cancer_targeted'] },
          { label:'항암방사선', keys:['cancer_radiation'] },
          { label:'암수술비', keys:['cancer_surgery'] },
          { label:'암주요치료비', keys:['cancer_major_benefit','cancer_major_nonbenefit'] },
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
          { label:'뇌졸중진단', keys:['brain_stroke','brain_vascular','brain_hemorrhage'] },
          { label:'심장질환진단', keys:['heart_acute_mi','heart_ischemic','heart_vascular'] },
          { label:'뇌심장수술', keys:['two_major_surgery'] },
          { label:'중환자실치료', keys:['two_major_icu'] },
          { label:'뇌심주요치료비', keys:['vascular_major'] },
        ].map(r => {
          const v = sumAmount(beforeContracts, ...r.keys)
          return v > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #dbeafe">
            <span style="color:#374151">${escHtml(r.label)}</span>
            <span style="font-weight:800;color:#1e3a8a">${formatWon(v)}</span>
          </div>` : ''
        }).join('')}
        <div style="margin-top:8px;padding-top:6px;border-top:2px solid #93c5fd;display:flex;justify-content:space-between">
          <span style="font-size:12px;font-weight:900;color:#1e40af">합계</span>
          <span style="font-size:14px;font-weight:900;color:#1e40af">${formatWon(sumAmount(beforeContracts,'brain_stroke','brain_vascular','brain_hemorrhage','heart_acute_mi','heart_ischemic','heart_vascular','two_major_surgery','two_major_icu','vascular_major'))}</span>
        </div>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px">
        <div style="font-size:10px;font-weight:900;color:#059669;margin-bottom:8px">변경 후 보장</div>
        ${[
          { label:'뇌졸중진단', keys:['brain_stroke','brain_vascular','brain_hemorrhage'] },
          { label:'심장질환진단', keys:['heart_acute_mi','heart_ischemic','heart_vascular'] },
          { label:'뇌심장수술', keys:['two_major_surgery'] },
          { label:'중환자실치료', keys:['two_major_icu'] },
          { label:'뇌심주요치료비', keys:['vascular_major'] },
        ].map(r => {
          const v = sumAmount(afterContracts, ...r.keys)
          return v > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid #d1fae5">
            <span style="color:#374151">${escHtml(r.label)}</span>
            <span style="font-weight:800;color:#059669">${formatWon(v)}</span>
          </div>` : ''
        }).join('')}
        <div style="margin-top:8px;padding-top:6px;border-top:2px solid #6ee7b7;display:flex;justify-content:space-between">
          <span style="font-size:12px;font-weight:900;color:#059669">합계</span>
          <span style="font-size:14px;font-weight:900;color:#059669">${formatWon(sumAmount(afterContracts,'brain_stroke','brain_vascular','brain_hemorrhage','heart_acute_mi','heart_ischemic','heart_vascular','two_major_surgery','two_major_icu','vascular_major'))}</span>
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
          { label:'병원 간병인', keys:['nursing_hospital'] },
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
          { label:'병원 간병인', keys:['nursing_hospital'] },
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
<div class="pdf-page">
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
<div class="pdf-page">
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
  <img src="${escHtml(item.dataUrl)}" alt="참고자료 ${idx + 1}" loading="eager"/>
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
