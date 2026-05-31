"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef, useCallback } from "react"

// ────────────────────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────────────────────
interface UserInfo {
  name: string; title: string; company: string; branch: string
  phone: string; email: string; kakaoUrl: string; consultUrl: string
  recruitUrl: string; blogUrl: string; instagramUrl: string
  youtubeUrl: string; cafeUrl: string; openchatUrl: string
  intro: string; fields: string; qualifications: string
  profileImg: string
}
type DeviceMode = "pc" | "tablet" | "mobile"
type TemplateCategory = "보험 전용" | "프리미엄" | "임팩트" | "전문/데이터" | "교육/전문" | "서비스" | "테크"

interface TemplateMeta {
  id: string
  name: string
  category: TemplateCategory
  style: string
  type: "insurance" | "external"
  file?: string         // external: /branding-templates/template-XX.html
  gen?: (u: UserInfo) => string  // insurance: 생성 함수
}

interface SavedPage { id: string; name: string; templateId: string; userInfo: UserInfo; savedAt: string }

// ────────────────────────────────────────────────────────────────
// 기본값
// ────────────────────────────────────────────────────────────────
const DEFAULT_USER: UserInfo = {
  name: "배진우", title: "AFPK 재무설계사", company: "메타리치 시그널그룹", branch: "",
  phone: "", email: "", kakaoUrl: "", consultUrl: "", recruitUrl: "",
  blogUrl: "", instagramUrl: "", youtubeUrl: "", cafeUrl: "", openchatUrl: "",
  intro: "보험의 기준", fields: "보장분석, 보험 리모델링, 실손보험 점검, 암·뇌·심장 보장 점검, 연금 상담",
  qualifications: "AFPK", profileImg: "",
}

const DEVICE_W: Record<DeviceMode, string> = { pc: "100%", tablet: "768px", mobile: "390px" }
const DEVICE_H: Record<DeviceMode, string> = { pc: "calc(100vh - 100px)", tablet: "900px", mobile: "750px" }

// ────────────────────────────────────────────────────────────────
// 공통 CSS
// ────────────────────────────────────────────────────────────────
const BASE = `*{margin:0;padding:0;box-sizing:border-box;}html{-webkit-text-size-adjust:100%;}body{font-family:'Pretendard','Noto Sans KR',system-ui,sans-serif;overflow-x:hidden;word-break:keep-all;}a{text-decoration:none;color:inherit;}img{max-width:100%;display:block;}`

