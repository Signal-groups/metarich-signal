'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import {
  ArrowLeftRight, BarChart3, BookOpen, Calculator, CarFront,
  ChevronDown, ClipboardCheck, FileSearch, Hospital,
  PieChart, Scale, Search, ShieldCheck, Star, Stethoscope, ScrollText, Bell,
} from 'lucide-react'
import type { ConsultingTool } from '../../../lib/consultingTools'
import { CONSULTING_TOOL_CATEGORIES } from '../../../lib/consultingTools'
import CalendarWidget from './CalendarWidget'

function ToolIcon({ icon, size = 15 }: { icon: string; size?: number }) {
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

const CAT_STYLE: Record<string, { bg: string; border: string; iconBg: string; activeBg: string; activeText: string }> = {
  face:     { bg: '#eef8ff', border: '#bfdbfe', iconBg: '#dbeafe', activeBg: '#1b54ad', activeText: '#fff' },
  customer: { bg: '#f0fdf4', border: '#bbf7d0', iconBg: '#dcfce7', activeBg: '#0f6e56', activeText: '#fff' },
  coverage: { bg: '#fdf4ff', border: '#e9d5ff', iconBg: '#f3e8ff', activeBg: '#7c3aed', activeText: '#fff' },
  financial:{ bg: '#fff7ed', border: '#fed7aa', iconBg: '#ffedd5', activeBg: '#d97706', activeText: '#fff' },
  planning: { bg: '#f0f9ff', border: '#bae6fd', iconBg: '#e0f2fe', activeBg: '#0284c7', activeText: '#fff' },
  claims:   { bg: '#fff1f2', border: '#fecdd3', iconBg: '#ffe4e6', activeBg: '#e63946', activeText: '#fff' },
}

const MAX_FAV = 10   // 즐겨찾기 최대 개수
const FAV_COLS = 5   // 한 행에 5개

export default function GeneralHome({
  user, canUseCrm, announcements, favorites, isFavEditMode, visibleTools,
  onFavEditToggle, onFavToggle, onNavigate, onNoticeClick, onStrategyClick,
}: GeneralHomeProps) {
  const [activeCat, setActiveCat] = useState<string | null>(null)

  const noticeCnt = announcements.filter(a => a.category === 'notice').length
  const updateCnt = announcements.filter(a => a.category === 'update').length

  // 즐겨찾기 (순서 유지, 최대 10개)
  const favTools = visibleTools
    .filter(t => favorites.includes(t.id))
    .sort((a, b) => favorites.indexOf(a.id) - favorites.indexOf(b.id))
    .slice(0, MAX_FAV)

  // 편집 모드에서 표시할 후보 도구 (최대 20개)
  const editPool = isFavEditMode ? visibleTools.slice(0, 20) : favTools

  // 업무별 카테고리 (고객 상담 제외)
  const categorySections = CONSULTING_TOOL_CATEGORIES
    .filter(cat => cat.id !== 'customer')
    .map(cat => ({ ...cat, tools: visibleTools.filter(t => t.category === cat.id) }))
    .filter(s => s.tools.length > 0)

  const activeSectionData = activeCat
    ? categorySections.find(c => c.id === activeCat)
    : null

  const toggleCat = (id: string) =>
    setActiveCat(prev => prev === id ? null : id)

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* ══════════════════════════════════════════════════
          SECTION 1: 배너 4개
      ══════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          {
            label: '보험의 기준 카페', sub: '네이버 카페', emoji: '☕',
            bg: 'linear-gradient(135deg, #f0fff8 0%, #e8f5e9 100%)', border: '#bbf7d0', color: '#0f6e56',
            onClick: () => { const m = /Android|iPhone|iPad/i.test(navigator.userAgent); window.open(m ? 'https://m.cafe.naver.com/signal1035' : 'https://cafe.naver.com/signal1035', '_blank') },
          },
          {
            label: '보험의 기준', sub: '오픈채팅방', emoji: '💬',
            bg: 'linear-gradient(135deg, #fffbf0 0%, #fef3c7 100%)', border: '#fde68a', color: '#92700a',
            onClick: () => window.open('https://open.kakao.com/o/g8ND5toi', '_blank'),
          },
          {
            label: '메타리치 시그널그룹', sub: '영업의 품격 · 박주완 본부장', emoji: '⭐',
            bg: 'linear-gradient(135deg, #eef4fb 0%, #dbeafe 100%)', border: '#bfdbfe', color: '#1b54ad',
            onClick: () => window.open('https://signal-groups.github.io/insuclass/', '_blank'),
          },
          {
            label: 'CJ온스타일 GA', sub: '보험설계사·조직관리자 모집', emoji: '📺',
            bg: 'linear-gradient(135deg, #fdf4ff 0%, #f3e8ff 100%)', border: '#e9d5ff', color: '#7c3aed',
            onClick: () => window.open('https://signal-groups.github.io/cjon/', '_blank'),
          },
        ].map((b, i) => (
          <button key={i} onClick={b.onClick}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px 16px', borderRadius: 14, border: `1px solid ${b.border}`, background: b.bg, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,32,58,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            <span style={{ fontSize: 22 }}>{b.emoji}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: b.color, lineHeight: 1.3 }}>{b.label}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: b.color, opacity: 0.7, marginTop: 2 }}>{b.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 2: 즐겨찾기(5×2) + 업무별 도구(5카테고리) 통합
      ══════════════════════════════════════════════════ */}
      <section style={card}>
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* 왼쪽: 즐겨찾기 5×2 */}
          <div style={{ flex: '1 1 340px', minWidth: 300, paddingRight: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Star size={14} style={{ fill: '#172947', color: '#172947' }} />
                <span style={{ fontSize: 14, fontWeight: 900, color: '#10203a' }}>즐겨찾기 도구</span>
                {!isFavEditMode && favTools.length > 0 && (
                  <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{favTools.length}/{MAX_FAV}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {isFavEditMode && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', background: '#f1f5f9', borderRadius: 8, padding: '2px 8px' }}>클릭으로 추가·제거</span>
                )}
                <button onClick={onFavEditToggle} style={editBtn}>
                  {isFavEditMode ? '완료' : '편집'}
                </button>
              </div>
            </div>

            {favTools.length === 0 && !isFavEditMode ? (
              <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 24 }}>⭐</span>
                <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, margin: 0 }}>편집을 눌러 즐겨찾기를 추가하세요</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${FAV_COLS}, 1fr)`, gap: 7 }}>
                {editPool.map(tool => {
                  const isFav = favorites.includes(tool.id)
                  return (
                    <button
                      key={tool.id}
                      onClick={() => isFavEditMode ? onFavToggle(tool.id) : onNavigate(tool)}
                      style={{
                        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 5, padding: '9px 4px', borderRadius: 10,
                        border: `1.5px solid ${isFavEditMode && isFav ? '#1b54ad' : '#e8eef5'}`,
                        background: isFavEditMode && isFav ? '#eef4fb' : '#f8fafc',
                        cursor: 'pointer', transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { if (!isFavEditMode) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,32,58,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                      onMouseLeave={e => { e.currentTarget.style.background = isFavEditMode && isFav ? '#eef4fb' : '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                    >
                      {isFavEditMode && (
                        <Star size={8} style={{ position: 'absolute', top: 3, right: 3, fill: isFav ? '#f59e0b' : 'none', color: isFav ? '#f59e0b' : '#cbd5e1' }} />
                      )}
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: '#eef4fb' }}>
                        <ToolIcon icon={tool.icon} size={14} />
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#10203a', lineHeight: 1.3, textAlign: 'center', wordBreak: 'keep-all' }}>{tool.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 구분선 */}
          <div style={{ width: 1, background: '#e8eef5', alignSelf: 'stretch', flexShrink: 0, minHeight: 100 }} />

          {/* 오른쪽: 업무별 도구 5개 카테고리 버튼 */}
          <div style={{ flex: '0 0 220px', minWidth: 200, paddingLeft: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#10203a', marginBottom: 12 }}>업무별 도구</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {categorySections.map(cat => {
                const isActive = activeCat === cat.id
                const s = CAT_STYLE[cat.id] || CAT_STYLE.face
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCat(cat.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      padding: '9px 14px', borderRadius: 10, width: '100%',
                      border: `1.5px solid ${isActive ? s.activeBg : s.border}`,
                      background: isActive ? s.activeBg : s.bg,
                      cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.boxShadow = '0 2px 6px rgba(16,32,58,0.08)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800, color: isActive ? s.activeText : '#10203a', textAlign: 'left', flex: 1 }}>
                      {cat.title}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 12, background: isActive ? 'rgba(255,255,255,0.25)' : s.iconBg, color: isActive ? s.activeText : '#64748b', flexShrink: 0 }}>
                      {cat.tools.length}
                    </span>
                    <ChevronDown
                      size={12}
                      color={isActive ? s.activeText : '#94a3b8'}
                      style={{ transform: isActive ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 아코디언 펼침 영역 — 카드 하단 전체 폭 */}
        {activeSectionData && (() => {
          const s = CAT_STYLE[activeSectionData.id] || CAT_STYLE.face
          return (
            <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${s.border}`, background: s.bg }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>
                {activeSectionData.desc}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {activeSectionData.tools.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => onNavigate(tool)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9, border: `1px solid ${s.border}`, background: '#fff', cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,32,58,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = s.activeBg; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = s.border; }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: s.iconBg, flexShrink: 0 }}>
                      <ToolIcon icon={tool.icon} size={12} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#10203a' }}>{tool.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}
      </section>

      {/* ══════════════════════════════════════════════════
          SECTION 3: 달력 50/50 (CalendarWidget 내부 반반 처리)
                    + 우측 하단: 공지·버튼
      ══════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>

        {/* 달력 (full width) */}
        <div style={{ flex: '1 1 500px', minWidth: 320 }}>
          <CalendarWidget user={user} canUseCrm={canUseCrm} />
        </div>

        {/* 우측: 버튼 3개 + 공지 */}
        <div style={{ flex: '0 0 260px', minWidth: 240, maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 빠른 이동 버튼 3개 */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onNoticeClick}
              style={{ position: 'relative', flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 34, borderRadius: 9, border: '1px solid #dce6f1', background: '#fff', color: '#10203a', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              <Bell size={12} />공지
              {(noticeCnt + updateCnt) > 0 && (
                <span style={{ position: 'absolute', top: -5, right: -5, background: '#e63946', color: '#fff', borderRadius: '50%', width: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900 }}>
                  {noticeCnt + updateCnt}
                </span>
              )}
            </button>
            <button onClick={onStrategyClick}
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 34, borderRadius: 9, border: '1px solid #dce6f1', background: '#fff', color: '#8a6a1e', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              📊 이달의 전략
            </button>
            <button onClick={() => window.open('/guide.html', '_blank', 'width=1100,height=800,menubar=no,toolbar=no,location=no')}
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 34, borderRadius: 9, border: '1px solid #dce6f1', background: '#fff', color: '#1b54ad', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              <BookOpen size={12} />가이드
            </button>
          </div>

          {/* 공지사항 */}
          <section style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#10203a' }}>공지 및 업데이트</span>
              <button onClick={onNoticeClick} style={editBtn}>전체보기</button>
            </div>
            {announcements.length === 0 ? (
              <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>등록된 공지사항이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {announcements.slice(0, 5).map((ann, i) => (
                  <button key={ann.id} onClick={onNoticeClick}
                    style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 9, fontWeight: 900, padding: '1px 5px', borderRadius: 10, background: ann.category === 'update' ? '#dcfce7' : '#eef4fb', color: ann.category === 'update' ? '#16a34a' : '#1b54ad', flexShrink: 0 }}>
                        {ann.category === 'update' ? '업데이트' : '공지'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#10203a', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
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

    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 14, border: '1px solid #e8eef5',
  padding: '20px 22px', boxShadow: '0 1px 6px rgba(16,32,58,0.05)',
}
const editBtn: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#21324d',
  background: '#f8fafc', border: '1px solid #dce6f1',
  borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
}
