# Epic 4: Style Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the `/style-library` page so users can ingest 10–50 historical emails, auto-generate OpenAI embeddings via a Supabase Edge Function, and track embedding status in real-time.

**Architecture:** One-at-a-time form adds emails to `style_emails` (embedding = null), triggers `style_embed_upsert` Edge Function which calls OpenAI `text-embedding-3-small` and updates the record, Supabase Realtime updates the badge without polling. Hard cap at 50 emails. Onboarding progress bar toward 10 unlocks campaigns.

**Tech Stack:** Vue 3 + `<script setup>`, TypeScript, Pinia Colada (`useQuery`/`useMutation`), Supabase JS (Realtime), Supabase Edge Functions (Deno), OpenAI Embeddings API, TailwindCSS v4.

**Design doc:** `docs/plans/2026-03-04-epic-4-style-library-design.md`

---

## Task 1: Add `StyleEmailFormData` type

**Files:**
- Create: `src/types/style-email.ts`

**Step 1: Create the type file**

```typescript
// src/types/style-email.ts

export interface StyleEmailFormData {
  subject: string
  body: string
  source_label: string | null
}

export type EmbeddingStatus = 'pending' | 'ready' | 'error'
```

**Step 2: Commit**

```bash
git add src/types/style-email.ts
git commit -m "feat: add StyleEmailFormData type for style library"
```

---

## Task 2: API layer (`src/api/style-library.ts`)

**Files:**
- Create: `src/api/style-library.ts`

Follows the exact same pattern as `src/api/missionaries.ts`. Uses `supabase` from `@/utils/supabase`.

**Step 1: Create the API file**

```typescript
// src/api/style-library.ts
import { supabase } from '@/utils/supabase'
import type { StyleEmail, Database } from '@/types/database'
import type { StyleEmailFormData } from '@/types/style-email'

type StyleEmailInsert = Database['public']['Tables']['style_emails']['Insert']

export async function getStyleEmails(): Promise<StyleEmail[]> {
  const { data, error } = await supabase
    .from('style_emails')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch style emails: ${error.message}`)
  return data || []
}

export async function getStyleEmailCount(): Promise<number> {
  const { count, error } = await supabase
    .from('style_emails')
    .select('*', { count: 'exact', head: true })

  if (error) throw new Error(`Failed to count style emails: ${error.message}`)
  return count || 0
}

export async function createStyleEmail(formData: StyleEmailFormData): Promise<StyleEmail> {
  const { data: session, error: authError } = await supabase.auth.getSession()
  if (authError || !session.session?.user) {
    throw new Error('User must be authenticated to add style emails')
  }

  const insertData: StyleEmailInsert = {
    owner_id: session.session.user.id,
    subject: formData.subject,
    body: formData.body,
    source_label: formData.source_label || null,
    embedding: null,
    token_count: null,
    tags: null,
    created_at_original: null,
  }

  const { data, error } = await supabase
    .from('style_emails')
    .insert(insertData)
    .select()
    .single()

  if (error) throw new Error(`Failed to create style email: ${error.message}`)
  if (!data) throw new Error('Failed to create style email: No data returned')
  return data
}

