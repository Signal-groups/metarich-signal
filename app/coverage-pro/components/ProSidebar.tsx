'use client'

import { useState } from 'react'
import type { StepNumber, StepStatus } from '../../../lib/coverageAnalysis/types'

export const PRO_STEPS: Array<{ id: StepNumber; title: string }> = [
  { id: 1, title: '고객 선택' },
  { id: 2, title: '기본 정보' },
  { id: 3, title: '현재 보험' },
  { id: 4, title: '보장 확인' },
  { id: 5, title: '분석 결과' },
  { id: 6, title: '리모델링' },
  { id: 7, title: '출력 · 다운로드' },
]

const TIER_LABELS = [
  { key: 'min',      label: '최소', desc: '핵심 진단비만', icon: '⚡', color: '#3b82f6' },
  { key: 'standard', label: '표준', desc: '진단비+수술비', icon: '✅', color: '#10b981' },
  { key: 'comfort',  label: '여유', desc: '진단비+치료비', icon: '⭐', color: '#c9a96e' },
  { key: 'manual',   label: '수동', desc: '직접 조정', icon: '🖊', color: '#64748b' },
] as const

const INS_TYPES = [
  { key: 'health',    label: '건강보험',    icon: '🏥' },
  { key: 'life',      label: '종신·사망', icon: '♡' },
  { key: 'shortpay',  label: '단기납·저축',  icon: '💰' },
  { key: 'dollar',    label: '달러종신·연금', icon: '💵' },
] as const

const PREMIUM_GUIDE_ROWS = [
  { type: '건강고지형', code: '3105', desc: '고객이 가입할 수 있는 가장 유리한 보험', tone: '#2563eb', bg: '#eff6ff' },
  { type: '표준형', code: '355', desc: '일반적으로 제안받는 표준형', tone: '#1a2744', bg: '#f1f5f9' },
  { type: '경증간편형', code: '31010', desc: '유병자 보험 중 가장 저렴한 플랜', tone: '#7c3aed', bg: '#f5f3ff' },
  { type: '유병자보험', code: '345 / 335 / 325', desc: '고지 내용이 많을수록 보험료가 높아지는 구간', tone: '#b45309', bg: '#fff7ed' },
  { type: '초간편', code: '-', desc: '가입 가능성은 넓지만 보험료가 가장 비싼 보험', tone: '#dc2626', bg: '#fff1f2' },
]

