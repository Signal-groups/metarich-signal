import type { SurgeryItem } from './types'

export type NSurgeryCompany =
  | 'DB손해보험'
  | 'KB손해보험'
  | '메리츠화재'
  | '삼성화재'
  | '현대해상'
  | '한화손해보험'
  | '흥국화재'
  | '하나손해보험'
  | '농협손해보험'
  | '롯데손해보험'
  | '삼성생명'
  | '한화생명'
  | 'ABL생명'
  | '흥국생명'

export interface NSurgeryCoverage {
  company: NSurgeryCompany
  productName: string
  groupName: string
  keywords: string[]
  diseaseCodes?: string[]
  diseaseDetailGroup?: string
  bodyParts?: string[]
  baseAmount?: number
  note?: string
}

export interface NSurgeryDiseaseDetail {
  company: NSurgeryCompany
  productName: string
  groupName: string
  category: string
  disease: string
  code: string
  aliases?: string[]
}

export const N_SURGERY_DISEASE_DETAILS: NSurgeryDiseaseDetail[] = [
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '백내장', category: '백내장', disease: '노년백내장', code: 'H25', aliases: ['백내장'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '백내장', category: '백내장', disease: '기타 백내장', code: 'H26', aliases: ['백내장', '후발백내장'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '백내장', category: '백내장', disease: '수정체의 기타 장애', code: 'H27', aliases: ['수정체', '백내장'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '수면무호흡증', disease: '수면무호흡', code: 'G47.3', aliases: ['수면무호흡증'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '식도정맥류', disease: '식도정맥류', code: 'I85', aliases: ['식도정맥류'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '요로결석증', disease: '요도결석', code: 'N21.1', aliases: ['요로결석', '요도결석'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '요로결석증', disease: '기타 하부요로결석', code: 'N21.8', aliases: ['요로결석', '하부요로결석'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '요로결석증', disease: '상세불명의 하부요로결석', code: 'N21.9', aliases: ['요로결석', '하부요로결석'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '신장 및 요관의 결석', disease: '신장 및 요관의 결석', code: 'N20', aliases: ['신장결석', '요관결석', '요로결석'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '치핵 및 항문주위 정맥혈전증', disease: '치핵 및 항문주위 정맥혈전증', code: 'K64', aliases: ['치핵', '치질'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '치열 및 치루', disease: '항문 및 직장부위 열창 및 누공', code: 'K60', aliases: ['치열', '치루', '항문열창', '항문누공'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '6대질병', category: '치열 및 치루', disease: '항문 및 직장부위 농양', code: 'K61', aliases: ['치루', '항문농양', '직장농양'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '당뇨병질환', disease: '1형당뇨병', code: 'E10', aliases: ['당뇨', '당뇨병'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '당뇨병질환', disease: '2형당뇨병', code: 'E11', aliases: ['당뇨', '당뇨병'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '당뇨병질환', disease: '영양실조 관련 당뇨병', code: 'E12', aliases: ['당뇨', '당뇨병'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '당뇨병질환', disease: '기타 명시된 당뇨병', code: 'E13', aliases: ['당뇨', '당뇨병'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '당뇨병질환', disease: '상세불명의 당뇨병', code: 'E14', aliases: ['당뇨', '당뇨병'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '당뇨병질환', disease: '당뇨병성 백내장', code: 'H28.0', aliases: ['백내장', '당뇨병성백내장'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '폐질환', disease: '달리 분류되지 않은 호흡부전', code: 'J96', aliases: ['호흡부전'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '위·십이지장궤양', disease: '위궤양', code: 'K25', aliases: ['위궤양'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '위·십이지장궤양', disease: '십이지장궤양', code: 'K26', aliases: ['십이지장궤양'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '23대질병', category: '녹내장', disease: '녹내장', code: 'H40', aliases: ['녹내장'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '22대질병', category: '갑상선질환', disease: '갑상선의 장애', code: 'E00-E07', aliases: ['갑상선'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '22대질병', category: '갑상선질환', disease: '갑상선기능저하증', code: 'E89.0', aliases: ['갑상선', '갑상선기능저하'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '22대질병', category: '부갑상선질환', disease: '부갑상선기능저하증', code: 'E20', aliases: ['부갑상선'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '22대질병', category: '부갑상선질환', disease: '부갑상선기능항진증 및 기타 장애', code: 'E21', aliases: ['부갑상선'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '22대질병', category: '간암', disease: '간 및 간내 담관의 악성 신생물', code: 'C22', aliases: ['간암', '담관암'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '22대질병', category: '췌장질환', disease: '췌장의 기타 질환', code: 'K86', aliases: ['췌장질환', '췌장'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '49대질병', category: '담낭담도질환', disease: '담낭염', code: 'K81', aliases: ['담낭', '담낭염'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '49대질병', category: '담낭담도질환', disease: '담낭의 기타 질환', code: 'K82', aliases: ['담낭', '담낭질환'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '49대질병', category: '담낭담도질환', disease: '담도의 기타 질환', code: 'K83', aliases: ['담도', '담도질환'] },
  { company: 'KB손해보험', productName: '116대질병수술비', groupName: '49대질병', category: '담석증', disease: '담석증', code: 'K80', aliases: ['담석', '담석증'] },
]

const commonMajorKeywords = [
  '뇌혈관', '심장', '간질환', '폐질환', '췌장', '신부전', '폐렴', '결핵',
  '대동맥', '동맥경화', '버거씨병', '파킨슨', '조로증', '크로이츠펠트',
]

const commonDigestiveKeywords = [
  '위궤양', '위암', '십이지장', '담낭', '담도', '췌장', '충수', '탈장', '복막',
  '식도', '치핵', '치루', '항문', '사타구니탈장',
]

const commonEyeEarKeywords = [
  '백내장', '녹내장', '망막', '안구', '안와', '유리체', '중이', '내이', '고막',
]

const commonEndocrineUrinaryKeywords = [
  '갑상선', '부갑상선', '부신', '신장', '방광', '요관', '전립선', '난소', '자궁',
  '생식기', '요도', '고환',
]

const commonSpineJointKeywords = [
  '관절', '척추', '추간판', '디스크', '골다공증', '골수염', '근육', '인대', '연골',
]

export const N_SURGERY_COVERAGES: NSurgeryCoverage[] = [
  {
    company: '흥국생명',
    productName: '무배당 130대질병수술특약',
    groupName: '2대질병',
    keywords: ['뇌혈관질환', '허혈성심장질환', '급성심근경색', '협심증', '심장'],
    diseaseCodes: ['I20-I25', 'I60-I69'],
    note: '이미지 약관 기준. 2대질병, 특정29대질병, 다빈도64대질병 등으로 구성됩니다.',
  },
  {
    company: '흥국생명',
    productName: '무배당 130대질병수술특약',
    groupName: '다빈도64대질병',
    keywords: [
      '백내장', '녹내장', '담석', '담낭', '담도', '충수', '탈장', '치핵', '치루',
      '갑상선', '부갑상선', '부신', '신장', '방광', '요관', '자궁', '난소',
      '중이', '내이', '안면신경', '단일신경병증',
    ],
  },
  {
    company: '흥국생명',
    productName: '무배당 130대질병수술특약',
    groupName: '특정29대질병',
    keywords: [
      '간질환', '위궤양', '십이지장궤양', '결핵', '패혈증', '파킨슨',
      '뇌전증', '수두증', '대동맥', '췌장질환', '크론병', '궤양성대장염',
    ],
  },
  {
    company: 'DB손해보험',
    productName: '119대 질병수술비',
    groupName: '20대질병',
    keywords: commonMajorKeywords,
    baseAmount: 2000,
  },
  {
    company: 'DB손해보험',
    productName: '119대 질병수술비',
    groupName: '5대질병',
    keywords: ['녹내장', '위', '십이지장', '뇌전증', '버거씨병'],
    baseAmount: 1000,
  },
  {
    company: 'DB손해보험',
    productName: '119대 질병수술비',
    groupName: '69대생활질환',
    keywords: [...commonDigestiveKeywords, ...commonEyeEarKeywords, ...commonEndocrineUrinaryKeywords, ...commonSpineJointKeywords],
    baseAmount: 100,
  },
  {
    company: 'KB손해보험',
    productName: '112대질병수술비',
    groupName: '112대 I',
    keywords: ['심장', '뇌혈관', '고혈압', '폐렴', '간질환', '동맥경화', '신부전', '대동맥', '간암', '폐암', '췌장암'],
    baseAmount: 2000,
  },
  {
    company: 'KB손해보험',
    productName: '112대질병수술비',
    groupName: '112대 III/IV',
    keywords: [...commonDigestiveKeywords, ...commonEyeEarKeywords, ...commonEndocrineUrinaryKeywords, ...commonSpineJointKeywords],
    baseAmount: 200,
  },
  {
    company: '메리츠화재',
    productName: '131대질병(특정31대질병) 수술비',
    groupName: '특정31대 및 생활질환',
    keywords: [
      ...commonMajorKeywords, ...commonDigestiveKeywords, ...commonEyeEarKeywords,
      ...commonEndocrineUrinaryKeywords, ...commonSpineJointKeywords, '당뇨', '녹내장',
    ],
  },
  {
    company: '삼성화재',
    productName: '115대 수술비',
    groupName: '5대/22대/62대',
    keywords: [
      ...commonMajorKeywords, ...commonDigestiveKeywords, ...commonEyeEarKeywords,
      ...commonEndocrineUrinaryKeywords, ...commonSpineJointKeywords, '고혈압', '당뇨',
    ],
    baseAmount: 100,
  },
  {
    company: '흥국화재',
    productName: '신142대 특정질병수술비',
    groupName: '1~6그룹',
    keywords: [
      ...commonMajorKeywords, ...commonDigestiveKeywords, ...commonEyeEarKeywords,
      ...commonEndocrineUrinaryKeywords, ...commonSpineJointKeywords, '다낭증', '요실금',
    ],
    baseAmount: 50,
  },
  {
    company: '삼성생명',
    productName: '다모은 153대 질병수술보장특약',
    groupName: '주요질병/특정질병/다빈도질환',
    keywords: [
      ...commonMajorKeywords, ...commonDigestiveKeywords, ...commonEyeEarKeywords,
      ...commonEndocrineUrinaryKeywords, ...commonSpineJointKeywords, '치핵', '치열',
    ],
  },
  {
    company: '한화생명',
    productName: '70대 특정질병 수술비',
    groupName: '70대 특정질병',
    keywords: [
      '폐기종', '기관지확장증', '폐렴', '폐질환', '위궤양', '십이지장궤양',
      '갑상선', '탈장', '췌장', '담낭', '담도', '신장', '방광', '요관',
      '중이', '내이', '망막', '각막', '공막',
    ],
  },
  {
    company: '현대해상',
    productName: 'N대 질병수술비',
    groupName: '회사별 이미지 자료 확인',
    keywords: [...commonMajorKeywords, ...commonDigestiveKeywords, ...commonEyeEarKeywords, ...commonEndocrineUrinaryKeywords],
    note: '로컬 폴더의 현대해상 이미지 7장 기준. 세부 그룹/한도는 원자료 대조 필요.',
  },
  {
    company: '한화손해보험',
    productName: 'N대 질병수술비',
    groupName: '회사별 이미지 자료 확인',
    keywords: [...commonMajorKeywords, ...commonDigestiveKeywords, ...commonEyeEarKeywords, ...commonEndocrineUrinaryKeywords],
    note: '로컬 폴더 이미지 기준. 세부 그룹/한도는 원자료 대조 필요.',
  },
  {
    company: '하나손해보험',
    productName: 'N대 질병수술비',
    groupName: '회사별 이미지 자료 확인',
    keywords: [...commonMajorKeywords, ...commonDigestiveKeywords, ...commonEyeEarKeywords, ...commonEndocrineUrinaryKeywords],
    note: '로컬 폴더 이미지 기준. 세부 그룹/한도는 원자료 대조 필요.',
  },
  {
    company: '농협손해보험',
    productName: 'N대 질병수술비',
    groupName: '회사별 이미지 자료 확인',
    keywords: [...commonMajorKeywords, ...commonDigestiveKeywords, ...commonEyeEarKeywords, ...commonEndocrineUrinaryKeywords],
    note: '로컬 폴더 이미지 기준. 세부 그룹/한도는 원자료 대조 필요.',
  },
  {
    company: '롯데손해보험',
    productName: 'N대 질병수술비',
    groupName: '회사별 이미지 자료 확인',
    keywords: [...commonMajorKeywords, ...commonDigestiveKeywords, ...commonEyeEarKeywords, ...commonEndocrineUrinaryKeywords],
    note: '로컬 폴더 이미지 기준. 세부 그룹/한도는 원자료 대조 필요.',
  },
  {
    company: 'ABL생명',
    productName: 'N대 질병수술비',
    groupName: '회사별 이미지 자료 확인',
    keywords: [...commonMajorKeywords, ...commonDigestiveKeywords, ...commonEyeEarKeywords, ...commonEndocrineUrinaryKeywords],
    note: '로컬 폴더 이미지 기준. 세부 그룹/한도는 원자료 대조 필요.',
  },
]

export const N_SURGERY_COMPANIES = Array.from(
  new Set(N_SURGERY_COVERAGES.map(coverage => coverage.company))
).sort((a, b) => a.localeCompare(b, 'ko-KR'))

export const N_SURGERY_BODY_PARTS = [
  { key: 'heart', label: '심장', terms: ['심장', '심근경색', '협심증', '허혈성', '관동맥', '대동맥'] },
  { key: 'brain', label: '뇌', terms: ['뇌', '뇌혈관', '뇌전증', '파킨슨', '수두증'] },
  { key: 'digestive', label: '소화기', terms: ['위', '십이지장', '담낭', '담도', '췌장', '충수', '탈장', '식도', '치핵', '치루', '복막'] },
  { key: 'urinary', label: '비뇨/생식기', terms: ['신장', '방광', '요관', '요도', '전립선', '자궁', '난소', '고환', '생식기'] },
  { key: 'eyeEar', label: '눈/귀', terms: ['백내장', '녹내장', '망막', '안구', '안와', '유리체', '중이', '내이', '고막'] },
  { key: 'spineJoint', label: '관절/척추', terms: ['관절', '척추', '추간판', '디스크', '골다공증', '골수염', '근육', '인대', '연골'] },
  { key: 'endocrine', label: '내분비', terms: ['갑상선', '부갑상선', '부신'] },
] as const

export type NSurgeryBodyPartKey = typeof N_SURGERY_BODY_PARTS[number]['key']

function normalize(text: string) {
  return text.replace(/\s/g, '').toLowerCase()
}

export function getCoverageBodyParts(coverage: NSurgeryCoverage): string[] {
  const haystack = normalize([...coverage.keywords, coverage.groupName, coverage.productName, ...(coverage.bodyParts ?? [])].join(' '))
  return N_SURGERY_BODY_PARTS
    .filter(part => part.terms.some(term => haystack.includes(normalize(term))))
    .map(part => part.key)
}

export function getCoverageDisplayAmount(coverage: NSurgeryCoverage, fallbackAmount: number) {
  return coverage.baseAmount ?? fallbackAmount
}

function isColonPolypSearch(itemHaystack: string, query?: string) {
  if (!query) return false
  const q = normalize(query)
  const isPolypQuery = ['대장용종', '용종', '폴립', 'polyp', 'k63.5'].some(keyword => q.includes(normalize(keyword)))
  const isPolypItem = ['대장용종', 'k63.5', 'polyp'].some(keyword => itemHaystack.includes(normalize(keyword)))
  return isPolypQuery && isPolypItem
}

export function findNSurgeryCoverages(item: SurgeryItem, query?: string): NSurgeryCoverage[] {
  const haystack = normalize([
    item.name,
    item.category,
    item.notes ?? '',
    ...item.kcd_codes,
    ...item.synonyms,
  ].join(' '))

  if (isColonPolypSearch(haystack, query)) return []

  return N_SURGERY_COVERAGES.filter(coverage =>
    coverage.keywords.some(keyword => haystack.includes(normalize(keyword))) ||
    coverage.diseaseCodes?.some(code => haystack.includes(normalize(code)))
  )
}

export function matchesNSurgeryText(item: SurgeryItem, query: string): boolean {
  if (!query) return false
  const q = normalize(query)
  const itemHaystack = normalize([
    item.name,
    item.category,
    item.notes ?? '',
    ...item.kcd_codes,
    ...item.synonyms,
  ].join(' '))

  return findNSurgeryCoverages(item).some(coverage => {
    const coverageMetaMatches = [coverage.company, coverage.productName, coverage.groupName, coverage.note ?? '']
      .some(value => normalize(value).includes(q))
    const itemKeywordMatches = coverage.keywords
      .some(keyword => itemHaystack.includes(normalize(keyword)) && normalize(keyword).includes(q))
    const itemCodeMatches = coverage.diseaseCodes
      ?.some(code => itemHaystack.includes(normalize(code)) && normalize(code).includes(q)) ?? false

    return coverageMetaMatches || itemKeywordMatches || itemCodeMatches
  })
}

export function getNSurgeryDiseaseDetailsForItem(item: SurgeryItem): NSurgeryDiseaseDetail[] {
  const itemCodes = item.kcd_codes.map(c => c.toUpperCase())
  const itemName = item.name.toLowerCase()
  const itemSynonyms = item.synonyms.map(s => s.toLowerCase())

  return N_SURGERY_DISEASE_DETAILS.filter(detail => {
    const codeMatch = itemCodes.some(c => c.startsWith(detail.code.toUpperCase()))
    const aliasMatch = detail.aliases?.some(alias =>
      itemName.includes(alias.toLowerCase()) ||
      itemSynonyms.some(s => s.includes(alias.toLowerCase()))
    ) ?? false
    return codeMatch || aliasMatch
  })
}
