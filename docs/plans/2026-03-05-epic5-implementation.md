# Epic 5: Campaign Draft Generation Workflow - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Build complete campaign workflow: create → auto-generate content with RAG → edit → approve, including image upload support.

**Architecture:** Fire-and-forget generation pattern with Realtime updates (following Epic 4 embedding pattern). Separate queries for campaign metadata and content. Auto-save editing with debounced mutations. Image upload to Supabase Storage.

**Tech Stack:** Vue 3, TypeScript, Pinia Colada, Supabase (Postgres, Storage, Edge Functions, Realtime), OpenAI GPT-4o.

---

## Phase 1: Foundation (Schema, Types, Storage)

### Task 1: Add schema migrations for images and resources

**Files:**
- Create: `supabase/migrations/add_campaign_images_resources.sql`

**Step 1: Write migration SQL**

```sql
-- Add images column to campaign_content
ALTER TABLE campaign_content
ADD COLUMN images text[] DEFAULT '{}';

-- Add resources column to campaigns
ALTER TABLE campaigns
ADD COLUMN resources text;

-- Add comment
COMMENT ON COLUMN campaign_content.images IS 'Array of Supabase Storage URLs for uploaded images';
COMMENT ON COLUMN campaigns.resources IS 'User-provided resources: conference talks, scriptures, quotes';
```

**Step 2: Apply migration**

Run: `bunx supabase db push`
Expected: Migration applied successfully

**Step 3: Verify schema changes**

Run: `bunx supabase db remote ls`
Expected: See new migration in list

**Step 4: Regenerate database types**

Run: `bunx supabase gen types typescript --remote > src/types/database.ts`
Expected: Types updated with new columns

**Step 5: Commit**

```bash
git add supabase/migrations/add_campaign_images_resources.sql src/types/database.ts
git commit -m "feat: add images and resources columns for campaign content"
```

---

### Task 2: Setup Supabase Storage bucket for campaign images

**Files:**
- Test via Supabase MCP tools

**Step 1: Create storage bucket**

Use MCP tool or Supabase dashboard:
- Bucket name: `campaign-images`
- Public: false
- File size limit: 5MB
- Allowed MIME types: image/jpeg, image/png, image/webp

**Step 2: Create RLS policies for bucket**

Run these SQL commands via `mcp__supabase__execute_sql`:

```sql
-- Allow users to upload to their own campaign folders
CREATE POLICY "Users can upload campaign images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own campaign images
CREATE POLICY "Users can read own campaign images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'campaign-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own campaign images
CREATE POLICY "Users can delete own campaign images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Step 3: Verify bucket exists**

Query: `SELECT * FROM storage.buckets WHERE name = 'campaign-images'`
Expected: One row returned

**Step 4: Document storage structure**

Add to CLAUDE.md or project docs:
```
Storage structure:
campaign-images/
  └── {owner_id}/
      └── {campaign_id}/
          ├── image-1.jpg
          └── image-2.png
```

**Step 5: Commit**

```bash
git add CLAUDE.md  # or wherever you documented
git commit -m "feat: setup Supabase Storage bucket for campaign images"
```

---

### Task 3: Create campaign types

**Files:**
- Create: `src/types/campaign.ts`

**Step 1: Write campaign types**

```typescript
import type { Campaign, CampaignContent, CampaignStatus } from './database'

export interface CampaignFormData {
  topic: string          // min 3 chars
  notes: string          // min 20 chars
  resources?: string     // optional
  images?: File[]        // files to upload
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
  images?: string[]  // Storage URLs
}

export interface CampaignWithContent {
  campaign: Campaign
  content: CampaignContent | null
}

export interface GenerationStatus {
  status: 'idle' | 'generating' | 'success' | 'error'
  message?: string
}

export { Campaign, CampaignContent, CampaignStatus }
```

**Step 2: Commit**

```bash
git add src/types/campaign.ts
git commit -m "feat: add campaign types for Epic 5"
```

---

## Phase 2: API & Queries Layer

### Task 4: Implement campaigns API layer

**Files:**
- Create: `src/api/campaigns.ts`

**Step 1: Write core CRUD functions**

```typescript
import { supabase } from '@/utils/supabase'
import type { Campaign, CampaignContent, Database } from '@/types/database'
import type { CampaignFormData, CampaignFilters, CampaignContentUpdate } from '@/types/campaign'

type CampaignInsert = Database['public']['Tables']['campaigns']['Insert']
type CampaignUpdate = Database['public']['Tables']['campaigns']['Update']
type CampaignContentInsert = Database['public']['Tables']['campaign_content']['Insert']
type CampaignContentUpdate = Database['public']['Tables']['campaign_content']['Update']

/**
 * Fetch all campaigns for the current authenticated user
 * Supports filtering by status and search term
 */
export async function getCampaigns(filters?: CampaignFilters): Promise<Campaign[]> {
  let query = supabase
    .from('campaigns')
    .select('*')

  // Apply status filter
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  // Apply search filter (searches topic and notes)
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`
    query = query.or(`topic.ilike.${searchTerm},notes.ilike.${searchTerm}`)
  }

  // Apply sorting
  const sortBy = filters?.sortBy || 'created_at'
  const sortDirection = filters?.sortDirection || 'desc'
  query = query.order(sortBy, { ascending: sortDirection === 'asc' })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch campaigns: ${error.message}`)
  }

  return data || []
}

/**
 * Fetch a single campaign by ID
 */
export async function getCampaignById(id: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch campaign: ${error.message}`)
  }

  if (!data) {
    throw new Error('Campaign not found')
  }

  return data
}

/**
 * Fetch campaign content by campaign ID
 */
export async function getCampaignContent(campaignId: string): Promise<CampaignContent | null> {
  const { data, error } = await supabase
    .from('campaign_content')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch campaign content: ${error.message}`)
  }

  return data
}

/**
 * Create a new campaign
 */
