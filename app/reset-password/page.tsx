"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) return alert("비밀번호는 6자리 이상이어야 합니다.")

    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      alert("변경 실패: " + error.message)
    } else {
      alert("비밀번호가 성공적으로 변경되었습니다. 다시 로그인하세요.")
      router.push("/login")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center p-6 text-slate-900">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-xl w-full max-w-md border border-slate-100">
        <h1 className="text-2xl font-black mb-6 text-center italic">새 비밀번호 설정</h1>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <input 
            type="password" 
            placeholder="새로운 비밀번호 입력 (6자 이상)" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold outline-none focus:ring-2 focus:ring-[#d4af37]"
            required 
          />
          <button type="submit" disabled={loading} className="w-full bg-black text-[#d4af37] p-5 rounded-2xl font-black">
            {loading ? "변경 중..." : "비밀번호 변경 완료"}
          </button>
        </form>
      </div>
    </div>
  )
}