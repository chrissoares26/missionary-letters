# Epic 5: Campaign Draft Generation Workflow - Design

**Date:** 2026-03-05
**Epic:** Epic 5 - Campaign Draft Generation Workflow
**Stories:** 5.1, 5.2, 5.3, 5.4

## Overview

Complete user flow for campaign content generation, editing, and approval with RAG-powered draft generation and image upload support.

## Key Decisions

1. **Auto-generation on creation:** Campaign content generates immediately after creation (fire-and-forget pattern)
2. **Separate queries:** Campaign metadata and content fetched separately for clean Realtime updates
3. **Mandatory notes:** User must provide notes (min 20 chars) for voice consistency
4. **Image upload support:** Users can upload up to 5 images per campaign (Epic 6 requires HTML emails)
5. **Auto-save:** Content edits auto-save with 500ms debounce

## Architecture

### Campaign Lifecycle States

```
draft → approved → sending → sent/failed
  ↑         ↓
  └─ edit ─┘
```

- `draft` - Initial state, content generating or ready for editing
- `approved` - User approved, ready to send (sets `approved_at` timestamp)
- `sending` - Send in progress (Epic 6)
- `sent` - All emails sent successfully (Epic 6)
- `failed` - Send failed (Epic 6)

### Data Flow

```
/campaigns/new
  ↓ user enters: topic (required), notes (required), resources (optional), images (optional)
  ↓ create campaigns record (status='draft')
  ↓ upload images to Storage (if provided)
  ↓ navigate to /campaigns/:id
  ↓ auto-trigger draft_generate Edge Function (fire-and-forget)
  ↓ show loading state: "Gerando rascunho..."
  ↓ Realtime subscription listens for campaign_content insert
  ↓ draft_generate calls style_match (RAG retrieval)
  ↓ draft_generate calls OpenAI with context
  ↓ draft_generate inserts campaign_content
  ↓ Realtime fires, content appears in UI
  ↓ status badge: "Pronto ✓"
```

## API Layer (src/api/campaigns.ts)

### Core CRUD
- `getCampaigns(filters?: { status?: CampaignStatus })` - List campaigns with optional status filter
- `getCampaignById(id: string)` - Fetch single campaign metadata
- `createCampaign(formData: CampaignFormData)` - Create new campaign with topic, notes, resources, images
- `updateCampaign(id: string, updates: Partial<Campaign>)` - Update campaign metadata
- `deleteCampaign(id: string)` - Delete campaign (hard delete if draft, block if sent)

### Content Operations
- `getCampaignContent(campaignId: string)` - Fetch campaign content
- `updateCampaignContent(campaignId: string, content: Partial<CampaignContent>)` - Update email/whatsapp/facebook content

### Actions
- `triggerDraftGeneration(campaignId: string)` - Fire-and-forget call to draft_generate Edge Function
- `approveCampaign(campaignId: string)` - Set status='approved', approved_at=now()
- `regenerateDraft(campaignId: string)` - Delete old content, trigger new generation

### Image Upload
- `uploadCampaignImage(campaignId: string, file: File)` - Upload to Supabase Storage, return URL
- `deleteCampaignImage(campaignId: string, imageUrl: string)` - Delete from Storage

## Queries Layer (src/queries/campaigns.ts)

### Queries with Pinia Colada
- `useCampaignsQuery(filters?)` - List view with status filter, 5min stale time
- `useCampaignQuery(id)` - Single campaign metadata, 5min stale time
- `useCampaignContentQuery(campaignId)` - Content only, includes Realtime subscription

### Mutations
- `useCreateCampaign()` - Invalidates campaigns list
- `useUpdateCampaign()` - Invalidates specific campaign + list
- `useUpdateCampaignContent()` - Invalidates content query (auto-save uses this)
- `useApproveCampaign()` - Updates status + timestamp, invalidates campaign
- `useDeleteCampaign()` - Invalidates campaigns list
- `useRegenerateDraft()` - Deletes content, triggers generation

**Separate queries rationale:**
- Cleaner Realtime subscription (subscribe to content table only)
- Surgical cache invalidation (edit content → only invalidate content query)
- Natural async loading states (campaign loads instantly, content "generating")
- Better represents reality: metadata vs async-generated content

## Components

### src/pages/campaigns/new.vue
Campaign creation form with:
- Topic input (required, min 3 chars) - "Tema da semana"
- Notes textarea (required, min 20 chars) - "Suas ideias, contexto, mensagem principal"
- Resources textarea (optional) - "Cole links de discursos, escrituras, citações"
- Image uploader (optional, max 5 images, 5MB each) - "Adicionar imagens"
- Submit button: "Criar Campanha"
- Validation errors shown inline
- Mobile-first: large inputs, bottom-sticky submit button

### src/pages/campaigns/[id].vue
Main campaign editor with three states:
1. **Generating** (no content yet): Loading skeleton + "Gerando rascunho..." badge
2. **Draft/Approved**: Full editor with content + actions
3. **Error**: Error message + "Tentar Novamente" button

Uses: `CampaignHeader`, `CampaignEditor`, `CampaignActions`

