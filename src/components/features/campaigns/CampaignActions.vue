<script setup lang="ts">
import { ref } from 'vue'
import type { Campaign } from '@/types/database'

interface Props {
  campaign: Campaign
  hasContent: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  approve: []
  unapprove: []
  send: []
}>()

const showApprovalModal = ref(false)
const showUnapproveModal = ref(false)

function handleApprove() {
  showApprovalModal.value = true
}

function confirmApproval() {
  showApprovalModal.value = false
  emit('approve')
}

function handleUnapprove() {
  showUnapproveModal.value = true
}

function confirmUnapprove() {
  showUnapproveModal.value = false
  emit('unapprove')
}
</script>

<template>
  <div class="sticky bottom-16 border-t border-[var(--border-default)] p-4 flex gap-3">
    <!-- Draft state -->
    <template v-if="campaign.status === 'draft'">
      <button
        type="button"
        class="flex-1 px-6 py-3 bg-[var(--action-primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasContent"
        @click="handleApprove"
      >
        Aprovar Campanha
      </button>
    </template>

    <!-- Approved state -->
    <template v-else-if="campaign.status === 'approved'">
      <button
        type="button"
        class="px-6 py-3 border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--bg-muted)]"
        @click="handleUnapprove"
      >
        Voltar para Rascunho
      </button>

      <button
        type="button"
        class="flex-1 px-6 py-3 bg-[var(--action-primary)] text-white rounded-lg font-medium hover:opacity-90"
        @click="emit('send')"
      >
        Enviar para Missionários
      </button>
    </template>

    <!-- Sent/Sending state -->
    <template v-else-if="campaign.status === 'sent' || campaign.status === 'sending'">
      <div class="flex-1 text-center text-[var(--text-secondary)]">
        {{ campaign.status === 'sending' ? 'Enviando...' : 'Campanha enviada' }}
      </div>
    </template>

    <!-- Unapprove modal -->
    <Teleport to="body">
      <div
        v-if="showUnapproveModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
        @click.self="showUnapproveModal = false"
      >
        <div
          class="bg-white rounded-t-2xl sm:rounded-2xl p-6 max-w-md w-full mx-4 sm:mx-0 animate-slide-up"
        >
          <h3 class="text-xl font-bold text-[var(--text-primary)] mb-2">Voltar para Rascunho?</h3>
          <p class="text-[var(--text-secondary)] mb-6">
            A campanha voltará ao estado de rascunho e precisará ser aprovada novamente antes do envio.
          </p>

          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--bg-muted)]"
              @click="showUnapproveModal = false"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg font-medium hover:opacity-90"
              @click="confirmUnapprove"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Approval modal -->
    <Teleport to="body">
      <div
        v-if="showApprovalModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
        @click.self="showApprovalModal = false"
      >
        <div
          class="bg-white rounded-t-2xl sm:rounded-2xl p-6 max-w-md w-full mx-4 sm:mx-0 animate-slide-up"
        >
          <h3 class="text-xl font-bold text-[var(--text-primary)] mb-2">Aprovar Campanha?</h3>
          <p class="text-[var(--text-secondary)] mb-6">
            Depois de aprovada, você poderá enviá-la aos missionários. Você ainda pode editar depois
            se necessário.
          </p>

          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--bg-muted)]"
              @click="showApprovalModal = false"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2 bg-[var(--action-primary)] text-white rounded-lg font-medium hover:opacity-90"
              @click="confirmApproval"
            >
              Aprovar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
