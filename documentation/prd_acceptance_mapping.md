# PRD Acceptance Mapping — Missionary Letters MVP

**Epic:** 8.2 — PRD Acceptance Mapping
**Source:** `documentation/Monday_Missionary_Campaign_PRD.md`
**Status:** Complete

---

## Section 11 — Acceptance Criteria (MVP)

| # | PRD Criterion | Implementation Evidence | Test Validation | Status |
|---|---|---|---|---|
| AC-1 | User can install as PWA | `vite-plugin-pwa` configured; `manifest.webmanifest` with pt-BR, theme `#2d4a45`, all icon sizes; `apple-touch-icon` 180×180; `lang="pt-BR"` in `index.html` | Manual: Safari Add to Home Screen → app icon visible on home screen | ✅ Implemented |
| AC-2 | Gmail can be connected successfully | `oauth_google_callback` Edge Function exchanges OAuth code, upserts `google_accounts`; `GmailConnectCard.vue` shows connected state; `?gmail=connected` toast in `settings.vue` | Manual: tap connect → Google consent → redirect → "Gmail conectado" toast | ✅ Implemented |
| AC-3 | Campaign generates content in her voice | `draft_generate` Edge Function: fetches top-6 style examples via `style_match`, fetches `style_profile`, builds pt-BR prompt, calls GPT-4o, inserts into `campaign_content` | Manual: create campaign → spinner → content rendered with voice-consistent tone | ✅ Implemented |
| AC-4 | Email can be edited before send | `CampaignEditor.vue` auto-saves (500ms debounce); `updateCampaignContent` in `src/api/campaigns.ts` persists edits | Manual: edit email body → navigate away → return → edits persist | ✅ Implemented |
| AC-5 | One-tap send logs sent/failed results | `campaign_send` Edge Function: per-recipient Gmail send + `campaign_recipients` insert; `RecipientStatusList.vue` with Realtime live updates; `useRecipientsRealtime` subscription | Manual: approve → send → observe queued/sent/failed rows update in real time | ✅ Implemented |
| AC-6 | Missionaries auto-deactivate after end date | `missionaries_autodeactivate` Edge Function deployed (ACTIVE v1); queries `active=true, mission_end_date < today`; sets `active=false` + pt-BR `inactive_reason` | Manual: set missionary end date to yesterday → trigger function → verify `active=false` | ✅ Implemented |

---

## Section 8 — Functional Requirements (FR)

| FR | Requirement | Priority | Implementation Evidence | Status |
|---|---|---|---|---|
| FR-1 | PWA primary action to create campaign | P0 | Dashboard quick-action CTA → `/campaigns/new`; bottom nav → campaigns | ✅ |
| FR-2 | Gmail OAuth connect | P0 | `oauth_google_callback` + `GmailConnectCard.vue` + `settings.vue` OAuth flow | ✅ |
| FR-3 | AI-generated email + WhatsApp + Facebook | P0 | `draft_generate` returns `email_subject`, `email_body`, `whatsapp_text`, `facebook_text`; `CampaignEditor.vue` renders all 4 | ✅ |
| FR-4 | RAG style retrieval (top K) | P0 | `style_match` Edge Function with pgvector cosine similarity; `match_style_emails` SQL function; K=6 default | ✅ |
| FR-5 | Editable subject/body | P0 | `CampaignEditor.vue` — editable email subject + body with debounced auto-save | ✅ |
| FR-6 | Approval required before send | P0 | `CampaignActions.vue` — send button disabled until `status === 'approved'`; `approveCampaign` API sets flag | ✅ |
| FR-7 | Individual Gmail send per missionary | P0 | `campaign_send` iterates `active` missionaries; renders personalized subject/body per recipient via `renderTokens` | ✅ |
| FR-8 | Per-recipient send logs | P0 | `campaign_recipients` table: `queued` → `sent` / `failed` per row; `error_message` field for failures | ✅ |
| FR-9 | Copy buttons for WhatsApp/Facebook | P0 | `useCopyToClipboard` composable; copy buttons in `CampaignEditor.vue` for WhatsApp and Facebook sections | ✅ |
| FR-10 | Missionary CRUD + end date | P0 | `MissionaryForm.vue` — create/edit/deactivate; `MissionaryTable.vue` — list with search + filters; `mission_end_date` field | ✅ |

---

## Non-Functional Requirements

| NFR | Requirement | Evidence | Status |
|---|---|---|---|
| Performance | Draft generation < 30 seconds typical | GPT-4o via Edge Function; style_match retrieves top-6; no per-recipient AI generation | ✅ Architecture supports |
| Reliability | No duplicate sends per campaign | Idempotency guard in `campaign_send`: checks `status in ('sent', 'sending')` before processing | ✅ |
| Security | RLS enabled, tokens server-side only | RLS policies on all 8 tables; Google tokens stored in `google_accounts` (server-side only); Epic 7 security scan ✅ | ✅ |
| Accessibility | Large tap targets, mobile-first | Tailwind mobile-first layout; bottom nav; bottom-sheet modals; safe-area padding | ✅ |

---

## MVP Non-Goals (Verify Not Shipped)

| Non-Goal | Verification |
|---|---|
| No automated WhatsApp/Facebook sending | Only copy buttons exist; no send API for those channels |
| No multi-user collaboration | Single `owner_id` model throughout; no team/shared-account features |
| No i18n framework | pt-BR hardcoded; no locale switching |
| No advanced analytics | Campaign list + send log only |
| No per-recipient AI generation | `renderTokens` is deterministic template substitution only |

---

## Gaps and Deferred Items

| Item | Disposition |
|---|---|
| HTML email composer (was non-goal, later required) | HTML emails implemented in Epic 6 via `campaign_send`; email body editor remains plain text in `CampaignEditor.vue` — **acceptable for MVP** |
| Retry failed sends | Deferred to V2 per PRD |
| Bounce detection | Deferred to V2 per PRD |
| Automated WhatsApp/Facebook | Out of scope per PRD |
| Daily cron scheduling for `missionaries_autodeactivate` | ✅ Configured in Supabase dashboard > Edge Functions > Schedule |
