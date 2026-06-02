"use client"

import type { BrandingSaveSlot } from '../../hooks/useSaveLoad'

interface SaveSlotsModalProps {
  slots: BrandingSaveSlot[]
  onClose: () => void
  onLoad: (slotId: string) => void
  onDelete: (slotId: string) => void
}

export default function SaveSlotsModal({ slots, onClose, onLoad, onDelete }: SaveSlotsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-black text-slate-900">저장된 페이지</h2>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto px-6 py-4">
          {slots.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">저장된 페이지가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">{slot.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(slot.savedAt).toLocaleDateString('ko-KR', {
                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-[#1A2744] px-3 py-1.5 text-xs font-bold text-[#1A2744] hover:bg-slate-50"
                      onClick={() => { onLoad(slot.id); onClose() }}
                    >
                      불러오기
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50"
                      onClick={() => onDelete(slot.id)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            className="w-full rounded-md border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
