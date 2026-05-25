import Link from 'next/link'
import { db } from '@/lib/db'
import { UserRow } from '@/components/admin/user-row'
import { PlusCircle } from 'lucide-react'

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    include: {
      businessUnits: { include: { businessUnit: true } },
      departments:   { include: { department: true  } },
    },
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--nf-text)' }}>
            Users
          </h2>
          <p className="text-sm" style={{ color: 'var(--nf-muted)' }}>
            {users.length} total · {users.filter((u: any) => u.isActive).length} active
          </p>
        </div>
        <Link href="/admin/users/new" className="btn-primary text-sm">
          <PlusCircle className="w-4 h-4" />
          New User
        </Link>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--nf-border)' }}>
              {['Name', 'Role', 'Entities', 'Departments', 'Status', ''].map((h) => (
                <th key={h}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--nf-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--nf-border)' }}>
            {users.map((user: any) => (
              <UserRow key={user.id} user={user} />
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="py-16 text-center" style={{ color: 'var(--nf-muted)' }}>
            No users yet.{' '}
            <Link href="/admin/users/new" className="underline" style={{ color: 'var(--nf-accent)' }}>
              Create one
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
