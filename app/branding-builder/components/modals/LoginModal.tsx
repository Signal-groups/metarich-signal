"use client"

import { useState } from 'react'

interface LoginModalProps {
  userName: string
  onUserNameChange: (name: string) => void
  onClose: () => void
  onLoadLatest: () => void
}

function hasLatest(name: string): boolean {
  if (typeof window === 'undefined' || !name.trim()) return false
  return !!window.localStorage.getItem(`branding3_${name.trim()}_latest`)
}

export default function LoginModal({ userName, onUserNameChange, onClose, onLoadLatest }: LoginModalProps) {
  const [showRestore, setShowRestore] = useState(false)

  const handleStart = () => {
    if (hasLatest(userName)) {
      setShowRestore(true)
    } else {
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleStart()
  }

  if (showRestore) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl">
          <p className="text-lg font-black text-slate-900">이전 작업이 있어요</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            <span className="font-bold text-[#1A2744]">{userName}</span>님의 저장된 브랜딩 페이지를 불러올까요?
          </p>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-md border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
              onClick={onClose}
            >
              새로 시작
            </button>
            <button
              type="button"
              className="flex-1 rounded-md bg-[#1A2744] py-3 text-sm font-bold text-white hover:bg-[#2D4A8A]"
              onClick={() => { onLoadLatest(); onClose() }}
            >
              불러오기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A2744] text-lg font-black text-[#C9A96E]">
          MR
        </div>
        <h1 className="mt-4 text-xl font-black text-slate-900">설계사 브랜딩 빌더</h1>
        <p className="mt-1 text-sm text-slate-500">이름을 입력하면 작업이 자동 저장됩니다.</p>
        <input
          autoFocus
          type="text"
          className="mt-5 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none focus:border-[#1A2744]"
          placeholder="이름 또는 활동명"
          value={userName}
          onChange={(e) => onUserNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-md border border-slate-200 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"
            onClick={onClose}
          >
            나중에
          </button>
          <button
            type="button"
            className="flex-1 rounded-md bg-[#1A2744] py-3 text-sm font-bold text-white hover:bg-[#2D4A8A]"
            onClick={handleStart}
          >
            시작하기
          </button>
        </div>
      </div>
    </div>
  )
}
