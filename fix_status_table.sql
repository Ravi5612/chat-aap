ALTER TABLE public.statuses
ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS audio_url text,
ADD COLUMN IF NOT EXISTS storage_paths text[],
ADD COLUMN IF NOT EXISTS background_color text,
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_type text DEFAULT 'all',
ADD COLUMN IF NOT EXISTS viewer_ids uuid[],
ADD COLUMN IF NOT EXISTS mentioned_user_ids uuid[],
ADD COLUMN IF NOT EXISTS encrypted_keys jsonb;
