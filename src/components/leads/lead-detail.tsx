'use client'

import { useState, useTransition } from 'react'
import { sendLeadToSales, updateSalesFields, updateLeadFields, deleteLead } from '@/app/actions/leads'
import {
  Building2, User, FileText, Send, Clock, CheckCircle2,
  ExternalLink, Loader2, History, ChevronDown, ChevronUp,
  MessageSquare, Tag, Pencil, X, Trash2,
} from 'lucide-react'
import { VoiceRecordButton } from '@/components/ui/voice-record-button'
import {
  formatDate, formatRelative, getStatusStyle, getBUStyle, LEAD_STATUS_LABELS, getWhatsAppUrl,
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Role } from '@/generated/prisma/client'

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

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
  canSendToSales: boolean; canEditSales: boolean; canEditLead: boolean
  canDelete: boolean
  showSalesFields: boolean; showMarketingFields: boolean
  statusOptions: string[]
  sourceOptions: string[]
  channelOptions: string[]
  departments: { id: string; name: string }[]
}

type EditSection = 'company' | 'contact' | 'marketing' | null

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadDetail({
  lead, role,
  canSendToSales: canSend, canEditSales, canEditLead,
  canDelete,
  showSalesFields, showMarketingFields,
  statusOptions, sourceOptions, channelOptions,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [waUrl,      setWaUrl]       = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [editSection, setEditSection] = useState<EditSection>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // ── Sales form state ───────────────────────────────────────────────────────
  const [salesForm, setSalesForm] = useState({
    salesResponse:     lead.salesResponse    ?? '',
    salesResponseDate: lead.salesResponseDate
      ? new Date(lead.salesResponseDate).toISOString().split('T')[0]
      : '',
    requestStatus: lead.requestStatus,
  })

  // ── Inline edit form states ────────────────────────────────────────────────
  const [companyForm, setCompanyForm] = useState({
    companyName:    lead.companyName,
    companyNameAr:  lead.companyNameAr   ?? '',
    companyWebsite: lead.companyWebsite  ?? '',
    companyType:    lead.companyType     ?? '',
    companySector:  lead.companySector   ?? '',
    country:        lead.country         ?? '',
    city:           lead.city            ?? '',
    location:       lead.location        ?? '',
  })

  const [contactForm, setContactForm] = useState({
    contactName:   lead.contactName,
    contactNumber: lead.contactNumber,
    contactEmail:  lead.contactEmail ?? '',
    leadType:      lead.leadType     ?? '',
  })

  const [marketingForm, setMarketingForm] = useState({
    leadSource:           lead.leadSource           ?? '',
    communicationChannel: lead.communicationChannel ?? '',
    leadRequest:          lead.leadRequest           ?? '',
    marketingNotes:       lead.marketingNotes        ?? '',
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

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
    fd.set('leadId',            lead.id)
    fd.set('salesResponse',     salesForm.salesResponse)
    fd.set('salesResponseDate', salesForm.salesResponseDate)
    fd.set('requestStatus',     salesForm.requestStatus)
    startTransition(async () => {
      try {
        await updateSalesFields(fd)
        toast.success('Sales response saved!')
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to update')
      }
    })
  }

  function handleSaveSection(section: EditSection) {
    if (!section) return
    const fd = new FormData()
    fd.set('leadId', lead.id)

    const form =
      section === 'company'   ? companyForm :
      section === 'contact'   ? contactForm :
      section === 'marketing' ? marketingForm : null
    if (!form) return

    Object.entries(form).forEach(([k, v]) => fd.set(k, v))

    startTransition(async () => {
      try {
        await updateLeadFields(fd)
        toast.success('Changes saved')
        setEditSection(null)
      } catch (e: any) {
        toast.error(e.message ?? 'Save failed')
      }
    })
  }

  function cancelEdit(section: EditSection) {
    // Reset form to lead values
    if (section === 'company') {
      setCompanyForm({
        companyName:    lead.companyName,
        companyNameAr:  lead.companyNameAr  ?? '',
        companyWebsite: lead.companyWebsite ?? '',
        companyType:    lead.companyType    ?? '',
        companySector:  lead.companySector  ?? '',
        country:        lead.country        ?? '',
        city:           lead.city           ?? '',
        location:       lead.location       ?? '',
      })
    } else if (section === 'contact') {
      setContactForm({
        contactName:   lead.contactName,
        contactNumber: lead.contactNumber,
        contactEmail:  lead.contactEmail ?? '',
        leadType:      lead.leadType     ?? '',
      })
    } else if (section === 'marketing') {
      setMarketingForm({
        leadSource:           lead.leadSource           ?? '',
        communicationChannel: lead.communicationChannel ?? '',
        leadRequest:          lead.leadRequest           ?? '',
        marketingNotes:       lead.marketingNotes        ?? '',
      })
    }
    setEditSection(null)
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteLead(lead.id)
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to delete lead')
        setShowDeleteConfirm(false)
      }
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* ── Status bar ── */}
      <div className="card p-4 space-y-3">

        {/* Top row: REQ code + badges + date */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono text-lg font-bold" style={{ color: 'var(--nf-accent)' }}>
            {lead.reqCode}
          </span>
          <span className={`badge ${getBUStyle(lead.businessUnit.prefix)}`}>
            {lead.businessUnit.prefix} — {lead.businessUnit.name}
          </span>
          <span className={cn('badge ring-1', getStatusStyle(lead.requestStatus))}>
            {lead.requestStatus}
          </span>
          <span className="text-xs ml-auto" style={{ color: 'var(--nf-muted)' }}>
            {formatDate(lead.requestDate)}
          </span>
          {canDelete && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 text-xs h-7 px-2.5 rounded-lg transition-colors"
              style={{ color: '#EF4444', border: '1px solid rgb(239 68 68 / 0.3)', background: 'rgb(239 68 68 / 0.05)' }}
              title="Delete this lead">
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
          {canDelete && showDeleteConfirm && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-medium" style={{ color: '#FCA5A5' }}>
                Permanently delete this lead?
              </span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center gap-1 text-xs h-7 px-3 rounded-lg font-medium transition-colors"
                style={{ background: 'rgb(239 68 68 / 0.15)', color: '#EF4444', border: '1px solid rgb(239 68 68 / 0.4)' }}>
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Confirm Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
                className="flex items-center gap-1 text-xs h-7 px-2.5 rounded-lg transition-colors"
                style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)', border: '1px solid var(--nf-border)' }}>
                <X className="w-3 h-3" />
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* ── Send to Sales action row (only when user has permission) ── */}
        {canSend && (() => {
          const hasPhone  = !!lead.businessUnit.coordinatorPhone
          const sent      = lead.sentToSales

          return (
            <div
              className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1"
              style={{ borderTop: '1px solid var(--nf-border)' }}>

              {/* Left side: status info */}
              <div className="flex items-center gap-2 flex-1 flex-wrap min-w-0">
                {/* Sent badge */}
                {sent && (
                  <div
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg shrink-0"
                    style={{ background: 'rgb(34 197 94 / 0.1)', color: '#86EFAC', border: '1px solid rgb(34 197 94 / 0.2)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Sent to Sales
                    {lead.sentToSalesAt && (
                      <span style={{ color: '#4ADE80', opacity: 0.7 }}>
                        · {formatRelative(lead.sentToSalesAt)}
                      </span>
                    )}
                  </div>
                )}

                {/* No-phone warning badge */}
                {!hasPhone && (
                  <div
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgb(245 158 11 / 0.1)', color: '#FCD34D', border: '1px solid rgb(245 158 11 / 0.25)' }}
                    title={`Go to Admin → Entities → ${lead.businessUnit.name} to configure`}>
                    <span>⚠</span>
                    WhatsApp not configured for <strong>{lead.businessUnit.name}</strong>
                  </div>
                )}
              </div>

              {/* Right side: action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Open WhatsApp — appears after sending */}
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer"
                    className="btn-outline text-sm h-9 px-3">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Open WhatsApp</span>
                    <span className="sm:hidden">WhatsApp</span>
                  </a>
                )}

                {/* Primary action button */}
                <button
                  onClick={handleSendToSales}
                  disabled={isPending || !hasPhone}
                  title={!hasPhone ? `Configure coordinator phone in Admin → Entities → ${lead.businessUnit.name}` : undefined}
                  className={sent ? 'btn-outline text-sm h-9 px-4' : 'btn-primary text-sm h-9 px-4'}
                  style={!hasPhone ? { opacity: 0.45 } : undefined}>
                  {isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                  {sent ? 'Send Again' : 'Send to Sales'}
                </button>
              </div>
            </div>
          )
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Company */}
          <Section
            icon={Building2} title="Company"
            editing={editSection === 'company'}
            canEdit={canEditLead}
            isPending={isPending}
            onEdit={() => setEditSection('company')}
            onSave={() => handleSaveSection('company')}
            onCancel={() => cancelEdit('company')}>
            {editSection === 'company' ? (
              <Grid2>
                <EField label="Name (EN)" value={companyForm.companyName}
                  onChange={(v) => setCompanyForm((f) => ({ ...f, companyName: v }))} required />
                <EField label="Name (AR)" value={companyForm.companyNameAr}
                  onChange={(v) => setCompanyForm((f) => ({ ...f, companyNameAr: v }))} />
                <EField label="Type" value={companyForm.companyType}
                  onChange={(v) => setCompanyForm((f) => ({ ...f, companyType: v }))} />
                <EField label="Sector" value={companyForm.companySector}
                  onChange={(v) => setCompanyForm((f) => ({ ...f, companySector: v }))} />
                <EField label="Country" value={companyForm.country}
                  onChange={(v) => setCompanyForm((f) => ({ ...f, country: v }))} />
                <EField label="City" value={companyForm.city}
                  onChange={(v) => setCompanyForm((f) => ({ ...f, city: v }))} />
                <EField label="Location" value={companyForm.location} wide
                  onChange={(v) => setCompanyForm((f) => ({ ...f, location: v }))} />
                <EField label="Website" value={companyForm.companyWebsite} wide
                  onChange={(v) => setCompanyForm((f) => ({ ...f, companyWebsite: v }))} />
              </Grid2>
            ) : (
              <Grid2>
                <Field label="Name (EN)" value={lead.companyName} />
                {lead.companyNameAr   && <Field label="Name (AR)"  value={lead.companyNameAr} />}
                {lead.companyType     && <Field label="Type"        value={lead.companyType} />}
                {lead.companySector   && <Field label="Sector"      value={lead.companySector} />}
                {lead.country         && <Field label="Country"     value={lead.country} />}
                {lead.city            && <Field label="City"        value={lead.city} />}
                {lead.location        && <Field label="Location"    value={lead.location} wide />}
                {lead.companyWebsite  && (
                  <div className="col-span-2">
                    <p className="text-xs mb-1" style={{ color: 'var(--nf-muted)' }}>Website</p>
                    <a href={lead.companyWebsite} target="_blank" rel="noopener noreferrer"
                      className="text-sm flex items-center gap-1" style={{ color: 'var(--nf-accent)' }}>
                      {lead.companyWebsite} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </Grid2>
            )}
          </Section>

          {/* Contact */}
          <Section
            icon={User} title="Contact"
            editing={editSection === 'contact'}
            canEdit={canEditLead}
            isPending={isPending}
            onEdit={() => setEditSection('contact')}
            onSave={() => handleSaveSection('contact')}
            onCancel={() => cancelEdit('contact')}>
            {editSection === 'contact' ? (
              <Grid2>
                <EField label="Name" value={contactForm.contactName} required
                  onChange={(v) => setContactForm((f) => ({ ...f, contactName: v }))} />
                <EField label="Number" value={contactForm.contactNumber} mono required
                  onChange={(v) => setContactForm((f) => ({ ...f, contactNumber: v }))} />
                <EField label="Email" value={contactForm.contactEmail}
                  onChange={(v) => setContactForm((f) => ({ ...f, contactEmail: v }))} />
                <EField label="Lead Type" value={contactForm.leadType}
                  onChange={(v) => setContactForm((f) => ({ ...f, leadType: v }))} />
              </Grid2>
            ) : (
              <Grid2>
                <Field label="Name"   value={lead.contactName} />
                <PhoneField label="Number" value={lead.contactNumber} />
                {lead.contactEmail && <Field label="Email"    value={lead.contactEmail} />}
                {lead.leadType     && <Field label="Lead Type" value={lead.leadType} />}
                <Field label="New Client" value={lead.newClient ? 'Yes' : 'No'} />
                {lead.internalReferral && (
                  <Field label="Referral From" value={lead.referralFrom ?? 'Internal'} />
                )}
              </Grid2>
            )}
          </Section>

          {/* Marketing Details */}
          {showMarketingFields && (
            <Section
              icon={FileText} title="Marketing Details" accent
              editing={editSection === 'marketing'}
              canEdit={canEditLead}
              isPending={isPending}
              onEdit={() => setEditSection('marketing')}
              onSave={() => handleSaveSection('marketing')}
              onCancel={() => cancelEdit('marketing')}>
              {editSection === 'marketing' ? (
                <div className="space-y-3">
                  <Grid2>
                    <ESelectField label="Source" value={marketingForm.leadSource}
                      options={sourceOptions}
                      onChange={(v) => setMarketingForm((f) => ({ ...f, leadSource: v }))} />
                    <ESelectField label="Channel" value={marketingForm.communicationChannel}
                      options={channelOptions}
                      onChange={(v) => setMarketingForm((f) => ({ ...f, communicationChannel: v }))} />
                  </Grid2>
                  <EField label="Lead Request" value={marketingForm.leadRequest} multiline wide voice
                    onChange={(v) => setMarketingForm((f) => ({ ...f, leadRequest: v }))} />
                  <EField label="Marketing Notes" value={marketingForm.marketingNotes} multiline wide voice
                    onChange={(v) => setMarketingForm((f) => ({ ...f, marketingNotes: v }))} />
                </div>
              ) : (
                <>
                  <Grid2>
                    {lead.leadSource           && <Field label="Source"      value={lead.leadSource} />}
                    {lead.communicationChannel && <Field label="Channel"     value={lead.communicationChannel} />}
                    {lead.directedToDept       && <Field label="Directed To" value={lead.directedToDept.name} />}
                  </Grid2>
                  {lead.leadRequest && (
                    <div className="mt-3">
                      <p className="text-xs mb-1.5" style={{ color: 'var(--nf-muted)' }}>Lead Request</p>
                      <p className="text-sm p-3 rounded-lg"
                        style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-text)' }}>
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
                </>
              )}
            </Section>
          )}

          {/* Sales Response */}
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-medium" style={{ color: 'var(--nf-muted)' }}>
                        Sales Response
                      </label>
                      <VoiceRecordButton
                        onTranscript={(t) => setSalesForm((f) => ({
                          ...f,
                          salesResponse: f.salesResponse ? f.salesResponse + '\n' + t : t,
                        }))}
                        currentValue={salesForm.salesResponse}
                        mode="append"
                        className="text-[11px] py-1 px-2"
                      />
                    </div>
                    <textarea
                      value={salesForm.salesResponse}
                      onChange={(e) => setSalesForm((f) => ({ ...f, salesResponse: e.target.value }))}
                      placeholder="Your response or outcome notes… (or tap Record to dictate)"
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
                      <p className="text-sm p-3 rounded-lg"
                        style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-text)' }}>
                        {lead.salesResponse}
                      </p>
                    </div>
                  )}
                </Grid2>
              )}
            </Section>
          )}
        </div>

        {/* ── Right column: meta + history ─────────────────────────────────── */}
        <div className="space-y-4">

          {/* Meta */}
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--nf-subtle)' }}>
              Details
            </p>
            <MetaRow icon={Tag}   label="Lead Status" value={LEAD_STATUS_LABELS[lead.leadStatus] ?? lead.leadStatus} />
            <MetaRow icon={Clock} label="Created"     value={formatRelative(lead.requestDate)} />
            <MetaRow icon={User}  label="Added By"    value={lead.createdBy.name} />
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
              {showHistory
                ? <ChevronUp   className="w-4 h-4" style={{ color: 'var(--nf-muted)' }} />
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

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SectionProps {
  icon: any; title: string; children: React.ReactNode; accent?: boolean
  editing?: boolean; canEdit?: boolean; isPending?: boolean
  onEdit?: () => void; onSave?: () => void; onCancel?: () => void
}

function Section({
  icon: Icon, title, children, accent,
  editing, canEdit, isPending, onEdit, onSave, onCancel,
}: SectionProps) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between pb-2"
        style={{ borderBottom: '1px solid var(--nf-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{
              background: accent ? 'var(--nf-accent-glow)' : 'var(--nf-surface-2)',
              border: `1px solid ${accent ? 'var(--nf-accent)' : 'var(--nf-border)'}`,
            }}>
            <Icon className="w-3.5 h-3.5" style={{ color: accent ? 'var(--nf-accent)' : 'var(--nf-muted)' }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>{title}</h3>
        </div>

        {/* Edit / Save / Cancel controls */}
        {canEdit && onEdit && (
          editing ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onSave}
                disabled={isPending}
                className="flex items-center gap-1 text-xs h-7 px-3 rounded-lg font-medium transition-colors"
                style={{ background: 'rgb(6 182 212 / 0.1)', color: '#06B6D4', border: '1px solid rgb(6 182 212 / 0.3)' }}>
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Save
              </button>
              <button
                onClick={onCancel}
                disabled={isPending}
                className="flex items-center gap-1 text-xs h-7 px-2.5 rounded-lg transition-colors"
                style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)', border: '1px solid var(--nf-border)' }}>
                <X className="w-3 h-3" />
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onEdit}
              className="flex items-center gap-1 text-xs h-7 px-2.5 rounded-lg transition-colors"
              style={{ color: 'var(--nf-subtle)', border: '1px solid transparent' }}
              title="Edit">
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )
        )}
      </div>
      {children}
    </div>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
}

