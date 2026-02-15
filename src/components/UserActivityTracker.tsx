'use client';

import { useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export function UserActivityTracker() {
    const auth = useAuth();
    const firestore = useFirestore();

    useEffect(() => {
        if (!auth || !firestore) return;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Update lastSeen immediately on login/load
                const userRef = doc(firestore, 'users', user.uid);
                try {
                    const lastUpdate = sessionStorage.getItem('last_user_activity_update');
                    const now = Date.now();

                    // Only update if never updated in this session OR last update was > 5 mins ago
                    if (!lastUpdate || now - parseInt(lastUpdate) > 5 * 60 * 1000) {
                        await updateDoc(userRef, {
                            lastSeen: serverTimestamp(),
                            status: 'active' // Ensure status is active when they are online
                        });
                        sessionStorage.setItem('last_user_activity_update', now.toString());
                    }
                } catch (error: any) {
                    // Ignore 'not-found' errors which happen during initial signup before the user doc is created
                    if (error.code === 'not-found' || error.message?.includes('No document to update')) {
                        return;
                    }
                    console.error("Error updating user activity:", error);
                }
            }
        });

        return () => unsubscribe();
    }, [auth, firestore]);

    return null; // This component renders nothing
}
