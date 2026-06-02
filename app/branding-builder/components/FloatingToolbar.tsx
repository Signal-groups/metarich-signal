"use client"

import type { ToolbarState } from '../hooks/useEditable'

const COLORS = ['#1e293b', '#ffffff', '#1A2744', '#2563eb', '#C9A96E', '#dc2626', '#16a34a', '#7c3aed']
const SIZES = [12, 14, 16, 18, 22, 28, 36]

interface FloatingToolbarProps {
  toolbar: ToolbarState
  onCommand: (command: string, value?: string) => void
  onClose: () => void
}

export default function FloatingToolbar({ toolbar, onCommand, onClose }: FloatingToolbarProps) {
  if (!toolbar.visible) return null

  return (
    <div
      className="fixed z-50 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-xl"
      style={{
        top: toolbar.top,
        left: toolbar.left,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* B / I / U */}
      {([['B', 'bold'], ['I', 'italic'], ['U', 'underline']] as const).map(([label, cmd]) => (
        <button
          key={cmd}
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded text-sm font-black text-slate-700 hover:bg-slate-100"
          title={cmd}
          onMouseDown={(e) => { e.preventDefault(); onCommand(cmd) }}
        >
          {label}
        </button>
      ))}

      <div className="mx-1 h-5 w-px bg-slate-200" />

      {/* 글자 크기 */}
      <select
        className="h-7 rounded border border-slate-200 px-1 text-xs text-slate-700 outline-none"
        defaultValue=""
        onChange={(e) => { if (e.target.value) onCommand('fontSize', e.target.value) }}
      >
        <option value="" disabled>크기</option>
        {SIZES.map((sz) => (
          <option key={sz} value={String(sz)}>{sz}px</option>
        ))}
      </select>

      <div className="mx-1 h-5 w-px bg-slate-200" />

      {/* 색상 팔레트 */}
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className="h-5 w-5 rounded-full border border-slate-300 hover:scale-110"
          style={{ background: color }}
          title={color}
          onMouseDown={(e) => { e.preventDefault(); onCommand('foreColor', color) }}
        />
      ))}

      <div className="mx-1 h-5 w-px bg-slate-200" />

      {/* 닫기 */}
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        title="닫기"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  )
}
