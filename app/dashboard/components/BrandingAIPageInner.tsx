"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "../../../lib/supabase"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 설계사 브랜딩 AI — WYSIWYG 빌더 v3
// daperm 스타일: 클릭 편집 + 섹션 삭제 + 플로팅 툴바 + 링크 편집
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 타입 ──
interface UserInfo {
  name: string; title: string; company: string; branch: string
  phone: string; email: string; kakaoUrl: string; consultUrl: string
  recruitUrl: string; blogUrl: string; instagramUrl: string
  youtubeUrl: string; cafeUrl: string; openchatUrl: string
  intro: string; fields: string; qualifications: string
  profileImg: string
}
type DeviceMode = "pc" | "tablet" | "mobile"
interface SavedPage { id: string; name: string; templateId: string; userInfo: UserInfo; html: string; savedAt: string }

const DEFAULT_USER: UserInfo = {
  name: "배진우", title: "AFPK 재무설계사", company: "메타리치 시그널그룹", branch: "",
  phone: "", email: "", kakaoUrl: "", consultUrl: "", recruitUrl: "",
  blogUrl: "", instagramUrl: "", youtubeUrl: "", cafeUrl: "", openchatUrl: "",
  intro: "보험의 기준", fields: "보장분석, 보험 리모델링, 실손보험 점검, 암·뇌·심장 보장 점검, 연금 상담",
  qualifications: "AFPK", profileImg: "",
}

// ── 템플릿 목록 (카테고리별) ──
const TEMPLATES = [
  // 보험 전용
  { id: "ins-card",    name: "단순 명함형",    cat: "보험 전용", color: "#1a3a6e", type: "insurance" as const },
  { id: "ins-consult", name: "상담 전환형",     cat: "보험 전용", color: "#2563eb", type: "insurance" as const },
  { id: "ins-remo",    name: "리모델링 상담형", cat: "보험 전용", color: "#0b1e5f", type: "insurance" as const },
  { id: "ins-recruit", name: "리쿠르팅 모집형", cat: "보험 전용", color: "#6d28d9", type: "insurance" as const },
  // 외부 (업로드한 파일들)
  { id: "ext-01", name: "다이닝 프리미엄형",    cat: "프리미엄",    color: "#0a0f1e", type: "external" as const, file: "/branding-templates/template-01.html" },
  { id: "ext-02", name: "다이닝 엘레강스형",    cat: "프리미엄",    color: "#0a0f1e", type: "external" as const, file: "/branding-templates/template-02.html" },
  { id: "ext-03", name: "아카데미 클린형",      cat: "교육/전문",   color: "#f0f4ff", type: "external" as const, file: "/branding-templates/template-03.html" },
  { id: "ext-04", name: "다크 퍼플 임팩트형",  cat: "임팩트",      color: "#0a0820", type: "external" as const, file: "/branding-templates/template-04.html" },
  { id: "ext-05", name: "대시보드 보고서형",    cat: "전문/데이터", color: "#f5f8fc", type: "external" as const, file: "/branding-templates/template-05.html" },
  { id: "ext-06", name: "브랜드 혁신 제안형",  cat: "전문/데이터", color: "#fffaf5", type: "external" as const, file: "/branding-templates/template-06.html" },
  { id: "ext-07", name: "아틀리에 베이지형",   cat: "프리미엄",    color: "#f9f7f4", type: "external" as const, file: "/branding-templates/template-07.html" },
  { id: "ext-08", name: "볼드 크림 에너지형",  cat: "임팩트",      color: "#f5f0eb", type: "external" as const, file: "/branding-templates/template-08.html" },
  { id: "ext-09", name: "다크 그로스형",        cat: "임팩트",      color: "#0a0d12", type: "external" as const, file: "/branding-templates/template-09.html" },
  { id: "ext-10", name: "다크 네이비 전문형",   cat: "전문/데이터", color: "#0d1424", type: "external" as const, file: "/branding-templates/template-10.html" },
  { id: "ext-11", name: "다크 퍼플 스튜디오형", cat: "임팩트",     color: "#0f0820", type: "external" as const, file: "/branding-templates/template-11.html" },
  { id: "ext-12", name: "라이트 세무 전문형",   cat: "전문/데이터", color: "#f5f8fc", type: "external" as const, file: "/branding-templates/template-12.html" },
  { id: "ext-13", name: "화이트 노무 컨설팅형", cat: "전문/데이터", color: "#f7f7f4", type: "external" as const, file: "/branding-templates/template-13.html" },
  { id: "ext-14", name: "B2B SaaS 플랫폼형",    cat: "테크",        color: "#f5f8ff", type: "external" as const, file: "/branding-templates/template-14.html" },
  { id: "ext-15", name: "민트 그린 서비스형",   cat: "서비스",      color: "#34d5b0", type: "external" as const, file: "/branding-templates/template-15.html" },
  { id: "ext-16", name: "에메랄드 에듀형",      cat: "교육/전문",   color: "#f5fcfa", type: "external" as const, file: "/branding-templates/template-16.html" },
]

const ALL_CATS = ["전체", "보험 전용", "프리미엄", "임팩트", "전문/데이터", "교육/전문", "서비스", "테크"]

// ── localStorage ──
const ls_get = <T,>(k: string, fb: T): T => { try { const r = typeof window!=="undefined"?localStorage.getItem(k):null; return r?JSON.parse(r):fb }catch{return fb} }
const ls_set = (k: string, v: any) => { try{localStorage.setItem(k,JSON.stringify(v))}catch{} }
function toB64(file: File): Promise<string> { return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target?.result as string);r.onerror=rej;r.readAsDataURL(file)}) }

// ── 보험 전용 HTML 생성 (간략화) ──
const BASE_CSS = `*{margin:0;padding:0;box-sizing:border-box;}html{-webkit-text-size-adjust:100%;}body{font-family:'Pretendard','Noto Sans KR',system-ui,sans-serif;overflow-x:hidden;word-break:keep-all;}a{text-decoration:none;color:inherit;}img{max-width:100%;display:block;}`

function genInsHtml(id: string, u: UserInfo): string {
  if (id === "ins-card") return genCard(u)
  if (id === "ins-consult") return genConsult(u)
  if (id === "ins-remo") return genRemodeling(u)
  return genRecruiting(u)
}

function genCard(u: UserInfo): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${u.name} · ${u.company}</title><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet"><style>${BASE_CSS}body{background:#f8fafc;}.card{max-width:420px;margin:0 auto;background:#fff;min-height:100vh;padding-bottom:90px;}.hero{background:linear-gradient(135deg,#1a3a6e,#2d5a9e);padding:48px 24px 36px;text-align:center;}.av{width:88px;height:88px;border-radius:50%;border:3px solid rgba(255,255,255,.4);margin:0 auto 16px;object-fit:cover;background:#c7d2fe;display:flex;align-items:center;justify-content:center;font-size:36px;}.nm{font-size:24px;font-weight:900;color:#fff;letter-spacing:-.02em;}.tt{font-size:14px;color:rgba(255,255,255,.75);margin-top:6px;}.cp{font-size:13px;color:rgba(255,255,255,.55);margin-top:4px;}.bb{display:inline-block;background:rgba(212,175,55,.22);color:#d4af37;border:1px solid rgba(212,175,55,.4);padding:5px 14px;border-radius:100px;font-size:12px;font-weight:700;margin-top:12px;}.body{padding:24px 20px;}.sc{font-size:11px;font-weight:800;color:#94a3b8;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;margin-top:20px;}.ir{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;}.ii{width:32px;height:32px;border-radius:8px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}.iv{font-size:14px;font-weight:600;color:#1e293b;}.sg{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}.sb{display:flex;align-items:center;justify-content:center;padding:13px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#334155;}.sticky{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:420px;display:flex;gap:8px;padding:12px 16px;background:rgba(255,255,255,.97);backdrop-filter:blur(10px);border-top:1px solid #e2e8f0;z-index:100;}.bp{flex:1;background:#1a3a6e;color:#fff;border:none;padding:14px;border-radius:10px;font-size:14px;font-weight:800;text-align:center;text-decoration:none;display:block;}.bs{flex:1;background:transparent;color:#1a3a6e;border:2px solid #1a3a6e;padding:14px;border-radius:10px;font-size:14px;font-weight:800;text-align:center;text-decoration:none;display:block;}</style></head><body><div class="card"><div class="hero">${u.profileImg?`<img class="av" src="${u.profileImg}" alt="">`:`<div class="av">👤</div>`}<p class="nm">${u.name||"이름"}</p><p class="tt">${u.title||"직함"}</p><p class="cp">${u.company||"소속"}${u.branch?` · ${u.branch}`:""}</p>${u.intro?`<span class="bb">${u.intro}</span>`:""}</div><div class="body">${(u.phone||u.email)?`<p class="sc">연락처</p>${u.phone?`<div class="ir"><div class="ii">📞</div><a href="tel:${u.phone}" class="iv">${u.phone}</a></div>`:""} ${u.email?`<div class="ir"><div class="ii">✉️</div><span class="iv">${u.email}</span></div>`:""}`:""} ${u.fields?`<p class="sc">상담 분야</p>${u.fields.split(",").map((f:string)=>`<div class="ir"><div class="ii">✓</div><span class="iv">${f.trim()}</span></div>`).join("")}`:""} ${[u.blogUrl,u.instagramUrl,u.youtubeUrl,u.cafeUrl].some(Boolean)?`<p class="sc">채널</p><div class="sg">${u.blogUrl?`<a href="${u.blogUrl}" class="sb">📝 블로그</a>`:""}${u.instagramUrl?`<a href="${u.instagramUrl}" class="sb">📷 인스타</a>`:""}${u.youtubeUrl?`<a href="${u.youtubeUrl}" class="sb">▶ 유튜브</a>`:""}${u.cafeUrl?`<a href="${u.cafeUrl}" class="sb">☕ 카페</a>`:""}</div>`:""}</div></div><div class="sticky">${u.phone?`<a href="tel:${u.phone}" class="bp">📞 전화하기</a>`:""}${u.kakaoUrl?`<a href="${u.kakaoUrl}" class="bs">💬 카카오톡</a>`:""}</div></body></html>`
}

