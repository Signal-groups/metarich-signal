"use client"

import { useState } from 'react'
import { CONCEPT_LABELS } from '../../templates/types'
import type { BrandingState } from '../../templates/types'

const TIPS = [
  { icon: '✏️', title: '텍스트 직접 편집', desc: '미리보기에서 텍스트를 드래그하면 상단에 편집 툴바가 나타납니다.' },
  { icon: '🖼', title: '이미지 교체', desc: '정보 입력 탭에서 프로필 사진을 업로드하면 미리보기에 즉시 반영됩니다.' },
  { icon: '🗑', title: '섹션 삭제', desc: '미리보기에서 섹션 위에 마우스를 올리면 우측 상단에 삭제 버튼이 나타납니다.' },
  { icon: '📱', title: '모바일 확인', desc: '상단 툴바에서 모바일 뷰로 전환해 실제 스마트폰 비율(390px)로 확인하세요.' },
  { icon: '💾', title: '저장 / 불러오기', desc: '"저장"은 최신 상태를 자동 보관합니다. "슬롯저장"으로 버전별 스냅샷을 최대 5개 관리하세요.' },
]

const QUALITY = [
  { cat: '타이포그래피', items: ['폰트 2~3종 이내', '본문 줄간격 1.6~1.8'] },
  { cat: '컬러', items: ['메인 3색 이하', '포인트는 CTA에만'] },
  { cat: '레이아웃', items: ['섹션 여백 60px 이상', '카드 내부 24px 이상'] },
  { cat: '인상', items: ['3초 안에 핵심 메시지', 'CTA 버튼 눈에 띄게'] },
]

function buildPrompt(state: BrandingState): string {
  const info = state.agentInfo
  const concept = state.landingConcept ?? 'consult'
  const conceptLabel = CONCEPT_LABELS[concept]
  return `보험 설계사 랜딩페이지 문구를 작성해주세요.

설계사 정보:
- 이름: ${info.name || '(미입력)'}
- 직함: ${info.title || '(미입력)'}
- 소속: ${info.company || '(미입력)'}
- 브랜드명: ${info.brand || '(미입력)'}
- 상담 분야: ${info.consultFields.join(', ') || '(미입력)'}
- 슬로건: ${info.slogan || '(미입력)'}
- 컨셉: ${concept} (${conceptLabel})

작성 항목:
1. 히어로 헤드라인 (2줄, 임팩트 있게)
2. 히어로 서브텍스트 (1~2문장)
3. 이런 분께 필요합니다 — 고객 유형 4가지
4. 상담 분야별 한 줄 설명 (각 분야마다)
5. CTA 버튼 문구

보험 설계사 전문가 톤으로, 신뢰감과 전문성이 느껴지게 작성해주세요.`
}

interface TipPanelProps {
  state?: BrandingState
}

export default function TipPanel({ state }: TipPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!state) return
    const prompt = buildPrompt(state)
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <section className="space-y-6 pb-4">

      {/* AI 카피 생성 */}
      {state && (
        <div className="rounded-md border border-[#1A2744] bg-slate-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-black text-[#1A2744]">
            🤖 AI 카피 생성
          </h3>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">
            설계사 정보 + 현재 컨셉 기반 프롬프트를 자동 생성합니다.
            복사 후 Claude / ChatGPT에 붙여넣으면 전체 문구를 작성해줍니다.
          </p>
          <button
            type="button"
            className={`mt-3 w-full rounded-md py-2.5 text-sm font-bold transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-[#1A2744] text-white hover:bg-[#2D4A8A]'
            }`}
            onClick={handleCopy}
          >
            {copied ? '✓ 복사됨!' : '📋 프롬프트 복사'}
          </button>
          <div className="mt-3 max-h-36 overflow-y-auto rounded border border-slate-200 bg-white p-3">
            <pre className="whitespace-pre-wrap text-[10px] leading-4 text-slate-400">
              {buildPrompt(state)}
            </pre>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-black text-slate-900">미세 조정 팁</h2>
        <p className="mt-1 text-sm text-slate-500">더 완성도 높은 페이지를 만들기 위한 가이드입니다.</p>
      </div>

      <div className="space-y-3">
        {TIPS.map((tip) => (
          <div key={tip.title} className="rounded-md border border-slate-200 p-4">
            <p className="flex items-center gap-2 text-sm font-black text-slate-900">
              <span>{tip.icon}</span>
              {tip.title}
            </p>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">{tip.desc}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">품질 체크리스트</h3>
        <div className="space-y-3">
          {QUALITY.map((group) => (
            <div key={group.cat} className="rounded-md border border-slate-200 p-4">
              <p className="mb-2 text-xs font-black text-[#1A2744]">{group.cat}</p>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-0.5 text-[#C9A96E]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}
