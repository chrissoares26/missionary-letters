import { useQuery, useMutation, useQueryCache } from '@pinia/colada'
import { ref, type MaybeRefOrGetter, toValue, onUnmounted } from 'vue'
import {
  getCampaigns,
  getCampaignById,
  getCampaignContent,
  createCampaign,
  updateCampaign,
  updateCampaignContent,
  deleteCampaign,
  triggerDraftGeneration,
  approveCampaign,
  unapproveCampaign,
  regenerateDraft,
  uploadCampaignImage,
  deleteCampaignImage,
} from '@/api/campaigns'
import type { CampaignFormData, CampaignFilters, CampaignContentUpdate } from '@/types/campaign'
import { supabase } from '@/utils/supabase'

/**
 * Query for fetching all campaigns with optional filters
 */
export function useCampaignsQuery(filters?: MaybeRefOrGetter<CampaignFilters | undefined>) {
  return useQuery({
    key: () => ['campaigns', JSON.stringify(toValue(filters) ?? null)],
    query: () => getCampaigns(toValue(filters)),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Query for fetching a single campaign by ID
 */
export function useCampaignQuery(id: MaybeRefOrGetter<string>) {
  return useQuery({
    key: () => ['campaign', toValue(id)],
    query: () => getCampaignById(toValue(id)),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Query for fetching campaign content with Realtime subscription
 */
export function useCampaignContentQuery(campaignId: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const id = toValue(campaignId)

  const query = useQuery({
    key: () => ['campaign-content', id],
    query: () => getCampaignContent(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Setup Realtime subscription for live updates
  const channel = supabase
    .channel(`campaign-content:${id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'campaign_content',
        filter: `campaign_id=eq.${id}`,
      },
      () => {
        // Invalidate query when content changes
        queryCache.invalidateQueries({ key: ['campaign-content', id] })
      },
    )
    .subscribe()

  // Cleanup subscription on unmount
  onUnmounted(() => {
    channel.unsubscribe()
  })

  return query
}

/**
 * Mutation for creating a new campaign
 */
export function useCreateCampaign() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (formData: CampaignFormData) => createCampaign(formData),
    onSuccess: () => {
      // Invalidate all campaigns queries to refetch the list
      queryCache.invalidateQueries({ key: ['campaigns'] })
    },
  })
}

/**
 * Mutation for updating an existing campaign
 */
export function useUpdateCampaign() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ id, data }: { id: string; data: Partial<CampaignFormData> }) =>
      updateCampaign(id, data),
    onSuccess: (updatedCampaign) => {
      // Invalidate all campaigns queries
      queryCache.invalidateQueries({ key: ['campaigns'] })
      // Invalidate the specific campaign query
      queryCache.invalidateQueries({ key: ['campaign', updatedCampaign.id] })
    },
  })
}

/**
 * Mutation for updating campaign content (auto-save)
 */
export function useUpdateCampaignContent() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ campaignId, updates }: { campaignId: string; updates: CampaignContentUpdate }) =>
      updateCampaignContent(campaignId, updates),
    onSuccess: (_, variables) => {
      // Invalidate the specific content query
      queryCache.invalidateQueries({ key: ['campaign-content', variables.campaignId] })
    },
  })
}

/**
 * Mutation for deleting a campaign
 */
export function useDeleteCampaign() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (id: string) => deleteCampaign(id),
    onSuccess: () => {
      // Invalidate all campaigns queries to refetch the list
      queryCache.invalidateQueries({ key: ['campaigns'] })
    },
  })
}

/**
 * Mutation for triggering draft generation
 */
export function useTriggerDraftGeneration() {
  return useMutation({
    mutation: (campaignId: string) => triggerDraftGeneration(campaignId),
    // No onSuccess needed - Realtime subscription will update content query
  })
}

/**
 * Mutation for approving a campaign
 */
export function useApproveCampaign() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (campaignId: string) => approveCampaign(campaignId),
    onSuccess: (updatedCampaign) => {
      // Invalidate all campaigns queries
      queryCache.invalidateQueries({ key: ['campaigns'] })
      // Invalidate the specific campaign query
      queryCache.invalidateQueries({ key: ['campaign', updatedCampaign.id] })
    },
  })
}

/**
 * Mutation for unapproving a campaign (revert to draft)
 */
export function useUnapproveCampaign() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (campaignId: string) => unapproveCampaign(campaignId),
    onSuccess: (updatedCampaign) => {
      // Invalidate all campaigns queries
      queryCache.invalidateQueries({ key: ['campaigns'] })
      // Invalidate the specific campaign query
      queryCache.invalidateQueries({ key: ['campaign', updatedCampaign.id] })
    },
  })
}

/**
 * Mutation for regenerating draft content
 */
export function useRegenerateDraft() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (campaignId: string) => regenerateDraft(campaignId),
    onSuccess: (_, campaignId) => {
      // Invalidate content query - Realtime will update when new content arrives
      queryCache.invalidateQueries({ key: ['campaign-content', campaignId] })
    },
  })
}

/**
 * Mutation for uploading campaign image
 */
export function useUploadCampaignImage() {
  return useMutation({
    mutation: ({ campaignId, file }: { campaignId: string; file: File }) =>
      uploadCampaignImage(campaignId, file),
  })
}

/**
 * Mutation for deleting campaign image
 */
export function useDeleteCampaignImage() {
  return useMutation({
    mutation: (imageUrl: string) => deleteCampaignImage(imageUrl),
  })
}

/**
 * Composable for managing campaign filters with reactive state
 */
export function useCampaignFilters() {
  const filters = ref<CampaignFilters>({
    status: undefined, // Show all by default
    search: '',
    sortBy: 'created_at',
    sortDirection: 'desc',
  })

  function setStatusFilter(status: CampaignFilters['status']) {
    filters.value = { ...filters.value, status }
  }

  function setSearchFilter(search: string) {
    filters.value = { ...filters.value, search }
  }

  function setSorting(sortBy: CampaignFilters['sortBy'], sortDirection?: CampaignFilters['sortDirection']) {
    filters.value = { ...filters.value, sortBy, sortDirection: sortDirection || 'desc' }
  }

  function clearFilters() {
    filters.value = {
      status: undefined,
      search: '',
      sortBy: 'created_at',
      sortDirection: 'desc',
    }
  }

  return {
    filters,
    setStatusFilter,
    setSearchFilter,
    setSorting,
    clearFilters,
  }
}
