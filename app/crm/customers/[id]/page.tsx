'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer } from 'recharts'
import { supabase } from '../../../../lib/supabase'

const statusLabels: Record<string, string> = {
  new: '신규',
  analysis: '분석',
  consulting: '상담',
  proposal: '제안',
  hold: '보류',
  contracted: '계약',
  managing: '관리',
}

const statusBadges: Record<string, string> = {
  new: 'badge-gray',
  analysis: 'badge-blue',
  consulting: 'badge-yellow',
  proposal: 'badge-purple',
  hold: 'badge-red',
  contracted: 'badge-green',
  managing: 'badge-cyan',
}

const relationLabel: Record<string, string> = {
  spouse: '배우자',
  child: '자녀',
  parent: '부모',
  sibling: '형제',
  other: '기타',
}

const categoryNames: Record<string, string> = {
  cancer: '암',
  brain: '뇌혈관',
  heart: '심장',
  surgery: '수술',
  hospitalization: '입원',
  nursing: '간병',
  driver: '운전자',
  fire: '화재',
  death: '사망',
  disability: '장해',
  dental: '치아',
  etc: '기타',
}

const tabs = [
  { id: 'basic', label: '기본정보' },
  { id: 'family', label: '가족' },
  { id: 'policies', label: '보험계약' },
  { id: 'covercard', label: '보장현황' },
  { id: 'coverage', label: '보장그래프' },
  { id: 'simulator', label: '보장계산' },
  { id: 'alerts', label: '알림' },
  { id: 'dm', label: 'DM' },
]

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState('basic')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customer, setCustomer] = useState<any>(null)
  const [policies, setPolicies] = useState<any[]>([])
  const [coverages, setCoverages] = useState<any[]>([])
  const [families, setFamilies] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [radarData, setRadarData] = useState<any[]>([])
  const [coverageBars, setCoverageBars] = useState<any[]>([])
  const [advisorName, setAdvisorName] = useState('담당자')
  const [advisorPhone, setAdvisorPhone] = useState('')
  const [copiedDm, setCopiedDm] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [showPolicyForm, setShowPolicyForm] = useState(false)
  const [policyForm, setPolicyForm] = useState({ company: '', product_name: '', policy_number: '', monthly_premium: '', start_date: '', end_date: '', status: 'active', payment_institution: '', payment_day: '', payment_type: '자동이체' })
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [showFamilyForm, setShowFamilyForm] = useState(false)
  const [familyForm, setFamilyForm] = useState({ name: '', birth_date: '', relation: 'spouse', phone: '' })

  // 보장계산 state
  const [simEventType, setSimEventType] = useState<'diagnosis' | 'hospitalization' | 'surgery'>('surgery')
  const [simKeyword, setSimKeyword] = useState('')
  const [simDays, setSimDays] = useState('')
  const [simResult, setSimResult] = useState<null | { byCompany: { company: string; items: { name: string; amount: number }[]; total: number }[]; grandTotal: number }>(null)
  const [simSaving, setSimSaving] = useState(false)
  const [simSaved, setSimSaved] = useState(false)
  const [activeScenario, setActiveScenario] = useState<string | null>(null)

  const dmTemplates = [
    { id: 'birthday', title: '생일 축하', content: (name: string, adv: string, ph: string) => `${name} 고객님, 생일을 진심으로 축하드립니다!\n\n항상 건강하고 행복하세요.\n\n담당자 ${adv} ${ph}` },
    { id: 'car_renewal', title: '자동차보험 갱신', content: (name: string, adv: string, ph: string) => `${name} 고객님,\n\n자동차보험 갱신일이 다가오고 있습니다.\n최적 조건으로 갱신하실 수 있도록 안내드리겠습니다.\n\n담당자 ${adv} ${ph}` },
    { id: 'indemnity', title: '실손보험 재가입', content: (name: string, adv: string, ph: string) => `${name} 고객님,\n\n실손의료보험 재가입 시기가 다가왔습니다.\n세대 전환 및 보장 조건을 꼭 확인해보세요.\n\n담당자 ${adv} ${ph}` },
    { id: 'consulting', title: '보장분석 상담', content: (name: string, adv: string, ph: string) => `${name} 고객님,\n\n현재 가입하신 보험을 무료로 점검해드립니다.\n부족한 보장과 중복된 보험료를 함께 확인해보겠습니다.\n\n담당자 ${adv} ${ph}` },
  ]

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    const { data: userData } = await supabase.from('users').select('name, phone').eq('id', session.user.id).single()
    setAdvisorName(userData?.name || session.user.email?.split('@')[0] || '담당자')
    setAdvisorPhone(userData?.phone || '')

    const { data: cust } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('advisor_id', session.user.id)
      .is('deleted_at', null)
      .single()

    if (!cust) {
      router.push('/crm/customers')
      return
    }

    const [{ data: policyData }, { data: coverageData }, { data: familyData }, { data: alertData }] = await Promise.all([
      supabase.from('policies').select('*').eq('customer_id', cust.id).order('start_date', { ascending: false }),
      supabase.from('coverages').select('*').eq('customer_id', cust.id),
      supabase.from('families').select('*').eq('customer_id', cust.id),
      supabase.from('notifications').select('*').eq('customer_id', cust.id).order('due_date', { ascending: true }),
    ])

    setCustomer(cust)
    setEditForm(cust)
    setPolicies(policyData || [])
    setCoverages(coverageData || [])

    // 가족 구성원 중 등록된 고객 찾기 (연락처 기반 매칭)
    const familyList = familyData || []
    if (familyList.length > 0) {
      const phones = familyList.map((f: any) => f.phone).filter(Boolean)
      if (phones.length > 0) {
        const { data: linkedCustomers } = await supabase
          .from('customers')
          .select('id, name, phone')
          .in('phone', phones)
          .eq('advisor_id', session.user.id)
          .is('deleted_at', null)
        const phoneToId: Record<string, string> = {}
        ;(linkedCustomers || []).forEach((c: any) => { if (c.phone) phoneToId[c.phone] = c.id })
        setFamilies(familyList.map((f: any) => ({
          ...f,
          linked_customer_id: f.phone ? phoneToId[f.phone] || null : null,
        })))
      } else {
        setFamilies(familyList)
      }
    } else {
      setFamilies(familyList)
    }

    setAlerts(alertData || [])

    const totals: Record<string, number> = {}
    ;(coverageData || []).forEach((coverage: any) => {
      const key = normalizeCoverageGraphCategory(coverage.category, coverage.name, coverage.condition)
      totals[key] = (totals[key] || 0) + (Number(coverage.amount) || 0)
    })
    const maxAmount = Math.max(...Object.values(totals), 1)
    const summaryRows = Object.entries(categoryNames).map(([key, label]) => ({
      key,
      label,
      amount: totals[key] || 0,
      value: Math.round(((totals[key] || 0) / maxAmount) * 100),
    }))
    setRadarData(summaryRows.map((row) => ({
      category: row.label,
      value: row.value,
      recommended: 100,
    })))
    setCoverageBars(summaryRows.filter((row) => row.amount > 0))

    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  const saveCustomer = async () => {
    setSaving(true)
    await supabase.from('customers').update({
      name: editForm.name,
      phone: editForm.phone,
      birth_date: editForm.birth_date || null,
      gender: editForm.gender,
      address: editForm.address,
      occupation: editForm.occupation,
      status: editForm.status,
      monthly_premium: Number(editForm.monthly_premium) || 0,
      policy_count: Number(editForm.policy_count) || 0,
      indemnity_generation: editForm.indemnity_generation ? Number(editForm.indemnity_generation) : null,
      family_count: editForm.family_count ? Number(editForm.family_count) : null,
      consulting_summary: editForm.consulting_summary || null,
      insurance_reason: editForm.insurance_reason || null,
      tags: editForm.tags || [],
      updated_at: new Date().toISOString(),
    }).eq('id', id).eq('advisor_id', customer.advisor_id)
    setCustomer({ ...customer, ...editForm })
    setEditing(false)
    setSaving(false)
  }

  const addPolicy = async () => {
    if (!policyForm.company || !policyForm.product_name) return
    await supabase.from('policies').insert({
      customer_id: id,
      company: policyForm.company,
      product_name: policyForm.product_name,
      policy_number: policyForm.policy_number || null,
      monthly_premium: Number(policyForm.monthly_premium) || 0,
      start_date: policyForm.start_date || null,
      end_date: policyForm.end_date || null,
      policy_type: 'manual',
      payment_institution: policyForm.payment_institution || null,
      payment_day: policyForm.payment_day ? Number(policyForm.payment_day) : null,
      payment_type: policyForm.payment_type || '자동이체',
    })
    setShowPolicyForm(false)
    setPolicyForm({ company: '', product_name: '', policy_number: '', monthly_premium: '', start_date: '', end_date: '', status: 'active', payment_institution: '', payment_day: '', payment_type: '자동이체' })
    load()
  }

  const copyPolicySummary = async () => {
    if (!customer) return
    const age = customer.birth_date ? new Date().getFullYear() - new Date(customer.birth_date).getFullYear() : null
    const lines: string[] = []
    lines.push(`📋 ${customer.name} 고객님 보험 현황`)
    if (age) lines.push(`(${age}세 / 월 보험료 합계: ${(customer.monthly_premium || 0).toLocaleString()}원)`)
    lines.push('')

    if (policies.length > 0) {
      lines.push('【 가입 보험 목록 】')
      policies.forEach((p: any, i: number) => {
        const prem = p.monthly_premium ? `${p.monthly_premium.toLocaleString()}원` : '-'
        const payment = p.payment_institution && p.payment_day
          ? ` | ${p.payment_institution} ${p.payment_day}일 ${p.payment_type || '자동이체'}`
          : ''
        lines.push(`${i + 1}. ${p.company} · ${p.product_name}`)
        lines.push(`   월 ${prem}${payment}`)
        if (p.end_date) lines.push(`   만기: ${p.end_date}`)
      })
      lines.push('')
    }

    if (coverages.length > 0) {
      lines.push('【 주요 보장 내역 】')
      const catMap: Record<string, number> = {}
      coverages.forEach((c: any) => {
        const key = normalizeCoverageGraphCategory(c.category, c.name, c.condition)
        catMap[key] = (catMap[key] || 0) + (Number(c.amount) || 0)
      })
      const catOrder = ['cancer','brain','heart','surgery','hospitalization','nursing','driver','fire','death','disability','dental','etc']
      catOrder.forEach(key => {
        if (catMap[key]) lines.push(`• ${categoryNames[key]}: ${formatCoverageAmount(catMap[key])}`)
      })
      lines.push('')
    }

    lines.push(`담당: ${advisorName}${advisorPhone ? ` / ${advisorPhone}` : ''}`)

    await navigator.clipboard.writeText(lines.join('\n'))
    setCopiedSummary(true)
    setTimeout(() => setCopiedSummary(false), 2500)
  }

  const addFamily = async () => {
    if (!familyForm.name) return
    await supabase.from('families').insert({ customer_id: id, ...familyForm })
    setShowFamilyForm(false)
    setFamilyForm({ name: '', birth_date: '', relation: 'spouse', phone: '' })
    load()
  }

  const copyDm = async (template: typeof dmTemplates[0]) => {
    const text = template.content(customer?.name || '', advisorName, advisorPhone)
    await navigator.clipboard.writeText(text)
    setCopiedDm(template.id)
    setTimeout(() => setCopiedDm(null), 2000)
  }

  // 상황별 프리셋 정의
  const SCENARIOS = [
    {
      id: 'fracture_all', label: '🦴 골절', desc: '골절 진단+수술+입원',
      eventType: 'surgery' as const,
      categories: ['surgery', 'hospitalization'],
      rowKeyPrefixes: ['fracture', 'disability'],
      keywords: ['골절', '깁스', '5대골절'],
    },
    {
      id: 'surgery_general', label: '🔪 일반 수술', desc: '수술비+입원비',
      eventType: 'surgery' as const,
      categories: ['surgery', 'hospitalization'],
      rowKeyPrefixes: ['surgery', 'hospital'],
      keywords: [],
    },
    {
      id: 'hospitalization', label: '🛏 입원', desc: '입원일당+실손+간병',
      eventType: 'hospitalization' as const,
      categories: ['hospitalization', 'nursing'],
      rowKeyPrefixes: ['hospital', 'indemnity', 'nursing', 'care'],
      keywords: ['입원', '실손', '간병'],
    },
    {
      id: 'cancer', label: '🎗 암 진단', desc: '암진단+치료비+수술',
      eventType: 'diagnosis' as const,
      categories: ['cancer'],
      rowKeyPrefixes: ['cancer', 'radiation', 'chemo', 'targeted'],
      keywords: ['암'],
    },
    {
      id: 'brain_heart', label: '🧠 뇌·심장', desc: '뇌혈관+심장질환',
      eventType: 'diagnosis' as const,
      categories: ['brain', 'heart'],
      rowKeyPrefixes: ['brain', 'heart', 'vascular'],
      keywords: ['뇌', '심장', '뇌혈관', '심혈관'],
    },
    {
      id: 'nursing', label: '💊 간병', desc: '간병인+요양병원',
      eventType: 'hospitalization' as const,
      categories: ['nursing'],
      rowKeyPrefixes: ['nursing', 'care'],
      keywords: ['간병', '요양'],
    },
    {
      id: 'death', label: '💀 사망', desc: '사망보험금',
      eventType: 'diagnosis' as const,
      categories: ['death', 'disability'],
      rowKeyPrefixes: ['death', 'disability'],
      keywords: ['사망', '후유장해'],
    },
  ]

  const runSimulatorWithScenario = (scenarioId: string | null, overrideKeyword?: string, overrideDays?: number) => {
    const scenario = scenarioId ? SCENARIOS.find(s => s.id === scenarioId) : null
    const keyword = (overrideKeyword ?? simKeyword).trim().toLowerCase()
    const days = overrideDays ?? Number(simDays) ?? 0

    const matched = coverages.filter((cov: any) => {
      if (scenario) {
        const rowKeyMatch = String(cov.condition || '').match(/rowKey:([^;\s]+)/)
        const rowKey: string = cov.row_key || rowKeyMatch?.[1] || ''
        const inCategory = scenario.categories.includes(cov.category || '')
        const inRowKey = scenario.rowKeyPrefixes.some((pfx: string) => rowKey.startsWith(pfx))
        const inKeyword = scenario.keywords.length === 0 || scenario.keywords.some((kw: string) => (cov.name || '').includes(kw))
        const manualKeyword = keyword ? (cov.name || '').toLowerCase().includes(keyword) : false
        return inCategory || inRowKey || inKeyword || manualKeyword
      }
      // 기본 모드
      const categoryMap: Record<string, string[]> = {
        diagnosis: ['cancer', 'brain', 'heart'],
        hospitalization: ['hospitalization', 'cancer', 'brain', 'heart', 'surgery', 'nursing'],
        surgery: ['surgery', 'cancer', 'brain', 'heart'],
      }
      const inCategory = (categoryMap[simEventType] || []).includes(cov.category)
      const nameMatch = keyword ? (cov.name || '').toLowerCase().includes(keyword) : true
      return inCategory || nameMatch
    })

    // 회사 이름: coverages에 company가 없으면 policy_id로 policies에서 찾기
    const policyMap: Record<string, any> = {}
    policies.forEach((p: any) => { policyMap[p.id] = p })

    const companyMap: Record<string, { name: string; amount: number; policyInfo?: string }[]> = {}
    matched.forEach((cov: any) => {
      const linkedPolicy = cov.policy_id ? policyMap[cov.policy_id] : null
      const co = linkedPolicy?.company || cov.company || '기타'
      if (!companyMap[co]) companyMap[co] = []
      let amt = Number(cov.amount) || 0
      const isDaily = simEventType === 'hospitalization' || scenario?.eventType === 'hospitalization'
      if (isDaily && days > 0 && amt > 0 && amt <= 300000) {
        amt = amt * days
      }
      if (amt > 0) companyMap[co].push({ name: cov.name || '담보', amount: amt })
    })

    const byCompany = Object.entries(companyMap).map(([company, items]) => ({
      company,
      items,
      total: items.reduce((s, i) => s + i.amount, 0),
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

    const grandTotal = byCompany.reduce((s, c) => s + c.total, 0)
    setSimResult({ byCompany, grandTotal })
    setSimSaved(false)
  }

  const runSimulator = () => runSimulatorWithScenario(activeScenario)

  const saveSimulation = async () => {
    if (!simResult) return
    setSimSaving(true)
    await supabase.from('claim_simulations').insert({
      customer_id: id,
      surgery_name: simKeyword || simEventType,
      hospitalization_days: Number(simDays) || 0,
      results: simResult,
      total_amount: simResult.grandTotal,
    })
    setSimSaving(false)
    setSimSaved(true)
  }

  const deleteCustomer = async () => {
    if (!confirm(`${customer?.name} 고객을 삭제하시겠습니까? 앱과 PC 목록에서 함께 숨김 처리됩니다.`)) return
    await supabase.from('customers').update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id).eq('advisor_id', customer.advisor_id)
    router.push('/crm/customers')
  }

  if (loading) {
    return <div className="card card-p" style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
  }

  if (!customer) return null

  const age = customer.birth_date ? new Date().getFullYear() - new Date(customer.birth_date).getFullYear() : null

  return (
    <>
      <div className="customer-detail-header">
        <div className="flex justify-between items-center" style={{ gap: 16, flexWrap: 'wrap' }}>
          <div className="flex items-center gap-12">
            <Link href="/crm/customers" className="link">← 목록</Link>
            <div className="profile-avatar" style={{ width: 48, height: 48, fontSize: 18 }}>{customer.name?.slice(0, 1)}</div>
            <div>
              <div className="page-title">{customer.name}</div>
              <div className="flex items-center gap-8 mt-4">
                <span className={`badge ${statusBadges[customer.status] || 'badge-gray'}`}>{statusLabels[customer.status] || customer.status}</span>
                {age && <span className="text-muted" style={{ fontSize: 12 }}>{age}세</span>}
                <span className="text-muted" style={{ fontSize: 12 }}>{customer.phone}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-8">
            {editing ? (
              <>
                <button className="btn btn-secondary" onClick={() => { setEditing(false); setEditForm(customer) }}>취소</button>
                <button className="btn btn-primary" onClick={saveCustomer} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => window.open(`/coverage-pro?customerId=${id}&customerName=${encodeURIComponent(customer.name || '')}`, '_blank', 'noopener,noreferrer')}
                >
                  보장분석 PRO
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </button>
                <button className="btn btn-secondary" onClick={() => setEditing(true)}>수정</button>
                <button className="btn" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={deleteCustomer}>삭제</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="tab-bar">
        {tabs.map((item) => (
          <button key={item.id} className={`tab-btn${tab === item.id ? ' active' : ''}`} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="card card-p">
        {tab === 'basic' && (
          editing ? (
            <EditBasicForm editForm={editForm} setEditForm={setEditForm} />
          ) : (
            <>
              <div className="cust-info-grid">
                <Info label="연락처" value={customer.phone || '-'} />
                <Info label="나이" value={age ? `${age}세` : '-'} sub={customer.birth_date || ''} />
                <Info label="월 보험료" value={formatManwon(customer.monthly_premium)} />
                <Info label="보험 건수" value={`${customer.policy_count || 0}건`} />
                <Info label="실손" value={customer.indemnity_generation ? `${customer.indemnity_generation}세대` : '-'} />
                <Info label="가족" value={customer.family_count ? `${customer.family_count}명` : '-'} />
              </div>
              <div className="divider" />
              <div className="grid-2">
                <Info label="직업" value={customer.occupation || '-'} />
                <Info label="주소" value={customer.address || '-'} />
              </div>
              {customer.consulting_summary && (
                <div className="bg-gray rounded p-16 mt-12">
                  <div className="form-label">상담 요약</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>{customer.consulting_summary}</div>
                </div>
              )}
              {customer.insurance_reason && (
                <div className="bg-gray rounded p-16 mt-12">
                  <div className="form-label">보험 가입 이유</div>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>{customer.insurance_reason}</div>
                </div>
              )}
              {customer.tags?.length > 0 && (
                <div className="mt-12">{customer.tags.map((tag: string) => <span key={tag} className="tag tag-cyan">{tag}</span>)}</div>
              )}
            </>
          )
        )}

        {tab === 'family' && (
          <>
            <div className="flex justify-between items-center mb-16">
              <div className="card-title" style={{ marginBottom: 0 }}>가족 구성원</div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowFamilyForm((value) => !value)}>+ 추가</button>
            </div>
            {showFamilyForm && (
              <div className="bg-gray rounded p-16 mb-16">
                <div className="grid-2">
                  <Field label="이름"><input className="form-input" value={familyForm.name} onChange={(e) => setFamilyForm((p) => ({ ...p, name: e.target.value }))} /></Field>
                  <Field label="관계">
                    <select className="form-input" value={familyForm.relation} onChange={(e) => setFamilyForm((p) => ({ ...p, relation: e.target.value }))}>
                      {Object.entries(relationLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="생년월일"><input type="date" className="form-input" value={familyForm.birth_date} onChange={(e) => setFamilyForm((p) => ({ ...p, birth_date: e.target.value }))} /></Field>
                  <Field label="연락처"><input className="form-input" value={familyForm.phone} onChange={(e) => setFamilyForm((p) => ({ ...p, phone: e.target.value }))} /></Field>
                </div>
                <button className="btn btn-primary btn-sm" onClick={addFamily}>저장</button>
              </div>
            )}
            {families.map((member) => (
              <div key={member.id} className="family-card" style={{ cursor: member.linked_customer_id ? 'pointer' : 'default' }}
                onClick={() => member.linked_customer_id && router.push(`/crm/customers/${member.linked_customer_id}`)}
              >
                <div className="family-avatar" style={{ background: member.linked_customer_id ? '#eff6ff' : '#f1f5f9', color: member.linked_customer_id ? '#2563eb' : '#64748b' }}>
                  {member.name?.slice(0, 1)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="fw-700" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {member.name}
                    {member.linked_customer_id && (
                      <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>고객 등록됨</span>
                    )}
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{relationLabel[member.relation] || member.relation} · {member.birth_date || '-'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="text-muted" style={{ fontSize: 12 }}>{member.phone || '-'}</div>
                  {member.linked_customer_id ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/crm/customers/${member.linked_customer_id}`) }}
                      style={{ background: '#1a2744', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      상세보기 →
                    </button>
                  ) : member.phone ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`/coverage-pro?customerName=${encodeURIComponent(member.name || '')}&customerPhone=${encodeURIComponent(member.phone || '')}`, '_blank', 'noopener,noreferrer')
                      }}
                      style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      PRO 분석 ↗
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {families.length === 0 && <Empty text="등록된 가족 구성원이 없습니다." />}
          </>
        )}

        {tab === 'policies' && (
          <>
            <div className="flex justify-between items-center mb-16">
              <div className="card-title" style={{ marginBottom: 0 }}>보험계약</div>
              <div className="flex gap-8">
                <button
                  className={`btn btn-sm${copiedSummary ? '' : ''}`}
                  onClick={copyPolicySummary}
                  style={{ background: copiedSummary ? '#ecfdf5' : '#f0f9ff', color: copiedSummary ? '#059669' : '#0369a1', border: `1px solid ${copiedSummary ? '#a7f3d0' : '#bae6fd'}`, fontWeight: 700 }}
                >
                  {copiedSummary ? '✓ 복사됨' : '📋 요약 복사'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowPolicyForm((value) => !value)}>+ 추가</button>
              </div>
            </div>

            {showPolicyForm && (
              <div className="bg-gray rounded p-16 mb-16">
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: '#1a2744' }}>계약 정보</div>
                <div className="grid-2">
                  <Field label="보험사"><input className="form-input" value={policyForm.company} onChange={(e) => setPolicyForm((p) => ({ ...p, company: e.target.value }))} /></Field>
                  <Field label="상품명"><input className="form-input" value={policyForm.product_name} onChange={(e) => setPolicyForm((p) => ({ ...p, product_name: e.target.value }))} /></Field>
                  <Field label="증권번호"><input className="form-input" value={policyForm.policy_number} onChange={(e) => setPolicyForm((p) => ({ ...p, policy_number: e.target.value }))} /></Field>
                  <Field label="월 보험료"><input type="number" className="form-input" value={policyForm.monthly_premium} onChange={(e) => setPolicyForm((p) => ({ ...p, monthly_premium: e.target.value }))} /></Field>
                  <Field label="시작일"><input type="date" className="form-input" value={policyForm.start_date} onChange={(e) => setPolicyForm((p) => ({ ...p, start_date: e.target.value }))} /></Field>
                  <Field label="만기일"><input type="date" className="form-input" value={policyForm.end_date} onChange={(e) => setPolicyForm((p) => ({ ...p, end_date: e.target.value }))} /></Field>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, margin: '14px 0 10px', color: '#1a2744' }}>결제 정보</div>
                <div className="grid-2">
                  <Field label="결제 은행/카드사">
                    <input className="form-input" placeholder="예: KB국민은행, 신한카드" value={policyForm.payment_institution} onChange={(e) => setPolicyForm((p) => ({ ...p, payment_institution: e.target.value }))} />
                  </Field>
                  <Field label="결제일">
                    <input type="number" min={1} max={31} className="form-input" placeholder="예: 25" value={policyForm.payment_day} onChange={(e) => setPolicyForm((p) => ({ ...p, payment_day: e.target.value }))} />
                  </Field>
                  <Field label="결제 방식">
                    <select className="form-input" value={policyForm.payment_type} onChange={(e) => setPolicyForm((p) => ({ ...p, payment_type: e.target.value }))}>
                      <option value="자동이체">자동이체</option>
                      <option value="카드결제">카드결제</option>
                      <option value="지로">지로</option>
                      <option value="직접납부">직접납부</option>
                    </select>
                  </Field>
                </div>
                <button className="btn btn-primary btn-sm" onClick={addPolicy}>저장</button>
              </div>
            )}

            {/* 결제일별 그룹 요약 */}
            {policies.length > 0 && (() => {
              const withPayment = policies.filter((p: any) => p.payment_institution && p.payment_day)
              if (withPayment.length === 0) return null
              const byDay: Record<string, { institution: string; type: string; total: number; companies: string[] }> = {}
              withPayment.forEach((p: any) => {
                const key = `${p.payment_institution}_${p.payment_day}_${p.payment_type}`
                if (!byDay[key]) byDay[key] = { institution: p.payment_institution, type: p.payment_type || '자동이체', total: 0, companies: [] }
                byDay[key].total += Number(p.monthly_premium) || 0
                byDay[key].companies.push(p.company)
              })
              return (
                <div style={{ background: '#f0f9ff', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 10 }}>💳 결제 일정</div>
                  {Object.entries(byDay).map(([key, info]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid #e0f2fe' }}>
                      <span style={{ color: '#334155' }}><b>{info.institution}</b> {info.companies[0] && `(${info.companies.join(', ')})`}</span>
                      <span style={{ color: '#0369a1', fontWeight: 700 }}>{formatManwon(info.total)} · {byDay[key as any]?.type || '자동이체'}</span>
                    </div>
                  ))}
                  {Object.entries(byDay).map(([key, info]) => (
                    <div key={`day-${key}`} style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      {`${(policies.find((p: any) => `${p.payment_institution}_${p.payment_day}_${p.payment_type}` === key) as any)?.payment_day}일 ${info.type}`}
                    </div>
                  ))}
                </div>
              )
            })()}

            {policies.map((policy) => (
              <div key={policy.id} className="policy-row">
                <div style={{ flex: 1 }}>
                  <div className="fw-700">{policy.company} · {policy.product_name}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {policy.policy_number || '-'} · {policy.start_date || '-'} ~ {policy.end_date || '-'}
                  </div>
                  {policy.payment_institution && policy.payment_day && (
                    <div style={{ fontSize: 11, color: '#2563eb', marginTop: 3 }}>
                      💳 {policy.payment_institution} {policy.payment_day}일 {policy.payment_type || '자동이체'}
                    </div>
                  )}
                </div>
                <div className="fw-700">{formatManwon(policy.monthly_premium)}</div>
              </div>
            ))}
            {policies.length === 0 && <Empty text="등록된 보험계약이 없습니다." />}
          </>
        )}

        {/* ══════════════ 보장현황 카드 탭 ══════════════ */}
        {tab === 'covercard' && (() => {
          // 보험사별 보장 내역 그룹화
          const companyMap = new Map<string, { policy: any; coverageList: any[] }>()
          policies.forEach((p: any) => {
            const key = `${p.company}_${p.id}`
            if (!companyMap.has(key)) companyMap.set(key, { policy: p, coverageList: [] })
          })
          coverages.forEach((cov: any) => {
            const policy = policies.find((p: any) => p.id === cov.policy_id)
            const company = policy?.company || cov.company || '기타'
            const key = policy ? `${policy.company}_${policy.id}` : `${company}_unknown`
            if (!companyMap.has(key)) {
              companyMap.set(key, {
                policy: { company, product_name: cov.product_name || '미확인', monthly_premium: 0 },
                coverageList: []
              })
            }
            const entry = companyMap.get(key)!
            const amountRaw = Number(cov.amount || 0)
            const amountManwon = amountRaw >= 100000 ? Math.round(amountRaw / 10000) : amountRaw
            if (amountManwon > 0) {
              entry.coverageList.push({ name: cov.name || cov.coverage_name || '미확인', amount: amountManwon })
            }
          })

          // 보장 있는 회사만 추려서 배열로
          const companyCards = Array.from(companyMap.values()).filter(c => c.coverageList.length > 0)

          const totalPremium = policies.reduce((s: number, p: any) => s + Number(p.monthly_premium || 0), 0)

          const COMPANY_COLORS = ['#1a2744','#1e3a5f','#1d4b78','#15527a','#0e4a6e','#0d3b5e','#162e4d','#1a3850']

          const handlePrintCard = () => {
            const win = window.open('', '_blank', 'width=800,height=900')
            if (!win) return
            const birth = customer?.birth_date || ''
            const age = birth ? `(${new Date().getFullYear() - new Date(birth).getFullYear()}세)` : ''
            const cardHtml = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>보장현황카드</title>
<style>
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
  body{font-family:'Pretendard Variable',sans-serif;margin:0;padding:24px;background:#fff;color:#111}
  h1{font-size:18px;font-weight:900;color:#1a2744;margin:0 0 4px}
  .sub{font-size:12px;color:#64748b;margin-bottom:20px}
  .card{border:1px solid #e2e8f0;border-radius:12px;margin-bottom:14px;overflow:hidden;break-inside:avoid}
  .card-head{background:#1a2744;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center}
  .card-head .co{font-size:14px;font-weight:700}
  .card-head .prd{font-size:11px;color:#93c5fd}
  .card-head .prem{font-size:12px;color:#fbbf24;font-weight:700}
  .cov-list{padding:12px 16px;display:grid;grid-template-columns:repeat(2,1fr);gap:6px 20px}
  .cov-item{display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid #f1f5f9}
  .cov-name{color:#374151}
  .cov-amt{font-weight:700;color:#1a2744}
  .pay-row{font-size:11px;color:#64748b;padding:8px 16px;background:#f8fafc;border-top:1px solid #f1f5f9;display:flex;gap:16px}
  .total{background:#f8fafc;padding:12px 16px;font-size:13px;font-weight:700;color:#1a2744;border-top:1px solid #e2e8f0}
  @media print{body{padding:0}.no-print{display:none}}
</style></head><body>
<h1>🛡️ ${customer?.name || '고객'} 보장현황카드</h1>
<div class="sub">${birth ? `생년월일: ${birth} ${age} · ` : ''}연락처: ${customer?.phone || '-'} · 작성일: ${new Date().toLocaleDateString('ko-KR')}</div>
${companyCards.map(({ policy, coverageList }) => `
<div class="card">
  <div class="card-head">
    <div><div class="co">${policy.company}</div><div class="prd">${policy.product_name || ''}</div></div>
    ${policy.monthly_premium ? `<div class="prem">월 ${Number(policy.monthly_premium).toLocaleString()}원</div>` : ''}
  </div>
  <div class="cov-list">
    ${coverageList.map(c => `<div class="cov-item"><span class="cov-name">${c.name}</span><span class="cov-amt">${c.amount.toLocaleString()}만원</span></div>`).join('')}
  </div>
  ${(policy.payment_institution || policy.payment_day || policy.payment_type) ? `<div class="pay-row">${policy.payment_institution ? `<span>💳 ${policy.payment_institution}</span>` : ''}${policy.payment_day ? `<span>📅 ${policy.payment_day}일 이체</span>` : ''}${policy.payment_type ? `<span>${policy.payment_type}</span>` : ''}</div>` : ''}
</div>`).join('')}
<div class="total">총 월납 보험료: ${totalPremium.toLocaleString()}원 · 계약 ${policies.length}건</div>
<script>window.onload=()=>{window.print();}</script>
</body></html>`
            win.document.write(cardHtml)
            win.document.close()
          }

          return (
            <div>
              {/* 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div className="card-title" style={{ marginBottom: 4 }}>🛡️ 보장현황 카드</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>병원·사고 시 어떤 보험사에 어떤 보장이 있는지 바로 확인</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => router.push(`/coverage-pro?customerId=${id}`)}
                    style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✏️ 보장분석 PRO에서 수정
                  </button>
                  <button
                    onClick={handlePrintCard}
                    style={{ background: '#1a2744', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    🖨️ 카드 인쇄
                  </button>
                </div>
              </div>

              {/* 고객 인적사항 배너 */}
              <div style={{ background: 'linear-gradient(135deg,#1a2744,#2d4a8a)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, color: '#fff' }}>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#93c5fd', marginBottom: 2 }}>성명</div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{customer?.name || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#93c5fd', marginBottom: 2 }}>생년월일</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      {customer?.birth_date || '-'}
                      {customer?.birth_date && (
                        <span style={{ fontSize: 12, color: '#93c5fd', marginLeft: 6 }}>
                          ({new Date().getFullYear() - new Date(customer.birth_date).getFullYear()}세)
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#93c5fd', marginBottom: 2 }}>연락처</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{customer?.phone || '-'}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#93c5fd', marginBottom: 2 }}>총 월납 보험료</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#fbbf24' }}>{totalPremium.toLocaleString()}원</div>
                    <div style={{ fontSize: 11, color: '#93c5fd' }}>{policies.length}건 계약</div>
                  </div>
                </div>
              </div>

              {/* 보험사별 카드 */}
              {companyCards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>보장 데이터가 없습니다</div>
                  <div style={{ fontSize: 13, marginBottom: 20 }}>보장분석 PRO에서 이 고객의 보험계약을 분석하면 자동으로 여기에 표시됩니다.</div>
                  <button
                    onClick={() => router.push(`/coverage-pro?customerId=${id}`)}
                    style={{ background: '#1a2744', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✏️ 보장분석 PRO 열기
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                  {companyCards.map(({ policy, coverageList }, idx) => (
                    <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      {/* 회사 헤더 */}
                      <div style={{ background: COMPANY_COLORS[idx % COMPANY_COLORS.length], padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>{policy.company}</div>
                          <div style={{ color: '#93c5fd', fontSize: 11, marginTop: 2 }}>{policy.product_name}</div>
                        </div>
                        {policy.monthly_premium > 0 && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700 }}>{Number(policy.monthly_premium).toLocaleString()}원</div>
                            <div style={{ color: '#93c5fd', fontSize: 10 }}>월납</div>
                          </div>
                        )}
                      </div>
                      {/* 보장 목록 */}
                      <div style={{ padding: '10px 16px 0', background: '#fff' }}>
                        {coverageList.map((cov, ci) => (
                          <div key={ci} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: ci < coverageList.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <span style={{ fontSize: 13, color: '#374151' }}>{cov.name}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>{cov.amount.toLocaleString()}만원</span>
                          </div>
                        ))}
                      </div>
                      {/* 결제 정보 */}
                      {(policy.payment_institution || policy.payment_day || policy.payment_type) && (
                        <div style={{ padding: '8px 16px 10px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                          {policy.payment_institution && (
                            <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>💳</span> {policy.payment_institution}
                            </span>
                          )}
                          {policy.payment_day && (
                            <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>📅</span> 매월 {policy.payment_day}일
                            </span>
                          )}
                          {policy.payment_type && (
                            <span style={{ fontSize: 11, color: '#64748b' }}>{policy.payment_type}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 면책 안내 */}
              {companyCards.length > 0 && (
                <div style={{ marginTop: 20, padding: '12px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', fontSize: 12, color: '#92400e' }}>
                  ⚠️ 본 현황은 설계사가 입력한 분석 자료 기준이며, 실제 보장 내용은 보험증권 및 약관을 반드시 확인하시기 바랍니다.
                </div>
              )}
            </div>
          )
        })()}

        {tab === 'coverage' && (() => {
          if (coverages.length === 0) {
            return (
              <div>
                <div className="card-title">보장분석표</div>
                <Empty text="보장 데이터가 없습니다. 보장분석 파일을 업로드해 주세요." />
                {radarData.length === 0 ? null : (
                  <div style={{ marginTop: 24 }}>
                    <div className="card-title">보장 그래프</div>
                    <div className="radar-wrap" style={{ height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                          <Radar name="현재" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} />
                          <Radar name="권장" dataKey="recommended" stroke="#E2E8F0" fill="none" strokeDasharray="4 2" />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )
          }

          const { amountGrid, numPolicies, displayPoliciesList } = buildCoverageDisplayMatrix(policies, coverages)

          // 보장분석표 헤더 행: 보험사명 (폴백 포함)
          const displayPolicies = displayPoliciesList

          // 섹션별 그룹 행 추적
          let lastGroup = ''
          let lastSub = ''

          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>내 보험 바로 알기 보장분석표</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>단위: 만원</span>
                  <button
                    onClick={() => window.open(`/crm/customers/${id}/report`, '_blank')}
                    style={{ background: '#1a2744', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    🖨️ PDF 고객 제안서
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 560 }}>
                  <thead>
                    {/* 보험사 헤더 */}
                    <tr style={{ background: '#1a2744', color: '#fff' }}>
                      <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 700, minWidth: 80, whiteSpace: 'nowrap' }}>분류</th>
                      <th style={{ padding: '10px 6px', textAlign: 'left', fontWeight: 700, minWidth: 90 }}>항목</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, minWidth: 56, color: '#fbbf24' }}>합계</th>
                      {displayPolicies.map((p, i) => (
                        <th key={i} style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, minWidth: 60, fontSize: 11 }}>
                          {p.company || `보험사${i + 1}`}
                        </th>
                      ))}
                    </tr>
                    {/* 상품명 행 */}
                    <tr style={{ background: '#273469', color: '#cbd5e1' }}>
                      <td colSpan={3} style={{ padding: '6px 10px', fontSize: 11, color: '#94a3b8' }}>상품명</td>
                      {displayPolicies.map((p, i) => (
                        <td key={i} style={{ padding: '6px 6px', fontSize: 10, textAlign: 'right', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 80, textOverflow: 'ellipsis' }}>
                          {p.product_name || '-'}
                        </td>
                      ))}
                    </tr>
                    {/* 월 보험료 행 */}
                    <tr style={{ background: '#2d3a5e', color: '#e2e8f0', borderBottom: '2px solid #1a2744' }}>
                      <td colSpan={3} style={{ padding: '6px 10px', fontSize: 11 }}>납입보험료(원)</td>
                      {displayPolicies.map((p, i) => (
                        <td key={i} style={{ padding: '6px 6px', textAlign: 'right', fontSize: 11 }}>
                          {p.monthly_premium ? Number(p.monthly_premium).toLocaleString() : '-'}
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COVERAGE_STRUCTURE_DISPLAY.map((row, ri) => {
                      const total = amountGrid[ri].reduce((s, v) => s + v, 0)
                      const isGroupHeader = row.group !== null && row.group !== lastGroup
                      const isSubHeader = row.sub !== null && row.sub !== lastSub
                      if (row.group !== null) lastGroup = row.group
                      if (row.sub !== null) lastSub = row.sub
                      const rowBg = total > 0 ? row.groupBg : '#fff'
                      return (
                        <tr
                          key={ri}
                          style={{
                            background: rowBg,
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          {/* 분류 (대분류) */}
                          <td style={{
                            padding: '6px 10px',
                            fontWeight: isGroupHeader ? 800 : 400,
                            color: isGroupHeader ? row.groupColor : '#94a3b8',
                            fontSize: isGroupHeader ? 11 : 10,
                            borderRight: '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                          }}>
                            {isGroupHeader ? row.group : (isSubHeader ? row.sub : '')}
                          </td>
                          {/* 항목 */}
                          <td style={{
                            padding: '6px 8px',
                            color: total > 0 ? '#111' : '#94a3b8',
                            fontWeight: total > 0 ? 600 : 400,
                            borderRight: '1px solid #e2e8f0',
                          }}>
                            {row.label}
                          </td>
                          {/* 합계 */}
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: total > 0 ? '#dc2626' : '#d1d5db',
                            borderRight: '1px solid #e2e8f0',
                          }}>
                            {total > 0 ? total.toLocaleString() : ''}
                          </td>
                          {/* 보험사별 금액 */}
                          {amountGrid[ri].map((v, pi) => (
                            <td key={pi} style={{
                              padding: '6px 8px',
                              textAlign: 'right',
                              color: v > 0 ? '#1a2744' : '#d1d5db',
                              fontWeight: v > 0 ? 600 : 400,
                              fontSize: 11,
                              borderRight: pi < numPolicies - 1 ? '1px solid #f1f5f9' : undefined,
                            }}>
                              {v > 0 ? v.toLocaleString() : ''}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* 레이더 차트 */}
              {radarData.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <div className="card-title">보장 영역별 현황</div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 240px', minWidth: 240, height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                          <Radar name="현재" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} />
                          <Radar name="권장" dataKey="recommended" stroke="#E2E8F0" fill="none" strokeDasharray="4 2" />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                      {coverageBars.map((coverage) => (
                        <div key={coverage.key} className="cov-bar-row">
                          <div className="cov-bar-label">{coverage.label}</div>
                          <div className="cov-bar-track"><div className="cov-bar-fill" style={{ width: `${Math.max(6, Math.min(coverage.value, 100))}%`, background: '#3b82f6' }} /></div>
                          <div className="cov-bar-val">{formatCoverageAmount(coverage.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {tab === 'simulator' && (
          <>
            <div className="card-title">빠른 보장 조회</div>

            {/* 보험 기본 현황 */}
            {policies.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                {policies.map((p: any) => (
                  <div key={p.id} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '7px 14px', fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: '#0369a1' }}>{p.company}</span>
                    {p.monthly_premium > 0 && <span style={{ color: '#64748b', marginLeft: 6 }}>{(p.monthly_premium / 10000).toFixed(1)}만원</span>}
                    {p.payment_day && <span style={{ color: '#94a3b8', marginLeft: 4 }}>· {p.payment_day}일 이체</span>}
                  </div>
                ))}
              </div>
            )}

            {/* 상황 프리셋 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>상황 선택</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const next = activeScenario === s.id ? null : s.id
                      setActiveScenario(next)
                      setSimEventType(s.eventType)
                      setSimResult(null)
                      if (next) setTimeout(() => runSimulatorWithScenario(next), 0)
                    }}
                    title={s.desc}
                    style={{
                      padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      border: activeScenario === s.id ? 'none' : '1px solid #e2e8f0',
                      background: activeScenario === s.id ? '#1a2744' : '#f8fafc',
                      color: activeScenario === s.id ? '#fff' : '#475569',
                      whiteSpace: 'nowrap',
                    }}
                  >{s.label}</button>
                ))}
              </div>
            </div>

            {/* 수동 검색 */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Field label="추가 키워드 (선택)">
                  <input
                    className="form-input"
                    placeholder="예: 암, 뇌경색, 충수염"
                    value={simKeyword}
                    onChange={(e) => { setSimKeyword(e.target.value); setSimResult(null) }}
                  />
                </Field>
              </div>
              <div style={{ width: 110 }}>
                <Field label="입원 일수">
                  <input
                    type="number"
                    className="form-input"
                    placeholder="예: 14"
                    value={simDays}
                    onChange={(e) => { setSimDays(e.target.value); setSimResult(null) }}
                  />
                </Field>
              </div>
              <button
                className="btn btn-primary"
                onClick={runSimulator}
                disabled={coverages.length === 0}
                style={{ height: 40, marginBottom: 0 }}
              >
                {coverages.length === 0 ? '데이터 없음' : '조회'}
              </button>
            </div>

            {coverages.length === 0 && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: 16, fontSize: 13, color: '#92400e', textAlign: 'center' }}>
                보장 데이터가 없습니다. 보장분석 PRO에서 분석하면 자동으로 반영됩니다.
              </div>
            )}

            {simResult && (
              <div>
                {simResult.byCompany.length === 0 ? (
                  <Empty text="해당 조건에 맞는 보장이 없습니다." />
                ) : (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      {simResult.byCompany.map((co) => {
                        const linkedPolicy = policies.find((p: any) => p.company === co.company)
                        return (
                          <div key={co.company} style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 10, border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a2744' }}>{co.company}</div>
                              <div style={{ fontWeight: 800, fontSize: 15, color: '#2563eb' }}>{formatCoverageAmount(co.total)}</div>
                            </div>
                            {linkedPolicy && (
                              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, display: 'flex', gap: 10 }}>
                                {linkedPolicy.monthly_premium > 0 && <span>월 {(linkedPolicy.monthly_premium / 10000).toFixed(1)}만원</span>}
                                {linkedPolicy.payment_day && <span>{linkedPolicy.payment_institution || ''} {linkedPolicy.payment_day}일 {linkedPolicy.payment_type || '자동이체'}</span>}
                              </div>
                            )}
                            {co.items.map((item, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', padding: '3px 0', borderTop: '1px solid #f1f5f9' }}>
                                <span>{item.name}</span>
                                <span style={{ fontWeight: 600 }}>{formatCoverageAmount(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>

                    <div style={{ background: '#1a2744', color: '#fff', borderRadius: 14, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>{customer.name} 고객님 예상 수령 총액</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {simResult.byCompany.map(c => `${c.company} ${formatCoverageAmount(c.total)}`).join(' + ')}
                        </div>
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#C9A96E' }}>
                        {formatCoverageAmount(simResult.grandTotal)}
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary"
                      onClick={saveSimulation}
                      disabled={simSaving || simSaved}
                    >
                      {simSaved ? '✓ 저장됨' : simSaving ? '저장 중...' : '이력 저장'}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'alerts' && (
          <AlertsTab customer={customer} alerts={alerts} policies={policies} onRefresh={load} />
        )}

        {tab === 'dm' && (
          <div className="grid-2">
            {dmTemplates.map((template) => (
              <div key={template.id} className="dm-card">
                <div className="flex justify-between items-center mb-8">
                  <div className="fw-700">{template.title}</div>
                  <button className={`copy-btn${copiedDm === template.id ? ' copied' : ''}`} onClick={() => copyDm(template)}>
                    {copiedDm === template.id ? '복사됨' : '복사'}
                  </button>
                </div>
                <pre className="dm-preview">{template.content(customer.name, advisorName, advisorPhone)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── 보장분석표 구조 (Excel 템플릿 동일) ─────────────────────────────────────
const COVERAGE_STRUCTURE_DISPLAY = [
  { group: '가족보장자산', sub: '사망', label: '일반', groupColor: '#3B5BA5', groupBg: '#EEF2FF' },
  { group: null, sub: null, label: '질병', groupColor: '#3B5BA5', groupBg: '#EEF2FF' },
  { group: null, sub: null, label: '재해(상해)', groupColor: '#3B5BA5', groupBg: '#EEF2FF' },
  { group: '생활보장자산', sub: '암치료비', label: '일반암', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '유사암/소액암', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '암수술비', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '항암 (방사선/약물)', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '표적항암치료', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '중입자치료', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '암주요치료비', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: '2대질병치료비', label: '뇌혈관질환', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '뇌졸중', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '뇌출혈', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '급성심근경색', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '허혈성심장질환', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '심혈관질환', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '뇌혈관수술비', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '심혈관수술비', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '2대주요치료비', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: '후유장해', label: '질병 후유장해(3%~)', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '상해 후유장해(3%~)', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: '골절', label: '골절 진단비', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '골절 수술비', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '5대골절 진단비', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '5대골절 수술비', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '깁스 치료비', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: '화상', label: '화상 진단비', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: null, sub: null, label: '화상 수술비', groupColor: '#B45309', groupBg: '#FFF7ED' },
  { group: '의료보장자산', sub: '실손의료비', label: '상해입원의료비', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: null, label: '상해통원의료비', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: null, label: '질병입원의료비', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: null, label: '질병통원의료비', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: '수술비', label: '질병 수술비', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: null, label: '질병 1~5종수술비', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: null, label: '상해 수술비', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: null, label: '상해 1~5종수술비', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: null, label: 'N대 수술비', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: null, label: '창상봉합술', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: '입원', label: '질병 입원일당', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: null, label: '상해 입원일당', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: null, label: '교통상해입원일당', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: null, label: '상해간병지원금', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: null, sub: null, label: '질병간병지원금', groupColor: '#166534', groupBg: '#F0FDF4' },
  { group: '운전자', sub: null, label: '교통사고처리지원금', groupColor: '#374151', groupBg: '#F9FAFB' },
  { group: null, sub: null, label: '교통사고벌금', groupColor: '#374151', groupBg: '#F9FAFB' },
  { group: null, sub: null, label: '변호사선임비용', groupColor: '#374151', groupBg: '#F9FAFB' },
  { group: null, sub: null, label: '자동차부상치료비', groupColor: '#374151', groupBg: '#F9FAFB' },
  { group: '치아', sub: null, label: '임플란트', groupColor: '#92400E', groupBg: '#FFFBEB' },
  { group: null, sub: null, label: '크라운', groupColor: '#92400E', groupBg: '#FFFBEB' },
  { group: '기타', sub: null, label: '가족일상배상책임', groupColor: '#6B7280', groupBg: '#F3F4F6' },
  { group: null, sub: null, label: '화재벌금', groupColor: '#6B7280', groupBg: '#F3F4F6' },
]

function findCoverageRowIndexForDisplay(name: string): number {
  const n = name.toLowerCase().replace(/[\s\-_·()/]/g, '')
  const map: { keywords: string[]; idx: number }[] = [
    { idx: 0, keywords: ['일반사망', '사망보험금'] },
    { idx: 1, keywords: ['질병사망'] },
    { idx: 2, keywords: ['재해사망', '상해사망'] },
    { idx: 4, keywords: ['유사암', '소액암', '경계성암', '갑상선암', '피부암'] },
    { idx: 5, keywords: ['암수술비', '암수술'] },
    { idx: 6, keywords: ['항암방사선', '방사선치료', '약물항암', '항암약물', '항암치료비', '항암(방사선', '항암(약물'] },
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
    { idx: 31, keywords: ['질병통원의료비', '질병통원실비', '질병외래', '실손의료비', '실손'] },
    { idx: 33, keywords: ['질병1~5종', '질병종수술', '질병5종', '질병3종', '질병1종', '1~5종수술'] },
    { idx: 32, keywords: ['질병수술비'] },
    { idx: 35, keywords: ['상해1~5종', '상해종수술', '상해5종', '상해3종', '상해1종'] },
    { idx: 34, keywords: ['상해수술비'] },
    { idx: 36, keywords: ['n대수술', '64대수술', '7대수술', '32대수술', '100대수술'] },
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
    { idx: 49, keywords: ['가족일상배상', '일상배상', '일상생활배상'] },
    { idx: 50, keywords: ['화재벌금', '화재'] },
  ]
  for (const entry of map) {
    if (entry.keywords.some((kw) => n.includes(kw))) return entry.idx
  }
  return -1
}

function toManwonDisplay(amount: number): number {
  return amount >= 100000 ? Math.round(amount / 10000) : amount
}

function buildCoverageDisplayMatrix(policiesData: any[], coveragesData: any[]) {
  // policy_id 매칭 실패한 담보를 회사명으로 폴백 처리
  const effectivePolicies = policiesData.length > 0 ? policiesData : []

  // coverage에 policy_id가 없거나 매칭 안 될 때: company 기준으로 policy 추정
  const companyToPolicyIdx = new Map<string, number>()
  effectivePolicies.slice(0, 8).forEach((p, i) => {
    if (p.company) companyToPolicyIdx.set(String(p.company).trim(), i)
  })

  // policy_id로 매칭 안 되는 담보는 "추가 컬럼"으로 집계
  const hasUnmatchedCoverages = coveragesData.some((cov: any) => {
    const policyIdx = effectivePolicies.findIndex((p) => p.id === cov.policy_id)
    return policyIdx < 0
  })
  const extraCol = hasUnmatchedCoverages && effectivePolicies.length < 8 ? 1 : 0
  const numPolicies = Math.min(effectivePolicies.length + extraCol, 8)
  const extraColIdx = effectivePolicies.length // 추가 컬럼 인덱스

  const amountGrid: number[][] = Array.from({ length: 51 }, () => Array(numPolicies).fill(0))

  coveragesData.forEach((cov: any) => {
    let policyIdx = effectivePolicies.findIndex((p) => p.id === cov.policy_id)
    if (policyIdx < 0) {
      // 폴백 1: company 기준 매칭
      const company = String(cov.company || '').trim()
      if (company && companyToPolicyIdx.has(company)) {
        policyIdx = companyToPolicyIdx.get(company)!
      } else if (extraCol > 0) {
        // 폴백 2: 미매칭 전용 컬럼
        policyIdx = extraColIdx
      } else {
        return
      }
    }
    if (policyIdx >= numPolicies) return
    const name = String(cov.name || '').toLowerCase().replace(/[\s\-_·()/]/g, '')
    const ri = findCoverageRowIndexForDisplay(name)
    const amount = Number(cov.amount || 0)
    if (ri >= 0 && ri < 51 && amount > 0) {
      amountGrid[ri][policyIdx] += toManwonDisplay(amount)
    }
  })

  // 미매칭 컬럼이 있으면 policies 배열에 가상 항목 추가
  const displayPoliciesList = [...effectivePolicies.slice(0, 8)]
  if (extraCol > 0) {
    displayPoliciesList.push({ company: '기타', product_name: '분석 데이터', monthly_premium: 0 })
  }

  return { amountGrid, numPolicies, displayPoliciesList }
}

function normalizeCoverageGraphCategory(category?: string, coverageName?: string, note?: string) {
  const text = `${category || ''} ${coverageName || ''} ${note || ''}`.toLowerCase()

  if (text.includes('암') || text.includes('항암') || text.includes('표적') || text.includes('중입자') || text.includes('cancer')) return 'cancer'
  if (text.includes('뇌') || text.includes('brain') || text.includes('stroke')) return 'brain'
  if (text.includes('심장') || text.includes('심근') || text.includes('허혈') || text.includes('순환계') || text.includes('heart')) return 'heart'
  if (text.includes('간병') || text.includes('요양') || text.includes('재가') || text.includes('nursing')) return 'nursing'
  if (text.includes('입원') || text.includes('실손') || text.includes('의료비') || text.includes('통원') || text.includes('hospital')) return 'hospitalization'
  if (text.includes('수술') || text.includes('surgery')) return 'surgery'
  if (text.includes('운전자') || text.includes('교통') || text.includes('벌금') || text.includes('변호사') || text.includes('자동차부상') || text.includes('driver')) return 'driver'
  if (text.includes('화재') || text.includes('배상') || text.includes('일상') || text.includes('fire')) return 'fire'
  if (text.includes('사망') || text.includes('death')) return 'death'
  if (text.includes('장해') || text.includes('후유') || text.includes('disability')) return 'disability'
  if (text.includes('치아') || text.includes('임플란트') || text.includes('크라운') || text.includes('dental')) return 'dental'

  return 'etc'
}

function formatCoverageAmount(amount?: number) {
  const value = Number(amount) || 0
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억원`
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만원`
  return `${value.toLocaleString()}원`
}

// 월 보험료: 만원 단위 표시 (100만원 이상이면 억 단위)
function formatManwon(value?: number): string {
  const v = Number(value) || 0
  if (v === 0) return '-'
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억원`
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만원`
  return `${v.toLocaleString()}원`
}

// ── 알림 탭 ──────────────────────────────────────────────────────────────────
const ALERT_TYPE_LABELS: Record<string, string> = {
  birthday: '🎂 생일',
  car_renewal_d60: '🚗 자동차 D-60',
  car_renewal_d30: '🚗 자동차 D-30',
  indemnity_end: '⚠️ 면책 종료',
  reduction_end: '⚠️ 감액 종료',
  indemnity_renewal: '🔄 실손 재가입',
  join_30: '📅 가입 30일',
  join_90: '📅 가입 90일',
  join_180: '📅 가입 180일',
  join_365: '📅 가입 1년',
  consulting: '💬 상담 예정',
  car_insurance: '🚗 자동차보험 갱신',
}

const ALERT_BADGE: Record<string, string> = {
  birthday: 'badge-pink',
  car_renewal_d60: 'badge-purple',
  car_renewal_d30: 'badge-purple',
  car_insurance: 'badge-purple',
  indemnity_end: 'badge-orange',
  reduction_end: 'badge-orange',
  indemnity_renewal: 'badge-cyan',
  join_30: 'badge-blue',
  join_90: 'badge-blue',
  join_180: 'badge-blue',
  join_365: 'badge-blue',
  consulting: 'badge-green',
}

function AlertsTab({ customer, alerts, policies, onRefresh }: { customer: any; alerts: any[]; policies: any[]; onRefresh: () => void }) {
  const today = new Date()
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [localAlerts, setLocalAlerts] = useState(alerts)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => { setLocalAlerts(alerts) }, [alerts])

  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()

  const calcDday = (year: number, month: number, day: number): number => {
    const eventDate = new Date(year, month, day)
    return Math.round((eventDate.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24))
  }

  type CalEvent = { type: string; label: string; detail: string; dday: number; alertId?: string; isDone?: boolean }
  const eventsMap = new Map<number, CalEvent[]>()
  const addEvent = (day: number, event: CalEvent) => {
    const maxDay = new Date(viewYear, viewMonth + 1, 0).getDate()
    if (day < 1 || day > maxDay) return
    const list = eventsMap.get(day) || []
    list.push(event)
    eventsMap.set(day, list)
  }

  // 생일 (매년 반복)
  if (customer.birth_date) {
    const birth = new Date(customer.birth_date)
    if (birth.getMonth() === viewMonth) {
      const d = birth.getDate()
      addEvent(d, { type: 'birthday', label: `🎂 ${customer.name}님 생일`, detail: `생년월일: ${customer.birth_date}`, dday: calcDday(viewYear, viewMonth, d) })
    }
  }

  // 자동차보험 갱신 (exact date)
  if (customer.car_insurance_renewal_date) {
    const renewal = new Date(customer.car_insurance_renewal_date)
    if (renewal.getFullYear() === viewYear && renewal.getMonth() === viewMonth) {
      const d = renewal.getDate()
      addEvent(d, { type: 'car_renewal', label: `🚗 ${customer.name}님 자동차갱신`, detail: `자동차보험 갱신일: ${customer.car_insurance_renewal_date}`, dday: calcDday(viewYear, viewMonth, d) })
    }
  }

  // 보험 계약 가입일 기념일 (매년 반복)
  policies.forEach((policy: any) => {
    const startDate = policy.start_date || policy.contract_date
    if (!startDate) return
    const start = new Date(startDate)
    if (start.getMonth() === viewMonth) {
      const d = start.getDate()
      const years = viewYear - start.getFullYear()
      addEvent(d, {
        type: 'policy_anniversary',
        label: `📋 ${policy.company} 가입기념일`,
        detail: `${policy.company} ${policy.product_name || ''} 가입일 (${years > 0 ? `${years}주년` : '가입 당해년도'})`,
        dday: calcDday(viewYear, viewMonth, d),
      })
    }
  })

  // DB 알림
  localAlerts.forEach((alert: any) => {
    if (!alert.due_date) return
    const d = new Date(alert.due_date)
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      addEvent(d.getDate(), {
        type: 'notification',
        label: `🔔 ${ALERT_TYPE_LABELS[alert.type] || alert.type}`,
        detail: alert.message || alert.type,
        dday: calcDday(viewYear, viewMonth, d.getDate()),
        alertId: alert.id,
        isDone: alert.is_done,
      })
    }
  })

  // 달력 격자 계산
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const weeks: (number | null)[][] = []
  let dayCount = 1
  for (let w = 0; w < 6; w++) {
    const row: (number | null)[] = []
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d
      row.push(idx < firstDow || dayCount > daysInMonth ? null : dayCount++)
    }
    weeks.push(row)
    if (dayCount > daysInMonth) break
  }

  const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
  const DAY_NAMES = ['일','월','화','수','목','금','토']

  const formatDday = (dday: number): string => {
    if (dday === 0) return 'D-0'
    if (dday > 0) return `D-${dday}`
    return `D+${Math.abs(dday)}`
  }

  const eventTypeColor: Record<string, { bg: string; text: string }> = {
    birthday: { bg: '#fce7f3', text: '#9d174d' },
    car_renewal: { bg: '#ede9fe', text: '#5b21b6' },
    policy_anniversary: { bg: '#dbeafe', text: '#1d4ed8' },
    notification: { bg: '#dcfce7', text: '#166534' },
  }

  const generateNotifications = async () => {
    setGenerating(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setGenerating(false); return }
    const toIso = (d: Date) => d.toISOString().slice(0, 10)
    const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
    const toInsert: any[] = []
    if (customer.birth_date) {
      const birth = new Date(customer.birth_date)
      const nextBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
      if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1)
      toInsert.push({ customer_id: customer.id, customer_name: customer.name, type: 'birthday', title: '고객 생일', message: `${customer.name} 고객님 생일`, due_date: toIso(nextBday), is_done: false, is_read: false })
    }
    if (customer.car_insurance_renewal_date) {
      const renewal = new Date(customer.car_insurance_renewal_date)
      if (renewal > today) {
        toInsert.push({ customer_id: customer.id, customer_name: customer.name, type: 'car_renewal_d60', title: '자동차보험 갱신 D-60', message: `자동차보험 갱신 D-60`, due_date: toIso(addDays(renewal, -60)), is_done: false, is_read: false })
        toInsert.push({ customer_id: customer.id, customer_name: customer.name, type: 'car_renewal_d30', title: '자동차보험 갱신 D-30', message: `자동차보험 갱신 D-30`, due_date: toIso(addDays(renewal, -30)), is_done: false, is_read: false })
      }
    }
    if (customer.join_date) {
      const joinDate = new Date(customer.join_date)
      for (const days of [30, 90, 180, 365]) {
        const alertDate = addDays(joinDate, days)
        if (alertDate > today) toInsert.push({ customer_id: customer.id, customer_name: customer.name, type: `join_${days}`, title: `계약 후 ${days}일 점검`, message: `계약 후 ${days}일 — 안착 관리 연락`, due_date: toIso(alertDate), is_done: false, is_read: false })
      }
    }
    const existingKeys = new Set(localAlerts.map((alert: any) => `${alert.type}|${alert.due_date}`))
    const uniqueRows = toInsert.filter((row) => !existingKeys.has(`${row.type}|${row.due_date}`))
    if (uniqueRows.length > 0) await supabase.from('notifications').insert(uniqueRows)
    setGenerating(false)
    onRefresh()
  }

  const toggleDone = async (alert: any) => {
    setToggling(alert.id)
    const next = !alert.is_done
    await supabase.from('notifications').update({ is_done: next, is_read: true }).eq('id', alert.id)
    setLocalAlerts((prev: any[]) => prev.map((a) => a.id === alert.id ? { ...a, is_done: next, is_read: true } : a))
    setToggling(null)
  }

  const selectedEvents = selectedDay ? (eventsMap.get(selectedDay) || []) : []

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>알림 달력</div>
        <button className="btn btn-primary btn-sm" onClick={generateNotifications} disabled={generating}>
          {generating ? '생성 중...' : '🔔 알림 자동 생성'}
        </button>
      </div>

      {/* 월 네비게이션 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
        <button
          onClick={() => { setViewDate(new Date(viewYear, viewMonth - 1, 1)); setSelectedDay(null) }}
          style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 15, cursor: 'pointer', fontWeight: 700, color: '#475569' }}
        >◀</button>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#1a2744', minWidth: 120, textAlign: 'center' }}>
          {viewYear}년 {MONTH_NAMES[viewMonth]}
        </div>
        <button
          onClick={() => { setViewDate(new Date(viewYear, viewMonth + 1, 1)); setSelectedDay(null) }}
          style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 15, cursor: 'pointer', fontWeight: 700, color: '#475569' }}
        >▶</button>
      </div>

      {/* 달력 그리드 */}
      <div style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 16 }}>
        {/* 요일 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#1a2744' }}>
          {DAY_NAMES.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '9px 0', fontSize: 12, fontWeight: 700, color: i === 0 ? '#fca5a5' : i === 6 ? '#93c5fd' : '#e2e8f0' }}>
              {d}
            </div>
          ))}
        </div>
        {/* 날짜 셀 */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
            {week.map((day, di) => {
              const isToday = day !== null && viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate()
              const isSelected = day === selectedDay
              const events = day ? (eventsMap.get(day) || []) : []
              return (
                <div
                  key={di}
                  onClick={() => day && setSelectedDay(isSelected ? null : day)}
                  style={{
                    minHeight: 72, padding: '5px 4px 4px', cursor: day ? 'pointer' : 'default',
                    background: isSelected ? '#eff6ff' : '#fff',
                    borderRight: di < 6 ? '1px solid #f1f5f9' : 'none',
                    transition: 'background 0.1s',
                  }}
                >
                  {day && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: isToday ? 900 : 500, marginBottom: 3, color: di === 0 ? '#ef4444' : di === 6 ? '#3b82f6' : '#374151' }}>
                        {isToday ? (
                          <span style={{ background: '#1a2744', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{day}</span>
                        ) : day}
                      </div>
                      {events.slice(0, 2).map((ev, ei) => {
                        const color = eventTypeColor[ev.type] || { bg: '#f1f5f9', text: '#374151' }
                        return (
                          <div key={ei} style={{ fontSize: 9, marginBottom: 2, background: color.bg, color: color.text, borderRadius: 4, padding: '1px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                            {ev.label}
                          </div>
                        )
                      })}
                      {events.length > 2 && <div style={{ fontSize: 9, color: '#94a3b8', paddingLeft: 2 }}>+{events.length - 2}개</div>}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* 날짜 상세 패널 */}
      {selectedDay && (
        <div style={{ borderRadius: 14, border: '1px solid #e2e8f0', padding: '16px 20px', marginBottom: 16, background: '#f8fafc' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#1a2744', marginBottom: 12 }}>
            {viewYear}년 {viewMonth + 1}월 {selectedDay}일 일정
          </div>
          {selectedEvents.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>이 날의 일정이 없습니다.</div>
          ) : (
            selectedEvents.map((ev, i) => {
              const color = eventTypeColor[ev.type] || { bg: '#f1f5f9', text: '#374151' }
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2 }}>{ev.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{ev.detail}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ background: color.bg, color: color.text, padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: 12 }}>
                      {formatDday(ev.dday)}
                    </span>
                    {ev.alertId && (
                      <button
                        onClick={() => toggleDone({ id: ev.alertId, is_done: ev.isDone })}
                        disabled={toggling === ev.alertId}
                        style={{ border: 'none', background: ev.isDone ? '#f1f5f9' : '#dcfce7', color: ev.isDone ? '#64748b' : '#166534', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {ev.isDone ? '취소' : '완료'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* 이번 달 전체 일정 목록 (D-day 순서) */}
      {(() => {
        const allEvents: { day: number; event: CalEvent }[] = []
        eventsMap.forEach((evs, day) => evs.forEach((ev) => allEvents.push({ day, event: ev })))
        allEvents.sort((a, b) => a.event.dday - b.event.dday)
        const upcomingEvents = allEvents.filter(({ event }) => event.dday >= -7)
        if (upcomingEvents.length === 0) return (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
            이달 예정된 일정이 없습니다.<br />
            <span style={{ fontSize: 12 }}>알림 자동 생성 버튼으로 생일·갱신 알림을 만드세요.</span>
          </div>
        )
        return (
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 10 }}>{MONTH_NAMES[viewMonth]} 전체 일정</div>
            {upcomingEvents.map(({ day, event }, i) => {
              const color = eventTypeColor[event.type] || { bg: '#f1f5f9', text: '#374151' }
              return (
                <div key={i} onClick={() => setSelectedDay(day)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 6, cursor: 'pointer' }}>
                  <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{viewMonth + 1}월</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1a2744' }}>{day}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{event.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{event.detail}</div>
                  </div>
                  <span style={{ background: color.bg, color: color.text, padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                    {formatDday(event.dday)}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="cust-info-item">
      <div className="cust-info-label">{label}</div>
      <div className="cust-info-val">{value}</div>
      {sub && <div className="cust-info-sub">{sub}</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 34, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{text}</div>
}

function EditBasicForm({ editForm, setEditForm }: { editForm: any; setEditForm: React.Dispatch<React.SetStateAction<any>> }) {
  const update = (key: string, value: any) => setEditForm((prev: any) => ({ ...prev, [key]: value }))

  return (
    <>
      <div className="grid-2">
        <Field label="이름"><input className="form-input" value={editForm.name || ''} onChange={(e) => update('name', e.target.value)} /></Field>
        <Field label="연락처"><input className="form-input" value={editForm.phone || ''} onChange={(e) => update('phone', e.target.value)} /></Field>
        <Field label="생년월일"><input type="date" className="form-input" value={editForm.birth_date || ''} onChange={(e) => update('birth_date', e.target.value)} /></Field>
        <Field label="직업"><input className="form-input" value={editForm.occupation || ''} onChange={(e) => update('occupation', e.target.value)} /></Field>
        <Field label="월 보험료"><input type="number" className="form-input" value={editForm.monthly_premium || ''} onChange={(e) => update('monthly_premium', e.target.value)} /></Field>
        <Field label="보험 건수"><input type="number" className="form-input" value={editForm.policy_count || ''} onChange={(e) => update('policy_count', e.target.value)} /></Field>
        <Field label="실손 세대"><input type="number" className="form-input" value={editForm.indemnity_generation || ''} onChange={(e) => update('indemnity_generation', e.target.value)} /></Field>
        <Field label="가족 인원"><input type="number" className="form-input" value={editForm.family_count || ''} onChange={(e) => update('family_count', e.target.value)} /></Field>
      </div>
      <Field label="상태">
        <select className="form-input" value={editForm.status || 'new'} onChange={(e) => update('status', e.target.value)}>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="주소"><input className="form-input" value={editForm.address || ''} onChange={(e) => update('address', e.target.value)} /></Field>
      <Field label="상담 요약"><textarea rows={4} className="form-input" value={editForm.consulting_summary || ''} onChange={(e) => update('consulting_summary', e.target.value)} /></Field>
      <Field label="보험 가입 이유"><textarea rows={3} className="form-input" value={editForm.insurance_reason || ''} onChange={(e) => update('insurance_reason', e.target.value)} placeholder="고객이 보험을 준비하게 된 이유, 걱정되는 부분, 보장 목표 등" /></Field>
    </>
  )
}
