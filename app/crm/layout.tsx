'use client'

import './crm.css'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { canAccessCrm, normalizeRole } from '../../lib/roles'
import { ensureUserProfile } from '../../lib/userProfile'

type NavItem = {
  href: string
  label: string
  exact: boolean
  icon: React.ReactNode
}

const NAV: NavItem[] = [
  {
    href: '/crm', label: '대시보드', exact: true,
    icon: <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2"/></svg>
  },
  {
    href: '/crm/customers', label: '고객관리', exact: false,
    icon: <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 5.87v-2a4 4 0 00-2-3.46M15 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
  },
  {
    href: '/crm/family', label: '가족관리', exact: false,
    icon: <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"/></svg>
  },
  {
    href: '/crm/upload', label: '업로드 분석', exact: false,
    icon: <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 16V4m0 0L7 9m5-5l5 5"/><path strokeWidth="2" d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3"/></svg>
  },
  {
    href: '/crm/analysis', label: '보장분석', exact: false,
    icon: <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
  },
  {
    href: '/crm/card-consult', label: '카드 상담', exact: false,
    icon: <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2"/><path strokeWidth="2" d="M2 10h20"/><path strokeWidth="2" d="M6 15h4M14 15h4"/></svg>
  },
  {
    href: '/crm/alerts', label: '알림관리', exact: false,
    icon: <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
  },
  {
    href: '/crm/dm', label: '고객 DM', exact: false,
    icon: <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
  },
  {
    href: '/crm/dm-cards', label: 'DM 카드', exact: false,
    icon: <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2" strokeWidth="2"/><path strokeWidth="2" d="M8 9h8M8 13h5"/></svg>
  },
  {
    href: '/crm/reports', label: 'PDF 리포트', exact: false,
    icon: <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M7 3h7l5 5v13H7z"/><path strokeWidth="2" d="M14 3v6h5M9 14h6M9 18h4"/></svg>
  },
  {
    href: '/crm/settings', label: '설정', exact: false,
    icon: <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path strokeWidth="2" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06A1.65 1.65 0 0015 19.4a1.65 1.65 0 00-1 .6 1.65 1.65 0 00-.4 1.08V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-.6-1 1.65 1.65 0 00-1.08-.4H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-.6A1.65 1.65 0 0010.4 2.9V3a2 2 0 014 0v-.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.22.38.6.6 1 .6H21a2 2 0 010 4h-.09A1.65 1.65 0 0019.4 15z"/></svg>
  },
]

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [checking, setChecking] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const redirectTo = encodeURIComponent(pathname || '/crm')
      if (!session) { router.replace(`/login?redirectTo=${redirectTo}`); return }
      const { data: authUser, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser.user) {
        await supabase.auth.signOut().catch(() => {})
        router.replace(`/login?redirectTo=${redirectTo}`)
        return
      }
      let { data: userData } = await supabase
        .from('users').select('*').eq('id', authUser.user.id).maybeSingle()
      if (!userData) {
        try {
          userData = await ensureUserProfile(supabase, authUser.user)
        } catch {
          userData = null
        }
      }
      if (!userData) { router.replace(`/login?redirectTo=${redirectTo}`); return }

      const mergedUser = { ...authUser.user, ...userData, email: authUser.user.email }
      const effectiveRole = normalizeRole(mergedUser)
      const canUseCrm = canAccessCrm(mergedUser)
      if (!canUseCrm) { router.replace('/dashboard'); return }

      setUser({ ...mergedUser, effectiveRole })
      setChecking(false)
    }).catch(async () => {
      await supabase.auth.signOut().catch(() => {})
      const redirectTo = encodeURIComponent(pathname || '/crm')
      router.replace(`/login?redirectTo=${redirectTo}`)
    })
  }, [pathname, router])

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const advisorName = user?.name || user?.email?.split('@')[0] || '담당자'
  const closeCrmWindow = () => {
    if (window.opener) {
      window.close()
      return
    }
    router.replace('/dashboard?mode=office')
  }

  return (
    <div className="crm-app">
      {/* 모바일 햄버거 */}
      <button className="crm-mobile-btn" onClick={() => setSidebarOpen(o => !o)}>☰</button>

      {/* ── SIDEBAR ── */}
      <aside className={`crm-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sb-logo">
          <div className="sb-logo-icon">M</div>
          <div>
            <div className="sb-logo-text">시그널 고객관리</div>
            <div className="sb-logo-sub">상담 고객 및 보장관리</div>
          </div>
        </div>

        <nav className="crm-nav">
          {NAV.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${active ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="sb-footer">
          <div className="sb-advisor">
            <div className="sb-advisor-label">보험 담당자</div>
            <div className="sb-advisor-name">{advisorName}</div>
            {user?.phone && (
              <div className="sb-advisor-phone">
                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                {user.phone}
              </div>
            )}
          </div>
          <button
            onClick={closeCrmWindow}
            style={{ marginTop: 8, width: '100%', background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 8, color: '#94a3b8', fontSize: 11, padding: '7px 0', cursor: 'pointer' }}
          >
            고객관리 창 닫기
          </button>
        </div>
      </aside>

      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 99 }}
        />
      )}

      {/* ── MAIN ── */}
      <div className="crm-main">
        <div className="crm-page">
          {children}
        </div>
      </div>
    </div>
  )
}
