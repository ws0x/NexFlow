'use client'

import { useState, useTransition, useRef } from 'react'
import { createLead } from '@/app/actions/leads'
import {
  Building2, User, FileText, Send,
  Mic, MicOff, ChevronRight, ChevronLeft,
  Loader2, CheckCircle2,
} from 'lucide-react'
import { VoiceRecordButton } from '@/components/ui/voice-record-button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  businessUnits: { id: string; name: string; prefix: string }[]
  /** Dropdowns resolved per entity — entity-specific values override global ones */
  dropdownsPerEntity: Record<string, Record<string, string[]>>
  /** Global fallback dropdowns (used when no entity is selected yet) */
  globalDropdowns: Record<string, string[]>
  departments: { id: string; name: string; businessUnitId?: string | null }[]
}

interface FormState {
  businessUnitId: string
  companyName: string
  companyNameAr: string
  companyWebsite: string
  companyType: string
  companySector: string
  country: string
  city: string
  location: string
  contactName: string
  contactNumber: string
  contactEmail: string
  leadType: string
  newClient: boolean
  internalReferral: boolean
  referralFrom: string
  leadRequest: string
  leadSource: string
  communicationChannel: string
  marketingNotes: string
  directedToDeptId: string
}

const STEPS = [
  { id: 1, label: 'Company', icon: Building2 },
  { id: 2, label: 'Contact', icon: User },
  { id: 3, label: 'Details', icon: FileText },
  { id: 4, label: 'Routing', icon: Send },
]

const INITIAL: FormState = {
  businessUnitId: '', companyName: '', companyNameAr: '', companyWebsite: '',
  companyType: '', companySector: '', country: '', city: '', location: '',
  contactName: '', contactNumber: '', contactEmail: '', leadType: '',
  newClient: true, internalReferral: false, referralFrom: '',
  leadRequest: '', leadSource: '', communicationChannel: '', marketingNotes: '',
  directedToDeptId: '',
}

// ─── Sub-components at module scope (prevents focus loss on parent re-render) ──

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  hint?: string
  voice?: boolean
  isListening?: boolean
  onVoiceToggle?: () => void
  error?: string
}

function Field({
  label, value, onChange, placeholder, type = 'text',
  required, hint, voice = true, isListening = false, onVoiceToggle, error,
}: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium flex items-center gap-1"
        style={{ color: 'var(--nf-muted)' }}>
        {label}{required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn('input-base text-sm h-10', voice && onVoiceToggle && 'pr-10', error && 'border-red-500')}
        />
        {voice && onVoiceToggle && (
          <button
            type="button"
            onClick={onVoiceToggle}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
            style={{ color: isListening ? 'var(--nf-accent)' : 'var(--nf-subtle)' }}>
            {isListening
              ? <MicOff className="w-3.5 h-3.5 animate-pulse" />
              : <Mic className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: 'var(--nf-subtle)' }}>{hint}</p>}
    </div>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  required?: boolean
  error?: string
}

function SelectField({ label, value, onChange, options, placeholder, required, error }: SelectFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium flex items-center gap-1"
        style={{ color: 'var(--nf-muted)' }}>
        {label}{required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('input-base text-sm h-10', error && 'border-red-500')}>
        <option value="">{placeholder ?? `Select ${label}`}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  )
}

interface ToggleProps {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  hint?: string
}

function Toggle({ label, value, onChange, hint }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--nf-text)' }}>{label}</p>
        {hint && <p className="text-xs" style={{ color: 'var(--nf-subtle)' }}>{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="relative w-10 h-5 rounded-full transition-colors shrink-0"
        style={{ background: value ? 'var(--nf-accent)' : 'var(--nf-border)' }}>
        <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
          style={{ left: value ? 'calc(100% - 18px)' : '2px' }} />
      </button>
    </div>
  )
}

// ─── Main form component ──────────────────────────────────────────────────────

