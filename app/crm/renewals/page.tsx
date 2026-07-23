'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

/* ─── 타입 ──────────────────────────────────────────────── */
interface Customer {
  id: string
  name: string
  phone?: string
  car_insurance_renewal_date?: string
  indemnity_renewal_date?: string
  indemnity_generation?: number
}

interface Editing {
  id: string
  field: 'car' | 'indemnity'
  value: string
}

/* ─── 날짜 유틸 ─────────────────────────────────────────── */
/** 올해/내년 기준 날짜까지 남은 일수 (과거면 내년으로) */
function renewalDaysLeft(dateStr: string | null | undefined): number {
  if (!dateStr) return 9999
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 9999
  const today = new Date()
  const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate())
  let diff = Math.round((thisYear.getTime() - today.getTime()) / 86_400_000)
  if (diff < -1) diff += 365
  return diff
}

function dLabel(days: number): string {
  if (days === 0) return 'D-0 오늘!'
  if (days > 0) return `D-${days}`
  return `D+${Math.abs(days)} 경과`
}

function dColor(days: number): { color: string; bg: string } {
  if (days <= 0)  return { color: '#dc2626', bg: '#fef2f2' }
  if (days <= 30) return { color: '#ea580c', bg: '#fff7ed' }
  if (days <= 60) return { color: '#d97706', bg: '#fffbeb' }
  return { color: '#64748b', bg: '#f8fafc' }
}

