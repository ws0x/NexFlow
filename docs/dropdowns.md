# NexFlow — Dropdown Reference Values

All values are seeded into the `dropdown_options` table on first run.
Super Admin can add / edit / deactivate / reorder any value in-app.

---

## COMPANY_TYPE
- Procurement Company
- Factory
- Commercial Company
- Shop

---

## REQUEST_STATUS
- Unknown Status *(default)*
- Just an inquiry
- Out Of Range
- Out Of Segment
- Quoting Stage
- Rejected the Quote
- Turned Into Order

---

## LEAD_TYPE
- Client
- Supplier
- Others

---

## COMMUNICATION_CHANNEL
- Direct Call
- Email
- WhatsApp

---

## LEAD_SOURCE
- Google Business Profile
- Automation Website
- Makka Corp Website
- YouTube
- Facebook
- WhatsApp
- Mail Info
- TikTok
- Facebook Ads

---

## COMPANY_SECTOR
- Automotive & Transportation
- Chemical Industry
- Construction
- Electronics & Electrical
- Energy & Utilities
- Environmental & Waste Management
- Food & Beverage
- Healthcare Manufacturing
- Industrial Equipment
- Logistics & Material Handling
- Manufacturing
- Mining & Metals
- Packaging Industry
- Pharmaceutical
- Textile & Apparel

---

## DEPARTMENTS (Lead Directed To)
- Agricultural Agencies
- Automation Agencies
- Factory Equipment
- Machinery Sales
- Maintenance & Technical Support
- Material Sales
- Plastic Agencies
- Supply Chain

---

## Notes

- All dropdown categories are stored in `dropdown_options.category` as the string keys above
- `valueAr` field stores the Arabic translation (optional, can be added by admin)
- `order` field controls display sort order
- `isActive = false` hides the value from forms but preserves it on existing records
