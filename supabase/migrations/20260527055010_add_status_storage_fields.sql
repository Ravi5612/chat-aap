ALTER TABLE public.statuses 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS storage_paths TEXT[];
