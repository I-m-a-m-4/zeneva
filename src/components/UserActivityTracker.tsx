'use client';

import { useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export function UserActivityTracker() {
    const auth = useAuth();
    const firestore = useFirestore();

    useEffect(() => {
        if (!auth || !firestore) return;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userRef = doc(firestore, 'users', user.uid);
                const sessionIdKey = `zeneva_session_id_${user.uid}`;
                let sessionId = sessionStorage.getItem(sessionIdKey);

                if (!sessionId) {
                    sessionId = crypto.randomUUID();
                    sessionStorage.setItem(sessionIdKey, sessionId);
                }

                const sessionRef = doc(firestore, 'users', user.uid, 'sessions', sessionId);

                try {
                    // 1. Check if session is still valid (not revoked)
                    const sessionSnap = await getDoc(sessionRef);
                    if (sessionSnap.exists() && sessionSnap.data().revoked) {
                        await signOut(auth);
                        sessionStorage.removeItem(sessionIdKey);
                        return;
                    }

                    // 2. Update session and user activity
                    const lastUpdate = sessionStorage.getItem('last_user_activity_update');
                    const now = Date.now();

                    if (!lastUpdate || now - parseInt(lastUpdate) > 5 * 60 * 1000) {
                        const batch = writeBatch(firestore);
                        
                        // Update User Doc
                        batch.update(userRef, {
                            lastSeen: serverTimestamp(),
                            status: 'active'
                        });

                        // Upsert Session Doc
                        batch.set(sessionRef, {
                            sessionId,
                            userAgent: navigator.userAgent,
                            lastSeen: serverTimestamp(),
                            createdAt: sessionSnap.exists() ? sessionSnap.data().createdAt : serverTimestamp(),
                            revoked: false,
                            deviceInfo: {
                                platform: navigator.platform,
                                vendor: navigator.vendor,
                                language: navigator.language
                            }
                        }, { merge: true });

                        await batch.commit();
                        sessionStorage.setItem('last_user_activity_update', now.toString());
                    }
                } catch (error: any) {
                    if (error.code === 'not-found' || error.message?.includes('No document to update')) {
                        return;
                    }
                    console.error("Error updating user activity/session:", error);
                }
            }
        });

        return () => unsubscribe();
    }, [auth, firestore]);

    return null; // This component renders nothing
}
