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
      "paymentYears": "납입기간 숫자만",
      "coverageYears": "보장기간 (예: 90세, 100세, 종신)",
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
| `monthlyPremium` | **원 단위** 숫자 문자열. 예: `49734` (쉼표·원 표시 제거) |
| `paymentYears` | 납입기간 숫자만. 예: "20년납" → `"20"` |
| `coverageYears` | 보장기간 텍스트. 예: "90세만기" → `"90세"`, "종신" → `"종신"` |
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

| key | 의미 | 단위 | PDF 담보명 예시 |
|---|---|---|---|
| `cancer` | 일반암 진단비 | 만원 | 일반암진단비, 암진단비(유사암제외) |
| `minorCancer` | 유사암 진단비 | 만원 | 유사암진단비, 갑상선암진단비, 기타피부암진단비 |
| `brain` | 뇌혈관질환 또는 뇌 보장 | 만원 | 뇌혈관질환진단비, 뇌졸중진단비, 뇌출혈진단비 |
| `heart` | 허혈성심장질환 또는 심장 보장 | 만원 | 허혈성심장질환진단비, 급성심근경색진단비 |

### 수술비

| key | 의미 | 단위 | PDF 담보명 예시 |
|---|---|---|---|
| `injurySurgery` | 상해 일반 수술비 | 만원 | 상해수술비, 상해일반수술비 |
| `diseaseSurgery` | 질병 일반 수술비 | 만원 | 질병수술비, 질병일반수술비 |
| `injuryComprehensiveSurgery` | 상해 종합 수술비 | 만원 | 상해종합수술비 |
| `diseaseComprehensiveSurgery` | 질병 종합 수술비 | 만원 | 질병종합수술비 |
| `injuryAdvancedSurgery` | 상해 상급 수술비 | 만원 | 상해상급수술비 |
| `diseaseAdvancedSurgery` | 질병 상급 수술비 | 만원 | 질병상급수술비 |
| `injuryTypeSurgery` | 상해 종수술비 (5종 또는 최대금액 기준) | 만원 | 상해종수술비, 상해5종수술비 |
| `diseaseTypeSurgery` | 질병 종수술비 (5종 또는 최대금액 기준) | 만원 | 질병종수술비, 질병5종수술비 |
| `diseaseNSurgery` | 질병 N대 수술비 (가장 큰 금액 기준) | 만원 | 111대수술비, 50대수술비, 64대수술비, N대질병수술비 |

수술비 주의:
`injuryTypeSurgery`, `diseaseTypeSurgery`, `diseaseNSurgery`는 세부 지급 내역을 모두 나열하지 말고 `cautions` 또는 `customCoverages.note`에 `"상세 지급 내역은 약관 참조"`라고 적는다.

### 항암치료

| key | 의미 | 단위 | PDF 담보명 예시 |
|---|---|---|---|
| `chemoDrug` | 항암 약물치료 | 만원 | 항암약물치료비, 항암화학치료비 |
| `chemoRadiation` | 항암 방사선치료 | 만원 | 항암방사선치료비 |
| `targetDrug` | 표적항암 약물치료 | 만원 | 표적항암약물치료비, 항암표적약물치료비 |
| `targetRadiation` | 표적항암 방사선치료 | 만원 | 표적항암방사선치료비 |
| `heavyIon` | 중입자 치료 | 만원 | 중입자치료비, 중입자선치료비 |
| `robotCancerSurgery` | 로봇 암수술 | 만원 | 로봇암수술비 |

### 주요치료비 — 분류 기준 필수 확인

| key | 의미 | 단위 | PDF 담보명 특징 |
|---|---|---|---|
| `cancerMajorTreatmentGeneral` | 암 주요치료비 (일반·급여 기준) | 만원 | "암(유사암제외) 주요치료비Plus(종합병원)", "암주요치료비(급여)", "암주요치료비일반" — **비급여 언급 없음** |
| `cancerMajorTreatmentNonCovered` | 암 주요치료비 (비급여) | 만원 | "비급여(전액본인부담 포함) 암 주요치료비Plus", "암주요치료비(비급여)", "암비급여주요치료비" — **"비급여" 또는 "전액본인부담" 포함** |
| `twoMajorTreatmentComprehensive` | 2대 주요치료비 (종합·급여 기준) | 만원 | "순환계질환 주요치료비Plus", "신특정순환계질환 주요치료비Plus", "뇌심장 주요치료비(종합)", "2대질환주요치료비(급여)" |
| `twoMajorTreatmentAdvanced` | 2대 주요치료비 (상급종합병원 기준) | 만원 | "뇌심장 주요치료비(상급)", "2대질환주요치료비(상급종합병원)", 담보명에 "상급" 포함 |

**유사암 주요치료비 처리**: `metrics`에 key 없음 → 반드시 `customCoverages`에 넣는다.
```json
"customCoverages": [{ "name": "유사암 주요치료비Plus(종합병원)", "amount": "100", "note": "상세 지급 내역은 약관 참조" }]
```

