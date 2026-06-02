"use client"

import { forwardRef } from 'react'
import {
  CONCEPT_CTA,
  CONCEPT_HEADLINES,
  CONCEPT_LABELS,
  CONCEPT_PALETTES,
  LANDING_TEMPLATES,
  type BrandingState,
} from '../templates/types'

interface PreviewProps {
  state: BrandingState
  previewMode: 'desktop' | 'mobile'
  onDeleteSection: (id: string) => void
  onOpenTab: (tab: number) => void
}

const Preview = forwardRef<HTMLDivElement, PreviewProps>(function Preview(
  { state, previewMode, onDeleteSection, onOpenTab },
  ref,
) {
  const widthClass = previewMode === 'mobile' ? 'max-w-[390px]' : 'max-w-[960px]'
  const selectedTemplate = LANDING_TEMPLATES.find((template) => template.id === state.landingTemplateId)
  const externalTemplateFile = selectedTemplate?.type === 'external' ? selectedTemplate.file : undefined

  return (
    <section className="min-w-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto mb-4 flex max-w-[960px] items-center justify-between text-sm text-slate-500">
        <span>텍스트를 드래그하면 편집 툴바가 나타납니다.</span>
        <span>{previewMode === 'mobile' ? '모바일 폭 390px' : 'PC 폭 960px'}</span>
      </div>

      <div className={`mx-auto overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg ${widthClass}`}>
        <div className="flex h-11 items-center gap-2 border-b border-slate-200 bg-slate-50 px-4">
          <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
          <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
          <span className="h-3 w-3 rounded-full bg-[#10b981]" />
          <span className="ml-3 text-xs font-bold text-slate-500">
            {state.mode === 'card' ? '디지털 명함 미리보기' : '랜딩페이지 미리보기'}
          </span>
        </div>

        <div ref={ref} className="branding-preview-root bg-white">
          {state.mode === 'card' ? (
            <CardPreview state={state} onOpenTab={onOpenTab} />
          ) : externalTemplateFile ? (
            <iframe
              key={state.landingTemplateId}
              src={externalTemplateFile}
              className="w-full border-none"
              style={{ height: previewMode === 'mobile' ? '750px' : 'calc(100vh - 140px)' }}
              title="외부 템플릿 미리보기"
            />
          ) : (
            <LandingPreview state={state} onDeleteSection={onDeleteSection} onOpenTab={onOpenTab} />
          )}
        </div>
      </div>
    </section>
  )
})

export default Preview

