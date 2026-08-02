'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeftRight, BarChart3, Bell, BookOpen, Calculator, CarFront,
  ChevronRight, ChevronDown, ClipboardCheck, FileSearch, Hospital,
  PieChart, Plus, Scale, Search, ShieldCheck, Star, Stethoscope,
  ScrollText, Users, X,
} from 'lucide-react'
import type { ConsultingTool } from '../../../lib/consultingTools'
import { supabase } from '../../../lib/supabase'

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
  // 드래그앤드롭용 로컬 순서 상태
  const [localFavIds, setLocalFavIds] = useState<string[]>(favorites)
  const dragStartIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

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
                            position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                            padding: '10px 12px', borderRadius: 10, width: 72,
                            border: `1.5px solid ${isFavEditMode && !isFav ? '#e8eef5' : isFavEditMode ? '#1b54ad' : '#e8eef5'}`,
                            background: isFavEditMode && !isFav ? '#f8fafc' : isFavEditMode ? '#eef4fb' : '#f8fafc',
                            cursor: isFavEditMode ? 'pointer' : 'pointer',
                            boxShadow: isFavEditMode ? '0 2px 8px rgba(16,32,58,0.06)' : 'none',
                            transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => { if (!isFavEditMode) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,32,58,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                        >
                          {/* 상위 3개 왕관 */}
                          {!isFavEditMode && i < 3 && <span style={{ position: 'absolute', top: 3, right: 3, fontSize: 8 }}>👑</span>}
                          {isFavEditMode && (
                            <Star size={9} style={{ position: 'absolute', top: 4, right: 4, fill: isFav ? '#f59e0b' : 'none', color: isFav ? '#f59e0b' : '#d1d5db' }} />
                          )}
                          <span style={{ color: '#0a3a86', display: 'flex' }}><ToolIcon icon={tool.icon} size={18} /></span>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#10203a', lineHeight: 1.3, textAlign: 'center', wordBreak: 'keep-all' }}>{tool.title}</span>
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

          {/* 오른쪽: 빠른 이동 4버튼 2x2 */}
          <div style={{ flex: '0 0 200px', minWidth: 180 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>빠른 이동</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: '공지·업데이트', emoji: '📢', onClick: onNoticeClick, color: '#1b54ad' },
                { label: '이달의 전략', emoji: '📊', onClick: onStrategyClick, color: '#8a6a1e' },
                { label: '고객관리', emoji: '👥', onClick: () => window.open('/crm/customers', '_blank', 'noopener,noreferrer'), color: '#0f6e56' },
                { label: '시그널 홈', emoji: '🏢', onClick: () => window.open('https://signalgroup-sigma.vercel.app/index.html', '_blank'), color: '#374151' },
              ].map((b, i) => (
                <button key={i} onClick={b.onClick}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px', borderRadius: 10, border: '1px solid #e8eef5', background: '#f8fafc', cursor: 'pointer', textAlign: 'center' }}
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
          SECTION 4: 2컬럼 메인
      ══════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>

        {/* 왼쪽: 오늘의 상담 일정 + 최근 고객 */}
        <div style={{ flex: '1 1 380px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 오늘의 상담 일정 */}
          <section style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#10203a' }}>오늘의 상담 일정</span>
              <button onClick={() => window.open('/crm/customers/new', '_blank', 'noopener,noreferrer')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#1b54ad', background: '#eef4fb', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
                <Plus size={11} />새 고객
              </button>
            </div>
            {recentCustomers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
                <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>오늘 예정된 상담이 없습니다.</p>
                <p style={{ fontSize: 11, color: '#c8d6e5', marginTop: 4 }}>새 고객을 등록해보세요.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentCustomers.slice(0, 4).map(c => (
                  <button key={c.id}
                    onClick={() => window.open(`/crm/customers/${c.id}`, '_blank', 'noopener,noreferrer')}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid #eef2f8', background: '#f8fafc', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#eef2f8'; }}
                  >
                    <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a2744', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>
                      {(c.name || '?')[0]}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: '#10203a' }}>{c.name || '이름 없음'}</div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {c.consulting_summary || c.memo || c.phone || '상담 정보 없음'}
                      </div>
                    </div>
                    {c.sales_stage && (
                      <span style={{ fontSize: 9, fontWeight: 900, background: '#eef4fb', color: '#1b54ad', borderRadius: 8, padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {c.sales_stage}
                      </span>
                    )}
                    <ChevronRight size={13} color="#c8d6e5" style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 최근 고객 */}
          <section style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={16} color="#10203a" />
                <span style={{ fontSize: 15, fontWeight: 900, color: '#10203a' }}>최근 고객</span>
              </div>
              <button onClick={() => window.open('/crm/customers', '_blank', 'noopener,noreferrer')} style={editBtn}>전체보기</button>
            </div>
            {recentCustomers.length === 0 ? (
              <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>등록된 고객이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentCustomers.slice(0, 5).map((c, i) => (
                  <button key={c.id}
                    onClick={() => window.open(`/crm/customers/${c.id}`, '_blank', 'noopener,noreferrer')}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#10203a', flex: 1 }}>{c.name || '이름 없음'}</span>
                    {c.status && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: c.status === '활동중' ? '#0f6e56' : '#64748b', background: c.status === '활동중' ? '#e1f5ee' : '#f1f5f9', borderRadius: 12, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                        {c.status}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {c.join_date ? new Date(c.join_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                    <ChevronRight size={12} color="#c8d6e5" style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* 오른쪽: 빠른 실행 + 진행 중인 업무 */}
        <div style={{ flex: '0 0 320px', minWidth: 280, maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 빠른 실행 2x2 */}
          <section style={card}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#10203a', marginBottom: 14 }}>빠른 실행</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {quickActions.map((a, i) => (
                <button key={i} onClick={a.onClick}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '14px 14px', borderRadius: 12, border: '1px solid #e8eef5', background: a.bg, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,32,58,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                >
                  <span style={{ fontSize: 22 }}>{a.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: a.color, lineHeight: 1.3 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 진행 중인 업무 파이프라인 */}
          <section style={card}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#10203a', marginBottom: 16 }}>진행 중인 업무</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PIPELINE_STAGES.map((stage, i) => {
                const count = pipeline[stage] || 0
                const pct = Math.round((count / maxPipe) * 100)
                return (
                  <div key={stage}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIPELINE_COLORS[i], flexShrink: 0, display: 'block' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{stage}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 900, color: count > 0 ? PIPELINE_COLORS[i] : '#94a3b8' }}>{count}건</span>
                    </div>
                    <div style={{ height: 6, background: '#f0f4f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: PIPELINE_COLORS[i], borderRadius: 3, width: `${pct}%`, transition: 'width 0.5s ease', opacity: count === 0 ? 0.25 : 1 }} />
                    </div>
                  </div>
                )
              })}
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
