'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Search, X, Loader2, CheckCircle2, Building2, User, MessageSquare, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { updateSalesFields, updateLeadFields } from '@/app/actions/leads'
import { formatDate, getStatusStyle, getBUStyle } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

interface QuickLead {
  id: string
  reqCode: string
  leadStatus: string
  requestDate: Date
  companyName: string
  contactName: string
  contactNumber: string
  companyType?: string | null
  companySector?: string | null
  country?: string | null
  city?: string | null
  leadType?: string | null
  leadRequest?: string | null
  leadSource?: string | null
  communicationChannel?: string | null
  marketingNotes?: string | null
  requestStatus: string
  salesResponse?: string | null
  salesResponseDate?: Date | null
  sentToSales: boolean
  directedToDept?: { id: string; name: string } | null
  businessUnit: { id: string; name: string; prefix: string }
}

interface Props {
  role: Role
  open: boolean
  onClose: () => void
  statusOptions: string[]
}

type Phase = 'search' | 'loading' | 'view'

export function QuickLeadModal({ role, open, onClose, statusOptions }: Props) {
  const [phase, setPhase]       = useState<Phase>('search')
  const [code, setCode]         = useState('')
  const [lead, setLead]         = useState<QuickLead | null>(null)
  const [error, setError]       = useState('')
  const [isPending, startTrans] = useTransition()
  const inputRef                = useRef<HTMLInputElement>(null)

  // Sales form state
  const [salesForm, setSalesForm] = useState({
    salesResponse: '',
    salesResponseDate: '',
    requestStatus: '',
  })

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhase('search')
        setCode('')
        setLead(null)
        setError('')
      }, 200)
    } else {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setError('')
    setPhase('loading')
    try {
      const res = await fetch(`/api/leads/by-code?code=${encodeURIComponent(code.trim())}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Lead not found')
        setPhase('search')
        return
      }
      const data: QuickLead = await res.json()
      setLead(data)
      setSalesForm({
        salesResponse:     data.salesResponse     ?? '',
        salesResponseDate: data.salesResponseDate
          ? new Date(data.salesResponseDate).toISOString().split('T')[0]
          : '',
        requestStatus: data.requestStatus,
      })
      setPhase('view')
    } catch {
      setError('Failed to fetch lead')
      setPhase('search')
    }
  }

  function handleSalesSubmit() {
    if (!lead) return
    const fd = new FormData()
    fd.set('leadId',            lead.id)
    fd.set('salesResponse',     salesForm.salesResponse)
    fd.set('salesResponseDate', salesForm.salesResponseDate)
    fd.set('requestStatus',     salesForm.requestStatus)
    startTrans(async () => {
      try {
        await updateSalesFields(fd)
        toast.success('Sales response saved!')
        onClose()
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to update')
      }
    })
  }

  const canEditSales      = (role === 'SALES' || role === 'SUPER_ADMIN') && !!lead?.sentToSales
  const showSalesSection  = role === 'SALES' || role === 'MANAGER' || role === 'SUPER_ADMIN'
  const showMarketingSection = role === 'MARKETING' || role === 'MANAGER' || role === 'SUPER_ADMIN'

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{
          background: 'var(--nf-surface)',
          border: '1px solid var(--nf-border)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--nf-border)' }}>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" style={{ color: 'var(--nf-accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>
              Quick Lead Access
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar — always visible */}
        <form onSubmit={handleSearch} className="px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--nf-border)' }}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--nf-subtle)' }} />
              <input
                ref={inputRef}
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
                placeholder="Enter REQ code (e.g. HSL506240001)"
                className="input-base text-sm h-10 pl-9 font-mono uppercase"
                autoCapitalize="characters"
                autoCorrect="off"
              />
            </div>
            <button
              type="submit"
              disabled={!code.trim() || phase === 'loading'}
              className="btn-primary h-10 px-4 text-sm shrink-0">
              {phase === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
            </button>
          </div>
          {error && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--nf-danger, #EF4444)' }}>{error}</p>
          )}
        </form>

        {/* Lead view */}
        {phase === 'view' && lead && (
          <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">

            {/* Lead header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base font-bold" style={{ color: 'var(--nf-accent)' }}>
                  {lead.reqCode}
                </span>
                <span className={`badge ${getBUStyle(lead.businessUnit.prefix)}`}>
                  {lead.businessUnit.prefix}
                </span>
                <span className={cn('badge ring-1', getStatusStyle(lead.requestStatus))}>
                  {lead.requestStatus}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--nf-muted)' }}>
                {formatDate(lead.requestDate)}
              </span>
            </div>

            {/* Company + Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 space-y-1.5"
                style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-border)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--nf-accent)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--nf-muted)' }}>Company</span>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--nf-text)' }}>
                  {lead.companyName}
                </p>
                {lead.companyType && (
                  <p className="text-xs" style={{ color: 'var(--nf-muted)' }}>{lead.companyType}</p>
                )}
                {(lead.city || lead.country) && (
                  <p className="text-xs" style={{ color: 'var(--nf-subtle)' }}>
                    {[lead.city, lead.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              <div className="rounded-lg p-3 space-y-1.5"
                style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-border)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <User className="w-3.5 h-3.5" style={{ color: 'var(--nf-accent)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--nf-muted)' }}>Contact</span>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--nf-text)' }}>
                  {lead.contactName}
                </p>
                <p className="text-xs font-mono" style={{ color: 'var(--nf-muted)' }}>
                  {lead.contactNumber}
                </p>
                {lead.directedToDept && (
                  <p className="text-xs" style={{ color: 'var(--nf-subtle)' }}>
                    → {lead.directedToDept.name}
                  </p>
                )}
              </div>
            </div>

            {/* Lead request (if visible) */}
            {showMarketingSection && lead.leadRequest && (
              <div className="rounded-lg p-3"
                style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-border)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="w-3.5 h-3.5" style={{ color: 'var(--nf-accent)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--nf-muted)' }}>Lead Request</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--nf-text)' }}>{lead.leadRequest}</p>
              </div>
            )}

            {/* Sales response section */}
            {showSalesSection && (
              <div className="rounded-lg p-3 space-y-3"
                style={{
                  background: 'var(--nf-surface-2)',
                  border: `1px solid ${canEditSales ? 'var(--nf-accent)' : 'var(--nf-border)'}`,
                }}>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--nf-accent)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--nf-muted)' }}>Sales Response</span>
                </div>

                {canEditSales ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-medium block mb-1"
                        style={{ color: 'var(--nf-muted)' }}>Status</label>
                      <select
                        value={salesForm.requestStatus}
                        onChange={(e) => setSalesForm((f) => ({ ...f, requestStatus: e.target.value }))}
                        className="input-base text-sm h-9">
                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1"
                        style={{ color: 'var(--nf-muted)' }}>Response Date</label>
                      <input
                        type="date"
                        value={salesForm.salesResponseDate}
                        onChange={(e) => setSalesForm((f) => ({ ...f, salesResponseDate: e.target.value }))}
                        className="input-base text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1"
                        style={{ color: 'var(--nf-muted)' }}>Response Notes</label>
                      <textarea
                        value={salesForm.salesResponse}
                        onChange={(e) => setSalesForm((f) => ({ ...f, salesResponse: e.target.value }))}
                        rows={2}
                        className="input-base text-sm resize-none"
                        placeholder="Your response or outcome…"
                      />
                    </div>
                    <button
                      onClick={handleSalesSubmit}
                      disabled={isPending}
                      className="btn-primary w-full h-9 text-sm">
                      {isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />}
                      Save Response
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--nf-text)' }}>
                      {lead.requestStatus}
                    </p>
                    {lead.salesResponse && (
                      <p className="text-xs" style={{ color: 'var(--nf-muted)' }}>
                        {lead.salesResponse}
                      </p>
                    )}
                    {!lead.sentToSales && (
                      <p className="text-xs" style={{ color: 'var(--nf-subtle)' }}>
                        Not yet sent to sales
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* View full lead link */}
            <a
              href={`/leads/${lead.id}`}
              onClick={onClose}
              className="btn-outline w-full text-sm h-9 block text-center">
              View Full Lead
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
