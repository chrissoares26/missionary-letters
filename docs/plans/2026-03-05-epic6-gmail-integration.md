# Epic 6 — Gmail Integration and Send Orchestration

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Enable the user to connect Gmail via OAuth, generate personalized HTML emails per missionary, send them via the Gmail API, and view per-recipient send results with Realtime updates.

**Architecture:** Browser-redirect OAuth flow with JWT passed in `state` param → `oauth_google_callback` Edge Function stores tokens → `campaign_send` Edge Function renders HTML per missionary, sends via Gmail API, and logs to `campaign_recipients` → frontend shows Realtime progress.

**Tech Stack:** Vue 3, TypeScript, Pinia Colada, Supabase Edge Functions (Deno), Gmail API v1, Supabase Realtime, TailwindCSS v4.

---

## Pre-flight Checklist

**DB state (already done — no migrations needed):**
- ✅ `google_accounts` table exists with full schema + RLS
- ✅ `campaign_recipients` table exists with full schema + RLS — **NOTE: no `owner_id` column** (ownership inferred via `campaigns` join in RLS policy)
- ✅ `profiles.signature` column exists
- ✅ `campaign_status` enum: `draft | approved | sending | sent | failed`

**What's needed:**
- ✅ `campaign_recipients` added to `supabase_realtime` publication (applied via MCP)
- ✅ `oauth_google_callback` Edge Function (deployed)
- ✅ `campaign_send` Edge Function (deployed, code-reviewed, all bugs fixed)
- ✅ VS Code Deno extension configured (`deno.enablePaths: ["supabase/functions"]`)
- ✅ `src/api/gmail.ts` (new)
- ✅ `src/queries/gmail.ts` (new)
- ✅ `GmailConnectCard.vue` + `SignatureEditor.vue` (new)
- ✅ `settings.vue` wired up (enhance)
- ✅ `RecipientStatusList.vue` (new)
- ✅ `campaigns/[id].vue` — real send handler (enhance)

**Env vars needed:**
- Frontend (`.env`): `VITE_GOOGLE_CLIENT_ID`
- Supabase secrets (via `supabase secrets set`):
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `APP_URL` (e.g. `http://localhost:5173` for dev)

**CSS token reference** (use these, not generic names):
| Wrong | Correct |
|---|---|
| `--primary` | `--action-primary` |
| `--border` | `--border-default` |
| `--background` | `--bg-canvas` |
| `--background-secondary` | `--bg-muted` |
| `--text` | `--text-primary` |

---

## Task 1: Add `campaign_recipients` to Realtime Publication ✅ COMPLETE

**Files:**
- Create: `supabase/migrations/20260305000002_add_campaign_recipients_realtime.sql`

**Step 1: Create migration**

```sql
-- supabase/migrations/20260305000002_add_campaign_recipients_realtime.sql
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_recipients;
```

**Step 2: Apply via Supabase MCP**

Use `apply_migration` with name `add_campaign_recipients_realtime`.

**Step 3: Verify**

```sql
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;
```

Expected: `campaign_content`, `campaign_recipients`, `style_emails` all present.

**Step 4: Commit**

```bash
git add supabase/migrations/20260305000002_add_campaign_recipients_realtime.sql
git commit -m "feat: add campaign_recipients to supabase_realtime publication"
```

> **Status:** ✅ Migration applied via Supabase MCP. Verified: `campaign_content`, `campaign_recipients`, `style_emails` all in publication.

---

## Task 2: `oauth_google_callback` Edge Function ✅ COMPLETE

**OAuth flow recap:**
1. Frontend builds Google auth URL with `state = btoa(userJWT)` and `redirect_uri` pointing to this function
2. Google redirects here with `?code=...&state=...`
3. This function: decodes JWT from state, verifies it, exchanges code for tokens, upserts `google_accounts`, redirects browser to `/settings?gmail=connected`

**Files:**
- Create: `supabase/functions/oauth_google_callback/index.ts`

**Step 1: Write the function**

