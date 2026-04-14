'use client';

import { useEffect, useState } from 'react';
import { X, Minus, Square, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppConfig } from '@/lib/config';

export function DesktopTitleBar() {
  const [isTauri, setIsTauri] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      setIsTauri(true);
      
      const updateMaximized = async () => {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const win = getCurrentWindow();
          setIsMaximized(await win.isMaximized());
        } catch {}
      };

      updateMaximized();
      
      // Listen for resize to update maximized state
      window.addEventListener('resize', updateMaximized);
      return () => window.removeEventListener('resize', updateMaximized);
    }
  }, []);

  if (!isTauri) return null;

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().minimize();
    } catch (err) {
      console.error('Minimize failed:', err);
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      getCurrentWindow().toggleMaximize();
    } catch (err) {
      console.error('Maximize toggle failed:', err);
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      // Hide to tray instead of closing
      await getCurrentWindow().hide();
    } catch (err) {
      console.error('Close/Hide failed:', err);
    }
  };

  return (
    <div 
      data-tauri-drag-region
      className="h-10 w-full bg-background/95 backdrop-blur-md border-b flex items-center justify-between select-none fixed top-0 left-0 z-[9999] no-print shadow-sm"
    >
      <div className="flex items-center gap-2.5 px-4 pointer-events-none" data-tauri-drag-region>
         {/* Premium Logo Container */}
         <div className="h-6 w-6 relative">
            <div className="absolute inset-0 bg-primary/20 rounded-lg blur-[2px] animate-pulse"></div>
            <img src={AppConfig.logoIconUrl} alt="Zeneva" className="h-6 w-6 relative z-10 drop-shadow-sm" />
         </div>
         <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-[0.25em] text-primary/90 leading-none">ZENEVA</span>
            <div className="flex items-center gap-1.5 mt-0.5">
               <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-widest leading-none">Desktop v{AppConfig.version || '0.3.3'}</span>
               <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
         </div>
      </div>

      <div className="flex items-center h-full">
        <button 
          onClick={handleMinimize}
          className="h-full w-12 flex items-center justify-center hover:bg-muted/80 transition-all active:scale-95"
          title="Minimize"
        >
          <Minus className="h-3.5 w-3.5 text-muted-foreground/80" />
        </button>
        <button 
          onClick={handleMaximize}
          className="h-full w-12 flex items-center justify-center hover:bg-muted/80 transition-all active:scale-95"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Copy className="h-3 w-3 text-muted-foreground/80 -rotate-90" />
          ) : (
            <Square className="h-3 w-3 text-muted-foreground/80" />
          )}
        </button>
        <button 
          onClick={handleClose}
          className="h-full w-12 flex items-center justify-center hover:bg-destructive hover:text-white transition-all active:scale-95 group"
          title="Close to Tray"
        >
          <X className="h-4 w-4 text-muted-foreground/80 group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}
