'use client'

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getBranch, getDepartment, isApprovedUser, normalizeRole } from '../../../lib/roles'

type OutputMode = 'instagram' | 'dm'
type ImagePosition = 'top' | 'center' | 'bottom'
type FontKey = 'pretendard' | 'serif' | 'bold' | 'round'
type TeamSetting = { key: string; value: string }

const MODES: Record<OutputMode, { label: string; desc: string; width: number; height: number }> = {
  instagram: { label: '인스타그램', desc: '4:5 · 1080×1350', width: 1080, height: 1350 },
  dm: { label: '고객 DM', desc: '9:16 · 1080×1920', width: 1080, height: 1920 },
}

const FONT_MAP: Record<FontKey, string> = {
  pretendard: '"Pretendard Variable", "Noto Sans KR", sans-serif',
  serif: '"Noto Serif KR", "Nanum Myeongjo", serif',
  bold: '"Black Han Sans", "Pretendard Variable", sans-serif',
  round: '"NanumSquareRound", "Pretendard Variable", sans-serif',
}

const COLOR_PRESETS = [
  { name: '보라', header: '#5b21b6', footer: '#4c1d95', text: '#ffffff', accent: '#a78bfa' },
  { name: '골드', header: '#e8a832', footer: '#1a1a1a', text: '#ffffff', accent: '#f4c96b' },
  { name: '그린', header: '#2f855a', footer: '#1f513c', text: '#ffffff', accent: '#8fd4ad' },
  { name: '블루', header: '#1d4ed8', footer: '#172554', text: '#ffffff', accent: '#93c5fd' },
  { name: '핑크', header: '#db2777', footer: '#831843', text: '#ffffff', accent: '#f9a8d4' },
  { name: '화이트', header: '#ffffff', footer: '#ffffff', text: '#1f2937', accent: '#7c3aed' },
  { name: '블랙', header: '#171717', footer: '#171717', text: '#ffffff', accent: '#e8a832' },
]

const ADMIN_IMAGE_KEYS = ['content_studio_admin_image_1', 'content_studio_admin_image_2']
const ADMIN_IMAGE_EMAILS = ['jinwoo8506@gmail.com', 'jw20371035@gmail.com']

const DEFAULT_FORM = {
  brand: '메타리치 시그널그룹',
  company: '소속 입력',
  name: '',
  phone: '',
  topText: '{{brand}}\n{{company}}',
  bottomText: '보험 전문가 {{name}}  ☎ {{phone}}',
  headerBg: '#5b21b6',
  footerBg: '#4c1d95',
  topTextColor: '#ffffff',
  bottomTextColor: '#ffffff',
  accentColor: '#a78bfa',
  topFontSize: 42,
  bottomFontSize: 44,
  topAreaHeight: 150,
  bottomAreaHeight: 150,
  font: 'pretendard' as FontKey,
  imagePosition: 'center' as ImagePosition,
  mode: 'instagram' as OutputMode,
}

