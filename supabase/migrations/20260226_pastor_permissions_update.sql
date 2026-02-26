
-- Allow Pastors to update servants in their church
CREATE POLICY "Pastors can update servants in their church"
  ON public.profiles FOR UPDATE
  USING (
    public.get_my_role() = 'pastor' AND
    church_id = public.get_my_church_id() AND
    role = 'servant'
  );
