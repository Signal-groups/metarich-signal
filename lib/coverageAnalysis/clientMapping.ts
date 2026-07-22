/**
 * Client-safe helpers for coverage-pro UI.
 * excelTemplate.ts는 Node 전용 fs/path를 사용하므로 클라이언트 컴포넌트에서 직접 import하지 않습니다.
 * 보장분석시트.xlsx 기준으로 동기화됨.
 */

import type { ExcelExportInput, ProContract, ProCoverage } from './types'

const NAME_TO_ROW_KEY: Array<{ patterns: string[]; rowKey: string }> = [
  // ──────────────────────────────────────────────────────────────────────
  // 주의: "더 구체적인 패턴"이 반드시 먼저 와야 충돌을 방지합니다.
  // 예: "질병입원일당"이 "질병입원"보다 먼저, "허혈성심장"이 "심장질환"보다 먼저.
  // ──────────────────────────────────────────────────────────────────────

  // ── 치매 심각도별 (구체적 패턴 먼저 — 일반 "치매" catch-all보다 앞에) ──
  { patterns: ['중증치매진단', '중증치매급여금', '중증치매생활비', '중증치매보험금', '심한치매진단', '심한치매', '중증치매'], rowKey: 'dementia_severe' },
  { patterns: ['중등도치매진단', '중등도치매급여금', '중등도치매생활비', '뚜렷한치매진단', '뚜렷한치매', '중등도치매'], rowKey: 'dementia_moderate' },
  { patterns: ['경증치매진단', '경증치매급여금', '경증치매생활비', '경도치매진단', '경도치매', '약간의치매', '경도인지장애', '경증치매'], rowKey: 'dementia_mild' },
  // 치매 공통 (간병인 패턴보다 앞에 — "치매간병"이 nursing에 걸리지 않도록)
  { patterns: ['치매진단', '치매간병', '치매급여금', '치매생활비', '알츠하이머', '치매'], rowKey: 'dementia_diagnosis' },

  // ── 재가·시설 급여 (장기요양 서비스 비용 — 치매 패턴 다음, 간병인 패턴 앞) ──
  { patterns: ['재가급여', '재가서비스', '방문요양', '방문간호', '주야간보호', '단기보호', '재가보험금', '재가지원금', '재가비', '재가이용'], rowKey: 'homecare_benefit' },
  { patterns: ['시설급여', '시설입소', '시설서비스', '시설보험금', '시설지원금', '요양시설', '시설이용', '시설비용'], rowKey: 'facility_benefit' },

  // ── 장기요양 등급 (재가/시설 급여보다 뒤에 — 급여명이 먼저 매핑) ──────
  { patterns: ['장기요양등급', '노인장기요양', '장기요양보험', '장기요양', '요양등급'], rowKey: 'ltc_grade' },

  // ── 중대질병(CI) — 암/뇌/심장 패턴보다 앞에 ─────────────────────────
  { patterns: ['중대질병(ci)진단비', '중대질병ci진단비', '중대한질병진단', '중대질병진단', '중대질병', '특정중대질병', 'ci진단', 'ci보험금'], rowKey: 'ci_diagnosis' },

  // ── 간병인·재가 (입원일당/실비 패턴보다 반드시 앞에) ─────────────────
  { patterns: ['요양병원간병', '요양병원입원', '요양병원재가', '요양간병', '요양병원'], rowKey: 'nursing_care_hospital' },
  { patterns: ['간호간병통합', '간병통합'], rowKey: 'nursing_integrated' },
  { patterns: ['간병인사용입원일당(상해)', '상해간병인사용입원일당', '간병인상해', '상해간병인', '상해간병지원금', '상해간병', '간병인간호'], rowKey: 'nursing_injury' },
  { patterns: ['간병인사용입원일당(질병)', '질병간병인사용입원일당', '간병인질병', '질병간병인', '질병간병지원금', '질병간병', '병원사용간병', '병원간병', '간병인서비스'], rowKey: 'nursing_hospital' },
  { patterns: ['간병인사용'], rowKey: 'nursing_hospital' },
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
  { patterns: ['질병입원의료비', '질병+상해입원', '상해+질병입원', '실손질병입원', '질병입원실손', '질병입원'], rowKey: 'silson_disease_inpatient' },
  { patterns: ['질병통원의료비', '질병외래의료비', '질병처방조제료', '질병통원실손', '실손질병통원', '질병통원'], rowKey: 'silson_disease_outpatient' },
  { patterns: ['상해입원의료비', '해외진료입원', '실손상해입원', '상해입원실손', '상해입원'], rowKey: 'silson_injury_inpatient' },
  { patterns: ['상해통원의료비', '상해외래의료비', '상해처방조제료', '실손상해통원', '상해통원실손', '상해통원', '실손의료비', '의료실비', '실비', '실손'], rowKey: 'silson_injury_outpatient' },

  // ── 암 — 고액·표적 먼저 (일반 "암진단"보다 구체적) ───────────────────
  // ※ "특정암"은 보험사가 고액암(폐·간·췌장·식도·담낭·골수·림프·백혈병 등)을
  //   지칭하는 가장 흔한 상품명이므로 cancer_high_value로 분류합니다.
  { patterns: [
      '고액암진단비', '고액암진단', '10대고액암', '고액암',
      '특정암진단비', '특정암진단', '특정(고액)암', '특정암',
      '10대암진단비', '10대암진단', '10대암',
      '주요암진단비', '주요암진단', '주요암',
      '5대암진단비', '5대암진단', '5대암',
      '7대암진단비', '7대암진단', '7대암',
    ], rowKey: 'cancer_high_value' },
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
  { patterns: ['양성뇌종양진단비', '양성뇌종양진단', '양성뇌종양'], rowKey: 'benign_brain_tumor' },
  { patterns: ['양성종양진단비', '양성종양진단', '양성종양', '양성신생물'], rowKey: 'benign_tumor' },
  { patterns: ['뇌혈관산정특례대상', '뇌혈관산정특례', '뇌산정특례'], rowKey: 'brain_special_case' },
  { patterns: ['심장산정특례대상', '심장산정특례'], rowKey: 'heart_special_case' },
  { patterns: ['암산정특례대상', '암산정특례'], rowKey: 'cancer_special_case' },
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
  { patterns: ['심장질환진단', '심혈관질환', '부정맥', '심방세동', '빈맥', '서맥'], rowKey: 'heart_vascular' },
  { patterns: ['뇌수술비', '뇌혈관수술비', '뇌관련수술'], rowKey: 'brain_surgery' },     // 뇌 수술비 (two_major_surgery보다 먼저)
  { patterns: ['허혈심장질환수술비', '허혈성심장수술비', '심장질환수술비', '심장수술비', '심혈관수술비', '심관련수술'], rowKey: 'heart_surgery' },   // 심장 수술비
  { patterns: ['수술/시술비', '뇌심수술', '심뇌수술', '뇌혈관수술', '심혈관수술'], rowKey: 'two_major_surgery' },
  { patterns: ['혈전용해'], rowKey: 'two_major_thrombolysis' },
  { patterns: ['중환자실'], rowKey: 'two_major_icu' },

  // ── 후유장해 — "80% 이상" → "50%" → "3%~" 순서로 배치 ──────────────
  // (주의: 80% / 50% 판별은 inferClientRowKey 함수 내 선행 로직으로 처리)
  { patterns: ['질병후유장해80', '질병80%', '질병80%이상', '질병80미만후유'], rowKey: 'disability_disease_80' },
  { patterns: ['질병후유장해50', '질병50%', '질병50%이상', '질병50이상'], rowKey: 'disability_disease_50' },
  { patterns: ['질병후유장해', '질병 후유'], rowKey: 'disability_disease' },
  { patterns: ['상해후유장해80', '상해80%', '재해80%', '상해80%이상', '상해80미만후유'], rowKey: 'disability_injury_80' },
  { patterns: ['상해후유장해50', '상해50%', '재해50%', '상해50%이상', '상해50이상'], rowKey: 'disability_injury_50' },
  { patterns: ['상해후유장해', '재해후유장해', '상해 후유', '상해후유'], rowKey: 'disability_injury' },
  // 고도장해·영구장해 (후유 선행로직 통과 후 폴스루 케이스)
  { patterns: ['고도장해', '영구장해', '완전장해', '고도후유', '최고도장해'], rowKey: 'disability_injury_80' },

  // ── 사망 ─────────────────────────────────────────────────────────────
  // 순서 중요: 구체적 패턴(질병·재해·상해)을 먼저, bare '사망'은 마지막 폴스루
  { patterns: ['암사망', '3대질병사망', '2대질병사망', '특정질병사망', '질병사망보험금', '질병사망급여금', '질병사망', '질병 사망'], rowKey: 'death_disease' },
  { patterns: ['교통재해사망', '대중교통재해사망', '재해사망보험금', '재해사망급여금', '상해사망보험금', '상해사망급여금', '재해사망', '상해사망', '일반사망재해', '사고사망', '재해로인한사망'], rowKey: 'death_injury' },
  { patterns: ['일반사망보험금', '일반사망급여금', '일반사망', '종신사망', '정기사망', '사망보험금', '사망급여금', '사망보장', '사망급여', '사망'], rowKey: 'death_general' },

  // ── 수술비 — 1-5종/111대 먼저 (질병수술비보다 구체적) ─────────────────
  { patterns: ['질병상급수술비', '질병 상급 수술비', '질병상급수술', '질병1종수술', '질병2종수술'], rowKey: 'surgery_disease_advanced' },
  { patterns: ['질병종합수술비', '질병 종합 수술비', '질병종합수술', '질병3종수술', '질병4종수술', '질병5종수술'], rowKey: 'surgery_disease_comprehensive' },
  { patterns: ['질병n대수술비', '질병n대 수술비', '질병 111대 수술비', '질병111대수술비', '질병119대수술비'], rowKey: 'surgery_n_major' },
  { patterns: ['질병1-5종', '질병1~5종', '질병종수술비', '질병 종수술비', '질병종수술'], rowKey: 'surgery_disease_type' },
  { patterns: ['상해상급수술비', '상해 상급 수술비', '상해상급수술', '상해1종수술', '상해2종수술'], rowKey: 'surgery_injury_advanced' },
  { patterns: ['상해종합수술비', '상해 종합 수술비', '상해종합수술', '상해3종수술', '상해4종수술', '상해5종수술'], rowKey: 'surgery_injury_comprehensive' },
  { patterns: ['상해1-5종', '상해1~5종', '상해종수술비', '상해 종수술비', '상해종수술'], rowKey: 'surgery_injury_type' },
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
  { patterns: ['민사소송법률비용', '민사소송법률', '민사소송비용', '소송법률비용', '소송법률'], rowKey: 'driver_civil_litigation' },
  { patterns: ['자동차사고변호사선임', '변호사선임비용', '변호사선임'], rowKey: 'driver_lawyer' },
  { patterns: ['자동차사고부상치료비14급', '자동차사고부상14급', '자부상14급', '자동차사고부상치료비', '자동차사고부상', '자부상'], rowKey: 'driver_injury_14' },
  { patterns: ['운전자벌금', '벌금'], rowKey: 'driver_fine' },
  { patterns: ['교통사고처리지원금', '교통사고처리지원', '교통사고처리', '자동차사고피해', '대물대인'], rowKey: 'driver_accident' },

  // ── 주요치료비 — 비급여 먼저 체크 (급여 패턴이 비급여도 매핑하는 것 방지) ──
  { patterns: ['암주요치료비(비급여)', '암주요치료비비급여', '암비급여주요치료', '비급여암주요', '암일반비급여', '암비급여'], rowKey: 'cancer_major_nonbenefit' },
  { patterns: ['암주요치료비(급여)', '암주요치료비급여', '급여암주요치료', '암일반급여'], rowKey: 'cancer_major_benefit' },
  { patterns: ['암주요치료비'], rowKey: 'cancer_major_nonbenefit' },
  { patterns: ['2대주요치료비', '2대질병주요치료비', '뇌심주요치료비', '순환계주요치료비', '순환계치료', '뇌혈관주요치료비', '심혈관주요치료비', '뇌심장주요치료비', '뇌/심장주요치료비', '뇌심장치료', '순환계주요', '뇌심주요', '주요치료비'], rowKey: 'vascular_major' },

  // ── 기타 ─────────────────────────────────────────────────────────────
  { patterns: ['가족생활배상', '배상책임', '일상배상', '가족배상'], rowKey: 'other_liability' },
]

