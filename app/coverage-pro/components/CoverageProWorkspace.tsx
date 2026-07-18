'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type {
  OutputConfig, ProContract, ProCoverage, ProCustomer, ProSession,
  RemodelProposal, StepNumber, StepStatus,
} from '../../../lib/coverageAnalysis/types'
import { createProSession, saveProSession } from '../../../lib/coverageAnalysis/session'
import { supabase } from '../../../lib/supabase'
import {
  inferClientRowKey,
  isCiProduct,
  isLifeInsCompany,
  silsonDefaultAmounts,
  CI_TRIGGER_ROW_KEYS,
} from '../../../lib/coverageAnalysis/clientMapping'
import { contractsForOutput } from '../../../lib/coverageAnalysis/outputContracts'
import ProSidebar from './ProSidebar'
import StepIndicator from './StepIndicator'
import CustomerSelector from './CustomerSelector'
import ContractList from './ContractList'
import CoverageGrid from './CoverageGrid'
import AnalysisChart from './AnalysisChart'
import RemodelComparison from './RemodelComparison'
import ExcelDownloadBtn from './ExcelDownloadBtn'
import PdfExportBtn from './PdfExportBtn'
import SessionList from './SessionList'
import BenchmarkSettings from './BenchmarkSettings'
import BenchmarkSummary from './BenchmarkSummary'
import UnmappedPanel from './UnmappedPanel'

const STORAGE_KEY   = 'coverage-pro-draft-session'
const SESSION_ID_KEY = 'coverage-pro-session-id'
const DEBOUNCE_MS   = 1500
const PROPOSAL_IMPORT_KEY = 'metarich_proposal_import_payload'

// ── PRO rowKey → CRM category 변환 ─────────────────────────────────────────
function rowKeyToCrmCategory(rowKey: string): string {
  if (rowKey.startsWith('cancer') || rowKey.startsWith('benign') || rowKey.startsWith('radiation') || rowKey.startsWith('chemo') || rowKey.startsWith('targeted')) return 'cancer'
  if (rowKey.startsWith('brain') || rowKey.startsWith('vascular')) return 'brain'
  if (rowKey.startsWith('heart')) return 'heart'
  if (rowKey.startsWith('surgery')) return 'surgery'
  if (rowKey.startsWith('silson') || rowKey.startsWith('indemnity') || rowKey.startsWith('hospital')) return 'hospitalization'
  if (rowKey.startsWith('nursing') || rowKey.startsWith('care')) return 'nursing'
  if (rowKey.startsWith('driver') || rowKey.startsWith('traffic')) return 'driver'
  if (rowKey.startsWith('death')) return 'death'
  if (rowKey.startsWith('disability')) return 'disability'
  if (rowKey.startsWith('ci') || rowKey.startsWith('dementia') || rowKey.startsWith('ltc')) return 'ci'
  return 'etc'
}

// ── PRO → CRM 동기화 (source_type='coverage_pro' 행만 교체) ─────────────────
// contractDate를 DB용 YYYY-MM-DD 형식으로 정규화
function parseContractDate(raw?: string): string {
  const today = new Date().toISOString().slice(0, 10)
  if (!raw) return today
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const m2 = raw.match(/^(\d{2})\.(\d{2})\.(\d{2})$/)
  if (m2) return `20${m2[1]}-${m2[2]}-${m2[3]}`
  const m4 = raw.match(/^(\d{4})\.(\d{2})\.(\d{2})$/)
  if (m4) return `${m4[1]}-${m4[2]}-${m4[3]}`
  return today
}

function nextAnniversary(dateText: string): string {
  const start = new Date(dateText)
  const today = new Date()
  if (Number.isNaN(start.getTime())) return today.toISOString().slice(0, 10)
  const next = new Date(today.getFullYear(), start.getMonth(), start.getDate())
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) next.setFullYear(next.getFullYear() + 1)
  return next.toISOString().slice(0, 10)
}

function maturityAge(paymentPeriod?: string): number | null {
  const match = String(paymentPeriod || '').match(/(\d{2,3})세\s*만기/)
  return match ? Number(match[1]) : null
}

async function syncProToCRM(customer: ProCustomer, contracts: ProContract[], createSavedNotification = false) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user.id) throw new Error('로그인 정보를 확인할 수 없습니다.')

  const advisorId = session.user.id
  const effectiveContracts = contractsForOutput(contracts)
    .filter((contract) => contract.company || contract.productName)
  if (effectiveContracts.length === 0) throw new Error('CRM에 저장할 계약이 없습니다.')

  const { data: existing, error: existingError } = await supabase
    .from('policies')
    .select('id')
    .eq('advisor_id', advisorId)
    .eq('customer_id', customer.id)
    .eq('source_type', 'coverage_pro')
  if (existingError) throw new Error(`기존 CRM 계약 조회 실패: ${existingError.message}`)

  const oldPolicyIds = (existing || []).map((policy: { id: string }) => policy.id)
  const newPolicyIds: string[] = []
  const warnings: string[] = []
  let newDatasetComplete = false

  try {
    for (const contract of effectiveContracts) {
      const isRenewal = Boolean(contract.isRenewal || contract.coverages.some((coverage) => coverage.isRenewal))
      const { data: policy, error: policyError } = await supabase.from('policies').insert({
        advisor_id: advisorId,
        customer_id: customer.id,
        company: contract.company || '보험사 미확인',
        product_name: contract.productName || '상품명 미확인',
        monthly_premium: Math.round(contract.monthlyPremium || 0),
        source_type: 'coverage_pro',
        policy_type: contract.policyType || 'protection',
        policy_status: contract.status || 'active',
        start_date: parseContractDate(contract.contractDate),
        payment_period: contract.paymentPeriod || null,
        maturity_age: maturityAge(contract.paymentPeriod),
        is_renewable: isRenewal,
      }).select('id').single()

      if (policyError || !policy?.id) {
        throw new Error(`[${contract.productName || contract.company}] 계약 저장 실패: ${policyError?.message || '계약 ID 없음'}`)
      }
      newPolicyIds.push(policy.id)

      const coverageRows = contract.coverages
        .filter((coverage) => Number(coverage.amount || 0) > 0)
        .map((coverage) => {
          const renewal = Boolean(coverage.isRenewal || contract.isRenewal)
          const condition = [
            coverage.rowKey && coverage.rowKey !== 'unknown' ? `rowKey:${coverage.rowKey}` : '',
            coverage.expiryDate ? `만기:${coverage.expiryDate}` : '',
          ].filter(Boolean).join('; ')
          return {
            advisor_id: advisorId,
            customer_id: customer.id,
            policy_id: policy.id,
            source_type: 'coverage_pro',
            company: contract.company || '보험사 미확인',
            product_name: contract.productName || '상품명 미확인',
            name: coverage.name || '담보명 미확인',
            amount: Math.round(Number(coverage.amount || 0) * 10000),
            category: rowKeyToCrmCategory(coverage.rowKey),
            condition,
            coverage_type: renewal ? '갱신형' : '확인필요',
            renewal_type: renewal ? '갱신형' : '확인필요',
          }
        })

      if (coverageRows.length > 0) {
        const { error: coverageError } = await supabase.from('coverages').insert(coverageRows)
        if (coverageError) throw new Error(`[${contract.productName || contract.company}] 담보 저장 실패: ${coverageError.message}`)
      }
    }

    newDatasetComplete = true

    // 새 데이터가 모두 저장된 뒤에만 이전 PRO 데이터를 제거한다.
    if (oldPolicyIds.length > 0) {
      const { error: oldCoverageError } = await supabase.from('coverages').delete().in('policy_id', oldPolicyIds)
      if (oldCoverageError) throw new Error(`이전 담보 정리 실패: ${oldCoverageError.message}`)
      const { error: oldPolicyError } = await supabase.from('policies').delete().in('id', oldPolicyIds)
      if (oldPolicyError) throw new Error(`이전 계약 정리 실패: ${oldPolicyError.message}`)
    }

    const actualContracts = contracts.filter((contract) => contract.id !== '__manual__')
    const monthlyPremium = actualContracts.reduce((sum, contract) => sum + Number(contract.monthlyPremium || 0), 0)
    const { error: customerError } = await supabase.from('customers').update({
      monthly_premium: Math.round(monthlyPremium),
      policy_count: actualContracts.length,
      updated_at: new Date().toISOString(),
    }).eq('id', customer.id).eq('advisor_id', advisorId)
    if (customerError) warnings.push(`고객 요약 갱신 실패: ${customerError.message}`)

    // PRO가 만든 갱신 알림만 새 계약 기준으로 교체한다.
    const { error: renewalDeleteError } = await supabase.from('notifications').delete().eq('customer_id', customer.id).eq('type', 'coverage_pro_renewal')
    if (renewalDeleteError) warnings.push(`기존 갱신 알림 정리 실패: ${renewalDeleteError.message}`)
    const renewalNotifications = effectiveContracts
      .filter((contract) => contract.isRenewal || contract.coverages.some((coverage) => coverage.isRenewal))
      .map((contract) => ({
        customer_id: customer.id,
        customer_name: customer.name,
        type: 'coverage_pro_renewal',
        title: '갱신형 보험 점검',
        message: `${contract.company} ${contract.productName} 갱신 조건과 보험료 변동을 확인하세요.`,
        due_date: nextAnniversary(parseContractDate(contract.contractDate)),
        is_done: false,
        is_read: false,
      }))
    if (renewalNotifications.length > 0) {
      const { error: renewalError } = await supabase.from('notifications').insert(renewalNotifications)
      if (renewalError) warnings.push(`갱신 알림 저장 실패: ${renewalError.message}`)
    }

    if (createSavedNotification) {
      const today = new Date().toISOString().slice(0, 10)
      const { data: savedToday, error: savedLookupError } = await supabase.from('notifications')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('type', 'coverage_pro_saved')
        .eq('due_date', today)
        .limit(1)
      if (savedLookupError) warnings.push(`저장 완료 알림 조회 실패: ${savedLookupError.message}`)
      if (!savedToday?.length) {
        const { error: savedError } = await supabase.from('notifications').insert({
          customer_id: customer.id,
          customer_name: customer.name,
          type: 'coverage_pro_saved',
          title: '보장분석 저장 완료',
          message: `${customer.name} 고객의 보장분석 ${actualContracts.length}건이 CRM에 저장되었습니다.`,
          due_date: today,
          is_done: false,
          is_read: false,
        })
        if (savedError) warnings.push(`저장 완료 알림 생성 실패: ${savedError.message}`)
      }
    }

    return {
      policyCount: effectiveContracts.length,
      coverageCount: effectiveContracts.reduce((sum, contract) => sum + contract.coverages.filter((coverage) => coverage.amount > 0).length, 0),
      warnings,
    }
  } catch (error) {
    // 새 삽입분만 되돌려 기존 CRM 데이터는 보존한다.
    if (!newDatasetComplete && newPolicyIds.length > 0) {
      await supabase.from('coverages').delete().in('policy_id', newPolicyIds)
      await supabase.from('policies').delete().in('id', newPolicyIds)
    }
    throw error
  }
}

