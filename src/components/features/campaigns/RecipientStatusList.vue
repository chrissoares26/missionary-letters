<script setup lang="ts">
import { computed } from 'vue'
import type { CampaignRecipientWithMissionary } from '@/api/gmail'

interface Props {
  recipients: CampaignRecipientWithMissionary[]
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
})

const stats = computed(() => ({
  sent: props.recipients.filter((recipient) => recipient.status === 'sent').length,
  failed: props.recipients.filter((recipient) => recipient.status === 'failed').length,
  queued: props.recipients.filter((recipient) => recipient.status === 'queued').length,
}))

function formatTime(sentAt: string | null) {
  if (!sentAt) return ''

  return new Date(sentAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--bg-muted)] px-4 py-3">
      <h3 class="text-sm font-semibold text-[var(--text-primary)]">Destinatários</h3>

      <div v-if="recipients.length" class="flex items-center gap-3 text-xs">
        <span class="font-medium text-emerald-600">{{ stats.sent }} enviados</span>
        <span v-if="stats.failed" class="font-medium text-red-600">{{ stats.failed }} falhou</span>
        <span v-if="stats.queued" class="text-[var(--text-secondary)]">{{ stats.queued }} na fila</span>
      </div>
    </header>

    <div v-if="isLoading && !recipients.length" class="divide-y divide-[var(--border-default)]">
      <div v-for="index in 3" :key="index" class="flex items-center gap-3 px-4 py-3">
        <div class="h-8 w-8 animate-pulse rounded-full bg-[var(--bg-muted)]" />
        <div class="flex-1 space-y-1.5">
          <div class="h-3 w-40 animate-pulse rounded bg-[var(--bg-muted)]" />
          <div class="h-2.5 w-56 animate-pulse rounded bg-[var(--bg-muted)]" />
        </div>
      </div>
    </div>

    <div v-else-if="!recipients.length" class="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
      Nenhum destinatário ainda.
    </div>

    <div v-else class="divide-y divide-[var(--border-default)]">
      <article v-for="recipient in recipients" :key="recipient.id" class="flex items-start gap-3 px-4 py-3">
        <div
          class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
          :class="{
            'bg-emerald-100 text-emerald-600': recipient.status === 'sent',
            'bg-red-100 text-red-600': recipient.status === 'failed',
            'bg-[var(--bg-muted)] text-[var(--text-secondary)]': recipient.status === 'queued',
          }"
        >
          <span v-if="recipient.status === 'sent'">✓</span>
          <span v-else-if="recipient.status === 'failed'">✕</span>
          <span v-else class="animate-spin text-xs">⏳</span>
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-[var(--text-primary)]">
            {{ recipient.missionaries?.title }} {{ recipient.missionaries?.first_name }} {{ recipient.missionaries?.last_name }}
          </p>
          <p class="truncate text-xs text-[var(--text-secondary)]">{{ recipient.to_email }}</p>
          <p v-if="recipient.status === 'failed' && recipient.error" class="mt-0.5 truncate text-xs text-red-600">
            {{ recipient.error }}
          </p>
        </div>

        <span v-if="recipient.sent_at" class="shrink-0 text-xs text-[var(--text-secondary)]">
          {{ formatTime(recipient.sent_at) }}
        </span>
      </article>
    </div>
  </section>
</template>
