"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import { ensureUserProfile } from "../../../lib/userProfile"
import { canAccessProposalGenerator, isApprovedUser, normalizeRole, ROLE_PRIORITY } from "../../../lib/roles"
import LoadingScreen from "../../components/LoadingScreen"

// ── 타입 ─────────────────────────────────────────────────────────────────────
type ProposalType = "single" | "compare"
type ProductConcept = "concept" | "proposal"
type PaymentType = "coverage" | "savings"
type Step = 1 | 2 | 3

interface CoverageItem { name: string; amount: string }
interface ScenarioItem { title: string; desc: string }
interface ProductData {
  name: string
  company: string
  concept: ProductConcept
  paymentType: PaymentType
  paymentYears: string
  coverageSavingsYears: string
  monthlyPremium: string
  coverages: CoverageItem[]
  scenarios: ScenarioItem[]
  isShortTerm: boolean
  shortTermYears: string
  surrenderYear: string
  surrenderAmount: string
  surrenderPurpose: string
}
interface ConsultantInfo { name: string; phone: string }

// ── 초기값 ────────────────────────────────────────────────────────────────────
const emptyProduct = (): ProductData => ({
  name: "", company: "", concept: "proposal", paymentType: "coverage",
  paymentYears: "", coverageSavingsYears: "", monthlyPremium: "",
  coverages: [
    { name: "", amount: "" }, { name: "", amount: "" },
    { name: "", amount: "" }, { name: "", amount: "" },
    { name: "", amount: "" }, { name: "", amount: "" },
  ],
  scenarios: [{ title: "", desc: "" }, { title: "", desc: "" }, { title: "", desc: "" }],
  isShortTerm: false, shortTermYears: "5", surrenderYear: "", surrenderAmount: "", surrenderPurpose: "",
})

// ── 컬러 상수 ─────────────────────────────────────────────────────────────────
const C = {
  navy: "#1A2744", navyLight: "#2D4A8A", gold: "#C9A96E", goldWarm: "#E8A84B",
  bg: "#f5f7fb", white: "#ffffff", text: "#111111", muted: "#6b7280",
  border: "#e5e7eb", card: "#ffffff",
}

// ── 사이드바 컴포넌트 ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 1 as Step, label: "제안 유형", sub: "단독 / 비교 선택" },
  { id: 2 as Step, label: "상품 정보", sub: "세부 내용 입력" },
  { id: 3 as Step, label: "제안서 미리보기", sub: "인쇄 · 저장" },
]

function ProposalSidebar({ step, onStep }: { step: Step; onStep: (s: Step) => void }) {
  return (
    <aside style={{
      width: 260, flexShrink: 0, background: C.navy, color: "#fff",
      minHeight: "100vh", padding: "28px 18px", display: "flex",
      flexDirection: "column", gap: 20, position: "sticky", top: 0, height: "100vh",
    }}>
      {/* 브랜드 */}
      <div style={{ paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,.12)" }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px" }}>제안서 생성</div>
        <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.5)", letterSpacing: "0.04em" }}>
          PROPOSAL GENERATOR
        </div>
      </div>

      {/* 스텝 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {STEPS.map((s) => {
          const active = step === s.id
          const done = step > s.id
          return (
            <button key={s.id} onClick={() => onStep(s.id)} style={{
              all: "unset", cursor: "pointer", borderRadius: 10,
              background: active ? "#fff" : done ? "rgba(201,169,110,.15)" : "rgba(255,255,255,.07)",
              color: active ? C.navy : done ? C.gold : "rgba(255,255,255,.72)",
              padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
              transition: "all 0.18s",
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 900,
                background: active ? C.navy : done ? C.gold : "rgba(255,255,255,.15)",
                color: active ? "#fff" : done ? "#fff" : "rgba(255,255,255,.7)",
              }}>
                {done ? "✓" : s.id}
              </span>
              <span>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{s.sub}</div>
              </span>
            </button>
          )
        })}
      </div>

      {/* 안내 */}
      <div style={{
        marginTop: "auto", fontSize: 11, color: "rgba(255,255,255,.4)",
        lineHeight: 1.7, borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 16,
      }}>
        각 단계를 클릭해 언제든 수정할 수 있습니다.<br/>
        Step 3에서 가로 A4로 인쇄하세요.
      </div>
    </aside>
  )
}

