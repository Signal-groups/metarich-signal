'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'
import { blobToDataUrl, deleteLocalFile, getLocalFile, saveLocalFile } from '../../../lib/crmLocalFiles'

const CATEGORIES = ['전체', '보장분석', '암', '뇌', '심장', '수술', '간병', '재가', '치매']
const STORAGE_KEY = 'signal-crm-upload-files'
const GPTS_ANALYSIS_URL = 'https://chatgpt.com/g/g-6a0c10ad0478819192a11b8ffc28c760-boheomyi-gijun-bojangbunseog-ai'

type UploadItem = {
  id: string
  ownerId?: string
  name: string
  size: number
  type: string
  category: string
  date: string
  status: 'pending' | 'analyzing' | 'done'
  memo: string
  customerId: string
  customerName: string
  driveUrl: string
  includeInReport: boolean
  hasLocalFile: boolean
  localFileType: string
  analysisResult?: string
  analysisStatus?: 'idle' | 'running' | 'done' | 'error'
  structuredAnalysis?: any
}

const statusConf = {
  pending: { label: '대기', cls: 'badge-gray' },
  analyzing: { label: '분류 중', cls: 'badge-yellow' },
  done: { label: '정리 완료', cls: 'badge-green' },
}

const EXCEL_FIELDS = [
  { key: 'name', label: '고객명', required: true },
  { key: 'phone', label: '연락처' },
  { key: 'monthly_premium', label: '월 보험료' },
  { key: 'policy_count', label: '보험 건수' },
  { key: 'status', label: '상태' },
  { key: 'consulting_summary', label: '상담 요약' },
  { key: 'tags', label: '태그' },
]

const HEADER_HINTS: Record<string, string[]> = {
  name: ['고객명', '이름', '성명', '계약자', '피보험자', 'name', 'customer'],
  phone: ['연락처', '전화', '휴대폰', '핸드폰', 'phone', 'mobile', 'tel'],
  monthly_premium: ['월보험료', '보험료', '월 납입', '월납', 'premium', '납입보험료'],
  policy_count: ['보험건수', '계약건수', '증권수', '건수', 'policy'],
  status: ['상태', '진행상태', '고객상태', 'status'],
  consulting_summary: ['상담', '메모', '요약', '비고', 'summary', 'memo', 'note'],
  tags: ['태그', '분류', '부족', 'tag'],
}

const STATUS_WORDS: Record<string, string> = {
  신규: 'new',
  분석: 'analysis',
  상담: 'consulting',
  제안: 'proposal',
  보류: 'hold',
  계약: 'contracted',
  관리: 'managing',
}

