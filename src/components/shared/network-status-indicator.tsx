'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerType, setBannerType] = useState<'offline' | 'online' | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const initialOnline = navigator.onLine;
      setIsOnline(initialOnline);
      if (!initialOnline) {
        // If initially offline, trigger warning banner
        setBannerType('offline');
        setBannerVisible(true);
        const timer = setTimeout(() => setBannerVisible(false), 6000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setBannerType('online');
      setBannerVisible(true);
      const timer = setTimeout(() => setBannerVisible(false), 5000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setBannerType('offline');
      setBannerVisible(true);
      const timer = setTimeout(() => setBannerVisible(false), 6000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* 1. Desktop-Only static minimal flag indicator */}
      {!isOnline && (
        <div className="hidden md:flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-amber-600 no-print cursor-default select-none text-xs font-extrabold tracking-wide uppercase">
          <WifiOff className="h-3.5 w-3.5" /> Offline
        </div>
      )}

      {/* 2. Responsive Floating Intelligent Alert Banner */}
      <AnimatePresence>
        {bannerVisible && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 16, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-0 inset-x-0 z-[9999] mx-auto max-w-sm px-4 no-print pointer-events-none"
          >
            <div
              className={cn(
                "pointer-events-auto flex items-center gap-3 p-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl ring-1 ring-black/5 select-none",
                bannerType === 'offline'
                  ? "bg-zinc-950/95 border-amber-500/30 text-amber-400"
                  : "bg-zinc-950/95 border-emerald-500/30 text-emerald-400"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl border",
                bannerType === 'offline'
                  ? "bg-amber-500/10 border-amber-500/20 animate-pulse"
                  : "bg-emerald-500/10 border-emerald-500/20"
              )}>
                {bannerType === 'offline' ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
              </div>

              <div className="flex-1 flex flex-col text-left">
                <p className="text-[10px] font-black tracking-widest uppercase">
                  {bannerType === 'offline' ? "Offline Engaged" : "Grid Reconnected"}
                </p>
                <p className="text-[10px] text-zinc-400 font-medium mt-0.5 leading-tight">
                  {bannerType === 'offline'
                    ? "Sales are saved locally and will auto-sync when connection returns."
                    : "Synchronizing offline cache nodes seamlessly."}
                </p>
              </div>

              <button
                onClick={() => setBannerVisible(false)}
                className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
