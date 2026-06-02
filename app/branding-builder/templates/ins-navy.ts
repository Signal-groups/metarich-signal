import type { AgentInfo, LandingConcept } from './types'
import { CONCEPT_CTA, CONCEPT_HEADLINES, CONCEPT_LABELS } from './types'

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function genNavyHtml(info: AgentInfo, concept: LandingConcept): string {
  const h  = esc(info.slogan || CONCEPT_HEADLINES[concept])
  const cta = esc(CONCEPT_CTA[concept])
  const lbl = esc(CONCEPT_LABELS[concept])
  const nm  = esc(info.name || '설계사 이름')
  const ttl = esc(info.title || 'AFPK 재무설계사')
  const co  = esc(info.company || '소속 회사')
  const br  = esc(info.brand || lbl)
  const it  = esc(info.intro || '고객의 현재 보장과 필요한 준비를 함께 확인합니다.')
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
    .map(f => `<div class="fc"><div class="fb"></div><p contenteditable="true">${esc(f)}</p></div>`).join('')
  const qs = info.qualifications.length ? `<span class="pq" contenteditable="true">${esc(info.qualifications.join(' · '))}</span>` : ''
  const navCta = cu ? `<a href="${cu}" class="nc" contenteditable="true">상담 신청</a>` : ''
  const btn1 = cu ? `<a href="${cu}" class="bw" contenteditable="true">${cta}</a>` : `<span class="bw" contenteditable="true">${cta}</span>`
  const btn2 = kk ? `<a href="${kk}" class="bo" contenteditable="true">💬 카카오톡 문의</a>` : ''
  const ctaA = cu ? `<a href="${cu}" class="cb" contenteditable="true">${cta}</a>` : `<span class="cb" contenteditable="true">${cta}</span>`
  const phLine = ph ? `<p style="margin-top:14px;color:rgba(255,255,255,.45);font-size:13px;">또는 <a href="tel:${ph}" style="color:#d4af37;font-weight:700;" contenteditable="true">${ph}</a></p>` : ''

  return `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${nm} | ${co}</title>
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Pretendard Variable','Pretendard',-apple-system,sans-serif;word-break:keep-all;overflow-x:hidden;background:#fff;color:#1e293b}a{text-decoration:none;color:inherit}
[contenteditable]:focus{outline:2px solid #2563eb;outline-offset:2px;border-radius:2px}
.sec{position:relative}.sctrl{position:absolute;top:8px;right:8px;z-index:99;background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;display:none}.sec:hover .sctrl{display:block}
nav{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.95);backdrop-filter:blur(12px);border-bottom:1px solid #e2e8f0;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
.nb{font-size:15px;font-weight:900;color:#0b1e5f}.nc{background:#2563eb;color:#fff;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:700}
.hero{background:linear-gradient(160deg,#0b1e5f 0%,#1d4ed8 60%,#3b82f6 100%);padding:72px 24px 60px;text-align:center}
.ht{display:inline-block;background:rgba(255,255,255,.15);color:#fff;padding:6px 16px;border-radius:100px;font-size:12px;font-weight:700;margin-bottom:18px}
.hh{font-size:clamp(26px,6vw,40px);font-weight:900;color:#fff;line-height:1.3;letter-spacing:-.02em;margin-bottom:14px;white-space:pre-line}
.hs{font-size:15px;color:rgba(255,255,255,.75);line-height:1.8;margin-bottom:28px;max-width:380px;margin-left:auto;margin-right:auto}
.hb{display:flex;flex-direction:column;gap:10px;max-width:300px;margin:0 auto}
.bw{display:block;background:#fff;color:#1d4ed8;padding:15px;border-radius:10px;font-size:14px;font-weight:900;text-align:center}
.bo{display:block;border:2px solid rgba(255,255,255,.4);color:#fff;padding:13px;border-radius:10px;font-size:14px;font-weight:700;text-align:center}
.wrap{padding:48px 24px;max-width:600px;margin:0 auto}
.sl{font-size:11px;font-weight:900;color:#2563eb;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}
.st{font-size:22px;font-weight:900;color:#0b1e5f;letter-spacing:-.02em;margin-bottom:18px}
.pb{background:#fff5f5;border-left:4px solid #ef4444;padding:13px 16px;border-radius:0 10px 10px 0;margin-bottom:8px;font-size:14px;font-weight:700;color:#dc2626}
.fc{display:flex;gap:12px;align-items:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:8px}.fc p{font-size:14px;font-weight:700;color:#1e293b}
.fb{width:4px;min-height:20px;background:#2563eb;border-radius:2px;flex-shrink:0}
.pc{background:linear-gradient(135deg,#f0f4ff,#e8eeff);border-radius:16px;padding:22px;display:flex;gap:16px;align-items:center}
.pi{width:80px;height:80px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#c7d2fe}
.pn{font-size:20px;font-weight:900;color:#0b1e5f}.pm{font-size:13px;color:#475569;margin-top:4px}
.pq{display:inline-block;background:#0b1e5f;color:#fff;padding:3px 10px;border-radius:100px;font-size:11px;font-weight:700;margin-top:8px}
.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}
.sb{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.04)}
.sn{font-size:22px;font-weight:900;color:#0b1e5f}.sl2{font-size:11px;color:#64748b;margin-top:4px}
.cs{background:linear-gradient(135deg,#0b1e5f,#0e2882);padding:56px 24px;text-align:center}
.ct{font-size:22px;font-weight:900;color:#fff;margin-bottom:10px}.csub{font-size:14px;color:rgba(255,255,255,.65);margin-bottom:24px;line-height:1.8}
.cb{display:inline-block;background:#d4af37;color:#0b1e5f;padding:16px 32px;border-radius:10px;font-size:15px;font-weight:900}
.div{height:1px;background:linear-gradient(to right,transparent,#e2e8f0,transparent);margin:0 24px}
@media(max-width:480px){.sg{grid-template-columns:1fr}.hb{max-width:100%}}
</style></head><body>
<nav class="sec"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<span class="nb" contenteditable="true">${br}</span>${navCta}</nav>
<div class="sec hero"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<span class="ht" contenteditable="true">${lbl}</span>
<h1 class="hh" contenteditable="true">${h}</h1>
<p class="hs" contenteditable="true">${it}</p>
<div class="hb">${btn1}${btn2}</div></div>
<div class="sec"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<div class="wrap"><p class="sl">이런 분께 꼭 필요합니다</p><h2 class="st" contenteditable="true">혹시 이런 고민 있으신가요?</h2>
<div class="pb" contenteditable="true">🔴 갱신형 보험이 많아 보험료 걱정이신 분</div>
<div class="pb" contenteditable="true">🔴 실손보험 세대가 바뀌었는지 모르는 분</div>
<div class="pb" contenteditable="true">🔴 보장 공백이 있는지 확인하고 싶은 분</div>
<div class="pb" contenteditable="true">🔴 보험료는 줄이고 보장은 늘리고 싶은 분</div></div></div>
<div class="div"></div>
<div class="sec"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<div class="wrap"><p class="sl">주요 상담 분야</p><h2 class="st" contenteditable="true">전문 상담 영역</h2>${flds}</div></div>
<div class="div"></div>
<div class="sec"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<div class="wrap"><p class="sl">담당 설계사</p>
<div class="pc"><div class="pi">${img}</div>
<div><p class="pn" contenteditable="true">${nm}</p><p class="pm" contenteditable="true">${ttl} · ${co}</p>${qs}</div></div>
<div class="sg">
<div class="sb"><p class="sn" contenteditable="true">${s1}</p><p class="sl2">누적 상담</p></div>
<div class="sb"><p class="sn" contenteditable="true">${s2}</p><p class="sl2">고객 만족도</p></div>
<div class="sb"><p class="sn" contenteditable="true">${s3}</p><p class="sl2">평균 절감액</p></div>
</div></div></div>
<div class="sec cs"><button class="sctrl" onclick="this.closest('.sec').remove()">✕ 삭제</button>
<h2 class="ct" contenteditable="true">지금 바로 무료로 확인하세요</h2>
<p class="csub" contenteditable="true">부담 없이 상담 신청하시면 꼼꼼하게 분석해 드립니다.</p>
${ctaA}${phLine}</div>
</body></html>`
}
