<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { CampaignContent } from '@/types/database'
import { useUpdateCampaignContent } from '@/queries/campaigns'
import { useToast } from '@/composables/useToast'
import ImageUploader from './ImageUploader.vue'

interface Props {
  campaignId: string
  content: CampaignContent
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'copy': [text: string, type: string]
}>()

const updateMutation = useUpdateCampaignContent()
const { error: showToastError } = useToast()
const saving = ref(false)
const lastSaved = ref<Date | null>(null)

// Local state for editing
const emailSubject = ref(props.content.email_subject)
const emailBody = ref(props.content.email_body)
const whatsappText = ref(props.content.whatsapp_text)
const facebookText = ref(props.content.facebook_text)
const images = ref<string[]>(props.content.images || [])

// Watch for external content changes (e.g., regeneration)
watch(() => props.content, (newContent) => {
  emailSubject.value = newContent.email_subject
  emailBody.value = newContent.email_body
  whatsappText.value = newContent.whatsapp_text
  facebookText.value = newContent.facebook_text
  images.value = newContent.images || []
}, { deep: true })

// Auto-save with debounce
const saveContent = useDebounceFn(async () => {
  try {
    saving.value = true
    await updateMutation.mutateAsync({
      campaignId: props.campaignId,
      updates: {
        email_subject: emailSubject.value,
        email_body: emailBody.value,
        whatsapp_text: whatsappText.value,
        facebook_text: facebookText.value,
        images: images.value,
      },
    })
    lastSaved.value = new Date()
  } catch (error) {
    console.error('Auto-save failed:', error)
    showToastError('Erro ao salvar. Tentando novamente...')
    // Retry after 2s
    setTimeout(saveContent, 2000)
  } finally {
    saving.value = false
  }
}, 500)

// Watch for changes and trigger auto-save
watch([emailSubject, emailBody, whatsappText, facebookText, images], () => {
  saveContent()
})

const saveIndicator = computed(() => {
  if (saving.value) return 'Salvando...'
  if (lastSaved.value) {
    const seconds = Math.floor((Date.now() - lastSaved.value.getTime()) / 1000)
    if (seconds < 5) return 'Salvo ✓'
    return `Salvo há ${seconds}s`
  }
  return ''
})

function copyToClipboard(text: string, type: string) {
  navigator.clipboard.writeText(text)
  emit('copy', text, type)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Save indicator -->
    <div v-if="saveIndicator" class="text-sm text-[var(--text-secondary)] text-right">
      {{ saveIndicator }}
    </div>

    <!-- Images section -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">Imagens</h2>
      <ImageUploader v-model="images" :campaign-id="campaignId" />
    </section>

    <!-- Email section -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">Email</h2>

      <div>
        <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Assunto
        </label>
        <input
          v-model="emailSubject"
          type="text"
          class="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Corpo do Email
        </label>
        <textarea
          v-model="emailBody"
          rows="12"
          class="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent resize-y"
        />
        <p class="mt-1 text-xs text-[var(--text-secondary)]">
          {{ emailBody.length }} caracteres
        </p>
      </div>
    </section>

    <!-- WhatsApp section -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-[var(--text-primary)]">WhatsApp</h2>
        <button
          type="button"
          class="text-sm text-[var(--action-primary)] hover:underline"
          @click="copyToClipboard(whatsappText, 'WhatsApp')"
        >
          Copiar
        </button>
      </div>

      <textarea
        v-model="whatsappText"
        rows="6"
        class="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent resize-y"
      />
      <p class="text-xs text-[var(--text-secondary)]">
        {{ whatsappText.length }} caracteres
        <span v-if="whatsappText.length > 1600" class="text-amber-500">
          (recomendado: ~1600)
        </span>
      </p>
    </section>

    <!-- Facebook section -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-[var(--text-primary)]">Facebook</h2>
        <button
          type="button"
          class="text-sm text-[var(--action-primary)] hover:underline"
          @click="copyToClipboard(facebookText, 'Facebook')"
        >
          Copiar
        </button>
      </div>

      <textarea
        v-model="facebookText"
        rows="6"
        class="w-full px-4 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--action-primary)] focus:border-transparent resize-y"
      />
      <p class="text-xs text-[var(--text-secondary)]">
        {{ facebookText.length }} caracteres
      </p>
    </section>
  </div>
</template>
