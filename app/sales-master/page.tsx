"use client"

import { useMemo, useState, type ReactNode } from "react"

type TabId = "process" | "db" | "appointment" | "objection" | "preObjection" | "fc" | "coach"
type StageId = "prospecting" | "ta" | "ap" | "ff" | "pt" | "closing" | "service"

type Stage = {
  id: StageId
  no: string
  title: string
  subtitle: string
  summary: string
  goal: string
  why: string
  mustDo: string[]
  preparation: string[]
  training: string[]
  flow: string[]
  checklist: string[]
  customerGuide: { type: string; point: string; next: string }[]
  objections: { scene: string; reply: string; close: string }[]
  scripts: string[]
}

type FcTheme = {
  title: string
  subtitle: string
  stage: string
  betterWay: string
  examples: { situation: string; approach: string; line: string }[]
  training: string[]
}

const tabs: { id: TabId; label: string }[] = [
  { id: "process", label: "세일즈 프로세스" },
  { id: "db", label: "DB 영업" },
  { id: "appointment", label: "약속잡기" },
  { id: "objection", label: "거절/반론" },
  { id: "preObjection", label: "선거절 멘트" },
  { id: "fc", label: "이런 방법도 있어요!" },
  { id: "coach", label: "상황 코치" },
]

const processPrinciples = [
  {
    title: "세일즈 프로세스란?",
    text: "고객을 설득하는 즉흥 기술이 아니라, 고객 발굴부터 증권전달과 소개까지 매번 같은 기준으로 상담 품질을 관리하는 순서입니다.",
  },
  {
    title: "왜 해야 하나?",
    text: "단계가 없으면 상담이 상품 설명으로 흐르고, 거절이 나오면 대응이 흔들립니다. 프로세스는 고객 신뢰, 약속률, 계약률, 소개율을 분리해서 개선하게 해줍니다.",
  },
  {
    title: "어떻게 훈련하나?",
    text: "각 단계별 목적, 질문, 다음 행동, 거절 대응을 짧은 문장으로 반복합니다. 특히 TA, AP, PT, C는 녹음 점검과 역할극으로 훈련해야 실전에서 흔들리지 않습니다.",
  },
]

