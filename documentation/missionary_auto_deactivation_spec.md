# Missionary Auto-Deactivation Specification

## Overview

Automatically deactivate missionaries when their mission end date has passed. This ensures the active missionary list stays current without manual intervention.

## Business Rules

### Deactivation Criteria

A missionary should be auto-deactivated when **ALL** of the following conditions are met:

1. `mission_end_date IS NOT NULL`
2. `mission_end_date < CURRENT_DATE` (mission has ended)
3. `active = true` (currently marked as active)

### Deactivation Actions

When a missionary is auto-deactivated:

1. Set `active = false`
2. Set `inactive_reason = 'Missão finalizada em [DD/MM/YYYY]'` (in pt-BR)
3. Update `updated_at = NOW()`
4. Log the operation for operational monitoring

### Edge Cases

**Do NOT auto-deactivate when:**
- `mission_end_date` is NULL (no end date set)
- `active` is already `false` (already inactive)
- `mission_end_date` is today or in the future

**Manual override:**
- If a missionary is manually marked inactive (by user) with a future `mission_end_date`, the auto-deactivation logic should skip them (already inactive)
- The system should not re-activate missionaries automatically

## Scheduler Configuration

### Execution Cadence

**Recommended:** Daily at 2:00 AM UTC

**Rationale:**
- Runs during low-traffic hours
- Ensures missionaries are deactivated promptly (within 24h of mission end)
- Reduces load during peak usage times (Monday mornings)

**Alternative:** Weekly on Sundays at 11:00 PM UTC
- Lower frequency but still adequate for MVP
- Monday campaigns typically sent early Monday morning, so Sunday night update is sufficient

### Scheduler Technology

Use **Supabase Cron** with `pg_cron` extension:

```sql
-- Example cron job setup (to be implemented in Edge Function)
SELECT cron.schedule(
  'auto-deactivate-missionaries',
  '0 2 * * *',  -- Daily at 2:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/missionaries_autodeactivate',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [service-role-key]"}'::jsonb
  );
  $$
);
```

## Query Logic

### SQL Query for Deactivation

```sql
-- Find missionaries eligible for auto-deactivation
SELECT
  id,
  owner_id,
  first_name,
  last_name,
  email,
  mission_name,
  mission_end_date
FROM public.missionaries
WHERE
  active = true
  AND mission_end_date IS NOT NULL
  AND mission_end_date < CURRENT_DATE
ORDER BY mission_end_date ASC;

-- Update query (with Portuguese reason message)
UPDATE public.missionaries
SET
  active = false,
  inactive_reason = 'Missão finalizada em ' || TO_CHAR(mission_end_date, 'DD/MM/YYYY'),
  updated_at = NOW()
WHERE
  active = true
  AND mission_end_date IS NOT NULL
  AND mission_end_date < CURRENT_DATE
RETURNING id, first_name, last_name, mission_end_date;
```

### Performance Considerations

- The `idx_missionaries_mission_end_date` index (created in migration) optimizes this query
- Expected row count: 0-10 per execution (most days will have zero)
- Query execution time: < 10ms even with thousands of missionaries

## Idempotency

### Why Idempotency Matters

- Scheduler might trigger multiple times due to retries or failures
- Must not create duplicate operations or inconsistent state

### Idempotency Strategy

**The query is naturally idempotent** because:

1. Uses `active = true` as a WHERE condition
2. Once a missionary is deactivated (`active = false`), they won't match the WHERE clause again
3. No risk of duplicate deactivation

**Additional safety:**
- Check `active = true` in both SELECT and UPDATE
- Use transaction boundaries to ensure atomic updates
- Log each deactivation with timestamp to track history

### Retry Behavior

If the Edge Function fails:
- Supabase Cron will retry based on cron schedule (next execution)
- No manual intervention needed
- Missionaries will be deactivated on next successful run

## Operational Logging

### Log Events

For each execution, log:

1. **Execution Start**
   - Timestamp
   - Triggered by: cron / manual
   - Query parameters

2. **Deactivation Events** (one per missionary)
   - Missionary ID
   - Missionary name
   - Owner ID
   - Mission end date
   - Timestamp of deactivation

3. **Execution Summary**
   - Total missionaries scanned
   - Total deactivated
   - Duration (ms)
   - Success/failure status
   - Any errors

### Log Format

