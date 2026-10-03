-- Recurring reminders (the left-hand tray, the Week view chips and the
-- Timeline lane): steward tasks that come round every week or every month,
-- e.g. the Weekly Steward Report every Friday. Any approved user can add,
-- edit and remove them from the tray. Safe to run again; the two original
-- reminders are seeded only into an empty table.

CREATE TABLE IF NOT EXISTS public.recurring_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  icon TEXT NOT NULL DEFAULT '🔔',
  repeat TEXT NOT NULL CHECK (repeat IN ('weekly', 'monthly')),
  -- Weekly: day of the week as JavaScript's getDay() counts it, 0 = Sunday.
  weekday SMALLINT CHECK (weekday BETWEEN 0 AND 6),
  -- Monthly: day of the month. A month too short for it (the 30th in
  -- February) falls on its last day instead of being skipped.
  month_day SMALLINT CHECK (month_day BETWEEN 1 AND 31),
  -- Monthly reports usually cover the month before: shows "· September" on
  -- the October occurrence.
  about_previous_month BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  updated_by_email TEXT DEFAULT (auth.jwt() ->> 'email'),
  CHECK (
    (repeat = 'weekly' AND weekday IS NOT NULL) OR
    (repeat = 'monthly' AND month_day IS NOT NULL)
  )
);

CREATE OR REPLACE FUNCTION public.touch_recurring_reminder()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  NEW.updated_by_email = auth.jwt() ->> 'email';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_recurring_reminder ON public.recurring_reminders;
CREATE TRIGGER touch_recurring_reminder BEFORE UPDATE ON public.recurring_reminders
  FOR EACH ROW EXECUTE FUNCTION public.touch_recurring_reminder();

ALTER TABLE public.recurring_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved users can view recurring reminders" ON public.recurring_reminders;
DROP POLICY IF EXISTS "Approved users can insert recurring reminders" ON public.recurring_reminders;
DROP POLICY IF EXISTS "Approved users can update recurring reminders" ON public.recurring_reminders;
DROP POLICY IF EXISTS "Approved users can delete recurring reminders" ON public.recurring_reminders;

CREATE POLICY "Approved users can view recurring reminders"
  ON public.recurring_reminders FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can insert recurring reminders"
  ON public.recurring_reminders FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can update recurring reminders"
  ON public.recurring_reminders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can delete recurring reminders"
  ON public.recurring_reminders FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_reminders TO authenticated;

INSERT INTO public.recurring_reminders (title, icon, repeat, weekday, month_day, about_previous_month, created_at)
SELECT * FROM (VALUES
  ('Weekly Steward Report', '📝', 'weekly', 5::SMALLINT, NULL::SMALLINT, FALSE, NOW()),
  ('Launch member-message stats', '📊', 'monthly', NULL::SMALLINT, 30::SMALLINT, TRUE, NOW() + INTERVAL '1 second')
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM public.recurring_reminders);
