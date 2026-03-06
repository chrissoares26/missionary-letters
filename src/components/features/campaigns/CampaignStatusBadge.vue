<script setup lang="ts">
import { computed } from 'vue'
import type { CampaignStatus } from '@/types/campaign'

interface Props {
  status: CampaignStatus
}

const props = defineProps<Props>()

const config = computed(() => {
  switch (props.status) {
    case 'draft':
      return { label: 'Rascunho', color: 'bg-amber-100 text-amber-800' }
    case 'approved':
      return { label: 'Aprovada', color: 'bg-blue-100 text-blue-800' }
    case 'sending':
      return { label: 'Enviando...', color: 'bg-blue-100 text-blue-800 animate-pulse' }
    case 'sent':
      return { label: 'Enviada ✓', color: 'bg-green-100 text-green-800' }
    case 'failed':
      return { label: 'Falhou', color: 'bg-red-100 text-red-800' }
    default:
      return { label: props.status, color: 'bg-gray-100 text-gray-800' }
  }
})
</script>

<template>
  <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="config.color">
    {{ config.label }}
  </span>
</template>
