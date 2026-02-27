
-- Fix RLS policies for profiles table to use security definer functions
-- This avoids recursion and issues with subqueries on the same table during UPDATE

-- 1. Drop the problematic policies
DROP POLICY IF EXISTS "Super Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Pastors can update servants in their church" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins can delete all profiles" ON public.profiles;

-- 2. Re-create policies using helper functions
-- Note: These functions (get_my_role, get_my_church_id) are defined in schema.sql and are security definer.

-- Super Admin update policy
CREATE POLICY "Super Admins can update any profile" 
ON public.profiles FOR UPDATE 
USING (public.get_my_role() = 'super_admin');

-- Pastor update policy
-- Pastors can update servants in their own church
CREATE POLICY "Pastors can update servants in their church" 
ON public.profiles FOR UPDATE 
USING (
  public.get_my_role() = 'pastor' AND
  church_id = public.get_my_church_id() AND
  role = 'servant'
);

-- Super Admin delete policy
CREATE POLICY "Super Admins can delete all profiles" 
ON public.profiles FOR DELETE 
USING (public.get_my_role() = 'super_admin');

-- 3. Ensure SELECT policy is still correct (should be open for profile viewing)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- 4. Ensure Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);
