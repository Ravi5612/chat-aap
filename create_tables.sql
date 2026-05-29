-- Drop old incorrect table if exists
DROP TABLE IF EXISTS public.users CASCADE;

-- Profiles table
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

-- Friends table
CREATE TABLE IF NOT EXISTS public.friends (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Group Members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Messages table
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

-- Status Updates table
CREATE TABLE IF NOT EXISTS public.status_updates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text,
  media_url text,
  type text DEFAULT 'text',
  text_style jsonb,
  duration integer DEFAULT 5000,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Status Views table
CREATE TABLE IF NOT EXISTS public.status_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id uuid REFERENCES public.status_updates(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(status_id, viewer_id)
);

-- Enable RLS and create basic policies (allow all for authenticated users during development)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.profiles;
CREATE POLICY "Allow all actions for authenticated users" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.friends;
CREATE POLICY "Allow all actions for authenticated users" ON public.friends FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.groups;
CREATE POLICY "Allow all actions for authenticated users" ON public.groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.group_members;
CREATE POLICY "Allow all actions for authenticated users" ON public.group_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.messages;
CREATE POLICY "Allow all actions for authenticated users" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.status_updates;
CREATE POLICY "Allow all actions for authenticated users" ON public.status_updates FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all actions for authenticated users" ON public.status_views;
CREATE POLICY "Allow all actions for authenticated users" ON public.status_views FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for all tables safely
-- (Realtime should be enabled from the Supabase Dashboard -> Database -> Publications)

-- Auth Trigger
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
