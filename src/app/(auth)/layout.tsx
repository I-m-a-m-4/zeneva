'use client';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Loader, LogOut, UserX } from 'lucide-react';
import { createNewBusinessForUser } from '@/firebase/users';
import { useToast } from '@/hooks/use-toast';
import type { BusinessInstance, UserProfile } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAuth, signOut } from 'firebase/auth';

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
  const firestore = useFirestore();
  const { toast } = useToast();
  const isCreatingBusiness = useRef(false);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const shouldFetchBusiness = userProfile?.businessId && userProfile?.status !== 'inactive';

  const businessDocRef = useMemoFirebase(
    () => (shouldFetchBusiness ? doc(firestore, 'businessInstances', userProfile.businessId!) : null),
    [shouldFetchBusiness, userProfile?.businessId, firestore]
  );
  const { data: businessInstance, isLoading: isBusinessLoading } = useDoc<BusinessInstance>(businessDocRef);

  useEffect(() => {
    if (userProfile && userProfile.businessId && businessInstance && businessInstance.status !== 'deleted') {
      router.replace('/dashboard');
    }
  }, [userProfile, businessInstance, router]);
  
  useEffect(() => {
    const isStillLoading = isUserLoading || isProfileLoading || (shouldFetchBusiness && isBusinessLoading);
    if (isStillLoading) {
      return; 
    }

    if (user) { 
      const hasNoProfile = !userProfile;
      const hasNoBusiness = userProfile && !userProfile.businessId;
      const businessIsDeleted = userProfile && userProfile.businessId && businessInstance?.status === 'deleted';
      
      const needsNewBusiness = hasNoProfile || hasNoBusiness || businessIsDeleted;
      
      if (needsNewBusiness && !isCreatingBusiness.current && firestore) {
        isCreatingBusiness.current = true;
        
        const toastMessage = businessIsDeleted 
          ? { title: "Welcome Back!", description: "Your previous business was deleted. Let's set up a new one for you." }
          : { title: "Welcome!", description: "Finalizing your account setup." };
        
        toast(toastMessage);

        createNewBusinessForUser(firestore, user)
          .catch(error => {
              console.error("Failed to create new business for user:", error);
              toast({ variant: 'destructive', title: "Setup Failed", description: "Could not create a new business. Please contact support." });
              isCreatingBusiness.current = false;
          });
      }
    }
  }, [user, userProfile, businessInstance, isUserLoading, isProfileLoading, isBusinessLoading, firestore, toast, shouldFetchBusiness]);

  const isOverallLoading = isUserLoading || (user && (isProfileLoading || (shouldFetchBusiness && isBusinessLoading)));
  if (isOverallLoading) {
    return <FullScreenLoader text="Getting things ready..." />;
  }

  if (!user) {
    return <>{children}</>;
  }

  if (userProfile?.status === 'inactive') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
               <UserX className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Account Inactive</CardTitle>
            <CardDescription>
              Your account is currently inactive. Please contact an administrator to have it reinstated.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => signOut(getAuth()).then(() => router.push('/'))} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Logout & Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return <FullScreenLoader text="Redirecting to dashboard..." />;
}
