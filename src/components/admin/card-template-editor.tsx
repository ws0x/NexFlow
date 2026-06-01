'use client'

import { useState, useTransition } from 'react'
import { upsertCardTemplate } from '@/app/actions/admin'
import { toast } from 'sonner'
import { Loader2, GripVertical, Eye, EyeOff, Check } from 'lucide-react'

export interface CardField {
  key:     string
  label:   string
  icon:    string
  include: boolean
}

interface Props {
  entityScope:    string
  businessUnitId: string | null
  entityName:     string
  initialConfig: {
    fields:      CardField[]
    headerTitle: string
    footerText:  string
  }
}

export function CardTemplateEditor({ entityScope, businessUnitId, entityName, initialConfig }: Props) {
  const [config,  setConfig]   = useState(initialConfig)
  const [pending, startTrans]  = useTransition()

  function toggleField(key: string) {
    setConfig((c) => ({
      ...c,
      fields: c.fields.map((f) => f.key === key ? { ...f, include: !f.include } : f),
    }))
  }

  function handleSave() {
    startTrans(async () => {
      try {
        await upsertCardTemplate(entityScope, businessUnitId, config)
        toast.success('Card template saved!')
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to save')
      }
    })
  }

  const included = config.fields.filter((f) => f.include)
  const excluded = config.fields.filter((f) => !f.include)

  return (
    <div className="space-y-5">
      {/* Header/footer config */}
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>
          Card Header &amp; Footer
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--nf-muted)' }}>
              Header Title
            </label>
            <input
              value={config.headerTitle}
              onChange={(e) => setConfig((c) => ({ ...c, headerTitle: e.target.value }))}
              placeholder="New Lead"
              className="input-base text-sm h-9"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--nf-muted)' }}>
              Footer Text (optional)
            </label>
            <input
              value={config.footerText}
              onChange={(e) => setConfig((c) => ({ ...c, footerText: e.target.value }))}
              placeholder="e.g. Contact sales team for details"
              className="input-base text-sm h-9"
            />
          </div>
        </div>
      </div>

      {/* Field toggles */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--nf-border)', background: 'var(--nf-surface-2)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>
            Included Fields
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--nf-muted)' }}>
            Toggle fields to include or exclude them from the WhatsApp card.
          </p>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--nf-surface-2)' }}>
          {config.fields.map((field) => (
            <div
              key={field.key}
              className="flex items-center gap-3 px-4 py-2.5 transition-all"
              style={{ opacity: field.include ? 1 : 0.45 }}>
              <GripVertical className="w-3.5 h-3.5 shrink-0 text-[var(--nf-subtle)]" />
              <span className="text-lg w-6 shrink-0">{field.icon}</span>
              <span className="flex-1 text-sm" style={{ color: 'var(--nf-text)' }}>{field.label}</span>
              <button
                onClick={() => toggleField(field.key)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={
                  field.include
                    ? { background: '#22C55E20', color: '#22C55E', border: '1px solid #22C55E40' }
                    : { background: 'var(--nf-surface-2)', color: 'var(--nf-subtle)', border: '1px solid var(--nf-border)' }
                }>
                {field.include
                  ? <><Eye className="w-3 h-3" /> Included</>
                  : <><EyeOff className="w-3 h-3" /> Excluded</>}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="card p-4 space-y-2">
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--nf-text)' }}>
          Card Preview
        </h3>
        <pre
          className="text-xs font-mono p-3 rounded-lg leading-relaxed overflow-x-auto"
          style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)', whiteSpace: 'pre-wrap' }}>
          {[
            `🔔 *${config.headerTitle} — HSL506240001*`,
            `━━━━━━━━━━━━━━━━━━━━━━━━`,
            ...included.map((f) => `${f.icon} ${f.label}: [${f.key}]`),
            config.footerText ? `━━━━━━━━━━━━━━━━━━━━━━━━\n${config.footerText}` : `━━━━━━━━━━━━━━━━━━━━━━━━`,
          ].join('\n')}
        </pre>
        <p className="text-xs" style={{ color: 'var(--nf-subtle)' }}>
          {included.length} fields included · {excluded.length} excluded
        </p>
      </div>

      <button onClick={handleSave} disabled={pending} className="btn-primary w-full sm:w-auto h-10 px-6">
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Save Template for {entityName}
      </button>
    </div>
  )
}
