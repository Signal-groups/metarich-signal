'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

const relationLabel: Record<string, string> = {
  spouse: '배우자',
  child: '자녀',
  parent: '부모',
  sibling: '형제',
  other: '기타',
}

export default function FamilyPage() {
  const [loading, setLoading] = useState(true)
  const [families, setFamilies] = useState<{ customer: any; members: any[] }[]>([])
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, phone, monthly_premium, policy_count, family_count')
      .eq('advisor_id', session.user.id)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (!customers?.length) {
      setFamilies([])
      setLoading(false)
      return
    }

    const customerIds = customers.map((customer: any) => customer.id)
    const { data: familyMembers } = await supabase
      .from('families')
      .select('*')
      .in('customer_id', customerIds)

    setFamilies(customers.map((customer: any) => ({
      customer,
      members: (familyMembers || []).filter((member: any) => member.customer_id === customer.id),
    })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const keyword = search.trim()
    if (!keyword) return families
    return families.filter(({ customer, members }) =>
      String(customer.name || '').includes(keyword)
      || members.some((member: any) => String(member.name || '').includes(keyword))
    )
  }, [families, search])

  const totalFamilyMembers = families.reduce((sum, family) => sum + family.members.length, 0)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">가족현황</div>
          <div className="page-subtitle">고객 {families.length}명 · 가족 구성원 {totalFamilyMembers}명 등록</div>
        </div>
        <div className="header-right">
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="고객명 또는 가족명 검색" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card card-p" style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="card card-p" style={{ padding: 70, textAlign: 'center', color: '#94a3b8' }}>
          {families.length === 0 ? '등록된 고객이 없습니다.' : '조건에 맞는 결과가 없습니다.'}
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(({ customer, members }) => (
            <div key={customer.id} className="card">
              <div className="card-p" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex items-center gap-12">
                  <div className="profile-avatar">{customer.name?.slice(0, 1)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-8">
                      <Link href={`/crm/customers/${customer.id}`} className="fw-700 text-blue">{customer.name}</Link>
                      <span className="badge badge-blue">본인</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>
                      {customer.phone || '-'} · {(customer.monthly_premium || 0).toLocaleString()}원
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-muted" style={{ fontSize: 11 }}>가족</div>
                    <div className="fw-700">{members.length}명</div>
                  </div>
                </div>
              </div>

              <div className="card-p">
                {members.length > 0 ? members.map((member: any) => {
                  const age = member.birth_date ? new Date().getFullYear() - new Date(member.birth_date).getFullYear() : null
                  return (
                    <div key={member.id} className="family-card">
                      <div className="family-avatar" style={{ background: '#f1f5f9', color: '#475569' }}>{member.name?.slice(0, 1)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fw-700" style={{ fontSize: 13 }}>{member.name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          {relationLabel[member.relation] || member.relation}{age ? ` · ${age}세` : ''}
                        </div>
                      </div>
                      {member.phone && <div className="text-muted" style={{ fontSize: 11 }}>{member.phone}</div>}
                    </div>
                  )
                }) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 18 }}>
                    가족 구성원이 없습니다.
                    <Link href={`/crm/customers/${customer.id}?tab=family`} className="link" style={{ display: 'block', marginTop: 6 }}>
                      + 추가하기
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
