"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "../../../lib/supabase"

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const NAVY  = "#1A2744"
const GOLD  = "#C9A96E"
const TEAL  = "#2CC9B5"
const STORAGE_KEY = "strategy_board_v1"

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type Post = {
  id: string
  title: string
  content: string
  month: string        // "YYYY-MM"
  important: boolean
  createdAt: string
  createdBy: string
  editedAt?: string
}

type Props = {
  user: any
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function toMonthLabel(ym: string): string {
  const [y, m] = ym.split("-")
  return `${y}년 ${parseInt(m)}월`
}

function monthOptions(): string[] {
  const opts: string[] = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  return opts
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function ProductStrategyBoard({ user }: Props) {
  // ── 권한 ────────────────────────────────────────────────────────────────────
  const email   = user?.email || ""
  const name    = user?.name  || "익명"
  const role    = user?.role  || "agent"
  const isAdmin =
    role === "master" ||
    role === "headquarters" ||
    email === "jinwoo8506@gmail.com" ||
    name  === "배진우"

  // ── 상태 ────────────────────────────────────────────────────────────────────
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const [posts, setPosts]             = useState<Post[]>([])
  const [loading, setLoading]         = useState(true)
  const [filterMonth, setFilterMonth] = useState(currentMonth)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [showForm, setShowForm]       = useState(false)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [search, setSearch]           = useState("")

  // 작성 폼 상태
  const [formTitle,     setFormTitle]     = useState("")
  const [formContent,   setFormContent]   = useState("")
  const [formMonth,     setFormMonth]     = useState(currentMonth)
  const [formImportant, setFormImportant] = useState(false)
  const [editingId,     setEditingId]     = useState<string | null>(null)

  const months = monthOptions()

  // ── 로드 ────────────────────────────────────────────────────────────────────

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("team_settings")
        .select("value")
        .eq("key", STORAGE_KEY)
        .maybeSingle()

      if (data?.value) {
        const parsed: Post[] = typeof data.value === "string"
          ? JSON.parse(data.value)
          : data.value
        setPosts(parsed.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      }
    } catch (e) {
      console.error("strategy board load error", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPosts() }, [loadPosts])

  // ── 저장 (전체 배열 upsert) ──────────────────────────────────────────────────

  const savePosts = async (updated: Post[]) => {
    const { error } = await supabase
      .from("team_settings")
      .upsert({ key: STORAGE_KEY, value: JSON.stringify(updated) }, { onConflict: "key" })
    if (error) throw error
    setPosts(updated.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }

  // ── 작성/수정 ────────────────────────────────────────────────────────────────

  const openNew = () => {
    setEditingId(null)
    setFormTitle("")
    setFormContent("")
    setFormMonth(filterMonth)
    setFormImportant(false)
    setShowForm(true)
  }

  const openEdit = (post: Post) => {
    setEditingId(post.id)
    setFormTitle(post.title)
    setFormContent(post.content)
    setFormMonth(post.month)
    setFormImportant(post.important)
    setSelectedPost(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      alert("제목과 내용을 입력해주세요.")
      return
    }
    setSaving(true)
    try {
      const existing = posts
      let updated: Post[]

      if (editingId) {
        updated = existing.map(p =>
          p.id === editingId
            ? { ...p, title: formTitle, content: formContent, month: formMonth, important: formImportant, editedAt: new Date().toISOString() }
            : p
        )
      } else {
        const newPost: Post = {
          id: genId(),
          title: formTitle,
          content: formContent,
          month: formMonth,
          important: formImportant,
          createdAt: new Date().toISOString(),
          createdBy: name,
        }
        updated = [newPost, ...existing]
      }

      await savePosts(updated)
      setShowForm(false)
      setEditingId(null)
    } catch (e: any) {
      alert("저장 중 오류: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── 삭제 ────────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm("이 게시물을 삭제하시겠습니까?")) return
    setDeleting(id)
    try {
      const updated = posts.filter(p => p.id !== id)
      await savePosts(updated)
      if (selectedPost?.id === id) setSelectedPost(null)
    } catch (e: any) {
      alert("삭제 중 오류: " + e.message)
    } finally {
      setDeleting(null)
    }
  }

  // ── 중요 토글 ────────────────────────────────────────────────────────────────

  const handleToggleImportant = async (post: Post) => {
    try {
      const updated = posts.map(p =>
        p.id === post.id ? { ...p, important: !p.important } : p
      )
      await savePosts(updated)
      if (selectedPost?.id === post.id)
        setSelectedPost(prev => prev ? { ...prev, important: !prev.important } : null)
    } catch (e: any) {
      alert("변경 중 오류: " + e.message)
    }
  }

  // ── 필터링 ──────────────────────────────────────────────────────────────────

  const pinnedPosts = posts.filter(p => p.important)
  const monthFiltered = posts.filter(p => {
    if (p.month !== filterMonth) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
    }
    return true
  })
  const regularPosts = monthFiltered.filter(p => !p.important)
  const pinnedInMonth = monthFiltered.filter(p => p.important)

  // ── 렌더 ─────────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif", minHeight: "100vh", background: "#F7F8FA" }}>

      {/* ── 상단 헤더 ── */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0D1B3E 100%)`, padding: "28px 32px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 220, height: 4, background: `linear-gradient(to left, ${GOLD}, transparent)` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 160, height: 3, background: `linear-gradient(to right, ${GOLD}, transparent)` }} />

        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 900, letterSpacing: "1.5px" }}>
            METARICH SIGNAL GROUP
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <h1 style={{ margin: 0, color: "#fff", fontSize: 24, fontWeight: 950, letterSpacing: "-0.5px" }}>이달의 상품전략</h1>
                <span style={{ color: GOLD, fontSize: 24, fontWeight: 950, fontStyle: "italic" }}>게시판</span>
              </div>
              <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700 }}>
                📌 중요글은 공지로 상단 고정 · 월별 아카이브 조회 가능
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={openNew}
                style={{ padding: "10px 22px", borderRadius: 12, border: "none", background: GOLD, color: NAVY, fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}
              >
                ✏️ 새 게시물 작성
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>

        {/* ── 중요 공지 배너 (전체 중요글, 월 관계없이) ── */}
        {pinnedPosts.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {pinnedPosts.map(post => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                style={{ cursor: "pointer", background: `linear-gradient(135deg, ${GOLD}22, #fff7e6)`, border: `2px solid ${GOLD}`, borderRadius: 16, padding: "16px 20px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, transition: "transform 0.15s", boxShadow: `0 4px 20px ${GOLD}20` }}
                onMouseOver={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseOut={e => (e.currentTarget.style.transform = "none")}
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 18 }}>📌</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ background: GOLD, color: NAVY, fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 100 }}>공지</span>
                    <span style={{ fontSize: 11, color: "#9A7B3A", fontWeight: 700 }}>{toMonthLabel(post.month)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {isAdmin && (
                    <>
                      <button onClick={e => { e.stopPropagation(); handleToggleImportant(post) }} style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${GOLD}60`, background: "rgba(201,169,78,0.15)", color: "#9A7B3A", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>📌 해제</button>
                      <button onClick={e => { e.stopPropagation(); openEdit(post) }} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #d4e0eb", background: "#fff", color: NAVY, fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>수정</button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(post.id) }} disabled={deleting === post.id} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>삭제</button>
                    </>
                  )}
                  <span style={{ fontSize: 18, color: "#ccc" }}>›</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 필터 바 ── */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E8ECF0", padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: NAVY }}>📅 조회 월</span>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              style={{ padding: "7px 12px", borderRadius: 10, border: "1.5px solid #E8ECF0", fontSize: 13, fontWeight: 700, color: NAVY, background: "#fff", cursor: "pointer", outline: "none", fontFamily: "inherit" }}
            >
              {months.map(m => (
                <option key={m} value={m}>{toMonthLabel(m)}{m === currentMonth ? " (이번달)" : ""}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160, position: "relative" }}>
            <input
              type="text"
              placeholder="제목·내용 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "7px 12px 7px 34px", borderRadius: 10, border: "1.5px solid #E8ECF0", fontSize: 13, fontWeight: 700, color: NAVY, background: "#F7F8FA", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
            />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#9CA3AF" }}>🔍</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", flexShrink: 0 }}>
            {toMonthLabel(filterMonth)} · 총 {monthFiltered.length}건
          </span>
        </div>

        {/* ── 게시글 목록 ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ fontSize: 14, fontWeight: 700 }}>불러오는 중...</p>
          </div>
        ) : monthFiltered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: 20, border: "1px solid #E8ECF0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📦</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
              {toMonthLabel(filterMonth)} 게시물이 없습니다
            </p>
            <p style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 1.7 }}>
              {isAdmin ? "새 게시물 작성 버튼으로 등록해주세요." : "관리자가 게시물을 등록하면 이곳에서 확인할 수 있습니다."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* 이달 중요글 */}
            {pinnedInMonth.map((post, idx) => (
              <PostRow key={post.id} post={post} idx={idx} isAdmin={isAdmin} deleting={deleting} onSelect={setSelectedPost} onEdit={openEdit} onDelete={handleDelete} onToggleImportant={handleToggleImportant} pinned />
            ))}

            {/* 구분선 */}
            {pinnedInMonth.length > 0 && regularPosts.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0" }}>
                <div style={{ flex: 1, height: 1, background: "#E8ECF0" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF" }}>일반 게시물</span>
                <div style={{ flex: 1, height: 1, background: "#E8ECF0" }} />
              </div>
            )}

            {/* 일반 게시글 */}
            {regularPosts.map((post, idx) => (
              <PostRow key={post.id} post={post} idx={idx} isAdmin={isAdmin} deleting={deleting} onSelect={setSelectedPost} onEdit={openEdit} onDelete={handleDelete} onToggleImportant={handleToggleImportant} />
            ))}
          </div>
        )}
      </div>

      {/* ── 게시물 상세 모달 ── */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isAdmin={isAdmin}
          deleting={deleting}
          onClose={() => setSelectedPost(null)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onToggleImportant={handleToggleImportant}
        />
      )}

      {/* ── 작성/수정 폼 모달 ── */}
      {showForm && isAdmin && (
        <WriteFormModal
          editingId={editingId}
          formTitle={formTitle} setFormTitle={setFormTitle}
          formContent={formContent} setFormContent={setFormContent}
          formMonth={formMonth} setFormMonth={setFormMonth}
          formImportant={formImportant} setFormImportant={setFormImportant}
          saving={saving}
          months={months}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingId(null) }}
        />
      )}
    </div>
  )
}

// ─── 게시물 행 ────────────────────────────────────────────────────────────────

function PostRow({
  post, idx, isAdmin, deleting, onSelect, onEdit, onDelete, onToggleImportant, pinned = false,
}: {
  post: Post; idx: number; isAdmin: boolean; deleting: string | null
  onSelect: (p: Post) => void; onEdit: (p: Post) => void
  onDelete: (id: string) => void; onToggleImportant: (p: Post) => void
  pinned?: boolean
}) {
  const [hover, setHover] = useState(false)
  const dateStr = new Date(post.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })

  return (
    <div
      onClick={() => onSelect(post)}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      style={{
        background: hover ? (pinned ? "#FFFBF0" : "#FAFBFF") : "#fff",
        borderRadius: 14, border: pinned ? `1.5px solid ${GOLD}60` : "1px solid #E8ECF0",
        padding: "16px 20px", cursor: "pointer", transition: "all 0.15s",
        display: "flex", alignItems: "center", gap: 16,
        boxShadow: hover ? "0 4px 20px rgba(26,39,68,0.08)" : "0 1px 4px rgba(26,39,68,0.04)",
      }}
    >
      {/* 번호/핀 */}
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: pinned ? GOLD : "#EEF2FB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {pinned
          ? <span style={{ fontSize: 16 }}>📌</span>
          : <span style={{ fontSize: 12, fontWeight: 900, color: NAVY }}>{idx + 1}</span>
        }
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {pinned && <span style={{ background: GOLD, color: NAVY, fontSize: 10, fontWeight: 900, padding: "2px 7px", borderRadius: 100 }}>중요</span>}
          <span style={{ fontSize: 14, fontWeight: 900, color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {post.content.slice(0, 80)}{post.content.length > 80 ? "..." : ""}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF" }}>✍️ {post.createdBy}</span>
          <span style={{ fontSize: 11, color: "#D1D5DB" }}>·</span>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>{dateStr}</span>
          {post.editedAt && <span style={{ fontSize: 10, color: "#D1D5DB" }}>(수정됨)</span>}
        </div>
      </div>

      {/* 관리 버튼 */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        {isAdmin && (
          <>
            <button
              onClick={() => onToggleImportant(post)}
              title={post.important ? "공지 해제" : "공지로 설정"}
              style={{ padding: "5px 8px", borderRadius: 8, border: `1px solid ${post.important ? GOLD + "60" : "#E8ECF0"}`, background: post.important ? "#FFFBF0" : "#F9FAFB", color: post.important ? "#9A7B3A" : "#9CA3AF", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
            >
              {post.important ? "📌" : "📎"}
            </button>
            <button
              onClick={() => onEdit(post)}
              style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #E8ECF0", background: "#F9FAFB", color: NAVY, fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
            >수정</button>
            <button
              onClick={() => onDelete(post.id)}
              disabled={deleting === post.id}
              style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
            >{deleting === post.id ? "…" : "삭제"}</button>
          </>
        )}
        <span style={{ fontSize: 18, color: "#D1D5DB", display: "flex", alignItems: "center" }}>›</span>
      </div>
    </div>
  )
}

// ─── 상세 보기 모달 ───────────────────────────────────────────────────────────

function PostDetailModal({
  post, isAdmin, deleting, onClose, onEdit, onDelete, onToggleImportant,
}: {
  post: Post; isAdmin: boolean; deleting: string | null
  onClose: () => void; onEdit: (p: Post) => void
  onDelete: (id: string) => void; onToggleImportant: (p: Post) => void
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(10,16,32,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif" }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 680, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}
        onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div style={{ background: NAVY, padding: "20px 26px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              {post.important && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ background: GOLD, color: NAVY, fontSize: 10, fontWeight: 900, padding: "3px 10px", borderRadius: 100 }}>📌 중요 공지</span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{toMonthLabel(post.month)}</span>
                </div>
              )}
              <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 900, lineHeight: 1.4, wordBreak: "keep-all" }}>{post.title}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>✍️ {post.createdBy}</span>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  {new Date(post.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                </span>
                {post.editedAt && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>(수정됨)</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ color: "rgba(255,255,255,0.5)", fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: "4px 8px", lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px 26px" }}>
          <div style={{ fontSize: 15, color: "#374151", lineHeight: 1.9, whiteSpace: "pre-wrap", wordBreak: "keep-all" }}>
            {post.content}
          </div>
        </div>

        {/* 하단 버튼 */}
        {isAdmin && (
          <div style={{ padding: "16px 26px", borderTop: "1px solid #F0F4F8", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={() => onToggleImportant(post)}
              style={{ padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${post.important ? GOLD + "60" : "#E8ECF0"}`, background: post.important ? "#FFFBF0" : "#F9FAFB", color: post.important ? "#9A7B3A" : "#6B7280", fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
            >
              {post.important ? "📌 공지 해제" : "📌 공지로 설정"}
            </button>
            <button
              onClick={() => onEdit(post)}
              style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid #E8ECF0", background: "#F9FAFB", color: NAVY, fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
            >✏️ 수정</button>
            <button
              onClick={() => { onDelete(post.id); onClose() }}
              disabled={deleting === post.id}
              style={{ padding: "9px 18px", borderRadius: 10, border: "1px solid #fca5a5", background: "#fff5f5", color: "#dc2626", fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
            >{deleting === post.id ? "삭제 중..." : "🗑️ 삭제"}</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 작성/수정 폼 모달 ───────────────────────────────────────────────────────

function WriteFormModal({
  editingId, formTitle, setFormTitle, formContent, setFormContent,
  formMonth, setFormMonth, formImportant, setFormImportant,
  saving, months, onSave, onClose,
}: {
  editingId: string | null
  formTitle: string; setFormTitle: (v: string) => void
  formContent: string; setFormContent: (v: string) => void
  formMonth: string; setFormMonth: (v: string) => void
  formImportant: boolean; setFormImportant: (v: boolean) => void
  saving: boolean; months: string[]
  onSave: () => void; onClose: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { textareaRef.current?.focus() }, [])

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(10,16,32,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif" }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 680, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.45)" }}
        onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div style={{ background: NAVY, padding: "18px 26px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, color: GOLD, fontSize: 10, fontWeight: 900, letterSpacing: "0.12em" }}>PRODUCT STRATEGY BOARD</p>
            <h3 style={{ margin: "4px 0 0", color: "#fff", fontSize: 18, fontWeight: 900 }}>
              {editingId ? "게시물 수정" : "새 게시물 작성"}
            </h3>
          </div>
          <button onClick={onClose} style={{ color: "rgba(255,255,255,0.5)", fontSize: 22, background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>✕</button>
        </div>

        {/* 폼 */}
        <div style={{ flex: 1, overflow: "auto", padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* 대상 월 + 중요 체크 */}
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: 11, fontWeight: 900, color: "#9CA3AF", display: "block", marginBottom: 6 }}>📅 대상 월</label>
              <select
                value={formMonth}
                onChange={e => setFormMonth(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1.5px solid #E8ECF0", fontSize: 13, fontWeight: 700, color: NAVY, background: "#F7F8FA", outline: "none", fontFamily: "inherit", cursor: "pointer" }}
              >
                {months.slice(0, 12).map(m => (
                  <option key={m} value={m}>{toMonthLabel(m)}</option>
                ))}
              </select>
            </div>

            {/* 중요 토글 */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 900, color: "#9CA3AF", display: "block", marginBottom: 6 }}>📌 공지 설정</label>
              <button
                type="button"
                onClick={() => setFormImportant(!formImportant)}
                style={{ padding: "10px 20px", borderRadius: 12, border: `2px solid ${formImportant ? GOLD : "#E8ECF0"}`, background: formImportant ? `${GOLD}18` : "#F7F8FA", color: formImportant ? "#7B5B00" : "#9CA3AF", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, transition: "all 0.18s" }}
              >
                <span style={{ fontSize: 18 }}>{formImportant ? "📌" : "📎"}</span>
                {formImportant ? "중요 공지 설정됨" : "일반 게시물"}
              </button>
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 900, color: "#9CA3AF", display: "block", marginBottom: 6 }}>✏️ 제목 *</label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="이달의 주력 상품 또는 전략 제목을 입력하세요"
              style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1.5px solid #E8ECF0", fontSize: 15, fontWeight: 700, color: NAVY, background: "#F7F8FA", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const, transition: "border 0.15s" }}
              onFocus={e => (e.target.style.borderColor = GOLD)}
              onBlur={e => (e.target.style.borderColor = "#E8ECF0")}
            />
          </div>

          {/* 내용 */}
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 900, color: "#9CA3AF", display: "block", marginBottom: 6 }}>📝 내용 *</label>
            <textarea
              ref={textareaRef}
              value={formContent}
              onChange={e => setFormContent(e.target.value)}
              placeholder={"이달 주력 상품의 특징, 핵심 보장 내용, 화법, 영업 포인트 등을 자유롭게 입력하세요.\n\n예시)\n[삼성생명 암보험 플러스]\n• 암 진단 시 5,000만원 지급\n• 5대 암 최대 2배 지급\n• 핵심 화법: 가족을 위한 든든한 안전망..."}
              style={{ width: "100%", minHeight: 220, padding: "14px 16px", borderRadius: 12, border: "1.5px solid #E8ECF0", fontSize: 13, fontWeight: 500, color: NAVY, background: "#F7F8FA", outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.8, boxSizing: "border-box" as const }}
              onFocus={e => (e.target.style.borderColor = GOLD)}
              onBlur={e => (e.target.style.borderColor = "#E8ECF0")}
            />
          </div>

          {/* 안내 */}
          {formImportant && (
            <div style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}40`, borderRadius: 12, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18 }}>📌</span>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#7B5B00", lineHeight: 1.7 }}>
                중요 공지로 설정하면 <strong>모든 직원의 게시판 상단에 공지로 고정</strong>됩니다. 월별 필터와 무관하게 항상 노출됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div style={{ padding: "16px 26px", borderTop: "1px solid #F0F4F8", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "11px 22px", borderRadius: 12, border: "1.5px solid #E8ECF0", background: "#F7F8FA", color: "#6B7280", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
          >취소</button>
          <button
            onClick={onSave}
            disabled={saving}
            style={{ padding: "11px 28px", borderRadius: 12, border: "none", background: saving ? "#9CA3AF" : GOLD, color: NAVY, fontSize: 13, fontWeight: 900, cursor: saving ? "wait" : "pointer", fontFamily: "inherit" }}
          >{saving ? "저장 중..." : editingId ? "💾 수정 저장" : "✅ 게시물 등록"}</button>
        </div>
      </div>
    </div>
  )
}
