/**
 * DB-driven field permissions with hardcoded fallbacks.
 *
 * Admin can override any role × field combination from the Permissions panel.
 * If no DB record exists, the hardcoded default (matching original behavior) applies.
 */
import { cache } from 'react'
import { db } from '@/lib/db'
import type { Role } from '@/generated/prisma/client'

// ─── All editable lead fields ─────────────────────────────────────────────────

export const ALL_LEAD_FIELDS = [
  // Mutual
  { key: 'companyName',       label: 'Company Name',          group: 'Mutual'    },
  { key: 'companyNameAr',     label: 'Company Name (AR)',      group: 'Mutual'    },
  { key: 'companyWebsite',    label: 'Website',                group: 'Mutual'    },
  { key: 'companyType',       label: 'Company Type',           group: 'Mutual'    },
  { key: 'companySector',     label: 'Company Sector',         group: 'Mutual'    },
  { key: 'country',           label: 'Country',                group: 'Mutual'    },
  { key: 'city',              label: 'City',                   group: 'Mutual'    },
  { key: 'location',          label: 'Location',               group: 'Mutual'    },
  { key: 'contactName',       label: 'Contact Name',           group: 'Mutual'    },
  { key: 'contactNumber',     label: 'Contact Number',         group: 'Mutual'    },
  { key: 'contactEmail',      label: 'Contact Email',          group: 'Mutual'    },
  { key: 'leadType',          label: 'Lead Type',              group: 'Mutual'    },
  { key: 'newClient',         label: 'New Client',             group: 'Mutual'    },
  { key: 'internalReferral',  label: 'Internal Referral',      group: 'Mutual'    },
  { key: 'referralFrom',      label: 'Referral From',          group: 'Mutual'    },
  // Marketing
  { key: 'leadRequest',       label: 'Lead Request',           group: 'Marketing' },
  { key: 'leadSource',        label: 'Lead Source',            group: 'Marketing' },
  { key: 'communicationChannel', label: 'Communication Channel', group: 'Marketing' },
  { key: 'marketingNotes',    label: 'Marketing Notes',        group: 'Marketing' },
  { key: 'directedToDeptId',  label: 'Directed To Dept',       group: 'Marketing' },
  { key: 'sentToSales',       label: 'Sent to Sales',          group: 'Marketing' },
  // Sales
  { key: 'salesResponse',     label: 'Sales Response',         group: 'Sales'     },
  { key: 'salesResponseDate', label: 'Sales Response Date',    group: 'Sales'     },
  { key: 'requestStatus',     label: 'Request Status',         group: 'Sales'     },
] as const

export type LeadFieldKey = (typeof ALL_LEAD_FIELDS)[number]['key']

// ─── Hardcoded defaults (fallback when no DB override exists) ─────────────────

