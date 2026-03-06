# Dashboard & Campaigns Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the empty home dashboard with a useful campaigns hub (stats + recent campaigns + CTA) and add a dedicated campaigns list page accessible from the bottom nav.

**Architecture:** Four focused changes: (1) extract a reusable `CampaignStatusBadge` from the existing inline logic in `CampaignHeader.vue`; (2) build a campaigns list page at `/campaigns`; (3) wire `/campaigns` into the router and bottom nav; (4) rebuild the home dashboard with live stats, onboarding nudge, and recent campaigns. All data fetching reuses existing query composables — no new API calls.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, TailwindCSS v4, Pinia Colada (`useQuery`), Vue Router

---

## Context: What the codebase already has

- `src/queries/campaigns.ts` — exports `useCampaignsQuery(filters?)` and `useCampaignFilters()`
- `src/queries/missionaries.ts` — exports `useMissionariesQuery(filters?)`
- `src/queries/style-library.ts` — exports `useStyleEmailCountQuery()`
- `src/types/campaign.ts` — `CampaignStatus = 'draft' | 'approved' | 'sending' | 'sent' | 'failed'`
- `src/components/features/campaigns/CampaignHeader.vue` — contains inline status badge logic (to be extracted)
- `src/components/layout/BottomNav.vue` — 4 nav items: Início `/`, Missionários `/missionaries`, Estilo `/style-library`, Config `/settings`
- `src/router/index.ts` — has `/campaigns/new` and `/campaigns/:id` but no `/campaigns` list route

---

## Task 1: Extract CampaignStatusBadge component

**Files:**
- Create: `src/components/features/campaigns/CampaignStatusBadge.vue`
- Modify: `src/components/features/campaigns/CampaignHeader.vue` (lines 17–48, 90–96) — replace inline badge with the new component

**Step 1: Create the badge component**

```vue
<!-- src/components/features/campaigns/CampaignStatusBadge.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { CampaignStatus } from '@/types/campaign'

interface Props {
  status: CampaignStatus
}

const props = defineProps<Props>()

const config = computed(() => {
  switch (props.status) {
    case 'draft':
      return { label: 'Rascunho', color: 'bg-amber-100 text-amber-800' }
    case 'approved':
      return { label: 'Aprovada', color: 'bg-blue-100 text-blue-800' }
    case 'sending':
      return { label: 'Enviando...', color: 'bg-blue-100 text-blue-800 animate-pulse' }
    case 'sent':
      return { label: 'Enviada ✓', color: 'bg-green-100 text-green-800' }
    case 'failed':
      return { label: 'Falhou', color: 'bg-red-100 text-red-800' }
    default:
      return { label: props.status, color: 'bg-gray-100 text-gray-800' }
  }
})
</script>

<template>
  <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="config.color">
    {{ config.label }}
  </span>
</template>
```

**Step 2: Update CampaignHeader.vue to use the new component**

In `src/components/features/campaigns/CampaignHeader.vue`:

- Add import: `import CampaignStatusBadge from './CampaignStatusBadge.vue'`
- Remove the `statusConfig` computed (lines 17–48)
- Replace the inline badge span (around line 90–96):

```html
<!-- BEFORE -->
<span
  class="rounded-full px-3 py-1 text-xs font-semibold"
  :class="[statusConfig.color, statusConfig.animate ? 'animate-pulse' : '']"
>
  {{ statusConfig.label }}
</span>

<!-- AFTER -->
<CampaignStatusBadge :status="campaign.status" />
```

**Step 3: Run type-check to verify no breakage**

```bash
bunx tsc --noEmit
```
Expected: no errors

**Step 4: Commit**

```bash
git add src/components/features/campaigns/CampaignStatusBadge.vue src/components/features/campaigns/CampaignHeader.vue
git commit -m "refactor: extract CampaignStatusBadge component"
```

---

## Task 2: Build campaigns list page

**Files:**
- Create: `src/pages/campaigns/index.vue`

**Step 1: Create the page**

```vue
<!-- src/pages/campaigns/index.vue -->
<script setup lang="ts">
import { computed } from 'vue'
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
    <div v-if="status === 'loading'" class="space-y-3">
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
```

**Step 2: Verify TypeScript**

```bash
bunx tsc --noEmit
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/pages/campaigns/index.vue
git commit -m "feat: add campaigns list page"
```

---

