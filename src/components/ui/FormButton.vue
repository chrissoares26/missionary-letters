<script setup lang="ts">
interface Props {
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  variant: 'primary',
  type: 'button',
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="relative inline-flex items-center justify-center rounded-lg px-6 py-2.5 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    :class="{
      'bg-forest-600 text-white hover:bg-forest-700 focus:ring-forest-500': variant === 'primary',
      'bg-stone-200 text-ink-900 hover:bg-stone-300 focus:ring-stone-400': variant === 'secondary',
      'bg-sunrise-600 text-white hover:bg-sunrise-700 focus:ring-sunrise-500': variant === 'danger',
    }"
  >
    <!-- Loading spinner -->
    <svg
      v-if="loading"
      class="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>

    <!-- Button content (hidden when loading) -->
    <span :class="{ 'opacity-0': loading }">
      <slot />
    </span>
  </button>
</template>
