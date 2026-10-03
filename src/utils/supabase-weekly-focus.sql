-- Weekly focus (the right-hand tray): one free-text note per week saying what
-- the stewards are concentrating on, e.g. "building a mini TG app". Keyed by
-- the Monday the week starts on. Shared like the Timeline: any approved user
-- can read and write it. Safe to run again.

CREATE TABLE IF NOT EXISTS public.weekly_focus (
  week_start DATE PRIMARY KEY,
  body TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  -- Copied from the JWT at write time, so "last edited by" needs no join
  -- against users (whose policies may not let every steward read every row).
  updated_by_email TEXT DEFAULT (auth.jwt() ->> 'email')
);

CREATE OR REPLACE FUNCTION public.touch_weekly_focus()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  NEW.updated_by_email = auth.jwt() ->> 'email';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_weekly_focus ON public.weekly_focus;
CREATE TRIGGER touch_weekly_focus BEFORE INSERT OR UPDATE ON public.weekly_focus
  FOR EACH ROW EXECUTE FUNCTION public.touch_weekly_focus();

ALTER TABLE public.weekly_focus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved users can view weekly focus" ON public.weekly_focus;
DROP POLICY IF EXISTS "Approved users can insert weekly focus" ON public.weekly_focus;
DROP POLICY IF EXISTS "Approved users can update weekly focus" ON public.weekly_focus;

CREATE POLICY "Approved users can view weekly focus"
  ON public.weekly_focus FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can insert weekly focus"
  ON public.weekly_focus FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can update weekly focus"
  ON public.weekly_focus FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

GRANT SELECT, INSERT, UPDATE ON public.weekly_focus TO authenticated;