export async function createCampaign(formData: CampaignFormData): Promise<Campaign> {
  const { data: session, error: authError } = await supabase.auth.getSession()

  if (authError || !session.session?.user) {
    throw new Error('User must be authenticated to create campaigns')
  }

  const insertData: CampaignInsert = {
    owner_id: session.session.user.id,
    topic: formData.topic,
    notes: formData.notes || null,
    resources: formData.resources || null,
    language: 'pt-BR',
    status: 'draft',
  }

  const { data, error } = await supabase
    .from('campaigns')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create campaign: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to create campaign: No data returned')
  }

  return data
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  id: string,
  updates: Partial<CampaignFormData>,
): Promise<Campaign> {
  const updateData: CampaignUpdate = {}

  if (updates.topic !== undefined) updateData.topic = updates.topic
  if (updates.notes !== undefined) updateData.notes = updates.notes
  if (updates.resources !== undefined) updateData.resources = updates.resources

  const { data, error } = await supabase
    .from('campaigns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update campaign: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to update campaign: No data returned')
  }

  return data
}

/**
 * Update campaign content (auto-save)
 */
export async function updateCampaignContent(
  campaignId: string,
  updates: CampaignContentUpdate,
): Promise<CampaignContent> {
  const updateData: CampaignContentUpdate = {}

  if (updates.email_subject !== undefined) updateData.email_subject = updates.email_subject
  if (updates.email_body !== undefined) updateData.email_body = updates.email_body
  if (updates.whatsapp_text !== undefined) updateData.whatsapp_text = updates.whatsapp_text
  if (updates.facebook_text !== undefined) updateData.facebook_text = updates.facebook_text
  if (updates.images !== undefined) updateData.images = updates.images

  const { data, error } = await supabase
    .from('campaign_content')
    .update(updateData)
    .eq('campaign_id', campaignId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update campaign content: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to update campaign content: No data returned')
  }

  return data
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from('campaigns').delete().eq('id', id)

  if (error) {
    throw new Error(`Failed to delete campaign: ${error.message}`)
  }
}

/**
 * Trigger draft generation (fire-and-forget)
 */
export async function triggerDraftGeneration(campaignId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('draft_generate', {
    body: { campaign_id: campaignId },
  })

  // Fire-and-forget: content will appear via Realtime subscription
  if (error) console.warn('Draft generation trigger failed:', error.message)
}

/**
 * Approve campaign (sets status and timestamp)
 */
export async function approveCampaign(campaignId: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to approve campaign: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to approve campaign: No data returned')
  }

  return data
}

/**
 * Unapprove campaign (revert to draft)
 */
export async function uneapproveCampaign(campaignId: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update({
      status: 'draft',
      approved_at: null,
    })
    .eq('id', campaignId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to unapprove campaign: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to unapprove campaign: No data returned')
  }

  return data
}

/**
 * Regenerate draft (delete old content, trigger new generation)
 */
export async function regenerateDraft(campaignId: string): Promise<void> {
  // Delete old content
  const { error: deleteError } = await supabase
    .from('campaign_content')
    .delete()
    .eq('campaign_id', campaignId)

  if (deleteError) {
    throw new Error(`Failed to delete old content: ${deleteError.message}`)
  }

  // Trigger new generation
  await triggerDraftGeneration(campaignId)
}

/**
 * Upload campaign image to Supabase Storage
 */
export async function uploadCampaignImage(
  campaignId: string,
  file: File,
): Promise<string> {
  const { data: session, error: authError } = await supabase.auth.getSession()

  if (authError || !session.session?.user) {
    throw new Error('User must be authenticated to upload images')
  }

  const ownerId = session.session.user.id
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${ownerId}/${campaignId}/${fileName}`

  const { data, error } = await supabase.storage
    .from('campaign-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('campaign-images')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

/**
 * Delete campaign image from Supabase Storage
 */
export async function deleteCampaignImage(imageUrl: string): Promise<void> {
  // Extract path from URL
  const url = new URL(imageUrl)
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/campaign-images\/(.+)/)

  if (!pathMatch) {
    throw new Error('Invalid image URL')
  }

  const filePath = pathMatch[1]

  const { error } = await supabase.storage
    .from('campaign-images')
    .remove([filePath])

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`)
  }
}
```

**Step 2: Commit**

```bash
git add src/api/campaigns.ts
git commit -m "feat: add campaigns API layer with CRUD and image upload"
```

---

### Task 5: Implement campaigns queries layer

**Files:**
- Create: `src/queries/campaigns.ts`

**Step 1: Write Pinia Colada queries and mutations**

```typescript
import { useQuery, useMutation, useQueryCache } from '@pinia/colada'
import { ref, type MaybeRefOrGetter, toValue, onUnmounted } from 'vue'
import {
  getCampaigns,
  getCampaignById,
  getCampaignContent,
  createCampaign,
  updateCampaign,
  updateCampaignContent,
  deleteCampaign,
  triggerDraftGeneration,
  approveCampaign,
  uneapproveCampaign,
  regenerateDraft,
  uploadCampaignImage,
  deleteCampaignImage,
} from '@/api/campaigns'
import type { CampaignFormData, CampaignFilters, CampaignContentUpdate } from '@/types/campaign'
import { supabase } from '@/utils/supabase'

/**
 * Query for fetching all campaigns with optional filters
 */
