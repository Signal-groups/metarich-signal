'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type {
  OutputConfig, ProContract, ProCustomer, ProSession,
  RemodelProposal, StepNumber, StepStatus,
} from '../../../lib/coverageAnalysis/types'
import { createProSession, saveProSession } from '../../../lib/coverageAnalysis/session'
import { supabase } from '../../../lib/supabase'
import { inferClientRowKey } from '../../../lib/coverageAnalysis/clientMapping'
import ProSidebar from './ProSidebar'
import StepIndicator from './StepIndicator'
import CustomerSelector from './CustomerSelector'
import ContractList from './ContractList'
import CoverageGrid from './CoverageGrid'
import AnalysisChart from './AnalysisChart'
import RemodelComparison from './RemodelComparison'
import ExcelDownloadBtn from './ExcelDownloadBtn'
import PdfExportBtn from './PdfExportBtn'
import SessionList from './SessionList'

const STORAGE_KEY   = 'coverage-pro-draft-session'
const SESSION_ID_KEY = 'coverage-pro-session-id'
const DEBOUNCE_MS   = 1500

const defaultProposal: RemodelProposal      = { addContracts: [], removeContractIds: [], memo: '' }
const defaultOutputConfig: OutputConfig     = { outputType: 'excel', includeGraph: true, includeRemodel: true }

function readDraft() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as {
      customer?: ProCustomer
      contracts?: ProContract[]
      stepStatus?: Partial<Record<StepNumber, StepStatus>>
      proposal?: RemodelProposal
      outputConfig?: OutputConfig
    } | null
  } catch { return null }
}

// ── GPTs JSON 파서 ──────────────────────────────────────────────────────
function parseGptsJson(raw: string): ProContract[] | null {
  try {
    const parsed = JSON.parse(raw)
    const arr = Array.isArray(parsed) ? parsed : parsed.contracts ?? parsed.data ?? []
    if (!Array.isArray(arr) || arr.length === 0) return null
    return arr.map((item: Record<string, unknown>, idx: number) => {
      const coverages = Array.isArray(item.coverages)
        ? (item.coverages as Array<Record<string, unknown>>).map((cov, ci) => {
            const name = String(cov.name ?? cov.담보명 ?? '')
            return {
              id: `json-cov-${idx}-${ci}`,
              contractId: '',
              rowKey: inferClientRowKey(name) ?? 'unknown',
              name,
              amount: Number(cov.amount ?? cov.가입금액 ?? 0),
              expiryDate: String(cov.expiryDate ?? cov.만기 ?? ''),
              isRenewal: Boolean(cov.isRenewal ?? false),
            }
          })
        : []
      return {
        id: `json-${idx}-${Date.now()}`,
        company: String(item.company ?? item.보험사 ?? ''),
        productName: String(item.productName ?? item.상품명 ?? ''),
        policyHolder: String(item.policyHolder ?? item.계약자 ?? ''),
        contractDate: String(item.contractDate ?? item.계약일 ?? ''),
        paymentPeriod: String(item.paymentPeriod ?? item.납입기간 ?? ''),
        monthlyPremium: Number(item.monthlyPremium ?? item.월보험료 ?? 0),
        isRenewal: Boolean(item.isRenewal ?? false),
        status: 'active' as const,
        coverages,
      }
    })
  } catch { return null }
}

