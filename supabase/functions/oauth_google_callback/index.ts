import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

  function redirectError(message: string) {
    return Response.redirect(
      `${appUrl}/settings?gmail=error&msg=${encodeURIComponent(message)}`,
      302,
    )
  }

  if (!code || !state) return redirectError('Missing code or state')

  let token: string
  try {
    token = atob(state)
  } catch {
    return redirectError('Invalid state')
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(token)

  if (authError || !user) return redirectError('Unauthorized')

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
  if (tokenData.error) {
    return redirectError(tokenData.error_description ?? tokenData.error)
  }

  const profileResponse = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
  )

  if (!profileResponse.ok) {
    return redirectError('Failed to fetch Google profile')
  }

  const profileData = await profileResponse.json()

  if (!profileData.email) {
    return redirectError('Google account has no email address')
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const expiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

  // FIX: Google only sends refresh_token on first grant (prompt=consent).
  // On reconnect it may be absent — preserve the existing one by omitting it from upsert.
  const upsertPayload: Record<string, unknown> = {
    owner_id: user.id,
    google_email: profileData.email,
    access_token: tokenData.access_token,
    expiry,
    scopes: (tokenData.scope ?? '').split(' ').filter(Boolean),
    updated_at: new Date().toISOString(),
  }
  if (tokenData.refresh_token) {
    upsertPayload.refresh_token = tokenData.refresh_token
  }

  const { error: upsertError } = await adminClient
    .from('google_accounts')
    .upsert(upsertPayload, { onConflict: 'owner_id' })

  if (upsertError) {
    console.error('Upsert error:', upsertError)
    return redirectError('Failed to save account')
  }

  return Response.redirect(`${appUrl}/settings?gmail=connected`, 302)
})
