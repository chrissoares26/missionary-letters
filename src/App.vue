<script setup lang="ts">
import { RouterView } from 'vue-router'
import BottomNav from '@/components/layout/BottomNav.vue'
</script>

<template>
  <div
    class="flex min-h-dvh flex-col"
    style="background: var(--bg-canvas)"
  >
    <main class="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <RouterView />
    </main>

    <BottomNav />
  </div>
</template>
