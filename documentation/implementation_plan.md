# Missionary Monday Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Deliver an MVP PWA that generates, approves, and sends weekly missionary emails with voice-consistent content and per-recipient logging.

**Architecture:** Keep the current Vue 3 + Vite + Vue Router application and integrate Supabase (Postgres, Auth, Edge Functions, Cron) as the primary backend. Implement feature delivery in sequential epics that establish platform foundations first, then data, then business workflows (missionaries, style/RAG, campaigns, Gmail, hardening).

**Tech Stack:** Vue 3, Vite, Vue Router, TypeScript, Pinia, Supabase JS, Supabase CLI, Supabase Edge Functions, Postgres + pgvector, Gmail API OAuth 2.0.

## 1. Scope Alignment

### 1.1 Source-of-Truth Inputs
- Product requirements: `documentation/Monday_Missionary_Campaign_PRD.md`
- Technical specification: `documentation/missionary_monday_app_spec.md`
- Current app scaffold: Vue 3 + Vite + Vue Router in `src/`

### 1.2 MVP Goals
- Primary language for MVP is Brazilian Portuguese (`pt-BR`) for UI and default generated content.
- Generate weekly campaign content: email subject/body + WhatsApp/Facebook snippets.
- Edit and approve campaign content before sending.
- Send individualized emails to active missionaries through Gmail.
- Log send status for each recipient.
- Auto-deactivate missionaries after mission end date.
- Support mobile-first PWA experience.

### 1.3 MVP Non-Goals
- No automated WhatsApp/Facebook publishing (copy-only).
- No multi-user collaboration workflow beyond single primary user/admin baseline.
- No internationalization/localization framework in MVP beyond `pt-BR` defaults.
- No advanced analytics dashboard.
- ~~No HTML composer in MVP (plain text email body).~~ **UPDATED (Epic 5):** HTML emails ARE required for MVP due to image upload feature. See Epic 6 Story 6.2 and 6.3 for implementation details.
- No per-recipient AI generation in MVP (deterministic template rendering only).

### 1.4 Planning Constraints and Decisions
- Framework decision: keep Vue + Vite for MVP. No Nuxt/Next migration.
- Supabase is the backend platform of record.
- Supabase CLI is the default path for schema, functions, and migrations.
- Existing `src/utils/supabase.ts` stays as integration point, but env contract must move to Vite style:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## 2. Public Interfaces and Contracts to Implement

## 2.1 Frontend Routes (Vue Router)
- `/missionaries`
- `/style-library`
- `/campaigns/new`
- `/campaigns/:id`
- `/settings`

## 2.2 Supabase Table Contracts
- `profiles`
- `missionaries`
- `style_emails`
- `style_profile`
- `campaigns`
- `campaign_content`
- `campaign_recipients`
- `google_accounts`

All user-owned tables require RLS with owner policy pattern based on `auth.uid()`.

## 2.3 Edge Function Contracts
- `style_embed_upsert`: generate/store embeddings for style emails.
- `style_match`: return top-K style examples for topic context.
- `draft_generate`: produce structured campaign content JSON.
- `campaign_send`: send individualized messages via Gmail and persist status.
- `missionaries_autodeactivate` (scheduled): deactivate missionaries past `mission_end_date`.

## 2.4 Configuration Interface
- Frontend required env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Server-side/secret values remain in Supabase Edge secret storage where applicable.
- Localization baseline:
  - MVP must ship with `pt-BR` as the default and primary language.
  - i18n architecture for additional locales is deferred to V2.

## 3. Epic Roadmap (Sequential)

Execution order is mandatory. Each epic must meet exit criteria before the next epic starts.

---

## Epic 0: Baseline and Delivery Guardrails ✅ COMPLETE

**Objective:** Lock scope, definitions, and delivery standards before implementation.

### Story 0.1: Confirm Scope Baseline ✅
**Scope**
- Align all implementation decisions to PRD and app spec.
- Capture explicit MVP boundaries in implementation doc.

**Deliverables**
- Scope statement section (goals + non-goals + out-of-scope list).

**Dependencies**
- None.

**Acceptance Criteria**
- ✅ MVP goals and non-goals are explicitly listed.
- ✅ Framework decision (Vue + Vite) is explicitly recorded.

