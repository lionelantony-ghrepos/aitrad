-- 0012 · fundamentals (PBI-020)
-- Spec prompt called this 0007; 0007 is already orders.
-- Idempotent. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.fundamentals (
  instrument_id UUID PRIMARY KEY REFERENCES public.instruments (id) ON DELETE CASCADE,
  metrics JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fundamentals_metrics_object CHECK (jsonb_typeof(metrics) = 'object'),
  CONSTRAINT fundamentals_metrics_groups CHECK (
    metrics ? 'valuation'
    AND metrics ? 'income'
    AND metrics ? 'margins'
    AND metrics ? 'dividends'
    AND metrics ? 'ranges'
    AND metrics ? 'analyst'
  )
);

DROP TRIGGER IF EXISTS fundamentals_set_updated_at ON public.fundamentals;
CREATE TRIGGER fundamentals_set_updated_at
  BEFORE UPDATE ON public.fundamentals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.fundamentals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fundamentals_select_public ON public.fundamentals;
CREATE POLICY fundamentals_select_public ON public.fundamentals
  FOR SELECT TO anon, authenticated
  USING (true);

REVOKE ALL ON TABLE public.fundamentals FROM anon, authenticated;
GRANT SELECT ON TABLE public.fundamentals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fundamentals TO project_admin;
