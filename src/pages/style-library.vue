<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useStyleEmailsQuery, useStyleEmailCountQuery } from '@/queries/style-library'
import StyleEmailList from '@/components/features/style-library/StyleEmailList.vue'
import StyleEmailForm from '@/components/features/style-library/StyleEmailForm.vue'

const ONBOARDING_MIN = 10
const EMAIL_CAP = 50

const { data: emails, status: emailsStatus } = useStyleEmailsQuery()
const { data: count } = useStyleEmailCountQuery()

const isLoading = computed(() => emailsStatus.value === 'pending')
const emailCount = computed(() => count.value ?? 0)
const atCap = computed(() => emailCount.value >= EMAIL_CAP)
const isOnboarding = computed(() => emailCount.value < ONBOARDING_MIN)
const progressPercent = computed(() =>
  Math.min(100, (emailCount.value / ONBOARDING_MIN) * 100),
)
const remaining = computed(() => Math.max(0, ONBOARDING_MIN - emailCount.value))

// Show "ready" banner once when onboarding completes, auto-dismiss after 4s
const showReadyBanner = ref(false)
watch(isOnboarding, (nowOnboarding, wasOnboarding) => {
  if (wasOnboarding && !nowOnboarding) {
    showReadyBanner.value = true
    setTimeout(() => {
      showReadyBanner.value = false
    }, 4000)
  }
})
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-6">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-ink-900">Biblioteca de Estilo</h1>
      <p class="mt-1 text-sm text-[var(--text-secondary)]">
        Adicione emails históricos para o perfil de estilo de escrita.
      </p>
    </div>

    <!-- Onboarding progress bar -->
    <div v-if="isOnboarding" class="mb-6 rounded-lg bg-linen-100 p-4">
      <div class="mb-2 flex items-center justify-between text-sm">
        <span class="font-medium text-ink-900">{{ emailCount }} / {{ ONBOARDING_MIN }} emails</span>
        <span class="text-[var(--text-secondary)]">
          Adicione mais {{ remaining }} para desbloquear campanhas
        </span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-stone-300">
        <div
          class="h-full rounded-full bg-forest-700 transition-all duration-300"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </div>

    <!-- Ready banner — fades after 4s -->
    <div
      v-if="showReadyBanner"
      class="mb-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800"
    >
      ✓ Pronto para gerar campanhas
    </div>

    <!-- Email count when past onboarding -->
    <div v-if="!isOnboarding && !atCap" class="mb-4 text-sm text-[var(--text-secondary)]">
      {{ emailCount }} emails adicionados
    </div>

    <!-- Email list -->
    <div class="mb-8">
      <div v-if="isLoading" class="py-8 text-center text-sm text-[var(--text-secondary)]">
        Carregando...
      </div>
      <StyleEmailList v-else :emails="emails ?? []" />
    </div>

    <!-- Divider -->
    <div class="mb-6 border-t border-stone-300" />

    <!-- Add form -->
    <StyleEmailForm :at-cap="atCap" />
  </div>
</template>
