-- Add map_link column to churches table
ALTER TABLE churches ADD COLUMN IF NOT EXISTS map_link TEXT;
