-- 1. Create helper functions that bypass RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_group_member(check_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = check_group_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(check_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = check_group_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Drop all recursive policies on group_members
DROP POLICY IF EXISTS "Group members can see other members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can insert members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can update members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can delete members or members leave" ON public.group_members;

-- 3. Recreate them using the safe functions (No Recursion!)
CREATE POLICY "Group members can see other members" ON public.group_members 
FOR SELECT USING (
  user_id = auth.uid() OR public.is_group_member(group_id)
);

CREATE POLICY "Group admins can insert members" ON public.group_members 
FOR INSERT WITH CHECK (
  user_id = auth.uid() OR public.is_group_admin(group_id)
);

CREATE POLICY "Group admins can update members" ON public.group_members 
FOR UPDATE USING (
  public.is_group_admin(group_id)
);

CREATE POLICY "Group admins can delete members or members leave" ON public.group_members 
FOR DELETE USING (
  user_id = auth.uid() OR public.is_group_admin(group_id)
);

-- 4. Fix similar recursion in groups table
DROP POLICY IF EXISTS "Group members can view groups" ON public.groups;
CREATE POLICY "Group members can view groups" ON public.groups 
FOR SELECT USING (
  public.is_group_member(id)
);

DROP POLICY IF EXISTS "Group admins can update groups" ON public.groups;
CREATE POLICY "Group admins can update groups" ON public.groups 
FOR UPDATE USING (
  public.is_group_admin(id)
);

-- 5. Fix similar recursion in messages table
DROP POLICY IF EXISTS "Users can view relevant messages" ON public.messages;
CREATE POLICY "Users can view relevant messages" ON public.messages 
FOR SELECT USING (
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id OR 
  (group_id IS NOT NULL AND public.is_group_member(group_id))
);

DROP POLICY IF EXISTS "Users can update relevant messages" ON public.messages;
CREATE POLICY "Users can update relevant messages" ON public.messages 
FOR UPDATE USING (
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id OR
  (group_id IS NOT NULL AND public.is_group_member(group_id))
);
