<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'

const { isVisible, currentOptions, handleConfirm, handleCancel } = useConfirm()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isVisible"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
        @click.self="handleCancel"
      >
        <div class="bg-white rounded-t-2xl sm:rounded-2xl p-6 max-w-md w-full mx-4 sm:mx-0 animate-slide-up">
          <h3 class="text-xl font-bold text-(--text-primary) mb-2">
            {{ currentOptions.title }}
          </h3>
          <p class="text-(--text-secondary) mb-6">
            {{ currentOptions.message }}
          </p>

          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 px-4 py-2 border border-(--border-default) text-(--text-primary) rounded-lg font-medium hover:bg-(--bg-muted)"
              @click="handleCancel"
            >
              {{ currentOptions.cancelLabel ?? 'Cancelar' }}
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2 bg-(--action-primary) text-white rounded-lg font-medium hover:opacity-90"
              @click="handleConfirm"
            >
              {{ currentOptions.confirmLabel ?? 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
