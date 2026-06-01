import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import type { Role } from '@/generated/prisma/client'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [userBUs, statusRows] = await Promise.all([
    db.userBusinessUnit.findMany({
      where: { userId: session.user.id },
      include: { businessUnit: true },
    }),
    db.dropdownOption.findMany({
      where: { isActive: true, category: 'REQUEST_STATUS', entityScope: 'GLOBAL' },
      orderBy: { order: 'asc' },
      select: { value: true },
    }),
  ])

  const businessUnits = userBUs.map((ub: any) => ({
    id:     ub.businessUnit.id,
    name:   ub.businessUnit.name,
    prefix: ub.businessUnit.prefix,
  }))

  const statusOptions = statusRows.map((r: any) => r.value)

  const user = {
    name:            session.user.name ?? 'User',
    email:           session.user.email ?? '',
    role:            session.user.role as Role,
    businessUnitIds: session.user.businessUnitIds,
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--nf-bg)' }}>
      {/* Sidebar — hidden on mobile, visible md+ */}
      <div className="hidden md:flex shrink-0">
        <Sidebar user={user} businessUnits={businessUnits} statusOptions={statusOptions} />
      </div>

      {/* Main content — pb-16 on mobile to clear the bottom nav */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav role={user.role} statusOptions={statusOptions} />
    </div>
  )
}
