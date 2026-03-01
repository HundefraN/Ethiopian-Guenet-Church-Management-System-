-- Migration to add missing columns to members table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS school_name text,
ADD COLUMN IF NOT EXISTS grade text,
ADD COLUMN IF NOT EXISTS university_year text,
ADD COLUMN IF NOT EXISTS baptism_status text;

-- Optional: Add comment
COMMENT ON COLUMN public.members.school_name IS 'Name of school or university';
COMMENT ON COLUMN public.members.grade IS 'Grade or year level';
COMMENT ON COLUMN public.members.university_year IS 'Year in university';
COMMENT ON COLUMN public.members.baptism_status IS 'Baptism status (pending, done, notYet)';
