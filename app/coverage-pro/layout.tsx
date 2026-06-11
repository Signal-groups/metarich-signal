'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import './coverage-pro.css'

export default function CoverageProLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const check = async () => {
      let { data: { session } } = await supabase.auth.getSession()

      // 세션 없으면 refreshSession 시도 (만료 토큰 갱신)
      if (!session) {
        const { data: refreshed } = await supabase.auth.refreshSession()
        session = refreshed.session
      }

      if (!session) {
        const redirectTo = encodeURIComponent(pathname || '/coverage-pro')
        router.replace(`/login?redirectTo=${redirectTo}`)
        return
      }

      setReady(true)
    }
    void check()
  }, [pathname, router])

  if (!ready) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: '#64748b',
        fontFamily: "'Pretendard Variable', sans-serif",
        fontSize: 15,
      }}>
        보장분석 PRO 로딩 중...
      </div>
    )
  }

  return <div className="coverage-pro-shell">{children}</div>
}
