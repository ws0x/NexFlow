# NexFlow — Project Roadmap

> **App:** NexFlow — B2B Leads Tracking & Pipeline Management
> **Company:** Makka Corp (Internal + future SaaS product)
> **Stack:** Next.js 14 · TypeScript · Tailwind · PostgreSQL · Prisma · NextAuth.js

---

## Business Units & Prefixes

| Business Unit    | REQ Code Prefix |
|-----------------|-----------------|
| MIG - Handling  | `HSL`           |
| MIG - Poultry   | `MGL`           |
| EPPS            | `MKL`           |

REQ Code format: `[PREFIX][Y][MM][DD][XXXX]`
Example: `HSL506240001` = MIG-Handling · 2025 · June · 24 · first lead of the day

---

## Phase 0 — Foundation *(Week 1)*

- [x] Next.js 14 + TypeScript + Tailwind + Shadcn/ui project scaffold
- [ ] PostgreSQL database connection
- [ ] Prisma schema (full data model)
- [ ] CI/CD: GitHub → Vercel auto-deploy
- [ ] Environment config (dev / staging / prod)

**Deliverable:** App boots, connects to DB, super admin can log in.

---

## Phase 1 — Auth & User Management *(Week 1–2)*

- [ ] Email + password authentication (NextAuth.js v5)
- [ ] Session management (JWT)
- [ ] Super Admin panel: create / edit / deactivate users
- [ ] Role assignment: SUPER_ADMIN / MANAGER / MARKETING / SALES
- [ ] Business Unit assignment per user (multi-select: HSL, MGL, MKL)
- [ ] Department assignment per sales user
- [ ] BU coordinator phone number config
- [ ] Password reset flow

**Deliverable:** Super Admin can build the full team with correct permissions before launch.

---

## Phase 2 — Dropdown Configuration System *(Week 2)*

- [ ] Super Admin manages all dropdown values in-app
  - Company Types, Sectors, Lead Types, Channels, Sources, Departments, Statuses
- [ ] Add / edit / deactivate / reorder any value
- [ ] Arabic translations per dropdown value
- [ ] No code deploy needed to update options

**Deliverable:** All dropdowns are configurable without a developer.

---

## Phase 3 — REQ Code Engine + Lead Schema *(Week 2)*

- [ ] Auto-generate REQ codes: `HSL5062400001`
- [ ] Daily sequence per BU (resets each day, zero-padded to 4 digits)
- [ ] Full lead database model (mutual + marketing + sales fields)
- [ ] Field-level permission tagging
- [ ] Full audit trail table (every change → a log row)

**Deliverable:** Database ready to receive leads with correct code generation.

---

## Phase 4 — Marketing Lead Entry Module *(Week 3)*

- [ ] Multi-step lead entry form
  - Step 1: Company Info
  - Step 2: Contact Info
  - Step 3: Lead Details (request, type, source, channel, notes)
  - Step 4: Routing (directed to department, new client, referral)
