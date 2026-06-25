/**
 * lib/coverageAnalysis/excelTemplate.ts
 * 보장분석시트.xlsx 템플릿 매핑 + 데이터 주입
 *
 * 엑셀 구조 (빈양식 시트 기준):
 *   행  1 : A=고객명, C/E/G/I/K/M/O = 보험사 슬롯 0~6
 *   행  2 : 상품명
 *   행  3 : 계약자/피보험자
 *   행  4 : 계약일자
 *   행  5 : 납입기간/기납입기간
 *   행  6 : 보장기간
 *   행  7 : 비고/갱신종류
 *   행  8 : 월 보험료
 *   행 12~59 : 담보별 금액
 *   T열(20): 합산 수식 — 절대 수정 금지
 *
 * 슬롯 → 열 번호: slot N → col 2N+3  (C=3, E=5, G=7 ... O=15)
 */

import path from 'path'
import fs from 'fs'
import ExcelJS from 'exceljs'
import type { ExcelExportInput } from './types'

// ── 템플릿 경로 ────────────────────────────────────────────────────────────
const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'templates', 'coverage', '보장분석시트.xlsx')
const TEMPLATE_SHEET = '빈양식'

export function templateExists(): boolean {
  try {
    return fs.existsSync(TEMPLATE_PATH)
  } catch {
    return false
  }
}

// ── 슬롯 → 열 번호 (C=3, E=5, G=7, I=9, K=11, M=13, O=15)  최대 slot 6
const SLOT_TO_COL = (slot: number): number => slot * 2 + 3

// ── 헤더 행 번호 ──────────────────────────────────────────────────────────
const ROW = {
  CUSTOMER_NAME: 1,  // A1 — 고객명
  COMPANY:       1,  // C/E/G... 행 1 — 보험사명
  PRODUCT:       2,  // 상품명
  CONTRACTEE:    3,  // 계약자/피보험자
  CONTRACT_DATE: 4,  // 계약일자
  PAYMENT:       5,  // 납입기간/기납입기간
  COVERAGE_PERIOD: 6, // 보장기간
  NOTE:          7,  // 비고/갱신종류
  PREMIUM:       8,  // 월 보험료
  TOTAL:         9,  // 보험료 총액
  PAID:          10, // 기납입금
  REMAINING:     11, // 미납입금
}

// ── 담보 행 매핑 (rowKey → 엑셀 행 번호) ────────────────────────────────
// 새 보장분석시트.xlsx 빈양식 시트 기준
export const COVERAGE_ROW_MAP: Record<string, number> = {
  // ── 실비(갱신) ────────────────────────────────────────────────────────
  silson_disease_inpatient:  12,  // 질병입원의료비
  silson_disease_outpatient: 13,  // 질병통원의료비
  silson_injury_inpatient:   14,  // 상해입원의료비
  silson_injury_outpatient:  15,  // 상해통원의료비
  silson_3major:             16,  // 3대비급여 의료비

  // ── 암 ────────────────────────────────────────────────────────────────
  cancer_general:            17,  // 암진단
  cancer_similar:            18,  // 유사암진단
  cancer_metastasis:         19,  // 전이암진단
  cancer_surgery:            20,  // 암수술
  cancer_davinci:            21,  // 다빈치로봇수술
  cancer_radiation:          22,  // 항암방사선
  cancer_hadron:             23,  // 중입자방사선
  cancer_proton:             24,  // 양성자방사선
  cancer_imrt:               25,  // 세기조절방사선
  cancer_chemo:              26,  // 항암약물
  cancer_targeted:           27,  // 표적항암약물
  cancer_cart:               28,  // 카티항암약물

  // ── 2대 질병 ─────────────────────────────────────────────────────────
  brain_vascular:            29,  // 뇌혈관진단
  brain_stroke:              30,  // 뇌졸증진단
  brain_hemorrhage:          31,  // 뇌출혈진단
  heart_vascular:            32,  // 심장질환진단
  heart_ischemic:            33,  // 허혈성심장진단
  heart_acute_mi:            34,  // 급성심근경색진단
  two_major_surgery:         35,  // 수술/시술비
  two_major_thrombolysis:    36,  // 혈전용해치료
  two_major_icu:             37,  // 중환자실치료

  // ── 후유장해 ─────────────────────────────────────────────────────────
  disability_disease_80:     38,  // 질병 80% 이상
  disability_disease:        39,  // 질병 3% ~80%
  disability_injury_80:      40,  // 상해 80% 이상
  disability_injury:         41,  // 상해 3% ~ 80%

  // ── 사망 ─────────────────────────────────────────────────────────────
  death_general:             42,  // 일반
  death_disease:             43,  // 질병
  death_injury:              44,  // 상해

  // ── 수술비 ────────────────────────────────────────────────────────────
  surgery_disease:           45,  // 질병 수술비
  surgery_injury:            46,  // 상해 수술비
  surgery_1_5:               47,  // 1-5종 수술비
  surgery_n_major:           48,  // 111대질병 수술비

  // ── 상해진단 ─────────────────────────────────────────────────────────
  fracture_diagnosis:        49,  // 골절
  burn_diagnosis:            50,  // 화상

  // ── 입원비 ────────────────────────────────────────────────────────────
  hospital_disease_daily:    51,  // 질병 입원일당
  hospital_injury_daily:     52,  // 상해 입원일당

  // ── 간병인 ────────────────────────────────────────────────────────────
  nursing_hospital:          53,  // 병원 간병인
  nursing_care_hospital:     54,  // 요양병원 간병인
  nursing_integrated:        55,  // 간호간병통합서비스

  // ── 운전자 ────────────────────────────────────────────────────────────
  driver_fine:               56,  // 벌금
  driver_lawyer:             57,  // 변호사선임비용
  driver_accident:           58,  // 교통사고처리지원금

  // ── 기타 ─────────────────────────────────────────────────────────────
  other_liability:           59,  // 일상생활배상책임

  // ── 주요치료비 ────────────────────────────────────────────────────────
  cancer_major_benefit:      61,  // 암주요치료비(급여)
  cancer_major_nonbenefit:   62,  // 암주요치료비(비급여)
  vascular_major:            63,  // 뇌심(순환계)주요치료비
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
  // 주요치료비
  cancer_major_benefit:      '주요치료비 — 암주요치료비(급여)',
  cancer_major_nonbenefit:   '주요치료비 — 암주요치료비(비급여)',
  vascular_major:            '주요치료비 — 뇌심(순환계)주요치료비',
}

