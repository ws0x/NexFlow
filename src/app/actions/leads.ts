'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateReqCode } from '@/lib/req-code'
import { sendLeadToCoordinator } from '@/lib/whatsapp'
import {
  canCreateLead, canEditSalesFields, canSendToSales,
  hasAccessToBusinessUnit, hasAccessToDepartment,
  stripLeadByRole,
} from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import * as z from 'zod'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createLeadSchema = z.object({
  // Mutual
  companyName:      z.string().min(1, { error: 'Company name is required' }),
  companyNameAr:    z.string().optional(),
  companyWebsite:   z.string().optional(),
  companyType:      z.string().optional(),
  companySector:    z.string().optional(),
  country:          z.string().optional(),
  city:             z.string().optional(),
  location:         z.string().optional(),
  contactName:      z.string().min(1, { error: 'Contact name is required' }),
  contactNumber:    z.string().min(1, { error: 'Contact number is required' }),
  contactEmail:     z.email().optional().or(z.literal('')),
  leadType:         z.string().optional(),
  newClient:        z.boolean().default(true),
  internalReferral: z.boolean().default(false),
  referralFrom:     z.string().optional(),
  // Marketing
  leadRequest:          z.string().optional(),
  leadSource:           z.string().optional(),
  communicationChannel: z.string().optional(),
  marketingNotes:       z.string().optional(),
  directedToDeptId:     z.string().optional(),
  businessUnitId:       z.string().min(1, { error: 'Business unit is required' }),
})

const updateSalesFieldsSchema = z.object({
  leadId:           z.string(),
  salesResponse:    z.string().optional(),
  salesResponseDate:z.string().optional(),
  requestStatus:    z.string(),
})

// ─── Create Lead (Marketing) ──────────────────────────────────────────────────

export async function createLead(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  if (!canCreateLead(session.user.role as Role)) throw new Error('Forbidden')

  const raw = Object.fromEntries(formData.entries())
  const data = createLeadSchema.parse({
    ...raw,
    newClient:        raw.newClient === 'true',
    internalReferral: raw.internalReferral === 'true',
    contactEmail:     raw.contactEmail || undefined,
  })

  if (!hasAccessToBusinessUnit(session.user, data.businessUnitId)) {
    throw new Error('No access to this business unit')
  }

  const reqCode = await generateReqCode(data.businessUnitId)

  const lead = await db.lead.create({
    data: {
      reqCode,
      leadStatus: 'SUBMITTED',
      ...data,
      createdById: session.user.id,
    },
  })

  // Audit trail entry
  await db.leadHistory.create({
    data: {
      leadId:      lead.id,
      fieldName:   'lead_created',
      oldValue:    null,
      newValue:    reqCode,
      changedById: session.user.id,
    },
  })

  revalidatePath('/leads')
  redirect(`/leads/${lead.id}?created=1`)
}

// ─── Send to Sales (Marketing) ───────────────────────────────────────────────

export async function sendLeadToSales(leadId: string): Promise<{ waUrl: string }> {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  if (!canSendToSales(session.user.role as Role)) throw new Error('Forbidden')

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      businessUnit:    true,
      directedToDept:  true,
      createdBy:       true,
    },
  })

  if (!lead) throw new Error('Lead not found')
  if (!hasAccessToBusinessUnit(session.user, lead.businessUnitId)) throw new Error('Forbidden')
  if (lead.sentToSales) throw new Error('Already sent to sales')

  await db.lead.update({
    where: { id: leadId },
    data: { sentToSales: true, sentToSalesAt: new Date(), leadStatus: 'SENT_TO_SALES' },
  })

  // Audit
  await db.leadHistory.create({
    data: {
      leadId,
      fieldName:   'sentToSales',
      oldValue:    'false',
      newValue:    'true',
      changedById: session.user.id,
    },
  })

  // Notify managers of this BU
  const managers = await db.user.findMany({
    where: {
      role: { in: ['MANAGER', 'SUPER_ADMIN'] },
      businessUnits: { some: { businessUnitId: lead.businessUnitId } },
      isActive: true,
    },
  })

  if (managers.length > 0) {
    await db.notification.createMany({
      data: managers.map((m: any) => ({
        userId:  m.id,
        leadId:  leadId,
        type:    'LEAD_SENT',
        title:   `Lead sent to sales`,
        message: `${lead.reqCode} — ${lead.companyName} has been forwarded to ${lead.directedToDept?.name ?? 'Sales'}`,
      })),
    })
  }

  // Generate WhatsApp card link
  let waUrl = ''
  if (lead.businessUnit.coordinatorPhone) {
    const result = await sendLeadToCoordinator(lead.businessUnit.coordinatorPhone, {
      reqCode:          lead.reqCode,
      requestDate:      lead.requestDate,
      businessUnitName: lead.businessUnit.name,
      companyName:      lead.companyName,
      companyType:      lead.companyType,
      contactName:      lead.contactName,
      contactNumber:    lead.contactNumber,
      contactEmail:     lead.contactEmail,
      country:          lead.country,
      city:             lead.city,
      companySector:    lead.companySector,
      leadRequest:      lead.leadRequest,
      leadSource:       lead.leadSource,
      communicationChannel: lead.communicationChannel,
      leadType:         lead.leadType,
      directedToDeptName:   lead.directedToDept?.name,
      marketingNotes:   lead.marketingNotes,
    })
    waUrl = result.url
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
  return { waUrl }
}

