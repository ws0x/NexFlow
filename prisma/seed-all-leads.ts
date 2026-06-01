/**
 * Full leads re-seed from the 3 Excel files (HSL, MGL, MKL).
 * Clears ALL leads first, then seeds all entities.
 *
 * HSL REQUESTED CATEGORY:
 *   Conveyors / Conveyors Components / Agri Stations → routed to HCL entity
 *   (No separate HCL file — HCL leads live in the HSL spreadsheet)
 *
 * Run: npx tsx prisma/seed-all-leads.ts
 */

import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import * as XLSX from 'xlsx'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter } as any)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function excelDateToJS(v: unknown): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  if (typeof v === 'number' && v > 25000 && v < 100000)
    return new Date(Math.round((v - 25569) * 86400 * 1000))
  if (typeof v === 'string' && v.trim()) {
    const d = new Date(v.trim())
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function str(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s || ['n/a', 'n.a.', 'none', '-', '_', ''].includes(s.toLowerCase())) return null
  return s
}

function note(v: unknown): string | null {
  const s = String(v ?? '').trim()
  return s || null
}

function isArabic(s: string): boolean {
  return /[؀-ۿ]/.test(s)
}

function isMeaningful(status: string | null | undefined): boolean {
  if (!status) return false
  return status !== 'Unknown Status'
}

function normalizeLeadType(v: unknown): string | null {
  const s = String(v ?? '').trim()
  const low = s.toLowerCase()
  if (low === 'client')   return 'Client'
  if (low === 'supplier') return 'Supplier'
  if (low === 'others')   return 'Others'
  return s || null
}

// ─── REQ code counter per BU/date ─────────────────────────────────────────────

const seqMap = new Map<string, number>()

function buildCode(prefix: string, date: Date, seq: number): string {
  const year  = String(date.getFullYear()).slice(-1)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day   = String(date.getDate()).padStart(2, '0')
  return `${prefix}${year}${month}${day}${String(seq).padStart(4, '0')}`
}

function nextCode(prefix: string, buId: string, date: Date): string {
  const month   = String(date.getMonth() + 1).padStart(2, '0')
  const day     = String(date.getDate()).padStart(2, '0')
  const dateKey = `${date.getFullYear()}${month}${day}`
  const mapKey  = `${buId}|${dateKey}`
  const seq     = (seqMap.get(mapKey) ?? 0) + 1
  seqMap.set(mapKey, seq)
  return buildCode(prefix, date, seq)
}

// ─── Status normalisation ──────────────────────────────────────────────────────
// "Official Quoting" and "Indicative Quoting" are kept as DISTINCT options.
// No mapping — they will be added to the REQUEST_STATUS dropdown.

const ARABIC_OR_TRASH_STATUSES = new Set(['Unknown Status', ''])

// ─── Source normalisation ──────────────────────────────────────────────────────

// MGL: normalize to closest global standard
const MGL_SOURCE_MAP: Record<string, string | null> = {
  'Unknown':             null,
  'Website':             'Makka Corp Website',
  'Youtube':             'YouTube',
  'WhatsApp Campaign':   'WhatsApp',
  'Direct Email':        'Mail Info',
  'Current Client':      'Referral',
  'Facebook Campaign':   'Facebook Ads',
  // Keep as-is (will be added as MGL-specific options):
  // 'Instagram', 'Referral', 'Poultry Number - 334', 'Handling Number - 711'
}

// Sources that are non-standard and go as MGL entity-specific options
const MGL_SPECIFIC_SOURCES = new Set([
  'Instagram',
  'Referral',
  'Poultry Number - 334',
  'Handling Number - 711',
])

function normalizeMGLSource(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  if (s in MGL_SOURCE_MAP) return MGL_SOURCE_MAP[s]
  return s  // keep as-is (Instagram, Referral, Poultry Number, etc.)
}

// MKL: Tiktok → TikTok only
const MKL_SOURCE_MAP: Record<string, string> = { 'Tiktok': 'TikTok' }
function normalizeMKLSource(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  return MKL_SOURCE_MAP[s] ?? s
}

// ─── Company type normalisation ────────────────────────────────────────────────

const VALID_COMPANY_TYPES = new Set([
  'Procurement Company', 'Factory', 'Commercial Company', 'Shop', 'Others',
])

function normalizeCompanyType(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s || s === '_') return 'Others'
  if (VALID_COMPANY_TYPES.has(s)) return s
  // Garbage values → Others
  const low = s.toLowerCase()
  if (['private work', 'for warehouse use.', 'for warehouse use'].includes(low)) return 'Others'
  return s
}

