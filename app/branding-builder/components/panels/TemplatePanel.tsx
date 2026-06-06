"use client"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TemplatePanel — 템플릿×컨셉 2단계 선택 패널 (직접 관리 파일. Codex 수정 금지)
// 스펙 3단계 2단계: 랜딩페이지/모바일명함 + 템플릿 + 컨셉
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useRef, useState } from 'react'
import {
  CARD_BG_SWATCHES,
  CARD_TEMPLATES,
  CONCEPT_LABELS,
  CONCEPT_PALETTES,
  LANDING_TEMPLATES,
  type BrandingState,
  type BuilderMode,
  type CardPhotoPosition,
  type CardTemplateId,
  type LandingConcept,
  type LandingTemplateId,
} from '../../templates/types'

interface TemplatePanelProps {
  state: BrandingState
  onPatchState: (patch: Partial<BrandingState>) => void
  onModeChange: (mode: BuilderMode) => void
}

const LANDING_CATS = ['전체', '보험 전용', '보험상담', '보장분석', '리모델링', '보험청구', '리쿠르팅', '연금/은퇴', '교육/전문', '명함/프로필'] as const
const CONCEPTS = Object.entries(CONCEPT_LABELS) as [LandingConcept, string][]
const PHOTO_POS_LABELS: Record<CardPhotoPosition, string> = { top: '상단 전체', circle: '원형', right: '우측 반' }

