'use client';

import { firebaseConfig } from './config';
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

// Enable persistence only on the client-side.
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(firestore)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // This is an expected error when multiple tabs are open.
      } else if (err.code === 'unimplemented') {
        // The browser does not support all of the features required to enable persistence.
      }
    });
}

// --- Exports ---
export { firebaseApp, auth, firestore };