export function inferClientRowKey(coverageName: string): string | undefined {
  const normalized = coverageName.replace(/\s+/g, '').toLowerCase()

  // ── N대수술비 범용 처리 (숫자+대+수술 형태: 111대, 50대, 150대 등) ──────
  if (/\d+대(수술|질병수술|상해수술)/.test(normalized)) {
    return 'surgery_n_major'
  }

  // ── 후유장해 80% / 50% 선행 판별 ──────────────────────────────────────
  // "(80%이상)" "(50%이상)" 표기가 질병/상해 양쪽에 나타나므로 컨텍스트로 구분
  if (normalized.includes('후유장해') || normalized.includes('후유')) {
    const is80 =
      normalized.includes('80%이상') ||
      normalized.includes('80%') ||
      normalized.includes('80이상') ||
      normalized.includes('(80')
    const is50 =
      normalized.includes('50%이상') ||
      normalized.includes('50%') ||
      normalized.includes('50이상') ||
      normalized.includes('(50')
    // 소퍼센트(3·5·10·20·30%)·특정: 80%/50% 확인 후 처리
    const isSmallPct =
      !is80 && !is50 && (
        normalized.includes('3%') || normalized.includes('5%') ||
        normalized.includes('10%') || normalized.includes('20%') ||
        normalized.includes('30%') || normalized.includes('특정')
      )
    const isInjury = normalized.includes('상해') || normalized.includes('재해')
    const isDisease = normalized.includes('질병')
    if (is80) {
      if (isInjury) return 'disability_injury_80'
      if (isDisease) return 'disability_disease_80'
      return 'disability_disease_80'
    }
    if (is50) {
      if (isInjury) return 'disability_injury_50'
      if (isDisease) return 'disability_disease_50'
      return 'disability_disease_50'
    }
    if (isSmallPct) {
      // 특정·소퍼센트 후유장해: 질병 명시 시 질병, 그 외 상해(기본)
      if (isDisease) return 'disability_disease'
      return 'disability_injury'
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
  const excelMaxRowKeys = new Set([
    'surgery_1_5', 'surgery_n_major',
    'surgery_disease_advanced', 'surgery_disease_comprehensive', 'surgery_disease_type',
    'surgery_injury_advanced', 'surgery_injury_comprehensive', 'surgery_injury_type',
    'silson_disease_inpatient', 'silson_injury_inpatient',
    'silson_disease_outpatient', 'silson_injury_outpatient', 'silson_3major',
  ])

  const excelContracts: ProContract[] = contracts.length <= 7
    ? contracts
    : [
        ...contracts.slice(0, 6),
        (() => {
          const remaining = contracts.slice(6)
          const byRowKey = new Map<string, ProCoverage>()
          for (const contract of remaining) {
            for (const coverage of contract.coverages) {
              if (!coverage.rowKey || coverage.rowKey === 'unknown') continue
              const previous = byRowKey.get(coverage.rowKey)
              const amount = excelMaxRowKeys.has(coverage.rowKey)
                ? Math.max(Number(previous?.amount || 0), Number(coverage.amount || 0))
                : Number(previous?.amount || 0) + Number(coverage.amount || 0)
              byRowKey.set(coverage.rowKey, {
                ...coverage,
                id: `excel-summary-${coverage.rowKey}`,
                contractId: '__excel_summary__',
                amount,
                isRenewal: Boolean(previous?.isRenewal || coverage.isRenewal || contract.isRenewal),
              })
            }
          }
          return {
            id: '__excel_summary__',
            company: '기타·수동조정',
            productName: `잔여 ${remaining.length}건 합산`,
            paymentPeriod: '7건 초과 계약 합산',
            monthlyPremium: remaining.reduce((sum, contract) => sum + Number(contract.monthlyPremium || 0), 0),
            status: 'active' as const,
            policyType: 'protection' as const,
            coverages: Array.from(byRowKey.values()),
          }
        })(),
      ]

  return {
    customerName,
    sheetIndex,
    contracts: excelContracts.map((contract, slot) => {
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
  cancer_high_value:         '암 — 고액암진단',
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
  benign_tumor:              '기타 — 양성종양',
  benign_brain_tumor:        '진단비 — 양성뇌종양',
  brain_special_case:        '2대질병 — 뇌혈관 산정특례',
  heart_special_case:        '2대질병 — 심장 산정특례',
  cancer_special_case:       '암 — 산정특례',
  brain_vascular:            '2대질병 — 뇌혈관진단',
  brain_stroke:              '2대질병 — 뇌졸증진단',
  brain_hemorrhage:          '2대질병 — 뇌출혈진단',
  heart_vascular:            '2대질병 — 심장질환(부정맥 등)',
  heart_ischemic:            '2대질병 — 허혈성심장진단',
  heart_acute_mi:            '2대질병 — 급성심근경색진단',
  brain_surgery:             '2대질병 — 뇌 수술비',
  heart_surgery:             '2대질병 — 심장 수술비',
  two_major_surgery:         '2대질병 — 수술/시술비',
  two_major_thrombolysis:    '2대질병 — 혈전용해치료',
  two_major_icu:             '2대질병 — 중환자실치료',
  disability_disease_80:     '후유장해 — 질병 80% 이상',
  disability_disease_50:     '후유장해 — 질병 50%',
  disability_disease:        '후유장해 — 질병 3%~',
  disability_injury_80:      '후유장해 — 상해 80% 이상',
  disability_injury_50:      '후유장해 — 상해 50%',
  disability_injury:         '후유장해 — 상해 3%~',
  death_general:             '사망 — 일반',
  death_disease:             '사망 — 질병',
  death_injury:              '사망 — 상해(재해)',
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
  driver_civil_litigation:   '운전자 — 민사소송법률비용',
  driver_injury_14:          '운전자 — 자동차사고부상치료비(14급)',
  driver_accident:           '운전자 — 교통사고처리지원',
  other_liability:           '기타 — 일상생활배상책임',
  // 주요치료비
  cancer_major_benefit:      '주요치료비 — 급여암주요치료비',
  cancer_major_nonbenefit:   '주요치료비 — 비급여암주요치료비',
  vascular_major:            '주요치료비 — 2대질병주요치료비',
  ci_diagnosis:              '기타 — CI(중대질병)진단',
  // 치매 심각도별
  dementia_severe:           '치매 — 중증치매진단',
  dementia_moderate:         '치매 — 중등도치매진단',
  dementia_mild:             '치매 — 경증치매진단',
  dementia_diagnosis:        '치매 — 치매진단(일반)',
  // 재가·시설
  homecare_benefit:          '재가 — 재가급여(방문요양 등)',
  facility_benefit:          '재가 — 시설입소급여',
  ltc_grade:                 '기타 — 장기요양등급',
}

// ── CI 보험 / 생보 감지 유틸 ─────────────────────────────────────────────
/**
 * CI(중대질병) 보험 상품 여부 판단
 * "CI보험", "CI형", "중대질병보험" 등을 CI 보험으로 분류
 */
export function isCiProduct(productName: string): boolean {
  const n = (productName || '').replace(/\s/g, '').toUpperCase()
  return n.includes('CI보험') || n.includes('CI형') || n.includes('중대질병보험') ||
    // 한글 외 영문 사용 패턴: "ＣＩ", "Ｃ Ｉ" 전각 등 → 유니코드 정규화
    /[ＣC][ＩI]/.test(n)
}

/**
 * 생명보험사 여부 판단 (회사명 기준)
 * 손보사: "화재", "손해", "해상" 포함
 * 생보사: "생명", "라이프" 포함
 */
export function isLifeInsCompany(company: string): boolean {
  const c = (company || '').replace(/\s/g, '')
  if (/화재|손해|해상/i.test(c)) return false
  return /생명|라이프|life/i.test(c)
}

/**
 * 계약일(YYYY-MM-DD 또는 YYYY.MM.DD 형식) → ym 숫자 반환
 * 예: '2009-01-29' → 200901
 */
export function policyDateToYm(dateStr: string): number {
  if (!dateStr) return 0
  const m = dateStr.match(/(\d{4})[^\d](\d{1,2})/)
  if (!m) return 0
  return Number(m[1]) * 100 + Number(m[2])
}

/**
 * 실손의료비 세대 기반 기본 가입금액 반환 (만원 단위)
 * 계약일+보험사 유형으로 세대를 판별해 적정 기본값 제공
 */
export function silsonDefaultAmounts(policyDate: string, insurer: string): { inpatient: number; outpatient: number } {
  const ym = policyDateToYm(policyDate)
  const isLife = isLifeInsCompany(insurer)

  if (ym > 0 && ym < 200910 && isLife) {
    // 표준화 이전 생보: 입원 3천만, 통원 10만
    return { inpatient: 3000, outpatient: 10 }
  }
  if (ym > 0 && ym < 200910) {
    // 표준화 이전 손보: 입원 5천만(중간값), 통원 30만
    return { inpatient: 5000, outpatient: 30 }
  }
  // 2세대 이후 표준: 입원 5천만, 통원 25만
  return { inpatient: 5000, outpatient: 25 }
}

/**
 * CI 보험에서 ci_diagnosis로 리매핑할 rowKey 집합
 * (암진단비, 뇌혈관/뇌졸중/뇌출혈, 심장질환/심근경색 등 CI 트리거 담보)
 */
export const CI_TRIGGER_ROW_KEYS = new Set([
  'cancer_general', 'cancer_high_value', 'cancer_similar',
  'brain_vascular', 'brain_stroke', 'brain_hemorrhage',
  'heart_vascular', 'heart_ischemic', 'heart_acute_mi',
])
