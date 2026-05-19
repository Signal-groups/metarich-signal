// ================================================================
// 간편보험 인수기준 비교 시스템 - 앱 로직
// ================================================================

const APP = {
  companies: [],
  diseases: [],
  conditions: {},
  jobs: [],
  selectedDiseases: [],
  selectedProds: new Set(['손해']),

  // ── 데이터 로드
  async loadAll() {
    const base = './data/';
    const [co, dis, cond, job] = await Promise.all([
      fetch(base + 'companies.json').then(r => r.json()),
      fetch(base + 'diseases.json').then(r => r.json()),
      fetch(base + 'conditions.json').then(r => r.json()),
      fetch(base + 'jobs.json').then(r => r.json()),
    ]);
    this.companies = co;
    this.diseases = dis;
    this.conditions = cond;
    this.jobs = job;
    this.render();
  },

  // ── 직업 검색
  searchJob(q) {
    if (!q.trim()) return [];
    return this.jobs.filter(j =>
      j.keywords.some(k => k.includes(q) || q.includes(k))
    ).slice(0, 8);
  },

  // ── 질환 검색 (코드·병명·부위·별칭 통합)
  searchDis(q) {
    if (!q.trim()) return [];
    const lq = q.toLowerCase();
    return this.diseases.filter(d =>
      d.name.includes(q) ||
      d.code.toLowerCase().includes(lq) ||
      (d.body || []).some(b => b.includes(q)) ||
      (d.aliases || []).some(a => a.includes(q))
    ).slice(0, 12);
  },

  // ── 인수조건 조회
  getCondition(code, companyId) {
    const cond = this.conditions[code];
    if (!cond) return { status: 'ok', note: '인수 가능(확인 필요)', score: 3 };
    return cond[companyId] || { status: 'ok', note: '확인 필요', score: 3 };
  },

  // ── 선택 질환 추가/제거
  toggleDis(code) {
    if (this.selectedDiseases.includes(code)) {
      this.selectedDiseases = this.selectedDiseases.filter(c => c !== code);
    } else {
      if (this.selectedDiseases.length >= 5) { alert('최대 5개까지 선택 가능합니다.'); return; }
      this.selectedDiseases.push(code);
    }
    this.renderTags();
    this.renderQuick();
    this.renderMobileTags();
    this.renderMobileQuick();
    this.renderMobileSearch(document.getElementById('mobileDisInp')?.value || '');
    this.updateBadge();
  },

  // ── 조회 실행
  query() {
    if (!this.selectedDiseases.length) { alert('질환을 1개 이상 선택해주세요.'); return; }

    const selDiseases = this.selectedDiseases.map(code => {
      const d = this.diseases.find(x => x.code === code) || { code, name: code, cat: '기타', body: [] };
      return d;
    });

    const companyIds = this.companies.map(c => c.id);
    const scores = {};

    companyIds.forEach(cid => {
      let tot = 0, ok = 0, cond = 0, ng = 0;
      const dets = selDiseases.map(d => {
        const inf = this.getCondition(d.code, cid);
        tot += inf.score || 0;
        if (inf.status === 'ok') ok++;
        else if (inf.status === 'conditional') cond++;
        else ng++;
        return { ...d, ...inf };
      });
      scores[cid] = { tot, ok, cond, ng, dets };
    });

    const maxSc = selDiseases.length * 5;
    const baseCount = selDiseases.filter(d =>
      companyIds.every(cid => (this.getCondition(d.code, cid)).status === 'ok')
    ).length;

    const sorted = Object.entries(scores).sort((a, b) =>
      a[1].ng - b[1].ng || b[1].tot - a[1].tot
    );

    this.renderResult(sorted, selDiseases, scores, maxSc, baseCount);
    this.renderMobileResult(sorted, selDiseases, maxSc, baseCount);
  },

  // ── 초기화
  render() {
    this.renderQuick();
    this.renderMobileQuick();
    this.renderMobileTags();
    this.renderMobileSearch('');
    this.updateBadge();
  },

  renderQuick() {
    const QUICK = ['I10','E11','E78','M10','D12','D34','M51','D27','N20','D25','H26','I83','K80','K64','J35'];
    const el = document.getElementById('quickList');
    if (!el) return;
    el.innerHTML = QUICK.map(code => {
      const d = this.diseases.find(x => x.code === code);
      if (!d) return '';
      const sel = this.selectedDiseases.includes(code);
      return `<div class="qi ${sel ? 'sel' : ''}" onclick="APP.toggleDis('${code}')">
        <div class="qi-box"><div class="qi-chk"></div></div>
        <span class="qi-name">${d.name}</span>
        <span class="qi-cat cat-${d.cat}">${d.cat}</span>
        <span class="qi-code">${d.code}</span>
      </div>`;
    }).join('');
  },

  renderTags() {
    const el = document.getElementById('tagArea');
    if (!el) return;
    if (!this.selectedDiseases.length) {
      el.innerHTML = '<span style="font-size:11px;color:#9ca3af">선택된 질환 없음</span>';
      return;
    }
    el.innerHTML = this.selectedDiseases.map(code => {
      const d = this.diseases.find(x => x.code === code);
      const name = d ? d.name : code;
      return `<span class="dtag">${name}<span class="dtag-x" onclick="APP.toggleDis('${code}')">×</span></span>`;
    }).join('');
  },

  updateBadge() {
    const el = document.getElementById('ctaBadge');
    if (el) el.textContent = this.selectedDiseases.length ? `질환 ${this.selectedDiseases.length}개 선택` : '선택 없음';
    const mobileEl = document.getElementById('mobileCtaBadge');
    if (mobileEl) mobileEl.textContent = this.selectedDiseases.length ? `${this.selectedDiseases.length}개 선택` : '선택 없음';
  },

  renderMobileTags() {
    const el = document.getElementById('mobileTagArea');
    if (!el) return;
    if (!this.selectedDiseases.length) {
      el.innerHTML = '<span style="font-size:12px;color:#9ca3af">선택된 질환 없음</span>';
      return;
    }
    el.innerHTML = this.selectedDiseases.map(code => {
      const d = this.diseases.find(x => x.code === code);
      const name = d ? d.name : code;
      return `<span class="dtag">${name}<span class="dtag-x" onclick="APP.toggleDis('${code}')">×</span></span>`;
    }).join('');
  },

  renderMobileQuick() {
    const QUICK = ['I10','E11','E78','M10','D12','D34','M51','D27','N20','D25','H26','I83','K80','K64','J35'];
    const el = document.getElementById('mobileQuickList');
    if (!el) return;
    el.innerHTML = QUICK.map(code => {
      const d = this.diseases.find(x => x.code === code);
      if (!d) return '';
      const sel = this.selectedDiseases.includes(code);
      return `<button class="qi ${sel ? 'sel' : ''}" type="button" onclick="APP.toggleDis('${code}')">
        <div class="qi-box"><div class="qi-chk"></div></div>
        <span class="qi-name">${d.name}</span>
        <span class="qi-cat cat-${d.cat}">${d.cat}</span>
        <span class="qi-code">${d.code}</span>
      </button>`;
    }).join('');
  },

  renderMobileSearch(q) {
    const el = document.getElementById('mobileDisList');
    if (!el) return;
    const keyword = q.trim();
    if (!keyword) {
      el.innerHTML = '<div style="font-size:12px;color:#9ca3af;padding:4px 2px">질환명이나 부위를 입력하면 결과가 표시됩니다.</div>';
      return;
    }
    const matches = this.searchDis(keyword);
    if (!matches.length) {
      el.innerHTML = '<div style="font-size:12px;color:#dc2626;padding:4px 2px">검색 결과가 없습니다. 다른 단어로 검색해보세요.</div>';
      return;
    }
    el.innerHTML = matches.map(d => {
      const sel = this.selectedDiseases.includes(d.code);
      return `<button class="mobile-dis-item ${sel ? 'sel' : ''}" type="button" onclick="APP.toggleDis('${d.code}')">
        <div class="mobile-dis-main">
          <div class="mobile-dis-name">${d.name}</div>
          <div class="mobile-dis-meta">
            <span class="mobile-code">${d.code}</span>
            <span class="qi-cat cat-${d.cat}">${d.cat}</span>
            ${d.body?.[0] ? `<span class="mobile-body">${d.body[0]}</span>` : ''}
          </div>
        </div>
        <span class="mobile-plus">${sel ? '✓' : '+'}</span>
      </button>`;
    }).join('');
  },

  renderResult(sorted, selDiseases, scores, maxSc, baseCount) {
    const main = document.getElementById('mainArea');
    const age = document.getElementById('age')?.value;
    const gender = document.getElementById('gender')?.value;
    const job = document.getElementById('jobInp')?.value;
    const prods = [...new Set([...document.querySelectorAll('.pchip.on')].map(el => el.textContent.trim()))].join(', ');
    const cInfo = [age && `만 ${age}세`, gender === 'M' ? '남성' : gender === 'F' ? '여성' : '', job].filter(Boolean).join(' · ');

    const t1 = sorted.filter(([, s]) => s.ng === 0 && s.cond === 0);
    const t2 = sorted.filter(([, s]) => s.ng === 0 && s.cond > 0);
    const t3 = sorted.filter(([, s]) => s.ng > 0);

    const rCard = (cid, sc, rank) => {
      const co = this.companies.find(c => c.id === cid) || { id: cid, type: '손해', color: '#666' };
      const pct = Math.round(sc.tot / maxSc * 100);
      const tc = sc.ng === 0 && sc.cond === 0 ? 't1' : sc.ng === 0 ? 't2' : 't3';
      const rk = rank <= 3 ? ['rk1','rk2','rk3'][rank-1] : 'rkn';
      const bdg = sc.ng === 0 && sc.cond === 0 ? 'b-best' : sc.ng === 0 ? 'b-cond' : 'b-warn';
      const bdgTxt = sc.ng === 0 && sc.cond === 0 ? '✅ 전담보 인수가능' : sc.ng === 0 ? '⚠️ 조건부 포함' : '❌ 일부 인수불가';
      const fc = sc.ng === 0 && sc.cond === 0 ? 'var(--green)' : sc.ng === 0 ? 'var(--amber)' : 'var(--red)';
      const specialHtml = co.special ? `<div class="rc-2q">🔔 ${co.special}</div>` : '';
      return `<div class="rcard ${tc}">
        <div class="rc-top">
          <div class="rc-rank ${rk}">${rank}</div>
          <div class="rc-co">${co.name || cid}</div>
          <span class="rc-type ${co.type}t">${co.type}</span>
          <span class="rc-badge ${bdg}">${bdgTxt}</span>
        </div>
        <div class="rc-body">
          <div class="rc-det">${sc.dets.map(d => `<strong>${d.name}</strong>: ${d.note || '-'}`).join('<br>')}</div>
          ${specialHtml}
          <div class="score-bar">
            <span class="score-lbl">인수 유리도</span>
            <div class="score-track"><div class="score-fill" style="width:${pct}%;background:${fc}"></div></div>
            <span style="font-size:11px;color:#6b7280;min-width:30px">${pct}%</span>
          </div>
          <div class="dis-chips">${sc.dets.map(d => `<span class="dis-chip ${d.status}">${d.name}</span>`).join('')}</div>
        </div>
      </div>`;
    };

    const tRows = selDiseases.map(d => {
      const cols = this.companies.map(co => {
        const inf = this.getCondition(d.code, co.id);
        const cls = inf.status === 'ok' ? 'dok' : inf.status === 'conditional' ? 'dcond' : 'dng';
        return `<td style="text-align:center" title="${inf.note || ''}" ><span class="${cls}">●</span></td>`;
      }).join('');
      return `<tr>
        <td><span class="code-badge">${d.code}</span></td>
        <td style="font-weight:500">${d.name}</td>
        <td><span class="qi-cat cat-${d.cat}">${d.cat}</span></td>
        ${cols}
      </tr>`;
    }).join('');

    main.innerHTML = `<div class="fade-in">
      <div class="rbanner">
        <span class="rb-lbl">${cInfo ? cInfo + ' ·' : ''} 조회:</span>
        ${prods.split(',').map(p => `<span class="rb-chip rb-prod">${p.trim()}</span>`).join('')}
        <span style="color:#9ca3af">·</span>
        ${selDiseases.map(d => `<span class="rb-chip rb-dis">${d.name}</span>`).join('')}
      </div>
      <div class="baseline">
        📊 <strong>비교 기준:</strong> 선택 ${selDiseases.length}개 질환 중 <strong>${baseCount}개</strong>가 전사 공통 인수가능.
        공통 기준선 대비 <span style="color:var(--green);font-weight:700">더 유리</span> →
        <span style="color:var(--amber);font-weight:700">동등</span> →
        <span style="color:var(--red);font-weight:700">불리</span> 순 정렬
      </div>
      <div class="sum-row">
        <div class="sum-card"><div class="sum-n cg">${t1.length}</div><div class="sum-l">전담보 가능</div></div>
        <div class="sum-card"><div class="sum-n ca">${t2.length}</div><div class="sum-l">조건부 포함</div></div>
        <div class="sum-card"><div class="sum-n cr">${t3.length}</div><div class="sum-l">일부 불가</div></div>
        <div class="sum-card"><div class="sum-n cb">${selDiseases.length}</div><div class="sum-l">선택 질환</div></div>
      </div>

      ${t1.length ? `<div class="sec-title"><div class="sdot" style="background:var(--green)"></div>전담보 인수가능 · 우선 추천</div>
      <div class="rank-list">${t1.map(([c, s], i) => rCard(c, s, i + 1)).join('')}</div>` : ''}

      ${t2.length ? `<div class="sec-title"><div class="sdot" style="background:var(--amber)"></div>조건부 인수 포함</div>
      <div class="rank-list">${t2.map(([c, s], i) => rCard(c, s, t1.length + i + 1)).join('')}</div>` : ''}

      ${t3.length ? `<div class="ng-panel">
        <div class="ng-hdr" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'flex':'none'">
          <div class="ng-l"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--red);margin-right:6px"></span>
          일부 인수불가 <strong style="color:#111">${t3.length}개사</strong></div>
          <span style="font-size:11px;color:#9ca3af">펼치기 ▾</span>
        </div>
        <div class="ng-chips">${t3.map(([c]) => `<span class="ng-chip">${c}</span>`).join('')}</div>
      </div>` : ''}

      <div class="tab-wrap">
        <div class="tab-bar">
          <button class="tbtn active" onclick="swTab(this,'pt')">📊 질환별 비교표</button>
          <button class="tbtn" onclick="swTab(this,'pr')">🏆 회사별 상세</button>
          <button class="tbtn" onclick="swTab(this,'pg')">📌 안내</button>
        </div>
        <div id="pt" class="tpane active">
          <div style="overflow-x:auto">
            <table class="ctbl">
              <thead><tr><th>코드</th><th>질병명</th><th>분류</th>
                ${this.companies.map(c => `<th style="text-align:center;font-size:11px">${c.name}</th>`).join('')}
              </tr></thead>
              <tbody>${tRows}</tbody>
            </table>
          </div>
          <div class="legend-bar">
            <span><span class="dok">●</span> 인수가능</span>
            <span><span class="dcond">●</span> 조건부</span>
            <span><span class="dng">●</span> 인수불가</span>
            <span style="margin-left:auto;font-size:11px;color:#9ca3af">셀에 마우스 올리면 상세 조건 확인</span>
          </div>
        </div>
        <div id="pr" class="tpane">
          <div class="rank-list">${sorted.map(([c, s], i) => rCard(c, s, i + 1)).join('')}</div>
        </div>
        <div id="pg" class="tpane">
          <div class="info-box info-blue"><strong>📌 결과 해석</strong><br>
          · <strong>전담보 인수가능</strong>: 선택 질환 전부 조건 없이 인수<br>
          · <strong>조건부 포함</strong>: 부담보·입원일수 제한 등 조건 있음<br>
          · <strong>현대해상</strong>: 2Q패스 설계 요청 필수<br>
          · <strong>NH농협손보</strong>: 예외질환 4개까지, 5년내 동일질환 치료시 인수 불가</div>
          <div class="info-box info-amber"><strong>⚠️ 주의사항</strong><br>
          · 본 자료는 설계 참고용 — 최종 심사결과는 각사 확인 필수<br>
          · 직업 3~4급 고위험직종은 병력 외 상해담보 제한 가능<br>
          · conditions.json 업데이트로 데이터 관리 가능</div>
        </div>
      </div>
    </div>`;
  },

  renderMobileResult(sorted, selDiseases, maxSc, baseCount) {
    const el = document.getElementById('mobileResultArea');
    if (!el) return;
    const t1 = sorted.filter(([, s]) => s.ng === 0 && s.cond === 0);
    const t2 = sorted.filter(([, s]) => s.ng === 0 && s.cond > 0);
    const t3 = sorted.filter(([, s]) => s.ng > 0);
    const badge = sc => sc.ng === 0 && sc.cond === 0
      ? ['전담보 가능', 'b-best']
      : sc.ng === 0
        ? ['조건부 포함', 'b-cond']
        : ['일부 불가', 'b-warn'];

    const rows = sorted.slice(0, 6).map(([cid, sc], idx) => {
      const co = this.companies.find(c => c.id === cid) || { name: cid };
      const pct = Math.round(sc.tot / maxSc * 100);
      const [text, cls] = badge(sc);
      const color = sc.ng === 0 && sc.cond === 0 ? 'var(--green)' : sc.ng === 0 ? 'var(--amber)' : 'var(--red)';
      return `<article class="mobile-company-card">
        <div class="mobile-company-top">
          <div class="mobile-rank">${idx + 1}</div>
          <div class="mobile-company-name">${co.name || cid}</div>
          <span class="mobile-company-badge ${cls}">${text}</span>
        </div>
        <div class="mobile-company-note">${sc.dets.map(d => `<strong>${d.name}</strong>: ${d.note || '-'}`).join('<br>')}</div>
        <div class="mobile-score">
          <span class="score-lbl">인수 유리도</span>
          <div class="score-track"><div class="score-fill" style="width:${pct}%;background:${color}"></div></div>
          <span style="font-size:12px;color:#6b7280;min-width:34px;text-align:right">${pct}%</span>
        </div>
      </article>`;
    }).join('');

    el.innerHTML = `<div class="mobile-result-title">조회 결과</div>
      <div class="sum-row">
        <div class="sum-card"><div class="sum-n cg">${t1.length}</div><div class="sum-l">전담보 가능</div></div>
        <div class="sum-card"><div class="sum-n ca">${t2.length}</div><div class="sum-l">조건부 포함</div></div>
        <div class="sum-card"><div class="sum-n cr">${t3.length}</div><div class="sum-l">일부 불가</div></div>
        <div class="sum-card"><div class="sum-n cb">${baseCount}</div><div class="sum-l">공통 가능</div></div>
      </div>
      ${rows}`;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// ── 전역 함수
function swTab(btn, pid) {
  btn.closest('.tab-wrap').querySelectorAll('.tbtn').forEach(b => b.classList.remove('active'));
  btn.closest('.tab-wrap').querySelectorAll('.tpane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(pid).classList.add('active');
}

function setMobileTab(id) {
  document.querySelectorAll('.mobile-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mtab === id);
  });
  document.querySelectorAll('.mobile-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `mobilePanel-${id}`);
  });
  if (id === 'search') {
    setTimeout(() => document.getElementById('mobileDisInp')?.focus(), 80);
  }
}

