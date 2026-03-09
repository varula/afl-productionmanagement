
-- IE Documents table for Skill Matrix, Operation Breakdown, Capacity Study, Time Study, Machine Inventory
CREATE TABLE public.ie_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid REFERENCES public.factories(id) ON DELETE CASCADE,
  line_id uuid REFERENCES public.lines(id) ON DELETE SET NULL,
  style_id uuid REFERENCES public.styles(id) ON DELETE SET NULL,
  category text NOT NULL, -- skill_matrix, operation_breakdown, capacity_study, time_study, machine_inventory
  title text NOT NULL,
  description text DEFAULT '',
  file_path text, -- storage path
  file_name text,
  file_size integer DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ie_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ie_documents" ON public.ie_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers and above can manage ie_documents" ON public.ie_documents FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Storage bucket for IE file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('ie-documents', 'ie-documents', true);

CREATE POLICY "Authenticated users can view IE files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ie-documents');
CREATE POLICY "Managers can upload IE files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ie-documents' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Managers can delete IE files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ie-documents' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
