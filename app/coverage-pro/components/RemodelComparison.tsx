'use client'

import { useState } from 'react'
import type { ProContract, ProCoverage, RemodelProposal } from '../../../lib/coverageAnalysis/types'
import { ROW_KEY_LABEL } from '../../../lib/coverageAnalysis/clientMapping'

// ── 담보 탭 카테고리 정의 ────────────────────────────────────────────────
type CoverageTab = '진단' | '수술' | '입원' | '간병' | '재가' | '기타' | '운전자' | '실손' | '주요치료비'

// ── 엑셀 COVERAGE_ROW_MAP 행 순서 기준으로 정확히 매핑 ─────────────────
// 실손(12-16) / 암진단·치료(17-28) / 2대질병(29-37) / 후유장해(38-41) /
// 사망(42-44) / 수술비(45-48) / 상해진단(49-50) / 입원(51-52) /
// 간병(53) / 재가(54-55) / 운전자(56-58) / 기타(59)
const COVERAGE_TAB_KEYS: Record<CoverageTab, string[]> = {
  // ── 진단 ─────────────────────────────────────────────────────────────────
  // 암진단(17-19) + 2대질병진단(29-34) + 후유장해(38-41) + 사망(42-44) + 상해진단(49-50)
  진단: [
    // 암 진단
    'cancer_general',        // 행17 암진단
    'cancer_similar',        // 행18 유사암진단
    'cancer_metastasis',     // 행19 전이암진단
    // 뇌혈관/심장 진단
    'brain_vascular',        // 행29 뇌혈관진단
    'brain_stroke',          // 행30 뇌졸증진단
    'brain_hemorrhage',      // 행31 뇌출혈진단
    'heart_vascular',        // 행32 심장질환진단
    'heart_ischemic',        // 행33 허혈성심장진단
    'heart_acute_mi',        // 행34 급성심근경색진단
    // 후유장해
    'disability_disease_80', // 행38 질병 80% 이상
    'disability_disease',    // 행39 질병 3%~80%
    'disability_injury_80',  // 행40 상해 80% 이상
    'disability_injury',     // 행41 상해 3%~80%
    // 사망
    'death_general',         // 행42 일반사망
    'death_disease',         // 행43 질병사망
    'death_injury',          // 행44 상해사망
    // 상해진단
    'fracture_diagnosis',    // 행49 골절
    'burn_diagnosis',        // 행50 화상
  ],

  // ── 수술 ─────────────────────────────────────────────────────────────────
  // 암치료(20-28) + 2대질병 수술/처치(35-37) + 수술비(45-48)
  수술: [
    // 암 수술·치료
    'cancer_surgery',        // 행20 암수술
    'cancer_davinci',        // 행21 다빈치로봇수술
    'cancer_radiation',      // 행22 항암방사선
    'cancer_hadron',         // 행23 중입자방사선
    'cancer_proton',         // 행24 양성자방사선
    'cancer_imrt',           // 행25 세기조절방사선
    'cancer_chemo',          // 행26 항암약물
    'cancer_targeted',       // 행27 표적항암약물
    'cancer_cart',           // 행28 카티항암약물
    // 2대질병 수술·처치
    'two_major_surgery',     // 행35 수술/시술비
    'two_major_thrombolysis',// 행36 혈전용해치료
    'two_major_icu',         // 행37 중환자실치료
    // 수술비
    'surgery_disease',       // 행45 질병 수술비
    'surgery_injury',        // 행46 상해 수술비
    'surgery_1_5',           // 행47 1-5종 수술비
    'surgery_n_major',       // 행48 111대질병 수술비
  ],

  // ── 입원 ─────────────────────────────────────────────────────────────────
  // 입원일당(51-52)
  입원: [
    'hospital_disease_daily', // 행51 질병 입원일당
    'hospital_injury_daily',  // 행52 상해 입원일당
  ],

  // ── 간병 ─────────────────────────────────────────────────────────────────
  // 병원 간병인 사용(53) — 급성기 병원 입원 중 간병인 비용
  간병: [
    'nursing_hospital',       // 행53 병원 간병인 사용
  ],

  // ── 재가 ─────────────────────────────────────────────────────────────────
  // 요양병원(54) + 간호간병통합(55) — 장기 요양·통합 간병 서비스
  재가: [
    'nursing_care_hospital',  // 행54 요양병원 간병인
    'nursing_integrated',     // 행55 간호간병통합서비스
  ],

  // ── 운전자 ───────────────────────────────────────────────────────────────
  // 운전자 특약(56-58)
  운전자: [
    'driver_fine',            // 행56 벌금
    'driver_lawyer',          // 행57 변호사선임비용
    'driver_accident',        // 행58 교통사고처리지원금
  ],

  // ── 실손 ─────────────────────────────────────────────────────────────────
  // 실손의료비(12-16)
  실손: [
    'silson_disease_inpatient',  // 행12 질병입원의료비
    'silson_disease_outpatient', // 행13 질병통원의료비
    'silson_injury_inpatient',   // 행14 상해입원의료비
    'silson_injury_outpatient',  // 행15 상해통원의료비
    'silson_3major',             // 행16 3대비급여 의료비
  ],

  // ── 기타 ─────────────────────────────────────────────────────────────────
  // 배상책임(59)
  기타: [
    'other_liability',        // 행59 일상생활배상책임
  ],

  // ── 주요치료비 ───────────────────────────────────────────────────────────
  // 암/뇌심 주요치료비(61-63)
  주요치료비: [
    'cancer_major_benefit',     // 행61 암주요치료비(급여)
    'cancer_major_nonbenefit',  // 행62 암주요치료비(비급여)
    'vascular_major',           // 행63 뇌심(순환계)주요치료비
  ],
}


