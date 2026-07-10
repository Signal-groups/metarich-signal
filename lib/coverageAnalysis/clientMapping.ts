/**
 * Client-safe helpers for coverage-pro UI.
 * excelTemplate.ts는 Node 전용 fs/path를 사용하므로 클라이언트 컴포넌트에서 직접 import하지 않습니다.
 * 보장분석시트.xlsx 기준으로 동기화됨.
 */

import type { ExcelExportInput, ProContract } from './types'

const NAME_TO_ROW_KEY: Array<{ patterns: string[]; rowKey: string }> = [
  // ──────────────────────────────────────────────────────────────────────
  // 주의: "더 구체적인 패턴"이 반드시 먼저 와야 충돌을 방지합니다.
  // 예: "질병입원일당"이 "질병입원"보다 먼저, "허혈성심장"이 "심장질환"보다 먼저.
  // ──────────────────────────────────────────────────────────────────────

  // ── 치매 (간병인 패턴보다 앞에 — "치매간병"이 nursing에 걸리지 않도록) ──
  { patterns: ['치매진단', '치매간병', '치매급여금', '치매생활비', '경도인지장애', '알츠하이머', '치매'], rowKey: 'dementia_diagnosis' },

  // ── 장기요양 ─────────────────────────────────────────────────────────
  { patterns: ['장기요양등급', '노인장기요양', '장기요양보험', '장기요양', '요양등급'], rowKey: 'ltc_grade' },

  // ── 중대질병(CI) — 암/뇌/심장 패턴보다 앞에 ─────────────────────────
  { patterns: ['중대질병진단', '중대질병', '특정중대질병', 'ci진단', 'ci보험금'], rowKey: 'ci_diagnosis' },

  // ── 간병인·재가 (입원일당/실비 패턴보다 반드시 앞에) ─────────────────
  { patterns: ['간병인사용', '간병인질병', '질병간병인', '질병간병지원금', '질병간병', '병원사용간병', '병원간병', '간병인서비스'], rowKey: 'nursing_hospital' },
  { patterns: ['간병인상해', '상해간병인', '상해간병지원금', '상해간병', '간병인간호'], rowKey: 'nursing_injury' },
  { patterns: ['요양병원간병', '요양병원입원', '요양병원재가', '요양간병', '요양병원'], rowKey: 'nursing_care_hospital' },
  { patterns: ['간호간병통합', '간병통합'], rowKey: 'nursing_integrated' },
  { patterns: ['간병인'], rowKey: 'nursing_hospital' },

  // ── 입원일당 (실비 "입원" 패턴보다 앞에 위치해야 함) ─────────────────
  { patterns: ['질병1인실입원일당', '질병1인실입원', '질병1인실', '질병상급병실입원일당', '질병상급병실'], rowKey: 'hospital_disease_single_room' },
  { patterns: ['상해1인실입원일당', '상해1인실입원', '상해1인실', '상해상급병실입원일당', '상해상급병실'], rowKey: 'hospital_injury_single_room' },
  { patterns: ['상급병원입원일당', '1인실입원일당', '1인실일당', '특실입원일당', '상급병실입원일당', '상급종합병원입원일당'], rowKey: 'hospital_premium_room' },
  { patterns: ['질병입원일당', '질병 입원일당', '종합병원이하질병입원일당'], rowKey: 'hospital_disease_daily' },
  { patterns: ['상해입원일당', '상해 입원일당', '종합병원이하상해입원일당', '입원일당'], rowKey: 'hospital_injury_daily' },

  // ── 3대비급여 (개별 항목 포함 — 실비보다 앞에) ───────────────────────
  { patterns: ['3대비급여', '비급여도수치료', '도수치료', '비급여주사치료', '프롤로주사', '비급여mri', '비급여초음파', '응급실내원비', '응급실내원', '상급병실차액', '상급병실료'], rowKey: 'silson_3major' },

  // ── 실비 (간병인·입원일당·3대비급여 다음) ────────────────────────────
  { patterns: ['질병입원의료비', '질병+상해입원', '상해+질병입원', '실손질병입원', '질병입원실손'], rowKey: 'silson_disease_inpatient' },
  { patterns: ['질병통원의료비', '질병외래의료비', '질병처방조제료', '질병통원실손', '실손질병통원', '질병통원'], rowKey: 'silson_disease_outpatient' },
  { patterns: ['상해입원의료비', '해외진료입원', '실손상해입원', '상해입원실손'], rowKey: 'silson_injury_inpatient' },
  { patterns: ['상해통원의료비', '상해외래의료비', '상해처방조제료', '실손상해통원', '상해통원실손', '상해통원', '실손의료비', '의료실비', '실비', '실손'], rowKey: 'silson_injury_outpatient' },

  // ── 암 — 고액·표적 먼저 (일반 "암진단"보다 구체적) ───────────────────
  { patterns: ['고액항암치료비', '고액항암', '표적항암', '중입자항암'], rowKey: 'cancer_targeted' },
  { patterns: ['항암중입자', '중입자치료', '중입자방사선', '중입자'], rowKey: 'cancer_hadron' },
  { patterns: ['양성자방사선', '양성자치료', '양성자'], rowKey: 'cancer_proton' },
  { patterns: ['세기조절방사선', 'imrt'], rowKey: 'cancer_imrt' },
  { patterns: ['항암방사선약물', '항암방사선', '방사선항암치료', '방사선약물치료', '방사선치료'], rowKey: 'cancer_radiation' },
  { patterns: ['항암약물', '항암 약물', '항암치료비', '항암화학요법', '항암화학치료', '화학요법항암', '항암치료'], rowKey: 'cancer_chemo' },
  { patterns: ['카티', 'cart'], rowKey: 'cancer_cart' },
  { patterns: ['다빈치'], rowKey: 'cancer_davinci' },
  { patterns: ['암수술'], rowKey: 'cancer_surgery' },
  { patterns: ['전이암'], rowKey: 'cancer_metastasis' },
  // 유사암 — "소액암", "유사암" 포함 담보 (일반암보다 먼저)
  { patterns: ['유사암진단', '소액암진단', '소액암', '유사암', '갑상선암', '경계성암'], rowKey: 'cancer_similar' },
  // 일반암 — 가장 넓은 패턴을 마지막에
  { patterns: ['암단', '암진단', '일반암', '통합암', 'cancer'], rowKey: 'cancer_general' },

  // ── 2대질병 — 구체적(허혈성·급성심근경색)이 앞에 위치 ─────────────────
  { patterns: ['뇌혈관진단', '뇌혈관질환'], rowKey: 'brain_vascular' },
  { patterns: ['뇌졸중', '뇌졸증'], rowKey: 'brain_stroke' },
  { patterns: ['뇌출혈'], rowKey: 'brain_hemorrhage' },
  { patterns: ['허혈성심장'], rowKey: 'heart_ischemic' },            // 심장질환보다 먼저!
  { patterns: ['급성심근경색', '심근경색'], rowKey: 'heart_acute_mi' },
  { patterns: ['심장질환진단', '심혈관질환'], rowKey: 'heart_vascular' },
  { patterns: ['뇌수술비', '뇌혈관수술비', '뇌관련수술'], rowKey: 'brain_surgery' },     // 뇌 수술비 (two_major_surgery보다 먼저)
  { patterns: ['심장수술비', '심혈관수술비', '심관련수술'], rowKey: 'heart_surgery' },   // 심장 수술비
  { patterns: ['수술/시술비', '뇌심수술', '심뇌수술', '뇌혈관수술', '심혈관수술'], rowKey: 'two_major_surgery' },
  { patterns: ['혈전용해'], rowKey: 'two_major_thrombolysis' },
  { patterns: ['중환자실'], rowKey: 'two_major_icu' },

  // ── 후유장해 — "80% 이상" 먼저 ──────────────────────────────────────
  // (주의: 80% 판별은 inferClientRowKey 함수 내 선행 로직으로 처리)
  { patterns: ['질병후유장해80', '질병80%', '질병80%이상', '질병80미만후유'], rowKey: 'disability_disease_80' },
  { patterns: ['질병후유장해', '질병 후유'], rowKey: 'disability_disease' },
  { patterns: ['상해후유장해80', '상해80%', '재해80%', '상해80%이상', '상해80미만후유'], rowKey: 'disability_injury_80' },
  { patterns: ['상해후유장해', '재해후유장해', '상해 후유', '상해후유'], rowKey: 'disability_injury' },
  // 고도장해·영구장해 (후유 선행로직 통과 후 폴스루 케이스)
  { patterns: ['고도장해', '영구장해', '완전장해', '고도후유', '최고도장해'], rowKey: 'disability_injury_80' },

  // ── 사망 ─────────────────────────────────────────────────────────────
  { patterns: ['암사망'], rowKey: 'death_disease' },               // 암사망 → 질병사망
  { patterns: ['질병사망'], rowKey: 'death_disease' },
  { patterns: ['재해사망', '상해사망', '일반사망재해'], rowKey: 'death_injury' },
  { patterns: ['일반사망', '사망보험금', '사망급여금', '사망보장'], rowKey: 'death_general' },

  // ── 수술비 — 1-5종/111대 먼저 (질병수술비보다 구체적) ─────────────────
  { patterns: ['질병상급수술비', '질병상급수술', '질병1종수술', '질병2종수술'], rowKey: 'surgery_disease_advanced' },
  { patterns: ['질병종합수술비', '질병종합수술', '질병3종수술', '질병4종수술', '질병5종수술'], rowKey: 'surgery_disease_comprehensive' },
  { patterns: ['질병1-5종', '질병1~5종', '질병종수술비', '질병종수술'], rowKey: 'surgery_disease_type' },
  { patterns: ['상해상급수술비', '상해상급수술', '상해1종수술', '상해2종수술'], rowKey: 'surgery_injury_advanced' },
  { patterns: ['상해종합수술비', '상해종합수술', '상해3종수술', '상해4종수술', '상해5종수술'], rowKey: 'surgery_injury_comprehensive' },
  { patterns: ['상해1-5종', '상해1~5종', '상해종수술비', '상해종수술'], rowKey: 'surgery_injury_type' },
  { patterns: ['111대', '100대', '64대', '32대', 'n대수술'], rowKey: 'surgery_n_major' },
  { patterns: ['1-5종', '1~5종', '종수술비'], rowKey: 'surgery_1_5' },
  { patterns: ['상급수술비', '상급수술', '1종수술', '2종수술비', '2종수술'], rowKey: 'surgery_advanced' },
  { patterns: ['종합수술비', '종합수술', '3종수술', '4종수술', '5종수술'], rowKey: 'surgery_comprehensive' },
  { patterns: ['질병수술비', '질병수술(유병자)', '질병중수술', '질병수술', '종수술'], rowKey: 'surgery_disease' },
  { patterns: ['상해수술비', '상해중수술', '특정상해수술', '상해수술'], rowKey: 'surgery_injury' },

  // ── 상해진단 ─────────────────────────────────────────────────────────
  { patterns: ['골절진단', '골절수술', '골절'], rowKey: 'fracture_diagnosis' },
  { patterns: ['화상진단', '화상'], rowKey: 'burn_diagnosis' },

  // ── 운전자 ───────────────────────────────────────────────────────────
  { patterns: ['교통사고처리지원금', '교통사고처리지원', '교통사고처리', '자동차사고피해', '자동차사고', '대물대인'], rowKey: 'driver_accident' },
  { patterns: ['운전자벌금', '벌금'], rowKey: 'driver_fine' },
  { patterns: ['변호사선임', '법률비용', '소송법률'], rowKey: 'driver_lawyer' },

  // ── 주요치료비 — 비급여 먼저 체크 (급여 패턴이 비급여도 매핑하는 것 방지) ──
  { patterns: ['암주요치료비(비급여)', '암주요치료비비급여', '암비급여주요치료', '비급여암주요', '암일반비급여', '암비급여'], rowKey: 'cancer_major_nonbenefit' },
  { patterns: ['암주요치료비(급여)', '암주요치료비급여', '급여암주요치료', '암일반주요치료', '암일반급여', '암주요치료비'], rowKey: 'cancer_major_benefit' },
  { patterns: ['2대주요치료비', '2대질병주요치료비', '뇌심주요치료비', '순환계주요치료비', '순환계치료', '뇌혈관주요치료비', '심혈관주요치료비', '뇌심장주요치료비', '뇌/심장주요치료비', '뇌심장치료', '순환계주요', '뇌심주요', '주요치료비'], rowKey: 'vascular_major' },

  // ── 기타 ─────────────────────────────────────────────────────────────
  { patterns: ['가족생활배상', '배상책임', '일상배상', '가족배상'], rowKey: 'other_liability' },
]

