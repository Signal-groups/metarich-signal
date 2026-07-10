'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { inferClientRowKey } from '../../../lib/coverageAnalysis/clientMapping'
import type { ProContract, ProCustomer, ProCoverage } from '../../../lib/coverageAnalysis/types'

type CustomerRow = {
  id: string
  name?: string
  birth_date?: string
  gender?: string
  phone?: string
}

type PolicyRow = {
  id?: string
  company?: string
  product_name?: string
  product?: string
  policy_holder?: string
  insured?: string
  start_date?: string
  contract_date?: string
  payment_period?: string
  payment_term?: string
  monthly_premium?: number
  premium?: number
  renewal_type?: string
  status?: 'active' | 'lapsed' | 'expired'
  policy_status?: 'active' | 'lapsed' | 'expired'
}

type CoverageRow = {
  id?: string
  policy_id?: string
  company?: string
  coverage_name?: string
  name?: string
  condition?: string
  amount?: number
  end_date?: string
  expiry_date?: string
  maturity?: string
  renewal_type?: string
  note?: string
}

function isRenewalText(...values: Array<string | undefined>): boolean {
  const text = values.join(' ').toLowerCase()
  if (!text.trim()) return false
  if (text.includes('비갱신') || text.includes('nonrenewal') || text.includes('non-renewal')) return false
  return text.includes('갱신') || text.includes('renewal')
}

export default function CustomerSelector({
  selectedCustomer,
  requestedCustomerId,
  onLoaded,
}: {
  selectedCustomer?: ProCustomer
  requestedCustomerId?: string
  onLoaded: (payload: { customer: ProCustomer; contracts: ProContract[] }) => void
}) {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [customerId, setCustomerId] = useState(selectedCustomer?.id || requestedCustomerId || '')
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const autoLoadedRef = useRef(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('advisor_id', session.user.id)
        .is('deleted_at', null)
        .order('join_date', { ascending: false })
      setCustomers(data || [])
    }
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((customer) =>
      String(customer.name || '').toLowerCase().includes(q)
      || String(customer.phone || '').toLowerCase().includes(q)
    )
  }, [customers, keyword])

  const loadCustomer = useCallback(async (targetId = customerId) => {
    if (!targetId) return
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    const [{ data: customer }, { data: policies }, { data: coverages }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', targetId).eq('advisor_id', session.user.id).single(),
      supabase.from('policies').select('*').eq('customer_id', targetId).order('start_date', { ascending: false }),
      supabase.from('coverages').select('*').eq('customer_id', targetId),
    ])

    if (customer) {
      onLoaded({
        customer: {
          id: customer.id,
          name: customer.name || '고객',
          birth: customer.birth_date || '',
          gender: customer.gender === 'M' || customer.gender === 'F' ? customer.gender : undefined,
          phone: customer.phone || '',
          advisorId: session.user.id,
        },
        contracts: mapCrmRowsToContracts(customer, policies || [], coverages || []),
      })
    }
    setLoading(false)
  }, [customerId, onLoaded])

  useEffect(() => {
    if (!requestedCustomerId || autoLoadedRef.current) return
    autoLoadedRef.current = true
    const timer = window.setTimeout(() => {
      void loadCustomer(requestedCustomerId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadCustomer, requestedCustomerId])

  return (
    <div className="coverage-pro-card coverage-pro-card-pad">
      <div className="coverage-pro-section-title">CRM 고객 불러오기</div>
      <div className="coverage-pro-grid-2">
        <div className="coverage-pro-field">
          <label>고객 검색</label>
          <input
            className="coverage-pro-input"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="고객명 또는 연락처"
          />
        </div>
        <div className="coverage-pro-field">
          <label>고객 선택</label>
          <select className="coverage-pro-select" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">고객을 선택하세요</option>
            {filtered.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.phone ? `(${customer.phone})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 14 }}>
        <div className="coverage-pro-muted">
          CRM의 고객, 보험계약, 담보 데이터를 읽어 분석 세션으로 복사합니다. 원본 CRM 데이터는 변경하지 않습니다.
        </div>
        <button type="button" className="coverage-pro-btn primary" disabled={!customerId || loading} onClick={() => loadCustomer()}>
          {loading ? '불러오는 중' : '선택 고객 불러오기'}
        </button>
      </div>
    </div>
  )
}

function mapCrmRowsToContracts(customer: CustomerRow, policies: PolicyRow[], coverages: CoverageRow[]): ProContract[] {
  const fallbackPolicy: PolicyRow = {
    id: 'manual',
    company: '기타',
    product_name: '미분류 담보',
    monthly_premium: 0,
  }
  const effectivePolicies = policies.length ? policies : [fallbackPolicy]

  const coverageByPolicy = new Map<string, ProCoverage[]>()
  coverages.forEach((coverage, index) => {
    const policyId = String(coverage.policy_id || (coverage.company ? findPolicyIdByCompany(effectivePolicies, coverage.company) : '') || effectivePolicies[0]?.id || 'manual')
    const name = String(coverage.coverage_name || coverage.name || coverage.condition || '담보명 미확인')
    const rowKey = inferClientRowKey(name) || 'unknown'
    const item: ProCoverage = {
      id: String(coverage.id || `coverage-${index}`),
      contractId: policyId,
      rowKey,
      name,
      amount: Number(coverage.amount || 0),
      expiryDate: coverage.end_date || coverage.expiry_date || coverage.maturity || '',
      isRenewal: isRenewalText(coverage.renewal_type, coverage.note),
    }
    const list = coverageByPolicy.get(policyId) || []
    list.push(item)
    coverageByPolicy.set(policyId, list)
  })

  return effectivePolicies.map((policy) => {
    const id = String(policy.id || 'manual')
    return {
      id,
      customerId: customer.id,
      company: policy.company || '보험사 미확인',
      productName: policy.product_name || policy.product || '상품명 미확인',
      policyHolder: policy.policy_holder || customer.name || '',
      insured: policy.insured || customer.name || '',
      contractDate: policy.start_date || policy.contract_date || '',
      paymentPeriod: policy.payment_period || policy.payment_term || '',
      monthlyPremium: Number(policy.monthly_premium || policy.premium || 0),
      isRenewal: isRenewalText(policy.renewal_type),
      status: (policy.status || policy.policy_status || 'active') as 'active' | 'lapsed' | 'expired',
      coverages: coverageByPolicy.get(id) || [],
    }
  })
}

function findPolicyIdByCompany(policies: PolicyRow[], company: string): string {
  const found = policies.find((p) => String(p.company || '').includes(company))
  return String(found?.id || '')
}