**Implementation Notes**
- Treat this document as canonical implementation backlog for MVP.

### Story 0.2: Define Technical Decisions and Constraints ✅
**Scope**
- Freeze platform assumptions and toolchain path.

**Deliverables**
- Decision table: backend, auth, functions, scheduler, environment model.

**Dependencies**
- Story 0.1.

**Acceptance Criteria**
- ✅ Supabase platform decision documented.
- ✅ Supabase CLI workflow documented.
- ✅ Env migration requirement for `supabase.ts` captured.
- ✅ WhatsApp/Facebook automation excluded in MVP.

**Epic 0 Exit Criteria**
- ✅ Scope and technical decision sections approved and versioned.

---

## Epic 1: Foundation and Platform Setup ✅ COMPLETE

**Objective:** Make the app deployable as a secure, mobile-first shell with stable routing and environment conventions.

**Session:** `2026-03-03-1200-epic-1-foundation.md`

### Story 1.1: Environment and Client Initialization Hardening ✅
**Scope**
- Standardize Vite env usage for Supabase client.
- Define failure behavior for missing/invalid env.

**Deliverables**
- Env contract section.
- Validation checklist for local/dev/prod.

**Dependencies**
- Epic 0.

**Acceptance Criteria**
- ✅ App can initialize Supabase client with Vite env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- ✅ Missing env behavior defined — fail fast with actionable error in `src/utils/supabase.ts`.

**Implementation Notes**
- `src/utils/supabase.ts` — env vars fixed, fail-fast validation added.
- `.env.example` added with required `VITE_` prefixed keys.
- `.env` keys renamed: `SUPABASE_URL` → `VITE_SUPABASE_URL`, `SUPABASE_KEY` → `VITE_SUPABASE_ANON_KEY`.

### Story 1.2: PWA Baseline ✅
**Scope**
- Add installable PWA shell fundamentals.

**Deliverables**
- Manifest requirements.
- Icon asset requirements.
- Service worker cache strategy (shell-only for MVP).

**Dependencies**
- Story 1.1.

**Acceptance Criteria**
- ✅ Installable on iPhone home screen.
- ✅ Basic offline shell behavior — Workbox shell + static asset caching.

**Implementation Notes**
- `vite-plugin-pwa@1.2.0` installed and configured in `vite.config.ts`.
- Manifest embedded in Vite config: pt-BR language, theme `#2d4a45`, all required icon sizes.
- Icons generated via ImageMagick from source SVG: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180×180).
- `index.html` updated with `lang="pt-BR"`, theme-color, apple PWA meta tags.

### Story 1.3: App Shell and Route Skeleton ✅
**Scope**
- Establish route structure and navigation entry points.

**Deliverables**
- Prioritized route implementation order.
- Route guard assumptions (if auth-gated pages are required).

**Dependencies**
- Story 1.1.

**Acceptance Criteria**
- ✅ Vue Router paths mapped — all 6 MVP routes wired.
- ✅ Navigation structure supports MVP journey via bottom nav.

**Implementation Notes**
- `src/router/index.ts` — 6 routes: `/`, `/missionaries`, `/style-library`, `/campaigns/new`, `/campaigns/:id`, `/settings`.
- `src/components/layout/BottomNav.vue` — 4-item bottom nav (Dashboard, Missionaries, Campaigns, Settings) with inline SVG icons, active state, safe-area padding.
- `src/App.vue` — replaced scaffold with real app shell (RouterView + BottomNav, mobile-first).
- All page stubs created under `src/pages/` with `<script setup>` + pt-BR placeholder content.
- `App.spec.ts` updated to use router plugin; 1/1 tests passing.
- Deps added: `tailwindcss@4.2.1`, `@tailwindcss/vite`, `@pinia/colada@0.21.7`.

### Story 1.4: Authentication Pages ✅ COMPLETE
**Scope**
- Implement login and registration pages for Supabase Auth.
- Remove dev auth helper used for development.

