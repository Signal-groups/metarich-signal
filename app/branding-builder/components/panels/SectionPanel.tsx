"use client"

import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react'
import type { BrandingState } from '../../templates/types'

interface SectionPanelProps {
  state: BrandingState
  onAddSection: () => void
  onRestoreSection: (id: string) => void
  onRemoveExtraSection: (id: string) => void
  onMoveExtraSection: (id: string, direction: -1 | 1) => void
}

const BASE_SECTIONS = [
  { id: 'hero', label: '히어로 배너' },
  { id: 'profile', label: '설계사 프로필' },
  { id: 'stats', label: '실적 수치' },
]

function externalSectionLabel(id: string) {
  const match = id.match(/(?:ext|ins)-[\w-]+-section-(\d+)/)
  if (match) return `외부 템플릿 섹션 ${Number(match[1]) + 1}`
  if (id.includes('-id-')) return `외부 템플릿 섹션 · ${id.split('-id-').pop()}`
  return id
}

export default function SectionPanel(props: SectionPanelProps) {
  const baseIds = BASE_SECTIONS.map((section) => section.id)
  const extraIds = props.state.extraSecs.map((section) => section.id)
  const externalDeletedSecs = props.state.deletedSecs.filter(
    (id) => !baseIds.includes(id) && !extraIds.includes(id),
  )

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">섹션 관리</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            미리보기에서 삭제한 섹션은 여기서 다시 복원할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          className="flex h-10 items-center gap-1 rounded-md bg-[#1A2744] px-3 text-sm font-bold text-white"
          onClick={props.onAddSection}
        >
          <Plus size={16} />
          추가
        </button>
      </div>

      <div className="mt-5 space-y-2">
        <h3 className="text-sm font-black text-slate-700">기본 섹션</h3>
        {BASE_SECTIONS.map((section) => (
          <div key={section.id} className="flex min-h-12 items-center justify-between rounded-md border border-slate-200 px-3">
            <span className="text-sm font-bold text-slate-700">{section.label}</span>
            {props.state.deletedSecs.includes(section.id) && (
              <button
                type="button"
                className="flex h-8 items-center gap-1 rounded border border-slate-200 px-2 text-xs font-bold text-slate-600"
                onClick={() => props.onRestoreSection(section.id)}
              >
                <RotateCcw size={14} />
                복원
              </button>
            )}
          </div>
        ))}
      </div>

      {externalDeletedSecs.length > 0 && (
        <div className="mt-7 space-y-2">
          <h3 className="text-sm font-black text-slate-700">삭제된 외부 템플릿 섹션</h3>
          <p className="text-xs leading-5 text-slate-500">
            외부 HTML 미리보기에서 삭제한 섹션입니다. 복원하면 미리보기가 다시 렌더링됩니다.
          </p>
          {externalDeletedSecs.map((id) => (
            <div key={id} className="flex min-h-12 items-center justify-between rounded-md border border-rose-100 bg-rose-50 px-3">
              <span className="truncate text-sm font-bold text-slate-700">{externalSectionLabel(id)}</span>
              <button
                type="button"
                className="flex h-8 items-center gap-1 rounded border border-rose-200 bg-white px-2 text-xs font-bold text-rose-700"
                onClick={() => props.onRestoreSection(id)}
              >
                <RotateCcw size={14} />
                복원
              </button>
            </div>
          ))}
        </div>
      )}

      <h3 className="mt-7 text-sm font-black text-slate-700">추가 섹션</h3>
      <div className="mt-3 space-y-2">
        {props.state.extraSecs.length === 0 && (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            아직 추가한 섹션이 없습니다.
          </p>
        )}
        {props.state.extraSecs.map((section) => (
          <div key={section.id} className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">{section.id}</span>
              <button type="button" className="text-red-600" onClick={() => props.onRemoveExtraSection(section.id)} title="삭제">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className="flex h-8 items-center gap-1 rounded border px-2 text-xs font-bold" onClick={() => props.onMoveExtraSection(section.id, -1)}>
                <ArrowUp size={14} />
                위
              </button>
              <button type="button" className="flex h-8 items-center gap-1 rounded border px-2 text-xs font-bold" onClick={() => props.onMoveExtraSection(section.id, 1)}>
                <ArrowDown size={14} />
                아래
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