function toggleProduct(btn) {
  btn.classList.toggle('on');
}

function onMobileDisSearch(v) {
  APP.renderMobileSearch(v);
}

// ── 직업 검색 핸들러
function onJobSearch(v) {
  const ac = document.getElementById('jobAcList');
  const res = document.getElementById('jobResult');
  if (!v.trim()) { ac.classList.remove('show'); res.classList.remove('show'); return; }
  const matches = APP.searchJob(v);
  if (!matches.length) { ac.classList.remove('show'); return; }
  const gradeColors = { 1: 'g1', 2: 'g2', 3: 'g3', 4: 'g4' };
  ac.innerHTML = matches.map(j =>
    `<div class="job-ac-item" onclick="selectJob('${j.name.replace(/'/g,"\\'")}',${j.grade},'${j.desc.replace(/'/g,"\\'")}')">
      <div class="jac-grade ${gradeColors[j.grade]}">${j.grade}급</div>
      <span>${j.name}</span>
    </div>`
  ).join('');
  ac.classList.add('show');
}

function selectJob(name, grade, desc) {
  document.getElementById('jobInp').value = name;
  document.getElementById('jobAcList').classList.remove('show');
  const gradeColors = { 1: 'g1', 2: 'g2', 3: 'g3', 4: 'g4' };
  const gradeLabels = { 1: '1급 (표준체)', 2: '2급 (표준체)', 3: '3급 (위험직)', 4: '4급 (초위험직)' };
  const el = document.getElementById('jobResult');
  el.innerHTML = `<div class="grade-badge ${gradeColors[grade]}">상해 ${gradeLabels[grade]}</div>
    <div class="grade-desc">${desc}</div>`;
  el.classList.add('show');
}