const stages: Stage[] = [
  {
    id: "prospecting",
    no: "01",
    title: "Prospecting",
    subtitle: "가망고객 발굴",
    summary: "잠재고객을 식별하고 DB, 소개, 지인, 일반 고객으로 분류하는 단계",
    goal: "연락할 사람을 많이 모으는 것이 아니라, 접근 명분과 우선순위가 있는 고객 리스트를 만드는 것입니다.",
    why: "고객 발굴이 약하면 TA부터 무리하게 설득하게 됩니다. 좋은 리스트는 통화의 첫 문장과 약속 명분을 이미 만들어 줍니다.",
    mustDo: ["고객 출처와 연락 가능성을 기록합니다.", "DB, 소개, 지인, 일반 고객으로 분류합니다.", "고객별 접근 명분을 한 문장으로 만듭니다.", "급한 고객과 장기 관리 고객을 나눕니다."],
    preparation: ["고객 리스트 양식", "DB 출처와 신청 이력", "소개자 정보", "첫 연락용 한 문장 멘트", "우선순위 기준표"],
    training: ["하루 20명 고객을 유형별로 분류하는 연습", "각 고객에게 연락해야 하는 이유를 10초 안에 말하는 연습", "좋은 명분과 약한 명분을 비교하는 팀 리뷰"],
    flow: ["고객 출처 확인", "고객 유형 분류", "접근 명분 작성", "우선순위 정렬", "첫 연락 채널 결정"],
    checklist: ["고객이 왜 연락받는지 이해할 수 있는가", "판매가 아닌 확인 또는 점검 명분이 있는가", "첫 접촉 목표가 AP인지 자료 발송인지 정해졌는가", "추적 관리할 다음 날짜가 있는가"],
    customerGuide: [
      { type: "DB 고객", point: "신청, 조회, 이벤트, 상담 이력처럼 고객이 남긴 행동을 근거로 접근합니다.", next: "판매보다 접수 확인과 점검 예약을 목표로 둡니다." },
      { type: "소개 고객", point: "소개자의 신뢰를 빌리되 고객에게 부담을 주지 않는 표현이 중요합니다.", next: "소개자가 왜 연결했는지 짧게 말하고 선택권을 줍니다." },
      { type: "지인", point: "관계를 판매로 소모하지 않도록 도움의 명분을 먼저 잡습니다.", next: "보험료 절감, 보장 누락 확인처럼 가벼운 확인 약속으로 시작합니다." },
      { type: "일반 고객", point: "문제 인식이 약하므로 질문으로 필요성을 발견해야 합니다.", next: "결정 요구보다 현재 상태 확인을 제안합니다." },
    ],
    objections: [{ scene: "연락 명분이 약함", reply: "지금 연락의 목적을 가입이 아니라 확인으로 낮추세요. 고객 입장에서는 왜 나에게 연락했는지가 먼저입니다.", close: "점검 대상 여부만 확인드리고 필요 없으면 정리해드리겠습니다." }],
    scripts: ["이번 연락은 가입 안내가 아니라 현재 보장과 보험금 청구 가능 여부를 확인드리는 목적입니다.", "먼저 지금 확인이 필요한 분인지 간단히 보고, 필요 없으면 더 연락드리지 않겠습니다."],
  },
  {
    id: "ta",
    no: "02",
    title: "Telephone / Pre Approach",
    subtitle: "전화 및 사전접근",
    summary: "초기 접촉으로 관계를 만들고 AP 약속을 잡는 단계",
    goal: "TA의 목적은 통화에서 모든 것을 설명하는 것이 아니라, 초회면담 약속을 잡는 것입니다.",
    why: "TA에서 설명을 많이 하면 고객은 판단을 끝내버립니다. 짧게 신뢰와 명분을 만들고 다음 약속으로 넘겨야 상담 기회가 생깁니다.",
    mustDo: ["본인 확인과 연락 경로를 말합니다.", "가입 권유가 아니라 점검 목적임을 밝힙니다.", "고객의 시간을 줄여주겠다고 안심시킵니다.", "시간 선택지를 2개로 제시합니다."],
    preparation: ["첫 10초 오프닝", "DB별 출처 문장", "바쁨/관심 없음/보험 많음 대응", "약속 가능 시간표", "문자 후속 멘트"],
    training: ["오프닝 10초 녹음 후 어색한 단어 제거", "바빠요 거절을 5가지 방식으로 처리하는 역할극", "통화 목표를 AP 한 가지로 유지하는 연습"],
    flow: ["본인 확인", "연락 경로와 목적 안내", "짧은 확인 질문", "점검 가치 제시", "AP 시간 선택"],
    checklist: ["첫 10초 안에 신뢰 출처를 말했는가", "상담이 아니라 점검 예약으로 표현했는가", "시간 선택지를 2개로 좁혔는가", "거절 후에도 다음 행동을 남겼는가"],
    customerGuide: [
      { type: "DB 고객", point: "신청 또는 문의 이력을 근거로 통화합니다.", next: "자료 발송 후 15분 점검 예약으로 연결합니다." },
      { type: "소개 고객", point: "소개자 이름을 먼저 말하되 자세한 개인정보는 말하지 않습니다.", next: "부담 없는 확인 자리라고 정리합니다." },
      { type: "지인", point: "친분보다 전문적인 도움의 명분을 먼저 세웁니다.", next: "현재 보험에서 놓치기 쉬운 부분만 봐주겠다고 제안합니다." },
      { type: "일반 고객", point: "흥미를 만들기보다 손실 가능성을 짧게 인식시킵니다.", next: "숨은 보험금, 중복 보험료, 보장 공백 중 하나로 진입합니다." },
    ],
    objections: [
      { scene: "바빠요", reply: "네, 길게 설명드리려는 통화는 아닙니다. 가능하신 시간만 확인하고 그때 짧게 안내드리겠습니다.", close: "오늘 저녁 6시 이후와 내일 오전 중 어느 쪽이 편하실까요?" },
      { scene: "관심 없어요", reply: "네, 가입 권유가 아니라 놓치기 쉬운 보장과 청구 가능 여부를 확인드리는 내용입니다.", close: "필요 없으시면 바로 정리해드릴 수 있게 30초만 확인드려도 될까요?" },
    ],
    scripts: ["안녕하세요, 고객님. 남겨주신 보험 점검 문의 내용 확인차 연락드렸습니다.", "오늘 전화로 길게 설명드리기보다 전문가가 현재 보장 상태만 짧게 확인드릴 수 있게 예약을 도와드리려고 합니다."],
  },
  {
    id: "ap",
    no: "03",
    title: "Approach Interview",
    subtitle: "초회면담",
    summary: "고객과 첫 직접 만남에서 신뢰를 만들고 상담 방향을 합의하는 단계",
    goal: "고객이 방어하지 않도록 오늘의 상담 목적과 진행 순서를 먼저 합의합니다.",
    why: "AP가 약하면 고객은 상담을 판매 시간으로 느낍니다. 첫 만남에서 신뢰와 상담 규칙을 만들면 이후 질문과 제안이 자연스러워집니다.",
    mustDo: ["오늘 상담의 목적을 설명합니다.", "고객이 원하는 결과를 먼저 묻습니다.", "상담 시간과 범위를 합의합니다.", "자료 확인 동의를 받습니다."],
    preparation: ["상담 시작 멘트", "진행 순서 안내 문장", "고객 기대 질문", "증권 확인 동의 멘트", "라포 질문 3개"],
    training: ["첫 3분 상담 오프닝 역할극", "상품 이야기를 참는 연습", "고객 기대를 질문으로 끌어내는 연습"],
    flow: ["라포 형성", "상담 목적 확인", "진행 순서 안내", "고객 기대 확인", "Fact Finding 동의"],
    checklist: ["상품 이야기를 서두르지 않았는가", "고객이 원하는 결과를 물었는가", "자료 확인 동의를 받았는가", "다음 단계로 넘어갈 허락을 받았는가"],
    customerGuide: [
      { type: "DB 고객", point: "처음 보는 고객이므로 불안 제거가 우선입니다.", next: "신청 내용 확인과 점검 범위를 명확히 합니다." },
      { type: "소개 고객", point: "소개자의 신뢰를 고객 본인의 신뢰로 전환해야 합니다.", next: "소개 이야기는 짧게, 고객 상황 질문으로 옮깁니다." },
      { type: "지인", point: "편한 관계일수록 상담 기준을 분명히 해야 합니다.", next: "친분과 상담을 분리해서 오늘 확인할 주제를 정합니다." },
      { type: "일반 고객", point: "전문가 포지션과 고객의 선택권을 함께 보여줍니다.", next: "문제 발견 후 결정은 고객이 한다는 점을 강조합니다." },
    ],
    objections: [
      { scene: "그냥 설명만 듣고 싶어요", reply: "좋습니다. 다만 설명이 고객님 상황과 맞아야 의미가 있어서 먼저 현재 기준을 짧게 확인하겠습니다.", close: "가족 구성, 납입 보험료, 걱정되는 질병 순서로만 확인해도 될까요?" },
      { scene: "가입은 생각 없어요", reply: "네, 오늘 목적은 가입 결정이 아니라 현재 상태를 아는 것입니다. 충분하면 충분한 대로 정리해드리겠습니다.", close: "현재 증권 기준으로 과한 부분과 비어 있는 부분만 보겠습니다." },
    ],
    scripts: ["오늘은 상품을 먼저 설명드리기보다 고객님 보험이 지금 상황에 맞는지 확인하는 순서로 진행하겠습니다.", "마지막에는 유지할 것, 줄일 것, 보완할 것을 구분해서 드리겠습니다."],
  },
  {
    id: "ff",
    no: "04",
    title: "Fact Finding",
    subtitle: "사실 확인",
    summary: "고객의 니즈, 문제점, 보장 공백, 예산을 파악하는 단계",
    goal: "고객의 말과 실제 증권, 가족 상황, 예산을 연결해 문제를 발견합니다.",
    why: "Fact Finding이 없으면 제안은 상품 설명이 됩니다. 고객의 문제를 고객의 말로 정리해야 PT와 클로징이 설득이 아니라 해결이 됩니다.",
    mustDo: ["가족, 직업, 소득, 병력, 예산을 확인합니다.", "기존 보험의 중복, 공백, 갱신, 부담을 분리합니다.", "고객의 걱정을 고객 언어로 기록합니다.", "해결 우선순위를 1~3개로 정리합니다."],
    preparation: ["상담 질문지", "증권 확인표", "월 보험료 기록란", "암/뇌/심장/수술/간병 체크표", "우선순위 정리 양식"],
    training: ["질문 후 바로 설명하지 않고 한 번 더 묻는 연습", "고객 답변을 요약해서 되돌려주는 연습", "증권에서 문제 3개를 찾는 훈련"],
    flow: ["가족/직업/소득 확인", "기존 보험 확인", "보험료 부담 확인", "청구 경험 확인", "우선순위 정리"],
    checklist: ["고객의 걱정을 고객 언어로 기록했는가", "중복, 공백, 갱신, 부담 보험료를 분리했는가", "고객이 해결하고 싶은 1순위가 정해졌는가", "PT에서 제안할 근거가 충분한가"],
    customerGuide: [
      { type: "DB 고객", point: "상담 신청 이유를 다시 묻고 실제 자료와 맞춥니다.", next: "고객이 신청한 이유와 발견된 문제를 연결합니다." },
      { type: "소개 고객", point: "소개자의 말보다 고객 본인의 기준을 확인합니다.", next: "가족과 예산 기준을 구체화합니다." },
      { type: "지인", point: "대충 알고 있다고 생각하지 말고 객관 자료로 봅니다.", next: "감정적 조언보다 수치와 보장표로 정리합니다." },
      { type: "일반 고객", point: "니즈가 흐릿하면 질문으로 우선순위를 만듭니다.", next: "암, 뇌, 심장, 실손, 수술, 간병 중 관심 축을 잡습니다." },
    ],
    objections: [{ scene: "개인정보라 불편해요", reply: "맞습니다. 필요한 범위만 확인하겠습니다. 주민번호나 민감한 내용보다 보장 구조와 보험료 수준이 핵심입니다.", close: "보험료, 가입 시기, 보장 이름 정도만 가리고 확인해도 됩니다." }],
    scripts: ["고객님이 가장 걱정하시는 건 보험료 부담, 보장 부족, 청구 문제 중 어느 쪽에 가깝습니까?", "현재 보험에서 꼭 지키고 싶은 부분과 줄이고 싶은 부분을 나눠보겠습니다."],
  },
  {
    id: "pt",
    no: "05",
    title: "Presentation",
    subtitle: "해결책 제시",
    summary: "고객의 문제를 해결할 수 있는 방향과 선택지를 제안하는 단계",
    goal: "상품 판매가 아니라 고객 문제가 어떻게 해결되는지 보여줍니다.",
    why: "PT는 설명 시간이 아니라 고객이 결정을 이해하는 시간입니다. 제안 이유가 앞 단계의 사실 확인과 연결되어야 신뢰가 생깁니다.",
    mustDo: ["현재 상태를 먼저 요약합니다.", "문제를 1~3개로 압축합니다.", "해결 방향과 선택지를 비교합니다.", "고객의 우선순위를 다시 확인합니다."],
    preparation: ["현재 보험 요약", "부족/중복/갱신 표", "유지안/조정안/보완안", "보험료별 선택지", "가족 설명용 요약"],
    training: ["제안 이유를 1분 안에 말하는 연습", "상품명 없이 문제와 해결 방향만 설명하는 훈련", "비싸요 반론을 예산 조정으로 전환하는 연습"],
    flow: ["현재 상태 요약", "문제 1~3개 제시", "해결 방향 설명", "선택지 비교", "고객 우선순위 확인"],
    checklist: ["고객의 언어로 문제를 다시 말했는가", "제안 이유가 Fact Finding과 연결되는가", "선택지를 너무 많이 주지 않았는가", "보험료와 보장 균형을 같이 보여줬는가"],
    customerGuide: [
      { type: "DB 고객", point: "처음 약속한 점검 주제에서 벗어나지 않습니다.", next: "고객이 신청한 목적에 맞는 해결안부터 보여줍니다." },
      { type: "소개 고객", point: "소개자와 비교하지 않고 고객에게 맞춘 기준을 제시합니다.", next: "가족 기준과 예산 기준을 함께 잡습니다." },
      { type: "지인", point: "좋은 상품보다 왜 필요한지가 더 중요합니다.", next: "부담 없는 대안과 보완 우선순위를 분리합니다." },
      { type: "일반 고객", point: "문제 인식이 약하면 도표, 비교, 사례 중심이 좋습니다.", next: "지금 하지 않았을 때의 손실을 과하지 않게 보여줍니다." },
    ],
    objections: [
      { scene: "비싸요", reply: "맞습니다. 그래서 금액을 먼저 맞출지, 보장을 먼저 맞출지 기준을 정해야 합니다.", close: "월 부담 가능 금액을 먼저 정하고 그 안에서 우선순위를 조정해보겠습니다." },
      { scene: "가족과 상의할게요", reply: "좋습니다. 가족분께 설명하기 쉽게 핵심만 정리해드리겠습니다.", close: "상의 후 헷갈리는 부분만 다시 확인하는 시간을 잡아둘까요?" },
    ],
    scripts: ["오늘 발견된 핵심은 세 가지입니다. 중복되는 보험료, 비어 있는 진단비, 갱신 시 부담입니다.", "제안은 하나로 밀어붙이지 않고 유지안, 조정안, 보완안으로 나눠서 보겠습니다."],
  },
  {
    id: "closing",
    no: "06",
    title: "Closing",
    subtitle: "클로징",
    summary: "상담 결과를 정리하고 고객의 결정을 확정하는 단계",
    goal: "압박이 아니라 결정 기준을 명확히 해서 다음 행동을 확정합니다.",
    why: "클로징은 계약을 밀어붙이는 시간이 아니라 고객이 망설이는 이유를 정리하는 시간입니다. 다음 행동이 없으면 상담은 흐려집니다.",
    mustDo: ["고객 반응을 확인합니다.", "망설임의 진짜 이유를 묻습니다.", "필요성, 보험료, 가족 상의를 분리합니다.", "계약 또는 재확인 일정을 확정합니다."],
    preparation: ["결정 기준 질문", "생각해볼게요 대응", "가족 상의용 요약", "보류 고객 재접촉 일정", "청약 또는 후속 상담 체크리스트"],
    training: ["생각해볼게요를 세부 이유로 분해하는 연습", "압박 없이 다음 일정을 잡는 연습", "가격, 필요성, 타이밍 반론 구분 훈련"],
    flow: ["고객 반응 확인", "남은 반론 정리", "결정 기준 질문", "다음 행동 확정", "일정 고정"],
    checklist: ["고객이 망설이는 진짜 이유를 확인했는가", "가격, 필요성, 타이밍을 분리했는가", "보류한다면 다음 확인 일정을 잡았는가", "계약 여부와 상관없이 상담 마무리가 깔끔한가"],
    customerGuide: [
      { type: "DB 고객", point: "신뢰가 짧으므로 무리한 압박은 반품과 민원을 만듭니다.", next: "결정 기준과 다음 확인 일정을 명확히 합니다." },
      { type: "소개 고객", point: "소개자 체면보다 고객의 납득이 우선입니다.", next: "스스로 선택했다는 느낌을 줍니다." },
      { type: "지인", point: "관계를 지키는 클로징이 중요합니다.", next: "필요성과 부담 가능성을 분리해서 결정합니다." },
      { type: "일반 고객", point: "오늘 결정하지 않아도 다음 행동은 있어야 합니다.", next: "추가 자료, 가족 상의, 재통화 중 하나로 마감합니다." },
    ],
    objections: [
      { scene: "생각해볼게요", reply: "네, 어떤 부분을 생각해보시면 결정이 쉬우실까요? 필요성, 보험료, 가족 상의 중 어디가 가장 크실까요?", close: "그 부분만 정리해서 내일 10분만 다시 확인하겠습니다." },
      { scene: "나중에 할게요", reply: "좋습니다. 다만 나중의 기준이 있어야 합니다. 언제, 어떤 조건이면 진행할지 정해두면 좋겠습니다.", close: "보험료 조정 후 다시 볼지, 가족 상의 후 볼지 정해볼까요?" },
    ],
    scripts: ["오늘 바로 결정하셔도 되고 보류하셔도 됩니다. 다만 보류 이유가 명확해야 다음에 같은 고민을 반복하지 않습니다.", "고객님 기준에서는 필요성은 공감되는데 보험료가 부담인 쪽에 가까우실까요?"],
  },
  {
    id: "service",
    no: "07",
    title: "Customer Service",
    subtitle: "증권전달 및 소개",
    summary: "계약 이후 관리, 증권전달, 소개 요청으로 관계를 확장하는 단계",
    goal: "가입 후 만족이 가장 높은 순간에 관리 기준과 소개 흐름을 만듭니다.",
    why: "증권전달은 판매 후 마무리가 아니라 다음 신뢰의 시작입니다. 여기서 고객이 가입 이유를 이해하면 유지율과 소개율이 올라갑니다.",
    mustDo: ["가입 목적을 다시 확인합니다.", "증권의 핵심 보장과 활용법을 전달합니다.", "청구와 변경 시 연락 기준을 안내합니다.", "만족 포인트 확인 후 소개를 요청합니다."],
    preparation: ["증권전달 요약표", "청구 안내 자료", "30/90/180일 관리 일정", "소개 요청 문구", "고객 가족 변화 체크 질문"],
    training: ["증권을 5분 안에 쉽게 설명하는 연습", "소개 요청을 부담 없이 말하는 역할극", "고객 만족 포인트를 질문으로 확인하는 훈련"],
    flow: ["가입 목적 재확인", "증권 핵심 전달", "청구/변경 안내", "관리 일정 약속", "소개 요청"],
    checklist: ["가입한 이유를 고객이 다시 말할 수 있는가", "청구 방법과 담당자 역할을 안내했는가", "30/90/180일 관리 기준이 있는가", "소개 요청이 부담스럽지 않은가"],
    customerGuide: [
      { type: "DB 고객", point: "사후 관리가 신뢰 전환의 핵심입니다.", next: "증권전달 때 관리 약속을 명확히 합니다." },
      { type: "소개 고객", point: "소개가 소개를 낳도록 만족 포인트를 확인합니다.", next: "비슷한 고민이 있는 사람을 좁혀서 묻습니다." },
      { type: "지인", point: "도움 받은 느낌이 있어야 자연스럽게 소개가 나옵니다.", next: "권유가 아니라 필요한 사람에게 도움을 연결하는 방식으로 요청합니다." },
      { type: "일반 고객", point: "관리가 반복되면 소개 가능성이 생깁니다.", next: "청구, 갱신, 가족 변화 시 연락 기준을 만듭니다." },
    ],
    objections: [
      { scene: "소개할 사람이 없어요", reply: "괜찮습니다. 바로 떠오르지 않으실 수 있습니다. 혹시 보험료가 부담되거나 보험을 오래 방치한 분은 주변에 없으실까요?", close: "이름만 주셔도 되고, 제가 보낼 안내 문구를 전달만 해주셔도 됩니다." },
      { scene: "부담스러워요", reply: "네, 소개가 부담이 되면 하지 않으셔도 됩니다. 다만 도움이 필요해 보이는 분께 점검 기회만 알려주시면 됩니다.", close: "제가 짧은 안내 문구를 드릴 테니 전달 여부만 편하게 결정해주세요." },
    ],
    scripts: ["오늘 증권전달의 목적은 가입 내용을 다시 판매하는 것이 아니라, 앞으로 어떤 상황에서 어떻게 활용하시면 되는지 정리하는 것입니다.", "주변에 보험료는 계속 내는데 제대로 되어 있는지 모르는 분이 계시면 제가 같은 방식으로 점검만 도와드리겠습니다."],
  },
]

