'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

/* ─── 상태 정보 ─────────────────────────────────────────── */
const STATUS_INFO: { key: string; label: string; color: string; bg: string }[] = [
  { key: 'new',        label: '신규',  color: '#64748b', bg: '#f1f5f9' },
  { key: 'analysis',   label: '분석',  color: '#2563eb', bg: '#eff6ff' },
  { key: 'consulting', label: '상담',  color: '#d97706', bg: '#fffbeb' },
  { key: 'proposal',   label: '제안',  color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'contracted', label: '계약',  color: '#059669', bg: '#f0fdf4' },
  { key: 'managing',   label: '관리',  color: '#0891b2', bg: '#ecfeff' },
  { key: 'hold',       label: '보류',  color: '#dc2626', bg: '#fff7ed' },
]

const DAY_KR = ['일', '월', '화', '수', '목', '금', '토']

/* ─── 날짜 계산 유틸 ─────────────────────────────────────── */
function daysDiff(dateStr: string | null | undefined, from: Date = new Date()): number {
  if (!dateStr) return 9999
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 9999
  return Math.round((d.getTime() - from.getTime()) / 86_400_000)
}

/** 올해 생일까지 남은 일수 (0 = 오늘) */
function birthdayDaysLeft(birthDate: string | null | undefined): number {
  if (!birthDate) return 9999
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return 9999
  const today = new Date()
  const thisYear = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  let diff = Math.round((thisYear.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0) diff += 365   // 이미 지났으면 내년으로
  return diff
}

/** join_date 기준 목표일까지 남은 일수 */
function followUpDaysLeft(joinDate: string | null | undefined, targetDays: number): number {
  if (!joinDate) return 9999
  const joined = new Date(joinDate)
  if (Number.isNaN(joined.getTime())) return 9999
  const target = new Date(joined.getTime() + targetDays * 86_400_000)
  return Math.round((target.getTime() - Date.now()) / 86_400_000)
}

/* ─── 오늘 업무 항목 계산 ────────────────────────────────── */
interface TodoItem {
  type: 'birthday' | 'followup_90' | 'followup_180' | 'followup_365' | 'notif'
  customer?: { id: string; name: string; phone?: string }
  daysLeft: number
  label: string
  badge: string
  badgeColor: string
}

function computeTodayItems(customers: any[], notifications: any[]): TodoItem[] {
  const items: TodoItem[] = []
  const WINDOW = 7   // 7일 이내

  for (const c of customers) {
    const bDay = birthdayDaysLeft(c.birth_date)
    if (bDay <= WINDOW) {
      items.push({
        type: 'birthday', customer: c,
        daysLeft: bDay,
        label: bDay === 0 ? '🎂 오늘 생일' : `🎂 생일 D-${bDay}`,
        badge: bDay === 0 ? '오늘' : `D-${bDay}`,
        badgeColor: '#be185d',
      })
    }
    const f90 = followUpDaysLeft(c.join_date, 90)
    if (f90 >= -1 && f90 <= 3) {
      items.push({
        type: 'followup_90', customer: c,
        daysLeft: f90,
        label: '📞 가입 90일 연락',
        badge: f90 <= 0 ? '오늘' : `D-${f90}`,
        badgeColor: '#2563eb',
      })
    }
    const f180 = followUpDaysLeft(c.join_date, 180)
    if (f180 >= -1 && f180 <= 3) {
      items.push({
        type: 'followup_180', customer: c,
        daysLeft: f180,
        label: '📞 가입 6개월 연락',
        badge: f180 <= 0 ? '오늘' : `D-${f180}`,
        badgeColor: '#7c3aed',
      })
    }
    const f365 = followUpDaysLeft(c.join_date, 365)
    if (f365 >= -1 && f365 <= 3) {
      items.push({
        type: 'followup_365', customer: c,
        daysLeft: f365,
        label: '📞 가입 1년 연락',
        badge: f365 <= 0 ? '오늘' : `D-${f365}`,
        badgeColor: '#059669',
      })
    }
  }

  // 미완료 알림 추가 (D-7 이내)
  for (const n of notifications) {
    if (n.is_done) continue
    const diff = daysDiff(n.due_date)
    if (diff >= -1 && diff <= 7) {
      items.push({
        type: 'notif',
        customer: { id: n.customer_id, name: n.customer_name || '고객' },
        daysLeft: diff,
        label: `🔔 ${NOTIF_LABEL[n.type] || n.type}`,
        badge: diff <= 0 ? '오늘' : `D-${diff}`,
        badgeColor: '#ea580c',
      })
    }
  }

  return items.sort((a, b) => a.daysLeft - b.daysLeft)
}

const NOTIF_LABEL: Record<string, string> = {
  birthday: '생일',
  indemnity_end: '면책 종료',
  reduction_end: '감액 종료',
  car_renewal_d60: '자동차 D-60',
  car_renewal_d30: '자동차 D-30',
  indemnity_renewal: '실손 재가입',
  join_30: '가입 30일',
  join_90: '가입 90일',
  join_180: '가입 6개월',
  join_365: '가입 1년',
  consulting: '상담 예정',
}

/* ─── 메인 컴포넌트 ─────────────────────────────────────── */
export default function CrmDashboard() {
  const [loading, setLoading]           = useState(true)
  const [advisorName, setAdvisorName]   = useState('담당자')
  const [customers, setCustomers]       = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [genBulk, setGenBulk]           = useState<'idle' | 'running' | 'done' | 'err'>('idle')
  const [genMsg, setGenMsg]             = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const [{ data: userData }, { data: custs }] = await Promise.all([
        supabase.from('users').select('name').eq('id', session.user.id).single(),
        supabase.from('customers').select('*')
          .eq('advisor_id', session.user.id).is('deleted_at', null)
          .order('join_date', { ascending: false }),
      ])

      setAdvisorName(userData?.name || session.user.email?.split('@')[0] || '담당자')
      const custList = custs || []
      setCustomers(custList)

      const custIds = custList.map((c: any) => c.id)
      if (custIds.length > 0) {
        const { data: notifs } = await supabase
          .from('notifications').select('*')
          .in('customer_id', custIds)
          .order('due_date', { ascending: true }).limit(50)
        setNotifications(notifs || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date()
  const todayStr = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const stats = useMemo(() => {
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const totalPremium = customers.reduce((s, c) => s + (c.monthly_premium || 0), 0)
    const contracted = customers.filter((c) => c.status === 'contracted' || c.status === 'managing')
    return {
      total: customers.length,
      thisMonth: customers.filter((c) => c.join_date?.startsWith(thisMonth)).length,
      totalPremium,
      contracted: contracted.length,
      contractedPremium: contracted.reduce((s, c) => s + (c.monthly_premium || 0), 0),
      pendingNotif: notifications.filter((n) => !n.is_done).length,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, notifications])

  const todayItems = useMemo(
    () => computeTodayItems(customers, notifications),
    [customers, notifications]
  )

  const statusCounts = useMemo(() =>
    STATUS_INFO.map((s) => ({ ...s, count: customers.filter((c) => c.status === s.key).length })),
    [customers]
  )

  const runBulkGenerate = async () => {
    setGenBulk('running')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch('/api/crm/generate-notifications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setGenMsg(json.message)
      setGenBulk('done')
    } catch (e: any) {
      setGenMsg(e.message || '오류')
      setGenBulk('err')
    }
    setTimeout(() => { setGenBulk('idle'); setGenMsg('') }, 4000)
  }

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

      {/* ── 오늘의 업무브리핑 배너 ─────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a2744 0%, #2d4a8a 100%)',
        borderRadius: 20, padding: '28px 32px', color: '#fff',
        display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 24,
      }}>
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', fontWeight: 700, marginBottom: 6 }}>
            {todayStr}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>
            안녕하세요, {advisorName}님! 👋
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.75)', lineHeight: 1.6 }}>
            {todayItems.length > 0
              ? `오늘 챙겨야 할 항목이 ${todayItems.length}건 있어요.`
              : '오늘은 긴급 업무가 없습니다. 여유롭게 시작하세요! ☀️'}
          </div>
        </div>
        {/* 빠른 실행 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
          <Link href="/crm/customers/new" style={quickBtn('#c9a96e', '#1a2744')}>
            + 신규 고객 등록
          </Link>
          <a href="/coverage-pro" target="_blank" rel="noopener noreferrer" style={quickBtn('rgba(255,255,255,.15)', '#fff')}>
            ⚡ 보장분석 PRO
          </a>
          <Link href="/crm/board" style={quickBtn('rgba(255,255,255,.1)', '#fff')}>
            📋 업무보드
          </Link>
          <button
            onClick={runBulkGenerate}
            disabled={genBulk === 'running'}
            style={{ ...quickBtn('rgba(255,255,255,.08)', '#fff'), border: '1px solid rgba(255,255,255,.2)', cursor: 'pointer' }}
          >
            {genBulk === 'running' ? '⏳ 생성 중...'
             : genBulk === 'done' ? `✅ ${genMsg}`
             : genBulk === 'err' ? `❌ ${genMsg}`
             : '🔔 전체 알림 생성'}
          </button>
        </div>
      </div>

      {/* ── KPI 카드 4개 ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KpiCard icon="👥" label="전체 고객" value={stats.total} unit="명" sub={`이달 신규 ${stats.thisMonth}명`} color="#2563eb" bg="#eff6ff" />
        <KpiCard icon="✅" label="계약·관리" value={stats.contracted} unit="명" sub={`월 ${fmtW(stats.contractedPremium)} 보험료`} color="#059669" bg="#f0fdf4" />
        <KpiCard icon="₩" label="총 월 보험료" value={Math.round(stats.totalPremium / 10_000)} unit="만" sub="전체 고객 합산" color="#7c3aed" bg="#faf5ff" />
        <KpiCard icon="🔔" label="미완료 알림" value={stats.pendingNotif} unit="건" sub="확인 필요" color="#ea580c" bg="#fff7ed" link="/crm/alerts" />
      </div>

      {/* ── 2열: 오늘의 할 일 + 고객 상태 현황 ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* 오늘의 할 일 */}
        <div className="card card-p">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>📌 오늘의 할 일</div>
            <Link href="/crm/alerts" className="link" style={{ fontSize: 12 }}>전체 알림</Link>
          </div>
          {todayItems.length === 0 ? (
            <div style={{ padding: '28px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              오늘 예정된 항목이 없어요 🎉
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {todayItems.slice(0, 8).map((item, i) => (
                <Link
                  key={i}
                  href={item.customer ? `/crm/customers/${item.customer.id}` : '/crm/alerts'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 10, background: '#f8fafc',
                    border: '1px solid #e2e8f0', textDecoration: 'none',
                    transition: 'background .15s',
                  }}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 900, padding: '2px 8px',
                    borderRadius: 999, background: item.badgeColor + '18',
                    color: item.badgeColor, flexShrink: 0,
                  }}>
                    {item.badge}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.customer?.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{item.label}</div>
                  </div>
                  {item.customer?.phone && (
                    <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{item.customer.phone}</span>
                  )}
                </Link>
              ))}
              {todayItems.length > 8 && (
                <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', paddingTop: 4 }}>
                  +{todayItems.length - 8}건 더 있음 — <Link href="/crm/alerts" className="link">전체보기</Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 고객 상태 현황 */}
        <div className="card card-p">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>📊 고객 상태 현황</div>
            <Link href="/crm/board" className="link" style={{ fontSize: 12 }}>업무보드</Link>
          </div>
          {customers.length === 0 ? (
            <div style={{ padding: '28px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>등록된 고객이 없습니다.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {statusCounts.filter((s) => s.count > 0).map((s) => {
                const max = Math.max(...statusCounts.map((x) => x.count), 1)
                return (
                  <Link key={s.key} href={`/crm/board?status=${s.key}`} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 44px', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: s.color, background: s.bg, borderRadius: 8, padding: '3px 8px', textAlign: 'center' }}>{s.label}</span>
                    <div style={{ height: 12, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(s.count / max) * 100}%`, borderRadius: 999, background: s.color, transition: 'width .5s' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 900, color: s.color, textAlign: 'right' }}>{s.count}명</span>
                  </Link>
                )
              })}
              <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>전체 {stats.total}명</span>
                <Link href="/crm/board" className="btn btn-secondary btn-xs">업무보드 열기 →</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 2열: 이번 주 생일 + 최근 등록 고객 ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* 이번 주 생일 & Follow-up */}
        <div className="card card-p">
          <div className="card-title" style={{ marginBottom: 14 }}>🗓 이번 주 예정</div>
          <WeeklyPreview customers={customers} />
        </div>

        {/* 최근 등록 고객 */}
        <div className="card card-p">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>🆕 최근 등록 고객</div>
            <Link href="/crm/customers" className="link" style={{ fontSize: 12 }}>전체보기</Link>
          </div>
          {customers.length === 0 ? (
            <div style={{ padding: '28px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>등록된 고객이 없습니다.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {customers.slice(0, 6).map((c) => {
                const s = STATUS_INFO.find((x) => x.key === c.status) ?? STATUS_INFO[0]
                return (
                  <Link key={c.id} href={`/crm/customers/${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
                      {c.name?.slice(0, 1)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.join_date || '-'} 등록</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 8, background: s.bg, color: s.color, flexShrink: 0 }}>{s.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 보험료 현황 요약 ────────────────────────────────── */}
      <div className="card card-p">
        <div className="card-title" style={{ marginBottom: 14 }}>💰 보험료 현황</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { label: '총 월 보험료', value: fmtW(stats.totalPremium), color: '#7c3aed' },
            { label: '계약·관리 고객 보험료', value: fmtW(stats.contractedPremium), color: '#059669' },
            { label: '고객 평균 보험료', value: stats.total > 0 ? fmtW(Math.round(stats.totalPremium / stats.total)) : '-', color: '#2563eb' },
            { label: '계약·관리 고객 수', value: `${stats.contracted}명`, color: '#0891b2' },
          ].map((item) => (
            <div key={item.label} style={{ background: '#f8fafc', borderRadius: 14, padding: '16px 18px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

/* ─── 이번 주 예정 컴포넌트 ─────────────────────────────── */
function WeeklyPreview({ customers }: { customers: any[] }) {
  const items: { daysLeft: number; label: string; customerName: string; customerId: string; color: string }[] = []

  for (const c of customers) {
    const bDay = birthdayDaysLeft(c.birth_date)
    if (bDay <= 7) items.push({ daysLeft: bDay, label: '🎂 생일', customerName: c.name, customerId: c.id, color: '#be185d' })
    const f90 = followUpDaysLeft(c.join_date, 90)
    if (f90 >= 0 && f90 <= 7) items.push({ daysLeft: f90, label: '📞 가입 90일', customerName: c.name, customerId: c.id, color: '#2563eb' })
    const f180 = followUpDaysLeft(c.join_date, 180)
    if (f180 >= 0 && f180 <= 7) items.push({ daysLeft: f180, label: '📞 가입 6개월', customerName: c.name, customerId: c.id, color: '#7c3aed' })
    const f365 = followUpDaysLeft(c.join_date, 365)
    if (f365 >= 0 && f365 <= 7) items.push({ daysLeft: f365, label: '📞 가입 1년', customerName: c.name, customerId: c.id, color: '#059669' })
  }

  items.sort((a, b) => a.daysLeft - b.daysLeft)

  if (items.length === 0) {
    return <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>이번 주 예정된 일정이 없어요</div>
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.slice(0, 7).map((item, i) => (
        <Link key={i} href={`/crm/customers/${item.customerId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: item.color + '15',
            color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 900, flexShrink: 0, textAlign: 'center',
          }}>
            {item.daysLeft === 0 ? '오늘' : `D-${item.daysLeft}`}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2744' }}>{item.customerName}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{item.label}</div>
          </div>
        </Link>
      ))}
    </div>
  )
}

/* ─── KPI 카드 ──────────────────────────────────────────── */
function KpiCard({ icon, label, value, unit, sub, color, bg, link }: {
  icon: string; label: string; value: number; unit: string; sub: string; color: string; bg: string; link?: string
}) {
  const content = (
    <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, height: '100%' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>
          {value.toLocaleString()}<span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8', marginLeft: 2 }}>{unit}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{sub}</div>
      </div>
    </div>
  )
  return link ? <Link href={link} style={{ textDecoration: 'none' }}>{content}</Link> : content
}

/* ─── 유틸 ──────────────────────────────────────────────── */
function fmtW(v: number): string {
  if (!v) return '-'
  const w = Math.round(v / 10_000)
  return w >= 10_000 ? `${(w / 10_000).toFixed(1)}억` : `${w.toLocaleString()}만원`
}

function quickBtn(bg: string, color: string): React.CSSProperties {
  return {
    display: 'block', textAlign: 'center', padding: '9px 16px', borderRadius: 10,
    background: bg, color, fontSize: 13, fontWeight: 700, textDecoration: 'none',
    border: `1px solid ${color === '#fff' ? 'rgba(255,255,255,.2)' : 'transparent'}`,
    cursor: 'pointer',
  }
}
