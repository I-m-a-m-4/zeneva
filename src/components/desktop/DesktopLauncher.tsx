
'use client';

import { useEffect } from 'react';

/**
 * DesktopLauncher handles Tauri-specific body styling and system events.
 */
export function DesktopLauncher() {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      // Add padding for custom titlebar
      document.body.classList.add('pt-10');
      document.body.classList.add('is-desktop');
      
      // Add a cool background effect for desktop
      document.body.style.backgroundColor = '#0a0a0a';
    }
  }, []);

  return null;
}
