export interface SurgeryFieldSearchGuide {
  title: string
  keywords: string[]
  searchTerms: string[]
  note: string
  docs: string[]
}

export interface SurgeryFieldKeyword {
  keyword: string
  searchTerms: string[]
  guideTitle?: string
}

export const SURGERY_FIELD_QUICK_TERMS = [
  '맹장',
  '담낭',
  '지방종',
  '물혹',
  '허리 풍선',
  '감압',
  '스텐트',
  '고주파',
  '레이저',
  '용종',
] as const

// 설계사들이 현장에서 자주 쓰는 표현은 이 파일에 계속 추가하면 됩니다.
// keyword는 고객/설계사 표현, searchTerms는 실제 약관·수술명·코드 검색으로 확장할 단어입니다.
export const SURGERY_FIELD_SEARCH_GUIDES: SurgeryFieldSearchGuide[] = [
  {
    title: '지방종·피지낭종·피부 혹',
    keywords: ['지방종', '피지낭종', '표피낭종', '피부혹', '혹', '물혹', '낭종', '양성종양', '양성신생물', '연조직종양', '덩어리'],
    searchTerms: ['피부', '양성신생물', 'D17', 'L72'],
    note: '지방종(D17), 피지낭종·표피낭종(L72), 물혹·낭종은 고객 표현만으로 종수술비를 단정하기 어렵습니다. 수술확인서의 수술명, 진단서의 질병코드, 조직검사 결과지를 확인하고 일반 질병수술비 또는 N대 양성신생물 담보 여부를 따로 점검하세요.',
    docs: ['진단서 또는 진료확인서', '수술확인서', '진료비 영수증 및 세부내역서', '조직검사 결과지'],
  },
  {
    title: '허리 풍선·감압·신경성형술',
    keywords: ['허리풍선', '풍선', '풍선확장', '풍선확장술', '감압', '갑압', '감압술', '신경감압', '신경성형', '신경성형술', '추간공확장', '경막외강', '허리시술'],
    searchTerms: ['척추', '추간판', '88-2', '신경성형술'],
    note: '약관상 척추 관혈수술은 3종 후보이고, 내시경·카테터 등 경피적 척추 수술은 88-2항 2종 후보입니다. 다만 신경차단술, 흡인·천자, 약물주입만 시행한 경우는 제외 또는 별도 특약 확인이 필요합니다.',
    docs: ['수술확인서의 정확한 수술명', '진단서의 M48/M50/M51 등 질병코드', '시술기록지 또는 수술기록지', '영상판독지(MRI/CT)'],
  },
  {
    title: '스텐트·고주파·레이저 시술',
    keywords: ['스텐트', '스탠트', 'stent', '고주파', 'RFA', '레이저', 'laser', '카테터', '경피적'],
    searchTerms: ['경피적', '카테터', '고주파', '레이저', '혈관'],
    note: '스텐트·고주파·레이저는 부위와 목적에 따라 지급 판단이 크게 달라집니다. 관상동맥·말초혈관·부정맥·안과 레이저처럼 담보 연결이 다르므로 수술명, 시술 부위, 사용 기구, 질병코드를 함께 확인하세요.',
    docs: ['수술확인서 또는 시술확인서', '시술기록지', '진단서의 질병코드', '영상판독지 또는 검사결과지'],
  },
  {
    title: '용종·폴립 제거',
    keywords: ['용종', '폴립', 'polyp', '대장용종', '위용종', 'EMR', 'ESD'],
    searchTerms: ['용종', '대장용종', '88-3', 'K63.5'],
    note: '내시경 절제술은 부위와 수술 방식에 따라 88항 후보가 됩니다. 단순 검사, 조직검사 목적 생검, 약물주입만 시행한 경우는 수술비 지급 대상이 아닐 수 있습니다.',
    docs: ['내시경 수술기록지', '조직검사 결과지', '진단서 또는 진료확인서', '진료비 세부내역서'],
  },
  {
    title: '맹장·담낭 수술',
    keywords: ['맹장', '충수', '충수염', '충수절제', '담낭', '쓸개', '담석', '담도', '담낭염'],
    searchTerms: ['충수', '맹장', '담낭', '담석', 'K35', 'K80'],
    note: '맹장은 충수염·충수절제술, 담낭은 담석·담낭염·담낭절제술로 서류에 기재되는 경우가 많습니다. 고객 표현과 병원 서류의 정식 수술명·질병코드를 같이 확인하세요.',
    docs: ['수술확인서', '진단서 또는 진료확인서', '입퇴원확인서', '진료비 영수증 및 세부내역서'],
  },
]

