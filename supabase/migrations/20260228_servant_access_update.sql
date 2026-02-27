-- Migration to allow servants to manage all members in their church
-- This replaces the department-specific policies with church-wide policies for servants

-- Drop existing department-scoped policies for servants
DROP POLICY IF EXISTS "Servants can view members in their department" ON public.members;
DROP POLICY IF EXISTS "Servants can insert members in their department" ON public.members;
DROP POLICY IF EXISTS "Servants can update members in their department" ON public.members;
DROP POLICY IF EXISTS "Servants can delete members in their department" ON public.members;

-- Create new church-scoped policies for servants
CREATE POLICY "Servants can view members in their church"
  ON public.members FOR SELECT
  USING (
    public.get_my_role() = 'servant' AND
    church_id = public.get_my_church_id()
  );

CREATE POLICY "Servants can insert members in their church"
  ON public.members FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'servant' AND
    church_id = public.get_my_church_id()
  );

CREATE POLICY "Servants can update members in their church"
  ON public.members FOR UPDATE
  USING (
    public.get_my_role() = 'servant' AND
    church_id = public.get_my_church_id()
  );

CREATE POLICY "Servants can delete members in their church"
  ON public.members FOR DELETE
  USING (
    public.get_my_role() = 'servant' AND
    church_id = public.get_my_church_id()
  );
