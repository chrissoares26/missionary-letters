<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCreateCampaign, useTriggerDraftGeneration } from '@/queries/campaigns'
import { useStyleEmailCountQuery } from '@/queries/style-library'
import { useToast } from '@/composables/useToast'
import type { CampaignFormData } from '@/types/campaign'

const router = useRouter()
const createMutation = useCreateCampaign()
const triggerGeneration = useTriggerDraftGeneration()
const { data: emailCount } = useStyleEmailCountQuery()
const { error: showToastError } = useToast()

const formData = ref<CampaignFormData>({
  topic: '',
  notes: '',
  resources: '',
})

const errors = ref<Record<string, string>>({})

const canSubmit = computed(() => {
  return formData.value.topic.length >= 3 && formData.value.notes.length >= 20
})

const isCreating = computed(() => createMutation.isLoading.value)

const needsMoreEmails = computed(() => {
  return (emailCount.value ?? 0) < 3
})

function validateForm(): boolean {
  errors.value = {}

  if (formData.value.topic.length < 3) {
    errors.value.topic = 'Tema deve ter pelo menos 3 caracteres'
  }

  if (formData.value.notes.length < 20) {
    errors.value.notes = 'Notas devem ter pelo menos 20 caracteres'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validateForm() || !canSubmit.value) return

  try {
    const campaign = await createMutation.mutateAsync(formData.value)

    // Trigger draft generation (fire-and-forget)
    triggerGeneration.mutate(campaign.id)

    // Navigate to campaign editor
    router.push(`/campaigns/${campaign.id}`)
  } catch (error) {
    console.error('Failed to create campaign:', error)
    showToastError('Erro ao criar campanha. Tente novamente.')
  }
}
</script>

<template>
  <div class="min-h-screen bg-[var(--bg-canvas)] pb-24">
    <div class="max-w-2xl mx-auto p-6">
      <h1 class="text-2xl font-bold text-[var(--text-primary)] mb-2">
        Nova Campanha
      </h1>
      <p class="text-[var(--text-secondary)] mb-6">
        Defina o tema da semana e adicione suas ideias para gerar o rascunho da campanha.
      </p>

      <!-- Warning if insufficient style library -->
      <div
        v-if="needsMoreEmails"
        class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg"
      >
        <p class="text-sm text-amber-800 mb-2">
          ⚠️ Você precisa adicionar pelo menos 3 emails no estilo antes de criar campanhas.
        </p>
        <router-link
          to="/style-library"
          class="text-sm text-amber-900 font-medium hover:underline"
        >
          Ir para Biblioteca de Estilo →
        </router-link>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Topic -->
        <div>
          <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Tema da Semana *
          </label>
          <input
            v-model="formData.topic"
            type="text"
            placeholder="Ex: Fé em tempos difíceis"
            class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent"
            :class="errors.topic ? 'border-red-500' : 'border-[var(--border-default)]'"
          />
          <p v-if="errors.topic" class="mt-1 text-sm text-red-500">
            {{ errors.topic }}
          </p>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Suas Ideias *
          </label>
          <textarea
            v-model="formData.notes"
            rows="6"
            placeholder="Suas ideias, contexto, mensagem principal que você quer transmitir..."
            class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent resize-y"
            :class="errors.notes ? 'border-red-500' : 'border-[var(--border-default)]'"
          />
          <div class="flex justify-between mt-1">
            <p v-if="errors.notes" class="text-sm text-red-500">
              {{ errors.notes }}
            </p>
            <p class="text-xs text-[var(--text-secondary)] ml-auto">
              {{ formData.notes.length }} caracteres (mín. 20)
            </p>
          </div>
        </div>

        <!-- Resources -->
        <div>
          <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Recursos (opcional)
          </label>
          <textarea
            v-model="formData.resources"
            rows="4"
            placeholder="Cole links de discursos, escrituras, citações..."
            class="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent resize-y"
          />
          <p class="mt-1 text-xs text-[var(--text-secondary)]">
            Ex: https://www.churchofjesuschrist.org/study/general-conference/...
          </p>
        </div>

        <!-- Submit button -->
        <button
          type="submit"
          class="w-full px-6 py-3 bg-[var(--action-primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canSubmit || needsMoreEmails || isCreating"
        >
          {{ isCreating ? 'Criando...' : 'Criar Campanha' }}
        </button>
      </form>
    </div>
  </div>
</template>