const dbPlaybooks = [
  { title: "DB 세일즈 프로세스", focus: "DB 고객은 설득보다 출처 확인, 신청 이유 확인, 방문 약속 확정이 우선입니다. 통화에서 설명을 길게 하지 말고 고객이 부담 없이 만날 명분을 만들어야 합니다.", script: "출처 확인 → 고객 관심 이유 확인 → 점검 목적 안내 → 시간/장소 선택 → 문자 확정 순서로 진행합니다. DB 유형별로 첫 문장만 다르게 잡고, 목표는 항상 AP 약속 확정으로 둡니다." },
  { title: "숨은 보험금 DB", focus: "환급, 미청구, 청구 가능성처럼 고객이 이미 관심을 보인 주제로 진입합니다.", script: "고객님께서 확인하신 숨은 보험금 관련 내용은 실제 증권과 청구 이력을 같이 봐야 정확합니다. 지금 통화에서는 접수만 도와드리고, 전문가가 15분 정도 확인드리면 됩니다." },
  { title: "보장분석 DB", focus: "가입 권유보다 중복, 공백, 갱신 부담을 확인하는 점검으로 포지션을 잡습니다.", script: "가입을 권유드리려는 통화가 아니라 현재 보험에서 중복되거나 비어 있는 부분을 확인드리는 서비스입니다. 확인 후 필요 없으면 그대로 유지하시면 됩니다." },
  { title: "이벤트/랜딩 DB", focus: "고객이 눌렀던 행동을 먼저 확인하고, 과한 설명보다 짧은 예약으로 연결합니다.", script: "남겨주신 내용 중 어떤 부분이 가장 궁금하셨는지 확인하려고 연락드렸습니다. 자료를 보고 필요한 부분만 짧게 점검해드리겠습니다." },
  { title: "소개/지인 DB", focus: "관계 훼손을 막기 위해 가입보다 점검과 도움으로 접근합니다.", script: "OO님께서 보험 내용을 한번 점검받아보면 좋겠다고 말씀 주셔서 연락드렸습니다. 부담 갖지 마시고 현재 내용에서 놓친 부분이 있는지만 확인해보시면 됩니다." },
  { title: "실버 DB", focus: "60대 이상 고객님 대상 DB입니다. 전문가의 포지션보다 친근한 느낌으로 다가가는 것이 좋습니다. 이제 보험을 많이 활용하실 나이대라 관심도 높고, 주변 경험 때문에 필요성과 두려움이 함께 있습니다.", script: "보험 가입 권유가 아니라 부담되는 부분과 놓치기 쉬운 보험금, 병원비, 간병 걱정을 같이 점검해드리는 방향이 좋습니다. 차 한잔하는 시간 정도로 현재 보험이 앞으로 도움이 되는지 확인해드리겠습니다." },
  { title: "화재보험 DB", focus: "박람회 등의 공간에서 수집된 DB입니다. 실제 입주자를 대상으로 1년간 무료 화재보험을 가입시켜드리고, 함께 다른 보장을 분석해 안내하는 방식이 유리합니다.", script: "입주자분들께 1년 무료 화재보험 안내를 먼저 드리고 있습니다. 화재보험 가입을 도와드리면서 현재 가지고 계신 다른 보장도 함께 점검해드리면 더 정확하게 안내드릴 수 있습니다." },
  { title: "펫보험 자료 DB", focus: "반려동물 보험은 상품 설명보다 준비자료와 고지사항 확인이 먼저입니다. 회사명과 상품명은 빼고 반려동물 기본정보, 사진, 동물등록, 치료 이력, 할인 가능 서류를 확인하는 흐름으로 접근합니다.", script: "반려동물 이름, 품종, 생년월일, 성별, 중성화 여부와 정면·측면·후면 사진을 먼저 준비합니다. 이후 최근 진료·투약 이력, 예방접종, 기존 보험 가입 여부, 동물등록증이나 입양증명서처럼 할인에 필요한 서류를 확인합니다." },
]