**KB손해보험 담보번호 대조표** (참고용):
- #311 암(유사암제외) 주요치료비Plus(종합병원) → `cancerMajorTreatmentGeneral`
- #312 유사암 주요치료비Plus(종합병원) → `customCoverages`
- #347 비급여(전액본인부담 포함) 암 주요치료비Plus → `cancerMajorTreatmentNonCovered`
- #386 신특정순환계질환 주요치료비Plus → `twoMajorTreatmentComprehensive`

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
  "cancerMajorTreatmentGeneral": "300",
  "cancerMajorTreatmentNonCovered": "2000",
  "twoMajorTreatmentComprehensive": "1000",
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
- **유사암 주요치료비** (반드시 customCoverages)
- **입원일당** (질병/상해 구분 후 customCoverages)

예시:

```json
"customCoverages": [
  {
    "name": "상급종합병원 1인실 입원일당",
    "amount": "10",
    "note": "상세 지급 내역은 약관 참조"
  },
  {
    "name": "유사암 주요치료비Plus(종합병원)",
    "amount": "100",
    "note": "갑상선암·기타피부암·제자리암·경계성종양 기준, 상세는 약관 참조"
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

## 생명보험 월보험료 추출 위치 (흥국생명 스타일)
생명보험 상품설명서/가입제안서는 "주계약 및 특약보험료" 테이블(보통 7~8페이지)에 특약별 보험료가 나열되고,
**테이블 하단 `합계보험료` 또는 `실납입보험료` 행**이 월납입총액이다.

예시 (흥국생명오튼튼5.10.5건강보험):
- 합계보험료: 243,373원 → `"monthlyPremium": "243373"`

생명보험 담보 매핑 예시 (흥국생명 담보명 기준):
| 담보명 | metric key |
|---|---|
| (무)암진단 | `cancer` |
| (무)소액암New보장 | `minorCancer` |
| (무)뇌혈관질환진단 | `brain` |
| (무)허혈심장질환진단 | `heart` |
| (무)항암약물치료 | `chemoDrug` |
| (무)항암방사선치료 | `chemoRadiation` |
| (무)항암중입자방사선치료 | `heavyIon` |
| (무)표적항암약물허가치료 | `targetDrug` |
| (무)표적항암방사선허가치료 | `targetRadiation` |
| (무)로봇암수술 | `robotCancerSurgery` |
| (무)질병수술 | `diseaseSurgery` |
| (무)1~5종질병수술(분리형, N종수술) | `diseaseTypeSurgery` (N종 중 최대금액) |
| (무)1~5종재해수술 | `injuryTypeSurgery` |
| (무)질병및재해 간병인사용입원 | `customCoverages` |
| (무)간호간병통합서비스입원 | `customCoverages` |

---

## 건강보험 단일 제안 예시 (KB 5.10.10 스타일)

```json
{
  "version": "proposal_gpts_v1",
  "mode": "single",
  "categoryId": "health",
  "customerName": "조한경",
  "focus": ["coverage"],
  "plans": [
    {
      "company": "KB손해보험",
      "productName": "KB 5.10.10 플러스 건강보험(세만기)(무배당)(26.07)_해약환급금 미지급형",
      "monthlyPremium": "49734",
      "paymentYears": "20",
      "coverageYears": "90세",
      "fileName": "조O경_49734원_RQ2648064619_상품제안서.pdf",
      "memo": "암 주요치료비 일반 300만 + 비급여 2,000만, 순환계 주요치료비 1,000만 구성",
      "strengths": "비급여 암주요치료비 2천만원으로 실질 치료비 공백 대비 가능",
      "cautions": "일부 담보 갱신형 포함 (갱신 시 보험료 변동 가능). 해약환급금 미지급형으로 중도해지 시 환급 없음",
      "metrics": {
        "cancer": "",
        "minorCancer": "",
        "brain": "",
        "heart": "",
        "cancerMajorTreatmentGeneral": "300",
        "cancerMajorTreatmentNonCovered": "2000",
        "twoMajorTreatmentComprehensive": "1000"
      },
      "customCoverages": [
        { "name": "유사암 주요치료비Plus(종합병원)", "amount": "100", "note": "상세 지급 내역은 약관 참조" },
        { "name": "질병환자실입원일당(1일이상)", "amount": "20", "note": "1일 이상 입원 시 지급" },
        { "name": "상해환자실입원일당(1일이상) II", "amount": "20", "note": "1일 이상 입원 시 지급" },
        { "name": "가족일상생활종배상책임IV(갱신형)", "amount": "10000", "note": "갱신형. 상세 지급 내역은 약관 참조" }
      ]
    }
  ],
  "summary": {
    "headline": "비급여 암주요치료비 중심으로 구성된 건강보험입니다.",
    "mainMessage": "일반 주요치료비 300만 외에 비급여 항목 2,000만을 추가해 실제 치료 시 본인부담 공백을 줄이는 구조입니다.",
    "recommendation": "기존에 일반암 진단비가 있는 경우 이 상품으로 치료비 보완이 가능합니다.",
    "cautions": ["갱신형 담보는 향후 보험료 인상 가능", "해약환급금 미지급형으로 중도해지 손실 주의"]
  }
}
```
