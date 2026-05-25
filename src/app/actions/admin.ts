'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { canManageUsers } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import type { Role } from '@/generated/prisma/client'
import * as z from 'zod'

// ─── Guard ───────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || !canManageUsers(session.user.role as Role)) {
    throw new Error('Forbidden')
  }
  return session
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  name:            z.string().min(2, { error: 'Name must be at least 2 characters' }),
  email:           z.email({ error: 'Invalid email address' }),
  password:        z.string().min(8, { error: 'Password must be at least 8 characters' }),
  role:            z.enum(['SUPER_ADMIN', 'MANAGER', 'MARKETING', 'SALES']),
  phone:           z.string().optional(),
  businessUnitIds: z.string(), // comma-separated
  departmentIds:   z.string().optional(),
})

const updateUserSchema = z.object({
  id:              z.string(),
  name:            z.string().min(2, { error: 'Name must be at least 2 characters' }),
  email:           z.email({ error: 'Invalid email address' }),
  password:        z.string().optional(), // only if changing
  role:            z.enum(['SUPER_ADMIN', 'MANAGER', 'MARKETING', 'SALES']),
  phone:           z.string().optional(),
  businessUnitIds: z.string(),
  departmentIds:   z.string().optional(),
})

// ─── Users ───────────────────────────────────────────────────────────────────

export async function createUser(formData: FormData) {
  await requireAdmin()

  const raw = Object.fromEntries(formData.entries())
  const data = createUserSchema.parse(raw)

  const existing = await db.user.findUnique({ where: { email: data.email } })
  if (existing) throw new Error('A user with this email already exists')

  const hashedPassword = await bcrypt.hash(data.password, 12)
  const buIds = data.businessUnitIds.split(',').filter(Boolean)
  const deptIds = data.departmentIds?.split(',').filter(Boolean) ?? []

  const user = await db.user.create({
    data: {
      name:     data.name,
      email:    data.email,
      password: hashedPassword,
      role:     data.role as Role,
      phone:    data.phone || null,
    },
  })

  // Assign BUs
  if (buIds.length > 0) {
    await db.userBusinessUnit.createMany({
      data: buIds.map((buId) => ({ userId: user.id, businessUnitId: buId })),
    })
  }

  // Assign departments (for sales)
  if (deptIds.length > 0) {
    await db.userDepartment.createMany({
      data: deptIds.map((deptId) => ({ userId: user.id, departmentId: deptId })),
    })
  }

  revalidatePath('/admin/users')
  redirect('/admin/users')
}

export async function updateUser(formData: FormData) {
  await requireAdmin()

  const raw = Object.fromEntries(formData.entries())
  const data = updateUserSchema.parse(raw)
  const buIds   = data.businessUnitIds.split(',').filter(Boolean)
  const deptIds = data.departmentIds?.split(',').filter(Boolean) ?? []

  // Check email uniqueness (excluding self)
  const existing = await db.user.findFirst({
    where: { email: data.email, NOT: { id: data.id } },
  })
  if (existing) throw new Error('Email is already used by another account')

  const updateData: any = {
    name:  data.name,
    email: data.email,
    role:  data.role as Role,
    phone: data.phone || null,
  }

  if (data.password && data.password.length >= 8) {
    updateData.password = await bcrypt.hash(data.password, 12)
  }

  await db.user.update({ where: { id: data.id }, data: updateData })

  // Re-assign BUs (delete all then re-create)
  await db.userBusinessUnit.deleteMany({ where: { userId: data.id } })
  if (buIds.length > 0) {
    await db.userBusinessUnit.createMany({
      data: buIds.map((buId) => ({ userId: data.id, businessUnitId: buId })),
    })
  }

  // Re-assign departments
  await db.userDepartment.deleteMany({ where: { userId: data.id } })
  if (deptIds.length > 0) {
    await db.userDepartment.createMany({
      data: deptIds.map((deptId) => ({ userId: data.id, departmentId: deptId })),
    })
  }

  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${data.id}`)
  redirect('/admin/users')
}

export async function toggleUserStatus(userId: string) {
  const session = await requireAdmin()

  // Prevent self-deactivation
  if (userId === session.user.id) throw new Error('Cannot deactivate your own account')

  const user = await db.user.findUnique({ where: { id: userId }, select: { isActive: true } })
  if (!user) throw new Error('User not found')

  await db.user.update({
    where: { id: userId },
    data:  { isActive: !user.isActive },
  })

  revalidatePath('/admin/users')
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireAdmin()
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')

  const hashed = await bcrypt.hash(newPassword, 12)
  await db.user.update({ where: { id: userId }, data: { password: hashed } })
  revalidatePath(`/admin/users/${userId}`)
}

// ─── Business Units ───────────────────────────────────────────────────────────

export async function updateBusinessUnit(formData: FormData) {
  await requireAdmin()

  const id     = formData.get('id') as string
  const name   = formData.get('name') as string
  const phone  = formData.get('coordinatorPhone') as string
  const apiKey = formData.get('coordinatorApiKey') as string

  await db.businessUnit.update({
    where: { id },
    data:  {
      name,
      coordinatorPhone:  phone  || null,
      coordinatorApiKey: apiKey || null,
    },
  })

  revalidatePath('/admin/business-units')
}

// ─── Dropdowns ────────────────────────────────────────────────────────────────

export async function createDropdownOption(formData: FormData) {
  await requireAdmin()

  const category = formData.get('category') as string
  const value    = formData.get('value') as string
  const valueAr  = formData.get('valueAr') as string | null

  if (!category || !value) throw new Error('Category and value are required')

  // Get max order for this category
  const maxOrder = await db.dropdownOption.aggregate({
    where:   { category },
    _max:    { order: true },
  })

  await db.dropdownOption.create({
    data: {
      category,
      value,
      valueAr: valueAr || null,
      order:   (maxOrder._max.order ?? -1) + 1,
    },
  })

  revalidatePath('/admin/dropdowns')
}

export async function updateDropdownOption(formData: FormData) {
  await requireAdmin()

  const id      = formData.get('id') as string
  const value   = formData.get('value') as string
  const valueAr = formData.get('valueAr') as string | null

  await db.dropdownOption.update({
    where: { id },
    data:  { value, valueAr: valueAr || null },
  })

  revalidatePath('/admin/dropdowns')
}

export async function toggleDropdownOption(id: string) {
  await requireAdmin()

  const opt = await db.dropdownOption.findUnique({ where: { id }, select: { isActive: true } })
  if (!opt) throw new Error('Option not found')

  await db.dropdownOption.update({
    where: { id },
    data:  { isActive: !opt.isActive },
  })

  revalidatePath('/admin/dropdowns')
}

export async function reorderDropdownOptions(ids: string[]) {
  await requireAdmin()

  await Promise.all(
    ids.map((id, index) =>
      db.dropdownOption.update({ where: { id }, data: { order: index } })
    )
  )

  revalidatePath('/admin/dropdowns')
}

export async function deleteDropdownOption(id: string) {
  await requireAdmin()

  // Check if it's used by any lead before deleting
  const opt = await db.dropdownOption.findUnique({ where: { id } })
  if (!opt) throw new Error('Option not found')

  // Soft delete (deactivate) instead of hard delete to preserve lead history
  await db.dropdownOption.update({
    where: { id },
    data:  { isActive: false },
  })

  revalidatePath('/admin/dropdowns')
}
