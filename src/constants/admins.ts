// Hardcoded admin emails for access control
// Update these with your 6 admin email addresses
export const ADMIN_EMAILS = [
  'slimonshark.login@gmail.com', // Owner
  'admin2@example.com', // Admin 2 - CHANGE THIS
  'admin3@example.com', // Admin 3 - CHANGE THIS
  'admin4@example.com', // Admin 4 - CHANGE THIS
  'admin5@example.com', // Admin 5 - CHANGE THIS
  'admin6@example.com', // Admin 6 - CHANGE THIS
];

export const isAdmin = (email?: string): boolean => {
  return !!email && ADMIN_EMAILS.includes(email);
};
