"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type PeriodKey = "7d" | "30d" | "90d"

interface PageStat {
  page: string
  page_label: string
  count: number
}

interface UserStat {
  user_id: string
  name: string
  email: string
  count: number
  last_seen: string
}

interface HourStat {
  hour: number
  count: number
}

interface DayStat {
  day: string     // 'Mon'~'Sun'
  day_num: number // 0(일)~6(토)
  count: number
}

const PERIOD_DAYS: Record<PeriodKey, number> = { "7d": 7, "30d": 30, "90d": 90 }
const PERIOD_LABEL: Record<PeriodKey, string> = { "7d": "최근 7일", "30d": "최근 30일", "90d": "최근 90일" }
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

function BarRow({ label, value, max, color = "bg-[#1a3a6e]", sub }: {
  label: string; value: number; max: number; color?: string; sub?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-36 shrink-0 truncate text-right text-[12px] font-bold text-slate-600">{label}</span>
      <div className="flex-1 rounded-full bg-slate-100 h-5 overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-[12px] font-black text-slate-800">{value.toLocaleString()}</span>
      {sub && <span className="text-[11px] text-slate-400 w-24 shrink-0">{sub}</span>}
    </div>
  )
}

export default function UsageAnalytics() {
  const [period, setPeriod] = useState<PeriodKey>("30d")
  const [loading, setLoading] = useState(true)
  const [pageStats, setPageStats] = useState<PageStat[]>([])
  const [userStats, setUserStats] = useState<UserStat[]>([])
  const [hourStats, setHourStats] = useState<HourStat[]>([])
  const [dayStats, setDayStats] = useState<DayStat[]>([])
  const [totalViews, setTotalViews] = useState(0)
  const [activeUsers, setActiveUsers] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const since = new Date(Date.now() - PERIOD_DAYS[period] * 86400_000).toISOString()

    // ── 전체 로그 fetch (master RLS 통과) ─────────────────────────────
    const { data: logs, error } = await supabase
      .from("user_activity_logs")
      .select("user_id, page, page_label, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })

    if (error || !logs) { setLoading(false); return }

    // ── 사용자 이름 조회 ──────────────────────────────────────────────
    const uids = [...new Set(logs.map((l) => l.user_id))]
    const { data: users } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", uids)
    const userMap: Record<string, { name: string; email: string }> = {}
    for (const u of users ?? []) userMap[u.id] = { name: u.name ?? "", email: u.email ?? "" }

    // ── 페이지별 집계 ─────────────────────────────────────────────────
    const pageCnt: Record<string, { label: string; count: number }> = {}
    for (const l of logs) {
      const key = l.page ?? "unknown"
      if (!pageCnt[key]) pageCnt[key] = { label: l.page_label ?? key, count: 0 }
      pageCnt[key].count++
    }
    const pStats: PageStat[] = Object.entries(pageCnt)
      .map(([page, v]) => ({ page, page_label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // ── 사용자별 집계 ─────────────────────────────────────────────────
    const userCnt: Record<string, { count: number; last_seen: string }> = {}
    for (const l of logs) {
      if (!userCnt[l.user_id]) userCnt[l.user_id] = { count: 0, last_seen: l.created_at }
      userCnt[l.user_id].count++
      if (l.created_at > userCnt[l.user_id].last_seen) userCnt[l.user_id].last_seen = l.created_at
    }
    const uStats: UserStat[] = Object.entries(userCnt)
      .map(([uid, v]) => ({
        user_id: uid,
        name: userMap[uid]?.name ?? "",
        email: userMap[uid]?.email ?? uid.slice(0, 8),
        count: v.count,
        last_seen: v.last_seen,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)

    // ── 시간대별 집계 (0~23시) ────────────────────────────────────────
    const hCnt: Record<number, number> = {}
    for (let h = 0; h < 24; h++) hCnt[h] = 0
    for (const l of logs) {
      const h = new Date(l.created_at).getHours()
      hCnt[h] = (hCnt[h] ?? 0) + 1
    }
    const hStats: HourStat[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hCnt[h] }))

    // ── 요일별 집계 ───────────────────────────────────────────────────
    const dCnt: Record<number, number> = {}
    for (let d = 0; d < 7; d++) dCnt[d] = 0
    for (const l of logs) {
      const d = new Date(l.created_at).getDay()
      dCnt[d] = (dCnt[d] ?? 0) + 1
    }
    const dStats: DayStat[] = Array.from({ length: 7 }, (_, d) => ({
      day: DAY_LABELS[d],
      day_num: d,
      count: dCnt[d],
    }))

    setPageStats(pStats)
    setUserStats(uStats)
    setHourStats(hStats)
    setDayStats(dStats)
    setTotalViews(logs.length)
    setActiveUsers(uids.length)
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  const maxPage = pageStats[0]?.count ?? 1
  const maxUser = userStats[0]?.count ?? 1
  const maxHour = Math.max(...hourStats.map((h) => h.count), 1)
  const maxDay  = Math.max(...dayStats.map((d) => d.count), 1)

  return (
    <div className="space-y-6">
      {/* 기간 선택 + 요약 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["7d","30d","90d"] as PeriodKey[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-xl px-4 py-2 text-[13px] font-black transition ${period === p ? "bg-[#1a3a6e] text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl bg-[#1a3a6e] px-5 py-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-200">총 페이지뷰</p>
            <p className="mt-1 text-2xl font-black text-white">{totalViews.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 px-5 py-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">활성 사용자</p>
            <p className="mt-1 text-2xl font-black text-[#1a3a6e]">{activeUsers.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1a3a6e]/20 border-t-[#1a3a6e]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

          {/* 메뉴별 방문 횟수 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[14px] font-black text-slate-800">📊 메뉴별 방문 횟수</h3>
            {pageStats.length === 0
              ? <p className="text-[13px] text-slate-400">데이터 없음</p>
              : pageStats.map((p, i) => (
                  <BarRow
                    key={p.page}
                    label={p.page_label || p.page}
                    value={p.count}
                    max={maxPage}
                    color={i === 0 ? "bg-[#1a3a6e]" : i < 3 ? "bg-[#2563eb]" : "bg-slate-400"}
                  />
                ))}
          </section>

          {/* 사용자별 활동량 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[14px] font-black text-slate-800">👤 사용자별 활동량</h3>
            {userStats.length === 0
              ? <p className="text-[13px] text-slate-400">데이터 없음</p>
              : userStats.map((u, i) => {
                  const lastDate = new Date(u.last_seen)
                  const diffH = Math.round((Date.now() - lastDate.getTime()) / 3600_000)
                  const lastLabel = diffH < 1 ? "방금" : diffH < 24 ? `${diffH}시간 전` : `${Math.floor(diffH/24)}일 전`
                  return (
                    <BarRow
                      key={u.user_id}
                      label={u.name || u.email}
                      value={u.count}
                      max={maxUser}
                      color={i === 0 ? "bg-emerald-500" : i < 3 ? "bg-emerald-400" : "bg-slate-300"}
                      sub={lastLabel}
                    />
                  )
                })}
          </section>

          {/* 시간대별 접속 패턴 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[14px] font-black text-slate-800">🕐 시간대별 접속 패턴</h3>
            <div className="flex items-end gap-[3px] h-24">
              {hourStats.map(({ hour, count }) => {
                const pct = maxHour > 0 ? (count / maxHour) * 100 : 0
                const isPeak = count === maxHour && count > 0
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div
                      className={`w-full rounded-t transition-all ${isPeak ? "bg-amber-400" : "bg-[#1a3a6e]/70"}`}
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    />
                    {/* tooltip */}
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white z-10">
                      {hour}시 {count}회
                    </span>
                    {(hour % 6 === 0) && (
                      <span className="text-[9px] text-slate-400">{hour}</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-400 px-0.5">
              <span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span>
            </div>
          </section>

          {/* 요일별 접속 패턴 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-[14px] font-black text-slate-800">📅 요일별 접속 패턴</h3>
            <div className="flex items-end gap-2 h-24">
              {dayStats.map(({ day, day_num, count }) => {
                const pct = maxDay > 0 ? (count / maxDay) * 100 : 0
                const isPeak = count === maxDay && count > 0
                const isWeekend = day_num === 0 || day_num === 6
                return (
                  <div key={day_num} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className={`w-full rounded-t transition-all ${isPeak ? "bg-amber-400" : isWeekend ? "bg-slate-300" : "bg-[#1a3a6e]/80"}`}
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    />
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white z-10">
                      {day}요일 {count}회
                    </span>
                    <span className={`text-[11px] font-bold ${isWeekend ? "text-slate-400" : "text-slate-600"}`}>{day}</span>
                  </div>
                )
              })}
            </div>
          </section>

        </div>
      )}

      <p className="text-[11px] text-slate-400">
        * CRM 메뉴 방문 기준. 데이터는 추적 코드 적용 이후부터 누적됩니다.
      </p>
    </div>
  )
}
