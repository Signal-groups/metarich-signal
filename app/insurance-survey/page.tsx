"use client"

import { useMemo, useRef, useState } from "react"

type SurveyState = Record<string, string[]>
type Question = {
  id: string
  title: string
  options: string[]
  extra?: boolean
  targetPage?: 1 | 2
}

const STORAGE_KEY = "signal-insurance-survey-questions-v2"
const IMAGE_WIDTH = 1240
const IMAGE_PADDING = 52

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: "q1",
    title: "그동안 보험 가입 경로는 어떻게 되나요? (중복 선택 가능)",
    options: ["지인", "가족·친척", "TM/방송", "인터넷", "소개"],
    targetPage: 1,
  },
  {
    id: "q2",
    title: "현재 가입하고 계신 보험은 무엇인가요? (중복 선택 가능)",
    options: ["실비", "종신/CI/GI", "건강보험", "연금보험", "저축보험", "운전자보험", "화재/배상보험", "기타"],
    extra: true,
    targetPage: 1,
  },
  {
    id: "q3",
    title: "현재 납입 중인 보험료에 대해 어떻게 생각하시나요?",
    options: ["부담된다", "적당하다", "부족하다", "가입 보험이 없다"],
    targetPage: 1,
  },
  {
    id: "q4",
    title: "다음 질병으로 가족력이 있으신가요?",
    options: ["암", "뇌·심장질환", "고혈압·당뇨", "없음", "기타"],
    extra: true,
    targetPage: 1,
  },
  {
    id: "q5",
    title: "보험금 청구와 보장 관리를 별도로 받고 계신가요?",
    options: ["예", "아니오", "잘 모르겠다"],
    targetPage: 1,
  },
  {
    id: "q6",
    title: "보험 가입 시 가장 중요하게 보는 기준은 무엇인가요?",
    options: ["보험료", "넓은 보장", "환급금", "쉬운 청구", "담당자 관리", "보험회사"],
    targetPage: 1,
  },
  {
    id: "q7",
    title: "가장 관심 있는 금전적인 부분은 무엇인가요? (중복 선택 가능)",
    options: ["대출자금", "사업자금", "은퇴자금", "노후 생활비", "부채상환", "교육자금"],
    targetPage: 1,
  },
  {
    id: "q8",
    title: "노후 의료비와 생활비는 매월 어느 정도 필요하다고 생각하시나요?",
    options: ["100만원 이하", "100~200만원", "200~300만원", "300~400만원", "400만원 이상"],
    targetPage: 1,
  },
  {
    id: "q9",
    title: "보험이나 저축에 대한 의사결정은 누가 주로 하시나요?",
    options: ["본인", "배우자", "부모님", "자녀", "기타"],
    extra: true,
    targetPage: 1,
  },
]

