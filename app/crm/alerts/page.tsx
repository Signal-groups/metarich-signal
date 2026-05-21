'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'

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

export default function AlertsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [showDone, setShowDone] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('advisor_id', session.user.id)
      .is('deleted_at', null)

    const customerIds = (customers || []).map((customer: any) => customer.id)
    if (!customerIds.length) {
      setNotifications([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .in('customer_id', customerIds)
      .order('due_date', { ascending: true })

    setNotifications(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDone = async (id: string) => {
    if (!notifications.some((item) => item.id === id)) return
    await supabase.from('notifications').update({ is_done: true, is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, is_done: true, is_read: true } : item))
  }

  const handleRead = async (id: string) => {
    const target = notifications.find((item) => item.id === id)
    if (target?.is_read) return
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, is_read: true } : item))
  }

  const active = notifications.filter((item) => !item.is_done)
  const unreadCount = active.filter((item) => !item.is_read).length
  const filtered = useMemo(() => notifications.filter((item) => {
    const matchType = typeFilter === 'all' || item.type === typeFilter
    const matchDone = showDone ? true : !item.is_done
    return matchType && matchDone
  }), [notifications, showDone, typeFilter])

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">알림관리</div>
          <div className="page-subtitle">
            미처리 {active.length}건{unreadCount > 0 ? ` · 미확인 ${unreadCount}건` : ''}
          </div>
        </div>
        <div className="header-right">
          <label className="date-chip" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} />
            완료 포함
          </label>
        </div>
      </div>

      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div className="tab-bar" style={{ marginBottom: 0 }}>
          <button className={`tab-btn${typeFilter === 'all' ? ' active' : ''}`} onClick={() => setTypeFilter('all')}>
            전체 ({active.length})
          </button>
          {Object.keys(typeLabels).map((type) => {
            const count = active.filter((item) => item.type === type).length
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
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
        ) : (
          <>
            {filtered.map((item) => (
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
                    onClick={(event) => {
                      event.stopPropagation()
                      handleDone(item.id)
                    }}
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
          </>
        )}
      </div>
    </>
  )
}
