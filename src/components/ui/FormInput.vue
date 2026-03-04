<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue: string
  type?: string
  label: string
  error?: string
  placeholder?: string
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  error: '',
  placeholder: '',
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputId = `input-${Math.random().toString(36).substring(2, 9)}`
const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div class="space-y-1">
    <label
      :for="inputId"
      class="block text-sm font-medium text-ink-900"
    >
      {{ label }}
      <span v-if="required" class="text-sunrise-600">*</span>
    </label>

    <div class="relative">
      <input
        :id="inputId"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${inputId}-error` : undefined"
        class="block w-full rounded-lg border px-4 py-2.5 transition-colors focus:outline-none focus:ring-2"
        :class="[
          error
            ? 'border-sunrise-500 focus:border-sunrise-500 focus:ring-sunrise-500/20'
            : 'border-stone-300 focus:border-forest-500 focus:ring-forest-500/20'
        ]"
        @input="handleInput"
      >

      <!-- Password visibility toggle -->
      <button
        v-if="type === 'password'"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-ink-900"
        :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
        @click="togglePasswordVisibility"
      >
        <svg
          v-if="!showPassword"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <svg
          v-else
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      </button>
    </div>

    <p
      v-if="error"
      :id="`${inputId}-error`"
      class="text-sm text-sunrise-600"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
