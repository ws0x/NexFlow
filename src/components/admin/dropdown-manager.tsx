'use client'

import { useState, useTransition } from 'react'
import {
  createDropdownOption,
  updateDropdownOption,
  toggleDropdownOption,
  deleteDropdownOption,
} from '@/app/actions/admin'
import { toast } from 'sonner'
import { Plus, Pencil, Power, Trash2, Check, X, Loader2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  id:       string
  category: string
  value:    string
  valueAr:  string | null
  isActive: boolean
  order:    number
}

interface Category {
  key:     string
  label:   string
  options: Option[]
}

interface DropdownManagerProps {
  categories: Category[]
}

export function DropdownManager({ categories }: DropdownManagerProps) {
  const [activeTab, setActiveTab] = useState(categories[0]?.key ?? '')

  const current = categories.find((c) => c.key === activeTab)

  return (
    <div className="card overflow-hidden">
      {/* Category tabs */}
      <div
        className="flex overflow-x-auto"
        style={{ borderBottom: '1px solid var(--nf-border)' }}>
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
            <span
              className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)' }}>
              {options.filter((o) => o.isActive).length}
            </span>
          </button>
        ))}
      </div>

      {/* Options list */}
      {current && (
        <CategoryPanel key={current.key} category={current} />
      )}
    </div>
  )
}

function CategoryPanel({ category }: { category: Category }) {
  const [options, setOptions]    = useState<Option[]>(category.options)
  const [adding,  setAdding]     = useState(false)
  const [newVal,  setNewVal]     = useState('')
  const [newValAr, setNewValAr]  = useState('')
  const [addPending, startAdd]   = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('category', category.key)
    fd.set('value',    newVal)
    fd.set('valueAr',  newValAr)

    startAdd(async () => {
      try {
        await createDropdownOption(fd)
        toast.success('Option added')
        setNewVal('')
        setNewValAr('')
        setAdding(false)
        // Optimistically append (server revalidates)
        setOptions((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            category: category.key,
            value: newVal,
            valueAr: newValAr || null,
            isActive: true,
            order: prev.length,
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
          <p className="text-sm py-4 text-center" style={{ color: 'var(--nf-muted)' }}>
            No options yet. Add the first one below.
          </p>
        )}
      </div>

      {/* Add new option */}
      {adding ? (
        <form onSubmit={handleAdd} className="flex items-center gap-2 pt-2"
          style={{ borderTop: '1px solid var(--nf-border)' }}>
          <input
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            placeholder="English value"
            className="input-base text-sm flex-1"
            required
            autoFocus
          />
          <input
            value={newValAr}
            onChange={(e) => setNewValAr(e.target.value)}
            placeholder="Arabic (optional)"
            className="input-base text-sm flex-1"
            dir="rtl"
          />
          <button
            type="submit"
            disabled={addPending || !newVal.trim()}
            className="btn-primary text-sm px-3 py-2 shrink-0">
            {addPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewVal(''); setNewValAr('') }}
            className="btn-ghost text-sm px-3 py-2 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors mt-2"
          style={{ color: 'var(--nf-accent)', border: '1px dashed var(--nf-accent)' }}>
          <Plus className="w-4 h-4" />
          Add Option
        </button>
      )}
    </div>
  )
}

function OptionRow({
  option,
  onUpdate,
}: {
  option: Option
  onUpdate: (updated: Option) => void
}) {
  const [editing,  setEditing]  = useState(false)
  const [value,    setValue]    = useState(option.value)
  const [valueAr,  setValueAr]  = useState(option.valueAr ?? '')
  const [pending,  startTransition] = useTransition()

  function handleSave() {
    const fd = new FormData()
    fd.set('id',      option.id)
    fd.set('value',   value)
    fd.set('valueAr', valueAr)
    startTransition(async () => {
      try {
        await updateDropdownOption(fd)
        toast.success('Option updated')
        setEditing(false)
        onUpdate({ ...option, value, valueAr: valueAr || null })
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  function handleToggle() {
    startTransition(async () => {
      try {
        await toggleDropdownOption(option.id)
        onUpdate({ ...option, isActive: !option.isActive })
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg group transition-all',
        !option.isActive && 'opacity-50',
      )}
      style={{ background: 'var(--nf-surface-2)' }}>
      {/* Drag handle (visual only) */}
      <GripVertical className="w-3.5 h-3.5 shrink-0 cursor-grab" style={{ color: 'var(--nf-subtle)' }} />

      {editing ? (
        <>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input-base text-sm flex-1 py-1"
            autoFocus
          />
          <input
            value={valueAr}
            onChange={(e) => setValueAr(e.target.value)}
            className="input-base text-sm flex-1 py-1"
            placeholder="Arabic"
            dir="rtl"
          />
          <button onClick={handleSave} disabled={pending} className="p-1 rounded"
            style={{ color: '#22C55E' }}>
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => { setEditing(false); setValue(option.value); setValueAr(option.valueAr ?? '') }}
            className="p-1 rounded" style={{ color: 'var(--nf-muted)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm truncate" style={{ color: 'var(--nf-text)' }}>
            {option.value}
          </span>
          {option.valueAr && (
            <span className="text-sm text-right" dir="rtl" style={{ color: 'var(--nf-muted)', minWidth: '80px' }}>
              {option.valueAr}
            </span>
          )}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => setEditing(true)} className="p-1 rounded"
              style={{ color: 'var(--nf-muted)' }} title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleToggle} disabled={pending}
              className="p-1 rounded"
              style={{ color: option.isActive ? '#EF4444' : '#22C55E' }}
              title={option.isActive ? 'Deactivate' : 'Activate'}>
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
          <span
            className="text-xs px-1.5 py-0.5 rounded shrink-0"
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
