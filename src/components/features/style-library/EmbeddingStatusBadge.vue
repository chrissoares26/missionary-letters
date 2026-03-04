<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { EmbeddingStatus } from '@/types/style-email'

interface Props {
  hasEmbedding: boolean
  createdAt: string
}

const props = defineProps<Props>()

// Show "Erro" if no embedding after 60 seconds
const status = ref<EmbeddingStatus>(props.hasEmbedding ? 'ready' : 'pending')

onMounted(() => {
  if (props.hasEmbedding) return

  const createdMs = new Date(props.createdAt).getTime()
  const ageSeconds = (Date.now() - createdMs) / 1000

  if (ageSeconds > 60) {
    status.value = 'error'
    return
  }

  // Flip to error after remaining window elapses
  const remaining = (60 - ageSeconds) * 1000
  setTimeout(() => {
    if (status.value === 'pending') status.value = 'error'
  }, remaining)
})

// Computed resolves parent Realtime updates: hasEmbedding flipping true clears pending/error
const resolvedStatus = computed<EmbeddingStatus>(() => {
  if (props.hasEmbedding) return 'ready'
  return status.value
})

const label = computed(() => ({
  ready: 'Pronto ✓',
  pending: 'Processando...',
  error: 'Erro',
}[resolvedStatus.value]))

const classes = computed(() => ({
  ready: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
}[resolvedStatus.value]))
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="classes"
  >
    {{ label }}
  </span>
</template>
