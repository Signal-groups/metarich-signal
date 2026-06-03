// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 설계사 브랜딩 빌더 타입 정의
// 직접 관리 파일. Codex 수정 금지.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 설계사 기본 정보 ──
export interface AgentInfo {
  name: string; title: string; company: string; branch: string; brand: string; profileImg: string
  phone: string; email: string; fax: string; kakaoUrl: string; smsNumber: string
  consultUrl: string; recruitUrl: string; address: string
  blogUrl: string; instagramUrl: string; youtubeUrl: string; cafeUrl: string; websiteUrl: string
  extraLinks: { label: string; url: string }[]
  qualifications: string[]
  consultFields: string[]
  slogan: string; intro: string
  stat1: string; stat2: string; stat3: string
}

export const DEFAULT_AGENT_INFO: AgentInfo = {
  name: '', title: 'AFPK 재무설계사', company: '', branch: '', brand: '', profileImg: '',
  phone: '', email: '', fax: '', kakaoUrl: '', smsNumber: '',
  consultUrl: '', recruitUrl: '', address: '',
  blogUrl: '', instagramUrl: '', youtubeUrl: '', cafeUrl: '', websiteUrl: '',
  extraLinks: [],
  qualifications: [],
  consultFields: ['보장분석', '보험 리모델링', '실손보험 점검'],
  slogan: '', intro: '', stat1: '', stat2: '', stat3: '',
}

// ── 컨셉(목적) ──
export type LandingConcept =
  | 'consult' | 'remodeling' | 'pension' | 'product'
  | 'claim' | 'recruit' | 'travel' | 'retirement'

export const CONCEPT_LABELS: Record<LandingConcept, string> = {
  consult: '보험상담', remodeling: '리모델링', pension: '연금/노후설계', product: '상품안내',
  claim: '보험청구 도움', recruit: '리쿠르팅(모집)', travel: '여행/시책', retirement: '노후/은퇴설계',
}

export const CONCEPT_HEADLINES: Record<LandingConcept, string> = {
  consult:    '내 보험, 지금 기준으로\n다시 점검해보셨나요?',
  remodeling: '보험료는 줄이고\n보장은 다시 채웁니다',
  pension:    '은퇴 후 월 ○○만원,\n지금부터 준비하세요',
  product:    '지금 꼭 알아야 할\n보험 핵심 정보',
  claim:      '보험 청구 절차가\n복잡하다면 도와드립니다',
  recruit:    '혼자 영업하지 않는\n설계사 조직',
  travel:     '함께 만드는 실적,\n함께 떠나는 여행',
  retirement: '은퇴 후 삶,\n지금부터 설계합니다',
}

export const CONCEPT_CTA: Record<LandingConcept, string> = {
  consult: '📋 무료 상담 신청하기', remodeling: '🔍 무료 점검 신청하기',
  pension: '📊 연금 상담 신청하기', product: '💬 상품 문의하기',
  claim: '📞 청구 도움 신청하기', recruit: '🚀 입사 지원하기',
  travel: '✈️ 시책 신청하기', retirement: '📅 은퇴 설계 상담하기',
}

// ── 폰트 시스템 ──
export interface FontOption {
  id: string; name: string; css: string; cdnImport: string; tags: string[]
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'pretendard', name: 'Pretendard (기본 추천)',
    css: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    cdnImport: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
    tags: ['범용', 'IT', '금융'],
  },
  {
    id: 'noto-serif-kr', name: 'Noto Serif KR (신뢰/권위)',
    css: "'Noto Serif KR', 'Pretendard', serif",
    cdnImport: "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap",
    tags: ['연금', '노후', '프리미엄'],
  },
  {
    id: 'ibm-plex-kr', name: 'IBM Plex Sans KR (데이터/보고서)',
    css: "'IBM Plex Sans KR', 'Pretendard', sans-serif",
    cdnImport: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap",
    tags: ['보장분석', '데이터', '기업'],
  },
  {
    id: 'noto-sans-kr', name: 'Noto Sans KR (친근/범용)',
    css: "'Noto Sans KR', sans-serif",
    cdnImport: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap",
    tags: ['보험청구', '친근', '안전'],
  },
  {
    id: 'playfair', name: 'Playfair + Pretendard (럭셔리)',
    css: "'Pretendard', sans-serif",
    cdnImport: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap",
    tags: ['리쿠르팅', '다크', '골드'],
  },
  {
    id: 'cormorant', name: 'Cormorant Garamond (초고급 프리미엄)',
    // 영문 헤드라인 전용. 본문 사용 금지. 연금 프리미엄 변형.
    css: "'Cormorant Garamond', 'Pretendard', serif",
    cdnImport: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&display=swap",
    tags: ['연금', '초고급', '프리미엄'],
  },
]

