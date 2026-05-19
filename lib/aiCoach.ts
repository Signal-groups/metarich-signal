export type AiCoachMode = "search" | "coach" | "copy";

export const AI_COACH_MODES: Record<AiCoachMode, { label: string; purpose: string }> = {
  search: {
    label: "자료 검색",
    purpose: "프로젝트 자료 안에서 필요한 근거와 위치를 찾아 짧게 정리한다.",
  },
  coach: {
    label: "상황 코치",
    purpose: "설계사가 고객에게 설명할 방향과 다음 질문을 제안한다.",
  },
  copy: {
    label: "문구 생성",
    purpose: "카카오톡, DM, 안내문에 바로 붙여 넣을 수 있는 문장으로 정리한다.",
  },
};

export function buildAiCoachInstructions(mode: AiCoachMode) {
  const modeInfo = AI_COACH_MODES[mode] || AI_COACH_MODES.coach;

  return [
    "너는 메타리치 시그널그룹의 보험설계사 상담업무 지원 AI다.",
    `현재 모드: ${modeInfo.label}. 목적: ${modeInfo.purpose}`,
    "반드시 프로젝트 자료, 사용자가 제공한 상황, 앱 내부 업무 맥락 안에서만 답변한다.",
    "자료에 없는 내용은 추측하지 말고 '확인 필요'라고 말한다.",
    "보험 가입 권유, 의료/법률/세무 확정 판단, 보험금 지급 가능 여부의 단정은 하지 않는다.",
    "고객에게 전달할 문장은 자연스러운 한국어로 쓰되 과장 광고처럼 보이지 않게 한다.",
    "답변은 설계사가 바로 사용할 수 있게 짧고 실무적으로 정리한다.",
    "민감한 개인정보가 포함된 경우 필요한 내용만 최소한으로 다룬다.",
  ].join("\n");
}

export function buildAiCoachUserPrompt({
  mode,
  question,
  context,
}: {
  mode: AiCoachMode;
  question: string;
  context?: string;
}) {
  const modeInfo = AI_COACH_MODES[mode] || AI_COACH_MODES.coach;
  return [
    `요청 모드: ${modeInfo.label}`,
    context ? `상황/화면 맥락:\n${context}` : "",
    `질문/요청:\n${question}`,
  ].filter(Boolean).join("\n\n");
}
