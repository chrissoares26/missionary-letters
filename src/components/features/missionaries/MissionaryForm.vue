<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCreateMissionary, useUpdateMissionary } from '@/queries/missionaries'
import type { Missionary } from '@/types/database'
import type { MissionaryFormData } from '@/types/missionary'

interface Props {
  missionary?: Missionary
  onSuccess?: () => void
  onCancel?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  missionary: undefined,
  onSuccess: undefined,
  onCancel: undefined,
})

const isEditMode = computed(() => !!props.missionary)

// Form state
const formData = ref<MissionaryFormData>({
  title: props.missionary?.title || 'Elder',
  first_name: props.missionary?.first_name || '',
  last_name: props.missionary?.last_name || '',
  email: props.missionary?.email || '',
  mission_name: props.missionary?.mission_name || '',
  mission_end_date: props.missionary?.mission_end_date || null,
  active: props.missionary?.active ?? true,
  inactive_reason: props.missionary?.inactive_reason || null,
  notes: props.missionary?.notes || null,
})

// Reset form when missionary prop changes
watch(() => props.missionary, (newMissionary) => {
  if (newMissionary) {
    formData.value = {
      title: newMissionary.title,
      first_name: newMissionary.first_name,
      last_name: newMissionary.last_name,
      email: newMissionary.email,
      mission_name: newMissionary.mission_name,
      mission_end_date: newMissionary.mission_end_date,
      active: newMissionary.active,
      inactive_reason: newMissionary.inactive_reason,
      notes: newMissionary.notes,
    }
  }
})

// Form validation errors
const errors = ref<Record<string, string>>({})

// Mutations
const { mutate: createMissionary, status: createStatus } = useCreateMissionary()
const { mutate: updateMissionary, status: updateStatus } = useUpdateMissionary()

const isSubmitting = computed(() => {
  return createStatus.value === 'loading' || updateStatus.value === 'loading'
})

// Validation
function validateForm(): boolean {
  errors.value = {}

  if (!formData.value.first_name.trim()) {
    errors.value.first_name = 'Nome é obrigatório'
  }

  if (!formData.value.last_name.trim()) {
    errors.value.last_name = 'Sobrenome é obrigatório'
  }

  if (!formData.value.email.trim()) {
    errors.value.email = 'Email é obrigatório'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = 'Email inválido'
  }

  if (!formData.value.mission_name.trim()) {
    errors.value.mission_name = 'Nome da missão é obrigatório'
  }

  if (!formData.value.active && !formData.value.inactive_reason?.trim()) {
    errors.value.inactive_reason = 'Motivo de inativação é obrigatório quando inativo'
  }

  return Object.keys(errors.value).length === 0
}

