// Hardcoded admin emails for access control
// Update these with your 6 admin email addresses
export const ADMIN_EMAILS = [
  'slimonshark.login@gmail.com', // Owner
  'minh@mantle.xyz', // Admin 2 - CHANGE THIS
  'luis.matzl13@gmail.com', // Admin 3 - CHANGE THIS
  'hadukemvv@gmail.com', // Admin 4 - CHANGE THIS
  'kirill.calm@gmail.com', // Admin 5 - CHANGE THIS
  'c4x4p4@gmail.com', // Admin 6 - CHANGE THIS
];

export const isAdmin = (email?: string): boolean => {
  return !!email && ADMIN_EMAILS.includes(email);
};
