"use client"

import { useState } from "react"
import type { StaffUser } from "./UserRow"

interface ResetPasswordModalProps {
  user: StaffUser | null
  requesterId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ResetPasswordModal({ user, requesterId, onClose, onSuccess }: ResetPasswordModalProps) {
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const resetPassword = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id, requesterId }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        alert(`초기화 실패: ${data.error || "알 수 없는 오류"}`)
        return
      }

      alert("초기화 완료")
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-black text-slate-950">비밀번호 초기화</h2>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
          <span className="font-black text-[#1a3a6e]">{user.name || user.email || "직원"}</span>님의 비밀번호를 임시 비밀번호 <span className="font-black text-rose-600">123456</span>으로 초기화합니다.
          초기화 후 해당 직원에게 로그인 뒤 비밀번호 변경을 안내해주세요.
        </p>
        <div className="mt-6 flex gap-2">
          <button type="button" disabled={loading} onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-black text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            취소
          </button>
          <button type="button" disabled={loading} onClick={resetPassword} className="flex-1 rounded-xl bg-rose-500 py-3 text-sm font-black text-white hover:bg-rose-600 disabled:opacity-50">
            {loading ? "초기화 중" : "초기화"}
          </button>
        </div>
      </div>
    </div>
  )
}
