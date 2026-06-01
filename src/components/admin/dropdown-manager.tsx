'use client'

import { useState, useTransition } from 'react'
import {
  createDropdownOption,
  updateDropdownOption,
  toggleDropdownOption,
} from '@/app/actions/admin'
import { toast } from 'sonner'
import { Plus, Pencil, Power, Check, X, Loader2, GripVertical, Globe, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  id:             string
  category:       string
  value:          string
  valueAr:        string | null
  isActive:       boolean
  order:          number
  entityScope:    string
  businessUnitId: string | null
}

interface Category {
  key:     string
  label:   string
  options: Option[]
}

interface BusinessUnit {
  id:     string
  name:   string
  prefix: string
}

interface DropdownManagerProps {
  categories:    Category[]
  businessUnits: BusinessUnit[]
}

export function DropdownManager({ categories, businessUnits }: DropdownManagerProps) {
  const [activeTab,   setActiveTab]   = useState(categories[0]?.key ?? '')
  const [scopeFilter, setScopeFilter] = useState<string>('GLOBAL')

  const current = categories.find((c) => c.key === activeTab)

  const scopeOptions: { value: string; label: string }[] = [
    { value: 'GLOBAL', label: '🌐 Global' },
    ...businessUnits.map((bu) => ({ value: bu.id, label: `${bu.prefix} — ${bu.name}` })),
  ]

  const filteredOptions = (current?.options ?? []).filter(
    (o) => o.entityScope === scopeFilter,
  )

  return (
    <div className="card overflow-hidden">
      {/* Category tabs */}
      <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid var(--nf-border)' }}>
        {categories.map(({ key, label, options }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
              activeTab === key
                ? 'border-[var(--nf-accent)] text-[var(--nf-accent)]'
                : 'border-transparent text-[var(--nf-muted)] hover:text-[var(--nf-text)]',
            )}>
            {label}
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)' }}>
              {options.filter((o) => o.isActive).length}
            </span>
          </button>
        ))}
      </div>

      {/* Entity scope bar */}
      <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap"
        style={{ borderBottom: '1px solid var(--nf-border)', background: 'var(--nf-surface-2)' }}>
        {scopeFilter === 'GLOBAL'
          ? <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--nf-accent)' }} />
          : <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#F59E0B' }} />}
        <span className="text-xs font-medium mr-1" style={{ color: 'var(--nf-muted)' }}>Scope:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {scopeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setScopeFilter(opt.value)}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              style={
                scopeFilter === opt.value
                  ? { background: 'var(--nf-accent)', color: '#0F172A' }
                  : { background: 'var(--nf-surface)', color: 'var(--nf-muted)', border: '1px solid var(--nf-border)' }
              }>
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs ml-auto hidden sm:block" style={{ color: 'var(--nf-subtle)' }}>
          {scopeFilter === 'GLOBAL'
            ? 'Shown when entity has no specific values for this category.'
            : 'Overrides global values for this entity.'}
        </p>
      </div>

      {/* Options panel */}
      {current && (
        <CategoryPanel
          key={`${current.key}-${scopeFilter}`}
          category={current}
          options={filteredOptions}
          entityScope={scopeFilter}
          businessUnitId={scopeFilter === 'GLOBAL' ? null : scopeFilter}
        />
      )}
    </div>
  )
}

