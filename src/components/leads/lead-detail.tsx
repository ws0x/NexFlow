'use client'

import { useState, useTransition } from 'react'
import { sendLeadToSales, updateSalesFields } from '@/app/actions/leads'
import {
  Building2, User, FileText, Send, Clock, CheckCircle2,
  ExternalLink, Loader2, History, ChevronDown, ChevronUp,
  MessageSquare, Calendar, Tag,
} from 'lucide-react'
import { formatDate, formatDateTime, formatRelative, getStatusStyle, getBUStyle, LEAD_STATUS_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Role } from '@/generated/prisma/client'

interface Lead {
  id: string; reqCode: string; leadStatus: string; requestDate: Date
  companyName: string; companyNameAr?: string | null; companyWebsite?: string | null
  companyType?: string | null; companySector?: string | null
  country?: string | null; city?: string | null; location?: string | null
  contactName: string; contactNumber: string; contactEmail?: string | null
  leadType?: string | null; newClient: boolean; internalReferral: boolean; referralFrom?: string | null
  leadRequest?: string | null; leadSource?: string | null; communicationChannel?: string | null
  marketingNotes?: string | null; directedToDept?: { name: string } | null
  sentToSales: boolean; sentToSalesAt?: Date | null
  salesResponse?: string | null; salesResponseDate?: Date | null; requestStatus: string
  businessUnit: { name: string; prefix: string; coordinatorPhone?: string | null }
  createdBy: { name: string; email: string }
  history: {
    id: string; fieldName: string; oldValue?: string | null; newValue?: string | null
    changedAt: Date; changedBy: { name: string; role: string }
  }[]
}

interface Props {
  lead: Lead; role: Role
  canSendToSales: boolean; canEditSales: boolean
  showSalesFields: boolean; showMarketingFields: boolean
  statusOptions: string[]; departments: { id: string; name: string }[]
}

