const USER_STORAGE_KEY = 'mantle-sync-user';

export const AVAILABLE_USERS = [
  'Guest',
  'Hadukem',
  'Luisma',
  'Minh Anh',
  'NFTerraX',
  'Rusenkiy',
  'SlimOnShark',
] as const;

export type UserName = typeof AVAILABLE_USERS[number];

export const getCurrentUser = (): UserName | null => {
  try {
    const user = localStorage.getItem(USER_STORAGE_KEY);
    return user && AVAILABLE_USERS.includes(user as UserName) ? (user as UserName) : null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: UserName): void => {
  try {
    localStorage.setItem(USER_STORAGE_KEY, user);
  } catch (e) {
    console.error('Failed to save user:', e);
  }
};

export const clearCurrentUser = (): void => {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear user:', e);
  }
};
