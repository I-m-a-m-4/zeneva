
'use client';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(
      () => (user ? doc(firestore, 'users', user.uid) : null),
      [user, firestore]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

    useEffect(() => {
      // Don't do anything until we have all the data
      if (isUserLoading || (user && isProfileLoading)) {
        return;
      }
      
      // If the user is fully logged in and has a profile document,
      // redirect them away from auth pages to the main application dashboard.
      if (user && userProfile) {
        router.replace('/dashboard');
      }
    }, [user, isUserLoading, userProfile, isProfileLoading, router]);
    
    // While checking user status or if a redirect is imminent, show a loader.
    // This prevents showing the login/signup page for a split second to a logged-in user.
    if (isUserLoading || (user && isProfileLoading) || (user && userProfile)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    // If we're done loading and there's no user, show the auth page content (login/signup).
    return <>{children}</>;
}