**Deliverables**
- ✅ `/login` route with email/password authentication
- ✅ `/register` route for new user signup
- ✅ `/reset-password` route for password recovery
- ✅ Auth state management (`useAuth` composable)
- ✅ Route guards with onboarding redirect logic
- ✅ Session persistence (30 days)
- ✅ UI components: `FormInput`, `FormButton`, `Toast`
- ✅ Error handling with pt-BR messages
- ✅ Dev auth helper removed

**Dependencies**
- Story 1.1, Story 1.3.

**Acceptance Criteria**
- ✅ User can register with email/password (pending Supabase email confirmation config)
- ✅ User can sign in and session persists on reload
- ✅ Protected routes redirect to login when unauthenticated
- ✅ Dev auth helper (`window.devAuth`) removed from production build

**Implementation Notes**
- `src/pages/login.vue` — login form with Supabase Auth
- `src/pages/register.vue` — registration form
- `src/utils/dev-auth.ts` — marked for cleanup after auth pages complete
- Auth composable for session management
- Route guards in `src/router/index.ts`

**Epic 1 Exit Criteria**
- ✅ PWA shell, env conventions, and route skeleton complete and browser-verified.
- ✅ **Story 1.4 (Auth pages) complete — Supabase email confirmation needs configuration before production deployment**

---

## Epic 2: Supabase Data Layer ✅ COMPLETE

**Objective:** Build the persistent model and security baseline for all MVP workflows.

**Session:** `2026-03-03-1430-epic-2-data-layer.md`

### Story 2.1: Schema and Migration Plan ✅
**Scope**
- Create ordered migration sequence for all core tables.
- Define foreign keys, indexes, and status enums where needed.

**Deliverables**
- Migration backlog with execution order.
- RLS policy matrix by table.

**Dependencies**
- Epic 1.

**Acceptance Criteria**
- ✅ All MVP entities represented.
- ✅ RLS strategy (`owner_id = auth.uid()`) is documented per table.

**Implementation Notes**
- All 8 tables created via Supabase MCP
- RLS policies applied on all tables
- Indexes created including vector similarity index
- Database types generated in `src/types/database.ts`

### Story 2.2: Seed and Local Test Data Plan ✅
**Scope**
- Define minimal reproducible seed data for local development/testing.

**Deliverables**
- Seed dataset design including:
  - Active and inactive missionaries
  - At least one campaign with lifecycle states

**Dependencies**
- Story 2.1.

**Acceptance Criteria**
- ✅ Seed data supports end-to-end dry run of MVP flow.

**Implementation Notes**
- `supabase/seed/01_seed_missionaries.sql` — 10 missionaries (7 active, 3 inactive)
- `supabase/seed/02_seed_campaigns.sql` — 3 campaigns with different states
- `supabase/seed/README.md` — documentation for seed process

### Story 2.3: Automation and Scheduler Plan ✅
**Scope**
- Define cron execution for missionary deactivation and observability.

**Deliverables**
- Scheduler cadence, query logic, idempotency rules, logs.

**Dependencies**
- Story 2.1.

**Acceptance Criteria**
- ✅ Auto-deactivation logic is deterministic.
- ✅ Operational logging requirements are defined.

**Implementation Notes**
- `documentation/missionary_auto_deactivation_spec.md` — complete specification
- Scheduler cadence: Daily at 2:00 AM UTC
- Idempotency strategy documented
- Logging format and storage options defined

**Epic 2 Exit Criteria**
- ✅ Data model, RLS, seed strategy, and scheduled automation are fully specified.

---

## Epic 3: Missionaries Management (CRUD) ✅ COMPLETE

**Objective:** Enable complete missionary lifecycle management for campaign targeting.

**Session:** `2026-03-04-epic-3-missionaries-crud.md`

### Story 3.1: Missionary List and Filters ✅
**Scope**
- List missionaries with active status and key metadata.
- Provide baseline filters/sort for operational use.

**Deliverables**
- List view requirements and filter behavior spec.

**Dependencies**
- Epic 2.

**Acceptance Criteria**
- ✅ User can locate active missionaries quickly.
- ✅ List reflects accurate activation state.

**Implementation Notes**
- `src/components/features/missionaries/MissionaryTable.vue` — table with search and filters
- Active/inactive/all filter buttons
- Search across name, email, mission
- Status badges with color coding
- Mobile-first card layout

