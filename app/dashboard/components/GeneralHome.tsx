'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import {
  ArrowLeftRight, BarChart3, Bell, BookOpen, Calculator, CarFront,
  ChevronDown, ClipboardCheck, FileSearch, Hospital,
  PieChart, Scale, Search, ShieldCheck, Star, Stethoscope, ScrollText,
} from 'lucide-react'
import type { ConsultingTool } from '../../../lib/consultingTools'
import { CONSULTING_TOOL_CATEGORIES } from '../../../lib/consultingTools'
import CalendarWidget from './CalendarWidget'

function ToolIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const props = { size, color: '#0a3a86' }
  switch (icon) {
    case 'cafe':           return <BookOpen {...props} />
    case 'search':         return <Search {...props} />
    case 'hospital':       return <Hospital {...props} />
    case 'crash':          return <Scale {...props} />
    case 'chart':          return <BarChart3 {...props} />
    case 'calculator-car': return <CarFront {...props} />
    case 'code':           return <FileSearch {...props} />
    case 'compare':        return <ArrowLeftRight {...props} />
    case 'surgery':        return <Stethoscope {...props} />
    case 'document':       return <ScrollText {...props} />
    case 'checklist':      return <ClipboardCheck {...props} />
    case 'shield':         return <ShieldCheck {...props} />
    case 'calculator':     return <Calculator {...props} />
    case 'finance':        return <PieChart {...props} />
    case 'exam':           return <BookOpen {...props} />
    case 'dm':             return <ScrollText {...props} />
    default:               return <Search {...props} />
  }
}

interface GeneralHomeProps {
  user: any
  canUseCrm: boolean
  announcements: any[]
  favorites: string[]
  isFavEditMode: boolean
  visibleTools: ConsultingTool[]
  onFavEditToggle: () => void
  onFavToggle: (id: string) => void
  onNavigate: (tool: ConsultingTool) => void
  onNoticeClick: () => void
  onStrategyClick: () => void
}

const CAT_STYLE: Record<string, { bg: string; border: string; iconBg: string }> = {
  face:     { bg: '#eef8ff', border: '#bfdbfe', iconBg: '#dbeafe' },
  customer: { bg: '#f0fdf4', border: '#bbf7d0', iconBg: '#dcfce7' },
  coverage: { bg: '#fdf4ff', border: '#e9d5ff', iconBg: '#f3e8ff' },
  financial:{ bg: '#fff7ed', border: '#fed7aa', iconBg: '#ffedd5' },
  planning: { bg: '#f0f9ff', border: '#bae6fd', iconBg: '#e0f2fe' },
  claims:   { bg: '#fff1f2', border: '#fecdd3', iconBg: '#ffe4e6' },
}

// 추천 도구 ID (숫자 제외, 특정 3개)
const RECOMMENDED_IDS = ['show_first_coverage_check', 'show_underwriting', 'show_car_accident']

