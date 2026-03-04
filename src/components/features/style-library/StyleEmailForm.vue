<script setup lang="ts">
import { ref } from 'vue'
import { useCreateStyleEmail } from '@/queries/style-library'
import type { StyleEmailFormData } from '@/types/style-email'

interface Props {
  atCap: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ success: [] }>()

const formData = ref<StyleEmailFormData>({
  subject: '',
  body: '',
  source_label: null,
})

const errors = ref<Record<string, string>>({})
const { mutateAsync: createEmail, isLoading: isSubmitting } = useCreateStyleEmail()

function validate(): boolean {
  errors.value = {}
  if (!formData.value.subject.trim()) {
    errors.value.subject = 'Assunto é obrigatório'
  } else if (formData.value.subject.length > 200) {
    errors.value.subject = 'Assunto deve ter no máximo 200 caracteres'
  }
  if (!formData.value.body.trim()) {
    errors.value.body = 'Corpo do email é obrigatório'
  } else if (formData.value.body.trim().length < 50) {
    errors.value.body = 'Corpo do email deve ter pelo menos 50 caracteres'
  }
  if (formData.value.source_label && formData.value.source_label.length > 100) {
    errors.value.source_label = 'Etiqueta deve ter no máximo 100 caracteres'
  }
  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  try {
    await createEmail(formData.value)
    formData.value = { subject: '', body: '', source_label: null }
    errors.value = {}
    emit('success')
  } catch {
    errors.value.form = 'Erro ao salvar email. Tente novamente.'
  }
}
</script>

<template>
  <div v-if="atCap" class="rounded-lg bg-linen-100 p-4 text-sm text-forest-700">
    Limite de 50 emails atingido. Isso é suficiente para um ótimo perfil de estilo.
  </div>

  <form v-else class="space-y-4" @submit.prevent="handleSubmit">
    <h2 class="text-lg font-semibold text-ink-900">Adicionar Email</h2>

    <div v-if="errors.form" class="rounded-md bg-red-50 p-3 text-sm text-red-700">
      {{ errors.form }}
    </div>

    <!-- Subject -->
    <div>
      <label for="style-email-subject" class="block text-sm font-medium text-ink-900">
        Assunto <span class="text-red-500">*</span>
      </label>
      <input
        id="style-email-subject"
        v-model="formData.subject"
        type="text"
        maxlength="200"
        placeholder="Assunto do email original"
        class="mt-1 w-full h-11 px-3 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
        :class="{ 'border-red-400': errors.subject }"
      />
      <p v-if="errors.subject" class="mt-1 text-xs text-red-600">{{ errors.subject }}</p>
    </div>

    <!-- Source label -->
    <div>
      <label for="style-email-label" class="block text-sm font-medium text-ink-900">
        Etiqueta <span class="text-xs text-(--text-secondary)">(opcional)</span>
      </label>
      <input
        id="style-email-label"
        v-model="formData.source_label"
        type="text"
        maxlength="100"
        placeholder="Ex: Email jan 2023, Elder Silva"
        class="mt-1 w-full h-11 px-3 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
        :class="{ 'border-red-400': errors.source_label }"
      />
      <p v-if="errors.source_label" class="mt-1 text-xs text-red-600">{{ errors.source_label }}</p>
    </div>

    <!-- Body -->
    <div>
      <label for="style-email-body" class="block text-sm font-medium text-ink-900">
        Corpo do email <span class="text-red-500">*</span>
      </label>
      <textarea
        id="style-email-body"
        v-model="formData.body"
        rows="8"
        placeholder="Cole o conteúdo do email aqui..."
        class="mt-1 w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        :class="{ 'border-red-400': errors.body }"
      />
      <p v-if="errors.body" class="mt-1 text-xs text-red-600">{{ errors.body }}</p>
    </div>

    <button
      type="submit"
      :disabled="isSubmitting"
      class="w-full h-12 rounded-lg bg-sunrise-500 text-white font-semibold hover:bg-sunrise-600 transition-colors disabled:opacity-50"
    >
      {{ isSubmitting ? 'Salvando...' : 'Adicionar Email' }}
    </button>
  </form>
</template>
