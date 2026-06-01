'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateReqCode } from '@/lib/req-code'
import { sendLeadToCoordinator, type LeadCardData } from '@/lib/whatsapp'
import {
  canCreateLead, canEditSalesFields, canSendToSales,
  canEditMutualFields, canEditMarketingFields,
  hasAccessToBusinessUnit, hasAccessToDepartment,
  stripLeadByRole, canDeleteLead,
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
  businessUnitId:       z.string().min(1, { error: 'Entity is required' }),
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

  // Normalise empty strings to undefined for all optional FK and string fields.
  // If left as '', Prisma will try to set FK columns to '' which violates constraints.
  function optStr(key: string) { return raw[key] ? raw[key] : undefined }

  const data = createLeadSchema.parse({
    ...raw,
    newClient:            raw.newClient === 'true',
    internalReferral:     raw.internalReferral === 'true',
    contactEmail:         optStr('contactEmail'),
    companyNameAr:        optStr('companyNameAr'),
    companyWebsite:       optStr('companyWebsite'),
    companyType:          optStr('companyType'),
    companySector:        optStr('companySector'),
    country:              optStr('country'),
    city:                 optStr('city'),
    location:             optStr('location'),
    leadType:             optStr('leadType'),
    referralFrom:         optStr('referralFrom'),
    leadRequest:          optStr('leadRequest'),
    leadSource:           optStr('leadSource'),
    communicationChannel: optStr('communicationChannel'),
    marketingNotes:       optStr('marketingNotes'),
    directedToDeptId:     optStr('directedToDeptId'),  // Critical: empty string → FK violation
  })

  if (!hasAccessToBusinessUnit(session.user, data.businessUnitId)) {
    throw new Error('No access to this entity')
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

  // ── Post-create side effects (non-blocking) ───────────────────────────────
  // We fire these after the redirect so the user isn't waiting on them.
  // Using void to avoid unhandled promise warnings.
  void (async () => {
    try {
      // 1. Fetch Entity details for WhatsApp + department name
      const bu = await db.businessUnit.findUnique({
        where:  { id: data.businessUnitId },
        select: { name: true, coordinatorPhone: true, coordinatorApiKey: true },
      })

      const dept = data.directedToDeptId
        ? await db.department.findUnique({
            where:  { id: data.directedToDeptId },
            select: { name: true },
          })
        : null

      // 2. WhatsApp to coordinator via CallMeBot (if configured)
      if (bu?.coordinatorPhone) {
        const cardData: LeadCardData = {
          reqCode,
          requestDate:      lead.requestDate,
          businessUnitName: bu.name,
          companyName:      data.companyName,
          companyType:      data.companyType,
          contactName:      data.contactName,
          contactNumber:    data.contactNumber,
          contactEmail:     data.contactEmail,
          country:          data.country,
          city:             data.city,
          companySector:    data.companySector,
          leadRequest:      data.leadRequest,
          leadSource:       data.leadSource,
          communicationChannel: data.communicationChannel,
          leadType:         data.leadType,
          directedToDeptName:   dept?.name,
          marketingNotes:   data.marketingNotes,
        }
        await sendLeadToCoordinator(bu.coordinatorPhone, cardData, bu.coordinatorApiKey)
      }

      // 3. In-app notifications for managers of this BU
      const managers = await db.user.findMany({
        where: {
          role:          { in: ['MANAGER', 'SUPER_ADMIN'] },
          businessUnits: { some: { businessUnitId: data.businessUnitId } },
          isActive:      true,
        },
        select: { id: true },
      })

      if (managers.length > 0) {
        await db.notification.createMany({
          data: managers.map((m: any) => ({
            userId:  m.id,
            leadId:  lead.id,
            type:    'LEAD_CREATED',
            title:   'New lead submitted',
            message: `${reqCode} — ${data.companyName} has been added`,
          })),
        })
      }
    } catch {
      // Side effects must never crash the main flow
    }
  })()

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

  const now = new Date()
  await db.lead.update({
    where: { id: leadId },
    data: { sentToSales: true, sentToSalesAt: now, leadStatus: 'SENT_TO_SALES' },
  })

  // Audit — track every send (not just the first)
  await db.leadHistory.create({
    data: {
      leadId,
      fieldName:   'sentToSales',
      oldValue:    lead.sentToSales ? lead.sentToSalesAt?.toISOString() ?? 'true' : 'false',
      newValue:    now.toISOString(),
      changedById: session.user.id,
    },
  })

  // Notify managers of this Entity
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
    // Load card template: entity-specific first, then global fallback
    const [entityTemplate, globalTemplate] = await Promise.all([
      db.leadCardTemplate.findUnique({ where: { entityScope: lead.businessUnitId } }),
      db.leadCardTemplate.findUnique({ where: { entityScope: 'GLOBAL' } }),
    ])
    const cardConfig = (entityTemplate ?? globalTemplate)?.fieldConfig as any ?? null

    const result = await sendLeadToCoordinator(
      lead.businessUnit.coordinatorPhone,
      {
        reqCode:             lead.reqCode,
        requestDate:         lead.requestDate,
        businessUnitName:    lead.businessUnit.name,
        companyName:         lead.companyName,
        companyType:         lead.companyType,
        contactName:         lead.contactName,
        contactNumber:       lead.contactNumber,
        contactEmail:        lead.contactEmail,
        country:             lead.country,
        city:                lead.city,
        companySector:       lead.companySector,
        leadRequest:         lead.leadRequest,
        leadSource:          lead.leadSource,
        communicationChannel: lead.communicationChannel,
        leadType:            lead.leadType,
        directedToDeptName:  lead.directedToDept?.name,
        marketingNotes:      lead.marketingNotes,
        companyWebsite:      lead.companyWebsite,
        referralFrom:        lead.referralFrom,
      },
      lead.businessUnit.coordinatorApiKey,
      cardConfig,
    )
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

// ─── Update Lead Fields (Marketing / Admin) ──────────────────────────────────

export async function updateLeadFields(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  const role = session.user.role as Role
  if (!canEditMutualFields(role)) throw new Error('Forbidden')

  const leadId = formData.get('leadId') as string | null
  if (!leadId) throw new Error('Lead ID required')

  const current = await db.lead.findUnique({
    where:  { id: leadId },
    select: {
      businessUnitId:       true,
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
      leadRequest:          true,
      leadSource:           true,
      communicationChannel: true,
      marketingNotes:       true,
    },
  })

  if (!current) throw new Error('Lead not found')
  if (!hasAccessToBusinessUnit(session.user, current.businessUnitId)) throw new Error('Forbidden')

  // Helper: read a string field from formData (undefined → skip; '' → null)
  function fStr(key: string): string | null | undefined {
    if (!formData.has(key)) return undefined
    const v = (formData.get(key) as string).trim()
    return v || null
  }

  const updateData: Record<string, any>              = {}
  const auditEntries: { fieldName: string; oldValue: string | null; newValue: string | null }[] = []

  function maybeSet(field: string, newVal: string | null | undefined) {
    if (newVal === undefined) return
    const oldVal = (current as any)[field] ?? null
    if (newVal !== oldVal) {
      updateData[field] = newVal
      auditEntries.push({ fieldName: field, oldValue: oldVal, newValue: newVal })
    }
  }

  // Mutual fields (MARKETING + SUPER_ADMIN)
  maybeSet('companyName',    fStr('companyName'))
  maybeSet('companyNameAr',  fStr('companyNameAr'))
  maybeSet('companyWebsite', fStr('companyWebsite'))
  maybeSet('companyType',    fStr('companyType'))
  maybeSet('companySector',  fStr('companySector'))
  maybeSet('country',        fStr('country'))
  maybeSet('city',           fStr('city'))
  maybeSet('location',       fStr('location'))
  maybeSet('contactName',    fStr('contactName'))
  maybeSet('contactNumber',  fStr('contactNumber'))
  maybeSet('contactEmail',   fStr('contactEmail'))
  maybeSet('leadType',       fStr('leadType'))

  // Marketing-only fields
  if (canEditMarketingFields(role)) {
    maybeSet('leadRequest',          fStr('leadRequest'))
    maybeSet('leadSource',           fStr('leadSource'))
    maybeSet('communicationChannel', fStr('communicationChannel'))
    maybeSet('marketingNotes',       fStr('marketingNotes'))
  }

  if (Object.keys(updateData).length === 0) return // nothing changed

  await db.lead.update({ where: { id: leadId }, data: updateData })

  if (auditEntries.length > 0) {
    await db.leadHistory.createMany({
      data: auditEntries.map((e) => ({
        leadId,
        changedById: session.user.id,
        ...e,
      })),
    })
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

// ─── Delete Lead (SUPER_ADMIN only) ──────────────────────────────────────────

export async function deleteLead(leadId: string) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  if (!canDeleteLead(session.user.role as Role)) throw new Error('Forbidden')

  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true } })
  if (!lead) throw new Error('Lead not found')

  await db.leadHistory.deleteMany({ where: { leadId } })
  await db.notification.deleteMany({ where: { leadId } })
  await db.lead.delete({ where: { id: leadId } })

  revalidatePath('/leads')
  redirect('/leads')
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
    // Entity scope
    businessUnitId: {
      in: filters?.businessUnitId
        ? [filters.businessUnitId]
        : businessUnitIds,
    },
  }

  // Sales: always need sentToSales=true.
  // If departments are assigned, include leads directed to those departments OR leads
  // with no directed department (NULL). SQL IN never matches NULL so we must do OR explicitly.
  if (role === 'SALES') {
    where.sentToSales = true
    if (departmentIds.length > 0) {
      if (!where.AND) where.AND = []
      where.AND.push({
        OR: [
          { directedToDeptId: { in: departmentIds } },
          { directedToDeptId: null },
        ],
      })
    }
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
