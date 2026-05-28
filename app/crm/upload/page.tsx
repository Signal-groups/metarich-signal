'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'
import { blobToDataUrl, deleteLocalFile, getLocalFile, saveLocalFile } from '../../../lib/crmLocalFiles'
import { fetchUploadAnalyses, mergeAnalysisItems, saveGptsAnalysisToSupabase } from '../../../lib/crmAnalysisPersistence'

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
  remoteAnalysisId?: string
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
      const remoteItems = await fetchUploadAnalyses(supabase, session.user.id) as UploadItem[]
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY)
        const savedItems = saved ? JSON.parse(saved) : []
        const ownCustomerIds = new Set(list.map((customer: any) => customer.id))
        const localItems = Array.isArray(savedItems)
          ? savedItems.filter((item: UploadItem) => item.ownerId === session.user.id || (!item.ownerId && item.customerId && ownCustomerIds.has(item.customerId)))
          : []
        setItems(mergeAnalysisItems(remoteItems, localItems))
      } catch {
        setItems(remoteItems)
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

  const applyGptsCode = async () => {
    setGptsError('')
    try {
      const parsed = parseGptsJsonCode(gptsCode)
      const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId)
      if (!selectedCustomer?.id) {
        setGptsError('분석을 연결할 고객을 먼저 선택해 주세요.')
        return
      }
      const customerName = parsed?.customer?.name || parsed?.customer_name || selectedCustomer?.name || 'GPT 보장분석'
      const id = `gpts-analysis-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const summary = formatGptsAnalysis(parsed)
      const fileName = `${customerName}-GPTs-보장분석.json`
      const tempItem: UploadItem = {
        id,
        ownerId: currentUserId,
        name: fileName,
        size: new Blob([JSON.stringify(parsed)]).size,
        type: 'application/json',
        category: '보장분석',
        date: new Date().toISOString().slice(0, 10),
        status: 'done',
        memo: firstLine(summary),
        customerId: selectedCustomer.id,
        customerName,
        driveUrl: '',
        includeInReport: true,
        hasLocalFile: false,
        localFileType: 'application/json',
        analysisStatus: 'done',
        analysisResult: summary,
        structuredAnalysis: parsed,
      }

      setItems((prev) => [tempItem, ...prev])
      setGptsCode('')
      setCategory('보장분석')
      setSelectedCategory('보장분석')

      const saved = await saveGptsAnalysisToSupabase(supabase, {
        advisorId: currentUserId,
        customerId: selectedCustomer.id,
        customerName,
        fileName,
        summary,
        structuredAnalysis: parsed,
      })

      if (saved.ok && saved.data) {
        setItems((prev) => mergeAnalysisItems([saved.data as UploadItem], prev.filter((item) => item.id !== id)))
      } else {
        setGptsError('화면에는 임시 반영했습니다. Supabase SQL 적용 전이면 다른 기기에서는 아직 보이지 않을 수 있습니다.')
      }
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
            <div className="upload-sub">PDF, Excel, Word, JPG, PNG 지원 · GPTs 보장분석은 고객별 DB에 연결</div>
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
                {item.structuredAnalysis && (
                  <button className="btn btn-xs" onClick={() => downloadAnalysisExcel(item)} style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontWeight: 700 }}>
                    📊 분석표
                  </button>
                )}
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

// ─── 보장분석표 Excel 다운로드 ────────────────────────────────────────────────

const COVERAGE_STRUCTURE = [
  { b: '가족보장자산', c: '사망', d: '일반' },
  { b: null, c: null, d: '질병' },
  { b: null, c: null, d: '재해(상해)' },
  { b: '생활보장자산', c: '암치료비', d: '일반암' },
  { b: null, c: null, d: '유사암/소액암' },
  { b: null, c: null, d: '암수술비' },
  { b: null, c: null, d: '항암 (방사선/약물)' },
  { b: null, c: null, d: '표적항암치료' },
  { b: null, c: null, d: '중입자치료' },
  { b: null, c: null, d: '암주요치료비' },
  { b: null, c: '2대질병치료비', d: '뇌혈관질환' },
  { b: null, c: null, d: '뇌졸중' },
  { b: null, c: null, d: '뇌출혈' },
  { b: null, c: null, d: '급성심근경색' },
  { b: null, c: null, d: '허혈성심장질환' },
  { b: null, c: null, d: '심혈관질환' },
  { b: null, c: null, d: '뇌혈관수술비' },
  { b: null, c: null, d: '심혈관수술비' },
  { b: null, c: null, d: '2대주요치료비' },
  { b: null, c: '후유장해', d: '질병 후유장해(3%~)' },
  { b: null, c: null, d: '상해 후유장해(3%~)' },
  { b: null, c: '골절', d: '골절 진단비' },
  { b: null, c: null, d: '골절 수술비' },
  { b: null, c: null, d: '5대골절 진단비' },
  { b: null, c: null, d: '5대골절 수술비' },
  { b: null, c: null, d: '깁스 치료비' },
  { b: null, c: '화상', d: '화상 진단비' },
  { b: null, c: null, d: '화상 수술비' },
  { b: '의료보장자산', c: '실손의료비', d: '상해입원의료비' },
  { b: null, c: null, d: '상해통원의료비' },
  { b: null, c: null, d: '질병입원의료비' },
  { b: null, c: null, d: '질병통원의료비' },
  { b: null, c: '수술비', d: '질병 수술비' },
  { b: null, c: null, d: '질병 1~5종수술비' },
  { b: null, c: null, d: '상해 수술비' },
  { b: null, c: null, d: '상해 1~5종수술비' },
  { b: null, c: null, d: 'N대 수술비' },
  { b: null, c: null, d: '창상봉합술' },
  { b: null, c: '입원', d: '질병 입원일당' },
  { b: null, c: null, d: '상해 입원일당' },
  { b: null, c: null, d: '교통상해입원일당' },
  { b: null, c: null, d: '상해간병지원금' },
  { b: null, c: null, d: '질병간병지원금' },
  { b: '운전자', c: null, d: '교통사고처리지원금' },
  { b: null, c: null, d: '교통사고벌금' },
  { b: null, c: null, d: '변호사선임비용' },
  { b: null, c: null, d: '자동차부상치료비' },
  { b: '치아', c: null, d: '임플란트' },
  { b: null, c: null, d: '크라운' },
  { b: '기타', c: null, d: '가족일상배상책임' },
  { b: null, c: null, d: '화재벌금' },
]

function findCoverageRowIndex(normalizedName: string): number {
  const map: { keywords: string[]; idx: number }[] = [
    { idx: 0, keywords: ['일반사망'] },
    { idx: 1, keywords: ['질병사망'] },
    { idx: 2, keywords: ['재해사망', '상해사망'] },
    { idx: 3, keywords: ['일반암', '암진단'] },
    { idx: 4, keywords: ['유사암', '소액암'] },
    { idx: 5, keywords: ['암수술'] },
    { idx: 6, keywords: ['표적항암'] },
    { idx: 7, keywords: ['항암', '방사선항암', '약물항암'] },
    { idx: 8, keywords: ['중입자'] },
    { idx: 9, keywords: ['암주요치료'] },
    { idx: 10, keywords: ['뇌혈관질환'] },
    { idx: 11, keywords: ['뇌졸중'] },
    { idx: 12, keywords: ['뇌출혈'] },
    { idx: 13, keywords: ['급성심근경색', '심근경색'] },
    { idx: 14, keywords: ['허혈성심장질환', '허혈성'] },
    { idx: 15, keywords: ['심혈관질환'] },
    { idx: 16, keywords: ['뇌혈관수술'] },
    { idx: 17, keywords: ['심혈관수술'] },
    { idx: 18, keywords: ['2대주요치료', '주요치료비'] },
    { idx: 19, keywords: ['질병후유장해', '질병후유'] },
    { idx: 20, keywords: ['상해후유장해', '상해후유'] },
    { idx: 21, keywords: ['골절진단'] },
    { idx: 22, keywords: ['골절수술'] },
    { idx: 23, keywords: ['5대골절진단'] },
    { idx: 24, keywords: ['5대골절수술'] },
    { idx: 25, keywords: ['깁스'] },
    { idx: 26, keywords: ['화상진단'] },
    { idx: 27, keywords: ['화상수술'] },
    { idx: 28, keywords: ['상해입원의료비'] },
    { idx: 29, keywords: ['상해통원의료비'] },
    { idx: 30, keywords: ['질병입원의료비'] },
    { idx: 31, keywords: ['질병통원의료비'] },
    { idx: 32, keywords: ['질병수술비'] },
    { idx: 33, keywords: ['1~5종수술', '질병1종수술'] },
    { idx: 34, keywords: ['상해수술비'] },
    { idx: 35, keywords: ['상해1~5종수술', '상해1종수술'] },
    { idx: 36, keywords: ['n대수술'] },
    { idx: 37, keywords: ['창상봉합'] },
    { idx: 38, keywords: ['질병입원일당'] },
    { idx: 39, keywords: ['상해입원일당'] },
    { idx: 40, keywords: ['교통상해입원'] },
    { idx: 41, keywords: ['상해간병'] },
    { idx: 42, keywords: ['질병간병'] },
    { idx: 43, keywords: ['교통사고처리지원금', '교통사고처리'] },
    { idx: 44, keywords: ['교통사고벌금', '벌금'] },
    { idx: 45, keywords: ['변호사선임'] },
    { idx: 46, keywords: ['자동차부상', '부상치료'] },
    { idx: 47, keywords: ['임플란트'] },
    { idx: 48, keywords: ['크라운'] },
    { idx: 49, keywords: ['가족일상배상', '일상배상'] },
    { idx: 50, keywords: ['화재벌금'] },
  ]
  for (const entry of map) {
    if (entry.keywords.some((kw) => normalizedName.includes(kw))) return entry.idx
  }
  return -1
}

function toManwon(amount: number): number {
  // If amount is in 원 (>= 10000 threshold), convert to 만원
  return amount >= 100000 ? Math.round(amount / 10000) : amount
}

function downloadAnalysisExcel(item: UploadItem) {
  const data = item.structuredAnalysis
  if (!data) return

  const customerName = data.customer?.name || item.customerName || '고객'
  const policies: any[] = Array.isArray(data.policies) ? data.policies
    : Array.isArray(data.contracts) ? data.contracts : []

  const numRows = 60
  const numCols = 16
  const matrix: (string | number | null)[][] = Array.from({ length: numRows }, () => Array(numCols).fill(null))

  // Row 2: 고객명 헤더
  matrix[1][1] = customerName
  matrix[1][4] = '님'
  matrix[1][5] = '내 보험 바로 알기 보장분석표'

  // Row 4: 컬럼 헤더
  matrix[3][1] = 'NO.'
  matrix[3][4] = '(단위 : 만원)'
  for (let i = 0; i < 11; i++) matrix[3][5 + i] = i + 1

  // Row 5~9: 보험 정보 라벨
  const POLICY_LABELS = [
    '보  험  회  사',
    '상   품   명',
    '계   약   일',
    '납 입 기 간 & 보 장 기 간',
    '납 입 보 험 료',
  ]
  POLICY_LABELS.forEach((label, i) => { matrix[4 + i][1] = label })

  // Row 10~60: 담보 라벨 구조
  COVERAGE_STRUCTURE.forEach((row, i) => {
    const idx = 9 + i
    if (row.b) matrix[idx][1] = row.b
    if (row.c) matrix[idx][2] = row.c
    matrix[idx][3] = row.d
  })

  // 담보 금액 그리드 (51행 × 11열)
  const amountGrid: number[][] = Array.from({ length: 51 }, () => Array(11).fill(0))

  policies.slice(0, 11).forEach((policy: any, pi: number) => {
    matrix[4][5 + pi] = policy.company || ''
    matrix[5][5 + pi] = policy.product_name || policy.product || ''
    matrix[6][5 + pi] = policy.start_date || ''
    matrix[7][5 + pi] = policy.payment_period || ''
    const prem = Number(policy.monthly_premium || policy.premium || 0)
    matrix[8][5 + pi] = prem ? toManwon(prem) : null

    const coverages: any[] = Array.isArray(policy.coverages) ? policy.coverages : []
    coverages.forEach((cov: any) => {
      const name = String(cov.coverage_name || cov.name || '').toLowerCase().replace(/[\s\-_·]/g, '')
      const amount = Number(cov.amount || cov.coverage_amount || 0)
      if (!amount) return
      const ri = findCoverageRowIndex(name)
      if (ri >= 0 && ri < 51) amountGrid[ri][pi] += toManwon(amount)
    })
  })

  // 합계보장(E열) + 각 보험별 금액(F~P열) 채우기
  const hasAnyCoverage = amountGrid.some((row) => row.some((v) => v > 0))
  amountGrid.forEach((row, ri) => {
    const total = row.reduce((s, v) => s + v, 0)
    matrix[9 + ri][4] = total || null
    row.forEach((v, pi) => { matrix[9 + ri][5 + pi] = v || null })
  })

  // 폴백: coverages가 모두 비어 있으면 coverage_summary로 E열 합계만 채움
  if (!hasAnyCoverage && data.coverage_summary) {
    const cs = data.coverage_summary
    const summaryMap: { idx: number; value: number }[] = [
      { idx: 3, value: Number(cs.cancer) || 0 },         // 일반암
      { idx: 4, value: Number(cs.similar_cancer) || 0 }, // 유사암/소액암
      { idx: 10, value: Number(cs.brain_vascular) || 0 }, // 뇌혈관질환 (대표)
      { idx: 13, value: Number(cs.ischemic_heart) || 0 }, // 급성심근경색 (대표)
      { idx: 32, value: Number(cs.disease_surgery) || 0 }, // 질병수술비
      { idx: 34, value: Number(cs.injury_surgery) || 0 }, // 상해수술비
    ]
    summaryMap.forEach(({ idx, value }) => {
      if (value > 0) matrix[9 + idx][4] = value
    })
  }

  // 납입보험료 합계 (E9)
  const totalPrem = policies.slice(0, 11).reduce((s: number, p: any) => {
    const prem = Number(p.monthly_premium || p.premium || 0)
    return s + (prem ? toManwon(prem) : 0)
  }, 0)
  matrix[8][4] = totalPrem || null

  const ws = XLSX.utils.aoa_to_sheet(matrix)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, customerName.slice(0, 31))
  XLSX.writeFile(wb, `${customerName}_보장분석표.xlsx`)
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
