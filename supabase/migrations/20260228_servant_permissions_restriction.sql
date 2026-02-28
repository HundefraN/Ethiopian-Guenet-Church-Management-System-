-- Migration to restrict servant permissions
-- 1. Restrict servant from editing any servant data (including themselves)
-- 2. Restrict servant from seeing activity logs of other users

-- Update Profile Policies
DROP POLICY IF EXISTS "Church staff can manage servants in their church" ON public.profiles;

-- Only Pastors and Super Admins can manage (UPDATE/DELETE) servants in their church
CREATE POLICY "Pastors can manage servants in their church"
  ON public.profiles FOR ALL
  USING (
    (public.get_my_role() = 'pastor' OR public.get_my_role() = 'super_admin') AND
    (
      public.get_my_role() = 'super_admin' OR 
      church_id = public.get_my_church_id()
    ) AND
    role = 'servant'
  )
  WITH CHECK (
    (public.get_my_role() = 'pastor' OR public.get_my_role() = 'super_admin') AND
    (
      public.get_my_role() = 'super_admin' OR 
      church_id = public.get_my_church_id()
    ) AND
    role = 'servant'
  );

-- Update Activity Logs Policies
DROP POLICY IF EXISTS "Activity logs viewable by everyone" ON public.activity_logs;

CREATE POLICY "Activity logs viewable by appropriate staff"
  ON public.activity_logs FOR SELECT
  USING (
    public.get_my_role() = 'super_admin' OR
    public.get_my_role() = 'pastor' OR
    (public.get_my_role() = 'servant' AND user_id = auth.uid())
  );
