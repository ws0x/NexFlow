# NexFlow — Permissions & Access Control

## Role × Field Visibility Matrix

| Field Group       | MARKETING        | SALES            | MANAGER     | SUPER_ADMIN |
|-------------------|------------------|------------------|-------------|-------------|
| Mutual Fields     | Create + View    | View only        | View only   | Full        |
| Marketing Fields  | Create + View    | **Never rendered** | View only | Full        |
| Sales Fields      | **Never rendered** | Edit + View    | View only   | Full        |

> **"Never rendered"** = not hidden behind a toggle. The fields are literally not sent to the client.

---

## Role × Feature Access Matrix

| Feature                     | MARKETING | SALES | MANAGER | SUPER_ADMIN |
|-----------------------------|-----------|-------|---------|-------------|
| Create new lead             | ✅         | ❌     | ❌       | ✅           |
| View own leads              | ✅         | ✅     | ✅       | ✅           |
| View all BU leads           | ❌         | ❌     | ✅       | ✅           |
| Send lead to sales          | ✅         | ❌     | ❌       | ✅           |
| Complete sales fields        | ❌         | ✅     | ❌       | ✅           |
| Edit mutual fields          | Own, pre-handoff | ❌ | ❌  | ✅           |
| Analytics dashboard         | ❌         | ❌     | ✅       | ✅           |
| Audit trail view            | Own leads  | Own dept | Full BU | Full system |
| Export to Excel             | ❌         | ❌     | ✅       | ✅           |
| User management             | ❌         | ❌     | ❌       | ✅           |
| Dropdown config             | ❌         | ❌     | ❌       | ✅           |
| BU / dept config            | ❌         | ❌     | ❌       | ✅           |
| Import historical data      | ❌         | ❌     | ❌       | ✅           |

---

## Business Unit Scoping

Every user is assigned to one or more BUs:
- `HSL` — MIG Handling
- `MGL` — MIG Poultry
- `MKL` — EPPS

A user can only see, create, or act on leads that belong to their assigned BUs.
Managers see all leads in all their assigned BUs.

---

## Department Scoping (Sales)

Sales users are additionally assigned to one or more departments.
They can only see leads where `directedToDepartment` matches their assigned department(s).

**Current departments:**
- Agricultural Agencies
- Automation Agencies
- Factory Equipment
- Machinery Sales
- Maintenance & Technical Support
- Material Sales
- Plastic Agencies
- Supply Chain

*Future:* Lead can be directed to a specific salesperson (not just department).

---

## Lead Lifecycle & Locking

```
[DRAFT] ──► [SUBMITTED] ──► [SENT_TO_SALES] ──► [COMPLETED]
              Marketing        Marketing locks      Sales fills
              can edit         mutual fields        sales fields
```

- **DRAFT**: Marketing is still filling the form (auto-saved)
- **SUBMITTED**: Lead saved, marketing can still edit mutual fields
- **SENT_TO_SALES**: WhatsApp card sent, mutual fields locked for marketing
- **COMPLETED**: Sales has filled their fields, loop is closed, notifications sent

---

## Notification Routing

| Event | Notified |
|---|---|
| Lead submitted | Marketing (confirmation) |
| Lead sent to sales | BU Coordinator (WhatsApp card) + BU Manager (in-app) |
| Sales completes fields | Original marketing user (in-app) + BU Manager (in-app) |

---

## API Security Model

All API routes are protected by:
1. Session check (NextAuth — must be authenticated)
2. Role check (must have required role)
3. BU scope check (lead's BU must be in user's assigned BUs)
4. Department scope check (for sales: lead's department must match)
5. Field filter (API response strips fields based on role before returning)

Field stripping happens server-side — MARKETING fields are never included in the
API response for SALES role, and vice versa.
