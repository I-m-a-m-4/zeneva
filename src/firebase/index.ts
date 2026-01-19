'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;
  if (getApps().length === 0) {
    // Directly initialize with the config object.
    // The try-catch for automatic initialization is not reliable in all build environments.
    firebaseApp = initializeApp(firebaseConfig);
    
    // Initialize Firestore with persistence settings
    const firestore = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({})
    });
    
    return {
      firebaseApp,
      auth: getAuth(firebaseApp),
      firestore: firestore
    };
  } else {
    // App is already initialized (e.g. on hot-reload)
    firebaseApp = getApp();
    
    // Simply get the existing instances of the services
    return {
      firebaseApp,
      auth: getAuth(firebaseApp),
      firestore: getFirestore(firebaseApp)
    };
  }
}

// This function's logic is now inlined into initializeFirebase to solve the re-initialization issue.
// export function getSdks(firebaseApp: FirebaseApp) {
//   return {
//     firebaseApp,
//     auth: getAuth(firebaseApp),
//     firestore: initializeFirestore(firebaseApp, {
//       localCache: persistentLocalCache({})
//     })
//   };
// }

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
