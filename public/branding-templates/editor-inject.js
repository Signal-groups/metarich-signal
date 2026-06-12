
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
  var m = bg.match(/\d+/g);
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

// ── 섹션 삭제 버튼: buildBridgeScript에서 처리하므로 여기서는 생략 ──

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

// ── iframe 외부 클릭 시 툴바 숨김 ──
window.addEventListener('blur',function(){
  if(cur)exitEdit();
});

function init(){
  isDark=detectDark();
  setTimeout(function(){addImgBtns();},600);
}
init();

})();
