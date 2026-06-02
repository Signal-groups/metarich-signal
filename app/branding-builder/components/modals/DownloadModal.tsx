"use client"

import { useMemo, useState } from 'react'
import type { BrandingState } from '../../templates/types'

interface DownloadModalProps {
  state: BrandingState
  getPreviewRoot: () => HTMLElement | null
  onClose: () => void
}

export default function DownloadModal({ state, getPreviewRoot, onClose }: DownloadModalProps) {
  const [agreed, setAgreed] = useState(false)
  const fileName = useMemo(() => {
    const name = state.agentInfo.name.trim() || '설계사'
    return state.mode === 'card' ? `${name}_디지털명함.html` : `${name}_랜딩페이지.html`
  }, [state.agentInfo.name, state.mode])

  const download = () => {
    const previewRoot = getPreviewRoot()
    if (!previewRoot || !agreed) return
    const html = buildDownloadHtml(previewRoot, state)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-md bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-black text-slate-900">HTML 다운로드</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">편집 버튼과 contenteditable 속성을 제거한 파일로 저장합니다.</p>
        <label className="mt-5 flex items-start gap-3 rounded-md border border-slate-200 p-4 text-sm leading-6">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[#1A2744]" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          다운로드한 파일의 이미지와 텍스트 사용 권한을 확인했습니다.
        </label>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" className="h-11 rounded-md border border-slate-200 font-bold" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="h-11 rounded-md bg-[#1A2744] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            onClick={download}
            disabled={!agreed}
          >
            {fileName}
          </button>
        </div>
      </div>
    </div>
  )
}

function buildDownloadHtml(previewRoot: HTMLElement, state: BrandingState) {
  const clone = previewRoot.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.sctrl').forEach((element) => element.remove())
  clone.querySelectorAll('[contenteditable]').forEach((element) => {
    element.removeAttribute('contenteditable')
    element.removeAttribute('suppresscontenteditablewarning')
  })

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(state.agentInfo.name || '설계사 브랜딩')}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"/>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Pretendard Variable', 'Pretendard', -apple-system, sans-serif; word-break: keep-all; overflow-wrap: break-word; background: #f8fafc; color: #111827; }
    .branding-preview-root { max-width: ${state.mode === 'card' ? '390px' : '960px'}; margin: 0 auto; background: #fff; }
    .sctrl { display: none !important; }
    button { font-family: inherit; }
    @media (max-width: 640px) {
      .branding-preview-root { max-width: 100%; }
      section { padding-left: 20px !important; padding-right: 20px !important; }
      h1 { font-size: 32px !important; line-height: 1.2 !important; }
      button, a { min-height: 48px; }
    }
  </style>
</head>
<body>
${clone.outerHTML}
</body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