function LandingPreview({
  state,
  onDeleteSection,
  onOpenTab,
}: {
  state: BrandingState
  onDeleteSection: (id: string) => void
  onOpenTab: (tab: number) => void
}) {
  const concept = state.landingConcept ?? 'consult'
  const headline = CONCEPT_HEADLINES[concept]
  const cta = CONCEPT_CTA[concept]
  const palette = CONCEPT_PALETTES[concept]
  const info = state.agentInfo

  return (
    <article style={{ fontFamily: state.landingFont }}>
      <EditableSection id="hero" onDelete={onDeleteSection}>
        <section
          className="relative overflow-hidden px-8 py-20"
          style={{ background: palette.heroBg, color: palette.heroText, borderBottom: `4px solid ${state.landingColor}` }}
          onClick={() => onOpenTab(2)}
        >
          <p
            contentEditable
            suppressContentEditableWarning
            className="mb-4 text-sm font-bold outline-blue-500"
            style={{ color: palette.accent }}
          >
            {info.brand || CONCEPT_LABELS[concept]}
          </p>
          <h1
            contentEditable
            suppressContentEditableWarning
            className="max-w-2xl whitespace-pre-line text-4xl font-black leading-tight outline-blue-500"
          >
            {info.slogan || headline}
          </h1>
          <p
            contentEditable
            suppressContentEditableWarning
            className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 outline-blue-500"
          >
            {info.intro || '고객의 현재 보장과 앞으로 필요한 준비를 함께 확인합니다.'}
          </p>
          <button
            type="button"
            className="mt-8 min-h-12 rounded-md px-6 text-base font-black text-slate-950"
            style={{ background: palette.accent }}
            onClick={(event) => {
              event.stopPropagation()
              onOpenTab(1)
            }}
          >
            {cta}
          </button>
        </section>
      </EditableSection>

      <EditableSection id="profile" onDelete={onDeleteSection}>
        <section className="grid gap-6 px-8 py-14 md:grid-cols-[180px_1fr]" onClick={() => onOpenTab(0)}>
          <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-md bg-slate-100">
            {info.profileImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={info.profileImg} alt={info.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-slate-400">프로필 사진</span>
            )}
          </div>
          <div>
            <p contentEditable suppressContentEditableWarning className="text-sm font-bold text-slate-500 outline-blue-500">
              {info.company || '소속 회사'} {info.branch && `· ${info.branch}`}
            </p>
            <h2 contentEditable suppressContentEditableWarning className="mt-2 text-3xl font-black outline-blue-500">
              {info.name || '설계사 이름'}
            </h2>
            <p contentEditable suppressContentEditableWarning className="mt-2 text-lg font-bold text-[#1A2744] outline-blue-500">
              {info.title || '전문 직함'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {info.consultFields.map((field) => (
                <span key={field} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                  {field}
                </span>
              ))}
            </div>
          </div>
        </section>
      </EditableSection>

      <EditableSection id="stats" onDelete={onDeleteSection}>
        <section className="grid gap-4 bg-slate-50 px-8 py-12 md:grid-cols-3" onClick={() => onOpenTab(0)}>
          {[
            ['누적 상담 수', info.stat1 || '상담 수 입력'],
            ['고객 만족도', info.stat2 || '만족도 입력'],
            ['평균 절감액', info.stat3 || '절감액 입력'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-200 bg-white p-6">
              <p className="text-sm font-bold text-slate-500">{label}</p>
              <p contentEditable suppressContentEditableWarning className="mt-2 text-3xl font-black text-[#1A2744] outline-blue-500">
                {value}
              </p>
            </div>
          ))}
        </section>
      </EditableSection>

      {state.extraSecs
        .filter((section) => !state.deletedSecs.includes(section.id))
        .map((section) => (
          <EditableSection key={section.id} id={section.id} onDelete={onDeleteSection}>
            <div
              className="px-8 py-12 [&_h2]:text-2xl [&_h2]:font-black [&_p]:mt-3 [&_p]:leading-7 [&_section]:rounded-md [&_section]:border [&_section]:border-slate-200 [&_section]:p-6"
              dangerouslySetInnerHTML={{ __html: section.html }}
            />
          </EditableSection>
        ))}
    </article>
  )
}

function CardPreview({ state, onOpenTab }: { state: BrandingState; onOpenTab: (tab: number) => void }) {
  const info = state.agentInfo
  const isLight = state.cardBg === '#f8fafc'

  return (
    <article
      className="min-h-[720px] px-5 pb-24 pt-5"
      style={{ background: state.cardBg, color: isLight ? '#0f172a' : '#fff' }}
      onClick={() => onOpenTab(1)}
    >
      <div className="overflow-hidden rounded-md bg-white/12 shadow-2xl backdrop-blur">
        <div className="flex h-56 items-center justify-center bg-black/15">
          {state.cardPhotoData || info.profileImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={state.cardPhotoData || info.profileImg} alt={info.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold opacity-70">사진 영역</span>
          )}
        </div>
        <div className="p-6">
          <p contentEditable suppressContentEditableWarning className="text-sm font-bold opacity-70 outline-blue-500">
            {info.company || '소속 회사'}
          </p>
          <h1 contentEditable suppressContentEditableWarning className="mt-2 text-3xl font-black outline-blue-500">
            {info.name || '설계사 이름'}
          </h1>
          <p contentEditable suppressContentEditableWarning className="mt-1 text-base font-bold opacity-80 outline-blue-500">
            {info.title || '전문 직함'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {state.cardTags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/20 px-3 py-2 text-sm font-bold">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md bg-white p-4 text-slate-900 shadow-xl">
        {[
          ['휴대전화', info.phone || '010-0000-0000'],
          ['유선전화', state.cardTel2 || '02-000-0000'],
          ['이메일', info.email || 'name@company.co.kr'],
          ['홈페이지', state.cardWebUrl || info.websiteUrl || 'www.site.co.kr'],
          ['주소', state.cardAddress || info.address || '주소 입력'],
        ].map(([label, value]) => (
          <div key={label} className="flex min-h-12 items-center justify-between border-b border-slate-100 last:border-0">
            <span className="text-sm font-bold text-slate-500">{label}</span>
            <span className="text-sm font-bold">{value}</span>
          </div>
        ))}
      </div>

      {state.cardShowBottomCta && (
        <div className="fixed bottom-4 left-1/2 z-10 grid w-[350px] -translate-x-1/2 grid-cols-2 gap-2">
          <button type="button" className="min-h-12 rounded-md bg-white text-sm font-black text-slate-900 shadow-xl">
            전화하기
          </button>
          <button type="button" className="min-h-12 rounded-md bg-[#FEE500] text-sm font-black text-slate-900 shadow-xl">
            카카오톡
          </button>
        </div>
      )}
    </article>
  )
}

function EditableSection({
  id,
  onDelete,
  children,
}: {
  id: string
  onDelete: (id: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="group relative" data-section-id={id}>
      <button
        type="button"
        className="sctrl absolute right-3 top-3 z-10 hidden h-9 rounded-md bg-red-600 px-3 text-sm font-bold text-white shadow group-hover:block"
        onClick={() => onDelete(id)}
      >
        삭제
      </button>
      {children}
    </div>
  )
}
