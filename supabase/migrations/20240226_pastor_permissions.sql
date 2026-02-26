
-- Allow Pastors to update profiles of servants in their church
create policy "Pastors can update servants in their church" 
  on public.profiles for update 
  using (
    public.get_my_role() = 'pastor' and 
    church_id = public.get_my_church_id() and 
    role = 'servant'
  );

-- Allow Pastors to delete profiles of servants in their church (if needed, though usually handled via auth)
-- But for now, let's just allow update. Deleting a user usually requires admin rights in Supabase Auth.

-- Allow Pastors to view all profiles in their church (already covered by public view, but good to be explicit if public view is restricted later)
-- Current policy: "Public profiles are viewable by everyone" -> True.

-- Ensure Pastors can manage members
-- "Pastors can manage members in their church" -> already exists.
