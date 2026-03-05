import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
}

interface GenerateRequest {
  campaign_id: string
}

interface StyleMatch {
  subject: string
  body: string
  similarity: number
}

interface GeneratedContent {
  email_subject: string
  email_body: string
  whatsapp_text: string
  facebook_text: string
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Verify JWT and get owner_id
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')

    // User client for auth verification
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ownerId = user.id

    // Admin client for DB operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Parse request
    const body: GenerateRequest = await req.json()
    const { campaign_id } = body

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'Missing campaign_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch campaign (verify ownership)
    const { data: campaign, error: campaignError } = await adminClient
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('owner_id', ownerId)
      .single()

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call style_match for RAG retrieval — pass user auth header so style_match can verify the user
    const styleMatchResponse = await adminClient.functions.invoke('style_match', {
      body: { query: campaign.topic, k: 6 },
      headers: { Authorization: authHeader },
    })

    if (styleMatchResponse.error) {
      console.error('Style match error:', styleMatchResponse.error)
      return new Response(JSON.stringify({ error: 'Insufficient style library' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const styleMatches: StyleMatch[] = styleMatchResponse.data.matches || []

    if (styleMatches.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Precisa de pelo menos 3 emails no estilo' }),
        {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Fetch style profile
    const { data: styleProfile } = await adminClient
      .from('style_profile')
      .select('profile_json')
      .eq('owner_id', ownerId)
      .maybeSingle()

    // Build generation prompt
    const styleExamplesText = styleMatches
      .map(
        (match, idx) =>
          `Exemplo ${idx + 1} (similaridade: ${(match.similarity * 100).toFixed(0)}%):\nAssunto: ${match.subject}\n\n${match.body}`,
      )
      .join('\n\n---\n\n')

    const profileText = styleProfile?.profile_json
      ? JSON.stringify(styleProfile.profile_json, null, 2)
      : 'Não disponível'

    const resourcesText = campaign.resources || 'Nenhum recurso fornecido'

    const prompt = `Você é um assistente que ajuda a escrever emails missionários semanais em português brasileiro.

OBJETIVO: Gerar conteúdo para uma campanha semanal com base no tema fornecido pela usuária, mantendo a voz autêntica dela.

TEMA: ${campaign.topic}

IDEIAS DA USUÁRIA:
${campaign.notes}

RECURSOS FORNECIDOS:
${resourcesText}

PERFIL DE ESTILO (análise da voz da usuária):
${profileText}

EXEMPLOS DE EMAILS ANTERIORES (mais similares ao tema):
${styleExamplesText}

INSTRUÇÕES:
1. Escreva no estilo da usuária baseando-se no perfil e exemplos
2. Use tom conversacional, caloroso e pessoal (não formal)
3. Incorpore os recursos fornecidos naturalmente
4. Para o email: mantenha a estrutura que ela costuma usar
5. Para WhatsApp: mais curto, casual, pode usar emojis
6. Para Facebook: público-geral, encorajador, apropriado para rede social

FORMATO DE SAÍDA (JSON):
{
  "email_subject": "assunto do email",
  "email_body": "corpo do email (pode ter várias linhas)",
  "whatsapp_text": "mensagem para WhatsApp",
  "facebook_text": "post para Facebook"
}`

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente que gera conteúdo para campanhas missionárias em português brasileiro. Sempre retorne JSON válido.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI error:', errorText)
      return new Response(JSON.stringify({ error: 'Generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const openaiData = await openaiResponse.json()
    const generatedContent: GeneratedContent = JSON.parse(
      openaiData.choices[0].message.content,
    )

    // Insert campaign_content
    const { error: insertError } = await adminClient.from('campaign_content').insert({
      campaign_id: campaign.id,
      email_subject: generatedContent.email_subject,
      email_body: generatedContent.email_body,
      whatsapp_text: generatedContent.whatsapp_text,
      facebook_text: generatedContent.facebook_text,
      images: [],
    })

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to save content' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        tokens_used: openaiData.usage.total_tokens,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
