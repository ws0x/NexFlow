# NexFlow — Database Schema

## Tables Overview

```
users                 — All system users with role + BU assignment
business_units        — HSL / MGL / MKL with coordinator config
departments           — Sales departments (Supply Chain, Machinery Sales, etc.)
user_business_units   — Junction: which BUs a user can access
user_departments      — Junction: which departments a sales user belongs to
leads                 — Core lead records (all fields)
lead_history          — Audit trail (every field change logged)
notifications         — In-app notification queue
dropdown_options      — Configurable dropdown values (admin-managed)
lead_sequences        — Daily sequence counter per BU for REQ code generation
```

---

## Field Permission Tags

Every field on a lead belongs to one of three visibility groups:

| Tag | Who Sees It | Who Edits It |
|---|---|---|
| `MUTUAL` | Marketing, Sales (own dept), Manager, Super Admin | Marketing (on create) / Super Admin override |
| `MARKETING` | Marketing, Manager, Super Admin | Marketing only |
| `SALES` | Sales (own dept), Manager, Super Admin | Sales only |

---

## Lead Fields Map

### Mutual Fields
| Field | Type | Notes |
|---|---|---|
| reqCode | String (unique) | Auto-generated |
| requestDate | DateTime | Auto-set on create |
| companyName | String | |
| companyNameAr | String? | Arabic name |
| companyWebsite | String? | |
| companyType | String? | Dropdown |
| companySector | String? | Dropdown |
| country | String? | |
| city | String? | |
| location | String? | Full address / map link |
| contactName | String | |
| contactNumber | String | |
| contactEmail | String? | |
| leadType | String? | Client / Supplier / Others |
| newClient | Boolean | Default: true |
| internalReferral | Boolean | Default: false |
| referralFrom | String? | Who referred |

### Marketing-Only Fields
| Field | Type | Notes |
|---|---|---|
| leadRequest | String | What they're asking for |
| leadSource | String? | Dropdown |
| communicationChannel | String? | Dropdown |
| marketingNotes | String? | Internal notes |
| directedToDepartmentId | String? | FK → departments |
| sentToSales | Boolean | Default: false |
| sentToSalesAt | DateTime? | Handoff timestamp |

### Sales-Only Fields
| Field | Type | Notes |
|---|---|---|
| salesResponse | String? | Free text response |
| salesResponseDate | DateTime? | |
| requestStatus | String | Dropdown, default: "Unknown Status" |

---

## REQ Code Algorithm

```
PREFIX   = business_unit.prefix              // e.g. "HSL"
Y        = last digit of current year        // e.g. "5" for 2025
MM       = zero-padded month                 // e.g. "06"
DD       = zero-padded day                   // e.g. "24"
SEQUENCE = daily counter per BU, 4-digit     // e.g. "0001"

REQ_CODE = PREFIX + Y + MM + DD + SEQUENCE  // "HSL506240001"
```

Sequence is stored in `lead_sequences` table, keyed by `(businessUnitId, date)`.
Incremented atomically to prevent duplicates under concurrent submissions.

---

## Role Scoping Rules

### MARKETING
- Can create leads in their assigned BUs
- Can view all leads they created
- Cannot see any SALES fields
- Cannot edit a lead after "Send to Sales" (locked)

### SALES
- Can view leads directed to their department(s) within their BU(s)
- Can only see MUTUAL + SALES fields — MARKETING fields never rendered
- Can edit SALES fields only
- Future: person-level assignment

### MANAGER
- Read-only view of ALL leads in their assigned BU(s)
- Sees all three field groups (MUTUAL + MARKETING + SALES)
- Cannot edit any fields (view only)

### SUPER_ADMIN
- Full access to everything
- Can edit any field on any lead
- Manages users, BUs, departments, dropdown config
- Views full system audit log
