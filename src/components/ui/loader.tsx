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

  if (!process.browser) return null; // Ensure client-side only if needed, though 'use client' handles it mostly.

  // We need to return the UI for the loader if NProgress is running, but NProgress modifies the DOM directly.
  // The user asked for "THAT LOADING SPINNER PAGE THAT SHOWIS THE ROLLING CRICLE AND LOADING WORKSPACE TEXT"
  // If this component IS that page, it should return JSX. 
  // However, the current code returns `null` and relies on `nprogress` which is a top-bar loader.
  // The user likely refers to a different component, OR wants this component to RENDER an overlay.
  // Given the description, I will create a global overlay that shows when NProgress is started? 
  // Standard NProgress doesn't have "Loading Workspace" text.
  // WAIT: "Loading Workspace" usually appears on initial load or auth check.
  // I should check `src/firebase/provider.tsx` or `client-provider.tsx` to see if there's an auth loader.

  return null;
}
