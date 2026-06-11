// POST /api/coverage-pro/pdf-export
// 보장분석 리포트 HTML 생성 — 인쇄/PDF 프리뷰용
// 스타일: 상단 게이지 차트 + 중단 치료비 카드 + 저축/보장 비율 + 추천 + 비교표

import { NextRequest, NextResponse } from 'next/server'
import type { ProContract } from '../../../../lib/coverageAnalysis/types'

type PdfExportInput = {
  customerName: string
  contracts: ProContract[]
  type: 'full' | 'key'
}

export async function POST(req: NextRequest) {
  let input: PdfExportInput
  try { input = await req.json() }
  catch { return NextResponse.json({ error: '요청 데이터를 읽지 못했습니다.' }, { status: 400 }) }

  if (!input.customerName) return NextResponse.json({ error: 'customerName은 필수입니다.' }, { status: 400 })
  if (!Array.isArray(input.contracts)) return NextResponse.json({ error: 'contracts 배열이 필요합니다.' }, { status: 400 })

  const html = buildPrintHtml(input)
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

// ── 분석 헬퍼 ─────────────────────────────────────────────────────────────
function sumAmount(contracts: ProContract[], ...rowKeys: string[]): number {
  return contracts
    .flatMap((c) => c.coverages)
    .filter((cov) => rowKeys.includes(cov.rowKey))
    .reduce((sum, cov) => sum + Number(cov.amount || 0), 0)
}

function formatWon(v: number): string {
  if (!v) return '-'
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(0)}억`
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만원`
  return `${v.toLocaleString()}원`
}

function formatMonthly(v: number): string {
  if (!v) return '-'
  return `${Math.round(v).toLocaleString()}원`
}

