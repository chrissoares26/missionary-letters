# Epic 4: Style Library and RAG Preparation — Design

**Date:** 2026-03-04
**Status:** Approved

---

## Overview

Build the `/style-library` page for ingesting 10–50 historical emails that power the RAG style pipeline. Includes a Supabase Edge Function for auto-generating OpenAI embeddings after each save.

---

## Architecture

```
src/api/style-library.ts
src/queries/style-library.ts
src/components/features/style-library/
  StyleEmailList.vue
  StyleEmailForm.vue
  EmbeddingStatusBadge.vue
supabase/functions/style_embed_upsert/index.ts
src/pages/style-library.vue
```

---

## UI Layout

### Header + Progress Bar (visible until ≥ 10 emails)
- Progress bar: "X / 10 emails — adicione mais N para desbloquear campanhas"
- At ≥ 10: subtle "✓ Pronto para gerar campanhas" shown once then hidden

### Email List
Each row:
- Email subject
- Source label (if provided)
- `EmbeddingStatusBadge` — "Processando..." (amber) or "Pronto ✓" (green) or "Erro" (red after 30s timeout)
- Delete button with confirmation

### Add Form (inline, below list)
Fields:
- **Assunto*** — required, max 200 chars
- **Etiqueta** — optional, max 100 chars (`source_label`)
- **Corpo do email*** — required, min 50 chars

Form resets on success. Emails are immutable once saved (changing body invalidates embedding).

**Cap:** Form hidden at 50 emails with message "Limite de 50 emails atingido".

---

## Data Flow

### Adding an email
```
1. User submits form
2. createStyleEmail() → INSERT into style_emails (embedding = null)
3. On success → invoke style_embed_upsert Edge Function with { id }
4. Edge Function:
   a. Fetch style_email body by id (using service role key)
   b. POST body to OpenAI embeddings API (text-embedding-3-small)
   c. UPDATE style_emails SET embedding = vector, token_count = N WHERE id = id
5. Supabase Realtime subscription on style_emails fires → badge updates
```

### Deleting an email
```
1. User clicks 🗑, confirms
2. deleteStyleEmail(id) → DELETE from style_emails WHERE id = id
3. List re-fetches, count decreases (form reappears if was hidden)
```

### Cap enforcement
- Frontend: hides form when count ≥ 50
- Edge Function: returns early if owner already has ≥ 50 records (safety net)

---

## Edge Function: `style_embed_upsert`

**Input:** `{ id: string }` (style_email UUID)
**Model:** `text-embedding-3-small` (1536 dimensions, cost-effective)
**Secret required:** `OPENAI_API_KEY`

```typescript
// Pseudo-code
1. Validate id present
2. Fetch style_email by id (service role, bypass RLS)
3. Check owner has < 50 emails (guard)
4. Call OpenAI: POST /v1/embeddings { model, input: body }
5. UPDATE style_emails SET embedding = vector, token_count = usage.prompt_tokens
6. Return { success: true }
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Subject empty | Client validation, inline error |
| Body < 50 chars | Client validation, inline error |
| DB insert fails | Toast: "Erro ao salvar email. Tente novamente." |
| At 50 cap | Form hidden, message shown |
| Edge Function fails | Badge stays amber; after 30s shows "Erro" in red |
| Delete fails | Toast: "Erro ao remover email." |
| Realtime drops | Badge may stale; full page refresh recovers |

Retry UI for failed embeddings is post-MVP.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Input method | Paste one at a time | Simpler, one-time onboarding load |
| Embedding trigger | Auto background after save | Best UX, fire-and-forget |
| Onboarding gate | Progress bar toward 10 | User needs to know when campaigns unlock |
| Metadata fields | Subject + body + source_label | Label helps identify; original date adds friction |
| Corpus cap | Hard cap at 50 | Matches spec, bounds cost, no RAG benefit beyond |
| Embedding model | text-embedding-3-small | Cost-effective, 1536 dims, sufficient for style |

---

## Out of Scope (MVP)

- `style_match` Edge Function (Story 4.3) — built when `draft_generate` is needed
- `style_profile` synthesis (Story 4.4) — same
- Retry button for failed embeddings
- Edit existing style emails
- Bulk import / CSV
