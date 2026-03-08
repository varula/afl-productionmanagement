
CREATE TABLE public.alert_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'production',
  is_enabled boolean NOT NULL DEFAULT false,
  threshold_value numeric NULL,
  threshold_unit text NULL,
  whatsapp_recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (alert_type)
);

ALTER TABLE public.alert_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alert configs"
  ON public.alert_configurations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage alert configs"
  ON public.alert_configurations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.alert_configurations (alert_type, label, description, category, threshold_value, threshold_unit) VALUES
  ('downtime_exceeded', 'Downtime Exceeded', 'Alert when a line''s downtime exceeds threshold in a single hour', 'production', 30, 'minutes'),
  ('efficiency_below_target', 'Efficiency Below Target', 'Alert when line efficiency drops below threshold', 'production', 50, 'percent'),
  ('quality_dhu_high', 'High DHU Rate', 'Alert when Defects per Hundred Units exceeds threshold', 'quality', 5, 'percent'),
  ('absenteeism_high', 'High Absenteeism', 'Alert when absenteeism rate exceeds threshold', 'workforce', 15, 'percent'),
  ('shipment_delayed', 'Shipment Delayed', 'Alert when a shipment is marked as delayed', 'logistics', NULL, NULL),
  ('machine_breakdown', 'Machine Breakdown', 'Alert on any machine breakdown event', 'production', NULL, NULL),
  ('style_changeover', 'Style Changeover', 'Alert when a style changeover begins', 'production', NULL, NULL),
  ('low_output_hour', 'Low Hourly Output', 'Alert when hourly output falls below percentage of target', 'production', 60, 'percent');
