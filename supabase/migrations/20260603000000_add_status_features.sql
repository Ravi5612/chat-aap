ALTER TABLE public.statuses
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS mentioned_user_ids UUID[] DEFAULT '{}';
