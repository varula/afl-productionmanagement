
-- Add PCD, PSD, inspection date, sew complete qty to shipments
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS plan_cut_date date,
  ADD COLUMN IF NOT EXISTS plan_sew_date date,
  ADD COLUMN IF NOT EXISTS inspection_date date,
  ADD COLUMN IF NOT EXISTS sew_complete_qty integer NOT NULL DEFAULT 0;

-- Create season plan entries table
CREATE TABLE public.season_plan_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE,
  style_id uuid REFERENCES public.styles(id) ON DELETE CASCADE NOT NULL,
  shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL,
  line_id uuid REFERENCES public.lines(id) ON DELETE SET NULL,
  order_qty integer NOT NULL DEFAULT 0,
  plan_cut_date date,
  plan_sew_date date,
  sew_complete_date date,
  inspection_date date,
  ship_date date,
  sew_complete_qty integer NOT NULL DEFAULT 0,
  target_per_day integer NOT NULL DEFAULT 0,
  planned_days integer NOT NULL DEFAULT 0,
  remarks text,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.season_plan_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view season_plan_entries"
  ON public.season_plan_entries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers and above can manage season_plan_entries"
  ON public.season_plan_entries FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
