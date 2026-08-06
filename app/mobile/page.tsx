'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── 증상 칩 ──────────────────────────────────────────────────────────────────
const SYMPTOM_CHIPS = [
  { id: 'cancer',          icon: '🦀', label: '암·종양',      kw: ['암','종양','악성','항암','표적','방사선','다빈치','카티'] },
  { id: 'brain',           icon: '🧠', label: '뇌혈관',        kw: ['뇌','뇌졸','뇌경색','뇌출혈','뇌혈관'] },
  { id: 'heart',           icon: '❤️', label: '심장',          kw: ['심장','심근','허혈','협심','순환계'] },
  { id: 'surgery',         icon: '⚕️', label: '수술',          kw: ['수술','시술','로봇수술'] },
  { id: 'hospitalization', icon: '🏥', label: '입원·실손',      kw: ['입원','실손','실비','의료비','통원'] },
  { id: 'nursing',         icon: '🤲', label: '간병·요양',      kw: ['간병','요양','간호','재가'] },
  { id: 'dementia',        icon: '🧩', label: '치매·장기요양',  kw: ['치매','장기요양','인지','중대질병'] },
  { id: 'driver',          icon: '🚗', label: '교통사고',       kw: ['교통','자동차','운전자','벌금','변호사','부상치료'] },
  { id: 'death',           icon: '🕊️', label: '사망',          kw: ['사망','종신'] },
  { id: 'disability',      icon: '♿', label: '장해·후유',      kw: ['장해','후유','장애'] },
]

const STATUS_OPTIONS = [
  { value: 'new',        label: '신규' },
  { value: 'analysis',   label: '분석' },
  { value: 'consulting', label: '상담' },
  { value: 'proposal',   label: '제안' },
  { value: 'hold',       label: '보류' },
  { value: 'contracted', label: '계약' },
  { value: 'managing',   label: '관리' },
]

const STAGE_OPTIONS = [
  { value: 'lead',       label: '리드' },
  { value: 'prospect',   label: '잠재' },
  { value: 'active',     label: '활성' },
  { value: 'contracted', label: '계약' },
  { value: 'inactive',   label: '비활성' },
]

// ── 유틸 ─────────────────────────────────────────────────────────────────────
function formatAmount(raw: number): string {
  const manwon = raw >= 100_000 ? Math.round(raw / 10_000) : raw
  if (manwon >= 10_000) return `${(manwon / 10_000).toFixed(1)}억원`
  return `${manwon.toLocaleString()}만원`
}
function formatDate(d?: string): string {
  if (!d) return '-'
  return d.slice(0, 10).replace(/-/g, '.')
}
function calcAge(birthDate?: string): number | null {
  if (!birthDate) return null
  return new Date().getFullYear() - new Date(birthDate).getFullYear()
}
function coverageMatchesFilter(
  cov: { category?: string; name?: string; condition?: string },
  selectedChips: string[],
  customKw: string,
  policy?: { company?: string; product_name?: string }
): boolean {
  if (selectedChips.includes(cov.category || '')) return true
  for (const chipId of selectedChips) {
    const chip = SYMPTOM_CHIPS.find(c => c.id === chipId)
    if (chip && chip.kw.some(w => (cov.name || '').includes(w))) return true
  }
  const searchable = `${cov.name || ''} ${cov.category || ''} ${cov.condition || ''} ${policy?.company || ''} ${policy?.product_name || ''}`.toLowerCase()
  if (customKw.trim() && searchable.includes(customKw.toLowerCase())) return true
  return false
}

