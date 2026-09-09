-- 0010 · advanced orders (PBI-016): group legs + trailing stop columns
-- Idempotent: safe to re-execute. Do not wrap in BEGIN/COMMIT.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS group_id UUID;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS group_type TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS leg_role TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS group_activated BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS trail_type TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS trail_value NUMERIC(20, 8);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS high_water_mark NUMERIC(20, 8);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_group_type_chk;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_group_type_chk CHECK (group_type IS NULL OR group_type IN ('bracket', 'oco'));

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_leg_role_chk;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_leg_role_chk CHECK (
    leg_role IS NULL
    OR leg_role IN ('entry', 'take_profit', 'stop_loss', 'oco_a', 'oco_b')
  );

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_trail_type_chk;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_trail_type_chk CHECK (trail_type IS NULL OR trail_type IN ('percent', 'amount'));

CREATE INDEX IF NOT EXISTS orders_group_id_idx ON public.orders (group_id);
