// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// copy-library.ts — 보험 설계사 전용 자동 문구 라이브러리
// 직접 관리 파일. Codex 수정 금지.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { AgentInfo, LandingConcept } from './types'
import { CONCEPT_PALETTES } from './types'

export interface GeneratedCopy {
  slogan: string
  intro: string
  painPoints: string[]
  fieldDescs: Record<string, string>
  ctaLine: string
  stat1: string
  stat2: string
  stat3: string
}

const PAIN_POINTS: Record<LandingConcept, string[]> = {
  consult: [
    '갱신형 보험이 많아 보험료 부담이 큰 분',
    '실손보험 세대가 바뀌었는지 확인 못 하신 분',
    '보장 공백이 있는지 점검하고 싶은 분',
    '보험료는 줄이고 보장은 제대로 채우고 싶은 분',
  ],
  remodeling: [
    '매달 보험료가 30만 원을 넘어 부담되는 분',
    '갱신형·CI보험이 여러 개 있는 분',
    '오래된 보험을 최신 기준으로 정리하고 싶은 분',
    '중복 보장을 제거하고 실질 보장을 높이고 싶은 분',
  ],
  pension: [
    '노후 준비를 언제 시작해야 할지 막막한 분',
    '국민연금만으로 노후가 부족할까 걱정되는 분',
    '연금보험·연금저축 차이가 헷갈리는 분',
    '은퇴 후 월 생활비를 지금부터 설계하고 싶은 분',
  ],
  product: [
    '어떤 보험이 나에게 맞는지 모르는 분',
    '가입 전 정확한 보장 내용을 확인하고 싶은 분',
    '보험사 광고보다 전문가 설명이 필요한 분',
    '같은 보장 더 저렴하게 가입하고 싶은 분',
  ],
  claim: [
    '보험금 청구 서류가 복잡해서 포기한 적 있는 분',
    '청구 가능한 항목을 몰라서 손해 본 것 같은 분',
    '입원·수술 후 보험금 청구를 대신해줄 분이 필요한 분',
    '청구 거절을 이의신청하고 싶은 분',
  ],
  recruit: [
    '혼자 영업하는 것이 한계를 느끼는 설계사',
    '체계적인 교육과 시스템을 원하는 분',
    'DB 없이 고객을 찾는 것이 힘든 분',
    '수입의 천장을 스스로 높이고 싶은 분',
  ],
  travel: [
    '이번 여행 시책 조건이 헷갈리는 분',
    '시책 달성 후 신청 방법이 궁금한 분',
    '팀원들과 함께 목표를 달성하고 싶은 분',
    '시책 혜택을 빠짐없이 받고 싶은 분',
  ],
  retirement: [
    '은퇴 시점이 다가와 재무 점검이 필요한 분',
    '노후 의료비가 가장 걱정인 분',
    '퇴직금과 연금을 연계해 설계하고 싶은 분',
    '배우자와 함께 은퇴 준비를 시작하려는 분',
  ],
}

const SLOGANS: Record<LandingConcept, string> = {
  consult:    '내 보험, 지금 기준으로 다시 점검합니다',
  remodeling: '보험료는 줄이고, 보장은 다시 채웁니다',
  pension:    '은퇴 후 월 수입, 지금부터 설계합니다',
  product:    '지금 꼭 알아야 할 보험 핵심 정보',
  claim:      '복잡한 보험 청구, 제가 함께 해드립니다',
  recruit:    '혼자 영업하지 않는 설계사 조직',
  travel:     '함께 만드는 실적, 함께 떠나는 여행',
  retirement: '은퇴 후 삶, 지금부터 함께 설계합니다',
}

const INTROS: Record<LandingConcept, string> = {
  consult:    '보장 공백과 중복 보험료를 함께 확인하고, 고객의 생활 흐름에 맞는 보험 구조를 제안합니다.',
  remodeling: '가입 당시와 달라진 상황에 맞게 보험을 재구성해, 꼭 필요한 보장만 남깁니다.',
  pension:    '연금보험·연금저축·IRP를 연계해 세금 혜택을 극대화하고, 안정적인 노후 소득 구조를 만들어 드립니다.',
  product:    '수십 개 보험사의 상품을 비교 분석해, 고객에게 가장 적합한 조합을 추천합니다.',
  claim:      '진단서·영수증 준비부터 보험사 청구까지 전 과정을 함께 도와드립니다.',
  recruit:    'DB 영업·상담 화법·콘텐츠 자동화까지, 함께 성장하는 시스템으로 설계사의 수입 천장을 높입니다.',
  travel:     '이번 시책 목표와 조건을 정리해, 팀원 모두가 혜택을 받을 수 있도록 안내합니다.',
  retirement: '자산 현황 파악부터 연금 설계, 의료비 대비까지 은퇴 전 꼭 점검해야 할 모든 것을 함께 준비합니다.',
}

const FIELD_DESCS: Record<string, string> = {
  '보장분석':        '현재 보험 증권을 기반으로 보장 공백·과납 항목을 분석합니다',
  '보험 리모델링':   '갱신형·CI보험을 정리하고 최적 보험 구조로 재설계합니다',
  '실손보험 점검':   '1~4세대 실손 변경 사항을 확인하고 불필요한 중복을 제거합니다',
  '연금 상담':       '연금보험·연금저축·IRP를 비교해 최적 포트폴리오를 제안합니다',
  '암·뇌·심장 보장': '3대 중증질환 보장 수준을 현재 의료비 기준으로 점검합니다',
  '보험청구 도움':   '진단서·영수증 준비부터 청구까지 전 과정을 함께 진행합니다',
  '입사 상담':       '설계사 커리어 전반과 당사 시스템을 자세히 안내해 드립니다',
  '노후 설계':       '은퇴 시점 기준 필요 자산과 월 소득 목표를 함께 계산합니다',
}

/** 컨셉 + 설계사 정보 기반 전문 문구 자동 생성 */
export function generateCopy(info: AgentInfo, concept: LandingConcept): Partial<AgentInfo> {
  const slogan = info.slogan || SLOGANS[concept]
  const intro  = info.intro  || INTROS[concept]

  // 상담 분야별 설명 맵 생성
  const fieldDescs: Record<string, string> = {}
  info.consultFields.forEach((field) => {
    fieldDescs[field] = FIELD_DESCS[field] ?? `${field} 관련 1:1 맞춤 상담을 진행합니다`
  })

  // 실적 기본값
  const stat1 = info.stat1 || '1,000건+'
  const stat2 = info.stat2 || '97%'
  const stat3 = info.stat3 || '월 20만원'

  return { slogan, intro, stat1, stat2, stat3 }
}

export { PAIN_POINTS, SLOGANS, INTROS, FIELD_DESCS }
export { CONCEPT_PALETTES }
