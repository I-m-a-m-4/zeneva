'use client';

import { firebaseConfig } from './config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence, type Firestore } from 'firebase/firestore';

// --- Singleton Initialization ---
let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

const isServer = typeof window === 'undefined';
const hasConfig = !!firebaseConfig.apiKey;

// Check if Firebase has already been initialized
if (!getApps().length) {
  // During static build, we might not have the API key. 
  // We initialize with a dummy if needed to prevent crashing the build worker.
  firebaseApp = initializeApp(firebaseConfig.apiKey ? firebaseConfig : { ...firebaseConfig, apiKey: 'dummy-key-for-build' });
} else {
  firebaseApp = getApp();
}

// Safely initialize Auth
try {
  auth = getAuth(firebaseApp);
} catch (e) {
  // Fallback for build time
  auth = {} as Auth;
}

// Safely initialize Firestore
try {
  firestore = getFirestore(firebaseApp);
} catch (e) {
  // Fallback for build time
  firestore = {} as Firestore;
}

// Explicitly set persistence to LOCAL (persists across sessions/tabs)
if (!isServer && hasConfig) {
  setPersistence(auth, browserLocalPersistence)
    .catch((err) => console.error("Firebase Auth persistence error:", err));
}

// Enable persistence only on the client-side.
if (!isServer && hasConfig) {
  enableMultiTabIndexedDbPersistence(firestore)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Expected error when multiple tabs are open.
      } else if (err.code === 'unimplemented') {
        // Browser does not support persistence.
      }
    });
}

// --- Exports ---
export { firebaseApp, auth, firestore };
