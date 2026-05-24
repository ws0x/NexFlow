'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { toggleUserStatus } from '@/app/actions/admin'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'
import type { Role } from '@/generated/prisma/client'

interface UserRowProps {
  user: {
    id:            string
    name:          string | null
    email:         string
    role:          Role
    isActive:      boolean
    businessUnits: { businessUnit: { id: string; name: string; prefix: string } }[]
    departments:   { department: { id: string; name: string } }[]
  }
}

export function UserRow({ user }: UserRowProps) {
  const [pending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      try {
        await toggleUserStatus(user.id)
        toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const roleColor = ROLE_COLORS[user.role]

  return (
    <tr className="table-row-hover">
      {/* Name + email */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg,#06B6D4,#6366F1)', color: 'white' }}>
            {(user.name ?? user.email).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate" style={{ color: 'var(--nf-text)' }}>
              {user.name ?? '—'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--nf-subtle)' }}>
              {user.email}
            </p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        <span
          className="badge text-xs font-semibold"
          style={{ background: `${roleColor}20`, color: roleColor }}>
          {ROLE_LABELS[user.role]}
        </span>
      </td>

      {/* Business Units */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {user.businessUnits.map(({ businessUnit: bu }) => (
            <span key={bu.id}
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)', border: '1px solid var(--nf-border)' }}>
              {bu.prefix}
            </span>
          ))}
          {user.businessUnits.length === 0 && (
            <span style={{ color: 'var(--nf-subtle)' }}>—</span>
          )}
        </div>
      </td>

      {/* Departments */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {user.departments.slice(0, 2).map(({ department: d }) => (
            <span key={d.id}
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-subtle)' }}>
              {d.name}
            </span>
          ))}
          {user.departments.length > 2 && (
            <span className="text-xs" style={{ color: 'var(--nf-subtle)' }}>
              +{user.departments.length - 2} more
            </span>
          )}
          {user.departments.length === 0 && (
            <span style={{ color: 'var(--nf-subtle)' }}>—</span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className="badge text-xs"
          style={{
            background: user.isActive ? '#22C55E20' : '#EF444420',
            color:       user.isActive ? '#22C55E'   : '#EF4444',
          }}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <Link
            href={`/admin/users/${user.id}`}
            className="btn-ghost p-1.5 rounded-lg"
            title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleToggle}
            disabled={pending}
            className={cn(
              'btn-ghost p-1.5 rounded-lg',
              pending && 'opacity-50 cursor-not-allowed',
            )}
            title={user.isActive ? 'Deactivate' : 'Activate'}>
            <Power
              className="w-3.5 h-3.5"
              style={{ color: user.isActive ? '#EF4444' : '#22C55E' }}
            />
          </button>
        </div>
      </td>
    </tr>
  )
}
