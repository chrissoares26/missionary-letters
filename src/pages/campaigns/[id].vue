<script setup lang="ts">
import { useRoute } from 'vue-router'

// Campaign detail — edit, approve, and send a specific campaign
const route = useRoute()
const campaignId = route.params.id as string
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-[var(--text-primary)]">Campanha</h1>
    <p class="mt-2 text-[var(--text-secondary)]">
      Edite, aprove e envie a campanha <code>{{ campaignId }}</code>.
    </p>
  </div>
</template>
