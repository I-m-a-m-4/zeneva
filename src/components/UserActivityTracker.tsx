'use client';

import { useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { usePathname } from 'next/navigation';

export function UserActivityTracker() {
    const auth = useAuth();
    const firestore = useFirestore();
    const pathname = usePathname();

    useEffect(() => {
        if (!auth || !firestore) return;

        const checkAndUpdateActivity = async (user: any) => {
            if (!user) return;
            const userRef = doc(firestore, 'users', user.uid);
            const sessionIdKey = `zeneva_session_id_${user.uid}`;
            let sessionId = sessionStorage.getItem(sessionIdKey);

            if (!sessionId) {
                sessionId = crypto.randomUUID();
                sessionStorage.setItem(sessionIdKey, sessionId);
            }

            const sessionRef = doc(firestore, 'users', user.uid, 'sessions', sessionId);

            try {
                const lastUpdate = sessionStorage.getItem('last_user_activity_update');
                const now = Date.now();
                
                // Update if:
                // - Never updated this session
                // - It's been > 5 minutes
                if (!lastUpdate || now - parseInt(lastUpdate) > 5 * 60 * 1000) {
                    // Check if session is revoked only when we're going to update
                    const sessionSnap = await getDoc(sessionRef);
                    if (sessionSnap.exists() && sessionSnap.data().revoked) {
                        await signOut(auth);
                        sessionStorage.removeItem(sessionIdKey);
                        return;
                    }

                    const sessionExists = sessionSnap.exists();
                    const batch = writeBatch(firestore);
                    
                    batch.set(userRef, {
                        lastSeen: serverTimestamp(),
                        status: 'active'
                    }, { merge: true });

                    batch.set(sessionRef, {
                        sessionId,
                        userAgent: navigator.userAgent,
                        lastSeen: serverTimestamp(),
                        createdAt: sessionExists ? sessionSnap.data().createdAt : serverTimestamp(),
                        revoked: false,
                        deviceInfo: {
                            platform: navigator?.platform || 'Unknown',
                            vendor: navigator?.vendor || 'Unknown',
                            language: navigator?.language || 'Unknown'
                        }
                    }, { merge: true });

                    await batch.commit();
                    sessionStorage.setItem('last_user_activity_update', now.toString());
                    console.log("User session updated successfully");
                }
            } catch (error: any) {
                if (error?.message?.includes('Missing or insufficient permissions') || error?.code === 'permission-denied') {
                    // Silently ignore during logout as auth state is cleared before the request finishes
                    return;
                }
                console.error("Error updating user activity/session:", error);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                checkAndUpdateActivity(user);
            }
        });

        // Trigger on navigation
        if (auth.currentUser) {
            checkAndUpdateActivity(auth.currentUser);
        }

        // Trigger continuously while tab is active
        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible' && auth.currentUser) {
                checkAndUpdateActivity(auth.currentUser);
            }
        }, 60 * 1000);

        return () => {
            unsubscribe();
            clearInterval(intervalId);
        };
    }, [auth, firestore, pathname]);

    return null;
}
