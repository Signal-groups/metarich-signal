"use client"

import { Brush, FileText, Layers, Lightbulb, PanelsTopLeft } from 'lucide-react'

const tabs = [
  { label: '정보', icon: FileText },
  { label: '템플릿', icon: PanelsTopLeft },
  { label: '스타일', icon: Brush },
  { label: '섹션', icon: Layers },
  { label: '팁', icon: Lightbulb },
]

interface TabRailProps {
  activeTab: number
  onTabChange: (tab: number) => void
}

export default function TabRail({ activeTab, onTabChange }: TabRailProps) {
  return (
    <nav className="w-14 shrink-0 border-r border-slate-200 bg-slate-950 py-3">
      {tabs.map((tab, index) => {
        const Icon = tab.icon
        const active = activeTab === index
        return (
          <button
            key={tab.label}
            type="button"
            className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-md ${
              active ? 'bg-[#C9A96E] text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            onClick={() => onTabChange(index)}
            title={tab.label}
          >
            <Icon size={20} />
          </button>
        )
      })}
    </nav>
  )
}
