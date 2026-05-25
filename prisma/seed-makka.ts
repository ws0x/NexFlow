/**
 * Targeted re-seed: removes all MKL (EPPS / MAKKA) leads and re-imports
 * from the current MAKKA Excel file.
 *
 * Run: npx tsx prisma/seed-makka.ts
 */
import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import * as XLSX from 'xlsx'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter } as any)

const MAKKA_FILE =
  'H:/Shared drives/MARKETING/03. LEADS FOLLOW UP/A. LEADS DATABASES/MAKKA DIGITAL MARKETIING LEADS DATABASE - V8.xlsx'

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
  if (!s || ['n/a', 'n.a.', 'none', '-'].includes(s.toLowerCase())) return null
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
  return status.trim() !== 'Unknown Status'
}

const SOURCE_MAP: Record<string, string | null> = {
  Tiktok: 'TikTok',
}

function normalizeSource(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  return s in SOURCE_MAP ? SOURCE_MAP[s] : s
}

function normalizeLeadType(v: unknown): string | null {
  const s = String(v ?? '').trim()
  if (!s) return null
  const low = s.toLowerCase()
  if (low === 'client')   return 'Client'
  if (low === 'supplier') return 'Supplier'
  if (low === 'others')   return 'Others'
  return s
}

// ─── REQ code generation ──────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 MAKKA leads re-seed')

  // Look up MKL entity
  const mkl = await db.businessUnit.findUniqueOrThrow({ where: { prefix: 'MKL' } })

  // Look up departments (for "LEAD SHOULD BE DIRECTED TO")
  const deptRows = await db.department.findMany({ select: { id: true, name: true } })
  const deptByName = Object.fromEntries(
    deptRows.map((d: { id: string; name: string }) => [d.name, d.id]),
  )

  // Get admin user
  const admin = await db.user.findUniqueOrThrow({ where: { email: 'admin@nexflow.com' } })
  const adminId = admin.id

  // ── Delete MKL leads + their sequences ────────────────────────────────────
  console.log('\n🗑️  Removing existing MKL leads...')
  await db.notification.deleteMany({
    where: { lead: { businessUnitId: mkl.id } },
  })
  const deleted = await db.lead.deleteMany({ where: { businessUnitId: mkl.id } })
  await db.leadSequence.deleteMany({ where: { businessUnitId: mkl.id } })
  console.log(`   Removed ${deleted.count} MKL leads`)

  // ── Parse MAKKA file ──────────────────────────────────────────────────────
  //
  // IMPORTANT: The file structure changed — the title row was removed so the
  // header row ("#", "REQ CODE", ...) may now be at index 0 instead of index 1.
  // We detect the header dynamically to stay resilient to future edits.
  //
  // Column layout (0-indexed, after locating header row):
  //  0:#  1:REQ CODE  2:REQUEST DATE  3:COMPANY NAME  4:COMPANY NAME AR
  //  5:COMPANY WEBSITE  6:COMPANY TYPE  7:COMPANY SECTOR  8:COUNTRY  9:CITY
  //  10:LOCATION  11:CONTACT NAME  12:CONTACT NUMBER  13:CONTACT EMAIL
  //  14:LEAD REQUEST  15:LEAD TYPE  16:LEAD SOURCE  17:COMMUNICATION CHANNEL
  //  18:LEAD SHOULD BE DIRECTED TO  19:MARKETING TEAM NOTES  20:SENT TO SALES
  //  21:SALES RESPONSE  22:SALES RESPONSE DATE  23:REQUEST STATUS
  //  24:NEW CLIENT  25:INTERNAL REFERRAL  26:REFERRAL FROM

  console.log('\n📂 Parsing MAKKA file...')
  const wb  = XLSX.readFile(MAKKA_FILE, { cellDates: true })
  const ws  = wb.Sheets['LEADS DATABASE']
  const all = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })

  // Find the header row (the row where column 0 is exactly "#")
  let headerIdx = 0
  for (let i = 0; i < Math.min(6, all.length); i++) {
    if (String((all[i] as unknown[])?.[0] ?? '').trim() === '#') {
      headerIdx = i
      break
    }
  }
  const dataStart = headerIdx + 1
  const data = (all.slice(dataStart) as unknown[][]).filter((r) =>
    r.some((c) => c !== ''),
  )
  console.log(`   Header at row ${headerIdx}, data starts at row ${dataStart}`)
  console.log(`   ${data.length} data rows found`)

  // ── Build lead records ────────────────────────────────────────────────────
  const makkaLeads: object[] = []
  let arabicFixed = 0

  for (const r of data) {
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
    const directedToDeptId = directedToName ? (deptByName[directedToName] ?? null) : null

    // Company name: prefer English; fall back to Arabic if English is blank
    const englishName  = String(r[3] ?? '').trim()
    const arabicName   = String(r[4] ?? '').trim()
    const companyName  = englishName || arabicName || '[No Company]'
    // Only store Arabic separately when there is also an English name
    const companyNameAr = (englishName && arabicName) ? arabicName : null

    const contactName = String(r[11] ?? '').trim() || '[No Contact]'
    const contactNum  = String(r[12] ?? '').trim() || '[No Number]'

    makkaLeads.push({
      reqCode,
      leadStatus:          sentToSales ? 'COMPLETED' : 'SUBMITTED',
      requestDate,
      companyName,
      companyNameAr,
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

  console.log(`   Arabic statuses moved to salesResponse: ${arabicFixed}`)

  // ── Insert in chunks ──────────────────────────────────────────────────────
  console.log(`\n🚀 Inserting ${makkaLeads.length} MKL leads...`)
  const CHUNK = 100
  let inserted = 0

  for (let i = 0; i < makkaLeads.length; i += CHUNK) {
    await db.lead.createMany({ data: makkaLeads.slice(i, i + CHUNK) as any[] })
    inserted += Math.min(CHUNK, makkaLeads.length - i)
    process.stdout.write(`\r   ${inserted} / ${makkaLeads.length}`)
  }
  console.log('\n✅ All MKL leads inserted')

  // ── Update lead_sequences ─────────────────────────────────────────────────
  console.log('\n🔢 Updating MKL lead sequences...')
  let seqCount = 0
  for (const [mapKey, seq] of seqMap.entries()) {
    const pipeIdx = mapKey.indexOf('|')
    const buId    = mapKey.slice(0, pipeIdx)
    const dateKey = mapKey.slice(pipeIdx + 1)
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
  console.log('🎉 MAKKA re-seed complete!')
  console.log(`   MKL leads inserted: ${makkaLeads.length}`)
}

main()
  .catch((e) => { console.error('\n❌ Failed:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect(); await pool.end() })
