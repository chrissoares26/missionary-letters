<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface Props {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 5000,
})

const emit = defineEmits<{
  close: []
}>()

const visible = ref(false)

onMounted(() => {
  // Trigger animation
  setTimeout(() => {
    visible.value = true
  }, 10)

  // Auto-dismiss
  if (props.duration > 0) {
    setTimeout(() => {
      close()
    }, props.duration)
  }
})

function close() {
  visible.value = false
  setTimeout(() => {
    emit('close')
  }, 300)
}
</script>

<template>
  <div
    class="fixed left-1/2 top-4 z-50 -translate-x-1/2 transition-all duration-300"
    :class="visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'"
  >
    <div
      class="flex min-w-80 items-center gap-3 rounded-lg px-4 py-3 shadow-lg"
      :class="{
        'bg-forest-50 text-forest-900 border border-forest-200': type === 'success',
        'bg-sunrise-50 text-sunrise-900 border border-sunrise-200': type === 'error',
        'bg-sky-50 text-sky-900 border border-sky-200': type === 'info',
      }"
    >
      <!-- Icon -->
      <div class="flex-shrink-0">
        <!-- Success icon -->
        <svg
          v-if="type === 'success'"
          class="h-5 w-5 text-forest-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>

        <!-- Error icon -->
        <svg
          v-if="type === 'error'"
          class="h-5 w-5 text-sunrise-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>

        <!-- Info icon -->
        <svg
          v-if="type === 'info'"
          class="h-5 w-5 text-sky-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
      </div>

      <!-- Message -->
      <p class="flex-1 text-sm font-medium">
        {{ message }}
      </p>

      <!-- Close button -->
      <button
        type="button"
        class="flex-shrink-0 rounded p-1 hover:bg-black/5"
        aria-label="Fechar"
        @click="close"
      >
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
