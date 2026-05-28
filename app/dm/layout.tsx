'use client'

import '../crm/crm.css'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function DmLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        const redirectTo = encodeURIComponent(pathname || '/dm')
        router.replace(`/login?redirectTo=${redirectTo}`)
        return
      }
      setChecking(false)
    }).catch(() => {
      const redirectTo = encodeURIComponent(pathname || '/dm')
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

  const goHome = () => {
    router.push('/dm')
  }

  // /dm 루트가 아닌 서브페이지인지 확인
  const isSubPage = pathname !== '/dm'

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div className="crm-app dm-standalone">
      <main className="dm-window-main">
        <div className="dm-window-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* 서브페이지에서만 뒤로가기 버튼 표시 */}
            {isSubPage && (
              <button
                type="button"
                onClick={goHome}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  color: 'inherit',
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                ← 고객 DM 홈
              </button>
            )}
            <div>
              <div className="dm-window-brand">고객 DM 발송</div>
              <div className="dm-window-subtitle">메시지 복사, 운세, 기념일, 명언, 건강 카드</div>
            </div>
          </div>
          <button type="button" onClick={closeWindow}>창 닫기</button>
        </div>
        <div className="crm-page">
          {children}
        </div>
      </main>
    </div>
  )
}