// Submit handlers
function handleSubmit() {
  if (!validateForm()) {
    return
  }

  if (isEditMode.value && props.missionary) {
    updateMissionary(
      { id: props.missionary.id, data: formData.value },
      {
        onSuccess: () => {
          props.onSuccess?.()
        },
      }
    )
  } else {
    createMissionary(formData.value, {
      onSuccess: () => {
        props.onSuccess?.()
      },
    })
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Title -->
    <div>
      <label class="block text-sm font-semibold text-forest-700 mb-2">
        Título <span class="text-danger-600">*</span>
      </label>
      <div class="flex gap-2">
        <button
          type="button"
          @click="formData.title = 'Elder'"
          :class="[
            'flex-1 h-11 rounded-lg font-medium transition-colors',
            formData.title === 'Elder'
              ? 'bg-sunrise-500 text-white'
              : 'bg-linen-100 text-forest-700 hover:bg-linen-100/80'
          ]"
        >
          Elder
        </button>
        <button
          type="button"
          @click="formData.title = 'Sister'"
          :class="[
            'flex-1 h-11 rounded-lg font-medium transition-colors',
            formData.title === 'Sister'
              ? 'bg-sunrise-500 text-white'
              : 'bg-linen-100 text-forest-700 hover:bg-linen-100/80'
          ]"
        >
          Sister
        </button>
      </div>
    </div>

    <!-- First Name -->
    <div>
      <label for="first_name" class="block text-sm font-semibold text-forest-700 mb-1">
        Nome <span class="text-danger-600">*</span>
      </label>
      <input
        id="first_name"
        v-model="formData.first_name"
        type="text"
        required
        :class="[
          'w-full h-11 px-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-sky-500',
          errors.first_name ? 'border-danger-600' : 'border-stone-300'
        ]"
      >
      <p v-if="errors.first_name" class="mt-1 text-xs text-danger-600">{{ errors.first_name }}</p>
    </div>

    <!-- Last Name -->
    <div>
      <label for="last_name" class="block text-sm font-semibold text-forest-700 mb-1">
        Sobrenome <span class="text-danger-600">*</span>
      </label>
      <input
        id="last_name"
        v-model="formData.last_name"
        type="text"
        required
        :class="[
          'w-full h-11 px-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-sky-500',
          errors.last_name ? 'border-danger-600' : 'border-stone-300'
        ]"
      >
      <p v-if="errors.last_name" class="mt-1 text-xs text-danger-600">{{ errors.last_name }}</p>
    </div>

    <!-- Email -->
    <div>
      <label for="email" class="block text-sm font-semibold text-forest-700 mb-1">
        Email <span class="text-danger-600">*</span>
      </label>
      <input
        id="email"
        v-model="formData.email"
        type="email"
        required
        :class="[
          'w-full h-11 px-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-sky-500',
          errors.email ? 'border-danger-600' : 'border-stone-300'
        ]"
      >
      <p v-if="errors.email" class="mt-1 text-xs text-danger-600">{{ errors.email }}</p>
    </div>

    <!-- Mission Name -->
    <div>
      <label for="mission_name" class="block text-sm font-semibold text-forest-700 mb-1">
        Nome da Missão <span class="text-danger-600">*</span>
      </label>
      <input
        id="mission_name"
        v-model="formData.mission_name"
        type="text"
        required
        placeholder="Ex: Brazil São Paulo South Mission"
        :class="[
          'w-full h-11 px-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-sky-500',
          errors.mission_name ? 'border-danger-600' : 'border-stone-300'
        ]"
      >
      <p v-if="errors.mission_name" class="mt-1 text-xs text-danger-600">{{ errors.mission_name }}</p>
    </div>

    <!-- Mission End Date -->
    <div>
      <label for="mission_end_date" class="block text-sm font-semibold text-forest-700 mb-1">
        Data de Término da Missão
      </label>
      <input
        id="mission_end_date"
        v-model="formData.mission_end_date"
        type="date"
        class="w-full h-11 px-3 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
      <p class="mt-1 text-xs text-secondary">Deixe em branco se ainda não definida</p>
    </div>

    <!-- Active Status -->
    <div>
      <label class="flex items-center gap-2">
        <input
          v-model="formData.active"
          type="checkbox"
          class="w-5 h-5 rounded border-stone-300 text-sunrise-500 focus:ring-sky-500"
        >
        <span class="text-sm font-semibold text-forest-700">Missionário ativo</span>
      </label>
    </div>

    <!-- Inactive Reason (conditional) -->
    <div v-if="!formData.active">
      <label for="inactive_reason" class="block text-sm font-semibold text-forest-700 mb-1">
        Motivo da Inativação <span class="text-danger-600">*</span>
      </label>
      <input
        id="inactive_reason"
        v-model="formData.inactive_reason"
        type="text"
        placeholder="Ex: Missão finalizada, Transferido, etc."
        :class="[
          'w-full h-11 px-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-sky-500',
          errors.inactive_reason ? 'border-danger-600' : 'border-stone-300'
        ]"
      >
      <p v-if="errors.inactive_reason" class="mt-1 text-xs text-danger-600">{{ errors.inactive_reason }}</p>
    </div>

    <!-- Notes -->
    <div>
      <label for="notes" class="block text-sm font-semibold text-forest-700 mb-1">
        Notas
      </label>
      <textarea
        id="notes"
        v-model="formData.notes"
        rows="3"
        placeholder="Notas pessoais sobre o missionário..."
        class="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
      />
    </div>

    <!-- Actions -->
    <div class="flex gap-3 pt-4">
      <button
        v-if="props.onCancel"
        type="button"
        @click="props.onCancel"
        :disabled="isSubmitting"
        class="flex-1 h-12 rounded-lg bg-linen-100 text-forest-700 font-semibold hover:bg-linen-100/80 transition-colors disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="isSubmitting"
        class="flex-1 h-12 rounded-lg bg-sunrise-500 text-white font-semibold hover:bg-sunrise-600 transition-colors disabled:opacity-50"
      >
        {{ isSubmitting ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Adicionar Missionário') }}
      </button>
    </div>
  </form>
</template>