export default function TemplatePanel({ state, onPatchState, onModeChange }: TemplatePanelProps) {
  const [cat, setCat] = useState<string>('전체')

  return (
    <section className="space-y-5 pb-4">

      {/* ── 랜딩 / 명함 모드 탭 ── */}
      <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
        <ModeBtn active={state.mode === 'landing'} onClick={() => onModeChange('landing')}>🌐 랜딩페이지</ModeBtn>
        <ModeBtn active={state.mode === 'card'}    onClick={() => onModeChange('card')}>📱 모바일 명함</ModeBtn>
      </div>

      {/* ════ 랜딩페이지 ════ */}
      {state.mode === 'landing' && (
        <>
          {/* 카테고리 필터 */}
          <div>
            <SectionLabel>① 디자인 템플릿</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {LANDING_CATS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-7 rounded-full px-3 text-xs font-bold transition-colors ${
                    cat === c ? 'bg-[#1A2744] text-white' : 'border border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                  onClick={() => setCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* 템플릿 목록 */}
            <div className="mt-3 space-y-1.5">
              {LANDING_TEMPLATES
                .filter((t) => cat === '전체' || t.category === cat)
                .map((t) => {
                  const active = state.landingTemplateId === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                        active ? 'border-[#1A2744] bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      onClick={() => onPatchState({ landingTemplateId: t.id as LandingTemplateId })}
                    >
                      <div
                        className="h-7 w-7 shrink-0 rounded border border-white/20"
                        style={{ background: t.accentColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">{t.name}</p>
                        <p className="text-[10px] text-slate-400">{t.category}{t.type === 'external' ? ' · 직접편집' : ''}</p>
                      </div>
                      {active && (
                        <span className="shrink-0 rounded-full bg-[#1A2744] px-2 py-0.5 text-[10px] font-black text-white">✓</span>
                      )}
                    </button>
                  )
                })}
            </div>
          </div>

          {/* 컨셉(목적) 선택 */}
          <div>
            <SectionLabel>② 컨셉 (목적)</SectionLabel>
            <p className="mb-3 text-[10px] leading-5 text-slate-400">
              컨셉을 선택하면 헤드라인·CTA·색상이 자동으로 최적화됩니다.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {CONCEPTS.map(([id, label]) => {
                const active = state.landingConcept === id
                return (
                  <button
                    key={id}
                    type="button"
                    className={`h-10 rounded-md border text-xs font-bold transition-colors ${
                      active
                        ? 'border-[#1A2744] bg-[#1A2744] text-white'
                        : 'border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                    onClick={() => onPatchState({
                      landingConcept: id,
                      landingColor: CONCEPT_PALETTES[id].accent,
                    })}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ════ 모바일 명함 ════ */}
      {state.mode === 'card' && (
        <>
          {/* 명함 스타일 6종 */}
          <div>
            <SectionLabel>명함 스타일</SectionLabel>
            <div className="space-y-1.5">
              {CARD_TEMPLATES.map((t) => {
                const active = state.cardTemplateId === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                      active ? 'border-[#1A2744] bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    onClick={() =>
                      onPatchState({
                        cardTemplateId: t.id as CardTemplateId,
                        cardBg: t.bg,
                        cardPhotoPos: t.defaultPhotoPos,
                      })
                    }
                  >
                    <div
                      className="h-7 w-7 shrink-0 rounded border border-white/20"
                      style={{ background: t.bg }}
                    />
                    <p className="flex-1 text-xs font-bold text-slate-900">{t.name}</p>
                    {active && (
                      <span className="shrink-0 rounded-full bg-[#1A2744] px-2 py-0.5 text-[10px] font-black text-white">✓</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 배경 색상 스와치 */}
          <div>
            <SectionLabel>배경 색상</SectionLabel>
            <div className="grid grid-cols-4 gap-2">
              {CARD_BG_SWATCHES.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  className={`h-10 rounded-md border-2 transition-transform hover:scale-105 ${
                    state.cardBg === bg ? 'border-slate-900' : 'border-transparent'
                  }`}
                  style={{ background: bg }}
                  onClick={() => onPatchState({ cardBg: bg })}
                />
              ))}
            </div>
          </div>

          {/* 사진 배치 */}
          <div>
            <SectionLabel>사진 배치</SectionLabel>
            <div className="flex gap-2">
              {(['top', 'circle', 'right'] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  className={`flex-1 rounded-md border py-2 text-xs font-bold transition-colors ${
                    state.cardPhotoPos === pos
                      ? 'border-[#1A2744] bg-[#1A2744] text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                  onClick={() => onPatchState({ cardPhotoPos: pos })}
                >
                  {PHOTO_POS_LABELS[pos]}
                </button>
              ))}
            </div>
          </div>

          {/* 명함 태그 */}
          <div>
            <SectionLabel>전문 태그</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {state.cardTags.map((tag, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700"
                >
                  {tag}
                  <button
                    type="button"
                    className="ml-0.5 text-slate-400 hover:text-red-500"
                    onClick={() => onPatchState({ cardTags: state.cardTags.filter((_, j) => j !== i) })}
                  >✕</button>
                </span>
              ))}
            </div>
            <input
              type="text"
              className="mt-2 h-9 w-full rounded-md border border-dashed border-slate-300 px-3 text-xs outline-none focus:border-[#1A2744]"
              placeholder="태그 입력 후 Enter"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const el = e.target as HTMLInputElement
                const v = el.value.trim()
                if (v && !state.cardTags.includes(v)) onPatchState({ cardTags: [...state.cardTags, v] })
                el.value = ''
              }}
            />
          </div>

          {/* 명함 전용 사진 업로드 */}
          <CardPhotoUpload state={state} onPatchState={onPatchState} />

          {/* 하단 고정 CTA 토글 */}
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="text-xs font-bold text-slate-700">하단 고정 CTA 버튼</p>
              <p className="text-[10px] text-slate-400">전화하기 + 카카오톡 버튼</p>
            </div>
            <button
              type="button"
              className={`relative h-6 w-11 rounded-full transition-colors ${state.cardShowBottomCta ? 'bg-[#1A2744]' : 'bg-slate-300'}`}
              onClick={() => onPatchState({ cardShowBottomCta: !state.cardShowBottomCta })}
              aria-label="하단 CTA 버튼 토글"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  state.cardShowBottomCta ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </>
      )}

    </section>
  )
}

// ── 서브 컴포넌트 ──


// ── 서브 컴포넌트 ──

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`h-10 flex-1 rounded text-sm font-bold transition-colors ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{children}</h3>
  )
}

function toB64Card(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = (e) => res(e.target?.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

function CardPhotoUpload({
  state,
  onPatchState,
}: {
  state: BrandingState
  onPatchState: (patch: Partial<BrandingState>) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const src = state.cardPhotoData || state.agentInfo.profileImg

  return (
    <div>
      <SectionLabel>명함 사진</SectionLabel>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          {src
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={src} alt="" className="h-full w-full object-cover" />
            : <span className="flex h-full w-full items-center justify-center text-xl">👤</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => ref.current?.click()}
          >
            + 명함 사진 업로드
          </button>
          {state.cardPhotoData && (
            <button
              type="button"
              className="h-8 rounded-md border border-red-200 px-3 text-xs font-bold text-red-500 hover:bg-red-50"
              onClick={() => onPatchState({ cardPhotoData: null })}
            >
              삭제
            </button>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-slate-400">미업로드 시 정보 탭 프로필 사진 사용</p>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files?.[0]) {
            const b64 = await toB64Card(e.target.files[0])
            onPatchState({ cardPhotoData: b64 })
          }
        }}
      />
    </div>
  )
}
