"use client"

import { useCallback, useMemo, useState } from 'react'
import type { BrandingState } from '../templates/types'

export interface BrandingSaveSlot {
  id: string
  name: string
  savedAt: string
  state: BrandingState
}

const safeName = (name: string) => name.trim() || '이름없음'
const latestKey = (name: string) => `branding3_${safeName(name)}_latest`
const listKey = (name: string) => `branding3_${safeName(name)}_list`

export function useSaveLoad(state: BrandingState, setState: React.Dispatch<React.SetStateAction<BrandingState>>) {
  const [userName, setUserName] = useState('')
  const [slots, setSlots] = useState<BrandingSaveSlot[]>([])

  const storageName = useMemo(() => safeName(userName || state.agentInfo.name), [state.agentInfo.name, userName])

  const loadSlots = useCallback(
    (name = storageName) => {
      if (typeof window === 'undefined') return []
      try {
        const parsed = JSON.parse(window.localStorage.getItem(listKey(name)) || '[]') as BrandingSaveSlot[]
        setSlots(Array.isArray(parsed) ? parsed : [])
        return Array.isArray(parsed) ? parsed : []
      } catch {
        setSlots([])
        return []
      }
    },
    [storageName],
  )

  const loadLatest = useCallback(
    (name = storageName) => {
      if (typeof window === 'undefined') return false
      try {
        const raw = window.localStorage.getItem(latestKey(name))
        if (!raw) return false
        const parsed = JSON.parse(raw) as BrandingState
        setState(parsed)
        return true
      } catch {
        return false
      }
    },
    [setState, storageName],
  )

  const saveLatest = useCallback(
    (name = storageName) => {
      if (typeof window === 'undefined') return
      window.localStorage.setItem(latestKey(name), JSON.stringify(state))
      // TODO: Supabase 저장 연동 시 branding pages 테이블 upsert로 교체
    },
    [state, storageName],
  )

  /** 자동저장: latest만 갱신 */
  const saveQuick = useCallback(() => {
    saveLatest(storageName)
  }, [saveLatest, storageName])

  const saveSlot = useCallback(
    (slotName: string) => {
      if (typeof window === 'undefined') return
      const name = safeName(slotName)
      const currentSlots = loadSlots(storageName)
      const nextSlot: BrandingSaveSlot = {
        id: `${Date.now()}`,
        name,
        savedAt: new Date().toISOString(),
        state,
      }
      const nextSlots = [nextSlot, ...currentSlots].slice(0, 5)
      window.localStorage.setItem(listKey(storageName), JSON.stringify(nextSlots))
      window.localStorage.setItem(latestKey(storageName), JSON.stringify(state))
      setSlots(nextSlots)
      // TODO: Supabase 저장 슬롯 연동 시 사용자 id 기준으로 최대 5개 제한
    },
    [loadSlots, state, storageName],
  )

  /** 이름 지정 슬롯 저장 */
  const saveToSlot = useCallback(
    (slotName: string) => {
      if (slotName.trim()) saveSlot(slotName.trim())
    },
    [saveSlot],
  )

  const loadSlot = useCallback(
    (slotId: string) => {
      const slot = slots.find((item) => item.id === slotId)
      if (!slot) return
      setState(slot.state)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(latestKey(storageName), JSON.stringify(slot.state))
      }
    },
    [setState, slots, storageName],
  )

  const deleteSlot = useCallback(
    (slotId: string) => {
      if (typeof window === 'undefined') return
      const nextSlots = slots.filter((item) => item.id !== slotId)
      window.localStorage.setItem(listKey(storageName), JSON.stringify(nextSlots))
      setSlots(nextSlots)
    },
    [slots, storageName],
  )

  return {
    userName,
    storageName,
    slots,
    setUserName,
    loadSlots,
    loadLatest,
    saveLatest,
    saveQuick,
    saveSlot,
    saveToSlot,
    loadSlot,
    deleteSlot,
  }
}