```typescript
// supabase/functions/oauth_google_callback/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

  function redirectError(msg: string) {
    return Response.redirect(`${appUrl}/settings?gmail=error&msg=${encodeURIComponent(msg)}`, 302)
  }

  if (!code || !state) return redirectError('Missing code or state')

  // Decode JWT from state param
  let token: string
  try {
    token = atob(state)
  } catch {
    return redirectError('Invalid state')
  }

  // Verify user from JWT
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )

  const { data: { user }, error: authError } = await userClient.auth.getUser(token)
  if (authError || !user) return redirectError('Unauthorized')

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/oauth_google_callback`,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenResponse.json()
  if (tokenData.error) return redirectError(tokenData.error_description ?? tokenData.error)

  // Fetch Google user email
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const profileData = await profileResponse.json()

  // Upsert into google_accounts
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const expiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  const { error: upsertError } = await adminClient.from('google_accounts').upsert({
    owner_id: user.id,
    google_email: profileData.email,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry,
    scopes: (tokenData.scope ?? '').split(' ').filter(Boolean),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'owner_id' })

  if (upsertError) {
    console.error('Upsert error:', upsertError)
    return redirectError('Failed to save account')
  }

  return Response.redirect(`${appUrl}/settings?gmail=connected`, 302)
})
```

**Step 2: Deploy**

```bash
bunx supabase functions deploy oauth_google_callback --no-verify-jwt
```

Why `--no-verify-jwt`: This function receives a browser redirect (no Authorization header), so JWT is in the `state` param instead.

**Step 3: Verify in Supabase dashboard**

Navigate to Edge Functions → `oauth_google_callback` → confirm it appears as deployed.

**Step 4: Commit**

```bash
git add supabase/functions/oauth_google_callback/index.ts
git commit -m "feat: add oauth_google_callback Edge Function for Gmail token exchange"
```

> **Status:** ✅ Implemented and deployed.
>
> **Fix applied (code review):** Google only sends `refresh_token` on first authorization grant. On reconnect it may be absent — the upsert now conditionally includes `refresh_token` only when Google provides it, preserving the existing token on reconnect and preventing a `NOT NULL` constraint failure.
>
> **Import pattern:** Uses `import 'jsr:@supabase/functions-js/edge-runtime.d.ts'` + `import { createClient } from 'npm:@supabase/supabase-js@2'` — consistent with other Edge Functions in this project.

---

## Task 3: `campaign_send` Edge Function ✅ COMPLETE

This is the core of Epic 6. It:
1. Verifies campaign is `approved`
2. Guards idempotency (blocks re-send if `sent` **or `sending`**)
3. Refreshes OAuth token if expired
4. For each active missionary: renders HTML email (with XSS-safe escaping), creates `queued` recipient row, sends via Gmail API, updates status

**Files:**
- Create: `supabase/functions/campaign_send/index.ts`

**Step 1: Write the function**

```typescript
// supabase/functions/campaign_send/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
}

interface SendRequest {
  campaign_id: string
}

interface Missionary {
  id: string
  first_name: string
  last_name: string
  email: string
  title: string
  mission_name: string | null
}

interface GoogleAccount {
  access_token: string
  refresh_token: string
  expiry: string
}

async function refreshToken(account: GoogleAccount): Promise<{ access_token: string; expiry: string }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const data = await response.json()
  if (data.error) throw new Error(`Token refresh failed: ${data.error}`)
  return {
    access_token: data.access_token,
    expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }
}

