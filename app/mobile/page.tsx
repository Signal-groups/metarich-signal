'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ── 증상 칩 정의 ──────────────────────────────────────────────────────────────
const SYMPTOM_CHIPS = [
  { id: 'cancer',          icon: '🦀', label: '암·종양',   kw: ['암','종양','악성','항암','표적','방사선','다빈치','카티'] },
  { id: 'brain',           icon: '🧠', label: '뇌혈관',    kw: ['뇌','뇌졸','뇌경색','뇌출혈','뇌혈관'] },
  { id: 'heart',           icon: '❤️', label: '심장',      kw: ['심장','심근','허혈','협심','순환계'] },
  { id: 'surgery',         icon: '⚕️', label: '수술',      kw: ['수술','시술','로봇수술'] },
  { id: 'hospitalization', icon: '🏥', label: '입원·실손',  kw: ['입원','실손','실비','의료비','통원'] },
  { id: 'nursing',         icon: '🤲', label: '간병·요양',  kw: ['간병','요양','간호','재가'] },
  { id: 'driver',          icon: '🚗', label: '교통사고',   kw: ['교통','자동차','운전자','벌금','변호사','부상치료'] },
  { id: 'death',           icon: '🕊️', label: '사망',      kw: ['사망','종신'] },
  { id: 'disability',      icon: '♿', label: '장해·후유',  kw: ['장해','후유','장애'] },
]

