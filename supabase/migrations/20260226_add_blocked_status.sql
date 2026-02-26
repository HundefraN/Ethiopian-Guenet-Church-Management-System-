
-- Add is_blocked column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- Update RLS policies to prevent blocked users from doing things (optional, but good practice)
-- Actually, the main blocking will happen in the application logic (AuthContext), 
-- but we can also add a policy check if needed. For now, let's just add the column.
