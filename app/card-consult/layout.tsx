'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../dashboard/components/Sidebar'
import { DEFAULT_MENU_STATUS } from '../../lib/consultingTools'
import { isApprovedUser } from '../../lib/roles'
import { supabase } from '../../lib/supabase'

export default function CardConsultLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [menuStatus, setMenuStatus] = useState<any>({ ...DEFAULT_MENU_STATUS })

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser()
      .then(async ({ data: { user: authUser } }) => {
        if (!mounted || !authUser) return

        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()

        if (mounted && data && isApprovedUser(data)) {
          setUser(data)
        }
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [])

  const closeWindow = () => {
    if (window.opener) {
      window.close()
      return
    }
    router.replace('/dashboard')
  }

  const openOffice = () => {
    router.push('/dashboard?mode=office')
  }

  const openConsulting = () => {
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', position: 'relative' }}>
      {user && (
        <Sidebar
          user={user}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          mode="consulting"
          onBack={undefined}
          externalMenuStatus={menuStatus}
          onMenuStatusChange={setMenuStatus}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          onOpenOffice={openOffice}
          onOpenConsulting={openConsulting}
          onTabChange={(value: string) => {
            if (value === 'tab:branding' || value === 'branding') router.push('/dashboard?tab=branding')
            else router.push('/dashboard')
          }}
          activeTab={null}
        />
      )}
      <button
        onClick={closeWindow}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 999,
          background: '#1A2744',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        닫기
      </button>
      <main className={user ? 'lg:ml-[300px] pb-24 lg:pb-0' : ''}>
        {children}
      </main>
    </div>
  )
}
