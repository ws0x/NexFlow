import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/health
 * Quick DB connectivity check — useful for diagnosing serverless cold-start
 * issues on Vercel without going through the full auth flow.
 *
 * Returns: { ok: true, userCount: number, ms: number }
 *       or { ok: false, error: string }
 */
export async function GET() {
  const t0 = Date.now()
  try {
    const count = await db.user.count()
    return NextResponse.json({ ok: true, userCount: count, ms: Date.now() - t0 })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err), ms: Date.now() - t0 },
      { status: 500 }
    )
  }
}
