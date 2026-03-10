import { supabase } from '@/utils/supabase'
import type { StyleEmail, StyleProfile, Database } from '@/types/database'
import type { StyleEmailFormData } from '@/types/style-email'

type StyleEmailInsert = Database['public']['Tables']['style_emails']['Insert']

export async function getStyleEmails(): Promise<StyleEmail[]> {
  const { data, error } = await supabase
    .from('style_emails')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch style emails: ${error.message}`)
  return data || []
}

export async function getStyleEmailCount(): Promise<number> {
  const { count, error } = await supabase
    .from('style_emails')
    .select('*', { count: 'exact', head: true })

  if (error) throw new Error(`Failed to count style emails: ${error.message}`)
  return count || 0
}

export async function createStyleEmail(formData: StyleEmailFormData): Promise<StyleEmail> {
  const { data: session, error: authError } = await supabase.auth.getSession()
  if (authError || !session.session?.user) {
    throw new Error('User must be authenticated to add style emails')
  }

  const insertData: StyleEmailInsert = {
    owner_id: session.session.user.id,
    subject: formData.subject,
    body: formData.body,
    source_label: formData.source_label || null,
    embedding: null,
    token_count: null,
    tags: null,
    created_at_original: null,
  }

  const { data, error } = await supabase
    .from('style_emails')
    .insert(insertData)
    .select()
    .single()

  if (error) throw new Error(`Failed to create style email: ${error.message}`)
  if (!data) throw new Error('Failed to create style email: No data returned')
  return data
}

export async function deleteStyleEmail(id: string): Promise<void> {
  const { error } = await supabase.from('style_emails').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete style email: ${error.message}`)
}

export async function triggerEmbedding(id: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { error } = await supabase.functions.invoke('style_embed_upsert', {
    body: { id },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  })
  // Fire-and-forget: badge will show status via Realtime
  if (error) console.warn('Embedding trigger failed:', error.message)
}

export async function getStyleProfile(): Promise<StyleProfile | null> {
  const { data: session, error: authError } = await supabase.auth.getSession()
  if (authError || !session.session?.user) {
    throw new Error('User must be authenticated to fetch style profile')
  }

  const { data, error } = await supabase
    .from('style_profile')
    .select('*')
    .eq('owner_id', session.session.user.id)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch style profile: ${error.message}`)
  }

  return data
}

export async function generateStyleProfile(): Promise<StyleProfile> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { data, error } = await supabase.functions.invoke('style_profile_generate', {
    body: {},
    headers: { Authorization: `Bearer ${session?.access_token}` },
  })

  if (error) throw new Error(`Failed to generate style profile: ${error.message}`)
  if (!data?.success) throw new Error('Style profile generation failed')

  return data.profile
}
