-- 0009 · paper matching (PBI-015): stop trigger flag, fill RPC, positions channel
-- Idempotent: safe to re-execute. Do not wrap in BEGIN/COMMIT.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stop_triggered BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS orders_instrument_status_idx
  ON public.orders (instrument_id, status);

CREATE OR REPLACE FUNCTION public.apply_paper_fill(
  p_user_id uuid,
  p_execution_id uuid,
  p_order_id uuid,
  p_qty numeric,
  p_price numeric,
  p_order_status text,
  p_filled_qty numeric,
  p_reserved_amount numeric,
  p_stop_triggered boolean,
  p_cash_delta numeric,
  p_reserved_release numeric,
  p_position_qty numeric,
  p_position_avg_cost numeric,
  p_position_realized_pnl numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  ord public.orders%ROWTYPE;
  acc public.accounts%ROWTYPE;
  next_reserved numeric;
  computed_filled_qty numeric;
  expected_cash_delta numeric;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'FILL_FORBIDDEN';
  END IF;
  IF p_qty IS NULL OR p_qty <= 0 OR p_price IS NULL OR p_price < 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'INVALID_FILL');
  END IF;
  IF p_order_status IS NULL OR p_order_status NOT IN ('partially_filled', 'filled') THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'INVALID_STATUS');
  END IF;

  SELECT * INTO ord
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'ORDER_NOT_FOUND');
  END IF;
  IF ord.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'FILL_FORBIDDEN';
  END IF;
  IF ord.status NOT IN ('working', 'partially_filled') THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'ORDER_NOT_WORKING');
  END IF;
  IF ord.qty - ord.filled_qty < p_qty THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'OVERFILL');
  END IF;

  computed_filled_qty := ord.filled_qty + p_qty;
  IF p_filled_qty IS DISTINCT FROM computed_filled_qty THEN
    RAISE EXCEPTION
      'FILLED_QTY_MISMATCH: p_filled_qty (%) must equal ord.filled_qty (%) + p_qty (%)',
      p_filled_qty, ord.filled_qty, p_qty;
  END IF;

  IF ord.side = 'buy' THEN
    expected_cash_delta := -(p_qty * p_price);
  ELSIF ord.side = 'sell' THEN
    expected_cash_delta := p_qty * p_price;
  ELSE
    RAISE EXCEPTION 'CASH_DELTA_MISMATCH: unsupported order side %', ord.side;
  END IF;
  -- NUMERIC(20,8) scale; round so IEEE callers cannot drift past money columns
  IF round(COALESCE(p_cash_delta, 0), 8) IS DISTINCT FROM round(expected_cash_delta, 8) THEN
    RAISE EXCEPTION
      'CASH_DELTA_MISMATCH: p_cash_delta (%) must equal % (% qty % @ %)',
      p_cash_delta, expected_cash_delta, ord.side, p_qty, p_price;
  END IF;

  SELECT * INTO acc
  FROM public.accounts
  WHERE id = ord.account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason_code', 'ACCOUNT_NOT_FOUND');
  END IF;
  IF acc.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'FILL_FORBIDDEN';
  END IF;

  -- Lock the position row (if any) before upsert so concurrent fills on the
  -- same (account_id, instrument_id) cannot race avg_cost / qty / realized_pnl.
  -- First insert is serialized by the account row lock above.
  PERFORM 1
  FROM public.positions
  WHERE account_id = ord.account_id
    AND instrument_id = ord.instrument_id
  FOR UPDATE;

  INSERT INTO public.executions (
    id, order_id, user_id, account_id, instrument_id, symbol, side, qty, price
  ) VALUES (
    COALESCE(p_execution_id, gen_random_uuid()),
    ord.id, ord.user_id, ord.account_id, ord.instrument_id, ord.symbol, ord.side, p_qty, p_price
  );

  UPDATE public.orders
  SET
    filled_qty = computed_filled_qty,
    status = p_order_status,
    reserved_amount = GREATEST(0, COALESCE(p_reserved_amount, 0)),
    stop_triggered = COALESCE(p_stop_triggered, ord.stop_triggered)
  WHERE id = ord.id;

  INSERT INTO public.positions (
    user_id, account_id, instrument_id, symbol, qty, avg_cost, realized_pnl
  ) VALUES (
    ord.user_id, ord.account_id, ord.instrument_id, ord.symbol,
    p_position_qty, p_position_avg_cost, p_position_realized_pnl
  )
  ON CONFLICT (account_id, instrument_id) DO UPDATE
  SET
    qty = EXCLUDED.qty,
    avg_cost = EXCLUDED.avg_cost,
    realized_pnl = EXCLUDED.realized_pnl,
    symbol = EXCLUDED.symbol;

  next_reserved := GREATEST(0, acc.reserved_cash - GREATEST(0, COALESCE(p_reserved_release, 0)));

  UPDATE public.accounts
  SET
    cash_balance = cash_balance + COALESCE(p_cash_delta, 0),
    reserved_cash = next_reserved
  WHERE id = acc.id;

  RETURN jsonb_build_object('ok', true, 'order_id', ord.id);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_paper_fill(
  uuid, uuid, uuid, numeric, numeric, text, numeric, numeric, boolean, numeric, numeric, numeric, numeric, numeric
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_paper_fill(
  uuid, uuid, uuid, numeric, numeric, text, numeric, numeric, boolean, numeric, numeric, numeric, numeric, numeric
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_paper_fill(
  uuid, uuid, uuid, numeric, numeric, text, numeric, numeric, boolean, numeric, numeric, numeric, numeric, numeric
) TO project_admin;

INSERT INTO realtime.channels (pattern, description, enabled)
VALUES ('positions:*', 'Per-user position updates after paper fills', true)
ON CONFLICT (pattern) DO UPDATE
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled;

CREATE OR REPLACE FUNCTION public.publish_position_event(p_user_id uuid, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, realtime, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'PUBLISH_FORBIDDEN';
  END IF;
  PERFORM realtime.publish('positions:' || p_user_id::text, 'position', payload);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_position_event(uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_position_event(uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_position_event(uuid, jsonb) TO project_admin;