export async function deleteStyleEmail(id: string): Promise<void> {
  const { error } = await supabase.from('style_emails').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete style email: ${error.message}`)
}

export async function triggerEmbedding(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke('style_embed_upsert', {
    body: { id },
  })
  // Fire-and-forget: don't throw on embedding error, badge will show status
  if (error) console.warn('Embedding trigger failed:', error.message)
}
```

**Step 2: Commit**

```bash
git add src/api/style-library.ts
git commit -m "feat: add style-library API layer"
```

---

## Task 3: Query layer (`src/queries/style-library.ts`)

**Files:**
- Create: `src/queries/style-library.ts`

Follows the exact same pattern as `src/queries/missionaries.ts`.

**Step 1: Create the queries file**

```typescript
// src/queries/style-library.ts
import { useQuery, useMutation, useQueryCache } from '@pinia/colada'
import { getStyleEmails, getStyleEmailCount, createStyleEmail, deleteStyleEmail, triggerEmbedding } from '@/api/style-library'
import type { StyleEmailFormData } from '@/types/style-email'

export function useStyleEmailsQuery() {
  return useQuery({
    key: ['style-emails'],
    query: () => getStyleEmails(),
    staleTime: 1000 * 60 * 2, // 2 minutes — shorter than missionaries since badge updates via realtime
  })
}

export function useStyleEmailCountQuery() {
  return useQuery({
    key: ['style-emails-count'],
    query: () => getStyleEmailCount(),
    staleTime: 0, // Always fresh for cap enforcement
  })
}

export function useCreateStyleEmail() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: async (formData: StyleEmailFormData) => {
      const email = await createStyleEmail(formData)
      // Fire-and-forget embedding trigger after successful insert
      triggerEmbedding(email.id)
      return email
    },
    onSuccess: () => {
      queryCache.invalidateQueries({ key: ['style-emails'] })
      queryCache.invalidateQueries({ key: ['style-emails-count'] })
    },
  })
}

export function useDeleteStyleEmail() {
  const queryCache = useQueryCache()

  return useMutation({
    mutation: (id: string) => deleteStyleEmail(id),
    onSuccess: () => {
      queryCache.invalidateQueries({ key: ['style-emails'] })
      queryCache.invalidateQueries({ key: ['style-emails-count'] })
    },
  })
}
```

**Step 2: Commit**

```bash
git add src/queries/style-library.ts
git commit -m "feat: add style-library query layer with Pinia Colada"
```

---

## Task 4: `EmbeddingStatusBadge.vue` component

**Files:**
- Create: `src/components/features/style-library/EmbeddingStatusBadge.vue`

**Step 1: Create the badge component**

```vue
<!-- src/components/features/style-library/EmbeddingStatusBadge.vue -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { EmbeddingStatus } from '@/types/style-email'

interface Props {
  hasEmbedding: boolean
  createdAt: string
}

const props = defineProps<Props>()

// Show "Erro" if no embedding after 60 seconds
const status = ref<EmbeddingStatus>(props.hasEmbedding ? 'ready' : 'pending')

onMounted(() => {
  if (props.hasEmbedding) return

  const createdMs = new Date(props.createdAt).getTime()
  const ageSeconds = (Date.now() - createdMs) / 1000

  if (ageSeconds > 60) {
    status.value = 'error'
    return
  }

  // Set a timeout to flip to error after remaining time
  const remaining = (60 - ageSeconds) * 1000
  setTimeout(() => {
    if (status.value === 'pending') status.value = 'error'
  }, remaining)
})

// Watch for parent updating hasEmbedding via Realtime
const resolvedStatus = computed<EmbeddingStatus>(() => {
  if (props.hasEmbedding) return 'ready'
  return status.value
})

const label = computed(() => ({
  ready: 'Pronto ✓',
  pending: 'Processando...',
  error: 'Erro',
}[resolvedStatus.value]))

const classes = computed(() => ({
  ready: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
}[resolvedStatus.value]))
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="classes"
  >
    {{ label }}
  </span>
</template>
```

**Step 2: Commit**

```bash
git add src/components/features/style-library/EmbeddingStatusBadge.vue
git commit -m "feat: add EmbeddingStatusBadge component with timeout-based error state"
```

---

## Task 5: `StyleEmailForm.vue` component

**Files:**
- Create: `src/components/features/style-library/StyleEmailForm.vue`

**Step 1: Create the form component**

```vue
<!-- src/components/features/style-library/StyleEmailForm.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCreateStyleEmail } from '@/queries/style-library'
import type { StyleEmailFormData } from '@/types/style-email'

interface Props {
  atCap: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ success: [] }>()

const formData = ref<StyleEmailFormData>({
  subject: '',
  body: '',
  source_label: null,
})

const errors = ref<Record<string, string>>({})
const { mutate: createEmail, status } = useCreateStyleEmail()
const isSubmitting = computed(() => status.value === 'loading')

function validate(): boolean {
  errors.value = {}
  if (!formData.value.subject.trim()) {
    errors.value.subject = 'Assunto é obrigatório'
  } else if (formData.value.subject.length > 200) {
    errors.value.subject = 'Assunto deve ter no máximo 200 caracteres'
  }
  if (!formData.value.body.trim()) {
    errors.value.body = 'Corpo do email é obrigatório'
  } else if (formData.value.body.trim().length < 50) {
    errors.value.body = 'Corpo do email deve ter pelo menos 50 caracteres'
  }
  if (formData.value.source_label && formData.value.source_label.length > 100) {
    errors.value.source_label = 'Etiqueta deve ter no máximo 100 caracteres'
  }
  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (!validate()) return

  createEmail(formData.value, {
    onSuccess: () => {
      formData.value = { subject: '', body: '', source_label: null }
      errors.value = {}
      emit('success')
    },
    onError: () => {
      errors.value.form = 'Erro ao salvar email. Tente novamente.'
    },
  })
}
</script>

<template>
  <div v-if="atCap" class="rounded-lg bg-stone-100 p-4 text-sm text-stone-600">
    Limite de 50 emails atingido. Isso é suficiente para um ótimo perfil de estilo.
  </div>

  <form v-else class="space-y-4" @submit.prevent="handleSubmit">
    <h2 class="text-lg font-semibold text-stone-900">Adicionar Email</h2>

    <div v-if="errors.form" class="rounded-md bg-red-50 p-3 text-sm text-red-700">
      {{ errors.form }}
    </div>

    <!-- Subject -->
    <div>
      <label class="block text-sm font-medium text-stone-700">
        Assunto <span class="text-red-500">*</span>
      </label>
      <input
        v-model="formData.subject"
        type="text"
        maxlength="200"
        placeholder="Assunto do email original"
        class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
        :class="{ 'border-red-500': errors.subject }"
      />
      <p v-if="errors.subject" class="mt-1 text-xs text-red-600">{{ errors.subject }}</p>
    </div>

    <!-- Source label -->
    <div>
      <label class="block text-sm font-medium text-stone-700">
        Etiqueta <span class="text-stone-400 text-xs">(opcional)</span>
      </label>
      <input
        v-model="formData.source_label"
        type="text"
        maxlength="100"
        placeholder="Ex: Email jan 2023, Elder Silva"
        class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
        :class="{ 'border-red-500': errors.source_label }"
      />
      <p v-if="errors.source_label" class="mt-1 text-xs text-red-600">{{ errors.source_label }}</p>
    </div>

    <!-- Body -->
    <div>
      <label class="block text-sm font-medium text-stone-700">
        Corpo do email <span class="text-red-500">*</span>
      </label>
      <textarea
        v-model="formData.body"
        rows="8"
        placeholder="Cole o conteúdo do email aqui..."
        class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-forest-600 focus:outline-none focus:ring-1 focus:ring-forest-600"
        :class="{ 'border-red-500': errors.body }"
      />
      <p v-if="errors.body" class="mt-1 text-xs text-red-600">{{ errors.body }}</p>
    </div>

    <button
      type="submit"
      :disabled="isSubmitting"
      class="w-full rounded-lg bg-forest-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50"
    >
      {{ isSubmitting ? 'Salvando...' : 'Adicionar Email' }}
    </button>
  </form>
</template>
```

**Step 2: Commit**

```bash
git add src/components/features/style-library/StyleEmailForm.vue
git commit -m "feat: add StyleEmailForm component with validation and cap handling"
```

---

## Task 6: `StyleEmailList.vue` component

**Files:**
- Create: `src/components/features/style-library/StyleEmailList.vue`

This component subscribes to Supabase Realtime to update embedding badges without polling.

**Step 1: Create the list component**

```vue
<!-- src/components/features/style-library/StyleEmailList.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { useDeleteStyleEmail } from '@/queries/style-library'
import EmbeddingStatusBadge from './EmbeddingStatusBadge.vue'
import type { StyleEmail } from '@/types/database'

interface Props {
  emails: StyleEmail[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ deleted: [id: string] }>()

const { mutate: deleteEmail, status: deleteStatus } = useDeleteStyleEmail()
const deletingId = ref<string | null>(null)
const localEmbeddings = ref<Record<string, boolean>>({})

// Seed initial embedding state from props
onMounted(() => {
  props.emails.forEach(e => {
    localEmbeddings.value[e.id] = e.embedding !== null
  })
})

// Realtime subscription: update badge when embedding is set
const channel = supabase
  .channel('style_emails_embedding')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'style_emails' },
    (payload) => {
      const updated = payload.new as StyleEmail
      if (updated.embedding !== null) {
        localEmbeddings.value[updated.id] = true
      }
    },
  )
  .subscribe()

onUnmounted(() => {
  supabase.removeChannel(channel)
})

function confirmDelete(id: string) {
  if (!confirm('Remover este email da biblioteca?')) return
  deletingId.value = id
  deleteEmail(id, {
    onSuccess: () => {
      deletingId.value = null
      emit('deleted', id)
    },
    onError: () => {
      deletingId.value = null
      alert('Erro ao remover email.')
    },
  })
}
</script>

<template>
  <div v-if="emails.length === 0" class="py-8 text-center text-sm text-stone-500">
    Nenhum email adicionado ainda. Use o formulário abaixo para começar.
  </div>

  <ul v-else class="divide-y divide-stone-200">
    <li
      v-for="email in emails"
      :key="email.id"
      class="flex items-start justify-between gap-3 py-3"
    >
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-stone-900">{{ email.subject }}</p>
        <p v-if="email.source_label" class="mt-0.5 text-xs text-stone-500">
          {{ email.source_label }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <EmbeddingStatusBadge
          :has-embedding="localEmbeddings[email.id] ?? email.embedding !== null"
          :created-at="email.created_at"
        />
        <button
          :disabled="deletingId === email.id"
          class="rounded p-1 text-stone-400 hover:text-red-600 disabled:opacity-50"
          aria-label="Remover"
          @click="confirmDelete(email.id)"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </li>
  </ul>
</template>
```

**Step 2: Commit**

```bash
git add src/components/features/style-library/StyleEmailList.vue
git commit -m "feat: add StyleEmailList with Realtime embedding badge updates"
```

---

## Task 7: `style_embed_upsert` Edge Function

**Files:**
- Create: `supabase/functions/style_embed_upsert/index.ts`

**Step 1: Create the functions directory and file**

```bash
mkdir -p supabase/functions/style_embed_upsert
```

**Step 2: Write the Edge Function**

```typescript
// supabase/functions/style_embed_upsert/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings'
const EMBEDDING_MODEL = 'text-embedding-3-small'
const MAX_EMAILS_PER_USER = 50

Deno.serve(async (req: Request) => {
  try {
    // Validate auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { id } = await req.json()
    if (!id || typeof id !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Use service role client to bypass RLS for embedding update
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Use user client to verify auth and get owner_id
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch the style email
    const { data: email, error: fetchError } = await adminClient
      .from('style_emails')
      .select('id, owner_id, body')
      .eq('id', id)
      .single()

    if (fetchError || !email) {
      return new Response(JSON.stringify({ error: 'Style email not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Ensure the email belongs to the authenticated user
    if (email.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Enforce cap: count owner's emails
    const { count } = await adminClient
      .from('style_emails')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    if ((count || 0) > MAX_EMAILS_PER_USER) {
      return new Response(JSON.stringify({ error: 'Email cap exceeded' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Generate embedding via OpenAI
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: email.body,
      }),
    })

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text()
      throw new Error(`OpenAI error: ${err}`)
    }

    const { data: embeddingData, usage } = await openaiResponse.json()
    const vector = embeddingData[0].embedding

    // Persist embedding and token count
    const { error: updateError } = await adminClient
      .from('style_emails')
      .update({
        embedding: vector,
        token_count: usage.prompt_tokens,
      })
      .eq('id', id)

    if (updateError) throw new Error(`Failed to update embedding: ${updateError.message}`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('style_embed_upsert error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

**Step 3: Deploy the Edge Function using the Supabase MCP**

Use `mcp__supabase__deploy_edge_function` with:
- `name`: `style_embed_upsert`
- `verify_jwt`: `true`
- `entrypoint_path`: `index.ts`
- `files`: the content above

**Step 4: Commit**

```bash
git add supabase/functions/style_embed_upsert/index.ts
git commit -m "feat: add style_embed_upsert Edge Function for OpenAI embeddings"
```

---

## Task 8: `/style-library` page

**Files:**
- Modify: `src/pages/style-library.vue`

**Step 1: Replace the stub with the full page**

```vue
<!-- src/pages/style-library.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStyleEmailsQuery, useStyleEmailCountQuery } from '@/queries/style-library'
import StyleEmailList from '@/components/features/style-library/StyleEmailList.vue'
import StyleEmailForm from '@/components/features/style-library/StyleEmailForm.vue'

