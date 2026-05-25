'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { canCreateLead, hasAccessToBusinessUnit } from '@/lib/permissions'
import { generateReqCodeBatch } from '@/lib/req-code'
import { parseISO, parse, isValid } from 'date-fns'
import type { Role } from '@/generated/prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportRow {
  companyName?:         string
  companyNameAr?:       string
  companyWebsite?:      string
  companyType?:         string
  companySector?:       string
  country?:             string
  city?:                string
  location?:            string
  contactName?:         string
  contactNumber?:       string
  contactEmail?:        string
  leadType?:            string
  leadRequest?:         string
  leadSource?:          string
  communicationChannel?: string
  marketingNotes?:      string
  requestStatus?:       string
  salesResponse?:       string
  requestDate?:         string
}

export interface ImportResult {
  imported: number
  skipped:  number
  errors:   { row: number; reason: string }[]
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

function parseDate(value?: string): Date | null {
  if (!value?.trim()) return null
  const v = value.trim()

  // ISO 8601
  const iso = parseISO(v)
  if (isValid(iso)) return iso

  // dd/MM/yyyy
  const dmy = parse(v, 'dd/MM/yyyy', new Date())
  if (isValid(dmy)) return dmy

  // MM/dd/yyyy
  const mdy = parse(v, 'MM/dd/yyyy', new Date())
  if (isValid(mdy)) return mdy

  // dd-MM-yyyy
  const dmyd = parse(v, 'dd-MM-yyyy', new Date())
  if (isValid(dmyd)) return dmyd

  // d MMM yyyy  (e.g. "5 Jan 2024")
  const textDate = parse(v, 'd MMM yyyy', new Date())
  if (isValid(textDate)) return textDate

  return null
}

function str(v?: string) {
  return v?.trim() || null
}

// ─── Action ───────────────────────────────────────────────────────────────────

const MAX_ROWS    = 1000
const CHUNK_SIZE  = 100

export async function importLeads(
  rows:           ImportRow[],
  businessUnitId: string,
  leadStatus:     string = 'SUBMITTED',
): Promise<ImportResult> {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = session.user.role as Role
  if (!canCreateLead(role)) throw new Error('Forbidden: only Marketing and Admin can import leads')
  if (!hasAccessToBusinessUnit(session.user, businessUnitId)) {
    throw new Error('No access to this entity')
  }

  const toProcess = rows.slice(0, MAX_ROWS)
  const valid:  { row: ImportRow; idx: number }[] = []
  const errors: { row: number; reason: string }[]  = []

  // ── Validate ────────────────────────────────────────────────────────────────
  for (let i = 0; i < toProcess.length; i++) {
    const row    = toProcess[i]
    const rowNum = i + 2 // +2 because row 1 = header in Excel

    if (!row.companyName?.trim()) {
      errors.push({ row: rowNum, reason: 'Company name is required' })
      continue
    }
    if (!row.contactName?.trim()) {
      errors.push({ row: rowNum, reason: 'Contact name is required' })
      continue
    }
    if (!row.contactNumber?.trim()) {
      errors.push({ row: rowNum, reason: 'Contact number is required' })
      continue
    }

    valid.push({ row, idx: rowNum })
  }

  if (valid.length === 0) {
    return { imported: 0, skipped: toProcess.length, errors }
  }

  // ── Generate REQ codes in one atomic batch ──────────────────────────────────
  const reqCodes = await generateReqCodeBatch(businessUnitId, valid.length)
  const now      = new Date()

  // ── Insert in chunks ────────────────────────────────────────────────────────
  let imported = 0

  for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
    const chunk      = valid.slice(i, i + CHUNK_SIZE)
    const chunkCodes = reqCodes.slice(i, i + CHUNK_SIZE)

    await db.lead.createMany({
      data: chunk.map(({ row }, j) => ({
        reqCode:              chunkCodes[j],
        leadStatus:           leadStatus as any,
        requestDate:          parseDate(row.requestDate) ?? now,
        companyName:          row.companyName!.trim(),
        companyNameAr:        str(row.companyNameAr),
        companyWebsite:       str(row.companyWebsite),
        companyType:          str(row.companyType),
        companySector:        str(row.companySector),
        country:              str(row.country),
        city:                 str(row.city),
        location:             str(row.location),
        contactName:          row.contactName!.trim(),
        contactNumber:        row.contactNumber!.trim(),
        contactEmail:         str(row.contactEmail),
        leadType:             str(row.leadType),
        leadRequest:          str(row.leadRequest),
        leadSource:           str(row.leadSource),
        communicationChannel: str(row.communicationChannel),
        marketingNotes:       str(row.marketingNotes),
        requestStatus:        str(row.requestStatus) ?? 'Unknown Status',
        salesResponse:        str(row.salesResponse),
        businessUnitId,
        createdById:          session.user.id,
        isImported:           true,
        sentToSales:          leadStatus === 'SENT_TO_SALES' || leadStatus === 'COMPLETED',
      })),
    })

    imported += chunk.length
  }

  return { imported, skipped: errors.length, errors }
}
