
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'line_chief', 'operator');

CREATE TYPE public.product_category AS ENUM (
  'basic_5pkt_pants_shorts',
  'fashion_denim_bottoms',
  'skirts_skorts',
  'carpenter',
  'cargo',
  'long_short_sleeve_shirts',
  'sleeveless',
  'vest',
  'jackets_coats',
  'dresses',
  'others'
);

CREATE TYPE public.operator_grade AS ENUM ('A', 'B', 'C', 'D');

CREATE TYPE public.downtime_reason_type AS ENUM (
  'machine_breakdown',
  'no_feeding',
  'power_failure',
  'style_changeover',
  'quality_issue',
  'material_shortage',
  'absenteeism',
  'meeting',
  'maintenance',
  'other'
);

-- =============================================
-- UTILITY: updated_at trigger function
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- TABLES
-- =============================================

-- Factories
CREATE TABLE public.factories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_factories_updated_at BEFORE UPDATE ON public.factories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Floors
CREATE TABLE public.floors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_floors_updated_at BEFORE UPDATE ON public.floors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lines
CREATE TABLE public.lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  line_number INT NOT NULL,
  type TEXT DEFAULT 'sewing',
  machine_count INT NOT NULL DEFAULT 0,
  operator_count INT NOT NULL DEFAULT 0,
  helper_count INT NOT NULL DEFAULT 0,
  ie_name TEXT,
  supervisor TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lines ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_lines_updated_at BEFORE UPDATE ON public.lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Styles
CREATE TABLE public.styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  style_no TEXT NOT NULL UNIQUE,
  buyer TEXT NOT NULL,
  product_category public.product_category NOT NULL DEFAULT 'others',
  smv NUMERIC(8,4) NOT NULL,
  sam NUMERIC(8,4) NOT NULL,
  target_efficiency NUMERIC(5,2) NOT NULL DEFAULT 60.00,
  operation_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_styles_updated_at BEFORE UPDATE ON public.styles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  factory_id UUID REFERENCES public.factories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User Roles (separate table per security best practices)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Production Plans
CREATE TABLE public.production_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  line_id UUID NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  style_id UUID NOT NULL REFERENCES public.styles(id) ON DELETE CASCADE,
  target_qty INT NOT NULL DEFAULT 0,
  working_hours NUMERIC(4,2) NOT NULL DEFAULT 8.00,
  planned_efficiency NUMERIC(5,2) NOT NULL DEFAULT 60.00,
  target_efficiency NUMERIC(5,2) NOT NULL DEFAULT 65.00,
  ie_person_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  production_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  planned_operators INT NOT NULL DEFAULT 0,
  planned_helpers INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, line_id)
);
ALTER TABLE public.production_plans ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_production_plans_updated_at BEFORE UPDATE ON public.production_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Hourly Production
CREATE TABLE public.hourly_production (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.production_plans(id) ON DELETE CASCADE,
  hour_slot INT NOT NULL CHECK (hour_slot BETWEEN 1 AND 16),
  produced_qty INT NOT NULL DEFAULT 0,
  defects INT NOT NULL DEFAULT 0,
  rework INT NOT NULL DEFAULT 0,
  checked_qty INT NOT NULL DEFAULT 0,
  downtime_minutes INT NOT NULL DEFAULT 0,
  npt_minutes INT NOT NULL DEFAULT 0,
  operators_present INT NOT NULL DEFAULT 0,
  helpers_present INT NOT NULL DEFAULT 0,
  downtime_reason public.downtime_reason_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, hour_slot)
);
ALTER TABLE public.hourly_production ENABLE ROW LEVEL SECURITY;

