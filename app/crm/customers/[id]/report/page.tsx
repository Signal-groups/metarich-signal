'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Chart,
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadialLinearScale,
  RadarController,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js'
import { supabase } from '../../../../../lib/supabase'
Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)
type CustomerRow = Record<string, unknown>
type PolicyRow = Record<string, unknown> & { id?: string; company?: string; product_name?: string }
type CoverageRow = Record<string, unknown> & {
  id?: string
  policy_id?: string
  company?: string
  product_name?: string
  name?: string
  amount?: number
  category?: string
}
type CoverageStatus = '미가입' | '부족' | '충분'
type CoverageTarget = {
  key: string
  label: string
  recommend: number
  keywords: string[]
  category: string
  unit?: string
}
type EnrichedCoverage = CoverageRow & {
  matchedTarget: CoverageTarget
  normalizedAmount: number
  policy?: PolicyRow
}
const BRAND = {
  primary: '#1A2744',
  primaryLight: '#2D4A8A',
  accent: '#C9A96E',
  accentWarm: '#E8A84B',
  bgLight: '#FAFAF8',
  surface: '#F5F2ED',
  text: '#111111',
  muted: '#6B7280',
}
const TARGETS: CoverageTarget[] = [
  { key: 'generalDeath', label: '일반사망', recommend: 10000, category: '사망 진단', keywords: ['일반사망', '사망보험금'] },
  { key: 'diseaseDeath', label: '질병사망', recommend: 10000, category: '사망 진단', keywords: ['질병사망'] },
  { key: 'injuryDeath', label: '상해사망', recommend: 20000, category: '사망 진단', keywords: ['상해사망', '재해사망'] },
  { key: 'diseaseDisability', label: '질병후유3%', recommend: 5000, category: '후유장해', keywords: ['질병후유', '질병후유장해'] },
  { key: 'injuryDisability', label: '상해후유3%', recommend: 10000, category: '후유장해', keywords: ['상해후유', '재해후유', '상해후유장해'] },
  { key: 'generalCancer', label: '일반암', recommend: 15000, category: '암 진단', keywords: ['일반암', '암진단비', '암진단'] },
  { key: 'similarCancer', label: '유사암', recommend: 3000, category: '암 진단', keywords: ['유사암', '소액암', '갑상선암', '경계성암', '피부암'] },
  { key: 'integratedCancer', label: '통합암', recommend: 5000, category: '암 진단', keywords: ['통합암'] },
  { key: 'specificCancer', label: '특정암', recommend: 5000, category: '암 진단', keywords: ['특정암', '고액암', '여성암', '남성암'] },
  { key: 'cerebrovascular', label: '뇌혈관', recommend: 5000, category: '뇌혈관질환 진단', keywords: ['뇌혈관질환', '뇌혈관진단', '뇌혈관'] },
  { key: 'stroke', label: '뇌졸중', recommend: 5000, category: '뇌혈관질환 진단', keywords: ['뇌졸중'] },
  { key: 'brainHemorrhage', label: '뇌출혈', recommend: 3000, category: '뇌혈관질환 진단', keywords: ['뇌출혈'] },
  { key: 'ischemicHeart', label: '허혈성심장', recommend: 5000, category: '심장질환 진단', keywords: ['허혈성심장', '허혈성'] },
  { key: 'acuteMi', label: '급성심근경색', recommend: 5000, category: '심장질환 진단', keywords: ['급성심근경색', '심근경색'] },
  { key: 'cardiovascular', label: '심혈관질환', recommend: 3000, category: '심장질환 진단', keywords: ['심혈관질환', '심장질환진단'] },
  { key: 'heartSpecial', label: '심장산정특례', recommend: 1000, category: '심장질환 진단', keywords: ['심장산정특례', '순환계산정특례'] },
  { key: 'dementia', label: '치매진단', recommend: 2000, category: '치매 진단', keywords: ['치매진단', '중증치매', '경증치매'] },
  { key: 'longCare', label: '장기요양', recommend: 3000, category: '치매 진단', keywords: ['장기요양', '간병생활자금'] },
  { key: 'diseaseHospitalActual', label: '질병입원', recommend: 5000, category: '실손의료비', unit: '만원 한도', keywords: ['질병입원의료비', '질병입원실비'] },
  { key: 'diseaseOutActual', label: '질병통원', recommend: 30, category: '실손의료비', keywords: ['질병통원', '질병외래', '실손통원'] },
  { key: 'injuryHospitalActual', label: '상해입원', recommend: 5000, category: '실손의료비', unit: '만원 한도', keywords: ['상해입원의료비', '상해입원실비'] },
  { key: 'injuryOutActual', label: '상해통원', recommend: 30, category: '실손의료비', keywords: ['상해통원', '상해외래'] },
  { key: 'diseaseSurgery', label: '질병수술비', recommend: 500, category: '수술비', keywords: ['질병수술비'] },
  { key: 'injurySurgery', label: '상해수술비', recommend: 2000, category: '수술비', keywords: ['상해수술비'] },
  { key: 'brainSurgery', label: '뇌혈관수술비', recommend: 500, category: '수술비', keywords: ['뇌혈관수술비', '뇌수술비'] },
  { key: 'heartSurgery', label: '심혈관수술비', recommend: 500, category: '수술비', keywords: ['심혈관수술비', '심장수술비'] },
  { key: 'nSurgery', label: 'N대수술', recommend: 500, category: '수술비', keywords: ['n대수술', '64대수술', '71대수술', '질병1~5종', '상해1~5종', '종수술'] },
  { key: 'diseaseDaily', label: '질병입원일당', recommend: 3, category: '입원비(일당)', keywords: ['질병입원일당', '질병입원비'] },
  { key: 'injuryDaily', label: '상해입원일당', recommend: 3, category: '입원비(일당)', keywords: ['상해입원일당', '상해입원비'] },
  { key: 'singleRoomDaily', label: '1인실입원일당', recommend: 10, category: '입원비(일당)', keywords: ['1인실', '상급병실', '특실'] },
  { key: 'caregiver', label: '간병지원금', recommend: 10, category: '입원비(일당)', keywords: ['간병지원금', '간병인', '간호간병'] },
  { key: 'cancerTreatment', label: '암주요치료비', recommend: 2000, category: '치료비(항암/표적/주요)', keywords: ['암주요치료', '암집중치료'] },
  { key: 'twoDiseaseTreatment', label: '2대질환주요치료비', recommend: 1000, category: '치료비(항암/표적/주요)', keywords: ['2대질환주요치료', '2대주요치료', '뇌심장주요치료'] },
  { key: 'anticancer', label: '항암치료비', recommend: 1000, category: '치료비(항암/표적/주요)', keywords: ['항암방사선', '항암약물', '항암치료'] },
  { key: 'targetedCancer', label: '표적항암', recommend: 5000, category: '치료비(항암/표적/주요)', keywords: ['표적항암', '면역항암', '표적치료'] },
  { key: 'trafficSettlement', label: '교통사고처리', recommend: 20000, category: '운전자', keywords: ['교통사고처리지원금', '교통사고처리', '형사합의'] },
  { key: 'lawyer', label: '변호사선임', recommend: 5000, category: '운전자', keywords: ['변호사선임', '변호사비용'] },
  { key: 'fine', label: '벌금', recommend: 3000, category: '운전자', keywords: ['벌금', '교통사고벌금', '대인벌금', '대물벌금'] },
  { key: 'carInjury', label: '자동차부상', recommend: 300, category: '운전자', keywords: ['자동차부상', '부상치료비'] },
  { key: 'dailyLiability', label: '가족일상배상', recommend: 10000, category: '법률·배상책임', keywords: ['일상생활배상', '가족일상배상', '배상책임'] },
  { key: 'civilLaw', label: '민사소송법률비용', recommend: 2000, category: '법률·배상책임', keywords: ['민사소송', '법률비용', '소송비용'] },
  { key: 'fireFine', label: '화재벌금', recommend: 2000, category: '법률·배상책임', keywords: ['화재벌금', '실화벌금'] },
  { key: 'implant', label: '임플란트', recommend: 100, category: '치아·화상·골절', keywords: ['임플란트'] },
  { key: 'crown', label: '크라운', recommend: 40, category: '치아·화상·골절', keywords: ['크라운', '보철'] },
  { key: 'burn', label: '화상진단', recommend: 100, category: '치아·화상·골절', keywords: ['화상진단', '화상'] },
  { key: 'fracture', label: '골절진단', recommend: 50, category: '치아·화상·골절', keywords: ['골절진단', '골절'] },
]
const CATEGORY_ORDER = [
  '사망 진단',
  '후유장해',
  '암 진단',
  '뇌혈관질환 진단',
  '심장질환 진단',
  '치매 진단',
  '실손의료비',
  '수술비',
  '입원비(일당)',
  '치료비(항암/표적/주요)',
  '운전자',
  '법률·배상책임',
  '치아·화상·골절',
]
const QUICK_SECTIONS = [
  { title: '가족보장(사망)', keys: ['diseaseDeath', 'injuryDeath'] },
  { title: '큰병보장(진단비)', keys: ['generalCancer', 'similarCancer', 'integratedCancer', 'cerebrovascular', 'stroke', 'ischemicHeart', 'acuteMi', 'cancerTreatment', 'twoDiseaseTreatment'] },
  { title: '의료/수술보장(실손·수술·입원)', keys: ['diseaseHospitalActual', 'diseaseOutActual', 'injuryHospitalActual', 'injuryOutActual', 'diseaseSurgery', 'injurySurgery', 'diseaseDaily', 'injuryDaily'] },
  { title: '운전자/비용보장', keys: ['trafficSettlement', 'lawyer', 'fine', 'carInjury'] },
]
const RADAR_GROUPS = [
  { title: '사망·후유장해', keys: ['generalDeath', 'diseaseDeath', 'injuryDeath', 'diseaseDisability', 'injuryDisability'] },
  { title: '진단비', keys: ['generalCancer', 'similarCancer', 'integratedCancer', 'specificCancer', 'cerebrovascular', 'stroke', 'brainHemorrhage', 'acuteMi', 'ischemicHeart', 'cardiovascular', 'heartSpecial'] },
  { title: '실손·수술·입원', keys: ['diseaseHospitalActual', 'diseaseOutActual', 'injuryHospitalActual', 'injuryOutActual', 'diseaseSurgery', 'injurySurgery', 'brainSurgery', 'heartSurgery', 'diseaseDaily', 'injuryDaily', 'caregiver', 'nSurgery', 'singleRoomDaily', 'twoDiseaseTreatment'] },
  { title: '운전자·기타', keys: ['trafficSettlement', 'lawyer', 'fine', 'carInjury', 'implant', 'crown', 'burn', 'fireFine', 'dailyLiability', 'civilLaw'] },
]
const STATIC_NOTES: Record<string, { lead: string; rows: string[] }> = {
  '사망 진단': {
    lead: '가족 생활비와 부채 상환 기간을 고려해 소득 공백을 메우는 담보입니다.',
    rows: ['가장의 소득 공백은 평균 3~5년 생활비로 먼저 계산합니다.', '질병사망과 상해사망은 지급 사유가 달라 함께 확인해야 합니다.'],
  },
  '후유장해': {
    lead: '사고 또는 질병 후 노동능력 저하가 남을 때 장기 재활비를 보완합니다.',
    rows: ['3% 이상 후유장해는 작은 장해도 보장 범위에 들어오는지 확인합니다.', '재활치료, 소득 감소, 간병 비용을 함께 고려합니다.'],
  },
  '암 진단': {
    lead: '암 치료는 진단비, 치료비, 소득 공백을 함께 준비해야 안정적입니다.',
    rows: ['암 치료 총비용은 직접 치료비 외 생활비까지 커질 수 있습니다.', '항암치료비는 약제와 치료 방식에 따라 수백만~수천만원 차이가 납니다.', '암 경험자 중 일부는 치료 기간 동안 휴직 또는 퇴직을 겪습니다.'],
  },
  '뇌혈관질환 진단': {
    lead: '뇌경색과 뇌출혈은 진단 범위가 달라 넓은 뇌혈관질환 담보가 중요합니다.',
    rows: ['뇌경색은 뇌혈관 진단에서 빈도가 높은 편입니다.', '뇌혈관질환 > 뇌졸중 > 뇌출혈 순으로 보장 범위가 넓습니다.', '보장점수: 뇌혈관 100점, 뇌졸중 70점, 뇌출혈 40점 기준으로 봅니다.'],
  },
  '심장질환 진단': {
    lead: '협심증과 급성심근경색은 보장 범위가 다르므로 허혈성심장질환 기준을 확인합니다.',
    rows: ['협심증 환자 비율이 높아 허혈성심장질환 진단비의 실효성이 큽니다.', '급성심근경색만 있으면 보장 범위가 좁아질 수 있습니다.'],
  },
  '치매 진단': {
    lead: '치매와 장기요양은 치료비보다 간병 기간과 가족 부담이 핵심입니다.',
    rows: ['경증치매, 중증치매, 장기요양 등급별 지급 조건을 분리해 봅니다.', '요양병원·재가급여·간병인 비용을 월 단위로 계산해야 합니다.'],
  },
  '실손의료비': {
    lead: '실제 병원비 부담을 줄이는 기본 담보이며 세대별 자기부담률이 다릅니다.',
    rows: ['연령이 높아질수록 의료 이용 빈도와 실손 필요성이 함께 커집니다.', '입원 5,000만원, 통원 30만원 한도 여부를 우선 확인합니다.'],
  },
  '수술비': {
    lead: '실손과 별개로 정액 지급되어 비급여 수술, 반복 수술에 대응합니다.',
    rows: ['주요 수술 진료비는 질환과 병원급에 따라 큰 차이가 납니다.', '질병수술비, 상해수술비, N대수술비를 중복 구조로 점검합니다.'],
  },
  '입원비(일당)': {
    lead: '입원 기간이 길어질수록 식비, 간병비, 보호자 소득 공백까지 부담이 커집니다.',
    rows: ['일당 3만원 × 14일 입원 시 42만원을 보완합니다.', '간병인은 1일 10~15만원 수준까지 부담될 수 있습니다.'],
  },
  '치료비(항암/표적/주요)': {
    lead: '최신 항암, 표적치료, 주요질환 치료는 진단비만으로 부족할 수 있습니다.',
    rows: ['표적항암제와 면역항암제는 치료 회차와 약제에 따라 비용 차이가 큽니다.', '암·뇌·심장 주요치료비는 치료 단계의 현금흐름 보완 역할을 합니다.'],
  },
  운전자: {
    lead: '자동차보험이 해결하지 못하는 형사·행정 책임 비용을 보완합니다.',
    rows: ['교통사고처리지원금, 변호사선임비, 벌금은 운전자 3대 핵심 담보입니다.', '자동차부상치료비는 사고 후 치료비성 현금 확보에 활용됩니다.'],
  },
  '법률·배상책임': {
    lead: '일상생활 중 타인에게 끼친 손해와 법률 분쟁 비용을 대비합니다.',
    rows: ['가족일상생활배상책임은 누수, 파손, 자전거 사고 등 생활 사고에 쓰입니다.', '법률비용은 소송 전 상담 단계부터 약관상 범위를 확인합니다.'],
  },
  '치아·화상·골절': {
    lead: '빈도는 높지만 단일 치료비가 반복되는 생활형 위험을 보완합니다.',
    rows: ['임플란트와 크라운은 치아별 한도와 면책기간 확인이 필요합니다.', '화상·골절은 어린이와 활동량이 많은 성인에게 활용도가 높습니다.'],
  },
}
function normalizeReportDate(value: unknown): string | null {
  const text = String(value || '').trim()
  if (!text || text === '확인필요' || text === 'null') return null
  const normalized = text.replace(/\./g, '-')
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized
  if (/^\d{2}-\d{2}-\d{2}$/.test(normalized)) return `20${normalized}`
  return null
}
function normalizeReportMoney(value: unknown, source: unknown): number {
  const num = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(num) || num <= 0) return 0
  const version = String((source as { version?: unknown } | null)?.version || '').toLowerCase()
  const isManwon = version.includes('insurance_analysis_v') || version.includes('만원')
  return Math.round(num * (isManwon ? 10000 : 1))
}
function normalizeText(value: unknown): string {
  return String(value || '').toLowerCase().replace(/[\s\-_·()/]/g, '')
}
function toManwon(value: unknown): number {
  const num = Number(value || 0)
  if (!Number.isFinite(num) || num <= 0) return 0
  return num >= 100000 ? Math.round(num / 10000) : Math.round(num)
}
function money(value: unknown): number {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num : 0
}
function formatWon(value: number): string {
  return value > 0 ? `${Math.round(value).toLocaleString()}원` : '-'
}
function formatManwon(value: number, unit = '만원'): string {
  return value > 0 ? `${Math.round(value).toLocaleString()}${unit}` : '미가입'
}
function compactDate(value: unknown): string {
  const date = normalizeReportDate(value)
  return date ? date.slice(0, 7).replace('-', '.') : '-'
}
function valueOf(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value)
  }
  return ''
}
function numberOf(row: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = Number(row[key] || 0)
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}
function getStatus(amount: number, recommend: number): CoverageStatus {
  if (amount <= 0) return '미가입'
  return amount >= recommend * 0.7 ? '충분' : '부족'
}
function statusClass(status: CoverageStatus): string {
  if (status === '충분') return 'status-good'
  if (status === '부족') return 'status-low'
  return 'status-empty'
}
function targetByKey(key: string): CoverageTarget {
  return TARGETS.find((target) => target.key === key) || TARGETS[0]
}
function matchTarget(coverage: CoverageRow): CoverageTarget | undefined {
  const text = normalizeText(`${coverage.name || ''} ${coverage.category || ''} ${coverage.coverage_type || ''} ${coverage.payment_method_type || ''}`)
  const matches = TARGETS.flatMap((target) => (
    target.keywords
      .map((keyword) => normalizeText(keyword))
      .filter((keyword) => text.includes(keyword))
      .map((keyword) => ({ target, keyword }))
  ))
  const refined = /유사암|소액암|통합암|특정암|고액암|갑상선암|피부암|경계성암/.test(text)
    ? matches.filter((match) => match.target.key !== 'generalCancer')
    : matches
  refined.sort((a, b) => b.keyword.length - a.keyword.length)
  return refined[0]?.target
}
function summarizeTargets(coverages: CoverageRow[]) {
  const totals: Record<string, number> = Object.fromEntries(TARGETS.map((target) => [target.key, 0]))
  coverages.forEach((coverage) => {
    const target = matchTarget(coverage)
    if (!target) return
    totals[target.key] += toManwon(coverage.amount)
  })
  return totals
}
function Donut({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className="donut" style={{ background: `conic-gradient(${BRAND.accent} ${pct * 3.6}deg, #E7E1D6 0deg)` }}>
      <div>
        <strong>{pct}%</strong>
        <span>납입률</span>
      </div>
    </div>
  )
}
function CoverageBar({ amount, recommend }: { amount: number; recommend: number }) {
  const pct = recommend > 0 ? Math.min(100, Math.round((amount / recommend) * 100)) : 0
  return (
    <div className="amount-bar">
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}
function RadarChart({ title, targets, totals }: { title: string; targets: CoverageTarget[]; totals: Record<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!canvasRef.current) return undefined
    const ratios = targets.map((target) => Math.min(100, Math.round(((totals[target.key] || 0) / target.recommend) * 100)))
    const config: ChartConfiguration<'radar'> = {
      type: 'radar',
      data: {
        labels: targets.map((target) => target.label),
        datasets: [
          {
            label: '가입률',
            data: ratios,
            borderColor: BRAND.primaryLight,
            backgroundColor: 'rgba(45, 74, 138, 0.18)',
            borderWidth: 2,
            pointRadius: 2,
            pointBackgroundColor: BRAND.primaryLight,
          },
          {
            label: '권장',
            data: targets.map(() => 100),
            borderColor: '#C2410C',
            backgroundColor: 'rgba(0,0,0,0)',
            borderDash: [4, 4],
            borderWidth: 1.5,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { stepSize: 25, backdropColor: 'transparent', color: '#6B7280', font: { size: 9 } },
            pointLabels: { color: BRAND.text, font: { size: 10, weight: 700 } },
            grid: { color: '#E5E0D5' },
            angleLines: { color: '#E5E0D5' },
          },
        },
      },
    }
    const chart = new Chart(canvasRef.current, config)
    return () => chart.destroy()
  }, [targets, totals])
  return (
    <div className="radar-card">
      <div className="radar-title">{title}</div>
      <canvas ref={canvasRef} />
    </div>
  )
}
function PaymentMeta({ policy }: { policy: PolicyRow }) {
  const day = valueOf(policy, ['payment_day', 'payment_date', 'pay_day'])
  const type = valueOf(policy, ['payment_type', 'payment_method', 'payment_method_type'])
  if (!day && !type) return null
  return (
    <div className="payment-meta">
      {day && <span>납입일 {day}{/^\d+$/.test(day) ? '일' : ''}</span>}
      {type && <span>{type}</span>}
    </div>
  )
}
function PolicyMini({ policy }: { policy?: PolicyRow }) {
  if (!policy) return <div className="mini-muted">가입 상세 없음</div>
  const endAge = policy.end_age || policy.maturity_age
  return (
    <div className="policy-mini">
      <b>{policy.company || '회사명 미확인'}</b>
      <span>{String(policy.product_name || '상품명 미확인').slice(0, 30)}</span>
      <small>
        {money(policy.monthly_premium) > 0 ? formatWon(money(policy.monthly_premium)) : ''}
        {endAge ? ` · 만기 ${endAge}세` : policy.end_date ? ` · 만기 ${compactDate(policy.end_date)}` : ''}
        {policy.payment_period ? ` · ${String(policy.payment_period)}` : ''}
      </small>
      <PaymentMeta policy={policy} />
    </div>
  )
}
// 담보 하나에 매핑된 모든 정책 미니뷰
function PolicyMiniList({ coverages }: { coverages: EnrichedCoverage[] }) {
  if (!coverages.length) return <div className="mini-muted">가입 상세 없음</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {coverages.map((c, i) => (
        <PolicyMini key={i} policy={c.policy || (c.company || c.product_name ? (c as unknown as PolicyRow) : undefined)} />
      ))}
    </div>
  )
}
export default function CustomerReportPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerRow | null>(null)
  const [policies, setPolicies] = useState<PolicyRow[]>([])
  const [coverages, setCoverages] = useState<CoverageRow[]>([])
  const [advisorName, setAdvisorName] = useState('')
  const [advisorPhone, setAdvisorPhone] = useState('')
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: ud } = await supabase.from('users').select('name,phone').eq('id', session.user.id).single()
      setAdvisorName(ud?.name || '')
      setAdvisorPhone(ud?.phone || '')
      const [{ data: cust }, { data: pols }, { data: covs }, { data: analysisRows }, { data: proSessionRows }] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.from('policies').select('*').eq('customer_id', id).order('start_date', { ascending: false }),
        supabase.from('coverages').select('*').eq('customer_id', id),
        supabase.from('upload_analyses').select('*').eq('customer_id', id).order('created_at', { ascending: false }).limit(1),
        supabase.from('coverage_pro_sessions').select('id,session_data,updated_at').eq('customer_id', id).eq('advisor_id', session.user.id).order('updated_at', { ascending: false }).limit(1),
      ])
      setCustomer(cust || null)

      // ── 우선순위 1: 보장분석 PRO 세션 ────────────────────────────────
      if (proSessionRows && proSessionRows.length > 0) {
        const sessionData = (proSessionRows[0].session_data || {}) as Record<string, unknown>
        const proContracts = Array.isArray(sessionData.contracts) ? sessionData.contracts as Record<string, unknown>[] : []
        const proSyntheticPolicies: PolicyRow[] = proContracts.map((c, i) => ({
          id: `pro-${i}`,
          company: String(c.company || ''),
          product_name: String(c.productName || c.product_name || ''),
          start_date: String(c.contractDate || c.start_date || ''),
          payment_period: String(c.paymentPeriod || c.payment_period || ''),
          // PRO stores monthlyPremium in 만원 → convert to 원
          monthly_premium: Math.round(Number(c.monthlyPremium || c.monthly_premium || 0) * 10000),
          status: String(c.status || 'active'),
        }))
        const proSyntheticCoverages: CoverageRow[] = []
        proContracts.forEach((c, ci) => {
          const covList = Array.isArray(c.coverages) ? c.coverages as Record<string, unknown>[] : []
          covList.forEach((cov) => {
            proSyntheticCoverages.push({
              id: `pro-cov-${proSyntheticCoverages.length}`,
              policy_id: `pro-${ci}`,
              company: String(c.company || ''),
              product_name: String(c.productName || c.product_name || ''),
              name: String(cov.name || cov.coverage_name || ''),
              // PRO stores amount in 만원 → convert to 원 for report functions
              amount: Math.round(Number(cov.amount || 0) * 10000),
              category: '',
            })
          })
        })
        setPolicies(proSyntheticPolicies)
        setCoverages(proSyntheticCoverages)
      }
      // ── 우선순위 2: CRM policies + coverages 테이블 ──────────────────
      else if ((pols && pols.length > 0) || (covs && covs.length > 0)) {
        setPolicies((pols || []) as PolicyRow[])
        setCoverages((covs || []) as CoverageRow[])
      }
      // ── 우선순위 3: 업로드 분석 데이터 ──────────────────────────────
      else if (analysisRows && analysisRows.length > 0) {
        const structured = analysisRows[0]?.structured_json || {}
        const rawPolicies = Array.isArray(structured.policies) ? structured.policies
          : Array.isArray(structured.contracts) ? structured.contracts : []
        const syntheticPolicies: PolicyRow[] = rawPolicies.map((p: Record<string, unknown>, i: number) => ({
          id: `synth-${i}`,
          company: String(p.company || ''),
          product_name: String(p.product_name || p.product || ''),
          start_date: normalizeReportDate(p.start_date),
          end_date: normalizeReportDate(p.end_date || p.maturity_date),
          payment_period: p.payment_period || '',
          maturity_age: p.maturity_age,
          monthly_premium: normalizeReportMoney(p.monthly_premium || p.premium, structured),
          paid_premium_total: normalizeReportMoney(p.paid_premium_total || p.total_paid_premium || p.paid_total, structured),
          remaining_premium_total: normalizeReportMoney(p.remaining_premium_total || p.remaining_total, structured),
          payment_day: p.payment_day || p.pay_day || '',
          payment_type: p.payment_type || p.payment_method || '',
        }))
        const syntheticCoverages: CoverageRow[] = []
        rawPolicies.forEach((p: Record<string, unknown>, policyIndex: number) => {
          const covList = Array.isArray(p.coverages) ? p.coverages : []
          covList.forEach((cov: Record<string, unknown>) => {
            syntheticCoverages.push({
              id: `synth-cov-${syntheticCoverages.length}`,
              policy_id: `synth-${policyIndex}`,
              company: String(p.company || ''),
              product_name: String(p.product_name || p.product || ''),
              name: String(cov.coverage_name || cov.name || ''),
              amount: normalizeReportMoney(cov.amount || cov.coverage_amount, structured),
              category: String(cov.category || ''),
              condition: cov.note || cov.description || cov.condition || '',
            })
          })
        })
        setPolicies(syntheticPolicies)
        setCoverages(syntheticCoverages)
      } else {
        setPolicies((pols || []) as PolicyRow[])
        setCoverages((covs || []) as CoverageRow[])
      }
      setLoading(false)
    }
    load()
  }, [id])
  const todayStr = useMemo(() => {
    const today = new Date()
    return `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`
  }, [])
  const policyById = useMemo(() => {
    const entries = policies.filter((policy) => policy.id).map((policy) => [policy.id as string, policy] as const)
    return new Map(entries)
  }, [policies])
  const enrichedCoverages = useMemo<EnrichedCoverage[]>(() => (
    coverages.flatMap((coverage) => {
      const matchedTarget = matchTarget(coverage)
      if (!matchedTarget) return []
      const policy = coverage.policy_id ? policyById.get(String(coverage.policy_id)) : undefined
      return [{ ...coverage, matchedTarget, normalizedAmount: toManwon(coverage.amount), policy }]
    })
  ), [coverages, policyById])
  const totals = useMemo(() => summarizeTargets(coverages), [coverages])
  if (loading) return <div className="report-loading">보고서 데이터를 불러오는 중입니다.</div>
  if (!customer) return null
  const customerName = String(customer.name || '고객')
  const birthDate = compactDate(customer.birth_date)
  // policy_status(새 컬럼) → 없으면 status 필드로 폴백
  const normalPolicies = policies.filter((policy) => {
    const ps = normalizeText(String(policy.policy_status || policy.status || 'active'))
    return !['실효', '해지', '취소', 'lapsed', 'cancelled', 'terminated', 'expired'].some((w) => ps.includes(normalizeText(w)))
  })
  const inactivePolicies = policies.length - normalPolicies.length
  const totalPremium = policies.reduce((sum, policy) => sum + money(policy.monthly_premium), 0)
  // paid_total(새 컬럼) 우선, 없으면 기존 컬럼 사용
  const paidTotal = policies.reduce((sum, policy) => sum + numberOf(policy, ['paid_total', 'paid_premium_total', 'total_paid_premium']), 0)
  // expected_total(새 컬럼) 우선, 없으면 paid+remaining
  const expectedTotalFromNew = policies.reduce((sum, policy) => sum + numberOf(policy, ['expected_total']), 0)
  const remainingTotal = policies.reduce((sum, policy) => sum + numberOf(policy, ['remaining_premium_total', 'remaining_total']), 0)
  const plannedTotal = expectedTotalFromNew > 0 ? expectedTotalFromNew : paidTotal + remainingTotal
  const paidPercent = plannedTotal > 0 ? (paidTotal / plannedTotal) * 100 : 0
  const statusCounts = TARGETS.reduce<Record<CoverageStatus, number>>((acc, target) => {
    acc[getStatus(totals[target.key] || 0, target.recommend)] += 1
    return acc
  }, { 미가입: 0, 부족: 0, 충분: 0 })
  const hasPaymentDay = policies.some((policy) => valueOf(policy, ['payment_day', 'payment_date', 'pay_day']))
  const hasPaymentType = policies.some((policy) => valueOf(policy, ['payment_type', 'payment_method', 'payment_method_type']))
  const detailRows = enrichedCoverages
    .slice()
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.matchedTarget.category) - CATEGORY_ORDER.indexOf(b.matchedTarget.category) || a.matchedTarget.label.localeCompare(b.matchedTarget.label, 'ko'))
  return (
    <>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@700;800&family=Black+Han+Sans&family=Noto+Serif+KR:wght@700;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #E9EDF2; color: ${BRAND.text}; font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif; word-break: keep-all; overflow-wrap: break-word; }
        .font-display-serif { font-family: 'Noto Serif KR', serif; }
        .report-loading { min-height: 100vh; display: grid; place-items: center; color: ${BRAND.primary}; font-weight: 900; }
        .page { width: 297mm; min-height: 210mm; margin: 0 auto 8mm; background: ${BRAND.bgLight}; page-break-after: always; position: relative; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-pad { padding: 18mm 16mm; }
        .print-btn { position: fixed; right: 24px; bottom: 24px; z-index: 50; border: 0; border-radius: 8px; padding: 14px 24px; background: ${BRAND.primary}; color: white; font-weight: 900; box-shadow: 0 14px 30px rgba(26,39,68,.25); cursor: pointer; }
        .cover { display: grid; grid-template-columns: 40% 60%; min-height: 210mm; }
        .cover-left { background: ${BRAND.primary}; color: white; padding: 22mm 16mm; display: flex; flex-direction: column; justify-content: space-between; }
        .logo-mark { width: 56px; height: 56px; border: 2px solid ${BRAND.accent}; display: grid; place-items: center; color: ${BRAND.accent}; font-weight: 900; font-size: 18px; margin-bottom: 22px; }
        .cover-left h2 { margin: 0 0 12px; font-size: 28px; line-height: 1.2; }
        .cover-meta { display: grid; gap: 10px; margin-top: 30px; }
        .cover-meta div { border-top: 1px solid rgba(255,255,255,.2); padding-top: 10px; }
        .cover-meta span, .tiny-label { display: block; font-size: 11px; color: rgba(255,255,255,.58); font-weight: 800; letter-spacing: .08em; margin-bottom: 4px; }
        .cover-meta strong { font-size: 18px; }
        .cover-right { padding: 24mm 22mm; display: flex; flex-direction: column; justify-content: center; }
        .cover-right h1 { margin: 0; color: ${BRAND.primary}; font-size: 46px; line-height: 1.12; letter-spacing: 0; }
        .cover-line { width: 88px; height: 5px; background: ${BRAND.accent}; margin: 26px 0; }
        .advisor-box { margin-top: 44px; border-left: 5px solid ${BRAND.accent}; padding-left: 20px; color: ${BRAND.primary}; }
        .advisor-box b { display: block; font-size: 22px; margin-top: 4px; }
        .page-head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid ${BRAND.primary}; padding-bottom: 12px; margin-bottom: 18px; }
        .page-head h2 { margin: 0; color: ${BRAND.primary}; font-size: 25px; font-weight: 900; }
        .page-head span { color: ${BRAND.muted}; font-size: 12px; font-weight: 800; }
        .summary-grid { display: grid; grid-template-columns: 37% 63%; gap: 16px; }
        .panel { background: white; border: 1px solid #E6E0D7; border-radius: 8px; padding: 18px; }
        .panel h3 { margin: 0 0 14px; color: ${BRAND.primary}; font-size: 16px; font-weight: 900; }
        .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .metric { background: ${BRAND.surface}; border-radius: 8px; padding: 12px; min-height: 74px; }
        .metric span { display: block; color: ${BRAND.muted}; font-size: 11px; font-weight: 800; margin-bottom: 6px; }
        .metric b { color: ${BRAND.primary}; font-size: 20px; }
        .donut-row { display: grid; grid-template-columns: 126px 1fr; gap: 18px; align-items: center; margin-top: 18px; }
        .donut { width: 120px; height: 120px; border-radius: 50%; display: grid; place-items: center; }
        .donut div { width: 78px; height: 78px; border-radius: 50%; background: white; display: grid; place-items: center; align-content: center; }
        .donut strong { color: ${BRAND.primary}; font-size: 24px; }
        .donut span { color: ${BRAND.muted}; font-size: 11px; font-weight: 800; }
        table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        th { background: ${BRAND.primary}; color: white; padding: 8px 7px; text-align: left; font-weight: 900; }
        td { padding: 7px; border-bottom: 1px solid #ECE7DE; color: #31363F; vertical-align: top; }
        tbody tr:nth-child(even) td { background: #FBFAF6; }
        .quick-top { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 14px; }
        .quick-card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .coverage-line { display: grid; grid-template-columns: 96px 46px 1fr 74px; gap: 8px; align-items: center; padding: 7px 0; border-bottom: 1px solid #EEE8DD; font-size: 10.5px; }
        .coverage-line:last-child { border-bottom: 0; }
        .badge { display: inline-flex; justify-content: center; border-radius: 999px; padding: 3px 8px; font-size: 10px; font-weight: 900; }
        .status-good { background: #DCFCE7; color: #166534; }
        .status-low { background: #FEF3C7; color: #92400E; }
        .status-empty { background: #F3F4F6; color: #9CA3AF; }
        .amount-bar { height: 8px; border-radius: 999px; background: #E5E0D5; overflow: hidden; }
        .amount-bar span { display: block; height: 100%; background: linear-gradient(90deg, ${BRAND.primaryLight}, ${BRAND.accent}); border-radius: inherit; }
        .category-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .coverage-card { min-height: 130px; border: 1px solid #E6E0D7; border-radius: 8px; padding: 13px; background: white; display: flex; flex-direction: column; justify-content: space-between; }
        .coverage-card.empty { background: #F4F1EB; color: #9CA3AF; }
        .coverage-card-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
        .coverage-card h4 { margin: 0; color: ${BRAND.primary}; font-size: 15px; }
        .coverage-money { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0; }
        .coverage-money span { display: block; font-size: 9px; color: ${BRAND.muted}; font-weight: 800; }
        .coverage-money b { font-size: 12px; color: ${BRAND.text}; }
        .policy-mini { font-size: 10.5px; line-height: 1.45; color: #3F4652; }
        .policy-mini b, .policy-mini span, .policy-mini small { display: block; }
        .policy-mini small, .mini-muted { color: ${BRAND.muted}; }
        .payment-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
        .payment-meta span { background: #EEF2FF; color: ${BRAND.primaryLight}; border-radius: 999px; padding: 2px 6px; font-size: 9px; font-weight: 900; }
        .static-note { margin-top: 14px; display: grid; grid-template-columns: 34% 1fr; gap: 12px; background: ${BRAND.primary}; color: white; border-radius: 8px; padding: 15px; }
        .static-note h3 { margin: 0 0 8px; color: ${BRAND.accent}; font-size: 15px; }
        .static-note p { margin: 0; font-size: 12px; line-height: 1.6; }
        .static-note li { margin-bottom: 5px; font-size: 11.5px; line-height: 1.5; }
        .detail-list table { font-size: 9.6px; }
        .radar-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; height: 165mm; }
        .radar-card { border-radius: 8px; border: 1px solid #E6E0D7; background: white; padding: 12px; min-height: 78mm; }
        .radar-card canvas { width: 100% !important; height: calc(100% - 22px) !important; }
        .radar-title { color: ${BRAND.primary}; font-size: 15px; font-weight: 900; margin-bottom: 6px; }
        .footnote { position: absolute; left: 16mm; right: 16mm; bottom: 9mm; color: ${BRAND.muted}; font-size: 10px; display: flex; justify-content: space-between; border-top: 1px solid #E6E0D7; padding-top: 8px; }
        @media print {
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page { margin: 0; box-shadow: none; page-break-after: always; }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>
      <button className="no-print print-btn" onClick={() => window.print()}>PDF 저장/인쇄</button>
      <section className="page cover">
        <div className="cover-left">
          <div>
            <div className="logo-mark">MR</div>
            <span className="tiny-label">METARICH SIGNAL GROUP</span>
            <h2 className="font-display-serif">정확한 분석,<br />신속한 청구</h2>
            <p style={{ color: 'rgba(255,255,255,.75)', lineHeight: 1.7, fontSize: 14 }}>
              현재 가입 현황과 권장 보장 기준을 비교해 보완이 필요한 담보를 한눈에 확인합니다.
            </p>
          </div>
          <div className="cover-meta">
            <div><span>고객명</span><strong>{customerName}</strong></div>
            <div><span>생년월일</span><strong>{birthDate}</strong></div>
            <div><span>상담일</span><strong>{todayStr}</strong></div>
          </div>
        </div>
        <div className="cover-right">
          <div style={{ color: BRAND.accent, fontWeight: 900, letterSpacing: '.08em', marginBottom: 12 }}>INSURANCE COVERAGE REPORT</div>
          <h1 className="font-display-serif">내 보험<br />보장분석 제안서</h1>
          <div className="cover-line" />
          <p style={{ width: 430, color: BRAND.muted, fontSize: 15, lineHeight: 1.75 }}>
            보험 현황, 보장별 부족 여부, 가입 담보 상세를 A4 가로 보고서 기준으로 정리했습니다.
          </p>
          <div className="advisor-box">
            <span style={{ color: BRAND.muted, fontWeight: 900, fontSize: 12 }}>담당 설계사</span>
            <b>{advisorName || '담당자 미확인'}</b>
            {advisorPhone && <p style={{ margin: '6px 0 0', color: BRAND.primaryLight, fontWeight: 800 }}>{advisorPhone}</p>}
          </div>
        </div>
      </section>
      <section className="page page-pad">
        <div className="page-head">
          <h2>보험 현황 요약</h2>
          <span>{customerName} 고객 · {todayStr} 기준</span>
        </div>
        <div className="summary-grid">
          <div className="panel">
            <h3>보험현황</h3>
            <div className="metric-grid">
              <div className="metric"><span>정상계약</span><b>{normalPolicies.length}건</b></div>
              <div className="metric"><span>실효·해지</span><b>{inactivePolicies}건</b></div>
              <div className="metric"><span>월 보험료</span><b>{formatWon(totalPremium)}</b></div>
            </div>
            <div className="donut-row">
              <Donut percent={paidPercent} />
              <div className="metric-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="metric"><span>총 납입 예정</span><b>{formatWon(plannedTotal)}</b></div>
                <div className="metric"><span>납입 완료</span><b>{formatWon(paidTotal)}</b></div>
              </div>
            </div>
          </div>
          <div className="panel">
            <h3>보유계약 리스트</h3>
            <table>
              <thead>
                <tr>
                  <th>회사명/상품명</th><th>보장기간</th><th>만기연령</th><th>납입기간</th><th>납입횟수</th><th>보험료</th><th>기납입/예정보험료</th>
                  {hasPaymentDay && <th>납입일</th>}{hasPaymentType && <th>납방법</th>}
                </tr>
              </thead>
              <tbody>
                {policies.map((policy, index) => {
                  const payCount = numberOf(policy, ['payment_count', 'paid_count']) || (policy.start_date ? Math.max(0, (new Date().getFullYear() - new Date(String(policy.start_date)).getFullYear()) * 12 + new Date().getMonth() - new Date(String(policy.start_date)).getMonth()) : 0)
                  const paid = numberOf(policy, ['paid_premium_total', 'total_paid_premium', 'paid_total'])
                  const expected = paid + numberOf(policy, ['remaining_premium_total', 'remaining_total'])
                  return (
                    <tr key={String(policy.id || index)}>
                      <td><b>{policy.company || '-'}</b><br />{policy.product_name || '-'}</td>
                      <td>{compactDate(policy.start_date)} ~ {policy.end_date ? compactDate(policy.end_date) : '종신'}</td>
                      <td>{(policy.end_age || policy.maturity_age) ? `${String(policy.end_age || policy.maturity_age)}세` : '-'}</td>
                      <td>{String(policy.payment_period || '-')}</td>
                      <td>{payCount ? `${payCount}회` : '-'}</td>
                      <td><b>{formatWon(money(policy.monthly_premium))}</b></td>
                      <td>{formatWon(paid)} / {formatWon(expected)}</td>
                      {hasPaymentDay && <td>{valueOf(policy, ['payment_day', 'payment_date', 'pay_day']) || '-'}</td>}
                      {hasPaymentType && <td>{valueOf(policy, ['payment_type', 'payment_method', 'payment_method_type']) || '-'}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="footnote"><span>메타리치 시그널그룹</span><span>실제 지급 여부는 보험사 약관과 심사 기준에 따라 달라질 수 있습니다.</span></div>
      </section>
      <section className="page page-pad">
        <div className="page-head">
          <h2>간편 보장분석 요약</h2>
          <span>정상계약 {normalPolicies.length}건 · 월보험료 {formatWon(totalPremium)}</span>
        </div>
        <div className="quick-top">
          <div className="metric"><span>미가입</span><b>{statusCounts.미가입}건</b></div>
          <div className="metric"><span>부족</span><b>{statusCounts.부족}건</b></div>
          <div className="metric"><span>충분</span><b>{statusCounts.충분}건</b></div>
          <div className="metric"><span>정상계약</span><b>{normalPolicies.length}건</b></div>
          <div className="metric"><span>월보험료</span><b>{formatWon(totalPremium)}</b></div>
        </div>
        <div className="quick-card-grid">
          {QUICK_SECTIONS.map((section) => (
            <div className="panel" key={section.title}>
              <h3>{section.title}</h3>
              {section.keys.map((key) => {
                const target = targetByKey(key)
                const amount = totals[key] || 0
                const status = getStatus(amount, target.recommend)
                return (
                  <div className="coverage-line" key={key}>
                    <b>{target.label}</b>
                    <span className={`badge ${statusClass(status)}`}>{status}</span>
                    <CoverageBar amount={amount} recommend={target.recommend} />
                    <span>{formatManwon(target.recommend, target.unit || '만원')}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="footnote"><span>메타리치 시그널그룹</span><span>권장금액 기준이며 실제 지급은 보험사 약관에 따릅니다.</span></div>
      </section>
      {CATEGORY_ORDER.map((category) => {
        const note = STATIC_NOTES[category]
        const categoryTargets = TARGETS.filter((target) => target.category === category)
        return (
          <section className="page page-pad" key={category}>
            <div className="page-head">
              <h2>{category} | 담보별 진단 현황</h2>
              <span>{customerName} 고객</span>
            </div>
            <div className="category-grid">
              {categoryTargets.map((target) => {
                const amount = totals[target.key] || 0
                const status = getStatus(amount, target.recommend)
                const matchedAll = enrichedCoverages.filter((coverage) => coverage.matchedTarget.key === target.key)
                return (
                  <div className={`coverage-card ${amount <= 0 ? 'empty' : ''}`} key={target.key}>
                    <div>
                      <div className="coverage-card-head">
                        <h4>{target.label}</h4>
                        <span className={`badge ${statusClass(status)}`}>{status}</span>
                      </div>
                      <div className="coverage-money">
                        <div><span>권장금액</span><b>{formatManwon(target.recommend, target.unit || '만원')}</b></div>
                        <div><span>가입금액</span><b>{formatManwon(amount)}</b></div>
                        <div><span>{amount > 0 && amount < target.recommend ? '부족금액' : amount >= target.recommend ? '초과달성' : '미가입'}</span><b>{amount > 0 && amount < target.recommend ? formatManwon(target.recommend - amount) : amount >= target.recommend ? '충족' : '-'}</b></div>
                      </div>
                      <CoverageBar amount={amount} recommend={target.recommend} />
                    </div>
                    <PolicyMiniList coverages={matchedAll} />
                  </div>
                )
              })}
            </div>
            <div className="static-note">
              <div>
                <h3>왜 필요한가</h3>
                <p>{note.lead}</p>
              </div>
              <ul>
                {note.rows.map((row) => <li key={row}>{row}</li>)}
              </ul>
            </div>
            <div className="footnote"><span>메타리치 시그널그룹</span><span>{customerName} 고객 · {todayStr} 기준</span></div>
          </section>
        )
      })}
      <section className="page page-pad detail-list">
        <div className="page-head">
          <h2>가입담보 상세 List</h2>
          <span>전체 가입 담보 {detailRows.length}개 · {todayStr} 기준</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>구분(보장종류)</th><th>회사명</th><th>상품명</th><th>담보명</th><th>가입금액</th><th>보험시기</th><th>보험종기</th><th>납입기간</th>
              {hasPaymentDay && <th>납입일</th>}{hasPaymentType && <th>납방법</th>}
            </tr>
          </thead>
          <tbody>
            {detailRows.map((coverage, index) => {
              const policy = coverage.policy || coverage
              const endDisplay = policy.end_age ? `${String(policy.end_age)}세` : policy.end_date ? compactDate(policy.end_date) : '종신'
              return (
                <tr key={String(coverage.id || index)}>
                  <td style={{ color: BRAND.primaryLight, fontWeight: 800 }}>{coverage.matchedTarget.category}</td>
                  <td><b>{coverage.company || policy.company || '-'}</b></td>
                  <td style={{ fontSize: 9 }}>{String(coverage.product_name || policy.product_name || '-').slice(0, 26)}</td>
                  <td><b>{coverage.name || coverage.matchedTarget.label}</b></td>
                  <td style={{ fontWeight: 800 }}>{formatManwon(coverage.normalizedAmount)}</td>
                  <td>{compactDate(policy.start_date)}</td>
                  <td>{endDisplay}</td>
                  <td>{String(policy.payment_period || '-')}</td>
                  {hasPaymentDay && <td>{valueOf(policy, ['payment_day', 'pay_day']) ? `${valueOf(policy, ['payment_day', 'pay_day'])}일` : '-'}</td>}
                  {hasPaymentType && <td>{valueOf(policy, ['payment_type', 'payment_method']) || '-'}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="footnote"><span>메타리치 시그널그룹</span><span>납입일·납방법은 DB 등록 내역 기준이며 미입력 시 표시되지 않습니다.</span></div>
      </section>
      <section className="page page-pad">
        <div className="page-head">
          <h2>레이더 차트 요약</h2>
          <span>가입금액 / 권장금액 비율, 100% 기준선 표시</span>
        </div>
        <div className="radar-grid">
          {RADAR_GROUPS.map((group) => (
            <RadarChart
              key={group.title}
              title={group.title}
              targets={group.keys.map(targetByKey)}
              totals={totals}
            />
          ))}
        </div>
        <div className="footnote"><span>메타리치 시그널그룹</span><span>파란 영역: 현재 가입률 · 빨간 점선: 권장 100% 기준</span></div>
      </section>
    </>
  )
}
