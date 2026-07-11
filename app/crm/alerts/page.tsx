'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

type CalEvent = {
  type: string
  label: string
  detail: string
  dday: number
  isDone?: boolean
  alertId?: string
  customerId?: string
  customerName?: string
}

const typeLabels: Record<string, string> = {
  join_30: '가입 30일',
  join_90: '가입 90일',
  join_180: '가입 180일',
  join_365: '가입 1년',
  indemnity_end: '면책 종료',
  reduction_end: '감액 종료',
  birthday: '생일',
  car_renewal_d60: '자동차 D-60',
  car_renewal_d30: '자동차 D-30',
  indemnity_renewal: '실손 재가입',
  consulting: '상담 예정',
}

const typeBadges: Record<string, string> = {
  join_30: 'badge-blue',
  join_90: 'badge-blue',
  join_180: 'badge-blue',
  join_365: 'badge-blue',
  indemnity_end: 'badge-orange',
  reduction_end: 'badge-orange',
  birthday: 'badge-pink',
  car_renewal_d60: 'badge-purple',
  car_renewal_d30: 'badge-purple',
  indemnity_renewal: 'badge-cyan',
  consulting: 'badge-green',
}

const eventTypeColor: Record<string, { bg: string; text: string; border: string }> = {
  birthday: { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' },
  car_renewal: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  policy_anniversary: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  notification: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
}

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function calcDday(year: number, month: number, day: number): number {
  const todayNow = new Date()
  const todayZero = new Date(todayNow.getFullYear(), todayNow.getMonth(), todayNow.getDate())
  const target = new Date(year, month - 1, day)
  return Math.round((target.getTime() - todayZero.getTime()) / 86400000)
}

function formatDday(dday: number): string {
  if (dday === 0) return 'D-0'
  if (dday > 0) return `D-${dday}`
  return `D+${Math.abs(dday)}`
}

export default function AlertsPage() {
  const router = useRouter()
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [policies, setPolicies] = useState<any[]>([])

  const now = new Date()
  const [viewDate, setViewDate] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const [typeFilter, setTypeFilter] = useState('all')
  const [showDone, setShowDone] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const { data: custData } = await supabase
      .from('customers')
      .select('id, name, birth_date, car_insurance_renewal_date')
      .eq('advisor_id', session.user.id)
      .is('deleted_at', null)

    const allCustomers = custData || []
    setCustomers(allCustomers)

    const customerIds = allCustomers.map((c: any) => c.id)
    if (!customerIds.length) {
      setNotifications([])
      setPolicies([])
      setLoading(false)
      return
    }

    const [{ data: notifData }, { data: policyData }] = await Promise.all([
      supabase.from('notifications').select('*').in('customer_id', customerIds).order('due_date', { ascending: true }),
      supabase.from('policies').select('id, customer_id, start_date, insurance_company, insurance_type').in('customer_id', customerIds).not('start_date', 'is', null),
    ])

    setNotifications(notifData || [])

    const custMap: Record<string, string> = {}
    allCustomers.forEach((c: any) => { custMap[c.id] = c.name })
    setPolicies((policyData || []).map((p: any) => ({ ...p, customer_name: custMap[p.customer_id] || '' })))

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDone = async (id: string) => {
    await supabase.from('notifications').update({ is_done: true, is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(item => item.id === id ? { ...item, is_done: true, is_read: true } : item))
  }

  const handleRead = async (id: string) => {
    const target = notifications.find(item => item.id === id)
    if (target?.is_read) return
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(item => item.id === id ? { ...item, is_read: true } : item))
  }

  const active = notifications.filter(item => !item.is_done)
  const unreadCount = active.filter(item => !item.is_read).length

  const filtered = useMemo(() => notifications.filter(item => {
    const matchType = typeFilter === 'all' || item.type === typeFilter
    const matchDone = showDone ? true : !item.is_done
    return matchType && matchDone
  }), [notifications, showDone, typeFilter])

  const monthEventMap = useMemo(() => {
    const map: Record<number, CalEvent[]> = {}
    const { year, month } = viewDate
    const daysInMonth = new Date(year, month, 0).getDate()

    for (let d = 1; d <= daysInMonth; d++) {
      const events: CalEvent[] = []

      // 생일 (매년 반복)
      customers.forEach(c => {
        if (!c.birth_date) return
        const parts = c.birth_date.split('-')
        if (parts.length < 3) return
        const bm = parseInt(parts[1]), bd = parseInt(parts[2])
        if (bm === month && bd === d) {
          const age = year - parseInt(parts[0])
          events.push({
            type: 'birthday',
            label: `${c.name}님 생일`,
            detail: `만 ${age}세 생일`,
            dday: calcDday(year, month, d),
            customerId: c.id,
            customerName: c.name,
          })
        }
      })

      // 자동차보험 갱신 (정확한 날짜)
      customers.forEach(c => {
        if (!c.car_insurance_renewal_date) return
        const parts = c.car_insurance_renewal_date.split('-')
        if (parts.length < 3) return
        const ry = parseInt(parts[0]), rm = parseInt(parts[1]), rd = parseInt(parts[2])
        if (ry === year && rm === month && rd === d) {
          events.push({
            type: 'car_renewal',
            label: `${c.name}님 자동차 갱신`,
            detail: '자동차보험 갱신일',
            dday: calcDday(year, month, d),
            customerId: c.id,
            customerName: c.name,
          })
        }
      })

      // 보험 가입기념일 (매년 반복)
      const seen = new Set<string>()
      policies.forEach(p => {
        if (!p.start_date) return
        const parts = p.start_date.split('-')
        if (parts.length < 3) return
        const py = parseInt(parts[0]), pm = parseInt(parts[1]), pd = parseInt(parts[2])
        if (pm === month && pd === d) {
          const elapsed = year - py
          if (elapsed > 0) {
            const key = `${p.customer_id}-${pm}-${pd}`
            if (!seen.has(key)) {
              seen.add(key)
              events.push({
                type: 'policy_anniversary',
                label: `${p.customer_name}님 가입기념일`,
                detail: `${p.insurance_company || '보험'} 가입 ${elapsed}주년`,
                dday: calcDday(year, month, d),
                customerId: p.customer_id,
                customerName: p.customer_name,
              })
            }
          }
        }
      })

      // DB 알림
      notifications.forEach(n => {
        if (!n.due_date) return
        const parts = n.due_date.split('-')
        if (parts.length < 3) return
        const ny = parseInt(parts[0]), nm = parseInt(parts[1]), nd = parseInt(parts[2])
        if (ny === year && nm === month && nd === d) {
          events.push({
            type: 'notification',
            label: `${n.customer_name} ${typeLabels[n.type] || n.type}`,
            detail: n.message || typeLabels[n.type] || n.type,
            dday: calcDday(year, month, d),
            isDone: n.is_done,
            alertId: n.id,
            customerName: n.customer_name,
          })
        }
      })

      if (events.length > 0) map[d] = events.sort((a, b) => Math.abs(a.dday) - Math.abs(b.dday))
    }
    return map
  }, [customers, policies, notifications, viewDate])

  const { year, month } = viewDate
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDow = new Date(year, month - 1, 1).getDay()

  const todayY = new Date().getFullYear()
  const todayM = new Date().getMonth() + 1
  const todayD = new Date().getDate()

  const gridCells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) gridCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) gridCells.push(d)
  while (gridCells.length % 7 !== 0) gridCells.push(null)

  const selectedEvents = selectedDay !== null ? (monthEventMap[selectedDay] || []) : []
  const monthEventCount = Object.values(monthEventMap).reduce((sum, evts) => sum + evts.length, 0)

  const prevMonth = () => {
    setSelectedDay(null)
    setViewDate(prev => {
      const d = new Date(prev.year, prev.month - 2, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }
  const nextMonth = () => {
    setSelectedDay(null)
    setViewDate(prev => {
      const d = new Date(prev.year, prev.month, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">알림관리</div>
          <div className="page-subtitle">
            미처리 {active.length}건{unreadCount > 0 ? ` · 미확인 ${unreadCount}건` : ''}
          </div>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {view === 'list' && (
            <label className="date-chip" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />
              완료 포함
            </label>
          )}
          <div style={{ display: 'flex', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <button
              onClick={() => setView('calendar')}
              style={{ padding: '6px 14px', fontSize: 13, fontWeight: view === 'calendar' ? 700 : 500, background: view === 'calendar' ? '#1a2744' : '#fff', color: view === 'calendar' ? '#fff' : '#64748b', border: 'none', cursor: 'pointer' }}
            >
              📅 캘린더
            </button>
            <button
              onClick={() => setView('list')}
              style={{ padding: '6px 14px', fontSize: 13, fontWeight: view === 'list' ? 700 : 500, background: view === 'list' ? '#1a2744' : '#fff', color: view === 'list' ? '#fff' : '#64748b', border: 'none', cursor: 'pointer', borderLeft: '1px solid #e2e8f0' }}
            >
              ☰ 목록
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
      ) : view === 'calendar' ? (
        <>
          {/* 대형 캘린더 */}
          <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
            {/* 월 네비게이션 */}
            <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
              <button
                onClick={prevMonth}
                style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 14, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >◀</button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#10203a' }}>
                  {year}년 {MONTH_NAMES[month - 1]}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  이달 이벤트 {monthEventCount}건
                </div>
              </div>
              <button
                onClick={nextMonth}
                style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 14, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >▶</button>
            </div>

            {/* 요일 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 12px 4px' }}>
              {DOW_LABELS.map((dow, i) => (
                <div key={dow} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, padding: '4px 0', color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#94a3b8' }}>{dow}</div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, padding: '0 12px 16px' }}>
              {gridCells.map((day, idx) => {
                const isToday = day !== null && year === todayY && month === todayM && day === todayD
                const isSelected = day !== null && day === selectedDay
                const events = day ? (monthEventMap[day] || []) : []
                const dow = idx % 7
                const isSun = dow === 0
                const isSat = dow === 6

                return (
                  <div
                    key={idx}
                    onClick={() => day && setSelectedDay(isSelected ? null : day)}
                    style={{
                      background: isSelected ? '#1a2744' : isToday ? '#eff6ff' : '#fff',
                      borderRadius: 10,
                      padding: '8px 6px',
                      minHeight: 90,
                      cursor: day ? 'pointer' : 'default',
                      border: isSelected ? '2px solid #1a2744' : isToday ? '2px solid #3b82f6' : '1px solid #f1f5f9',
                      transition: 'all 0.12s',
                    }}
                  >
                    {day && (
                      <>
                        <div style={{
                          fontSize: 13,
                          fontWeight: isToday || isSelected ? 800 : 600,
                          color: isSelected ? '#fff' : isToday ? '#1d4ed8' : isSun ? '#ef4444' : isSat ? '#3b82f6' : '#374151',
                          marginBottom: 4,
                          lineHeight: 1,
                        }}>
                          {day}
                        </div>
                        {events.slice(0, 2).map((ev, ei) => {
                          const colors = eventTypeColor[ev.type] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
                          return (
                            <div key={ei} style={{
                              fontSize: 9.5,
                              fontWeight: 600,
                              padding: '2px 4px',
                              borderRadius: 4,
                              background: isSelected ? 'rgba(255,255,255,0.18)' : colors.bg,
                              color: isSelected ? '#fff' : colors.text,
                              marginBottom: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              opacity: ev.isDone ? 0.5 : 1,
                            }}>
                              {ev.label}
                            </div>
                          )
                        })}
                        {events.length > 2 && (
                          <div style={{ fontSize: 9.5, color: isSelected ? 'rgba(255,255,255,0.6)' : '#94a3b8', fontWeight: 600, marginTop: 1 }}>
                            +{events.length - 2}개 더
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 선택한 날 상세 패널 */}
          {selectedDay !== null && (
            <div className="card" style={{ marginBottom: 16, border: '2px solid #1a2744' }}>
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#10203a' }}>
                  {year}년 {MONTH_NAMES[month - 1]} {selectedDay}일 ({DOW_LABELS[new Date(year, month - 1, selectedDay).getDay()]})
                </div>
                <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8', lineHeight: 1, padding: 0 }}>×</button>
              </div>
              {selectedEvents.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>이 날짜에 일정이 없습니다.</div>
              ) : (
                <div>
                  {selectedEvents.map((ev, idx) => {
                    const colors = eventTypeColor[ev.type] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
                    const typeEmoji = ev.type === 'birthday' ? '🎂' : ev.type === 'car_renewal' ? '🚗' : ev.type === 'policy_anniversary' ? '📋' : '🔔'
                    const isUrgent = Math.abs(ev.dday) <= 7
                    return (
                      <div key={idx} style={{ padding: '14px 20px', borderBottom: idx < selectedEvents.length - 1 ? '1px solid #f8fafc' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: colors.bg, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                          {typeEmoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#10203a', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {ev.label}
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                              background: isUrgent ? '#fef3c7' : '#f1f5f9',
                              color: isUrgent ? '#b45309' : '#64748b',
                            }}>
                              {formatDday(ev.dday)}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{ev.detail}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {ev.customerId && (
                            <button
                              onClick={() => router.push(`/crm/customers/${ev.customerId}`)}
                              style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              고객 보기 →
                            </button>
                          )}
                          {ev.alertId && !ev.isDone && (
                            <button
                              onClick={() => handleDone(ev.alertId!)}
                              style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              처리완료
                            </button>
                          )}
                          {ev.isDone && <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', alignSelf: 'center' }}>완료</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 이달 전체 일정 목록 */}
          <div className="card">
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#10203a' }}>이달 전체 일정</div>
            </div>
            {Object.entries(monthEventMap).length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>이달 등록된 일정이 없습니다.</div>
            ) : (
              Object.entries(monthEventMap)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([dayStr, events]) => {
                  const d = parseInt(dayStr)
                  const dow = new Date(year, month - 1, d).getDay()
                  const isSelected = d === selectedDay
                  return (
                    <div
                      key={dayStr}
                      onClick={() => setSelectedDay(d === selectedDay ? null : d)}
                      style={{ padding: '10px 20px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: isSelected ? '#f0f4ff' : 'transparent', transition: 'background 0.1s' }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: isSelected ? '#1a2744' : '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: isSelected ? '2px solid #1a2744' : '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: isSelected ? '#fff' : dow === 0 ? '#ef4444' : dow === 6 ? '#3b82f6' : '#374151', lineHeight: 1.1 }}>{d}</span>
                        <span style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.7)' : '#94a3b8', fontWeight: 600 }}>{DOW_LABELS[dow]}</span>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {events.map((ev, ei) => {
                          const colors = eventTypeColor[ev.type] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
                          return (
                            <span key={ei} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: colors.bg, color: colors.text, fontWeight: 600, border: `1px solid ${colors.border}`, opacity: ev.isDone ? 0.45 : 1 }}>
                              {ev.label}
                            </span>
                          )
                        })}
                      </div>
                      <span style={{ fontSize: 11, color: Math.abs(calcDday(year, month, d)) <= 7 ? '#b45309' : '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap', background: Math.abs(calcDday(year, month, d)) <= 7 ? '#fef3c7' : 'transparent', padding: '2px 6px', borderRadius: 6 }}>
                        {formatDday(calcDday(year, month, d))}
                      </span>
                    </div>
                  )
                })
            )}
          </div>
        </>
      ) : (
        /* 목록 뷰 */
        <>
          <div className="card card-p" style={{ marginBottom: 16 }}>
            <div className="tab-bar" style={{ marginBottom: 0 }}>
              <button className={`tab-btn${typeFilter === 'all' ? ' active' : ''}`} onClick={() => setTypeFilter('all')}>
                전체 ({active.length})
              </button>
              {Object.keys(typeLabels).map(type => {
                const count = active.filter(item => item.type === type).length
                if (count === 0) return null
                return (
                  <button key={type} className={`tab-btn${typeFilter === type ? ' active' : ''}`} onClick={() => setTypeFilter(type)}>
                    {typeLabels[type]} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card">
            {filtered.map(item => (
              <div
                key={item.id}
                onClick={() => handleRead(item.id)}
                className={`alert-item ${!item.is_read && !item.is_done ? 'unread' : ''}`}
                style={item.is_done ? { opacity: 0.5 } : undefined}
              >
                {!item.is_read && !item.is_done && <div className="alert-unread-dot" />}
                <span className={`badge ${typeBadges[item.type] || 'badge-gray'}`}>{typeLabels[item.type] || item.type}</span>
                <div className="alert-info">
                  <div className="alert-name">{item.customer_name}</div>
                  {item.message && <div className="alert-msg">{item.message}</div>}
                </div>
                <div className="alert-date">{item.due_date}</div>
                {!item.is_done ? (
                  <button
                    className="alert-done"
                    onClick={e => { e.stopPropagation(); handleDone(item.id) }}
                  >
                    처리완료
                  </button>
                ) : (
                  <span className="text-muted" style={{ fontSize: 11 }}>완료</span>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 70, textAlign: 'center', color: '#94a3b8' }}>
                {notifications.length === 0 ? '등록된 알림이 없습니다.' : '조건에 맞는 알림이 없습니다.'}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
