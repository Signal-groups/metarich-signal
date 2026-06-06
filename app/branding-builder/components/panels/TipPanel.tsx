"use client"

import { useMemo, useState } from 'react'
import { CONCEPT_LABELS, type BrandingState, type LandingConcept } from '../../templates/types'

export interface BrandingCopyJson {
  slogan?: string
  intro?: string
  heroHeadline?: string
  painPoints?: string[]
  serviceDescs?: Record<string, string>
  ctaText?: string
  faq?: { q: string; a: string }[]
  reviews?: { text: string; author: string }[]
}

export interface GeneratedSection {
  id: string
  html: string
}

interface TipPanelProps {
  state: BrandingState
  onApplyCopy: (copy: BrandingCopyJson, sections: GeneratedSection[]) => void
}

const jsonExample = JSON.stringify(
  {
    slogan: '내 보험, 지금 기준으로 다시 점검합니다',
    intro: '보장 공백과 중복 보험료를 함께 확인하고 고객의 생활 흐름에 맞는 보험 구조를 제안합니다.',
    heroHeadline: '내 보험,\n지금 기준으로 다시 점검해보셨나요?',
    painPoints: ['갱신형 보험이 많아 부담되는 분', '보험료는 내고 있지만 보장 내용이 불안한 분'],
    serviceDescs: {
      보장분석: '현재 보험 증권 기반으로 보장 공백과 중복을 확인합니다.',
      '보험 리모델링': '불필요한 보험료는 줄이고 필요한 보장은 남기는 방향을 제안합니다.',
    },
    ctaText: '무료 상담 신청하기',
    faq: [{ q: '비용이 드나요?', a: '상담은 무료로 진행됩니다.' }],
    reviews: [{ text: '보험을 이해하기 쉽게 정리해줘서 좋았습니다.', author: '30대 고객' }],
  },
  null,
  2,
)

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildPrompt(state: BrandingState) {
  const info = state.agentInfo
  const concept = state.landingConcept ?? 'consult'
  const conceptLabel = CONCEPT_LABELS[concept as LandingConcept]

  return `보험 설계사 랜딩페이지 문구를 작성해주세요.

진행 방식:
1. 아래 설계사 정보와 페이지 목적을 기준으로 작성합니다.
2. 보험 상담, 보험 청구, 리쿠르팅, 연금/은퇴 등 선택한 컨셉에 맞춰 문구를 구성합니다.
3. 최근 보험 이슈나 제도 표현이 필요한 경우 웹에서 한 번 더 교차 확인하되, 과장 없이 제안합니다.
4. 최종 답변은 설명 없이 JSON만 출력합니다.

설계사 정보:
- 이름: ${info.name || '(미입력)'}
- 직함: ${info.title || '(미입력)'}
- 소속: ${info.company || '(미입력)'}
- 지점: ${info.branch || '(미입력)'}
- 브랜드명: ${info.brand || '(미입력)'}
- 상담 분야: ${info.consultFields.join(', ') || '보장분석, 보험 리모델링'}
- 현재 슬로건: ${info.slogan || '(미입력)'}
- 현재 소개문: ${info.intro || '(미입력)'}
- 페이지 컨셉: ${conceptLabel}

JSON 규격:
${jsonExample}

작성 기준:
- 한국 보험 소비자가 이해하기 쉬운 표현을 사용합니다.
- 불안 조장, 허위 보장, 과장 광고 표현은 피합니다.
- heroHeadline은 줄바꿈을 \\n으로 넣습니다.
- painPoints는 4개를 권장합니다.
- faq는 3~5개를 권장합니다.
- reviews는 실제 후기처럼 보이되, 허위 설명은 쓰지 말고 예시 톤으로 작성합니다.`
}

function buildPainPointHtml(items: string[]) {
  return `<section style="padding:56px 24px;background:#f8fafc">
  <div style="max-width:720px;margin:0 auto">
    <h2 style="font-size:24px;font-weight:900;margin:0 0 20px;color:#0b1e5f">이런 고민이 있다면 상담이 필요합니다</h2>
    <div style="display:grid;gap:12px">
      ${items.map((item) => `<div style="padding:18px 20px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;font-size:15px;font-weight:700;color:#1e293b">${escapeHtml(item)}</div>`).join('')}
    </div>
  </div>
</section>`
}

