import { db } from '@/lib/db'
import { EntityCard } from '@/components/admin/entity-card'
import { NewEntityForm } from '@/components/admin/new-entity-form'

export default async function EntitiesPage() {
  const entities = await db.businessUnit.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { users: true, leads: true },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--nf-text)' }}>
            Entities
          </h2>
          <p className="text-sm" style={{ color: 'var(--nf-muted)' }}>
            Configure coordinator phones and CallMeBot API keys for WhatsApp alerts
          </p>
        </div>
        <NewEntityForm />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.map((entity: any) => (
          <EntityCard key={entity.id} bu={entity} />
        ))}
      </div>
    </div>
  )
}
