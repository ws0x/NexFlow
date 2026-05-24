'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Zap, LayoutDashboard, PlusCircle, List, BarChart3,
  Settings, LogOut, ChevronRight, Bell, Users, Database,
} from 'lucide-react'
import { cn, initials, ROLE_COLORS_SIMPLE } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/leads/new',               label: 'New Lead',       icon: PlusCircle, roles: ['MARKETING', 'SUPER_ADMIN'] },
  { href: '/leads',                   label: 'Leads',          icon: List,       roles: ['MARKETING', 'SALES', 'MANAGER', 'SUPER_ADMIN'] },
  { href: '/analytics',               label: 'Analytics',      icon: BarChart3,  roles: ['MANAGER', 'SUPER_ADMIN'] },
  { href: '/admin',                   label: 'Admin',          icon: Settings,   roles: ['SUPER_ADMIN'] },
  { href: '/admin/users',             label: 'Users',          icon: Users,      roles: ['SUPER_ADMIN'] },
  { href: '/admin/business-units',    label: 'Business Units', icon: Database,   roles: ['SUPER_ADMIN'] },
]

interface SidebarProps {
  user: {
    name: string
    email: string
    role: Role
    businessUnitIds: string[]
  }
  businessUnits: { id: string; name: string; prefix: string }[]
  collapsed?: boolean
}

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER:     'Manager',
  MARKETING:   'Marketing',
  SALES:       'Sales',
}

const ROLE_COLOR: Record<Role, string> = {
  SUPER_ADMIN: 'text-purple-400',
  MANAGER:     'text-blue-400',
  MARKETING:   'text-cyan-400',
  SALES:       'text-green-400',
}

export function Sidebar({ user, businessUnits, collapsed }: SidebarProps) {
  const pathname = usePathname()

  const visibleNav = NAV_ITEMS.filter((item) =>
    (item.roles as string[]).includes(user.role)
  )

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        background: 'var(--nf-surface)',
        borderRight: '1px solid var(--nf-border)',
        width: collapsed ? '64px' : '220px',
        transition: 'width 0.2s ease',
        minWidth: collapsed ? '64px' : '220px',
      }}>

      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 px-4 py-5 shrink-0"
        style={{ borderBottom: '1px solid var(--nf-border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #06B6D4, #6366F1)' }}>
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span className="font-bold text-base tracking-tight" style={{ color: 'var(--nf-text)' }}>
            NexFlow
          </span>
        )}
      </div>

      {/* ── Business Unit chips ── */}
      {!collapsed && businessUnits.length > 0 && (
        <div className="px-3 pt-3 pb-1 flex flex-wrap gap-1.5">
          {businessUnits.map((bu) => (
            <span key={bu.id}
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)', border: '1px solid var(--nf-border)' }}>
              {bu.prefix}
            </span>
          ))}
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {visibleNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          // Don't mark /leads as active when on /leads/new
          const active = item.href === '/leads'
            ? (pathname === '/leads' || (pathname.startsWith('/leads/') && !pathname.startsWith('/leads/new')))
            : isActive

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('nav-item', active && 'nav-item-active')}
              title={collapsed ? item.label : undefined}>
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && active && (
                <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── User footer ── */}
      <div className="px-2 py-3 space-y-1 shrink-0" style={{ borderTop: '1px solid var(--nf-border)' }}>
        {/* User info */}
        <div className={cn('flex items-center gap-2.5 px-2 py-2 rounded-lg',
          !collapsed && 'min-w-0')}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #06B6D4, #6366F1)', color: 'white' }}>
            {initials(user.name)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--nf-text)' }}>
                {user.name}
              </p>
              <p className={cn('text-xs font-medium', ROLE_COLOR[user.role])}>
                {ROLE_LABEL[user.role]}
              </p>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="nav-item w-full"
          title={collapsed ? 'Sign out' : undefined}>
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
