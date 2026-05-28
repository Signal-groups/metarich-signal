'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function CardConsultLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // 로그인 여부만 확인 — CRM 권한 불필요
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        const redirectTo = encodeURIComponent(pathname || '/card-consult')
        router.replace(`/login?redirectTo=${redirectTo}`)
        return
      }
      setChecking(false)
    }).catch(() => {
      const redirectTo = encodeURIComponent(pathname || '/card-consult')
      router.replace(`/login?redirectTo=${redirectTo}`)
    })
  }, [pathname, router])

  const closeWindow = () => {
    if (window.opener) {
      window.close()
      return
    }
    router.replace('/dashboard')
  }

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh', background: '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 28, height: 28, border: '3px solid #1A2744',
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', position: 'relative' }}>
      {/* 창 닫기 버튼 — 우측 상단 고정 */}
      <button
        onClick={closeWindow}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 999,
          background: '#1A2744', color: '#fff',
          border: 'none', borderRadius: 10,
          padding: '8px 16px', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        홈으로 ✕
      </button>
      {children}
    </div>
  )
}
