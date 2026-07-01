DROP FUNCTION IF EXISTS public.match_document_chunks(vector, integer, uuid);

CREATE OR REPLACE FUNCTION public.match_document_chunks(query_embedding vector, match_count integer DEFAULT 5)
 RETURNS TABLE(id uuid, document_id uuid, chunk_text text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.document_id, c.chunk_text, 1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks c
  WHERE c.user_id = auth.uid() AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding LIMIT match_count;
$function$;

REVOKE ALL ON FUNCTION public.match_document_chunks(vector, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector, integer) TO authenticated;