function genConsult(u: UserInfo): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>보험 무료 점검 | ${u.name||"설계사"}</title><link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700&family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet"><style>${BASE_CSS}body{background:#fff;}nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.95);backdrop-filter:blur(12px);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;}.nav-n{font-size:15px;font-weight:900;color:#1a3a6e;}.nav-b{background:#2563eb;color:#fff;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;}.hero{background:linear-gradient(160deg,#0b1e5f,#1d4ed8 60%,#3b82f6);padding:60px 24px 48px;text-align:center;}.h-tag{display:inline-block;background:rgba(255,255,255,.15);color:#fff;padding:6px 16px;border-radius:100px;font-size:12px;font-weight:700;margin-bottom:18px;}.h-t{font-family:"Noto Serif KR",serif;font-size:clamp(24px,6vw,36px);font-weight:700;color:#fff;line-height:1.4;margin-bottom:12px;}.h-s{font-size:15px;color:rgba(255,255,255,.75);line-height:1.8;margin-bottom:24px;max-width:300px;margin-left:auto;margin-right:auto;}.h-b{display:flex;flex-direction:column;gap:10px;max-width:300px;margin:0 auto;}.bw{background:#fff;color:#1d4ed8;padding:16px;border-radius:10px;font-size:15px;font-weight:800;text-align:center;text-decoration:none;display:block;}.bo{background:transparent;color:#fff;padding:14px;border-radius:10px;font-size:15px;font-weight:700;text-align:center;text-decoration:none;display:block;border:2px solid rgba(255,255,255,.4);}.sec{padding:36px 20px;max-width:480px;margin:0 auto;}.pb{background:#fef2f2;border-left:4px solid #dc2626;padding:14px 18px;border-radius:0 10px 10px 0;margin-bottom:10px;}.pt{font-size:14px;font-weight:800;color:#dc2626;}.fc{background:#f8fafc;border-radius:12px;padding:14px;margin-bottom:8px;display:flex;align-items:flex-start;gap:10px;}.fi{font-size:18px;flex-shrink:0;}.fn{font-size:14px;font-weight:800;color:#1e293b;}.pcard{background:linear-gradient(135deg,#f0f4ff,#e8eeff);border-radius:16px;padding:22px;display:flex;gap:14px;align-items:center;margin:20px 0;}.pi{width:70px;height:70px;border-radius:50%;object-fit:cover;background:#c7d2fe;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;}.pn{font-size:17px;font-weight:900;color:#1a3a6e;}.pt2{font-size:13px;color:#475569;margin-top:3px;}.pq{display:inline-block;background:#1a3a6e;color:#fff;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;margin-top:6px;}.btn-p{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:#2563eb;color:#fff;text-decoration:none;}.btn-s{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:transparent;color:#2563eb;border:2px solid #2563eb;text-decoration:none;}.disc{font-size:11px;color:#9ca3af;line-height:1.8;padding:20px;text-align:center;}</style></head><body><nav><span class="nav-n">${u.intro||u.name||"보험의 기준"}</span>${u.consultUrl?`<a href="${u.consultUrl}" class="nav-b">상담 신청</a>`:""}</nav><div class="hero"><span class="h-tag">무료 보험 점검 서비스</span><h1 class="h-t">내 보험,<br>지금 기준으로<br>다시 점검해보셨나요?</h1><p class="h-s">보험은 가입보다 관리가 더 중요합니다.<br>지금 바로 무료로 확인해 드립니다.</p><div class="h-b">${u.consultUrl?`<a href="${u.consultUrl}" class="bw">📋 무료 상담 신청하기</a>`:""}${u.kakaoUrl?`<a href="${u.kakaoUrl}" class="bo">💬 카카오톡 문의</a>`:""}</div></div><div class="sec"><p style="font-size:12px;font-weight:800;color:#2563eb;letter-spacing:.1em;margin-bottom:10px;">이런 분께 꼭 필요합니다</p>${["갱신형 보험이 많아 보험료 걱정이신 분","실손보험 세대가 바뀌었는지 모르는 분","보장 공백이 있는지 확인하고 싶은 분","보험료는 줄이고 보장은 늘리고 싶은 분"].map((t:string)=>`<div class="pb"><p class="pt">🔴 ${t}</p></div>`).join("")}${u.fields?`<p style="font-size:17px;font-weight:900;color:#111;margin:24px 0 14px;">주요 상담 분야</p>${u.fields.split(",").map((f:string,i:number)=>`<div class="fc"><span class="fi">${["🛡","💊","🏥","🧬","💰","📋","🔍","💡"][i%8]}</span><div><p class="fn">${f.trim()}</p></div></div>`).join("")}`:""}<div class="pcard">${u.profileImg?`<img class="pi" src="${u.profileImg}" alt="">`:`<div class="pi">👤</div>`}<div><p class="pn">${u.name||"이름"}</p><p class="pt2">${u.title||"직함"} · ${u.company||"소속"}</p>${u.qualifications?`<span class="pq">${u.qualifications}</span>`:""}</div></div>${u.consultUrl?`<a href="${u.consultUrl}" class="btn-p">📋 무료 점검 신청하기</a>`:""}${u.kakaoUrl?`<a href="${u.kakaoUrl}" class="btn-s">💬 카카오톡 문의</a>`:""}${u.phone?`<a href="tel:${u.phone}" class="btn-s">📞 전화 상담</a>`:""}<p class="disc">본 페이지는 보험 상담 신청을 위한 안내 페이지이며, 구체적인 보장 내용과 보험료는 개인의 상황, 가입 조건, 보험회사 인수 기준에 따라 달라질 수 있습니다.<br><br>© 보험의 기준(배진우) · 메타리치 시그널그룹</p></div></body></html>`
}

