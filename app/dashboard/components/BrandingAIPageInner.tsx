"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
// 설계사 브랜딩 AI — 랜딩페이지 빌더 (daperm 구조 기반)

import React, { useState, useEffect, useRef, useCallback } from "react"

// ────────── 타입 ──────────
interface Info {
  name: string; title: string; company: string; branch: string
  phone: string; email: string; kakaoUrl: string; consultUrl: string
  recruitUrl: string; blogUrl: string; instagramUrl: string
  youtubeUrl: string; cafeUrl: string; openchatUrl: string
  intro: string; fields: string; qualifications: string
  heroTitle: string; heroSub: string; services: string
  process: string; reviews: string; profileImg: string
}
type Dev = "pc"|"tablet"|"mobile"
interface Saved { id:string;name:string;tplId:string;info:Info;html:string;at:string }

const DEF: Info = {
  name:"배진우", title:"AFPK 재무설계사", company:"메타리치 시그널그룹", branch:"",
  phone:"", email:"", kakaoUrl:"", consultUrl:"", recruitUrl:"",
  blogUrl:"", instagramUrl:"", youtubeUrl:"", cafeUrl:"", openchatUrl:"",
  intro:"보험의 기준", fields:"보장분석, 보험 리모델링, 실손보험 점검, 암·뇌·심장 보장 점검, 연금 상담",
  qualifications:"AFPK",
  heroTitle:"내 보험, 지금 기준으로 다시 점검해보셨나요?",
  heroSub:"보험은 가입보다 관리가 더 중요합니다. 무료로 확인해 드립니다.",
  services:"보장분석 · 현재 보험 보장 구조 무료 분석\n보험 리모델링 · 불필요한 보험료 절감\n실손 점검 · 세대별 실손 비교 분석\n연금 상담 · 노후 준비 맞춤 설계",
  process:"① 상담 신청\n② 보험 분석\n③ 결과 안내\n④ 리모델링 제안",
  reviews:""보험료가 월 8만원 줄었어요. 정말 감사합니다." — 30대 직장인\n"실손보험 세대가 바뀐 줄도 몰랐는데 덕분에 알았어요." — 40대 주부",
  profileImg:"",
}

// ────────── 템플릿 ──────────
const TEMPLATES = [
  {id:"ins-card",    name:"명함형",       cat:"보험전용", color:"#1a3a6e"},
  {id:"ins-consult", name:"상담전환형",   cat:"보험전용", color:"#2563eb"},
  {id:"ins-remo",    name:"리모델링형",   cat:"보험전용", color:"#0b1e5f"},
  {id:"ins-recruit", name:"리쿠르팅형",   cat:"보험전용", color:"#6d28d9"},
  {id:"ext-01", name:"다이닝 프리미엄",  cat:"프리미엄", color:"#0a0f1e"},
  {id:"ext-02", name:"다이닝 엘레강스", cat:"프리미엄", color:"#0a0f1e"},
  {id:"ext-03", name:"아카데미 클린",    cat:"교육/전문", color:"#e8f0ff"},
  {id:"ext-04", name:"다크퍼플 임팩트", cat:"임팩트",   color:"#0a0820"},
  {id:"ext-05", name:"대시보드 보고서", cat:"전문/데이터",color:"#f5f8fc"},
  {id:"ext-06", name:"브랜드 혁신",     cat:"전문/데이터",color:"#fffaf5"},
  {id:"ext-07", name:"아틀리에 베이지", cat:"프리미엄", color:"#f9f7f4"},
  {id:"ext-08", name:"볼드 크림",       cat:"임팩트",   color:"#f5f0eb"},
  {id:"ext-09", name:"다크 그로스",     cat:"임팩트",   color:"#0a0d12"},
  {id:"ext-10", name:"다크 네이비",     cat:"전문/데이터",color:"#0d1424"},
  {id:"ext-11", name:"다크 퍼플",       cat:"임팩트",   color:"#0f0820"},
  {id:"ext-12", name:"라이트 세무",     cat:"전문/데이터",color:"#f5f8fc"},
  {id:"ext-13", name:"화이트 노무",     cat:"전문/데이터",color:"#f7f7f4"},
  {id:"ext-14", name:"SaaS 플랫폼",    cat:"테크",     color:"#f5f8ff"},
  {id:"ext-15", name:"민트 서비스",     cat:"서비스",   color:"#34d5b0"},
  {id:"ext-16", name:"에메랄드 에듀",   cat:"교육/전문", color:"#f5fcfa"},
]

// ────────── 보험 전용 HTML 생성 ──────────
const BC = `*{margin:0;padding:0;box-sizing:border-box;}html{-webkit-text-size-adjust:100%;}body{font-family:'Pretendard','Noto Sans KR',system-ui,sans-serif;overflow-x:hidden;word-break:keep-all;}a{text-decoration:none;color:inherit;}img{max-width:100%;display:block;}`

