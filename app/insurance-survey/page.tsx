"use client"

import { useRef, useState } from "react"

type SurveyState = Record<string, string[]>

const A4_IMAGE_WIDTH = 1240
const A4_IMAGE_HEIGHT = 1754
const A4_IMAGE_PADDING = 52

const QUESTIONS = [
  {
    id: "q1",
    title: "그동안 보험 가입경로는 어떻게 되나요? (중복가능)",
    options: ["지인", "가족, 친척", "TM방송", "라디오, 인터넷", "소개"],
  },
  {
    id: "q2",
    title: "고객님께서는 어떤 보험에 가입하고 계신가요? (중복가능)",
    options: ["실비", "종신보험(CI GI 암보험)", "건강보험", "연금보험(변액 일반)", "저축보험", "운전자보험", "일재보험(화재, 배상, 회사)", "기타"],
  },
  {
    id: "q3",
    title: "지금 현재 지출하고 있는 보험료에 대해 어떻게 생각하시나요?",
    options: ["부담된다", "적당하다", "부족하다", "가입된 보험이 없음"],
  },
  {
    id: "q4",
    title: "다음 질병으로 가족력이 있으신가요?",
    options: ["암", "뇌/심장질환", "고혈압/당뇨", "그 외", "기타"],
    extra: true,
  },
  {
    id: "q5",
    title: "지금 현재 담당 설계사가 보험금 청구 등 별도로 관리를 해주고 있나요?",
    options: ["O", "X"],
  },
  {
    id: "q7",
    title: "보험가입 하실 때 가장 중점을 두는 기준은 무엇인가요?",
    options: ["보험료", "많은 보장", "환급금", "든든한지", "보험 담당자", "보험 회사"],
  },
  {
    id: "q8",
    title: "가장 관심있는 금전적인 부분은 무엇인가요? (복수 선택 가능)",
    options: ["저축자금", "대출자금", "사업자금", "노후자금", "부채상환", "교육자금"],
  },
  {
    id: "q9",
    title: "노후 의료비 및 생활비(연금 포함)는 매월 얼마나 필요하다고 생각하시나요?",
    options: ["100만원 이하", "100~200만원", "200~300만원", "300~400만원", "400만원 이상"],
  },
  {
    id: "q10",
    title: "보험이나 저축에 대한 의사결정 시 결정은 누가 하시나요?",
    options: ["본인", "배우자", "부모님", "자녀", "기타"],
    extra: true,
  },
]

const MEDICAL_ROWS = [
  { key: "hospitalization", label: "입원 또는 수술 이력" },
  { key: "longTreatment", label: "7일 이상 치료 이력" },
  { key: "longMedication", label: "30일 이상 약 복용" },
  { key: "currentCare", label: "현재 치료 또는 추적관찰" },
]

