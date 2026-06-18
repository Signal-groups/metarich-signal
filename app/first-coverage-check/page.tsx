"use client"

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Activity, ArrowLeft, Brain, FolderOpen, HeartPulse, Printer, Save, ShieldCheck, Sparkles, Stethoscope, UserRound, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { ensureUserProfile } from "../../lib/userProfile"
import { isApprovedUser, normalizeRole } from "../../lib/roles"

type StepId = "intro" | "customer" | "cancer" | "brain" | "heart" | "surgery" | "care" | "result"

type FormState = {
  customerName: string
  age: number
  gender: "male" | "female"
  monthlyLivingCost: number
  hasActualLoss: boolean
  actualLossCoverageRate: number
  cancerDiagnosis: number
  similarCancer: number
  cancerTreatment: number
  targetCancer: number
  radiationCancer: number
  brainScope: "hemorrhage" | "stroke" | "vascular"
  brainDiagnosis: number
  brainSurgery: number
  brainTreatment: number
  heartScope: "ami" | "ischemic" | "cardio"
  heartDiagnosis: number
  heartSurgery: number
  heartTreatment: number
  diseaseSurgery: number
  majorSurgery: number
  nsurgery: number
  careDailyCost: number
  cancerCareDays: number
  brainCareDays: number
  heartCareDays: number
  careBenefitDaily: number
}

type SavedCase = {
  id: string
  name: string
  savedAt: string
  form: FormState
}

const steps: { id: StepId; label: string; icon: any }[] = [
  { id: "intro", label: "시작", icon: Sparkles },
  { id: "customer", label: "고객 정보", icon: UserRound },
  { id: "cancer", label: "암", icon: ShieldCheck },
  { id: "brain", label: "뇌", icon: Brain },
  { id: "heart", label: "심장", icon: HeartPulse },
  { id: "surgery", label: "수술비", icon: Stethoscope },
  { id: "care", label: "간병비", icon: Activity },
  { id: "result", label: "결과", icon: Sparkles },
]

const initialForm: FormState = {
  customerName: "",
  age: 45,
  gender: "male",
  monthlyLivingCost: 300,
  hasActualLoss: true,
  actualLossCoverageRate: 70,
  cancerDiagnosis: 3000,
  similarCancer: 300,
  cancerTreatment: 300,
  targetCancer: 0,
  radiationCancer: 0,
  brainScope: "stroke",
  brainDiagnosis: 1000,
  brainSurgery: 300,
  brainTreatment: 0,
  heartScope: "ischemic",
  heartDiagnosis: 1000,
  heartSurgery: 300,
  heartTreatment: 0,
  diseaseSurgery: 30,
  majorSurgery: 300,
  nsurgery: 0,
  careDailyCost: 15,
  cancerCareDays: 14,
  brainCareDays: 60,
  heartCareDays: 21,
  careBenefitDaily: 0,
}

const clampRate = (value: number) => Math.max(0, Math.min(100, Math.round(value)))
const man = (value: number) => `${Math.max(0, Math.round(value)).toLocaleString("ko-KR")}만원`

function status(rate: number) {
  if (rate >= 70) return { label: "안정", color: "#0f8a5f", bg: "#e8f8f1", border: "#83d9b3" }
  if (rate >= 40) return { label: "보완 필요", color: "#b45309", bg: "#fff7e6", border: "#f5c76b" }
  return { label: "우선 점검", color: "#c2413b", bg: "#fff0ef", border: "#f5a8a3" }
}

function scopeScore(scope: FormState["brainScope"] | FormState["heartScope"]) {
  if (scope === "vascular" || scope === "cardio") return 100
  if (scope === "stroke" || scope === "ischemic") return 70
  return 35
}

