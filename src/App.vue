<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import BottomNav from '@/components/layout/BottomNav.vue'
import Toast from '@/components/ui/Toast.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { useToast } from '@/composables/useToast'

const { toasts, removeToast } = useToast()
const route = useRoute()

const authRoutes = ['/login', '/register', '/reset-password']
const showNav = computed(() => !authRoutes.includes(route.path))
</script>

<template>
  <div
    class="flex min-h-dvh flex-col"
    style="background: var(--bg-canvas)"
  >
    <main :class="['flex-1 overflow-y-auto', showNav ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : '']">
      <RouterView />
    </main>

    <BottomNav v-if="showNav" />

    <ConfirmModal />

    <!-- Toast container -->
    <div class="fixed left-0 right-0 top-0 z-50 flex flex-col items-center gap-2 p-4">
      <Toast
        v-for="toast in toasts"
        :key="toast.id"
        :message="toast.message"
        :type="toast.type"
        :duration="toast.duration"
        @close="removeToast(toast.id)"
      />
    </div>
  </div>
</template>
