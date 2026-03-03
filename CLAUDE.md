# Missionary Letters

A privacy-first, AI-powered PWA for generating and sending personalized weekly missionary emails using Gmail automation and RAG-based style matching. Built with Supabase (Postgres + pgvector + Edge Functions) and a modern Vue 3 frontend, the app leverages retrieval-augmented generation to mirror over a decade of authentic writing style without fine-tuning. It supports structured campaign workflows (draft → review → approve → send), individualized email rendering (Elder/Sister-aware personalization), secure Google OAuth integration, automatic missionary lifecycle management (mission end auto-deactivation), and detailed send logging — all optimized for a simple, mobile-first Monday workflow.

## Standards

MUST FOLLOW THESE RULES, NO EXCEPTIONS

- Stack: Vue.js, TypeScript, TailwindCSS v4, Vue Router, Pinia, Pinia Colada
- Patterns: ALWAYS use Composition API + `<script setup>`, NEVER use Options API
- ALWAYS Keep types alongside your code, use TypeScript for type safety, prefer `interface` over `type` for defining types
- Keep unit and integration tests alongside the file they test: `src/ui/Button.vue` + `src/ui/Button.spec.ts`
- ALWAYS use TailwindCSS classes rather than manual CSS
- DO NOT hard code colors, use Tailwind's color system
- ONLY add meaningful comments that explain why something is done, not what it does
- Dev server is already running on `http://localhost:5173` with HMR enabled. NEVER launch it yourself
- ALWAYS use named functions when declaring methods, use arrow functions only for callbacks
- ALWAYS prefer named exports over default exports

## Project Structure

Keep this section up to date with the project structure. Use it as a reference to find files and directories.

EXAMPLES are there to illustrate the structure, not to be implemented as-is.

```
public/ # Public static files (favicon, PWA icons, manifest.webmanifest, robots.txt)
│   ├── icons/ # PWA icons (192x192, 512x512, apple-touch-icon)
│   └── manifest.webmanifest # PWA configuration

supabase/
├── functions/ # Supabase Edge Functions (server-side logic)
│   ├── draft_generate/ # RAG-based draft generation
│   │   └── index.ts
│   ├── campaign_send/ # Gmail batch sending logic
│   │   └── index.ts
│   ├── style_embed_upsert/ # Embedding generation for style emails
│   │   └── index.ts
│   ├── oauth_google_callback/ # Google OAuth token exchange handler
│   │   └── index.ts
│   └── missionaries_autodeactivate/ # Scheduled mission end auto-deactivation
│       └── index.ts
│
├── migrations/ # SQL schema + RLS + functions
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   ├── 003_vector_search.sql
│   └── 004_indexes.sql
│
└── seed/ # Optional local seed data for development

src/
├── api/ # MUST export individual functions that call Supabase or Edge Functions
│   ├── missionaries.ts
│   ├── campaigns.ts
│   ├── style-library.ts
│   ├── gmail.ts
│   └── profile.ts
│
├── components/
│   ├── ui/ # Base UI components (Button, Input, Modal, Badge, Toast)
│   ├── layout/ # AppShell, Header, Sidebar (if used), Navigation
│   └── features/
│       ├── missionaries/
│       │   ├── MissionaryTable.vue
│       │   ├── MissionaryForm.vue
│       │   └── CsvImportModal.vue
│       │
│       ├── campaigns/
│       │   ├── CampaignEditor.vue
│       │   ├── CampaignPreview.vue
│       │   ├── SendProgress.vue
│       │   └── RecipientStatusList.vue
│       │
│       ├── style-library/
│       │   ├── StyleEmailList.vue
│       │   ├── StyleEmailForm.vue
│       │   └── EmbeddingStatusBadge.vue
│       │
│       └── settings/
│           ├── GmailConnectCard.vue
│           └── SignatureEditor.vue
│
├── composables/ # Composition functions
│   ├── useAuth.ts
│   ├── useMissionaries.ts
│   ├── useCampaign.ts
│   ├── useStyleLibrary.ts
│   ├── useGmailStatus.ts
│   └── useCopyToClipboard.ts
│
├── stores/ # Pinia stores (UI state only, NOT direct DB fetching)
│   ├── app.store.ts
│   ├── campaign.store.ts
│   └── ui.store.ts
│
├── queries/ # Data-fetching logic (Supabase queries + caching)
│   ├── missionaries.ts
│   ├── campaigns.ts
│   ├── style-emails.ts
│   └── profile.ts
│
├── pages/
│   ├── (dashboard).vue # Renders at /
│   ├── missionaries.vue # /missionaries
│   ├── style-library.vue # /style-library
│   ├── campaigns/
│   │   ├── new.vue # /campaigns/new
│   │   └── [id].vue # /campaigns/:id
│   └── settings.vue # /settings
│
├── plugins/
│   ├── supabase.ts # Supabase client setup
│   ├── pwa.ts # PWA registration logic
│   └── dayjs.ts # Optional date handling
│
├── utils/ # Pure helper functions
│   ├── renderEmail.ts # Personalization token rendering
│   ├── emailValidation.ts
│   ├── delay.ts # Send jitter helper
│   ├── similarityScore.ts # Optional client-side scoring
│   └── constants.ts
│
├── types/ # Shared TypeScript types
│   ├── database.ts # Supabase generated types
│   ├── missionary.ts
│   ├── campaign.ts
│   └── ai.ts
│
├── assets/
│   ├── styles/
│   │   └── main.css
│   └── images/
│
├── main.ts # Entry point
├── App.vue # Root component
└── router/
    └── index.ts
```

