
'use client';

import * as React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ConsoleGuard } from './console-guard';

import { flushOfflineErrors } from '@/lib/error-logger';

export function ClientSideInitializer() {
  const [isMounted, setIsMounted] = React.useState(false);
  
  React.useEffect(() => {
    setIsMounted(true);

    // next-pwa is disabled in dev, but it does not clean up after itself: a
    // `npm run build` leaves a production `public/sw.js` behind, and Next then
    // serves that file on the dev server. The worker precaches the *built*
    // app chunks, so localhost keeps serving stale code and source edits look
    // like they do nothing. That cost a debugging session once already - the
    // ai-insights page kept 401ing from a chunk built before the fix.
    //
    // Only unregister workers scoped to a script we know is the PWA one.
    // `firebase-messaging-sw.js` is registered on purpose by useFCM and must
    // survive, or push notifications break in dev.
    if (process.env.NODE_ENV === 'development' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) {
            const scriptURL =
              registration.active?.scriptURL ??
              registration.waiting?.scriptURL ??
              registration.installing?.scriptURL ??
              '';
            if (scriptURL.includes('firebase-messaging-sw.js')) continue;
            registration.unregister().then((ok) => {
              // An unregistered worker keeps controlling already-open pages
              // until they are reloaded, so say so rather than reloading here
              // (an automatic reload races with HMR and can loop).
              if (ok) console.warn(`[dev] Unregistered stale service worker (${scriptURL || 'unknown script'}). Reload once to drop its cached chunks.`);
            });
          }
        })
        .catch((err) => console.warn('Failed to inspect service workers:', err));
    }

    // Flush any cached errors queued while offline/failed
    flushOfflineErrors().catch((err) => console.warn('Failed to flush offline errors:', err));

    // Zeneva Console Branding
    // Note: Important errors are NOT suppressed. Only non-critical tracker and network noise is silenced.
    console.log(
      `%c\n ███████  ███████  ██   ██  ███████  ██   ██   █████ \n    ███   ███      ███  ██  ███      ██   ██  ██   ██\n   ███    ███████  ████ ██  ███████   ██ ██   ███████\n  ███     ███      ██ ████  ███        ███    ██   ██\n ███████  ███████  ██   ██  ███████     █     ██   ██\n\n %c NEVER LOSE A SALE, NEVER WASTE A STOCK FOR ZENEVA %c \n`,
      "color: #F97316; font-weight: bold; font-family: monospace;",
      "background: #F97316; color: white; padding: 4px 8px; font-weight: bold; border-radius: 4px;",
      "color: inherit;"
    );
  }, []);

  if (!isMounted) return <ConsoleGuard />;

  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

  return (
    <>
      {!isTauri && <Analytics />}
      <ConsoleGuard />
    </>
  );
}
