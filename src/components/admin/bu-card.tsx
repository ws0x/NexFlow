'use client'

import { useTransition, useState } from 'react'
import { updateBusinessUnit } from '@/app/actions/admin'
import { toast } from 'sonner'
import { Building2, Phone, Users, FileText, Loader2, Check, X } from 'lucide-react'

interface BUCardProps {
  bu: {
    id:               string
    name:             string
    prefix:           string
    coordinatorPhone: string | null
    _count:           { users: number; leads: number }
  }
}

const PREFIX_COLORS: Record<string, { bg: string; color: string }> = {
  HSL: { bg: '#06B6D420', color: '#06B6D4' },
  MGL: { bg: '#818CF820', color: '#818CF8' },
  MKL: { bg: '#F59E0B20', color: '#F59E0B' },
}

export function BUCard({ bu }: BUCardProps) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [phone,   setPhone]   = useState(bu.coordinatorPhone ?? '')

  const colors = PREFIX_COLORS[bu.prefix] ?? { bg: '#06B6D420', color: '#06B6D4' }

  function handleSave() {
    const fd = new FormData()
    fd.set('id',              bu.id)
    fd.set('name',            bu.name)
    fd.set('coordinatorPhone', phone)

    startTransition(async () => {
      try {
        await updateBusinessUnit(fd)
        toast.success('Business unit updated')
        setEditing(false)
      } catch (err: any) {
        toast.error(err.message ?? 'Update failed')
      }
    })
  }

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: colors.bg }}>
          <Building2 className="w-5 h-5" style={{ color: colors.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ background: colors.bg, color: colors.color }}>
              {bu.prefix}
            </span>
          </div>
          <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--nf-text)' }}>
            {bu.name}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--nf-muted)' }}>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {bu._count.users} users
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          {bu._count.leads} leads
        </span>
      </div>

      {/* Phone field */}
      <div>
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--nf-muted)' }}>
          Coordinator Phone
        </p>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+20 10 0000 0000"
              className="input-base text-sm"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={pending}
              className="p-2 rounded-lg transition-colors"
              style={{ background: '#22C55E20', color: '#22C55E' }}
              title="Save">
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { setEditing(false); setPhone(bu.coordinatorPhone ?? '') }}
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)' }}
              title="Cancel">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors"
            style={{
              background: 'var(--nf-surface-2)',
              border: '1px solid var(--nf-border)',
              color: bu.coordinatorPhone ? 'var(--nf-text)' : 'var(--nf-subtle)',
            }}>
            <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--nf-muted)' }} />
            {bu.coordinatorPhone || 'Click to set phone number'}
          </button>
        )}
      </div>
    </div>
  )
}
