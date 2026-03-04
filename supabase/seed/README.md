# Seed Data for Local Development

This directory contains seed data for local Supabase development and testing.

## Prerequisites

Before running seed scripts, you must have a test user account created in your local Supabase instance.

### Create a Test User

**Option 1: Using Supabase Dashboard**
1. Open your local Supabase dashboard at `http://localhost:54323`
2. Go to Authentication → Users
3. Click "Add user"
4. Create a test user (e.g., `test@example.com`)

**Option 2: Using the Application**
1. Start your frontend application (`bun run dev`)
2. Sign up with a test account through the UI

**Option 3: Using SQL**
```sql
-- Run this in the Supabase SQL Editor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  '',
  '',
  '',
  ''
);
```

## Running Seed Scripts

Once you have a test user, run the seed scripts in order:

### Using Supabase SQL Editor

1. Open Supabase Dashboard SQL Editor
2. Run scripts in this order:
   - `01_seed_missionaries.sql`
   - `02_seed_campaigns.sql`

### Using Supabase CLI

```bash
# From project root
bunx supabase db execute < supabase/seed/01_seed_missionaries.sql
bunx supabase db execute < supabase/seed/02_seed_campaigns.sql
```

### Using MCP Supabase Tools

```typescript
// Execute via mcp__supabase__execute_sql
const seed1 = await readFile('supabase/seed/01_seed_missionaries.sql', 'utf-8');
await mcp__supabase__execute_sql({ query: seed1 });

const seed2 = await readFile('supabase/seed/02_seed_campaigns.sql', 'utf-8');
await mcp__supabase__execute_sql({ query: seed2 });
```

## What Gets Seeded

### `01_seed_missionaries.sql`
- 1 test profile (Maria Santos)
- 7 active missionaries with various mission end dates
- 3 inactive missionaries (demonstrating auto-deactivation scenarios)

**Active missionaries:**
- Elder João Silva (Brazil São Paulo South)
- Sister Ana Costa (Brazil Rio de Janeiro)
- Elder Pedro Oliveira (Brazil Curitiba)
- Sister Beatriz Lima (Brazil Brasília)
- Elder Lucas Santos (Brazil Manaus)
- Sister Carla Ferreira (Brazil Recife)
- Elder Rafael Almeida (Brazil Fortaleza - no end date)

**Inactive missionaries:**
- Elder Thiago Rodrigues (mission ended 2 months ago)
- Sister Juliana Martins (mission ended 5 months ago)
- Elder Felipe Souza (manually deactivated)

### `02_seed_campaigns.sql`
- 1 draft campaign (Preparação para o Natal)
- 1 approved campaign (Força e Coragem na Obra)
- 1 sent campaign (Ação de Graças e Gratidão) with:
  - 5 successful recipient logs
  - 1 failed recipient log (demonstrates error handling)

## Verifying Seed Data

After running the seed scripts, verify the data:

```sql
-- Check profile
SELECT * FROM public.profiles;

-- Check missionaries (should see 10 total)
SELECT
  title,
  first_name,
  last_name,
  active,
  mission_end_date
FROM public.missionaries
ORDER BY active DESC, last_name;

-- Check campaigns (should see 3)
SELECT
  topic,
  status,
  created_at
FROM public.campaigns
ORDER BY created_at DESC;

-- Check campaign content
SELECT
  c.topic,
  cc.email_subject
FROM public.campaigns c
JOIN public.campaign_content cc ON c.id = cc.campaign_id;

-- Check recipient logs (should see 6)
SELECT
  m.first_name,
  m.last_name,
  cr.status,
  cr.error,
  cr.sent_at
FROM public.campaign_recipients cr
JOIN public.missionaries m ON cr.missionary_id = m.id
ORDER BY cr.sent_at;
```

## Resetting Seed Data

To reset and re-seed:

```sql
-- Delete all data (cascading deletes will handle related records)
DELETE FROM public.profiles;
DELETE FROM public.missionaries;
DELETE FROM public.campaigns;
```

Then re-run the seed scripts.

## Notes

- All seed data is in Brazilian Portuguese (pt-BR) to match MVP language requirements
- Email addresses are fictional (`@missionary.org`)
- Missionary names are common Brazilian names
- Mission names are real Brazilian missions
- The seed scripts are idempotent (use `ON CONFLICT DO NOTHING` where applicable)
- RLS policies ensure data is scoped to the test user
