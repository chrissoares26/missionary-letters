import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { delay, escapeHtml, getRateLimitDelayMs, renderTokens, toBase64Url } from './helpers.ts'

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

// FIX (unescape deprecated): RFC 2047 encoded-word for email subjects
function encodeSubject(subject: string): string {
  const bytes = new TextEncoder().encode(subject)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return `=?UTF-8?B?${btoa(binary)}?=`
}

function buildHtmlEmail(
  body: string,
  images: string[],
  signature: string | null,
  aiImageUrl: string | null,
): string {
  // FIX (XSS): escape each line before wrapping in <p>
  const paragraphs = body
    .split('\n')
    .map((line) =>
      line.trim() ? `<p style="margin:0 0 16px 0;line-height:1.6">${escapeHtml(line)}</p>` : '',
    )
    .join('')

  // AI-generated quote card is the hero image — shown first, centered, larger
  const heroHtml = aiImageUrl
    ? `<div style="text-align:center;margin:24px 0">
        <img src="${escapeHtml(aiImageUrl)}" style="max-width:100%;width:480px;height:auto;border-radius:12px;display:inline-block" alt="Imagem da semana" />
      </div>`
    : ''

  // Any manually uploaded images follow
  const imagesHtml = images.length
    ? images
        .map(
          (url) =>
            `<img src="${escapeHtml(url)}" style="max-width:100%;height:auto;margin:16px 0;border-radius:8px" alt="" />`,
        )
        .join('')
    : ''

  // Signature is trusted (owner-entered), but newlines are converted to <br> only
  const signatureHtml = signature
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;color:#666;font-size:14px">${escapeHtml(signature).replace(/\n/g, '<br>')}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;background:#fff">
${heroHtml}
${paragraphs}
${imagesHtml}
${signatureHtml}
</body>
</html>`
}

async function refreshToken(
  account: GoogleAccount,
): Promise<{ access_token: string; expiry: string }> {
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

async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string,
): Promise<string> {
  // FIX (boundary collision): add random suffix to prevent same-millisecond collisions
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const rawEmail = [
    `To: ${to}`,
    // FIX (unescape deprecated): use TextEncoder-based RFC 2047 encoding
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
  ].join('\r\n')

  // FIX (unescape deprecated): use TextEncoder-based base64url encoding
  const encodedEmail = toBase64Url(rawEmail)

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

  // Declared outside try so the catch block can reset campaign status on unexpected errors
  let activeCampaignId: string | undefined

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

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(token)

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
    activeCampaignId = body.campaign_id
    if (!body.campaign_id) {
      return new Response(JSON.stringify({ error: 'Missing campaign_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: campaign, error: campaignError } = await adminClient
      .from('campaigns')
      .select('*')
      .eq('id', body.campaign_id)
      .eq('owner_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // FIX (idempotency): block both 'sent' and 'sending' to prevent concurrent double-sends
    if (campaign.status === 'sent' || campaign.status === 'sending') {
      return new Response(
        JSON.stringify({ error: 'Campaign already sent or currently being sent' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (campaign.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Campaign must be approved before sending' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: content, error: contentError } = await adminClient
      .from('campaign_content')
      .select('*')
      .eq('campaign_id', body.campaign_id)
      .single()

    if (contentError || !content) {
      return new Response(JSON.stringify({ error: 'Campaign content not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    // FIX (select *): only fetch columns needed for token refresh and sending
    const { data: googleAccount, error: gaError } = await adminClient
      .from('google_accounts')
      .select('access_token, refresh_token, expiry')
      .eq('owner_id', user.id)
      .single()

    if (gaError || !googleAccount) {
      return new Response(
        JSON.stringify({ error: 'Gmail not connected. Please connect in Settings.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('signature')
      .eq('id', user.id)
      .single()

    let accessToken = googleAccount.access_token
    const isExpired = new Date(googleAccount.expiry).getTime() < Date.now() + 60_000

    if (isExpired) {
      const refreshed = await refreshToken(googleAccount as GoogleAccount)
      accessToken = refreshed.access_token
      await adminClient
        .from('google_accounts')
        .update({
          access_token: refreshed.access_token,
          expiry: refreshed.expiry,
          updated_at: new Date().toISOString(),
        })
        .eq('owner_id', user.id)
    }

    await adminClient
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', body.campaign_id)

    let successCount = 0
    let failCount = 0

    const activeMissionaries = missionaries as Missionary[]
    const shouldRateLimit = activeMissionaries.length > 15

    for (const [index, missionary] of activeMissionaries.entries()) {
      // Rate-limit long sends to reduce Gmail API burst pressure for large lists.
      if (shouldRateLimit && index > 0) {
        await delay(getRateLimitDelayMs(300, 200))
      }

      const renderedSubject = renderTokens(content.email_subject, missionary)
      const renderedBody = renderTokens(content.email_body, missionary)
      const htmlBody = buildHtmlEmail(
        renderedBody,
        content.images ?? [],
        profile?.signature ?? null,
        content.ai_image_url ?? null,
      )

      // FIX (owner_id): campaign_recipients has no owner_id column — removed
      // FIX (silent error): destructure error and count failures if insert fails
      const { data: recipient, error: insertError } = await adminClient
        .from('campaign_recipients')
        .insert({
          campaign_id: body.campaign_id,
          missionary_id: missionary.id,
          to_email: missionary.email,
          rendered_subject: renderedSubject,
          rendered_body: htmlBody,
          status: 'queued',
        })
        .select('id')
        .single()

      if (insertError || !recipient) {
        console.error('Failed to insert recipient:', insertError?.message)
        failCount++
        continue
      }

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
          .update({
            status: 'sent',
            gmail_message_id: gmailMessageId,
            sent_at: new Date().toISOString(),
          })
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

    const finalStatus = failCount === activeMissionaries.length ? 'failed' : 'sent'
    await adminClient
      .from('campaigns')
      .update({ status: finalStatus })
      .eq('id', body.campaign_id)

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error:', error)

    // Best-effort: if campaign was set to 'sending' before the error, reset to 'failed'
    // so the user can retry rather than being permanently blocked by the idempotency guard.
    if (activeCampaignId) {
      try {
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        )
        await adminClient
          .from('campaigns')
          .update({ status: 'failed' })
          .eq('id', activeCampaignId)
          .eq('status', 'sending')
      } catch {
        // ignore — recovery is best-effort
      }
    }

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