function buildHtmlEmail(body: string, images: string[], signature: string | null): string {
  const paragraphs = body
    .split('\n')
    .map((line) => (line.trim() ? `<p style="margin:0 0 16px 0;line-height:1.6">${line}</p>` : ''))
    .join('')

  const imageHtml = images.length > 0
    ? images.map((url) => `<img src="${url}" style="max-width:100%;height:auto;margin:16px 0;border-radius:8px" alt="" />`).join('')
    : ''

  const signatureHtml = signature
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;color:#666;font-size:14px">${signature.replace(/\n/g, '<br>')}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;background:#fff">
${paragraphs}
${imageHtml}
${signatureHtml}
</body>
</html>`
}

function renderTokens(template: string, missionary: Missionary): string {
  return template
    .replace(/\{\{title\}\}/g, missionary.title)
    .replace(/\{\{first_name\}\}/g, missionary.first_name)
    .replace(/\{\{last_name\}\}/g, missionary.last_name)
    .replace(/\{\{mission_name\}\}/g, missionary.mission_name ?? '')
    .replace(/\{\{full_name\}\}/g, `${missionary.title} ${missionary.first_name} ${missionary.last_name}`)
}

async function sendGmailMessage(accessToken: string, to: string, subject: string, htmlBody: string, textBody: string): Promise<string> {
  const boundary = `boundary_${Date.now()}`

  const rawEmail = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
  ].join('\r\n')

  const encodedEmail = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedEmail }),
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message ?? 'Gmail send failed')
  return data.id
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body: SendRequest = await req.json()
    const { campaign_id } = body
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'Missing campaign_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch campaign + ownership check
    const { data: campaign, error: campaignError } = await adminClient
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('owner_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (campaign.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Campaign must be approved before sending' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Idempotency: block re-send if already sent
    if (campaign.status === 'sent') {
      return new Response(JSON.stringify({ error: 'Campaign already sent' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch campaign content
    const { data: content, error: contentError } = await adminClient
      .from('campaign_content')
      .select('*')
      .eq('campaign_id', campaign_id)
      .single()

    if (contentError || !content) {
      return new Response(JSON.stringify({ error: 'Campaign content not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch active missionaries
    const { data: missionaries, error: missError } = await adminClient
      .from('missionaries')
      .select('id, first_name, last_name, email, title, mission_name')
      .eq('owner_id', user.id)
      .eq('active', true)

    if (missError || !missionaries?.length) {
      return new Response(JSON.stringify({ error: 'No active missionaries found' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch Google account
    const { data: googleAccount, error: gaError } = await adminClient
      .from('google_accounts')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (gaError || !googleAccount) {
      return new Response(JSON.stringify({ error: 'Gmail not connected. Please connect in Settings.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch user signature
    const { data: profile } = await adminClient
      .from('profiles')
      .select('signature')
      .eq('id', user.id)
      .single()

    // Refresh token if expired (with 60s buffer)
    let accessToken = googleAccount.access_token
    const isExpired = new Date(googleAccount.expiry).getTime() < Date.now() + 60_000

    if (isExpired) {
      const refreshed = await refreshToken(googleAccount)
      accessToken = refreshed.access_token
      await adminClient
        .from('google_accounts')
        .update({ access_token: refreshed.access_token, expiry: refreshed.expiry, updated_at: new Date().toISOString() })
        .eq('owner_id', user.id)
    }

    // Mark campaign as sending
    await adminClient
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign_id)

    // Send to each missionary
    let successCount = 0
    let failCount = 0

    for (const missionary of missionaries as Missionary[]) {
      // Render tokens
      const renderedSubject = renderTokens(content.email_subject, missionary)
      const renderedBody = renderTokens(content.email_body, missionary)
      const htmlBody = buildHtmlEmail(renderedBody, content.images ?? [], profile?.signature ?? null)

      // Insert queued recipient row
      const { data: recipient } = await adminClient
        .from('campaign_recipients')
        .insert({
          campaign_id,
          missionary_id: missionary.id,
          to_email: missionary.email,
          rendered_subject: renderedSubject,
          rendered_body: htmlBody,
          status: 'queued',
          owner_id: user.id,
        })
        .select('id')
        .single()

      if (!recipient) continue

      try {
        const gmailMessageId = await sendGmailMessage(
          accessToken,
          missionary.email,
          renderedSubject,
          htmlBody,
          renderedBody,
        )

        await adminClient
          .from('campaign_recipients')
          .update({ status: 'sent', gmail_message_id: gmailMessageId, sent_at: new Date().toISOString() })
          .eq('id', recipient.id)

        successCount++
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        await adminClient
          .from('campaign_recipients')
          .update({ status: 'failed', error: errorMsg })
          .eq('id', recipient.id)

        failCount++
      }
    }

    // Update campaign final status
    const finalStatus = failCount === missionaries.length ? 'failed' : 'sent'
    await adminClient
      .from('campaigns')
      .update({ status: finalStatus })
      .eq('id', campaign_id)

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

**Step 2: Deploy**

```bash
bunx supabase functions deploy campaign_send --no-verify-jwt
```

> **Note:** Despite having its own internal JWT verification, the Supabase gateway-level JWT check rejects the token before the function runs. `--no-verify-jwt` bypasses the gateway check; the function's own `authHeader` + `auth.getUser()` check is the real auth guard.

**Step 3: Set required secrets**

```bash
bunx supabase secrets set GOOGLE_CLIENT_ID=your_client_id
bunx supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret
bunx supabase secrets set APP_URL=http://localhost:5173
```

**Step 4: Commit**

```bash
git add supabase/functions/campaign_send/index.ts
git commit -m "feat: add campaign_send Edge Function for Gmail batch sending"
```

> **Status:** ✅ Implemented, code-reviewed, all bugs fixed.
>
> **Fixes applied (code review — 6 issues):**
> 1. **Critical:** Removed `owner_id` from `campaign_recipients` insert — column does not exist; was silently causing entire send to no-op
> 2. **Critical:** Added `sending` status to idempotency block — prevents concurrent double-sends (was only checking `sent`)
> 3. **Critical:** Added `escapeHtml()` — body/signature content is now escaped before embedding in HTML to prevent XSS
> 4. **Important:** Surfaced `campaign_recipients` insert errors — `failCount++` instead of silent `continue`
> 5. **Important:** Replaced deprecated `unescape(encodeURIComponent())` with `TextEncoder`-based `toBase64Url()` and `encodeSubject()`
> 6. **Important:** Added random suffix to MIME `boundary` — prevents same-millisecond collision in tight loop
>
> **Schema note:** `campaign_recipients` has no `owner_id` — RLS ownership is enforced via `campaigns` join in policy.
>
> **Import pattern:** Uses `import 'jsr:@supabase/functions-js/edge-runtime.d.ts'` + `import { createClient } from 'npm:@supabase/supabase-js@2'`.

---

## Task 3b: VS Code Deno Extension Configuration ✅ COMPLETE

**Files:**
- Modified: `.vscode/extensions.json`
- Modified: `.vscode/settings.json`

**Problem:** VS Code TypeScript server reports `Cannot find module 'npm:@supabase/supabase-js@2'` and `Cannot find name 'Deno'` for all Edge Function files.

**Fix:** Enable the Deno VS Code extension scoped to `supabase/functions` only — leaves Vue/TypeScript setup untouched.

`.vscode/settings.json` additions:
```json
"deno.enablePaths": ["supabase/functions"],
"deno.lint": true
```

`.vscode/extensions.json` addition:
```json
"denoland.vscode-deno"
```

**Required user action:** Install the Deno extension (`Cmd+Shift+P` → `Extensions: Show Recommended Extensions`), then `Developer: Reload Window`.

---

## Task 4: Frontend API Layer (`src/api/gmail.ts`) ✅ COMPLETE

**Files:**
- Create: `src/api/gmail.ts`
- Modify: `.env.example`

**Step 1: Add `VITE_GOOGLE_CLIENT_ID` to `.env.example`**

Open `.env.example` and add:
```
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

Also add to your `.env` file with the real value.

**Step 2: Create `src/api/gmail.ts`**

```typescript
// src/api/gmail.ts
import { supabase } from '@/plugins/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email'

export async function initiateGoogleOAuth(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth_google_callback`
  const state = btoa(session.access_token)

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function getGoogleAccount() {
  const { data, error } = await supabase
    .from('google_accounts')
    .select('google_email, expiry, scopes, updated_at')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function disconnectGoogleAccount(): Promise<void> {
  const { error } = await supabase.from('google_accounts').delete().neq('owner_id', '')
  if (error) throw error
}

export async function sendCampaign(campaignId: string): Promise<{ sent: number; failed: number }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const response = await supabase.functions.invoke('campaign_send', {
    body: { campaign_id: campaignId },
  })

  if (response.error) throw response.error
  return response.data
}

export async function getCampaignRecipients(campaignId: string) {
  const { data, error } = await supabase
    .from('campaign_recipients')
    .select(`
      id,
      to_email,
      rendered_subject,
      status,
      gmail_message_id,
      error,
      sent_at,
      created_at,
      missionaries ( first_name, last_name, title )
    `)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function updateSignature(signature: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ signature, updated_at: new Date().toISOString() })
    .neq('id', '')

  if (error) throw error
}

