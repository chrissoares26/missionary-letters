-- Fix mutable search_path on public functions (security advisor lint 0011)
-- Pinning search_path prevents search_path injection attacks.

CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_style_emails(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.0,
  match_count integer DEFAULT 6,
  filter_owner_id uuid DEFAULT NULL::uuid
)
  RETURNS TABLE(
    id uuid,
    subject text,
    body text,
    source_label text,
    created_at timestamp with time zone,
    similarity double precision
  )
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    style_emails.id,
    style_emails.subject,
    style_emails.body,
    style_emails.source_label,
    style_emails.created_at,
    1 - (style_emails.embedding <=> query_embedding) AS similarity
  FROM style_emails
  WHERE
    style_emails.embedding IS NOT NULL
    AND (filter_owner_id IS NULL OR style_emails.owner_id = filter_owner_id)
    AND 1 - (style_emails.embedding <=> query_embedding) >= match_threshold
  ORDER BY style_emails.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;
