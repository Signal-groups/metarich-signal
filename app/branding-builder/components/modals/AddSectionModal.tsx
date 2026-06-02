"use client"

const SECTIONS = [
  { id: 'faq',    label: 'FAQ',        desc: '자주 묻는 질문을 정리해서 신뢰를 높입니다.' },
  { id: 'review', label: '고객 후기',   desc: '실제 상담 후기로 전환율을 높입니다.' },
  { id: 'form',   label: '상담 신청폼', desc: '이름·연락처·문의 내용을 받는 영역입니다.' },
  { id: 'banner', label: '배너',        desc: '공지, 이벤트, 시책 안내를 넣습니다.' },
] as const

type SectionKind = typeof SECTIONS[number]['id']

interface AddSectionModalProps {
  onClose: () => void
  onAdd: (kind: SectionKind) => void
}

export default function AddSectionModal({ onClose, onAdd }: AddSectionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-black text-slate-900">섹션 추가</h2>
          <button type="button" className="text-slate-400 hover:text-slate-700" onClick={onClose}>✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3 p-6">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className="rounded-md border border-slate-200 p-4 text-left hover:border-[#1A2744] hover:bg-slate-50"
              onClick={() => onAdd(section.id)}
            >
              <p className="text-sm font-black text-slate-900">{section.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{section.desc}</p>
            </button>
          ))}
        </div>

        <div className="border-t border-slate-100 px-6 pb-5">
          <button
            type="button"
            className="w-full rounded-md border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            onClick={onClose}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