export function LeadDetail({
  lead, role, canSendToSales: canSend, canEditSales,
  showSalesFields, showMarketingFields, statusOptions,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [waUrl, setWaUrl] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [salesForm, setSalesForm] = useState({
    salesResponse:     lead.salesResponse ?? '',
    salesResponseDate: lead.salesResponseDate
      ? new Date(lead.salesResponseDate).toISOString().split('T')[0]
      : '',
    requestStatus: lead.requestStatus,
  })

  function handleSendToSales() {
    startTransition(async () => {
      try {
        const result = await sendLeadToSales(lead.id)
        if (result.waUrl) {
          setWaUrl(result.waUrl)
          toast.success('Lead sent to sales! Click the button to open WhatsApp.')
        } else {
          toast.success('Lead sent to sales!')
        }
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to send to sales')
      }
    })
  }

  function handleSalesSubmit() {
    const fd = new FormData()
    fd.set('leadId', lead.id)
    fd.set('salesResponse', salesForm.salesResponse)
    fd.set('salesResponseDate', salesForm.salesResponseDate)
    fd.set('requestStatus', salesForm.requestStatus)
    startTransition(async () => {
      try {
        await updateSalesFields(fd)
        toast.success('Sales fields updated successfully!')
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to update')
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* ── Status bar ── */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-lg font-bold" style={{ color: 'var(--nf-accent)' }}>
            {lead.reqCode}
          </span>
          <span className={`badge ${getBUStyle(lead.businessUnit.prefix)}`}>
            {lead.businessUnit.prefix} — {lead.businessUnit.name}
          </span>
          <span className={cn('badge ring-1', getStatusStyle(lead.requestStatus))}>
            {lead.requestStatus}
          </span>
          <span className="text-xs" style={{ color: 'var(--nf-muted)' }}>
            {formatDate(lead.requestDate)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* WhatsApp open button */}
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              className="btn-primary text-sm h-9 px-4">
              <ExternalLink className="w-4 h-4" /> Open WhatsApp
            </a>
          )}

          {/* Send to sales */}
          {canSend && !lead.sentToSales && (
            <button onClick={handleSendToSales} disabled={isPending}
              className="btn-primary text-sm h-9 px-4">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send to Sales
            </button>
          )}

          {lead.sentToSales && (
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgb(34 197 94 / 0.1)', color: '#86EFAC', border: '1px solid rgb(34 197 94 / 0.2)' }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              With Sales {lead.sentToSalesAt && `· ${formatRelative(lead.sentToSalesAt)}`}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left col: main info ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Company */}
          <Section icon={Building2} title="Company">
            <Grid2>
              <Field label="Name (EN)" value={lead.companyName} />
              {lead.companyNameAr && <Field label="Name (AR)" value={lead.companyNameAr} />}
              {lead.companyType    && <Field label="Type" value={lead.companyType} />}
              {lead.companySector  && <Field label="Sector" value={lead.companySector} />}
              {lead.country        && <Field label="Country" value={lead.country} />}
              {lead.city           && <Field label="City" value={lead.city} />}
              {lead.location       && <Field label="Location" value={lead.location} wide />}
              {lead.companyWebsite && (
                <div className="col-span-2">
                  <p className="text-xs mb-1" style={{ color: 'var(--nf-muted)' }}>Website</p>
                  <a href={lead.companyWebsite} target="_blank" rel="noopener noreferrer"
                    className="text-sm flex items-center gap-1"
                    style={{ color: 'var(--nf-accent)' }}>
                    {lead.companyWebsite} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </Grid2>
          </Section>

          {/* Contact */}
          <Section icon={User} title="Contact">
            <Grid2>
              <Field label="Name" value={lead.contactName} />
              <Field label="Number" value={lead.contactNumber} mono />
              {lead.contactEmail && <Field label="Email" value={lead.contactEmail} />}
              {lead.leadType     && <Field label="Lead Type" value={lead.leadType} />}
              <Field label="New Client" value={lead.newClient ? 'Yes' : 'No'} />
              {lead.internalReferral && (
                <Field label="Referral From" value={lead.referralFrom ?? 'Internal'} />
              )}
            </Grid2>
          </Section>

          {/* Marketing fields */}
          {showMarketingFields && (
            <Section icon={FileText} title="Marketing Details" accent>
              <Grid2>
                {lead.leadSource           && <Field label="Source" value={lead.leadSource} />}
                {lead.communicationChannel && <Field label="Channel" value={lead.communicationChannel} />}
                {lead.directedToDept       && <Field label="Directed To" value={lead.directedToDept.name} />}
              </Grid2>
              {lead.leadRequest && (
                <div className="mt-3">
                  <p className="text-xs mb-1.5" style={{ color: 'var(--nf-muted)' }}>Lead Request</p>
                  <p className="text-sm p-3 rounded-lg" style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-text)' }}>
                    {lead.leadRequest}
                  </p>
                </div>
              )}
              {lead.marketingNotes && (
                <div className="mt-3">
                  <p className="text-xs mb-1.5" style={{ color: 'var(--nf-muted)' }}>Marketing Notes</p>
                  <p className="text-sm p-3 rounded-lg italic"
                    style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)', border: '1px dashed var(--nf-border)' }}>
                    {lead.marketingNotes}
                  </p>
                </div>
              )}
            </Section>
          )}

          {/* Sales fields */}
          {showSalesFields && (
            <Section icon={MessageSquare} title="Sales Response" accent={canEditSales}>
              {canEditSales ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'var(--nf-muted)' }}>
                      Request Status
                    </label>
                    <select
                      value={salesForm.requestStatus}
                      onChange={(e) => setSalesForm((f) => ({ ...f, requestStatus: e.target.value }))}
                      className="input-base text-sm h-10">
                      {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'var(--nf-muted)' }}>
                      Sales Response Date
                    </label>
                    <input
                      type="date"
                      value={salesForm.salesResponseDate}
                      onChange={(e) => setSalesForm((f) => ({ ...f, salesResponseDate: e.target.value }))}
                      className="input-base text-sm h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'var(--nf-muted)' }}>
                      Sales Response
                    </label>
                    <textarea
                      value={salesForm.salesResponse}
                      onChange={(e) => setSalesForm((f) => ({ ...f, salesResponse: e.target.value }))}
                      placeholder="Your response or outcome notes…"
                      rows={3}
                      className="input-base text-sm resize-none"
                    />
                  </div>
                  <button onClick={handleSalesSubmit} disabled={isPending}
                    className="btn-primary h-9 px-5 text-sm">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Save Response
                  </button>
                </div>
              ) : (
                <Grid2>
                  <Field label="Status" value={lead.requestStatus} />
                  {lead.salesResponseDate && <Field label="Response Date" value={formatDate(lead.salesResponseDate)} />}
                  {lead.salesResponse && (
                    <div className="col-span-2">
                      <p className="text-xs mb-1.5" style={{ color: 'var(--nf-muted)' }}>Response</p>
                      <p className="text-sm p-3 rounded-lg" style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-text)' }}>
                        {lead.salesResponse}
                      </p>
                    </div>
                  )}
                </Grid2>
              )}
            </Section>
          )}
        </div>

        {/* ── Right col: meta + history ── */}
        <div className="space-y-4">
          {/* Meta */}
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--nf-subtle)' }}>
              Details
            </p>
            <MetaRow icon={Tag} label="Lead Status" value={LEAD_STATUS_LABELS[lead.leadStatus] ?? lead.leadStatus} />
            <MetaRow icon={Clock} label="Created" value={formatRelative(lead.requestDate)} />
            <MetaRow icon={User} label="Added By" value={lead.createdBy.name} />
            {lead.directedToDept && (
              <MetaRow icon={Send} label="Directed To" value={lead.directedToDept.name} />
            )}
          </div>

          {/* History */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              style={{ borderBottom: showHistory ? '1px solid var(--nf-border)' : undefined }}>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" style={{ color: 'var(--nf-muted)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--nf-text)' }}>
                  History ({lead.history.length})
                </span>
              </div>
              {showHistory ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--nf-muted)' }} />
                           : <ChevronDown className="w-4 h-4" style={{ color: 'var(--nf-muted)' }} />}
            </button>

            {showHistory && (
              <div className="max-h-80 overflow-y-auto">
                {lead.history.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--nf-subtle)' }}>
                    No history yet
                  </p>
                ) : lead.history.map((h) => (
                  <div key={h.id} className="px-4 py-3"
                    style={{ borderBottom: '1px solid var(--nf-border)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium" style={{ color: 'var(--nf-text)' }}>
                        {formatFieldName(h.fieldName)}
                      </p>
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--nf-subtle)' }}>
                        {formatRelative(h.changedAt)}
                      </span>
                    </div>
                    {h.oldValue !== null && h.newValue !== null && (
                      <div className="mt-1 flex items-center gap-1 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded line-through"
                          style={{ background: 'rgb(239 68 68 / 0.1)', color: '#FCA5A5' }}>
                          {h.oldValue ?? '—'}
                        </span>
                        <span style={{ color: 'var(--nf-subtle)' }}>→</span>
                        <span className="px-1.5 py-0.5 rounded"
                          style={{ background: 'rgb(34 197 94 / 0.1)', color: '#86EFAC' }}>
                          {h.newValue ?? '—'}
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: 'var(--nf-subtle)' }}>
                      by {h.changedBy.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children, accent }: {
  icon: any; title: string; children: React.ReactNode; accent?: boolean
}) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2.5 pb-2" style={{ borderBottom: '1px solid var(--nf-border)' }}>
        <div className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{
            background: accent ? 'var(--nf-accent-glow)' : 'var(--nf-surface-2)',
            border: `1px solid ${accent ? 'var(--nf-accent)' : 'var(--nf-border)'}`,
          }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent ? 'var(--nf-accent)' : 'var(--nf-muted)' }} />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
}

function Field({ label, value, mono, wide }: {
  label: string; value: string; mono?: boolean; wide?: boolean
}) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-xs mb-0.5" style={{ color: 'var(--nf-muted)' }}>{label}</p>
      <p className={cn('text-sm', mono && 'font-mono')} style={{ color: 'var(--nf-text)' }}>
        {value || '—'}
      </p>
    </div>
  )
}

function MetaRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--nf-subtle)' }} />
      <div>
        <p className="text-[10px]" style={{ color: 'var(--nf-subtle)' }}>{label}</p>
        <p className="text-xs font-medium" style={{ color: 'var(--nf-text)' }}>{value}</p>
      </div>
    </div>
  )
}

function formatFieldName(fieldName: string): string {
  const map: Record<string, string> = {
    lead_created:     'Lead created',
    sentToSales:      'Sent to sales',
    requestStatus:    'Status changed',
    salesResponse:    'Sales response updated',
    salesResponseDate:'Response date set',
  }
  return map[fieldName] ?? fieldName.replace(/_/g, ' ')
}
