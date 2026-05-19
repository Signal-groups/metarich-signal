'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'

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

export default function CrmDashboard() {
  const [loading, setLoading] = useState(true)
  const [advisorName, setAdvisorName] = useState('담당자')
  const [customers, setCustomers] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [radarData, setRadarData] = useState<{ category: string; value: number; recommended: number }[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

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
          .eq('is_done', false)
          .order('due_date', { ascending: true })
          .limit(10)
        : { data: [] }

      setNotifications(notifs || [])

      if (custIds.length > 0) {
        const { data: coverages } = await supabase
          .from('coverages')
          .select('category, amount')
          .in('customer_id', custIds)

        const categoryTotals: Record<string, number> = {}
        ;(coverages || []).forEach((coverage: any) => {
          categoryTotals[coverage.category] = (categoryTotals[coverage.category] || 0) + (coverage.amount || 0)
        })

        const maxAmount = Math.max(...Object.values(categoryTotals), 1)
        setRadarData(Object.entries(categoryNames).map(([key, label]) => ({
          category: label,
          value: Math.round(((categoryTotals[key] || 0) / maxAmount) * 100),
          recommended: 100,
        })))
      }

      setLoading(false)
    }

    load()
  }, [])

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const totalPremium = customers.reduce((sum, customer) => sum + (customer.monthly_premium || 0), 0)

    return {
      total: customers.length,
      thisMonth: customers.filter((customer) => customer.join_date?.startsWith(thisMonth)).length,
      totalPremium,
      pendingNotif: notifications.length,
      birthday: notifications.filter((item) => item.type === 'birthday').length,
      renewal: notifications.filter((item) => String(item.type).includes('renewal')).length,
    }
  }, [customers, notifications])

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
        <StatCard icon="💬" iconBg="#f0fdf4" label="미처리 알림" value={stats.pendingNotif} unit="건" sub="오늘 확인" color="#16a34a" />
        <StatCard icon="₩" iconBg="#faf5ff" label="월 보험료" value={Math.round(stats.totalPremium / 10000)} unit="만" sub="전체 합계" color="#7c3aed" />
      </div>

      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card card-p" style={{ gridColumn: 'span 2' }}>
          <div className="flex justify-between items-center mb-16">
            <div className="card-title" style={{ marginBottom: 0 }}>미처리 알림</div>
            <Link href="/crm/alerts" className="link">전체보기</Link>
          </div>
          {notifications.slice(0, 6).map((item) => (
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
          {notifications.length === 0 && <EmptyState text="현재 처리할 알림이 없습니다." />}
        </div>

        <div className="card card-p">
          <div className="card-title">전체 보장 현황</div>
          {radarData.length > 0 ? (
            <div className="radar-wrap" style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <Radar name="현재" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} />
                  <Radar name="권장" dataKey="recommended" stroke="#E2E8F0" fill="none" strokeDasharray="4 2" />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState text="보장 데이터가 등록되면 표시됩니다." />
          )}
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card card-p">
          <div className="flex justify-between items-center mb-16">
            <div className="card-title" style={{ marginBottom: 0 }}>업로드 분석 현황</div>
            <Link href="/crm/upload" className="link">이동</Link>
          </div>
          <Link href="/crm/upload" className="upload-zone" style={{ display: 'block', padding: 18, textDecoration: 'none' }}>
            <div className="upload-icon" style={{ fontSize: 24 }}>📁</div>
            <div className="upload-text" style={{ fontSize: 12 }}>파일 업로드하기</div>
            <div className="upload-sub">암, 뇌, 심장, 수술 등 항목별 자료 정리</div>
          </Link>
        </div>

        <div className="card card-p">
          <div className="flex justify-between items-center mb-16">
            <div className="card-title" style={{ marginBottom: 0 }}>PDF 리포트</div>
            <Link href="/crm/reports" className="link">생성</Link>
          </div>
          <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.8 }}>
            고객별 상담 요약, 보장 태그, 월 보험료 정보를 PDF로 정리해 상담 전후 공유 자료로 활용합니다.
          </div>
        </div>

        <div className="card card-p">
          <div className="flex justify-between items-center mb-16">
            <div className="card-title" style={{ marginBottom: 0 }}>운영 설정</div>
            <Link href="/crm/settings" className="link">설정</Link>
          </div>
          <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.8 }}>
            담당자 정보, 알림, 자료 보관 방식, 화면 표시 기준을 고객관리 흐름에 맞게 조정합니다.
          </div>
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
              {customers.slice(0, 6).map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Link href={`/crm/customers/${customer.id}`} className="fw-700 text-blue">
                      {customer.name}
                    </Link>
                  </td>
                  <td>{customer.phone || '-'}</td>
                  <td>{(customer.monthly_premium || 0).toLocaleString()}원</td>
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

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{text}</div>
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
