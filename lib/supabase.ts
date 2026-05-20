import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const authStorageKey = 'insu-auto-login'

const browserAuthStorage = {
  getItem(key: string) {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(key) || sessionStorage.getItem(key)
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(authStorageKey) === 'true') {
      localStorage.setItem(key, value)
      sessionStorage.removeItem(key)
      return
    }
    sessionStorage.setItem(key, value)
    localStorage.removeItem(key)
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
