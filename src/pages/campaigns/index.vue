<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useCampaignsQuery, useCampaignFilters } from '@/queries/campaigns'
import CampaignStatusBadge from '@/components/features/campaigns/CampaignStatusBadge.vue'
import type { CampaignStatus } from '@/types/campaign'

const { filters, setStatusFilter } = useCampaignFilters()
const { data: campaigns, status } = useCampaignsQuery(filters)

const filterOptions: { label: string; value: CampaignStatus | undefined }[] = [
  { label: 'Todas', value: undefined },
  { label: 'Rascunho', value: 'draft' },
  { label: 'Aprovadas', value: 'approved' },
  { label: 'Enviadas', value: 'sent' },
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="px-4 pb-6 pt-5">
    <!-- Header -->
    <div class="mb-5 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold" style="color: var(--text-primary)">Campanhas</h1>
        <p class="mt-0.5 text-sm" style="color: var(--text-secondary)">Gerencie suas campanhas semanais</p>
      </div>
      <RouterLink
        to="/campaigns/new"
        class="rounded-full px-4 py-2 text-sm font-semibold text-white"
        style="background: var(--action-primary)"
      >
        + Nova
      </RouterLink>
    </div>

    <!-- Status filter -->
    <div class="mb-4 flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="opt in filterOptions"
        :key="String(opt.value)"
        class="shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
        :class="
          filters.status === opt.value
            ? 'border-transparent text-white'
            : 'border-transparent'
        "
        :style="
          filters.status === opt.value
            ? 'background: var(--action-primary); color: white'
            : 'background: var(--bg-subtle); color: var(--text-secondary)'
        "
        @click="setStatusFilter(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="space-y-3">
      <div
        v-for="i in 4"
        :key="i"
        class="h-20 animate-pulse rounded-2xl"
        style="background: var(--bg-subtle)"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!campaigns?.length"
      class="mt-16 flex flex-col items-center gap-3 text-center"
    >
      <p class="text-lg font-medium" style="color: var(--text-primary)">Nenhuma campanha ainda</p>
      <p class="text-sm" style="color: var(--text-secondary)">Crie sua primeira campanha semanal</p>
      <RouterLink
        to="/campaigns/new"
        class="mt-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white"
        style="background: var(--action-primary)"
      >
        Criar campanha
      </RouterLink>
    </div>

    <!-- Campaign list -->
    <div v-else class="space-y-3">
      <RouterLink
        v-for="campaign in campaigns"
        :key="campaign.id"
        :to="`/campaigns/${campaign.id}`"
        class="flex items-center justify-between rounded-2xl p-4"
        style="background: var(--bg-surface)"
      >
        <div class="min-w-0">
          <p class="truncate font-semibold" style="color: var(--text-primary)">{{ campaign.topic }}</p>
          <p class="mt-0.5 text-xs" style="color: var(--text-secondary)">{{ formatDate(campaign.created_at) }}</p>
        </div>
        <CampaignStatusBadge :status="campaign.status" class="ml-3 shrink-0" />
      </RouterLink>
    </div>
  </div>
</template>
