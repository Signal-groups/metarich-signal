"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from "react"
import { supabase } from "../../../lib/supabase"

const NAVY = "#1A2744"
const GOLD = "#C9A96E"

type BirthdayEntry = { id: string; name: string; dayStr: string }

const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"]
const DAY_NAMES   = ["일","월","화","수","목","금","토"]

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`
}

export default function CalendarWidget({ user, canUseCrm }: { user: any; canUseCrm: boolean }) {
  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed
  const [selected,  setSelected]  = useState<string | null>(null)

  const [showBirthdays, setShowBirthdays] = useState(true)
  const [showNotes,     setShowNotes]     = useState(true)

  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([])
  const [notes, setNotes]         = useState<Record<string, string>>({})
  const [noteInput, setNoteInput] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2,"0")}`
  const uid = user?.id || ""

  // ── 생일 로드 ──────────────────────────────────────────────────────────────
  const loadBirthdays = useCallback(async () => {
    if (!canUseCrm || !uid) return
    try {
      const { data } = await supabase.from("customers").select("id, name, birth_date").not("birth_date","is",null)
      if (data) {
        const matched: BirthdayEntry[] = []
        data.forEach(c => {
          if (!c.birth_date) return
          const parts = c.birth_date.split("-")
          if (parts.length < 3) return
          const bMonth = parseInt(parts[1]) - 1
          if (bMonth !== viewMonth) return
          matched.push({
            id: c.id,
            name: c.name || "이름없음",
            dayStr: `${viewYear}-${String(viewMonth + 1).padStart(2,"0")}-${parts[2]}`,
          })
        })
        setBirthdays(matched)
      }
    } catch (e) { console.error("birthday load", e) }
  }, [canUseCrm, uid, viewMonth, viewYear])

  // ── 메모 로드 ──────────────────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    if (!uid) return
    try {
      const { data } = await supabase
        .from("team_settings")
        .select("key, value")
        .like("key", `cal_note_${uid}_${monthKey}%`)
      if (data) {
        const map: Record<string, string> = {}
        data.forEach(row => {
          const dateKey = row.key.replace(`cal_note_${uid}_`, "")
          if (row.value) map[dateKey] = row.value
        })
        setNotes(map)
      }
    } catch (e) { console.error("notes load", e) }
  }, [uid, monthKey])

  useEffect(() => { loadBirthdays() }, [loadBirthdays])
  useEffect(() => { loadNotes() },     [loadNotes])

  // 선택 날짜 변경 → 메모 입력 초기화
  useEffect(() => {
    if (selected) setNoteInput(notes[selected] || "")
  }, [selected, notes])

  // ── 메모 저장 ──────────────────────────────────────────────────────────────
  const saveNote = async () => {
    if (!uid || !selected) return
    setSavingNote(true)
    try {
      const key = `cal_note_${uid}_${selected}`
      if (noteInput.trim()) {
        await supabase.from("team_settings").upsert({ key, value: noteInput }, { onConflict: "key" })
        setNotes(prev => ({ ...prev, [selected]: noteInput }))
      } else {
        await supabase.from("team_settings").delete().eq("key", key)
        setNotes(prev => { const n = { ...prev }; delete n[selected]; return n })
      }
    } catch (e) { console.error("save note", e) }
    finally { setSavingNote(false) }
  }

  // ── 월 이동 ────────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelected(null)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelected(null)
  }

  // ── 달력 셀 구성 ─────────────────────────────────────────────────────────
  const firstDow   = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMon  = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMon; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // 날짜별 이벤트 집계
  const getDayEvents = (dayStr: string) => {
    const hasBirthday = showBirthdays && birthdays.some(b => b.dayStr === dayStr)
    const hasNote     = showNotes     && !!notes[dayStr]
    return { hasBirthday, hasNote }
  }

  const selectedBirthdays = selected ? birthdays.filter(b => b.dayStr === selected) : []
  const selectedNote      = selected ? notes[selected] : undefined

  // ── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <section style={{ borderRadius: 14, border: "1px solid #dce6f1", background: "#fff", boxShadow: "0 1px 4px rgba(26,39,68,0.04)", marginBottom: 12, overflow: "hidden", fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif" }}>
      <div style={{ display: "flex", flexWrap: "wrap", minHeight: 240 }}>

        {/* ── 캘린더 패널 (50%) ── */}
        <div style={{ flex: "1 1 50%", minWidth: 220, padding: "14px 16px", borderRight: "1px solid #eef3f8" }}>
          {/* 헤더 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ab4c8", padding: "2px 6px", lineHeight: 1, fontFamily: "inherit" }}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 900, color: NAVY }}>{viewYear}년 {MONTH_NAMES[viewMonth]}</span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ab4c8", padding: "2px 6px", lineHeight: 1, fontFamily: "inherit" }}>›</button>
          </div>

          {/* 요일 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 900, padding: "3px 0", color: i === 0 ? "#e63946" : i === 6 ? "#2563eb" : "#9ca3af" }}>{d}</div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />
              const dayStr = toDateStr(viewYear, viewMonth, day)
              const { hasBirthday, hasNote } = getDayEvents(dayStr)
              const isToday    = dayStr === todayStr
              const isSelected = dayStr === selected
              const dow = (firstDow + day - 1) % 7
              return (
                <button key={idx} onClick={() => setSelected(isSelected ? null : dayStr)}
                  style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "5px 0 4px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit", background: isSelected ? NAVY : isToday ? "#eef4fb" : "transparent", minHeight: 38 }}>
                  <span style={{ fontSize: 14, fontWeight: isToday || isSelected ? 900 : 600, color: isSelected ? "#fff" : isToday ? NAVY : dow === 0 ? "#e63946" : dow === 6 ? "#2563eb" : "#374151" }}>{day}</span>
                  {(hasBirthday || hasNote) && (
                    <div style={{ display: "flex", gap: 2, marginTop: 1 }}>
                      {hasBirthday && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "#fbbf24" : GOLD }} />}
                      {hasNote     && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "#86efac" : "#16a34a" }} />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* 토글 */}
          <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {canUseCrm && (
              <button onClick={() => setShowBirthdays(p => !p)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 100, border: `1.5px solid ${showBirthdays ? GOLD + "80" : "#e5e7eb"}`, background: showBirthdays ? GOLD + "12" : "#f9fafb", cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: showBirthdays ? GOLD : "#d1d5db" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: showBirthdays ? "#7B5B00" : "#9ca3af" }}>생일</span>
              </button>
            )}
            <button onClick={() => setShowNotes(p => !p)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 100, border: `1.5px solid ${showNotes ? "#16a34a60" : "#e5e7eb"}`, background: showNotes ? "#f0fdf4" : "#f9fafb", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: showNotes ? "#16a34a" : "#d1d5db" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: showNotes ? "#15803d" : "#9ca3af" }}>메모</span>
            </button>
          </div>
        </div>

        {/* ── 우측 패널 (50%) ── */}
        <div style={{ flex: "1 1 50%", minWidth: 200, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#c8d6e5", gap: 6, paddingTop: 8 }}>
              <span style={{ fontSize: 32 }}>📅</span>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#9ca3af", textAlign: "center", lineHeight: 1.6 }}>날짜를 클릭하면<br/>일정과 메모를 확인할 수 있어요</p>
            </div>
          ) : (
            <>
              {/* 날짜 헤더 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: NAVY }}>
                  {viewMonth + 1}월 {parseInt(selected.split("-")[2])}일
                </span>
                {selected === todayStr && (
                  <span style={{ background: NAVY, color: "#fff", fontSize: 9, fontWeight: 900, padding: "2px 8px", borderRadius: 100 }}>TODAY</span>
                )}
              </div>

              {/* 생일 이벤트 */}
              {showBirthdays && selectedBirthdays.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selectedBirthdays.map(b => (
                    <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "#fffbf0", border: `1px solid ${GOLD}50` }}>
                      <span style={{ fontSize: 16 }}>🎂</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: "#7B5B00" }}>{b.name} 고객 생일</p>
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: "#9A7B3A", fontWeight: 700 }}>생일 축하 연락을 고려해보세요</p>
                      </div>
                      {canUseCrm && (
                        <button onClick={() => window.open(`/crm/customers/${b.id}`, "_blank", "noopener,noreferrer")}
                          style={{ fontSize: 10, fontWeight: 900, color: "#7B5B00", background: GOLD + "20", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                          고객 보기 →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 저장된 메모 표시 */}
              {showNotes && selectedNote && (
                <div style={{ padding: "8px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac" }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color: "#15803d", marginBottom: 3 }}>📝 저장된 메모</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selectedNote}</p>
                </div>
              )}

              {(!showBirthdays || selectedBirthdays.length === 0) && !selectedNote && (
                <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, margin: 0 }}>이 날은 등록된 일정이 없습니다.</p>
              )}

              {/* 메모 입력 */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 10, fontWeight: 900, color: "#9ca3af" }}>📝 일정 메모 {selectedNote ? "(수정)" : "(새 메모)"}</label>
                <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                  placeholder="상담 계획, 예약 내용, 할 일을 입력하세요..."
                  style={{ flex: 1, minHeight: 64, padding: "8px 10px", borderRadius: 9, border: "1.5px solid #e5e7eb", fontSize: 12, fontWeight: 500, color: NAVY, background: "#f8fafc", outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" as const }}
                  onFocus={e => (e.target.style.borderColor = GOLD)}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                />
                <button onClick={saveNote} disabled={savingNote}
                  style={{ alignSelf: "flex-start", padding: "7px 16px", borderRadius: 8, border: "none", background: savingNote ? "#9ca3af" : NAVY, color: "#fff", fontSize: 11, fontWeight: 900, cursor: savingNote ? "wait" : "pointer", fontFamily: "inherit" }}>
                  {savingNote ? "저장 중..." : noteInput.trim() ? "메모 저장" : "메모 삭제"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
