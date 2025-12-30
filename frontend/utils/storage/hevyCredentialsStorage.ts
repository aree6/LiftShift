import { clearEncryptedCredential, getEncryptedCredential, saveEncryptedCredential } from './secureCredentialStorage';

const HEVY_USERNAME_KEY = 'hevy_username_or_email';
const HEVY_PASSWORD_KEY = 'hevy_password';

export const saveHevyUsernameOrEmail = (value: string): void => {
  try {
    localStorage.setItem(HEVY_USERNAME_KEY, value);
  } catch {
  }
};

export const getHevyUsernameOrEmail = (): string | null => {
  try {
    return localStorage.getItem(HEVY_USERNAME_KEY);
  } catch {
    return null;
  }
};

export const clearHevyUsernameOrEmail = (): void => {
  try {
    localStorage.removeItem(HEVY_USERNAME_KEY);
  } catch {
  }
};

export const saveHevyPassword = async (password: string): Promise<void> => {
  await saveEncryptedCredential(HEVY_PASSWORD_KEY, password);
};

export const getHevyPassword = async (): Promise<string | null> => {
  return await getEncryptedCredential(HEVY_PASSWORD_KEY);
};

export const clearHevyPassword = (): void => {
  clearEncryptedCredential(HEVY_PASSWORD_KEY);
};

export const clearHevyCredentials = (): void => {
  clearHevyUsernameOrEmail();
  clearHevyPassword();
};
