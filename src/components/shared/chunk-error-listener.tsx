'use client';

import { useEffect } from 'react';

export function ChunkErrorListener() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // ChunkLoadError is the standard name for this error in Webpack/Next.js
      if (event.message?.includes('ChunkLoadError') || event.error?.name === 'ChunkLoadError') {
        console.warn('ChunkLoadError detected, reloading page to fetch latest version...');
        window.location.reload();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      // Sometimes it comes as an unhandled promise rejection
      if (event.reason?.name === 'ChunkLoadError' || String(event.reason)?.includes('ChunkLoadError')) {
        console.warn('Unhandled ChunkLoadError detected, reloading page...');
        window.location.reload();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
