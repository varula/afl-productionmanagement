
-- Attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID REFERENCES public.operators(id) ON DELETE CASCADE NOT NULL,
  factory_id UUID REFERENCES public.factories(id) ON DELETE CASCADE NOT NULL,
  line_id UUID REFERENCES public.lines(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present',
  shift TEXT NOT NULL DEFAULT 'day',
  check_in_time TIME,
  check_out_time TIME,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(operator_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view attendance" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Line chiefs and above can manage attendance" ON public.attendance FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'line_chief'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'line_chief'::app_role));
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cut Plans table
CREATE TABLE public.cut_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  style_id UUID REFERENCES public.styles(id) ON DELETE CASCADE NOT NULL,
  factory_id UUID REFERENCES public.factories(id) ON DELETE CASCADE NOT NULL,
  line_id UUID REFERENCES public.lines(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  planned_qty INTEGER NOT NULL DEFAULT 0,
  actual_qty INTEGER NOT NULL DEFAULT 0,
  fabric_type TEXT DEFAULT '',
  markers INTEGER NOT NULL DEFAULT 0,
  plies INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cut_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view cut_plans" ON public.cut_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers and above can manage cut_plans" ON public.cut_plans FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'line_chief'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'line_chief'::app_role));
CREATE TRIGGER update_cut_plans_updated_at BEFORE UPDATE ON public.cut_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Kaizen Logs table
CREATE TABLE public.kaizen_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id UUID REFERENCES public.factories(id) ON DELETE CASCADE NOT NULL,
  line_id UUID REFERENCES public.lines(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'process',
  before_state TEXT DEFAULT '',
  after_state TEXT DEFAULT '',
  savings_estimate NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'proposed',
  submitted_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kaizen_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view kaizen_logs" ON public.kaizen_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Line chiefs and above can manage kaizen_logs" ON public.kaizen_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'line_chief'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'line_chief'::app_role));
CREATE TRIGGER update_kaizen_logs_updated_at BEFORE UPDATE ON public.kaizen_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Maintenance Logs table
CREATE TABLE public.maintenance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id UUID REFERENCES public.factories(id) ON DELETE CASCADE NOT NULL,
  line_id UUID REFERENCES public.lines(id) ON DELETE SET NULL,
  machine_name TEXT NOT NULL,
  maintenance_type TEXT NOT NULL DEFAULT 'corrective',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'reported',
  reported_by UUID NOT NULL,
  resolved_by UUID,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view maintenance_logs" ON public.maintenance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Line chiefs and above can manage maintenance_logs" ON public.maintenance_logs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'line_chief'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'line_chief'::app_role));
CREATE TRIGGER update_maintenance_logs_updated_at BEFORE UPDATE ON public.maintenance_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
