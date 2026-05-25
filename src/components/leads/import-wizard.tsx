'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft,
  CheckCircle2, AlertCircle, Loader2, X, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { importLeads, type ImportRow, type ImportResult } from '@/app/actions/import'
import { toast } from 'sonner'

// ─── Field definitions ────────────────────────────────────────────────────────

interface FieldDef {
  key:      keyof ImportRow
  label:    string
  required: boolean
  group:    'company' | 'contact' | 'lead' | 'sales'
}

const FIELDS: FieldDef[] = [
  // Company
  { key: 'companyName',      label: 'Company Name',      required: true,  group: 'company' },
  { key: 'companyNameAr',    label: 'Company Name (AR)', required: false, group: 'company' },
  { key: 'companyWebsite',   label: 'Website',           required: false, group: 'company' },
  { key: 'companyType',      label: 'Company Type',      required: false, group: 'company' },
  { key: 'companySector',    label: 'Sector',            required: false, group: 'company' },
  { key: 'country',          label: 'Country',           required: false, group: 'company' },
  { key: 'city',             label: 'City',              required: false, group: 'company' },
  { key: 'location',         label: 'Location',          required: false, group: 'company' },
  // Contact
  { key: 'contactName',      label: 'Contact Name',      required: true,  group: 'contact' },
  { key: 'contactNumber',    label: 'Contact Number',    required: true,  group: 'contact' },
  { key: 'contactEmail',     label: 'Email',             required: false, group: 'contact' },
  { key: 'leadType',         label: 'Lead Type',         required: false, group: 'contact' },
  // Lead
  { key: 'requestDate',      label: 'Request Date',      required: false, group: 'lead' },
  { key: 'leadSource',       label: 'Lead Source',       required: false, group: 'lead' },
  { key: 'communicationChannel', label: 'Channel',       required: false, group: 'lead' },
  { key: 'leadRequest',      label: 'Lead Request',      required: false, group: 'lead' },
  { key: 'marketingNotes',   label: 'Notes',             required: false, group: 'lead' },
  // Sales
  { key: 'requestStatus',    label: 'Request Status',    required: false, group: 'sales' },
  { key: 'salesResponse',    label: 'Sales Response',    required: false, group: 'sales' },
]

const GROUP_LABELS: Record<string, string> = {
  company: 'Company',
  contact: 'Contact',
  lead:    'Lead Details',
  sales:   'Sales',
}

// ─── Auto-detect column → field ───────────────────────────────────────────────

const KEYWORDS: Partial<Record<keyof ImportRow, string[]>> = {
  companyName:          ['company name', 'company', 'firm', 'organization', 'client'],
  companyNameAr:        ['company ar', 'arabic', 'ar name'],
  contactName:          ['contact name', 'contact person', 'contact', 'person', 'name'],
  contactNumber:        ['contact number', 'phone', 'mobile', 'tel', 'telephone', 'number'],
  contactEmail:         ['email', 'e-mail', 'mail'],
  country:              ['country'],
  city:                 ['city', 'town'],
  location:             ['location', 'address', 'area'],
  companySector:        ['sector', 'industry', 'field'],
  companyType:          ['company type', 'type'],
  companyWebsite:       ['website', 'web', 'url', 'site'],
  leadSource:           ['source', 'lead source', 'how did you find'],
  communicationChannel: ['channel', 'communication', 'comm'],
  leadType:             ['lead type', 'type of lead'],
  leadRequest:          ['request', 'lead request', 'requirement', 'needs'],
  marketingNotes:       ['notes', 'remarks', 'comments', 'note'],
  requestDate:          ['date', 'request date', 'lead date', 'created at'],
  requestStatus:        ['status', 'request status', 'sales status'],
  salesResponse:        ['response', 'sales response', 'reply'],
}

