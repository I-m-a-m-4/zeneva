'use client';

import { useEffect } from 'react';

/**
 * DesktopLauncher handles Tauri-specific body styling and system events.
 */
export function DesktopLauncher() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) return;

    const isTauriEnv = !!(window as any).isTauri || 
                       !!(window as any).__TAURI__ || 
                       !!(window as any).__TAURI_INTERNALS__ || 
                       window.location.origin.includes('tauri.localhost') || 
                       window.location.origin.includes('tauri://');

    const markDesktop = () => {
      document.body.classList.add('is-desktop', 'is-desktop-tauri');
      document.documentElement.classList.add('is-desktop-tauri');
      document.documentElement.setAttribute('data-tauri-desktop', 'true');
    };

    if (isTauriEnv) {
      markDesktop();
    } else {
      import('@tauri-apps/api/window').then(m => {
        if (m.getCurrentWindow()) markDesktop();
      }).catch(() => {});
    }

    if (isTauriEnv || document.body.classList.contains('is-desktop')) {
      const updateBackground = () => {
        const root = document.documentElement;
        const body = document.body;
        
        // Get the actual computed HSL background from CSS variables
        const bgValue = getComputedStyle(root).getPropertyValue('--background').trim();
        
        if (bgValue) {
          const hslColor = `hsl(${bgValue})`;
          body.style.backgroundColor = hslColor;
          root.style.backgroundColor = hslColor;
          
          // Debugging log for Tauri console
          console.log(`[Zeneva Desktop] Syncing background: ${hslColor} (Theme: ${root.classList.contains('dark') ? 'Dark' : 'Light'})`);
        }
      };

      updateBackground();

      // Observe BOTH class changes (theme) and style changes
      const observer = new MutationObserver((mutations) => {
        updateBackground();
      });
      
      observer.observe(document.documentElement, { 
        attributes: true, 
        attributeFilter: ['class', 'style', 'data-theme'] 
      });

      return () => observer.disconnect();
    }
  }, []);

  return null;
}
