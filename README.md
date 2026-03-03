# Missionary Monday

Missionary Monday is a mobile-first PWA that helps you create and send personalized weekly missionary update emails every Monday, with AI-generated drafts in your writing voice and per-recipient delivery logging.

## Goal

Provide a simple Monday workflow to:
1. Create a campaign topic and notes.
2. Generate draft content (email subject/body + WhatsApp/Facebook copy).
3. Review and approve content.
4. Send personalized emails to all active missionaries through Gmail.
5. Track delivery outcomes for each recipient.

## Core MVP Features

- Missionary management (active/inactive, mission end tracking)
- Style library for voice consistency (RAG-based draft generation)
- Campaign creation and approval flow
- Gmail send integration with per-recipient send status logs
- Scheduled auto-deactivation of missionaries after mission end date
- PWA installability for phone-first use

## Tech Stack

- Frontend: Vue 3, Vite, Vue Router, TypeScript, Pinia
- Backend: Supabase (Postgres, Auth, Edge Functions, Cron)
- AI: Embeddings + retrieval for style-guided generation
- Email delivery: Gmail API OAuth 2.0 (`gmail.send` scope)

## Monday Workflow

1. Open app
2. Create Monday campaign
3. Enter topic and optional notes
4. Generate draft content
5. Review and edit
6. Approve campaign
7. Send to active missionaries
8. Review send log

## Environment Variables

Create a `.env` file with:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Local Development

Install dependencies:

```bash
bun install
```

Run dev server:

```bash
bun dev
```

Build for production:

```bash
bun run build
```

Run tests:

```bash
bun test:unit
```

Lint:

```bash
bun lint
```

## Project Docs

- Product/technical spec: `documentation/missionary_monday_app_spec.md`
- Implementation roadmap: `documentation/implementation_plan.md`

## Current Status

This repository currently contains the foundation scaffold and implementation plan for the MVP. Core product workflows are being implemented in phases.
