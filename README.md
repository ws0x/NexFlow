<div align="center">

<br />

```
 ███╗   ██╗███████╗██╗  ██╗███████╗██╗      ██████╗ ██╗    ██╗
 ████╗  ██║██╔════╝╚██╗██╔╝██╔════╝██║     ██╔═══██╗██║    ██║
 ██╔██╗ ██║█████╗   ╚███╔╝ █████╗  ██║     ██║   ██║██║ █╗ ██║
 ██║╚██╗██║██╔══╝   ██╔██╗ ██╔══╝  ██║     ██║   ██║██║███╗██║
 ██║ ╚████║███████╗██╔╝ ██╗██║     ███████╗╚██████╔╝╚███╔███╔╝
 ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝
```

**Intelligent Lead Pipeline Management**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-336791?style=flat-square&logo=postgresql&logoColor=white)](https://prisma.io)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square&logo=vercel)](https://nexflow-os.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-06b6d4?style=flat-square)](LICENSE)

[**Live App →**](https://nexflow-os.vercel.app) &nbsp;·&nbsp; [Architecture](#architecture) &nbsp;·&nbsp; [Engineering Deep-Dive](#engineering-deep-dive) &nbsp;·&nbsp; [Getting Started](#getting-started)

</div>

---

## The Problem It Solves

Before NexFlow, four business entities (HSL, MGL, MKL, HCL) each ran their own Excel sheet. Lead tracking meant version-conflicted spreadsheets, no cross-team visibility, zero accountability when a lead fell through, and no way to answer the basic question: *what happened to this customer?*

NexFlow replaces that chaos with a structured pipeline — from first marketing contact to closed deal — with every step tracked, every role in control of exactly what they should see, and every change permanently logged.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         NexFlow Platform                         │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────────┐  │
│  │Marketing │   │  Sales   │   │ Manager  │   │ Super Admin │  │
│  │  Layer   │   │  Layer   │   │  Layer   │   │   Layer     │  │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └──────┬──────┘  │
│       │              │              │                 │          │
│  ┌────▼──────────────▼──────────────▼─────────────────▼──────┐  │
│  │                  API Security Stack                         │  │
│  │  Session → Role → BU Scope → Dept Scope → Field Filter     │  │
│  └────────────────────────────┬────────────────────────────── ┘  │
│                               │                                  │
│  ┌────────────────────────────▼────────────────────────────── ┐  │
│  │                     PostgreSQL (Prisma)                      │  │
│  │  leads · users · business_units · departments · audit_log   │  │
│  └─────────────────────────────────────────────────────────── ┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, API routes, middleware — one codebase |
| Language | TypeScript | End-to-end type safety from DB schema to UI |
| Database | PostgreSQL (Neon / Supabase) | Relational, audit-friendly, ACID transactions |
| ORM | Prisma | Type-safe DB access, atomic transactions for REQ codes |
| Auth | NextAuth.js v5 | JWT sessions with role + BU data embedded |
| Styling | Tailwind CSS + Shadcn/ui | Dark design system, accessible primitives |
| Charts | Recharts | Pipeline analytics, KPI trends, sector heatmaps |
| Voice | Whisper AI | Egyptian Arabic transcription, mixed Arabic/EN |
| Excel | xlsx | Import historical data, export filtered views |
| PWA | Service Worker | Installable on iOS/Android, offline shell caching |
| Hosting | Vercel + Neon | Zero-config deploys, serverless PostgreSQL |

---

## Engineering Deep-Dive

### 1. REQ Code Engine — Atomic, Conflict-Free Sequence Generation

Every lead gets a unique identifier on creation:

```
HSL · 5 · 06 · 24 · 0001
 ↑    ↑   ↑    ↑     ↑
Entity Year Month Day  Daily sequence (per BU)
```

The naive approach — `SELECT MAX(sequence) + 1` — breaks under concurrent submissions. NexFlow uses a `lead_sequences` table with an atomic `UPDATE ... RETURNING` pattern inside a Prisma transaction:

```typescript
// lib/req-code.ts
export async function generateReqCode(
  tx: Prisma.TransactionClient,
  businessUnitId: string,
  prefix: string
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10); // "2025-06-24"

  const seq = await tx.leadSequence.upsert({
    where:  { businessUnitId_date: { businessUnitId, date: today } },
    create: { businessUnitId, date: today, sequence: 1 },
    update: { sequence: { increment: 1 } },
  });

  const [y, m, d] = today.split("-");
  const code = `${prefix}${y.slice(-1)}${m}${d}${String(seq.sequence).padStart(4, "0")}`;
  return code; // → "HSL506240001"
}
```

Result: multiple marketing reps can submit leads simultaneously with zero duplicate REQ codes, zero locks held at the application layer.

---

### 2. Field-Level RBAC — Server-Side, Not CSS

The most important architectural decision: **field visibility is enforced at the API layer, not the UI layer**.

Every lead field belongs to one of three permission groups:

| Group | Who can view | Who can edit |
|---|---|---|
| `MUTUAL` | All roles | Marketing (on create) |
| `MARKETING` | Marketing, Manager, Admin | Marketing only |
| `SALES` | Sales (own dept), Manager, Admin | Sales only |

The field filter runs on the server before the response leaves:

```typescript
// lib/field-permissions.ts
export function filterLeadForRole(lead: Lead, role: Role): Partial<Lead> {
  const mutual    = pickMutualFields(lead);
  const marketing = role !== "SALES"     ? pickMarketingFields(lead) : {};
  const sales     = role !== "MARKETING" ? pickSalesFields(lead)     : {};
  return { ...mutual, ...marketing, ...sales };
}
```

A Sales user's network tab will never contain a `leadSource`, `marketingNotes`, or `directedToDepartmentId` — those keys don't exist in the response payload.

---

### 3. Five-Layer API Security Stack

Every protected route runs through this chain in order — a request failing any check is rejected before reaching the next:

```
1. Session check     → 401 Unauthorized if no valid JWT
2. Role check        → 403 Forbidden if role lacks permission for this action
3. BU scope check    → 403 if lead's business unit is not in user's BU list
4. Dept scope check  → 403 if Sales user's department ≠ lead's directed department
5. Field filter      → Strip fields not visible to this role before responding
```

This means a compromised Sales session cannot read Marketing strategy data even with a crafted request — the BU and field filters run unconditionally.

---

### 4. WhatsApp Integration — Swappable Adapter Pattern

The handoff notification was designed to swap providers without touching call-sites:

```typescript
// lib/whatsapp.ts
interface WhatsAppAdapter {
  buildUrl(to: string, message: string): string;
}

class WaMeAdapter implements WhatsAppAdapter {
  buildUrl(to: string, message: string) {
    return `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
  }
}