/* ─── 페이지 ─────────────────────────────────────────────── */
export default function RenewalsPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState<string | null>(null)
  const [editing,   setEditing]   = useState<Editing | null>(null)
  const [filter,    setFilter]    = useState<'all' | 'car' | 'indemnity'>('all')
  const [search,    setSearch]    = useState('')
  const [genState,  setGenState]  = useState<Record<string, 'idle' | 'running' | 'done' | 'err'>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const { data } = await supabase
      .from('customers')
      .select('id,name,phone,car_insurance_renewal_date,indemnity_renewal_date,indemnity_generation')
      .eq('advisor_id', session.user.id).is('deleted_at', null)
      .order('name')
    setCustomers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /* ── 날짜 저장 ───────────────────────────────────────── */
  const saveDate = async (id: string, field: 'car' | 'indemnity', value: string) => {
    setSaving(id + field)
    const col = field === 'car' ? 'car_insurance_renewal_date' : 'indemnity_renewal_date'
    const { error } = await supabase.from('customers').update({ [col]: value || null }).eq('id', id)
    if (!error) {
      setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, [col]: value || undefined } : c))
    }
    setSaving(null)
    setEditing(null)
  }

  /* ── 알림 자동 생성 ──────────────────────────────────── */
  const generateNotifs = async (c: Customer, field: 'car' | 'indemnity') => {
    const dateStr = field === 'car' ? c.car_insurance_renewal_date : c.indemnity_renewal_date
    if (!dateStr) return
    setGenState((s) => ({ ...s, [c.id + field]: 'running' }))

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setGenState((s) => ({ ...s, [c.id + field]: 'err' })); return }

    const d = new Date(dateStr)
    const today = new Date()
    // 올해 기준 갱신일
    const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate())
    if (thisYear < today) thisYear.setFullYear(thisYear.getFullYear() + 1)

    const toInsert: any[] = []

    if (field === 'car') {
      // D-60, D-30 알림
      for (const daysAgo of [60, 30]) {
        const due = new Date(thisYear.getTime() - daysAgo * 86_400_000)
        toInsert.push({
          customer_id: c.id,
          customer_name: c.name,
          type: `car_renewal_d${daysAgo}`,
          title: `🚗 자동차보험 D-${daysAgo} (${c.name})`,
          message: `${c.name} 고객님 자동차보험 갱신일 ${daysAgo}일 전입니다.`,
          due_date: due.toISOString().split('T')[0],
          is_read: false,
          is_done: false,
        })
      }
    } else {
      // 실손 갱신 D-30
      const due = new Date(thisYear.getTime() - 30 * 86_400_000)
      toInsert.push({
        customer_id: c.id,
        customer_name: c.name,
        type: 'indemnity_renewal',
        title: `🔄 실손 재가입 D-30 (${c.name})`,
        message: `${c.name} 고객님 실손보험 갱신일 30일 전입니다. 세대 전환 여부 확인하세요.`,
        due_date: due.toISOString().split('T')[0],
        is_read: false,
        is_done: false,
      })
    }

    const { error } = await supabase.from('notifications').upsert(toInsert, {
      onConflict: 'customer_id,type,due_date',
      ignoreDuplicates: true,
    })
    setGenState((s) => ({ ...s, [c.id + field]: error ? 'err' : 'done' }))

    // 3초 후 초기화
    setTimeout(() => setGenState((s) => ({ ...s, [c.id + field]: 'idle' })), 3000)
  }

  /* ── 필터링 ──────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = customers.filter((c) => {
      if (filter === 'car')      return !!c.car_insurance_renewal_date
      if (filter === 'indemnity') return !!c.indemnity_renewal_date
      return true
    })
    if (search.trim()) {
      list = list.filter((c) => c.name?.includes(search) || c.phone?.includes(search))
    }
    return list.sort((a, b) => {
      const da = Math.min(renewalDaysLeft(a.car_insurance_renewal_date), renewalDaysLeft(a.indemnity_renewal_date))
      const db = Math.min(renewalDaysLeft(b.car_insurance_renewal_date), renewalDaysLeft(b.indemnity_renewal_date))
      return da - db
    })
  }, [customers, filter, search])

  const upcoming60 = customers.filter((c) => {
    return renewalDaysLeft(c.car_insurance_renewal_date) <= 60 || renewalDaysLeft(c.indemnity_renewal_date) <= 60
  })

  if (loading) {
    return (
      <div style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* ── 헤더 ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#1a2744', margin: 0 }}>🔄 만기·갱신 관리</h1>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>자동차보험 만기 및 실손보험 갱신일을 관리합니다</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="고객 이름·전화번호..."
            style={{ padding: '8px 12px 8px 34px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, width: 200, outline: 'none' }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }}>🔍</span>
        </div>
      </div>

      {/* ── D-60 이내 긴급 요약 ─────────────────────────────── */}
      {upcoming60.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #fff7ed, #fef3c7)', border: '1px solid #fed7aa', borderRadius: 16, padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#ea580c', marginBottom: 10 }}>
            ⚡ 60일 이내 갱신 예정 — {upcoming60.length}명
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {upcoming60.map((c) => {
              const carDays = renewalDaysLeft(c.car_insurance_renewal_date)
              const indDays = renewalDaysLeft(c.indemnity_renewal_date)
              const minDays = Math.min(carDays, indDays)
              const { color } = dColor(minDays)
              return (
                <Link key={c.id} href={`/crm/customers/${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #fed7aa', borderRadius: 10, padding: '5px 10px', textDecoration: 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#1a2744' }}>{c.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 900, color, background: color + '18', padding: '1px 6px', borderRadius: 999 }}>{dLabel(minDays)}</span>
                  {carDays <= 60 && <span style={{ fontSize: 10, color: '#7c3aed' }}>🚗</span>}
                  {indDays <= 60 && <span style={{ fontSize: 10, color: '#0891b2' }}>🔄</span>}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 탭 필터 ────────────────────────────────────────── */}
      <div className="tab-bar" style={{ marginBottom: 0 }}>
        {([
          { key: 'all',       label: `전체 (${customers.length})` },
          { key: 'car',       label: `🚗 자동차 (${customers.filter(c => c.car_insurance_renewal_date).length})` },
          { key: 'indemnity', label: `🔄 실손 (${customers.filter(c => c.indemnity_renewal_date).length})` },
        ] as const).map((t) => (
          <button key={t.key} className={`tab-btn${filter === t.key ? ' active' : ''}`} onClick={() => setFilter(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 테이블 ─────────────────────────────────────────── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {(['고객명','연락처','🚗 자동차보험 갱신일','D-day','알림','🔄 실손보험 갱신일','세대','알림'] as const).map((h, i) => (
                <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: 13 }}>
                  해당 조건의 고객이 없습니다.<br />
                  <Link href="/crm/customers" className="link" style={{ marginTop: 6, display: 'inline-block' }}>고객 상세에서 날짜를 입력해주세요</Link>
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const carDays = renewalDaysLeft(c.car_insurance_renewal_date)
              const indDays = renewalDaysLeft(c.indemnity_renewal_date)
              const carCol = c.car_insurance_renewal_date ? dColor(carDays) : null
              const indCol = c.indemnity_renewal_date ? dColor(indDays) : null
              const isEditingCar = editing?.id === c.id && editing.field === 'car'
              const isEditingInd = editing?.id === c.id && editing.field === 'indemnity'

              const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }
              return (
                <tr key={c.id} style={{ transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background='#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background='')}>
                  <td style={tdStyle}>
                    <Link href={`/crm/customers/${c.id}`} className="link" style={{ fontWeight: 700 }}>{c.name}</Link>
                  </td>
                  <td style={{ ...tdStyle, color: '#64748b', fontSize: 12 }}>{c.phone || '-'}</td>

                  {/* 자동차 갱신일 */}
                  <td style={tdStyle}>
                    {isEditingCar ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          type="date"
                          defaultValue={editing?.value}
                          autoFocus
                          onChange={(e) => setEditing((prev) => prev ? { ...prev, value: e.target.value } : null)}
                          style={{ padding: '4px 8px', border: '1px solid #3b82f6', borderRadius: 8, fontSize: 12, flex: 1 }}
                        />
                        <button className="btn btn-primary btn-xs" onClick={() => editing && saveDate(c.id, 'car', editing.value)}
                          disabled={saving === c.id + 'car'}>
                          {saving === c.id + 'car' ? '...' : '저장'}
                        </button>
                        <button className="btn btn-secondary btn-xs" onClick={() => setEditing(null)}>취소</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{ cursor: 'pointer', color: c.car_insurance_renewal_date ? '#1a2744' : '#cbd5e1', fontSize: 13 }}
                          onClick={() => setEditing({ id: c.id, field: 'car', value: c.car_insurance_renewal_date || '' })}
                          title="클릭해서 수정"
                        >
                          {c.car_insurance_renewal_date || '날짜 입력…'}
                        </span>
                        {!c.car_insurance_renewal_date && (
                          <button className="btn btn-secondary btn-xs" onClick={() => setEditing({ id: c.id, field: 'car', value: '' })}>
                            + 입력
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 자동차 D-day */}
                  <td style={tdStyle}>
                    {carCol && (
                      <span style={{ fontSize: 11, fontWeight: 900, color: carCol.color, background: carCol.bg, padding: '2px 8px', borderRadius: 999 }}>
                        {dLabel(carDays)}
                      </span>
                    )}
                  </td>

                  {/* 자동차 알림 생성 */}
                  <td style={tdStyle}>
                    {c.car_insurance_renewal_date && (
                      <button
                        className="btn btn-secondary btn-xs"
                        title="D-60, D-30 알림 자동 생성"
                        onClick={() => generateNotifs(c, 'car')}
                        disabled={genState[c.id + 'car'] === 'running'}
                        style={{ fontSize: 10 }}
                      >
                        {genState[c.id + 'car'] === 'running' ? '...'
                          : genState[c.id + 'car'] === 'done' ? '✅'
                          : genState[c.id + 'car'] === 'err' ? '❌'
                          : '🔔'}
                      </button>
                    )}
                  </td>

                  {/* 실손 갱신일 */}
                  <td style={tdStyle}>
                    {isEditingInd ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          type="date"
                          defaultValue={editing?.value}
                          autoFocus
                          onChange={(e) => setEditing((prev) => prev ? { ...prev, value: e.target.value } : null)}
                          style={{ padding: '4px 8px', border: '1px solid #3b82f6', borderRadius: 8, fontSize: 12, flex: 1 }}
                        />
                        <button className="btn btn-primary btn-xs" onClick={() => editing && saveDate(c.id, 'indemnity', editing.value)}
                          disabled={saving === c.id + 'indemnity'}>
                          {saving === c.id + 'indemnity' ? '...' : '저장'}
                        </button>
                        <button className="btn btn-secondary btn-xs" onClick={() => setEditing(null)}>취소</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{ cursor: 'pointer', color: c.indemnity_renewal_date ? '#1a2744' : '#cbd5e1', fontSize: 13 }}
                          onClick={() => setEditing({ id: c.id, field: 'indemnity', value: c.indemnity_renewal_date || '' })}
                          title="클릭해서 수정"
                        >
                          {c.indemnity_renewal_date || '날짜 입력…'}
                        </span>
                        {!c.indemnity_renewal_date && (
                          <button className="btn btn-secondary btn-xs" onClick={() => setEditing({ id: c.id, field: 'indemnity', value: '' })}>
                            + 입력
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* 실손 세대 */}
                  <td style={tdStyle}>
                    {c.indemnity_generation ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', background: '#ecfeff', padding: '2px 8px', borderRadius: 999 }}>
                        {c.indemnity_generation}세대
                      </span>
                    ) : <span style={{ color: '#cbd5e1' }}>-</span>}
                  </td>

                  {/* 실손 알림 생성 */}
                  <td style={tdStyle}>
                    {c.indemnity_renewal_date && (
                      <button
                        className="btn btn-secondary btn-xs"
                        title="D-30 실손 재가입 알림 생성"
                        onClick={() => generateNotifs(c, 'indemnity')}
                        disabled={genState[c.id + 'indemnity'] === 'running'}
                        style={{ fontSize: 10 }}
                      >
                        {genState[c.id + 'indemnity'] === 'running' ? '...'
                          : genState[c.id + 'indemnity'] === 'done' ? '✅'
                          : genState[c.id + 'indemnity'] === 'err' ? '❌'
                          : '🔔'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
        날짜를 클릭하거나 [+ 입력] 버튼으로 날짜를 등록하세요. 🔔 버튼을 누르면 알림관리에 D-60/D-30 알림이 자동 생성됩니다.
      </div>

    </div>
  )
}
