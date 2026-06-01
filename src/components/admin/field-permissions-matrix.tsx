'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Pencil, PencilOff, RotateCcw } from 'lucide-react'
import { upsertFieldPermission, resetFieldPermission } from '@/app/actions/admin'
import { cn } from '@/lib/utils'

const ROLES = ['MARKETING', 'SALES', 'MANAGER', 'SUPER_ADMIN'] as const
type RoleKey = typeof ROLES[number]

const ROLE_COLORS: Record<RoleKey, string> = {
  MARKETING:   '#34D399',
  SALES:       '#FBBF24',
  MANAGER:     '#60A5FA',
  SUPER_ADMIN: '#A78BFA',
}

interface FieldDef {
  key: string
  label: string
  group: string
}

interface PermRow {
  role: string
  fieldName: string
  canView: boolean
  canEdit: boolean
  isOverride: boolean  // true if comes from DB, false if default
}

interface Props {
  fields: FieldDef[]
  permissions: PermRow[]
}

export function FieldPermissionsMatrix({ fields, permissions }: Props) {
  const [perms, setPerms]       = useState<PermRow[]>(permissions)
  const [pending, startTrans]   = useTransition()

  function getPermFor(role: string, fieldName: string): PermRow | undefined {
    return perms.find((p) => p.role === role && p.fieldName === fieldName)
  }

  function handleToggle(role: string, fieldName: string, key: 'canView' | 'canEdit') {
    const current = getPermFor(role, fieldName)
    if (!current) return

    const newVal = !current[key]
    // If turning off view, also turn off edit
    const newPerm: PermRow = {
      ...current,
      [key]: newVal,
      canEdit: key === 'canView' && !newVal ? false : (key === 'canEdit' ? newVal : current.canEdit),
      isOverride: true,
    }

    // Optimistic update
    setPerms((prev) => prev.map((p) =>
      p.role === role && p.fieldName === fieldName ? newPerm : p,
    ))

    startTrans(async () => {
      try {
        await upsertFieldPermission(role, fieldName, newPerm.canView, newPerm.canEdit)
        toast.success('Permission updated')
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to update')
        // Revert
        setPerms((prev) => prev.map((p) =>
          p.role === role && p.fieldName === fieldName ? current : p,
        ))
      }
    })
  }

  function handleReset(role: string, fieldName: string) {
    startTrans(async () => {
      try {
        await resetFieldPermission(role, fieldName)
        toast.success('Reset to default')
        setPerms((prev) => prev.map((p) =>
          p.role === role && p.fieldName === fieldName
            ? { ...p, isOverride: false }
            : p,
        ))
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to reset')
      }
    })
  }

  const groups = [...new Set(fields.map((f) => f.group))]

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--nf-surface-2)', borderBottom: '1px solid var(--nf-border)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-48"
                style={{ color: 'var(--nf-muted)' }}>
                Field
              </th>
              {ROLES.map((role) => (
                <th key={role} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ color: ROLE_COLORS[role] }}>
                  {role.replace('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const groupFields = fields.filter((f) => f.group === group)
              return (
                <>
                  <tr key={`group-${group}`}
                    style={{ background: 'var(--nf-surface-2)', borderBottom: '1px solid var(--nf-border)' }}>
                    <td colSpan={ROLES.length + 1}
                      className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'var(--nf-subtle)' }}>
                      {group} Fields
                    </td>
                  </tr>

                  {groupFields.map((field) => (
                    <tr key={field.key}
                      className="group/row"
                      style={{ borderBottom: '1px solid var(--nf-surface-2)' }}>
                      <td className="px-4 py-2">
                        <span className="text-sm" style={{ color: 'var(--nf-text)' }}>
                          {field.label}
                        </span>
                        <span className="ml-1.5 text-[10px] font-mono"
                          style={{ color: 'var(--nf-subtle)' }}>
                          {field.key}
                        </span>
                      </td>

                      {ROLES.map((role) => {
                        const perm = getPermFor(role, field.key)
                        if (!perm) return <td key={role} />

                        return (
                          <td key={role} className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View toggle */}
                              <button
                                onClick={() => handleToggle(role, field.key, 'canView')}
                                disabled={pending}
                                title={perm.canView ? 'Can view — click to hide' : 'Hidden — click to show'}
                                className={cn(
                                  'w-7 h-7 rounded flex items-center justify-center transition-all',
                                  perm.canView
                                    ? 'opacity-100'
                                    : 'opacity-30',
                                )}
                                style={{
                                  background: perm.canView ? `${ROLE_COLORS[role]}20` : 'var(--nf-surface-2)',
                                  border: `1px solid ${perm.canView ? `${ROLE_COLORS[role]}60` : 'var(--nf-border)'}`,
                                }}>
                                {perm.canView
                                  ? <Eye className="w-3 h-3" style={{ color: ROLE_COLORS[role] }} />
                                  : <EyeOff className="w-3 h-3" style={{ color: 'var(--nf-subtle)' }} />}
                              </button>

                              {/* Edit toggle */}
                              <button
                                onClick={() => perm.canView && handleToggle(role, field.key, 'canEdit')}
                                disabled={pending || !perm.canView}
                                title={!perm.canView ? 'Enable view first' : perm.canEdit ? 'Can edit — click to lock' : 'Read-only — click to allow edit'}
                                className={cn(
                                  'w-7 h-7 rounded flex items-center justify-center transition-all',
                                  !perm.canView && 'opacity-20 cursor-not-allowed',
                                  perm.canEdit && perm.canView ? 'opacity-100' : 'opacity-30',
                                )}
                                style={{
                                  background: perm.canEdit && perm.canView ? `${ROLE_COLORS[role]}20` : 'var(--nf-surface-2)',
                                  border: `1px solid ${perm.canEdit && perm.canView ? `${ROLE_COLORS[role]}60` : 'var(--nf-border)'}`,
                                }}>
                                {perm.canEdit && perm.canView
                                  ? <Pencil className="w-3 h-3" style={{ color: ROLE_COLORS[role] }} />
                                  : <PencilOff className="w-3 h-3" style={{ color: 'var(--nf-subtle)' }} />}
                              </button>

                              {/* Reset (shown when overridden) */}
                              {perm.isOverride && (
                                <button
                                  onClick={() => handleReset(role, field.key)}
                                  disabled={pending}
                                  title="Reset to default"
                                  className="w-5 h-5 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                                  style={{ color: 'var(--nf-muted)' }}>
                                  <RotateCcw className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 flex items-center gap-4 flex-wrap"
        style={{ borderTop: '1px solid var(--nf-border)', background: 'var(--nf-surface-2)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--nf-subtle)' }}>
          Legend:
        </p>
        {[
          { icon: Eye, label: 'Can View', active: true },
          { icon: EyeOff, label: 'Hidden', active: false },
          { icon: Pencil, label: 'Can Edit', active: true },
          { icon: PencilOff, label: 'Read-only', active: false },
          { icon: RotateCcw, label: 'Overridden (click to reset default)', active: null },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--nf-muted)' }}>
            <Icon className="w-3 h-3" />
            {label}
          </div>
        ))}
        {pending && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto" style={{ color: 'var(--nf-accent)' }} />}
      </div>
    </div>
  )
}
