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
- No HTML composer in MVP (plain text email body).
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

## Epic 0: Baseline and Delivery Guardrails

**Objective:** Lock scope, definitions, and delivery standards before implementation.

### Story 0.1: Confirm Scope Baseline
**Scope**
- Align all implementation decisions to PRD and app spec.
- Capture explicit MVP boundaries in implementation doc.

**Deliverables**
- Scope statement section (goals + non-goals + out-of-scope list).

**Dependencies**
- None.

**Acceptance Criteria**
- MVP goals and non-goals are explicitly listed.
- Framework decision (Vue + Vite) is explicitly recorded.

**Implementation Notes**
- Treat this document as canonical implementation backlog for MVP.

### Story 0.2: Define Technical Decisions and Constraints
**Scope**
- Freeze platform assumptions and toolchain path.

**Deliverables**
- Decision table: backend, auth, functions, scheduler, environment model.

**Dependencies**
- Story 0.1.

**Acceptance Criteria**
- Supabase platform decision documented.
- Supabase CLI workflow documented.
- Env migration requirement for `supabase.ts` captured.
- WhatsApp/Facebook automation excluded in MVP.

**Epic 0 Exit Criteria**
- Scope and technical decision sections approved and versioned.

---

## Epic 1: Foundation and Platform Setup

**Objective:** Make the app deployable as a secure, mobile-first shell with stable routing and environment conventions.

### Story 1.1: Environment and Client Initialization Hardening
**Scope**
- Standardize Vite env usage for Supabase client.
- Define failure behavior for missing/invalid env.

**Deliverables**
- Env contract section.
- Validation checklist for local/dev/prod.

**Dependencies**
- Epic 0.

**Acceptance Criteria**
- App can initialize Supabase client with Vite env vars.
- Missing env behavior is defined (fail fast + actionable error).

**Implementation Notes**
- Target integration file: `src/utils/supabase.ts`.

### Story 1.2: PWA Baseline
**Scope**
- Add installable PWA shell fundamentals.

**Deliverables**
- Manifest requirements.
- Icon asset requirements.
- Service worker cache strategy (shell-only for MVP).

**Dependencies**
- Story 1.1.

**Acceptance Criteria**
- Installable on iPhone home screen.
- Basic offline shell behavior defined.

### Story 1.3: App Shell and Route Skeleton
**Scope**
- Establish route structure and navigation entry points.

**Deliverables**
- Prioritized route implementation order.
- Route guard assumptions (if auth-gated pages are required).

**Dependencies**
- Story 1.1.

**Acceptance Criteria**
- Vue Router paths are mapped and prioritized.
- Navigation structure supports MVP journey.

**Epic 1 Exit Criteria**
- PWA shell, env conventions, and route skeleton are implementation-ready.

---

## Epic 2: Supabase Data Layer

**Objective:** Build the persistent model and security baseline for all MVP workflows.

### Story 2.1: Schema and Migration Plan
**Scope**
- Create ordered migration sequence for all core tables.
- Define foreign keys, indexes, and status enums where needed.

**Deliverables**
- Migration backlog with execution order.
- RLS policy matrix by table.

**Dependencies**
- Epic 1.

**Acceptance Criteria**
- All MVP entities represented.
- RLS strategy (`owner_id = auth.uid()`) is documented per table.

### Story 2.2: Seed and Local Test Data Plan
**Scope**
- Define minimal reproducible seed data for local development/testing.

**Deliverables**
- Seed dataset design including:
  - Active and inactive missionaries
  - At least one campaign with lifecycle states

**Dependencies**
- Story 2.1.

**Acceptance Criteria**
- Seed data supports end-to-end dry run of MVP flow.

### Story 2.3: Automation and Scheduler Plan
**Scope**
- Define cron execution for missionary deactivation and observability.

**Deliverables**
- Scheduler cadence, query logic, idempotency rules, logs.

**Dependencies**
- Story 2.1.

**Acceptance Criteria**
- Auto-deactivation logic is deterministic.
- Operational logging requirements are defined.

**Epic 2 Exit Criteria**
- Data model, RLS, seed strategy, and scheduled automation are fully specified.

---

## Epic 3: Missionaries Management (CRUD)

**Objective:** Enable complete missionary lifecycle management for campaign targeting.

### Story 3.1: Missionary List and Filters
**Scope**
- List missionaries with active status and key metadata.
- Provide baseline filters/sort for operational use.

**Deliverables**
- List view requirements and filter behavior spec.

**Dependencies**
- Epic 2.

**Acceptance Criteria**
- User can locate active missionaries quickly.
- List reflects accurate activation state.

### Story 3.2: Create/Edit Missionary Form
**Scope**
- Form fields, validation, save/update behavior.

**Deliverables**
- Form contract with required/optional fields and validation rules.

**Dependencies**
- Story 3.1.

**Acceptance Criteria**
- CRUD operations are fully defined.
- Validation and errors are explicitly specified.

### Story 3.3: Active State Rules and Overrides
**Scope**
- Derive active status from mission end date and explicit flags.

**Deliverables**
- Priority rules for derived status vs manual override.

**Dependencies**
- Story 3.2 and Story 2.3.

**Acceptance Criteria**
- End-date behavior is deterministic and testable.

**Epic 3 Exit Criteria**
- Missionary CRUD behavior is complete and ready for implementation/testing.

---

## Epic 4: Style Library and RAG Preparation

**Objective:** Build the style signal pipeline required for consistent campaign generation.

### Story 4.1: Style Email Ingestion Workflow
**Scope**
- Define ingestion UX and backend persistence for historical emails.

**Deliverables**
- Ingestion story for 30-50 style examples.

**Dependencies**
- Epic 2.

**Acceptance Criteria**
- User can load enough historical corpus for style modeling.

### Story 4.2: Embedding Generation (`style_embed_upsert`)
**Scope**
- Convert style email bodies into vector embeddings and persist.

**Deliverables**
- Function input/output contract and retry behavior.

**Dependencies**
- Story 4.1.

**Acceptance Criteria**
- Embeddings exist for ingested style records.
- Failure/retry strategy is documented.

### Story 4.3: Similarity Retrieval (`style_match`)
**Scope**
- Retrieve top-K examples for campaign topic context.

**Deliverables**
- Query contract and retrieval ranking parameters.

**Dependencies**
- Story 4.2.

**Acceptance Criteria**
- K defaults to 6.
- Retrieval output is compatible with `draft_generate`.

### Story 4.4: Style Profile Synthesis
**Scope**
- Persist aggregate style traits in `style_profile`.

**Deliverables**
- Profile schema and update strategy.

**Dependencies**
- Story 4.2.

**Acceptance Criteria**
- Profile data can be consumed by generation pipeline.

**Epic 4 Exit Criteria**
- Style ingestion, embedding, retrieval, and profile persistence are fully defined.

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

**Deliverables**
- Send transaction model with idempotency strategy.

**Dependencies**
- Story 6.1 and Epic 5.

**Acceptance Criteria**
- One attempt per active recipient per campaign send action.
- Duplicate-send prevention strategy documented.

### Story 6.3: Recipient Rendering and Send Logging
**Scope**
- Render deterministic subject/body per recipient and persist result.

**Deliverables**
- `campaign_recipients` logging model and status lifecycle.

**Dependencies**
- Story 6.2.

**Acceptance Criteria**
- Statuses include `queued`, `sent`, `failed`.
- Error payload format is defined.

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
