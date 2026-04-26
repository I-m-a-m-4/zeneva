'use client';

import { useEffect } from 'react';

export function ChunkErrorListener() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMsg = event.message || '';
      const deploymentErrors = [
        'ChunkLoadError',
        'Loading chunk',
        'Failed to fetch dynamically imported module',
        'Unexpected token <'
      ];

      if (deploymentErrors.some(msg => errorMsg.includes(msg) || event.error?.name?.includes(msg))) {
        console.warn('ChunkLoadError detected, reloading page...');
        window.location.reload();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason || '');
      const deploymentErrors = [
        'ChunkLoadError',
        'Loading chunk',
        'Failed to fetch dynamically imported module'
      ];

      if (deploymentErrors.some(msg => reason.includes(msg) || event.reason?.name?.includes(msg))) {
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
