import { Role } from '@/generated/prisma/client'
import type { Session } from 'next-auth'

// ─── Field visibility per role ────────────────────────────────────────────────

export const MUTUAL_FIELDS = [
  'reqCode', 'requestDate', 'companyName', 'companyNameAr', 'companyWebsite',
  'companyType', 'companySector', 'country', 'city', 'location',
  'contactName', 'contactNumber', 'contactEmail',
  'leadType', 'newClient', 'internalReferral', 'referralFrom',
] as const

export const MARKETING_FIELDS = [
  'leadRequest', 'leadSource', 'communicationChannel', 'marketingNotes',
  'directedToDeptId', 'sentToSales', 'sentToSalesAt',
] as const

export const SALES_FIELDS = [
  'salesResponse', 'salesResponseDate', 'requestStatus',
] as const

export type MutualField = (typeof MUTUAL_FIELDS)[number]
export type MarketingField = (typeof MARKETING_FIELDS)[number]
export type SalesField = (typeof SALES_FIELDS)[number]

// ─── Permission helpers ───────────────────────────────────────────────────────

export function canViewMarketingFields(role: Role): boolean {
  return role === Role.MARKETING || role === Role.MANAGER || role === Role.SUPER_ADMIN
}

export function canViewSalesFields(role: Role): boolean {
  return role === Role.SALES || role === Role.MANAGER || role === Role.SUPER_ADMIN
}

export function canEditMutualFields(role: Role): boolean {
  return role === Role.MARKETING || role === Role.SUPER_ADMIN
}

export function canEditMarketingFields(role: Role): boolean {
  return role === Role.MARKETING || role === Role.SUPER_ADMIN
}

export function canEditSalesFields(role: Role): boolean {
  return role === Role.SALES || role === Role.SUPER_ADMIN
}

export function canCreateLead(role: Role): boolean {
  return role === Role.MARKETING || role === Role.SUPER_ADMIN
}

export function canSendToSales(role: Role): boolean {
  return role === Role.MARKETING || role === Role.SUPER_ADMIN
}

export function canViewAnalytics(role: Role): boolean {
  return role === Role.MANAGER || role === Role.SUPER_ADMIN
}

export function canManageUsers(role: Role): boolean {
  return role === Role.SUPER_ADMIN
}

export function canDeleteLead(role: Role): boolean {
  return role === Role.SUPER_ADMIN
}

// ─── Entity scope check ───────────────────────────────────────────────────────

export function hasAccessToBusinessUnit(
  user: { role: Role; businessUnitIds: string[] },
  businessUnitId: string
): boolean {
  if (user.role === Role.SUPER_ADMIN) return true
  return user.businessUnitIds.includes(businessUnitId)
}

export function hasAccessToDepartment(
  user: { role: Role; departmentIds: string[] },
  departmentId: string | null | undefined
): boolean {
  if (!departmentId) return true
  if (user.role === Role.SUPER_ADMIN || user.role === Role.MANAGER || user.role === Role.MARKETING) return true
  // SALES entity-only access (no departments assigned) → can see all leads in their entities
  if (user.departmentIds.length === 0) return true
  return user.departmentIds.includes(departmentId)
}

// ─── Strip fields from lead by role ──────────────────────────────────────────

export function stripLeadByRole<T extends Record<string, any>>(lead: T, role: Role): Partial<T> {
  const result = { ...lead }

  if (!canViewMarketingFields(role)) {
    for (const field of MARKETING_FIELDS) {
      delete result[field]
    }
  }

  if (!canViewSalesFields(role)) {
    for (const field of SALES_FIELDS) {
      delete result[field]
    }
  }

  return result
}

// ─── Default landing page by role ────────────────────────────────────────────

export function getDefaultPath(role: Role): string {
  switch (role) {
    case Role.MARKETING:   return '/leads/new'
    case Role.SALES:       return '/leads'
    case Role.MANAGER:     return '/analytics'
    case Role.SUPER_ADMIN: return '/admin'
    default:               return '/leads'
  }
}

// ─── Role labels (re-exported from roles.ts for server-side use) ─────────────
export { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles'
