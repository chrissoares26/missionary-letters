# Session: Epic 1 — Foundation & Platform Setup

**Started:** 2026-03-03 12:00

---

## Overview

First official development session. Groundwork already done: dependencies installed, design system scaffolded (tokens.css, base.css), MCP tooling configured, design system doc committed.

Starting from `documentation/implementation_plan.md` — Epic 0 (scope alignment) is satisfied by the plan doc itself. Beginning at **Epic 1: Foundation and Platform Setup**.

---

## Goals

1. **Story 1.1** — Fix Supabase client env vars (`process.env` → `import.meta.env`, `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`), add fail-fast validation
2. **Story 1.2** — PWA baseline (manifest.webmanifest, icons, service worker via vite-plugin-pwa)
3. **Story 1.3** — App shell and route skeleton (Vue Router routes + bottom-nav layout)

---

## Current State

| Area | Status |
|---|---|
| Epic 0: Scope alignment | ✅ Done (plan doc) |
| Supabase client | ✅ `import.meta.env` + `VITE_` prefix + fail-fast |
| PWA manifest | ✅ Configured via `vite-plugin-pwa` |
| PWA icons | ✅ 192×192, 512×512, apple-touch-icon generated |
| Vue Router routes | ✅ All 6 MVP routes wired |
| App shell layout | ✅ BottomNav + RouterView, mobile-first |
| Tailwind CSS v4 | ✅ Installed + configured |
| Pinia Colada | ✅ Installed + registered |
| vite-plugin-pwa | ✅ Installed + configured |

---

## Progress

- [x] Install missing deps (Tailwind CSS v4, Pinia Colada, vite-plugin-pwa)
- [x] 1.1 Fix Supabase client (env vars + fail-fast)
- [x] 1.1 Add `.env.example` + migrate `.env` keys to `VITE_` prefix
- [x] 1.2 Install + configure vite-plugin-pwa with manifest
- [x] 1.2 Generate PWA icons (192×192, 512×512, apple-touch-icon)
- [x] 1.3 Create all 6 MVP routes in Vue Router
- [x] 1.3 Build App shell (BottomNav + RouterView, mobile-first)

---

### Update — 2026-03-03

**Summary**: Completed Batch 1 — deps, Supabase client, env setup

**Git Changes** (branch: `main`, last commit: `a656bed`):
- Modified: `bun.lock`, `package.json`, `src/main.ts`, `src/styles/tokens.css`, `src/utils/supabase.ts`, `vite.config.ts`
- Added: `.env.example`, `.claude/sessions/` files

**Todo Progress**: 3 completed, 0 in progress, 4 pending

**Completed this update:**
- ✓ Installed `tailwindcss@4.2.1` + `@tailwindcss/vite`, `@pinia/colada@0.21.7`, `vite-plugin-pwa@1.2.0`
- ✓ Tailwind v4 wired into `vite.config.ts` + `@import "tailwindcss"` added to `tokens.css`
- ✓ Fixed `supabase.ts`: `process.env` → `import.meta.env` with `VITE_` prefix + fail-fast error
- ✓ Migrated `.env` keys: `SUPABASE_URL` → `VITE_SUPABASE_URL`, `SUPABASE_KEY` → `VITE_SUPABASE_ANON_KEY`
- ✓ Added `.env.example`
- ✓ Registered `PiniaColada` as Vue plugin in `main.ts`

**Verification**: `bun run type-check` passes clean.

**Up next**: PWA manifest + icons (Story 1.2), Vue Router routes + app shell (Story 1.3)

---

### Update — 2026-03-03 (Batch 2 + 3)

**Summary**: Completed all Epic 1 tasks — PWA, routes, app shell. All tests passing.

**Git Changes** (branch: `main`, last commit: `a656bed`):
- Modified: `bun.lock`, `index.html`, `package.json`, `src/App.vue`, `src/__tests__/App.spec.ts`, `src/main.ts`, `src/router/index.ts`, `src/styles/tokens.css`, `src/utils/supabase.ts`, `vite.config.ts`
- Added: `.env.example`, `public/icons/` (source.svg, icon-192.png, icon-512.png, apple-touch-icon.png), `src/components/layout/BottomNav.vue`, `src/pages/` (all 6 MVP pages), `.claude/sessions/` files

**Todo Progress**: 7/7 completed

**Completed this update:**
- ✓ PWA config in `vite.config.ts` via `vite-plugin-pwa` — manifest with `pt-BR`, theme `#2d4a45`, icons
- ✓ Icons generated via ImageMagick from source SVG: 192×192, 512×512, 180×180 apple-touch-icon
- ✓ `index.html` updated: `lang="pt-BR"`, title, meta description, theme-color, apple PWA metas
- ✓ Vue Router populated with all 6 MVP routes (`/`, `/missionaries`, `/style-library`, `/campaigns/new`, `/campaigns/:id`, `/settings`)
- ✓ All page stubs created under `src/pages/` with `<script setup>` + pt-BR content
- ✓ `BottomNav.vue` built with inline SVG icons, active state, safe-area padding
- ✓ `App.vue` replaced with real app shell (RouterView + BottomNav, mobile-first)
- ✓ `App.spec.ts` updated to use router plugin — 1/1 tests passing

**Issues & Solutions:**
- `PiniaColada` was being registered as `pinia.use()` (Pinia plugin) — actually a Vue plugin; fixed to `app.use(PiniaColada)`
- Old `App.spec.ts` tested removed scaffold content; updated to test real shell with router

**Browser verification**: All 4 nav items and all routes confirmed working via agent-browser. Zero console errors.

**Status**: Awaiting commit decision (option 1–4 presented to user)

---

## Notes

- Primary language: `pt-BR`
- Mobile-first, PWA installable on iPhone
- Dev server running on `http://localhost:5173`

