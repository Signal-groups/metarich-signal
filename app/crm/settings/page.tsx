'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const TABS = [
  { id: 'profile', label: '내 정보' },
  { id: 'notifications', label: '알림 설정' },
  { id: 'storage', label: '자료 관리' },
  { id: 'appearance', label: '화면 설정' },
]

const DEFAULT_NOTICES = [
  ['가입 경과 알림', '30/90/180일 고객 알림', true],
  ['면책/감액 종료 알림', '보장 시작 전후 확인 알림', true],
  ['생일 알림', '고객 생일 상담 기회 알림', true],
  ['자동차보험 갱신 알림', 'D-60, D-30 갱신 알림', true],
  ['업로드 정리 알림', '자료 정리 상태 확인 알림', false],
] as const

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState({ id: '', name: '', phone: '', email: '', role: '' })
  const [noticePrefs, setNoticePrefs] = useState<Record<string, boolean>>({})
  const [pageSize, setPageSize] = useState('20')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('users').select('id, name, phone, email, role').eq('id', session.user.id).maybeSingle()
      setProfile({
        id: session.user.id,
        name: data?.name || '',
        phone: data?.phone || '',
        email: data?.email || session.user.email || '',
        role: data?.role || '',
      })
      try {
        const saved = window.localStorage.getItem('signal-crm-notice-prefs')
        if (saved) setNoticePrefs(JSON.parse(saved))
      } catch {}
      setPageSize(window.localStorage.getItem('signal-crm-page-size') || '20')
    }
    load()
  }, [])

  const saveProfile = async () => {
    if (!profile.id) return
    const { error } = await supabase.from('users').update({ name: profile.name, phone: profile.phone, email: profile.email }).eq('id', profile.id)
    setMessage(error ? `저장 실패: ${error.message}` : '내 정보가 저장되었습니다.')
    setTimeout(() => setMessage(''), 2200)
  }

  const toggleNotice = (label: string, next: boolean) => {
    const prefs = { ...noticePrefs, [label]: next }
    setNoticePrefs(prefs)
    window.localStorage.setItem('signal-crm-notice-prefs', JSON.stringify(prefs))
  }

  const saveAppearance = () => {
    window.localStorage.setItem('signal-crm-page-size', pageSize)
    setMessage('화면 설정이 저장되었습니다.')
    setTimeout(() => setMessage(''), 2200)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">설정</div>
          <div className="page-subtitle">고객관리 화면과 개인 설정을 관리합니다.</div>
        </div>
        {message && <span className="badge badge-green">{message}</span>}
      </div>

      <div className="grid-3">
        <div className="card card-p">
          <div className="settings-menu">
            {TABS.map((tab) => (
              <button key={tab.id} className={`settings-menu-item${activeTab === tab.id ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card card-p" style={{ gridColumn: 'span 2' }}>
          {activeTab === 'profile' && (
            <div style={{ maxWidth: 460 }}>
              <div className="card-title">담당자 정보</div>
              <Field label="이름">
                <input className="form-input" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
              </Field>
              <Field label="연락처">
                <input className="form-input" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="010-0000-0000" />
              </Field>
              <Field label="이메일 (연락처)">
                <input className="form-input" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} placeholder="연락처용 이메일" />
              </Field>
              <Field label="권한">
                <input className="form-input" value={profile.role || '-'} disabled />
              </Field>
              <button className="btn btn-primary" onClick={saveProfile}>설정 저장</button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <div className="card-title">알림 설정</div>
              {DEFAULT_NOTICES.map(([label, desc, defaultOn]) => {
                const checked = noticePrefs[label] ?? defaultOn
                return (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{desc}</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={checked} onChange={(event) => toggleNotice(label, event.target.checked)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'storage' && (
            <div>
              <div className="card-title">자료 관리 방식</div>
              <div className="bg-gray rounded p-12 mb-16" style={{ lineHeight: 1.8, fontSize: 13 }}>
                원본 이미지와 대용량 PDF는 Google Drive에 보관하고, CRM에는 고객명, 태그, 메모, 링크만 저장하는 방식을 권장합니다.
              </div>
              <div className="grid-2">
                <InfoBox title="Supabase 절약" text="DB에는 텍스트와 링크만 저장해 무료 용량 부담을 줄입니다." />
                <InfoBox title="리포트 활용" text="암, 뇌, 심장, 수술, 간병 등 탭별 자료를 선택해 상담 리포트에 연결합니다." />
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div style={{ maxWidth: 320 }}>
              <div className="card-title">화면 설정</div>
              <Field label="페이지당 고객 수">
                <select className="form-input" value={pageSize} onChange={(event) => setPageSize(event.target.value)}>
                  <option value="10">10명</option>
                  <option value="20">20명</option>
                  <option value="30">30명</option>
                  <option value="50">50명</option>
                </select>
              </Field>
              <button className="btn btn-primary" onClick={saveAppearance}>설정 저장</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

function InfoBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-gray rounded p-12">
      <div className="fw-700 text-blue" style={{ fontSize: 13, marginBottom: 4 }}>{title}</div>
      <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.7 }}>{text}</div>
    </div>
  )
}
