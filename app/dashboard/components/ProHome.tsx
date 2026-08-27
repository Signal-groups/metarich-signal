'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeftRight, BarChart3, Bell, BookOpen, Calculator, CarFront,
  ChevronRight, ChevronDown, ChevronUp, ClipboardCheck, Eye, EyeOff, FileSearch, GripVertical, Hospital,
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
const MAX_FAV = 10
const FAV_COLS = 5

export default function ProHome({
  user, announcements, favorites, isFavEditMode, visibleTools, recentCustomers,
  onFavEditToggle, onFavToggle, onFavReorder, onNavigate, onNoticeClick, onStrategyClick,
}: ProHomeProps) {
  const [stats, setStats] = useState({ todayCount: 0, followupCount: 0, analyzeCount: 0, todoCount: 0 })
  const [pipeline, setPipeline] = useState<Record<string, number>>({})
  const [showTodayModal, setShowTodayModal] = useState(false)
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [mobileFavOpen, setMobileFavOpen] = useState(true)
  // 드래그앤드롭용 로컬 순서 상태
  const [localFavIds, setLocalFavIds] = useState<string[]>(favorites)

  // ── 모바일 CRM 검색 ──────────────────────────────────────────────────
  const [mobileQuery, setMobileQuery] = useState('')
  const [mobileResults, setMobileResults] = useState<any[]>([])
  const [mobileLoading, setMobileLoading] = useState(false)
  const dragStartIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  const uid = user?.id || 'guest'

  // ── 보험사 코드 — 모바일 기본 접힘
  const [isInsuOpen, setIsInsuOpen] = useState(false)
  const [isInsuEdit, setIsInsuEdit] = useState(false)
  const [insuTab, setInsuTab] = useState<'life' | 'non'>('life')
  const [showPw, setShowPw] = useState(false)
  const [copiedCell, setCopiedCell] = useState<string | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  // 데스크톱에서는 첨부 화면처럼 기본 펼침, 모바일에서는 기본 접힘.
  // 화면 크기가 바뀌어도 각 레이아웃에 맞는 초기 상태로 전환한다.
  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 768px)')
    const syncInsuPanel = () => setIsInsuOpen(desktopQuery.matches)

    syncInsuPanel()
    desktopQuery.addEventListener('change', syncInsuPanel)
    return () => desktopQuery.removeEventListener('change', syncInsuPanel)
  }, [])

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

  // ── 모바일 CRM 고객 검색 ─────────────────────────────────────────────
  const searchMobileCustomers = useCallback(async (q: string) => {
    if (!user?.id) return
    setMobileLoading(true)
    try {
      let query = supabase
        .from('customers')
        .select('id, name, birth_date, phone, sales_stage, status, gender')
        .eq('advisor_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(30)
      if (q.trim()) {
        query = query.ilike('name', `%${q.trim()}%`)
      }
      const { data } = await query
      setMobileResults(data || [])
    } catch {
      setMobileResults([])
    } finally {
      setMobileLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    searchMobileCustomers('')
  }, [searchMobileCustomers])

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
    <div style={{ display: 'grid', gap: 16, minWidth: 0, overflow: 'hidden', maxWidth: '100%', width: '100%' }}>

      {/* ══════════════════════════════════════════════════
          HEADER (모바일): 이달의 전략 + 시그널 홈 — 작은 버튼 2개
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-2 md:hidden">
        <button onClick={onStrategyClick}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 36, borderRadius: 10, border: '1px solid #dce6f1', background: '#fff', color: '#8a6a1e', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 1px 4px rgba(16,32,58,0.06)', fontFamily: 'inherit' }}>
          📊 이달의 전략
        </button>
        <button onClick={() => window.open('https://signalgroup-sigma.vercel.app/index.html', '_blank')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 36, borderRadius: 10, border: '1px solid #dce6f1', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 1px 4px rgba(16,32,58,0.06)', fontFamily: 'inherit' }}>
          🏢 시그널 홈
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          HEADER: 작은 버튼 행 — PC 전용
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
        <section style={{ ...card, overflow: 'hidden' }}>
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
          SECTION 2 (PC): 즐겨찾기(5×2) + 업무별 도구
      ══════════════════════════════════════════════════ */}
      <div className="hidden md:block">
      <section style={card}>
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* 왼쪽: 즐겨찾기 5×2 */}
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
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f1f5f9', borderRadius: 8, padding: '2px 8px' }}>드래그로 순서 변경</span>
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
                {favTools.slice(0, MAX_FAV).map((tool, i) => {
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
                          position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: 6, padding: '10px 4px', borderRadius: 10, width: '100%',
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
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 구분선 */}
          <div style={{ width: 1, background: '#e8eef5', alignSelf: 'stretch', flexShrink: 0, minHeight: 100 }} />

          {/* 오른쪽: 업무별 도구 */}
          <div style={{ flex: '1 1 0', minWidth: 180, paddingLeft: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#10203a', marginBottom: 10 }}>업무별 도구</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {categorySections.map(cat => {
                const isActive = activeCat === cat.id
                const s = CAT_STYLE[cat.id] || CAT_STYLE.face
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCat(prev => prev === cat.id ? null : cat.id)}
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
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '1px 6px', borderRadius: 12, background: isActive ? 'rgba(255,255,255,0.25)' : s.iconBg, color: isActive ? s.activeText : '#64748b', flexShrink: 0 }}>
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

        {/* 아코디언 펼침 영역 */}
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
          SECTION 3 (모바일): 고객 CRM 검색
      ══════════════════════════════════════════════════ */}
      <div className="block md:hidden">
        <section style={{ ...card, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>👥</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#10203a' }}>고객 보장 조회</span>
          </div>
          {/* 검색 입력 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <input
              type="text"
              value={mobileQuery}
              onChange={e => setMobileQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchMobileCustomers(mobileQuery)}
              placeholder="고객 이름 검색..."
              style={{ flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: 8, border: '1px solid #dce6f1', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', outline: 'none', color: '#10203a' }}
            />
            <button
              onClick={() => searchMobileCustomers(mobileQuery)}
              style={{ padding: '8px 14px', borderRadius: 8, background: '#1A2744', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
            >
              검색
            </button>
          </div>
          {/* 결과 목록 */}
          {mobileLoading ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>검색 중...</div>
          ) : mobileResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>
              {mobileQuery ? '검색 결과가 없습니다' : '등록된 고객이 없습니다'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto', overflowX: 'hidden' }}>
              {mobileResults.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid #e8eef5', background: '#f8fafc', minWidth: 0 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#10203a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.sales_stage || c.status || '미분류'}
                      {c.birth_date ? ` · ${c.birth_date.slice(0, 4)}년생` : ''}
                      {c.gender === 'male' ? ' · 남' : c.gender === 'female' ? ' · 여' : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => window.open(`/mobile?customerId=${c.id}`, '_blank')}
                    style={{ padding: '6px 12px', borderRadius: 7, background: '#1A2744', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    보장 조회
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION 3 (PC): 오늘의 업무 요약 바 (Pro 전용)
      ══════════════════════════════════════════════════ */}
      <button className="hidden md:flex"
        onClick={() => setShowTodayModal(true)}
        style={{ alignItems: 'center', gap: 0, padding: 0, borderRadius: 14, border: '1px solid #e8eef5', background: '#fff', cursor: 'pointer', boxShadow: '0 1px 6px rgba(16,32,58,0.05)', overflow: 'hidden', textAlign: 'left', width: '100%' }}
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
          SECTION 4: 달력 + 보험사 코드 — 모바일 전체폭 스택
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row flex-wrap gap-4 md:items-stretch" style={{ minWidth: 0, overflow: 'hidden' }}>

        {/* 달력 */}
        <div className="w-full md:flex-1" style={{ minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CalendarWidget user={user} canUseCrm={true} />
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{showPw ? '숨김' : '보기'}</span>
                  </button>
                  <button
                    onClick={() => setIsInsuEdit(p => !p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 12px', borderRadius: 8, border: `1px solid ${isInsuEdit ? '#1A2744' : '#dce6f1'}`, background: isInsuEdit ? '#1A2744' : '#f8fafc', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isInsuEdit ? '#fff' : '#64748b' }}>{isInsuEdit ? '저장' : '수정'}</span>
                  </button>
                </div>

                {/* 컬럼 헤더 */}
                <div style={{ display: 'grid', gridTemplateColumns: isInsuEdit ? 'minmax(0,1fr) 90px 110px 22px' : 'minmax(0,1fr) 90px 110px', gap: 4, paddingBottom: 5, borderBottom: '1.5px solid #e8eef5', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', paddingLeft: 2 }}>보험사</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', textAlign: 'center' }}>코드</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', textAlign: 'center' }}>비밀번호</span>
                  {isInsuEdit && <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', textAlign: 'center' }}>≡</span>}
                </div>

                {/* 스크롤 목록 — 최대 7개 표시 */}
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
                        gridTemplateColumns: isInsuEdit ? 'minmax(0,1fr) 90px 110px 22px' : 'minmax(0,1fr) 90px 110px',
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
                          onChange={e => updateInsuCode(insuTab, row.id, 'code', e.target.value)}
                          placeholder="코드 (10자리)"
                          maxLength={15}
                          style={{ fontSize: 12, fontWeight: 600, color: '#10203a', padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 4, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const }} />
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
                          onChange={e => updateInsuCode(insuTab, row.id, 'pw', e.target.value)}
                          placeholder="비밀번호"
                          type={showPw ? 'text' : 'password'}
                          maxLength={20}
                          style={{ fontSize: 12, fontWeight: 600, color: '#10203a', padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 4, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const }} />
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
  fontSize: 13, fontWeight: 700, color: '#21324d',
  background: '#f8fafc', border: '1px solid #dce6f1',
  borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
}
