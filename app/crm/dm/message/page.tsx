'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../../lib/supabase'

export default function DmMessagePage() {
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [advisorName, setAdvisorName] = useState('담당자')
  const [advisorPhone, setAdvisorPhone] = useState('')
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')
  const [dmLogs, setDmLogs] = useState<{ name: string; title: string; date: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const [{ data: userData }, { data: templateData }, { data: customerData }, { data: logData }] = await Promise.all([
      supabase.from('users').select('name, phone').eq('id', session.user.id).single(),
      supabase.from('dm_templates').select('*').order('created_at', { ascending: true }),
      supabase.from('customers').select('id, name, phone').eq('advisor_id', session.user.id).is('deleted_at', null).order('name', { ascending: true }),
      supabase.from('dm_logs').select('content, sent_at, dm_templates(title), customers(name)').order('sent_at', { ascending: false }).limit(5),
    ])

    const templateList = templateData || []
    const customerList = customerData || []
    setAdvisorName(userData?.name || session.user.email?.split('@')[0] || '담당자')
    setAdvisorPhone(userData?.phone || '')
    setTemplates(templateList)
    setCustomers(customerList)
    setSelectedTemplate(templateList[0] || null)
    setSelectedCustomer(customerList[0] || null)
    setDmLogs((logData || []).map((log: any) => ({
      name: log.customers?.name || '',
      title: log.dm_templates?.title || '',
      date: log.sent_at?.slice(5, 10) || '',
    })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const preview = useMemo(() => {
    if (!selectedTemplate || !selectedCustomer) return ''
    return String(selectedTemplate.content || '')
      .replace(/\{\{customer_name\}\}/g, selectedCustomer.name)
      .replace(/\{\{advisor_name\}\}/g, advisorName)
      .replace(/\{\{advisor_phone\}\}/g, advisorPhone)
  }, [advisorName, advisorPhone, selectedCustomer, selectedTemplate])

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim()
    return customers.filter((c) =>
      !keyword || String(c.name || '').includes(keyword) || String(c.phone || '').includes(keyword)
    )
  }, [customers, search])

  const handleCopy = async () => {
    if (!preview || !selectedCustomer || !selectedTemplate) return
    await navigator.clipboard.writeText(preview)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    await supabase.from('dm_logs').insert({
      customer_id: selectedCustomer.id,
      template_id: selectedTemplate.id,
      content: preview,
      sent_by: advisorName,
    })
    setDmLogs((prev) => [
      { name: selectedCustomer.name, title: selectedTemplate.title, date: new Date().toISOString().slice(5, 10) },
      ...prev.slice(0, 4),
    ])
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Link href="/crm/dm" className="link" style={{ marginBottom: 8, display: 'inline-block' }}>← 고객 DM</Link>
          <div className="page-title">DM 메시지</div>
          <div className="page-subtitle">고객별 맞춤 메시지를 선택해 바로 복사합니다.</div>
        </div>
      </div>

      {loading ? (
        <div className="card card-p" style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>불러오는 중...</div>
      ) : (
        <div className="grid-3">
          {/* 템플릿 */}
          <div className="card card-p">
            <div className="card-title">메시지 템플릿</div>
            {templates.length === 0 ? (
              <div style={{ padding: 34, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>등록된 템플릿이 없습니다.</div>
            ) : (
              <div className="flex-col gap-8">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`dm-card${selectedTemplate?.id === t.id ? ' active' : ''}`}
                    style={{ textAlign: 'left', background: selectedTemplate?.id === t.id ? '#eff6ff' : '#fff' }}
                  >
                    <div className="fw-700" style={{ fontSize: 13 }}>{t.title}</div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.content?.slice(0, 45)}...
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 고객 선택 */}
          <div className="card card-p">
            <div className="card-title">고객 선택</div>
            <div className="search-wrap" style={{ marginBottom: 12 }}>
              <span className="search-icon">⌕</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="고객 검색" style={{ width: '100%' }} />
            </div>
            <div className="flex-col gap-8" style={{ maxHeight: 320, overflowY: 'auto' }}>
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`dm-card${selectedCustomer?.id === c.id ? ' active' : ''}`}
                  style={{ textAlign: 'left', padding: 12, background: selectedCustomer?.id === c.id ? '#eff6ff' : '#fff' }}
                >
                  <div className="flex items-center gap-8">
                    <div className="profile-avatar">{c.name?.slice(0, 1)}</div>
                    <div>
                      <div className="fw-700" style={{ fontSize: 13 }}>{c.name}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{c.phone}</div>
                    </div>
                  </div>
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>고객이 없습니다.</div>
              )}
            </div>
          </div>

          {/* 미리보기 */}
          <div className="card card-p">
            <div className="flex justify-between items-center mb-16">
              <div className="card-title" style={{ marginBottom: 0 }}>미리보기</div>
              <button onClick={handleCopy} disabled={!preview} className={`copy-btn${copied ? ' copied' : ''}`} style={{ opacity: preview ? 1 : 0.4 }}>
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
            {selectedCustomer && (
              <div className="bg-gray rounded p-12 mb-16">
                <span className="text-muted" style={{ fontSize: 12 }}>수신자 </span>
                <span className="fw-700" style={{ fontSize: 12 }}>{selectedCustomer.name} ({selectedCustomer.phone})</span>
              </div>
            )}
            <pre className="dm-preview">{preview || '템플릿과 고객을 선택하세요.'}</pre>
            <div className="divider" />
            <div className="card-title">최근 발송 이력</div>
            {dmLogs.length === 0 ? (
              <div className="text-muted" style={{ fontSize: 12 }}>발송 이력이 없습니다.</div>
            ) : (
              <div className="flex-col gap-8">
                {dmLogs.map((log, i) => (
                  <div key={i} className="text-muted" style={{ fontSize: 12 }}>
                    {log.date} {log.name} · {log.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
