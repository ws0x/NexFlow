'use client'

import { useTransition, useState } from 'react'
import { updateBusinessUnit } from '@/app/actions/admin'
import { toast } from 'sonner'
import { Building2, Phone, Key, Users, FileText, Loader2, Check, X, Eye, EyeOff } from 'lucide-react'

interface EntityCardProps {
  bu: {
    id:               string
    name:             string
    prefix:           string
    coordinatorPhone: string | null
    coordinatorApiKey: string | null
    _count:           { users: number; leads: number }
  }
}

const PREFIX_COLORS: Record<string, { bg: string; color: string }> = {
  HSL: { bg: '#06B6D420', color: '#06B6D4' },
  MGL: { bg: '#818CF820', color: '#818CF8' },
  MKL: { bg: '#F59E0B20', color: '#F59E0B' },
  HCL: { bg: '#F9731620', color: '#F97316' },
}

type EditField = 'phone' | 'apiKey' | null

export function EntityCard({ bu }: EntityCardProps) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing]      = useState<EditField>(null)
  const [phone,   setPhone]        = useState(bu.coordinatorPhone   ?? '')
  const [apiKey,  setApiKey]       = useState(bu.coordinatorApiKey  ?? '')
  const [showKey, setShowKey]      = useState(false)

  const colors = PREFIX_COLORS[bu.prefix] ?? { bg: '#06B6D420', color: '#06B6D4' }

  function handleSave() {
    const fd = new FormData()
    fd.set('id',               bu.id)
    fd.set('name',             bu.name)
    fd.set('coordinatorPhone', phone)
    fd.set('coordinatorApiKey', apiKey)

    startTransition(async () => {
      try {
        await updateBusinessUnit(fd)
        toast.success('Entity updated')
        setEditing(null)
      } catch (err: any) {
        toast.error(err.message ?? 'Update failed')
      }
    })
  }

  function cancelEdit(field: EditField) {
    setEditing(null)
    if (field === 'phone')  setPhone(bu.coordinatorPhone  ?? '')
    if (field === 'apiKey') setApiKey(bu.coordinatorApiKey ?? '')
  }

  const hasApiKey = (bu.coordinatorApiKey || apiKey)

  return (
    <div className="card p-5 space-y-4">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: colors.bg }}
        >
          <Building2 className="w-5 h-5" style={{ color: colors.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ background: colors.bg, color: colors.color }}
          >
            {bu.prefix}
          </span>
          <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--nf-text)' }}>
            {bu.name}
          </p>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
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

      {/* ── Coordinator Phone ────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--nf-muted)' }}>
          Coordinator Phone
        </p>
        {editing === 'phone' ? (
          <div className="flex items-center gap-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+966 50 000 0000"
              className="input-base text-sm"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={pending}
              className="p-2 rounded-lg shrink-0 transition-colors"
              style={{ background: '#22C55E20', color: '#22C55E' }}
              title="Save"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={() => cancelEdit('phone')}
              className="p-2 rounded-lg shrink-0 transition-colors"
              style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)' }}
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing('phone')}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors"
            style={{
              background: 'var(--nf-surface-2)',
              border: '1px solid var(--nf-border)',
              color: bu.coordinatorPhone ? 'var(--nf-text)' : 'var(--nf-subtle)',
            }}
          >
            <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--nf-muted)' }} />
            {bu.coordinatorPhone || 'Click to set phone number'}
          </button>
        )}
      </div>

      {/* ── CallMeBot API Key ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium" style={{ color: 'var(--nf-muted)' }}>
            WhatsApp API Key
            <span
              className="ml-1.5 text-xs px-1.5 py-0.5 rounded"
              style={{ background: hasApiKey ? '#22C55E15' : 'var(--nf-surface-2)', color: hasApiKey ? '#22C55E' : 'var(--nf-subtle)' }}
            >
              {hasApiKey ? 'configured' : 'not set'}
            </span>
          </p>
        </div>

        {editing === 'apiKey' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="CallMeBot API key"
                  className="input-base text-sm pr-9"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--nf-muted)' }}
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                onClick={handleSave}
                disabled={pending}
                className="p-2 rounded-lg shrink-0 transition-colors"
                style={{ background: '#22C55E20', color: '#22C55E' }}
                title="Save"
              >
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => cancelEdit('apiKey')}
                className="p-2 rounded-lg shrink-0 transition-colors"
                style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)' }}
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--nf-subtle)' }}>
              Coordinator sends "I allow callmebot to send me messages" to{' '}
              <span style={{ color: 'var(--nf-muted)' }}>+34 644 60 49 48</span>, then shares the API key received.
            </p>
          </div>
        ) : (
          <button
            onClick={() => setEditing('apiKey')}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors"
            style={{
              background: 'var(--nf-surface-2)',
              border: '1px solid var(--nf-border)',
              color: hasApiKey ? 'var(--nf-text)' : 'var(--nf-subtle)',
            }}
          >
            <Key className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--nf-muted)' }} />
            {hasApiKey ? '••••••••••••' : 'Click to set WhatsApp API key'}
          </button>
        )}
      </div>
    </div>
  )
}