// ────────────────────────────────────────────────────────────────
// 보험 전용 6개 템플릿 생성 함수
// ────────────────────────────────────────────────────────────────
function genCard(u: UserInfo): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${u.name} · ${u.company}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
<style>${BASE}
body{background:#f8fafc;color:#1e293b;}
.card{max-width:420px;margin:0 auto;background:#fff;min-height:100vh;padding-bottom:90px;}
.hero{background:linear-gradient(135deg,#1a3a6e,#2d5a9e);padding:48px 24px 36px;text-align:center;}
.av{width:88px;height:88px;border-radius:50%;border:3px solid rgba(255,255,255,.4);margin:0 auto 16px;object-fit:cover;background:#c7d2fe;display:flex;align-items:center;justify-content:center;font-size:36px;}
.nm{font-size:24px;font-weight:900;color:#fff;letter-spacing:-.02em;}
.tt{font-size:14px;color:rgba(255,255,255,.75);margin-top:6px;}
.cp{font-size:13px;color:rgba(255,255,255,.55);margin-top:4px;}
.bb{display:inline-block;background:rgba(212,175,55,.22);color:#d4af37;border:1px solid rgba(212,175,55,.4);padding:5px 14px;border-radius:100px;font-size:12px;font-weight:700;margin-top:12px;letter-spacing:.04em;}
.body{padding:24px 20px;}
.sc{font-size:11px;font-weight:800;color:#94a3b8;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;margin-top:20px;}
.ir{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;}
.ir:last-child{border:none;}.ii{width:32px;height:32px;border-radius:8px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.iv{font-size:14px;font-weight:600;color:#1e293b;}
.sg{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}
.sb{display:flex;align-items:center;justify-content:center;gap:6px;padding:13px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#334155;}
.sticky{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:420px;display:flex;gap:8px;padding:12px 16px;background:rgba(255,255,255,.97);backdrop-filter:blur(10px);border-top:1px solid #e2e8f0;z-index:100;}
.bp{flex:1;background:#1a3a6e;color:#fff;border:none;padding:14px;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;text-align:center;text-decoration:none;display:block;}
.bs{flex:1;background:transparent;color:#1a3a6e;border:2px solid #1a3a6e;padding:14px;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;text-align:center;text-decoration:none;display:block;}
</style></head><body>
<div class="card"><div class="hero">
${u.profileImg ? `<img class="av" src="${u.profileImg}" alt="${u.name}">` : `<div class="av">👤</div>`}
<p class="nm">${u.name}</p><p class="tt">${u.title}</p><p class="cp">${u.company}${u.branch ? ` · ${u.branch}` : ""}</p>
${u.intro ? `<span class="bb">${u.intro}</span>` : ""}
</div><div class="body">
${(u.phone || u.email) ? `<p class="sc">연락처</p>${u.phone ? `<div class="ir"><div class="ii">📞</div><a href="tel:${u.phone}" class="iv">${u.phone}</a></div>` : ""}${u.email ? `<div class="ir"><div class="ii">✉️</div><span class="iv">${u.email}</span></div>` : ""}` : ""}
${u.fields ? `<p class="sc">주요 상담 분야</p>${u.fields.split(",").map((f: string) => `<div class="ir"><div class="ii">✓</div><span class="iv">${f.trim()}</span></div>`).join("")}` : ""}
${[u.blogUrl,u.instagramUrl,u.youtubeUrl,u.cafeUrl].some(Boolean) ? `<p class="sc">채널</p><div class="sg">${u.blogUrl?`<a href="${u.blogUrl}" class="sb">📝 블로그</a>`:""}${u.instagramUrl?`<a href="${u.instagramUrl}" class="sb">📷 인스타</a>`:""}${u.youtubeUrl?`<a href="${u.youtubeUrl}" class="sb">▶ 유튜브</a>`:""}${u.cafeUrl?`<a href="${u.cafeUrl}" class="sb">☕ 카페</a>`:""}</div>` : ""}
</div></div>
<div class="sticky">${u.phone?`<a href="tel:${u.phone}" class="bp">📞 전화하기</a>`:""}${u.kakaoUrl?`<a href="${u.kakaoUrl}" class="bs">💬 카카오톡</a>`:""}</div>
<p style="display:none;">© 보험의 기준(배진우) · 메타리치 시그널그룹</p></body></html>`
}

function genConsult(u: UserInfo): string {
  const fields = u.fields ? u.fields.split(",") : []
  const icons = ["🛡","💊","🏥","🧬","💰","📋","🔍","💡"]
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>보험 무료 점검 | ${u.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
<style>${BASE}
body{background:#fff;color:#111827;}
.nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.95);backdrop-filter:blur(12px);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;}
.nav-n{font-size:15px;font-weight:900;color:#1a3a6e;}.nav-b{background:#2563eb;color:#fff;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;}
.hero{background:linear-gradient(160deg,#0b1e5f 0%,#1d4ed8 60%,#3b82f6 100%);padding:60px 24px 48px;text-align:center;}
.h-tag{display:inline-block;background:rgba(255,255,255,.15);color:rgba(255,255,255,.9);padding:6px 16px;border-radius:100px;font-size:12px;font-weight:700;letter-spacing:.08em;margin-bottom:20px;}
.h-title{font-family:'Noto Serif KR',serif;font-size:clamp(24px,6vw,36px);font-weight:700;color:#fff;line-height:1.4;margin-bottom:14px;}
.h-sub{font-size:15px;color:rgba(255,255,255,.75);line-height:1.8;margin-bottom:28px;max-width:320px;margin-left:auto;margin-right:auto;}
.h-btns{display:flex;flex-direction:column;gap:10px;max-width:300px;margin:0 auto;}
.bw{background:#fff;color:#1d4ed8;padding:16px;border-radius:10px;font-size:15px;font-weight:800;text-align:center;text-decoration:none;display:block;box-shadow:0 4px 16px rgba(0,0,0,.15);}
.bo{background:transparent;color:#fff;padding:14px;border-radius:10px;font-size:15px;font-weight:700;text-align:center;text-decoration:none;display:block;border:2px solid rgba(255,255,255,.4);}
.sec{padding:40px 20px;max-width:480px;margin:0 auto;}
.pb{background:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;border-radius:0 10px 10px 0;margin-bottom:10px;}
.pt{font-size:14px;font-weight:800;color:#dc2626;margin-bottom:4px;}.pd{font-size:13px;color:#6b7280;line-height:1.7;}
.fc{background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:10px;display:flex;align-items:flex-start;gap:12px;}
.fi{font-size:20px;flex-shrink:0;margin-top:2px;}.fn{font-size:14px;font-weight:800;color:#1e293b;}
.pc2{background:linear-gradient(135deg,#f0f4ff,#e8eeff);border-radius:16px;padding:24px;display:flex;gap:16px;align-items:center;margin-bottom:20px;}
.pi{width:72px;height:72px;border-radius:50%;object-fit:cover;background:#c7d2fe;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;}
.pn{font-size:18px;font-weight:900;color:#1a3a6e;}.pt2{font-size:13px;color:#475569;margin-top:3px;}
.pq{display:inline-block;background:#1a3a6e;color:#fff;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;margin-top:8px;}
.btn-p{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:#2563eb;color:#fff;text-decoration:none;}
.btn-s{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:transparent;color:#2563eb;border:2px solid #2563eb;text-decoration:none;}
.disc{font-size:11px;color:#9ca3af;line-height:1.8;padding:20px;text-align:center;}
</style></head><body>
<nav class="nav"><span class="nav-n">${u.intro || u.name}</span>${u.consultUrl?`<a href="${u.consultUrl}" class="nav-b">상담 신청</a>`:""}</nav>
<div class="hero"><span class="h-tag">무료 보험 점검 서비스</span>
<h1 class="h-title">내 보험,<br>지금 기준으로<br>다시 점검해보셨나요?</h1>
<p class="h-sub">보험은 가입보다 관리가 더 중요합니다.<br>지금 바로 무료로 확인해 드립니다.</p>
<div class="h-btns">${u.consultUrl?`<a href="${u.consultUrl}" class="bw">📋 무료 상담 신청하기</a>`:""}${u.kakaoUrl?`<a href="${u.kakaoUrl}" class="bo">💬 카카오톡 문의</a>`:""}</div>
</div>
<div class="sec">
<p style="font-size:12px;font-weight:800;color:#2563eb;letter-spacing:.1em;margin-bottom:10px;">이런 분께 꼭 필요합니다</p>
${["갱신형 보험이 많아 보험료 걱정이신 분","실손보험 세대가 바뀌었는지 모르는 분","보장 공백이 있는지 확인하고 싶은 분","보험료는 줄이고 보장은 늘리고 싶은 분"].map((t: string)=>`<div class="pb"><p class="pt">🔴 ${t}</p></div>`).join("")}
${fields.length?`<p style="font-size:18px;font-weight:900;color:#111827;margin:28px 0 6px;">주요 상담 분야</p><p style="font-size:14px;color:#6b7280;margin-bottom:20px;">전문적인 분석으로 최적의 보험을 설계합니다</p>${fields.map((f: string,i: number)=>`<div class="fc"><span class="fi">${icons[i%8]}</span><div><p class="fn">${f.trim()}</p></div></div>`).join("")}`:""}
<div class="pc2" style="margin-top:28px;">${u.profileImg?`<img class="pi" src="${u.profileImg}" alt="${u.name}">`:`<div class="pi">👤</div>`}<div><p class="pn">${u.name}</p><p class="pt2">${u.title} · ${u.company}</p>${u.qualifications?`<span class="pq">${u.qualifications}</span>`:""}</div></div>
${u.consultUrl?`<a href="${u.consultUrl}" class="btn-p">📋 무료 점검 신청하기</a>`:""}${u.kakaoUrl?`<a href="${u.kakaoUrl}" class="btn-s">💬 카카오톡 문의</a>`:""}${u.phone?`<a href="tel:${u.phone}" class="btn-s">📞 전화 상담</a>`:""}
<p class="disc">본 페이지는 보험 상담 신청을 위한 안내 페이지이며, 구체적인 보장 내용과 보험료는 개인의 상황, 가입 조건, 보험회사 인수 기준에 따라 달라질 수 있습니다.<br><br>© 보험의 기준(배진우) · 메타리치 시그널그룹</p>
</div></body></html>`
}

function genRecruiting(u: UserInfo): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>설계사 모집 | ${u.company}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&family=Bebas+Neue&display=swap" rel="stylesheet">
<style>${BASE}
body{background:#fefcf7;color:#1a1714;}
.hero{background:linear-gradient(135deg,#6d28d9,#8b5cf6);padding:64px 24px 48px;text-align:center;position:relative;overflow:hidden;}
.hero::before{content:"";position:absolute;inset:0;background:url(https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=60) center/cover;opacity:.08;}
.ey{font-family:"Bebas Neue",sans-serif;font-size:12px;letter-spacing:.3em;color:#fbbf24;margin-bottom:16px;position:relative;}
.ht{font-size:clamp(32px,8vw,52px);font-weight:900;color:#fff;line-height:1.15;margin-bottom:16px;position:relative;letter-spacing:-.02em;}
.ht em{color:#fbbf24;font-style:normal;}
.hs{font-size:15px;color:rgba(255,255,255,.75);line-height:1.9;margin-bottom:28px;position:relative;max-width:300px;margin-left:auto;margin-right:auto;}
.hb{display:block;background:#fbbf24;color:#1a1714;padding:18px;border-radius:10px;font-size:16px;font-weight:900;text-align:center;text-decoration:none;max-width:300px;margin:0 auto;position:relative;}
.sec{padding:40px 20px;max-width:480px;margin:0 auto;}
.sg{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:24px;}
.sc{background:#fff;border:1px solid #e8e2d8;border-radius:12px;padding:16px;}
.si{font-size:24px;margin-bottom:8px;}.stt{font-size:13px;font-weight:800;color:#1a1714;margin-bottom:4px;}.sd{font-size:12px;color:#6b7280;line-height:1.6;}
.vc{background:#f5f0ff;border-left:4px solid #8b5cf6;padding:16px;border-radius:0 10px 10px 0;margin-bottom:12px;}
.vt{font-size:14px;color:#4b5563;line-height:1.7;margin-bottom:8px;}.vn{font-size:12px;font-weight:700;color:#6d28d9;}
.pc{background:linear-gradient(135deg,#f5f0ff,#ede9fe);border-radius:16px;padding:22px;display:flex;gap:14px;align-items:center;margin-bottom:20px;}
.pi{width:68px;height:68px;border-radius:50%;object-fit:cover;background:#c4b5fd;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;}
.pn{font-size:17px;font-weight:900;color:#4c1d95;}.pt{font-size:13px;color:#6b7280;margin-top:2px;}
.btn-p{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:#6d28d9;color:#fff;text-decoration:none;}
.btn-s{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:transparent;color:#6d28d9;border:2px solid #6d28d9;text-decoration:none;}
.disc{font-size:11px;color:#9ca3af;line-height:1.8;padding:20px;text-align:center;}
</style></head><body>
<div class="hero"><p class="ey">METARICH SIGNAL GROUP · 설계사 모집</p>
<h1 class="ht">혼자 영업하지<br>않는 설계사<br><em>조직</em></h1>
<p class="hs">DB영업 · 상담화법 · 콘텐츠<br>자동화까지 함께 성장합니다</p>
${u.recruitUrl?`<a href="${u.recruitUrl}" class="hb">🚀 입사 지원하기</a>`:""}
</div>
<div class="sec">
<p style="font-size:18px;font-weight:900;color:#4c1d95;margin-bottom:16px;">함께하면 달라지는 것들</p>
<div class="sg">${[["🎯","DB 영업","검증된 DB와 체계적 접근법"],["💬","상담 화법","성공 화법 전수 및 롤플레이"],["📊","보장분석","전문 분석 자료 및 템플릿"],["📱","콘텐츠","SNS·블로그 콘텐츠 지원"],["⚡","영업 자동화","업무 효율화 시스템 제공"],["🤝","리쿠르팅","조직 성장 지원 시스템"]].map(([i,t,d]: string[])=>`<div class="sc"><p class="si">${i}</p><p class="stt">${t}</p><p class="sd">${d}</p></div>`).join("")}</div>
<p style="font-size:18px;font-weight:900;color:#4c1d95;margin-bottom:14px;">합류한 분들의 이야기</p>
${[["입사 전엔 혼자 다 해야 했는데, 지금은 자료·화법·DB까지 시스템이 있어요.","경력 3년차 설계사"],["처음 시작하는 분도 체계적으로 배울 수 있는 환경입니다.","신입 설계사"]].map(([t,n]: string[])=>`<div class="vc"><p class="vt">"${t}"</p><p class="vn">— ${n}</p></div>`).join("")}
<div class="pc">${u.profileImg?`<img class="pi" src="${u.profileImg}" alt="${u.name}">`:`<div class="pi">👤</div>`}<div><p class="pn">${u.name}</p><p class="pt">${u.title} · ${u.company}</p></div></div>
${u.recruitUrl?`<a href="${u.recruitUrl}" class="btn-p">🚀 입사 지원하기</a>`:""}${u.openchatUrl?`<a href="${u.openchatUrl}" class="btn-s">💬 오픈채팅 문의</a>`:""}${u.cafeUrl?`<a href="${u.cafeUrl}" class="btn-s">☕ 카페 방문하기</a>`:""}
<p class="disc">본 페이지는 보험설계사 활동 안내를 위한 페이지이며, 소득 및 영업 성과는 개인의 역량, 활동량, 시장 상황에 따라 달라질 수 있습니다.<br><br>© 보험의 기준(배진우) · 메타리치 시그널그룹</p>
</div></body></html>`
}

function genRemodeling(u: UserInfo): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>보험 리모델링 | ${u.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700&family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
<style>${BASE}
body{background:#f9fafb;}
.hero{background:linear-gradient(160deg,#0b1e5f,#0e2882);padding:64px 24px 48px;text-align:center;}
.ey{font-size:12px;font-weight:800;color:#d4af37;letter-spacing:.14em;text-transform:uppercase;margin-bottom:16px;}
.ht{font-family:"Noto Serif KR",serif;font-size:clamp(26px,7vw,38px);font-weight:700;color:#fff;line-height:1.35;margin-bottom:14px;}
.ht em{color:#d4af37;font-style:normal;}
.hs{font-size:14px;color:rgba(255,255,255,.65);line-height:1.9;margin-bottom:28px;max-width:300px;margin-left:auto;margin-right:auto;}
.kr{display:flex;justify-content:center;gap:12px;margin-bottom:28px;}
.kp{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);padding:14px 18px;border-radius:10px;text-align:center;}
.kn{font-size:22px;font-weight:900;color:#d4af37;line-height:1.2;}.kl{font-size:11px;color:rgba(255,255,255,.5);margin-top:4px;}
.hb{display:block;background:#d4af37;color:#0b1e5f;padding:16px;border-radius:10px;font-size:15px;font-weight:900;text-align:center;text-decoration:none;max-width:300px;margin:0 auto;}
.sec{padding:40px 20px;max-width:480px;margin:0 auto;}
.br{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;}.bg{background:#eff6ff;color:#2563eb;padding:6px 14px;border-radius:100px;font-size:12px;font-weight:700;}
.st{display:flex;gap:14px;padding:14px;background:#fff;border-radius:12px;box-shadow:0 1px 6px rgba(0,0,0,.06);margin-bottom:10px;}
.sn{width:32px;height:32px;border-radius:50%;background:#0b1e5f;color:#fff;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.stit{font-size:14px;font-weight:800;color:#1e293b;margin-bottom:4px;}.sdesc{font-size:13px;color:#64748b;line-height:1.6;}
.btn-g{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:#d4af37;color:#0b1e5f;text-decoration:none;}
.btn-l{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:transparent;color:#0b1e5f;border:2px solid #0b1e5f;text-decoration:none;}
.disc{font-size:11px;color:#9ca3af;line-height:1.8;padding:20px;text-align:center;}
</style></head><body>
<div class="hero"><p class="ey">보험 리모델링 전문</p>
<h1 class="ht">보험료는 줄이고<br><em>필요한 보장은</em><br>다시 정리합니다</h1>
<p class="hs">갱신형, CI보험, 실손 세대, 보장 공백까지<br>함께 점검합니다</p>
<div class="kr"><div class="kp"><p class="kn">최대<br>30%↓</p><p class="kl">보험료 절감</p></div><div class="kp"><p class="kn">1:1<br>무료</p><p class="kl">맞춤 분석</p></div><div class="kp"><p class="kn">48h<br>이내</p><p class="kl">결과 안내</p></div></div>
${u.consultUrl?`<a href="${u.consultUrl}" class="hb">🔍 내 보험 무료 점검 받기</a>`:""}
</div>
<div class="sec">
<p style="font-size:18px;font-weight:900;color:#0b1e5f;margin-bottom:16px;">이런 보험 있으시면 꼭 점검하세요</p>
<div class="br">${["갱신형 보험","CI(중대질병)보험","실손 1~4세대","종신보험","저축성보험","고납입 보험"].map((b: string)=>`<span class="bg">${b}</span>`).join("")}</div>
<p style="font-size:18px;font-weight:900;color:#0b1e5f;margin-bottom:14px;margin-top:28px;">상담 진행 절차</p>
${[["신청 접수","카카오톡 또는 전화로 상담 신청"],["보험 분석","현재 보험 증권 기반 무료 분석"],["결과 안내","보장 공백·과납 항목 리포트 제공"],["리모델링 제안","최적 보험 구조 제안"]].map(([t,d]: string[],i: number)=>`<div class="st"><div class="sn">${i+1}</div><div><p class="stit">${t}</p><p class="sdesc">${d}</p></div></div>`).join("")}
<div style="margin-top:24px;">${u.consultUrl?`<a href="${u.consultUrl}" class="btn-g">📋 무료 점검 신청하기</a>`:""}${u.kakaoUrl?`<a href="${u.kakaoUrl}" class="btn-l">💬 카카오톡 문의</a>`:""}${u.phone?`<a href="tel:${u.phone}" class="btn-l">📞 전화 상담</a>`:""}</div>
<p class="disc">본 페이지는 보험 상담 신청을 위한 안내 페이지이며, 구체적인 보장 내용과 보험료는 개인의 상황, 가입 조건, 보험회사 인수 기준에 따라 달라질 수 있습니다.<br><br>© 보험의 기준(배진우) · 메타리치 시그널그룹</p>
</div></body></html>`
}

// ────────────────────────────────────────────────────────────────
// 전체 템플릿 목록 (보험 6 + 외부 16)
// ────────────────────────────────────────────────────────────────
const INSURANCE_TEMPLATES: TemplateMeta[] = [
  { id: "ins-card",       name: "단순 명함형",      category: "보험 전용", style: "navy",   type: "insurance", gen: genCard },
  { id: "ins-consult",    name: "상담 전환형",       category: "보험 전용", style: "blue",   type: "insurance", gen: genConsult },
  { id: "ins-remodeling", name: "리모델링 상담형",   category: "보험 전용", style: "gold",   type: "insurance", gen: genRemodeling },
  { id: "ins-recruiting", name: "리쿠르팅 모집형",   category: "보험 전용", style: "purple", type: "insurance", gen: genRecruiting },
]

const EXTERNAL_TEMPLATES: TemplateMeta[] = [
  { id: "ext-01", name: "다이닝 프리미엄형",   category: "프리미엄",    style: "dark-gold",    type: "external", file: "/branding-templates/template-01.html" },
  { id: "ext-02", name: "다이닝 엘레강스형",   category: "프리미엄",    style: "dark-gold",    type: "external", file: "/branding-templates/template-02.html" },
  { id: "ext-03", name: "아카데미 클린형",      category: "교육/전문",   style: "light-blue",   type: "external", file: "/branding-templates/template-03.html" },
  { id: "ext-04", name: "다크 퍼플 임팩트형",  category: "임팩트",      style: "dark-purple",  type: "external", file: "/branding-templates/template-04.html" },
  { id: "ext-05", name: "대시보드 보고서형",    category: "전문/데이터", style: "light-clean",  type: "external", file: "/branding-templates/template-05.html" },
  { id: "ext-06", name: "브랜드 혁신 제안형",  category: "전문/데이터", style: "white-serif",  type: "external", file: "/branding-templates/template-06.html" },
  { id: "ext-07", name: "아틀리에 베이지형",   category: "프리미엄",    style: "beige",        type: "external", file: "/branding-templates/template-07.html" },
  { id: "ext-08", name: "볼드 크림 에너지형",  category: "임팩트",      style: "cream-bold",   type: "external", file: "/branding-templates/template-08.html" },
  { id: "ext-09", name: "다크 그로스형",        category: "임팩트",      style: "dark-minimal", type: "external", file: "/branding-templates/template-09.html" },
  { id: "ext-10", name: "다크 네이비 전문형",   category: "전문/데이터", style: "dark-navy",    type: "external", file: "/branding-templates/template-10.html" },
  { id: "ext-11", name: "다크 퍼플 스튜디오형", category: "임팩트",     style: "dark-purple2", type: "external", file: "/branding-templates/template-11.html" },
  { id: "ext-12", name: "라이트 세무 전문형",   category: "전문/데이터", style: "light-mono",   type: "external", file: "/branding-templates/template-12.html" },
  { id: "ext-13", name: "화이트 노무 컨설팅형", category: "전문/데이터", style: "white-warm",   type: "external", file: "/branding-templates/template-13.html" },
  { id: "ext-14", name: "B2B SaaS 플랫폼형",    category: "테크",        style: "tech-blue",    type: "external", file: "/branding-templates/template-14.html" },
  { id: "ext-15", name: "민트 그린 서비스형",   category: "서비스",      style: "mint",         type: "external", file: "/branding-templates/template-15.html" },
  { id: "ext-16", name: "에메랄드 에듀형",      category: "교육/전문",   style: "emerald",      type: "external", file: "/branding-templates/template-16.html" },
]

const ALL_TEMPLATES = [...INSURANCE_TEMPLATES, ...EXTERNAL_TEMPLATES]
const CATEGORIES: TemplateCategory[] = ["보험 전용", "프리미엄", "임팩트", "전문/데이터", "교육/전문", "서비스", "테크"]

// 스타일별 썸네일 색상
const STYLE_COLORS: Record<string, string> = {
  navy: "#1a3a6e", blue: "#2563eb", gold: "#d4af37", purple: "#6d28d9",
  "dark-gold": "#0a0f1e", "dark-purple": "#0a0820", "dark-minimal": "#0a0d12",
  "dark-navy": "#0d1424", "dark-purple2": "#0f0820", "light-blue": "#f0f4ff",
  "light-clean": "#f5f8fc", "white-serif": "#fff8f0", beige: "#f9f7f4",
  "cream-bold": "#f5f0eb", "light-mono": "#f5f8fc", "white-warm": "#f7f7f4",
  "tech-blue": "#f5f8ff", mint: "#34d5b0", emerald: "#f5fcfa",
}

// ────────────────────────────────────────────────────────────────
// localStorage
// ────────────────────────────────────────────────────────────────
const LS_U = "branding_v3_user", LS_S = "branding_v3_saved"
const lg = <T,>(k: string, fb: T): T => { try { const r = typeof window!=="undefined"?localStorage.getItem(k):null; return r?JSON.parse(r):fb }catch{return fb} }
const ls = (k: string, v: any) => { try{localStorage.setItem(k,JSON.stringify(v))}catch{} }
function toB64(file: File): Promise<string> { return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target?.result as string);r.onerror=rej;r.readAsDataURL(file)})}

// ────────────────────────────────────────────────────────────────
// 저작권 동의 모달
// ────────────────────────────────────────────────────────────────
function CopyrightModal({ onClose, onDownload }: { onClose:()=>void; onDownload:()=>void }) {
  const [ok, setOk] = useState(false)
  const S = { fontFamily:"system-ui,sans-serif" }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:"16px"}}>
      <div style={{background:"#1a1a1a",border:"1px solid rgba(255,255,255,.12)",borderRadius:"18px",maxWidth:"420px",width:"100%",overflow:"hidden"}}>
        <div style={{background:"#111",padding:"18px 22px",borderBottom:"1px solid rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",...S}}>
            <span style={{fontSize:"20px"}}>📋</span>
            <div><p style={{color:"#fff",fontWeight:900,fontSize:"15px"}}>저작권 동의 필수</p><p style={{color:"rgba(255,255,255,.4)",fontSize:"11px",marginTop:"2px"}}>다운로드 전 아래 내용을 확인하고 동의해 주세요.</p></div>
          </div>
          <button onClick={onClose} style={{color:"rgba(255,255,255,.4)",fontSize:"18px",background:"none",border:"none",cursor:"pointer",...S}}>✕</button>
        </div>
        <div style={{padding:"18px 22px",maxHeight:"300px",overflowY:"auto",...S}}>
          {[
            {n:"1",t:"저작권 귀속",b:<>본 빌더에서 제공하는 모든 템플릿의 저작권은 <strong style={{color:"#fff"}}>보험의 기준(배진우)</strong>에게 있습니다.</>},
            {n:"2",t:"허용 범위",b:"본인 영업·홍보, 고객 전달, 제안서 브리핑, 세미나 자료 등 영업 목적 사용이 허용됩니다."},
            {n:"3",t:"금지 행위",b:<ul style={{paddingLeft:0,listStyle:"none",marginTop:"6px"}}>{["유사 빌더·도구·SaaS 프로그램 제작에 활용","템플릿 디자인·코드를 재배포·재판매","본 조직 외 타 조직 홍보물로 무단 사용"].map(s=><li key={s} style={{color:"#f87171",fontSize:"13px",padding:"3px 0",display:"flex",gap:"6px"}}><span>•</span><span>{s}</span></li>)}</ul>},
            {n:"4",t:"법적 조치",b:"위반 시 저작권법·부정경쟁방지법에 따라 민·형사상 법적 책임을 질 수 있습니다."},
          ].map(({n,t,b})=><div key={n} style={{marginBottom:"14px"}}><p style={{color:"#d4af37",fontSize:"12px",fontWeight:800,marginBottom:"5px"}}>{n}. {t}</p><p style={{color:"rgba(255,255,255,.6)",fontSize:"13px",lineHeight:1.75}}>{b}</p></div>)}
        </div>
        <div style={{margin:"0 22px 12px",background:ok?"rgba(212,175,55,.12)":"rgba(255,255,255,.04)",border:`1.5px solid ${ok?"#d4af37":"rgba(255,255,255,.12)"}`,borderRadius:"10px",padding:"13px 15px",display:"flex",alignItems:"center",gap:"11px",cursor:"pointer",...S}} onClick={()=>setOk(v=>!v)}>
          <div style={{width:"20px",height:"20px",borderRadius:"5px",border:`2px solid ${ok?"#d4af37":"rgba(255,255,255,.3)"}`,background:ok?"#d4af37":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"12px",fontWeight:900,color:"#000"}}>{ok?"✓":""}</div>
          <p style={{color:ok?"#d4af37":"rgba(255,255,255,.65)",fontSize:"13px",fontWeight:700}}>위 내용을 모두 확인했으며 동의합니다</p>
        </div>
        <div style={{padding:"0 22px 22px",display:"flex",gap:"10px",...S}}>
          <button onClick={onClose} style={{flex:1,padding:"13px",borderRadius:"10px",border:"1px solid rgba(255,255,255,.15)",background:"transparent",color:"rgba(255,255,255,.55)",fontSize:"13px",fontWeight:700,cursor:"pointer"}}>취소</button>
          <button onClick={()=>{if(ok){onDownload();onClose()}}} disabled={!ok} style={{flex:2,padding:"13px",borderRadius:"10px",background:ok?"#d4af37":"rgba(255,255,255,.08)",color:ok?"#000":"rgba(255,255,255,.2)",fontSize:"13px",fontWeight:900,cursor:ok?"pointer":"not-allowed",border:"none"}}>동의하고 다운로드</button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────────────────────
export default function BrandingAIPageInner({ user: _user }: { user?: any }) {
  const [info, setInfo]           = useState<UserInfo>(()=>lg(LS_U, DEFAULT_USER))
  const [tplId, setTplId]         = useState<string>("ins-consult")
  const [device, setDevice]       = useState<DeviceMode>("mobile")
  const [catFilter, setCatFilter] = useState<string>("전체")
  const [tab, setTab]             = useState(0)
  const [saved, setSaved]         = useState<SavedPage[]>(()=>lg(LS_S, []))
  const [saveName, setSaveName]   = useState("")
  const [showCopy, setShowCopy]   = useState(false)
  const [iKey, setIKey]           = useState(0)
  const [extHtml, setExtHtml]     = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)

  useEffect(()=>{ ls(LS_U, info) }, [info])

  const tpl = ALL_TEMPLATES.find(t=>t.id===tplId)!

  // 외부 템플릿 fetch
  useEffect(()=>{
    if (!tpl) return
    if (tpl.type === "insurance") { setExtHtml(null); setIKey(k=>k+1); return }
    setLoading(true)
    fetch(tpl.file!)
      .then(r=>r.text())
      .then(html=>{ setExtHtml(html); setIKey(k=>k+1); setLoading(false) })
      .catch(()=>setLoading(false))
  }, [tplId])

  // insurance 템플릿은 info 변경 시 재렌더
  useEffect(()=>{
    if (tpl?.type==="insurance") setIKey(k=>k+1)
  }, [info])

  const currentHtml = tpl?.type==="insurance" && tpl.gen ? tpl.gen(info) : (extHtml || "<p style='color:#fff;padding:40px;text-align:center;'>템플릿 불러오는 중...</p>")

  const upd = (f: keyof UserInfo, v: string) => setInfo(p=>({...p,[f]:v}))

  const doDownload = () => {
    const b = new Blob([currentHtml], {type:"text/html;charset=utf-8"})
    const u = URL.createObjectURL(b)
    const a = document.createElement("a")
    a.href=u; a.download=`${tpl?.name||"page"}-${info.name||"설계사"}.html`; a.click()
    URL.revokeObjectURL(u)
  }

  const handleSave = () => {
    if(!saveName.trim()) return
    const e: SavedPage = {id:Date.now().toString(),name:saveName.trim(),templateId:tplId,userInfo:info,savedAt:new Date().toLocaleDateString("ko-KR")}
    const u=[...saved,e]; setSaved(u); ls(LS_S,u); setSaveName(""); alert(`"${e.name}" 저장 완료!`)
  }

  const filteredTpls = catFilter==="전체" ? ALL_TEMPLATES : ALL_TEMPLATES.filter(t=>t.category===catFilter)

  const TABS = ["① 정보 입력", "② 템플릿", "③ 저장"]

  const FIELD_TIPS: Record<string, string> = {
    name: "실명 또는 활동명을 입력하세요. 페이지 상단 프로필에 크게 노출됩니다.",
    title: "AFPK, CFP, 재무설계사 등 공식 자격 직함을 입력하세요.",
    company: "소속 법인·지점명을 정확히 입력하세요.",
    phone: "상담 전화번호. 전화하기 버튼의 링크로 자동 연결됩니다.",
    kakaoUrl: "카카오톡 채널 또는 오픈채팅 링크를 넣으면 버튼이 활성화됩니다.",
    consultUrl: "네이버 폼, 구글 폼, 카카오 채널 등 상담 신청 페이지 링크.",
    fields: "쉼표로 구분. 예: 보장분석, 연금 상담, 실손보험 점검",
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#0c0c0c",overflow:"hidden",fontFamily:"system-ui,sans-serif"}}>

      {/* ── 상단 툴바 ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",height:"48px",background:"#111",borderBottom:"1px solid rgba(255,255,255,.1)",flexShrink:0,gap:"8px"}}>
        {/* 좌측: 앱명 */}
        <div style={{display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
          <span style={{fontSize:"15px",fontWeight:900,color:"#fff",letterSpacing:"-.01em"}}>🎨 브랜딩 AI</span>
          <span style={{fontSize:"11px",color:"rgba(255,255,255,.3)",fontWeight:700,display:"none"}}>보험 랜딩페이지 빌더</span>
        </div>

        {/* 중앙: 디바이스 토글 */}
        <div style={{display:"flex",alignItems:"center",gap:"2px",background:"rgba(255,255,255,.06)",borderRadius:"10px",padding:"3px"}}>
          {(["pc","tablet","mobile"] as DeviceMode[]).map(d=>(
            <button key={d} onClick={()=>setDevice(d)} style={{padding:"5px 10px",borderRadius:"7px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:800,background:device===d?"#d4af37":"transparent",color:device===d?"#000":"rgba(255,255,255,.4)",transition:"all .15s"}}>
              {d==="pc"?"🖥 PC":d==="tablet"?"📱 태블릿":"📱 모바일"}
            </button>
          ))}
        </div>

        {/* 우측: 액션 버튼들 */}
        <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
          <ToolBtn onClick={()=>setIKey(k=>k+1)} label="↺ 새로고침" />
          <ToolBtn onClick={()=>setTab(2)} label="💾 저장" />
          <ToolBtn onClick={()=>{ const s=saved[saved.length-1]; if(s){setInfo(s.userInfo);setTplId(s.templateId)}else alert("저장된 페이지가 없습니다.") }} label="📂 불러오기" />
          <button onClick={()=>setShowCopy(true)} style={{padding:"6px 14px",borderRadius:"8px",background:"#d4af37",color:"#000",border:"none",fontSize:"12px",fontWeight:900,cursor:"pointer"}}>⬇ HTML 다운로드</button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ── 사이드바 ── */}
        <div style={{width:"280px",flexShrink:0,display:"flex",flexDirection:"column",background:"#111",borderRight:"1px solid rgba(255,255,255,.08)"}}>
          {/* 탭 */}
          <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
            {TABS.map((t,i)=>(
              <button key={i} onClick={()=>setTab(i)} style={{flex:1,padding:"10px 4px",border:"none",background:"transparent",cursor:"pointer",fontSize:"11px",fontWeight:800,color:tab===i?"#d4af37":"rgba(255,255,255,.25)",borderBottom:tab===i?"2px solid #d4af37":"2px solid transparent",transition:"all .15s"}}>
                {t}
              </button>
            ))}
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"12px"}}>

            {/* 탭 0: 정보 입력 */}
            {tab===0 && <>
              <SBox title="프로필 사진">
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  {info.profileImg
                    ? <img src={info.profileImg} alt="p" style={{width:"48px",height:"48px",borderRadius:"50%",objectFit:"cover",border:"2px solid #d4af37"}} />
                    : <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px"}}>👤</div>
                  }
                  <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                    <button onClick={()=>imgRef.current?.click()} style={{padding:"5px 10px",border:"1px solid rgba(212,175,55,.4)",background:"rgba(212,175,55,.08)",color:"#d4af37",borderRadius:"7px",fontSize:"11px",fontWeight:700,cursor:"pointer"}}>+ 업로드</button>
                    {info.profileImg && <button onClick={()=>upd("profileImg","")} style={{padding:"5px 10px",border:"1px solid rgba(248,113,113,.3)",background:"transparent",color:"#f87171",borderRadius:"7px",fontSize:"11px",fontWeight:700,cursor:"pointer"}}>삭제</button>}
                  </div>
                  <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{if(e.target.files?.[0]){const b=await toB64(e.target.files[0]);upd("profileImg",b)}}} />
                </div>
              </SBox>

              <SBox title="기본 정보">
                {([
                  ["name","이름 *","배진우"],
                  ["title","직함","AFPK 재무설계사"],
                  ["company","소속 *","메타리치 시그널그룹"],
                  ["branch","지점/팀",""],
                  ["phone","전화번호 *","010-"],
                  ["email","이메일",""],
                  ["intro","브랜드명","보험의 기준"],
                  ["qualifications","자격사항","AFPK"],
                ] as [keyof UserInfo,string,string][]).map(([f,l,p])=>(
                  <FRow key={f} label={l} val={info[f] as string} ph={p} tip={FIELD_TIPS[f]} onChange={v=>upd(f,v)} />
                ))}
              </SBox>

              <SBox title="상담 분야">
                <FRow label="분야 (쉼표 구분)" val={info.fields} ph="보장분석, 리모델링, 연금..." tip={FIELD_TIPS.fields} onChange={v=>upd("fields",v)} multiline />
              </SBox>

              <SBox title="링크">
                {([
                  ["kakaoUrl","카카오톡 상담"],
                  ["consultUrl","상담 신청 링크"],
                  ["recruitUrl","리쿠르팅 문의"],
                  ["blogUrl","네이버 블로그"],
                  ["instagramUrl","인스타그램"],
                  ["youtubeUrl","유튜브"],
                  ["cafeUrl","네이버 카페"],
                  ["openchatUrl","오픈채팅"],
                ] as [keyof UserInfo,string][]).map(([f,l])=>(
                  <FRow key={f} label={l} val={info[f] as string} ph="https://" tip={FIELD_TIPS[f]} onChange={v=>upd(f,v)} />
                ))}
              </SBox>

              <div style={{background:"rgba(212,175,55,.06)",border:"1px solid rgba(212,175,55,.2)",borderRadius:"10px",padding:"12px",marginTop:"4px"}}>
                <p style={{fontSize:"11px",color:"rgba(212,175,55,.8)",fontWeight:700,marginBottom:"6px"}}>💡 미세 조정 팁</p>
                <p style={{fontSize:"11px",color:"rgba(255,255,255,.4)",lineHeight:1.7}}>• 이름·회사·전화번호만 채워도 기본 명함이 완성됩니다<br/>• 링크는 없으면 자동으로 버튼이 숨겨집니다<br/>• 보험 전용 템플릿은 입력값이 실시간 반영됩니다<br/>• 외부 템플릿은 스타일만 참고하고 HTML 편집 후 사용하세요</p>
              </div>
            </>}

            {/* 탭 1: 템플릿 */}
            {tab===1 && <>
              {/* 카테고리 필터 */}
              <div style={{display:"flex",flexWrap:"wrap",gap:"5px",marginBottom:"12px"}}>
                {["전체",...CATEGORIES].map(c=>(
                  <button key={c} onClick={()=>setCatFilter(c)} style={{padding:"4px 10px",borderRadius:"100px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:800,background:catFilter===c?"#d4af37":"rgba(255,255,255,.07)",color:catFilter===c?"#000":"rgba(255,255,255,.4)"}}>
                    {c}
                  </button>
                ))}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {filteredTpls.map(t=>(
                  <button key={t.id} onClick={()=>setTplId(t.id)} style={{textAlign:"left",padding:"10px 12px",borderRadius:"10px",border:`1.5px solid ${tplId===t.id?"#d4af37":"rgba(255,255,255,.08)"}`,background:tplId===t.id?"rgba(212,175,55,.08)":"rgba(255,255,255,.02)",cursor:"pointer",display:"flex",alignItems:"center",gap:"10px",transition:"all .15s"}}>
                    <div style={{width:"32px",height:"32px",borderRadius:"7px",background:STYLE_COLORS[t.style]||"#333",flexShrink:0,border:"1px solid rgba(255,255,255,.1)"}} />
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"4px"}}>
                        <p style={{fontSize:"12px",fontWeight:800,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</p>
                        {tplId===t.id && <span style={{fontSize:"9px",background:"#d4af37",color:"#000",padding:"2px 6px",borderRadius:"100px",fontWeight:900,flexShrink:0}}>선택</span>}
                      </div>
                      <p style={{fontSize:"10px",color:"rgba(255,255,255,.3)",marginTop:"2px"}}>{t.category} {t.type==="external"?"· 스타일 참고용":""}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>}

            {/* 탭 2: 저장 */}
            {tab===2 && <>
              <SBox title="현재 페이지 저장">
                <div style={{display:"flex",gap:"6px"}}>
                  <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="저장 이름" style={{flex:1,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:"7px",padding:"8px 10px",fontSize:"12px",color:"#fff",outline:"none"}} />
                  <button onClick={handleSave} disabled={!saveName.trim()} style={{padding:"8px 12px",borderRadius:"7px",background:saveName.trim()?"#d4af37":"rgba(255,255,255,.08)",color:saveName.trim()?"#000":"rgba(255,255,255,.2)",border:"none",fontSize:"12px",fontWeight:900,cursor:saveName.trim()?"pointer":"not-allowed"}}>저장</button>
                </div>
              </SBox>

              {saved.length>0 && <SBox title={`저장된 페이지 (${saved.length})`}>
                {saved.map(p=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                    <div><p style={{fontSize:"12px",fontWeight:700,color:"#fff"}}>{p.name}</p><p style={{fontSize:"10px",color:"rgba(255,255,255,.3)",marginTop:"2px"}}>{p.savedAt}</p></div>
                    <div style={{display:"flex",gap:"4px"}}>
                      <button onClick={()=>{if(confirm(`"${p.name}" 불러올까요?`)){setInfo(p.userInfo);setTplId(p.templateId)}}} style={{padding:"4px 8px",borderRadius:"6px",border:"1px solid rgba(212,175,55,.3)",background:"transparent",color:"#d4af37",fontSize:"11px",fontWeight:700,cursor:"pointer"}}>불러오기</button>
                      <button onClick={()=>{const u=saved.filter(x=>x.id!==p.id);setSaved(u);ls(LS_S,u)}} style={{padding:"4px 8px",borderRadius:"6px",border:"1px solid rgba(248,113,113,.2)",background:"transparent",color:"#f87171",fontSize:"11px",fontWeight:700,cursor:"pointer"}}>삭제</button>
                    </div>
                  </div>
                ))}
              </SBox>}

              <SBox title="초기화">
                <button onClick={()=>{if(confirm("전체 초기화할까요?")){{setInfo(DEFAULT_USER);setTplId("ins-consult")}}}} style={{width:"100%",padding:"10px",borderRadius:"8px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#f87171",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>🗑 전체 초기화</button>
              </SBox>
            </>}
          </div>
        </div>

        {/* ── 미리보기 영역 ── */}
        <div style={{flex:1,background:"#0a0a0a",display:"flex",flexDirection:"column",alignItems:"center",overflowY:"auto",padding:"20px 16px"}}>
          <div style={{marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px",color:"rgba(255,255,255,.25)",fontSize:"11px",fontWeight:700}}>
            <span>{tpl?.name}</span><span>·</span><span>{device==="pc"?"PC":device==="tablet"?"태블릿":"모바일"} 미리보기</span>
            {loading && <span style={{color:"#d4af37"}}>· 불러오는 중...</span>}
          </div>

          <div style={{width:DEVICE_W[device],maxWidth:"100%",borderRadius:"16px",overflow:"hidden",border:"1px solid rgba(255,255,255,.08)",boxShadow:"0 20px 60px rgba(0,0,0,.6)",transition:"width .3s"}}>
            {/* 브라우저 바 */}
            <div style={{background:"#1e1e1e",padding:"8px 14px",display:"flex",alignItems:"center",gap:"8px",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
              <div style={{display:"flex",gap:"5px"}}>
                {["#ff5f57","#febc2e","#28c840"].map(c=><div key={c} style={{width:"10px",height:"10px",borderRadius:"50%",background:c,opacity:.7}} />)}
              </div>
              <div style={{flex:1,background:"rgba(255,255,255,.06)",borderRadius:"5px",padding:"4px 10px",fontSize:"10px",color:"rgba(255,255,255,.2)",marginLeft:"6px"}}>{tpl?.name} · 미리보기</div>
            </div>
            <iframe
              key={iKey}
              srcDoc={currentHtml}
              sandbox="allow-same-origin allow-scripts"
              style={{width:"100%",height:DEVICE_H[device],border:"none",display:"block"}}
              title="미리보기"
            />
          </div>

          <div style={{marginTop:"12px",textAlign:"center",color:"rgba(255,255,255,.12)",fontSize:"11px"}}>
            상단 <span style={{color:"#d4af37",fontWeight:700}}>HTML 다운로드</span> 버튼으로 완성된 파일을 받으세요
          </div>
        </div>
      </div>

      {showCopy && <CopyrightModal onClose={()=>setShowCopy(false)} onDownload={doDownload} />}
    </div>
  )
}

// ── 서브 컴포넌트 ──
function ToolBtn({ onClick, label }: { onClick:()=>void; label:string }) {
  return (
    <button onClick={onClick} style={{padding:"5px 10px",border:"1px solid rgba(255,255,255,.12)",borderRadius:"7px",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.55)",fontSize:"11px",fontWeight:700,cursor:"pointer"}}>
      {label}
    </button>
  )
}

function SBox({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div style={{background:"rgba(255,255,255,.03)",borderRadius:"10px",padding:"12px",border:"1px solid rgba(255,255,255,.07)",marginBottom:"10px"}}>
      <p style={{fontSize:"10px",fontWeight:900,color:"rgba(255,255,255,.25)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:"10px"}}>{title}</p>
      {children}
    </div>
  )
}

function FRow({ label, val, ph, tip, onChange, multiline }: { label:string; val:string; ph?:string; tip?:string; onChange:(v:string)=>void; multiline?:boolean }) {
  const [showTip, setShowTip] = useState(false)
  const base = {width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",borderRadius:"7px",padding:"7px 10px",fontSize:"12px",color:"#fff",outline:"none",fontFamily:"system-ui,sans-serif",resize:"none" as const}
  return (
    <div style={{marginBottom:"8px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"4px"}}>
        <p style={{fontSize:"10px",fontWeight:700,color:"rgba(255,255,255,.3)"}}>{label}</p>
        {tip && <button onClick={()=>setShowTip(v=>!v)} style={{fontSize:"10px",color:"rgba(212,175,55,.6)",background:"none",border:"none",cursor:"pointer",padding:0}}>💡</button>}
      </div>
      {showTip && tip && <p style={{fontSize:"10px",color:"rgba(212,175,55,.7)",background:"rgba(212,175,55,.06)",padding:"6px 8px",borderRadius:"6px",marginBottom:"5px",lineHeight:1.6}}>{tip}</p>}
      {multiline
        ? <textarea value={val} placeholder={ph} onChange={e=>onChange(e.target.value)} rows={3} style={base} />
        : <input type="text" value={val} placeholder={ph} onChange={e=>onChange(e.target.value)} style={base} />
      }
    </div>
  )
}