function insHtml(id:string,i:Info):string{
  if(id==="ins-card")return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${i.name}</title><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet"><style>${BC}body{background:#f8fafc;}.card{max-width:420px;margin:0 auto;min-height:100vh;padding-bottom:90px;background:#fff;}.hero{background:linear-gradient(135deg,#1a3a6e,#2d5a9e);padding:48px 24px 36px;text-align:center;}.av{width:88px;height:88px;border-radius:50%;border:3px solid rgba(255,255,255,.4);margin:0 auto 16px;object-fit:cover;background:#c7d2fe;display:flex;align-items:center;justify-content:center;font-size:36px;}.nm{font-size:24px;font-weight:900;color:#fff;}.tt{font-size:14px;color:rgba(255,255,255,.75);margin-top:6px;}.cp{font-size:13px;color:rgba(255,255,255,.55);margin-top:4px;}.bb{display:inline-block;background:rgba(212,175,55,.22);color:#d4af37;border:1px solid rgba(212,175,55,.4);padding:5px 14px;border-radius:100px;font-size:12px;font-weight:700;margin-top:12px;}.body{padding:24px 20px;}.sc{font-size:11px;font-weight:800;color:#94a3b8;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;margin-top:20px;}.ir{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;}.ii{width:32px;height:32px;border-radius:8px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}.iv{font-size:14px;font-weight:600;color:#1e293b;}.sg{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}.sb{display:flex;align-items:center;justify-content:center;padding:13px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#334155;}.sticky{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:420px;display:flex;gap:8px;padding:12px 16px;background:rgba(255,255,255,.97);backdrop-filter:blur(10px);border-top:1px solid #e2e8f0;z-index:100;}.bp{flex:1;background:#1a3a6e;color:#fff;border:none;padding:14px;border-radius:10px;font-size:14px;font-weight:800;text-align:center;text-decoration:none;display:block;}.bs{flex:1;background:transparent;color:#1a3a6e;border:2px solid #1a3a6e;padding:14px;border-radius:10px;font-size:14px;font-weight:800;text-align:center;text-decoration:none;display:block;}</style></head><body><div class="card"><div class="hero">${i.profileImg?`<img class="av" src="${i.profileImg}" alt="">`:`<div class="av">👤</div>`}<p class="nm">${i.name}</p><p class="tt">${i.title}</p><p class="cp">${i.company}${i.branch?` · ${i.branch}`:""}</p>${i.intro?`<span class="bb">${i.intro}</span>`:""}</div><div class="body">${i.phone||i.email?`<p class="sc">연락처</p>${i.phone?`<div class="ir"><div class="ii">📞</div><a href="tel:${i.phone}" class="iv">${i.phone}</a></div>`:""}${i.email?`<div class="ir"><div class="ii">✉️</div><span class="iv">${i.email}</span></div>`:""}`:""} ${i.fields?`<p class="sc">상담 분야</p>${i.fields.split(",").map((f:string)=>`<div class="ir"><div class="ii">✓</div><span class="iv">${f.trim()}</span></div>`).join("")}`:""} ${[i.blogUrl,i.instagramUrl,i.youtubeUrl,i.cafeUrl].some(Boolean)?`<p class="sc">채널</p><div class="sg">${i.blogUrl?`<a href="${i.blogUrl}" class="sb">📝 블로그</a>`:""}${i.instagramUrl?`<a href="${i.instagramUrl}" class="sb">📷 인스타</a>`:""}${i.youtubeUrl?`<a href="${i.youtubeUrl}" class="sb">▶ 유튜브</a>`:""}${i.cafeUrl?`<a href="${i.cafeUrl}" class="sb">☕ 카페</a>`:""}</div>`:""}</div></div><div class="sticky">${i.phone?`<a href="tel:${i.phone}" class="bp">📞 전화하기</a>`:""}${i.kakaoUrl?`<a href="${i.kakaoUrl}" class="bs">💬 카카오톡</a>`:""}</div></body></html>`

  if(id==="ins-consult"){
    const svcs=i.services?i.services.split("\n").filter(Boolean):[]
    const revs=i.reviews?i.reviews.split("\n").filter(Boolean):[]
    return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>보험 점검 | ${i.name}</title><link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700&family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet"><style>${BC}body{background:#fff;}nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.95);backdrop-filter:blur(12px);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;}.nav-n{font-size:15px;font-weight:900;color:#1a3a6e;}.nav-b{background:#2563eb;color:#fff;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;}.hero{background:linear-gradient(160deg,#0b1e5f,#1d4ed8 60%,#3b82f6);padding:60px 24px 48px;text-align:center;}.ht{font-family:"Noto Serif KR",serif;font-size:clamp(24px,6vw,34px);font-weight:700;color:#fff;line-height:1.4;margin-bottom:12px;}.hs{font-size:15px;color:rgba(255,255,255,.75);line-height:1.8;margin-bottom:24px;max-width:300px;margin-left:auto;margin-right:auto;}.hb{display:flex;flex-direction:column;gap:10px;max-width:300px;margin:0 auto;}.bw{background:#fff;color:#1d4ed8;padding:15px;border-radius:10px;font-size:15px;font-weight:800;text-align:center;text-decoration:none;display:block;}.bo{background:transparent;color:#fff;padding:13px;border-radius:10px;font-size:14px;font-weight:700;text-align:center;text-decoration:none;display:block;border:2px solid rgba(255,255,255,.4);}.sec{padding:36px 20px;max-width:480px;margin:0 auto;}.stit{font-size:18px;font-weight:900;color:#111;margin-bottom:16px;}.svc{background:#f8fafc;border-radius:12px;padding:14px 16px;margin-bottom:8px;border-left:3px solid #2563eb;}.svc-n{font-size:14px;font-weight:800;color:#1e293b;}.svc-d{font-size:13px;color:#64748b;margin-top:3px;}.rv{background:#f0f4ff;border-radius:12px;padding:14px 16px;margin-bottom:8px;}.rv-t{font-size:14px;color:#374151;line-height:1.7;margin-bottom:6px;}.rv-n{font-size:12px;font-weight:700;color:#2563eb;}.pc{background:linear-gradient(135deg,#f0f4ff,#e8eeff);border-radius:16px;padding:22px;display:flex;gap:14px;align-items:center;margin:20px 0;}.pi{width:68px;height:68px;border-radius:50%;object-fit:cover;background:#c7d2fe;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;}.pn{font-size:17px;font-weight:900;color:#1a3a6e;}.ptit{font-size:13px;color:#475569;margin-top:3px;}.pq{display:inline-block;background:#1a3a6e;color:#fff;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;margin-top:6px;}.btn-p{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:#2563eb;color:#fff;text-decoration:none;}.btn-s{display:block;text-align:center;padding:15px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:10px;background:transparent;color:#2563eb;border:2px solid #2563eb;text-decoration:none;}.disc{font-size:11px;color:#9ca3af;line-height:1.8;padding:20px;text-align:center;}</style></head><body><nav><span class="nav-n">${i.intro||i.name}</span>${i.consultUrl?`<a href="${i.consultUrl}" class="nav-b">상담 신청</a>`:""}</nav><div class="hero"><h1 class="ht">${i.heroTitle}</h1><p class="hs">${i.heroSub}</p><div class="hb">${i.consultUrl?`<a href="${i.consultUrl}" class="bw">📋 무료 상담 신청하기</a>`:""}${i.kakaoUrl?`<a href="${i.kakaoUrl}" class="bo">💬 카카오톡 문의</a>`:""}</div></div><div class="sec">${svcs.length?`<p class="stit">주요 서비스</p>${svcs.map((s:string)=>{const[n,...d]=s.split("·");return`<div class="svc"><p class="svc-n">${n?.trim()||s}</p>${d.length?`<p class="svc-d">${d.join("·").trim()}</p>`:""}</div>`}).join("")}`:""} <div class="pc">${i.profileImg?`<img class="pi" src="${i.profileImg}" alt="">`:`<div class="pi">👤</div>`}<div><p class="pn">${i.name}</p><p class="ptit">${i.title} · ${i.company}</p>${i.qualifications?`<span class="pq">${i.qualifications}</span>`:""}</div></div>${i.consultUrl?`<a href="${i.consultUrl}" class="btn-p">📋 무료 점검 신청하기</a>`:""}${i.kakaoUrl?`<a href="${i.kakaoUrl}" class="btn-s">💬 카카오톡 문의</a>`:""}${i.phone?`<a href="tel:${i.phone}" class="btn-s">📞 전화 상담</a>`:""} ${revs.length?`<p class="stit" style="margin-top:24px;">고객 후기</p>${revs.map((r:string)=>{const m=r.match(/"([^"]+)"\s*[—-]\s*(.+)/);return`<div class="rv"><p class="rv-t">${m?`"${m[1]}"`:r}</p>${m?`<p class="rv-n">— ${m[2]}</p>`:""}</div>`}).join("")}`:""}<p class="disc">본 페이지는 보험 상담 신청을 위한 안내 페이지이며, 구체적인 보장 내용과 보험료는 개인의 상황에 따라 달라질 수 있습니다.<br>© 보험의 기준(배진우) · 메타리치 시그널그룹</p></div></body></html>`
  }

  // ins-remo, ins-recruit: 기본 상담형 재활용
  return insHtml("ins-consult", i)
}

