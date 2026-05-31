"use client"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// exportExcel.ts  [v2 — 넓은 레이아웃 + 인포그래픽 강화]
// 엑셀 출력 전담 파일 — 이 파일만 수정하면 엑셀 내용/스타일 변경 가능
//
// 사용법: AdminView.tsx 에서 import { exportExcel } from "./exportExcel"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import * as XLSX from 'xlsx-js-style'

// ────────────────────────────────────────────────────────────────
// 테두리 프리셋
// ────────────────────────────────────────────────────────────────
const B_THIN = {
  top:    { style: "thin",   color: { rgb: "FFAAAAAA" } },
  bottom: { style: "thin",   color: { rgb: "FFAAAAAA" } },
  left:   { style: "thin",   color: { rgb: "FFAAAAAA" } },
  right:  { style: "thin",   color: { rgb: "FFAAAAAA" } },
}
const B_MED = {
  top:    { style: "medium", color: { rgb: "FF000000" } },
  bottom: { style: "medium", color: { rgb: "FF000000" } },
  left:   { style: "medium", color: { rgb: "FF000000" } },
  right:  { style: "medium", color: { rgb: "FF000000" } },
}
const B_THICK = {
  top:    { style: "thick",  color: { rgb: "FF1F3864" } },
  bottom: { style: "thick",  color: { rgb: "FF1F3864" } },
  left:   { style: "thick",  color: { rgb: "FF1F3864" } },
  right:  { style: "thick",  color: { rgb: "FF1F3864" } },
}

// ────────────────────────────────────────────────────────────────
// 스타일 팩토리
// ────────────────────────────────────────────────────────────────
function xs(
  bg: string | null,
  fg: string,
  bold: boolean,
  sz: number,
  hAlign = "center",
  border: any = B_THIN
): any {
  return {
    font:      { name: "맑은 고딕", sz, bold, color: { rgb: fg } },
    fill:      bg ? { fgColor: { rgb: bg }, patternType: "solid" } : { patternType: "none" },
    alignment: { horizontal: hAlign, vertical: "center", wrapText: true },
    border,
  }
}

// ────────────────────────────────────────────────────────────────
// 스타일 상수 모음 (v2: 폰트 크기 +1~2, 색상 체계 유지)
// ────────────────────────────────────────────────────────────────
const X = {
  // ── 타이틀 / 섹션
  title:         xs("FF1F3864", "FFFFFFFF", true,  18, "center", B_MED),
  subtitle:      xs("FF1F3864", "FFAABBCC", false, 10, "right"),
  secHead:       xs("FF2E5FA3", "FFFFFFFF", true,  12, "left"),
  colHead:       xs("FF4472C4", "FFFFFFFF", true,  11),
  colHeadSm:     xs("FF2E5FA3", "FFFFFFFF", true,  10),

  // ── KPI 라벨
  kpiLblBlue:    xs("FF4472C4", "FFFFFFFF", true,  11),
  kpiLblGreen:   xs("FF70AD47", "FFFFFFFF", true,  11),
  kpiLblOrange:  xs("FFED7D31", "FFFFFFFF", true,  11),

  // ── KPI 값
  kpiValBlue:    xs("FFF0F4FF", "FF2E5FA3", true,  18),
  kpiValGreen:   xs("FFF0F4FF", "FF70AD47", true,  18),
  kpiValOrange:  xs("FFF0F4FF", "FFED7D31", true,  18),

  // ── 진행 바 (인포그래픽)
  progressBg:    xs("FFE9EFF8", "FF2E5FA3", false, 10),
  progressGreen: xs("FFEBF5E0", "FF70AD47", false, 10),
  progressRed:   xs("FFFFF0F0", "FFFF4444", false, 10),

  // ── 데이터 행
  dataEven:      xs("FFE8F0FB", "FF1F2937", false, 11),
  dataOdd:       xs("FFFFFFFF", "FF1F2937", false, 11),
  nameEven:      xs("FFE8F0FB", "FF1F3864", true,  11),
  nameOdd:       xs("FFFFFFFF", "FF1F3864", true,  11),
  rGreenEven:    xs("FFE8F0FB", "FF388E3C", true,  11),
  rGreenOdd:     xs("FFFFFFFF", "FF388E3C", true,  11),
  rRedEven:      xs("FFE8F0FB", "FFCC0000", true,  11),
  rRedOdd:       xs("FFFFFFFF", "FFCC0000", true,  11),
  retRedEven:    xs("FFE8F0FB", "FFCC0000", false, 11),
  retRedOdd:     xs("FFFFFFFF", "FFCC0000", false, 11),
  actSumEven:    xs("FFE8F0FB", "FF2E5FA3", true,  11),
  actSumOdd:     xs("FFFFFFFF", "FF2E5FA3", true,  11),

  // ── 합계 행
  totalHead:     xs("FF1F3864", "FFFFFFFF", true,  11),
  totalRow:      xs("FFFFF9CC", "FF1F2937", true,  11),
  totalGreen:    xs("FFFFF9CC", "FF388E3C", true,  11),
  totalRed:      xs("FFFFF9CC", "FFCC0000", true,  11),

  // ── 개인 탭
  memberBanner:  xs("FFED7D31", "FFFFFFFF", true,  13, "left"),
  metaGoalLbl:   xs("FF4472C4", "FFFFFFFF", true,  11),
  metaActLbl:    xs("FFED7D31", "FFFFFFFF", true,  11),
  metaRGreenLbl: xs("FF70AD47", "FFFFFFFF", true,  11),
  metaRRedLbl:   xs("FFCC0000", "FFFFFFFF", true,  11),
  metaVal:       xs("FFF8F9FB", "FF1F2937", false, 12),
  metaRGreen:    xs("FFF8F9FB", "FF388E3C", true,  12),
  metaRRed:      xs("FFF8F9FB", "FFCC0000", true,  12),
  convBlue:      xs("FFE8F3FF", "FF2E5FA3", false, 10),
  convOrange:    xs("FFFFF3E8", "FFED7D31", false, 10),

  // ── 인포그래픽 탭 전용
  infoTitle:     xs("FF1F3864", "FFFFFFFF", true,  16, "center", B_MED),
  infoSubTitle:  xs("FF2E5FA3", "FFFFFFFF", true,  12, "left"),
  infoCardBg:    xs("FFF0F5FF", "FF1F3864", false, 11, "left"),
  infoKpiCard:   xs("FF1F3864", "FFFFFFFF", true,  14, "center"),
  infoKpiVal:    xs("FFFFFFFF", "FF2E5FA3", true,  22, "center", B_THICK),
  infoKpiValG:   xs("FFFFFFFF", "FF70AD47", true,  22, "center", B_THICK),
  infoKpiValO:   xs("FFFFFFFF", "FFED7D31", true,  22, "center", B_THICK),
  infoBarBg:     xs("FFE0E0E0", "FF888888", false,  9),
  infoBarFill:   xs("FF70AD47", "FFFFFFFF", false,  9),
  infoBarFillR:  xs("FFCC0000", "FFFFFFFF", false,  9),
  infoBarFillO:  xs("FFED7D31", "FFFFFFFF", false,  9),
  infoBarLabel:  xs("FFF5F5F5", "FF333333", false,  9, "left"),
  infoStat:      xs("FFF8FFFE", "FF2E5FA3", true,  11, "center"),
  infoStatOr:    xs("FFFFF8F0", "FFED7D31", true,  11, "center"),
  infoStatRed:   xs("FFFFF0F0", "FFCC0000", true,  11, "center"),
  infoSep:       xs("FF2E5FA3", "FFFFFFFF", true,  10, "center"),
  infoEmpty:     xs("FFFAFAFA", "FFFAFAFA", false,  9),
  rankGold:      xs("FFFFF4CC", "FFB8860B", true,  12),
  rankSilver:    xs("FFF5F5F5", "FF666666", true,  12),
  rankBronze:    xs("FFFFF0E8", "FFCD7F32", true,  12),
}

