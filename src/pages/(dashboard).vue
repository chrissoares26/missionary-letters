<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useCampaignsQuery } from '@/queries/campaigns'
import { useMissionariesQuery } from '@/queries/missionaries'
import { useStyleEmailCountQuery } from '@/queries/style-library'
import CampaignStatusBadge from '@/components/features/campaigns/CampaignStatusBadge.vue'

const STYLE_EMAIL_TARGET = 10

// Fetch data — all queries are cached; no extra network cost if already loaded
const { data: recentCampaigns } = useCampaignsQuery(() => ({
  sortBy: 'created_at',
  sortDirection: 'desc',
}))
const { data: missionaries } = useMissionariesQuery(() => ({ active: true }))
const { data: styleEmailCount } = useStyleEmailCountQuery()

const activeMissionaryCount = computed(() => missionaries.value?.length ?? 0)
const styleCount = computed(() => styleEmailCount.value ?? 0)
const sentCount = computed(
  () => recentCampaigns.value?.filter((c) => c.status === 'sent').length ?? 0,
)
const displayedCampaigns = computed(() => recentCampaigns.value?.slice(0, 5) ?? [])
const onboardingDone = computed(() => styleCount.value >= STYLE_EMAIL_TARGET)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
</script>

<template>
  <div class="px-4 pb-6 pt-8">
    <!-- Header -->
    <div class="mb-5">
      <h1 class="text-2xl font-bold" style="color: var(--text-primary)">Início</h1>
      <p class="mt-0.5 text-sm" style="color: var(--text-secondary)">Segunda-feira missionária</p>
    </div>

    <!-- Onboarding nudge — shown until 10 style emails are added -->
    <div v-if="!onboardingDone" class="mb-5 rounded-2xl p-4" style="background: var(--bg-subtle)">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-semibold" style="color: var(--text-primary)">
          Configure seu estilo de escrita
        </p>
        <RouterLink
          to="/style-library"
          class="text-xs font-semibold"
          style="color: var(--action-primary)"
        >
          Adicionar →
        </RouterLink>
      </div>
      <div class="h-2 overflow-hidden rounded-full" style="background: var(--border-default)">
        <div
          class="h-full rounded-full transition-all"
          style="background: var(--action-primary)"
          :style="{ width: `${Math.min((styleCount / STYLE_EMAIL_TARGET) * 100, 100)}%` }"
        />
      </div>
      <p class="mt-1.5 text-xs" style="color: var(--text-secondary)">
        {{ styleCount }} / {{ STYLE_EMAIL_TARGET }} emails para desbloquear geração de campanhas
      </p>
    </div>

    <!-- Stats row -->
    <div class="mb-5 grid grid-cols-3 gap-3">
      <div class="rounded-2xl p-3 text-center" style="background: var(--bg-surface)">
        <p class="text-2xl font-bold" style="color: var(--text-primary)">
          {{ activeMissionaryCount }}
        </p>
        <p class="mt-0.5 text-xs" style="color: var(--text-secondary)">Missionários</p>
      </div>
      <div class="rounded-2xl p-3 text-center" style="background: var(--bg-surface)">
        <p class="text-2xl font-bold" style="color: var(--text-primary)">{{ styleCount }}</p>
        <p class="mt-0.5 text-xs" style="color: var(--text-secondary)">Emails de Estilo</p>
      </div>
      <div class="rounded-2xl p-3 text-center" style="background: var(--bg-surface)">
        <p class="text-2xl font-bold" style="color: var(--text-primary)">{{ sentCount }}</p>
        <p class="mt-0.5 text-xs" style="color: var(--text-secondary)">Enviadas</p>
      </div>
    </div>

    <!-- Campaigns section -->
    <div class="mb-3 flex items-center justify-between">
      <h2 class="font-semibold" style="color: var(--text-primary)">Campanhas Recentes</h2>
      <RouterLink to="/campaigns" class="text-sm" style="color: var(--action-primary)">
        Ver todas →
      </RouterLink>
    </div>

    <!-- Empty state -->
    <div
      v-if="!displayedCampaigns.length"
      class="flex flex-col items-center gap-3 rounded-2xl py-10 text-center"
      style="background: var(--bg-surface)"
    >
      <p class="text-sm" style="color: var(--text-secondary)">Nenhuma campanha criada ainda</p>
      <RouterLink
        to="/campaigns/new"
        class="rounded-full px-5 py-2 text-sm font-semibold text-white"
        style="background: var(--action-primary)"
      >
        + Nova Campanha
      </RouterLink>
    </div>

    <!-- Campaign list (last 5) -->
    <div v-else class="space-y-3">
      <RouterLink
        v-for="campaign in displayedCampaigns"
        :key="campaign.id"
        :to="`/campaigns/${campaign.id}`"
        class="flex items-center justify-between rounded-2xl p-4"
        style="background: var(--bg-surface)"
      >
        <div class="min-w-0">
          <p class="truncate font-semibold" style="color: var(--text-primary)">
            {{ campaign.topic }}
          </p>
          <p class="mt-0.5 text-xs" style="color: var(--text-secondary)">
            {{ formatDate(campaign.created_at) }}
          </p>
        </div>
        <CampaignStatusBadge :status="campaign.status" class="ml-3 shrink-0" />
      </RouterLink>

      <!-- New campaign CTA below the list -->
      <RouterLink
        to="/campaigns/new"
        class="flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-semibold text-white"
        style="background: var(--action-primary)"
      >
        + Nova Campanha
      </RouterLink>
    </div>
  </div>
</template>
