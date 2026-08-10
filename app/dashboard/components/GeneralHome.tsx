'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import {
  ArrowLeftRight, BarChart3, BookOpen, Calculator, CarFront,
  ChevronDown, ChevronUp, ClipboardCheck, FileSearch, GripVertical, Hospital,
  PieChart, Scale, Search, ShieldCheck, Star, Stethoscope, ScrollText, Bell, Eye, EyeOff,
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

type InsuCode = { id: string; company: string; code: string; pw: string }

// 공시실 등록 생명보험사 (2025)
const DEFAULT_LIFE: InsuCode[] = [
  { id: 'l01', company: '삼성생명',       code: '', pw: '' },
  { id: 'l02', company: '한화생명',       code: '', pw: '' },
  { id: 'l03', company: '교보생명',       code: '', pw: '' },
  { id: 'l04', company: '신한라이프',     code: '', pw: '' },
  { id: 'l05', company: 'NH농협생명',     code: '', pw: '' },
  { id: 'l06', company: '흥국생명',       code: '', pw: '' },
  { id: 'l07', company: '동양생명',       code: '', pw: '' },
  { id: 'l08', company: 'ABL생명',        code: '', pw: '' },
  { id: 'l09', company: 'DB생명보험',     code: '', pw: '' },
  { id: 'l10', company: 'AIA생명',        code: '', pw: '' },
  { id: 'l11', company: '메트라이프생명', code: '', pw: '' },
  { id: 'l12', company: '처브라이프생명', code: '', pw: '' },
  { id: 'l13', company: '미래에셋생명',   code: '', pw: '' },
  { id: 'l14', company: '라이나생명',     code: '', pw: '' },
  { id: 'l15', company: 'KDB생명',        code: '', pw: '' },
  { id: 'l16', company: '카디프생명',     code: '', pw: '' },
  { id: 'l17', company: '하나생명',       code: '', pw: '' },
  { id: 'l18', company: '푸본현대생명',   code: '', pw: '' },
  { id: 'l19', company: '교보라이프플래닛', code: '', pw: '' },
  { id: 'l20', company: 'iM라이프',       code: '', pw: '' },
]

// 공시실 등록 손해보험사 (2025)
const DEFAULT_NON: InsuCode[] = [
  { id: 'n01', company: '삼성화재',   code: '', pw: '' },
  { id: 'n02', company: '현대해상',   code: '', pw: '' },
  { id: 'n03', company: 'KB손보',     code: '', pw: '' },
  { id: 'n04', company: 'DB손보',     code: '', pw: '' },
  { id: 'n05', company: '메리츠화재', code: '', pw: '' },
  { id: 'n06', company: '한화손보',   code: '', pw: '' },
  { id: 'n07', company: '롯데손보',   code: '', pw: '' },
  { id: 'n08', company: 'MG손보',     code: '', pw: '' },
  { id: 'n09', company: '흥국화재',   code: '', pw: '' },
  { id: 'n10', company: 'NH농협손보', code: '', pw: '' },
  { id: 'n11', company: '하나손보',   code: '', pw: '' },
  { id: 'n12', company: '캐롯손보',   code: '', pw: '' },
  { id: 'n13', company: 'AIG손보',    code: '', pw: '' },
  { id: 'n14', company: 'AXA손보',    code: '', pw: '' },
  { id: 'n15', company: '처브손보',   code: '', pw: '' },
  { id: 'n16', company: '더케이손보', code: '', pw: '' },
]

