'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NProgress from 'nprogress';

// Configure NProgress once: no spinner, fast trickle.
NProgress.configure({ showSpinner: false, minimum: 0.15, trickleSpeed: 150 });

export default function Loader() {
  const pathname = usePathname();

  // Stop the bar whenever the route actually lands.
  useEffect(() => {
    NProgress.done();
  }, [pathname]);

  // One delegated listener on the document instead of one per <a>.
  // The old MutationObserver approach re-ran on every DOM mutation across
  // the whole app — that was the primary cause of sluggish navigation on mobile.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank') return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname !== window.location.pathname) {
          NProgress.start();
        }
      } catch {
        // Not a parseable URL — skip
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