// ─── Update Sales Fields (Sales) ─────────────────────────────────────────────

export async function updateSalesFields(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  if (!canEditSalesFields(session.user.role as Role)) throw new Error('Forbidden')

  const raw = Object.fromEntries(formData.entries())
  const data = updateSalesFieldsSchema.parse(raw)

  const lead = await db.lead.findUnique({
    where: { id: data.leadId },
    select: {
      businessUnitId: true,
      directedToDeptId: true,
      salesResponse: true,
      salesResponseDate: true,
      requestStatus: true,
      sentToSales: true,
      createdById: true,
    },
  })

  if (!lead) throw new Error('Lead not found')
  if (!lead.sentToSales) throw new Error('Lead not yet sent to sales')
  if (!hasAccessToBusinessUnit(session.user, lead.businessUnitId)) throw new Error('Forbidden')
  if (!hasAccessToDepartment(session.user, lead.directedToDeptId)) throw new Error('Forbidden')

  const updatedLead = await db.lead.update({
    where: { id: data.leadId },
    data: {
      salesResponse:     data.salesResponse || null,
      salesResponseDate: data.salesResponseDate ? new Date(data.salesResponseDate) : null,
      requestStatus:     data.requestStatus,
      leadStatus:        'COMPLETED',
    },
  })

  // Audit entries for changed fields
  const auditEntries = []
  if (data.requestStatus !== lead.requestStatus) {
    auditEntries.push({ fieldName: 'requestStatus', oldValue: lead.requestStatus, newValue: data.requestStatus })
  }
  if (data.salesResponse !== (lead.salesResponse ?? '')) {
    auditEntries.push({ fieldName: 'salesResponse', oldValue: lead.salesResponse ?? null, newValue: data.salesResponse ?? null })
  }

  if (auditEntries.length > 0) {
    await db.leadHistory.createMany({
      data: auditEntries.map((e) => ({
        leadId:      data.leadId,
        changedById: session.user.id,
        ...e,
      })),
    })
  }

  // Notify original marketing user + managers
  const notifyUserIds = new Set<string>([lead.createdById])
  const managers = await db.user.findMany({
    where: {
      role: { in: ['MANAGER', 'SUPER_ADMIN'] },
      businessUnits: { some: { businessUnitId: lead.businessUnitId } },
      isActive: true,
    },
    select: { id: true },
  })
  managers.forEach((m: any) => notifyUserIds.add(m.id))

  await db.notification.createMany({
    data: [...notifyUserIds].map((userId) => ({
      userId,
      leadId:  data.leadId,
      type:    'LEAD_COMPLETED',
      title:   'Sales update received',
      message: `Lead has been updated to: ${data.requestStatus}`,
    })),
  })

  revalidatePath('/leads')
  revalidatePath(`/leads/${data.leadId}`)
}

// ─── Fetch leads (list) ───────────────────────────────────────────────────────

export async function getLeads(filters?: {
  businessUnitId?: string
  status?: string
  reqCode?: string
  page?: number
  pageSize?: number
}) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = session.user.role as Role
  const { businessUnitIds, departmentIds } = session.user

  const page     = filters?.page     ?? 1
  const pageSize = filters?.pageSize ?? 25
  const skip     = (page - 1) * pageSize

  const where: any = {
    // BU scope
    businessUnitId: {
      in: filters?.businessUnitId
        ? [filters.businessUnitId]
        : businessUnitIds,
    },
  }

  // Sales can only see leads directed to their departments
  if (role === 'SALES') {
    where.directedToDeptId = { in: departmentIds }
    where.sentToSales = true
  }

  if (filters?.status) where.requestStatus = filters.status
  if (filters?.reqCode) where.reqCode = { contains: filters.reqCode, mode: 'insensitive' }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        businessUnit:   { select: { name: true, prefix: true } },
        directedToDept: { select: { name: true } },
        createdBy:      { select: { name: true } },
      },
    }),
    db.lead.count({ where }),
  ])

  // Strip fields by role
  const stripped = leads.map((lead: any) => stripLeadByRole(lead, role))

  return { leads: stripped, total, page, pageSize }
}

// ─── Fetch single lead ────────────────────────────────────────────────────────

export async function getLead(id: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = session.user.role as Role

  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      businessUnit:   true,
      directedToDept: true,
      createdBy:      { select: { name: true, email: true } },
      history: {
        include: { changedBy: { select: { name: true, role: true } } },
        orderBy: { changedAt: 'desc' },
      },
    },
  })

  if (!lead) return null
  if (!hasAccessToBusinessUnit(session.user, lead.businessUnitId)) return null
  if (role === 'SALES') {
    if (!lead.sentToSales) return null
    if (!hasAccessToDepartment(session.user, lead.directedToDeptId)) return null
  }

  return stripLeadByRole(lead, role)
}