function genRemodeling(u: UserInfo): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>보험 리모델링 | ${u.name||"설계사"}</title><link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700&family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet"><style>${BASE_CSS}body{background:#f9fafb;}.hero{background:linear-gradient(160deg,#0b1e5f,#0e2882);padding:64px 24px 48px;text-align:center;}.ey{font-size:12px;font-weight:800;color:#d4af37;letter-spacing:.14em;text-transform:uppercase;margin-bottom:14px;}.ht{font-family:"Noto Serif KR",serif;font-size:clamp(26px,7vw,38px);font-weight:700;color:#fff;line-height:1.35;margin-bottom:12px;}.ht em{color:#d4af37;font-style:normal;}.hs{font-size:14px;color:rgba(255,255,255,.65);line-height:1.9;margin-bottom:24px;max-width:300px;margin-left:auto;margin-right:auto;}.kr{display:flex;justify-content:center;gap:12px;margin-bottom:24px;}.kp{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);padding:14px 16px;border-radius:10px;text-align:center;}.kn{font-size:20px;font-weight:900;color:#d4af37;line-height:1.2;}.kl{font-size:11px;color:rgba(255,255,255,.5);margin-top:4px;}.hb{display:block;background:#d4af37;color:#0b1e5f;padding:15px;border-radius:10px;font-size:15px;font-weight:900;text-align:center;text-decoration:none;max-width:300px;margin:0 auto;}.sec{padding:36px 20px;max-width:480px;margin:0 auto;}.br{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;}.bg{background:#eff6ff;color:#2563eb;padding:6px 14px;border-radius:100px;font-size:12px;font-weight:700;}.st{display:flex;gap:12px;padding:14px;background:#fff;border-radius:12px;box-shadow:0 1px 6px rgba(0,0,0,.06);margin-bottom:8px;}.sn{width:30px;height:30px;border-radius:50%;background:#0b1e5f;color:#fff;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;}.stit{font-size:14px;font-weight:800;color:#1e293b;margin-bottom:3px;}.sdesc{font-size:13px;color:#64748b;line-height:1.5;}.btn-g{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:#d4af37;color:#0b1e5f;text-decoration:none;}.btn-l{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:transparent;color:#0b1e5f;border:2px solid #0b1e5f;text-decoration:none;}.disc{font-size:11px;color:#9ca3af;line-height:1.8;padding:20px;text-align:center;}</style></head><body><div class="hero"><p class="ey">보험 리모델링 전문</p><h1 class="ht">보험료는 줄이고<br><em>필요한 보장은</em><br>다시 정리합니다</h1><p class="hs">갱신형, CI보험, 실손 세대, 보장 공백까지<br>함께 점검합니다</p><div class="kr"><div class="kp"><p class="kn">최대<br>30%↓</p><p class="kl">보험료 절감</p></div><div class="kp"><p class="kn">1:1<br>무료</p><p class="kl">맞춤 분석</p></div><div class="kp"><p class="kn">48h<br>이내</p><p class="kl">결과 안내</p></div></div>${u.consultUrl?`<a href="${u.consultUrl}" class="hb">🔍 내 보험 무료 점검 받기</a>`:""}</div><div class="sec"><p style="font-size:17px;font-weight:900;color:#0b1e5f;margin-bottom:14px;">이런 보험 있으시면 꼭 점검하세요</p><div class="br">${["갱신형 보험","CI보험","실손 1~4세대","종신보험","저축성보험","고납입 보험"].map((b:string)=>`<span class="bg">${b}</span>`).join("")}</div><p style="font-size:17px;font-weight:900;color:#0b1e5f;margin-bottom:12px;margin-top:24px;">상담 진행 절차</p>${[["신청 접수","카카오톡 또는 전화로 상담 신청"],["보험 분석","현재 보험 증권 기반 무료 분석"],["결과 안내","보장 공백·과납 항목 리포트 제공"],["리모델링 제안","최적 보험 구조 제안"]].map(([t,d]:string[],i:number)=>`<div class="st"><div class="sn">${i+1}</div><div><p class="stit">${t}</p><p class="sdesc">${d}</p></div></div>`).join("")}<div style="margin-top:20px;">${u.consultUrl?`<a href="${u.consultUrl}" class="btn-g">📋 무료 점검 신청하기</a>`:""}${u.kakaoUrl?`<a href="${u.kakaoUrl}" class="btn-l">💬 카카오톡 문의</a>`:""}${u.phone?`<a href="tel:${u.phone}" class="btn-l">📞 전화 상담</a>`:""}</div><p class="disc">© 보험의 기준(배진우) · 메타리치 시그널그룹</p></div></body></html>`
}

function genRecruiting(u: UserInfo): string {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>설계사 모집 | ${u.company||"메타리치"}</title><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&family=Bebas+Neue&display=swap" rel="stylesheet"><style>${BASE_CSS}body{background:#fefcf7;}.hero{background:linear-gradient(135deg,#6d28d9,#8b5cf6);padding:64px 24px 48px;text-align:center;position:relative;overflow:hidden;}.hero::before{content:"";position:absolute;inset:0;background:url(https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=60) center/cover;opacity:.08;}.ey{font-family:"Bebas Neue",sans-serif;font-size:12px;letter-spacing:.3em;color:#fbbf24;margin-bottom:14px;position:relative;}.ht{font-size:clamp(30px,8vw,50px);font-weight:900;color:#fff;line-height:1.15;margin-bottom:14px;position:relative;letter-spacing:-.02em;}.ht em{color:#fbbf24;font-style:normal;}.hs{font-size:14px;color:rgba(255,255,255,.75);line-height:1.9;margin-bottom:24px;position:relative;max-width:280px;margin-left:auto;margin-right:auto;}.hb{display:block;background:#fbbf24;color:#1a1714;padding:17px;border-radius:10px;font-size:15px;font-weight:900;text-align:center;text-decoration:none;max-width:280px;margin:0 auto;position:relative;}.sec{padding:36px 20px;max-width:480px;margin:0 auto;}.sg{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px;}.sc{background:#fff;border:1px solid #e8e2d8;border-radius:12px;padding:14px;}.si{font-size:22px;margin-bottom:6px;}.stt{font-size:13px;font-weight:800;color:#1a1714;margin-bottom:3px;}.sd{font-size:12px;color:#6b7280;line-height:1.5;}.vc{background:#f5f0ff;border-left:4px solid #8b5cf6;padding:14px;border-radius:0 10px 10px 0;margin-bottom:10px;}.vt{font-size:14px;color:#4b5563;line-height:1.7;margin-bottom:6px;}.vn{font-size:12px;font-weight:700;color:#6d28d9;}.pc{background:linear-gradient(135deg,#f5f0ff,#ede9fe);border-radius:16px;padding:20px;display:flex;gap:12px;align-items:center;margin-bottom:18px;}.pi{width:64px;height:64px;border-radius:50%;object-fit:cover;background:#c4b5fd;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;}.pn{font-size:16px;font-weight:900;color:#4c1d95;}.pt2{font-size:13px;color:#6b7280;margin-top:2px;}.btn-p{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:#6d28d9;color:#fff;text-decoration:none;}.btn-s{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:transparent;color:#6d28d9;border:2px solid #6d28d9;text-decoration:none;}.disc{font-size:11px;color:#9ca3af;line-height:1.8;padding:20px;text-align:center;}</style></head><body><div class="hero"><p class="ey">METARICH SIGNAL GROUP · 설계사 모집</p><h1 class="ht">혼자 영업하지<br>않는 설계사<br><em>조직</em></h1><p class="hs">DB영업 · 상담화법 · 콘텐츠<br>자동화까지 함께 성장합니다</p>${u.recruitUrl?`<a href="${u.recruitUrl}" class="hb">🚀 입사 지원하기</a>`:""}</div><div class="sec"><p style="font-size:17px;font-weight:900;color:#4c1d95;margin-bottom:14px;">함께하면 달라지는 것들</p><div class="sg">${[["🎯","DB 영업","검증된 DB와 체계적 접근법"],["💬","상담 화법","성공 화법 전수 및 롤플레이"],["📊","보장분석","전문 분석 자료 및 템플릿"],["📱","콘텐츠","SNS·블로그 콘텐츠 지원"],["⚡","영업 자동화","업무 효율화 시스템 제공"],["🤝","리쿠르팅","조직 성장 지원 시스템"]].map(([i,t,d]:string[])=>`<div class="sc"><p class="si">${i}</p><p class="stt">${t}</p><p class="sd">${d}</p></div>`).join("")}</div><p style="font-size:17px;font-weight:900;color:#4c1d95;margin-bottom:12px;">합류한 분들의 이야기</p>${[["입사 전엔 혼자 다 해야 했는데, 지금은 시스템이 있어서 너무 편해요.","경력 3년차 설계사"],["처음 시작하는 분도 체계적으로 배울 수 있는 환경이 갖춰져 있습니다.","신입 설계사"]].map(([t,n]:string[])=>`<div class="vc"><p class="vt">"${t}"</p><p class="vn">— ${n}</p></div>`).join("")}<div class="pc">${u.profileImg?`<img class="pi" src="${u.profileImg}" alt="">`:`<div class="pi">👤</div>`}<div><p class="pn">${u.name||"이름"}</p><p class="pt2">${u.title||"직함"} · ${u.company||"소속"}</p></div></div>${u.recruitUrl?`<a href="${u.recruitUrl}" class="btn-p">🚀 입사 지원하기</a>`:""}${u.openchatUrl?`<a href="${u.openchatUrl}" class="btn-s">💬 오픈채팅 문의</a>`:""}${u.cafeUrl?`<a href="${u.cafeUrl}" class="btn-s">☕ 카페 방문하기</a>`:""}<p class="disc">© 보험의 기준(배진우) · 메타리치 시그널그룹</p></div></body></html>`
}

