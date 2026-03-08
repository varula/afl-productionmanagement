
-- Create section enum for MIS document categories
CREATE TYPE public.mis_section AS ENUM (
  'pre_production',
  'cutting_production',
  'cutting_quality',
  'sewing_production',
  'sewing_quality',
  'finishing_production',
  'finishing_quality',
  'general',
  'stores'
);

-- Create MIS documents table with JSONB for flexible form data
CREATE TABLE public.mis_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section mis_section NOT NULL,
  document_type TEXT NOT NULL,
  document_number INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  style_id UUID REFERENCES public.styles(id) ON DELETE SET NULL,
  line_id UUID REFERENCES public.lines(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  remarks TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mis_documents ENABLE ROW LEVEL SECURITY;

-- View policy: all authenticated users can view
CREATE POLICY "Authenticated users can view mis_documents"
  ON public.mis_documents FOR SELECT
  TO authenticated
  USING (true);

-- Manage policy: admin, manager, line_chief can insert/update/delete
CREATE POLICY "Managers and above can manage mis_documents"
  ON public.mis_documents FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'line_chief')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'line_chief')
  );

-- Updated_at trigger
CREATE TRIGGER update_mis_documents_updated_at
  BEFORE UPDATE ON public.mis_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
