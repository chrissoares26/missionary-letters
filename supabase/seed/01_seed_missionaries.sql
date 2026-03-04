-- Seed data for local development and testing
-- Run this after creating a test user account

-- Note: Replace the UUID below with your actual test user ID from auth.users
-- You can get this by running: SELECT id FROM auth.users;
-- For now, we'll use a variable approach

DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get the first user from auth.users (or create one via signup first)
  -- For local dev, you should sign up with a test account first
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found in auth.users. Please sign up with a test account first.';
  END IF;

  -- Insert profile for test user if not exists
  INSERT INTO public.profiles (id, display_name, default_language, signature, default_subject_prefix)
  VALUES (
    test_user_id,
    'Maria Santos',
    'pt-BR',
    E'Com amor,\nMaria',
    'Pensando em você - '
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert active missionaries (mission ends in the future)
  INSERT INTO public.missionaries (owner_id, title, first_name, last_name, email, mission_name, mission_end_date, active, notes)
  VALUES
    -- Active missionaries with future end dates
    (test_user_id, 'Elder', 'João', 'Silva', 'joao.silva@missionary.org', 'Brazil São Paulo South Mission', CURRENT_DATE + INTERVAL '6 months', true, 'Muito dedicado e esforçado'),
    (test_user_id, 'Sister', 'Ana', 'Costa', 'ana.costa@missionary.org', 'Brazil Rio de Janeiro Mission', CURRENT_DATE + INTERVAL '8 months', true, 'Chegou há 3 meses'),
    (test_user_id, 'Elder', 'Pedro', 'Oliveira', 'pedro.oliveira@missionary.org', 'Brazil Curitiba Mission', CURRENT_DATE + INTERVAL '4 months', true, 'Companheiro do Elder Silva'),
    (test_user_id, 'Sister', 'Beatriz', 'Lima', 'beatriz.lima@missionary.org', 'Brazil Brasília Mission', CURRENT_DATE + INTERVAL '10 months', true, NULL),
    (test_user_id, 'Elder', 'Lucas', 'Santos', 'lucas.santos@missionary.org', 'Brazil Manaus Mission', CURRENT_DATE + INTERVAL '5 months', true, 'Líder de zona'),
    (test_user_id, 'Sister', 'Carla', 'Ferreira', 'carla.ferreira@missionary.org', 'Brazil Recife Mission', CURRENT_DATE + INTERVAL '7 months', true, NULL),

    -- Active missionaries without end date set
    (test_user_id, 'Elder', 'Rafael', 'Almeida', 'rafael.almeida@missionary.org', 'Brazil Fortaleza Mission', NULL, true, 'Data de término ainda não definida'),

    -- Inactive missionaries (mission already ended)
    (test_user_id, 'Elder', 'Thiago', 'Rodrigues', 'thiago.rodrigues@missionary.org', 'Brazil Porto Alegre Mission', CURRENT_DATE - INTERVAL '2 months', false, 'Missão concluída em ' || TO_CHAR(CURRENT_DATE - INTERVAL '2 months', 'DD/MM/YYYY')),
    (test_user_id, 'Sister', 'Juliana', 'Martins', 'juliana.martins@missionary.org', 'Brazil Salvador Mission', CURRENT_DATE - INTERVAL '5 months', false, 'Retornou para casa'),

    -- Inactive missionary (manually deactivated, not by end date)
    (test_user_id, 'Elder', 'Felipe', 'Souza', 'felipe.souza@missionary.org', 'Brazil Belo Horizonte Mission', CURRENT_DATE + INTERVAL '3 months', false, 'Transferido para outra área - remover da lista')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed data inserted successfully for user_id: %', test_user_id;
  RAISE NOTICE 'Active missionaries: 7';
  RAISE NOTICE 'Inactive missionaries: 3';

END $$;