### Story 3.2: Create/Edit Missionary Form ✅
**Scope**
- Form fields, validation, save/update behavior.

**Deliverables**
- Form contract with required/optional fields and validation rules.

**Dependencies**
- Story 3.1.

**Acceptance Criteria**
- ✅ CRUD operations are fully defined.
- ✅ Validation and errors are explicitly specified.

**Implementation Notes**
- `src/components/features/missionaries/MissionaryForm.vue` — full form with validation
- Elder/Sister title toggle
- Email validation with regex
- Mission end date picker
- Active/inactive checkbox with conditional reason field
- Notes textarea
- Form-level validation with error messages

### Story 3.3: Active State Rules and Overrides ✅
**Scope**
- Derive active status from mission end date and explicit flags.

**Deliverables**
- Priority rules for derived status vs manual override.

**Dependencies**
- Story 3.2 and Story 2.3.

**Acceptance Criteria**
- ✅ End-date behavior is deterministic and testable.

**Implementation Notes**
- Active status automatically derived from mission end date
- Visual warning for missions ending within 30 days
- Soft delete with reason tracking
- Manual override supported via active checkbox

**Epic 3 Exit Criteria**
- ✅ Missionary CRUD behavior is complete and ready for implementation/testing.

**Implementation Summary**
- API layer: `src/api/missionaries.ts` with CRUD + filters
- Queries: `src/queries/missionaries.ts` with Pinia Colada caching
- Components: MissionaryTable + MissionaryForm
- Page: `src/pages/missionaries.vue` with modal workflow
- Types: `src/types/database.ts` + `src/types/missionary.ts`
- Design system: Tailwind v4 theme with pt-BR colors
- Dev helper: `src/utils/dev-auth.ts` — REMOVED in Story 1.4 ✅

---

## Epic 4: Style Library and RAG Preparation ✅ COMPLETE

**Objective:** Build the style signal pipeline required for consistent campaign generation.

**Sessions:** `2026-03-04-1632.md`, `2026-03-04-2149.md`

### Story 4.1: Style Email Ingestion Workflow ✅
**Scope**
- Define ingestion UX and backend persistence for historical emails.

**Deliverables**
- Ingestion story for 30-50 style examples.

**Dependencies**
- Epic 2.

**Acceptance Criteria**
- ✅ User can load enough historical corpus for style modeling.
- ✅ Single-add form with subject, body (min 50 chars), optional source label.
- ✅ Onboarding progress bar toward 10-email threshold to unlock campaigns.
- ✅ Hard cap at 50 emails enforced on frontend and Edge Function.
- ✅ Delete with confirmation.

**Implementation Notes**
- `src/types/style-email.ts` — `StyleEmailFormData` interface + `EmbeddingStatus` type
- `src/api/style-library.ts` — `getStyleEmails`, `getStyleEmailCount`, `createStyleEmail`, `deleteStyleEmail`, `triggerEmbedding` (fire-and-forget)
- `src/queries/style-library.ts` — `useStyleEmailsQuery`, `useStyleEmailCountQuery`, `useCreateStyleEmail`, `useDeleteStyleEmail` (Pinia Colada)
- `src/components/features/style-library/StyleEmailForm.vue` — form with validation, uses `isLoading` (not `status`) for submit state, opens in modal
- `src/components/features/style-library/StyleEmailList.vue` — list with Realtime subscription for live badge updates, collapsible (shows 5 preview, "Ver todos" to expand)
- `src/components/features/style-library/EmbeddingStatusBadge.vue` — amber "Processando..." → green "Pronto ✓" via Realtime; red "Erro" after 60s timeout
- `src/pages/style-library.vue` — progress bar, ready banner (auto-dismiss 4s), "+ Adicionar Email" button opens modal, email count display
- Migration: `enable_realtime_style_emails` — `style_emails` added to `supabase_realtime` publication

**UX Improvements** (added 2026-03-04):
- Form moved to modal overlay (prevents form from being pushed off-screen when profile generates)
- Email list collapsible: shows 5 most recent by default, "Ver todos os X emails" button to expand
- Consistent modal pattern with missionaries page (slide-up animation, backdrop, close button)

### Story 4.2: Embedding Generation (`style_embed_upsert`) ✅
**Scope**
- Convert style email bodies into vector embeddings and persist.