## Task 3: Wire /campaigns into router and BottomNav

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/components/layout/BottomNav.vue`

**Step 1: Add /campaigns route to router**

In `src/router/index.ts`, add this route **before** the `/campaigns/new` entry (order matters — specificity):

```typescript
{
  path: '/campaigns',
  component: () => import('@/pages/campaigns/index.vue'),
},
```

The routes block should look like:
```typescript
{ path: '/campaigns', component: () => import('@/pages/campaigns/index.vue') },
{ path: '/campaigns/new', component: () => import('@/pages/campaigns/new.vue') },
{ path: '/campaigns/:id', component: () => import('@/pages/campaigns/[id].vue') },
```

**Step 2: Update BottomNav to include Campanhas**

In `src/components/layout/BottomNav.vue`, replace the `navItems` array:

```typescript
const navItems: NavItem[] = [
  { to: '/', label: 'Início', icon: 'home' },
  { to: '/missionaries', label: 'Missionários', icon: 'people' },
  { to: '/campaigns', label: 'Campanhas', icon: 'campaigns' },
  { to: '/style-library', label: 'Estilo', icon: 'book' },
  { to: '/settings', label: 'Config.', icon: 'gear' },
]
```

Add the campaigns SVG icon case after the `book` icon in the template:

```html
<!-- Campaigns (list/grid icon) -->
<svg
  v-else-if="item.icon === 'campaigns'"
  xmlns="http://www.w3.org/2000/svg"
  width="22"
  height="22"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.75"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
</svg>
```

**Step 3: Run the dev server and browser-test the nav**

```bash
agent-browser open http://localhost:5173/campaigns
agent-browser snapshot -i
```

Expected: see the campaigns list page with the "Campanhas" nav item active

**Step 4: Commit**

```bash
git add src/router/index.ts src/components/layout/BottomNav.vue
git commit -m "feat: add /campaigns route and nav item"
```

---

## Task 4: Rebuild home dashboard

**Files:**
- Modify: `src/pages/(dashboard).vue`

**Step 1: Write the new dashboard**

Replace the entire content of `src/pages/(dashboard).vue`:

```vue
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
const sentCount = computed(() => recentCampaigns.value?.filter((c) => c.status === 'sent').length ?? 0)
const displayedCampaigns = computed(() => recentCampaigns.value?.slice(0, 5) ?? [])
const onboardingDone = computed(() => styleCount.value >= STYLE_EMAIL_TARGET)

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
</script>

<template>
  <div class="px-4 pb-6 pt-5">
    <!-- Header -->
    <div class="mb-5">
      <h1 class="text-2xl font-bold" style="color: var(--text-primary)">Início</h1>
      <p class="mt-0.5 text-sm" style="color: var(--text-secondary)">Segunda-feira missionária</p>
    </div>

    <!-- Onboarding nudge — shown until 10 style emails are added -->
    <div
      v-if="!onboardingDone"
      class="mb-5 rounded-2xl p-4"
      style="background: var(--bg-subtle)"
    >
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
        <p class="text-2xl font-bold" style="color: var(--text-primary)">{{ activeMissionaryCount }}</p>
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
      <RouterLink
        to="/campaigns"
        class="text-sm"
        style="color: var(--action-primary)"
      >
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
          <p class="truncate font-semibold" style="color: var(--text-primary)">{{ campaign.topic }}</p>
          <p class="mt-0.5 text-xs" style="color: var(--text-secondary)">{{ formatDate(campaign.created_at) }}</p>
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
```

**Step 2: Type-check**

```bash
bunx tsc --noEmit
```
Expected: no errors

**Step 3: Browser-test the home page**

```bash
agent-browser open http://localhost:5173/
agent-browser screenshot
```

Expected: stats row visible, onboarding progress bar visible (since test account has 3/10 emails), recent campaigns list showing 5 entries with status badges, "Nova Campanha" button at the bottom.

**Step 4: Verify navigation flow**

```bash
agent-browser snapshot -i
# click "Ver todas →" link
# verify /campaigns page loads with full list
agent-browser navigate_back
# click a campaign row
# verify /campaigns/:id loads correctly
```

**Step 5: Commit**

```bash
git add src/pages/\(dashboard\).vue
git commit -m "feat: rebuild home dashboard with stats, onboarding nudge, and recent campaigns"
```

---

## Final verification

```bash
bunx tsc --noEmit          # type-check
bunx vitest run            # unit tests (should all pass — no logic changes)
agent-browser open http://localhost:5173/
```

Walk through the full flow:
1. Home → shows stats + campaigns list ✓
2. "Ver todas →" → `/campaigns` with filters ✓
3. Tap campaign → detail page ✓
4. Bottom nav "Campanhas" → `/campaigns` ✓
5. "+ Nova Campanha" → `/campaigns/new` ✓
