'use client'

import type { ChangeEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, Copy, Download, Heart, ImageIcon, RefreshCw, Sparkles, Star, Sun } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import {
  anniversaryTemplates,
  healthTipPool,
  quotePool,
  starFortunes,
  zodiacFortunes,
  type DmContentType,
} from '../../../lib/dmCardContent'

type TabKey = 'fortune' | 'anniversary' | 'quote' | 'health'

const WIDTH = 1080
const HEIGHT = 1350

const tabs: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: 'fortune', label: '오늘의 운세', icon: <Sparkles size={16} /> },
  { key: 'anniversary', label: '고객 기념일', icon: <CalendarDays size={16} /> },
  { key: 'quote', label: '오늘의 명언', icon: <Star size={16} /> },
  { key: 'health', label: '건강 정보', icon: <Heart size={16} /> },
]

const themeColors = [
  { name: '네이비', value: '#1A2744' },
  { name: '골드', value: '#C9A96E' },
  { name: '그린', value: '#2f855a' },
  { name: '블루', value: '#1f5597' },
  { name: '로즈', value: '#d9467d' },
  { name: '차콜', value: '#2d3748' },
]

function todayIndex(length: number, salt = 0) {
  const now = new Date()
  return (now.getFullYear() + now.getMonth() + now.getDate() + salt) % Math.max(length, 1)
}

function readImage(file: File, callback: (value: string) => void) {
  const reader = new FileReader()
  reader.onload = () => callback(String(reader.result || ''))
  reader.readAsDataURL(file)
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const characters = text.split('')
  const lines: string[] = []
  let line = ''

  characters.forEach((char) => {
    const next = line + char
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line.trim())
      line = char
    } else {
      line = next
    }
  })

  if (line) lines.push(line.trim())
  return lines
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  drawRoundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = color
  ctx.fill()
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number, opacity: number) {
  const scale = Math.max(w / image.width, h / image.height)
  const drawW = image.width * scale
  const drawH = image.height * scale
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.drawImage(image, x + (w - drawW) / 2, y + (h - drawH) / 2, drawW, drawH)
  ctx.restore()
}

function usageKey(userId: string, type: DmContentType) {
  return `dm-content-usage:${userId}:${type}`
}

function getLocalUsed(userId: string, type: DmContentType) {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(usageKey(userId, type)) || '[]') as string[]
  } catch {
    return []
  }
}

function setLocalUsed(userId: string, type: DmContentType, ids: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(usageKey(userId, type), JSON.stringify(ids.slice(-120)))
}

function pickUnused<T extends { id: string }>(pool: T[], userId: string, type: DmContentType, seed = 0) {
  const used = getLocalUsed(userId, type)
  const candidates = pool.filter((item) => !used.includes(item.id))
  const list = candidates.length ? candidates : pool
  return list[todayIndex(list.length, seed)]
}

