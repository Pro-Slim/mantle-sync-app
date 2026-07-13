-- Mantle Sync App Database Schema
-- Paste this entire file into Supabase SQL Editor and run it

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('mantle', 'byreal', 'solana', 'meth', 'xeyit', 'other')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  type TEXT NOT NULL CHECK (type IN ('bounty', 'hackathon', 'news', 'campaign', 'featured')),
  description TEXT,
  requirements TEXT,
  resources TEXT,
  application_link TEXT,
  x_post_link TEXT,
  winner_criteria TEXT,
  winner_announcement_date TIMESTAMP WITH TIME ZONE,
  notion_link TEXT,
  reward_amount TEXT,
  reward_currency TEXT,
  reward_default_delivery_date TIMESTAMP WITH TIME ZONE,
  reward_realized_delivery_date TIMESTAMP WITH TIME ZONE,
  reward_status TEXT CHECK (reward_status IN ('pending', 'delayed', 'delivered')),
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  requirements_details TEXT,
  winner_criteria_details TEXT,
  winners_pine TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- For conflict resolution
  version INT DEFAULT 1,
  last_modified_by UUID REFERENCES auth.users(id),
  -- For soft deletes (preserve audit trail)
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Reminders table
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INT DEFAULT 1,
  last_modified_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Activity logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conflict log (for auditing concurrent updates)
CREATE TABLE public.conflict_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL,
  remote_version INT,
  local_version INT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_strategy TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_start_date ON public.events(start_date);
CREATE INDEX idx_events_deleted_at ON public.events(deleted_at);
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_date ON public.reminders(date);
CREATE INDEX idx_reminders_deleted_at ON public.reminders(deleted_at);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_timestamp ON public.activity_logs(timestamp);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflict_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Users can view their own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for reminders
CREATE POLICY "Users can view their own reminders"
  ON public.reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
  ON public.reminders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON public.reminders FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for activity logs
CREATE POLICY "Users can view their own logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for conflict log (audit only, read-only)
CREATE POLICY "Users can view their own conflict logs"
  ON public.conflict_log FOR SELECT
  USING (auth.uid() = user_id);

-- Update timestamp trigger (auto-updates updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT SELECT ON public.conflict_log TO authenticated;
