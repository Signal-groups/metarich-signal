// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// card-builder.ts — 모바일 명함 HTML 생성기 (직접 관리. Codex 수정 금지)
// SLICE 앱 스타일: 사진배치 3종 × 배경 8종 × 연락처 행 구조
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { AgentInfo, BrandingState, CardPhotoPosition } from './types'

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

const CARD_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Pretendard Variable','Pretendard',-apple-system,sans-serif;word-break:keep-all;overflow-x:hidden;min-height:100vh;display:flex;flex-direction:column}
a{text-decoration:none;color:inherit}
.card-wrap{max-width:420px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;padding-bottom:84px}
/* ── 사진 영역 ── */
.photo-top{width:100%;height:260px;overflow:hidden;position:relative;flex-shrink:0}
.photo-top img{width:100%;height:100%;object-fit:cover;object-position:top}
.photo-circle-wrap{display:flex;justify-content:center;padding:32px 24px 0}
.photo-circle{width:100px;height:100px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,.3);flex-shrink:0}
.photo-circle img{width:100%;height:100%;object-fit:cover}
.photo-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px}
/* ── 레이아웃 right ── */
.layout-right{display:flex;gap:0;min-height:260px}
.layout-right .photo-side{width:140px;flex-shrink:0;overflow:hidden}
.layout-right .photo-side img{width:100%;height:100%;object-fit:cover;object-position:top}
.layout-right .info-side{flex:1;padding:24px 18px}
/* ── 정보 카드 ── */
.info-card{padding:20px 20px 16px;flex:1}
.name{font-size:26px;font-weight:900;letter-spacing:-.02em;margin-bottom:4px}
.title-row{font-size:13px;opacity:.7;margin-bottom:12px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:0}
.tag{font-size:11px;font-weight:700;padding:4px 10px;border-radius:100px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2)}
/* ── 연락처 행 ── */
.contact-block{background:#fff;border-radius:16px 16px 0 0;margin-top:auto;padding:8px 0}
.contact-row{display:flex;align-items:center;min-height:52px;padding:0 20px;border-bottom:1px solid #f1f5f9}
.contact-row:last-child{border-bottom:none}
.contact-label{font-size:12px;font-weight:700;color:#94a3b8;width:56px;flex-shrink:0}
.contact-value{font-size:13px;font-weight:600;color:#1e293b;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.contact-actions{display:flex;gap:6px;flex-shrink:0}
.ca{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;background:#f1f5f9;text-decoration:none}
/* ── 강점 소개 ── */
.strengths{background:#fff;padding:18px 20px;border-top:1px solid #f1f5f9}
.str-title{font-size:13px;font-weight:900;color:#0f172a;margin-bottom:12px}
.str-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.str-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;font-size:12px;font-weight:700;color:#334155}
/* ── 하단 고정 CTA ── */
.bottom-cta{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:420px;display:flex;gap:8px;padding:10px 16px;background:rgba(255,255,255,.97);backdrop-filter:blur(10px);border-top:1px solid #e2e8f0;z-index:100}
.cta-call{flex:1;padding:13px;border-radius:10px;font-size:14px;font-weight:800;text-align:center;text-decoration:none;display:block}
.cta-kakao{background:#FEE500;color:#1e293b}
`

function photoSection(info: AgentInfo, pos: CardPhotoPosition, isDark: boolean): string {
  const imgSrc = info.profileImg ? esc(info.profileImg) : ''
  const placeholder = `<div class="photo-placeholder">👤</div>`

  if (pos === 'top') {
    return `<div class="photo-top">
      ${imgSrc ? `<img src="${imgSrc}" alt="${esc(info.name)}">` : placeholder}
    </div>`
  }
  if (pos === 'circle') {
    return `<div class="photo-circle-wrap">
      <div class="photo-circle">
        ${imgSrc ? `<img src="${imgSrc}" alt="${esc(info.name)}">` : placeholder}
      </div>
    </div>`
  }
  // right
  return `<div class="layout-right">
    <div class="photo-side">
      ${imgSrc ? `<img src="${imgSrc}" alt="${esc(info.name)}">` : placeholder}
    </div>
    <div class="info-side" style="color:${isDark?'#fff':'#0f172a'}">
      <p class="name">${esc(info.name || '설계사 이름')}</p>
      <p class="title-row">${esc(info.title || '재무설계사')} · ${esc(info.company || '소속')}</p>
      <div class="tags">
        ${info.consultFields.slice(0,3).map(f=>`<span class="tag">${esc(f)}</span>`).join('')}
      </div>
    </div>
  </div>`
}

function infoCard(info: AgentInfo, state: BrandingState, pos: CardPhotoPosition): string {
  const isDark = state.cardBg !== '#f8fafc'
  const textColor = isDark ? '#fff' : '#0f172a'
  const tagBg = isDark ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.06)'
  const tagBorder = isDark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.1)'

  if (pos === 'right') return '' // 이미 layout-right에 포함

  return `<div class="info-card" style="color:${textColor}">
    <p class="name" contenteditable="true">${esc(info.name || '설계사 이름')}</p>
    <p class="title-row" contenteditable="true">${esc(info.title || '재무설계사')} · ${esc(info.company || '소속 회사')}</p>
    <div class="tags">
      ${state.cardTags.map(t=>`<span class="tag" style="background:${tagBg};border:1px solid ${tagBorder}" contenteditable="true">${esc(t)}</span>`).join('')}
    </div>
  </div>`
}

function contactBlock(info: AgentInfo, state: BrandingState): string {
  const rows: string[] = []

  const row = (label: string, value: string, ...actions: string[]) =>
    `<div class="contact-row">
      <span class="contact-label">${label}</span>
      <span class="contact-value" contenteditable="true">${esc(value)}</span>
      <div class="contact-actions">${actions.join('')}</div>
    </div>`

  const ca = (href: string, icon: string) =>
    href ? `<a href="${esc(href)}" class="ca">${icon}</a>` : ''

  if (info.phone) {
    rows.push(row('휴대전화', info.phone,
      ca(`tel:${info.phone}`, '📞'),
      ca(info.kakaoUrl, '💬'),
      ca(`sms:${info.phone}`, '💌')))
  }
  if (state.cardTel2) {
    rows.push(row('유선전화', state.cardTel2, ca(`tel:${state.cardTel2}`, '☎')))
  }
  if (info.email) {
    rows.push(row('이메일', info.email, ca(`mailto:${info.email}`, '✉')))
  }
  const web = state.cardWebUrl || info.websiteUrl
  if (web) {
    rows.push(row('홈페이지', web.replace(/^https?:\/\//, ''), ca(web, '🌐')))
  }
  const addr = state.cardAddress || info.address
  if (addr) {
    rows.push(row('주소', addr))
  }

  if (!rows.length) {
    rows.push(row('휴대전화', '010-0000-0000',
      `<span class="ca">📞</span>`, `<span class="ca">💬</span>`))
  }

  return `<div class="contact-block">${rows.join('')}</div>`
}

function strengthsSection(info: AgentInfo): string {
  const items = info.consultFields.length
    ? info.consultFields
    : ['보장분석', '보험 리모델링', '실손보험 점검', '연금 상담']

  return `<div class="strengths">
    <p class="str-title" contenteditable="true">전문 상담 분야</p>
    <div class="str-grid">
      ${items.slice(0,4).map(f=>`<div class="str-item" contenteditable="true">${esc(f)}</div>`).join('')}
    </div>
  </div>`
}

function bottomCta(info: AgentInfo): string {
  return `<div class="bottom-cta">
    ${info.phone ? `<a href="tel:${esc(info.phone)}" class="cta-call" style="background:#1a3a6e;color:#fff">📞 전화하기</a>` : ''}
    ${info.kakaoUrl ? `<a href="${esc(info.kakaoUrl)}" class="cta-call cta-kakao">💬 카카오톡</a>` : ''}
  </div>`
}

export function genCardHtml(state: BrandingState): string {
  const info = state.agentInfo
  const pos = state.cardPhotoPos
  const isDark = state.cardBg !== '#f8fafc'

  const photo = photoSection(info, pos, isDark)
  const info_card = infoCard(info, state, pos)
  const contact = contactBlock(info, state)
  const strengths = strengthsSection(info)
  const cta = state.cardShowBottomCta ? bottomCta(info) : ''

  return `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(info.name || '디지털 명함')} | ${esc(info.company || '보험')}</title>
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet">
<style>${CARD_CSS}</style>
</head><body style="background:${esc(state.cardBg)}">
<div class="card-wrap">
${photo}
${info_card}
${contact}
${strengths}
</div>
${cta}
</body></html>`
}
