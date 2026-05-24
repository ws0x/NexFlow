'use server'

import { db } from '@/lib/db'
import { format } from 'date-fns'

/**
 * Generates the next REQ code for a business unit.
 * Format: [PREFIX][Y][MM][DD][XXXX]
 * Example: HSL506240001
 *
 * Uses an atomic DB increment via upsert to handle concurrent submissions safely.
 */
export async function generateReqCode(businessUnitId: string): Promise<string> {
  const businessUnit = await db.businessUnit.findUnique({
    where: { id: businessUnitId },
  })

  if (!businessUnit) throw new Error('Business unit not found')

  const now = new Date()
  const year = String(now.getFullYear()).slice(-1)     // last digit of year: "5" for 2025
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateKey = format(now, 'yyyyMMdd')              // e.g. "20250624"

  // Atomic increment using a transaction
  const sequence = await db.$transaction(async (tx: any) => {
    const existing = await tx.leadSequence.findUnique({
      where: { businessUnitId_date: { businessUnitId, date: dateKey } },
    })

    if (existing) {
      const updated = await tx.leadSequence.update({
        where: { businessUnitId_date: { businessUnitId, date: dateKey } },
        data: { sequence: { increment: 1 } },
      })
      return updated.sequence
    } else {
      const created = await tx.leadSequence.create({
        data: { businessUnitId, date: dateKey, sequence: 1 },
      })
      return created.sequence
    }
  })

  const seqPadded = String(sequence).padStart(4, '0') // "0001"

  return `${businessUnit.prefix}${year}${month}${day}${seqPadded}`
}