- [ ] Voice-to-text input on every text field
- [ ] Auto-fill REQUEST DATE and REQ CODE
- [ ] Draft save (don't lose progress on navigation)
- [ ] Zod form validation with Arabic/English error messages
- [ ] Submission confirmation with generated REQ code

**Deliverable:** Marketing can fully replace their Excel entry workflow.

---

## Phase 5 — Handoff & WhatsApp Notification *(Week 3–4)*

- [ ] "Send to Sales" trigger on completed leads
- [ ] WhatsApp Lead Card formatter
- [ ] MVP: `wa.me` deep link (pre-filled message to BU coordinator)
- [ ] Architecture: notification service abstracted (swap to Meta API / Twilio later)
- [ ] In-app notification to BU manager on handoff
- [ ] Lead locked for marketing editing after handoff

**WhatsApp Card Format:**
```
🔔 *New Lead — HSL506240001*
━━━━━━━━━━━━━━━━━━━━━━━━
📅 24 May 2025  |  MIG - Handling
🏢 Company Name  •  Commercial Company
📞 Contact Name  |  +20 1XX XXX XXXX
📧 email@example.com
🌍 Egypt — Cairo
🏭 Sector: Industrial Equipment
📋 Request: [Lead Request text]
🔗 Source: Facebook Ads → WhatsApp
🎯 Type: Client
👥 Directed to: Supply Chain
📝 Notes: [Marketing notes]
━━━━━━━━━━━━━━━━━━━━━━━━
```

**Deliverable:** Every lead generates a ready-to-send WhatsApp card to the right coordinator.

---

## Phase 6 — Sales Module *(Week 4–5)*

- [ ] Sales dashboard: leads directed to their department in their BU
- [ ] Lead search by REQ code (real-time smooth fetch)
- [ ] Lead detail: mutual fields visible, marketing fields completely hidden (not rendered)
- [ ] Sales fields form: Response, Response Date, Status
- [ ] On completion → notify marketing + BU manager (close loop)

**Deliverable:** Salespeople complete the cycle without ever seeing marketing strategy data.

---

## Phase 7 — Manager & Unified View *(Week 5)*

- [ ] Manager sees all leads across assigned BUs (view only)
- [ ] Unified table: all fields visible (mutual + marketing + sales)
- [ ] Filter by: BU, department, status, date range, source, sector
- [ ] Sort by any column
- [ ] Lead detail modal with full audit timeline
- [ ] Export current view to Excel

**Deliverable:** Managers have one screen that replaces the unified manager sheet.

---

## Phase 8 — Analytics Dashboard *(Week 6)*

**KPI Cards:**
- Total Leads This Month | vs Last Month
- Conversion Rate (Turned Into Order / Total)
- Avg Sales Response Time
- Top Source This Month

**Charts:**
- [ ] Lead Volume — Line chart by week/month, split by BU + status
- [ ] Conversion Funnel — Sankey: Received → Sent → Response → Won/Lost
- [ ] Source ROI — Bar: which source drives "Turned Into Order"
- [ ] Department Performance — response speed + close rate
- [ ] Sector Heatmap — most active industries
- [ ] Status Breakdown — donut by current status

**Global Filters:** Business Unit · Date Range · Source · Sector · Department · Status

**Deliverable:** Decision makers know what to act on in under 30 seconds.

---

## Phase 9 — Audit Trail UI *(Week 6)*

- [ ] Every lead has a "History" tab
- [ ] Timeline per change: user, timestamp, field, old → new value
- [ ] Filter by: field, user, date
- [ ] Super Admin sees full system audit log

**Deliverable:** Full accountability. No disputes about who changed what.

---

## Phase 10 — Bilingual + RTL + PWA *(Week 7)*

- [ ] English / Arabic language toggle (persists in user settings)
- [ ] Full RTL layout flip for Arabic
- [ ] Arabic translations: all UI labels, errors, status values, dropdown options
- [ ] PWA manifest + service worker
- [ ] Installable on phone home screen
- [ ] Offline: view cached leads, queue form submissions
- [ ] Push notifications for in-app alerts
- [ ] Mobile bottom navigation bar
- [ ] Touch-optimized form controls

**Deliverable:** App feels native on mobile, installs like an app, full Arabic support.

---

## Phase 11 — Excel Migration Tool *(Week 7–8)*

- [ ] Upload existing Excel file
- [ ] Auto-map columns to system fields
- [ ] Preview with validation errors highlighted
- [ ] Bulk import with conflict detection (duplicate REQ codes)
- [ ] Import report (succeeded / failed with reasons)
- [ ] Imported leads flagged as "Historical" — no WhatsApp triggered

**Deliverable:** All historical data is searchable and contributes to analytics from Day 1.

---

## Phase 12 — QA, Hardening & Launch *(Week 8–9)*

- [ ] Role penetration testing (can sales ever see marketing fields?)
- [ ] Mobile QA: iOS + Android browsers
- [ ] Performance: 1000+ leads load time
- [ ] Error boundaries + graceful failure states
- [ ] Loading skeletons
- [ ] Staging UAT with the team
- [ ] Production deployment + domain
- [ ] Admin onboarding + user guide

**Deliverable:** Live app, real users, real leads.

---

## v2 Roadmap (Post-Launch)

| Feature | Description |
|---|---|
| WhatsApp Business API | Programmatic send via Meta/Twilio, delivery receipts |
| Person-level assignment | Route to specific salesperson, not just department |
| Lead comments thread | Marketing ↔ Coordinator ↔ Sales per-lead conversation |
| Email notifications | Backup channel for all WhatsApp alerts |
| Lead scoring | AI priority ranking by sector/type/source patterns |
| CRM export | Push to HubSpot / Zoho |
| Multi-tenant SaaS | Onboard other companies, tenant isolation, Stripe billing |
| Mobile native apps | React Native if PWA isn't sufficient |

---

## Timeline Summary

| Phase | Duration | Key Output |
|---|---|---|
| 0–2 | Week 1–2 | Foundation · Auth · Dropdowns |
| 3–5 | Week 2–4 | Lead Entry · Handoff · WhatsApp |
| 6–7 | Week 4–5 | Sales Module · Manager View |
| 8–9 | Week 6 | Dashboard · Audit Trail |
| 10–11 | Week 7–8 | PWA · Bilingual · Migration |
| 12 | Week 8–9 | QA · Launch |

**Total: ~9 weeks for production-ready v1**
