'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ErrorScreen } from '@/components/shared/error-screen';
import { isSurfaceableError, logErrorToFirestore } from '@/lib/error-logger';
import { getErrorContext } from '@/lib/error-context';

interface Incident {
  key: string;
}

/**
 * React error boundaries only catch errors thrown while rendering. Most of the
 * failures users actually hit in Zeneva are asynchronous — Firestore listeners,
 * IndexedDB/SQLite sync, dynamic imports, event handlers — and those escape
 * every boundary silently. This listener renders the same crash card for them,
 * so an error always produces a visible, consistent screen instead of a frozen
 * or half-rendered page.
 */
export function GlobalErrorCatcher() {
  const [incident, setIncident] = useState<Incident | null>(null);
  const pathname = usePathname();

  // A crash belongs to the page that caused it; navigating away clears it.
  useEffect(() => {
    setIncident(null);
  }, [pathname]);

  useEffect(() => {
    let lastKey = '';
    let lastAt = 0;

    const report = (error: unknown, type: 'window' | 'unhandledrejection') => {
      const key =
        error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? 'unknown');
      const now = Date.now();

      // The same failure usually fires several times (one per listener/retry).
      if (key === lastKey && now - lastAt < 5_000) return;
      lastKey = key;
      lastAt = now;

      // Log every uncaught error here, on every route — this is the single
      // logging point, so public/auth pages are covered as well as the app
      // shell. `logErrorToFirestore` still drops the noise patterns.
      const err = error instanceof Error ? error : new Error(String(error ?? 'unknown'));
      logErrorToFirestore(err, type, getErrorContext()).catch(() => {});

      if (!isSurfaceableError(error)) return;
      setIncident({ key });
    };

    const handleError = (event: ErrorEvent) => {
      // Skip resource load failures and errors another handler already owns
      // (Firestore recovery, chunk reloads, console guard suppressions).
      if (event.defaultPrevented || !event.error) return;
      report(event.error, 'window');
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.defaultPrevented) return;
      report(event.reason, 'unhandledrejection');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!incident) return null;

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto bg-background/95 backdrop-blur-sm">
      <ErrorScreen fullPage onRetry={() => setIncident(null)} />
    </div>
  );
}
