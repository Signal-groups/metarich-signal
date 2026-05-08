"use client"

import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { ArrowLeft, BookOpenCheck, ClipboardCheck, Search, ShieldCheck } from "lucide-react"

type CategoryId = "life" | "nonLife" | "underwriting" | "talk"

type ProductTopic = {
  id: string
  category: CategoryId
  group: string
  title: string
  purpose: string
  fit: string[]
  keyQuestions: string[]
  talkPoint: string
  caution: string[]
}

const categories: { id: CategoryId; label: string; caption: string }[] = [
  { id: "life", label: "생명보험", caption: "종신, 정기, 연금처럼 기간과 목적을 먼저 나누는 영역" },
  { id: "nonLife", label: "손해보험", caption: "실손, 건강, 운전자, 재물처럼 실제 손해와 비용을 보완하는 영역" },
  { id: "underwriting", label: "고지와 심사", caption: "일반심사, 간편심사, 부담보를 상담 전에 정리하는 영역" },
  { id: "talk", label: "상담 흐름", caption: "상품 설명을 고객 상황과 질문으로 바꾸는 영역" },
]

const topics: ProductTopic[] = [
  {
    id: "whole-life",
    category: "life",
    group: "종신 · 평생 보장",
    title: "종신보험",
    purpose: "사망보장을 평생 가져가면서 상속, 유족 생활비, 자산 이전, 해약환급금 활용까지 함께 검토하는 상품군입니다.",
    fit: ["부양가족이 있는 고객", "상속세나 자산 이전을 준비하는 고객", "장기 유지가 가능한 고객"],
    keyQuestions: ["가족에게 남겨야 할 최소 생활비는 얼마로 보시나요?", "자녀 독립 시기까지 보장 공백은 없으신가요?", "상속이나 유족 정리 자금까지 고려해보셨나요?"],
    talkPoint: "종신보험은 단순히 사망 시 받는 돈이 아니라, 가족에게 남기는 마지막 현금흐름으로 설명하면 이해가 빠릅니다.",
    caution: ["저해약, 체증, 환급형 등 구조별 해약환급금 차이를 구분합니다.", "저축처럼만 설명하지 말고 보장 목적을 먼저 잡습니다."],
  },
  {
    id: "term-life",
    category: "life",
    group: "정기 · 리스크 대비",
    title: "정기보험",
    purpose: "자녀 양육기, 대출 상환기, 사업 리스크 기간처럼 필요한 기간만 사망보장을 크게 준비하는 상품군입니다.",
    fit: ["보험료 부담을 낮추고 큰 보장이 필요한 가장", "자녀 독립 전까지 보장이 필요한 고객", "법인 대표나 핵심 임원"],
    keyQuestions: ["자녀가 독립하기 전까지 필요한 생활비가 계산되어 있나요?", "대출이나 사업 보증이 남아 있는 기간은 언제까지인가요?", "종신보다 기간형 보장이 더 효율적인 구간은 없나요?"],
    talkPoint: "정기보험은 평생 보장이 아니라 책임이 큰 기간을 집중 방어하는 보장이라고 설명합니다.",
    caution: ["만기 이후 보장 공백을 안내합니다.", "갱신형인지 비갱신형인지, 만기 환급 여부를 구분합니다."],
  },
  {
    id: "annuity",
    category: "life",
    group: "연금 · 노후자금",
    title: "연금보험",
    purpose: "노후 현금흐름을 만들기 위해 공시이율, 변액, 일시납, 세제적격 연금저축을 목적별로 나눠 설계합니다.",
    fit: ["은퇴 후 월 현금흐름이 필요한 고객", "세액공제와 노후자금을 함께 고민하는 직장인", "목돈을 연금화하려는 고객"],
    keyQuestions: ["연말정산 세액공제가 우선인가요, 비과세 노후자금이 우선인가요?", "원금 안정성과 투자 수익 중 어느 쪽이 더 편하신가요?", "은퇴 후 매달 필요한 생활비는 어느 정도인가요?"],
    talkPoint: "연금은 상품명보다 세제적격, 비적격, 공시이율, 변액을 먼저 나누면 고객이 선택 기준을 잡기 쉽습니다.",
    caution: ["중도해지, 연금수령 조건, 과세 기준을 반드시 확인합니다.", "변액은 투자성과에 따라 적립금이 변동될 수 있음을 설명합니다."],
  },
  {
    id: "medical",
    category: "nonLife",
    group: "의료 · 실손",
    title: "실손의료보험",
    purpose: "병원비 중 급여, 비급여, 자기부담금 구조를 설명하고 실제 치료비 부담을 줄이는 기본 보장입니다.",
    fit: ["의료비 보장의 기본을 점검해야 하는 고객", "기존 실손 세대와 보장내용을 모르는 고객", "비급여 치료 이용 가능성이 높은 고객"],
    keyQuestions: ["현재 실손이 몇 세대인지 알고 계신가요?", "비급여 치료와 자기부담금 구조를 설명 들어보신 적 있나요?", "보장하지 않는 항목까지 확인해보셨나요?"],
    talkPoint: "실손은 병원비를 전부 해결하는 보험이 아니라, 실제 부담한 의료비 중 약관상 보장되는 부분을 돌려받는 구조라고 설명합니다.",
    caution: ["세대별 보장비율, 갱신, 재가입 주기를 확인합니다.", "미용, 예방, 일부 비급여 등 보장 제외 항목을 구분합니다."],
  },
  {
    id: "cancer",
    category: "nonLife",
    group: "의료 · 건강",
    title: "암보험",
    purpose: "진단비는 생활비와 소득 공백, 치료비는 실제 치료 선택지를 넓히는 자금으로 분리해 설명합니다.",
    fit: ["가족력이나 치료비 걱정이 있는 고객", "입원보다 통원 치료가 늘어나는 흐름을 모르는 고객", "비급여 치료 부담을 걱정하는 고객"],
    keyQuestions: ["진단 후 치료비 말고 생활비는 몇 개월치가 준비되어 있나요?", "가방항암이라는 말을 들어보셨나요?", "표적, 면역, 항암 치료처럼 비급여 부담이 생기면 어떻게 준비하실 건가요?"],
    talkPoint: "암 진단비는 치료비만이 아니라 일을 쉬는 기간의 생활비와 가족 비용까지 담는 자금이라고 설명합니다.",
    caution: ["일반암, 유사암, 소액암, 고액암 분류를 확인합니다.", "면책기간과 감액기간을 반드시 안내합니다."],
  },
  {
    id: "brain-heart",
    category: "nonLife",
    group: "의료 · 건강",
    title: "뇌·심장 보장",
    purpose: "진단비, 수술비, 중환자실, 간병비까지 함께 보며 재발과 반복 치료 가능성을 준비합니다.",
    fit: ["고혈압, 당뇨, 가족력이 있는 고객", "진단비만 크게 준비한 고객", "보장범위가 좁은 옛 증권을 가진 고객"],
    keyQuestions: ["뇌출혈만 있는지 뇌혈관질환까지 있는지 확인해보셨나요?", "급성심근경색만인지 허혈성심장질환까지 보장되는지 아시나요?", "수술과 중환자실 비용까지 준비되어 있나요?"],
    talkPoint: "뇌와 심장은 보장범위가 넓을수록 실제 청구 가능성이 높아질 수 있어 진단명 범위를 먼저 봐야 합니다.",
    caution: ["질병명 범위와 수술비 지급 조건을 구분합니다.", "기존 증권의 보장명만 보고 충분하다고 판단하지 않습니다."],
  },
  {
    id: "surgery",
    category: "nonLife",
    group: "건강보험 · 수술비",
    title: "수술비",
    purpose: "일반수술, 종수술, N대수술의 차이를 구분해 반복 수술과 고액 수술에 필요한 비용을 준비하는 보장입니다.",
    fit: ["진단비만 있고 수술비가 약한 고객", "뇌·심장·관절 등 반복 수술 가능성이 있는 고객", "기존 증권의 수술비 구조를 모르는 고객"],
    keyQuestions: ["수술비가 일반수술비인지 종수술비인지 N대수술비인지 구분해보신 적 있나요?", "한 번이 아니라 반복 수술이 필요할 때도 지급되는 구조인가요?", "진단비는 있는데 수술·입원·간병비는 따로 준비되어 있나요?"],
    talkPoint: "일반수술비는 넓게, 종수술비는 수술 난이도별로, N대수술비는 특정 질병·수술 목록 중심으로 보는 구조라고 설명하면 쉽습니다.",
    caution: ["약관상 수술의 정의와 제외되는 처치가 있습니다.", "같은 수술이라도 담보별 지급 방식과 중복 지급 여부가 다를 수 있습니다."],
  },
  {
    id: "major-cancer-treatment",
    category: "nonLife",
    group: "건강보험 · 주요치료비",
    title: "암 주요치료비",
    purpose: "암 진단 후 수술, 항암, 방사선, 표적·면역치료 등 치료 과정에서 반복적으로 발생하는 고액 치료비를 보완하는 관점입니다.",
    fit: ["진단비는 있지만 치료비 담보가 약한 고객", "비급여나 전액본인부담 치료 선택지를 걱정하는 고객", "통원 항암과 장기 치료 가능성을 고려해야 하는 고객"],
    keyQuestions: ["암 진단비를 생활비로 쓰고 나면 실제 치료비는 어디서 준비하실 건가요?", "항암, 방사선, 표적치료처럼 치료가 반복될 때 비용 구조를 들어보셨나요?", "가방항암처럼 병원을 오가며 생기는 교통비와 보호자 비용까지 생각해보셨나요?"],
    talkPoint: "암 진단비는 생활비, 암 주요치료비는 실제 치료 선택지를 지키는 돈으로 분리해 설명합니다.",
    caution: ["치료 인정 범위, 연간 한도, 보장개시일, 지급 횟수를 확인합니다.", "모든 비급여 치료가 자동 보장되는 것처럼 설명하지 않습니다."],
  },
  {
    id: "major-circulatory-treatment",
    category: "nonLife",
    group: "건강보험 · 주요치료비",
    title: "순환계 주요치료비",
    purpose: "뇌혈관·심혈관 질환 치료 과정에서 발생하는 수술, 시술, 중환자실, 재활, 간병 비용 부담을 보완하는 보장입니다.",
    fit: ["고혈압, 당뇨, 고지혈증 가족력이 있는 고객", "뇌·심장 진단비만 보유한 고객", "스텐트, 재수술, 재활 가능성을 고려해야 하는 고객"],
    keyQuestions: ["뇌·심장 질환은 진단 후 바로 끝나는 것이 아니라 시술, 재활, 재발 관리가 필요할 수 있다는 점을 아시나요?", "중환자실이나 간병비가 생기면 누가 부담하게 될까요?", "진단비 외에 실제 치료 단계별 비용이 준비되어 있나요?"],
    talkPoint: "순환계 질환은 빠른 치료도 중요하지만 치료 후 재활과 반복 관리 비용까지 이어질 수 있다고 설명합니다.",
    caution: ["보장 질병명과 치료 항목이 약관상 어떻게 정의되는지 확인합니다.", "진단비, 수술비, 입원비, 주요치료비가 서로 다른 역할임을 구분합니다."],
  },
  {
    id: "care",
    category: "nonLife",
    group: "건강보험 · 간병과 재가",
    title: "간병보험",
    purpose: "장기요양이나 간병 상태가 되었을 때 시설비, 가족의 소득 공백, 비급여 돌봄 비용을 보완하는 보장입니다.",
    fit: ["부모님 간병 경험이 있는 고객", "가족에게 부담을 주고 싶지 않은 고객", "요양원·요양병원 비용을 걱정하는 고객"],
    keyQuestions: ["간병이 필요해지면 가족 중 누가 시간을 내야 할까요?", "국가 지원 후에도 남는 본인부담과 비급여 비용을 생각해보셨나요?", "요양시설을 이용할 경우 매달 필요한 돈은 어느 정도로 보시나요?"],
    talkPoint: "간병보험은 병원비 보험이라기보다, 오래 돌봄이 필요할 때 가족의 돈과 시간을 지켜주는 보험이라고 설명합니다.",
    caution: ["장기요양 등급, 지급 조건, 갱신 여부를 확인합니다.", "요양병원 치료비와 요양시설 돌봄 비용을 혼동하지 않게 설명합니다."],
  },
  {
    id: "home-care",
    category: "nonLife",
    group: "건강보험 · 간병과 재가",
    title: "재가보험",
    purpose: "집에서 생활을 유지하면서 방문요양, 방문목욕, 방문간호, 주야간보호 등을 이용할 때 부족한 비용을 보완하는 관점입니다.",
    fit: ["시설보다 집에서 돌봄받고 싶은 고객", "가족 돌봄 시간이 제한적인 고객", "방문요양 추가 이용 비용이 걱정되는 고객"],
    keyQuestions: ["가능하면 집에서 돌봄받고 싶으신 편인가요?", "방문요양 시간이 부족하면 추가 비용은 누가 부담하게 될까요?", "복지용구나 주야간보호까지 생각해보셨나요?"],
    talkPoint: "재가보험은 요양원에 들어가기 전, 집에서 생활을 최대한 유지하기 위한 비용이라고 설명하면 이해가 쉽습니다.",
    caution: ["국가 장기요양보험의 월 한도와 본인부담은 최신 기준 확인이 필요합니다.", "간병보험과 재가보험의 사용 장소와 목적을 구분합니다."],
  },
  {
    id: "dental",
    category: "nonLife",
    group: "건강보험 · 치아",
    title: "치아보험",
    purpose: "충전, 크라운 같은 보존치료와 임플란트, 브릿지, 틀니 같은 보철치료를 구분해 치과 치료비 부담을 줄이는 보장입니다.",
    fit: ["충치나 잇몸 치료가 잦은 고객", "임플란트 가능성을 걱정하는 고객", "치과 비급여 비용 부담이 큰 고객"],
    keyQuestions: ["충전·크라운과 임플란트·브릿지의 보장 방식이 다르다는 점을 알고 계셨나요?", "면책기간과 감액기간이 지나야 제대로 보장될 수 있다는 점을 확인하셨나요?", "현재 치료 중이거나 진단받은 치아가 있나요?"],
    talkPoint: "치아보험은 당장 치료받을 치아를 해결하는 보험이 아니라, 앞으로 생길 보존·보철 치료비를 준비하는 보험이라고 설명합니다.",
    caution: ["면책기간, 감액기간, 연간 보장 한도, 동일 치아 중복 보장 제한을 확인합니다.", "가입 전 이미 진단받은 치아는 보장 제한이 있을 수 있습니다."],
  },
  {
    id: "pet",
    category: "nonLife",
    group: "건강보험 · 반려동물",
    title: "반려동물보험",
    purpose: "반려견·반려묘의 질병이나 상해로 발생한 동물병원 치료비를 보장비율과 자기부담금 구조로 보완하는 상품입니다.",
    fit: ["반려동물 병원비 부담이 걱정되는 고객", "노령 반려동물을 키우는 고객", "수술비와 배상책임까지 함께 보고 싶은 고객"],
    keyQuestions: ["보장비율과 자기부담금에 따라 실제 받는 보험금이 달라진다는 점을 알고 계신가요?", "입원, 통원, 수술 한도와 갱신 주기를 확인해보셨나요?", "슬개골, 피부, 구강질환처럼 자주 문제되는 항목이 보장되는지 보셨나요?"],
    talkPoint: "펫보험은 병원비 전액을 대신 내주는 구조가 아니라, 자기부담금을 뺀 뒤 선택한 보장비율만큼 보완하는 구조라고 설명합니다.",
    caution: ["나이, 품종, 기존 질병, 면책기간, 갱신 보험료를 확인합니다.", "미용, 예방, 중성화, 선천성 질환 등 보장 제외 가능 항목을 구분합니다."],
  },
  {
    id: "accident",
    category: "nonLife",
    group: "상해 · 재해",
    title: "상해보험",
    purpose: "급격하고 우연한 외래 사고로 인한 사망, 후유장해, 입원, 수술, 골절 등 손해를 보완하는 보장입니다.",
    fit: ["활동량이 많은 고객", "현장직이나 이동이 잦은 고객", "운동, 레저, 출장이 많은 고객"],
    keyQuestions: ["질병이 아니라 사고로 다쳤을 때 치료비와 소득 공백은 준비되어 있나요?", "골절이나 깁스, 입원, 수술 담보가 어떻게 되어 있나요?", "직업이나 취미 변경이 보험에 영향을 줄 수 있다는 점을 알고 계신가요?"],
    talkPoint: "상해보험은 사고가 났을 때 치료비뿐 아니라 일을 못 하는 기간의 부담까지 함께 보는 보장입니다.",
    caution: ["직업급수, 위험 취미, 음주나 고의 사고 등 보상 제한 조건을 확인합니다.", "질병담보와 상해담보를 혼동하지 않습니다."],
  },
  {
    id: "driver",
    category: "nonLife",
    group: "상해 · 운전자",
    title: "운전자보험",
    purpose: "자동차보험이 보장하지 않는 형사합의금, 벌금, 변호사비 등 운전자 본인의 법률 책임을 보완합니다.",
    fit: ["자가 운전이 잦은 고객", "업무상 운전이 많은 고객", "자동차보험만 있으면 충분하다고 생각하는 고객"],
    keyQuestions: ["자동차보험과 운전자보험의 보장 대상이 다르다는 점을 알고 계셨나요?", "사고 후 벌금이나 변호사비 준비가 되어 있나요?", "최근 보장 한도로 점검해보셨나요?"],
    talkPoint: "자동차보험은 상대방 피해, 운전자보험은 내 형사·법률 책임이라는 식으로 나누면 바로 이해됩니다.",
    caution: ["음주, 무면허, 도주 등은 보상 제한 가능성이 큽니다.", "기존 담보와 최신 한도를 비교합니다."],
  },
  {
    id: "fire",
    category: "nonLife",
    group: "화재 · 재물",
    title: "화재보험",
    purpose: "화재, 폭발, 누수, 풍수해 등으로 내 건물과 집기, 재고에 생길 수 있는 손해를 복구하는 보장입니다.",
    fit: ["사업장이나 사무실을 운영하는 고객", "임차 매장을 사용하는 고객", "건물, 집기, 재고 금액을 정리하지 않은 고객"],
    keyQuestions: ["화재가 나면 건물, 인테리어, 집기, 재고를 각각 얼마로 복구해야 할까요?", "임차한 공간의 원상복구 책임까지 생각해보셨나요?", "화재 배상책임과 내 재물 손해를 구분하고 계신가요?"],
    talkPoint: "화재보험은 불이 났을 때 내 재산을 다시 세우는 돈이고, 배상책임은 남에게 물어줄 돈이라고 나눠 설명합니다.",
    caution: ["보험가입금액이 실제 재산가액보다 낮으면 일부보험 문제가 생길 수 있습니다.", "소재지, 업종, 면적, 목적물 변경 시 반드시 점검합니다."],
  },
  {
    id: "property",
    category: "nonLife",
    group: "저축 · 재물",
    title: "재물·화재보험",
    purpose: "건물, 집기, 재고, 시설 배상, 화재 배상처럼 내 손해와 타인 배상책임을 함께 점검하는 상품군입니다.",
    fit: ["사업장, 매장, 사무실을 운영하는 고객", "임차 시설을 사용하는 고객", "화재와 배상책임을 분리해본 적 없는 고객"],
    keyQuestions: ["화재가 나면 내 물건 복구비와 타인 피해 배상을 따로 준비해야 한다는 점을 아시나요?", "시설물 사고로 고객이 다치면 어떤 보험에서 보상될까요?", "임대차 계약상 배상책임 조건을 확인해보셨나요?"],
    talkPoint: "재물보험은 내 재산을 복구하는 돈, 배상책임은 남에게 물어줄 돈으로 나누어 설명합니다.",
    caution: ["목적물, 소재지, 업종, 면적, 집기 재고 금액을 실제와 맞춥니다.", "화재배상책임과 시설배상책임의 차이를 안내합니다."],
  },
  {
    id: "liability",
    category: "nonLife",
    group: "화재 · 재물 · 배상책임",
    title: "배상책임보험",
    purpose: "내 시설, 영업, 제품, 일상생활로 타인의 신체나 재물에 손해를 끼쳤을 때 법률상 배상책임을 보완하는 보장입니다.",
    fit: ["매장이나 사무실에 고객이 방문하는 사업자", "시설물 사고 가능성이 있는 고객", "제품 판매나 용역 제공을 하는 고객"],
    keyQuestions: ["고객이 매장에서 넘어지거나 시설물 때문에 다치면 어디서 보상될까요?", "내 물건 손해와 남에게 물어줄 손해를 분리해서 준비하셨나요?", "계약서나 임대차 조건에 배상책임 가입 요구가 있나요?"],
    talkPoint: "배상책임은 내 손해가 아니라 남에게 끼친 손해를 대신 물어주는 보험이라고 설명하면 쉽습니다.",
    caution: ["시설, 생산물, 화재, 일상생활 등 원인별 배상책임 담보를 구분합니다.", "고의, 벌금, 계약상 가중책임 등은 보장 제한 가능성이 있습니다."],
  },
  {
    id: "savings",
    category: "nonLife",
    group: "저축 · 재물",
    title: "저축보험",
    purpose: "목돈 마련이나 중장기 자금 준비를 위해 공시이율, 최저보증, 사업비, 해약환급금 구조를 확인하는 상품군입니다.",
    fit: ["중장기 목적자금이 필요한 고객", "원금 안정성을 중요하게 보는 고객", "예금과 보험의 차이를 이해해야 하는 고객"],
    keyQuestions: ["이 돈은 몇 년 뒤 어떤 목적으로 쓰실 예정인가요?", "중도해지하면 원금보다 적을 수 있다는 점을 알고 계신가요?", "예금과 달리 사업비와 해약환급금 구조가 있다는 점을 확인하셨나요?"],
    talkPoint: "저축보험은 단기 수익 상품이 아니라 장기 유지 전제로 안정적인 목적자금을 준비하는 상품이라고 설명합니다.",
    caution: ["해약환급금, 적용이율, 최저보증, 추가납입 가능 여부를 확인합니다.", "단기 유동성이 필요한 돈에는 맞지 않을 수 있습니다."],
  },
  {
    id: "simple-underwriting",
    category: "underwriting",
    group: "계약 전 확인",
    title: "일반심사와 간편심사",
    purpose: "건강상태와 고지 범위에 따라 일반심사, 간편심사, 유병자 상품을 구분해 가입 가능성을 판단합니다.",
    fit: ["최근 치료 이력이 있는 고객", "고혈압, 당뇨 등 만성질환 고객", "과거 거절 경험이 있는 고객"],
    keyQuestions: ["최근 3개월 안에 추가검사나 재검사 권유를 받으셨나요?", "최근 2년 안에 입원이나 수술이 있었나요?", "최근 5년 안에 큰 질병 진단이나 치료가 있었나요?"],
    talkPoint: "간편심사는 쉬운 가입이 아니라 고지 질문이 단순한 심사 방식이라고 설명해야 정확합니다.",
    caution: ["고지의무 위반은 계약 해지나 보험금 분쟁으로 이어질 수 있음을 안내합니다.", "가입 가능성만 말하지 말고 부담보, 할증, 면책 가능성도 함께 설명합니다."],
  },
  {
    id: "product-talk",
    category: "talk",
    group: "상품 설명 방식",
    title: "상품 상담 기본 흐름",
    purpose: "상품을 바로 설명하기보다 고객의 위험, 필요한 돈, 유지 가능한 보험료, 기존 보장 순서로 대화를 정리합니다.",
    fit: ["상품 설명이 길어지는 설계사", "고객이 비교를 어려워하는 상황", "보장분석 후 제안으로 넘어가는 상담"],
    keyQuestions: ["이 보장은 언제 실제로 쓰일까요?", "그 상황에서 필요한 돈은 병원비인가요, 생활비인가요, 배상금인가요?", "기존 보험에서 이미 준비된 부분과 빠진 부분은 무엇인가요?"],
    talkPoint: "상품명보다 사용 상황을 먼저 말하면 고객은 보험을 비용이 아니라 해결 도구로 이해합니다.",
    caution: ["특정 회사명이나 상품명 중심의 설명은 피합니다.", "장점만 말하지 말고 제한 조건과 유지 부담을 같이 설명합니다."],
  },
]