-- Downtime
CREATE TABLE public.downtime (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_id UUID NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.production_plans(id) ON DELETE SET NULL,
  reason public.downtime_reason_type NOT NULL,
  minutes INT NOT NULL DEFAULT 0,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.downtime ENABLE ROW LEVEL SECURITY;

-- Operators
CREATE TABLE public.operators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  employee_no TEXT NOT NULL UNIQUE,
  grade public.operator_grade NOT NULL DEFAULT 'C',
  line_id UUID REFERENCES public.lines(id) ON DELETE SET NULL,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON public.operators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Style Changeovers
CREATE TABLE public.style_changeovers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_id UUID NOT NULL REFERENCES public.lines(id) ON DELETE CASCADE,
  from_style_id UUID REFERENCES public.styles(id) ON DELETE SET NULL,
  to_style_id UUID NOT NULL REFERENCES public.styles(id) ON DELETE CASCADE,
  changeover_date DATE NOT NULL,
  hours_lost NUMERIC(5,2) NOT NULL DEFAULT 0,
  learning_curve_days INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.style_changeovers ENABLE ROW LEVEL SECURITY;

-- Factory Daily Summary (for KPI tracking)
CREATE TABLE public.factory_daily_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id UUID NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_output INT NOT NULL DEFAULT 0,
  total_target INT NOT NULL DEFAULT 0,
  total_manpower INT NOT NULL DEFAULT 0,
  total_machines INT NOT NULL DEFAULT 0,
  total_working_minutes NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_downtime_minutes NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_npt_minutes NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_defects INT NOT NULL DEFAULT 0,
  total_checked INT NOT NULL DEFAULT 0,
  total_rework INT NOT NULL DEFAULT 0,
  weighted_smv NUMERIC(10,4) NOT NULL DEFAULT 0,
  planned_operators INT NOT NULL DEFAULT 0,
  present_operators INT NOT NULL DEFAULT 0,
  efficiency_pct NUMERIC(5,2) DEFAULT 0,
  dhu_pct NUMERIC(5,2) DEFAULT 0,
  absenteeism_pct NUMERIC(5,2) DEFAULT 0,
  npt_pct NUMERIC(5,2) DEFAULT 0,
  rft_pct NUMERIC(5,2) DEFAULT 0,
  lost_time_pct NUMERIC(5,2) DEFAULT 0,
  man_to_machine_ratio NUMERIC(5,2) DEFAULT 0,
  capacity_utilization_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(factory_id, date)
);
ALTER TABLE public.factory_daily_summary ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_factory_daily_summary_updated_at BEFORE UPDATE ON public.factory_daily_summary FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Factories: authenticated users can read, admins can write
CREATE POLICY "Authenticated users can view factories" ON public.factories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage factories" ON public.factories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Floors
CREATE POLICY "Authenticated users can view floors" ON public.floors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage floors" ON public.floors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Lines
CREATE POLICY "Authenticated users can view lines" ON public.lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can manage lines" ON public.lines FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Styles
CREATE POLICY "Authenticated users can view styles" ON public.styles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can manage styles" ON public.styles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User Roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Production Plans
CREATE POLICY "Authenticated users can view plans" ON public.production_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers and above can manage plans" ON public.production_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Hourly Production
CREATE POLICY "Authenticated users can view hourly production" ON public.hourly_production FOR SELECT TO authenticated USING (true);
CREATE POLICY "Line chiefs and above can manage hourly production" ON public.hourly_production FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'line_chief')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'line_chief'));

-- Downtime
CREATE POLICY "Authenticated users can view downtime" ON public.downtime FOR SELECT TO authenticated USING (true);
CREATE POLICY "Line chiefs and above can manage downtime" ON public.downtime FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'line_chief')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'line_chief'));

-- Operators
CREATE POLICY "Authenticated users can view operators" ON public.operators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can manage operators" ON public.operators FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Style Changeovers
CREATE POLICY "Authenticated users can view changeovers" ON public.style_changeovers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers and above can manage changeovers" ON public.style_changeovers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Factory Daily Summary
CREATE POLICY "Authenticated users can view summaries" ON public.factory_daily_summary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and managers can manage summaries" ON public.factory_daily_summary FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_floors_factory ON public.floors(factory_id);
CREATE INDEX idx_lines_floor ON public.lines(floor_id);
CREATE INDEX idx_production_plans_date ON public.production_plans(date);
CREATE INDEX idx_production_plans_line ON public.production_plans(line_id);
CREATE INDEX idx_hourly_production_plan ON public.hourly_production(plan_id);
CREATE INDEX idx_downtime_line ON public.downtime(line_id);
CREATE INDEX idx_downtime_plan ON public.downtime(plan_id);
CREATE INDEX idx_operators_factory ON public.operators(factory_id);
CREATE INDEX idx_operators_line ON public.operators(line_id);
CREATE INDEX idx_factory_daily_summary_date ON public.factory_daily_summary(factory_id, date);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
