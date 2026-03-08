
-- Shipment status enum
CREATE TYPE public.shipment_status AS ENUM (
  'pending', 'packed', 'dispatched', 'in_transit', 'delivered', 'delayed'
);

-- Shipments table
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_ref TEXT NOT NULL,
  buyer TEXT NOT NULL,
  style_id UUID REFERENCES public.styles(id),
  destination TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  packed_qty INTEGER NOT NULL DEFAULT 0,
  shipped_qty INTEGER NOT NULL DEFAULT 0,
  status public.shipment_status NOT NULL DEFAULT 'pending',
  ship_date DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  carrier TEXT,
  tracking_number TEXT,
  delay_reason TEXT,
  delay_days INTEGER NOT NULL DEFAULT 0,
  -- Timeline milestones
  production_complete_at TIMESTAMPTZ,
  packed_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  in_transit_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  factory_id UUID REFERENCES public.factories(id),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view shipments"
  ON public.shipments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Managers and above can manage shipments"
  ON public.shipments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
