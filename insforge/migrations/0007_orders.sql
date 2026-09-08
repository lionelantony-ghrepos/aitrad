-- 0007 · orders (PBI-013 ticket persist; PBI-014 extends FSM / reserve / executions)
-- Idempotent: safe to re-execute. Do not wrap in BEGIN/COMMIT.

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  qty NUMERIC(20, 8) NOT NULL,
  filled_qty NUMERIC(20, 8) NOT NULL DEFAULT 0,
  order_type TEXT NOT NULL,
  limit_price NUMERIC(20, 8),
  stop_price NUMERIC(20, 8),
  tif TEXT NOT NULL,
  status TEXT NOT NULL,
  reject_reason TEXT,
  rule_audit_id TEXT,
  parent_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_side_chk CHECK (side IN ('buy', 'sell')),
  CONSTRAINT orders_type_chk CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
  CONSTRAINT orders_tif_chk CHECK (tif IN ('DAY', 'GTC', 'IOC')),
  CONSTRAINT orders_status_chk CHECK (
    status IN (
      'draft',
      'validated',
      'accepted',
      'working',
      'partially_filled',
      'filled',
      'cancelled',
      'rejected',
      'expired'
    )
  )
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_account_id_idx ON public.orders (account_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);

DROP TRIGGER IF EXISTS orders_set_updated_at ON public.orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_insert_own ON public.orders;
CREATE POLICY orders_insert_own ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_update_own ON public.orders;
CREATE POLICY orders_update_own ON public.orders
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_delete_own ON public.orders;
CREATE POLICY orders_delete_own ON public.orders
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
