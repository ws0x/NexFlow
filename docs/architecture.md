# NexFlow — Architecture

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack React, SSR, API routes |
| Language | TypeScript | Type safety across frontend + backend |
| Styling | Tailwind CSS + Shadcn/ui | Design system, dark theme |
| Database | PostgreSQL | Relational, audit-friendly |
| ORM | Prisma | Type-safe DB access, migrations |
| Auth | NextAuth.js v5 | Email/password, JWT sessions |
| Forms | React Hook Form + Zod | Validation, type inference |
| Charts | Recharts | Analytics dashboard |
| i18n | next-intl | English + Arabic RTL |
| Icons | Lucide React | Consistent icon set |
| Dates | date-fns | Date formatting + manipulation |
| Excel | xlsx | Import/export Excel files |
| Notifications | Sonner (toast) | In-app toast notifications |
| Hosting | Vercel + Supabase | Managed, scalable, free tier |

---

## Directory Structure

```
nexflow/
├── docs/                    # Project documentation
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Initial data (BUs, dropdowns)
├── src/
│   ├── app/
│   │   ├── (auth)/          # Unauthenticated routes
│   │   │   └── login/
│   │   ├── (dashboard)/     # Authenticated routes
│   │   │   ├── layout.tsx   # Sidebar + nav shell
│   │   │   ├── leads/       # Lead list + detail
│   │   │   ├── leads/new/   # Marketing: new lead form
│   │   │   ├── analytics/   # Manager: dashboard
│   │   │   └── admin/       # Super Admin panel
│   │   ├── api/
│   │   │   ├── auth/        # NextAuth endpoints
│   │   │   ├── leads/       # Lead CRUD + actions
│   │   │   ├── users/       # User management
│   │   │   ├── dropdowns/   # Dropdown config
│   │   │   └── analytics/   # Dashboard data
│   │   ├── layout.tsx       # Root layout
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   ├── ui/              # Shadcn/ui primitives
│   │   ├── layout/          # Sidebar, header, nav
│   │   ├── leads/           # Lead form, card, table
│   │   ├── analytics/       # Chart components
│   │   └── admin/           # Admin panel components
│   ├── lib/
│   │   ├── auth.ts          # NextAuth config
│   │   ├── db.ts            # Prisma client singleton
│   │   ├── permissions.ts   # Role + field access helpers
│   │   ├── req-code.ts      # REQ code generator
│   │   ├── whatsapp.ts      # WhatsApp card formatter
│   │   └── utils.ts         # General utilities
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   └── middleware.ts        # Route protection
└── public/
    ├── manifest.json        # PWA manifest
    └── icons/               # PWA icons
```

---

## Authentication Flow

```
Login Page → POST /api/auth/signin
          → NextAuth validates credentials
          → Fetches user + role + BU assignments
          → JWT contains: { id, role, businessUnits[], departments[] }
          → Middleware reads JWT on every request
          → Redirects to role-appropriate landing page
```

Landing pages by role:
- MARKETING → `/leads/new`
- SALES → `/leads` (their dept queue)
- MANAGER → `/analytics`
- SUPER_ADMIN → `/admin`

---

## API Security Layers

Every API route runs through this stack (in order):

```
1. Session check     → 401 if not authenticated
2. Role check        → 403 if wrong role for this action
3. BU scope check    → 403 if lead's BU not in user's BU list
4. Dept scope check  → 403 if sales user's dept doesn't match (sales only)
5. Field filter      → Strip fields not visible to this role
6. Response          → Cleaned, role-safe payload
```

---

## WhatsApp Integration (Swappable Adapter)

```typescript
// lib/whatsapp.ts
interface WhatsAppAdapter {
  send(to: string, message: string): Promise<void>
}

// Adapter 1: wa.me deep link (MVP - no API needed)
// Adapter 2: Meta Business Cloud API
// Adapter 3: Twilio WhatsApp

// Switch adapter via WHATSAPP_PROVIDER env var
```

---

## Notification Strategy

| Channel | Used For | MVP? |
|---|---|---|
| WhatsApp (wa.me) | Lead card to coordinator | ✅ Day 1 |
| In-app (Sonner) | Real-time toasts | ✅ Day 1 |
| WhatsApp Business API | Programmatic send | v2 |
| Email | Backup notifications | v2 |
| Push notifications | PWA alerts | v2 |

---

## Color System (Dark Theme)

```css
--background:   #0F172A  /* slate-900 — deep navy */
--card:         #1E293B  /* slate-800 */
--border:       #334155  /* slate-700 */
--accent:       #06B6D4  /* cyan-500 — primary brand */
--accent-hover: #0891B2  /* cyan-600 */
--text:         #F1F5F9  /* slate-100 */
--muted:        #94A3B8  /* slate-400 */

/* Status colors */
--status-won:       #22C55E  /* green-500 */
--status-lost:      #EF4444  /* red-500 */
--status-quoting:   #F59E0B  /* amber-500 */
--status-progress:  #3B82F6  /* blue-500 */
--status-unknown:   #6B7280  /* gray-500 */
```