function getTopics(category: CategoryId, query: string) {
  const base = topics.filter((topic) => topic.category === category)
  if (!query.trim()) return base
  const keyword = query.trim().toLowerCase()
  return base.filter((topic) => {
    const text = [topic.group, topic.title, topic.purpose, topic.talkPoint, ...topic.fit, ...topic.keyQuestions].join(" ").toLowerCase()
    return text.includes(keyword)
  })
}

export default function ProductAllPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("life")
  const [selectedId, setSelectedId] = useState("whole-life")
  const [query, setQuery] = useState("")

  const visibleTopics = useMemo(() => getTopics(activeCategory, query), [activeCategory, query])
  const selectedTopic = visibleTopics.find((topic) => topic.id === selectedId) || visibleTopics[0] || topics.find((topic) => topic.category === activeCategory) || topics[0]

  const handleCategory = (id: CategoryId) => {
    setActiveCategory(id)
    setSelectedId(topics.find((topic) => topic.category === id)?.id || topics[0].id)
  }

  return (
    <main className="min-h-screen bg-[#eef3fb] text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 md:px-8">
        <header className="flex flex-col gap-4 rounded-lg bg-[#14386f] p-6 text-white shadow-sm md:flex-row md:items-end md:justify-between">
          <div>
            <button
              onClick={() => window.close()}
              className="mb-5 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[13px] font-bold text-white hover:bg-white/15"
            >
              <ArrowLeft size={16} />
              대시보드로 돌아가기
            </button>
            <p className="text-[12px] font-black uppercase text-sky-200">Metarich Signal Product Guide</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">상품의 모든것</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-blue-50">
              생명보험과 손해보험 상품군을 상담 목적별로 정리한 내부 업무용 가이드입니다. 상품명보다 고객 상황, 필요한 돈, 주의사항을 먼저 확인하도록 구성했습니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {["상품 분류", "핵심 질문", "상담 포인트"].map((label) => (
              <div key={label} className="rounded-lg border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[12px] font-black text-sky-100">{label}</p>
              </div>
            ))}
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="상품, 상황 검색"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-[14px] font-bold outline-none focus:border-[#2563eb] focus:bg-white"
                />
              </div>
            </div>

            <nav className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategory(category.id)}
                  className={`mb-2 w-full rounded-lg p-4 text-left transition last:mb-0 ${
                    activeCategory === category.id ? "bg-[#14386f] text-white" : "bg-slate-50 text-slate-700 hover:bg-blue-50"
                  }`}
                >
                  <span className="block text-[15px] font-black">{category.label}</span>
                  <span className={`mt-1 block text-[12px] leading-5 ${activeCategory === category.id ? "text-blue-100" : "text-slate-500"}`}>
                    {category.caption}
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          <section className="grid gap-4 xl:grid-cols-[340px_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center gap-2 px-2 pt-1 text-[#14386f]">
                <BookOpenCheck size={18} />
                <h2 className="text-[15px] font-black">상품 목차</h2>
              </div>
              <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
                {visibleTopics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedId(topic.id)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      selectedTopic.id === topic.id ? "border-[#2563eb] bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200"
                    }`}
                  >
                    <p className="text-[11px] font-black text-slate-400">{topic.group}</p>
                    <p className="mt-1 text-[16px] font-black text-slate-900">{topic.title}</p>
                    <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-slate-500">{topic.purpose}</p>
                  </button>
                ))}
                {visibleTopics.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-[14px] font-bold text-slate-500">
                    검색 결과가 없습니다.
                  </div>
                )}
              </div>
            </div>

            <article className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[12px] font-black text-[#2563eb]">{selectedTopic.group}</p>
                  <h2 className="mt-1 text-3xl font-black text-[#14386f]">{selectedTopic.title}</h2>
                  <p className="mt-3 text-[15px] leading-7 text-slate-600">{selectedTopic.purpose}</p>
                </div>
                <div className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-[13px] font-black text-emerald-700">
                  <ShieldCheck size={18} />
                  상담용 정리
                </div>
              </div>

              <InfoBlock icon={<ClipboardCheck size={19} />} title="어떤 고객에게 맞나요?" items={selectedTopic.fit} />
              <InfoBlock icon={<Search size={19} />} title="상담 핵심 질문" items={selectedTopic.keyQuestions} />

              <section className="rounded-lg border border-blue-100 bg-blue-50 p-5">
                <p className="text-[13px] font-black text-[#2563eb]">설명 포인트</p>
                <p className="mt-2 text-[15px] leading-7 font-bold text-slate-800">{selectedTopic.talkPoint}</p>
              </section>

              <InfoBlock icon={<ShieldCheck size={19} />} title="주의할 점" items={selectedTopic.caution} tone="amber" />
            </article>
          </section>
        </section>
      </div>
    </main>
  )
}

function InfoBlock({ icon, title, items, tone = "slate" }: { icon: ReactNode; title: string; items: string[]; tone?: "slate" | "amber" }) {
  return (
    <section className={`rounded-lg border p-5 ${tone === "amber" ? "border-amber-100 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
      <div className={`mb-3 flex items-center gap-2 text-[15px] font-black ${tone === "amber" ? "text-amber-700" : "text-[#14386f]"}`}>
        {icon}
        {title}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg bg-white p-4 text-[14px] font-bold leading-6 text-slate-700 shadow-sm">
            {item}
          </div>
        ))}
      </div>
    </section>
  )
}
