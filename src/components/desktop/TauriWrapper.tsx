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
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Spacer for Tauri TitleBar (h-9 = 2.25rem) */}
      {isTauri && <div className="h-9 w-full shrink-0" />}
      <div className="flex-1 flex flex-col relative min-h-0">
        {children}
      </div>
    </div>
  );
}

