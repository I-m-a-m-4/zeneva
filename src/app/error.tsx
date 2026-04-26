'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error
    console.error('Captured Runtime Error:', error);

    // List of errors that typically occur after a new deployment (old chunks deleted)
    const deploymentErrors = [
      'ChunkLoadError',
      'Loading chunk',
      'Failed to fetch dynamically imported module',
      'Manifest not found',
      'Unexpected token <', // Happens when JS 404s and returns HTML
      'React is not defined' // Can happen if mismatched bundles load
    ];

    const isDeploymentError = deploymentErrors.some(msg => 
      error.name?.includes(msg) || 
      error.message?.includes(msg) ||
      error.stack?.includes(msg)
    );

    if (isDeploymentError) {
      console.warn('Deployment-related error detected. Auto-recovering...');
      // Clear persistence if needed (optional)
      // window.location.reload();
      // Wait a moment to avoid infinite reload loop
      const hasReloaded = sessionStorage.getItem('zeneva_auto_reloaded');
      if (!hasReloaded) {
        sessionStorage.setItem('zeneva_auto_reloaded', 'true');
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-dm-sans">
      <div className="max-w-md w-full space-y-12 text-center relative">
        {/* Abstract Background Element */}
        <div className="absolute inset-0 bg-orange-600/10 blur-[100px] -z-10 rounded-full" />
        
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-600/20 blur-xl rounded-full animate-pulse" />
            <div className="relative p-6 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl">
              <AlertCircle className="h-12 w-12 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-medium tracking-tighter uppercase font-display px-0">Module Interrupted</h1>
          <p className="text-slate-400 font-medium leading-relaxed">
            A background update was detected. Zeneva needs to resync the latest engine modules to continue.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Button 
            onClick={() => window.location.reload()} 
            size="lg"
            className="w-full h-14 bg-orange-600 text-white hover:bg-orange-700 rounded-none font-bold uppercase tracking-[0.2em] shadow-xl shadow-orange-600/20 gap-3"
          >
            <RefreshCw className="h-4 w-4" />
            Synchronize Engine
          </Button>
          
          <Button 
            onClick={() => reset()} 
            variant="ghost" 
            size="lg"
            className="w-full h-14 text-slate-500 hover:text-white hover:bg-white/5 rounded-none font-semibold uppercase tracking-widest text-[10px]"
          >
            Bypass & Retry
          </Button>
        </div>

        <div className="pt-8 opacity-30">
          <div className="flex items-center justify-center gap-3">
             <div className="h-px w-8 bg-white/20" />
             <span className="text-[10px] uppercase tracking-[0.4em]">Zeneva OS v1.7.0</span>
             <div className="h-px w-8 bg-white/20" />
          </div>
        </div>

        {error.digest && (
          <p className="text-[8px] font-mono text-slate-700 uppercase tracking-widest mt-8">
            Kernel Digest: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
