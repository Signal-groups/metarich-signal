"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from "react"
import { supabase } from "../../../lib/supabase"

const NAVY = "#1A2744"
const GOLD = "#C9A96E"

type BirthdayEntry = { id: string; name: string; dayStr: string }
type RepeatType = 'once' | 'yearly' | 'weekly'
type ScheduleEntry = {
  id: string
  text: string
  repeat: RepeatType
  mmdd?: string   // "MM-DD" — 매년 반복용
  dow?: number    // 0-6 (일~토) — 매주 반복용
  createdAt: string
}

const DOW_LABELS = ["일","월","화","수","목","금","토"]
const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"]
const DAY_NAMES   = ["일","월","화","수","목","금","토"]

// ── 공휴일 데이터 (고정 + 연도별) ───────────────────────────────────────────
type HolidayInfo = { name: string; type: 'holiday' | 'substitute' }

const FIXED_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month:  1, day:  1, name: '신정'    },
  { month:  3, day:  1, name: '삼일절'  },
  { month:  5, day:  5, name: '어린이날'},
  { month:  6, day:  6, name: '현충일'  },
  { month:  8, day: 15, name: '광복절'  },
  { month: 10, day:  3, name: '개천절'  },
  { month: 10, day:  9, name: '한글날'  },
  { month: 12, day: 25, name: '성탄절'  },
]

const YEAR_HOLIDAYS: Record<string, HolidayInfo> = {
  // 2024
  '2024-02-09': { name: '설 전날',       type: 'holiday'    },
  '2024-02-10': { name: '설날',           type: 'holiday'    },
  '2024-02-11': { name: '설 다음날',     type: 'holiday'    },
  '2024-02-12': { name: '대체공휴일',    type: 'substitute' },
  '2024-05-15': { name: '부처님오신날',  type: 'holiday'    },
  '2024-09-16': { name: '추석 전날',     type: 'holiday'    },
  '2024-09-17': { name: '추석',           type: 'holiday'    },
  '2024-09-18': { name: '추석 다음날',   type: 'holiday'    },
  // 2025
  '2025-01-28': { name: '설 전날',       type: 'holiday'    },
  '2025-01-29': { name: '설날',           type: 'holiday'    },
  '2025-01-30': { name: '설 다음날',     type: 'holiday'    },
  '2025-03-03': { name: '대체공휴일',    type: 'substitute' },
  '2025-05-06': { name: '대체공휴일',    type: 'substitute' },
  '2025-10-05': { name: '추석 전날',     type: 'holiday'    },
  '2025-10-06': { name: '추석',           type: 'holiday'    },
  '2025-10-07': { name: '추석 다음날',   type: 'holiday'    },
  '2025-10-08': { name: '대체공휴일',    type: 'substitute' },
  // 2026
  '2026-02-16': { name: '설 전날',       type: 'holiday'    },
  '2026-02-17': { name: '설날',           type: 'holiday'    },
  '2026-02-18': { name: '설 다음날',     type: 'holiday'    },
  '2026-03-02': { name: '대체공휴일',    type: 'substitute' },
  '2026-05-24': { name: '부처님오신날',  type: 'holiday'    },
  '2026-08-17': { name: '대체공휴일',    type: 'substitute' },
  '2026-09-24': { name: '추석 전날',     type: 'holiday'    },
  '2026-09-25': { name: '추석',           type: 'holiday'    },
  '2026-09-26': { name: '추석 다음날',   type: 'holiday'    },
  // 2027
  '2027-02-06': { name: '설 전날',       type: 'holiday'    },
  '2027-02-07': { name: '설날',           type: 'holiday'    },
  '2027-02-08': { name: '설 다음날',     type: 'holiday'    },
  '2027-05-13': { name: '부처님오신날',  type: 'holiday'    },
  '2027-09-29': { name: '추석 전날',     type: 'holiday'    },
  '2027-09-30': { name: '추석',           type: 'holiday'    },
  '2027-10-01': { name: '추석 다음날',   type: 'holiday'    },
}