// ─── Sector normalisation for MKL (map non-standard to closest standard) ──────

const STANDARD_SECTORS = new Set([
  'Automotive & Transportation', 'Chemical Industry', 'Construction',
  'Electronics & Electrical', 'Energy & Utilities', 'Environmental & Waste Management',
  'Food & Beverage', 'Healthcare Manufacturing', 'Industrial Equipment',
  'Logistics & Material Handling', 'Manufacturing', 'Mining & Metals',
  'Packaging Industry', 'Pharmaceutical', 'Textile & Apparel',
])

const MKL_SECTOR_MAP: Record<string, string | null> = {
  'Plastics':            'Packaging Industry',
  'Charity':             null,
  'Printings':           'Packaging Industry',
  'Government affairs':  null,
  'pharmaceutical':      'Pharmaceutical',
  'transporting':        'Logistics & Material Handling',
  'Home appliance':      'Electronics & Electrical',
  'Agriculture':         'Food & Beverage',
  'For personal use':    null,
  'for warehouse use.':  'Logistics & Material Handling',
  'Private work':        null,
}

function normalizeMKLSector(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  if (STANDARD_SECTORS.has(s)) return s
  if (s in MKL_SECTOR_MAP) return MKL_SECTOR_MAP[s]
  return s
}

// ─── HCL categories in HSL file ────────────────────────────────────────────────
// HSL REQUESTED CATEGORY values that should route to HCL entity
const HCL_CATEGORIES = new Set(['Conveyors', 'Conveyors Components', 'Agri Stations'])

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Full leads re-seed starting...\n')

  const [hsl, mgl, mkl, hcl] = await Promise.all([
    db.businessUnit.findUniqueOrThrow({ where: { prefix: 'HSL' } }),
    db.businessUnit.findUniqueOrThrow({ where: { prefix: 'MGL' } }),
    db.businessUnit.findUniqueOrThrow({ where: { prefix: 'MKL' } }),
    db.businessUnit.findUniqueOrThrow({ where: { prefix: 'HCL' } }),
  ])

  const admin = await db.user.findUniqueOrThrow({ where: { email: 'admin@nexflow.com' } })
  const adminId = admin.id

  const deptRows = await db.department.findMany({ select: { id: true, name: true } })
  const deptByName = Object.fromEntries(deptRows.map((d: any) => [d.name, d.id]))

  // ── 1. Add new global dropdown options ──────────────────────────────────────
  console.log('📋 Adding new global dropdown options...')

  const newStatuses = ['Indicative Quoting', 'Official Quoting']
  const existingStatuses = await db.dropdownOption.findMany({
    where: { category: 'REQUEST_STATUS', entityScope: 'GLOBAL' },
    select: { value: true, order: true },
  })
  const maxStatusOrder = Math.max(...existingStatuses.map((s: any) => s.order), 0)
  const existingStatusValues = new Set(existingStatuses.map((s: any) => s.value))

  for (let i = 0; i < newStatuses.length; i++) {
    const value = newStatuses[i]
    if (!existingStatusValues.has(value)) {
      await db.dropdownOption.create({
        data: { category: 'REQUEST_STATUS', value, order: maxStatusOrder + i + 1, entityScope: 'GLOBAL' },
      })
      console.log(`   + REQUEST_STATUS: "${value}"`)
    }
  }

  // Add 'Others' to COMPANY_TYPE if not present
  const othersExists = await db.dropdownOption.findFirst({
    where: { category: 'COMPANY_TYPE', value: 'Others', entityScope: 'GLOBAL' },
  })
  if (!othersExists) {
    const maxTypeOrder = await db.dropdownOption.aggregate({
      where: { category: 'COMPANY_TYPE', entityScope: 'GLOBAL' },
      _max: { order: true },
    })
    await db.dropdownOption.create({
      data: { category: 'COMPANY_TYPE', value: 'Others', order: (maxTypeOrder._max.order ?? 3) + 1, entityScope: 'GLOBAL' },
    })
    console.log('   + COMPANY_TYPE: "Others"')
  }

  // Add 'Referral' to LEAD_SOURCE globally
  const referralExists = await db.dropdownOption.findFirst({
    where: { category: 'LEAD_SOURCE', value: 'Referral', entityScope: 'GLOBAL' },
  })
  if (!referralExists) {
    const maxSrcOrder = await db.dropdownOption.aggregate({
      where: { category: 'LEAD_SOURCE', entityScope: 'GLOBAL' },
      _max: { order: true },
    })
    await db.dropdownOption.create({
      data: { category: 'LEAD_SOURCE', value: 'Referral', order: (maxSrcOrder._max.order ?? 8) + 1, entityScope: 'GLOBAL' },
    })
    console.log('   + LEAD_SOURCE: "Referral" (global)')
  }

  // MGL entity-specific sources
  const mglSpecificSources = ['Instagram', 'Poultry Number - 334', 'Handling Number - 711']
  for (let i = 0; i < mglSpecificSources.length; i++) {
    await db.dropdownOption.upsert({
      where: { category_value_entityScope: { category: 'LEAD_SOURCE', value: mglSpecificSources[i], entityScope: mgl.id } },
      update: {},
      create: { category: 'LEAD_SOURCE', value: mglSpecificSources[i], order: 200 + i, entityScope: mgl.id, businessUnitId: mgl.id },
    })
    console.log(`   + LEAD_SOURCE (MGL): "${mglSpecificSources[i]}"`)
  }

  // ── 2. Delete ALL existing leads ─────────────────────────────────────────────
  console.log('\n🗑️  Removing all existing leads...')
  await db.notification.deleteMany({})
  const deleted = await db.lead.deleteMany({})
  await db.leadSequence.deleteMany({})
  console.log(`   Deleted ${deleted.count} leads\n`)

  // ─────────────────────────────────────────────────────────────────────────────
  // HSL + HCL (from the same Handling Excel file)
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('📂 Parsing HSL/HCL (Handling) file...')
  const wbH = XLSX.readFile(
    'H:/Shared drives/MARKETING/03. LEADS FOLLOW UP/A. LEADS DATABASES/HANDLING DIGITAL MARKETIING LEADS DATABASE - V3.xlsx',
    { cellDates: true },
  )
  const wsH = wbH.Sheets['LEADS DATABASE']
  const allH = XLSX.utils.sheet_to_json<unknown[]>(wsH, { header: 1, defval: '' })

  // Detect header row (row where col0 is "#")
  let hslHeaderIdx = 1
  for (let i = 0; i < Math.min(6, allH.length); i++) {
    if (String((allH[i] as any)[0]).trim() === '#') { hslHeaderIdx = i; break }
  }
  const dataH = (allH.slice(hslHeaderIdx + 1) as unknown[][]).filter(r => r.some(c => c !== ''))
  console.log(`   ${dataH.length} total data rows`)

  // Column layout (0-indexed from header):
  // 0:# 1:REQ CODE 2:REQUEST DATE 3:COMPANY NAME 4:COMPANY NAME AR
  // 5:COMPANY WEBSITE 6:COMPANY TYPE 7:COMPANY SECTOR 8:COUNTRY 9:CITY
  // 10:STATE 11:LOCATION 12:CONTACT NAME 13:CONTACT NUMBER 14:CONTACT EMAIL
  // 15:LEAD REQUEST 16:REQUESTED CATEGORY 17:LEAD TYPE 18:LEAD SOURCE
  // 19:COMMUNICATION CHANNEL 20:MARKETING TEAM NOTES 21:SENT TO SALES
  // 22:REQUEST STATUS 23:NEW CLIENT

  const hslLeads: object[] = []
  const hclLeads: object[] = []

  for (const r of dataH) {
    const requestDate = excelDateToJS(r[2]) ?? new Date()

    const rawStatus = str(r[22])
    // Normalise only Arabic/garbage; keep Official Quoting as-is
    let requestStatus = rawStatus ?? 'Unknown Status'
    if (requestStatus && isArabic(requestStatus)) requestStatus = 'Unknown Status'

    const category = str(r[16]) // REQUESTED CATEGORY
    const isHCL    = category !== null && HCL_CATEGORIES.has(category)
    const bu       = isHCL ? hcl : hsl

    const reqCode = nextCode(bu.prefix, bu.id, requestDate)

    const rawRequest = note(r[15])
    const leadRequest = [
      rawRequest,
      category ? `[Product: ${category}]` : null,
    ].filter(Boolean).join('\n') || null

    const englishName = String(r[3] ?? '').trim()
    const arabicName  = String(r[4] ?? '').trim()
    const companyName = englishName || arabicName || '[No Company]'
    const companyNameAr = (englishName && arabicName) ? arabicName : null

    const sentToSales = isMeaningful(requestStatus)

    const row: object = {
      reqCode,
      leadStatus:           sentToSales ? 'COMPLETED' : 'SUBMITTED',
      requestDate,
      companyName,
      companyNameAr,
      companyWebsite:       str(r[5]),
      companyType:          normalizeCompanyType(r[6]),
      companySector:        str(r[7]),
      country:              str(r[8]),
      city:                 str(r[9]) ?? str(r[10]),  // city or state
      location:             str(r[11]),
      contactName:          String(r[12] ?? '').trim() || '[No Contact]',
      contactNumber:        String(r[13] ?? '').trim() || '[No Number]',
      contactEmail:         str(r[14]),
      leadRequest,
      leadType:             normalizeLeadType(r[17]),
      leadSource:           str(r[18]),
      communicationChannel: str(r[19]),
      marketingNotes:       note(r[20]),
      directedToDeptId:     null,
      sentToSales,
      sentToSalesAt:        sentToSales ? requestDate : null,
      salesResponse:        null,
      salesResponseDate:    null,
      requestStatus,
      newClient:            String(r[23] ?? '').trim().toLowerCase() !== 'no',
      internalReferral:     false,
      referralFrom:         null,
      businessUnitId:       bu.id,
      createdById:          adminId,
      isImported:           true,
    }

    if (isHCL) hclLeads.push(row)
    else hslLeads.push(row)
  }

  console.log(`   HSL: ${hslLeads.length} leads | HCL: ${hclLeads.length} leads`)

  const CHUNK = 100
  let inserted = 0

  process.stdout.write('   Inserting HSL... ')
  for (let i = 0; i < hslLeads.length; i += CHUNK) {
    await db.lead.createMany({ data: hslLeads.slice(i, i + CHUNK) as any[] })
    inserted += Math.min(CHUNK, hslLeads.length - i)
    process.stdout.write(`\r   Inserting HSL... ${inserted}/${hslLeads.length}`)
  }
  console.log(' ✅')

  inserted = 0
  process.stdout.write('   Inserting HCL... ')
  for (let i = 0; i < hclLeads.length; i += CHUNK) {
    await db.lead.createMany({ data: hclLeads.slice(i, i + CHUNK) as any[] })
    inserted += Math.min(CHUNK, hclLeads.length - i)
    process.stdout.write(`\r   Inserting HCL... ${inserted}/${hclLeads.length}`)
  }
  console.log(' ✅')

  // ─────────────────────────────────────────────────────────────────────────────
  // MGL (Poultry)
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n📂 Parsing MGL (Poultry) file...')
  const wbM = XLSX.readFile(
    'H:/Shared drives/MARKETING/03. LEADS FOLLOW UP/A. LEADS DATABASES/MIG DIGITAL MARKETING LEADS DATABASE - V9.xlsx',
    { cellDates: true },
  )
  const wsM = wbM.Sheets['MIG LEADS DATABASE']
  const allM = XLSX.utils.sheet_to_json<unknown[]>(wsM, { header: 1, defval: '' })

  let mglHeaderIdx = 1
  for (let i = 0; i < Math.min(6, allM.length); i++) {
    if (String((allM[i] as any)[0]).trim() === '#') { mglHeaderIdx = i; break }
  }
  const dataM = (allM.slice(mglHeaderIdx + 1) as unknown[][]).filter(r => r.some(c => c !== ''))
  console.log(`   ${dataM.length} data rows`)

  // Column layout:
  // 0:# 1:REQ CODE 2:REQUEST DATE 3:COMPANY NAME 4:CONTACT NAME 5:CONTACT NUMBER
  // 6:CONTACT EMAIL 7:COMPANY WEBSITE 8:COUNTRY 9:LOCATION 10:CONTACT TYPE
  // 11:CLIENT TYPE 12:LEAD REQUEST 13:REQUESTED PRODUCT CATEGORY 14:REQUESTED PRODUCT
  // 15:QUANTITY 16:CAPACITY RANGE 17:LICENSE 18:LEAD SOURCE 19:COMMUNICATION CHANNEL
  // 20:RESPONSE 21:REQUEST STATUS 22:CLIENT STATUS 23:PROJECT STATUS

  const mglLeads: object[] = []

  for (const r of dataM) {
    const requestDate = excelDateToJS(r[2]) ?? new Date()
    const reqCode     = nextCode(mgl.prefix, mgl.id, requestDate)

    const rawStatus     = str(r[21])
    let requestStatus   = rawStatus ?? 'Unknown Status'
    if (requestStatus && isArabic(requestStatus)) requestStatus = 'Unknown Status'

    const salesResponse = str(r[20])
    const sentToSales   = isMeaningful(requestStatus) || !!salesResponse

    const leadSource = normalizeMGLSource(r[18])

    // Build lead request from base + product details
    const leadReqBase = note(r[12])
    const prodCat     = str(r[13])
    const product     = str(r[14])
    const qty         = str(r[15])
    const capacity    = str(r[16])
    const extras      = [
      prodCat  ? `[Category: ${prodCat}]` : null,
      product  ? `[Product: ${product}]` : null,
      qty      ? `[Qty: ${qty}]` : null,
      capacity ? `[Capacity: ${capacity} birds/hr]` : null,
    ].filter(Boolean).join('  ')
    const leadRequest = [leadReqBase, extras || null].filter(Boolean).join('\n') || null

    const clientStatus = str(r[22])
    const newClient    = !clientStatus || clientStatus.toLowerCase() === 'new client'

    mglLeads.push({
      reqCode,
      leadStatus:           sentToSales ? 'COMPLETED' : 'SUBMITTED',
      requestDate,
      companyName:          String(r[3] ?? '').trim() || '[No Company]',
      companyNameAr:        null,
      companyWebsite:       str(r[7]),
      companyType:          null,
      companySector:        null,
      country:              str(r[8]),
      city:                 null,
      location:             str(r[9]),
      contactName:          String(r[4] ?? '').trim() || '[No Contact]',
      contactNumber:        String(r[5] ?? '').trim() || '[No Number]',
      contactEmail:         str(r[6]),
      leadRequest,
      leadType:             normalizeLeadType(r[10]),
      leadSource,
      communicationChannel: str(r[19]),
      marketingNotes:       null,
      directedToDeptId:     null,
      sentToSales,
      sentToSalesAt:        sentToSales ? requestDate : null,
      salesResponse,
      salesResponseDate:    null,
      requestStatus,
      newClient,
      internalReferral:     false,
      referralFrom:         null,
      businessUnitId:       mgl.id,
      createdById:          adminId,
      isImported:           true,
    })
  }

  console.log(`   Inserting ${mglLeads.length} MGL leads...`)
  inserted = 0
  for (let i = 0; i < mglLeads.length; i += CHUNK) {
    await db.lead.createMany({ data: mglLeads.slice(i, i + CHUNK) as any[] })
    inserted += Math.min(CHUNK, mglLeads.length - i)
    process.stdout.write(`\r   ${inserted}/${mglLeads.length}`)
  }
  console.log(' ✅')

  // ─────────────────────────────────────────────────────────────────────────────
  // MKL (EPPS / Makka)
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n📂 Parsing MKL (EPPS/Makka) file...')
  const wbK = XLSX.readFile(
    'H:/Shared drives/MARKETING/03. LEADS FOLLOW UP/A. LEADS DATABASES/MAKKA DIGITAL MARKETIING LEADS DATABASE - V8.xlsx',
    { cellDates: true },
  )
  const wsK = wbK.Sheets['LEADS DATABASE']
  const allK = XLSX.utils.sheet_to_json<unknown[]>(wsK, { header: 1, defval: '' })

  let mklHeaderIdx = 0
  for (let i = 0; i < Math.min(6, allK.length); i++) {
    if (String((allK[i] as any)[0]).trim() === '#') { mklHeaderIdx = i; break }
  }
  const dataK = (allK.slice(mklHeaderIdx + 1) as unknown[][]).filter(r => r.some(c => c !== ''))
  console.log(`   ${dataK.length} data rows`)

  // Column layout:
  // 0:# 1:REQ CODE 2:REQUEST DATE 3:COMPANY NAME 4:COMPANY NAME AR
  // 5:COMPANY WEBSITE 6:COMPANY TYPE 7:COMPANY SECTOR 8:COUNTRY 9:CITY
  // 10:LOCATION 11:CONTACT NAME 12:CONTACT NUMBER 13:CONTACT EMAIL
  // 14:LEAD REQUEST 15:LEAD TYPE 16:LEAD SOURCE 17:COMMUNICATION CHANNEL
  // 18:LEAD SHOULD BE DIRECTED TO 19:MARKETING TEAM NOTES 20:SENT TO SALES
  // 21:SALES RESPONSE 22:SALES RESPONSE DATE 23:REQUEST STATUS
  // 24:NEW CLIENT 25:INTERNAL REFERRAL 26:REFERRAL FROM

  const mklLeads: object[] = []
  let arabicFixed = 0

  for (const r of dataK) {
    const requestDate = excelDateToJS(r[2]) ?? new Date()
    const reqCode     = nextCode(mkl.prefix, mkl.id, requestDate)

    let requestStatus = str(r[23]) ?? 'Unknown Status'
    let salesResponse = str(r[21])
    const salesResponseDate = excelDateToJS(r[22])

    // Arabic status → move to salesResponse, reset to Unknown Status
    if (requestStatus && isArabic(requestStatus)) {
      if (!salesResponse) salesResponse = requestStatus
      requestStatus = 'Unknown Status'
      arabicFixed++
    }

    const sentToSales = isMeaningful(requestStatus)

    const directedToName   = str(r[18])
    const directedToDeptId = directedToName ? (deptByName[directedToName] ?? null) : null

    const englishName  = String(r[3] ?? '').trim()
    const arabicName   = String(r[4] ?? '').trim()
    const companyName  = englishName || arabicName || '[No Company]'
    const companyNameAr = (englishName && arabicName) ? arabicName : null

    mklLeads.push({
      reqCode,
      leadStatus:           sentToSales ? 'COMPLETED' : 'SUBMITTED',
      requestDate,
      companyName,
      companyNameAr,
      companyWebsite:       str(r[5]),
      companyType:          normalizeCompanyType(r[6]),
      companySector:        normalizeMKLSector(r[7]),
      country:              str(r[8]),
      city:                 str(r[9]),
      location:             str(r[10]),
      contactName:          String(r[11] ?? '').trim() || '[No Contact]',
      contactNumber:        String(r[12] ?? '').trim() || '[No Number]',
      contactEmail:         str(r[13]),
      leadRequest:          note(r[14]),
      leadType:             normalizeLeadType(r[15]),
      leadSource:           normalizeMKLSource(r[16]),
      communicationChannel: str(r[17]),
      directedToDeptId,
      marketingNotes:       note(r[19]),
      sentToSales,
      sentToSalesAt:        sentToSales ? requestDate : null,
      salesResponse,
      salesResponseDate,
      requestStatus,
      newClient:            String(r[24] ?? '').trim().toLowerCase() !== 'no',
      internalReferral:     !!str(r[25]),
      referralFrom:         str(r[26]),
      businessUnitId:       mkl.id,
      createdById:          adminId,
      isImported:           true,
    })
  }

  console.log(`   Arabic statuses fixed: ${arabicFixed}`)
  console.log(`   Inserting ${mklLeads.length} MKL leads...`)
  inserted = 0
  for (let i = 0; i < mklLeads.length; i += CHUNK) {
    await db.lead.createMany({ data: mklLeads.slice(i, i + CHUNK) as any[] })
    inserted += Math.min(CHUNK, mklLeads.length - i)
    process.stdout.write(`\r   ${inserted}/${mklLeads.length}`)
  }
  console.log(' ✅')

  // ─────────────────────────────────────────────────────────────────────────────
  // Update lead_sequences (so next live lead gets the right sequence number)
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n🔢 Updating lead sequences...')
  for (const [mapKey, seq] of seqMap.entries()) {
    const pipeIdx = mapKey.indexOf('|')
    const buId    = mapKey.slice(0, pipeIdx)
    const dateKey = mapKey.slice(pipeIdx + 1)
    await db.leadSequence.upsert({
      where:  { businessUnitId_date: { businessUnitId: buId, date: dateKey } },
      update: { sequence: seq },
      create: { businessUnitId: buId, date: dateKey, sequence: seq },
    })
  }
  console.log(`   ${seqMap.size} sequence slots updated`)

  // ─────────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────────

  const [cHSL, cMGL, cMKL, cHCL, total] = await Promise.all([
    db.lead.count({ where: { businessUnitId: hsl.id } }),
    db.lead.count({ where: { businessUnitId: mgl.id } }),
    db.lead.count({ where: { businessUnitId: mkl.id } }),
    db.lead.count({ where: { businessUnitId: hcl.id } }),
    db.lead.count(),
  ])

  console.log('\n' + '─'.repeat(50))
  console.log('🎉 Full re-seed complete!')
  console.log(`   HSL (Handling):          ${cHSL}`)
  console.log(`   MGL (Poultry):           ${cMGL}`)
  console.log(`   MKL (EPPS/Makka):        ${cMKL}`)
  console.log(`   HCL (Conv Components):   ${cHCL}`)
  console.log(`   Total:                   ${total}`)
}

main()
  .catch(e => { console.error('\n❌ Failed:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect(); await pool.end() })
