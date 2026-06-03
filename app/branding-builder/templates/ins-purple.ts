import type { AgentInfo, LandingConcept } from './types'
import { CONCEPT_CTA, CONCEPT_HEADLINES, CONCEPT_LABELS } from './types'

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function genPurpleHtml(info: AgentInfo, concept: LandingConcept, opts?: { font?: string; color?: string; extraSecs?: { id: string; html: string }[]; deletedSecs?: string[] }): string {
  const bodyFont = opts?.font ?? "'Pretendard Variable','Pretendard',-apple-system,sans-serif"
  const accentClr = opts?.color ?? '#c8a050'
  const extraSecs = (opts?.extraSecs ?? []).filter(s => !(opts?.deletedSecs ?? []).includes(s.id))
  const h  = esc(info.slogan || CONCEPT_HEADLINES[concept])
  const cta = esc(CONCEPT_CTA[concept])
  const lbl = esc(CONCEPT_LABELS[concept])
  const nm  = esc(info.name || '설계사 이름')
  const ttl = esc(info.title || 'AFPK 재무설계사')
  const co  = esc(info.company || '소속 회사')
  const br  = esc(info.brand || lbl)
  const it  = esc(info.intro || '자산을 지키고 노후를 설계하는 프리미엄 상담 서비스.')
  const ph  = esc(info.phone)
  const kk  = esc(info.kakaoUrl)
  const cu  = esc(info.consultUrl)
  const s1  = esc(info.stat1 || '—')
  const s2  = esc(info.stat2 || '—')
  const s3  = esc(info.stat3 || '—')
  const img = info.profileImg
    ? `<img src="${esc(info.profileImg)}" alt="" style="width:100%;height:100%;object-fit:cover;">`
    : `<span style="font-size:40px;display:flex;height:100%;align-items:center;justify-content:center;">👤</span>`
  const flds = (info.consultFields.length ? info.consultFields : ['연금·노후 설계','보장 분석','자산 관리 상담'])
    .map(f => `<div class="sb"><p contenteditable="true">${esc(f)}</p></div>`).join('')
  const qs = info.qualifications.length ? `<span class="pq" contenteditable="true">${esc(info.qualifications.join(' · '))}</span>` : ''
  const navCta = cu ? `<a href="${cu}" class="nc" contenteditable="true">상담 신청</a>` : ''
  const btn1 = cu ? `<a href="${cu}" class="bg" contenteditable="true">${cta}</a>` : `<span class="bg" contenteditable="true">${cta}</span>`
  const btn2 = kk ? `<a href="${kk}" class="bgh" contenteditable="true">💬 카카오톡 상담</a>` : ''
  const ctaA = cu ? `<a href="${cu}" class="cb" contenteditable="true">${cta}</a>` : `<span class="cb" contenteditable="true">${cta}</span>`
  const phLine = ph ? `<p style="margin-top:18px;color:rgba(255,255,255,.3);font-size:13px;">직접 연락: <a href="tel:${ph}" style="color:#c8a050;font-weight:700;" contenteditable="true">${ph}</a></p>` : ''

  return `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${nm} | ${co}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Pretendard Variable','Pretendard',-apple-system,sans-serif;word-break:keep-all;overflow-x:hidden;background:#0a0f1e;color:#e2e8f0}a{text-decoration:none;color:inherit}
[contenteditable]:focus{outline:1px solid #c8a050;outline-offset:2px;border-radius:2px}
.sec{position:relative}.sctrl{position:absolute;top:8px;right:8px;z-index:99;background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;display:none}.sec:hover .sctrl{display:block}
nav{background:rgba(10,15,30,.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(200,160,80,.2);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
.nb{font-size:14px;font-weight:700;color:#c8a050;letter-spacing:.08em}.nc{border:1px solid #c8a050;color:#c8a050;padding:7px 16px;border-radius:4px;font-size:12px;font-weight:700}
.hero{background:linear-gradient(160deg,#0a0f1e 0%,#1a2a4a 100%);padding:80px 24px 64px;text-align:center;border-bottom:1px solid rgba(200,160,80,.15)}
.he{font-size:11px;letter-spacing:.2em;color:#c8a050;text-transform:uppercase;margin-bottom:20px;font-weight:700}
.hh{font-family:'Noto Serif KR',serif;font-size:clamp(28px,6vw,44px);font-weight:700;color:#faf9f6;line-height:1.35;margin-bottom:16px;white-space:pre-line}
.hs{font-size:15px;color:rgba(255,255,255,.55);line-height:1.9;margin-bottom:32px;max-width:360px;margin-left:auto;margin-right:auto}
.hbs{display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto}
.bg{display:block;background:#c8a050;color:#0a0f1e;padding:15px;border-radius:4px;font-size:14px;font-weight:900;text-align:center}
.bgh{display:block;border:1px solid rgba(200,160,80,.4);color:#c8a050;padding:13px;border-radius:4px;font-size:14px;font-weight:600;text-align:center}
.gl{height:1px;background:linear-gradient(to right,#c8a050,transparent);margin:28px 0}
.wrap{padding:48px 24px;max-width:560px;margin:0 auto}
.sl{font-size:10px;letter-spacing:.18em;color:#c8a050;text-transform:uppercase;margin-bottom:10px}
.st{font-family:'Noto Serif KR',serif;font-size:22px;font-weight:700;color:#faf9f6;margin-bottom:20px}
.sg{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.sb{border:1px solid rgba(200,160,80,.25);border-radius:6px;padding:18px;background:rgba(200,160,80,.04)}.sb p{font-size:14px;font-weight:700;color:#e2d5b7}
.sr{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(200,160,80,.15);border:1px solid rgba(200,160,80,.15);border-radius:8px;overflow:hidden;margin-top:16px}
.sc{padding:20px;text-align:center;background:#0d1424}
.sn{font-size:22px;font-weight:900;color:#c8a050}.sl2{font-size:11px;color:rgba(255,255,255,.4);margin-top:4px}
.pb{display:flex;gap:16px;align-items:center;border:1px solid rgba(200,160,80,.2);border-radius:8px;padding:22px;background:rgba(200,160,80,.04)}
.pi{width:76px;height:76px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#1a2a4a;border:2px solid rgba(200,160,80,.3)}
.pn{font-family:'Noto Serif KR',serif;font-size:20px;font-weight:700;color:#faf9f6}.pm{font-size:12px;color:rgba(255,255,255,.45);margin-top:4px}
.pq{display:inline-block;border:1px solid rgba(200,160,80,.4);color:#c8a050;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;margin-top:8px}
.cs{background:linear-gradient(135deg,#0a0f1e,#1a2a4a);border-top:1px solid rgba(200,160,80,.2);padding:64px 24px;text-align:center}
.ct{font-family:'Noto Serif KR',serif;font-size:24px;font-weight:700;color:#faf9f6;margin-bottom:12px}
.csu{font-size:14px;color:rgba(255,255,255,.45);margin-bottom:28px;line-height:1.8}
.cb{display:inline-block;background:#c8a050;color:#0a0f1e;padding:16px 36px;border-radius:4px;font-size:15px;font-weight:900}
@media(max-width:480px){.sg{grid-template-columns:1fr}.sr{grid-template-columns:1fr}}
</style></head><body style="font-family:${bodyFont};--accent-color:${accentClr}">
<nav class="sec"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<span class="nb" contenteditable="true">${br}</span>${navCta}</nav>
<div class="sec hero"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<p class="he" contenteditable="true">${lbl} 전문</p>
<h1 class="hh" contenteditable="true">${h}</h1>
<p class="hs" contenteditable="true">${it}</p>
<div class="hbs">${btn1}${btn2}</div></div>
<div class="sec"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<div class="wrap"><p class="sl">전문 분야</p><div class="gl"></div>
<h2 class="st" contenteditable="true">프리미엄 상담 서비스</h2>
<div class="sg">${flds}</div></div></div>
<div class="sec"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<div class="wrap"><p class="sl">담당 설계사</p><div class="gl"></div>
<div class="pb"><div class="pi">${img}</div>
<div><p class="pn" contenteditable="true">${nm}</p><p class="pm" contenteditable="true">${ttl} · ${co}</p>${qs}</div></div>
<div class="sr">
<div class="sc"><p class="sn" contenteditable="true">${s1}</p><p class="sl2">누적 상담</p></div>
<div class="sc"><p class="sn" contenteditable="true">${s2}</p><p class="sl2">만족도</p></div>
<div class="sc"><p class="sn" contenteditable="true">${s3}</p><p class="sl2">절감액</p></div>
</div></div></div>
<div class="sec cs"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<h2 class="ct" contenteditable="true">프리미엄 상담을 신청하세요</h2>
<p class="csu" contenteditable="true">고객의 자산과 노후를 함께 설계합니다.</p>
${ctaA}${phLine}</div>
${extraSecs.map(s => `<div class="sec" data-section-id="${s.id}">${s.html}</div>`).join('')}
<script>
(function(){
  /* 1. Nav 스크롤 */
  var nav = document.querySelector('nav');
  if(nav){
    window.addEventListener('scroll', function(){
      if(window.scrollY > 60) nav.style.boxShadow='0 4px 24px rgba(0,0,0,.15)';
      else nav.style.boxShadow='';
    }, {passive:true});
  }

  /* 2. fade-up 진입 효과 */
  var style = document.createElement('style');
  style.textContent = '.fu{opacity:0;transform:translateY(32px);transition:opacity .65s cubic-bezier(.16,1,.3,1),transform .65s cubic-bezier(.16,1,.3,1);}.fu.on{opacity:1;transform:translateY(0);}.fu.d1{transition-delay:.1s}.fu.d2{transition-delay:.2s}.fu.d3{transition-delay:.3s}';
  document.head.appendChild(style);
  document.querySelectorAll('h1,h2,.hero-h,.hh,.st,.sec-title,p.hs,.profile-card,.stat-box,.field-card,.svc-box,.fc').forEach(function(el){
    el.classList.add('fu');
  });
  var fuObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('on');fuObs.unobserve(e.target);}
    });
  },{threshold:0.1});
  document.querySelectorAll('.fu').forEach(function(el){fuObs.observe(el);});

  /* 3. 숫자 카운트업 */
  function animCounter(el){
    var raw = el.textContent.replace(/[^0-9]/g,'');
    if(!raw) return;
    var target = parseInt(raw,10);
    var suffix = el.textContent.replace(/[0-9,]/g,'').trim();
    var duration = 1400;
    var start = performance.now();
    function tick(now){
      var elapsed = now - start;
      var progress = Math.min(elapsed/duration,1);
      var eased = 1 - Math.pow(1-progress,3);
      var value = Math.round(target * eased);
      el.textContent = value.toLocaleString('ko-KR') + (suffix ? ' '+suffix : '');
      if(progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var cObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){animCounter(e.target);cObs.unobserve(e.target);}
    });
  },{threshold:0.4});
  document.querySelectorAll('.stat-num,.sn,.stat-n').forEach(function(el){cObs.observe(el);});

  /* 4. 모바일 스티키 CTA (하단 고정) */
  var stickyCta = document.querySelector('.sticky,.bottom-cta');
  if(stickyCta && window.innerWidth < 640){
    var hero = document.querySelector('.hero,.cs');
    if(hero){
      window.addEventListener('scroll',function(){
        var heroBottom = hero.getBoundingClientRect().bottom;
        if(heroBottom < 0){
          stickyCta.style.opacity='1';stickyCta.style.transform='translateY(0)';
        } else {
          stickyCta.style.opacity='0';stickyCta.style.transform='translateY(100%)';
        }
      },{passive:true});
    }
  }
})();
</script>
</body></html>`
}