---

## Session End Summary — 2026-03-03

**Duration**: ~2 hours (started 12:00, ended ~14:00)

---

### Git Summary

**0 commits made** — all changes are staged/unstaged, pending commit decision from user.

**Modified files (10):**
- `bun.lock` — lockfile updated with new deps
- `index.html` — pt-BR lang, PWA meta tags, apple-touch-icon, title
- `package.json` — 3 new runtime deps + 1 dev dep added
- `src/App.vue` — replaced scaffold with real app shell
- `src/__tests__/App.spec.ts` — updated scaffold test to test real shell
- `src/main.ts` — wired PiniaColada as Vue plugin
- `src/router/index.ts` — all 6 MVP routes defined
- `src/styles/tokens.css` — `@import "tailwindcss"` added at top
- `src/utils/supabase.ts` — env var fix + fail-fast error
- `vite.config.ts` — Tailwind v4 + PWA plugin configured

**New files/directories:**
- `.env.example` — documents required `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- `public/icons/source.svg` — source icon SVG (envelope + cross on teal bg)
- `public/icons/icon-192.png` — PWA icon 192×192
- `public/icons/icon-512.png` — PWA icon 512×512 (also used as maskable)
- `public/icons/apple-touch-icon.png` — iOS home screen icon 180×180
- `src/components/layout/BottomNav.vue` — 4-item bottom nav with inline SVGs + active state
- `src/pages/(dashboard).vue` — `/` route stub
- `src/pages/missionaries.vue` — `/missionaries` route stub
- `src/pages/style-library.vue` — `/style-library` route stub
- `src/pages/campaigns/new.vue` — `/campaigns/new` route stub
- `src/pages/campaigns/[id].vue` — `/campaigns/:id` route stub
- `src/pages/settings.vue` — `/settings` route stub
- `.claude/sessions/2026-03-03-1200-epic-1-foundation.md` — this file
- `.claude/sessions/.current-session` — active session tracker

**Net change**: +1,164 insertions, −190 deletions across 10 modified files

---

### Todo Summary

**7/7 tasks completed, 0 remaining**

- ✓ Install missing deps: Tailwind CSS v4, Pinia Colada, vite-plugin-pwa
- ✓ Fix Supabase client: `process.env` → `import.meta.env` + fail-fast validation
- ✓ Add `.env.example` with required Vite env vars
- ✓ Configure vite-plugin-pwa and manifest
- ✓ Create PWA icons (192×192, 512×512, apple-touch-icon)
- ✓ Create all MVP routes in Vue Router
- ✓ Build App shell with bottom navigation + page skeleton components

---

### Key Accomplishments

1. **Epic 1 fully complete** — all three stories (1.1, 1.2, 1.3) delivered and verified
2. App is now a functional PWA shell — installable on iPhone, offline-capable (shell cache)
3. All 6 MVP routes are navigable with working bottom nav
4. Foundation dependencies are correct and wired up

---

### Dependencies Added

| Package | Version | Type |
|---|---|---|
| `tailwindcss` | 4.2.1 | runtime |
| `@tailwindcss/vite` | 4.2.1 | runtime |
| `@pinia/colada` | 0.21.7 | runtime |
| `vite-plugin-pwa` | 1.2.0 | devDependency |

---

### Configuration Changes

- **Tailwind v4**: CSS-first setup — `@import "tailwindcss"` in `tokens.css`, plugin in `vite.config.ts`. No `tailwind.config.js` needed.
- **PWA**: Manifest embedded in `vite.config.ts` via `VitePWA()`. Workbox caches shell + static assets. `navigateFallback: '/index.html'` for SPA routing.
- **Env vars**: `.env` keys renamed from `SUPABASE_URL`/`SUPABASE_KEY` to `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. `SUPABASE_BEARER_TOKEN` left as-is.

---

### Problems Encountered & Solutions

| Problem | Solution |
|---|---|
| `PiniaColada` registered via `pinia.use()` → TypeScript error | It's a Vue plugin — use `app.use(PiniaColada)` after `app.use(pinia)` |
| Existing `App.spec.ts` checked for `'You did it!'` (removed scaffold) | Rewrote test to mount with router, assert nav + pt-BR labels |
| `agent-browser` failed via Volta path | User reinstalled via `bun install agent-browser && npx agent-browser install` |

---

### Breaking Changes / Important Notes

- **`.env` keys changed** — any scripts or CI referencing `SUPABASE_URL` or `SUPABASE_KEY` must be updated to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- `App.vue` scaffold content is gone — replaced with real shell; old test assertion `'You did it!'` is invalid
- Tailwind v4 has no `tailwind.config.js` — configuration is done via CSS `@theme` blocks if needed

---

### What Wasn't Completed

- **Commit not made** — user was presented with 4 options (commit locally / push+PR / keep / discard) but session ended before deciding
- Epic 2 (Supabase data layer / migrations) not started — that's the logical next session

---

### Tips for Next Developer / Session

- Next epic is **Epic 2: Supabase Data Layer** — create migrations for all 8 MVP tables (`profiles`, `missionaries`, `style_emails`, `style_profile`, `campaigns`, `campaign_content`, `campaign_recipients`, `google_accounts`) with RLS policies
- Page stubs in `src/pages/` are intentionally minimal — flesh them out per epic as each feature is built
- `src/components/layout/` has `BottomNav.vue` — if a header or sidebar is needed later, add it here
- Tailwind v4 + CSS custom properties coexist — use Tailwind utilities for layout/spacing, CSS vars (`var(--action-primary)` etc.) for brand colors in one-off styles
- `SUPABASE_BEARER_TOKEN` remains in `.env` — this was a pre-existing key; determine if it's still needed or can be removed