export default function GeneralHome({
  user, canUseCrm, announcements, favorites, isFavEditMode, visibleTools,
  onFavEditToggle, onFavToggle, onNavigate, onNoticeClick, onStrategyClick,
}: GeneralHomeProps) {
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [mobileFavOpen, setMobileFavOpen] = useState(true)
  const uid = user?.id || 'guest'

  // ── 보험사 코드 — 모바일 기본 접힘
  const [isInsuOpen, setIsInsuOpen] = useState(false)
  const [isInsuEdit, setIsInsuEdit] = useState(false)
  const [insuTab, setInsuTab] = useState<'life' | 'non'>('life')
  const [showPw, setShowPw] = useState(false)
  const [copiedCell, setCopiedCell] = useState<string | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const copyToClipboard = (text: string, cellId: string) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCell(cellId)
      setTimeout(() => setCopiedCell(null), 1500)
    }).catch(() => {})
  }

  const dropRow = (type: 'life' | 'non', from: number, to: number) => {
    if (from === to) return
    const arr = [...(type === 'life' ? lifeCodes : nonCodes)]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    if (type === 'life') { setLifeCodes(arr); localStorage.setItem(`insu-life-${uid}`, JSON.stringify(arr)) }
    else { setNonCodes(arr); localStorage.setItem(`insu-non-${uid}`, JSON.stringify(arr)) }
  }
  const [lifeCodes, setLifeCodes] = useState<InsuCode[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_LIFE
    try { return JSON.parse(localStorage.getItem(`insu-life-${uid}`) || 'null') || DEFAULT_LIFE } catch { return DEFAULT_LIFE }
  })
  const [nonCodes, setNonCodes] = useState<InsuCode[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_NON
    try { return JSON.parse(localStorage.getItem(`insu-non-${uid}`) || 'null') || DEFAULT_NON } catch { return DEFAULT_NON }
  })

  const updateCode = (type: 'life' | 'non', id: string, field: 'code' | 'pw', val: string) => {
    if (type === 'life') {
      const next = lifeCodes.map(c => c.id === id ? { ...c, [field]: val } : c)
      setLifeCodes(next)
      localStorage.setItem(`insu-life-${uid}`, JSON.stringify(next))
    } else {
      const next = nonCodes.map(c => c.id === id ? { ...c, [field]: val } : c)
      setNonCodes(next)
      localStorage.setItem(`insu-non-${uid}`, JSON.stringify(next))
    }
  }

  const moveRow = (type: 'life' | 'non', idx: number, dir: -1 | 1) => {
    const arr = (type === 'life' ? [...lifeCodes] : [...nonCodes])
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
    if (type === 'life') { setLifeCodes(arr); localStorage.setItem(`insu-life-${uid}`, JSON.stringify(arr)) }
    else                 { setNonCodes(arr);  localStorage.setItem(`insu-non-${uid}`,  JSON.stringify(arr)) }
  }

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
    <div style={{ display: 'grid', gap: 16, minWidth: 0, overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════════════════
          HEADER: 작은 버튼 행 (배너 위) — PC 전용
      ══════════════════════════════════════════════════ */}
      <div className="hidden md:flex" style={{ justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={onNoticeClick}
          style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid #dce6f1', background: '#fff', color: '#10203a', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(16,32,58,0.06)' }}>
          <Bell size={12} />공지·업데이트
          {(noticeCnt + updateCnt) > 0 && (
            <span style={{ position: 'absolute', top: -5, right: -5, background: '#e63946', color: '#fff', borderRadius: '50%', width: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900 }}>
              {noticeCnt + updateCnt}
            </span>
          )}
        </button>
        <button onClick={onStrategyClick}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid #dce6f1', background: '#fff', color: '#8a6a1e', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(16,32,58,0.06)' }}>
          📊 이달의 전략
        </button>
        <button onClick={() => window.open('https://signalgroup-sigma.vercel.app/index.html', '_blank')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid #dce6f1', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(16,32,58,0.06)' }}>
          🏢 시그널 홈
        </button>
        <button onClick={() => window.open('/guide.html', '_blank', 'width=1100,height=800,menubar=no,toolbar=no,location=no')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid #dce6f1', background: '#fff', color: '#1b54ad', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(16,32,58,0.06)' }}>
          <BookOpen size={12} />사용가이드
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 1: 배너 4개 — 모바일 2×2 / PC 4×1
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
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
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, padding: '10px 12px', borderRadius: 12, border: `1px solid ${b.border}`, background: b.bg, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,32,58,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            <span style={{ fontSize: 22 }}>{b.emoji}</span>
            <div style={{ fontSize: 14, fontWeight: 900, color: b.color, lineHeight: 1.3 }}>{b.label}</div>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 2 (모바일): 즐겨찾기 4개 + 접기/펼치기
      ══════════════════════════════════════════════════ */}
      <div className="block md:hidden">
        <section style={card}>
          <button
            onClick={() => setMobileFavOpen(p => !p)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Star size={14} style={{ fill: '#172947', color: '#172947' }} />
              <span style={{ fontSize: 15, fontWeight: 900, color: '#10203a' }}>즐겨찾기 도구</span>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{Math.min(favTools.length, 4)}개</span>
            </div>
            <ChevronDown size={14} color="#94a3b8" style={{ transition: 'transform 0.2s', transform: mobileFavOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {mobileFavOpen && (
            favTools.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>
                PC에서 즐겨찾기를 등록해 주세요
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 12 }}>
                {favTools.slice(0, 4).map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => onNavigate(tool)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', borderRadius: 10, border: '1.5px solid #e8eef5', background: '#f8fafc', cursor: 'pointer', minWidth: 0 }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, background: '#eef4fb', flexShrink: 0 }}>
                      <ToolIcon icon={tool.icon} size={16} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#10203a', lineHeight: 1.3, textAlign: 'center', wordBreak: 'break-all', overflowWrap: 'break-word' }}>{tool.title}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </section>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 2 (PC): 즐겨찾기(5×2) + 업무별 도구(5카테고리) 통합
      ══════════════════════════════════════════════════ */}
      <div className="hidden md:block">
      <section style={card}>
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* 왼쪽: 즐겨찾기 5×2 — 전체의 2/3 */}
          <div style={{ flex: '2 1 0', minWidth: 280, paddingRight: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Star size={14} style={{ fill: '#172947', color: '#172947' }} />
                <span style={{ fontSize: 15, fontWeight: 900, color: '#10203a' }}>즐겨찾기 도구</span>
                {!isFavEditMode && favTools.length > 0 && (
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{favTools.length}/{MAX_FAV}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {isFavEditMode && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f1f5f9', borderRadius: 8, padding: '2px 8px' }}>클릭으로 추가·제거</span>
                )}
                <button onClick={onFavEditToggle} style={editBtn}>
                  {isFavEditMode ? '완료' : '편집'}
                </button>
              </div>
            </div>

            {favTools.length === 0 && !isFavEditMode ? (
              <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 24 }}>⭐</span>
                <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 700, margin: 0 }}>편집을 눌러 즐겨찾기를 추가하세요</p>
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
                        gap: 6, padding: '10px 4px', borderRadius: 10,
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
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, background: '#eef4fb' }}>
                        <ToolIcon icon={tool.icon} size={17} />
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#10203a', lineHeight: 1.3, textAlign: 'center', wordBreak: 'keep-all' }}>{tool.title}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 구분선 */}
          <div style={{ width: 1, background: '#e8eef5', alignSelf: 'stretch', flexShrink: 0, minHeight: 100 }} />

          {/* 오른쪽: 업무별 도구 — 전체의 1/3 */}
          <div style={{ flex: '1 1 0', minWidth: 180, paddingLeft: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#10203a', marginBottom: 10 }}>업무별 도구</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {categorySections.map(cat => {
                const isActive = activeCat === cat.id
                const s = CAT_STYLE[cat.id] || CAT_STYLE.face
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCat(cat.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      padding: '8px 12px', borderRadius: 9, width: '100%',
                      border: `1.5px solid ${isActive ? s.activeBg : s.border}`,
                      background: isActive ? s.activeBg : s.bg,
                      cursor: 'pointer', transition: 'all 0.15s',
                      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.boxShadow = '0 2px 6px rgba(16,32,58,0.08)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 800, color: isActive ? s.activeText : '#10203a', textAlign: 'left', flex: 1 }}>
                      {cat.title}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 12, background: isActive ? 'rgba(255,255,255,0.25)' : s.iconBg, color: isActive ? s.activeText : '#64748b', flexShrink: 0 }}>
                      {cat.tools.length}
                    </span>
                    <ChevronDown
                      size={11}
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
              <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>
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
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#10203a' }}>{tool.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}
      </section>
      </div>{/* /PC Section 2 */}

      {/* ══════════════════════════════════════════════════
          SECTION 3: 달력 + 보험사 코드 — 모바일 전체폭 스택
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row flex-wrap gap-4 md:items-stretch">

        {/* 달력 */}
        <div className="w-full md:flex-1" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <CalendarWidget user={user} canUseCrm={canUseCrm} />
        </div>

        {/* 우측: 보험사 코드 & 비밀번호 */}
        <div className="w-full md:w-auto" style={{ display: 'flex', flexDirection: 'column' }}>
          <section style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '14px 18px', ...(isInsuOpen ? { flex: 1 } : {}) }}>

            {/* 헤더 — 클릭하면 열고 닫힘 */}
            <button
              onClick={() => setIsInsuOpen(p => !p)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', fontFamily: 'inherit' }}
            >
              <span style={{ fontSize: 15, fontWeight: 900, color: '#10203a' }}>보험사 코드 & 비밀번호</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                  {(insuTab === 'life' ? lifeCodes : nonCodes).filter(r => r.code).length}개 등록됨
                </span>
                <ChevronDown size={14} color="#94a3b8" style={{ transition: 'transform 0.2s', transform: isInsuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </div>
            </button>

            {/* 펼쳐진 내용 */}
            {isInsuOpen && (
              <>
                {/* 탭 + 비번 토글 + 수정/저장 버튼 */}
                <div style={{ display: 'flex', gap: 6, marginTop: 12, marginBottom: 10, flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                    {(['life', 'non'] as const).map(tab => (
                      <button key={tab} onClick={() => setInsuTab(tab)}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: insuTab === tab ? '#1A2744' : '#f1f5f9', color: insuTab === tab ? '#fff' : '#64748b' }}>
                        {tab === 'life' ? '생명보험' : '손해보험'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowPw(p => !p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 10px', borderRadius: 8, border: '1px solid #dce6f1', background: '#f8fafc', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    {showPw ? <EyeOff size={13} color="#94a3b8" /> : <Eye size={13} color="#94a3b8" />}
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{showPw ? '숨김' : '보기'}</span>
                  </button>
                  <button
                    onClick={() => setIsInsuEdit(p => !p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 12px', borderRadius: 8, border: `1px solid ${isInsuEdit ? '#1A2744' : '#dce6f1'}`, background: isInsuEdit ? '#1A2744' : '#f8fafc', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isInsuEdit ? '#fff' : '#64748b' }}>{isInsuEdit ? '저장' : '수정'}</span>
                  </button>
                </div>

                {/* 컬럼 헤더 */}
                <div style={{ display: 'grid', gridTemplateColumns: isInsuEdit ? '1fr 90px 110px 22px' : '1fr 90px 110px', gap: 4, paddingBottom: 5, borderBottom: '1.5px solid #e8eef5', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', paddingLeft: 2 }}>보험사</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', textAlign: 'center' }}>코드</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', textAlign: 'center' }}>비밀번호</span>
                  {isInsuEdit && <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', textAlign: 'center' }}>≡</span>}
                </div>

                {/* 스크롤 목록 */}
                <div style={{ flex: 1, overflowY: 'auto', marginTop: 2, maxHeight: 224 }}>
                  {(insuTab === 'life' ? lifeCodes : nonCodes).map((row, idx) => (
                    <div
                      key={row.id}
                      draggable={isInsuEdit}
                      onDragStart={() => { setDragIdx(idx); setOverIdx(idx) }}
                      onDragOver={e => { e.preventDefault(); setOverIdx(idx) }}
                      onDrop={() => { if (dragIdx !== null) { dropRow(insuTab, dragIdx, idx); setDragIdx(null); setOverIdx(null) } }}
                      onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isInsuEdit ? '1fr 90px 110px 22px' : '1fr 90px 110px',
                        gap: 4, alignItems: 'center', padding: '5px 0',
                        borderBottom: overIdx === idx && dragIdx !== null && dragIdx !== idx ? '2px solid #1A2744' : '1px solid #f1f5f9',
                        opacity: dragIdx === idx ? 0.4 : 1,
                        cursor: isInsuEdit ? 'grab' : 'default',
                        transition: 'opacity 0.15s',
                      }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#374151', paddingLeft: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.company}</span>

                      {/* 코드 셀 */}
                      {isInsuEdit ? (
                        <input value={row.code}
                          onChange={e => updateCode(insuTab, row.id, 'code', e.target.value)}
                          placeholder="코드 (10자리)"
                          maxLength={15}
                          style={{ fontSize: 13, fontWeight: 600, color: '#10203a', padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 4, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const }} />
                      ) : (
                        <button
                          onClick={() => row.code && copyToClipboard(row.code, `${row.id}_code`)}
                          title={row.code ? '클릭하여 복사' : ''}
                          style={{ fontSize: 12, fontWeight: 700, color: copiedCell === `${row.id}_code` ? '#16a34a' : '#10203a', textAlign: 'center', padding: '4px 5px', borderRadius: 4, border: '1px solid transparent', background: copiedCell === `${row.id}_code` ? '#f0fdf4' : 'transparent', cursor: row.code ? 'pointer' : 'default', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {copiedCell === `${row.id}_code` ? '복사됨 ✓' : (row.code || '—')}
                        </button>
                      )}

                      {/* 비밀번호 셀 */}
                      {isInsuEdit ? (
                        <input value={row.pw}
                          onChange={e => updateCode(insuTab, row.id, 'pw', e.target.value)}
                          placeholder="비밀번호"
                          type={showPw ? 'text' : 'password'}
                          maxLength={20}
                          style={{ fontSize: 13, fontWeight: 600, color: '#10203a', padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 4, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const }} />
                      ) : (
                        <button
                          onClick={() => row.pw && copyToClipboard(row.pw, `${row.id}_pw`)}
                          title={row.pw ? '클릭하여 복사' : ''}
                          style={{ fontSize: 12, fontWeight: 700, color: copiedCell === `${row.id}_pw` ? '#16a34a' : '#64748b', textAlign: 'center', padding: '4px 5px', borderRadius: 4, border: '1px solid transparent', background: copiedCell === `${row.id}_pw` ? '#f0fdf4' : 'transparent', cursor: row.pw ? 'pointer' : 'default', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {copiedCell === `${row.id}_pw` ? '복사됨 ✓' : (row.pw ? (showPw ? row.pw : '•'.repeat(Math.min(row.pw.length, 8))) : '—')}
                        </button>
                      )}

                      {/* 드래그 핸들 (편집 모드에서만) */}
                      {isInsuEdit && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0bec5', cursor: 'grab' }}>
                          <GripVertical size={14} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
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
  fontSize: 13, fontWeight: 700, color: '#21324d',
  background: '#f8fafc', border: '1px solid #dce6f1',
  borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
}
