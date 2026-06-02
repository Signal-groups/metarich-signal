"use client"

import { CONCEPT_LABELS, type BrandingState } from '../../templates/types'

interface TipPanelProps {
  state: BrandingState
}

const editTips = [
  {
    title: '텍스트 직접 편집',
    body: '오른쪽 미리보기의 제목, 문장, 버튼 문구를 클릭한 뒤 바로 수정합니다. 드래그 선택하면 상단에 글자 편집 툴바가 뜹니다.',
  },
  {
    title: '이미지 교체',
    body: '프로필 사진이나 명함 사진 영역을 클릭해 설계사 사진으로 교체합니다. 정면 사진 1장만 좋아도 완성도가 크게 올라갑니다.',
  },
  {
    title: '섹션 삭제',
    body: '필요 없는 영역은 미리보기 섹션 위에 마우스를 올린 뒤 삭제 버튼으로 정리합니다. 짧고 명확한 페이지가 전환에 유리합니다.',
  },
  {
    title: '모바일 확인',
    body: '상단의 모바일 미리보기로 전환해 첫 화면에 이름, 핵심 메시지, 상담 버튼이 보이는지 확인합니다.',
  },
  {
    title: '저장과 불러오기',
    body: '저장은 최신 작업을 빠르게 보관하고, 슬롯 저장은 이름을 붙여 최대 5개까지 버전을 남길 때 사용합니다.',
  },
]

const qualityChecks = [
  '타이포그래피: 폰트 2-3종 이내, 본문 줄간격 1.6-1.8',
  '컬러: 메인 3색 이하, 포인트 색상은 CTA에 집중',
  '레이아웃: 섹션 여백 60px 이상, 카드 내부 여백 24px 이상',
  '인상: 3초 안에 핵심 메시지와 상담 버튼이 보여야 함',
]

export default function TipPanel({ state }: TipPanelProps) {
  const concept = state.landingConcept ?? 'consult'
  const conceptLabel = CONCEPT_LABELS[concept]
  const info = state.agentInfo
  const prompt = `보험 설계사 랜딩페이지 문구를 작성해주세요.

설계사 정보:
- 이름: ${info.name || '미입력'}
- 직함: ${info.title || '미입력'}
- 소속: ${info.company || '미입력'}
- 브랜드명: ${info.brand || '미입력'}
- 상담 분야: ${info.consultFields.join(', ') || '미입력'}
- 슬로건: ${info.slogan || '미입력'}
- 컨셉: ${concept} (${conceptLabel})

작성 항목:
1. 히어로 헤드라인 (2줄, 임팩트 있게)
2. 히어로 서브텍스트 (1~2문장)
3. 상담이 필요한 고객 유형 4가지
4. 상담 분야별 1줄 설명 (각 분야마다)
5. CTA 버튼 문구

보험 설계사 전문가 톤으로, 신뢰감과 전문성이 느껴지게 작성해주세요.`

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt)
  }

  return (
    <section>
      <h2 className="text-lg font-black text-slate-900">미세조정 팁</h2>
      <p className="mt-1 text-sm text-slate-500">다운로드 전 마지막으로 확인할 항목입니다.</p>

      <div className="mt-5 space-y-3">
        {editTips.map((tip) => (
          <div key={tip.title} className="rounded-md border border-slate-200 p-4">
            <p className="text-sm font-black text-slate-900">{tip.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{tip.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 rounded-md border border-[#1A2744]/20 bg-slate-50 p-4">
        <h3 className="text-sm font-black text-slate-900">AI 카피 생성 프롬프트</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          복사 후 Claude/ChatGPT에 붙여넣으면 전체 문구를 자동 작성해줍니다.
        </p>
        <textarea
          readOnly
          className="mt-3 h-40 w-full resize-none rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700 outline-none"
          value={prompt}
        />
        <button
          type="button"
          className="mt-3 h-10 w-full rounded-md bg-[#1A2744] text-sm font-black text-white hover:bg-[#2D4A8A]"
          onClick={copyPrompt}
        >
          프롬프트 복사
        </button>
      </div>

      <div className="mt-7">
        <h3 className="text-sm font-black text-slate-900">품질 체크리스트</h3>
        <div className="mt-3 space-y-2">
          {qualityChecks.map((check) => (
            <label key={check} className="flex min-h-12 items-center gap-3 rounded-md border border-slate-200 px-3 text-sm font-semibold">
              <input type="checkbox" className="h-4 w-4 accent-[#1A2744]" />
              {check}
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}
