# Test Matrix — Missionary Letters MVP

**Epic:** 8.1 — Test Matrix
**Status:** Complete

## Coverage Approach

| Level | Tool | When |
|---|---|---|
| Unit | Vitest | Pure functions, composables with no side effects |
| Integration | Vitest + Vue Test Utils | Components + composables wired together |
| E2E (manual) | Browser (Playwright/manual) | Full user flows end-to-end |

---

## Feature Areas

### 1. Authentication

| Test | Level | Status | File |
|---|---|---|---|
| `getAuthErrorMessage` maps known Supabase errors to pt-BR | Unit | ✅ | `src/__tests__/authErrors.spec.ts` |
| `getAuthErrorMessage` falls back gracefully for unknown errors | Unit | ✅ | `src/__tests__/authErrors.spec.ts` |
| `fieldErrors` constants are non-empty strings | Unit | ✅ | `src/__tests__/authErrors.spec.ts` |
| Login page shows error toast on bad credentials | Manual | Pending | — |
| Authenticated user is redirected away from `/login` | Manual | Pending | — |
| Unauthenticated user redirected to `/login` from protected routes | Manual | Pending | — |

### 2. Missionaries CRUD

| Test | Level | Status | File |
|---|---|---|---|
| App shell renders bottom nav with correct labels | Integration | ✅ | `src/__tests__/App.spec.ts` |
| Missionary list shows active/inactive filter buttons | Manual | Pending | — |
| Create missionary saves and appears in list | Manual | Pending | — |
| Edit missionary updates data correctly | Manual | Pending | — |
| Deactivate missionary removes from active count | Manual | Pending | — |
| Mission end date in past auto-derives inactive status | Manual | Pending | — |

### 3. Style Library

| Test | Level | Status | File |
|---|---|---|---|
| Style email added increases count toward 10-email threshold | Manual | Pending | — |
| Embedding status badge transitions pending → ready via Realtime | Manual | Pending | — |
| Delete style email prompts confirm modal (not `confirm()`) | Manual | Pending | — |
| Hard cap at 50 emails enforced (add button disabled) | Manual | Pending | — |
| Style profile card generates and displays summary | Manual | Pending | — |

### 4. Campaign Draft Generation

| Test | Level | Status | File |
|---|---|---|---|
| New campaign blocked if < 3 style emails with embeddings | Manual | Pending | — |
| Campaign creation redirects to `/campaigns/:id` | Manual | Pending | — |
| Content appears via Realtime once `draft_generate` completes | Manual | Pending | — |
| Image upload drag-and-drop and picker both work | Manual | Pending | — |
| Auto-save persists edits to email/WhatsApp/Facebook content | Manual | Pending | — |
| Campaign approval gate blocks send until approved | Manual | Pending | — |
| Regenerate draft replaces existing content | Manual | Pending | — |

### 5. Gmail Integration / Send

| Test | Level | Status | File |
|---|---|---|---|
| `escapeHtml` escapes all 5 special characters | Unit | ✅ | `src/__tests__/campaignSendHelpers.spec.ts` |
| `renderTokens` substitutes all 5 missionary tokens | Unit | ✅ | `src/__tests__/campaignSendHelpers.spec.ts` |
| `renderTokens` handles null `mission_name` gracefully | Unit | ✅ | `src/__tests__/campaignSendHelpers.spec.ts` |
| `toBase64Url` produces URL-safe base64 without padding | Unit | ✅ | `src/__tests__/campaignSendHelpers.spec.ts` |
| Gmail OAuth connect flow opens Google consent screen | Manual | Pending | — |
| `?gmail=connected` query param shows success toast | Manual | Pending | — |
| `?gmail=error` query param shows error toast | Manual | Pending | — |
| Gmail disconnect shows confirm modal then removes account | Manual | Pending | — |
| Send campaign creates `campaign_recipients` rows in `queued` | Manual | Pending | — |
| Realtime recipient list shows sent/failed status per row | Manual | Pending | — |
| Approved campaign send blocked if no Gmail connected | Manual | Pending | — |

### 6. Auto-Deactivation Scheduler

| Test | Level | Status | File |
|---|---|---|---|
| `missionaries_autodeactivate` Edge Function invocable via service role | Manual | Pending | — |
| Missionaries with `mission_end_date` < today are deactivated | Manual | Pending | — |
| Re-run on already-inactive missionaries is idempotent | Manual | Pending | — |

### 7. PWA / Shell

| Test | Level | Status | File |
|---|---|---|---|
| App installs as PWA on iOS Safari (Add to Home Screen) | Manual | Pending | — |
| Offline shows cached shell (no blank screen) | Manual | Pending | — |
| Theme color correct in Safari top bar | Manual | Pending | — |

---

## Risk Areas

| Risk | Mitigation | Test Coverage |
|---|---|---|
| Duplicate sends | Idempotency guard in `campaign_send` (status check before send) | Manual scenario 6.6 |
| Token injection in rendered email | `escapeHtml` on all user-supplied values | Unit ✅ |
| OAuth refresh_token loss | Conditional upsert: only overwrite if non-null | Manual + code review |
| Realtime badge stuck on "Processando" | 60s timeout fallback in `EmbeddingStatusBadge` | Manual |
| RLS bypass | Security advisor scan + ownership checks | Epic 7 security review ✅ |
| Generation timeout (> 30s) | Error toast + retry path documented | Error taxonomy doc ✅ |

---

## Cross-Epic Mandatory Scenarios

From implementation plan §4:

| Scenario | Test Level | Status |
|---|---|---|
| Full flow: create → generate → edit → approve → send → verify logs | E2E Manual | Pending |
| Partial failure: one invalid recipient → mixed sent/failed, others unaffected | E2E Manual | Pending |
| Auto-deactivation: missionary inactive after end date via scheduler | Manual | Pending |
| Generation outage: function failure surfaces recoverable error with retry | Manual | Pending |
| OAuth expiry: expired token blocks send and forces reconnect | Manual | Pending |
| Idempotency: repeated send on approved campaign does not duplicate | Manual | Pending |
