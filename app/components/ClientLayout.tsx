"use client"

/**
 * ClientLayout — 전역 페이지 전환 로더
 *
 * layout.tsx(서버 컴포넌트)에서 children을 감싸서 사용.
 * - 최초 페이지 오픈 시: 1.4초 로딩 애니메이션
 * - router.push 등 경로 변경 시: 0.9초 로딩 애니메이션
 * - 로그인 → 대시보드 이동 등 모든 내부 이동에 적용
 */

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import LoadingScreen from "./LoadingScreen"
import { supabase } from "../../lib/supabase"
import { trackPageView } from "../../lib/trackActivity"

const INITIAL_MS = 1000   // 최초 오픈 표시 시간 (ms)
const NAVIGATE_MS = 500   // 페이지 이동 표시 시간 (ms)

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const prevPath = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 로딩 표시 헬퍼
  const showFor = (ms: number) => {
    setLoading(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setLoading(false), ms)
  }

  // 최초 마운트
  useEffect(() => {
    prevPath.current = pathname
    showFor(INITIAL_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 경로 변경 감지 + 트래킹
  useEffect(() => {
    if (prevPath.current !== null && prevPath.current !== pathname) {
      prevPath.current = pathname
      showFor(NAVIGATE_MS)
    }
    // 페이지 방문 트래킹 (로그인 상태일 때만)
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) void trackPageView(session.user.id, pathname)
    })
  }, [pathname])

  return (
    <>
      {/* 로딩 오버레이 — 모든 페이지 위에 고정 */}
      {loading && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          <LoadingScreen />
        </div>
      )}
      {/* 페이지 콘텐츠 (로딩 중에도 뒤에서 렌더링됨) */}
      {children}
    </>
  )
}
