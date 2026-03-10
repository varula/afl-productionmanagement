
-- Add order linkage and new planning columns to season_plan_entries
ALTER TABLE public.season_plan_entries
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cut_qty INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cut_off_date DATE,
  ADD COLUMN IF NOT EXISTS ex_factory_date DATE,
  ADD COLUMN IF NOT EXISTS sew_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wash_plant TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS po_number TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS dpo_number TEXT DEFAULT '';
