
'use client';

import { useEffect } from 'react';

export function ConsoleGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    // List of patterns to suppress
    const suppressedPatterns = [
      'ERR_BLOCKED_BY_CLIENT',
      'ERR_FAILED',
      'browsing-topics',
      'Unrecognized feature: \'browsing-topics\'',
      'smartsupp',
      'Vercel Web Analytics',
      'Failed to load script',
      'beforeinstallpromptevent.preventDefault',
      'facebook.net',
      'tiktok.com',
      'twitter.com',
      'Minified React error #418',
      'Minified React error #423',
      'ResponsiveContainer',
      'fixed numbers, maybe you don\'t need to use a ResponsiveContainer',
      'QUIC_PROTOCOL_ERROR',
      'QUIC_NETWORK_IDLE_TIMEOUT',
      'transport errored',
      'WebChannelConnection RPC',
      'Firestore (11.10.0)',
      'firestore.googleapis.com',
      'google.firestore.v1.Firestore',
      '400 (Bad Request)',
      '404 (Not Found)',
      'bootstrap.smartsuppchat.com',
      'google.ads',
      'pagead2.googlesyndication.com',
      'bis_skin_checked',
      'react-hydration-error',
      'hydration-error',
      'hydration mismatch',
      'some attributes of the server rendered HTML',
      'Hydration failed',
    ];

    const shouldSuppress = (args: any[]) => {
      const message = args.map(arg => {
        try {
          return typeof arg === 'string' ? arg : JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }).join(' ');
      
      return suppressedPatterns.some(pattern => message.includes(pattern));
    };

    console.error = (...args) => {
      if (shouldSuppress(args)) return;
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      if (shouldSuppress(args)) return;
      originalWarn.apply(console, args);
    };

    console.log = (...args) => {
      if (shouldSuppress(args)) return;
      originalLog.apply(console, args);
    };

    const handleErrorEvent = (event: ErrorEvent) => {
      const message = event.message || '';
      const filename = event.filename || '';
      if (
        suppressedPatterns.some(pattern => message.includes(pattern) || filename.includes(pattern)) ||
        filename.includes('bundle.js') ||
        filename.includes('smartsupp')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleRejectionEvent = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason?.message || String(reason) || '';
      if (suppressedPatterns.some(pattern => message.includes(pattern))) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('error', handleErrorEvent, true);
    window.addEventListener('unhandledrejection', handleRejectionEvent, true);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
      window.removeEventListener('error', handleErrorEvent, true);
      window.removeEventListener('unhandledrejection', handleRejectionEvent, true);
    };
  }, []);

  return null;
}
