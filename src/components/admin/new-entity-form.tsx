'use client'

import { useTransition, useState } from 'react'
import { createEntity } from '@/app/actions/admin'
import { toast } from 'sonner'
import { PlusCircle, X, Loader2 } from 'lucide-react'

export function NewEntityForm() {
  const [open, setOpen]       = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createEntity(fd)
        toast.success('Entity created')
        setOpen(false)
        ;(e.target as HTMLFormElement).reset()
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to create entity')
      }
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary text-sm">
        <PlusCircle className="w-4 h-4" />
        New Entity
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 flex items-end gap-3 min-w-[340px]">
      <div className="flex-1 space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--nf-muted)' }}>
            Entity Name<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            name="name"
            placeholder="e.g. MIG - Conv Components"
            className="input-base text-sm"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--nf-muted)' }}>
            Code / Prefix<span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            name="prefix"
            placeholder="e.g. HCL"
            className="input-base text-sm font-mono uppercase"
            maxLength={6}
            required
            style={{ textTransform: 'uppercase' }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <button type="submit" disabled={pending} className="btn-primary text-sm h-9 px-4">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm h-9 px-4">
          <X className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}
