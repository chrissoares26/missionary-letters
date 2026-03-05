import { ref, onUnmounted } from 'vue'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import {
  disconnectGoogleAccount,
  getCampaignRecipients,
  getGoogleAccount,
  getSignature,
  initiateGoogleOAuth,
  sendCampaign,
  updateSignature,
} from '@/api/gmail'
import { supabase } from '@/utils/supabase'

export function useGoogleAccountQuery() {
  return useQuery({
    key: ['google-account'],
    query: getGoogleAccount,
  })
}

export function useDisconnectGoogleAccount() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: disconnectGoogleAccount,
    onSuccess() {
      queryCache.invalidateQueries({ key: ['google-account'] })
    },
  })
}

export function useInitiateGoogleOAuth() {
  return useMutation({
    mutation: initiateGoogleOAuth,
  })
}

export function useSendCampaign() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (campaignId: string) => sendCampaign(campaignId),
    onSuccess: (_, campaignId) => {
      queryCache.invalidateQueries({ key: ['campaign', campaignId] })
      queryCache.invalidateQueries({ key: ['campaigns'] })
    },
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
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (signature: string) => updateSignature(signature),
    onSuccess() {
      queryCache.invalidateQueries({ key: ['signature'] })
    },
  })
}

export function useRecipientsRealtime(campaignId: string, onUpdate: () => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channel = ref<any>(null)

  function unsubscribe() {
    if (!channel.value) return

    supabase.removeChannel(channel.value)
    channel.value = null
  }

  function subscribe() {
    unsubscribe()

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

  onUnmounted(unsubscribe)

  return { subscribe, unsubscribe }
}
