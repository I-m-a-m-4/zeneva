'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from 'lucide-react';

/**
 * This is a client-side component to handle redirecting authenticated users
 * from the root URL ('/') to their dashboard. This avoids a route conflict
 * with the main marketing page and resolves a Next.js build issue with
 * server-only redirect pages.
 */
export default function RootAppRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background -mt-16">
        <div className="flex flex-col items-center gap-4">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
    </div>
  );
}