// ── 에디터 스크립트 주입 ──
const INJECT = `<script>

(function(){
'use strict';
if(window.__BAI_LOADED__) return;
window.__BAI_LOADED__ = true;

var cur = null; // 현재 편집중 요소
var toolbar = null;
var linkPop = null;
var isDark = false;

// ── 배경색 감지 ──
function detectDark(){
  var bg = getComputedStyle(document.body).backgroundColor;
  var m = bg.match(/\\d+/g);
  if(!m) return false;
  var brightness = (parseInt(m[0])*299+parseInt(m[1])*587+parseInt(m[2])*114)/1000;
  return brightness < 100;
}

// ── 플로팅 툴바 (daperm 스타일) ──
function makeToolbar(){
  var t = document.createElement('div');
  t.id='__bai_tb__';
  t.style.cssText='position:fixed;z-index:2147483647;top:-80px;left:0;display:flex;align-items:center;gap:2px;background:#1a1a1a;border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:5px 8px;box-shadow:0 8px 32px rgba(0,0,0,.7);font-family:system-ui,sans-serif;transition:opacity .15s;pointer-events:all;';

  function mkBtn(label,title,fn,style){
    var b=document.createElement('button');
    b.innerHTML=label; b.title=title||label;
    b.style.cssText='min-width:28px;height:27px;border:none;border-radius:5px;background:rgba(255,255,255,.08);color:#fff;font-size:12px;font-weight:700;cursor:pointer;padding:0 5px;font-family:inherit;transition:background .1s;white-space:nowrap;';
    b.onmouseenter=function(){b.style.background='rgba(255,255,255,.18)';};
    b.onmouseleave=function(){b.style.background='rgba(255,255,255,.08)';};
    if(style) Object.assign(b.style,style);
    b.onmousedown=function(e){e.preventDefault();if(fn)fn();};
    return b;
  }

  function sep(){var s=document.createElement('div');s.style.cssText='width:1px;height:18px;background:rgba(255,255,255,.12);margin:0 2px;';return s;}

  // 글자 크기
  t.appendChild(mkBtn('A−','글자 작게',function(){if(cur){var fs=parseFloat(getComputedStyle(cur).fontSize)||16;cur.style.fontSize=(fs-1)+'px';send();}}));
  t.appendChild(mkBtn('A+','글자 크게',function(){if(cur){var fs=parseFloat(getComputedStyle(cur).fontSize)||16;cur.style.fontSize=(fs+1)+'px';send();}}));
  t.appendChild(sep());
  // 너비
  t.appendChild(mkBtn('↔−','너비 좁게',function(){if(cur){var w=parseFloat(getComputedStyle(cur).maxWidth)||600;cur.style.maxWidth=Math.max(200,w-20)+'px';send();}}));
  t.appendChild(mkBtn('↔+','너비 넓게',function(){if(cur){var w=parseFloat(getComputedStyle(cur).maxWidth)||600;cur.style.maxWidth=(w+20)+'px';send();}}));
  t.appendChild(sep());
  // 정렬
  t.appendChild(mkBtn('⫷','왼쪽 정렬',function(){if(cur){cur.style.textAlign='left';send();}},null));
  t.appendChild(mkBtn('≡','가운데 정렬',function(){if(cur){cur.style.textAlign='center';send();}},null));
  t.appendChild(mkBtn('⫸','오른쪽 정렬',function(){if(cur){cur.style.textAlign='right';send();}},null));
  t.appendChild(sep());
  // 굵기
  t.appendChild(mkBtn('<b>B</b>','굵게 토글',function(){if(cur){var fw=getComputedStyle(cur).fontWeight;cur.style.fontWeight=(parseInt(fw)>=700?'400':'800');send();}},null));
  t.appendChild(sep());
  // 색상 팔레트
  var colors=['#ffffff','#000000','#1a3a6e','#2563eb','#d4af37','#dc2626','#16a34a','#6d28d9','#f97316','#0891b2'];
  colors.forEach(function(c){
    var dot=document.createElement('button');
    dot.title=c;
    dot.style.cssText='width:17px;height:17px;border-radius:50%;border:1.5px solid rgba(255,255,255,.2);background:'+c+';cursor:pointer;flex-shrink:0;';
    dot.onmousedown=function(e){e.preventDefault();if(cur){cur.style.color=c;send();}};
    t.appendChild(dot);
  });
  // 배경색
  var bgColors=['transparent','rgba(255,255,0,.15)','rgba(37,99,235,.15)','rgba(220,38,38,.15)','rgba(22,163,74,.15)'];
  bgColors.forEach(function(c){
    var dot=document.createElement('button');
    dot.title='배경: '+c;
    dot.style.cssText='width:17px;height:17px;border-radius:4px;border:1.5px solid rgba(255,255,255,.2);background:'+c+';cursor:pointer;flex-shrink:0;';
    dot.onmousedown=function(e){e.preventDefault();if(cur){cur.style.background=c;send();}};
    t.appendChild(dot);
  });
  t.appendChild(sep());
  // 폰트
  var fsel=document.createElement('select');
  fsel.style.cssText='background:#222;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:5px;padding:3px 5px;font-size:11px;cursor:pointer;max-width:100px;';
  [['기본','system-ui,sans-serif'],['Pretendard',"'Pretendard','Noto Sans KR',sans-serif"],['노토산스',"'Noto Sans KR',sans-serif"],['노토명조',"'Noto Serif KR',serif"],['블랙한산스',"'Black Han Sans',sans-serif"],['나눔명조',"'Nanum Myeongjo',serif"]].forEach(function(f){
    var o=document.createElement('option');o.value=f[1];o.textContent=f[0];fsel.appendChild(o);
  });
  fsel.onchange=function(){if(cur){cur.style.fontFamily=fsel.value;send();}};
  t.appendChild(fsel);
  t.appendChild(sep());
  // 링크
  t.appendChild(mkBtn('🔗','링크 편집',function(){if(cur)showLink();}));
  // 실행취소
  t.appendChild(mkBtn('↺','되돌리기',function(){document.execCommand('undo');send();}));
  t.appendChild(sep());
  // 닫기
  t.appendChild(mkBtn('✕','편집 종료',function(){exitEdit();},{background:'rgba(239,68,68,.25)',color:'#fca5a5'}));
  document.body.appendChild(t);
  return t;
}

// ── 링크 팝업 ──
function makeLinkPop(){
  var p=document.createElement('div');
  p.id='__bai_lp__';
  p.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;background:#1e1e1e;border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:20px;width:320px;display:none;font-family:system-ui;box-shadow:0 20px 60px rgba(0,0,0,.8);';
  p.innerHTML='<p style="color:#fff;font-weight:800;font-size:14px;margin-bottom:12px;">🔗 링크 편집</p>'
    +'<input id="__bai_lp_inp__" placeholder="https://" style="width:100%;padding:9px;border-radius:7px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:#fff;font-size:13px;outline:none;margin-bottom:10px;font-family:inherit;">'
    +'<div style="display:flex;gap:8px;">'
    +'<button id="__bai_lp_ok__" style="flex:1;padding:9px;border-radius:7px;background:#d4af37;color:#000;border:none;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;">저장</button>'
    +'<button id="__bai_lp_cl__" style="flex:1;padding:9px;border-radius:7px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.1);font-size:13px;cursor:pointer;font-family:inherit;">취소</button>'
    +'</div>';
  document.body.appendChild(p);
  p.querySelector('#__bai_lp_ok__').onclick=function(){
    var u=p.querySelector('#__bai_lp_inp__').value;
    if(cur&&cur.tagName==='A'){cur.href=u;}
    else if(cur){var a=document.createElement('a');a.href=u;a.style.color='inherit';cur.parentNode.insertBefore(a,cur);a.appendChild(cur);}
    p.style.display='none';send();
  };
  p.querySelector('#__bai_lp_cl__').onclick=function(){p.style.display='none';};
  return p;
}
function showLink(){
  if(!linkPop)linkPop=makeLinkPop();
  var inp=linkPop.querySelector('#__bai_lp_inp__');
  inp.value=cur&&cur.tagName==='A'?cur.getAttribute('href')||'':'';
  linkPop.style.display='block';inp.focus();
}

// ── 툴바 위치 갱신 ──
function posToolbar(){
  if(!toolbar||!cur)return;
  var rect=cur.getBoundingClientRect();
  if(rect.width<1){toolbar.style.top='-80px';return;}
  var ty=Math.max(6,rect.top-42);
  var tx=Math.max(6,Math.min(rect.left,window.innerWidth-400));
  toolbar.style.top=ty+'px';
  toolbar.style.left=tx+'px';
}

// ── 편집 시작 ──
var EDITABLE='h1,h2,h3,h4,h5,h6,p,span,a,li,td,th,blockquote,caption,[class*="title"],[class*="heading"],[class*="subtitle"],[class*="desc"],[class*="text"],[class*="intro"],[class*="label"],[class*="name"],[class*="tag"],[class*="caption"],[class*="badge"],[class*="kpi"],[class*="stat"],[class*="eyebrow"],[class*="sub-"],[class*="-sub"]';

function startEdit(el){
  if(!el||el.id&&el.id.includes('bai'))return;
  if(cur===el)return;
  exitEdit();
  cur=el;
  el.contentEditable='true';
  el.style.outline='2px solid #FFEB00';
  el.style.outlineOffset='2px';
  el.style.minHeight='1em';
  el.focus();
  if(!toolbar)toolbar=makeToolbar();
  posToolbar();
}
function exitEdit(){
  if(cur){
    cur.contentEditable='false';
    cur.style.outline='';
    cur.style.outlineOffset='';
    send();
  }
  cur=null;
  if(toolbar)toolbar.style.top='-80px';
}

// ── 섹션 삭제 버튼 ──
function addSectionBtns(){
  var sels='section,[class*="section"],[class*="-sec"],[class*="block"],[class*="-block"],[class*="hero"],[class*="features"],[class*="cta"],[class*="footer"]';
  document.querySelectorAll(sels).forEach(function(s){
    if(s.querySelector('[id*="bai-d"]'))return;
    var pos=getComputedStyle(s).position;
    if(pos==='static')s.style.position='relative';
    var btn=document.createElement('button');
    btn.id='__bai-d'+Math.random().toString(36).slice(2,7)+'__';
    btn.textContent='✕ 이 섹션 삭제';
    btn.style.cssText='position:absolute;top:10px;right:10px;z-index:9999;background:rgba(220,38,38,.85);color:#fff;border:none;border-radius:7px;padding:5px 12px;font-size:12px;font-weight:800;cursor:pointer;display:none;font-family:system-ui;backdrop-filter:blur(4px);';
    btn.onclick=function(e){e.stopPropagation();if(confirm('이 섹션을 삭제할까요?')){s.remove();send();}};
    s.appendChild(btn);
    s.addEventListener('mouseenter',function(){btn.style.display='block';});
    s.addEventListener('mouseleave',function(){btn.style.display='none';});
  });
}

// ── 이미지 교체 ──
function addImgBtns(){
  document.querySelectorAll('img').forEach(function(img){
    if(img.dataset.baiImg)return;
    img.dataset.baiImg='1';
    img.style.cursor='pointer';
    img.title='클릭 → 이미지 교체';
    img.addEventListener('click',function(e){
      e.stopPropagation();
      var inp=document.createElement('input');inp.type='file';inp.accept='image/*';
      inp.onchange=function(){
        if(!inp.files[0])return;
        var r=new FileReader();
        r.onload=function(ev){img.src=ev.target.result;img.style.outline='2px solid #FFEB00';setTimeout(function(){img.style.outline='';},1000);send();};
        r.readAsDataURL(inp.files[0]);
      };
      inp.click();
    });
  });
}

// ── 변경 전송 ──
function send(){
  try{
    window.parent.postMessage({type:'__BAI_CHANGE__',html:document.documentElement.outerHTML},'*');
  }catch(e){}
}

// ── 부모 메시지 수신 ──
window.addEventListener('message',function(e){
  if(!e.data||e.data.type!=='__BAI_CMD__')return;
  var cmd=e.data.cmd,val=e.data.val;
  if(cmd==='fill'){
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    var node;
    while((node=walker.nextNode())){
      if(node.nodeValue&&node.nodeValue.includes(val.from)){
        node.nodeValue=node.nodeValue.split(val.from).join(val.to);
      }
    }
    send();
  }
  if(cmd==='applyHtml'){
    try{document.open();document.write(val);document.close();init();}catch(er){}
  }
});

// ── 이벤트 ──
document.addEventListener('click',function(e){
  if(e.target.id&&e.target.id.includes('bai'))return;
  if(e.target.closest('[id*="bai"]'))return;
  if(e.target.tagName==='IMG')return;
  if(e.target.matches(EDITABLE)){startEdit(e.target);}
  else if(cur){exitEdit();}
},true);

document.addEventListener('mouseup',function(){setTimeout(posToolbar,10);});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&cur)exitEdit();
  if(cur)setTimeout(send,400);
});

function init(){
  isDark=detectDark();
  setTimeout(function(){addSectionBtns();addImgBtns();},600);
}
init();

})();

<\/script>`

