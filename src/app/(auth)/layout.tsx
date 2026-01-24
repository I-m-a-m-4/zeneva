'use client';
import { useUser } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from 'lucide-react';

function FullScreenLoader({ text }: { text?: string }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background flex-col gap-2">
      <Loader className="h-8 w-8 animate-spin text-primary" />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If the user is on the signup page, DO NOT redirect.
    // The signup page will handle the redirect itself after the profile is created.
    const isSignupPage = pathname === '/signup' || pathname.startsWith('/signup?');
    if (isSignupPage) {
      return;
    }

    // If we have a user and they are no longer loading, redirect them to the dashboard.
    if (user && !isUserLoading) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router, pathname]);

  // While checking auth state, show a loader.
  if (isUserLoading) {
    return <FullScreenLoader text="Authenticating..." />;
  }
  
  // If we have a user and are not on the signup page, it means the useEffect is about to redirect them.
  const isSignupPage = pathname === '/signup' || pathname.startsWith('/signup?');
  if (user && !isSignupPage) {
    return <FullScreenLoader text="Redirecting to dashboard..." />;
  }

  // If there's no user and we're not loading, show the login/signup page.
  return <>{children}</>;
}
