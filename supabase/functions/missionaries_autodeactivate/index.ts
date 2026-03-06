import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
}

interface MissionaryCandidate {
  id: string
  owner_id: string
  title: string
  first_name: string
  last_name: string
  mission_end_date: string
}

function formatDatePtBr(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

function getUtcDateString(date = new Date()): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  const startMs = Date.now()
  const trigger = req.headers.get('x-supabase-cron') ? 'cron' : 'manual'
  const authHeader = req.headers.get('authorization')
  const expectedAuth = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`

  if (!authHeader || authHeader !== expectedAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const todayUtc = getUtcDateString()

  console.log(
    JSON.stringify({
      event: 'auto_deactivation_start',
      timestamp: new Date().toISOString(),
      trigger,
      filter: {
        active: true,
        mission_end_date_before: todayUtc,
        mission_end_date_not_null: true,
      },
    }),
  )

  try {
    const { count: scannedCount, error: scanError } = await adminClient
      .from('missionaries')
      .select('id', { count: 'exact', head: true })
      .eq('active', true)
      .not('mission_end_date', 'is', null)

    if (scanError) {
      throw new Error(`Failed to count active missionaries: ${scanError.message}`)
    }

    const { data: candidates, error: fetchError } = await adminClient
      .from('missionaries')
      .select('id, owner_id, title, first_name, last_name, mission_end_date')
      .eq('active', true)
      .not('mission_end_date', 'is', null)
      .lt('mission_end_date', todayUtc)
      .order('mission_end_date', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch deactivation candidates: ${fetchError.message}`)
    }

    const deactivatedMissionaries: Array<{
      id: string
      owner_id: string
      name: string
      mission_end_date: string
      deactivated_at: string
    }> = []

    for (const missionary of (candidates ?? []) as MissionaryCandidate[]) {
      const deactivatedAt = new Date().toISOString()
      const reason = `Missão finalizada em ${formatDatePtBr(missionary.mission_end_date)}`

      const { error: updateError } = await adminClient
        .from('missionaries')
        .update({
          active: false,
          inactive_reason: reason,
          updated_at: deactivatedAt,
        })
        .eq('id', missionary.id)
        .eq('active', true)

      if (updateError) {
        console.error(
          JSON.stringify({
            event: 'auto_deactivation_update_failed',
            missionary_id: missionary.id,
            error: updateError.message,
          }),
        )
        continue
      }

      const item = {
        id: missionary.id,
        owner_id: missionary.owner_id,
        name: `${missionary.title} ${missionary.first_name} ${missionary.last_name}`,
        mission_end_date: missionary.mission_end_date,
        deactivated_at: deactivatedAt,
      }

      deactivatedMissionaries.push(item)
      console.log(
        JSON.stringify({
          event: 'missionary_auto_deactivated',
          ...item,
        }),
      )
    }

    const durationMs = Date.now() - startMs

    console.log(
      JSON.stringify({
        event: 'auto_deactivation_run',
        timestamp: new Date().toISOString(),
        trigger,
        summary: {
          scanned: scannedCount ?? 0,
          deactivated: deactivatedMissionaries.length,
          duration_ms: durationMs,
          status: 'success',
        },
        deactivated_missionaries: deactivatedMissionaries,
      }),
    )

    return new Response(
      JSON.stringify({
        success: true,
        trigger,
        scanned: scannedCount ?? 0,
        deactivated: deactivatedMissionaries.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      },
    )
  } catch (error) {
    const durationMs = Date.now() - startMs
    const message = error instanceof Error ? error.message : 'Unknown error'

    console.error(
      JSON.stringify({
        event: 'auto_deactivation_run',
        timestamp: new Date().toISOString(),
        trigger,
        summary: {
          duration_ms: durationMs,
          status: 'failed',
        },
        error: message,
      }),
    )

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
})
