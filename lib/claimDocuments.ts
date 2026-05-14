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
    "보험금 청구서",
    "입퇴원확인서 또는 진단서",
    "진료비 계산서(영수증) + 진료비 세부내역서",
    "신분증 사본 + 통장 사본",
  ],
  outpatient: [
    "보험금 청구서",
    "진료비 계산서(영수증) + 진료비 세부내역서",
    "진단서 또는 진료확인서",
    "신분증 사본 + 통장 사본",
  ],
}

export const COVERAGES: ClaimCoverage[] = [
  {
    id: "surgery",
    label: "수술",
    group: "care",
    docs: ["수술확인서 또는 수술명이 기재된 진단서", "수술기록지 또는 진료기록 사본이 필요한지 보험사에 확인"],
  },
  {
    id: "mri",
    label: "MRI",
    group: "care",
    docs: [
      "영상검사 판독지",
      "검사 시행일과 검사명이 확인되는 진료기록 또는 확인서",
      "MRI 영상촬영이 필요했던 사유 및 소견서가 필요한지 보험사에 확인",
    ],
  },
  {
    id: "caregiver",
    label: "간병",
    group: "care",
    docs: ["간병비 영수증", "간병인 사용 확인서", "간병업체 사업자등록증 사본", "간병일지", "필요 시 간호일지"],
    note: "가족 간병 특약은 가족관계증명서와 간병사실 확인서가 추가될 수 있습니다. 보험사별로 개인 위치정보를 간병인에게 요구하는 경우가 있으니 허위 간병이 이뤄지지 않도록 각별히 유의 부탁드립니다.",
  },
  {
    id: "homecare",
    label: "재가",
    group: "care",
    docs: ["장기요양인정서", "개인별 장기요양이용계획서", "장기요양급여 납부확인서", "장기요양급여 제공기록지"],
  },
  {
    id: "dental",
    label: "치아",
    group: "special",
    docs: ["보험사 치과치료확인서(치과에서 작성한 서류)", "치과진료기록부 사본", "진료비 계산서(영수증)", "보철치료 시 발치 전후 엑스레이 또는 파노라마"],
  },
  {
    id: "car-injury",
    label: "자부상",
    group: "special",
    docs: ["자동차보험 보상처리 내역서", "경찰 신고 건은 교통사고 사실확인원", "진단서 및 진료비 영수증"],
  },
  {
    id: "pet",
    label: "펫보험",
    group: "special",
    docs: ["동물병원 진료비 영수증", "진료비 세부내역서", "진단서 또는 진료확인서", "최초 청구 시 동물등록증"],
  },
  {
    id: "cancer",
    label: "암",
    group: "diagnosis",
    docs: ["조직검사 결과지", "질병분류코드가 기재된 진단서", "혈액암은 골수검사 및 혈액검사 결과지", "조직 채취가 어려운 경우 CT/MRI 판독지 및 종양표지자 결과"],
  },
  {
    id: "brain-heart",
    label: "뇌/심장",
    group: "diagnosis",
    docs: ["뇌질환은 CT, MRI, MRA 등 영상진단 판독보고서", "심장질환은 심전도, 심초음파, 관상동맥조영술, 심장효소검사 결과 중 해당 자료", "질병분류코드가 기재된 진단서"],
  },
  {
    id: "liability",
    label: "일상생활배상책임",
    group: "special",
    docs: ["사고경위서", "피해 사진", "수리 견적서 및 영수증", "신체 피해 시 진단서와 치료비 영수증", "가족 일배책은 주민등록등본"],
  },
  {
    id: "citizen",
    label: "시민안전보험",
    group: "special",
    docs: ["보험금 청구서", "주민등록등본", "사고사실확인서 또는 목격자 확인서", "사망·후유장해·상해에 따른 추가 진단서류"],
  },
  {
    id: "public-facility",
    label: "영조물 배상책임",
    group: "special",
    docs: ["현장 하자 사진", "목격자 정보 또는 CCTV 확보 여부", "진단서·소견서·초진기록지 또는 수리 견적서·영수증", "시설 관리 부서 사고 접수 확인"],
  },
  {
    id: "fire",
    label: "화재",
    group: "special",
    docs: ["소방서 화재증명원", "피해 물품 목록 및 사진", "수리·복구 견적서", "손해액 증빙 영수증", "건물대장 또는 임대차계약서"],
  },
]
