
'use client';

import { useEffect } from 'react';

/**
 * ChunkErrorListener
 * Monitors for "ChunkLoadError" which usually happens during a new deployment
 * when the client tries to load a chunk that no longer exists on the server.
 * Automatically reloads the page to fetch the new manifest.
 */
export function ChunkErrorListener() {
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      const errorMsg = e.message || '';
      if (errorMsg.includes('Loading chunk') || errorMsg.includes('ChunkLoadError')) {
        console.warn('ChunkLoadError detected, reloading page...');
        window.location.reload();
      }
    };

    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason?.toString() || '';
      if (reason.includes('Loading chunk') || reason.includes('ChunkLoadError')) {
        console.warn('Unhandled ChunkLoadError detected, reloading page...');
        window.location.reload();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