export function NewLeadForm({ businessUnits, dropdownsPerEntity, globalDropdowns, departments }: Props) {
  const [step, setStep]       = useState(1)
  const [form, setForm]       = useState<FormState>(INITIAL)
  const [errors, setErrors]   = useState<Partial<Record<keyof FormState, string>>>({})
  const [isPending, startTransition] = useTransition()
  const [isListening, setIsListening] = useState<string | null>(null)
  const recognitionRef        = useRef<any>(null)

  // Entity-scoped dropdowns: switch when BU is selected
  const dropdowns = form.businessUnitId
    ? (dropdownsPerEntity[form.businessUnitId] ?? globalDropdowns)
    : globalDropdowns

  // Departments filtered to selected entity (or all if no BU yet)
  const visibleDepts = form.businessUnitId
    ? departments.filter((d) => !d.businessUnitId || d.businessUnitId === form.businessUnitId)
    : departments

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  // ── Voice input ──────────────────────────────────────────────────────────────
  function startVoice(field: keyof FormState) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser')
      return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onresult = (e: any) => {
      set(field, e.results[0][0].transcript as any)
      setIsListening(null)
    }
    rec.onerror = () => setIsListening(null)
    rec.onend   = () => setIsListening(null)
    recognitionRef.current = rec
    rec.start()
    setIsListening(field)
  }

  function stopVoice() {
    recognitionRef.current?.stop()
    setIsListening(null)
  }

  /** Returns voice props for a given field */
  function vp(field: keyof FormState) {
    return {
      isListening: isListening === field,
      onVoiceToggle: () => isListening === field ? stopVoice() : startVoice(field),
    }
  }

  // ── Validation ───────────────────────────────────────────────────────────────
  function validateStep(s: number): boolean {
    const errs: typeof errors = {}
    if (s === 1) {
      if (!form.businessUnitId)      errs.businessUnitId = 'Select an entity'
      if (!form.companyName.trim())  errs.companyName    = 'Required'
    }
    if (s === 2) {
      if (!form.contactName.trim())   errs.contactName   = 'Required'
      if (!form.contactNumber.trim()) errs.contactNumber = 'Required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() { if (validateStep(step)) setStep((s) => s + 1) }
  function back() { setStep((s) => s - 1) }

  // ── Submit ───────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!validateStep(4)) return
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)))
    startTransition(async () => {
      try {
        await createLead(fd)
      } catch (e: any) {
        // Re-throw Next.js redirect — it's not an error, it's navigation
        if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e
        toast.error(e.message ?? 'Failed to create lead')
      }
    })
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
            <StepHeader icon={Building2} title="Company Information" subtitle="Details about the lead's company" />

            {/* Entity selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium flex items-center gap-1"
                style={{ color: 'var(--nf-muted)' }}>
                Entity<span style={{ color: '#EF4444' }}>*</span>
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
              <Field label="Company Name (EN)" value={form.companyName}
                onChange={(v) => set('companyName', v)} placeholder="e.g. Acme Corp"
                required error={errors.companyName} {...vp('companyName')} />
              <Field label="Company Name (AR)" value={form.companyNameAr}
                onChange={(v) => set('companyNameAr', v)} placeholder="اسم الشركة" voice={false} />
              <Field label="Website" value={form.companyWebsite}
                onChange={(v) => set('companyWebsite', v)} placeholder="https://example.com"
                type="url" voice={false} />
              <SelectField label="Company Type" value={form.companyType}
                onChange={(v) => set('companyType', v)} options={dropdowns.COMPANY_TYPE ?? []} />
              <SelectField label="Sector" value={form.companySector}
                onChange={(v) => set('companySector', v)} options={dropdowns.COMPANY_SECTOR ?? []} />
              <Field label="Country" value={form.country}
                onChange={(v) => set('country', v)} placeholder="e.g. Egypt" {...vp('country')} />
              <Field label="City" value={form.city}
                onChange={(v) => set('city', v)} placeholder="e.g. Cairo" {...vp('city')} />
              <Field label="Location / Address" value={form.location}
                onChange={(v) => set('location', v)} placeholder="Street, area…" {...vp('location')} />
            </div>
          </div>
        )}

        {/* Step 2 – Contact */}
        {step === 2 && (
          <div className="space-y-4">
            <StepHeader icon={User} title="Contact Information" subtitle="The person you spoke with" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contact Name" value={form.contactName}
                onChange={(v) => set('contactName', v)} placeholder="Full name"
                required error={errors.contactName} {...vp('contactName')} />
              <Field label="Contact Number" value={form.contactNumber}
                onChange={(v) => set('contactNumber', v)} placeholder="+20 1XX XXX XXXX"
                type="tel" required error={errors.contactNumber} {...vp('contactNumber')} />
              <Field label="Contact Email" value={form.contactEmail}
                onChange={(v) => set('contactEmail', v)} placeholder="email@company.com"
                type="email" voice={false} />
              <SelectField label="Lead Type" value={form.leadType}
                onChange={(v) => set('leadType', v)} options={dropdowns.LEAD_TYPE ?? []} />
            </div>
            <div className="pt-2 space-y-1 rounded-lg p-3"
              style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-border)' }}>
              <Toggle label="New Client?" value={form.newClient}
                onChange={(v) => set('newClient', v)} hint="Is this a new business relationship?" />
              <div style={{ height: 1, background: 'var(--nf-border)' }} />
              <Toggle label="Internal Referral?" value={form.internalReferral}
                onChange={(v) => set('internalReferral', v)} hint="Was this lead referred internally?" />
            </div>
            {form.internalReferral && (
              <Field label="Referral From" value={form.referralFrom}
                onChange={(v) => set('referralFrom', v)} placeholder="Who referred this lead?"
                {...vp('referralFrom')} />
            )}
          </div>
        )}

        {/* Step 3 – Lead Details */}
        {step === 3 && (
          <div className="space-y-4">
            <StepHeader icon={FileText} title="Lead Details" subtitle="What they need and how they found us" />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--nf-muted)' }}>
                  Lead Request
                </label>
                <VoiceRecordButton
                  onTranscript={(t) => set('leadRequest', form.leadRequest ? form.leadRequest + '\n' + t : t)}
                  currentValue={form.leadRequest}
                  mode="append"
                  className="text-[11px] py-0.5 px-2 shrink-0"
                />
              </div>
              <textarea
                value={form.leadRequest}
                onChange={(e) => set('leadRequest', e.target.value)}
                placeholder="What is the lead requesting or looking for? (or tap Record to dictate)"
                rows={3}
                className="input-base text-sm resize-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Lead Source" value={form.leadSource}
                onChange={(v) => set('leadSource', v)} options={dropdowns.LEAD_SOURCE ?? []} />
              <SelectField label="Communication Channel" value={form.communicationChannel}
                onChange={(v) => set('communicationChannel', v)} options={dropdowns.COMMUNICATION_CHANNEL ?? []} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--nf-muted)' }}>
                  Marketing Notes (internal)
                </label>
                <VoiceRecordButton
                  onTranscript={(t) => set('marketingNotes', form.marketingNotes ? form.marketingNotes + '\n' + t : t)}
                  currentValue={form.marketingNotes}
                  mode="append"
                  className="text-[11px] py-0.5 px-2 shrink-0"
                />
              </div>
              <textarea
                value={form.marketingNotes}
                onChange={(e) => set('marketingNotes', e.target.value)}
                placeholder="Anything the sales team should know… (or tap Record to dictate)"
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
              {visibleDepts.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => set('directedToDeptId', dept.id)}
                  className={cn(
                    'text-left px-4 py-3 rounded-lg border text-sm transition-all',
                    form.directedToDeptId === dept.id ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200',
                  )}
                  style={{
                    borderColor: form.directedToDeptId === dept.id ? 'var(--nf-accent)' : 'var(--nf-border)',
                    background: form.directedToDeptId === dept.id ? 'var(--nf-accent-glow)' : 'var(--nf-surface-2)',
                  }}>
                  {dept.name}
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="rounded-lg p-4 space-y-2 text-sm"
              style={{ background: 'var(--nf-surface-2)', border: '1px solid var(--nf-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3"
                style={{ color: 'var(--nf-subtle)' }}>Lead Summary</p>
              <SummaryRow label="Company" value={form.companyName} />
              <SummaryRow label="Contact" value={`${form.contactName} · ${form.contactNumber}`} />
              <SummaryRow label="Entity"
                value={businessUnits.find((b) => b.id === form.businessUnitId)?.name ?? '—'} />
              <SummaryRow label="Source"
                value={[form.leadSource, form.communicationChannel].filter(Boolean).join(' → ')} />
              <SummaryRow label="Department"
                value={departments.find((d) => d.id === form.directedToDeptId)?.name ?? 'Not selected'} />
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} disabled={step === 1}
          className="btn-outline h-10 px-5 text-sm disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {step < 4 ? (
          <button type="button" onClick={next} className="btn-primary h-10 px-6 text-sm">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={isPending}
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

// ─── Utility sub-components ───────────────────────────────────────────────────

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
      <span className="text-xs font-medium text-right"
        style={{ color: value ? 'var(--nf-text)' : 'var(--nf-subtle)' }}>
        {value || '—'}
      </span>
    </div>
  )
}
