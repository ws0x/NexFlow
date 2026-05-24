import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

// ─── Tailwind class merging ───────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date formatting ─────────────────────────────────────────────────────────

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy, HH:mm')
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// ─── Status colors ────────────────────────────────────────────────────────────

export const STATUS_STYLES: Record<string, string> = {
  'Unknown Status':       'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  'Just an inquiry':      'bg-blue-500/15 text-blue-300 ring-blue-500/30',
  'Out Of Range':         'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  'Out Of Segment':       'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  'Quoting Stage':        'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30',
  'Rejected the Quote':   'bg-red-500/15 text-red-300 ring-red-500/30',
  'Turned Into Order':    'bg-green-500/15 text-green-300 ring-green-500/30',
}

export function getStatusStyle(status: string): string {
  return STATUS_STYLES[status] ?? STATUS_STYLES['Unknown Status']
}

// ─── Lead lifecycle badge ─────────────────────────────────────────────────────

export const LEAD_STATUS_STYLES: Record<string, string> = {
  DRAFT:         'bg-slate-500/15 text-slate-300',
  SUBMITTED:     'bg-blue-500/15 text-blue-300',
  SENT_TO_SALES: 'bg-cyan-500/15 text-cyan-300',
  COMPLETED:     'bg-green-500/15 text-green-300',
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  DRAFT:         'Draft',
  SUBMITTED:     'Submitted',
  SENT_TO_SALES: 'With Sales',
  COMPLETED:     'Completed',
}

// ─── BU badge colors ──────────────────────────────────────────────────────────

export const BU_STYLES: Record<string, string> = {
  HSL: 'bg-violet-500/15 text-violet-300',
  MGL: 'bg-emerald-500/15 text-emerald-300',
  MKL: 'bg-cyan-500/15 text-cyan-300',
}

export function getBUStyle(prefix: string): string {
  return BU_STYLES[prefix] ?? 'bg-slate-500/15 text-slate-300'
}

// ─── String helpers ───────────────────────────────────────────────────────────

export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

// ─── Phone number formatter ───────────────────────────────────────────────────

export function formatPhone(phone: string): string {
  return phone.replace(/(\d{2})(\d{4})(\d+)/, '+$1 $2 $3')
}

// ─── Role colors (simple string version for sidebar) ─────────────────────────

export const ROLE_COLORS_SIMPLE: Record<string, string> = {
  SUPER_ADMIN: 'text-purple-400',
  MANAGER:     'text-blue-400',
  MARKETING:   'text-cyan-400',
  SALES:       'text-green-400',
}