**Deliverables**
- Function input/output contract and retry behavior.

**Dependencies**
- Story 4.1.

**Acceptance Criteria**
- ✅ Embeddings exist for ingested style records.
- ✅ Fire-and-forget trigger from frontend after insert; badge reflects status via Realtime.
- ✅ Ownership check enforced (403 if requester is not owner).
- ✅ Cap guard enforced in function (422 if > 50).

**Implementation Notes**
- `supabase/functions/style_embed_upsert/index.ts` — deployed with `verify_jwt: false` (auth handled manually via dual-client pattern)
- Dual-client pattern: `userClient` (anon + JWT) for auth verification; `adminClient` (service role) for DB write
- OpenAI `text-embedding-3-small` model (1536 dimensions); persists `embedding` vector + `token_count`
- CORS preflight handled explicitly (`OPTIONS` → 200) before auth check
- Fire-and-forget: `triggerEmbedding(id)` in `useCreateStyleEmail` mutation; badge updates via Realtime without polling

### Story 4.3: Similarity Retrieval (`style_match`) ✅
**Scope**
- Retrieve top-K examples for campaign topic context.

**Deliverables**
- Query contract and retrieval ranking parameters.

**Dependencies**
- Story 4.2.

**Acceptance Criteria**
- ✅ K defaults to 6.
- ✅ Retrieval output is compatible with `draft_generate`.

**Implementation Notes**
- `supabase/functions/style_match/index.ts` — Edge Function with `verify_jwt: false`, CORS headers
- Dual-client pattern: `userClient` for auth; `adminClient` for DB operations
- Generates query embedding via OpenAI `text-embedding-3-small`
- PostgreSQL RPC function `match_style_emails` for vector similarity search using pgvector `<=>` operator
- Returns top-K matches sorted by cosine similarity (1 - distance)
- Min threshold enforcement: requires at least 3 emails with embeddings before retrieval
- Fallback behavior if RPC not available (direct query without similarity ranking)
- Migration: `create_match_style_emails_function` — PostgreSQL function for vector similarity

### Story 4.4: Style Profile Synthesis ✅
**Scope**
- Persist aggregate style traits in `style_profile`.

**Deliverables**
- Profile schema and update strategy.

**Dependencies**
- Story 4.2.

**Acceptance Criteria**
- ✅ Profile data can be consumed by generation pipeline.
- ✅ Min 3 emails required for profile generation.
- ✅ Profile includes tone, common phrases, sentence structure, vocabulary, emotional patterns, and unique voice.

**Implementation Notes**
- `supabase/functions/style_profile_generate/index.ts` — Edge Function using OpenAI `gpt-4o-mini` for style analysis
- Analyzes up to 20 most recent style emails (to stay within token limits)
- Structured JSON output with: tone, common_phrases, sentence_structure, vocabulary, emotional_expression, structural_preferences, unique_voice, summary
- Enriched with metadata: generated_at, email_count, analyzed_count, tokens_used
- Upserts into `style_profile` table (one profile per user)
- `src/api/style-library.ts` — `getStyleProfile`, `generateStyleProfile` functions
- `src/queries/style-library.ts` — `useStyleProfileQuery`, `useGenerateStyleProfile` mutations
- `src/components/features/style-library/StyleProfileCard.vue` — UI card displaying profile with "Gerar Perfil" / "Regenerar" button
- Integrated into `src/pages/style-library.vue` — shows profile card above email list
- Uses `.maybeSingle()` to handle null profiles gracefully (no 406 errors)

**Epic 4 Exit Criteria**
- ✅ All stories 4.1, 4.2, 4.3, 4.4 complete — full RAG pipeline ready for Epic 5 (Campaign Draft Generation).
- ✅ UX improvements applied (modal form, collapsible list) — production-ready interface.
- ✅ Browser-tested and user-approved — all features working as expected.

---

## Epic 5: Campaign Draft Generation Workflow

**Objective:** Provide full user flow for campaign content generation, editing, and approval.

### Story 5.1: New Campaign Input Flow
**Scope**
- Capture topic and optional notes.

**Deliverables**
- Input validation and campaign creation behavior spec.