export const CONCEPT_FONTS: Record<LandingConcept, string> = {
  consult: 'pretendard', remodeling: 'pretendard',
  pension: 'noto-serif-kr', product: 'ibm-plex-kr',
  claim: 'noto-sans-kr', recruit: 'playfair',
  travel: 'noto-sans-kr', retirement: 'noto-serif-kr',
}

// ── 컨셉별 컬러 팔레트 (60-30-10) ──
export interface ConceptPalette {
  bg: string; sub: string; accent: string
  heroBg: string; heroText: string; isDark: boolean
}

export const CONCEPT_PALETTES: Record<LandingConcept, ConceptPalette> = {
  consult:    { bg: '#ffffff', sub: '#0A1628', accent: '#2563eb', heroBg: 'linear-gradient(160deg,#0b1e5f,#1d4ed8 60%,#3b82f6)', heroText: '#ffffff', isDark: false },
  remodeling: { bg: '#f8fafc', sub: '#0b1e5f', accent: '#d4af37', heroBg: 'linear-gradient(135deg,#0b1e5f,#0e2882)', heroText: '#ffffff', isDark: false },
  pension:    { bg: '#0a0f1e', sub: '#1a2a4a', accent: '#c8a050', heroBg: 'linear-gradient(160deg,#0a0f1e,#1a2a4a)', heroText: '#faf9f6', isDark: true },
  product:    { bg: '#f8f9fc', sub: '#0A1628', accent: '#5B6EF5', heroBg: 'linear-gradient(135deg,#0A1628,#1E3A5F)', heroText: '#ffffff', isDark: false },
  claim:      { bg: '#fff5f5', sub: '#ffffff', accent: '#FF5A5F', heroBg: 'linear-gradient(135deg,#FF5A5F,#FF8A5C)', heroText: '#ffffff', isDark: false },
  recruit:    { bg: '#0a0a0a', sub: '#1a1a1a', accent: '#f7d571', heroBg: 'linear-gradient(135deg,#0a0a0a,#1a1a2e)', heroText: '#ffffff', isDark: true },
  travel:     { bg: '#0f0c29', sub: '#1a1540', accent: '#667eea', heroBg: 'linear-gradient(135deg,#0f0c29,#302b63)', heroText: '#ffffff', isDark: true },
  retirement: { bg: '#0a0f1e', sub: '#1a2a4a', accent: '#c8a050', heroBg: 'linear-gradient(160deg,#0a0f1e,#1a2a4a)', heroText: '#faf9f6', isDark: true },
}

// ── 랜딩페이지 템플릿 ──
export type LandingTemplateId =
  | 'ins-navy' | 'ins-blue' | 'ins-purple' | 'ins-green'
  | 'ins-consult-real' | 'ins-recruit-real' | 'ins-consult-simple' | 'ins-recruit-simple'
  | 'ext-01' | 'ext-02' | 'ext-03' | 'ext-04' | 'ext-05' | 'ext-06' | 'ext-07' | 'ext-08'
  | 'ext-09' | 'ext-10' | 'ext-11' | 'ext-12' | 'ext-13' | 'ext-14' | 'ext-15' | 'ext-16'

export interface LandingTemplateMeta {
  id: LandingTemplateId; name: string
  category: '보험 전용' | '프리미엄' | '임팩트' | '전문/데이터' | '교육/전문' | '서비스' | '테크'
  accentColor: string; type: 'insurance' | 'external'; file?: string
}

