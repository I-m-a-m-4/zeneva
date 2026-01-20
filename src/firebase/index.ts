'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

export function initializeFirebase() {
  let firebaseApp: FirebaseApp;
  
  if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  
  // Enable multi-tab persistence.
  // This is the correct way to handle persistence with hot-reloading.
  enableMultiTabIndexedDbPersistence(firestore)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // This means persistence is already enabled in another tab.
        // This is a normal scenario in a multi-tab environment, so we can ignore it.
      } else if (err.code === 'unimplemented') {
        // The browser doesn't support all the features required for persistence.
      }
    });

  return {
    firebaseApp,
    auth,
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';
