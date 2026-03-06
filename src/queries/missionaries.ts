import { useQuery, useMutation, useQueryCache } from '@pinia/colada'
import { ref, type MaybeRefOrGetter, toValue } from 'vue'
import {
  getMissionaries,
  getMissionaryById,
  createMissionary,
  updateMissionary,
  deleteMissionary,
} from '@/api/missionaries'
import type { MissionaryFormData, MissionaryFilters } from '@/types/missionary'

/**
 * Query for fetching all missionaries with optional filters
 */
export function useMissionariesQuery(filters?: MaybeRefOrGetter<MissionaryFilters | undefined>) {
  return useQuery({
    key: () => ['missionaries', toValue(filters) ?? null],
    query: () => getMissionaries(toValue(filters)),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Query for fetching a single missionary by ID
 */
export function useMissionaryQuery(id: MaybeRefOrGetter<string>) {
  return useQuery({
    key: () => ['missionary', toValue(id)],
    query: () => getMissionaryById(toValue(id)),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Mutation for creating a new missionary
 */
export function useCreateMissionary() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (formData: MissionaryFormData) => createMissionary(formData),
    onSuccess: () => {
      // Invalidate all missionaries queries to refetch the list
      queryCache.invalidateQueries({ key: ['missionaries'] })
    },
  })
}

/**
 * Mutation for updating an existing missionary
 */
export function useUpdateMissionary() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ id, data }: { id: string; data: Partial<MissionaryFormData> }) =>
      updateMissionary(id, data),
    onSuccess: (updatedMissionary) => {
      // Invalidate all missionaries queries
      queryCache.invalidateQueries({ key: ['missionaries'] })
      // Invalidate the specific missionary query
      queryCache.invalidateQueries({ key: ['missionary', updatedMissionary.id] })
    },
  })
}

/**
 * Mutation for deleting (soft delete) a missionary
 */
export function useDeleteMissionary() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (id: string) => deleteMissionary(id),
    onSuccess: () => {
      // Invalidate all missionaries queries to refetch the list
      queryCache.invalidateQueries({ key: ['missionaries'] })
    },
  })
}

/**
 * Composable for managing missionary filters with reactive state
 */
export function useMissionaryFilters() {
  const filters = ref<MissionaryFilters>({
    active: true, // Default to showing only active missionaries
    search: '',
    sortBy: 'last_name',
    sortDirection: 'asc',
  })

  const setActiveFilter = (active: boolean | undefined) => {
    filters.value = { ...filters.value, active }
  }

  const setSearchFilter = (search: string) => {
    filters.value = { ...filters.value, search }
  }

  const setSorting = (sortBy: MissionaryFilters['sortBy'], sortDirection?: MissionaryFilters['sortDirection']) => {
    filters.value = { ...filters.value, sortBy, sortDirection: sortDirection || 'asc' }
  }

  const clearFilters = () => {
    filters.value = {
      active: true,
      search: '',
      sortBy: 'last_name',
      sortDirection: 'asc',
    }
  }

  return {
    filters,
    setActiveFilter,
    setSearchFilter,
    setSorting,
    clearFilters,
  }
}
