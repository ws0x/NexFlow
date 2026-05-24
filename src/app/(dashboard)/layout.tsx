import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { Sidebar } from '@/components/layout/sidebar'
import type { Role } from '@/generated/prisma/client'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Fetch the user's business units for the sidebar
  const userBUs = await db.userBusinessUnit.findMany({
    where: { userId: session.user.id },
    include: { businessUnit: true },
  })

  const businessUnits = userBUs.map((ub: any) => ({
    id: ub.businessUnit.id,
    name: ub.businessUnit.name,
    prefix: ub.businessUnit.prefix,
  }))

  const user = {
    name: session.user.name ?? 'User',
    email: session.user.email ?? '',
    role: session.user.role as Role,
    businessUnitIds: session.user.businessUnitIds,
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--nf-bg)' }}>
      {/* Sidebar – hidden on mobile, visible md+ */}
      <div className="hidden md:flex shrink-0">
        <Sidebar user={user} businessUnits={businessUnits} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
