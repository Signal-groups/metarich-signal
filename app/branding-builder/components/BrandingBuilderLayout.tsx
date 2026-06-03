"use client"

import { useRef, useState } from 'react'
import { useBrandingState } from '../hooks/useBrandingState'
import { useEditable } from '../hooks/useEditable'
import { useSaveLoad } from '../hooks/useSaveLoad'
import { useSections } from '../hooks/useSections'
import AddSectionModal from './modals/AddSectionModal'
import DownloadModal from './modals/DownloadModal'
import LoginModal from './modals/LoginModal'
import SaveSlotsModal from './modals/SaveSlotsModal'
import FloatingToolbar from './FloatingToolbar'
import Preview from './Preview'
import Sidebar from './Sidebar'
import Toolbar from './Toolbar'

export default function BrandingBuilderLayout() {
  const builder = useBrandingState()
  const previewRef = useRef<HTMLDivElement | null>(null)
  const editable = useEditable(previewRef)
  const sections = useSections(builder.setState)
  const saveLoad = useSaveLoad(builder.state, builder.setState)

  const [showLogin, setShowLogin] = useState(true)
  const [showSlots, setShowSlots] = useState(false)
  const [showDownload, setShowDownload] = useState(false)
  const [showAddSection, setShowAddSection] = useState(false)

  const handleSave = () => saveLoad.saveQuick()

  const handleSaveSlot = () => {
    const name = window.prompt('저장 이름을 입력하세요')
    if (name) saveLoad.saveToSlot(name)
  }

  const getIframeHtml = () => {
    const iframe = previewRef.current?.querySelector('iframe')
    if (!iframe) return null
    try {
      return iframe.contentDocument?.documentElement?.outerHTML ?? null
    } catch {
      return null
    }
  }

  return (
    <main className="min-h-screen bg-[#eef3fb] text-slate-900">
      <Toolbar
        userName={saveLoad.storageName}
        mode={builder.state.mode}
        previewMode={builder.previewMode}
        onPreviewModeChange={builder.setPreviewMode}
        onAddSection={() => setShowAddSection(true)}
        onSave={handleSave}
        onSaveSlot={handleSaveSlot}
        onOpenSlots={() => { saveLoad.loadSlots(); setShowSlots(true) }}
        onFillSample={builder.fillSample}
        onReset={builder.resetState}
        onDownload={() => setShowDownload(true)}
      />

      <div className="flex min-h-[calc(100vh-64px)]">
        <Sidebar
          activeTab={builder.activeTab}
          state={builder.state}
          onTabChange={builder.setActiveTab}
          onPatchState={builder.patchState}
          onModeChange={builder.setMode}
          onAddSection={() => setShowAddSection(true)}
          onRestoreSection={sections.restoreSection}
          onRemoveExtraSection={sections.removeExtraSection}
          onMoveExtraSection={sections.moveExtraSection}
        />
        <Preview
          ref={previewRef}
          state={builder.state}
          previewMode={builder.previewMode}
          onDeleteSection={sections.deleteSection}
          onOpenTab={builder.setActiveTab}
        />
      </div>

      <FloatingToolbar
        toolbar={editable.toolbar}
        onCommand={editable.applyCommand}
        onClose={editable.hideToolbar}
      />

      {showLogin && (
        <LoginModal
          userName={saveLoad.userName}
          onUserNameChange={saveLoad.setUserName}
          onClose={() => setShowLogin(false)}
          onLoadLatest={() => { saveLoad.loadLatest(); setShowLogin(false) }}
        />
      )}

      {showSlots && (
        <SaveSlotsModal
          slots={saveLoad.slots}
          onClose={() => setShowSlots(false)}
          onLoad={saveLoad.loadSlot}
          onDelete={saveLoad.deleteSlot}
        />
      )}

      {showDownload && (
        <DownloadModal
          state={builder.state}
          getPreviewRoot={() => previewRef.current}
          getIframeHtml={getIframeHtml}
          onClose={() => setShowDownload(false)}
        />
      )}

      {showAddSection && (
        <AddSectionModal
          onClose={() => setShowAddSection(false)}
          onAdd={(kind) => { sections.addSection(kind); setShowAddSection(false) }}
        />
      )}
    </main>
  )
}
