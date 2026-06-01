'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useMobileSidebar } from '@/components/layout/mobile-sidebar-context'
import { Sidebar } from '@/components/layout/sidebar'
import type { Role } from '@/generated/prisma/client'

interface Props {
  user: {
    name: string
    email: string
    role: Role
    businessUnitIds: string[]
  }
  businessUnits: { id: string; name: string; prefix: string }[]
  statusOptions: string[]
}

export function MobileSidebarDrawer({ user, businessUnits, statusOptions }: Props) {
  const { isOpen, close } = useMobileSidebar()

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
        onClick={close}
      />

      {/* Drawer */}
      <div
        className="relative z-10 flex flex-col h-full"
        style={{
          width: '260px',
          background: 'var(--nf-surface)',
          borderRight: '1px solid var(--nf-border)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
          animation: 'slideInLeft 0.2s ease-out',
        }}>
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-3 right-3 p-1.5 rounded-lg"
          style={{ color: 'var(--nf-muted)', zIndex: 1 }}>
          <X className="w-4 h-4" />
        </button>

        <Sidebar user={user} businessUnits={businessUnits} statusOptions={statusOptions} />
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0.5; }
          to   { transform: translateX(0);     opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
