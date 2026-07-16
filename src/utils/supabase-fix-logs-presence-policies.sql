-- Two fixes found during an RLS audit of every table besides `users`
-- (which was already fixed in supabase-secure-admin-approval.sql):
--
-- 1. activity_logs had INSERT and SELECT policies but no DELETE policy,
--    so logStore.clearLogs() (the "Clear Logs" button in Settings) was
--    silently failing for everyone -- RLS defaults to deny with no
--    matching policy.
--
-- 2. user_presence's "Allow all users to see presence" policy had no
--    role restriction and no auth check at all (USING (true), roles =
--    {public}), so anyone with the site's public anon key -- extractable
--    from the published JS bundle, no login required -- could read every
--    user's email and online status directly via the REST API.

CREATE POLICY "Users can delete their own logs"
  ON public.activity_logs FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow all users to see presence" ON public.user_presence;
CREATE POLICY "Authenticated users can see presence"
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (true);
