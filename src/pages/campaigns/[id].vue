<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useCampaignQuery,
  useCampaignContentQuery,
  useApproveCampaign,
  useUnapproveCampaign,
  useDeleteCampaign,
  useRegenerateDraft,
} from '@/queries/campaigns'
import CampaignHeader from '@/components/features/campaigns/CampaignHeader.vue'
import CampaignEditor from '@/components/features/campaigns/CampaignEditor.vue'
import CampaignActions from '@/components/features/campaigns/CampaignActions.vue'

const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string

const { data: campaign, status: campaignStatus } = useCampaignQuery(campaignId)
const { data: content, status: contentStatus } = useCampaignContentQuery(campaignId)
const approveMutation = useApproveCampaign()
const unapproveMutation = useUnapproveCampaign()
const deleteMutation = useDeleteCampaign()
const regenerateMutation = useRegenerateDraft()

const showToast = ref(false)
const toastMessage = ref('')

const generationStatus = computed<'idle' | 'generating' | 'success' | 'error'>(() => {
  if (campaign.value?.status !== 'draft') return 'idle'
  if (contentStatus.value === 'pending') return 'generating'
  if (content.value) return 'success'
  if (contentStatus.value === 'error') return 'error'
  return 'generating'
})

const hasContent = computed(() => !!content.value)

async function handleApprove() {
  if (!campaign.value) return

  try {
    await approveMutation.mutateAsync(campaign.value.id)
  } catch (error) {
    console.error('Failed to approve:', error)
    alert('Erro ao aprovar campanha')
  }
}

async function handleUnapprove() {
  if (!campaign.value) return

  try {
    await unapproveMutation.mutateAsync(campaign.value.id)
  } catch (error) {
    console.error('Failed to unapprove:', error)
    alert('Erro ao voltar para rascunho')
  }
}

async function handleDelete() {
  if (!campaign.value) return

  if (!confirm('Tem certeza que deseja excluir esta campanha?')) return

  try {
    await deleteMutation.mutateAsync(campaign.value.id)
    router.push('/campaigns')
  } catch (error) {
    console.error('Failed to delete:', error)
    alert('Erro ao excluir campanha')
  }
}

async function handleRegenerate() {
  if (!campaign.value) return

  if (!confirm('Tem certeza que deseja regenerar o rascunho? O conteúdo atual será perdido.')) return

  try {
    await regenerateMutation.mutateAsync(campaign.value.id)
  } catch (error) {
    console.error('Failed to regenerate:', error)
    alert('Erro ao regenerar rascunho')
  }
}

function handleSend() {
  // Epic 6 implementation
  alert('Funcionalidade de envio será implementada no Epic 6')
}

function handleCopy(text: string, type: string) {
  toastMessage.value = `${type} copiado!`
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}
</script>

<template>
  <div class="min-h-screen bg-[var(--bg-canvas)] pb-24">
    <div class="max-w-4xl mx-auto p-6">
      <!-- Loading state -->
      <div v-if="campaignStatus === 'pending'" class="text-center py-12">
        <p class="text-[var(--text-secondary)]">Carregando campanha...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="campaignStatus === 'error'" class="text-center py-12">
        <p class="text-red-500">Erro ao carregar campanha</p>
        <button
          type="button"
          class="mt-4 text-[var(--action-primary)] hover:underline"
          @click="router.push('/campaigns')"
        >
          Voltar para campanhas
        </button>
      </div>

      <!-- Loaded -->
      <template v-else-if="campaign">
        <CampaignHeader
          :campaign="campaign"
          :generation-status="generationStatus"
          @regenerate="handleRegenerate"
          @delete="handleDelete"
        />

        <div class="mt-8">
          <!-- Generation in progress -->
          <div v-if="generationStatus === 'generating'" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[var(--action-primary)] border-t-transparent mb-4" />
            <p class="text-[var(--text-secondary)]">Gerando rascunho...</p>
            <p class="text-sm text-[var(--text-secondary)] mt-2">Isso pode levar até 30 segundos</p>
          </div>

          <!-- Generation error -->
          <div v-else-if="generationStatus === 'error'" class="text-center py-12">
            <p class="text-red-500 mb-4">Erro ao gerar rascunho</p>
            <button
              type="button"
              class="px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg hover:opacity-90"
              @click="handleRegenerate"
            >
              Tentar Novamente
            </button>
          </div>

          <!-- Content editor -->
          <CampaignEditor
            v-else-if="content"
            :campaign-id="campaignId"
            :content="content"
            @copy="handleCopy"
          />
        </div>

        <!-- Actions -->
        <CampaignActions
          :campaign="campaign"
          :has-content="hasContent"
          @approve="handleApprove"
          @unapprove="handleUnapprove"
          @send="handleSend"
        />
      </template>

      <!-- Toast notification -->
      <Teleport to="body">
        <div
          v-if="showToast"
          class="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 text-white rounded-lg shadow-lg animate-fade-in"
        >
          {{ toastMessage }}
        </div>
      </Teleport>
    </div>
  </div>
</template>