const defaultProposal: RemodelProposal      = { addContracts: [], removeContractIds: [], memo: '' }
const defaultOutputConfig: OutputConfig     = { outputType: 'full_pdf', includeGraph: true, includeRemodel: true }

const ROW_TO_PROPOSAL_METRIC: Record<string, string> = {
  cancer_general: 'cancer',
  cancer_similar: 'minorCancer',
  brain_vascular: 'brain',
  brain_stroke: 'brain',
  brain_hemorrhage: 'brain',
  heart_vascular: 'heart',
  heart_ischemic: 'heart',
  heart_acute_mi: 'heart',
  surgery_injury: 'injurySurgery',
  surgery_injury_advanced: 'injurySurgery',
  surgery_injury_comprehensive: 'injurySurgery',
  surgery_injury_type: 'injurySurgery',
  surgery_disease: 'diseaseSurgery',
  surgery_disease_advanced: 'diseaseSurgery',
  surgery_disease_comprehensive: 'diseaseSurgery',
  surgery_disease_type: 'diseaseTypeSurgery',
  surgery_1_5: 'diseaseTypeSurgery',
  surgery_n_major: 'diseaseNSurgery',
  cancer_chemo: 'chemoDrug',
  cancer_radiation: 'chemoRadiation',
  cancer_targeted: 'targetDrug',
  cancer_hadron: 'heavyIon',
  cancer_davinci: 'robotCancerSurgery',
  cancer_major_benefit: 'cancerMajorTreatmentGeneral',
  cancer_major_nonbenefit: 'cancerMajorTreatmentNonCovered',
  vascular_major: 'twoMajorTreatmentComprehensive',
  nursing_hospital: 'care',
  nursing_care_hospital: 'care',
  nursing_integrated: 'care',
  other_liability: 'liability',
  driver_accident: 'trafficSupport',
  driver_lawyer: 'lawyer',
  driver_fine: 'finePerson',
  death_general: 'deathBenefit',
  death_disease: 'deathBenefit',
  death_injury: 'deathBenefit',
}

function inferProposalCategory(contracts: ProContract[]): 'driver' | 'health' {
  const coverages = contracts.flatMap((contract) => contract.coverages)
  const driverCount = coverages.filter((coverage) => coverage.rowKey.startsWith('driver_')).length
  return driverCount > 0 && driverCount >= coverages.length / 2 ? 'driver' : 'health'
}

function applyMetricValue(metrics: Record<string, string>, key: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return
  const prev = Number(metrics[key] || 0)
  metrics[key] = String(Math.max(prev, amount))
}

function contractToProposalPlan(contract: ProContract) {
  const metrics: Record<string, string> = {}
  const customCoverages = contract.coverages
    .map((coverage) => {
      const metricKey = ROW_TO_PROPOSAL_METRIC[coverage.rowKey]
      if (metricKey) {
        applyMetricValue(metrics, metricKey, Number(coverage.amount || 0))
        return null
      }
      if (!coverage.name || !coverage.amount || coverage.rowKey === 'unknown') return null
      return {
        name: coverage.name,
        amount: String(coverage.amount),
        note: '보장분석 PRO에서 가져온 추가 담보입니다.',
      }
    })
    .filter(Boolean)

  return {
    company: contract.company,
    productName: contract.productName,
    monthlyPremium: String(contract.monthlyPremium || ''),
    paymentYears: contract.paymentPeriod || '',
    coverageYears: contract.paymentPeriod || '',
    memo: '보장분석 PRO 리모델링 제안에서 가져온 상품입니다.',
    strengths: '부족 담보 보완 목적의 제안 상품입니다.',
    cautions: '최종 가입 전 갱신 여부와 세부 지급 조건은 약관으로 확인해야 합니다.',
    metrics,
    customCoverages,
  }
}

function aggregateContractsToProposalPlan(contracts: ProContract[]) {
  const metrics: Record<string, string> = {}
  const customCoverages: Array<{ name: string; amount: string; note: string }> = []

  contracts.forEach((contract) => {
    contract.coverages.forEach((coverage) => {
      const metricKey = ROW_TO_PROPOSAL_METRIC[coverage.rowKey]
      if (metricKey) {
        applyMetricValue(metrics, metricKey, Number(coverage.amount || 0))
      } else if (coverage.name && coverage.amount && coverage.rowKey !== 'unknown') {
        customCoverages.push({
          name: coverage.name,
          amount: String(coverage.amount),
          note: `${contract.company || '보험사 미확인'} 보유 담보`,
        })
      }
    })
  })

  return {
    company: '현재 보유계약',
    productName: '보장분석 PRO 결과 요약',
    monthlyPremium: String(contracts.reduce((sum, contract) => sum + Number(contract.monthlyPremium || 0), 0)),
    paymentYears: '',
    coverageYears: '',
    memo: '보장분석 PRO의 현재 보장 현황을 제안서 초안으로 가져왔습니다.',
    strengths: '현재 보유 담보를 기준으로 상담 설명을 시작할 수 있습니다.',
    cautions: '실제 제안 상품을 추가해 보험료와 담보 차이를 비교하세요.',
    metrics,
    customCoverages: customCoverages.slice(0, 12),
  }
}

function readDraft() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as {
      customer?: ProCustomer
      contracts?: ProContract[]
      stepStatus?: Partial<Record<StepNumber, StepStatus>>
      proposal?: RemodelProposal
      outputConfig?: OutputConfig
    } | null
  } catch { return null }
}

// ── 금액 파싱 헬퍼 (만원 단위로 정규화) ─────────────────────────────────
// ── 유틸 헬퍼 ─────────────────────────────────────────────────────────────
function formatWon(won: number): string {
  if (!won || won === 0) return '0원'
  if (won >= 10000) return `${(won / 10000).toFixed(won % 10000 === 0 ? 0 : 1)}만원`
  return `${won.toLocaleString('ko-KR')}원`
}

const STEP_TITLES: Record<number, string> = {
  1: 'STEP 1 — 고객 선택',
  2: 'STEP 2 — 기본 정보',
  3: 'STEP 3 — 현재 보험',
  4: 'STEP 4 — 보장 확인',
  5: 'STEP 5 — 분석 결과',
  6: 'STEP 6 — 리모델링',
  7: 'STEP 7 — 출력',
}
function titleByStep(step: number): string {
  return STEP_TITLES[step] ?? 'COVERAGE ANALYSIS PRO'
}

function getStepState(
  step: number,
  customer: ProCustomer | null,
  contracts: ProContract[],
): 'pending' | 'done' | 'warning' {
  if (step === 1) return customer ? 'done' : 'pending'
  if (step === 2) return customer ? 'done' : 'pending'
  if (step === 3) return contracts.length > 0 ? 'done' : 'pending'
  return 'pending'
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: '#10203a' }}>{value || '—'}</span>
    </div>
  )
}

// GPTs 출력이 "1억", "3억5000만", 30000(만원 숫자), "30000만원" 등 혼재할 수 있음
function parseAmountToMan(val: unknown): number {
  if (val === null || val === undefined) return 0

  // 숫자 타입: 그대로 만원으로 사용
  if (typeof val === 'number') {
    if (isNaN(val)) return 0
    // 방어: 억 단위로 잘못 들어온 경우 감지 (소수점이 있고 1~200 범위면 억 단위 의심)
    // 예: amount: 1.5 → 1억5천만원 → 15000만원
    if (val > 0 && val < 200 && !Number.isInteger(val)) {
      return Math.round(val * 10000)
    }
    return val
  }

  if (typeof val === 'string') {
    const s = val.trim().replace(/,/g, '').replace(/원$/, '').replace(/\s/g, '')
    if (!s) return 0

    // 억 단위 포함: "1억", "3억5000만", "3억5천만", "1억5백만"
    const eokRegex = /^(\d+\.?\d*)억/
    const eokMatch = s.match(eokRegex)
    if (eokMatch) {
      const eok = parseFloat(eokMatch[1]) * 10000
      // 억 뒤에 만원 단위 있는지 확인: "3억5000만" → 5000
      const manAfterEok = s.match(/억(\d+)만/)
      const man = manAfterEok ? parseInt(manAfterEok[1]) : 0
      return Math.round(eok + man)
    }

    // 만 단위: "5000만", "100만"
    const manMatch = s.match(/^(\d+\.?\d*)만/)
    if (manMatch) return Math.round(parseFloat(manMatch[1]))

    // 일반 숫자 문자열
    const num = parseFloat(s)
    return isNaN(num) ? 0 : num
  }

  return 0
}

