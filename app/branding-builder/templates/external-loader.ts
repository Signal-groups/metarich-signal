import type { AgentInfo, LandingConcept, LandingTemplateId } from './types'

export interface ExternalTemplateRenderInput {
  templateId: LandingTemplateId
  file?: string
  agentInfo: AgentInfo
  concept: LandingConcept | null
}

export async function loadExternalTemplate(input: ExternalTemplateRenderInput) {
  if (!input.file) return ''

  const response = await fetch(input.file)
  if (!response.ok) {
    throw new Error('외부 템플릿을 불러오지 못했습니다.')
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
  }

  const replaced = Object.entries(replacements).reduce(
    (content, [token, value]) => content.replaceAll(token, escapeHtml(value)),
    html,
  )

  if (replaced.includes('editor-inject.js')) return replaced

  return replaced.replace(
    '</body>',
    '<script src="/branding-templates/editor-inject.js"></script></body>',
  )
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