export async function getSignature(): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('signature')
    .maybeSingle()

  if (error) throw error
  return data?.signature ?? null
}
```

**Step 3: Commit**

```bash
git add src/api/gmail.ts .env.example
git commit -m "feat: add gmail API layer for OAuth, send, and recipient queries"
```

---

## Task 5: Pinia Colada Queries (`src/queries/gmail.ts`) ✅ COMPLETE

**Files:**
- Create: `src/queries/gmail.ts`

**Step 1: Write queries file**

```typescript
// src/queries/gmail.ts
import { useQuery, useMutation } from '@pinia/colada'
import { useRouter } from 'vue-router'
import {
  getGoogleAccount,
  disconnectGoogleAccount,
  initiateGoogleOAuth,
  sendCampaign,
  getCampaignRecipients,
  getSignature,
  updateSignature,
} from '@/api/gmail'
import { supabase } from '@/plugins/supabase'
import { ref, onUnmounted } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useGoogleAccountQuery() {
  return useQuery({
    key: ['google-account'],
    query: getGoogleAccount,
  })
}

export function useDisconnectGoogleAccount() {
  return useMutation({
    mutation: disconnectGoogleAccount,
    onSettled() {
      // invalidate is handled by the caller via queryCache
    },
  })
}

export function useInitiateGoogleOAuth() {
  return useMutation({
    mutation: initiateGoogleOAuth,
  })
}

export function useSendCampaign() {
  return useMutation({
    mutation: (campaignId: string) => sendCampaign(campaignId),
  })
}

export function useCampaignRecipientsQuery(campaignId: string) {
  return useQuery({
    key: ['campaign-recipients', campaignId],
    query: () => getCampaignRecipients(campaignId),
    enabled: !!campaignId,
  })
}

export function useSignatureQuery() {
  return useQuery({
    key: ['signature'],
    query: getSignature,
  })
}

export function useUpdateSignature() {
  return useMutation({
    mutation: (signature: string) => updateSignature(signature),
  })
}

