# Missionary Monday App -- Full Technical Specification

## 0) Overview

A PWA application that helps generate and send personalized missionary
emails every Monday using:

- Supabase (Database, Auth, Edge Functions)
- RAG-for-style AI system
- Gmail API for sending
- WhatsApp and Facebook via copy/paste (no automation)
- MVP primary language: Brazilian Portuguese (`pt-BR`)
- V2 direction: full i18n support for additional locales

---

# 1) Monday Flow

1.  Open PWA
2.  Click **Create Monday Campaign**
3.  Enter topic and optional notes
4.  AI generates:
    - Email subject
    - Email body (in her voice)
    - WhatsApp snippet
    - Facebook post
5.  User reviews and edits
6.  Clicks **Approve**
7.  Clicks **Send to all active missionaries**
8.  System logs results

---

# 2) Architecture

## Frontend

- Vue3
- Supabase client
- PWA enabled (manifest + service worker)

Key Routes: - /missionaries - /style-library - /campaigns/new -
/campaigns/:id - /settings

## Supabase

- Postgres
- pgvector
- Auth
- Edge Functions
- Cron jobs

---

# 3) Database Schema

## profiles

- id (uuid, pk)
- display_name
- default_language
- signature
- default_subject_prefix
- created_at

## missionaries

- id (uuid)
- owner_id
- title (Elder/Sister)
- first_name
- last_name
- email
- mission_name
- mission_end_date
- active (boolean)
- inactive_reason
- notes
- last_sent_at
- created_at

## style_emails

- id
- owner_id
- subject
- body
- source_label
- created_at_original
- tags
- embedding (vector)
- token_count
- created_at

## style_profile

- owner_id
- profile_json (jsonb)
- updated_at

## campaigns

- id
- owner_id
- topic
- notes
- language (default `pt-BR` in MVP)
- status
- approved_at
- created_at

## campaign_content

- campaign_id
- email_subject
- email_body
- whatsapp_text
- facebook_text
- updated_at

## campaign_recipients

- id
- campaign_id
- missionary_id
- to_email
- rendered_subject
- rendered_body
- status
- gmail_message_id
- error
- sent_at

## google_accounts

- owner_id
- google_email
- access_token
- refresh_token
- expiry
- scopes
- updated_at

---

# 4) RAG-for-Style System

## Step 1 -- Store Style Emails

Store 30--50 historical emails.

## Step 2 -- Generate Embeddings

Create vector embeddings for each style email body.

## Step 3 -- Similarity Search

For new topic: 1. Embed topic 2. Retrieve top K (6) most similar emails

## Step 4 -- Generate Draft

Pass: - Topic - Notes - Style profile - Retrieved examples

Return structured JSON: - subject - body - whatsapp_text - facebook_text

---

# 5) Edge Functions

## style_embed_upsert

Creates embeddings for style emails.

## style_match

Returns top K similar style emails.

## draft_generate

Generates campaign content using RAG.

## campaign_send

Sends emails via Gmail API.

## missionaries_autodeactivate

Cron job to deactivate missionaries after mission_end_date.

---

# 6) Gmail Integration

- OAuth 2.0
- Scope: gmail.send
- Send individual emails
- Add randomized delay between sends
- Log all results

---

# 7) PWA Requirements

- manifest.webmanifest
- Icons (192x192, 512x512)
- Standalone mode
- Service worker caching (shell only)

---

# 8) Security

- Enable RLS on all tables
- owner_id = auth.uid()
- Store Google tokens securely
- Keep API keys in Edge secrets

---

# 9) Implementation Phases

Phase A -- Supabase setup\
Phase B -- Missionaries CRUD\
Phase C -- Style library + embeddings\
Phase D -- Draft generation (RAG)\
Phase E -- Gmail integration\
Phase F -- Polish + cron automation

---

# 10) Definition of Done

- Installable PWA
- Missionary management
- Style library embedded
- Draft generation in her voice
- Approve & Send workflow
- Gmail integration working
- Send logs stored
- Auto deactivation working

---

End of Documentation
