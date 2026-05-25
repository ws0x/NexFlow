import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { canViewMarketingFields, canViewSalesFields } from '@/lib/permissions'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import type { Role } from '@/generated/prisma/client'

const MAX_EXPORT = 10_000

// ── date → "dd/MM/yyyy" helper ────────────────────────────────────────────────
function fmtDate(d: Date | null | undefined): string {
  if (!d) return ''
  return format(new Date(d), 'dd/MM/yyyy')
}
function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return ''
  return format(new Date(d), 'dd/MM/yyyy HH:mm')
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

  const role = session.user.role as Role
  const sp   = req.nextUrl.searchParams

  // ── Build where clause (mirrors leads/page.tsx exactly) ──────────────────
  const where: any = {
    businessUnitId: { in: session.user.businessUnitIds },
  }

  if (role === 'SALES') {
    where.sentToSales = true
    if (session.user.departmentIds.length > 0) {
      where.directedToDeptId = { in: session.user.departmentIds }
    }
  }

  const q = sp.get('q')
  if (q) {
    where.OR = [
      { reqCode:       { contains: q, mode: 'insensitive' } },
      { companyName:   { contains: q, mode: 'insensitive' } },
      { contactName:   { contains: q, mode: 'insensitive' } },
      { contactNumber: { contains: q, mode: 'insensitive' } },
      { contactEmail:  { contains: q, mode: 'insensitive' } },
    ]
  }

  const buId = sp.get('buId')
  if (buId) where.businessUnitId = buId

  const status = sp.get('status')
  if (status) where.requestStatus = status

  const dateFrom = sp.get('dateFrom')
  const dateTo   = sp.get('dateTo')
  if (dateFrom || dateTo) {
    where.requestDate = {}
    if (dateFrom) where.requestDate.gte = new Date(dateFrom)
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      where.requestDate.lte = to
    }
  }

  const source   = sp.get('source')
  const leadType = sp.get('leadType')
  if (source)   where.leadSource = source
  if (leadType) where.leadType   = leadType

  if (sp.get('sentToSales') === 'true' && role !== 'SALES') where.sentToSales = true

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const leads = await db.lead.findMany({
    where,
    orderBy: { requestDate: 'desc' },
    take: MAX_EXPORT,
    select: {
      reqCode:              true,
      requestDate:          true,
      leadStatus:           true,
      companyName:          true,
      companyNameAr:        true,
      companyWebsite:       true,
      companyType:          true,
      companySector:        true,
      country:              true,
      city:                 true,
      location:             true,
      contactName:          true,
      contactNumber:        true,
      contactEmail:         true,
      leadType:             true,
      newClient:            true,
      internalReferral:     true,
      referralFrom:         true,
      sentToSales:          true,
      sentToSalesAt:        true,
      isImported:           true,
      requestStatus:        true,
      salesResponse:        true,
      salesResponseDate:    true,
      leadRequest:          true,
      leadSource:           true,
      communicationChannel: true,
      marketingNotes:       true,
      createdAt:            true,
      businessUnit:         { select: { name: true, prefix: true } },
      directedToDept:       { select: { name: true } },
      createdBy:            { select: { name: true } },
    },
  })

  const showMarketing = canViewMarketingFields(role)
  const showSales     = canViewSalesFields(role)

  // ── Build worksheet rows ─────────────────────────────────────────────────
  const rows = leads.map((l) => {
    const row: Record<string, string | number | boolean> = {
      'REQ Code':      l.reqCode,
      'Request Date':  fmtDate(l.requestDate),
      'Entity':        `${l.businessUnit.prefix} — ${l.businessUnit.name}`,
      'Company (EN)':  l.companyName,
      'Company (AR)':  l.companyNameAr        ?? '',
      'Company Type':  l.companyType          ?? '',
      'Sector':        l.companySector        ?? '',
      'Country':       l.country              ?? '',
      'City':          l.city                 ?? '',
      'Location':      l.location             ?? '',
      'Website':       l.companyWebsite       ?? '',
      'Contact Name':  l.contactName,
      'Contact No.':   l.contactNumber,
      'Contact Email': l.contactEmail         ?? '',
      'Lead Type':     l.leadType             ?? '',
      'New Client':    l.newClient ? 'Yes' : 'No',
      'Referral From': l.internalReferral ? (l.referralFrom ?? 'Internal') : '',
    }

    if (showMarketing) {
      row['Lead Source']      = l.leadSource           ?? ''
      row['Channel']          = l.communicationChannel ?? ''
      row['Directed To Dept'] = l.directedToDept?.name ?? ''
      row['Lead Request']     = l.leadRequest           ?? ''
      row['Marketing Notes']  = l.marketingNotes        ?? ''
    }

    if (showSales) {
      row['Request Status']      = l.requestStatus        ?? ''
      row['Sales Response']      = l.salesResponse        ?? ''
      row['Sales Response Date'] = fmtDate(l.salesResponseDate)
    }

    row['Lead Status']   = l.leadStatus
    row['Sent to Sales'] = l.sentToSales ? 'Yes' : 'No'
    row['Sent Date']     = fmtDate(l.sentToSalesAt)
    row['Imported']      = l.isImported  ? 'Yes' : 'No'
    row['Created By']    = l.createdBy.name
    row['Created At']    = fmtDateTime(l.createdAt)

    return row
  })

  // ── Build workbook ───────────────────────────────────────────────────────
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto column widths (max of header vs content, min 8, max 60)
  const headers = Object.keys(rows[0] ?? {})
  ws['!cols'] = headers.map((h) => ({
    wch: Math.min(
      60,
      Math.max(8, h.length, ...rows.map((r) => String(r[h] ?? '').length)),
    ),
  }))

  // Freeze the header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Leads')

  const dateStr  = format(new Date(), 'yyyy-MM-dd')
  const buSuffix = buId
    ? `-${leads[0]?.businessUnit?.prefix ?? buId}`
    : ''
  const filename = `nexflow-leads${buSuffix}-${dateStr}.xlsx`

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
