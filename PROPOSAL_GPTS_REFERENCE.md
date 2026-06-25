# 제안서 생성 GPTs 참조 스키마

이 파일은 메타리치 시그널그룹 `제안서 생성` 페이지에 붙여넣을 GPTs JSON의 기준이다.
GPTs는 보험 PDF 제안서 또는 상품설명서에서 정보를 추출해 아래 구조로 출력한다.

## 최상위 JSON 스키마

```json
{
  "version": "proposal_gpts_v1",
  "mode": "single",
  "categoryId": "health",
  "customerName": "고객명",
  "focus": ["balance"],
  "plans": [
    {
      "company": "보험회사명",
      "productName": "상품명",
      "monthlyPremium": "월보험료 원 단위 숫자",
      "paymentYears": "납입기간",
      "coverageYears": "보장기간",
      "fileName": "원본 파일명 또는 빈 문자열",
      "memo": "상담용 핵심 설명",
      "strengths": "장점 요약",
      "cautions": "주의사항 요약",
      "metrics": {},
      "customCoverages": [
        {
          "name": "추가 담보명",
          "amount": "만원 단위 숫자",
          "note": "추가 설명"
        }
      ]
    }
  ],
  "summary": {
    "headline": "한 줄 결론",
    "mainMessage": "상담에서 바로 말할 핵심 메시지",
    "recommendation": "추천 방향",
    "cautions": ["주의사항"]
  }
}
```

## 공통 필드 설명

| 필드 | 설명 |
|---|---|
| `version` | 항상 `proposal_gpts_v1` |
| `mode` | `single`, `compare`, `cross`, `bundle` 중 하나. 기본은 `single` |
| `categoryId` | 상품 카테고리 ID |
| `customerName` | 고객명. 없으면 빈 문자열 |
| `focus` | 비교 기준 배열. `balance`, `premium`, `coverage`, `scope`, `refund` |
| `plans` | 상품별 데이터 배열 |
| `monthlyPremium` | 원 단위 숫자 문자열. 예: `52380` |
| `metrics` | 카테고리별 정해진 담보/수치 key |
| `customCoverages` | 정해진 key가 없는 추가 담보 |

## 카테고리 ID

| categoryId | 상품 |
|---|---|
| `driver` | 운전자보험 |
| `health` | 건강보험, 종합보험, 암보험, 2대질병, 수술비 중심 상품 |
| `care` | 간병보험 |
| `homecare` | 재가보험, 장기요양, 방문요양 중심 상품 |
| `pet` | 펫보험 |
| `shortlife` | 단기납 종신, 저해지 환급형, 환급률 중심 상품 |
| `dental` | 치아보험 |

## 운전자보험 metric keys

`categoryId: "driver"`

| key | 의미 | 단위 |
|---|---|---|
| `trafficSupport` | 교통사고처리지원금 | 만원 |
| `lawyer` | 변호사 선임비용 | 만원 |
| `finePerson` | 벌금 대인 | 만원 |
| `fineProperty` | 벌금 대물 | 만원 |
| `injury` | 자동차사고부상치료비, 14급 기준 | 만원 |
| `liability` | 가족/일상생활배상책임 | 만원 |
| `renewal` | 갱신 여부 | 텍스트 |

운전자보험 기본 담보 예시:

```json
"metrics": {
  "trafficSupport": "20000",
  "lawyer": "5000",
  "finePerson": "3000",
  "fineProperty": "500",
  "injury": "30",
  "liability": "10000",
  "renewal": "비갱신"
}
```

## 건강보험 metric keys

`categoryId: "health"`

### 진단비

| key | 의미 | 단위 |
|---|---|---|
| `cancer` | 일반암 진단비 | 만원 |
| `minorCancer` | 유사암 진단비 | 만원 |
| `brain` | 뇌혈관질환 또는 뇌 보장 | 만원 |
| `heart` | 허혈성심장질환 또는 심장 보장 | 만원 |

### 수술비

