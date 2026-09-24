-- Community admin roster (the "Admins" view): which Mantle Telegram / Discord
-- groups exist, who is owner or admin in each -- with the custom title the
-- group shows beside them, e.g. "mod" -- and which bots run there.
--
-- Shared the same way the Timeline is (supabase-shared-collaboration.sql): any
-- approved user can view, add, edit and delete. Paste into the Supabase SQL
-- Editor and run it. Safe to run again.
--
-- The tables start empty. Open the Admins view and press "Load the PDF list"
-- to fill them from src/data/communityRosterBaseline.ts.

CREATE TABLE IF NOT EXISTS public.community_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  platform TEXT NOT NULL DEFAULT 'telegram' CHECK (platform IN ('telegram', 'discord')),
  url TEXT,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.community_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  handle TEXT NOT NULL CHECK (btrim(handle) <> ''),
  -- "@Luismatz" and "luismatz" are one person: this is what the UNIQUE below
  -- compares, and what handleKey() in src/constants/communityRoster.ts mirrors.
  handle_key TEXT GENERATED ALWAYS AS (lower(ltrim(btrim(handle), '@'))) STORED,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'bot')),
  title TEXT,
  -- 'requested' = the group owner has been asked to appoint this person.
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'requested')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  UNIQUE (group_id, handle_key)
);

CREATE INDEX IF NOT EXISTS idx_community_group_members_group_id
  ON public.community_group_members(group_id);

CREATE OR REPLACE FUNCTION public.touch_community_roster()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_community_groups ON public.community_groups;
CREATE TRIGGER touch_community_groups BEFORE UPDATE ON public.community_groups
  FOR EACH ROW EXECUTE FUNCTION public.touch_community_roster();

DROP TRIGGER IF EXISTS touch_community_group_members ON public.community_group_members;
CREATE TRIGGER touch_community_group_members BEFORE UPDATE ON public.community_group_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_community_roster();

ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved users can view community groups" ON public.community_groups;
DROP POLICY IF EXISTS "Approved users can insert community groups" ON public.community_groups;
DROP POLICY IF EXISTS "Approved users can update community groups" ON public.community_groups;
DROP POLICY IF EXISTS "Approved users can delete community groups" ON public.community_groups;

CREATE POLICY "Approved users can view community groups"
  ON public.community_groups FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can insert community groups"
  ON public.community_groups FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can update community groups"
  ON public.community_groups FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can delete community groups"
  ON public.community_groups FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

DROP POLICY IF EXISTS "Approved users can view community members" ON public.community_group_members;
DROP POLICY IF EXISTS "Approved users can insert community members" ON public.community_group_members;
DROP POLICY IF EXISTS "Approved users can update community members" ON public.community_group_members;
DROP POLICY IF EXISTS "Approved users can delete community members" ON public.community_group_members;

CREATE POLICY "Approved users can view community members"
  ON public.community_group_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can insert community members"
  ON public.community_group_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can update community members"
  ON public.community_group_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can delete community members"
  ON public.community_group_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_group_members TO authenticated;
