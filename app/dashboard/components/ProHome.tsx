'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeftRight, BarChart3, Bell, BookOpen, Calculator, CarFront,
  ChevronRight, ChevronDown, ChevronUp, ClipboardCheck, Eye, EyeOff, FileSearch, Hospital,
  PieChart, Scale, Search, ShieldCheck, Star, Stethoscope,
  ScrollText, X,
} from 'lucide-react'
import type { ConsultingTool } from '../../../lib/consultingTools'
import { CONSULTING_TOOL_CATEGORIES } from '../../../lib/consultingTools'
import { supabase } from '../../../lib/supabase'
import CalendarWidget from './CalendarWidget'

const CAT_STYLE: Record<string, { bg: string; border: string; iconBg: string; activeBg: string; activeText: string }> = {
  face:     { bg: '#eef8ff', border: '#bfdbfe', iconBg: '#dbeafe', activeBg: '#1b54ad', activeText: '#fff' },
  customer: { bg: '#f0fdf4', border: '#bbf7d0', iconBg: '#dcfce7', activeBg: '#0f6e56', activeText: '#fff' },
  coverage: { bg: '#fdf4ff', border: '#e9d5ff', iconBg: '#f3e8ff', activeBg: '#7c3aed', activeText: '#fff' },
  financial:{ bg: '#fff7ed', border: '#fed7aa', iconBg: '#ffedd5', activeBg: '#d97706', activeText: '#fff' },
  planning: { bg: '#f0f9ff', border: '#bae6fd', iconBg: '#e0f2fe', activeBg: '#0284c7', activeText: '#fff' },
  claims:   { bg: '#fff1f2', border: '#fecdd3', iconBg: '#ffe4e6', activeBg: '#e63946', activeText: '#fff' },
}

