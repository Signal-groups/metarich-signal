'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import type { jsPDF as JsPDFType } from 'jspdf'

const UPLOAD_STORAGE_KEY = 'signal-crm-upload-files'
const TARGET_STORAGE_KEY = 'signal-crm-coverage-targets'

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

const targetItems = [
  { key: 'cancer', label: '암 진단비', aliases: ['암', '일반암', '고액암', '통합암', 'cancer'], defaultAmount: 50_000_000 },
  { key: 'similar_cancer', label: '유사암', aliases: ['유사암', '소액암', '갑상선', '기타피부암', 'similar'], defaultAmount: 10_000_000 },
  { key: 'brain_vascular', label: '뇌혈관', aliases: ['뇌혈관', '뇌졸중', '뇌출혈', 'brain', 'stroke'], defaultAmount: 30_000_000 },
  { key: 'ischemic_heart', label: '심장', aliases: ['허혈성', '심장', '급성심근경색', 'heart'], defaultAmount: 30_000_000 },
  { key: 'disease_surgery', label: '질병수술', aliases: ['질병수술', '수술비', 'surgery'], defaultAmount: 1_000_000 },
  { key: 'injury_surgery', label: '상해수술', aliases: ['상해수술', '상해', 'injury'], defaultAmount: 1_000_000 },
  { key: 'hospitalization', label: '입원/간병', aliases: ['입원', '간병', '일당', 'hospital'], defaultAmount: 100_000 },
  { key: 'driver', label: '운전자', aliases: ['운전자', '교통사고', '벌금', '변호사', '합의금', 'driver'], defaultAmount: 200_000_000 },
]

const coverageDescriptions: Record<string, string> = {
  cancer: '암 진단 시 치료비와 회복 기간의 생활비 부담을 줄이기 위한 핵심 진단자금입니다.',
  similar_cancer: '갑상선암, 기타피부암 등 비교적 소액으로 분류되는 암 보장을 따로 확인하는 항목입니다.',
  brain_vascular: '뇌출혈·뇌졸중보다 넓은 범위의 뇌혈관 질환까지 준비했는지 보는 항목입니다.',
  ischemic_heart: '협심증, 급성심근경색 등 심장질환 진단 시 필요한 치료자금을 확인합니다.',
  disease_surgery: '질병으로 수술할 때 반복적으로 발생할 수 있는 수술비 보장입니다.',
  injury_surgery: '상해 사고로 수술할 때 치료비 부담을 줄여주는 보장입니다.',
  hospitalization: '입원일당과 간병비처럼 치료 기간 중 매일 발생하는 비용을 대비하는 항목입니다.',
  driver: '교통사고 처리지원금, 변호사 선임비, 벌금 등 운전자 법률 비용을 확인합니다.',
}

type UploadItem = {
  id: string
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

export default function AnalysisPage() {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [dbPolicies, setDbPolicies] = useState<any[]>([])
  const [dbCoverages, setDbCoverages] = useState<any[]>([])
  const [openAnalysis, setOpenAnalysis] = useState<Record<string, boolean>>({})
  const [selectedGroup, setSelectedGroup] = useState<PolicyGroup | null>(null)
  const [editingContract, setEditingContract] = useState<{ itemId?: string; index?: number; group: PolicyGroup } | null>(null)
  const [advisor, setAdvisor] = useState({ name: '담당자', phone: '' })
  const [targets, setTargets] = useState<CoverageTargets>(() => defaultTargets())
  const [savingReport, setSavingReport] = useState(false)
  const reportRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

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
      setUploadItems(savedUploads ? JSON.parse(savedUploads) : [])
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
      const [policyRes, coverageRes] = await Promise.all([
        supabase.from('policies').select('*').eq('customer_id', selectedCustomerId).order('start_date', { ascending: false }),
        supabase.from('coverages').select('*').eq('customer_id', selectedCustomerId),
      ])
      setDbPolicies(policyRes.data || [])
      setDbCoverages(coverageRes.data || [])
    }
    loadCustomerDetails()
  }, [selectedCustomerId])

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId)

  const customerAnalyses = useMemo(() => {
    if (!selectedCustomer) return []
    return uploadItems
      .filter((item) => item.category === '보장분석' || item.structuredAnalysis)
      .filter((item) => {
        if (item.customerId && item.customerId === selectedCustomer.id) return true
        if (!item.customerId && item.customerName && normalizeName(item.customerName) === normalizeName(selectedCustomer.name)) return true
        return false
      })
      .map((item) => ({ ...item, normalized: normalizeAnalysis(item.structuredAnalysis, item.name) }))
  }, [selectedCustomer, uploadItems])

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

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as JsPDFType
      for (const [index, page] of pages.entries()) {
        const canvas = await html2canvas(page, {
          backgroundColor: '#eef3f8',
          scale: 2,
          useCORS: true,
          logging: false,
        })
        if (index > 0) pdf.addPage('a4', 'landscape')
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210, undefined, 'FAST')
      }
      const customerName = normalizeFileName(selectedCustomer.name || '고객')
      const today = new Date().toISOString().slice(0, 10)
      pdf.save(`보장분석_가로A4_${customerName}_${today}.pdf`)
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

          <CoverageTargetEditor targets={targets} onChange={setTargets} />

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