export const LANDING_TEMPLATES: LandingTemplateMeta[] = [
  // ── 보험 전용 (생성형) ──
  { id: 'ins-navy',   name: '다크 네이비 클래식',  category: '보험 전용', accentColor: '#0b1e5f', type: 'insurance' },
  { id: 'ins-blue',   name: '블루 프로페셔널',     category: '보험 전용', accentColor: '#2563eb', type: 'insurance' },
  { id: 'ins-purple', name: '다크 퍼플 프리미엄',  category: '보험 전용', accentColor: '#4c1d95', type: 'insurance' },
  { id: 'ins-green',  name: '그린 신뢰형',         category: '보험 전용', accentColor: '#064e3b', type: 'insurance' },
  // ── 보험 전용 (실제 광고 기반) ──
  { id: 'ins-consult-real',   name: '보험상담 풀버전',   category: '보험 전용', accentColor: '#2563eb', type: 'external', file: '/branding-templates/ins-consult-real.html' },
  { id: 'ins-recruit-real',   name: '리쿠르팅 풀버전',   category: '보험 전용', accentColor: '#1a3a9f', type: 'external', file: '/branding-templates/ins-recruit-real.html' },
  { id: 'ins-consult-simple', name: '보험상담 심플',      category: '보험 전용', accentColor: '#1d4ed8', type: 'external', file: '/branding-templates/ins-consult-simple.html' },
  { id: 'ins-recruit-simple', name: '리쿠르팅 심플',      category: '보험 전용', accentColor: '#1e3a8a', type: 'external', file: '/branding-templates/ins-recruit-simple.html' },
  { id: 'ext-01', name: '다이닝 프리미엄형',    category: '프리미엄',    accentColor: '#0a0f1e', type: 'external', file: '/branding-templates/template-01.html' },
  { id: 'ext-02', name: '다이닝 엘레강스형',    category: '프리미엄',    accentColor: '#0a0f1e', type: 'external', file: '/branding-templates/template-02.html' },
  { id: 'ext-03', name: '아카데미 클린형',      category: '교육/전문',   accentColor: '#e8f0fe', type: 'external', file: '/branding-templates/template-03.html' },
  { id: 'ext-04', name: '다크 퍼플 임팩트형',  category: '임팩트',      accentColor: '#0a0820', type: 'external', file: '/branding-templates/template-04.html' },
  { id: 'ext-05', name: '대시보드 보고서형',   category: '전문/데이터', accentColor: '#f5f8fc', type: 'external', file: '/branding-templates/template-05.html' },
  { id: 'ext-06', name: '브랜드 혁신 제안형',  category: '전문/데이터', accentColor: '#fffaf5', type: 'external', file: '/branding-templates/template-06.html' },
  { id: 'ext-07', name: '아틀리에 베이지형',   category: '프리미엄',    accentColor: '#f9f7f4', type: 'external', file: '/branding-templates/template-07.html' },
  { id: 'ext-08', name: '볼드 크림 에너지형',  category: '임팩트',      accentColor: '#f5f0eb', type: 'external', file: '/branding-templates/template-08.html' },
  { id: 'ext-09', name: '다크 그로스형',       category: '임팩트',      accentColor: '#0a0d12', type: 'external', file: '/branding-templates/template-09.html' },
  { id: 'ext-10', name: '다크 네이비 전문형',  category: '전문/데이터', accentColor: '#0d1424', type: 'external', file: '/branding-templates/template-10.html' },
  { id: 'ext-11', name: '다크 퍼플 스튜디오형',category: '임팩트',      accentColor: '#0f0820', type: 'external', file: '/branding-templates/template-11.html' },
  { id: 'ext-12', name: '라이트 전문형',       category: '전문/데이터', accentColor: '#f5f8fc', type: 'external', file: '/branding-templates/template-12.html' },
  { id: 'ext-13', name: '화이트 컨설팅형',     category: '전문/데이터', accentColor: '#f7f7f4', type: 'external', file: '/branding-templates/template-13.html' },
  { id: 'ext-14', name: 'B2B 플랫폼형',        category: '테크',        accentColor: '#f5f8ff', type: 'external', file: '/branding-templates/template-14.html' },
  { id: 'ext-15', name: '민트 서비스형',        category: '서비스',      accentColor: '#e6faf6', type: 'external', file: '/branding-templates/template-15.html' },
  { id: 'ext-16', name: '에메랄드 에듀형',      category: '교육/전문',   accentColor: '#f5fcfa', type: 'external', file: '/branding-templates/template-16.html' },
]

