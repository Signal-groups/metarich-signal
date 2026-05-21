'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

const STATUS_OPTIONS = [
  { value: 'new', label: '신규' },
  { value: 'analysis', label: '분석' },
  { value: 'consulting', label: '상담' },
  { value: 'proposal', label: '제안' },
  { value: 'hold', label: '보류' },
  { value: 'contracted', label: '계약' },
  { value: 'managing', label: '관리' },
]

const TAGS = ['#암부족', '#뇌심장부족', '#갱신형주의', '#실손점검', '#운전자없음', '#화재점검필요']

export default function NewCustomerPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    birth_date: '',
    gender: 'male',
    address: '',
    occupation: '',
    join_date: new Date().toISOString().slice(0, 10),
    status: 'new',
    monthly_premium: '',
    policy_count: '',
    indemnity_generation: '',
    family_count: '',
    consulting_summary: '',
    tags: [] as string[],
  })

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const toggleTag = (tag: string) => {
    set('tags', form.tags.includes(tag) ? form.tags.filter((item) => item !== tag) : [...form.tags, tag])
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name || !form.phone) {
      setError('이름과 연락처는 필수입니다.')
      return
    }

    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setSaving(false)
      return
    }

    const phone = normalizePhone(form.phone)
    const payload = {
      advisor_id: session.user.id,
      name: form.name,
      phone,
      birth_date: form.birth_date || null,
      gender: form.gender,
      address: form.address || null,
      occupation: form.occupation || null,
      join_date: form.join_date,
      status: form.status,
      monthly_premium: Number(form.monthly_premium) || 0,
      policy_count: Number(form.policy_count) || 0,
      indemnity_generation: form.indemnity_generation ? Number(form.indemnity_generation) : null,
      family_count: form.family_count ? Number(form.family_count) : null,
      consulting_summary: form.consulting_summary || null,
      tags: form.tags,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    }

    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('id')
      .eq('advisor_id', session.user.id)
      .eq('phone', phone)
      .maybeSingle()

    if (findError) {
      setError(getCustomerSaveErrorMessage(findError.message))
      setSaving(false)
      return
    }

    const { error: dbError } = existingCustomer?.id
      ? await supabase.from('customers').update(payload).eq('id', existingCustomer.id)
      : await supabase.from('customers').insert(payload)

    if (dbError) {
      setError(getCustomerSaveErrorMessage(dbError.message))
      setSaving(false)
      return
    }

    router.push('/crm/customers')
  }

  return (
    <>
      <div className="page-header">
        <div>
          <button type="button" className="link" style={{ marginBottom: 8 }} onClick={() => router.back()}>← 뒤로</button>
          <div className="page-title">고객 등록</div>
          <div className="page-subtitle">상담과 보장분석에 필요한 기본 정보를 입력합니다.</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card card-p" style={{ maxWidth: 860 }}>
        {error && (
          <div className="badge badge-red" style={{ marginBottom: 16, borderRadius: 10, padding: '10px 12px' }}>{error}</div>
        )}

        <div className="grid-2">
          <Field label="이름 *">
            <input className="form-input" value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="고객명" required />
          </Field>
          <Field label="연락처 *">
            <input className="form-input" value={form.phone} onChange={(event) => set('phone', event.target.value)} placeholder="010-0000-0000" required />
          </Field>
          <Field label="생년월일">
            <input type="date" className="form-input" value={form.birth_date} onChange={(event) => set('birth_date', event.target.value)} />
          </Field>
          <Field label="성별">
            <select className="form-input" value={form.gender} onChange={(event) => set('gender', event.target.value)}>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </Field>
          <Field label="직업">
            <input className="form-input" value={form.occupation} onChange={(event) => set('occupation', event.target.value)} placeholder="직업 입력" />
          </Field>
          <Field label="등록일">
            <input type="date" className="form-input" value={form.join_date} onChange={(event) => set('join_date', event.target.value)} />
          </Field>
          <Field label="월 보험료">
            <input type="number" className="form-input" value={form.monthly_premium} onChange={(event) => set('monthly_premium', event.target.value)} placeholder="0" />
          </Field>
          <Field label="보험 건수">
            <input type="number" className="form-input" value={form.policy_count} onChange={(event) => set('policy_count', event.target.value)} placeholder="0" />
          </Field>
          <Field label="실손 세대">
            <input type="number" className="form-input" value={form.indemnity_generation} onChange={(event) => set('indemnity_generation', event.target.value)} placeholder="1~4" />
          </Field>
          <Field label="가족 인원">
            <input type="number" className="form-input" value={form.family_count} onChange={(event) => set('family_count', event.target.value)} placeholder="명" />
          </Field>
        </div>

        <div className="form-group">
          <label className="form-label">상태</label>
          <div className="tab-bar">
            {STATUS_OPTIONS.map((option) => (
              <button key={option.value} type="button" className={`tab-btn${form.status === option.value ? ' active' : ''}`} onClick={() => set('status', option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="주소">
          <input className="form-input" value={form.address} onChange={(event) => set('address', event.target.value)} placeholder="주소 입력" />
        </Field>

        <Field label="상담 요약">
          <textarea rows={3} className="form-input" value={form.consulting_summary} onChange={(event) => set('consulting_summary', event.target.value)} placeholder="상담 내용 요약" />
        </Field>

        <div className="form-group">
          <label className="form-label">태그</label>
          <div>
            {TAGS.map((tag) => (
              <button key={tag} type="button" className={`tag ${form.tags.includes(tag) ? 'tag-cyan' : 'tag-yellow'}`} onClick={() => toggleTag(tag)}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-12" style={{ paddingTop: 12 }}>
          <button type="button" onClick={() => router.back()} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
            취소
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.5 : 1 }}>
            {saving ? '저장 중...' : '고객 등록'}
          </button>
        </div>
      </form>
    </>
  )
}

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d]/g, '')
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  return value.trim()
}

function getCustomerSaveErrorMessage(message: string) {
  if (message.includes('duplicate') || message.includes('unique')) {
    return '이미 등록된 연락처입니다. 기존 고객 정보를 확인한 뒤 다시 시도해주세요.'
  }

  if (message.includes('permission') || message.includes('policy') || message.includes('row-level')) {
    return '고객 등록 권한이 확인되지 않았습니다. 관리자에게 승인 상태와 고객관리 권한을 확인해주세요.'
  }

  return message || '고객 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}