// ── 제안서 불러오기: 메트릭키 → rowKey 역매핑 ─────────────────────────
const METRIC_TO_ROW_KEY: Record<string, string> = {
  cancer: 'cancer_general', minorCancer: 'cancer_similar',
  brain: 'brain_stroke', heart: 'heart_acute_mi',
  injurySurgery: 'surgery_injury', diseaseSurgery: 'surgery_disease',
  diseaseTypeSurgery: 'surgery_1_5', diseaseNSurgery: 'surgery_n_major',
  chemoDrug: 'cancer_chemo', chemoRadiation: 'cancer_radiation',
  targetDrug: 'cancer_targeted', heavyIon: 'cancer_hadron',
  robotCancerSurgery: 'cancer_davinci',
  cancerMajorTreatmentGeneral: 'cancer_major_benefit',
  cancerMajorTreatmentNonCovered: 'cancer_major_nonbenefit',
  twoMajorTreatmentComprehensive: 'vascular_major',
  care: 'nursing_hospital', liability: 'other_liability',
  trafficSupport: 'driver_accident', lawyer: 'driver_lawyer', finePerson: 'driver_fine',
}
type ProposalDraftPlan = {
  company: string; productName: string; monthlyPremium: string
  paymentYears: string
  metrics: Record<string, string>
  customCoverages?: Array<{ name: string; amount: string }>
}
type ProposalDraftItem = {
  id: string; title?: string; savedAt: string
  customerName?: string; templateId?: string
  plans?: ProposalDraftPlan[]
}
const PROPOSAL_DRAFTS_KEY_PREFIX = 'metarich_proposal_drafts'

