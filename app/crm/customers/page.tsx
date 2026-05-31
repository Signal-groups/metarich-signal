'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

const statusLabels: Record<string, string> = {
  new: '신규',
  analysis: '분석',
  consulting: '상담',
  proposal: '제안',
  hold: '보류',
  contracted: '계약',
  managing: '관리',
}

const statusBadges: Record<string, string> = {
  new: 'badge-gray',
  analysis: 'badge-blue',
  consulting: 'badge-yellow',
  proposal: 'badge-purple',
  hold: 'badge-red',
  contracted: 'badge-green',
  managing: 'badge-cyan',
}

const sortLabels: Record<string, string> = {
  join_date: '최근 등록순',
  name: '이름순',
  monthly_premium: '보험료순',
  status: '상태순',
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState('join_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('advisor_id', session.user.id)
      .is('deleted_at', null)
      .order('join_date', { ascending: false })

    setCustomers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return customers
      .filter((customer) => {
        const matchSearch = !keyword
          || String(customer.name || '').toLowerCase().includes(keyword)
          || String(customer.phone || '').toLowerCase().includes(keyword)
          || String(customer.consulting_summary || '').toLowerCase().includes(keyword)
        const matchStatus = statusFilter === 'all' || customer.status === statusFilter
        return matchSearch && matchStatus
      })
      .sort((a, b) => compareCustomers(a, b, sortKey, sortDir))
  }, [customers, search, sortDir, sortKey, statusFilter])

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const counts = useMemo(() => {
    return Object.keys(statusLabels).reduce<Record<string, number>>((acc, key) => {
      acc[key] = customers.filter((customer) => customer.status === key).length
      return acc
    }, {})
  }, [customers])

  return (
    <>
      <div className="page-header customer-page-header">
        <div>
          <div className="page-title">고객관리</div>
          <div className="page-subtitle">전체 {customers.length}명의 고객을 관리합니다.</div>
        </div>
        <div className="header-right customer-actions">
          <div className="search-wrap customer-search">
            <span className="search-icon">⌕</span>
            <input
              type="text"
              placeholder="고객명, 연락처 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Link href="/crm/customers/new" className="btn btn-primary customer-add-btn">+ 고객 등록</Link>
        </div>
      </div>

      <div className="mobile-customer-summary">
        <SummaryChip label="전체" value={customers.length} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        <SummaryChip label="상담" value={counts.consulting || 0} active={statusFilter === 'consulting'} onClick={() => setStatusFilter('consulting')} />
        <SummaryChip label="분석" value={counts.analysis || 0} active={statusFilter === 'analysis'} onClick={() => setStatusFilter('analysis')} />
        <SummaryChip label="계약" value={counts.contracted || 0} active={statusFilter === 'contracted'} onClick={() => setStatusFilter('contracted')} />
      </div>

      <div className="card card-p customer-filter-card" style={{ marginBottom: 16 }}>
        <div className="tab-bar customer-status-tabs" style={{ marginBottom: 0 }}>
          <button className={`tab-btn${statusFilter === 'all' ? ' active' : ''}`} onClick={() => setStatusFilter('all')}>
            전체 ({customers.length})
          </button>
          {Object.entries(statusLabels).map(([key, label]) => {
            const count = counts[key] || 0
            if (count === 0) return null
            return (
              <button
                key={key}
                className={`tab-btn${statusFilter === key ? ' active' : ''}`}
                onClick={() => setStatusFilter(key)}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>
        <div className="mobile-sort-row">
          <select className="form-input" value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
            {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={() => setSortDir((current) => current === 'asc' ? 'desc' : 'asc')}>
            {sortDir === 'asc' ? '오름차순' : '내림차순'}
          </button>
        </div>
      </div>

      <div className="mobile-customer-list">
        {loading ? (
          <MobileEmpty text="고객 목록을 불러오는 중입니다." />
        ) : filtered.length === 0 ? (
          <MobileEmpty text={customers.length === 0 ? '등록된 고객이 없습니다.' : '조건에 맞는 고객이 없습니다.'} />
        ) : filtered.map((customer) => (
          <MobileCustomerCard key={customer.id} customer={customer} />
        ))}
      </div>

      <div className="card customer-table-card">
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 70, textAlign: 'center', color: '#94a3b8' }}>
            {customers.length === 0 ? (
              <>
                <div style={{ marginBottom: 14 }}>등록된 고객이 없습니다.</div>
                <Link href="/crm/customers/new" className="btn btn-primary btn-sm">첫 고객 등록</Link>
              </>
            ) : (
              '조건에 맞는 고객이 없습니다.'
            )}
          </div>
        ) : (
          <>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    {[
                      { key: 'name', label: '이름' },
                      { key: 'phone', label: '연락처' },
                      { key: 'birth_date', label: '나이' },
                      { key: 'monthly_premium', label: '월 보험료' },
                      { key: 'policy_count', label: '보험' },
                      { key: 'indemnity_generation', label: '실손' },
                      { key: 'family_count', label: '가족' },
                      { key: 'status', label: '상태' },
                      { key: 'join_date', label: '등록일' },
                    ].map(({ key, label }) => (
                      <th key={key} onClick={() => handleSort(key)} style={{ cursor: 'pointer' }}>
                        {label} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    ))}
                    <th>태그</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <Link href={`/crm/customers/${customer.id}`} className="fw-700 text-blue">
                          {customer.name}
                        </Link>
                        {customer.consulting_summary && (
                          <div className="text-muted" style={{ fontSize: 11, marginTop: 2, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {customer.consulting_summary}
                          </div>
                        )}
                      </td>
                      <td>{customer.phone || '-'}</td>
                      <td>{formatAge(customer.birth_date)}</td>
                      <td className="fw-700">{formatWon(customer.monthly_premium)}</td>
                      <td>{customer.policy_count ? `${customer.policy_count}건` : '-'}</td>
                      <td>{customer.indemnity_generation ? `${customer.indemnity_generation}세대` : '-'}</td>
                      <td>{customer.family_count ? `${customer.family_count}명` : '-'}</td>
                      <td>
                        <span className={`badge ${statusBadges[customer.status] || 'badge-gray'}`}>
                          {statusLabels[customer.status] || customer.status || '-'}
                        </span>
                      </td>
                      <td>{customer.join_date || '-'}</td>
                      <td>
                        {(customer.tags || []).map((tag: string) => (
                          <span key={tag} className="tag tag-cyan">{tag}</span>
                        ))}
                      </td>
                      <td>
                        <Link href={`/crm/customers/${customer.id}`} className="btn btn-secondary btn-xs">상세</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-p" style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, paddingBottom: 12 }}>
              <span className="text-muted" style={{ fontSize: 12 }}>총 <strong>{filtered.length}명</strong> 표시 중</span>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function MobileCustomerCard({ customer }: { customer: any }) {
  return (
    <article className="mobile-customer-card">
      <div className="mobile-customer-top">
        <div className="profile-avatar">{customer.name?.slice(0, 1) || '?'}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="mobile-customer-name">{customer.name || '이름 없음'}</div>
          <div className="mobile-customer-phone">{customer.phone || '연락처 없음'}</div>
        </div>
        <span className={`badge ${statusBadges[customer.status] || 'badge-gray'}`}>
          {statusLabels[customer.status] || customer.status || '-'}
        </span>
      </div>
      <div className="mobile-customer-meta">
        <span>나이 <b>{formatAge(customer.birth_date)}</b></span>
        <span>월보험료 <b>{formatWon(customer.monthly_premium)}</b></span>
        <span>보험 <b>{customer.policy_count ? `${customer.policy_count}건` : '-'}</b></span>
      </div>
      {customer.consulting_summary && <p className="mobile-customer-summary-text">{customer.consulting_summary}</p>}
      {customer.tags?.length > 0 && (
        <div className="mobile-tags">{customer.tags.slice(0, 4).map((tag: string) => <span key={tag} className="tag tag-cyan">{tag}</span>)}</div>
      )}
      <div className="mobile-card-actions">
        <Link href={`/crm/customers/${customer.id}`} className="btn btn-primary">상세</Link>
        <Link href={`/crm/analysis?customerId=${customer.id}`} className="btn btn-secondary">보장분석</Link>
        {customer.phone && <a href={`tel:${customer.phone}`} className="btn btn-secondary">전화</a>}
      </div>
    </article>
  )
}

function SummaryChip({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`mobile-summary-chip${active ? ' active' : ''}`} onClick={onClick}>
      <span>{label}</span>
      <b>{value}</b>
    </button>
  )
}

function MobileEmpty({ text }: { text: string }) {
  return <div className="mobile-empty">{text}</div>
}

function compareCustomers(a: any, b: any, key: string, dir: 'asc' | 'desc') {
  const av = key === 'monthly_premium' || key === 'policy_count'
    ? Number(a[key] || 0)
    : String(a[key] ?? '')
  const bv = key === 'monthly_premium' || key === 'policy_count'
    ? Number(b[key] || 0)
    : String(b[key] ?? '')
  const result = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
  return dir === 'asc' ? result : -result
}

function formatAge(birthDate?: string) {
  if (!birthDate) return '-'
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return '-'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const birthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  if (today < birthday) age -= 1
  return `${age}세`
}

function formatWon(value?: number) {
  const v = Number(value) || 0
  if (v === 0) return '-'
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억원`
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString()}만원`
  return `${v.toLocaleString()}원`
}
