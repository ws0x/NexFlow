import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@/generated/prisma/client'
import ws from 'ws'

// db.ts is only loaded in Node.js serverless functions (never Edge).
// Always use the `ws` package — native WebSocket (Node ≥21) has subtle
// differences that can hang the Neon proxy handshake on Vercel.
neonConfig.webSocketConstructor = ws

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * `channel_binding=require` is a PostgreSQL TCP/TLS feature.
 * Neon's serverless driver uses WebSocket — channel binding is not
 * supported at that layer and causes the connection to hang.
 */
function sanitizeConnectionString(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.delete('channel_binding')
    return u.toString()
  } catch {
    return url
  }
}

function createClient(): PrismaClient {
  const connectionString = sanitizeConnectionString(process.env.DATABASE_URL ?? '')
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter } as any)
}

export const db: PrismaClient = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
