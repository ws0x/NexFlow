import { db } from '@/lib/db'
import { CardTemplateEditor, type CardField } from '@/components/admin/card-template-editor'
import { MessageSquare } from 'lucide-react'

export const metadata = { title: 'Card Template' }

// Default field configuration for the WhatsApp card
export const DEFAULT_CARD_FIELDS: CardField[] = [
  { key: 'requestDate',        label: 'Date',              icon: '📅', include: true  },
  { key: 'businessUnitName',   label: 'Entity',            icon: '🏢', include: true  },
  { key: 'companyName',        label: 'Company',           icon: '🏭', include: true  },
  { key: 'companyType',        label: 'Company Type',      icon: '🏷️', include: true  },
  { key: 'contactName',        label: 'Contact',           icon: '📞', include: true  },
  { key: 'contactNumber',      label: 'Phone',             icon: '📱', include: true  },
  { key: 'contactEmail',       label: 'Email',             icon: '📧', include: true  },
  { key: 'country',            label: 'Location',          icon: '🌍', include: true  },
  { key: 'companySector',      label: 'Sector',            icon: '⚙️', include: true  },
  { key: 'leadRequest',        label: 'Lead Request',      icon: '📋', include: true  },
  { key: 'leadSource',         label: 'Source',            icon: '🔗', include: true  },
  { key: 'communicationChannel', label: 'Channel',         icon: '💬', include: true  },
  { key: 'leadType',           label: 'Lead Type',         icon: '🎯', include: true  },
  { key: 'directedToDeptName', label: 'Directed To',       icon: '👥', include: true  },
  { key: 'marketingNotes',     label: 'Marketing Notes',   icon: '📝', include: true  },
  { key: 'companyWebsite',     label: 'Website',           icon: '🌐', include: false },
  { key: 'city',               label: 'City',              icon: '📍', include: false },
  { key: 'newClient',          label: 'New Client',        icon: '🆕', include: false },
  { key: 'referralFrom',       label: 'Referral From',     icon: '🤝', include: false },
]

const DEFAULT_CONFIG = {
  fields:      DEFAULT_CARD_FIELDS,
  headerTitle: 'New Lead',
  footerText:  '',
}

export default async function CardTemplatePage() {
  const [businessUnits, templates] = await Promise.all([
    db.businessUnit.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, prefix: true },
    }),
    db.leadCardTemplate.findMany(),
  ])

  const templateMap = new Map(templates.map((t) => [t.entityScope, t.fieldConfig]))

  function resolveConfig(entityScope: string) {
    const stored = templateMap.get(entityScope)
    if (!stored || typeof stored !== 'object') return DEFAULT_CONFIG
    const s = stored as any
    return {
      fields:      (s.fields as CardField[]) ?? DEFAULT_CARD_FIELDS,
      headerTitle: s.headerTitle ?? 'New Lead',
      footerText:  s.footerText  ?? '',
    }
  }

  const tabs = [
    { entityScope: 'GLOBAL', businessUnitId: null, name: '🌐 Global Default', prefix: 'ALL' },
    ...businessUnits.map((bu) => ({
      entityScope:    bu.id,
      businessUnitId: bu.id,
      name:           `${bu.prefix} — ${bu.name}`,
      prefix:         bu.prefix,
    })),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#22C55E20' }}>
          <MessageSquare className="w-5 h-5" style={{ color: '#22C55E' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--nf-text)' }}>
            WhatsApp Card Template
          </h2>
          <p className="text-sm" style={{ color: 'var(--nf-muted)' }}>
            Configure which fields appear in the &quot;Send to Sales&quot; WhatsApp card.
            Entity-specific templates override the global default.
          </p>
        </div>
      </div>

      {/* Tabs per entity */}
      <div className="space-y-8">
        {tabs.map((tab) => (
          <section key={tab.entityScope} className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-accent)' }}>
                {tab.prefix}
              </span>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>
                {tab.name}
              </h3>
              {templateMap.has(tab.entityScope) && (
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: '#22C55E20', color: '#22C55E' }}>
                  Custom
                </span>
              )}
            </div>
            <CardTemplateEditor
              entityScope={tab.entityScope}
              businessUnitId={tab.businessUnitId}
              entityName={tab.name}
              initialConfig={resolveConfig(tab.entityScope)}
            />
          </section>
        ))}
      </div>
    </div>
  )
}
