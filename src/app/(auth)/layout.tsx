'use client';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { createNewBusinessForUser } from '@/firebase/users';
import { useToast } from '@/hooks/use-toast';

function FullScreenLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  useEffect(() => {
    // This effect handles the case for a reactivated user who needs a new business.
    if (user && userProfile && !userProfile.businessId && !isCreatingBusiness && firestore) {
      setIsCreatingBusiness(true);
      toast({ title: "Welcome Back!", description: "Let's set up a new business for you." });
      createNewBusinessForUser(firestore, user)
        .then(() => {
            // The useDoc hook will eventually re-fetch and the redirect logic below will handle it.
        })
        .catch(error => {
            console.error("Failed to create new business for reactivated user:", error);
            toast({ variant: 'destructive', title: "Setup Failed", description: "Could not create a new business. Please contact support." });
            setIsCreatingBusiness(false); // Allow retry if it fails
        });
    }
  }, [user, userProfile, isCreatingBusiness, firestore, toast]);

  // 1. If Firebase is still checking the auth state, always show a loader.
  if (isUserLoading) {
    return <FullScreenLoader />;
  }
  
  // 2. If a user object exists, we are in a transitional state.
  if (user) {
    // 2a. If the user's profile is still loading from Firestore, continue loading.
    if (isProfileLoading || isCreatingBusiness) {
      return <FullScreenLoader />;
    }
    
    // 2b. If the user profile is loaded and has a business ID, they are fully set up.
    if (userProfile && userProfile.businessId) {
      // Redirect to the dashboard and show a loader during the transition.
      router.replace('/dashboard');
      return <FullScreenLoader />;
    }

    // 2c. If the user object exists, but their profile/business is still being created
    // (e.g., right after signup), just keep showing the loader. The `useEffect` or
    // the `userProfile` hook will eventually update, and this component will re-render.
    return <FullScreenLoader />;
  }

  // 3. If we've reached here, `isUserLoading` is false and `user` is null.
  // This is the only state where we can safely show the Login/Signup page.
  return <>{children}</>;
}
