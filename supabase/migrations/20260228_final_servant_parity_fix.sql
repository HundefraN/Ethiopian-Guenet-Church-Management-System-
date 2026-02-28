-- Final definitive migration to ensure both servants and pastors have full management access to their own church data
-- This covers members, departments, and other servants.

-- 0. Ensure RLS is enabled
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 1. UNIFY MEMBERS POLICIES
-- Drop all existing specific policies to avoid conflicts
DROP POLICY IF EXISTS "Pastors can manage members in their church" ON public.members;
DROP POLICY IF EXISTS "Servants can view members in their church" ON public.members;
DROP POLICY IF EXISTS "Servants can insert members in their church" ON public.members;
DROP POLICY IF EXISTS "Servants can update members in their church" ON public.members;
DROP POLICY IF EXISTS "Servants can delete members in their church" ON public.members;
DROP POLICY IF EXISTS "Servants can view members in their department" ON public.members;
DROP POLICY IF EXISTS "Servants can insert members in their department" ON public.members;
DROP POLICY IF EXISTS "Servants can update members in their department" ON public.members;
DROP POLICY IF EXISTS "Servants can delete members in their department" ON public.members;
DROP POLICY IF EXISTS "Church staff can manage members in their church" ON public.members;

-- Create single unified policy for church staff (pastors and servants)
CREATE POLICY "Church staff can manage members in their church"
  ON public.members FOR ALL
  USING (
    (public.get_my_role() = 'pastor' OR public.get_my_role() = 'servant') AND
    church_id = public.get_my_church_id()
  )
  WITH CHECK (
    (public.get_my_role() = 'pastor' OR public.get_my_role() = 'servant') AND
    church_id = public.get_my_church_id()
  );

-- 2. UNIFY DEPARTMENTS POLICIES
DROP POLICY IF EXISTS "Pastors can manage departments in their church" ON public.departments;
DROP POLICY IF EXISTS "Church staff can manage departments in their church" ON public.departments;

CREATE POLICY "Church staff can manage departments in their church"
  ON public.departments FOR ALL
  USING (
    (public.get_my_role() = 'pastor' OR public.get_my_role() = 'servant') AND
    church_id = public.get_my_church_id()
  )
  WITH CHECK (
    (public.get_my_role() = 'pastor' OR public.get_my_role() = 'servant') AND
    church_id = public.get_my_church_id()
  );

-- 3. UNIFY PROFILES POLICIES
DROP POLICY IF EXISTS "Pastors can update servants in their church" ON public.profiles;
DROP POLICY IF EXISTS "Church staff can update servants in their church" ON public.profiles;
DROP POLICY IF EXISTS "Church staff can delete servants in their church" ON public.profiles;
DROP POLICY IF EXISTS "Pastors can manage servants in their church" ON public.profiles;
DROP POLICY IF EXISTS "Church staff can view profiles in their church" ON public.profiles;
DROP POLICY IF EXISTS "Church staff can manage servants in their church" ON public.profiles;

-- Pastors/Servants can view ALL profiles in their church (needed for Member list to show pastors/servants)
CREATE POLICY "Church staff can view profiles in their church"
  ON public.profiles FOR SELECT
  USING (
    (public.get_my_role() = 'pastor' OR public.get_my_role() = 'servant') AND
    church_id = public.get_my_church_id()
  );

-- Pastors/Servants can ONLY manage (UPDATE/DELETE) servants in their church
CREATE POLICY "Church staff can manage servants in their church"
  ON public.profiles FOR ALL
  USING (
    (public.get_my_role() = 'pastor' OR public.get_my_role() = 'servant') AND
    church_id = public.get_my_church_id() AND
    role = 'servant'
  )
  WITH CHECK (
    (public.get_my_role() = 'pastor' OR public.get_my_role() = 'servant') AND
    church_id = public.get_my_church_id() AND
    role = 'servant'
  );

-- 4. ENSURE ACTIVITY LOGS ARE VISIBLE
DROP POLICY IF EXISTS "Activity logs viewable by everyone" ON public.activity_logs;
CREATE POLICY "Activity logs viewable by everyone" 
  ON public.activity_logs FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Staff can insert activity logs" ON public.activity_logs;
CREATE POLICY "Staff can insert activity logs" 
  ON public.activity_logs FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
