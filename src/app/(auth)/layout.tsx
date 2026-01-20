'use client';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
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
  const isCreatingBusiness = useRef(false);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  // This effect handles the redirection side-effect.
  useEffect(() => {
    if (userProfile && userProfile.businessId) {
      router.replace('/dashboard');
    }
  }, [userProfile, router]);
  
  // This effect handles creating a new business for a reactivated user.
  useEffect(() => {
    if (user && userProfile && !userProfile.businessId && !isCreatingBusiness.current && firestore) {
      isCreatingBusiness.current = true;
      toast({ title: "Welcome Back!", description: "Let's set up a new business for you." });
      createNewBusinessForUser(firestore, user)
        .catch(error => {
            console.error("Failed to create new business for reactivated user:", error);
            toast({ variant: 'destructive', title: "Setup Failed", description: "Could not create a new business. Please contact support." });
            isCreatingBusiness.current = false; // Allow retry if it fails
        });
    }
  }, [user, userProfile, firestore, toast]);

  // Render logic:
  
  // If we're still loading the initial user state from Firebase Auth, show a loader.
  if (isUserLoading) {
    return <FullScreenLoader />;
  }

  // If there is no user, they are not logged in. Show the login/signup page.
  if (!user) {
    return <>{children}</>;
  }

  // If there IS a user, we should show a loader until they are redirected.
  // This covers all cases:
  // - Profile is still loading (`isProfileLoading`).
  // - Profile is loaded, but doesn't have a businessId yet (`isCreatingBusiness`).
  // - Profile and businessId are loaded (the `useEffect` for redirection is running).
  return <FullScreenLoader />;
}
