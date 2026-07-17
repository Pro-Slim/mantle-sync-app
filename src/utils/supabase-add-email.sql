-- Add email column to user_presence table
ALTER TABLE user_presence ADD COLUMN IF NOT EXISTS email text;
