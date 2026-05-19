import { NextRequest, NextResponse } from "next/server";
import { AiCoachMode, buildAiCoachInstructions, buildAiCoachUserPrompt } from "../../../lib/aiCoach";

type AiCoachRequest = {
  mode?: AiCoachMode;
  question?: string;
  context?: string;
};

function extractResponseText(data: any): string {
  if (typeof data?.output_text === "string") return data.output_text;
  const output = Array.isArray(data?.output) ? data.output : [];
  return output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .map((part: any) => part?.text || part?.content || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as AiCoachRequest;
  const mode = body.mode || "coach";
  const question = String(body.question || "").trim();
  const context = String(body.context || "").trim();

  if (!question) {
    return NextResponse.json(
      { error: "질문 내용을 입력해주세요." },
      { status: 400 }
    );
  }

  const vectorStoreId = process.env.OPENAI_AI_COACH_VECTOR_STORE_ID;
  const model = process.env.OPENAI_AI_COACH_MODEL || "gpt-4.1-mini";
  const tools = vectorStoreId
    ? [{ type: "file_search", vector_store_ids: [vectorStoreId] }]
    : [];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: buildAiCoachInstructions(mode),
      input: buildAiCoachUserPrompt({ mode, question, context }),
      tools,
      temperature: 0.2,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "AI 답변 생성에 실패했습니다." },
      { status: response.status }
    );
  }

  return NextResponse.json({
    answer: extractResponseText(data) || "확인 필요",
    mode,
    hasProjectSearch: Boolean(vectorStoreId),
  });
}
