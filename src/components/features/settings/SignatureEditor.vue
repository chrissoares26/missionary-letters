<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSignatureQuery, useUpdateSignature } from '@/queries/gmail'

const signatureQuery = useSignatureQuery()
const updateSignatureMutation = useUpdateSignature()

const draft = ref('')
const saveFeedback = ref(false)

watch(
  () => signatureQuery.data.value,
  (value) => {
    if (value !== undefined) {
      draft.value = value ?? ''
    }
  },
  { immediate: true },
)

const isLoading = computed(() => signatureQuery.status.value === 'pending')

async function handleSave() {
  try {
    await updateSignatureMutation.mutateAsync(draft.value)
    saveFeedback.value = true
    setTimeout(() => {
      saveFeedback.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to save signature:', error)
    alert('Erro ao salvar assinatura')
  }
}
</script>

<template>
  <section class="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-sm">
    <header class="mb-4 space-y-1">
      <h2 class="text-base font-semibold text-[var(--text-primary)]">Assinatura de Email</h2>
      <p class="text-sm text-[var(--text-secondary)]">Adicionada automaticamente ao final de cada envio.</p>
    </header>

    <div v-if="isLoading" class="text-sm text-[var(--text-secondary)]">Carregando assinatura...</div>

    <div v-else class="space-y-3">
      <textarea
        v-model="draft"
        rows="5"
        placeholder="Com amor e orações,&#10;Irmã Silva"
        class="w-full resize-y rounded-lg border border-[var(--border-default)] bg-[var(--bg-canvas)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)]"
      />

      <div class="flex items-center justify-end gap-3">
        <span v-if="saveFeedback" class="text-sm font-medium text-emerald-600">Salvo</span>
        <button
          type="button"
          class="rounded-lg bg-[var(--action-primary)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="updateSignatureMutation.isLoading.value"
          @click="handleSave"
        >
          {{ updateSignatureMutation.isLoading.value ? 'Salvando...' : 'Salvar Assinatura' }}
        </button>
      </div>
    </div>
  </section>
</template>
