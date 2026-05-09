export type ConsultingTool = {
  id: string;
  title: string;
  label: string;
  desc: string;
  icon: string;
  url: string;
  color: string;
  cardColor: string;
  fixed?: boolean;
  staffOnly?: boolean;
  chromeRecommended?: boolean;
};

export const CONSULTING_TOOLS: ConsultingTool[] = [
  {
    id: "show_cafe",
    title: "보험의 기준",
    label: "보험의 기준 (카페)",
    desc: "네이버 카페 바로가기",
    icon: "☕",
    url: "https://cafe.naver.com/signal1035",
    color: "border-[#2db400]",
    cardColor: "border-[#2db400] text-[#2db400]",
    fixed: true,
  },
  {
    id: "show_cont",
    title: "숨은 보험금 찾기",
    label: "숨은 보험금 찾기",
    desc: "미청구 보험금 조회",
    icon: "🔍",
    url: "https://cont.insure.or.kr/cont_web/intro.do",
    color: "border-emerald-500",
    cardColor: "border-emerald-500 text-emerald-600",
    fixed: true,
    chromeRecommended: true,
  },
  {
    id: "show_hira",
    title: "진료기록 확인",
    label: "진료기록 확인",
    desc: "국가 검진 및 내역 확인",
    icon: "🏥",
    url: "https://www.hira.or.kr/dummy.do?pgmid=HIRAA030009200000",
    color: "border-orange-500",
    cardColor: "border-orange-500 text-orange-600",
    fixed: true,
  },
  {
    id: "show_knia",
    title: "과실 비율 조회",
    label: "과실 비율 조회",
    desc: "자동차 사고 과실 비율 검색",
    icon: "⚖️",
    url: "https://accident.knia.or.kr",
    color: "border-blue-400",
    cardColor: "border-blue-400 text-blue-500",
    fixed: true,
  },
  {
    id: "show_gongsi",
    title: "보험사 공시실",
    label: "보험사 공시실",
    desc: "각 보험사별 상품 약관 공시",
    icon: "📑",
    url: "/gongsi.html",
    color: "border-slate-400",
    cardColor: "border-slate-400 text-slate-500",
    fixed: true,
  },
  {
    id: "show_calc",
    title: "영업용 금융계산기",
    label: "금융계산기",
    desc: "대출 / 예적금 / 환율",
    icon: "🧮",
    url: "tab:finance",
    color: "border-blue-500",
    cardColor: "border-blue-500 text-blue-600",
    staffOnly: true,
  },
  {
    id: "show_premium_compare",
    title: "교차설계 보험료 비교",
    label: "교차설계 보험료 비교",
    desc: "건강보험 · 종신/사망 · 저축성 비교",
    icon: "📊",
    url: "/insurance-tools/premium-compare",
    color: "border-sky-500",
    cardColor: "border-sky-500 text-sky-600",
    staffOnly: true,
  },
  {
    id: "show_surgery",
    title: "수술비 검색",
    label: "수술비 검색",
    desc: "종별 수술비 및 약관 조회",
    icon: "✂️",
    url: "/insurance-tools/surgery",
    color: "border-rose-400",
    cardColor: "border-rose-400 text-rose-500",
    staffOnly: true,
  },
  {
    id: "show_disability",
    title: "장해분류표",
    label: "장해분류표",
    desc: "상해/질병 장해분류 가이드",
    icon: "♿",
    url: "/insurance-tools/disability",
    color: "border-amber-500",
    cardColor: "border-amber-500 text-amber-600",
    staffOnly: true,
  },
  {
    id: "show_underwriting",
    title: "회사별 간편 인수 확인",
    label: "회사별 간편 인수 확인(참고)",
    desc: "회사별 인수 기준 참고 자료",
    icon: "📝",
    url: "/underwriting/index.html",
    color: "border-cyan-500",
    cardColor: "border-cyan-500 text-cyan-600",
    staffOnly: true,
  },
  {
    id: "show_car_accident",
    title: "자동차사고 가이드",
    label: "자동차사고 가이드",
    desc: "과실 비율 및 대처 가이드",
    icon: "🚗",
    url: "/insurance-tools/car-accident",
    color: "border-emerald-400",
    cardColor: "border-emerald-400 text-emerald-600",
    staffOnly: true,
  },
  {
    id: "show_disease",
    title: "질병코드 조회",
    label: "질병코드 조회",
    desc: "KCD 질병사인분류 검색",
    icon: "🧬",
    url: "https://kcdcode.kr/browse/main",
    color: "border-indigo-400",
    cardColor: "border-indigo-400 text-indigo-500",
    staffOnly: true,
  },
  {
    id: "show_finance",
    title: "재무 분석 도구",
    label: "재무 분석 도구",
    desc: "종합 금융 플래닝 리포트",
    icon: "📊",
    url: "/financial-planner/index.html",
    color: "border-black",
    cardColor: "border-black text-black",
    staffOnly: true,
  },
  {
    id: "show_insu",
    title: "보장분석 PRO",
    label: "보장분석 PRO",
    desc: "정밀 보장분석 시스템",
    icon: "🛡️",
    url: "/insu.html",
    color: "border-blue-600",
    cardColor: "border-blue-600 text-blue-600",
    staffOnly: true,
  },
];

export const DEFAULT_MENU_STATUS = CONSULTING_TOOLS.reduce<Record<string, boolean>>((acc, tool) => {
  acc[tool.id] = true;
  return acc;
}, {});