const appointmentScripts = [
  { type: "전화", tip: "전화는 약속을 잡기 위한 수단입니다. 시간, 장소, 방문 목적만 안내하고 빠르게 종료합니다.", script: "직접 뵙고 보장을 보며 안내드리고 궁금한 점이 있으신지 준비를 추가로 잘 해서 방문드리겠습니다. 오늘 저녁과 내일 오전 중 어느 시간이 편하실까요?" },
  { type: "문자", tip: "방문 약속이 확정되었다면 5분 이내로 발송합니다. 날짜, 시간, 장소와 주변 카페 위치까지 빠르게 안내합니다.", script: "000님 보장점검으로 방문 약속한 000 보험 전문가입니다. 00일 00시 00에서 뵙겠습니다. 날짜 장소 확인하셨으면 \"확인\"으로 답장 부탁드립니다." },
  { type: "카카오톡", tip: "자료, 이미지, PDF파일을 보내는 데 유용합니다. PDF보다 이미지로 보내고 하단에 설명을 붙이면 고객이 보기 편합니다.", script: "A와 B 두 가지 제안을 드립니다. 보시고 보험료와 보장 중 수정이나 변경이 필요하시면 반영해드립니다." },
  { type: "소개 요청", tip: "소개는 고객이 만족했다면 바로 해도 됩니다. 단 대상을 좁혀서 요청해야 확률이 높습니다.", script: "오늘 제가 00부분을 체크하면서 만족하셨을텐데 주변에도 비슷한 분들이 꼭 계시더라고요. 소개해 주시면 보험제안이 아닌 000님처럼 만족하실 만한 부분만 빠르고 쉽게 도와드리겠습니다." },
]

const objectionLibrary = [
  { phase: "TA", scene: "바빠요", answer: "지금 설명드리려는 것이 아니라 가능하신 시간만 확인하겠습니다.", close: "오늘 6시 이후와 내일 오전 중 어느 쪽이 편하실까요?" },
  { phase: "TA", scene: "관심 없어요", answer: "가입 권유가 아니라 놓치기 쉬운 보장과 청구 가능 여부 확인입니다.", close: "필요 없으시면 바로 정리해드릴 수 있게 30초만 확인드릴까요?" },
  { phase: "TA", scene: "관리해주는 사람 있어요", answer: "네 정말 잘 되셨습니다. 요즘 상담을 하다 보면 지인을 믿고 가입했지만 설명이 미흡하거나 애매해도 다시 물어보기 힘든 경우가 많더라고요. 000님도 비슷한 상황이실 수 있으니 제가 점검만 도와드립니다.", close: "확인만 해보시는 것으로 앞으로 00년은 부담 없이 잘 유지하시면 됩니다." },
  { phase: "TA", scene: "나중에 할게요", answer: "네 다음에 하셔도 됩니다. 다만 무료상담으로 진행이 이번 달에 가능하시기 때문에 나중에는 전문가 상담이 제한될 수 있습니다.", close: "부담 없이 편하게 점검만 도와드리겠습니다." },
  { phase: "TA", scene: "나중에 할게요", answer: "나중으로 미루고 후회하시는 경우가 더러 있습니다. 그때 점검해서 조정이라도 할걸, 또는 내 보험이 이렇게 좋았구나 하는 분들이 많습니다.", close: "000님도 이번 기회에 점검을 통해 바로 알면 앞으로 편하실겁니다." },
  { phase: "실버 TA", scene: "필요없어요", answer: "작년 기준으로 숨은보험금이 12조가 넘는데 확인만 해보셔도 이득입니다. 차 한잔 하는 시간으로 조회 가능하니 이번에 도와드리겠습니다.", close: "내일과 모레 언제 방문드릴까요?" },
  { phase: "실버 TA", scene: "나이가 많아 보험 부담돼요/필요없어요", answer: "보험 가입권유로 방문드리는 게 아닙니다. 부담되는 부분을 점검해드리는 겁니다. 차 한잔할 시간만 내시면 됩니다.", close: "주중과 주말 편한 시간대에 제가 직접 방문드리니 뵙고 안내드리겠습니다." },
  { phase: "실버 AP", scene: "자녀들이 관리해요", answer: "맞습니다. 저도 저희 부모님 보험은 당연히 관리해드리고 있어요. 그래도 제가 자녀분들보다는 보험에 관해서는 더 전문가니 제가 봐드리는 게 맞지 않을까요?", close: "자녀분과 통화를 해보겠습니다." },
  { phase: "AP", scene: "보험은 이미 많아요", answer: "많을수록 중복과 공백을 같이 봐야 합니다. 추가 가입보다 정리가 먼저입니다.", close: "현재 내용에서 유지할 것과 줄일 것만 구분해보겠습니다." },
  { phase: "PT", scene: "비싸요", answer: "보장을 먼저 맞출지, 금액을 먼저 맞출지 기준을 정해야 합니다.", close: "월 부담 가능 금액 안에서 우선순위를 다시 조정해보겠습니다." },
  { phase: "PT", scene: "가족과 상의할게요", answer: "가족분께 설명하기 쉽게 핵심 비교표로 정리해드리겠습니다.", close: "상의 후 헷갈리는 부분만 확인하는 시간을 잡아둘까요?" },
  { phase: "C", scene: "생각해볼게요", answer: "어떤 부분을 생각해보시면 결정이 쉬우실까요? 필요성, 보험료, 가족 상의 중 어디가 가장 크실까요?", close: "그 부분만 정리해서 내일 10분만 다시 확인하겠습니다." },
  { phase: "C", scene: "나중에 할게요", answer: "나중의 기준이 있어야 같은 고민을 반복하지 않습니다.", close: "언제, 어떤 조건이면 다시 볼지 정해두겠습니다." },
  { phase: "증권전달", scene: "소개할 사람이 없어요", answer: "바로 떠오르지 않으실 수 있습니다. 보험료가 부담되거나 보험을 오래 방치한 분 기준으로 생각해보시면 됩니다.", close: "제가 짧은 안내 문구를 드릴 테니 전달만 해주셔도 됩니다." },
]

