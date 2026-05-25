export type InsurerType = "life" | "nonlife"

export type Insurer = {
  id: string
  name: string
  phone: string
  monitoringPhone?: string
  type: InsurerType
}

export type VisitType = "hospitalization" | "outpatient"

export type ClaimCoverage = {
  id: string
  label: string
  group: "care" | "diagnosis" | "special"
  docs: string[]
  note?: string
}

export const INSURERS: Insurer[] = [
  { id: "abl", name: "ABL생명", phone: "1588-6500", monitoringPhone: "확인 필요", type: "life" },
  { id: "aia", name: "AIA생명", phone: "1588-9898", monitoringPhone: "1588-2513", type: "life" },
  { id: "bnp", name: "BNP생명", phone: "1688-1118", monitoringPhone: "확인 필요", type: "life" },
  { id: "db-life", name: "DB생명", phone: "1588-3131", monitoringPhone: "02-6470-7863", type: "life" },
  { id: "dgb", name: "DGB생명", phone: "1588-4770", monitoringPhone: "확인 필요", type: "life" },
  { id: "ibk", name: "IBK연금보험", phone: "1577-4117", monitoringPhone: "02-2270-1661", type: "life" },
  { id: "kb-life", name: "KB라이프", phone: "1588-9922", monitoringPhone: "1588-3374", type: "life" },
  { id: "kdb", name: "KDB생명", phone: "1588-4040", monitoringPhone: "확인 필요", type: "life" },
  { id: "metlife", name: "MetLife생명", phone: "1588-9600", monitoringPhone: "확인 필요", type: "life" },
  { id: "nh-life", name: "NH농협생명", phone: "1544-4000", monitoringPhone: "1544-4222", type: "life" },
  { id: "kyobo", name: "교보생명", phone: "1588-1001", monitoringPhone: "1588-1838", type: "life" },
  { id: "dongyang", name: "동양생명", phone: "1577-1004", monitoringPhone: "080-899-1004", type: "life" },
  { id: "lina", name: "라이나생명", phone: "1588-0058", monitoringPhone: "1588-2442", type: "life" },
  { id: "mirae", name: "미래에셋생명", phone: "1588-0220", monitoringPhone: "확인 필요", type: "life" },
  { id: "samsung-life", name: "삼성생명", phone: "1588-3114", monitoringPhone: "1588-3115", type: "life" },
  { id: "shinhan-life", name: "신한라이프", phone: "1588-5580", monitoringPhone: "1522-7215", type: "life" },
  { id: "orange", name: "오렌지라이프", phone: "1566-3000", monitoringPhone: "확인 필요", type: "life" },
  { id: "chubb-life", name: "처브라이프생명", phone: "1599-4600", monitoringPhone: "확인 필요", type: "life" },
  { id: "fubon", name: "푸본현대생명", phone: "1577-3311", monitoringPhone: "확인 필요", type: "life" },
  { id: "hana-life", name: "하나생명", phone: "1577-1112", monitoringPhone: "확인 필요", type: "life" },
  { id: "hanwha-life", name: "한화생명", phone: "1588-6363", monitoringPhone: "확인 필요", type: "life" },
  { id: "heungkuk-life", name: "흥국생명", phone: "1588-2288", monitoringPhone: "확인 필요", type: "life" },
  { id: "aig", name: "AIG손해보험", phone: "1544-2792", monitoringPhone: "확인 필요", type: "nonlife" },
  { id: "axa", name: "AXA손해보험", phone: "1566-1566", monitoringPhone: "확인 필요", type: "nonlife" },
  { id: "chubb", name: "처브손해보험", phone: "1544-0100", monitoringPhone: "확인 필요", type: "nonlife" },
  { id: "db-nonlife", name: "DB손해보험", phone: "1588-0100", monitoringPhone: "1568-0757", type: "nonlife" },
  { id: "kb-nonlife", name: "KB손해보험", phone: "1544-0114", monitoringPhone: "1544-0019", type: "nonlife" },
  { id: "mg", name: "MG손해보험", phone: "1588-5959", monitoringPhone: "1577-3777", type: "nonlife" },
  { id: "nh-nonlife", name: "NH농협손해보험", phone: "1644-9000", monitoringPhone: "1644-9600", type: "nonlife" },
  { id: "lotte", name: "롯데손해보험", phone: "1588-3344", monitoringPhone: "1600-5132", type: "nonlife" },
  { id: "meritz", name: "메리츠화재", phone: "1566-7711", monitoringPhone: "1577-7711", type: "nonlife" },
  { id: "samsung-fire", name: "삼성화재", phone: "1588-5114", monitoringPhone: "1566-0563", type: "nonlife" },
  { id: "seoul", name: "서울보증보험", phone: "1670-7000", monitoringPhone: "1670-1882", type: "nonlife" },
  { id: "shinhan-ez", name: "신한EZ손해보험", phone: "1544-2580", monitoringPhone: "확인 필요", type: "nonlife" },
  { id: "ace", name: "Ace손해(Chubb)", phone: "1566-5800", monitoringPhone: "확인 필요", type: "nonlife" },
  { id: "kakao", name: "카카오손해보험", phone: "미확인", monitoringPhone: "확인 필요", type: "nonlife" },
  { id: "carrot", name: "캐롯손해보험", phone: "1566-3000", monitoringPhone: "확인 필요", type: "nonlife" },
  { id: "hana-nonlife", name: "하나손해보험", phone: "1688-1688", monitoringPhone: "확인 필요", type: "nonlife" },
  { id: "hanwha-nonlife", name: "한화손해보험", phone: "1566-8000", monitoringPhone: "02-6299-6821", type: "nonlife" },
  { id: "hyundai", name: "현대해상", phone: "1588-5656", monitoringPhone: "1577-3223", type: "nonlife" },
  { id: "heungkuk-fire", name: "흥국화재", phone: "1688-1688", monitoringPhone: "확인 필요", type: "nonlife" },
  { id: "post", name: "우체국", phone: "1599-0100", monitoringPhone: "확인 필요", type: "nonlife" },
  { id: "suhyup", name: "수협", phone: "1599-0100", monitoringPhone: "확인 필요", type: "nonlife" },
  { id: "yebyeol", name: "예별손보", phone: "1588-5959", monitoringPhone: "확인 필요", type: "nonlife" },
]

