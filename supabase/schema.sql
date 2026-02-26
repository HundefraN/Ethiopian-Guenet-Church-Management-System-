-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create Enum Types
create type user_role as enum ('super_admin', 'pastor', 'servant');

-- Create Tables

-- 1. Churches
create table public.churches (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Departments
create table public.departments (
  id uuid primary key default uuid_generate_v4(),
  church_id uuid references public.churches(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Profiles (Extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role default 'servant'::user_role not null,
  church_id uuid references public.churches(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Members
create table public.members (
  id uuid primary key default uuid_generate_v4(),
  church_id uuid references public.churches(id) on delete cascade not null,
  department_id uuid references public.departments(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Global Settings
create table public.global_settings (
  id serial primary key,
  is_maintenance_mode boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default global settings
insert into public.global_settings (is_maintenance_mode) values (false);

-- Enable Row Level Security
alter table public.churches enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.global_settings enable row level security;

-- Policies

-- Helper function to get current user's role
create or replace function public.get_my_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$ language sql security definer;

-- Helper function to get current user's church_id
create or replace function public.get_my_church_id()
returns uuid as $$
  select church_id from public.profiles where id = auth.uid() limit 1;
$$ language sql security definer;

-- Helper function to get current user's department_id
create or replace function public.get_my_department_id()
returns uuid as $$
  select department_id from public.profiles where id = auth.uid() limit 1;
$$ language sql security definer;

-- Churches Policies
create policy "Churches are viewable by everyone" 
  on public.churches for select 
  using (true);

create policy "Super Admins can insert churches" 
  on public.churches for insert 
  with check (public.get_my_role() = 'super_admin');

create policy "Super Admins can update churches" 
  on public.churches for update 
  using (public.get_my_role() = 'super_admin');

create policy "Super Admins can delete churches" 
  on public.churches for delete 
  using (public.get_my_role() = 'super_admin');

-- Departments Policies
create policy "Departments are viewable by everyone" 
  on public.departments for select 
  using (true);

create policy "Super Admins can manage departments" 
  on public.departments for all 
  using (public.get_my_role() = 'super_admin');

create policy "Pastors can manage departments in their church" 
  on public.departments for all 
  using (
    public.get_my_role() = 'pastor' and 
    church_id = public.get_my_church_id()
  );

-- Profiles Policies
create policy "Public profiles are viewable by everyone" 
  on public.profiles for select 
  using (true);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Super Admins can update any profile" 
  on public.profiles for update 
  using (public.get_my_role() = 'super_admin');

-- Members Policies
create policy "Super Admins can manage all members" 
  on public.members for all 
  using (public.get_my_role() = 'super_admin');

create policy "Pastors can manage members in their church" 
  on public.members for all 
  using (
    public.get_my_role() = 'pastor' and 
    church_id = public.get_my_church_id()
  );

create policy "Servants can view members in their department" 
  on public.members for select 
  using (
    public.get_my_role() = 'servant' and 
    department_id = public.get_my_department_id()
  );

create policy "Servants can insert members in their department" 
  on public.members for insert 
  with check (
    public.get_my_role() = 'servant' and 
    department_id = public.get_my_department_id()
  );

create policy "Servants can update members in their department" 
  on public.members for update 
  using (
    public.get_my_role() = 'servant' and 
    department_id = public.get_my_department_id()
  );

create policy "Servants can delete members in their department" 
  on public.members for delete 
  using (
    public.get_my_role() = 'servant' and 
    department_id = public.get_my_department_id()
  );

-- Global Settings Policies
create policy "Settings viewable by everyone" 
  on public.global_settings for select 
  using (true);

create policy "Super Admins can update settings" 
  on public.global_settings for update 
  using (public.get_my_role() = 'super_admin');


-- Trigger to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'servant');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to handle user creation with role (Called via RPC if needed, or just for reference)
-- Note: You cannot directly create auth users from SQL without specific extensions or privileges.
-- This logic assumes the user is created via Auth API, and then we might update the role.
