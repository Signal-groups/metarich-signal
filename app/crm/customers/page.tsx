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
    return customers
      .filter((customer) => {
        const keyword = search.trim()
        const matchSearch = !keyword
          || String(customer.name || '').includes(keyword)
          || String(customer.phone || '').includes(keyword)
        const matchStatus = statusFilter === 'all' || customer.status === statusFilter
        return matchSearch && matchStatus
      })
      .sort((a, b) => {
        const av = String(a[sortKey] ?? '')
        const bv = String(b[sortKey] ?? '')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
  }, [customers, search, sortDir, sortKey, statusFilter])

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((current) => current === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">고객관리</div>
          <div className="page-subtitle">전체 {customers.length}명의 고객 정보를 관리합니다.</div>
        </div>
        <div className="header-right">
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input
              type="text"
              placeholder="고객명 또는 연락처 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Link href="/crm/customers/new" className="btn btn-primary">+ 고객 등록</Link>
        </div>
      </div>

      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div className="tab-bar" style={{ marginBottom: 0 }}>
          <button className={`tab-btn${statusFilter === 'all' ? ' active' : ''}`} onClick={() => setStatusFilter('all')}>
            전체 ({customers.length})
          </button>
          {Object.entries(statusLabels).map(([key, label]) => {
            const count = customers.filter((customer) => customer.status === key).length
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
      </div>

      <div className="card">
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
                      { key: 'policy_count', label: '보험수' },
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
                  {filtered.map((customer) => {
                    const age = customer.birth_date
                      ? new Date().getFullYear() - new Date(customer.birth_date).getFullYear()
                      : null

                    return (
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
                        <td>{age ? `${age}세` : '-'}</td>
                        <td className="fw-700">{(customer.monthly_premium || 0).toLocaleString()}원</td>
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
                    )
                  })}
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