const ONBOARDING_MIN = 10
const EMAIL_CAP = 50

const { data: emails, isLoading } = useStyleEmailsQuery()
const { data: count, refresh: refreshCount } = useStyleEmailCountQuery()

const emailCount = computed(() => count.value ?? 0)
const atCap = computed(() => emailCount.value >= EMAIL_CAP)
const isOnboarding = computed(() => emailCount.value < ONBOARDING_MIN)
const progressPercent = computed(() =>
  Math.min(100, (emailCount.value / ONBOARDING_MIN) * 100)
)
const remaining = computed(() => Math.max(0, ONBOARDING_MIN - emailCount.value))

// Show the "ready" confirmation once after reaching 10
const showReadyBanner = ref(false)

function handleFormSuccess() {
  refreshCount()
  if (emailCount.value + 1 >= ONBOARDING_MIN) {
    showReadyBanner.value = true
    setTimeout(() => { showReadyBanner.value = false }, 4000)
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-6">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-stone-900">Biblioteca de Estilo</h1>
      <p class="mt-1 text-sm text-stone-500">
        Adicione emails históricos para o perfil de estilo de escrita.
      </p>
    </div>

    <!-- Onboarding progress bar -->
    <div v-if="isOnboarding" class="mb-6 rounded-lg bg-linen-100 p-4">
      <div class="mb-2 flex items-center justify-between text-sm">
        <span class="font-medium text-stone-700">{{ emailCount }} / {{ ONBOARDING_MIN }} emails</span>
        <span class="text-stone-500">Adicione mais {{ remaining }} para desbloquear campanhas</span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          class="h-full rounded-full bg-forest-600 transition-all duration-300"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </div>

    <!-- Ready banner (fades out after 4s) -->
    <div
      v-if="showReadyBanner"
      class="mb-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800"
    >
      ✓ Pronto para gerar campanhas
    </div>

    <!-- Email count when past onboarding -->
    <div v-if="!isOnboarding && !atCap" class="mb-4 text-sm text-stone-500">
      {{ emailCount }} emails adicionados
    </div>

    <!-- List -->
    <div class="mb-8">
      <div v-if="isLoading" class="py-8 text-center text-sm text-stone-500">Carregando...</div>
      <StyleEmailList
        v-else
        :emails="emails ?? []"
        @deleted="refreshCount"
      />
    </div>

    <!-- Divider -->
    <div class="mb-6 border-t border-stone-200" />

    <!-- Add form -->
    <StyleEmailForm :at-cap="atCap" @success="handleFormSuccess" />
  </div>
</template>
```

**Step 2: Commit**

```bash
git add src/pages/style-library.vue
git commit -m "feat: implement style-library page with progress bar and email list"
```

---

## Task 9: Browser test

Navigate to `http://localhost:5173` and verify:

1. **Unauthenticated redirect** — visiting `/style-library` redirects to `/login` ✓
2. **Authenticated access** — after login, page loads with header and form visible
3. **Onboarding progress bar** — shows "0 / 10 emails" with empty bar
4. **Form validation** — submit empty form → errors appear for subject and body
5. **Short body validation** — enter body < 50 chars → "pelo menos 50 caracteres" error
6. **Add an email** — fill in subject + body (50+ chars) + optional label → click "Adicionar Email"
7. **Email appears in list** — new row shows with "Processando..." amber badge
8. **Badge updates** — within ~5–10s badge flips to "Pronto ✓" green (Realtime)
9. **Progress bar advances** — count increments
10. **Delete email** — click 🗑, confirm → email removed, count decrements
11. **Cap at 50** — not testable manually but form hides at `atCap = true`
12. **No JS console errors**

---

## Task 10: Final commit and session update

```bash
git add -A
git commit -m "feat: complete Epic 4 Style Library — ingestion, embeddings, Realtime badges"
```

Then update the session file at `.claude/sessions/2026-03-04-1632.md` and the implementation plan at `documentation/implementation_plan.md` to mark Epic 4 stories 4.1 and 4.2 as complete.
