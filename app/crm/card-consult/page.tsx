'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

// ──────────────────────────────────────────────
// 데이터
// ──────────────────────────────────────────────

const CARDS = [
  {
    id: 'family', emoji: '🏠', title: '가족 보호', subtitle: '사망·유족',
    gradient: 'linear-gradient(135deg,#1A2744,#2D4A8A)',
    coverages: ['종신·정기보험', '사망보험금', '유족생활자금'],
    guide: '가족이 있다면 가장 먼저 챙겨야 할 보장입니다. 소득의 몇 배를 준비해야 하는지 함께 확인해 보세요.',
    tip: '소득 × 7~10년치가 일반적인 적정 기준입니다.',
  },
  {
    id: 'cancer', emoji: '🎗️', title: '암', subtitle: '진단·치료',
    gradient: 'linear-gradient(135deg,#5B21B6,#7C3AED)',
    coverages: ['암 진단비', '항암치료비', '입원일당', '요양생활자금'],
    guide: '한국인 사망 원인 1위. 진단 후 치료비와 소득 공백 모두 준비가 필요합니다.',
    tip: '일반암과 유사암·소액암의 보장 차이를 꼭 확인하세요.',
  },
  {
    id: 'brain', emoji: '🧠', title: '뇌', subtitle: '뇌졸중·뇌출혈',
    gradient: 'linear-gradient(135deg,#991B1B,#DC2626)',
    coverages: ['뇌졸중 진단비', '뇌출혈 진단비', '뇌경색 진단비', '재활·간병비'],
    guide: '치료 후 재활이 길어지는 질환입니다. 진단비와 함께 재활 자금도 함께 고려하세요.',
    tip: '뇌혈관질환은 치료보다 재활 기간이 훨씬 더 오래 걸릴 수 있습니다.',
  },
  {
    id: 'heart', emoji: '❤️', title: '심장', subtitle: '급성심근경색',
    gradient: 'linear-gradient(135deg,#9F1239,#E11D48)',
    coverages: ['급성심근경색 진단비', '허혈성심장질환', '심장수술비'],
    guide: '갑작스럽게 발생하는 심장 질환은 빠른 치료비 지급이 핵심입니다.',
    tip: '뇌·심장을 함께 준비하면 보험료 효율이 높아집니다.',
  },
  {
    id: 'dementia', emoji: '🌸', title: '치매', subtitle: '인지·간병',
    gradient: 'linear-gradient(135deg,#86198F,#C026D3)',
    coverages: ['치매 진단비', '장기요양보험', '간병인 지원금', '생활비 보전'],
    guide: '오래 살수록 필요성이 높아집니다. 경증·중증 치매 모두 보장되는지 확인이 중요합니다.',
    tip: '65세 이상 10명 중 1명이 치매를 경험합니다.',
  },
  {
    id: 'disability', emoji: '🦽', title: '사고·장해', subtitle: '후유장해·골절',
    gradient: 'linear-gradient(135deg,#0C4A6E,#0369A1)',
    coverages: ['후유장해 진단비', '골절진단비', '깁스치료비', '일상배상책임'],
    guide: '일상에서 발생하는 사고는 누구에게나 찾아올 수 있습니다. 소득 보호와 함께 설계하세요.',
    tip: '3% 이상 후유장해 vs 80% 이상 기준 차이를 꼭 확인하세요.',
  },
  {
    id: 'medical', emoji: '🏥', title: '입원·수술', subtitle: '의료비·실손',
    gradient: 'linear-gradient(135deg,#064E3B,#059669)',
    coverages: ['실손의료보험', '수술비', '입원일당', '통원치료비'],
    guide: '실손보험이 기본이지만 수술비·입원일당을 추가하면 소득 공백까지 커버됩니다.',
    tip: '4세대 실손 전환 여부를 반드시 확인하세요.',
  },
  {
    id: 'retirement', emoji: '🌅', title: '노후', subtitle: '연금·생활비',
    gradient: 'linear-gradient(135deg,#92400E,#D97706)',
    coverages: ['연금보험', '변액연금', '즉시연금', '노후생활자금'],
    guide: '은퇴 후 소득이 없어도 생활이 유지되도록 설계하는 것이 핵심입니다.',
    tip: '국민연금 + 개인연금 + 퇴직연금 3층 구조를 확인하세요.',
  },
  {
    id: 'child', emoji: '👶', title: '자녀', subtitle: '어린이보험',
    gradient: 'linear-gradient(135deg,#0E7490,#0891B2)',
    coverages: ['어린이보험', '태아보험', '소아암 진단비', '입원·수술비'],
    guide: '자녀는 어릴 때 가입할수록 보험료가 저렴하고 보장이 넓습니다.',
    tip: '태아 때부터 가입하면 선천성 질환까지 보장됩니다.',
  },
  {
    id: 'pet', emoji: '🐾', title: '반려동물', subtitle: '펫보험·의료비',
    gradient: 'linear-gradient(135deg,#44403C,#78716C)',
    coverages: ['동물병원 치료비', '수술비 보장', '입원비', '배상책임'],
    guide: '반려동물 의료비는 예상보다 훨씬 클 수 있습니다. 미리 준비하면 경제적 부담을 크게 줄일 수 있어요.',
    tip: '5세 이하 가입이 보험료와 보장 모두 유리합니다.',
  },
]

