<script setup lang="ts">
import { ref } from 'vue'
import MissionaryTable from '@/components/features/missionaries/MissionaryTable.vue'
import MissionaryForm from '@/components/features/missionaries/MissionaryForm.vue'
import type { Missionary } from '@/types/database'

// Modal state
const isFormOpen = ref(false)
const editingMissionary = ref<Missionary | undefined>(undefined)

function openCreateForm() {
  editingMissionary.value = undefined
  isFormOpen.value = true
}

function openEditForm(missionary: Missionary) {
  editingMissionary.value = missionary
  isFormOpen.value = true
}

function closeForm() {
  isFormOpen.value = false
  editingMissionary.value = undefined
}

function handleFormSuccess() {
  closeForm()
}
</script>

<template>
  <div class="min-h-screen bg-linen-50 pb-8">
    <!-- Header -->
    <div class="bg-white border-b border-stone-300 sticky top-0 z-10">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold text-ink-900 font-serif">Missionários</h1>
            <p class="text-sm text-secondary mt-1">
              Gerencie os missionários ativos e inativos
            </p>
          </div>
          <button
            type="button"
            @click="openCreateForm"
            class="shrink-0 h-12 px-6 rounded-lg bg-sunrise-500 text-white font-semibold hover:bg-sunrise-600 transition-colors"
          >
            + Adicionar
          </button>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="max-w-4xl mx-auto px-4 py-6">
      <MissionaryTable :on-edit="openEditForm" />
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
              <div class="sticky top-0 bg-white border-b border-stone-300 px-6 py-4 rounded-t-3xl sm:rounded-t-2xl">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-bold text-ink-900 font-serif">
                    {{ editingMissionary ? 'Editar Missionário' : 'Novo Missionário' }}
                  </h2>
                  <button
                    type="button"
                    @click="closeForm"
                    class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-linen-100 text-forest-700 transition-colors"
                    aria-label="Fechar"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Modal body -->
              <div class="p-6">
                <MissionaryForm
                  :missionary="editingMissionary"
                  :on-success="handleFormSuccess"
                  :on-cancel="closeForm"
                />
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