| key | 의미 | 단위 |
|---|---|---|
| `injurySurgery` | 상해 일반 수술비 | 만원 |
| `diseaseSurgery` | 질병 일반 수술비 | 만원 |
| `injuryComprehensiveSurgery` | 상해 종합 수술비 | 만원 |
| `diseaseComprehensiveSurgery` | 질병 종합 수술비 | 만원 |
| `injuryAdvancedSurgery` | 상해 상급 수술비 | 만원 |
| `diseaseAdvancedSurgery` | 질병 상급 수술비 | 만원 |
| `injuryTypeSurgery` | 상해 종수술비. 5종 또는 최대금액 기준 | 만원 |
| `diseaseTypeSurgery` | 질병 종수술비. 5종 또는 최대금액 기준 | 만원 |
| `diseaseNSurgery` | 질병 N대 수술비. 가장 큰 금액 기준 | 만원 |

수술비 주의:
`injuryTypeSurgery`, `diseaseTypeSurgery`, `diseaseNSurgery`는 세부 지급 내역을 모두 나열하지 말고 `cautions` 또는 `customCoverages.note`에 `"상세 지급 내역은 약관 참조"`라고 적는다.

### 항암치료

| key | 의미 | 단위 |
|---|---|---|
| `chemoDrug` | 항암 약물치료 | 만원 |
| `chemoRadiation` | 항암 방사선치료 | 만원 |
| `targetDrug` | 표적항암 약물치료 | 만원 |
| `targetRadiation` | 표적항암 방사선치료 | 만원 |
| `heavyIon` | 중입자 치료 | 만원 |
| `robotCancerSurgery` | 로봇 암수술 | 만원 |

### 주요치료비

| key | 의미 | 단위 |
|---|---|---|
| `cancerMajorTreatmentGeneral` | 암 주요치료비 일반 | 만원 |
| `cancerMajorTreatmentNonCovered` | 암 주요치료비 비급여 | 만원 |
| `twoMajorTreatmentComprehensive` | 2대 주요치료비 종합 | 만원 |
| `twoMajorTreatmentAdvanced` | 2대 주요치료비 상급 | 만원 |

`2대 주요치료비`는 뇌/심장 또는 순환계 치료비를 의미한다.
PDF에 `순환계 주요치료비`, `뇌심장 주요치료비`, `2대질환 주요치료비`가 있으면 위 key로 매핑한다.

### 간병/배상

| key | 의미 | 단위 |
|---|---|---|
| `care` | 간병 보장 | 만원 |
| `liability` | 일상생활배상책임 | 만원 |

건강보험 예시:

```json
"metrics": {
  "cancer": "5000",
  "minorCancer": "1000",
  "brain": "3000",
  "heart": "3000",
  "diseaseSurgery": "50",
  "diseaseTypeSurgery": "1000",
  "chemoDrug": "2000",
  "targetDrug": "5000",
  "cancerMajorTreatmentGeneral": "5000",
  "twoMajorTreatmentComprehensive": "3000",
  "liability": "10000"
}
```

## 간병보험 metric keys

`categoryId: "care"`

| key | 의미 | 단위 |
|---|---|---|
| `injuryCareDaily` | 상해 간병인 사용 입원일당 | 만원 |
| `diseaseCareDaily` | 질병 간병인 사용 입원일당 | 만원 |
| `after181Daily` | 181일 이상 장기 간병 보장 | 만원 |
| `nursingHospitalDaily` | 요양병원 간병 관련 일당 | 만원 |
| `injuryIntegratedDaily` | 간호간병통합서비스 상해 | 만원 |
| `diseaseIntegratedDaily` | 간호간병통합서비스 질병 | 만원 |

## 재가보험 metric keys

`categoryId: "homecare"`

| key | 의미 | 단위 |
|---|---|---|
| `visitCare` | 방문요양 | 만원 |
| `dayNight` | 주야간보호 | 만원 |
| `familyCare` | 가족돌봄 지원 | 만원 |
| `dementiaDiagnosis` | 치매 진단비 | 만원 |
| `dementiaTargetTreatment` | 치매 표적치료 또는 특정치료 보장 | 만원 |
| `grade` | 장기요양 등급 조건 | 텍스트 |

## 펫보험 metric keys

`categoryId: "pet"`

| key | 의미 | 단위 |
|---|---|---|
| `outpatient` | 통원 보상한도 | 만원 |
| `inpatient` | 입원 보상한도 | 만원 |
| `surgery` | 수술 보상한도 | 만원 |
| `patella` | 슬개골 보장 여부 또는 금액 | 텍스트 또는 만원 |
| `skin` | 피부질환 보장 여부 | 텍스트 |
| `deductible` | 자기부담금 | 텍스트 |

## 단기납 종신 metric keys

