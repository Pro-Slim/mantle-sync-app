-- Create user_presence table for tracking online users
CREATE TABLE IF NOT EXISTS user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'online', -- 'online' or 'offline'
  last_seen_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see all presence info
CREATE POLICY "Allow all users to see presence" ON user_presence
  FOR SELECT
  USING (true);

-- Create policy to allow users to update their own presence
CREATE POLICY "Allow users to update own presence" ON user_presence
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to insert their own presence
CREATE POLICY "Allow users to insert own presence" ON user_presence
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS user_presence_user_id_idx ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS user_presence_status_idx ON user_presence(status);