const AGE_RANGES = ['20대', '30대', '40대', '50대', '60대 이상']
const PREMIUM_RANGES = ['5만원 미만', '5~10만원', '10~20만원', '20~30만원', '30만원 이상']
const PERCEPTIONS = [
  { label: '적정하다', icon: '✅' },
  { label: '과다한 것 같다', icon: '💸' },
  { label: '추가가 필요하다', icon: '📋' },
  { label: '잘 모르겠다', icon: '🤷' },
]
const CRITERIA_OPTIONS = [
  { label: '보험료가 저렴한 것', icon: '💰' },
  { label: '보장 기간이 긴 것 (100세)', icon: '📅' },
  { label: '보장 범위가 넓은 것', icon: '🌐' },
  { label: '핵심 보장만 집중', icon: '🎯' },
  { label: '보장은 많을수록 좋다', icon: '✅' },
  { label: '잘 모르겠다 / 상담사 추천', icon: '🤝' },
]

const MAX_CONCERN_CARDS = 5

function getPersonality(perception: string, criteria: string[]) {
  if (perception === '과다한 것 같다') {
    return {
      emoji: '💡', title: '효율 중시형', color: '#059669',
      desc: '불필요한 지출은 줄이고 꼭 필요한 보장에 집중하는 합리적인 분이시네요! 현재 보험을 꼼꼼히 점검해 꼭 필요한 보장만 남기는 스마트한 리모델링이 도움이 될 수 있습니다.',
    }
  }
  if (perception === '추가가 필요하다') {
    if (criteria.includes('보장은 많을수록 좋다') || criteria.includes('보장 범위가 넓은 것')) {
      return {
        emoji: '🛡️', title: '완벽 준비형', color: '#2D4A8A',
        desc: '소중한 가족과 미래를 위해 철저히 준비하시는 분이시네요! 빈틈없는 보장 설계를 통해 어떤 상황에도 든든한 안전망을 만들어 드리겠습니다.',
      }
    }
    return {
      emoji: '📈', title: '성장 추구형', color: '#0891B2',
      desc: '현재 상황을 정확히 파악하고 더 나은 준비를 원하시는 분이시네요! 지금보다 한 단계 업그레이드된 보장 설계를 함께 고민해 보겠습니다.',
    }
  }
  if (perception === '적정하다') {
    return {
      emoji: '⚖️', title: '균형 유지형', color: '#D97706',
      desc: '현재 상황을 잘 파악하고 균형 있게 준비하고 계신 분이시네요! 선택하신 카드를 기준으로 지금 보장이 잘 채워져 있는지 함께 확인해 보겠습니다.',
    }
  }
  return {
    emoji: '🔍', title: '탐색·발견형', color: '#7C3AED',
    desc: '보험에 대해 정확히 알고 싶으신 분이시네요! 지금이 바로 제대로 점검할 좋은 기회입니다. 선택하신 관심 분야부터 차근차근 알려드릴게요.',
  }
}

// ──────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────