const MEDICAL_ROWS = [
  "입원 또는 수술 이력",
  "7일 이상 치료 이력",
  "30일 이상 약 복용",
  "현재 치료 또는 추적관찰",
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
  const [medicalBase, setMedicalBase] = useState<Record<string, string>>({})
  const [medicalItems, setMedicalItems] = useState<string[]>([])
  const [medicalDraft, setMedicalDraft] = useState("")
  const [questions, setQuestions] = useState<Question[]>(() => loadQuestions())
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [editingQuestions, setEditingQuestions] = useState(false)

  const activeQuestions = useMemo(() => questions.slice(0, 9), [questions])
  const totalSteps = Math.max(1, Math.ceil(activeQuestions.length / 2))
  const visibleQuestions = activeQuestions.slice(step * 2, step * 2 + 2)
  const progress = Math.round(((step + 1) / totalSteps) * 100)

  const toggle = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] || []
      const next = current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
      return { ...prev, [questionId]: next }
    })
  }

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    const next = normalizeQuestions(questions.map((question) => (question.id === id ? { ...question, ...patch } : question)))
    saveQuestions(next)
    setQuestions(next)
  }

  const resetQuestions = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setQuestions(DEFAULT_QUESTIONS)
    setAnswers({})
    setExtras({})
    setStep(0)
  }

  const addMedicalItem = () => {
    const value = medicalDraft.trim()
    if (!value) return
    setMedicalItems((prev) => [...prev, value])
    setMedicalDraft("")
  }

  const updateMedicalBase = (key: string, value: string) => {
    setMedicalBase((prev) => ({ ...prev, [key]: value }))
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
        backgroundColor: "#e8f4ff",
        logging: false,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        removeContainer: true,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
        windowHeight: Math.max(node.scrollHeight, Math.ceil(node.getBoundingClientRect().height)),
        windowWidth: Math.max(node.scrollWidth, Math.ceil(node.getBoundingClientRect().width)),
      })

      const canvas = document.createElement("canvas")
      const ratio = (IMAGE_WIDTH - IMAGE_PADDING * 2) / captured.width
      const drawWidth = captured.width * ratio
      const drawHeight = captured.height * ratio

      canvas.width = IMAGE_WIDTH
      canvas.height = Math.ceil(drawHeight + IMAGE_PADDING * 2)

      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("이미지 저장 준비에 실패했습니다.")

      ctx.fillStyle = "#e8f4ff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(captured, IMAGE_PADDING, IMAGE_PADDING, drawWidth, drawHeight)

      const link = document.createElement("a")
      link.download = `내보험바로알기_${customerName || "고객"}_${Date.now()}.png`
      canvas.toBlob((blob) => {
        if (!blob) {
          alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해주세요.")
          return
        }
        const url = URL.createObjectURL(blob)
        link.href = url
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }, "image/png")
    } catch (error) {
      console.error(error)
      alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="survey-page">
      <style>{styles}</style>

      <div className="survey-shell">
        <header className="survey-header">
          <div>
            <h1>내보험 바로알기</h1>
            <p>PC에서는 전체 질문을 한 번에 작성하고, 모바일에서는 2개씩 편하게 진행합니다.</p>
          </div>
          <button type="button" className="dark-button" onClick={() => window.close()}>창 닫기</button>
        </header>

        <section className="panel">
          <div className="panel-title">기본 정보</div>
          <div className="input-grid">
            <Field label="성명" value={customerName} onChange={setCustomerName} />
            <Field label="생년월일" value={birthDate} onChange={setBirthDate} placeholder="예: 1985-08-15" />
            <Field label="직업" value={occupation} onChange={setOccupation} />
            <Field label="담당자" value={advisorName} onChange={setAdvisorName} />
          </div>
        </section>

        <section className="panel">
          <div className="step-head">
            <div>
              <div className="panel-title">질문 작성</div>
              <p className="desktop-copy">기본 9개 질문을 기존 방식대로 한 화면에서 선택합니다.</p>
              <p className="mobile-copy">{step + 1} / {totalSteps} 단계 · 현재 화면에는 2개 질문만 표시됩니다.</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => setEditingQuestions((prev) => !prev)}>
              질문 수정
            </button>
          </div>

          {editingQuestions && (
            <QuestionEditor questions={activeQuestions} onUpdate={updateQuestion} onReset={resetQuestions} />
          )}

          <div className="desktop-question-stack">
            {activeQuestions.map((question, index) => (
              <QuestionCard
                key={question.id}
                number={index + 1}
                question={question}
                selected={answers[question.id] || []}
                extra={extras[question.id] || ""}
                onExtra={(value) => setExtras((prev) => ({ ...prev, [question.id]: value }))}
                onToggle={(option) => toggle(question.id, option)}
              />
            ))}
          </div>

          <div className="mobile-question-flow">
            <div className="progress"><span style={{ width: `${progress}%` }} /></div>
            <div className="question-stack">
              {visibleQuestions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  number={step * 2 + index + 1}
                  question={question}
                  selected={answers[question.id] || []}
                  extra={extras[question.id] || ""}
                  onExtra={(value) => setExtras((prev) => ({ ...prev, [question.id]: value }))}
                  onToggle={(option) => toggle(question.id, option)}
                />
              ))}
            </div>
            <div className="nav-actions">
              <button type="button" className="ghost-button" disabled={step === 0} onClick={() => setStep((prev) => Math.max(0, prev - 1))}>이전</button>
              {step < totalSteps - 1 ? (
                <button type="button" className="primary-button" onClick={() => setStep((prev) => Math.min(totalSteps - 1, prev + 1))}>다음 질문</button>
              ) : (
                <button type="button" className="primary-button" onClick={captureAsImage} disabled={saving}>{saving ? "저장 중..." : "이미지 저장"}</button>
              )}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">병력사항 입력</div>
          <p className="helper">병력사항은 결과지 2페이지에 별도로 정리됩니다. 입력 내용이 없으면 결과지는 1장으로 저장됩니다.</p>

          <div className="medical-base-form">
            {MEDICAL_ROWS.map((label) => (
              <div key={label} className="medical-base-row">
                <strong>{label}</strong>
                <select value={medicalBase[`${label}:yn`] || ""} onChange={(event) => updateMedicalBase(`${label}:yn`, event.target.value)}>
                  <option value="">선택</option>
                  <option value="있음">있음</option>
                  <option value="없음">없음</option>
                </select>
                <input value={medicalBase[`${label}:memo`] || ""} onChange={(event) => updateMedicalBase(`${label}:memo`, event.target.value)} placeholder="질병명 / 치료내용" />
              </div>
            ))}
          </div>

          <div className="medical-add">
            <input value={medicalDraft} onChange={(event) => setMedicalDraft(event.target.value)} placeholder="예: 2024년 위내시경 용종 제거, 추적검사 예정" />
            <button type="button" className="primary-button" onClick={addMedicalItem}>추가</button>
          </div>
          <div className="medical-list">
            {medicalItems.map((item, index) => (
              <span key={`${item}-${index}`}>
                {item}
                <button type="button" onClick={() => setMedicalItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}>삭제</button>
              </span>
            ))}
            {medicalItems.length === 0 && <em>추가된 병력사항이 없습니다.</em>}
          </div>
        </section>

        <section className="action-panel">
          <button type="button" className="primary-button save-button" onClick={captureAsImage} disabled={saving}>
            {saving ? "저장 중..." : "이미지 저장"}
          </button>
        </section>

        <div className="capture-host" aria-hidden="true">
          <SurveySheets
            sheetRef={sheetRef}
            customerName={customerName}
            birthDate={birthDate}
            occupation={occupation}
            advisorName={advisorName}
            questions={activeQuestions}
            answers={answers}
            extras={extras}
            medicalBase={medicalBase}
            medicalItems={medicalItems}
          />
        </div>
      </div>
    </main>
  )
}

