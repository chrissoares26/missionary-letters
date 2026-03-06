# Release Runbook — Missionary Letters MVP

**Epic:** 8.3 — Release Runbook and Go/No-Go
**Status:** Complete

---

## Pre-Release Checklist

Work through every item. All P0 items must be ✅ before release.

### Environment

- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in production `.env` / hosting provider
- [ ] Supabase project is on a paid tier or the free-tier limits are acceptable for usage volume
- [ ] `OPENAI_API_KEY` set in Supabase Edge Function secrets
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set in Supabase Edge Function secrets
- [ ] `OAUTH_REDIRECT_URI` points to production domain (e.g., `https://yourdomain.com/settings?gmail=connected`)
- [ ] Google Cloud OAuth consent screen configured with production redirect URI
- [ ] Supabase email confirmation enabled (or disabled intentionally and documented)

### Database

- [ ] All migrations applied to production Supabase project (`bunx supabase db push` or via dashboard)
- [ ] RLS enabled on all 8 tables: `profiles`, `missionaries`, `style_emails`, `style_profile`, `campaigns`, `campaign_content`, `campaign_recipients`, `google_accounts`
- [ ] `match_style_emails` RPC function exists and has immutable `search_path` (migration `fix_function_search_path` applied)
- [ ] `handle_updated_at` trigger function has immutable `search_path` (same migration)
- [ ] `campaign-images` Storage bucket exists with appropriate RLS policies
- [ ] Realtime publications: `style_emails`, `campaign_content`, `campaign_recipients` all in `supabase_realtime` publication

### Edge Functions

- [ ] `style_embed_upsert` — deployed, `verify_jwt: false` ✅
- [ ] `style_match` — deployed, `verify_jwt: false` ✅
- [ ] `style_profile_generate` — deployed ✅
- [ ] `draft_generate` — deployed, `verify_jwt: false` ✅
- [ ] `oauth_google_callback` — deployed, `verify_jwt: false` (handles auth manually) ✅
- [ ] `campaign_send` — deployed, `verify_jwt: false` ✅
- [ ] `missionaries_autodeactivate` — deployed ACTIVE v1 ✅

### Scheduler

- [x] Daily cron for `missionaries_autodeactivate` configured in Supabase dashboard > Edge Functions > Schedule ✅

### Build and Deploy

- [ ] `bun run build` completes with zero TypeScript errors
- [ ] `bunx vitest run` — all 11 tests pass
- [ ] PWA manifest valid (check with `bunx vite-plugin-pwa` or browser DevTools > Application)
- [ ] Service worker registered and caching static shell assets
- [ ] Deployed to hosting provider (Vercel / Netlify / Cloudflare Pages)
- [ ] Production URL accessible over HTTPS

### Manual Smoke Tests (UAT)

Run on iPhone Safari in production environment:

- [ ] App installs to home screen (Add to Home Screen)
- [ ] Login with registered Supabase account succeeds
- [ ] Navigate to Missionaries → list loads
- [ ] Add a missionary → appears in list
- [ ] Navigate to Style Library → add 3+ emails → embeddings complete (green badge)
- [ ] Navigate to Campaigns > New → create campaign → generation spinner → content appears
- [ ] Edit email body → navigate away → return → edits persist
- [ ] Approve campaign → Send button becomes active
- [ ] Navigate to Settings → connect Gmail → Google consent screen → returns with success toast
- [ ] Send campaign → `campaign_recipients` rows appear with sent/failed status
- [ ] Copy WhatsApp snippet → clipboard populated
- [ ] Copy Facebook snippet → clipboard populated

---

## Go / No-Go Gate

All P0 criteria must be ✅. Any ❌ is a release blocker.

| Criterion | Priority | Status |
|---|---|---|
| Zero TypeScript build errors | P0 | — |
| All 11 unit tests pass | P0 | — |
| All 10 FR items implemented (see PRD mapping) | P0 | — |
| All 6 AC-1–AC-6 acceptance criteria met | P0 | — |
| RLS enabled on all tables | P0 | — |
| No `alert()` / `confirm()` calls in `src/` | P0 | — |
| Gmail OAuth flow works end-to-end | P0 | — |
| Campaign send delivers email to at least one real recipient | P0 | — |
| Missionaries auto-deactivation scheduler configured | P0 | ✅ |
| App installable as PWA on iPhone | P1 | — |
| Offline shell cached (no blank screen) | P1 | — |

**Decision:** Release ✅ / Hold ❌

**Sign-off:** ___________________________  Date: _______________

---

## Rollback Plan

| Failure | Rollback Action |
|---|---|
| Edge Function regression | Redeploy previous function version via Supabase dashboard |
| DB migration breaks schema | Apply reverse migration or restore Supabase point-in-time backup |
| Frontend deploy broken | Revert to previous deployment on hosting provider |
| OAuth redirect misconfigured | Update `OAUTH_REDIRECT_URI` env secret + Google Cloud Console redirect URI |
| Scheduler running incorrectly | Disable cron schedule via Supabase dashboard immediately |

---

## Post-Release Monitoring

- Check Supabase Edge Function logs for errors (dashboard > Edge Functions > Logs)
- Monitor `campaign_recipients` failure rate: `SELECT status, count(*) FROM campaign_recipients GROUP BY status`
- Monitor `style_emails` embedding errors: `SELECT embedding_status, count(*) FROM style_emails GROUP BY embedding_status`
- Set alert if `missionaries_autodeactivate` produces errors in daily log
