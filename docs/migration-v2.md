# NexFlow v2 — Database Migration Guide

Run these commands **in order** after pulling the updated code.

## 1. Push schema changes

```bash
npm run db:push
```

This adds:
- `entityScope` + `businessUnitId` columns to `dropdown_options`
- New `field_permissions` table
- New `lead_card_templates` table

## 2. Re-seed global dropdown options

The unique constraint changed from `(category, value)` → `(category, value, entityScope)`.
Run the seed to update existing rows to `entityScope = 'GLOBAL'`:

```bash
npm run db:seed
```

> **Note:** If you already have leads data, use `prisma db push --accept-data-loss` carefully,
> or run a manual SQL migration:
> ```sql
> -- Set entityScope = 'GLOBAL' for all existing dropdown options
> UPDATE dropdown_options SET entity_scope = 'GLOBAL' WHERE entity_scope IS NULL;
> ```

## 3. Deploy to Vercel

After pushing schema, redeploy the app. No env var changes needed.

---

## What changed

| Feature | Details |
|---|---|
| **Entity-scoped dropdowns** | Admin → Dropdowns → scope selector. Per-entity values replace global ones. |
| **Quick Lead Access** | Sidebar/mobile nav "Quick Lead" button for instant REQ code lookup + inline edit. |
| **Field Permissions** | Admin → Permissions. Toggle view/edit per role × field. DB-driven, falls back to defaults. |
| **Card Template** | Admin → Card. Toggle which fields appear in the WhatsApp "Send to Sales" card. Per entity. |
| **Mobile nav** | Bottom tab bar on mobile. Touch-optimized with Quick Lead access. |
| **PWA** | `manifest.json` + service worker for installability + offline resilience. |
| **Sales entity scope** | Sales users with no departments assigned see all entity leads (existing behavior preserved). |
