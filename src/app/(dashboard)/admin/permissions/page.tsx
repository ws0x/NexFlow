import { db } from '@/lib/db'
import { FieldPermissionsMatrix } from '@/components/admin/field-permissions-matrix'
import { ALL_LEAD_FIELDS, getDefaultPerm } from '@/lib/field-permissions'
import type { Role } from '@/generated/prisma/client'
import { ShieldCheck } from 'lucide-react'

const ROLES: Role[] = ['MARKETING', 'SALES', 'MANAGER', 'SUPER_ADMIN']

export const metadata = { title: 'Field Permissions' }

export default async function PermissionsPage() {
  const dbPerms = await db.fieldPermission.findMany()

  const dbMap = new Map(dbPerms.map((p) => [`${p.role}:${p.fieldName}`, p]))

  // Build full permission rows for all role × field combinations
  const permissions = ROLES.flatMap((role) =>
    ALL_LEAD_FIELDS.map((field) => {
      const override = dbMap.get(`${role}:${field.key}`)
      const defaults = getDefaultPerm(role, field.key)
      return {
        role,
        fieldName:  field.key,
        canView:    override?.canView  ?? defaults.canView,
        canEdit:    override?.canEdit  ?? defaults.canEdit,
        isOverride: !!override,
      }
    }),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#818CF820' }}>
          <ShieldCheck className="w-5 h-5" style={{ color: '#818CF8' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--nf-text)' }}>
            Field Permissions
          </h2>
          <p className="text-sm" style={{ color: 'var(--nf-muted)' }}>
            Control which roles can view or edit each lead field. Overrides are stored in the database —
            reset any cell to restore the default behavior.
          </p>
        </div>
      </div>

      <FieldPermissionsMatrix
        fields={ALL_LEAD_FIELDS.map((f) => ({ key: f.key, label: f.label, group: f.group }))}
        permissions={permissions}
      />
    </div>
  )
}
