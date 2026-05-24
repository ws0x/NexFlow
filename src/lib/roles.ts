/**
 * Pure-data role constants — safe to import in Client Components.
 * (No Prisma / Node.js imports here)
 */

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER:     'Manager',
  MARKETING:   'Marketing',
  SALES:       'Sales',
}

export const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#A78BFA', // violet-400
  MANAGER:     '#60A5FA', // blue-400
  MARKETING:   '#34D399', // emerald-400
  SALES:       '#FBBF24', // amber-400
}