export default function GeneralHome({
  user, canUseCrm, announcements, favorites, isFavEditMode, visibleTools,
  onFavEditToggle, onFavToggle, onNavigate, onNoticeClick, onStrategyClick,
}: GeneralHomeProps) {
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({})

  const name = user?.name || user?.email?.split('@')[0] || ''
  const noticeCnt = announcements.filter(a => a.category === 'notice').length
  const updateCnt = announcements.filter(a => a.category === 'update').length

  // 최근 사용한 도구 = 즐겨찾기 (최대 6개)
  const recentTools = visibleTools.filter(t => favorites.includes(t.id)).slice(0, 6)

  // 업무별 카테고리 (도구 있는 것만)
  const categorySections = CONSULTING_TOOL_CATEGORIES
    .map(cat => ({ ...cat, tools: visibleTools.filter(t => t.category === cat.id) }))
    .filter(s => s.tools.length > 0)

  // 추천 도구 3개
  const recommendedTools = RECOMMENDED_IDS
    .map(id => visibleTools.find(t => t.id === id))
    .filter(Boolean) as ConsultingTool[]

  const toggleCat = (id: string) =>
    setOpenCats(p => ({ ...p, [id]: !p[id] }))

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* ── 헤더 ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#10203a', margin: 0, lineHeight: 1.3 }}>
            {name}님, 필요한 도구를 빠르게 열어보세요
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            오늘도 든든한 상담 파트너가 되겠습니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={onNoticeClick}
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid #dce6f1', background: '#fff', color: '#10203a', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(16,32,58,0.06)' }}
          >
            <Bell size={13} />
            공지·업데이트
            {(noticeCnt + updateCnt) > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, background: '#e63946', color: '#fff', borderRadius: '50%', width: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900 }}>
                {noticeCnt + updateCnt}
              </span>
            )}
          </button>
          <button
            onClick={() => window.open('/guide.html', '_blank', 'width=1100,height=800,menubar=no,toolbar=no,location=no')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid #dce6f1', background: '#fff', color: '#1b54ad', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(16,32,58,0.06)' }}
          >
            <BookOpen size={13} />
            사용가이드
          </button>
        </div>
      </header>

      {/* ── 2컬럼 메인 ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>

        {/* 왼쪽: 업무별 도구 + 최근 사용 */}
        <div style={{ flex: '1 1 380px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 업무별 도구 */}
          <section style={card}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#10203a', marginBottom: 14 }}>업무별 도구</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {categorySections.map(cat => {
                const isOpen = openCats[cat.id] ?? false
                const s = CAT_STYLE[cat.id] || CAT_STYLE.face
                return (
                  <div key={cat.id}>
                    <button
                      onClick={() => toggleCat(cat.id)}
                      style={{
                        display: 'flex', alignItems: 'center', width: '100%', gap: 10,
                        padding: '10px 14px',
                        borderRadius: isOpen ? '10px 10px 0 0' : 10,
                        border: `1px solid ${isOpen ? s.border : '#e8eef5'}`,
                        background: isOpen ? s.bg : '#f8fafc',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: '#10203a', textAlign: 'left' }}>
                        {cat.title}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{cat.desc.slice(0, 18)}</span>
                      <ChevronDown
                        size={14} color="#94a3b8"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                      />
                    </button>
                    {isOpen && (
                      <div style={{
                        border: `1px solid ${s.border}`, borderTop: 'none',
                        borderRadius: '0 0 10px 10px', background: '#fff',
                        padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6,
                      }}>
                        {cat.tools.map(tool => (
                          <button
                            key={tool.id}
                            onClick={() => onNavigate(tool)}
                            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 8, border: '1px solid #eef2f8', background: '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: 800, color: '#10203a', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = s.border; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#eef2f8'; }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 5, background: s.iconBg, flexShrink: 0 }}>
                              <ToolIcon icon={tool.icon} size={12} />
                            </span>
                            {tool.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* 최근 사용한 도구 */}
          <section style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={15} style={{ fill: '#172947', color: '#172947' }} />
                <span style={{ fontSize: 15, fontWeight: 900, color: '#10203a' }}>최근 사용한 도구</span>
              </div>
              <button onClick={onFavEditToggle} style={editBtn}>
                {isFavEditMode ? '완료' : '편집'}
              </button>
            </div>
            {recentTools.length === 0 && !isFavEditMode ? (
              <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>편집을 눌러 즐겨찾기를 추가하세요.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {(isFavEditMode ? visibleTools.slice(0, 12) : recentTools).map(tool => {
                  const isFav = favorites.includes(tool.id)
                  return (
                    <button
                      key={tool.id}
                      onClick={() => isFavEditMode ? onFavToggle(tool.id) : onNavigate(tool)}
                      style={{
                        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 7, padding: '12px 8px', borderRadius: 10,
                        border: `1px solid ${isFavEditMode && isFav ? '#1b54ad' : '#e8eef5'}`,
                        background: isFavEditMode && isFav ? '#eef4fb' : '#f8fafc',
                        cursor: 'pointer', textAlign: 'center',
                      }}
                      onMouseEnter={e => { if (!isFavEditMode) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#bfdbfe'; } }}
                      onMouseLeave={e => { e.currentTarget.style.background = isFavEditMode && isFav ? '#eef4fb' : '#f8fafc'; e.currentTarget.style.borderColor = isFavEditMode && isFav ? '#1b54ad' : '#e8eef5'; }}
                    >
                      {isFavEditMode && (
                        <Star size={9} style={{ position: 'absolute', top: 5, right: 5, fill: isFav ? '#f59e0b' : 'none', color: isFav ? '#f59e0b' : '#cbd5e1' }} />
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: '#eef4fb' }}>
                        <ToolIcon icon={tool.icon} size={15} />
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#10203a', lineHeight: 1.3 }}>{tool.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* 오른쪽: 캘린더 + 공지 */}
        <div style={{ flex: '0 0 320px', minWidth: 280, maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CalendarWidget user={user} canUseCrm={canUseCrm} />

          {/* 공지 및 업데이트 */}
          <section style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#10203a' }}>공지 및 업데이트</span>
              <button onClick={onNoticeClick} style={editBtn}>전체보기</button>
            </div>
            {announcements.length === 0 ? (
              <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>등록된 공지사항이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {announcements.slice(0, 5).map((ann, i) => (
                  <button
                    key={ann.id}
                    onClick={onNoticeClick}
                    style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '9px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 10, background: ann.category === 'update' ? '#dcfce7' : '#eef4fb', color: ann.category === 'update' ? '#16a34a' : '#1b54ad', flexShrink: 0 }}>
                        {ann.category === 'update' ? '업데이트' : '공지'}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#10203a', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {ann.title.replace(/^\[.*?\]\s*/, '')}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: '#94a3b8', paddingLeft: 2 }}>
                      {new Date(ann.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── 추천 도구 ── */}
      {recommendedTools.length > 0 && (
        <section style={card}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#10203a', marginBottom: 14 }}>추천 도구</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {recommendedTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => onNavigate(tool)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: '1px solid #dce6f1', background: '#f8fafc', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(16,32,58,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <span style={{ width: 42, height: 42, background: '#eef4fb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ToolIcon icon={tool.icon} size={20} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#10203a' }}>{tool.title}</div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{tool.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 외부 링크 4버튼 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <ExtLink label="시그널그룹 홈페이지" emoji="🏢" onClick={() => window.open('https://signalgroup-sigma.vercel.app/index.html', '_blank')} bg="#eef4fb" color="#1b54ad" />
        <ExtLink label="이달의 상품전략" emoji="📊" onClick={onStrategyClick} bg="#fffbf0" color="#8a6a1e" />
        <ExtLink
          label="보험의 기준 카페" emoji="☕"
          onClick={() => { const m = /Android|iPhone|iPad/i.test(navigator.userAgent); window.open(m ? 'https://m.cafe.naver.com/signal1035' : 'https://cafe.naver.com/signal1035', '_blank') }}
          bg="#f0fff8" color="#0f6e56"
        />
        <ExtLink label="오픈채팅" emoji="💬" onClick={() => window.open('https://open.kakao.com/o/g8ND5toi', '_blank')} bg="#fffbea" color="#92700a" />
      </div>

    </div>
  )
}

function ExtLink({ label, emoji, onClick, bg, color }: { label: string; emoji: string; onClick: () => void; bg: string; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '16px 10px', borderRadius: 12, border: '1px solid #e8eef5', background: bg, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(16,32,58,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color, lineHeight: 1.3 }}>{label}</span>
    </button>
  )
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 14, border: '1px solid #e8eef5',
  padding: '20px 22px', boxShadow: '0 1px 6px rgba(16,32,58,0.05)',
}
const editBtn: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: '#21324d',
  background: '#f8fafc', border: '1px solid #dce6f1',
  borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
}
