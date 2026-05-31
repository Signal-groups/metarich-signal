'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

const UPLOAD_STORAGE_KEY = 'signal-crm-upload-files'

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

const notifTypeLabels: Record<string, string> = {
  birthday: '생일',
  indemnity_end: '면책 종료',
  reduction_end: '감액 종료',
  car_renewal_d60: '자동차 D-60',
  car_renewal_d30: '자동차 D-30',
  indemnity_renewal: '실손 재가입',
  join_30: '가입 30일',
  join_90: '가입 90일',
  join_180: '가입 180일',
  join_365: '가입 1년',
  consulting: '상담 예정',
}

const notifBadges: Record<string, string> = {
  birthday: 'badge-pink',
  indemnity_end: 'badge-orange',
  reduction_end: 'badge-orange',
  car_renewal_d60: 'badge-purple',
  car_renewal_d30: 'badge-purple',
  indemnity_renewal: 'badge-cyan',
  join_30: 'badge-blue',
  join_90: 'badge-blue',
  join_180: 'badge-blue',
  join_365: 'badge-blue',
  consulting: 'badge-green',
}

export default function CrmDashboard() {
  const [loading, setLoading] = useState(true)
  const [advisorName, setAdvisorName] = useState('담당자')
  const [customers, setCustomers] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [uploadItems, setUploadItems] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setCurrentUserId(session.user.id)

      const { data: userData } = await supabase
        .from('users')
        .select('name')
        .eq('id', session.user.id)
        .single()

      setAdvisorName(userData?.name || session.user.email?.split('@')[0] || '담당자')

      const { data: custs } = await supabase
        .from('customers')
        .select('*')
        .eq('advisor_id', session.user.id)
        .is('deleted_at', null)
        .order('join_date', { ascending: false })

      const custList = custs || []
      setCustomers(custList)

      const custIds = custList.map((c: any) => c.id)
      const { data: notifs } = custIds.length > 0
        ? await supabase
          .from('notifications')
          .select('*')
          .in('customer_id', custIds)
          .order('due_date', { ascending: true })
          .limit(30)
        : { data: [] }

      setNotifications(notifs || [])

      setLoading(false)
    }

    load()
  }, [])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(UPLOAD_STORAGE_KEY)
      setUploadItems(saved ? JSON.parse(saved) : [])
    } catch {
      setUploadItems([])
    }
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const totalPremium = customers.reduce((sum, customer) => sum + (customer.monthly_premium || 0), 0)

    return {
      total: customers.length,
      thisMonth: customers.filter((customer) => customer.join_date?.startsWith(thisMonth)).length,
      totalPremium,
      pendingNotif: notifications.filter((item) => !item.is_done).length,
      doneNotif: notifications.filter((item) => item.is_done).length,
      birthday: notifications.filter((item) => item.type === 'birthday' && !item.is_done).length,
      renewal: notifications.filter((item) => String(item.type).includes('renewal') && !item.is_done).length,
    }
  }, [customers, notifications])

  const analysisSuggestions = useMemo(() => {
    const latestByCustomer: Record<string, string> = {}
    const customerIds = new Set(customers.map((customer) => customer.id))
    uploadItems
      .filter((item) => item.ownerId === currentUserId || (!item.ownerId && item.customerId && customerIds.has(item.customerId)))
      .filter((item) => item.category === '보장분석' || item.structuredAnalysis)
      .forEach((item) => {
        const key = item.customerId || normalizeName(item.customerName)
        if (!key) return
        const date = item.date || ''
        if (!latestByCustomer[key] || date > latestByCustomer[key]) latestByCustomer[key] = date
      })

    const now = new Date()
    return customers.map((customer) => {
      const latest = latestByCustomer[customer.id] || latestByCustomer[normalizeName(customer.name)] || ''
      const days = latest ? daysBetween(latest, now) : 9999
      const reason = !latest ? '분석 이력 없음' : days >= 365 ? '1년 경과' : days >= 180 ? '6개월 경과' : ''
      return { customer, latest, days, reason }
    }).filter((item) => item.reason).slice(0, 6)
  }, [currentUserId, customers, uploadItems])

  if (loading) {
    return (
      <div className="card card-p" style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">안녕하세요, {advisorName}님!</div>
          <div className="page-subtitle">오늘의 고객 관리 현황을 한눈에 확인하세요.</div>
        </div>
        <div className="header-right">
          <div className="date-chip">
            <CalendarIcon />
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}
          </div>
          <Link href="/crm/alerts" className="btn-notif" aria-label="알림">
            <BellIcon />
            {stats.pendingNotif > 0 && <div className="badge-red">{stats.pendingNotif}</div>}
          </Link>
          <div className="profile-chip">
            <div className="profile-avatar">{advisorName.slice(0, 1)}</div>
            <div>
              <div className="profile-name">{advisorName}</div>
              <div className="profile-role">보험 담당자</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-6" style={{ marginBottom: 16 }}>
        <StatCard icon="🎂" iconBg="#fdf2f8" label="생일 고객" value={stats.birthday} unit="명" sub="이번 주" color="#be185d" />
        <StatCard icon="⏳" iconBg="#fff7ed" label="면책/감액 알림" value={notifications.filter((n) => n.type === 'indemnity_end' || n.type === 'reduction_end').length} unit="건" sub="처리 필요" color="#ea580c" />
        <StatCard icon="🔔" iconBg="#eff6ff" label="갱신 알림" value={stats.renewal} unit="건" sub="D-60 / D-30" color="#2563eb" />
        <StatCard icon="👥" iconBg="#ecfeff" label="전체 고객" value={stats.total} unit="명" sub={`신규 ${stats.thisMonth}명`} color="#0891b2" />
        <StatCard icon="💬" iconBg="#f0fdf4" label="알림" value={stats.pendingNotif} unit="건" sub={`완료 ${stats.doneNotif}건`} color="#16a34a" />
        <StatCard icon="₩" iconBg="#faf5ff" label="월 보험료" value={Math.round(stats.totalPremium / 10000)} unit="만" sub="전체 합계" color="#7c3aed" />
      </div>

      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card card-p" style={{ gridColumn: 'span 2' }}>
          <div className="flex justify-between items-center mb-16">
            <div className="card-title" style={{ marginBottom: 0 }}>알림</div>
            <Link href="/crm/alerts" className="link">전체보기</Link>
          </div>
          <div className="grid-2" style={{ marginBottom: 12 }}>
            <MiniStatus label="미완료" value={stats.pendingNotif} color="#dc2626" />
            <MiniStatus label="완료" value={stats.doneNotif} color="#16a34a" />
          </div>
          {notifications.filter((item) => !item.is_done).slice(0, 6).map((item) => (
            <div key={item.id} className={`alert-item ${!item.is_read ? 'unread' : ''}`} style={{ marginLeft: -20, marginRight: -20 }}>
              {!item.is_read && <div className="alert-unread-dot" />}
              <span className={`badge ${notifBadges[item.type] || 'badge-gray'}`}>{notifTypeLabels[item.type] || item.type}</span>
              <div className="alert-info">
                <div className="alert-name">{item.customer_name}</div>
                {item.message && <div className="alert-msg">{item.message}</div>}
              </div>
              <div className="alert-date">{item.due_date}</div>
            </div>
          ))}
          {stats.pendingNotif === 0 && <EmptyState text="현재 미완료 알림이 없습니다." />}
        </div>

        <div className="card card-p">
          <div className="flex justify-between items-center mb-16">
            <div className="card-title" style={{ marginBottom: 0 }}>분석 제안</div>
            <Link href="/crm/analysis" className="link">보장분석</Link>
          </div>
          {analysisSuggestions.map(({ customer, latest, reason }) => (
            <Link key={customer.id} href={`/crm/analysis?customerId=${customer.id}`} className="family-card" style={{ textDecoration: 'none', marginBottom: 8 }}>
              <div className="family-avatar" style={{ background: '#eff6ff', color: '#2563eb' }}>{customer.name?.slice(0, 1)}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="fw-700" style={{ fontSize: 13 }}>{customer.name}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{latest ? `최근 분석 ${latest}` : '분석 이력 없음'}</div>
              </div>
              <span className={`badge ${reason.includes('1년') ? 'badge-red' : reason.includes('6개월') ? 'badge-yellow' : 'badge-blue'}`}>{reason}</span>
            </Link>
          ))}
          {analysisSuggestions.length === 0 && <EmptyState text="분석 제안 고객이 없습니다." />}
        </div>
      </div>

      {/* 상태별 고객 분포 + 보장분석 제안 빠른 현황 */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {/* 상태별 고객 분포 */}
        <div className="card card-p" style={{ gridColumn: 'span 2' }}>
          <div className="flex justify-between items-center mb-16">
            <div className="card-title" style={{ marginBottom: 0 }}>고객 상태 현황</div>
            <Link href="/crm/customers" className="link">전체보기</Link>
          </div>
          <StatusDistribution customers={customers} />
        </div>

        {/* 이번달 보험료 요약 */}
        <div className="card card-p">
          <div className="flex justify-between items-center mb-16">
            <div className="card-title" style={{ marginBottom: 0 }}>보험료 현황</div>
            <Link href="/crm/customers" className="link">고객관리</Link>
          </div>
          <PremiumSummary customers={customers} />
        </div>
      </div>

      <div className="card">
        <div className="card-p flex justify-between items-center">
          <div className="card-title" style={{ marginBottom: 0 }}>최근 등록 고객</div>
          <Link href="/crm/customers" className="link">전체보기</Link>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>고객명</th>
                <th>연락처</th>
                <th>월 보험료</th>
                <th>상태</th>
                <th>등록일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.slice(0, 5).map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Link href={`/crm/customers/${customer.id}`} className="fw-700 text-blue">
                      {customer.name}
                    </Link>
                  </td>
                  <td>{customer.phone || '-'}</td>
                  <td>{formatPremium(customer.monthly_premium)}</td>
                  <td><span className={`badge ${statusBadges[customer.status] || 'badge-gray'}`}>{statusLabels[customer.status] || customer.status || '-'}</span></td>
                  <td>{customer.join_date || '-'}</td>
                  <td><Link href={`/crm/customers/${customer.id}`} className="btn btn-secondary btn-xs">상세</Link></td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6}><EmptyState text="등록된 고객이 없습니다." /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function StatCard({ icon, iconBg, label, value, unit, sub, color }: {
  icon: string
  iconBg: string
  label: string
  value: number
  unit: string
  sub: string
  color: string
}) {
  return (
    <div className="card stat-card">
      <div className="stat-icon" style={{ background: iconBg }}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>
        {value}<span style={{ fontSize: 14, fontWeight: 400, color: '#94a3b8' }}>{unit}</span>
      </div>
      <div className="stat-sub">{sub}</div>
    </div>
  )
}

function MiniStatus({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray rounded p-12" style={{ textAlign: 'center' }}>
      <div className="text-muted" style={{ fontSize: 11 }}>{label}</div>
      <div className="fw-700" style={{ fontSize: 20, color }}>{value}</div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{text}</div>
}

const STATUS_INFO: { key: string; label: string; color: string; bg: string }[] = [
  { key: 'new',        label: '신규',   color: '#64748b', bg: '#f1f5f9' },
  { key: 'analysis',   label: '분석',   color: '#2563eb', bg: '#eff6ff' },
  { key: 'consulting', label: '상담',   color: '#d97706', bg: '#fffbeb' },
  { key: 'proposal',   label: '제안',   color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'contracted', label: '계약',   color: '#059669', bg: '#f0fdf4' },
  { key: 'managing',   label: '관리',   color: '#0891b2', bg: '#ecfeff' },
  { key: 'hold',       label: '보류',   color: '#dc2626', bg: '#fff7ed' },
]

function StatusDistribution({ customers }: { customers: any[] }) {
  if (customers.length === 0) return <EmptyState text="등록된 고객이 없습니다." />
  const counts = STATUS_INFO.map((s) => ({
    ...s,
    count: customers.filter((c) => c.status === s.key).length,
  })).filter((s) => s.count > 0)
  const max = Math.max(...counts.map((s) => s.count), 1)

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {counts.map((s) => (
        <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 36px', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: s.color, background: s.bg, borderRadius: 8, padding: '3px 8px', textAlign: 'center' }}>
            {s.label}
          </span>
          <div style={{ height: 14, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(s.count / max) * 100}%`, borderRadius: 999, background: s.color, transition: 'width .5s' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 900, color: s.color, textAlign: 'right' }}>{s.count}명</span>
        </div>
      ))}
      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>전체 {customers.length}명</span>
      </div>
    </div>
  )
}

function PremiumSummary({ customers }: { customers: any[] }) {
  const total = customers.reduce((s, c) => s + (c.monthly_premium || 0), 0)
  const contracted = customers.filter((c) => c.status === 'contracted' || c.status === 'managing')
  const contractedPremium = contracted.reduce((s, c) => s + (c.monthly_premium || 0), 0)
  const avgPremium = customers.length > 0 ? total / customers.length : 0

  const rows = [
    { label: '총 월 보험료', value: Math.round(total / 10000), unit: '만원', color: '#7c3aed' },
    { label: '계약·관리 고객', value: Math.round(contractedPremium / 10000), unit: '만원', color: '#059669' },
    { label: '고객 평균', value: Math.round(avgPremium / 10000), unit: '만원', color: '#2563eb' },
    { label: '계약·관리 수', value: contracted.length, unit: '명', color: '#0891b2' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {rows.map((row) => (
        <div key={row.label} style={{ background: '#f8fafc', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 6 }}>{row.label}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: row.color }}>
            {row.value.toLocaleString()}<span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8', marginLeft: 2 }}>{row.unit}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatPremium(value?: number): string {
  const v = Number(value) || 0
  if (v === 0) return '-'
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만원`
  return `${v.toLocaleString()}원`
}

function normalizeName(value: any) {
  return String(value ?? '').replace(/\s/g, '').trim()
}

function daysBetween(dateText: string, now: Date) {
  const target = new Date(dateText)
  if (Number.isNaN(target.getTime())) return 9999
  return Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}
