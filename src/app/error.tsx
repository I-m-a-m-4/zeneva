'use client';

import { useEffect } from 'react';
import { ErrorScreen } from '@/components/shared/error-screen';
import { logErrorToFirestore } from '@/lib/error-logger';
import { getErrorContext } from '@/lib/error-context';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route Error Caught:', error);

    // This boundary catches failures the shell boundary cannot see (errors in
    // the app layout itself and on non-app routes). Log them with whatever
    // tenant context was already established.
    logErrorToFirestore(error, 'react', getErrorContext()).catch(() => {});

    // A stale service worker or a deploy that replaced chunks can leave the
    // document pointing at assets that no longer exist. A reload fetches the
    // current build; every other error gets the normal recovery screen.
    if (error.name === 'ChunkLoadError' || error.message?.includes('ChunkLoadError')) {
      console.warn('ChunkLoadError detected in route boundary, reloading...');
      window.location.reload();
    }
  }, [error]);

  return <ErrorScreen fullPage onRetry={reset} errorId={error.digest} />;
}