export default function FirstCoverageCheckPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [lockedReason, setLockedReason] = useState("")
  const [profileId, setProfileId] = useState("")
  const [active, setActive] = useState<StepId>("intro")
  const [form, setForm] = useState<FormState>(initialForm)
  const [savedCases, setSavedCases] = useState<SavedCase[]>([])
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    let alive = true
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace("/login?redirectTo=/first-coverage-check")
        return
      }

      let { data: profile } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle()
      if (!profile) profile = await ensureUserProfile(supabase, session.user)

      const role = normalizeRole(profile)
      const approved = isApprovedUser(profile)
      const { data: setting } = await supabase.from("team_settings").select("value").eq("key", "show_first_coverage_check").maybeSingle()
      const opened = setting?.value === "true"
      const canUse = role === "master" || (approved && opened)

      if (!alive) return
      setProfileId(profile?.id || session.user.id)
      setAllowed(canUse)
      setLockedReason(!approved ? "관리자 승인 후 사용할 수 있습니다." : "마스터가 대면상담 탭에서 기능을 오픈하면 사용할 수 있습니다.")
      setChecking(false)
    }
    checkAccess()
    return () => { alive = false }
  }, [router])

  const result = useMemo(() => {
    const livingNeed = form.monthlyLivingCost * 12
    const cancerTreatmentNeed = 3500
    const cancerCareNeed = form.careDailyCost * form.cancerCareDays
    const cancerReady = form.cancerDiagnosis + form.cancerTreatment + form.targetCancer + form.radiationCancer
    const cancerActualLoss = form.hasActualLoss ? cancerTreatmentNeed * (form.actualLossCoverageRate / 100) : 0
    const cancerNeed = livingNeed + cancerTreatmentNeed + cancerCareNeed

    const brainNeed = 4500
    const brainScope = scopeScore(form.brainScope)
    const brainReady = form.brainDiagnosis + form.brainSurgery + form.brainTreatment + (form.hasActualLoss ? 800 : 0)
    const brainRate = clampRate(((brainReady / brainNeed) * 70) + (brainScope * 0.3))

    const heartNeed = 3800
    const heartScope = scopeScore(form.heartScope)
    const heartReady = form.heartDiagnosis + form.heartSurgery + form.heartTreatment + (form.hasActualLoss ? 700 : 0)
    const heartRate = clampRate(((heartReady / heartNeed) * 70) + (heartScope * 0.3))

    const surgeryNeed = 900
    const surgeryReady = form.diseaseSurgery * 3 + form.majorSurgery + form.nsurgery + (form.hasActualLoss ? 300 : 0)

    const careNeed = form.careDailyCost * Math.max(form.cancerCareDays, form.brainCareDays, form.heartCareDays)
    const careReady = form.careBenefitDaily * Math.max(form.cancerCareDays, form.brainCareDays, form.heartCareDays)

    return {
      cancer: {
        title: "암",
        need: cancerNeed,
        ready: cancerReady + cancerActualLoss,
        rate: clampRate(((cancerReady + cancerActualLoss) / cancerNeed) * 100),
        gap: cancerNeed - (cancerReady + cancerActualLoss),
        note: "산정특례로 급여 부담은 줄어도 표적항암, 신약, 비급여 검사, 생활비 공백은 별도 준비가 필요합니다.",
      },
      brain: {
        title: "뇌",
        need: brainNeed,
        ready: brainReady,
        rate: brainRate,
        gap: brainNeed - brainReady,
        note: form.brainScope === "hemorrhage" ? "뇌출혈 중심 보장은 범위가 좁아 뇌졸중·뇌혈관 치료 공백을 확인해야 합니다." : "스텐트, 혈전용해, 개두술 등 실제 치료와 수술비 지급 범위를 확인합니다.",
      },
      heart: {
        title: "심장",
        need: heartNeed,
        ready: heartReady,
        rate: heartRate,
        gap: heartNeed - heartReady,
        note: form.heartScope === "ami" ? "급성심근경색 중심 보장은 허혈성·심혈관 시술 공백이 생길 수 있습니다." : "스텐트, 관상동맥우회술, 부정맥 시술에서 지급되는 보장을 확인합니다.",
      },
      surgery: {
        title: "수술비",
        need: surgeryNeed,
        ready: surgeryReady,
        rate: clampRate((surgeryReady / surgeryNeed) * 100),
        gap: surgeryNeed - surgeryReady,
        note: "다빈도 수술은 실손으로 일부 보완되지만 정액 수술비가 작으면 회복비와 비급여 부담이 남을 수 있습니다.",
      },
      care: {
        title: "간병비",
        need: careNeed,
        ready: careReady,
        rate: clampRate((careReady / (careNeed || 1)) * 100),
        gap: careNeed - careReady,
        note: "암·뇌·심장 수술 후 회복 기간에는 치료비와 별도로 간병 단가와 기간 부담을 확인해야 합니다.",
      },
    }
  }, [form])

  const resultList = Object.values(result)
  const averageRate = clampRate(resultList.reduce((sum, item) => sum + item.rate, 0) / resultList.length)
  const currentIndex = steps.findIndex((step) => step.id === active)
  const next = () => setActive(steps[Math.min(currentIndex + 1, steps.length - 1)].id)
  const prev = () => setActive(steps[Math.max(currentIndex - 1, 0)].id)
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))
  const storageKey = `first-coverage-check:${profileId || "local"}`

  useEffect(() => {
    if (!profileId) return
    try {
      const raw = localStorage.getItem(storageKey)
      setSavedCases(raw ? JSON.parse(raw) : [])
    } catch {
      setSavedCases([])
    }
  }, [profileId, storageKey])

  const persistCases = (items: SavedCase[]) => {
    setSavedCases(items)
    localStorage.setItem(storageKey, JSON.stringify(items))
  }

  const saveCase = () => {
    const saved: SavedCase = {
      id: `${Date.now()}`,
      name: form.customerName || "이름 없는 고객",
      savedAt: new Date().toISOString(),
      form,
    }
    persistCases([saved, ...savedCases].slice(0, 30))
    alert("현재 입력 내용과 결과가 저장되었습니다.")
  }

  const loadCase = (item: SavedCase) => {
    setForm(item.form)
    setActive("result")
    setShowSaved(false)
  }

  const printReport = () => {
    setActive("result")
    setTimeout(() => window.print(), 120)
  }

  const closeWindow = () => {
    window.close()
    setTimeout(() => {
      if (!window.closed) router.push("/dashboard")
    }, 150)
  }

  if (checking) return <CenterMessage title="권한 확인 중입니다" body="잠시만 기다려 주세요." />
  if (!allowed) return <CenterMessage title="사용 권한이 없습니다" body={lockedReason} action={() => router.push("/dashboard")} />

  return (
    <main className="min-h-screen bg-[#eef3f8] p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
            <ArrowLeft className="h-4 w-4" /> 대시보드
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="new-pulse-badge rounded-full px-3 py-1 text-xs font-black text-white">NEW 첫 상담 보장체크</span>
            <button onClick={saveCase} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a3a6e] px-4 py-2 text-sm font-black text-white shadow-sm">
              <Save className="h-4 w-4" /> 저장
            </button>
            <button onClick={() => setShowSaved((prev) => !prev)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
              <FolderOpen className="h-4 w-4" /> 불러오기
            </button>
            <button onClick={printReport} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 shadow-sm">
              <Printer className="h-4 w-4" /> 출력
            </button>
            <button onClick={closeWindow} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-700 shadow-sm">
              <X className="h-4 w-4" /> 창닫기
            </button>
          </div>
        </header>

        {showSaved && (
          <div className="no-print mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-900">저장된 상담 기록</p>
              <button onClick={() => setShowSaved(false)} className="text-xs font-black text-slate-400">닫기</button>
            </div>
            {savedCases.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">저장된 기록이 없습니다.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {savedCases.map((item) => (
                  <button key={item.id} onClick={() => loadCase(item)} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-[#1a3a6e] hover:bg-[#eef4fb]">
                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{new Date(item.savedAt).toLocaleString("ko-KR")}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="no-print rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-6 lg:h-fit">
            <p className="px-2 pb-3 text-xs font-black uppercase tracking-[0.18em] text-[#1a3a6e]">Coverage Check</p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {steps.map((step) => {
                const Icon = step.icon
                const selected = active === step.id
                return (
                  <button key={step.id} onClick={() => setActive(step.id)} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-black transition ${selected ? "border-[#1a3a6e] bg-[#1a3a6e] text-white" : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                    <Icon className="h-4 w-4" />
                    {step.label}
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="print-area rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {active === "intro" && <Intro onStart={() => setActive("customer")} />}
            {active === "customer" && (
              <Panel title="고객 기본 정보" desc="설계사가 고객의 현재 증권과 상담 내용을 보고 직접 입력합니다.">
                <div className="grid gap-3 md:grid-cols-2">
                  <TextInput label="고객명" value={form.customerName} onChange={(v) => update("customerName", v)} />
                  <NumberInput label="나이" value={form.age} onChange={(v) => update("age", v)} suffix="세" />
                  <SelectInput label="성별" value={form.gender} onChange={(v) => update("gender", v as FormState["gender"])} options={[["male", "남성"], ["female", "여성"]]} />
                  <NumberInput label="월 생활비 기준" value={form.monthlyLivingCost} onChange={(v) => update("monthlyLivingCost", v)} suffix="만원" />
                  <Toggle label="실손 유지 여부" checked={form.hasActualLoss} onChange={(v) => update("hasActualLoss", v)} />
                  <NumberInput label="실손 예상 보완율" value={form.actualLossCoverageRate} onChange={(v) => update("actualLossCoverageRate", v)} suffix="%" />
                </div>
              </Panel>
            )}
            {active === "cancer" && (
              <Panel title="암 보장 입력" desc="진단비는 1년 생활비, 치료비는 산정특례 이후 남을 수 있는 비급여 준비 관점으로 봅니다.">
                <FieldGrid>
                  <NumberInput label="암 진단비" value={form.cancerDiagnosis} onChange={(v) => update("cancerDiagnosis", v)} suffix="만원" />
                  <NumberInput label="유사암/소액암" value={form.similarCancer} onChange={(v) => update("similarCancer", v)} suffix="만원" />
                  <NumberInput label="항암약물 치료비" value={form.cancerTreatment} onChange={(v) => update("cancerTreatment", v)} suffix="만원" />
                  <NumberInput label="표적항암/신약" value={form.targetCancer} onChange={(v) => update("targetCancer", v)} suffix="만원" />
                  <NumberInput label="방사선/양성자/중입자" value={form.radiationCancer} onChange={(v) => update("radiationCancer", v)} suffix="만원" />
                </FieldGrid>
              </Panel>
            )}
            {active === "brain" && (
              <Panel title="뇌 보장 입력" desc="보장 범위가 뇌출혈인지, 뇌졸중인지, 뇌혈관질환까지인지가 핵심입니다.">
                <FieldGrid>
                  <SelectInput label="뇌 보장 범위" value={form.brainScope} onChange={(v) => update("brainScope", v as FormState["brainScope"])} options={[["hemorrhage", "뇌출혈"], ["stroke", "뇌졸중"], ["vascular", "뇌혈관질환"]]} />
                  <NumberInput label="뇌 진단비" value={form.brainDiagnosis} onChange={(v) => update("brainDiagnosis", v)} suffix="만원" />
                  <NumberInput label="뇌 수술비" value={form.brainSurgery} onChange={(v) => update("brainSurgery", v)} suffix="만원" />
                  <NumberInput label="혈전용해/스텐트 등 치료비" value={form.brainTreatment} onChange={(v) => update("brainTreatment", v)} suffix="만원" />
                </FieldGrid>
              </Panel>
            )}
            {active === "heart" && (
              <Panel title="심장 보장 입력" desc="급성심근경색만인지, 허혈성심장질환 또는 심혈관까지 보는지 확인합니다.">
                <FieldGrid>
                  <SelectInput label="심장 보장 범위" value={form.heartScope} onChange={(v) => update("heartScope", v as FormState["heartScope"])} options={[["ami", "급성심근경색"], ["ischemic", "허혈성심장질환"], ["cardio", "심혈관질환"]]} />
                  <NumberInput label="심장 진단비" value={form.heartDiagnosis} onChange={(v) => update("heartDiagnosis", v)} suffix="만원" />
                  <NumberInput label="심장 수술비" value={form.heartSurgery} onChange={(v) => update("heartSurgery", v)} suffix="만원" />
                  <NumberInput label="스텐트/우회술/부정맥 치료비" value={form.heartTreatment} onChange={(v) => update("heartTreatment", v)} suffix="만원" />
                </FieldGrid>
              </Panel>
            )}
            {active === "surgery" && (
              <Panel title="수술비 입력" desc="다빈도 수술 기준으로 정액 수술비와 실손 보완 후 남는 부담을 봅니다.">
                <FieldGrid>
                  <NumberInput label="질병수술비" value={form.diseaseSurgery} onChange={(v) => update("diseaseSurgery", v)} suffix="만원" />
                  <NumberInput label="주요질환 수술비" value={form.majorSurgery} onChange={(v) => update("majorSurgery", v)} suffix="만원" />
                  <NumberInput label="N대/종수술비" value={form.nsurgery} onChange={(v) => update("nsurgery", v)} suffix="만원" />
                </FieldGrid>
              </Panel>
            )}
            {active === "care" && (
              <Panel title="간병비 입력" desc="암·뇌·심장 수술 후 간병 기간과 1일 단가를 기준으로 봅니다.">
                <FieldGrid>
                  <NumberInput label="간병 1일 단가" value={form.careDailyCost} onChange={(v) => update("careDailyCost", v)} suffix="만원" />
                  <NumberInput label="암 간병 예상일" value={form.cancerCareDays} onChange={(v) => update("cancerCareDays", v)} suffix="일" />
                  <NumberInput label="뇌 간병 예상일" value={form.brainCareDays} onChange={(v) => update("brainCareDays", v)} suffix="일" />
                  <NumberInput label="심장 간병 예상일" value={form.heartCareDays} onChange={(v) => update("heartCareDays", v)} suffix="일" />
                  <NumberInput label="현재 간병 일당" value={form.careBenefitDaily} onChange={(v) => update("careBenefitDaily", v)} suffix="만원" />
                </FieldGrid>
              </Panel>
            )}
            {active === "result" && (
              <Panel title="보장 공백 진단 결과" desc="첫 상담에서 오늘 확인된 공백을 설명하고, 상세 보장분석으로 이어가기 위한 화면입니다.">
                <div className="mb-4 rounded-2xl border border-[#bcd6f0] bg-[#f2f8ff] p-5">
                  <p className="text-sm font-black text-[#1a3a6e]">{form.customerName || "고객"}님의 현재 준비율</p>
                  <div className="mt-3 flex flex-wrap items-end gap-4">
                    <p className="text-5xl font-black text-[#1a3a6e]">{averageRate}%</p>
                    <p className="max-w-xl text-sm font-bold leading-7 text-slate-600">모두에게 똑같은 보험이 아니라, 현재 상황에서 암·뇌·심장·수술·간병을 어느 정도 감당할 수 있는지 확인한 결과입니다.</p>
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-5">
                  {resultList.map((item) => <ResultCard key={item.title} item={item} />)}
                </div>
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-black text-amber-800">오늘 상담 포인트</p>
                  <ul className="mt-3 space-y-2 text-sm font-bold leading-7 text-amber-900">
                    {resultList.sort((a, b) => a.rate - b.rate).slice(0, 3).map((item) => (
                      <li key={item.title}>· {item.title}: {item.note}</li>
                    ))}
                  </ul>
                </div>
              </Panel>
            )}

            <div className="no-print mt-6 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
              <button onClick={prev} disabled={active === "intro"} className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-500 disabled:opacity-30">이전</button>
              <div className="flex gap-2">
                {active !== "result" && <button onClick={next} className="rounded-lg bg-[#1a3a6e] px-5 py-3 text-sm font-black text-white">다음</button>}
                {active !== "result" && <button onClick={() => setActive("result")} className="rounded-lg border border-[#1a3a6e] bg-white px-5 py-3 text-sm font-black text-[#1a3a6e]">결과 보기</button>}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function CenterMessage({ title, body, action }: { title: string; body: string; action?: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef3f8] p-6 text-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xl font-black text-slate-900">{title}</p>
        <p className="mt-3 text-sm font-bold leading-7 text-slate-500">{body}</p>
        {action && <button onClick={action} className="mt-5 rounded-lg bg-[#1a3a6e] px-5 py-3 text-sm font-black text-white">대시보드로 이동</button>}
      </div>
    </div>
  )
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#d7b46a] bg-[#fbf8ef]">
      <div className="p-6 sm:p-10">
        <span className="new-pulse-badge rounded-full px-3 py-1 text-xs font-black text-white">NEW</span>
        <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight text-[#111827] sm:text-5xl">
          모두에게 똑같은 보험이 아니라,<br />나의 상황에 맞는 보장이 준비되어 있는지 체크합니다.
        </h1>
        <p className="mt-5 max-w-2xl text-base font-bold leading-8 text-slate-600">
          현재 보장 내용을 입력하면 암, 뇌, 심장, 수술, 간병 상황에서 준비율과 부족 가능 금액을 상담용으로 바로 확인합니다.
        </p>
        <button onClick={onStart} className="mt-8 rounded-xl bg-[#1a3a6e] px-7 py-4 text-sm font-black text-white shadow-lg">보장 입력 시작</button>
      </div>
    </div>
  )
}

function Panel({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-5">
        <p className="text-2xl font-black text-slate-950">{title}</p>
        <p className="mt-2 text-sm font-bold leading-7 text-slate-500">{desc}</p>
      </div>
      {children}
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
}

function NumberInput({ label, value, suffix, onChange }: { label: string; value: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <label className="block rounded-xl border border-slate-200 bg-slate-50 p-4">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <span className="mt-2 flex items-center gap-2">
        <input type="number" value={value || ""} placeholder="0" onChange={(e) => onChange(Number(e.target.value || 0))} className="w-full bg-transparent text-2xl font-black text-[#1a3a6e] outline-none" />
        <span className="text-sm font-black text-slate-400">{suffix}</span>
      </span>
    </label>
  )
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-xl border border-slate-200 bg-slate-50 p-4">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="고객명" className="mt-2 w-full bg-transparent text-2xl font-black text-[#1a3a6e] outline-none" />
    </label>
  )
}

function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-xl border border-slate-200 bg-slate-50 p-4">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full bg-transparent text-xl font-black text-[#1a3a6e] outline-none">
        {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
      </select>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`rounded-xl border p-4 text-left ${checked ? "border-[#1a3a6e] bg-[#eef4fb]" : "border-slate-200 bg-slate-50"}`}>
      <span className="block text-xs font-black text-slate-500">{label}</span>
      <span className={`mt-2 block text-2xl font-black ${checked ? "text-[#1a3a6e]" : "text-slate-400"}`}>{checked ? "있음" : "없음"}</span>
    </button>
  )
}

function ResultCard({ item }: { item: { title: string; need: number; ready: number; rate: number; gap: number; note: string } }) {
  const s = status(item.rate)
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: s.border, background: s.bg }}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-black" style={{ color: s.color }}>{item.title}</p>
        <span className="rounded-full px-2 py-1 text-[11px] font-black" style={{ color: s.color, background: "rgba(255,255,255,0.7)" }}>{s.label}</span>
      </div>
      <p className="mt-4 text-4xl font-black" style={{ color: s.color }}>{item.rate}%</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
        <div className="h-full rounded-full" style={{ width: `${item.rate}%`, background: s.color }} />
      </div>
      <div className="mt-4 space-y-1 text-xs font-black text-slate-600">
        <p>기준 {man(item.need)}</p>
        <p>현재 {man(item.ready)}</p>
        <p>부족 가능 {man(item.gap)}</p>
      </div>
    </div>
  )
}
