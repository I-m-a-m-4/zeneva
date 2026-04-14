'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence, type Firestore } from 'firebase/firestore';

// --- Singleton Initialization ---
let firebaseApp: FirebaseApp;

// Check if Firebase has already been initialized to prevent errors in Fast Refresh environments.
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

const auth: Auth = getAuth(firebaseApp);

// Explicitly set persistence to LOCAL (persists across sessions/tabs)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence)
    .catch((err) => console.error("Firebase Auth persistence error:", err));
}
const firestore: Firestore = getFirestore(firebaseApp);

// Enable persistence only on the client-side. This allows multiple tabs to share
// the same offline data. We can safely ignore 'failed-precondition' errors, which
// occur when another tab has already enabled persistence.
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(firestore)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // This is an expected error when multiple tabs are open.
        // It means persistence is already enabled in another tab.
      } else if (err.code === 'unimplemented') {
        // The browser does not support all of the features required to enable persistence.
      }
    });
}
// --- End Singleton Initialization ---

/**
 * @deprecated This function is deprecated. Import firebaseApp, auth, and firestore directly.
 */
export function initializeFirebase() {
  return {
    firebaseApp,
    auth,
    firestore
  };
}

// --- Exports ---
// Export the initialized singleton services for direct use.
export { firebaseApp, auth, firestore };

// Re-export hooks and providers for convenience.
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';
