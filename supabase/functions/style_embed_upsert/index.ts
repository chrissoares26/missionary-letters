import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings'
const EMBEDDING_MODEL = 'text-embedding-3-small'
const MAX_EMAILS_PER_USER = 50

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    const { id } = await req.json()
    if (!id || typeof id !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    // Service role client — bypasses RLS for embedding update
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // User client — verifies JWT and resolves owner_id
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    // Fetch the style email
    const { data: email, error: fetchError } = await adminClient
      .from('style_emails')
      .select('id, owner_id, body')
      .eq('id', id)
      .single()

    if (fetchError || !email) {
      return new Response(JSON.stringify({ error: 'Style email not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    // Ownership check
    if (email.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    // Cap guard
    const { count } = await adminClient
      .from('style_emails')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    if ((count || 0) > MAX_EMAILS_PER_USER) {
      return new Response(JSON.stringify({ error: 'Email cap exceeded' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    // Generate embedding via OpenAI
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: email.body,
      }),
    })

    if (!openaiResponse.ok) {
      const err = await openaiResponse.text()
      throw new Error(`OpenAI error: ${err}`)
    }

    const { data: embeddingData, usage } = await openaiResponse.json()
    const vector = embeddingData[0].embedding

    // Persist embedding and token count
    const { error: updateError } = await adminClient
      .from('style_emails')
      .update({
        embedding: vector,
        token_count: usage.prompt_tokens,
      })
      .eq('id', id)

    if (updateError) throw new Error(`Failed to update embedding: ${updateError.message}`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  } catch (err) {
    console.error('style_embed_upsert error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
})