export default function CoverageProWorkspace({ initialStep = 1 }: { initialStep?: StepNumber }) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const requestedCustomerId = searchParams.get('customerId') || ''
  const draft = useMemo(() => readDraft(), [])

  const [currentStep,  setCurrentStep]  = useState<StepNumber>(initialStep)
  const [customer,     setCustomer]     = useState<ProCustomer | undefined>(() => draft?.customer)
  const [contracts,    setContracts]    = useState<ProContract[]>(() => draft?.contracts || [])
  const [stepStatus,   setStepStatus]   = useState<Partial<Record<StepNumber, StepStatus>>>(
    () => draft?.stepStatus || { 1: requestedCustomerId ? 'warning' : 'pending' }
  )
  const [proposal,     setProposal]     = useState<RemodelProposal>(() => draft?.proposal || defaultProposal)
  const [outputConfig, setOutputConfig] = useState<OutputConfig>(() => draft?.outputConfig || defaultOutputConfig)
  const [saveStatus,   setSaveStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // ── 신규 고객 등록 폼 상태 ──────────────────────────────────────────
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCust, setNewCust] = useState({ name: '', phone: '', birth: '', gender: 'M' as 'M' | 'F' })
  const [newCustSaving, setNewCustSaving] = useState(false)

  // ── JSON 붙여넣기 상태 ───────────────────────────────────────────────
  const [showJsonPaste, setShowJsonPaste] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState('')

  const sessionRef   = useRef<ProSession | null>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef   = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(SESSION_ID_KEY) : null
      if (savedId) {
        const now = new Date().toISOString()
        sessionRef.current = {
          id: savedId, advisorId: session.user.id,
          customerId: draft?.customer?.id, customerSnapshot: draft?.customer,
          contracts: draft?.contracts || [], currentStep: initialStep,
          stepStatus: draft?.stepStatus || {}, remodelProposal: draft?.proposal,
          outputConfig: draft?.outputConfig, version: 1, createdAt: now, updatedAt: now,
        }
        return
      }
      const newSession = await createProSession(session.user.id, draft?.customer?.id)
      if (newSession) { sessionRef.current = newSession; localStorage.setItem(SESSION_ID_KEY, newSession.id) }
    }
    void init()
  }, [draft, initialStep])

  const persistState = useCallback((
    nextCustomer: ProCustomer | undefined, nextContracts: ProContract[],
    nextStepStatus: Partial<Record<StepNumber, StepStatus>>,
    nextProposal: RemodelProposal, nextOutputConfig: OutputConfig, nextCurrentStep: StepNumber,
  ) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      customer: nextCustomer, contracts: nextContracts,
      stepStatus: nextStepStatus, proposal: nextProposal, outputConfig: nextOutputConfig,
    }))
    if (!sessionRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    window.setTimeout(() => setSaveStatus('saving'), 0)
    debounceRef.current = setTimeout(async () => {
      if (!sessionRef.current) return
      const updated: ProSession = {
        ...sessionRef.current, customerSnapshot: nextCustomer, customerId: nextCustomer?.id,
        contracts: nextContracts, currentStep: nextCurrentStep, stepStatus: nextStepStatus,
        remodelProposal: nextProposal, outputConfig: nextOutputConfig, updatedAt: new Date().toISOString(),
      }
      sessionRef.current = updated
      const ok = await saveProSession(updated)
      setSaveStatus(ok ? 'saved' : 'error')
      if (ok) setTimeout(() => setSaveStatus('idle'), 2000)
    }, DEBOUNCE_MS)
  }, [])

  useEffect(() => {
    persistState(customer, contracts, stepStatus, proposal, outputConfig, currentStep)
  }, [customer, contracts, currentStep, outputConfig, persistState, proposal, stepStatus])

  const stats = useMemo(() => {
    const premium      = contracts.reduce((sum, c) => sum + Number(c.monthlyPremium || 0), 0)
    const coverageCount = contracts.reduce((sum, c) => sum + c.coverages.length, 0)
    const mapped       = contracts.flatMap((c) => c.coverages).filter((cov) => cov.rowKey !== 'unknown').length
    return { premium, coverageCount, mapped }
  }, [contracts])

  const moveStep = (step: StepNumber) => {
    setCurrentStep(step)
    router.replace(`/coverage-pro/local/step-${step}`, { scroll: false })
  }

  const nextStep = () => {
    const next = Math.min(7, currentStep + 1) as StepNumber
    setStepStatus((prev) => ({
      ...prev,
      [currentStep]: getStepState(currentStep, customer, contracts),
      [next]: prev[next] || 'pending',
    }))
    moveStep(next)
  }

  const handleLoaded = (payload: { customer: ProCustomer; contracts: ProContract[] }) => {
    setCustomer(payload.customer)
    setContracts(payload.contracts)
    setStepStatus((prev) => ({
      ...prev, 1: 'done', 2: 'done',
      3: payload.contracts.length ? 'done' : 'warning', 4: 'pending',
    }))
  }

  const startWithoutCustomer = () => {
    setCustomer(undefined); setContracts([])
    setStepStatus((prev) => ({ ...prev, 1: 'warning', 2: 'pending' }))
    moveStep(2)
  }

  const handleSessionSelect = (session: ProSession) => {
    sessionRef.current = session
    localStorage.setItem(SESSION_ID_KEY, session.id)
    setCustomer(session.customerSnapshot)
    setContracts(session.contracts ?? [])
    setStepStatus(session.stepStatus ?? {})
    setProposal(session.remodelProposal ?? defaultProposal)
    setOutputConfig(session.outputConfig ?? defaultOutputConfig)
    moveStep(session.currentStep)
  }

  // ── 신규고객 Supabase 저장 ──────────────────────────────────────────
  const handleSaveNewCustomer = async () => {
    if (!newCust.name.trim()) { alert('고객명을 입력해주세요.'); return }
    setNewCustSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { alert('로그인이 필요합니다.'); return }
      const { data, error } = await supabase.from('customers').insert({
        name: newCust.name.trim(), phone: newCust.phone.trim() || null,
        birth_date: newCust.birth || null, gender: newCust.gender,
        advisor_id: session.user.id,
      }).select('*').single()
      if (error) throw error
      const proCustomer: ProCustomer = {
        id: data.id, name: data.name, phone: data.phone ?? '',
        birth: data.birth_date ?? '', gender: data.gender ?? 'M',
        advisorId: session.user.id,
      }
      setCustomer(proCustomer)
      setStepStatus((prev) => ({ ...prev, 1: 'done', 2: 'pending' }))
      setNewCust({ name: '', phone: '', birth: '', gender: 'M' })
      setShowNewCustomer(false)
    } catch (err) {
      console.error(err)
      alert('고객 등록에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setNewCustSaving(false)
    }
  }

  // ── JSON 붙여넣기 처리 ──────────────────────────────────────────────
  const GPTS_URL = 'https://chatgpt.com/g/g-6a0c10ad0478819192a11b8ffc28c760-boheomyi-gijun-bojangbunseog-ai'

  const handleJsonApply = (append = false) => {
    setJsonError('')
    const parsed = parseGptsJson(jsonText)
    if (!parsed) { setJsonError('JSON 형식이 올바르지 않습니다. GPTs 출력 형식을 확인해주세요.'); return }
    if (parsed.length === 0) { setJsonError('계약 데이터가 없습니다.'); return }
    if (append) {
      setContracts(prev => [...prev, ...parsed])
    } else {
      setContracts(parsed)
    }
    setStepStatus((prev) => ({ ...prev, 3: 'done', 4: 'pending' }))
    setJsonText('')
    setShowJsonPaste(false)
    if (currentStep === 1) moveStep(3)
  }

  return (
    <div className="coverage-pro-layout">
      <ProSidebar currentStep={currentStep} stepStatus={stepStatus} onMove={moveStep} />
      <main className="coverage-pro-main">
        <div className="coverage-pro-inner">
          <StepIndicator stepStatus={stepStatus} />

          {/* ── 상단 헤더 ── */}
          <div className="coverage-pro-top">
            <div>
              <div className="coverage-pro-kicker">COVERAGE ANALYSIS PRO</div>
              <div className="coverage-pro-title">{titleByStep(currentStep)}</div>
              <div className="coverage-pro-subtitle">
                {customer
                  ? `${customer.name} 고객 기준으로 보장분석 세션을 진행합니다.`
                  : 'CRM 고객을 불러오거나 신규 등록 후 분석을 시작하세요.'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {saveStatus !== 'idle' && (
                <span style={{
                  fontSize: 11,
                  color: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#94a3b8',
                }}>
                  {saveStatus === 'saving' ? '저장 중...' : saveStatus === 'saved' ? '클라우드 저장됨' : '저장 실패'}
                </span>
              )}
              <div className="coverage-pro-actions">
                <button
                  type="button" className="coverage-pro-btn"
                  onClick={() => moveStep(Math.max(1, currentStep - 1) as StepNumber)}
                  disabled={currentStep === 1}
                >이전</button>
                <button
                  type="button" className="coverage-pro-btn primary"
                  onClick={nextStep}
                >{currentStep === 7 ? '완료' : '다음 단계'}</button>
              </div>
            </div>
          </div>

          {/* ── 요약 스탯 ── */}
          <div className="coverage-pro-stat-grid">
            <div className="coverage-pro-stat"><span>고객</span><b>{customer?.name || '미지정'}</b></div>
            <div className="coverage-pro-stat"><span>보험계약</span><b>{contracts.length}건</b></div>
            <div className="coverage-pro-stat"><span>매핑 담보</span><b>{stats.mapped}/{stats.coverageCount}</b></div>
            <div className="coverage-pro-stat"><span>월 보험료</span><b>{formatWon(stats.premium)}</b></div>
          </div>

          {/* ══════════════ STEP 1 — 고객 선택 ════════════════════════ */}
          {currentStep === 1 && (
            <div style={{ display: 'grid', gap: 14 }}>
              {/* CRM 고객 불러오기 */}
              <CustomerSelector
                selectedCustomer={customer}
                requestedCustomerId={requestedCustomerId}
                onLoaded={handleLoaded}
              />

              {/* 신규 고객 등록 */}
              <div className="coverage-pro-card coverage-pro-card-pad">
                <div className="coverage-pro-section-title">신규 고객 등록</div>
                {!showNewCustomer ? (
                  <>
                    <div className="coverage-pro-muted">CRM에 없는 고객을 바로 등록하고 분석을 시작합니다.</div>
                    <button
                      type="button" className="coverage-pro-btn"
                      style={{ marginTop: 12 }}
                      onClick={() => setShowNewCustomer(true)}
                    >+ 신규 고객 등록</button>
                  </>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div className="coverage-pro-grid-2">
                      <div className="coverage-pro-field">
                        <label>고객명 <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                          className="coverage-pro-input"
                          placeholder="홍길동"
                          value={newCust.name}
                          onChange={(e) => setNewCust((p) => ({ ...p, name: e.target.value }))}
                        />
                      </div>
                      <div className="coverage-pro-field">
                        <label>연락처</label>
                        <input
                          className="coverage-pro-input"
                          placeholder="010-0000-0000"
                          value={newCust.phone}
                          onChange={(e) => setNewCust((p) => ({ ...p, phone: e.target.value }))}
                        />
                      </div>
                      <div className="coverage-pro-field">
                        <label>생년월일</label>
                        <input
                          className="coverage-pro-input"
                          type="date"
                          value={newCust.birth}
                          onChange={(e) => setNewCust((p) => ({ ...p, birth: e.target.value }))}
                        />
                      </div>
                      <div className="coverage-pro-field">
                        <label>성별</label>
                        <select
                          className="coverage-pro-input"
                          value={newCust.gender}
                          onChange={(e) => setNewCust((p) => ({ ...p, gender: e.target.value as 'M' | 'F' }))}
                        >
                          <option value="M">남성</option>
                          <option value="F">여성</option>
                        </select>
                      </div>
                    </div>
                    <div className="coverage-pro-actions">
                      <button
                        type="button" className="coverage-pro-btn primary"
                        disabled={newCustSaving} onClick={handleSaveNewCustomer}
                      >{newCustSaving ? '등록 중...' : 'CRM 등록 + 선택'}</button>
                      <button type="button" className="coverage-pro-btn"
                        onClick={() => { setShowNewCustomer(false); setNewCust({ name: '', phone: '', birth: '', gender: 'M' }) }}>
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* GPTs JSON 붙여넣기 */}
              <div className="coverage-pro-card coverage-pro-card-pad">
                <div className="coverage-pro-section-title">GPTs JSON 붙여넣기로 계약 자동 입력</div>
                {!showJsonPaste ? (
                  <>
                    <div className="coverage-pro-muted">
                      ChatGPT 보장분석 GPTs에서 출력한 JSON을 붙여넣으면 계약이 자동으로 입력됩니다.
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <button
                        type="button" className="coverage-pro-btn"
                        onClick={() => setShowJsonPaste(true)}
                      >JSON 붙여넣기</button>
                      <a
                        href={GPTS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="coverage-pro-btn"
                        style={{ background: '#10a37f', color: '#fff', border: 'none', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.032.067L9.67 19.95a4.5 4.5 0 0 1-6.07-1.645zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.843-3.369 2.02-1.168a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.402-.681zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>
                        GPTs 열기
                      </a>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <textarea
                      className="coverage-pro-textarea"
                      style={{ minHeight: 160, fontFamily: 'monospace', fontSize: 12 }}
                      placeholder={'[\n  {\n    "company": "삼성화재",\n    "productName": "실손보험",\n    "monthlyPremium": 35000,\n    "coverages": [\n      { "name": "질병입원의료비", "amount": 50000000 }\n    ]\n  }\n]'}
                      value={jsonText}
                      onChange={(e) => { setJsonText(e.target.value); setJsonError('') }}
                    />
                    {jsonError && (
                      <div style={{ color: '#ef4444', fontSize: 13 }}>{jsonError}</div>
                    )}
                    <div className="coverage-pro-actions">
                      <button type="button" className="coverage-pro-btn primary" onClick={() => handleJsonApply(false)}>
                        적용 — 계약 전체 교체
                      </button>
                      <button type="button" className="coverage-pro-btn"
                        style={{ background: '#0ea5e9', color: '#fff', border: 'none' }}
                        onClick={() => handleJsonApply(true)}>
                        + 추가 — 기존 계약에 더하기
                      </button>
                      <button type="button" className="coverage-pro-btn"
                        onClick={() => { setShowJsonPaste(false); setJsonText(''); setJsonError('') }}>
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 고객 없이 시작 */}
              <div className="coverage-pro-card coverage-pro-card-pad">
                <div className="coverage-pro-section-title">고객 없이 분석 시작</div>
                <div className="coverage-pro-muted">
                  먼저 보장분석을 만들고, 상담 후 고객을 나중에 지정하는 흐름으로도 사용할 수 있습니다.
                </div>
                <button type="button" className="coverage-pro-btn" style={{ marginTop: 12 }} onClick={startWithoutCustomer}>
                  미지정 분석으로 진행
                </button>
              </div>

              {/* 이전 세션 */}
              <SessionList onSelect={handleSessionSelect} />
            </div>
          )}

          {/* ══════════════ STEP 2 — 기본 정보 ═══════════════════════ */}
          {currentStep === 2 && (
            <div className="coverage-pro-card coverage-pro-card-pad">
              <div className="coverage-pro-section-title">기본 정보 확인</div>
              <div className="coverage-pro-grid-2">
                <Info label="고객명"   value={customer?.name || '-'} />
                <Info label="연락처"   value={customer?.phone || '-'} />
                <Info label="생년월일" value={customer?.birth || '-'} />
                <Info label="성별"     value={customer?.gender === 'M' ? '남성' : customer?.gender === 'F' ? '여성' : '-'} />
                <Info label="분석 연결" value={customer?.id ? 'CRM 고객 연결됨' : '고객 미지정'} />
              </div>
            </div>
          )}

          {/* ══════════════ STEP 3 — 현재 보험 ═══════════════════════ */}
          {currentStep === 3 && (
            <div style={{ display: 'grid', gap: 14 }}>
              <ContractList contracts={contracts} />
              {/* JSON 다시 붙여넣기 허용 */}
              {!showJsonPaste ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="coverage-pro-btn" style={{ alignSelf: 'flex-start' }}
                    onClick={() => setShowJsonPaste(true)}>
                    JSON 재입력 (GPTs)
                  </button>
                  <a
                    href={GPTS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="coverage-pro-btn"
                    style={{ background: '#10a37f', color: '#fff', border: 'none', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.032.067L9.67 19.95a4.5 4.5 0 0 1-6.07-1.645zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.843-3.369 2.02-1.168a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.402-.681zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>
                    GPTs 열기
                  </a>
                </div>
              ) : (
                <div className="coverage-pro-card coverage-pro-card-pad">
                  <div className="coverage-pro-section-title">GPTs JSON 재입력</div>
                  <textarea
                    className="coverage-pro-textarea"
                    style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 12 }}
                    value={jsonText}
                    onChange={(e) => { setJsonText(e.target.value); setJsonError('') }}
                  />
                  {jsonError && <div style={{ color: '#ef4444', fontSize: 13 }}>{jsonError}</div>}
                  <div className="coverage-pro-actions" style={{ marginTop: 10 }}>
                    <button type="button" className="coverage-pro-btn primary" onClick={() => handleJsonApply(false)}>
                      적용 — 전체 교체
                    </button>
                    <button type="button" className="coverage-pro-btn"
                      style={{ background: '#0ea5e9', color: '#fff', border: 'none' }}
                      onClick={() => handleJsonApply(true)}>
                      + 추가 — 기존에 더하기
                    </button>
                    <button type="button" className="coverage-pro-btn"
                      onClick={() => { setShowJsonPaste(false); setJsonText('') }}>취소</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ STEP 4 — 보장 확인 ═══════════════════════ */}
          {currentStep === 4 && <CoverageGrid contracts={contracts} />}

          {/* ══════════════ STEP 5 — 분석 결과 ═══════════════════════ */}
          {currentStep === 5 && <AnalysisChart contracts={contracts} />}

          {/* ══════════════ STEP 6 — 리모델링 ════════════════════════ */}
          {currentStep === 6 && (
            <RemodelComparison contracts={contracts} proposal={proposal} onChange={setProposal} />
          )}

          {/* ══════════════ STEP 7 — 출력 · 다운로드 ════════════════ */}
          {currentStep === 7 && (
            <div style={{ display: 'grid', gap: 14 }}>
              {/* 출력 형식 선택 */}
              <div className="coverage-pro-card coverage-pro-card-pad">
                <div className="coverage-pro-section-title">출력 형식 선택</div>
                <div className="coverage-pro-grid-3">
                  {([
                    ['excel',    '엑셀 1장',      '보장분석시트.xlsx — 모든 담보 포함'],
                    ['full_pdf', '전체 보장 리포트', '그래프·비율·회사별 비교 포함'],
                    ['key_pdf',  '주요보장 리포트',  '핵심 진단비·실손·운전자 중심'],
                  ] as const).map(([type, title, desc]) => (
                    <button
                      key={type}
                      type="button"
                      className={`coverage-pro-btn${outputConfig.outputType === type ? ' primary' : ''}`}
                      onClick={() => setOutputConfig((prev) => ({ ...prev, outputType: type }))}
                      style={{ minHeight: 90, textAlign: 'left' }}
                    >
                      <b>{title}</b>
                      <span style={{ display: 'block', marginTop: 6, fontSize: 12, opacity: 0.72 }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 포함 옵션 */}
              <div className="coverage-pro-card coverage-pro-card-pad">
                <div className="coverage-pro-section-title">포함 옵션</div>
                <div style={{ display: 'flex', gap: 20 }}>
                  {[
                    ['includeGraph',   '보장 그래프 포함'],
                    ['includeRemodel', '리모델링 제안 포함'],
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                      <input
                        type="checkbox"
                        checked={outputConfig[key as keyof OutputConfig] as boolean}
                        onChange={(e) => setOutputConfig((prev) => ({ ...prev, [key]: e.target.checked }))}
                        style={{ accentColor: '#1a2744' }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* 요약 + 다운로드 */}
              <div className="coverage-pro-card coverage-pro-card-pad">
                <div className="coverage-pro-section-title">최종 확인 · 다운로드</div>
                <div className="coverage-pro-grid-2" style={{ marginBottom: 16 }}>
                  <Info label="고객명"     value={customer?.name || '미지정'} />
                  <Info label="계약 수"    value={`${contracts.length}건`} />
                  <Info label="월 보험료"  value={formatWon(stats.premium)} />
                  <Info label="출력 형식"  value={
                    outputConfig.outputType === 'excel' ? '엑셀 1장'
                    : outputConfig.outputType === 'full_pdf' ? '전체 보장 리포트'
                    : '주요보장 리포트'
                  } />
                </div>
                <div className="coverage-pro-muted" style={{ marginBottom: 12 }}>
                  엑셀은 보장분석시트.xlsx 템플릿에 데이터를 주입해 다운로드합니다.<br />
                  PDF는 인쇄용 프리뷰 새 탭으로 열립니다. (인쇄/PDF저장 버튼 포함)
                </div>
                <div className="coverage-pro-actions" style={{ justifyContent: 'flex-start' }}>
                  <ExcelDownloadBtn customerName={customer?.name || '고객'} contracts={contracts} />
                  <PdfExportBtn
                    customerName={customer?.name || '고객'}
                    contracts={contracts}
                    outputType={outputConfig.outputType}
                    disabled={contracts.length === 0}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="coverage-pro-stat">
      <span>{label}</span>
      <b style={{ fontSize: 15 }}>{value}</b>
    </div>
  )
}

function getStepState(step: StepNumber, customer: ProCustomer | undefined, contracts: ProContract[]): StepStatus {
  if (step === 1) return customer ? 'done' : 'warning'
  if (step === 3 || step === 4 || step === 5) return contracts.length ? 'done' : 'warning'
  return 'done'
}

function titleByStep(step: StepNumber): string {
  return ({
    1: '고객 선택',
    2: '기본 정보 확인',
    3: '현재 보험 계약',
    4: '담보 확인',
    5: '분석 결과',
    6: '리모델링 제안',
    7: '출력 · 다운로드',
  } as Record<StepNumber, string>)[step]
}

function formatWon(value: number): string {
  return value ? `${Math.round(value).toLocaleString()}원` : '-'
}
