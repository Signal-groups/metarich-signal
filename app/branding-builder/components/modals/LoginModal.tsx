"use client"

import { useState } from 'react'
import { CONCEPT_LABELS, type LandingConcept } from '../../templates/types'

interface LoginModalProps {
  userName: string
  onUserNameChange: (name: string) => void
  onClose: () => void
  onLoadLatest: () => void
  onConceptSelect: (concept: LandingConcept) => void
}

const conceptDescriptions: Record<LandingConcept, string> = {
  consult: '내 보험 무료 점검 서비스',
  remodeling: '보험료 절감 리모델링',
  pension: '연금·노후 설계',
  product: '보험 상품 안내',
  claim: '보험 청구 도움',
  recruit: '설계사 모집',
  travel: '여행 시책 안내',
  retirement: '은퇴 설계 서비스',
}

const concepts = Object.entries(CONCEPT_LABELS) as [LandingConcept, string][]

function hasLatest(name: string): boolean {
  if (typeof window === 'undefined' || !name.trim()) return false
  return !!window.localStorage.getItem(`branding3_${name.trim()}_latest`)
}

export default function LoginModal({
  userName,
  onUserNameChange,
  onClose,
  onLoadLatest,
  onConceptSelect,
}: LoginModalProps) {
  const [step, setStep] = useState<'name' | 'restore' | 'concept'>('name')

  const handleStart = () => {
    if (hasLatest(userName)) {
      setStep('restore')
      return
    }
    setStep('concept')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') handleStart()
  }

  const handleSelectConcept = (concept: LandingConcept) => {
    onConceptSelect(concept)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 font-['Pretendard']">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A2744] text-lg font-black text-[#C9A96E]">
          MR
        </div>

        {step === 'name' && (
          <>
            <h1 className="mt-4 text-xl font-black text-slate-900">설계사 브랜딩 빌더</h1>
            <p className="mt-1 text-sm text-slate-500">이름을 입력하면 작업이 자동 저장됩니다.</p>
            <input
              autoFocus
              type="text"
              className="mt-5 h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none focus:border-[#1A2744]"
              placeholder="이름 또는 활동명"
              value={userName}
              onChange={(event) => onUserNameChange(event.target.value)}
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
          </>
        )}

        {step === 'restore' && (
          <>
            <p className="text-lg font-black text-slate-900">이전 작업이 있어요</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              <span className="font-bold text-[#1A2744]">{userName}</span>님의 저장된 브랜딩 페이지를 불러올까요?
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-md border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                onClick={() => setStep('concept')}
              >
                새로 시작
              </button>
              <button
                type="button"
                className="flex-1 rounded-md bg-[#1A2744] py-3 text-sm font-bold text-white hover:bg-[#2D4A8A]"
                onClick={() => {
                  onLoadLatest()
                  onClose()
                }}
              >
                불러오기
              </button>
            </div>
          </>
        )}

        {step === 'concept' && (
          <>
            <h1 className="mt-4 text-xl font-black text-slate-900">어떤 페이지가 필요하세요?</h1>
            <p className="mt-1 text-sm text-slate-500">목적을 고르면 샘플 정보와 기본 스타일을 먼저 채웁니다.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {concepts.map(([concept, label]) => (
                <button
                  key={concept}
                  type="button"
                  className="rounded-md border border-slate-200 p-3 text-left transition hover:border-[#1A2744] hover:bg-slate-50"
                  onClick={() => handleSelectConcept(concept)}
                >
                  <span className="block text-sm font-black text-slate-900">{label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{conceptDescriptions[concept]}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
