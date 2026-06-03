import type { AgentInfo, LandingConcept } from './types'
import { CONCEPT_CTA, CONCEPT_HEADLINES, CONCEPT_LABELS } from './types'

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function genBlueHtml(info: AgentInfo, concept: LandingConcept, opts?: { font?: string; color?: string; extraSecs?: { id: string; html: string }[]; deletedSecs?: string[] }): string {
  const bodyFont = opts?.font ?? "'Pretendard Variable','Pretendard',-apple-system,sans-serif"
  const accentClr = opts?.color ?? '#2563eb'
  const extraSecs = (opts?.extraSecs ?? []).filter(s => !(opts?.deletedSecs ?? []).includes(s.id))
  const h  = esc(info.slogan || CONCEPT_HEADLINES[concept])
  const cta = esc(CONCEPT_CTA[concept])
  const lbl = esc(CONCEPT_LABELS[concept])
  const nm  = esc(info.name || '설계사 이름')
  const ttl = esc(info.title || 'AFPK 재무설계사')
  const co  = esc(info.company || '소속 회사')
  const br  = esc(info.brand || lbl)
  const it  = esc(info.intro || '데이터 기반 분석으로 최적의 보험 구조를 제안합니다.')
  const kk  = esc(info.kakaoUrl)
  const cu  = esc(info.consultUrl)
  const s1  = esc(info.stat1 || '—')
  const s2  = esc(info.stat2 || '—')
  const s3  = esc(info.stat3 || '—')
  const img = info.profileImg
    ? `<img src="${esc(info.profileImg)}" alt="" style="width:100%;height:100%;object-fit:cover;">`
    : `<span style="font-size:40px;display:flex;height:100%;align-items:center;justify-content:center;">👤</span>`
  const icons = ['🛡','💊','🏥','🧬','💰','📋','🔍','💡']
  const flds = (info.consultFields.length ? info.consultFields : ['보장분석','보험 리모델링','실손보험 점검'])
    .map((f,i) => `<div class="sc"><div class="si">${icons[i%8]}</div><p contenteditable="true">${esc(f)}</p></div>`).join('')
  const qs = info.qualifications.length ? `<span class="pq" contenteditable="true">${esc(info.qualifications.join(' · '))}</span>` : ''
  const navCta = cu ? `<a href="${cu}" class="nc" contenteditable="true">상담 신청</a>` : ''
  const btn1 = cu ? `<a href="${cu}" class="bp" contenteditable="true">${cta}</a>` : `<span class="bp" contenteditable="true">${cta}</span>`
  const btn2 = kk ? `<a href="${kk}" class="bs" contenteditable="true">💬 카카오 문의</a>` : ''
  const ctaA = cu ? `<a href="${cu}" class="cb" contenteditable="true">${cta}</a>` : `<span class="cb" contenteditable="true">${cta}</span>`

  return `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${nm} | ${co}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Pretendard Variable','Pretendard',-apple-system,sans-serif;word-break:keep-all;overflow-x:hidden;background:#f8f9fc;color:#1e293b}a{text-decoration:none;color:inherit}
[contenteditable]:focus{outline:2px solid #5B6EF5;outline-offset:2px;border-radius:2px}
.sec{position:relative}.sctrl{position:absolute;top:8px;right:8px;z-index:99;background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;display:none}.sec:hover .sctrl{display:block}
nav{background:#fff;border-bottom:3px solid #0A1628;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
.nb{font-size:15px;font-weight:900;color:#0A1628;font-family:'IBM Plex Sans KR',sans-serif}.nc{background:#2563eb;color:#fff;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:700}
.hero{background:#fff;padding:64px 24px 48px;border-bottom:1px solid #e2e8f0}
.hi{max-width:600px;margin:0 auto}
.hb2{display:inline-flex;align-items:center;gap:8px;background:#eff6ff;color:#2563eb;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;margin-bottom:20px}
.hh{font-size:clamp(28px,6vw,42px);font-weight:900;color:#0A1628;line-height:1.2;letter-spacing:-.03em;margin-bottom:16px;white-space:pre-line;font-family:'IBM Plex Sans KR',sans-serif}
.hs{font-size:15px;color:#475569;line-height:1.8;margin-bottom:28px}
.hbs{display:flex;gap:10px;flex-wrap:wrap}
.bp{background:#2563eb;color:#fff;padding:14px 24px;border-radius:8px;font-size:14px;font-weight:800}
.bs{background:transparent;color:#2563eb;border:2px solid #2563eb;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:700}
.sbar{background:#0A1628;display:grid;grid-template-columns:repeat(3,1fr)}
.si2{padding:22px;text-align:center;border-right:1px solid rgba(255,255,255,.08)}
.sn{font-size:22px;font-weight:900;color:#fff;font-family:'IBM Plex Sans KR',sans-serif}.sl{font-size:11px;color:rgba(255,255,255,.45);margin-top:4px}
.wrap{padding:48px 24px;max-width:600px;margin:0 auto}
.sec-l{font-size:11px;font-weight:900;color:#5B6EF5;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}
.sec-t{font-size:22px;font-weight:900;color:#0A1628;margin-bottom:18px}
.sg{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.sc{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.si{font-size:26px;margin-bottom:10px}.sc p{font-size:14px;font-weight:800;color:#0A1628}
.pr{display:flex;gap:16px;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px}
.pi{width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#e2e8f0}
.pn{font-size:18px;font-weight:900;color:#0A1628}.pm{font-size:12px;color:#64748b;margin-top:4px}
.pq{display:inline-block;background:#eff6ff;color:#2563eb;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;margin-top:8px}
.cs{background:linear-gradient(135deg,#0A1628,#1E3A5F);padding:56px 24px;text-align:center}
.ct{font-size:22px;font-weight:900;color:#fff;margin-bottom:10px;font-family:'IBM Plex Sans KR',sans-serif}
.csu{font-size:14px;color:rgba(255,255,255,.6);margin-bottom:24px;line-height:1.8}
.cb{display:inline-block;background:#2563eb;color:#fff;padding:16px 32px;border-radius:8px;font-size:15px;font-weight:900}
@media(max-width:480px){.sg{grid-template-columns:1fr}.hbs{flex-direction:column}.sbar{grid-template-columns:1fr}}
</style></head><body style="font-family:${bodyFont};--accent-color:${accentClr}">
<nav class="sec"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<span class="nb" contenteditable="true">${br}</span>${navCta}</nav>
<div class="sec hero"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<div class="hi"><div class="hb2">📊 ${lbl}</div>
<h1 class="hh" contenteditable="true">${h}</h1>
<p class="hs" contenteditable="true">${it}</p>
<div class="hbs">${btn1}${btn2}</div></div></div>
<div class="sec sbar"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<div class="si2"><p class="sn" contenteditable="true">${s1}</p><p class="sl">누적 상담 수</p></div>
<div class="si2"><p class="sn" contenteditable="true">${s2}</p><p class="sl">고객 만족도</p></div>
<div class="si2"><p class="sn" contenteditable="true">${s3}</p><p class="sl">평균 절감액</p></div></div>
<div class="sec" style="background:#f8f9fc"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<div class="wrap"><p class="sec-l">전문 분야</p><h2 class="sec-t" contenteditable="true">주요 상담 서비스</h2>
<div class="sg">${flds}</div></div></div>
<div class="sec" style="background:#fff"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<div class="wrap"><p class="sec-l">담당 설계사</p>
<div class="pr"><div class="pi">${img}</div>
<div><p class="pn" contenteditable="true">${nm}</p><p class="pm" contenteditable="true">${ttl} · ${co}</p>${qs}</div></div></div></div>
<div class="sec cs"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<h2 class="ct" contenteditable="true">지금 무료로 점검받으세요</h2>
<p class="csu" contenteditable="true">부담 없이 신청하시면 24시간 내 연락드립니다.</p>${ctaA}</div>
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
