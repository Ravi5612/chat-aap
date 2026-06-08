-- 1. Add Warrior columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_warrior BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS missions_completed INTEGER DEFAULT 0;

-- 2. Create emergencies table
CREATE TABLE IF NOT EXISTS public.emergencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  share_phone BOOLEAN DEFAULT false,
  share_email BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active', -- active, resolved, cancelled
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create emergency_responses table
CREATE TABLE IF NOT EXISTS public.emergency_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  emergency_id UUID REFERENCES public.emergencies(id) ON DELETE CASCADE,
  warrior_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'helping', -- ignored, helping, verified
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(emergency_id, warrior_id)
);

-- 4. Enable RLS
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_responses ENABLE ROW LEVEL SECURITY;

-- 5. Create basic policies for development (can be restricted later)
DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.emergencies;
CREATE POLICY "Allow all actions for authenticated users" ON public.emergencies FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.emergency_responses;
CREATE POLICY "Allow all actions for authenticated users" ON public.emergency_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Ensure they are in the realtime publication
BEGIN;
  DO $$ 
  BEGIN
    -- Add emergencies if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'emergencies') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
    END IF;
    -- Add emergency_responses if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'emergency_responses') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_responses;
    END IF;
    -- Add profiles if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if publication doesn't exist
  END $$;
COMMIT;
