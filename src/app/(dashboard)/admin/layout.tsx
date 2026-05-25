import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canManageUsers } from '@/lib/permissions'
import { AdminNav } from '@/components/admin/admin-nav'
import type { Role } from '@/generated/prisma/client'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || !canManageUsers(session.user.role as Role)) {
    redirect('/')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--nf-text)' }}>
          Administration
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--nf-muted)' }}>
          Manage users, entities, and system configuration
        </p>
      </div>

      {/* Tab navigation */}
      <AdminNav />

      {/* Page content */}
      <div>{children}</div>
    </div>
  )
}