```json
{
  "event": "auto_deactivation_run",
  "timestamp": "2026-03-03T02:00:00Z",
  "trigger": "cron",
  "summary": {
    "scanned": 150,
    "deactivated": 2,
    "duration_ms": 45,
    "status": "success"
  },
  "deactivated_missionaries": [
    {
      "id": "uuid-1",
      "owner_id": "uuid-owner",
      "name": "Elder Silva",
      "mission_end_date": "2026-03-01",
      "deactivated_at": "2026-03-03T02:00:00Z"
    },
    {
      "id": "uuid-2",
      "owner_id": "uuid-owner",
      "name": "Sister Costa",
      "mission_end_date": "2026-02-28",
      "deactivated_at": "2026-03-03T02:00:00Z"
    }
  ]
}
```

### Log Storage

**Option 1: Supabase Logs**
- Use built-in Supabase Edge Function logging
- Accessible via Supabase Dashboard → Edge Functions → Logs
- Retention: 7 days (free tier), longer on paid plans

**Option 2: Database Audit Table** (recommended for MVP)
- Create `missionary_deactivation_log` table
- Permanent record of all auto-deactivations
- Queryable for troubleshooting and reporting

```sql
-- Optional audit table (can be added in future epic if needed)
CREATE TABLE public.missionary_deactivation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  missionary_id UUID NOT NULL REFERENCES public.missionaries(id),
  owner_id UUID NOT NULL,
  mission_end_date DATE NOT NULL,
  deactivated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  triggered_by TEXT NOT NULL DEFAULT 'cron'
);
```

## Security Considerations

### Authentication

The cron job calls the Edge Function with **service role key**:
- Bypasses RLS policies (necessary to update all users' missionaries)
- Must be securely stored in Supabase Secrets
- Should not be exposed to client-side code

### Authorization

The Edge Function should:
- Verify the request is from Supabase Cron (check headers/IP if possible)
- Use service role context carefully
- Not accept user-supplied parameters that could bypass security

## Testing Strategy

### Unit Tests

Test the SQL query logic:

```sql
-- Test: Should deactivate missionary with past end date
INSERT INTO missionaries (..., mission_end_date, active)
VALUES (..., CURRENT_DATE - 1, true);

-- Run query
-- Assert: active = false, inactive_reason is set

-- Test: Should NOT deactivate missionary with future end date
INSERT INTO missionaries (..., mission_end_date, active)
VALUES (..., CURRENT_DATE + 30, true);

-- Run query
-- Assert: active = true (unchanged)

-- Test: Should NOT deactivate already inactive missionary
INSERT INTO missionaries (..., mission_end_date, active)
VALUES (..., CURRENT_DATE - 1, false);

-- Run query
-- Assert: No update occurs
```

### Integration Tests

1. **Dry-run mode:** Execute query without UPDATE to verify selection logic
2. **End-to-end:** Trigger Edge Function manually and verify:
   - Missionaries are deactivated correctly
   - Logs are generated
   - No side effects on active missionaries

### Manual Verification

After deployment:
1. Create test missionary with `mission_end_date = yesterday`
2. Wait for cron execution or trigger manually
3. Verify missionary is deactivated
4. Check logs for correct event recording

## Implementation Checklist

When implementing the `missionaries_autodeactivate` Edge Function:

- [ ] Create Edge Function: `supabase/functions/missionaries_autodeactivate/index.ts`
- [ ] Implement idempotent query logic
- [ ] Add operational logging (console.log + optional audit table)
- [ ] Configure service role authentication
- [ ] Set up Supabase Cron job
- [ ] Test with seed data (past mission end dates)
- [ ] Document manual trigger command for testing
- [ ] Add monitoring/alerting for failures (V2)

## Future Enhancements (Post-MVP)

1. **Email notifications:** Notify user when missionaries are auto-deactivated
2. **Grace period:** Add 7-day grace period after mission end before auto-deactivation
3. **Dashboard alert:** Show "Recently ended missions" banner
4. **Bulk manual override:** Allow user to extend mission dates in bulk
5. **Audit dashboard:** UI to view deactivation history
6. **Webhook support:** Notify external systems of status changes

## References

- Implementation Plan: `documentation/implementation_plan.md` → Epic 2, Story 2.3
- Database Schema: `supabase/migrations/create_missionaries_table.sql`
- PRD Requirement: `documentation/Monday_Missionary_Campaign_PRD.md` → FR-10
- Spec: `documentation/missionary_monday_app_spec.md` → Section 5 (Edge Functions)

---

**Status:** ✅ Specification complete — Ready for implementation in Epic 4+ (Edge Functions)

**Next Step:** Implement Edge Function `missionaries_autodeactivate` following this spec
