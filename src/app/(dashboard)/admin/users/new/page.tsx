import { db } from '@/lib/db'
import { UserForm } from '@/components/admin/user-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewUserPage() {
  const [businessUnits, departments] = await Promise.all([
    db.businessUnit.findMany({ orderBy: { name: 'asc' } }),
    db.department.findMany({ orderBy: { order: 'asc' } }),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="btn-ghost p-2 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--nf-text)' }}>New User</h2>
          <p className="text-sm" style={{ color: 'var(--nf-muted)' }}>Create a new team member account</p>
        </div>
      </div>

      <UserForm businessUnits={businessUnits} departments={departments} />
    </div>
  )
}
