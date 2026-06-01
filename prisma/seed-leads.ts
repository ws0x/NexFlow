import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import * as XLSX from 'xlsx'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter } as any)

// ─── File paths ───────────────────────────────────────────────────────────────

const BASE = 'H:/Shared drives/MARKETING/03. LEADS FOLLOW UP/A. LEADS DATABASES/'
const HANDLING_FILE = BASE + 'HANDLING DIGITAL MARKETIING LEADS DATABASE - V3.xlsx'
const MAKKA_FILE    = BASE + 'MAKKA DIGITAL MARKETIING LEADS DATABASE - V8.xlsx'
const MIG_FILE      = BASE + 'MIG DIGITAL MARKETING LEADS DATABASE - V9.xlsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert Excel serial date (or JS Date) to a JS Date object */
function excelDateToJS(v: unknown): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  if (typeof v === 'number' && v > 25000 && v < 100000) {
    // Excel serial: day 25569 = 1970-01-01, accounting for 1900 leap-year bug
    const d = new Date(Math.round((v - 25569) * 86400 * 1000))
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof v === 'string' && v.trim()) {
    const d = new Date(v.trim())
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

/** Trim and return null for empty / N/A values */
function str(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s || ['n/a', 'n.a.', 'none', '-'].includes(s.toLowerCase())) return null
  return s
}

/** Trim but keep any non-empty string (don't null out legitimate notes) */
function note(v: unknown): string | null {
  const s = String(v ?? '').trim()
  return s || null
}

/** True if the string contains Arabic characters */
function isArabic(s: string): boolean {
  return /[؀-ۿ]/.test(s)
}

/** A status is "meaningful" if it is set and is not the default Unknown Status */
function isMeaningful(status: string | null | undefined): boolean {
  if (!status) return false
  return status.trim() !== 'Unknown Status'
}

// ─── Lead source normalization ────────────────────────────────────────────────

const SOURCE_MAP: Record<string, string | null> = {
  // HANDLING
  'El-Masrya Website':    'el-masrya.com',
  'Info Email':           'Direct Email',
  'Poultry Number - 941': 'Internal referral',
  'Youtube':              'YouTube',

  // MAKKA
  'Tiktok':               'TikTok',

  // MIG
  'Facebook Campaign':    'Facebook Ads',
  'Current Client':       'Referral (internal)',
  'Handling Number - 711':'Internal referral',
  'Poultry Number - 334': 'Internal referral',
  'Unknown':              null,
  'Website':              'el-masreya.net',
  'WhatsApp Campaign':    'WhatsApp Campaign',
  'Direct Email':         'Direct Email',
  'Instagram':            'Instagram',
  'Referral':             'Referral',
}

function normalizeSource(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  if (s in SOURCE_MAP) return SOURCE_MAP[s]
  return s   // already-correct values pass through (Google Business Profile, TikTok, Facebook Ads, etc.)
}

// ─── Lead type normalization ──────────────────────────────────────────────────

function normalizeLeadType(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  // Normalize case variants
  const low = s.toLowerCase()
  if (low === 'client')   return 'Client'
  if (low === 'supplier') return 'Supplier'
  if (low === 'others')   return 'Others'
  return s
}

// ─── REQ code generation ──────────────────────────────────────────────────────
//
// Format: {PREFIX}{Y}{MM}{DD}{SEQ4}
// Sequence is tracked per entity+date (same logic as the live req-code.ts).
// Using requestDate for the date component so codes carry meaningful date info.