export function inferClientRowKey(coverageName: string): string | undefined {
  const normalized = coverageName.replace(/\s+/g, '').toLowerCase()

  // ── 후유장해 80% 선행 판별 ──────────────────────────────────────────────
  // "(80%이상)" 표기가 질병/상해 양쪽에 나타나므로 컨텍스트로 구분
  if (normalized.includes('후유장해') || normalized.includes('후유')) {
    const is80 =
      normalized.includes('80%이상') ||
      normalized.includes('80%') ||
      normalized.includes('80이상') ||
      normalized.includes('(80')
    const isInjury = normalized.includes('상해') || normalized.includes('재해')
    const isDisease = normalized.includes('질병')
    if (is80) {
      if (isInjury) return 'disability_injury_80'
      if (isDisease) return 'disability_disease_80'
      return 'disability_disease_80'
    }
    if (isInjury) return 'disability_injury'
    if (isDisease) return 'disability_disease'
    // 질병/상해 미표기 시 폴스루
  }

  for (const { patterns, rowKey } of NAME_TO_ROW_KEY) {
    if (patterns.some((pattern) => normalized.includes(pattern.replace(/\s+/g, '').toLowerCase()))) {
      return rowKey
    }
  }
  return undefined
}

export function proContractsToExcelInputClient(
  customerName: string,
  contracts: ProContract[],
  sheetIndex: 1 | 2 = 1
): ExcelExportInput {
  return {
    customerName,
    sheetIndex,
    contracts: contracts.slice(0, 7).map((contract, slot) => {
      const coverages: Record<string, number> = {}
      contract.coverages.forEach((coverage) => {
        if (coverage.rowKey && coverage.rowKey !== 'unknown') {
          // amount는 만원 단위 → 템플릿은 원 단위이므로 ×10000
          coverages[coverage.rowKey] = (coverages[coverage.rowKey] || 0) + Number(coverage.amount || 0) * 10000
        }
      })
      return {
        slot,
        company: contract.company,
        productName: contract.productName,
        policyHolder: contract.policyHolder,
        contractDate: contract.contractDate,
        paymentPeriod: contract.paymentPeriod,
        monthlyPremium: contract.monthlyPremium,
        policyType: contract.policyType,
        coverages,
      }
    }),
  }
}