const DEFAULTS: Record<Role, Record<string, { canView: boolean; canEdit: boolean }>> = {
  MARKETING: {
    // Mutual: view + edit
    companyName: { canView: true, canEdit: true },
    companyNameAr: { canView: true, canEdit: true },
    companyWebsite: { canView: true, canEdit: true },
    companyType: { canView: true, canEdit: true },
    companySector: { canView: true, canEdit: true },
    country: { canView: true, canEdit: true },
    city: { canView: true, canEdit: true },
    location: { canView: true, canEdit: true },
    contactName: { canView: true, canEdit: true },
    contactNumber: { canView: true, canEdit: true },
    contactEmail: { canView: true, canEdit: true },
    leadType: { canView: true, canEdit: true },
    newClient: { canView: true, canEdit: true },
    internalReferral: { canView: true, canEdit: true },
    referralFrom: { canView: true, canEdit: true },
    // Marketing: view + edit
    leadRequest: { canView: true, canEdit: true },
    leadSource: { canView: true, canEdit: true },
    communicationChannel: { canView: true, canEdit: true },
    marketingNotes: { canView: true, canEdit: true },
    directedToDeptId: { canView: true, canEdit: true },
    sentToSales: { canView: true, canEdit: false },
    // Sales: hidden
    salesResponse: { canView: false, canEdit: false },
    salesResponseDate: { canView: false, canEdit: false },
    requestStatus: { canView: false, canEdit: false },
  },
  SALES: {
    // Mutual: view only
    companyName: { canView: true, canEdit: false },
    companyNameAr: { canView: true, canEdit: false },
    companyWebsite: { canView: true, canEdit: false },
    companyType: { canView: true, canEdit: false },
    companySector: { canView: true, canEdit: false },
    country: { canView: true, canEdit: false },
    city: { canView: true, canEdit: false },
    location: { canView: true, canEdit: false },
    contactName: { canView: true, canEdit: false },
    contactNumber: { canView: true, canEdit: false },
    contactEmail: { canView: true, canEdit: false },
    leadType: { canView: true, canEdit: false },
    newClient: { canView: true, canEdit: false },
    internalReferral: { canView: true, canEdit: false },
    referralFrom: { canView: true, canEdit: false },
    // Marketing: hidden
    leadRequest: { canView: false, canEdit: false },
    leadSource: { canView: false, canEdit: false },
    communicationChannel: { canView: false, canEdit: false },
    marketingNotes: { canView: false, canEdit: false },
    directedToDeptId: { canView: false, canEdit: false },
    sentToSales: { canView: false, canEdit: false },
    // Sales: view + edit
    salesResponse: { canView: true, canEdit: true },
    salesResponseDate: { canView: true, canEdit: true },
    requestStatus: { canView: true, canEdit: true },
  },
  MANAGER: {
    // All fields: view only
    companyName: { canView: true, canEdit: false },
    companyNameAr: { canView: true, canEdit: false },
    companyWebsite: { canView: true, canEdit: false },
    companyType: { canView: true, canEdit: false },
    companySector: { canView: true, canEdit: false },
    country: { canView: true, canEdit: false },
    city: { canView: true, canEdit: false },
    location: { canView: true, canEdit: false },
    contactName: { canView: true, canEdit: false },
    contactNumber: { canView: true, canEdit: false },
    contactEmail: { canView: true, canEdit: false },
    leadType: { canView: true, canEdit: false },
    newClient: { canView: true, canEdit: false },
    internalReferral: { canView: true, canEdit: false },
    referralFrom: { canView: true, canEdit: false },
    leadRequest: { canView: true, canEdit: false },
    leadSource: { canView: true, canEdit: false },
    communicationChannel: { canView: true, canEdit: false },
    marketingNotes: { canView: true, canEdit: false },
    directedToDeptId: { canView: true, canEdit: false },
    sentToSales: { canView: true, canEdit: false },
    salesResponse: { canView: true, canEdit: false },
    salesResponseDate: { canView: true, canEdit: false },
    requestStatus: { canView: true, canEdit: false },
  },
  SUPER_ADMIN: {
    // All fields: full access — built as a catch-all below
    companyName: { canView: true, canEdit: true },
    companyNameAr: { canView: true, canEdit: true },
    companyWebsite: { canView: true, canEdit: true },
    companyType: { canView: true, canEdit: true },
    companySector: { canView: true, canEdit: true },
    country: { canView: true, canEdit: true },
    city: { canView: true, canEdit: true },
    location: { canView: true, canEdit: true },
    contactName: { canView: true, canEdit: true },
    contactNumber: { canView: true, canEdit: true },
    contactEmail: { canView: true, canEdit: true },
    leadType: { canView: true, canEdit: true },
    newClient: { canView: true, canEdit: true },
    internalReferral: { canView: true, canEdit: true },
    referralFrom: { canView: true, canEdit: true },
    leadRequest: { canView: true, canEdit: true },
    leadSource: { canView: true, canEdit: true },
    communicationChannel: { canView: true, canEdit: true },
    marketingNotes: { canView: true, canEdit: true },
    directedToDeptId: { canView: true, canEdit: true },
    sentToSales: { canView: true, canEdit: true },
    salesResponse: { canView: true, canEdit: true },
    salesResponseDate: { canView: true, canEdit: true },
    requestStatus: { canView: true, canEdit: true },
  },
}

// ─── DB-driven permission loader (cached per request) ─────────────────────────

export const loadFieldPermissions = cache(async () => {
  try {
    const rows = await db.fieldPermission.findMany()
    const map = new Map<string, { canView: boolean; canEdit: boolean }>()
    for (const row of rows) {
      map.set(`${row.role}:${row.fieldName}`, { canView: row.canView, canEdit: row.canEdit })
    }
    return map
  } catch {
    return new Map<string, { canView: boolean; canEdit: boolean }>()
  }
})

// ─── Permission query helpers ─────────────────────────────────────────────────

export function getDefaultPerm(role: Role, fieldName: string): { canView: boolean; canEdit: boolean } {
  return DEFAULTS[role]?.[fieldName] ?? { canView: role === 'SUPER_ADMIN', canEdit: role === 'SUPER_ADMIN' }
}

export async function canViewField(role: Role, fieldName: string): Promise<boolean> {
  const map = await loadFieldPermissions()
  const override = map.get(`${role}:${fieldName}`)
  if (override !== undefined) return override.canView
  return getDefaultPerm(role, fieldName).canView
}

export async function canEditField(role: Role, fieldName: string): Promise<boolean> {
  const map = await loadFieldPermissions()
  const override = map.get(`${role}:${fieldName}`)
  if (override !== undefined) return override.canEdit
  return getDefaultPerm(role, fieldName).canEdit
}

export async function getPermissionsForRole(role: Role): Promise<Record<string, { canView: boolean; canEdit: boolean }>> {
  const map = await loadFieldPermissions()
  const result: Record<string, { canView: boolean; canEdit: boolean }> = {}
  for (const { key } of ALL_LEAD_FIELDS) {
    const override = map.get(`${role}:${key}`)
    result[key] = override ?? getDefaultPerm(role, key)
  }
  return result
}

/** Strips fields from a lead object that a role cannot view. */
export async function stripLeadByPermissions<T extends Record<string, any>>(
  lead: T,
  role: Role,
): Promise<Partial<T>> {
  const perms = await getPermissionsForRole(role)
  const result = { ...lead }
  for (const { key } of ALL_LEAD_FIELDS) {
    if (!perms[key]?.canView) {
      delete result[key]
    }
  }
  return result
}
