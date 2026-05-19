import { NextRequest, NextResponse } from "next/server";

type AnalyzeRequest = {
  fileName?: string;
  fileType?: string;
  category?: string;
  customerName?: string;
  memo?: string;
  imageDataUrl?: string;
  fileDataUrl?: string;
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

  const body = (await request.json().catch(() => ({}))) as AnalyzeRequest;
  const fileName = String(body.fileName || "").trim();
  const fileType = String(body.fileType || "").trim();
  const category = String(body.category || "기타").trim();
  const customerName = String(body.customerName || "미지정 고객").trim();
  const memo = String(body.memo || "").trim();
  const imageDataUrl = String(body.imageDataUrl || "").trim();
  const fileDataUrl = String(body.fileDataUrl || "").trim();

  if (!fileName) {
    return NextResponse.json(
      { error: "분석할 파일 정보가 없습니다." },
      { status: 400 }
    );
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      extracted: {
        type: "object",
        additionalProperties: false,
        properties: {
          insured_name: { type: "string" },
          company: { type: "string" },
          product_names: {
            type: "array",
            items: { type: "string" },
          },
          coverages: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                category: { type: "string", enum: ["암", "뇌", "심장", "수술", "입원", "간병", "치아", "운전자", "기타"] },
                coverage_name: { type: "string" },
                amount: { type: "number" },
                unit: { type: "string" },
                note: { type: "string" },
              },
              required: ["category", "coverage_name", "amount", "unit", "note"],
            },
          },
        },
        required: ["insured_name", "company", "product_names", "coverages"],
      },
      consultation_points: {
        type: "array",
        items: { type: "string" },
      },
      customer_questions: {
        type: "array",
        items: { type: "string" },
      },
      next_actions: {
        type: "array",
        items: { type: "string" },
      },
      cautions: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["summary", "extracted", "consultation_points", "customer_questions", "next_actions", "cautions"],
  };

  const prompt = [
    "너는 메타리치 시그널그룹의 보험설계사 상담자료 분석 보조 AI다.",
    "업로드된 보험 자료를 보고 설계사가 고객 상담 전에 확인할 내용을 구조화한다.",
    "이미지나 PDF에 보이는 담보명, 가입금액, 보험사, 상품명을 가능한 범위에서 추출한다.",
    "금액은 원 단위 숫자로 정규화한다. 예: 5천만원, 50,000천원, 5,000만원은 50000000.",
    "읽히지 않거나 자료에 없는 값은 빈 문자열, 0, 또는 확인 필요로 처리한다.",
    "보험금 지급 가능 여부, 의학적 진단, 법률 판단은 확정하지 말고 확인 필요로 표현한다.",
    "",
    `고객: ${customerName}`,
    `분류: ${category}`,
    `파일명: ${fileName}`,
    `파일 형식: ${fileType || "확인 필요"}`,
    memo ? `관리자 메모: ${memo}` : "",
    "",
    "반드시 지정된 JSON Schema에 맞춰 답변한다.",
  ].filter(Boolean).join("\n");

  const content: any[] = [{ type: "input_text", text: prompt }];
  if (fileDataUrl.startsWith("data:application/pdf;base64,")) {
    content.push({ type: "input_file", filename: fileName, file_data: fileDataUrl });
  }
  if (imageDataUrl.startsWith("data:image/")) {
    content.push({ type: "input_image", image_url: imageDataUrl, detail: "high" });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_CRM_UPLOAD_MODEL || process.env.OPENAI_AI_COACH_MODEL || "gpt-4.1-mini",
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "insurance_upload_analysis",
          strict: true,
          schema,
        },
      },
      temperature: 0.2,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "자료 분석에 실패했습니다." },
      { status: response.status }
    );
  }

  const outputText = extractResponseText(data) || "{}";
  const parsed = JSON.parse(outputText);

  return NextResponse.json({
    analysis: formatAnalysis(parsed),
    structured: parsed,
    usedImage: imageDataUrl.startsWith("data:image/"),
    usedPdf: fileDataUrl.startsWith("data:application/pdf;base64,"),
  });
}

function formatAnalysis(result: any) {
  const coverages = Array.isArray(result?.extracted?.coverages) ? result.extracted.coverages : [];
  const coverageLines = coverages.length > 0
    ? coverages.slice(0, 8).map((item: any) => {
      const amount = Number(item.amount || 0);
      const amountText = amount > 0 ? `${amount.toLocaleString("ko-KR")}원` : "금액 확인 필요";
      return `- [${item.category || "기타"}] ${item.coverage_name || "담보명 확인 필요"}: ${amountText}${item.note ? ` (${item.note})` : ""}`;
    }).join("\n")
    : "- 추출된 담보가 없습니다.";

  return [
    `자료 요약\n${result?.summary || "확인 필요"}`,
    `\n추출 담보\n${coverageLines}`,
    `\n상담 체크포인트\n${toLines(result?.consultation_points)}`,
    `\n고객 질문\n${toLines(result?.customer_questions)}`,
    `\n다음 행동\n${toLines(result?.next_actions)}`,
    `\n주의\n${toLines(result?.cautions)}`,
  ].join("\n");
}

function toLines(value: any) {
  const list = Array.isArray(value) ? value : [];
  if (!list.length) return "- 확인 필요";
  return list.slice(0, 5).map((item) => `- ${String(item)}`).join("\n");
}
