import { supabase } from '@/utils/supabase'
import type { CampaignRecipient, GoogleAccount } from '@/types/database'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email'

interface MissionaryInfo {
  first_name: string
  last_name: string
  title: string
}

export interface CampaignRecipientWithMissionary extends CampaignRecipient {
  missionaries: MissionaryInfo | null
}

export async function initiateGoogleOAuth(): Promise<void> {
  if (!SUPABASE_URL) throw new Error('Missing VITE_SUPABASE_URL')
  if (!GOOGLE_CLIENT_ID) throw new Error('Missing VITE_GOOGLE_CLIENT_ID')

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Not authenticated')

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth_google_callback`
  const state = btoa(accessToken)

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function getGoogleAccount(): Promise<Pick<GoogleAccount, 'google_email' | 'expiry' | 'scopes' | 'updated_at'> | null> {
  const { data, error } = await supabase
    .from('google_accounts')
    .select('google_email, expiry, scopes, updated_at')
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch Google account: ${error.message}`)
  }

  return data
}

export async function disconnectGoogleAccount(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Not authenticated')

  const { error } = await supabase.from('google_accounts').delete().eq('owner_id', userId)

  if (error) {
    throw new Error(`Failed to disconnect Google account: ${error.message}`)
  }
}

export async function sendCampaign(campaignId: string): Promise<{ sent: number; failed: number }> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { data, error } = await supabase.functions.invoke('campaign_send', {
    body: { campaign_id: campaignId },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  })

  if (error) {
    throw new Error(`Failed to send campaign: ${error.message}`)
  }

  return {
    sent: data?.sent ?? 0,
    failed: data?.failed ?? 0,
  }
}

export async function getCampaignRecipients(campaignId: string): Promise<CampaignRecipientWithMissionary[]> {
  const { data, error } = await supabase
    .from('campaign_recipients')
    .select(`
      id,
      campaign_id,
      missionary_id,
      to_email,
      rendered_subject,
      rendered_body,
      status,
      gmail_message_id,
      error,
      sent_at,
      created_at,
      missionaries ( first_name, last_name, title )
    `)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch campaign recipients: ${error.message}`)
  }

  return (data ?? []).map((row) => {
    const missionaryData = Array.isArray(row.missionaries) ? row.missionaries[0] : row.missionaries
    const missionaries = missionaryData
      ? {
          first_name: missionaryData.first_name,
          last_name: missionaryData.last_name,
          title: missionaryData.title,
        }
      : null

    return {
      ...row,
      missionaries,
    }
  }) as CampaignRecipientWithMissionary[]
}

export async function updateSignature(signature: string): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (sessionError || !userId) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ signature, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to update signature: ${error.message}`)
  }
}

export async function getSignature(): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('signature')
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch signature: ${error.message}`)
  }

  return data?.signature ?? null
}