export const SURGERY_FIELD_KEYWORDS: SurgeryFieldKeyword[] = [
  { keyword: '맹장', searchTerms: ['충수', '충수염', '충수절제', 'K35'], guideTitle: '맹장·담낭 수술' },
  { keyword: '충수', searchTerms: ['맹장', '충수염', '충수절제', 'K35'], guideTitle: '맹장·담낭 수술' },
  { keyword: '담낭', searchTerms: ['쓸개', '담석', '담도', '담낭염', 'K80', 'K81'], guideTitle: '맹장·담낭 수술' },
  { keyword: '쓸개', searchTerms: ['담낭', '담석', '담낭염', 'K80'], guideTitle: '맹장·담낭 수술' },
  { keyword: '물혹', searchTerms: ['낭종', '혹', '양성신생물', '피부', 'D17', 'L72'], guideTitle: '지방종·피지낭종·피부 혹' },
  { keyword: '혹', searchTerms: ['물혹', '낭종', '양성신생물', '지방종', '피부'], guideTitle: '지방종·피지낭종·피부 혹' },
  { keyword: '지방종', searchTerms: ['혹', '양성신생물', '피부', 'D17'], guideTitle: '지방종·피지낭종·피부 혹' },
  { keyword: '풍선', searchTerms: ['허리풍선', '풍선확장술', '척추', '추간판', '88-2', '신경성형술'], guideTitle: '허리 풍선·감압·신경성형술' },
  { keyword: '감압', searchTerms: ['갑압', '감압술', '신경감압', '척추', '추간판', '88-2'], guideTitle: '허리 풍선·감압·신경성형술' },
  { keyword: '갑압', searchTerms: ['감압', '감압술', '신경감압', '척추', '추간판', '88-2'], guideTitle: '허리 풍선·감압·신경성형술' },
  { keyword: '스텐트', searchTerms: ['스탠트', 'stent', '경피적', '카테터', '혈관', '관상동맥'], guideTitle: '스텐트·고주파·레이저 시술' },
  { keyword: '스탠트', searchTerms: ['스텐트', 'stent', '경피적', '카테터', '혈관', '관상동맥'], guideTitle: '스텐트·고주파·레이저 시술' },
  { keyword: '고주파', searchTerms: ['RFA', '경피적', '카테터', '심방세동', '암내시경'], guideTitle: '스텐트·고주파·레이저 시술' },
  { keyword: '레이저', searchTerms: ['laser', '망막', '안과', '레이저안구', '경피적'], guideTitle: '스텐트·고주파·레이저 시술' },
  { keyword: '용종', searchTerms: ['폴립', 'polyp', '대장용종', '위용종', 'EMR', 'ESD', '88-3', 'K63.5'], guideTitle: '용종·폴립 제거' },
  { keyword: '폴립', searchTerms: ['용종', 'polyp', 'EMR', 'ESD', '88-3'], guideTitle: '용종·폴립 제거' },
]

export function normalizeSurgeryFieldKeyword(value: string) {
  return value.toLowerCase().replace(/\s/g, '')
}

export function expandSurgeryFieldSearchTerms(query: string) {
  const normalized = normalizeSurgeryFieldKeyword(query)
  if (!normalized) return []

  const terms = new Set<string>([query, normalized])
  SURGERY_FIELD_KEYWORDS.forEach(item => {
    const key = normalizeSurgeryFieldKeyword(item.keyword)
    if (normalized.includes(key) || (normalized.length >= 2 && key.includes(normalized))) {
      terms.add(item.keyword)
      item.searchTerms.forEach(term => terms.add(term))
    }
  })

  return Array.from(terms).filter(Boolean)
}

export function matchesSurgeryFieldGuide(guide: SurgeryFieldSearchGuide, query: string) {
  const terms = expandSurgeryFieldSearchTerms(query).map(normalizeSurgeryFieldKeyword)
  if (terms.length === 0) return false
  return guide.keywords.some(keyword => {
    const normalizedKeyword = normalizeSurgeryFieldKeyword(keyword)
    return terms.some(term => term.includes(normalizedKeyword) || normalizedKeyword.includes(term))
  })
}