// ── WYSIWYG 에디터 주입 스크립트 ──
const EDITOR_INJECT = `<script>

(function(){
  \'use strict\';
  var isEditing = false;
  var currentEditable = null;
  var toolbar = null;
  var linkPopup = null;

  // ── 플로팅 툴바 생성 ──
  function createToolbar() {
    var t = document.createElement(\'div\');
    t.id = \'__bai_toolbar__\';
    t.style.cssText = \'position:fixed;top:-100px;left:0;z-index:99999;display:flex;align-items:center;gap:3px;background:#1a1a1a;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:6px 8px;box-shadow:0 8px 30px rgba(0,0,0,.6);transition:opacity .15s;\';
    var btns = [
      [\'B\',\'bold\',\'굵게\',{fontWeight:\'bold\'}],
      [\'I\',\'italic\',\'기울임\',{fontStyle:\'italic\'}],
      [\'U\',\'underline\',\'밑줄\',{textDecoration:\'underline\'}],
    ];
    btns.forEach(function(b){
      var btn = document.createElement(\'button\');
      btn.textContent = b[0]; btn.title = b[2];
      btn.style.cssText = \'width:28px;height:28px;border:none;border-radius:6px;background:rgba(255,255,255,.08);color:#fff;font-size:13px;cursor:pointer;font-family:system-ui;\';
      Object.assign(btn.style, b[3]);
      btn.onmousedown = function(e){ e.preventDefault(); document.execCommand(b[1]); };
      t.appendChild(btn);
    });
    // 구분선
    var sep = document.createElement(\'div\');
    sep.style.cssText = \'width:1px;height:20px;background:rgba(255,255,255,.15);margin:0 3px;\';
    t.appendChild(sep);
    // 색상 팔레트
    [\'#ffffff\',\'#111827\',\'#1a3a6e\',\'#2563eb\',\'#d4af37\',\'#dc2626\',\'#16a34a\',\'#6d28d9\'].forEach(function(c){
      var dot = document.createElement(\'button\');
      dot.style.cssText = \'width:18px;height:18px;border-radius:50%;border:1.5px solid rgba(255,255,255,.25);background:\'+c+\';cursor:pointer;\';
      dot.title = c;
      dot.onmousedown = function(e){ e.preventDefault(); document.execCommand(\'foreColor\',false,c); };
      t.appendChild(dot);
    });
    // 폰트 크기
    var sep2 = sep.cloneNode();
    t.appendChild(sep2);
    [12,14,16,18,22,28,36].forEach(function(sz){
      var btn = document.createElement(\'button\');
      btn.textContent = sz+\'px\';
      btn.style.cssText = \'padding:2px 5px;border:none;border-radius:4px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);font-size:10px;cursor:pointer;font-family:system-ui;\';
      btn.onmousedown = function(e){ e.preventDefault(); if(currentEditable) currentEditable.style.fontSize=sz+\'px\'; };
      t.appendChild(btn);
    });
    // 링크 버튼
    var sep3 = sep.cloneNode();
    t.appendChild(sep3);
    var linkBtn = document.createElement(\'button\');
    linkBtn.textContent = \'🔗\';
    linkBtn.title = \'링크 편집\';
    linkBtn.style.cssText = \'width:28px;height:28px;border:none;border-radius:6px;background:rgba(255,255,255,.08);color:#fff;font-size:13px;cursor:pointer;\';
    linkBtn.onmousedown = function(e){ e.preventDefault(); showLinkPopup(); };
    t.appendChild(linkBtn);
    // 취소 버튼
    var sep4 = sep.cloneNode();
    t.appendChild(sep4);
    var cancelBtn = document.createElement(\'button\');
    cancelBtn.textContent = \'✕\';
    cancelBtn.title = \'편집 종료\';
    cancelBtn.style.cssText = \'width:28px;height:28px;border:none;border-radius:6px;background:rgba(239,68,68,.2);color:#f87171;font-size:13px;cursor:pointer;\';
    cancelBtn.onmousedown = function(e){ e.preventDefault(); exitEditing(); };
    t.appendChild(cancelBtn);
    document.body.appendChild(t);
    return t;
  }

  // ── 링크 팝업 ──
  function createLinkPopup() {
    var p = document.createElement(\'div\');
    p.id = \'__bai_linkpopup__\';
    p.style.cssText = \'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;background:#1e1e1e;border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:20px;width:320px;box-shadow:0 20px 60px rgba(0,0,0,.8);display:none;font-family:system-ui;\';
    p.innerHTML = \'<p style="color:#fff;font-weight:800;font-size:14px;margin-bottom:12px;">🔗 링크 편집</p>\'
      +\'<input id="__bai_link_input__" placeholder="https://" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:#fff;font-size:13px;outline:none;margin-bottom:10px;">\'
      +\'<div style="display:flex;gap:8px;">\'
      +\'<button id="__bai_link_save__" style="flex:1;padding:10px;border-radius:8px;background:#d4af37;color:#000;border:none;font-size:13px;font-weight:800;cursor:pointer;">저장</button>\'
      +\'<button id="__bai_link_cancel__" style="flex:1;padding:10px;border-radius:8px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.1);font-size:13px;cursor:pointer;">취소</button>\'
      +\'</div>\';
    document.body.appendChild(p);
    p.querySelector(\'#__bai_link_save__\').onclick = function(){
      var url = p.querySelector(\'#__bai_link_input__\').value;
      if(currentEditable && currentEditable.tagName===\'A\') { currentEditable.href = url; currentEditable.setAttribute(\'data-href\',url); }
      p.style.display=\'none\';
      sendChange();
    };
    p.querySelector(\'#__bai_link_cancel__\').onclick = function(){ p.style.display=\'none\'; };
    return p;
  }

  function showLinkPopup() {
    if(!linkPopup) linkPopup = createLinkPopup();
    var input = linkPopup.querySelector(\'#__bai_link_input__\');
    if(currentEditable && currentEditable.tagName===\'A\') input.value = currentEditable.getAttribute(\'href\')||\'\';
    else input.value=\'\';
    linkPopup.style.display=\'block\';
    input.focus();
  }

  // ── 툴바 위치 갱신 ──
  function updateToolbarPosition() {
    if(!toolbar) return;
    var sel = window.getSelection();
    if(!sel || sel.isCollapsed || !currentEditable) { toolbar.style.top=\'-100px\'; return; }
    try {
      var range = sel.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      if(rect.width===0) { toolbar.style.top=\'-100px\'; return; }
      var tx = Math.max(8, Math.min(rect.left + rect.width/2 - 180, window.innerWidth-380));
      var ty = Math.max(8, rect.top - 52);
      toolbar.style.left = tx+\'px\';
      toolbar.style.top = ty+\'px\';
    } catch(e){}
  }

  // ── 편집 가능 요소 활성화 ──
  var EDITABLE_SELECTORS = \'h1,h2,h3,h4,h5,h6,p,span,li,td,th,label,blockquote,.hero-title,.hero-sub,.section-title,.section-subtitle,.nav-logo,.nav-cta,button:not([id*="bai"]),[class*="title"],[class*="subtitle"],[class*="heading"],[class*="desc"],[class*="text"],[class*="caption"],[class*="label"],[class*="name"],[class*="intro"],[class*="-sub"],[class*="-tag"],[class*="eyebrow"],[class*="badge"],[class*="kpi"],[class*="stat"]\';

  function makeEditable(el) {
    if(!el || el.id && el.id.includes(\'bai\')) return;
    if(currentEditable === el) return;
    exitEditing();
    currentEditable = el;
    el.contentEditable = \'true\';
    el.style.outline = \'2px solid #d4af37\';
    el.style.outlineOffset = \'2px\';
    el.style.borderRadius = \'3px\';
    el.focus();
    isEditing = true;
    if(!toolbar) toolbar = createToolbar();
  }

  function exitEditing() {
    if(currentEditable) {
      currentEditable.contentEditable = \'false\';
      currentEditable.style.outline = \'\';
      currentEditable.style.outlineOffset = \'\';
      sendChange();
    }
    currentEditable = null;
    isEditing = false;
    if(toolbar) toolbar.style.top = \'-100px\';
  }

  // ── 섹션 컨트롤 (삭제 버튼) ──
  function addSectionControls() {
    var sections = document.querySelectorAll(\'section, [class*="section"], [class*="-sec"], [class*="block"], [class*="-block"], [class*="hero"], [class*="features"], [class*="cta"]\');
    sections.forEach(function(sec){
      if(sec.querySelector(\'[id*="bai-del"]\')) return;
      sec.style.position = \'relative\';
      var btn = document.createElement(\'button\');
      btn.id = \'__bai-del-\'+Math.random().toString(36).substr(2,6)+\'__\';
      btn.title = \'이 섹션 삭제\';
      btn.textContent = \'✕ 삭제\';
      btn.style.cssText = \'position:absolute;top:8px;right:8px;z-index:9999;background:rgba(239,68,68,.85);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer;display:none;font-family:system-ui;\';
      btn.onclick = function(e){ e.stopPropagation(); if(confirm(\'이 섹션을 삭제할까요?\')){ sec.remove(); sendChange(); }};
      sec.appendChild(btn);
      sec.addEventListener(\'mouseenter\',function(){ btn.style.display=\'block\'; });
      sec.addEventListener(\'mouseleave\',function(){ btn.style.display=\'none\'; });
    });
  }

  // ── 이미지 클릭 교체 ──
  function addImageControls() {
    document.querySelectorAll(\'img\').forEach(function(img){
      if(img.dataset.baiDone) return;
      img.dataset.baiDone=\'1\';
      img.style.cursor=\'pointer\';
      img.title=\'클릭해서 이미지 교체\';
      img.addEventListener(\'click\',function(e){
        e.stopPropagation();
        var inp = document.createElement(\'input\');
        inp.type=\'file\'; inp.accept=\'image/*\';
        inp.onchange=function(){
          if(!inp.files[0]) return;
          var reader = new FileReader();
          reader.onload=function(ev){ img.src=ev.target.result; sendChange(); };
          reader.readAsDataURL(inp.files[0]);
        };
        inp.click();
      });
    });
  }

  // ── 링크 버튼 (a 태그 호버) ──
  function addLinkControls() {
    document.querySelectorAll(\'a[href]:not([href^="#"])\').forEach(function(a){
      if(a.dataset.baiLink) return;
      a.dataset.baiLink=\'1\';
      var badge = document.createElement(\'span\');
      badge.textContent=\'🔗\';
      badge.title=\'링크 편집\';
      badge.style.cssText=\'position:absolute;top:-10px;right:-6px;z-index:9999;background:#03c75a;color:#fff;border-radius:100px;font-size:10px;padding:2px 5px;cursor:pointer;display:none;\';
      if(getComputedStyle(a).position===\'static\') a.style.position=\'relative\';
      badge.onclick=function(e){e.stopPropagation();currentEditable=a;showLinkPopup();};
      a.appendChild(badge);
      a.addEventListener(\'mouseenter\',function(){badge.style.display=\'inline\';});
      a.addEventListener(\'mouseleave\',function(){badge.style.display=\'none\';});
    });
  }

  // ── 변경사항 부모에 전송 ──
  function sendChange() {
    try {
      window.parent.postMessage({
        type:\'__BAI_CHANGE__\',
        html: document.documentElement.outerHTML
      },\'*\');
    } catch(e){}
  }

  // ── 부모 메시지 수신 ──
  window.addEventListener(\'message\',function(e){
    if(!e.data || e.data.type!==\'__BAI_CMD__\') return;
    var cmd=e.data.cmd, val=e.data.val;
    if(cmd===\'fill\') {
      // 자동 채우기: {key, from, to}
      try {
        var walker = document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
        var node;
        while((node=walker.nextNode())){
          if(node.nodeValue && node.nodeValue.includes(val.from)) {
            node.nodeValue = node.nodeValue.split(val.from).join(val.to);
          }
        }
        sendChange();
      } catch(e2){}
    }
    if(cmd===\'resetHover\') {
      document.querySelectorAll(\'button[id*="bai-del"]\').forEach(function(b){b.style.display=\'none\';});
    }
    if(cmd===\'setEditMode\'){
      if(!val){
        exitEditing();
        document.querySelectorAll(\'[id*="bai-del"]\').forEach(function(b){b.style.display=\'none\';});
        if(toolbar) toolbar.style.top=\'-100px\';
        document.querySelectorAll(\'[data-bai-link] span\').forEach(function(s){s.style.display=\'none\';});
      } else {
        addSectionControls(); addImageControls(); addLinkControls();
      }
    }
    if(cmd===\'getSections\'){
      var ss=document.querySelectorAll(\'section,[class*="section"],[class*="-sec"],[class*="hero"],[class*="block"],[class*="-block"],[class*="features"],[class*="cta"]\');
      var rs=[];
      ss.forEach(function(s,i){
        if(s.querySelector(\'[id*="bai"]\') && !s.querySelector(\'h1,h2,h3,h4,p\')) return;
        var h=s.querySelector(\'h1,h2,h3,h4,h5,p\');
        rs.push({index:i, text:h?h.textContent.trim().slice(0,30):\'섹션\'+(i+1)});
      });
      window.parent.postMessage({type:\'__BAI_SECTIONS__\',sections:rs},\'*\');
    }
    if(cmd===\'deleteSection\'){
      var ss2=document.querySelectorAll(\'section,[class*="section"],[class*="-sec"],[class*="hero"],[class*="block"],[class*="-block"],[class*="features"],[class*="cta"]\');
      if(ss2[val]){ ss2[val].remove(); sendChange(); }
      // 삭제 후 목록 재전송
      var ss3=document.querySelectorAll(\'section,[class*="section"],[class*="-sec"],[class*="hero"],[class*="block"],[class*="-block"],[class*="features"],[class*="cta"]\');
      var rs2=[];
      ss3.forEach(function(s,i){
        var h=s.querySelector(\'h1,h2,h3,h4,h5,p\');
        rs2.push({index:i, text:h?h.textContent.trim().slice(0,30):\'섹션\'+(i+1)});
      });
      window.parent.postMessage({type:\'__BAI_SECTIONS__\',sections:rs2},\'*\');
    }
  });

  // ── 이벤트 연결 ──
  document.addEventListener(\'click\',function(e){
    if(e.target.id && e.target.id.includes(\'bai\')) return;
    if(e.target.matches(EDITABLE_SELECTORS)) makeEditable(e.target);
    else if(!e.target.closest(\'[id*="bai"]\')) { if(isEditing) exitEditing(); }
  });

  document.addEventListener(\'mouseup\',function(){ setTimeout(updateToolbarPosition,10); });
  document.addEventListener(\'keydown\',function(e){
    if(e.key===\'Escape\' && isEditing) exitEditing();
    if(isEditing) setTimeout(function(){ sendChange(); },300);
  });

  // ── 초기화 ──
  setTimeout(function(){
    addSectionControls();
    addImageControls();
    addLinkControls();
  },800);

  // body.dp-editing 클래스 추가 (기존 dp 스타일 활용)
  document.body.classList.add(\'dp-editing\',\'__bai_edit_mode__\');

})();

<\/script>`