// ── 질환 검색 핸들러
function onDisSearch(v) {
  const ac = document.getElementById('disAc');
  if (!v.trim()) { ac.classList.remove('show'); return; }
  const matches = APP.searchDis(v);
  if (!matches.length) { ac.classList.remove('show'); return; }
  const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hl = s => s.replace(new RegExp(esc, 'gi'), m => `<span class="hl">${m}</span>`);
  ac.innerHTML = matches.map(d =>
    `<div class="ac-item" onclick="APP.toggleDis('${d.code}');document.getElementById('disInp').value='';document.getElementById('disAc').classList.remove('show')">
      <span class="ac-code">${hl(d.code)}</span>
      <span class="ac-name">${hl(d.name)}</span>
      <span class="ac-cat cat-${d.cat}">${d.cat}</span>
      ${d.body?.[0] ? `<span class="ac-body">${d.body[0]}</span>` : ''}
    </div>`
  ).join('');
  ac.classList.add('show');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.job-ac')) document.getElementById('jobAcList')?.classList.remove('show');
  if (!e.target.closest('.srch-wrap')) document.getElementById('disAc')?.classList.remove('show');
});

// ── 앱 시작
APP.loadAll().catch(err => {
  console.error('데이터 로드 실패:', err);
  document.getElementById('mainArea').innerHTML =
    '<div style="padding:40px;text-align:center;color:#dc2626">⚠️ 데이터 로드 실패. 서버 환경에서 실행해주세요.</div>';
});