Realtime subscription on mount for live content updates. Auto-scrolls to content when generation completes.

### src/components/features/campaigns/CampaignHeader.vue
- Displays: topic, creation date, status badge
- Status badges (following Epic 4 pattern):
  - "Gerando..." (amber, animated pulse)
  - "Pronto ✓" (green)
  - "Erro ⚠" (red)
  - "Aprovada ✓" (blue)
- Action dropdown: "Regenerar", "Excluir"

### src/components/features/campaigns/CampaignEditor.vue
Four editable sections with card-based layout:
1. **Imagens** - Thumbnail grid at top, add/remove images
2. **Email** - Subject + body (textareas, auto-expanding), character count
3. **WhatsApp** - Text + copy button, ~1600 char recommendation
4. **Facebook** - Text + copy button

Auto-save on blur with 500ms debounce. "Salvando..." indicator during save. Error toast if save fails (3 retry attempts).

### src/components/features/campaigns/CampaignActions.vue
Bottom-sticky action bar (mobile) or button group (desktop).

Conditional buttons based on status:
- **Draft**: "Aprovar Campanha" (primary), "Regenerar" (secondary)
- **Approved**: "Enviar para Missionários" (primary, Epic 6), "Editar" (secondary, reverts to draft)

Approval flow:
- Shows confirmation modal
- Modal text: "Aprovar campanha? Depois de aprovada, você poderá enviá-la aos missionários."
- Confirms content exists before allowing approval

### src/components/features/campaigns/ImageUploader.vue
- File input + drag-drop zone
- Preview thumbnails (grid layout, 100x100px)
- Upload progress indicator per image
- Delete button per thumbnail (trash icon overlay on hover)
- Max 5 images enforced on frontend
- File validation: jpg, png, webp only, max 5MB per image
- Uploads to: `campaign-images/{owner_id}/{campaign_id}/{filename}`
- Returns array of public URLs

## Edge Function: draft_generate

### supabase/functions/draft_generate/index.ts

**Input (POST body):**
```typescript
{
  campaign_id: string
}
```

**Process:**
1. Verify JWT, extract owner_id
2. Fetch campaign by ID (validate ownership, return 403 if not owner)
3. Check style library threshold: call `style_match` with topic, expect min 3 emails (return 422 if insufficient)
4. Fetch top-6 style examples via `style_match` Edge Function
5. Fetch `style_profile` for owner_id
6. Build OpenAI generation prompt with:
   - campaign.topic + campaign.notes
   - campaign.resources (if provided)
   - Image URLs from campaign (if uploaded) - instruct AI to reference naturally
   - style_profile JSON (tone, phrases, structure, etc)
   - Top-6 similar email examples (full subject + body)
   - Target language: pt-BR
7. Call OpenAI `gpt-4o` with structured JSON output:
   ```typescript
   {
     email_subject: string
     email_body: string  // references "[Imagem 1]", "[Imagem 2]" where images uploaded
     whatsapp_text: string
     facebook_text: string
   }
   ```
8. Insert into `campaign_content` table (triggers Realtime subscription in frontend)
9. Return success response with token usage stats

**Prompt engineering guidelines:**
- Emphasize "write in the user's voice based on style profile"
- Include image references naturally: "Como você pode ver na foto..." or "A imagem mostra..."
- For resources: "Incorporate this conference talk..." or "Reference this scripture..."
- Keep email body conversational, warm, personal (not formal)
- WhatsApp: shorter, more casual, emoji-friendly
- Facebook: public-friendly, more general, encouraging

**Error handling:**
- 403: Not campaign owner
- 404: Campaign not found
- 422: Insufficient style library (< 3 emails) - "Precisa de pelo menos 3 emails no estilo"
- 504: OpenAI timeout (> 30s) - "Geração demorou muito, tente novamente"
- 500: Other errors - log details, return generic message

**verify_jwt:** `false` (manual dual-client pattern like Epic 4)

## Approval Workflow (Story 5.4)

### Frontend Guard
- "Aprovar Campanha" button disabled until content exists
- Shows confirmation modal with content preview
- Modal actions: "Cancelar", "Aprovar" (primary)

### Backend (approveCampaign API)
1. Verify campaign ownership
2. Verify campaign_content exists (reject if no content)
3. Update campaigns: `status='approved'`, `approved_at=now()`
4. Frontend invalidates queries, UI updates to show "Aprovada ✓" badge
5. "Enviar" button now enabled (Epic 6)

### State Transitions
- `draft` → `approved` (approval action)
- `approved` → `draft` (edit action, clears approved_at)
- `approved` → `sending` → `sent`/`failed` (Epic 6)

## Schema Migrations

### Add images and resources columns
```sql
-- Migration: add_campaign_images_resources
-- Add images column to campaign_content
ALTER TABLE campaign_content
ADD COLUMN images text[] DEFAULT '{}';

-- Add resources column to campaigns
ALTER TABLE campaigns
ADD COLUMN resources text;
```

### Supabase Storage Setup
Bucket: `campaign-images`
- Public: false (owner access only)
- File size limit: 5MB
- Allowed MIME types: image/jpeg, image/png, image/webp

RLS Policies:
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

