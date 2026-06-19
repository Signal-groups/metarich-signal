import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY가 설정되지 않았습니다." }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const { content } = body as { content?: string }

  if (!content?.trim()) {
    return NextResponse.json({ error: "상품 내용을 입력해주세요." }, { status: 400 })
  }

  const systemPrompt = `당신은 대한민국 보험 영업 전문가이자 마케팅 전략가입니다.
보험 상품 내용을 분석해서 설계사들이 즉시 활용할 수 있는 영업 전략을 생성합니다.
반드시 한국어로 작성하고, 구체적이고 실용적인 내용을 제공하세요.`

  const userPrompt = `아래 보험 상품 내용을 분석하고 영업 전략 JSON을 생성해주세요.

=== 상품 내용 ===
${content}
=== 끝 ===

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이 JSON만):
{
  "productName": "정확한 상품명 (전단에서 추출)",
  "category": "암보험 또는 건강보험 또는 종신보험 또는 CI보험 또는 상해보험 또는 연금보험 또는 실손보험 중 하나",
  "categoryColor": "#색상코드",
  "features": [
    { "icon": "이모지", "title": "핵심 특장점 제목 (10자 이내)", "desc": "구체적인 설명 (30자 이내, 수치 포함)" },
    { "icon": "이모지", "title": "핵심 특장점 제목 (10자 이내)", "desc": "구체적인 설명 (30자 이내, 수치 포함)" },
    { "icon": "이모지", "title": "핵심 특장점 제목 (10자 이내)", "desc": "구체적인 설명 (30자 이내, 수치 포함)" }
  ],
  "concept": "이 상품의 핵심 판매 컨셉 2~3문장. 어떤 고객에게, 왜 이 상품이 필요한지 명확하게.",
  "speech": {
    "opening": "첫 통화·첫 만남에서 쓸 자연스러운 오프닝 멘트 1~2문장. 고객의 상황/니즈에서 시작.",
    "core": "상품 핵심 가치를 전달하는 본론 3~4문장. 경쟁 상품 대비 차별점, 구체적 수치 포함.",
    "closing": "계약 결심을 이끄는 클로징 멘트 1~2문장. 희소성/시급성 활용."
  },
  "touchCard": {
    "headline": "카카오톡 발송용 임팩트 헤드라인 (8자 이내, 강렬하게)",
    "subheadline": "헤드라인 보조 설명 (16자 이내)",
    "points": [
      "핵심 포인트 1 (18자 이내)",
      "핵심 포인트 2 (18자 이내)",
      "핵심 포인트 3 (18자 이내)"
    ],
    "cta": "행동 유도 문구 (8자 이내, ex: 지금 상담 신청, 무료 분석 받기)"
  }
}

카테고리별 색상:
- 암보험: #c0392b
- 건강보험: #16a085
- 종신보험: #1a5fb4
- CI보험: #6c3483
- 상해보험: #d35400
- 연금보험: #0e6655
- 실손보험: #1565c0
- 기타: #374151`

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_AI_COACH_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "AI 분석에 실패했습니다." },
      { status: response.status }
    )
  }

  const resultText = (data.choices?.[0]?.message?.content as string) || ""
  try {
    const result = JSON.parse(resultText)
    return NextResponse.json({ result })
  } catch {
    return NextResponse.json({ error: "분석 결과 파싱 실패", raw: resultText }, { status: 500 })
  }
}
