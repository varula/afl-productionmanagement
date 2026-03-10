
ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS designation text DEFAULT 'operator',
  ADD COLUMN IF NOT EXISTS salary numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operations_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expertise_level text DEFAULT 'beginner';
