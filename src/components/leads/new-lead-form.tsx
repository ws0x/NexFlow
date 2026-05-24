'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createLead } from '@/app/actions/leads'
import {
  Building2, User, FileText, Send,
  Mic, MicOff, ChevronRight, ChevronLeft,
  Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  businessUnits: { id: string; name: string; prefix: string }[]
  dropdowns: Record<string, string[]>
  departments: { id: string; name: string }[]
}

interface FormData {
  // Step 1 – Company
  businessUnitId: string
  companyName: string
  companyNameAr: string
  companyWebsite: string
  companyType: string
  companySector: string
  country: string
  city: string
  location: string
  // Step 2 – Contact
  contactName: string
  contactNumber: string
  contactEmail: string
  leadType: string
  newClient: boolean
  internalReferral: boolean
  referralFrom: string
  // Step 3 – Lead Details
  leadRequest: string
  leadSource: string
  communicationChannel: string
  marketingNotes: string
  // Step 4 – Routing
  directedToDeptId: string
}

const STEPS = [
  { id: 1, label: 'Company',  icon: Building2 },
  { id: 2, label: 'Contact',  icon: User },
  { id: 3, label: 'Details',  icon: FileText },
  { id: 4, label: 'Routing',  icon: Send },
]

const INITIAL: FormData = {
  businessUnitId: '', companyName: '', companyNameAr: '', companyWebsite: '',
  companyType: '', companySector: '', country: '', city: '', location: '',
  contactName: '', contactNumber: '', contactEmail: '', leadType: '',
  newClient: true, internalReferral: false, referralFrom: '',
  leadRequest: '', leadSource: '', communicationChannel: '', marketingNotes: '',
  directedToDeptId: '',
}

