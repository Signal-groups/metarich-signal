"use client"

import { Download, FilePlus2, FolderOpen, Monitor, RefreshCw, Save, Smartphone, Sparkles } from 'lucide-react'
import type { BuilderMode } from '../templates/types'

interface ToolbarProps {
  userName: string
  mode: BuilderMode
  previewMode: 'desktop' | 'mobile'
  onPreviewModeChange: (mode: 'desktop' | 'mobile') => void
  onAddSection: () => void
  onSave: () => void
  onSaveSlot: () => void
  onOpenSlots: () => void
  onFillSample: () => void
  onReset: () => void
  onDownload: () => void
}

export default function Toolbar(props: ToolbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1A2744] text-sm font-black text-[#C9A96E]">
          MR
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">설계사 브랜딩 빌더</p>
          <p className="text-xs text-slate-500">{props.userName} 작업 중</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            className={`flex h-9 items-center gap-1 rounded px-3 text-sm font-semibold ${
              props.previewMode === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
            onClick={() => props.onPreviewModeChange('desktop')}
            title="PC 미리보기"
          >
            <Monitor size={16} />
            PC
          </button>
          <button
            type="button"
            className={`flex h-9 items-center gap-1 rounded px-3 text-sm font-semibold ${
              props.previewMode === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
            onClick={() => props.onPreviewModeChange('mobile')}
            title="모바일 미리보기"
          >
            <Smartphone size={16} />
            모바일
          </button>
        </div>

        <ToolbarButton icon={<FilePlus2 size={16} />} label="섹션" onClick={props.onAddSection} disabled={props.mode === 'card'} />
        <ToolbarButton icon={<Save size={16} />} label="저장" onClick={props.onSave} />
        <ToolbarButton icon={<Save size={16} />} label="슬롯저장" onClick={props.onSaveSlot} />
        <ToolbarButton icon={<FolderOpen size={16} />} label="불러오기" onClick={props.onOpenSlots} />
        <ToolbarButton icon={<Sparkles size={16} />} label="샘플" onClick={props.onFillSample} />
        <ToolbarButton icon={<RefreshCw size={16} />} label="초기화" onClick={props.onReset} />
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-md bg-[#1A2744] px-4 text-sm font-bold text-white hover:bg-[#2D4A8A]"
          onClick={props.onDownload}
        >
          <Download size={16} />
          HTML 다운로드
        </button>
      </div>
    </header>
  )
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {label}
    </button>
  )
}
