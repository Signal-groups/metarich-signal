"use client"

import { useCallback, useEffect, useState } from 'react'

export interface ToolbarState {
  visible: boolean
  top: number
  left: number
}

const hiddenToolbar: ToolbarState = { visible: false, top: 0, left: 0 }

export function useEditable(containerRef: React.RefObject<HTMLElement | null>) {
  const [toolbar, setToolbar] = useState<ToolbarState>(hiddenToolbar)

  const hideToolbar = useCallback(() => setToolbar(hiddenToolbar), [])

  const applyCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
  }, [])

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setToolbar(hiddenToolbar)
        return
      }

      const container = containerRef.current
      const anchorNode = selection.anchorNode
      if (!container || !anchorNode || !container.contains(anchorNode)) {
        setToolbar(hiddenToolbar)
        return
      }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) {
        setToolbar(hiddenToolbar)
        return
      }

      setToolbar({
        visible: true,
        top: Math.max(rect.top + window.scrollY - 52, 12),
        left: rect.left + window.scrollX + rect.width / 2,
      })
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hideToolbar()
    }

    document.addEventListener('selectionchange', handleSelection)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('selectionchange', handleSelection)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [containerRef, hideToolbar])

  return { toolbar, hideToolbar, applyCommand }
}
