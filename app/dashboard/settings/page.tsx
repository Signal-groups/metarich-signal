"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"

type ChannelLinks = {
  kakao: string
  instagram: string
  youtube: string
  blog: string
}

const CHANNEL_DEFAULTS: ChannelLinks = { kakao: "", instagram: "", youtube: "", blog: "" }

export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 프로필
  const [name, setName] = useState("")
  const [rank, setRank] = useState("")
  const [dept, setDept] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  // 채널
  const [channels, setChannels] = useState<ChannelLinks>(CHANNEL_DEFAULTS)

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace("/login"); return }

    const { data: userData } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle()
    if (userData) {
      setUserId(userData.id)
      setName(userData.name || "")
      setRank(userData.rank || "")
      setDept(userData.department_name || userData.department || userData.headquarter_name || "")
      setPhone(userData.phone || "")
      setEmail(userData.email || "")
    }

    const { data: chData } = await supabase
      .from("team_settings")
      .select("value")
      .eq("key", `user_${session.user.id}_channels`)
      .maybeSingle()
    if (chData?.value) {
      try { setChannels({ ...CHANNEL_DEFAULTS, ...JSON.parse(chData.value) }) } catch { /* ignore */ }
    }
    setLoading(false)
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    try {
      await supabase.from("users").update({ name, phone }).eq("id", userId)
      await supabase.from("team_settings").upsert(
        { key: `user_${userId}_channels`, value: JSON.stringify(channels) },
        { onConflict: "key" }
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const fld = (styles?: React.CSSProperties) => ({
    width: "100%", height: 36, padding: "0 10px", border: "0.5px solid #d4e0eb",
    borderRadius: 7, background: "#f7fafc", color: "#1a2d42", fontSize: 12,
    fontFamily: "inherit", outline: "none", ...styles,
  } as React.CSSProperties)

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4f8", color: "#9ab4c8", fontSize: 13 }}>
      로딩 중...
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "Noto Sans KR, sans-serif" }}>

      {/* 상단바 */}
      <div style={{ background: "white", borderBottom: "0.5px solid #e4edf5", padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 500, color: "#1a2d42" }}>설정</p>
          <p style={{ fontSize: 12, color: "#7a9ab2", marginTop: 2 }}>내 정보와 채널 링크를 등록하면 DM·고객관리·브랜딩에 자동 반영됩니다.</p>
        </div>
        <button
          onClick={() => router.back()}
          style={{ fontSize: 12, color: "#7a9ab2", background: "none", border: "0.5px solid #d4e0eb", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}
        >← 돌아가기</button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* 안내 배너 */}
        <div style={{ background: "#eef4fb", border: "0.5px solid #b5d4f4", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 15, color: "#185fa5", flexShrink: 0 }}>ℹ️</span>
          <p style={{ fontSize: 12, color: "#0c447c", lineHeight: 1.7 }}>
            아래 정보는 <strong>DM 발송 자동 서명</strong>, <strong>고객 담당자 정보</strong>, <strong>설계사 브랜딩 AI</strong>에서 자동으로 활용됩니다. 한 번만 입력하면 됩니다.
          </p>
        </div>

        {/* 2컬럼: 기본 프로필 + 채널 링크 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }} className="sm:[grid-template-columns:1fr_1fr] [grid-template-columns:1fr]">

          {/* 기본 프로필 카드 */}
          <div style={{ background: "white", border: "0.5px solid #e4edf5", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #e4edf5", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "#eef4fb", color: "#185fa5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>👤</div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#1a2d42" }}>기본 프로필</p>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "이름", val: name, set: setName, type: "text", icon: "👤" },
                { label: "직함 / 직급", val: rank, set: (v: string) => {}, type: "text", icon: "🪪", readOnly: true },
                { label: "소속", val: dept, set: (v: string) => {}, type: "text", icon: "🏢", readOnly: true },
                { label: "전화번호", val: phone, set: setPhone, type: "tel", icon: "📞" },
                { label: "이메일", val: email, set: (v: string) => {}, type: "email", icon: "✉️", readOnly: true },
              ].map(({ label, val, set, type, icon, readOnly }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "#7a9ab2" }}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13 }}>{icon}</span>
                    <input
                      type={type}
                      value={val}
                      onChange={e => !readOnly && set(e.target.value)}
                      readOnly={readOnly}
                      style={{ ...fld({ paddingLeft: 34 }), background: readOnly ? "#f0f4f8" : "#f7fafc", color: readOnly ? "#9ab4c8" : "#1a2d42" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 16px 4px" }}>
              <p style={{ fontSize: 10, color: "#9ab4c8", marginBottom: 6 }}>활용 기능</p>
            </div>
            <div style={{ padding: "0 16px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["📤 DM 자동 서명", "👥 고객 담당자 정보", "🧠 브랜딩 AI"].map(tag => (
                <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, padding: "3px 8px", borderRadius: 20, border: "0.5px solid #d4e0eb", color: "#7a9ab2" }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* 채널 링크 카드 */}
          <div style={{ background: "white", border: "0.5px solid #e4edf5", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #e4edf5", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "#eeedfe", color: "#534ab7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🔗</div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#1a2d42" }}>채널 링크</p>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#9ab4c8" }}>선택 입력</span>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "카카오톡 채널 링크", key: "kakao" as keyof ChannelLinks, ph: "https://pf.kakao.com/...", icon: "💬", tag: "카카오" },
                { label: "인스타그램", key: "instagram" as keyof ChannelLinks, ph: "https://instagram.com/...", icon: "📸" },
                { label: "유튜브", key: "youtube" as keyof ChannelLinks, ph: "https://youtube.com/@...", icon: "▶️" },
                { label: "블로그 / 홈페이지", key: "blog" as keyof ChannelLinks, ph: "https://blog.naver.com/...", icon: "🌐" },
              ].map(({ label, key, ph, icon, tag }) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "#7a9ab2" }}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13 }}>{icon}</span>
                    <input
                      type="url"
                      value={channels[key]}
                      onChange={e => setChannels(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={ph}
                      style={{ ...fld({ paddingLeft: 34, paddingRight: tag ? 52 : 10 }) }}
                    />
                    {tag && (
                      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 9, padding: "2px 6px", borderRadius: 6, background: "#eef4fb", color: "#185fa5", fontWeight: 500 }}>{tag}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 16px 4px" }}>
              <p style={{ fontSize: 10, color: "#9ab4c8", marginBottom: 6 }}>활용 기능</p>
            </div>
            <div style={{ padding: "0 16px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["📤 DM 명함 버튼", "🧠 브랜딩 AI 프로필"].map(tag => (
                <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, padding: "3px 8px", borderRadius: 20, border: "0.5px solid #d4e0eb", color: "#7a9ab2" }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* 저장 버튼 행 */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={() => router.back()}
            style={{ padding: "8px 16px", borderRadius: 7, border: "0.5px solid #d4e0eb", background: "transparent", color: "#5a7a92", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
          >취소</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "8px 24px", borderRadius: 7, border: "none", background: saved ? "#1d9e75" : "#1a2540", color: "#e8f1f8", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s", opacity: saving ? 0.7 : 1 }}
          >{saving ? "저장 중..." : saved ? "✓ 저장됨" : "저장하기"}</button>
        </div>

      </div>
    </div>
  )
}
