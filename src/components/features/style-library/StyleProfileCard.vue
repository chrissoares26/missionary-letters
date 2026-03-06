<script setup lang="ts">
import { computed } from 'vue'
import { useStyleProfileQuery, useGenerateStyleProfile } from '@/queries/style-library'
import { useToast } from '@/composables/useToast'

interface Props {
  emailCount: number
}

const props = defineProps<Props>()

const { data: profile, isLoading, refetch } = useStyleProfileQuery()
const { mutateAsync: generateProfile, isLoading: isGenerating } = useGenerateStyleProfile()
const { error: showToastError } = useToast()

const hasProfile = computed(() => profile.value !== null)
const canGenerate = computed(() => props.emailCount >= 3)
const lastGenerated = computed(() => {
  if (!profile.value?.profile_json?.metadata?.generated_at) return null
  const date = new Date(profile.value.profile_json.metadata.generated_at)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

async function handleGenerate() {
  try {
    await generateProfile()
    refetch()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    showToastError(`Erro ao gerar perfil: ${message}`)
  }
}
</script>

<template>
  <div class="rounded-lg border border-stone-200 bg-white p-4">
    <div class="mb-3 flex items-start justify-between">
      <div>
        <h3 class="text-base font-semibold text-stone-900">Perfil de Estilo</h3>
        <p class="mt-0.5 text-xs text-stone-500">
          Análise agregada do seu estilo de escrita
        </p>
      </div>

      <button
        v-if="!isGenerating"
        :disabled="!canGenerate"
        class="rounded-lg bg-forest-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed"
        :title="!canGenerate ? 'Adicione pelo menos 3 emails para gerar o perfil' : 'Gerar perfil de estilo'"
        @click="handleGenerate"
      >
        {{ hasProfile ? 'Regenerar' : 'Gerar Perfil' }}
      </button>

      <div v-else class="text-sm text-forest-700">
        Gerando...
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="py-4 text-center text-sm text-stone-500">
      Carregando...
    </div>

    <!-- No profile yet -->
    <div v-else-if="!hasProfile" class="rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
      <p class="mb-2">Nenhum perfil gerado ainda.</p>
      <p v-if="!canGenerate" class="text-xs text-stone-500">
        Adicione pelo menos 3 emails históricos para gerar seu perfil de estilo.
      </p>
      <p v-else class="text-xs text-stone-500">
        Clique em "Gerar Perfil" para analisar seus emails e extrair seu estilo de escrita.
      </p>
    </div>

    <!-- Profile exists -->
    <div v-else-if="hasProfile && profile" class="space-y-3">
      <!-- Summary -->
      <div v-if="profile.profile_json" class="rounded-lg bg-linen-50 p-3">
        <p class="text-sm leading-relaxed text-stone-700">
          {{ profile.profile_json.summary || 'Perfil gerado com sucesso.' }}
        </p>
      </div>

      <!-- Metadata -->
      <div v-if="profile.profile_json?.metadata" class="flex items-center gap-4 text-xs text-stone-500">
        <span v-if="lastGenerated">Gerado em {{ lastGenerated }}</span>
        <span v-if="profile.profile_json.metadata.analyzed_count">
          {{ profile.profile_json.metadata.analyzed_count }} emails analisados
        </span>
      </div>

      <!-- Tone -->
      <div v-if="profile.profile_json?.tone?.primary">
        <h4 class="mb-1 text-xs font-medium text-stone-700">Tom Principal</h4>
        <p class="text-sm text-stone-600">{{ profile.profile_json.tone.primary }}</p>
      </div>

      <!-- Common phrases -->
      <div v-if="profile.profile_json?.common_phrases?.length">
        <h4 class="mb-1 text-xs font-medium text-stone-700">Expressões Comuns</h4>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="(phrase, idx) in profile.profile_json.common_phrases.slice(0, 5)"
            :key="idx"
            class="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
          >
            "{{ phrase }}"
          </span>
        </div>
      </div>

      <!-- Unique voice -->
      <div v-if="profile.profile_json?.unique_voice">
        <h4 class="mb-1 text-xs font-medium text-stone-700">Voz Única</h4>
        <p class="text-sm leading-relaxed text-stone-600">
          {{ profile.profile_json.unique_voice }}
        </p>
      </div>
    </div>
  </div>
</template>
