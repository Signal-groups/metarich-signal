'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import type { jsPDF as JsPDFType } from 'jspdf'
import { buildStyledSheet } from '../../../lib/coverageExcel'

const UPLOAD_STORAGE_KEY = 'signal-crm-upload-files'
const TARGET_STORAGE_KEY = 'signal-crm-coverage-targets'
const MANWON_TO_WON = 10000

const categoryLabels: Record<string, string> = {
  cancer: '암',
  general_cancer: '일반암',
  similar_cancer: '유사암',
  small_cancer: '소액암',
  brain: '뇌',
  brain_vascular: '뇌혈관',
  stroke: '뇌졸중',
  cerebral_hemorrhage: '뇌출혈',
  heart: '심장',
  ischemic_heart: '허혈성심장질환',
  acute_myocardial_infarction: '급성심근경색',
  surgery: '수술',
  disease_surgery: '질병수술',
  injury_surgery: '상해수술',
  hospitalization: '입원',
  nursing: '간병',
  driver: '운전자',
  fire: '화재',
  death: '사망',
  disability: '후유장해',
  dementia: '치매',
  dental: '치아',
}

// ── 정액 보장 항목 (금액 기준) ────────────────────────────────────────────
const targetItems = [
  // 사망
  { key: 'death_general',   label: '일반사망',   aliases: ['일반사망', '사망보험금', '사망급여금', '사망보장'], defaultAmount: 100_000_000 },
  // 암
  { key: 'cancer',          label: '암 진단비',   aliases: ['일반암', '통합암', '고액암', '암진단', '암 진단', 'cancer'], defaultAmount: 70_000_000 },
  { key: 'similar_cancer',  label: '유사암',      aliases: ['유사암', '소액암', '경계성암', '갑상선암', '기타피부암'], defaultAmount: 10_000_000 },
  { key: 'cancer_chemo',    label: '항암치료비',  aliases: ['항암', '방사선치료', '약물치료', '표적항암', '중입자', '면역항암'], defaultAmount: 30_000_000 },
  { key: 'cancer_major',    label: '암 주요치료비', aliases: ['암주요치료', '암집중치료', '암치료비집중'], defaultAmount: 10_000_000 },
  // 뇌
  { key: 'brain_vascular',  label: '뇌혈관 진단', aliases: ['뇌혈관', '뇌졸중', '뇌출혈', '뇌혈관질환', 'brain', 'stroke'], defaultAmount: 40_000_000 },
  { key: 'brain_major',     label: '뇌 주요치료비', aliases: ['뇌주요치료', '뇌집중치료', '2대주요치료', '2대집중'], defaultAmount: 10_000_000 },
  // 심장
  { key: 'ischemic_heart',  label: '심장 진단',   aliases: ['허혈성심장', '허혈성', '급성심근경색', '심근경색', '심혈관질환', '심장질환', 'heart'], defaultAmount: 40_000_000 },
  { key: 'heart_major',     label: '심장 주요치료비', aliases: ['심장주요치료', '심혈관주요', '심집중치료'], defaultAmount: 10_000_000 },
  // 연금
  { key: 'pension',         label: '연금',        aliases: ['연금', '노후', '종신', 'pension', '변액연금', '즉시연금'], defaultAmount: 0 },
]

// ── 수술비 체크 항목 (유/무 방식, 프리셋별 표시 범위 다름) ──────────────────
const surgeryCheckItems = [
  {
    key: 'surgery_basic',
    label: '질병/상해 수술비',
    desc: '질병 수술비 + 상해 수술비 (1~5종 포함)',
    aliases: ['질병수술비', '질병수술', '상해수술비', '상해수술', '1~5종수술'],
    presets: ['min', 'standard', 'comfort'],
  },
  {
    key: 'surgery_type',
    label: '종수술비',
    desc: '질병/상해 1~5종수술비 (수술 분류별)',
    aliases: ['질병1~5종', '상해1~5종', '종수술', '5종수술', '3종수술'],
    presets: ['standard', 'comfort'],
  },
  {
    key: 'surgery_advanced',
    label: 'N대 수술비',
    desc: '64대·100대 등 중증 수술 집중 보장',
    aliases: ['n대수술', '64대수술', '100대수술', '32대수술', '7대수술'],
    presets: ['comfort'],
  },
]

// ── 기본준비 항목 (유/무 체크, 정해진 한도 내 가입) ─────────────────────────
const basicCoverageItems = [
  {
    key: 'indemnity',
    label: '실손의료비',
    desc: '중복 보상 불가 · 1개 가입 권장',
    aliases: ['실손', '실비', '상해입원의료비', '질병입원의료비', '상해통원', '질병통원'],
  },
  {
    key: 'nursing',
    label: '간병 / 재가',
    desc: '장기요양·간병인 비용 대비',
    aliases: ['간병', '재가', '간호간병', '장기요양'],
  },
  {
    key: 'legal',
    label: '법률 · 일배책',
    desc: '일상배상책임 · 화재벌금 · 법률비용',
    aliases: ['일상배상', '일배책', '화재', '변호사', '법률'],
  },
  {
    key: 'driver',
    label: '운전자보험',
    desc: '교통사고 처리지원금 · 법률비용 (한도 내)',
    aliases: ['운전자', '교통사고처리', '교통사고벌금', '자동차부상'],
  },
]

// ── 권장금액 3단계 프리셋 ─────────────────────────────────────────────────────
type TargetPreset = 'min' | 'standard' | 'comfort' | 'custom'

const TARGET_PRESETS: Record<Exclude<TargetPreset, 'custom'>, {
  label: string
  badge: string
  color: string
  desc: string
  detail: string[]
  values: Record<string, number>
}> = {
  min: {
    label: '최소',
    badge: '최소 진단비 기준',
    color: '#64748b',
    desc: '치명적 위험만 대비하는 최소 수준',
    detail: ['일반사망 5천만', '암 3천만', '뇌혈관 1천만', '심장 1천만', '수술비 기본', '실손·간병·법률 기본준비'],
    values: {
      death_general:    50_000_000,  // 5천만
      cancer:           30_000_000,  // 3천만
      similar_cancer:    5_000_000,  // 5백만
      cancer_chemo:              0,
      cancer_major:              0,
      brain_vascular:   10_000_000,
      brain_major:               0,
      ischemic_heart:   10_000_000,
      heart_major:               0,
      pension:                   0,
    },
  },
  standard: {
    label: '표준',
    badge: '업계 권장 표준',
    color: '#2563eb',
    desc: '암·뇌·심장 주요치료비까지 준비한 표준 수준',
    detail: ['일반사망 1억', '암 7천만 + 유사암 1천만', '뇌혈관 4천만', '심장 4천만', '수술비 200만', '암·뇌·심 주요치료비 1천만', '실손·간병·법률 기본준비'],
    values: {
      death_general:   100_000_000,  // 1억
      cancer:           70_000_000,  // 7천만
      similar_cancer:   10_000_000,  // 1천만
      cancer_chemo:              0,
      cancer_major:     10_000_000,
      brain_vascular:   40_000_000,
      brain_major:      10_000_000,
      ischemic_heart:   40_000_000,
      heart_major:      10_000_000,
      pension:                   0,
    },
  },
  comfort: {
    label: '여유',
    badge: '충분한 보장 기준',
    color: '#059669',
    desc: '항암·N대수술·주요치료비까지 여유롭게 준비한 수준',
    detail: ['일반사망 3억', '암 1억5천 + 유사암 2천만', '항암(약물·방사선) 각 3천만', '뇌혈관 6천만', '심장 6천만', '암·뇌·심 주요치료비 각 2천만', 'N대 수술비 포함', '실손·간병·법률 기본준비'],
    values: {
      death_general:   300_000_000,  // 3억
      cancer:          150_000_000,  // 1억5천만
      similar_cancer:   20_000_000,  // 2천만
      cancer_chemo:     30_000_000,  // 3천만
      cancer_major:     20_000_000,
      brain_vascular:   60_000_000,
      brain_major:      20_000_000,
      ischemic_heart:   60_000_000,
      heart_major:      20_000_000,
      pension:                   0,
    },
  },
}

const coverageDescriptions: Record<string, string> = {
  death_general:   '가족의 생활 안정을 위한 사망 시 지급되는 사망보험금입니다.',
  cancer:          '암 진단 시 치료비와 회복기 생활비 부담을 줄이기 위한 핵심 진단자금입니다.',
  similar_cancer:  '갑상선암·기타피부암 등 소액암 보장을 별도로 확인하는 항목입니다.',
  cancer_chemo:    '항암약물·방사선·표적·중입자치료 등 고가 암 치료비 대비 항목입니다.',
  cancer_major:    '암 진단 후 집중 치료 단계에서 발생하는 주요 치료비입니다.',
  brain_vascular:  '뇌출혈·뇌졸중보다 넓은 뇌혈관 질환까지 진단 시 수령하는 자금입니다.',
  brain_major:     '뇌혈관 질환 치료 중 집중 치료비를 보충하는 항목입니다.',
  ischemic_heart:  '협심증·급성심근경색 등 심장질환 진단 시 필요한 치료자금입니다.',
  heart_major:     '심장질환 치료 중 집중 치료비를 보충하는 항목입니다.',
  disease_surgery: '질병 수술 시 반복적으로 발생하는 수술비 부담을 줄이는 보장입니다.',
  surgery_advanced:'64대·100대 등 중증 수술에 집중 지원하는 N대 수술비입니다.',
  pension:         '노후 생활 안정을 위한 연금 수령액 또는 적립 현황입니다.',
  indemnity:       '실제 발생한 의료비를 돌려받는 실손보험 (중복 보상 불가, 1개 가입 원칙).',
  nursing:         '장기 입원·간병 시 발생하는 간병인 비용과 재가 서비스 비용을 지원합니다.',
  legal:           '일상생활 중 타인에게 발생한 손해를 보상하는 일배책·화재벌금 보장입니다.',
  driver:          '교통사고 처리지원금·변호사 선임비·벌금 등 운전자 법률 비용 (한도 내 가입).',
}

type UploadItem = {
  id: string
  ownerId?: string
  name: string
  category?: string
  date?: string
  customerId?: string
  customerName?: string
  analysisResult?: string
  structuredAnalysis?: any
}

type CoverageRow = {
  category: string
  sub_category?: string
  coverage_name: string
  amount?: number
  unit?: string
  note?: string
  company?: string
  product_name?: string
  coverage_type?: string
  renewal_type?: string
  payment_method_type?: string
}

type PolicyGroup = {
  key: string
  company: string
  product_name: string
  premium?: number
  start_date?: string
  payment_period?: string
  maturity?: string
  maturity_age?: number | string
  paid_premium_total?: number
  remaining_premium_total?: number
  coverages: CoverageRow[]
}

type CoverageTargets = Record<string, number>
type ReportOutputMode = 'major' | 'detail'

type MajorCoverageRow = {
  key: string
  label: string
  description: string
  current: number
  target: number
  percent: number
  status: string
  companies: Array<{ company: string; amount: number }>
}

