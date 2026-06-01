/**
 * One-time migration: replace "Quoting Stage" with "Indicative Quoting" + "Official Quoting".
 *
 * Run:  npx tsx prisma/migrate-quoting-status.ts
 *
 * Requires DATABASE_URL in environment (same as the app).
 * Safe to re-run (idempotent).
 */

import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '../src/generated/prisma/client'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? ''
  if (!url) throw new Error('DATABASE_URL is not set')
  // Strip channel_binding — not supported over WebSocket
  let connectionString = url
  try {
    const u = new URL(url)
    u.searchParams.delete('channel_binding')
    connectionString = u.toString()
  } catch { /* leave as-is */ }
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter } as any)
}

const db = createClient()

async function main() {
  console.log('Starting Quoting Stage migration…')

  // 1. Rename existing dropdown option (or delete + recreate with correct order)
  const existing = await db.dropdownOption.findFirst({
    where: { category: 'REQUEST_STATUS', value: 'Quoting Stage' },
  })

  if (existing) {
    // Check if "Indicative Quoting" already exists (e.g. manually added by admin)
    const indicativeExists = await db.dropdownOption.findFirst({
      where: { category: 'REQUEST_STATUS', value: 'Indicative Quoting' },
    })

    if (indicativeExists) {
      // Already exists — just delete the legacy "Quoting Stage" entry
      await db.dropdownOption.delete({ where: { id: existing.id } })
      console.log('  "Indicative Quoting" already exists — deleted legacy "Quoting Stage" entry')
    } else {
      // Rename "Quoting Stage" → "Indicative Quoting" (keeps its order slot)
      await db.dropdownOption.update({
        where: { id: existing.id },
        data:  { value: 'Indicative Quoting' },
      })
      console.log('  Renamed "Quoting Stage" → "Indicative Quoting"')
    }

    // Ensure "Official Quoting" exists
    const officialExists = await db.dropdownOption.findFirst({
      where: { category: 'REQUEST_STATUS', value: 'Official Quoting' },
    })

    if (!officialExists) {
      // Insert after "Indicative Quoting"
      const indicative = indicativeExists ?? await db.dropdownOption.findFirst({
        where: { category: 'REQUEST_STATUS', value: 'Indicative Quoting' },
      })
      const insertOrder = (indicative?.order ?? existing.order) + 1

      // Shift subsequent options up by 1 to make room
      await db.dropdownOption.updateMany({
        where: {
          category: 'REQUEST_STATUS',
          order:    { gte: insertOrder },
        },
        data: { order: { increment: 1 } },
      })

      await db.dropdownOption.create({
        data: {
          category:    'REQUEST_STATUS',
          value:       'Official Quoting',
          order:       insertOrder,
          isActive:    true,
          entityScope: existing.entityScope ?? 'GLOBAL',
        },
      })
      console.log('  Created "Official Quoting" dropdown option')
    } else {
      console.log('  "Official Quoting" already exists — skipped')
    }
  } else {
    console.log('  "Quoting Stage" dropdown not found — may already be migrated')
  }

  // 2. Migrate existing leads: requestStatus "Quoting Stage" → "Indicative Quoting"
  const updated = await db.lead.updateMany({
    where: { requestStatus: 'Quoting Stage' },
    data:  { requestStatus: 'Indicative Quoting' },
  })
  console.log(`  Updated ${updated.count} lead(s) from "Quoting Stage" → "Indicative Quoting"`)

  console.log('Migration complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
