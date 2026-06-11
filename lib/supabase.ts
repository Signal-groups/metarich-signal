import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const authStorageKey = 'insu-auto-login'

// ─────────────────────────────────────────────────────────────────────────
// 항상 localStorage 사용: 새 창(보장분석 PRO, 재무설계 포트폴리오 등)에서도
// 세션이 유지되도록 함. sessionStorage는 window간 공유 불가로 튕김 현상 발생.
// ─────────────────────────────────────────────────────────────────────────
const browserAuthStorage = {
  getItem(key: string) {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(key)
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, value)
    sessionStorage.removeItem(key) // 구버전 sessionStorage 잔존 항목 정리
  },
  removeItem(key: string) {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: browserAuthStorage,
  },
})
