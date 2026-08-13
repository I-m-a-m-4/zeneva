'use client';

import * as React from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { initNativeNotificationPermissions, triggerNativeNotification } from '@/lib/native-notifications';

export function NativeNotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    initNativeNotificationPermissions();
  }, []);

  React.useEffect(() => {
    if (!user?.uid || !db) return;

    const notifRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifRef, orderBy('createdAt', 'desc'), limit(5));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Skip initial load to avoid popping up historical notifications on fresh start
      if (!initializedRef.current) {
        initializedRef.current = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data && data.title && data.body) {
            triggerNativeNotification({
              title: data.title,
              body: data.body,
            });
          }
        }
      });
    }, (err) => {
      console.warn('NativeNotificationListener error:', err);
    });

    return () => unsubscribe();
  }, [user?.uid, db]);

  return null;
}
