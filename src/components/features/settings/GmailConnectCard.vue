<script setup lang="ts">
import { computed } from 'vue'
import { useDisconnectGoogleAccount, useGoogleAccountQuery, useInitiateGoogleOAuth } from '@/queries/gmail'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { data: account, status: accountStatus } = useGoogleAccountQuery()
const connectMutation = useInitiateGoogleOAuth()
const disconnectMutation = useDisconnectGoogleAccount()
const { error: showToastError } = useToast()
const { confirm } = useConfirm()

const isConnected = computed(() => !!account.value)
const isAccountLoading = computed(() => accountStatus.value === 'pending')

function handleConnect() {
  void connectMutation.mutateAsync()
}

async function handleDisconnect() {
  const confirmed = await confirm({
    title: 'Desconectar Gmail?',
    message: 'Você não poderá enviar campanhas até reconectar.',
    confirmLabel: 'Desconectar',
  })
  if (!confirmed) return

  try {
    await disconnectMutation.mutateAsync()
  } catch (error) {
    console.error('Failed to disconnect Gmail:', error)
    showToastError('Erro ao desconectar Gmail')
  }
}
</script>

<template>
  <section class="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-sm">
    <header class="mb-4 space-y-1">
      <h2 class="text-base font-semibold text-[var(--text-primary)]">Gmail</h2>
      <p class="text-sm text-[var(--text-secondary)]">Conecte sua conta para enviar campanhas diretamente.</p>
    </header>

    <div v-if="isAccountLoading" class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      <span class="h-2 w-2 animate-pulse rounded-full bg-[var(--action-primary)]" />
      Carregando conexão...
    </div>

    <div v-else-if="isConnected" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-emerald-700">Conectado</p>
        <p class="truncate text-xs text-emerald-800/80">{{ account?.google_email }}</p>
      </div>

      <button
        type="button"
        class="rounded-lg border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="disconnectMutation.isLoading.value"
        @click="handleDisconnect"
      >
        {{ disconnectMutation.isLoading.value ? 'Desconectando...' : 'Desconectar' }}
      </button>
    </div>

    <button
      v-else
      type="button"
      class="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="connectMutation.isLoading.value"
      @click="handleConnect"
    >
      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
      </svg>
      {{ connectMutation.isLoading.value ? 'Redirecionando...' : 'Conectar Gmail' }}
    </button>
  </section>
</template>