// ── rowKey → 한국어 담보명 (UI 표시용) ──────────────────────────────────
export const ROW_KEY_LABEL: Record<string, string> = {
  silson_disease_inpatient:  '실비 — 질병입원의료비',
  silson_disease_outpatient: '실비 — 질병통원의료비',
  silson_injury_inpatient:   '실비 — 상해입원의료비',
  silson_injury_outpatient:  '실비 — 상해통원의료비',
  silson_3major:             '실비 — 3대비급여 의료비',
  cancer_general:            '암 — 암진단',
  cancer_similar:            '암 — 유사암진단',
  cancer_metastasis:         '암 — 전이암진단',
  cancer_surgery:            '암 — 암수술',
  cancer_davinci:            '암 — 다빈치로봇수술',
  cancer_radiation:          '암 — 항암방사선',
  cancer_hadron:             '암 — 중입자방사선',
  cancer_proton:             '암 — 양성자방사선',
  cancer_imrt:               '암 — 세기조절방사선',
  cancer_chemo:              '암 — 항암약물',
  cancer_targeted:           '암 — 표적항암약물',
  cancer_cart:               '암 — 카티항암약물',
  brain_vascular:            '2대질병 — 뇌혈관진단',
  brain_stroke:              '2대질병 — 뇌졸증진단',
  brain_hemorrhage:          '2대질병 — 뇌출혈진단',
  heart_vascular:            '2대질병 — 심장질환진단',
  heart_ischemic:            '2대질병 — 허혈성심장진단',
  heart_acute_mi:            '2대질병 — 급성심근경색진단',
  brain_surgery:             '2대질병 — 뇌 수술비',
  heart_surgery:             '2대질병 — 심장 수술비',
  two_major_surgery:         '2대질병 — 수술/시술비',
  two_major_thrombolysis:    '2대질병 — 혈전용해치료',
  two_major_icu:             '2대질병 — 중환자실치료',
  disability_disease_80:     '후유장해 — 질병 80% 이상',
  disability_disease:        '후유장해 — 질병 3%~80%',
  disability_injury_80:      '후유장해 — 상해 80% 이상',
  disability_injury:         '후유장해 — 상해 3%~80%',
  death_general:             '사망 — 일반',
  death_disease:             '사망 — 질병',
  death_injury:              '사망 — 상해',
  surgery_disease:           '수술비 — 질병 일반',
  surgery_injury:            '수술비 — 상해 일반',
  surgery_advanced:          '수술비 — 상급',
  surgery_comprehensive:     '수술비 — 종합',
  surgery_1_5:               '수술비 — 종수술 (1~5종)',
  surgery_disease_advanced:  '수술비 — 질병 상급',
  surgery_disease_comprehensive: '수술비 — 질병 종합',
  surgery_disease_type:      '수술비 — 질병 종수술',
  surgery_injury_advanced:   '수술비 — 상해 상급',
  surgery_injury_comprehensive: '수술비 — 상해 종합',
  surgery_injury_type:       '수술비 — 상해 종수술',
  surgery_n_major:           '수술비 — N대 질병',
  fracture_diagnosis:        '상해진단 — 골절',
  burn_diagnosis:            '상해진단 — 화상',
  hospital_disease_daily:    '입원일당 — 질병',
  hospital_injury_daily:     '입원일당 — 상해',
  hospital_premium_room:     '입원일당 — 상급병원/1인실',
  hospital_disease_single_room: '입원일당 — 질병 1인실',
  hospital_injury_single_room:  '입원일당 — 상해 1인실',
  nursing_hospital:          '간병인 — 질병/일반',
  nursing_injury:            '간병인 — 상해',
  nursing_care_hospital:     '간병인 — 요양병원',
  nursing_integrated:        '간병인 — 간호간병통합',
  driver_fine:               '운전자 — 벌금',
  driver_lawyer:             '운전자 — 변호사선임',
  driver_accident:           '운전자 — 교통사고처리지원',
  other_liability:           '기타 — 일상생활배상책임',
  // 주요치료비
  cancer_major_benefit:      '주요치료비 — 급여암주요치료비',
  cancer_major_nonbenefit:   '주요치료비 — 비급여암주요치료비',
  vascular_major:            '주요치료비 — 2대질병주요치료비',
  ci_diagnosis:              '기타 — CI(중대질병)진단',
  dementia_diagnosis:        '기타 — 치매진단',
  ltc_grade:                 '기타 — 장기요양등급',
}