function planToProContract(plan: ProposalDraftPlan, draftId: string, idx: number): ProContract {
  const coverages: ProCoverage[] = []
  for (const [mKey, amtStr] of Object.entries(plan.metrics || {})) {
    const rowKey = METRIC_TO_ROW_KEY[mKey]
    if (rowKey && Number(amtStr) > 0)
      coverages.push({ id: `pi-${draftId}-${idx}-${rowKey}`, contractId: '', rowKey, name: ROW_KEY_LABEL[rowKey] ?? rowKey, amount: Number(amtStr) })
  }
  for (const cc of plan.customCoverages || [])
    if (cc.name && cc.amount)
      coverages.push({ id: `pi-cc-${draftId}-${cc.name}`, contractId: '', rowKey: 'unknown', name: cc.name, amount: Number(cc.amount) || 0 })
  return {
    id: `proposal-import-${draftId}-${idx}`,
    company: plan.company || '제안 보험사', productName: plan.productName || '제안 상품',
    paymentPeriod: plan.paymentYears || undefined,
    monthlyPremium: Number(plan.monthlyPremium) || 0, coverages, status: 'active',
  }
}

const COVERAGE_TABS: CoverageTab[] = ['진단', '수술', '입원', '간병', '재가', '기타', '운전자', '실손', '주요치료비']

// ── 신규 상품 추가 폼 초기값 ───────────────────────────────────────────
function emptyAddForm() {
  return {
    company: '',
    productName: '',
    monthlyPremium: '',
    paymentYears: '',   // 납입기간(숫자) — 예: 20
    expiryAge: '',      // 만기나이(숫자) — 예: 80
    coverageInputs: [] as { rowKey: string; amount: string }[],
  }
}

