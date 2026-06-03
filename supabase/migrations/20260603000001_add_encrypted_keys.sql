ALTER TABLE public.statuses
ADD COLUMN IF NOT EXISTS encrypted_keys JSONB,
ADD COLUMN IF NOT EXISTS mentioned_user_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS audio_url TEXT;