function CoverageTargetEditor({ targets, onChange }: { targets: CoverageTargets; onChange: (targets: CoverageTargets) => void }) {
  const setAmountByManwon = (key: string, value: string) => {
    const amount = Number(value.replace(/[^\d]/g, '')) * 10_000
    onChange({ ...targets, [key]: amount })
  }

  const reset = () => onChange(defaultTargets())

  return (
    <div className="card card-p coverage-target-editor">
      <div className="flex justify-between items-center" style={{ gap: 12, marginBottom: 12 }}>
        <div>
          <div className="card-title">권장 금액 설정</div>
          <div className="text-muted" style={{ fontSize: 12 }}>설정한 금액을 기준으로 현재 보장률을 세로막대와 퍼센트로 표시합니다.</div>
        </div>
        <button className="btn btn-secondary btn-xs" onClick={reset}>기본값</button>
      </div>
      <div className="target-input-grid">
        {targetItems.map((item) => (
          <label key={item.key} className="target-input">
            <span>{item.label}</span>
            <div>
              <input
                value={Math.round((targets[item.key] || 0) / 10_000)}
                onChange={(event) => setAmountByManwon(item.key, event.target.value)}
                inputMode="numeric"
              />
              <b>만원</b>
            </div>
          </label>
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
}: {
  reportRef: { current: HTMLDivElement | null }
  customer: any
  analysis: any
  groups: PolicyGroup[]
  targets: CoverageTargets
  strengths: string[]
  advisor: { name: string; phone: string }
}) {
  const rows = buildCoverageRows(groups, targets)
  const premiumTotal = analysis?.monthlyPremium || sum(groups.map((group) => group.premium || 0))
  const paidTotal = analysis?.paidPremiumTotal || sum(groups.map((group) => group.paid_premium_total || 0))
  const remainingTotal = analysis?.remainingPremiumTotal || sum(groups.map((group) => group.remaining_premium_total || 0))
  const companyNames = Array.from(new Set(groups.map((group) => group.company).filter(Boolean)))
  const topCoverages = groups.flatMap((group) => group.coverages.map((coverage) => ({
    ...coverage,
    company: coverage.company || group.company,
    product_name: coverage.product_name || group.product_name,
  }))).filter((coverage) => coverage.amount).sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 8)
  const weakRows = rows.filter((row) => row.percent < 100).slice(0, 4)

  if (rows.length === 0 && groups.length === 0) return null

  return (
    <div className="landscape-report-wrap">
      <div className="landscape-report-toolbar">
        <div>
          <div className="fw-700 text-blue">가로 저장 미리보기</div>
          <div className="text-muted" style={{ fontSize: 12 }}>표지, 고객 안내용, 설계사 점검용을 가로 A4 PDF로 저장합니다.</div>
        </div>
      </div>

      <div ref={reportRef} className="landscape-report-preview">
        <section className="report-sheet report-cover report-pdf-page">
          <div className="report-cover-brand">보험의 기준</div>
          <div className="report-cover-content">
            <div className="report-cover-kicker">COVERAGE ANALYSIS REPORT</div>
            <h1>{customer.name || analysis?.customerName || '고객'}님<br />보장 분석</h1>
            <p>현재 가입 보험의 보험료, 납입 현황, 주요 담보를 상담용으로 깔끔하게 정리했습니다.</p>
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
              <p>현재 준비된 보장을 권장금액과 비교해 보기 쉽게 정리했습니다.</p>
            </div>
            <div className="report-customer-box">
              <b>{formatCustomerAge(customer.birth_date).replace(/[()]/g, '') || '나이 미확인'}</b>
              <span>{companyNames.join(' · ') || '보험사 미확인'}</span>
              <strong>월 납입 {formatWon(premiumTotal)}</strong>
            </div>
          </div>

          <div className="report-grid client-grid">
            <div className="report-panel report-wide">
              <div className="report-panel-title">권장금액 대비 준비 현황</div>
              <div className="report-bar-list">
                {rows.map((row) => <ReportBar key={row.key} row={row} />)}
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
              {rows.slice(0, 6).map((row) => (
                <div key={`explain-${row.key}`} className="coverage-explain-card">
                  <b>{row.label}</b>
                  <span>{coverageDescriptions[row.key] || '상담 시 보장 범위와 지급 조건을 함께 확인해야 하는 항목입니다.'}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="report-sheet report-advisor report-pdf-page">
          <div className="report-topline">
            <div>
              <div className="report-kicker">설계사 점검용</div>
              <h2>회사별 보험료와 담보 상세</h2>
              <p>상담 전 확인해야 할 보험료, 납입 현황, 부족 보장을 한 화면에 모았습니다.</p>
            </div>
            <div className="report-customer-box">
              <b>계약 {analysis?.contractCount || groups.length || 0}건</b>
              <span>현재까지 납부 {formatWon(paidTotal)}</span>
              <strong>남은 보험료 {formatWon(remainingTotal)}</strong>
            </div>
          </div>

          <div className="report-grid advisor-grid">
            <div className="report-panel">
              <div className="report-panel-title">회사별 계약</div>
              <div className="report-company-list">
                {groups.slice(0, 6).map((group) => (
                  <div key={`report-${group.key}`} className="report-company-item">
                    <div>
                      <b>{group.company}</b>
                      <span>{group.product_name}</span>
                    </div>
                    <strong>{formatWon(group.premium)}</strong>
                    <small>가입 {group.start_date || '-'} · 납부 {group.payment_period || '-'} · 만기 {formatMaturity(group)}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-panel">
              <div className="report-panel-title">우선 보완 후보</div>
              <div className="report-gap-list">
                {(weakRows.length ? weakRows : rows.slice(0, 4)).map((row) => (
                  <div key={`gap-${row.key}`} className="report-gap-item">
                    <b>{row.label}</b>
                    <span>{row.percent}%</span>
                    <small>현재 {formatCompactWon(row.current)} / 권장 {formatCompactWon(row.target)}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-panel report-wide">
              <div className="report-panel-title">주요 담보 상세</div>
              <div className="report-table">
                <div className="report-table-head">
                  <span>보험사</span><span>분류</span><span>담보명</span><span>가입금액</span>
                </div>
                {topCoverages.map((coverage, index) => (
                  <div key={`${coverage.coverage_name}-${index}`} className="report-table-row">
                    <span>{coverage.company || '-'}</span>
                    <span>{translateCategory(coverage.category)}</span>
                    <span>{coverage.coverage_name}</span>
                    <span>{formatWon(coverage.amount)}</span>
                  </div>
                ))}
                {topCoverages.length === 0 && <div className="report-table-empty">담보 상세가 없습니다.</div>}
              </div>
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
  const companies = Array.from(new Set(groups.map((group) => group.company).filter(Boolean)))
  return {
    customerName: customer.name || data?.customer_name || extracted.insured_name || fallbackName.replace('-GPTs-보장분석.json', ''),
    monthlyPremium: numberOrUndefined(customer.monthly_premium || data?.monthly_premium) || sum(groups.map((group) => group.premium || 0)),
    paidPremiumTotal: numberOrUndefined(data?.premium_summary?.paid_total || data?.paid_premium_total || data?.total_paid_premium) || sum(groups.map((group) => group.paid_premium_total || 0)),
    remainingPremiumTotal: numberOrUndefined(data?.premium_summary?.remaining_total || data?.remaining_premium_total || data?.total_remaining_premium) || sum(groups.map((group) => group.remaining_premium_total || 0)),
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
  const policies = firstArray(data?.policies, data?.contracts)
  policies.forEach((policy: any, index: number) => {
    groups.push({
      key: `policy-${index}`,
      company: policy.company || policy.insurer || '보험사 미확인',
      product_name: policy.product_name || policy.product || policy.name || '상품명 미확인',
      premium: numberOrUndefined(policy.premium || policy.monthly_premium),
      start_date: policy.start_date,
      payment_period: policy.payment_period,
      maturity: policy.maturity || policy.end_date,
      maturity_age: policy.maturity_age || policy.maturity_age_text,
      paid_premium_total: numberOrUndefined(policy.paid_premium_total || policy.total_paid_premium || policy.paid_total),
      remaining_premium_total: numberOrUndefined(policy.remaining_premium_total || policy.total_remaining_premium || policy.remaining_total),
      coverages: normalizeCoverages(policy.coverages || policy.coverage || [], policy.company, policy.product_name || policy.product),
    })
  })

  const products = firstArray(data?.products, data?.extracted?.products)
  products.forEach((product: any, index: number) => {
    groups.push({
      key: `product-${index}`,
      company: product.company || data?.extracted?.company || '보험사 미확인',
      product_name: product.product_name || product.name || '상품명 미확인',
      premium: numberOrUndefined(product.premium || product.monthly_premium),
      start_date: product.start_date,
      payment_period: product.payment_period,
      maturity: product.maturity || product.end_date,
      maturity_age: product.maturity_age || product.maturity_age_text,
      paid_premium_total: numberOrUndefined(product.paid_premium_total || product.total_paid_premium || product.paid_total),
      remaining_premium_total: numberOrUndefined(product.remaining_premium_total || product.total_remaining_premium || product.remaining_total),
      coverages: normalizeCoverages(product.coverages || [], product.company || data?.extracted?.company, product.product_name || product.name),
    })
  })

  const extractedCoverages = normalizeCoverages(data?.extracted?.coverages || [], data?.extracted?.company, data?.extracted?.product_names?.[0])
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
      amount: numberOrUndefined(value) || 0,
      unit: '원',
      note: 'GPTs 요약 보장금액',
    }))
  if (summaryCoverages.length > 0) {
    groups.push({
      key: 'summary',
      company: '전체 요약',
      product_name: '담보 요약',
      coverages: summaryCoverages,
    })
  }

  return groups.filter((group) => group.company || group.product_name || group.coverages.length > 0)
}

function normalizeCoverages(value: any, company?: string, productName?: string): CoverageRow[] {
  return firstArray(value).map((coverage: any) => {
    const rawCategory = coverage.category || coverage.type || ''
    const rawName = coverage.coverage_name || coverage.name || coverage.title || rawCategory || '담보명 미확인'
    const category = normalizeCategory(rawCategory, rawName)
    return {
      category,
      sub_category: coverage.coverage_sub_category || coverage.sub_category || getCoverageSubCategory({ category, coverage_name: rawName, note: coverage.note || coverage.description || coverage.condition || '' }),
      coverage_name: translateCoverageName(rawName, category),
      amount: numberOrUndefined(coverage.amount || coverage.coverage_amount || coverage.value),
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
  return targetItems.reduce<CoverageTargets>((acc, item) => {
    acc[item.key] = item.defaultAmount
    return acc
  }, {})
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