export default function ProSidebar({
  currentStep,
  stepStatus,
  onMove,
  onSettingsClick,
}: {
  currentStep: StepNumber
  stepStatus: Partial<Record<StepNumber, StepStatus>>
  onMove: (step: StepNumber) => void
  onSettingsClick?: () => void
}) {
  const [activeTier, setActiveTier] = useState<'min' | 'standard' | 'comfort' | 'manual'>('standard')
  const [activeType, setActiveType] = useState<string>('health')
  const [showPremiumGuide, setShowPremiumGuide] = useState(false)

  const sideLabel: Record<string, string> = {
    min:      '기본 보장만으로 핵심을 지킵니다',
    standard: '가장 많이 선택하는 균형 설계',
    comfort:  '모든 담보를 여유롭게 갖춥니다',
    manual: '고객 상황에 맞춰 직접 조정합니다',
  }

  return (
    <aside className="coverage-pro-sidebar">
      {showPremiumGuide && <PremiumGuideModal onClose={() => setShowPremiumGuide(false)} />}
      <div className="coverage-pro-brand">
        <strong>보험료 비교</strong>
        <span>교차설계 시스템</span>
      </div>

      {/* ─ 비교 기준 티어 ─────────────────────────────── */}
      <div style={{ marginBottom: 12, padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#64748b',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 6, paddingLeft: 2,
        }}>비교 기준</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {TIER_LABELS.map(({ key, label, desc, icon, color }) => (
            <button
              key={key} type="button"
              onClick={() => setActiveTier(key)}
              style={{
                padding: '8px 6px',
                borderRadius: 8, border: 'none',
                background: activeTier === key
                  ? color
                  : 'rgba(255,255,255,0.07)',
                color: activeTier === key ? '#fff' : '#94a3b8',
                fontSize: 11, fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: activeTier === key ? `0 2px 8px ${color}55` : 'none',
                textAlign: 'center',
              }}
            >
              <span style={{ display: 'block', fontSize: 13, marginBottom: 2 }}>{icon} {label}</span>
              <span style={{ display: 'block', fontSize: 9, opacity: 0.8 }}>{desc}</span>
            </button>
          ))}
        </div>
        <div style={{
          fontSize: 10, color: '#475569', marginTop: 5, paddingLeft: 2, lineHeight: 1.4,
        }}>{sideLabel[activeTier]}</div>
      </div>

      {/* ─ 보험 유형 필터 ─────────────────────────────── */}
      <div style={{ marginBottom: 14, padding: 10, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#64748b',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          marginBottom: 6, paddingLeft: 2,
        }}>보험 유형</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {INS_TYPES.map(({ key, label, icon }) => (
            <button
              key={key} type="button"
              onClick={() => setActiveType(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 8, border: 'none',
                background: activeType === key
                  ? 'rgba(201,169,110,0.18)'
                  : 'rgba(255,255,255,0.04)',
                color: activeType === key ? '#c9a96e' : '#94a3b8',
                fontSize: 12, fontWeight: activeType === key ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                borderLeft: activeType === key ? '2px solid #c9a96e' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 14 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        marginBottom: 14,
        padding: 12,
        borderRadius: 12,
        background: 'linear-gradient(160deg, rgba(201,169,110,0.18), rgba(45,74,138,0.16))',
        border: '1px solid rgba(201,169,110,0.25)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: '#f8fafc', marginBottom: 5 }}>상품별 보험료 차이</div>
        <div style={{ fontSize: 10, lineHeight: 1.55, color: '#94a3b8', marginBottom: 10 }}>
          같은 보장이라도 고지형, 표준형, 간편심사, 초간편 여부에 따라 보험료가 달라집니다.
        </div>
        <button
          type="button"
          onClick={() => setShowPremiumGuide(true)}
          style={{
            width: '100%',
            padding: '9px 10px',
            borderRadius: 9,
            border: '1px solid rgba(201,169,110,0.45)',
            background: 'rgba(201,169,110,0.18)',
            color: '#fcd34d',
            fontSize: 12,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          보험료 차이 설명 보기
        </button>
      </div>

      {/* ─ 단계 목록 ─────────────────────────────────── */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: '#64748b',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        marginBottom: 6, paddingLeft: 2,
      }}>분석 단계</div>
      <div className="coverage-pro-step-list">
        {PRO_STEPS.map((step) => {
          const status = stepStatus[step.id] || 'pending'
          return (
            <button
              type="button"
              key={step.id}
              className={`coverage-pro-step${currentStep === step.id ? ' active' : ''}`}
              onClick={() => onMove(step.id)}
            >
              <span className="coverage-pro-step-num">{step.id}</span>
              <span className="coverage-pro-step-title">{step.title}</span>
              <span className="coverage-pro-step-state">
                {status === 'done' ? '완료' : status === 'warning' ? '확인' : ''}
              </span>
            </button>
          )
        })}
      </div>
      <div className="coverage-pro-muted">
        각 단계를 누르면 언제든 이전 입력으로 돌아가 수정할 수 있습니다.
      </div>

      {/* ─ 설정 버튼 ─────────────────────────────────── */}
      <button
        type="button"
        onClick={onSettingsClick}
        style={{
          marginTop: 'auto',
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '10px 14px',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, color: '#cbd5e1',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.13)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        담보 기준금액 설정
      </button>
    </aside>
  )
}

function PremiumGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(5,10,20,0.62)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(960px, 96vw)',
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: 22,
          background: '#f8fafc',
          boxShadow: '0 30px 100px rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.65)',
        }}
      >
        <div style={{
          padding: '26px 30px 18px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eef4ff 100%)',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 18,
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 999, background: '#312e81', color: '#fff', padding: '7px 12px', fontSize: 12, fontWeight: 900, marginBottom: 14 }}>
              STEP 4 · 문제인식 및 선택기준 제시
            </div>
            <h2 style={{ margin: 0, fontSize: 30, lineHeight: 1.25, fontWeight: 950, color: '#1a2744' }}>
              같은 보장이라도 보험료가 달라지는 이유
            </h2>
            <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.75, color: '#64748b', fontWeight: 700 }}>
              상품을 들이미는 상담이 아니라, 고객의 고지 상태와 선택 기준에 따라 가능한 구간을 정확히 진단합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#475569',
              fontSize: 20,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 150px', gap: 18 }}>
            <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid #dbe4f0', background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 110px 1fr', background: '#1a2744', color: '#fff', fontSize: 13, fontWeight: 900 }}>
                <div style={{ padding: '14px 16px' }}>유형</div>
                <div style={{ padding: '14px 16px' }}>코드</div>
                <div style={{ padding: '14px 16px' }}>설명</div>
              </div>
              {PREMIUM_GUIDE_ROWS.map((row) => (
                <div key={row.type} style={{ display: 'grid', gridTemplateColumns: '150px 110px 1fr', borderTop: '1px solid #e2e8f0', background: row.bg }}>
                  <div style={{ padding: '15px 16px', fontSize: 14, fontWeight: 950, color: row.tone }}>{row.type}</div>
                  <div style={{ padding: '15px 16px', fontSize: 13, fontWeight: 900, color: '#334155' }}>{row.code}</div>
                  <div style={{ padding: '15px 16px', fontSize: 13, lineHeight: 1.55, fontWeight: 750, color: '#475569' }}>{row.desc}</div>
                </div>
              ))}
            </div>

            <div style={{
              borderRadius: 20,
              background: '#fff',
              border: '1px solid #e2e8f0',
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 360,
            }}>
              <div style={{ borderRadius: 14, background: '#4f46e5', color: '#fff', padding: '14px 18px', fontSize: 22, fontWeight: 950 }}>보험료 -</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <div style={{ width: 4, height: '72%', borderRadius: 99, background: 'linear-gradient(to bottom, #4f46e5, #ef4444)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -8, left: -9, width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderBottom: '16px solid #4f46e5' }} />
                  <div style={{ position: 'absolute', bottom: -8, left: -9, width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '16px solid #ef4444' }} />
                </div>
              </div>
              <div style={{ borderRadius: 14, background: '#e11d48', color: '#fff', padding: '14px 18px', fontSize: 22, fontWeight: 950 }}>보험료 +</div>
            </div>
          </div>

          <div style={{ marginTop: 18, borderRadius: 16, background: '#eef2ff', border: '1px solid #c7d2fe', padding: '16px 18px', color: '#312e81', fontSize: 14, lineHeight: 1.8, fontWeight: 850 }}>
            핵심 메시지 · 상품 수백 개 중 단 한 개를 고르는 기준입니다. 단순히 상품만 보여드리는 사람이 아니라, 정확하게 진단하고 최적의 설계와 추천을 해드립니다.
          </div>
        </div>
      </div>
    </div>
  )
}