const preObjectionScripts = [
  { title: "보험료", purpose: "설계안 구성이 가능해집니다.", script: "보험료는 현재 부담은 없으신가요? 혹은 보장이 늘어나고 추가되면 당연히 보험료는 오를 텐데 어느 정도까지 가능할까요?" },
  { title: "가입의사", purpose: "가족을 함께 만나는 방향으로 안내해야 합니다.", script: "제가 제안을 드린다면 결정은 누가 하시나요? 000님이 직접하시나요, 아니면 가족과 상의를 함께 해봐야 하시나요?" },
  { title: "관리", purpose: "대응 방안을 준비할 수 있습니다.", script: "보험의 관리는 누가 하고 있나요? 가족이나 담당 설계사가 있으신가요?" },
  { title: "불만", purpose: "고객의 불만만 없애줘도 클로징 확률이 올라갑니다.", script: "현재 보험을 유지하시면서 불편한 점은 어떤 것이 있으신가요?" },
  { title: "보험료 이체일 확인", purpose: "신규 제안 시 고객의 부담을 줄이고 가능한 날짜를 한 번 더 확인합니다.", script: "기존 보험의 유지와 해약을 함께 검토할 수 있으니 보험료 이체일이 언제인지 먼저 확인해보겠습니다." },
]

const fcThemes: FcTheme[] = [
  {
    title: "약속잡기",
    subtitle: "TA, 소개고객, 카톡 접근, TA 거절 처리",
    stage: "TA / Pre Approach",
    betterWay: "약속잡기는 설명을 잘하는 단계가 아니라 고객이 부담 없이 시간을 내도록 만드는 단계입니다. 통화에서는 보험 이야기를 끝내려 하지 말고, 확인할 이유와 짧은 시간을 제안하는 편이 좋습니다.",
    examples: [
      { situation: "지인이 부담스러워할 때", approach: "친분을 앞세우기보다 점검 명분을 작게 제시합니다.", line: "가입 얘기하려는 건 아니고, 지금 보험에서 놓치기 쉬운 부분만 15분 정도 봐드리려고 해요." },
      { situation: "소개받은 고객이 경계할 때", approach: "소개자 이름은 짧게 사용하고 고객 선택권을 줍니다.", line: "OO님께서 한번 점검받아보면 좋겠다고 하셔서 연락드렸습니다. 부담 없이 현재 내용 확인만 받아보셔도 됩니다." },
      { situation: "카톡으로 먼저 접근할 때", approach: "긴 설명 대신 통화 가능 시간 질문으로 마무리합니다.", line: "보험 점검 관련해서 짧게 확인드릴 내용이 있습니다. 오늘 저녁이나 내일 오전 중 통화 가능하신 시간이 있을까요?" },
    ],
    training: ["오프닝 10초를 녹음해 군더더기를 줄입니다.", "바빠요, 관심 없어요, 이미 많아요를 각각 3가지 방식으로 처리해봅니다.", "통화 목표를 설명이 아니라 약속 확정으로 제한합니다."],
  },
  {
    title: "니즈환기하기",
    subtitle: "종신보험, 건강보험, 연금보험, 변액보험, 증권 회수",
    stage: "Fact Finding",
    betterWay: "니즈환기는 겁을 주는 과정이 아니라 고객이 스스로 자신의 기준을 발견하게 하는 과정입니다. 질문을 통해 현재 보험과 실제 걱정 사이의 차이를 보이게 해야 합니다.",
    examples: [
      { situation: "건강보험 필요성을 못 느낄 때", approach: "질병명이 아니라 치료 후 생활비와 소득 공백을 질문합니다.", line: "치료비보다 더 부담되는 게 일을 쉬는 기간의 생활비일 수 있는데, 그 부분은 따로 준비되어 있으실까요?" },
      { situation: "종신보험을 사망보험으로만 볼 때", approach: "가족 책임, 대출, 상속, 정리 비용 중 고객 상황에 맞는 축을 잡습니다.", line: "이 보험은 누가 돈을 받느냐보다, 남은 가족에게 어떤 부담을 남기지 않을지 기준으로 보시면 좋습니다." },
      { situation: "증권을 안 보여주려 할 때", approach: "민감정보보다 구조 확인이 목적임을 분명히 합니다.", line: "개인정보는 가리셔도 됩니다. 제가 보려는 건 보험료, 갱신 여부, 보장 구조입니다." },
    ],
    training: ["상품 설명 없이 질문만으로 5분 상담을 진행해봅니다.", "고객 답변을 '그러면 걱정은 OO쪽이시네요'처럼 요약하는 연습을 합니다.", "보험료, 보장, 가족책임, 노후자금 중 고객의 1순위를 찾아봅니다."],
  },
  {
    title: "상품제안하기",
    subtitle: "종신보험, 건강보험, 연금보험, 변액보험 제안",
    stage: "Presentation",
    betterWay: "상품제안은 상품 장점을 나열하는 시간이 아니라, 고객 문제와 제안 이유를 연결하는 시간입니다. 유지안, 조정안, 보완안처럼 선택지를 구조화하면 부담이 줄어듭니다.",
    examples: [
      { situation: "건강보험 제안", approach: "주계약과 특약을 한꺼번에 말하지 말고 핵심 위험부터 제시합니다.", line: "고객님은 암보다 뇌와 심장 쪽 공백이 더 커서, 이 부분을 먼저 보완하는 기준으로 보겠습니다." },
      { situation: "연금보험 제안", approach: "수익률보다 노후 현금흐름과 유지 가능성을 먼저 봅니다.", line: "이 상품의 핵심은 많이 넣는 것이 아니라 오래 유지 가능한 금액으로 노후 현금흐름을 만드는 것입니다." },
      { situation: "변액보험 제안", approach: "투자상품처럼 팔지 말고 장기 목적과 변동성 관리 기준을 설명합니다.", line: "단기 수익보다 장기적으로 관리하면서 가져가는 구조라서, 중간 점검 기준을 같이 잡아야 합니다." },
    ],
    training: ["상품명을 빼고 제안 이유만 1분 안에 설명해봅니다.", "같은 고객에게 유지안, 조정안, 보완안을 각각 만들어봅니다.", "비싸요 반론이 나오기 전에 예산 기준을 먼저 확인합니다."],
  },
  {
    title: "펫보험 자료 안내",
    subtitle: "준비자료, 고지사항, 할인서류, 청구 안내",
    stage: "AP / Fact Finding",
    betterWay: "펫보험은 바로 보험료를 말하기보다 반려동물 정보와 고지사항을 정리하는 단계가 먼저입니다. 회사명이나 상품명 없이도 가입 전 필요한 자료, 알릴의무, 할인 가능 서류를 안내하면 고객이 준비할 행동을 바로 이해합니다.",
    examples: [
      { situation: "가입 준비물을 안내할 때", approach: "보호자가 바로 준비할 수 있는 자료부터 순서대로 말합니다.", line: "먼저 이름, 품종, 생년월일, 성별, 중성화 여부를 확인하고 정면·측면·후면 사진을 준비해주시면 진행이 빠릅니다." },
      { situation: "고지사항을 부담스러워할 때", approach: "가입을 막는 질문이 아니라 보상 분쟁을 줄이는 절차라고 설명합니다.", line: "최근 진료나 복용약은 숨기면 나중에 보상 때 문제가 될 수 있어서, 기억나는 내용부터 같이 정리해보겠습니다." },
      { situation: "할인제도를 설명할 때", approach: "할인율보다 필요한 서류와 적용 조건을 먼저 짚습니다.", line: "동물등록증, 입양증명서, 두 마리 이상 가입 여부를 확인하면 할인 가능성을 볼 수 있습니다. 다만 보장조건을 먼저 맞추고 할인은 마지막에 적용해보겠습니다." },
    ],
    training: ["펫보험 준비자료를 30초 안에 말하는 연습을 합니다.", "질병 이력 질문을 심사 압박이 아니라 분쟁 예방 문장으로 바꿔 말합니다.", "할인제도를 말할 때 회사명 없이 서류명과 확인 순서만 안내합니다."],
  },
  {
    title: "거절응대하기",
    subtitle: "이미 많아요, 다음에 할게요, 여유가 없어요, 비교 후 결정 등",
    stage: "TA / AP / PT / C",
    betterWay: "거절은 이기려고 반박하는 것이 아니라 고객의 기준을 더 정확히 찾는 신호입니다. 바로 설득하지 말고 거절의 종류를 분리해야 합니다.",
    examples: [
      { situation: "이미 많이 가입했어요", approach: "많다는 말은 정리가 필요하다는 신호로 받습니다.", line: "많이 가지고 계실수록 중복과 공백이 같이 생길 수 있습니다. 추가가 아니라 정리 기준으로 보겠습니다." },
      { situation: "여유가 없어요", approach: "필요성 반론이 아니라 예산 반론으로 분리합니다.", line: "그럼 보장을 늘리는 방향보다 보험료를 조정하면서 꼭 필요한 부분만 남기는 기준으로 보겠습니다." },
      { situation: "다른 상품과 비교해볼게요", approach: "비교 자체를 인정하고 비교 기준을 잡아줍니다.", line: "좋습니다. 보험료만 비교하면 놓치는 부분이 있어서 보장 범위, 갱신 여부, 유지 가능성 기준으로 같이 보시면 됩니다." },
    ],
    training: ["거절 문장을 듣고 필요성, 가격, 신뢰, 타이밍 중 어디인지 분류합니다.", "반박 없이 '그렇게 느끼실 수 있습니다'로 시작하는 연습을 합니다.", "모든 거절 뒤에 다음 행동 하나를 남깁니다."],
  },
  {
    title: "계약관리와 소개요청",
    subtitle: "납입 만기, 실효, 장기 유지, 증권전달 후 소개 요청",
    stage: "Customer Service",
    betterWay: "계약관리는 민원 방지가 아니라 다음 신뢰를 만드는 과정입니다. 소개 요청은 만족을 확인한 뒤, 대상을 좁혀 부담 없이 부탁해야 합니다.",
    examples: [
      { situation: "증권전달 직후", approach: "가입 이유와 활용법을 다시 정리한 뒤 소개를 요청합니다.", line: "오늘처럼 보험을 오래 냈지만 제대로 되어 있는지 모르는 분이 주변에 계시면 같은 방식으로 점검만 도와드리겠습니다." },
      { situation: "실효 위험 고객", approach: "혼내거나 압박하지 않고 유지 목적을 다시 확인합니다.", line: "이 보험을 왜 준비하셨는지부터 다시 보겠습니다. 유지가 어렵다면 줄일 것과 지킬 것을 나눠보겠습니다." },
      { situation: "장기 유지 고객", approach: "감사와 점검 명분을 함께 사용합니다.", line: "오래 유지해주신 만큼 지금 기준에서도 맞는지 한번 점검해드리겠습니다." },
    ],
    training: ["증권전달을 5분 요약으로 설명하는 연습을 합니다.", "소개 대상을 '보험료 부담 고객', '오래 방치한 고객'처럼 좁혀 묻습니다.", "고객관리 연락 사유를 생일, 갱신, 가족 변화, 청구 경험으로 분류합니다."],
  },
  {
    title: "변액보험 관리",
    subtitle: "운용성과, 펀드, 비용, 위험보험료, 유지 상담",
    stage: "Customer Service / Review",
    betterWay: "변액보험은 판매보다 관리가 중요합니다. 수익률만 말하면 불만이 커질 수 있으므로 목적, 기간, 펀드, 비용, 유지 기준을 함께 설명해야 합니다.",
    examples: [
      { situation: "수익률이 낮아 불만일 때", approach: "성과만 방어하지 말고 가입 목적과 남은 기간을 다시 확인합니다.", line: "지금 수익률만 보면 아쉬울 수 있습니다. 다만 이 상품은 기간과 펀드 조정 기준을 같이 봐야 해서 목적부터 다시 확인하겠습니다." },
      { situation: "비용을 물어볼 때", approach: "숨기지 말고 어떤 비용인지 쉽게 나눠 설명합니다.", line: "계약 유지에 들어가는 비용과 보장에 쓰이는 비용을 나눠서 보시면 이해가 쉽습니다." },
      { situation: "해지 고민", approach: "해지 전 대안 비교를 제안합니다.", line: "바로 해지하기 전에 감액, 펀드 변경, 납입 조정 중 어떤 방법이 더 손실을 줄이는지 먼저 보겠습니다." },
    ],
    training: ["변액보험 설명을 투자, 보장, 비용, 관리 네 칸으로 나눠 말해봅니다.", "수익률 불만 고객에게 사과와 점검 제안을 분리해 말합니다.", "펀드 변경을 권유하기 전 고객 성향과 기간을 확인하는 질문을 연습합니다."],
  },
  {
    title: "해약 방어",
    subtitle: "변액, 보장성, 저축성, 연금 해지 상담",
    stage: "Customer Service / Defense",
    betterWay: "해약 방어는 무조건 막는 것이 아니라, 고객이 손실과 대안을 알고 결정하게 돕는 과정입니다. 해지 이유를 먼저 분류하고 유지, 감액, 중지, 대체안을 비교해야 합니다.",
    examples: [
      { situation: "보험료가 부담돼 해지하려는 고객", approach: "전체 해지보다 지킬 보장과 줄일 보장을 나눕니다.", line: "전부 해지하기보다 꼭 지킬 보장과 줄여도 되는 부분을 먼저 나눠보겠습니다." },
      { situation: "저축성 보험 해지 고민", approach: "현재 환급금과 남은 기간, 대체 자금 계획을 같이 봅니다.", line: "해지금만 보지 말고 남은 기간과 다른 자금 계획까지 보고 결정하시는 게 좋습니다." },
      { situation: "연금보험 해지 고민", approach: "노후 현금흐름의 공백을 먼저 인식시킵니다.", line: "해지하면 지금 부담은 줄지만 나중에 받을 현금흐름이 사라집니다. 그 공백을 다른 방식으로 채울 수 있는지 먼저 보겠습니다." },
    ],
    training: ["해지 이유를 보험료 부담, 불신, 수익률, 필요성 약화로 분류합니다.", "해지 전 대안 3가지를 반드시 제시하는 연습을 합니다.", "고객이 최종 결정권자라는 표현을 넣어 방어감을 낮춥니다."],
  },
]

