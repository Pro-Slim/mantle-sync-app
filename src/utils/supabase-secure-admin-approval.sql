-- Fixes a security hole on public.users: the existing "Service role can
-- manage all users" policy is named as if it's restricted to the
-- service_role, but it's actually scoped `TO public` with `USING (true)`,
-- meaning ANY signed-up user (even a pending/unapproved one) can currently
-- read every other user's row and update ANY row's status column --
-- including their own, letting them self-approve and bypass the admin
-- gate entirely, and read everyone else's email address.
--
-- This replaces it with: any signed-up user can still create their own
-- pending record and view their own status (needed for sign-up / the
-- "awaiting approval" screen to work), but only the admin emails below
-- can view the full user list or change anyone's status.
--
-- IMPORTANT: this admin email list must be kept in sync by hand with
-- src/constants/admins.ts -- there is no single source of truth between
-- the app and the database for this list.

DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;

-- Sign-up still needs to create its own pending row (see
-- insertPendingUserRecord in src/contexts/AuthContext.tsx).
CREATE POLICY "Users can insert their own record"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- "Users can view their own record" (SELECT, auth.uid() = id) is left as-is
-- -- it already existed and is correct: it's what lets a freshly signed-up
-- user see their own 'pending' status on the approval screen.

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'slimonshark.login@gmail.com',
      'minh@mantle.xyz'
    )
  );

CREATE POLICY "Admins can update all users"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'slimonshark.login@gmail.com',
      'minh@mantle.xyz'
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') IN (
      'slimonshark.login@gmail.com',
      'minh@mantle.xyz'
    )
  );