## Project Commands

This project uses **Bun** as the package manager and runtime.

### Development

- `bun run dev`  
  Starts the Vite development server.

- `bun run preview`  
  Serves the production build locally for preview.

---

### Build & Type Safety

- `bun run build`  
  Runs type checking and builds the project for production.

- `bun run build-only`  
  Builds the project using Vite (without type checking).

- `bun run type-check`  
  Runs `vue-tsc` type checking.

---

### Testing

- `bun run test:unit`  
  Runs unit tests in watch mode (Vitest).

- `bunx vitest run`  
  Runs all tests once (CI mode).

- `bunx vitest run <test-files>`  
  Runs specific test files.
  - Add `--coverage` to check test coverage:
    ```bash
    bunx vitest run --coverage
    ```

---

### Linting & Formatting

- `bun run lint`  
  Runs all linting tasks.

- `bun run lint:oxlint`  
  Runs Oxlint with auto-fix.

- `bun run lint:eslint`  
  Runs ESLint with auto-fix and cache enabled.

- `bun run format`  
  Formats files using Prettier.

---

### Supabase (Recommended Commands)

If using Supabase CLI locally:

- `bunx supabase start`  
  Starts local Supabase stack.

- `bunx supabase db push`  
  Applies local migrations to the database.

- `bunx supabase functions serve`  
  Serves Edge Functions locally.

- `bunx supabase functions deploy <function-name>`  
  Deploys a specific Edge Function.

---

### Notes

- Use `bun install` to install dependencies.
- Use `bun add <package>` to add dependencies.
- Use `bun add -d <package>` to add dev dependencies.
- Use `bun remove <package>` to remove dependencies.

## Development Workflow

ALWAYS follow the workflow when implementing a new feature or fixing a bug. This ensures consistency, quality, and maintainability of the codebase.

1. Plan your tasks, review them with user. Include tests when possible
2. Write code, following the [project structure](#project-structure) and [conventions](#standards)
3. **ALWAYS test implementations work**:
   - Write tests for logic and components
   - Use the agent-browser to test like a real user
4. Stage your changes with `git add` once a feature works
5. Review changes and analyze the need of refactoring

## Testing Workflow

### Unit and Integration Tests

- Test critical logic first
- Split the code if needed to make it testable

### Browser Testing

1. Navigate to the relevant page
2. Wait for content to load completely
3. Test primary user interactions
4. Test secondary functionality (error states, edge cases)
5. Check the JS console for errors or warnings
   - If you see errors, investigate and fix them immediately
   - If you see warnings, document them and consider fixing if they affect user experience
6. Document any bugs found and fix them immediately

## Research & Documentation

- **NEVER hallucinate or guess URLs**
- ALWAYS try accessing the `llms.txt` file first to find relevant documentation. EXAMPLE: `https://pinia-colada.esm.dev/llms.txt`
  - If it exists, it will contain other links to the documentation for the LLMs used in this project
- ALWAYS follow existing links in table of contents or documentation indices
- Verify examples and patterns from documentation before using
