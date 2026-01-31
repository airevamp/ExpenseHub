export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}

export interface UserPreferences {
  defaultCurrency: string;
  defaultProject?: string;
  theme: 'light' | 'dark' | 'system';
}