export default function DmCardsPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const backHref = pathname.startsWith('/dm') ? '/dm' : '/crm/dm'
  const initialTab = (searchParams.get('tab') as TabKey) || 'fortune'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [checking, setChecking] = useState(true)
  const [userId, setUserId] = useState('')
  const [advisorName, setAdvisorName] = useState('')
  const [advisorPhone, setAdvisorPhone] = useState('')
  const [brand, setBrand] = useState('보험의 기준')
  const [customerName, setCustomerName] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [zodiacKey, setZodiacKey] = useState(zodiacFortunes[todayIndex(zodiacFortunes.length)]?.key || 'rat')
  const [starKey, setStarKey] = useState(starFortunes[todayIndex(starFortunes.length, 3)]?.key || 'aries')
  const [anniversaryKey, setAnniversaryKey] = useState('birthday')
  const [backgroundImage, setBackgroundImage] = useState('')
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.28)
  const [accentColor, setAccentColor] = useState('#1A2744')
  const [quote, setQuote] = useState(quotePool[0])
  const [healthTip, setHealthTip] = useState(healthTipPool[0])
  const [previewUrl, setPreviewUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setChecking(false)
        return
      }

      const { data } = await supabase
        .from('users')
        .select('name, phone, brand, company, department')
        .eq('id', session.user.id)
        .maybeSingle()

      const uid = session.user.id
      const { data: usageLogs } = await supabase
        .from('dm_content_usage_logs')
        .select('content_type, content_id')
        .eq('user_id', uid)
        .limit(500)

      if (usageLogs?.length) {
        ;(['fortune', 'anniversary', 'quote', 'health'] as DmContentType[]).forEach((type) => {
          const remoteIds = usageLogs
            .filter((log) => log.content_type === type)
            .map((log) => String(log.content_id))
          if (!remoteIds.length) return
          const localIds = getLocalUsed(uid, type)
          setLocalUsed(uid, type, Array.from(new Set([...localIds, ...remoteIds])))
        })
      }

      setUserId(uid)
      setAdvisorName(data?.name || session.user.email?.split('@')[0] || '')
      setAdvisorPhone(data?.phone || '')
      setBrand(data?.brand || data?.company || data?.department || '보험의 기준')
      setQuote(pickUnused(quotePool, uid, 'quote'))
      setHealthTip(pickUnused(healthTipPool, uid, 'health'))
      setChecking(false)
    }).catch(() => setChecking(false))
  }, [])

  const selectedZodiac = useMemo(
    () => zodiacFortunes.find((item) => item.key === zodiacKey) || zodiacFortunes[0],
    [zodiacKey]
  )

  const selectedStar = useMemo(
    () => starFortunes.find((item) => item.key === starKey) || starFortunes[0],
    [starKey]
  )

  const selectedAnniversary = useMemo(
    () => anniversaryTemplates.find((item) => item.key === anniversaryKey) || anniversaryTemplates[0],
    [anniversaryKey]
  )

  const fortuneText = useMemo(() => {
    const zodiacText = selectedZodiac.texts[todayIndex(selectedZodiac.texts.length)]
    const starText = selectedStar.texts[todayIndex(selectedStar.texts.length, 5)]
    return {
      copy: `[오늘의 운세]\n${selectedZodiac.label}: ${zodiacText}\n${selectedStar.label}: ${starText}\n\n${brand} ${advisorName}${advisorPhone ? ` ${advisorPhone}` : ''}`,
      zodiacText,
      starText,
    }
  }, [advisorName, advisorPhone, brand, selectedStar, selectedZodiac])

  const anniversaryText = useMemo(() => {
    const name = customerName || '고객'
    const title = selectedAnniversary.title.replace(/\{\{name\}\}/g, name)
    const body = selectedAnniversary.body.replace(/\{\{name\}\}/g, name)
    return {
      title,
      body,
      copy: `${title}\n${body}\n\n${brand} ${advisorName}${advisorPhone ? ` ${advisorPhone}` : ''}`,
    }
  }, [advisorName, advisorPhone, brand, customerName, selectedAnniversary])

  const copyText = useMemo(() => {
    if (activeTab === 'fortune') return fortuneText.copy
    if (activeTab === 'anniversary') return anniversaryText.copy
    if (activeTab === 'quote') return `"${quote.text}"\n- ${quote.author}\n\n${brand} ${advisorName}${advisorPhone ? ` ${advisorPhone}` : ''}`
    return `${healthTip.text}\n출처: ${healthTip.source}\n\n${brand} ${advisorName}${advisorPhone ? ` ${advisorPhone}` : ''}`
  }, [activeTab, advisorName, advisorPhone, anniversaryText.copy, brand, fortuneText.copy, healthTip.source, healthTip.text, quote.author, quote.text])

  const recordUsage = useCallback(async (type: DmContentType, contentId: string, contentText: string) => {
    if (!userId) return
    const used = getLocalUsed(userId, type)
    setLocalUsed(userId, type, [...used.filter((id) => id !== contentId), contentId])

    await supabase.from('dm_content_usage_logs').insert({
      user_id: userId,
      content_type: type,
      content_id: contentId,
      content_text: contentText,
    }).then(() => undefined)
  }, [userId])

  const draw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = WIDTH
    canvas.height = HEIGHT

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bgImage = backgroundImage ? await loadImage(backgroundImage).catch(() => null) : null
    const activeAccent = activeTab === 'anniversary' ? selectedAnniversary.accent : accentColor

    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
    bg.addColorStop(0, '#f7fbff')
    bg.addColorStop(0.5, '#ffffff')
    bg.addColorStop(1, '#edf6ff')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    if (bgImage) drawCover(ctx, bgImage, 0, 0, WIDTH, HEIGHT, backgroundOpacity)

    ctx.fillStyle = 'rgba(255,255,255,0.80)'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    ctx.fillStyle = activeAccent
    ctx.fillRect(0, 0, WIDTH, 18)
    fillRoundRect(ctx, 72, 74, 936, 1200, 38, 'rgba(255,255,255,0.93)')
    ctx.strokeStyle = 'rgba(26,39,68,0.12)'
    ctx.lineWidth = 2
    drawRoundRect(ctx, 72, 74, 936, 1200, 38)
    ctx.stroke()

    ctx.fillStyle = activeAccent
    ctx.font = '900 34px "Pretendard Variable", "Noto Sans KR", sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(brand || '보험의 기준', 118, 132)

    ctx.fillStyle = '#64748b'
    ctx.font = '700 24px "Pretendard Variable", "Noto Sans KR", sans-serif'
    ctx.fillText(new Date().toLocaleDateString('ko-KR'), 118, 174)

    ctx.textAlign = 'right'
    ctx.fillStyle = '#0f172a'
    ctx.font = '900 28px "Pretendard Variable", "Noto Sans KR", sans-serif'
    ctx.fillText(advisorName || '담당자', 960, 132)
    ctx.fillStyle = '#475569'
    ctx.font = '700 22px "Pretendard Variable", "Noto Sans KR", sans-serif'
    ctx.fillText(advisorPhone || '문의 가능', 960, 170)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#0f172a'
    ctx.font = '900 58px "Pretendard Variable", "Noto Sans KR", sans-serif'

    if (activeTab === 'fortune') {
      ctx.fillText('오늘의 운세', WIDTH / 2, 280)
      ctx.font = '800 28px "Pretendard Variable", "Noto Sans KR", sans-serif'
      ctx.fillStyle = '#64748b'
      ctx.fillText('띠 운세와 별자리 운세를 함께 전해드립니다', WIDTH / 2, 330)

      const sections = [
        { eyebrow: '띠 운세', title: selectedZodiac.label, body: fortuneText.zodiacText, y: 430 },
        { eyebrow: '별자리 운세', title: selectedStar.label, body: fortuneText.starText, y: 760 },
      ]

      sections.forEach((section) => {
        fillRoundRect(ctx, 132, section.y, 816, 250, 30, '#f8fafc')
        ctx.fillStyle = activeAccent
        ctx.font = '900 25px "Pretendard Variable", "Noto Sans KR", sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(section.eyebrow, 176, section.y + 48)
        ctx.fillStyle = '#0f172a'
        ctx.font = '900 41px "Pretendard Variable", "Noto Sans KR", sans-serif'
        ctx.fillText(section.title, 176, section.y + 92)

        ctx.font = '700 31px "Pretendard Variable", "Noto Sans KR", sans-serif'
        ctx.fillStyle = '#243044'
        const lines = wrapText(ctx, section.body, 710).slice(0, 4)
        lines.forEach((line, index) => ctx.fillText(line, 176, section.y + 145 + index * 42))
      })
    }

    if (activeTab === 'anniversary') {
      ctx.fillText(anniversaryText.title, WIDTH / 2, 318)
      ctx.font = '800 34px "Pretendard Variable", "Noto Sans KR", sans-serif'
      ctx.fillStyle = '#475569'
      wrapText(ctx, anniversaryText.body, 760).slice(0, 4).forEach((line, index) => {
        ctx.fillText(line, WIDTH / 2, 430 + index * 48)
      })

      fillRoundRect(ctx, 190, 710, 700, 230, 40, 'rgba(248,250,252,0.92)')
      ctx.fillStyle = activeAccent
      ctx.font = '900 46px "Pretendard Variable", "Noto Sans KR", sans-serif'
      ctx.fillText(customerName || '고객님', WIDTH / 2, 790)
      ctx.fillStyle = '#243044'
      ctx.font = '800 30px "Pretendard Variable", "Noto Sans KR", sans-serif'
      ctx.fillText('건강하고 든든한 하루를 응원합니다', WIDTH / 2, 855)
    }

    if (activeTab === 'quote') {
      ctx.fillText('오늘의 명언', WIDTH / 2, 310)
      ctx.fillStyle = activeAccent
      ctx.font = '900 90px Georgia, serif'
      ctx.fillText('“', WIDTH / 2, 430)
      ctx.fillStyle = '#0f172a'
      ctx.font = '900 46px "Pretendard Variable", "Noto Sans KR", sans-serif'
      wrapText(ctx, quote.text, 720).slice(0, 4).forEach((line, index) => {
        ctx.fillText(line, WIDTH / 2, 520 + index * 62)
      })
      ctx.fillStyle = '#64748b'
      ctx.font = '800 28px "Pretendard Variable", "Noto Sans KR", sans-serif'
      ctx.fillText(`- ${quote.author}`, WIDTH / 2, 820)
    }

    if (activeTab === 'health') {
      ctx.fillText('오늘의 건강 정보', WIDTH / 2, 310)
      fillRoundRect(ctx, 160, 430, 760, 330, 38, '#f8fafc')
      ctx.fillStyle = activeAccent
      ctx.font = '900 44px "Pretendard Variable", "Noto Sans KR", sans-serif'
      ctx.fillText('건강 관리 체크', WIDTH / 2, 510)
      ctx.fillStyle = '#0f172a'
      ctx.font = '900 39px "Pretendard Variable", "Noto Sans KR", sans-serif'
      wrapText(ctx, healthTip.text, 650).slice(0, 5).forEach((line, index) => {
        ctx.fillText(line, WIDTH / 2, 600 + index * 50)
      })
      ctx.fillStyle = '#64748b'
      ctx.font = '800 24px "Pretendard Variable", "Noto Sans KR", sans-serif'
      ctx.fillText(healthTip.source, WIDTH / 2, 890)
    }

    ctx.textAlign = 'center'
    fillRoundRect(ctx, 190, 1100, 700, 82, 22, activeAccent)
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 30px "Pretendard Variable", "Noto Sans KR", sans-serif'
    ctx.fillText(`${brand || '보험의 기준'} · ${advisorName || '담당자'}`, WIDTH / 2, 1135)
    ctx.font = '800 24px "Pretendard Variable", "Noto Sans KR", sans-serif'
    ctx.fillText(advisorPhone || '문의 가능', WIDTH / 2, 1173)

    setPreviewUrl(canvas.toDataURL('image/png'))
  }, [
    accentColor,
    activeTab,
    advisorName,
    advisorPhone,
    anniversaryText.body,
    anniversaryText.title,
    backgroundImage,
    backgroundOpacity,
    brand,
    customerName,
    fortuneText.starText,
    fortuneText.zodiacText,
    healthTip.source,
    healthTip.text,
    quote.author,
    quote.text,
    selectedAnniversary.accent,
    selectedStar.label,
    selectedZodiac.label,
  ])

  useEffect(() => {
    draw()
  }, [draw])

  const refreshQuote = () => {
    if (!userId) return
    setQuote(pickUnused(quotePool, userId, 'quote', Math.floor(Math.random() * 1000)))
  }

  const refreshHealth = () => {
    if (!userId) return
    setHealthTip(pickUnused(healthTipPool, userId, 'health', Math.floor(Math.random() * 1000)))
  }

  const usageId = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (activeTab === 'quote') return quote.id
    if (activeTab === 'health') return healthTip.id
    if (activeTab === 'fortune') return `${zodiacKey}-${starKey}-${today}`
    return `${anniversaryKey}-${today}`
  }, [activeTab, anniversaryKey, healthTip.id, quote.id, starKey, zodiacKey])

  const onCopy = async () => {
    await navigator.clipboard.writeText(copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
    await recordUsage(activeTab, usageId, copyText)
  }

  const onDownload = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `고객DM-${tabs.find((tab) => tab.key === activeTab)?.label || '카드'}-${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    await recordUsage(activeTab, usageId, copyText)
  }

  const handleBackground = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    readImage(file, setBackgroundImage)
  }

  if (checking) {
    return <div className="card card-p" style={{ padding: 80, textAlign: 'center', color: '#64748b' }}>불러오는 중입니다.</div>
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Link href={backHref} className="link" style={{ marginBottom: 8, display: 'inline-block' }}>← 고객 DM</Link>
          <div className="page-title">고객 DM 카드 발송</div>
          <div className="page-subtitle">운세, 기념일, 명언, 건강 정보를 이미지 카드와 복사 문구로 바로 준비합니다.</div>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={onCopy}>
            <Copy size={15} /> {copied ? '복사 완료' : '문구 복사'}
          </button>
          <button className="btn btn-primary" onClick={onDownload}>
            <Download size={15} /> PNG 저장
          </button>
        </div>
      </div>

      <div className="dm-card-maker">
        <section className="card card-p dm-settings">
          <div className="tab-bar">
            {tabs.map((tab) => (
              <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="dm-form-grid">
            <label className="form-group">
              <span className="form-label">브랜드명</span>
              <input className="form-input" value={brand} onChange={(event) => setBrand(event.target.value)} />
            </label>
            <label className="form-group">
              <span className="form-label">담당자</span>
              <input className="form-input" value={advisorName} onChange={(event) => setAdvisorName(event.target.value)} />
            </label>
            <label className="form-group">
              <span className="form-label">전화번호</span>
              <input className="form-input" value={advisorPhone} onChange={(event) => setAdvisorPhone(event.target.value)} />
            </label>
            <label className="form-group">
              <span className="form-label">고객명</span>
              <input className="form-input" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="기념일 카드에 표시됩니다" />
            </label>
          </div>

          {activeTab === 'fortune' && (
            <div className="dm-section">
              <div className="dm-section-title"><Sun size={16} /> 운세 구성</div>
              <div className="dm-two">
                <label className="form-group">
                  <span className="form-label">상단 띠 운세</span>
                  <select className="form-input" value={zodiacKey} onChange={(event) => setZodiacKey(event.target.value)}>
                    {zodiacFortunes.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                </label>
                <label className="form-group">
                  <span className="form-label">하단 별자리 운세</span>
                  <select className="form-input" value={starKey} onChange={(event) => setStarKey(event.target.value)}>
                    {starFortunes.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'anniversary' && (
            <div className="dm-section">
              <div className="dm-section-title"><ImageIcon size={16} /> 기념일 배경 설정</div>
              <div className="dm-two">
                <label className="form-group">
                  <span className="form-label">기념일 종류</span>
                  <select className="form-input" value={anniversaryKey} onChange={(event) => setAnniversaryKey(event.target.value)}>
                    {anniversaryTemplates.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                </label>
                <label className="form-group">
                  <span className="form-label">배경 이미지</span>
                  <input className="form-input" type="file" accept="image/*" onChange={handleBackground} />
                </label>
              </div>
              <label className="form-group">
                <span className="form-label">배경 투명도 {Math.round(backgroundOpacity * 100)}%</span>
                <input className="dm-slider" type="range" min="0" max="0.65" step="0.01" value={backgroundOpacity} onChange={(event) => setBackgroundOpacity(Number(event.target.value))} />
              </label>
            </div>
          )}

          {(activeTab === 'quote' || activeTab === 'health') && (
            <div className="dm-section">
              <div className="dm-section-title">중복 방지 콘텐츠</div>
              <p className="dm-help">문구 복사 또는 PNG 저장을 누르면 로그인한 직원 기준으로 사용 이력이 기록되고, 다음 추천에서 우선 제외됩니다.</p>
              <button className="btn btn-secondary" onClick={activeTab === 'quote' ? refreshQuote : refreshHealth}>
                <RefreshCw size={15} /> 다른 내용 보기
              </button>
            </div>
          )}

          <div className="dm-section">
            <div className="dm-section-title">포인트 컬러</div>
            <div className="dm-colors">
              {themeColors.map((color) => (
                <button
                  key={color.value}
                  className={`dm-color ${accentColor === color.value ? 'active' : ''}`}
                  style={{ background: color.value }}
                  onClick={() => setAccentColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="dm-section">
            <div className="dm-section-title">복사용 문구</div>
            <pre className="dm-preview">{copyText}</pre>
          </div>
        </section>

        <section className="card card-p dm-preview-panel">
          <div className="card-title">미리보기</div>
          <div className="dm-canvas-wrap">
            {previewUrl ? <img src={previewUrl} alt="DM 카드 미리보기" /> : null}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </section>
      </div>

      <style jsx>{`
        .dm-card-maker {
          display: grid;
          grid-template-columns: minmax(360px, 0.95fr) minmax(360px, 1.05fr);
          gap: 16px;
          align-items: start;
        }
        .dm-settings {
          display: grid;
          gap: 16px;
        }
        .dm-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .dm-section {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
          background: #f8fafc;
        }
        .dm-section-title {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 12px;
        }
        .dm-two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .dm-help {
          font-size: 12px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 12px;
        }
        .dm-slider {
          width: 100%;
          accent-color: #1a2744;
        }
        .dm-colors {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .dm-color {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 3px solid #fff;
          box-shadow: 0 0 0 1px #cbd5e1;
          cursor: pointer;
        }
        .dm-color.active {
          box-shadow: 0 0 0 3px #0f172a;
        }
        .dm-preview-panel {
          position: sticky;
          top: 24px;
        }
        .dm-canvas-wrap {
          display: flex;
          justify-content: center;
          background: #edf2f7;
          border-radius: 18px;
          padding: 16px;
          overflow: hidden;
        }
        .dm-canvas-wrap img {
          width: min(100%, 420px);
          aspect-ratio: 4 / 5;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
          background: #fff;
        }
        @media (max-width: 980px) {
          .dm-card-maker {
            grid-template-columns: 1fr;
          }
          .dm-preview-panel {
            position: static;
          }
        }
        @media (max-width: 640px) {
          .dm-form-grid,
          .dm-two {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
