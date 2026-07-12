# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up (free tier is fine)
2. Create a new project:
   - Project name: `mantle-sync`
   - Database password: Save this securely
   - Region: Choose closest to you (e.g., us-east-1 for US)
3. Wait 2-3 minutes for project to initialize
4. Go to **Project Settings → API** and copy:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **Anon Key** (public, safe to expose)
   - **Service Role Key** (secret, never expose)

## Step 2: Create Database Schema

1. In Supabase, go to **SQL Editor**
2. Create a new query and paste the content from `SUPABASE_SCHEMA.sql`
3. Click **Run**
4. Wait for tables to be created

## Step 3: Configure Auth

1. Go to **Authentication → Providers**
2. Enable **Email** provider:
   - Check "Confirm email"
   - Uncheck "Secure email change" (for MVP)
3. Go to **URL Configuration**:
   - Add your localhost: `http://localhost:5173`
   - Add your Netlify domain: `https://your-domain.netlify.app`

## Step 4: Set Up Row-Level Security

1. Go to **Authentication → Policies**
2. For each table (`events`, `reminders`, `activity_logs`), add policies as defined in `SUPABASE_SCHEMA.sql`
3. (Script handles this, but verify)

## Step 5: Configure Environment Variables

Create `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Never commit secrets!** Add to `.gitignore`.

## Step 6: Test Connection

```bash
npm install @supabase/supabase-js
npm run dev
```

Try logging in with email — you should see auth working in the app.

## Troubleshooting

- **"Anon key not found"** → Copy key from Project Settings → API
- **"CORS error"** → URL Configuration not set correctly
- **"Email confirmation required"** → Check your email (spam folder)
- **"403 Forbidden on query"** → RLS policies not set; check Policies in Auth section

## Next Steps

After this is set up:
1. Run `src/migrations/migrateLocalStorageToSupabase.ts` to import existing data
2. Test multi-device sync by opening app in two browser windows
3. Test offline mode by going offline → making changes → going online

---

**Estimated time:** 15 minutes to full setup
