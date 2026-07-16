// Sends "To Improve" suggestions from the dashboard sidebar to a fixed
// inbox via Resend. Requires the RESEND_API_KEY secret to be set on the
// Supabase project (see supabase/functions/send-improvement-email/README.md
// for setup/deploy steps). SUPABASE_URL and SUPABASE_ANON_KEY are injected
// automatically by the Edge Functions runtime, no need to set those.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RECEIVER_EMAIL = 'slimonshark.login@gmail.com';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface RequestBody {
  suggestion: string;
  attachment?: {
    name: string;
    // Base64-encoded file content (no data: URL prefix), read client-side.
    contentBase64: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    // Verify the caller is a real, logged-in user before sending any email.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'Not authenticated' }, 401);
    }

    if (!RESEND_API_KEY) {
      return jsonResponse({ error: 'Email is not configured (missing RESEND_API_KEY secret)' }, 500);
    }

    const { suggestion, attachment }: RequestBody = await req.json();
    if (!suggestion || typeof suggestion !== 'string' || !suggestion.trim()) {
      return jsonResponse({ error: 'Suggestion text is required' }, 400);
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MantleSync <onboarding@resend.dev>',
        to: [RECEIVER_EMAIL],
        reply_to: user.email,
        subject: `MantleSync improvement suggestion from ${user.email ?? 'a user'}`,
        html: `
          <p><strong>From:</strong> ${escapeHtml(user.email ?? user.id)}</p>
          <p><strong>Suggestion:</strong></p>
          <p>${escapeHtml(suggestion).replace(/\n/g, '<br/>')}</p>
        `,
        ...(attachment
          ? { attachments: [{ filename: attachment.name, content: attachment.contentBase64 }] }
          : {}),
      }),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      return jsonResponse({ error: `Resend API error: ${errBody}` }, 502);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    return jsonResponse({ error: String(error) }, 500);
  }
});
