<script setup lang="ts">
import { computed } from 'vue'
import { useMissionariesQuery, useMissionaryFilters, useDeleteMissionary } from '@/queries/missionaries'
import type { Missionary } from '@/types/database'

interface Props {
  onEdit?: (missionary: Missionary) => void
}

const props = withDefaults(defineProps<Props>(), {
  onEdit: undefined,
})

const { filters, setActiveFilter, setSearchFilter } = useMissionaryFilters()
const { data: missionaries, status, error } = useMissionariesQuery(filters)
const { mutate: deleteMissionary, status: deleteStatus } = useDeleteMissionary()

const isLoading = computed(() => status.value === 'pending')
const isDeleting = computed(() => deleteStatus.value === 'pending')

// Format mission end date to pt-BR format
function formatEndDate(date: string | null): string {
  if (!date) return 'Não definida'
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR')
}

// Calculate days until mission ends
function getDaysUntilEnd(date: string | null): number | null {
  if (!date) return null
  const end = new Date(date)
  const today = new Date()
  const diffTime = end.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Get status color and label
function getStatusInfo(missionary: Missionary) {
  if (!missionary.active) {
    return {
      label: 'Inativo',
      colorClass: 'bg-stone-300 text-ink-900',
    }
  }

  const daysUntil = getDaysUntilEnd(missionary.mission_end_date)
  if (daysUntil === null) {
    return {
      label: 'Ativo',
      colorClass: 'bg-success-600 text-white',
    }
  }

  if (daysUntil < 0) {
    return {
      label: 'Missão finalizada',
      colorClass: 'bg-warning-600 text-white',
    }
  }

  if (daysUntil <= 30) {
    return {
      label: `Ativo (${daysUntil}d)`,
      colorClass: 'bg-warning-600 text-white',
    }
  }

  return {
    label: 'Ativo',
    colorClass: 'bg-success-600 text-white',
  }
}

function handleDelete(missionary: Missionary) {
  if (!confirm(`Tem certeza que deseja desativar ${missionary.first_name} ${missionary.last_name}?`)) {
    return
  }
  deleteMissionary(missionary.id)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="bg-white rounded-2xl p-4 shadow-sm border border-stone-300">
      <div class="space-y-3">
        <!-- Search -->
        <div>
          <label for="search" class="block text-sm font-semibold text-forest-700 mb-1">
            Buscar
          </label>
          <input
            id="search"
            type="text"
            :value="filters.search"
            @input="setSearchFilter(($event.target as HTMLInputElement).value)"
            placeholder="Nome, email ou missão..."
            class="w-full h-11 px-3 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
        </div>

        <!-- Active filter -->
        <div>
          <label class="block text-sm font-semibold text-forest-700 mb-2">
            Status
          </label>
          <div class="flex gap-2">
            <button
              type="button"
              @click="setActiveFilter(undefined)"
              :class="[
                'flex-1 h-11 rounded-lg font-medium transition-colors',
                filters.active === undefined
                  ? 'bg-sunrise-500 text-white'
                  : 'bg-linen-100 text-forest-700 hover:bg-linen-100/80'
              ]"
            >
              Todos
            </button>
            <button
              type="button"
              @click="setActiveFilter(true)"
              :class="[
                'flex-1 h-11 rounded-lg font-medium transition-colors',
                filters.active === true
                  ? 'bg-sunrise-500 text-white'
                  : 'bg-linen-100 text-forest-700 hover:bg-linen-100/80'
              ]"
            >
              Ativos
            </button>
            <button
              type="button"
              @click="setActiveFilter(false)"
              :class="[
                'flex-1 h-11 rounded-lg font-medium transition-colors',
                filters.active === false
                  ? 'bg-sunrise-500 text-white'
                  : 'bg-linen-100 text-forest-700 hover:bg-linen-100/80'
              ]"
            >
              Inativos
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="text-center py-8 text-forest-700">
      Carregando missionários...
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-danger-600/10 rounded-2xl p-4 text-danger-600">
      Erro ao carregar missionários: {{ error.message }}
    </div>

    <!-- Empty state -->
    <div v-else-if="!missionaries || missionaries.length === 0" class="text-center py-8 text-forest-700">
      <p class="text-lg font-semibold mb-2">Nenhum missionário encontrado</p>
      <p class="text-sm text-secondary">
        {{ filters.search ? 'Tente ajustar os filtros de busca' : 'Adicione seu primeiro missionário para começar' }}
      </p>
    </div>

    <!-- Missionary list -->
    <div v-else class="space-y-3">
      <div
        v-for="missionary in missionaries"
        :key="missionary.id"
        :class="[
          'bg-white rounded-2xl p-4 shadow-sm border transition-opacity',
          missionary.active ? 'border-stone-300' : 'border-stone-300 opacity-60'
        ]"
      >
        <div class="space-y-3">
          <!-- Header -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-ink-900 truncate">
                {{ missionary.title }} {{ missionary.first_name }} {{ missionary.last_name }}
              </h3>
              <p class="text-sm text-secondary truncate">{{ missionary.email }}</p>
            </div>
            <span
              :class="[
                'shrink-0 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
                getStatusInfo(missionary).colorClass
              ]"
            >
              {{ getStatusInfo(missionary).label }}
            </span>
          </div>

          <!-- Mission details -->
          <div class="space-y-1 text-sm">
            <p class="text-forest-700">
              <span class="font-semibold">Missão:</span> {{ missionary.mission_name }}
            </p>
            <p class="text-forest-700">
              <span class="font-semibold">Término:</span> {{ formatEndDate(missionary.mission_end_date) }}
            </p>
            <p v-if="missionary.notes" class="text-secondary">
              {{ missionary.notes }}
            </p>
            <p v-if="!missionary.active && missionary.inactive_reason" class="text-warning-600 text-xs">
              {{ missionary.inactive_reason }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 pt-2 border-t border-stone-300">
            <button
              v-if="props.onEdit"
              type="button"
              @click="props.onEdit(missionary)"
              class="flex-1 h-11 rounded-lg bg-linen-100 text-forest-700 font-medium hover:bg-linen-100/80 transition-colors"
            >
              Editar
            </button>
            <button
              v-if="missionary.active"
              type="button"
              @click="handleDelete(missionary)"
              :disabled="isDeleting"
              class="flex-1 h-11 rounded-lg bg-danger-600/10 text-danger-600 font-medium hover:bg-danger-600/20 transition-colors disabled:opacity-50"
            >
              Desativar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
