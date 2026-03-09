
-- Sample orders table for tracking sample making
CREATE TABLE public.sample_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE,
  style_id uuid REFERENCES public.styles(id) ON DELETE SET NULL,
  line_id uuid REFERENCES public.lines(id) ON DELETE SET NULL,
  sample_type text NOT NULL DEFAULT 'proto', -- proto, fit, size_set, pp, top, shipment
  quantity integer NOT NULL DEFAULT 1,
  completed_qty integer NOT NULL DEFAULT 0,
  requested_by text DEFAULT '',
  requested_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  completed_date date,
  status text NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  remarks text DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sample_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sample_orders" ON public.sample_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers and above can manage sample_orders" ON public.sample_orders FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
