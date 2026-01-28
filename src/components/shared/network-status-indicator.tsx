
'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export default function NetworkStatusIndicator() {
  const { toast, dismiss } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      dismiss(); // Dismiss any offline toast
      toast({
        title: 'You are back online',
        description: 'Your changes will now be synced.',
        variant: 'success',
        duration: 3000,
      });
    };

    const handleOffline = () => {
      toast({
        title: 'No Internet Connection',
        description: 'You are currently offline. Changes will be saved locally and synced when you reconnect.',
        variant: 'warning',
        duration: Infinity, // Keep the toast until back online
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check in case the component mounts while offline
    if (!navigator.onLine) {
        handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, dismiss]);

  return null; // This component renders nothing itself
}