// ── 입력 공통 컴포넌트 ────────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>
        {label}{required && <span style={{ color: C.goldWarm, marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px",
  border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14,
  fontFamily: "inherit", outline: "none", color: C.text,
  background: "#fff", transition: "border-color 0.15s",
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none", backgroundImage:
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%236b7280' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
}

// ── 상품 입력 폼 ──────────────────────────────────────────────────────────────
function ProductForm({
  data, onChange, index, isCompare,
}: {
  data: ProductData
  onChange: (d: ProductData) => void
  index?: number
  isCompare?: boolean
}) {
  const set = (field: keyof ProductData, value: unknown) => onChange({ ...data, [field as string]: value })
  const setCov = (i: number, field: keyof CoverageItem, v: string) => {
    const next = [...data.coverages]
    next[i] = { ...next[i], [field]: v }
    onChange({ ...data, coverages: next })
  }
  const setScen = (i: number, field: keyof ScenarioItem, v: string) => {
    const next = [...data.scenarios]
    next[i] = { ...next[i], [field]: v }
    onChange({ ...data, scenarios: next })
  }

  const conceptLabel = isCompare
    ? (index === 0 ? "A사 상품" : "B사 상품")
    : data.concept === "concept" ? "상품 컨셉" : "상품 제안"

  return (
    <div style={{
      background: C.white, borderRadius: 16, padding: 28,
      border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 22,
    }}>
      {/* 헤더 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        paddingBottom: 16, borderBottom: `1.5px solid ${C.border}`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: isCompare && index === 1 ? C.navyLight : C.navy,
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 900,
        }}>
          {isCompare ? (index === 0 ? "A" : "B") : "①"}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>
            {isCompare ? `${index === 0 ? "A" : "B"}사 상품 정보` : "상품 정보 입력"}
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>
            {isCompare ? "비교할 상품의 세부 내용을 입력하세요" : "제안할 상품의 세부 내용을 입력하세요"}
          </div>
        </div>
      </div>

      {/* 기본 정보 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="상품명" required>
          <input style={inputStyle} placeholder="예: 무배당 통합건강보험" value={data.name}
            onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="보험사" required>
          <input style={inputStyle} placeholder="예: 삼성생명" value={data.company}
            onChange={(e) => set("company", e.target.value)} />
        </Field>
      </div>

      {!isCompare && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="상품 카테고리">
            <select style={selectStyle} value={data.concept}
              onChange={(e) => set("concept", e.target.value as ProductConcept)}>
              <option value="proposal">상품 제안</option>
              <option value="concept">상품 컨셉</option>
            </select>
          </Field>
          <Field label="상품 유형">
            <select style={selectStyle} value={data.paymentType}
              onChange={(e) => set("paymentType", e.target.value as PaymentType)}>
              <option value="coverage">보장성 (납입 + 보장기간)</option>
              <option value="savings">저축성 (납입 + 거치기간)</option>
            </select>
          </Field>
        </div>
      )}

      {/* 기간 & 보험료 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Field label="납입기간" required>
          <input style={inputStyle} placeholder="예: 20년납" value={data.paymentYears}
            onChange={(e) => set("paymentYears", e.target.value)} />
        </Field>
        <Field label={data.paymentType === "savings" ? "거치기간" : "보장기간"} required>
          <input style={inputStyle}
            placeholder={data.paymentType === "savings" ? "예: 10년" : "예: 100세"}
            value={data.coverageSavingsYears}
            onChange={(e) => set("coverageSavingsYears", e.target.value)} />
        </Field>
        <Field label="월 보험료" required>
          <input style={inputStyle} placeholder="예: 120,000원" value={data.monthlyPremium}
            onChange={(e) => set("monthlyPremium", e.target.value)} />
        </Field>
      </div>

      {/* 단기납 토글 */}
      <div style={{
        background: "#f8fafc", borderRadius: 10, padding: "14px 16px",
        border: `1px solid ${C.border}`,
      }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={data.isShortTerm}
            onChange={(e) => set("isShortTerm", e.target.checked)}
            style={{ width: 18, height: 18, accentColor: C.navy }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>단기납 상품 (해약환급금 설명 추가)</span>
        </label>

        {data.isShortTerm && (
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 }}>
            <Field label="납입연수">
              <select style={selectStyle} value={data.shortTermYears}
                onChange={(e) => set("shortTermYears", e.target.value)}>
                <option value="5">5년납</option>
                <option value="7">7년납</option>
                <option value="10">10년납</option>
              </select>
            </Field>
            <Field label="해지 시점">
              <input style={inputStyle} placeholder="예: 10년 후" value={data.surrenderYear}
                onChange={(e) => set("surrenderYear", e.target.value)} />
            </Field>
            <Field label="해약환급금">
              <input style={inputStyle} placeholder="예: 납입보험료의 108%" value={data.surrenderAmount}
                onChange={(e) => set("surrenderAmount", e.target.value)} />
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="활용 목적">
                <input style={inputStyle} placeholder="예: 노후 생활비, 목돈 재투자, 자녀 교육비 등"
                  value={data.surrenderPurpose}
                  onChange={(e) => set("surrenderPurpose", e.target.value)} />
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* 주요 보장 */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
          주요 보장 내역 <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>(최대 6개)</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {data.coverages.map((cov, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inputStyle, flex: 2 }} placeholder={`담보명 ${i + 1}`}
                value={cov.name} onChange={(e) => setCov(i, "name", e.target.value)} />
              <input style={{ ...inputStyle, flex: 1 }} placeholder="금액"
                value={cov.amount} onChange={(e) => setCov(i, "amount", e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* 활용 시나리오 */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
          활용 시나리오 <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>(최대 3개)</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.scenarios.map((sc, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inputStyle, width: 160, flexShrink: 0 }}
                placeholder={`상황 제목 ${i + 1}`}
                value={sc.title} onChange={(e) => setScen(i, "title", e.target.value)} />
              <input style={{ ...inputStyle, flex: 1 }}
                placeholder="상세 설명 (어떤 상황에서, 어떻게 활용)"
                value={sc.desc} onChange={(e) => setScen(i, "desc", e.target.value)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 제안서 페이지 렌더 (단독) ──────────────────────────────────────────────────
function SingleProposalPages({ data, consultant }: { data: ProductData; consultant: ConsultantInfo }) {
  const filledCoverages = data.coverages.filter((c) => c.name.trim())
  const filledScenarios = data.scenarios.filter((s) => s.title.trim())

  const pageStyle: React.CSSProperties = {
    width: "297mm", height: "210mm", background: "#fff",
    position: "relative", overflow: "hidden", pageBreakAfter: "always",
    breakAfter: "page", boxSizing: "border-box", flexShrink: 0,
  }

  // 아이콘 SVG (보장별)
  const coverageIcons = ["🛡", "🧠", "❤️", "🏥", "💊", "🩺"]

  return (
    <>
      {/* ── PAGE 1: 상품 컨셉 / 고객 니즈 ─────────────────────────── */}
      <div className="proposal-page" style={pageStyle}>
        {/* 좌측 다크 패널 */}
        <div style={{
          position: "absolute", left: 0, top: 0, width: "38%", height: "100%",
          background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navyLight} 100%)`,
          padding: "32px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          {/* 상단 로고 영역 */}
          <div>
            <div style={{
              display: "inline-block", padding: "4px 12px",
              background: "rgba(201,169,110,.2)", borderRadius: 20,
              fontSize: 10, fontWeight: 800, color: C.gold, letterSpacing: "0.1em",
              marginBottom: 20,
            }}>
              {data.concept === "concept" ? "PRODUCT CONCEPT" : "PRODUCT PROPOSAL"}
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1.3 }}>
              {data.name || "상품명을 입력하세요"}
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,.65)", fontWeight: 600 }}>
              {data.company || "보험사"}
            </div>
          </div>

          {/* 핵심 수치 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              background: "rgba(255,255,255,.08)", borderRadius: 10,
              padding: "10px 14px", border: "1px solid rgba(255,255,255,.12)",
            }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", fontWeight: 700, marginBottom: 4 }}>납입기간</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.gold }}>{data.paymentYears || "—"}</div>
            </div>
            <div style={{
              background: "rgba(255,255,255,.08)", borderRadius: 10,
              padding: "10px 14px", border: "1px solid rgba(255,255,255,.12)",
            }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.5)", fontWeight: 700, marginBottom: 4 }}>
                {data.paymentType === "savings" ? "거치기간" : "보장기간"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.gold }}>{data.coverageSavingsYears || "—"}</div>
            </div>
            <div style={{
              background: C.gold, borderRadius: 10, padding: "10px 14px",
            }}>
              <div style={{ fontSize: 10, color: "rgba(26,39,68,.7)", fontWeight: 700, marginBottom: 4 }}>월 보험료</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.navy }}>{data.monthlyPremium || "—"}</div>
            </div>
          </div>

          {/* 하단 브랜드 */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 12 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", fontWeight: 700 }}>METARICH SIGNAL GROUP</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 2 }}>
              {consultant.name || "상담사"} · {consultant.phone || ""}
            </div>
          </div>
        </div>

        {/* 우측 패널 */}
        <div style={{
          position: "absolute", left: "38%", top: 0, width: "62%", height: "100%",
          padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, letterSpacing: "0.08em", marginBottom: 6 }}>
              이 상품이 필요한 이유
            </div>
            <div style={{ width: 36, height: 3, background: C.gold, borderRadius: 2, marginBottom: 14 }} />
          </div>

          {/* 시나리오 카드들 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            {filledScenarios.length > 0 ? filledScenarios.slice(0, 3).map((sc, i) => (
              <div key={i} style={{
                display: "flex", gap: 14, padding: "14px 16px",
                background: i === 0 ? "#f8f9ff" : "#fafafa",
                borderRadius: 12, border: `1px solid ${i === 0 ? "#d4deff" : C.border}`,
                borderLeft: `4px solid ${i === 0 ? C.navyLight : i === 1 ? C.gold : "#94a3b8"}`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: i === 0 ? C.navyLight : i === 1 ? C.goldWarm : "#64748b",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 900,
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 4 }}>{sc.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{sc.desc}</div>
                </div>
              </div>
            )) : (
              <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                color: C.muted, fontSize: 13,
              }}>
                Step 2에서 활용 시나리오를 입력하세요
              </div>
            )}
          </div>

          {/* 하단 캐치프레이즈 */}
          <div style={{
            padding: "14px 18px", background: "#f8f9ff",
            borderRadius: 10, border: `1px solid #d4deff`,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: C.navy, color: C.gold,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              fontSize: 18,
            }}>★</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, lineHeight: 1.5 }}>
              메타리치 시그널그룹의 정확한 분석과 신속한 청구로<br/>
              <span style={{ color: C.navyLight }}>최적의 보험 솔루션</span>을 제안합니다.
            </div>
          </div>
        </div>

        {/* 페이지 번호 */}
        <div style={{
          position: "absolute", right: 16, bottom: 12,
          fontSize: 9, color: "rgba(0,0,0,.25)", fontWeight: 700,
        }}>1 / 3</div>
      </div>

      {/* ── PAGE 2: 주요 보장 인포그래픽 ─────────────────────────────── */}
      <div className="proposal-page" style={pageStyle}>
        {/* 상단 헤더 바 */}
        <div style={{
          height: 56, background: C.navy, display: "flex", alignItems: "center",
          padding: "0 28px", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>주요 보장 내역</div>
            <div style={{
              padding: "3px 10px", background: C.gold, borderRadius: 20,
              fontSize: 10, fontWeight: 800, color: C.navy,
            }}>
              {data.name || "상품명"}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>
            {data.company || ""} · {data.monthlyPremium || ""} / 월
          </div>
        </div>

        <div style={{ padding: "20px 28px", height: "calc(100% - 56px)", boxSizing: "border-box" }}>
          {/* 납입 타임라인 */}
          <div style={{
            background: "#f8fafc", borderRadius: 10, padding: "12px 16px",
            border: `1px solid ${C.border}`, marginBottom: 18,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, marginBottom: 10, letterSpacing: "0.06em" }}>
              PAYMENT TIMELINE
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, position: "relative" }}>
              {/* 타임라인 바 */}
              <div style={{ flex: 1, height: 8, background: C.gold, borderRadius: "4px 0 0 4px", position: "relative" }}>
                <div style={{
                  position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
                  fontSize: 11, fontWeight: 800, color: C.navy, whiteSpace: "nowrap",
                }}>납입 {data.paymentYears || "—"}</div>
              </div>
              <div style={{ flex: 1.5, height: 8, background: `${C.navyLight}33`, borderRadius: "0 4px 4px 0", position: "relative" }}>
                <div style={{
                  position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
                  fontSize: 11, fontWeight: 800, color: C.navyLight, whiteSpace: "nowrap",
                }}>
                  {data.paymentType === "savings" ? "거치" : "보장"} {data.coverageSavingsYears || "—"}
                </div>
              </div>
              {/* 포인트 마커 */}
              {["시작", "납입완료", data.paymentType === "savings" ? "만기수령" : "보장종료"].map((label, i) => (
                <div key={i} style={{
                  position: "absolute",
                  left: i === 0 ? 0 : i === 1 ? "40%" : "100%",
                  transform: "translateX(-50%)",
                  display: "flex", flexDirection: "column", alignItems: "center",
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%",
                    background: i === 0 ? C.gold : i === 1 ? C.navy : C.navyLight,
                    border: "2px solid #fff", boxShadow: "0 0 0 2px rgba(0,0,0,.1)",
                    marginTop: -3,
                  }} />
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginTop: 6, whiteSpace: "nowrap" }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 보장 카드 그리드 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(filledCoverages.length || 3, 3)}, 1fr)`,
            gap: 10, marginBottom: 16,
          }}>
            {(filledCoverages.length > 0 ? filledCoverages : Array(3).fill({ name: "담보명", amount: "금액" }))
              .slice(0, 6).map((cov, i) => (
              <div key={i} style={{
                padding: "14px 14px", borderRadius: 10,
                background: i % 3 === 0 ? `${C.navy}08` : i % 3 === 1 ? `${C.gold}18` : "#f8fafc",
                border: `1px solid ${i % 3 === 0 ? `${C.navy}20` : i % 3 === 1 ? `${C.gold}40` : C.border}`,
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <div style={{ fontSize: 18 }}>{coverageIcons[i] || "🛡"}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.navy, lineHeight: 1.3 }}>{cov.name}</div>
                <div style={{
                  fontSize: 15, fontWeight: 900,
                  color: i % 3 === 0 ? C.navy : i % 3 === 1 ? "#a07030" : C.navyLight,
                }}>{cov.amount}</div>
              </div>
            ))}
          </div>

          {/* 단기납 환급금 섹션 */}
          {data.isShortTerm && data.surrenderAmount && (
            <div style={{
              background: `linear-gradient(135deg, ${C.navy}08 0%, ${C.gold}10 100%)`,
              borderRadius: 12, padding: "14px 18px",
              border: `1px solid ${C.gold}40`,
              display: "flex", alignItems: "center", gap: 20,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: C.gold, color: C.navy,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0, fontWeight: 900,
              }}>↩</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, marginBottom: 4 }}>단기납 해약환급금</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{data.shortTermYears}년납 완납 후</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{data.surrenderYear && `${data.surrenderYear} 해지 시`}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.navy, marginTop: 2 }}>
                  {data.surrenderAmount}
                  {data.surrenderPurpose && (
                    <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginLeft: 10 }}>
                      → {data.surrenderPurpose}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          position: "absolute", right: 16, bottom: 12,
          fontSize: 9, color: "rgba(0,0,0,.25)", fontWeight: 700,
        }}>2 / 3</div>
      </div>

      {/* ── PAGE 3: 제안 결론 + 상담사 정보 ──────────────────────────── */}
      <div className="proposal-page" style={{ ...pageStyle, pageBreakAfter: "avoid", breakAfter: "avoid" }}>
        <div style={{
          height: 56, background: `linear-gradient(90deg, ${C.navy} 0%, ${C.navyLight} 100%)`,
          display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>제안 요약 · 상담 안내</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>PROPOSAL SUMMARY</div>
        </div>

        <div style={{ padding: "20px 28px", height: "calc(100% - 56px)", boxSizing: "border-box", display: "flex", gap: 20 }}>
          {/* 좌: 제안 핵심 요약 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.navy, letterSpacing: "0.06em" }}>
              이 상품의 핵심 제안
            </div>

            {/* 요약 박스 */}
            <div style={{
              background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`,
              borderRadius: 14, padding: "18px 20px", color: "#fff",
            }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginBottom: 8 }}>상품 개요</div>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>{data.name || "—"}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>{data.company}</div>
              <div style={{ marginTop: 16, display: "flex", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)", marginBottom: 3 }}>납입</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>{data.paymentYears || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)", marginBottom: 3 }}>
                    {data.paymentType === "savings" ? "거치" : "보장"}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>{data.coverageSavingsYears || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)", marginBottom: 3 }}>월 보험료</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.gold }}>{data.monthlyPremium || "—"}</div>
                </div>
              </div>
            </div>

            {/* 추천 포인트 */}
            {filledScenarios.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filledScenarios.map((sc, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, padding: "10px 12px",
                    background: "#f8fafc", borderRadius: 8, border: `1px solid ${C.border}`,
                    alignItems: "flex-start",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      background: i === 0 ? C.navy : i === 1 ? C.gold : "#64748b",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 900,
                    }}>{i + 1}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.navy }}>{sc.title}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{sc.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 우: 상담사 정보 + 안내 */}
          <div style={{ width: 200, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.navy, letterSpacing: "0.06em" }}>
              담당 전문가
            </div>

            <div style={{
              background: "#f8f9ff", borderRadius: 14, padding: "18px 16px",
              border: `1px solid #d4deff`, display: "flex", flexDirection: "column", gap: 12,
              alignItems: "center", textAlign: "center",
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, color: C.gold, fontWeight: 900,
              }}>
                {consultant.name ? consultant.name.charAt(0) : "M"}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.navy }}>{consultant.name || "상담사"}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>보험 전문 컨설턴트</div>
              </div>
              {consultant.phone && (
                <div style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8,
                  background: C.navy, color: "#fff",
                  fontSize: 13, fontWeight: 800, textAlign: "center",
                }}>{consultant.phone}</div>
              )}
            </div>

            <div style={{
              padding: "12px 14px", background: `${C.gold}15`, borderRadius: 10,
              border: `1px solid ${C.gold}40`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#a07030", marginBottom: 6 }}>METARICH SIGNAL</div>
              <div style={{ fontSize: 11, color: C.navy, fontWeight: 600, lineHeight: 1.6 }}>
                정확한 분석,<br/>신속한 청구
              </div>
            </div>

            <div style={{
              fontSize: 9, color: C.muted, lineHeight: 1.7,
              borderTop: `1px solid ${C.border}`, paddingTop: 10,
            }}>
              본 제안서는 참고용이며 실제 계약 내용은 약관을 따릅니다. 보험료는 가입 조건에 따라 달라질 수 있습니다.
            </div>
          </div>
        </div>

        <div style={{
          position: "absolute", right: 16, bottom: 12,
          fontSize: 9, color: "rgba(0,0,0,.25)", fontWeight: 700,
        }}>3 / 3</div>
      </div>
    </>
  )
}

