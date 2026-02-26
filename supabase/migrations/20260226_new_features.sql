-- 1. Create activity_logs table
create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  action_type text not null, -- e.g., "CREATE", "UPDATE", "DELETE", "LOGIN"
  entity_type text not null, -- e.g., "MEMBER", "DEPARTMENT", "PASTOR"
  entity_id uuid, -- ID of the entity affected
  details text, -- Human readable description
  changes jsonb, -- JSON object storing old and new values if applicable
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for activity_logs
alter table public.activity_logs enable row level security;

-- Activity Logs Policies
create policy "Activity logs viewable by everyone" 
  on public.activity_logs for select 
  using (true);

create policy "System can insert activity logs" 
  on public.activity_logs for insert 
  with check (true); -- Allow all authenticated users to insert logs for now (or restrict to service role if using edge functions)

-- 2. Add avatar_url to profiles
alter table public.profiles add column if not exists avatar_url text;

-- 3. Update RLS policies for Departments (Restrict Super Admin from adding)
drop policy if exists "Super Admins can manage departments" on public.departments;

create policy "Super Admins can view departments" 
  on public.departments for select 
  using (public.get_my_role() = 'super_admin');

create policy "Super Admins can update departments" 
  on public.departments for update 
  using (public.get_my_role() = 'super_admin');

create policy "Super Admins can delete departments" 
  on public.departments for delete 
  using (public.get_my_role() = 'super_admin');

-- Note: No INSERT policy for Super Admins on departments

-- 4. Update RLS policies for Members (Restrict Super Admin from adding)
drop policy if exists "Super Admins can manage all members" on public.members;

create policy "Super Admins can view all members" 
  on public.members for select 
  using (public.get_my_role() = 'super_admin');

create policy "Super Admins can update all members" 
  on public.members for update 
  using (public.get_my_role() = 'super_admin');

create policy "Super Admins can delete all members" 
  on public.members for delete 
  using (public.get_my_role() = 'super_admin');

-- Note: No INSERT policy for Super Admins on members
