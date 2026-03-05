<script setup lang="ts">
import { computed } from 'vue'
import type { Campaign } from '@/types/database'

interface Props {
  campaign: Campaign
  generationStatus?: 'idle' | 'generating' | 'success' | 'error'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  regenerate: []
  delete: []
}>()

const statusConfig = computed(() => {
  if (props.generationStatus === 'generating') {
    return {
      label: 'Gerando...',
      color: 'bg-amber-500',
      animate: true,
    }
  }

  if (props.generationStatus === 'error') {
    return {
      label: 'Erro ⚠',
      color: 'bg-red-500',
      animate: false,
    }
  }

  switch (props.campaign.status) {
    case 'approved':
      return {
        label: 'Aprovada ✓',
        color: 'bg-blue-500',
        animate: false,
      }
    case 'sent':
      return {
        label: 'Enviada ✓',
        color: 'bg-green-500',
        animate: false,
      }
    case 'sending':
      return {
        label: 'Enviando...',
        color: 'bg-blue-500',
        animate: true,
      }
    case 'failed':
      return {
        label: 'Falhou ⚠',
        color: 'bg-red-500',
        animate: false,
      }
    default:
      return {
        label: 'Rascunho',
        color: 'bg-gray-500',
        animate: false,
      }
  }
})

const formattedDate = computed(() => {
  const date = new Date(props.campaign.created_at)
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
})
</script>

<template>
  <div class="flex flex-col gap-4 pb-4 border-b border-[var(--border-default)]">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl font-bold text-[var(--text-primary)] truncate">
          {{ campaign.topic }}
        </h1>
        <p class="mt-1 text-sm text-[var(--text-secondary)]">
          Criada em {{ formattedDate }}
        </p>
      </div>

      <!-- Status badge -->
      <span
        class="px-3 py-1 text-sm font-medium text-white rounded-full whitespace-nowrap"
        :class="[statusConfig.color, statusConfig.animate ? 'animate-pulse' : '']"
      >
        {{ statusConfig.label }}
      </span>
    </div>

    <!-- Actions dropdown -->
    <div class="flex gap-2">
      <button
        v-if="campaign.status === 'draft'"
        type="button"
        class="text-sm text-[var(--action-primary)] hover:underline"
        @click="emit('regenerate')"
      >
        Regenerar
      </button>

      <button
        v-if="campaign.status === 'draft' || campaign.status === 'approved'"
        type="button"
        class="text-sm text-red-500 hover:underline"
        @click="emit('delete')"
      >
        Excluir
      </button>
    </div>
  </div>
</template>
