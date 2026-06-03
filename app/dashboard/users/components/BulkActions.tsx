"use client"

import { useState } from "react"

interface BulkActionsProps {
  selectedIds: Set<string>
  onBulkApprove: (approve: boolean) => Promise<void>
  onBulkRankChange: (rank: string) => Promise<void>
}

const ranks = [
  { value: "agent", label: "설계사" },
  { value: "manager", label: "지점장" },
  { value: "leader", label: "사업부장" },
  { value: "headquarters", label: "본부장" },
  { value: "master", label: "마스터" },
]

export default function BulkActions({ selectedIds, onBulkApprove, onBulkRankChange }: BulkActionsProps) {
  const [rank, setRank] = useState("agent")
  const [loading, setLoading] = useState(false)

  if (selectedIds.size === 0) return null

  const run = async (action: () => Promise<void>) => {
    setLoading(true)
    try {
      await action()
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[#C9A96E]/50 bg-[#fff8e8] p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm font-black text-slate-800">선택 {selectedIds.size}명</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" disabled={loading} onClick={() => run(() => onBulkApprove(true))} className="rounded-xl bg-[#1a3a6e] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
          선택 {selectedIds.size}명 승인
        </button>
        <button type="button" disabled={loading} onClick={() => run(() => onBulkApprove(false))} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-[#1a3a6e] ring-1 ring-[#1a3a6e]/20 disabled:opacity-50">
          선택 {selectedIds.size}명 승인 취소
        </button>
        <div className="flex gap-2">
          <select value={rank} onChange={(event) => setRank(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700">
            {ranks.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button type="button" disabled={loading} onClick={() => run(() => onBulkRankChange(rank))} className="rounded-xl bg-[#C9A96E] px-4 py-3 text-sm font-black text-slate-900 disabled:opacity-50">
            등급 일괄 변경
          </button>
        </div>
      </div>
    </section>
  )
}
