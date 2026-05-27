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
        <div className="dm-window-topbar">
          <div>
            <div className="dm-window-brand">고객 DM 발송</div>
            <div className="dm-window-subtitle">메시지 복사, 운세, 기념일, 명언, 건강 카드</div>
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