// ── GPTs JSON 파서 ──────────────────────────────────────────────────────
// coverage_summary 키 → rowKey 매핑
function parsePremiumToWon(val: unknown): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val <= 0) return 0
    return val >= 1000 ? Math.round(val) : Math.round(val * 10000)
  }
  const compact = String(val).trim().replace(/,/g, '').replace(/\s/g, '')
  if (!compact) return 0
  const eokMatch = compact.match(/^(\d+(?:\.\d+)?)억/)
  if (eokMatch) return Math.round(Number(eokMatch[1]) * 100000000)
  const manMatch = compact.match(/^(\d+(?:\.\d+)?)만/)
  if (manMatch) return Math.round(Number(manMatch[1]) * 10000)
  const num = Number(compact.replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(num) || num <= 0) return 0
  return num >= 1000 ? Math.round(num) : Math.round(num * 10000)
}

function parseRenewalFlag(...values: unknown[]): boolean {
  const text = values.map((value) => String(value ?? '')).join(' ').toLowerCase()
  if (!text.trim()) return false
  if (text.includes('비갱신') || text.includes('nonrenewal') || text.includes('non-renewal')) return false
  return text.includes('갱신') || text.includes('renewal')
}

function buildPaymentPeriod(item: Record<string, unknown>): string {
  const payment = String(item.payment_period ?? item.paymentPeriod ?? item['납입기간'] ?? '').trim()
  const coverage = String(
    item.coverage_period ??
    item.coveragePeriod ??
    item.expiry_date ??
    item.expiryDate ??
    item.end_date ??
    item.endDate ??
    item['보장기간'] ??
    item['만기'] ??
    ''
  ).trim()
  if (payment && coverage && !payment.includes(coverage)) return `${payment}/${coverage}`
  return payment || coverage
}

interface NormCtx {
  productName: string
  insurer: string
  policyDate: string
}

function normalizeCoverageRows(
  cov: Record<string, unknown>,
  idx: number,
  ci: number,
  ctx?: NormCtx,
): ProCoverage[] {
  const name = String(cov.coverage_name ?? cov.name ?? cov['담보명'] ?? '')
  const explicitRowKey = String(cov.row_key ?? cov.rowKey ?? '')
  const amount = parseAmountToMan(cov.amount ?? cov['가입금액'] ?? 0)
  const expiryDate = String(cov.end_date ?? cov.endDate ?? cov.expiry_date ?? cov.expiryDate ?? cov.coverage_period ?? cov.coveragePeriod ?? cov['만기'] ?? cov['보장기간'] ?? '')
  const isRenewal = Boolean(cov.isRenewal ?? false) || parseRenewalFlag(cov.coverage_type, cov.renewal_type, cov.renewalType, cov['갱신여부'])
  const normalizedName = name.replace(/\s+/g, '').toLowerCase()

  // ── 실손의료비 통합명 → 4개 silson rowKey 분리 ─────────────────────────
  const isGenericSilson =
    !explicitRowKey &&
    (normalizedName === '실손의료비' ||
      normalizedName === '실손보험' ||
      normalizedName === '실손' ||
      normalizedName.includes('실손의료비'))

  if (isGenericSilson) {
    // 세대별 기본값 계산 (계약일 + 보험사 기준)
    const defaults = ctx
      ? silsonDefaultAmounts(ctx.policyDate, ctx.insurer)
      : { inpatient: 5000, outpatient: 25 }
    const inpatientAmount = amount || defaults.inpatient
    const outpatientAmount = Number(cov.outpatient_amount ?? cov.outpatientAmount ?? 0) || defaults.outpatient
    return [
      ['silson_disease_inpatient', `${name || '실손의료비'}(질병 입원)`, inpatientAmount],
      ['silson_disease_outpatient', `${name || '실손의료비'}(질병 통원)`, outpatientAmount],
      ['silson_injury_inpatient', `${name || '실손의료비'}(상해 입원)`, inpatientAmount],
      ['silson_injury_outpatient', `${name || '실손의료비'}(상해 통원)`, outpatientAmount],
    ].map(([rowKey, rowName, rowAmount], offset) => ({
      id: `json-cov-${idx}-${ci}-${offset}`,
      contractId: '',
      rowKey: String(rowKey),
      name: String(rowName),
      amount: Number(rowAmount),
      expiryDate,
      isRenewal,
    }))
  }

  // ── 일반 담보 rowKey 추론 ─────────────────────────────────────────────
  let rowKey = (explicitRowKey && explicitRowKey !== 'unknown')
    ? explicitRowKey
    : (inferClientRowKey(name) ?? 'unknown')

  // ── CI 보험 컨텍스트: 암/뇌/심장 진단비 → ci_diagnosis 로 리매핑 ────
  // CI 보험(교보큰사랑플러스CI 등)의 주요 트리거 담보는
  // 일반 진단비 집계에서 분리해 CI 보험금으로 별도 표시
  if (ctx && isCiProduct(ctx.productName) && CI_TRIGGER_ROW_KEYS.has(rowKey)) {
    rowKey = 'ci_diagnosis'
  }

  return [{
    id: `json-cov-${idx}-${ci}`,
    contractId: '',
    rowKey,
    name,
    amount,
    expiryDate,
    isRenewal,
  }]
}

const SUMMARY_KEY_TO_ROW: Record<string, string> = {
  cancer: 'cancer_general',
  high_value_cancer: 'cancer_high_value',
  similar_cancer: 'cancer_similar',
  cancer_chemo: 'cancer_chemo',
  cancer_targeted: 'cancer_targeted',
  cancer_major: 'cancer_major_nonbenefit',
  cancer_major_benefit: 'cancer_major_benefit',
  cancer_major_nonbenefit: 'cancer_major_nonbenefit',
  cancer_major_treatment: 'cancer_major_nonbenefit',
  brain_vascular: 'brain_vascular',
  brain_stroke: 'brain_stroke',
  brain_hemorrhage: 'brain_hemorrhage',
  brain_surgery: 'two_major_surgery',
  heart_mi: 'heart_acute_mi',
  ischemic_heart: 'heart_ischemic',
  heart_vascular: 'heart_vascular',
  arrhythmia: 'heart_vascular',
  benign_tumor: 'benign_tumor',
  heart_surgery: 'two_major_surgery',
  major_treatment: 'vascular_major',
  disease_surgery: 'surgery_disease',
  injury_surgery: 'surgery_injury',
  disease_advanced_surgery: 'surgery_disease_advanced',
  disease_comprehensive_surgery: 'surgery_disease_comprehensive',
  disease_type_surgery: 'surgery_disease_type',
  injury_advanced_surgery: 'surgery_injury_advanced',
  injury_comprehensive_surgery: 'surgery_injury_comprehensive',
  injury_type_surgery: 'surgery_injury_type',
  disease_hosp_daily: 'hospital_disease_daily',
  injury_hosp_daily: 'hospital_injury_daily',
  disease_single_room_daily: 'hospital_disease_single_room',
  injury_single_room_daily: 'hospital_injury_single_room',
  nursing_daily: 'nursing_hospital',
  nursing_injury: 'nursing_integrated',
  driver_fine: 'driver_fine',
  driver_lawyer: 'driver_lawyer',
  driver_accident: 'driver_accident',
  disability_disease_80: 'disability_disease_80',
  disability_disease: 'disability_disease',
  disability_injury_80: 'disability_injury_80',
  disability_injury: 'disability_injury',
  death_general: 'death_general',
  death_disease: 'death_disease',
  death_injury: 'death_injury',
  general_death: 'death_general',
  disease_death: 'death_disease',
  injury_death: 'death_injury',
  accident_death: 'death_injury',
  disaster_death: 'death_injury',
  실손의료비: 'silson_disease_inpatient',
  암진단비: 'cancer_general',
  고액암진단비: 'cancer_high_value',
  유사암진단비: 'cancer_similar',
  항암치료비: 'cancer_chemo',
  고액항암치료비: 'cancer_chemo',
  암주요치료비: 'cancer_major_nonbenefit',
  암주요치료비급여: 'cancer_major_benefit',
  암주요치료비비급여: 'cancer_major_nonbenefit',
  암수술비: 'cancer_surgery',
  뇌혈관질환진단비: 'brain_vascular',
  뇌졸중진단비: 'brain_stroke',
  뇌출혈진단비: 'brain_hemorrhage',
  허혈성심장질환진단비: 'heart_ischemic',
  급성심근경색진단비: 'heart_acute_mi',
  심장질환진단비: 'heart_vascular',
  심혈관질환진단비: 'heart_vascular',
  부정맥진단비: 'heart_vascular',
  부정맥: 'heart_vascular',
  양성종양담보: 'benign_tumor',
  양성종양진단비: 'benign_tumor',
  양성종양: 'benign_tumor',
  양성신생물: 'benign_tumor',
  질병수술비: 'surgery_disease',
  상해수술비: 'surgery_injury',
  질병일반수술비: 'surgery_disease',
  상해일반수술비: 'surgery_injury',
  질병상급수술비: 'surgery_disease_advanced',
  질병상급수술: 'surgery_disease_advanced',
  질병종합수술비: 'surgery_disease_comprehensive',
  질병종합수술: 'surgery_disease_comprehensive',
  질병종수술비: 'surgery_disease_type',
  질병1종수술비: 'surgery_disease_advanced',
  질병2종수술비: 'surgery_disease_advanced',
  질병3종수술비: 'surgery_disease_comprehensive',
  질병4종수술비: 'surgery_disease_comprehensive',
  질병5종수술비: 'surgery_disease_comprehensive',
  질병1_5종수술비: 'surgery_disease_type',
  '질병1~5종수술비': 'surgery_disease_type',
  '질병1-5종수술비': 'surgery_disease_type',
  질병N대수술비: 'surgery_n_major',
  질병111대수술비: 'surgery_n_major',
  질병119대수술비: 'surgery_n_major',
  질병64대수술비: 'surgery_n_major',
  상해상급수술비: 'surgery_injury_advanced',
  상해상급수술: 'surgery_injury_advanced',
  상해종합수술비: 'surgery_injury_comprehensive',
  상해종합수술: 'surgery_injury_comprehensive',
  상해종수술비: 'surgery_injury_type',
  상해1종수술비: 'surgery_injury_advanced',
  상해2종수술비: 'surgery_injury_advanced',
  상해3종수술비: 'surgery_injury_comprehensive',
  상해4종수술비: 'surgery_injury_comprehensive',
  상해5종수술비: 'surgery_injury_comprehensive',
  상해1_5종수술비: 'surgery_injury_type',
  '상해1~5종수술비': 'surgery_injury_type',
  '상해1-5종수술비': 'surgery_injury_type',
  질병입원일당: 'hospital_disease_daily',
  상해입원일당: 'hospital_injury_daily',
  질병1인실입원일당: 'hospital_disease_single_room',
  상해1인실입원일당: 'hospital_injury_single_room',
  간병인사용입원일당: 'nursing_hospital',
  교통사고처리지원금: 'driver_accident',
  변호사선임비용: 'driver_lawyer',
  벌금: 'driver_fine',
  가족일상생활배상책임: 'other_liability',
  일상생활배상책임: 'other_liability',
  상해사망: 'death_injury',
  재해사망: 'death_injury',
  사고사망: 'death_injury',
  교통재해사망: 'death_injury',
  질병사망: 'death_disease',
  암사망: 'death_disease',
  일반사망: 'death_general',
  사망보험금: 'death_general',
  일반사망보험금: 'death_general',
  질병사망보험금: 'death_disease',
  상해사망보험금: 'death_injury',
  재해사망보험금: 'death_injury',
  중대질병CI진단비: 'ci_diagnosis',
  '중대질병(CI)진단비': 'ci_diagnosis',
}

