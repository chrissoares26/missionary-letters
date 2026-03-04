<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { useDeleteStyleEmail } from '@/queries/style-library'
import EmbeddingStatusBadge from './EmbeddingStatusBadge.vue'
import type { StyleEmail } from '@/types/database'

interface Props {
  emails: StyleEmail[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ deleted: [id: string] }>()

const { mutateAsync: deleteEmail } = useDeleteStyleEmail()
const deletingId = ref<string | null>(null)

// Local embedding state — seeded from props, updated via Realtime
const localEmbeddings = ref<Record<string, boolean>>({})

onMounted(() => {
  props.emails.forEach((e) => {
    localEmbeddings.value[e.id] = e.embedding !== null
  })
})

// Realtime: flip badge to "Pronto" as soon as embedding is persisted
const channel = supabase
  .channel('style_emails_embedding')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'style_emails' },
    (payload) => {
      const updated = payload.new as StyleEmail
      if (updated.embedding !== null) {
        localEmbeddings.value[updated.id] = true
      }
    },
  )
  .subscribe()

onUnmounted(() => {
  supabase.removeChannel(channel)
})

async function confirmDelete(id: string) {
  if (!confirm('Remover este email da biblioteca?')) return
  deletingId.value = id
  try {
    await deleteEmail(id)
    emit('deleted', id)
  } catch {
    alert('Erro ao remover email.')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div v-if="emails.length === 0" class="py-8 text-center text-sm text-(--text-secondary)">
    Nenhum email adicionado ainda. Use o formulário abaixo para começar.
  </div>

  <ul v-else class="divide-y divide-stone-300">
    <li
      v-for="email in emails"
      :key="email.id"
      class="flex items-start justify-between gap-3 py-3"
    >
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-ink-900">{{ email.subject }}</p>
        <p v-if="email.source_label" class="mt-0.5 text-xs text-(--text-secondary)">
          {{ email.source_label }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <EmbeddingStatusBadge
          :has-embedding="localEmbeddings[email.id] ?? email.embedding !== null"
          :created-at="email.created_at"
        />
        <button
          :disabled="deletingId === email.id"
          class="rounded p-1 text-(--text-secondary) hover:text-red-600 transition-colors disabled:opacity-50"
          aria-label="Remover"
          @click="confirmDelete(email.id)"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </li>
  </ul>
</template>
