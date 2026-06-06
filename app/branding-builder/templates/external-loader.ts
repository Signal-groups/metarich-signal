import type { AgentInfo, LandingConcept, LandingTemplateId } from './types'

export interface ExternalTemplateRenderInput {
  templateId: LandingTemplateId
  file?: string
  agentInfo: AgentInfo
  concept: LandingConcept | null
  deletedSecs?: string[]
}

export async function loadExternalTemplate(input: ExternalTemplateRenderInput) {
  if (!input.file) return ''

  const response = await fetch(input.file)
  if (!response.ok) {
    throw new Error('External template load failed.')
  }

  const html = await response.text()
  return injectEditorRuntime(html, input)
}

export function injectEditorRuntime(html: string, input: ExternalTemplateRenderInput) {
  const replacements: Record<string, string> = {
    '{{name}}': input.agentInfo.name,
    '{{title}}': input.agentInfo.title,
    '{{company}}': input.agentInfo.company,
    '{{brand}}': input.agentInfo.brand,
    '{{phone}}': input.agentInfo.phone,
    '{{email}}': input.agentInfo.email,
    '{{kakaoUrl}}': input.agentInfo.kakaoUrl,
    '{{consultUrl}}': input.agentInfo.consultUrl,
    '{{recruitUrl}}': input.agentInfo.recruitUrl,
    '{{slogan}}': input.agentInfo.slogan,
    '{{intro}}': input.agentInfo.intro,
    '{{address}}': input.agentInfo.address,
    '{{branch}}': input.agentInfo.branch,
  }

  const replaced = Object.entries(replacements).reduce(
    (content, [token, value]) => content.replaceAll(token, escapeHtml(value)),
    html,
  )

  const withMeta = replaced.includes('charset=')
    ? replaced
    : replaced.replace(/<head([^>]*)>/i, '<head$1><meta charset="UTF-8">')
  const withEditor = withMeta.includes('editor-inject.js')
    ? withMeta
    : withMeta.replace('</body>', '<script src="/branding-templates/editor-inject.js"></script></body>')

  return withEditor.replace('</body>', `${buildBridgeScript(input)}</body>`)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildBridgeScript(input: ExternalTemplateRenderInput) {
  const deletedSecs = JSON.stringify(input.deletedSecs || [])
  const templateId = JSON.stringify(input.templateId)

  return `<script>
(function(){
  var deletedSecs = ${deletedSecs};
  var templateId = ${templateId};
  var deleteLabel = '\\uC139\\uC158 \\uC0AD\\uC81C';
  var deleteConfirm = '\\uC774 \\uC139\\uC158\\uC744 \\uC0AD\\uC81C\\uD560\\uAE4C\\uC694?';
  function postChange(){
    try{ window.parent.postMessage({ type:'__BAI_CHANGE__', html: document.documentElement.outerHTML }, '*'); }catch(e){}
  }
  function postDelete(id){
    try{ window.parent.postMessage({ type:'__BAI_DELETE_SECTION__', id: id, html: document.documentElement.outerHTML }, '*'); }catch(e){}
  }
  function managedSections(){
    var seen = [];
    var nodes = Array.prototype.slice.call(document.querySelectorAll('section,[data-section-id],main > div,main > article'));
    nodes.forEach(function(node){
      if(node.closest('[data-bai-delete]')) return;
      if(seen.indexOf(node) < 0) seen.push(node);
    });
    return seen.filter(function(node){
      return node && node.children && node.children.length > 0 && String(node.textContent || '').trim().length > 20;
    });
  }
  function sectionId(section, index){
    if(section.dataset.sectionId) return section.dataset.sectionId;
    return section.id ? templateId + '-id-' + section.id : templateId + '-section-' + index;
  }
  function assignSectionIds(){
    managedSections().forEach(function(section, index){
      section.dataset.sectionId = sectionId(section, index);
    });
  }
  function insertPlainText(text){
    var selection = window.getSelection();
    if(!selection || !selection.rangeCount) return;
    selection.deleteFromDocument();
    var range = selection.getRangeAt(0);
    var node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.setEndAfter(node);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  function removeDeleted(){
    assignSectionIds();
    managedSections().forEach(function(section, index){
      if(deletedSecs.indexOf(sectionId(section, index)) >= 0) section.remove();
    });
  }
  function addControls(){
    managedSections().forEach(function(section, index){
      section.querySelectorAll('[data-bai-delete],[id*="bai-d"]').forEach(function(button){ button.remove(); });
      var id = sectionId(section, index);
      section.dataset.sectionId = id;
      if(getComputedStyle(section).position === 'static') section.style.position = 'relative';
      var button = document.createElement('button');
      button.type = 'button';
      button.dataset.baiDelete = 'true';
      button.textContent = deleteLabel;
      button.style.cssText = 'position:absolute;right:12px;top:12px;z-index:2147483000;display:none;border:0;border-radius:8px;background:#dc2626;color:#fff;padding:8px 12px;font:800 12px/1.2 Pretendard,system-ui,sans-serif;box-shadow:0 8px 20px rgba(15,23,42,.18);cursor:pointer;';
      button.onclick = function(event){
        event.preventDefault();
        event.stopPropagation();
        if(!window.confirm(deleteConfirm)) return;
        if(deletedSecs.indexOf(id) < 0) deletedSecs.push(id);
        section.remove();
        postDelete(id);
      };
      section.appendChild(button);
      section.addEventListener('mouseenter', function(){
        button.style.display = 'block';
        section.style.outline = '2px dashed rgba(220,38,38,.45)';
        section.style.outlineOffset = '-2px';
      });
      section.addEventListener('mouseleave', function(){
        button.style.display = 'none';
        section.style.outline = '';
        section.style.outlineOffset = '';
      });
    });
  }
  function makeEditable(){
    document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,li,strong,em').forEach(function(el){
      if(el.closest('[data-bai-delete]')) return;
      if(el.dataset.baiEditable) return;
      el.dataset.baiEditable = 'true';
      el.setAttribute('contenteditable', 'true');
      el.style.cursor = 'text';
      el.addEventListener('focus', function(){ el.style.outline = '2px solid #2563eb'; el.style.outlineOffset = '3px'; });
      el.addEventListener('paste', function(event){
        event.preventDefault();
        var text = '';
        if(event.clipboardData) text = event.clipboardData.getData('text/plain');
        else if(window.clipboardData) text = window.clipboardData.getData('Text');
        if(document.queryCommandSupported && document.queryCommandSupported('insertText')) {
          document.execCommand('insertText', false, text);
        } else {
          insertPlainText(text);
        }
        postChange();
      });
      el.addEventListener('input', postChange);
      el.addEventListener('blur', function(){ el.style.outline = ''; el.style.outlineOffset = ''; postChange(); });
    });
  }
  function patchCopyCut(){
    document.addEventListener('copy', function(event){
      var text = String(window.getSelection ? window.getSelection() : '');
      if(!text || !event.clipboardData) return;
      event.clipboardData.setData('text/plain', text);
      event.preventDefault();
    });
    document.addEventListener('cut', function(event){
      var selection = window.getSelection();
      var text = String(selection || '');
      if(!text || !event.clipboardData) return;
      event.clipboardData.setData('text/plain', text);
      selection.deleteFromDocument();
      event.preventDefault();
      postChange();
    });
  }
  function init(){
    removeDeleted();
    addControls();
    makeEditable();
    patchCopyCut();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
</script>`
}