function normalizeSummaryKey(key: string): string {
  return key.replace(/[\s/_()·,.-]/g, '').toLowerCase()
}

function summaryKeyToRowKey(key: string): string | undefined {
  if (SUMMARY_KEY_TO_ROW[key]) return SUMMARY_KEY_TO_ROW[key]
  const compact = normalizeSummaryKey(key)
  const entry = Object.entries(SUMMARY_KEY_TO_ROW).find(([summaryKey]) => normalizeSummaryKey(summaryKey) === compact)
  return entry?.[1] || inferClientRowKey(key)
}

function buildSummaryCoverages(summary: Record<string, unknown>, idPrefix = 'sum'): ProCoverage[] {
  const coverages: ProCoverage[] = []
  Object.entries(summary).forEach(([key, value], ci) => {
    const rowKey = summaryKeyToRowKey(key)
    const amount = parseAmountToMan(value)
    if (!rowKey || amount <= 0) return
    coverages.push({
      id: `${idPrefix}-cov-${ci}`,
      contractId: idPrefix,
      rowKey,
      name: key,
      amount,
      isRenewal: false,
    })
  })
  return coverages
}

function parsePolicyType(val: unknown): 'protection' | 'savings' {
  const s = String(val ?? '').toLowerCase()
  return s === 'savings' || s.includes('savings') || s.includes('저축') ? 'savings' : 'protection'
}

// 붙여 넣은 텍스트에서 가장 바깥쪽 JSON 오브젝트/배열 추출
function extractJson(raw: string): string {
  // 중괄호 기준 첫 { 위치 찾기
  const start = raw.indexOf('{')
  const startArr = raw.indexOf('[')
  if (start === -1 && startArr === -1) return raw
  if (startArr !== -1 && (start === -1 || startArr < start)) {
    // 배열로 시작
    const last = raw.lastIndexOf(']')
    return last !== -1 ? raw.slice(startArr, last + 1) : raw
  }
  const last = raw.lastIndexOf('}')
  return last !== -1 ? raw.slice(start, last + 1) : raw
}

function sanitizeGptsJsonText(raw: string): string {
  return raw
    .replace(/\\_/g, '_')
    .replace(/\\\*/g, '*')
}

function parseJsonObject(raw: string): any {
  const cleaned = sanitizeGptsJsonText(extractJson(raw.trim()))
  return JSON.parse(cleaned)
}

// ── GPTs 데이터 품질 검사 ─────────────────────────────────────────────────
// coverage_summary(GPTs 요약)와 policies[].coverages 합계를 비교해 누락 경고 생성
function analyzeGptsDataQuality(raw: string, contracts: ProContract[]): string[] {
  const warnings: string[] = []
  try {
    const parsed = parseJsonObject(raw)
    const summary = parsed.coverage_summary as Record<string, unknown> | undefined
    if (!summary || typeof summary !== 'object') return []

    // policies[].coverages에서 담보명별 합계 계산
    const computed: Record<string, number> = {}
    for (const contract of contracts) {
      for (const cov of contract.coverages) {
        if (!cov.name || !cov.amount) continue
        computed[cov.name] = (computed[cov.name] || 0) + Number(cov.amount)
      }
    }

    // coverage_summary vs 실제 합계 비교 (100만원 초과 차이만 경고)
    for (const [key, rawVal] of Object.entries(summary)) {
      const summaryAmt = parseAmountToMan(rawVal)
      if (summaryAmt <= 0) continue
      const computedAmt = computed[key] || 0
      const diff = summaryAmt - computedAmt
      if (diff > 100) {
        warnings.push(
          `${key}: 계약 합계 ${computedAmt.toLocaleString()}만 / GPTs 요약 ${summaryAmt.toLocaleString()}만 → ${diff.toLocaleString()}만 누락 가능`
        )
      }
    }

    // 담보가 극히 적은 계약 감지 (운전자·정기보험·간편보험 제외)
    for (const contract of contracts) {
      const pn = contract.productName
      const isDriverOrTerm = /운전자|차도리|정기보험|ECO/.test(pn)
      const isSimple = /간편/.test(pn)
      if (!isDriverOrTerm && !isSimple && contract.coverages.length <= 2) {
        warnings.push(
          `"${contract.company} ${contract.productName}" 담보 ${contract.coverages.length}개만 추출됨 — 누락 가능성 높음`
        )
      }
    }
  } catch { /* ignore */ }
  return warnings
}

// ── 배치 출력 파트 감지 (output_part: "1/2" | "2/2") ──────────────────────
function detectBatchPart(raw: string): '1/2' | '2/2' | null {
  try {
    const parsed = parseJsonObject(raw)
    const part = String(parsed.output_part ?? '')
    if (part === '1/2') return '1/2'
    if (part === '2/2') return '2/2'
    return null
  } catch { return null }
}