// ────────────────────────────────────────────────────────────────
// 인포그래픽 헬퍼: 유니코드 진행 막대 생성
// totalBlocks = 전체 블록 수, rate = 0~1
// ────────────────────────────────────────────────────────────────
function makeProgressBar(rate: number, totalBlocks = 20): string {
  const clamped = Math.min(Math.max(rate, 0), 1)
  const filled  = Math.round(clamped * totalBlocks)
  const empty   = totalBlocks - filled
  return "█".repeat(filled) + "░".repeat(empty)
}

// 달성률 → 상태 이모지 뱃지
function rateBadge(rate: number): string {
  if (rate >= 1.0) return "✅ 달성"
  if (rate >= 0.7) return "🔶 진행중"
  return "❌ 미달"
}

// 달성률 → 화살표
function rateArrow(rate: number): string {
  if (rate >= 1.0) return "▲"
  if (rate >= 0.5) return "▶"
  return "▼"
}

// ────────────────────────────────────────────────────────────────
// 워크시트 유틸리티
// ────────────────────────────────────────────────────────────────
function xc(ws: any, r: number, c: number, v: any, s: any, fmt?: string) {
  const addr = XLSX.utils.encode_cell({ r, c })
  ws[addr] = { v, t: typeof v === "number" ? "n" : "s", s }
  if (fmt) ws[addr].z = fmt
}

function xm(ws: any, rs: number, cs: number, re: number, ce: number) {
  if (!ws["!merges"]) ws["!merges"] = []
  ws["!merges"].push({ s: { r: rs, c: cs }, e: { r: re, c: ce } })
}

function xr(ws: any, r: number, c1: number, c2: number, s: any) {
  for (let c = c1; c <= c2; c++) xc(ws, r, c, "", s)
}

