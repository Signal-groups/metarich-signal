'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabase'

// ─── 보장 벤치마크 (업계 표준 기준, 만원) ─────────────────────────────────────
const BENCHMARK: Record<string, { label: string; standard: number; unit: string }> = {
  death_general:     { label: '일반사망',       standard: 5000, unit: '만원' },
  death_disease:     { label: '질병사망',        standard: 3000, unit: '만원' },
  cancer_general:    { label: '일반암 진단비',   standard: 3000, unit: '만원' },
  cancer_similar:    { label: '유사암/소액암',   standard: 500,  unit: '만원' },
  cancer_chemo:      { label: '항암치료비',      standard: 300,  unit: '만원' },
  brain_cerebro:     { label: '뇌혈관질환',      standard: 2000, unit: '만원' },
  brain_stroke:      { label: '뇌졸중',          standard: 2000, unit: '만원' },
  heart_mi:          { label: '급성심근경색',     standard: 2000, unit: '만원' },
  heart_ischemic:    { label: '허혈성심장질환',  standard: 2000, unit: '만원' },
  surgery_disease:   { label: '질병수술비',      standard: 500,  unit: '만원' },
  surgery_injury:    { label: '상해수술비',      standard: 500,  unit: '만원' },
  hosp_disease:      { label: '질병입원일당',    standard: 5,    unit: '만원/일' },
  hosp_injury:       { label: '상해입원일당',    standard: 5,    unit: '만원/일' },
  indemnity:         { label: '실손의료비',      standard: 100,  unit: '% (가입여부)' },
  disability:        { label: '후유장해',        standard: 2000, unit: '만원' },
}

const COVERAGE_STRUCTURE_REPORT = [
  { group: '가족보장자산', sub: '사망', label: '일반사망',           groupColor: '#1e3a8a', groupBg: '#dbeafe', benchmarkKey: 'death_general' },
  { group: null,           sub: null,   label: '질병사망',           groupColor: '#1e3a8a', groupBg: '#dbeafe', benchmarkKey: 'death_disease' },
  { group: null,           sub: null,   label: '재해(상해)사망',     groupColor: '#1e3a8a', groupBg: '#dbeafe', benchmarkKey: null },
  { group: '생활보장자산', sub: '암치료비', label: '일반암 진단비',  groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: 'cancer_general' },
  { group: null,           sub: null,   label: '유사암/소액암',      groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: 'cancer_similar' },
  { group: null,           sub: null,   label: '암수술비',           groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: null,   label: '항암 (방사선/약물)', groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: 'cancer_chemo' },
  { group: null,           sub: null,   label: '표적항암치료',       groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: null,   label: '중입자치료',         groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: null,   label: '암주요치료비',       groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: '2대질병', label: '뇌혈관질환',     groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: 'brain_cerebro' },
  { group: null,           sub: null,   label: '뇌졸중',             groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: 'brain_stroke' },
  { group: null,           sub: null,   label: '뇌출혈',             groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: null,   label: '급성심근경색',       groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: 'heart_mi' },
  { group: null,           sub: null,   label: '허혈성심장질환',     groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: 'heart_ischemic' },
  { group: null,           sub: null,   label: '심혈관질환',         groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: null,   label: '뇌혈관수술비',       groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: null,   label: '심혈관수술비',       groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: null,   label: '2대주요치료비',      groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: '후유장해', label: '질병 후유장해', groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: 'disability' },
  { group: null,           sub: null,   label: '상해 후유장해',      groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: '골절', label: '골절 진단비',        groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: null,   label: '골절 수술비',        groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: null,   label: '5대골절 진단비',     groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: null,   label: '5대골절 수술비',     groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: null,   label: '깁스 치료비',        groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: '화상', label: '화상 진단비',        groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: null,           sub: null,   label: '화상 수술비',        groupColor: '#92400e', groupBg: '#fef3c7', benchmarkKey: null },
  { group: '의료보장자산', sub: '실손', label: '상해입원의료비',     groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: null },
  { group: null,           sub: null,   label: '상해통원의료비',     groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: null },
  { group: null,           sub: null,   label: '질병입원의료비',     groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: 'indemnity' },
  { group: null,           sub: null,   label: '질병통원의료비',     groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: null },
  { group: null,           sub: '수술비', label: '질병 수술비',      groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: 'surgery_disease' },
  { group: null,           sub: null,   label: '질병 1~5종수술비',   groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: null },
  { group: null,           sub: null,   label: '상해 수술비',        groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: 'surgery_injury' },
  { group: null,           sub: null,   label: '상해 1~5종수술비',   groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: null },
  { group: null,           sub: null,   label: 'N대 수술비',         groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: null },
  { group: null,           sub: null,   label: '창상봉합술',         groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: null },
  { group: null,           sub: '입원', label: '질병 입원일당',      groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: 'hosp_disease' },
  { group: null,           sub: null,   label: '상해 입원일당',      groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: 'hosp_injury' },
  { group: null,           sub: null,   label: '교통상해입원일당',   groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: null },
  { group: null,           sub: null,   label: '상해간병지원금',     groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: null },
  { group: null,           sub: null,   label: '질병간병지원금',     groupColor: '#14532d', groupBg: '#dcfce7', benchmarkKey: null },
  { group: '운전자',       sub: null,   label: '교통사고처리지원금', groupColor: '#374151', groupBg: '#f3f4f6', benchmarkKey: null },
  { group: null,           sub: null,   label: '교통사고벌금',       groupColor: '#374151', groupBg: '#f3f4f6', benchmarkKey: null },
  { group: null,           sub: null,   label: '변호사선임비용',     groupColor: '#374151', groupBg: '#f3f4f6', benchmarkKey: null },
  { group: null,           sub: null,   label: '자동차부상치료비',   groupColor: '#374151', groupBg: '#f3f4f6', benchmarkKey: null },
  { group: '치아',         sub: null,   label: '임플란트',           groupColor: '#78350f', groupBg: '#fffbeb', benchmarkKey: null },
  { group: null,           sub: null,   label: '크라운',             groupColor: '#78350f', groupBg: '#fffbeb', benchmarkKey: null },
  { group: '기타',         sub: null,   label: '가족일상배상책임',   groupColor: '#6b7280', groupBg: '#f9fafb', benchmarkKey: null },
  { group: null,           sub: null,   label: '화재벌금',           groupColor: '#6b7280', groupBg: '#f9fafb', benchmarkKey: null },
]

