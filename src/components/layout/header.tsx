'use client'

import { Bell, Menu, Search } from 'lucide-react'
import { useState } from 'react'
import { initials } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

interface HeaderProps {
  title: string
  user: { name: string; role: Role }
  onMenuClick?: () => void
  notificationCount?: number
}

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER:     'Manager',
  MARKETING:   'Marketing',
  SALES:       'Sales',
}

export function Header({ title, user, onMenuClick, notificationCount = 0 }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-4 md:px-6 h-14 shrink-0"
      style={{ borderBottom: '1px solid var(--nf-border)', background: 'var(--nf-surface)' }}>

      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg"
          style={{ color: 'var(--nf-muted)' }}>
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg btn-ghost">
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: 'var(--nf-accent)', color: '#0F172A' }}>
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: 'linear-gradient(135deg, #06B6D4, #6366F1)', color: 'white' }}>
          {initials(user.name)}
        </div>
      </div>
    </header>
  )
}
