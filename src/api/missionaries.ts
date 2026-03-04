import { supabase } from '@/utils/supabase'
import type { Missionary, Database } from '@/types/database'
import type { MissionaryFormData, MissionaryFilters } from '@/types/missionary'

type MissionaryInsert = Database['public']['Tables']['missionaries']['Insert']
type MissionaryUpdate = Database['public']['Tables']['missionaries']['Update']

/**
 * Fetch all missionaries for the current authenticated user
 * Supports filtering by active status and search term
 */
export async function getMissionaries(filters?: MissionaryFilters): Promise<Missionary[]> {
  let query = supabase
    .from('missionaries')
    .select('*')

  // Apply active filter
  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active)
  }

  // Apply search filter (searches first_name, last_name, email, mission_name)
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`
    query = query.or(
      `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},mission_name.ilike.${searchTerm}`,
    )
  }

  // Apply sorting
  const sortBy = filters?.sortBy || 'last_name'
  const sortDirection = filters?.sortDirection || 'asc'
  query = query.order(sortBy, { ascending: sortDirection === 'asc' })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch missionaries: ${error.message}`)
  }

  return data || []
}

/**
 * Fetch a single missionary by ID
 */
export async function getMissionaryById(id: string): Promise<Missionary> {
  const { data, error } = await supabase
    .from('missionaries')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch missionary: ${error.message}`)
  }

  if (!data) {
    throw new Error('Missionary not found')
  }

  return data
}

/**
 * Create a new missionary
 */
export async function createMissionary(formData: MissionaryFormData): Promise<Missionary> {
  const { data: session, error: authError } = await supabase.auth.getSession()

  if (authError || !session.session?.user) {
    throw new Error('User must be authenticated to create missionaries')
  }

  const insertData: MissionaryInsert = {
    owner_id: session.session.user.id,
    title: formData.title,
    first_name: formData.first_name,
    last_name: formData.last_name,
    email: formData.email,
    mission_name: formData.mission_name,
    mission_end_date: formData.mission_end_date,
    active: formData.active,
    inactive_reason: formData.inactive_reason || null,
    notes: formData.notes || null,
  }

  const { data, error } = await supabase
    .from('missionaries')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create missionary: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to create missionary: No data returned')
  }

  return data
}

/**
 * Update an existing missionary
 */
export async function updateMissionary(
  id: string,
  formData: Partial<MissionaryFormData>,
): Promise<Missionary> {
  const updateData: MissionaryUpdate = {}

  if (formData.title !== undefined) updateData.title = formData.title
  if (formData.first_name !== undefined) updateData.first_name = formData.first_name
  if (formData.last_name !== undefined) updateData.last_name = formData.last_name
  if (formData.email !== undefined) updateData.email = formData.email
  if (formData.mission_name !== undefined) updateData.mission_name = formData.mission_name
  if (formData.mission_end_date !== undefined) updateData.mission_end_date = formData.mission_end_date
  if (formData.active !== undefined) updateData.active = formData.active
  if (formData.inactive_reason !== undefined) updateData.inactive_reason = formData.inactive_reason
  if (formData.notes !== undefined) updateData.notes = formData.notes

  const { data, error } = await supabase
    .from('missionaries')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update missionary: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to update missionary: No data returned')
  }

  return data
}

/**
 * Delete a missionary (soft delete by setting active = false)
 */
export async function deleteMissionary(id: string): Promise<void> {
  const { error } = await supabase
    .from('missionaries')
    .update({ active: false, inactive_reason: 'Removido manualmente' })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete missionary: ${error.message}`)
  }
}

/**
 * Permanently delete a missionary (hard delete)
 * Only use for cleanup/admin purposes
 */
export async function hardDeleteMissionary(id: string): Promise<void> {
  const { error } = await supabase.from('missionaries').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to permanently delete missionary: ${error.message}`)
  }
}
