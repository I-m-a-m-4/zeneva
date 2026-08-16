'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { isNativeApp, isMobileApp } from '@/lib/platform';

interface UpdateSettings {
  forceUpdateNative: boolean;
  isHardForce?: boolean;
  desktopLink: string;
  mobileLink: string;
  targetUsers?: string[];
  targetCategories?: string[];
}

export function UpdateRequiredModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);
  const [settings, setSettings] = useState<UpdateSettings | null>(null);
  const [userCategory, setUserCategory] = useState<string | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    if (!user || !firestore) return;
    getDoc(doc(firestore, 'users', user.uid)).then((snap) => {
      if (snap.exists()) {
        setUserCategory(snap.data()?.category || null);
      }
    });
  }, [user, firestore]);

  useEffect(() => {
    // Only run this on native apps (desktop/mobile)
    if (!isNativeApp() || !firestore) return;

    const unsub = onSnapshot(doc(firestore, 'platform_settings', 'app_updates'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as UpdateSettings);
      }
    });

    return () => unsub();
  }, [firestore]);

  useEffect(() => {
    if (!settings || hasDismissed) {
      if (!settings) setIsOpen(false);
      return;
    }

    let shouldShow = false;
    if (settings.forceUpdateNative) {
      shouldShow = true;
    } else if (user) {
      if (settings.targetUsers && settings.targetUsers.includes(user.uid)) {
        shouldShow = true;
      } else if (userCategory && settings.targetCategories && settings.targetCategories.includes(userCategory)) {
        shouldShow = true;
      }
    }

    setIsOpen(shouldShow);
  }, [settings, user, userCategory, hasDismissed]);

  // If not a native app, don't render anything
  if (!isNativeApp()) return null;

  const handleUpdate = () => {
    if (!settings) return;
    const link = isMobileApp() ? settings.mobileLink : settings.desktopLink;
    if (link) {
      window.open(link, '_blank');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setHasDismissed(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // If it's a hard force, ignore requests to close (e.g. clicking outside)
      if (!open && !settings?.isHardForce) {
        handleClose();
      }
    }}>
      <DialogContent 
        className={`sm:max-w-[425px] bg-background border-border text-foreground p-6 rounded-xl gap-6 ${settings?.isHardForce ? '[&>button]:hidden' : ''}`}
        onPointerDownOutside={(e) => {
          if (settings?.isHardForce) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (settings?.isHardForce) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">Update required</DialogTitle>
        </DialogHeader>
        
        <div className="text-sm text-muted-foreground leading-relaxed">
          {settings?.isHardForce 
            ? "Please update to the latest version of Zeneva. This version has expired and you can no longer use it."
            : "A new version of Zeneva is available. Please update to get the latest features and improvements."}
        </div>
        
        <DialogFooter className="flex flex-row sm:justify-end gap-3 pt-2">
          {!settings?.isHardForce && (
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="rounded-full bg-transparent border-border text-orange-600 dark:text-orange-500 hover:bg-orange-500/10 transition-colors h-10 px-6"
            >
              Close
            </Button>
          )}
          <Button 
            onClick={handleUpdate}
            className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium h-10 px-6 border-0"
          >
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
