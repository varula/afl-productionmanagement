
-- Add wash-related date fields to season_plan_entries
ALTER TABLE public.season_plan_entries
  ADD COLUMN IF NOT EXISTS wash_out_date date,
  ADD COLUMN IF NOT EXISTS wash_in_house_date date,
  ADD COLUMN IF NOT EXISTS wash_delivery_date date,
  ADD COLUMN IF NOT EXISTS wash_type text NOT NULL DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS delivery_date date;

-- Also add wash fields to shipments for alignment
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS wash_out_date date,
  ADD COLUMN IF NOT EXISTS wash_in_house_date date,
  ADD COLUMN IF NOT EXISTS wash_delivery_date date;
