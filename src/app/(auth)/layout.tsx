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
    // If the user is authenticated and is no longer loading, redirect to the dashboard.
    // This handles cases where a logged-in user tries to access /login or /signup.
    if (user && !isUserLoading) {
      // The signup page has its own redirect logic after profile creation, so we exclude it here
      // to avoid interrupting the signup flow.
      const isSignupPage = pathname === '/signup' || pathname.startsWith('/signup?');
      if (!isSignupPage) {
        router.replace('/sales/pos/select-products');
      }
    }

    // If there is no user and the auth check is complete, they should be on an auth page.
    // No action is needed here, as they are allowed to see the content (e.g., login form).

  }, [user, isUserLoading, router, pathname]);

  // While the initial authentication state is being determined, show a loader.
  if (isUserLoading) {
    return <FullScreenLoader text="Authenticating..." />;
  }

  // If a user is logged in, they are about to be redirected by the useEffect.
  // Showing a loader here provides a better UX than a flash of the login/signup page.
  // We exclude the signup page from this logic as it handles its own post-signup redirect.
  const isSignupPage = pathname === '/signup' || pathname.startsWith('/signup?');
  if (user && !isSignupPage) {
    return <FullScreenLoader text="Loading your workspace..." />;
  }

  // If no user is logged in and we are not loading, it's safe to render the auth pages.
  return <div className="h-screen overflow-y-auto w-full">{children}</div>;
}
