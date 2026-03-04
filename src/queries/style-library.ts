import { useQuery, useMutation, useQueryCache } from '@pinia/colada'
import {
  getStyleEmails,
  getStyleEmailCount,
  createStyleEmail,
  deleteStyleEmail,
  triggerEmbedding,
} from '@/api/style-library'
import type { StyleEmailFormData } from '@/types/style-email'

export function useStyleEmailsQuery() {
  return useQuery({
    key: ['style-emails'],
    query: () => getStyleEmails(),
    staleTime: 1000 * 60 * 2, // 2 minutes — badge updates handled via Realtime
  })
}

export function useStyleEmailCountQuery() {
  return useQuery({
    key: ['style-emails-count'],
    query: () => getStyleEmailCount(),
    staleTime: 0, // Always fresh for cap enforcement
  })
}

export function useCreateStyleEmail() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: async (formData: StyleEmailFormData) => {
      const email = await createStyleEmail(formData)
      // Fire-and-forget: trigger embedding after insert, badge handles status
      triggerEmbedding(email.id)
      return email
    },
    onSuccess: () => {
      queryCache.invalidateQueries({ key: ['style-emails'] })
      queryCache.invalidateQueries({ key: ['style-emails-count'] })
    },
  })
}

export function useDeleteStyleEmail() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (id: string) => deleteStyleEmail(id),
    onSuccess: () => {
      queryCache.invalidateQueries({ key: ['style-emails'] })
      queryCache.invalidateQueries({ key: ['style-emails-count'] })
    },
  })
}