function injectEditor(html: string): string {
  if (html.includes('__bai_toolbar__')) return html
  return html.replace('</body>', EDITOR_INJECT + '\n</body>')
}

// ── 저작권 모달 ──
function CopyrightModal({ onClose, onDownload }: { onClose:()=>void; onDownload:()=>void }) {
  const [ok, setOk] = useState(false)
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16,fontFamily:"system-ui"}}>
      <div style={{background:"#1a1a1a",border:"1px solid rgba(255,255,255,.12)",borderRadius:18,maxWidth:420,width:"100%",overflow:"hidden"}}>
        <div style={{background:"#111",padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><p style={{color:"#fff",fontWeight:900,fontSize:15}}>📋 저작권 동의 필수</p><p style={{color:"rgba(255,255,255,.4)",fontSize:11,marginTop:2}}>다운로드 전 아래 내용을 확인하고 동의해 주세요.</p></div>
          <button onClick={onClose} style={{color:"rgba(255,255,255,.4)",fontSize:18,background:"none",border:"none",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:"16px 20px",maxHeight:280,overflowY:"auto"}}>
          {[
            {n:"1",t:"저작권 귀속",b:<>본 빌더의 모든 템플릿 저작권은 <strong style={{color:"#fff"}}>보험의 기준(배진우)</strong>에게 있습니다.</>},
            {n:"2",t:"허용 범위",b:"본인 영업·홍보, 고객 전달, 제안서 브리핑, 세미나 자료 등 영업 목적 사용 허용."},
            {n:"3",t:"금지 행위",b:<ul style={{listStyle:"none",marginTop:4}}>{["유사 빌더·SaaS 제작에 활용","템플릿 재배포·재판매","타 조직 홍보물로 무단 사용"].map(s=><li key={s} style={{color:"#f87171",fontSize:12,padding:"2px 0",display:"flex",gap:4}}><span>•</span><span>{s}</span></li>)}</ul>},
            {n:"4",t:"법적 조치",b:"위반 시 저작권법·부정경쟁방지법에 따라 법적 책임을 질 수 있습니다."},
          ].map(({n,t,b})=><div key={n} style={{marginBottom:12}}><p style={{color:"#d4af37",fontSize:12,fontWeight:800,marginBottom:4}}>{n}. {t}</p><p style={{color:"rgba(255,255,255,.55)",fontSize:12,lineHeight:1.7}}>{b}</p></div>)}
        </div>
        <div style={{margin:"0 20px 12px",background:ok?"rgba(212,175,55,.1)":"rgba(255,255,255,.04)",border:`1.5px solid ${ok?"#d4af37":"rgba(255,255,255,.1)"}`,borderRadius:9,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setOk(v=>!v)}>
          <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${ok?"#d4af37":"rgba(255,255,255,.3)"}`,background:ok?"#d4af37":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#000",flexShrink:0}}>{ok?"✓":""}</div>
          <p style={{color:ok?"#d4af37":"rgba(255,255,255,.6)",fontSize:13,fontWeight:700}}>위 내용을 모두 확인했으며 동의합니다</p>
        </div>
        <div style={{padding:"0 20px 20px",display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:12,borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"transparent",color:"rgba(255,255,255,.5)",fontSize:12,fontWeight:700,cursor:"pointer"}}>취소</button>
          <button onClick={()=>{if(ok){onDownload();onClose()}}} disabled={!ok} style={{flex:2,padding:12,borderRadius:9,background:ok?"#d4af37":"rgba(255,255,255,.07)",color:ok?"#000":"rgba(255,255,255,.2)",fontSize:12,fontWeight:900,cursor:ok?"pointer":"not-allowed",border:"none"}}>동의하고 다운로드</button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ──
export default function BrandingAIPageInner({ user: _user }: { user?: any }) {
  const [info, setInfo]           = useState<UserInfo>(()=>ls_get("bai_v3_user", DEFAULT_USER))
  const [tplId, setTplId]         = useState("ins-consult")
  const [device, setDevice]       = useState<DeviceMode>("mobile")
  const [cat, setCat]             = useState("전체")
  const [panel, setPanel]         = useState(0)   // 0=정보 1=템플릿 2=저장
  const [saved, setSaved]         = useState<SavedPage[]>(()=>ls_get("bai_v3_saved",[]))
  const [saveName, setSaveName]   = useState("")
  const [showCopy, setShowCopy]   = useState(false)
  const [currentHtml, setCurrentHtml] = useState("")
  const [loading, setLoading]     = useState(false)
  const [iKey, setIKey]           = useState(0)
  const [editMode, setEditMode]   = useState(true)
  const [sections, setSections]   = useState<{index:number; text:string}[]>([])
  const imgRef = useRef<HTMLInputElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(()=>{ ls_set("bai_v3_user", info) }, [info])

  // users 테이블에서 phone/email/name 자동 로드 (localStorage에 없을 때만)
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from("users")
        .select("name, phone, email, rank, department_name, headquarter_name")
        .eq("id", session.user.id)
        .maybeSingle()
      if (!data) return
      setInfo(prev => ({
        ...prev,
        name: prev.name && prev.name !== DEFAULT_USER.name ? prev.name : (data.name || prev.name),
        phone: prev.phone || data.phone || "",
        email: prev.email || data.email || session.user.email || "",
        title: prev.title && prev.title !== DEFAULT_USER.title ? prev.title : (data.rank || prev.title),
        company: prev.company && prev.company !== DEFAULT_USER.company ? prev.company
          : (data.headquarter_name || data.department_name || prev.company),
      }))
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tpl = TEMPLATES.find(t=>t.id===tplId)!

  // 템플릿 로드
  const loadTemplate = useCallback(async (id: string, u: UserInfo) => {
    const t = TEMPLATES.find(x=>x.id===id)
    if(!t) return
    if(t.type==="insurance") {
      setCurrentHtml(injectEditor(genInsHtml(id, u)))
      setIKey(k=>k+1)
    } else {
      setLoading(true)
      try {
        const r = await fetch(t.file!)
        const html = await r.text()
        setCurrentHtml(injectEditor(html))
        setIKey(k=>k+1)
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
  }, [])

  useEffect(()=>{ loadTemplate(tplId, info) }, [tplId])

  // insurance 템플릿: 정보 바뀌면 즉시 갱신
  useEffect(()=>{
    if(tpl?.type==="insurance") {
      setCurrentHtml(injectEditor(genInsHtml(tplId, info)))
      setIKey(k=>k+1)
    }
  }, [info])

  // editMode 변경 → iframe 전달
  useEffect(()=>{
    const iframe = iframeRef.current
    if(!iframe) return
    // iframe 로드 후 전달
    const send = () => iframe.contentWindow?.postMessage({type:"__BAI_CMD__",cmd:"setEditMode",val:editMode},"*")
    iframe.addEventListener("load", send)
    send()
    return ()=>iframe.removeEventListener("load", send)
  }, [editMode, iKey])

  // iframe에서 변경 수신
  useEffect(()=>{
    const handler = (e: MessageEvent) => {
      if(e.data?.type==="__BAI_CHANGE__" && e.data.html) {
        setCurrentHtml(e.data.html)
      }
      if(e.data?.type==="__BAI_SECTIONS__") {
        setSections(e.data.sections || [])
      }
    }
    window.addEventListener("message", handler)
    return ()=>window.removeEventListener("message", handler)
  }, [])

  const upd = (f: keyof UserInfo, v: string) => setInfo(p=>({...p,[f]:v}))

  // 자동 채우기: iframe DOM에서 텍스트 교체
  const autoFill = (from: string, to: string) => {
    iframeRef.current?.contentWindow?.postMessage({type:"__BAI_CMD__",cmd:"fill",val:{from,to}},"*")
  }

  const handleFieldChange = (f: keyof UserInfo, v: string, old: string) => {
    upd(f, v)
    if(tpl?.type==="external" && old && v && old!==v) autoFill(old, v)
  }

  const doDownload = () => {
    const b = new Blob([currentHtml],{type:"text/html;charset=utf-8"})
    const u = URL.createObjectURL(b)
    const a = document.createElement("a")
    a.href=u; a.download=`${tpl?.name||"page"}-${info.name||"설계사"}.html`; a.click()
    URL.revokeObjectURL(u)
  }

  const handleSave = () => {
    if(!saveName.trim()) return
    const e: SavedPage = {id:Date.now().toString(),name:saveName.trim(),templateId:tplId,userInfo:info,html:currentHtml,savedAt:new Date().toLocaleDateString("ko-KR")}
    const u=[...saved,e]; setSaved(u); ls_set("bai_v3_saved",u); setSaveName(""); alert(`"${e.name}" 저장 완료!`)
  }

  const filteredTpls = cat==="전체" ? TEMPLATES : TEMPLATES.filter(t=>t.cat===cat)

  // 사이드바 필드 팁
  const TIPS: Partial<Record<keyof UserInfo, string>> = {
    name: "이름 또는 활동명. 페이지 상단 프로필에 크게 노출됩니다.",
    title: "AFPK, CFP, 재무설계사 등 직함을 입력하세요.",
    company: "소속 법인·지점명을 정확히 입력하세요.",
    phone: "전화하기 버튼의 tel: 링크로 자동 연결됩니다.",
    kakaoUrl: "카카오채널 또는 오픈채팅 링크를 넣으면 버튼이 활성화됩니다.",
    consultUrl: "네이버 폼, 구글 폼, 카카오 채널 등 상담 신청 페이지 URL.",
    fields: "쉼표로 구분. 예: 보장분석, 연금 상담, 실손보험 점검",
  }

  const D_W: Record<DeviceMode,string> = {pc:"100%",tablet:"768px",mobile:"390px"}
  const D_H: Record<DeviceMode,string> = {pc:"calc(100vh - 52px)",tablet:"900px",mobile:"750px"}

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#0c0c0c",overflow:"hidden",fontFamily:"system-ui,sans-serif"}}>

      {/* ══ 상단 툴바 ══ */}
      <header style={{display:"flex",alignItems:"center",gap:8,padding:"0 14px",height:48,background:"#111",borderBottom:"1px solid rgba(255,255,255,.1)",flexShrink:0}}>
        <span style={{fontSize:15,fontWeight:900,color:"#fff",marginRight:4}}>🎨 브랜딩 AI</span>

        {/* 디바이스 토글 */}
        <div style={{display:"flex",alignItems:"center",gap:2,background:"rgba(255,255,255,.06)",borderRadius:9,padding:3,marginLeft:4}}>
          {(["pc","tablet","mobile"] as DeviceMode[]).map(d=>(
            <button key={d} onClick={()=>setDevice(d)} style={{padding:"4px 9px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:800,background:device===d?"#d4af37":"transparent",color:device===d?"#000":"rgba(255,255,255,.35)"}}>
              {d==="pc"?"🖥 PC":d==="tablet"?"📱 태블릿":"📱 모바일"}
            </button>
          ))}
        </div>

        {/* 편집/미리보기 토글 */}
        <button
          onClick={()=>setEditMode(v=>!v)}
          style={{
            padding:"5px 12px", borderRadius:7, border:"none", cursor:"pointer",
            fontSize:11, fontWeight:900, marginLeft:8,
            background: editMode ? "rgba(212,175,55,.15)" : "rgba(255,255,255,.06)",
            color: editMode ? "#d4af37" : "rgba(255,255,255,.45)",
            outline: editMode ? "1px solid rgba(212,175,55,.35)" : "1px solid rgba(255,255,255,.08)",
          }}
        >
          {editMode ? "✏️ 편집 중" : "👁 미리보기"}
        </button>

        <div style={{flex:1}} />

        {/* 툴바 액션 */}
        {[
          {label:"▶ 미리보기",   action:()=>{ const w=window.open("","_blank"); if(w){w.document.write(currentHtml);w.document.close()} }},
          {label:"🔄 초기화",    action:()=>{ if(confirm("초기화할까요?")) loadTemplate(tplId,info) }},
          {label:"💾 저장",      action:()=>setPanel(2)},
          {label:"📂 불러오기", action:()=>{ const s=saved[saved.length-1]; if(s){setInfo(s.userInfo);setTplId(s.templateId);setCurrentHtml(injectEditor(s.html))} else alert("저장된 페이지 없음")}},
          {label:"📷 이미지 관리", action:()=>imgRef.current?.click()},
        ].map(b=>(
          <button key={b.label} onClick={b.action} style={{padding:"5px 10px",border:"1px solid rgba(255,255,255,.1)",borderRadius:7,background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.55)",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
            {b.label}
          </button>
        ))}
        <button onClick={()=>setShowCopy(true)} style={{padding:"5px 12px",borderRadius:7,background:"#d4af37",color:"#000",border:"none",fontSize:11,fontWeight:900,cursor:"pointer",whiteSpace:"nowrap",marginLeft:2}}>
          ⬇ HTML 다운로드
        </button>
        <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{if(e.target.files?.[0]){const b=await toB64(e.target.files[0]);upd("profileImg",b)}}} />
      </header>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ══ 사이드바 ══ */}
        <aside style={{width:272,flexShrink:0,display:"flex",flexDirection:"column",background:"#111",borderRight:"1px solid rgba(255,255,255,.08)",overflow:"hidden"}}>
          {/* 패널 탭 */}
          <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
            {["① 정보","② 템플릿","③ 저장","④ 섹션"].map((t,i)=>(
              <button key={i} onClick={()=>{setPanel(i); if(i===3) iframeRef.current?.contentWindow?.postMessage({type:"__BAI_CMD__",cmd:"getSections",val:null},"*")}} style={{flex:1,padding:"9px 3px",border:"none",background:"transparent",cursor:"pointer",fontSize:10,fontWeight:800,color:panel===i?"#d4af37":"rgba(255,255,255,.25)",borderBottom:panel===i?"2px solid #d4af37":"2px solid transparent"}}>
                {t}
              </button>
            ))}
          </div>

          <div style={{flex:1,overflowY:"auto",padding:10}}>

            {/* 패널 0: 정보 입력 */}
            {panel===0 && <>
              <SBox title="프로필 이미지">
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  {info.profileImg
                    ? <img src={info.profileImg} style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid #d4af37"}} alt="" />
                    : <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>
                  }
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    <Tbtn onClick={()=>imgRef.current?.click()} label="+ 이미지 업로드" />
                    {info.profileImg && <Tbtn onClick={()=>upd("profileImg","")} label="삭제" danger />}
                  </div>
                </div>
              </SBox>

              <SBox title="기본 정보">
                {([
                  ["name","이름 *","배진우"],
                  ["title","직함","AFPK 재무설계사"],
                  ["company","소속 *","메타리치 시그널그룹"],
                  ["branch","지점/팀",""],
                  ["phone","전화번호","010-"],
                  ["email","이메일",""],
                  ["intro","브랜드명","보험의 기준"],
                  ["qualifications","자격사항","AFPK"],
                ] as [keyof UserInfo,string,string][]).map(([f,l,p])=>(
                  <FR key={f} label={l} val={info[f] as string} ph={p} tip={TIPS[f]}
                    onChange={v=>handleFieldChange(f, v, info[f] as string)} />
                ))}
              </SBox>

              <SBox title="상담 분야 (쉼표 구분)">
                <FR label="" val={info.fields} ph="보장분석, 리모델링, 연금..." tip={TIPS.fields}
                  onChange={v=>handleFieldChange("fields",v,info.fields)} multiline />
              </SBox>

              <SBox title="링크 설정">
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
                  <FR key={f} label={l} val={info[f] as string} ph="https://" tip={TIPS[f]}
                    onChange={v=>handleFieldChange(f,v,info[f] as string)} />
                ))}
              </SBox>

              {/* 미세 조정 팁 */}
              <div style={{background:"rgba(212,175,55,.05)",border:"1px solid rgba(212,175,55,.18)",borderRadius:10,padding:12,marginTop:4}}>
                <p style={{fontSize:11,color:"rgba(212,175,55,.9)",fontWeight:800,marginBottom:7}}>💡 미세 조정 팁</p>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {[
                    "보험 전용 템플릿은 정보 입력 즉시 실시간 반영됩니다",
                    "외부 템플릿은 입력값으로 기존 텍스트를 자동 교체합니다",
                    "미리보기에서 텍스트를 직접 클릭해 수정할 수 있습니다",
                    "섹션 위에 마우스를 올리면 삭제 버튼이 나타납니다",
                    "링크는 없으면 버튼이 자동으로 숨겨집니다",
                    "이미지 클릭 → 새 이미지로 즉시 교체 가능",
                  ].map(t=><p key={t} style={{fontSize:10,color:"rgba(255,255,255,.35)",lineHeight:1.6,display:"flex",gap:4}}><span style={{color:"#d4af37",flexShrink:0}}>•</span><span>{t}</span></p>)}
                </div>
              </div>
            </>}

            {/* 패널 1: 템플릿 */}
            {panel===1 && <>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                {ALL_CATS.map(c=>(
                  <button key={c} onClick={()=>setCat(c)} style={{padding:"3px 8px",borderRadius:100,border:"none",cursor:"pointer",fontSize:10,fontWeight:800,background:cat===c?"#d4af37":"rgba(255,255,255,.07)",color:cat===c?"#000":"rgba(255,255,255,.4)"}}>
                    {c}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {filteredTpls.map(t=>(
                  <button key={t.id} onClick={()=>setTplId(t.id)} style={{textAlign:"left",padding:"9px 11px",borderRadius:9,border:`1.5px solid ${tplId===t.id?"#d4af37":"rgba(255,255,255,.07)"}`,background:tplId===t.id?"rgba(212,175,55,.07)":"rgba(255,255,255,.02)",cursor:"pointer",display:"flex",alignItems:"center",gap:9}}>
                    <div style={{width:28,height:28,borderRadius:6,background:t.color,flexShrink:0,border:"1px solid rgba(255,255,255,.1)"}} />
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <p style={{fontSize:12,fontWeight:800,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</p>
                        {tplId===t.id && <span style={{fontSize:9,background:"#d4af37",color:"#000",padding:"1px 5px",borderRadius:100,fontWeight:900,flexShrink:0}}>✓</span>}
                      </div>
                      <p style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:2}}>{t.cat}{t.type==="external"?" · 직접편집용":""}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>}

            {/* 패널 2: 저장 */}
            {panel===2 && <>
              <SBox title="현재 페이지 저장">
                <div style={{display:"flex",gap:6}}>
                  <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="저장 이름" style={{flex:1,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:7,padding:"7px 9px",fontSize:12,color:"#fff",outline:"none"}} />
                  <button onClick={handleSave} disabled={!saveName.trim()} style={{padding:"7px 11px",borderRadius:7,background:saveName.trim()?"#d4af37":"rgba(255,255,255,.07)",color:saveName.trim()?"#000":"rgba(255,255,255,.2)",border:"none",fontSize:11,fontWeight:900,cursor:saveName.trim()?"pointer":"not-allowed"}}>저장</button>
                </div>
              </SBox>
              {saved.length>0 && <SBox title={`저장된 페이지 (${saved.length})`}>
                {saved.map(p=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                    <div><p style={{fontSize:12,fontWeight:700,color:"#fff"}}>{p.name}</p><p style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:2}}>{p.savedAt}</p></div>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>{if(confirm(`"${p.name}" 불러올까요?`)){setInfo(p.userInfo);setTplId(p.templateId);setCurrentHtml(injectEditor(p.html));setIKey(k=>k+1)}}} style={{padding:"3px 7px",borderRadius:5,border:"1px solid rgba(212,175,55,.3)",background:"transparent",color:"#d4af37",fontSize:10,fontWeight:700,cursor:"pointer"}}>불러오기</button>
                      <button onClick={()=>{const u=saved.filter(x=>x.id!==p.id);setSaved(u);ls_set("bai_v3_saved",u)}} style={{padding:"3px 7px",borderRadius:5,border:"1px solid rgba(248,113,113,.2)",background:"transparent",color:"#f87171",fontSize:10,fontWeight:700,cursor:"pointer"}}>삭제</button>
                    </div>
                  </div>
                ))}
              </SBox>}
              <SBox title="초기화">
                <button onClick={()=>{if(confirm("전체 초기화할까요?")){setInfo(DEFAULT_USER);setTplId("ins-consult")}}} style={{width:"100%",padding:9,borderRadius:8,background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.18)",color:"#f87171",fontSize:11,fontWeight:700,cursor:"pointer"}}>🗑 전체 초기화</button>
              </SBox>
            </>}

            {/* 패널 3: 섹션 관리 */}
            {panel===3 && <>
              <div style={{marginBottom:8}}>
                <button
                  onClick={()=>iframeRef.current?.contentWindow?.postMessage({type:"__BAI_CMD__",cmd:"getSections",val:null},"*")}
                  style={{width:"100%",padding:"7px 0",borderRadius:7,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.45)",fontSize:11,fontWeight:700,cursor:"pointer"}}
                >
                  🔄 섹션 목록 새로고침
                </button>
              </div>
              <SBox title={`현재 섹션 (${sections.length}개)`}>
                {sections.length===0
                  ? <p style={{fontSize:10,color:"rgba(255,255,255,.25)",lineHeight:1.8,padding:"4px 0"}}>위 버튼을 눌러 섹션을 불러오세요.<br/>미리보기에서 섹션 hover → ✕ 버튼으로도 삭제 가능합니다.</p>
                  : sections.map((s)=>(
                    <div key={s.index} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                      <p style={{fontSize:11,color:"rgba(255,255,255,.55)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,paddingRight:6}}>
                        <span style={{color:"rgba(255,255,255,.2)",marginRight:5,fontSize:10}}>{s.index+1}.</span>
                        {s.text}
                      </p>
                      <button
                        onClick={()=>{
                          if(confirm(`"${s.text}" 섹션을 삭제할까요?`))
                            iframeRef.current?.contentWindow?.postMessage({type:"__BAI_CMD__",cmd:"deleteSection",val:s.index},"*")
                        }}
                        style={{flexShrink:0,padding:"2px 7px",borderRadius:5,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#f87171",fontSize:10,fontWeight:700,cursor:"pointer"}}
                      >✕</button>
                    </div>
                  ))
                }
              </SBox>
              <SBox title="섹션 추가 (보험 전용 템플릿)">
                {["📋 FAQ","💬 고객 후기","📞 상담신청폼","🎯 배너"].map(name=>(
                  <button key={name} style={{display:"block",width:"100%",textAlign:"left",padding:"7px 9px",marginBottom:5,borderRadius:7,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",color:"rgba(255,255,255,.4)",fontSize:11,fontWeight:700,cursor:"not-allowed",opacity:.5}}>
                    {name} <span style={{fontSize:9,color:"rgba(255,255,255,.2)"}}>— 보험 전용 템플릿 전용</span>
                  </button>
                ))}
                <p style={{fontSize:9,color:"rgba(255,255,255,.2)",marginTop:6,lineHeight:1.6}}>외부 템플릿은 HTML을 다운로드 후 직접 편집하세요.</p>
              </SBox>
            </>}
          </div>
        </aside>

        {/* ══ 미리보기 + 편집 영역 ══ */}
        <main style={{flex:1,background:"#0a0a0a",display:"flex",flexDirection:"column",alignItems:"center",overflowY:"auto",padding:"16px 14px"}}>
          <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:8,color:"rgba(255,255,255,.25)",fontSize:11,fontWeight:700}}>
            <span>{tpl?.name}</span><span>·</span>
            <span>{device==="pc"?"PC":device==="tablet"?"태블릿":"모바일"}</span>
            {tpl?.type==="external" && <span style={{color:"rgba(212,175,55,.6)"}}>· 클릭해서 직접 편집 가능</span>}
            {loading && <span style={{color:"#d4af37"}}>· 불러오는 중...</span>}
          </div>

          <div style={{width:D_W[device],maxWidth:"100%",borderRadius:14,overflow:"hidden",border:"1px solid rgba(255,255,255,.08)",boxShadow:"0 20px 60px rgba(0,0,0,.6)",transition:"width .3s",flexShrink:0}}>
            {/* 브라우저 크롬 */}
            <div style={{background:"#1e1e1e",padding:"7px 12px",display:"flex",alignItems:"center",gap:7,borderBottom:"1px solid rgba(255,255,255,.05)"}}>
              <div style={{display:"flex",gap:4}}>{["#ff5f57","#febc2e","#28c840"].map(c=><div key={c} style={{width:9,height:9,borderRadius:"50%",background:c,opacity:.7}} />)}</div>
              <div style={{flex:1,background:"rgba(255,255,255,.05)",borderRadius:4,padding:"3px 9px",fontSize:10,color:"rgba(255,255,255,.2)",marginLeft:6}}>{tpl?.name}</div>
            </div>
            <iframe
              key={iKey}
              ref={iframeRef}
              srcDoc={currentHtml}
              sandbox="allow-same-origin allow-scripts"
              style={{width:"100%",height:D_H[device],border:"none",display:"block"}}
              title="편집 미리보기"
            />
          </div>

          <div style={{marginTop:10,textAlign:"center",color:"rgba(255,255,255,.15)",fontSize:10}}>
            텍스트 클릭 → 직접 편집 | 섹션 hover → 삭제 버튼 | 이미지 클릭 → 교체 | 상단 <span style={{color:"#d4af37",fontWeight:700}}>HTML 다운로드</span>로 파일 저장
          </div>
        </main>
      </div>

      {showCopy && <CopyrightModal onClose={()=>setShowCopy(false)} onDownload={doDownload} />}
    </div>
  )
}

// ── 서브 컴포넌트 ──
function SBox({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div style={{background:"rgba(255,255,255,.03)",borderRadius:9,padding:10,border:"1px solid rgba(255,255,255,.07)",marginBottom:8}}>
      {title && <p style={{fontSize:9,fontWeight:900,color:"rgba(255,255,255,.22)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>{title}</p>}
      {children}
    </div>
  )
}

function Tbtn({ onClick, label, danger }: { onClick:()=>void; label:string; danger?:boolean }) {
  return (
    <button onClick={onClick} style={{padding:"4px 9px",border:`1px solid ${danger?"rgba(248,113,113,.3)":"rgba(212,175,55,.35)"}`,background:danger?"transparent":"rgba(212,175,55,.07)",color:danger?"#f87171":"#d4af37",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>
      {label}
    </button>
  )
}

function FR({ label, val, ph, tip, onChange, multiline }: { label:string; val:string; ph?:string; tip?:string; onChange:(v:string)=>void; multiline?:boolean }) {
  const [st, setSt] = useState(false)
  const base: React.CSSProperties = {width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",borderRadius:7,padding:"6px 9px",fontSize:12,color:"#fff",outline:"none",fontFamily:"system-ui",resize:"none"}
  return (
    <div style={{marginBottom:7}}>
      {label && <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
        <p style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.28)"}}>{label}</p>
        {tip && <button onClick={()=>setSt(v=>!v)} style={{fontSize:9,color:"rgba(212,175,55,.55)",background:"none",border:"none",cursor:"pointer",padding:0}}>💡</button>}
      </div>}
      {st && tip && <p style={{fontSize:10,color:"rgba(212,175,55,.7)",background:"rgba(212,175,55,.05)",padding:"5px 7px",borderRadius:5,marginBottom:4,lineHeight:1.6}}>{tip}</p>}
      {multiline
        ? <textarea value={val} placeholder={ph} onChange={e=>onChange(e.target.value)} rows={3} style={base} />
        : <input type="text" value={val} placeholder={ph} onChange={e=>onChange(e.target.value)} style={base} />
      }
    </div>
  )
}
