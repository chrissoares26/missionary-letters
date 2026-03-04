import type { Missionary } from './database'

// Form data for creating/editing missionaries
export interface MissionaryFormData {
  title: 'Elder' | 'Sister'
  first_name: string
  last_name: string
  email: string
  mission_name: string
  mission_end_date: string | null
  active: boolean
  inactive_reason?: string | null
  notes?: string | null
}

// Missionary with computed fields
export interface MissionaryWithStatus extends Missionary {
  full_name: string
  is_mission_ended: boolean
  days_until_end: number | null
}

// Filter options for missionary list
export interface MissionaryFilters {
  active?: boolean
  search?: string
  sortBy?: 'last_name' | 'mission_end_date' | 'created_at'
  sortDirection?: 'asc' | 'desc'
}