// v2: class MetaBusinessApiAdapter implements WhatsAppAdapter { ... }
// v2: class TwilioAdapter implements WhatsAppAdapter { ... }

export const whatsapp = new WaMeAdapter(); // swap via WHATSAPP_PROVIDER env var
```

The card template itself is configurable per business unit — each entity can define which fields appear and in what order, managed in-app by Super Admin.

---

### 5. Voice Transcription — Egyptian Arabic Support

Standard speech-to-text APIs fail on Egyptian dialect Arabic, especially mixed with English technical terms (product names, measurements). NexFlow routes audio through OpenAI Whisper with explicit language prompting:

```typescript
// app/api/transcribe/route.ts
const transcription = await openai.audio.transcriptions.create({
  file:     audioBlob,
  model:    "whisper-1",
  language: "ar",
  prompt:   "نص باللغة العربية المصرية، قد يحتوي على مصطلحات إنجليزية تقنية",
});
```

The `prompt` parameter primes Whisper with Egyptian Arabic context, dramatically improving accuracy for mixed-language input. The voice button appears on every text field in the lead form.

---

### 6. Audit Trail — Immutable Change Log

Every field change on every lead is logged to `lead_history` before the update commits:

```prisma
model LeadHistory {
  id         String   @id @default(cuid())
  leadId     String
  userId     String
  field      String   // e.g. "requestStatus"
  oldValue   String?
  newValue   String?
  changedAt  DateTime @default(now())
  lead       Lead     @relation(fields: [leadId], references: [id])
  user       User     @relation(fields: [userId], references: [id])
}
```

The UI renders this as a chronological timeline per lead: who changed what, when, and what the value was before. Super Admin has a system-wide audit view across all leads and all entities.

---

### 7. Excel Migration Tool

Onboarding existing data was a hard requirement. The import flow:

1. User uploads `.xlsx` — parsed client-side with `xlsx`
2. Column auto-mapper suggests field matches based on header text similarity
3. Preview renders with per-row validation (missing required fields, malformed dates, duplicate REQ codes highlighted)
4. Confirmed rows bulk-insert with a `isHistorical: true` flag
5. Historical leads skip WhatsApp notifications and audit trail triggers

Historical data became searchable and contributed to analytics from Day 1 of deployment.

---

## Feature Overview

| Feature | Status |
|---|---|
| Multi-entity lead pipeline (4 BUs) | ✅ Live |
| Field-level RBAC (Marketing / Sales / Manager / Admin) | ✅ Live |
| REQ Code generation (atomic, conflict-free) | ✅ Live |
| WhatsApp lead card handoff | ✅ Live |
| Lead search by REQ code | ✅ Live |
| Analytics dashboard (KPIs, charts, filters) | ✅ Live |
| Audit trail (per-field change history) | ✅ Live |
| Voice transcription — Egyptian Arabic (Whisper AI) | ✅ Live |
| Excel import with validation & conflict detection | ✅ Live |
| Excel export (filtered views) | ✅ Live |
| PWA — installable, offline shell | ✅ Live |
| Mobile bottom navigation bar | ✅ Live |
| In-app notifications | ✅ Live |
| Admin: user + BU + department management | ✅ Live |
| Admin: configurable dropdown values | ✅ Live |
| Admin: per-BU lead card template editor | ✅ Live |
| WhatsApp Business API (programmatic send) | 🗓️ v2 |
| Lead comments thread (per-lead conversation) | 🗓️ v2 |
| AI lead scoring by sector/source patterns | 🗓️ v2 |
| Multi-tenant SaaS (other companies) | 🗓️ v2 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database ([Neon](https://neon.tech) or [Supabase](https://supabase.com) — both have free tiers)

### 1. Clone & install

```bash
git clone https://github.com/ws0x/nexflow.git
cd nexflow
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
DATABASE_URL="postgresql://..."         # Your Neon/Supabase connection string
AUTH_SECRET="..."                       # node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="NexFlow"

