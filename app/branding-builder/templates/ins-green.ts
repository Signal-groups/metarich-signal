import type { AgentInfo, LandingConcept } from './types'
import { CONCEPT_CTA, CONCEPT_HEADLINES, CONCEPT_LABELS } from './types'

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function genGreenHtml(info: AgentInfo, concept: LandingConcept): string {
  const h  = esc(info.slogan || CONCEPT_HEADLINES[concept])
  const cta = esc(CONCEPT_CTA[concept])
  const lbl = esc(CONCEPT_LABELS[concept])
  const nm  = esc(info.name || '설계사 이름')
  const ttl = esc(info.title || 'AFPK 재무설계사')
  const co  = esc(info.company || '소속 회사')
  const br  = esc(info.brand || lbl)
  const it  = esc(info.intro || '쉽고 친절하게, 보험의 모든 것을 함께 해결합니다.')
  const ph  = esc(info.phone)
  const kk  = esc(info.kakaoUrl)
  const cu  = esc(info.consultUrl)
  const s1  = esc(info.stat1 || '—')
  const s2  = esc(info.stat2 || '—')
  const s3  = esc(info.stat3 || '—')
  const img = info.profileImg
    ? `<img src="${esc(info.profileImg)}" alt="" style="width:100%;height:100%;object-fit:cover;">`
    : `<span style="font-size:40px;display:flex;height:100%;align-items:center;justify-content:center;">👤</span>`
  const flds = (info.consultFields.length ? info.consultFields : ['보장분석','보험 리모델링','실손보험 점검'])
    .map(f => `<div class="fc"><span class="ck">✓</span><p contenteditable="true">${esc(f)}</p></div>`).join('')
  const qs = info.qualifications.length ? `<span class="pq" contenteditable="true">${esc(info.qualifications.join(' · '))}</span>` : ''
  const navCta = cu ? `<a href="${cu}" class="nc" contenteditable="true">상담 신청</a>` : ''
  const btn1 = cu ? `<a href="${cu}" class="bw" contenteditable="true">${cta}</a>` : `<span class="bw" contenteditable="true">${cta}</span>`
  const btn2 = kk ? `<a href="${kk}" class="bo" contenteditable="true">💬 카카오톡 문의</a>` : ''
  const ctaA = cu ? `<a href="${cu}" class="cb" contenteditable="true">${cta}</a>` : `<span class="cb" contenteditable="true">${cta}</span>`
  const phLine = ph ? `<p style="margin-top:14px;color:rgba(255,255,255,.6);font-size:13px;"><a href="tel:${ph}" style="color:#fff;font-weight:700;" contenteditable="true">📞 ${ph}</a></p>` : ''

  return `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${nm} | ${co}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans KR',-apple-system,sans-serif;word-break:keep-all;overflow-x:hidden;background:#f0fdf4;color:#1e293b}a{text-decoration:none;color:inherit}
[contenteditable]:focus{outline:2px solid #064e3b;outline-offset:2px;border-radius:3px}
.sec{position:relative}.sctrl{position:absolute;top:8px;right:8px;z-index:99;background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;display:none}.sec:hover .sctrl{display:block}
nav{background:#fff;border-bottom:2px solid #064e3b;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
.nb{font-size:15px;font-weight:900;color:#064e3b}.nc{background:#064e3b;color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;font-weight:700}
.hero{background:linear-gradient(160deg,#064e3b,#2d6a4f);padding:64px 24px 48px;text-align:center}
.ht{display:inline-block;background:rgba(255,255,255,.15);color:#fff;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:18px}
.hh{font-size:clamp(26px,6vw,38px);font-weight:900;color:#fff;line-height:1.35;margin-bottom:14px;white-space:pre-line}
.hs{font-size:15px;color:rgba(255,255,255,.75);line-height:1.8;margin-bottom:28px;max-width:360px;margin-left:auto;margin-right:auto}
.hbs{display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto}
.bw{display:block;background:#fff;color:#064e3b;padding:15px;border-radius:20px;font-size:14px;font-weight:900;text-align:center}
.bo{display:block;border:2px solid rgba(255,255,255,.4);color:#fff;padding:13px;border-radius:20px;font-size:14px;font-weight:700;text-align:center}
.tb{background:#fff;padding:20px 24px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px;border-bottom:1px solid #dcfce7}
.ti{display:flex;align-items:center;gap:10px;padding:12px;background:#f0fdf4;border-radius:12px}
.tic{font-size:20px}.tit{font-size:13px;font-weight:700;color:#064e3b}
.wrap{padding:48px 24px;max-width:560px;margin:0 auto}
.sl{font-size:11px;font-weight:900;color:#2d6a4f;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
.st{font-size:20px;font-weight:900;color:#064e3b;margin-bottom:18px}
.fc{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fff;border-radius:12px;margin-bottom:8px;border:1px solid #bbf7d0}
.ck{width:24px;height:24px;background:#064e3b;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0}
.fc p{font-size:14px;font-weight:700;color:#1e293b}
.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.sc{background:#fff;border:1px solid #bbf7d0;border-radius:14px;padding:18px;text-align:center}
.sn{font-size:22px;font-weight:900;color:#064e3b}.sl2{font-size:11px;color:#64748b;margin-top:4px}
.pw{display:flex;gap:14px;align-items:center;background:#fff;border:2px solid #bbf7d0;border-radius:16px;padding:20px}
.pi{width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#dcfce7}
.pn{font-size:18px;font-weight:900;color:#064e3b}.pm{font-size:12px;color:#64748b;margin-top:3px}
.pq{display:inline-block;background:#dcfce7;color:#064e3b;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:700;margin-top:6px}
.cs{background:linear-gradient(160deg,#064e3b,#2d6a4f);padding:56px 24px;text-align:center}
.ct{font-size:22px;font-weight:900;color:#fff;margin-bottom:10px}.csu{font-size:14px;color:rgba(255,255,255,.7);margin-bottom:24px;line-height:1.8}
.cb{display:inline-block;background:#fff;color:#064e3b;padding:16px 32px;border-radius:20px;font-size:15px;font-weight:900}
@media(max-width:480px){.tb{grid-template-columns:1fr}.sg{grid-template-columns:1fr}.hbs{max-width:100%}}
</style></head><body>
<nav class="sec"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<span class="nb" contenteditable="true">${br}</span>${navCta}</nav>
<div class="sec hero"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<span class="ht" contenteditable="true">☑ ${lbl}</span>
<h1 class="hh" contenteditable="true">${h}</h1>
<p class="hs" contenteditable="true">${it}</p>
<div class="hbs">${btn1}${btn2}</div></div>
<div class="sec tb"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<div class="ti"><span class="tic">🛡</span><p class="tit" contenteditable="true">무료 보장 분석</p></div>
<div class="ti"><span class="tic">⚡</span><p class="tit" contenteditable="true">빠른 결과 안내</p></div>
<div class="ti"><span class="tic">🤝</span><p class="tit" contenteditable="true">1:1 맞춤 상담</p></div>
<div class="ti"><span class="tic">📋</span><p class="tit" contenteditable="true">부담 없이 신청</p></div></div>
<div class="sec" style="background:#fff"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<div class="wrap"><p class="sl">상담 분야</p><h2 class="st" contenteditable="true">이런 보험 고민, 함께 해결합니다</h2>${flds}</div></div>
<div class="sec" style="background:#f0fdf4;padding:40px 24px"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<div style="max-width:560px;margin:0 auto"><p class="sl">담당 설계사</p>
<div class="pw" style="margin-top:12px"><div class="pi">${img}</div>
<div><p class="pn" contenteditable="true">${nm}</p><p class="pm" contenteditable="true">${ttl} · ${co}</p>${qs}</div></div>
<div class="sg" style="margin-top:12px">
<div class="sc"><p class="sn" contenteditable="true">${s1}</p><p class="sl2">누적 상담</p></div>
<div class="sc"><p class="sn" contenteditable="true">${s2}</p><p class="sl2">만족도</p></div>
<div class="sc"><p class="sn" contenteditable="true">${s3}</p><p class="sl2">절감액</p></div>
</div></div></div>
<div class="sec cs"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<h2 class="ct" contenteditable="true">지금 바로 무료 상담 신청</h2>
<p class="csu" contenteditable="true">어렵고 복잡한 보험, 쉽게 설명해 드립니다.</p>
${ctaA}${phLine}</div>
</body></html>`
}
