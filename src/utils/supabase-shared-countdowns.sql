-- Shared countdown clocks (the strip along the bottom of the dashboard). A
-- countdown one steward adds is seen by every steward when they log in, until
-- someone removes it. One clock per event. Safe to run again.

CREATE TABLE IF NOT EXISTS public.shared_countdowns (
  event_id UUID PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  -- Which of the event's dates it counts down to.
  type TEXT NOT NULL DEFAULT 'endDate' CHECK (type IN ('endDate', 'rewardDelivery')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  updated_by_email TEXT DEFAULT (auth.jwt() ->> 'email')
);

CREATE OR REPLACE FUNCTION public.touch_shared_countdown()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  NEW.updated_by_email = auth.jwt() ->> 'email';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_shared_countdown ON public.shared_countdowns;
CREATE TRIGGER touch_shared_countdown BEFORE UPDATE ON public.shared_countdowns
  FOR EACH ROW EXECUTE FUNCTION public.touch_shared_countdown();

ALTER TABLE public.shared_countdowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved users can view shared countdowns" ON public.shared_countdowns;
DROP POLICY IF EXISTS "Approved users can insert shared countdowns" ON public.shared_countdowns;
DROP POLICY IF EXISTS "Approved users can update shared countdowns" ON public.shared_countdowns;
DROP POLICY IF EXISTS "Approved users can delete shared countdowns" ON public.shared_countdowns;

CREATE POLICY "Approved users can view shared countdowns"
  ON public.shared_countdowns FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can insert shared countdowns"
  ON public.shared_countdowns FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can update shared countdowns"
  ON public.shared_countdowns FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

CREATE POLICY "Approved users can delete shared countdowns"
  ON public.shared_countdowns FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_countdowns TO authenticated;