const seqMap = new Map<string, number>()   // key: `${buId}|${yyyyMMdd}`

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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 NexFlow — historical lead import')

  // ── Look up business units ────────────────────────────────────────────────
  const [hsl, mgl, mkl, hcl] = await Promise.all([
    db.businessUnit.findUniqueOrThrow({ where: { prefix: 'HSL' } }),
    db.businessUnit.findUniqueOrThrow({ where: { prefix: 'MGL' } }),
    db.businessUnit.findUniqueOrThrow({ where: { prefix: 'MKL' } }),
    db.businessUnit.findUniqueOrThrow({ where: { prefix: 'HCL' } }),
  ])
  console.log('✅ Business units loaded')

  // ── Look up departments ───────────────────────────────────────────────────
  const deptRows = await db.department.findMany({ select: { id: true, name: true } })
  const deptByName = Object.fromEntries(deptRows.map((d: { id: string; name: string }) => [d.name, d.id]))
  console.log('✅ Departments loaded:', Object.keys(deptByName).join(', '))

  // ── Get admin user ────────────────────────────────────────────────────────
  const admin = await db.user.findUniqueOrThrow({ where: { email: 'admin@nexflow.com' } })
  const adminId = admin.id

  // ── Clear existing lead data ──────────────────────────────────────────────
  console.log('\n🗑️  Clearing existing lead data...')
  await db.notification.deleteMany({ where: { leadId: { not: null } } })
  const deleted = await db.lead.deleteMany({})    // cascades LeadHistory
  await db.leadSequence.deleteMany({})
  console.log(`   Removed ${deleted.count} leads (+ history, sequences, notifications)`)

  // ── Add new dropdown values ───────────────────────────────────────────────
  console.log('\n📋 Upserting dropdown options...')
  const newDropdowns: { category: string; values: string[] }[] = [
    {
      category: 'REQUEST_STATUS',
      values: ['Official Quoting', 'Indicative Quoting'],
    },
    {
      category: 'LEAD_SOURCE',
      values: [
        'Direct Email', 'WhatsApp Campaign', 'Instagram',
        'Referral', 'Referral (internal)', 'Internal referral',
        'el-masreya.net', 'el-masrya.com',
      ],
    },
    {
      category: 'COMMUNICATION_CHANNEL',
      values: ['Facebook Message'],
    },
    {
      category: 'COMPANY_TYPE',
      values: ['Farm', 'Slaughtering Line'],
    },
  ]

  for (const { category, values } of newDropdowns) {
    const existing = await db.dropdownOption.findMany({
      where: { category },
      orderBy: { order: 'desc' },
      take: 1,
      select: { order: true },
    })
    let nextOrder = (existing[0]?.order ?? -1) + 1

    for (const value of values) {
      await db.dropdownOption.upsert({
        where: { category_value_entityScope: { category, value, entityScope: 'GLOBAL' } },
        update: {},
        create: { category, value, order: nextOrder++, entityScope: 'GLOBAL' },
      })
    }
  }
  console.log('✅ Dropdown options updated')

  // ══════════════════════════════════════════════════════════════════════════
  // ── Parse HANDLING file ────────────────────────────────────────────────
  // Col indices (header row = row[1], data starts row[2]):
  //  0:#  1:REQ CODE  2:REQUEST DATE  3:COMPANY NAME  4:COMPANY NAME AR
  //  5:COMPANY WEBSITE  6:COMPANY TYPE  7:COMPANY SECTOR  8:COUNTRY  9:CITY
  //  10:STATE  11:LOCATION  12:CONTACT NAME  13:CONTACT NUMBER  14:CONTACT EMAIL
  //  15:LEAD REQUEST  16:REQUESTED CATEGORY  17:LEAD TYPE  18:LEAD SOURCE
  //  19:COMMUNICATION CHANNEL  20:MARKETING TEAM NOTES  21:SENT TO SALES
  //  22:REQUEST STATUS  23:NEW CLIENT
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n📂 Parsing HANDLING file...')
  const handlingLeads: object[] = []

  {
    const wb   = XLSX.readFile(HANDLING_FILE, { cellDates: true })
    const ws   = wb.Sheets['LEADS DATABASE']
    const all  = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
    const data = all.slice(2).filter((r: unknown[]) => r.some((c: unknown) => c !== ''))

    let hslCount = 0, hclCount = 0

    for (const r of data as unknown[][]) {
      // Determine entity from REQUESTED CATEGORY (col 16)
      const reqCat = String(r[16] ?? '').trim()
      const isHCL  = reqCat === 'Conveyors Components'
      const bu     = isHCL ? hcl : hsl

      const requestDate = excelDateToJS(r[2]) ?? new Date()
      const reqCode     = nextCode(bu.prefix, bu.id, requestDate)

      const requestStatus = str(r[22]) ?? 'Unknown Status'
      const sentToSales   = isMeaningful(requestStatus)

      // Combine STATE (col 10) + LOCATION (col 11)
      const stateVal    = str(r[10])
      const locationVal = str(r[11])
      const location    = [stateVal, locationVal].filter(Boolean).join(' - ') || null

      const companyName = String(r[3] ?? '').trim() || '[No Company]'
      const contactName = String(r[12] ?? '').trim() || '[No Contact]'
      const contactNum  = String(r[13] ?? '').trim() || '[No Number]'

      if (isHCL) hclCount++; else hslCount++

      handlingLeads.push({
        reqCode,
        leadStatus:          sentToSales ? 'COMPLETED' : 'SUBMITTED',
        requestDate,
        companyName,
        companyNameAr:        str(r[4]),
        companyWebsite:       str(r[5]),
        companyType:          str(r[6]),
        companySector:        str(r[7]),
        country:              str(r[8]),
        city:                 str(r[9]),
        location,
        contactName,
        contactNumber:        contactNum,
        contactEmail:         str(r[14]),
        leadRequest:          note(r[15]),
        leadType:             normalizeLeadType(r[17]),
        leadSource:           normalizeSource(r[18]),
        communicationChannel: str(r[19]),
        marketingNotes:       note(r[20]),
        sentToSales,
        sentToSalesAt:        sentToSales ? requestDate : null,
        requestStatus,
        newClient:            String(r[23] ?? '').trim().toLowerCase() !== 'no',
        businessUnitId:       bu.id,
        createdById:          adminId,
        isImported:           true,
      })
    }

    console.log(`   HANDLING: ${data.length} rows → ${hslCount} HSL + ${hclCount} HCL`)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── Parse MAKKA file ───────────────────────────────────────────────────
  // Col indices:
  //  0:#  1:REQ CODE  2:REQUEST DATE  3:COMPANY NAME  4:COMPANY NAME AR
  //  5:COMPANY WEBSITE  6:COMPANY TYPE  7:COMPANY SECTOR  8:COUNTRY  9:CITY
  //  10:LOCATION  11:CONTACT NAME  12:CONTACT NUMBER  13:CONTACT EMAIL
  //  14:LEAD REQUEST  15:LEAD TYPE  16:LEAD SOURCE  17:COMMUNICATION CHANNEL
  //  18:LEAD SHOULD BE DIRECTED TO  19:MARKETING TEAM NOTES  20:SENT TO SALES
  //  21:SALES RESPONSE  22:SALES RESPONSE DATE  23:REQUEST STATUS
  //  24:NEW CLIENT  25:INTERNAL REFERRAL  26:REFERRAL FROM
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n📂 Parsing MAKKA file...')
  const makkaLeads: object[] = []

  {
    const wb   = XLSX.readFile(MAKKA_FILE, { cellDates: true })
    const ws   = wb.Sheets['LEADS DATABASE']
    const all  = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
    const data = all.slice(2).filter((r: unknown[]) => r.some((c: unknown) => c !== ''))

    let arabicFixed = 0

    for (const r of data as unknown[][]) {
      const requestDate = excelDateToJS(r[2]) ?? new Date()
      const reqCode     = nextCode(mkl.prefix, mkl.id, requestDate)

      let requestStatus = str(r[23]) ?? 'Unknown Status'
      let salesResponse = str(r[21])
      const salesResponseDate = excelDateToJS(r[22])

      // Arabic request status → move to salesResponse, reset to Unknown Status
      if (requestStatus && isArabic(requestStatus)) {
        if (!salesResponse) salesResponse = requestStatus
        requestStatus = 'Unknown Status'
        arabicFixed++
      }

      const sentToSales = isMeaningful(requestStatus)

      // Directed-to department
      const directedToName  = str(r[18])
      const directedToDeptId = directedToName
        ? (deptByName[directedToName] ?? null)
        : null

      const companyName = String(r[3] ?? '').trim() || '[No Company]'
      const contactName = String(r[11] ?? '').trim() || '[No Contact]'
      const contactNum  = String(r[12] ?? '').trim() || '[No Number]'

      makkaLeads.push({
        reqCode,
        leadStatus:          sentToSales ? 'COMPLETED' : 'SUBMITTED',
        requestDate,
        companyName,
        companyNameAr:        str(r[4]),
        companyWebsite:       str(r[5]),
        companyType:          str(r[6]),
        companySector:        str(r[7]),
        country:              str(r[8]),
        city:                 str(r[9]),
        location:             str(r[10]),
        contactName,
        contactNumber:        contactNum,
        contactEmail:         str(r[13]),
        leadRequest:          note(r[14]),
        leadType:             normalizeLeadType(r[15]),
        leadSource:           normalizeSource(r[16]),
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

    console.log(`   MAKKA: ${data.length} rows (${arabicFixed} Arabic statuses moved to salesResponse)`)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── Parse MIG file ─────────────────────────────────────────────────────
  // Col indices:
  //  0:#  1:REQ CODE  2:REQUEST DATE  3:COMPANY NAME  4:CONTACT NAME
  //  5:CONTACT NUMBER  6:CONTACT EMAIL  7:COMPANY WEBSITE  8:COUNTRY
  //  9:LOCATION  10:CONTACT TYPE (→ leadType)  11:CLIENT TYPE (→ companyType)
  //  12:LEAD REQUEST  13:REQUESTED PRODUCT CATEGORY  14:REQUESTED PRODUCT
  //  15:QUANTITY  16:CAPACITY RANGE  17:LICENSE
  //  18:LEAD SOURCE  19:COMMUNICATION CHANNEL  20:RESPONSE (→ salesResponse)
  //  21:REQUEST STATUS  22:CLIENT STATUS (→ newClient)  23:PROJECT STATUS
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n📂 Parsing MIG file...')
  const migLeads: object[] = []

  {
    const wb   = XLSX.readFile(MIG_FILE, { cellDates: true })
    const ws   = wb.Sheets['MIG LEADS DATABASE']
    const all  = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
    const data = all.slice(2).filter((r: unknown[]) => r.some((c: unknown) => c !== ''))

    for (const r of data as unknown[][]) {
      const requestDate = excelDateToJS(r[2]) ?? new Date()
      const reqCode     = nextCode(mgl.prefix, mgl.id, requestDate)

      const requestStatus = str(r[21]) ?? 'Unknown Status'
      const salesResponse = str(r[20])
      const sentToSales   = isMeaningful(requestStatus)

      // CLIENT STATUS → newClient
      const clientStatus = String(r[22] ?? '').trim()
      const newClient    = clientStatus.toLowerCase() !== 'current client'

      // Build marketingNotes from extra product fields
      const parts: string[] = []
      const prodCat  = str(r[13])
      const product  = str(r[14])
      const quantity = str(r[15])
      const capacity = str(r[16])
      if (prodCat)  parts.push(`Category: ${prodCat}`)
      if (product)  parts.push(`Product: ${product}`)
      if (quantity) parts.push(`Qty: ${quantity}`)
      if (capacity) parts.push(`Capacity: ${capacity}`)
      const marketingNotes = parts.length ? parts.join(' | ') : null

      const companyName = String(r[3] ?? '').trim() || '[No Company]'
      const contactName = String(r[4] ?? '').trim() || '[No Contact]'
      const contactNum  = String(r[5] ?? '').trim() || '[No Number]'

      migLeads.push({
        reqCode,
        leadStatus:          sentToSales ? 'COMPLETED' : 'SUBMITTED',
        requestDate,
        companyName,
        companyWebsite:       str(r[7]),
        country:              str(r[8]),
        location:             str(r[9]),
        contactName,
        contactNumber:        contactNum,
        contactEmail:         str(r[6]),
        companyType:          str(r[11]),
        leadType:             normalizeLeadType(r[10]),
        leadRequest:          note(r[12]),
        leadSource:           normalizeSource(r[18]),
        communicationChannel: str(r[19]),
        marketingNotes,
        sentToSales,
        sentToSalesAt:        sentToSales ? requestDate : null,
        salesResponse,
        requestStatus,
        newClient,
        businessUnitId:       mgl.id,
        createdById:          adminId,
        isImported:           true,
      })
    }

    console.log(`   MIG: ${data.length} rows`)
  }

  // ── Insert all leads ──────────────────────────────────────────────────────
  const allLeads = [...handlingLeads, ...makkaLeads, ...migLeads]
  console.log(`\n🚀 Inserting ${allLeads.length} leads...`)

  const CHUNK_SIZE = 100
  let inserted = 0

  for (let i = 0; i < allLeads.length; i += CHUNK_SIZE) {
    await db.lead.createMany({ data: allLeads.slice(i, i + CHUNK_SIZE) as any[] })
    inserted += Math.min(CHUNK_SIZE, allLeads.length - i)
    process.stdout.write(`\r   ${inserted} / ${allLeads.length}`)
  }
  console.log('\n✅ All leads inserted')

  // ── Update lead_sequences table ───────────────────────────────────────────
  // So future leads don't conflict with the imported codes.
  console.log('\n🔢 Updating lead sequences...')
  let seqCount = 0

  for (const [mapKey, seq] of seqMap.entries()) {
    const pipeIdx  = mapKey.indexOf('|')
    const buId     = mapKey.slice(0, pipeIdx)
    const dateKey  = mapKey.slice(pipeIdx + 1)

    await db.leadSequence.upsert({
      where:  { businessUnitId_date: { businessUnitId: buId, date: dateKey } },
      update: { sequence: seq },
      create: { businessUnitId: buId, date: dateKey, sequence: seq },
    })
    seqCount++
  }
  console.log(`   ${seqCount} sequence slots updated`)

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50))
  console.log('🎉 Import complete!')
  console.log(`   HANDLING (HSL + HCL) : ${handlingLeads.length}`)
  console.log(`   MAKKA    (MKL)        : ${makkaLeads.length}`)
  console.log(`   MIG      (MGL)        : ${migLeads.length}`)
  console.log(`   TOTAL                 : ${allLeads.length}`)

  // Per-entity counts
  const hclCount  = handlingLeads.filter((l: any) => l.businessUnitId === hcl.id).length
  const hslCount  = handlingLeads.filter((l: any) => l.businessUnitId === hsl.id).length
  console.log(`\n   HSL: ${hslCount}  HCL: ${hclCount}  MKL: ${makkaLeads.length}  MGL: ${migLeads.length}`)
}

main()
  .catch((e) => {
    console.error('\n❌ Import failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
    await pool.end()
  })
