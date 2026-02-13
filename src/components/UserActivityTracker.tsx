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
                    await updateDoc(userRef, {
                        lastSeen: serverTimestamp(),
                        status: 'active' // Ensure status is active when they are online
                    });
                } catch (error) {
                    console.error("Error updating user activity:", error);
                }
            }
        });

        return () => unsubscribe();
    }, [auth, firestore]);

    return null; // This component renders nothing
}