export default function AnalysisPage() {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [dbPolicies, setDbPolicies] = useState<any[]>([])
  const [dbCoverages, setDbCoverages] = useState<any[]>([])
  const [openAnalysis, setOpenAnalysis] = useState<Record<string, boolean>>({})
  const [selectedGroup, setSelectedGroup] = useState<PolicyGroup | null>(null)
  const [editingContract, setEditingContract] = useState<{ itemId?: string; index?: number; group: PolicyGroup } | null>(null)
  const [advisor, setAdvisor] = useState({ name: '담당자', phone: '' })
  const [targets, setTargets] = useState<CoverageTargets>(() => defaultTargets())
  const [targetPreset, setTargetPreset] = useState<TargetPreset>('standard')
  const [savingReport, setSavingReport] = useState(false)
  const [savingExcel, setSavingExcel] = useState(false)
  const [outputMode, setOutputMode] = useState<ReportOutputMode>('major')
  const reportRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }
    setCurrentUserId(session.user.id)

    const { data: userData } = await supabase.from('users').select('name, phone').eq('id', session.user.id).maybeSingle()
    setAdvisor({ name: userData?.name || session.user.email?.split('@')[0] || '담당자', phone: userData?.phone || '' })

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('advisor_id', session.user.id)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    const customerList = customerData || []
    const requestedCustomerId = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('customerId') || ''
      : ''

    setCustomers(customerList)
    setSelectedCustomerId((current) => {
      if (requestedCustomerId && customerList.some((customer: any) => customer.id === requestedCustomerId)) return requestedCustomerId
      return current || customerList[0]?.id || ''
    })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    try {
      const savedUploads = window.localStorage.getItem(UPLOAD_STORAGE_KEY)
      const savedTargets = window.localStorage.getItem(TARGET_STORAGE_KEY)
      const parsedUploads = savedUploads ? JSON.parse(savedUploads) : []
      setUploadItems(Array.isArray(parsedUploads) ? parsedUploads : [])
      setTargets(savedTargets ? { ...defaultTargets(), ...JSON.parse(savedTargets) } : defaultTargets())
    } catch {
      setUploadItems([])
      setTargets(defaultTargets())
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(targets))
  }, [targets])

  useEffect(() => {
    const loadCustomerDetails = async () => {
      if (!selectedCustomerId) {
        setDbPolicies([])
        setDbCoverages([])
        return
      }
      if (!customers.some((customer) => customer.id === selectedCustomerId)) {
        setDbPolicies([])
        setDbCoverages([])
        return
      }
      const [policyRes, coverageRes] = await Promise.all([
        supabase.from('policies').select('*').eq('customer_id', selectedCustomerId).order('start_date', { ascending: false }),
        supabase.from('coverages').select('*').eq('customer_id', selectedCustomerId),
      ])
      setDbPolicies(policyRes.data || [])
      setDbCoverages(coverageRes.data || [])
    }
    loadCustomerDetails()
  }, [customers, selectedCustomerId])

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId)

  const customerAnalyses = useMemo(() => {
    if (!selectedCustomer) return []
    return uploadItems
      .filter((item) => item.ownerId === currentUserId || (!item.ownerId && item.customerId && customers.some((customer) => customer.id === item.customerId)))
      .filter((item) => item.category === '보장분석' || item.structuredAnalysis)
      .filter((item) => {
        if (item.customerId && item.customerId === selectedCustomer.id) return true
        if (!item.customerId && item.customerName && normalizeName(item.customerName) === normalizeName(selectedCustomer.name)) return true
        return false
      })
      .map((item) => ({ ...item, normalized: normalizeAnalysis(item.structuredAnalysis, item.name) }))
  }, [currentUserId, customers, selectedCustomer, uploadItems])

  const dbPolicyGroups = useMemo<PolicyGroup[]>(() => {
    const byPolicy: Record<string, PolicyGroup> = {}
    dbPolicies.forEach((policy) => {
      byPolicy[policy.id] = {
        key: `db-${policy.id}`,
        company: policy.company || '보험사 미확인',
        product_name: policy.product_name || '상품명 미확인',
        premium: policy.monthly_premium || 0,
        start_date: policy.start_date,
        payment_period: policy.payment_period,
        maturity: policy.end_date,
        maturity_age: policy.maturity_age || policy.maturity,
        paid_premium_total: policy.paid_premium_total,
        remaining_premium_total: policy.remaining_premium_total,
        coverages: [],
      }
    })
    dbCoverages.forEach((coverage) => {
      const policyId = coverage.policy_id || 'manual'
      if (!byPolicy[policyId]) {
        byPolicy[policyId] = {
          key: `db-${policyId}`,
          company: '직접 등록',
          product_name: '보장 항목',
          coverages: [],
        }
      }
      byPolicy[policyId].coverages.push({
        category: normalizeCategory(coverage.category, coverage.coverage_name),
        coverage_name: coverage.coverage_name || translateCategory(coverage.category),
        amount: coverage.amount || 0,
        unit: '원',
        note: coverage.note || '',
      })
    })
    return Object.values(byPolicy)
  }, [dbPolicies, dbCoverages])

  const hasAnyData = customerAnalyses.length > 0 || dbPolicyGroups.length > 0
  const primaryAnalysis = customerAnalyses[0]?.normalized
  const reportGroups = primaryAnalysis?.groups?.length ? primaryAnalysis.groups : dbPolicyGroups
  const reportStrengths = useMemo(() => {
    const explicit = primaryAnalysis?.strengths?.filter(Boolean) || []
    if (explicit.length > 0) return explicit

    return buildCoverageRows(reportGroups, targets)
      .filter((row) => row.percent >= 100)
      .map((row) => `${row.label}는 권장금액 이상 준비되어 있습니다.`)
  }, [primaryAnalysis, reportGroups, targets])

  const toggleAnalysis = (id: string) => setOpenAnalysis((prev) => ({ ...prev, [id]: !prev[id] }))

  const saveUploadItems = (next: UploadItem[]) => {
    setUploadItems(next)
    window.localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(next))
  }

  const updateAnalysisContract = (itemId: string | undefined, index: number | undefined, group: PolicyGroup) => {
    if (!itemId && typeof index !== 'number') return
    const next = uploadItems.map((item) => {
      if (item.id !== itemId) return item
      const source = item.structuredAnalysis || {}
      const contracts = firstArray(source.contracts, source.policies).slice()
      const targetIndex = typeof index === 'number' ? index : contracts.length
      const payload = policyGroupToContract(group)
      if (targetIndex >= contracts.length) contracts.push(payload)
      else contracts[targetIndex] = { ...contracts[targetIndex], ...payload }
      return { ...item, structuredAnalysis: { ...source, contracts, policies: undefined } }
    })
    saveUploadItems(next)
    setEditingContract(null)
  }

  const deleteAnalysisContract = (itemId?: string, index?: number) => {
    if (!itemId || typeof index !== 'number') return
    if (!confirm('해당 계약을 삭제할까요?')) return
    const next = uploadItems.map((item) => {
      if (item.id !== itemId) return item
      const source = item.structuredAnalysis || {}
      const contracts = firstArray(source.contracts, source.policies).filter((_: any, contractIndex: number) => contractIndex !== index)
      return { ...item, structuredAnalysis: { ...source, contracts, policies: undefined } }
    })
    saveUploadItems(next)
    setSelectedGroup(null)
  }

  const downloadExcelReport = async () => {
    if (!selectedCustomer || reportGroups.length === 0) {
      alert('저장할 보장분석 자료가 없습니다.')
      return
    }

    setSavingExcel(true)
    try {
      const XLSXStyle = (await import('xlsx-js-style')).default
      const customerName = selectedCustomer.name || primaryAnalysis?.customerName || '고객'

      // groups(PolicyGroup[]) → structuredAnalysis.policies 포맷으로 변환
      const data = {
        customer: { name: customerName },
        policies: reportGroups.map((group) => ({
          company: group.company,
          product_name: group.product_name,
          start_date: group.start_date || '',
          payment_period: group.payment_period || '',
          monthly_premium: group.premium || 0,
          coverages: group.coverages.map((cov) => ({
            coverage_name: cov.coverage_name,
            amount: cov.amount || 0,
          })),
        })),
      }

      const wb = XLSXStyle.utils.book_new()
      const ws = buildStyledSheet(data, customerName)
      XLSXStyle.utils.book_append_sheet(wb, ws, customerName.slice(0, 31))

      const today = new Date().toISOString().slice(0, 10)
      XLSXStyle.writeFile(wb, `${normalizeFileName(customerName)}_보장분석표_${today}.xlsx`)
    } catch (error) {
      console.error(error)
      alert('엑셀 저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSavingExcel(false)
    }
  }

  const downloadLandscapeReport = async () => {
    if (!selectedCustomer || !reportRef.current) {
      alert('저장할 보장분석 리포트가 없습니다.')
      return
    }

    setSavingReport(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const pages = Array.from(reportRef.current.querySelectorAll<HTMLElement>('.report-pdf-page'))
      if (pages.length === 0) throw new Error('PDF page not found')

      await document.fonts?.ready
      await new Promise((resolve) => requestAnimationFrame(resolve))

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as JsPDFType
      for (const [index, page] of pages.entries()) {
        const width = page.offsetWidth || 1600
        const height = page.offsetHeight || 1131
        const canvas = await html2canvas(page, {
          backgroundColor: '#eef3f8',
          scale: 2,
          useCORS: true,
          logging: false,
          width,
          height,
          windowWidth: Math.max(document.documentElement.clientWidth, width),
          windowHeight: Math.max(document.documentElement.clientHeight, height),
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDocument) => {
            clonedDocument
              .querySelectorAll<HTMLElement>('.pdf-render-only, .landscape-report-wrap')
              .forEach((element) => {
                element.style.position = 'static'
                element.style.left = '0'
                element.style.top = '0'
                element.style.width = '1648px'
                element.style.height = 'auto'
                element.style.overflow = 'visible'
                element.style.pointerEvents = 'auto'
                element.style.zIndex = '0'
              })
          },
        })
        if (!canvas.width || !canvas.height) throw new Error(`PDF page ${index + 1} capture failed`)
        if (index > 0) pdf.addPage('a4', 'landscape')
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210)
      }
      const customerName = normalizeFileName(selectedCustomer.name || '고객')
      const today = new Date().toISOString().slice(0, 10)
      const modeLabel = outputMode === 'major' ? '주요담보' : '상세담보'
      pdf.save(`보장분석_${modeLabel}_가로A4_${customerName}_${today}.pdf`)
    } catch (error) {
      console.error(error)
      alert('가로 A4 PDF 저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSavingReport(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">보장분석</div>
          <div className="page-subtitle">고객을 선택하면 GPTs 분석 결과와 회사별 담보를 한글 기준으로 확인합니다.</div>
        </div>
        <div className="header-right">
          <div className="output-mode-toggle" role="group" aria-label="출력 방식 선택">
            <button
              type="button"
              className={outputMode === 'major' ? 'active' : ''}
              onClick={() => setOutputMode('major')}
            >
              주요담보
            </button>
            <button
              type="button"
              className={outputMode === 'detail' ? 'active' : ''}
              onClick={() => setOutputMode('detail')}
            >
              상세담보 포함
            </button>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={downloadExcelReport} disabled={!hasAnyData || savingExcel}>
            {savingExcel ? '저장 중...' : '엑셀 저장'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={downloadLandscapeReport} disabled={!hasAnyData || savingReport}>
            {savingReport ? '저장 중...' : 'PDF 저장'}
          </button>
          <Link href="/crm/upload" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>업로드 분석으로 이동</Link>
        </div>
      </div>

      {loading ? (
        <div className="card card-p" style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
      ) : (
        <>
          <div className="card card-p" style={{ marginBottom: 16 }}>
            <div className="grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">고객 선택</label>
                <select className="form-input" value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                  {customers.length === 0 && <option value="">고객 없음</option>}
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name} {customer.phone ? `(${customer.phone})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="bg-gray rounded p-16">
                <div className="text-muted" style={{ fontSize: 12 }}>선택 고객</div>
                <div className="fw-700 text-blue" style={{ fontSize: 20 }}>
                  {selectedCustomer?.name || '선택 필요'} {selectedCustomer?.birth_date && (
                    <span style={{ color: '#64748b', fontSize: 13, fontWeight: 700 }}>{formatCustomerAge(selectedCustomer.birth_date)}</span>
                  )}
                </div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                  GPTs 분석 {customerAnalyses.length}건 · 등록 담보 {dbCoverages.length}건
                </div>
              </div>
            </div>
          </div>

          <CoverageTargetEditor
            targets={targets}
            onChange={(next) => {
              // 유사암 = 암 진단비의 20% 자동 동기화 (custom 모드에서 암 금액 변경 시)
              const cancer = next.cancer || 0
              const autoSimilar = Math.round(cancer * 0.2 / 10000) * 10000
              setTargets({ ...next, similar_cancer: autoSimilar || next.similar_cancer })
            }}
            preset={targetPreset}
            onPresetChange={(p) => {
              setTargetPreset(p)
              if (p !== 'custom') {
                const presetVals = TARGET_PRESETS[p].values
                // 유사암 = 암 진단비 × 20% 자동 계산
                const cancer = presetVals.cancer || 0
                const similar = Math.round(cancer * 0.2 / 10000) * 10000
                setTargets({ ...defaultTargets(), ...presetVals, similar_cancer: similar })
              }
            }}
          />

          {hasAnyData && selectedCustomer && (
            <div className="pdf-render-only" aria-hidden="true">
              <LandscapeReportPreview
                reportRef={reportRef}
                customer={selectedCustomer}
                analysis={primaryAnalysis}
                groups={reportGroups}
                targets={targets}
                strengths={reportStrengths}
                advisor={advisor}
                outputMode={outputMode}
              />
            </div>
          )}

          {!hasAnyData && (
            <div className="card card-p" style={{ textAlign: 'center', padding: 50 }}>
              <div className="card-title">연결된 보장분석 자료가 없습니다.</div>
              <div className="page-subtitle" style={{ marginBottom: 18 }}>
                업로드 분석에서 고객을 선택한 뒤 GPTs JSON 코드를 붙여넣고 분석 적용을 눌러주세요.
              </div>
              <Link href="/crm/upload" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>보장분석 자료 등록</Link>
            </div>
          )}

          {customerAnalyses.map((item) => (
            <div key={item.id} className="card card-p" style={{ marginBottom: 16 }}>
              <div className="flex justify-between items-center" style={{ gap: 12 }}>
                <div>
                  <div className="card-title" style={{ marginBottom: 3 }}>{item.normalized.customerName || selectedCustomer?.name} 보장분석</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {item.name} · {item.date || '-'} · 월 보험료 {formatWon(item.normalized.monthlyPremium)}
                  </div>
                </div>
                <div className="flex" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingContract({ itemId: item.id, index: item.normalized.groups.length, group: emptyPolicyGroup() })}
                  >
                    계약 추가
                  </button>
                </div>
              </div>

              <div className="grid-3" style={{ marginTop: 16 }}>
                <MiniInfo label="계약 건수" value={item.normalized.contractCount ? `${item.normalized.contractCount}건` : '-'} />
                <MiniInfo label="보험사" value={item.normalized.companies.join(', ') || '-'} />
                <MiniInfo label="월 납입 보험료" value={formatWon(item.normalized.monthlyPremium)} />
                <MiniInfo label="현재까지 납부" value={formatWon(item.normalized.paidPremiumTotal)} />
                <MiniInfo label="남은 보험료" value={formatWon(item.normalized.remainingPremiumTotal)} />
                <MiniInfo label="보완 포인트" value={item.normalized.weaknesses.slice(0, 2).join(', ') || '-'} />
              </div>

              <CoverageGoalChart groups={item.normalized.groups} targets={targets} />
              <AgeRecommendationPanel customer={selectedCustomer} />
              <CompanyCoverageBoard
                groups={item.normalized.groups}
                onEdit={(group, groupIndex) => setEditingContract({ itemId: item.id, index: groupIndex, group })}
                onDelete={(groupIndex) => deleteAnalysisContract(item.id, groupIndex)}
              />

              <div className="grid-2" style={{ marginTop: 14 }}>
                <ListPanel title="강점" items={item.normalized.strengths} />
                <ListPanel title="부족 또는 확인 필요" items={item.normalized.weaknesses} />
                <ListPanel title="추천 방향" items={item.normalized.recommendations} />
                <ListPanel title="주의사항" items={item.normalized.cautions} />
              </div>
            </div>
          ))}

          {dbPolicyGroups.length > 0 && (
            <div className="card card-p">
              <SectionTitle title="직접 등록한 보험계약/담보" />
              <CoverageGoalChart groups={dbPolicyGroups} targets={targets} />
              <CompanyCoverageBoard groups={dbPolicyGroups} />
            </div>
          )}
        </>
      )}

      {selectedGroup && <PolicyDetailModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />}
      {editingContract && (
        <ContractEditorModal
          value={editingContract.group}
          onClose={() => setEditingContract(null)}
          onSave={(group) => updateAnalysisContract(editingContract.itemId, editingContract.index, group)}
        />
      )}
    </>
  )
}

function CoverageTargetEditor({
  targets,
  onChange,
  preset,
  onPresetChange,
}: {
  targets: CoverageTargets
  onChange: (targets: CoverageTargets) => void
  preset: TargetPreset
  onPresetChange: (preset: TargetPreset) => void
}) {
  const setAmountByManwon = (key: string, value: string) => {
    const amount = Number(value.replace(/[^\d]/g, '')) * 10_000
    onChange({ ...targets, [key]: amount })
    onPresetChange('custom')
  }

  const TABS: { key: TargetPreset; label: string; badge: string; color: string }[] = [
    { key: 'min',      label: '최소',        badge: '최소 진단비',  color: '#64748b' },
    { key: 'standard', label: '표준',        badge: '업계 권장',    color: '#2563eb' },
    { key: 'comfort',  label: '여유',        badge: '충분한 보장',  color: '#059669' },
    { key: 'custom',   label: '사용자 설정', badge: '직접 설정',    color: '#7c3aed' },
  ]

  const currentPreset = preset !== 'custom' ? TARGET_PRESETS[preset] : null

  return (
    <div className="card card-p coverage-target-editor">
      {/* 탭 헤더 */}
      <div style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 10 }}>권장금액 기준 선택</div>
        <div style={{ display: 'flex', gap: 6, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onPresetChange(tab.key)}
              style={{
                padding: '8px 18px',
                border: 'none',
                borderBottom: preset === tab.key ? `3px solid ${tab.color}` : '3px solid transparent',
                background: 'transparent',
                color: preset === tab.key ? tab.color : '#64748b',
                fontWeight: 900,
                fontSize: 14,
                cursor: 'pointer',
                marginBottom: -2,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 프리셋 설명 카드 */}
      {currentPreset && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#1A2744', marginBottom: 6 }}>
            📌 {currentPreset.label} 기준 — {currentPreset.desc}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {currentPreset.detail.map((d) => (
              <span key={d} style={{ background: '#e0e7ff', color: '#3730a3', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                {d}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffbeb', borderRadius: 10, fontSize: 12, color: '#92400e', fontWeight: 700 }}>
            ℹ️ 실손·간병·법률(일배책/화재)·운전자보험은 <b>기본 준비 필수</b>로 설정됩니다.
            실손/운전자는 정해진 한도 내 가입 (중복 보상 불가).
          </div>
        </div>
      )}
      {preset === 'custom' && (
        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#7c3aed' }}>✏️ 사용자 직접 설정</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>아래 금액을 직접 입력해 나만의 기준을 설정하세요.</div>
        </div>
      )}

      {/* 정액 보장 금액 입력 */}
      <div style={{ fontWeight: 800, fontSize: 13, color: '#475569', marginBottom: 8 }}>
        ▶ 정액 보장 (진단비·수술비·치료비)
      </div>
      <div className="target-input-grid" style={{ marginBottom: 16 }}>
        {targetItems.map((item) => {
          const presetVal = currentPreset?.values[item.key]
          return (
            <label key={item.key} className="target-input">
              <span>
                {item.label}
                {presetVal !== undefined && presetVal > 0 && (
                  <em style={{ fontStyle: 'normal', marginLeft: 4, fontSize: 10, color: '#94a3b8' }}>
                    ({Math.round(presetVal / 10000).toLocaleString()}만)
                  </em>
                )}
              </span>
              <div>
                <input
                  value={Math.round((targets[item.key] || 0) / 10_000)}
                  onChange={(event) => setAmountByManwon(item.key, event.target.value)}
                  inputMode="numeric"
                />
                <b>만원</b>
              </div>
            </label>
          )
        })}
      </div>

      {/* 수술비 체크 항목 */}
      <div style={{ fontWeight: 800, fontSize: 13, color: '#475569', marginBottom: 8, marginTop: 4 }}>
        ▶ 수술비 준비 기준 (유/무 체크)
      </div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        {surgeryCheckItems.map((item) => {
          const isIncluded = item.presets.includes(preset)
          return (
            <div key={item.key} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              borderRadius: 12,
              background: isIncluded ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${isIncluded ? '#bbf7d0' : '#e2e8f0'}`,
              opacity: isIncluded ? 1 : 0.5,
            }}>
              <span style={{ fontSize: 18 }}>{isIncluded ? '✅' : '—'}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: isIncluded ? '#166534' : '#94a3b8' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                {item.presets.map((p) => (
                  <span key={p} style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                    background: p === 'min' ? '#f1f5f9' : p === 'standard' ? '#eff6ff' : '#f0fdf4',
                    color: p === 'min' ? '#64748b' : p === 'standard' ? '#2563eb' : '#059669',
                  }}>
                    {p === 'min' ? '최소' : p === 'standard' ? '표준' : '여유'}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 기본준비 안내 */}
      <div style={{ fontWeight: 800, fontSize: 13, color: '#475569', marginBottom: 8 }}>
        ▶ 기본 준비 필수 항목 (유/무 체크 · 정해진 한도 내 가입)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {basicCoverageItems.map((item) => (
          <div key={item.key} style={{ padding: '10px 14px', borderRadius: 12, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0369a1' }}>{item.label}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CoverageGoalChart({ groups, targets }: { groups: PolicyGroup[]; targets: CoverageTargets }) {
  const rows = useMemo(() => buildCoverageRows(groups, targets), [groups, targets])
  if (rows.length === 0) return null

  return (
    <div className="coverage-goal-card">
      <div className="coverage-goal-head">
        <div>
          <div className="fw-700 text-blue" style={{ fontSize: 14 }}>권장금액 대비 보장률</div>
          <div className="text-muted" style={{ fontSize: 12 }}>100% 이상이면 권장금액 이상 준비된 항목입니다.</div>
        </div>
      </div>
      <div className="coverage-vertical-chart">
        {rows.map((row) => (
          <div key={row.key} className="coverage-vertical-item">
            <div className="coverage-percent">{row.percent}%</div>
            <div className="coverage-column">
              <div className={`coverage-column-fill ${row.percent >= 100 ? 'complete' : row.percent >= 70 ? 'good' : 'low'}`} style={{ height: `${Math.min(row.percent, 130)}%` }} />
            </div>
            <div className="coverage-label">{row.label}</div>
            <div className="coverage-money">{formatCompactWon(row.current)}</div>
            <div className="coverage-target">권장 {formatCompactWon(row.target)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 방사형(레이더) 그래프 ────────────────────────────────────────────────────
const RADAR_AXES = [
  { key: 'death',     label: '사망' },
  { key: 'cancer',    label: '암' },
  { key: 'brain',     label: '뇌혈관' },
  { key: 'heart',     label: '심장' },
  { key: 'surgery',   label: '수술' },
  { key: 'indemnity', label: '실손' },
  { key: 'nursing',   label: '간병' },
  { key: 'driver',    label: '운전자' },
]

function RadarChart({ rows }: { rows: MajorCoverageRow[] }) {
  const N = RADAR_AXES.length
  const cx = 160, cy = 150, r = 110
  const levels = [25, 50, 75, 100]

  function polarPoint(i: number, pct: number) {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2
    const d = (r * Math.min(pct, 120)) / 100
    return { x: cx + d * Math.cos(angle), y: cy + d * Math.sin(angle) }
  }

  const dataPoints = RADAR_AXES.map((axis, i) => {
    const row = rows.find((r2) => r2.key === axis.key)
    return polarPoint(i, row?.percent ?? 0)
  })

  const pathData = dataPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ') + ' Z'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#1A2744' }}>보장 레이더</div>
      <svg width={320} height={300} viewBox="0 0 320 300" style={{ overflow: 'visible' }}>
        {/* 레벨 육각형 */}
        {levels.map((level) => {
          const pts = RADAR_AXES.map((_, i) => {
            const { x, y } = polarPoint(i, level)
            return `${x.toFixed(1)},${y.toFixed(1)}`
          }).join(' ')
          return <polygon key={level} points={pts} fill="none" stroke="#e2e8f0" strokeWidth={1} />
        })}
        {/* 축 선 */}
        {RADAR_AXES.map((_, i) => {
          const { x, y } = polarPoint(i, 100)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth={1} />
        })}
        {/* 데이터 영역 */}
        <path d={pathData} fill="rgba(37,99,235,0.18)" stroke="#2563eb" strokeWidth={2.5} strokeLinejoin="round" />
        {/* 데이터 포인트 */}
        {dataPoints.map((pt, i) => {
          const row = rows.find((r2) => r2.key === RADAR_AXES[i].key)
          const color = (row?.percent ?? 0) >= 100 ? '#059669' : (row?.percent ?? 0) >= 70 ? '#2563eb' : '#dc2626'
          return <circle key={i} cx={pt.x} cy={pt.y} r={5} fill={color} stroke="#fff" strokeWidth={2} />
        })}
        {/* 축 레이블 */}
        {RADAR_AXES.map((axis, i) => {
          const labelPt = polarPoint(i, 125)
          return (
            <text key={axis.key} x={labelPt.x} y={labelPt.y} textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={800} fill="#1A2744">
              {axis.label}
            </text>
          )
        })}
        {/* 퍼센트 레이블 */}
        {[25, 50, 75, 100].map((lv) => (
          <text key={lv} x={cx + 4} y={cy - (r * lv) / 100 + 4} fontSize={9} fill="#94a3b8">{lv}%</text>
        ))}
      </svg>
      {/* 범례 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px 12px', width: '100%' }}>
        {RADAR_AXES.map((axis) => {
          const row = rows.find((r2) => r2.key === axis.key)
          const pct = row?.percent ?? 0
          const color = pct >= 100 ? '#059669' : pct >= 70 ? '#2563eb' : '#dc2626'
          return (
            <div key={axis.key} style={{ fontSize: 11, fontWeight: 700, color, textAlign: 'center' }}>
              {axis.label} {pct}%
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CompanyCoverageBoard({
  groups,
  onEdit,
  onDelete,
}: {
  groups: PolicyGroup[]
  onEdit?: (group: PolicyGroup, index: number) => void
  onDelete?: (index: number) => void
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeGroup = groups[activeIndex] || groups[0]
  const totalPremium = sum(groups.map((group) => group.premium || 0))

  useEffect(() => {
    if (activeIndex >= groups.length) setActiveIndex(0)
  }, [activeIndex, groups.length])

  if (groups.length === 0) {
    return <EmptyState text="회사별 담보 상세가 없습니다. GPTs 출력에 contracts 또는 policies와 coverages 항목을 포함하면 더 자세히 표시됩니다." />
  }

  return (
    <div className="company-board">
      <div className="company-board-head">
        <div>
          <div className="fw-700 text-blue">회사별 가입 현황</div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            총 {groups.length}건 · 월 보험료 {formatWon(totalPremium)}
          </div>
        </div>
      </div>

      <div className="company-tab-strip">
        {groups.map((group, index) => (
          <button
            key={`${group.key}-${index}`}
            className={`company-tab ${index === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(index)}
          >
            <span>{group.company}</span>
            <b>{formatWon(group.premium)}</b>
            <small>{group.coverages.length}개 담보 · {formatRenewalType(group)}</small>
          </button>
        ))}
      </div>

      {activeGroup && (
        <div className="company-detail-panel">
          <div className="company-detail-top">
            <div>
              <div className="company-detail-title">{activeGroup.company}</div>
              <div className="company-detail-subtitle">{activeGroup.product_name}</div>
              <div className="company-detail-meta">
                가입 {activeGroup.start_date || '-'} · 납부 {activeGroup.payment_period || '-'} · 만기 {formatMaturity(activeGroup)}
              </div>
            </div>
            <div className="company-detail-actions">
              {onEdit && <button className="btn btn-secondary btn-xs" onClick={() => onEdit(activeGroup, activeIndex)}>수정</button>}
              {onDelete && <button className="btn btn-danger btn-xs" onClick={() => onDelete(activeIndex)}>삭제</button>}
            </div>
          </div>

          <div className="coverage-split-grid">
            <CoverageBucketPanel
              title="정액보상"
              description="진단비, 수술비, 입원일당처럼 정해진 금액으로 지급되는 담보입니다."
              groups={buildCoverageBuckets(activeGroup.coverages, 'fixed')}
            />
            <CoverageBucketPanel
              title="실손보상"
              description="실손의료비, 운전자 실손성 담보처럼 실제 손해액 기준으로 확인하는 담보입니다."
              groups={buildCoverageBuckets(activeGroup.coverages, 'actual')}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function CoverageBucketPanel({
  title,
  description,
  groups,
}: {
  title: string
  description: string
  groups: Array<{ title: string; rows: CoverageRow[] }>
}) {
  return (
    <div className="coverage-bucket-panel">
      <div className="coverage-bucket-head">
        <b>{title}</b>
        <span>{description}</span>
      </div>
      {groups.length > 0 ? groups.map((group) => (
        <div key={`${title}-${group.title}`} className="coverage-bucket-group">
          <div className="coverage-bucket-title">{group.title}</div>
          {group.rows.map((coverage, index) => (
            <div key={`${coverage.coverage_name}-${index}`} className="coverage-bucket-row">
              <div>
                <b>{coverage.sub_category || getCoverageSubCategory(coverage)}</b>
                <span>{coverage.coverage_name}</span>
                <small>{formatRenewalTypeFromCoverage(coverage)}{coverage.note ? ` · ${coverage.note}` : ''}</small>
              </div>
              <strong>{formatWon(coverage.amount)}</strong>
            </div>
          ))}
        </div>
      )) : (
        <div className="coverage-bucket-empty">해당 보상 방식의 담보가 없습니다.</div>
      )}
    </div>
  )
}

function AgeRecommendationPanel({ customer }: { customer: any }) {
  const fullAge = getFullAge(customer?.birth_date)
  const guide = getAgeGuide(fullAge)
  return (
    <div className="age-guide-panel">
      <div>
        <div className="fw-700 text-blue">나이대별 보장 점검</div>
        <div className="text-muted" style={{ fontSize: 12 }}>매월 업데이트 예정인 추천 기준입니다.</div>
      </div>
      <div className="age-guide-items">
        <div>
          <span>필요 보장</span>
          <b>{guide.needs}</b>
        </div>
        <div>
          <span>추천 상품 방향</span>
          <b>{guide.products}</b>
        </div>
      </div>
    </div>
  )
}

function LandscapeReportPreview({
  reportRef,
  customer,
  analysis,
  groups,
  targets,
  strengths,
  advisor,
  outputMode,
}: {
  reportRef: { current: HTMLDivElement | null }
  customer: any
  analysis: any
  groups: PolicyGroup[]
  targets: CoverageTargets
  strengths: string[]
  advisor: { name: string; phone: string }
  outputMode: ReportOutputMode
}) {
  const rows = outputMode === 'major' ? buildMajorCoverageRows(groups, targets) : buildCoverageRows(groups, targets)
  const majorRows = buildMajorCoverageRows(groups, targets)
  const premiumTotal = analysis?.monthlyPremium || sum(groups.map((group) => group.premium || 0))
  const paidTotal = analysis?.paidPremiumTotal || sum(groups.map((group) => group.paid_premium_total || 0))
  const remainingTotal = analysis?.remainingPremiumTotal || sum(groups.map((group) => group.remaining_premium_total || 0))
  const companyNames = Array.from(new Set(groups.map((group) => group.company).filter(Boolean)))
  const weakRows = rows.filter((row) => row.percent < 100).slice(0, 4)
  const detailedCoverages = groups.flatMap((group) => group.coverages.map((coverage) => ({
    ...coverage,
    company: coverage.company || group.company,
    product_name: coverage.product_name || group.product_name,
  }))).sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 20)

  if (rows.length === 0 && groups.length === 0) return null

  return (
    <div className="landscape-report-wrap" aria-hidden="true">
      <div ref={reportRef} className="landscape-report-preview">
        <section className="report-sheet report-cover report-pdf-page">
          <div className="report-cover-brand">보험의 기준</div>
          <div className="report-cover-content">
            <div className="report-cover-kicker">COVERAGE ANALYSIS REPORT</div>
            <h1>{customer.name || analysis?.customerName || '고객'}님<br />보장 분석</h1>
            <p>
              {outputMode === 'major'
                ? '현재 가입 보험의 주요 보장과 준비가 필요한 항목을 상담용으로 깔끔하게 정리했습니다.'
                : '현재 가입 보험의 회사별 담보명과 가입금액을 증권을 보듯 상세하게 정리했습니다.'}
            </p>
          </div>
          <div className="report-cover-meta">
            <div>
              <span>담당자</span>
              <b>{advisor.name || '담당자'}</b>
            </div>
            <div>
              <span>연락처</span>
              <b>{advisor.phone || '-'}</b>
            </div>
            <div>
              <span>분석일</span>
              <b>{new Date().toISOString().slice(0, 10)}</b>
            </div>
          </div>
        </section>

        <section className="report-sheet report-client report-pdf-page">
          <div className="report-topline">
            <div>
              <div className="report-kicker">고객 안내용</div>
              <h2>{customer.name || analysis?.customerName || '고객'}님 보장분석 요약</h2>
              <p>{outputMode === 'major' ? '회사별 주요 보장금액과 총 보장금액을 한눈에 확인합니다.' : '권장금액 대비 준비 현황과 주요 담보를 함께 확인합니다.'}</p>
            </div>
            <div className="report-customer-box">
              <b>{formatCustomerAge(customer.birth_date).replace(/[()]/g, '') || '나이 미확인'}</b>
              <span>{companyNames.join(' · ') || '보험사 미확인'}</span>
              <strong>월 납입 {formatCompactWon(premiumTotal)}</strong>
            </div>
          </div>

          {/* 레이더 + 주요보장 매트릭스 */}
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, marginBottom: 20 }}>
            <div className="report-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RadarChart rows={majorRows} />
            </div>
            <div className="report-panel">
              <div className="report-panel-title">{outputMode === 'major' ? '주요보장 준비 현황' : '권장금액 대비 보장률'}</div>
              {outputMode === 'major' ? (
                <MajorCoverageMatrix rows={majorRows} />
              ) : (
                <div className="report-bar-list">
                  {rows.map((row) => <ReportBar key={row.key} row={row} />)}
                </div>
              )}
            </div>
          </div>

          {/* 기본준비 체크 + 강점 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="report-panel">
              <div className="report-panel-title">기본준비 체크 (실손·간병·법률·운전자)</div>
              <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
                {basicCoverageItems.map((item) => {
                  const ok = majorRows.find((r) => r.key === item.key)
                  const hasIt = (ok?.current ?? 0) > 0
                  return (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: hasIt ? '#f0fdf4' : '#fff7ed', border: `1px solid ${hasIt ? '#bbf7d0' : '#fed7aa'}` }}>
                      <span style={{ fontSize: 22 }}>{hasIt ? '✅' : '⭕'}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: hasIt ? '#166534' : '#9a3412' }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{item.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="report-panel">
              <div className="report-panel-title">준비된 장점</div>
              <ul className="report-list">
                {(strengths.length ? strengths : ['현재 등록된 담보를 기준으로 추가 확인이 필요합니다.']).slice(0, 5).map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="report-panel report-explain">
              <div className="report-panel-title">보장 항목은 이렇게 봅니다</div>
              <div className="coverage-explain-grid">
              {majorRows.slice(0, 6).map((row) => (
                <div key={`explain-${row.key}`} className="coverage-explain-card">
                  <b>{row.label}</b>
                  <span>{getReportRowDescription(row)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3페이지: 회사별 계약 + 준비 필요 항목 ── */}
        <section className="report-sheet report-advisor report-pdf-page">
          <div className="report-topline">
            <div>
              <div className="report-kicker">설계사 점검용 · 3/4</div>
              <h2>회사별 계약 현황</h2>
              <p>가입 보험사별 계약 정보와 보험료 현황을 확인합니다.</p>
            </div>
            <div className="report-customer-box">
              <b>계약 {analysis?.contractCount || groups.length || 0}건</b>
              <span>현재까지 납부 {formatCompactWon(paidTotal)}</span>
              <strong>남은 보험료 {formatCompactWon(remainingTotal)}</strong>
            </div>
          </div>

          <div className="report-grid advisor-grid">
            <div className="report-panel">
              <div className="report-panel-title">회사별 계약</div>
              <div className="report-company-list">
                {groups.slice(0, 8).map((group) => (
                  <div key={`report-${group.key}`} className="report-company-item">
                    <div>
                      <b>{group.company}</b>
                      <span>{group.product_name}</span>
                    </div>
                    <strong>{group.premium ? `${formatCompactWon(group.premium)}/월` : '-'}</strong>
                    <small>가입 {group.start_date || '-'} · 납부 {group.payment_period || '-'} · 만기 {formatMaturity(group)}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-panel">
              <div className="report-panel-title">준비 필요 항목</div>
              <div className="report-gap-list">
                {(weakRows.length ? weakRows : rows.slice(0, 6)).map((row) => (
                  <div key={`gap-${row.key}`} className="report-gap-item">
                    <b>{row.label}</b>
                    <span>{row.percent}%</span>
                    <small>현재 {formatCompactWon(row.current)} / 권장 {formatCompactWon(row.target)}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 4페이지: 담보 상세 목록 ── */}
        <section className="report-sheet report-advisor report-pdf-page">
          <div className="report-topline">
            <div>
              <div className="report-kicker">설계사 점검용 · 4/4</div>
              <h2>{outputMode === 'major' ? '주요 보장 상세 현황' : '담보별 상세 목록'}</h2>
              <p>{outputMode === 'major' ? '주요 보장 항목별 총 보장금액과 가입 현황입니다.' : '증권 기준으로 회사별 담보명과 가입금액을 정리했습니다.'}</p>
            </div>
            <div className="report-customer-box">
              <b>{customer.name || '고객'}님</b>
              <span>담보 항목 {outputMode === 'major' ? majorRows.length : detailedCoverages.length}건</span>
              <strong>월 납입 {formatCompactWon(premiumTotal)}</strong>
            </div>
          </div>

          <div className="report-panel report-wide" style={{ flex: 1 }}>
            <div className="report-panel-title">{outputMode === 'major' ? '주요 담보 합계' : '상세 담보 목록'}</div>
            <div className="report-table">
              <div className="report-table-head">
                <span>보험사</span><span>분류</span><span>{outputMode === 'major' ? '보장 항목' : '담보명'}</span><span>가입금액</span>
              </div>
              {(outputMode === 'major' ? majorRows : detailedCoverages).map((item: any, index) => (
                <div key={`${item.key || item.coverage_name}-${index}`} className="report-table-row">
                  <span>{outputMode === 'major' ? item.companies.map((c: any) => c.company).join(', ') || '-' : item.company || '-'}</span>
                  <span>{outputMode === 'major' ? item.label : translateCategory(item.category)}</span>
                  <span>{outputMode === 'major' ? item.description : item.coverage_name}</span>
                  <span>{formatCompactWon(outputMode === 'major' ? item.current : item.amount)}</span>
                </div>
              ))}
              {(outputMode === 'major' ? majorRows.length === 0 : detailedCoverages.length === 0) && <div className="report-table-empty">담보 상세가 없습니다.</div>}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function ReportBar({ row }: { row: ReturnType<typeof buildCoverageRows>[number] }) {
  const width = Math.min(row.percent, 120)
  const status = row.percent >= 100 ? '충분' : row.percent >= 70 ? '점검' : '부족'
  return (
    <div className="report-bar-row">
      <div className="report-bar-label">
        <b>{row.label}</b>
        <span>{formatCompactWon(row.current)} / {formatCompactWon(row.target)}</span>
      </div>
      <div className="report-bar-track">
        <div className={`report-bar-fill ${row.percent >= 100 ? 'complete' : row.percent >= 70 ? 'good' : 'low'}`} style={{ width: `${width}%` }} />
      </div>
      <div className="report-bar-percent">
        <b>{row.percent}%</b>
        <span>{status}</span>
      </div>
    </div>
  )
}

function MajorCoverageMatrix({ rows }: { rows: MajorCoverageRow[] }) {
  const STATUS_EMOJI: Record<string, string> = { '충분': '✅', '점검': '🔵', '부족': '🔴', '없음': '⚫' }
  return (
    <div className="major-matrix">
      <div className="major-matrix-head">
        <span>주요보장</span>
        <span>준비 현황</span>
        <span>회사별 보장</span>
        <span>총액 / 상태</span>
      </div>
      {rows.map((row) => {
        const pct = Math.min(row.percent, 100)
        const color = pct >= 100 ? '#059669' : pct >= 70 ? '#2563eb' : '#dc2626'
        return (
          <div key={`major-${row.key}`} className="major-matrix-row">
            <div>
              <b>{row.label}</b>
              <small style={{ color: '#64748b', fontSize: 13 }}>{typeof row.description === 'string' ? row.description.slice(0, 28) : ''}</small>
            </div>
            {/* 인포그래픽 진행 바 */}
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ height: 14, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: color, transition: 'width .4s' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color }}>{pct}% {row.current === 0 ? '(미가입)' : `/ 권장 ${formatCompactWon(row.target)}`}</span>
            </div>
            <div className="major-company-list">
              {row.companies.length > 0 ? row.companies.map((company) => (
                <span key={`${row.key}-${company.company}`}>{company.company} {formatCompactWon(company.amount)}</span>
              )) : <span style={{ color: '#94a3b8' }}>미가입</span>}
            </div>
            <div style={{ display: 'grid', gap: 4, justifyItems: 'end' }}>
              <strong style={{ fontSize: 20, color }}>{formatCompactWon(row.current)}</strong>
              <em style={{ fontStyle: 'normal', fontSize: 13, fontWeight: 900, color }}>{STATUS_EMOJI[row.status] || ''} {row.status}</em>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getReportRowDescription(row: { key: string; description?: unknown }) {
  if (typeof row.description === 'string' && row.description.trim()) return row.description
  return coverageDescriptions[row.key] || '상담 시 보장 범위와 지급 조건을 함께 확인해야 하는 항목입니다.'
}

function emptyPolicyGroup(): PolicyGroup {
  return {
    key: `manual-${Date.now()}`,
    company: '',
    product_name: '',
    start_date: '',
    payment_period: '',
    maturity_age: '',
    coverages: [],
  }
}

function policyGroupToContract(group: PolicyGroup) {
  return {
    company: group.company,
    product_name: group.product_name,
    monthly_premium: group.premium || 0,
    premium: group.premium || 0,
    start_date: group.start_date || '',
    payment_period: group.payment_period || '',
    maturity: group.maturity || '',
    maturity_age: group.maturity_age || '',
    paid_premium_total: group.paid_premium_total || 0,
    remaining_premium_total: group.remaining_premium_total || 0,
    coverages: group.coverages.map((coverage) => ({
      category: translateCategory(coverage.category),
      coverage_category: translateCategory(coverage.category),
      coverage_sub_category: coverage.sub_category || getCoverageSubCategory(coverage),
      coverage_name: coverage.coverage_name,
      coverage_name_original: coverage.coverage_name,
      amount: coverage.amount || 0,
      coverage_amount: coverage.amount || 0,
      coverage_type: coverage.coverage_type || getCoveragePaymentType(coverage),
      payment_method_type: coverage.payment_method_type || (isActualCoverage(coverage) ? '실손보상' : '정액보상'),
      renewal_type: coverage.renewal_type || '',
      unit: coverage.unit || '원',
      note: coverage.note || '',
    })),
  }
}

function normalizeAnalysis(data: any, fallbackName = '') {
  const customer = data?.customer || {}
  const analysis = data?.analysis || {}
  const extracted = data?.extracted || {}
  const groups = normalizePolicyGroups(data)
  const multiplier = moneyMultiplierForSource(data)
  const companies = Array.from(new Set(groups.map((group) => group.company).filter(Boolean)))
  return {
    customerName: customer.name || data?.customer_name || extracted.insured_name || fallbackName.replace('-GPTs-보장분석.json', ''),
    monthlyPremium: moneyValue(customer.monthly_premium || data?.monthly_premium, multiplier) || sum(groups.map((group) => group.premium || 0)),
    paidPremiumTotal: moneyValue(data?.premium_summary?.paid_total || data?.paid_premium_total || data?.total_paid_premium, multiplier) || sum(groups.map((group) => group.paid_premium_total || 0)),
    remainingPremiumTotal: moneyValue(data?.premium_summary?.remaining_total || data?.remaining_premium_total || data?.total_remaining_premium, multiplier) || sum(groups.map((group) => group.remaining_premium_total || 0)),
    contractCount: customer.contract_count || data?.contract_count || groups.length,
    companies,
    groups,
    strengths: toList(analysis.strengths),
    weaknesses: toList(analysis.weaknesses || analysis.missing_coverages),
    recommendations: toList(analysis.recommendation || analysis.recommendations),
    cautions: toList(analysis.cautions || data?.cautions),
  }
}

function normalizePolicyGroups(data: any): PolicyGroup[] {
  const groups: PolicyGroup[] = []
  const multiplier = moneyMultiplierForSource(data)
  const policies = firstArray(data?.policies, data?.contracts)
  policies.forEach((policy: any, index: number) => {
    groups.push({
      key: `policy-${index}`,
      company: policy.company || policy.insurer || '보험사 미확인',
      product_name: policy.product_name || policy.product || policy.name || '상품명 미확인',
      premium: premiumMoneyValue(policy.premium || policy.monthly_premium, multiplier),
      start_date: policy.start_date,
      payment_period: policy.payment_period,
      maturity: policy.maturity || policy.end_date,
      maturity_age: policy.maturity_age || policy.maturity_age_text,
      paid_premium_total: moneyValue(policy.paid_premium_total || policy.total_paid_premium || policy.paid_total, multiplier),
      remaining_premium_total: moneyValue(policy.remaining_premium_total || policy.total_remaining_premium || policy.remaining_total, multiplier),
      coverages: normalizeCoverages(policy.coverages || policy.coverage || [], policy.company, policy.product_name || policy.product, multiplier),
    })
  })

  const products = firstArray(data?.products, data?.extracted?.products)
  products.forEach((product: any, index: number) => {
    groups.push({
      key: `product-${index}`,
      company: product.company || data?.extracted?.company || '보험사 미확인',
      product_name: product.product_name || product.name || '상품명 미확인',
      premium: premiumMoneyValue(product.premium || product.monthly_premium, multiplier),
      start_date: product.start_date,
      payment_period: product.payment_period,
      maturity: product.maturity || product.end_date,
      maturity_age: product.maturity_age || product.maturity_age_text,
      paid_premium_total: moneyValue(product.paid_premium_total || product.total_paid_premium || product.paid_total, multiplier),
      remaining_premium_total: moneyValue(product.remaining_premium_total || product.total_remaining_premium || product.remaining_total, multiplier),
      coverages: normalizeCoverages(product.coverages || [], product.company || data?.extracted?.company, product.product_name || product.name, multiplier),
    })
  })

  const extractedCoverages = normalizeCoverages(data?.extracted?.coverages || [], data?.extracted?.company, data?.extracted?.product_names?.[0], multiplier)
  if (extractedCoverages.length > 0) {
    groups.push({
      key: 'extracted',
      company: data?.extracted?.company || '보험사 미확인',
      product_name: data?.extracted?.product_names?.join(', ') || '추출 담보',
      coverages: extractedCoverages,
    })
  }

  const summaryCoverages = Object.entries(data?.coverage_summary || {})
    .filter(([, value]) => typeof value === 'number' || typeof value === 'string')
    .map(([key, value]) => ({
      category: normalizeCategory(key, key),
      coverage_name: translateCategory(key),
      amount: moneyValue(value, multiplier) || 0,
      unit: '원',
      note: 'GPTs 요약 보장금액',
    }))
  const hasDetailedCoverages = groups.some((group) => group.coverages.length > 0)
  if (!hasDetailedCoverages && summaryCoverages.length > 0) {
    groups.push({
      key: 'summary',
      company: '전체 요약',
      product_name: '담보 요약',
      coverages: summaryCoverages,
    })
  }

  return groups.filter((group) => group.company || group.product_name || group.coverages.length > 0)
}

function normalizeCoverages(value: any, company?: string, productName?: string, multiplier = 1): CoverageRow[] {
  return firstArray(value).map((coverage: any) => {
    const rawCategory = coverage.category || coverage.type || ''
    const rawName = coverage.coverage_name || coverage.name || coverage.title || rawCategory || '담보명 미확인'
    const category = normalizeCategory(rawCategory, rawName)
    return {
      category,
      sub_category: coverage.coverage_sub_category || coverage.sub_category || getCoverageSubCategory({ category, coverage_name: rawName, note: coverage.note || coverage.description || coverage.condition || '' }),
      coverage_name: translateCoverageName(rawName, category),
      amount: moneyValue(coverage.amount || coverage.coverage_amount || coverage.value, multiplier),
      unit: coverage.unit || '원',
      note: coverage.note || coverage.description || coverage.condition || '',
      company,
      product_name: productName,
      coverage_type: coverage.coverage_type || coverage.type || '',
      renewal_type: coverage.renewal_type || '',
      payment_method_type: coverage.payment_method_type || '',
    }
  })
}

function PolicyGroupCard({
  group,
  onView,
  onEdit,
  onDelete,
}: {
  group: PolicyGroup
  onView: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div className="policy-group-card" onClick={onView}>
      <div className="flex justify-between items-center" style={{ gap: 10 }}>
        <div>
          <div className="fw-700" style={{ fontSize: 14 }}>{group.company} · {group.product_name}</div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>
            {group.premium ? `월 ${formatWon(group.premium)} · ` : ''}가입일 {group.start_date || '-'} · 납부기간 {group.payment_period || '-'} · 만기 {formatMaturity(group)}
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 2, lineHeight: 1.6 }}>
            현재까지 납부 {formatWon(group.paid_premium_total)} · 남은 보험료 {formatWon(group.remaining_premium_total)}
          </div>
        </div>
        <div className="policy-group-actions" onClick={(event) => event.stopPropagation()}>
          <button className="btn btn-secondary btn-xs" onClick={onView}>담보 {group.coverages.length}개</button>
          {onEdit && <button className="btn btn-secondary btn-xs" onClick={onEdit}>수정</button>}
          {onDelete && <button className="btn btn-danger btn-xs" onClick={onDelete}>삭제</button>}
        </div>
      </div>
    </div>
  )
}

function PolicyDetailModal({ group, onClose }: { group: PolicyGroup; onClose: () => void }) {
  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal policy-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="crm-modal-head">
          <div>
            <div className="crm-modal-title">{group.company}</div>
            <div className="crm-modal-subtitle">{group.product_name}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="grid-3" style={{ marginBottom: 14 }}>
          <MiniInfo label="월 보험료" value={formatWon(group.premium)} />
          <MiniInfo label="가입일 / 납부기간" value={`${group.start_date || '-'} / ${group.payment_period || '-'}`} />
          <MiniInfo label="만기" value={formatMaturity(group)} />
          <MiniInfo label="현재까지 납부" value={formatWon(group.paid_premium_total)} />
          <MiniInfo label="남은 보험료" value={formatWon(group.remaining_premium_total)} />
          <MiniInfo label="담보 수" value={`${group.coverages.length}개`} />
        </div>

        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>분류</th>
                <th>담보명</th>
                <th>가입금액</th>
                <th>내용</th>
              </tr>
            </thead>
            <tbody>
              {group.coverages.map((coverage, index) => (
                <tr key={`${coverage.coverage_name}-${index}`}>
                  <td><span className="badge badge-blue">{translateCategory(coverage.category)}</span></td>
                  <td className="fw-700">{coverage.coverage_name}</td>
                  <td>{coverage.amount ? `${coverage.amount.toLocaleString()}${coverage.unit || '원'}` : '-'}</td>
                  <td>{coverage.note || '-'}</td>
                </tr>
              ))}
              {group.coverages.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: 22 }}>담보 상세가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ContractEditorModal({
  value,
  onClose,
  onSave,
}: {
  value: PolicyGroup
  onClose: () => void
  onSave: (group: PolicyGroup) => void
}) {
  const [draft, setDraft] = useState<PolicyGroup>(() => ({
    ...value,
    coverages: value.coverages.map((coverage) => ({ ...coverage })),
  }))

  const updateField = (key: keyof PolicyGroup, nextValue: any) => {
    setDraft((prev) => ({ ...prev, [key]: nextValue }))
  }

  const updateCoverage = (index: number, key: keyof CoverageRow, nextValue: any) => {
    setDraft((prev) => ({
      ...prev,
      coverages: prev.coverages.map((coverage, coverageIndex) => (
        coverageIndex === index ? { ...coverage, [key]: nextValue } : coverage
      )),
    }))
  }

  const addCoverage = () => {
    setDraft((prev) => ({
      ...prev,
      coverages: [...prev.coverages, { category: '기타', coverage_name: '', unit: '원', note: '' }],
    }))
  }

  const removeCoverage = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      coverages: prev.coverages.filter((_, coverageIndex) => coverageIndex !== index),
    }))
  }

  const submit = () => {
    onSave({
      ...draft,
      company: draft.company.trim() || '보험사 미확인',
      product_name: draft.product_name.trim() || '상품명 미확인',
      premium: numberOrUndefined(draft.premium),
      paid_premium_total: numberOrUndefined(draft.paid_premium_total),
      remaining_premium_total: numberOrUndefined(draft.remaining_premium_total),
      coverages: draft.coverages
        .filter((coverage) => coverage.coverage_name.trim() || coverage.amount)
        .map((coverage) => ({
          ...coverage,
          category: normalizeCategory(coverage.category, coverage.coverage_name),
          sub_category: coverage.sub_category || getCoverageSubCategory(coverage),
          coverage_name: coverage.coverage_name.trim() || '담보명 미확인',
          amount: numberOrUndefined(coverage.amount),
          unit: coverage.unit || '원',
        })),
    })
  }

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal contract-editor-modal" onClick={(event) => event.stopPropagation()}>
        <div className="crm-modal-head">
          <div>
            <div className="crm-modal-title">계약 추가/수정</div>
            <div className="crm-modal-subtitle">회사, 보험료, 담보를 수정하면 보장분석 화면과 PDF에 바로 반영됩니다.</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="contract-editor-grid">
          <label><span>보험사</span><input value={draft.company} onChange={(event) => updateField('company', event.target.value)} /></label>
          <label><span>상품명</span><input value={draft.product_name} onChange={(event) => updateField('product_name', event.target.value)} /></label>
          <label><span>월 보험료</span><input inputMode="numeric" value={draft.premium || ''} onChange={(event) => updateField('premium', event.target.value)} /></label>
          <label><span>가입일</span><input value={draft.start_date || ''} onChange={(event) => updateField('start_date', event.target.value)} placeholder="2026.05.21" /></label>
          <label><span>납부기간</span><input value={draft.payment_period || ''} onChange={(event) => updateField('payment_period', event.target.value)} placeholder="20년" /></label>
          <label><span>만기</span><input value={draft.maturity_age || draft.maturity || ''} onChange={(event) => updateField('maturity_age', event.target.value)} placeholder="90세" /></label>
          <label><span>현재까지 납부</span><input inputMode="numeric" value={draft.paid_premium_total || ''} onChange={(event) => updateField('paid_premium_total', event.target.value)} /></label>
          <label><span>남은 보험료</span><input inputMode="numeric" value={draft.remaining_premium_total || ''} onChange={(event) => updateField('remaining_premium_total', event.target.value)} /></label>
        </div>

        <div className="contract-editor-coverages">
          <div className="flex justify-between items-center" style={{ marginBottom: 10 }}>
            <div className="fw-700 text-blue">담보</div>
            <button className="btn btn-secondary btn-xs" onClick={addCoverage}>담보 추가</button>
          </div>
          {draft.coverages.map((coverage, index) => (
            <div key={`${coverage.coverage_name}-${index}`} className="coverage-edit-row">
              <input value={coverage.category} onChange={(event) => updateCoverage(index, 'category', event.target.value)} placeholder="분류" />
              <input value={coverage.sub_category || ''} onChange={(event) => updateCoverage(index, 'sub_category', event.target.value)} placeholder="세부분류" />
              <input value={coverage.coverage_name} onChange={(event) => updateCoverage(index, 'coverage_name', event.target.value)} placeholder="담보명" />
              <input inputMode="numeric" value={coverage.amount || ''} onChange={(event) => updateCoverage(index, 'amount', event.target.value)} placeholder="가입금액" />
              <input value={coverage.renewal_type || ''} onChange={(event) => updateCoverage(index, 'renewal_type', event.target.value)} placeholder="갱신/비갱신" />
              <input value={coverage.note || ''} onChange={(event) => updateCoverage(index, 'note', event.target.value)} placeholder="내용" />
              <button className="btn btn-danger btn-xs" onClick={() => removeCoverage(index)}>삭제</button>
            </div>
          ))}
          {draft.coverages.length === 0 && <EmptyState text="등록된 담보가 없습니다. 담보 추가를 눌러 입력해주세요." />}
        </div>

        <div className="crm-modal-foot">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-primary btn-sm" onClick={submit}>저장</button>
        </div>
      </div>
    </div>
  )
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray rounded p-16">
      <div className="text-muted" style={{ fontSize: 11 }}>{label}</div>
      <div className="fw-700 text-blue" style={{ fontSize: 15, marginTop: 5 }}>{value}</div>
    </div>
  )
}

function ListPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-gray rounded p-16">
      <div className="fw-700 text-blue" style={{ fontSize: 13, marginBottom: 10 }}>{title}</div>
      {items.length > 0 ? items.map((item, index) => (
        <div key={`${item}-${index}`} style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>• {item}</div>
      )) : <div className="text-muted" style={{ fontSize: 12 }}>내용 없음</div>}
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return <div className="card-title" style={{ marginBottom: 12 }}>{title}</div>
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{text}</div>
}

function buildCoverageRows(groups: PolicyGroup[], targets: CoverageTargets) {
  return targetItems.map((target) => {
    const current = groups.flatMap((group) => group.coverages)
      .filter((coverage) => matchesTarget(coverage, target))
      .reduce((total, coverage) => total + (coverage.amount || 0), 0)
    const targetAmount = targets[target.key] || target.defaultAmount
    return {
      key: target.key,
      label: target.label,
      current,
      target: targetAmount,
      percent: targetAmount > 0 ? Math.round((current / targetAmount) * 100) : 0,
    }
  }).filter((row) => row.current > 0 || row.target > 0)
}

function matchesTarget(coverage: CoverageRow, target: typeof targetItems[number]) {
  const text = `${coverage.category} ${coverage.sub_category || ''} ${coverage.coverage_name} ${coverage.note || ''}`.toLowerCase()
  return target.aliases.some((alias) => text.includes(alias.toLowerCase()))
}

const majorCoverageDefinitions = [
  {
    key: 'death',
    label: '사망',
    description: '일반사망 보험금',
    target: (targets: CoverageTargets) => targets.death_general || 0,
  },
  {
    key: 'cancer',
    label: '암',
    description: '일반암·유사암·항암·주요치료비',
    target: (targets: CoverageTargets) =>
      (targets.cancer || 0) + (targets.similar_cancer || 0) +
      (targets.cancer_chemo || 0) + (targets.cancer_major || 0),
  },
  {
    key: 'brain',
    label: '뇌혈관',
    description: '뇌혈관 진단·주요치료비',
    target: (targets: CoverageTargets) => (targets.brain_vascular || 0) + (targets.brain_major || 0),
  },
  {
    key: 'heart',
    label: '심장',
    description: '심장 진단·주요치료비',
    target: (targets: CoverageTargets) => (targets.ischemic_heart || 0) + (targets.heart_major || 0),
  },
  {
    key: 'surgery',
    label: '수술',
    description: '질병수술비·N대수술',
    target: (targets: CoverageTargets) => (targets.disease_surgery || 0) + (targets.surgery_advanced || 0),
  },
  {
    key: 'indemnity',
    label: '실손의료비',
    description: '실손보험 (유/무)',
    target: (_: CoverageTargets) => 0,  // 유/무 체크 방식
  },
  {
    key: 'nursing',
    label: '간병/재가',
    description: '간병인·재가서비스',
    target: (_: CoverageTargets) => 0,
  },
  {
    key: 'legal',
    label: '법률·일배책',
    description: '일상배상책임·화재벌금',
    target: (_: CoverageTargets) => 0,
  },
  {
    key: 'driver',
    label: '운전자',
    description: '교통사고처리지원금·법률비용',
    target: (_: CoverageTargets) => 0,
  },
  {
    key: 'pension',
    label: '연금',
    description: '노후 연금 준비',
    target: (targets: CoverageTargets) => targets.pension || 0,
  },
]

function buildMajorCoverageRows(groups: PolicyGroup[], targets: CoverageTargets): MajorCoverageRow[] {
  return majorCoverageDefinitions.map((definition) => {
    const companyMap = new Map<string, number>()
    const isBasic = ['indemnity', 'nursing', 'legal', 'driver'].includes(definition.key)

    groups.forEach((group) => {
      const amount = group.coverages
        .filter((coverage) => getMajorCoverageKey(coverage) === definition.key)
        .reduce((total, coverage) => total + (coverage.amount || 0), 0)
      if (amount > 0) companyMap.set(group.company || '보험사 미확인', (companyMap.get(group.company || '보험사 미확인') || 0) + amount)
    })

    const current = Array.from(companyMap.values()).reduce((total, amount) => total + amount, 0)
    const target = definition.target(targets)

    let percent: number
    let status: string
    if (isBasic) {
      // 기본준비 항목: 유/무 체크 (amount > 0이면 100%)
      percent = current > 0 ? 100 : 0
      status = current > 0 ? '준비 완료' : '준비 필요'
    } else {
      percent = target > 0 ? Math.round((current / target) * 100) : current > 0 ? 100 : 0
      status = current <= 0 ? '준비 필요' : percent >= 100 ? '충분' : percent >= 70 ? '점검' : '보완 필요'
    }

    return {
      ...definition,
      current,
      target,
      percent,
      status,
      companies: Array.from(companyMap.entries()).map(([company, amount]) => ({ company, amount })),
    }
  })
}

function getMajorCoverageKey(coverage: CoverageRow) {
  const text = `${coverage.category} ${coverage.sub_category || ''} ${coverage.coverage_name} ${coverage.note || ''}`.toLowerCase()
  // 사망
  if (text.includes('일반사망') || text.includes('사망보험금') || text.includes('사망급여')) return 'death'
  // 간병/재가
  if (text.includes('간병') || text.includes('간호간병') || text.includes('재가') || text.includes('장기요양')) return 'nursing'
  // 실손
  if (text.includes('실손') || text.includes('실비') || (text.includes('입원의료비') || text.includes('통원의료비'))) return 'indemnity'
  // 운전자
  if (text.includes('운전자') || text.includes('교통사고처리') || text.includes('교통사고벌금') || text.includes('변호사선임') || text.includes('자동차부상')) return 'driver'
  // 법률·일배책
  if (text.includes('일상배상') || text.includes('일배책') || text.includes('화재벌금') || text.includes('가족일상')) return 'legal'
  // 수술
  if (/[0-9]+대/.test(text) || text.includes('n대수술') || text.includes('64대') || text.includes('100대')) return 'surgery'
  if (text.includes('수술') || text.includes('종수술') || text.includes('창상봉합')) return 'surgery'
  // 연금
  if (text.includes('연금') || text.includes('노후') || text.includes('pension')) return 'pension'
  // 암
  if (text.includes('암') || text.includes('항암') || text.includes('중입자') || text.includes('표적항암') || text.includes('방사선치료')) return 'cancer'
  // 뇌
  if (text.includes('뇌')) return 'brain'
  // 심장
  if (text.includes('심장') || text.includes('허혈') || text.includes('심근') || text.includes('심혈관') || text.includes('부정맥')) return 'heart'
  // 입원일당
  if (text.includes('입원일당') || text.includes('입원비')) return 'indemnity'
  return 'other'
}

// 기본준비 항목 가입 여부 체크
function hasBasicCoverage(key: string, groups: PolicyGroup[]): boolean {
  const allCoverages = groups.flatMap((g) => g.coverages)
  const item = basicCoverageItems.find((b) => b.key === key)
  if (!item) return false
  return allCoverages.some((cov) => {
    const text = `${cov.category} ${cov.coverage_name} ${cov.note || ''}`.toLowerCase()
    return item.aliases.some((alias) => text.includes(alias.toLowerCase()))
  })
}

const coverageSectionOrder = [
  '암진단비',
  '뇌혈관진단비',
  '심장진단비',
  '질병수술비',
  '상해수술비',
  '입원일당',
  '간병일당',
  '실손의료비',
  '운전자',
  '법률비용',
  '사망',
  '후유장해',
  '치매',
  '치아/화상/골절',
  '기타',
]

function buildCoverageBuckets(coverages: CoverageRow[], mode: 'fixed' | 'actual') {
  const filtered = coverages.filter((coverage) => mode === 'actual' ? isActualCoverage(coverage) : !isActualCoverage(coverage))
  const map = new Map<string, CoverageRow[]>()
  filtered.forEach((coverage) => {
    const title = getMainCoverageCategory(coverage)
    const rows = map.get(title) || []
    rows.push({ ...coverage, sub_category: coverage.sub_category || getCoverageSubCategory(coverage) })
    map.set(title, rows)
  })

  return Array.from(map.entries())
    .sort(([a], [b]) => coverageSectionOrder.indexOf(a) - coverageSectionOrder.indexOf(b))
    .map(([title, rows]) => ({
      title,
      rows: rows.sort((a, b) => (b.amount || 0) - (a.amount || 0)),
    }))
}

function isActualCoverage(coverage: CoverageRow) {
  const text = `${coverage.category} ${coverage.coverage_name} ${coverage.coverage_type || ''} ${coverage.payment_method_type || ''}`.toLowerCase()
  return text.includes('실손') || text.includes('실비') || text.includes('actual') || text.includes('배상책임') || text.includes('처리지원') || text.includes('벌금') || text.includes('변호사')
}

function getCoveragePaymentType(coverage: CoverageRow) {
  return isActualCoverage(coverage) ? '실손' : '정액'
}

function getMainCoverageCategory(coverage: CoverageRow) {
  const text = `${coverage.category} ${coverage.coverage_name} ${coverage.note || ''}`.toLowerCase()
  if (text.includes('암')) return '암진단비'
  if (text.includes('뇌')) return '뇌혈관진단비'
  if (text.includes('심장') || text.includes('허혈') || text.includes('심근') || text.includes('부정맥')) return '심장진단비'
  if (text.includes('질병') && text.includes('수술')) return '질병수술비'
  if (text.includes('상해') && text.includes('수술')) return '상해수술비'
  if (text.includes('간병') || text.includes('간호')) return '간병일당'
  if (text.includes('입원') || text.includes('일당')) return '입원일당'
  if (text.includes('실손') || text.includes('실비')) return '실손의료비'
  if (text.includes('운전자') || text.includes('교통') || text.includes('자부상') || text.includes('벌금') || text.includes('변호사')) return '운전자'
  if (text.includes('배상') || text.includes('화재벌금') || text.includes('일상생활')) return '법률비용'
  if (text.includes('사망')) return '사망'
  if (text.includes('후유') || text.includes('장해')) return '후유장해'
  if (text.includes('치매')) return '치매'
  if (text.includes('치아') || text.includes('화상') || text.includes('골절') || text.includes('깁스')) return '치아/화상/골절'
  return translateCategory(coverage.category) || '기타'
}

function getCoverageSubCategory(coverage: Pick<CoverageRow, 'category' | 'coverage_name' | 'note'>) {
  const text = `${coverage.category} ${coverage.coverage_name} ${coverage.note || ''}`.toLowerCase()
  if (text.includes('일반암')) return '일반암'
  if (text.includes('특정암') || text.includes('고액암')) return text.includes('고액') ? '고액암' : '특정암'
  if (text.includes('유사암') || text.includes('소액암') || text.includes('갑상선')) return text.includes('유사') ? '유사암' : '소액암'
  if (text.includes('암')) return '일반암'
  if (text.includes('뇌졸중')) return '뇌졸중'
  if (text.includes('뇌출혈')) return '뇌출혈'
  if (text.includes('뇌경색')) return '뇌경색'
  if (text.includes('뇌혈관')) return '뇌혈관질환'
  if (text.includes('급성심근')) return '급성심근경색'
  if (text.includes('허혈')) return '허혈성심장질환'
  if (text.includes('부정맥')) return '기타심장질환(부정맥등)'
  if (text.includes('심장')) return '기타심장질환'
  if (text.includes('n대') || /[0-9]+대/.test(text)) return 'N대수술'
  if (text.includes('종수술') || text.includes('1종') || text.includes('2종') || text.includes('3종') || text.includes('4종') || text.includes('5종')) return '종수술'
  if (text.includes('상급')) return '상급'
  if (text.includes('질병') && text.includes('수술')) return '질병수술 일반'
  if (text.includes('상해') && text.includes('수술')) return '상해수술 일반'
  if (text.includes('요양병원') && text.includes('간병')) return '요양병원간병인'
  if (text.includes('상해') && text.includes('간병')) return '상해간병인'
  if (text.includes('질병') && text.includes('간병')) return '질병간병인'
  if (text.includes('간호간병')) return '간호간병통합서비스'
  if (text.includes('간병')) return '기타간병'
  if (text.includes('상급종합')) return '상급종합병원일당'
  if (text.includes('요양병원')) return '요양병원입원일당'
  if (text.includes('상해') && text.includes('입원')) return '상해입원일당'
  if (text.includes('질병') && text.includes('입원')) return '질병입원일당'
  if (text.includes('자부상') || text.includes('자동차부상')) return '자동차부상치료비'
  if (text.includes('처리지원') || text.includes('형사합의')) return '교통사고처리지원금'
  if (text.includes('벌금') && text.includes('대물')) return '벌금대물'
  if (text.includes('벌금')) return '벌금대인'
  if (text.includes('급발진')) return '급발진변호사비'
  if (text.includes('변호사')) return '변호사선임비'
  if (text.includes('화재벌금')) return '화재벌금'
  if (text.includes('일상') && text.includes('배상')) return '일상생활배상책임'
  return '기타'
}

function formatRenewalType(group: PolicyGroup) {
  const text = `${group.product_name} ${group.coverages.map((coverage) => coverage.renewal_type || coverage.coverage_name).join(' ')}`
  if (text.includes('비갱신')) return '비갱신형'
  if (text.includes('갱신')) return '갱신형'
  return '갱신 확인'
}

function formatRenewalTypeFromCoverage(coverage: CoverageRow) {
  const text = `${coverage.renewal_type || ''} ${coverage.coverage_name}`
  if (text.includes('비갱신')) return '비갱신형'
  if (text.includes('갱신')) return '갱신형'
  return '갱신 확인'
}

function getFullAge(birthDate?: string) {
  if (!birthDate) return undefined
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return undefined
  const today = new Date()
  let fullAge = today.getFullYear() - birth.getFullYear()
  const birthdayThisYear = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  if (today < birthdayThisYear) fullAge -= 1
  return fullAge
}

function getAgeGuide(age?: number) {
  if (!age) return { needs: '암·뇌·심장 기본 진단비와 실손 점검', products: '건강보험, 실손, 운전자 기본 구성' }
  if (age < 35) return { needs: '실손, 운전자, 상해·질병수술비 중심', products: '저보험료 비갱신 건강보험, 운전자보험' }
  if (age < 45) return { needs: '암·뇌혈관·심장 진단비와 수술비 균형', products: '3대질병 진단비, 질병수술비, 가족일배책' }
  if (age < 60) return { needs: '치료비, 간병, 입원일당, 갱신형 부담 점검', products: '간병인보험, 암주요치료비, 뇌·심장 확장담보' }
  return { needs: '간병, 치매, 노후 의료비와 납입 부담 점검', products: '간편건강보험, 간병/치매, 실손 유지 점검' }
}

function normalizeCategory(category: any, name?: any) {
  const text = `${category || ''} ${name || ''}`.toLowerCase()
  if (text.includes('similar') || text.includes('유사암') || text.includes('소액암') || text.includes('갑상선')) return 'similar_cancer'
  if (text.includes('cancer') || text.includes('암')) return 'cancer'
  if (text.includes('brain') || text.includes('stroke') || text.includes('뇌')) return 'brain_vascular'
  if (text.includes('heart') || text.includes('심장') || text.includes('허혈') || text.includes('심근')) return 'ischemic_heart'
  if (text.includes('injury') || text.includes('상해')) return 'injury_surgery'
  if (text.includes('surgery') || text.includes('수술')) return 'disease_surgery'
  if (text.includes('hospital') || text.includes('입원') || text.includes('간병')) return 'hospitalization'
  if (text.includes('driver') || text.includes('운전자') || text.includes('교통')) return 'driver'
  return String(category || '').trim()
}

function translateCategory(key: any) {
  const normalized = normalizeCategory(key, key)
  return categoryLabels[normalized] || categoryLabels[String(key)] || String(key || '기타')
}

function translateCoverageName(value: any, category: string) {
  const text = String(value || '').trim()
  if (!text) return '담보명 미확인'
  if (categoryLabels[text]) return categoryLabels[text]
  if (/^[a-z_ -]+$/i.test(text)) return translateCategory(category)
  return text
}

function defaultTargets(): CoverageTargets {
  // 표준 프리셋을 기본값으로 사용
  const base = targetItems.reduce<CoverageTargets>((acc, item) => {
    acc[item.key] = item.defaultAmount
    return acc
  }, {})
  return { ...base, ...TARGET_PRESETS.standard.values }
}

function buildCoverageWorkbook(XLSX: any, {
  customerName,
  advisorName,
  groups,
  targets,
  outputMode,
}: {
  customerName: string
  advisorName: string
  groups: PolicyGroup[]
  targets: CoverageTargets
  outputMode: ReportOutputMode
}) {
  const workbook = XLSX.utils.book_new()
  const today = new Date().toISOString().slice(0, 10)
  const companies = Array.from(new Set(groups.map((group) => group.company || '보험사 미확인')))
  const majorRows = buildMajorCoverageRows(groups, targets)

  const majorSheetRows = [
    ['고객명', customerName, '담당자', advisorName, '작성일', today],
    [],
    ['주요보장', '구성', '총 보장금액(만원)', '권장금액(만원)', '상태', ...companies],
    ...majorRows.map((row) => [
      row.label,
      row.description,
      wonToManwon(row.current),
      wonToManwon(row.target),
      `${row.status} (${row.percent}%)`,
      ...companies.map((company) => wonToManwon(row.companies.find((item) => item.company === company)?.amount || 0)),
    ]),
    [],
    ['준비 필요 항목'],
    ...majorRows
      .filter((row) => row.status !== '충분')
      .map((row) => [row.label, `현재 ${formatCompactWon(row.current)} / 권장 ${formatCompactWon(row.target)}`, row.status]),
  ]
  const majorSheet = XLSX.utils.aoa_to_sheet(majorSheetRows)
  majorSheet['!cols'] = [
    { wch: 16 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    ...companies.map(() => ({ wch: 18 })),
  ]
  XLSX.utils.book_append_sheet(workbook, majorSheet, '주요담보')

  if (outputMode === 'detail') {
    const detailRows = [
      ['고객명', customerName, '담당자', advisorName, '작성일', today],
      [],
      ['보험사', '상품명', '가입일', '납부기간', '만기', '월보험료(만원)', '분류', '세부분류', '담보명', '보장금액(만원)', '갱신구분', '보상방식', '내용'],
      ...groups.flatMap((group) => group.coverages.length > 0
        ? group.coverages.map((coverage) => [
          group.company,
          group.product_name,
          group.start_date || '',
          group.payment_period || '',
          formatMaturity(group),
          wonToManwon(group.premium || 0),
          translateCategory(coverage.category),
          coverage.sub_category || getCoverageSubCategory(coverage),
          coverage.coverage_name,
          wonToManwon(coverage.amount || 0),
          coverage.renewal_type || formatRenewalTypeFromCoverage(coverage),
          coverage.payment_method_type || getCoveragePaymentType(coverage),
          coverage.note || '',
        ])
        : [[group.company, group.product_name, group.start_date || '', group.payment_period || '', formatMaturity(group), wonToManwon(group.premium || 0), '', '', '담보 상세 없음', '', '', '', '']]),
    ]
    const detailSheet = XLSX.utils.aoa_to_sheet(detailRows)
    detailSheet['!cols'] = [
      { wch: 14 },
      { wch: 34 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 42 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 36 },
    ]
    XLSX.utils.book_append_sheet(workbook, detailSheet, '상세담보')
  }

  return workbook
}

function wonToManwon(value?: number) {
  return value ? Math.round(value / MANWON_TO_WON) : 0
}

function firstArray(...values: any[]) {
  const found = values.find((value) => Array.isArray(value))
  return found || []
}

function toList(value: any): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean)
  if (!value) return []
  return [String(value)]
}

function numberOrUndefined(value: any) {
  const number = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function moneyMultiplierForSource(data: any) {
  const unitText = `${data?.version || ''} ${data?.amount_unit || ''} ${data?.money_unit || ''}`.toLowerCase()
  // insurance_analysis_v3/v4 등 모든 GPTs 버전은 만원 단위로 저장됨
  if (
    unitText.includes('insurance_analysis_v') ||
    unitText.includes('만원') ||
    unitText.includes('manwon')
  ) return MANWON_TO_WON
  return 1
}

function moneyValue(value: any, multiplier = 1) {
  const number = numberOrUndefined(value)
  return number ? number * multiplier : undefined
}

function premiumMoneyValue(value: any, multiplier = 1) {
  return moneyValue(value, multiplier)
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function formatWon(value?: number) {
  return value ? `${Number(value).toLocaleString()}원` : '-'
}

function formatCompactWon(value?: number) {
  if (!value) return '0원'
  if (value >= 100_000_000) return `${Number((value / 100_000_000).toFixed(1)).toLocaleString()}억`
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만`
  return `${value.toLocaleString()}원`
}

function formatMaturity(group: PolicyGroup) {
  const value = group.maturity_age || group.maturity
  if (!value) return '-'
  const text = String(value).trim()
  if (!text) return '-'
  if (text.includes('세')) return text
  if (/^\d+$/.test(text)) return `${text}세`
  return text
}

function formatCustomerAge(birthDate?: string) {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return ''

  const today = new Date()
  let fullAge = today.getFullYear() - birth.getFullYear()
  const birthdayThisYear = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  if (today < birthdayThisYear) fullAge -= 1

  const lastBirthday = today >= birthdayThisYear
    ? birthdayThisYear
    : new Date(today.getFullYear() - 1, birth.getMonth(), birth.getDate())
  const daysAfterBirthday = Math.floor((today.getTime() - lastBirthday.getTime()) / (1000 * 60 * 60 * 24))
  const insuranceAge = fullAge + (daysAfterBirthday >= 183 ? 1 : 0)

  return `(만 ${fullAge}세 · 보험나이 ${insuranceAge}세)`
}

function normalizeName(value: any) {
  return String(value ?? '').replace(/\s/g, '').trim()
}

function normalizeFileName(value: any) {
  return String(value ?? '고객').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').trim() || '고객'
}
