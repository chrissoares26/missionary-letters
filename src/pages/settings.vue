<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GmailConnectCard from '@/components/features/settings/GmailConnectCard.vue'
import SignatureEditor from '@/components/features/settings/SignatureEditor.vue'

const route = useRoute()
const router = useRouter()
const toast = ref<'connected' | 'error' | null>(null)
const toastMessage = ref('')

onMounted(async () => {
  const gmailState = route.query.gmail
  const message = route.query.msg

  if (gmailState === 'connected') {
    toast.value = 'connected'
    toastMessage.value = 'Gmail conectado com sucesso!'
  } else if (gmailState === 'error') {
    toast.value = 'error'
    toastMessage.value = typeof message === 'string' && message ? message : 'Erro ao conectar Gmail'
  } else {
    return
  }

  setTimeout(() => {
    toast.value = null
  }, 4500)

  await router.replace({ path: '/settings' })
})
</script>

<template>
  <div class="min-h-screen bg-[var(--bg-canvas)] pb-24">
    <Transition
      enter-active-class="transition-all duration-[280ms] ease-in-out"
      leave-active-class="transition-all duration-[280ms] ease-in-out"
      enter-from-class="opacity-0 -translate-y-2.5"
      leave-to-class="opacity-0 -translate-y-2.5"
    >
      <div
        v-if="toast"
        class="fixed left-4 right-4 top-4 z-50 rounded-xl border p-4 shadow-lg"
        :class="toast === 'connected' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'"
      >
        <p class="text-sm font-medium" :class="toast === 'connected' ? 'text-emerald-800' : 'text-red-800'">
          {{ toastMessage }}
        </p>
      </div>
    </Transition>

    <div class="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-4">
      <h1 class="text-xl font-bold text-[var(--text-primary)]">Configurações</h1>
      <p class="mt-0.5 text-sm text-[var(--text-secondary)]">Gmail e assinatura de email</p>
    </div>

    <div class="mx-auto max-w-2xl space-y-4 p-4">
      <GmailConnectCard />
      <SignatureEditor />
    </div>
  </div>
</template>

