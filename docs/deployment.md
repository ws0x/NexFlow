# NexFlow — Deployment Guide (Vercel + Neon)

## Step 1 — Create the PostgreSQL Database (Neon — Recommended)

Neon is the best free PostgreSQL for Vercel. It's serverless, has a generous free tier, and
integrates directly with Vercel's environment variables.

1. Go to [neon.tech](https://neon.tech) → **Sign up** (free)
2. Click **"New Project"** → name it `nexflow`
3. Choose your region (pick one closest to your Vercel deployment region)
4. After creation, copy the **Connection String** from the dashboard:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   → This is your `DATABASE_URL`

### Alternative: Supabase
1. Go to [supabase.com](https://supabase.com) → **New project**
2. Settings → Database → **Connection string** → choose **URI**
3. Use the **Session mode** (port 5432) connection string for `DATABASE_URL`

---

## Step 2 — Set up the Database Schema

With your `DATABASE_URL`, run these commands locally:

```bash
# 1. Copy env file
cp .env.example .env
# Edit .env → paste your DATABASE_URL, generate AUTH_SECRET

# 2. Generate AUTH_SECRET (run in terminal)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. Push schema to database
npm run db:push

# 4. Seed initial data (BUs, dropdowns, super admin)
npm run db:seed
```

After seeding, your super admin credentials are:
- **Email:** `admin@nexflow.com`
- **Password:** `NexFlow@Admin2025`
⚠️ Change this immediately after first login via the Admin panel.

---

## Step 3 — Push to GitHub

```bash
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/nexflow.git
git push -u origin master
```

---

## Step 4 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Click **"Environment Variables"** → add all of the following:

### Required Environment Variables

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Your Neon/Supabase connection string |
| `AUTH_SECRET` | `<random 32-byte base64>` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Same as AUTH_URL |
| `NEXT_PUBLIC_APP_NAME` | `NexFlow` | |

5. Click **Deploy**

Vercel automatically runs `npm install` (which triggers `postinstall` → `prisma generate`)
then `npm run build`. No extra configuration needed.

---

## Step 5 — Custom Domain (Optional)

In Vercel → Settings → Domains → add your domain.
Update `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to match.

---

## Environment Variables Reference

```bash
# .env (local development)
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="NexFlow"

# WhatsApp (future – leave empty for wa.me mode)
# WHATSAPP_PROVIDER="meta"
# WHATSAPP_API_TOKEN=""
# WHATSAPP_PHONE_ID=""
```

---

## Updating the Database Schema

When you change `prisma/schema.prisma`:

```bash
# Option A – dev (creates a migration file)
npm run db:migrate -- --name describe_your_change

# Option B – quick push (no migration history, good for early dev)
npm run db:push
```

On Vercel, re-deploy after schema changes. The build step does NOT auto-migrate —
you must push the schema changes before deploying new code that depends on them.

---

## Troubleshooting

### "Cannot find module '@/generated/prisma'"
The Prisma client wasn't generated. Run `npm run db:generate` locally. On Vercel, the
`postinstall` script handles this automatically.

### "Connection refused" / "ECONNREFUSED"
Check that `DATABASE_URL` is correct and your IP is allowed in Neon/Supabase firewall settings.
Neon allows all IPs by default. Supabase may require enabling the connection pooler.

### Prisma migration fails on Vercel
Don't run migrations in the build step. Always migrate manually before deploying code
that requires new columns or tables.
