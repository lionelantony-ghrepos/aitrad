-- 0015 · news_embeddings + embed dead-letter + hybrid search (PBI-023)
-- Spec prompt called this 0010; 0010 is already advanced-orders.
-- Idempotent. Do not wrap in BEGIN/COMMIT.
-- Corpus: news_items only. Engineering knowledge base is a separate corpus.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.news_embeddings (
  news_id UUID PRIMARY KEY REFERENCES public.news_items (id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  embedding_model TEXT NOT NULL,
  embedded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS news_embeddings_ivfflat_cosine_idx
  ON public.news_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

ALTER TABLE public.news_embeddings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.news_embeddings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.news_embeddings TO project_admin;

CREATE TABLE IF NOT EXISTS public.news_embed_dead_letters (
  news_id UUID PRIMARY KEY REFERENCES public.news_items (id) ON DELETE CASCADE,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL,
  last_http_status INTEGER,
  dead BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT news_embed_dead_letters_attempts_chk CHECK (attempts >= 0),
  CONSTRAINT news_embed_dead_letters_error_nonempty CHECK (char_length(btrim(last_error)) > 0)
);

DROP TRIGGER IF EXISTS news_embed_dead_letters_set_updated_at ON public.news_embed_dead_letters;
CREATE TRIGGER news_embed_dead_letters_set_updated_at
  BEFORE UPDATE ON public.news_embed_dead_letters
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.news_embed_dead_letters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.news_embed_dead_letters FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.news_embed_dead_letters TO project_admin;

CREATE OR REPLACE FUNCTION public.list_pending_news_embeds(p_limit integer, p_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  ts timestamptz,
  headline text,
  body text,
  source text,
  symbols text[],
  sector text,
  sentiment numeric,
  event_type text,
  attempts integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT
    n.id,
    n.ts,
    n.headline,
    n.body,
    n.source,
    n.symbols,
    n.sector,
    n.sentiment,
    n.event_type,
    COALESCE(d.attempts, 0) AS attempts
  FROM public.news_items n
  LEFT JOIN public.news_embeddings e ON e.news_id = n.id
  LEFT JOIN public.news_embed_dead_letters d ON d.news_id = n.id
  WHERE e.news_id IS NULL
    AND COALESCE(d.dead, false) = false
    AND (p_ids IS NULL OR cardinality(p_ids) = 0 OR n.id = ANY (p_ids))
  ORDER BY n.ts DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 32), 200));
$$;

REVOKE ALL ON FUNCTION public.list_pending_news_embeds(integer, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_pending_news_embeds(integer, uuid[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_pending_news_embeds(integer, uuid[]) TO project_admin;

CREATE OR REPLACE FUNCTION public.search_news_hybrid(
  query_embedding vector(1536),
  p_symbols text[] DEFAULT NULL,
  p_since timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  ts timestamptz,
  headline text,
  body text,
  source text,
  symbols text[],
  sector text,
  sentiment numeric,
  event_type text,
  score double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT
    n.id,
    n.ts,
    n.headline,
    n.body,
    n.source,
    n.symbols,
    n.sector,
    n.sentiment,
    n.event_type,
    (1 - (e.embedding <=> query_embedding))::double precision AS score
  FROM public.news_embeddings e
  INNER JOIN public.news_items n ON n.id = e.news_id
  WHERE (p_symbols IS NULL OR cardinality(p_symbols) = 0 OR n.symbols && p_symbols)
    AND (p_since IS NULL OR n.ts >= p_since)
  ORDER BY e.embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
$$;

REVOKE ALL ON FUNCTION public.search_news_hybrid(vector, text[], timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_news_hybrid(vector, text[], timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_news_hybrid(vector, text[], timestamptz, integer) TO project_admin;
