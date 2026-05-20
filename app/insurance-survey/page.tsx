"use client"

import { useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"

type SurveyState = Record<string, string[]>
type Question = {
  id: string
  title: string
  options: string[]
  extra?: boolean
  custom?: boolean
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
    targetPage: 2,
  },
  {
    id: "q7",
    title: "가장 관심 있는 금전적인 부분은 무엇인가요? (중복 선택 가능)",
    options: ["대출자금", "사업자금", "은퇴자금", "노후 생활비", "부채상환", "교육자금"],
    targetPage: 2,
  },
  {
    id: "q8",
    title: "노후 의료비와 생활비는 매월 어느 정도 필요하다고 생각하시나요?",
    options: ["100만원 이하", "100~200만원", "200~300만원", "300~400만원", "400만원 이상"],
    targetPage: 2,
  },
  {
    id: "q9",
    title: "보험이나 저축에 대한 의사결정은 누가 주로 하시나요?",
    options: ["본인", "배우자", "부모님", "자녀", "기타"],
    extra: true,
    targetPage: 2,
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
  const [newQuestionTitle, setNewQuestionTitle] = useState("")
  const [newQuestionOptions, setNewQuestionOptions] = useState("예, 아니오")

  const activeQuestions = useMemo(() => questions, [questions])
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

  const addMedicalItem = () => {
    const value = medicalDraft.trim()
    if (!value) return
    setMedicalItems((prev) => [...prev, value])
    setMedicalDraft("")
  }

  const addQuestion = () => {
    const title = newQuestionTitle.trim()
    const options = newQuestionOptions.split(",").map((item) => item.trim()).filter(Boolean)
    if (!title || options.length === 0) return
    const next = [
      ...questions,
      { id: `custom-${Date.now()}`, title, options, custom: true, targetPage: 2 as const },
    ]
    saveQuestions(next)
    setQuestions(next)
    setNewQuestionTitle("")
    setNewQuestionOptions("예, 아니오")
  }

  const deleteQuestion = (id: string) => {
    const next = questions.filter((question) => question.id !== id)
    saveQuestions(next)
    setQuestions(next.length > 0 ? next : DEFAULT_QUESTIONS)
    setAnswers((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
    setStep(0)
  }

  const resetQuestions = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setQuestions(DEFAULT_QUESTIONS)
    setAnswers({})
    setExtras({})
    setStep(0)
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
      const ratio = (IMAGE_WIDTH - IMAGE_PADDING * 2) / captured.width
      const drawWidth = captured.width * ratio
      const drawHeight = captured.height * ratio

      canvas.width = IMAGE_WIDTH
      canvas.height = Math.ceil(drawHeight + IMAGE_PADDING * 2)

      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("이미지 저장 준비에 실패했습니다.")

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(captured, IMAGE_PADDING, IMAGE_PADDING, drawWidth, drawHeight)

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

  return (
    <main className="survey-page">
      <style>{styles}</style>

      <div className="survey-shell">
        <header className="survey-header">
          <div>
            <h1>내보험 바로알기</h1>
            <p>모바일에서는 질문 2개씩 진행하고, 마지막에 결과지를 이미지로 저장합니다.</p>
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
              <div className="panel-title">질문 진행</div>
              <p>{step + 1} / {totalSteps} 단계 · 현재 화면에는 2개 질문만 표시됩니다.</p>
            </div>
            <button type="button" className="ghost-button" onClick={() => setEditingQuestions((prev) => !prev)}>
              질문 수정
            </button>
          </div>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>

          {editingQuestions && (
            <div className="editor-box">
              <div className="editor-actions">
                <button type="button" className="ghost-button" onClick={resetQuestions}>초기화</button>
              </div>
              <div className="editor-grid">
                <Field label="추가 질문" value={newQuestionTitle} onChange={setNewQuestionTitle} placeholder="예: 최근 3개월 내 검사 소견이 있나요?" />
                <Field label="선택지" value={newQuestionOptions} onChange={setNewQuestionOptions} placeholder="쉼표로 구분" />
                <button type="button" className="primary-button" onClick={addQuestion}>추가</button>
              </div>
              <div className="question-list">
                {questions.map((question, index) => (
                  <div key={question.id} className="question-row">
                    <span>{index + 1}. {question.title}</span>
                    <button type="button" onClick={() => deleteQuestion(question.id)}>삭제</button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
        </section>

        <section className="panel">
          <div className="panel-title">병력사항 추가</div>
          <p className="helper">하나씩 입력하면 결과지 2번째 장에 “병력고지 추가사항”으로 표시됩니다.</p>
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

        <section className="panel preview-panel">
          <div className="step-head">
            <div>
              <div className="panel-title">저장 미리보기</div>
              <p>아래 결과지는 모바일 화면에 맞춰 축소해서 보여주고, 저장 시 원본 비율로 저장됩니다.</p>
            </div>
            <button type="button" className="primary-button" onClick={captureAsImage} disabled={saving}>{saving ? "저장 중..." : "이미지 저장"}</button>
          </div>
          <div className="preview-scroll">
            <SurveySheets
              sheetRef={sheetRef}
              customerName={customerName}
              birthDate={birthDate}
              occupation={occupation}
              advisorName={advisorName}
              questions={questions}
              answers={answers}
              extras={extras}
              medicalBase={medicalBase}
              setMedicalBase={setMedicalBase}
              medicalItems={medicalItems}
            />
          </div>
        </section>
      </div>
    </main>
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
  setMedicalBase,
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
  setMedicalBase: (value: Record<string, string>) => void
  medicalItems: string[]
}) {
  const pageOne = questions.filter((question) => question.targetPage !== 2 && !question.custom)
  const customQuestions = questions.filter((question) => question.custom)
  const pageTwoBase = questions.filter((question) => question.targetPage === 2 && !question.custom)
  const pageTwo = [...customQuestions, ...pageTwoBase]

  return (
    <div ref={sheetRef} className="capture-stack">
      <SheetPage page="1">
        <SheetHeader customerName={customerName} birthDate={birthDate} occupation={occupation} />
        <div className="sheet-question-grid">
          {pageOne.map((question, index) => (
            <SheetQuestion key={question.id} number={index + 1} question={question} answers={answers} extras={extras} />
          ))}
        </div>
        <ConsentBox />
        <Signature customerName={customerName} advisorName={advisorName} />
      </SheetPage>

      <SheetPage page="2">
        <SheetHeader customerName={customerName} birthDate={birthDate} occupation={occupation} compact />
        <div className="section-label">추가 질문 및 상담 확인사항</div>
        <div className="sheet-question-grid compact">
          {pageTwo.map((question, index) => (
            <SheetQuestion key={question.id} number={index + 1} question={question} answers={answers} extras={extras} />
          ))}
        </div>

        <div className="section-label">병력고지 추가사항</div>
        <div className="medical-sheet-list">
          {medicalItems.length > 0 ? medicalItems.map((item, index) => <div key={`${item}-${index}`}>{index + 1}. {item}</div>) : <div>추가 병력사항 없음</div>}
        </div>

        <div className="section-label">고지의무 기본 확인</div>
        <div className="medical-sheet-grid">
          {MEDICAL_ROWS.map((label) => (
            <div key={label}>
              <strong>{label}</strong>
              <select
                value={medicalBase[`${label}:yn`] || ""}
                onChange={(event) => setMedicalBase({ ...medicalBase, [`${label}:yn`]: event.target.value })}
              >
                <option value="">선택</option>
                <option value="있음">있음</option>
                <option value="없음">없음</option>
              </select>
              <input
                value={medicalBase[`${label}:memo`] || ""}
                onChange={(event) => setMedicalBase({ ...medicalBase, [`${label}:memo`]: event.target.value })}
                placeholder="질병명 / 치료내용"
              />
            </div>
          ))}
        </div>
        <ConsentBox />
        <Signature customerName={customerName} advisorName={advisorName} />
      </SheetPage>
    </div>
  )
}

function SheetPage({ children, page }: { children: React.ReactNode; page: string }) {
  return (
    <div className="sheet-page">
      <div className="corner left" />
      <div className="corner right" />
      {children}
      <div className="page-count">{page} / 2</div>
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
            <button key={option} onClick={() => onToggle(option)} type="button" className={checked ? "option active" : "option"}>
              <span>{checked ? "✓" : ""}</span>
              {option}
            </button>
          )
        })}
      </div>
      {question.extra && (
        <input className="extra-input" value={extra} onChange={(event) => onExtra(event.target.value)} placeholder="기타 내용을 입력하세요" />
      )}
    </div>
  )
}

function loadQuestions() {
  if (typeof window === "undefined") return DEFAULT_QUESTIONS
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : null
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_QUESTIONS
  } catch {
    return DEFAULT_QUESTIONS
  }
}

function saveQuestions(questions: Question[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(questions))
}

const styles = `
.survey-page{min-height:100vh;background:#e8eef6;padding:22px;font-family:'Pretendard Variable','Pretendard','Apple SD Gothic Neo',Arial,sans-serif;color:#17243a}
.survey-shell{max-width:980px;margin:0 auto;display:grid;gap:14px}
.survey-header{display:flex;justify-content:space-between;align-items:center;gap:12px}
.survey-header h1{margin:0;font-size:25px;font-weight:950}
.survey-header p,.step-head p,.helper{margin:4px 0 0;color:#64748b;font-size:13px;font-weight:800;line-height:1.5}
.panel{background:#fff;border:1px solid #dbe4ef;border-radius:18px;padding:18px;box-shadow:0 16px 38px rgba(15,23,42,.08)}
.panel-title{font-size:17px;font-weight:950;color:#17243a}
.input-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}
.field{display:grid;gap:6px}
.field span{font-size:13px;font-weight:950;color:#334155}
.field input,.extra-input,.medical-add input,.medical-sheet-grid input,.medical-sheet-grid select{height:42px;border:1px solid #cbd5e1;border-radius:12px;padding:0 12px;font-size:15px;font-weight:800;color:#0f172a;outline:none;background:#fff}
.step-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.progress{height:9px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin:14px 0}
.progress span{display:block;height:100%;background:linear-gradient(90deg,#1d4ed8,#0f766e);border-radius:999px}
.question-stack{display:grid;gap:12px}
.question-card{border:1px solid #dbe4ef;border-radius:16px;padding:16px;background:#f8fafc}
.question-card p{margin:0 0 12px;font-size:18px;line-height:1.45;font-weight:950;color:#17243a}
.option-grid{display:flex;flex-wrap:wrap;gap:9px}
.option{min-height:42px;border:1.5px solid #cbd5e1;border-radius:12px;background:#fff;padding:8px 12px;display:inline-flex;align-items:center;gap:7px;font-size:15px;font-weight:900;color:#334155;cursor:pointer}
.option span{width:19px;height:19px;border:1px solid #94a3b8;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;color:#2563eb;font-size:13px;background:#fff}
.option.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}
.option.active span{border-color:#2563eb;background:#dbeafe}
.extra-input{margin-top:10px;width:100%}
.nav-actions{display:flex;justify-content:space-between;gap:10px;margin-top:14px}
.primary-button,.ghost-button,.dark-button{min-height:42px;border:none;border-radius:12px;padding:0 16px;font-size:14px;font-weight:950;cursor:pointer}
.primary-button{background:#2563eb;color:#fff}
.ghost-button{background:#fff;color:#17243a;border:1px solid #cbd5e1}
.dark-button{background:#17243a;color:#fff}
.ghost-button:disabled{opacity:.45;cursor:not-allowed}
.editor-box{border:1px solid #dbe4ef;border-radius:16px;background:#fff;padding:14px;margin-bottom:14px}
.editor-actions{display:flex;justify-content:flex-end;margin-bottom:10px}
.editor-grid{display:grid;grid-template-columns:1.2fr 1fr 100px;gap:10px;align-items:end}
.question-list{display:grid;gap:7px;margin-top:12px;max-height:220px;overflow:auto}
.question-row{display:flex;justify-content:space-between;gap:10px;align-items:center;background:#f8fafc;border-radius:10px;padding:9px 10px;font-size:13px;font-weight:800;color:#334155}
.question-row button,.medical-list button{border:none;background:#fee2e2;color:#b91c1c;border-radius:8px;padding:5px 8px;font-size:12px;font-weight:900;cursor:pointer}
.medical-add{display:grid;grid-template-columns:1fr 100px;gap:10px;margin-top:12px}
.medical-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.medical-list span{display:inline-flex;gap:8px;align-items:center;background:#f1f5f9;border-radius:999px;padding:7px 8px 7px 12px;font-size:13px;font-weight:850;color:#334155}
.medical-list em{color:#94a3b8;font-size:13px;font-style:normal;font-weight:800}
.preview-scroll{overflow:auto;border-radius:14px;background:#eef3f8;padding:14px;margin-top:12px}
.capture-stack{width:940px;display:grid;gap:24px;background:#eef3f8;padding:0}
.sheet-page{position:relative;overflow:hidden;width:940px;min-height:1329px;background:#fff;border:1px solid #64748b;padding:58px 54px 46px;box-sizing:border-box;box-shadow:0 20px 60px rgba(15,23,42,.12)}
.corner.left{position:absolute;left:0;top:0;width:120px;height:120px;background:#263446;clip-path:polygon(0 0,100% 0,0 100%)}
.corner.right{position:absolute;right:0;bottom:0;width:120px;height:120px;background:#263446;clip-path:polygon(100% 0,100% 100%,0 100%)}
.sheet-header{display:grid;grid-template-columns:1fr 310px;gap:20px;align-items:start;margin-bottom:18px}
.sheet-header h2{margin:0;color:#263446;font-size:34px;font-weight:950;letter-spacing:-.5px}
.sheet-header p{margin:8px 0 0;color:#64748b;font-size:15px;font-weight:850}
.sheet-header.compact h2{font-size:29px}
.sheet-info{display:grid;gap:7px;background:#f8fafc;border:1px solid #dbe4ef;border-radius:14px;padding:13px}
.sheet-info span{display:flex;justify-content:space-between;font-size:13px;font-weight:850;color:#64748b}
.sheet-info b{color:#17243a}
.sheet-question-grid{display:grid;gap:11px}
.sheet-question-grid.compact{gap:9px}
.sheet-question{border-bottom:1px solid #e2e8f0;padding-bottom:10px}
.sheet-question strong{display:block;font-size:16px;line-height:1.45;color:#1f2937;font-weight:950;margin-bottom:8px}
.sheet-question div{display:flex;flex-wrap:wrap;gap:7px}
.sheet-question span{border:1px solid #cbd5e1;border-radius:9px;padding:5px 8px;font-size:13px;font-weight:850;color:#475569}
.sheet-question span.selected{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}
.sheet-question em{display:block;margin-top:7px;color:#0f766e;font-size:13px;font-weight:900;font-style:normal}
.section-label{display:inline-flex;margin:12px 0 9px;background:#17243a;color:#ffd72e;border-radius:10px;padding:8px 12px;font-size:15px;font-weight:950}
.medical-sheet-list{display:grid;gap:7px;border:1px solid #dbe4ef;border-radius:12px;background:#f8fafc;padding:12px;margin-bottom:6px;color:#334155;font-size:14px;font-weight:850;line-height:1.5}
.medical-sheet-grid{display:grid;gap:8px}
.medical-sheet-grid>div{display:grid;grid-template-columns:170px 110px 1fr;gap:8px;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px}
.medical-sheet-grid strong{font-size:14px;color:#334155}
.medical-sheet-grid input,.medical-sheet-grid select{height:34px;border-radius:8px;font-size:13px}
.consent-box{margin:18px auto 14px;max-width:620px;background:#ffd72e;color:#1f2937;padding:13px 18px;text-align:center;font-size:15px;line-height:1.55;font-weight:950}
.signature{width:560px;margin:0 auto;border:1px solid #64748b;display:grid;grid-template-columns:1fr 1fr}
.signature div{min-height:88px;display:grid;grid-template-rows:34px 1fr;text-align:center;border-right:1px solid #cbd5e1}
.signature div:last-child{border-right:none}
.signature strong{display:flex;align-items:center;justify-content:center;background:#475569;color:#fff;font-size:15px}
.signature span{display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:950;color:#0f172a}
.page-count{position:absolute;right:34px;bottom:22px;color:#94a3b8;font-size:12px;font-weight:900}
@media (max-width: 720px){
  .survey-page{padding:12px;background:#f1f5f9}
  .survey-header{align-items:flex-start}
  .survey-header h1{font-size:22px}
  .survey-header p{font-size:12px}
  .panel{padding:14px;border-radius:15px}
  .input-grid,.editor-grid{grid-template-columns:1fr}
  .step-head{align-items:center}
  .question-card p{font-size:17px}
  .option{width:100%;justify-content:flex-start;min-height:46px}
  .medical-add{grid-template-columns:1fr}
  .preview-panel{padding:12px}
  .preview-scroll{padding:10px}
  .capture-stack{transform:scale(.36);transform-origin:top left;width:940px;margin-bottom:-1680px}
}
@media (min-width: 721px) and (max-width: 1040px){
  .capture-stack{transform:scale(.72);transform-origin:top left;margin-bottom:-740px}
}
`