/** Read-only field */
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

/** Phone field with WhatsApp icon */
function PhoneField({ label, value }: { label: string; value: string }) {
  const waUrl = getWhatsAppUrl(value)
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: 'var(--nf-muted)' }}>{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-mono" style={{ color: 'var(--nf-text)' }}>{value || '—'}</p>
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Chat on WhatsApp: ${value}`}
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-opacity hover:opacity-80"
            style={{ background: 'rgb(37 211 102 / 0.1)', color: '#25D366', border: '1px solid rgb(37 211 102 / 0.25)' }}>
            <WhatsAppIcon className="w-3 h-3" />
            WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}

/** Editable select (dropdown) field */
function ESelectField({ label, value, onChange, options, wide }: {
  label: string; value: string; onChange: (v: string) => void
  options: string[]; wide?: boolean
}) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <label className="text-xs mb-1 block" style={{ color: 'var(--nf-muted)' }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base text-sm h-9 w-full">
        <option value="">— Select {label} —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

/** Editable field */
function EField({ label, value, onChange, mono, wide, multiline, required, voice }: {
  label: string; value: string; onChange: (v: string) => void
  mono?: boolean; wide?: boolean; multiline?: boolean; required?: boolean
  voice?: boolean
}) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-xs" style={{ color: 'var(--nf-muted)' }}>
          {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
        </label>
        {voice && multiline && (
          <VoiceRecordButton
            onTranscript={(t) => onChange(value ? value + '\n' + t : t)}
            currentValue={value}
            mode="append"
            className="text-[11px] py-0.5 px-2 shrink-0"
          />
        )}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="input-base text-sm resize-none w-full"
          placeholder={`${label}${voice ? ' (or tap Record to dictate)' : ''}`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn('input-base text-sm h-9 w-full', mono && 'font-mono')}
          placeholder={label}
        />
      )}
    </div>
  )
}

function MetaRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--nf-subtle)' }} />
      <div>
        <p className="text-[10px]"  style={{ color: 'var(--nf-subtle)' }}>{label}</p>
        <p className="text-xs font-medium" style={{ color: 'var(--nf-text)' }}>{value}</p>
      </div>
    </div>
  )
}

function formatFieldName(fieldName: string): string {
  const map: Record<string, string> = {
    lead_created:         'Lead created',
    sentToSales:          'Sent to sales',
    requestStatus:        'Status changed',
    salesResponse:        'Sales response updated',
    salesResponseDate:    'Response date set',
    companyName:          'Company name edited',
    companyNameAr:        'Arabic name edited',
    companyWebsite:       'Website edited',
    companyType:          'Company type edited',
    companySector:        'Sector edited',
    country:              'Country edited',
    city:                 'City edited',
    contactName:          'Contact name edited',
    contactNumber:        'Contact number edited',
    contactEmail:         'Contact email edited',
    leadType:             'Lead type edited',
    leadSource:           'Lead source edited',
    leadRequest:          'Lead request edited',
    communicationChannel: 'Channel edited',
    marketingNotes:       'Marketing notes edited',
  }
  return map[fieldName] ?? fieldName.replace(/_/g, ' ')
}