`categoryId: "shortlife"`

| key | 의미 | 단위 |
|---|---|---|
| `deathBenefit` | 사망보험금 | 만원 |
| `refundYear` | 환급 확인 시점. 예: 10년 | 텍스트 |
| `refundRate` | 해지환급률 | 숫자 문자열 |
| `refundAmount` | 해지환급금 | 만원 |
| `purpose` | 활용 목적 | 텍스트 |
| `liquidity` | 유동성/중도해지 주의 | 텍스트 |

단기납 종신 예시:

```json
"metrics": {
  "deathBenefit": "10000",
  "refundYear": "10년",
  "refundRate": "124.9",
  "refundAmount": "37470",
  "purpose": "10년 이후 목적자금 및 사망보장 병행",
  "liquidity": "중도해지 시 환급률이 낮을 수 있어 납입 지속 가능성 확인 필요"
}
```

## 치아보험 metric keys

`categoryId: "dental"`

| key | 의미 | 단위 |
|---|---|---|
| `filling` | 충전치료 | 만원 |
| `crown` | 크라운 | 만원 |
| `implant` | 임플란트 | 만원 |
| `bridge` | 브릿지 | 만원 |
| `denture` | 틀니 | 만원 |
| `rootCanal` | 신경치료 | 만원 |
| `scaling` | 스케일링 | 만원 |
| `waiting` | 면책/감액기간 | 텍스트 |

## customCoverages 사용 기준

아래 경우에는 `metrics`에 억지로 넣지 말고 `customCoverages`를 사용한다.

- 해당 카테고리에 없는 특약
- 세부 담보명이 중요한 특약
- 보장금액은 있으나 앱의 key와 정확히 매칭되지 않는 담보
- 보험사별 명칭 차이가 커서 임의 매핑하면 위험한 담보

예시:

```json
"customCoverages": [
  {
    "name": "상급종합병원 1인실 입원일당",
    "amount": "10",
    "note": "상세 지급 내역은 약관 참조"
  }
]
```

## 최종 출력 예시: 비교 제안서

```json
{
  "version": "proposal_gpts_v1",
  "mode": "compare",
  "categoryId": "driver",
  "customerName": "홍길동",
  "focus": ["balance", "premium"],
  "plans": [
    {
      "company": "A손해보험",
      "productName": "A 운전자보험",
      "monthlyPremium": "12500",
      "paymentYears": "20",
      "coverageYears": "80세",
      "fileName": "",
      "memo": "교통사고 처리지원금과 변호사 선임비용이 균형 있게 구성된 안입니다.",
      "strengths": "핵심 운전자 비용 담보가 고르게 포함되어 있습니다.",
      "cautions": "자동차부상치료비 급수별 지급금은 약관 확인이 필요합니다.",
      "metrics": {
        "trafficSupport": "20000",
        "lawyer": "5000",
        "finePerson": "3000",
        "fineProperty": "500",
        "injury": "30",
        "liability": "10000",
        "renewal": "비갱신"
      },
      "customCoverages": []
    },
    {
      "company": "B손해보험",
      "productName": "B 운전자보험",
      "monthlyPremium": "9800",
      "paymentYears": "20",
      "coverageYears": "80세",
      "fileName": "",
      "memo": "보험료는 낮지만 일부 담보 한도 확인이 필요합니다.",
      "strengths": "보험료 부담이 낮습니다.",
      "cautions": "변호사 선임비용과 부상치료비 한도가 낮을 수 있습니다.",
      "metrics": {
        "trafficSupport": "20000",
        "lawyer": "3000",
        "finePerson": "3000",
        "fineProperty": "500",
        "injury": "20",
        "liability": "10000",
        "renewal": "갱신형 포함"
      },
      "customCoverages": []
    }
  ],
  "summary": {
    "headline": "핵심 담보는 A안이 안정적이고, 보험료는 B안이 낮습니다.",
    "mainMessage": "상담에서는 보험료 차이보다 사고 발생 시 실제 필요한 형사합의금, 변호사비, 벌금 한도를 먼저 비교하는 것이 좋습니다.",
    "recommendation": "보장 균형을 중시하면 A안, 보험료 부담을 중시하면 B안을 우선 검토합니다.",
    "cautions": ["최종 가입 전 약관상 지급 조건과 갱신 여부를 확인해야 합니다."]
  }
}
```

