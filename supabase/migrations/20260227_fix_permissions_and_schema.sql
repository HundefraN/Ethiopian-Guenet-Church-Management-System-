
-- 1. Ensure is_blocked column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- 2. Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Pastors can update servants in their church" ON public.profiles;

-- 3. Re-create policies

-- View: Everyone can view profiles (needed for user lists, etc.)
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- Insert: Users can insert their own profile (usually handled by trigger on auth.users, but good to have)
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Update: Super Admins can update any profile
CREATE POLICY "Super Admins can update all profiles" 
ON public.profiles FOR UPDATE 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- Update: Pastors can update servants in their church
CREATE POLICY "Pastors can update servants in their church" 
ON public.profiles FOR UPDATE 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'pastor' AND
  church_id = (SELECT church_id FROM public.profiles WHERE id = auth.uid()) AND
  role = 'servant'
);

-- Update: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Delete: Super Admins can delete any profile
CREATE POLICY "Super Admins can delete all profiles" 
ON public.profiles FOR DELETE 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);
