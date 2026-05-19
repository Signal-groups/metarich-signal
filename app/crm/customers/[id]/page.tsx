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
}

const tabs = [
  { id: 'basic', label: '기본정보' },
  { id: 'family', label: '가족' },
  { id: 'policies', label: '보험계약' },
  { id: 'coverage', label: '보장그래프' },
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
  const [advisorName, setAdvisorName] = useState('담당자')
  const [advisorPhone, setAdvisorPhone] = useState('')
  const [copiedDm, setCopiedDm] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [showPolicyForm, setShowPolicyForm] = useState(false)
  const [policyForm, setPolicyForm] = useState({ company: '', product_name: '', policy_number: '', monthly_premium: '', start_date: '', end_date: '', status: 'active' })
  const [showFamilyForm, setShowFamilyForm] = useState(false)
  const [familyForm, setFamilyForm] = useState({ name: '', birth_date: '', relation: 'spouse', phone: '' })

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

    const [{ data: cust }, { data: policyData }, { data: coverageData }, { data: familyData }, { data: alertData }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', id).eq('advisor_id', session.user.id).is('deleted_at', null).single(),
      supabase.from('policies').select('*').eq('customer_id', id).order('start_date', { ascending: false }),
      supabase.from('coverages').select('*').eq('customer_id', id),
      supabase.from('families').select('*').eq('customer_id', id),
      supabase.from('notifications').select('*').eq('customer_id', id).order('due_date', { ascending: true }),
    ])

    if (!cust) {
      router.push('/crm/customers')
      return
    }

    setCustomer(cust)
    setEditForm(cust)
    setPolicies(policyData || [])
    setCoverages(coverageData || [])
    setFamilies(familyData || [])
    setAlerts(alertData || [])

    const totals: Record<string, number> = {}
    ;(coverageData || []).forEach((coverage: any) => {
      totals[coverage.category] = (totals[coverage.category] || 0) + (coverage.amount || 0)
    })
    const maxAmount = Math.max(...Object.values(totals), 1)
    setRadarData(Object.entries(categoryNames).map(([key, label]) => ({
      category: label,
      value: Math.round(((totals[key] || 0) / maxAmount) * 100),
      recommended: 100,
    })))

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
      tags: editForm.tags || [],
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setCustomer({ ...customer, ...editForm })
    setEditing(false)
    setSaving(false)
  }

  const addPolicy = async () => {
    if (!policyForm.company || !policyForm.product_name) return
    await supabase.from('policies').insert({
      customer_id: id,
      ...policyForm,
      monthly_premium: Number(policyForm.monthly_premium) || 0,
    })
    setShowPolicyForm(false)
    setPolicyForm({ company: '', product_name: '', policy_number: '', monthly_premium: '', start_date: '', end_date: '', status: 'active' })
    load()
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

  const deleteCustomer = async () => {
    if (!confirm(`${customer?.name} 고객을 삭제하시겠습니까? 앱과 PC 목록에서 함께 숨김 처리됩니다.`)) return
    await supabase.from('customers').update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
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
              <button className="btn btn-primary btn-sm" onClick={() => setShowPolicyForm((value) => !value)}>+ 추가</button>
            </div>
            {showPolicyForm && (
              <div className="bg-gray rounded p-16 mb-16">
                <div className="grid-2">
                  <Field label="보험사"><input className="form-input" value={policyForm.company} onChange={(e) => setPolicyForm((p) => ({ ...p, company: e.target.value }))} /></Field>
                  <Field label="상품명"><input className="form-input" value={policyForm.product_name} onChange={(e) => setPolicyForm((p) => ({ ...p, product_name: e.target.value }))} /></Field>
                  <Field label="증권번호"><input className="form-input" value={policyForm.policy_number} onChange={(e) => setPolicyForm((p) => ({ ...p, policy_number: e.target.value }))} /></Field>
                  <Field label="월 보험료"><input type="number" className="form-input" value={policyForm.monthly_premium} onChange={(e) => setPolicyForm((p) => ({ ...p, monthly_premium: e.target.value }))} /></Field>
                  <Field label="시작일"><input type="date" className="form-input" value={policyForm.start_date} onChange={(e) => setPolicyForm((p) => ({ ...p, start_date: e.target.value }))} /></Field>
                  <Field label="만기일"><input type="date" className="form-input" value={policyForm.end_date} onChange={(e) => setPolicyForm((p) => ({ ...p, end_date: e.target.value }))} /></Field>
                </div>
                <button className="btn btn-primary btn-sm" onClick={addPolicy}>저장</button>
              </div>
            )}
            {policies.map((policy) => (
              <div key={policy.id} className="policy-row">
                <div style={{ flex: 1 }}>
                  <div className="fw-700">{policy.company} · {policy.product_name}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{policy.policy_number || '-'} · {policy.start_date || '-'} ~ {policy.end_date || '-'}</div>
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
              {coverages.map((coverage) => (
                <div key={coverage.id} className="cov-bar-row">
                  <div className="cov-bar-label">{categoryNames[coverage.category] || coverage.category}</div>
                  <div className="cov-bar-track"><div className="cov-bar-fill" style={{ width: `${Math.min((coverage.amount || 0) / 1000, 100)}%`, background: '#3b82f6' }} /></div>
                  <div className="cov-bar-val">{(coverage.amount || 0).toLocaleString()}</div>
                </div>
              ))}
              {coverages.length === 0 && <Empty text="보장 항목이 없습니다." />}
            </div>
          </div>
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
    </>
  )
}