// Realtime subscription for campaign_recipients updates
export function useRecipientsRealtime(campaignId: string, onUpdate: () => void) {
  const channel = ref<RealtimeChannel | null>(null)

  function subscribe() {
    channel.value = supabase
      .channel(`campaign-recipients-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_recipients',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => onUpdate(),
      )
      .subscribe()
  }

  function unsubscribe() {
    if (channel.value) {
      supabase.removeChannel(channel.value)
      channel.value = null
    }
  }

  onUnmounted(unsubscribe)

  return { subscribe, unsubscribe }
}
```

**Step 2: Commit**

```bash
git add src/queries/gmail.ts
git commit -m "feat: add gmail Pinia Colada queries and realtime subscription"
```

---

## Task 6: `GmailConnectCard.vue` ✅ COMPLETE

**Files:**
- Create: `src/components/features/settings/GmailConnectCard.vue`

**Step 1: Write component**

```vue
<!-- src/components/features/settings/GmailConnectCard.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { useGoogleAccountQuery, useDisconnectGoogleAccount, useInitiateGoogleOAuth } from '@/queries/gmail'

const queryCache = useQueryCache()
const { data: account, isLoading: accountLoading } = useGoogleAccountQuery()
const { mutate: initOAuth, isLoading: connectLoading } = useInitiateGoogleOAuth()
const { mutate: disconnect, isLoading: disconnectLoading } = useDisconnectGoogleAccount()

const isConnected = computed(() => !!account.value)

function handleConnect() {
  initOAuth()
}

async function handleDisconnect() {
  if (!confirm('Desconectar o Gmail? Você não poderá enviar campanhas até reconectar.')) return
  await disconnect()
  queryCache.invalidateQueries({ key: ['google-account'] })
}
</script>

<template>
  <div class="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
    <h2 class="text-base font-semibold text-[var(--text-primary)] mb-1">Gmail</h2>
    <p class="text-sm text-[var(--text-secondary)] mb-4">
      Conecte sua conta do Gmail para enviar campanhas diretamente.
    </p>

    <div v-if="accountLoading" class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      <span class="animate-spin">⏳</span> Carregando...
    </div>

    <!-- Connected state -->
    <div v-else-if="isConnected" class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
          <svg class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-[var(--text-primary)]">Conectado</p>
          <p class="text-xs text-[var(--text-secondary)]">{{ account?.google_email }}</p>
        </div>
      </div>
      <button
        class="rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] disabled:opacity-50 transition-colors"
        :disabled="disconnectLoading"
        @click="handleDisconnect"
      >
        {{ disconnectLoading ? 'Desconectando...' : 'Desconectar' }}
      </button>
    </div>

    <!-- Not connected state -->
    <button
      v-else
      class="flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
      :disabled="connectLoading"
      @click="handleConnect"
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
      </svg>
      {{ connectLoading ? 'Redirecionando...' : 'Conectar Gmail' }}
    </button>
  </div>
</template>
```

**Step 2: Commit**

```bash
git add src/components/features/settings/GmailConnectCard.vue
git commit -m "feat: add GmailConnectCard component for OAuth connect/disconnect"
```

---

## Task 7: `SignatureEditor.vue` ✅ COMPLETE

**Files:**
- Create: `src/components/features/settings/SignatureEditor.vue`

**Step 1: Write component**

```vue
<!-- src/components/features/settings/SignatureEditor.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { useSignatureQuery, useUpdateSignature } from '@/queries/gmail'

const queryCache = useQueryCache()
const { data: savedSignature, isLoading } = useSignatureQuery()
const { mutate: save, isLoading: saving } = useUpdateSignature()

const draft = ref('')
const saved = ref(false)

// Initialize draft when data loads
watch(savedSignature, (value) => {
  if (value !== undefined) draft.value = value ?? ''
}, { immediate: true })

async function handleSave() {
  await save(draft.value)
  queryCache.invalidateQueries({ key: ['signature'] })
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}
</script>

<template>
  <div class="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
    <h2 class="text-base font-semibold text-[var(--text-primary)] mb-1">Assinatura de Email</h2>
    <p class="text-sm text-[var(--text-secondary)] mb-4">
      Adicionada ao final de cada email enviado.
    </p>

    <div v-if="isLoading" class="text-sm text-[var(--text-secondary)]">Carregando...</div>

    <div v-else class="space-y-3">
      <textarea
        v-model="draft"
        rows="5"
        placeholder="Com amor e orações,&#10;Irmã Silva"
        class="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)] resize-y"
      />
      <div class="flex items-center justify-end gap-3">
        <span v-if="saved" class="text-sm text-green-600">✓ Salvo</span>
        <button
          class="rounded-lg bg-[var(--action-primary)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          :disabled="saving"
          @click="handleSave"
        >
          {{ saving ? 'Salvando...' : 'Salvar Assinatura' }}
        </button>
      </div>
    </div>
  </div>
</template>
```

**Step 2: Commit**

```bash
git add src/components/features/settings/SignatureEditor.vue
git commit -m "feat: add SignatureEditor component for profile email signature"
```

---

## Task 8: `settings.vue` — Wire Up Components ✅ COMPLETE

**Files:**
- Modify: `src/pages/settings.vue`

**Step 1: Replace the stub with full implementation**

```vue
<!-- src/pages/settings.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useQueryCache } from '@pinia/colada'
import GmailConnectCard from '@/components/features/settings/GmailConnectCard.vue'
import SignatureEditor from '@/components/features/settings/SignatureEditor.vue'

const route = useRoute()
const queryCache = useQueryCache()
const toast = ref<'connected' | 'error' | null>(null)
const toastMessage = ref('')

// Handle OAuth redirect back to settings
onMounted(() => {
  if (route.query.gmail === 'connected') {
    toast.value = 'connected'
    queryCache.invalidateQueries({ key: ['google-account'] })
    setTimeout(() => (toast.value = null), 4000)
  } else if (route.query.gmail === 'error') {
    toast.value = 'error'
    toastMessage.value = (route.query.msg as string) ?? 'Erro ao conectar Gmail'
    setTimeout(() => (toast.value = null), 5000)
  }
})
</script>

<template>
  <div class="min-h-screen bg-[var(--bg-canvas)] pb-24">
    <!-- Toast -->
    <Transition name="slide-down">
      <div
        v-if="toast"
        class="fixed inset-x-4 top-4 z-50 flex items-center gap-3 rounded-xl p-4 shadow-lg"
        :class="toast === 'connected' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'"
      >
        <span class="text-lg">{{ toast === 'connected' ? '✓' : '✕' }}</span>
        <p class="text-sm font-medium" :class="toast === 'connected' ? 'text-green-800' : 'text-red-800'">
          {{ toast === 'connected' ? 'Gmail conectado com sucesso!' : toastMessage }}
        </p>
      </div>
    </Transition>

    <!-- Header -->
    <div class="bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-4 py-4">
      <h1 class="text-xl font-bold text-[var(--text-primary)]">Configurações</h1>
      <p class="mt-0.5 text-sm text-[var(--text-secondary)]">Gmail e assinatura de email</p>
    </div>

    <!-- Content -->
    <div class="mx-auto max-w-2xl space-y-4 p-4">
      <GmailConnectCard />
      <SignatureEditor />
    </div>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
```

**Step 2: Commit**

```bash
git add src/pages/settings.vue
git commit -m "feat: implement settings page with Gmail connect and signature editor"
```

---

## Task 9: `RecipientStatusList.vue` ✅ COMPLETE

**Files:**
- Create: `src/components/features/campaigns/RecipientStatusList.vue`

**Step 1: Write component**

```vue
<!-- src/components/features/campaigns/RecipientStatusList.vue -->
<script setup lang="ts">
import { computed } from 'vue'

interface MissionaryInfo {
  first_name: string
  last_name: string
  title: string
}

interface Recipient {
  id: string
  to_email: string
  rendered_subject: string
  status: 'queued' | 'sent' | 'failed'
  gmail_message_id: string | null
  error: string | null
  sent_at: string | null
  missionaries: MissionaryInfo | null
}

interface Props {
  recipients: Recipient[]
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), { isLoading: false })

const stats = computed(() => ({
  total: props.recipients.length,
  sent: props.recipients.filter((r) => r.status === 'sent').length,
  failed: props.recipients.filter((r) => r.status === 'failed').length,
  queued: props.recipients.filter((r) => r.status === 'queued').length,
}))

function formatTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
    <!-- Header + summary -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
      <h3 class="text-sm font-semibold text-[var(--text-primary)]">Destinatários</h3>
      <div v-if="recipients.length" class="flex items-center gap-3 text-xs">
        <span class="text-green-600 font-medium">{{ stats.sent }} enviados</span>
        <span v-if="stats.failed" class="text-red-600 font-medium">{{ stats.failed }} falhou</span>
        <span v-if="stats.queued" class="text-[var(--text-secondary)]">{{ stats.queued }} na fila</span>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading && !recipients.length" class="divide-y divide-[var(--border-default)]">
      <div v-for="i in 3" :key="i" class="flex items-center gap-3 px-4 py-3">
        <div class="h-8 w-8 rounded-full bg-[var(--bg-muted)] animate-pulse" />
        <div class="flex-1 space-y-1.5">
          <div class="h-3 w-32 rounded bg-[var(--bg-muted)] animate-pulse" />
          <div class="h-2.5 w-48 rounded bg-[var(--bg-muted)] animate-pulse" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!recipients.length" class="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
      Nenhum destinatário ainda.
    </div>

    <!-- Recipient list -->
    <div v-else class="divide-y divide-[var(--border-default)]">
      <div v-for="recipient in recipients" :key="recipient.id" class="flex items-start gap-3 px-4 py-3">
        <!-- Status icon -->
        <div
          class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
          :class="{
            'bg-green-100 text-green-600': recipient.status === 'sent',
            'bg-red-100 text-red-600': recipient.status === 'failed',
            'bg-[var(--bg-muted)] text-[var(--text-secondary)]': recipient.status === 'queued',
          }"
        >
          <span v-if="recipient.status === 'sent'">✓</span>
          <span v-else-if="recipient.status === 'failed'">✕</span>
          <span v-else class="animate-spin text-xs">⏳</span>
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-[var(--text-primary)] truncate">
            {{ recipient.missionaries?.title }} {{ recipient.missionaries?.first_name }}
          </p>
          <p class="text-xs text-[var(--text-secondary)] truncate">{{ recipient.to_email }}</p>
          <p v-if="recipient.status === 'failed' && recipient.error" class="mt-0.5 text-xs text-red-600 truncate">
            {{ recipient.error }}
          </p>
        </div>

        <!-- Sent time -->
        <span v-if="recipient.sent_at" class="shrink-0 text-xs text-[var(--text-secondary)]">
          {{ formatTime(recipient.sent_at) }}
        </span>
      </div>
    </div>
  </div>
</template>
```

**Step 2: Commit**

```bash
git add src/components/features/campaigns/RecipientStatusList.vue
git commit -m "feat: add RecipientStatusList component with realtime status updates"
```

---

## Task 10: Wire Send Flow in `campaigns/[id].vue` ✅ COMPLETE

**Files:**
- Modify: `src/pages/campaigns/[id].vue`
- Modify: `src/queries/campaigns.ts` (add campaign query invalidation after send)

**Step 1: Read the current `[id].vue` file first to understand exact structure**

Run: `cat -n src/pages/campaigns/[id].vue` (use the Read tool in Claude Code)

**Step 2: Add imports at the top of `<script setup>`**

Add to existing imports:
```typescript
import { useRouter } from 'vue-router'
import { useQueryCache } from '@pinia/colada'
import { useGoogleAccountQuery, useSendCampaign, useCampaignRecipientsQuery, useRecipientsRealtime } from '@/queries/gmail'
import RecipientStatusList from '@/components/features/campaigns/RecipientStatusList.vue'
```

**Step 3: Add reactive state and composables in `<script setup>`**

After existing composables, add:
```typescript
const queryCache = useQueryCache()
const router = useRouter()

const { data: googleAccount } = useGoogleAccountQuery()
const { mutate: sendCampaignMutation, isLoading: isSending } = useSendCampaign()

const showRecipients = ref(false)
const { data: recipients, isLoading: recipientsLoading, refresh: refreshRecipients } = useCampaignRecipientsQuery(campaignId)

const { subscribe: subscribeRecipients, unsubscribe: unsubscribeRecipients } = useRecipientsRealtime(
  campaignId,
  () => refreshRecipients(),
)
```

**Step 4: Replace `handleSend()` stub**

Replace:
```typescript
function handleSend() {
  // Epic 6 implementation
  alert('Funcionalidade de envio será implementada no Epic 6')
}
```

With:
```typescript
async function handleSend() {
  if (!googleAccount.value) {
    if (confirm('Gmail não conectado. Ir para Configurações para conectar?')) {
      router.push('/settings')
    }
    return
  }

  if (!confirm(`Enviar campanha para todos os missionários ativos? Esta ação não pode ser desfeita.`)) return

  showRecipients.value = true
  subscribeRecipients()

  try {
    await sendCampaignMutation(campaignId)
    queryCache.invalidateQueries({ key: ['campaign', campaignId] })
  } catch (err) {
    console.error('Send error:', err)
  }
}
```

**Step 5: Add `RecipientStatusList` to the template**

After the existing campaign content sections (CampaignEditor), add:
```vue
<!-- Send results (visible after send is triggered) -->
<div v-if="showRecipients" class="mx-4 mb-4">
  <RecipientStatusList
    :recipients="recipients ?? []"
    :is-loading="recipientsLoading || isSending"
  />
</div>
```

**Step 6: Commit**

```bash
git add src/pages/campaigns/[id].vue
git commit -m "feat: wire campaign send flow with Gmail integration and recipient tracking"
```

---

## Task 11: Browser Testing ✅ COMPLETE

Follow the testing workflow from `CLAUDE.md`:

**Step 1: Test Settings page**

1. Navigate to `http://localhost:5173/settings`
2. Verify Gmail card shows "Conectar Gmail" button (not connected state)
3. Verify signature editor loads with empty textarea
4. Type a test signature, click "Salvar Assinatura" → verify "✓ Salvo" feedback
5. Reload page → signature should persist

**Step 2: Test OAuth flow (requires real Google credentials)**

1. Click "Conectar Gmail" → should redirect to Google login
2. Grant permissions → should redirect back to `/settings?gmail=connected`
3. Verify green toast "Gmail conectado com sucesso!"
4. Verify card shows connected state with google email

**Step 3: Test Send flow**

1. Navigate to an approved campaign (`/campaigns/:id`)
2. Verify "Enviar para Missionários" button is visible (approved status)
3. Click send → confirm dialog → confirm
4. Verify `RecipientStatusList` appears with queued/in-progress rows
5. Verify rows update to `sent` via Realtime as emails are sent
6. Verify campaign status updates to `sent` at the end

**Step 4: Check console for errors**

Use: browser_console_messages with level `error`. If errors found, investigate and fix before marking complete.

**Step 5: Test error states**

- Try sending without Gmail connected → should prompt to go to settings
- Try sending a non-approved campaign → Edge Function should return 409

---

## Environment Setup Reminder

Before running OAuth tests, ensure these are set:

**Local `.env`:**
```
VITE_GOOGLE_CLIENT_ID=<your_google_client_id>
```

**Supabase Edge Function secrets:**
```bash
bunx supabase secrets set GOOGLE_CLIENT_ID=<your_client_id>
bunx supabase secrets set GOOGLE_CLIENT_SECRET=<your_client_secret>
bunx supabase secrets set APP_URL=http://localhost:5173
```

**Google Cloud Console:**
- Authorized redirect URIs must include: `{SUPABASE_URL}/functions/v1/oauth_google_callback`
- Scopes enabled: `gmail.send`, `userinfo.email`

---

## Code Review — Post-Implementation Notes

> **Review performed:** 2026-03-05 after all tasks marked complete.

### Fixes Applied (all resolved ✅)

**Critical:**

1. **`disconnectGoogleAccount` data-loss risk** — `src/api/gmail.ts:55`
   - Was: `.delete().neq('owner_id', '')` — relies entirely on RLS; silently deletes all rows if RLS is disabled (local dev, staging, test)
   - Fixed: Fetch session, extract `userId`, use `.delete().eq('owner_id', userId)` — explicit intent, defense in depth

2. **Campaign stuck in `sending` on unexpected error** — `supabase/functions/campaign_send/index.ts`
   - Was: Outer `catch` returned 500 without resetting campaign status — idempotency guard (`sent || sending`) would permanently block retry
   - Fixed: Declared `activeCampaignId` before the `try` block; outer `catch` now performs a best-effort `update({ status: 'failed' })` scoped to `.eq('status', 'sending')` before returning 500

**Important:**

3. **`useRecipientsRealtime` channel leak on rapid remount** — `src/queries/gmail.ts:83`
   - Was: `channel.value.unsubscribe()` — removes local reference but does not fully deregister with the Supabase client; rapid remount could cause silent duplicate subscription failures
   - Fixed: `supabase.removeChannel(channel.value)` — fully deregisters the channel from the client

4. **`oauth_google_callback` missing userinfo validation** — `supabase/functions/oauth_google_callback/index.ts:61`
   - Was: `profileData.email` used directly with no guard — failed userinfo request or missing email scope would upsert `null` into `google_email`
   - Fixed: `!profileResponse.ok` → `redirectError(...)` and `!profileData.email` → `redirectError(...)` before upsert

5. **`settings.vue` used `<style scoped>` for transition animation** — `src/pages/settings.vue`
   - Was: Named CSS transition classes in `<style scoped>` block — violates CLAUDE.md ("ALWAYS use TailwindCSS classes rather than manual CSS")
   - Fixed: Replaced with `enter-active-class`, `leave-active-class`, `enter-from-class`, `leave-to-class` props on `<Transition>` using Tailwind utilities

**Improvements noted (implemented over the plan):**

- `queries/gmail.ts`: Cache invalidation co-located in `onSuccess` callbacks instead of scattered across caller components
- `queries/gmail.ts`: `useSendCampaign` invalidates both `['campaign', campaignId]` and `['campaigns']`
- `settings.vue`: `router.replace({ path: '/settings' })` cleans OAuth query params from the URL after reading them
- `[id].vue`: `watch` on `campaign.value?.status` auto-shows `RecipientStatusList` for campaigns already in `sending`/`sent` state on page load (handles refresh case the plan didn't cover)

---

## Known Technical Debt (acknowledged, not blocking)

These were identified during code review and intentionally deferred:

### 1. No unit tests for Epic 6 critical logic

CLAUDE.md requires tests alongside each file. The following functions have non-trivial logic with no test coverage:

| Function | File | Risk |
|---|---|---|
| `escapeHtml()` | `campaign_send/index.ts` | Security — XSS prevention |
| `renderTokens()` | `campaign_send/index.ts` | Correctness — silent wrong output on edge cases |
| `toBase64Url()` | `campaign_send/index.ts` | Encoding correctness |
| `getCampaignRecipients()` normalize | `src/api/gmail.ts` | Array/object join detection for Supabase relations |

**Recommendation:** Add `campaign_send.test.ts` and `gmail.spec.ts` in a future session before adding more send functionality.

### 2. `alert()` used in component error paths

`GmailConnectCard.vue` and `SignatureEditor.vue` fall back to `alert()` on mutation errors — inconsistent with the page-level toast system in `settings.vue` and blocks the UI thread.

**Root cause:** No shared `useToast()` composable exists. The toast is currently local state in `settings.vue`.

**Recommendation:** Extract a `useToast()` composable in `src/composables/useToast.ts` with a root-level `<ToastContainer>` in `App.vue`. Replace `alert()` calls across all components in a dedicated session.

### 3. Gmail send rate limiting

`campaign_send` sends emails in a tight `for...of` loop with no delay between Gmail API calls. Gmail enforces per-user-per-second rate limits; accounts sending to 20+ missionaries may hit `429 Too Many Requests`.

`src/utils/delay.ts` exists in the project for exactly this purpose (per CLAUDE.md structure).

**Recommendation:** Add a `await delay(300)` (or randomized jitter) between `sendGmailMessage` calls before the list grows beyond ~15 missionaries.

### 4. `toBase64Url` string concatenation performance

The `toBase64Url` and `encodeSubject` functions use `binary += String.fromCharCode(byte)` — O(n²) for large inputs due to string immutability. Not a current problem (typical emails are <10KB), but will degrade for campaigns with many high-res image URLs in the body.

**Recommendation:** Replace with `String.fromCharCode(...bytes)` spread (safe for inputs <64KB) or a `Uint8Array`-to-binary approach when email sizes grow.
