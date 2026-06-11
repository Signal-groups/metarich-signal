/**
 * Client-safe helpers for coverage-pro UI.
 * excelTemplate.ts는 Node 전용 fs/path를 사용하므로 클라이언트 컴포넌트에서 직접 import하지 않습니다.
 * 보장분석시트.xlsx 기준으로 동기화됨.
 */

import type { ExcelExportInput, ProContract } from './types'

const NAME_TO_ROW_KEY: Array<{ patterns: string[]; rowKey: string }> = [
  // 실비
  { patterns: ['질병입원의료비', '질병입원'], rowKey: 'silson_disease_inpatient' },
  { patterns: ['질병통원의료비', '질병통원'], rowKey: 'silson_disease_outpatient' },
  { patterns: ['상해입원의료비', '상해입원'], rowKey: 'silson_injury_inpatient' },
  { patterns: ['상해통원의료비', '상해통원', '실손의료비', '실손'], rowKey: 'silson_injury_outpatient' },
  { patterns: ['3대비급여'], rowKey: 'silson_3major' },
  // 암
  { patterns: ['암진단', '일반암', '통합암', 'cancer'], rowKey: 'cancer_general' },
  { patterns: ['유사암', '소액암', '갑상선암', '경계성암'], rowKey: 'cancer_similar' },
  { patterns: ['전이암'], rowKey: 'cancer_metastasis' },
  { patterns: ['암수술'], rowKey: 'cancer_surgery' },
  { patterns: ['다빈치'], rowKey: 'cancer_davinci' },
  { patterns: ['항암방사선', '방사선치료'], rowKey: 'cancer_radiation' },
  { patterns: ['중입자'], rowKey: 'cancer_hadron' },
  { patterns: ['양성자'], rowKey: 'cancer_proton' },
  { patterns: ['세기조절방사선', 'imrt'], rowKey: 'cancer_imrt' },
  { patterns: ['항암약물', '항암 약물'], rowKey: 'cancer_chemo' },
  { patterns: ['표적항암'], rowKey: 'cancer_targeted' },
  { patterns: ['카티', 'cart'], rowKey: 'cancer_cart' },
  // 2대질병
  { patterns: ['뇌혈관진단', '뇌혈관질환'], rowKey: 'brain_vascular' },
  { patterns: ['뇌졸중', '뇌졸증'], rowKey: 'brain_stroke' },
  { patterns: ['뇌출혈'], rowKey: 'brain_hemorrhage' },
  { patterns: ['심장질환진단', '심혈관질환'], rowKey: 'heart_vascular' },
  { patterns: ['허혈성심장'], rowKey: 'heart_ischemic' },
  { patterns: ['급성심근경색', '심근경색'], rowKey: 'heart_acute_mi' },
  { patterns: ['수술/시술비', '뇌심수술', '심뇌수술'], rowKey: 'two_major_surgery' },
  { patterns: ['혈전용해'], rowKey: 'two_major_thrombolysis' },
  { patterns: ['중환자실'], rowKey: 'two_major_icu' },
  // 후유장해
  { patterns: ['질병후유장해80', '질병80%'], rowKey: 'disability_disease_80' },
  { patterns: ['질병후유장해', '질병 후유'], rowKey: 'disability_disease' },
  { patterns: ['상해후유장해80', '상해80%', '재해80%'], rowKey: 'disability_injury_80' },
  { patterns: ['상해후유장해', '재해후유장해', '상해 후유'], rowKey: 'disability_injury' },
  // 사망
  { patterns: ['일반사망', '사망보험금', '사망급여금'], rowKey: 'death_general' },
  { patterns: ['질병사망'], rowKey: 'death_disease' },
  { patterns: ['재해사망', '상해사망'], rowKey: 'death_injury' },
  // 수술비
  { patterns: ['질병수술비', '질병 수술'], rowKey: 'surgery_disease' },
  { patterns: ['상해수술비', '상해 수술'], rowKey: 'surgery_injury' },
  { patterns: ['1-5종', '1~5종', '종수술'], rowKey: 'surgery_1_5' },
  { patterns: ['111대', '100대', '64대', '32대', 'n대수술'], rowKey: 'surgery_n_major' },
  // 상해진단
  { patterns: ['골절'], rowKey: 'fracture_diagnosis' },
  { patterns: ['화상'], rowKey: 'burn_diagnosis' },
  // 입원비
  { patterns: ['질병입원일당', '질병 입원일당'], rowKey: 'hospital_disease_daily' },
  { patterns: ['상해입원일당', '상해 입원일당', '입원일당'], rowKey: 'hospital_injury_daily' },
  // 간병인
  { patterns: ['병원사용간병', '병원간병'], rowKey: 'nursing_hospital' },
  { patterns: ['요양병원'], rowKey: 'nursing_care_hospital' },
  { patterns: ['간호간병통합', '간병통합'], rowKey: 'nursing_integrated' },
  // 운전자
  { patterns: ['벌금'], rowKey: 'driver_fine' },
  { patterns: ['변호사선임'], rowKey: 'driver_lawyer' },
  { patterns: ['교통사고처리지원', '교통사고처리', '대물대인'], rowKey: 'driver_accident' },
  // 기타
  { patterns: ['배상책임', '일상배상', '가족배상'], rowKey: 'other_liability' },
]

export function inferClientRowKey(coverageName: string): string | undefined {
  const normalized = coverageName.replace(/\s+/g, '').toLowerCase()
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
          coverages[coverage.rowKey] = (coverages[coverage.rowKey] || 0) + Number(coverage.amount || 0)
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
  surgery_disease:           '수술비 — 질병',
  surgery_injury:            '수술비 — 상해',
  surgery_1_5:               '수술비 — 1-5종',
  surgery_n_major:           '수술비 — 111대질병',
  fracture_diagnosis:        '상해진단 — 골절',
  burn_diagnosis:            '상해진단 — 화상',
  hospital_disease_daily:    '입원일당 — 질병',
  hospital_injury_daily:     '입원일당 — 상해',
  nursing_hospital:          '간병인 — 병원사용',
  nursing_care_hospital:     '간병인 — 요양병원',
  nursing_integrated:        '간병인 — 간호간병통합',
  driver_fine:               '운전자 — 벌금',
  driver_lawyer:             '운전자 — 변호사선임',
  driver_accident:           '운전자 — 교통사고처리지원',
  other_liability:           '기타 — 일상생활배상책임',
}