function getHolidayInfo(dayStr: string, month1: number, day: number): HolidayInfo | null {
  if (YEAR_HOLIDAYS[dayStr]) return YEAR_HOLIDAYS[dayStr]
  const f = FIXED_HOLIDAYS.find(h => h.month === month1 && h.day === day)
  return f ? { name: f.name, type: 'holiday' } : null
}

// ── 절기 데이터 ────────────────────────────────────────────────────────────────
const SOLAR_TERMS: Record<string, string> = {
  // 2024
  '2024-01-06': '소한', '2024-01-20': '대한',
  '2024-02-04': '입춘', '2024-02-19': '우수',
  '2024-03-05': '경칩', '2024-03-20': '춘분',
  '2024-04-04': '청명', '2024-04-19': '곡우',
  '2024-05-05': '입하', '2024-05-20': '소만',
  '2024-06-05': '망종', '2024-06-21': '하지',
  '2024-07-06': '소서', '2024-07-22': '대서',
  '2024-08-07': '입추', '2024-08-22': '처서',
  '2024-09-07': '백로', '2024-09-22': '추분',
  '2024-10-08': '한로', '2024-10-23': '상강',
  '2024-11-07': '입동', '2024-11-22': '소설',
  '2024-12-07': '대설', '2024-12-21': '동지',
  // 2025
  '2025-01-05': '소한', '2025-01-20': '대한',
  '2025-02-03': '입춘', '2025-02-18': '우수',
  '2025-03-05': '경칩', '2025-03-20': '춘분',
  '2025-04-04': '청명', '2025-04-20': '곡우',
  '2025-05-05': '입하', '2025-05-21': '소만',
  '2025-06-05': '망종', '2025-06-21': '하지',
  '2025-07-07': '소서', '2025-07-22': '대서',
  '2025-08-07': '입추', '2025-08-23': '처서',
  '2025-09-07': '백로', '2025-09-23': '추분',
  '2025-10-08': '한로', '2025-10-23': '상강',
  '2025-11-07': '입동', '2025-11-22': '소설',
  '2025-12-07': '대설', '2025-12-22': '동지',
  // 2026
  '2026-01-05': '소한', '2026-01-20': '대한',
  '2026-02-04': '입춘', '2026-02-19': '우수',
  '2026-03-06': '경칩', '2026-03-21': '춘분',
  '2026-04-05': '청명', '2026-04-20': '곡우',
  '2026-05-06': '입하', '2026-05-21': '소만',
  '2026-06-06': '망종', '2026-06-21': '하지',
  '2026-07-07': '소서', '2026-07-23': '대서',
  '2026-08-07': '입추', '2026-08-23': '처서',
  '2026-09-08': '백로', '2026-09-23': '추분',
  '2026-10-08': '한로', '2026-10-23': '상강',
  '2026-11-07': '입동', '2026-11-22': '소설',
  '2026-12-07': '대설', '2026-12-22': '동지',
  // 2027
  '2027-01-05': '소한', '2027-01-20': '대한',
  '2027-02-04': '입춘', '2027-02-19': '우수',
  '2027-03-06': '경칩', '2027-03-21': '춘분',
  '2027-04-05': '청명', '2027-04-20': '곡우',
  '2027-05-06': '입하', '2027-05-21': '소만',
  '2027-06-06': '망종', '2027-06-21': '하지',
  '2027-07-07': '소서', '2027-07-23': '대서',
  '2027-08-07': '입추', '2027-08-23': '처서',
  '2027-09-08': '백로', '2027-09-23': '추분',
  '2027-10-08': '한로', '2027-10-23': '상강',
  '2027-11-07': '입동', '2027-11-22': '소설',
  '2027-12-07': '대설', '2027-12-22': '동지',
}

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
  const [showSolar,     setShowSolar]     = useState(true)

  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([])
  const [notes, setNotes]         = useState<Record<string, string>>({})
  const [noteInput, setNoteInput] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  // ── 반복 일정 ──────────────────────────────────────────────────────────────
  const [yearlyEvents, setYearlyEvents] = useState<ScheduleEntry[]>([])
  const [weeklyEvents, setWeeklyEvents] = useState<ScheduleEntry[]>([])
  const [schedText, setSchedText] = useState("")
  const [schedRepeat, setSchedRepeat] = useState<RepeatType>('once')
  const [savingSched, setSavingSched] = useState(false)

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

  // ── 반복 일정 로드 ─────────────────────────────────────────────────────────
  const loadRecurring = useCallback(async () => {
    if (!uid) return
    try {
      const { data } = await supabase.from("team_settings").select("key,value")
        .in("key", [`cal_rec_yearly_${uid}`, `cal_rec_weekly_${uid}`])
      data?.forEach(row => {
        try {
          const arr = JSON.parse(row.value || "[]")
          if (row.key.includes("yearly")) setYearlyEvents(arr)
          else setWeeklyEvents(arr)
        } catch { /* ignore */ }
      })
    } catch (e) { console.error("recurring load", e) }
  }, [uid])

  useEffect(() => { loadBirthdays() }, [loadBirthdays])
  useEffect(() => { loadNotes() },     [loadNotes])
  useEffect(() => { loadRecurring() }, [loadRecurring])

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

  // ── 반복 일정 저장 ─────────────────────────────────────────────────────────
  const saveSchedule = async () => {
    if (!uid || !selected || !schedText.trim()) return
    setSavingSched(true)
    try {
      if (schedRepeat === 'once') {
        // 단일 메모 — 기존 시스템과 동일
        const key = `cal_note_${uid}_${selected}`
        await supabase.from("team_settings").upsert({ key, value: schedText }, { onConflict: "key" })
        setNotes(prev => ({ ...prev, [selected]: schedText }))
      } else if (schedRepeat === 'yearly') {
        const mmdd = selected.slice(5)  // "MM-DD"
        const entry: ScheduleEntry = { id: crypto.randomUUID(), text: schedText, repeat: 'yearly', mmdd, createdAt: selected }
        const updated = [...yearlyEvents, entry]
        await supabase.from("team_settings").upsert({ key: `cal_rec_yearly_${uid}`, value: JSON.stringify(updated) }, { onConflict: "key" })
        setYearlyEvents(updated)
      } else {
        const dow = new Date(selected + "T00:00:00").getDay()
        const entry: ScheduleEntry = { id: crypto.randomUUID(), text: schedText, repeat: 'weekly', dow, createdAt: selected }
        const updated = [...weeklyEvents, entry]
        await supabase.from("team_settings").upsert({ key: `cal_rec_weekly_${uid}`, value: JSON.stringify(updated) }, { onConflict: "key" })
        setWeeklyEvents(updated)
      }
      setSchedText("")
    } catch (e) { console.error("save schedule", e) }
    finally { setSavingSched(false) }
  }

  const deleteRecurEvent = async (id: string, type: 'yearly' | 'weekly') => {
    if (!uid) return
    try {
      if (type === 'yearly') {
        const updated = yearlyEvents.filter(e => e.id !== id)
        await supabase.from("team_settings").upsert({ key: `cal_rec_yearly_${uid}`, value: JSON.stringify(updated) }, { onConflict: "key" })
        setYearlyEvents(updated)
      } else {
        const updated = weeklyEvents.filter(e => e.id !== id)
        await supabase.from("team_settings").upsert({ key: `cal_rec_weekly_${uid}`, value: JSON.stringify(updated) }, { onConflict: "key" })
        setWeeklyEvents(updated)
      }
    } catch (e) { console.error("delete recurring", e) }
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
    const mmdd = dayStr.slice(5)                              // "MM-DD"
    const dow  = new Date(dayStr + "T00:00:00").getDay()     // 0-6
    const hasYearly = yearlyEvents.some(e => e.mmdd === mmdd)
    const hasWeekly = weeklyEvents.some(e => e.dow === dow)
    return { hasBirthday, hasNote, hasYearly, hasWeekly }
  }

  const selectedBirthdays = selected ? birthdays.filter(b => b.dayStr === selected) : []
  const selectedNote      = selected ? notes[selected] : undefined

  // ── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <section style={{ borderRadius: 14, border: "1px solid #dce6f1", background: "#fff", boxShadow: "0 1px 4px rgba(26,39,68,0.04)", overflow: "hidden", fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif", flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flexWrap: "wrap", flex: 1 }}>

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
              const dayStr  = toDateStr(viewYear, viewMonth, day)
              const month1  = viewMonth + 1
              const holiday = getHolidayInfo(dayStr, month1, day)
              const solar   = showSolar ? (SOLAR_TERMS[dayStr] ?? null) : null
              const { hasBirthday, hasNote, hasYearly, hasWeekly } = getDayEvents(dayStr)
              const isToday    = dayStr === todayStr
              const isSelected = dayStr === selected
              const dow = (firstDow + day - 1) % 7
              const isHoliday  = !!holiday && holiday.type === 'holiday'
              const isSubstitute = !!holiday && holiday.type === 'substitute'
              // 배경색 결정
              const cellBg = isSelected ? NAVY
                : isHoliday ? "#fff0f0"
                : isSubstitute ? "#fff6ed"
                : isToday ? "#eef4fb"
                : "transparent"
              // 날짜 글자색
              const numColor = isSelected ? "#fff"
                : isHoliday || isSubstitute ? "#e63946"
                : isToday ? NAVY
                : dow === 0 ? "#e63946"
                : dow === 6 ? "#2563eb"
                : "#374151"
              return (
                <button key={idx} onClick={() => setSelected(isSelected ? null : dayStr)}
                  style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "4px 0 3px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit", background: cellBg, minHeight: 46 }}>
                  <span style={{ fontSize: 14, fontWeight: isToday || isSelected || isHoliday || isSubstitute ? 900 : 600, color: numColor, lineHeight: 1 }}>{day}</span>
                  {solar && (
                    <span style={{ fontSize: 8, fontWeight: 800, color: isSelected ? "#86efac" : "#0891b2", lineHeight: 1.2, marginTop: 2 }}>{solar}</span>
                  )}
                  {holiday && (
                    <span style={{ fontSize: 7, fontWeight: 700, color: isSelected ? "rgba(255,255,255,0.7)" : isSubstitute ? "#d97706" : "#e63946", lineHeight: 1.2, marginTop: solar ? 1 : 2, textAlign: "center", maxWidth: "100%", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {holiday.name.length > 3 ? holiday.name.slice(0, 3) : holiday.name}
                    </span>
                  )}
                  {(hasBirthday || hasNote || hasYearly || hasWeekly) && (
                    <div style={{ display: "flex", gap: 2, marginTop: 2, flexWrap: "wrap", justifyContent: "center" }}>
                      {hasBirthday && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "#fbbf24" : GOLD }} />}
                      {hasNote     && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "#86efac" : "#16a34a" }} />}
                      {hasYearly   && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "#fca5a5" : "#dc2626" }} />}
                      {hasWeekly   && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "#93c5fd" : "#2563eb" }} />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* 토글 */}
          <div style={{ marginTop: 10, display: "flex", gap: 5, flexWrap: "wrap" }}>
            {canUseCrm && (
              <button onClick={() => setShowBirthdays(p => !p)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 100, border: `1.5px solid ${showBirthdays ? GOLD + "80" : "#e5e7eb"}`, background: showBirthdays ? GOLD + "12" : "#f9fafb", cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: showBirthdays ? GOLD : "#d1d5db" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: showBirthdays ? "#7B5B00" : "#9ca3af" }}>생일</span>
              </button>
            )}
            <button onClick={() => setShowNotes(p => !p)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 100, border: `1.5px solid ${showNotes ? "#16a34a60" : "#e5e7eb"}`, background: showNotes ? "#f0fdf4" : "#f9fafb", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: showNotes ? "#16a34a" : "#d1d5db" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: showNotes ? "#15803d" : "#9ca3af" }}>메모</span>
            </button>
            <button onClick={() => setShowSolar(p => !p)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 100, border: `1.5px solid ${showSolar ? "#0891b260" : "#e5e7eb"}`, background: showSolar ? "#e0f2fe" : "#f9fafb", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: showSolar ? "#0891b2" : "#d1d5db" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: showSolar ? "#0e7490" : "#9ca3af" }}>절기</span>
            </button>
          </div>
        </div>

        {/* ── 우측 패널 (50%) ── */}
        <div style={{ flex: "1 1 50%", minWidth: 200, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 8 }}>
              <span style={{ fontSize: 32 }}>📅</span>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#9ca3af", textAlign: "center", lineHeight: 1.6 }}>날짜를 클릭하면<br/>일정과 메모를 확인할 수 있어요</p>
              {/* 범례 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                {[
                  { color: "#16a34a", label: "단일 메모" },
                  { color: "#dc2626", label: "매년 반복" },
                  { color: "#2563eb", label: "매주 반복" },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                    <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* 날짜 헤더 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: NAVY }}>
                  {viewMonth + 1}월 {parseInt(selected.split("-")[2])}일 ({DOW_LABELS[new Date(selected + "T00:00:00").getDay()]})
                </span>
                {selected === todayStr && (
                  <span style={{ background: NAVY, color: "#fff", fontSize: 9, fontWeight: 900, padding: "2px 8px", borderRadius: 100 }}>TODAY</span>
                )}
                {(() => {
                  const sel = selected.split("-")
                  const hi = getHolidayInfo(selected, parseInt(sel[1]), parseInt(sel[2]))
                  return hi ? (
                    <span style={{ background: hi.type === 'substitute' ? "#fff6ed" : "#fff0f0", color: hi.type === 'substitute' ? "#d97706" : "#e63946", fontSize: 10, fontWeight: 900, padding: "2px 9px", borderRadius: 100, border: `1px solid ${hi.type === 'substitute' ? "#fed7aa" : "#fecdd3"}` }}>
                      🎌 {hi.name}
                    </span>
                  ) : null
                })()}
                {showSolar && SOLAR_TERMS[selected] && (
                  <span style={{ background: "#e0f2fe", color: "#0891b2", fontSize: 10, fontWeight: 900, padding: "2px 9px", borderRadius: 100, border: "1px solid #bae6fd" }}>
                    🌿 {SOLAR_TERMS[selected]}
                  </span>
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

              {/* 단일 메모 */}
              {showNotes && selectedNote && (
                <div style={{ padding: "8px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color: "#15803d" }}>📝 단일 메모</p>
                    <button onClick={saveNote} disabled={savingNote}
                      style={{ fontSize: 9, fontWeight: 900, color: "#e63946", background: "none", border: "none", cursor: "pointer", padding: "1px 4px", fontFamily: "inherit" }}>
                      삭제
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selectedNote}</p>
                </div>
              )}

              {/* 매년 반복 일정 (이 날짜의 MM-DD에 해당) */}
              {(() => {
                const mmdd = selected.slice(5)
                const matched = yearlyEvents.filter(e => e.mmdd === mmdd)
                if (!matched.length) return null
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color: "#dc2626" }}>🔄 매년 반복 ({selected.slice(5).replace("-","월 ")}일마다)</p>
                    {matched.map(e => (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 9, background: "#fff5f5", border: "1px solid #fecdd3" }}>
                        <span style={{ flex: 1, fontSize: 12, color: "#374151", fontWeight: 700, lineHeight: 1.5 }}>{e.text}</span>
                        <button onClick={() => deleteRecurEvent(e.id, 'yearly')}
                          style={{ fontSize: 9, fontWeight: 900, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: "1px 4px", fontFamily: "inherit", flexShrink: 0 }}>
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* 매주 반복 일정 (이 날짜의 요일에 해당) */}
              {(() => {
                const dow = new Date(selected + "T00:00:00").getDay()
                const matched = weeklyEvents.filter(e => e.dow === dow)
                if (!matched.length) return null
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color: "#2563eb" }}>📅 매주 반복 (매주 {DOW_LABELS[dow]}요일)</p>
                    {matched.map(e => (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 9, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                        <span style={{ flex: 1, fontSize: 12, color: "#374151", fontWeight: 700, lineHeight: 1.5 }}>{e.text}</span>
                        <button onClick={() => deleteRecurEvent(e.id, 'weekly')}
                          style={{ fontSize: 9, fontWeight: 900, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: "1px 4px", fontFamily: "inherit", flexShrink: 0 }}>
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* 빈 상태 */}
              {(!showBirthdays || selectedBirthdays.length === 0) && !selectedNote
                && !yearlyEvents.some(e => e.mmdd === selected.slice(5))
                && !weeklyEvents.some(e => e.dow === new Date(selected + "T00:00:00").getDay())
                && !getHolidayInfo(selected, parseInt(selected.split("-")[1]), parseInt(selected.split("-")[2]))
                && !(showSolar && SOLAR_TERMS[selected]) && (
                <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, margin: 0 }}>이 날은 등록된 일정이 없습니다.</p>
              )}

              {/* ── 새 일정 추가 ── */}
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 10, fontWeight: 900, color: "#64748b" }}>➕ 일정 추가</label>
                {/* 반복 유형 선택 */}
                <div style={{ display: "flex", gap: 5 }}>
                  {([
                    { key: 'once',   label: '단일', desc: `${viewMonth+1}/${parseInt(selected.split("-")[2])}만`, color: "#16a34a" },
                    { key: 'yearly', label: '매년', desc: `${selected.slice(5).replace("-","월 ")}일마다`, color: "#dc2626" },
                    { key: 'weekly', label: '매주', desc: `매주 ${DOW_LABELS[new Date(selected+"T00:00:00").getDay()]}`, color: "#2563eb" },
                  ] as { key: RepeatType; label: string; desc: string; color: string }[]).map(opt => (
                    <button key={opt.key} onClick={() => setSchedRepeat(opt.key)}
                      style={{ flex: 1, padding: "5px 4px", borderRadius: 8, border: `1.5px solid ${schedRepeat === opt.key ? opt.color : "#e5e7eb"}`, background: schedRepeat === opt.key ? opt.color + "15" : "#f9fafb", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: schedRepeat === opt.key ? opt.color : "#6b7280" }}>{opt.label}</div>
                      <div style={{ fontSize: 9, color: schedRepeat === opt.key ? opt.color : "#9ca3af", fontWeight: 700, marginTop: 1 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
                <textarea value={schedText} onChange={e => setSchedText(e.target.value)}
                  placeholder={schedRepeat === 'once' ? "단일 메모를 입력하세요..." : schedRepeat === 'yearly' ? "예) 자동차보험 갱신, 기념일..." : "예) 고객 DM 발송, 주간 미팅..."}
                  style={{ minHeight: 54, padding: "7px 10px", borderRadius: 9, border: "1.5px solid #e5e7eb", fontSize: 12, fontWeight: 500, color: NAVY, background: "#f8fafc", outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" as const }}
                  onFocus={e => (e.target.style.borderColor = GOLD)}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={saveSchedule} disabled={savingSched || !schedText.trim()}
                    style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: savingSched || !schedText.trim() ? "#d1d5db" : NAVY, color: "#fff", fontSize: 11, fontWeight: 900, cursor: savingSched || !schedText.trim() ? "default" : "pointer", fontFamily: "inherit" }}>
                    {savingSched ? "저장 중..." : "저장"}
                  </button>
                  {schedRepeat === 'once' && selectedNote && (
                    <button onClick={() => { setNoteInput(""); saveNote() }}
                      style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #fecdd3", background: "#fff5f5", color: "#dc2626", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>
                      단일메모 삭제
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
