"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

const rememberedEmailKey = "insu-remembered-email"
const rememberIdKey = "insu-remember-id"
const autoLoginKey = "insu-auto-login"
const publicRedirectFallbacks = new Set(["/card-consult"])

const SLIDES = [
  {
    tag: "문제",
    tagStyle: { background: "rgba(216,90,48,0.25)", color: "#f0997b", border: "0.5px solid rgba(216,90,48,0.4)" },
    bg: "linear-gradient(135deg, #0d1b2a 0%, #1a2d42 60%, #0f2233 100%)",
    title: "고객은 늘어나는데\n관리는 더 어려워지고 있나요?",
    sub: "분산된 고객 정보, 놓치는 상담 일정,\n쌓여만 가는 미처리 업무",
    tags: ["고객관리", "상담관리", "일정관리", "DB관리"],
  },
  {
    tag: "해결책",
    tagStyle: { background: "rgba(55,138,221,0.25)", color: "#85b7eb", border: "0.5px solid rgba(55,138,221,0.4)" },
    bg: "linear-gradient(135deg, #12203a 0%, #1c3a5c 60%, #0e2240 100%)",
    title: "보험의 기준\nInsu-Work Center",
    sub: "설계사를 위한 통합 업무 플랫폼\n하나의 화면에서 모든 업무를",
    tags: ["CRM", "보장분석", "교육자료", "조직관리"],
  },
  {
    tag: "성과",
    tagStyle: { background: "rgba(29,158,117,0.25)", color: "#5dcaa5", border: "0.5px solid rgba(29,158,117,0.4)" },
    bg: "linear-gradient(135deg, #0a1f1a 0%, #0d3328 60%, #091c18 100%)",
    title: "고객 관리부터\n리쿠르팅까지 하나로",
    sub: "업무 효율을 높이고 성과를 만드는\n설계사 전용 플랫폼",
    tags: ["CRM", "보장분석", "리쿠르팅", "교육자료"],
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberId, setRememberId] = useState(true)
  const [autoLogin, setAutoLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [redirectPath, setRedirectPath] = useState("/dashboard")
  const [slideIdx, setSlideIdx] = useState(0)
  const [progKey, setProgKey] = useState(0)
  const [showMaintenance, setShowMaintenance] = useState(false)
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 8월 27일 이전이면 점검 공지 팝업 표시
  useEffect(() => {
    const resumeDate = new Date("2026-08-27T00:00:00+09:00")
    if (new Date() < resumeDate) setShowMaintenance(true)
  }, [])

  const goSlide = (n: number) => {
    setSlideIdx(n)
    setProgKey(k => k + 1)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSlideIdx(prev => {
        const next = (prev + 1) % SLIDES.length
        setProgKey(k => k + 1)
        return next
      })
    }, 4000)
  }

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSlideIdx(prev => {
        const next = (prev + 1) % SLIDES.length
        setProgKey(k => k + 1)
        return next
      })
    }, 4000)
    setProgKey(1)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const value = params.get("redirectTo") || "/dashboard"
    const safeRedirect = value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"
    const nextRedirect = publicRedirectFallbacks.has(safeRedirect) ? "/dashboard" : safeRedirect
    const savedRemember = localStorage.getItem(rememberIdKey) !== "false"
    const savedAutoLogin = localStorage.getItem(autoLoginKey) === "true"
    const savedEmail = localStorage.getItem(rememberedEmailKey) || ""

    setRedirectPath(nextRedirect)
    setRememberId(savedRemember)
    setAutoLogin(savedAutoLogin)
    if (savedRemember && savedEmail) setEmail(savedEmail)

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!session) return
        // 자동 로그인 OFF + 새 브라우저 세션 → 기존 세션 파기
        const autoLoginSaved = localStorage.getItem(autoLoginKey) === "true"
        const activeSession = sessionStorage.getItem("insu-active-session") === "true"
        if (!autoLoginSaved && !activeSession) {
          await supabase.auth.signOut()
          return
        }
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user) { await supabase.auth.signOut(); return }
        router.replace(nextRedirect)
      })
      .catch(async () => { await supabase.auth.signOut() })
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
      await supabase.auth.signOut().catch(() => {})
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (error) alert("로그인에 실패했습니다: " + error.message)
      else {
        sessionStorage.setItem("insu-active-session", "true")
        router.push(redirectPath)
      }
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

  const slide = SLIDES[slideIdx]

  return (
    <div style={{ display: "flex", minHeight: "100vh", overflow: "hidden", background: "#0f1923" }}>

      {/* ── 서버 점검 공지 팝업 ── */}
      {showMaintenance && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
          <div style={{ background: "#ffffff", borderRadius: 18, padding: "36px 32px", maxWidth: 420, width: "90%", boxShadow: "0 24px 60px rgba(0,0,0,0.4)", textAlign: "center" }}>
            {/* 아이콘 */}
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, #1a2744, #2D4A8A)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>

            {/* 제목 */}
            <p style={{ fontSize: 18, fontWeight: 700, color: "#1A2744", marginBottom: 8 }}>서비스 점검 안내</p>
            <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 24, lineHeight: 1.5 }}>
              현재 서버 업그레이드 및 시스템 이전 작업이 진행 중입니다.
            </p>

            {/* 일정 박스 */}
            <div style={{ background: "#F5F2ED", borderRadius: 12, padding: "16px 20px", marginBottom: 20, textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2 }}>서비스 중단 기간</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1A2744" }}>~ 2026년 8월 26일 (화)</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2 }}>서비스 재개 예정</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1A2744" }}>2026년 8월 27일 (수) 이후</p>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>
              불편을 드려 진심으로 사과드립니다.<br/>
              작업 완료 후 더욱 안정적인 서비스로 찾아뵙겠습니다.
            </p>

            <button
              onClick={() => setShowMaintenance(false)}
              style={{ width: "100%", height: 46, borderRadius: 10, border: "none", background: "#1A2744", color: "#ffffff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 좌측 스토리텔링 패널 (PC only) */}
      <div className="hidden lg:flex" style={{ flex: 6, position: "relative", flexDirection: "column", justifyContent: "flex-end", padding: "40px", overflow: "hidden", minHeight: "100vh" }}>
        {SLIDES.map((s, i) => (
          <div key={i} style={{ position: "absolute", inset: 0, background: s.bg, opacity: i === slideIdx ? 1 : 0, transition: "opacity 0.8s ease" }} />
        ))}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />

        <div style={{ position: "absolute", top: 24, left: 24, zIndex: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#378add" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>Insu-Work Center</span>
        </div>

        <div style={{ position: "relative", zIndex: 2 }}>
          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 20, marginBottom: 16, textTransform: "uppercase" as const, ...slide.tagStyle }}>
            {slide.tag}
          </span>
          <p style={{ fontSize: 26, fontWeight: 500, color: "#f0ece8", lineHeight: 1.4, marginBottom: 10, whiteSpace: "pre-line" }}>{slide.title}</p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: 28, whiteSpace: "pre-line" }}>{slide.sub}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {slide.tags.map(t => (
              <span key={t} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "0.5px solid rgba(255,255,255,0.15)" }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 10 }}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => goSlide(i)} style={{ width: i === slideIdx ? 18 : 6, height: 6, borderRadius: 3, background: i === slideIdx ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", transition: "all 0.3s", padding: 0 }} />
          ))}
        </div>

        <div key={progKey} style={{ position: "absolute", bottom: 0, left: 0, height: 2, background: "rgba(55,138,221,0.6)", zIndex: 10 }} className="login-progress" />
      </div>

      {/* 우측 로그인 폼 */}
      <div style={{ flex: 4, background: "white", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 36px", borderLeft: "0.5px solid rgba(0,0,0,0.06)" }} className="relative">
        <div className="lg:hidden absolute inset-0" style={{ background: "#0f1923" }} />

        <div className="lg:hidden relative z-10" style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ fontSize: 22, fontWeight: 600, color: "white" }}>보험의 기준</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Insu-Work Center</p>
        </div>

        <div className="relative z-10" style={{ background: "white", borderRadius: 14, padding: "36px 32px", maxWidth: 420, width: "100%", margin: "0 auto" }}>
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 22, fontWeight: 600, color: "#1a2d42" }}>로그인</p>
            <p style={{ fontSize: 13, color: "#7a9ab2", marginTop: 6 }}>Insu-Work Center에 오신 것을 환영합니다</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, color: "#5a7a92", marginBottom: 7, fontWeight: 500 }}>이메일</label>
              <input type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: "100%", height: 48, padding: "0 14px", border: "0.5px solid #d4e0eb", borderRadius: 10, background: "#f7fafc", color: "#1a2d42", fontSize: 15, outline: "none", fontFamily: "inherit" }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 13, color: "#5a7a92", marginBottom: 7, fontWeight: 500 }}>비밀번호</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%", height: 48, padding: "0 14px", border: "0.5px solid #d4e0eb", borderRadius: 10, background: "#f7fafc", color: "#1a2d42", fontSize: 15, outline: "none", fontFamily: "inherit" }} />
            </div>

            <div style={{ margin: "14px 0", padding: "12px 14px", background: "#f7fafc", borderRadius: 10, border: "0.5px solid #e8eff5" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 10 }}>
                <input type="checkbox" checked={rememberId} onChange={e => setRememberId(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#1a2d42" }} />
                <span style={{ fontSize: 13, color: "#4a6275" }}>아이디 기억</span>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={autoLogin} onChange={e => setAutoLogin(e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, accentColor: "#1a2d42" }} />
                <div>
                  <span style={{ fontSize: 13, color: "#4a6275" }}>자동 로그인</span>
                  <p style={{ fontSize: 12, color: "#9ab4c8", marginTop: 3, lineHeight: 1.4 }}>이 기기에서 다시 접속해도 로그인 상태가 유지됩니다.</p>
                </div>
              </label>
            </div>

            <div style={{ textAlign: "right", marginBottom: 10 }}>
              <button type="button" onClick={handleResetPassword} style={{ fontSize: 13, color: "#7a9ab2", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>비밀번호 찾기</button>
            </div>

            <button type="submit" disabled={loading} style={{ width: "100%", height: 48, borderRadius: 10, border: "none", background: "#1a2d42", color: "#e8f1f8", fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1 }}>
              {loading ? "확인 중..." : "로그인"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 18px" }}>
            <div style={{ flex: 1, height: 0.5, background: "#e8eff5" }} />
            <span style={{ fontSize: 12, color: "#9ab4c8" }}>처음 이용하시나요?</span>
            <div style={{ flex: 1, height: 0.5, background: "#e8eff5" }} />
          </div>

          <button type="button" onClick={() => router.push("/signup")} style={{ width: "100%", height: 48, borderRadius: 10, border: "0.5px solid #d4e0eb", background: "transparent", color: "#4a6275", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            회원가입
          </button>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "0.5px solid #e8eff5", textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "#9ab4c8" }}>보험설계사 전용 플랫폼 · Insu-Work Center</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress { from { width: 0% } to { width: 100% } }
        .login-progress { animation: progress 4s linear infinite; }
      `}</style>
    </div>
  )
}
