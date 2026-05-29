-- ==========================================
-- MASTER SCHEMA FOR CHAT WARRIORS APP
-- Keep this file safe. Run this file in any new Supabase project to instantly set up the complete structure.
-- ==========================================

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE,
  email text,
  phone text,
  avatar_url text,
  about text DEFAULT 'Hey there! I am using ChatWarriors.',
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  push_token text,
  public_key text,
  show_email boolean DEFAULT false,
  show_phone boolean DEFAULT false,
  current_session_id text,
  created_at timestamptz DEFAULT now()
);

-- 2. Groups & Members
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE IF EXISTS public.group_members
DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;

ALTER TABLE public.group_members 
ADD CONSTRAINT group_members_group_id_fkey 
FOREIGN KEY (group_id) 
REFERENCES public.groups (id) 
ON DELETE CASCADE;

-- 3. Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  content text,
  file_url text,
  message_type text DEFAULT 'text',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 4. Statuses (Updated with new columns)
CREATE TABLE IF NOT EXISTS public.statuses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text,
  media_url text,
  media_type text DEFAULT 'text',
  background_color text,
  privacy_type text DEFAULT 'all',
  viewer_ids jsonb,
  audio_url text,
  mentioned_user_ids jsonb,
  thumbnail_url text,
  storage_paths jsonb,
  encrypted_keys jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. Status Views
CREATE TABLE IF NOT EXISTS public.status_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id uuid REFERENCES public.statuses(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(status_id, viewer_id)
);

-- 6. Friendships
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id1 uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id2 uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_locked boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id1, user_id2),
  UNIQUE(user_id, friend_id)
);

-- 7. Ledger (Hisab-Kitab)
CREATE TABLE IF NOT EXISTS public.ledger (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric DEFAULT 0,
  type text,
  description text,
  sync_id text UNIQUE,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- 8. Blocked Users
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- ==========================================
-- ENABLE RLS & CREATE POLICIES
-- ==========================================
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- 1. Profiles table RLS
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Friendships table RLS
DROP POLICY IF EXISTS "Users can see their friendships" ON friendships;
CREATE POLICY "Users can see their friendships" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can insert friendships" ON friendships;
CREATE POLICY "Users can insert friendships" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their friendships" ON friendships;
CREATE POLICY "Users can update their friendships" ON friendships FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 3. Fallback for other tables (Dev mode)
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    AND table_name NOT IN ('profiles', 'friendships')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Allow all actions for authenticated users" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;


-- ==========================================
-- AUTHENTICATION TRIGGER
-- ==========================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