function parseGptsJson(raw: string): ProContract[] | null {
  try {
    const parsed = parseJsonObject(raw)

    // ── v5 포맷 또는 policies 배열 감지 ─────────────────────────────────
    const isV5 = parsed.version === 'insurance_analysis_v5' || parsed.version?.startsWith('insurance_analysis')
    if ((isV5 || Array.isArray(parsed.policies)) && Array.isArray(parsed.policies)) {
      if (parsed.policies.length === 0) return null
      const contracts: ProContract[] = parsed.policies.map((item: Record<string, unknown>, idx: number) => {
        const normCtx: NormCtx = {
          productName: String(item.product_name ?? item.productName ?? item['상품명'] ?? ''),
          insurer: String(item.insurer ?? item.company ?? item['보험사'] ?? ''),
          policyDate: String(item.policy_date ?? item.start_date ?? item.contractDate ?? item['계약일'] ?? ''),
        }
        const coverages = Array.isArray(item.coverages)
          ? (item.coverages as Array<Record<string, unknown>>).flatMap((cov, ci) => normalizeCoverageRows(cov, idx, ci, normCtx))
          : []
        const isRenewal = Boolean(item.isRenewal ?? false) || parseRenewalFlag(item.renewal_type, item.renewalType, item.policy_type, item.policyType, item['갱신여부'])
        return {
          id: `json-${idx}-${Date.now()}`,
          company: String(item.insurer ?? item.company ?? item['보험사'] ?? ''),
          productName: String(item.product_name ?? item.productName ?? item['상품명'] ?? ''),
          policyHolder: String(item.policyHolder ?? item['계약자'] ?? ''),
          contractDate: String(item.policy_date ?? item.start_date ?? item.contractDate ?? item['계약일'] ?? ''),
          paymentPeriod: buildPaymentPeriod(item),
          monthlyPremium: parsePremiumToWon(item.premium ?? item.monthly_premium ?? item.monthlyPremium ?? item['월보험료'] ?? 0),
          isRenewal,
          status: (['active','lapsed','expired'].includes(String(item.policy_status)) ? item.policy_status : 'active') as 'active' | 'lapsed' | 'expired',
          policyType: parsePolicyType(item.policy_type ?? item.policyType),
          coverages,
        }
      })
      const coverageCount = contracts.reduce((sum: number, contract: ProContract) => sum + contract.coverages.length, 0)
      const summary = parsed.coverage_summary as Record<string, unknown> | undefined
      if (coverageCount === 0 && summary && typeof summary === 'object') {
        const summaryCoverages = buildSummaryCoverages(summary, 'summary-fallback')
        if (summaryCoverages.length > 0) {
          contracts.push({
            id: `summary-fallback-${Date.now()}`,
            company: '요약',
            productName: '통합 보장 요약',
            policyHolder: String(parsed.customer?.name ?? ''),
            monthlyPremium: 0,
            status: 'active' as const,
            policyType: 'protection' as const,
            coverages: summaryCoverages,
          })
        }
      }
      return contracts
    }

    // ── coverage_summary 포맷: 단일 계약 요약 ────────────────────────────
    const summary = parsed.coverage_summary as Record<string, unknown> | undefined
    if (summary && typeof summary === 'object') {
      const company = String(parsed.insurer ?? parsed.company ?? parsed['보험사'] ?? '')
      const productName = String(parsed.product_name ?? parsed.productName ?? parsed['상품명'] ?? '')
      const premium = parsePremiumToWon(parsed.premium ?? parsed.monthly_premium ?? parsed.monthlyPremium ?? 0)
      const coverages = buildSummaryCoverages(summary, 'summary')
      if (coverages.length === 0) return null
      return [{
        id: `sum-${Date.now()}`,
        company: company || '확인불가',
        productName: productName || '통합보장',
        monthlyPremium: premium,
        status: 'active' as const,
        policyType: 'protection' as const,
        coverages,
      }]
    }

    // ── 레거시: 배열 또는 { contracts: [...] } ───────────────────────────
    const arr = Array.isArray(parsed) ? parsed : parsed.contracts ?? parsed.data ?? []
    if (!Array.isArray(arr) || arr.length === 0) return null
    return arr.map((item: Record<string, unknown>, idx: number) => {
      const normCtx: NormCtx = {
        productName: String(item.product_name ?? item.productName ?? item['상품명'] ?? ''),
        insurer: String(item.insurer ?? item.company ?? item['보험사'] ?? ''),
        policyDate: String(item.policy_date ?? item.contractDate ?? item['계약일'] ?? ''),
      }
      const coverages = Array.isArray(item.coverages)
        ? (item.coverages as Array<Record<string, unknown>>).flatMap((cov, ci) => normalizeCoverageRows(cov, idx, ci, normCtx))
        : []
      return {
        id: `json-${idx}-${Date.now()}`,
        company: String(item.insurer ?? item.company ?? item['보험사'] ?? ''),
        productName: String(item.product_name ?? item.productName ?? item['상품명'] ?? ''),
        policyHolder: String(item.policyHolder ?? item['계약자'] ?? ''),
        contractDate: String(item.policy_date ?? item.contractDate ?? item['계약일'] ?? ''),
        paymentPeriod: buildPaymentPeriod(item),
        monthlyPremium: parsePremiumToWon(item.premium ?? item.monthly_premium ?? item.monthlyPremium ?? item['월보험료'] ?? 0),
        isRenewal: Boolean(item.isRenewal ?? false) || parseRenewalFlag(item.renewal_type, item.renewalType, item.policy_type, item.policyType, item['갱신여부']),
        status: 'active' as const,
        policyType: parsePolicyType(item.policy_type ?? item.policyType),
        coverages,
      }
    })
  } catch { return null }
}

