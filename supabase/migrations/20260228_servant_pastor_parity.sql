-- Migration to give servants the same permissions as pastors within their own church
-- This ensures that servants can manage departments and other servants, just like pastors.

-- 1. Update Departments Policies to include servants
DROP POLICY IF EXISTS "Pastors can manage departments in their church" ON public.departments;

CREATE POLICY "Church staff can manage departments in their church"
  ON public.departments FOR ALL
  USING (
    (public.get_my_role() = 'pastor' OR public.get_my_role() = 'servant') AND
    church_id = public.get_my_church_id()
  );

-- 2. Update Profiles Policies to allow servants to manage other servants in their church
-- Note: We still restrict them from managing pastors or super_admins.
DROP POLICY IF EXISTS "Pastors can update servants in their church" ON public.profiles;

CREATE POLICY "Church staff can update servants in their church"
  ON public.profiles FOR UPDATE
  USING (
    (public.get_my_role() = 'pastor' OR public.get_my_role() = 'servant') AND
    church_id = public.get_my_church_id() AND
    role = 'servant'
  );

-- 3. Allow church staff to view activity logs (already public, but good to be sure if restricted later)
-- (Currently select on activity_logs is 'true', so we don't need to change it)

-- 4. Ensure servants can delete other servants in their church (if needed)
CREATE POLICY "Church staff can delete servants in their church"
  ON public.profiles FOR DELETE
  USING (
    (public.get_my_role() = 'pastor' OR public.get_my_role() = 'servant') AND
    church_id = public.get_my_church_id() AND
    role = 'servant'
  );
