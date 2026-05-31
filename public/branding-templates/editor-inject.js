
(function(){
  'use strict';
  var isEditing = false;
  var currentEditable = null;
  var toolbar = null;
  var linkPopup = null;

  // ── 플로팅 툴바 생성 ──
  function createToolbar() {
    var t = document.createElement('div');
    t.id = '__bai_toolbar__';
    t.style.cssText = 'position:fixed;top:-100px;left:0;z-index:99999;display:flex;align-items:center;gap:3px;background:#1a1a1a;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:6px 8px;box-shadow:0 8px 30px rgba(0,0,0,.6);transition:opacity .15s;';
    var btns = [
      ['B','bold','굵게',{fontWeight:'bold'}],
      ['I','italic','기울임',{fontStyle:'italic'}],
      ['U','underline','밑줄',{textDecoration:'underline'}],
    ];
    btns.forEach(function(b){
      var btn = document.createElement('button');
      btn.textContent = b[0]; btn.title = b[2];
      btn.style.cssText = 'width:28px;height:28px;border:none;border-radius:6px;background:rgba(255,255,255,.08);color:#fff;font-size:13px;cursor:pointer;font-family:system-ui;';
      Object.assign(btn.style, b[3]);
      btn.onmousedown = function(e){ e.preventDefault(); document.execCommand(b[1]); };
      t.appendChild(btn);
    });
    // 구분선
    var sep = document.createElement('div');
    sep.style.cssText = 'width:1px;height:20px;background:rgba(255,255,255,.15);margin:0 3px;';
    t.appendChild(sep);
    // 색상 팔레트
    ['#ffffff','#111827','#1a3a6e','#2563eb','#d4af37','#dc2626','#16a34a','#6d28d9'].forEach(function(c){
      var dot = document.createElement('button');
      dot.style.cssText = 'width:18px;height:18px;border-radius:50%;border:1.5px solid rgba(255,255,255,.25);background:'+c+';cursor:pointer;';
      dot.title = c;
      dot.onmousedown = function(e){ e.preventDefault(); document.execCommand('foreColor',false,c); };
      t.appendChild(dot);
    });
    // 폰트 크기
    var sep2 = sep.cloneNode();
    t.appendChild(sep2);
    [12,14,16,18,22,28,36].forEach(function(sz){
      var btn = document.createElement('button');
      btn.textContent = sz+'px';
      btn.style.cssText = 'padding:2px 5px;border:none;border-radius:4px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);font-size:10px;cursor:pointer;font-family:system-ui;';
      btn.onmousedown = function(e){ e.preventDefault(); if(currentEditable) currentEditable.style.fontSize=sz+'px'; };
      t.appendChild(btn);
    });
    // 링크 버튼
    var sep3 = sep.cloneNode();
    t.appendChild(sep3);
    var linkBtn = document.createElement('button');
    linkBtn.textContent = '🔗';
    linkBtn.title = '링크 편집';
    linkBtn.style.cssText = 'width:28px;height:28px;border:none;border-radius:6px;background:rgba(255,255,255,.08);color:#fff;font-size:13px;cursor:pointer;';
    linkBtn.onmousedown = function(e){ e.preventDefault(); showLinkPopup(); };
    t.appendChild(linkBtn);
    // 취소 버튼
    var sep4 = sep.cloneNode();
    t.appendChild(sep4);
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✕';
    cancelBtn.title = '편집 종료';
    cancelBtn.style.cssText = 'width:28px;height:28px;border:none;border-radius:6px;background:rgba(239,68,68,.2);color:#f87171;font-size:13px;cursor:pointer;';
    cancelBtn.onmousedown = function(e){ e.preventDefault(); exitEditing(); };
    t.appendChild(cancelBtn);
    document.body.appendChild(t);
    return t;
  }

  // ── 링크 팝업 ──
  function createLinkPopup() {
    var p = document.createElement('div');
    p.id = '__bai_linkpopup__';
    p.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;background:#1e1e1e;border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:20px;width:320px;box-shadow:0 20px 60px rgba(0,0,0,.8);display:none;font-family:system-ui;';
    p.innerHTML = '<p style="color:#fff;font-weight:800;font-size:14px;margin-bottom:12px;">🔗 링크 편집</p>'
      +'<input id="__bai_link_input__" placeholder="https://" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:#fff;font-size:13px;outline:none;margin-bottom:10px;">'
      +'<div style="display:flex;gap:8px;">'
      +'<button id="__bai_link_save__" style="flex:1;padding:10px;border-radius:8px;background:#d4af37;color:#000;border:none;font-size:13px;font-weight:800;cursor:pointer;">저장</button>'
      +'<button id="__bai_link_cancel__" style="flex:1;padding:10px;border-radius:8px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.1);font-size:13px;cursor:pointer;">취소</button>'
      +'</div>';
    document.body.appendChild(p);
    p.querySelector('#__bai_link_save__').onclick = function(){
      var url = p.querySelector('#__bai_link_input__').value;
      if(currentEditable && currentEditable.tagName==='A') { currentEditable.href = url; currentEditable.setAttribute('data-href',url); }
      p.style.display='none';
      sendChange();
    };
    p.querySelector('#__bai_link_cancel__').onclick = function(){ p.style.display='none'; };
    return p;
  }

  function showLinkPopup() {
    if(!linkPopup) linkPopup = createLinkPopup();
    var input = linkPopup.querySelector('#__bai_link_input__');
    if(currentEditable && currentEditable.tagName==='A') input.value = currentEditable.getAttribute('href')||'';
    else input.value='';
    linkPopup.style.display='block';
    input.focus();
  }

  // ── 툴바 위치 갱신 ──
  function updateToolbarPosition() {
    if(!toolbar) return;
    var sel = window.getSelection();
    if(!sel || sel.isCollapsed || !currentEditable) { toolbar.style.top='-100px'; return; }
    try {
      var range = sel.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      if(rect.width===0) { toolbar.style.top='-100px'; return; }
      var tx = Math.max(8, Math.min(rect.left + rect.width/2 - 180, window.innerWidth-380));
      var ty = Math.max(8, rect.top - 52);
      toolbar.style.left = tx+'px';
      toolbar.style.top = ty+'px';
    } catch(e){}
  }

  // ── 편집 가능 요소 활성화 ──
  var EDITABLE_SELECTORS = 'h1,h2,h3,h4,h5,h6,p,span,li,td,th,label,blockquote,.hero-title,.hero-sub,.section-title,.section-subtitle,.nav-logo,.nav-cta,button:not([id*="bai"]),[class*="title"],[class*="subtitle"],[class*="heading"],[class*="desc"],[class*="text"],[class*="caption"],[class*="label"],[class*="name"],[class*="intro"],[class*="-sub"],[class*="-tag"],[class*="eyebrow"],[class*="badge"],[class*="kpi"],[class*="stat"]';

  function makeEditable(el) {
    if(!el || el.id && el.id.includes('bai')) return;
    if(currentEditable === el) return;
    exitEditing();
    currentEditable = el;
    el.contentEditable = 'true';
    el.style.outline = '2px solid #d4af37';
    el.style.outlineOffset = '2px';
    el.style.borderRadius = '3px';
    el.focus();
    isEditing = true;
    if(!toolbar) toolbar = createToolbar();
  }

  function exitEditing() {
    if(currentEditable) {
      currentEditable.contentEditable = 'false';
      currentEditable.style.outline = '';
      currentEditable.style.outlineOffset = '';
      sendChange();
    }
    currentEditable = null;
    isEditing = false;
    if(toolbar) toolbar.style.top = '-100px';
  }

  // ── 섹션 컨트롤 (삭제 버튼) ──
  function addSectionControls() {
    var sections = document.querySelectorAll('section, [class*="section"], [class*="-sec"], [class*="block"], [class*="-block"], [class*="hero"], [class*="features"], [class*="cta"]');
    sections.forEach(function(sec){
      if(sec.querySelector('[id*="bai-del"]')) return;
      sec.style.position = 'relative';
      var btn = document.createElement('button');
      btn.id = '__bai-del-'+Math.random().toString(36).substr(2,6)+'__';
      btn.title = '이 섹션 삭제';
      btn.textContent = '✕ 삭제';
      btn.style.cssText = 'position:absolute;top:8px;right:8px;z-index:9999;background:rgba(239,68,68,.85);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer;display:none;font-family:system-ui;';
      btn.onclick = function(e){ e.stopPropagation(); if(confirm('이 섹션을 삭제할까요?')){ sec.remove(); sendChange(); }};
      sec.appendChild(btn);
      sec.addEventListener('mouseenter',function(){ btn.style.display='block'; });
      sec.addEventListener('mouseleave',function(){ btn.style.display='none'; });
    });
  }

  // ── 이미지 클릭 교체 ──
  function addImageControls() {
    document.querySelectorAll('img').forEach(function(img){
      if(img.dataset.baiDone) return;
      img.dataset.baiDone='1';
      img.style.cursor='pointer';
      img.title='클릭해서 이미지 교체';
      img.addEventListener('click',function(e){
        e.stopPropagation();
        var inp = document.createElement('input');
        inp.type='file'; inp.accept='image/*';
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
    document.querySelectorAll('a[href]:not([href^="#"])').forEach(function(a){
      if(a.dataset.baiLink) return;
      a.dataset.baiLink='1';
      var badge = document.createElement('span');
      badge.textContent='🔗';
      badge.title='링크 편집';
      badge.style.cssText='position:absolute;top:-10px;right:-6px;z-index:9999;background:#03c75a;color:#fff;border-radius:100px;font-size:10px;padding:2px 5px;cursor:pointer;display:none;';
      if(getComputedStyle(a).position==='static') a.style.position='relative';
      badge.onclick=function(e){e.stopPropagation();currentEditable=a;showLinkPopup();};
      a.appendChild(badge);
      a.addEventListener('mouseenter',function(){badge.style.display='inline';});
      a.addEventListener('mouseleave',function(){badge.style.display='none';});
    });
  }

  // ── 변경사항 부모에 전송 ──
  function sendChange() {
    try {
      window.parent.postMessage({
        type:'__BAI_CHANGE__',
        html: document.documentElement.outerHTML
      },'*');
    } catch(e){}
  }

  // ── 부모 메시지 수신 ──
  window.addEventListener('message',function(e){
    if(!e.data || e.data.type!=='__BAI_CMD__') return;
    var cmd=e.data.cmd, val=e.data.val;
    if(cmd==='fill') {
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
    if(cmd==='resetHover') {
      document.querySelectorAll('button[id*="bai-del"]').forEach(function(b){b.style.display='none';});
    }
  });

  // ── 이벤트 연결 ──
  document.addEventListener('click',function(e){
    if(e.target.id && e.target.id.includes('bai')) return;
    if(e.target.matches(EDITABLE_SELECTORS)) makeEditable(e.target);
    else if(!e.target.closest('[id*="bai"]')) { if(isEditing) exitEditing(); }
  });

  document.addEventListener('mouseup',function(){ setTimeout(updateToolbarPosition,10); });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && isEditing) exitEditing();
    if(isEditing) setTimeout(function(){ sendChange(); },300);
  });

  // ── 초기화 ──
  setTimeout(function(){
    addSectionControls();
    addImageControls();
    addLinkControls();
  },800);

  // body.dp-editing 클래스 추가 (기존 dp 스타일 활용)
  document.body.classList.add('dp-editing','__bai_edit_mode__');

})();
