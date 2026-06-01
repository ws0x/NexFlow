import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { stripLeadByRole, hasAccessToBusinessUnit, hasAccessToDepartment } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

/**
 * GET /api/leads/by-code?code=HSL506240001
 * Quick lead lookup by REQ code — used by the Quick Lead Access modal.
 * Returns role-stripped lead data.
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.trim()
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 })

  const role = session.user.role as Role

  const lead = await db.lead.findFirst({
    where: { reqCode: { equals: code, mode: 'insensitive' } },
    include: {
      businessUnit:   { select: { id: true, name: true, prefix: true } },
      directedToDept: { select: { id: true, name: true } },
      createdBy:      { select: { name: true } },
    },
  })

  if (!lead) return NextResponse.json({ error: 'Lead not found. Check the REQ code and try again.' }, { status: 404 })

  if (!hasAccessToBusinessUnit(session.user, lead.businessUnitId)) {
    return NextResponse.json({
      error: `This lead belongs to ${lead.businessUnit.name} — your account is not assigned to that entity. Contact your admin.`,
    }, { status: 403 })
  }

  if (role === 'SALES') {
    if (!lead.sentToSales) {
      return NextResponse.json({ error: 'This lead has not been sent to Sales yet.' }, { status: 403 })
    }
    if (!hasAccessToDepartment(session.user, lead.directedToDeptId)) {
      return NextResponse.json({
        error: `This lead is directed to ${lead.directedToDept?.name ?? 'another department'} — not your assigned department.`,
      }, { status: 403 })
    }
  }

  const stripped = stripLeadByRole(lead, role)
  return NextResponse.json(stripped)
}
