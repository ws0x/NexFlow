'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Building2, ChevronDown, ShieldCheck, MessageSquare } from 'lucide-react'

const TABS = [
  { href: '/admin',               label: 'Overview',    icon: LayoutDashboard },
  { href: '/admin/users',         label: 'Users',       icon: Users           },
  { href: '/admin/entities',      label: 'Entities',    icon: Building2       },
  { href: '/admin/dropdowns',     label: 'Dropdowns',   icon: ChevronDown     },
  { href: '/admin/permissions',   label: 'Permissions', icon: ShieldCheck     },
  { href: '/admin/card-template', label: 'Card',        icon: MessageSquare   },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto"
      style={{ background: 'var(--nf-surface)', border: '1px solid var(--nf-border)' }}>
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              active
                ? 'text-[var(--nf-accent)]'
                : 'text-[var(--nf-muted)] hover:text-[var(--nf-text)] hover:bg-[var(--nf-surface-2)]',
            )}
            style={active ? { background: 'var(--nf-accent-glow)' } : undefined}>
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
