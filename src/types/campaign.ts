import type { Campaign, CampaignContent, CampaignStatus } from './database'

export interface CampaignFormData {
  topic: string // min 3 chars
  notes: string // min 20 chars
  resources?: string // optional
  images?: File[] // files to upload
}

export interface CampaignFilters {
  status?: CampaignStatus
  search?: string
  sortBy?: 'created_at' | 'updated_at'
  sortDirection?: 'asc' | 'desc'
}

export interface CampaignContentUpdate {
  email_subject?: string
  email_body?: string
  whatsapp_text?: string
  facebook_text?: string
  images?: string[] // Storage URLs
  ai_image_url?: string | null
}

export interface CampaignWithContent {
  campaign: Campaign
  content: CampaignContent | null
}

export interface GenerationStatus {
  status: 'idle' | 'generating' | 'success' | 'error'
  message?: string
}

export type { Campaign, CampaignContent, CampaignStatus }