// ── 금액 포맷 ─────────────────────────────────────────────────────────────────
function formatAmount(raw: number): string {
  // 원 단위 (100,000 이상) → 만원 변환
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

// ── 보장 카테고리 매칭 ────────────────────────────────────────────────────────
function coverageMatchesFilter(
  cov: { category?: string; name?: string },
  selectedChips: string[],
  customKw: string
): boolean {
  // 칩 카테고리 직접 매칭
  if (selectedChips.includes(cov.category || '')) return true
  // 칩 키워드로 이름 매칭
  for (const chipId of selectedChips) {
    const chip = SYMPTOM_CHIPS.find(c => c.id === chipId)
    if (chip && chip.kw.some(w => (cov.name || '').includes(w))) return true
  }
  // 직접 입력 키워드 매칭
  if (customKw.trim() && (cov.name || '').toLowerCase().includes(customKw.toLowerCase())) return true
  return false
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function MobileCoverageLookup() {
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [advisorName, setAdvisorName] = useState('')
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [policies, setPolicies]   = useState<any[]>([])
  const [coverages, setCoverages] = useState<any[]>([])
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [customKeyword, setCustomKeyword] = useState('')
  const [loadingData, setLoadingData] = useState(false)
  const [searching, setSearching] = useState(false)

  // ── 인증 확인 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase.from('advisors').select('name').eq('id', session.user.id).single()
        .then(({ data }) => { if (data?.name) setAdvisorName(data.name) })
    })
  }, [router])

  // ── 고객 검색 ──────────────────────────────────────────────────────────────
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

  // ── 고객 선택 → 보험 로드 ──────────────────────────────────────────────────
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

  // ── 칩 토글 ────────────────────────────────────────────────────────────────
  const toggleChip = (id: string) => {
    setSelectedChips(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  // ── 필터 적용된 결과 ────────────────────────────────────────────────────────
  const hasFilter = selectedChips.length > 0 || customKeyword.trim().length > 0
  const results = policies.map(policy => {
    const covs = coverages.filter(c => c.policy_id === policy.id && Number(c.amount) > 0)
    const matched = hasFilter
      ? covs.filter(c => coverageMatchesFilter(c, selectedChips, customKeyword))
      : covs
    return { policy, covs: matched }
  }).filter(r => r.covs.length > 0)

  const totalPremium = policies.reduce((s, p) => s + Number(p.monthly_premium || 0), 0)
  const age = calcAge(selectedCustomer?.birth_date)

  return (
    <>
      <link
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        rel="stylesheet"
      />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: #f5f2ed; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .fade-in { animation: fade-in 0.2s ease; }
        input, button { font-family: 'Pretendard Variable', Pretendard, -apple-system, sans-serif; }
        input { -webkit-appearance: none; appearance: none; }
        button { touch-action: manipulation; }
      `}</style>

      <div style={{
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
        background: '#f5f2ed', minHeight: '100dvh',
        maxWidth: 480, margin: '0 auto',
        wordBreak: 'keep-all', overflowWrap: 'break-word',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: '#1a2744', color: '#fff',
          padding: '14px 20px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 2px 12px rgba(0,0,0,.3)',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>🛡️ 보장 즉시 조회</div>
            <div style={{ fontSize: 11, color: '#c9a96e', marginTop: 1, fontWeight: 500 }}>MetaRich Signal</div>
          </div>
          {advisorName && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', fontWeight: 500 }}>{advisorName}</div>
          )}
        </div>

        <div style={{ padding: '18px 16px 40px' }}>

          {/* ── 고객 검색 카드 ── */}
          <div style={{ background: '#fff', borderRadius: 18, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' }}>고객 검색</div>

            <div style={{ position: 'relative' }}>
              <input
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="이름으로 검색..."
                style={{
                  width: '100%', border: '2px solid ' + (selectedCustomer ? '#1a2744' : '#e5e7eb'),
                  borderRadius: 14, padding: '13px 42px 13px 16px',
                  fontSize: 16, outline: 'none',
                  background: selectedCustomer ? '#f0f4ff' : '#fff',
                  color: '#111', transition: 'border-color 0.15s',
                }}
              />
              {searching
                ? <div style={{ position: 'absolute', right: 14, top: '50%', marginTop: -8, width: 16, height: 16, border: '2px solid #ddd', borderTopColor: '#1a2744', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : searchQuery && !selectedCustomer
                  ? <div style={{ position: 'absolute', right: 12, top: '50%', marginTop: -11, cursor: 'pointer', fontSize: 20, color: '#9ca3af', lineHeight: 1 }} onClick={() => handleSearchChange('')}>×</div>
                  : null
              }
            </div>

            {/* 검색 드롭다운 */}
            {searchResults.length > 0 && (
              <div style={{ marginTop: 6, border: '1.5px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,.1)' }} className="fade-in">
                {searchResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    style={{
                      width: '100%', padding: '13px 16px', background: '#fff',
                      border: 'none', borderBottom: '1px solid #f3f4f6',
                      textAlign: 'left', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>{c.name}</div>
                      {c.phone && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{c.phone}</div>}
                    </div>
                    {c.birth_date && (
                      <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', marginLeft: 8, background: '#f1f5f9', padding: '3px 8px', borderRadius: 20 }}>
                        {calcAge(c.birth_date)}세
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 선택된 고객 요약 */}
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
          </div>

          {/* ── 증상/진단 선택 ── */}
          {selectedCustomer && !loadingData && policies.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 18, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,.07)', marginBottom: 14 }} className="fade-in">
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' }}>
                증상 · 진단 선택
                {selectedChips.length > 0 && (
                  <button
                    onClick={() => { setSelectedChips([]); setCustomKeyword('') }}
                    style={{ marginLeft: 10, fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    초기화
                  </button>
                )}
              </div>

              {/* 칩 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {SYMPTOM_CHIPS.map(chip => {
                  const active = selectedChips.includes(chip.id)
                  return (
                    <button
                      key={chip.id}
                      onClick={() => toggleChip(chip.id)}
                      style={{
                        padding: '9px 15px', borderRadius: 22,
                        border: '2px solid ' + (active ? '#1a2744' : '#e5e7eb'),
                        background: active ? '#1a2744' : '#fff',
                        color: active ? '#fff' : '#374151',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.12s', lineHeight: 1,
                      }}
                    >
                      {chip.icon} {chip.label}
                    </button>
                  )
                })}
              </div>

              {/* 직접 입력 */}
              <input
                value={customKeyword}
                onChange={e => setCustomKeyword(e.target.value)}
                placeholder="직접 입력 (예: 골절, 양성종양, 입원일당...)"
                style={{
                  width: '100%', border: '2px solid ' + (customKeyword ? '#1a2744' : '#e5e7eb'),
                  borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none',
                  color: '#111', transition: 'border-color 0.15s',
                }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
                선택 없이 비워두면 전체 보장이 표시됩니다
              </div>
            </div>
          )}

          {/* ── 보험 없음 메시지 ── */}
          {selectedCustomer && !loadingData && policies.length === 0 && (
            <div style={{ background: '#fff', borderRadius: 18, padding: '28px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.07)' }} className="fade-in">
              <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>등록된 보험 데이터가 없습니다</div>
              <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>
                보장분석 PRO에서 분석 후<br />'CRM에 저장' 버튼을 눌러주세요.
              </div>
            </div>
          )}

          {/* ── 보장 결과 ── */}
          {selectedCustomer && !loadingData && policies.length > 0 && (
            <div className="fade-in">
              {/* 결과 카운트 헤더 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '0 4px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
                  {hasFilter
                    ? results.length > 0
                      ? `${results.length}개 상품에서 보장 확인`
                      : '해당 조건의 보장 없음'
                    : `전체 ${policies.length}개 상품`}
                </div>
                {hasFilter && results.length === 0 && (
                  <button
                    onClick={() => { setSelectedChips([]); setCustomKeyword('') }}
                    style={{ fontSize: 12, color: '#1a2744', background: 'none', border: '1px solid #1a2744', padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
                  >
                    전체 보기
                  </button>
                )}
              </div>

              {/* 결과 없음 */}
              {hasFilter && results.length === 0 && (
                <div style={{ background: '#fff', borderRadius: 18, padding: '32px 20px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.07)' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>해당 보장이 없습니다</div>
                  <div style={{ fontSize: 13, color: '#9ca3af' }}>다른 조건으로 검색하거나 전체 보장을 확인해보세요.</div>
                </div>
              )}

              {/* 정책별 카드 */}
              {results.map(({ policy, covs }) => (
                <div key={policy.id} style={{ background: '#fff', borderRadius: 18, marginBottom: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.09)' }}>
                  {/* 정책 헤더 */}
                  <div style={{ background: '#1a2744', padding: '16px 18px' }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: '#fff', letterSpacing: -0.3 }}>{policy.company}</div>
                    <div style={{ fontSize: 14, color: '#93c5fd', marginTop: 3, fontWeight: 500 }}>{policy.product_name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', marginTop: 10 }}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
                        📅 <span style={{ color: '#e2e8f0' }}>{formatDate(policy.start_date)}</span>
                      </div>
                      {policy.monthly_premium > 0 && (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
                          💳 <span style={{ color: '#c9a96e', fontWeight: 800 }}>{policy.monthly_premium.toLocaleString()}원/월</span>
                        </div>
                      )}
                      {policy.end_date && policy.end_date !== policy.start_date && (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
                          🔚 <span style={{ color: '#e2e8f0' }}>{formatDate(policy.end_date)}</span>
                        </div>
                      )}
                      <div style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: policy.status === 'active' ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)',
                        color: policy.status === 'active' ? '#6ee7b7' : '#fca5a5',
                      }}>
                        {policy.status === 'active' ? '유지' : policy.status || '유지'}
                      </div>
                    </div>
                  </div>

                  {/* 보장 목록 */}
                  <div style={{ padding: '4px 0' }}>
                    {covs.map((cov: any, i: number) => (
                      <div
                        key={cov.id || i}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '11px 18px',
                          borderBottom: i < covs.length - 1 ? '1px solid #f8fafc' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#c9a96e', flexShrink: 0 }} />
                          <div style={{ fontSize: 14, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cov.name || '보장명 미확인'}
                          </div>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1a2744', whiteSpace: 'nowrap', marginLeft: 12 }}>
                          {formatAmount(Number(cov.amount))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
