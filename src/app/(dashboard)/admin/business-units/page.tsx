import { db } from '@/lib/db'
import { BUCard } from '@/components/admin/bu-card'

export default async function BusinessUnitsPage() {
  const businessUnits = await db.businessUnit.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { users: true, leads: true },
      },
    },
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--nf-text)' }}>
          Business Units
        </h2>
        <p className="text-sm" style={{ color: 'var(--nf-muted)' }}>
          Edit coordinator phone numbers for each business unit
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businessUnits.map((bu: any) => (
          <BUCard key={bu.id} bu={bu} />
        ))}
      </div>
    </div>
  )
}
