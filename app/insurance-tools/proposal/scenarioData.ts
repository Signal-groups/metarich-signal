// 제안서 카테고리별 사례 데이터
// 실제 수치 출처: 법무법인 더프라임, 뱅크샐러드, 힐팁, 앤젤시터, 데일리벳 (2024~2026)

export type ScenarioCostItem = {
  label: string
  amount: string
  covered: boolean      // true = 보험으로 커버, false = 자부담 또는 국가지원
  coverLabel?: string   // 어떤 담보가 커버하는지
}

export type ScenarioCase = {
  icon: string
  label: string
  situation: string
  totalEstimate: string
  costItems: ScenarioCostItem[]
  conclusion: string
}

export type HealthTreatmentStep = {
  step: string
  icon: string
  cost: string
  coverage: string
  note: string
}

export type CategoryScenarioConfig = {
  page4Title: string
  page4Subtitle: string
  cases: ScenarioCase[]
  page5?: {
    title: string
    subtitle: string
    steps: HealthTreatmentStep[]
    conclusion: string
  }
}

export const CATEGORY_SCENARIOS: Record<string, CategoryScenarioConfig> = {
  // ── 운전자보험 ──────────────────────────────────────────────────────────
  driver: {
    page4Title: "사고 유형별 실제 비용과 보장",
    page4Subtitle: "교통사고 형사 책임 비용은 자동차보험으로 해결되지 않습니다. 운전자보험이 필요한 이유입니다.",
    cases: [
      {
        icon: "🚸",
        label: "스쿨존 사고 (민식이법)",
        situation: "스쿨존 내 어린이를 다치게 하면 특정범죄가중처벌법이 적용됩니다. 합의하지 못하면 최대 무기징역까지 가능해 형사합의금이 반드시 필요합니다.",
        totalEstimate: "약 4,000 ~ 5,500만원",
        costItems: [
          { label: "형사합의금", amount: "3,000 ~ 5,000만원", covered: true, coverLabel: "교통사고처리지원금" },
          { label: "벌금", amount: "최대 500만원", covered: true, coverLabel: "벌금 특약" },
          { label: "변호사 선임비", amount: "300 ~ 500만원", covered: true, coverLabel: "변호사선임비용" },
        ],
        conclusion: "보험 없을 시 전액 자부담 → 운전자보험으로 대부분 해결"
      },
      {
        icon: "🚦",
        label: "12대 중과실 (신호위반·중앙선)",
        situation: "신호위반·중앙선 침범 등 12대 중과실로 인명피해가 발생하면 피해자가 처벌을 원할 경우 합의 없이는 형사처벌을 피하기 어렵습니다.",
        totalEstimate: "약 1,500 ~ 3,500만원",
        costItems: [
          { label: "형사합의금", amount: "1,000 ~ 3,000만원", covered: true, coverLabel: "교통사고처리지원금" },
          { label: "변호사 선임비", amount: "300 ~ 500만원", covered: true, coverLabel: "변호사선임비용" },
          { label: "벌금", amount: "50 ~ 200만원", covered: true, coverLabel: "벌금 특약" },
        ],
        conclusion: "형사합의 + 법적 대응 비용까지 — 운전자보험 하나로 대응 가능"
      },
      {
        icon: "🚗",
        label: "일반 인명사고 (추돌·부상 3주)",
        situation: "급정거 또는 추돌로 탑승자가 3주 진단을 받으면 형사합의 절차가 시작됩니다. 단순 사고도 합의금 수백만원이 발생합니다.",
        totalEstimate: "약 400 ~ 800만원",
        costItems: [
          { label: "형사합의금", amount: "300 ~ 500만원", covered: true, coverLabel: "교통사고처리지원금" },
          { label: "자동차사고 부상치료비", amount: "100 ~ 300만원", covered: true, coverLabel: "자동차사고부상치료비" },
        ],
        conclusion: "소액 사고도 합의금 발생 — 월 수만원으로 수천만원 리스크 대비"
      }
    ]
  },

  // ── 건강보험 (암·뇌·심장) ────────────────────────────────────────────────
  health: {
    page4Title: "진단 즉시 — 생활비와 치료 준비자금 활용",
    page4Subtitle: "진단비는 치료기간 동안 소득이 줄거나 끊기는 것을 대비하는 핵심 목돈입니다.",
    cases: [
      {
        icon: "🎗️",
        label: "암 진단 — 치료기간 생활비 마련",
        situation: "암 치료 기간은 평균 6개월 ~ 2년. 이 기간 소득이 줄거나 끊깁니다. 진단비는 치료 중 생활비 공백을 메우는 자금입니다.",
        totalEstimate: "생활비 공백 2,000 ~ 4,800만원",
        costItems: [
          { label: "월 생활비 × 12 ~ 24개월", amount: "2,400 ~ 4,800만원", covered: false },
          { label: "일반암 진단비 즉시 지급", amount: "가입금액 전액 수령", covered: true, coverLabel: "일반암 진단비" },
        ],
        conclusion: "진단 즉시 목돈 수령 → 치료에만 집중하는 환경 마련"
      },
      {
        icon: "🧠",
        label: "뇌졸중 — 입원·재활·간병비",
        situation: "뇌졸중은 평균 입원 70일 + 재활 6개월 이상이 필요합니다. 간병인 비용은 1일 5 ~ 10만원, 6개월이면 900 ~ 1,800만원입니다.",
        totalEstimate: "치료·간병비 3,000 ~ 5,000만원",
        costItems: [
          { label: "급성기 입원 치료비", amount: "300 ~ 500만원", covered: true, coverLabel: "실손보험" },
          { label: "재활치료비 (6개월)", amount: "600 ~ 1,200만원", covered: true, coverLabel: "실손보험" },
          { label: "간병인 비용 (180일)", amount: "900 ~ 1,800만원", covered: true, coverLabel: "뇌 진단비 활용" },
        ],
        conclusion: "뇌 진단비 + 실손으로 이중 보장 — 가족 경제 부담 최소화"
      },
      {
        icon: "❤️",
        label: "급성심근경색 — 골든타임 후 회복",
        situation: "발생 후 6시간 내 수술이 생사를 결정합니다. 수술 후에도 6 ~ 12개월 재활·약물치료가 이어지며 소득 공백이 발생합니다.",
        totalEstimate: "수술·회복 비용 2,000 ~ 4,000만원",
        costItems: [
          { label: "심장 수술비", amount: "500 ~ 1,500만원", covered: true, coverLabel: "수술비 + 실손" },
          { label: "재활·약물치료", amount: "500 ~ 1,000만원", covered: true, coverLabel: "실손보험" },
          { label: "소득 공백 생활비", amount: "1,000 ~ 2,000만원", covered: true, coverLabel: "심장 진단비 활용" },
        ],
        conclusion: "수술비는 실손, 소득 공백은 진단비로 — 이중 보장 구조"
      }
    ],
    page5: {
      title: "치료 단계별 담보 연동 — 어떤 보장이 언제 작동하는가",
      subtitle: "급여와 비급여를 구분해 각 치료 단계별로 어떤 담보가 작동하는지 확인합니다. 진단비와 실손은 함께 청구 가능합니다.",
      steps: [
        {
          step: "① 진단",
          icon: "🔬",
          cost: "진단 즉시",
          coverage: "진단비 즉시 지급",
          note: "생활비·간병비·기타 용도 자유롭게 사용"
        },
        {
          step: "② 수술",
          icon: "⚕️",
          cost: "급여 5% 본인부담\n+ 비급여 전액",
          coverage: "수술비 + 실손 청구",
          note: "실손으로 급여·비급여 합산 청구 가능"
        },
        {
          step: "③ 항암치료",
          icon: "💊",
          cost: "표적·면역항암\n100 ~ 500만원/회",
          coverage: "주요치료비(비급여)",
          note: "횟수 제한 없이 반복 청구 가능"
        },
        {
          step: "④ 입원",
          icon: "🏥",
          cost: "급여 5%\n+ 비급여 전액",
          coverage: "실손보험 (입원)",
          note: "입원일수 × 일당 + 실손 병행 가능"
        },
        {
          step: "⑤ 퇴원 후 통원",
          icon: "🚶",
          cost: "통원 약제비·검사비",
          coverage: "실손보험 (통원)",
          note: "퇴원 후에도 반복 청구 가능"
        }
      ],
      conclusion: "실손보험은 급여·비급여 치료비를 반복 청구할 수 있어 진단비와 함께 '이중 보장' 구조를 완성합니다."
    }
  },

  // ── 간병보험 ─────────────────────────────────────────────────────────────
  care: {
    page4Title: "기간별 보장 구조와 가족 간병 활용",
    page4Subtitle: "간병보험은 입원 일수에 따라 지급금액이 달라집니다. 가족이 직접 간병할 때도 일당 청구가 가능합니다.",
    cases: [
      {
        icon: "🛏️",
        label: "단기 입원 (1 ~ 180일)",
        situation: "수술 후 회복기 또는 급성기 치료 구간. 종합병원·재활병원에서 전문 간병인이 필요한 시기이며 1일 5 ~ 10만원이 발생합니다.",
        totalEstimate: "180일 간병비 900 ~ 1,800만원",
        costItems: [
          { label: "전문 간병인 (1일)", amount: "5 ~ 10만원", covered: false },
          { label: "180일 기준 총비용", amount: "900 ~ 1,800만원", covered: true, coverLabel: "간병인 사용일당 (1~180일)" },
        ],
        conclusion: "보험 일당으로 전문 간병인 비용 대부분 커버 — 가족 부담 해소"
      },
      {
        icon: "🏠",
        label: "장기 입원 (181 ~ 365일)",
        situation: "뇌졸중·골절·만성질환 등 회복이 길어지면 요양병원으로 전원됩니다. 간병 부담이 장기화되며 비용이 누적됩니다.",
        totalEstimate: "365일 누적 1,800 ~ 3,600만원",
        costItems: [
          { label: "181 ~ 365일 추가 비용", amount: "900 ~ 1,800만원", covered: true, coverLabel: "간병인 사용일당 (181~365일)" },
          { label: "요양병원 입원비", amount: "월 100 ~ 200만원", covered: true, coverLabel: "실손보험 연계 가능" },
        ],
        conclusion: "장기 입원 구간도 보장 유지 — 연간 누적 비용 최소화"
      },
      {
        icon: "👨‍👩‍👧",
        label: "가족 간병 청구 방법과 주의사항",
        situation: "가족이 직접 간병할 때도 일당 청구가 가능합니다. 단, 필요 서류를 사전에 준비하지 않으면 지급이 거절될 수 있습니다.",
        totalEstimate: "서류 미비 시 지급 거절",
        costItems: [
          { label: "의사 소견서", amount: "필수 — 입원 중 발급", covered: true, coverLabel: "담당의 소견서" },
          { label: "입원 확인서", amount: "필수 — 병원 발급", covered: true, coverLabel: "간호기록부 병행" },
          { label: "간병인 사용 확인서", amount: "핵심 서류", covered: true, coverLabel: "일부 병원 미발급 주의" },
        ],
        conclusion: "요양병원 vs 일반병원 구분 필수 — 가입 전 약관 조건 반드시 확인"
      }
    ]
  },

  // ── 재가보험 (치매·장기요양) ──────────────────────────────────────────────
  homecare: {
    page4Title: "등급별 국가지원금과 실질 보장 준비",
    page4Subtitle: "2025년 장기요양 재가급여 기준. 국가지원 후 남은 본인부담을 보험으로 보완합니다.",
    cases: [
      {
        icon: "🏅",
        label: "1 ~ 2등급 — 중증 장기요양",
        situation: "1등급(최중증)·2등급(중증) 수급자는 재가급여 월 한도 230 ~ 208만원을 받습니다. 본인 15% 부담과 초과 이용분을 보험으로 보완합니다.",
        totalEstimate: "1등급 기준 월 230만원 한도",
        costItems: [
          { label: "재가급여 국가지원 (1등급)", amount: "230만원/월", covered: false },
          { label: "본인 부담 (15%)", amount: "약 34만원/월", covered: true, coverLabel: "장기요양 1~2등급 보험금" },
          { label: "한도 초과 추가 이용", amount: "초과분 100% 자부담", covered: true, coverLabel: "보험금으로 보완" },
        ],
        conclusion: "국가지원 후 본인부담 + 초과 이용분을 보험으로 실질 커버"
      },
      {
        icon: "🏠",
        label: "3 ~ 5등급 — 재가서비스 집중 이용",
        situation: "3 ~ 5등급은 방문요양·주야간보호를 집에서 이용합니다. 월 한도(149 ~ 117만원) 초과 시 본인부담이 늘어납니다.",
        totalEstimate: "3등급 기준 월 149만원 한도",
        costItems: [
          { label: "3등급 재가급여 한도", amount: "149만원/월", covered: false },
          { label: "본인 부담 (15%)", amount: "약 22만원/월", covered: true, coverLabel: "장기요양 3~5등급 보험금" },
          { label: "야간·주말 추가 이용", amount: "월 20 ~ 50만원 추가", covered: true, coverLabel: "보험금으로 보완" },
        ],
        conclusion: "등급이 낮아도 지속 재가서비스 이용 — 보험으로 부족분 보완"
      },
      {
        icon: "🏥",
        label: "시설 입소 vs 재가 선택",
        situation: "요양원 입소 시 월 271만원 중 본인부담 54만원(20%)이 발생합니다. 집에서 돌봄을 원하면 재가급여 + 보험으로 선택권을 확보합니다.",
        totalEstimate: "시설 월 본인부담 약 54만원",
        costItems: [
          { label: "요양원 본인부담 (1등급)", amount: "약 54만원/월", covered: true, coverLabel: "보험금으로 충당" },
          { label: "재가 유지 추가 비용", amount: "월 30 ~ 70만원", covered: true, coverLabel: "방문요양·주야간보호 보험금" },
        ],
        conclusion: "준비된 보험금으로 시설 vs 재가 선택권 확보 — 가족 결정권 보호"
      }
    ]
  },

  // ── 펫보험 ───────────────────────────────────────────────────────────────
  pet: {
    page4Title: "주요 질환별 실제 치료비와 보장",
    page4Subtitle: "2026년 기준 반려동물 연간 의료비 평균 146만원. 펫보험으로 실질적인 보장을 받는 방법입니다.",
    cases: [
      {
        icon: "🐕",
        label: "강아지 슬개골 탈구 수술",
        situation: "소형견에게 빈번한 슬개골 탈구는 방치하면 관절 손상으로 수술이 불가피합니다. 한쪽 기준 150 ~ 250만원, 양쪽이면 300 ~ 500만원입니다.",
        totalEstimate: "한쪽 수술 150 ~ 250만원",
        costItems: [
          { label: "수술비 (한쪽 기준)", amount: "150 ~ 250만원", covered: false },
          { label: "70% 보장 시 지급", amount: "105 ~ 175만원", covered: true, coverLabel: "수술 보상한도" },
          { label: "자기부담금 (30%)", amount: "45 ~ 75만원", covered: false },
        ],
        conclusion: "보험 가입 시 70 ~ 75% 절감 — 미가입 시 전액 자부담"
      },
      {
        icon: "🐱",
        label: "고양이 비뇨기 질환 (반복 발생)",
        situation: "고양이에게 빈번한 방광염·요로결석은 반복 발생합니다. 1회 50 ~ 150만원이며 재발 시 연간 누적 비용이 급증합니다.",
        totalEstimate: "1회 50 ~ 150만원 (재발 반복)",
        costItems: [
          { label: "1회 치료비", amount: "50 ~ 150만원", covered: false },
          { label: "연간 통원 한도 내 보장", amount: "횟수만큼 반복 청구", covered: true, coverLabel: "통원 보상한도" },
          { label: "자기부담금 (30%)", amount: "15 ~ 45만원/회", covered: false },
        ],
        conclusion: "반복 발생해도 연간 한도 내 통원 청구 가능 — 누적 비용 절감"
      },
      {
        icon: "🐾",
        label: "강아지 피부·알러지 질환",
        situation: "피부 알러지는 계절성으로 반복 발생하며 연간 50 ~ 200만원이 소요됩니다. 식이요법·약물 병행으로 장기 관리가 필요합니다.",
        totalEstimate: "연간 50 ~ 200만원",
        costItems: [
          { label: "연간 통원 치료비", amount: "50 ~ 200만원", covered: false },
          { label: "70% 보장 적용", amount: "35 ~ 140만원", covered: true, coverLabel: "통원 보상한도" },
          { label: "선천성 질환 면책", amount: "가입 전 확인 필수", covered: false },
        ],
        conclusion: "선천성 질환 면책 여부 확인 후 가입 — 비교 후 선택 필수"
      }
    ]
  },

  // ── 단기납 종신 ──────────────────────────────────────────────────────────
  shortlife: {
    page4Title: "10년 후 목적자금 — 3가지 활용 시나리오",
    page4Subtitle: "단기납 종신보험은 납입 완료 후 해지환급률이 납입보험료를 초과하는 시점부터 목적자금으로 활용할 수 있습니다.",
    cases: [
      {
        icon: "🎓",
        label: "자녀 학자금 목적",
        situation: "자녀가 대학에 입학하는 시점에 환급금을 활용합니다. 4년제 사립대 기준 연 1,000 ~ 1,200만원, 4년 총 4,000 ~ 5,000만원이 필요합니다.",
        totalEstimate: "4년 학자금 4,000 ~ 5,000만원",
        costItems: [
          { label: "연 등록금 (사립대 기준)", amount: "1,000 ~ 1,200만원/년", covered: false },
          { label: "4년 총 필요금액", amount: "4,000 ~ 5,000만원", covered: true, coverLabel: "10년 후 해지환급금 활용" },
        ],
        conclusion: "납입 완료 후 환급금으로 학자금 마련 — 이자 없는 목적자금 설계"
      },
      {
        icon: "🏠",
        label: "노후 보조자금",
        situation: "국민연금만으로 부족한 노후 생활비를 보완합니다. 부부 기본 생활비 월 250만원 중 연금 외 부족분을 환급금으로 분할 활용합니다.",
        totalEstimate: "10년 보조 약 6,000만원",
        costItems: [
          { label: "월 생활비 보완 필요액", amount: "약 50만원/월", covered: false },
          { label: "10년 분할 활용", amount: "약 6,000만원", covered: true, coverLabel: "해지환급금 분할 수령" },
        ],
        conclusion: "국민연금 + 환급금 분할로 안정적인 노후 보완 구조 완성"
      },
      {
        icon: "🏥",
        label: "긴급 의료비 통장",
        situation: "암·뇌·심장 등 갑작스러운 수술·입원 시 목돈이 필요합니다. 약관대출로 해지 없이 즉시 활용하고 상환하면 보장이 유지됩니다.",
        totalEstimate: "수술·입원 500 ~ 2,000만원",
        costItems: [
          { label: "암·수술 평균 치료비", amount: "500 ~ 2,000만원", covered: false },
          { label: "약관대출 즉시 활용", amount: "해지환급금의 90% 이내", covered: true, coverLabel: "해지 없이 보장 유지" },
        ],
        conclusion: "해지 없이 약관대출로 의료비 마련 — 상환 후 사망보장도 계속 유지"
      }
    ]
  }
}