export function NewLeadForm({ businessUnits, dropdowns, departments }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [isPending, startTransition] = useTransition()
  const [isListening, setIsListening] = useState<string | null>(null)

  // ── Field updater ──────────────────────────────────────────────────────────
  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  // ── Voice input ────────────────────────────────────────────────────────────
  const recognitionRef = useRef<any>(null)

  function startVoice(field: keyof FormData) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser')
      return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      set(field, transcript as any)
      setIsListening(null)
    }
    rec.onerror = () => setIsListening(null)
    rec.onend = () => setIsListening(null)
    recognitionRef.current = rec
    rec.start()
    setIsListening(field)
  }

  function stopVoice() {
    recognitionRef.current?.stop()
    setIsListening(null)
  }

  // ── Validation per step ────────────────────────────────────────────────────
  function validateStep(s: number): boolean {
    const errs: typeof errors = {}
    if (s === 1) {
      if (!form.businessUnitId) errs.businessUnitId = 'Select a business unit'
      if (!form.companyName.trim()) errs.companyName = 'Required'
    }
    if (s === 2) {
      if (!form.contactName.trim()) errs.contactName = 'Required'
      if (!form.contactNumber.trim()) errs.contactNumber = 'Required'
    }
    if (s === 3) {
      // leadRequest is optional but encouraged
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() {
    if (validateStep(step)) setStep((s) => s + 1)
  }
  function back() { setStep((s) => s - 1) }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!validateStep(4)) return
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)))
    startTransition(async () => {
      try {
        await createLead(fd)
        // redirect happens inside the action
      } catch (e: any) {
        toast.error(e.message ?? 'Failed to create lead')
      }
    })
  }

  // ── Shared field components ────────────────────────────────────────────────
  function Field({
    label, field, placeholder, type = 'text', required, hint, voice = true,
  }: {
    label: string; field: keyof FormData; placeholder?: string
    type?: string; required?: boolean; hint?: string; voice?: boolean
  }) {
    const val = form[field] as string
    const err = errors[field]
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium flex items-center gap-1"
          style={{ color: 'var(--nf-muted)' }}>
          {label}{required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
        <div className="relative">
          <input
            type={type}
            value={val}
            onChange={(e) => set(field, e.target.value as any)}
            placeholder={placeholder}
            className={cn('input-base text-sm h-10', voice && 'pr-10', err && 'border-red-500')}
          />
          {voice && (
            <button
              type="button"
              onClick={() => isListening === field ? stopVoice() : startVoice(field)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
              style={{ color: isListening === field ? 'var(--nf-accent)' : 'var(--nf-subtle)' }}>
              {isListening === field
                ? <MicOff className="w-3.5 h-3.5 animate-pulse" />
                : <Mic className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        {err && <p className="text-xs" style={{ color: '#EF4444' }}>{err}</p>}
        {hint && !err && <p className="text-xs" style={{ color: 'var(--nf-subtle)' }}>{hint}</p>}
      </div>
    )
  }

  function SelectField({
    label, field, options, placeholder, required,
  }: {
    label: string; field: keyof FormData; options: string[]
    placeholder?: string; required?: boolean
  }) {
    const err = errors[field]
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium flex items-center gap-1"
          style={{ color: 'var(--nf-muted)' }}>
          {label}{required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
        <select
          value={form[field] as string}
          onChange={(e) => set(field, e.target.value as any)}
          className={cn('input-base text-sm h-10', err && 'border-red-500')}>
          <option value="">{placeholder ?? `Select ${label}`}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {err && <p className="text-xs" style={{ color: '#EF4444' }}>{err}</p>}
      </div>
    )
  }

  function Toggle({ label, field, hint }: { label: string; field: keyof FormData; hint?: string }) {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--nf-text)' }}>{label}</p>
          {hint && <p className="text-xs" style={{ color: 'var(--nf-subtle)' }}>{hint}</p>}
        </div>
        <button
          type="button"
          onClick={() => set(field, !form[field] as any)}
          className="relative w-10 h-5 rounded-full transition-colors shrink-0"
          style={{ background: form[field] ? 'var(--nf-accent)' : 'var(--nf-border)' }}>
          <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
            style={{ left: form[field] ? 'calc(100% - 18px)' : '2px' }} />
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Step indicator ── */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const done   = step > s.id
          const active = step === s.id
          const Icon   = s.icon
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => done && setStep(s.id)}
                disabled={!done}
                className={cn(
                  'flex flex-col items-center gap-1 disabled:cursor-default',
                  'group transition-opacity', !done && !active && 'opacity-40',
                )}>
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                  active && 'ring-2 ring-offset-2',
                )}
                  style={{
                    background: done ? 'var(--nf-accent)' : active ? 'var(--nf-accent-glow)' : 'var(--nf-surface-2)',
                    border: active ? '2px solid var(--nf-accent)' : '2px solid var(--nf-border)',
                    outline: active ? '2px solid var(--nf-accent)' : undefined,
                    outlineOffset: active ? '2px' : undefined,
                  }}>
                  {done
                    ? <CheckCircle2 className="w-4 h-4 text-slate-900" />
                    : <Icon className="w-4 h-4" style={{ color: active ? 'var(--nf-accent)' : 'var(--nf-muted)' }} />}
                </div>
                <span className="text-[10px] font-medium hidden sm:block"
                  style={{ color: active ? 'var(--nf-accent)' : done ? 'var(--nf-muted)' : 'var(--nf-subtle)' }}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-2"
                  style={{ background: step > s.id ? 'var(--nf-accent)' : 'var(--nf-border)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Step content ── */}
      <div className="card p-6">

        {/* Step 1 – Company */}
        {step === 1 && (
          <div className="space-y-4">
            <StepHeader
              icon={Building2}
              title="Company Information"
              subtitle="Details about the lead's company"
            />

            {/* BU selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium flex items-center gap-1"
                style={{ color: 'var(--nf-muted)' }}>
                Business Unit<span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {businessUnits.map((bu) => (
                  <button
                    key={bu.id}
                    type="button"
                    onClick={() => set('businessUnitId', bu.id)}
                    className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                      form.businessUnitId === bu.id
                        ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                        : 'text-slate-400 hover:border-slate-500')}
                    style={{ borderColor: form.businessUnitId === bu.id ? 'var(--nf-accent)' : 'var(--nf-border)' }}>
                    <span className="font-mono text-xs mr-1.5 opacity-60">{bu.prefix}</span>
                    {bu.name}
                  </button>
                ))}
              </div>
              {errors.businessUnitId && (
                <p className="text-xs" style={{ color: '#EF4444' }}>{errors.businessUnitId}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company Name (EN)" field="companyName" placeholder="e.g. Acme Corp" required />
              <Field label="Company Name (AR)" field="companyNameAr" placeholder="اسم الشركة" voice={false} />
              <Field label="Website" field="companyWebsite" placeholder="https://example.com" type="url" voice={false} />
              <SelectField label="Company Type" field="companyType" options={dropdowns.COMPANY_TYPE ?? []} />
              <SelectField label="Sector" field="companySector" options={dropdowns.COMPANY_SECTOR ?? []} />
              <Field label="Country" field="country" placeholder="e.g. Egypt" />
              <Field label="City" field="city" placeholder="e.g. Cairo" />
              <Field label="Location / Address" field="location" placeholder="Street, area…" />
            </div>
          </div>
        )}

        {/* Step 2 – Contact */}
        {step === 2 && (
          <div className="space-y-4">
            <StepHeader icon={User} title="Contact Information" subtitle="The person you spoke with" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contact Name" field="contactName" placeholder="Full name" required />
              <Field label="Contact Number" field="contactNumber" placeholder="+20 1XX XXX XXXX" type="tel" required />
              <Field label="Contact Email" field="contactEmail" placeholder="email@company.com" type="email" voice={false} />
              <SelectField label="Lead Type" field="leadType" options={dropdowns.LEAD_TYPE ?? []} />
            </div>
            <div className="pt-2 space-y-1 rounded-lg p-3"
              style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-border)' }}>
              <Toggle label="New Client?" field="newClient" hint="Is this a new business relationship?" />
              <div style={{ height: 1, background: 'var(--nf-border)' }} />
              <Toggle label="Internal Referral?" field="internalReferral" hint="Was this lead referred internally?" />
            </div>
            {form.internalReferral && (
              <Field label="Referral From" field="referralFrom" placeholder="Who referred this lead?" />
            )}
          </div>
        )}

        {/* Step 3 – Lead Details */}
        {step === 3 && (
          <div className="space-y-4">
            <StepHeader icon={FileText} title="Lead Details" subtitle="What they need and how they found us" />
            <div className="space-y-1">
              <label className="text-xs font-medium flex items-center gap-1"
                style={{ color: 'var(--nf-muted)' }}>
                Lead Request
                <button type="button" onClick={() => isListening === 'leadRequest' ? stopVoice() : startVoice('leadRequest')}
                  className="ml-auto p-1 rounded transition-colors"
                  style={{ color: isListening === 'leadRequest' ? 'var(--nf-accent)' : 'var(--nf-subtle)' }}>
                  {isListening === 'leadRequest' ? <MicOff className="w-3.5 h-3.5 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </label>
              <textarea
                value={form.leadRequest}
                onChange={(e) => set('leadRequest', e.target.value)}
                placeholder="What is the lead requesting or looking for?"
                rows={3}
                className="input-base text-sm resize-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Lead Source" field="leadSource" options={dropdowns.LEAD_SOURCE ?? []} />
              <SelectField label="Communication Channel" field="communicationChannel" options={dropdowns.COMMUNICATION_CHANNEL ?? []} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium flex items-center gap-1"
                style={{ color: 'var(--nf-muted)' }}>
                Marketing Notes (internal)
                <button type="button" onClick={() => isListening === 'marketingNotes' ? stopVoice() : startVoice('marketingNotes')}
                  className="ml-auto p-1 rounded transition-colors"
                  style={{ color: isListening === 'marketingNotes' ? 'var(--nf-accent)' : 'var(--nf-subtle)' }}>
                  {isListening === 'marketingNotes' ? <MicOff className="w-3.5 h-3.5 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </label>
              <textarea
                value={form.marketingNotes}
                onChange={(e) => set('marketingNotes', e.target.value)}
                placeholder="Anything the sales team should know…"
                rows={2}
                className="input-base text-sm resize-none" />
            </div>
          </div>
        )}

        {/* Step 4 – Routing */}
        {step === 4 && (
          <div className="space-y-4">
            <StepHeader icon={Send} title="Route Lead" subtitle="Which department should handle this lead?" />

            <div className="grid grid-cols-2 gap-2">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => set('directedToDeptId', dept.id)}
                  className={cn(
                    'text-left px-4 py-3 rounded-lg border text-sm transition-all',
                    form.directedToDeptId === dept.id
                      ? 'text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200',
                  )}
                  style={{
                    borderColor: form.directedToDeptId === dept.id ? 'var(--nf-accent)' : 'var(--nf-border)',
                    background: form.directedToDeptId === dept.id ? 'var(--nf-accent-glow)' : 'var(--nf-surface-2)',
                  }}>
                  {dept.name}
                </button>
              ))}
            </div>

            {/* Summary preview */}
            <div className="rounded-lg p-4 space-y-2 text-sm"
              style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3"
                style={{ color: 'var(--nf-subtle)' }}>Lead Summary</p>
              <SummaryRow label="Company" value={form.companyName} />
              <SummaryRow label="Contact" value={`${form.contactName} · ${form.contactNumber}`} />
              <SummaryRow label="Business Unit"
                value={businessUnits.find((b) => b.id === form.businessUnitId)?.name ?? '—'} />
              <SummaryRow label="Source" value={[form.leadSource, form.communicationChannel].filter(Boolean).join(' → ')} />
              <SummaryRow label="Department"
                value={departments.find((d) => d.id === form.directedToDeptId)?.name ?? 'Not selected'} />
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === 1}
          className="btn-outline h-10 px-5 text-sm disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {step < 4 ? (
          <button type="button" onClick={next} className="btn-primary h-10 px-6 text-sm">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="btn-primary h-10 px-6 text-sm">
            {isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><CheckCircle2 className="w-4 h-4" /> Save Lead</>}
          </button>
        )}
      </div>
    </div>
  )
}

function StepHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 pb-2 mb-2" style={{ borderBottom: '1px solid var(--nf-border)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'var(--nf-accent-glow)', border: '1px solid var(--nf-accent)' }}>
        <Icon className="w-4 h-4" style={{ color: 'var(--nf-accent)' }} />
      </div>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>{title}</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--nf-muted)' }}>{subtitle}</p>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs" style={{ color: 'var(--nf-muted)' }}>{label}</span>
      <span className="text-xs font-medium text-right" style={{ color: value ? 'var(--nf-text)' : 'var(--nf-subtle)' }}>
        {value || '—'}
      </span>
    </div>
  )
}
