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
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (innerErr) {
        console.error('SecureStorage fallback also failed:', innerErr);
      }
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
      
      let decryptedString: string;
      try {
        decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      } catch (err) {
        console.warn('Decryption error (possibly wrong key or corrupted data) for key:', key);
        return null;
      }
      
      if (!decryptedString) {
        return null;
      }

      return JSON.parse(decryptedString) as T;
    } catch (error) {
      console.warn('Secure storage error for key:', key);
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
