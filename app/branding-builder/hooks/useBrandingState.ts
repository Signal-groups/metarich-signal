"use client"

import { useCallback, useMemo, useState } from 'react'
import {
  CARD_TEMPLATES,
  DEFAULT_STATE,
  type AgentInfo,
  type BrandingState,
  type BuilderMode,
  type CardPhotoPosition,
  type CardTemplateId,
  type LandingConcept,
  type LandingTemplateId,
} from '../templates/types'

type StatePatch = Partial<BrandingState>
type AgentPatch = Partial<AgentInfo>

const cloneDefaultState = (): BrandingState => ({
  ...DEFAULT_STATE,
  agentInfo: { ...DEFAULT_STATE.agentInfo },
  deletedSecs: [...DEFAULT_STATE.deletedSecs],
  extraSecs: [...DEFAULT_STATE.extraSecs],
  cardTags: [...DEFAULT_STATE.cardTags],
})

export function useBrandingState() {
  const [state, setState] = useState<BrandingState>(() => cloneDefaultState())
  const [activeTab, setActiveTab] = useState(0)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')

  const patchState = useCallback((patch: StatePatch) => {
    setState((current) => ({ ...current, ...patch }))
  }, [])

  const patchAgent = useCallback((patch: AgentPatch) => {
    setState((current) => ({
      ...current,
      agentInfo: { ...current.agentInfo, ...patch },
    }))
  }, [])

  const setMode = useCallback((mode: BuilderMode) => {
    setState((current) => ({ ...current, mode }))
    setPreviewMode(mode === 'card' ? 'mobile' : 'desktop')
  }, [])

  const setLandingTemplate = useCallback((landingTemplateId: LandingTemplateId) => {
    setState((current) => ({ ...current, landingTemplateId }))
  }, [])

  const setLandingConcept = useCallback((landingConcept: LandingConcept | null) => {
    setState((current) => ({ ...current, landingConcept }))
  }, [])

  const setCardTemplate = useCallback((cardTemplateId: CardTemplateId) => {
    const template = CARD_TEMPLATES.find((item) => item.id === cardTemplateId)
    setState((current) => ({
      ...current,
      cardTemplateId,
      cardBg: template?.bg ?? current.cardBg,
      cardPhotoPos: template?.defaultPhotoPos ?? current.cardPhotoPos,
    }))
  }, [])

  const setCardPhotoPos = useCallback((cardPhotoPos: CardPhotoPosition) => {
    setState((current) => ({ ...current, cardPhotoPos }))
  }, [])

  const resetState = useCallback(() => {
    setState(cloneDefaultState())
    setActiveTab(0)
    setPreviewMode('desktop')
  }, [])

  const fillSample = useCallback(() => {
    setState((current) => ({
      ...current,
      landingConcept: 'consult',
      agentInfo: {
        ...current.agentInfo,
        name: '김민준',
        title: 'AFPK · CFP 재무설계사',
        company: '메타리치 시그널그룹',
        branch: '강남지점',
        brand: '보험의 기준',
        phone: '010-1234-5678',
        email: 'advisor@metarich.kr',
        slogan: '내 보험, 지금 기준으로 다시 점검합니다',
        intro: '보장 공백과 중복 보험료를 함께 확인하고, 고객의 생활 흐름에 맞는 보험 구조를 제안합니다.',
        qualifications: ['AFPK', 'CFP'],
        consultFields: ['보장분석', '보험 리모델링', '실손보험 점검', '연금 상담', '암·뇌·심장 보장 점검'],
        stat1: '1,200건+',
        stat2: '97%',
        stat3: '월 25만원',
      },
    }))
  }, [])

  const value = useMemo(
    () => ({
      state,
      activeTab,
      previewMode,
      patchState,
      patchAgent,
      setState,
      setActiveTab,
      setPreviewMode,
      setMode,
      setLandingTemplate,
      setLandingConcept,
      setCardTemplate,
      setCardPhotoPos,
      resetState,
      fillSample,
    }),
    [
      activeTab,
      fillSample,
      patchAgent,
      patchState,
      previewMode,
      resetState,
      setCardPhotoPos,
      setCardTemplate,
      setLandingConcept,
      setLandingTemplate,
      setMode,
      state,
    ],
  )

  return value
}
