'use client'

import { Menu } from 'lucide-react'
import { initials } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'
import { NotificationBell } from '@/components/layout/notification-bell'
import { useMobileSidebar } from '@/components/layout/mobile-sidebar-context'

interface HeaderProps {
  title: string
  user: { name: string; role: Role }
  onMenuClick?: () => void
}

export function Header({ title, user, onMenuClick }: HeaderProps) {
  const sidebar = useMobileSidebar()

  function handleMenuClick() {
    onMenuClick?.()
    sidebar.open()
  }

  return (
    <header
      className="flex items-center justify-between px-4 md:px-6 h-14 shrink-0"
      style={{ borderBottom: '1px solid var(--nf-border)', background: 'var(--nf-surface)' }}
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={handleMenuClick}
          className="md:hidden p-1.5 rounded-lg"
          style={{ color: 'var(--nf-muted)' }}
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Live notification bell — polls /api/notifications every 30 s */}
        <NotificationBell />

        {/* User avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: 'linear-gradient(135deg, #06B6D4, #6366F1)', color: 'white' }}
        >
          {initials(user.name)}
        </div>
      </div>
    </header>
  )
}
