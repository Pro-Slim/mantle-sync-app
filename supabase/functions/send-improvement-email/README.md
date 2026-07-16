# send-improvement-email

Sends the dashboard's "To Improve" sidebar suggestions to
`slimonshark.login@gmail.com` via [Resend](https://resend.com). Requires
one-time setup that only you can do (your own accounts/credentials).

## 1. Get a Resend API key

1. Sign up at https://resend.com (free tier is enough for this volume).
2. Dashboard → API Keys → Create API Key. Copy it.
3. (Optional, later) Verify your own domain in Resend so emails send from
   e.g. `suggestions@yourdomain.com` instead of the shared
   `onboarding@resend.dev` sandbox sender. Not required to get started.

## 2. Install and log in to the Supabase CLI

```bash
npm install -g supabase
supabase login
```

## 3. Link this repo to your Supabase project

Run from the `mantle-sync-app` folder. Find `<project-ref>` in your Supabase
project's dashboard URL (`https://supabase.com/dashboard/project/<project-ref>`).

```bash
supabase link --project-ref <project-ref>
```

## 4. Set the Resend API key as a secret

```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` don't need to be set manually — the
Edge Functions runtime injects those automatically.

## 5. Deploy the function

```bash
supabase functions deploy send-improvement-email
```

## 6. Test it

Submit a suggestion from the dashboard's "To Improve" box while logged in.
Check the function logs if it doesn't arrive:

```bash
supabase functions logs send-improvement-email
```

Common failure: `Resend API error: ...domain is not verified...` — the
`onboarding@resend.dev` sandbox sender only delivers to the email address
you signed up to Resend with, until you verify your own domain. If
`slimonshark.login@gmail.com` isn't your Resend account email, verify a
domain (step 1.3) before this will deliver anywhere.
