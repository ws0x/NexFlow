'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  PlusCircle, List, BarChart3, Settings, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'
import { QuickLeadModal } from '@/components/leads/quick-lead-modal'

interface MobileNavProps {
  role: Role
  statusOptions: string[]
}

export function MobileNav({ role, statusOptions }: MobileNavProps) {
  const pathname              = usePathname()
  const [quickOpen, setQuickOpen] = useState(false)

  const showQuickAccess = role === 'MARKETING' || role === 'SALES' || role === 'SUPER_ADMIN'

  type NavEntry =
    | { type: 'link'; href: string; label: string; icon: React.ElementType; roles: Role[] }
    | { type: 'action'; label: string; icon: React.ElementType; roles: Role[]; action: () => void }

  const items: NavEntry[] = [
    { type: 'link',   href: '/leads/new',  label: 'New',      icon: PlusCircle, roles: ['MARKETING', 'SUPER_ADMIN'] },
    { type: 'link',   href: '/leads',      label: 'Leads',    icon: List,       roles: ['MARKETING', 'SALES', 'MANAGER', 'SUPER_ADMIN'] },
    ...(showQuickAccess ? [{
      type: 'action' as const,
      label: 'Quick',
      icon: Search,
      roles: ['MARKETING', 'SALES', 'SUPER_ADMIN'] as Role[],
      action: () => setQuickOpen(true),
    }] : []),
    { type: 'link',   href: '/analytics', label: 'Analytics', icon: BarChart3,  roles: ['MANAGER', 'SUPER_ADMIN'] },
    { type: 'link',   href: '/admin',     label: 'Admin',     icon: Settings,   roles: ['SUPER_ADMIN'] },
  ]

  const visible = items.filter((item) => (item.roles as string[]).includes(role))

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
        style={{
          background: 'var(--nf-surface)',
          borderTop: '1px solid var(--nf-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        {visible.map((item) => {
          const Icon = item.icon

          if (item.type === 'action') {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px]"
                style={{ color: 'var(--nf-accent)' }}>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--nf-accent-glow)', border: '1px solid var(--nf-accent)' }}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          }

          const isActive = item.href === '/leads'
            ? (pathname === '/leads' || (pathname.startsWith('/leads/') && !pathname.startsWith('/leads/new')))
            : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors"
              style={{ color: isActive ? 'var(--nf-accent)' : 'var(--nf-subtle)' }}>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={isActive ? { background: 'var(--nf-accent-glow)' } : {}}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <QuickLeadModal
        role={role}
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        statusOptions={statusOptions}
      />
    </>
  )
}
