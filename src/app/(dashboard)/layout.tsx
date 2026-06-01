import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { MobileSidebarProvider } from '@/components/layout/mobile-sidebar-context'
import { MobileSidebarDrawer } from '@/components/layout/mobile-sidebar-drawer'
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
    <MobileSidebarProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--nf-bg)' }}>
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:flex shrink-0">
          <Sidebar user={user} businessUnits={businessUnits} statusOptions={statusOptions} />
        </div>

        {/* Mobile sidebar drawer */}
        <MobileSidebarDrawer user={user} businessUnits={businessUnits} statusOptions={statusOptions} />

        {/* Main content — pb-16 on mobile to clear the bottom nav */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <MobileNav role={user.role} statusOptions={statusOptions} />
      </div>
    </MobileSidebarProvider>
  )
}