function escHtml(s: string | number | undefined): string {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

// 보험 유형 분류 (보장성 / 저축성 / 실손)
function classifyType(contract: ProContract): '보장성' | '저축성' | '실손' {
  const name = (contract.productName + contract.company).toLowerCase()
  if (name.includes('실손') || name.includes('의료비보험') || name.includes('실비')) return '실손'
  if (name.includes('저축') || name.includes('연금') || name.includes('적립') || name.includes('변액')) return '저축성'
  return '보장성'
}

// 게이지 SVG (0~100%)
function gauge(pct: number, color: string, label: string, value: string): string {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const gap = circ - dash
  const statusColor = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'
  const statusLabel = pct >= 70 ? '충족' : pct >= 40 ? '보완필요' : '부족'
  return `
  <div class="gauge-wrap">
    <svg viewBox="0 0 84 84" width="84" height="84">
      <circle cx="42" cy="42" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="8"/>
      <circle cx="42" cy="42" r="${r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-dasharray="${dash} ${gap}" stroke-linecap="round"
        transform="rotate(-90 42 42)"/>
      <text x="42" y="38" text-anchor="middle" font-size="13" font-weight="900" fill="#1a2744">${Math.round(pct)}%</text>
      <text x="42" y="52" text-anchor="middle" font-size="9" fill="#64748b">${escHtml(label)}</text>
    </svg>
    <div class="gauge-value">${escHtml(value)}</div>
    <div class="gauge-status" style="color:${statusColor}">${statusLabel}</div>
  </div>`
}

// 추천 항목 — 간단한 rule-based
function buildRecommendations(contracts: ProContract[]) {
  const cancer  = sumAmount(contracts, 'cancer_general')
  const brain   = sumAmount(contracts, 'brain_stroke')
  const heart   = sumAmount(contracts, 'heart_acute_mi')
  const death   = sumAmount(contracts, 'death_general')
  const recs: Array<{ type: '보장성' | '저축성'; title: string; desc: string; icon: string }> = []

  // 보장성 추천 (최대 2개)
  if (cancer < 30_000_000)
    recs.push({ type: '보장성', title: '암진단비 보완', desc: `현재 ${formatWon(cancer)}로 3천만원 기준 미달. 진단비 보강 우선 권장.`, icon: '🩺' })
  if (brain + heart < 40_000_000)
    recs.push({ type: '보장성', title: '뇌·심장 진단비 보완', desc: `뇌심 합산 ${formatWon(brain + heart)} — 4천만원 이상 확보 권장.`, icon: '🫀' })
  if (death < 100_000_000)
    recs.push({ type: '보장성', title: '사망보장 강화', desc: `사망보험금 ${formatWon(death)} — 가족 생활비 기반 최소 1억 확보 검토.`, icon: '🛡️' })

  // 저축성 추천 (최대 2개)
  recs.push({ type: '저축성', title: '노후연금 설계', desc: '은퇴 후 월 200만원 수령 기준 연금보험 가입 시뮬레이션을 권장합니다.', icon: '💰' })
  recs.push({ type: '저축성', title: '변액유니버셜 활용', desc: '중장기 자산 성장과 보장의 병행이 필요한 경우 변액보험 검토를 추천합니다.', icon: '📈' })

  const 보장 = recs.filter((r) => r.type === '보장성').slice(0, 2)
  const 저축 = recs.filter((r) => r.type === '저축성').slice(0, 2)
  return [...보장, ...저축]
}

// ── 메인 HTML 생성 ────────────────────────────────────────────────────────
function buildPrintHtml(input: PdfExportInput): string {
  const { customerName, contracts } = input
  const isKey = input.type === 'key'

  const totalPremium   = contracts.reduce((sum, c) => sum + Number(c.monthlyPremium || 0), 0)
  const 보장성Premium  = contracts.filter((c) => classifyType(c) === '보장성').reduce((sum, c) => sum + Number(c.monthlyPremium || 0), 0)
  const 저축성Premium  = contracts.filter((c) => classifyType(c) === '저축성').reduce((sum, c) => sum + Number(c.monthlyPremium || 0), 0)
  const 실손Premium    = contracts.filter((c) => classifyType(c) === '실손').reduce((sum, c) => sum + Number(c.monthlyPremium || 0), 0)

  const 보장비율 = totalPremium ? Math.round(보장성Premium / totalPremium * 100) : 0
  const 저축비율 = totalPremium ? Math.round(저축성Premium / totalPremium * 100) : 0
  const 실손비율 = totalPremium ? Math.round(실손Premium / totalPremium * 100) : 0

  // 게이지 데이터 (권장 기준 대비 %)
  const RECOMMEND = {
    cancer:  { keys: ['cancer_general'], rec: 50_000_000, label: '암진단비', color: '#c9a96e' },
    brain:   { keys: ['brain_stroke', 'brain_hemorrhage'], rec: 40_000_000, label: '뇌진단비', color: '#3b82f6' },
    heart:   { keys: ['heart_acute_mi', 'heart_ischemic'], rec: 40_000_000, label: '심장진단비', color: '#ef4444' },
    surgery: { keys: ['surgery_disease', 'surgery_injury', 'surgery_1_5'], rec: 5_000_000, label: '수술비', color: '#8b5cf6' },
    silson:  { keys: ['silson_disease_inpatient', 'silson_injury_inpatient'], rec: 50_000_000, label: '실손의료비', color: '#10b981' },
    driver:  { keys: ['driver_accident', 'driver_fine', 'driver_lawyer'], rec: 300_000_000, label: '운전자보험', color: '#f59e0b' },
  }

  const gaugesHtml = Object.entries(RECOMMEND).map(([, cfg]) => {
    const amt = sumAmount(contracts, ...cfg.keys)
    const pct = Math.min(100, Math.round(amt / cfg.rec * 100))
    return gauge(pct, cfg.color, cfg.label, formatWon(amt))
  }).join('')

  // 치료비 카드 데이터
  const TREATMENT_CARDS = [
    {
      title: '암치료비',
      icon: '🎗️',
      items: [
        { label: '항암방사선',   rowKeys: ['cancer_radiation'] },
        { label: '중입자방사선', rowKeys: ['cancer_hadron'] },
        { label: '양성자방사선', rowKeys: ['cancer_proton'] },
        { label: '항암약물',     rowKeys: ['cancer_chemo'] },
        { label: '표적항암약물', rowKeys: ['cancer_targeted'] },
        { label: '카티항암약물', rowKeys: ['cancer_cart'] },
      ],
    },
    {
      title: '뇌·심장 치료비',
      icon: '🫀',
      items: [
        { label: '혈전용해치료',  rowKeys: ['two_major_thrombolysis'] },
        { label: '중환자실치료',  rowKeys: ['two_major_icu'] },
        { label: '수술/시술비',   rowKeys: ['two_major_surgery'] },
        { label: '뇌혈관진단',   rowKeys: ['brain_vascular'] },
        { label: '심장질환진단', rowKeys: ['heart_vascular'] },
      ],
    },
    {
      title: '간병 · 재가',
      icon: '🏥',
      items: [
        { label: '병원간병인',     rowKeys: ['nursing_hospital'] },
        { label: '요양병원간병인', rowKeys: ['nursing_care_hospital'] },
        { label: '간호간병통합',   rowKeys: ['nursing_integrated'] },
        { label: '입원일당(질병)', rowKeys: ['hospital_disease_daily'] },
        { label: '입원일당(상해)', rowKeys: ['hospital_injury_daily'] },
      ],
    },
  ]

  const treatmentHtml = TREATMENT_CARDS.map((card) => {
    const rows = card.items.map(({ label, rowKeys }) => {
      const amt = sumAmount(contracts, ...rowKeys)
      return `<div class="tc-row">
        <span>${escHtml(label)}</span>
        <span class="tc-val">${amt ? formatWon(amt) : '<span class="tc-empty">-</span>'}</span>
      </div>`
    }).join('')
    const total = card.items.reduce((s, { rowKeys }) => s + sumAmount(contracts, ...rowKeys), 0)
    return `<div class="tc-card">
      <div class="tc-head">${card.icon} ${escHtml(card.title)}</div>
      ${rows}
      <div class="tc-total">합계 <b>${formatWon(total)}</b></div>
    </div>`
  }).join('')

  // 회사별 비교표 (담보 × 보험사)
  const KEY_ROWS: Array<{ label: string; rowKey: string }> = [
    { label: '암진단', rowKey: 'cancer_general' },
    { label: '뇌졸증진단', rowKey: 'brain_stroke' },
    { label: '급성심근경색', rowKey: 'heart_acute_mi' },
    { label: '수술비(질병)', rowKey: 'surgery_disease' },
    { label: '실손입원(질병)', rowKey: 'silson_disease_inpatient' },
    { label: '사망(일반)', rowKey: 'death_general' },
    { label: '교통사고처리지원', rowKey: 'driver_accident' },
    { label: '일상배상책임', rowKey: 'other_liability' },
  ]
  const displayContracts = isKey
    ? contracts.filter((c) =>
        c.coverages.some((cov) => KEY_ROWS.some((r) => r.rowKey === cov.rowKey) && cov.amount > 0)
      )
    : contracts

  const colHeaders = displayContracts.map((c) =>
    `<th title="${escHtml(c.productName)}">${escHtml(c.company)}<br/><small>${escHtml(c.productName.slice(0, 8))}…</small></th>`
  ).join('')

  const tableRows = KEY_ROWS.map(({ label, rowKey }) => {
    const cells = displayContracts.map((c) => {
      const cov = c.coverages.find((cv) => cv.rowKey === rowKey)
      const amt = cov ? Number(cov.amount) : 0
      return `<td>${amt ? formatWon(amt) : '<span class="empty-cell">-</span>'}</td>`
    }).join('')
    const total = displayContracts.reduce((sum, c) => {
      const cov = c.coverages.find((cv) => cv.rowKey === rowKey)
      return sum + (cov ? Number(cov.amount) : 0)
    }, 0)
    return `<tr>
      <td class="row-label">${escHtml(label)}</td>
      ${cells}
      <td class="row-total">${total ? formatWon(total) : '-'}</td>
    </tr>`
  }).join('')

  const premiumRow = displayContracts.map((c) =>
    `<td style="color:#1a2744;font-weight:700;">${formatMonthly(c.monthlyPremium)}</td>`
  ).join('')

  // 추천 제안
  const recs = buildRecommendations(contracts)
  const recsHtml = recs.map((r) => `
    <div class="rec-card rec-${r.type === '보장성' ? 'protect' : 'save'}">
      <div class="rec-icon">${r.icon}</div>
      <div>
        <div class="rec-type">${r.type}</div>
        <div class="rec-title">${escHtml(r.title)}</div>
        <div class="rec-desc">${escHtml(r.desc)}</div>
      </div>
    </div>
  `).join('')

  // 파이차트 SVG (보장/저축/실손)
  function pieSlice(pct: number, offset: number, color: string): string {
    if (pct <= 0) return ''
    const r = 42, cx = 50, cy = 50
    const a1 = (offset / 100) * 2 * Math.PI - Math.PI / 2
    const a2 = ((offset + pct) / 100) * 2 * Math.PI - Math.PI / 2
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
    const large = pct > 50 ? 1 : 0
    return `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${color}"/>`
  }
  const pieHtml = `<svg viewBox="0 0 100 100" width="120" height="120" style="border-radius:50%">
    ${pieSlice(보장비율, 0, '#1a2744')}
    ${pieSlice(저축비율, 보장비율, '#c9a96e')}
    ${pieSlice(실손비율, 보장비율 + 저축비율, '#10b981')}
    ${pieSlice(Math.max(0, 100 - 보장비율 - 저축비율 - 실손비율), 보장비율 + 저축비율 + 실손비율, '#e2e8f0')}
  </svg>`

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escHtml(customerName)} 보장분석 리포트</title>
  <style>
    @page { size: A4; margin: 14mm; }
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      font-family:"Pretendard Variable","Pretendard",-apple-system,sans-serif;
      color:#111;background:#f5f7fb;word-break:keep-all;font-size:13px;
    }
    .page{max-width:980px;margin:0 auto;padding:24px;background:#fff}

    /* ─ 헤더 */
    .report-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #1a2744}
    .report-kicker{color:#c9a96e;font-size:11px;font-weight:900;letter-spacing:.08em}
    .report-title{font-size:22px;font-weight:900;color:#1a2744;margin-top:4px}
    .report-meta{font-size:11px;color:#64748b;text-align:right}

    /* ─ 섹션 타이틀 */
    .section{margin-top:22px}
    .section-num{display:inline-flex;align-items:center;justify-content:center;
      width:22px;height:22px;border-radius:50%;background:#1a2744;color:#fff;
      font-size:11px;font-weight:900;margin-right:8px;flex-shrink:0}
    .section-title{font-size:15px;font-weight:900;color:#1a2744;margin-bottom:12px;display:flex;align-items:center}

    /* ─ 게이지 그리드 */
    .gauge-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;
      background:#fafaf8;border:1px solid #e2e8f0;border-radius:12px;padding:16px}
    .gauge-wrap{text-align:center}
    .gauge-value{font-size:12px;font-weight:700;color:#1a2744;margin-top:2px}
    .gauge-status{font-size:11px;font-weight:700;margin-top:1px}

    /* ─ 치료비 카드 */
    .tc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .tc-card{background:#fafaf8;border:1px solid #e2e8f0;border-radius:10px;padding:14px}
    .tc-head{font-weight:900;color:#1a2744;font-size:13px;margin-bottom:10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
    .tc-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px;color:#374151}
    .tc-val{font-weight:700;color:#1a2744}
    .tc-empty{color:#94a3b8;font-weight:400}
    .tc-total{margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:12px;color:#64748b}
    .tc-total b{color:#c9a96e;font-size:13px}

    /* ─ 보험료 비율 */
    .ratio-wrap{display:flex;align-items:center;gap:24px;background:#fafaf8;border:1px solid #e2e8f0;border-radius:12px;padding:16px}
    .ratio-legend{display:grid;gap:8px;flex:1}
    .ratio-row{display:flex;align-items:center;gap:10px;font-size:13px}
    .ratio-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
    .ratio-label{flex:1;color:#4b5563}
    .ratio-val{font-weight:700;color:#1a2744}
    .ratio-pct{font-size:12px;color:#94a3b8;margin-left:4px}
    .ratio-total{font-size:14px;font-weight:900;color:#1a2744;padding-top:8px;border-top:1px solid #e2e8f0}

    /* ─ 추천 제안 */
    .rec-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
    .rec-card{display:flex;gap:14px;align-items:flex-start;border-radius:10px;padding:14px;border-left:4px solid}
    .rec-protect{background:#eff6ff;border-color:#1a2744}
    .rec-save{background:#fffbeb;border-color:#c9a96e}
    .rec-icon{font-size:22px;flex-shrink:0;margin-top:2px}
    .rec-type{font-size:10px;font-weight:900;letter-spacing:.06em;color:#64748b;margin-bottom:3px}
    .rec-title{font-size:13px;font-weight:900;color:#1a2744;margin-bottom:4px}
    .rec-desc{font-size:12px;color:#4b5563;line-height:1.5}

    /* ─ 비교표 */
    .compare-table{width:100%;border-collapse:collapse;font-size:12px}
    .compare-table th,.compare-table td{border:1px solid #e2e8f0;padding:7px 8px;vertical-align:middle}
    .compare-table th{background:#1a2744;color:#fff;text-align:center;font-size:11px;font-weight:700}
    .row-label{background:#fafaf8;font-weight:700;color:#1a2744;white-space:nowrap}
    .row-total{background:#eff6ff;font-weight:700;color:#1a2744;text-align:right}
    .empty-cell{color:#94a3b8}
    .compare-table td{text-align:right}

    /* ─ 인쇄 */
    .print-bar{position:sticky;top:0;display:flex;justify-content:flex-end;gap:8px;padding:8px 0;background:#fff;z-index:10}
    .print-bar button{background:#1a2744;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-weight:700;cursor:pointer;font-size:13px}
    @media print{
      body{background:#fff}.page{max-width:none;padding:0}
      .print-bar{display:none}table{page-break-inside:auto}tr{page-break-inside:avoid}
      .section{page-break-inside:avoid}
    }
  </style>
</head>
<body>
<div class="page">
  <div class="print-bar">
    <button onclick="window.print()">🖨️ 인쇄 / PDF 저장</button>
  </div>

  <!-- 헤더 -->
  <div class="report-header">
    <div>
      <div class="report-kicker">METARICH SIGNAL GROUP · 보장분석 리포트</div>
      <div class="report-title">${escHtml(customerName)} 고객 보장분석 ${isKey ? '(주요보장)' : '(전체)'}</div>
    </div>
    <div class="report-meta">
      계약 수: ${contracts.length}건<br/>
      월 보험료: ${formatMonthly(totalPremium)}<br/>
      분석일: ${new Date().toLocaleDateString('ko-KR')}
    </div>
  </div>

  <!-- 1. 주요 보장 현황 게이지 -->
  <div class="section">
    <div class="section-title"><span class="section-num">1</span>주요 보장 현황</div>
    <div class="gauge-grid">${gaugesHtml}</div>
  </div>

  <!-- 2. 치료비 카드 -->
  <div class="section">
    <div class="section-title"><span class="section-num">2</span>치료비 · 간병 상세</div>
    <div class="tc-grid">${treatmentHtml}</div>
  </div>

  <!-- 3. 보험료 비율 -->
  <div class="section">
    <div class="section-title"><span class="section-num">3</span>보험료 구성 비율</div>
    <div class="ratio-wrap">
      ${pieHtml}
      <div class="ratio-legend">
        <div class="ratio-row">
          <div class="ratio-dot" style="background:#1a2744"></div>
          <span class="ratio-label">보장성</span>
          <span class="ratio-val">${formatMonthly(보장성Premium)}</span>
          <span class="ratio-pct">(${보장비율}%)</span>
        </div>
        <div class="ratio-row">
          <div class="ratio-dot" style="background:#c9a96e"></div>
          <span class="ratio-label">저축성</span>
          <span class="ratio-val">${formatMonthly(저축성Premium)}</span>
          <span class="ratio-pct">(${저축비율}%)</span>
        </div>
        <div class="ratio-row">
          <div class="ratio-dot" style="background:#10b981"></div>
          <span class="ratio-label">실손의료비</span>
          <span class="ratio-val">${formatMonthly(실손Premium)}</span>
          <span class="ratio-pct">(${실손비율}%)</span>
        </div>
        <div class="ratio-total">월 합계 ${formatMonthly(totalPremium)}</div>
      </div>
    </div>
  </div>

  <!-- 4. 추천 제안 -->
  <div class="section">
    <div class="section-title"><span class="section-num">4</span>추천 제안</div>
    <div class="rec-grid">${recsHtml}</div>
  </div>

  <!-- 5. 회사별 담보 비교 -->
  <div class="section">
    <div class="section-title"><span class="section-num">5</span>회사별 · 담보별 비교</div>
    ${displayContracts.length > 0 ? `
    <div style="overflow-x:auto">
      <table class="compare-table">
        <thead>
          <tr>
            <th style="width:120px">담보</th>
            ${colHeaders}
            <th style="background:#2d4a8a">합산</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="row-label">월 보험료</td>
            ${premiumRow}
            <td class="row-total">${formatMonthly(totalPremium)}</td>
          </tr>
          ${tableRows}
        </tbody>
      </table>
    </div>` : '<div style="color:#94a3b8;padding:20px;text-align:center">계약 데이터가 없습니다.</div>'}
  </div>

  <div style="margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px">
    본 분석 리포트는 고객 상담용 참고 자료이며, 보험 계약의 법적 효력을 대체하지 않습니다.<br/>
    메타리치 시그널그룹 | ${new Date().toLocaleDateString('ko-KR')} 작성
  </div>
</div>
<script>
  window.addEventListener('load', function() {
    window.setTimeout(function(){ window.print(); }, 500);
  });
</script>
</body>
</html>`
}
