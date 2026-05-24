import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { UserForm } from '@/components/admin/user-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditUserPage({ params }: PageProps) {
  const { id } = await params

  const [user, businessUnits, departments] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        businessUnits: true,
        departments:   true,
      },
    }),
    db.businessUnit.findMany({ orderBy: { name: 'asc' } }),
    db.department.findMany({ orderBy: { order: 'asc' } }),
  ])

  if (!user) notFound()

  const userForForm = {
    id:              user.id,
    name:            user.name,
    email:           user.email,
    role:            user.role,
    phone:           user.phone,
    businessUnitIds: user.businessUnits.map((ub: any) => ub.businessUnitId),
    departmentIds:   user.departments.map((ud: any) => ud.departmentId),
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="btn-ghost p-2 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--nf-text)' }}>
            Edit User
          </h2>
          <p className="text-sm" style={{ color: 'var(--nf-muted)' }}>
            {user.name ?? user.email}
          </p>
        </div>
      </div>

      <UserForm
        businessUnits={businessUnits}
        departments={departments}
        user={userForForm}
      />
    </div>
  )
}