// 이번 달·다음 달 생일 계산
function getUpcomingBirthdays(customers: { id: string; name: string; birth_date: string }[], days = 60) {
  const today = new Date()
  const result: { id: string; name: string; birth_date: string; nextBirthday: Date; daysLeft: number; age: number }[] = []
  for (const c of customers) {
    if (!c.birth_date) continue
    const parts = c.birth_date.split('-')
    const month = parseInt(parts[1]) - 1
    const day   = parseInt(parts[2])
    const year  = parseInt(parts[0])
    let next = new Date(today.getFullYear(), month, day)
    if (next < today) next = new Date(today.getFullYear() + 1, month, day)
    const diff = Math.floor((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff <= days) {
      result.push({ ...c, nextBirthday: next, daysLeft: diff, age: today.getFullYear() - year })
    }
  }
  return result.sort((a, b) => a.daysLeft - b.daysLeft)
}

// ── 메인 내부 컴포넌트 (useSearchParams 사용) ─────────────────────────────────
function MobileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [activeTab, setActiveTab] = useState<'coverage' | 'birthday' | 'edit'>('coverage')
  const [userId, setUserId] = useState<string | null>(null)
  const [advisorName, setAdvisorName] = useState('')

  // ── 보장 조회 상태 ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [policies, setPolicies]   = useState<any[]>([])
  const [coverages, setCoverages] = useState<any[]>([])
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [customKeyword, setCustomKeyword] = useState('')
  const [loadingData, setLoadingData] = useState(false)
  const [searching, setSearching] = useState(false)

  // ── 기념일 상태 ────────────────────────────────────────────────────────────
  const [birthdayCustomers, setBirthdayCustomers] = useState<any[]>([])
  const [birthdayLoading, setBirthdayLoading] = useState(false)
  const [birthdayRange, setBirthdayRange] = useState(30)

  // ── 고객 수정 상태 ─────────────────────────────────────────────────────────
  const [editCustomerSearch, setEditCustomerSearch] = useState('')
  const [editSearchResults, setEditSearchResults] = useState<any[]>([])
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editSaved, setEditSaved] = useState(false)
  const [editSearching, setEditSearching] = useState(false)
  const editDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 인증 확인 + customerId 처리 ────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      supabase.from('users').select('name').eq('id', session.user.id).maybeSingle()
        .then(({ data }) => { if (data?.name) setAdvisorName(data.name) })

      // URL 파라미터로 고객 자동 선택
      const cid = searchParams.get('customerId')
      if (cid) {
        supabase.from('customers').select('id, name, phone, birth_date, status, sales_stage, notes, gender')
          .eq('id', cid).maybeSingle()
          .then(({ data }) => {
            if (data) {
              selectCustomer(data)
              // 편집 탭도 세팅
              setEditTarget(data)
              setEditForm({
                name: data.name || '',
                phone: data.phone || '',
                status: data.status || 'new',
                sales_stage: data.sales_stage || 'lead',
                notes: data.notes || '',
                birth_date: data.birth_date || '',
              })
            }
          })
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 기념일 로드 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'birthday' || !userId) return
    setBirthdayLoading(true)
    supabase.from('customers')
      .select('id, name, birth_date')
      .eq('advisor_id', userId)
      .is('deleted_at', null)
      .not('birth_date', 'is', null)
      .then(({ data }) => {
        setBirthdayCustomers(data || [])
        setBirthdayLoading(false)
      })
  }, [activeTab, userId])

  // ── 고객 검색 (보장 탭) ────────────────────────────────────────────────────
  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, birth_date')
      .ilike('name', `%${q}%`)
      .is('deleted_at', null)
      .limit(8)
    setSearchResults(data || [])
    setSearching(false)
  }, [])

  const handleSearchChange = (v: string) => {
    setSearchQuery(v)
    setSelectedCustomer(null)
    setPolicies([])
    setCoverages([])
    setSelectedChips([])
    setCustomKeyword('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchCustomers(v), 280)
  }

  const selectCustomer = async (customer: any) => {
    setSelectedCustomer(customer)
    setSearchQuery(customer.name)
    setSearchResults([])
    setLoadingData(true)
    const [{ data: pData }, { data: cData }] = await Promise.all([
      supabase.from('policies').select('*').eq('customer_id', customer.id).order('start_date', { ascending: false }),
      supabase.from('coverages').select('*').eq('customer_id', customer.id),
    ])
    setPolicies(pData || [])
    setCoverages(cData || [])
    setLoadingData(false)
  }

  const toggleChip = (id: string) => {
    setSelectedChips(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  // ── 편집 탭 고객 검색 ──────────────────────────────────────────────────────
  const searchEditCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setEditSearchResults([]); return }
    setEditSearching(true)
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, birth_date, status, sales_stage, notes, gender')
      .ilike('name', `%${q}%`)
      .is('deleted_at', null)
      .limit(8)
    setEditSearchResults(data || [])
    setEditSearching(false)
  }, [])

  const handleEditSearchChange = (v: string) => {
    setEditCustomerSearch(v)
    setEditTarget(null)
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current)
    editDebounceRef.current = setTimeout(() => searchEditCustomers(v), 280)
  }

  const selectEditCustomer = (c: any) => {
    setEditTarget(c)
    setEditCustomerSearch(c.name)
    setEditSearchResults([])
    setEditForm({
      name: c.name || '',
      phone: c.phone || '',
      status: c.status || 'new',
      sales_stage: c.sales_stage || 'lead',
      notes: c.notes || '',
      birth_date: c.birth_date || '',
    })
    setEditSaved(false)
  }

  const saveEdit = async () => {
    if (!editTarget) return
    setEditSaving(true)
    await supabase.from('customers').update({
      name:        editForm.name,
      phone:       editForm.phone,
      status:      editForm.status,
      sales_stage: editForm.sales_stage,
      notes:       editForm.notes,
      birth_date:  editForm.birth_date || null,
      updated_at:  new Date().toISOString(),
    }).eq('id', editTarget.id)
    setEditSaving(false)
    setEditSaved(true)
    setEditTarget((prev: any) => ({ ...prev, ...editForm }))
    // 보장 탭에서 같은 고객 선택돼 있으면 업데이트
    if (selectedCustomer?.id === editTarget.id) {
      setSelectedCustomer((prev: any) => ({ ...prev, ...editForm }))
    }
  }

  // ── 필터 ───────────────────────────────────────────────────────────────────
  const hasFilter = selectedChips.length > 0 || customKeyword.trim().length > 0
  const filteredResults = policies.map(policy => {
    const covs = coverages.filter(c => c.policy_id === policy.id && Number(c.amount) > 0)
    const matched = hasFilter
      ? covs.filter(c => coverageMatchesFilter(c, selectedChips, customKeyword, policy))
      : covs
    return { policy, covs: matched }
  }).filter(r => r.covs.length > 0)

  const totalPremium = policies.reduce((s, p) => s + Number(p.monthly_premium || 0), 0)
  const age = calcAge(selectedCustomer?.birth_date)
  const upcomingBirthdays = getUpcomingBirthdays(birthdayCustomers, birthdayRange)

  // ── 공통 스타일 ────────────────────────────────────────────────────────────
  const card = { background: '#fff', borderRadius: 18, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,.07)', marginBottom: 14 }
  const inputStyle = (active: boolean): React.CSSProperties => ({
    width: '100%', border: '2px solid ' + (active ? '#1a2744' : '#e5e7eb'),
    borderRadius: 12, padding: '11px 14px', fontSize: 15, outline: 'none',
    color: '#111', transition: 'border-color 0.15s', fontFamily: 'inherit',
  })
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, marginBottom: 6, display: 'block' }

  return (
    <>
      <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: #f5f2ed; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .fade-in { animation: fade-in 0.2s ease; }
        input, button, select, textarea { font-family: 'Pretendard Variable', Pretendard, -apple-system, sans-serif; }
        input, select, textarea { -webkit-appearance: none; appearance: none; }
        button { touch-action: manipulation; }
        textarea { resize: vertical; }
      `}</style>

      <div style={{ fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", background: '#f5f2ed', minHeight: '100dvh', maxWidth: 480, margin: '0 auto', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>

        {/* ── 헤더 ── */}
        <div style={{ background: '#1a2744', color: '#fff', padding: '14px 20px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>🛡️ MetaRich 모바일</div>
              <div style={{ fontSize: 11, color: '#c9a96e', marginTop: 1, fontWeight: 500 }}>보장조회 · 기념일 · 고객관리</div>
            </div>
            {advisorName && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', fontWeight: 500 }}>{advisorName}</div>}
          </div>

          {/* ── 탭 ── */}
          <div style={{ display: 'flex', gap: 6 }}>
            {([
              { id: 'coverage', label: '🛡️ 보장조회' },
              { id: 'birthday', label: '🎂 기념일' },
              { id: 'edit',     label: '✏️ 고객수정' },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 10,
                  border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: activeTab === t.id ? '#c9a96e' : 'rgba(255,255,255,.15)',
                  color: activeTab === t.id ? '#1a2744' : 'rgba(255,255,255,.8)',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '18px 16px 40px' }}>

          {/* ═══════════════ 탭 1: 보장 조회 ═══════════════ */}
          {activeTab === 'coverage' && (
            <>
              {/* 고객 검색 */}
              <div style={card}>
                <div style={{ ...labelStyle, textTransform: 'uppercase' }}>고객 검색</div>
                <div style={{ position: 'relative' }}>
                  <input
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="이름으로 검색..."
                    style={{ ...inputStyle(!!selectedCustomer), padding: '13px 42px 13px 16px', fontSize: 16, background: selectedCustomer ? '#f0f4ff' : '#fff' }}
                  />
                  {searching
                    ? <div style={{ position: 'absolute', right: 14, top: '50%', marginTop: -8, width: 16, height: 16, border: '2px solid #ddd', borderTopColor: '#1a2744', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    : searchQuery && !selectedCustomer
                      ? <div style={{ position: 'absolute', right: 12, top: '50%', marginTop: -11, cursor: 'pointer', fontSize: 20, color: '#9ca3af', lineHeight: 1 }} onClick={() => handleSearchChange('')}>×</div>
                      : null
                  }
                </div>

                {searchResults.length > 0 && (
                  <div style={{ marginTop: 6, border: '1.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,.1)' }} className="fade-in">
                    {searchResults.map(c => (
                      <button key={c.id} onClick={() => selectCustomer(c)}
                        style={{ width: '100%', padding: '13px 16px', background: '#fff', border: 'none', borderBottom: '1px solid #f3f4f6', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>{c.name}</div>
                          {c.phone && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{c.phone}</div>}
                        </div>
                        {c.birth_date && <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', marginLeft: 8, background: '#f1f5f9', padding: '3px 8px', borderRadius: 20 }}>{calcAge(c.birth_date)}세</div>}
                      </button>
                    ))}
                  </div>
                )}

                {selectedCustomer && !loadingData && (
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f0f4ff', borderRadius: 12 }} className="fade-in">
                    <div>
                      <span style={{ fontWeight: 800, color: '#1a2744', fontSize: 15 }}>{selectedCustomer.name}</span>
                      {age && <span style={{ fontSize: 12, color: '#64748b', marginLeft: 6 }}>{age}세</span>}
                      {selectedCustomer.phone && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 6 }}>{selectedCustomer.phone}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#1a2744', fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 8 }}>
                      {policies.length}건 · {totalPremium > 0 ? `${totalPremium.toLocaleString()}원` : '-'}/월
                    </div>
                  </div>
                )}
                {loadingData && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13, padding: '8px 4px' }}>
                    <div style={{ width: 14, height: 14, border: '2px solid #ddd', borderTopColor: '#1a2744', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    보험 데이터 로딩 중...
                  </div>
                )}

                {/* 편집 탭으로 이동 버튼 */}
                {selectedCustomer && !loadingData && (
                  <button onClick={() => { selectEditCustomer(selectedCustomer); setActiveTab('edit') }}
                    style={{ marginTop: 10, width: '100%', padding: '9px', borderRadius: 10, border: '1.5px solid #1a2744', background: 'transparent', color: '#1a2744', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    ✏️ 이 고객 정보 수정
                  </button>
                )}
              </div>

              {/* 증상 필터 */}
              {selectedCustomer && !loadingData && policies.length > 0 && (
                <div style={card} className="fade-in">
                  <div style={{ ...labelStyle, textTransform: 'uppercase' }}>
                    증상 · 진단 선택
                    {selectedChips.length > 0 && (
                      <button onClick={() => { setSelectedChips([]); setCustomKeyword('') }}
                        style={{ marginLeft: 10, fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        초기화
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {SYMPTOM_CHIPS.map(chip => {
                      const active = selectedChips.includes(chip.id)
                      return (
                        <button key={chip.id} onClick={() => toggleChip(chip.id)}
                          style={{ padding: '8px 13px', borderRadius: 22, border: '2px solid ' + (active ? '#1a2744' : '#e5e7eb'), background: active ? '#1a2744' : '#fff', color: active ? '#fff' : '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s', lineHeight: 1 }}>
                          {chip.icon} {chip.label}
                        </button>
                      )
                    })}
                  </div>
                  <input value={customKeyword} onChange={e => setCustomKeyword(e.target.value)}
                    placeholder="직접 입력 (예: 골절, 입원일당...)"
                    style={inputStyle(!!customKeyword)} />
                  <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>비워두면 전체 보장이 표시됩니다</div>
                </div>
              )}

              {/* 보험 없음 */}
              {selectedCustomer && !loadingData && policies.length === 0 && (
                <div style={{ ...card, textAlign: 'center', padding: '28px 20px' }} className="fade-in">
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>등록된 보험 데이터가 없습니다</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>보장분석 PRO에서 분석 후<br />'CRM에 저장' 버튼을 눌러주세요.</div>
                </div>
              )}

              {/* 보장 결과 */}
              {selectedCustomer && !loadingData && policies.length > 0 && (
                <div className="fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 4px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
                      {hasFilter
                        ? filteredResults.length > 0 ? `${filteredResults.length}개 상품에서 보장 확인` : '해당 조건의 보장 없음'
                        : `전체 ${policies.length}개 상품`}
                    </div>
                    {hasFilter && filteredResults.length === 0 && (
                      <button onClick={() => { setSelectedChips([]); setCustomKeyword('') }}
                        style={{ fontSize: 12, color: '#1a2744', background: 'none', border: '1px solid #1a2744', padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                        전체 보기
                      </button>
                    )}
                  </div>

                  {hasFilter && filteredResults.length === 0 && (
                    <div style={{ ...card, textAlign: 'center', padding: '32px 20px' }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>해당 보장이 없습니다</div>
                    </div>
                  )}

                  {filteredResults.map(({ policy, covs }) => (
                    <div key={policy.id} style={{ background: '#fff', borderRadius: 18, marginBottom: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.09)' }}>
                      <div style={{ background: '#1a2744', padding: '16px 18px' }}>
                        <div style={{ fontWeight: 900, fontSize: 16, color: '#fff', letterSpacing: -0.3 }}>{policy.company}</div>
                        <div style={{ fontSize: 14, color: '#93c5fd', marginTop: 3, fontWeight: 500 }}>{policy.product_name}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', marginTop: 10 }}>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>📅 <span style={{ color: '#e2e8f0' }}>{formatDate(policy.start_date)}</span></div>
                          {policy.monthly_premium > 0 && (
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>💳 <span style={{ color: '#c9a96e', fontWeight: 800 }}>{policy.monthly_premium.toLocaleString()}원/월</span></div>
                          )}
                          {policy.end_date && policy.end_date !== policy.start_date && (
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>🔚 <span style={{ color: '#e2e8f0' }}>{formatDate(policy.end_date)}</span></div>
                          )}
                          <div style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: policy.status === 'active' ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)', color: policy.status === 'active' ? '#6ee7b7' : '#fca5a5' }}>
                            {policy.status === 'active' ? '유지' : policy.status || '유지'}
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: '4px 0' }}>
                        {covs.map((cov: any, i: number) => (
                          <div key={cov.id || i}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 18px', borderBottom: i < covs.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#c9a96e', flexShrink: 0 }} />
                              <div style={{ fontSize: 14, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cov.name || '보장명 미확인'}</div>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: '#1a2744', whiteSpace: 'nowrap', marginLeft: 12 }}>{formatAmount(Number(cov.amount))}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 안내 (고객 미선택) */}
              {!selectedCustomer && !searchQuery && (
                <div style={{ ...card, textAlign: 'center', padding: '36px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 8 }}>고객을 검색하세요</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>이름으로 검색 후 선택하면<br />보장 내용을 즉시 확인할 수 있습니다</div>
                </div>
              )}
            </>
          )}

          {/* ═══════════════ 탭 2: 기념일 ═══════════════ */}
          {activeTab === 'birthday' && (
            <>
              {/* 기간 필터 */}
              <div style={card}>
                <div style={{ ...labelStyle }}>생일 조회 범위</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[14, 30, 60, 90].map(d => (
                    <button key={d} onClick={() => setBirthdayRange(d)}
                      style={{ flex: 1, padding: '9px 4px', borderRadius: 10, border: '2px solid ' + (birthdayRange === d ? '#1a2744' : '#e5e7eb'), background: birthdayRange === d ? '#1a2744' : '#fff', color: birthdayRange === d ? '#fff' : '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {d}일
                    </button>
                  ))}
                </div>
              </div>

              {birthdayLoading ? (
                <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, color: '#94a3b8' }}>
                  <div style={{ width: 16, height: 16, border: '2px solid #ddd', borderTopColor: '#1a2744', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  생일 정보 불러오는 중...
                </div>
              ) : upcomingBirthdays.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', padding: '36px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🎂</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>향후 {birthdayRange}일 내 생일이 없습니다</div>
                  <div style={{ fontSize: 13, color: '#9ca3af' }}>범위를 늘려서 확인해보세요</div>
                </div>
              ) : (
                <>
                  <div style={{ padding: '0 4px 10px', fontSize: 13, fontWeight: 700, color: '#64748b' }}>
                    🎂 향후 {birthdayRange}일 내 생일 {upcomingBirthdays.length}명
                  </div>
                  {upcomingBirthdays.map(c => {
                    const isToday = c.daysLeft === 0
                    const isSoon  = c.daysLeft <= 7
                    return (
                      <div key={c.id}
                        style={{ ...card, padding: '14px 18px', marginBottom: 10, border: isToday ? '2px solid #c9a96e' : isSoon ? '2px solid #93c5fd' : 'none' }}
                        className="fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: '#1a2744' }}>
                              {isToday ? '🎉 ' : isSoon ? '⭐ ' : ''}{c.name}
                            </div>
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
                              {c.birth_date?.slice(0, 10).replace(/-/g, '.')} · 만 {c.age}세
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: isToday ? '#c9a96e' : isSoon ? '#2563eb' : '#1a2744' }}>
                              {isToday ? 'D-Day' : `D-${c.daysLeft}`}
                            </div>
                            {c.nextBirthday && (
                              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                {`${c.nextBirthday.getMonth() + 1}월 ${c.nextBirthday.getDate()}일`}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* 이 고객 보장 조회 버튼 */}
                        <button onClick={() => { selectCustomer({ id: c.id, name: c.name, birth_date: c.birth_date, phone: '' }); setActiveTab('coverage') }}
                          style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 8, border: '1.5px solid #1a2744', background: 'transparent', color: '#1a2744', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          🛡️ 보장 조회
                        </button>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}

          {/* ═══════════════ 탭 3: 고객 수정 ═══════════════ */}
          {activeTab === 'edit' && (
            <>
              {/* 고객 검색 */}
              <div style={card}>
                <div style={{ ...labelStyle, textTransform: 'uppercase' }}>수정할 고객 검색</div>
                <div style={{ position: 'relative' }}>
                  <input
                    value={editCustomerSearch}
                    onChange={e => handleEditSearchChange(e.target.value)}
                    placeholder="이름으로 검색..."
                    style={{ ...inputStyle(!!editTarget), padding: '13px 42px 13px 16px', fontSize: 16, background: editTarget ? '#f0f4ff' : '#fff' }}
                  />
                  {editSearching
                    ? <div style={{ position: 'absolute', right: 14, top: '50%', marginTop: -8, width: 16, height: 16, border: '2px solid #ddd', borderTopColor: '#1a2744', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    : editCustomerSearch && !editTarget
                      ? <div style={{ position: 'absolute', right: 12, top: '50%', marginTop: -11, cursor: 'pointer', fontSize: 20, color: '#9ca3af', lineHeight: 1 }} onClick={() => { setEditCustomerSearch(''); setEditSearchResults([]); setEditTarget(null) }}>×</div>
                      : null
                  }
                </div>

                {editSearchResults.length > 0 && (
                  <div style={{ marginTop: 6, border: '1.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,.1)' }} className="fade-in">
                    {editSearchResults.map(c => (
                      <button key={c.id} onClick={() => selectEditCustomer(c)}
                        style={{ width: '100%', padding: '13px 16px', background: '#fff', border: 'none', borderBottom: '1px solid #f3f4f6', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>{c.name}</div>
                          {c.phone && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{c.phone}</div>}
                        </div>
                        {c.status && <div style={{ fontSize: 12, color: '#6b7280', background: '#f1f5f9', padding: '3px 8px', borderRadius: 20 }}>{STATUS_OPTIONS.find(s => s.value === c.status)?.label || c.status}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 수정 폼 */}
              {editTarget && (
                <div style={card} className="fade-in">
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#1a2744', marginBottom: 18 }}>
                    {editTarget.name} 정보 수정
                  </div>

                  {/* 이름 */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>이름</label>
                    <input value={editForm.name} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
                      style={inputStyle(false)} />
                  </div>

                  {/* 연락처 */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>연락처</label>
                    <input value={editForm.phone} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))}
                      placeholder="010-0000-0000" style={inputStyle(false)} type="tel" />
                  </div>

                  {/* 생년월일 */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>생년월일</label>
                    <input value={editForm.birth_date} onChange={e => setEditForm((f: any) => ({ ...f, birth_date: e.target.value }))}
                      placeholder="YYYY-MM-DD" style={inputStyle(false)} type="date" />
                  </div>

                  {/* 상태 + 영업단계 (2열) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={labelStyle}>고객 상태</label>
                      <select value={editForm.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}
                        style={{ ...inputStyle(false), background: '#fff', cursor: 'pointer' }}>
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>영업 단계</label>
                      <select value={editForm.sales_stage} onChange={e => setEditForm((f: any) => ({ ...f, sales_stage: e.target.value }))}
                        style={{ ...inputStyle(false), background: '#fff', cursor: 'pointer' }}>
                        {STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* 메모 */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={labelStyle}>메모</label>
                    <textarea value={editForm.notes} onChange={e => setEditForm((f: any) => ({ ...f, notes: e.target.value }))}
                      placeholder="특이사항, 관심 상품, 컨택 내용 등..."
                      rows={4}
                      style={{ ...inputStyle(false), lineHeight: 1.6 }} />
                  </div>

                  {/* 저장 버튼 */}
                  <button onClick={saveEdit} disabled={editSaving}
                    style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: editSaving ? '#9ca3af' : '#1a2744', color: '#fff', fontSize: 15, fontWeight: 800, cursor: editSaving ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
                    {editSaving ? '저장 중...' : '💾 저장하기'}
                  </button>

                  {editSaved && (
                    <div style={{ marginTop: 12, padding: '12px 16px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#15803d', textAlign: 'center' }} className="fade-in">
                      ✅ 저장 완료
                    </div>
                  )}

                  {/* 보장 조회로 이동 */}
                  <button onClick={() => { selectCustomer(editTarget); setActiveTab('coverage') }}
                    style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #6b7280', background: 'transparent', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    🛡️ 이 고객 보장 조회
                  </button>
                </div>
              )}

              {!editTarget && !editCustomerSearch && (
                <div style={{ ...card, textAlign: 'center', padding: '36px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✏️</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 8 }}>고객을 검색하세요</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>이름으로 검색 후 선택하면<br />정보를 수정할 수 있습니다</div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}

// ── Suspense 래퍼 (useSearchParams 필요) ──────────────────────────────────────
export default function MobileCoverageLookup() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#f5f2ed', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#1a2744', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <div style={{ fontSize: 14, color: '#9ca3af', fontFamily: 'system-ui' }}>로딩 중...</div>
      </div>
    }>
      <MobileContent />
    </Suspense>
  )
}
