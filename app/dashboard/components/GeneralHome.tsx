'use client'

import { Bell, BookOpen, Lightbulb, Megaphone, ShieldCheck, Star } from 'lucide-react'
import type { ConsultingTool } from '../../../lib/consultingTools'

function ToolIcon({ icon, className = 'h-5 w-5' }: { icon: string; className?: string }) {
  const icons: Record<string, string> = {
    cafe: '📚', search: '🔍', hospital: '🏥', pill: '💊', crash: '⚖️',
    chart: '📊', 'calculator-car': '🚗', code: '📋', compare: '🔄',
    surgery: '🩺', document: '📄', checklist: '✅', shield: '🛡️',
    calculator: '🧮', finance: '📈', exam: '🎓', dm: '📨',
  }
  return (
    <span style={{ fontSize: 20 }} className={className}>
      {icons[icon] ?? '🔧'}
    </span>
  )
}

interface GeneralHomeProps {
  user: any
  announcements: any[]
  favorites: string[]
  isFavEditMode: boolean
  visibleTools: ConsultingTool[]
  onFavEditToggle: () => void
  onFavToggle: (id: string) => void
  onNavigate: (tool: ConsultingTool) => void
  onNoticeClick: () => void
  onUpdateClick: () => void
}

export default function GeneralHome({
  user,
  announcements,
  favorites,
  isFavEditMode,
  visibleTools,
  onFavEditToggle,
  onFavToggle,
  onNavigate,
  onNoticeClick,
  onUpdateClick,
}: GeneralHomeProps) {
  const isApproved = !!user?.is_approved || user?.effectiveRole === 'master'
  const name = user?.name || user?.email?.split('@')[0] || ''
  const favoriteTools = visibleTools.filter((t) => favorites.includes(t.id))
  const noticeCount = announcements.filter((a) => a.category === 'notice').length
  const updateCount = announcements.filter((a) => a.category === 'update').length

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* ── 헤더 ── */}
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#10203a', lineHeight: 1.3, margin: 0 }}>
            {name}님, 오늘 필요한 도구만 빠르게 열어보세요
          </h1>
          {!isApproved && (
            <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
              ⏳ 관리자 승인 대기 중 — 승인 후 전체 기능을 이용할 수 있습니다.
            </p>
          )}
        </div>

        {/* 상단 버튼 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <TopBtn icon={<Bell size={14} />} label="공지" count={noticeCount} onClick={onNoticeClick} />
          <TopBtn icon={<Megaphone size={14} />} label="업데이트" count={updateCount} onClick={onUpdateClick} countColor="#0f6e56" />
          <TopBtn
            icon={<BookOpen size={14} />} label="일반가이드"
            onClick={() => window.open('/guide.html?tab=basic', '_blank', 'width=1100,height=800,menubar=no,toolbar=no,location=no')}
            accent="#1b54ad"
          />
          <TopBtn
            icon={<Star size={14} style={{ fill: '#f6c342', color: '#f6c342' }} />} label="프로가이드"
            onClick={() => window.open('/guide.html?tab=pro', '_blank', 'width=1100,height=800,menubar=no,toolbar=no,location=no')}
          />
          <TopBtn
            icon={<ShieldCheck size={14} />} label="시그널그룹 홈페이지"
            onClick={() => window.open('https://signalgroup-sigma.vercel.app/index.html', '_blank')}
            filled
          />
        </div>
      </header>

      {/* ── 즐겨찾기 ── */}
      <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #dce6f1', padding: '20px 24px', boxShadow: '0 2px 10px rgba(16,32,58,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Star size={20} style={{ fill: '#172947', color: '#172947' }} />
            <span style={{ fontSize: 17, fontWeight: 900, color: '#10203a' }}>즐겨찾기</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4b5d76', background: '#f2f5f9', borderRadius: 20, padding: '2px 10px' }}>나만의 바로가기</span>
          </div>
          <button
            onClick={onFavEditToggle}
            style={{ fontSize: 12, fontWeight: 700, color: '#21324d', background: '#f8fafc', border: '1px solid #dce6f1', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
          >
            {isFavEditMode ? '완료' : '편집'}
          </button>
        </div>

        {favoriteTools.length === 0 && !isFavEditMode ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13, fontWeight: 700 }}>
            <Lightbulb size={16} /> 편집을 눌러 자주 쓰는 도구에 ★를 클릭하면 여기에 모입니다.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10 }}>
            {(isFavEditMode ? visibleTools : favoriteTools).map((tool) => {
              const isFav = favorites.includes(tool.id)
              return (
                <button
                  key={tool.id}
                  onClick={() => isFavEditMode ? onFavToggle(tool.id) : onNavigate(tool)}
                  style={{
                    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 6, padding: '12px 8px',
                    background: isFavEditMode && isFav ? '#eef4fb' : '#f8fafc',
                    border: `1px solid ${isFavEditMode && isFav ? '#1b54ad' : '#dce6f1'}`,
                    borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {isFavEditMode && (
                    <Star size={11} style={{ position: 'absolute', top: 6, right: 6, fill: isFav ? '#f59e0b' : 'none', color: isFav ? '#f59e0b' : '#cbd5e1' }} />
                  )}
                  <ToolIcon icon={tool.icon} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#10203a', lineHeight: 1.3 }}>{tool.title}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 자주 쓰는 기능 ── */}
      <section style={{ background: '#fff', borderRadius: 14, border: '1px solid #dce6f1', padding: '20px 24px', boxShadow: '0 2px 10px rgba(16,32,58,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#10203a' }}>자주 쓰는 기능</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4b5d76', background: '#f2f5f9', borderRadius: 20, padding: '2px 10px' }}>
            {isApproved ? '일반 사용자에게 꼭 필요한 기능을 모았습니다.' : '기본 공개 도구'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {visibleTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onNavigate(tool)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: '#f8fafc', border: '1px solid #dce6f1', borderRadius: 10,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(16,32,58,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <span style={{ width: 32, height: 32, background: '#eef4fb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                <ToolIcon icon={tool.icon} />
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#10203a' }}>{tool.title}</div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 1 }}>{tool.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── 프로 기능 안내 배너 ── */}
      {!isApproved && (
        <section style={{ background: 'linear-gradient(135deg, #fef9ec 0%, #fff8e1 100%)', borderRadius: 14, border: '1px solid #f6d860', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 36 }}>⭐</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#92400e', marginBottom: 4 }}>프로 기능 안내</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#78350f' }}>
              CRM, 보장분석 PRO, 제안서 생성, 재무설계 포트폴리오는 프로 승인 후 사용 가능합니다.
            </div>
          </div>
          <button
            onClick={() => window.open('/guide.html?tab=pro', '_blank', 'width=1100,height=800,menubar=no,toolbar=no,location=no')}
            style={{ padding: '10px 20px', background: '#1a2744', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            프로 가이드 보기 →
          </button>
        </section>
      )}
    </div>
  )
}

/* ── 상단 버튼 공통 컴포넌트 ── */
function TopBtn({
  icon, label, count, countColor, accent, filled, onClick,
}: {
  icon: React.ReactNode; label: string; count?: number; countColor?: string
  accent?: string; filled?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 36, padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
        border: filled ? 'none' : '1px solid #dce6f1',
        background: filled ? '#0a3268' : '#fff',
        color: filled ? '#fff' : (accent || '#10203a'),
        boxShadow: '0 1px 4px rgba(16,32,58,0.06)',
      }}
    >
      {icon}
      {label}
      {count != null && count > 0 && (
        <span style={{
          position: 'absolute', top: -5, right: -5, width: 16, height: 16,
          background: countColor || '#e63946', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 900, color: '#fff',
        }}>
          {count}
        </span>
      )}
    </button>
  )
}
