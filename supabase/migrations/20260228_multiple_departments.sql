-- Create profile_departments junction table
CREATE TABLE IF NOT EXISTS public.profile_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profile_id, department_id)
);

-- Enable RLS
ALTER TABLE public.profile_departments ENABLE ROW LEVEL SECURITY;

-- Policies for profile_departments
CREATE POLICY "Profile departments are viewable by everyone" 
  ON public.profile_departments FOR SELECT 
  USING (true);

CREATE POLICY "Super Admins can manage profile_departments" 
  ON public.profile_departments FOR ALL 
  USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Pastors can manage profile_departments in their church" 
  ON public.profile_departments FOR ALL 
  USING (
    public.get_my_role() = 'pastor' AND 
    EXISTS (
      SELECT 1 FROM public.departments d 
      WHERE d.id = profile_departments.department_id 
      AND d.church_id = public.get_my_church_id()
    )
  );

-- Migrate existing data
INSERT INTO public.profile_departments (profile_id, department_id)
SELECT id, department_id
FROM public.profiles
WHERE department_id IS NOT NULL
ON CONFLICT (profile_id, department_id) DO NOTHING;
