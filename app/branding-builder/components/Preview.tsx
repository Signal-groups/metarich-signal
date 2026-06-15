"use client"

import { forwardRef, useEffect, useMemo, useState } from 'react'
import { genCardHtml } from '../templates/card-builder'
import { loadExternalTemplate } from '../templates/external-loader'
import { genNavyHtml } from '../templates/ins-navy'
import { genBlueHtml } from '../templates/ins-blue'
import { genPurpleHtml } from '../templates/ins-purple'
import { genGreenHtml } from '../templates/ins-green'
import {
  CONCEPT_CTA, CONCEPT_HEADLINES, CONCEPT_LABELS, CONCEPT_PALETTES,
  LANDING_TEMPLATES,
  type BrandingState,
} from '../templates/types'

interface PreviewProps {
  state: BrandingState
  previewMode: 'desktop' | 'mobile'
  onDeleteSection: (id: string) => void
  onOpenTab: (tab: number) => void
}

const templateNameFallback: Record<string, string> = {
  'ins-navy': '다크 네이비 클래식',
  'ins-blue': '블루 프로페셔널',
  'ins-purple': '다크 퍼플 프리미엄',
  'ins-green': '그린 신뢰형',
  'ins-consult-real': '보험상담 풀버전',
  'ins-recruit-real': '리쿠르팅 풀버전',
  'ins-consult-simple': '보험상담 심플',
  'ins-recruit-simple': '리쿠르팅 심플',
  'ext-17': '보험증권 무료점검형',
  'ext-18': '보험 우선순위 진단형',
  'ext-19': '정착지원금 강조형',
  'ext-20': '월소득 성장 리쿠르팅형',
  'ext-21': '검증 조직 리쿠르팅형',
  'ext-22': '지원금 진단 리쿠르팅형',
  'ext-23': '커리어 스토리 리쿠르팅형',
}