**Dependencies**
- Epics 2 and 4.

**Acceptance Criteria**
- Campaign can be created with required fields.

### Story 5.2: Draft Generation (`draft_generate`)
**Scope**
- Generate structured content from topic/notes/style context.

**Deliverables**
- JSON output contract:
  - `email_subject`
  - `email_body`
  - `whatsapp_text`
  - `facebook_text`

**Dependencies**
- Story 5.1 and Story 4.3.

**Acceptance Criteria**
- Generation returns all four content artifacts.

### Story 5.3: Edit Experience for Generated Content
**Scope**
- Editable content UI and persistence behavior.

**Deliverables**
- Edit/save behavior for campaign content and timestamps.

**Dependencies**
- Story 5.2.

**Acceptance Criteria**
- Edits persist and are reflected in send preview.

### Story 5.4: Approval Gate
**Scope**
- Enforce explicit approval before send eligibility.

**Deliverables**
- Status transitions and guard rules.

**Dependencies**
- Story 5.3.

**Acceptance Criteria**
- Send action blocked until approval is complete.

**Epic 5 Exit Criteria**
- Campaign generation and pre-send control flow are fully specified and testable.

---

## Epic 6: Gmail Integration and Send Orchestration

**Objective:** Deliver reliable individualized sending with complete recipient-level traceability.

### Story 6.1: OAuth Connect/Disconnect + Token Model
**Scope**
- Define Gmail OAuth flow and token persistence strategy.

**Deliverables**
- Connect/disconnect UX states and token lifecycle rules.

**Dependencies**
- Epic 2.

**Acceptance Criteria**
- Expired token behavior and reconnect path are documented.

### Story 6.2: Send Orchestration (`campaign_send`)
**Scope**
- Queue and send one email per active missionary.
- **IMPORTANT:** Epic 5 image upload feature requires HTML email support (not plain text).

**Deliverables**
- Send transaction model with idempotency strategy.
- HTML email template with inline image support.

**Dependencies**
- Story 6.1 and Epic 5.

**Acceptance Criteria**
- One attempt per active recipient per campaign send action.
- Duplicate-send prevention strategy documented.
- HTML emails render correctly with embedded images from Supabase Storage.

**Implementation Notes (Epic 5 Impact)**
- Switch from plain text to HTML email format
- Create HTML email template:
  - Inline CSS for email client compatibility
  - Image embedding: `<img src="{storage_url}" />` from campaign_content.images
  - Preserve user's signature formatting
  - Responsive design for mobile email clients
- Gmail API: use `message.payload.parts` for HTML body (multipart/alternative)
- Include fallback plain text version for old email clients

### Story 6.3: Recipient Rendering and Send Logging
**Scope**
- Render deterministic subject/body per recipient and persist result.
- Render HTML email body with embedded images.

**Deliverables**
- `campaign_recipients` logging model and status lifecycle.
- HTML email renderer with personalization tokens ({{first_name}}, {{title}}, etc).

**Dependencies**
- Story 6.2.

**Acceptance Criteria**
- Statuses include `queued`, `sent`, `failed`.
- Error payload format is defined.
- HTML email preview available in campaign editor (Story 5.3 enhancement).
- Rendered HTML stored in campaign_recipients.rendered_body for audit trail.

**Implementation Notes (Epic 5 Impact)**
- HTML template rendering per recipient
- Image URLs from campaign_content.images embedded inline
- Personalization tokens replaced: {{title}} {{first_name}} → "Elder João"
- Store both plain text and HTML versions in rendered_body
- Test HTML rendering in Gmail, Apple Mail, Outlook

### Story 6.4: Result Reporting
**Scope**
- Show campaign send summary and per-recipient detail.

**Deliverables**
- Result UI requirements and retry policy (if deferred, explicitly marked post-MVP).

**Dependencies**
- Story 6.3.

**Acceptance Criteria**
- User can see sent/failed results clearly.

**Epic 6 Exit Criteria**
- OAuth, send orchestration, logging, and reporting are implementation-ready.

---

## Epic 7: Observability, Security, and Hardening

**Objective:** Reduce operational risk and enforce clear security boundaries before release.

