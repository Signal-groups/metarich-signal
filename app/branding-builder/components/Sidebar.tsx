"use client"

import type { BrandingState, BuilderMode } from '../templates/types'
import InfoPanel from './panels/InfoPanel'
import SectionPanel from './panels/SectionPanel'
import StylePanel from './panels/StylePanel'
import TemplatePanel from './panels/TemplatePanel'
import TipPanel, { type BrandingCopyJson, type GeneratedSection } from './panels/TipPanel'
import TabRail from './TabRail'

interface SidebarProps {
  activeTab: number
  state: BrandingState
  onTabChange: (tab: number) => void
  onPatchState: (patch: Partial<BrandingState>) => void
  onModeChange: (mode: BuilderMode) => void
  onAddSection: () => void
  onRestoreSection: (id: string) => void
  onRemoveExtraSection: (id: string) => void
  onMoveExtraSection: (id: string, direction: -1 | 1) => void
  onApplyCopy: (copy: BrandingCopyJson, sections: GeneratedSection[]) => void
}

export default function Sidebar(props: SidebarProps) {
  return (
    <aside className="flex w-[360px] shrink-0 border-r border-slate-200 bg-white">
      <TabRail activeTab={props.activeTab} onTabChange={props.onTabChange} />
      <div className="min-w-0 flex-1 overflow-y-auto p-5">
        {props.activeTab === 0 && (
          <TemplatePanel
            state={props.state}
            onPatchState={props.onPatchState}
            onModeChange={props.onModeChange}
          />
        )}
        {props.activeTab === 1 && <InfoPanel state={props.state} onPatchState={props.onPatchState} />}
        {props.activeTab === 2 && <StylePanel state={props.state} onPatchState={props.onPatchState} />}
        {props.activeTab === 3 && (
          <SectionPanel
            state={props.state}
            onAddSection={props.onAddSection}
            onRestoreSection={props.onRestoreSection}
            onRemoveExtraSection={props.onRemoveExtraSection}
            onMoveExtraSection={props.onMoveExtraSection}
          />
        )}
        {props.activeTab === 4 && <TipPanel state={props.state} onApplyCopy={props.onApplyCopy} />}
      </div>
    </aside>
  )
}
