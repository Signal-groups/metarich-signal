"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

const rememberedEmailKey = "insu-remembered-email"
const rememberIdKey = "insu-remember-id"
const autoLoginKey = "insu-auto-login"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberId, setRememberId] = useState(true)
  const [autoLogin, setAutoLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [redirectPath, setRedirectPath] = useState("/dashboard")
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const value = params.get("redirectTo") || "/dashboard"
    const nextRedirect = value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"
    const savedRemember = localStorage.getItem(rememberIdKey) !== "false"
    const savedAutoLogin = localStorage.getItem(autoLoginKey) === "true"
    const savedEmail = localStorage.getItem(rememberedEmailKey) || ""

    setRedirectPath(nextRedirect)
    setRememberId(savedRemember)
    setAutoLogin(savedAutoLogin)
    if (savedRemember && savedEmail) setEmail(savedEmail)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session && savedAutoLogin) router.replace(nextRedirect)
      })
      .catch(async () => {
        await supabase.auth.signOut()
      })
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const loginEmail = email.trim()
      localStorage.setItem(rememberIdKey, rememberId ? "true" : "false")
      localStorage.setItem(autoLoginKey, autoLogin ? "true" : "false")
      if (rememberId) localStorage.setItem(rememberedEmailKey, loginEmail)
      else localStorage.removeItem(rememberedEmailKey)

      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (error) alert("로그인에 실패했습니다: " + error.message)
      else router.push(redirectPath)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    const loginEmail = email.trim()
    if (!loginEmail) return alert("비밀번호를 재설정할 이메일을 먼저 입력해주세요.")
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) alert(error.message)
    else alert("비밀번호 재설정 메일을 발송했습니다.")
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f1e3c] p-5 text-slate-900">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-35"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1800&q=85')" }}
      />
      <div className="absolute inset-0 bg-[#0f1e3c]/70" />

      <main className="relative z-10 flex w-full max-w-md flex-col items-center gap-7">
        <h1 className="text-center font-black leading-tight text-white drop-shadow">
          <span className="block text-4xl md:text-6xl">보험의 기준</span>
          <span className="mt-3 block text-2xl tracking-wide md:text-4xl">Insu-Work Center</span>
        </h1>

        <section className="w-full rounded-[2rem] bg-white/95 p-7 shadow-2xl backdrop-blur md:p-10">
          <div className="mb-7 text-center">
            <p className="text-xs font-bold tracking-[0.25em] text-[#2563eb]">LOGIN</p>
            <h2 className="mt-2 text-3xl font-black text-[#1a3a6e]">로그인</h2>
            <p className="mt-2 text-xs font-bold text-slate-400">사용하는 기기에서 접속 상태를 유지할 수 있습니다.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-500">이메일</span>
              <input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold outline-none focus:border-[#2563eb] focus:bg-white"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-500">비밀번호</span>
              <input
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold outline-none focus:border-[#2563eb] focus:bg-white"
                required
              />
            </label>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={rememberId}
                  onChange={(event) => setRememberId(event.target.checked)}
                  className="h-5 w-5 accent-[#1a3a6e]"
                />
                아이디 기억
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={autoLogin}
                  onChange={(event) => setAutoLogin(event.target.checked)}
                  className="mt-0.5 h-5 w-5 accent-[#1a3a6e]"
                />
                <span>
                  자동 로그인
                  <span className="mt-1 block text-[11px] font-semibold leading-4 text-slate-400">
                    체크하면 이 PC 또는 모바일에서 다시 접속해도 로그인 상태가 유지됩니다.
                  </span>
                </span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-[#1a3a6e] p-5 font-black text-white transition hover:bg-[#2563eb] disabled:opacity-60">
              {loading ? "확인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-8 grid gap-3 text-center">
            <button onClick={handleResetPassword} className="text-xs font-bold text-slate-400 underline hover:text-[#1a3a6e]">비밀번호를 잊으셨나요?</button>
            <button onClick={() => router.push("/signup")} className="w-full rounded-2xl border-2 border-[#1a3a6e] py-4 text-sm font-black text-[#1a3a6e] transition hover:bg-[#1a3a6e] hover:text-white">
              회원가입 신청
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