// ── 담보명 → rowKey 자동 추론 (CRM 데이터 연동용) ─────────────────────
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
  // 주요치료비 — 비급여 먼저
  { patterns: ['암주요치료비(비급여)', '암주요치료비비급여', '비급여암주요치료', '비급여주요치료'], rowKey: 'cancer_major_nonbenefit' },
  { patterns: ['암주요치료비(급여)', '암주요치료비급여', '급여암주요치료', '암주요치료비'], rowKey: 'cancer_major_benefit' },
  { patterns: ['뇌심주요치료비', '순환계주요치료비', '뇌혈관주요치료비', '심혈관주요치료비', '순환계주요', '뇌심주요', '주요치료비'], rowKey: 'vascular_major' },
  // 기타
  { patterns: ['배상책임', '일상배상', '가족배상'], rowKey: 'other_liability' },
]

/**
 * 담보명 문자열 → rowKey 자동 추론
 */
export function inferRowKey(coverageName: string): string | undefined {
  const normalized = coverageName.replace(/\s+/g, '').toLowerCase()
  for (const { patterns, rowKey } of NAME_TO_ROW_KEY) {
    for (const p of patterns) {
      if (normalized.includes(p.replace(/\s+/g, '').toLowerCase())) {
        return rowKey
      }
    }
  }
  return undefined
}

// ── 엑셀 템플릿 데이터 주입 (핵심 함수) ─────────────────────────────────
export async function fillCoverageTemplate(input: ExcelExportInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(TEMPLATE_PATH)

  // 빈양식 시트 사용
  let ws = wb.getWorksheet(TEMPLATE_SHEET)
  if (!ws) {
    // fallback: 첫 번째 시트
    ws = wb.worksheets[0]
  }
  if (!ws) throw new Error('엑셀 템플릿 시트를 찾을 수 없습니다.')

  // 빈양식 외 시트 제거 — 다른 고객 데이터가 포함된 시트 제거
  const sheetsToRemove = wb.worksheets
    .filter((s) => s.name !== TEMPLATE_SHEET)
    .map((s) => s.name)
  for (const name of sheetsToRemove) {
    wb.removeWorksheet(wb.getWorksheet(name)!.id)
  }

  // 고객명: A1 셀
  ws.getRow(ROW.CUSTOMER_NAME).getCell(1).value = `${input.customerName}님 보장분석`

  // 보험사 슬롯별 데이터 입력 (최대 slot 6 = O열)
  for (const contract of input.contracts) {
    const col = SLOT_TO_COL(contract.slot)
    if (col < 3 || col > 15) continue  // C~O 범위 외 무시

    // 헤더 정보
    ws.getRow(ROW.COMPANY).getCell(col).value        = contract.company
    ws.getRow(ROW.PRODUCT).getCell(col).value         = contract.productName
    ws.getRow(ROW.CONTRACTEE).getCell(col).value      = contract.policyHolder ?? ''
    ws.getRow(ROW.CONTRACT_DATE).getCell(col).value   = contract.contractDate ?? ''
    ws.getRow(ROW.PAYMENT).getCell(col).value         = contract.paymentPeriod ?? ''
    ws.getRow(ROW.NOTE).getCell(col).value            = contract.policyType === 'savings' ? '저축성' : '보장성'
    ws.getRow(ROW.PREMIUM).getCell(col).value         = contract.monthlyPremium ?? 0
    // 수식 셀 초기화 — 값 미입력 시 #VALUE! 방지
    ws.getRow(ROW.TOTAL).getCell(col).value     = null
    ws.getRow(ROW.PAID).getCell(col).value      = null
    ws.getRow(ROW.REMAINING).getCell(col).value = null

    // 담보별 금액 입력 (T열 수식 절대 건드리지 않음)
    // amount는 이미 원 단위 (clientMapping에서 만원 × 10000 변환 완료)
    for (const [rowKey, amount] of Object.entries(contract.coverages)) {
      const rowNum = COVERAGE_ROW_MAP[rowKey]
      if (!rowNum) continue
      ws.getRow(rowNum).getCell(col).value = amount > 0 ? amount : null
    }
  }

  // 빈양식 시트를 활성 시트로 설정
  ws.state = 'visible'

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
