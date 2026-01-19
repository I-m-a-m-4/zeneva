'use client';

import { useEffect } from 'react';
import NProgress from 'nprogress';

export default function Loader() {

  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const targetUrl = (event.currentTarget as HTMLAnchorElement).href;
      const currentUrl = window.location.href;
      if (targetUrl !== currentUrl) {
        NProgress.start();
      }
    };

    const handleMutation = () => {
      const anchorElements = document.querySelectorAll('a');
      anchorElements.forEach((anchor) => {
        if (anchor.target === '_blank') return;
        anchor.addEventListener('click', handleAnchorClick);
      });
    };

    const mutationObserver = new MutationObserver(handleMutation);
    mutationObserver.observe(document, { childList: true, subtree: true });

    // Initial run
    handleMutation();

    return () => {
      mutationObserver.disconnect();
      // Clean up event listeners from anchors
       const anchorElements = document.querySelectorAll('a');
        anchorElements.forEach((anchor) => {
            if (anchor.target === '_blank') return;
            anchor.removeEventListener('click', handleAnchorClick);
        });
    };
  }, []);

  return null;
}
