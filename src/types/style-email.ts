export interface StyleEmailFormData {
  subject: string
  body: string
  source_label: string | null
}

export type EmbeddingStatus = 'pending' | 'ready' | 'error'
