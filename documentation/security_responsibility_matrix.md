# Security Responsibility Matrix (Epic 7.3)

## Responsibility by Layer

| Concern | Client (Vue app) | Edge Functions | Database (Supabase) |
| --- | --- | --- | --- |
| Auth identity | Passes user JWT via Supabase client/session | Validates JWT with `auth.getUser()` when user-scoped | Enforces row access via RLS policies |
| Authorization | Never bypasses ownership checks intentionally | Re-checks ownership before privileged writes | RLS is final gate for user-owned tables |
| Secrets | No storage of service role or provider secrets | Reads provider/service secrets from environment | Stores encrypted data at rest; no secret exposure to client |
| Gmail token handling | Only triggers flows; never sees refresh token directly | Exchanges OAuth code, refreshes access tokens, upserts tokens | Persists token records in `google_accounts` |
| Campaign send execution | Invokes `campaign_send` with user session context | Performs send, logging, and state transitions | Stores campaign, content, recipient logs with constraints/RLS |
| Scheduled automation | No direct control | `missionaries_autodeactivate` runs with service role auth guard | Applies updates atomically to missionary state |

## Verification Notes

### 1) `campaign_recipients` has no `owner_id`
- Verified in generated DB types: `CampaignRecipient` does not include `owner_id`.
- Ownership is expected through `campaign_id -> campaigns.owner_id` policy path.
- Reference: `src/types/database.ts` (`campaign_recipients` table shape).

### 2) Invoke-called functions require `--no-verify-jwt`
- Client invokes: `draft_generate`, `style_embed_upsert`, `style_profile_generate`, `campaign_send` via `supabase.functions.invoke(...)`.
- Project pattern documents deployment with `--no-verify-jwt` while function code performs explicit `auth.getUser()` checks.
- Existing documented examples include `campaign_send` and `oauth_google_callback`.
- Required deploy checklist:
  - `bunx supabase functions deploy draft_generate --no-verify-jwt`
  - `bunx supabase functions deploy style_embed_upsert --no-verify-jwt`
  - `bunx supabase functions deploy style_profile_generate --no-verify-jwt`
  - `bunx supabase functions deploy campaign_send --no-verify-jwt`
  - `bunx supabase functions deploy oauth_google_callback --no-verify-jwt`

### 3) Google refresh token lifecycle
- OAuth callback stores `refresh_token` only when provided by Google (first consent grant).
- Reconnect flow preserves existing refresh token by omitting overwrite when absent.
- Reference: `supabase/functions/oauth_google_callback/index.ts` comments and conditional upsert logic.

### 4) Supabase Security Advisor — Scan Results (2026-03-06)

Scan run via `mcp__supabase__get_advisors`. Results and dispositions:

| Warning | Severity | Disposition |
| --- | --- | --- |
| `handle_updated_at` — mutable `search_path` | WARN | **Fixed** — migration `fix_function_search_path` pins `SET search_path = public` |
| `match_style_emails` — mutable `search_path` | WARN | **Fixed** — same migration above |
| `vector` extension in `public` schema | WARN | **Accepted risk** — pgvector requires installation in a schema with access to vector columns; moving to a separate schema would require recreating all vector columns and is not supported by the Supabase hosted stack without significant effort |
| Leaked password protection disabled | WARN | **Accepted risk** — app uses Google OAuth exclusively; no password-based sign-in is offered; this Auth setting is not applicable |

## Security Checklist Status
- [x] Responsibility matrix documented
- [x] `campaign_recipients` ownership model documented (no `owner_id`)
- [x] Refresh token lifecycle documented
- [x] Security advisor scan executed — 2 issues fixed, 2 accepted with documented rationale
