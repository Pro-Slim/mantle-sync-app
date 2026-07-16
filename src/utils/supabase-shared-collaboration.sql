-- Switch events (the shared Timeline) from private-per-user to a shared
-- calendar: any approved user can view, add, edit, and delete any event,
-- not just their own. Paste this into the Supabase SQL Editor and run it
-- against your existing project (it replaces the policies from
-- SUPABASE_SCHEMA.sql, it does not recreate tables).
--
-- Reminders (the personal calendar in the left sidebar) and activity logs
-- stay private per-user and are untouched by this file.

DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;

CREATE POLICY "Approved users can view all events"
  ON public.events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved')
  );

CREATE POLICY "Approved users can insert events"
  ON public.events FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved')
  );

CREATE POLICY "Approved users can update all events"
  ON public.events FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved')
  );

CREATE POLICY "Approved users can delete all events"
  ON public.events FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'approved')
  );