## Error Handling & Edge Cases

### Generation Timeout (> 30s)
- Badge shows "Erro ⚠" + "A geração demorou muito"
- "Tentar Novamente" button triggers regeneration
- Deletes old content first to avoid confusion

### Insufficient Style Library (< 3 emails)
- Show error in campaign page: "Você precisa adicionar pelo menos 3 emails no estilo antes de gerar campanhas"
- Link to `/style-library` with CTA: "Adicionar Emails"
- Or: redirect to style library on campaign creation with banner

### Image Upload Failure
- Show error toast per image: "Erro ao enviar {filename}"
- Don't block campaign creation (images optional)
- User can retry upload after campaign exists
- Failed images don't appear in thumbnail grid

### Content Edit Lost (Network Failure)
- Auto-save debounced (500ms after last keystroke)
- Show "Salvando..." indicator (subtle, non-intrusive)
- Error toast if save fails: "Erro ao salvar, tentando novamente..."
- Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s)
- Final failure: persistent error banner with "Tentar Salvar Novamente" button

### Edge Cases
- **Navigate away during generation:** Realtime subscription cleans up, content still generates and appears on return
- **Multiple regenerations:** Each regeneration deletes old content first (idempotent)
- **Edit during generation:** Disable editor until content loads (gray overlay + spinner)
- **Delete campaign with sent recipients:** Block deletion if status='sent' (Epic 6), show error: "Campanhas enviadas não podem ser excluídas"
- **Simultaneous edits (multi-device):** Last write wins (Supabase default), show warning if detected via Realtime

## Types

### src/types/campaign.ts
```typescript
export interface CampaignFormData {
  topic: string          // min 3 chars
  notes: string          // min 20 chars
  resources?: string     // optional, textarea
  images?: string[]      // optional, Storage URLs
}

export interface CampaignFilters {
  status?: CampaignStatus  // filter by status
  search?: string          // search topic/notes
  sortBy?: 'created_at' | 'updated_at'
  sortDirection?: 'asc' | 'desc'
}

export interface CampaignContentUpdate {
  email_subject?: string
  email_body?: string
  whatsapp_text?: string
  facebook_text?: string
  images?: string[]
}

export interface RegenerateDraftOptions {
  campaign_id: string
  preserve_images?: boolean  // keep existing images, only regenerate text
}
```

## Testing Strategy

### Unit Tests
- API functions: validation, error handling
- Content auto-save debounce logic
- Image upload size/type validation
- Campaign state transitions

### Integration Tests
- Realtime subscription updates content correctly
- Auto-save triggers after debounce period
- Retry logic on save failure
- Cache invalidation after mutations

### E2E Tests (agent-browser)
1. Create campaign flow:
   - Fill form → upload image → submit → redirects to /campaigns/:id
   - Verify loading state appears
   - Verify content appears after generation
   - Verify image thumbnails show correctly

2. Edit and approve flow:
   - Edit email subject → verify auto-save indicator
   - Edit body → verify saves successfully
   - Click "Aprovar" → verify modal → confirm → verify badge changes to "Aprovada ✓"

3. Error recovery:
   - Simulate generation failure → verify error state → click retry → verify regenerates

### Edge Function Tests
- Mock OpenAI responses (success and failure cases)
- Test RAG retrieval with style_match
- Test insufficient style library (< 3 emails) rejection
- Test ownership validation (403 for non-owner)

## Epic 6 Impact: HTML Email Requirement

**IMPORTANT:** Image upload in Epic 5 requires HTML email support in Epic 6.

### What changes in Epic 6:
1. **Email format:** Switch from plain text to HTML
2. **Template rendering:** Create HTML email template with:
   - Inline CSS for email client compatibility
   - Image embedding: `<img src="{storage_url}" />`
   - Preserve user's signature formatting
   - Responsive design for mobile email clients
3. **Gmail API:** Use `message.payload.parts` for HTML body (not just text/plain)
4. **Preview:** Show HTML preview in campaign editor (not just textarea)
5. **Testing:** Verify HTML renders correctly in Gmail, Apple Mail, Outlook

### Template strategy:
- Simple HTML structure (avoid complex CSS)
- Inline images from Supabase Storage (public URLs)
- User's signature as separate HTML block
- Fallback plain text version for old email clients

**Document updated:** See Epic 6 Story 6.2 and 6.3 notes in implementation_plan.md

## Success Criteria

Epic 5 is complete when:
- ✅ User can create campaign with topic, notes, resources, and images
- ✅ Campaign content auto-generates using RAG retrieval + style profile
- ✅ User sees live status updates via Realtime ("Gerando..." → "Pronto ✓")
- ✅ User can edit all four content sections (email, WhatsApp, Facebook)
- ✅ Edits auto-save with visual feedback
- ✅ User can upload/delete images (max 5, 5MB each)
- ✅ User can approve campaign (status → approved, timestamp set)
- ✅ User can regenerate draft (deletes old content, generates new)
- ✅ Error states handled gracefully with recovery options
- ✅ Browser-tested end-to-end flow works on mobile and desktop
- ✅ Epic 6 docs updated for HTML email requirement
