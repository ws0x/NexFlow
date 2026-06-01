/**
 * Creates test Marketing + Sales users for role verification.
 * Run AFTER seed-all-leads.ts.
 *
 * Users created:
 *   marketing@test.nexflow.com  / Test@Marketing2025  (MARKETING, all 3 entities)
 *   sales@test.nexflow.com      / Test@Sales2025      (SALES, HSL entity, all departments)
 *
 * Run: npx tsx prisma/seed-test-users.ts
 */

import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Role } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter } as any)

async function main() {
  console.log('🌱 Seeding test users...')

  const [hsl, mgl, mkl, hcl] = await Promise.all([
    db.businessUnit.findUniqueOrThrow({ where: { prefix: 'HSL' } }),
    db.businessUnit.findUniqueOrThrow({ where: { prefix: 'MGL' } }),
    db.businessUnit.findUniqueOrThrow({ where: { prefix: 'MKL' } }),
    db.businessUnit.findUniqueOrThrow({ where: { prefix: 'HCL' } }),
  ])

  const departments = await db.department.findMany({ orderBy: { order: 'asc' } })

  const [mktHash, salesHash] = await Promise.all([
    bcrypt.hash('Test@Marketing2025', 12),
    bcrypt.hash('Test@Sales2025', 12),
  ])

  // ── Marketing user ────────────────────────────────────────────────────────

  const marketing = await db.user.upsert({
    where:  { email: 'marketing@test.nexflow.com' },
    update: { password: mktHash, isActive: true },
    create: {
      name:     'Test Marketing',
      email:    'marketing@test.nexflow.com',
      password: mktHash,
      role:     Role.MARKETING,
    },
  })

  // Assign to all 3 entities
  await Promise.all([hsl, mgl, mkl].map((bu) =>
    db.userBusinessUnit.upsert({
      where:  { userId_businessUnitId: { userId: marketing.id, businessUnitId: bu.id } },
      update: {},
      create: { userId: marketing.id, businessUnitId: bu.id },
    }),
  ))

  console.log('✅ Marketing user created: marketing@test.nexflow.com / Test@Marketing2025')
  console.log('   Entities: HSL, MGL, MKL')

  // ── Sales user ────────────────────────────────────────────────────────────

  const sales = await db.user.upsert({
    where:  { email: 'sales@test.nexflow.com' },
    update: { password: salesHash, isActive: true },
    create: {
      name:     'Test Sales',
      email:    'sales@test.nexflow.com',
      password: salesHash,
      role:     Role.SALES,
    },
  })

  // Assign ONLY to HCL entity (266 leads from Handling file with product categories)
  // Remove any stale BU assignments first, then assign HCL
  await db.userBusinessUnit.deleteMany({ where: { userId: sales.id } })
  await db.userBusinessUnit.create({ data: { userId: sales.id, businessUnitId: hcl.id } })

  // Assign to all departments (so they can see all HSL leads)
  await Promise.all(departments.map((dept: any) =>
    db.userDepartment.upsert({
      where:  { userId_departmentId: { userId: sales.id, departmentId: dept.id } },
      update: {},
      create: { userId: sales.id, departmentId: dept.id },
    }),
  ))

  console.log('✅ Sales user created:     sales@test.nexflow.com / Test@Sales2025')
  console.log('   Entity: HCL | Departments: All')

  // ── Verification summary ──────────────────────────────────────────────────

  const mktBUs = await db.userBusinessUnit.findMany({ where: { userId: marketing.id }, include: { businessUnit: { select: { prefix: true } } } })
  const salesBUs = await db.userBusinessUnit.findMany({ where: { userId: sales.id }, include: { businessUnit: { select: { prefix: true } } } })
  const salesDepts = await db.userDepartment.findMany({ where: { userId: sales.id }, include: { department: { select: { name: true } } } })

  const [hclSentCount, mklSentCount] = await Promise.all([
    db.lead.count({ where: { businessUnitId: hcl.id, sentToSales: true } }),
    db.lead.count({ where: { businessUnitId: mkl.id, sentToSales: true } }),
  ])

  console.log('\n─── Verification ───────────────────────────────────────')
  console.log('Marketing entities:', mktBUs.map((b: any) => b.businessUnit.prefix).join(', '))
  console.log('Sales entities:', salesBUs.map((b: any) => b.businessUnit.prefix).join(', '))
  console.log('Sales departments:', salesDepts.map((d: any) => d.department.name).join(', '))
  console.log(`HCL leads with sentToSales=true (visible to Sales test user): ${hclSentCount}`)
  console.log(`MKL leads with sentToSales=true (for reference): ${mklSentCount}`)
  console.log('\n💡 Login at /login to test each role.')
  console.log('   Marketing: marketing@test.nexflow.com / Test@Marketing2025')
  console.log('   Sales:     sales@test.nexflow.com     / Test@Sales2025')
}

main()
  .catch(e => { console.error('❌ Failed:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect(); await pool.end() })