export default function CardConsultPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [advisor, setAdvisor] = useState({ name: '', phone: '' })
  const resultRef = useRef<HTMLDivElement>(null)

  // Step 1
  const [customerName, setCustomerName] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [premiumRange, setPremiumRange] = useState('')
  const [premiumPerception, setPremiumPerception] = useState('')

  // Step 2
  const [selectedCards, setSelectedCards] = useState<string[]>([])

  // Step 3
  const [criteria, setCriteria] = useState<string[]>([])

  // Step 4 flip animation
  const [flippedSet, setFlippedSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('users').select('name, phone').eq('id', user.id).maybeSingle()
      if (data) setAdvisor({ name: data.name || '', phone: data.phone || '' })
    })
  }, [])

  useEffect(() => {
    if (step === 4) {
      selectedCards.forEach((id, i) => {
        setTimeout(() => {
          setFlippedSet(prev => new Set([...prev, id]))
        }, 800 + i * 500)
      })
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCard = (id: string) => {
    if (selectedCards.includes(id)) {
      setSelectedCards(prev => prev.filter(c => c !== id))
    } else if (selectedCards.length < MAX_CONCERN_CARDS) {
      setSelectedCards(prev => [...prev, id])
    }
  }

  const saveResultImage = async () => {
    if (!resultRef.current) return
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(resultRef.current, {
      backgroundColor: '#f1f5f9',
      scale: 2,
      useCORS: true,
    })
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `보장카드상담-${customerName || '고객'}-${new Date().toISOString().slice(0, 10)}.png`
    link.click()
  }

  const toggleCriteria = (label: string) => {
    setCriteria(prev => prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label])
  }

  const resetAll = () => {
    setStep(1)
    setCustomerName('')
    setAgeRange('')
    setPremiumRange('')
    setPremiumPerception('')
    setSelectedCards([])
    setCriteria([])
    setFlippedSet(new Set())
  }

  const personality = getPersonality(premiumPerception, criteria)
  const selectedCardData = selectedCards.map(id => CARDS.find(c => c.id === id)!)
  const advisorExpertLabel = `${advisor.name || '담당자'} 보험 전문가`

  const stepLabels = ['기본 정보', '카드 선택', '보험 기준', '결과 확인']

  const closePage = () => {
    window.close()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* ── 헤더 ── */}
      <div style={{ background: '#1A2744', padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#C9A96E', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 3 }}>METARICH SIGNAL</div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 900 }}>보장 카드 상담</div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {/* 스텝 인디케이터 */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: s === step ? 36 : 10, height: 10, borderRadius: 5,
                  background: s === step ? '#C9A96E' : s < step ? 'rgba(201,169,110,0.55)' : 'rgba(255,255,255,0.18)',
                  transition: 'all 0.35s',
                }} />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={closePage}
            style={{
              border: '1px solid rgba(255,255,255,0.24)',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 900,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            창 닫기
          </button>
        </div>
      </div>

      {/* 스텝 레이블 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 28px' }}>
        <div style={{ display: 'flex', gap: 0, maxWidth: 640, margin: '0 auto' }}>
          {stepLabels.map((label, i) => {
            const s = i + 1
            return (
              <div key={s} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  fontSize: 11, fontWeight: s === step ? 800 : 500,
                  color: s === step ? '#1A2744' : s < step ? '#C9A96E' : '#cbd5e1',
                  transition: 'all 0.3s',
                }}>
                  {s < step ? '✓ ' : ''}{label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px 48px' }}>

        {/* ═══════════════════════════════════════════
            STEP 1 — 기본 정보
        ═══════════════════════════════════════════ */}
        {step === 1 && (
          <div style={{ animation: 'fadeInUp 0.4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                보장 카드 상담을 시작합니다
              </h1>
              <p style={{ color: '#64748b', fontSize: 14, margin: 0, lineHeight: 1.7 }}>
                간단한 정보를 입력하고 나에게 맞는 보장을 찾아보세요
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* 이름 */}
              <Card>
                <Label required>고객님 성함</Label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="이름을 입력해 주세요"
                  style={{
                    width: '100%', border: '2px solid #e2e8f0', borderRadius: 12,
                    padding: '13px 16px', fontSize: 15, outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#1A2744' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
                />
              </Card>

              {/* 나이대 */}
              <Card>
                <Label>현재 나이대</Label>
                <PillGroup items={AGE_RANGES} selected={ageRange} onSelect={setAgeRange} />
              </Card>

              {/* 현재 보험료 */}
              <Card>
                <Label>현재 납입 중인 월 보험료</Label>
                <Sub>모든 보험을 합산한 월 납입액 기준</Sub>
                <PillGroup items={PREMIUM_RANGES} selected={premiumRange} onSelect={setPremiumRange} />
              </Card>

              {/* 보험료 인식 */}
              <Card>
                <Label>현재 보험료에 대해 어떻게 생각하세요?</Label>
                <Sub>솔직한 느낌으로 선택해 주세요</Sub>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                  {PERCEPTIONS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setPremiumPerception(p.label)}
                      style={{
                        padding: '10px 18px', borderRadius: 50, border: '2px solid',
                        borderColor: premiumPerception === p.label ? '#1A2744' : '#e2e8f0',
                        background: premiumPerception === p.label ? '#1A2744' : '#fff',
                        color: premiumPerception === p.label ? '#fff' : '#475569',
                        fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
                        fontFamily: 'inherit',
                      }}
                    >
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              </Card>

            </div>

            <NavButton
              onClick={() => setStep(2)}
              disabled={!customerName.trim()}
              label="카드 선택하기 →"
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 2 — 카드 선택
        ═══════════════════════════════════════════ */}
        {step === 2 && (
          <div style={{ animation: 'fadeInUp 0.4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 13, color: '#C9A96E', fontWeight: 800, marginBottom: 6 }}>
                {customerName}님
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                가장 걱정되는 보장을 선택해 주세요
              </h1>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: selectedCards.length > 0 ? '#dcfce7' : '#f1f5f9',
                borderRadius: 50, padding: '6px 16px',
                color: selectedCards.length > 0 ? '#15803d' : '#64748b',
                fontSize: 13, fontWeight: 700, transition: 'all 0.3s',
              }}>
                {selectedCards.length > 0 ? `${selectedCards.length} / ${MAX_CONCERN_CARDS} 선택` : `최대 ${MAX_CONCERN_CARDS}개까지 선택`}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 12, marginBottom: 28,
            }}>
              {CARDS.map(card => {
                const idx = selectedCards.indexOf(card.id)
                const isSelected = idx !== -1
                const isFull = selectedCards.length >= MAX_CONCERN_CARDS && !isSelected
                return (
                  <div
                    key={card.id}
                    onClick={() => !isFull && toggleCard(card.id)}
                    style={{
                      position: 'relative',
                      background: isSelected ? card.gradient : '#fff',
                      border: `2px solid ${isSelected ? 'transparent' : '#e2e8f0'}`,
                      borderRadius: 20,
                      padding: '22px 12px 18px',
                      textAlign: 'center',
                      cursor: isFull ? 'not-allowed' : 'pointer',
                      opacity: isFull ? 0.35 : 1,
                      transition: 'all 0.25s',
                      boxShadow: isSelected
                        ? '0 8px 28px rgba(26,39,68,0.28)'
                        : '0 1px 6px rgba(0,0,0,0.06)',
                      transform: isSelected ? 'translateY(-5px) scale(1.03)' : 'none',
                    }}
                  >
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: 9, right: 9,
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#C9A96E', color: '#1A2744',
                        fontSize: 11, fontWeight: 900,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {idx + 1}
                      </div>
                    )}
                    <div style={{ fontSize: 30, marginBottom: 8 }}>{card.emoji}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: isSelected ? '#fff' : '#0f172a', marginBottom: 3 }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.65)' : '#94a3b8' }}>
                      {card.subtitle}
                    </div>
                  </div>
                )
              })}
            </div>

            <NavButton
              onClick={() => setStep(3)}
              disabled={selectedCards.length === 0}
              label={selectedCards.length > 0 ? '다음 단계로 →' : '걱정되는 보장을 선택해 주세요'}
            />
            <BackButton onClick={() => setStep(1)} />
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 3 — 보험 기준
        ═══════════════════════════════════════════ */}
        {step === 3 && (
          <div style={{ animation: 'fadeInUp 0.4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 13, color: '#C9A96E', fontWeight: 800, marginBottom: 6 }}>
                {customerName}님
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                보험을 선택할 때 가장 중요하게 보는 것은?
              </h1>
              <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>복수 선택 가능합니다</p>
            </div>

            <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {CRITERIA_OPTIONS.map(c => {
                  const checked = criteria.includes(c.label)
                  return (
                    <div
                      key={c.label}
                      onClick={() => toggleCriteria(c.label)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px', borderRadius: 14,
                        border: `2px solid ${checked ? '#1A2744' : '#f1f5f9'}`,
                        background: checked ? '#f0f4ff' : '#fafafa',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        border: `2px solid ${checked ? '#1A2744' : '#cbd5e1'}`,
                        background: checked ? '#1A2744' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}>
                        {checked && <span style={{ color: '#fff', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{c.icon}</span>
                      <span style={{
                        fontSize: 14, fontWeight: checked ? 800 : 500,
                        color: checked ? '#1A2744' : '#475569',
                        transition: 'all 0.2s',
                      }}>
                        {c.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <NavButton onClick={() => setStep(4)} label="결과 확인하기 ✨" />
            <BackButton onClick={() => setStep(2)} />
          </div>
        )}

        {/* ═══════════════════════════════════════════
            STEP 4 — 결과
        ═══════════════════════════════════════════ */}
        {step === 4 && (
          <div style={{ animation: 'fadeInUp 0.4s ease' }}>
            <div ref={resultRef}>

            {/* 성향 분석 배너 */}
            <div style={{
              background: 'linear-gradient(135deg,#1A2744,#2D4A8A)',
              borderRadius: 24, padding: '32px 28px', marginBottom: 20, textAlign: 'center',
              boxShadow: '0 8px 32px rgba(26,39,68,0.32)',
            }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>{personality.emoji}</div>
              <div style={{ color: '#C9A96E', fontSize: 12, fontWeight: 800, marginBottom: 6, letterSpacing: '0.06em' }}>
                {customerName}님의 보장 성향
              </div>
              <div style={{ color: '#fff', fontSize: 24, fontWeight: 900, marginBottom: 16 }}>
                {personality.title}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.87)', fontSize: 14, lineHeight: 1.8, maxWidth: 460, margin: '0 auto' }}>
                {personality.desc}
              </div>
              {(ageRange || premiumRange || premiumPerception) && (
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {ageRange && <Tag>{ageRange}</Tag>}
                  {premiumRange && <Tag>월 {premiumRange}</Tag>}
                  {premiumPerception && <Tag>{premiumPerception}</Tag>}
                </div>
              )}
            </div>

            {/* 보험 기준 태그 */}
            {criteria.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 18, padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>선택하신 보험 기준</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {criteria.map(c => (
                    <span key={c} style={{
                      background: '#f0f4ff', color: '#1A2744',
                      borderRadius: 50, padding: '5px 14px', fontSize: 12, fontWeight: 700,
                    }}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 선택한 카드 — 뒤집기 */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                {customerName}님이 선택하신 핵심 보장
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                카드가 자동으로 뒤집히며 보장 내용을 보여드립니다
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {selectedCardData.map((card, i) => {
                const isFlipped = flippedSet.has(card.id)
                return (
                  <div
                    key={card.id}
                    onClick={() => setFlippedSet(prev => {
                      const next = new Set(prev)
                      if (next.has(card.id)) next.delete(card.id)
                      else next.add(card.id)
                      return next
                    })}
                    style={{ perspective: '1000px', cursor: 'pointer' }}
                  >
                    <div style={{
                      position: 'relative', height: 180,
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      transition: 'transform 0.65s cubic-bezier(0.4,0,0.2,1)',
                    }}>
                      {/* 앞면 (선택 상태 미공개) */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        background: card.gradient,
                        borderRadius: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      }}>
                        <div style={{
                          position: 'absolute', top: 14, left: 18,
                          background: 'rgba(201,169,110,0.25)', color: '#C9A96E',
                          borderRadius: 50, padding: '4px 12px', fontSize: 11, fontWeight: 800,
                        }}>
                          {i + 1}순위
                        </div>
                        <div style={{ fontSize: 42 }}>{card.emoji}</div>
                        <div style={{ color: '#fff', fontSize: 18, fontWeight: 900 }}>{card.title}</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>탭하여 보장 확인 →</div>
                      </div>

                      {/* 뒷면 (보장 공개) */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: '#fff',
                        borderRadius: 20, padding: '20px 22px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                        border: '2px solid #e2e8f0',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                          <div style={{
                            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                            background: card.gradient,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                          }}>
                            {card.emoji}
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{card.title}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{i + 1}순위 선택</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                          {card.coverages.map(cv => (
                            <span key={cv} style={{
                              background: '#f0f4ff', color: '#1A2744',
                              borderRadius: 50, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                            }}>{cv}</span>
                          ))}
                        </div>
                        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, marginBottom: 8 }}>
                          {card.guide}
                        </div>
                        <div style={{ fontSize: 12, color: '#C9A96E', fontWeight: 700 }}>💡 {card.tip}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 중요 보장 확인 CTA */}
            <div style={{
              background: 'linear-gradient(135deg,#fefce8,#fef3c7)',
              border: '2px solid #fbbf24', borderRadius: 20, padding: '22px 24px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 18, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#92400E', marginBottom: 8 }}>
                가장 중요하게 선택한 보장이 잘 준비되어 있는지 확인해 보세요!
              </div>
              <div style={{ fontSize: 13, color: '#A16207', lineHeight: 1.7 }}>
                <strong>{selectedCardData[0]?.title}</strong>이(가) 1순위로 선택되셨습니다.
                {selectedCardData[0] && (
                  <> {selectedCardData[0].guide}</>
                )}
              </div>
            </div>

            {/* 상담사 정보 */}
            <div style={{
              background: '#1A2744', borderRadius: 20, padding: '24px 28px', textAlign: 'center', marginBottom: 20,
            }}>
              <div style={{ color: '#C9A96E', fontSize: 11, fontWeight: 800, marginBottom: 8, letterSpacing: '0.08em' }}>
                고객님의 보장 파트너
              </div>
              <div style={{ color: '#fff', fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
                {advisorExpertLabel}
              </div>
              {advisor.phone && (
                <div style={{
                  color: 'rgba(255,255,255,0.72)', fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {advisor.phone}
                </div>
              )}
            </div>
            </div>

            {/* 새 상담 시작 */}
            <button
              onClick={saveResultImage}
              style={{
                width: '100%', background: '#1A2744', color: '#fff',
                border: 'none', borderRadius: 16, padding: '14px 0',
                fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                marginBottom: 10,
              }}
            >
              결과 이미지 저장
            </button>
            <button
              onClick={resetAll}
              style={{
                width: '100%', background: '#f1f5f9', color: '#64748b',
                border: 'none', borderRadius: 16, padding: '14px 0',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ↩ 새 고객 상담 시작
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ──────────────────────────────────────────────
// 재사용 소컴포넌트
// ──────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: '22px 22px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      {children}
    </div>
  )
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
      {children}
      {required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
    </div>
  )
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12, marginTop: -8 }}>{children}</div>
  )
}

function PillGroup({ items, selected, onSelect }: { items: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(item => (
        <button key={item} onClick={() => onSelect(item)} style={{
          padding: '9px 18px', borderRadius: 50, border: '2px solid',
          borderColor: selected === item ? '#1A2744' : '#e2e8f0',
          background: selected === item ? '#1A2744' : '#fff',
          color: selected === item ? '#fff' : '#475569',
          fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
        }}>{item}</button>
      ))}
    </div>
  )
}

function NavButton({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      marginTop: 24, width: '100%',
      background: disabled ? '#e2e8f0' : '#1A2744',
      color: disabled ? '#94a3b8' : '#fff',
      border: 'none', borderRadius: 16, padding: '17px 0',
      fontSize: 15, fontWeight: 900, cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s', fontFamily: 'inherit',
    }}>{label}</button>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      marginTop: 10, width: '100%', background: 'transparent',
      color: '#94a3b8', border: 'none', borderRadius: 16, padding: '10px 0',
      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    }}>← 이전으로</button>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: 'rgba(201,169,110,0.18)', color: '#C9A96E',
      borderRadius: 50, padding: '5px 14px', fontSize: 12, fontWeight: 700,
    }}>{children}</span>
  )
}
