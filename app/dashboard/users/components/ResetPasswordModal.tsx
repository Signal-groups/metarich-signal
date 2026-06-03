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
      const result = await response.json()

      if (!response.ok) throw new Error(result?.error || "초기화에 실패했습니다.")

      alert("초기화 완료")
      onSuccess()
    } catch (error) {
      alert(`초기화 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-widest text-rose-500">Reset Password</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">비밀번호 초기화</h2>
        <p className="mt-4 text-sm font-bold leading-6 text-slate-600">
          {user.name || user.email}님의 비밀번호를 임시 비밀번호 123456으로 초기화합니다.
          초기화 후 해당 직원에게 로그인 후 비밀번호 변경을 안내해주세요.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 disabled:opacity-50">취소</button>
          <button type="button" onClick={resetPassword} disabled={loading} className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
            {loading ? "초기화 중" : "초기화"}
          </button>
        </div>
      </section>
    </div>
  )
}
