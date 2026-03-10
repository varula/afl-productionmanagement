
-- Orders master table for full order lifecycle tracking
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id UUID REFERENCES public.factories(id) ON DELETE SET NULL,
  subcon_name TEXT DEFAULT '',
  
  -- Order identification
  season TEXT NOT NULL DEFAULT '',
  master_style_no TEXT NOT NULL DEFAULT '',
  style_id UUID REFERENCES public.styles(id) ON DELETE SET NULL,
  style_description TEXT DEFAULT '',
  
  -- BOM & Color
  bom TEXT DEFAULT '',
  bom_cc_description TEXT DEFAULT '',
  color_description TEXT DEFAULT '',
  
  -- Market & Channel
  market TEXT DEFAULT '',
  channel TEXT DEFAULT '',
  
  -- Quantities
  published_units INTEGER NOT NULL DEFAULT 0,
  confirmed_units INTEGER NOT NULL DEFAULT 0,
  final_quantity INTEGER NOT NULL DEFAULT 0,
  shipped_qty INTEGER NOT NULL DEFAULT 0,
  
  -- PO & DPO
  po_number TEXT DEFAULT '',
  dpo_number TEXT DEFAULT '',
  dpo_qty INTEGER NOT NULL DEFAULT 0,
  
  -- Dates
  trigger_date DATE,
  booking_period TEXT DEFAULT '',
  ship_cancel_date DATE,
  published_indc_date DATE,
  
  -- Fabric
  bulk_yy NUMERIC DEFAULT 0,
  total_fabric_requirement NUMERIC DEFAULT 0,
  rd_number TEXT DEFAULT '',
  fabric_description TEXT DEFAULT '',
  mill TEXT DEFAULT '',
  
  -- Linking
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  
  -- Status & meta
  status TEXT NOT NULL DEFAULT 'pending',
  remarks TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- View policy
CREATE POLICY "Authenticated users can view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (true);

-- Manage policy  
CREATE POLICY "Managers and above can manage orders"
  ON public.orders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Updated_at trigger
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
