import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

export const runtime = "nodejs"

// 카테고리별 추출 대상 담보 정의
const CATEGORY_METRICS: Record<string, { key: string; label: string; hint: string }[]> = {
  driver: [
    { key: "trafficSupport", label: "교통사고처리지원금", hint: "형사합의금 성격의 지원금 (만원)" },
    { key: "lawyer", label: "변호사선임비용", hint: "변호사비용 한도 (만원)" },
    { key: "finePerson", label: "벌금 대인", hint: "대인 벌금 한도 (만원)" },
    { key: "fineProperty", label: "벌금 대물", hint: "대물 벌금 한도 (만원)" },
    { key: "injury", label: "자동차사고부상치료비(자부상)", hint: "부상치료비 한도 (만원)" },
    { key: "renewal", label: "갱신 여부", hint: "갱신형/비갱신형 텍스트" },
  ],
  health: [
    { key: "cancer", label: "일반암 진단비", hint: "일반암 기준 진단비 (만원)" },
    { key: "minorCancer", label: "유사암 진단비", hint: "갑상선암·피부암 등 소액암 (만원)" },
    { key: "brain", label: "뇌 보장", hint: "뇌출혈·뇌졸중·뇌혈관 등 (만원)" },
    { key: "heart", label: "심장 보장", hint: "급성심근경색·심혈관 등 (만원)" },
    { key: "surgery", label: "질병수술비", hint: "질병수술비 (만원)" },
    { key: "care", label: "간병 보장", hint: "간병인 사용일당 또는 통합 보장 (만원)" },
  ],
  care: [
    { key: "injuryCareDaily", label: "상해 간병일당", hint: "상해 입원 중 간병인 사용일당 (만원)" },
    { key: "diseaseCareDaily", label: "질병 간병일당", hint: "질병 입원 중 간병인 사용일당 (만원)" },
    { key: "after181Daily", label: "181일 이상 간병담보", hint: "181일 이상 장기입원 간병일당 (만원)" },
    { key: "nursingHospitalDaily", label: "요양병원 간병일당", hint: "요양병원 입원 간병 관련 일당 (만원)" },
    { key: "injuryIntegratedDaily", label: "간호간병통합서비스 상해", hint: "상해 간호간병통합서비스 일당 (만원)" },
    { key: "diseaseIntegratedDaily", label: "간호간병통합서비스 질병", hint: "질병 간호간병통합서비스 일당 (만원)" },
  ],
  homecare: [
    { key: "visitCare", label: "방문요양", hint: "방문요양 보완금액 (만원)" },
    { key: "dayNight", label: "주야간보호", hint: "주야간보호 금액 (만원)" },
    { key: "familyCare", label: "가족돌봄 지원", hint: "가족돌봄 지원금액 (만원)" },
    { key: "dementiaDiagnosis", label: "치매 진단비", hint: "치매 진단 보장금액 (만원)" },
    { key: "dementiaTargetTreatment", label: "치매 표적치료보장", hint: "치매 표적치료 또는 특정치료 보장금액 (만원)" },
    { key: "grade", label: "대상 등급", hint: "장기요양등급 또는 치매 단계 텍스트" },
  ],
  pet: [
    { key: "outpatient", label: "통원 보상한도", hint: "1회 또는 연간 통원 한도 (만원)" },
    { key: "inpatient", label: "입원 보상한도", hint: "입원 한도 (만원)" },
    { key: "surgery", label: "수술 보상한도", hint: "수술 한도 (만원)" },
    { key: "patella", label: "슬개골 보장", hint: "보장 여부 또는 금액" },
    { key: "skin", label: "피부질환", hint: "보장 여부 텍스트" },
    { key: "deductible", label: "자기부담금", hint: "정액 또는 정률 구조 텍스트" },
  ],
  shortlife: [
    { key: "deathBenefit", label: "사망보험금", hint: "기본 사망보험금 (만원)" },
    { key: "refundYear", label: "환급 확인 시점", hint: "예: 10년 후" },
    { key: "refundRate", label: "해지환급률", hint: "퍼센트 숫자만, 예: 107.5" },
    { key: "refundAmount", label: "해지환급금", hint: "예상 환급금 (만원)" },
    { key: "purpose", label: "활용 목적", hint: "목적자금/상속/증여 등 텍스트" },
    { key: "liquidity", label: "유동성 주의", hint: "중도해지 관련 내용 텍스트" },
  ],
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local에 추가해주세요." },
      { status: 500 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "FormData 파싱 실패" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  const categoryId = String(formData.get("categoryId") || "health")

  if (!file) {
    return NextResponse.json({ error: "PDF 파일이 없습니다." }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "PDF 파일만 지원합니다." }, { status: 400 })
  }

  // PDF → Buffer → 텍스트 추출
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let pdfText = ""
  try {
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: buffer })
    const pdfData = await parser.getText({ partial: [1, 15] })
    await parser.destroy()
    pdfText = pdfData.text
      .replace(/\s{3,}/g, "  ")
      .slice(0, 10000)
  } catch {
    return NextResponse.json(
      { error: "PDF 텍스트 추출 실패. 스캔 이미지 기반 PDF는 지원되지 않습니다." },
      { status: 422 }
    )
  }

  if (pdfText.trim().length < 30) {
    return NextResponse.json(
      { error: "PDF에서 텍스트를 읽을 수 없습니다. 이미지 기반 스캔 PDF입니다." },
      { status: 422 }
    )
  }

  const metrics = CATEGORY_METRICS[categoryId] || CATEGORY_METRICS.health
  const metricsSchema = metrics
    .map((m) => `  "${m.key}": "${m.label} — ${m.hint}"`)
    .join(",\n")

  const prompt = `한국 보험사 PDF 제안서 텍스트에서 정보를 추출하세요.

반드시 아래 JSON 형식만 출력하세요. 찾을 수 없으면 빈 문자열("")로 남기세요.
금액은 만원 단위 숫자만 (예: 일반암 5000만원 → "5000").
월납보험료는 원 단위 숫자만, 쉼표 제거 (예: 52,380원 → "52380").
교차설계(여러 회사 분산)인 경우 첫 번째 상품 기준으로 추출하세요.

{
  "customerName": "피보험자 또는 계약자 이름",
  "company": "보험사명",
  "productName": "상품명(가장 핵심 상품명)",
  "monthlyPremium": "월납보험료 원 단위 숫자만 (예: 52380 → \"52380\")",
  "paymentYears": "납입기간 숫자만(예: 20)",
  "coverageYears": "보장기간(예: 100세 또는 종신)",
  "metrics": {
${metricsSchema}
  }
}

PDF 텍스트:
---
${pdfText}
---`

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = message.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { type: "text"; text: string }).text)
      .join("")

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI 응답에서 JSON을 파싱할 수 없습니다." },
        { status: 500 }
      )
    }
    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ ok: true, data: parsed })
  } catch (err) {
    console.error("parse-proposal-pdf error:", err)
    return NextResponse.json(
      { error: "PDF 파싱 중 오