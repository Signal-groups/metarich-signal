'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

const UPLOAD_STORAGE_KEY = 'signal-crm-upload-files'

const categoryLabels: Record<string, string> = {
  cancer: '암',
  similar_cancer: '유사암',
  brain: '뇌',
  brain_vascular: '뇌혈관',
  heart: '심장',
  ischemic_heart: '허혈성심장질환',
  surgery: '수술',
  disease_surgery: '질병수술',
  injury_surgery: '상해수술',
  hospitalization: '입원',
  nursing: '간병',
  driver: '운전자',
  fire: '화재',
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
  coverage_name: string
  amount?: number
  unit?: string
  note?: string
  company?: string
  product_name?: string
}

type PolicyGroup = {
  key: string
  company: string
  product_name: string
  premium?: number
  start_date?: string
  payment_period?: string
  maturity?: string
  coverages: CoverageRow[]
}

export default function AnalysisPage() {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [dbPolicies, setDbPolicies] = useState<any[]>([])
  const [dbCoverages, setDbCoverages] = useState<any[]>([])
  const [openAnalysis, setOpenAnalysis] = useState<Record<string, boolean>>({})
  const [openGroup, setOpenGroup] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

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
      const saved = window.localStorage.getItem(UPLOAD_STORAGE_KEY)
      setUploadItems(saved ? JSON.parse(saved) : [])
    } catch {
      setUploadItems([])
    }
  }, [])

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
      .map((item) => ({
        ...item,
        normalized: normalizeAnalysis(item.structuredAnalysis, item.name),
      }))
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
        maturity: policy.end_date,
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
        category: coverage.category,
        coverage_name: categoryLabels[coverage.category] || coverage.category,
        amount: coverage.amount || 0,
        unit: '원',
        note: coverage.note || '',
      })
    })
    return Object.values(byPolicy)
  }, [dbPolicies, dbCoverages])

  const hasAnyData = customerAnalyses.length > 0 || dbPolicyGroups.length > 0

  const toggleAnalysis = (id: string) => setOpenAnalysis((prev) => ({ ...prev, [id]: !prev[id] }))
  const toggleGroup = (id: string) => setOpenGroup((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">보장분석</div>
          <div className="page-subtitle">고객을 선택해 업로드 분석 결과와 회사별 담보 내용을 확인합니다.</div>
        </div>
        <Link href="/crm/upload" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>업로드 분석으로 이동</Link>
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
                <div className="fw-700 text-blue" style={{ fontSize: 20 }}>{selectedCustomer?.name || '선택 필요'}</div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                  GPTs 분석 {customerAnalyses.length}건 · 등록 담보 {dbCoverages.length}건
                </div>
              </div>
            </div>
          </div>

          {!hasAnyData && (
            <div className="card card-p" style={{ textAlign: 'center', padding: 50 }}>
              <div className="card-title">연결된 보장분석 자료가 없습니다.</div>
              <div className="page-subtitle" style={{ marginBottom: 18 }}>
                업로드 분석에서 고객을 선택한 뒤 GPTs JSON 코드를 붙여넣고 분석 적용하기를 눌러주세요.
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
                <button className="btn btn-primary btn-sm" onClick={() => toggleAnalysis(item.id)}>
                  {openAnalysis[item.id] ? '상세 닫기' : '상세 보기'}
                </button>
              </div>

              <div className="grid-3" style={{ marginTop: 16 }}>
                <MiniInfo label="계약 건수" value={item.normalized.contractCount ? `${item.normalized.contractCount}건` : '-'} />
                <MiniInfo label="보험사" value={item.normalized.companies.join(', ') || '-'} />
                <MiniInfo label="주요 보완" value={item.normalized.weaknesses.slice(0, 2).join(', ') || '-'} />
              </div>

              {openAnalysis[item.id] && (
                <div style={{ marginTop: 18 }}>
                  <SectionTitle title="회사별 담보" />
                  {item.normalized.groups.length > 0 ? item.normalized.groups.map((group: PolicyGroup) => (
                    <PolicyGroupCard key={`${item.id}-${group.key}`} group={group} isOpen={!!openGroup[`${item.id}-${group.key}`]} onToggle={() => toggleGroup(`${item.id}-${group.key}`)} />
                  )) : <EmptyState text="회사별 담보 상세가 없습니다. GPTs 출력에 policies/products coverages 항목을 포함하면 더 자세히 표시됩니다." />}

                  <div className="grid-2" style={{ marginTop: 14 }}>
                    <ListPanel title="강점" items={item.normalized.strengths} />
                    <ListPanel title="부족/확인 필요" items={item.normalized.weaknesses} />
                    <ListPanel title="추천 방향" items={item.normalized.recommendations} />
                    <ListPanel title="주의사항" items={item.normalized.cautions} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {dbPolicyGroups.length > 0 && (
            <div className="card card-p">
              <SectionTitle title="직접 등록된 보험계약/담보" />
              {dbPolicyGroups.map((group) => (
                <PolicyGroupCard key={group.key} group={group} isOpen={!!openGroup[group.key]} onToggle={() => toggleGroup(group.key)} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

function normalizeAnalysis(data: any, fallbackName = '') {
  const customer = data?.customer || {}
  const analysis = data?.analysis || {}
  const extracted = data?.extracted || {}
  const groups = normalizePolicyGroups(data)
  const companies = Array.from(new Set(groups.map((group) => group.company).filter(Boolean)))
  return {
    customerName: customer.name || data?.customer_name || extracted.insured_name || fallbackName.replace('-GPTs-보장분석.json', ''),
    monthlyPremium: customer.monthly_premium || data?.monthly_premium || sum(groups.map((group) => group.premium || 0)),
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
      category: key,
      coverage_name: categoryLabels[key] || key,
      amount: Number(value) || 0,
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

  return mergeEmptyGroups(groups)
}

function normalizeCoverages(value: any, company?: string, productName?: string): CoverageRow[] {
  return firstArray(value).map((coverage: any) => ({
    category: coverage.category || coverage.type || '',
    coverage_name: coverage.coverage_name || coverage.name || coverage.title || coverage.category || '담보명 미확인',
    amount: numberOrUndefined(coverage.amount || coverage.coverage_amount || coverage.value),
    unit: coverage.unit || '원',
    note: coverage.note || coverage.description || coverage.condition || '',
    company,
    product_name: productName,
  }))
}

function mergeEmptyGroups(groups: PolicyGroup[]) {
  return groups.filter((group) => group.company || group.product_name || group.coverages.length > 0)
}

function PolicyGroupCard({ group, isOpen, onToggle }: { group: PolicyGroup; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="bg-gray rounded p-16" style={{ marginBottom: 10 }}>
      <div className="flex justify-between items-center" style={{ gap: 10 }}>
        <div>
          <div className="fw-700" style={{ fontSize: 14 }}>{group.company} · {group.product_name}</div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
            {group.premium ? `월 ${formatWon(group.premium)} · ` : ''}{group.start_date || '-'} {group.maturity ? `~ ${group.maturity}` : ''}
          </div>
        </div>
        <button className="btn btn-secondary btn-xs" onClick={onToggle}>{isOpen ? '닫기' : `담보 ${group.coverages.length}개`}</button>
      </div>

      {isOpen && (
        <div className="tbl-wrap" style={{ marginTop: 12 }}>
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
                  <td><span className="badge badge-blue">{categoryLabels[coverage.category] || coverage.category || '기타'}</span></td>
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
      )}
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

function normalizeName(value: any) {
  return String(value ?? '').replace(/\s/g, '').trim()
}