export default function RemodelComparison({
  contracts,
  proposal,
  onChange,
  userId,
}: {
  contracts: ProContract[]
  proposal: RemodelProposal
  onChange: (proposal: RemodelProposal) => void
  userId?: string
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showProposalPicker, setShowProposalPicker] = useState(false)
  const [proposalDrafts, setProposalDrafts] = useState<ProposalDraftItem[]>([])
  const [form, setForm] = useState(emptyAddForm)
  const [coverageTab, setCoverageTab] = useState<CoverageTab>('진단')

  const currentPremium = contracts.reduce((sum, c) => sum + Number(c.monthlyPremium || 0), 0)
  const removedPremium = contracts
    .filter((c) => proposal.removeContractIds.includes(c.id))
    .reduce((sum, c) => sum + Number(c.monthlyPremium || 0), 0)
  const addedPremium = proposal.addContracts.reduce((sum, c) => sum + Number(c.monthlyPremium || 0), 0)
  const afterPremium = currentPremium - removedPremium + addedPremium

  const toggleRemove = (id: string) => {
    const exists = proposal.removeContractIds.includes(id)
    onChange({
      ...proposal,
      removeContractIds: exists
        ? proposal.removeContractIds.filter((item) => item !== id)
        : [...proposal.removeContractIds, id],
    })
  }

  const removeAddedContract = (id: string) => {
    onChange({ ...proposal, addContracts: proposal.addContracts.filter((c) => c.id !== id) })
  }

  // ── 담보 추가/제거 ────────────────────────────────────────────────────
  const toggleCoverageInput = (rowKey: string) => {
    const exists = form.coverageInputs.some((ci) => ci.rowKey === rowKey)
    setForm((prev) => ({
      ...prev,
      coverageInputs: exists
        ? prev.coverageInputs.filter((ci) => ci.rowKey !== rowKey)
        : [...prev.coverageInputs, { rowKey, amount: '' }],
    }))
  }

  const updateCoverageAmount = (rowKey: string, amount: string) => {
    setForm((prev) => ({
      ...prev,
      coverageInputs: prev.coverageInputs.map((ci) =>
        ci.rowKey === rowKey ? { ...ci, amount } : ci
      ),
    }))
  }

  // ── 납입기간 문자열 생성 ─────────────────────────────────────────────
  function buildPaymentPeriod(years: string, age: string): string | undefined {
    const y = years.trim()
    const a = age.trim()
    if (y && a) return `${y}년납/${a}세만기`
    if (y) return `${y}년납`
    if (a) return `${a}세만기`
    return undefined
  }

  // ── 신규 상품 저장 ────────────────────────────────────────────────────
  const saveAddedContract = () => {
    if (!form.company.trim() || !form.productName.trim()) {
      alert('보험사와 상품명을 입력해주세요.')
      return
    }
    const premium = Number(form.monthlyPremium) || 0
    const coverages: ProCoverage[] = form.coverageInputs
      .filter((ci) => ci.amount !== '' && Number(ci.amount) > 0)
      .map((ci) => ({
        id: `new-${Date.now()}-${ci.rowKey}`,
        contractId: '',
        rowKey: ci.rowKey,
        name: ROW_KEY_LABEL[ci.rowKey] ?? ci.rowKey,
        amount: Number(ci.amount),
      }))

    const newContract: ProContract = {
      id: `remodel-${Date.now()}`,
      company: form.company.trim(),
      productName: form.productName.trim(),
      paymentPeriod: buildPaymentPeriod(form.paymentYears, form.expiryAge),
      monthlyPremium: premium,
      coverages,
      status: 'active',
    }

    onChange({ ...proposal, addContracts: [...proposal.addContracts, newContract] })
    setForm(emptyAddForm())
    setCoverageTab('진단')
    setShowAddForm(false)
  }

  // 현재 탭의 담보 목록
  const tabCoverages = COVERAGE_TAB_KEYS[coverageTab]
    .filter((rk) => rk in ROW_KEY_LABEL)
    .map((rk) => ({ rowKey: rk, label: ROW_KEY_LABEL[rk] }))

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ── 보험료 요약 — Foliio 스타일 ──────────────────────────── */}
      <div className="coverage-pro-card" style={{ overflow: 'hidden' }}>
        {/* 다크 헤더 배너 */}
        <div style={{
          background: 'linear-gradient(135deg, #1a2744 0%, #2d4a8a 100%)',
          padding: '16px 24px 0',
        }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
            맞춤형 보장 점검 및 리모델링 제안서
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginBottom: 16 }}>
            비효율적인 보장은 비우고, 핵심 보장으로 든든하게 채웠습니다
          </div>

          {/* 3열 보험료 비교 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {/* 기존 */}
            <div style={{ padding: '16px 0', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 700, marginBottom: 6 }}>기존 월 보험료</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{formatWon(currentPremium)}</div>
            </div>
            {/* 차액 */}
            <div style={{
              padding: '12px 0 14px',
              textAlign: 'center',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(201,169,110,0.15)',
            }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 700, marginBottom: 4 }}>리모델링 차액</div>
              <div style={{
                display: 'inline-block',
                background: '#c9a96e', color: '#1a2744',
                borderRadius: 9999, padding: '4px 16px',
                fontSize: 18, fontWeight: 900,
                marginBottom: 2,
              }}>
                {afterPremium - currentPremium === 0
                  ? '변동없음'
                  : `${afterPremium < currentPremium ? '−' : '+'}${formatWon(Math.abs(afterPremium - currentPremium))}`}
              </div>
            </div>
            {/* 제안 */}
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 700, marginBottom: 6 }}>제안 월 보험료</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: afterPremium < currentPremium ? '#10b981' : '#fff' }}>
                {formatWon(afterPremium)}
              </div>
            </div>
          </div>
        </div>

        {/* 해지/추가 요약 바 */}
        <div style={{ display: 'flex', gap: 0, borderTop: '1px solid #e2e8f0' }}>
          <div style={{ flex: 1, padding: '10px 16px', borderRight: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>해지 예정</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#ef4444', marginLeft: 8 }}>−{formatWon(removedPremium)}</span>
          </div>
          <div style={{ flex: 1, padding: '10px 16px' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>신규 추가</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#10b981', marginLeft: 8 }}>+{formatWon(addedPremium)}</span>
          </div>
        </div>
      </div>

      {/* ── 현재 계약 유지/해지 ─────────────────────────────────────── */}
      <div className="coverage-pro-card coverage-pro-card-pad">
        <div className="coverage-pro-section-title">현재 계약 — 유지 / 해지</div>
        <div className="coverage-pro-table-wrap">
          <table className="coverage-pro-table">
            <thead>
              <tr><th>유지/해지</th><th>보험사</th><th>상품명</th><th>월 보험료</th></tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const isRemoving = proposal.removeContractIds.includes(contract.id)
                return (
                  <tr key={contract.id} style={{ opacity: isRemoving ? 0.5 : 1 }}>
                    <td>
                      <button
                        type="button"
                        className={`coverage-pro-btn${isRemoving ? '' : ' primary'}`}
                        style={isRemoving ? { background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca' } : {}}
                        onClick={() => toggleRemove(contract.id)}
                      >
                        {isRemoving ? '해지 예정' : '유지'}
                      </button>
                    </td>
                    <td>{contract.company}</td>
                    <td>{contract.productName}</td>
                    <td>{formatWon(contract.monthlyPremium)}</td>
                  </tr>
                )
              })}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: 28 }}>
                    리모델링할 계약이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 신규 추가 상품 목록 ─────────────────────────────────────── */}
      {proposal.addContracts.length > 0 && (
        <div className="coverage-pro-card coverage-pro-card-pad">
          <div className="coverage-pro-section-title">신규 추가 상품</div>
          <div className="coverage-pro-table-wrap">
            <table className="coverage-pro-table">
              <thead>
                <tr><th>보험사</th><th>상품명</th><th>납입/만기</th><th>월 보험료</th><th>담보 수</th><th>삭제</th></tr>
              </thead>
              <tbody>
                {proposal.addContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td>{contract.company}</td>
                    <td>{contract.productName}</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{contract.paymentPeriod || '—'}</td>
                    <td style={{ color: '#10b981', fontWeight: 700 }}>{formatWon(contract.monthlyPremium)}</td>
                    <td>{contract.coverages.length}개</td>
                    <td>
                      <button
                        type="button"
                        className="coverage-pro-btn"
                        style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca' }}
                        onClick={() => removeAddedContract(contract.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 상품 추가 버튼 ──────────────────────────────────────────── */}
      {!showAddForm && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="coverage-pro-btn primary"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setShowAddForm(true)}
          >
            + 신규 상품 추가
          </button>
          <button
            type="button"
            className="coverage-pro-btn"
            style={{ alignSelf: 'flex-start', background: '#f0f4ff', color: '#1a2744', border: '1px solid #c7d7f5' }}
            onClick={() => {
              if (typeof window === 'undefined') return
              const key = `${PROPOSAL_DRAFTS_KEY_PREFIX}_${userId || 'guest'}`
              try {
                const drafts = JSON.parse(window.localStorage.getItem(key) || '[]')
                setProposalDrafts(Array.isArray(drafts) ? drafts : [])
              } catch { setProposalDrafts([]) }
              setShowProposalPicker(true)
            }}
          >
            📋 제안서 불러오기
          </button>
        </div>
      )}

      {/* ── 신규 상품 추가 폼 ─────────────────────────────────────── */}
      {showAddForm && (
        <div className="coverage-pro-card coverage-pro-card-pad" style={{ border: '2px solid #c9a96e' }}>
          <div className="coverage-pro-section-title" style={{ color: '#c9a96e' }}>신규 상품 정보 입력</div>

          {/* 기본 정보 */}
          <div className="coverage-pro-grid-2" style={{ marginBottom: 16 }}>
            <div className="coverage-pro-field">
              <label>보험사 <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                className="coverage-pro-input"
                placeholder="예: 삼성화재"
                value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
              />
            </div>
            <div className="coverage-pro-field">
              <label>상품명 <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                className="coverage-pro-input"
                placeholder="예: 다이렉트 운전자보험"
                value={form.productName}
                onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))}
              />
            </div>
            <div className="coverage-pro-field">
              <label>월 보험료 (원)</label>
              <input
                className="coverage-pro-input"
                type="number"
                placeholder="예: 35000"
                value={form.monthlyPremium}
                onChange={(e) => setForm((p) => ({ ...p, monthlyPremium: e.target.value }))}
              />
            </div>
            {/* 납입기간 + 만기 — 숫자 입력 */}
            <div className="coverage-pro-field">
              <label>납입기간 / 만기</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                  <input
                    className="coverage-pro-input"
                    type="number"
                    min={1}
                    max={100}
                    placeholder="20"
                    value={form.paymentYears}
                    onChange={(e) => setForm((p) => ({ ...p, paymentYears: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: 13, color: '#4b5563', whiteSpace: 'nowrap' }}>년납</span>
                </div>
                <span style={{ color: '#94a3b8' }}>/</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                  <input
                    className="coverage-pro-input"
                    type="number"
                    min={1}
                    max={120}
                    placeholder="80"
                    value={form.expiryAge}
                    onChange={(e) => setForm((p) => ({ ...p, expiryAge: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: 13, color: '#4b5563', whiteSpace: 'nowrap' }}>세만기</span>
                </div>
              </div>
              {(form.paymentYears || form.expiryAge) && (
                <div style={{ fontSize: 11, color: '#c9a96e', marginTop: 4 }}>
                  → {buildPaymentPeriod(form.paymentYears, form.expiryAge)}
                </div>
              )}
            </div>
          </div>

          {/* ── 담보 선택 — 탭 ─────────────────────────────────────── */}
          <div className="coverage-pro-section-title" style={{ fontSize: 13, marginTop: 8 }}>
            담보 선택 ({form.coverageInputs.length}개 선택됨)
          </div>

          {/* 탭 버튼 */}
          <div style={{
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap',
            marginBottom: 12,
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: 0,
          }}>
            {COVERAGE_TABS.map((tab) => {
              const count = COVERAGE_TAB_KEYS[tab].filter((rk) =>
                form.coverageInputs.some((ci) => ci.rowKey === rk)
              ).length
              const isActive = coverageTab === tab
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setCoverageTab(tab)}
                  style={{
                    padding: '7px 14px',
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    border: 'none',
                    borderBottom: isActive ? '2px solid #1a2744' : '2px solid transparent',
                    background: 'transparent',
                    color: isActive ? '#1a2744' : '#64748b',
                    cursor: 'pointer',
                    marginBottom: -2,
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  {tab}
                  {count > 0 && (
                    <span style={{
                      marginLeft: 4,
                      background: '#1a2744',
                      color: '#fff',
                      borderRadius: 9,
                      fontSize: 10,
                      padding: '1px 6px',
                      fontWeight: 700,
                    }}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 탭 내 담보 체크리스트 */}
          <div style={{
            maxHeight: 240,
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '6px 0',
            background: '#fafaf8',
            marginBottom: 12,
          }}>
            {tabCoverages.length === 0 ? (
              <div style={{ padding: 20, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                이 카테고리에 담보가 없습니다.
              </div>
            ) : tabCoverages.map(({ rowKey, label }) => {
              const selected = form.coverageInputs.some((ci) => ci.rowKey === rowKey)
              return (
                <label
                  key={rowKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 14px',
                    cursor: 'pointer',
                    background: selected ? '#eef5ff' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleCoverageInput(rowKey)}
                    style={{ accentColor: '#1a2744' }}
                  />
                  <span style={{ fontSize: 13, color: selected ? '#1a2744' : '#4b5563' }}>
                    {label}
                  </span>
                </label>
              )
            })}
          </div>

          {/* 선택된 담보 — 금액 입력 */}
          {form.coverageInputs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
                ✓ 선택된 담보 금액 입력 (만원 단위)
              </div>
              <div style={{
                maxHeight: 220,
                overflowY: 'auto',
                display: 'grid',
                gap: 6,
              }}>
                {form.coverageInputs.map((ci) => (
                  <div key={ci.rowKey} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 13, color: '#1a2744', fontWeight: 500 }}>
                      {ROW_KEY_LABEL[ci.rowKey]}
                    </span>
                    <input
                      className="coverage-pro-input"
                      type="number"
                      placeholder="금액(만원)"
                      value={ci.amount}
                      onChange={(e) => updateCoverageAmount(ci.rowKey, e.target.value)}
                      style={{ width: 130 }}
                    />
                    <button
                      type="button"
                      className="coverage-pro-btn"
                      style={{ padding: '4px 10px', fontSize: 12, color: '#ef4444' }}
                      onClick={() => toggleCoverageInput(ci.rowKey)}
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="coverage-pro-actions" style={{ marginTop: 16, justifyContent: 'flex-start' }}>
            <button type="button" className="coverage-pro-btn primary" onClick={saveAddedContract}>
              상품 추가 저장
            </button>
            <button
              type="button"
              className="coverage-pro-btn"
              onClick={() => { setShowAddForm(false); setForm(emptyAddForm()); setCoverageTab('진단') }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 제안 메모 ─────────────────────────────────────────────── */}
      <div className="coverage-pro-card coverage-pro-card-pad">
        <div className="coverage-pro-section-title">제안 메모 (PDF에 인쇄)</div>
        <textarea
          className="coverage-pro-textarea"
          value={proposal.memo}
          onChange={(e) => onChange({ ...proposal, memo: e.target.value })}
          placeholder="해지 이유, 보완 사유, 고객 희망 보험료, 시나리오 설명 등을 정리하세요. PDF 시나리오 페이지에 포함됩니다."
        />
      </div>

      {/* ── 제안서 불러오기 모달 ──────────────────────────────────── */}
      {showProposalPicker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, width: 560, maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15, color: '#1a2744' }}>제안서 불러오기</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>저장된 제안서의 상품을 신규 추가로 가져옵니다</div>
              </div>
              <button onClick={() => setShowProposalPicker(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {proposalDrafts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0', fontSize: 14 }}>
                  저장된 제안서가 없습니다.<br/>
                  <span style={{ fontSize: 12 }}>제안서 페이지에서 저장 후 다시 시도하세요.</span>
                </div>
              ) : proposalDrafts.map((draft) => {
                const date = new Date(draft.savedAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                const planCount = draft.plans?.length || 0
                return (
                  <div
                    key={draft.id}
                    style={{
                      border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px',
                      marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1a2744')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                    onClick={() => {
                      if (!draft.plans || draft.plans.length === 0) { alert('상품 정보가 없는 제안서입니다.'); return }
                      const newContracts = draft.plans.map((p, i) => planToProContract(p, draft.id, i))
                      onChange({ ...proposal, addContracts: [...proposal.addContracts, ...newContracts] })
                      setShowProposalPicker(false)
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#1a2744' }}>
                          {draft.customerName || '고객명 없음'} · {draft.title || '제안서'}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                          상품 {planCount}개 · {date}
                        </div>
                        {draft.plans && draft.plans.length > 0 && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                            {draft.plans.slice(0, 3).map((p, i) => (
                              <span key={i}>{i > 0 ? ' / ' : ''}{p.company} {p.productName}</span>
                            ))}
                            {draft.plans.length > 3 ? ` 외 ${draft.plans.length - 3}개` : ''}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: '#c9a96e', fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 8 }}>불러오기 →</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button
                onClick={() => setShowProposalPicker(false)}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
              >닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatWon(value: number) {
  return value ? `${Math.round(value).toLocaleString()}원` : '-'
}

function buildPaymentPeriod(years: string, age: string): string | undefined {
  const y = years.trim()
  const a = age.trim()
  if (y && a) return `${y}년납/${a}세만기`
  if (y) return `${y}년납`
  if (a) return `${a}세만기`
  return undefined
}