export function useCampaignsQuery(filters?: MaybeRefOrGetter<CampaignFilters | undefined>) {
  return useQuery({
    key: () => ['campaigns', toValue(filters)],
    query: () => getCampaigns(toValue(filters)),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Query for fetching a single campaign by ID
 */
export function useCampaignQuery(id: MaybeRefOrGetter<string>) {
  return useQuery({
    key: () => ['campaign', toValue(id)],
    query: () => getCampaignById(toValue(id)),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Query for fetching campaign content with Realtime subscription
 */
export function useCampaignContentQuery(campaignId: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const id = toValue(campaignId)

  const query = useQuery({
    key: () => ['campaign-content', id],
    query: () => getCampaignContent(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Setup Realtime subscription for live updates
  const channel = supabase
    .channel(`campaign-content:${id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'campaign_content',
        filter: `campaign_id=eq.${id}`,
      },
      () => {
        // Invalidate query when content changes
        queryCache.invalidateQueries({ key: ['campaign-content', id] })
      },
    )
    .subscribe()

  // Cleanup subscription on unmount
  onUnmounted(() => {
    channel.unsubscribe()
  })

  return query
}

/**
 * Mutation for creating a new campaign
 */
export function useCreateCampaign() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (formData: CampaignFormData) => createCampaign(formData),
    onSuccess: () => {
      // Invalidate all campaigns queries to refetch the list
      queryCache.invalidateQueries({ key: ['campaigns'] })
    },
  })
}

/**
 * Mutation for updating an existing campaign
 */
export function useUpdateCampaign() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ id, data }: { id: string; data: Partial<CampaignFormData> }) =>
      updateCampaign(id, data),
    onSuccess: (updatedCampaign) => {
      // Invalidate all campaigns queries
      queryCache.invalidateQueries({ key: ['campaigns'] })
      // Invalidate the specific campaign query
      queryCache.invalidateQueries({ key: ['campaign', updatedCampaign.id] })
    },
  })
}

/**
 * Mutation for updating campaign content (auto-save)
 */
export function useUpdateCampaignContent() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: ({ campaignId, updates }: { campaignId: string; updates: CampaignContentUpdate }) =>
      updateCampaignContent(campaignId, updates),
    onSuccess: (_, variables) => {
      // Invalidate the specific content query
      queryCache.invalidateQueries({ key: ['campaign-content', variables.campaignId] })
    },
  })
}

/**
 * Mutation for deleting a campaign
 */
export function useDeleteCampaign() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (id: string) => deleteCampaign(id),
    onSuccess: () => {
      // Invalidate all campaigns queries to refetch the list
      queryCache.invalidateQueries({ key: ['campaigns'] })
    },
  })
}

/**
 * Mutation for triggering draft generation
 */
export function useTriggerDraftGeneration() {
  return useMutation({
    mutation: (campaignId: string) => triggerDraftGeneration(campaignId),
    // No onSuccess needed - Realtime subscription will update content query
  })
}

/**
 * Mutation for approving a campaign
 */
export function useApproveCampaign() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (campaignId: string) => approveCampaign(campaignId),
    onSuccess: (updatedCampaign) => {
      // Invalidate all campaigns queries
      queryCache.invalidateQueries({ key: ['campaigns'] })
      // Invalidate the specific campaign query
      queryCache.invalidateQueries({ key: ['campaign', updatedCampaign.id] })
    },
  })
}

/**
 * Mutation for unapproving a campaign (revert to draft)
 */
export function useUnapproveCampaign() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (campaignId: string) => uneapproveCampaign(campaignId),
    onSuccess: (updatedCampaign) => {
      // Invalidate all campaigns queries
      queryCache.invalidateQueries({ key: ['campaigns'] })
      // Invalidate the specific campaign query
      queryCache.invalidateQueries({ key: ['campaign', updatedCampaign.id] })
    },
  })
}

/**
 * Mutation for regenerating draft content
 */
export function useRegenerateDraft() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (campaignId: string) => regenerateDraft(campaignId),
    onSuccess: (_, campaignId) => {
      // Invalidate content query - Realtime will update when new content arrives
      queryCache.invalidateQueries({ key: ['campaign-content', campaignId] })
    },
  })
}

/**
 * Mutation for uploading campaign image
 */
export function useUploadCampaignImage() {
  return useMutation({
    mutation: ({ campaignId, file }: { campaignId: string; file: File }) =>
      uploadCampaignImage(campaignId, file),
  })
}

/**
 * Mutation for deleting campaign image
 */
export function useDeleteCampaignImage() {
  return useMutation({
    mutation: (imageUrl: string) => deleteCampaignImage(imageUrl),
  })
}

/**
 * Composable for managing campaign filters with reactive state
 */
export function useCampaignFilters() {
  const filters = ref<CampaignFilters>({
    status: undefined, // Show all by default
    search: '',
    sortBy: 'created_at',
    sortDirection: 'desc',
  })

  const setStatusFilter = (status: CampaignFilters['status']) => {
    filters.value = { ...filters.value, status }
  }

  const setSearchFilter = (search: string) => {
    filters.value = { ...filters.value, search }
  }

  const setSorting = (sortBy: CampaignFilters['sortBy'], sortDirection?: CampaignFilters['sortDirection']) => {
    filters.value = { ...filters.value, sortBy, sortDirection: sortDirection || 'desc' }
  }

  const clearFilters = () => {
    filters.value = {
      status: undefined,
      search: '',
      sortBy: 'created_at',
      sortDirection: 'desc',
    }
  }

  return {
    filters,
    setStatusFilter,
    setSearchFilter,
    setSorting,
    clearFilters,
  }
}
```

**Step 2: Commit**

```bash
git add src/queries/campaigns.ts
git commit -m "feat: add campaigns queries layer with Realtime subscriptions"
```

---

## Phase 3: Components (UI Building Blocks)

### Task 6: Implement ImageUploader component

**Files:**
- Create: `src/components/features/campaigns/ImageUploader.vue`

**Step 1: Write ImageUploader component**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUploadCampaignImage, useDeleteCampaignImage } from '@/queries/campaigns'

interface Props {
  campaignId: string
  modelValue: string[] // Array of image URLs
  maxImages?: number
  maxSizeMB?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxImages: 5,
  maxSizeMB: 5,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploadMutation = useUploadCampaignImage()
const deleteMutation = useDeleteCampaignImage()
const dragOver = ref(false)

const images = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const canAddMore = computed(() => images.value.length < props.maxImages)

function openFileDialog() {
  fileInput.value?.click()
}

async function handleFiles(files: FileList | null) {
  if (!files || !canAddMore.value) return

  const filesArray = Array.from(files)
  const validFiles = filesArray.filter((file) => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert(`${file.name} não é uma imagem válida`)
      return false
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > props.maxSizeMB) {
      alert(`${file.name} é muito grande (max ${props.maxSizeMB}MB)`)
      return false
    }

    return true
  })

  // Upload files
  for (const file of validFiles) {
    if (!canAddMore.value) break

    try {
      const url = await uploadMutation.mutateAsync({
        campaignId: props.campaignId,
        file,
      })
      images.value = [...images.value, url]
    } catch (error) {
      console.error('Upload failed:', error)
      alert(`Erro ao enviar ${file.name}`)
    }
  }
}

function handleFileInput(event: Event) {
  const target = event.target as HTMLInputElement
  handleFiles(target.files)
  // Reset input so same file can be selected again
  target.value = ''
}

function handleDrop(event: DragEvent) {
  dragOver.value = false
  handleFiles(event.dataTransfer?.files ?? null)
}

async function removeImage(imageUrl: string) {
  try {
    await deleteMutation.mutateAsync(imageUrl)
    images.value = images.value.filter((url) => url !== imageUrl)
  } catch (error) {
    console.error('Delete failed:', error)
    alert('Erro ao deletar imagem')
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Upload zone -->
    <div
      v-if="canAddMore"
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
      :class="dragOver ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-[var(--border)]'"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        class="hidden"
        @change="handleFileInput"
      />

      <button
        type="button"
        class="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90"
        :disabled="uploadMutation.status === 'pending'"
        @click="openFileDialog"
      >
        {{ uploadMutation.status === 'pending' ? 'Enviando...' : 'Adicionar Imagens' }}
      </button>

      <p class="mt-2 text-sm text-[var(--text-secondary)]">
        ou arraste imagens aqui
      </p>

      <p class="mt-1 text-xs text-[var(--text-secondary)]">
        Máx {{ maxImages }} imagens, {{ maxSizeMB }}MB cada (JPG, PNG, WEBP)
      </p>
    </div>

    <!-- Image grid -->
    <div v-if="images.length > 0" class="grid grid-cols-3 gap-4">
      <div
        v-for="(imageUrl, index) in images"
        :key="imageUrl"
        class="relative aspect-square rounded-lg overflow-hidden bg-[var(--background-secondary)] group"
      >
        <img
          :src="imageUrl"
          :alt="`Imagem ${index + 1}`"
          class="w-full h-full object-cover"
        />

        <!-- Delete button overlay -->
        <button
          type="button"
          class="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          :disabled="deleteMutation.status === 'pending'"
          @click="removeImage(imageUrl)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Count -->
    <p v-if="images.length > 0" class="text-sm text-[var(--text-secondary)]">
      {{ images.length }} / {{ maxImages }} imagens
    </p>
  </div>
</template>
```

**Step 2: Commit**

```bash
git add src/components/features/campaigns/ImageUploader.vue
git commit -m "feat: add ImageUploader component with drag-drop support"
```

---

### Task 7: Implement CampaignHeader component

**Files:**
- Create: `src/components/features/campaigns/CampaignHeader.vue`

**Step 1: Write CampaignHeader component**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Campaign } from '@/types/database'

interface Props {
  campaign: Campaign
  generationStatus?: 'idle' | 'generating' | 'success' | 'error'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  regenerate: []
  delete: []
}>()

const statusConfig = computed(() => {
  if (props.generationStatus === 'generating') {
    return {
      label: 'Gerando...',
      color: 'bg-amber-500',
      animate: true,
    }
  }

  if (props.generationStatus === 'error') {
    return {
      label: 'Erro ⚠',
      color: 'bg-red-500',
      animate: false,
    }
  }

  switch (props.campaign.status) {
    case 'approved':
      return {
        label: 'Aprovada ✓',
        color: 'bg-blue-500',
        animate: false,
      }
    case 'sent':
      return {
        label: 'Enviada ✓',
        color: 'bg-green-500',
        animate: false,
      }
    case 'sending':
      return {
        label: 'Enviando...',
        color: 'bg-blue-500',
        animate: true,
      }
    case 'failed':
      return {
        label: 'Falhou ⚠',
        color: 'bg-red-500',
        animate: false,
      }
    default:
      return {
        label: 'Rascunho',
        color: 'bg-gray-500',
        animate: false,
      }
  }
})

const formattedDate = computed(() => {
  const date = new Date(props.campaign.created_at)
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
})
</script>

<template>
  <div class="flex flex-col gap-4 pb-4 border-b border-[var(--border)]">
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl font-bold text-[var(--text-primary)] truncate">
          {{ campaign.topic }}
        </h1>
        <p class="mt-1 text-sm text-[var(--text-secondary)]">
          Criada em {{ formattedDate }}
        </p>
      </div>

      <!-- Status badge -->
      <span
        class="px-3 py-1 text-sm font-medium text-white rounded-full whitespace-nowrap"
        :class="[statusConfig.color, statusConfig.animate ? 'animate-pulse' : '']"
      >
        {{ statusConfig.label }}
      </span>
    </div>

    <!-- Actions dropdown -->
    <div class="flex gap-2">
      <button
        v-if="campaign.status === 'draft'"
        type="button"
        class="text-sm text-[var(--primary)] hover:underline"
        @click="emit('regenerate')"
      >
        Regenerar
      </button>

      <button
        v-if="campaign.status === 'draft' || campaign.status === 'approved'"
        type="button"
        class="text-sm text-red-500 hover:underline"
        @click="emit('delete')"
      >
        Excluir
      </button>
    </div>
  </div>
</template>
```

**Step 2: Commit**

```bash
git add src/components/features/campaigns/CampaignHeader.vue
git commit -m "feat: add CampaignHeader component with status badges"
```

---

### Task 8: Implement CampaignEditor component

**Files:**
- Create: `src/components/features/campaigns/CampaignEditor.vue`

**Step 1: Write CampaignEditor component with auto-save**

```vue
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { CampaignContent } from '@/types/database'
import { useUpdateCampaignContent } from '@/queries/campaigns'
import ImageUploader from './ImageUploader.vue'

interface Props {
  campaignId: string
  content: CampaignContent
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'copy': [text: string, type: string]
}>()

const updateMutation = useUpdateCampaignContent()
const saving = ref(false)
const lastSaved = ref<Date | null>(null)

// Local state for editing
const emailSubject = ref(props.content.email_subject)
const emailBody = ref(props.content.email_body)
const whatsappText = ref(props.content.whatsapp_text)
const facebookText = ref(props.content.facebook_text)
const images = ref<string[]>(props.content.images || [])

// Watch for external content changes (e.g., regeneration)
watch(() => props.content, (newContent) => {
  emailSubject.value = newContent.email_subject
  emailBody.value = newContent.email_body
  whatsappText.value = newContent.whatsapp_text
  facebookText.value = newContent.facebook_text
  images.value = newContent.images || []
}, { deep: true })

// Auto-save with debounce
const saveContent = useDebounceFn(async () => {
  try {
    saving.value = true
    await updateMutation.mutateAsync({
      campaignId: props.campaignId,
      updates: {
        email_subject: emailSubject.value,
        email_body: emailBody.value,
        whatsapp_text: whatsappText.value,
        facebook_text: facebookText.value,
        images: images.value,
      },
    })
    lastSaved.value = new Date()
  } catch (error) {
    console.error('Auto-save failed:', error)
    alert('Erro ao salvar. Tentando novamente...')
    // Retry after 2s
    setTimeout(saveContent, 2000)
  } finally {
    saving.value = false
  }
}, 500)

// Watch for changes and trigger auto-save
watch([emailSubject, emailBody, whatsappText, facebookText, images], () => {
  saveContent()
})

const saveIndicator = computed(() => {
  if (saving.value) return 'Salvando...'
  if (lastSaved.value) {
    const seconds = Math.floor((Date.now() - lastSaved.value.getTime()) / 1000)
    if (seconds < 5) return 'Salvo ✓'
    return `Salvo há ${seconds}s`
  }
  return ''
})

function copyToClipboard(text: string, type: string) {
  navigator.clipboard.writeText(text)
  emit('copy', text, type)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Save indicator -->
    <div v-if="saveIndicator" class="text-sm text-[var(--text-secondary)] text-right">
      {{ saveIndicator }}
    </div>

    <!-- Images section -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">Imagens</h2>
      <ImageUploader v-model="images" :campaign-id="campaignId" />
    </section>

    <!-- Email section -->
    <section class="space-y-3">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">Email</h2>

      <div>
        <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Assunto
        </label>
        <input
          v-model="emailSubject"
          type="text"
          class="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Corpo do Email
        </label>
        <textarea
          v-model="emailBody"
          rows="12"
          class="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
        />
        <p class="mt-1 text-xs text-[var(--text-secondary)]">
          {{ emailBody.length }} caracteres
        </p>
      </div>
    </section>

    <!-- WhatsApp section -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-[var(--text-primary)]">WhatsApp</h2>
        <button
          type="button"
          class="text-sm text-[var(--primary)] hover:underline"
          @click="copyToClipboard(whatsappText, 'WhatsApp')"
        >
          Copiar
        </button>
      </div>

      <textarea
        v-model="whatsappText"
        rows="6"
        class="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
      />
      <p class="text-xs text-[var(--text-secondary)]">
        {{ whatsappText.length }} caracteres
        <span v-if="whatsappText.length > 1600" class="text-amber-500">
          (recomendado: ~1600)
        </span>
      </p>
    </section>

    <!-- Facebook section -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-[var(--text-primary)]">Facebook</h2>
        <button
          type="button"
          class="text-sm text-[var(--primary)] hover:underline"
          @click="copyToClipboard(facebookText, 'Facebook')"
        >
          Copiar
        </button>
      </div>

      <textarea
        v-model="facebookText"
        rows="6"
        class="w-full px-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
      />
      <p class="text-xs text-[var(--text-secondary)]">
        {{ facebookText.length }} caracteres
      </p>
    </section>
  </div>
</template>
```

**Step 2: Install @vueuse/core for debounce**

Run: `bun add @vueuse/core`

**Step 3: Commit**

```bash
git add src/components/features/campaigns/CampaignEditor.vue package.json bun.lockb
git commit -m "feat: add CampaignEditor with auto-save and copy buttons"
```

---

### Task 9: Implement CampaignActions component

**Files:**
- Create: `src/components/features/campaigns/CampaignActions.vue`

**Step 1: Write CampaignActions component**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { Campaign } from '@/types/database'

interface Props {
  campaign: Campaign
  hasContent: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  approve: []
  unapprove: []
  send: []
}>()

const showApprovalModal = ref(false)

function handleApprove() {
  showApprovalModal.value = true
}

function confirmApproval() {
  showApprovalModal.value = false
  emit('approve')
}

function handleUnapprove() {
  if (confirm('Tem certeza que deseja voltar para rascunho?')) {
    emit('unapprove')
  }
}
</script>

<template>
  <div class="sticky bottom-0 bg-white border-t border-[var(--border)] p-4 flex gap-3">
    <!-- Draft state -->
    <template v-if="campaign.status === 'draft'">
      <button
        type="button"
        class="flex-1 px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasContent"
        @click="handleApprove"
      >
        Aprovar Campanha
      </button>
    </template>

    <!-- Approved state -->
    <template v-else-if="campaign.status === 'approved'">
      <button
        type="button"
        class="px-6 py-3 border border-[var(--border)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--background-secondary)]"
        @click="handleUnapprove"
      >
        Editar
      </button>

      <button
        type="button"
        class="flex-1 px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90"
        @click="emit('send')"
      >
        Enviar para Missionários
      </button>
    </template>

    <!-- Sent/Sending state -->
    <template v-else-if="campaign.status === 'sent' || campaign.status === 'sending'">
      <div class="flex-1 text-center text-[var(--text-secondary)]">
        {{ campaign.status === 'sending' ? 'Enviando...' : 'Campanha enviada' }}
      </div>
    </template>

    <!-- Approval modal -->
    <Teleport to="body">
      <div
        v-if="showApprovalModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
        @click.self="showApprovalModal = false"
      >
        <div class="bg-white rounded-t-2xl sm:rounded-2xl p-6 max-w-md w-full mx-4 sm:mx-0 animate-slide-up">
          <h3 class="text-xl font-bold text-[var(--text-primary)] mb-2">
            Aprovar Campanha?
          </h3>
          <p class="text-[var(--text-secondary)] mb-6">
            Depois de aprovada, você poderá enviá-la aos missionários. Você ainda pode editar depois se necessário.
          </p>

          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--background-secondary)]"
              @click="showApprovalModal = false"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="flex-1 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90"
              @click="confirmApproval"
            >
              Aprovar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
```

**Step 2: Commit**

```bash
git add src/components/features/campaigns/CampaignActions.vue
git commit -m "feat: add CampaignActions with approval workflow"
```

---

## Phase 4: Pages

### Task 10: Implement campaign creation page

**Files:**
- Modify: `src/pages/campaigns/new.vue`

**Step 1: Write campaign creation form**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCreateCampaign, useTriggerDraftGeneration } from '@/queries/campaigns'
import { useStyleEmailCountQuery } from '@/queries/style-library'
import type { CampaignFormData } from '@/types/campaign'

const router = useRouter()
const createMutation = useCreateCampaign()
const triggerGeneration = useTriggerDraftGeneration()
const { data: emailCount } = useStyleEmailCountQuery()

const formData = ref<CampaignFormData>({
  topic: '',
  notes: '',
  resources: '',
})

const errors = ref<Record<string, string>>({})

const canSubmit = computed(() => {
  return formData.value.topic.length >= 3 && formData.value.notes.length >= 20
})

const needsMoreEmails = computed(() => {
  return (emailCount.value ?? 0) < 3
})

function validateForm(): boolean {
  errors.value = {}

  if (formData.value.topic.length < 3) {
    errors.value.topic = 'Tema deve ter pelo menos 3 caracteres'
  }

  if (formData.value.notes.length < 20) {
    errors.value.notes = 'Notas devem ter pelo menos 20 caracteres'
  }

  return Object.keys(errors.value).length === 0
}

async function handleSubmit() {
  if (!validateForm() || !canSubmit.value) return

  try {
    const campaign = await createMutation.mutateAsync(formData.value)

    // Trigger draft generation (fire-and-forget)
    triggerGeneration.mutate(campaign.id)

    // Navigate to campaign editor
    router.push(`/campaigns/${campaign.id}`)
  } catch (error) {
    console.error('Failed to create campaign:', error)
    alert('Erro ao criar campanha. Tente novamente.')
  }
}
</script>

<template>
  <div class="min-h-screen bg-[var(--background)] pb-24">
    <div class="max-w-2xl mx-auto p-6">
      <h1 class="text-2xl font-bold text-[var(--text-primary)] mb-2">
        Nova Campanha
      </h1>
      <p class="text-[var(--text-secondary)] mb-6">
        Defina o tema da semana e adicione suas ideias para gerar o rascunho da campanha.
      </p>

      <!-- Warning if insufficient style library -->
      <div
        v-if="needsMoreEmails"
        class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg"
      >
        <p class="text-sm text-amber-800 mb-2">
          ⚠️ Você precisa adicionar pelo menos 3 emails no estilo antes de criar campanhas.
        </p>
        <router-link
          to="/style-library"
          class="text-sm text-amber-900 font-medium hover:underline"
        >
          Ir para Biblioteca de Estilo →
        </router-link>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Topic -->
        <div>
          <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Tema da Semana *
          </label>
          <input
            v-model="formData.topic"
            type="text"
            placeholder="Ex: Fé em tempos difíceis"
            class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            :class="errors.topic ? 'border-red-500' : 'border-[var(--border)]'"
          />
          <p v-if="errors.topic" class="mt-1 text-sm text-red-500">
            {{ errors.topic }}
          </p>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Suas Ideias *
          </label>
          <textarea
            v-model="formData.notes"
            rows="6"
            placeholder="Suas ideias, contexto, mensagem principal que você quer transmitir..."
            class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
            :class="errors.notes ? 'border-red-500' : 'border-[var(--border)]'"
          />
          <div class="flex justify-between mt-1">
            <p v-if="errors.notes" class="text-sm text-red-500">
              {{ errors.notes }}
            </p>
            <p class="text-xs text-[var(--text-secondary)] ml-auto">
              {{ formData.notes.length }} caracteres (mín. 20)
            </p>
          </div>
        </div>

        <!-- Resources -->
        <div>
          <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Recursos (opcional)
          </label>
          <textarea
            v-model="formData.resources"
            rows="4"
            placeholder="Cole links de discursos, escrituras, citações..."
            class="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
          />
          <p class="mt-1 text-xs text-[var(--text-secondary)]">
            Ex: https://www.churchofjesuschrist.org/study/general-conference/...
          </p>
        </div>

        <!-- Submit button -->
        <button
          type="submit"
          class="w-full px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canSubmit || needsMoreEmails || createMutation.status === 'pending'"
        >
          {{ createMutation.status === 'pending' ? 'Criando...' : 'Criar Campanha' }}
        </button>
      </form>
    </div>
  </div>
</template>
```

**Step 2: Commit**

```bash
git add src/pages/campaigns/new.vue
git commit -m "feat: implement campaign creation page with validation"
```

---

### Task 11: Implement campaign editor page

**Files:**
- Modify: `src/pages/campaigns/[id].vue`

**Step 1: Write campaign editor page**

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useCampaignQuery,
  useCampaignContentQuery,
  useApproveCampaign,
  useUnapproveCampaign,
  useDeleteCampaign,
  useRegenerateDraft,
} from '@/queries/campaigns'
import CampaignHeader from '@/components/features/campaigns/CampaignHeader.vue'
import CampaignEditor from '@/components/features/campaigns/CampaignEditor.vue'
import CampaignActions from '@/components/features/campaigns/CampaignActions.vue'

const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string

const { data: campaign, status: campaignStatus } = useCampaignQuery(campaignId)
const { data: content, status: contentStatus } = useCampaignContentQuery(campaignId)
const approveMutation = useApproveCampaign()
const unapproveMutation = useUnapproveCampaign()
const deleteMutation = useDeleteCampaign()
const regenerateMutation = useRegenerateDraft()

const showToast = ref(false)
const toastMessage = ref('')

const generationStatus = computed<'idle' | 'generating' | 'success' | 'error'>(() => {
  if (campaign.value?.status !== 'draft') return 'idle'
  if (contentStatus.value === 'pending') return 'generating'
  if (content.value) return 'success'
  if (contentStatus.value === 'error') return 'error'
  return 'generating'
})

const hasContent = computed(() => !!content.value)

async function handleApprove() {
  if (!campaign.value) return

  try {
    await approveMutation.mutateAsync(campaign.value.id)
  } catch (error) {
    console.error('Failed to approve:', error)
    alert('Erro ao aprovar campanha')
  }
}

async function handleUnapprove() {
  if (!campaign.value) return

  try {
    await unapproveMutation.mutateAsync(campaign.value.id)
  } catch (error) {
    console.error('Failed to unapprove:', error)
    alert('Erro ao voltar para rascunho')
  }
}

async function handleDelete() {
  if (!campaign.value) return

  if (!confirm('Tem certeza que deseja excluir esta campanha?')) return

  try {
    await deleteMutation.mutateAsync(campaign.value.id)
    router.push('/campaigns')
  } catch (error) {
    console.error('Failed to delete:', error)
    alert('Erro ao excluir campanha')
  }
}

async function handleRegenerate() {
  if (!campaign.value) return

  if (!confirm('Tem certeza que deseja regenerar o rascunho? O conteúdo atual será perdido.')) return

  try {
    await regenerateMutation.mutateAsync(campaign.value.id)
  } catch (error) {
    console.error('Failed to regenerate:', error)
    alert('Erro ao regenerar rascunho')
  }
}

function handleSend() {
  // Epic 6 implementation
  alert('Funcionalidade de envio será implementada no Epic 6')
}

function handleCopy(text: string, type: string) {
  toastMessage.value = `${type} copiado!`
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}
</script>

<template>
  <div class="min-h-screen bg-[var(--background)] pb-24">
    <div class="max-w-4xl mx-auto p-6">
      <!-- Loading state -->
      <div v-if="campaignStatus === 'pending'" class="text-center py-12">
        <p class="text-[var(--text-secondary)]">Carregando campanha...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="campaignStatus === 'error'" class="text-center py-12">
        <p class="text-red-500">Erro ao carregar campanha</p>
        <button
          type="button"
          class="mt-4 text-[var(--primary)] hover:underline"
          @click="router.push('/campaigns')"
        >
          Voltar para campanhas
        </button>
      </div>

      <!-- Loaded -->
      <template v-else-if="campaign">
        <CampaignHeader
          :campaign="campaign"
          :generation-status="generationStatus"
          @regenerate="handleRegenerate"
          @delete="handleDelete"
        />

        <div class="mt-8">
          <!-- Generation in progress -->
          <div v-if="generationStatus === 'generating'" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[var(--primary)] border-t-transparent mb-4" />
            <p class="text-[var(--text-secondary)]">Gerando rascunho...</p>
            <p class="text-sm text-[var(--text-secondary)] mt-2">Isso pode levar até 30 segundos</p>
          </div>

          <!-- Generation error -->
          <div v-else-if="generationStatus === 'error'" class="text-center py-12">
            <p class="text-red-500 mb-4">Erro ao gerar rascunho</p>
            <button
              type="button"
              class="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90"
              @click="handleRegenerate"
            >
              Tentar Novamente
            </button>
          </div>

          <!-- Content editor -->
          <CampaignEditor
            v-else-if="content"
            :campaign-id="campaignId"
            :content="content"
            @copy="handleCopy"
          />
        </div>

        <!-- Actions -->
        <CampaignActions
          :campaign="campaign"
          :has-content="hasContent"
          @approve="handleApprove"
          @unapprove="handleUnapprove"
          @send="handleSend"
        />
      </template>

      <!-- Toast notification -->
      <Teleport to="body">
        <div
          v-if="showToast"
          class="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 text-white rounded-lg shadow-lg animate-fade-in"
        >
          {{ toastMessage }}
        </div>
      </Teleport>
    </div>
  </div>
</template>
```

**Step 2: Commit**

```bash
git add src/pages/campaigns/[id].vue
git commit -m "feat: implement campaign editor page with live updates"
```

---

## Phase 5: Edge Function

### Task 12: Implement draft_generate Edge Function

**Files:**
- Create: `supabase/functions/draft_generate/index.ts`

**Step 1: Write draft_generate Edge Function**

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

interface GenerateRequest {
  campaign_id: string
}

interface StyleMatch {
  subject: string
  body: string
  similarity: number
}

interface GeneratedContent {
  email_subject: string
  email_body: string
  whatsapp_text: string
  facebook_text: string
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
      },
    })
  }

  try {
    // Verify JWT and get owner_id
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')

    // User client for auth verification
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const ownerId = user.id

    // Admin client for DB operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Parse request
    const body: GenerateRequest = await req.json()
    const { campaign_id } = body

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'Missing campaign_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch campaign (verify ownership)
    const { data: campaign, error: campaignError } = await adminClient
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('owner_id', ownerId)
      .single()

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Call style_match for RAG retrieval
    const styleMatchResponse = await adminClient.functions.invoke('style_match', {
      body: { query: campaign.topic, top_k: 6 },
    })

    if (styleMatchResponse.error) {
      console.error('Style match error:', styleMatchResponse.error)
      return new Response(JSON.stringify({ error: 'Insufficient style library' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const styleMatches: StyleMatch[] = styleMatchResponse.data.matches || []

    if (styleMatches.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Precisa de pelo menos 3 emails no estilo' }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Fetch style profile
    const { data: styleProfile } = await adminClient
      .from('style_profile')
      .select('profile_json')
      .eq('owner_id', ownerId)
      .maybeSingle()

    // Build generation prompt
    const styleExamplesText = styleMatches
      .map(
        (match, idx) =>
          `Exemplo ${idx + 1} (similaridade: ${(match.similarity * 100).toFixed(0)}%):\nAssunto: ${match.subject}\n\n${match.body}`,
      )
      .join('\n\n---\n\n')

    const profileText = styleProfile?.profile_json
      ? JSON.stringify(styleProfile.profile_json, null, 2)
      : 'Não disponível'

    const resourcesText = campaign.resources || 'Nenhum recurso fornecido'

    const imagesNote =
      campaign.images && campaign.images.length > 0
        ? `\n\nA usuária incluiu ${campaign.images.length} imagem(ns) na campanha. No corpo do email, inclua referências naturais como "[Imagem 1]", "[Imagem 2]", etc. Exemplo: "Como você pode ver na imagem acima..." ou "A foto que anexei mostra..."`
        : ''

    const prompt = `Você é um assistente que ajuda a escrever emails missionários semanais em português brasileiro.

OBJETIVO: Gerar conteúdo para uma campanha semanal com base no tema fornecido pela usuária, mantendo a voz autêntica dela.

TEMA: ${campaign.topic}

IDEIAS DA USUÁRIA:
${campaign.notes}

RECURSOS FORNECIDOS:
${resourcesText}${imagesNote}

PERFIL DE ESTILO (análise da voz da usuária):
${profileText}

EXEMPLOS DE EMAILS ANTERIORES (mais similares ao tema):
${styleExamplesText}

INSTRUÇÕES:
1. Escreva no estilo da usuária baseando-se no perfil e exemplos
2. Use tom conversacional, caloroso e pessoal (não formal)
3. Incorpore os recursos fornecidos naturalmente
4. Para o email: mantenha a estrutura que ela costuma usar
5. Para WhatsApp: mais curto, casual, pode usar emojis
6. Para Facebook: público-geral, encorajador, apropriado para rede social

FORMATO DE SAÍDA (JSON):
{
  "email_subject": "assunto do email",
  "email_body": "corpo do email (pode ter várias linhas)",
  "whatsapp_text": "mensagem para WhatsApp",
  "facebook_text": "post para Facebook"
}`

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente que gera conteúdo para campanhas missionárias em português brasileiro. Sempre retorne JSON válido.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI error:', errorText)
      return new Response(JSON.stringify({ error: 'Generation failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const openaiData = await openaiResponse.json()
    const generatedContent: GeneratedContent = JSON.parse(
      openaiData.choices[0].message.content,
    )

    // Insert campaign_content
    const { error: insertError } = await adminClient.from('campaign_content').insert({
      campaign_id: campaign.id,
      email_subject: generatedContent.email_subject,
      email_body: generatedContent.email_body,
      whatsapp_text: generatedContent.whatsapp_text,
      facebook_text: generatedContent.facebook_text,
      images: campaign.images || [],
    })

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to save content' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        tokens_used: openaiData.usage.total_tokens,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

**Step 2: Deploy Edge Function**

Run: `bunx supabase functions deploy draft_generate --no-verify-jwt`

Expected: Function deployed successfully

**Step 3: Verify function exists**

Run: Check via Supabase MCP or dashboard
Expected: `draft_generate` function listed

**Step 4: Commit**

```bash
git add supabase/functions/draft_generate/index.ts
git commit -m "feat: implement draft_generate Edge Function with RAG"
```

---

## Phase 6: Integration & Testing

### Task 13: End-to-end testing with agent-browser

**Testing Checklist:**

1. **Campaign creation flow:**
   - Navigate to `/campaigns/new`
   - Fill form: topic (min 3), notes (min 20), resources (optional)
   - Submit → redirects to `/campaigns/:id`
   - Verify loading state appears ("Gerando rascunho...")

2. **Generation completion:**
   - Wait for content to appear (max 30s)
   - Verify status badge changes to "Pronto ✓"
   - Verify all four content sections populated (email, WhatsApp, Facebook)

3. **Content editing:**
   - Edit email subject → verify auto-save indicator
   - Edit email body → verify saves successfully
   - Copy WhatsApp text → verify toast notification

4. **Image upload:**
   - Click "Adicionar Imagens"
   - Upload test image (< 5MB)
   - Verify thumbnail appears
   - Delete image → verify removed

5. **Approval flow:**
   - Click "Aprovar Campanha"
   - Verify modal appears with confirmation text
   - Confirm → verify status badge changes to "Aprovada ✓"
   - Click "Editar" → verify reverts to draft

6. **Error recovery:**
   - Test with insufficient style library (< 3 emails)
   - Verify error message and link to style library
   - Test regeneration → verify old content replaced

**Step 1: Run browser tests**

Manual testing with agent-browser recommended for Epic 5.

**Step 2: Document any bugs found**

Create issues for any bugs discovered during testing.

**Step 3: Commit any fixes**

```bash
git add .
git commit -m "fix: [describe bug fix]"
```

---

## Completion Checklist

Epic 5 is complete when:

- ✅ Schema migrations applied (images, resources columns)
- ✅ Supabase Storage bucket configured with RLS
- ✅ Campaign types defined
- ✅ API layer implemented with all CRUD operations
- ✅ Queries layer implemented with Realtime subscriptions
- ✅ ImageUploader component working with drag-drop
- ✅ CampaignHeader component with status badges
- ✅ CampaignEditor component with auto-save
- ✅ CampaignActions component with approval modal
- ✅ Campaign creation page with validation
- ✅ Campaign editor page with live updates
- ✅ draft_generate Edge Function deployed and working
- ✅ End-to-end flow tested in browser
- ✅ All critical bugs fixed
- ✅ Epic 6 docs updated for HTML email requirement

---

## Next Steps

After Epic 5 completion:
1. Commit all remaining changes
2. Update session notes (`.claude/sessions/2026-03-05-1430-epic5.md`)
3. Update `documentation/implementation_plan.md` with Epic 5 completion notes
4. Begin Epic 6: Gmail Integration and Send Orchestration