function findRowIdx(name: string): number {
  const n = name.toLowerCase().replace(/[\s\-_·()/]/g, '')
  const map: { keywords: string[]; idx: number }[] = [
    { idx: 0, keywords: ['일반사망', '사망보험금'] },
    { idx: 1, keywords: ['질병사망'] },
    { idx: 2, keywords: ['재해사망', '상해사망'] },
    { idx: 4, keywords: ['유사암', '소액암', '경계성암', '갑상선암', '피부암'] },
    { idx: 5, keywords: ['암수술비', '암수술'] },
    { idx: 6, keywords: ['항암방사선', '방사선치료', '약물항암', '항암약물', '항암치료비'] },
    { idx: 7, keywords: ['표적항암', '표적치료', '면역항암'] },
    { idx: 8, keywords: ['중입자', '양성자'] },
    { idx: 9, keywords: ['암주요치료', '암집중치료'] },
    { idx: 3, keywords: ['일반암', '암진단비', '암진단', '통합암'] },
    { idx: 11, keywords: ['뇌졸중'] },
    { idx: 12, keywords: ['뇌출혈'] },
    { idx: 10, keywords: ['뇌혈관질환', '뇌혈관진단'] },
    { idx: 13, keywords: ['급성심근경색', '심근경색'] },
    { idx: 14, keywords: ['허혈성심장', '허혈성'] },
    { idx: 15, keywords: ['심혈관질환', '심장질환진단'] },
    { idx: 16, keywords: ['뇌혈관수술비', '뇌수술비'] },
    { idx: 17, keywords: ['심혈관수술비', '심장수술비'] },
    { idx: 18, keywords: ['2대주요치료', '주요치료비', '뇌심장집중'] },
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
    { idx: 29, keywords: ['상해통원의료비', '상해외래'] },
    { idx: 30, keywords: ['질병입원의료비', '질병입원실비'] },
    { idx: 31, keywords: ['질병통원의료비', '실손의료비', '실손'] },
    { idx: 33, keywords: ['질병1~5종', '질병5종', '질병3종', '1~5종수술'] },
    { idx: 32, keywords: ['질병수술비'] },
    { idx: 35, keywords: ['상해1~5종', '상해5종', '상해3종'] },
    { idx: 34, keywords: ['상해수술비'] },
    { idx: 36, keywords: ['n대수술', '64대수술', '7대수술', '32대수술'] },
    { idx: 37, keywords: ['창상봉합', '봉합술'] },
    { idx: 38, keywords: ['질병입원일당', '질병입원비'] },
    { idx: 39, keywords: ['상해입원일당', '상해입원비'] },
    { idx: 40, keywords: ['교통상해입원', '교통입원'] },
    { idx: 41, keywords: ['상해간병', '재해간병'] },
    { idx: 42, keywords: ['질병간병'] },
    { idx: 43, keywords: ['교통사고처리지원금', '교통사고처리', '대인배상'] },
    { idx: 44, keywords: ['교통사고벌금', '벌금'] },
    { idx: 45, keywords: ['변호사선임', '법률비용'] },
    { idx: 46, keywords: ['자동차부상', '부상치료비'] },
    { idx: 47, keywords: ['임플란트'] },
    { idx: 48, keywords: ['크라운', '보철'] },
    { idx: 49, keywords: ['가족일상배상', '일상배상'] },
    { idx: 50, keywords: ['화재벌금', '화재'] },
  ]
  for (const entry of map) {
    if (entry.keywords.some((kw) => n.includes(kw))) return entry.idx
  }
  return -1
}

