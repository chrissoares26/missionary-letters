-- Seed data for campaigns
-- Run this after 01_seed_missionaries.sql
-- This creates sample campaigns with different lifecycle states

DO $$
DECLARE
  test_user_id UUID;
  campaign_draft_id UUID;
  campaign_approved_id UUID;
  campaign_sent_id UUID;
  missionary_ids UUID[];
BEGIN
  -- Get the test user
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found in auth.users. Please run seed scripts in order.';
  END IF;

  -- Get some missionary IDs for recipient examples
  SELECT ARRAY_AGG(id) INTO missionary_ids
  FROM public.missionaries
  WHERE owner_id = test_user_id AND active = true
  LIMIT 3;

  -- Create a draft campaign (most recent)
  campaign_draft_id := gen_random_uuid();
  INSERT INTO public.campaigns (id, owner_id, topic, notes, language, status, created_at)
  VALUES (
    campaign_draft_id,
    test_user_id,
    'Preparação para o Natal',
    'Falar sobre o verdadeiro significado do Natal e como podemos nos preparar espiritualmente.',
    'pt-BR',
    'draft',
    NOW() - INTERVAL '2 days'
  );

  INSERT INTO public.campaign_content (campaign_id, email_subject, email_body, whatsapp_text, facebook_text)
  VALUES (
    campaign_draft_id,
    'Pensando em você - Preparando-se para o Natal',
    E'Querido(a) {{title}} {{last_name}},\n\nEspero que esta mensagem te encontre bem e cheio(a) de energia para servir na missão {{mission_name}}!\n\nEstamos nos aproximando do Natal, uma época tão especial. Queria compartilhar com você algumas reflexões sobre como podemos nos preparar espiritualmente para esta celebração.\n\nLembre-se de que o verdadeiro presente do Natal é o amor de Cristo. Como missionário(a), você tem o privilégio de compartilhar esse amor todos os dias.\n\nEstou orando por você e por seu trabalho.\n\nCom amor,\nMaria',
    'Olá {{first_name}}! 🎄 Pensando em você nesta época de Natal. Lembre-se: você está levando a melhor mensagem ao mundo! Continue firme! 💪',
    'Reflexões de Natal: Como missionários ao redor do mundo estão preparando seus corações para celebrar o nascimento do Salvador. #Natal #Missionarios #Fe'
  );

  -- Create an approved campaign (ready to send)
  campaign_approved_id := gen_random_uuid();
  INSERT INTO public.campaigns (id, owner_id, topic, notes, language, status, approved_at, created_at)
  VALUES (
    campaign_approved_id,
    test_user_id,
    'Força e Coragem na Obra',
    'Encorajar os missionários a perseverarem mesmo nos dias difíceis.',
    'pt-BR',
    'approved',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 day'
  );

  INSERT INTO public.campaign_content (campaign_id, email_subject, email_body, whatsapp_text, facebook_text)
  VALUES (
    campaign_approved_id,
    'Pensando em você - Força para Continuar',
    E'Querido(a) {{title}} {{last_name}},\n\nSei que alguns dias na missão podem ser desafiadores, mas quero que você saiba que estou pensando em você e orando por você todos os dias.\n\nLembre-se das palavras em Josué 1:9: "Não te mandei eu? Esforça-te e tem bom ânimo; não temas, nem te espantes, porque o Senhor, teu Deus, é contigo por onde quer que andares."\n\nVocê está fazendo uma diferença! Cada pessoa que você conhece, cada conversa que você tem, cada sorriso que você compartilha - tudo isso importa.\n\nContinue firme, {{first_name}}. Você é incrível!\n\nCom muito carinho,\nMaria',
    'Oi {{first_name}}! 💪 Só passando para lembrar que você é mais forte do que pensa. Deus está com você em cada passo da missão! Acredite! ✨',
    'Uma mensagem de encorajamento para todos que estão servindo: Vocês são heróis silenciosos fazendo a diferença um dia de cada vez. Continue! 🙏 #Missionarios #Fe #Coragem'
  );

  -- Create a sent campaign with recipient logs
  campaign_sent_id := gen_random_uuid();
  INSERT INTO public.campaigns (id, owner_id, topic, notes, language, status, approved_at, created_at)
  VALUES (
    campaign_sent_id,
    test_user_id,
    'Ação de Graças e Gratidão',
    'Expressar gratidão pelos missionários e seu serviço.',
    'pt-BR',
    'sent',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '8 days'
  );

  INSERT INTO public.campaign_content (campaign_id, email_subject, email_body, whatsapp_text, facebook_text)
  VALUES (
    campaign_sent_id,
    'Pensando em você - Grata por Você',
    E'Querido(a) {{title}} {{last_name}},\n\nQuero aproveitar este momento para expressar minha profunda gratidão por você e por seu serviço dedicado na missão {{mission_name}}.\n\nSeu sacrifício, sua dedicação e seu amor pelas pessoas que você serve não passam despercebidos. Você está plantando sementes de fé que florescerão por gerações.\n\nObrigada por ser um exemplo de amor cristão e por dedicar este tempo precioso da sua vida ao serviço do Senhor.\n\nCom gratidão e amor,\nMaria',
    'Olá {{first_name}}! 🙏 Só queria dizer OBRIGADA por tudo que você está fazendo. Você é uma bênção! ❤️',
    'Agradecendo hoje por todos os jovens missionários que estão servindo ao redor do mundo. Vocês são inspiração! 🌍💙 #Gratidao #Missionarios'
  );

  -- Create recipient logs for the sent campaign (success and some failures)
  IF array_length(missionary_ids, 1) >= 3 THEN
    -- Successful send
    INSERT INTO public.campaign_recipients (
      campaign_id, missionary_id, to_email, rendered_subject, rendered_body, status, gmail_message_id, sent_at
    )
    SELECT
      campaign_sent_id,
      m.id,
      m.email,
      'Pensando em você - Grata por Você',
      REPLACE(REPLACE(REPLACE(
        E'Querido(a) ' || m.title || ' ' || m.last_name || E',\n\nQuero aproveitar este momento para expressar minha profunda gratidão por você e por seu serviço dedicado na missão ' || m.mission_name || E'.\n\nSeu sacrifício, sua dedicação e seu amor pelas pessoas que você serve não passam despercebidos. Você está plantando sementes de fé que florescerão por gerações.\n\nObrigada por ser um exemplo de amor cristão e por dedicar este tempo precioso da sua vida ao serviço do Senhor.\n\nCom gratidão e amor,\nMaria',
        '{{title}}', m.title),
        '{{last_name}}', m.last_name),
        '{{mission_name}}', m.mission_name
      ),
      'sent',
      '18c5f5e2a' || substr(md5(m.id::text), 1, 10),
      NOW() - INTERVAL '7 days' + (random() * INTERVAL '2 hours')
    FROM public.missionaries m
    WHERE m.owner_id = test_user_id AND m.active = true
    LIMIT 5;

    -- Add one failed send
    INSERT INTO public.campaign_recipients (
      campaign_id, missionary_id, to_email, rendered_subject, rendered_body, status, error, sent_at
    )
    SELECT
      campaign_sent_id,
      m.id,
      m.email,
      'Pensando em você - Grata por Você',
      'Rendered body...',
      'failed',
      'Gmail API error: Recipient email bounced - Invalid recipient',
      NOW() - INTERVAL '7 days'
    FROM public.missionaries m
    WHERE m.owner_id = test_user_id AND m.active = true
    LIMIT 1 OFFSET 5;
  END IF;

  -- Update last_sent_at for missionaries who received the sent campaign
  UPDATE public.missionaries
  SET last_sent_at = NOW() - INTERVAL '7 days'
  WHERE owner_id = test_user_id AND active = true AND id = ANY(missionary_ids);

  RAISE NOTICE 'Campaign seed data inserted successfully';
  RAISE NOTICE 'Draft campaign: %', campaign_draft_id;
  RAISE NOTICE 'Approved campaign: %', campaign_approved_id;
  RAISE NOTICE 'Sent campaign: % (with recipient logs)', campaign_sent_id;

END $$;