// ── 모바일 명함 템플릿 ──
export type CardTemplateId = 'card-navy' | 'card-green' | 'card-black' | 'card-blue' | 'card-white' | 'card-purple'
export type CardPhotoPosition = 'top' | 'circle' | 'right'

export interface CardTemplateMeta {
  id: CardTemplateId; name: string; bg: string; defaultPhotoPos: CardPhotoPosition; isDark: boolean
}

export const CARD_TEMPLATES: CardTemplateMeta[] = [
  { id: 'card-navy',   name: '다크 네이비 전문형', bg: 'linear-gradient(135deg,#0f4c81,#1e88e5)', defaultPhotoPos: 'top',    isDark: true  },
  { id: 'card-green',  name: '다크 그린 신뢰형',   bg: 'linear-gradient(160deg,#1a3c2e,#2d6a4f)', defaultPhotoPos: 'top',    isDark: true  },
  { id: 'card-black',  name: '블랙 프리미엄',       bg: 'linear-gradient(135deg,#1a1a2e,#16213e)', defaultPhotoPos: 'right',  isDark: true  },
  { id: 'card-blue',   name: '로얄 블루형',         bg: '#2563eb',                                 defaultPhotoPos: 'circle', isDark: true  },
  { id: 'card-white',  name: '화이트 클린형',       bg: '#f8fafc',                                 defaultPhotoPos: 'top',    isDark: false },
  { id: 'card-purple', name: '퍼플 프리미엄',       bg: 'linear-gradient(135deg,#4c1d95,#7c3aed)', defaultPhotoPos: 'right',  isDark: true  },
]

export const CARD_BG_SWATCHES = [
  'linear-gradient(135deg,#0f4c81,#1e88e5)',
  'linear-gradient(160deg,#1a3c2e,#2d6a4f)',
  'linear-gradient(135deg,#1a1a2e,#16213e)',
  'linear-gradient(135deg,#4c1d95,#7c3aed)',
  'linear-gradient(135deg,#b45309,#d97706)',
  '#2563eb', '#f8fafc', '#1f2937',
]

// ── 전체 빌더 상태 ──
export type BuilderMode = 'landing' | 'card'

export interface BrandingState {
  mode: BuilderMode
  landingTemplateId: LandingTemplateId
  landingConcept: LandingConcept | null
  landingColor: string
  landingFont: string
  cardTemplateId: CardTemplateId
  cardBg: string
  cardPhotoPos: CardPhotoPosition
  cardPhotoData: string | null
  cardTags: string[]
  cardShowBottomCta: boolean
  cardKakaoUrl: string; cardSmsNumber: string; cardTel2: string; cardWebUrl: string; cardAddress: string
  agentInfo: AgentInfo
  deletedSecs: string[]
  extraSecs: { id: string; html: string }[]
}

export const DEFAULT_STATE: BrandingState = {
  mode: 'landing',
  landingTemplateId: 'ins-navy',
  landingConcept: null,
  landingColor: '#0b1e5f',
  landingFont: "'Pretendard', -apple-system, sans-serif",
  cardTemplateId: 'card-navy',
  cardBg: 'linear-gradient(135deg,#0f4c81,#1e88e5)',
  cardPhotoPos: 'top',
  cardPhotoData: null,
  cardTags: ['보험 전문가', '미래 설계', '1:1 상담'],
  cardShowBottomCta: true,
  cardKakaoUrl: '', cardSmsNumber: '', cardTel2: '', cardWebUrl: '', cardAddress: '',
  agentInfo: { ...DEFAULT_AGENT_INFO },
  deletedSecs: [],
  extraSecs: [],
}
