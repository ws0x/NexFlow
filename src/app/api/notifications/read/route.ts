import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * POST /api/notifications/read
 * Body: { all: true }           → marks every unread notification as read
 *       { id: "notification_id" } → marks a single notification as read
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { all?: boolean; id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const now = new Date()

  if (body.all) {
    await db.notification.updateMany({
      where: { userId: session.user.id, readAt: null },
      data:  { readAt: now },
    })
  } else if (body.id) {
    // Only allow marking notifications that belong to the user
    await db.notification.updateMany({
      where: { id: body.id, userId: session.user.id },
      data:  { readAt: now },
    })
  } else {
    return NextResponse.json({ error: 'Provide id or all: true' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
