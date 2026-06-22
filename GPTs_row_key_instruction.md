## [보장분석 PRO 연동] 담보 row_key 필드 추가 지시

각 담보 항목 출력 시 `coverage_name` 옆에 반드시 `row_key` 필드를 추가하세요.

### 출력 형식 (v5)
```json
{
  "version": "insurance_analysis_v5",
  "policies": [
    {
      "company": "삼성화재",
      "product_name": "실손보험",
      "monthly_premium": 3.5,
      "payment_period": "20년납/100세만기",
      "policy_type": "protection",
      "coverages": [
        {
          "coverage_name": "질병입원의료비",
          "row_key": "silson_disease_inpatient",
          "amount": null,
          "coverage_type": "갱신형"
        },
        {
          "coverage_name": "치매진단비",
          "row_key": "dementia_diagnosis",
          "amount": 500,
          "coverage_type": "비갱신형"
        }
      ]
    }
  ]
}
```

### row_key 전체 목록 (반드시 아래 목록에서 정확히 선택)

| row_key | 담보 종류 |
|---------|---------|
| `silson_disease_inpatient` | 실비 — 질병입원의료비 |
| `silson_disease_outpatient` | 실비 — 질병통원의료비 |
| `silson_injury_inpatient` | 실비 — 상해입원의료비 |
| `silson_injury_outpatient` | 실비 — 상해통원의료비 (실비 전체 포함) |
| `silson_3major` | 실비 — 3대비급여 (도수치료/비급여주사/MRI/응급실/상급병실 포함) |
| `cancer_general` | 암 — 일반암/통합암 진단비 |
| `cancer_similar` | 암 — 유사암/소액암/갑상선암 |
| `cancer_metastasis` | 암 — 전이암 |
| `cancer_surgery` | 암 — 암수술비 |
| `cancer_chemo` | 암 — 항암약물/항암화학요법 |
| `cancer_targeted` | 암 — 표적항암/고액항암 |
| `cancer_radiation` | 암 — 항암방사선치료 |
| `cancer_hadron` | 암 — 중입자방사선 |
| `cancer_proton` | 암 — 양성자방사선 |
| `cancer_imrt` | 암 — 세기조절방사선(IMRT) |
| `cancer_cart` | 암 — 카티(CAR-T)항암 |
| `cancer_davinci` | 암 — 다빈치로봇수술 |
| `cancer_major_benefit` | 주요치료비 — 암주요치료비(급여) |
| `cancer_major_nonbenefit` | 주요치료비 — 암주요치료비(비급여) |
| `brain_vascular` | 2대질병 — 뇌혈관질환 진단비 |
| `brain_stroke` | 2대질병 — 뇌졸중 진단비 |
| `brain_hemorrhage` | 2대질병 — 뇌출혈 진단비 |
| `heart_ischemic` | 2대질병 — 허혈성심장질환 진단비 |
| `heart_acute_mi` | 2대질병 — 급성심근경색 진단비 |
| `heart_vascular` | 2대질병 — 심장/심혈관질환 진단비 |
| `two_major_surgery` | 2대질병 — 뇌심(수술/시술)비 |
| `two_major_thrombolysis` | 2대질병 — 혈전용해치료비 |
| `two_major_icu` | 2대질병 — 중환자실 치료비 |
| `vascular_major` | 주요치료비 — 뇌심(순환계)주요치료비 |
| `ci_diagnosis` | CI — 중대질병 진단비 |
| `dementia_diagnosis` | 치매 — 치매진단비/치매간병/경도인지장애 |
| `ltc_grade` | 요양 — 장기요양등급 보험금 |
| `disability_injury_80` | 후유장해 — 상해 80%이상 (고도장해/영구장해 포함) |
| `disability_injury` | 후유장해 — 상해 3%~100% |
| `disability_disease_80` | 후유장해 — 질병 80%이상 |
| `disability_disease` | 후유장해 — 질병 3%~100% |
| `death_general` | 사망 — 일반사망 |
| `death_injury` | 사망 — 상해/재해사망 |
| `death_disease` | 사망 — 질병사망/암사망 |
| `surgery_1_5` | 수술비 — 1~5종 수술 |
| `surgery_n_major` | 수술비 — 111대(100대/64대) 질병 |
| `surgery_disease` | 수술비 — 질병수술비 |
| `surgery_injury` | 수술비 — 상해수술비 |
| `hospital_disease_daily` | 입원일당 — 질병 |
| `hospital_injury_daily` | 입원일당 — 상해 |
| `nursing_hospital` | 간병인 — 일반병원 사용 |
| `nursing_care_hospital` | 간병인 — 요양병원 |
| `nursing_integrated` | 간병인 — 간호간병통합서비스 |
| `fracture_diagnosis` | 상해진단 — 골절 |
| `burn_diagnosis` | 상해진단 — 화상 |
| `driver_accident` | 운전자 — 교통사고처리지원금 |
| `driver_fine` | 운전자 — 벌금 |
| `driver_lawyer` | 운전자 — 변호사선임비용 |
| `other_liability` | 기타 — 일상생활/가족생활 배상책임 |

### 규칙
1. 목록에 정확히 일치하는 row_key가 있으면 반드시 사용
2. 애매한 경우 가장 유사한 것 선택 (절대 임의 문자열 입력 금지)
3. 목록에 없는 담보는 `row_key` 필드 자체를 생략 (시스템이 담보명으로 자동 추론)