// ────────────────────────────────────────────────────────────────
// 메인 export 함수
// ────────────────────────────────────────────────────────────────
export function exportExcel({
  agents,
  teamMeta,
  monthKey,
}: {
  agents: any[]
  teamMeta: { targetAmt: number; targetCnt: number }
  monthKey: string
}) {
  const wb = XLSX.utils.book_new()
  const yearMonth = monthKey.slice(0, 7).replace("-", "년 ") + "월"

  // ── 팀 집계값 사전 계산 ─────────────────────────────────────
  const totalActAmt = agents.reduce((s, a) => s + Number(a.performance.contract_amt || 0), 0)
  const totalActCnt = agents.reduce((s, a) => s + Number(a.performance.contract_cnt || 0), 0)
  const amtRate = teamMeta.targetAmt > 0 ? totalActAmt / teamMeta.targetAmt : 0
  const cntRate = teamMeta.targetCnt > 0 ? totalActCnt / teamMeta.targetCnt : 0
  let tCall=0, tMeet=0, tPt=0, tIntro=0, tDb=0, tRet=0
  agents.forEach(a => {
    tCall  += Number(a.performance.call        || 0)
    tMeet  += Number(a.performance.meet        || 0)
    tPt    += Number(a.performance.pt          || 0)
    tIntro += Number(a.performance.intro       || 0)
    tDb    += Number(a.performance.db_assigned || 0)
    tRet   += Number(a.performance.db_returned || 0)
  })

  // ══════════════════════════════════════════════════════════════
  // TAB 1 : 📊 팀 전체 현황  [v2 — 넓은 열 + 큰 행 + 진행바]
  // ══════════════════════════════════════════════════════════════
  const ws1: any = { "!merges": [], "!rows": [] }
  // ▼ v2: 열 너비 전체 확대 (기존 대비 +4~8 wch)
  ws1["!cols"] = [
    {wch:3},   // A: 여백
    {wch:20},  // B: 이름/라벨
    {wch:18},  // C
    {wch:18},  // D
    {wch:16},  // E
    {wch:16},  // F
    {wch:16},  // G
    {wch:16},  // H
    {wch:18},  // I
    {wch:18},  // J
    {wch:3},   // K: 여백
  ]

  let R = 0
  const h = (px: number): void => { ws1["!rows"][R] = { hpx: px } }

  // 상단 여백
  h(14); R++

  // ── 타이틀 (v2: 높이 54)
  h(54); xr(ws1,R,1,9,X.title)
  xc(ws1,R,1,`🏆  메타리치 시그널 실적 현황 리포트 — ${yearMonth}`,X.title)
  xm(ws1,R,1,R,9); R++

  // 부제
  h(20); xr(ws1,R,1,9,X.subtitle)
  xc(ws1,R,1,"※ 본 리포트는 팀 전체 목표 대비 실적 현황을 요약합니다.",X.subtitle)
  xm(ws1,R,1,R,9); R++

  h(14); R++ // 간격

  // ── 섹션1: 팀 핵심 KPI ─────────────────────────────────────
  h(30); xr(ws1,R,1,9,X.secHead)
  xc(ws1,R,1,"▌ 팀 핵심 KPI",X.secHead); xm(ws1,R,1,R,9); R++

  // KPI 라벨 행 (v2: 높이 28)
  h(28);
  const kpiSpans  = [[1,2],[3,4],[5,6],[7,8],[9,9]]
  const kpiLabels = ["목표 금액","실적 금액","목표 건수","실적 건수","금액 달성률"]
  const kpiLSt    = [
    X.kpiLblBlue,
    amtRate>=1 ? X.kpiLblGreen : X.kpiLblOrange,
    X.kpiLblBlue,
    cntRate>=1 ? X.kpiLblGreen : X.kpiLblOrange,
    amtRate>=1 ? X.kpiLblGreen : X.kpiLblOrange,
  ]
  kpiSpans.forEach(([c1,c2],i) => {
    xr(ws1,R,c1,c2,kpiLSt[i]); xc(ws1,R,c1,kpiLabels[i],kpiLSt[i])
    if(c1!==c2) xm(ws1,R,c1,R,c2)
  }); R++

  // KPI 값 행 (v2: 높이 50)
  h(50);
  const kpiVals = [
    `${teamMeta.targetAmt.toLocaleString()}만원`,
    `${totalActAmt.toLocaleString()}만원`,
    `${teamMeta.targetCnt}건`,
    `${totalActCnt}건`,
    `${(amtRate*100).toFixed(1)}%`,
  ]
  const kpiVSt = [
    X.kpiValBlue,
    amtRate>=1 ? X.kpiValGreen : X.kpiValOrange,
    X.kpiValBlue,
    cntRate>=1 ? X.kpiValGreen : X.kpiValOrange,
    amtRate>=1 ? X.kpiValGreen : X.kpiValOrange,
  ]
  kpiSpans.forEach(([c1,c2],i) => {
    xr(ws1,R,c1,c2,kpiVSt[i]); xc(ws1,R,c1,kpiVals[i],kpiVSt[i])
    if(c1!==c2) xm(ws1,R,c1,R,c2)
  }); R++

  // ▼ v2 신규: KPI 진행 바 행 (금액 달성률, 건수 달성률 시각화)
  h(26);
  const amtBarSt = amtRate>=1 ? X.progressGreen : (amtRate>=0.5 ? X.progressBg : X.progressRed)
  const cntBarSt = cntRate>=1 ? X.progressGreen : (cntRate>=0.5 ? X.progressBg : X.progressRed)
  const amtBar = `금액 달성  ${makeProgressBar(amtRate, 15)}  ${(amtRate*100).toFixed(1)}%  ${rateBadge(amtRate)}`
  const cntBar = `건수 달성  ${makeProgressBar(cntRate, 15)}  ${(cntRate*100).toFixed(1)}%  ${rateBadge(cntRate)}`
  xr(ws1,R,1,9,X.progressBg)
  xc(ws1,R,1,amtBar, amtBarSt); xm(ws1,R,1,R,4)
  xc(ws1,R,5,"",     X.progressBg)
  xc(ws1,R,6,cntBar, cntBarSt); xm(ws1,R,6,R,9)
  R++

  h(14); R++ // 간격

  // ── 섹션2: 팀원별 목표 vs 실적 테이블 ─────────────────────
  h(30); xr(ws1,R,1,9,X.secHead)
  xc(ws1,R,1,"▌ 팀원별 목표 vs 실적 현황",X.secHead); xm(ws1,R,1,R,9); R++

  // 컬럼 헤더 (v2: 높이 30)
  h(30);
  ["이름","목표금액(만)","실적금액(만)","금액달성률","목표건수","실적건수","건수달성률","초과/미달(만)","초과/미달(건)"]
    .forEach((v,i) => xc(ws1,R,1+i,v,X.colHead))
  R++

  agents.forEach((a,ri) => {
    const p     = a.performance
    const tAmt  = Number(p.target_amt   || 1)
    const cAmt  = Number(p.contract_amt || 0)
    const tCnt  = Number(p.target_cnt   || 1)
    const cCnt  = Number(p.contract_cnt || 0)
    const aRate = tAmt>0 ? cAmt/tAmt : 0
    const cRate = tCnt>0 ? cCnt/tCnt : 0
    const diffA = cAmt - tAmt
    const diffC = cCnt - tCnt
    const ev    = ri%2===0

    // ▼ v2: 데이터 행 높이 30
    h(30);
    xc(ws1,R,1,a.name,                        ev?X.nameEven:X.nameOdd)
    xc(ws1,R,2,tAmt,                           ev?X.dataEven:X.dataOdd,"#,##0")
    xc(ws1,R,3,cAmt,                           ev?X.dataEven:X.dataOdd,"#,##0")
    xc(ws1,R,4,`${rateArrow(aRate)} ${(aRate*100).toFixed(1)}%`,
                                               aRate>=1?(ev?X.rGreenEven:X.rGreenOdd):(ev?X.rRedEven:X.rRedOdd))
    xc(ws1,R,5,tCnt,                           ev?X.dataEven:X.dataOdd)
    xc(ws1,R,6,cCnt,                           ev?X.dataEven:X.dataOdd)
    xc(ws1,R,7,`${rateArrow(cRate)} ${(cRate*100).toFixed(1)}%`,
                                               cRate>=1?(ev?X.rGreenEven:X.rGreenOdd):(ev?X.rRedEven:X.rRedOdd))
    xc(ws1,R,8,diffA,diffA>=0?(ev?X.rGreenEven:X.rGreenOdd):(ev?X.rRedEven:X.rRedOdd),"#,##0;-#,##0")
    xc(ws1,R,9,diffC,diffC>=0?(ev?X.rGreenEven:X.rGreenOdd):(ev?X.rRedEven:X.rRedOdd))
    R++

    // ▼ v2 신규: 각 팀원별 미니 진행 바
    h(20);
    const ev2 = ri%2===0
    const aBarSt = aRate>=1 ? X.progressGreen : (aRate>=0.5 ? X.progressBg : X.progressRed)
    const cBarSt = cRate>=1 ? X.progressGreen : (cRate>=0.5 ? X.progressBg : X.progressRed)
    const aBarTxt = `  금액: ${makeProgressBar(aRate, 10)}`
    const cBarTxt = `  건수: ${makeProgressBar(cRate, 10)}`
    xr(ws1,R,1,9, ev2?X.dataEven:X.dataOdd)
    xc(ws1,R,1,"",     ev2?X.dataEven:X.dataOdd)
    xc(ws1,R,2,aBarTxt,aBarSt); xm(ws1,R,2,R,4)
    xc(ws1,R,5,"",     ev2?X.dataEven:X.dataOdd)
    xc(ws1,R,6,cBarTxt,cBarSt); xm(ws1,R,6,R,7)
    xc(ws1,R,8,"",     ev2?X.dataEven:X.dataOdd)
    xc(ws1,R,9,"",     ev2?X.dataEven:X.dataOdd)
    R++
  })

  // 팀 합계 행 (v2: 높이 34)
  h(34);
  const dA=totalActAmt-teamMeta.targetAmt, dC=totalActCnt-teamMeta.targetCnt
  xc(ws1,R,1,"팀 합계",          X.totalHead)
  xc(ws1,R,2,teamMeta.targetAmt, X.totalRow,"#,##0")
  xc(ws1,R,3,totalActAmt,        X.totalRow,"#,##0")
  xc(ws1,R,4,`${rateArrow(amtRate)} ${(amtRate*100).toFixed(1)}%`,amtRate>=1?X.totalGreen:X.totalRed)
  xc(ws1,R,5,teamMeta.targetCnt, X.totalRow)
  xc(ws1,R,6,totalActCnt,        X.totalRow)
  xc(ws1,R,7,`${rateArrow(cntRate)} ${(cntRate*100).toFixed(1)}%`,cntRate>=1?X.totalGreen:X.totalRed)
  xc(ws1,R,8,dA,dA>=0?X.totalGreen:X.totalRed,"#,##0;-#,##0")
  xc(ws1,R,9,dC,dC>=0?X.totalGreen:X.totalRed)
  R++

  h(14); R++ // 간격

  // ── 섹션3: 팀 전체 활동 현황 ──────────────────────────────
  h(30); xr(ws1,R,1,8,X.secHead)
  xc(ws1,R,1,"▌ 팀 전체 활동 현황 (전화 / 만남 / 제안 / 소개 / DB배정 / 반품)",X.secHead)
  xm(ws1,R,1,R,8); R++

  h(30);
  ["이름","전화","만남","제안","소개","DB배정","반품","활동합계"]
    .forEach((v,i) => xc(ws1,R,1+i,v,X.colHead))
  R++

  agents.forEach((a,ri) => {
    h(30);
    const p   = a.performance
    const ev  = ri%2===0
    const bg  = ev?X.dataEven:X.dataOdd
    const tot = Number(p.call||0)+Number(p.meet||0)+Number(p.pt||0)
               +Number(p.intro||0)+Number(p.db_assigned||0)+Number(p.db_returned||0)
    xc(ws1,R,1,a.name,                    ev?X.nameEven:X.nameOdd)
    xc(ws1,R,2,Number(p.call        ||0), bg)
    xc(ws1,R,3,Number(p.meet        ||0), bg)
    xc(ws1,R,4,Number(p.pt          ||0), bg)
    xc(ws1,R,5,Number(p.intro       ||0), bg)
    xc(ws1,R,6,Number(p.db_assigned ||0), bg)
    xc(ws1,R,7,Number(p.db_returned ||0), Number(p.db_returned||0)>0?(ev?X.retRedEven:X.retRedOdd):bg)
    xc(ws1,R,8,tot,                       ev?X.actSumEven:X.actSumOdd)
    R++
  })

  // 활동 합계 행
  h(34);
  const gAct=tCall+tMeet+tPt+tIntro+tDb+tRet
  xc(ws1,R,1,"팀 합계",X.totalHead)
  xc(ws1,R,2,tCall,    X.totalRow)
  xc(ws1,R,3,tMeet,    X.totalRow)
  xc(ws1,R,4,tPt,      X.totalRow)
  xc(ws1,R,5,tIntro,   X.totalRow)
  xc(ws1,R,6,tDb,      X.totalRow)
  xc(ws1,R,7,tRet,     tRet>0?X.totalRed:X.totalRow)
  xc(ws1,R,8,gAct,     X.totalGreen)
  R++

  h(14); R++ // 간격

  // ── 섹션4: 활동 전환율 분석 ───────────────────────────────
  h(30); xr(ws1,R,1,8,X.secHead)
  xc(ws1,R,1,"▌ 팀 전체 활동 전환율 분석",X.secHead); xm(ws1,R,1,R,8); R++

  h(28);
  ["전화→만남 전환율","만남→제안 전환율","소개 건수","DB 배정","DB 반품","반품률"]
    .forEach((v,i) => xc(ws1,R,2+i,v,X.colHead))
  R++

  h(34);
  const mc1: string = tCall>0?(tMeet/tCall*100).toFixed(1):"0.0"
  const pc1: string = tMeet>0?(tPt/tMeet*100).toFixed(1):"0.0"
  const retRatePct: string = tDb>0?(tRet/tDb*100).toFixed(1):"0.0"
  ;[`${mc1}%`,`${pc1}%`,`${tIntro}건`,`${tDb}건`,`${tRet}건`,`${retRatePct}%`]
    .forEach((v,i) => xc(ws1,R,2+i,v, i===5&&Number(retRatePct)>10?X.totalRed:X.totalRow))
  R++

  // ▼ v2 신규: 전환율 시각화 막대
  h(26);
  xr(ws1,R,1,8,X.progressBg)
  const mcRate = tCall>0 ? tMeet/tCall : 0
  const pcRate = tMeet>0 ? tPt/tMeet   : 0
  const retRate= tDb>0   ? tRet/tDb    : 0
  xc(ws1,R,2,`📞→🤝 ${makeProgressBar(mcRate,10)}  ${mc1}%`,  X.convBlue);   xm(ws1,R,2,R,3)
  xc(ws1,R,4,`🤝→📋 ${makeProgressBar(pcRate,10)}  ${pc1}%`,  X.convOrange); xm(ws1,R,4,R,5)
  xc(ws1,R,6,"",X.progressBg)
  xc(ws1,R,7,`🔄 반품률 ${makeProgressBar(retRate,10)}  ${retRatePct}%`, retRate>0.1?X.progressRed:X.progressGreen)
  xm(ws1,R,7,R,8); R++

  ws1["!ref"] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:R+1,c:10}})
  XLSX.utils.book_append_sheet(wb, ws1, "📊 팀 전체 현황")

  // ══════════════════════════════════════════════════════════════
  // TAB 2 : 👤 개인별 상세 현황  [v2 — 넓은 열 + 진행바]
  // ══════════════════════════════════════════════════════════════
  const ws2: any = { "!merges": [], "!rows": [] }
  ws2["!cols"] = [
    {wch:3},   // A
    {wch:14},  // B
    {wch:14},  // C
    {wch:18},  // D
    {wch:14},  // E
    {wch:14},  // F
    {wch:14},  // G
    {wch:14},  // H
    {wch:14},  // I
    {wch:3},   // J
  ]

  let R2 = 0
  const h2 = (px: number): void => { ws2["!rows"][R2] = { hpx: px } }

  h2(14); R2++

  h2(54); xr(ws2,R2,1,8,X.title)
  xc(ws2,R2,1,`👤  팀원별 개인 실적 상세 리포트 — ${yearMonth}`,X.title)
  xm(ws2,R2,1,R2,8); R2++

  h2(20); xr(ws2,R2,1,8,X.subtitle)
  xc(ws2,R2,1,"※ 팀원별 개인 목표·실적·활동 내역 상세 리포트입니다.",X.subtitle)
  xm(ws2,R2,1,R2,8); R2++

  agents.forEach(a => {
    const p     = a.performance
    const tAmt  = Number(p.target_amt   || 0)
    const cAmt  = Number(p.contract_amt || 0)
    const tCnt  = Number(p.target_cnt   || 1)
    const cCnt  = Number(p.contract_cnt || 0)
    const aRate = tAmt>0 ? cAmt/tAmt : 0
    const cRate = tCnt>0 ? cCnt/tCnt : 0
    const actTot= Number(p.call||0)+Number(p.meet||0)+Number(p.pt||0)
                 +Number(p.intro||0)+Number(p.db_assigned||0)+Number(p.db_returned||0)
    const mc: string = Number(p.call||0)>0 ? (Number(p.meet||0)/Number(p.call||1)*100).toFixed(1) : "0.0"
    const pc: string = Number(p.meet||0)>0 ? (Number(p.pt||0)/Number(p.meet||1)*100).toFixed(1)   : "0.0"

    h2(14); R2++

    // 이름 배너 (v2: 높이 36)
    h2(36); xr(ws2,R2,1,8,X.memberBanner)
    xc(ws2,R2,1,`◆  ${a.name}  |  설계사 개인 현황  ${rateBadge(aRate)}`,X.memberBanner)
    xm(ws2,R2,1,R2,8); R2++

    // 컬럼 헤더 (v2: 높이 28)
    h2(28);
    xc(ws2,R2,1,"구분",        X.metaGoalLbl); xm(ws2,R2,1,R2,2)
    xc(ws2,R2,3,"금액 (만원)", X.metaGoalLbl); xm(ws2,R2,3,R2,4)
    xc(ws2,R2,5,"건수",        X.metaGoalLbl); xm(ws2,R2,5,R2,6)
    xc(ws2,R2,7,"",            X.metaGoalLbl); xm(ws2,R2,7,R2,8)
    R2++

    // 목표 행 (v2: 높이 30)
    h2(30);
    xc(ws2,R2,1,"목표",X.metaGoalLbl);         xm(ws2,R2,1,R2,2)
    xc(ws2,R2,3,tAmt,  X.metaVal,"#,##0");     xm(ws2,R2,3,R2,4)
    xc(ws2,R2,5,tCnt,  X.metaVal);             xm(ws2,R2,5,R2,6)
    xc(ws2,R2,7,"",    X.metaVal);             xm(ws2,R2,7,R2,8)
    R2++

    // 실적 행
    h2(30);
    xc(ws2,R2,1,"실적",X.metaActLbl);          xm(ws2,R2,1,R2,2)
    xc(ws2,R2,3,cAmt,  X.metaVal,"#,##0");     xm(ws2,R2,3,R2,4)
    xc(ws2,R2,5,cCnt,  X.metaVal);             xm(ws2,R2,5,R2,6)
    xc(ws2,R2,7,"",    X.metaVal);             xm(ws2,R2,7,R2,8)
    R2++

    // 달성률 행
    h2(30);
    const rLbl = aRate>=1 ? X.metaRGreenLbl : X.metaRRedLbl
    xc(ws2,R2,1,"달성률",                    rLbl);                      xm(ws2,R2,1,R2,2)
    xc(ws2,R2,3,`${(aRate*100).toFixed(1)}%`,aRate>=1?X.metaRGreen:X.metaRRed); xm(ws2,R2,3,R2,4)
    xc(ws2,R2,5,`${(cRate*100).toFixed(1)}%`,cRate>=1?X.metaRGreen:X.metaRRed); xm(ws2,R2,5,R2,6)
    xc(ws2,R2,7,"",X.metaVal);               xm(ws2,R2,7,R2,8)
    R2++

    // ▼ v2 신규: 달성률 진행 바 (금액/건수)
    h2(24);
    const aBarSt2 = aRate>=1 ? X.progressGreen : (aRate>=0.5 ? X.progressBg : X.progressRed)
    const cBarSt2 = cRate>=1 ? X.progressGreen : (cRate>=0.5 ? X.progressBg : X.progressRed)
    xc(ws2,R2,1,`금액 ${makeProgressBar(aRate,12)}  ${(aRate*100).toFixed(1)}%`, aBarSt2); xm(ws2,R2,1,R2,4)
    xc(ws2,R2,5,`건수 ${makeProgressBar(cRate,12)}  ${(cRate*100).toFixed(1)}%`, cBarSt2); xm(ws2,R2,5,R2,8)
    R2++

    // 활동 헤더 (v2: 높이 28)
    h2(28);
    ["전화","만남","제안","소개","DB배정","반품","활동합계"]
      .forEach((v,i) => xc(ws2,R2,1+i,v,X.colHeadSm))
    xc(ws2,R2,8,"",X.colHeadSm)
    R2++

    // 활동 데이터 (v2: 높이 30)
    h2(30);
    [Number(p.call||0),Number(p.meet||0),Number(p.pt||0),
     Number(p.intro||0),Number(p.db_assigned||0),Number(p.db_returned||0),actTot
    ].forEach((v,i) => {
      xc(ws2,R2,1+i,v,
        i===5&&v>0 ? X.retRedEven
        : i===6    ? X.actSumEven
        :             X.dataEven)
    })
    xc(ws2,R2,8,"",X.dataEven)
    R2++

    // 전환율 행 (v2: 높이 28)
    h2(28);
    xc(ws2,R2,1,`📞→🤝 전화→만남 전환율: ${mc}%`,X.convBlue);   xm(ws2,R2,1,R2,4)
    xc(ws2,R2,5,`🤝→📋 만남→제안 전환율: ${pc}%`,X.convOrange); xm(ws2,R2,5,R2,8)
    R2++

    // ▼ v2 신규: 개인 전환율 진행 바
    h2(22);
    const mcR = Number(p.call||0)>0 ? Number(p.meet||0)/Number(p.call||1) : 0
    const pcR = Number(p.meet||0)>0 ? Number(p.pt||0)/Number(p.meet||1)   : 0
    xc(ws2,R2,1,`  ${makeProgressBar(mcR,12)}`, X.convBlue);   xm(ws2,R2,1,R2,4)
    xc(ws2,R2,5,`  ${makeProgressBar(pcR,12)}`, X.convOrange); xm(ws2,R2,5,R2,8)
    R2++
  })

  ws2["!ref"] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:R2+1,c:9}})
  XLSX.utils.book_append_sheet(wb, ws2, "👤 개인별 상세 현황")

  // ══════════════════════════════════════════════════════════════
  // TAB 3 : 📈 인포그래픽 대시보드  [v2 신규]
  // — 순수 텍스트/색상 기반 시각화 대시보드 시트
  // ══════════════════════════════════════════════════════════════
  const ws3: any = { "!merges": [], "!rows": [] }
  ws3["!cols"] = [
    {wch:3},   // A 여백
    {wch:22},  // B
    {wch:18},  // C
    {wch:18},  // D
    {wch:18},  // E
    {wch:18},  // F
    {wch:18},  // G
    {wch:18},  // H
    {wch:22},  // I
    {wch:3},   // J 여백
  ]

  let R3 = 0
  const h3 = (px: number): void => { ws3["!rows"][R3] = { hpx: px } }

  // 상단 여백
  h3(14); R3++

  // 대시보드 타이틀
  h3(56); xr(ws3,R3,1,8,X.infoTitle)
  xc(ws3,R3,1,`📈  메타리치 인포그래픽 대시보드 — ${yearMonth}`,X.infoTitle)
  xm(ws3,R3,1,R3,8); R3++

  h3(20); xr(ws3,R3,1,8,X.subtitle)
  xc(ws3,R3,1,"※ 팀 KPI 및 팀원별 성과를 시각적으로 요약한 대시보드입니다.",X.subtitle)
  xm(ws3,R3,1,R3,8); R3++

  h3(14); R3++

  // ── [블록 A] 팀 KPI 카드 ──────────────────────────────────
  h3(30); xr(ws3,R3,1,8,X.infoSubTitle)
  xc(ws3,R3,1,"🎯  팀 전체 KPI 달성 현황",X.infoSubTitle); xm(ws3,R3,1,R3,8); R3++

  // 카드 라벨
  h3(30);
  ;[["목표 금액","FF4472C4"],["실적 금액","FFED7D31"],["목표 건수","FF4472C4"],
    ["실적 건수","FFED7D31"],["금액 달성률","FF70AD47"]
  ].forEach(([lbl,bg],i) => {
    const cs = 1 + i*floor17(i)  // 실제는 순차 배치
    void 0  // 아래에서 처리
  })
  ;["목표 금액","실적 금액","목표 건수","실적 건수","금액 달성률"].forEach((lbl,i) => {
    const colIdx = [1,3,5,7,9][i] as number
    const st = [X.infoKpiCard, amtRate>=1?X.infoKpiCard:X.infoKpiCard,
                X.infoKpiCard, cntRate>=1?X.infoKpiCard:X.infoKpiCard,
                amtRate>=1?X.infoKpiCard:X.infoKpiCard][i]
    xc(ws3,R3,colIdx,lbl,st)
    if(colIdx<9) xm(ws3,R3,colIdx,R3,colIdx+1)
  }); R3++

  // 카드 값 (v2: 높이 54, 대형 폰트)
  h3(54);
  const infoKpiVals = [
    `${teamMeta.targetAmt.toLocaleString()}만원`,
    `${totalActAmt.toLocaleString()}만원`,
    `${teamMeta.targetCnt}건`,
    `${totalActCnt}건`,
    `${(amtRate*100).toFixed(1)}%`,
  ]
  const infoKpiVSt = [
    X.infoKpiVal,
    amtRate>=1 ? X.infoKpiValG : X.infoKpiValO,
    X.infoKpiVal,
    cntRate>=1 ? X.infoKpiValG : X.infoKpiValO,
    amtRate>=1 ? X.infoKpiValG : X.infoKpiValO,
  ]
  ;[1,3,5,7,9].forEach((colIdx,i) => {
    xc(ws3,R3,colIdx,infoKpiVals[i],infoKpiVSt[i])
    if(colIdx<9) xm(ws3,R3,colIdx,R3,colIdx+1)
  }); R3++

  h3(14); R3++

  // ── [블록 B] 팀 목표 달성 게이지 ────────────────────────────
  h3(30); xr(ws3,R3,1,8,X.infoSubTitle)
  xc(ws3,R3,1,"⚡  목표 달성 게이지",X.infoSubTitle); xm(ws3,R3,1,R3,8); R3++

  // 금액 게이지
  h3(38);
  xc(ws3,R3,1,"💰 금액 달성률",X.metaGoalLbl); xm(ws3,R3,1,R3,2)
  const amtBarFull  = makeProgressBar(amtRate, 30)
  const amtGaugeSt  = amtRate>=1 ? X.infoBarFill : (amtRate>=0.5 ? X.infoBarFillO : X.infoBarFillR)
  xc(ws3,R3,3, amtBarFull, amtGaugeSt); xm(ws3,R3,3,R3,7)
  xc(ws3,R3,8, `${(amtRate*100).toFixed(1)}%  ${rateBadge(amtRate)}`,
    amtRate>=1 ? X.infoStat : X.infoStatOr)
  R3++

  // 건수 게이지
  h3(38);
  xc(ws3,R3,1,"📋 건수 달성률",X.metaGoalLbl); xm(ws3,R3,1,R3,2)
  const cntBarFull  = makeProgressBar(cntRate, 30)
  const cntGaugeSt  = cntRate>=1 ? X.infoBarFill : (cntRate>=0.5 ? X.infoBarFillO : X.infoBarFillR)
  xc(ws3,R3,3, cntBarFull, cntGaugeSt); xm(ws3,R3,3,R3,7)
  xc(ws3,R3,8, `${(cntRate*100).toFixed(1)}%  ${rateBadge(cntRate)}`,
    cntRate>=1 ? X.infoStat : X.infoStatOr)
  R3++

  h3(14); R3++

  // ── [블록 C] 팀원별 성과 비교 바 차트 ────────────────────────
  h3(30); xr(ws3,R3,1,8,X.infoSubTitle)
  xc(ws3,R3,1,"👥  팀원별 금액 달성률 비교",X.infoSubTitle); xm(ws3,R3,1,R3,8); R3++

  h3(26);
  xc(ws3,R3,1,"이름",X.colHead)
  xc(ws3,R3,2,"금액 달성 게이지 (10칸 = 100%)",X.colHead); xm(ws3,R3,2,R3,6)
  xc(ws3,R3,7,"달성률",X.colHead)
  xc(ws3,R3,8,"뱃지",X.colHead)
  R3++

  // 팀원 정렬 (달성률 내림차순)
  const sortedAgents = [...agents].sort((a,b) => {
    const rA = Number(a.performance.target_amt||1) > 0
      ? Number(a.performance.contract_amt||0)/Number(a.performance.target_amt||1) : 0
    const rB = Number(b.performance.target_amt||1) > 0
      ? Number(b.performance.contract_amt||0)/Number(b.performance.target_amt||1) : 0
    return rB - rA
  })

  sortedAgents.forEach((a, ri) => {
    const p    = a.performance
    const tA   = Number(p.target_amt   || 1)
    const cA   = Number(p.contract_amt || 0)
    const rate = tA>0 ? cA/tA : 0
    const ev   = ri%2===0

    h3(34);
    const barSt = rate>=1 ? X.infoBarFill : (rate>=0.5 ? X.infoBarFillO : X.infoBarFillR)
    const rowBg = ev ? X.dataEven : X.dataOdd
    xc(ws3,R3,1, a.name,                    ev?X.nameEven:X.nameOdd)
    xc(ws3,R3,2, makeProgressBar(rate, 20), barSt); xm(ws3,R3,2,R3,6)
    xc(ws3,R3,7, `${(rate*100).toFixed(1)}%`, rate>=1?X.rGreenEven:(rate>=0.5?X.rRedEven:X.rRedEven))
    xc(ws3,R3,8, rateBadge(rate),           rate>=1?X.infoStat:(rate>=0.5?X.infoStatOr:X.infoStatRed))
    R3++
  })

  h3(14); R3++

  // ── [블록 D] 활동량 비교 ──────────────────────────────────
  h3(30); xr(ws3,R3,1,8,X.infoSubTitle)
  xc(ws3,R3,1,"📊  팀원별 활동량 비교",X.infoSubTitle); xm(ws3,R3,1,R3,8); R3++

  h3(26);
  xc(ws3,R3,1,"이름",X.colHead)
  xc(ws3,R3,2,"활동 총량 게이지",X.colHead); xm(ws3,R3,2,R3,5)
  xc(ws3,R3,6,"활동합계",X.colHead)
  xc(ws3,R3,7,"전화",X.colHead)
  xc(ws3,R3,8,"만남",X.colHead)
  R3++

  // 최대 활동량 계산
  const maxAct = Math.max(1, ...agents.map(a =>
    Number(a.performance.call||0)+Number(a.performance.meet||0)+Number(a.performance.pt||0)+
    Number(a.performance.intro||0)+Number(a.performance.db_assigned||0)+Number(a.performance.db_returned||0)
  ))

  agents.forEach((a, ri) => {
    const p   = a.performance
    const ev  = ri%2===0
    const act = Number(p.call||0)+Number(p.meet||0)+Number(p.pt||0)+
                Number(p.intro||0)+Number(p.db_assigned||0)+Number(p.db_returned||0)
    const actRate = maxAct > 0 ? act/maxAct : 0

    h3(34);
    xc(ws3,R3,1, a.name,                     ev?X.nameEven:X.nameOdd)
    xc(ws3,R3,2, makeProgressBar(actRate,20), X.infoBarFill); xm(ws3,R3,2,R3,5)
    xc(ws3,R3,6, act,                         ev?X.actSumEven:X.actSumOdd)
    xc(ws3,R3,7, Number(p.call||0),           ev?X.dataEven:X.dataOdd)
    xc(ws3,R3,8, Number(p.meet||0),           ev?X.dataEven:X.dataOdd)
    R3++
  })

  h3(14); R3++

  // ── [블록 E] 전환율 파이프라인 ───────────────────────────────
  h3(30); xr(ws3,R3,1,8,X.infoSubTitle)
  xc(ws3,R3,1,"🔀  영업 파이프라인 전환율 흐름",X.infoSubTitle); xm(ws3,R3,1,R3,8); R3++

  h3(22); xr(ws3,R3,1,8,X.infoBarLabel)
  xc(ws3,R3,1,"단계",X.colHead)
  ;["전화","→","만남","→","제안","→","계약"].forEach((v,i) => xc(ws3,R3,2+i,v,X.colHead))
  R3++

  h3(40); xr(ws3,R3,1,8,X.dataEven)
  xc(ws3,R3,1,"활동량",X.nameEven)
  ;[tCall,"",tMeet,"",tPt,"",totalActCnt].forEach((v,i) => {
    xc(ws3,R3,2+i, typeof v==="number" ? v : v,
      i%2===1 ? X.infoSep : X.infoStat)
  })
  R3++

  h3(30); xr(ws3,R3,1,8,X.dataOdd)
  xc(ws3,R3,1,"전환율",X.nameOdd)
  xc(ws3,R3,2,"",X.dataOdd)
  xc(ws3,R3,3,`${mc1}%`,X.convBlue)
  xc(ws3,R3,4,"",X.dataOdd)
  xc(ws3,R3,5,`${pc1}%`,X.convOrange)
  xc(ws3,R3,6,"",X.dataOdd)
  xc(ws3,R3,7,"",X.dataOdd)
  xc(ws3,R3,8,"",X.dataOdd)
  R3++

  h3(14); R3++

  // ── [블록 F] DB 현황 요약 ────────────────────────────────────
  h3(30); xr(ws3,R3,1,8,X.infoSubTitle)
  xc(ws3,R3,1,"🗃️  DB 현황 요약",X.infoSubTitle); xm(ws3,R3,1,R3,8); R3++

  h3(30);
  ;["DB 배정","DB 반품","반품률","소개 건수"].forEach((v,i) => xc(ws3,R3,1+i*2,v,X.colHead))
  R3++

  h3(44);
  xc(ws3,R3,1,`${tDb}건`,    X.infoKpiValG)
  xc(ws3,R3,3,`${tRet}건`,   tRet>0?X.infoKpiValO:X.infoKpiValG)
  xc(ws3,R3,5,`${retRatePct}%`, Number(retRatePct)>10?X.infoKpiValO:X.infoKpiValG)
  xc(ws3,R3,7,`${tIntro}건`, X.infoKpiVal)
  R3++

  // DB 반품률 게이지
  h3(32);
  xc(ws3,R3,1,"🔄 DB 반품률",X.metaGoalLbl); xm(ws3,R3,1,R3,2)
  const retGaugeSt = Number(retRatePct)>10 ? X.infoBarFillR : X.infoBarFill
  xc(ws3,R3,3, makeProgressBar(tDb>0?tRet/tDb:0, 30), retGaugeSt); xm(ws3,R3,3,R3,7)
  xc(ws3,R3,8, `${retRatePct}%  ${Number(retRatePct)>10?"⚠️ 주의":"✅ 양호"}`,
    Number(retRatePct)>10?X.infoStatRed:X.infoStat)
  R3++

  h3(14); R3++

  // ── [블록 G] 종합 총평 ──────────────────────────────────────
  h3(30); xr(ws3,R3,1,8,X.infoSubTitle)
  xc(ws3,R3,1,"📝  이번 달 종합 총평",X.infoSubTitle); xm(ws3,R3,1,R3,8); R3++

  const summaryLines = [
    `• 금액 달성률  ${(amtRate*100).toFixed(1)}%  |  건수 달성률  ${(cntRate*100).toFixed(1)}%  →  ${rateBadge(amtRate)}`,
    `• 총 계약 실적  ${totalActCnt}건 / ${totalActAmt.toLocaleString()}만원  (목표: ${teamMeta.targetCnt}건 / ${teamMeta.targetAmt.toLocaleString()}만원)`,
    `• 전화→만남 전환율  ${mc1}%  |  만남→제안 전환율  ${pc1}%`,
    `• DB 배정  ${tDb}건  |  반품  ${tRet}건  |  반품률  ${retRatePct}%  ${Number(retRatePct)>10?"⚠️ 반품 관리 필요":"✅ 양호"}`,
    `• 팀 전체 활동 합계  ${gAct}건  (전화: ${tCall}  만남: ${tMeet}  제안: ${tPt}  소개: ${tIntro})`,
  ]

  summaryLines.forEach(line => {
    h3(28);
    xc(ws3,R3,1, line, X.infoCardBg); xm(ws3,R3,1,R3,8)
    R3++
  })

  h3(14); R3++

  ws3["!ref"] = XLSX.utils.encode_range({s:{r:0,c:0},e:{r:R3+1,c:9}})
  XLSX.utils.book_append_sheet(wb, ws3, "📈 인포그래픽 대시보드")

  // ── 파일 저장 ───────────────────────────────────────────────
  XLSX.writeFile(wb, `Team_Report_${monthKey}.xlsx`)
}

// 내부 헬퍼: i 값에 따른 컬럼 오프셋 (사용되지 않음, 타입 오류 방지용)
function floor17(_i: number): number { return 2 }