function formatPhone(value: string) {
  const digits = value.replace(/[^\d]/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function replaceVariables(text: string, form: typeof DEFAULT_FORM) {
  return text
    .replace(/\{\{brand\}\}/g, form.brand || '브랜드')
    .replace(/\{\{company\}\}/g, form.company || '소속')
    .replace(/\{\{name\}\}/g, form.name || '담당자')
    .replace(/\{\{phone\}\}/g, form.phone || '010-0000-0000')
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function readImageFile(file: File, callback: (value: string) => void) {
  const reader = new FileReader()
  reader.onload = () => callback(String(reader.result || ''))
  reader.readAsDataURL(file)
}

function drawImageContain(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, background = '#ffffff') {
  const scale = Math.min(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  ctx.fillStyle = background
  ctx.fillRect(x, y, width, height)
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startSize: number, minSize: number, font: string, weight = 900) {
  let size = startSize
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${font}`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 2
  }
  return size
}

function drawMultilineText(ctx: CanvasRenderingContext2D, text: string, x: number, centerY: number, maxWidth: number, size: number, color: string, font: string) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const lineHeight = size * 1.18
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  lines.forEach((line, index) => {
    const fitted = fitText(ctx, line, maxWidth, size, 18, font, 900)
    ctx.font = `900 ${fitted}px ${font}`
    ctx.fillText(line, x, startY + index * lineHeight)
  })
}

export default function ContentStudioPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [canManageAdminImages, setCanManageAdminImages] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [contentImage, setContentImage] = useState('')
  const [adminImages, setAdminImages] = useState<string[]>(['', ''])
  const [activeAdminImageIndex, setActiveAdminImageIndex] = useState<number | null>(null)
  const [previewImage, setPreviewImage] = useState('')
  const [copied, setCopied] = useState('')
  const [dragging, setDragging] = useState(false)
  const [adminDragging, setAdminDragging] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setChecking(false)
        return
      }

      const { data } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle()
      const user = { ...session.user, ...(data || {}) }
      const email = String(session.user.email || data?.email || '').toLowerCase()
      setAllowed(isApprovedUser(user))
      setCanManageAdminImages(normalizeRole(user) === 'master' || ADMIN_IMAGE_EMAILS.includes(email))
      setForm((prev) => ({
        ...prev,
        brand: data?.brand || '메타리치 시그널그룹',
        company: getBranch(data) || getDepartment(data) || data?.company || data?.department || '메타리치 시그널그룹',
        name: data?.name || session.user.email?.split('@')[0] || '',
        phone: formatPhone(data?.phone || ''),
      }))

      const { data: imageSettings } = await supabase
        .from('team_settings')
        .select('key, value')
        .in('key', ADMIN_IMAGE_KEYS)
      if (imageSettings) {
        const settings = imageSettings as TeamSetting[]
        setAdminImages(ADMIN_IMAGE_KEYS.map((key) => settings.find((item) => item.key === key)?.value || ''))
      }

      setChecking(false)
    }).catch(async () => {
      await supabase.auth.signOut().catch(() => {})
      setChecking(false)
      router.replace(`/login?redirectTo=${encodeURIComponent(window.location.pathname)}`)
    })
  }, [router])

  const output = MODES[form.mode]
  const topPreview = useMemo(() => replaceVariables(form.topText, form), [form])
  const bottomPreview = useMemo(() => replaceVariables(form.bottomText, form), [form])

  const draw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = output.width
    canvas.height = output.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const image = contentImage ? await loadImage(contentImage).catch(() => null) : null
    const font = FONT_MAP[form.font]
    const contentTop = form.topAreaHeight
    const contentHeight = output.height - form.topAreaHeight - form.bottomAreaHeight
    const footerTop = output.height - form.bottomAreaHeight

    ctx.clearRect(0, 0, output.width, output.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, output.width, output.height)

    ctx.fillStyle = form.headerBg
    ctx.fillRect(0, 0, output.width, form.topAreaHeight)
    ctx.fillStyle = form.accentColor
    ctx.fillRect(0, form.topAreaHeight - 8, output.width, 8)
    drawMultilineText(ctx, topPreview, output.width / 2, form.topAreaHeight / 2, output.width - 96, form.topFontSize, form.topTextColor, font)

    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, contentTop, output.width, contentHeight)
    if (image) {
      const imageSize = Math.min(output.width, contentHeight)
      const imageY =
        form.imagePosition === 'top'
          ? contentTop
          : form.imagePosition === 'bottom'
            ? contentTop + contentHeight - imageSize
            : contentTop + (contentHeight - imageSize) / 2
      drawImageContain(ctx, image, 0, imageY, output.width, imageSize)
    } else {
      ctx.fillStyle = '#faf5ff'
      ctx.fillRect(0, contentTop, output.width, contentHeight)
      ctx.fillStyle = '#6d28d9'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `900 44px ${font}`
      ctx.fillText('이미지를 드래그하거나 업로드하세요', output.width / 2, contentTop + contentHeight / 2 - 24)
      ctx.fillStyle = '#8b7aa7'
      ctx.font = `700 26px ${font}`
      ctx.fillText('정방형 이미지는 선택한 위치에 자동 배치됩니다', output.width / 2, contentTop + contentHeight / 2 + 28)
    }

    ctx.fillStyle = form.footerBg
    ctx.fillRect(0, footerTop, output.width, form.bottomAreaHeight)
    ctx.fillStyle = form.accentColor
    ctx.fillRect(0, footerTop, output.width, 8)
    drawMultilineText(ctx, bottomPreview, output.width / 2, footerTop + form.bottomAreaHeight / 2 + 4, output.width - 96, form.bottomFontSize, form.bottomTextColor, font)
  }, [bottomPreview, contentImage, form, output.height, output.width, topPreview])

  useEffect(() => { draw() }, [draw])

  const update = <K extends keyof typeof DEFAULT_FORM>(key: K, value: (typeof DEFAULT_FORM)[K]) => {
    setForm((prev) => ({ ...prev, [key]: key === 'phone' ? formatPhone(String(value)) : value }))
  }

  const handleFile = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return
    readImageFile(file, setContentImage)
  }

  const handleInputFile = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0])
  }

  const handleAdminFile = (index: number, file?: File) => {
    if (!canManageAdminImages) return
    if (!file || !file.type.startsWith('image/')) return
    readImageFile(file, (value) => {
      setAdminImages((prev) => prev.map((item, idx) => (idx === index ? value : item)))
      supabase
        .from('team_settings')
        .upsert({ key: ADMIN_IMAGE_KEYS[index], value }, { onConflict: 'key' })
        .then(({ error }) => {
          if (error) alert('관리자 이미지 저장에 실패했습니다.')
        })
    })
  }

  const handleAdminDrop = (index: number, event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setAdminDragging(null)
    handleAdminFile(index, event.dataTransfer.files?.[0])
  }

  const applyAdminImage = (index: number) => {
    if (!adminImages[index]) return
    if (activeAdminImageIndex === index) {
      setContentImage('')
      setActiveAdminImageIndex(null)
      return
    }
    setContentImage(adminImages[index])
    setActiveAdminImageIndex(index)
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  const copyText = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 1400)
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${form.mode === 'instagram' ? '인스타그램' : '고객DM'}-${form.name || 'advisor'}-${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const closePage = () => {
    if (window.opener) {
      window.close()
      return
    }

    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push('/dashboard')
  }

  if (checking) {
    return <div className="card card-p" style={{ padding: 80, textAlign: 'center', color: '#64748b' }}>사용 권한을 확인하고 있습니다.</div>
  }

  if (!allowed) {
    return (
      <div className="card card-p" style={{ padding: 44 }}>
        <div className="page-title">DM 및 정보 작성</div>
        <p className="page-subtitle" style={{ marginTop: 8 }}>승인된 설계사만 사용할 수 있는 이미지 제작 도구입니다.</p>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={closePage}
            style={{ marginBottom: 12, padding: '9px 14px' }}
          >
            ← 뒤로가기
          </button>
          <div className="page-title">DM 및 정보 작성</div>
          <div className="page-subtitle">공통 이미지를 올리고, 전달자별 문구와 디자인을 바꿔 PNG로 저장합니다.</div>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={() => copyText('top', topPreview)}>{copied === 'top' ? '복사됨' : '상단 문구 복사'}</button>
          <button className="btn btn-secondary" onClick={() => copyText('bottom', bottomPreview)}>{copied === 'bottom' ? '복사됨' : '하단 문구 복사'}</button>
          <button className="btn btn-primary" onClick={download}>PNG 저장</button>
        </div>
      </div>

      <div className="studio-grid">
        <section className="panel-stack">
          <div className="card card-p">
            <div className="card-title">관리자 업로드 이미지</div>
            <div className="admin-image-grid">
              {[0, 1].map((index) => (
                <div key={index} className={`admin-image-slot${activeAdminImageIndex === index ? ' selected' : ''}`}>
                  <div className={`active-chip${activeAdminImageIndex === index ? ' on' : ''}`}>
                    {activeAdminImageIndex === index ? '현재 사용중' : '비활성'}
                  </div>
                  {canManageAdminImages ? (
                    <label
                      className={`admin-drop${adminDragging === index ? ' active' : ''}${adminImages[index] ? ' has-image' : ''}`}
                      onDragOver={(event) => { event.preventDefault(); setAdminDragging(index) }}
                      onDragLeave={() => setAdminDragging(null)}
                      onDrop={(event) => handleAdminDrop(index, event)}
                    >
                      <input type="file" accept="image/*" onChange={(event) => handleAdminFile(index, event.target.files?.[0])} />
                      {adminImages[index] ? (
                        <img src={adminImages[index]} alt={`관리자 이미지 ${index + 1}`} />
                      ) : (
                        <span>관리자 이미지 {index + 1}<small>드래그해서 업로드</small></span>
                      )}
                    </label>
                  ) : adminImages[index] ? (
                    <button className="admin-preview" onClick={() => setPreviewImage(adminImages[index])}>
                      <img src={adminImages[index]} alt={`관리자 이미지 ${index + 1}`} />
                    </button>
                  ) : (
                    <div className="admin-empty">
                      <span>관리자 이미지 {index + 1}<small>준비중</small></span>
                    </div>
                  )}
                  <div className="admin-actions">
                    <button disabled={!adminImages[index]} onClick={() => setPreviewImage(adminImages[index])}>미리보기</button>
                    <button disabled={!adminImages[index]} onClick={() => applyAdminImage(index)}>
                      {activeAdminImageIndex === index ? '사용중' : '사용'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-p">
            <div className="card-title">이미지 업로드</div>
            <label
              className={`drop-zone${dragging ? ' active' : ''}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input type="file" accept="image/*" onChange={handleInputFile} />
              <span className="drop-plus">+</span>
              <span className="upload-text">이미지를 드래그하거나 선택하세요</span>
              <span className="upload-sub">정방형 이미지는 선택한 위치에 자동 배치됩니다.</span>
            </label>
          </div>

          <div className="card card-p">
            <div className="card-title">문구 설정</div>
            <div className="form-stack">
              <TextArea label="상단 문구" value={form.topText} onChange={(value) => update('topText', value)} />
              <TextArea label="하단 문구" value={form.bottomText} onChange={(value) => update('bottomText', value)} />
            </div>
            <div className="hint-box">
              변수는 문구에 복사해서 붙여넣을 수 있습니다.
              <div className="copy-row">
                {['{{brand}}', '{{company}}', '{{name}}', '{{phone}}'].map((item) => (
                  <button key={item} onClick={() => copyText(item, item)}>{copied === item ? '복사됨' : item}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="card card-p">
            <div className="card-title">기본 정보</div>
            <div className="form-stack">
              <Field label="{{brand}} 브랜드명" value={form.brand} onChange={(value) => update('brand', value)} />
              <Field label="{{company}} 소속" value={form.company} onChange={(value) => update('company', value)} />
              <Field label="{{name}} 이름" value={form.name} onChange={(value) => update('name', value)} />
              <Field label="{{phone}} 전화번호" value={form.phone} onChange={(value) => update('phone', value)} />
            </div>
          </div>
        </section>

        <section className="panel-stack">
          <div className="card card-p">
            <div className="card-title">디자인 설정</div>
            <div className="form-stack">
              <ControlGroup label="이미지 사이즈">
                <div className="segmented">
                  {(Object.keys(MODES) as OutputMode[]).map((mode) => (
                    <button key={mode} className={form.mode === mode ? 'active' : ''} onClick={() => update('mode', mode)}>
                      <b>{MODES[mode].label}</b>
                      <span>{MODES[mode].desc}</span>
                    </button>
                  ))}
                </div>
              </ControlGroup>

              <ControlGroup label="업로드 이미지 위치">
                <div className="segmented compact">
                  {[
                    ['top', '상단'],
                    ['center', '중앙'],
                    ['bottom', '하단'],
                  ].map(([value, label]) => (
                    <button key={value} className={form.imagePosition === value ? 'active' : ''} onClick={() => update('imagePosition', value as ImagePosition)}>{label}</button>
                  ))}
                </div>
              </ControlGroup>

              <ControlGroup label="전체 색상 스타일">
                <div className="swatches">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      title={preset.name}
                      className="swatch"
                      style={{ background: preset.header, borderColor: form.headerBg === preset.header && form.footerBg === preset.footer ? '#111827' : 'transparent' }}
                      onClick={() => setForm((prev) => ({ ...prev, headerBg: preset.header, footerBg: preset.footer, topTextColor: preset.text, bottomTextColor: preset.text, accentColor: preset.accent }))}
                    />
                  ))}
                </div>
              </ControlGroup>

              <div className="color-grid">
                <ColorField label="상단 배경" value={form.headerBg} onChange={(value) => update('headerBg', value)} />
                <ColorField label="하단 배경" value={form.footerBg} onChange={(value) => update('footerBg', value)} />
                <ColorField label="상단 글자" value={form.topTextColor} onChange={(value) => update('topTextColor', value)} />
                <ColorField label="하단 글자" value={form.bottomTextColor} onChange={(value) => update('bottomTextColor', value)} />
              </div>

              <label className="form-group" style={{ marginBottom: 0 }}>
                <span className="form-label">폰트</span>
                <select className="form-input" value={form.font} onChange={(event) => update('font', event.target.value as FontKey)}>
                  <option value="pretendard">Pretendard 깔끔한 기본</option>
                  <option value="serif">명조 고급형</option>
                  <option value="bold">강조형 굵은 제목</option>
                  <option value="round">둥근 친근형</option>
                </select>
              </label>

              <RangeField label="상단 글자 크기" value={form.topFontSize} min={22} max={80} onChange={(value) => update('topFontSize', value)} />
              <RangeField label="하단 글자 크기" value={form.bottomFontSize} min={22} max={80} onChange={(value) => update('bottomFontSize', value)} />
              <RangeField label="상단 영역 높이" value={form.topAreaHeight} min={90} max={320} onChange={(value) => update('topAreaHeight', value)} />
              <RangeField label="하단 영역 높이" value={form.bottomAreaHeight} min={90} max={360} onChange={(value) => update('bottomAreaHeight', value)} />
            </div>
          </div>
        </section>

        <section className="card card-p preview-card">
          <div className="flex justify-between items-center mb-16">
            <div>
              <div className="card-title" style={{ marginBottom: 3 }}>최종 발송 이미지</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{output.desc}</div>
            </div>
            <button className="copy-btn" onClick={download}>PNG</button>
          </div>
          <div className="canvas-shell" style={{ aspectRatio: `${output.width} / ${output.height}` }}>
            <canvas ref={canvasRef} />
          </div>
        </section>
      </div>

      {previewImage && (
        <div className="image-modal" onClick={() => setPreviewImage('')}>
          <div className="image-modal-inner" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setPreviewImage('')}>닫기</button>
            <img src={previewImage} alt="관리자 업로드 이미지 확대 보기" />
          </div>
        </div>
      )}

      <style jsx>{`
        .studio-grid {
          display: grid;
          grid-template-columns: minmax(300px, 360px) minmax(300px, 360px) minmax(320px, 520px);
          gap: 16px;
          align-items: start;
        }
        .panel-stack { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .form-stack { display: flex; flex-direction: column; gap: 13px; }
        .drop-zone {
          min-height: 178px;
          border: 2px dashed #d8b4fe;
          border-radius: 16px;
          background: #faf5ff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          text-align: center;
          transition: all .2s;
        }
        .drop-zone.active { border-color: #6d28d9; background: #f3e8ff; transform: translateY(-1px); }
        .drop-zone input { display: none; }
        .drop-plus { font-size: 34px; line-height: 1; font-weight: 900; color: #6d28d9; }
        .admin-image-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .admin-image-slot {
          min-width: 0;
          border: 2px solid transparent;
          border-radius: 18px;
          padding: 8px;
          transition: all .2s;
        }
        .admin-image-slot.selected {
          border-color: #6d28d9;
          background: #faf5ff;
          box-shadow: 0 8px 20px rgba(109, 40, 217, .12);
        }
        .active-chip {
          margin-bottom: 7px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #94a3b8;
          padding: 5px 8px;
          text-align: center;
          font-size: 11px;
          font-weight: 900;
        }
        .active-chip.on {
          background: #ede9fe;
          color: #6d28d9;
        }
        .admin-drop,
        .admin-preview,
        .admin-empty {
          display: flex;
          width: 100%;
          aspect-ratio: 1 / 1;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid #e9d5ff;
          border-radius: 14px;
          background: #faf5ff;
          color: #6d28d9;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: all .2s;
        }
        .admin-drop input { display: none; }
        .admin-drop.active { border-color: #6d28d9; background: #f3e8ff; transform: translateY(-1px); }
        .admin-drop.has-image { background: #fff; }
        .admin-drop img { width: 100%; height: 100%; object-fit: cover; }
        .admin-drop span,
        .admin-empty span {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .admin-drop small,
        .admin-empty small {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 700;
        }
        .admin-preview img { width: 100%; height: 100%; object-fit: cover; }
        .admin-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-top: 8px;
        }
        .admin-actions button {
          border: 1px solid #e5e7eb;
          border-radius: 9px;
          background: #fff;
          color: #475569;
          padding: 7px 0;
          text-align: center;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .admin-actions button:disabled { opacity: .45; cursor: not-allowed; }
        .admin-image-slot.selected .admin-actions button:last-child {
          border-color: #6d28d9;
          background: #6d28d9;
          color: #fff;
        }
        .image-modal {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(15, 23, 42, .72);
          backdrop-filter: blur(8px);
        }
        .image-modal-inner {
          position: relative;
          max-width: min(92vw, 760px);
          max-height: 88vh;
          border-radius: 18px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 24px 70px rgba(0,0,0,.32);
        }
        .image-modal-inner img {
          display: block;
          max-width: 100%;
          max-height: 88vh;
          object-fit: contain;
        }
        .modal-close {
          position: absolute;
          right: 12px;
          top: 12px;
          border: none;
          border-radius: 999px;
          background: rgba(17, 24, 39, .82);
          color: #fff;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }
        .segmented { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .segmented.compact { grid-template-columns: repeat(3, 1fr); }
        .segmented button {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          padding: 11px 10px;
          color: #111827;
          cursor: pointer;
          font-weight: 900;
        }
        .segmented button span { display: block; margin-top: 3px; font-size: 11px; color: #64748b; font-weight: 700; }
        .segmented button.active { border-color: #e8a832; background: #fff7e6; color: #d4922a; }
        .swatches { display: flex; flex-wrap: wrap; gap: 9px; }
        .swatch {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 3px solid transparent;
          cursor: pointer;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,.08);
        }
        .color-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .hint-box {
          margin-top: 14px;
          border-radius: 14px;
          padding: 14px;
          background: #faf5ff;
          color: #6b5a7d;
          font-size: 12px;
          line-height: 1.65;
        }
        .copy-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .copy-row button {
          border: 1px solid #e9d5ff;
          background: #fff;
          color: #6d28d9;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .preview-card { max-width: 560px; }
        .canvas-shell {
          width: 100%;
          overflow: hidden;
          border-radius: 14px;
          background: #fff;
          border: 1px solid #e8edf3;
          box-shadow: 0 10px 28px rgba(76, 29, 149, .12);
        }
        .canvas-shell canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
        @media (max-width: 1220px) {
          .studio-grid { grid-template-columns: 1fr 1fr; }
          .preview-card { grid-column: 1 / -1; max-width: 560px; }
        }
        @media (max-width: 760px) {
          .studio-grid { grid-template-columns: 1fr; }
          .preview-card { max-width: none; }
        }
      `}</style>
    </>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="form-group" style={{ marginBottom: 0 }}>
      <span className="form-label">{label}</span>
      <input className="form-input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="form-group" style={{ marginBottom: 0 }}>
      <span className="form-label">{label}</span>
      <textarea className="form-input" value={value} onChange={(event) => onChange(event.target.value)} rows={3} style={{ resize: 'vertical', lineHeight: 1.55 }} />
    </label>
  )
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="form-label">{label}</div>
      {children}
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="form-group" style={{ marginBottom: 0 }}>
      <span className="form-label">{label}</span>
      <input className="form-input" type="color" value={value} onChange={(event) => onChange(event.target.value)} style={{ height: 42, padding: 6 }} />
    </label>
  )
}

function RangeField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="form-group" style={{ marginBottom: 0 }}>
      <span className="form-label">{label}: {value}px</span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ width: '100%', accentColor: '#7c3aed' }} />
    </label>
  )
}