const situationSuggestions: Record<string, string[]> = {
  db: ["고객이 차갑다면 설명을 줄이고 신청/조회 이력 확인으로 시작하세요.", "DB 고객은 통화에서 설득보다 AP 약속을 잡는 것이 우선입니다."],
  intro: ["소개 고객은 소개자의 신뢰를 빌리되, 고객 본인의 선택권을 반드시 줘야 합니다.", "소개자 이야기는 짧게 하고 고객 상황 질문으로 빠르게 전환하세요."],
  price: ["가격 반론은 보장 필요성과 예산을 분리해서 다루세요.", "월 부담 가능 금액을 먼저 묻고 그 안에서 우선순위를 다시 짜는 방식이 좋습니다."],
  busy: ["바쁘다는 반응에는 추가 설명보다 시간 선택지를 주는 편이 좋습니다.", "지금 통화가 아니라 가능한 시간을 확인하는 통화라고 낮춰 말하세요."],
  referral: ["소개 요청은 증권전달 직후 만족 포인트가 확인됐을 때가 가장 자연스럽습니다.", "대상을 넓게 묻지 말고 보험료가 부담되는 분, 보험을 오래 방치한 분처럼 좁혀 물어보세요."],
  pet: ["펫보험은 보험료보다 반려동물 기본정보, 사진, 고지사항, 할인서류를 먼저 정리하세요.", "회사명과 상품명 없이 준비자료와 알릴의무를 안내하면 고객이 바로 행동하기 쉽습니다."],
}

