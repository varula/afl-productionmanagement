
-- Sidebar filter groups table
CREATE TABLE public.sidebar_filter_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route text NOT NULL,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sidebar filter items table
CREATE TABLE public.sidebar_filter_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.sidebar_filter_groups(id) ON DELETE CASCADE,
  label text NOT NULL,
  filter_key text NOT NULL,
  badge_value text,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sidebar_filter_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sidebar_filter_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Authenticated users can view filter groups"
  ON public.sidebar_filter_groups FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view filter items"
  ON public.sidebar_filter_items FOR SELECT TO authenticated
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage filter groups"
  ON public.sidebar_filter_groups FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage filter items"
  ON public.sidebar_filter_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_filter_groups_route ON public.sidebar_filter_groups(route);
CREATE INDEX idx_filter_items_group ON public.sidebar_filter_items(group_id);