export const BASE_DOCUMENTS: Record<VisitType, string[]> = {
  hospitalization: [
    "보험금 청구서 (발급/작성: 보험사 양식)",
    "입퇴원확인서 또는 진단서 (발급기관: 병원)",
    "진료비 계산서(영수증) + 진료비 세부내역서 (발급기관: 병원)",
    "신분증 사본 + 통장 사본 (발급/준비: 고객)",
  ],
  outpatient: [
    "보험금 청구서 (발급/작성: 보험사 양식)",
    "진료비 계산서(영수증) + 진료비 세부내역서 (발급기관: 병원)",
    "진단서 또는 진료확인서 (발급기관: 병원)",
    "신분증 사본 + 통장 사본 (발급/준비: 고객)",
  ],
}

export const COVERAGES: ClaimCoverage[] = [
  {
    id: "actual-expense",
    label: "실손의료비",
    group: "care",
    docs: [
      "진료비 계산서(영수증) (발급기관: 병원/약국)",
      "진료비 세부내역서 (발급기관: 병원)",
      "처방전 및 약제비 영수증 (발급기관: 병원/약국)",
      "입원 청구 시 입퇴원확인서 또는 진단서 (발급기관: 병원)",
    ],
  },
  {
    id: "hospital-daily",
    label: "입원일당",
    group: "care",
    docs: [
      "입퇴원확인서(진단명, 입원기간 포함) (발급기관: 병원)",
      "진단서 또는 진료확인서 (발급기관: 병원)",
      "진료비 계산서(영수증) (발급기관: 병원)",
    ],
  },
  {
    id: "surgery",
    label: "수술",
    group: "care",
    docs: [
      "수술확인서 또는 수술명이 기재된 진단서 (발급기관: 병원)",
      "수술기록지 또는 진료기록 사본 (발급기관: 병원)",
      "진료비 계산서(영수증) (발급기관: 병원)",
    ],
  },
  {
    id: "mri",
    label: "MRI",
    group: "care",
    docs: [
      "영상검사 판독지 (발급기관: 병원)",
      "검사 시행일과 검사명이 확인되는 진료기록 또는 확인서 (발급기관: 병원)",
      "MRI 영상촬영 필요 사유가 확인되는 소견서 (발급기관: 병원, 보험사 요청 시)",
    ],
  },
  {
    id: "caregiver",
    label: "간병인사용",
    group: "care",
    docs: [
      "간병비 영수증 (발급기관: 간병업체/간병인)",
      "간병인 사용 확인서 (발급기관: 병원 또는 간병업체)",
      "간병업체 사업자등록증 사본 (발급기관: 간병업체)",
      "간병일지 (작성기관: 간병업체/간병인)",
      "필요 시 간호일지 (발급기관: 병원)",
    ],
    note: "가족 간병 특약은 가족관계증명서와 간병사실 확인서가 추가될 수 있습니다. 보험사별로 개인 위치정보를 간병인에게 요구하는 경우가 있으니 허위 간병이 이뤄지지 않도록 각별히 유의 부탁드립니다.",
  },
  {
    id: "homecare",
    label: "재가",
    group: "care",
    docs: [
      "장기요양인정서 (발급기관: 국민건강보험공단)",
      "개인별 장기요양이용계획서 (발급기관: 국민건강보험공단)",
      "장기요양급여 납부확인서 (발급기관: 장기요양기관)",
      "장기요양급여 제공기록지 (발급기관: 장기요양기관)",
    ],
  },
  {
    id: "dental",
    label: "치아",
    group: "special",
    docs: [
      "보험사 치과치료확인서 (발급/작성: 치과)",
      "치과진료기록부 사본 (발급기관: 치과)",
      "진료비 계산서(영수증) (발급기관: 치과)",
      "보철치료 시 발치 전후 엑스레이 또는 파노라마 (발급기관: 치과)",
    ],
  },
  {
    id: "car-injury",
    label: "자부상",
    group: "special",
    docs: [
      "자동차보험 보상처리 내역서 (발급기관: 자동차보험사)",
      "경찰 신고 건은 교통사고 사실확인원 (발급기관: 경찰서/정부24)",
      "진단서 및 진료비 영수증 (발급기관: 병원)",
    ],
  },
  {
    id: "pet",
    label: "펫보험",
    group: "special",
    docs: [
      "동물병원 진료비 영수증 (발급기관: 동물병원)",
      "진료비 세부내역서 (발급기관: 동물병원)",
      "진단서 또는 진료확인서 (발급기관: 동물병원)",
      "최초 청구 시 동물등록증 (발급기관: 동물보호관리시스템/지자체)",
    ],
  },
  {
    id: "fracture",
    label: "골절",
    group: "care",
    docs: [
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "초진기록지 또는 응급실기록지 (발급기관: 병원)",
      "엑스레이/CT/MRI 판독지 (발급기관: 병원, 보험사 요청 시)",
    ],
  },
  {
    id: "cancer",
    label: "암",
    group: "diagnosis",
    docs: [
      "조직검사 결과지 (발급기관: 병원)",
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "혈액암은 골수검사 및 혈액검사 결과지 (발급기관: 병원)",
      "조직 채취가 어려운 경우 CT/MRI 판독지 및 종양표지자 결과 (발급기관: 병원)",
    ],
  },
  {
    id: "leukemia",
    label: "백혈병/혈액암",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "골수검사 결과지 (발급기관: 병원)",
      "혈액검사 결과지 (발급기관: 병원)",
      "항암치료 확인서 또는 치료기록지 (발급기관: 병원, 해당 시)",
    ],
  },
  {
    id: "brain-heart",
    label: "뇌/심장",
    group: "diagnosis",
    docs: [
      "뇌질환은 CT, MRI, MRA 등 영상진단 판독보고서 (발급기관: 병원)",
      "심장질환은 심전도, 심초음파, 관상동맥조영술, 심장효소검사 결과 중 해당 자료 (발급기관: 병원)",
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
    ],
  },
  {
    id: "brain",
    label: "뇌질환",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "CT/MRI/MRA 등 영상진단 판독보고서 (발급기관: 병원)",
      "입원 또는 응급실 기록지 (발급기관: 병원, 해당 시)",
    ],
  },
  {
    id: "heart",
    label: "심질환",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "심전도/심초음파/관상동맥조영술 결과지 (발급기관: 병원)",
      "심장효소검사 결과지 (발급기관: 병원, 해당 시)",
    ],
  },
  {
    id: "dementia",
    label: "치매",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "인지기능검사 결과지(CDR/MMSE 등) (발급기관: 병원)",
      "영상검사 판독지 또는 신경심리검사 결과지 (발급기관: 병원, 보험사 요청 시)",
    ],
  },
  {
    id: "diabetes",
    label: "당뇨병",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "당화혈색소 검사결과지(HbA1c 6.5 기준) (발급기관: 병원)",
      "투약기록 또는 처방전 (발급기관: 병원/약국)",
    ],
  },
  {
    id: "hypertension",
    label: "원발성고혈압",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "혈압 측정 기록 또는 진료기록 사본 (발급기관: 병원)",
      "처방전 또는 의무기록지(약물명 및 투약일수 확인 서류) (발급기관: 병원/약국)",
    ],
  },
  {
    id: "gout",
    label: "통풍",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 또는 진료확인서 (발급기관: 병원)",
      "요산검사 결과지 (발급기관: 병원)",
      "투약기록 또는 처방전 (발급기관: 병원/약국)",
    ],
  },
  {
    id: "shingles",
    label: "대상포진",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 또는 진료확인서 (발급기관: 병원)",
      "초진기록지 또는 진료기록 사본 (발급기관: 병원)",
      "치료비 영수증 및 세부내역서 (발급기관: 병원/약국)",
    ],
  },
  {
    id: "hand-foot-mouth",
    label: "수족구/수두",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 또는 진료확인서 (발급기관: 병원)",
      "초진기록지 또는 진료기록 사본 (발급기관: 병원)",
      "등원/등교 중지 확인서 (발급기관: 병원, 보험사 요청 시)",
    ],
  },
  {
    id: "rare-disease",
    label: "산정특례대상",
    group: "diagnosis",
    docs: [
      "산정특례 등록 확인 서류 (발급기관: 국민건강보험공단/병원)",
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "검사결과지 또는 진료기록 사본 (발급기관: 병원)",
    ],
  },
  {
    id: "terminal-renal",
    label: "말기신부전",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "투석기록지 또는 신장기능검사 결과지 (발급기관: 병원)",
      "입원/치료 확인서 (발급기관: 병원, 해당 시)",
    ],
  },
  {
    id: "terminal-illness",
    label: "말기질환",
    group: "diagnosis",
    docs: [
      "말기질환 진단서 또는 소견서 (발급기관: 병원)",
      "검사결과지 및 진료기록 사본 (발급기관: 병원)",
      "입원/치료 확인서 (발급기관: 병원, 해당 시)",
    ],
  },
  {
    id: "copd",
    label: "말기폐질환/만성폐쇄성폐질환",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "폐기능검사 결과지 (발급기관: 병원)",
      "흉부 CT/X-ray 판독지 (발급기관: 병원, 보험사 요청 시)",
    ],
  },
  {
    id: "burn-corrosion",
    label: "중대한 화상 및 부식",
    group: "care",
    docs: [
      "화상 정도와 부위가 기재된 진단서 (발급기관: 병원)",
      "응급실기록지 또는 초진기록지 (발급기관: 병원)",
      "입원/수술 확인서 (발급기관: 병원, 해당 시)",
    ],
  },
  {
    id: "arrhythmia",
    label: "특정부정맥/기타부정맥",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "심전도 또는 홀터검사 결과지 (발급기관: 병원)",
      "치료기록지 또는 시술확인서 (발급기관: 병원, 해당 시)",
    ],
  },
  {
    id: "urinary-stone",
    label: "요로결석",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 또는 진료확인서 (발급기관: 병원)",
      "CT/초음파/X-ray 판독지 (발급기관: 병원)",
      "쇄석술 또는 시술확인서 (발급기관: 병원, 해당 시)",
    ],
  },
  {
    id: "crohn-uc",
    label: "크론병/궤양성대장염",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "내시경 결과지 및 조직검사 결과지 (발급기관: 병원)",
      "진료기록 사본 또는 투약기록 (발급기관: 병원/약국)",
    ],
  },
  {
    id: "tuberculosis",
    label: "결핵/약제내성결핵",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "객담검사/배양검사 결과지 (발급기관: 병원)",
      "치료확인서 또는 투약기록 (발급기관: 병원/약국)",
    ],
  },
  {
    id: "dyslipidemia",
    label: "이상지질혈증",
    group: "diagnosis",
    docs: [
      "질병분류코드가 기재된 진단서 또는 진료확인서 (발급기관: 병원)",
      "혈액검사 결과지 (발급기관: 병원)",
      "투약기록 또는 처방전 (발급기관: 병원/약국)",
    ],
  },
  {
    id: "disability",
    label: "3대/4대장애",
    group: "special",
    docs: [
      "장애인증명서 또는 장애정도결정서 (발급기관: 주민센터/정부24)",
      "질병분류코드가 기재된 진단서 (발급기관: 병원)",
      "후유장해진단서 또는 관련 검사결과지 (발급기관: 병원, 보험사 요청 시)",
    ],
  },
  {
    id: "brain-disability",
    label: "뇌병변장애",
    group: "special",
    docs: [
      "장애인증명서 또는 장애정도결정서 (발급기관: 주민센터/정부24)",
      "뇌질환 진단서 및 영상검사 판독지 (발급기관: 병원)",
      "후유장해진단서 (발급기관: 병원, 보험사 요청 시)",
    ],
  },
  {
    id: "mental-disability",
    label: "정신적장애",
    group: "special",
    docs: [
      "장애인증명서 또는 장애정도결정서 (발급기관: 주민센터/정부24)",
      "정신건강의학과 진단서 (발급기관: 병원)",
      "진료기록 사본 또는 검사결과지 (발급기관: 병원)",
    ],
  },
  {
    id: "cast",
    label: "깁스치료",
    group: "care",
    docs: [
      "깁스치료 확인서 또는 진료확인서 (발급기관: 병원)",
      "질병분류코드가 기재된 진단서 (발급기관: 병원, 보험사 요청 시)",
      "엑스레이 판독지 (발급기관: 병원, 보험사 요청 시)",
    ],
  },
  {
    id: "liability",
    label: "일상생활배상책임",
    group: "special",
    docs: [
      "사고경위서 (작성: 고객)",
      "피해 사진 (준비: 고객)",
      "수리 견적서 및 영수증 (발급기관: 수리업체)",
      "신체 피해 시 진단서와 치료비 영수증 (발급기관: 병원)",
      "가족 일배책은 주민등록등본 (발급기관: 주민센터/정부24)",
    ],
  },
  {
    id: "citizen",
    label: "시민안전보험",
    group: "special",
    docs: [
      "보험금 청구서 (발급/작성: 보험사 양식)",
      "주민등록등본 (발급기관: 주민센터/정부24)",
      "사고사실확인서 또는 목격자 확인서 (발급기관: 경찰서/소방서/관계기관 또는 작성: 목격자)",
      "사망·후유장해·상해에 따른 추가 진단서류 (발급기관: 병원)",
    ],
  },
  {
    id: "public-facility",
    label: "영조물 배상책임",
    group: "special",
    docs: [
      "현장 하자 사진 (준비: 고객)",
      "목격자 정보 또는 CCTV 확보 여부 (발급/확인: 시설관리기관)",
      "진단서·소견서·초진기록지 또는 수리 견적서·영수증 (발급기관: 병원/수리업체)",
      "시설 관리 부서 사고 접수 확인 (발급/확인: 지자체/시설관리기관)",
    ],
  },
  {
    id: "fire",
    label: "화재",
    group: "special",
    docs: [
      "소방서 화재증명원 (발급기관: 소방서)",
      "피해 물품 목록 및 사진 (준비: 고객)",
      "수리·복구 견적서 (발급기관: 수리업체)",
      "손해액 증빙 영수증 (발급기관: 구매처/수리업체)",
      "건물대장 또는 임대차계약서 (발급기관: 정부24/등기소 또는 준비: 고객)",
    ],
  },
  {
    id: "death",
    label: "사망보험금",
    group: "special",
    docs: [
      "사망진단서 또는 시체검안서 (발급기관: 병원)",
      "기본증명서, 가족관계증명서, 혼인관계증명서 등 상속관계 확인서류 (발급기관: 주민센터/정부24)",
      "수익자 신분증 및 통장 사본 (준비: 수익자)",
      "재해사망은 사고사실확인서 또는 변사사실확인원 (발급기관: 경찰서/소방서/관계기관)",
    ],
  },
]
