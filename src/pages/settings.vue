<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GmailConnectCard from '@/components/features/settings/GmailConnectCard.vue'
import SignatureEditor from '@/components/features/settings/SignatureEditor.vue'
import { useToast } from '@/composables/useToast'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { success: showToastSuccess, error: showToastError } = useToast()
const { signOut } = useAuth()

async function handleSignOut() {
  await signOut()
  router.push('/login')
}

onMounted(async () => {
  const gmailState = route.query.gmail
  const message = route.query.msg

  if (gmailState === 'connected') {
    showToastSuccess('Gmail conectado com sucesso!')
  } else if (gmailState === 'error') {
    showToastError(typeof message === 'string' && message ? message : 'Erro ao conectar Gmail')
  } else {
    return
  }

  await router.replace({ path: '/settings' })
})
</script>

<template>
  <div class="min-h-screen bg-[var(--bg-canvas)] pb-24">
    <div class="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 pb-4 pt-8">
      <h1 class="text-xl font-bold text-[var(--text-primary)]">Configurações</h1>
      <p class="mt-0.5 text-sm text-[var(--text-secondary)]">Gmail e assinatura de email</p>
    </div>

    <div class="mx-auto max-w-2xl space-y-4 p-4">
      <GmailConnectCard />
      <SignatureEditor />

      <button
        type="button"
        class="w-full rounded-lg border border-danger-600 py-3 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white"
        @click="handleSignOut"
      >
        Sair da conta
      </button>
    </div>
  </div>
</template>