function buildServiceHtml(serviceDescs: Record<string, string>) {
  return `<section style="padding:56px 24px;background:#fff">
  <div style="max-width:720px;margin:0 auto">
    <h2 style="font-size:24px;font-weight:900;margin:0 0 20px;color:#0b1e5f">상담 분야</h2>
    <div style="display:grid;gap:12px">
      ${Object.entries(serviceDescs).map(([title, desc]) => `
      <div style="padding:20px;border:1px solid #e2e8f0;border-radius:12px">
        <h3 style="font-size:16px;font-weight:900;margin:0 0 8px;color:#1e293b">${escapeHtml(title)}</h3>
        <p style="font-size:14px;line-height:1.7;margin:0;color:#475569">${escapeHtml(desc)}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`
}

function buildFaqHtml(faq: { q: string; a: string }[]) {
  return `<section style="padding:56px 24px;background:#f8fafc">
  <div style="max-width:720px;margin:0 auto">
    <h2 style="font-size:24px;font-weight:900;margin:0 0 20px;color:#0b1e5f">자주 묻는 질문</h2>
    ${faq.map((item) => `
    <details style="border:1px solid #e2e8f0;border-radius:12px;margin-bottom:10px;overflow:hidden;background:#fff">
      <summary style="padding:16px 20px;font-size:15px;font-weight:800;cursor:pointer">${escapeHtml(item.q)}</summary>
      <p style="padding:0 20px 18px;font-size:14px;line-height:1.7;color:#475569">${escapeHtml(item.a)}</p>
    </details>`).join('')}
  </div>
</section>`
}

function buildReviewHtml(reviews: { text: string; author: string }[]) {
  return `<section style="padding:56px 24px;background:#fff">
  <div style="max-width:720px;margin:0 auto">
    <h2 style="font-size:24px;font-weight:900;margin:0 0 20px;color:#0b1e5f">상담 후기</h2>
    <div style="display:grid;gap:12px">
      ${reviews.map((review) => `
      <div style="padding:20px;border:1px solid #e2e8f0;border-radius:12px;background:#fff">
        <p style="font-size:15px;line-height:1.7;margin:0 0 10px;color:#1e293b">"${escapeHtml(review.text)}"</p>
        <p style="font-size:13px;font-weight:800;margin:0;color:#64748b">${escapeHtml(review.author)}</p>
      </div>`).join('')}
    </div>
  </div>
</section>`
}

function buildGeneratedSections(copy: BrandingCopyJson): GeneratedSection[] {
  const stamp = Date.now()
  const sections: GeneratedSection[] = []
  if (copy.painPoints?.length) sections.push({ id: `ai-pain-${stamp}`, html: buildPainPointHtml(copy.painPoints) })
  if (copy.serviceDescs && Object.keys(copy.serviceDescs).length > 0) sections.push({ id: `ai-service-${stamp}`, html: buildServiceHtml(copy.serviceDescs) })
  if (copy.faq?.length) sections.push({ id: `ai-faq-${stamp}`, html: buildFaqHtml(copy.faq) })
  if (copy.reviews?.length) sections.push({ id: `ai-review-${stamp}`, html: buildReviewHtml(copy.reviews) })
  return sections
}

function parseJson(text: string): BrandingCopyJson {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('JSON을 찾을 수 없습니다.')
  return JSON.parse(match[0]) as BrandingCopyJson
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.top = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
  }
}

export default function TipPanel({ state, onApplyCopy }: TipPanelProps) {
  const [copied, setCopied] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [message, setMessage] = useState('')
  const prompt = useMemo(() => buildPrompt(state), [state])

  const handleCopyPrompt = async () => {
    const ok = await copyToClipboard(prompt)
    setCopied(ok)
    setMessage(ok ? '프롬프트를 복사했습니다.' : '복사에 실패했습니다. 미리보기 문구를 직접 선택해 복사해주세요.')
    window.setTimeout(() => setCopied(false), 1800)
  }

  const handleApplyJson = () => {
    try {
      const copy = parseJson(jsonText)
      onApplyCopy(copy, buildGeneratedSections(copy))
      setJsonText('')
      setMessage('JSON 내용을 빌더에 반영했습니다.')
    } catch {
      setMessage('JSON 형식을 확인해주세요. GPTs 답변 전체를 그대로 붙여넣어도 됩니다.')
    }
  }

  return (
    <section className="space-y-5 pb-4">
      <div>
        <h2 className="text-lg font-black text-slate-900">AI 문구 생성</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          정보를 입력한 뒤 프롬프트를 복사하고, GPTs 또는 Claude에서 받은 JSON을 붙여넣으면 페이지 문구와 섹션이 자동 반영됩니다.
        </p>
      </div>

      <div className="rounded-md border border-[#1A2744] bg-slate-50 p-4">
        <p className="text-sm font-black text-[#1A2744]">1. 프롬프트 복사</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">복사 후 GPTs/Claude에 붙여넣고 JSON으로 응답받으세요.</p>
        <button
          type="button"
          className="mt-3 h-10 w-full rounded-md bg-[#1A2744] text-sm font-bold text-white hover:bg-[#2D4A8A]"
          onClick={handleCopyPrompt}
        >
          {copied ? '복사 완료' : '프롬프트 복사'}
        </button>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-bold text-slate-500">프롬프트 미리보기</summary>
          <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
            {prompt}
          </pre>
        </details>
      </div>

      <div className="rounded-md border border-slate-200 p-4">
        <p className="text-sm font-black text-slate-900">2. AI JSON 붙여넣기</p>
        <textarea
          className="mt-3 h-48 w-full resize-none rounded-md border border-slate-300 p-3 text-xs leading-5 outline-none focus:border-[#1A2744]"
          placeholder={jsonExample}
          value={jsonText}
          onChange={(event) => {
            setJsonText(event.target.value)
            setMessage('')
          }}
        />
        {message && <p className="mt-2 text-xs font-bold text-slate-600">{message}</p>}
        <button
          type="button"
          className="mt-3 h-10 w-full rounded-md bg-[#C9A96E] text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          onClick={handleApplyJson}
          disabled={!jsonText.trim()}
        >
          빌더에 자동 반영
        </button>
      </div>

      <div className="rounded-md border border-slate-200 p-4">
        <p className="text-sm font-black text-slate-900">작업 흐름</p>
        <ol className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
          <li>1. 정보 탭에서 이름, 소속, 상담 분야를 입력합니다.</li>
          <li>2. 프롬프트를 복사해 GPTs/Claude에 붙여넣습니다.</li>
          <li>3. JSON 답변을 아래 입력칸에 붙여넣습니다.</li>
          <li>4. 자동 반영 후 마음에 안 드는 부분만 미리보기에서 수정합니다.</li>
          <li>5. 완성된 랜딩페이지 또는 명함 HTML을 다운로드합니다.</li>
        </ol>
      </div>
    </section>
  )
}
