'use client'

import { useEffect, useState } from 'react'
import { listProSessions } from '../../../lib/coverageAnalysis/session'
import type { ProSession } from '../../../lib/coverageAnalysis/types'
import { supabase } from '../../../lib/supabase'

export default function SessionList({ onSelect }: { onSelect: (session: ProSession) => void }) {
  const [sessions, setSessions] = useState<ProSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setSessions([])
        setLoading(false)
        return
      }

      const list = await listProSessions(session.user.id, { status: 'draft', limit: 10 })
      setSessions(list)
      setLoading(false)
    }

    void load()
  }, [])

  return (
    <div className="coverage-pro-card coverage-pro-card-pad">
      <div className="coverage-pro-section-title">이전 세션 이어하기</div>
      {loading && <div className="coverage-pro-muted">저장된 분석 세션을 불러오는 중입니다.</div>}
      {!loading && sessions.length === 0 && (
        <div className="coverage-pro-muted">이어갈 분석 세션이 없습니다.</div>
      )}
      {!loading && sessions.length > 0 && (
        <div className="coverage-pro-table-wrap">
          <table className="coverage-pro-table">
            <thead>
              <tr>
                <th>고객명</th>
                <th>마지막 단계</th>
                <th>날짜</th>
                <th>선택</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td><b>{session.customerSnapshot?.name || '고객 미지정'}</b></td>
                  <td>{session.currentStep}단계</td>
                  <td>{formatDate(session.updatedAt || session.createdAt)}</td>
                  <td>
                    <button type="button" className="coverage-pro-btn" onClick={() => onSelect(session)}>
                      이어하기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('ko-KR')
}
