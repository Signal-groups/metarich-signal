/* eslint-disable @typescript-eslint/no-explicit-any */

export type PersistedUploadItem = {
  id: string
  ownerId?: string
  name: string
  size: number
  type: string
  category: string
  date: string
  status: 'pending' | 'analyzing' | 'done'
  memo: string
  customerId: string
  customerName: string
  driveUrl: string
  includeInReport: boolean
  hasLocalFile: boolean
  localFileType: string
  analysisResult?: string
  analysisStatus?: 'idle' | 'running' | 'done' | 'error'
  structuredAnalysis?: any
  remoteAnalysisId?: string
}

type SaveAnalysisParams = {
  advisorId: string
  customerId: string
  customerName: string
  fileName: string
  summary: string
  structuredAnalysis: any
}

export async function fetchUploadAnalyses(supabase: any, advisorId: string, customerId?: string) {
  if (!advisorId) return []

  let query = supabase
    .from('upload_analyses')
    .select('*')
    .eq('advisor_id', advisorId)
    .order('created_at', { ascending: false })

  if (customerId) query = query.eq('customer_id', customerId)

  const { data, error } = await query
  if (error) {
    console.warn('Failed to fetch upload analyses', error.message)
    return []
  }

  return Array.isArray(data) ? data.map(analysisRowToUploadItem) : []
}