const Preview = forwardRef<HTMLDivElement, PreviewProps>(function Preview(
  { state, previewMode, onDeleteSection, onOpenTab },
  ref,
) {
  const widthClass = previewMode === 'mobile' ? 'max-w-[390px]' : 'max-w-[960px]'
  const iframeH = previewMode === 'mobile' ? '750px' : 'calc(100vh - 140px)'

  const currentTemplate = LANDING_TEMPLATES.find((t) => t.id === state.landingTemplateId)
  const currentTemplateName = templateNameFallback[state.landingTemplateId] ?? currentTemplate?.name ?? '템플릿 선택'
  const concept = state.landingConcept ?? 'consult'
  const externalTemplateId = currentTemplate?.type === 'external' ? currentTemplate.id : null
  const externalTemplateFile = currentTemplate?.type === 'external' ? currentTemplate.file : undefined
  const externalLoadKey = useMemo(() => {
    if (!externalTemplateId || !externalTemplateFile) return null
    return JSON.stringify({ templateId: externalTemplateId, file: externalTemplateFile, agentInfo: state.agentInfo, concept, deletedSecs: state.deletedSecs })
  }, [externalTemplateId, externalTemplateFile, state.agentInfo, concept, state.deletedSecs])
  const [extHtmlState, setExtHtmlState] = useState<{ key: string; html: string } | null>(null)
  const extHtml = extHtmlState?.key === externalLoadKey ? extHtmlState.html : null

  const cardHtml = useMemo(() => {
    if (state.mode !== 'card') return null
    return genCardHtml(state)
  }, [state])

  const insHtml = useMemo(() => {
    if (state.mode !== 'landing' || currentTemplate?.type !== 'insurance') return null
    // TODO: opts.font, opts.color, opts.extraSecs 전달은 직접 관리 파일에서 처리
    const opts = { font: state.landingFont, color: state.landingColor, extraSecs: state.extraSecs, deletedSecs: state.deletedSecs }
    switch (state.landingTemplateId) {
      case 'ins-navy':   return genNavyHtml(state.agentInfo, concept, opts)
      case 'ins-blue':   return genBlueHtml(state.agentInfo, concept, opts)
      case 'ins-purple': return genPurpleHtml(state.agentInfo, concept, opts)
      case 'ins-green':  return genGreenHtml(state.agentInfo, concept, opts)
      default:           return null
    }
  }, [state.mode, state.landingTemplateId, state.agentInfo, concept, currentTemplate?.type, state.landingFont, state.landingColor, state.extraSecs, state.deletedSecs])
  // ext-* external template injects agentInfo into srcDoc after loading.
  useEffect(() => {
    if (state.mode !== 'landing' || !externalLoadKey || !externalTemplateId || !externalTemplateFile) return

    let active = true
    void loadExternalTemplate({
      templateId: externalTemplateId,
      file: externalTemplateFile,
      agentInfo: state.agentInfo,
      concept,
      deletedSecs: state.deletedSecs,
    })
      .then((html) => {
        if (active) setExtHtmlState({ key: externalLoadKey, html })
      })
      .catch(() => undefined)

    return () => { active = false }
  }, [state.mode, externalLoadKey, externalTemplateId, externalTemplateFile, state.agentInfo, concept, state.deletedSecs])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!externalLoadKey) return
      if (event.data?.type === '__BAI_DELETE_SECTION__' && typeof event.data.id === 'string') {
        onDeleteSection(event.data.id)
        if (typeof event.data.html === 'string') setExtHtmlState({ key: externalLoadKey, html: event.data.html })
        return
      }
      // __BAI_CHANGE__: 텍스트 편집 시 srcDoc 갱신하지 않음 (iframe 재로드 방지)
      // 다운로드 시 iframe.contentDocument에서 직접 읽음
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [externalLoadKey, onDeleteSection])

  const renderContent = () => {
    if (state.mode === 'card' && cardHtml) {
      return (
        <iframe
          key={`card-${state.cardTemplateId}-${state.cardBg}-${state.cardPhotoPos}-${state.cardShowBottomCta}`}
          srcDoc={cardHtml}
          className="w-full border-none block"
          style={{ height: iframeH }}
          title="디지털 명함 미리보기"
          sandbox="allow-same-origin allow-scripts"
        />
      )
    }
    // ext-* 외부 HTML은 정보 주입 후 srcDoc으로 렌더링하고, 로딩 전에는 원본 src로 표시한다.
    if (externalTemplateId && externalTemplateFile) {
      return (
        <iframe
          key={`${state.landingTemplateId}-${concept}-${state.landingFont}-${state.landingColor}`}
          srcDoc={extHtml ?? undefined}
          src={extHtml ? undefined : externalTemplateFile}
          className="w-full border-none block"
          style={{ height: iframeH }}
          title="외부 템플릿 미리보기"
          sandbox="allow-same-origin allow-scripts"
        />
      )
    }
    // ins-* 템플릿은 컨셉 선택 후 표시한다.
    if (currentTemplate?.type === 'insurance' && !state.landingConcept) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 bg-white p-12 text-center">
          <span className="text-5xl">◎</span>
          <p className="text-lg font-black text-slate-800">컨셉을 선택해주세요</p>
          <p className="max-w-xs text-sm leading-6 text-slate-500">
            왼쪽 패널 <strong>템플릿</strong> 탭에서 페이지 목적을 선택하면<br />
            헤드라인, 색상, CTA가 자동으로 완성됩니다.
          </p>
          <button type="button" className="mt-2 rounded-md bg-[#1A2744] px-5 py-2.5 text-sm font-bold text-white" onClick={() => onOpenTab(1)}>
            컨셉 선택하러 가기
          </button>
        </div>
      )
    }
    if (insHtml) {
      return (
        <iframe
          key={`${state.landingTemplateId}-${concept}-${state.landingFont}-${state.landingColor}`}
          srcDoc={insHtml}
          className="w-full border-none block"
          style={{ height: iframeH }}
          title="보험 전용 템플릿 미리보기"
          sandbox="allow-same-origin allow-scripts"
        />
      )
    }
    return (
      <div ref={ref} className="branding-preview-root bg-white">
        <LandingPreview state={state} onDeleteSection={onDeleteSection} onOpenTab={onOpenTab} />
      </div>
    )
  }

  return (
    <section className="min-w-0 flex-1 overflow-y-auto p-6">
      <div className="mx-auto mb-4 flex max-w-[960px] items-center justify-between text-sm text-slate-500">
        <span>
          {currentTemplateName}
          {state.landingConcept ? ` · ${CONCEPT_LABELS[state.landingConcept]}` : ''}
        </span>
        <span>{previewMode === 'mobile' ? '모바일 390px' : 'PC 960px'}</span>
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
        {renderContent()}
      </div>
    </section>
  )
})

