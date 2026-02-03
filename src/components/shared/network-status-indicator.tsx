'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state from navigator, only on client
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Empty dependency array means this effect runs once on mount.

  if (isOnline) {
    return null; // Render nothing when online.
  }

  // Render the indicator for the header bar when offline.
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-amber-600 no-print cursor-pointer">
            <WifiOff className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <p className="font-semibold">You are offline</p>
          <p className="text-sm text-muted-foreground">Changes are saved locally and will sync when reconnected.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