function QuestionEditor({
  questions,
  onUpdate,
  onReset,
}: {
  questions: Question[]
  onUpdate: (id: string, patch: Partial<Question>) => void
  onReset: () => void
}) {
  return (
    <div className="editor-box">
      <div className="editor-head">
        <div>
          <strong>기본 9문항 수정</strong>
          <p>질문과 선택지는 수정할 수 있고, 초기화하면 기본 문항으로 돌아갑니다.</p>
        </div>
        <button type="button" className="ghost-button" onClick={onReset}>초기화</button>
      </div>
      <div className="question-edit-stack">
        {questions.map((question, index) => (
          <div key={question.id} className="question-edit-row">
            <label>
              <span>{index + 1}번 질문</span>
              <input value={question.title} onChange={(event) => onUpdate(question.id, { title: event.target.value })} />
            </label>
            <label>
              <span>선택지</span>
              <input
                value={question.options.join(", ")}
                onChange={(event) =>
                  onUpdate(question.id, {
                    options: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                  })
                }
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

function SurveySheets({
  sheetRef,
  customerName,
  birthDate,
  occupation,
  advisorName,
  questions,
  answers,
  extras,
  medicalBase,
  medicalItems,
}: {
  sheetRef: React.RefObject<HTMLDivElement | null>
  customerName: string
  birthDate: string
  occupation: string
  advisorName: string
  questions: Question[]
  answers: SurveyState
  extras: Record<string, string>
  medicalBase: Record<string, string>
  medicalItems: string[]
}) {
  const hasMedicalPage = hasMedicalDisclosure(medicalBase, medicalItems)
  const totalPages = hasMedicalPage ? 2 : 1

  return (
    <div ref={sheetRef} className="capture-stack">
      <SheetPage page="1" totalPages={totalPages}>
        <SheetHeader customerName={customerName} birthDate={birthDate} occupation={occupation} />
        <div className="sheet-question-grid">
          {questions.map((question, index) => (
            <SheetQuestion key={question.id} number={index + 1} question={question} answers={answers} extras={extras} />
          ))}
        </div>
        <ConsentBox />
        <Signature customerName={customerName} advisorName={advisorName} />
      </SheetPage>

      {hasMedicalPage && (
        <SheetPage page="2" totalPages={totalPages}>
          <SheetHeader customerName={customerName} birthDate={birthDate} occupation={occupation} compact />
          <div className="section-label">병력고지 추가사항</div>
          <div className="medical-sheet-grid readonly">
            {MEDICAL_ROWS.map((label) => (
              <div key={label}>
                <strong>{label}</strong>
                <span>{medicalBase[`${label}:yn`] || "-"}</span>
                <em>{medicalBase[`${label}:memo`] || "-"}</em>
              </div>
            ))}
          </div>

          <div className="section-label">추가 입력 병력사항</div>
          <div className="medical-sheet-list">
            {medicalItems.length > 0 ? medicalItems.map((item, index) => <div key={`${item}-${index}`}>{index + 1}. {item}</div>) : <div>추가 병력사항 없음</div>}
          </div>
          <ConsentBox />
          <Signature customerName={customerName} advisorName={advisorName} />
        </SheetPage>
      )}
    </div>
  )
}

function SheetPage({ children, page, totalPages }: { children: React.ReactNode; page: string; totalPages: number }) {
  return (
    <div className="sheet-page">
      <div className="corner left" />
      <div className="corner right" />
      {children}
      <div className="page-count">{page} / {totalPages}</div>
    </div>
  )
}

function SheetHeader({ customerName, birthDate, occupation, compact = false }: { customerName: string; birthDate: string; occupation: string; compact?: boolean }) {
  return (
    <header className={compact ? "sheet-header compact" : "sheet-header"}>
      <div>
        <h2>내보험 바로알기 캠페인</h2>
        <p>고객의 보험 현황과 상담 우선순위를 확인하기 위한 기초 상담지입니다.</p>
      </div>
      <div className="sheet-info">
        <span>고객명 <b>{customerName || "-"}</b></span>
        <span>생년월일 <b>{birthDate || "-"}</b></span>
        <span>직업 <b>{occupation || "-"}</b></span>
        <span>작성일 <b>{todayText}</b></span>
      </div>
    </header>
  )
}

function SheetQuestion({ number, question, answers, extras }: { number: number; question: Question; answers: SurveyState; extras: Record<string, string> }) {
  const selected = answers[question.id] || []
  return (
    <div className="sheet-question">
      <strong>{number}. {question.title}</strong>
      <div>
        {question.options.map((option) => (
          <span key={option} className={selected.includes(option) ? "selected" : ""}>
            {selected.includes(option) ? "✓ " : "□ "}{option}
          </span>
        ))}
      </div>
      {question.extra && extras[question.id] && <em>기타: {extras[question.id]}</em>}
    </div>
  )
}

function ConsentBox() {
  return (
    <div className="consent-box">
      고객의 정보는 상담 이외의 용도로 사용하지 않습니다. 개인정보 수집 및 상담 활용에 동의합니다.
    </div>
  )
}

function Signature({ customerName, advisorName }: { customerName: string; advisorName: string }) {
  return (
    <div className="signature">
      <div>
        <strong>고객 서명</strong>
        <span>{customerName || ""}</span>
      </div>
      <div>
        <strong>담당자 서명</strong>
        <span>{advisorName || ""}</span>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}

function QuestionCard({
  number,
  question,
  selected,
  extra,
  onExtra,
  onToggle,
}: {
  number: number
  question: Question
  selected: string[]
  extra: string
  onExtra: (value: string) => void
  onToggle: (option: string) => void
}) {
  return (
    <div className="question-card">
      <p>{number}. {question.title}</p>
      <div className="option-grid">
        {question.options.map((option) => {
          const checked = selected.includes(option)
          return (
            <label key={option} className={checked ? "option active" : "option"}>
              <input type="checkbox" checked={checked} onChange={() => onToggle(option)} />
              <span>{option}</span>
            </label>
          )
        })}
      </div>
      {question.extra && (
        <input className="extra-input" value={extra} onChange={(event) => onExtra(event.target.value)} placeholder="기타 내용을 입력하세요" />
      )}
    </div>
  )
}

function hasMedicalDisclosure(medicalBase: Record<string, string>, medicalItems: string[]) {
  return medicalItems.length > 0 || Object.values(medicalBase).some((value) => value.trim().length > 0)
}

function normalizeQuestions(value: unknown): Question[] {
  const saved = Array.isArray(value) ? value : []
  return DEFAULT_QUESTIONS.map((base, index) => {
    const item = saved[index] as Partial<Question> | undefined
    const options = Array.isArray(item?.options) ? item.options.map(String).map((option) => option.trim()).filter(Boolean) : []
    return {
      ...base,
      title: typeof item?.title === "string" && item.title.trim() ? item.title : base.title,
      options: options.length > 0 ? options : base.options,
      extra: typeof item?.extra === "boolean" ? item.extra : base.extra,
      targetPage: 1,
    }
  })
}

function loadQuestions() {
  if (typeof window === "undefined") return DEFAULT_QUESTIONS
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : null
    return normalizeQuestions(parsed)
  } catch {
    return DEFAULT_QUESTIONS
  }
}

function saveQuestions(questions: Question[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeQuestions(questions)))
}

const styles = `
.survey-page{min-height:100vh;background:#e8eef6;padding:22px;font-family:'Pretendard Variable','Pretendard','Apple SD Gothic Neo',Arial,sans-serif;color:#17243a}
.survey-shell{max-width:1120px;margin:0 auto;display:grid;gap:14px}
.survey-header{display:flex;justify-content:space-between;align-items:center;gap:12px}
.survey-header h1{margin:0;font-size:25px;font-weight:950}
.survey-header p,.step-head p,.helper,.editor-head p{margin:4px 0 0;color:#64748b;font-size:13px;font-weight:800;line-height:1.5}
.panel{background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:18px;box-shadow:0 16px 38px rgba(15,23,42,.08)}
.panel-title{font-size:17px;font-weight:950;color:#17243a}
.input-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}
.field{display:grid;gap:6px}
.field span{font-size:13px;font-weight:950;color:#334155}
.field input,.extra-input,.medical-add input,.medical-base-row input,.medical-base-row select{height:42px;border:1px solid #cbd5e1;border-radius:12px;padding:0 12px;font-size:15px;font-weight:800;color:#0f172a;outline:none;background:#fff}
.step-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.mobile-copy,.mobile-question-flow{display:none}
.desktop-question-stack{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}
.progress{height:9px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin:14px 0}
.progress span{display:block;height:100%;background:linear-gradient(90deg,#1d4ed8,#0f766e);border-radius:999px}
.question-stack{display:grid;gap:12px}
.question-card{border:1px solid #dbe4ef;border-radius:16px;padding:16px;background:#f8fafc}
.question-card p{margin:0 0 12px;font-size:17px;line-height:1.45;font-weight:950;color:#17243a}
.option-grid{display:flex;flex-wrap:wrap;gap:9px}
.option{min-height:42px;border:1.5px solid #cbd5e1;border-radius:12px;background:#fff;padding:8px 12px;display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:900;color:#334155;cursor:pointer}
.option input{width:18px;height:18px;margin:0;accent-color:#2563eb;flex:0 0 auto}
.option span{line-height:1.35}
.option.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}
.extra-input{margin-top:10px;width:100%}
.nav-actions{display:flex;justify-content:space-between;gap:10px;margin-top:14px}
.primary-button,.ghost-button,.dark-button{min-height:42px;border:none;border-radius:12px;padding:0 16px;font-size:14px;font-weight:950;cursor:pointer}
.primary-button{background:#2563eb;color:#fff}
.ghost-button{background:#fff;color:#17243a;border:1px solid #cbd5e1}
.dark-button{background:#17243a;color:#fff}
.ghost-button:disabled,.primary-button:disabled{opacity:.45;cursor:not-allowed}
.editor-box{border:1px solid #dbe4ef;border-radius:16px;background:#fff;padding:14px;margin-top:14px}
.editor-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}
.editor-head strong{font-size:15px;font-weight:950;color:#17243a}
.question-edit-stack{display:grid;gap:10px}
.question-edit-row{display:grid;grid-template-columns:1.2fr 1fr;gap:10px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:12px}
.question-edit-row label{display:grid;gap:6px}
.question-edit-row span{font-size:12px;font-weight:950;color:#64748b}
.question-edit-row input{height:40px;border:1px solid #cbd5e1;border-radius:10px;padding:0 10px;font-size:14px;font-weight:800;color:#17243a}
.medical-base-form{display:grid;gap:9px;margin-top:12px}
.medical-base-row{display:grid;grid-template-columns:190px 110px 1fr;gap:10px;align-items:center;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:10px}
.medical-base-row strong{font-size:14px;font-weight:950;color:#334155}
.medical-add{display:grid;grid-template-columns:1fr 100px;gap:10px;margin-top:12px}
.medical-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.medical-list span{display:inline-flex;gap:8px;align-items:center;background:#f1f5f9;border-radius:999px;padding:7px 8px 7px 12px;font-size:13px;font-weight:850;color:#334155}
.medical-list button{border:none;background:#fee2e2;color:#b91c1c;border-radius:8px;padding:5px 8px;font-size:12px;font-weight:900;cursor:pointer}
.medical-list em{color:#94a3b8;font-size:13px;font-style:normal;font-weight:800}
.action-panel{display:flex;justify-content:flex-end}
.save-button{min-width:180px}
.capture-host{position:absolute;left:0;top:0;width:940px;pointer-events:none;opacity:1;transform:translateX(-1200px);z-index:-1}
.capture-stack{width:940px;display:grid;gap:24px;background:#eef3f8;padding:0}
.sheet-page{position:relative;overflow:hidden;width:940px;min-height:1329px;background:linear-gradient(180deg,rgba(232,244,255,.72) 0%,rgba(246,251,255,.88) 42%,rgba(238,247,255,.78) 100%);border:1px solid #9fb4cc;padding:56px 56px 50px;box-sizing:border-box;box-shadow:0 20px 60px rgba(15,23,42,.10)}
.sheet-page:before{content:"";position:absolute;inset:18px;border:1px solid rgba(148,163,184,.55);border-radius:2px;pointer-events:none}
.sheet-page:after{content:"";position:absolute;left:28px;right:28px;top:126px;height:1px;background:linear-gradient(90deg,transparent,#b8cbe0,transparent);pointer-events:none}
.corner.left{position:absolute;left:22px;top:22px;width:58px;height:58px;background:#263446;border-radius:0 0 12px 0}
.corner.right{position:absolute;right:22px;bottom:22px;width:58px;height:58px;background:#263446;border-radius:12px 0 0 0}
.sheet-header{display:grid;grid-template-columns:1fr 310px;gap:20px;align-items:start;margin-bottom:14px}
.sheet-header>div:first-child{padding-left:48px}
.sheet-header h2{margin:0;color:#263446;font-size:32px;font-weight:950;letter-spacing:-.5px}
.sheet-header p{margin:8px 0 0;color:#64748b;font-size:15px;font-weight:850}
.sheet-header.compact h2{font-size:29px}
.sheet-info{display:grid;gap:7px;background:rgba(255,255,255,.72);border:1px solid #c7d8ea;border-radius:14px;padding:13px;box-shadow:0 8px 18px rgba(37,99,235,.06)}
.sheet-info span{display:flex;justify-content:space-between;font-size:13px;font-weight:850;color:#64748b}
.sheet-info b{color:#17243a}
.sheet-question-grid{display:grid;gap:9px}
.sheet-question{border-bottom:1px solid #d3e1ef;padding:8px 10px 10px;border-radius:10px;background:rgba(255,255,255,.50)}
.sheet-question strong{display:block;font-size:17px;line-height:1.38;color:#17243a;font-weight:950;margin-bottom:8px}
.sheet-question div{display:flex;flex-wrap:wrap;gap:6px}
.sheet-question span{border:1px solid #bed0e3;border-radius:9px;padding:5px 8px;font-size:13.5px;font-weight:850;color:#475569;background:rgba(255,255,255,.78)}
.sheet-question span.selected{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}
.sheet-question em{display:block;margin-top:6px;color:#0f766e;font-size:13.5px;font-weight:900;font-style:normal}
.section-label{display:inline-flex;margin:12px 0 9px;background:#17243a;color:#ffd72e;border-radius:10px;padding:8px 12px;font-size:15px;font-weight:950}
.medical-sheet-list{display:grid;gap:7px;border:1px solid #c7d8ea;border-radius:12px;background:rgba(255,255,255,.60);padding:12px;margin-bottom:6px;color:#334155;font-size:14px;font-weight:850;line-height:1.5}
.medical-sheet-grid{display:grid;gap:8px}
.medical-sheet-grid>div{display:grid;grid-template-columns:190px 90px 1fr;gap:8px;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px}
.medical-sheet-grid strong{font-size:14px;color:#334155}
.medical-sheet-grid span{font-size:14px;font-weight:950;color:#1d4ed8}
.medical-sheet-grid em{font-size:14px;font-style:normal;font-weight:850;color:#475569}
.consent-box{margin:18px auto 12px;max-width:620px;background:#ffe066;color:#1f2937;padding:12px 18px;text-align:center;font-size:14px;line-height:1.55;font-weight:950;border-radius:2px;border:1px solid #eab308}
.signature{width:560px;margin:0 auto;border:1px solid #94a3b8;display:grid;grid-template-columns:1fr 1fr;background:#fff}
.signature div{min-height:78px;display:grid;grid-template-rows:32px 1fr;text-align:center;border-right:1px solid #cbd5e1}
.signature div:last-child{border-right:none}
.signature strong{display:flex;align-items:center;justify-content:center;background:#475569;color:#fff;font-size:15px}
.signature span{display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:950;color:#0f172a}
.page-count{position:absolute;right:42px;bottom:42px;color:#cbd5e1;font-size:12px;font-weight:900;z-index:2}
@media (max-width: 820px){
  .survey-page{padding:12px;background:#f1f5f9}
  .survey-shell{max-width:100%}
  .survey-header{align-items:flex-start}
  .survey-header h1{font-size:22px}
  .survey-header p{font-size:12px}
  .panel{padding:14px;border-radius:15px}
  .input-grid,.question-edit-row{grid-template-columns:1fr}
  .desktop-copy,.desktop-question-stack{display:none}
  .mobile-copy,.mobile-question-flow{display:block}
  .step-head{align-items:center}
  .question-card p{font-size:17px}
  .option{width:100%;justify-content:flex-start;min-height:46px}
  .medical-base-row{grid-template-columns:1fr}
  .medical-add{grid-template-columns:1fr}
  .action-panel{position:sticky;bottom:0;background:linear-gradient(180deg,rgba(241,245,249,0),#f1f5f9 26%);padding:24px 0 4px;z-index:5}
  .save-button{width:100%}
}
`