### Story 7.1: Error Taxonomy and Recovery UX
**Scope**
- Define error classes and user-facing messages.

**Deliverables**
- Error map across generation, send, auth, and data operations.

**Dependencies**
- Epics 3-6.

**Acceptance Criteria**
- Recoverable vs non-recoverable errors are explicit.

### Story 7.2: Audit and Operational Logging
**Scope**
- Define required logs/events for high-risk flows.

**Deliverables**
- Logging checklist for campaign lifecycle and scheduler events.

**Dependencies**
- Story 7.1.

**Acceptance Criteria**
- Monitoring expectations are explicit for production support.

### Story 7.3: Security Checklist
**Scope**
- Finalize RLS, token handling, and secret ownership boundaries.

**Deliverables**
- Client/edge/db responsibility matrix.

**Dependencies**
- Story 7.2.

**Acceptance Criteria**
- Security responsibilities are non-ambiguous and reviewable.

**Epic 7 Exit Criteria**
- Security and operational readiness criteria are defined and measurable.

---

## Epic 8: QA, UAT, and Release Readiness

**Objective:** Validate MVP against PRD acceptance criteria and establish release go/no-go.

### Story 8.1: Test Matrix
**Scope**
- Define required unit, integration, end-to-end, and manual checks.

**Deliverables**
- Test plan matrix by feature and risk area.

**Dependencies**
- Epics 1-7.

**Acceptance Criteria**
- Every critical workflow has assigned test level and owner.

### Story 8.2: PRD Acceptance Mapping
**Scope**
- Map PRD MVP criteria to explicit validation steps.

**Deliverables**
- Traceability table from PRD acceptance to test evidence.

**Dependencies**
- Story 8.1.

**Acceptance Criteria**
- No PRD MVP acceptance criterion is unmapped.

### Story 8.3: Release Runbook and Go/No-Go
**Scope**
- Define final release checklist and rollback/mitigation basics.

**Deliverables**
- Release readiness checklist, go/no-go gate, and sign-off flow.

**Dependencies**
- Story 8.2.

**Acceptance Criteria**
- Release decision criteria are explicit and auditable.

**Epic 8 Exit Criteria**
- MVP can be validated and released with clear risk controls.

## 4. Cross-Epic Test Scenarios (Mandatory)

1. Campaign flow: create -> generate -> edit -> approve -> send -> verify per-recipient logs.
2. Partial failure: one invalid recipient email produces mixed sent/failed outcomes without aborting all.
3. Auto-deactivation: missionary transitions to inactive after mission end date via scheduler.
4. Generation outage: Supabase/function failure surfaces recoverable error with retry path.
5. OAuth expiry: expired Gmail token blocks send and forces reconnect.
6. Idempotency: repeated send action on same approved campaign does not duplicate sends.

## 5. Dependency Graph

- Epic 0 -> Epic 1 -> Epic 2
- Epic 2 -> Epic 3, Epic 4
- Epic 4 + Epic 2 -> Epic 5
- Epic 5 + Epic 2 -> Epic 6
- Epics 3-6 -> Epic 7
- Epics 1-7 -> Epic 8

## 6. Assumptions and Defaults

- Framework remains Vue 3 + Vite for MVP.
- Sequential phase plan is the governing delivery format.
- Supabase CLI is available and used for migrations/functions.
- `src/utils/supabase.ts` is the standard client initialization point.
- Env contract will be normalized to Vite conventions during implementation.
- This document defines implementation structure only; it does not execute code changes.

## 7. Definition of Ready (Per Story)

A story is ready only when:
- Scope and boundary are explicit.
- Dependencies are satisfied.
- Acceptance criteria are testable.
- Required interfaces (UI/API/data) are defined.
- Risks and fallback behavior are documented when relevant.

## 8. Definition of Done (MVP Program Level)

MVP is done when:
- PWA is installable and usable on iPhone home screen.
- Missionary CRUD is functional with deterministic active/inactive behavior.
- Style library supports ingestion and retrieval-backed draft generation.
- Campaigns can be generated, edited, approved, and sent.
- Gmail sending logs recipient-level outcomes.
- Scheduler auto-deactivates missionaries past end date.
- PRD acceptance criteria are fully validated via Epic 8 evidence.
