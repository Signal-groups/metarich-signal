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
    setFamilies(familyData || [])
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

  const runSimulator = () => {
    // 이벤트 타입에 따라 관련 카테고리 필터
    const categoryMap: Record<string, string[]> = {
      diagnosis: ['cancer', 'brain', 'heart'],
      hospitalization: ['hospitalization', 'cancer', 'brain', 'heart', 'surgery', 'nursing'],
      surgery: ['surgery', 'cancer', 'brain', 'heart'],
    }
    const relevantCategories = categoryMap[simEventType]
    const keyword = simKeyword.trim().toLowerCase()
    const days = Number(simDays) || 0

    // 관련 담보 필터링
    const matched = coverages.filter((cov: any) => {
      const inCategory = relevantCategories.includes(cov.category)
      const nameMatch = keyword ? (cov.name || '').toLowerCase().includes(keyword) || (cov.condition || '').toLowerCase().includes(keyword) : true
      return inCategory || nameMatch
    })

    // 회사별 그룹핑
    const companyMap: Record<string, { name: string; amount: number }[]> = {}
    matched.forEach((cov: any) => {
      const co = cov.company || cov.product_name?.split(' ')[0] || '기타'
      if (!companyMap[co]) companyMap[co] = []
      let amt = Number(cov.amount) || 0
      // 입원일 경우 일당 × 일수 처리 (1만원 이하 값은 일당으로 간주)
      if (simEventType === 'hospitalization' && days > 0 && amt > 0 && amt <= 300000) {
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
                <Link href={`/crm/analysis?customerId=${id}`} className="btn btn-primary" style={{ textDecoration: 'none' }}>보장분석</Link>
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
                <Info label="월 보험료" value={`${(customer.monthly_premium || 0).toLocaleString()}원`} />
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
              <div key={member.id} className="family-card">
                <div className="family-avatar" style={{ background: '#eff6ff', color: '#2563eb' }}>{member.name?.slice(0, 1)}</div>
                <div style={{ flex: 1 }}>
                  <div className="fw-700">{member.name}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{relationLabel[member.relation] || member.relation} · {member.birth_date || '-'}</div>
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>{member.phone || '-'}</div>
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
                      <span style={{ color: '#0369a1', fontWeight: 700 }}>{info.total.toLocaleString()}원 · {byDay[key as any]?.type || '자동이체'}</span>
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
                <div className="fw-700">{(policy.monthly_premium || 0).toLocaleString()}원</div>
              </div>
            ))}
            {policies.length === 0 && <Empty text="등록된 보험계약이 없습니다." />}
          </>
        )}

        {tab === 'coverage' && (
          <div className="grid-2">
            <div>
              <div className="card-title">보장 그래프</div>
              {radarData.length > 0 ? (
                <div className="radar-wrap" style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <Radar name="현재" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} />
                      <Radar name="권장" dataKey="recommended" stroke="#E2E8F0" fill="none" strokeDasharray="4 2" />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : <Empty text="보장 데이터가 없습니다." />}
            </div>
            <div>
              <div className="card-title">보장 항목</div>
              {coverageBars.map((coverage) => (
                <div key={coverage.key} className="cov-bar-row">
                  <div className="cov-bar-label">{coverage.label}</div>
                  <div className="cov-bar-track"><div className="cov-bar-fill" style={{ width: `${Math.max(6, Math.min(coverage.value, 100))}%`, background: '#3b82f6' }} /></div>
                  <div className="cov-bar-val">{formatCoverageAmount(coverage.amount)}</div>
                </div>
              ))}
              {coverageBars.length === 0 && <Empty text="보장 항목이 없습니다." />}
            </div>
          </div>
        )}

        {tab === 'simulator' && (
          <>
            <div className="card-title">보장 계산</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              고객이 입원·수술·진단을 받을 경우 보험사별 예상 수령액을 간단히 안내합니다.
            </div>

            {/* 이벤트 타입 선택 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[
                { id: 'diagnosis', label: '진단비' },
                { id: 'hospitalization', label: '입원비' },
                { id: 'surgery', label: '수술비' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setSimEventType(item.id as any); setSimResult(null) }}
                  style={{
                    padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    border: simEventType === item.id ? 'none' : '1px solid #e2e8f0',
                    background: simEventType === item.id ? '#1a2744' : '#fff',
                    color: simEventType === item.id ? '#fff' : '#475569',
                    cursor: 'pointer',
                  }}
                >{item.label}</button>
              ))}
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              <Field label="진단명 / 수술명 (키워드)">
                <input
                  className="form-input"
                  placeholder="예: 암, 뇌경색, 충수염"
                  value={simKeyword}
                  onChange={(e) => { setSimKeyword(e.target.value); setSimResult(null) }}
                />
              </Field>
              {simEventType === 'hospitalization' && (
                <Field label="입원 일수">
                  <input
                    type="number"
                    className="form-input"
                    placeholder="예: 14"
                    value={simDays}
                    onChange={(e) => { setSimDays(e.target.value); setSimResult(null) }}
                  />
                </Field>
              )}
            </div>

            <button
              className="btn btn-primary"
              onClick={runSimulator}
              disabled={coverages.length === 0}
              style={{ marginBottom: 24 }}
            >
              {coverages.length === 0 ? '보장 데이터 없음 (보장분석 필요)' : '계산하기'}
            </button>

            {simResult && (
              <div>
                {simResult.byCompany.length === 0 ? (
                  <Empty text="해당 조건에 맞는 보장이 없습니다." />
                ) : (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      {simResult.byCompany.map((co) => (
                        <div key={co.company} style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a2744' }}>{co.company}</div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: '#2563eb' }}>{formatCoverageAmount(co.total)}</div>
                          </div>
                          {co.items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', padding: '3px 0', borderTop: i === 0 ? '1px solid #e2e8f0' : undefined }}>
                              <span>{item.name}</span>
                              <span>{formatCoverageAmount(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
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
          <>
            {alerts.map((alert) => (
              <div key={alert.id} className={`alert-item ${!alert.is_read && !alert.is_done ? 'unread' : ''}`} style={{ marginLeft: -20, marginRight: -20 }}>
                {!alert.is_read && !alert.is_done && <div className="alert-unread-dot" />}
                <div className="alert-info">
                  <div className="alert-name">{alert.customer_name || customer.name}</div>
                  <div className="alert-msg">{alert.message || alert.type}</div>
                </div>
                <div className="alert-date">{alert.due_date}</div>
              </div>
            ))}
            {alerts.length === 0 && <Empty text="등록된 알림이 없습니다." />}
          </>
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
  if (value >= 100000000) return `${Math.round(value / 100000000).toLocaleString()}억`
  if (value >= 10000) return `${Math.round(value / 10000).toLocaleString()}만`
  return value.toLocaleString()
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
