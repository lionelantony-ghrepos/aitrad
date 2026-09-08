-- 0008 · order pipeline (PBI-014): buying-power reserve, executions, positions, snapshots, orders channel
-- Spec prompt said migration 0005; 0005 is rules storage and 0007 created orders. This file extends that.
-- Idempotent: safe to re-execute. Do not wrap in BEGIN/COMMIT.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS reserved_cash NUMERIC(20, 8) NOT NULL DEFAULT 0;

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_reserved_cash_non_negative;
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_reserved_cash_non_negative CHECK (reserved_cash >= 0);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reserved_amount NUMERIC(20, 8) NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_reserved_amount_non_negative;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_reserved_amount_non_negative CHECK (reserved_amount >= 0);

CREATE TABLE IF NOT EXISTS public.executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  qty NUMERIC(20, 8) NOT NULL,
  price NUMERIC(20, 8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT executions_side_chk CHECK (side IN ('buy', 'sell')),
  CONSTRAINT executions_qty_positive CHECK (qty > 0),
  CONSTRAINT executions_price_non_negative CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS executions_order_id_idx ON public.executions (order_id);
CREATE INDEX IF NOT EXISTS executions_user_id_idx ON public.executions (user_id);

CREATE OR REPLACE FUNCTION public.executions_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'executions is append-only';
END;
$$;

DROP TRIGGER IF EXISTS executions_no_update ON public.executions;
CREATE TRIGGER executions_no_update
  BEFORE UPDATE ON public.executions
  FOR EACH ROW
  EXECUTE FUNCTION public.executions_append_only();

DROP TRIGGER IF EXISTS executions_no_delete ON public.executions;
CREATE TRIGGER executions_no_delete
  BEFORE DELETE ON public.executions
  FOR EACH ROW
  EXECUTE FUNCTION public.executions_append_only();

CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  symbol TEXT NOT NULL,
  qty NUMERIC(20, 8) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(20, 8) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(20, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT positions_account_instrument_key UNIQUE (account_id, instrument_id)
);

CREATE INDEX IF NOT EXISTS positions_user_id_idx ON public.positions (user_id);

DROP TRIGGER IF EXISTS positions_set_updated_at ON public.positions;
CREATE TRIGGER positions_set_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  as_of_date DATE NOT NULL,
  equity NUMERIC(20, 8) NOT NULL,
  cash NUMERIC(20, 8) NOT NULL,
  buying_power NUMERIC(20, 8) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT portfolio_snapshots_account_date_key UNIQUE (account_id, as_of_date)
);

CREATE INDEX IF NOT EXISTS portfolio_snapshots_user_id_idx ON public.portfolio_snapshots (user_id);

ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS executions_select_own ON public.executions;
CREATE POLICY executions_select_own ON public.executions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS executions_insert_own ON public.executions;
CREATE POLICY executions_insert_own ON public.executions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS positions_select_own ON public.positions;
CREATE POLICY positions_select_own ON public.positions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS positions_insert_own ON public.positions;
CREATE POLICY positions_insert_own ON public.positions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS positions_update_own ON public.positions;
CREATE POLICY positions_update_own ON public.positions
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS positions_delete_own ON public.positions;
CREATE POLICY positions_delete_own ON public.positions
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS portfolio_snapshots_select_own ON public.portfolio_snapshots;
CREATE POLICY portfolio_snapshots_select_own ON public.portfolio_snapshots
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS portfolio_snapshots_insert_own ON public.portfolio_snapshots;
CREATE POLICY portfolio_snapshots_insert_own ON public.portfolio_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.executions FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.executions TO authenticated;

REVOKE ALL ON TABLE public.positions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.positions TO authenticated;

REVOKE ALL ON TABLE public.portfolio_snapshots FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.portfolio_snapshots TO authenticated;

CREATE OR REPLACE FUNCTION public.reserve_buying_power(p_account_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  rec public.accounts%ROWTYPE;
  bp numeric;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'RISK_BUYING_POWER');
  END IF;

  SELECT * INTO rec
  FROM public.accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'ACCOUNT_NOT_FOUND');
  END IF;

  IF rec.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'RESERVE_FORBIDDEN';
  END IF;

  bp := rec.cash_balance - rec.reserved_cash;
  IF p_amount = 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'cash_balance', rec.cash_balance,
      'reserved_cash', rec.reserved_cash,
      'buying_power', bp
    );
  END IF;

  IF bp < p_amount THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason_code', 'RISK_BUYING_POWER',
      'buying_power', bp,
      'reserved_cash', rec.reserved_cash,
      'cash_balance', rec.cash_balance
    );
  END IF;

  UPDATE public.accounts
  SET reserved_cash = reserved_cash + p_amount
  WHERE id = p_account_id;

  RETURN jsonb_build_object(
    'ok', true,
    'cash_balance', rec.cash_balance,
    'reserved_cash', rec.reserved_cash + p_amount,
    'buying_power', rec.cash_balance - (rec.reserved_cash + p_amount)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_buying_power(p_account_id uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  rec public.accounts%ROWTYPE;
  next_reserved numeric;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'INVALID_RELEASE');
  END IF;

  SELECT * INTO rec
  FROM public.accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'ACCOUNT_NOT_FOUND');
  END IF;

  IF rec.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'RELEASE_FORBIDDEN';
  END IF;

  next_reserved := GREATEST(0, rec.reserved_cash - p_amount);

  UPDATE public.accounts
  SET reserved_cash = next_reserved
  WHERE id = p_account_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reserved_cash', next_reserved,
    'buying_power', rec.cash_balance - next_reserved
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_buying_power(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_buying_power(uuid, numeric) TO authenticated;

REVOKE ALL ON FUNCTION public.release_buying_power(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_buying_power(uuid, numeric) TO authenticated;

INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('orders:*', 'Per-user order lifecycle events', true)
ON CONFLICT (pattern) DO UPDATE
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled;

CREATE OR REPLACE FUNCTION public.publish_order_event(p_user_id uuid, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, realtime, pg_temp
AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'PUBLISH_FORBIDDEN';
  END IF;
  PERFORM realtime.publish('orders:' || p_user_id::text, 'order', payload);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_order_event(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_order_event(uuid, jsonb) TO authenticated;
