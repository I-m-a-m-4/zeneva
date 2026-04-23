import CryptoJS from 'crypto-js';

// This is the encryption key prefix.
// In production, you would want this to be more dynamic or from an ENV.
const SECRET_KEY = process.env.NEXT_PUBLIC_STORAGE_ENCRYPTION_KEY || 'zeneva-pos-offline-secure-v8';

export const secureStorage = {
  /**
   * Encrypts and saves data to localStorage
   */
  setItem: (key: string, value: any): void => {
    try {
      const stringValue = JSON.stringify(value);
      const encrypted = CryptoJS.AES.encrypt(stringValue, SECRET_KEY).toString();
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Encryption failed:', error);
      // Fallback to plain text if encryption fails for some weird reason
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  /**
   * Retrieves and decrypts data from localStorage
   */
  getItem: <T>(key: string): T | null => {
    try {
      if (typeof window === 'undefined') return null;
      
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;

      // Check if it's plaintext (for legacy migration)
      if (encrypted.startsWith('{') || encrypted.startsWith('[')) {
        return JSON.parse(encrypted) as T;
      }

      const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        // If decryption results in empty string, it might have been saved as plaintext
        // despite not starting with {/[, or the key changed.
        return null;
      }

      return JSON.parse(decryptedString) as T;
    } catch (error) {
      console.error('Decryption failed for key:', key, error);
      return null;
    }
  },

  /**
   * Removes an item from localStorage
   */
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  },

  /**
   * Clears all localStorage
   */
  clear: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  }
};
