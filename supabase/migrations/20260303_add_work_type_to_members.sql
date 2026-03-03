-- Migration: Add work_type column to members
-- Run this in your database (Supabase SQL editor or psql) to add the column

alter table public.members
add column if not exists work_type text;