export default Preview

function LandingPreview({ state, onDeleteSection, onOpenTab }: { state: BrandingState; onDeleteSection: (id: string) => void; onOpenTab: (tab: number) => void }) {
  const concept = state.landingConcept ?? 'consult'
  const headline = CONCEPT_HEADLINES[concept]
  const cta = CONCEPT_CTA[concept]
  const palette = CONCEPT_PALETTES[concept]
  const info = state.agentInfo

  return (
    <article style={{ fontFamily: state.landingFont }}>
      <EditableSection id="hero" onDelete={onDeleteSection}>
        <section className="relative overflow-hidden px-8 py-20" style={{ background: palette.heroBg, color: palette.heroText, borderBottom: `4px solid ${state.landingColor}` }} onClick={() => onOpenTab(2)}>
          <p contentEditable suppressContentEditableWarning className="mb-4 text-sm font-bold outline-blue-500" style={{ color: palette.accent }}>{info.brand || CONCEPT_LABELS[concept]}</p>
          <h1 contentEditable suppressContentEditableWarning className="max-w-2xl whitespace-pre-line text-4xl font-black leading-tight outline-blue-500">{info.slogan || headline}</h1>
          <p contentEditable suppressContentEditableWarning className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 outline-blue-500">{info.intro || '고객의 현재 보장과 앞으로 필요한 준비를 함께 확인합니다.'}</p>
          <button type="button" className="mt-8 min-h-12 rounded-md px-6 text-base font-black" style={{ background: palette.accent, color: palette.isDark ? '#fff' : '#1e293b' }} onClick={(e) => { e.stopPropagation(); onOpenTab(1) }}>{cta}</button>
        </section>
      </EditableSection>

      <EditableSection id="profile" onDelete={onDeleteSection}>
        <section className="grid gap-6 px-8 py-14 md:grid-cols-[180px_1fr]" onClick={() => onOpenTab(0)}>
          <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-md bg-slate-100">
            {info.profileImg
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={info.profileImg} alt={info.name} className="h-full w-full object-cover" />
              : <span className="text-sm font-bold text-slate-400">프로필 사진</span>}
          </div>
          <div>
            <p contentEditable suppressContentEditableWarning className="text-sm font-bold text-slate-500 outline-blue-500">{info.company || '소속 회사'} {info.branch && `· ${info.branch}`}</p>
            <h2 contentEditable suppressContentEditableWarning className="mt-2 text-3xl font-black outline-blue-500">{info.name || '설계사 이름'}</h2>
            <p contentEditable suppressContentEditableWarning className="mt-2 text-lg font-bold text-[#1A2744] outline-blue-500">{info.title || '전문 직함'}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {info.consultFields.map((field) => (<span key={field} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">{field}</span>))}
            </div>
          </div>
        </section>
      </EditableSection>

      <EditableSection id="stats" onDelete={onDeleteSection}>
        <section className="grid gap-4 bg-slate-50 px-8 py-12 md:grid-cols-3" onClick={() => onOpenTab(0)}>
          {[['누적 상담 수', info.stat1 || '상담 수 입력'], ['고객 만족도', info.stat2 || '만족도 입력'], ['평균 절감액', info.stat3 || '절감액 입력']].map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-200 bg-white p-6">
              <p className="text-sm font-bold text-slate-500">{label}</p>
              <p contentEditable suppressContentEditableWarning className="mt-2 text-3xl font-black text-[#1A2744] outline-blue-500">{value}</p>
            </div>
          ))}
        </section>
      </EditableSection>

      {state.extraSecs.filter((s) => !state.deletedSecs.includes(s.id)).map((s) => (
        <EditableSection key={s.id} id={s.id} onDelete={onDeleteSection}>
          <div className="px-8 py-12 [&_h2]:text-2xl [&_h2]:font-black [&_p]:mt-3 [&_p]:leading-7" dangerouslySetInnerHTML={{ __html: s.html }} />
        </EditableSection>
      ))}
    </article>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CardPreview({ state, onOpenTab }: { state: BrandingState; onOpenTab: (tab: number) => void }) {
  const info = state.agentInfo
  const isLight = state.cardBg === '#f8fafc'
  return (
    <article className="min-h-[720px] px-5 pb-24 pt-5" style={{ background: state.cardBg, color: isLight ? '#0f172a' : '#fff' }} onClick={() => onOpenTab(1)}>
      <div className="overflow-hidden rounded-md bg-white/10 shadow-2xl">
        <div className="flex h-56 items-center justify-center bg-black/15">
          {state.cardPhotoData || info.profileImg
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={state.cardPhotoData || info.profileImg} alt={info.name} className="h-full w-full object-cover" />
            : <span className="text-sm font-bold opacity-70">사진 영역</span>}
        </div>
        <div className="p-6">
          <p contentEditable suppressContentEditableWarning className="text-sm font-bold opacity-70 outline-blue-500">{info.company || '소속 회사'}</p>
          <h1 contentEditable suppressContentEditableWarning className="mt-2 text-3xl font-black outline-blue-500">{info.name || '설계사 이름'}</h1>
          <p contentEditable suppressContentEditableWarning className="mt-1 text-base font-bold opacity-80 outline-blue-500">{info.title || '전문 직함'}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {state.cardTags.map((tag) => (<span key={tag} className="rounded-full bg-white/20 px-3 py-2 text-sm font-bold">{tag}</span>))}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-md bg-white p-4 text-slate-900 shadow-xl">
        {[['휴대전화', info.phone || '010-0000-0000'], ['이메일', info.email || 'name@company.co.kr']].map(([label, value]) => (
          <div key={label} className="flex min-h-12 items-center justify-between border-b border-slate-100 last:border-0">
            <span className="text-sm font-bold text-slate-500">{label}</span>
            <span className="text-sm font-bold">{value}</span>
          </div>
        ))}
      </div>
      {state.cardShowBottomCta && (
        <div className="fixed bottom-4 left-1/2 z-10 grid w-[350px] -translate-x-1/2 grid-cols-2 gap-2">
          <button type="button" className="min-h-12 rounded-md bg-white text-sm font-black text-slate-900 shadow-xl">전화하기</button>
          <button type="button" className="min-h-12 rounded-md bg-[#FEE500] text-sm font-black text-slate-900 shadow-xl">카카오톡</button>
        </div>
      )}
    </article>
  )
}

function EditableSection({ id, onDelete, children }: { id: string; onDelete: (id: string) => void; children: React.ReactNode }) {
  return (
    <div className="group relative" data-section-id={id}>
      <button type="button" className="sctrl absolute right-3 top-3 z-10 hidden h-9 rounded-md bg-red-600 px-3 text-sm font-bold text-white shadow group-hover:block" onClick={() => onDelete(id)}>삭제</button>
      {children}
    </div>
  )
}