export async function saveGptsAnalysisToSupabase(supabase: any, params: SaveAnalysisParams) {
  const structured = params.structuredAnalysis || {}

  const { data: existing } = await supabase
    .from('upload_analyses')
    .select('id')
    .eq('advisor_id', params.advisorId)
    .eq('customer_id', params.customerId)
    .eq('source', 'gpts')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let data: any
  let error: any

  if (existing?.id) {
    const result = await supabase
      .from('upload_analyses')
      .update({
        customer_name: params.customerName,
        file_name: params.fileName,
        summary: params.summary,
        structured_json: structured,
        version: structured.version || 'unknown',
        created_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('*')
      .single()
    data = result.data
    error = result.error
  } else {
    const result = await supabase
      .from('upload_analyses')
      .insert({
        advisor_id: params.advisorId,
        customer_id: params.customerId,
        customer_name: params.customerName,
        file_name: params.fileName,
        summary: params.summary,
        structured_json: structured,
        source: 'gpts',
        version: structured.version || 'unknown',
      })
      .select('*')
      .single()
    data = result.data
    error = result.error
  }

  if (error) {
    console.warn('Failed to save upload analysis', error.message)
    return { ok: false, error }
  }

  await replacePolicyRowsFromAnalysis(supabase, {
    advisorId: params.advisorId,
    customerId: params.customerId,
    analysisId: data.id,
    structuredAnalysis: structured,
  })

  await syncCustomerFromAnalysis(supabase, {
    customerId: params.customerId,
    structuredAnalysis: structured,
  })

  return { ok: true, data: analysisRowToUploadItem(data) }
}

export function analysisRowToUploadItem(row: any): PersistedUploadItem {
  const structured = row?.structured_json || row?.structuredAnalysis || {}
  const summary = row?.summary || formatAnalysisSummary(structured)
  const customerName = row?.customer_name || structured?.customer?.name || structured?.customer_name || '보장분석'

  return {
    id: `remote-analysis-${row.id}`,
    remoteAnalysisId: row.id,
    ownerId: row.advisor_id,
    name: row.file_name || `${customerName}-GPTs-보장분석.json`,
    size: new Blob([JSON.stringify(structured)]).size,
    type: 'application/json',
    category: '보장분석',
    date: String(row.created_at || new Date().toISOString()).slice(0, 10),
    status: 'done',
    memo: firstLine(summary),
    customerId: row.customer_id || '',
    customerName,
    driveUrl: '',
    includeInReport: true,
    hasLocalFile: false,
    localFileType: 'application/json',
    analysisStatus: 'done',
    analysisResult: summary,
    structuredAnalysis: structured,
  }
}

export function mergeAnalysisItems<T extends { id: string; remoteAnalysisId?: string }>(primary: T[], fallback: T[]) {
  const seen = new Set<string>()
  const result: T[] = []
  ;[...primary, ...fallback].forEach((item) => {
    const key = item.remoteAnalysisId || item.id
    if (seen.has(key)) return
    seen.add(key)
    result.push(item)
  })
  return result
}

async function replacePolicyRowsFromAnalysis(supabase: any, params: {
  advisorId: string
  customerId: string
  analysisId: string
  structuredAnalysis: any
}) {
  const groups = extractPolicyGroups(params.structuredAnalysis)
  if (groups.length === 0) return

  const { data: existingPolicies } = await supabase
    .from('policies')
    .select('id')
    .eq('advisor_id', params.advisorId)
    .eq('customer_id', params.customerId)
    .eq('source_type', 'gpts')

  if (Array.isArray(existingPolicies) && existingPolicies.length > 0) {
    const existingIds = existingPolicies.map((policy: any) => policy.id)
    await supabase.from('coverages').delete().in('policy_id', existingIds)
    await supabase.from('policies').delete().in('id', existingIds)
  }

  await supabase
    .from('coverages')
    .delete()
    .eq('advisor_id', params.advisorId)
    .eq('customer_id', params.customerId)
    .eq('source_type', 'gpts')
    .is('policy_id', null)

  for (const group of groups) {
    const { data: policy, error } = await supabase
      .from('policies')
      .insert({
        advisor_id: params.advisorId,
        customer_id: params.customerId,
        analysis_id: params.analysisId,
        source_type: 'gpts',
        policy_type: group.policy_type || 'manual',
        company: group.company || '보험사 미확인',
        product_name: group.product_name || '상품명 미확인',
        policy_number: group.policy_number || null,
        monthly_premium: group.monthly_premium || 0,
        start_date: normalizeDate(group.start_date) || new Date().toISOString().slice(0, 10),
        end_date: normalizeDate(group.end_date || group.maturity_date),
        payment_period: group.payment_period || null,
        maturity_age: extractMaturityAge(group.maturity_age || group.maturity || group.payment_period),
        paid_premium_total: group.paid_premium_total,
        remaining_premium_total: group.remaining_premium_total,
      })
      .select('id')
      .single()

    if (error || !policy?.id) {
      console.warn('Failed to save GPTs policy', error?.message)
      continue
    }

    const coverageRows = group.coverages.map((coverage: any) => ({
      advisor_id: params.advisorId,
      customer_id: params.customerId,
      policy_id: policy.id,
      analysis_id: params.analysisId,
      source_type: 'gpts',
      company: group.company || '보험사 미확인',
      product_name: group.product_name || '상품명 미확인',
      category: normalizeCoverageCategory(coverage.category || coverage.coverage_category, coverage.coverage_name || coverage.coverage_name_original),
      name: coverage.coverage_name || coverage.coverage_name_original || coverage.name || '담보명 미확인',
      amount: normalizeMoney(coverage.amount || coverage.coverage_amount || coverage.value, params.structuredAnalysis),
      condition: coverage.note || coverage.description || coverage.condition || '',
      coverage_type: coverage.coverage_type || coverage.type || '',
      renewal_type: coverage.renewal_type || '',
      payment_method_type: coverage.payment_method_type || '',
    }))

    if (coverageRows.length > 0) {
      const { error: coverageError } = await supabase.from('coverages').insert(coverageRows)
      if (coverageError) console.warn('Failed to save GPTs coverages', coverageError.message)
    }
  }
}

function extractPolicyGroups(data: any) {
  const multiplierSource = data || {}
  return firstArray(data?.policies, data?.contracts, data?.products, data?.extracted?.products).map((policy: any) => ({
    company: policy.company || policy.insurer || data?.extracted?.company || '보험사 미확인',
    product_name: policy.product_name || policy.product || policy.name || '상품명 미확인',
    policy_number: policy.policy_number || policy.contract_number || null,
    policy_type: policy.policy_type || policy.type || 'manual',
    monthly_premium: normalizeMoney(policy.monthly_premium || policy.premium, multiplierSource),
    start_date: policy.start_date || policy.contract_date,
    end_date: policy.end_date || policy.maturity_date,
    maturity_date: policy.maturity_date,
    maturity: policy.maturity || policy.maturity_date || policy.end_date,
    maturity_age: policy.maturity_age || policy.maturity_age_text,
    payment_period: policy.payment_period || formatPaymentPeriod(policy.payment_period_years, policy.maturity || policy.maturity_age),
    status: policy.status,
    contract_status: policy.contract_status,
    paid_premium_total: normalizeMoney(policy.paid_premium_total || policy.total_paid_premium || policy.paid_total, multiplierSource),
    remaining_premium_total: normalizeMoney(policy.remaining_premium_total || policy.total_remaining_premium || policy.remaining_total, multiplierSource),
    coverages: firstArray(policy.coverages, policy.coverage),
  }))
}

function firstArray(...values: any[]) {
  return values.find((value) => Array.isArray(value)) || []
}

function normalizeMoney(value: any, source: any) {
  const number = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(number) || number <= 0) return null
  const version = String(source?.version || '').toLowerCase()
  const unitText = `${version} ${source?.amount_unit || ''} ${source?.money_unit || ''}`.toLowerCase()
  const isManwonUnit = version.includes('insurance_analysis_v') || unitText.includes('만원') || unitText.includes('manwon')
  return Math.round(number * (isManwonUnit ? 10000 : 1))
}

function normalizeDate(value: any) {
  const text = String(value || '').trim()
  if (!text || text === '확인필요' || text === '미확인') return null
  const normalized = text.replace(/\./g, '-')
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized
  if (/^\d{2}-\d{2}-\d{2}$/.test(normalized)) return `20${normalized}`
  return null
}

function extractMaturityAge(value: any) {
  const text = String(value || '')
  const match = text.match(/(\d{2,3})\s*세?/)
  return match ? Number(match[1]) : null
}

function formatPaymentPeriod(years: any, maturity: any) {
  const yearText = years && years !== '확인필요' ? `${years}년납` : ''
  const maturityText = maturity ? String(maturity) : ''
  return [yearText, maturityText].filter(Boolean).join(' ')
}

function normalizeCoverageCategory(category: any, name: any) {
  const text = `${category || ''} ${name || ''}`
  if (/암|항암|표적/.test(text)) return '암'
  if (/뇌|뇌졸중|뇌출혈/.test(text)) return '뇌'
  if (/심장|심근경색|허혈/.test(text)) return '심장'
  if (/수술/.test(text)) return '수술'
  if (/입원|일당|통원/.test(text)) return '입원'
  if (/간병|요양/.test(text)) return '간병'
  if (/운전|교통|벌금|변호사|자동차/.test(text)) return '운전자'
  if (/치아|임플란트|크라운/.test(text)) return '치아'
  if (/사망/.test(text)) return '사망'
  if (/실손|의료비/.test(text)) return '실손'
  if (/장해|후유/.test(text)) return '후유장해'
  return String(category || '기타')
}

function formatAnalysisSummary(data: any) {
  const customer = data?.customer || {}
  const analysis = data?.analysis || {}
  const policies = firstArray(data?.policies, data?.contracts)
  return [
    `[GPTs 보장분석] ${customer.name || data?.customer_name || '고객명 미확인'}`,
    policies.length ? `가입 상품: ${policies.map((policy: any) => policy.company || policy.product_name || policy.product).filter(Boolean).slice(0, 5).join(', ')}` : '',
    listSection('강점', analysis.strengths),
    listSection('부족 확인 필요', analysis.weaknesses || analysis.missing_coverages),
    listSection('추천 방향', analysis.recommendation || analysis.recommendations),
  ].filter(Boolean).join('\n')
}

function listSection(title: string, value: any) {
  const list = Array.isArray(value) ? value : value ? [value] : []
  if (list.length === 0) return ''
  return [`[${title}]`, ...list.map((item) => `- ${String(item)}`)].join('\n')
}

function firstLine(value: string) {
  return String(value || '').split('\n').map((line) => line.trim()).find(Boolean) || ''
}

async function syncCustomerFromAnalysis(supabase: any, params: {
  customerId: string
  structuredAnalysis: any
}) {
  if (!params.customerId) return
  const data = params.structuredAnalysis || {}
  const customer = data?.customer || {}
  const policies = firstArray(data?.policies, data?.contracts)

  const patch: Record<string, any> = {}

  const monthlyPremium = normalizeMoney(
    customer.monthly_premium || customer.monthly_total || data.monthly_premium,
    data
  )
  if (monthlyPremium && monthlyPremium > 0) patch.monthly_premium = monthlyPremium

  const contractCount = Number(customer.contract_count || customer.policy_count || policies.length || 0)
  if (contractCount > 0) patch.policy_count = contractCount

  const age = Number(customer.age || 0)
  if (age > 0) {
    const estimatedYear = new Date().getFullYear() - age
    const { data: existingCustomer } = await supabase.from('customers').select('birth_date').eq('id', params.customerId).maybeSingle()
    if (!existingCustomer?.birth_date) {
      patch.birth_date = `${estimatedYear}-01-01`
    }
  }

  const hasIndemnity = data?.coverage_summary?.has_indemnity
  if (hasIndemnity != null) {
    patch.has_indemnity = Boolean(hasIndemnity)
  }

  if (Object.keys(patch).length === 0) return

  patch.updated_at = new Date().toISOString()
  const { error } = await supabase.from('customers').update(patch).eq('id', params.customerId)
  if (error) console.warn('Failed to sync customer from analysis', error.message)
}
