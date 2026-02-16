'use client';

import { useEffect, useState } from 'react';
import { initializeMessaging } from '@/firebase/messaging';
import { getToken, onMessage } from 'firebase/messaging';
import { usePOS } from '@/context/pos-context';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function useFCM() {
    const { user } = usePOS();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        setIsLoading(true);
        try {
            if (typeof window === 'undefined' || !('Notification' in window)) {
                toast({ title: "Not Supported", description: "This browser does not support notifications." });
                return;
            }

            const newPermission = await Notification.requestPermission();
            setPermission(newPermission);

            if (newPermission === 'granted') {
                const messaging = await initializeMessaging();
                if (!messaging) {
                    throw new Error("Messaging not initialized");
                }

                // TODO: User needs to provide VAPID Key in env
                const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

                if (!vapidKey) {
                    console.warn("VAPID Key is missing! Notifications won't work without it.");
                    toast({ variant: "destructive", title: "Configuration Error", description: "VAPID Key is missing." });
                    return;
                }

                // Register Service Worker explicitly to avoid "Registration failed" errors
                let serviceWorkerRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
                if (!serviceWorkerRegistration) {
                    serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                }

                const token = await getToken(messaging, {
                    vapidKey,
                    serviceWorkerRegistration
                });

                if (token) {
                    setFcmToken(token);
                    console.log('FCM Token:', token);

                    if (user) {
                        // Save token to Firestore
                        const tokenRef = doc(firestore, `users/${user.uid}/fcmTokens`, token);
                        await setDoc(tokenRef, {
                            token,
                            lastUsed: serverTimestamp(),
                            device: navigator.userAgent
                        });
                        toast({ title: "Notifications Enabled", description: "You will now receive alerts." });
                    }
                } else {
                    console.log('No registration token available. Request permission to generate one.');
                }
            } else {
                toast({ variant: "destructive", title: "Permission Denied", description: "Please enable notifications in your browser settings." });
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not enable notifications.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return { permission, requestPermission, fcmToken, isLoading };
}
