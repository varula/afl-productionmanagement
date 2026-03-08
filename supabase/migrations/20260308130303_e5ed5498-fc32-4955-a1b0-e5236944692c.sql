
ALTER TABLE public.hourly_production ADD COLUMN IF NOT EXISTS overtime_minutes integer NOT NULL DEFAULT 0;
