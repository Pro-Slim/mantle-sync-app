# User Presence Setup Guide

This guide will help you set up the online user indicator feature in Supabase.

## Step 1: Create the `user_presence` Table

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Create a new query and run this SQL:

```sql
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS user_presence_user_id_idx ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS user_presence_status_idx ON user_presence(status);
```

3. Click **"Run"** to execute the query

## Step 2: Test the Feature

1. Restart the dev server: `npm run dev`
2. Open the app and log in with the first user
3. You should see a **green dot with "1 online"** in the top-right header
4. Open another browser or incognito window and log in with a second user
5. Now you should see **"2 online"** in both windows
6. Hover over the **ℹ️ icon** to see the list of online users

## How It Works

- **Heartbeat**: Each user's presence is updated every 30 seconds
- **Activity Check**: Users are considered online only if they were active in the last 5 minutes
- **Auto Offline**: When a user closes the tab/browser, they're marked offline
- **Real-time Updates**: The list refreshes every 5 seconds

## Features

✅ Shows online user count  
✅ Green pulsing indicator  
✅ Hover tooltip shows user emails  
✅ Auto-detects when users go offline  
✅ Works 24/7 with 5+ concurrent users  

## Troubleshooting

- **Not showing online users?** Make sure you ran the SQL and created the table
- **Indicator not updating?** Check the browser console for errors
- **Users not marked offline?** They'll auto-mark offline after 5 minutes of inactivity
