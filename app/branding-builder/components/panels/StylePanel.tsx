"use client"

import { FONT_OPTIONS, type BrandingState } from '../../templates/types'

const landingColors = ['#0b1e5f', '#2563eb', '#064e3b', '#4c1d95', '#0a0a0a', '#C9A96E', '#0d9488', '#dc2626']

interface StylePanelProps {
  state: BrandingState
  onPatchState: (patch: Partial<BrandingState>) => void
}

export default function StylePanel({ state, onPatchState }: StylePanelProps) {
  return (
    <section>
      <h2 className="text-lg font-black text-slate-900">스타일 조정</h2>
      <p className="mt-1 text-sm text-slate-500">색상, 폰트, 미리보기 분위기를 조정합니다.</p>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-700">메인 컬러</h3>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {landingColors.map((color) => (
            <button
              key={color}
              type="button"
              className={`h-11 rounded-md border-2 ${state.landingColor === color ? 'border-slate-900' : 'border-transparent'}`}
              style={{ background: color }}
              onClick={() => onPatchState({ landingColor: color })}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-black text-slate-700">폰트</h3>
        <div className="mt-3 space-y-2">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.id}
              type="button"
              className={`h-11 w-full rounded-md border px-3 text-left text-sm font-bold ${
                state.landingFont === font.css ? 'border-[#1A2744] bg-slate-50' : 'border-slate-200'
              }`}
              style={{ fontFamily: font.css }}
              onClick={() => onPatchState({ landingFont: font.css })}
            >
              {font.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-md border border-slate-200 p-4">
        <h3 className="text-sm font-black text-slate-700">60-30-10 색상 균형</h3>
        <div className="mt-3 flex h-8 overflow-hidden rounded">
          <div className="w-[60%] bg-white" />
          <div className="w-[30%] bg-slate-100" />
          <div className="w-[10%]" style={{ background: state.landingColor }} />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">배경 60%, 보조 영역 30%, CTA 포인트 10% 기준으로 점검합니다.</p>
      </div>
    </section>
  )
}
