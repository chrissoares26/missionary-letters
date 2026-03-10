// Database types for Supabase tables
// Generated based on schema migrations

export interface Profile {
  id: string // refs auth.users.id
  display_name: string
  default_language: string
  signature: string | null
  default_subject_prefix: string | null
  created_at: string
  updated_at: string
}

export interface Missionary {
  id: string
  owner_id: string // refs auth.users.id
  title: 'Elder' | 'Sister'
  first_name: string
  last_name: string
  email: string
  mission_name: string
  mission_end_date: string | null // ISO date string
  active: boolean
  inactive_reason: string | null
  notes: string | null
  last_sent_at: string | null // ISO datetime string
  created_at: string
  updated_at: string
}

export interface GoogleAccount {
  owner_id: string // refs auth.users.id, primary key
  google_email: string
  access_token: string
  refresh_token: string
  expiry: string // ISO datetime string
  scopes: string[]
  updated_at: string
}

export interface StyleEmail {
  id: string
  owner_id: string
  subject: string
  body: string
  source_label: string | null
  created_at_original: string | null
  tags: string[] | null
  embedding: number[] | null // vector(1536)
  token_count: number | null
  created_at: string
  updated_at: string
}

export interface StyleProfileJson {
  summary?: string
  unique_voice?: string
  tone?: { primary?: string }
  common_phrases?: string[]
  metadata?: {
    generated_at?: string
    analyzed_count?: number
  }
}

export interface StyleProfile {
  owner_id: string // primary key
  profile_json: StyleProfileJson
  updated_at: string
}

export type CampaignStatus = 'draft' | 'approved' | 'sending' | 'sent' | 'failed'
export type RecipientStatus = 'queued' | 'sent' | 'failed'

export interface Campaign {
  id: string
  owner_id: string
  topic: string
  notes: string | null
  resources: string | null
  language: string
  status: CampaignStatus
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface CampaignContent {
  campaign_id: string // primary key, refs campaigns.id
  email_subject: string
  email_body: string
  whatsapp_text: string
  facebook_text: string
  images: string[] | null
  ai_image_url: string | null
  updated_at: string
}

export interface CampaignRecipient {
  id: string
  campaign_id: string
  missionary_id: string
  to_email: string
  rendered_subject: string
  rendered_body: string
  status: RecipientStatus
  gmail_message_id: string | null
  error: string | null
  sent_at: string | null
  created_at: string
}

// Database type for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      missionaries: {
        Row: Missionary
        Insert: Omit<Missionary, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Missionary, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>
      }
      google_accounts: {
        Row: GoogleAccount
        Insert: Omit<GoogleAccount, 'updated_at'>
        Update: Partial<Omit<GoogleAccount, 'owner_id' | 'updated_at'>>
      }
      style_emails: {
        Row: StyleEmail
        Insert: Omit<StyleEmail, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<StyleEmail, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>
      }
      style_profile: {
        Row: StyleProfile
        Insert: Omit<StyleProfile, 'updated_at'>
        Update: Partial<Omit<StyleProfile, 'owner_id' | 'updated_at'>>
      }
      campaigns: {
        Row: Campaign
        Insert: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Campaign, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>
      }
      campaign_content: {
        Row: CampaignContent
        Insert: Omit<CampaignContent, 'updated_at'>
        Update: Partial<Omit<CampaignContent, 'campaign_id' | 'updated_at'>>
      }
      campaign_recipients: {
        Row: CampaignRecipient
        Insert: Omit<CampaignRecipient, 'id' | 'created_at'>
        Update: Partial<Omit<CampaignRecipient, 'id' | 'campaign_id' | 'missionary_id' | 'created_at'>>
      }
    }
  }
}
