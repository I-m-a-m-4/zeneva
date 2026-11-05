'use client';

import { firebaseConfig } from './config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence, type Auth } from 'firebase/auth';
import { purgeBloatedLocalStorage } from '@/lib/storage-hygiene';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
  type FirestoreSettings,
} from 'firebase/firestore';

// --- Singleton Initialization ---
let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

const isServer = typeof window === 'undefined';
const hasConfig = !!firebaseConfig.apiKey;

// Check if Firebase has already been initialized
if (!getApps().length) {
  const isProduction = process.env.NODE_ENV === 'production';
  const configToUse = firebaseConfig.apiKey ? firebaseConfig : { ...firebaseConfig, apiKey: 'dummy-key-for-build' };
  
  if (configToUse.apiKey === 'dummy-key-for-build' && !isServer) {
    if (isProduction) {
      console.error("CRITICAL: Firebase initialized with dummy key in PRODUCTION. Authentication will fail.");
    } else {
      console.warn("Firebase initialized with dummy key. Auth will not work.");
    }
  }
  
  firebaseApp = initializeApp(configToUse);
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

/**
 * Firestore's default transport is WebChannel, a long-lived streaming request.
 * That stream is the single most common thing to break while the machine itself
 * has perfect internet: the Tauri webviews serve the app from
 * http://tauri.localhost, and corporate proxies, TLS-inspecting antivirus and
 * some ISP middleboxes all stall or truncate the stream. When it never
 * completes the SDK stays in its offline state indefinitely and every read
 * fails with "Failed to get document because the client is offline".
 *
 * Long polling uses ordinary short request/response pairs and gets through.
 * Auto-detect races the two transports, which is the right default in a real
 * browser; inside the Tauri shells we already know which one survives, so skip
 * the race rather than depend on a probe that can misfire.
 */
function transportSettings(): FirestoreSettings {
  const inTauriShell =
    typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
  return { experimentalAutoDetectLongPolling: true };
}

/**
 * A memory-only cache starts empty on every launch, so a cold start has nothing
 * to answer reads from. `getDoc` rejects - rather than resolving - whenever the
 * snapshot came back from cache and the document is not in it, which means one
 * read landing before the connection is up used to leave the whole app blank.
 *
 * The persistent cache survives restarts, so the UI paints from disk straight
 * away and the network only has to catch it up. Falls back to memory where
 * IndexedDB is unavailable (private browsing, hardened webviews).
 */
function cacheSettings(): FirestoreSettings {
  try {
    if (!isServer && typeof indexedDB !== 'undefined') {
      return {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      };
    }
  } catch {
    // Fall through to the in-memory cache below.
  }
  return { localCache: memoryLocalCache() };
}

try {
  if (!isServer && hasConfig) {
    firestore = initializeFirestore(firebaseApp, {
      ...transportSettings(),
      ...cacheSettings(),
      ignoreUndefinedProperties: true,
    });
  } else {
    firestore = initializeFirestore(firebaseApp, {});
  }
} catch (e) {
  // Either the build-time stub, or initializeFirestore was already called for
  // this app (fast refresh re-running this module). Reuse the live instance.
  try {
    firestore = getFirestore(firebaseApp);
  } catch {
    firestore = {} as Firestore;
  }
}

// Clean up bloated caches on client boot to keep localStorage below mobile quotas
if (!isServer) {
  purgeBloatedLocalStorage();
}

// On Desktop (Tauri/WebView2 on Windows/macOS), prefer browserLocalPersistence to completely evade
// WebView2's "Internal error opening backing store for indexedDB.open" file-lock/corruption crashes.
// On Mobile/Web browsers, prefer indexedDBLocalPersistence to evade the 5MB localStorage quota limit.
if (!isServer && hasConfig) {
  const isDesktop =
    typeof window !== 'undefined' &&
    (!!(window as any).__TAURI_INTERNALS__ ||
      window.location.protocol === 'tauri:' ||
      window.location.hostname === 'tauri.localhost');

  const primaryPersistence = isDesktop ? browserLocalPersistence : indexedDBLocalPersistence;
  const secondaryPersistence = isDesktop ? indexedDBLocalPersistence : browserLocalPersistence;

  setPersistence(auth, primaryPersistence)
    .catch(() => setPersistence(auth, secondaryPersistence))
    .catch(() => setPersistence(auth, inMemoryPersistence))
    .catch((err) => console.error("Firebase Auth persistence error:", err));
}

// --- Exports ---
export { firebaseApp, auth, firestore };