function toManwon(amount: number): number {
  return amount >= 100000 ? Math.round(amount / 10000) : amount
}

function readinessColor(pct: number) {
  if (pct >= 80) return '#16a34a'
  if (pct >= 50) return '#d97706'
  return '#dc2626'
}
function readinessLabel(pct: number) {
  if (pct >= 100) return '충분'
  if (pct >= 80) return '양호'
  if (pct >= 50) return '보통'
  if (pct >= 30) return '부족'
  return '미흡'
}

export default function CustomerReportPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<any>(null)
  const [policies, setPolicies] = useState<any[]>([])
  const [coverages, setCoverages] = useState<any[]>([])
  const [advisorName, setAdvisorName] = useState('')
  const [advisorPhone, setAdvisorPhone] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: userData } = await supabase.from('users').select('name, phone').eq('id', session.user.id).single()
      setAdvisorName(userData?.name || '')
      setAdvisorPhone(userData?.phone || '')

      const [{ data: cust }, { data: polData }, { data: covData }] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.from('policies').select('*').eq('customer_id', id).order('start_date', { ascending: false }),
        supabase.from('coverages').select('*').eq('customer_id', id),
      ])

      setCustomer(cust)
      setPolicies(polData || [])
      setCoverages(covData || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div style={{ padding: 60, textAlign: 'center', fontFamily: 'sans-serif' }}>리포트를 불러오는 중...</div>
  if (!customer) return null

  const today = new Date()
  const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`
  const age = customer.birth_date
    ? today.getFullYear() - new Date(customer.birth_date).getFullYear()
    : null
  const totalPremium = policies.reduce((s, p) => s + (Number(p.monthly_premium) || 0), 0)

  // 보험사별 담보 금액 매트릭스
  const numPolicies = Math.min(policies.length, 10)
  const amountGrid: number[][] = Array.from({ length: 51 }, () => Array(numPolicies).fill(0))
  coverages.forEach((cov: any) => {
    const pi = policies.findIndex((p) => p.id === cov.policy_id)
    if (pi < 0 || pi >= numPolicies) return
    const n = String(cov.name || '').toLowerCase().replace(/[\s\-_·()/]/g, '')
    const ri = findRowIdx(n)
    const amount = toManwon(Number(cov.amount || 0))
    if (ri >= 0 && ri < 51 && amount > 0) amountGrid[ri][pi] += amount
  })
  const rowTotals = amountGrid.map((row) => row.reduce((s, v) => s + v, 0))

  // 준비율 계산 (benchmarkKey가 있는 항목만)
  const benchmarkItems = COVERAGE_STRUCTURE_REPORT
    .map((row, ri) => ({ ...row, total: rowTotals[ri] }))
    .filter((row) => row.benchmarkKey && BENCHMARK[row.benchmarkKey])
    .map((row) => {
      const bm = BENCHMARK[row.benchmarkKey!]
      const pct = bm.standard > 0 ? Math.min(Math.round((row.total / bm.standard) * 100), 150) : 0
      return { label: row.label, total: row.total, standard: bm.standard, unit: bm.unit, pct }
    })
    .filter((item) => item.standard > 0)

  // 만기 분류
  const now = new Date()
  const activePolicies = policies.filter((p) => !p.end_date || new Date(p.end_date) > now)
  const expiringPolicies = policies.filter((p) => {
    if (!p.end_date) return false
    const end = new Date(p.end_date)
    const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365)
    return diff > 0 && diff <= 5
  })

  // 섹션 그룹 집계
  const sectionTotals: Record<string, number> = {}
  COVERAGE_STRUCTURE_REPORT.forEach((row, ri) => {
    const g = row.group || '_current'
    if (row.group) sectionTotals[row.group] = (sectionTotals[row.group] || 0) + rowTotals[ri]
  })

  let lastGroup = ''
  let lastSub = ''

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif; color: #111; background: #fff; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          @page { margin: 15mm 12mm; size: A4; }
        }
        .report-wrap { max-width: 960px; margin: 0 auto; padding: 24px; }
        .header-band { background: #1a2744; color: #fff; border-radius: 14px; padding: 28px 32px; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
        .header-logo { font-size: 11px; color: #c9a96e; letter-spacing: 0.1em; font-weight: 700; }
        .header-title { font-size: 22px; font-weight: 900; margin: 6px 0 4px; letter-spacing: -0.02em; }
        .header-sub { font-size: 13px; color: #94a3b8; }
        .header-right { text-align: right; font-size: 12px; color: #cbd5e1; }
        .section-title { font-size: 14px; font-weight: 800; color: #1a2744; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #1a2744; display: flex; align-items: center; gap: 8px; }
        .section-title::before { content: ''; width: 4px; height: 18px; background: #c9a96e; border-radius: 2px; display: inline-block; }
        .info-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 28px; }
        .info-card { background: #f8fafc; border-radius: 10px; padding: 14px 16px; }
        .info-label { font-size: 10px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
        .info-val { font-size: 18px; font-weight: 900; color: #1a2744; }
        .info-unit { font-size: 11px; color: #64748b; margin-left: 2px; }
        table.coverage-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 28px; }
        table.coverage-table th { background: #1a2744; color: #fff; padding: 8px 6px; text-align: center; font-weight: 700; }
        table.coverage-table th.left { text-align: left; padding-left: 10px; }
        table.coverage-table td { padding: 5px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        table.coverage-table td.group-label { font-weight: 800; font-size: 10px; text-align: center; }
        table.coverage-table td.sub-label { font-size: 10px; color: #64748b; text-align: center; }
        table.coverage-table td.item-label { padding-left: 8px; }
        table.coverage-table td.total-col { text-align: right; font-weight: 700; color: #dc2626; }
        table.coverage-table td.amount-col { text-align: right; font-size: 10px; color: #1a2744; }
        table.coverage-table td.empty-col { text-align: right; font-size: 10px; color: #d1d5db; }
        table.coverage-table tr.policy-info td { background: #273469; color: #e2e8f0; font-size: 10px; text-align: right; padding: 4px 6px; }
        table.coverage-table tr.policy-info td.left { text-align: left; }
        .readiness-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 28px; }
        .readiness-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
        .readiness-label { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 6px; }
        .readiness-bar-wrap { background: #f1f5f9; border-radius: 99px; height: 8px; margin-bottom: 6px; overflow: hidden; }
        .readiness-bar { height: 8px; border-radius: 99px; }
        .readiness-bottom { display: flex; justify-content: space-between; align-items: center; }
        .readiness-amount { font-size: 14px; font-weight: 800; }
        .readiness-std { font-size: 10px; color: #94a3b8; }
        .readiness-badge { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 99px; }
        .policy-timeline { margin-bottom: 28px; }
        .policy-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; margin-bottom: 6px; font-size: 12px; }
        .policy-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .policy-company { font-weight: 700; min-width: 80px; }
        .policy-product { flex: 1; color: #475569; }
        .policy-dates { color: #64748b; font-size: 11px; white-space: nowrap; }
        .policy-prem { font-weight: 700; color: #1a2744; white-space: nowrap; }
        .footer-band { margin-top: 32px; padding: 20px 24px; background: #f8fafc; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
        .footer-advisor { font-size: 12px; color: #475569; }
        .footer-disclaimer { font-size: 10px; color: #94a3b8; max-width: 500px; line-height: 1.6; }
        .print-btn { position: fixed; top: 20px; right: 20px; background: #1a2744; color: #fff; border: none; border-radius: 10px; padding: 12px 24px; font-size: 14px; font-weight: 700; cursor: pointer; z-index: 999; box-shadow: 0 4px 14px rgba(0,0,0,0.2); }
        .print-btn:hover { background: #2d4a8a; }
        .warn-chip { display: inline-block; background: #fef3c7; color: #92400e; border-radius: 6px; font-size: 10px; font-weight: 700; padding: 2px 7px; margin-left: 6px; }
        .gap-section { margin-bottom: 28px; }
        .gap-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #fef2f2; border-radius: 8px; margin-bottom: 5px; font-size: 12px; }
        .gap-label { flex: 1; font-weight: 600; color: #111; }
        .gap-have { color: #16a34a; font-weight: 700; }
        .gap-need { color: #dc2626; font-weight: 700; }
      `}</style>

      <button className="no-print print-btn" onClick={() => window.print()}>🖨️ PDF 저장 / 인쇄</button>

      <div className="report-wrap">
        {/* ── 헤더 ── */}
        <div className="header-band">
          <div>
            <div className="header-logo">METARICH SIGNAL GROUP</div>
            <div className="header-title">{customer.name} 님의 내 보험 바로 알기</div>
            <div className="header-sub">보장분석 리포트 · {todayStr} 기준</div>
          </div>
          <div className="header-right">
            <div style={{ fontSize: 12, color: '#c9a96e', fontWeight: 700 }}>담당 설계사</div>
            <div style={{ fontSize: 15, fontWeight: 900, marginTop: 2 }}>{advisorName}</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>{advisorPhone}</div>
          </div>
        </div>

        {/* ── 고객 기본 현황 ── */}
        <div className="section-title">고객 기본 현황</div>
        <div className="info-grid">
          <div className="info-card">
            <div className="info-label">이름</div>
            <div className="info-val" style={{ fontSize: 16 }}>{customer.name}</div>
          </div>
          <div className="info-card">
            <div className="info-label">나이 / 성별</div>
            <div className="info-val">{age ? `${age}세` : '-'}<span className="info-unit">{customer.gender === 'male' ? '남' : customer.gender === 'female' ? '여' : ''}</span></div>
          </div>
          <div className="info-card">
            <div className="info-label">가입 건수</div>
            <div className="info-val">{policies.length}<span className="info-unit">건</span></div>
          </div>
          <div className="info-card">
            <div className="info-label">월 납입 보험료</div>
            <div className="info-val">{totalPremium ? `${Math.round(totalPremium / 10000).toLocaleString()}` : '-'}<span className="info-unit">만원</span></div>
          </div>
          <div className="info-card">
            <div className="info-label">보장 항목 수</div>
            <div className="info-val">{coverages.length}<span className="info-unit">개</span></div>
          </div>
        </div>

        {/* ── 보장분석표 ── */}
        <div className="section-title">내 보험 바로 알기 보장분석표 <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>(단위: 만원)</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="coverage-table">
            <thead>
              <tr>
                <th className="left" style={{ minWidth: 72 }}>분류</th>
                <th className="left" style={{ minWidth: 88 }}>소분류</th>
                <th className="left" style={{ minWidth: 120 }}>보장항목</th>
                <th style={{ minWidth: 54, color: '#fbbf24' }}>합계보장</th>
                {policies.slice(0, numPolicies).map((p, i) => (
                  <th key={i} style={{ minWidth: 56, fontSize: 10 }}>{p.company || `보험${i + 1}`}</th>
                ))}
              </tr>
              {/* 상품명 */}
              <tr className="policy-info">
                <td className="left" colSpan={4} style={{ color: '#94a3b8', fontSize: 10 }}>상품명</td>
                {policies.slice(0, numPolicies).map((p, i) => (
                  <td key={i} style={{ fontSize: 9, maxWidth: 70, overflow: 'hidden' }}>{p.product_name || '-'}</td>
                ))}
              </tr>
              {/* 납입기간 */}
              <tr className="policy-info">
                <td className="left" colSpan={4} style={{ color: '#94a3b8', fontSize: 10 }}>납입기간</td>
                {policies.slice(0, numPolicies).map((p, i) => (
                  <td key={i} style={{ fontSize: 9 }}>{p.payment_period || '-'}</td>
                ))}
              </tr>
              {/* 만기 */}
              <tr className="policy-info">
                <td className="left" colSpan={4} style={{ color: '#94a3b8', fontSize: 10 }}>만기</td>
                {policies.slice(0, numPolicies).map((p, i) => (
                  <td key={i} style={{ fontSize: 9 }}>{p.end_date ? p.end_date.slice(0, 7) : '종신'}</td>
                ))}
              </tr>
              {/* 월보험료 */}
              <tr className="policy-info" style={{ borderBottom: '2px solid #1a2744' }}>
                <td className="left" colSpan={4} style={{ color: '#fbbf24', fontWeight: 700 }}>월 보험료(원)</td>
                {policies.slice(0, numPolicies).map((p, i) => (
                  <td key={i} style={{ color: '#fbbf24', fontWeight: 700 }}>{p.monthly_premium ? Number(p.monthly_premium).toLocaleString() : '-'}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {COVERAGE_STRUCTURE_REPORT.map((row, ri) => {
                const total = rowTotals[ri]
                const isGroupHeader = row.group !== null && row.group !== lastGroup
                const isSubHeader = row.sub !== null && row.sub !== lastSub
                if (row.group !== null) lastGroup = row.group
                if (row.sub !== null) lastSub = row.sub
                const rowBg = total > 0 ? row.groupBg : '#fff'
                return (
                  <tr key={ri} style={{ background: rowBg }}>
                    <td className="group-label" style={{ color: row.groupColor, background: isGroupHeader ? row.groupBg : 'transparent' }}>
                      {isGroupHeader ? row.group : ''}
                    </td>
                    <td className="sub-label">{isSubHeader && row.sub ? row.sub : ''}</td>
                    <td className="item-label" style={{ color: total > 0 ? '#111' : '#94a3b8', fontWeight: total > 0 ? 600 : 400 }}>
                      {row.label}
                    </td>
                    <td className={total > 0 ? 'total-col' : 'empty-col'}>
                      {total > 0 ? total.toLocaleString() : ''}
                    </td>
                    {amountGrid[ri].map((v, pi) => (
                      <td key={pi} className={v > 0 ? 'amount-col' : 'empty-col'}>
                        {v > 0 ? v.toLocaleString() : ''}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── 페이지 2: 보장 준비율 ── */}
        <div className="page-break" />

        <div className="section-title" style={{ marginTop: 24 }}>
          주요 보장 준비율
          <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>업계 권장 기준 대비</span>
        </div>
        <div className="readiness-grid">
          {benchmarkItems.map((item) => (
            <div className="readiness-card" key={item.label}>
              <div className="readiness-label">{item.label}</div>
              <div className="readiness-bar-wrap">
                <div
                  className="readiness-bar"
                  style={{
                    width: `${Math.min(item.pct, 100)}%`,
                    background: readinessColor(item.pct),
                  }}
                />
              </div>
              <div className="readiness-bottom">
                <div>
                  <span className="readiness-amount" style={{ color: readinessColor(item.pct) }}>
                    {item.total > 0 ? item.total.toLocaleString() : '미가입'}
                  </span>
                  {item.unit !== '% (가입여부)' && <span className="readiness-std"> / 권장 {item.standard.toLocaleString()}{item.unit}</span>}
                </div>
                <span
                  className="readiness-badge"
                  style={{
                    background: item.pct >= 80 ? '#dcfce7' : item.pct >= 50 ? '#fef3c7' : '#fee2e2',
                    color: readinessColor(item.pct),
                  }}
                >
                  {item.total === 0 ? '미가입' : readinessLabel(item.pct)} {item.pct > 0 ? `${Math.min(item.pct, 150)}%` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── 보장 공백 (부족 항목) ── */}
        {benchmarkItems.filter((i) => i.pct < 50).length > 0 && (
          <div className="gap-section">
            <div className="section-title" style={{ color: '#dc2626' }}>보장 공백 — 보완이 필요한 항목</div>
            {benchmarkItems
              .filter((item) => item.pct < 50)
              .sort((a, b) => a.pct - b.pct)
              .map((item) => (
                <div className="gap-row" key={item.label}>
                  <span className="gap-label">
                    {item.total === 0 ? '🔴' : '🟡'} {item.label}
                  </span>
                  <span className="gap-have">{item.total > 0 ? `현재 ${item.total.toLocaleString()}만원` : '미가입'}</span>
                  <span style={{ color: '#94a3b8' }}>→</span>
                  <span className="gap-need">권장 {item.standard.toLocaleString()}{item.unit}</span>
                </div>
              ))}
          </div>
        )}

        {/* ── 계약 현황 & 납입/만기 타임라인 ── */}
        <div className="section-title">계약 현황 · 납입기간 & 만기</div>
        <div className="policy-timeline">
          {/* 헤더 */}
          <div style={{ display: 'flex', gap: 10, padding: '4px 12px', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>
            <span style={{ minWidth: 8 }} />
            <span style={{ minWidth: 80 }}>보험사</span>
            <span style={{ flex: 1 }}>상품명</span>
            <span style={{ minWidth: 100 }}>납입기간</span>
            <span style={{ minWidth: 90 }}>만기</span>
            <span style={{ minWidth: 80, textAlign: 'right' }}>월 보험료</span>
          </div>
          {policies.map((p, i) => {
            const isExpiring = expiringPolicies.includes(p)
            const isActive = activePolicies.includes(p)
            return (
              <div
                key={p.id}
                className="policy-row"
                style={{ background: isExpiring ? '#fef3c7' : i % 2 === 0 ? '#f8fafc' : '#fff' }}
              >
                <div className="policy-dot" style={{ background: isExpiring ? '#d97706' : isActive ? '#16a34a' : '#94a3b8' }} />
                <span className="policy-company">{p.company}</span>
                <span className="policy-product">
                  {p.product_name}
                  {isExpiring && <span className="warn-chip">만기임박</span>}
                </span>
                <span className="policy-dates">{p.payment_period || '-'}</span>
                <span className="policy-dates">{p.end_date ? p.end_date.slice(0, 7) : '종신'}</span>
                <span className="policy-prem">
                  {p.monthly_premium ? `${Number(p.monthly_premium).toLocaleString()}원` : '-'}
                </span>
              </div>
            )
          })}
          {policies.length === 0 && (
            <div style={{ padding: '16px 12px', color: '#94a3b8', fontSize: 12 }}>등록된 보험계약이 없습니다.</div>
          )}
        </div>

        {/* ── 결제 정보 ── */}
        {policies.some((p) => p.payment_institution) && (
          <div style={{ marginBottom: 28 }}>
            <div className="section-title">결제 수단 · 납입일 현황</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(
                policies.reduce((acc: Record<string, { institution: string; day: number; type: string; total: number }>, p) => {
                  if (!p.payment_institution) return acc
                  const key = `${p.payment_institution}-${p.payment_day}`
                  if (!acc[key]) acc[key] = { institution: p.payment_institution, day: Number(p.payment_day) || 0, type: p.payment_type || '자동이체', total: 0 }
                  acc[key].total += Number(p.monthly_premium) || 0
                  return acc
                }, {})
              ).map(([key, info]) => (
                <div key={key} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 16px', fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#0369a1' }}>{info.institution}</div>
                  <div style={{ color: '#475569', marginTop: 2 }}>
                    {info.day > 0 ? `${info.day}일` : ''} {info.type} · 월 {Math.round(info.total / 10000).toLocaleString()}만원
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 상담 메모 ── */}
        {customer.consulting_summary && (
          <div style={{ marginBottom: 28 }}>
            <div className="section-title">상담 내용 요약</div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {customer.consulting_summary}
            </div>
          </div>
        )}

        {/* ── 푸터 ── */}
        <div className="footer-band">
          <div className="footer-advisor">
            <div style={{ fontWeight: 800, color: '#1a2744', fontSize: 13 }}>메타리치 시그널그룹</div>
            <div style={{ marginTop: 2 }}>담당 : {advisorName} {advisorPhone && `· ${advisorPhone}`}</div>
            <div style={{ marginTop: 2, color: '#94a3b8', fontSize: 11 }}>작성일 : {todayStr}</div>
          </div>
          <div className="footer-disclaimer">
            본 보장분석 리포트는 현재 등록된 보험계약 정보를 기반으로 작성되었습니다. 실제 보험금 지급 여부 및 금액은 각 보험사의 약관 및 심사 결과에 따라 달라질 수 있으며, 이 리포트는 보험 권유의 목적이 아닌 현황 파악을 위한 참고자료입니다.
          </div>
        </div>
      </div>
    </>
  )
}
