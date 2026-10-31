'use client';

import { useState, useEffect, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowUpCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * TauriUpdater Component
 * Silently downloads updates in the background and presents a smooth "Restart to Update"
 * pill so users remain in control and are never interrupted during sales.
 */
export function TauriUpdater() {
  const { toast } = useToast();
  const [updateReady, setUpdateReady] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const updateRef = useRef<any>(null);

  useEffect(() => {
    // Only run in Tauri desktop environment
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return;

    const checkForUpdates = async () => {
      try {
        // If running inside Microsoft Store package container (WindowsApps),
        // skip external EXE auto-updater to prevent installing a duplicate standalone app.
        // Microsoft Store manages updates for Store installations through the Store app.
        try {
          const { resourceDir } = await import('@tauri-apps/api/path');
          const res = await resourceDir();
          if (res && /windowsapps/i.test(res)) {
            console.log('Running inside Microsoft Store package (WindowsApps). Delegating update management to Store.');
            return;
          }
        } catch {}

        const update = await check();
        if (update) {
          updateRef.current = update;
          setNewVersion(update.version);
          console.log(`Update available: ${update.version}`);
          
          setIsDownloading(true);
          let downloaded = 0;
          let totalSize: number | null = null;

          // SILENT BACKGROUND DOWNLOAD ONLY
          // Does NOT execute or launch any installer while the user is actively working.
          await update.download((event) => {
            switch (event.event) {
              case 'Started':
                totalSize = event.data.contentLength ?? null;
                console.log(`Started downloading update package (${totalSize} bytes)`);
                break;
              case 'Progress':
                downloaded += event.data.chunkLength;
                if (totalSize && totalSize > 0) {
                  const percent = Math.min(99, Math.round((downloaded / totalSize) * 100));
                  setDownloadProgress(percent);
                }
                break;
              case 'Finished':
                setIsDownloading(false);
                setUpdateReady(true);
                toast({
                  title: `Zeneva v${update.version} Ready`,
                  description: "Update downloaded in background. Click 'Restart to Update' whenever you're ready.",
                  variant: "success",
                  duration: 6000,
                });
                break;
            }
          });

          // Ensure state flags are set when download completes
          setIsDownloading(false);
          setUpdateReady(true);
        }
      } catch (error) {
        console.error('Failed to check or download updates:', error);
        setIsDownloading(false);
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 3600000); // Check every hour
    return () => clearInterval(interval);
  }, [toast]);

  const handleRestart = async () => {
    if (isRestarting) return;
    setIsRestarting(true);
    try {
      toast({
        title: "Applying Update...",
        description: "Installing new version and restarting Zeneva...",
      });

      // Install downloaded payload when user explicitly triggers restart
      if (updateRef.current && typeof updateRef.current.install === 'function') {
        await updateRef.current.install();
      }

      await relaunch();
    } catch (err) {
      console.error('Failed to install and relaunch:', err);
      try {
        await relaunch();
      } catch {
        window.location.reload();
      }
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <AnimatePresence>
      {(updateReady || isDownloading) && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] no-print"
        >
          <div className="bg-slate-900/95 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md">
            {isDownloading ? (
               <div className="flex items-center gap-3 min-w-[220px]">
                  <RefreshCw className="h-4 w-4 animate-spin text-orange-400" />
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-300">
                      <span>Downloading v{newVersion}</span>
                      <span className="text-orange-400">{downloadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-orange-500" 
                        initial={{ width: 0 }}
                        animate={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
               </div>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-100">
                  Zeneva v{newVersion} Ready
                </span>
                <div className="h-4 w-[1px] bg-white/20 mx-1" />
                <Button 
                  size="sm" 
                  variant="default"
                  disabled={isRestarting}
                  onClick={handleRestart}
                  className="h-7 rounded-full px-3.5 font-bold text-xs bg-orange-600 hover:bg-orange-500 text-white shadow-sm"
                >
                  <RefreshCw className={`mr-1.5 h-3 w-3 ${isRestarting ? 'animate-spin' : ''}`} />
                  {isRestarting ? 'Restarting...' : 'Restart Now'}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
