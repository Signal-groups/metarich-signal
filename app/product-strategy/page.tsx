"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import { isApprovedUser, normalizeRole } from "../../lib/roles"

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type Feature = { icon: string; title: string; desc: string }
type Speech = { opening: string; core: string; closing: string }
type TouchCard = { headline: string; subheadline: string; points: string[]; cta: string }

type StrategyData = {
  productName: string
  category: string
  categoryColor: string
  features: Feature[]
  concept: string
  speech: Speech
  touchCard: TouchCard
  rawContent: string
  updatedAt: string
  updatedBy: string
}

type ViewTab = "features" | "concept" | "speech" | "touch"

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const NAVY = "#1A2744"
const GOLD = "#C9A96E"
const GOLD_WARM = "#E8A84B"

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function ProductStrategyStandalonePage() {
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)

  const [user, setUser] = useState<any>(null)
  const [isEditor, setIsEditor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [strategy, setStrategy] = useState<StrategyData | null>(null)
  const [rawContent, setRawContent] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [viewTab, setViewTab] = useState<ViewTab>("features")
  const [authLoading, setAuthLoading] = useState(true)

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const settingsKey = `product_strategy:${month}`

  // ── 인증 확인 ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace(`/login?redirectTo=/product-strategy`)
        return
      }
      const { data: userData } = await supabase
        .from("users").select("*").eq("id", session.user.id).maybeSingle()
      const userInfo = userData || session.user
      const role = normalizeRole(userInfo)
      if (!isApprovedUser(userInfo)) {
        router.replace("/dashboard")
        return
      }
      setUser(userInfo)
      setIsEditor(["master", "headquarters"].includes(role))
      setAuthLoading(false)
    }
    init()
  }, [router])

  // ── 전략 로드 ──────────────────────────────────────────────────────────────

  const loadStrategy = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("team_settings").select("value")
        .eq("key", settingsKey).maybeSingle()
      if (data?.value) {
        const parsed: StrategyData =
          typeof data.value === "string" ? JSON.parse(data.value) : data.value
        setStrategy(parsed)
        setRawContent(parsed.rawContent || "")
      }
    } catch (e) {
      console.error("product-strategy load error", e)
    } finally {
      setLoading(false)
    }
  }, [settingsKey])

  useEffect(() => {
    if (!authLoading) loadStrategy()
  }, [authLoading, loadStrategy])

  // ── AI 분석 ────────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!rawContent.trim()) { alert("상품 내용을 입력해주세요."); return }
    setAnalyzing(true)
    try {
      const res = await fetch("/api/product-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: rawContent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "AI 분석 실패")
      setStrategy({ ...data.result, rawContent, updatedAt: "", updatedBy: "" })
      setViewTab("features")
    } catch (e: any) {
      alert(e.message || "분석 중 오류가 발생했습니다.")
    } finally {
      setAnalyzing(false)
    }
  }

  // ── 저장 ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!strategy) return
    setSaving(true)
    try {
      const saveData: StrategyData = {
        ...strategy, rawContent,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.name || user?.email || "관리자",
      }
      const { error } = await supabase.from("team_settings").upsert(
        { key: settingsKey, value: JSON.stringify(saveData) },
        { onConflict: "key" }
      )
      if (error) throw error
      setStrategy(saveData)
      setEditMode(false)
      alert("✅ 저장되었습니다. 모든 설계사가 이달의 상품전략을 확인할 수 있습니다.")
    } catch (e: any) {
      alert("저장 중 오류가 발생했습니다: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── 이미지 다운로드 ────────────────────────────────────────────────────────

  const handleDownload = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 2.5, useCORS: true, allowTaint: true,
        backgroundColor: null, logging: false, width: 480, height: 480,
      })
      const link = document.createElement("a")
      link.download = `터치자료_${strategy?.productName || "상품전략"}_${month}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch (e) {
      console.error(e)
      alert("이미지 저장 중 오류가 발생했습니다.")
    } finally {
      setDownloading(false)
    }
  }

  // ── 로딩 ───────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh", background: NAVY,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
      }}>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p style={{ fontSize: 14 }}>인증 확인 중...</p>
        </div>
      </div>
    )
  }

  // ── 렌더 ───────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f0f4f8",
      fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
    }}>
      {/* ── 상단 네비게이션 바 ── */}
      <nav style={{
        background: NAVY,
        padding: "14px 24px",
        display: "flex", alignItems: "center", gap: 16,
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
      }}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            color: "rgba(255,255,255,0.65)", fontSize: 13,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, padding: "6px 14px",
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.15s",
          }}
        >
          ← 대시보드
        </button>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, color: GOLD, letterSpacing: "0.15em", fontWeight: 700, margin: 0 }}>
            MONTHLY PRODUCT STRATEGY
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "white", margin: 0 }}>
              이달의 상품전략
            </h1>
            <span style={{
              background: "rgba(201,169,110,0.2)", color: GOLD,
              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
            }}>{month}</span>
          </div>
        </div>

        {isEditor && strategy && !editMode && (
          <button
            onClick={() => setEditMode(true)}
            style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: "rgba(201,169,110,0.18)", color: GOLD,
              border: "1px solid rgba(201,169,110,0.35)", cursor: "pointer",
              fontFamily: "inherit",
            }}
          >✏️ 편집</button>
        )}
      </nav>

      {/* ── 본문 ── */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px 60px" }}>
        {loading ? (
          <LoadingBlock />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── 편집자 입력 섹션 ── */}
            {isEditor && (editMode || !strategy) && (
              <div style={{
                background: "white", borderRadius: 16,
                border: "1px solid #e4edf5", padding: 24,
                boxShadow: "0 2px 12px rgba(26,39,68,0.06)",
              }}>
                <p style={{
                  fontSize: 13, fontWeight: 700, color: NAVY,
                  marginBottom: 14, paddingLeft: 12, borderLeft: `3px solid ${GOLD}`,
                }}>
                  상품 내용 입력
                  <span style={{ fontSize: 11, color: "#9ab4c8", fontWeight: 400, marginLeft: 8 }}>
                    전단·리플렛 내용을 붙여넣으세요
                  </span>
                </p>
                <textarea
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  placeholder={"이달의 주력 상품 내용, 전단 문구, 특약, 보장 내역 등을 자유롭게 입력하세요.\n\n예시:\n[삼성생명 암보험 플러스]\n- 암 진단시 5,000만원 지급\n- 5대 암(위암·대장암·폐암·간암·유방암) 최대 2배 지급\n- 보험료 30세 기준 월 35,000원..."}
                  style={{
                    width: "100%", minHeight: 180, padding: "14px 16px",
                    border: "1px solid #d4e0eb", borderRadius: 10, background: "#fafcff",
                    fontSize: 13, color: NAVY, resize: "vertical",
                    fontFamily: "inherit", lineHeight: 1.8, outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  {strategy && (
                    <button
                      onClick={() => { setEditMode(false); setRawContent(strategy.rawContent || "") }}
                      style={{
                        padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: "#f0f4f8", color: "#5a7a92",
                        border: "1px solid #d4e0eb", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >취소</button>
                  )}
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing || !rawContent.trim()}
                    style={{
                      padding: "9px 26px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: analyzing ? "#9ab4c8" : NAVY, color: "white",
                      border: "none", cursor: analyzing ? "wait" : "pointer", fontFamily: "inherit",
                    }}
                  >
                    {analyzing ? "🤖 AI 분석 중..." : "🤖 AI 분석 실행"}
                  </button>
                  {strategy && (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        padding: "9px 26px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: saving ? "#9ab4c8" : GOLD, color: "white",
                        border: "none", cursor: saving ? "wait" : "pointer", fontFamily: "inherit",
                      }}
                    >
                      {saving ? "저장 중..." : "💾 전체 공개 저장"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── 결과 섹션 ── */}
            {strategy ? (
              <>
                {/* 상품 헤더 카드 */}
                <div style={{
                  background: "white", borderRadius: 16, padding: "18px 22px",
                  border: "1px solid #e4edf5",
                  boxShadow: "0 2px 12px rgba(26,39,68,0.06)",
                  display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                }}>
                  <span style={{
                    background: strategy.categoryColor || "#374151", color: "white",
                    fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 100,
                  }}>{strategy.category}</span>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: NAVY, margin: 0 }}>
                    {strategy.productName}
                  </h2>
                  {strategy.updatedAt && (
                    <span style={{ fontSize: 11, color: "#9ab4c8", marginLeft: "auto" }}>
                      {strategy.updatedBy} · {new Date(strategy.updatedAt).toLocaleDateString("ko-KR")} 등록
                    </span>
                  )}
                </div>

                {/* 탭 네비게이션 */}
                <div style={{
                  background: "white", borderRadius: 14, padding: 4,
                  border: "1px solid #e4edf5",
                  display: "flex", gap: 2, flexWrap: "wrap",
                }}>
                  {([
                    { id: "features", label: "✨ 특장점" },
                    { id: "concept", label: "💡 컨셉" },
                    { id: "speech", label: "🗣️ 화법" },
                    { id: "touch", label: "📱 터치자료" },
                  ] as { id: ViewTab; label: string }[]).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setViewTab(tab.id)}
                      style={{
                        flex: 1, minWidth: 90, padding: "10px 14px", borderRadius: 10,
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                        border: "none", fontFamily: "inherit", whiteSpace: "nowrap",
                        background: viewTab === tab.id ? NAVY : "transparent",
                        color: viewTab === tab.id ? "white" : "#7a9ab2",
                        transition: "all 0.15s",
                      }}
                    >{tab.label}</button>
                  ))}
                </div>

                {/* ── 탭: 특장점 ── */}
                {viewTab === "features" && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 16,
                  }}>
                    {strategy.features.map((f, i) => (
                      <div key={i} style={{
                        background: "white", borderRadius: 16,
                        border: "1px solid #e4edf5", padding: "24px 22px",
                        boxShadow: "0 2px 12px rgba(26,39,68,0.06)",
                      }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: 16,
                          background: `${strategy.categoryColor}15`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 26, marginBottom: 16,
                        }}>{f.icon}</div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 8 }}>{f.title}</p>
                        <p style={{ fontSize: 13, color: "#5a7a92", lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── 탭: 컨셉 ── */}
                {viewTab === "concept" && (
                  <div style={{
                    background: NAVY, borderRadius: 16, padding: "32px 36px",
                    boxShadow: "0 4px 24px rgba(26,39,68,0.2)",
                  }}>
                    <p style={{
                      fontSize: 10, color: GOLD, letterSpacing: "0.15em",
                      fontWeight: 700, marginBottom: 20,
                    }}>PRODUCT CONCEPT</p>
                    <p style={{
                      fontSize: 17, color: "rgba(255,255,255,0.92)",
                      lineHeight: 2, fontWeight: 400, margin: 0,
                    }}>{strategy.concept}</p>
                  </div>
                )}

                {/* ── 탭: 화법 ── */}
                {viewTab === "speech" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {([
                      { label: "오프닝", color: "#2563eb", bg: "#eff6ff", content: strategy.speech.opening, tip: "첫 통화·첫 만남" },
                      { label: "본론", color: "#059669", bg: "#f0fdf4", content: strategy.speech.core, tip: "핵심 가치 전달" },
                      { label: "클로징", color: "#b45309", bg: "#fffbeb", content: strategy.speech.closing, tip: "계약 결심 유도" },
                    ]).map((item) => (
                      <div key={item.label} style={{
                        background: item.bg, borderRadius: 16,
                        border: `1px solid ${item.color}22`, padding: "22px 24px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                          <span style={{
                            background: item.color, color: "white",
                            fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100,
                          }}>{item.label}</span>
                          <span style={{ fontSize: 12, color: item.color, opacity: 0.7 }}>{item.tip}</span>
                        </div>
                        <p style={{ fontSize: 15, color: "#1a2d42", lineHeight: 1.9, margin: 0 }}>
                          {item.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── 탭: 터치자료 ── */}
                {viewTab === "touch" && (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 24,
                    padding: "10px 0",
                  }}>
                    <p style={{ fontSize: 13, color: "#9ab4c8" }}>
                      아래 이미지를 저장해서 고객 카카오톡 발송에 활용하세요
                    </p>

                    {/* 캡처 카드 */}
                    <div
                      ref={cardRef}
                      style={{
                        width: 480, height: 480, flexShrink: 0,
                        background: `linear-gradient(145deg, #0a1525 0%, ${NAVY} 55%, #1e3060 100%)`,
                        borderRadius: 22,
                        display: "flex", flexDirection: "column",
                        padding: 36, boxSizing: "border-box",
                        position: "relative", overflow: "hidden",
                        fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
                        boxShadow: "0 8px 40px rgba(26,39,68,0.4)",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: -70, right: -70, width: 240, height: 240,
                        borderRadius: "50%", background: `${GOLD}18`, pointerEvents: "none",
                      }} />
                      <div style={{
                        position: "absolute", bottom: -50, left: -50, width: 180, height: 180,
                        borderRadius: "50%", background: `${GOLD}10`, pointerEvents: "none",
                      }} />
                      <div style={{
                        position: "absolute", left: 36, top: 76, width: 32, height: 2,
                        background: GOLD, borderRadius: 1,
                      }} />

                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        marginBottom: 20,
                      }}>
                        <span style={{
                          background: strategy.categoryColor || "#374151", color: "white",
                          fontSize: 11, fontWeight: 700, padding: "5px 13px", borderRadius: 100,
                        }}>{strategy.category}</span>
                        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: "0.05em" }}>
                          {month}
                        </span>
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 4, marginTop: 8 }}>
                          <h1 style={{
                            color: GOLD_WARM, fontSize: 40, fontWeight: 900,
                            lineHeight: 1.1, margin: "0 0 8px 0", letterSpacing: "-0.02em",
                            wordBreak: "keep-all",
                          }}>{strategy.touchCard.headline}</h1>
                          <p style={{
                            color: "rgba(255,255,255,0.65)", fontSize: 13.5,
                            margin: "0 0 26px 0", letterSpacing: "0.01em",
                          }}>{strategy.touchCard.subheadline}</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                          {strategy.touchCard.points.map((pt, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                              <div style={{
                                width: 22, height: 22, borderRadius: "50%",
                                background: GOLD, color: NAVY,
                                fontSize: 10, fontWeight: 900, flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>{i + 1}</div>
                              <span style={{
                                color: "rgba(255,255,255,0.88)", fontSize: 13,
                                lineHeight: 1.4, wordBreak: "keep-all",
                              }}>{pt}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{
                        marginTop: 22, display: "flex", alignItems: "center",
                        justifyContent: "space-between",
                      }}>
                        <div style={{
                          background: GOLD, color: NAVY,
                          fontSize: 12, fontWeight: 800,
                          padding: "11px 22px", borderRadius: 100,
                          letterSpacing: "0.02em",
                        }}>{strategy.touchCard.cta}</div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{
                            color: "rgba(255,255,255,0.28)", fontSize: 9,
                            letterSpacing: "0.12em", margin: "0 0 1px 0",
                          }}>METARICH</p>
                          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 8, margin: 0 }}>
                            시그널그룹
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      style={{
                        padding: "14px 40px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                        background: downloading ? "#9ab4c8" : NAVY, color: "white",
                        border: "none", cursor: downloading ? "wait" : "pointer",
                        fontFamily: "inherit",
                        boxShadow: "0 4px 16px rgba(26,39,68,0.25)",
                      }}
                    >
                      {downloading ? "⏳ 저장 중..." : "📥 이미지 저장 (카카오 발송용)"}
                    </button>
                    <p style={{ fontSize: 12, color: "#9ab4c8", textAlign: "center" }}>
                      PNG 파일로 저장됩니다. 카카오톡 이미지 첨부 또는 MMS 발송에 최적화되어 있습니다.
                    </p>
                  </div>
                )}
              </>
            ) : !isEditor ? (
              /* 빈 상태 (일반 설계사) */
              <div style={{
                background: "white", borderRadius: 16, padding: "70px 24px",
                border: "1px solid #e4edf5", textAlign: "center",
                boxShadow: "0 2px 12px rgba(26,39,68,0.04)",
              }}>
                <div style={{ fontSize: 56, marginBottom: 18 }}>📦</div>
                <p style={{ fontSize: 17, fontWeight: 600, color: "#5a7a92", marginBottom: 10 }}>
                  이달의 상품전략이 아직 등록되지 않았습니다
                </p>
                <p style={{ fontSize: 13, color: "#9ab4c8", lineHeight: 1.8 }}>
                  마스터·본부장이 상품전략을 등록하면<br />
                  특장점·컨셉·화법·터치자료를 확인할 수 있습니다.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 로딩 블록 ────────────────────────────────────────────────────────────────

function LoadingBlock() {
  return (
    <div style={{
      background: "white", borderRadius: 16, padding: "80px 24px",
      border: "1px solid #e4edf5", textAlign: "center",
    }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>📦</div>
      <p style={{ fontSize: 14, color: "#9ab4c8", fontWeight: 500 }}>이달의 상품전략 불러오는 중...</p>
    </div>
  )
}