export default function SalesMasterPage() {
  const [activeTab, setActiveTab] = useState<TabId>("process")
  const [selectedStageId, setSelectedStageId] = useState<StageId | null>(null)
  const [customerType, setCustomerType] = useState("DB 고객")
  const [phase, setPhase] = useState("TA")
  const [situation, setSituation] = useState("")
  const [selectedFcTheme, setSelectedFcTheme] = useState<FcTheme | null>(null)

  const selectedStage = stages.find((stage) => stage.id === selectedStageId) ?? null

  const advice = useMemo(() => {
    const text = situation.toLowerCase()
    const result: string[] = []
    if (customerType.includes("DB")) result.push(...situationSuggestions.db)
    if (customerType.includes("소개")) result.push(...situationSuggestions.intro)
    if (text.includes("비싸") || text.includes("보험료") || text.includes("부담")) result.push(...situationSuggestions.price)
    if (text.includes("바빠") || text.includes("시간")) result.push(...situationSuggestions.busy)
    if (text.includes("소개") || text.includes("증권")) result.push(...situationSuggestions.referral)
    if (text.includes("펫") || text.includes("반려") || text.includes("강아지") || text.includes("고양이")) result.push(...situationSuggestions.pet)
    const phaseMatch = objectionLibrary.filter((item) => item.phase === phase).slice(0, 2)
    result.push(...phaseMatch.map((item) => `${item.scene}: ${item.answer} ${item.close}`))
    if (result.length === 0) result.push("현재 상황에서는 고객의 출처, 관심 이유, 다음 행동 가능 시간을 먼저 확인하는 것이 좋습니다.")
    return Array.from(new Set(result)).slice(0, 5)
  }, [customerType, phase, situation])

  return (
    <main className="min-h-screen bg-[#eef3fb] text-slate-900 [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all]">
      <div className="mx-auto max-w-[1480px] px-5 py-6 md:px-8">
        <section className="mb-5 rounded-2xl bg-[#173b72] px-6 py-6 text-white shadow-lg md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-[13px] font-black tracking-[0.24em] text-sky-200">SALES MASTER PRO</p>
              <h1 className="text-3xl font-black md:text-4xl">세일즈 마스터</h1>
              <p className="mt-3 max-w-3xl text-[15px] font-bold leading-7 text-white/75">
                세일즈 프로세스의 목적, 단계별 실행 내용, 훈련 방법, DB 접근, 약속잡기, 거절 대응, 증권전달과 소개 요청 흐름을 한 화면에서 확인합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => window.open("/sales-book", "_blank", "noopener,noreferrer")} className="whitespace-nowrap rounded-xl bg-white/10 px-4 py-3 text-[13px] font-black text-white hover:bg-white/20">세일즈 북</button>
              <button onClick={() => window.open("/dashboard", "_self")} className="whitespace-nowrap rounded-xl bg-white/10 px-4 py-3 text-[13px] font-black text-white hover:bg-white/20">대시보드</button>
              <button onClick={() => window.close()} className="whitespace-nowrap rounded-xl bg-white px-4 py-3 text-[13px] font-black text-[#173b72]">창 닫기</button>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-5">
            <p className="px-3 pb-2 pt-1 text-[12px] font-black tracking-[0.16em] text-slate-400">SALES MENU</p>
            <nav className="grid gap-2">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id !== "process") setSelectedStageId(null) }} className={`rounded-xl px-4 py-3 text-left text-[13px] font-black transition ${activeTab === tab.id ? "bg-[#173b72] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <section className="min-w-0">
            {activeTab === "process" && !selectedStage && <ProcessHome onSelect={setSelectedStageId} />}
            {activeTab === "process" && selectedStage && <StageDetail stage={selectedStage} onBack={() => setSelectedStageId(null)} />}
            {activeTab === "db" && <DbSection />}
            {activeTab === "appointment" && <AppointmentSection />}
            {activeTab === "objection" && <ObjectionSection />}
            {activeTab === "preObjection" && <PreObjectionSection />}
            {activeTab === "fc" && <FcSection onSelect={setSelectedFcTheme} />}
            {activeTab === "coach" && <CoachSection customerType={customerType} setCustomerType={setCustomerType} phase={phase} setPhase={setPhase} situation={situation} setSituation={setSituation} advice={advice} />}
          </section>
        </div>
        {selectedFcTheme && <FcModal theme={selectedFcTheme} onClose={() => setSelectedFcTheme(null)} />}
      </div>
    </main>
  )
}

function ProcessHome({ onSelect }: { onSelect: (id: StageId) => void }) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        {processPrinciples.map((item) => (
          <InfoCard key={item.title} title={item.title}>
            <p className="text-[14px] font-bold leading-7 text-slate-600">{item.text}</p>
          </InfoCard>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[13px] font-black tracking-[0.18em] text-[#2563eb]">PROCESS MAP</p>
          <h2 className="mt-2 text-2xl font-black text-[#173b72]">영업 프로세스 7단계</h2>
          <p className="mt-3 text-[14px] font-bold leading-7 text-slate-600">
            단계별 목적을 알고 훈련하면 어느 지점에서 고객이 멈췄는지, 어떤 화법을 보완해야 하는지 명확해집니다.
          </p>
          <div className="mt-6 space-y-2">
            {stages.map((stage) => (
              <button key={stage.id} onClick={() => onSelect(stage.id)} className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-left hover:bg-[#eff6ff]">
                <span className="inline-flex h-9 min-w-10 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-white px-3 text-[12px] font-black leading-none text-[#2563eb] shadow-sm">{stage.no}</span>
                <span>
                  <span className="block text-[14px] font-black text-slate-900">{stage.subtitle}</span>
                  <span className="block text-[12px] font-bold text-slate-500">{stage.title}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stages.map((stage) => (
            <button key={stage.id} onClick={() => onSelect(stage.id)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#2563eb] hover:shadow-md">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-[#eff6ff] px-3 text-[13px] font-black leading-none text-[#2563eb]">{stage.no}</span>
                <span className="min-w-0 text-right text-[12px] font-black uppercase leading-5 tracking-[0.12em] text-slate-400 [overflow-wrap:anywhere] [text-wrap:balance] [word-break:keep-all]">{stage.title}</span>
              </div>
              <h3 className="text-xl font-black text-[#173b72]">{stage.subtitle}</h3>
              <p className="mt-3 min-h-[72px] text-[14px] font-bold leading-7 text-slate-600">{stage.summary}</p>
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-[13px] font-black text-slate-500">클릭해서 실행/훈련법 보기</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function StageDetail({ stage, onBack }: { stage: Stage; onBack: () => void }) {
  const relatedObjections = objectionLibrary.filter((item) => (stage.id === "ta" && item.phase === "TA") || (stage.id === "ap" && item.phase === "AP") || (stage.id === "pt" && item.phase === "PT") || (stage.id === "closing" && item.phase === "C") || (stage.id === "service" && item.phase === "증권전달"))

  return (
    <section className="grid gap-5 xl:grid-cols-[390px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button onClick={onBack} className="mb-5 rounded-xl bg-slate-100 px-4 py-2 text-[13px] font-black text-slate-600 hover:bg-slate-200">← 7단계로 돌아가기</button>
        <p className="text-[13px] font-black tracking-[0.16em] text-[#2563eb]">STEP {stage.no}</p>
        <h2 className="mt-2 text-3xl font-black text-[#173b72]">{stage.subtitle}</h2>
        <p className="mt-1 text-[15px] font-black text-slate-400">{stage.title}</p>
        <p className="mt-5 rounded-2xl bg-[#eff6ff] p-4 text-[15px] font-bold leading-8 text-[#173b72]">{stage.goal}</p>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="mb-2 text-[13px] font-black text-slate-500">왜 중요한가</p>
          <p className="text-[14px] font-bold leading-7 text-slate-700">{stage.why}</p>
        </div>
      </aside>

      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-3">
          <ListCard title="해야 할 일" items={stage.mustDo} />
          <ListCard title="준비물" items={stage.preparation} />
          <ListCard title="훈련 방법" items={stage.training} />
        </div>

        <InfoCard title="진행 흐름">
          <div className="grid gap-2 md:grid-cols-5">
            {stage.flow.map((item, index) => (
              <div key={item} className="rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-[12px] font-black text-[#2563eb]">{index + 1}</span>
                <p className="mt-1 text-[14px] font-bold text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="체크리스트">
          <div className="grid gap-3 md:grid-cols-2">
            {stage.checklist.map((item) => <div key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-[14px] font-bold leading-7 text-slate-700">{item}</div>)}
          </div>
        </InfoCard>

        <InfoCard title="고객 유형별 접근">
          <div className="grid gap-3 md:grid-cols-2">
            {stage.customerGuide.map((item) => (
              <div key={item.type} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-[14px] font-black text-[#173b72]">{item.type}</p>
                <p className="mt-2 text-[13px] font-bold leading-7 text-slate-600">{item.point}</p>
                <p className="mt-3 rounded-lg bg-[#eff6ff] px-3 py-2 text-[13px] font-black text-[#2563eb]">{item.next}</p>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="거절과 반론 처리">
          <div className="grid gap-3">
            {[...stage.objections, ...relatedObjections.map((item) => ({ scene: item.scene, reply: item.answer, close: item.close }))].map((item) => (
              <div key={`${item.scene}-${item.close}`} className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[190px_1fr]">
                <div className="text-[14px] font-black text-[#173b72]">{item.scene}</div>
                <div className="text-[14px] font-bold leading-7 text-slate-700">
                  <p>{item.reply}</p>
                  <p className="mt-2 font-black text-[#2563eb]">{item.close}</p>
                </div>
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="예시 화법">
          <div className="grid gap-3">
            {stage.scripts.map((script) => <div key={script} className="rounded-xl border-l-4 border-[#2563eb] bg-[#eff6ff] p-4 text-[14px] font-bold leading-7 text-[#173b72]">{script}</div>)}
          </div>
        </InfoCard>
      </div>
    </section>
  )
}

function DbSection() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {dbPlaybooks.map((item) => (
        <InfoCard key={item.title} title={item.title}>
          <p className="mb-4 text-[14px] font-bold leading-7 text-slate-600">{item.focus}</p>
          <div className="rounded-xl bg-[#eff6ff] p-4 text-[14px] font-bold leading-7 text-[#173b72]">{item.script}</div>
        </InfoCard>
      ))}
    </section>
  )
}

function AppointmentSection() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {appointmentScripts.map((item) => (
        <InfoCard key={item.type} title={item.type}>
          <p className="mb-4 text-[13px] font-black text-[#2563eb]">{item.tip}</p>
          <div className="rounded-xl bg-slate-50 p-4 text-[14px] font-bold leading-7 text-slate-700">{item.script}</div>
        </InfoCard>
      ))}
    </section>
  )
}

function ObjectionSection() {
  return (
    <section className="grid gap-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[15px] font-black leading-7 text-amber-900">
        ★ 거절과 반론은 선거절 처리로 하는 것이 최선의 방법입니다 ★
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[90px_170px_1fr_1fr] gap-3 bg-[#173b72] px-5 py-4 text-[13px] font-black text-white">
        <div>단계</div>
        <div>상황</div>
        <div>응대 흐름</div>
        <div>다음 행동</div>
      </div>
      {objectionLibrary.map((item) => (
        <div key={`${item.phase}-${item.scene}`} className="grid grid-cols-[90px_170px_1fr_1fr] gap-3 border-b border-slate-100 px-5 py-4 text-[14px] font-bold leading-7 text-slate-700 last:border-b-0">
          <div><span className="rounded-full bg-[#eff6ff] px-3 py-1 text-[12px] font-black text-[#2563eb]">{item.phase}</span></div>
          <div className="font-black text-[#173b72]">{item.scene}</div>
          <div>{item.answer}</div>
          <div className="text-[#2563eb]">{item.close}</div>
        </div>
      ))}
      </div>
    </section>
  )
}

function PreObjectionSection() {
  return (
    <section className="grid gap-5">
      <div className="rounded-2xl bg-[#173b72] p-6 text-white shadow-sm">
        <p className="text-[13px] font-black tracking-[0.18em] text-sky-200">PRE OBJECTION</p>
        <h2 className="mt-2 text-2xl font-black">선거절 멘트</h2>
        <p className="mt-3 max-w-4xl text-[14px] font-bold leading-7 text-white/75">
          고객이 거절하기 전에 보험료, 결정권자, 관리 주체, 불만, 이체일을 먼저 확인하면 상담 방향이 선명해집니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {preObjectionScripts.map((item) => (
          <InfoCard key={item.title} title={item.title}>
            <p className="mb-4 rounded-xl bg-slate-50 p-4 text-[14px] font-bold leading-7 text-slate-700">{item.script}</p>
            <div className="rounded-xl border-l-4 border-[#2563eb] bg-[#eff6ff] p-4 text-[13px] font-black leading-6 text-[#173b72]">
              {item.purpose}
            </div>
          </InfoCard>
        ))}
      </div>
    </section>
  )
}

function FcSection({ onSelect }: { onSelect: (theme: FcTheme) => void }) {
  return (
    <section className="grid gap-5">
      <div className="rounded-2xl bg-[#173b72] p-6 text-white shadow-sm">
        <p className="text-[13px] font-black tracking-[0.18em] text-sky-200">FC SPEAKING LIBRARY</p>
        <h2 className="mt-2 text-2xl font-black">이런 방법도 있어요!</h2>
        <p className="mt-3 max-w-4xl text-[14px] font-bold leading-7 text-white/75">
          추가 자료의 큰 주제를 바탕으로 약속잡기, 니즈환기, 상품제안, 거절응대, 계약관리, 변액관리, 해약방어 상황을 실무형 대안으로 정리했습니다. 카드를 누르면 팝업으로 상황별 예시와 훈련법을 볼 수 있습니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fcThemes.map((theme) => (
          <button key={theme.title} onClick={() => onSelect(theme)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#2563eb] hover:shadow-md">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-[12px] font-black text-[#2563eb]">{theme.stage}</span>
              <span className="text-[12px] font-black text-slate-400">POPUP</span>
            </div>
            <h3 className="text-xl font-black text-[#173b72]">{theme.title}</h3>
            <p className="mt-2 text-[13px] font-black text-[#2563eb]">{theme.subtitle}</p>
            <p className="mt-4 min-h-[84px] text-[14px] font-bold leading-7 text-slate-600">{theme.betterWay}</p>
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-[13px] font-black text-slate-500">상황 예시 보기</div>
          </button>
        ))}
      </div>
    </section>
  )
}

function FcModal({ theme, onClose }: { theme: FcTheme; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 py-6">
      <div className="max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <p className="text-[12px] font-black tracking-[0.18em] text-[#2563eb]">이런 방법도 있어요!</p>
            <h2 className="mt-1 text-2xl font-black text-[#173b72]">{theme.title}</h2>
            <p className="mt-1 text-[13px] font-black text-slate-500">{theme.subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-[13px] font-black text-slate-600 hover:bg-slate-200">닫기</button>
        </div>

        <div className="grid gap-5 p-6">
          <div className="rounded-2xl bg-[#eff6ff] p-5">
            <p className="mb-2 text-[13px] font-black text-[#2563eb]">더 좋은 접근</p>
            <p className="text-[15px] font-bold leading-8 text-[#173b72]">{theme.betterWay}</p>
          </div>

          <div className="grid gap-3">
            {theme.examples.map((example) => (
              <div key={example.situation} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-[15px] font-black text-[#173b72]">{example.situation}</p>
                <p className="mt-2 text-[14px] font-bold leading-7 text-slate-600">{example.approach}</p>
                <div className="mt-3 rounded-xl border-l-4 border-[#2563eb] bg-slate-50 p-4 text-[14px] font-bold leading-7 text-slate-700">
                  {example.line}
                </div>
              </div>
            ))}
          </div>

          <InfoCard title="훈련 포인트">
            <div className="grid gap-2 md:grid-cols-3">
              {theme.training.map((item) => <div key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-[13px] font-bold leading-6 text-slate-700">{item}</div>)}
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  )
}

function CoachSection({ customerType, setCustomerType, phase, setPhase, situation, setSituation, advice }: {
  customerType: string
  setCustomerType: (value: string) => void
  phase: string
  setPhase: (value: string) => void
  situation: string
  setSituation: (value: string) => void
  advice: string[]
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <InfoCard title="현재 상황 입력">
        <div className="grid gap-4">
          <Field label="고객 유형">
            <select value={customerType} onChange={(event) => setCustomerType(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-[14px] font-bold outline-none">
              {["DB 고객", "소개 고객", "지인", "일반 고객"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="현재 단계">
            <select value={phase} onChange={(event) => setPhase(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-[14px] font-bold outline-none">
              {["TA", "AP", "PT", "C", "증권전달"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="상황 메모">
            <textarea value={situation} onChange={(event) => setSituation(event.target.value)} rows={8} placeholder="예: DB 고객이 바쁘고 관심 없다고 합니다. 보험료도 부담스럽다고 합니다." className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-[14px] font-bold leading-7 outline-none" />
          </Field>
        </div>
      </InfoCard>

      <InfoCard title="추천 접근">
        <div className="mb-5 rounded-2xl bg-[#eff6ff] p-5 text-[15px] font-bold leading-8 text-[#173b72]">
          지금은 {phase} 단계입니다. 설명을 늘리기보다 고객의 부담을 낮추고, 다음 행동을 작게 확정하는 방향이 좋습니다.
        </div>
        <div className="grid gap-3">
          {advice.map((item) => <div key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-[14px] font-bold leading-7 text-slate-700">{item}</div>)}
        </div>
      </InfoCard>
    </section>
  )
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <InfoCard title={title}>
      <div className="grid gap-2">
        {items.map((item) => <div key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-[13px] font-bold leading-6 text-slate-700">{item}</div>)}
      </div>
    </InfoCard>
  )
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:keep-all] md:p-6">
      <h2 className="mb-4 text-xl font-black text-[#173b72]">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-black text-slate-500">{label}</span>
      {children}
    </label>
  )
}
