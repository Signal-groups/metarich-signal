'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { Suspense } from 'react'

/* ─── 상수 ─────────────────────────────────────────────── */
const COLUMNS: { key: string; label: string; color: string; bg: string; border: string }[] = [
  { key: 'new',        label: '신규 접수',  color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  { key: 'analysis',   label: '분석 중',    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'consulting', label: '상담 진행',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { key: 'proposal',   label: '제안 완료',  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'contracted', label: '계약 체결',  color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'managing',   label: '관리 중',    color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { key: 'hold',       label: '보류',       color: '#dc2626', bg: '#fff7ed', border: '#fed7aa' },
]

/* ─── 고객 카드 ─────────────────────────────────────────── */
interface Customer {
  id: string
  name: string
  phone?: string
  status: string
  monthly_premium?: number
  join_date?: string
  birth_date?: string
  gender?: string
  memo?: string
}

function fmtPremium(v?: number) {
  if (!v) return null
  const w = Math.round(v / 10_000)
  return `${w.toLocaleString()}만원`
}

function daysAgo(dateStr?: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Math.round((Date.now() - d.getTime()) / 86_400_000)
}

/* ─── 메인 보드 ─────────────────────────────────────────── */
function BoardContent() {
  const [customers, setCustomers]     = useState<Customer[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [dragging, setDragging]       = useState<string | null>(null)
  const [dragOver, setDragOver]       = useState<string | null>(null)
  const [saving, setSaving]           = useState<string | null>(null)
  const dragCustomer                  = useRef<Customer | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('customers').select('id,name,phone,status,monthly_premium,join_date,birth_date,gender,memo')
        .eq('advisor_id', session.user.id).is('deleted_at', null)
        .order('join_date', { ascending: false })
      setCustomers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = search.trim()
    ? customers.filter((c) => c.name?.includes(search) || c.phone?.includes(search))
    : customers

  /* ── 드래그 핸들러 ─────────────────────────────────────── */
  const onDragStart = useCallback((c: Customer) => {
    dragCustomer.current = c
    setDragging(c.id)
  }, [])

  const onDragEnd = useCallback(() => {
    setDragging(null)
    setDragOver(null)
    dragCustomer.current = null
  }, [])

  const onDrop = useCallback(async (colKey: string) => {
    const c = dragCustomer.current
    if (!c || c.status === colKey) { setDragOver(null); return }

    setSaving(c.id)
    setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, status: colKey } : x))

    const { error } = await supabase
      .from('customers').update({ status: colKey }).eq('id', c.id)
    if (error) {
      // 실패 시 원상복구
      setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, status: c.status } : x))
      alert('상태 변경에 실패했습니다.')
    }
    setSaving(null)
    setDragOver(null)
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: 0 }}>

      {/* ── 헤더 ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#1a2744', margin: 0 }}>📋 업무보드</h1>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>카드를 드래그해서 상태를 변경하세요</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 전화번호 검색..."
            style={{
              padding: '8px 12px 8px 36px', border: '1px solid #e2e8f0',
              borderRadius: 10, fontSize: 13, color: '#1a2744', outline: 'none', width: 220,
            }}
          />
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>🔍</span>
        </div>
        <Link href="/crm/customers/new" className="btn btn-primary btn-sm">+ 신규 고객</Link>
        <Link href="/crm" className="btn btn-secondary btn-sm">← 대시보드</Link>
      </div>

      {/* ── 요약 뱃지 ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', flexShrink: 0 }}>
        {COLUMNS.map((col) => {
          const cnt = filtered.filter((c) => c.status === col.key).length
          if (cnt === 0) return null
          return (
            <span key={col.key} style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: col.bg, color: col.color, border: `1px solid ${col.border}` }}>
              {col.label} {cnt}
            </span>
          )
        })}
        <span style={{ fontSize: 11, color: '#94a3b8', alignSelf: 'center', marginLeft: 4 }}>총 {filtered.length}명</span>
      </div>

      {/* ── 칸반 그리드 ────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(200px, 1fr))`,
        gap: 12,
        flex: 1,
        overflow: 'auto',
        paddingBottom: 16,
        alignItems: 'start',
      }}>
        {COLUMNS.map((col) => {
          const cards = filtered.filter((c) => c.status === col.key)
          const isOver = dragOver === col.key
          return (
            <div
              key={col.key}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.key) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => onDrop(col.key)}
              style={{
                borderRadius: 14,
                background: isOver ? col.bg : '#f8fafc',
                border: `2px ${isOver ? 'solid' : 'dashed'} ${isOver ? col.border : '#e2e8f0'}`,
                padding: '12px 10px',
                transition: 'all .15s',
                minHeight: 200,
              }}
            >
              {/* 칼럼 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${col.border}` }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: col.color }}>{col.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: col.color, color: '#fff', borderRadius: 999, padding: '0px 7px', minWidth: 20, textAlign: 'center' }}>
                  {cards.length}
                </span>
              </div>

              {/* 카드 목록 */}
              <div style={{ display: 'grid', gap: 8 }}>
                {cards.length === 0 && (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: '#cbd5e1', fontSize: 12 }}>
                    {isOver ? '여기에 놓으세요' : '없음'}
                  </div>
                )}
                {cards.map((c) => (
                  <CustomerCard
                    key={c.id}
                    customer={c}
                    col={col}
                    isDragging={dragging === c.id}
                    isSaving={saving === c.id}
                    onDragStart={() => onDragStart(c)}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── 고객 카드 컴포넌트 ─────────────────────────────────── */
function CustomerCard({ customer: c, col, isDragging, isSaving, onDragStart, onDragEnd }: {
  customer: Customer
  col: typeof COLUMNS[0]
  isDragging: boolean
  isSaving: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const ago = daysAgo(c.join_date)
  const premium = fmtPremium(c.monthly_premium)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        background: '#fff',
        border: `1px solid ${isDragging ? col.color : '#e2e8f0'}`,
        borderRadius: 12,
        padding: '11px 12px',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging ? `0 8px 24px ${col.color}40` : '0 1px 3px rgba(0,0,0,.06)',
        transition: 'all .15s',
        position: 'relative',
      }}
    >
      {isSaving && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <div style={{ width: 12, height: 12, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        </div>
      )}

      {/* 이름 + 성별 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: col.bg, color: col.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
          {c.name?.slice(0, 1)}
        </div>
        <Link href={`/crm/customers/${c.id}`} style={{ fontSize: 13, fontWeight: 800, color: '#1a2744', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {c.name}
        </Link>
        {c.gender && (
          <span style={{ fontSize: 10, color: '#94a3b8' }}>{c.gender === 'male' ? '남' : '여'}</span>
        )}
      </div>

      {/* 전화번호 */}
      {c.phone && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{c.phone}</div>
      )}

      {/* 월 보험료 */}
      {premium && (
        <div style={{ fontSize: 11, fontWeight: 700, color: col.color, marginBottom: 4 }}>₩ {premium}/월</div>
      )}

      {/* 등록일 */}
      {c.join_date && (
        <div style={{ fontSize: 10, color: '#94a3b8' }}>
          {c.join_date} 등록{ago !== null ? ` (${ago}일 전)` : ''}
        </div>
      )}

      {/* 메모 미리보기 */}
      {c.memo && (
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.memo}
        </div>
      )}
    </div>
  )
}

/* ─── 페이지 export ──────────────────────────────────────── */
export default function BoardPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <BoardContent />
    </Suspense>
  )
}
