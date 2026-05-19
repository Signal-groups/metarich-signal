import { AiCoachMode } from "./aiCoach";

export async function askAiCoach({
  mode = "coach",
  question,
  context,
}: {
  mode?: AiCoachMode;
  question: string;
  context?: string;
}) {
  const response = await fetch("/api/ai-coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, question, context }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "AI 답변 생성에 실패했습니다.");
  }

  return data as {
    answer: string;
    mode: AiCoachMode;
    hasProjectSearch: boolean;
  };
}
