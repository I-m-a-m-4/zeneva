
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
      'smartsupp',
      'Vercel Web Analytics',
      'Failed to load script',
      'beforeinstallpromptevent.preventDefault',
      'facebook.net',
      'tiktok.com',
      'twitter.com',
      'Minified React error #418',
      'Minified React error #423'
    ];

    const shouldSuppress = (args: any[]) => {
      const msg = args.map(arg => String(arg)).join(' ');
      return suppressedPatterns.some(pattern => msg.includes(pattern));
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

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
    };
  }, []);

  return null;
}
