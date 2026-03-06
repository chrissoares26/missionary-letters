# Operational Logging Checklist (Epic 7.2)

## Campaign Lifecycle Events
- [ ] `campaign_generate_requested`: campaign id, owner id, trigger source, timestamp
- [ ] `campaign_generate_completed`: campaign id, latency ms, token/input summary
- [ ] `campaign_approved`: campaign id, approved_at, approver user id
- [ ] `campaign_send_started`: campaign id, recipient_count, timestamp
- [ ] `campaign_recipient_sent`: campaign id, recipient id, missionary id, gmail_message_id
- [ ] `campaign_recipient_failed`: campaign id, recipient id, missionary id, error message/category
- [ ] `campaign_send_completed`: campaign id, sent count, failed count, duration ms, final status

## Scheduler Events (`missionaries_autodeactivate`)
- [ ] `auto_deactivation_start`: trigger (`cron` or `manual`), filter params, timestamp
- [ ] `missionary_auto_deactivated` per record: missionary id, owner id, name, mission_end_date, deactivated_at
- [ ] `auto_deactivation_update_failed` per failed update: missionary id, db error
- [ ] `auto_deactivation_run` summary: scanned, deactivated, duration ms, status, error (if failed)

## Required Fields Across All Logs
- [ ] `event` (stable machine-readable key)
- [ ] `timestamp` (ISO 8601 UTC)
- [ ] `correlation_id` when request-scoped tracing is available
- [ ] `user_id` or `owner_id` where applicable (never raw access tokens)
- [ ] `status` (`success`/`failed`) for summary events

## Security and Privacy Rules
- [ ] Never log OAuth access tokens, refresh tokens, API keys, JWTs, or email body content
- [ ] Log provider/API errors in sanitized form (message + code only)
- [ ] Keep logs useful for triage without exposing missionary sensitive free-text notes

## Operational Review Cadence
- [ ] Weekly review of Edge Function failures and repeated transient errors
- [ ] Monthly review of log coverage against this checklist
- [ ] Update this checklist when new campaign/scheduler flows are introduced
