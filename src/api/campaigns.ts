import { supabase } from '@/utils/supabase'
import type { Campaign, CampaignContent, Database } from '@/types/database'
import type { CampaignFormData, CampaignFilters, CampaignContentUpdate } from '@/types/campaign'

type CampaignInsert = Database['public']['Tables']['campaigns']['Insert']
type CampaignUpdate = Database['public']['Tables']['campaigns']['Update']

/**
 * Fetch all campaigns for the current authenticated user
 * Supports filtering by status and search term
 */
export async function getCampaigns(filters?: CampaignFilters): Promise<Campaign[]> {
  let query = supabase
    .from('campaigns')
    .select('*')

  // Apply status filter
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  // Apply search filter (searches topic and notes)
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`
    query = query.or(`topic.ilike.${searchTerm},notes.ilike.${searchTerm}`)
  }

  // Apply sorting
  const sortBy = filters?.sortBy || 'created_at'
  const sortDirection = filters?.sortDirection || 'desc'
  query = query.order(sortBy, { ascending: sortDirection === 'asc' })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch campaigns: ${error.message}`)
  }

  return data || []
}

/**
 * Fetch a single campaign by ID
 */
export async function getCampaignById(id: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch campaign: ${error.message}`)
  }

  if (!data) {
    throw new Error('Campaign not found')
  }

  return data
}

/**
 * Fetch campaign content by campaign ID
 */
export async function getCampaignContent(campaignId: string): Promise<CampaignContent | null> {
  const { data, error } = await supabase
    .from('campaign_content')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch campaign content: ${error.message}`)
  }

  return data
}

/**
 * Create a new campaign
 */
export async function createCampaign(formData: CampaignFormData): Promise<Campaign> {
  const { data: session, error: authError } = await supabase.auth.getSession()

  if (authError || !session.session?.user) {
    throw new Error('User must be authenticated to create campaigns')
  }

  const insertData: CampaignInsert = {
    owner_id: session.session.user.id,
    topic: formData.topic,
    notes: formData.notes || null,
    resources: formData.resources || null,
    language: 'pt-BR',
    status: 'draft',
    approved_at: null,
  }

  const { data, error } = await supabase
    .from('campaigns')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create campaign: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to create campaign: No data returned')
  }

  return data
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  id: string,
  updates: Partial<CampaignFormData>,
): Promise<Campaign> {
  const updateData: CampaignUpdate = {}

  if (updates.topic !== undefined) updateData.topic = updates.topic
  if (updates.notes !== undefined) updateData.notes = updates.notes
  if (updates.resources !== undefined) updateData.resources = updates.resources

  const { data, error } = await supabase
    .from('campaigns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update campaign: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to update campaign: No data returned')
  }

  return data
}

/**
 * Update campaign content (auto-save)
 */
export async function updateCampaignContent(
  campaignId: string,
  updates: CampaignContentUpdate,
): Promise<CampaignContent> {
  const updateData: CampaignContentUpdate = {}

  if (updates.email_subject !== undefined) updateData.email_subject = updates.email_subject
  if (updates.email_body !== undefined) updateData.email_body = updates.email_body
  if (updates.whatsapp_text !== undefined) updateData.whatsapp_text = updates.whatsapp_text
  if (updates.facebook_text !== undefined) updateData.facebook_text = updates.facebook_text
  if (updates.images !== undefined) updateData.images = updates.images

  const { data, error } = await supabase
    .from('campaign_content')
    .update(updateData)
    .eq('campaign_id', campaignId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update campaign content: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to update campaign content: No data returned')
  }

  return data
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from('campaigns').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete campaign: ${error.message}`)
  }
}

/**
 * Trigger draft generation (fire-and-forget)
 */
export async function triggerDraftGeneration(campaignId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('draft_generate', {
    body: { campaign_id: campaignId },
  })

  // Fire-and-forget: content will appear via Realtime subscription
  if (error) console.warn('Draft generation trigger failed:', error.message)
}

/**
 * Approve campaign (sets status and timestamp)
 */
export async function approveCampaign(campaignId: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to approve campaign: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to approve campaign: No data returned')
  }

  return data
}

/**
 * Unapprove campaign (revert to draft)
 */
export async function unapproveCampaign(campaignId: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update({
      status: 'draft',
      approved_at: null,
    })
    .eq('id', campaignId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to unapprove campaign: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to unapprove campaign: No data returned')
  }

  return data
}

/**
 * Regenerate draft (delete old content, trigger new generation)
 */
export async function regenerateDraft(campaignId: string): Promise<void> {
  // Delete old content
  const { error: deleteError } = await supabase
    .from('campaign_content')
    .delete()
    .eq('campaign_id', campaignId)

  if (deleteError) {
    throw new Error(`Failed to delete old content: ${deleteError.message}`)
  }

  // Trigger new generation
  await triggerDraftGeneration(campaignId)
}

/**
 * Upload campaign image to Supabase Storage
 */
export async function uploadCampaignImage(
  campaignId: string,
  file: File,
): Promise<string> {
  const { data: session, error: authError } = await supabase.auth.getSession()

  if (authError || !session.session?.user) {
    throw new Error('User must be authenticated to upload images')
  }

  const ownerId = session.session.user.id
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${ownerId}/${campaignId}/${fileName}`

  const { data, error } = await supabase.storage
    .from('campaign-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('campaign-images')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

/**
 * Delete campaign image from Supabase Storage
 */
export async function deleteCampaignImage(imageUrl: string): Promise<void> {
  // Extract path from URL
  const url = new URL(imageUrl)
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/campaign-images\/(.+)/)

  if (!pathMatch || !pathMatch[1]) {
    throw new Error('Invalid image URL')
  }

  const filePath = pathMatch[1]

  const { error } = await supabase.storage
    .from('campaign-images')
    .remove([filePath])

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`)
  }
}
