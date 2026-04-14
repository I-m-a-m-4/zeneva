
'use client';

import { useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/api/process';
import { useToast } from '@/hooks/use-toast';

/**
 * TauriUpdater Component
 * Automatically checks for updates and prompts the user or performs background updates.
 */
export function TauriUpdater() {
  const { toast } = useToast();

  useEffect(() => {
    // Only run in Tauri environment
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return;

    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update) {
          console.log(`Update available: ${update.version} from ${update.date}`);
          
          toast({
            title: "Update Available",
            description: `A new version (v${update.version}) is downloading in the background.`,
            duration: 10000,
          });

          let downloaded = 0;
          let contentLength = 0;

          await update.downloadAndInstall((event) => {
            switch (event.event) {
              case 'Started':
                contentLength = event.data.contentLength || 0;
                console.log(`Started downloading ${contentLength} bytes`);
                break;
              case 'Progress':
                downloaded += event.data.chunkLength;
                console.log(`Downloaded ${downloaded} from ${contentLength}`);
                break;
              case 'Finished':
                console.log('Download finished');
                toast({
                  title: "Update Ready",
                  description: "Zeneva will now restart to apply the update.",
                  variant: "success",
                });
                // Delay slightly so the user can see the message
                setTimeout(async () => {
                  await relaunch();
                }, 3000);
                break;
            }
          });
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    // Check on mount
    checkForUpdates();

    // Optionally check every hour
    const interval = setInterval(checkForUpdates, 3600000);
    return () => clearInterval(interval);
  }, [toast]);

  return null; // Side-effect only component
}