// ── 비교제안 페이지 렌더 ──────────────────────────────────────────────────────
function CompareProposalPages({ dataA, dataB, consultant }: {
  dataA: ProductData; dataB: ProductData; consultant: ConsultantInfo
}) {
  const pageStyle: React.CSSProperties = {
    width: "297mm", height: "210mm", background: "#fff",
    position: "relative", overflow: "hidden", pageBreakAfter: "always",
    breakAfter: "page", boxSizing: "border-box", flexShrink: 0,
  }

  const filledCovA = dataA.coverages.filter((c) => c.name.trim())
  const filledCovB = dataB.coverages.filter((c) => c.name.trim())

  return (
    <>
      {/* ── PAGE 1: A vs B 상품 개요 ───────────────────────────────── */}
      <div className="proposal-page" style={pageStyle}>
        {/* 상단 헤더 */}
        <div style={{
          height: 52, background: C.navy, display: "flex", alignItems: "center",
          padding: "0 28px", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>보험 상품 비교 제안</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{
              padding: "4px 14px", background: C.gold, borderRadius: 20,
              fontSize: 11, fontWeight: 800, color: C.navy,
            }}>A. {dataA.company || "A사"}</div>
            <span style={{ color: "rgba(255,255,255,.4)", alignSelf: "center" }}>vs</span>
            <div style={{
              padding: "4px 14px", background: C.navyLight, borderRadius: 20,
              fontSize: 11, fontWeight: 800, color: "#fff",
            }}>B. {dataB.company || "B사"}</div>
          </div>
        </div>

        <div style={{ padding: "20px 28px", display: "flex", gap: 20, height: "calc(100% - 52px)", boxSizing: "border-box" }}>
          {/* A 상품 */}
          {[dataA, dataB].map((d, idx) => (
            <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* 상품 헤더 */}
              <div style={{
                borderRadius: 12, padding: "16px 18px",
                background: idx === 0
                  ? `linear-gradient(135deg, ${C.gold}15 0%, ${C.gold}25 100%)`
                  : `linear-gradient(135deg, ${C.navyLight}10 0%, ${C.navyLight}20 100%)`,
                border: `2px solid ${idx === 0 ? C.gold : C.navyLight}`,
              }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 28, height: 28, borderRadius: "50%",
                  background: idx === 0 ? C.gold : C.navyLight,
                  color: idx === 0 ? C.navy : "#fff",
                  fontSize: 14, fontWeight: 900, marginBottom: 10,
                }}>{idx === 0 ? "A" : "B"}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: C.navy }}>{d.name || "상품명"}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{d.company || "보험사"}</div>
              </div>

              {/* 기본 스펙 비교 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["납입기간", d.paymentYears],
                  [d.paymentType === "savings" ? "거치기간" : "보장기간", d.coverageSavingsYears],
                  ["월 보험료", d.monthlyPremium],
                ].map(([label, value]) => (
                  <div key={label} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", background: "#f8fafc", borderRadius: 8,
                    border: `1px solid ${C.border}`,
                  }}>
                    <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{label}</span>
                    <span style={{
                      fontSize: 14, fontWeight: 900,
                      color: label === "월 보험료" ? (idx === 0 ? "#a07030" : C.navyLight) : C.navy,
                    }}>{value || "—"}</span>
                  </div>
                ))}
              </div>

              {/* 단기납 여부 */}
              {d.isShortTerm && (
                <div style={{
                  padding: "10px 12px", background: `${C.gold}10`,
                  borderRadius: 8, border: `1px solid ${C.gold}40`, fontSize: 12,
                }}>
                  <span style={{ fontWeight: 800, color: "#a07030" }}>단기납 {d.shortTermYears}년</span>
                  {d.surrenderAmount && (
                    <span style={{ color: C.muted }}> · {d.surrenderYear} 해지 → {d.surrenderAmount}</span>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* 중앙 vs 구분선 */}
          <div style={{
            width: 1, background: C.border, alignSelf: "stretch",
            position: "relative", flexShrink: 0,
          }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 32, height: 32, borderRadius: "50%",
              background: "#fff", border: `2px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 900, color: C.muted,
            }}>vs</div>
          </div>
        </div>

        <div style={{
          position: "absolute", right: 16, bottom: 12,
          fontSize: 9, color: "rgba(0,0,0,.25)", fontWeight: 700,
        }}>1 / 3</div>
      </div>

      {/* ── PAGE 2: 보장별 상세 비교 ──────────────────────────────────── */}
      <div className="proposal-page" style={pageStyle}>
        <div style={{
          height: 52, background: `linear-gradient(90deg, ${C.navy}, ${C.navyLight})`,
          display: "flex", alignItems: "center", padding: "0 28px",
        }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>주요 보장 비교</div>
        </div>

        <div style={{ padding: "18px 28px", height: "calc(100% - 52px)", boxSizing: "border-box" }}>
          {/* 범례 */}
          <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
            {[{ label: `A. ${dataA.company || "A사"}`, color: C.gold }, { label: `B. ${dataB.company || "B사"}`, color: C.navyLight }].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: C.navy }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                {item.label}
              </div>
            ))}
          </div>

          {/* 보장 비교 행 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: Math.max(filledCovA.length, filledCovB.length, 3) }).slice(0, 6).map((_, i) => {
              const covA = filledCovA[i]
              const covB = filledCovB[i]
              if (!covA && !covB) return null
              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10, alignItems: "center",
                }}>
                  <div style={{
                    padding: "10px 14px", background: `${C.gold}15`,
                    borderRadius: 8, border: `1px solid ${C.gold}40`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{covA?.name || "—"}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: "#a07030" }}>{covA?.amount || "—"}</span>
                  </div>
                  <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: C.muted }}>
                    {covA?.name || covB?.name || `보장 ${i + 1}`}
                  </div>
                  <div style={{
                    padding: "10px 14px", background: `${C.navyLight}12`,
                    borderRadius: 8, border: `1px solid ${C.navyLight}30`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{covB?.name || "—"}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: C.navyLight }}>{covB?.amount || "—"}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{
          position: "absolute", right: 16, bottom: 12,
          fontSize: 9, color: "rgba(0,0,0,.25)", fontWeight: 700,
        }}>2 / 3</div>
      </div>

      {/* ── PAGE 3: 추천 이유 + 결론 ──────────────────────────────────── */}
      <div className="proposal-page" style={{ ...pageStyle, pageBreakAfter: "avoid", breakAfter: "avoid" }}>
        <div style={{
          height: 52, background: C.navy, display: "flex", alignItems: "center",
          padding: "0 28px",
        }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>제안 결론 · 상담 안내</div>
        </div>

        <div style={{ padding: "20px 28px", height: "calc(100% - 52px)", boxSizing: "border-box", display: "flex", gap: 20 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.navy, letterSpacing: "0.06em" }}>
              고객 상황별 추천 안내
            </div>

            {/* A/B 추천 비교 카드 */}
            {[{ data: dataA, color: C.gold, textColor: "#a07030", label: "A" },
              { data: dataB, color: C.navyLight, textColor: C.navyLight, label: "B" }].map((item, i) => {
              const sc = item.data.scenarios.filter((s) => s.title.trim()).slice(0, 2)
              return (
                <div key={i} style={{
                  padding: "14px 16px", borderRadius: 12,
                  background: i === 0 ? `${C.gold}10` : `${C.navyLight}08`,
                  border: `1.5px solid ${item.color}40`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: item.color, color: i === 0 ? C.navy : "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 900,
                    }}>{item.label}</div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: C.navy }}>
                      {item.data.company || `${item.label}사`} 선택 시 유리한 경우
                    </span>
                  </div>
                  {sc.length > 0 ? sc.map((s, j) => (
                    <div key={j} style={{ fontSize: 12, color: C.muted, paddingLeft: 34, lineHeight: 1.6 }}>
                      · {s.title} {s.desc && `— ${s.desc}`}
                    </div>
                  )) : (
                    <div style={{ fontSize: 12, color: C.muted, paddingLeft: 34 }}>시나리오를 입력하세요</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 우: 상담사 */}
          <div style={{ width: 200, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.navy }}>담당 전문가</div>
            <div style={{
              background: "#f8f9ff", borderRadius: 14, padding: "18px 16px",
              border: `1px solid #d4deff`, display: "flex", flexDirection: "column", gap: 10,
              alignItems: "center", textAlign: "center",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
                color: C.gold, fontSize: 20, fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {consultant.name ? consultant.name.charAt(0) : "M"}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: C.navy }}>{consultant.name || "상담사"}</div>
                <div style={{ fontSize: 11, color: C.muted }}>보험 전문 컨설턴트</div>
              </div>
              {consultant.phone && (
                <div style={{
                  width: "100%", padding: "8px 10px", background: C.navy,
                  borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 800,
                }}>{consultant.phone}</div>
              )}
            </div>
            <div style={{
              padding: "10px 12px", background: `${C.gold}15`, borderRadius: 10,
              border: `1px solid ${C.gold}40`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#a07030" }}>METARICH SIGNAL</div>
              <div style={{ fontSize: 11, color: C.navy, fontWeight: 600, lineHeight: 1.6, marginTop: 4 }}>
                정확한 분석, 신속한 청구
              </div>
            </div>
            <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.7, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
              본 제안서는 참고용이며 실제 계약 내용은 약관을 따릅니다.
            </div>
          </div>
        </div>

        <div style={{
          position: "absolute", right: 16, bottom: 12,
          fontSize: 9, color: "rgba(0,0,0,.25)", fontWeight: 700,
        }}>3 / 3</div>
      </div>
    </>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function ProposalPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [lockedReason, setLockedReason] = useState("이용 권한이 없습니다.")
  const [step, setStep] = useState<Step>(1)
  const [proposalType, setProposalType] = useState<ProposalType>("single")
  const [productA, setProductA] = useState<ProductData>(emptyProduct)
  const [productB, setProductB] = useState<ProductData>(emptyProduct)
  const [consultant, setConsultant] = useState<ConsultantInfo>({ name: "", phone: "" })
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace("/login?redirectTo=/insurance-tools/proposal")
        return
      }

      let { data: profile } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle()
      if (!profile) profile = await ensureUserProfile(supabase, session.user)

      const role = normalizeRole(profile)
      const approved = isApprovedUser(profile)
      const isAgentOrAbove = ROLE_PRIORITY[role] >= ROLE_PRIORITY["agent"]
      const canUse = canAccessProposalGenerator(profile)

      let reason = "이용 권한이 없습니다."
      if (!approved) {
        reason = "관리자 승인 후 사용할 수 있습니다."
      } else if (!isAgentOrAbove) {
        reason = "설계사 등급 이상만 이용할 수 있습니다."
      }

      if (!alive) return
      setAllowed(canUse)
      setLockedReason(reason)
      setChecking(false)
    }
    checkAccess()
    return () => { alive = false }
  }, [router])

  // 프로필 자동 로드
  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from("users").select("name, phone").eq("id", session.user.id).maybeSingle()
      if (data) {
        setConsultant({
          name: data.name || "",
          phone: data.phone || "",
        })
      }
    }
    load()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  // 스텝별 유효성
  const canGoStep2 = true
  const canGoStep3 = (productA.name.trim() && productA.monthlyPremium.trim()) ||
    (proposalType === "compare" && productB.name.trim())

  if (checking) return <LoadingScreen />

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef3fb] p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#1a3a6e]">Proposal Generator</p>
          <h1 className="mt-3 text-2xl font-black text-slate-950">제안서 생성 권한이 필요합니다</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-500">{lockedReason}</p>
          <button
            type="button"
            onClick={() => router.replace("/dashboard")}
            className="mt-6 rounded-2xl bg-[#1a3a6e] px-5 py-3 text-sm font-black text-white transition hover:bg-[#2D4A8A]"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 인쇄 전용 CSS */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body * { visibility: hidden !important; }
          .proposal-print-area, .proposal-print-area * { visibility: visible !important; }
          .proposal-print-area { position: fixed; inset: 0; }
          .no-print { display: none !important; }
          .proposal-page { page-break-after: always; break-after: page; }
          .proposal-page:last-child { page-break-after: avoid; break-after: avoid; }
        }
        @media screen {
          .proposal-page {
            box-shadow: 0 4px 24px rgba(0,0,0,.10);
            margin-bottom: 24px;
          }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* 사이드바 */}
        <div className="no-print">
          <ProposalSidebar step={step} onStep={(s) => {
            if (s === 2 && !canGoStep2) return
            if (s === 3 && !canGoStep3) return
            setStep(s)
          }} />
        </div>

        {/* 메인 콘텐츠 */}
        <div style={{ flex: 1, padding: step === 3 ? 0 : "32px 36px", background: C.bg, overflowY: "auto" }}>

          {/* ── STEP 1: 유형 선택 ── */}
          {step === 1 && (
            <div style={{ maxWidth: 720 }}>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: C.navy, margin: 0 }}>제안서 생성</h1>
                <p style={{ marginTop: 8, fontSize: 14, color: C.muted }}>
                  제안 방식을 선택하고 상품 정보를 입력하면 가로 A4 형태의 인포그래픽 제안서가 만들어집니다.
                </p>
              </div>

              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14 }}>제안 유형 선택</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[
                    {
                      type: "single" as ProposalType,
                      title: "단독 상품 제안",
                      sub: "하나의 상품을 심층 소개",
                      desc: "상품 컨셉, 주요 보장, 활용 시나리오를 3페이지로 구성합니다.",
                      icon: "📄",
                    },
                    {
                      type: "compare" as ProposalType,
                      title: "비교 제안",
                      sub: "동일 카테고리 · 회사별 비교",
                      desc: "같은 종류의 상품을 A/B 보험사별로 설계 차이를 한눈에 비교합니다.",
                      icon: "⚖️",
                    },
                  ].map((opt) => {
                    const selected = proposalType === opt.type
                    return (
                      <button key={opt.type} onClick={() => setProposalType(opt.type)} style={{
                        all: "unset", cursor: "pointer", borderRadius: 16, padding: "24px 22px",
                        border: `2px solid ${selected ? C.navy : C.border}`,
                        background: selected ? `${C.navy}05` : "#fff",
                        display: "flex", flexDirection: "column", gap: 10, textAlign: "left",
                        transition: "all 0.18s",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 28 }}>{opt.icon}</span>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: selected ? C.navy : C.text }}>
                              {opt.title}
                            </div>
                            <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginTop: 2 }}>{opt.sub}</div>
                          </div>
                          {selected && (
                            <div style={{
                              marginLeft: "auto", width: 22, height: 22, borderRadius: "50%",
                              background: C.navy, color: "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
                            }}>✓</div>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{opt.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 상담사 정보 수동 수정 가능 */}
              <div style={{
                background: "#fff", borderRadius: 16, padding: 24,
                border: `1px solid ${C.border}`, marginBottom: 28,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14 }}>
                  담당 상담사 정보
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 400, marginLeft: 8 }}>
                    프로필에서 자동 로드 · 수정 가능
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="이름">
                    <input style={inputStyle} value={consultant.name}
                      onChange={(e) => setConsultant((p) => ({ ...p, name: e.target.value }))} />
                  </Field>
                  <Field label="연락처">
                    <input style={inputStyle} value={consultant.phone}
                      onChange={(e) => setConsultant((p) => ({ ...p, phone: e.target.value }))} />
                  </Field>
                </div>
              </div>

              <button onClick={() => setStep(2)} style={{
                all: "unset", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 12,
                background: C.navy, color: "#fff",
                fontSize: 15, fontWeight: 800,
              }}>
                상품 정보 입력하기 →
              </button>
            </div>
          )}

          {/* ── STEP 2: 상품 정보 입력 ── */}
          {step === 2 && (
            <div style={{ maxWidth: proposalType === "compare" ? 1100 : 780 }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: 0 }}>상품 정보 입력</h2>
                <p style={{ marginTop: 6, fontSize: 13, color: C.muted }}>
                  {proposalType === "compare"
                    ? "비교할 두 상품의 정보를 나란히 입력하세요."
                    : "제안할 상품의 상세 내용을 입력하세요."}
                </p>
              </div>

              {proposalType === "single" ? (
                <ProductForm data={productA} onChange={setProductA} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <ProductForm data={productA} onChange={setProductA} index={0} isCompare />
                  <ProductForm data={productB} onChange={setProductB} index={1} isCompare />
                </div>
              )}

              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button onClick={() => setStep(1)} style={{
                  all: "unset", cursor: "pointer",
                  padding: "12px 22px", borderRadius: 10,
                  border: `1.5px solid ${C.border}`, background: "#fff",
                  color: C.muted, fontSize: 14, fontWeight: 700,
                }}>← 이전</button>
                <button onClick={() => setStep(3)} style={{
                  all: "unset", cursor: "pointer",
                  padding: "12px 28px", borderRadius: 10,
                  background: C.navy, color: "#fff",
                  fontSize: 14, fontWeight: 800,
                }}>제안서 미리보기 →</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: 미리보기 + 인쇄 ── */}
          {step === 3 && (
            <div>
              {/* 상단 툴바 */}
              <div className="no-print" style={{
                background: C.navy, padding: "16px 32px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => setStep(2)} style={{
                    all: "unset", cursor: "pointer",
                    padding: "8px 16px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,.25)", color: "rgba(255,255,255,.8)",
                    fontSize: 13, fontWeight: 700,
                  }}>← 수정하기</button>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>
                    제안서 미리보기 · 총 3페이지 (가로 A4)
                  </div>
                </div>
                <button onClick={handlePrint} style={{
                  all: "unset", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 22px", borderRadius: 10,
                  background: C.gold, color: C.navy,
                  fontSize: 14, fontWeight: 900,
                }}>
                  🖨 인쇄 · PDF 저장
                </button>
              </div>

              {/* 미리보기 영역 */}
              <div className="no-print" style={{
                background: "#2a2a3a", padding: "32px 40px", minHeight: "calc(100vh - 64px)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
              }}>
                <div className="proposal-print-area" ref={printRef}>
                  {proposalType === "single"
                    ? <SingleProposalPages data={productA} consultant={consultant} />
                    : <CompareProposalPages dataA={productA} dataB={productB} consultant={consultant} />
                  }
                </div>
              </div>

              {/* 인쇄용 실제 영역 */}
              <div className="proposal-print-area" style={{ display: "none" }}>
                {proposalType === "single"
                  ? <SingleProposalPages data={productA} consultant={consultant} />
                  : <CompareProposalPages dataA={productA} dataB={productB} consultant={consultant} />
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
