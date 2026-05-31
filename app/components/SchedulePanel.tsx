"use client"
import { useState } from "react"

export default function SchedulePanel() {
  const [schedule, setSchedule] = useState("")

  return (
    <div className="bg-[#111] p-6 rounded-2xl border border-gray-800">
      <h2 className="text-[#d4af37] mb-4 font-bold">오늘의 일정</h2>

      <textarea
        value={schedule}
        onChange={(e) => setSchedule(e.target.value)}
        placeholder="오늘 상담 일정 입력..."
        className="w-full p-3 bg-black border border-gray-700 rounded-xl"
      />

      <button className="mt-3 px-4 py-2 bg-[#d4af37] text-black rounded-lg">
        저장
      </button>
    </div>
  )
}