import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Role } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter } as any)

async function main() {
  console.log('🌱 Seeding NexFlow database...')

  // ── Business Units ──────────────────────────────────────────────────────
  const [hsl, mgl, mkl, hcl] = await Promise.all([
    db.businessUnit.upsert({
      where: { prefix: 'HSL' },
      update: {},
      create: { name: 'MIG - Handling', prefix: 'HSL' },
    }),
    db.businessUnit.upsert({
      where: { prefix: 'MGL' },
      update: {},
      create: { name: 'MIG - Poultry', prefix: 'MGL' },
    }),
    db.businessUnit.upsert({
      where: { prefix: 'MKL' },
      update: {},
      create: { name: 'EPPS', prefix: 'MKL' },
    }),
    db.businessUnit.upsert({
      where: { prefix: 'HCL' },
      update: {},
      create: { name: 'MIG - Conv Components', prefix: 'HCL' },
    }),
  ])

  console.log('✅ Business units seeded')

  // ── Departments ─────────────────────────────────────────────────────────
  const departmentNames = [
    'Agricultural Agencies',
    'Automation Agencies',
    'Factory Equipment',
    'Machinery Sales',
    'Maintenance & Technical Support',
    'Material Sales',
    'Plastic Agencies',
    'Supply Chain',
  ]

  for (let i = 0; i < departmentNames.length; i++) {
    await db.department.upsert({
      where: { id: `dept_${i + 1}` },
      update: {},
      create: {
        id: `dept_${i + 1}`,
        name: departmentNames[i],
        order: i,
      },
    })
  }

  console.log('✅ Departments seeded')

  // ── Dropdown Options ────────────────────────────────────────────────────
  const dropdowns: { category: string; values: string[] }[] = [
    {
      category: 'COMPANY_TYPE',
      values: ['Procurement Company', 'Factory', 'Commercial Company', 'Shop'],
    },
    {
      category: 'REQUEST_STATUS',
      values: [
        'Unknown Status',
        'Just an inquiry',
        'Out Of Range',
        'Out Of Segment',
        'Quoting Stage',
        'Rejected the Quote',
        'Turned Into Order',
      ],
    },
    {
      category: 'LEAD_TYPE',
      values: ['Client', 'Supplier', 'Others'],
    },
    {
      category: 'COMMUNICATION_CHANNEL',
      values: ['Direct Call', 'Email', 'WhatsApp'],
    },
    {
      category: 'LEAD_SOURCE',
      values: [
        'Google Business Profile',
        'Automation Website',
        'Makka Corp Website',
        'YouTube',
        'Facebook',
        'WhatsApp',
        'Mail Info',
        'TikTok',
        'Facebook Ads',
      ],
    },
    {
      category: 'COMPANY_SECTOR',
      values: [
        'Automotive & Transportation',
        'Chemical Industry',
        'Construction',
        'Electronics & Electrical',
        'Energy & Utilities',
        'Environmental & Waste Management',
        'Food & Beverage',
        'Healthcare Manufacturing',
        'Industrial Equipment',
        'Logistics & Material Handling',
        'Manufacturing',
        'Mining & Metals',
        'Packaging Industry',
        'Pharmaceutical',
        'Textile & Apparel',
      ],
    },
  ]

  for (const { category, values } of dropdowns) {
    for (let i = 0; i < values.length; i++) {
      await db.dropdownOption.upsert({
        where: { category_value: { category, value: values[i] } },
        update: {},
        create: { category, value: values[i], order: i },
      })
    }
  }

  console.log('✅ Dropdown options seeded')

  // ── Super Admin User ────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('NexFlow@Admin2025', 12)

  const admin = await db.user.upsert({
    where: { email: 'admin@nexflow.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@nexflow.com',
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
    },
  })

  // Assign admin to all entities
  await Promise.all([
    db.userBusinessUnit.upsert({
      where: { userId_businessUnitId: { userId: admin.id, businessUnitId: hsl.id } },
      update: {},
      create: { userId: admin.id, businessUnitId: hsl.id },
    }),
    db.userBusinessUnit.upsert({
      where: { userId_businessUnitId: { userId: admin.id, businessUnitId: mgl.id } },
      update: {},
      create: { userId: admin.id, businessUnitId: mgl.id },
    }),
    db.userBusinessUnit.upsert({
      where: { userId_businessUnitId: { userId: admin.id, businessUnitId: mkl.id } },
      update: {},
      create: { userId: admin.id, businessUnitId: mkl.id },
    }),
    db.userBusinessUnit.upsert({
      where: { userId_businessUnitId: { userId: admin.id, businessUnitId: hcl.id } },
      update: {},
      create: { userId: admin.id, businessUnitId: hcl.id },
    }),
  ])

  console.log('✅ Super admin seeded')
  console.log('')
  console.log('🎉 Seeding complete!')
  console.log('   Super Admin: admin@nexflow.com / NexFlow@Admin2025')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