function ToolIcon({ icon, size = 18 }: { icon: string; size?: number }) {
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

type InsuCodeP = { id: string; company: string; code: string; pw: string }

const DEFAULT_LIFE_P: InsuCodeP[] = [
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
const DEFAULT_NON_P: InsuCodeP[] = [
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

interface ProHomeProps {
  user: any
  announcements: any[]
  favorites: string[]
  isFavEditMode: boolean
  visibleTools: ConsultingTool[]
  recentCustomers: any[]
  onFavEditToggle: () => void
  onFavToggle: (id: string) => void
  onFavReorder?: (ids: string[]) => void
  onNavigate: (tool: ConsultingTool) => void
  onNoticeClick: () => void
  onStrategyClick: () => void
}

const PIPELINE_STAGES = ['초기상담', '분석중', '제안중', '계약완료'] as const
const PIPELINE_COLORS = ['#1b54ad', '#7c3aed', '#0f6e56', '#c9a96e']
const MAX_VISIBLE = 5 // 5개 이상이면 접힘

export default function ProHome({
  user, announcements, favorites, isFavEditMode, visibleTools, recentCustomers,
  onFavEditToggle, onFavToggle, onFavReorder, onNavigate, onNoticeClick, onStrategyClick,
}: ProHomeProps) {
  const [stats, setStats] = useState({ todayCount: 0, followupCount: 0, analyzeCount: 0, todoCount: 0 })
  const [pipeline, setPipeline] = useState<Record<string, number>>({})
  const [showAllFavs, setShowAllFavs] = useState(false)
  const [showTodayModal, setShowTodayModal] = useState(false)
  const [activeCat, setActiveCat] = useState<string | null>(null)
  // 드래그앤드롭용 로컬 순서 상태
  const [localFavIds, setLocalFavIds] = useState<string[]>(favorites)
  const dragStartIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  const uid = user?.id || 'guest'

  // ── 보험사 코드 ──────────────────────────────────────────────────────
  const [insuTab, setInsuTab] = useState<'life' | 'non'>('life')
  const [showPw, setShowPw] = useState(false)
  const [lifeCodes, setLifeCodes] = useState<InsuCodeP[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_LIFE_P
    try { return JSON.parse(localStorage.getItem(`insu-life-${uid}`) || 'null') || DEFAULT_LIFE_P } catch { return DEFAULT_LIFE_P }
  })
  const [nonCodes, setNonCodes] = useState<InsuCodeP[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_NON_P
    try { return JSON.parse(localStorage.getItem(`insu-non-${uid}`) || 'null') || DEFAULT_NON_P } catch { return DEFAULT_NON_P }
  })

  const updateInsuCode = (type: 'life' | 'non', id: string, field: 'code' | 'pw', val: string) => {
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

  const name = user?.name || user?.email?.split('@')[0] || ''
  const noticeCnt = announcements.filter(a => a.category === 'notice').length
  const updateCnt = announcements.filter(a => a.category === 'update').length

  // favorites 변경 시 localFavIds 동기화
  useEffect(() => {
    setLocalFavIds(favorites)
  }, [favorites])

  // isFavEditMode 시작 시 최신 favorites 반영
  useEffect(() => {
    if (isFavEditMode) setLocalFavIds(favorites)
  }, [isFavEditMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // 현재 표시 순서: 편집 중엔 localFavIds, 아니면 favorites
  const displayFavIds = isFavEditMode ? localFavIds : favorites
  const favTools = visibleTools.filter(t => displayFavIds.includes(t.id))
    .sort((a, b) => displayFavIds.indexOf(a.id) - displayFavIds.indexOf(b.id))

  const visibleFavTools = showAllFavs ? favTools : favTools.slice(0, MAX_VISIBLE)
  const hiddenCount = favTools.length - MAX_VISIBLE

  // CRM 통계 로드
  const loadStats = useCallback(async () => {
    if (!user?.id) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: customers } = await supabase
        .from('customers')
        .select('id, status, sales_stage, join_date, contract_date')
        .eq('advisor_id', user.id)
        .is('deleted_at', null)

      if (!customers) return

      const todayCount = customers.filter(c =>
        c.join_date?.startsWith(today) || c.contract_date?.startsWith(today)
      ).length
      const followupCount = customers.filter(c =>
        c.sales_stage === '후속연락' || c.status === 'followup'
      ).length
      const analyzeCount = customers.filter(c =>
        c.sales_stage === '분석중' || c.status === 'new'
      ).length
      const todoCount = customers.filter(c =>
        c.sales_stage === '제안중' || c.status === 'pending'
      ).length

      setStats({ todayCount, followupCount, analyzeCount, todoCount })

      const pipe: Record<string, number> = {}
      customers.forEach(c => {
        const stage = c.sales_stage || '초기상담'
        pipe[stage] = (pipe[stage] || 0) + 1
      })
      setPipeline(pipe)
    } catch (e) {
      console.warn('[ProHome] loadStats error:', e)
    }
  }, [user?.id])

  useEffect(() => { loadStats() }, [loadStats])

  // ── 드래그앤드롭 핸들러 ───────────────────────────────────────────
  const handleDragStart = (idx: number) => {
    dragStartIdx.current = idx
  }
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    dragOverIdx.current = idx
    const from = dragStartIdx.current
    if (from === null || from === idx) return
    // 시각적 실시간 재정렬
    setLocalFavIds(prev => {
      const next = [...prev]
      const [removed] = next.splice(from, 1)
      next.splice(idx, 0, removed)
      return next
    })
    dragStartIdx.current = idx
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onFavReorder?.(localFavIds)
    dragStartIdx.current = null
    dragOverIdx.current = null
  }
  const handleDragEnd = () => {
    dragStartIdx.current = null
    dragOverIdx.current = null
  }

  // 빠른 실행 4개
  const quickActions = [
    { label: '새 고객 등록', emoji: '👤', color: '#1b54ad', bg: '#eef4fb', onClick: () => window.open('/crm/customers/new', '_blank', 'noopener,noreferrer') },
    { label: '첫 상담 준비', emoji: '🛡️', color: '#0f6e56', bg: '#e1f5ee', onClick: () => { const t = visibleTools.find(t => t.id === 'show_first_coverage_check'); if (t) onNavigate(t); } },
    { label: '보장분석 시작', emoji: '📊', color: '#7c3aed', bg: '#f5f3ff', onClick: () => window.open('/coverage-pro', '_blank', 'noopener,noreferrer') },
    { label: '제안서 만들기', emoji: '📋', color: '#c9a96e', bg: '#fffbf0', onClick: () => { const t = visibleTools.find(t => t.id === 'show_proposal'); if (t) onNavigate(t); } },
  ]

  const maxPipe = Math.max(...PIPELINE_STAGES.map(s => pipeline[s] || 0), 1)

  // 업무별 카테고리 (고객 상담 제외)
  const categorySections = CONSULTING_TOOL_CATEGORIES
    .filter(cat => cat.id !== 'customer')
    .map(cat => ({ ...cat, tools: visibleTools.filter(t => t.category === cat.id) }))
    .filter(s => s.tools.length > 0)

  const activeSectionData = activeCat
    ? categorySections.find(c => c.id === activeCat)
    : null

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* ══════════════════════════════════════════════════
          SECTION 1: 자주 쓰는 도구 (TOP) + 빠른 이동
      ══════════════════════════════════════════════════ */}
      <section style={{ ...card, padding: '18px 22px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* 왼쪽: 도구 아이콘 열 */}
          <div style={{ flex: '1 1 320px', minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={15} style={{ fill: '#172947', color: '#172947' }} />
                <span style={{ fontSize: 14, fontWeight: 900, color: '#10203a' }}>자주 쓰는 도구</span>
                {isFavEditMode && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', borderRadius: 8, padding: '2px 8px' }}>드래그로 순서 변경</span>
                )}
              </div>
              <button onClick={onFavEditToggle} style={editBtn}>
                {isFavEditMode ? '완료' : '편집'}
              </button>
            </div>

            {/* 도구 아이콘 행 */}
            {favTools.length === 0 && !isFavEditMode ? (
              <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>편집을 눌러 즐겨찾기를 추가하세요.</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(isFavEditMode ? favTools : visibleFavTools).map((tool, i) => {
                    const isFav = favorites.includes(tool.id)
                    return (
                      <div
                        key={tool.id}
                        draggable={isFavEditMode}
                        onDragStart={() => handleDragStart(i)}
                        onDragOver={e => handleDragOver(e, i)}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        style={{ cursor: isFavEditMode ? 'grab' : 'default' }}
                      >
                        <button
                          onClick={() => isFavEditMode ? onFavToggle(tool.id) : onNavigate(tool)}
                          style={{
                            position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                            padding: '10px 8px', borderRadius: 10, width: 76,
                            border: `1.5px solid ${isFavEditMode && !isFav ? '#e8eef5' : isFavEditMode ? '#1b54ad' : '#e8eef5'}`,
                            background: isFavEditMode && !isFav ? '#f8fafc' : isFavEditMode ? '#eef4fb' : '#f8fafc',
                            cursor: 'pointer',
                            boxShadow: isFavEditMode ? '0 2px 8px rgba(16,32,58,0.06)' : 'none',
                            transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => { if (!isFavEditMode) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,32,58,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                        >
                          {!isFavEditMode && i < 3 && <span style={{ position: 'absolute', top: 3, right: 3, fontSize: 8 }}>👑</span>}
                          {isFavEditMode && (
                            <Star size={9} style={{ position: 'absolute', top: 4, right: 4, fill: isFav ? '#f59e0b' : 'none', color: isFav ? '#f59e0b' : '#d1d5db' }} />
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, background: '#eef4fb' }}>
                            <ToolIcon icon={tool.icon} size={17} />
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#10203a', lineHeight: 1.3, textAlign: 'center', wordBreak: 'keep-all' }}>{tool.title}</span>
                        </button>
                      </div>
                    )
                  })}

                  {/* 더보기/접기 버튼 (5개 초과 시) */}
                  {!isFavEditMode && hiddenCount > 0 && (
                    <button
                      onClick={() => setShowAllFavs(v => !v)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '10px 12px', borderRadius: 10, width: 72, border: '1.5px dashed #c8d6e5', background: '#f8fafc', cursor: 'pointer' }}
                    >
                      <ChevronDown size={16} color="#64748b" style={{ transform: showAllFavs ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b' }}>{showAllFavs ? '접기' : `+${hiddenCount}개`}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 구분선 */}
          <div style={{ width: 1, background: '#e8eef5', alignSelf: 'stretch', flexShrink: 0, minHeight: 80 }} />

          {/* 오른쪽: 업무별 도구 + 빠른 이동 */}
          <div style={{ flex: '1 1 0', minWidth: 180, paddingLeft: 4, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* 업무별 도구 */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>업무별 도구</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {categorySections.map(cat => {
                  const isActive = activeCat === cat.id
                  const s = CAT_STYLE[cat.id] || CAT_STYLE.face
                  return (
                    <button key={cat.id}
                      onClick={() => setActiveCat(prev => prev === cat.id ? null : cat.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        padding: '7px 12px', borderRadius: 9, width: '100%',
                        border: `1.5px solid ${isActive ? s.activeBg : s.border}`,
                        background: isActive ? s.activeBg : s.bg,
                        cursor: 'pointer', transition: 'all 0.15s',
                        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.boxShadow = '0 2px 6px rgba(16,32,58,0.08)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 800, color: isActive ? s.activeText : '#10203a', flex: 1, textAlign: 'left' }}>{cat.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 12, background: isActive ? 'rgba(255,255,255,0.25)' : s.iconBg, color: isActive ? s.activeText : '#64748b', flexShrink: 0 }}>{cat.tools.length}</span>
                      <ChevronDown size={11} color={isActive ? s.activeText : '#94a3b8'} style={{ transform: isActive ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 빠른 이동 2x2 */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>빠른 이동</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { label: '공지·업데이트', emoji: '📢', onClick: onNoticeClick, color: '#1b54ad' },
                  { label: '이달의 전략', emoji: '📊', onClick: onStrategyClick, color: '#8a6a1e' },
                  { label: '고객관리', emoji: '👥', onClick: () => window.open('/crm/customers', '_blank', 'noopener,noreferrer'), color: '#0f6e56' },
                  { label: '시그널 홈', emoji: '🏢', onClick: () => window.open('https://signalgroup-sigma.vercel.app/index.html', '_blank'), color: '#374151' },
                ].map((b, i) => (
                  <button key={i} onClick={b.onClick}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '9px 4px', borderRadius: 10, border: '1px solid #e8eef5', background: '#f8fafc', cursor: 'pointer', textAlign: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,32,58,0.07)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <span style={{ fontSize: 18 }}>{b.emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: b.color, lineHeight: 1.3 }}>{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 아코디언 펼침 영역 */}
        {activeSectionData && (() => {
          const s = CAT_STYLE[activeSectionData.id] || CAT_STYLE.face
          return (
            <div style={{ marginTop: 14, padding: '13px 16px', borderRadius: 12, border: `1.5px solid ${s.border}`, background: s.bg }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>{activeSectionData.desc}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {activeSectionData.tools.map(tool => (
                  <button key={tool.id} onClick={() => onNavigate(tool)}
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
          SECTION 2: 배너 4개 (카페·채팅·시그널·CJ)
      ══════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          {
            label: '보험의 기준 카페',
            sub: '네이버 카페',
            emoji: '☕',
            bg: 'linear-gradient(135deg, #f0fff8 0%, #e8f5e9 100%)',
            border: '#bbf7d0',
            color: '#0f6e56',
            onClick: () => { const m = /Android|iPhone|iPad/i.test(navigator.userAgent); window.open(m ? 'https://m.cafe.naver.com/signal1035' : 'https://cafe.naver.com/signal1035', '_blank') },
          },
          {
            label: '보험의 기준',
            sub: '오픈채팅방',
            emoji: '💬',
            bg: 'linear-gradient(135deg, #fffbf0 0%, #fef3c7 100%)',
            border: '#fde68a',
            color: '#92700a',
            onClick: () => window.open('https://open.kakao.com/o/g8ND5toi', '_blank'),
          },
          {
            label: '메타리치 시그널그룹',
            sub: '영업의 품격 · 박주완 본부장',
            emoji: '⭐',
            bg: 'linear-gradient(135deg, #eef4fb 0%, #dbeafe 100%)',
            border: '#bfdbfe',
            color: '#1b54ad',
            onClick: () => window.open('https://signal-groups.github.io/insuclass/', '_blank'),
          },
          {
            label: 'CJ온스타일 GA',
            sub: '보험설계사·조직관리자 모집',
            emoji: '📺',
            bg: 'linear-gradient(135deg, #fdf4ff 0%, #f3e8ff 100%)',
            border: '#e9d5ff',
            color: '#7c3aed',
            onClick: () => window.open('https://signal-groups.github.io/cjon/', '_blank'),
          },
        ].map((b, i) => (
          <button
            key={i}
            onClick={b.onClick}
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
          SECTION 3: 오늘의 업무 요약 바 → 상세 모달 오픈
      ══════════════════════════════════════════════════ */}
      <button
        onClick={() => setShowTodayModal(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 0, padding: 0, borderRadius: 14, border: '1px solid #e8eef5', background: '#fff', cursor: 'pointer', boxShadow: '0 1px 6px rgba(16,32,58,0.05)', overflow: 'hidden', textAlign: 'left', width: '100%' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 12px rgba(16,32,58,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 6px rgba(16,32,58,0.05)'; }}
      >
        <div style={{ background: '#1a2744', color: '#fff', padding: '14px 18px', fontWeight: 900, fontSize: 13, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          📋 오늘의 업무
        </div>
        <div style={{ display: 'flex', flex: 1, flexWrap: 'wrap' }}>
          {[
            { label: '오늘 상담', value: stats.todayCount, color: '#1b54ad' },
            { label: '후속 연락', value: stats.followupCount, color: '#0f6e56' },
            { label: '분석 대기', value: stats.analyzeCount, color: '#7c3aed' },
            { label: '미완료 업무', value: stats.todoCount, color: '#e63946' },
          ].map((s, i) => (
            <div key={i} style={{ flex: '1 1 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 8px', borderRight: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginTop: 2 }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
          상세보기 <ChevronRight size={13} />
        </div>
      </button>

      {/* ══════════════════════════════════════════════════
          SECTION 4: 달력 + 보험사 코드 (달력 높이 일치)
      ══════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>

        {/* 달력 */}
        <div style={{ flex: '1 1 380px', minWidth: 300, display: 'flex', flexDirection: 'column' }}>
          <CalendarWidget user={user} canUseCrm={true} />
        </div>

        {/* 우측: 보험사 코드 & 비밀번호 */}
        <div style={{ flex: '0 0 340px', minWidth: 280, display: 'flex', flexDirection: 'column' }}>
          <section style={{ ...card, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 18px' }}>

            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#10203a' }}>보험사 코드 & 비밀번호</span>
              <button onClick={() => setShowPw(p => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, border: '1px solid #dce6f1', background: '#f8fafc', cursor: 'pointer', fontFamily: 'inherit' }}>
                {showPw ? <EyeOff size={12} color="#94a3b8" /> : <Eye size={12} color="#94a3b8" />}
                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>{showPw ? '숨기기' : '보기'}</span>
              </button>
            </div>

            {/* 탭 */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexShrink: 0 }}>
              {(['life', 'non'] as const).map(tab => (
                <button key={tab} onClick={() => setInsuTab(tab)}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', background: insuTab === tab ? '#1A2744' : '#f1f5f9', color: insuTab === tab ? '#fff' : '#64748b' }}>
                  {tab === 'life' ? '생명보험' : '손해보험'}
                </button>
              ))}
            </div>

            {/* 컬럼 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 64px 28px', gap: 3, paddingBottom: 4, borderBottom: '1.5px solid #e8eef5', flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', paddingLeft: 2 }}>보험사</span>
              <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', textAlign: 'center' }}>코드</span>
              <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', textAlign: 'center' }}>비밀번호</span>
              <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', textAlign: 'center' }}>순서</span>
            </div>

            {/* 스크롤 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', marginTop: 2 }}>
              {(insuTab === 'life' ? lifeCodes : nonCodes).map((row, idx, arr) => (
                <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 64px 64px 28px', gap: 3, alignItems: 'center', padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', paddingLeft: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.company}</span>
                  <input value={row.code}
                    onChange={e => updateInsuCode(insuTab, row.id, 'code', e.target.value)}
                    placeholder="코드"
                    style={{ fontSize: 10, fontWeight: 600, color: '#10203a', padding: '3px 4px', border: '1px solid #e2e8f0', borderRadius: 4, outline: 'none', textAlign: 'center', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const }} />
                  <input value={showPw ? row.pw : row.pw ? '••••' : ''}
                    onChange={e => showPw && updateInsuCode(insuTab, row.id, 'pw', e.target.value)}
                    readOnly={!showPw}
                    placeholder="비번"
                    type={showPw ? 'text' : 'password'}
                    style={{ fontSize: 10, fontWeight: 600, color: '#10203a', padding: '3px 4px', border: '1px solid #e2e8f0', borderRadius: 4, outline: 'none', textAlign: 'center', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, background: !showPw && row.pw ? '#f8fafc' : '#fff' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                    <button onClick={() => moveRow(insuTab, idx, -1)} disabled={idx === 0}
                      style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: 0, color: idx === 0 ? '#e2e8f0' : '#94a3b8', lineHeight: 1, display: 'flex' }}>
                      <ChevronUp size={11} />
                    </button>
                    <button onClick={() => moveRow(insuTab, idx, 1)} disabled={idx === arr.length - 1}
                      style={{ background: 'none', border: 'none', cursor: idx === arr.length - 1 ? 'default' : 'pointer', padding: 0, color: idx === arr.length - 1 ? '#e2e8f0' : '#94a3b8', lineHeight: 1, display: 'flex' }}>
                      <ChevronDown size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          오늘의 업무 상세 모달
      ══════════════════════════════════════════════════ */}
      {showTodayModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,20,40,0.5)' }}
          onClick={() => setShowTodayModal(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 20, width: 'calc(100% - 40px)', maxWidth: 680, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#10203a', margin: 0 }}>오늘의 업무</h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                  {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                </p>
              </div>
              <button onClick={() => setShowTodayModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', color: '#9ab4c8' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* 통계 4개 카드 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {[
                  { label: '오늘 상담', value: stats.todayCount, color: '#1b54ad', bg: '#eef4fb', emoji: '📅', desc: '오늘 등록·계약된 고객' },
                  { label: '후속 연락', value: stats.followupCount, color: '#0f6e56', bg: '#e1f5ee', emoji: '📞', desc: '후속 연락이 필요한 고객' },
                  { label: '분석 대기', value: stats.analyzeCount, color: '#7c3aed', bg: '#f5f3ff', emoji: '🔍', desc: '보장분석 대기 중인 고객' },
                  { label: '미완료 업무', value: stats.todoCount, color: '#e63946', bg: '#fff5f5', emoji: '⚡', desc: '제안 진행 중인 고객' },
                ].map((s, i) => (
                  <div key={i} style={{ borderRadius: 14, border: '1px solid #e8eef5', padding: '18px 20px', background: s.bg }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{s.label}</span>
                      <span style={{ fontSize: 22 }}>{s.emoji}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                      <span style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.value}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>건</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{s.desc}</p>
                  </div>
                ))}
              </div>

              {/* 파이프라인 */}
              <div style={{ background: '#f8fafc', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#10203a', marginBottom: 16 }}>진행 중인 업무 현황</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {PIPELINE_STAGES.map((stage, i) => {
                    const count = pipeline[stage] || 0
                    const pct = Math.round((count / maxPipe) * 100)
                    return (
                      <div key={stage}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: PIPELINE_COLORS[i], display: 'block' }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{stage}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 900, color: count > 0 ? PIPELINE_COLORS[i] : '#94a3b8' }}>{count}건</span>
                        </div>
                        <div style={{ height: 8, background: '#e8eef5', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: PIPELINE_COLORS[i], borderRadius: 4, width: `${pct}%`, transition: 'width 0.6s ease', opacity: count === 0 ? 0.2 : 1 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 오늘 빠른 실행 */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#10203a', marginBottom: 12 }}>오늘 할 일</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {quickActions.map((a, i) => (
                    <button key={i} onClick={() => { a.onClick(); setShowTodayModal(false); }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 10px', borderRadius: 12, border: '1px solid #e8eef5', background: a.bg, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,32,58,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <span style={{ fontSize: 22 }}>{a.emoji}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: a.color, textAlign: 'center', lineHeight: 1.3 }}>{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
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
