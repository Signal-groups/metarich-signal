'use client'

import FinancialCalc from '../dashboard/components/FinancialCalc'

export default function FinancialCalcPage() {
  return (
    <div className="financial-calc-page min-h-screen bg-[#F5F7FA]">
      {/* 상단 헤더 바 */}
      <div className="financial-calc-page-header" style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#0F1E35',
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        padding: '0 24px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 20, background: '#C9A84C', borderRadius: 2 }} />
          <span style={{
            fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
            fontSize: 15,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.3px',
          }}>
            🧮 금융계산기
          </span>
          <span style={{
            fontSize: 10,
            color: '#fff',
            background: '#1E5FA8',
            borderRadius: 5,
            padding: '2px 8px',
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}>
            PROFESSIONAL
          </span>
        </div>
        <button
          onClick={() => window.close()}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
            fontWeight: 700,
            padding: '5px 14px',
            cursor: 'pointer',
            fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
          }}
        >
          창 닫기 ✕
        </button>
      </div>

      {/* 계산기 본문 */}
      <FinancialCalc />
    </div>
  )
}