function CategoryPanel({
  category, options: initialOptions, entityScope, businessUnitId,
}: {
  category: Category
  options: Option[]
  entityScope: string
  businessUnitId: string | null
}) {
  const [options,   setOptions]  = useState<Option[]>(initialOptions)
  const [adding,    setAdding]   = useState(false)
  const [newVal,    setNewVal]   = useState('')
  const [newValAr,  setNewValAr] = useState('')
  const [addPending, startAdd]   = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('category',    category.key)
    fd.set('value',       newVal)
    fd.set('valueAr',     newValAr)
    fd.set('entityScope', entityScope)
    if (businessUnitId) fd.set('businessUnitId', businessUnitId)

    startAdd(async () => {
      try {
        await createDropdownOption(fd)
        toast.success('Option added')
        setNewVal('')
        setNewValAr('')
        setAdding(false)
        setOptions((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            category: category.key,
            value: newVal,
            valueAr: newValAr || null,
            isActive: true,
            order: prev.length,
            entityScope,
            businessUnitId,
          },
        ])
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to add option')
      }
    })
  }

  return (
    <div className="p-4">
      <div className="space-y-1 mb-4">
        {options.map((opt) => (
          <OptionRow
            key={opt.id}
            option={opt}
            onUpdate={(updated) =>
              setOptions((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
            }
          />
        ))}
        {options.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--nf-muted)' }}>No options here.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--nf-subtle)' }}>
              {entityScope === 'GLOBAL'
                ? 'Add global values used by all entities.'
                : 'Add entity-specific values to override global ones.'}
            </p>
          </div>
        )}
      </div>

      {adding ? (
        <form onSubmit={handleAdd} className="flex items-center gap-2 pt-2"
          style={{ borderTop: '1px solid var(--nf-border)' }}>
          <input value={newVal} onChange={(e) => setNewVal(e.target.value)}
            placeholder="English value" className="input-base text-sm flex-1" required autoFocus />
          <input value={newValAr} onChange={(e) => setNewValAr(e.target.value)}
            placeholder="Arabic (optional)" className="input-base text-sm flex-1" dir="rtl" />
          <button type="submit" disabled={addPending || !newVal.trim()}
            className="btn-primary text-sm px-3 py-2 shrink-0">
            {addPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button type="button"
            onClick={() => { setAdding(false); setNewVal(''); setNewValAr('') }}
            className="btn-ghost text-sm px-3 py-2 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors mt-2"
          style={{ color: 'var(--nf-accent)', border: '1px dashed var(--nf-accent)' }}>
          <Plus className="w-4 h-4" />
          Add {entityScope === 'GLOBAL' ? 'Global' : 'Entity'} Option
        </button>
      )}
    </div>
  )
}

function OptionRow({
  option, onUpdate,
}: {
  option: Option
  onUpdate: (updated: Option) => void
}) {
  const [editing,   setEditing]  = useState(false)
  const [value,     setValue]    = useState(option.value)
  const [valueAr,   setValueAr]  = useState(option.valueAr ?? '')
  const [pending,   startTrans]  = useTransition()

  function handleSave() {
    const fd = new FormData()
    fd.set('id', option.id)
    fd.set('value', value)
    fd.set('valueAr', valueAr)
    startTrans(async () => {
      try {
        await updateDropdownOption(fd)
        toast.success('Option updated')
        setEditing(false)
        onUpdate({ ...option, value, valueAr: valueAr || null })
      } catch (err: any) { toast.error(err.message) }
    })
  }

  function handleToggle() {
    startTrans(async () => {
      try {
        await toggleDropdownOption(option.id)
        onUpdate({ ...option, isActive: !option.isActive })
      } catch (err: any) { toast.error(err.message) }
    })
  }

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg group', !option.isActive && 'opacity-50')}
      style={{ background: 'var(--nf-surface-2)' }}>
      <GripVertical className="w-3.5 h-3.5 shrink-0 cursor-grab" style={{ color: 'var(--nf-subtle)' }} />

      {editing ? (
        <>
          <input value={value} onChange={(e) => setValue(e.target.value)}
            className="input-base text-sm flex-1 py-1" autoFocus />
          <input value={valueAr} onChange={(e) => setValueAr(e.target.value)}
            className="input-base text-sm flex-1 py-1" placeholder="Arabic" dir="rtl" />
          <button onClick={handleSave} disabled={pending} className="p-1 rounded" style={{ color: '#22C55E' }}>
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => { setEditing(false); setValue(option.value); setValueAr(option.valueAr ?? '') }}
            className="p-1 rounded" style={{ color: 'var(--nf-muted)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm truncate" style={{ color: 'var(--nf-text)' }}>{option.value}</span>
          {option.valueAr && (
            <span className="text-sm" dir="rtl" style={{ color: 'var(--nf-muted)', minWidth: '80px' }}>
              {option.valueAr}
            </span>
          )}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => setEditing(true)} className="p-1 rounded"
              style={{ color: 'var(--nf-muted)' }} title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleToggle} disabled={pending} className="p-1 rounded"
              style={{ color: option.isActive ? '#EF4444' : '#22C55E' }}
              title={option.isActive ? 'Deactivate' : 'Activate'}>
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
            style={{
              background: option.isActive ? '#22C55E20' : '#EF444420',
              color:       option.isActive ? '#22C55E'   : '#EF4444',
            }}>
            {option.isActive ? 'On' : 'Off'}
          </span>
        </>
      )}
    </div>
  )
}
