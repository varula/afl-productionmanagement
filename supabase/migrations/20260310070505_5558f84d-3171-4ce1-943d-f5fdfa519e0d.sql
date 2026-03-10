
-- Add worker_type to operators (operator or helper)
ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS worker_type text NOT NULL DEFAULT 'operator';

-- Create operator_skills table to track which operations each worker can handle
CREATE TABLE public.operator_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  operation_name text NOT NULL,
  skill_level text NOT NULL DEFAULT 'learning',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one skill per operator per operation
ALTER TABLE public.operator_skills ADD CONSTRAINT unique_operator_skill UNIQUE (operator_id, operation_name);

-- Enable RLS
ALTER TABLE public.operator_skills ENABLE ROW LEVEL SECURITY;

-- RLS: everyone can read
CREATE POLICY "Authenticated users can view operator_skills"
  ON public.operator_skills FOR SELECT TO authenticated
  USING (true);

-- RLS: admins and managers can manage
CREATE POLICY "Admins and managers can manage operator_skills"
  ON public.operator_skills FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
