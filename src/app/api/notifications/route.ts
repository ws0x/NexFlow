import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * GET /api/notifications
 * Returns the 20 most-recent notifications for the authenticated user,
 * plus the total unread count.
 * Polled every 30 s by the NotificationBell client component.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const notifications = await db.notification.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take:    20,
    select: {
      id:        true,
      type:      true,
      title:     true,
      message:   true,
      leadId:    true,
      readAt:    true,
      createdAt: true,
    },
  })

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return NextResponse.json({ notifications, unreadCount })
}
