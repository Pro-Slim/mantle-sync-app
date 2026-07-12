# Phase 1 Implementation: Supabase Foundation

## ✅ Completed in This Session

### 1. Infrastructure Files Created
- **`src/utils/supabaseClient.ts`** — Supabase client initialization with auth config
- **`src/utils/offlineQueue.ts`** — IndexedDB offline queue for sync on reconnect
- **`src/contexts/AuthContext.tsx`** — React Context for authentication state management
- **`src/components/AuthModal.tsx`** — Email/password auth UI (email based vs username selection)

### 2. State Management Stores Created
- **`src/stores/eventStore.ts`** — Zustand store for events with real-time + optimistic updates
- **`src/stores/reminderStore.ts`** — Zustand store for reminders with real-time + optimistic updates
- **`src/stores/logStore.ts`** — Zustand store for activity logs with real-time sync

### 3. Configuration Files
- **`.env.example`** — Template for environment variables
- **`SUPABASE_SETUP.md`** — Step-by-step guide for creating Supabase project
- **`SUPABASE_SCHEMA.sql`** — Complete database schema (tables, RLS policies, indexes)

### 4. Dependencies Updated
- Added `@supabase/supabase-js` (Supabase SDK)
- Added `zustand` (state management)
- Added `dexie` (IndexedDB wrapper for offline queue)

### 5. App Root Updated
- **`src/App.tsx`** — Wrapped with `<AuthProvider>` to enable auth throughout app

---

## Next Steps: Phase 2 Implementation

### Step 1: Supabase Project Setup (15 minutes)

Follow **SUPABASE_SETUP.md** to:
1. Create a Supabase project
2. Copy Project URL and Anon Key
3. Paste **SUPABASE_SCHEMA.sql** into SQL editor and run it
4. Configure email auth provider and URLs
5. Create `.env.local` with your credentials

### Step 2: Install Dependencies

```bash
cd /c/Users/halil/Documents/mantle-sync-app
npm install
```

### Step 3: Test the Dev Server

```bash
npm run dev
```

Expected behavior:
- Dev server starts at `http://localhost:5173`
- AuthModal appears on first load (sign up or sign in)
- After auth, shows Dashboard (currently still using old auth)

### Step 4: Update Dashboard Component

The current Dashboard still uses:
- Old `useState` + localStorage for events
- Old `userContext` for user management
- Old `LoginModal` instead of `AuthModal`

**You have two options:**

**Option A: Gradual Migration (Recommended)**
1. Replace event state: `const events = useEventStore(state => state.events)`
2. Replace reminder state: `const reminders = useReminderStore(state => state.reminders)`
3. Replace log functions: Use `useLogStore` instead of `addLog()`
4. Replace user state: Use `useAuth()` to get current user
5. Replace `LoginModal` with `AuthModal`

**Option B: Full Refactor**
Create a new `Dashboard_v2.tsx` with all new architecture, then swap imports.

### Step 5: Connection Test

After updating Dashboard, you should see:
- ✅ Login works with email/password
- ✅ Events persist in Supabase
- ✅ Reminders sync to database
- ✅ Activity logs recorded in DB
- ✅ Real-time sync (open in two browser windows)

---

## Architecture Overview

### Before (localStorage)
```
React Component → useState → localStorage (client-side only)
                ↓
            No sync between devices
```

### After (Supabase)
```
React Component → Zustand Store (in-memory cache)
                ↓
        Supabase Client (SDK)
                ↓
        ┌─────────────┬──────────────┬──────────────┐
        ↓             ↓              ↓              ↓
    Auth        Events Table  Reminders Table  Activity Logs
    (JWT)       (PostgreSQL)   (PostgreSQL)     (PostgreSQL)
    
        ↓
    Real-time Subscriptions (WebSocket)
    
        ↓
    Offline Queue (IndexedDB) ← if network offline
    
        ↓
    Sync Service (manual trigger or auto-retry)
```

---

## Key Files at a Glance

| File | Purpose | Status |
|------|---------|--------|
| `supabaseClient.ts` | SDK initialization | ✅ Done |
| `AuthContext.tsx` | Auth provider | ✅ Done |
| `eventStore.ts` | Event state + real-time | ✅ Done |
| `reminderStore.ts` | Reminder state + real-time | ✅ Done |
| `logStore.ts` | Log state + real-time | ✅ Done |
| `offlineQueue.ts` | Offline persistence | ✅ Done |
| `Dashboard.tsx` | **TODO** — Integrate stores |
| `LoginModal.tsx` | **TODO** — Replace with AuthModal |
| `SUPABASE_SETUP.md` | Setup instructions | ✅ Done |
| `.env.local` | **TODO** — Create with your keys |

---

## Testing Checklist

After Supabase setup, verify:

- [ ] Dev server runs without errors
- [ ] AuthModal appears on fresh page load
- [ ] Email/password signup works
- [ ] Email/password signin works
- [ ] Events appear in Supabase (check SQL Editor)
- [ ] Reminders sync to Supabase
- [ ] Logs recorded in activity_logs table
- [ ] Open in 2 browser windows → changes sync in real-time
- [ ] Go offline → make changes → go online → changes sync

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "CORS error" | Add domain to Supabase URL Configuration |
| "Anon key missing" | Copy key from Project Settings → API |
| "Email not verified" | Check spam folder; Supabase sends confirmation |
| "Real-time not syncing" | Check Realtime is enabled in Project Settings |
| "RLS policy blocking insert" | Verify policies in SQL Editor (check schema again) |

---

## Environment Variables

Your `.env.local` should look like:
```
VITE_SUPABASE_URL=https://abc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Never commit this file!** It's in `.gitignore`.

---

## What's Next After Phase 2?

Once stores are integrated into Dashboard:
1. **Phase 3**: Conflict resolution & retry logic
2. **Phase 4**: Offline queue processing
3. **Phase 5**: Data migration script (old localStorage → Supabase)
4. **Phase 6**: Netlify deployment configuration
5. **Phase 7**: Testing & polish

---

## Questions?

- Supabase docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- Check DECISIONS_AND_GOTCHAS.md for common pitfalls
