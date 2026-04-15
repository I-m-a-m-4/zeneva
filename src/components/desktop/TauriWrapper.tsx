'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function TauriLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isTauri, setIsTauri] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      setIsTauri(true);
    }
  }, []);

  return (
    <div className={cn('min-h-screen bg-background text-foreground', isTauri && 'pt-10 transition-[padding] duration-300')}>
      {children}
    </div>
  );
}