export default function CoverageProWorkspace({ initialStep = 1 }: { initialStep?: StepNumber }) {
  const searchParams = useSearchParams()
  const requestedCustomerId = searchParams.get('customerId') || ''
  const draft = useMemo(() => readDraft(), [])

  const [currentStep,  setCurrentStep]  = useState<StepNumber>(initialStep)
  const [customer,     setCustomer]     = useState<ProCustomer | undefined>(() => draft?.customer)
  const [contracts,    setContracts]    = useState<ProContract[]>(() => draft?.contracts || [])
  const [stepStatus,   setStepStatus]   = useState<Partial<Record<StepNumber, StepStatus>>>(
    () => draft?.stepStatus || { 1: requestedCustomerId ? 'warning' : 'pending' }
  )
  const [proposal,     setProposal]     = useState<RemodelProposal>(() => draft?.proposal || defaultProposal)
  const [outputConfig, setOutputConfig] = useState<OutputConfig>(() => draft?.outputConfig || defaultOutputConfig)
  const [saveStatus,   setSaveStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [crmSyncStatus, setCrmSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const [crmSyncMessage, setCrmSyncMessage] = useState('')
  const [advisorInfo, setAdvisorInfo]   = useState<{ name: string; phone: string; userId: string }>({ name: '', phone: '', userId: '' })

  // ── 기준금액 설정 모달 ──────────────────────────────────────────────
  const [showBenchmark, setShowBenchmark] = useState(false)

  // ── 신규 고객 등록 폼 상태 ──────────────────────────────────────────
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCust, setNewCust] = useState({ name: '', phone: '', birth: '', gender: 'M' as 'M' | 'F' })
  const [newCustSaving, setNewCustSaving] = useState(false)

  // ── JSON 붙여넣기 상태 ───────────────────────────────────────────────
  const [showJsonPaste, setShowJsonPaste] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [batchPhase, setBatchPhase] = useState<'idle' | 'waiting_2nd'>('idle')
  const [jsonWarnings, setJsonWarnings] = useState<string[]>([])

  const sessionRef   = useRef<ProSession | null>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef   = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(SESSION_ID_KEY) : null
      if (savedId) {
        // DB에서 세션 유효성 확인 (stale localStorage ID 방지)
        const { data: existingRow } = await supabase
          .from('coverage_pro_sessions')
          .select('id')
          .eq('id', savedId)
          .eq('advisor_id', session.user.id)
          .maybeSingle()
        if (existingRow) {
          const now = new Date().toISOString()
          sessionRef.current = {
            id: savedId, advisorId: session.user.id,
            customerId: draft?.customer?.id, customerSnapshot: draft?.customer,
            contracts: draft?.contracts || [], currentStep: initialStep,
            stepStatus: draft?.stepStatus || {}, remodelProposal: draft?.proposal,
            outputConfig: draft?.outputConfig, version: 1, createdAt: now, updatedAt: now,
          }
        } else {
          // 스탈 세션 ID → 제거 후 새로 생성
          localStorage.removeItem(SESSION_ID_KEY)
          const newFromStale = await createProSession(session.user.id, draft?.customer?.id)
          if (newFromStale) { sessionRef.current = newFromStale; localStorage.setItem(SESSION_ID_KEY, newFromStale.id) }
        }
        // 설계사 프로필 로드 (savedId 분기)
        const { data: profile2 } = await supabase.from('users').select('name,phone').eq('id', session.user.id).maybeSingle()
        setAdvisorInfo({ name: (profile2 as { name?: string; phone?: string } | null)?.name || '', phone: (profile2 as { name?: string; phone?: string } | null)?.phone || '', userId: session.user.id })
        return
      }
      const newSession = await createProSession(session.user.id, draft?.customer?.id)
      if (newSession) { sessionRef.current = newSession; localStorage.setItem(SESSION_ID_KEY, newSession.id) }
      // 설계사 프로필 로드
      const { data: profile } = await supabase.from('users').select('name,phone').eq('id', session.user.id).maybeSingle()
      setAdvisorInfo({ name: (profile as { name?: string; phone?: string } | null)?.name || '', phone: (profile as { name?: string; phone?: string } | null)?.phone || '', userId: session.user.id })
    }
    void init()
  }, [draft, initialStep])

  const persistState = useCallback((
    nextCustomer: ProCustomer | undefined, nextContracts: ProContract[],
    nextStepStatus: Partial<Record<StepNumber, StepStatus>>,
    nextProposal: RemodelProposal, nextOutputConfig: OutputConfig, nextCurrentStep: StepNumber,
  ) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      customer: nextCustomer, contracts: nextContracts,
      stepStatus: nextStepStatus, proposal: nextProposal, outputConfig: nextOutputConfig,
    }))
    if (!sessionRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    window.setTimeout(() => setSaveStatus('saving'), 0)
    debounceRef.current = setTimeout(async () => {
      if (!sessionRef.current) return
      const updated: ProSession = {
        ...sessionRef.current, customerSnapshot: nextCustomer, customerId: nextCustomer?.id,
        contracts: nextContracts, currentStep: nextCurrentStep, stepStatus: nextStepStatus,
        remodelProposal: nextProposal, outputConfig: nextOutputConfig, updatedAt: new Date().toISOString(),
      }
      sessionRef.current = updated
      const ok = await saveProSession(updated)
      setSaveStatus(ok ? 'saved' : 'error')
      if (ok) {
        setTimeout(() => setSaveStatus('idle'), 2000)
        // PRO → CRM 자동 동기화
        if (updated.customerSnapshot?.id && nextContracts.length > 0 && nextCurrentStep === 7) {
          void syncProToCRM(updated.customerSnapshot, nextContracts).catch((error) => {
            setCrmSyncStatus('error')
            setCrmSyncMessage(error instanceof Error ? error.message : 'CRM 자동 저장에 실패했습니다.')
          })
        }
      }
    }, DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    persistState(customer, contracts, stepStatus, proposal, outputConfig, currentStep)
  }, [customer, contracts, currentStep, outputConfig, persistState, proposal, stepStatus])

  const stats = useMemo(() => {
    const premium      = contracts.reduce((sum, c) => sum + Number(c.monthlyPremium || 0), 0)
    const coverageCount = contracts.reduce((sum, c) => sum + c.coverages.length, 0)
    const mapped       = contracts.flatMap((c) => c.coverages).filter((cov) => cov.rowKey !== 'unknown').length
    return { premium, coverageCount, mapped }
  }, [contracts])

  const moveStep = (step: StepNumber) => {
    setCurrentStep(step)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/coverage-pro/local/step-${step}`)
    }
  }

  const nextStep = () => {
    const next = Math.min(7, currentStep + 1) as StepNumber
    setStepStatus((prev) => ({
      ...prev,
      [currentStep]: getStepState(currentStep, customer ?? null, contracts),
      [next]: prev[next] || 'pending',
    }))
    moveStep(next)
  }

  const handleLoaded = (payload: { customer: ProCustomer; contracts: ProContract[] }) => {
    setCustomer(payload.customer)
    setContracts(payload.contracts)
    setStepStatus((prev) => ({
      ...prev, 1: 'done', 2: 'done',
      3: payload.contracts.length ? 'done' : 'warning', 4: 'pending',
    }))
  }

  const startWithoutCustomer = () => {
    setCustomer(undefined); setContracts([])
    setStepStatus((prev) => ({ ...prev, 1: 'warning', 2: 'pending' }))
    moveStep(2)
  }

  const handleSessionSelect = (session: ProSession) => {
    sessionRef.current = session
    localStorage.setItem(SESSION_ID_KEY, session.id)
    setCustomer(session.customerSnapshot)
    setContracts(session.contracts ?? [])
    setStepStatus(session.stepStatus ?? {})
    setProposal(session.remodelProposal ?? defaultProposal)
    setOutputConfig(session.outputConfig ?? defaultOutputConfig)
    moveStep(session.currentStep)
  }

  // ── 신규고객 Supabase 저장 ──────────────────────────────────────────
  const handleSaveNewCustomer = async () => {
    if (!newCust.name.trim()) { alert('고객명을 입력해주세요.'); return }
    setNewCustSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { alert('로그인이 필요합니다.'); return }
      const { data, error } = await supabase.from('customers').insert({
        name: newCust.name.trim(), phone: newCust.phone.trim() || null,
        birth_date: newCust.birth || null, gender: newCust.gender,
        advisor_id: session.user.id,
      }).select('*').single()
      if (error) throw error
      const proCustomer: ProCustomer = {
        id: data.id, name: data.name, phone: data.phone ?? '',
        birth: data.birth_date ?? '', gender: data.gender ?? 'M',
        advisorId: session.user.id,
      }
      setCustomer(proCustomer)
      setStepStatus((prev) => ({ ...prev, 1: 'done', 2: 'pending' }))
      setNewCust({ name: '', phone: '', birth: '', gender: 'M' })
      setShowNewCustomer(false)
    } catch (err: unknown) {
      console.error('[handleSaveNewCustomer]', err)
      const msg = (err instanceof Error ? err.message : '') || (typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : '')
      alert('고객 등록에 실패했습니다.' + (msg ? `\n(${msg})` : ' 잠시 후 다시 시도해주세요.'))
    } finally {
      setNewCustSaving(false)
    }
  }

  // ── 세션 초기화 (새 분석 시작) ──────────────────────────────────────
  const handleReset = useCallback(async () => {
    const confirmed = window.confirm('현재 분석 내용이 모두 초기화됩니다.\n새 분석을 시작하시겠습니까?')
    if (!confirmed) return

    // localStorage 클리어
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SESSION_ID_KEY)

    // 상태 초기화
    setCustomer(undefined)
    setContracts([])
    setStepStatus({ 1: 'pending' })
    setProposal(defaultProposal)
    setOutputConfig(defaultOutputConfig)
    setSaveStatus('idle')
    setShowNewCustomer(false)
    setShowJsonPaste(false)
    setJsonText('')
    setJsonError('')
    setBatchPhase('idle')
    sessionRef.current = null

    // Supabase에 새 세션 생성
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const newSession = await createProSession(session.user.id, undefined)
      if (newSession) {
        sessionRef.current = newSession
        localStorage.setItem(SESSION_ID_KEY, newSession.id)
      }
    }

    // Step 1으로 이동
    setCurrentStep(1)
    window.history.replaceState(null, '', '/coverage-pro')
  }, [])

  // ── JSON 붙여넣기 처리 ──────────────────────────────────────────────
  const GPTS_URL = 'https://chatgpt.com/g/g-6a0c10ad0478819192a11b8ffc28c760-boheomyi-gijun-bojangbunseog-ai'

  const handleJsonApply = (append = false) => {
    setJsonError('')
    setJsonWarnings([])
    const batchPart = detectBatchPart(jsonText)
    const parsed = parseGptsJson(jsonText)
    if (!parsed) { setJsonError('JSON 형식이 올바르지 않습니다. GPTs 출력 형식을 확인해주세요.'); return }
    if (parsed.length === 0) { setJsonError('계약 데이터가 없습니다.'); return }

    // ── GPTs 데이터 품질 검사 ────────────────────────────────────────────
    const qualityWarnings = analyzeGptsDataQuality(jsonText, parsed)
    if (qualityWarnings.length > 0) setJsonWarnings(qualityWarnings)

    if (batchPart === '1/2') {
      // 1차 배치: 계약 세팅 후 패널 유지 → 2차 대기
      setContracts(parsed)
      setBatchPhase('waiting_2nd')
      setJsonText('')
      setStepStatus((prev) => ({ ...prev, 3: 'done', 4: 'pending' }))
      // showJsonPaste는 열어둠
    } else if (batchPart === '2/2') {
      // 2차 배치: 기존 계약에 누적
      setContracts(prev => [...prev, ...parsed])
      setBatchPhase('idle')
      setJsonText('')
      setShowJsonPaste(false)
      setStepStatus((prev) => ({ ...prev, 3: 'done', 4: 'pending' }))
      if (currentStep === 1) moveStep(3)
    } else {
      // 일반 단일 분석
      if (append) {
        setContracts(prev => [...prev, ...parsed])
      } else {
        setContracts(parsed)
      }
      setBatchPhase('idle')
      setStepStatus((prev) => ({ ...prev, 3: 'done', 4: 'pending' }))
      setJsonText('')
      setShowJsonPaste(false)
      if (currentStep === 1) moveStep(3)
    }
  }

  const openProposalGenerator = () => {
    if (typeof window === 'undefined') return
    const proposalContracts = proposal.addContracts.length > 0
      ? proposal.addContracts
      : contracts.filter((contract) => !proposal.removeContractIds.includes(contract.id))
    if (proposalContracts.length === 0) {
      alert('제안서로 보낼 계약 또는 제안 상품이 없습니다.')
      return
    }

    const categoryId = inferProposalCategory(proposalContracts)
    const plans = proposal.addContracts.length > 0
      ? proposalContracts.map(contractToProposalPlan)
      : [aggregateContractsToProposalPlan(proposalContracts)]

    const payload = {
      version: 'proposal_gpts_v1',
      mode: plans.length > 1 ? 'compare' : 'single',
      categoryId,
      customerName: customer?.name || '',
      focus: ['balance'],
      plans,
      summary: {
        headline: proposal.addContracts.length > 0
          ? '보장분석 결과를 바탕으로 리모델링 제안서를 작성합니다.'
          : '현재 보장분석 결과를 제안서 초안으로 확인합니다.',
        mainMessage: proposal.memo || '현재 보장 현황과 부족 담보를 기준으로 상담용 제안서를 구성합니다.',
        recommendation: proposal.addContracts.length > 0
          ? '추가 제안 상품의 보험료와 핵심 담보를 기존 보장과 함께 설명하세요.'
          : '제안서 생성 화면에서 추천 상품을 추가해 비교 제안서로 완성하세요.',
        cautions: ['최종 가입 전 약관상 지급 조건, 갱신 여부, 보장기간을 확인해야 합니다.'],
      },
    }

    window.localStorage.setItem(PROPOSAL_IMPORT_KEY, JSON.stringify(payload))
    window.open('/insurance-tools/proposal?from=coverage-pro', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="coverage-pro-layout">
      {showBenchmark && <BenchmarkSettings onClose={() => setShowBenchmark(false)} />}
      <ProSidebar
        currentStep={currentStep}
        stepStatus={stepStatus}
        onMove={moveStep}
        onSettingsClick={() => setShowBenchmark(true)}
        onReset={handleReset}
      />
      <main className="coverage-pro-main">
        <div className="coverage-pro-inner">
          <StepIndicator stepStatus={stepStatus} />

          {/* ── 상단 헤더 ── */}
          <div className="coverage-pro-top">
            <div>
              <div className="coverage-pro-kicker">COVERAGE ANALYSIS PRO</div>
              <div className="coverage-pro-title">{titleByStep(currentStep)}</div>
              <div className="coverage-pro-subtitle">
                {customer
                  ? `${customer.name} 고객 기준으로 보장분석 세션을 진행합니다.`
                  : 'CRM 고객을 불러오거나 신규 등록 후 분석을 시작하세요.'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {saveStatus !== 'idle' && (
                <span style={{
                  fontSize: 11,
                  color: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#94a3b8',
                }}>
                  {saveStatus === 'saving' ? '저장 중...' : saveStatus === 'saved' ? '클라우드 저장됨' : '저장 실패'}
                </span>
              )}
              <div className="coverage-pro-actions">
                {currentStep >= 5 && (
                  <button
                    type="button"
                    className="coverage-pro-btn"
                    onClick={openProposalGenerator}
                    disabled={contracts.length === 0 && proposal.addContracts.length === 0}
                  >제안서 생성</button>
                )}
                <button
                  type="button" className="coverage-pro-btn"
                  onClick={() => moveStep(Math.max(1, currentStep - 1) as StepNumber)}
                  disabled={currentStep === 1}
                >이전</button>
                <button
                  type="button" className="coverage-pro-btn primary"
                  onClick={nextStep}
                >{currentStep === 7 ? '완료' : '다음 단계'}</button>
              </div>
            </div>
          </div>

          {/* ── 요약 스탯 ── */}
          <div className="coverage-pro-stat-grid">
            <div className="coverage-pro-stat"><span>고객</span><b>{customer?.name || '미지정'}</b></div>
            <div className="coverage-pro-stat"><span>보험계약</span><b>{contracts.length}건</b></div>
            <div className="coverage-pro-stat"><span>매핑 담보</span><b>{stats.mapped}/{stats.coverageCount}</b></div>
            <div className="coverage-pro-stat"><span>월 보험료</span><b>{formatWon(stats.premium)}</b></div>
          </div>

          {/* ══════════════ STEP 1 — 고객 선택 ════════════════════════ */}
          {currentStep === 1 && (
            <div style={{ display: 'grid', gap: 14 }}>
              {/* CRM 고객 불러오기 */}
              <CustomerSelector
                selectedCustomer={customer}
                requestedCustomerId={requestedCustomerId}
                onLoaded={handleLoaded}
              />

              {/* 신규 고객 등록 */}
              <div className="coverage-pro-card coverage-pro-card-pad">
                <div className="coverage-pro-section-title">신규 고객 등록</div>
                {!showNewCustomer ? (
                  <>
                    <div className="coverage-pro-muted">CRM에 없는 고객을 바로 등록하고 분석을 시작합니다.</div>
                    <button
                      type="button" className="coverage-pro-btn"
                      style={{ marginTop: 12 }}
                      onClick={() => setShowNewCustomer(true)}
                    >+ 신규 고객 등록</button>
                  </>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div className="coverage-pro-grid-2">
                      <div className="coverage-pro-field">
                        <label>고객명 <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          className="coverage-pro-input"
                          placeholder="홍길동"
                          value={newCust.name}
                          onChange={(e) => setNewCust((p) => ({ ...p, name: e.target.value }))}
                        />
                      </div>
                      <div className="coverage-pro-field">
                        <label>연락처</label>
                        <input
                          className="coverage-pro-input"
                          placeholder="010-0000-0000"
                          value={newCust.phone}
                          onChange={(e) => setNewCust((p) => ({ ...p, phone: e.target.value }))}
                        />
                      </div>
                      <div className="coverage-pro-field">
                        <label>생년월일</label>
                        <input
                          className="coverage-pro-input"
                          type="date"
                          value={newCust.birth}
                          onChange={(e) => setNewCust((p) => ({ ...p, birth: e.target.value }))}
                        />
                      </div>
                      <div className="coverage-pro-field">
                        <label>성별</label>
                        <select
                          className="coverage-pro-input"
                          value={newCust.gender}
                          onChange={(e) => setNewCust((p) => ({ ...p, gender: e.target.value as 'M' | 'F' }))}
                        >
                          <option value="M">남성</option>
                          <option value="F">여성</option>
                        </select>
                      </div>
                    </div>
                    <div className="coverage-pro-actions">
                      <button
                        type="button" className="coverage-pro-btn primary"
                        disabled={newCustSaving} onClick={handleSaveNewCustomer}
                      >{newCustSaving ? '등록 중...' : 'CRM 등록 + 선택'}</button>
                      <button type="button" className="coverage-pro-btn"
                        onClick={() => { setShowNewCustomer(false); setNewCust({ name: '', phone: '', birth: '', gender: 'M' }) }}>
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* GPTs JSON 붙여넣기 */}
              <div className="coverage-pro-card coverage-pro-card-pad">
                <div className="coverage-pro-section-title">GPTs JSON 붙여넣기로 계약 자동 입력</div>
                {!showJsonPaste ? (
                  <>
                    <div className="coverage-pro-muted">
                      ChatGPT 보장분석 GPTs에서 출력한 JSON을 붙여넣으면 계약이 자동으로 입력됩니다.
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <button
                        type="button" className="coverage-pro-btn"
                        onClick={() => setShowJsonPaste(true)}
                      >JSON 붙여넣기</button>
                      <a
                        href={GPTS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="coverage-pro-btn"
                        style={{ background: '#10a37f', color: '#fff', border: 'none', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.032.067L9.67 19.95a4.5 4.5 0 0 1-6.07-1.645zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.843-3.369 2.02-1.168a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.402-.681zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>
                        GPTs 열기
                      </a>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {batchPhase === 'waiting_2nd' && (
                      <div style={{
                        background: '#ecfdf5', border: '1px solid #10b981', borderRadius: 8,
                        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <span style={{ fontSize: 18 }}>✅</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#065f46' }}>
                            1차 JSON 입력 완료 — {contracts.length}건 로드됨
                          </div>
                          <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                            GPTs에서 2차 JSON(나머지 계약)을 복사하여 아래에 붙여넣고 &quot;2차 추가&quot;를 클릭하세요.
                          </div>
                        </div>
                      </div>
                    )}
                    <textarea
                      className="coverage-pro-textarea"
                      style={{ minHeight: 160, fontFamily: 'monospace', fontSize: 12 }}
                      placeholder={'GPTs에서 복사한 JSON을 붙여넣으세요.\n\n▶ v5 형식 (insurance_analysis_v5):\n{\n  "version": "insurance_analysis_v5",\n  "policies": [\n    {\n      "company": "삼성화재",\n      "product_name": "실손보험",\n      "monthly_premium": 3.5,\n      "payment_period": "20년납",\n      "coverage_period": "15년 재가입",\n      "renewal_type": "갱신형",\n      "coverages": [\n        { "coverage_name": "질병입원의료비", "amount": null, "category": "실손", "coverage_type": "갱신형", "coverage_period": "15년 재가입" },\n        { "coverage_name": "중대한질병(CI)진단비", "amount": 3000, "category": "CI", "coverage_type": "확인필요", "coverage_period": "80세만기" }\n      ]\n    }\n  ]\n}'}
                      value={jsonText}
                      onChange={(e) => { setJsonText(e.target.value); setJsonError('') }}
                    />
                    {jsonError && (
                      <div style={{ color: '#ef4444', fontSize: 13 }}>{jsonError}</div>
                    )}
                    {jsonWarnings.length > 0 && (
                      <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '12px 16px', marginTop: 10 }}>
                        <div style={{ fontWeight: 700, color: '#856404', marginBottom: 8, fontSize: 13 }}>
                          ⚠️ GPTs 데이터 불일치 감지 ({jsonWarnings.length}개 항목) — 담보가 누락됐을 수 있습니다
                        </div>
                        {jsonWarnings.map((w, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#6c5700', marginTop: 4 }}>• {w}</div>
                        ))}
                        <div style={{ fontSize: 11, color: '#856404', marginTop: 8 }}>
                          → GPTs에서 PDF를 다시 분석하거나, Step 4에서 직접 수정해 주세요.
                        </div>
                      </div>
                    )}
                    <div className="coverage-pro-actions">
                      {batchPhase === 'waiting_2nd' ? (
                        <>
                          <button type="button" className="coverage-pro-btn primary"
                            style={{ background: '#10b981', border: 'none' }}
                            onClick={() => handleJsonApply(true)}>
                            ✅ 2차 추가 — 계약 누적
                          </button>
                          <button type="button" className="coverage-pro-btn"
                            onClick={() => { setBatchPhase('idle'); setShowJsonPaste(false); setJsonText(''); setJsonError('') }}>
                            완료 (1차만 사용)
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="coverage-pro-btn primary" onClick={() => handleJsonApply(false)}>
                            적용 — 계약 전체 교체
                          </button>
                          <button type="button" className="coverage-pro-btn"
                            style={{ background: '#0ea5e9', color: '#fff', border: 'none' }}
                            onClick={() => handleJsonApply(true)}>
                            + 추가 — 기존 계약에 더하기
                          </button>
                          <button type="button" className="coverage-pro-btn"
                            onClick={() => { setShowJsonPaste(false); setJsonText(''); setJsonError('') }}>
                            취소
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 고객 없이 시작 */}
              <div className="coverage-pro-card coverage-pro-card-pad">
                <div className="coverage-pro-section-title">고객 없이 분석 시작</div>
                <div className="coverage-pro-muted">
                  먼저 보장분석을 만들고, 상담 후 고객을 나중에 지정하는 흐름으로도 사용할 수 있습니다.
                </div>
                <button type="button" className="coverage-pro-btn" style={{ marginTop: 12 }} onClick={startWithoutCustomer}>
                  미지정 분석으로 진행
                </button>
              </div>

              {/* 이전 세션 */}
              <SessionList onSelect={handleSessionSelect} />
            </div>
          )}

          {/* ══════════════ STEP 2 — 기본 정보 ═══════════════════════ */}
          {currentStep === 2 && (
            <div className="coverage-pro-card coverage-pro-card-pad">
              <div className="coverage-pro-section-title">기본 정보 확인</div>
              <div className="coverage-pro-grid-2">
                <Info label="고객명"   value={customer?.name || '-'} />
                <Info label="연락처"   value={customer?.phone || '-'} />
                <Info label="생년월일" value={customer?.birth || '-'} />
                <Info label="성별"     value={customer?.gender === 'M' ? '남성' : customer?.gender === 'F' ? '여성' : '-'} />
                <Info label="분석 연결" value={customer?.id ? 'CRM 고객 연결됨' : '고객 미지정'} />
              </div>
            </div>
          )}

          {/* ══════════════ STEP 3 — 현재 보험 ═══════════════════════ */}
          {currentStep === 3 && (
            <div style={{ display: 'grid', gap: 14 }}>
              <ContractList
                contracts={contracts}
                onUpdate={(id, patch) =>
                  setContracts((prev) =>
                    prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
                  )
                }
              />
              <UnmappedPanel
                contracts={contracts}
                onUpdate={setContracts}
              />
              {/* JSON 다시 붙여넣기 허용 */}
              {!showJsonPaste ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="coverage-pro-btn" style={{ alignSelf: 'flex-start' }}
                    onClick={() => setShowJsonPaste(true)}>
                    JSON 재입력 (GPTs)
                  </button>
                  <a
                    href={GPTS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="coverage-pro-btn"
                    style={{ background: '#10a37f', color: '#fff', border: 'none', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.032.067L9.67 19.95a4.5 4.5 0 0 1-6.07-1.645zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.843-3.369 2.02-1.168a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.402-.681zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>
                    GPTs 열기
                  </a>
                </div>
              ) : (
                <div className="coverage-pro-card coverage-pro-card-pad">
                  <div className="coverage-pro-section-title">GPTs JSON 재입력</div>
                  {batchPhase === 'waiting_2nd' && (
                    <div style={{
                      background: '#ecfdf5', border: '1px solid #10b981', borderRadius: 8,
                      padding: '10px 14px', marginBottom: 10,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: '#065f46' }}>
                        ✅ 1차 JSON 입력 완료 ({contracts.length}건)
                      </div>
                      <div style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                        GPTs 2차 JSON을 붙여넣고 &quot;2차 추가&quot;를 클릭하세요.
                      </div>
                    </div>
                  )}
                  <textarea
                    className="coverage-pro-textarea"
                    style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 12 }}
                    value={jsonText}
                    onChange={(e) => { setJsonText(e.target.value); setJsonError('') }}
                  />
                  {jsonError && <div style={{ color: '#ef4444', fontSize: 13 }}>{jsonError}</div>}
                  {jsonWarnings.length > 0 && (
                    <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '12px 16px', marginTop: 10 }}>
                      <div style={{ fontWeight: 700, color: '#856404', marginBottom: 8, fontSize: 13 }}>
                        ⚠️ GPTs 데이터 불일치 감지 ({jsonWarnings.length}개 항목) — 담보가 누락됐을 수 있습니다
                      </div>
                      {jsonWarnings.map((w, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#6c5700', marginTop: 4 }}>• {w}</div>
                      ))}
                      <div style={{ fontSize: 11, color: '#856404', marginTop: 8 }}>
                        → GPTs에서 PDF를 다시 분석하거나, Step 4에서 직접 수정해 주세요.
                      </div>
                    </div>
                  )}
                  <div className="coverage-pro-actions" style={{ marginTop: 10 }}>
                    {batchPhase === 'waiting_2nd' ? (
                      <>
                        <button type="button" className="coverage-pro-btn primary"
                          style={{ background: '#10b981', border: 'none' }}
                          onClick={() => handleJsonApply(true)}>
                          ✅ 2차 추가
                        </button>
                        <button type="button" className="coverage-pro-btn"
                          onClick={() => { setBatchPhase('idle'); setShowJsonPaste(false); setJsonText('') }}>
                          완료 (1차만 사용)
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="coverage-pro-btn primary" onClick={() => handleJsonApply(false)}>
                          적용 — 전체 교체
                        </button>
                        <button type="button" className="coverage-pro-btn"
                          style={{ background: '#0ea5e9', color: '#fff', border: 'none' }}
                          onClick={() => handleJsonApply(true)}>
                          + 추가
                        </button>
                        <button type="button" className="coverage-pro-btn"
                          onClick={() => { setShowJsonPaste(false); setJsonText('') }}>취소</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ STEP 4 — 보장 확인 ═══════════════════════ */}
          {currentStep === 4 && <CoverageGrid contracts={contracts} onUpdate={setContracts} />}

          {/* ══════════════ STEP 5 — 분석 결과 ═══════════════════════ */}
          {currentStep === 5 && <AnalysisChart contracts={contracts} />}

          {/* ══════════════ STEP 6 — 리모델링 ════════════════════════ */}
          {currentStep === 6 && (
            <RemodelComparison contracts={contracts} proposal={proposal} onChange={setProposal} userId={advisorInfo.userId} />
          )}

          {/* ══════════════ STEP 7 — 출력 · 다운로드 ════════════════════ */}
          {currentStep === 7 && (
            <div style={{ display: 'grid', gap: 24 }}>
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e0e7ef', padding: '28px 32px', boxShadow: '0 2px 12px rgba(16,32,58,0.05)' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#10203a', marginBottom: 20 }}>
                  출력 · 다운로드
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                  <ExcelDownloadBtn
                    customerName={customer?.name || ''}
                    contracts={contracts}
                  />
                  <PdfExportBtn
                    customerName={customer?.name || ''}
                    customerBirth={customer?.birth}
                    contracts={contracts}
                    outputType="key_pdf"
                    proposal={proposal}
                    advisorInfo={advisorInfo}
                  />
                  <PdfExportBtn
                    customerName={customer?.name || ''}
                    customerBirth={customer?.birth}
                    contracts={contracts}
                    outputType="full_pdf"
                    proposal={proposal}
                    advisorInfo={advisorInfo}
                  />
                </div>
              </div>

              {/* ── 고객관리 CRM 저장 ─────────────────────────────────── */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e0e7ef', padding: '24px 32px', boxShadow: '0 2px 12px rgba(16,32,58,0.05)' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#10203a', marginBottom: 6 }}>고객관리 CRM 저장</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                  분석 결과를 고객관리 CRM에 저장하면 보장현황 카드, PDF 리포트에 자동으로 반영됩니다.
                </div>
                {!customer?.id ? (
                  <div style={{ fontSize: 13, color: '#94a3b8', background: '#f8fafc', borderRadius: 10, padding: '12px 16px' }}>
                    ⚠️ 고객이 선택되지 않았습니다. 1단계에서 CRM 고객을 선택하거나 신규 등록하세요.
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      onClick={async () => {
                        if (!customer?.id || contracts.length === 0) return
                        setCrmSyncStatus('syncing')
                        setCrmSyncMessage('')
                        try {
                          const result = await syncProToCRM(customer, contracts, true)
                          setCrmSyncStatus('done')
                          setCrmSyncMessage([
                            `계약 ${result.policyCount}건 · 담보 ${result.coverageCount}건 CRM 저장 완료`,
                            result.warnings.length > 0 ? `주의: ${result.warnings.join(' / ')}` : '갱신 알림 연결 완료',
                          ].join('\n'))
                        } catch (error) {
                          setCrmSyncStatus('error')
                          setCrmSyncMessage(error instanceof Error ? error.message : 'CRM 저장에 실패했습니다.')
                        }
                      }}
                      disabled={crmSyncStatus === 'syncing' || contracts.length === 0}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px',
                        background: crmSyncStatus === 'done' ? '#10b981' : crmSyncStatus === 'error' ? '#ef4444' : '#1a2744',
                        color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
                        cursor: crmSyncStatus === 'syncing' ? 'not-allowed' : 'pointer',
                        opacity: crmSyncStatus === 'syncing' ? 0.7 : 1,
                      }}
                    >
                      {crmSyncStatus === 'syncing' && (
                        <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      )}
                      {crmSyncStatus === 'done' ? '✓ CRM 저장 완료' : crmSyncStatus === 'error' ? '⚠️ 저장 실패' : '📂 고객관리 CRM에 저장'}
                    </button>
                    {crmSyncStatus === 'done' && customer?.id && (
                      <button
                        onClick={() => window.open(`/crm/customers/${customer.id}`, '_blank', 'noopener,noreferrer')}
                        style={{ padding: '11px 18px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                      >
                        CRM에서 확인 ↗
                      </button>
                    )}
                    {crmSyncStatus === 'idle' && (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        {customer.name}님 · 계약 {contracts.length}건 저장 준비됨
                      </span>
                    )}
                    {crmSyncMessage && (
                      <div style={{ width: '100%', fontSize: 12, color: crmSyncStatus === 'error' ? '#b91c1c' : '#047857', background: crmSyncStatus === 'error' ? '#fef2f2' : '#ecfdf5', borderRadius: 8, padding: '9px 12px', whiteSpace: 'pre-wrap' }}>
                        {crmSyncMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <BenchmarkSummary contracts={contracts} />
            </div>
          )}

        </div>
      </main>    </div>
  )
}
