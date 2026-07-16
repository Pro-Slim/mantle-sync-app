// Hardcoded admin emails for access control.
// Keep this in sync by hand with the matching email list in
// src/utils/supabase-secure-admin-approval.sql -- there is no single
// source of truth between the app and the database for this list.
export const ADMIN_EMAILS = [
  'slimonshark.login@gmail.com', // Owner
  'minh@mantle.xyz',
];

export const isAdmin = (email?: string): boolean => {
  return !!email && ADMIN_EMAILS.includes(email);
};
