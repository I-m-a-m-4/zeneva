
'use client';

import * as React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ConsoleGuard } from './console-guard';

import { flushOfflineErrors } from '@/lib/error-logger';

export function ClientSideInitializer() {
  const [isMounted, setIsMounted] = React.useState(false);
  
  React.useEffect(() => {
    setIsMounted(true);
    
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
