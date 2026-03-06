<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useStyleEmailsQuery, useStyleEmailCountQuery } from '@/queries/style-library'
import StyleEmailList from '@/components/features/style-library/StyleEmailList.vue'
import StyleEmailForm from '@/components/features/style-library/StyleEmailForm.vue'
import StyleProfileCard from '@/components/features/style-library/StyleProfileCard.vue'

const ONBOARDING_MIN = 10
const EMAIL_CAP = 50

const { data: emails, status: emailsStatus } = useStyleEmailsQuery()
const { data: count } = useStyleEmailCountQuery()

const isLoading = computed(() => emailsStatus.value === 'pending')
const emailCount = computed(() => count.value ?? 0)
const atCap = computed(() => emailCount.value >= EMAIL_CAP)
const isOnboarding = computed(() => emailCount.value < ONBOARDING_MIN)
const progressPercent = computed(() => Math.min(100, (emailCount.value / ONBOARDING_MIN) * 100))
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

// Modal state
const isFormOpen = ref(false)

function openAddForm() {
  if (atCap.value) return
  isFormOpen.value = true
}

function closeForm() {
  isFormOpen.value = false
}

function handleFormSuccess() {
  closeForm()
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 pb-6 pt-8">
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

    <!-- Style Profile Card -->
    <div class="mb-6">
      <StyleProfileCard :email-count="emailCount" />
    </div>

    <!-- Add Email Button -->
    <div class="mb-6">
      <button
        v-if="atCap"
        disabled
        class="w-full rounded-lg bg-stone-300 px-4 py-3 text-sm font-medium text-stone-500 cursor-not-allowed"
      >
        Limite de 50 emails atingido
      </button>
      <button
        v-else
        type="button"
        @click="openAddForm"
        class="w-full rounded-lg bg-forest-700 px-4 py-3 text-sm font-medium text-white hover:bg-forest-800 transition-colors"
      >
        + Adicionar Email
      </button>
    </div>

    <!-- Email list -->
    <div class="mb-8">
      <div v-if="isLoading" class="py-8 text-center text-sm text-[var(--text-secondary)]">
        Carregando...
      </div>
      <StyleEmailList v-else :emails="emails ?? []" />
    </div>

    <!-- Form modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isFormOpen"
          class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          @click.self="closeForm"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" />

          <!-- Modal content -->
          <Transition
            enter-active-class="transition-transform duration-200"
            leave-active-class="transition-transform duration-200"
            enter-from-class="translate-y-full sm:translate-y-0 sm:scale-95"
            leave-to-class="translate-y-full sm:translate-y-0 sm:scale-95"
          >
            <div
              v-if="isFormOpen"
              class="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-md max-h-[90vh] overflow-y-auto"
              style="padding-bottom: env(safe-area-inset-bottom, 0px)"
            >
              <!-- Modal header -->
              <div
                class="sticky top-0 bg-white border-b border-stone-300 px-6 py-4 rounded-t-3xl sm:rounded-t-2xl"
              >
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-bold text-ink-900 font-serif">Adicionar Email</h2>
                  <button
                    type="button"
                    @click="closeForm"
                    class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-linen-100 text-forest-700 transition-colors"
                    aria-label="Fechar"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Modal body -->
              <div class="p-6">
                <StyleEmailForm @success="handleFormSuccess" />
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
