/**
 * MetaRich Signal — 인스타그램 캐러셀 생성기
 * 사용법: node generate.js content/series-branding.json
 */

const fs   = require("fs");
const path = require("path");

const contentFile = process.argv[2];
if (!contentFile) { console.error("사용법: node generate.js content/series-branding.json"); process.exit(1); }

const data   = JSON.parse(fs.readFileSync(contentFile, "utf8"));
const outDir = path.join(__dirname, "output", data.output_dir);
fs.mkdirSync(outDir, { recursive: true });

// ── 색상 & 공통 CSS ───────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1080px; height:1080px; overflow:hidden; font-family:'Noto Sans KR', sans-serif; }
  .card { width:1080px; height:1080px; position:relative; display:flex; flex-direction:column; }

  /* 배색 */
  .bg-white  { background:#FFFFFF; }
  .bg-navy   { background:#183153; }
  .bg-lgray  { background:#F4F6F8; }
  .bg-gold   { background:#C9A14A; }

  /* 공통 브랜딩 */
  .brand-logo { position:absolute; top:44px; left:52px; font-size:22px; color:#C9A14A; font-weight:700; letter-spacing:2px; }
  .brand-foot { position:absolute; bottom:36px; right:52px; font-size:18px; color:#8892A0; letter-spacing:1px; }
  .brand-foot-light { color:rgba(255,255,255,0.4); }
  .page-num { position:absolute; bottom:36px; left:52px; font-size:18px; color:#8892A0; }
  .page-num-light { color:rgba(255,255,255,0.35); }

  /* 라벨 */
  .label { font-size:20px; font-weight:700; letter-spacing:3px; text-transform:uppercase; margin-bottom:24px; }
  .label-gold  { color:#C9A14A; }
  .label-white { color:rgba(255,255,255,0.6); }
  .label-navy  { color:#183153; }

  /* 제목 */
  .headline { font-size:72px; font-weight:900; line-height:1.18; letter-spacing:-1px; }
  .headline-navy  { color:#183153; }
  .headline-white { color:#FFFFFF; }
  .headline-gold  { color:#C9A14A; }

  .subheadline { font-size:32px; font-weight:500; margin-top:20px; }
  .subheadline-gold  { color:#C9A14A; }
  .subheadline-white { color:rgba(255,255,255,0.75); }
  .subheadline-gray  { color:#4A5568; }

  .body-text { font-size:28px; font-weight:400; line-height:1.7; color:#4A5568; }
  .body-text-light { color:rgba(255,255,255,0.75); }

  /* 콘텐츠 영역 */
  .content { padding:140px 80px 100px; flex:1; display:flex; flex-direction:column; justify-content:center; }
  .content-top { padding:140px 80px 60px; }

  /* 리스트 아이템 */
  .list-item { display:flex; align-items:flex-start; gap:20px; margin-bottom:24px; }
  .list-dot { width:10px; height:10px; border-radius:50%; background:#C9A14A; flex-shrink:0; margin-top:14px; }
  .list-dot-white { background:rgba(255,255,255,0.6); }
  .list-text { font-size:28px; font-weight:500; color:#1C2B3A; line-height:1.5; }
  .list-text-light { color:rgba(255,255,255,0.85); }

  /* 구분선 */
  .divider { width:60px; height:3px; background:#C9A14A; margin:28px 0; }
  .divider-white { background:rgba(255,255,255,0.4); }
  .divider-wide { width:120px; }

  /* 프로세스 스텝 */
  .step-row { display:flex; align-items:center; gap:24px; margin-bottom:22px; }
  .step-num { font-size:20px; font-weight:900; color:#C9A14A; letter-spacing:1px; width:44px; flex-shrink:0; }
  .step-title { font-size:26px; font-weight:700; color:#183153; }
  .step-desc { font-size:22px; color:#8892A0; margin-top:2px; }

  /* 비교 카드 */
  .compare-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:32px; }
  .compare-card { padding:36px 32px; border-radius:16px; }
  .compare-card-left { background:#F4F6F8; }
  .compare-card-right { background:#183153; }
  .compare-title { font-size:26px; font-weight:700; margin-bottom:20px; }
  .compare-title-navy { color:#183153; }
  .compare-title-white { color:#FFFFFF; }
  .compare-item { font-size:22px; margin-bottom:12px; line-height:1.4; }
  .compare-item-navy { color:#4A5568; }
  .compare-item-white { color:rgba(255,255,255,0.8); }

  /* CTA 스타일 */
  .cta-box { background:#183153; border-radius:20px; padding:40px 52px; margin-top:40px; }
  .cta-email { font-size:26px; color:#C9A14A; font-weight:700; letter-spacing:1px; margin-top:8px; }
  .cta-desc { font-size:24px; color:rgba(255,255,255,0.7); line-height:1.5; margin-top:12px; }
`;

// ── 레이아웃 렌더러 ───────────────────────────────────────────

function renderCover(card, idx, total) {
  const isNavy = card.accent === "navy";
  return `
  <div class="card ${isNavy ? 'bg-navy' : 'bg-white'}">
    <div class="brand-logo ${isNavy ? 'label-white' : 'label-gold'}">◎  보험의 준비</div>
    <div class="content" style="justify-content:flex-end; padding-bottom:140px;">
      <div class="label ${isNavy ? 'label-white' : 'label-gold'}">${card.label}</div>
      <div class="headline ${isNavy ? 'headline-white' : 'headline-navy'}" style="font-size:86px;">${card.headline.replace(/\n/g,'<br>')}</div>
      ${card.subheadline ? `<div class="subheadline ${isNavy ? 'subheadline-white' : 'subheadline-gold'}">${card.subheadline}</div>` : ''}
    </div>
    <div class="brand-foot ${isNavy ? 'brand-foot-light' : ''}">MetaRich Signal Group</div>
    <div class="page-num ${isNavy ? 'page-num-light' : ''}">${String(idx).padStart(2,'0')} / ${String(total).padStart(2,'0')}</div>
  </div>`;
}

function renderStatement(card, idx, total) {
  const isNavy = card.accent === "navy";
  return `
  <div class="card ${isNavy ? 'bg-navy' : 'bg-white'}">
    <div class="brand-logo label-gold">◎  보험의 준비</div>
    <div class="content">
      <div class="label ${isNavy ? 'label-white' : 'label-gold'}">${card.label}</div>
      <div class="divider ${isNavy ? 'divider-white' : ''}"></div>
      <div class="headline ${isNavy ? 'headline-white' : 'headline-navy'}" style="font-size:${card.headline.length > 15 ? '58px' : '70px'};">${card.headline.replace(/\n/g,'<br>')}</div>
      ${card.body ? `<div class="body-text ${isNavy ? 'body-text-light' : ''}" style="margin-top:36px;">${card.body.replace(/\n/g,'<br>')}</div>` : ''}
    </div>
    <div class="brand-foot ${isNavy ? 'brand-foot-light' : ''}">MetaRich Signal Group</div>
    <div class="page-num ${isNavy ? 'page-num-light' : ''}">${String(idx).padStart(2,'0')} / ${String(total).padStart(2,'0')}</div>
  </div>`;
}

function renderQuestion(card, idx, total) {
  return `
  <div class="card bg-lgray">
    <div class="brand-logo label-gold">◎  보험의 준비</div>
    <div class="content">
      <div class="label label-gold">${card.label}</div>
      <div class="divider"></div>
      <div class="headline headline-navy" style="font-size:${card.headline.length > 18 ? '56px' : '66px'};">${card.headline.replace(/\n/g,'<br>')}</div>
      ${card.body ? `<div class="body-text" style="margin-top:36px; color:#4A5568;">${card.body.replace(/\n/g,'<br>')}</div>` : ''}
    </div>
    <div class="brand-foot">MetaRich Signal Group</div>
    <div class="page-num">${String(idx).padStart(2,'0')} / ${String(total).padStart(2,'0')}</div>
  </div>`;
}

function renderList(card, idx, total) {
  const isNavy = card.accent === "navy";
  const items = (card.items || []).map(item => `
    <div class="list-item">
      <div class="list-dot ${isNavy ? 'list-dot-white' : ''}"></div>
      <div class="list-text ${isNavy ? 'list-text-light' : ''}">${item}</div>
    </div>`).join('');
  return `
  <div class="card ${isNavy ? 'bg-navy' : 'bg-white'}">
    <div class="brand-logo label-gold">◎  보험의 준비</div>
    <div class="content" style="padding-top:120px;">
      <div class="label ${isNavy ? 'label-white' : 'label-gold'}">${card.label}</div>
      <div class="headline ${isNavy ? 'headline-white' : 'headline-navy'}" style="font-size:52px; margin-bottom:36px;">${card.headline.replace(/\n/g,'<br>')}</div>
      ${items}
    </div>
    <div class="brand-foot ${isNavy ? 'brand-foot-light' : ''}">MetaRich Signal Group</div>
    <div class="page-num ${isNavy ? 'page-num-light' : ''}">${String(idx).padStart(2,'0')} / ${String(total).padStart(2,'0')}</div>
  </div>`;
}

function renderComparison(card, idx, total) {
  const L = card.left  || { title:'', items:[] };
  const R = card.right || { title:'', items:[] };
  const leftItems  = L.items.map(i => `<div class="compare-item compare-item-navy">· ${i}</div>`).join('');
  const rightItems = R.items.map(i => `<div class="compare-item compare-item-white">· ${i}</div>`).join('');
  return `
  <div class="card bg-white">
    <div class="brand-logo label-gold">◎  보험의 준비</div>
    <div class="content" style="padding-top:110px;">
      <div class="label label-gold">${card.label}</div>
      <div class="headline headline-navy" style="font-size:58px; margin-bottom:8px;">${card.headline.replace(/\n/g,'<br>')}</div>
      <div class="compare-grid">
        <div class="compare-card compare-card-left">
          <div class="compare-title compare-title-navy">${L.title}</div>
          ${leftItems}
        </div>
        <div class="compare-card compare-card-right">
          <div class="compare-title compare-title-white">${R.title}</div>
          ${rightItems}
        </div>
      </div>
    </div>
    <div class="brand-foot">MetaRich Signal Group</div>
    <div class="page-num">${String(idx).padStart(2,'0')} / ${String(total).padStart(2,'0')}</div>
  </div>`;
}

function renderProcess(card, idx, total) {
  const steps = (card.steps || []).map(s => `
    <div class="step-row">
      <div class="step-num">${s.num}</div>
      <div>
        <div class="step-title">${s.title}</div>
        <div class="step-desc">${s.desc}</div>
      </div>
    </div>`).join('');
  return `
  <div class="card bg-white">
    <div class="brand-logo label-gold">◎  보험의 준비</div>
    <div class="content" style="padding-top:110px;">
      <div class="label label-gold">${card.label}</div>
      <div class="headline headline-navy" style="font-size:56px; margin-bottom:36px;">${card.headline.replace(/\n/g,'<br>')}</div>
      ${steps}
    </div>
    <div class="brand-foot">MetaRich Signal Group</div>
    <div class="page-num">${String(idx).padStart(2,'0')} / ${String(total).padStart(2,'0')}</div>
  </div>`;
}

function renderProfile(card, idx, total) {
  return `
  <div class="card bg-navy">
    <div class="brand-logo label-gold" style="color:rgba(255,255,255,0.4)">◎  보험의 준비</div>
    <div class="content" style="align-items:center; text-align:center;">
      <div style="width:180px;height:180px;border-radius:50%;background:#2A4A6E;border:3px solid #C9A14A;display:flex;align-items:center;justify-content:center;margin-bottom:36px;">
        <span style="font-size:52px;color:#FFFFFF;font-weight:700;">배진우</span>
      </div>
      <div class="label label-white">${card.label}</div>
      <div class="headline headline-white" style="font-size:64px;">${card.headline.replace(/\n/g,'<br>')}</div>
      <div class="divider" style="margin:24px auto;"></div>
      <div class="subheadline subheadline-gold">${card.subheadline || ''}</div>
      ${card.body ? `<div class="body-text body-text-light" style="margin-top:28px; font-size:26px;">${card.body.replace(/\n/g,'<br>')}</div>` : ''}
    </div>
    <div class="brand-foot brand-foot-light">MetaRich Signal Group</div>
    <div class="page-num page-num-light">${String(idx).padStart(2,'0')} / ${String(total).padStart(2,'0')}</div>
  </div>`;
}

function renderResult(card, idx, total) {
  const items = (card.items || []).map((item, i) => `
    <div style="display:flex;align-items:center;gap:20px;padding:20px 28px;background:${i%2===0?'#F4F6F8':'#FFFFFF'};border-radius:12px;margin-bottom:14px;">
      <div style="width:8px;height:8px;border-radius:50%;background:#C9A14A;flex-shrink:0;"></div>
      <div style="font-size:26px;font-weight:600;color:#1C2B3A;">${item}</div>
    </div>`).join('');
  return `
  <div class="card bg-white">
    <div class="brand-logo label-gold">◎  보험의 준비</div>
    <div class="content" style="padding-top:110px;">
      <div class="label label-gold">${card.label}</div>
      <div class="headline headline-navy" style="font-size:52px; margin-bottom:32px;">${card.headline.replace(/\n/g,'<br>')}</div>
      ${items}
    </div>
    <div class="brand-foot">MetaRich Signal Group</div>
    <div class="page-num">${String(idx).padStart(2,'0')} / ${String(total).padStart(2,'0')}</div>
  </div>`;
}

function renderCTA(card, idx, total) {
  return `
  <div class="card bg-lgray">
    <div class="brand-logo label-gold">◎  보험의 준비</div>
    <div class="content" style="align-items:center;text-align:center;">
      <div class="label label-gold">${card.label}</div>
      <div class="divider" style="margin:20px auto;"></div>
      <div class="headline headline-navy" style="font-size:64px;">${card.headline.replace(/\n/g,'<br>')}</div>
      <div class="cta-box" style="width:100%;margin-top:48px;">
        <div class="subheadline subheadline-gold" style="font-size:26px;">${card.subheadline || ''}</div>
        ${card.body ? `<div class="cta-desc">${card.body.replace(/\n/g,'<br>')}</div>` : ''}
        <div class="cta-email">${card.cta || ''}</div>
      </div>
    </div>
    <div class="brand-foot">MetaRich Signal Group</div>
    <div class="page-num">${String(idx).padStart(2,'0')} / ${String(total).padStart(2,'0')}</div>
  </div>`;
}

// ── 카드 렌더 디스패처 ────────────────────────────────────────
function renderCard(card, idx, total) {
  switch (card.layout) {
    case "cover":      return renderCover(card, idx, total);
    case "statement":  return renderStatement(card, idx, total);
    case "question":   return renderQuestion(card, idx, total);
    case "list":       return renderList(card, idx, total);
    case "comparison": return renderComparison(card, idx, total);
    case "process":    return renderProcess(card, idx, total);
    case "profile":    return renderProfile(card, idx, total);
    case "result":     return renderResult(card, idx, total);
    case "cta":        return renderCTA(card, idx, total);
    default:           return renderStatement(card, idx, total);
  }
}

// ── HTML 파일 생성 ────────────────────────────────────────────
const total = data.cards.length;

data.cards.forEach((card) => {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080">
  <style>${CSS}</style>
</head>
<body>
  ${renderCard(card, card.id, total)}
</body>
</html>`;

  const filename = `card-${String(card.id).padStart(2,'0')}.html`;
  const filepath = path.join(outDir, filename);
  fs.writeFileSync(filepath, html, "utf8");
  console.log(`✅ ${filename}`);
});

console.log(`\n✨ ${total}장 HTML 생성 완료 → output/${data.output_dir}/`);
console.log(`\n▶ PNG 변환 (puppeteer 필요):  node to-png.js output/${data.output_dir}/`);
