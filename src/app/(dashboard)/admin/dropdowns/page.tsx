import { db } from '@/lib/db'
import { DropdownManager } from '@/components/admin/dropdown-manager'

const CATEGORY_LABELS: Record<string, string> = {
  COMPANY_TYPE:          'Company Type',
  REQUEST_STATUS:        'Request Status',
  LEAD_TYPE:             'Lead Type',
  COMMUNICATION_CHANNEL: 'Communication Channel',
  LEAD_SOURCE:           'Lead Source',
  COMPANY_SECTOR:        'Company Sector',
}

export default async function DropdownsPage() {
  const options = await db.dropdownOption.findMany({
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  })

  // Group by category
  const grouped = options.reduce((acc: Record<string, any[]>, opt: any) => {
    if (!acc[opt.category]) acc[opt.category] = []
    acc[opt.category].push(opt)
    return acc
  }, {} as Record<string, any[]>)

  const categories = Object.keys(CATEGORY_LABELS).map((cat) => ({
    key:     cat,
    label:   CATEGORY_LABELS[cat],
    options: grouped[cat] ?? [],
  }))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--nf-text)' }}>
          Dropdown Options
        </h2>
        <p className="text-sm" style={{ color: 'var(--nf-muted)' }}>
          Manage the selectable values used throughout the app
        </p>
      </div>

      <DropdownManager categories={categories} />
    </div>
  )
}
