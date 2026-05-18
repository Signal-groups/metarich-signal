"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [redirectPath, setRedirectPath] = useState("/dashboard")
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const value = params.get("redirectTo") || "/dashboard"
    const nextRedirect = value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"
    setRedirectPath(nextRedirect)
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session && params.get("redirectTo")) router.replace(nextRedirect)
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
    else alert("비밀번호 재설정 메일이 발송되었습니다.")
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f1e3c] p-6 text-slate-900">
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

        <section className="w-full rounded-[2rem] bg-white/95 p-8 shadow-2xl backdrop-blur md:p-10">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold tracking-[0.25em] text-[#2563eb]">LOGIN</p>
            <h2 className="mt-2 text-3xl font-black text-[#1a3a6e]">로그인</h2>
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
