export const PASSWORD_CATEGORIES = ['Personal', 'Work', 'Finance', 'Shopping', 'Entertainment', 'Travel', 'Health', 'Other'] as const;
export type PasswordCategory = typeof PASSWORD_CATEGORIES[number];
export interface PasswordRecord { id: string; name: string; username: string; password: string; website: string; category: PasswordCategory; tags: string[]; notes: string; favourite: boolean; createdAt: string; updatedAt: string; }
export type PasswordInput = Omit<PasswordRecord, 'id' | 'createdAt' | 'updatedAt'>;
export interface EncryptedPayload { iv: string; cipherText: string; }
