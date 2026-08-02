'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeftRight, BarChart3, Bell, BookOpen, Calculator, CarFront,
  ChevronRight, ClipboardCheck, FileSearch, Hospital,
  PieChart, Plus, Scale, Search, ShieldCheck, Star, Stethoscope,
  ScrollText, Users,
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
  onNavigate: (tool: ConsultingTool) => void
  onNoticeClick: () => void
  onStrategyClick: () => void
}

// 4개 진행 단계
const PIPELINE_STAGES = ['초기상담', '분석중', '제안중', '계약완료'] as const
const PIPELINE_COLORS = ['#1b54ad', '#7c3aed', '#0f6e56', '#c9a96e']

export default function ProHome({
  user, announcements, favorites, isFavEditMode, visibleTools, recentCustomers,
  onFavEditToggle, onFavToggle, onNavigate, onNoticeClick, onStrategyClick,
}: ProHomeProps) {
  const [stats, setStats] = useState({ todayCount: 0, followupCount: 0, analyzeCount: 0, todoCount: 0 })
  const [pipeline, setPipeline] = useState<Record<string, number>>({})

  const name = user?.name || user?.email?.split('@')[0] || ''
  const noticeCnt = announcements.filter(a => a.category === 'notice').length
  const updateCnt = announcements.filter(a => a.category === 'update').length
  const favoriteTools = visibleTools.filter(t => favorites.includes(t.id))

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

      // 파이프라인 집계
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

  // 빠른 실행 4개
  const quickActions = [
    {
      label: '새 고객 등록', emoji: '👤',
      color: '#1b54ad', bg: '#eef4fb',
      onClick: () => window.open('/crm/customers/new', '_blank', 'noopener,noreferrer'),
    },
    {
      label: '첫 상담 준비', emoji: '🛡️',
      color: '#0f6e56', bg: '#e1f5ee',
      onClick: () => { const t = visibleTools.find(t => t.id === 'show_first_coverage_check'); if (t) onNavigate(t); },
    },
    {
      label: '보장분석 시작', emoji: '📊',
      color: '#7c3aed', bg: '#f5f3ff',
      onClick: () => window.open('/coverage-pro', '_blank', 'noopener,noreferrer'),
    },
    {
      label: '제안서 만들기', emoji: '📋',
      color: '#c9a96e', bg: '#fffbf0',
      onClick: () => { const t = visibleTools.find(t => t.id === 'show_proposal'); if (t) onNavigate(t); },
    },
  ]

  const maxPipe = Math.max(...PIPELINE_STAGES.map(s => pipeline[s] || 0), 1)

  return (
    <div style={{ display: 'grid', gap: 20 }}>

      {/* ── 헤더 ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#10203a', margin: 0, lineHeight: 1.3 }}>
            {name}님, 오늘 상담을 시작해볼까요?
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#50627a', fontWeight: 600 }}>
            고객의 미래를 함께 설계하는 든든한 파트너가 되겠습니다.
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
            onClick={onStrategyClick}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid #c9a96e', background: '#fffbf0', color: '#8a6a1e', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            이달의 상품전략
          </button>
          <button
            onClick={() => window.open('/crm/customers', '_blank', 'noopener,noreferrer')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 34, padding: '0 14px', borderRadius: 8, border: 'none', background: '#1a2744', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <Users size={13} />
            고객관리 →
          </button>
        </div>
      </header>

      {/* ── 통계 카드 4개 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: '오늘 상담', value: stats.todayCount, color: '#1b54ad', bg: '#eef4fb', emoji: '📅' },
          { label: '후속 연락', value: stats.followupCount, color: '#0f6e56', bg: '#e1f5ee', emoji: '📞' },
          { label: '분석 대기', value: stats.analyzeCount, color: '#7c3aed', bg: '#f5f3ff', emoji: '🔍' },
          { label: '미완료 업무', value: stats.todoCount, color: '#e63946', bg: '#fff5f5', emoji: '⚡' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8eef5', padding: '18px 20px', boxShadow: '0 1px 6px rgba(16,32,58,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{s.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: s.bg, borderRadius: 10, fontSize: 16 }}>
                {s.emoji}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>건</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── 2컬럼 메인 ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>

        {/* 왼쪽: 오늘의 상담 일정 + 최근 고객 */}
        <div style={{ flex: '1 1 380px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 오늘의 상담 일정 */}
          <section style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#10203a' }}>오늘의 상담 일정</span>
              <button
                onClick={() => window.open('/crm/customers/new', '_blank', 'noopener,noreferrer')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#1b54ad', background: '#eef4fb', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}
              >
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
                  <button
                    key={c.id}
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
              <button
                onClick={() => window.open('/crm/customers', '_blank', 'noopener,noreferrer')}
                style={editBtn}
              >
                전체보기
              </button>
            </div>
            {recentCustomers.length === 0 ? (
              <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>등록된 고객이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentCustomers.slice(0, 5).map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => window.open(`/crm/customers/${c.id}`, '_blank', 'noopener,noreferrer')}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < recentCustomers.slice(0, 5).length - 1 ? '1px solid #f1f5f9' : 'none', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#1b54ad')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'inherit')}
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
                <button
                  key={i}
                  onClick={a.onClick}
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
                      <div style={{ height: '100%', background: PIPELINE_COLORS[i], borderRadius: 3, width: `${pct}%`, transition: 'width 0.5s ease', opacity: count === 0 ? 0.3 : 1 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ── 자주 쓰는 도구 ── */}
      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={16} style={{ fill: '#172947', color: '#172947' }} />
            <span style={{ fontSize: 15, fontWeight: 900, color: '#10203a' }}>자주 쓰는 도구</span>
          </div>
          <button onClick={onFavEditToggle} style={editBtn}>
            {isFavEditMode ? '완료' : '편집'}
          </button>
        </div>
        {favoriteTools.length === 0 && !isFavEditMode ? (
          <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>편집을 눌러 즐겨찾기를 추가하세요.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10 }}>
            {(isFavEditMode ? visibleTools : favoriteTools).map((tool, i) => {
              const isFav = favorites.includes(tool.id)
              return (
                <button
                  key={tool.id}
                  onClick={() => isFavEditMode ? onFavToggle(tool.id) : onNavigate(tool)}
                  style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '12px 8px', borderRadius: 10, border: `1px solid ${isFavEditMode && isFav ? '#1b54ad' : '#e8eef5'}`, background: isFavEditMode && isFav ? '#eef4fb' : '#f8fafc', cursor: 'pointer', textAlign: 'center' }}
                  onMouseEnter={e => { if (!isFavEditMode) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,32,58,0.08)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = isFavEditMode && isFav ? '#eef4fb' : '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* 상위 3개 왕관 표시 */}
                  {!isFavEditMode && i < 3 && (
                    <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 9 }}>👑</span>
                  )}
                  {isFavEditMode && (
                    <Star size={9} style={{ position: 'absolute', top: 5, right: 5, fill: isFav ? '#f59e0b' : 'none', color: isFav ? '#f59e0b' : '#cbd5e1' }} />
                  )}
                  <span style={{ color: '#0a3a86' }}><ToolIcon icon={tool.icon} size={18} /></span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#10203a', lineHeight: 1.3 }}>{tool.title}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

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
