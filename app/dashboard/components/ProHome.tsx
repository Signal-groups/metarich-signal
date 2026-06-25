'use client'

import { Bell, BookOpen, Lightbulb, Megaphone, ShieldCheck, Star, Users, ChevronRight } from 'lucide-react'
import type { ConsultingTool } from '../../../lib/consultingTools'
import { CONSULTING_TOOL_GROUPS } from '../../../lib/consultingTools'

function ToolIcon({ icon }: { icon: string }) {
  const icons: Record<string, string> = {
    cafe: '📚', search: '🔍', hospital: '🏥', pill: '💊', crash: '⚖️',
    chart: '📊', 'calculator-car': '🚗', code: '📋', compare: '🔄',
    surgery: '🩺', document: '📄', checklist: '✅', shield: '🛡️',
    calculator: '🧮', finance: '📈', exam: '🎓', dm: '📨',
  }
  return <span style={{ fontSize: 18 }}>{icons[icon] ?? '🔧'}</span>
}

interface ProHomeProps {
  user: any
  announcements: any[]
  favorites: string[]
  isFavEditMode: boolean
  visibleTools: ConsultingTool[]
  recentCustomers: any[]
  onFavEditToggle: () => void
  onFavToggle: (id: string) => void
  onNavigate: (tool: ConsultingTool) => void
  onNoticeClick: () => void
  onUpdateClick: () => void
}

export default function ProHome({
  user,
  announcements,
  favorites,
  isFavEditMode,
  visibleTools,
  recentCustomers,
  onFavEditToggle,
  onFavToggle,
  onNavigate,
  onNoticeClick,
  onUpdateClick,
}: ProHomeProps) {
  const name = user?.name || user?.email?.split('@')[0] || ''
  const noticeCount = announcements.filter((a) => a.category === 'notice').length
  const updateCount = announcements.filter((a) => a.category === 'update').length
  const favoriteTools = visibleTools.filter((t) => favorites.includes(t.id))

  // 그룹별 도구
  const toolSections = CONSULTING_TOOL_GROUPS.map((group) => ({
    ...group,
    tools: group.toolIds
      .map((id) => visibleTools.find((t) => t.id === id))
      .filter(Boolean) as ConsultingTool[],
  })).filter((g) => g.tools.length > 0)

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* ── 헤더 ── */}
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#10203a', lineHeight: 1.3, margin: 0 }}>
            {name}님, 오늘 상담을 시작해볼까요?
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, fontWeight: 600, color: '#50627a' }}>
            고객의 미래를 함께 설계하는 든든한 파트너가 되겠습니다.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <TopBtn icon={<Bell size={14} />} label="공지" count={noticeCount} onClick={onNoticeClick} />
          <TopBtn icon={<Megaphone size={14} />} label="업데이트" count={updateCount} onClick={onUpdateClick} countColor="#0f6e56" />
          <TopBtn icon={<BookOpen size={14} />} label="일반가이드" accent="#1b54ad"
            onClick={() => window.open('/guide.html?tab=basic', '_blank', 'width=1100,height=800,menubar=no,toolbar=no,location=no')} />
          <TopBtn icon={<Star size={14} style={{ fill: '#f6c342', color: '#f6c342' }} />} label="프로가이드"
            onClick={() => window.open('/guide.html?tab=pro', '_blank', 'width=1100,height=800,menubar=no,toolbar=no,location=no')} />
          <TopBtn icon={<ShieldCheck size={14} />} label="시그널그룹 홈페이지" filled
            onClick={() => window.open('https://signalgroup-sigma.vercel.app/index.html', '_blank')} />
          <TopBtn
            icon={<span style={{ width: 16, height: 16, background: '#03c75a', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff' }}>N</span>}
            label="보험의 기준 카페"
            onClick={() => { const m = /Android|iPhone|iPad/i.test(navigator.userAgent); window.open(m ? 'https://m.cafe.naver.com/signal1035' : 'https://cafe.naver.com/signal1035', '_blank') }}
          />
        </div>
      </header>

      {/* ── 즐겨찾기 ── */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Star size={20} style={{ fill: '#172947', color: '#172947' }} />
            <span style={{ fontSize: 17, fontWeight: 900, color: '#10203a' }}>즐겨찾기</span>
            <Chip label="나만의 바로가기" />
          </div>
          <button onClick={onFavEditToggle} style={editBtnStyle}>
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
                    position: 'relative', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 8px',
                    background: isFavEditMode && isFav ? '#eef4fb' : '#f8fafc',
                    border: `1px solid ${isFavEditMode && isFav ? '#1b54ad' : '#dce6f1'}`,
                    borderRadius: 10, cursor: 'pointer', textAlign: 'center',
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

      {/* ── 최근 고객 ── */}
      {recentCustomers.length > 0 && (
        <section style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={20} color="#10203a" />
              <span style={{ fontSize: 17, fontWeight: 900, color: '#10203a' }}>최근 고객 5명</span>
              <Chip label="CRM 바로가기" color="#1b54ad" bg="#eef4fb" />
            </div>
            <button
              onClick={() => window.open(`${window.location.origin}/crm/customers`, '_blank', 'noopener,noreferrer')}
              style={editBtnStyle}
            >
              전체보기
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {recentCustomers.map((c) => (
              <button
                key={c.id}
                onClick={() => window.open(`${window.location.origin}/crm/customers/${c.id}`, '_blank', 'noopener,noreferrer')}
                style={{
                  padding: '14px 16px', background: '#f8fafc', border: '1px solid #dce6f1',
                  borderRadius: 10, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(16,32,58,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#10203a' }}>{c.name || '이름 없음'}</span>
                  {c.status && <span style={{ fontSize: 10, fontWeight: 700, color: c.status === '활동중' ? '#0f6e56' : '#64748b', background: c.status === '활동중' ? '#e1f5ee' : '#f1f5f9', borderRadius: 12, padding: '2px 8px' }}>{c.status}</span>}
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {c.consulting_summary || c.memo || c.phone || '상담 내용을 확인하세요.'}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 자주 쓰는 기능 — 일반/프로 2열 ── */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#10203a' }}>자주 쓰는 기능</span>
          <Chip label="표시/숨김 설정" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {toolSections.map((section) => (
            <div key={section.id} style={{ background: '#f8fafc', borderRadius: 10, padding: '16px 18px', border: '1px solid #eef2f8' }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#1a2744', marginBottom: 12 }}>{section.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {section.tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => onNavigate(tool)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      background: '#fff', border: '1px solid #e8eef5', borderRadius: 8,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1b54ad'; e.currentTarget.style.background = '#f7faff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e8eef5'; e.currentTarget.style.background = '#fff' }}
                  >
                    <span style={{ width: 28, height: 28, background: '#eef4fb', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ToolIcon icon={tool.icon} />
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: '#10203a' }}>{tool.title}</span>
                    <ChevronRight size={14} color="#94a3b8" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

/* ── 공통 스타일 ── */
const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 14, border: '1px solid #dce6f1',
  padding: '20px 24px', boxShadow: '0 2px 10px rgba(16,32,58,0.04)',
}

const editBtnStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: '#21324d',
  background: '#f8fafc', border: '1px solid #dce6f1',
  borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
}

function Chip({ label, color = '#4b5d76', bg = '#f2f5f9' }: { label: string; color?: string; bg?: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 20, padding: '2px 10px' }}>
      {label}
    </span>
  )
}

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
