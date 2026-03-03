# Product Requirements Document (PRD): Monday Missionary Campaign PWA (Gmail + Style-RAG)

## 1. Summary

-   **One-liner:** A mobile-first PWA that helps a mom create a weekly
    "Monday Campaign" and send individualized missionary emails via
    Gmail, while providing WhatsApp/Facebook copy snippets.
-   **Problem:** Weekly outreach is time-consuming because writing
    consistent, warm emails "in her voice" takes effort, and sending to
    multiple missionaries requires repetitive work and tracking.
-   **Target user:** A mom (primary) who sends encouragement emails
    weekly to a set of active missionaries; optionally a small set of
    family admin accounts.
-   **Value proposition:** Create consistent, voice-matched emails
    quickly (draft + edit + approve) and send to all active missionaries
    with one tap, with clear send logs and minimal complexity.

## 2. Goals & Non-Goals

### Goals (MVP)

-   Primary product language is Brazilian Portuguese (`pt-BR`) across UI
    and generated content defaults.
-   Generate a weekly campaign (email + WhatsApp snippet + Facebook
    post) aligned to the mom's writing voice.
-   Allow editing and approval of the email content before sending.
-   Send individualized emails to each active missionary via Gmail API
    (OAuth) and provide a per-recipient send log.
-   Support automatic missionary deactivation based on mission end date
    (cron).
-   Provide a smooth, mobile-friendly PWA experience suitable for iPhone
    home-screen use.

### Non-Goals (MVP)

-   No automated sending for WhatsApp or Facebook (copy/paste only).
-   No multi-user collaboration workflows beyond single user / simple
    family admin.
-   No multi-language UI/content localization in MVP (no full i18n
    framework yet).
-   No advanced analytics dashboards beyond campaign + send logs.
-   No HTML email composer (plain text only for MVP).
-   No per-recipient AI generation in MVP (use template placeholders +
    deterministic rendering).

## 3. Background & Context

-   **Current workflow / pain points:**
    -   Writing weekly emails from scratch is slow and mentally taxing.
    -   Sending to multiple missionaries requires repetitive sending
        steps and tracking.
    -   Maintaining consistent voice requires referencing older emails
        manually.
-   **Why now:**
    -   Existing email archive enables RAG-for-style.
    -   A PWA provides an app-like experience without App Store
        friction.

## 4. Users & Personas

  -------------------------------------------------------------------------------
  Persona           Description            Primary Needs        Context of Use
  ----------------- ---------------------- -------------------- -----------------
  Mom (Primary)     Weekly                 Fast drafting in her Monday morning on
                    ministering/outreach   voice, easy          phone
                    sender                 edit/approve/send,   
                                           simple UX            

  Family Admin      Helps manage           Import/maintain      Occasional setup
  (Optional)        missionaries/style     list, manage Gmail   
                                           connect              
  -------------------------------------------------------------------------------

## 5. Use Cases

-   **Primary use case:** Create Monday Campaign → generate draft →
    review/edit → approve → send → view results.
-   **Secondary use cases:**
    -   Add/edit missionaries and set mission end date.
    -   Upload historical emails into Style Library.
    -   Preview campaign rendering for a specific missionary.

## 6. User Stories

### MVP

-   As Mom, I want to create a Monday campaign quickly, so I save time.
-   As Mom, I want the app to write in my voice, so it sounds like me.
-   As Mom, I want to edit before sending, so I maintain control.
-   As Mom, I want one-tap send to all active missionaries.
-   As Mom, I want a clear sent/failed log.
-   As Admin, I want to manage missionaries and end dates.
-   As Admin, I want to upload past emails for style learning.

### Later

-   Internationalization (i18n) for additional locales beyond `pt-BR`.
-   Retry failed sends.
-   HTML email support.
-   Bounce detection and auto-inactivation.
-   Multi-sender support.

## 7. End-to-End User Journey

1.  Open PWA.
2.  Tap "Create Monday Campaign".
3.  Enter topic + notes.
4.  Generate content.
5.  Edit and approve.
6.  Send to active missionaries.
7.  View results.

## 8. Functional Requirements (MVP)

  ID      Requirement                                Priority
  ------- ------------------------------------------ ----------
  FR-1    PWA primary action to create campaign      P0
  FR-2    Gmail OAuth connect                        P0
  FR-3    AI-generated email + WhatsApp + Facebook   P0
  FR-4    RAG style retrieval (top K)                P0
  FR-5    Editable subject/body                      P0
  FR-6    Approval required before send              P0
  FR-7    Individual Gmail send per missionary       P0
  FR-8    Per-recipient send logs                    P0
  FR-9    Copy buttons for WhatsApp/Facebook         P0
  FR-10   Missionary CRUD + end date                 P0

## 9. Non-Functional Requirements

-   Performance: Draft generation \< 30 seconds typical.
-   Reliability: No duplicate sends per campaign.
-   Security: RLS enabled, tokens server-side only.
-   Accessibility: Large tap targets, mobile-first.

## 10. KPIs

  Metric                     Target
  -------------------------- --------
  Send success rate          ≥ 95%
  Weekly campaigns created   ≥ 1
  Draft generation time      \< 30s

## 11. Acceptance Criteria (MVP)

-   User can install as PWA.
-   Gmail can be connected successfully.
-   Campaign generates content in her voice.
-   Email can be edited before send.
-   One-tap send logs sent/failed results.
-   Missionaries auto-deactivate after end date.
