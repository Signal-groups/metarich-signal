'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import {
  Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, Radar,
  RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

const categoryNames: Record<string, string> = {
  cancer: '암 진단비',
  brain: '뇌혈관',
  heart: '심장',
  surgery: '수술비',
  hospitalization: '입원비',
  nursing: '간병비',
  driver: '운전자',
  fire: '화재',
}

const statusLabels: Record<string, string> = {
  new: '신규',
  analysis: '분석',
  consulting: '상담',
  proposal: '제안',
  hold: '보류',
  contracted: '계약',
  managing: '관리',
}

const tagClasses = ['tag-red', 'tag-orange', 'tag-yellow', 'tag-cyan', 'tag-purple']

export default function AnalysisPage() {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [radarData, setRadarData] = useState<any[]>([])
  const [tagStats, setTagStats] = useState<{ tag: string; count: number }[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setLoading(false)
      return
    }

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('advisor_id', session.user.id)
      .is('deleted_at', null)

    const customerList = customerData || []
    setCustomers(customerList)

    const tagCounts: Record<string, number> = {}
    customerList.forEach((customer: any) => {
      customer.tags?.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })
    setTagStats(Object.entries(tagCounts).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count))

    const customerIds = customerList.map((customer: any) => customer.id)
    if (customerIds.length > 0) {
      const { data: coverages } = await supabase
        .from('coverages')
        .select('category, amount')
        .in('customer_id', customerIds)

      const categoryTotals: Record<string, number> = {}
      ;(coverages || []).forEach((coverage: any) => {
        categoryTotals[coverage.category] = (categoryTotals[coverage.category] || 0) + (coverage.amount || 0)
      })

      const maxAmount = Math.max(...Object.values(categoryTotals), 1)
      setRadarData(Object.entries(categoryNames).map(([key, label]) => ({
        category: label,
        value: Math.round(((categoryTotals[key] || 0) / maxAmount) * 100),
        recommended: 100,
      })))
    }

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredByTag = useMemo(() => selected
    ? customers.filter((customer: any) => customer.tags?.includes(selected))
    : [], [customers, selected])

  const tagBarData = tagStats.map((item) => ({ name: item.tag.replace('#', ''), count: item.count }))
  const statusCounts = Object.keys(statusLabels).map((key) => ({
    name: statusLabels[key],
    count: customers.filter((customer: any) => customer.status === key).length,
  })).filter((item) => item.count > 0)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">보장분석</div>
          <div className="page-subtitle">전체 고객의 보장 현황과 상담 포인트를 분석합니다.</div>
        </div>
      </div>

      {loading ? (
        <div className="card card-p" style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
      ) : (
        <>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="card card-p">
              <div className="card-title">전체 고객 평균 보장률</div>
              <div className="page-subtitle" style={{ marginBottom: 12 }}>권장 기준 대비 현재 보장 수준</div>
              {radarData.length > 0 ? (
                <div className="radar-wrap" style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <Radar name="현재 보장" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                      <Radar name="권장 기준" dataKey="recommended" stroke="#E2E8F0" fill="none" strokeDasharray="4 2" />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState text="커버리지 데이터가 없습니다." />
              )}
            </div>

            <div className="card card-p">
              <div className="card-title">태그별 고객 현황</div>
              <div className="page-subtitle" style={{ marginBottom: 12 }}>태그를 클릭하면 고객 목록을 볼 수 있습니다.</div>
              {tagBarData.length > 0 ? (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tagBarData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState text="태그 데이터가 없습니다." />
              )}
            </div>
          </div>

          {tagStats.length > 0 && (
            <div className="card card-p" style={{ marginBottom: 16 }}>
              <div className="card-title">태그별 고객 필터</div>
              <div style={{ marginBottom: 16 }}>
                {tagStats.map(({ tag, count }, index) => (
                  <button
                    key={tag}
                    className={`tag ${selected === tag ? 'tag-cyan' : tagClasses[index % tagClasses.length]}`}
                    onClick={() => setSelected(selected === tag ? null : tag)}
                  >
                    {tag} ({count})
                  </button>
                ))}
              </div>

              {selected && filteredByTag.length > 0 && (
                <div className="grid-auto">
                  {filteredByTag.map((customer: any) => (
                    <Link key={customer.id} href={`/crm/customers/${customer.id}`} className="family-card" style={{ textDecoration: 'none' }}>
                      <div className="family-avatar" style={{ background: '#eff6ff', color: '#2563eb' }}>{customer.name?.slice(0, 1)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="fw-700" style={{ fontSize: 13 }}>{customer.name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{customer.phone}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card card-p">
            <div className="card-title">상태별 고객 현황</div>
            <div className="grid-auto">
              {statusCounts.map((item) => (
                <div key={item.name} className="bg-gray rounded p-16" style={{ textAlign: 'center' }}>
                  <div className="stat-value">{item.count}</div>
                  <div className="stat-label">{item.name}</div>
                </div>
              ))}
              {statusCounts.length === 0 && <EmptyState text="고객 데이터가 없습니다." />}
            </div>
          </div>
        </>
      )}
    </>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{text}</div>
}