# Optional: OpenAI for voice transcription
OPENAI_API_KEY="sk-..."
```

### 3. Set up the database

```bash
npm run db:push    # Push schema to your database
npm run db:seed    # Seed BUs, dropdowns, and a Super Admin account
```

Default Super Admin credentials (change immediately after first login):
- **Email:** `admin@nexflow.com`
- **Password:** `NexFlow@Admin2025`

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
nexflow/
├── docs/
│   ├── architecture.md        # System design & data flow
│   ├── schema.md              # Database schema reference
│   ├── permissions.md         # RBAC field permission rules
│   ├── roadmap.md             # Phase-by-phase build plan
│   └── deployment.md          # Vercel + Neon deployment guide
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Initial BUs, dropdowns, admin user
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # Login page
│   │   ├── (dashboard)/
│   │   │   ├── leads/         # Lead list, detail, new lead form
│   │   │   ├── analytics/     # Manager dashboard
│   │   │   └── admin/         # Super Admin panel
│   │   ├── actions/           # Next.js Server Actions
│   │   └── api/               # REST endpoints (auth, leads, export)
│   ├── components/
│   │   ├── leads/             # Lead form, table, import wizard
│   │   ├── analytics/         # Chart components (Recharts)
│   │   ├── admin/             # Permissions matrix, user management
│   │   └── layout/            # Sidebar, header, notification bell
│   └── lib/
│       ├── req-code.ts        # Atomic REQ code generator
│       ├── field-permissions.ts  # Role-based field filter
│       ├── permissions.ts     # Route & action guards
│       ├── whatsapp.ts        # WhatsApp adapter
│       └── auth.ts            # NextAuth configuration
└── public/
    ├── manifest.json          # PWA manifest
    └── sw.js                  # Service worker
```

---

## Deployment

Full guide in [`docs/deployment.md`](docs/deployment.md). Short version:

1. Push schema to your database: `npm run db:push && npm run db:seed`
2. Create a Vercel project, import this repo
3. Set the environment variables listed above
4. Deploy — Vercel runs `prisma generate` automatically via `postinstall`

---

## Business Context

NexFlow was built for a company operating four business units in the industrial machinery and handling sector in Egypt. The system is in active daily use by Marketing, Sales, and Management teams across all four entities.

Key outcomes after deployment:
- Lead entry and routing reduced from hours (shared file synchronisation) to minutes
- Zero duplicate leads since switching from Excel to REQ-coded pipeline
- Full audit trail eliminated disputes about "who changed what"
- Managers have cross-entity pipeline visibility for the first time

---

<div align="center">

Built by [Yusuf Hakim](https://binhakim.dev) &nbsp;·&nbsp; [binhakim.dev](https://binhakim.dev)

</div>
