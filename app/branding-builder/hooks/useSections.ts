"use client"

import { useCallback } from 'react'
import type { BrandingState } from '../templates/types'

type SetBrandingState = React.Dispatch<React.SetStateAction<BrandingState>>

const SECTION_HTML: Record<string, string> = {
  faq: '<section data-section-id="extra-faq"><h2>자주 묻는 질문</h2><p>상담 전에 많이 궁금해하는 내용을 정리해보세요.</p></section>',
  review: '<section data-section-id="extra-review"><h2>고객 후기</h2><p>상담 후기를 짧고 신뢰감 있게 배치할 수 있습니다.</p></section>',
  form: '<section data-section-id="extra-form"><h2>상담 신청</h2><p>이름, 연락처, 문의 내용을 받을 수 있는 영역입니다.</p></section>',
  banner: '<section data-section-id="extra-banner"><h2>안내 배너</h2><p>이번 달 상담 안내나 주요 공지를 넣어보세요.</p></section>',
}

export function useSections(setState: SetBrandingState) {
  const addSection = useCallback(
    (kind: keyof typeof SECTION_HTML) => {
      const id = `${kind}-${Date.now()}`
      setState((current) => ({
        ...current,
        extraSecs: [...current.extraSecs, { id, html: SECTION_HTML[kind] }],
        deletedSecs: current.deletedSecs.filter((sectionId) => sectionId !== id),
      }))
    },
    [setState],
  )

  const deleteSection = useCallback(
    (id: string) => {
      setState((current) => ({
        ...current,
        deletedSecs: current.deletedSecs.includes(id)
          ? current.deletedSecs
          : [...current.deletedSecs, id],
      }))
    },
    [setState],
  )

  const restoreSection = useCallback(
    (id: string) => {
      setState((current) => ({
        ...current,
        deletedSecs: current.deletedSecs.filter((sectionId) => sectionId !== id),
      }))
    },
    [setState],
  )

  const removeExtraSection = useCallback(
    (id: string) => {
      setState((current) => ({
        ...current,
        extraSecs: current.extraSecs.filter((section) => section.id !== id),
        deletedSecs: current.deletedSecs.filter((sectionId) => sectionId !== id),
      }))
    },
    [setState],
  )

  const moveExtraSection = useCallback(
    (id: string, direction: -1 | 1) => {
      setState((current) => {
        const index = current.extraSecs.findIndex((section) => section.id === id)
        const nextIndex = index + direction
        if (index < 0 || nextIndex < 0 || nextIndex >= current.extraSecs.length) return current

        const nextSections = [...current.extraSecs]
        const [section] = nextSections.splice(index, 1)
        nextSections.splice(nextIndex, 0, section)
        return { ...current, extraSecs: nextSections }
      })
    },
    [setState],
  )

  return { addSection, deleteSection, restoreSection, removeExtraSection, moveExtraSection }
}