type ExcelRow = Record<string, any>

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState('전체')
  const [selectedCategory, setSelectedCategory] = useState('암')
  const [items, setItems] = useState<UploadItem[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [excelFileName, setExcelFileName] = useState('')
  const [excelHeaders, setExcelHeaders] = useState<string[]>([])
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([])
  const [excelMapping, setExcelMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [gptsCode, setGptsCode] = useState('')
  const [gptsError, setGptsError] = useState('')

  useEffect(() => {
    const loadCustomers = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setCurrentUserId(session.user.id)
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('advisor_id', session.user.id)
        .is('deleted_at', null)
        .order('name', { ascending: true })
      const list = data || []
      setCustomers(list)
      setSelectedCustomerId(list[0]?.id || '')
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY)
        const savedItems = saved ? JSON.parse(saved) : []
        const ownCustomerIds = new Set(list.map((customer: any) => customer.id))
        setItems(Array.isArray(savedItems)
          ? savedItems.filter((item: UploadItem) => item.ownerId === session.user.id || (!item.ownerId && item.customerId && ownCustomerIds.has(item.customerId)))
          : [])
      } catch {
        setItems([])
      }
    }
    loadCustomers()
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    let disposed = false
    const urls: string[] = []
    const loadPreviews = async () => {
      const imageItems = items.filter((item) => item.hasLocalFile && String(item.localFileType || '').startsWith('image/'))
      const next: Record<string, string> = {}
      for (const item of imageItems) {
        const file = await getLocalFile(item.id)
        if (!file?.blob) continue
        const url = URL.createObjectURL(file.blob)
        urls.push(url)
        next[item.id] = url
      }
      if (!disposed) setPreviewUrls(next)
    }
    loadPreviews()
    return () => {
      disposed = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [items])

  const filteredItems = useMemo(() => (
    category === '전체' ? visibleItems(items, currentUserId, customers) : visibleItems(items, currentUserId, customers).filter((item) => item.category === category)
  ), [category, currentUserId, customers, items])

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return
    const now = new Date().toISOString().slice(0, 10)
    const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId)
    const nextItems: UploadItem[] = []
    Array.from(fileList).forEach((file) => {
      const id = `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`
      saveLocalFile({
        id,
        name: file.name,
        type: file.type || file.name.split('.').pop()?.toUpperCase() || 'FILE',
        size: file.size,
        blob: file,
        savedAt: new Date().toISOString(),
      }).catch(() => {})
      nextItems.push({
        id,
        ownerId: currentUserId,
        name: file.name,
        size: file.size,
        type: file.type || file.name.split('.').pop()?.toUpperCase() || 'FILE',
        category: selectedCategory,
        date: now,
        status: 'pending',
        memo: '',
        customerId: selectedCustomer?.id || '',
        customerName: selectedCustomer?.name || '',
        driveUrl: '',
        includeInReport: true,
        hasLocalFile: true,
        localFileType: file.type || '',
      })
      if (isExcelFile(file.name)) {
        parseExcelFile(file).catch((error) => {
          alert(`엑셀 파일을 읽지 못했습니다: ${error?.message || error}`)
        })
      }
    })
    setItems((prev) => [...nextItems, ...prev])
    if (inputRef.current) inputRef.current.value = ''
  }

  const parseExcelFile = async (file: File) => {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '' })
    const headers = rows[0] ? Object.keys(rows[0]) : []
    setExcelFileName(file.name)
    setExcelHeaders(headers)
    setExcelRows(rows.slice(0, 200))
    setExcelMapping(autoDetectMapping(headers))
  }

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  const removeItem = (id: string) => {
    deleteLocalFile(id).catch(() => {})
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const analyzeItem = async (item: UploadItem) => {
    updateItem(item.id, { status: 'analyzing', analysisStatus: 'running', analysisResult: '' })
    try {
      const localFile = item.hasLocalFile ? await getLocalFile(item.id) : null
      const imageDataUrl = localFile?.type?.startsWith('image/')
        ? await blobToDataUrl(localFile.blob)
        : ''
      const fileDataUrl = localFile?.type === 'application/pdf' && localFile.size <= 20 * 1024 * 1024
        ? await blobToDataUrl(localFile.blob)
        : ''

      const response = await fetch('/api/crm-upload-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: item.name,
          fileType: item.type,
          category: item.category,
          customerName: item.customerName,
          memo: item.memo,
          imageDataUrl,
          fileDataUrl,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || '자료 분석에 실패했습니다.')
      updateItem(item.id, {
        status: 'done',
        analysisStatus: 'done',
        analysisResult: data.analysis || '분석 결과가 없습니다.',
        structuredAnalysis: data.structured || null,
        memo: item.memo || firstLine(data.analysis || ''),
      })
    } catch (error: any) {
      updateItem(item.id, {
        status: 'pending',
        analysisStatus: 'error',
        analysisResult: error?.message || '자료 분석에 실패했습니다.',
      })
    }
  }

  const mappedRows = useMemo(() => {
    return excelRows.map((row) => {
      const mapped: Record<string, any> = {}
      EXCEL_FIELDS.forEach((field) => {
        const header = excelMapping[field.key]
        mapped[field.key] = header ? row[header] : ''
      })
      return normalizeExcelCustomer(mapped)
    }).filter((row) => row.name)
  }, [excelMapping, excelRows])

  const importExcelRows = async () => {
    if (mappedRows.length === 0) {
      alert('반영할 고객 데이터가 없습니다. 고객명 컬럼을 확인해주세요.')
      return
    }

    setImporting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setImporting(false)
      alert('로그인 정보가 필요합니다.')
      return
    }

    let created = 0
    let updated = 0
    for (const row of mappedRows) {
      const existing = customers.find((customer) => {
        const samePhone = row.phone && normalizePhone(customer.phone) === normalizePhone(row.phone)
        const sameName = customer.name && row.name && String(customer.name).trim() === String(row.name).trim()
        return samePhone || sameName
      })

      const payload = {
        advisor_id: session.user.id,
        name: row.name,
        phone: row.phone || null,
        monthly_premium: row.monthly_premium,
        policy_count: row.policy_count,
        status: row.status || 'new',
        consulting_summary: row.consulting_summary || null,
        tags: row.tags,
        join_date: new Date().toISOString().slice(0, 10),
        deleted_at: null,
        updated_at: new Date().toISOString(),
      }

      if (existing?.id) {
        const { error } = await supabase.from('customers').update(payload).eq('id', existing.id)
        if (!error) updated += 1
      } else if (row.phone) {
        const { error } = await supabase.from('customers').upsert(payload, { onConflict: 'advisor_id,phone' })
        if (!error) created += 1
      } else {
        const { error } = await supabase.from('customers').insert(payload)
        if (!error) created += 1
      }
    }

    const { data } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('advisor_id', session.user.id)
      .is('deleted_at', null)
      .order('name', { ascending: true })
    setCustomers(data || [])
    setImporting(false)
    alert(`엑셀 반영 완료\n신규 ${created}명 / 업데이트 ${updated}명`)
  }

  const applyGptsCode = () => {
    setGptsError('')
    try {
      const parsed = parseGptsJsonCode(gptsCode)
      const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId)
      const customerName = parsed?.customer?.name || parsed?.customer_name || selectedCustomer?.name || 'GPT 보장분석'
      const id = `gpts-analysis-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const summary = formatGptsAnalysis(parsed)

      setItems((prev) => [{
        id,
        ownerId: currentUserId,
        name: `${customerName}-GPTs-보장분석.json`,
        size: new Blob([JSON.stringify(parsed)]).size,
        type: 'application/json',
        category: '보장분석',
        date: new Date().toISOString().slice(0, 10),
        status: 'done',
        memo: firstLine(summary),
        customerId: selectedCustomer?.id || '',
        customerName,
        driveUrl: '',
        includeInReport: true,
        hasLocalFile: false,
        localFileType: 'application/json',
        analysisStatus: 'done',
        analysisResult: summary,
        structuredAnalysis: parsed,
      }, ...prev])
      setGptsCode('')
      setCategory('보장분석')
      setSelectedCategory('보장분석')
    } catch (error: any) {
      setGptsError(error?.message || 'JSON 코드를 확인해 주세요.')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">업로드 분석</div>
          <div className="page-subtitle">보험증권, 설명자료, 상담 이미지를 항목별로 정리합니다.</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setItems([])} disabled={items.length === 0}>목록 초기화</button>
      </div>

      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card card-p" style={{ gridColumn: 'span 2' }}>
          <div className="flex justify-between items-center mb-16">
            <div className="card-title" style={{ marginBottom: 0 }}>자료 분류</div>
            <span className="badge badge-blue">{selectedCategory}</span>
          </div>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">연결 고객</label>
              <select className="form-input" value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                {customers.length === 0 && <option value="">고객 없음</option>}
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name} {customer.phone ? `(${customer.phone})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">기본 분류</label>
              <select className="form-input" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                {CATEGORIES.filter((item) => item !== '전체').map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>
          <div className="tab-bar">
            {CATEGORIES.filter((item) => item !== '전체').map((item) => (
              <button key={item} className={`tab-btn${selectedCategory === item ? ' active' : ''}`} onClick={() => setSelectedCategory(item)}>
                {item}
              </button>
            ))}
          </div>
          <div
            className="upload-zone"
            onClick={() => inputRef.current?.click()}
            onDrop={(event) => {
              event.preventDefault()
              handleFiles(event.dataTransfer.files)
            }}
            onDragOver={(event) => event.preventDefault()}
          >
            <input ref={inputRef} type="file" multiple hidden accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(event) => handleFiles(event.target.files)} />
            <div className="upload-icon">📁</div>
            <div className="upload-text">파일을 드래그하거나 클릭하여 업로드</div>
            <div className="upload-sub">PDF, Excel, Word, JPG, PNG 지원 · 이 PC 브라우저에 보관하고 리포트에 연결</div>
          </div>
        </div>

        <div className="card card-p">
          <div className="card-title">운영 메모</div>
          <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.8 }}>
            큰 이미지는 Supabase에 바로 저장하지 않고, Google Drive 원본 링크를 고객 상세 메모나 리포트 자료로 연결하는 방식이 안전합니다.
          </div>
          <div className="divider" />
          <div className="grid-2">
            <MiniStat label="전체 자료" value={items.length} />
            <MiniStat label="정리 완료" value={items.filter((item) => item.status === 'done').length} />
          </div>
        </div>
      </div>

      <div className="card card-p" style={{ marginBottom: 16 }}>
        <div className="flex justify-between items-center mb-16" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="card-title" style={{ marginBottom: 3 }}>GPTs 보장분석 코드 적용</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              GPTs에서 PDF를 분석한 뒤 생성된 JSON 코드를 붙여넣으면 보장분석 자료로 저장됩니다.
            </div>
          </div>
          <a className="btn btn-primary btn-sm" href={GPTS_ANALYSIS_URL} target="_blank" rel="noreferrer">
            GPTs로 분석하기
          </a>
        </div>
        <textarea
          className="form-input"
          value={gptsCode}
          onChange={(event) => {
            setGptsCode(event.target.value)
            setGptsError('')
          }}
          placeholder="GPTs가 생성한 JSON 코드를 여기에 붙여넣으세요."
          style={{ minHeight: 150, resize: 'vertical', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: 12, lineHeight: 1.6 }}
        />
        {gptsError && <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 12 }}>{gptsError}</div>}
        <div className="flex justify-between items-center" style={{ gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <div className="text-muted" style={{ fontSize: 12 }}>
            코드블록 표시가 함께 복사되어도 자동으로 JSON 부분만 읽습니다.
          </div>
          <button className="btn btn-secondary btn-sm" onClick={applyGptsCode} disabled={!gptsCode.trim()} style={{ opacity: gptsCode.trim() ? 1 : 0.45 }}>
            분석 적용하기
          </button>
        </div>
      </div>

      {excelRows.length > 0 && (
        <div className="card card-p" style={{ marginBottom: 16 }}>
          <div className="flex justify-between items-center mb-16">
            <div>
              <div className="card-title" style={{ marginBottom: 3 }}>엑셀 추출 결과</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{excelFileName} · {excelRows.length}행 읽음 · {mappedRows.length}명 반영 가능</div>
            </div>
            <div className="flex gap-8">
              <button className="btn btn-secondary btn-sm" onClick={() => { setExcelRows([]); setExcelHeaders([]); setExcelFileName('') }}>닫기</button>
              <button className="btn btn-primary btn-sm" disabled={importing || mappedRows.length === 0} onClick={importExcelRows} style={{ opacity: importing || mappedRows.length === 0 ? 0.5 : 1 }}>
                {importing ? '반영 중...' : 'CRM에 반영'}
              </button>
            </div>
          </div>

          <div className="grid-3" style={{ marginBottom: 16 }}>
            {EXCEL_FIELDS.map((field) => (
              <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{field.label}{field.required ? ' *' : ''}</label>
                <select className="form-input" value={excelMapping[field.key] || ''} onChange={(event) => setExcelMapping((prev) => ({ ...prev, [field.key]: event.target.value }))}>
                  <option value="">선택 안함</option>
                  {excelHeaders.map((header) => <option key={header} value={header}>{header}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>고객명</th>
                  <th>연락처</th>
                  <th>월 보험료</th>
                  <th>보험 건수</th>
                  <th>상태</th>
                  <th>태그</th>
                  <th>상담 요약</th>
                </tr>
              </thead>
              <tbody>
                {mappedRows.slice(0, 8).map((row, index) => (
                  <tr key={`${row.name}-${index}`}>
                    <td className="fw-700">{row.name}</td>
                    <td>{row.phone || '-'}</td>
                    <td>{Number(row.monthly_premium || 0).toLocaleString()}원</td>
                    <td>{row.policy_count || 0}</td>
                    <td><span className="badge badge-blue">{statusLabel(row.status)}</span></td>
                    <td>{row.tags?.join(', ') || '-'}</td>
                    <td>{row.consulting_summary || '-'}</td>
                  </tr>
                ))}
                {mappedRows.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>고객명 컬럼을 선택하면 미리보기가 표시됩니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {mappedRows.length > 8 && <div className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>상위 8행만 미리보기로 표시됩니다.</div>}
        </div>
      )}

      <div className="card">
        <div className="card-p flex justify-between items-center">
          <div className="card-title" style={{ marginBottom: 0 }}>업로드 파일 목록</div>
          <div className="tab-bar" style={{ marginBottom: 0 }}>
            {CATEGORIES.map((item) => (
              <button key={item} className={`tab-btn${category === item ? ' active' : ''}`} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
        {filteredItems.length === 0 ? (
          <div style={{ padding: 38, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>업로드한 자료가 없습니다.</div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '32px 1.4fr 150px 110px 120px 84px', alignItems: 'center', gap: 12, padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 18 }}>{fileIcon(item.name)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatSize(item.size)} · {item.date} · {item.category}{item.customerName ? ` · ${item.customerName}` : ''} · {item.hasLocalFile ? 'PC 저장됨' : '링크만'}</div>
                {previewUrls[item.id] && (
                  <img src={previewUrls[item.id]} alt={item.name} style={{ width: 120, height: 78, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0', marginTop: 8 }} />
                )}
                <input className="form-input" value={item.memo} onChange={(event) => updateItem(item.id, { memo: event.target.value })} placeholder="메모 입력" style={{ marginTop: 8, padding: '6px 10px', fontSize: 12 }} />
                <input className="form-input" value={item.driveUrl || ''} onChange={(event) => updateItem(item.id, { driveUrl: event.target.value })} placeholder="Google Drive 링크 입력" style={{ marginTop: 6, padding: '6px 10px', fontSize: 12 }} />
                {item.analysisResult && (
                  <pre style={{ marginTop: 8, padding: 12, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12, lineHeight: 1.6, color: item.analysisStatus === 'error' ? '#b91c1c' : '#334155', background: item.analysisStatus === 'error' ? '#fef2f2' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                    {item.analysisResult}
                  </pre>
                )}
              </div>
              <select
                className="form-input"
                value={item.customerId || ''}
                onChange={(event) => {
                  const customer = customers.find((entry) => entry.id === event.target.value)
                  updateItem(item.id, { customerId: customer?.id || '', customerName: customer?.name || '' })
                }}
              >
                <option value="">고객 미연결</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
              <select className="form-input" value={item.category} onChange={(event) => updateItem(item.id, { category: event.target.value })}>
                {CATEGORIES.filter((entry) => entry !== '전체').map((entry) => <option key={entry}>{entry}</option>)}
              </select>
              <select className="form-input" value={item.status} onChange={(event) => updateItem(item.id, { status: event.target.value as UploadItem['status'] })}>
                <option value="pending">대기</option>
                <option value="analyzing">분류 중</option>
                <option value="done">정리 완료</option>
              </select>
              <div className="flex-col gap-8">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
                  <input type="checkbox" checked={item.includeInReport !== false} onChange={(event) => updateItem(item.id, { includeInReport: event.target.checked })} />
                  리포트
                </label>
                <button className="btn btn-primary btn-xs" onClick={() => analyzeItem(item)} disabled={item.analysisStatus === 'running'} style={{ opacity: item.analysisStatus === 'running' ? 0.5 : 1 }}>
                  {item.analysisStatus === 'running' ? '분석 중' : 'AI 분석'}
                </button>
                <button className="btn btn-secondary btn-xs" onClick={() => removeItem(item.id)}>삭제</button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

function autoDetectMapping(headers: string[]) {
  const mapping: Record<string, string> = {}
  Object.entries(HEADER_HINTS).forEach(([field, hints]) => {
    const found = headers.find((header) => {
      const normalizedHeader = normalizeHeader(header)
      return hints.some((hint) => normalizedHeader.includes(normalizeHeader(hint)))
    })
    if (found) mapping[field] = found
  })
  return mapping
}

function normalizeExcelCustomer(row: Record<string, any>) {
  return {
    name: cleanText(row.name),
    phone: cleanPhone(row.phone),
    monthly_premium: parseNumber(row.monthly_premium),
    policy_count: parseNumber(row.policy_count),
    status: normalizeStatus(row.status),
    consulting_summary: cleanText(row.consulting_summary),
    tags: parseTags(row.tags),
  }
}

function visibleItems(items: UploadItem[], ownerId: string, customers: any[]) {
  const ownCustomerIds = new Set(customers.map((customer) => customer.id))
  return items.filter((item) => item.ownerId === ownerId || (!item.ownerId && item.customerId && ownCustomerIds.has(item.customerId)))
}

function cleanText(value: any) {
  return String(value ?? '').trim()
}

function cleanPhone(value: any) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const digits = text.replace(/[^\d]/g, '')
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  return text
}

function normalizePhone(value: any) {
  return String(value ?? '').replace(/[^\d]/g, '')
}

function parseNumber(value: any) {
  if (typeof value === 'number') return Math.max(0, Math.round(value))
  const normalized = String(value ?? '').replace(/[^\d.-]/g, '')
  return Math.max(0, Math.round(Number(normalized) || 0))
}

function parseTags(value: any) {
  const text = String(value ?? '').trim()
  if (!text) return []
  return text.split(/[,/| ]+/).map((item) => item.trim()).filter(Boolean).map((item) => item.startsWith('#') ? item : `#${item}`)
}

function normalizeStatus(value: any) {
  const text = String(value ?? '').trim()
  if (!text) return 'new'
  if (Object.values(STATUS_WORDS).includes(text)) return text
  const found = Object.entries(STATUS_WORDS).find(([label]) => text.includes(label))
  return found?.[1] || 'new'
}

function statusLabel(value: string) {
  return Object.entries(STATUS_WORDS).find(([, status]) => status === value)?.[0] || '신규'
}

function firstLine(value: string) {
  return String(value || '').split('\n').map((line) => line.trim()).find(Boolean) || ''
}

function normalizeHeader(value: any) {
  return String(value ?? '').toLowerCase().replace(/\s|_|-|\(|\)|\[|\]/g, '')
}

function parseGptsJsonCode(value: string) {
  const raw = String(value || '').trim()
  if (!raw) throw new Error('붙여넣은 코드가 없습니다.')
  const withoutFence = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  if (withoutFence.includes('[CONTRACT]') || withoutFence.includes('[COVERAGE]')) {
    return parseGptsBlockCode(withoutFence)
  }
  const start = withoutFence.indexOf('{')
  const end = withoutFence.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('JSON 형식의 중괄호를 찾지 못했습니다.')
  const jsonText = withoutFence.slice(start, end + 1)
  const parsed = JSON.parse(jsonText)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON 객체 형식으로 생성해 주세요.')
  return parsed
}

function parseGptsBlockCode(value: string) {
  const lines = String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      line
      && !line.startsWith('---')
      && !/^\d+차 출력/.test(line)
      && line !== '1차 출력 완료'
      && line !== '2차 출력 시작'
      && line !== '2차 출력 완료'
      && line !== '3차 출력 시작'
      && line !== '3차 출력 완료'
    )

  const contracts: any[] = []
  let index = 0
  let currentContract: any = null

  while (index < lines.length) {
    const line = lines[index]
    if (line === '[CONTRACT]') {
      const fields = lines.slice(index + 1, index + 13).map(readPipeValue)
      currentContract = buildContractFromFields(fields)
      contracts.push(currentContract)
      index += 13
      continue
    }
    if (line === '[COVERAGE]') {
      const fields = lines.slice(index + 1, index + 6).map(readPipeValue)
      if (currentContract) currentContract.coverages.push(buildCoverageFromFields(fields))
      index += 6
      continue
    }
    index += 1
  }

  if (contracts.length === 0) throw new Error('[CONTRACT] 블록을 찾지 못했습니다.')

  const monthlyTotal = sumValues(contracts.map((contract) => contract.monthly_premium))
  const paidTotal = sumValues(contracts.map((contract) => contract.paid_premium_total))
  const remainingTotal = sumValues(contracts.map((contract) => contract.remaining_premium_total))

  return {
    version: 'insurance-analysis-block-v1',
    customer: {
      name: '확인필요',
      age: '확인필요',
      insurance_age: '확인필요',
      gender: '확인필요',
      monthly_premium: monthlyTotal,
      contract_count: contracts.length,
    },
    premium_summary: {
      monthly_total: monthlyTotal,
      paid_total: paidTotal,
      remaining_total: remainingTotal,
    },
    contracts,
    coverage_summary: buildCoverageSummary(contracts),
  }
}

function readPipeValue(value: string) {
  return String(value || '').replace(/\|$/, '').trim() || '확인필요'
}

function buildContractFromFields(fields: string[]) {
  const monthlyPremium = blockNumber(fields[7])
  const paidPremiumTotal = blockNumber(fields[10])
  const remainingPremiumTotal = blockNumber(fields[11])
  return {
    company: fields[0] || '확인필요',
    product_name: fields[1] || '확인필요',
    contract_status: fields[2] || '확인필요',
    start_date: fields[3] || '확인필요',
    maturity: fields[4] || '확인필요',
    maturity_date: fields[4] || '확인필요',
    payment_type: fields[5] || '확인필요',
    payment_period: fields[6] && fields[6] !== '확인필요' ? `${fields[6]}년` : '확인필요',
    payment_period_years: fields[6] || '확인필요',
    monthly_premium: monthlyPremium,
    premium: monthlyPremium,
    total_payment_count: fields[8] || '확인필요',
    paid_count: fields[9] || '확인필요',
    paid_premium_total: paidPremiumTotal,
    remaining_premium_total: remainingPremiumTotal,
    coverages: [],
  }
}

function buildCoverageFromFields(fields: string[]) {
  const category = fields[0] || '기타'
  const originalName = fields[1] || '담보명 확인필요'
  return {
    category,
    coverage_name: originalName,
    coverage_name_original: originalName,
    amount: blockNumber(fields[2]),
    coverage_amount: blockNumber(fields[2]),
    unit: '원',
    coverage_type: fields[3] || '확인필요',
    status: fields[4] || '확인필요',
    coverage_status: fields[4] || '확인필요',
    note: fields[3] && fields[3] !== '확인필요' ? fields[3] : '',
  }
}

function blockNumber(value: any) {
  const text = String(value ?? '').trim()
  if (!text || text === '확인필요' || text === '미표시') return undefined
  const parsed = Number(text.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

function sumValues(values: Array<number | undefined>) {
  return values.reduce<number>((total, value) => total + (Number(value) || 0), 0)
}

function buildCoverageSummary(contracts: any[]) {
  const summary = {
    cancer: 0,
    similar_cancer: 0,
    brain_vascular: 0,
    ischemic_heart: 0,
    disease_surgery: 0,
    injury_surgery: 0,
  }
  contracts.flatMap((contract) => contract.coverages || []).forEach((coverage) => {
    const category = String(coverage.category || '')
    const name = String(coverage.coverage_name || '')
    const amount = Number(coverage.amount || 0)
    if (!amount) return
    if (category.includes('암') && /유사|소액|기타피부|갑상선|제자리|경계성/.test(name)) summary.similar_cancer += amount
    else if (category.includes('암')) summary.cancer += amount
    else if (category.includes('뇌')) summary.brain_vascular += amount
    else if (category.includes('심장') || name.includes('허혈성')) summary.ischemic_heart += amount
    else if (category.includes('수술') && name.includes('상해')) summary.injury_surgery += amount
    else if (category.includes('수술')) summary.disease_surgery += amount
  })
  return summary
}

function formatGptsAnalysis(data: any) {
  const customer = data.customer || {}
  const analysis = data.analysis || {}
  const coverage = data.coverage_summary || {}
  const policies = Array.isArray(data.policies) ? data.policies : Array.isArray(data.contracts) ? data.contracts : []
  const lines = [
    `[GPTs 보장분석] ${customer.name || data.customer_name || '고객명 미확인'}`,
    customer.monthly_premium || data.monthly_premium ? `월 보험료: ${Number(customer.monthly_premium || data.monthly_premium).toLocaleString()}원` : '',
    customer.contract_count || data.contract_count ? `계약 건수: ${customer.contract_count || data.contract_count}건` : '',
    policies.length ? `가입 상품: ${policies.map((policy: any) => policy.company || policy.product_name || policy.product).filter(Boolean).slice(0, 5).join(', ')}` : '',
    '',
    '[주요 보장 요약]',
    coverage.cancer ? `암 진단비: ${Number(coverage.cancer).toLocaleString()}원` : '',
    coverage.similar_cancer ? `유사암: ${Number(coverage.similar_cancer).toLocaleString()}원` : '',
    coverage.brain_vascular ? `뇌혈관: ${Number(coverage.brain_vascular).toLocaleString()}원` : '',
    coverage.ischemic_heart ? `허혈성심장질환: ${Number(coverage.ischemic_heart).toLocaleString()}원` : '',
    coverage.disease_surgery ? `질병수술비: ${Number(coverage.disease_surgery).toLocaleString()}원` : '',
    coverage.injury_surgery ? `상해수술비: ${Number(coverage.injury_surgery).toLocaleString()}원` : '',
    '',
    listSection('강점', analysis.strengths),
    listSection('부족/확인 필요', analysis.weaknesses || analysis.missing_coverages),
    listSection('추천 방향', analysis.recommendation),
  ]
  return lines.filter(Boolean).join('\n')
}

function listSection(title: string, value: any) {
  const list = Array.isArray(value) ? value : value ? [value] : []
  if (list.length === 0) return ''
  return [`[${title}]`, ...list.map((item) => `- ${String(item)}`)].join('\n')
}

function isExcelFile(name: string) {
  const lower = name.toLowerCase()
  return lower.endsWith('.xlsx') || lower.endsWith('.xls')
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray rounded p-12">
      <div className="text-muted" style={{ fontSize: 11 }}>{label}</div>
      <div className="fw-700 text-blue" style={{ fontSize: 20 }}>{value}</div>
    </div>
  )
}

function formatSize(size: number) {
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`
  return `${Math.max(1, Math.round(size / 1024))}KB`
}

function fileIcon(name: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return '📄'
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return '📊'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) return '🖼️'
  return '📎'
}