function addEditor(html:string):string{
  if(html.includes('__BAI_LOADED__'))return html
  return html.replace('</body>', INJECT+'\n</body>')
}

// ── localStorage ──
const lg=<T,>(k:string,fb:T):T=>{try{const r=typeof window!=="undefined"?localStorage.getItem(k):null;return r?JSON.parse(r):fb}catch{return fb}}
const ls=(k:string,v:any)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function toB64(f:File):Promise<string>{return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target?.result as string);r.onerror=rej;r.readAsDataURL(f)})}

// ── 저작권 모달 ──
function CModal({onClose,onDl}:{onClose:()=>void;onDl:()=>void}){
  const [ok,setOk]=useState(false)
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16,fontFamily:"system-ui"}}>
      <div style={{background:"#1a1a1a",border:"1px solid rgba(255,255,255,.12)",borderRadius:18,maxWidth:420,width:"100%"}}>
        <div style={{background:"#111",padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><p style={{color:"#fff",fontWeight:900,fontSize:15}}>📋 저작권 동의 필수</p><p style={{color:"rgba(255,255,255,.4)",fontSize:11,marginTop:2}}>다운로드 전 확인 후 동의해 주세요.</p></div>
          <button onClick={onClose} style={{color:"rgba(255,255,255,.4)",fontSize:18,background:"none",border:"none",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:"16px 20px",maxHeight:260,overflowY:"auto"}}>
          {[{n:"1",t:"저작권 귀속",b:<>본 빌더의 모든 템플릿 저작권은 <strong style={{color:"#fff"}}>보험의 기준(배진우)</strong>에게 있습니다.</>},{n:"2",t:"허용 범위",b:"본인 영업·홍보, 고객 전달, 제안서 브리핑, 세미나 자료 등 영업 목적 허용."},{n:"3",t:"금지 행위",b:<ul style={{listStyle:"none"}}>{["유사 빌더·SaaS 제작","재배포·재판매","타 조직 무단 사용"].map(s=><li key={s} style={{color:"#f87171",fontSize:12,padding:"2px 0"}}>• {s}</li>)}</ul>}].map(({n,t,b})=><div key={n} style={{marginBottom:12}}><p style={{color:"#d4af37",fontSize:12,fontWeight:800,marginBottom:4}}>{n}. {t}</p><p style={{color:"rgba(255,255,255,.55)",fontSize:12,lineHeight:1.7}}>{b}</p></div>)}
        </div>
        <div style={{margin:"0 20px 12px",background:ok?"rgba(212,175,55,.1)":"rgba(255,255,255,.04)",border:`1.5px solid ${ok?"#d4af37":"rgba(255,255,255,.1)"}`,borderRadius:9,padding:"11px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setOk(v=>!v)}>
          <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${ok?"#d4af37":"rgba(255,255,255,.3)"}`,background:ok?"#d4af37":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:"#000",flexShrink:0}}>{ok?"✓":""}</div>
          <p style={{color:ok?"#d4af37":"rgba(255,255,255,.6)",fontSize:13,fontWeight:700}}>위 내용을 모두 확인했으며 동의합니다</p>
        </div>
        <div style={{padding:"0 20px 20px",display:"flex",gap:8}}>
          <button onClick={onClose} style={{flex:1,padding:11,borderRadius:9,border:"1px solid rgba(255,255,255,.12)",background:"transparent",color:"rgba(255,255,255,.5)",fontSize:12,cursor:"pointer"}}>취소</button>
          <button onClick={()=>{if(ok){onDl();onClose()}}} disabled={!ok} style={{flex:2,padding:11,borderRadius:9,background:ok?"#d4af37":"rgba(255,255,255,.07)",color:ok?"#000":"rgba(255,255,255,.2)",fontSize:12,fontWeight:900,cursor:ok?"pointer":"not-allowed",border:"none"}}>동의하고 다운로드</button>
        </div>
      </div>
    </div>
  )
}

// ── 아코디언 섹션 ──
function Acc({num,title,badge,open,onToggle,children}:{num:string;title:string;badge?:string;open:boolean;onToggle:()=>void;children:React.ReactNode}){
  return(
    <div style={{borderBottom:"1px solid rgba(255,255,255,.07)",marginBottom:0}}>
      <button onClick={onToggle} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left"}}>
        <span style={{width:22,height:22,borderRadius:"50%",background:"#FFEB00",color:"#000",fontSize:11,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{num}</span>
        <span style={{flex:1,fontSize:13,fontWeight:800,color:"#fff"}}>{title}</span>
        {badge&&<span style={{fontSize:10,background:"rgba(255,235,0,.15)",color:"#FFEB00",padding:"2px 7px",borderRadius:100}}>{badge}</span>}
        <span style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>{open?"▲":"▼"}</span>
      </button>
      {open&&<div style={{padding:"2px 14px 14px"}}>{children}</div>}
    </div>
  )
}

// ── 인풋 with 팁 ──
function FI({label,val,ph,tip,onChange,multiline,req}:{label:string;val:string;ph?:string;tip?:string;onChange:(v:string)=>void;multiline?:boolean;req?:boolean}){
  const base:React.CSSProperties={width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"8px 11px",fontSize:12,color:"#fff",outline:"none",fontFamily:"system-ui",resize:"none" as const,marginTop:3}
  return(
    <div style={{marginBottom:10}}>
      {label&&<p style={{fontSize:11,fontWeight:700,color:req?"#FFEB00":"rgba(255,255,255,.45)",marginBottom:1}}>{req?`⓪ ${label} *`:label}</p>}
      {multiline?<textarea value={val} placeholder={ph} onChange={e=>onChange(e.target.value)} rows={3} style={base}/>:<input type="text" value={val} placeholder={ph} onChange={e=>onChange(e.target.value)} style={base}/>}
      {tip&&<p style={{fontSize:10,color:"rgba(255,235,0,.7)",marginTop:4,lineHeight:1.6}}>💡 예시: {tip}</p>}
    </div>
  )
}

// ──────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────
export default function BrandingAIPageInner({user:_user}:{user?:any}){
  const [info,setInfo]=useState<Info>(()=>lg("bai_v4_info",DEF))
  const [tplId,setTplId]=useState("ins-consult")
  const [dev,setDev]=useState<Dev>("mobile")
  const [sections,setSections]=useState({s1:true,s2:true,s3:false,s4:false,s5:false})
  const [saved,setSaved]=useState<Saved[]>(()=>lg("bai_v4_saved",[]))
  const [saveName,setSaveName]=useState("")
  const [html,setHtml]=useState("")
  const [loading,setLoading]=useState(false)
  const [iKey,setIKey]=useState(0)
  const [showModal,setShowModal]=useState(false)
  const [aiText,setAiText]=useState("")
  const [savedAt,setSavedAt]=useState("")
  const imgRef=useRef<HTMLInputElement>(null)
  const iframeRef=useRef<HTMLIFrameElement>(null)

  useEffect(()=>{ls("bai_v4_info",info)},[info])

  const tpl=TEMPLATES.find(t=>t.id===tplId)!
  const upd=(f:keyof Info,v:string)=>setInfo(p=>({...p,[f]:v}))

  // 템플릿 로드
  const loadTpl=useCallback(async(id:string,inf:Info)=>{
    const t=TEMPLATES.find(x=>x.id===id)
    if(!t)return
    if(id.startsWith("ins-")){
      setHtml(addEditor(insHtml(id,inf)));setIKey(k=>k+1)
    }else{
      setLoading(true)
      try{const r=await fetch(t.id.replace("ins-","ext-").startsWith("ext-")?`/branding-templates/template-${t.id.replace("ext-","")}.html`:"/");const h=await r.text();setHtml(addEditor(h));setIKey(k=>k+1)}
      catch(e){console.error(e)}
      finally{setLoading(false)}
    }
  },[])

  useEffect(()=>{loadTpl(tplId,info)},[tplId])
  useEffect(()=>{if(tplId.startsWith("ins-")){setHtml(addEditor(insHtml(tplId,info)));setIKey(k=>k+1)}},[info])

  // iframe 변경 수신
  useEffect(()=>{
    const h=(e:MessageEvent)=>{if(e.data?.type==="__BAI_CHANGE__"&&e.data.html){setHtml(e.data.html);setSavedAt("● 변경됨")}}
    window.addEventListener("message",h)
    return()=>window.removeEventListener("message",h)
  },[])

  // 자동 채우기
  const fill=(from:string,to:string)=>{
    if(from&&to&&from!==to)
      iframeRef.current?.contentWindow?.postMessage({type:"__BAI_CMD__",cmd:"fill",val:{from,to}},"*")
  }
  const chg=(f:keyof Info,v:string)=>{
    const old=info[f] as string
    upd(f,v)
    if(tplId.startsWith("ext-"))fill(old,v)
  }

  // 입력 정보 적용
  const applyInfo=()=>{
    Object.entries(info).forEach(([k,v])=>{
      if(typeof v==="string"&&v&&DEF[k as keyof Info]&&v!==DEF[k as keyof Info])
        fill(DEF[k as keyof Info] as string,v)
    })
    alert("입력 정보가 미리보기에 반영됩니다!")
  }

  // AI 답변 적용
  const applyAi=()=>{
    if(!aiText.trim())return
    iframeRef.current?.contentWindow?.postMessage({type:"__BAI_CMD__",cmd:"applyHtml",val:addEditor(aiText)},"*")
    setAiText("")
    alert("AI 답변이 적용됐습니다!")
  }

  // AI 프롬프트 생성
  const makePrompt=(mode:"full"|"json")=>{
    const base=`나는 보험설계사입니다. 다음 정보로 랜딩페이지 문구를 작성해주세요.
이름: ${info.name}
직함: ${info.title}
소속: ${info.company}
브랜드명: ${info.intro}
상담 분야: ${info.fields}
전화: ${info.phone}
카카오: ${info.kakaoUrl}
상담신청: ${info.consultUrl}`
    if(mode==="full") return base+`

현재 HTML을 그대로 받아서 텍스트 내용만 보험설계사에 맞게 바꿔서 전체 HTML로 응답해주세요.

${html.slice(0,3000)}`
    return base+`

다음 항목들을 JSON으로 작성해주세요:
{
  "heroTitle": "메인 제목",
  "heroSub": "서브 제목",
  "services": "서비스1\n서비스2",
  "reviews": "후기1\n후기2"
}`
  }

  const openAi=(ai:"chatgpt"|"claude"|"gemini",full:boolean)=>{
    const prompt=makePrompt(full?"full":"json")
    navigator.clipboard?.writeText(prompt).catch(()=>{})
    const urls={chatgpt:"https://chat.openai.com",claude:"https://claude.ai",gemini:"https://gemini.google.com/app"}
    window.open(urls[ai],"_blank")
    alert("프롬프트가 복사됐습니다. 붙여넣기 후 답변을 복사해서 아래 박스에 넣어주세요.")
  }

  // 다운로드
  const doDownload=()=>{
    const b=new Blob([html],{type:"text/html;charset=utf-8"})
    const u=URL.createObjectURL(b)
    const a=document.createElement("a")
    a.href=u;a.download=`${tpl?.name||"page"}-${info.name||"설계사"}.html`;a.click()
    URL.revokeObjectURL(u)
    setSavedAt(`저장됨 ${new Date().toLocaleTimeString("ko-KR")}`)
  }

  const handleSave=()=>{
    if(!saveName.trim())return
    const e:Saved={id:Date.now().toString(),name:saveName.trim(),tplId,info,html,at:new Date().toLocaleDateString("ko-KR")}
    const u=[...saved,e];setSaved(u);ls("bai_v4_saved",u);setSaveName("")
    setSavedAt(`저장됨 ${new Date().toLocaleTimeString("ko-KR")}`)
    alert(`"${e.name}" 저장 완료!`)
  }

  const DW:Record<Dev,string>={pc:"100%",tablet:"768px",mobile:"390px"}
  const DH:Record<Dev,string>={pc:"calc(100vh - 50px)",tablet:"900px",mobile:"750px"}
  const toggle=(k:keyof typeof sections)=>setSections(p=>({...p,[k]:!p[k]}))

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#0c0c0c",overflow:"hidden",fontFamily:"system-ui,sans-serif"}}>

      {/* ══ 상단 툴바 (daperm 동일 구조) ══ */}
      <header style={{display:"flex",alignItems:"center",gap:4,padding:"0 10px",height:46,background:"#111",borderBottom:"1px solid rgba(255,255,255,.1)",flexShrink:0,overflowX:"auto"}}>
        {/* 로고 + 저장시간 */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginRight:8,flexShrink:0}}>
          <span style={{fontSize:14,fontWeight:900,color:"#fff",whiteSpace:"nowrap"}}>🎨 브랜딩 AI</span>
          {savedAt&&<span style={{fontSize:10,color:"rgba(255,255,255,.3)",whiteSpace:"nowrap"}}>■ {savedAt}</span>}
        </div>

        {/* 툴바 버튼들 */}
        {[
          {icon:"▶ 미리보기", action:()=>{const w=window.open("","_blank");if(w){w.document.write(html);w.document.close()}}, color:"#22c55e"},
          {icon:"🔄 초기화",  action:()=>{if(confirm("초기화할까요?"))loadTpl(tplId,info)}, color:"#dc2626"},
          {icon:"💾 저장",    action:()=>{ const n=prompt("저장 이름?",tpl?.name||"페이지");if(n){setSaveName(n);setTimeout(handleSave,0)} }},
          {icon:"📂 불러오기",action:()=>{const s=saved[saved.length-1];if(s){setInfo(s.info);setTplId(s.tplId);setHtml(addEditor(s.html));setIKey(k=>k+1)}else alert("저장된 페이지 없음")}},
          {icon:"💾 HTML 다운로드", action:()=>setShowModal(true), color:"#2563eb"},
          {icon:"📷 이미지 관리", action:()=>imgRef.current?.click()},
          {icon:"📝 동적 텍스트", action:applyInfo},
          {icon:"🤖 AI 카피 생성", action:()=>toggle("s3")},
          {icon:"🚀 HTML 발급",  action:()=>setShowModal(true), color:"#FFEB00", textColor:"#000"},
        ].map(b=>(
          <button key={b.icon} onClick={b.action} style={{padding:"4px 9px",border:`1px solid ${b.color?b.color+"33":"rgba(255,255,255,.1)"}`,borderRadius:7,background:b.color?`${b.color}22`:"rgba(255,255,255,.04)",color:b.textColor||b.color||"rgba(255,255,255,.6)",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
            {b.icon}
          </button>
        ))}
        <div style={{flex:1}}/>
        <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{if(e.target.files?.[0]){const b=await toB64(e.target.files[0]);upd("profileImg",b)}}}/>
      </header>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ══ 사이드바 (5단계 아코디언) ══ */}
        <aside style={{width:268,flexShrink:0,background:"#111",borderRight:"1px solid rgba(255,255,255,.07)",overflowY:"auto",display:"flex",flexDirection:"column"}}>

          {/* 1. 템플릿 고르기 */}
          <Acc num="1" title="템플릿 고르기" badge={`${TEMPLATES.length}개`} open={sections.s1} onToggle={()=>toggle("s1")}>
            <p style={{fontSize:10,color:"rgba(255,255,255,.35)",marginBottom:8,lineHeight:1.6}}>버튼 클릭 → 스타일 변경 (보험 전용 4개 + 업로드 디자인 16개)</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:5}}>
              {TEMPLATES.map((t,idx)=>(
                <button key={t.id} onClick={()=>setTplId(t.id)} style={{padding:"7px 5px",borderRadius:8,border:`1.5px solid ${tplId===t.id?"#FFEB00":"rgba(255,255,255,.08)"}`,background:tplId===t.id?"rgba(255,235,0,.1)":"rgba(255,255,255,.02)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{width:"100%",height:20,borderRadius:4,background:t.color,border:"1px solid rgba(255,255,255,.1)"}}/>
                  <span style={{fontSize:9,fontWeight:700,color:tplId===t.id?"#FFEB00":"rgba(255,255,255,.5)",textAlign:"center",lineHeight:1.2}}>T-{String(idx+1).padStart(2,"0")}<br/>{t.name}</span>
                </button>
              ))}
            </div>
          </Acc>

          {/* 2. 내 정보 적기 */}
          <Acc num="2" title="내 정보 적기" open={sections.s2} onToggle={()=>toggle("s2")}>
            <p style={{fontSize:10,color:"rgba(255,255,255,.35)",marginBottom:10}}>아래 두 칸만 꼭 채우면 됩니다</p>

            <FI req label="① 이름" val={info.name} ph="배진우" tip="배진우 설계사 / 김철수 FA / 이영희 재무설계사" onChange={v=>chg("name",v)}/>
            <FI req label="② 직함·소속" val={info.company} ph="메타리치 시그널그룹" tip="메타리치 시그널그룹 / 삼성생명 / 한화생명" onChange={v=>chg("company",v)}/>

            {/* 로고 업로드 */}
            <div style={{background:"rgba(255,235,0,.06)",border:"1px solid rgba(255,235,0,.15)",borderRadius:9,padding:"10px 12px",marginBottom:10}}>
              <p style={{fontSize:11,color:"#FFEB00",fontWeight:700,marginBottom:7}}>🖼 프로필 사진 (선택)</p>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {info.profileImg?<img src={info.profileImg} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",border:"1.5px solid #FFEB00"}} alt=""/>:<div style={{width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>}
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  <button onClick={()=>imgRef.current?.click()} style={{padding:"4px 9px",border:"1px solid rgba(255,235,0,.35)",background:"rgba(255,235,0,.08)",color:"#FFEB00",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>📤 업로드</button>
                  {info.profileImg&&<button onClick={()=>upd("profileImg","")} style={{padding:"4px 9px",border:"1px solid rgba(239,68,68,.3)",background:"transparent",color:"#f87171",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer"}}>✕ 삭제</button>}
                </div>
              </div>
            </div>

            {/* 연락처 */}
            <div style={{borderTop:"1px solid rgba(255,255,255,.07)",paddingTop:10,marginTop:2}}>
              <p style={{fontSize:11,color:"rgba(255,235,0,.7)",fontWeight:700,marginBottom:8}}>📞 연락처·링크 (선택 · 비우면 미적용)</p>
              <FI label="📱 전화번호" val={info.phone} ph="010-1234-5678" onChange={v=>chg("phone",v)}/>
              <FI label="📧 이메일" val={info.email} ph="contact@example.com" onChange={v=>chg("email",v)}/>
              <FI label="💬 카카오톡 오픈채팅/채널" val={info.kakaoUrl} ph="https://open.kakao.com/..." onChange={v=>chg("kakaoUrl",v)}/>
              <FI label="📋 상담 신청 링크" val={info.consultUrl} ph="https://..." onChange={v=>chg("consultUrl",v)}/>
              <FI label="🤝 리쿠르팅 문의" val={info.recruitUrl} ph="https://..." onChange={v=>chg("recruitUrl",v)}/>
            </div>

            {/* SNS */}
            <div style={{borderTop:"1px solid rgba(255,255,255,.07)",paddingTop:10,marginTop:2}}>
              <p style={{fontSize:11,color:"rgba(255,235,0,.7)",fontWeight:700,marginBottom:8}}>🔗 SNS·채널</p>
              {[["blogUrl","📝 네이버 블로그"],["instagramUrl","📷 인스타그램"],["youtubeUrl","▶ 유튜브"],["cafeUrl","☕ 네이버 카페"],["openchatUrl","💬 오픈채팅"]] .map(([f,l])=><FI key={f} label={l} val={info[f as keyof Info] as string} ph="https://" onChange={v=>chg(f as keyof Info,v)}/>)}
            </div>

            {/* 섹션별 직접 작성 */}
            <div style={{borderTop:"1px solid rgba(255,255,255,.07)",paddingTop:10,marginTop:2}}>
              <p style={{fontSize:11,color:"rgba(255,235,0,.7)",fontWeight:700,marginBottom:8}}>📝 섹션별 직접 작성</p>
              <FI label="히어로 헤드라인" val={info.heroTitle} tip="광고주 첫 인상의 80% 결정 · 가장 큰 글씨" onChange={v=>chg("heroTitle",v)}/>
              <FI label="히어로 설명" val={info.heroSub} tip="헤드라인 바로 아래 슬로건 · 1~2문장" onChange={v=>chg("heroSub",v)}/>
              <FI label="핵심 서비스 (한 줄에 하나)" val={info.services} tip="서비스1\n서비스2 형식 · 각 줄이 카드가 됩니다" onChange={v=>chg("services",v)} multiline/>
              <FI label="진행 프로세스 (한 줄에 하나)" val={info.process} tip="① 신청 → ② 분석 → ③ 결과" onChange={v=>chg("process",v)} multiline/>
              <FI label="고객 후기 (한 줄에 하나)" val={info.reviews} tip='"후기 내용" — 고객명 형식으로' onChange={v=>chg("reviews",v)} multiline/>
            </div>

            {/* 적용 버튼 */}
            <button onClick={applyInfo} style={{width:"100%",marginTop:10,padding:"11px",borderRadius:9,background:"#22c55e",color:"#fff",border:"none",fontSize:13,fontWeight:900,cursor:"pointer"}}>
              ✓ 입력 정보 적용
            </button>
            <p style={{fontSize:10,color:"rgba(255,255,255,.3)",textAlign:"center",marginTop:5}}>위 모든 항목을 미리보기에 즉시 반영합니다</p>
          </Acc>

          {/* 3. AI에게 글 맡기기 */}
          <Acc num="3" title="AI에게 글 맡기기" open={sections.s3} onToggle={()=>toggle("s3")}>
            <div style={{background:"rgba(255,235,0,.06)",border:"1px solid rgba(255,235,0,.12)",borderRadius:9,padding:"10px 12px",marginBottom:10,fontSize:10,color:"rgba(255,255,255,.5)",lineHeight:1.7}}>
              <p style={{color:"#FFEB00",fontWeight:700,marginBottom:4}}>📋 사용 순서</p>
              ① 아래 <b style={{color:"#fff"}}>AI 1개</b> 클릭<br/>
              ② AI 사이트 새 탭 → Ctrl+V 붙여넣기 → 엔터<br/>
              ③ AI 답변 <b style={{color:"#fff"}}>전체 복사</b><br/>
              ④ 아래 박스에 붙여넣고 <b style={{color:"#22c55e"}}>「적용」</b> 클릭
            </div>
            <div style={{marginBottom:8}}>
              <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:8}}>
                <span style={{color:"#FFEB00",fontWeight:700}}>🔥 정밀 모드</span> — HTML 통째 전송 + AI가 HTML 통째 응답 (Claude 권장)
              </label>
            </div>
            <p style={{fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:6}}>사용할 AI 선택</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:10}}>
              {[["💬","ChatGPT","chatgpt","#10a37f"],["🧠","Claude","claude","#d97706"],["✨","Gemini","gemini","#4285f4"]].map(([icon,name,key,color])=>(
                <button key={key} onClick={()=>openAi(key as "chatgpt"|"claude"|"gemini",false)} style={{padding:"8px 4px",borderRadius:8,border:`1px solid ${color}44`,background:`${color}11`,color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <span style={{fontSize:16}}>{icon}</span>{name}
                </button>
              ))}
            </div>
            <textarea value={aiText} onChange={e=>setAiText(e.target.value)} placeholder="AI 답변 여기 붙여넣기" rows={4} style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"8px 10px",fontSize:11,color:"#fff",outline:"none",resize:"none",fontFamily:"system-ui",marginBottom:6}}/>
            <button onClick={applyAi} disabled={!aiText.trim()} style={{width:"100%",padding:"10px",borderRadius:8,background:aiText.trim()?"#22c55e":"rgba(255,255,255,.07)",color:aiText.trim()?"#fff":"rgba(255,255,255,.3)",border:"none",fontSize:12,fontWeight:900,cursor:aiText.trim()?"pointer":"not-allowed"}}>
              📥 AI 답변 적용하기
            </button>
          </Acc>

          {/* 4. 미세 조정 */}
          <Acc num="4" title="미세 조정 (선택)" open={sections.s4} onToggle={()=>toggle("s4")}>
            <div style={{fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:2,background:"rgba(255,255,255,.03)",borderRadius:9,padding:"10px 12px"}}>
              {["글자 클릭 → 직접 타이핑","이미지 클릭 → 새 사진 업로드","글자 위 플로팅 툴바 → 색상·폰트·크기·정렬","섹션 위 ✕ 삭제 → 불필요 섹션 제거","Ctrl+Z 실행취소 / ESC 닫기"].map(t=>(
                <p key={t} style={{display:"flex",gap:6}}><span style={{color:"#FFEB00",flexShrink:0}}>•</span><span>{t}</span></p>
              ))}
            </div>
          </Acc>

          {/* 5. 저장/다운로드 */}
          <Acc num="5" title="저장 · HTML 다운로드" open={sections.s5} onToggle={()=>toggle("s5")}>
            <button onClick={()=>setShowModal(true)} style={{width:"100%",padding:"11px",borderRadius:9,background:"#FFEB00",color:"#000",border:"none",fontSize:13,fontWeight:900,cursor:"pointer",marginBottom:10}}>
              🚀 HTML 다운로드
            </button>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="저장 이름" style={{flex:1,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:7,padding:"7px 9px",fontSize:11,color:"#fff",outline:"none"}}/>
              <button onClick={handleSave} disabled={!saveName.trim()} style={{padding:"7px 10px",borderRadius:7,background:saveName.trim()?"#d4af37":"rgba(255,255,255,.07)",color:saveName.trim()?"#000":"rgba(255,255,255,.2)",border:"none",fontSize:10,fontWeight:900,cursor:saveName.trim()?"pointer":"not-allowed"}}>저장</button>
            </div>
            {saved.length>0&&saved.slice(-5).reverse().map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <div><p style={{fontSize:11,fontWeight:700,color:"#fff"}}>{p.name}</p><p style={{fontSize:9,color:"rgba(255,255,255,.3)"}}>{p.at}</p></div>
                <div style={{display:"flex",gap:3}}>
                  <button onClick={()=>{if(confirm("불러올까요?")){setInfo(p.info);setTplId(p.tplId);setHtml(addEditor(p.html));setIKey(k=>k+1)}}} style={{padding:"3px 7px",borderRadius:5,border:"1px solid rgba(255,235,0,.25)",background:"transparent",color:"#FFEB00",fontSize:10,cursor:"pointer"}}>불러오기</button>
                  <button onClick={()=>{const u=saved.filter(x=>x.id!==p.id);setSaved(u);ls("bai_v4_saved",u)}} style={{padding:"3px 7px",borderRadius:5,border:"1px solid rgba(248,113,113,.2)",background:"transparent",color:"#f87171",fontSize:10,cursor:"pointer"}}>삭제</button>
                </div>
              </div>
            ))}
            <button onClick={()=>{if(confirm("초기화할까요?")){setInfo(DEF);setTplId("ins-consult")}}} style={{width:"100%",marginTop:8,padding:"8px",borderRadius:8,background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.15)",color:"#f87171",fontSize:11,cursor:"pointer"}}>🗑 전체 초기화</button>
          </Acc>

        </aside>

        {/* ══ 미리보기 ══ */}
        <main style={{flex:1,background:"#0a0a0a",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* 템플릿 없으면 안내 */}
          {!html&&!loading&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,.2)"}}>
              <span style={{fontSize:60,marginBottom:16}}>🎨</span>
              <p style={{fontSize:18,fontWeight:900,marginBottom:6}}>왼쪽에서 템플릿을 선택하세요</p>
              <p style={{fontSize:13}}>{TEMPLATES.length}개 디자인 중 마음에 드는 것을 고르면 편집이 시작됩니다</p>
            </div>
          )}
          {loading&&(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#FFEB00",fontSize:13,fontWeight:700}}>
              템플릿 불러오는 중...
            </div>
          )}
          {html&&!loading&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",overflowY:"auto",padding:"14px 12px"}}>
              {/* 브라우저 프레임 */}
              <div style={{width:DW[dev],maxWidth:"100%",borderRadius:14,overflow:"hidden",border:"1px solid rgba(255,255,255,.08)",boxShadow:"0 20px 60px rgba(0,0,0,.6)",flexShrink:0}}>
                <div style={{background:"#1e1e1e",padding:"6px 12px",display:"flex",alignItems:"center",gap:7,borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                  <div style={{display:"flex",gap:4}}>{["#ff5f57","#febc2e","#28c840"].map(c=><div key={c} style={{width:9,height:9,borderRadius:"50%",background:c,opacity:.7}}/>)}</div>
                  <div style={{flex:1,background:"rgba(255,255,255,.05)",borderRadius:4,padding:"3px 9px",fontSize:9,color:"rgba(255,255,255,.2)",marginLeft:6}}>{tpl?.name||"미리보기"}{tpl?.id.startsWith("ext-")?" · 클릭해서 직접 편집 가능":""}</div>
                </div>
                <iframe key={iKey} ref={iframeRef} srcDoc={html} sandbox="allow-same-origin allow-scripts" style={{width:"100%",height:DH[dev],border:"none",display:"block"}} title="미리보기"/>
              </div>
              <p style={{marginTop:10,textAlign:"center",color:"rgba(255,255,255,.12)",fontSize:10}}>
                텍스트 클릭 → 직접 편집 | 섹션 hover → ✕ 삭제 | 이미지 클릭 → 교체
              </p>
            </div>
          )}

          {/* 디바이스 토글 (우하단) */}
          <div style={{position:"sticky",bottom:0,display:"flex",justifyContent:"flex-end",padding:"6px 12px",background:"rgba(10,10,10,.9)",borderTop:"1px solid rgba(255,255,255,.06)",gap:4}}>
            {(["pc","tablet","mobile"] as Dev[]).map(d=>(
              <button key={d} onClick={()=>setDev(d)} style={{padding:"4px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:800,background:dev===d?"#FFEB00":"rgba(255,255,255,.08)",color:dev===d?"#000":"rgba(255,255,255,.4)"}}>
                {d==="pc"?"🖥 PC":d==="tablet"?"📱 태블릿":"📱 모바일"}
              </button>
            ))}
          </div>
        </main>
      </div>

      {showModal&&<CModal onClose={()=>setShowModal(false)} onDl={doDownload}/>}
    </div>
  )
}
