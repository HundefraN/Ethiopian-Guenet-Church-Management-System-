
-- 1. Ensure helper functions are robust and use SECURITY DEFINER
create or replace function public.get_my_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$ language sql security definer;

create or replace function public.get_my_church_id()
returns uuid as $$
  select church_id from public.profiles where id = auth.uid() limit 1;
$$ language sql security definer;

-- 2. Drop existing policies to redefine them clearly
-- Departments
drop policy if exists "Pastors can manage departments in their church" on public.departments;
drop policy if exists "Super Admins can manage departments" on public.departments;
drop policy if exists "Departments are viewable by everyone" on public.departments;

-- 3. Re-create policies for Departments
-- Everyone can view (needed for dropdowns)
create policy "Departments are viewable by everyone" 
  on public.departments for select 
  using (true);

-- Super Admins: Full access
create policy "Super Admins can manage departments" 
  on public.departments for all 
  using (public.get_my_role() = 'super_admin');

-- Pastors: Full access to THEIR church's departments
create policy "Pastors can insert departments" 
  on public.departments for insert 
  with check (
    public.get_my_role() = 'pastor' and 
    church_id = public.get_my_church_id()
  );

create policy "Pastors can update departments" 
  on public.departments for update 
  using (
    public.get_my_role() = 'pastor' and 
    church_id = public.get_my_church_id()
  );

create policy "Pastors can delete departments" 
  on public.departments for delete 
  using (
    public.get_my_role() = 'pastor' and 
    church_id = public.get_my_church_id()
  );

-- 4. Fix Profile Policies (for Servants and Pastors)
drop policy if exists "Pastors can update servants in their church" on public.profiles;

-- Allow Pastors to update profiles of servants in their church
create policy "Pastors can update servants in their church" 
  on public.profiles for update 
  using (
    public.get_my_role() = 'pastor' and 
    church_id = public.get_my_church_id() and 
    role = 'servant'
  );

-- Allow Super Admins to manage all profiles
create policy "Super Admins can manage all profiles" 
  on public.profiles for all 
  using (public.get_my_role() = 'super_admin');

-- 5. Fix Members Policies
drop policy if exists "Pastors can manage members in their church" on public.members;
drop policy if exists "Super Admins can manage all members" on public.members;

create policy "Super Admins can manage all members" 
  on public.members for all 
  using (public.get_my_role() = 'super_admin');

create policy "Pastors can manage members in their church" 
  on public.members for all 
  using (
    public.get_my_role() = 'pastor' and 
    church_id = public.get_my_church_id()
  );
