// lib/insurance/types.ts

// ─────────────────────────────────────────
// 공통
// ─────────────────────────────────────────

/** 보험사 구분 */
export type InsuranceCompany = 'KB' | '흥국생명' | 'DB손해보험' | '공통'

/** 수술 부위 카테고리 */
export type SurgeryCategory =
  | 'skin_breast'    // 피부·유방
  | 'musculoskeletal' // 근골격
  | 'respiratory'    // 호흡기·흉부
  | 'cardiovascular' // 순환기·심장
  | 'digestive'      // 소화기
  | 'urogenital'     // 비뇨·생식기
  | 'endocrine'      // 내분비
  | 'neurological'   // 신경계
  | 'eye'            // 시각기
  | 'ear'            // 청각기
  | 'other'          // 기타
  | 'cancer'         // 암 수술

/** 장해 신체부위 */
export type DisabilityBodyPart =
  | 'eye'            // 눈
  | 'ear'            // 귀
  | 'nose'           // 코
  | 'jaw'            // 씹기·말하기
  | 'appearance'     // 외모
  | 'spine'          // 척추
  | 'trunk'          // 체간골
  | 'arm'            // 팔
  | 'leg'            // 다리
  | 'finger'         // 손가락
  | 'toe'            // 발가락
  | 'organ'          // 흉복부장기·비뇨생식기
  | 'neuro'          // 신경계·정신행동

/** 진단비 분류 */
export type DiagnosisCategory =
  | 'cancer'         // 암 (일반암)
  | 'cancer_similar' // 유사암 (갑상선·기타피부·제자리암·경계성)
  | 'cancer_thyroid' // 갑상선암
  | 'cancer_skin'    // 기타피부암
  | 'brain'          // 뇌출혈·뇌졸중·뇌혈관질환
  | 'heart'          // 급성심근경색·허혈성심장질환
  | 'other'          // 기타 질병

// ─────────────────────────────────────────
// 수술비
// ─────────────────────────────────────────

export interface SurgeryItem {
  id: string
  item_no: string           // '1', '11-1', '88-2' 등 분류표 번호
  name: string              // 수술명
  type: 1 | 2 | 3 | 4 | 5  // 종수
  category: SurgeryCategory
  is_cancer: boolean        // 암 수술 여부 (분류표 Ⅱ항)
  kcd_codes: string[]       // 관련 KCD 코드
  synonyms: string[]        // 검색 동의어
  no_pay: string[]          // 부지급 사례
  is_disputed: boolean      // 분쟁 빈도 높음 여부
  sources: InsuranceCompany[] // 해당 약관 출처
  notes?: string            // 참고사항
  // 약관별 종수 차이가 있을 때
  type_by_company?: Partial<Record<InsuranceCompany, 1 | 2 | 3 | 4 | 5>>
}

// ─────────────────────────────────────────
// 진단비
// ─────────────────────────────────────────

export interface DiagnosisItem {
  id: string
  kcd_code: string          // 'C51'
  kcd_name: string          // '외음부의 악성신생물'
  category: DiagnosisCategory
  sub_type?: string         // '유사암' | '갑상선암' | '10대고액암' 등
  required_docs: string[]   // 필요 서류
  required_tests: string[]  // 필요 검사
  notes?: string
  sources: InsuranceCompany[]
}

// ─────────────────────────────────────────
// 장해
// ─────────────────────────────────────────

export interface DisabilityItem {
  id: string
  body_part: DisabilityBodyPart
  condition: string          // 장해 상태 설명 (예: '두 눈이 멀었을 때')
  rate: number               // 장해율 % (단일값)
  rate_min?: number          // 범위일 때 최솟값
  rate_max?: number          // 범위일 때 최댓값
  judgment_criteria: string  // 판정기준 요약
  notes?: string
}

// ─────────────────────────────────────────
// 자동차사고 부상등급
// ─────────────────────────────────────────

export interface CarAccidentItem {
  grade: number              // 1~14급
  description: string        // 등급 설명
  examples: string[]         // 대표 상해 사례
  notes?: string
}

// ─────────────────────────────────────────
// 가입금액 (UI 공용)
// ─────────────────────────────────────────

export interface SurgeryAmounts {
  type1: number   // 1종 수술비 (기본 30만)
  type2: number   // 2종 수술비 (기본 50만)
  type3: number   // 3종 수술비 (기본 200만)
  type4: number   // 4종 수술비 (기본 500만)
  type5: number   // 5종 수술비 (기본 1000만)
  disease: number // 질병수술비 (기본 30만)
}

export interface InsuranceAmounts {
  surgery: SurgeryAmounts
  cancer_diagnosis: number    // 암진단비
  similar_cancer: number      // 유사암진단비
  brain_diagnosis: number     // 뇌진단비
  heart_diagnosis: number     // 심장진단비
  disability: number          // 후유장해 보험금 (100% 기준)
}

// ─────────────────────────────────────────
// 검색 결과 (통합)
// ─────────────────────────────────────────

export interface SearchResult {
  surgery?: SurgeryItem[]
  diagnosis?: DiagnosisItem[]
  disability?: DisabilityItem[]
  car_accident?: CarAccidentItem[]
}

// 기본 가입금액
export const DEFAULT_AMOUNTS: InsuranceAmounts = {
  surgery: {
    type1: 30,
    type2: 50,
    type3: 200,
    type4: 500,
    type5: 1000,
    disease: 30,
  },
  cancer_diagnosis: 3000,
  similar_cancer: 300,
  brain_diagnosis: 1000,
  heart_diagnosis: 1000,
  disability: 5000,
}