
'use client';

import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowUpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * TauriUpdater Component
 * Automatically checks for updates and shows a restart button when ready.
 */
export function TauriUpdater() {
  const { toast } = useToast();
  const [updateReady, setUpdateReady] = useState(false);
  const [newVersion, setNewVersion] = useState('');

  useEffect(() => {
    // Only run in Tauri environment
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return;

    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update) {
          setNewVersion(update.version);
          console.log(`Update available: ${update.version}`);
          
          toast({
            title: "Update Available",
            description: `A new version (v${update.version}) is downloading in the background.`,
            duration: 8000,
          });

          await update.downloadAndInstall((event) => {
            if (event.event === 'Finished') {
              setUpdateReady(true);
              toast({
                title: "Update Downloaded",
                description: "Zeneva is ready to update. Click the restart button to apply.",
                variant: "success",
              });
            }
          });
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 3600000); // Check every hour
    return () => clearInterval(interval);
  }, [toast]);

  const handleRestart = async () => {
    try {
      await relaunch();
    } catch (err) {
      console.error('Failed to relaunch:', err);
      window.location.reload(); // Fallback
    }
  };

  return (
    <AnimatePresence>
      {updateReady && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] no-print"
        >
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md">
            <ArrowUpCircle className="h-5 w-5 animate-pulse" />
            <span className="text-sm font-medium">New Version v{newVersion} Ready</span>
            <div className="h-4 w-[1px] bg-white/30 mx-1" />
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={handleRestart}
              className="h-8 rounded-full px-4 font-bold text-xs"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              RESTART NOW
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