function autoDetect(cols: string[]): Record<string, string> {
  const lower   = cols.map((c) => c.toLowerCase().trim())
  const mapping: Record<string, string> = {}
  const used    = new Set<string>()

  for (const [field, keywords] of Object.entries(KEYWORDS)) {
    for (const kw of keywords!) {
      const idx = lower.findIndex((c) => c === kw || c.includes(kw))
      if (idx >= 0 && !used.has(cols[idx])) {
        mapping[field] = cols[idx]
        used.add(cols[idx])
        break
      }
    }
  }
  return mapping
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'importing' | 'done'

interface Props {
  businessUnits: { id: string; name: string; prefix: string }[]
}

const MAX_ROWS = 1000

export function ImportWizard({ businessUnits }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [step,    setStep]    = useState<Step>('upload')
  const [file,    setFile]    = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [rows,    setRows]    = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [buId,    setBuId]    = useState(businessUnits[0]?.id ?? '')
  const [status,  setStatus]  = useState<'SUBMITTED' | 'DRAFT'>('SUBMITTED')
  const [result,  setResult]  = useState<ImportResult | null>(null)
  const [drag,    setDrag]    = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── File handling ───────────────────────────────────────────────────────────
  const processFile = useCallback(async (f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload an Excel (.xlsx / .xls) or CSV file')
      return
    }

    try {
      const XLSX = await import('xlsx')
      const buffer   = await f.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', raw: false, dateNF: 'yyyy-mm-dd' })
      const sheet    = workbook.Sheets[workbook.SheetNames[0]]
      const data     = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        raw:    false,
        defval: '',
        dateNF: 'yyyy-mm-dd',
      })

      if (data.length === 0) {
        toast.error('The file is empty or has no data rows')
        return
      }

      const cols = Object.keys(data[0])
      setFile(f)
      setColumns(cols)
      setRows(data)
      setMapping(autoDetect(cols))
      setStep('map')
    } catch {
      toast.error('Could not read file. Make sure it is a valid Excel or CSV.')
    }
  }, [])

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  // ── Build mapped rows for the action ────────────────────────────────────────
  function getMappedRows(): ImportRow[] {
    return rows.map((excelRow) => {
      const lead: ImportRow = {}
      for (const [field, col] of Object.entries(mapping)) {
        if (col && excelRow[col] !== undefined) {
          ;(lead as any)[field] = String(excelRow[col]).trim()
        }
      }
      return lead
    })
  }

  // ── Execute import ───────────────────────────────────────────────────────────
  function handleImport() {
    setStep('importing')
    startTransition(async () => {
      try {
        const mappedRows = getMappedRows()
        const res = await importLeads(mappedRows, buId, status)
        setResult(res)
        setStep('done')
        if (res.imported > 0) {
          toast.success(`${res.imported} leads imported successfully`)
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Import failed')
        setStep('map')
      }
    })
  }

  const requiredMapped  = FIELDS.filter((f) => f.required).every((f) => mapping[f.key])
  const validRowPreview = rows.slice(0, 3).map((r) =>
    Object.fromEntries(
      Object.entries(mapping)
        .filter(([, col]) => col)
        .map(([field, col]) => [field, r[col] ?? '']),
    ),
  )

  // ─── Step 1: Upload ─────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <StepHeader step={1} title="Upload File" subtitle="Supports .xlsx, .xls, and .csv" />

        {/* Drop zone */}
        <div
          className={cn(
            'rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-10 cursor-pointer transition-all',
            drag ? 'scale-[1.01]' : '',
          )}
          style={{
            borderColor: drag ? 'var(--nf-accent)' : 'var(--nf-border)',
            background:  drag ? 'var(--nf-accent-glow)' : 'var(--nf-surface)',
          }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <FileSpreadsheet className="w-12 h-12 mb-3" style={{ color: drag ? 'var(--nf-accent)' : 'var(--nf-border-2)' }} />
          <p className="text-base font-medium mb-1" style={{ color: 'var(--nf-text)' }}>
            Drop your Excel file here
          </p>
          <p className="text-sm" style={{ color: 'var(--nf-muted)' }}>
            or <span style={{ color: 'var(--nf-accent)' }}>click to browse</span> — .xlsx, .xls, .csv
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileInput} />
        </div>

        {/* Configure */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>
            Import Settings
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Entity */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--nf-muted)' }}>
                Target Entity
              </label>
              <select
                value={buId}
                onChange={(e) => setBuId(e.target.value)}
                className="input-base text-sm"
              >
                {businessUnits.map((bu) => (
                  <option key={bu.id} value={bu.id}>{bu.name} ({bu.prefix})</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--nf-muted)' }}>
                Import as
              </label>
              <div className="flex gap-2">
                {([['SUBMITTED', 'Submitted'], ['DRAFT', 'Draft']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setStatus(val)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-all border"
                    style={
                      status === val
                        ? { background: 'var(--nf-accent)', color: '#0F172A', borderColor: 'var(--nf-accent)' }
                        : { background: 'var(--nf-surface-2)', color: 'var(--nf-muted)', borderColor: 'var(--nf-border)' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'var(--nf-surface-2)' }}>
            <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--nf-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--nf-muted)' }}>
              Maximum {MAX_ROWS.toLocaleString()} rows per import. Only the first sheet is read.
              Required columns: Company Name, Contact Name, Contact Number.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step 2: Map columns ────────────────────────────────────────────────────
  if (step === 'map') {
    const groups = ['company', 'contact', 'lead', 'sales'] as const
    const rowCount = rows.length

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <StepHeader
            step={2}
            title="Map Columns"
            subtitle={`${file?.name} · ${rowCount.toLocaleString()} rows${rowCount > MAX_ROWS ? ` (first ${MAX_ROWS} will be imported)` : ''}`}
          />
          <button
            onClick={() => setStep('upload')}
            className="flex items-center gap-1.5 text-sm btn-ghost px-3 py-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {rowCount > MAX_ROWS && (
          <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: '#F59E0B15', border: '1px solid #F59E0B30' }}>
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#F59E0B' }} />
            <span style={{ color: '#F59E0B' }}>
              Your file has {rowCount.toLocaleString()} rows. Only the first {MAX_ROWS.toLocaleString()} will be imported.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Mapping table */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-4 py-3 text-xs font-semibold grid grid-cols-2 gap-4"
              style={{ borderBottom: '1px solid var(--nf-border)', color: 'var(--nf-subtle)', background: 'var(--nf-surface-2)' }}>
              <span>NexFlow Field</span>
              <span>Excel Column</span>
            </div>
            <div className="divide-y overflow-y-auto" style={{ borderColor: 'var(--nf-surface-2)', maxHeight: '60vh' }}>
              {groups.map((group) => {
                const groupFields = FIELDS.filter((f) => f.group === group)
                return (
                  <div key={group}>
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                      style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-subtle)' }}>
                      {GROUP_LABELS[group]}
                    </div>
                    {groupFields.map((field) => (
                      <div
                        key={field.key}
                        className="grid grid-cols-2 gap-4 items-center px-4 py-2.5"
                        style={{ borderBottom: '1px solid var(--nf-surface-2)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm" style={{ color: 'var(--nf-text)' }}>
                            {field.label}
                          </span>
                          {field.required && (
                            <span className="text-xs px-1 rounded" style={{ background: '#06B6D415', color: '#06B6D4' }}>
                              required
                            </span>
                          )}
                        </div>
                        <select
                          value={mapping[field.key] ?? ''}
                          onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value }))}
                          className="input-base text-xs py-1.5"
                          style={
                            field.required && !mapping[field.key]
                              ? { borderColor: '#EF444460' }
                              : {}
                          }
                        >
                          <option value="">— Skip —</option>
                          {columns.map((col) => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Preview panel */}
          <div className="space-y-4">
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--nf-muted)' }}>
                Preview (first 3 rows)
              </p>
              <div className="space-y-3">
                {validRowPreview.map((row, i) => (
                  <div key={i} className="p-3 rounded-lg text-xs space-y-1"
                    style={{ background: 'var(--nf-surface-2)' }}>
                    {Object.entries(row).slice(0, 6).map(([field, val]) => {
                      const def = FIELDS.find((f) => f.key === field)
                      return val ? (
                        <div key={field} className="flex gap-1.5">
                          <span className="shrink-0 font-medium" style={{ color: 'var(--nf-subtle)', width: 80 }}>
                            {def?.label ?? field}:
                          </span>
                          <span className="truncate" style={{ color: 'var(--nf-text)' }}>{val}</span>
                        </div>
                      ) : null
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Action */}
            <button
              onClick={handleImport}
              disabled={!requiredMapped || pending}
              className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              Import {Math.min(rowCount, MAX_ROWS).toLocaleString()} Leads
              <ArrowRight className="w-4 h-4" />
            </button>

            {!requiredMapped && (
              <p className="text-xs text-center" style={{ color: '#EF4444' }}>
                Map all required fields to continue
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Step 3: Importing ──────────────────────────────────────────────────────
  if (step === 'importing') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'var(--nf-accent-glow)', border: '2px solid var(--nf-accent)' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--nf-accent)' }} />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: 'var(--nf-text)' }}>Importing leads…</p>
          <p className="text-sm mt-1" style={{ color: 'var(--nf-muted)' }}>
            Validating rows, generating REQ codes, and saving to database
          </p>
        </div>
      </div>
    )
  }

  // ─── Step 4: Done ───────────────────────────────────────────────────────────
  if (step === 'done' && result) {
    const hasErrors = result.errors.length > 0
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <StepHeader step={3} title="Import Complete" subtitle="Here's what happened" />

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold" style={{ color: '#22C55E' }}>{result.imported}</p>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--nf-muted)' }}>Imported</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>{result.skipped}</p>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--nf-muted)' }}>Skipped</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold" style={{ color: 'var(--nf-text)' }}>
              {result.imported + result.skipped}
            </p>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--nf-muted)' }}>Total rows</p>
          </div>
        </div>

        {/* Errors */}
        {hasErrors && (
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4" style={{ color: '#EF4444' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--nf-text)' }}>
                {result.errors.length} rows skipped
              </p>
            </div>
            <div className="overflow-y-auto space-y-1" style={{ maxHeight: '200px' }}>
              {result.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs py-1"
                  style={{ borderBottom: '1px solid var(--nf-surface-2)' }}>
                  <span className="font-mono shrink-0 px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-muted)' }}>
                    Row {e.row}
                  </span>
                  <span style={{ color: 'var(--nf-muted)' }}>{e.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/leads')}
            className="btn-primary flex-1 py-3"
          >
            <CheckCircle2 className="w-4 h-4" />
            View Leads
          </button>
          <button
            onClick={() => {
              setStep('upload')
              setFile(null)
              setColumns([])
              setRows([])
              setMapping({})
              setResult(null)
            }}
            className="btn-outline flex-1 py-3"
          >
            Import Another File
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ─── Step header ──────────────────────────────────────────────────────────────

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  const steps = [
    { n: 1, label: 'Upload' },
    { n: 2, label: 'Map' },
    { n: 3, label: 'Done' },
  ]

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => {
          const done   = step > s.n
          const active = step === s.n
          return (
            <div key={s.n} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: done ? '#22C55E' : active ? 'var(--nf-accent)' : 'var(--nf-surface-2)',
                    color:      done || active ? '#0F172A' : 'var(--nf-subtle)',
                  }}
                >
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
                </div>
                <span className="text-xs font-medium"
                  style={{ color: active ? 'var(--nf-text)' : 'var(--nf-subtle)' }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="w-8 h-px mx-2" style={{ background: step > s.n ? '#22C55E' : 'var(--nf-border)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Title */}
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--nf-text)' }}>{title}</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--nf-muted)' }}>{subtitle}</p>
      </div>
    </div>
  )
}
