/**
 * TEMPORARY diagnostic — DELETE after login is confirmed working.
 * Tests each step of the credentials authorize() flow independently.
 * Safe: returns only timing and pass/fail, never the hash or token.
 *
 * GET /api/auth-test
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  const result: Record<string, unknown> = {}
  const t0 = Date.now()

  // 1 — DB query (same shape as authorize)
  let user: any
  try {
    user = await db.user.findUnique({
      where: { email: 'admin@nexflow.com' },
      include: {
        businessUnits: { include: { businessUnit: true } },
        departments:   { include: { department: true  } },
      },
    })
    result.dbMs      = Date.now() - t0
    result.userFound = !!user
    result.isActive  = user?.isActive ?? false
  } catch (err) {
    return NextResponse.json({ step: 'db', error: String(err), ms: Date.now() - t0 }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ ...result, step: 'db', error: 'user not found' })
  }

  // 2 — bcrypt compare
  const t1 = Date.now()
  try {
    const valid = await bcrypt.compare('NexFlow@Admin2025', user.password)
    result.bcryptMs    = Date.now() - t1
    result.bcryptValid = valid
  } catch (err) {
    return NextResponse.json({ ...result, step: 'bcrypt', error: String(err) }, { status: 500 })
  }

  result.totalMs = Date.now() - t0
  return NextResponse.json(result)
}