const today = new Date()
const todayText = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, "0")}. ${String(today.getDate()).padStart(2, "0")}.`

export default function InsuranceSurveyPage() {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [customerName, setCustomerName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [occupation, setOccupation] = useState("")
  const [advisorName, setAdvisorName] = useState("")
  const [answers, setAnswers] = useState<SurveyState>({})
  const [extras, setExtras] = useState<Record<string, string>>({})
  const [medical, setMedical] = useState<Record<string, string>>({})
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)

  const toggle = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] || []
      const next = current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
      return { ...prev, [questionId]: next }
    })
  }

  const captureAsImage = async () => {
    const node = sheetRef.current
    if (!node) return
    setSaving(true)

    try {
      await document.fonts?.ready
      await new Promise((resolve) => window.setTimeout(resolve, 120))

      const html2canvas = (await import("html2canvas")).default
      const captured = await html2canvas(node, {
        backgroundColor: "#ffffff",
        logging: false,
        scale: 2,
        useCORS: true,
        windowHeight: Math.max(node.scrollHeight, Math.ceil(node.getBoundingClientRect().height)),
        windowWidth: Math.max(node.scrollWidth, Math.ceil(node.getBoundingClientRect().width)),
      })

      const canvas = document.createElement("canvas")
      canvas.width = A4_IMAGE_WIDTH
      canvas.height = A4_IMAGE_HEIGHT

      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("이미지 저장 준비에 실패했습니다.")

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, A4_IMAGE_WIDTH, A4_IMAGE_HEIGHT)

      const maxWidth = A4_IMAGE_WIDTH - A4_IMAGE_PADDING * 2
      const maxHeight = A4_IMAGE_HEIGHT - A4_IMAGE_PADDING * 2
      const ratio = Math.min(maxWidth / captured.width, maxHeight / captured.height)
      const drawWidth = captured.width * ratio
      const drawHeight = captured.height * ratio
      const drawX = (A4_IMAGE_WIDTH - drawWidth) / 2
      const drawY = (A4_IMAGE_HEIGHT - drawHeight) / 2

      ctx.drawImage(captured, drawX, drawY, drawWidth, drawHeight)

      const link = document.createElement("a")
      link.download = `내보험바로알기_${customerName || "고객"}_${Date.now()}.png`
      link.href = canvas.toDataURL("image/png")
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error(error)
      alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setSaving(false)
    }
  }

  const completeSurvey = () => {
    setCompleted(true)
    window.setTimeout(() => {
      void captureAsImage()
    }, 180)
  }

  return (
    <main style={{ minHeight: "100vh", background: "#e8eef6", padding: "22px", fontFamily: "'Pretendard','Apple SD Gothic Neo',Arial,sans-serif" }}>
      <div style={{ margin: "0 auto 14px", maxWidth: 940, display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, color: "#17243a", fontSize: 24, fontWeight: 950 }}>내보험 바로알기</h1>
          <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 14, fontWeight: 800 }}>체크 후 설문 완료를 누르면 현재 설문지가 이미지로 저장됩니다.</p>
        </div>
        <button onClick={() => window.close()} style={topButton("#17243a", "#fff")}>창 닫기</button>
      </div>

      <div ref={sheetRef} style={sheetStyle}>
        <Corner position="left" />
        <Corner position="right" />

        <header style={{ textAlign: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, color: "#263446", fontSize: 34, fontWeight: 900, letterSpacing: "-0.5px" }}>내 보험 바로 알기 캠페인</h2>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
          <Field label="성명" value={customerName} onChange={setCustomerName} />
          <Field label="생년월일" value={birthDate} onChange={setBirthDate} />
          <Field label="직업" value={occupation} onChange={setOccupation} />
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          {QUESTIONS.slice(0, 5).map((question, index) => (
            <QuestionBlock
              key={question.id}
              number={index + 1}
              question={question}
              selected={answers[question.id] || []}
              extra={extras[question.id] || ""}
              onExtra={(value) => setExtras((prev) => ({ ...prev, [question.id]: value }))}
              onToggle={(option) => toggle(question.id, option)}
            />
          ))}

          <div style={questionBoxStyle}>
            <p style={questionTitleStyle}>6. 5년 이내 입원 / 수술 7일 이상 치료 / 30일 이상 약 복용 등 병원 치료를 받으신 적이 있나요?</p>
            <div style={{ display: "grid", gap: 9, marginTop: 8 }}>
              {MEDICAL_ROWS.map((row) => (
                <div key={row.key} style={{ display: "grid", gridTemplateColumns: "170px 120px minmax(0,1fr)", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 15, color: "#334155", fontWeight: 900 }}>{row.label}</span>
                  <select
                    value={medical[`${row.key}:yn`] || ""}
                    onChange={(event) => setMedical((prev) => ({ ...prev, [`${row.key}:yn`]: event.target.value }))}
                    style={selectStyle}
                  >
                    <option value="">선택</option>
                    <option value="있음">있음</option>
                    <option value="없음">없음</option>
                  </select>
                  <input
                    value={medical[`${row.key}:memo`] || ""}
                    onChange={(event) => setMedical((prev) => ({ ...prev, [`${row.key}:memo`]: event.target.value }))}
                    placeholder="질병명, 치료내용 메모"
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          </div>

          {QUESTIONS.slice(5).map((question, index) => (
            <QuestionBlock
              key={question.id}
              number={index + 7}
              question={question}
              selected={answers[question.id] || []}
              extra={extras[question.id] || ""}
              onExtra={(value) => setExtras((prev) => ({ ...prev, [question.id]: value }))}
              onToggle={(option) => toggle(question.id, option)}
            />
          ))}
        </section>

        <div style={{ margin: "18px auto 14px", maxWidth: 520, background: "#ffd72e", color: "#1f2937", padding: "13px 18px", textAlign: "center", fontSize: 15, lineHeight: 1.55, fontWeight: 950 }}>
          고객님의 정보는 상담 이외의 용도로 사용되지 않습니다.<br />개인정보 수집 및 이용에 동의합니다.
        </div>

        <p style={{ margin: "0 0 12px", textAlign: "center", color: "#263446", fontSize: 17, fontWeight: 900 }}>{todayText}</p>

        <div style={{ width: 520, margin: "0 auto", border: "1px solid #64748b" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#475569", color: "#fff", textAlign: "center", fontSize: 15, fontWeight: 950 }}>
            <div style={{ padding: "8px", borderRight: "1px solid #94a3b8" }}>고객님 성명</div>
            <div style={{ padding: "8px" }}>담당자 서명</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 44, color: "#0f172a", textAlign: "center", fontSize: 18, fontWeight: 950 }}>
            <div style={{ padding: "11px", borderRight: "1px solid #cbd5e1" }}>{completed ? customerName : ""}</div>
            <div style={{ padding: "11px" }}>{completed ? advisorName : ""}</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: "14px auto 0", display: "grid", gridTemplateColumns: "1fr 1fr 180px", gap: 10 }}>
        <Field label="담당자 이름" value={advisorName} onChange={setAdvisorName} dark />
        <button onClick={completeSurvey} disabled={saving} style={topButton("#2563eb", "#fff")}>{saving ? "저장 중..." : "설문 완료 및 이미지 저장"}</button>
        <button onClick={() => window.close()} style={topButton("#17243a", "#fff")}>창 닫기</button>
      </div>
    </main>
  )
}

function Field({ label, value, onChange, dark = false }: { label: string; value: string; onChange: (value: string) => void; dark?: boolean }) {
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span style={{ color: dark ? "#334155" : "#1f2937", fontSize: 14, fontWeight: 950 }}>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle} />
    </label>
  )
}

function QuestionBlock({
  number,
  question,
  selected,
  extra,
  onExtra,
  onToggle,
}: {
  number: number
  question: { id: string; title: string; options: string[]; extra?: boolean }
  selected: string[]
  extra: string
  onExtra: (value: string) => void
  onToggle: (option: string) => void
}) {
  return (
    <div style={questionBoxStyle}>
      <p style={questionTitleStyle}>{number}. {question.title}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
        {question.options.map((option) => {
          const checked = selected.includes(option)
          return (
            <button key={option} onClick={() => onToggle(option)} type="button" style={checkButtonStyle(checked)}>
              <span style={checkMarkStyle(checked)}>{checked ? "✓" : ""}</span>
              {option}
            </button>
          )
        })}
        {question.extra && (
          <input value={extra} onChange={(event) => onExtra(event.target.value)} placeholder="기타 내용" style={{ ...inputStyle, width: 190, height: 34, fontSize: 14 }} />
        )}
      </div>
    </div>
  )
}

function Corner({ position }: { position: "left" | "right" }) {
  const left = position === "left"
  return (
    <>
      <div style={{ position: "absolute", [left ? "left" : "right"]: 0, [left ? "top" : "bottom"]: 0, width: 120, height: 120, background: "#263446", clipPath: left ? "polygon(0 0, 100% 0, 0 100%)" : "polygon(100% 0, 100% 100%, 0 100%)" }} />
      <div style={{ position: "absolute", [left ? "left" : "right"]: left ? 52 : 36, [left ? "top" : "bottom"]: left ? 72 : 55, width: 78, height: 5, background: "#ffd400", transform: left ? "rotate(-45deg)" : "rotate(-45deg)" }} />
    </>
  )
}

const sheetStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  maxWidth: 940,
  margin: "0 auto",
  background: "#fff",
  border: "1px solid #64748b",
  padding: "58px 54px 42px",
  boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
}

const questionBoxStyle: React.CSSProperties = {
  borderBottom: "1px solid #e2e8f0",
  paddingBottom: 10,
}

const questionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#1f2937",
  fontSize: 16,
  lineHeight: 1.5,
  fontWeight: 950,
}

const inputStyle: React.CSSProperties = {
  height: 38,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "0 11px",
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 850,
  outline: "none",
  background: "#fff",
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  height: 36,
  fontSize: 15,
  fontWeight: 900,
}

function checkButtonStyle(checked: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    border: checked ? "1.8px solid #2563eb" : "1.4px solid #cbd5e1",
    borderRadius: 9,
    padding: "6px 10px",
    background: checked ? "#eff6ff" : "#fff",
    color: checked ? "#1d4ed8" : "#334155",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
  }
}

function checkMarkStyle(checked: boolean): React.CSSProperties {
  return {
    width: 17,
    height: 17,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: checked ? "1px solid #2563eb" : "1px solid #94a3b8",
    borderRadius: 3,
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 950,
    background: checked ? "#dbeafe" : "#fff",
  }
}

function topButton(bg: string, color: string): React.CSSProperties {
  return {
    minHeight: 42,
    border: "none",
    borderRadius: 12,
    padding: "0 16px",
    background: bg,
    color,
    fontSize: 14,
    fontWeight: 950,
    cursor: "pointer",
  }
}
